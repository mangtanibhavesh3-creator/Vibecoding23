import assert from 'assert';
import http from 'http';
import { io as ioClient } from 'socket.io-client';
import { app, server } from '../index.js';
import { Service, Barber, QueueTicket, SalonConfig, DailyCounter } from '../models/index.js';
import {
  joinQueue,
  callNextForBarber,
  startTicketForBarber,
  completeTicketForBarber,
  setBarberBreakStatus,
  cancelTicket,
  markTicketNoShow,
  getLiveQueueSnapshot,
  getEnrichedTicketById,
  assertValidStateTransition,
} from '../services/queueEngine.js';
import { getIstDateKey } from '../utils/salonTime.js';

const TEST_PORT = 5055;

async function runTests() {
  console.log('====================================================');
  console.log('  STARTING QUEUE ENGINE & REAL-TIME VERIFICATION   ');
  console.log('====================================================\n');

  // Ensure DB connected & seeded
  const services = await Service.find({ isActive: true });
  assert(services.length >= 2, 'Must have at least 2 active services');
  const haircut = services.find((s) => s.nameEn === 'Haircut') || services[0];
  const beardTrim = services.find((s) => s.nameEn === 'Beard Trim & Styling') || services[1];

  // Reset any test tickets for today to maintain clean state
  const dateKey = getIstDateKey();
  await QueueTicket.deleteMany({ dateKey, phone: { $regex: /^99999/ } });
  await Barber.updateMany({}, { $set: { status: 'available', currentTicketId: null, onDuty: true } });

  // Wait for server to start listening
  if (!server.listening) {
    await new Promise((res) => {
      server.once('listening', res);
      setTimeout(res, 1200);
    });
  }

  // Setup Socket client variables
  let socketConnected = false;
  let receivedQueueUpdatedCount = 0;
  let lastTicketCalledEvent = null;
  const io = app.get('io');

  // Connect to the Socket.IO server on port 5000
  const socket = ioClient('http://localhost:5000', {
    transports: ['websocket'],
    reconnection: false,
  });

  socket.on('connect', () => {
    socketConnected = true;
  });

  socket.on('queue:updated', () => {
    receivedQueueUpdatedCount++;
  });

  socket.on('ticket:called', (payload) => {
    lastTicketCalledEvent = payload;
  });

  // Allow brief moment for socket connection
  await new Promise((res) => setTimeout(res, 350));
  assert(socketConnected, 'Assertion Failed: Socket.IO test client failed to connect');
  console.log('✔ Socket.IO test client connected and subscribed');

  // Clean all test tickets & reset barbers to start fresh
  await QueueTicket.deleteMany({ phone: { $regex: '^(99999|99988|99887|91112)' } });
  await Barber.updateMany({}, { $set: { status: 'available', currentTicketId: null, onDuty: true } });

  // TEST 1: Service duration & price calculation on backend
  console.log('\n[TEST 1] Service duration & price calculation...');
  const testPhone1 = '9999900001';
  const join1 = await joinQueue({
    customerName: 'Karan Sharma',
    phone: testPhone1,
    serviceIds: [haircut._id, beardTrim._id],
    preferredBarber: 'any',
    source: 'walkin', // Walk-in bypasses online cutoff for automated test stability
  });

  assert.strictEqual(join1.isExisting, false, 'Ticket 1 should be a newly created ticket');
  assert.strictEqual(
    join1.ticket.totalDurationMin,
    haircut.durationMin + beardTrim.durationMin,
    `Duration must equal sum of services: ${haircut.durationMin + beardTrim.durationMin}`
  );
  assert.strictEqual(
    join1.ticket.totalPrice,
    haircut.price + beardTrim.price,
    `Price must equal sum of services: ${haircut.price + beardTrim.price}`
  );
  assert.strictEqual(join1.ticket.status, 'waiting');
  console.log(`✔ Test 1 Passed: Generated ${join1.ticket.token} with total ${join1.ticket.totalDurationMin}m and ₹${join1.ticket.totalPrice}`);

  // TEST 2: Duplicate active phone guard
  console.log('\n[TEST 2] Duplicate active phone guard...');
  const joinDuplicate = await joinQueue({
    customerName: 'Karan Duplicate Attempt',
    phone: testPhone1,
    serviceIds: [haircut._id],
    preferredBarber: 'any',
    source: 'walkin',
  });

  assert.strictEqual(joinDuplicate.isExisting, true, 'Duplicate active phone should return existing ticket');
  assert.strictEqual(
    String(joinDuplicate.ticket._id),
    String(join1.ticket._id),
    'Returned ticket must match existing ticket ID'
  );
  console.log(`✔ Test 2 Passed: Duplicate phone guarded, returned existing token ${joinDuplicate.ticket.token}`);

  // TEST 3: Strict Barber Preference Rule
  console.log('\n[TEST 3] Barber preference rule (Ravi vs Amit)...');
  // Customer 2 specifically requests 'ravi'
  const testPhone2 = '9999900002';
  const joinRaviPref = await joinQueue({
    customerName: 'Vikram Mehta',
    phone: testPhone2,
    serviceIds: [haircut._id],
    preferredBarber: 'ravi',
    source: 'walkin',
  });

  // Customer 3 requests 'any'
  const testPhone3 = '9999900003';
  const joinAnyPref = await joinQueue({
    customerName: 'Rahul Patel',
    phone: testPhone3,
    serviceIds: [beardTrim._id],
    preferredBarber: 'any',
    source: 'walkin',
  });

  // Amit calls next. Even though Vikram (Ravi-only) is ahead of Rahul in queue sequence,
  // Amit MUST skip Vikram and call Karan (if waiting) or Rahul (who accepts 'any')
  // Let's call next for Amit:
  const callAmit1 = await callNextForBarber('amit');
  assert.strictEqual(
    callAmit1.barber.slug,
    'amit',
    'Barber must be Amit'
  );
  // Vikram requested Ravi, so Amit must NOT have been assigned Vikram
  assert.notStrictEqual(
    String(callAmit1.ticket._id),
    String(joinRaviPref.ticket._id),
    'Amit MUST NEVER be assigned a customer who specifically requested Ravi'
  );
  console.log(`✔ Test 3 Passed: Barber 'amit' called token ${callAmit1.ticket.token} without violating Ravi preference`);

  // Now Ravi calls next: Ravi should receive Vikram!
  const callRavi = await callNextForBarber('ravi');
  assert.strictEqual(
    String(callRavi.ticket._id),
    String(joinRaviPref.ticket._id),
    'Ravi must be assigned Vikram who specifically requested Ravi'
  );
  console.log(`✔ Test 3 Passed: Barber 'ravi' correctly received token ${callRavi.ticket.token} with Ravi preference`);

  // TEST 4: Forward-Only State Transitions & Backwards Rejection
  console.log('\n[TEST 4] Forward-only state transitions...');
  // Progress Ravi's customer: called -> in_chair -> done
  const started = await startTicketForBarber('ravi');
  assert.strictEqual(started.ticket.status, 'in_chair', 'Status must be in_chair');
  assert(started.ticket.startedAt, 'startedAt timestamp must be recorded');

  const completed = await completeTicketForBarber('ravi');
  assert.strictEqual(completed.ticket.status, 'done', 'Status must be done');
  assert(completed.ticket.completedAt, 'completedAt timestamp must be recorded');
  assert.strictEqual(completed.barber.status, 'available', 'Barber chair must be freed as available');
  assert.strictEqual(completed.barber.currentTicketId, null, 'Barber currentTicketId must be null');

  // Verify illegal transition throws 400
  let illegalTransitionThrew = false;
  try {
    assertValidStateTransition('done', 'waiting');
  } catch (err) {
    illegalTransitionThrew = err.statusCode === 400;
  }
  assert(illegalTransitionThrew, 'Illegal transition done -> waiting must throw HTTP 400');

  let invalidCancelThrew = false;
  try {
    await cancelTicket(completed.ticket._id);
  } catch (err) {
    invalidCancelThrew = err.statusCode === 400;
  }
  assert(invalidCancelThrew, 'Attempting to cancel a completed ticket must throw HTTP 400');
  console.log('✔ Test 4 Passed: Full forward lifecycle (waiting->called->in_chair->done) and backwards guards confirmed');

  // TEST 5: No-Show Transition & Customer Re-joining at End of Queue
  console.log('\n[TEST 5] No-Show transition and end-of-queue rejoining...');
  // Complete Amit's active cut and cancel any leftover waiting ticket from Test 3
  await startTicketForBarber('amit');
  await completeTicketForBarber('amit');
  await cancelTicket(joinAnyPref.ticket._id);

  // Let's create a customer, call them with Imran, then mark them no-show
  const testPhone4 = '9999900004';
  const joinNoShowCustomer = await joinQueue({
    customerName: 'Samir Joshi',
    phone: testPhone4,
    serviceIds: [haircut._id],
    preferredBarber: 'imran',
    source: 'walkin',
  });

  const calledImran = await callNextForBarber('imran');
  assert.strictEqual(calledImran.ticket.status, 'called');
  assert.strictEqual(calledImran.barber.status, 'busy');

  // Mark no-show
  const noShowResult = await markTicketNoShow(calledImran.ticket._id);
  assert.strictEqual(noShowResult.status, 'no_show', 'Ticket status must be no_show');

  // Verify Imran is freed
  const imranAfter = await Barber.findOne({ slug: 'imran' });
  assert.strictEqual(imranAfter.status, 'available', 'Imran must be available after no-show');
  assert.strictEqual(imranAfter.currentTicketId, null, 'Imran currentTicketId must be null');

  // Customer re-joins with the same phone testPhone4: MUST create a new token at the end of the queue
  const rejoinCustomer = await joinQueue({
    customerName: 'Samir Joshi (Returned)',
    phone: testPhone4,
    serviceIds: [haircut._id],
    preferredBarber: 'imran',
    source: 'walkin',
  });

  assert.strictEqual(rejoinCustomer.isExisting, false, 'Customer after no_show must receive a brand new token');
  assert.notStrictEqual(
    String(rejoinCustomer.ticket._id),
    String(joinNoShowCustomer.ticket._id),
    'New token ID must differ from no-show ticket'
  );
  assert(
    rejoinCustomer.ticket.sequence > joinNoShowCustomer.ticket.sequence,
    'Re-joined customer must be appended at the end of the queue with higher sequence'
  );
  console.log(`✔ Test 5 Passed: No-show freed stylist and re-joined customer at end of queue with token ${rejoinCustomer.ticket.token}`);

  // TEST 6: Socket.IO Real-Time Broadcasts
  console.log('\n[TEST 6] Real-time Socket.IO event assertions...');
  // Trigger call-next through the REST API or socket broadcast
  const { broadcastQueueUpdate } = await import('../sockets/socketHandler.js');
  await broadcastQueueUpdate(io, {
    type: 'ticket_called',
    ticketId: rejoinCustomer.ticket._id,
    token: rejoinCustomer.ticket.token,
    customerName: rejoinCustomer.ticket.customerName,
    assignedBarber: 'imran',
    barberName: 'Imran',
  });

  await new Promise((res) => setTimeout(res, 250));
  assert(receivedQueueUpdatedCount > 0, 'Socket must have received queue:updated events');
  assert(lastTicketCalledEvent, 'Socket must have received ticket:called event');
  assert.strictEqual(lastTicketCalledEvent.token, rejoinCustomer.ticket.token);
  assert.strictEqual(lastTicketCalledEvent.assignedBarber, 'imran');
  console.log(`✔ Test 6 Passed: Received live 'ticket:called' event for ${lastTicketCalledEvent.token} assigned to ${lastTicketCalledEvent.barberName}`);

  // Clean up
  await QueueTicket.deleteMany({ dateKey, phone: { $regex: /^99999/ } });
  await Barber.updateMany({}, { $set: { status: 'available', currentTicketId: null, onDuty: true } });

  socket.disconnect();
  server.close();

  console.log('\n====================================================');
  console.log('  ALL QUEUE ENGINE & REAL-TIME TESTS PASSED (6/6)   ');
  console.log('====================================================\n');
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ TEST RUNNER FAILED:', err);
    process.exit(1);
  });
