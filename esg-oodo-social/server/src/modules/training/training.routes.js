const express = require('express');
const router  = express.Router();
const prisma  = require('../../config/database');
const { protect, restrictTo } = require('../../middleware/auth');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { success, created, paginated } = require('../../shared/utils/apiResponse');
const { parsePagination } = require('../../shared/utils/pagination');
const gamificationService = require('../gamification/gamification.service');
const notificationService = require('../notifications/notifications.service');
const { XP_REWARDS } = require('../../shared/constants/xpRewards');

router.use(protect);

// ── GET /api/training ─────────────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const { skip, take, page, limit } = parsePagination(req.query);
  const where = {};
  if (req.query.categoryId)   where.categoryId   = req.query.categoryId;
  if (req.query.departmentId) where.departmentId = req.query.departmentId;
  if (req.query.search) {
    where.name = { contains: req.query.search, mode: 'insensitive' };
  }

  const [data, total] = await Promise.all([
    prisma.training.findMany({
      where, skip, take,
      include: {
        category: { select: { name: true } },
        department: { select: { name: true } },
        _count: { select: { completions: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.training.count({ where }),
  ]);
  paginated(res, { data, total, page, limit });
}));

// ── GET /api/training/my ──────────────────────────────────────────────────────
router.get('/my', asyncHandler(async (req, res) => {
  const { skip, take, page, limit } = parsePagination(req.query);
  const where = { userId: req.user.id };
  if (req.query.status) where.completionStatus = req.query.status;

  const [data, total] = await Promise.all([
    prisma.trainingCompletion.findMany({
      where, skip, take,
      include: { training: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.trainingCompletion.count({ where }),
  ]);
  paginated(res, { data, total, page, limit });
}));

// ── GET /api/training/dashboard ───────────────────────────────────────────────
router.get('/dashboard', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const [completed, inProgress, overdue, total] = await Promise.all([
    prisma.trainingCompletion.count({ where: { userId, completionStatus: 'COMPLETED' } }),
    prisma.trainingCompletion.count({ where: { userId, completionStatus: 'IN_PROGRESS' } }),
    prisma.trainingCompletion.count({ where: { userId, completionStatus: 'OVERDUE' } }),
    prisma.trainingCompletion.count({ where: { userId } }),
  ]);
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  success(res, { completed, inProgress, overdue, total, completionRate });
}));

// ── GET /api/training/:id ─────────────────────────────────────────────────────
router.get('/:id', asyncHandler(async (req, res) => {
  const training = await prisma.training.findUnique({
    where: { id: req.params.id },
    include: {
      category: true, department: true, createdBy: { select: { name: true } },
      completions: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  });
  if (!training) return res.status(404).json({ success: false, message: 'Training not found' });
  success(res, { training });
}));

// ── POST /api/training ────────────────────────────────────────────────────────
router.post('/', restrictTo('ADMIN', 'SUPERADMIN', 'MANAGER'), asyncHandler(async (req, res) => {
  const { name, description, categoryId, departmentId, dueDate, totalModules } = req.body;
  const training = await prisma.training.create({
    data: { name, description, categoryId, departmentId, dueDate: new Date(dueDate), totalModules: totalModules || 1, createdById: req.user.id },
  });
  created(res, { training }, 'Training created');
}));

// ── POST /api/training/:id/assign ─────────────────────────────────────────────
router.post('/:id/assign', restrictTo('ADMIN', 'SUPERADMIN', 'MANAGER'), asyncHandler(async (req, res) => {
  const { userIds } = req.body; // array of user IDs
  const training = await prisma.training.findUnique({ where: { id: req.params.id } });
  if (!training) return res.status(404).json({ success: false, message: 'Training not found' });

  const assignments = [];
  for (const userId of userIds) {
    const comp = await prisma.trainingCompletion.upsert({
      where: { trainingId_userId: { trainingId: training.id, userId } },
      update: {},
      create: { trainingId: training.id, userId },
    });
    assignments.push(comp);
    await notificationService.create({
      userId, title: 'New Training Assigned 📚',
      message: `You have been assigned "${training.name}". Due: ${training.dueDate.toLocaleDateString()}`,
      type: 'TRAINING_ASSIGNED', referenceId: training.id, referenceType: 'Training',
    });
  }
  success(res, { assignments }, `Training assigned to ${userIds.length} user(s)`);
}));

// ── PATCH /api/training/completion/:id ───────────────────────────────────────
router.patch('/completion/:id', asyncHandler(async (req, res) => {
  const { completedModules } = req.body;
  const completion = await prisma.trainingCompletion.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { training: true },
  });
  if (!completion) return res.status(404).json({ success: false, message: 'Not found' });

  const pct = Math.round((completedModules / completion.training.totalModules) * 100);
  const isCompleted = pct >= 100;
  const now = new Date();
  const isOverdue = !isCompleted && now > new Date(completion.training.dueDate);

  const updated = await prisma.trainingCompletion.update({
    where: { id: req.params.id },
    data: {
      completedModules,
      completionPercentage: Math.min(pct, 100),
      completionStatus: isCompleted ? 'COMPLETED' : isOverdue ? 'OVERDUE' : 'IN_PROGRESS',
      completionDate: isCompleted ? now : null,
      xpEarned: isCompleted ? XP_REWARDS.TRAINING_COMPLETION : completion.xpEarned,
    },
  });

  if (isCompleted && completion.completionStatus !== 'COMPLETED') {
    await gamificationService.awardXP(req.user.id, XP_REWARDS.TRAINING_COMPLETION, `Training: ${completion.training.name}`, completion.id, 'TrainingCompletion');
    await gamificationService.checkAndAwardBadges(req.user.id);
  }
  success(res, { completion: updated }, 'Progress updated');
}));

module.exports = router;
