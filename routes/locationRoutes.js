const express = require('express');
const ctrl = require('../controllers/locationController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

router.get('/search', validate({ query: { q: { required: true, min: 2, max: 80 } } }), ctrl.searchLocations);

router.get('/', protect, ctrl.getMyLocations);
router.post('/', protect, validate({ body: { city: { max: 80 } } }), ctrl.createLocation);
router.put(
  '/:id',
  protect,
  validate({ params: { id: { required: true, isMongoId: true } } }),
  ctrl.updateLocation
);
router.delete(
  '/:id',
  protect,
  validate({ params: { id: { required: true, isMongoId: true } } }),
  ctrl.deleteLocation
);

module.exports = router;
