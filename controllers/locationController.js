const Location = require('../models/Location');
const weatherService = require('../services/weatherService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/* @route  GET /api/locations  -> current user's favourites */
const getMyLocations = asyncHandler(async (req, res) => {
  const locations = await Location.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, count: locations.length, locations });
});

/* @route  POST /api/locations  body: { city } or { city, country, latitude, longitude } */
const createLocation = asyncHandler(async (req, res) => {
  let { city, country, latitude, longitude } = req.body;

  if (!city) throw ApiError.badRequest('city is required');

  if (latitude == null || longitude == null) {
    const matches = await weatherService.searchCity(city);
    if (!matches.length) throw ApiError.notFound(`No city found matching "${city}"`);

    const exact =
      matches.find(
        (m) => m.city.toLowerCase() === city.toLowerCase() && (!country || m.country === country)
      ) || matches[0];

    ({ city, country, latitude, longitude } = exact);
  }

  const existing = await Location.findOne({
    user: req.user._id,
    city,
    country,
  });
  if (existing) throw ApiError.conflict(`"${city}" is already in your favourite locations`);

  const location = await Location.create({
    user: req.user._id,
    city,
    country,
    latitude,
    longitude,
  });

  res.status(201).json({ success: true, message: `"${city}" saved to favourites`, location });
});

/* @route  PUT /api/locations/:id */
const updateLocation = asyncHandler(async (req, res) => {
  const location = await Location.findOne({ _id: req.params.id, user: req.user._id });
  if (!location) throw ApiError.notFound('Location not found or not owned by you');

  const { city, country } = req.body;
  if (city || country) {
    const matches = await weatherService.searchCity(city || location.city);
    const match =
      matches.find((m) => m.city.toLowerCase() === String(city || location.city).toLowerCase()) || matches[0];
    if (match) {
      location.city = match.city;
      location.country = country || match.country;
      location.latitude = match.latitude;
      location.longitude = match.longitude;
    }
  }

  await location.save();
  res.json({ success: true, message: 'Location updated', location });
});

/* @route  DELETE /api/locations/:id */
const deleteLocation = asyncHandler(async (req, res) => {
  const location = await Location.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!location) throw ApiError.notFound('Location not found or not owned by you');
  res.json({ success: true, message: 'Location removed', id: req.params.id });
});

/* @route  GET /api/locations/search?q=chennai  (public city lookup) */
const searchLocations = asyncHandler(async (req, res) => {
  const results = await weatherService.searchCity(req.query.q);
  res.json({ success: true, count: results.length, results });
});

module.exports = { getMyLocations, createLocation, updateLocation, deleteLocation, searchLocations };
