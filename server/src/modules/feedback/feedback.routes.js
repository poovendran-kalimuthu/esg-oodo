const express = require('express');
const router  = express.Router();
const prisma  = require('../../config/database');
const { protect, restrictTo } = require('../../middleware/auth');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { success, created, paginated } = require('../../shared/utils/apiResponse');
const { parsePagination } = require('../../shared/utils/pagination');
const gamificationService = require('../gamification/gamification.service');
const { XP_REWARDS } = require('../../shared/constants/xpRewards');

router.use(protect);

// ── POST /api/feedback (Submit) ───────────────────────────────────────────────
router.post('/', asyncHandler(async (req, res) => {
  const { type, content, isAnonymous = false, departmentId } = req.body;

  const feedback = await prisma.feedback.create({
    data: {
      type, content, isAnonymous,
      submittedById: isAnonymous ? null : req.user.id,
      departmentId: departmentId || req.user.departmentId,
    },
  });

  // Award XP for feedback
  await gamificationService.awardXP(req.user.id, XP_REWARDS.FEEDBACK_SUBMISSION, 'Feedback Submission', feedback.id, 'Feedback');
  await gamificationService.checkAndAwardBadges(req.user.id);

  created(res, { feedback }, 'Feedback submitted successfully');
}));

// ── GET /api/feedback/my ──────────────────────────────────────────────────────
router.get('/my', asyncHandler(async (req, res) => {
  const { skip, take, page, limit } = parsePagination(req.query);
  const [data, total] = await Promise.all([
    prisma.feedback.findMany({
      where: { submittedById: req.user.id },
      skip, take, orderBy: { createdAt: 'desc' },
    }),
    prisma.feedback.count({ where: { submittedById: req.user.id } }),
  ]);
  paginated(res, { data, total, page, limit });
}));

// ── GET /api/feedback (HR All) ────────────────────────────────────────────────
router.get('/', restrictTo('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
  const { skip, take, page, limit } = parsePagination(req.query);
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.type)   where.type   = req.query.type;

  const [data, total] = await Promise.all([
    prisma.feedback.findMany({
      where, skip, take,
      include: {
        submitter: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.feedback.count({ where }),
  ]);
  paginated(res, { data, total, page, limit });
}));

// ── GET /api/feedback/:id ─────────────────────────────────────────────────────
router.get('/:id', restrictTo('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
  const feedback = await prisma.feedback.findUnique({
    where: { id: req.params.id },
    include: { submitter: true, assignedTo: true },
  });
  if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });
  success(res, { feedback });
}));

// ── PATCH /api/feedback/:id/status ────────────────────────────────────────────
router.patch('/:id/status', restrictTo('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
  const { status, resolutionNote } = req.body;
  const data = { status };
  if (resolutionNote) data.resolutionNote = resolutionNote;
  if (status === 'RESOLVED') data.resolvedAt = new Date();

  const feedback = await prisma.feedback.update({ where: { id: req.params.id }, data });
  success(res, { feedback }, 'Status updated');
}));

// ── PATCH /api/feedback/:id/assign ────────────────────────────────────────────
router.patch('/:id/assign', restrictTo('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
  const { assignedToId } = req.body;
  const feedback = await prisma.feedback.update({
    where: { id: req.params.id },
    data: { assignedToId, status: 'ASSIGNED' },
    include: { assignedTo: { select: { name: true, email: true } } },
  });
  success(res, { feedback }, 'Feedback assigned');
}));

module.exports = router;
