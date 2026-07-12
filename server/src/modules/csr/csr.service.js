const csrRepository = require('./csr.repository');
const { parsePagination } = require('../../shared/utils/pagination');

class CSRService {
  /**
   * Build Prisma `where` clause from query filters
   */
  _buildWhere(query) {
    const where = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { venue: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status)       where.status       = query.status;
    if (query.categoryId)   where.categoryId   = query.categoryId;
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.sdgGoal)      where.sdgGoal      = query.sdgGoal;
    if (query.dateFrom || query.dateTo) {
      where.eventDate = {};
      if (query.dateFrom) where.eventDate.gte = new Date(query.dateFrom);
      if (query.dateTo)   where.eventDate.lte = new Date(query.dateTo);
    }
    return where;
  }

  async list(query) {
    const { skip, take, page, limit, sortBy, sortOrder } = parsePagination(query);
    const where = this._buildWhere(query);
    return csrRepository.findAll({ skip, take, sortBy, sortOrder, where, page, limit });
  }

  async getById(id) {
    const activity = await csrRepository.findById(id);
    if (!activity) throw Object.assign(new Error('CSR Activity not found'), { status: 404 });
    return activity;
  }

  async create(data, userId) {
    return csrRepository.create({ ...data, createdById: userId });
  }

  async update(id, data, user) {
    await this.getById(id); // ensure exists

    // Managers can only edit their own department's activities
    if (user.role === 'MANAGER') {
      const existing = await csrRepository.findById(id);
      if (existing.departmentId !== user.departmentId) {
        throw Object.assign(new Error('Access denied to this activity'), { status: 403 });
      }
    }

    return csrRepository.update(id, data);
  }

  async delete(id) {
    await this.getById(id);
    return csrRepository.softDelete(id);
  }

  async updateStatus(id, status) {
    await this.getById(id);
    return csrRepository.updateStatus(id, status);
  }

  async updateBanner(id, bannerImage) {
    return csrRepository.update(id, { bannerImage });
  }

  async getParticipants(id, query) {
    await this.getById(id);
    const { skip, take, page, limit } = parsePagination(query);
    const result = await csrRepository.findParticipants(id, { skip, take });
    return { ...result, page, limit };
  }
}

module.exports = new CSRService();
