/* Login / Register page logic */

if (store.token) {
  api.me()
    .then(() => (location.href = '/dashboard.html'))
    .catch(() => store.clear());
}

const tabLogin = $('#tabLogin');
const tabRegister = $('#tabRegister');
const loginForm = $('#loginForm');
const registerForm = $('#registerForm');

function switchTab(which) {
  const login = which === 'login';
  tabLogin.classList.toggle('active', login);
  tabRegister.classList.toggle('active', !login);
  loginForm.classList.toggle('hidden', !login);
  registerForm.classList.toggle('hidden', login);
  clearMsg($('#loginMsg'));
  clearMsg($('#registerMsg'));
}
tabLogin.addEventListener('click', () => switchTab('login'));
tabRegister.addEventListener('click', () => switchTab('register'));

/* ----------------------------- LOGIN ----------------------------- */
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('#loginMsg');
  const btn = $('#loginBtn');
  clearMsg(msg);
  busy(btn, true, 'Signing in…');
  try {
    const data = await api.login({
      email: $('#loginEmail').value.trim(),
      password: $('#loginPassword').value,
    });
    store.token = data.token;
    store.user = data.user;
    showMsg(msg, 'Welcome back! Redirecting…', 'ok');
    setTimeout(() => (location.href = data.user.role === 'admin' ? '/admin.html' : '/dashboard.html'), 700);
  } catch (err) {
    showMsg(msg, err.message, 'err');
    busy(btn, false);
  }
});

/* ---------------------------- REGISTER ---------------------------- */
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('#registerMsg');
  const btn = $('#registerBtn');
  clearMsg(msg);
  busy(btn, true, 'Creating account…');
  try {
    const data = await api.register({
      name: $('#regName').value.trim(),
      email: $('#regEmail').value.trim(),
      password: $('#regPassword').value,
    });
    store.token = data.token;
    store.user = data.user;
    showMsg(msg, 'Account created! Redirecting…', 'ok');
    setTimeout(() => (location.href = '/dashboard.html'), 700);
  } catch (err) {
    showMsg(msg, err.message, 'err');
    busy(btn, false);
  }
});

/* --------------------- PUBLIC QUICK WEATHER CHECK --------------------- */
$('#quickBtn').addEventListener('click', async () => {
  const city = $('#quickCity').value.trim();
  const out = $('#quickOut');
  if (!city) return (out.innerHTML = '<div class="msg show err">Enter a city name.</div>');
  out.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
  try {
    const { weather } = await api.weather(city);
    const c = weather.current;
    out.innerHTML = `
      <div class="card" style="padding:14px">
        <div class="weather-hero">
          <div>
            <div class="title" style="font-weight:700">${weather.location.city}, ${weather.location.country || ''}</div>
            <div class="muted">${c.condition} · provider: ${weather.provider}</div>
            <div class="temp">${c.temperature}${weather.units.temperature}</div>
            <div class="muted">Feels like ${c.apparentTemperature}${weather.units.temperature}</div>
          </div>
          <div class="icon">${iconFor(c.icon)}</div>
        </div>
      </div>`;
  } catch (err) {
    out.innerHTML = `<div class="msg show err">${err.message}</div>`;
  }
});

/* ------------------------- SYSTEM STATUS ------------------------- */
api.health()
  .then((h) => {
    const b = $('#healthBadge');
    b.className = `badge ${h.status === 'ok' ? 'ok' : 'err'}`;
    b.textContent = `${h.status} · AI: ${h.aiEnabled ? 'Gemini' : 'fallback'}`;
  })
  .catch(() => {
    const b = $('#healthBadge');
    b.className = 'badge err';
    b.textContent = 'server offline - run npm run dev';
  });
