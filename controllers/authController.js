const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

/* @route  POST /api/auth/register */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const exists = await User.findOne({ email: String(email).toLowerCase() });
  if (exists) throw ApiError.conflict('An account with this email already exists');

  const user = await User.create({ name, email, password });
  const token = signToken(user._id);

  res.status(201).json({ success: true, message: 'Registration successful', token, user });
});

/* @route  POST /api/auth/login */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) throw ApiError.forbidden('This account has been suspended');

  const token = signToken(user._id);
  res.json({ success: true, message: 'Login successful', token, user });
});

/* @route  GET /api/auth/me */
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

/* @route  PUT /api/auth/profile */
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw ApiError.notFound('User not found');

  const { name, email } = req.body;
  if (name) user.name = name;
  if (email && email !== user.email) {
    const taken = await User.findOne({ email: String(email).toLowerCase() });
    if (taken) throw ApiError.conflict('That email is already in use');
    user.email = email;
  }

  await user.save();
  res.json({ success: true, message: 'Profile updated', user });
});

/* @route  PUT /api/auth/password */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password changed successfully' });
});

module.exports = { register, login, getMe, updateProfile, changePassword };
