/**
 * Staff PIN Authorization Middleware
 * Validates 'x-staff-pin' header against configured environment secret.
 */
export const requireStaffPin = (req, res, next) => {
  const staffPinHeader = req.headers['x-staff-pin'];
  const configuredPin = (process.env.STAFF_PIN || '1234').trim();

  if (!staffPinHeader || String(staffPinHeader).trim() !== configuredPin) {
    return res.status(401).json({
      message: 'Valid staff PIN required',
    });
  }

  next();
};

export default requireStaffPin;
