const participationService = require('./participation.service');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { success, created, paginated } = require('../../shared/utils/apiResponse');

exports.getMyParticipations = asyncHandler(async (req, res) => {
  const { data, total, page, limit } = await participationService.getMyParticipations(req.user.id, req.query);
  paginated(res, { data, total, page, limit });
});

exports.register = asyncHandler(async (req, res) => {
  const { csrActivityId } = req.body;
  const participation = await participationService.register(req.user.id, csrActivityId, req.user.departmentId);
  created(res, { participation }, 'Registered successfully');
});

exports.withdraw = asyncHandler(async (req, res) => {
  await participationService.withdraw(req.params.id, req.user.id);
  success(res, {}, 'Withdrawn successfully');
});

exports.uploadProof = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const filePath = `/uploads/proofs/${req.file.filename}`;
  const participation = await participationService.uploadProof(req.params.id, req.user.id, filePath);
  success(res, { participation }, 'Proof uploaded successfully');
});

exports.getManagedParticipations = asyncHandler(async (req, res) => {
  const { data, total, page, limit } = await participationService.getManagedParticipations(req.user, req.query);
  paginated(res, { data, total, page, limit });
});

exports.review = asyncHandler(async (req, res) => {
  const participation = await participationService.review(req.params.id, req.user, req.body);
  success(res, { participation }, 'Review submitted successfully');
});
