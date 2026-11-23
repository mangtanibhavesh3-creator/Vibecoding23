import express from 'express';
import { Service, Barber, SalonConfig } from '../models/index.js';
import { requireStaffPin } from '../middleware/requireStaffPin.js';
import { broadcastQueueUpdate } from '../sockets/socketHandler.js';
import { AppError } from '../utils/AppError.js';

const router = express.Router();

// Apply requireStaffPin to all administrative routes
router.use(requireStaffPin);

const handleRouteError = (res, error) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      details: error.details || null,
    });
  }
  console.error('[Admin Route Error]', error);
  return res.status(500).json({
    message: error.message || 'Internal server error',
  });
};

/**
 * GET /api/admin/services
 * Returns all salon services (both active and inactive) sorted by sortOrder
 */
router.get('/services', async (req, res) => {
  try {
    const services = await Service.find().sort({ sortOrder: 1, nameEn: 1 }).lean();
    res.status(200).json(services);
  } catch (error) {
    handleRouteError(res, error);
  }
});

/**
 * POST /api/admin/services
 * Creates a new bilingual service
 */
router.post('/services', async (req, res) => {
  try {
    const { nameEn, nameGu, durationMin, price, isActive, sortOrder } = req.body;

    if (!nameEn || !nameGu || !durationMin || price === undefined) {
      throw new AppError(400, 'nameEn, nameGu, durationMin, and price are required fields');
    }

    const service = await Service.create({
      nameEn: String(nameEn).trim(),
      nameGu: String(nameGu).trim(),
      durationMin: Number(durationMin),
      price: Number(price),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
    });

    const io = req.app.get('io');
    await broadcastQueueUpdate(io);

    res.status(201).json({
      message: 'Service created successfully',
      service,
    });
  } catch (error) {
    handleRouteError(res, error);
  }
});

/**
 * PATCH /api/admin/services/:id
 * Updates service attributes
 */
router.patch('/services/:id', async (req, res) => {
  try {
    const updates = req.body;
    const allowedFields = ['nameEn', 'nameGu', 'durationMin', 'price', 'isActive', 'sortOrder'];
    const filteredUpdates = {};

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { $set: filteredUpdates },
      { new: true, runValidators: true }
    );

    if (!service) {
      throw new AppError(404, 'Service not found');
    }

    const io = req.app.get('io');
    await broadcastQueueUpdate(io);

    res.status(200).json({
      message: 'Service updated successfully',
      service,
    });
  } catch (error) {
    handleRouteError(res, error);
  }
});

/**
 * DELETE /api/admin/services/:id
 * Deletes a service
 */
router.delete('/services/:id', async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      throw new AppError(404, 'Service not found');
    }

    const io = req.app.get('io');
    await broadcastQueueUpdate(io);

    res.status(200).json({
      message: 'Service deleted successfully',
    });
  } catch (error) {
    handleRouteError(res, error);
  }
});

/**
 * GET /api/admin/barbers
 * Returns all barbers (both on duty and off duty) sorted by name
 */
router.get('/barbers', async (req, res) => {
  try {
    const barbers = await Barber.find().populate('currentTicketId').sort({ name: 1 }).lean();
    res.status(200).json(barbers);
  } catch (error) {
    handleRouteError(res, error);
  }
});

/**
 * PATCH /api/admin/barbers/:slug/duty
 * Toggles a barber's onDuty status
 */
router.patch('/barbers/:slug/duty', async (req, res) => {
  try {
    const { onDuty } = req.body;
    const normalizedSlug = String(req.params.slug).toLowerCase().trim();

    const barber = await Barber.findOne({ slug: normalizedSlug });
    if (!barber) {
      throw new AppError(404, `Barber '${normalizedSlug}' not found`);
    }

    if (onDuty === false && (barber.status === 'busy' || barber.currentTicketId)) {
      throw new AppError(400, `Cannot take barber '${barber.name}' off duty while serving an active customer`);
    }

    barber.onDuty = Boolean(onDuty);
    if (!barber.onDuty) {
      barber.status = 'on_break';
    } else if (barber.status === 'on_break') {
      barber.status = 'available';
    }
    await barber.save();

    const io = req.app.get('io');
    await broadcastQueueUpdate(io);

    res.status(200).json({
      message: `Barber '${barber.name}' duty status updated to ${barber.onDuty}`,
      barber,
    });
  } catch (error) {
    handleRouteError(res, error);
  }
});

/**
 * PATCH /api/admin/config
 * Updates salon operating configuration
 */
router.patch('/config', async (req, res) => {
  try {
    const {
      isQueueOpen,
      openTime,
      closeTime,
      salonNameEn,
      salonNameGu,
      onlineCutoffMinutes,
    } = req.body;

    const updates = {};
    if (isQueueOpen !== undefined) updates.isQueueOpen = Boolean(isQueueOpen);
    if (openTime !== undefined) updates.openTime = String(openTime).trim();
    if (closeTime !== undefined) updates.closeTime = String(closeTime).trim();
    if (salonNameEn !== undefined) updates.salonNameEn = String(salonNameEn).trim();
    if (salonNameGu !== undefined) updates.salonNameGu = String(salonNameGu).trim();
    if (onlineCutoffMinutes !== undefined) updates.onlineCutoffMinutes = Number(onlineCutoffMinutes);

    const config = await SalonConfig.findOneAndUpdate(
      { key: 'default' },
      { $set: updates },
      { new: true, upsert: true }
    );

    const io = req.app.get('io');
    await broadcastQueueUpdate(io);

    res.status(200).json({
      message: 'Salon configuration updated successfully',
      config,
    });
  } catch (error) {
    handleRouteError(res, error);
  }
});

export default router;
