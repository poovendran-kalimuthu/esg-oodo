const prisma = require('../../config/database');

const PARTICIPATION_INCLUDE = {
  user: { select: { id: true, name: true, email: true, avatarUrl: true, department: { select: { name: true } } } },
  csrActivity: { select: { id: true, title: true, eventDate: true, venue: true, evidenceRequired: true } },
  reviewedBy: { select: { id: true, name: true } },
};

class ParticipationRepository {
  async findByUser(userId, { skip, take, where = {} }) {
    const filter = { userId, ...where };
    const [data, total] = await Promise.all([
      prisma.employeeParticipation.findMany({
        where: filter, skip, take,
        include: PARTICIPATION_INCLUDE,
        orderBy: { registrationDate: 'desc' },
      }),
      prisma.employeeParticipation.count({ where: filter }),
    ]);
    return { data, total };
  }

  async findAllManaged({ skip, take, where = {} }) {
    const [data, total] = await Promise.all([
      prisma.employeeParticipation.findMany({
        where, skip, take,
        include: PARTICIPATION_INCLUDE,
        orderBy: { registrationDate: 'desc' },
      }),
      prisma.employeeParticipation.count({ where }),
    ]);
    return { data, total };
  }

  async findById(id) {
    return prisma.employeeParticipation.findUnique({
      where: { id },
      include: PARTICIPATION_INCLUDE,
    });
  }

  async findByUserAndCSR(userId, csrActivityId) {
    return prisma.employeeParticipation.findUnique({
      where: { userId_csrActivityId: { userId, csrActivityId } },
    });
  }

  async create(data) {
    return prisma.employeeParticipation.create({ data, include: PARTICIPATION_INCLUDE });
  }

  async update(id, data) {
    return prisma.employeeParticipation.update({
      where: { id }, data, include: PARTICIPATION_INCLUDE,
    });
  }

  async countApprovedByUser(userId) {
    return prisma.employeeParticipation.count({
      where: { userId, approvalStatus: 'APPROVED' },
    });
  }

  async sumVolunteerHours(userId) {
    const result = await prisma.employeeParticipation.aggregate({
      where: { userId, approvalStatus: 'APPROVED' },
      _sum: { volunteerHours: true },
    });
    return result._sum.volunteerHours || 0;
  }
}

module.exports = new ParticipationRepository();
