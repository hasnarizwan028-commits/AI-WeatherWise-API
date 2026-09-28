/* ==========================================================================
   Shared API client for the AI WeatherWise frontend.
   All requests are relative, so the same build works on localhost and on
   any free host (Render / Railway / Vercel) without a config change.
   ========================================================================== */

const API_BASE = window.WEATHERWISE_API_BASE || '/api';

const store = {
  get token() { return localStorage.getItem('ww_token') || ''; },
  set token(v) { v ? localStorage.setItem('ww_token', v) : localStorage.removeItem('ww_token'); },
  get user() {
    try { return JSON.parse(localStorage.getItem('ww_user') || 'null'); } catch { return null; }
  },
  set user(v) { v ? localStorage.setItem('ww_user', JSON.stringify(v)) : localStorage.removeItem('ww_user'); },
  clear() { this.token = ''; this.user = null; },
};

/* ---------------------------- fetch wrapper ---------------------------- */
async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && store.token) headers.Authorization = `Bearer ${store.token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Network error - is the server running on port 5000?');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && auth) {
      store.clear();
      if (!location.pathname.endsWith('index.html') && location.pathname !== '/') location.href = '/';
    }
    const extra = data.errors ? ` (${JSON.stringify(data.errors)})` : '';
    throw new Error((data.message || `Request failed (${res.status})`) + extra);
  }
  return data;
}

const api = {
  // system
  health: () => request('/health', { auth: false }),

  // auth
  register: (b) => request('/auth/register', { method: 'POST', body: b, auth: false }),
  login: (b) => request('/auth/login', { method: 'POST', body: b, auth: false }),
  me: () => request('/auth/me'),
  updateProfile: (b) => request('/auth/profile', { method: 'PUT', body: b }),
  changePassword: (b) => request('/auth/password', { method: 'PUT', body: b }),

  // locations
  listLocations: () => request('/locations'),
  addLocation: (city) => request('/locations', { method: 'POST', body: { city } }),
  deleteLocation: (id) => request(`/locations/${id}`, { method: 'DELETE' }),
  searchCities: (q) => request(`/locations/search?q=${encodeURIComponent(q)}`, { auth: false }),

  // weather
  weather: (city) => request(`/weather?city=${encodeURIComponent(city)}`, { auth: false }),
  favouriteWeather: (id) => request(`/weather/favourite/${id}`),

  // ai
  aiStatus: () => request('/ai/status', { auth: false }),
  summary: (city) => request('/ai/summary', { method: 'POST', body: { city }, auth: false }),
  recommendation: (city) => request('/ai/recommendation', { method: 'POST', body: { city }, auth: false }),
  activities: (city) => request('/ai/activity', { method: 'POST', body: { city }, auth: false }),
  favouriteInsight: (id, type = 'recommendation') => request(`/ai/favourite/${id}?type=${type}`),

  // admin
  adminStats: () => request('/admin/stats'),
  adminUsers: () => request('/admin/users'),
  adminLogs: () => request('/admin/logs'),
  setRole: (id, role) => request(`/admin/users/${id}/role`, { method: 'PUT', body: { role } }),
  setActive: (id, isActive) => request(`/admin/users/${id}/suspend`, { method: 'PUT', body: { isActive } }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
};

/* ---------------------------- UI helpers ---------------------------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function showMsg(el, text, type = 'ok') {
  if (!el) return;
  el.className = `msg show ${type}`;
  el.textContent = text;
}

function clearMsg(el) { if (el) el.className = 'msg'; }

function busy(btn, on, labelWhenBusy = 'Working...') {
  if (!btn) return;
  if (on) {
    btn.dataset.label = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> ${labelWhenBusy}`;
  } else {
    btn.disabled = false;
    if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
  }
}

const ICONS = { sun: '☀️', 'cloud-sun': '⛅', cloud: '☁️', rain: '🌧️', snow: '❄️', fog: '🌫️', storm: '⛈️' };
const iconFor = (name) => ICONS[name] || '🌡️';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayLabel = (iso, i) => {
  if (!iso) return `Day ${i + 1}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? `Day ${i + 1}` : i === 0 ? 'Today' : WEEKDAYS[d.getDay()];
};

function requireAuth() {
  if (!store.token) { location.href = '/'; return false; }
  return true;
}

function setupNavbar(activeTab) {
  const user = store.user;
  const host = $('#navLinks');
  if (!host) return;
  const isAdmin = user && user.role === 'admin';
  const tabs = [
    ['home', 'Home', 'index.html'],
    ['favourites', 'My Cities', 'dashboard.html#favourites'],
    ['explore', 'Explore', 'dashboard.html#explore'],
  ];
  if (isAdmin) tabs.push(['admin', 'Admin', 'admin.html']);

  host.innerHTML =
    tabs.map(([id, label, href]) => `<a href="${href}" class="${id === activeTab ? 'active' : ''}">${label}</a>`).join('') +
    `<span class="badge">👤 ${user ? user.name : 'Guest'}</span>` +
    `<button id="logoutBtn" class="ghost" style="border:1px solid var(--border)">Logout</button>`;

  const out = document.getElementById('logoutBtn');
  if (out) out.addEventListener('click', () => { store.clear(); location.href = '/'; });
}
