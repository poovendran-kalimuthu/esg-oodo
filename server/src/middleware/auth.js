const jwt    = require('jsonwebtoken');
const prisma  = require('../config/database');
const { unauthorized } = require('../shared/utils/apiResponse');

/**
 * Protect routes — verifies Bearer JWT and attaches req.user
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorized(res, 'No authentication token provided');
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findFirst({
      where: { id: decoded.id, isActive: true, deletedAt: null },
      select: {
        id: true, name: true, email: true, role: true,
        departmentId: true, xpTotal: true, level: true,
      },
    });

    if (!user) return unauthorized(res, 'User not found or inactive');

    req.user = user;
    next();
  } catch {
    return unauthorized(res, 'Invalid or expired token');
  }
};

/**
 * Restrict to specific roles
 * Usage: restrictTo('ADMIN', 'SUPERADMIN')
 */
const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to perform this action',
    });
  }
  next();
};

module.exports = { protect, restrictTo };
