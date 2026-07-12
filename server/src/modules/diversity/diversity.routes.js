const express = require('express');
const router  = express.Router();
const prisma  = require('../../config/database');
const { protect, restrictTo } = require('../../middleware/auth');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { success, created } = require('../../shared/utils/apiResponse');
const { parsePagination } = require('../../shared/utils/pagination');

router.use(protect);

// ── GET /api/diversity ────────────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const { skip, take } = parsePagination(req.query);
  const where = {};
  if (req.query.departmentId) where.departmentId = req.query.departmentId;
  if (req.query.year)  where.year  = parseInt(req.query.year);
  if (req.query.month) where.month = parseInt(req.query.month);

  const data = await prisma.diversityMetric.findMany({
    where, skip, take,
    include: { department: { select: { name: true, code: true } } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
  success(res, { metrics: data });
}));

// ── GET /api/diversity/dashboard ──────────────────────────────────────────────
router.get('/dashboard', asyncHandler(async (req, res) => {
  const metrics = await prisma.diversityMetric.findMany({
    include: { department: { select: { name: true } } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  const latest = metrics.reduce((acc, m) => {
    const key = m.departmentId;
    if (!acc[key]) acc[key] = m;
    return acc;
  }, {});

  const deptMetrics = Object.values(latest);
  const totals = deptMetrics.reduce((acc, m) => ({
    total:   acc.total   + m.totalEmployees,
    male:    acc.male    + m.maleCount,
    female:  acc.female  + m.femaleCount,
    other:   acc.other   + m.otherGenderCount,
    disability: acc.disability + m.disabilityCount,
  }), { total: 0, male: 0, female: 0, other: 0, disability: 0 });

  const avgScore = deptMetrics.length > 0
    ? Math.round(deptMetrics.reduce((a, m) => a + m.diversityScore, 0) / deptMetrics.length * 10) / 10
    : 0;

  success(res, {
    overallScore: avgScore,
    genderSplit: { male: totals.male, female: totals.female, other: totals.other },
    disabilityCount: totals.disability,
    totalEmployees: totals.total,
    departmentMetrics: deptMetrics,
    timeSeriesData: metrics.slice(0, 24),
  });
}));

// ── GET /api/diversity/score ───────────────────────────────────────────────────
router.get('/score', asyncHandler(async (req, res) => {
  const result = await prisma.diversityMetric.aggregate({
    _avg: { diversityScore: true },
  });
  success(res, { score: Math.round((result._avg.diversityScore || 0) * 10) / 10 });
}));

// ── POST /api/diversity ───────────────────────────────────────────────────────
router.post('/', restrictTo('ADMIN', 'SUPERADMIN', 'MANAGER'), asyncHandler(async (req, res) => {
  const { departmentId, year, month, ...metrics } = req.body;

  // Calculate diversity score (simple formula)
  const total = metrics.totalEmployees || 1;
  const genderRatio = Math.min(metrics.femaleCount / total, metrics.maleCount / total) * 100;
  const disabilityRatio = (metrics.disabilityCount / total) * 100;
  const diversityScore = Math.round((genderRatio * 0.6 + disabilityRatio * 0.4) * 10) / 10;

  const record = await prisma.diversityMetric.upsert({
    where: { departmentId_year_month: { departmentId, year: parseInt(year), month: parseInt(month) } },
    update: { ...metrics, diversityScore },
    create: { departmentId, year: parseInt(year), month: parseInt(month), ...metrics, diversityScore },
  });
  created(res, { metric: record }, 'Diversity metric saved');
}));

module.exports = router;
