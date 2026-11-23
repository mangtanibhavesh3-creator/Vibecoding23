import express from 'express';
import { SalonConfig, Barber, Service } from '../models/index.js';
import { evaluateOnlineJoiningStatus } from '../utils/salonTime.js';

const router = express.Router();

/**
 * GET /api/bootstrap
 * Returns the foundational salon configuration, on-duty barbers, active services,
 * and current online queue joining window evaluation.
 */
router.get('/', async (req, res) => {
  try {
    let salonConfig = await SalonConfig.findOne({ key: 'default' });

    if (!salonConfig) {
      salonConfig = await SalonConfig.create({ key: 'default' });
    }

    const [barbers, services] = await Promise.all([
      Barber.find({ onDuty: true }).sort({ name: 1 }).lean(),
      Service.find({ isActive: true }).sort({ sortOrder: 1, nameEn: 1 }).lean(),
    ]);

    const onlineStatus = evaluateOnlineJoiningStatus(salonConfig);

    res.status(200).json({
      salonConfig,
      barbers,
      services,
      onlineStatus,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[Bootstrap Route] Error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to bootstrap salon state',
      details: error.message,
    });
  }
});

export default router;
