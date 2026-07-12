import { Router, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import { PolicyStatus } from '@prisma/client';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.js';
import { formatPolicy } from '../utils/formatters.js';
import { awardPoints, checkPolicyBadges } from './gamification.js';

const router = Router();

router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { status, category } = req.query;
    const whereClause: any = {};

    if (status) {
      whereClause.status = status as PolicyStatus;
    }
    if (category) {
      whereClause.category = category as string;
    }

    const userRole = req.user?.role;
    if (userRole === 'EMPLOYEE') {
      whereClause.status = PolicyStatus.PUBLISHED;
      whereClause.OR = [
        { departmentId: null },
        { departmentId: req.user?.departmentId }
      ];
    }

    const policies = await prisma.policy.findMany({
      where: whereClause,
      include: {
        department: { select: { id: true, name: true } },
        acknowledgements: {
          where: userRole === 'EMPLOYEE' ? { employeeId: req.user?.id } : undefined
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({
      success: true,
      policies: policies.map(formatPolicy)
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const policy = await prisma.policy.findFirst({
      where: {
        OR: [
          { policyId: id },
          { id: id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/) ? id : '00000000-0000-0000-0000-000000000000' }
        ]
      },
      include: {
        department: true,
        versions: { orderBy: { versionNumber: 'desc' } },
        acknowledgements: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true
              }
            }
          }
        }
      }
    });

    if (!policy) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }

    res.json({
      success: true,
      policy: formatPolicy(policy)
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, authorize(['ADMIN', 'COMPLIANCE_OFFICER']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id, title, category, description, effectiveDate, expiryDate, departmentId } = req.body;

  try {
    if (!id || !title || !category || !description || !effectiveDate || !expiryDate) {
      return res.status(400).json({ success: false, message: 'Missing required policy fields' });
    }

    const existing = await prisma.policy.findUnique({ where: { policyId: id } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Policy with ID ${id} already exists.` });
    }

    const effDate = new Date(effectiveDate);
    const expDate = new Date(expiryDate);
    const now = new Date();

    const yesterday = new Date(now.setDate(now.getDate() - 1));
    if (effDate < yesterday) {
      return res.status(400).json({ success: false, message: 'Effective date cannot be in the past' });
    }

    if (expDate <= effDate) {
      return res.status(400).json({ success: false, message: 'Expiry date must be greater than the effective date' });
    }

    const policy = await prisma.policy.create({
      data: {
        policyId: id,
        title,
        category,
        description,
        effectiveDate: effDate,
        expiryDate: expDate,
        departmentId: departmentId || null,
        status: PolicyStatus.DRAFT,
        version: 1
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user?.id,
        action: 'POLICY_CREATE',
        details: `Created policy ${id} (${title})`,
        ipAddress: req.ip || '127.0.0.1'
      }
    });

    res.status(201).json({
      success: true,
      policy: formatPolicy(policy)
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, authorize(['ADMIN', 'COMPLIANCE_OFFICER']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { title, category, description, effectiveDate, expiryDate, departmentId, status } = req.body;

  try {
    const policy = await prisma.policy.findFirst({
      where: {
        OR: [
          { policyId: id },
          { id: id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/) ? id : '00000000-0000-0000-0000-000000000000' }
        ]
      }
    });

    if (!policy) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }

    if (policy.status === PolicyStatus.ARCHIVED) {
      return res.status(400).json({ success: false, message: 'Archived policies cannot be modified' });
    }

    const effDate = effectiveDate ? new Date(effectiveDate) : policy.effectiveDate;
    const expDate = expiryDate ? new Date(expiryDate) : policy.expiryDate;

    if (effDate && expDate && expDate <= effDate) {
      return res.status(400).json({ success: false, message: 'Expiry date must be greater than the effective date' });
    }

    let updateData: any = {
      title,
      category,
      description,
      effectiveDate: effDate,
      expiryDate: expDate,
      departmentId: departmentId || null,
    };

    if (status && status !== policy.status) {
      updateData.status = status as PolicyStatus;
    }

    if (policy.status === PolicyStatus.PUBLISHED) {
      await prisma.policyVersion.create({
        data: {
          policyId: policy.id,
          versionNumber: policy.version,
          title: policy.title,
          description: policy.description,
          status: policy.status,
        }
      });
      updateData.version = policy.version + 1;
    }

    const updatedPolicy = await prisma.policy.update({
      where: { id: policy.id },
      data: updateData
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user?.id,
        action: 'POLICY_UPDATE',
        details: `Updated policy ${policy.policyId}. New version: ${updatedPolicy.version}`,
        ipAddress: req.ip || '127.0.0.1'
      }
    });

    res.json({
      success: true,
      policy: formatPolicy(updatedPolicy)
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/publish', authenticate, authorize(['ADMIN', 'COMPLIANCE_OFFICER']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const policy = await prisma.policy.findFirst({
      where: {
        OR: [
          { policyId: id },
          { id: id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/) ? id : '00000000-0000-0000-0000-000000000000' }
        ]
      }
    });

    if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });

    if (policy.status === PolicyStatus.PUBLISHED) {
      return res.status(400).json({ success: false, message: 'Policy is already published' });
    }

    const updated = await prisma.policy.update({
      where: { id: policy.id },
      data: { status: PolicyStatus.PUBLISHED }
    });

    await prisma.policyVersion.create({
      data: {
        policyId: updated.id,
        versionNumber: updated.version,
        title: updated.title,
        description: updated.description,
        status: PolicyStatus.PUBLISHED,
      }
    });

    const userFilter = updated.departmentId ? { departmentId: updated.departmentId } : {};
    const targetUsers = await prisma.user.findMany({ where: userFilter });

    await prisma.notification.createMany({
      data: targetUsers.map(user => ({
        userId: user.id,
        title: 'New Policy Published',
        message: `Policy '${updated.title}' has been published and requires your acknowledgement.`,
      }))
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user?.id,
        action: 'POLICY_PUBLISH',
        details: `Published policy ${policy.policyId}`,
        ipAddress: req.ip || '127.0.0.1'
      }
    });

    res.json({
      success: true,
      policy: formatPolicy(updated)
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/archive', authenticate, authorize(['ADMIN', 'COMPLIANCE_OFFICER']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const policy = await prisma.policy.findFirst({
      where: {
        OR: [
          { policyId: id },
          { id: id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/) ? id : '00000000-0000-0000-0000-000000000000' }
        ]
      }
    });

    if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });

    const updated = await prisma.policy.update({
      where: { id: policy.id },
      data: { status: PolicyStatus.ARCHIVED }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user?.id,
        action: 'POLICY_ARCHIVE',
        details: `Archived policy ${policy.policyId}`,
        ipAddress: req.ip || '127.0.0.1'
      }
    });

    res.json({
      success: true,
      policy: formatPolicy(updated)
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/acknowledge', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { versionNumber } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ success: false, message: 'User unauthorized' });
  if (!versionNumber) return res.status(400).json({ success: false, message: 'Version number is required' });

  try {
    const policy = await prisma.policy.findFirst({
      where: {
        OR: [
          { policyId: id },
          { id: id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/) ? id : '00000000-0000-0000-0000-000000000000' }
        ]
      }
    });

    if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });

    if (policy.status !== PolicyStatus.PUBLISHED) {
      return res.status(400).json({ success: false, message: 'Only published policies can be acknowledged' });
    }

    const ack = await prisma.policyAcknowledgement.upsert({
      where: {
        employeeId_policyId_policyVersion: {
          employeeId: userId,
          policyId: policy.id,
          policyVersion: Number(versionNumber)
        }
      },
      update: {
        acknowledgedAt: new Date(),
        ipAddress: req.ip || '127.0.0.1',
        deviceInfo: req.headers['user-agent'] || 'Unknown Device'
      },
      create: {
        employeeId: userId,
        policyId: policy.id,
        policyVersion: Number(versionNumber),
        ipAddress: req.ip || '127.0.0.1',
        deviceInfo: req.headers['user-agent'] || 'Unknown Device'
      }
    });

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'POLICY_ACKNOWLEDGE',
        details: `Acknowledged policy ${policy.policyId} v${versionNumber}`,
        ipAddress: req.ip || '127.0.0.1'
      }
    });

    // Gamification: award XP and update district governance score
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { departmentId: true } });
    if (user?.departmentId) {
      await awardPoints(userId, user.departmentId, 'governance', 'policy_acknowledgement');
      await checkPolicyBadges(userId);
    }

    res.json({ success: true, acknowledgement: ack });
  } catch (err) {
    next(err);
  }
});

router.get('/history/metrics', authenticate, authorize(['ADMIN', 'COMPLIANCE_OFFICER']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const totalEmployees = await prisma.user.count({
      where: { role: { name: 'EMPLOYEE' } }
    });
    const publishedPolicies = await prisma.policy.findMany({
      where: { status: PolicyStatus.PUBLISHED }
    });

    const totalPublishedCount = publishedPolicies.length;
    const possibleAcks = totalEmployees * totalPublishedCount;

    let complianceRate = 100;
    const ackMetricsByDepartment: any[] = [];

    if (possibleAcks > 0) {
      const activeAcks = await prisma.policyAcknowledgement.count({
        where: {
          policy: { status: PolicyStatus.PUBLISHED }
        }
      });
      complianceRate = Math.round((activeAcks / possibleAcks) * 100);
    }

    const departments = await prisma.department.findMany({
      include: {
        users: { where: { role: { name: 'EMPLOYEE' } } }
      }
    });

    for (const dept of departments) {
      const deptEmployeesCount = dept.users.length;
      if (deptEmployeesCount === 0) {
        ackMetricsByDepartment.push({
          departmentId: dept.id,
          departmentName: dept.name,
          complianceRate: 100
        });
        continue;
      }

      const deptTargetPolicies = await prisma.policy.findMany({
        where: {
          status: PolicyStatus.PUBLISHED,
          OR: [
            { departmentId: null },
            { departmentId: dept.id }
          ]
        }
      });

      const deptPossibleAcks = deptEmployeesCount * deptTargetPolicies.length;
      if (deptPossibleAcks === 0) {
        ackMetricsByDepartment.push({
          departmentId: dept.id,
          departmentName: dept.name,
          complianceRate: 100
        });
        continue;
      }

      const employeeIds = dept.users.map(u => u.id);
      const policyIds = deptTargetPolicies.map(p => p.id);

      const deptActualAcks = await prisma.policyAcknowledgement.count({
        where: {
          employeeId: { in: employeeIds },
          policyId: { in: policyIds }
        }
      });

      const deptComplianceRate = Math.round((deptActualAcks / deptPossibleAcks) * 100);
      ackMetricsByDepartment.push({
        departmentId: dept.id,
        departmentName: dept.name,
        complianceRate: Math.min(deptComplianceRate, 100)
      });
    }

    res.json({
      success: true,
      overallComplianceRate: Math.min(complianceRate, 100),
      departmentMetrics: ackMetricsByDepartment
    });
  } catch (err) {
    next(err);
  }
});

export default router;
