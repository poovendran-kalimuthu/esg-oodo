import { Router, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// ─── Point values per activity type ───────────────────────────────────────────
export const POINT_MAP: Record<string, number> = {
  // Environmental
  carbon_reduction: 20,
  recycling_activity: 15,
  energy_saving: 25,
  sustainability_goal_completed: 100,
  // Governance
  policy_acknowledgement: 10,
  governance_training: 20,
  audit_participation: 25,
  compliance_resolution: 50,
  critical_finding_resolved: 100,
  // Social
  csr_participation: 30,
  volunteer_event: 25,
  training_completion: 20,
  mentoring_session: 15,
};

// ─── District level thresholds ────────────────────────────────────────────────
function getDistrictLevel(score: number): { level: number; title: string } {
  if (score >= 81) return { level: 5, title: 'Sustainability Citadel' };
  if (score >= 61) return { level: 4, title: 'Innovation Tower' };
  if (score >= 41) return { level: 3, title: 'Learning Center' };
  if (score >= 21) return { level: 2, title: 'Community Hub' };
  return { level: 1, title: 'Eco Garden' };
}

// ─── Core helper: award XP to an employee and update their district ────────────
export async function awardPoints(
  employeeId: string,
  departmentId: string,
  module: 'environmental' | 'governance' | 'social',
  activityType: string,
  points?: number
) {
  const xp = points ?? POINT_MAP[activityType] ?? 0;
  if (xp <= 0) return;

  // 1. Log the points
  await prisma.employeePoints.create({
    data: { employeeId, departmentId, module, activityType, points: xp }
  });

  // 2. Update streak and check badges
  await updateStreak(employeeId);

  // 3. Recalculate district ESG score
  await recalculateDistrict(departmentId);
}

// ─── Streak logic ──────────────────────────────────────────────────────────────
async function updateStreak(employeeId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const streak = await prisma.employeeStreak.findUnique({ where: { employeeId } });

  if (!streak) {
    await prisma.employeeStreak.create({
      data: { employeeId, currentStreak: 1, longestStreak: 1, lastActivityDate: today }
    });
    await checkBadges(employeeId, 1);
    return;
  }

  const last = streak.lastActivityDate ? new Date(streak.lastActivityDate) : null;
  if (last) last.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  let newStreak = streak.currentStreak;

  if (last && last.getTime() === today.getTime()) {
    // Already logged today, no change needed
    return;
  } else if (last && last.getTime() === yesterday.getTime()) {
    // Consecutive day
    newStreak = streak.currentStreak + 1;
  } else {
    // Gap — reset streak
    newStreak = 1;
  }

  const longest = Math.max(newStreak, streak.longestStreak);

  await prisma.employeeStreak.update({
    where: { employeeId },
    data: { currentStreak: newStreak, longestStreak: longest, lastActivityDate: today }
  });

  await checkBadges(employeeId, newStreak);
}

// ─── Badge logic ───────────────────────────────────────────────────────────────
async function checkBadges(employeeId: string, streakDays: number) {
  const milestones = [
    { days: 7, name: 'Explorer Badge' },
    { days: 30, name: 'Guardian Badge' },
    { days: 60, name: 'Champion Badge' },
    { days: 100, name: 'Legend Badge' },
  ];

  for (const m of milestones) {
    if (streakDays >= m.days) {
      await prisma.employeeBadge.upsert({
        where: { employeeId_badgeName: { employeeId, badgeName: m.name } },
        update: {},
        create: { employeeId, badgeName: m.name }
      });
    }
  }
}

// ─── Policy acknowledgement badge logic ────────────────────────────────────────
export async function checkPolicyBadges(employeeId: string) {
  const count = await prisma.policyAcknowledgement.count({ where: { employeeId } });

  const milestones = [
    { count: 5, name: 'Policy Explorer' },
    { count: 20, name: 'Compliance Guardian' },
    { count: 50, name: 'Governance Champion' },
    { count: 100, name: 'Policy Legend' },
  ];

  for (const m of milestones) {
    if (count >= m.count) {
      await prisma.employeeBadge.upsert({
        where: { employeeId_badgeName: { employeeId, badgeName: m.name } },
        update: {},
        create: { employeeId, badgeName: m.name }
      });
    }
  }
}

// ─── District ESG score recalculation ─────────────────────────────────────────
export async function recalculateDistrict(departmentId: string) {
  // Sum XP per module for this department
  const points = await prisma.employeePoints.groupBy({
    by: ['module'],
    where: { departmentId },
    _sum: { points: true }
  });

  const xpMap: Record<string, number> = { environmental: 0, governance: 0, social: 0 };
  for (const p of points) {
    xpMap[p.module] = p._sum.points ?? 0;
  }

  // Normalize to 0–100 using 1000 XP per module = 100 score
  const MAX_XP = 1000;
  const envScore = Math.min(100, (xpMap.environmental / MAX_XP) * 100);
  const govScore = Math.min(100, (xpMap.governance / MAX_XP) * 100);
  const socScore = Math.min(100, (xpMap.social / MAX_XP) * 100);

  const overall = Math.min(100,
    (envScore * 0.4) + (socScore * 0.3) + (govScore * 0.3)
  );

  const { level, title } = getDistrictLevel(overall);

  await prisma.districtScore.upsert({
    where: { departmentId },
    update: {
      environmentScore: Math.round(envScore * 10) / 10,
      socialScore: Math.round(socScore * 10) / 10,
      governanceScore: Math.round(govScore * 10) / 10,
      overallScore: Math.round(overall * 10) / 10,
      districtLevel: level,
      districtTitle: title
    },
    create: {
      departmentId,
      environmentScore: Math.round(envScore * 10) / 10,
      socialScore: Math.round(socScore * 10) / 10,
      governanceScore: Math.round(govScore * 10) / 10,
      overallScore: Math.round(overall * 10) / 10,
      districtLevel: level,
      districtTitle: title
    }
  });
}

// ─── GET /gamification/leaderboard ────────────────────────────────────────────
router.get('/leaderboard', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const districts = await prisma.districtScore.findMany({
      include: { department: { select: { name: true } } },
      orderBy: { overallScore: 'desc' }
    });

    const leaderboard = districts.map((d, i) => ({
      rank: i + 1,
      departmentId: d.departmentId,
      districtName: `${d.department.name} District`,
      overallScore: d.overallScore,
      environmentScore: d.environmentScore,
      socialScore: d.socialScore,
      governanceScore: d.governanceScore,
      districtLevel: d.districtLevel,
      districtTitle: d.districtTitle
    }));

    // Top 3 employee XP leaders across all departments
    const topEmployees = await prisma.employeePoints.groupBy({
      by: ['employeeId'],
      _sum: { points: true },
      orderBy: { _sum: { points: 'desc' } },
      take: 10
    });

    const empIds = topEmployees.map(e => e.employeeId);
    const users = await prisma.user.findMany({
      where: { id: { in: empIds } },
      include: { department: { select: { name: true } } }
    });

    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const topEmployeesList = topEmployees.map((e, i) => {
      const u = userMap[e.employeeId];
      return {
        rank: i + 1,
        employeeId: e.employeeId,
        name: u?.name || 'Unknown',
        department: u?.department?.name || '—',
        totalXP: e._sum.points ?? 0
      };
    });

    res.json({ success: true, leaderboard, topEmployees: topEmployeesList });
  } catch (err) {
    next(err);
  }
});

