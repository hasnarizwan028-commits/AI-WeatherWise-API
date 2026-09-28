const ApiError = require('../utils/ApiError');

/**
 * ROLE MATRIX MIDDLEWARE
 * Evaluates whether the authenticated user role satisfies the authorisation
 * threshold for the guarded resource path.
 *
 *   router.get('/all', protect, authorize('admin'), handler)
 */
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(`Role "${req.user.role}" cannot perform this action. Allowed: ${roles.join(', ')}`)
      );
    }
    next();
  };

module.exports = authorize;
