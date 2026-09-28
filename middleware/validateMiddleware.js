const ApiError = require('../utils/ApiError');

/**
 * STRUCTURAL REQUEST CONSTRAINTS
 * Validates the request vector before it reaches the controller.
 *   validate({ body: {...}, query: {...}, params: {...} })
 */
const validate = (schemas) => (req, res, next) => {
  const errors = {};

  for (const part of ['body', 'query', 'params']) {
    const rules = schemas[part];
    if (!rules) continue;

    for (const [field, rule] of Object.entries(rules)) {
      const raw = req[part][field];
      const value = typeof raw === 'string' ? raw.trim() : raw;

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors[field] = `${field} is required`;
        continue;
      }
      if (value === undefined || value === '') continue;

      if (rule.email && !/^\S+@\S+\.\S+$/.test(value)) {
        errors[field] = 'Must be a valid email address';
      }
      if (rule.min && String(value).length < rule.min) {
        errors[field] = `${field} must be at least ${rule.min} characters`;
      }
      if (rule.max && String(value).length > rule.max) {
        errors[field] = `${field} cannot exceed ${rule.max} characters`;
      }
      if (rule.isMongoId && !/^[a-f\d]{24}$/i.test(String(value))) {
        errors[field] = `${field} is not a valid identifier`;
      }
      if (rule.isNumber && Number.isNaN(Number(value))) {
        errors[field] = `${field} must be a number`;
      }
      if (rule.oneOf && !rule.oneOf.includes(String(value))) {
        errors[field] = `${field} must be one of: ${rule.oneOf.join(', ')}`;
      }
      if (rule.isLatitude && (Number(value) < -90 || Number(value) > 90)) {
        errors[field] = 'latitude must be between -90 and 90';
      }
      if (rule.isLongitude && (Number(value) < -180 || Number(value) > 180)) {
        errors[field] = 'longitude must be between -180 and 180';
      }
    }
  }

  if (Object.keys(errors).length) {
    return next(ApiError.badRequest('Validation failed', errors));
  }
  next();
};

module.exports = validate;