// ─── GET /gamification/districts ──────────────────────────────────────────────
router.get('/districts', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const districts = await prisma.districtScore.findMany({
      include: { department: { select: { id: true, name: true } } },
      orderBy: { overallScore: 'desc' }
    });

    // For each district, get top 3 employees by XP
    const result = await Promise.all(districts.map(async (d, i) => {
      const topContributors = await prisma.employeePoints.groupBy({
        by: ['employeeId'],
        where: { departmentId: d.departmentId },
        _sum: { points: true },
        orderBy: { _sum: { points: 'desc' } },
        take: 3
      });

      const empIds = topContributors.map(e => e.employeeId);
      const users = await prisma.user.findMany({
        where: { id: { in: empIds } },
        select: { id: true, name: true }
      });
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));

      const contributors = topContributors.map((e, rank) => ({
        rank: rank + 1,
        name: userMap[e.employeeId]?.name || 'Unknown',
        xp: e._sum.points ?? 0
      }));

      return {
        rank: i + 1,
        departmentId: d.departmentId,
        districtName: `${d.department.name} District`,
        overallScore: d.overallScore,
        environmentScore: d.environmentScore,
        socialScore: d.socialScore,
        governanceScore: d.governanceScore,
        districtLevel: d.districtLevel,
        districtTitle: d.districtTitle,
        topContributors: contributors
      };
    }));

    res.json({ success: true, districts: result });
  } catch (err) {
    next(err);
  }
});

