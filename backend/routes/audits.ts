import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import { AuditStatus } from '@prisma/client';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.js';
import { formatAudit } from '../utils/formatters.js';

const router = Router();

router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { status, type } = req.query;
    const whereClause: any = {};

    if (status) {
      whereClause.status = status as AuditStatus;
    }
    if (type) {
      whereClause.auditType = type as string;
    }

    if (req.user?.role === 'DEPARTMENT_HEAD' && req.user.departmentId) {
      whereClause.departmentId = req.user.departmentId;
    }

    if (req.user?.role === 'EMPLOYEE' && req.user.departmentId) {
      whereClause.departmentId = req.user.departmentId;
    }

    const audits = await prisma.audit.findMany({
      where: whereClause,
      include: {
        department: { select: { id: true, name: true } },
        auditor: { select: { id: true, name: true, email: true } },
        _count: { select: { findings: true } }
      },
      orderBy: { auditDate: 'asc' }
    });

    res.json({
      success: true,
      audits: audits.map(formatAudit)
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const audit = await prisma.audit.findFirst({
      where: {
        OR: [
          { auditId: id },
          { id: id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/) ? id : '00000000-0000-0000-0000-000000000000' }
        ]
      },
      include: {
        department: true,
        auditor: { select: { id: true, name: true, email: true } },
        findings: {
          include: {
            owner: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    if (!audit) {
      return res.status(404).json({ success: false, message: 'Audit not found' });
    }

    const mappedFindings = audit.findings.map(f => ({
      ...f,
      id: f.findingId,
      uuid: f.id
    }));

    res.json({
      success: true,
      audit: {
        ...formatAudit(audit),
        findings: mappedFindings
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, authorize(['ADMIN', 'COMPLIANCE_OFFICER', 'AUDITOR']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id, title, auditType, departmentId, auditorId, scheduledDate } = req.body;

  try {
    if (!id || !title || !auditType || !departmentId || !auditorId || !scheduledDate) {
      return res.status(400).json({ success: false, message: 'All fields are required to schedule an audit' });
    }

    const existing = await prisma.audit.findUnique({ where: { auditId: id } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Audit with ID ${id} already exists.` });
    }

    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) {
      return res.status(400).json({ success: false, message: 'Department not found' });
    }

    const auditor = await prisma.user.findUnique({ where: { id: auditorId } });
    if (!auditor) {
      return res.status(400).json({ success: false, message: 'Auditor not found' });
    }

    const audit = await prisma.audit.create({
      data: {
        auditId: id,
        auditTitle: title,
        auditType,
        departmentId,
        auditorId,
        auditDate: new Date(scheduledDate),
        status: AuditStatus.SCHEDULED
      }
    });

    await prisma.notification.create({
      data: {
        userId: auditorId,
        title: 'New Audit Assigned',
        message: `You have been assigned as the auditor for audit '${title}' scheduled on ${new Date(scheduledDate).toLocaleDateString()}.`
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user?.id,
        action: 'AUDIT_SCHEDULE',
        details: `Scheduled audit ${id} for department ${dept.name}`,
        ipAddress: req.ip || '127.0.0.1'
      }
    });

    res.status(201).json({
      success: true,
      audit: formatAudit(audit)
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', authenticate, authorize(['ADMIN', 'COMPLIANCE_OFFICER', 'AUDITOR']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const audit = await prisma.audit.findFirst({
      where: {
        OR: [
          { auditId: id },
          { id: id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/) ? id : '00000000-0000-0000-0000-000000000000' }
        ]
      },
      include: { findings: true }
    });

    if (!audit) return res.status(404).json({ success: false, message: 'Audit not found' });

    if (!Object.values(AuditStatus).includes(status as AuditStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid audit status transition' });
    }

    const currentStatus = audit.status;
    const nextStatus = status as AuditStatus;

    if (currentStatus === AuditStatus.CLOSED) {
      return res.status(400).json({ success: false, message: 'Closed audits cannot be updated' });
    }

    let updateData: any = { status: nextStatus };

    if (nextStatus === AuditStatus.COMPLETED && currentStatus !== AuditStatus.COMPLETED) {
      updateData.completionDate = new Date();
    }

    if (updateData.completionDate && updateData.completionDate < audit.auditDate) {
      return res.status(400).json({ success: false, message: 'Completion date cannot precede audit scheduled date' });
    }

    const updated = await prisma.audit.update({
      where: { id: audit.id },
      data: updateData
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user?.id,
        action: 'AUDIT_STATUS_CHANGE',
        details: `Changed audit ${audit.auditId} status from ${currentStatus} to ${nextStatus}`,
        ipAddress: req.ip || '127.0.0.1'
      }
    });

    res.json({
      success: true,
      audit: formatAudit(updated)
    });
  } catch (err) {
    next(err);
  }
});

export default router;
