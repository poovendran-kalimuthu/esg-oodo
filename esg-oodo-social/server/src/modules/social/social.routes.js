const express = require('express');
const router  = express.Router();
const prisma  = require('../../config/database');
const { protect } = require('../../middleware/auth');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { success } = require('../../shared/utils/apiResponse');

router.use(protect);

// ── GET /api/social/dashboard ─────────────────────────────────────────────────
router.get('/dashboard', asyncHandler(async (req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalCSR, activeCSR, totalParticipants, totalVolHoursResult,
    totalUsers, approvedParticipations,
    completedTrainings, totalTrainings,
    avgDiversityScore,
    recentFeedback,
  ] = await Promise.all([
    prisma.cSRActivity.count({ where: { deletedAt: null } }),
    prisma.cSRActivity.count({ where: { status: { in: ['PUBLISHED', 'ONGOING'] }, deletedAt: null } }),
    prisma.employeeParticipation.count({ where: { approvalStatus: 'APPROVED' } }),
    prisma.employeeParticipation.aggregate({ _sum: { volunteerHours: true }, where: { approvalStatus: 'APPROVED' } }),
    prisma.user.count({ where: { isActive: true, deletedAt: null } }),
    prisma.employeeParticipation.count({ where: { approvalStatus: 'APPROVED' } }),
    prisma.trainingCompletion.count({ where: { completionStatus: 'COMPLETED' } }),
    prisma.trainingCompletion.count(),
    prisma.diversityMetric.aggregate({ _avg: { diversityScore: true } }),
    prisma.feedback.count({ where: { createdAt: { gte: monthStart } } }),
  ]);

  const participationRate = totalUsers > 0 ? Math.round((approvedParticipations / totalUsers) * 100) : 0;
  const trainingCompletionPct = totalTrainings > 0 ? Math.round((completedTrainings / totalTrainings) * 100) : 0;
  const diversityScore = Math.round((avgDiversityScore._avg.diversityScore || 0) * 10) / 10;

  // Social Score — weighted composite
  const socialScore = Math.round(
    participationRate * 0.3 + trainingCompletionPct * 0.3 + diversityScore * 0.4
  );

  success(res, {
    cards: {
      totalCSRActivities: totalCSR,
      activeCSREvents: activeCSR,
      employeesParticipated: totalParticipants,
      volunteerHours: totalVolHoursResult._sum.volunteerHours || 0,
      participationRate,
      trainingCompletionPct,
      diversityScore,
      recentFeedback,
      socialScore,
    },
  });
}));

// ── GET /api/social/charts/participation ──────────────────────────────────────
router.get('/charts/participation', asyncHandler(async (_req, res) => {
  // Monthly participation for last 6 months
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return { year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString('default', { month: 'short', year: '2-digit' }) };
  });

  const data = await Promise.all(months.map(async ({ year, month, label }) => {
    const from = new Date(year, month - 1, 1);
    const to   = new Date(year, month, 0, 23, 59, 59);
    const count = await prisma.employeeParticipation.count({
      where: { registrationDate: { gte: from, lte: to } },
    });
    return { month: label, participants: count };
  }));

  success(res, { data });
}));

// ── GET /api/social/charts/departments ────────────────────────────────────────
router.get('/charts/departments', asyncHandler(async (_req, res) => {
  const departments = await prisma.department.findMany({
    include: {
      _count: {
        select: {
          participations: { where: { approvalStatus: 'APPROVED' } },
        },
      },
    },
  });

  const data = departments.map((d) => ({
    department: d.name,
    participants: d._count.participations,
  }));
  success(res, { data });
}));

// ── GET /api/social/charts/volunteer ──────────────────────────────────────────
router.get('/charts/volunteer', asyncHandler(async (_req, res) => {
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return { year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString('default', { month: 'short' }) };
  });

  const data = await Promise.all(months.map(async ({ year, month, label }) => {
    const from = new Date(year, month - 1, 1);
    const to   = new Date(year, month, 0, 23, 59, 59);
    const result = await prisma.employeeParticipation.aggregate({
      where: { completionDate: { gte: from, lte: to }, approvalStatus: 'APPROVED' },
      _sum: { volunteerHours: true },
    });
    return { month: label, hours: result._sum.volunteerHours || 0 };
  }));
  success(res, { data });
}));

// ── GET /api/social/charts/diversity ──────────────────────────────────────────
router.get('/charts/diversity', asyncHandler(async (_req, res) => {
  const result = await prisma.diversityMetric.aggregate({
    _sum: { maleCount: true, femaleCount: true, otherGenderCount: true },
  });
  const { maleCount = 0, femaleCount = 0, otherGenderCount = 0 } = result._sum;
  success(res, {
    data: [
      { name: 'Male', value: maleCount },
      { name: 'Female', value: femaleCount },
      { name: 'Other', value: otherGenderCount },
    ],
  });
}));

// ── GET /api/social/charts/training ───────────────────────────────────────────
router.get('/charts/training', asyncHandler(async (_req, res) => {
  const [completed, inProgress, notStarted, overdue] = await Promise.all([
    prisma.trainingCompletion.count({ where: { completionStatus: 'COMPLETED' } }),
    prisma.trainingCompletion.count({ where: { completionStatus: 'IN_PROGRESS' } }),
    prisma.trainingCompletion.count({ where: { completionStatus: 'NOT_STARTED' } }),
    prisma.trainingCompletion.count({ where: { completionStatus: 'OVERDUE' } }),
  ]);
  success(res, {
    data: [
      { name: 'Completed', value: completed, fill: '#22c55e' },
      { name: 'In Progress', value: inProgress, fill: '#3b82f6' },
      { name: 'Not Started', value: notStarted, fill: '#94a3b8' },
      { name: 'Overdue', value: overdue, fill: '#ef4444' },
    ],
  });
}));

// ── GET /api/social/upcoming ──────────────────────────────────────────────────
router.get('/upcoming', asyncHandler(async (_req, res) => {
  const activities = await prisma.cSRActivity.findMany({
    where: { status: 'PUBLISHED', eventDate: { gte: new Date() }, deletedAt: null },
    orderBy: { eventDate: 'asc' },
    take: 5,
    include: {
      category: { select: { name: true } },
      _count: { select: { participations: true } },
    },
  });
  success(res, { activities });
}));

// ── GET /api/social/recent ────────────────────────────────────────────────────
router.get('/recent', asyncHandler(async (_req, res) => {
  const [participations, trainings, feedbacks] = await Promise.all([
    prisma.employeeParticipation.findMany({
      take: 5, orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        csrActivity: { select: { title: true } },
      },
    }),
    prisma.trainingCompletion.findMany({
      where: { completionStatus: 'COMPLETED' },
      take: 5, orderBy: { completionDate: 'desc' },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        training: { select: { name: true } },
      },
    }),
    prisma.feedback.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
  ]);
  success(res, { participations, trainings, feedbacks });
}));

module.exports = router;
