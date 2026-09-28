const express = require('express');
const ctrl = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

router.get('/status', ctrl.getAiStatus);

const bodyRules = {
  body: {
    city: { max: 80 },
    latitude: { isNumber: true, isLatitude: true },
    longitude: { isNumber: true, isLongitude: true },
  },
};

router.post('/summary', validate(bodyRules), ctrl.getSummary);
router.post('/recommendation', validate(bodyRules), ctrl.getRecommendation);
router.post('/activity', validate(bodyRules), ctrl.getActivityIdeas);

router.get(
  '/favourite/:id',
  protect,
  validate({ params: { id: { required: true, isMongoId: true } }, query: { type: { oneOf: ['summary', 'recommendation', 'activity'] } } }),
  ctrl.getFavouriteInsight
);

module.exports = router;
