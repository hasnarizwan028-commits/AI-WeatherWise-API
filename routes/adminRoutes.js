const express = require('express');
const ctrl = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

/* Every administrative route is shielded by the Role Matrix. */
router.use(protect, authorize('admin'));

router.get('/stats', ctrl.getStats);
router.get('/users', ctrl.getUsers);
router.get('/logs', ctrl.getLogs);

router.put(
  '/users/:id/role',
  validate({ params: { id: { required: true, isMongoId: true } }, body: { role: { required: true, oneOf: ['reader', 'user', 'admin'] } } }),
  ctrl.setRole
);

router.put(
  '/users/:id/suspend',
  validate({ params: { id: { required: true, isMongoId: true } }, body: { isActive: { required: true } } }),
  ctrl.setActive
);

router.delete('/users/:id', validate({ params: { id: { required: true, isMongoId: true } } }), ctrl.deleteUser);

module.exports = router;
