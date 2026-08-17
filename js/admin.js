/* ============================================
   Studio dashboard
   Reads and writes tools/studios.json through the GitHub Contents API.
   The token lives only in this browser's localStorage — there is no backend.
   Committing triggers Vercel's build, which regenerates studio/index.html.
   ============================================ */

const DATA_PATH = 'tools/studios.json';
const LS_TOKEN = 'sementaun_gh_token';
const LS_REPO = 'sementaun_gh_repo';

const state = {
  token: localStorage.getItem(LS_TOKEN) || '',
  repo: localStorage.getItem(LS_REPO) || 'rharisetiawan/sementaun-site',
  studios: [],
  sha: null,
  dirty: false,
  editingIndex: null,
};

const $ = (id) => document.getElementById(id);

/* ---------- helpers ---------- */

function toast(msg, isError = false) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.toggle('is-error', isError);
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.hidden = true; }, 4000);
}

function setDirty(v) {
  state.dirty = v;
  $('dirtyState').hidden = !v;
  $('btnPublish').disabled = !v;
}

function todayLabel() {
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const d = new Date();
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// GitHub's Contents API is base64, and the data contains non-ASCII characters
// (é, —, ±), so go through UTF-8 explicitly rather than raw atob/btoa.
function b64ToText(b64) {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function textToB64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

async function gh(path, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${state.repo}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${state.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body.message) detail = body.message;
    } catch { /* keep the status-code fallback */ }

    if (res.status === 401) detail = 'Token ditolak. Cek lagi tokennya.';
    if (res.status === 404) detail = 'Repo atau file tidak ditemukan. Cek nama repo dan izin token (Contents: Read and write).';
    throw new Error(detail);
  }

  return res.json();
}

/* ---------- load ---------- */

async function loadStudios() {
  const file = await gh(`contents/${DATA_PATH}`);
  state.sha = file.sha;
  state.studios = JSON.parse(b64ToText(file.content));
  setDirty(false);
  render();
}

/* ---------- render ---------- */

function render() {
  const q = ($('adminSearch').value || '').trim().toLowerCase();
  const filter = $('adminFilter').value;

  const verified = state.studios.filter((s) => s.verified).length;
  $('statTotal').textContent = state.studios.length;
  $('statVerified').textContent = verified;
  $('statUnverified').textContent = state.studios.length - verified;

  const rows = state.studios
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => {
      if (filter === 'verified' && !s.verified) return false;
      if (filter === 'unverified' && s.verified) return false;
      if (!q) return true;
      return `${s.name} ${s.area || ''} ${s.district || ''} ${s.address || ''}`
        .toLowerCase()
        .includes(q);
    });

  $('listHint').textContent = rows.length === state.studios.length
    ? `Menampilkan semua ${rows.length} studio`
    : `Menampilkan ${rows.length} dari ${state.studios.length} studio`;

  const table = $('studioTable');
  table.textContent = '';

  rows.forEach(({ s, i }) => {
    const row = document.createElement('article');
    row.className = 'admin-row' + (s.verified ? ' is-verified' : '');

    const main = document.createElement('div');
    main.className = 'admin-row-main';

    const title = document.createElement('h3');
    title.textContent = s.name;
    if (s.featured) {
      const star = document.createElement('span');
      star.className = 'admin-tag';
      star.textContent = 'Studio kami';
      title.appendChild(star);
    }

    const meta = document.createElement('p');
    meta.className = 'admin-row-meta';
    meta.textContent = [s.district, s.address].filter(Boolean).join(' · ') || 'Alamat belum diisi';

    const price = document.createElement('p');
    price.className = 'admin-row-price';
    price.textContent = s.price || 'Tarif belum ada';

    main.append(title, meta, price);

    const side = document.createElement('div');
    side.className = 'admin-row-side';

    const status = document.createElement('span');
    status.className = 'studio-status ' + (s.verified ? 'studio-status--verified' : 'studio-status--unverified');
    status.textContent = s.verified ? `Terverifikasi · ${s.verifiedOn || '—'}` : 'Belum terverifikasi';

    const edit = document.createElement('button');
    edit.className = 'btn btn-outline btn-sm';
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => openEditor(i));

    side.append(status, edit);
    row.append(main, side);
    table.appendChild(row);
  });
}

/* ---------- editor modal ---------- */

function openEditor(index) {
  state.editingIndex = index;
  const isNew = index === null;
  const s = isNew
    ? { name: '', area: '', district: 'Lowokwaru', address: '', price: '', phone: '', instagram: '', hours: '', notes: '', verified: false, verifiedOn: '' }
    : state.studios[index];

  $('modalTitle').textContent = isNew ? 'Tambah Studio' : 'Edit Studio';
  $('btnDelete').hidden = isNew;

  const f = $('editForm');
  f.name.value = s.name || '';
  f.address.value = s.address || '';
  f.area.value = s.area || '';
  f.district.value = s.district || 'Lowokwaru';
  f.price.value = s.price || '';
  f.hours.value = s.hours || '';
  f.phone.value = s.phone || '';
  f.instagram.value = s.instagram || '';
  f.notes.value = s.notes || '';
  f.verified.checked = !!s.verified;
  f.verifiedOn.value = s.verifiedOn || '';

  syncVerifiedRow();
  $('editModal').hidden = false;
}

