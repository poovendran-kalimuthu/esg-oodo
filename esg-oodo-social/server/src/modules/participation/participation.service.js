const participationRepo = require('./participation.repository');
const prisma  = require('../../config/database');
const { parsePagination } = require('../../shared/utils/pagination');
const { XP_REWARDS } = require('../../shared/constants/xpRewards');
const gamificationService = require('../gamification/gamification.service');
const notificationService = require('../notifications/notifications.service');

class ParticipationService {
  async getMyParticipations(userId, query) {
    const { skip, take, page, limit } = parsePagination(query);
    const where = {};
    if (query.status) where.approvalStatus = query.status;
    const result = await participationRepo.findByUser(userId, { skip, take, where });
    return { ...result, page, limit };
  }

  async register(userId, csrActivityId, departmentId) {
    // Check CSR exists and is published
    const csr = await prisma.cSRActivity.findFirst({
      where: { id: csrActivityId, status: 'PUBLISHED', deletedAt: null },
    });
    if (!csr) throw Object.assign(new Error('CSR Activity not found or not open for registration'), { status: 404 });

    // Check registration deadline
    if (new Date() > new Date(csr.registrationDeadline)) {
      throw Object.assign(new Error('Registration deadline has passed'), { status: 400 });
    }

    // Check max participants
    const currentCount = await prisma.employeeParticipation.count({
      where: { csrActivityId, approvalStatus: { not: 'WITHDRAWN' } },
    });
    if (currentCount >= csr.maxParticipants) {
      throw Object.assign(new Error('This activity has reached maximum participants'), { status: 400 });
    }

    // Check duplicate
    const existing = await participationRepo.findByUserAndCSR(userId, csrActivityId);
    if (existing && existing.approvalStatus !== 'WITHDRAWN') {
      throw Object.assign(new Error('You are already registered for this activity'), { status: 409 });
    }

    const participation = await participationRepo.create({
      userId, csrActivityId, departmentId,
      approvalStatus: 'REGISTERED',
    });

    // Award XP for registration
    await gamificationService.awardXP(userId, XP_REWARDS.CSR_REGISTRATION, 'CSR Registration', participation.id, 'EmployeeParticipation');

    return participation;
  }

  async withdraw(participationId, userId) {
    const participation = await participationRepo.findById(participationId);
    if (!participation) throw Object.assign(new Error('Participation not found'), { status: 404 });
    if (participation.userId !== userId) throw Object.assign(new Error('Access denied'), { status: 403 });
    if (['APPROVED', 'WITHDRAWN'].includes(participation.approvalStatus)) {
      throw Object.assign(new Error('Cannot withdraw from this participation'), { status: 400 });
    }
    return participationRepo.update(participationId, { approvalStatus: 'WITHDRAWN' });
  }

  async uploadProof(participationId, userId, filePath) {
    const participation = await participationRepo.findById(participationId);
    if (!participation) throw Object.assign(new Error('Participation not found'), { status: 404 });
    if (participation.userId !== userId) throw Object.assign(new Error('Access denied'), { status: 403 });
    if (!['REGISTERED', 'PROOF_UPLOADED', 'REJECTED'].includes(participation.approvalStatus)) {
      throw Object.assign(new Error('Cannot upload proof at this stage'), { status: 400 });
    }
    return participationRepo.update(participationId, {
      proofDocument: filePath,
      proofUploadedAt: new Date(),
      approvalStatus: 'PROOF_UPLOADED',
    });
  }

  async getManagedParticipations(managerUser, query) {
    const { skip, take, page, limit } = parsePagination(query);
    const where = {};
    if (managerUser.role === 'MANAGER') where.departmentId = managerUser.departmentId;
    if (query.status)       where.approvalStatus = query.status;
    if (query.csrActivityId) where.csrActivityId = query.csrActivityId;
    const result = await participationRepo.findAllManaged({ skip, take, where });
    return { ...result, page, limit };
  }

  async review(participationId, reviewerUser, { approvalStatus, reviewNote, volunteerHours }) {
    const participation = await participationRepo.findById(participationId);
    if (!participation) throw Object.assign(new Error('Participation not found'), { status: 404 });

    // Managers can only review their own department
    if (reviewerUser.role === 'MANAGER' && participation.departmentId !== reviewerUser.departmentId) {
      throw Object.assign(new Error('Access denied'), { status: 403 });
    }

    // Evidence check
    if (approvalStatus === 'APPROVED') {
      const csr = participation.csrActivity;
      if (csr?.evidenceRequired && !participation.proofDocument) {
        throw Object.assign(new Error('Proof document required before approval'), { status: 400 });
      }
    }

    const updateData = {
      approvalStatus,
      reviewedById: reviewerUser.id,
      reviewNote,
      reviewedAt: new Date(),
    };

    if (approvalStatus === 'APPROVED') {
      const hours = volunteerHours || 0;
      const xpEarned = XP_REWARDS.CSR_COMPLETION + Math.floor(hours * XP_REWARDS.VOLUNTEER_HOUR);
      updateData.completionDate = new Date();
      updateData.volunteerHours = hours;
      updateData.xpEarned = xpEarned;

      // Award XP
      await gamificationService.awardXP(
        participation.userId,
        xpEarned,
        'CSR Completion + Volunteer Hours',
        participationId,
        'EmployeeParticipation'
      );

      // Check badges
      await gamificationService.checkAndAwardBadges(participation.userId);

      // Notify employee
      await notificationService.create({
        userId: participation.userId,
        title: 'Participation Approved! 🎉',
        message: `Your participation in "${participation.csrActivity?.title}" has been approved. You earned ${xpEarned} XP!`,
        type: 'REGISTRATION_APPROVED',
        referenceId: participationId,
        referenceType: 'EmployeeParticipation',
      });
    }

    if (approvalStatus === 'REJECTED') {
      await notificationService.create({
        userId: participation.userId,
        title: 'Participation Update',
        message: `Your participation in "${participation.csrActivity?.title}" was not approved. Reason: ${reviewNote || 'No reason provided'}`,
        type: 'REGISTRATION_REJECTED',
        referenceId: participationId,
        referenceType: 'EmployeeParticipation',
      });
    }

    return participationRepo.update(participationId, updateData);
  }
}

module.exports = new ParticipationService();
