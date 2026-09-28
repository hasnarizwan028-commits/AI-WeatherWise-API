const User = require('../models/User');
const Location = require('../models/Location');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/* @route  GET /api/admin/stats  -> system health + integrity metrics */
const getStats = asyncHandler(async (_req, res) => {
  const [userCount, locationCount, activeUsers, latestUsers] = await Promise.all([
    User.countDocuments(),
    Location.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.find().sort({ createdAt: -1 }).limit(5).select('name email role isActive createdAt'),
  ]);

  res.json({
    success: true,
    stats: { users: userCount, activeUsers, suspendedUsers: userCount - activeUsers, locations: locationCount },
    recentUsers: latestUsers,
  });
});

/* @route  GET /api/admin/users */
const getUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, users });
});

/* @route  PUT /api/admin/users/:id/role  { role: 'admin' | 'user' | 'reader' } */
const setRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true });
  if (!user) throw ApiError.notFound('User not found');
  res.json({ success: true, message: `Role updated to "${role}"`, user });
});

/* @route  PUT /api/admin/users/:id/suspend  { isActive: false } */
const setActive = asyncHandler(async (req, res) => {
  const isActive = Boolean(req.body.isActive);
  if (String(req.params.id) === String(req.user._id)) {
    throw ApiError.badRequest('You cannot suspend your own account');
  }
  const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
  if (!user) throw ApiError.notFound('User not found');
  res.json({ success: true, message: isActive ? 'Account reactivated' : 'Account suspended', user });
});

/* @route  DELETE /api/admin/users/:id */
const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    throw ApiError.badRequest('You cannot delete your own account');
  }
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  await Location.deleteMany({ user: user._id });
  await user.deleteOne();

  res.json({ success: true, message: 'User and all linked locations deleted', id: req.params.id });
});

/* @route  GET /api/admin/logs */
const getLogs = asyncHandler(async (_req, res) => {
  res.json({ success: true, count: logger.getLogs().length, logs: logger.getLogs() });
});

module.exports = { getStats, getUsers, setRole, setActive, deleteUser, getLogs };