function closeEditor() {
  $('editModal').hidden = true;
  state.editingIndex = null;
}

function syncVerifiedRow() {
  const on = $('verifiedCheck').checked;
  $('verifiedOnWrap').hidden = !on;
  const field = $('editForm').verifiedOn;
  if (on && !field.value) field.value = todayLabel();
}

/* ---------- publish ---------- */

async function publish() {
  const msg = $('commitMsg').value.trim() || 'Perbarui data studio';
  const btn = $('btnConfirmPublish');
  const errEl = $('publishError');

  btn.disabled = true;
  btn.textContent = 'Menyimpan…';
  errEl.textContent = '';

  try {
    const body = {
      message: msg,
      content: textToB64(JSON.stringify(state.studios, null, 2) + '\n'),
      sha: state.sha,
    };

    const res = await gh(`contents/${DATA_PATH}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    state.sha = res.content.sha;
    setDirty(false);
    $('publishModal').hidden = true;
    toast('Tersimpan. Vercel sedang membangun ulang situs (1–2 menit).');
  } catch (err) {
    // A 409 means someone else changed the file since we loaded it.
    errEl.textContent = /sha|conflict|409/i.test(err.message)
      ? 'File sudah berubah di GitHub sejak halaman ini dibuka. Muat ulang halaman dulu supaya perubahan orang lain tidak tertimpa.'
      : err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Ya, Publikasikan';
  }
}

/* ---------- wiring ---------- */

$('setupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = $('setupError');
  errEl.textContent = '';

  state.token = $('tokenInput').value.trim();
  state.repo = $('repoInput').value.trim();

  try {
    await loadStudios();
    localStorage.setItem(LS_TOKEN, state.token);
    localStorage.setItem(LS_REPO, state.repo);
    $('setupPanel').hidden = true;
    $('editorPanel').hidden = false;
    $('btnPublish').hidden = false;
    $('btnLogout').hidden = false;
    toast(`${state.studios.length} studio dimuat.`);
  } catch (err) {
    errEl.textContent = err.message;
  }
});

$('btnLogout').addEventListener('click', () => {
  if (state.dirty && !confirm('Ada perubahan yang belum dipublikasikan. Tetap keluar?')) return;
  localStorage.removeItem(LS_TOKEN);
  location.reload();
});

$('adminSearch').addEventListener('input', render);
$('adminFilter').addEventListener('change', render);
$('btnAdd').addEventListener('click', () => openEditor(null));
$('verifiedCheck').addEventListener('change', syncVerifiedRow);

document.querySelectorAll('[data-close]').forEach((el) =>
  el.addEventListener('click', closeEditor)
);
document.querySelectorAll('[data-close-publish]').forEach((el) =>
  el.addEventListener('click', () => { $('publishModal').hidden = true; })
);

$('editForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;

  const entry = {
    name: f.name.value.trim(),
    area: f.area.value.trim(),
    district: f.district.value,
    address: f.address.value.trim(),
    price: f.price.value.trim(),
    phone: f.phone.value.trim(),
    instagram: f.instagram.value.trim(),
    hours: f.hours.value.trim(),
    notes: f.notes.value.trim(),
    verified: f.verified.checked,
    verifiedOn: f.verified.checked ? (f.verifiedOn.value.trim() || todayLabel()) : '',
  };

  if (state.editingIndex === null) {
    state.studios.push(entry);
  } else {
    // preserve the "featured" flag, which the form doesn't expose
    const prev = state.studios[state.editingIndex];
    if (prev.featured) entry.featured = true;
    state.studios[state.editingIndex] = entry;
  }

  setDirty(true);
  closeEditor();
  render();
  toast('Perubahan disimpan sementara. Klik "Simpan & Publikasikan" untuk menerbitkan.');
});

$('btnDelete').addEventListener('click', () => {
  if (state.editingIndex === null) return;
  const s = state.studios[state.editingIndex];
  if (!confirm(`Hapus "${s.name}" dari direktori?`)) return;
  state.studios.splice(state.editingIndex, 1);
  setDirty(true);
  closeEditor();
  render();
  toast('Studio dihapus. Publikasikan untuk menerapkan.');
});

$('btnPublish').addEventListener('click', () => {
  const verified = state.studios.filter((s) => s.verified).length;
  $('publishSummary').textContent =
    `Akan menerbitkan ${state.studios.length} studio (${verified} terverifikasi).`;
  $('publishError').textContent = '';
  $('publishModal').hidden = false;
});

$('btnConfirmPublish').addEventListener('click', publish);

window.addEventListener('beforeunload', (e) => {
  if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
});

/* ---------- auto-login if a token is already stored ---------- */
(async function boot() {
  if (!state.token) return;
  $('tokenInput').value = state.token;
  $('repoInput').value = state.repo;
  try {
    await loadStudios();
    $('setupPanel').hidden = true;
    $('editorPanel').hidden = false;
    $('btnPublish').hidden = false;
    $('btnLogout').hidden = false;
  } catch (err) {
    $('setupError').textContent = `Token tersimpan tidak bisa dipakai: ${err.message}`;
  }
})();
