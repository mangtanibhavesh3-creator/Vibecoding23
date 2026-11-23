import http from 'http';
import assert from 'assert';
import { io as ioClient } from 'socket.io-client';
import { connectDB } from '../config/db.js';
import { app, server } from '../index.js';
import { Service, Barber, SalonConfig } from '../models/index.js';
import { getLiveQueueSnapshot } from '../services/queueEngine.js';

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

const runAdminVerification = async () => {
  console.log('====================================================');
  console.log('   STARTING ADMIN DASHBOARD & REST API VERIFICATION ');
  console.log('====================================================\n');

  // Wait for index.js bootstrap to be listening
  if (!server.listening) {
    await new Promise((resolve) => {
      server.on('listening', resolve);
      // fallback in case it already started before listener was attached
      const interval = setInterval(() => {
        if (server.listening) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  }

  // Connect Socket.IO client to listen for real-time broadcasts
  const socket = ioClient('http://localhost:5000', {
    transports: ['websocket'],
    forceNew: true,
  });

  let queueUpdatedCount = 0;
  socket.on('queue:updated', () => {
    queueUpdatedCount++;
  });

  await new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', reject);
    setTimeout(() => reject(new Error('Socket connection timeout')), 3000);
  });
  console.log('✔ Socket.IO client connected to monitor real-time sync\n');

  // TEST 1: Staff PIN Auth Guard
  console.log('[TEST 1] Testing Staff PIN authentication guard...');
  const unauthRes = await request('/api/admin/services');
  assert.strictEqual(unauthRes.status, 401, 'Request without PIN must return 401');

  const invalidPinRes = await request('/api/admin/services', {
    headers: { 'x-staff-pin': '0000' },
  });
  assert.strictEqual(invalidPinRes.status, 401, 'Request with invalid PIN must return 401');

  const validPinRes = await request('/api/admin/services', {
    headers: { 'x-staff-pin': STAFF_PIN },
  });
  assert.strictEqual(validPinRes.status, 200, 'Request with valid PIN must return 200');
  assert(Array.isArray(validPinRes.data), 'Services response must be an array');
  console.log(`✔ Test 1 Passed: PIN guard enforced; authenticated returned ${validPinRes.data.length} services\n`);

  // TEST 2: GET /api/admin/barbers
  console.log('[TEST 2] Testing GET /api/admin/barbers...');
  const barbersRes = await request('/api/admin/barbers', {
    headers: { 'x-staff-pin': STAFF_PIN },
  });
  assert.strictEqual(barbersRes.status, 200);
  assert(barbersRes.data.length >= 3, 'Must return all 3 barbers');
  console.log(`✔ Test 2 Passed: Retrieved ${barbersRes.data.length} barbers from admin endpoint\n`);

  // TEST 3: Create New Bilingual Service
  console.log('[TEST 3] Creating new bilingual service via POST /api/admin/services...');
  const initialBroadcastCount = queueUpdatedCount;
  const newServicePayload = {
    nameEn: 'Head Spa & Steam Treatment',
    nameGu: 'હેડ સ્પા અને સ્ટીમ ટ્રીટમેન્ટ',
    durationMin: 25,
    price: 350,
    isActive: true,
  };

  const createRes = await request('/api/admin/services', {
    method: 'POST',
    headers: { 'x-staff-pin': STAFF_PIN },
    body: JSON.stringify(newServicePayload),
  });
  assert.strictEqual(createRes.status, 201);
  const createdService = createRes.data.service;
  assert(createdService?._id, 'Created service must have an _id');
  assert.strictEqual(createdService.nameEn, newServicePayload.nameEn);
  assert.strictEqual(createdService.nameGu, newServicePayload.nameGu);

  // Allow socket event to arrive
  await new Promise((r) => setTimeout(r, 200));
  assert(queueUpdatedCount > initialBroadcastCount, 'Creation must trigger broadcastQueueUpdate');

  // Verify it appears in active public queue state
  const stateRes1 = await request('/api/queue/state');
  const foundInActive = stateRes1.data.services.some((s) => s._id === createdService._id);
  assert(foundInActive, 'New active service must appear in /api/queue/state');
  console.log(`✔ Test 3 Passed: Created '${createdService.nameEn}' (₹${createdService.price}) and verified active broadcast\n`);

  // TEST 4: Toggle Service Inactive (Hide from /join and /reception)
  console.log('[TEST 4] Toggling service inactive via PATCH /api/admin/services/:id...');
  const patchInactiveRes = await request(`/api/admin/services/${createdService._id}`, {
    method: 'PATCH',
    headers: { 'x-staff-pin': STAFF_PIN },
    body: JSON.stringify({ isActive: false }),
  });
  assert.strictEqual(patchInactiveRes.status, 200);
  assert.strictEqual(patchInactiveRes.data.service.isActive, false);

  await new Promise((r) => setTimeout(r, 200));
  const stateRes2 = await request('/api/queue/state');
  const hiddenFromActive = !stateRes2.data.services.some((s) => s._id === createdService._id);
  assert(hiddenFromActive, 'Disabled service must immediately disappear from /api/queue/state');
  console.log(`✔ Test 4 Passed: Disabled service immediately disappeared from active customer queue\n`);

  // TEST 5: Delete Service
  console.log('[TEST 5] Deleting test service via DELETE /api/admin/services/:id...');
  const deleteRes = await request(`/api/admin/services/${createdService._id}`, {
    method: 'DELETE',
    headers: { 'x-staff-pin': STAFF_PIN },
  });
  assert.strictEqual(deleteRes.status, 200);

  const checkDeleted = await Service.findById(createdService._id);
  assert.strictEqual(checkDeleted, null, 'Service must be permanently removed from DB');
  console.log(`✔ Test 5 Passed: Service deleted successfully\n`);

  // TEST 6: Master Queue Open / Closed Toggle
  console.log('[TEST 6] Testing Master Queue Open/Closed toggle via PATCH /api/admin/config...');
  // Toggle Queue to Closed
  const closeQueueRes = await request('/api/admin/config', {
    method: 'PATCH',
    headers: { 'x-staff-pin': STAFF_PIN },
    body: JSON.stringify({ isQueueOpen: false }),
  });
  assert.strictEqual(closeQueueRes.status, 200);
  assert.strictEqual(closeQueueRes.data.config.isQueueOpen, false);

  await new Promise((r) => setTimeout(r, 200));
  const stateResClosed = await request('/api/queue/state');
  assert.strictEqual(stateResClosed.data.onlineStatus.isOpen, false);
  assert.strictEqual(stateResClosed.data.onlineStatus.reason, 'manual_closed');

  // Verify online customer join is rejected when queue is closed
  const joinAttemptRes = await request('/api/queue/join', {
    method: 'POST',
    body: JSON.stringify({
      customerName: 'Test Customer',
      phone: '9876543210',
      serviceIds: [stateResClosed.data.services[0]._id],
      preferredBarber: 'any',
    }),
  });
  assert.strictEqual(joinAttemptRes.status, 403);
  console.log(`✔ Test 6 Passed: Queue toggle to CLOSED disabled online joining across all clients`);

  // Re-open Queue
  const openQueueRes = await request('/api/admin/config', {
    method: 'PATCH',
    headers: { 'x-staff-pin': STAFF_PIN },
    body: JSON.stringify({ isQueueOpen: true }),
  });
  assert.strictEqual(openQueueRes.status, 200);
  assert.strictEqual(openQueueRes.data.config.isQueueOpen, true);
  console.log(`✔ Test 6 Passed: Queue toggle re-opened successfully\n`);

  // TEST 7: Barber Duty Toggle & Protection
  console.log('[TEST 7] Testing Barber On-Duty toggle via PATCH /api/admin/barbers/:slug/duty...');
  const dutyOffRes = await request('/api/admin/barbers/imran/duty', {
    method: 'PATCH',
    headers: { 'x-staff-pin': STAFF_PIN },
    body: JSON.stringify({ onDuty: false }),
  });
  assert.strictEqual(dutyOffRes.status, 200);
  assert.strictEqual(dutyOffRes.data.barber.onDuty, false);

  // Restore on duty
  const dutyOnRes = await request('/api/admin/barbers/imran/duty', {
    method: 'PATCH',
    headers: { 'x-staff-pin': STAFF_PIN },
    body: JSON.stringify({ onDuty: true }),
  });
  assert.strictEqual(dutyOnRes.status, 200);
  assert.strictEqual(dutyOnRes.data.barber.onDuty, true);
  console.log(`✔ Test 7 Passed: Barber duty toggle (Off/On) verified\n`);

  socket.disconnect();
  console.log('====================================================');
  console.log('  ALL ADMIN DASHBOARD & API TESTS PASSED (7/7)      ');
  console.log('====================================================\n');
  process.exit(0);
};

runAdminVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
