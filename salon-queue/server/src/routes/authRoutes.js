import express from 'express';

const router = express.Router();

/**
 * POST /api/auth/verify-pin
 * Verifies staff authorization PIN for reception and administrative actions.
 */
router.post('/verify-pin', (req, res) => {
  const { pin } = req.body;
  const configuredPin = (process.env.STAFF_PIN || '1234').trim();

  if (!pin) {
    return res.status(401).json({
      valid: false,
      message: 'Staff PIN is required',
    });
  }

  const inputPin = String(pin).trim();

  if (inputPin === configuredPin) {
    return res.status(200).json({
      valid: true,
      message: 'Staff PIN verified successfully',
    });
  }

  return res.status(401).json({
    valid: false,
    message: 'Invalid staff PIN',
  });
});

export default router;
