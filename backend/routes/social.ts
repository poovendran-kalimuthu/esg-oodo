import { Router, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { awardPoints } from './gamification.js';

const router = Router();

const ACTIVITY_TYPES = ['csr_participation', 'volunteer_event', 'training_completion', 'mentoring_session'];

// ─── GET /social/activities ────────────────────────────────────────────────────
router.get('/activities', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { type, department } = req.query;
    const where: any = {};

    if (type) where.activityType = type as string;
    if (department) where.departmentId = department as string;

    // Employees see only their activities
    if (req.user?.role === 'EMPLOYEE') {
      where.employeeId = req.user.id;
    }

    const activities = await prisma.socialActivity.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } }
      },
      orderBy: { date: 'desc' }
    });

    res.json({ success: true, activities });
  } catch (err) {
    next(err);
  }
});

// ─── GET /social/dashboard ────────────────────────────────────────────────────
router.get('/dashboard', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const totalActivities = await prisma.socialActivity.count({ where: { status: 'Completed' } });

    const byType = await prisma.socialActivity.groupBy({
      by: ['activityType'],
      _count: { activityType: true }
    });

    const totalHours = await prisma.socialActivity.aggregate({
      _sum: { hoursLogged: true },
      where: { status: 'Completed' }
    });

    const recentActivities = await prisma.socialActivity.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { select: { name: true } },
        department: { select: { name: true } }
      }
    });

    // Department participation counts
    const deptStats = await prisma.socialActivity.groupBy({
      by: ['departmentId'],
      _count: { id: true },
      _sum: { hoursLogged: true }
    });

    const deptIds = deptStats.map(d => d.departmentId);
    const departments = await prisma.department.findMany({
      where: { id: { in: deptIds } },
      select: { id: true, name: true }
    });
    const deptMap = Object.fromEntries(departments.map(d => [d.id, d.name]));

    const departmentBreakdown = deptStats.map(d => ({
      departmentId: d.departmentId,
      departmentName: deptMap[d.departmentId] || '—',
      activityCount: d._count.id,
      totalHours: d._sum.hoursLogged ?? 0
    }));

    res.json({
      success: true,
      summary: {
        totalActivities,
        totalHours: totalHours._sum.hoursLogged ?? 0,
        activityBreakdown: byType.map(b => ({ type: b.activityType, count: b._count.activityType }))
      },
      recentActivities: recentActivities.map(a => ({
        id: a.id,
        title: a.title,
        activityType: a.activityType,
        employeeName: a.employee.name,
        departmentName: a.department.name,
        hoursLogged: a.hoursLogged,
        date: a.date,
        status: a.status
      })),
      departmentBreakdown
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /social/activities ───────────────────────────────────────────────────
router.post('/activities', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { activityType, title, description, hoursLogged, date, departmentId } = req.body;
  const userId = req.user?.id;
  const deptId = departmentId || req.user?.departmentId;

  if (!userId || !deptId) {
    return res.status(400).json({ success: false, message: 'User must belong to a department' });
  }

  if (!activityType || !ACTIVITY_TYPES.includes(activityType)) {
    return res.status(400).json({
      success: false,
      message: `Invalid activity type. Must be one of: ${ACTIVITY_TYPES.join(', ')}`
    });
  }

  if (!title || title.trim().length < 3) {
    return res.status(400).json({ success: false, message: 'Title is required (min 3 characters)' });
  }

  if (!date) {
    return res.status(400).json({ success: false, message: 'Date is required' });
  }

  try {
    const isEmployee = req.user?.role === 'EMPLOYEE';
    const status = isEmployee ? 'Pending' : 'Completed';
    const pts = POINT_MAP[activityType] || 0;

    const activity = await prisma.socialActivity.create({
      data: {
        employeeId: userId,
        departmentId: deptId,
        activityType,
        title: title.trim(),
        description: description?.trim() || '',
        hoursLogged: Math.max(0.5, Number(hoursLogged) || 1),
        date: new Date(date),
        status,
        proofUrl: req.body.proofUrl || null,
        points: pts
      },
      include: {
        employee: { select: { name: true } },
        department: { select: { name: true } }
      }
    });

    // Award XP via gamification engine ONLY if Completed immediately
    if (status === 'Completed') {
      await awardPoints(userId, deptId, 'social', activityType, pts);
    }

    res.status(201).json({ success: true, activity });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /social/activities/:id ────────────────────────────────────────────
router.delete('/activities/:id', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const activity = await prisma.socialActivity.findUnique({ where: { id } });
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found' });

    if (activity.employeeId !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'You can only delete your own activities' });
    }

    await prisma.socialActivity.delete({ where: { id } });
    res.json({ success: true, message: 'Activity deleted' });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /social/activities/:id/status ──────────────────────────────────────────
router.patch('/activities/:id/status', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status, points } = req.body;

  try {
    const activity = await prisma.socialActivity.findUnique({ where: { id } });
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found' });

    // Allow COMPLIANCE_OFFICER, AUDITOR, ADMIN
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'COMPLIANCE_OFFICER' && req.user?.role !== 'AUDITOR') {
      return res.status(403).json({ success: false, message: 'Only compliance officers or auditors can approve activities' });
    }

    const updated = await prisma.socialActivity.update({
      where: { id },
      data: { status, points: points ? Number(points) : activity.points },
      include: {
        employee: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } }
      }
    });

    if (status === 'Completed') {
      await awardPoints(activity.employeeId, activity.departmentId, 'social', activity.activityType, points ?? activity.points);
    }

    res.json({ success: true, activity: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
