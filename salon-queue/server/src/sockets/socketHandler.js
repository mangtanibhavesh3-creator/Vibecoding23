import { getLiveQueueSnapshot } from '../services/queueEngine.js';

/**
 * Broadcasts full queue state update to all connected Socket.IO clients.
 * Optionally dispatches high-priority event alerts (e.g. ticket:called for chime / toast).
 *
 * @param {import('socket.io').Server} io
 * @param {Object} [eventMeta] - Optional event metadata e.g. { type: 'ticket_called', ... }
 */
export const broadcastQueueUpdate = async (io, eventMeta = null) => {
  if (!io) return;

  try {
    const snapshot = await getLiveQueueSnapshot();
    io.emit('queue:updated', snapshot);

    if (eventMeta?.type === 'ticket_called') {
      io.emit('ticket:called', {
        ticketId: eventMeta.ticketId,
        token: eventMeta.token,
        customerName: eventMeta.customerName,
        assignedBarber: eventMeta.assignedBarber,
        barberName: eventMeta.barberName,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error(`[Socket.IO] Error broadcasting queue update: ${error.message}`);
  }
};

/**
 * Initializes socket connection listeners and hydrates newly connected clients instantly.
 * @param {import('socket.io').Server} io
 */
export const setupSocketHandlers = (io) => {
  io.on('connection', async (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Emit initial handshake
    socket.emit('socket:handshake', {
      status: 'connected',
      socketId: socket.id,
      serverTime: new Date().toISOString(),
    });

    // Hydrate client instantly with full queue state
    try {
      const snapshot = await getLiveQueueSnapshot();
      socket.emit('queue:updated', snapshot);
    } catch (err) {
      console.error(`[Socket.IO] Failed to hydrate new client ${socket.id}: ${err.message}`);
    }

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected (${socket.id}): ${reason}`);
    });
  });
};

export default {
  broadcastQueueUpdate,
  setupSocketHandlers,
};
