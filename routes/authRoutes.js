const express = require('express');
const ctrl = require('../controllers/authController');
const validate = require('../middleware/validateMiddleware');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post(
  '/register',
  validate({
    body: {
      name: { required: true, min: 2, max: 60 },
      email: { required: true, email: true },
      password: { required: true, min: 6, max: 72 },
    },
  }),
  ctrl.register
);

router.post(
  '/login',
  validate({
    body: { email: { required: true, email: true }, password: { required: true } },
  }),
  ctrl.login
);

router.get('/me', protect, ctrl.getMe);
router.put('/profile', protect, validate({ body: { name: { min: 2, max: 60 } } }), ctrl.updateProfile);
router.put('/password', protect, ctrl.changePassword);

module.exports = router;
