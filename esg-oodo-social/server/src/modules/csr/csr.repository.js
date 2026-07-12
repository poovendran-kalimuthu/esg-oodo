const prisma = require('../../config/database');

const PARTICIPANT_SELECT = {
  id: true, name: true, email: true, avatarUrl: true,
  department: { select: { name: true } },
};

const ACTIVITY_INCLUDE = {
  category:   { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
  organizer:  { select: { id: true, name: true, email: true } },
  createdBy:  { select: { id: true, name: true } },
  _count:     { select: { participations: true } },
};

class CSRRepository {
  async findAll({ skip, take, sortBy, sortOrder, where }) {
    const [data, total] = await Promise.all([
      prisma.cSRActivity.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: ACTIVITY_INCLUDE,
      }),
      prisma.cSRActivity.count({ where }),
    ]);
    return { data, total };
  }

  async findById(id) {
    return prisma.cSRActivity.findFirst({
      where: { id, deletedAt: null },
      include: ACTIVITY_INCLUDE,
    });
  }

  async create(data) {
    return prisma.cSRActivity.create({ data, include: ACTIVITY_INCLUDE });
  }

  async update(id, data) {
    return prisma.cSRActivity.update({
      where: { id },
      data,
      include: ACTIVITY_INCLUDE,
    });
  }

  async softDelete(id) {
    return prisma.cSRActivity.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
  }

  async updateStatus(id, status) {
    return prisma.cSRActivity.update({ where: { id }, data: { status } });
  }

  async findParticipants(csrActivityId, { skip, take }) {
    const [data, total] = await Promise.all([
      prisma.employeeParticipation.findMany({
        where: { csrActivityId },
        skip,
        take,
        include: { user: { select: PARTICIPANT_SELECT } },
        orderBy: { registrationDate: 'desc' },
      }),
      prisma.employeeParticipation.count({ where: { csrActivityId } }),
    ]);
    return { data, total };
  }
}

module.exports = new CSRRepository();
