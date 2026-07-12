const csrService = require('./csr.service');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { success, created, paginated, notFound } = require('../../shared/utils/apiResponse');

exports.list = asyncHandler(async (req, res) => {
  const { data, total } = await csrService.list(req.query);
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 10;
  paginated(res, { data, total, page, limit });
});

exports.getById = asyncHandler(async (req, res) => {
  const activity = await csrService.getById(req.params.id);
  success(res, { activity });
});

exports.create = asyncHandler(async (req, res) => {
  const activity = await csrService.create(req.body, req.user.id);
  created(res, { activity }, 'CSR Activity created successfully');
});

exports.update = asyncHandler(async (req, res) => {
  const activity = await csrService.update(req.params.id, req.body, req.user);
  success(res, { activity }, 'CSR Activity updated successfully');
});

exports.delete = asyncHandler(async (req, res) => {
  await csrService.delete(req.params.id);
  success(res, {}, 'CSR Activity deleted successfully');
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const activity = await csrService.updateStatus(req.params.id, status);
  success(res, { activity }, `Status updated to ${status}`);
});

exports.uploadBanner = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const bannerImage = `/uploads/banners/${req.file.filename}`;
  const activity = await csrService.updateBanner(req.params.id, bannerImage);
  success(res, { activity, bannerImage }, 'Banner uploaded successfully');
});

exports.getParticipants = asyncHandler(async (req, res) => {
  const { data, total, page, limit } = await csrService.getParticipants(req.params.id, req.query);
  paginated(res, { data, total, page, limit });
});
