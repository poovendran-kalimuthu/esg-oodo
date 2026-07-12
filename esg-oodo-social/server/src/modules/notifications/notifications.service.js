const prisma = require('../../config/database');
const { sendMail } = require('../../config/mailer');

class NotificationsService {
  async create({ userId, title, message, type, referenceId, referenceType, sendEmail = false }) {
    const notification = await prisma.notification.create({
      data: { userId, title, message, type, referenceId, referenceType },
    });

    // Optional email
    if (sendEmail) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
      if (user) {
        await sendMail({
          to: user.email,
          subject: `EcoSphere: ${title}`,
          html: `<p>Hi ${user.name},</p><p>${message}</p><p>— EcoSphere Team</p>`,
        });
      }
    }

    return notification;
  }

  async getMyNotifications(userId, { page = 1, limit = 20 }) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.notification.count({ where: { userId } }),
    ]);
    return { data, total, page: Number(page), limit: Number(limit) };
  }

  async markRead(notificationId, userId) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId) {
    return prisma.notification.count({ where: { userId, isRead: false } });
  }
}

module.exports = new NotificationsService();
