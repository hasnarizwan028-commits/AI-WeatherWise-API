/**
 * End-to-end smoke test.
 * Boots the real Express app against an in-memory MongoDB and exercises the
 * full API surface: auth, validation, role matrix, CRUD, weather and AI.
 *
 *   npm test
 */
process.env.NODE_ENV = 'test';
require('dotenv').config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_value_123';

const assert = require('assert');
const http = require('http');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

const PORT = 5099;
let base = `http://127.0.0.1:${PORT}`;
let pass = 0;
let fail = 0;

const call = (method, path, { body, token } = {}) =>
  new Promise((resolve, reject) => {
    const url = new URL(path, base);
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const req = http.request(
      {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(payload ? { 'Content-Length': payload.length } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data || '{}') }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });

const check = (label, condition, extra = '') => {
  if (condition) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} ${extra}`); }
};

(async () => {
  console.log('\n--- Booting in-memory MongoDB ---');
  const mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri('ai_weatherwise_test');

  const app = require('../index');
  await require('../config/db')();
  const server = app.listen(PORT);

  await new Promise((r) => setTimeout(r, 400));

  try {
    console.log('\n--- 1. System ---');
    let r = await call('GET', '/api/health');
    check('GET /api/health -> 200 ok', r.status === 200 && r.body.status === 'ok', JSON.stringify(r.body));

    r = await call('GET', '/api/docs');
    check('GET /api/docs lists endpoints', r.status === 200 && r.body.endpoints.length >= 20);

    r = await call('GET', '/api/ai/status');
    check('GET /api/ai/status reports mode', r.status === 200 && r.body.gemini, JSON.stringify(r.body));

    console.log('\n--- 2. Validation + sanitisation ---');
    r = await call('POST', '/api/auth/register', { body: { name: 'A', email: 'bad', password: '1' } });
    check('Register with invalid payload -> 400', r.status === 400 && r.body.errors, JSON.stringify(r.body));

    r = await call('POST', '/api/auth/register', { body: { name: '<script>alert(1)</script>Hacker', email: 'x@y.com', password: 'secret123' } });
    check('XSS payload is stripped from name', r.status === 201 && !r.body.user.name.includes('<script>'), JSON.stringify(r.body));

    r = await call('POST', '/api/locations', { token: 'not.a.jwt', body: { city: 'Chennai' } });
    check('Invalid JWT -> 401', r.status === 401, JSON.stringify(r.body));

    r = await call('GET', '/api/locations', { body: { $ne: null } });
    check('Protected route without token -> 401', r.status === 401, JSON.stringify(r.body));

    r = await call('GET', '/api/nope');
    check('Unknown route -> 404', r.status === 404, JSON.stringify(r.body));

    console.log('\n--- 3. Auth ---');
    r = await call('POST', '/api/auth/register', { body: { name: 'Hasna', email: 'hasna@college.edu', password: 'hasna123' } });
    check('Register new user -> 201 + token', r.status === 201 && !!r.body.token, JSON.stringify(r.body));
    const userToken = r.body.token;
    check('Password never returned', r.body.user && r.body.user.password === undefined);
    check('Default role is reader', r.body.user.role === 'reader');

    r = await call('POST', '/api/auth/register', { body: { name: 'Dup', email: 'hasna@college.edu', password: 'hasna123' } });
    check('Duplicate email -> 409', r.status === 409, JSON.stringify(r.body));

    r = await call('POST', '/api/auth/login', { body: { email: 'hasna@college.edu', password: 'wrong' } });
    check('Wrong password -> 401', r.status === 401);

    r = await call('POST', '/api/auth/login', { body: { email: 'hasna@college.edu', password: 'hasna123' } });
    check('Login correct -> 200 + token', r.status === 200 && !!r.body.token);

    r = await call('GET', '/api/auth/me', { token: userToken });
    check('GET /api/auth/me returns profile', r.status === 200 && r.body.user.email === 'hasna@college.edu');

    r = await call('PUT', '/api/auth/profile', { token: userToken, body: { name: 'Hasna M.' } });
    check('Update profile -> 200', r.status === 200 && r.body.user.name === 'Hasna M.');

    r = await call('PUT', '/api/auth/password', { token: userToken, body: { currentPassword: 'hasna123', newPassword: 'newpass99' } });
    check('Change password -> 200', r.status === 200, JSON.stringify(r.body));
    r = await call('POST', '/api/auth/login', { body: { email: 'hasna@college.edu', password: 'newpass99' } });
    check('Login with new password -> 200', r.status === 200);

    console.log('\n--- 4. Role matrix ---');
    r = await call('GET', '/api/admin/stats', { token: userToken });
    check('Reader blocked from admin route -> 403', r.status === 403, JSON.stringify(r.body));

    const User = require('../models/User');
    const hasna = await User.findOne({ email: 'hasna@college.edu' });
    hasna.role = 'admin';
    await hasna.save();
    r = await call('GET', '/api/admin/stats', { token: userToken });
    check('Admin allowed on admin route -> 200', r.status === 200 && r.body.stats, JSON.stringify(r.body));

    console.log('\n--- 5. Location CRUD ---');
    r = await call('POST', '/api/locations', { token: userToken, body: { city: 'Chennai' } });
    check('Add city resolves coords -> 201', r.status === 201 && r.body.location.latitude, JSON.stringify(r.body));
    const locId = r.body.location && r.body.location.id;

    r = await call('POST', '/api/locations', { token: userToken, body: { city: 'Chennai' } });
    check('Duplicate city -> 409', r.status === 409, JSON.stringify(r.body));

    r = await call('POST', '/api/locations', { token: userToken, body: { city: 'zzzznotacity9999' } });
    check('Unknown city -> 404', r.status === 404, JSON.stringify(r.body));

    r = await call('GET', '/api/locations', { token: userToken });
    check('List favourites -> 1 record', r.status === 200 && r.body.locations.length === 1, JSON.stringify(r.body));

    r = await call('PUT', `/api/locations/${locId}`, { token: userToken, body: { city: 'Bengaluru' } });
    check('Update location -> 200', r.status === 200 && r.body.location.city === 'Bengaluru', JSON.stringify(r.body));

    r = await call('GET', '/api/locations/search?q=Delhi');
    check('Public city search works', r.status === 200 && r.body.results.length > 0);

    console.log('\n--- 6. Weather engine (Open-Meteo) ---');
    r = await call('GET', '/api/weather?city=Chennai');
    check('Public weather by city -> 200', r.status === 200 && r.body.weather.current.temperature !== undefined, JSON.stringify(r.body).slice(0, 300));
    check('Weather returns 5 day forecast', r.status === 200 && r.body.weather.forecast.length === 5);
    check('Weather provider recorded', r.status === 200 && !!r.body.weather.provider);

    r = await call('GET', `/api/weather/favourite/${locId}`, { token: userToken });
    check('Favourite weather (guarded) -> 200', r.status === 200 && !!r.body.weather.current.temperature, JSON.stringify(r.body).slice(0, 200));

    r = await call('GET', '/api/weather?latitude=13.08&longitude=80.27');
    check('Weather by coordinates -> 200', r.status === 200);

    r = await call('GET', '/api/weather?latitude=999&longitude=0');
    check('Invalid latitude -> 400', r.status === 400, JSON.stringify(r.body));

    console.log('\n--- 7. AI service ---');
    r = await call('POST', '/api/ai/summary', { body: { city: 'Chennai' } });
    check('POST /api/ai/summary -> 200', r.status === 200 && !!r.body.insight, JSON.stringify(r.body).slice(0, 300));
    check('Insight source is gemini or fallback', ['gemini', 'fallback'].includes(r.body.insight.source), r.body.insight.source);

    r = await call('POST', '/api/ai/recommendation', { body: { city: 'Chennai' } });
    check('POST /api/ai/recommendation -> 200', r.status === 200 && !!r.body.insight.summary, JSON.stringify(r.body).slice(0, 300));

    r = await call('POST', '/api/ai/activity', { body: { city: 'Chennai' } });
    check('POST /api/ai/activity -> 200', r.status === 200, JSON.stringify(r.body).slice(0, 200));

    r = await call('GET', `/api/ai/favourite/${locId}?type=summary`, { token: userToken });
    check('Favourite AI insight (guarded) -> 200', r.status === 200 && !!r.body.insight, JSON.stringify(r.body).slice(0, 200));

    console.log('\n--- 8. Admin operations ---');
    r = await call('GET', '/api/admin/users', { token: userToken });
    check('Admin list users -> 200', r.status === 200 && r.body.count >= 1);

    r = await call('GET', '/api/admin/logs', { token: userToken });
    check('Admin logs captured requests', r.status === 200 && r.body.logs.length > 0);

    r = await call('POST', '/api/auth/register', { body: { name: 'Rahul', email: 'rahul@college.edu', password: 'rahul123' } });
    const rahulId = r.body.user.id;
    r = await call('PUT', `/api/admin/users/${rahulId}/role`, { token: userToken, body: { role: 'user' } });
    check('Admin promotes user role -> 200', r.status === 200 && r.body.user.role === 'user');

    r = await call('PUT', `/api/admin/users/${rahulId}/role`, { token: userToken, body: { role: 'superadmin' } });
    check('Invalid role rejected -> 400', r.status === 400);

    r = await call('PUT', `/api/admin/users/${rahulId}/suspend`, { token: userToken, body: { isActive: false } });
    check('Admin suspends user -> 200', r.status === 200 && r.body.user.isActive === false);

    r = await call('POST', '/api/auth/login', { body: { email: 'rahul@college.edu', password: 'rahul123' } });
    check('Suspended user blocked at login -> 403', r.status === 403, JSON.stringify(r.body));

    r = await call('PUT', `/api/admin/users/${rahulId}/suspend`, { token: userToken, body: { isActive: true } });
    check('Admin reactivates user -> 200', r.status === 200);

    r = await call('DELETE', `/api/admin/users/${rahulId}`, { token: userToken });
    check('Admin deletes user -> 200', r.status === 200);

    r = await call('DELETE', '/api/locations/' + locId, { token: userToken });
    check('Delete location -> 200', r.status === 200);

    r = await call('GET', '/api/locations', { token: userToken });
    check('Favourites empty after delete', r.status === 200 && r.body.locations.length === 0);
  } catch (err) {
    fail++;
    console.error('  ERROR during test run ->', err);
  }

  console.log(`\n======================================`);
  console.log(`  RESULT : ${pass} passed, ${fail} failed`);
  console.log(`======================================\n`);

  server.close();
  await mongoose.disconnect();
  await mongo.stop();
  process.exit(fail ? 1 : 0);
})();
