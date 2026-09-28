/* Admin console logic - every call here is shielded by the role matrix on the server */

if (!requireAuth()) throw new Error('unauthenticated');
setupNavbar('admin');

if (!store.user || store.user.role !== 'admin') {
  document.querySelector('main').innerHTML =
    '<div class="card" style="margin-top:40px"><h2>403 - Access denied</h2><p class="muted">Your role does not satisfy the admin threshold for this route.</p><a href="/dashboard.html">Back to dashboard</a></div>';
  throw new Error('forbidden');
}

async function loadStats() {
  try {
    const { stats } = await api.adminStats();
    const cards = [
      ['Total users', stats.users],
      ['Active', stats.activeUsers],
      ['Suspended', stats.suspendedUsers],
      ['Saved locations', stats.locations],
    ];
    $('#stats').innerHTML = cards
      .map(([k, v]) => `<div class="card stat"><div class="k">${k}</div><div class="v">${v}</div></div>`)
      .join('');
  } catch (err) {
    showMsg($('#adminMsg'), err.message, 'err');
  }
}

async function loadUsers() {
  const body = $('#usersBody');
  body.innerHTML = '<tr><td colspan="6"><div class="skeleton"></div></td></tr>';
  try {
    const { users } = await api.adminUsers();
    body.innerHTML = users
      .map(
        (u) => `<tr>
          <td>${u.name}</td>
          <td>${u.email}</td>
          <td>
            <select data-role="${u.id}">
              ${['reader', 'user', 'admin'].map((r) => `<option ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}
            </select>
          </td>
          <td><span class="badge ${u.isActive ? 'ok' : 'err'}">${u.isActive ? 'active' : 'suspended'}</span></td>
          <td>${new Date(u.createdAt).toLocaleDateString()}</td>
          <td>
            <div class="row">
              <button class="btn sm" data-save="${u.id}">Save role</button>
              <button class="btn sm ghost" data-toggle="${u.id}" data-active="${u.isActive}">${u.isActive ? 'Suspend' : 'Reactivate'}</button>
              <button class="btn sm danger" data-del="${u.id}">Delete</button>
            </div>
          </td>
        </tr>`
      )
      .join('');

    body.querySelectorAll('[data-save]').forEach((b) =>
      b.addEventListener('click', async () => {
        const id = b.dataset.save;
        const role = body.querySelector(`select[data-role="${id}"]`).value;
        try {
          const r = await api.setRole(id, role);
          showMsg($('#adminMsg'), r.message, 'ok');
          store.user = r.user;
        } catch (err) { showMsg($('#adminMsg'), err.message, 'err'); }
      })
    );

    body.querySelectorAll('[data-toggle]').forEach((b) =>
      b.addEventListener('click', async () => {
        try {
          const r = await api.setActive(b.dataset.toggle, b.dataset.active !== 'true');
          showMsg($('#adminMsg'), r.message, 'ok');
          loadUsers(); loadStats();
        } catch (err) { showMsg($('#adminMsg'), err.message, 'err'); }
      })
    );

    body.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', async () => {
        if (!confirm('Permanently delete this user and all their locations?')) return;
        try {
          const r = await api.deleteUser(b.dataset.del);
          showMsg($('#adminMsg'), r.message, 'ok');
          loadUsers(); loadStats();
        } catch (err) { showMsg($('#adminMsg'), err.message, 'err'); }
      })
    );
  } catch (err) {
    body.innerHTML = `<tr><td colspan="6" style="color:var(--err)">${err.message}</td></tr>`;
  }
}

$('#refreshBtn').addEventListener('click', () => { loadUsers(); loadStats(); });
$('#logsBtn').addEventListener('click', async () => {
  const card = $('#logsCard');
  try {
    const { logs } = await api.adminLogs();
    $('#logsTable').innerHTML = `<thead><tr><th>Time</th><th>Method</th><th>Path</th><th>Status</th><th>User</th><th>ms</th></tr></thead><tbody>${
      logs.map((l) => `<tr><td>${new Date(l.time).toLocaleString()}</td><td>${l.method}</td><td>${l.path}</td><td>${l.status}</td><td>${l.user}</td><td>${l.ms}</td></tr>`).join('') || '<tr><td colspan="6">No requests logged yet.</td></tr>'
    }</tbody>`;
    card.style.display = card.style.display === 'none' ? '' : 'none';
  } catch (err) {
    showMsg($('#adminMsg'), err.message, 'err');
  }
});
$('#closeLogs').addEventListener('click', () => ($('#logsCard').style.display = 'none'));

loadStats();
loadUsers();
