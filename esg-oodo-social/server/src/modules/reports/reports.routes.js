const express = require('express');
const router  = express.Router();
const prisma  = require('../../config/database');
const { protect, restrictTo } = require('../../middleware/auth');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { success } = require('../../shared/utils/apiResponse');

router.use(protect, restrictTo('ADMIN', 'SUPERADMIN', 'MANAGER'));

// Helper: parse date filters
const dateFilter = (q) => {
  const filter = {};
  if (q.dateFrom) filter.gte = new Date(q.dateFrom);
  if (q.dateTo)   filter.lte = new Date(q.dateTo);
  return Object.keys(filter).length ? filter : undefined;
};

// ── GET /api/reports/csr ──────────────────────────────────────────────────────
router.get('/csr', asyncHandler(async (req, res) => {
  const where = { deletedAt: null };
  if (req.query.status)       where.status       = req.query.status;
  if (req.query.departmentId) where.departmentId = req.query.departmentId;
  if (req.query.categoryId)   where.categoryId   = req.query.categoryId;
  const created = dateFilter(req.query);
  if (created) where.createdAt = created;

  const data = await prisma.cSRActivity.findMany({
    where,
    include: {
      category: true, department: true, organizer: { select: { name: true } },
      _count: { select: { participations: true } },
    },
    orderBy: { eventDate: 'desc' },
  });
  success(res, { report: data, count: data.length });
}));

// ── GET /api/reports/participation ────────────────────────────────────────────
router.get('/participation', asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.departmentId)  where.departmentId  = req.query.departmentId;
  if (req.query.approvalStatus) where.approvalStatus = req.query.approvalStatus;
  if (req.query.csrActivityId) where.csrActivityId = req.query.csrActivityId;
  const registered = dateFilter(req.query);
  if (registered) where.registrationDate = registered;

  const data = await prisma.employeeParticipation.findMany({
    where,
    include: {
      user: { select: { name: true, email: true, department: { select: { name: true } } } },
      csrActivity: { select: { title: true, eventDate: true } },
    },
    orderBy: { registrationDate: 'desc' },
  });

  const summary = {
    total: data.length,
    approved: data.filter((d) => d.approvalStatus === 'APPROVED').length,
    totalVolunteerHours: data.reduce((a, d) => a + (d.volunteerHours || 0), 0),
    totalXPEarned: data.reduce((a, d) => a + (d.xpEarned || 0), 0),
  };
  success(res, { report: data, summary });
}));

// ── GET /api/reports/training ─────────────────────────────────────────────────
router.get('/training', asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.departmentId)      where.training = { departmentId: req.query.departmentId };
  if (req.query.completionStatus)  where.completionStatus = req.query.completionStatus;

  const data = await prisma.trainingCompletion.findMany({
    where,
    include: {
      training: { include: { category: true } },
      user: { select: { name: true, email: true, department: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const summary = {
    total: data.length,
    completed: data.filter((d) => d.completionStatus === 'COMPLETED').length,
    overdue: data.filter((d) => d.completionStatus === 'OVERDUE').length,
    avgCompletion: data.length > 0
      ? Math.round(data.reduce((a, d) => a + d.completionPercentage, 0) / data.length)
      : 0,
  };
  success(res, { report: data, summary });
}));

// ── GET /api/reports/diversity ────────────────────────────────────────────────
router.get('/diversity', asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.departmentId) where.departmentId = req.query.departmentId;
  if (req.query.year)  where.year  = parseInt(req.query.year);

  const data = await prisma.diversityMetric.findMany({
    where,
    include: { department: { select: { name: true } } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
  success(res, { report: data, count: data.length });
}));

// ── GET /api/reports/social-score ─────────────────────────────────────────────
router.get('/social-score', asyncHandler(async (_req, res) => {
  const [participationRate, trainingRate, diversityScore] = await Promise.all([
    prisma.employeeParticipation.count({ where: { approvalStatus: 'APPROVED' } })
      .then(async (approved) => {
        const total = await prisma.user.count({ where: { isActive: true } });
        return total > 0 ? Math.round((approved / total) * 100) : 0;
      }),
    prisma.trainingCompletion.count({ where: { completionStatus: 'COMPLETED' } })
      .then(async (completed) => {
        const total = await prisma.trainingCompletion.count();
        return total > 0 ? Math.round((completed / total) * 100) : 0;
      }),
    prisma.diversityMetric.aggregate({ _avg: { diversityScore: true } })
      .then((r) => Math.round((r._avg.diversityScore || 0) * 10) / 10),
  ]);

  const socialScore = Math.round(participationRate * 0.3 + trainingRate * 0.3 + diversityScore * 0.4);
  success(res, { report: { participationRate, trainingRate, diversityScore, socialScore } });
}));

module.exports = router;
