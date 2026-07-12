const prisma = require('../config/database');

/**
 * Middleware to write audit logs.
 * Usage: auditLog('CREATE', 'CSRActivity')
 */
const auditLog = (action, entity) => async (req, _res, next) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || null,
        action,
        entity,
        entityId: req.params?.id || null,
        meta: { body: req.body, query: req.query },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
  next();
};

module.exports = { auditLog };
