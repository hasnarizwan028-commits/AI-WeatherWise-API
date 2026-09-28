/* Dashboard logic: favourites, live weather, AI insight, explore, profile */

if (!requireAuth()) throw new Error('unauthenticated');
setupNavbar('favourites');

let locations = [];
let activeId = null;
let lastWeather = null;

/* ---------------------------- greeting ---------------------------- */
const u = store.user || { name: 'there' };
const hour = new Date().getHours();
const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
$('#greeting').textContent = `${part}, ${u.name}!`;
$('#aiSource').textContent = 'loading…';
$('#aiSource').className = 'badge warn';

api.aiStatus()
  .then((s) => {
    const b = $('#aiSource');
    b.textContent = s.gemini.enabled ? `Gemini · ${s.gemini.model}` : 'Fallback mode';
    b.className = `badge ${s.gemini.enabled ? 'ok' : 'warn'}`;
  })
  .catch(() => {});

/* ---------------------------- weather render ---------------------------- */
function renderWeather(weather) {
  lastWeather = weather;
  const c = weather.current;
  const u0 = weather.units;

  $('#currentCard').style.display = '';
  $('#cityName').textContent = `${weather.location.city}${weather.location.country ? ', ' + weather.location.country : ''}`;
  $('#providerBadge').textContent = weather.provider;
  $('#temp').textContent = `${c.temperature ?? '—'}${u0.temperature}`;
  $('#condition').textContent = `${c.condition || 'Unknown'} · feels like ${c.apparentTemperature ?? '—'}${u0.temperature}${c.observedAt ? ' · ' + String(c.observedAt).replace('T', ' ').slice(0, 16) : ''}`;
  $('#icon').textContent = iconFor(c.icon);

  const stats = [
    ['Humidity', `${c.humidity ?? '—'}${u0.humidity}`],
    ['Wind', `${c.windSpeed ?? '—'} ${u0.windSpeed}`],
    ['Gusts', `${c.windGusts ?? '—'} ${u0.windSpeed}`],
    ['Rain now', `${c.precipitation ?? 0} mm`],
    ['Pressure', `${c.pressure ?? '—'} ${u0.pressure}`],
    ['Cloud cover', `${c.cloudCover ?? '—'}%`],
  ];
  $('#stats').innerHTML = stats
    .map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`)
    .join('');

  $('#forecast').innerHTML = (weather.forecast || [])
    .map((d, i) => {
      const rain = Number(d.precipitationProbability || 0);
      return `<div class="day">
        <div class="d">${dayLabel(d.date, i)}</div>
        <div>${iconFor(d.icon)}</div>
        <div class="t">${d.tempMax ?? '—'}° / ${d.tempMin ?? '—'}°</div>
        <div class="d">${d.condition || ''}</div>
        <div class="bar"><span style="width:${Math.min(100, rain)}%"></span></div>
        <div class="d">${rain}% rain</div>
      </div>`;
    })
    .join('') || '<div class="muted">Forecast unavailable from the active provider.</div>';
}

/* ---------------------------- AI insight ---------------------------- */
async function loadInsight(locationId) {
  const box = $('#aiText');
  const chips = $('#aiChips');
  chips.innerHTML = '';
  box.innerHTML = '<div class="skeleton"></div><div class="skeleton" style="width:75%"></div>';

  const task = $('#aiPanel').dataset.task || 'summary';
  try {
    const res = locationId
      ? await api.favouriteInsight(locationId, task)
      : await api.recommendation($('#exploreCity').value.trim() || (lastWeather && lastWeather.location.city));

    const ins = res.insight || {};
    const parts = [];

    if (ins.summary) parts.push(`<p>${ins.summary}</p>`);
    if (ins.wear) parts.push(`<p><strong>👕 What to wear:</strong> ${ins.wear}</p>`);
    if (ins.safety) parts.push(`<p><strong>⚠ Safety:</strong> ${ins.safety}</p>`);
    if (ins.advice) parts.push(`<p><strong>💡 Advice:</strong> ${ins.advice}</p>`);
    if (!parts.length && ins.raw) parts.push(`<p>${ins.raw.replace(/\n/g, '<br>')}</p>`);

    const list = ins.activities || ins.ideas;
    if (list && list.length) parts.push(`<p><strong>🎯 Ideas:</strong></p><ul>${list.map((a) => `<li>${a}</li>`).join('')}</ul>`);
    if (ins.note) parts.push(`<p class="muted" style="font-size:.82rem">${ins.note}</p>`);

    box.innerHTML = parts.join('') || '<p class="muted">No insight returned.</p>';

    $('#aiSource').textContent = ins.source === 'gemini' ? `Gemini · ${ins.model || ''}` : 'Fallback engine';
    $('#aiSource').className = `badge ${ins.source === 'gemini' ? 'ok' : 'warn'}`;

    if (list && list.length) chips.innerHTML = list.map((a) => `<span class="chip">${a}</span>`).join('');
  } catch (err) {
    box.innerHTML = `<p style="color:var(--err)">${err.message}</p>`;
  }
}

$$('#aiPanel [data-ai]').forEach((b) =>
  b.addEventListener('click', () => {
    $$('#aiPanel [data-ai]').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    $('#aiPanel').dataset.task = b.dataset.ai;
    loadInsight(activeId);
  })
);

/* ---------------------------- favourites ---------------------------- */
function renderCities() {
  const list = $('#cityList');
  if (!locations.length) {
    list.innerHTML = '<div class="item"><span class="muted">No cities saved yet. Add one above to unlock personalised AI advice.</span></div>';
    return;
  }
  list.innerHTML = locations
    .map(
      (l) => `<div class="item">
        <div>
          <div class="title">${iconFor(l.weather ? l.weather.current.icon : 'cloud')} ${l.city}, ${l.country}</div>
          <div class="muted">${l.weather ? `${l.weather.current.temperature}°C · ${l.weather.current.condition}` : 'Tap view to load live metrics'}</div>
        </div>
        <div class="row">
          <button class="btn sm" data-view="${l.id}">View</button>
          <button class="btn sm ghost" data-ai-loc="${l.id}">AI advice</button>
          <button class="btn sm danger" data-del="${l.id}">Remove</button>
        </div>
      </div>`
    )
    .join('');

  list.querySelectorAll('[data-view]').forEach((b) =>
    b.addEventListener('click', () => selectCity(b.dataset.view))
  );
  list.querySelectorAll('[data-ai-loc]').forEach((b) =>
    b.addEventListener('click', () => {
      activeId = b.dataset.aiLoc;
      $('#aiPanel').dataset.task = $('#aiPanel').dataset.task || 'recommendation';
      loadInsight(activeId);
      $('#aiPanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
    })
  );
  list.querySelectorAll('[data-del]').forEach((b) =>
    b.addEventListener('click', () => removeCity(b.dataset.del))
  );
}

async function loadCities() {
  try {
    const data = await api.listLocations();
    locations = data.locations;
    renderCities();
  } catch (err) {
    showMsg($('#cityMsg'), err.message, 'err');
  }
}

async function selectCity(id) {
  activeId = id;
  $('#currentCard').style.display = 'none';
  $('#currentCard').innerHTML = '<div class="skeleton"></div><div class="skeleton" style="width:60%"></div>';
  $('#currentCard').style.display = '';
  try {
    const data = await api.favouriteWeather(id);
    renderWeather(data.weather);
    loadInsight(id);
  } catch (err) {
    showMsg($('#cityMsg'), err.message, 'err');
  }
}

$('#addCityBtn').addEventListener('click', async () => {
  const input = $('#newCity');
  const city = input.value.trim();
  const btn = $('#addCityBtn');
  clearMsg($('#cityMsg'));
  if (!city) return showMsg($('#cityMsg'), 'Enter a city name first.', 'err');

  busy(btn, true, 'Adding…');
  try {
    const data = await api.addLocation(city);
    input.value = '';
    showMsg($('#cityMsg'), data.message, 'ok');
    await loadCities();
    selectCity(data.location.id);
  } catch (err) {
    showMsg($('#cityMsg'), err.message, 'err');
  } finally {
    busy(btn, false);
  }
});

$('#newCity').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#addCityBtn').click(); });

async function removeCity(id) {
  if (!confirm('Remove this city from your favourites?')) return;
  try {
    const data = await api.deleteLocation(id);
    showMsg($('#cityMsg'), data.message, 'ok');
    if (activeId === id) { activeId = null; $('#currentCard').style.display = 'none'; }
    await loadCities();
  } catch (err) {
    showMsg($('#cityMsg'), err.message, 'err');
  }
}

/* ---------------------------- explore ---------------------------- */
$('#exploreBtn').addEventListener('click', async () => {
  const city = $('#exploreCity').value.trim();
  const out = $('#exploreOut');
  const btn = $('#exploreBtn');
  if (!city) return (out.innerHTML = '<div class="msg show err">Enter a city name.</div>');

  busy(btn, true, 'Fetching…');
  out.innerHTML = '<div class="skeleton"></div>';
  try {
    const data = await api.weather(city);
    renderWeather(data.weather);
    activeId = null;
    loadInsight(null);
    out.innerHTML = '';
    $('#currentCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    out.innerHTML = `<div class="msg show err">${err.message}</div>`;
  } finally {
    busy(btn, false);
  }
});

$('#exploreCity').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#exploreBtn').click(); });

/* ---------------------------- profile ---------------------------- */
$('#pName').value = store.user?.name || '';
$('#pEmail').value = store.user?.email || '';

$('#saveProfile').addEventListener('click', async () => {
  const btn = $('#saveProfile');
  busy(btn, true, 'Saving…');
  try {
    const data = await api.updateProfile({ name: $('#pName').value.trim(), email: $('#pEmail').value.trim() });
    store.user = data.user;
    showMsg($('#pMsg'), data.message, 'ok');
    $('#greeting').textContent = `Welcome back, ${data.user.name}!`;
  } catch (err) {
    showMsg($('#pMsg'), err.message, 'err');
  } finally {
    busy(btn, false);
  }
});

$('#savePass').addEventListener('click', async () => {
  const btn = $('#savePass');
  busy(btn, true, 'Updating…');
  try {
    const data = await api.changePassword({
      currentPassword: $('#curPass').value,
      newPassword: $('#newPass').value,
    });
    $('#curPass').value = $('#newPass').value = '';
    showMsg($('#passMsg'), data.message, 'ok');
  } catch (err) {
    showMsg($('#passMsg'), err.message, 'err');
  } finally {
    busy(btn, false);
  }
});

/* ---------------------------- init ---------------------------- */
loadCities();
if (location.hash === '#explore') $('#exploreCity').focus();
