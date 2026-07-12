const express  = require('express');
const router   = express.Router();
const controller = require('./participation.controller');
const { protect, restrictTo } = require('../../middleware/auth');
const { documentUpload } = require('../../config/multer');

router.use(protect);

// ── Employee routes ───────────────────────────────────────────────────────────
router.get('/',    controller.getMyParticipations);
router.post('/',   controller.register);
router.delete('/:id', controller.withdraw);

router.post(
  '/:id/proof',
  (req, _res, next) => { req.uploadFolder = 'proofs'; next(); },
  documentUpload.single('proof'),
  controller.uploadProof
);

// ── Manager / Admin routes ────────────────────────────────────────────────────
router.get('/manage', restrictTo('ADMIN', 'SUPERADMIN', 'MANAGER'), controller.getManagedParticipations);
router.patch('/:id/review', restrictTo('ADMIN', 'SUPERADMIN', 'MANAGER'), controller.review);

module.exports = router;
