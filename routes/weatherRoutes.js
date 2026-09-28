const express = require('express');
const ctrl = require('../controllers/weatherController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

/* Public - no account required */
router.get(
  '/',
  validate({
    query: {
      city: { max: 80 },
      latitude: { isNumber: true, isLatitude: true },
      longitude: { isNumber: true, isLongitude: true },
    },
  }),
  ctrl.getCurrentWeather
);

/* Guarded - reads a saved favourite */
router.get('/favourite/:id', protect, validate({ params: { id: { required: true, isMongoId: true } } }), ctrl.getFavouriteWeather);

module.exports = router;
