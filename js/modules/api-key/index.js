// DesaBiz AI - Modul Konfigurasi API Key Fonnte (KHUSUS ADMIN)
// ---------------------------------------------------------------------------
// Menu pengelolaan kredensial Fonnte WhatsApp Gateway:
// - Simpan / perbarui API key (disimpan terenkripsi di backend, dimasking)
// - Tampilkan/Sembunyikan API key saat diketik
// - Tes koneksi Fonnte sungguhan (pengiriman pesan percobaan)
// - Informasi status koneksi, waktu pembaruan terakhir, sumber token
// - Hapus / nonaktifkan konfigurasi
//
// KEAMANAN: token TIDAK PERNAH disimpan di JS/localStorage, tidak dikirim
// utuh ke frontend, dan tidak pernah dicatat ke log. Semua aksi diverifikasi
// role ADMIN oleh backend (api/fonnte-config.php).
import { Icons } from '../../icons.js';
import { appState } from '../../state.js';
import { AuthModule } from '../auth/index.js';

// Escape teks sebelum dirender ke HTML (keamanan dasar XSS)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

export const ApiKeyModule = {
  id: 'apikey',
  title: 'Konfigurasi WhatsApp Fonnte',
  subtitle: 'Kelola kredensial Fonnte WhatsApp Gateway untuk seluruh notifikasi DesaBiz AI',

  render: (container) => {
    // Pengecekan ganda (defense in depth) — router sudah melakukan guard.
    if (!appState.isAdmin()) {
      container.innerHTML = `
        <div class="fade-in">
          <div class="card" style="max-width: 560px; margin: 4rem auto; text-align: center; border-left: 4px solid var(--color-danger, #ef4444);">
            <div class="module-icon-large" style="color: var(--color-danger, #ef4444); background: #fef2f2; border-color: #fecaca; margin-bottom: 1rem;">${Icons.key}</div>
            <h2 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 0.5rem;">Akses Ditolak</h2>
            <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1.25rem;">
              Menu <strong>Konfigurasi WhatsApp Fonnte</strong> hanya tersedia untuk akun <strong>ADMINISTRATOR</strong>.
              Anda masuk sebagai akun <strong>UMKM</strong>.
            </p>
            <a href="#/dashboard" class="btn btn-primary">${Icons.arrowLeft} Kembali ke Dashboard</a>
          </div>
        </div>`;
      return;
    }

    const user = appState.getState().user;

    container.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <div class="page-header-info">
            <div class="breadcrumbs">
              <a href="#/dashboard">Beranda</a>
              <span class="breadcrumb-separator">/</span>
              <span class="breadcrumb-item active">Konfigurasi WhatsApp Fonnte</span>
            </div>
            <h1 class="page-title">${ApiKeyModule.title}</h1>
            <p class="page-subtitle">${ApiKeyModule.subtitle}</p>
          </div>
          <span class="badge" style="background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe;">
            ${Icons.shieldCheck} Role: ADMIN • ${esc(user.ownerName)}
          </span>
        </div>

        <div class="grid-config">
          <!-- ================= FORM API KEY ================= -->
          <div class="card">
            <div class="card-header" style="margin-bottom: 0.75rem;">
              <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem; margin: 0;">
                <span>${Icons.key}</span> API Key Fonnte
              </h4>
            </div>
            <div class="card-body">
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                Masukkan token akun Fonnte Anda. Token disimpan <strong>terenkripsi (AES-256)</strong> di server
                dan <strong>tidak pernah</strong> dikirim utuh ke browser maupun dicatat ke log.
              </p>

              <div style="margin-bottom: 0.75rem;">
                <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-input); margin-bottom: 0.35rem;">
                  API Key Fonnte <span style="color: red;">*</span>
                </label>
                <div style="display: flex; gap: 0.5rem; align-items: stretch;">
                  <input
                    type="password"
                    id="apikey-input"
                    class="form-input"
                    placeholder="Contoh: TjYpMikW6fesRUUi9XT4"
                    autocomplete="off"
                    spellcheck="false"
                    style="flex: 1; min-width: 0; font-family: monospace; letter-spacing: 0.05em;"
                  >
                  <button type="button" id="apikey-toggle-visibility" class="btn btn-secondary" title="Tampilkan/Sembunyikan API Key" style="padding: 0 0.85rem;">
                    ${Icons.eye}
                  </button>
                </div>
                <small id="apikey-hint" style="display: block; margin-top: 0.35rem; font-size: 0.75rem; color: var(--text-muted);">
                  Token tersimpan tidak dapat dilihat kembali secara utuh — hanya masking.
                </small>
              </div>

              <div id="apikey-form-status" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; min-height: 1.1rem;">
                Memuat status konfigurasi…
              </div>
            </div>

            <div class="card-footer" style="padding: 0.75rem; border-top: 1px solid var(--border-light); display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button id="apikey-save-btn" class="btn btn-primary" style="flex: 1; min-width: 170px;">
                💾 Simpan API Key
              </button>
              <button id="apikey-update-btn" class="btn btn-secondary" style="flex: 1; min-width: 170px;" disabled>
                🔄 Perbarui API Key
              </button>
              <button id="apikey-test-btn" class="btn btn-secondary" style="flex: 1; min-width: 170px;">
                🧪 Tes Koneksi Fonnte
              </button>
              <button id="apikey-delete-btn" class="btn btn-danger" style="flex: 1; min-width: 170px;" disabled>
                🗑️ Hapus / Nonaktifkan
              </button>
              <small style="color: var(--text-muted); font-size: 0.75rem; width: 100%; margin-top: 0.25rem;">
                Tes Koneksi mengirim pesan percobaan sungguhan ke nomor WhatsApp Anda melalui
                <code>https://api.fonnte.com/send</code> — status tersimpan bukan sekadar "berhasil disimpan".
              </small>
            </div>
          </div>

          <!-- ================= STATUS KONEKSI ================= -->
          <div class="card" id="apikey-status-card">
            <div class="card-header" style="margin-bottom: 0.75rem;">
              <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem; margin: 0;">
                <span>${Icons.shieldCheck}</span> Status Koneksi
              </h4>
            </div>
            <div class="card-body">
              <div id="apikey-conn-badge" style="margin-bottom: 1rem;">
                <span class="badge" style="background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;">⏳ Memuat…</span>
              </div>

              <div style="display: flex; flex-direction: column; gap: 0.6rem; font-size: 0.83rem;">
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">Token tersimpan</span>
                  <strong id="apikey-mask" style="font-family: monospace;">—</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">Sumber token</span>
                  <strong id="apikey-source">—</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">Endpoint</span>
                  <strong style="font-size: 0.75rem; font-family: monospace; text-align: right;">https://api.fonnte.com/send</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">Terakhir diperbarui</span>
                  <strong id="apikey-updated">—</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">Terakhir diuji</span>
                  <strong id="apikey-tested">—</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">Koneksi database</span>
                  <strong id="apikey-db">—</strong>
                </div>
              </div>

              <div id="apikey-test-result" style="display: none; margin-top: 1rem; padding: 0.75rem; border-radius: var(--radius-md, 8px); font-size: 0.8rem; line-height: 1.5;"></div>

              <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-light); font-size: 0.78rem; color: var(--text-muted); line-height: 1.7;">
                <strong style="color: var(--text-main);">Keamanan konfigurasi:</strong><br>
                • Token dienkripsi AES-256 sebelum masuk database<br>
                • Token tidak pernah muncul di HTML, JavaScript, URL, atau log<br>
                • Hanya akun ADMINISTRATOR yang dapat mengelola menu ini<br>
                • Penjual & Pembeli tidak memiliki akses ke halaman ini
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // ==========================================================
    // ELEMEN & STATE TAMPILAN
    // ==========================================================
    const input      = container.querySelector('#apikey-input');
    const toggleBtn  = container.querySelector('#apikey-toggle-visibility');
    const hint       = container.querySelector('#apikey-hint');
    const formStatus = container.querySelector('#apikey-form-status');
    const saveBtn    = container.querySelector('#apikey-save-btn');
    const updateBtn  = container.querySelector('#apikey-update-btn');
    const testBtn    = container.querySelector('#apikey-test-btn');
    const deleteBtn  = container.querySelector('#apikey-delete-btn');

    const badgeBox   = container.querySelector('#apikey-conn-badge');
    const maskEl     = container.querySelector('#apikey-mask');
    const sourceEl   = container.querySelector('#apikey-source');
    const updatedEl  = container.querySelector('#apikey-updated');
    const testedEl   = container.querySelector('#apikey-tested');
    const dbEl       = container.querySelector('#apikey-db');
    const testResult = container.querySelector('#apikey-test-result');

    let current = null; // status terakhir dari server

    const setBusy = (btn, busy, label) => {
      if (busy) {
        btn.dataset.label = btn.textContent;
        btn.disabled = true;
        btn.textContent = label;
      } else {
        btn.disabled = false;
        btn.textContent = btn.dataset.label || btn.textContent;
      }
    };

    const fmtDate = (v) => (v ? String(v).replace('T', ' ').slice(0, 19) : '—');

    const renderStatus = (s) => {
      current = s;
      const configured = !!s.configured;
      const live = !!s.is_live;

      if (s.status !== 'success') {
        badgeBox.innerHTML = `<span class="badge" style="background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;">⚠️ ${esc(s.message || 'Gagal memuat status')}</span>`;
        formStatus.textContent = s.message || 'Gagal memuat status konfigurasi.';
        return;
      }

      // Badge status koneksi
      if (configured && live) {
        badgeBox.innerHTML = `<span class="badge" style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;">✅ Terkonfigurasi & siap digunakan</span>`;
      } else if (live) {
        badgeBox.innerHTML = `<span class="badge" style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;">ℹ️ Memakai token bawaan config/fonnte.php</span>`;
      } else {
        badgeBox.innerHTML = `<span class="badge" style="background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa;">⏳ Belum dikonfigurasi (mode simulasi)</span>`;
      }

      maskEl.textContent     = s.token_mask || '—';
      sourceEl.textContent   = s.source === 'database' ? 'Database (terenkripsi)' : 'config/fonnte.php';
      updatedEl.textContent  = s.updated_at ? `${fmtDate(s.updated_at)}${s.updated_by ? ' oleh ' + esc(s.updated_by) : ''}` : 'Belum pernah';
      testedEl.textContent   = s.last_test_at
        ? `${fmtDate(s.last_test_at)} • ${s.last_test_status === 'success' ? 'berhasil' : s.last_test_status === 'failed' ? 'gagal' : s.last_test_status}`
        : 'Belum pernah diuji';
      dbEl.textContent       = s.database_conn || '—';

      // Tombol
      updateBtn.disabled  = !configured;
      deleteBtn.disabled  = !configured;
      saveBtn.disabled    = configured;
      formStatus.innerHTML = configured
        ? `API key tersimpan (<strong style="color: var(--color-primary);">${esc(s.token_mask)}</strong>). Isi kolom di atas lalu klik <strong>Perbarui API Key</strong> untuk mengganti.`
        : 'Belum ada API key tersimpan. Masukkan API key lalu klik Simpan API Key.';
    };

    const showTestResult = (ok, text) => {
      testResult.style.display = 'block';
      testResult.style.background = ok ? '#ecfdf5' : '#fef2f2';
      testResult.style.color = ok ? '#047857' : '#b91c1c';
      testResult.style.border = ok ? '1px solid #a7f3d0' : '1px solid #fecaca';
      testResult.innerHTML = text;
    };

    // ==========================================================
    // MUAT STATUS DARI SERVER
    // ==========================================================
    const loadStatus = async () => {
      const s = await appState.fonnteConfigStatus(user.id);
      renderStatus(s);
    };
    loadStatus();

    // ==========================================================
    // EVENT: TAMPILKAN / SEMBUNYIKAN API KEY
    // ==========================================================
    toggleBtn.onclick = () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      toggleBtn.title = show ? 'Sembunyikan API Key' : 'Tampilkan API Key';
      hint.textContent = show
        ? 'API key ditampilkan sementara. Jangan bagikan layar ini.'
        : 'Token tersimpan tidak dapat dilihat kembali secara utuh — hanya masking.';
    };

    // ==========================================================
    // EVENT: SIMPAN / PERBARUI API KEY
    // ==========================================================
    const submitKey = async () => {
      const apiKey = (input.value || '').trim();

      if (!apiKey) {
        AuthModule.showToast('API Key Fonnte tidak boleh kosong.');
        input.focus();
        return;
      }
      if (!/^[A-Za-z0-9_\-]{6,128}$/.test(apiKey)) {
        AuthModule.showToast('Format API Key tidak valid (6-128 karakter huruf/angka/tanda hubung).');
        input.focus();
        return;
      }

      const isUpdate = current && current.configured;
      setBusy(isUpdate ? updateBtn : saveBtn, true, 'Menyimpan…');

      const res = await appState.fonnteConfigSave(user.id, apiKey);

      setBusy(isUpdate ? updateBtn : saveBtn, false);

      if (res.status === 'success') {
        input.value = '';
        input.type = 'password';
        AuthModule.showToast(res.message || 'API Key berhasil disimpan.');
        showTestResult(true, 'API key tersimpan (terenkripsi). Klik <strong>Tes Koneksi Fonnte</strong> untuk memvalidasi token.');
        loadStatus();
      } else {
        AuthModule.showToast(res.message || 'Gagal menyimpan API Key.');
      }
    };

    saveBtn.onclick = submitKey;
    updateBtn.onclick = submitKey;

    // Enter pada input = simpan/perbarui
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!saveBtn.disabled) saveBtn.click();
        else if (!updateBtn.disabled) updateBtn.click();
      }
    });

    // ==========================================================
    // EVENT: TES KONEKSI FONNTE
    // ==========================================================
    testBtn.onclick = async () => {
      setBusy(testBtn, true, 'Menguji koneksi…');
      testResult.style.display = 'block';
      testResult.style.background = '#f8fafc';
      testResult.style.color = '#475569';
      testResult.style.border = '1px solid #e2e8f0';
      testResult.textContent = 'Mengirim pesan percobaan ke Fonnte…';

      const res = await appState.fonnteConfigTest(user.id);

      setBusy(testBtn, false);

      if (res.status === 'success') {
        const c = res.connection || {};
        showTestResult(true,
          `<strong>✅ Koneksi berhasil.</strong><br>
           Pesan percobaan terkirim ke <strong>${esc(c.target_masked || 'nomor Anda')}</strong><br>
           Token: <strong>${esc(c.token_mask || '—')}</strong> • Sumber: ${esc(c.source === 'database' ? 'database' : 'config')}<br>
           <span style="opacity:0.85;">${esc(c.message || '')}</span>`);
        AuthModule.showToast('Tes koneksi Fonnte berhasil — pesan percobaan terkirim.');
      } else {
        showTestResult(false,
          `<strong>❌ Koneksi gagal.</strong><br>${esc(res.message || 'Tanpa keterangan error.')}`);
        AuthModule.showToast(res.message || 'Tes koneksi Fonnte gagal.');
      }

      loadStatus();
    };

    // ==========================================================
    // EVENT: HAPUS / NONAKTIFKAN KONFIGURASI
    // ==========================================================
    deleteBtn.onclick = async () => {
      const ok = window.confirm(
        'Hapus / nonaktifkan konfigurasi API Key?\n\n' +
        'Token tersimpan akan dihapus dari database. Sistem kembali memakai token bawaan ' +
        'config/fonnte.php (atau mode simulasi bila tidak ada).'
      );
      if (!ok) return;

      setBusy(deleteBtn, true, 'Menghapus…');
      const res = await appState.fonnteConfigDelete(user.id);
      setBusy(deleteBtn, false);

      if (res.status === 'success') {
        AuthModule.showToast(res.message || 'Konfigurasi API Key dihapus.');
        input.value = '';
        testResult.style.display = 'none';
        loadStatus();
      } else {
        AuthModule.showToast(res.message || 'Gagal menghapus konfigurasi.');
      }
    };
  }
};
