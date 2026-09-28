const weatherService = require('../services/weatherService');
const aiService = require('../services/aiService');
const Location = require('../models/Location');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const resolveWeather = async (req) => {
  if (req.params.id) {
    const location = await Location.findOne({ _id: req.params.id, user: req.user._id });
    if (!location) throw ApiError.notFound('Location not found or not owned by you');
    return weatherService.getWeather(location.toObject());
  }

  const { city, latitude, longitude } = req.body || req.query || {};
  if (latitude == null || longitude == null) {
    if (!city) throw ApiError.badRequest('Provide { city } or { latitude, longitude }');
    const matches = await weatherService.searchCity(city);
    if (!matches.length) throw ApiError.notFound(`No city found matching "${city}"`);
    const exact = matches.find((m) => m.city.toLowerCase() === city.toLowerCase()) || matches[0];
    return weatherService.getWeather(exact);
  }
  return weatherService.getWeather({ latitude, longitude, city: city || 'Coordinates' });
};

/* @route  POST /api/ai/summary        { city } | { latitude, longitude } */
const getSummary = asyncHandler(async (req, res) => {
  const weather = await resolveWeather(req);
  const insight = await aiService.generateInsight(weather, 'summary');
  res.json({ success: true, weather: weather.current, insight });
});

/* @route  POST /api/ai/recommendation */
const getRecommendation = asyncHandler(async (req, res) => {
  const weather = await resolveWeather(req);
  const insight = await aiService.generateInsight(weather, 'recommendation');
  res.json({ success: true, weather: weather.current, insight });
});

/* @route  POST /api/ai/activity */
const getActivityIdeas = asyncHandler(async (req, res) => {
  const weather = await resolveWeather(req);
  const insight = await aiService.generateInsight(weather, 'activity');
  res.json({ success: true, weather: weather.current, insight });
});

/* @route  GET /api/ai/favourite/:id/recommendation  (guarded) */
const getFavouriteInsight = asyncHandler(async (req, res) => {
  const weather = await resolveWeather(req);
  const task = req.query.type || 'recommendation';
  const insight = await aiService.generateInsight(weather, task);
  res.json({ success: true, location: weather.location, weather: weather.current, insight });
});

/* @route  GET /api/ai/status  -> integration health check */
const getAiStatus = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    gemini: {
      enabled: aiService.isAiEnabled(),
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      mode: aiService.isAiEnabled() ? 'live' : 'fallback',
    },
  });
});

module.exports = { getSummary, getRecommendation, getActivityIdeas, getFavouriteInsight, getAiStatus };
