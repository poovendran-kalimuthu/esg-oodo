const express = require('express');
const router  = express.Router();
const { protect } = require('../../middleware/auth');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { success } = require('../../shared/utils/apiResponse');
const gamificationService = require('./gamification.service');
const prisma = require('../../config/database');

router.use(protect);

router.get('/leaderboard', asyncHandler(async (req, res) => {
  const data = await gamificationService.getLeaderboard(req.query);
  success(res, { leaderboard: data });
}));

router.get('/my-xp', asyncHandler(async (req, res) => {
  const data = await gamificationService.getMyXP(req.user.id);
  success(res, data);
}));

router.get('/badges', asyncHandler(async (_req, res) => {
  const badges = await prisma.badge.findMany({ orderBy: { triggerThreshold: 'asc' } });
  success(res, { badges });
}));

router.get('/my-badges', asyncHandler(async (req, res) => {
  const badges = await prisma.userBadge.findMany({
    where: { userId: req.user.id },
    include: { badge: true },
    orderBy: { awardedAt: 'desc' },
  });
  success(res, { badges });
}));

module.exports = router;