// ─── GET /gamification/streaks ─────────────────────────────────────────────────
router.get('/streaks', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    const myStreak = await prisma.employeeStreak.findUnique({ where: { employeeId: userId } });
    const myBadges = await prisma.employeeBadge.findMany({ where: { employeeId: userId } });

    const myXP = await prisma.employeePoints.aggregate({
      where: { employeeId: userId },
      _sum: { points: true }
    });

    res.json({
      success: true,
      streak: myStreak || { currentStreak: 0, longestStreak: 0, lastActivityDate: null },
      badges: myBadges,
      totalXP: myXP._sum.points ?? 0
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /gamification/badges ──────────────────────────────────────────────────
router.get('/badges', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const badges = await prisma.employeeBadge.findMany({
      where: { employeeId: userId },
      orderBy: { earnedAt: 'desc' }
    });

    res.json({ success: true, badges });
  } catch (err) {
    next(err);
  }
});

// ─── GET /gamification/awards ──────────────────────────────────────────────────
router.get('/awards', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const awards = await prisma.monthlyAward.findMany({
      where: { month: now.getMonth() + 1, year: now.getFullYear() },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ success: true, awards });
  } catch (err) {
    next(err);
  }
});

// ─── POST /gamification/activity ───────────────────────────────────────────────
router.post('/activity', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { module, activityType, points } = req.body;
  const userId = req.user?.id;
  const deptId = req.user?.departmentId;

  if (!userId || !deptId) {
    return res.status(400).json({ success: false, message: 'User must belong to a department' });
  }

  const validModules = ['environmental', 'governance', 'social'];
  if (!module || !validModules.includes(module)) {
    return res.status(400).json({ success: false, message: 'Invalid module. Must be environmental, governance, or social' });
  }

  const xp = points ?? POINT_MAP[activityType] ?? 0;
  if (xp <= 0) {
    return res.status(400).json({ success: false, message: 'Points must be greater than 0' });
  }

  try {
    await awardPoints(userId, deptId, module, activityType, xp);
    res.json({ success: true, message: `+${xp} XP awarded for ${activityType}` });
  } catch (err) {
    next(err);
  }
});

// ─── POST /gamification/redeem (stub — no real redemption logic) ───────────────
router.post('/redeem', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { rewardName } = req.body;
  const userId = req.user?.id;

  try {
    const reward = await prisma.rewardCatalog.findFirst({ where: { rewardName } });
    if (!reward) return res.status(404).json({ success: false, message: 'Reward not found in catalog' });

    const myXP = await prisma.employeePoints.aggregate({
      where: { employeeId: userId },
      _sum: { points: true }
    });

    const totalXP = myXP._sum.points ?? 0;

    if (totalXP < reward.requiredPoints) {
      return res.status(400).json({
        success: false,
        message: `Insufficient XP. Need ${reward.requiredPoints} XP, you have ${totalXP} XP.`
      });
    }

    // No deduction — display only
    res.json({
      success: true,
      message: `Redemption request submitted for "${rewardName}". HR will process within 3 business days.`,
      reward
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /gamification/awards/reset (admin only) ─────────────────────────────
router.post('/awards/reset', authenticate, authorize(['ADMIN']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    await prisma.monthlyAward.deleteMany({
      where: { month: now.getMonth() + 1, year: now.getFullYear() }
    });
    res.json({ success: true, message: 'Monthly awards reset.' });
  } catch (err) {
    next(err);
  }
});

export default router;
