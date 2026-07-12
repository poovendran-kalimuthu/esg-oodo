const express = require('express');
const router  = express.Router();
const { protect } = require('../../middleware/auth');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { success, paginated } = require('../../shared/utils/apiResponse');
const notificationsService = require('./notifications.service');

router.use(protect);

router.get('/', asyncHandler(async (req, res) => {
  const result = await notificationsService.getMyNotifications(req.user.id, req.query);
  paginated(res, result);
}));

router.get('/unread-count', asyncHandler(async (req, res) => {
  const count = await notificationsService.getUnreadCount(req.user.id);
  success(res, { count });
}));

router.patch('/:id/read', asyncHandler(async (req, res) => {
  await notificationsService.markRead(req.params.id, req.user.id);
  success(res, {}, 'Marked as read');
}));

router.patch('/read-all', asyncHandler(async (req, res) => {
  await notificationsService.markAllRead(req.user.id);
  success(res, {}, 'All notifications marked as read');
}));

module.exports = router;
