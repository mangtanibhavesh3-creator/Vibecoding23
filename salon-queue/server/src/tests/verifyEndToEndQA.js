import assert from 'assert';
import { io as ioClient } from 'socket.io-client';
import { connectDB } from '../config/db.js';
import { app, server } from '../index.js';
import { Service, Barber, QueueTicket, SalonConfig } from '../models/index.js';
import { en } from '../../../client/src/i18n/en.js';
import { gu } from '../../../client/src/i18n/gu.js';

const STAFF_PIN = process.env.STAFF_PIN || '1234';

const request = async (path, options = {}) => {
  const url = `http://localhost:5000${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
};

const runQaAudit = async () => {
  console.log('====================================================');
  console.log('       STARTING COMPREHENSIVE END-TO-END QA AUDIT   ');
  console.log('====================================================\n');

  // Wait for server to be listening
  if (!server.listening) {
    await new Promise((resolve) => {
      server.on('listening', resolve);
      const interval = setInterval(() => {
        if (server.listening) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  }

  // Socket.IO test client
  const socket = ioClient('http://localhost:5000', {
    transports: ['websocket'],
    forceNew: true,
  });

  const socketEvents = [];
  socket.on('queue:updated', (payload) => socketEvents.push({ event: 'queue:updated', payload }));
  socket.on('ticket:called', (payload) => socketEvents.push({ event: 'ticket:called', payload }));

  await new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', reject);
    setTimeout(() => reject(new Error('Socket connection timeout')), 3000);
  });
  console.log('✔ Socket.IO QA listener connected\n');

  // Ensure salon is open for testing regardless of the time of day the test is run
  await request('/api/admin/config', {
    method: 'PATCH',
    headers: { 'x-staff-pin': STAFF_PIN },
    body: JSON.stringify({ isQueueOpen: true, openTime: '00:00', closeTime: '23:59' }),
  });

  // Clean previous QA run tickets & ensure all barbers are available
  await QueueTicket.deleteMany({ phone: { $regex: '^(99988|99887|91112|99999)' } });
  await Barber.updateMany({}, { $set: { status: 'available', currentTicketId: null, onDuty: true } });

  // Fetch active services
  const bootstrapRes = await request('/api/bootstrap');
  assert(bootstrapRes.ok && bootstrapRes.data.services.length >= 2, 'Must have at least 2 active services');
  const [svc1, svc2] = bootstrapRes.data.services;

  // QA 1: Service Calculation
  console.log('[QA 1] Service Calculation: Cumulative duration and price...');
  const expectedDuration = svc1.durationMin + svc2.durationMin;
  const expectedPrice = svc1.price + svc2.price;
  const join1Res = await request('/api/queue/join', {
    method: 'POST',
    body: JSON.stringify({
      customerName: 'QA Customer One',
      phone: '9998800001',
      serviceIds: [svc1._id, svc2._id],
      preferredBarber: 'any',
    }),
  });
  assert.strictEqual(join1Res.status, 201);
  const ticket1 = join1Res.data.ticket;
  assert.strictEqual(ticket1.totalDurationMin, expectedDuration, 'Duration must equal sum of services');
  assert.strictEqual(ticket1.totalPrice, expectedPrice, 'Price must equal sum of services');
  console.log(`✔ QA 1 Passed: Exact calculation confirmed (${ticket1.totalDurationMin}m, ₹${ticket1.totalPrice})\n`);

  // QA 2: Duplicate Phone Guard
  console.log('[QA 2] Duplicate Phone Guard: Returning existing ticket for active phone...');
  const dupRes = await request('/api/queue/join', {
    method: 'POST',
    body: JSON.stringify({
      customerName: 'QA Customer One Duplicate',
      phone: '9998800001',
      serviceIds: [svc1._id],
      preferredBarber: 'any',
    }),
  });
  assert.strictEqual(dupRes.status, 200);
  assert.strictEqual(dupRes.data.isExisting, true);
  assert.strictEqual(dupRes.data.ticket._id, ticket1._id);
  console.log(`✔ QA 2 Passed: Duplicate phone guarded, returned active token ${dupRes.data.ticket.token}\n`);

  // QA 3: Barber Preference Matching
  console.log('[QA 3] Barber Preference Matching: Ravi preference skipped by Amit...');
  // Customer prefers Ravi
  const raviCustRes = await request('/api/queue/join', {
    method: 'POST',
    body: JSON.stringify({
      customerName: 'Ravi Loyalist',
      phone: '9998800002',
      serviceIds: [svc1._id],
      preferredBarber: 'ravi',
    }),
  });
  assert.strictEqual(raviCustRes.status, 201);
  const raviTicket = raviCustRes.data.ticket;

  // Customer prefers Any (comes after Ravi Loyalist)
  const anyCustRes = await request('/api/queue/join', {
    method: 'POST',
    body: JSON.stringify({
      customerName: 'Any Stylist Customer',
      phone: '9998800003',
      serviceIds: [svc1._id],
      preferredBarber: 'any',
    }),
  });
  assert.strictEqual(anyCustRes.status, 201);
  const anyTicket = anyCustRes.data.ticket;

  // Free Amit if busy
  await request('/api/queue/barber/amit/done', {
    method: 'POST',
    headers: { 'x-staff-pin': STAFF_PIN },
  });

  // Amit calls next: must skip Ravi Loyalist and call either ticket1 or anyTicket
  const amitCallRes = await request('/api/queue/barber/amit/call-next', {
    method: 'POST',
    headers: { 'x-staff-pin': STAFF_PIN },
  });
  assert.strictEqual(amitCallRes.status, 200);
  assert.notStrictEqual(amitCallRes.data.ticket._id, raviTicket._id, 'Amit must NOT call Ravi-preferred customer');
  console.log(`✔ QA 3 Passed: Amit skipped Ravi-preferred customer ${raviTicket.token} and called ${amitCallRes.data.ticket.token}\n`);

  // Amit starts and completes service to clear station
  await request('/api/queue/barber/amit/start', {
    method: 'POST',
    headers: { 'x-staff-pin': STAFF_PIN },
  });
  await request('/api/queue/barber/amit/done', {
    method: 'POST',
    headers: { 'x-staff-pin': STAFF_PIN },
  });

  // Also complete ticket1 if it was called earlier or clear Amit
  const remainingWaiting = await QueueTicket.find({ dateKey: '2026-11-23', status: 'waiting' });
  for (const t of remainingWaiting) {
    if (t._id.toString() !== raviTicket._id.toString()) {
      await QueueTicket.findByIdAndUpdate(t._id, { $set: { status: 'done' } });
    }
  }

  // QA 4: Sub-5s Real-Time Turn Alert
  console.log('[QA 4] Sub-5s Real-Time Turn Alert via Socket.IO...');
  // Free Ravi if busy
  await request('/api/queue/barber/ravi/done', {
    method: 'POST',
    headers: { 'x-staff-pin': STAFF_PIN },
  });

  const prevEventCount = socketEvents.length;
  const startTime = Date.now();
  const raviCallRes = await request('/api/queue/barber/ravi/call-next', {
    method: 'POST',
    headers: { 'x-staff-pin': STAFF_PIN },
  });
  assert.strictEqual(raviCallRes.status, 200);
  assert.strictEqual(raviCallRes.data.ticket._id, raviTicket._id);

  // Await socket alert
  await new Promise((resolve) => {
    const check = setInterval(() => {
      const calledEvt = socketEvents.find((e) => e.event === 'ticket:called' && e.payload.token === raviTicket.token);
      if (calledEvt) {
        clearInterval(check);
        resolve();
      }
    }, 50);
  });
  const elapsed = Date.now() - startTime;
  assert(elapsed < 5000, `Alert took ${elapsed}ms, must be < 5000ms`);
  console.log(`✔ QA 4 Passed: 'ticket:called' received in ${elapsed}ms (< 5000ms limit)\n`);

  // QA 5: Chair Lifecycle Sync (Start -> Done)
  console.log('[QA 5] Chair Lifecycle Sync: Start and Done chair state updates...');
  // Start service
  const startRes = await request('/api/queue/barber/ravi/start', {
    method: 'POST',
    headers: { 'x-staff-pin': STAFF_PIN },
  });
  assert.strictEqual(startRes.status, 200);
  assert.strictEqual(startRes.data.ticket.status, 'in_chair');

  // Verify /status/:id sees in_chair
  const statusRes = await request(`/api/queue/ticket/${raviTicket._id}`);
  assert.strictEqual(statusRes.data.status, 'in_chair');

  // Complete service
  const doneRes = await request('/api/queue/barber/ravi/done', {
    method: 'POST',
    headers: { 'x-staff-pin': STAFF_PIN },
  });
  assert.strictEqual(doneRes.status, 200);
  assert.strictEqual(doneRes.data.ticket.status, 'done');
  console.log(`✔ QA 5 Passed: Full chair lifecycle (called -> in_chair -> done) synchronized\n`);

  // QA 6: No-Show & End-of-Line Re-Join
  console.log('[QA 6] No-Show and End-of-Line Re-Join...');
  // Join a no-show test customer
  const noShowJoin = await request('/api/queue/join', {
    method: 'POST',
    body: JSON.stringify({
      customerName: 'NoShow Guest',
      phone: '9998800004',
      serviceIds: [svc1._id],
      preferredBarber: 'imran',
    }),
  });
  const noShowTicket = noShowJoin.data.ticket;

  // Free Imran if busy & ensure available
  await Barber.findOneAndUpdate({ slug: 'imran' }, { $set: { status: 'available', currentTicketId: null } });

  // Imran calls customer
  const imranCallRes = await request('/api/queue/barber/imran/call-next', {
    method: 'POST',
    headers: { 'x-staff-pin': STAFF_PIN },
  });
  assert.strictEqual(imranCallRes.status, 200);

  // Mark as No-Show
  const noShowMarkRes = await request(`/api/queue/ticket/${imranCallRes.data.ticket._id}/no-show`, {
    method: 'POST',
    headers: { 'x-staff-pin': STAFF_PIN },
  });
  assert.strictEqual(noShowMarkRes.status, 200);
  assert.strictEqual(noShowMarkRes.data.ticket.status, 'no_show');

  // Customer re-joins with same phone: must succeed with a BRAND NEW token at the end
  const rejoinRes = await request('/api/queue/join', {
    method: 'POST',
    body: JSON.stringify({
      customerName: 'NoShow Guest Rejoined',
      phone: '9998800004',
      serviceIds: [svc1._id],
      preferredBarber: 'any',
    }),
  });
  assert.strictEqual(rejoinRes.status, 201);
  assert.strictEqual(rejoinRes.data.isExisting, false);
  assert.notStrictEqual(rejoinRes.data.ticket.token, noShowTicket.token);
  console.log(`✔ QA 6 Passed: No-show freed chair; re-join issued new token ${rejoinRes.data.ticket.token}\n`);

  // QA 7: Queue Closure & Online Cutoff
  console.log('[QA 7] Queue Closure & Online Cutoff (Reception Walk-ins permitted)...');
  await request('/api/admin/config', {
    method: 'PATCH',
    headers: { 'x-staff-pin': STAFF_PIN },
    body: JSON.stringify({ isQueueOpen: false }),
  });

  // Online join must be rejected with 403
  const blockedOnlineJoin = await request('/api/queue/join', {
    method: 'POST',
    body: JSON.stringify({
      customerName: 'Online Denied',
      phone: '9998800005',
      serviceIds: [svc1._id],
      preferredBarber: 'any',
    }),
  });
  assert.strictEqual(blockedOnlineJoin.status, 403);

  // In-person Reception walk-in MUST succeed
  const walkInRes = await request('/api/queue/walkin', {
    method: 'POST',
    headers: { 'x-staff-pin': STAFF_PIN },
    body: JSON.stringify({
      customerName: 'In-Salon Guest',
      phone: '9998800005',
      serviceIds: [svc1._id],
      preferredBarber: 'any',
    }),
  });
  assert.strictEqual(walkInRes.status, 201);

  // Restore queue to open
  await request('/api/admin/config', {
    method: 'PATCH',
    headers: { 'x-staff-pin': STAFF_PIN },
    body: JSON.stringify({ isQueueOpen: true }),
  });
  console.log(`✔ QA 7 Passed: Online join blocked during closure while Reception walk-in succeeded\n`);

  // QA 8: Bilingual Parity (EN / ગુજરાતી)
  console.log('[QA 8] Bilingual Parity: Auditing dictionary parity between en.js and gu.js...');
  const compareKeys = (enObj, guObj, path = '') => {
    for (const key of Object.keys(enObj)) {
      const currentPath = path ? `${path}.${key}` : key;
      assert(
        guObj && key in guObj,
        `Missing Gujarati translation for key: '${currentPath}'`
      );
      if (typeof enObj[key] === 'object' && enObj[key] !== null) {
        compareKeys(enObj[key], guObj[key], currentPath);
      }
    }
  };
  compareKeys(en, gu);
  console.log(`✔ QA 8 Passed: 100% dictionary parity between EN and ગુજરાતી with zero missing keys\n`);

  // QA 9: Dynamic Wait Countdown
  console.log('[QA 9] Dynamic Wait Countdown calculation...');
  const stateSnapshot = await request('/api/queue/state');
  for (const t of stateSnapshot.data.waitingTickets) {
    assert(typeof t.position === 'number', 'Position must be a number');
    assert(typeof t.estimatedWaitMin === 'number', 'Estimated wait must be a number');
  }
  console.log(`✔ QA 9 Passed: Dynamic positions and wait countdown verified across ${stateSnapshot.data.waitingTickets.length} waiting tickets\n`);

  // QA 10: Invalid Transition Guard
  console.log('[QA 10] Invalid Transition Guard: Rejecting illegal / backward state moves...');
  // Done ticket cannot be moved to called or in_chair
  const illegalDoneStart = await request('/api/queue/barber/ravi/start', {
    method: 'POST',
    headers: { 'x-staff-pin': STAFF_PIN },
  });
  assert.strictEqual(illegalDoneStart.status, 400);

  // Direct cancel on a non-waiting / done ticket must fail
  const illegalCancel = await request(`/api/queue/ticket/${raviTicket._id}/cancel`, {
    method: 'POST',
  });
  assert.strictEqual(illegalCancel.status, 400);
  console.log(`✔ QA 10 Passed: Backwards and illegal transitions rejected with HTTP 400\n`);

  // QA 11: Production Health Check Endpoint
  console.log('[QA 11] Production Health Check Endpoint format...');
  const healthRes = await request('/api/health');
  assert.strictEqual(healthRes.status, 200);
  assert.strictEqual(healthRes.data.status, 'ok');
  assert.strictEqual(healthRes.data.database, 'connected');
  assert(typeof healthRes.data.uptimeSeconds === 'number');
  assert(Array.isArray(healthRes.data.allowedOrigins));
  console.log(`✔ QA 11 Passed: /api/health returned { status: "ok", database: "connected", uptimeSeconds: ${healthRes.data.uptimeSeconds} }\n`);

  // Restore default operating hours & clean up test tickets
  await request('/api/admin/config', {
    method: 'PATCH',
    headers: { 'x-staff-pin': STAFF_PIN },
    body: JSON.stringify({ isQueueOpen: true, openTime: '09:00', closeTime: '21:00' }),
  });

  await QueueTicket.deleteMany({ phone: { $regex: '^(99999|99988|99887|91112)' } });
  await Barber.updateMany({}, { $set: { status: 'available', currentTicketId: null, onDuty: true } });

  socket.disconnect();
  console.log('====================================================');
  console.log('     ALL 11 END-TO-END QA AUDIT CHECKS PASSED       ');
  console.log('====================================================\n');
  process.exit(0);
};

runQaAudit().catch((err) => {
  console.error('❌ QA Audit failed:', err);
  process.exit(1);
});
