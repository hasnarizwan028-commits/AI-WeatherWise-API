const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * AUTHENTICATION MIDDLEWARE
 * Extracts the Bearer token, verifies the signature, loads the user
 * context into req.user and blocks inactive accounts.
 */
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Not authorised - send header: Authorization: Bearer <token>');
  }

  const token = header.split(' ')[1];
  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw ApiError.unauthorized(`Token ${err.name === 'TokenExpiredError' ? 'expired' : 'is invalid'}`);
  }

  const user = await User.findById(decoded.id);
  if (!user) throw ApiError.unauthorized('The user for this token no longer exists');
  if (!user.isActive) throw ApiError.forbidden('This account has been suspended by an administrator');

  req.user = user;
  next();
});

module.exports = { protect };
