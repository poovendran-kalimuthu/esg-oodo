const prisma = require('../../config/database');

class GamificationService {
  /**
   * Award XP to a user and update their total
   */
  async awardXP(userId, xpAmount, reason, referenceId = null, referenceType = null) {
    await prisma.$transaction([
      prisma.xPHistory.create({ data: { userId, xpAmount, reason, referenceId, referenceType } }),
      prisma.user.update({ where: { id: userId }, data: { xpTotal: { increment: xpAmount } } }),
    ]);

    // Level up check (every 200 XP = 1 level)
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { xpTotal: true, level: true } });
    const newLevel = Math.floor(user.xpTotal / 200) + 1;
    if (newLevel > user.level) {
      await prisma.user.update({ where: { id: userId }, data: { level: newLevel } });
    }
  }

  /**
   * Check all badge conditions and award missing badges
   */
  async checkAndAwardBadges(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xpTotal: true, badges: { select: { badgeId: true } } },
    });

    const earnedBadgeIds = new Set(user.badges.map((b) => b.badgeId));
    const allBadges = await prisma.badge.findMany();

    for (const badge of allBadges) {
      if (earnedBadgeIds.has(badge.id)) continue;

      let qualifies = false;

      if (badge.triggerType === 'CSR_COUNT') {
        const count = await prisma.employeeParticipation.count({
          where: { userId, approvalStatus: 'APPROVED' },
        });
        qualifies = count >= badge.triggerThreshold;
      } else if (badge.triggerType === 'VOLUNTEER_HOURS') {
        const result = await prisma.employeeParticipation.aggregate({
          where: { userId, approvalStatus: 'APPROVED' },
          _sum: { volunteerHours: true },
        });
        qualifies = (result._sum.volunteerHours || 0) >= badge.triggerThreshold;
      } else if (badge.triggerType === 'FEEDBACK_COUNT') {
        const count = await prisma.feedback.count({ where: { submittedById: userId } });
        qualifies = count >= badge.triggerThreshold;
      } else if (badge.triggerType === 'TRAINING_COUNT') {
        const count = await prisma.trainingCompletion.count({
          where: { userId, completionStatus: 'COMPLETED' },
        });
        qualifies = count >= badge.triggerThreshold;
      } else if (badge.triggerType === 'XP_TOTAL') {
        qualifies = user.xpTotal >= badge.triggerThreshold;
      }

      if (qualifies) {
        await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
        if (badge.xpReward > 0) {
          await this.awardXP(userId, badge.xpReward, `Badge: ${badge.name}`, badge.id, 'Badge');
        }
      }
    }
  }

  async getLeaderboard({ period = 'monthly', scope = 'organization', departmentId }) {
    const now = new Date();
    let dateFrom;
    if (period === 'weekly') {
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'monthly') {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Use XPHistory for period-based, or User.xpTotal for all-time
    const users = await prisma.user.findMany({
      where: {
        isActive: true, deletedAt: null,
        ...(scope === 'department' && departmentId ? { departmentId } : {}),
      },
      select: {
        id: true, name: true, avatarUrl: true, level: true,
        xpTotal: true, departmentId: true,
        department: { select: { name: true } },
        badges: { include: { badge: { select: { name: true, iconUrl: true } } }, take: 3 },
        xpHistory: dateFrom ? {
          where: { createdAt: { gte: dateFrom } },
          select: { xpAmount: true },
        } : undefined,
      },
      orderBy: { xpTotal: 'desc' },
      take: 50,
    });

    return users.map((u, i) => ({
      rank: i + 1,
      id: u.id,
      name: u.name,
      avatarUrl: u.avatarUrl,
      level: u.level,
      department: u.department?.name,
      xpTotal: u.xpTotal,
      periodXP: u.xpHistory
        ? u.xpHistory.reduce((acc, h) => acc + h.xpAmount, 0)
        : u.xpTotal,
      badges: u.badges.map((ub) => ({ name: ub.badge.name, iconUrl: ub.badge.iconUrl })),
    }));
  }

  async getMyXP(userId) {
    const [user, history] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { xpTotal: true, level: true, badges: { include: { badge: true } } },
      }),
      prisma.xPHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);
    return { xpTotal: user.xpTotal, level: user.level, badges: user.badges, history };
  }
}

module.exports = new GamificationService();
