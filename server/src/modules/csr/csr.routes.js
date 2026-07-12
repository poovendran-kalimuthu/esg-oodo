const express = require('express');
const router  = express.Router();

const controller     = require('./csr.controller');
const { protect, restrictTo } = require('../../middleware/auth');
const { auditLog }   = require('../../middleware/auditLog');
const { imageUpload } = require('../../config/multer');
const { validateCreate, validateUpdate, validateStatus } = require('./csr.validator');

// All routes require authentication
router.use(protect);

// ── List & Detail ─────────────────────────────────────────────────────────────
router.get('/',    controller.list);
router.get('/:id', controller.getById);
router.get('/:id/participants', controller.getParticipants);

// ── Create ────────────────────────────────────────────────────────────────────
router.post(
  '/',
  restrictTo('ADMIN', 'SUPERADMIN', 'MANAGER'),
  validateCreate,
  auditLog('CREATE', 'CSRActivity'),
  controller.create
);

// ── Update ────────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  restrictTo('ADMIN', 'SUPERADMIN', 'MANAGER'),
  validateUpdate,
  auditLog('UPDATE', 'CSRActivity'),
  controller.update
);

// ── Status Change ─────────────────────────────────────────────────────────────
router.patch(
  '/:id/status',
  restrictTo('ADMIN', 'SUPERADMIN', 'MANAGER'),
  validateStatus,
  auditLog('STATUS_CHANGE', 'CSRActivity'),
  controller.updateStatus
);

// ── Banner Upload ─────────────────────────────────────────────────────────────
router.post(
  '/:id/banner',
  restrictTo('ADMIN', 'SUPERADMIN', 'MANAGER'),
  (req, _res, next) => { req.uploadFolder = 'banners'; next(); },
  imageUpload.single('banner'),
  controller.uploadBanner
);

// ── Soft Delete ───────────────────────────────────────────────────────────────
router.delete(
  '/:id',
  restrictTo('ADMIN', 'SUPERADMIN'),
  auditLog('DELETE', 'CSRActivity'),
  controller.delete
);

module.exports = router;
