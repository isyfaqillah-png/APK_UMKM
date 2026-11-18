// DesaBiz AI - Modul Pengaturan Chatbot AI (KHUSUS ADMIN)
// ---------------------------------------------------------------------------
// Menu penetapan provider utama Chatbot DesaBiz AI:
// - Pilihan provider (OpenAI / Gemini / Lainnya) + model yang kompatibel
// - Status aktif/nonaktif provider sebagai provider utama chatbot
// - Tes koneksi & simpan konfigurasi
// - Status chatbot (AI API aktif vs Local Intelligence Engine)
//
// Alur aman: chatbot frontend -> backend (api/ai.php) -> backend membaca
// provider aktif + API key terenkripsi dari database -> provider AI -> jawaban.
// API key TIDAK PERNAH dikirim ke JavaScript frontend.
import { Icons } from '../../icons.js';
import { appState } from '../../state.js';
import { AuthModule } from '../auth/index.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

export const AISettingsModule = {
  id: 'ai-settings',
  title: 'Pengaturan Chatbot AI',
  subtitle: 'Tentukan provider, model, dan status aktif Chatbot DesaBiz AI',

  render: (container) => {
    // Pengecekan ganda (defense in depth) — router sudah melakukan guard.
    if (!appState.isAdmin()) {
      container.innerHTML = `
        <div class="fade-in">
          <div class="card" style="max-width: 560px; margin: 4rem auto; text-align: center; border-left: 4px solid var(--color-danger, #ef4444);">
            <div class="module-icon-large" style="color: var(--color-danger, #ef4444); background: #fef2f2; border-color: #fecaca; margin-bottom: 1rem;">${Icons.sliders}</div>
            <h2 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 0.5rem;">Akses Ditolak</h2>
            <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1.25rem;">
              Menu <strong>Pengaturan Chatbot AI</strong> hanya tersedia untuk akun <strong>ADMINISTRATOR</strong>.
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
              <span class="breadcrumb-item active">Pengaturan Chatbot AI</span>
            </div>
            <h1 class="page-title">${AISettingsModule.title}</h1>
            <p class="page-subtitle">${AISettingsModule.subtitle}</p>
          </div>
          <span class="badge" style="background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe;">
            ${Icons.shieldCheck} Role: ADMIN • ${esc(user.ownerName)}
          </span>
        </div>

        <div class="grid-config">
          <!-- ================= PENGATURAN PROVIDER ================= -->
          <div class="card">
            <div class="card-header" style="margin-bottom: 0.75rem;">
              <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem; margin: 0;">
                <span>${Icons.sliders}</span> Provider & Model Chatbot
              </h4>
            </div>
            <div class="card-body">
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                Pilih <strong>provider AI</strong> dan <strong>model yang kompatibel</strong>, lalu tentukan status
                aktif/nonaktif. Bila API key provider belum disimpan, masukkan di menu
                <a href="#/ai-key">Konfigurasi API Key Chatbot AI</a> terlebih dahulu.
              </p>

              <div style="margin-bottom: 0.75rem;">
                <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-input); margin-bottom: 0.35rem;">
                  Provider AI <span style="color: red;">*</span>
                </label>
                <select id="aiset-provider" class="form-input">
                  <option value="openai">OpenAI API</option>
                  <option value="gemini">Google Gemini API</option>
                  <option value="custom">Lainnya (OpenAI-compatible)</option>
                </select>
              </div>

              <div id="aiset-model-wrap" style="margin-bottom: 0.75rem;"></div>

              <div id="aiset-endpoint-row" style="margin-bottom: 0.75rem; display: none;">
                <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-input); margin-bottom: 0.35rem;">
                  Endpoint Chat Completions <span style="color: red;">*</span>
                </label>
                <input type="text" id="aiset-endpoint" class="form-input"
                  placeholder="http://localhost/APK_UMKM/test_ai_mock.php" maxlength="255"
                  spellcheck="false" autocomplete="off" style="font-family: monospace; font-size: 0.8rem;">
              </div>

              <label style="display: flex; align-items: flex-start; gap: 0.55rem; padding: 0.75rem; border: 1px solid var(--border-light); border-radius: var(--radius-md, 8px); background: #f8fafc; cursor: pointer; margin-bottom: 0.75rem;">
                <input type="checkbox" id="aiset-active" style="margin-top: 0.2rem;">
                <span style="font-size: 0.83rem; line-height: 1.5;">
                  <strong>Aktifkan provider ini</strong> sebagai provider utama chatbot AI
                  <small style="display: block; color: var(--text-muted);">
                    Hanya SATU provider yang aktif. Nonaktifkan semua provider untuk mengembalikan
                    chatbot ke Local Intelligence Engine.
                  </small>
                </span>
              </label>

              <div id="aiset-form-status" style="font-size: 0.8rem; color: var(--text-muted); min-height: 1.1rem;">
                Memuat status konfigurasi…
              </div>
            </div>

            <div class="card-footer" style="padding: 0.75rem; border-top: 1px solid var(--border-light); display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button id="aiset-test-btn" class="btn btn-secondary" style="flex: 1; min-width: 170px;">
                🧪 Tes Koneksi
              </button>
              <button id="aiset-save-btn" class="btn btn-primary" style="flex: 1; min-width: 170px;">
                💾 Simpan Konfigurasi
              </button>
            </div>
          </div>

          <!-- ================= STATUS CHATBOT ================= -->
          <div class="card">
            <div class="card-header" style="margin-bottom: 0.75rem;">
              <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem; margin: 0;">
                <span>${Icons.shieldCheck}</span> Status Chatbot AI
              </h4>
            </div>
            <div class="card-body">
              <div id="aiset-badge" style="margin-bottom: 1rem;">
                <span class="badge" style="background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;">⏳ Memuat…</span>
              </div>

              <div style="display: flex; flex-direction: column; gap: 0.6rem; font-size: 0.83rem;">
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">Provider utama</span>
                  <strong id="aiset-active-provider">—</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">Model AI</span>
                  <strong id="aiset-active-model">—</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">API key</span>
                  <strong id="aiset-mask" style="font-family: monospace;">—</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">Endpoint</span>
                  <strong id="aiset-endpoint-show" style="font-size: 0.72rem; font-family: monospace; text-align: right; word-break: break-all;">—</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">Terakhir diuji</span>
                  <strong id="aiset-tested">—</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">Terakhir disimpan</span>
                  <strong id="aiset-updated">—</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">Koneksi database</span>
                  <strong id="aiset-db">—</strong>
                </div>
              </div>

              <div id="aiset-test-result" style="display: none; margin-top: 1rem; padding: 0.75rem; border-radius: var(--radius-md, 8px); font-size: 0.8rem; line-height: 1.5;"></div>

              <div style="margin-top: 1.25rem;">
                <a href="#/ai-assistant" class="btn btn-primary" style="width: 100%; justify-content: center;">
                  ${Icons.sparkle} Buka Chatbot DesaBiz AI
                </a>
              </div>

              <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-light); font-size: 0.78rem; color: var(--text-muted); line-height: 1.7;">
                <strong style="color: var(--text-main);">Alur keamanan chatbot:</strong><br>
                • Chatbot mengambil provider aktif dari <strong>backend</strong> (bukan dari browser)<br>
                • API key dibaca terenkripsi & hanya diproses di server PHP<br>
                • Pesan dikirim ke provider AI, jawaban ditampilkan di chatbot<br>
                • Bila provider nonaktif / key kosong / provider gagal → chatbot tetap
                berjalan dengan Local Intelligence Engine (tanpa error)<br>
                • Jawaban chatbot mengikuti role: Admin, Penjual, atau Pembeli
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // ==========================================================
    // ELEMEN & STATE TAMPILAN
    // ==========================================================
    const providerSel   = container.querySelector('#aiset-provider');
    const modelWrap     = container.querySelector('#aiset-model-wrap');
    const endpointRow   = container.querySelector('#aiset-endpoint-row');
    const endpointInput = container.querySelector('#aiset-endpoint');
    const activeChk     = container.querySelector('#aiset-active');
    const formStatus    = container.querySelector('#aiset-form-status');
    const testBtn       = container.querySelector('#aiset-test-btn');
    const saveBtn       = container.querySelector('#aiset-save-btn');

    const badgeBox   = container.querySelector('#aiset-badge');
    const activePv   = container.querySelector('#aiset-active-provider');
    const activeMd   = container.querySelector('#aiset-active-model');
    const maskEl     = container.querySelector('#aiset-mask');
    const endpointShow = container.querySelector('#aiset-endpoint-show');
    const testedEl   = container.querySelector('#aiset-tested');
    const updatedEl  = container.querySelector('#aiset-updated');
    const dbEl       = container.querySelector('#aiset-db');
    const testResult = container.querySelector('#aiset-test-result');

    let status = null;
    let providerTouched = false;

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

    // ---------- Kontrol model & endpoint ----------
    const renderModelControl = () => {
      const key = providerSel.value;
      const info = providerInfo(key);
      const savedModel = info ? (info.model || '') : '';

      if (key === 'custom') {
        modelWrap.innerHTML = `
          <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-input); margin-bottom: 0.35rem;">
            Nama Model AI <span style="color: red;">*</span>
          </label>
          <input type="text" id="aiset-model-input" class="form-input" maxlength="80"
            placeholder="Sesuaikan dengan provider Anda" value="${esc(savedModel)}"
            autocomplete="off" spellcheck="false">`;
        endpointRow.style.display = 'block';
        endpointInput.value = info && info.endpoint_saved ? info.endpoint_saved : (info ? info.endpoint : '');
      } else {
        const models = (info && info.models) || [];
        const selected = savedModel && models.includes(savedModel) ? savedModel : (models[0] || '');
        modelWrap.innerHTML = `
          <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-input); margin-bottom: 0.35rem;">
            Model AI <span style="color: red;">*</span>
          </label>
          <select id="aiset-model-select" class="form-input">
            ${models.map(m => `<option value="${esc(m)}" ${m === selected ? 'selected' : ''}>${esc(m)}</option>`).join('')}
          </select>
          <small style="display: block; margin-top: 0.35rem; font-size: 0.75rem; color: var(--text-muted);">
            Daftar model mengikuti dokumentasi resmi ${esc(info ? info.label : '')}.
          </small>`;
        endpointRow.style.display = 'none';
      }

      // Status aktif provider terpilih
      activeChk.checked = !!(info && info.is_active);
      activeChk.disabled = false;

      updateFormState();
    };

    const getFormModel = () => {
      const sel = container.querySelector('#aiset-model-select');
      const inp = container.querySelector('#aiset-model-input');
      if (sel) return sel.value;
      if (inp) return inp.value.trim();
      return '';
    };

    const updateFormState = () => {
      const info = providerInfo(providerSel.value);
      const hasKey = !!(info && info.has_key);

      if (!hasKey) {
        formStatus.innerHTML = `Belum ada API key tersimpan untuk provider ini —
          <a href="#/ai-key">simpan API key</a> dulu sebelum mengaktifkannya.`;
      } else if (info.is_active) {
        formStatus.innerHTML = `Provider <strong>${esc(info.label)}</strong> saat ini
          <strong style="color:#047857;">AKTIF</strong> sebagai provider utama chatbot
          (kunci ${esc(info.key_mask)}).`;
      } else {
        formStatus.innerHTML = `Provider <strong>${esc(info.label)}</strong> tersimpan
          (${esc(info.key_mask)}) tetapi <strong>belum aktif</strong>. Centang "Aktifkan provider ini" lalu simpan.`;
      }
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
        badgeBox.innerHTML = `<span class="badge" style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;">✅ Chatbot memakai ${esc(active.label)} • ${esc(s.active_model)}</span>`;
      } else {
        badgeBox.innerHTML = `<span class="badge" style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;">🤖 Chatbot memakai Local Intelligence Engine (provider nonaktif / key kosong)</span>`;
      }

      activePv.textContent    = active ? active.label : '—';
      activeMd.textContent    = s.active_model || '—';
      maskEl.textContent      = active ? active.key_mask : '—';
      endpointShow.textContent = s.active_endpoint || '—';
      testedEl.textContent    = active && active.last_test_at
        ? `${fmtDate(active.last_test_at)} • ${active.last_test_status === 'success' ? 'berhasil' : active.last_test_status === 'failed' ? 'gagal' : esc(active.last_test_status)}`
        : 'Belum pernah diuji';
      updatedEl.textContent   = active && active.updated_at
        ? `${fmtDate(active.updated_at)}${active.updated_by ? ' oleh ' + esc(active.updated_by) : ''}`
        : 'Belum pernah';
      dbEl.textContent        = s.database_conn || '—';

      if (s.active_provider && !providerTouched) {
        providerSel.value = s.active_provider;
      }

      renderModelControl();
    };

    const loadStatus = async () => {
      const s = await appState.aiConfigStatus(user.id);
      renderStatus(s);
    };
    loadStatus();

    providerSel.onchange = () => {
      providerTouched = true;
      renderModelControl();
    };

    // ==========================================================
    // EVENT: TES KONEKSI
    // ==========================================================
    testBtn.onclick = async () => {
      const provider = providerSel.value;
      const model    = getFormModel();
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

      const res = await appState.aiConfigTest(user.id, { provider, model, endpoint });
      setBusy(testBtn, false);

      if (res.status === 'success') {
        const c = res.connection || {};
        showTestResult(true,
          `<strong>✅ Koneksi berhasil.</strong><br>
           Provider: <strong>${esc(c.provider_label || c.provider)}</strong> • Model: <strong>${esc(c.model)}</strong><br>
           HTTP ${esc(c.http_code)} • ${esc(c.latency_ms)} ms • Kunci dari: ${esc(c.key_source === 'database' ? 'database (tersimpan)' : 'form')}`);
        AuthModule.showToast('Tes koneksi berhasil — provider merespons.');
      } else {
        showTestResult(false, `<strong>❌ Koneksi gagal.</strong><br>${esc(res.message || 'Tanpa keterangan error.')}`);
        AuthModule.showToast(res.message || 'Tes koneksi gagal.');
      }

      loadStatus();
    };

    // ==========================================================
    // EVENT: SIMPAN KONFIGURASI (provider, model, status aktif)
    // ==========================================================
    saveBtn.onclick = async () => {
      const provider = providerSel.value;
      const model    = getFormModel();
      const isActive = activeChk.checked;
      const endpoint = provider === 'custom' ? (endpointInput.value || '').trim() : '';
      const info     = providerInfo(provider);

      if (!model) {
        AuthModule.showToast('Model AI wajib dipilih/diisi.');
        return;
      }
      if (provider === 'custom' && !endpoint) {
        AuthModule.showToast('Endpoint provider wajib diisi.');
        endpointInput.focus();
        return;
      }
      if (isActive && !(info && info.has_key)) {
        AuthModule.showToast('Provider belum memiliki API key. Simpan API key terlebih dahulu di menu Konfigurasi API Key Chatbot AI.');
        return;
      }

      setBusy(saveBtn, true, 'Menyimpan…');
      const res = await appState.aiConfigSave(user.id, {
        provider, model, api_key: '', is_active: isActive, endpoint
      });
      setBusy(saveBtn, false);

      if (res.status === 'success') {
        AuthModule.showToast(res.message || 'Konfigurasi chatbot berhasil disimpan.');
        showTestResult(true, `Konfigurasi disimpan. Chatbot kini ${isActive
          ? `memakai <strong>${esc(providerInfoLabel(provider))}</strong>.`
          : 'kembali ke <strong>Local Intelligence Engine</strong>.'}`);
        loadStatus();
      } else {
        AuthModule.showToast(res.message || 'Gagal menyimpan konfigurasi.');
      }
    };

    const providerInfoLabel = (key) => {
      const info = providerInfo(key);
      return info ? info.label : key;
    };
  }
};
