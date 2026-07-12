import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import { FindingStatus, Severity } from '@prisma/client';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.js';
import { formatFinding } from '../utils/formatters.js';
import { encrypt } from '../utils/crypto.js';
import { awardPoints } from './gamification.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { status, severity } = req.query;
    const whereClause: any = {};

    if (status) {
      whereClause.status = status as FindingStatus;
    }
    if (severity) {
      whereClause.severity = severity as Severity;
    }

    if (req.user?.role === 'DEPARTMENT_HEAD' && req.user.departmentId) {
      whereClause.audit = { departmentId: req.user.departmentId };
    }

    if (req.user?.role === 'EMPLOYEE') {
      whereClause.ownerId = req.user.id;
    }

    const findings = await prisma.auditFinding.findMany({
      where: whereClause,
      include: {
        audit: {
          include: {
            department: { select: { id: true, name: true } },
            auditor: { select: { id: true, name: true } }
          }
        },
        owner: { select: { id: true, name: true, email: true } },
        correctiveActions: {
          include: {
            owner: { select: { id: true, name: true } },
            verifier: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    res.json({
      success: true,
      findings: findings.map(formatFinding)
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const finding = await prisma.auditFinding.findFirst({
      where: {
        OR: [
          { findingId: id },
          { id: id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/) ? id : '00000000-0000-0000-0000-000000000000' }
        ]
      },
      include: {
        audit: {
          include: {
            department: true,
            auditor: true
          }
        },
        owner: { select: { id: true, name: true, email: true } },
        correctiveActions: {
          include: {
            owner: { select: { id: true, name: true } },
            verifier: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!finding) {
      return res.status(404).json({ success: false, message: 'Finding not found' });
    }

    res.json({
      success: true,
      finding: formatFinding(finding)
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, authorize(['ADMIN', 'COMPLIANCE_OFFICER', 'AUDITOR']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id, auditId, title, description, category, severity, ownerId, dueDate } = req.body;

  try {
    if (!id || !title || !category || !dueDate || !severity) {
      return res.status(400).json({ success: false, message: 'Missing required finding fields' });
    }

    const existing = await prisma.auditFinding.findUnique({ where: { findingId: id } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Finding with ID ${id} already exists.` });
    }

    const audit = await prisma.audit.findFirst({
      where: {
        OR: [
          { auditId: auditId },
          { id: auditId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/) ? auditId : '00000000-0000-0000-0000-000000000000' }
        ]
      }
    });

    if (!audit) {
      return res.status(400).json({ success: false, message: 'Associated audit not found' });
    }

    const fndDueDate = new Date(dueDate);
    if (fndDueDate < new Date(audit.auditDate)) {
      return res.status(400).json({ success: false, message: 'Due date cannot be earlier than the audit scheduled date' });
    }

    const targetSeverity = severity as Severity;
    if ((targetSeverity === 'HIGH' || targetSeverity === 'CRITICAL') && !ownerId) {
      return res.status(400).json({ success: false, message: 'Owner assignment is mandatory for HIGH and CRITICAL findings.' });
    }

    const initialStatus = ownerId ? FindingStatus.ASSIGNED : FindingStatus.OPEN;

    const finding = await prisma.auditFinding.create({
      data: {
        findingId: id,
        auditId: audit.id,
        title,
        description: encrypt(description || ''),
        category,
        severity: targetSeverity,
        ownerId: ownerId || null,
        dueDate: fndDueDate,
        status: initialStatus
      }
    });

    if (ownerId) {
      await prisma.correctiveAction.create({
        data: {
          findingId: finding.id,
          ownerId: ownerId,
          progressPercentage: 0,
          resolutionNotes: encrypt('Tracker created.')
        }
      });

      await prisma.notification.create({
        data: {
          userId: ownerId,
          title: 'Corrective Action Assigned',
          message: `Finding '${title}' has been assigned to you. Due date: ${fndDueDate.toLocaleDateString()}.`
        }
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user?.id,
        action: 'FINDING_CREATE',
        details: `Log finding ${id} under audit ${audit.auditId} (severity: ${targetSeverity})`,
        ipAddress: req.ip || '127.0.0.1'
      }
    });

    res.status(201).json({
      success: true,
      finding: formatFinding(finding)
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/assign', authenticate, authorize(['ADMIN', 'COMPLIANCE_OFFICER', 'AUDITOR']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { ownerId } = req.body;

  try {
    const finding = await prisma.auditFinding.findFirst({
      where: {
        OR: [
          { findingId: id },
          { id: id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/) ? id : '00000000-0000-0000-0000-000000000000' }
        ]
      }
    });

    if (!finding) return res.status(404).json({ success: false, message: 'Finding not found' });

    if (finding.status === FindingStatus.CLOSED) {
      return res.status(400).json({ success: false, message: 'Closed findings are immutable.' });
    }

    if (!ownerId) {
      return res.status(400).json({ success: false, message: 'Owner user ID is required' });
    }

    const updated = await prisma.auditFinding.update({
      where: { id: finding.id },
      data: {
        ownerId,
        status: FindingStatus.ASSIGNED
      }
    });

    const existingAction = await prisma.correctiveAction.findFirst({
      where: {findingId: finding.id, ownerId}
    });

    if (!existingAction) {
      await prisma.correctiveAction.create({
        data: {
          findingId: finding.id,
          ownerId,
          progressPercentage: 0,
          resolutionNotes: encrypt('Action initialized')
        }
      });
    }

    await prisma.notification.create({
      data: {
        userId: ownerId,
        title: 'Action Item Assigned',
        message: `You have been assigned to resolve finding '${finding.title}' by ${new Date(finding.dueDate).toLocaleDateString()}.`
      }
    });

    res.json({
      success: true,
      finding: formatFinding(updated)
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/resolve', authenticate, upload.single('evidence'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { notes, progress } = req.body;
  const userId = req.user?.id;

  try {
    const finding = await prisma.auditFinding.findFirst({
      where: {
        OR: [
          { findingId: id },
          { id: id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/) ? id : '00000000-0000-0000-0000-000000000000' }
        ]
      },
      include: { correctiveActions: true, audit: { select: { id: true, auditorId: true, departmentId: true } } }
    });

    if (!finding) return res.status(404).json({ success: false, message: 'Finding not found' });

    if (finding.status === FindingStatus.CLOSED) {
      return res.status(400).json({ success: false, message: 'Closed findings are immutable.' });
    }

    if (finding.ownerId !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'You are not the designated owner of this finding' });
    }

    const action = await prisma.correctiveAction.findFirst({
      where: { findingId: finding.id, ownerId: finding.ownerId || '' }
    });

    if (!action) {
      return res.status(404).json({ success: false, message: 'Corrective action tracker not found' });
    }

    const progressValue = progress !== undefined ? Number(progress) : 100;

    if (progressValue < 0 || progressValue > 100) {
      return res.status(400).json({ success: false, message: 'Progress percentage must be between 0 and 100' });
    }

    const fileUrl = req.file ? `/uploads/${req.file.filename}` : action.evidenceUrl;

    if (progressValue === 100 && finding.severity === Severity.CRITICAL && !fileUrl) {
      return res.status(400).json({ success: false, message: 'Evidence file/document is mandatory to resolve a CRITICAL finding.' });
    }

    const updatedAction = await prisma.correctiveAction.update({
      where: { id: action.id },
      data: {
        progressPercentage: progressValue,
        evidenceUrl: fileUrl,
        resolutionNotes: notes ? encrypt(notes) : action.resolutionNotes,
        closedAt: progressValue === 100 ? new Date() : null
      }
    });

    let updatedFinding: any = finding;
    if (progressValue === 100) {
      updatedFinding = await prisma.auditFinding.update({
        where: { id: finding.id },
        data: { status: FindingStatus.RESOLVED }
      });

      const audit = await prisma.audit.findUnique({ where: { id: finding.auditId } });
      if (audit) {
        await prisma.notification.create({
          data: {
            userId: audit.auditorId,
            title: 'Finding Resolved - Action Required',
            message: `Finding '${finding.title}' has been marked as resolved by owner. Verification is required to close.`
          }
        });
      }

      // Gamification: award XP for compliance resolution
      if (userId && finding.audit?.departmentId) {
        // Check if critical and resolved before deadline
        const isCritical = finding.severity === Severity.CRITICAL;
        const beforeDeadline = new Date() <= new Date(finding.dueDate);
        const activityType = (isCritical && beforeDeadline)
          ? 'critical_finding_resolved'
          : 'compliance_resolution';
        await awardPoints(userId as string, finding.audit.departmentId, 'governance', activityType);
      }
    }

    res.json({
      success: true,
      finding: formatFinding(updatedFinding),
      action: {
        ...updatedAction,
        progress: updatedAction.progressPercentage,
        evidence: updatedAction.evidenceUrl,
        closureNotes: updatedAction.resolutionNotes,
        completionTimestamp: updatedAction.closedAt
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/verify-close', authenticate, authorize(['ADMIN', 'COMPLIANCE_OFFICER', 'AUDITOR']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { isApproved, verificationNotes } = req.body;

  try {
    const finding = await prisma.auditFinding.findFirst({
      where: {
        OR: [
          { findingId: id },
          { id: id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/) ? id : '00000000-0000-0000-0000-000000000000' }
        ]
      },
      include: { correctiveActions: true }
    });

    if (!finding) return res.status(404).json({ success: false, message: 'Finding not found' });

    if (finding.status !== FindingStatus.RESOLVED) {
      return res.status(400).json({ success: false, message: 'Only resolved findings can be verified' });
    }

    let nextStatus: FindingStatus = FindingStatus.CLOSED;
    let actionUpdate: any = {
      verifiedBy: req.user?.id
    };

    if (!isApproved) {
      nextStatus = FindingStatus.ASSIGNED;
      actionUpdate.progressPercentage = 50;
      actionUpdate.closedAt = null;
    }

    const updatedFinding = await prisma.auditFinding.update({
      where: { id: finding.id },
      data: { status: nextStatus }
    });

    const action = await prisma.correctiveAction.findFirst({
      where: { findingId: finding.id, ownerId: finding.ownerId || '' }
    });

    if (action) {
      await prisma.correctiveAction.update({
        where: { id: action.id },
        data: {
          ...actionUpdate,
          resolutionNotes: encrypt(isApproved ? `[Approved] ${verificationNotes || ''}` : `[Rejected] ${verificationNotes || ''}`),
          closedAt: isApproved ? new Date() : null
        }
      });
    }

    if (finding.ownerId) {
      await prisma.notification.create({
        data: {
          userId: finding.ownerId,
          title: isApproved ? 'Corrective Action Approved' : 'Corrective Action Rejected',
          message: isApproved
            ? `Your corrective action for finding '${finding.title}' has been verified and closed.`
            : `Your corrective action for finding '${finding.title}' was rejected and set back to Assigned. Note: ${verificationNotes}`
        }
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user?.id,
        action: isApproved ? 'FINDING_VERIFY_CLOSE' : 'FINDING_VERIFY_REJECT',
        details: isApproved ? `Verified and closed finding ${finding.findingId}` : `Rejected resolution for finding ${finding.findingId}`,
        ipAddress: req.ip || '127.0.0.1'
      }
    });

    res.json({
      success: true,
      finding: formatFinding(updatedFinding)
    });
  } catch (err) {
    next(err);
  }
});

export default router;
