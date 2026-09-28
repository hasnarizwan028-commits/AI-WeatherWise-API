const weatherService = require('../services/weatherService');
const Location = require('../models/Location');
const asyncHandler = require('../utils/asyncHandler');

/**
 * CONTROLLER LAYER - Weather
 * Public endpoint: any consumer (even without an account) can read metrics.
 */

/* @route  GET /api/weather?city=Chennai | ?latitude=13.08&longitude=80.27 */
const getCurrentWeather = asyncHandler(async (req, res) => {
  const { city, latitude, longitude, country } = req.query;

  let coords = { latitude, longitude, city, country };

  if (latitude == null || longitude == null) {
    if (!city) return res.status(400).json({ success: false, message: 'Provide ?city= or ?latitude= & ?longitude=' });
    const matches = await weatherService.searchCity(city);
    if (!matches.length) {
      return res.status(404).json({ success: false, message: `No city found matching "${city}"` });
    }
    const exact = matches.find((m) => m.city.toLowerCase() === city.toLowerCase()) || matches[0];
    coords = exact;
  }

  const weather = await weatherService.getWeather(coords);
  res.json({ success: true, weather });
});

/* @route  GET /api/weather/favourite/:id  (guarded) */
const getFavouriteWeather = asyncHandler(async (req, res) => {
  const location = await Location.findOne({ _id: req.params.id, user: req.user._id });
  if (!location) return res.status(404).json({ success: false, message: 'Location not found' });

  const weather = await weatherService.getWeather({
    latitude: location.latitude,
    longitude: location.longitude,
    city: location.city,
    country: location.country,
  });
  res.json({ success: true, location, weather });
});

module.exports = { getCurrentWeather, getFavouriteWeather };
