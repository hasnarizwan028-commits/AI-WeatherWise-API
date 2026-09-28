/**
 * GRANULAR SERVICE - Weather Engine
 * Provider 1 (default): Open-Meteo  -> 100% FREE, no API key, no signup.
 * Provider 2 (fallback) : OpenWeatherMap -> free tier, requires a key.
 *
 * The service normalises every provider payload into ONE internal contract so
 * controllers never need to know which upstream answered.
 */
const ApiError = require('../utils/ApiError');

const OPEN_METEO_FORECAST = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';
const OPEN_WEATHER = 'https://api.openweathermap.org/data/2.5';

const WMO_CODES = {
  0: ['Clear sky', 'sun'],
  1: ['Mainly clear', 'sun'],
  2: ['Partly cloudy', 'cloud-sun'],
  3: ['Overcast', 'cloud'],
  45: ['Fog', 'fog'],
  48: ['Depositing rime fog', 'fog'],
  51: ['Light drizzle', 'rain'],
  53: ['Moderate drizzle', 'rain'],
  55: ['Dense drizzle', 'rain'],
  61: ['Slight rain', 'rain'],
  63: ['Moderate rain', 'rain'],
  65: ['Heavy rain', 'rain'],
  66: ['Freezing rain', 'rain'],
  71: ['Slight snow fall', 'snow'],
  73: ['Moderate snow fall', 'snow'],
  75: ['Heavy snow fall', 'snow'],
  77: ['Snow grains', 'snow'],
  80: ['Slight rain showers', 'rain'],
  81: ['Moderate rain showers', 'rain'],
  82: ['Violent rain showers', 'rain'],
  85: ['Slight snow showers', 'snow'],
  86: ['Heavy snow showers', 'snow'],
  95: ['Thunderstorm', 'storm'],
  96: ['Thunderstorm with light hail', 'storm'],
  99: ['Thunderstorm with heavy hail', 'storm'],
};

const describeCode = (code) => WMO_CODES[code] || ['Unknown conditions', 'cloud'];

const withTimeout = async (url, ms = 10000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Upstream responded ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

/* ------------------------------------------------------------------ *
 * City search (geocoding) - used when a user adds a new favourite city
 * ------------------------------------------------------------------ */
const searchCity = async (query) => {
  const q = encodeURIComponent(query.trim());
  const data = await withTimeout(
    `${OPEN_METEO_GEOCODE}?name=${q}&count=8&language=en&format=json`
  );

  return (data.results || []).map((r) => ({
    city: r.name,
    country: r.country,
    state: r.admin1 || '',
    latitude: r.latitude,
    longitude: r.longitude,
  }));
};

/* ------------------------------------------------------------------ *
 * Open-Meteo -> internal contract
 * ------------------------------------------------------------------ */
const normaliseOpenMeteo = (data, meta) => {
  const c = data.current || {};
  const d = data.daily || {};

  const mapDay = (i) => ({
    date: d.time?.[i],
    tempMax: d.temperature_2m_max?.[i],
    tempMin: d.temperature_2m_min?.[i],
    precipitationProbability: d.precipitation_probability_max?.[i] ?? null,
    uvIndex: d.uv_index_max?.[i] ?? null,
    windSpeedMax: d.wind_speed_10m_max?.[i] ?? null,
    sunrise: d.sunrise?.[i] ?? null,
    sunset: d.sunset?.[i] ?? null,
    ...(d.weather_code?.[i] != null
      ? (() => {
          const [text, icon] = describeCode(d.weather_code[i]);
          return { condition: text, icon };
        })()
      : {}),
  });

  const forecast = (d.time || []).map((_, i) => mapDay(i));

  return {
    provider: 'Open-Meteo',
    location: meta,
    current: {
      temperature: c.temperature_2m,
      apparentTemperature: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      precipitation: c.precipitation,
      windSpeed: c.wind_speed_10m,
      windDirection: c.wind_direction_10m,
      windGusts: c.wind_gusts_10m,
      pressure: c.pressure_msl,
      cloudCover: c.cloud_cover,
      isDay: c.is_day === 1,
      observedAt: c.time,
      ...(c.weather_code != null
        ? (() => {
            const [text, icon] = describeCode(c.weather_code);
            return { condition: text, icon };
          })()
        : {}),
    },
    forecast,
    units: {
      temperature: '°C',
      windSpeed: 'km/h',
      humidity: '%',
      pressure: 'hPa',
    },
  };
};

/* ------------------------------------------------------------------ *
 * OpenWeatherMap -> internal contract (used only as a fallback)
 * ------------------------------------------------------------------ */
const normaliseOpenWeather = (data, meta) => {
  const c = data.main || {};
  const w = data.weather?.[0] || {};

  return {
    provider: 'OpenWeatherMap',
    location: { city: data.name, country: data.sys?.country, ...meta },
    current: {
      temperature: c.temp,
      apparentTemperature: c.feels_like,
      humidity: c.humidity,
      precipitation: data.rain?.['1h'] ?? 0,
      windSpeed: data.wind?.speed ? data.wind.speed * 3.6 : null,
      windDirection: data.wind?.deg ?? null,
      windGusts: data.wind?.gust ? data.wind.gust * 3.6 : null,
      pressure: c.pressure,
      cloudCover: data.clouds?.all ?? null,
      isDay: true,
      observedAt: new Date((data.dt || 0) * 1000).toISOString(),
      condition: (w.description || 'Unknown').replace(/^\w/, (m) => m.toUpperCase()),
      icon: w.main === 'Clear' ? 'sun' : w.main === 'Clouds' ? 'cloud' : 'rain',
    },
    forecast: [],
    units: {
      temperature: '°C',
      windSpeed: 'km/h',
      humidity: '%',
      pressure: 'hPa',
    },
  };
};

/* ------------------------------------------------------------------ *
 * Public engine entry point
 * ------------------------------------------------------------------ */
const getWeather = async ({ latitude, longitude, city, country }) => {
  const meta = { city, country, latitude: Number(latitude), longitude: Number(longitude) };

  const preferred = process.env.WEATHER_PROVIDER || 'open-meteo';
  const attempts =
    preferred === 'openweathermap'
      ? ['openweathermap', 'open-meteo']
      : ['open-meteo', 'openweathermap'];

  let lastError = null;

  for (const provider of attempts) {
    try {
      if (provider === 'open-meteo') {
        const url =
          `${OPEN_METEO_FORECAST}?latitude=${meta.latitude}&longitude=${meta.longitude}` +
          '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
          '&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,wind_speed_10m_max' +
          '&timezone=auto&forecast_days=5';
        const data = await withTimeout(url);
        return normaliseOpenMeteo(data, meta);
      }

      if (process.env.OPENWEATHER_API_KEY) {
        const url =
          `${OPEN_WEATHER}/weather?lat=${meta.latitude}&lon=${meta.longitude}` +
          `&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`;
        const data = await withTimeout(url);
        return normaliseOpenWeather(data, meta);
      }
      lastError = new Error('OpenWeatherMap key not configured');
    } catch (err) {
      lastError = err;
    }
  }

  throw ApiError.external(`Weather provider unavailable -> ${lastError?.message}`);
};

module.exports = { getWeather, searchCity, describeCode };
