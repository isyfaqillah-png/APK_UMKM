// DesaBiz AI - Modul Konfigurasi API Key Chatbot AI (KHUSUS ADMIN)
// ---------------------------------------------------------------------------
// Menu pengelolaan provider & API key Chatbot AI (tabel ai_configurations):
// - Pilihan provider: OpenAI API / Google Gemini API / Lainnya (OpenAI-compatible)
// - Pilihan model sesuai provider (daftar model dari dokumentasi resmi)
// - Input API key + Tampilkan/Sembunyikan
// - Simpan / Perbarui / Hapus atau Nonaktifkan / Tes Koneksi
// - Informasi status koneksi & provider yang sedang digunakan
//
// KEAMANAN: API key TIDAK PERNAH disimpan di JS/localStorage, tidak dikirim
// utuh ke frontend, tidak muncul di URL/HTML/log — semuanya diverifikasi &
// dienkripsi di backend (api/ai-config.php, admin-only).
// TERPISAH dari konfigurasi Fonnte.
import { Icons } from '../../icons.js';
import { appState } from '../../state.js';
import { AuthModule } from '../auth/index.js';

// Escape teks sebelum dirender ke HTML (keamanan dasar XSS)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

export const AIKeyModule = {
  id: 'ai-key',
  title: 'Konfigurasi API Key Chatbot AI',
  subtitle: 'Pilih provider AI, simpan API key terenkripsi, dan uji koneksi Chatbot DesaBiz AI',

  render: (container) => {
    // Pengecekan ganda (defense in depth) — router sudah melakukan guard.
    if (!appState.isAdmin()) {
      container.innerHTML = `
        <div class="fade-in">
          <div class="card" style="max-width: 560px; margin: 4rem auto; text-align: center; border-left: 4px solid var(--color-danger, #ef4444);">
            <div class="module-icon-large" style="color: var(--color-danger, #ef4444); background: #fef2f2; border-color: #fecaca; margin-bottom: 1rem;">${Icons.key}</div>
            <h2 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 0.5rem;">Akses Ditolak</h2>
            <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1.25rem;">
              Menu <strong>Konfigurasi API Key Chatbot AI</strong> hanya tersedia untuk akun <strong>ADMINISTRATOR</strong>.
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
              <span class="breadcrumb-item active">KONFIGURASI</span>
              <span class="breadcrumb-separator">/</span>
              <span class="breadcrumb-item active">API Key Chatbot AI</span>
            </div>
            <h1 class="page-title">${AIKeyModule.title}</h1>
            <p class="page-subtitle">${AIKeyModule.subtitle}</p>
          </div>
          <span class="badge" style="background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe;">
            ${Icons.shieldCheck} Role: ADMIN • ${esc(user.ownerName)}
          </span>
        </div>

        <div class="grid-config">
          <!-- ================= FORM API KEY CHATBOT AI ================= -->
          <div class="card">
            <div class="card-header" style="margin-bottom: 0.75rem;">
              <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem; margin: 0;">
                <span>${Icons.sparkle}</span> API Key Chatbot AI
              </h4>
            </div>
            <div class="card-body">
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                Pilih provider AI, lalu masukkan API key milik Anda. Kunci disimpan
                <strong>terenkripsi (AES-256)</strong> di server dan <strong>tidak pernah</strong> dikirim utuh ke
                browser, masuk URL, maupun dicatat ke log. Konfigurasi ini
                <strong>terpisah</strong> dari API key Fonnte WhatsApp.
              </p>

              <div style="margin-bottom: 0.75rem;">
                <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-input); margin-bottom: 0.35rem;">
                  Provider AI <span style="color: red;">*</span>
                </label>
                <select id="aikey-provider" class="form-input">
                  <option value="openai">OpenAI API</option>
                  <option value="gemini">Google Gemini API</option>
                  <option value="custom">Lainnya (OpenAI-compatible)</option>
                </select>
                <small id="aikey-provider-hint" style="display: block; margin-top: 0.35rem; font-size: 0.75rem; color: var(--text-muted);">
                  Endpoint & format request mengikuti dokumentasi resmi masing-masing provider.
                </small>
              </div>

              <div id="aikey-model-wrap" style="margin-bottom: 0.75rem;"></div>

              <div id="aikey-endpoint-row" style="margin-bottom: 0.75rem; display: none;">
                <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-input); margin-bottom: 0.35rem;">
                  Endpoint Chat Completions <span style="color: red;">*</span>
                </label>
                <input type="text" id="aikey-endpoint" class="form-input"
                  placeholder="http://localhost/APK_UMKM/test_ai_mock.php" maxlength="255"
                  spellcheck="false" autocomplete="off" style="font-family: monospace; font-size: 0.8rem;">
              </div>

              <div style="margin-bottom: 0.75rem;">
                <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-input); margin-bottom: 0.35rem;">
                  API Key <span style="color: red;">*</span>
                </label>
                <div style="display: flex; gap: 0.5rem; align-items: stretch;">
                  <input
                    type="password"
                    id="aikey-input"
                    class="form-input"
                    placeholder="sk-… atau AIza… (sesuai provider)"
                    autocomplete="off"
                    spellcheck="false"
                    style="flex: 1; min-width: 0; font-family: monospace; letter-spacing: 0.05em;"
                  >
                  <button type="button" id="aikey-toggle-visibility" class="btn btn-secondary" title="Tampilkan/Sembunyikan API Key" style="padding: 0 0.85rem;">
                    ${Icons.eye}
                  </button>
                </div>
                <small id="aikey-hint" style="display: block; margin-top: 0.35rem; font-size: 0.75rem; color: var(--text-muted);">
                  API key tersimpan tidak dapat dilihat kembali secara utuh — hanya masking.
                </small>
              </div>

              <div id="aikey-form-status" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; min-height: 1.1rem;">
                Memuat status konfigurasi…
              </div>
            </div>

            <div class="card-footer" style="padding: 0.75rem; border-top: 1px solid var(--border-light); display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button id="aikey-save-btn" class="btn btn-primary" style="flex: 1; min-width: 170px;">
                💾 Simpan API Key
              </button>
              <button id="aikey-update-btn" class="btn btn-secondary" style="flex: 1; min-width: 170px;" disabled>
                🔄 Perbarui API Key
              </button>
              <button id="aikey-test-btn" class="btn btn-secondary" style="flex: 1; min-width: 170px;">
                🧪 Tes Koneksi API
              </button>
              <button id="aikey-delete-btn" class="btn btn-danger" style="flex: 1; min-width: 170px;" disabled>
                🗑️ Hapus / Nonaktifkan
              </button>
              <small style="color: var(--text-muted); font-size: 0.75rem; width: 100%; margin-top: 0.25rem;">
                Simpan/Perbarui otomatis menjadikan provider ini <strong>aktif</strong> sebagai provider utama chatbot.
                Untuk mengaktifkan/menonaktifkan tanpa mengganti kunci, gunakan menu
                <a href="#/ai-settings">Pengaturan Chatbot AI</a>.
              </small>
            </div>
          </div>

          <!-- ================= STATUS KONEKSI ================= -->
          <div class="card" id="aikey-status-card">
            <div class="card-header" style="margin-bottom: 0.75rem;">
              <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem; margin: 0;">
                <span>${Icons.shieldCheck}</span> Status Koneksi & Provider Aktif
              </h4>
            </div>
            <div class="card-body">
              <div id="aikey-conn-badge" style="margin-bottom: 1rem;">
                <span class="badge" style="background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;">⏳ Memuat…</span>
              </div>

              <div style="display: flex; flex-direction: column; gap: 0.6rem; font-size: 0.83rem;">
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">Provider sedang digunakan</span>
                  <strong id="aikey-active-provider">—</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">Model AI aktif</span>
                  <strong id="aikey-active-model">—</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">API key tersimpan</span>
                  <strong id="aikey-mask" style="font-family: monospace;">—</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">Endpoint</span>
                  <strong id="aikey-active-endpoint" style="font-size: 0.72rem; font-family: monospace; text-align: right; word-break: break-all;">—</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">Terakhir diperbarui</span>
                  <strong id="aikey-updated">—</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">Terakhir diuji</span>
                  <strong id="aikey-tested">—</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">Koneksi database</span>
                  <strong id="aikey-db">—</strong>
                </div>
              </div>

              <div id="aikey-test-result" style="display: none; margin-top: 1rem; padding: 0.75rem; border-radius: var(--radius-md, 8px); font-size: 0.8rem; line-height: 1.5;"></div>

              <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-light); font-size: 0.78rem; color: var(--text-muted); line-height: 1.7;">
                <strong style="color: var(--text-main);">Keamanan konfigurasi:</strong><br>
                • API key dienkripsi AES-256 sebelum masuk database<br>
                • API key tidak pernah muncul di HTML, JavaScript, URL, atau log<br>
                • Hanya akun ADMINISTRATOR yang dapat mengelola konfigurasi ini<br>
                • Penjual & Pembeli tidak memiliki akses ke halaman ini<br>
                • Terpisah total dari API key Fonnte WhatsApp
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // ==========================================================
    // ELEMEN & STATE TAMPILAN
    // ==========================================================
    const providerSel   = container.querySelector('#aikey-provider');
    const providerHint  = container.querySelector('#aikey-provider-hint');
    const modelWrap     = container.querySelector('#aikey-model-wrap');
    const endpointRow   = container.querySelector('#aikey-endpoint-row');
    const endpointInput = container.querySelector('#aikey-endpoint');
    const input         = container.querySelector('#aikey-input');
    const toggleBtn     = container.querySelector('#aikey-toggle-visibility');
    const hint          = container.querySelector('#aikey-hint');
    const formStatus    = container.querySelector('#aikey-form-status');
    const saveBtn       = container.querySelector('#aikey-save-btn');
    const updateBtn     = container.querySelector('#aikey-update-btn');
    const testBtn       = container.querySelector('#aikey-test-btn');
    const deleteBtn     = container.querySelector('#aikey-delete-btn');

    const badgeBox   = container.querySelector('#aikey-conn-badge');
    const activePv   = container.querySelector('#aikey-active-provider');
    const activeMd   = container.querySelector('#aikey-active-model');
    const maskEl     = container.querySelector('#aikey-mask');
    const activeEp   = container.querySelector('#aikey-active-endpoint');
    const updatedEl  = container.querySelector('#aikey-updated');
    const testedEl   = container.querySelector('#aikey-tested');
    const dbEl       = container.querySelector('#aikey-db');
    const testResult = container.querySelector('#aikey-test-result');

    let status = null; // respons terakhir dari server
    let providerTouched = false; // true setelah admin memilih provider manual

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

    const providerInfo = (key) => {
      if (!status || !Array.isArray(status.providers)) return null;
      return status.providers.find(p => p.key === key) || null;
    };

    const showTestResult = (ok, text) => {
      testResult.style.display = 'block';
      testResult.style.background = ok ? '#ecfdf5' : '#fef2f2';
      testResult.style.color = ok ? '#047857' : '#b91c1c';
      testResult.style.border = ok ? '1px solid #a7f3d0' : '1px solid #fecaca';
      testResult.innerHTML = text;
    };

    // ---------- Kontrol model & endpoint (ikuti provider terpilih) ----------
    const renderModelControl = () => {
      const key = providerSel.value;
      const info = providerInfo(key);
      const savedModel = info ? (info.model || '') : '';

      if (key === 'custom') {
        modelWrap.innerHTML = `
          <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-input); margin-bottom: 0.35rem;">
            Nama Model AI <span style="color: red;">*</span>
          </label>
          <input type="text" id="aikey-model-input" class="form-input" maxlength="80"
            placeholder="Sesuaikan dengan provider Anda (mis. desabiz-mock-1)"
            value="${esc(savedModel)}" autocomplete="off" spellcheck="false">
          <small style="display: block; margin-top: 0.35rem; font-size: 0.75rem; color: var(--text-muted);">
            Isi nama model yang didukung provider Anda — daftar model bebas untuk provider "Lainnya".
          </small>`;
        endpointRow.style.display = 'block';
        endpointInput.value = info && info.endpoint_saved ? info.endpoint_saved : (info ? info.endpoint : '');
      } else {
        const models = (info && info.models) || [];
        const selected = savedModel && models.includes(savedModel) ? savedModel : (models[0] || '');
        modelWrap.innerHTML = `
          <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-input); margin-bottom: 0.35rem;">
            Model AI <span style="color: red;">*</span>
          </label>
          <select id="aikey-model-select" class="form-input">
            ${models.map(m => `<option value="${esc(m)}" ${m === selected ? 'selected' : ''}>${esc(m)}</option>`).join('')}
          </select>
          <small style="display: block; margin-top: 0.35rem; font-size: 0.75rem; color: var(--text-muted);">
            Daftar model mengikuti dokumentasi resmi ${esc(info ? info.label : '')}.
          </small>`;
        endpointRow.style.display = 'none';
      }

      providerHint.textContent = info
        ? (info.docs ? `Endpoint mengikuti dokumentasi resmi — ${info.docs}` : 'Endpoint diisi manual untuk provider ini.')
        : 'Endpoint & format request mengikuti dokumentasi resmi masing-masing provider.';

      updateFormState();
    };

    const getFormModel = () => {
      const sel = container.querySelector('#aikey-model-select');
      const inp = container.querySelector('#aikey-model-input');
      if (sel) return sel.value;
      if (inp) return inp.value.trim();
      return '';
    };

    const updateFormState = () => {
      const info = providerInfo(providerSel.value);
      const hasKey = !!(info && info.has_key);

      saveBtn.disabled   = hasKey;
      updateBtn.disabled = !hasKey;
      deleteBtn.disabled = !hasKey;

      formStatus.innerHTML = hasKey
        ? `API key provider ini tersimpan (<strong style="color: var(--color-primary);">${esc(info.key_mask)}</strong>).
           Kosongkan kolom API key untuk mempertahankannya, atau isi kunci baru lalu klik <strong>Perbarui API Key</strong>.`
        : 'Belum ada API key tersimpan untuk provider ini. Masukkan API key lalu klik Simpan API Key.';
    };

    // ---------- Render kartu status ----------
    const renderStatus = (s) => {
      status = s;

      if (s.status !== 'success') {
        badgeBox.innerHTML = `<span class="badge" style="background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;">⚠️ ${esc(s.message || 'Gagal memuat status')}</span>`;
        formStatus.textContent = s.message || 'Gagal memuat status konfigurasi.';
        return;
      }

      const active = s.providers ? s.providers.find(p => p.key === s.active_provider) : null;

      if (s.chatbot_ready && active) {
        badgeBox.innerHTML = `<span class="badge" style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;">✅ Chatbot AI aktif — ${esc(active.label)} • ${esc(s.active_model)}</span>`;
      } else if (s.active_provider) {
        badgeBox.innerHTML = `<span class="badge" style="background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa;">⚠️ Provider aktif tetapi API key belum tersimpan</span>`;
      } else {
        badgeBox.innerHTML = `<span class="badge" style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;">ℹ️ Belum ada provider aktif — chatbot memakai Local Intelligence Engine</span>`;
      }

      activePv.textContent  = active ? active.label : '—';
      activeMd.textContent  = s.active_model || '—';
      maskEl.textContent    = active ? active.key_mask : '—';
      activeEp.textContent  = s.active_endpoint || '—';
      updatedEl.textContent = active && active.updated_at
        ? `${fmtDate(active.updated_at)}${active.updated_by ? ' oleh ' + esc(active.updated_by) : ''}`
        : 'Belum pernah';
      testedEl.textContent  = active && active.last_test_at
        ? `${fmtDate(active.last_test_at)} • ${active.last_test_status === 'success' ? 'berhasil' : active.last_test_status === 'failed' ? 'gagal' : esc(active.last_test_status)}`
        : 'Belum pernah diuji';
      dbEl.textContent      = s.database_conn || '—';

      // Buka halaman pada provider yang sedang aktif (kecuali admin sudah memilih manual)
      if (s.active_provider && !providerTouched) {
        providerSel.value = s.active_provider;
      }

      renderModelControl();
    };

    // ==========================================================
    // MUAT STATUS DARI SERVER
    // ==========================================================
    const loadStatus = async () => {
      const s = await appState.aiConfigStatus(user.id);
      renderStatus(s);
    };
    loadStatus();

    // ==========================================================
    // EVENT: GANTI PROVIDER
    // ==========================================================
    providerSel.onchange = () => {
      providerTouched = true;
      input.value = '';
      input.type = 'password';
      renderModelControl();
    };

    // ==========================================================
    // EVENT: TAMPILKAN / SEMBUNYIKAN API KEY
    // ==========================================================
    toggleBtn.onclick = () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      toggleBtn.title = show ? 'Sembunyikan API Key' : 'Tampilkan API Key';
      hint.textContent = show
        ? 'API key ditampilkan sementara. Jangan bagikan layar ini.'
        : 'API key tersimpan tidak dapat dilihat kembali secara utuh — hanya masking.';
    };

    // ==========================================================
    // EVENT: SIMPAN / PERBARUI API KEY (selalu mengaktifkan provider)
    // ==========================================================
    const submitKey = async () => {
      const provider = providerSel.value;
      const model    = getFormModel();
      const apiKey   = (input.value || '').trim();
      const endpoint = provider === 'custom' ? (endpointInput.value || '').trim() : '';

      if (!model) {
        AuthModule.showToast('Model AI wajib dipilih/diisi.');
        return;
      }
      if (provider === 'custom' && !endpoint) {
        AuthModule.showToast('Endpoint provider wajib diisi.');
        endpointInput.focus();
        return;
      }

      const info = providerInfo(provider);
      const isUpdate = !!(info && info.has_key);

      if (!apiKey && !isUpdate) {
        AuthModule.showToast('API Key tidak boleh kosong saat pertama kali menyimpan.');
        input.focus();
        return;
      }
      if (apiKey && !/^[A-Za-z0-9_\-.=/]{6,200}$/.test(apiKey)) {
        AuthModule.showToast('Format API Key tidak valid (hanya huruf, angka, titik, strip, garis miring, atau =).');
        input.focus();
        return;
      }

      const btn = isUpdate ? updateBtn : saveBtn;
      setBusy(btn, true, 'Menyimpan…');

      const res = await appState.aiConfigSave(user.id, {
        provider, model, api_key: apiKey, is_active: true, endpoint
      });

      setBusy(btn, false);

      if (res.status === 'success') {
        input.value = '';
        input.type = 'password';
        AuthModule.showToast(res.message || 'Konfigurasi berhasil disimpan.');
        showTestResult(true, `Konfigurasi tersimpan (terenkripsi): <strong>${esc(res.key_mask || '')}</strong>. Klik <strong>Tes Koneksi API</strong> untuk memvalidasi provider.`);
        loadStatus();
      } else {
        AuthModule.showToast(res.message || 'Gagal menyimpan konfigurasi.');
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
    // EVENT: TES KONEKSI PROVIDER (chat percobaan sungguhan)
    // ==========================================================
    testBtn.onclick = async () => {
      const provider = providerSel.value;
      const model    = getFormModel();
      const apiKey   = (input.value || '').trim();
      const endpoint = provider === 'custom' ? (endpointInput.value || '').trim() : '';

      if (provider === 'custom' && !endpoint) {
        AuthModule.showToast('Endpoint provider wajib diisi untuk tes koneksi.');
        endpointInput.focus();
        return;
      }

      setBusy(testBtn, true, 'Menguji koneksi…');
      testResult.style.display = 'block';
      testResult.style.background = '#f8fafc';
      testResult.style.color = '#475569';
      testResult.style.border = '1px solid #e2e8f0';
      testResult.textContent = 'Mengirim chat percobaan ke provider…';

      const res = await appState.aiConfigTest(user.id, { provider, model, api_key: apiKey, endpoint });

      setBusy(testBtn, false);

      if (res.status === 'success') {
        const c = res.connection || {};
        showTestResult(true,
          `<strong>✅ Koneksi berhasil.</strong><br>
           Provider: <strong>${esc(c.provider_label || c.provider)}</strong> • Model: <strong>${esc(c.model)}</strong><br>
           Endpoint: <code style="font-size:0.72rem;word-break:break-all;">${esc(c.endpoint)}</code><br>
           HTTP ${esc(c.http_code)} • ${esc(c.latency_ms)} ms • Kunci dari: ${esc(c.key_source === 'database' ? 'database (tersimpan)' : 'form')}`);
        AuthModule.showToast('Tes koneksi API berhasil — provider merespons chat percobaan.');
      } else {
        showTestResult(false,
          `<strong>❌ Koneksi gagal.</strong><br>${esc(res.message || 'Tanpa keterangan error.')}`);
        AuthModule.showToast(res.message || 'Tes koneksi API gagal.');
      }

      loadStatus();
    };

    // ==========================================================
    // EVENT: HAPUS / NONAKTIFKAN KONFIGURASI PROVIDER
    // ==========================================================
    deleteBtn.onclick = async () => {
      const provider = providerSel.value;
      const label = providerSel.options[providerSel.selectedIndex].text;

      const ok = window.confirm(
        `Hapus / nonaktifkan konfigurasi provider "${label}"?\n\n` +
        'API key tersimpan akan dihapus dari database. Chatbot kembali memakai ' +
        'Local Intelligence Engine (atau provider lain bila masih ada yang aktif).'
      );
      if (!ok) return;

      setBusy(deleteBtn, true, 'Menghapus…');
      const res = await appState.aiConfigDelete(user.id, provider);
      setBusy(deleteBtn, false);

      if (res.status === 'success') {
        AuthModule.showToast(res.message || 'Konfigurasi provider dihapus.');
        input.value = '';
        testResult.style.display = 'none';
        loadStatus();
      } else {
        AuthModule.showToast(res.message || 'Gagal menghapus konfigurasi.');
      }
    };
  }
};
