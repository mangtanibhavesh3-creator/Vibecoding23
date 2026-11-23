import express from 'express';
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
} from '../services/queueEngine.js';
import { broadcastQueueUpdate } from '../sockets/socketHandler.js';
import { requireStaffPin } from '../middleware/requireStaffPin.js';
import { AppError } from '../utils/AppError.js';

const router = express.Router();

const handleRouteError = (res, error) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      details: error.details || null,
    });
  }
  console.error('[Queue Route Error]', error);
  return res.status(500).json({
    message: error.message || 'Internal server error',
  });
};

/**
 * GET /api/queue/state
 * Public queue state snapshot for all dashboards and TV board
 */
router.get('/state', async (req, res) => {
  try {
    const snapshot = await getLiveQueueSnapshot();
    res.status(200).json(snapshot);
  } catch (error) {
    handleRouteError(res, error);
  }
});

/**
 * POST /api/queue/join
 * Public customer self-registration (online check-in)
 */
router.post('/join', async (req, res) => {
  try {
    const { customerName, phone, serviceIds, preferredBarber } = req.body;
    const result = await joinQueue({
      customerName,
      phone,
      serviceIds,
      preferredBarber,
      source: 'online',
    });

    const io = req.app.get('io');
    await broadcastQueueUpdate(io);

    res.status(result.isExisting ? 200 : 201).json(result);
  } catch (error) {
    handleRouteError(res, error);
  }
});

/**
 * POST /api/queue/walkin
 * Staff reception walk-in registration (PIN protected)
 */
router.post('/walkin', requireStaffPin, async (req, res) => {
  try {
    const { customerName, phone, serviceIds, preferredBarber } = req.body;
    const result = await joinQueue({
      customerName,
      phone,
      serviceIds,
      preferredBarber,
      source: 'walkin',
    });

    const io = req.app.get('io');
    await broadcastQueueUpdate(io);

    res.status(result.isExisting ? 200 : 201).json(result);
  } catch (error) {
    handleRouteError(res, error);
  }
});

/**
 * GET /api/queue/ticket/:id
 * Public single ticket status with position and wait time calculation
 */
router.get('/ticket/:id', async (req, res) => {
  try {
    const ticket = await getEnrichedTicketById(req.params.id);
    res.status(200).json(ticket);
  } catch (error) {
    handleRouteError(res, error);
  }
});

/**
 * POST /api/queue/ticket/:id/cancel
 * Public customer cancellation (only waiting tickets)
 */
router.post('/ticket/:id/cancel', async (req, res) => {
  try {
    const ticket = await cancelTicket(req.params.id);
    const io = req.app.get('io');
    await broadcastQueueUpdate(io);

    res.status(200).json({
      message: 'Ticket cancelled successfully',
      ticket,
    });
  } catch (error) {
    handleRouteError(res, error);
  }
});

/**
 * POST /api/queue/ticket/:id/no-show
 * Reception staff marks a called customer as no-show (PIN protected)
 */
router.post('/ticket/:id/no-show', requireStaffPin, async (req, res) => {
  try {
    const ticket = await markTicketNoShow(req.params.id);
    const io = req.app.get('io');
    await broadcastQueueUpdate(io);

    res.status(200).json({
      message: 'Ticket marked as no-show; barber freed',
      ticket,
    });
  } catch (error) {
    handleRouteError(res, error);
  }
});

/**
 * POST /api/queue/barber/:slug/call-next
 * Barber calls the next customer in line (PIN protected)
 */
router.post('/barber/:slug/call-next', requireStaffPin, async (req, res) => {
  try {
    const { ticket, barber } = await callNextForBarber(req.params.slug);
    const io = req.app.get('io');

    await broadcastQueueUpdate(io, {
      type: 'ticket_called',
      ticketId: ticket._id,
      token: ticket.token,
      customerName: ticket.customerName,
      assignedBarber: barber.slug,
      barberName: barber.name,
    });

    res.status(200).json({
      message: `Customer ${ticket.token} called to chair for ${barber.name}`,
      ticket,
      barber,
    });
  } catch (error) {
    handleRouteError(res, error);
  }
});

/**
 * POST /api/queue/barber/:slug/start
 * Barber seats customer and starts service (PIN protected)
 */
router.post('/barber/:slug/start', requireStaffPin, async (req, res) => {
  try {
    const result = await startTicketForBarber(req.params.slug);
    const io = req.app.get('io');
    await broadcastQueueUpdate(io);

    res.status(200).json({
      message: `Service started for ${result.ticket.token}`,
      ...result,
    });
  } catch (error) {
    handleRouteError(res, error);
  }
});

/**
 * POST /api/queue/barber/:slug/done
 * Barber completes service and frees station (PIN protected)
 */
router.post('/barber/:slug/done', requireStaffPin, async (req, res) => {
  try {
    const result = await completeTicketForBarber(req.params.slug);
    const io = req.app.get('io');
    await broadcastQueueUpdate(io);

    res.status(200).json({
      message: `Service completed for ${result.ticket.token}`,
      ...result,
    });
  } catch (error) {
    handleRouteError(res, error);
  }
});

/**
 * PATCH /api/queue/barber/:slug/status
 * Barber toggles between 'available' and 'on_break' (PIN protected)
 */
router.patch('/barber/:slug/status', requireStaffPin, async (req, res) => {
  try {
    const { status } = req.body;
    const barber = await setBarberBreakStatus(req.params.slug, status);
    const io = req.app.get('io');
    await broadcastQueueUpdate(io);

    res.status(200).json({
      message: `Barber status updated to ${status}`,
      barber,
    });
  } catch (error) {
    handleRouteError(res, error);
  }
});

export default router;
