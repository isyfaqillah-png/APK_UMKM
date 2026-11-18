// DesaBiz AI - Modul Pengaturan Notifikasi WhatsApp (SEMUA ROLE)
// ---------------------------------------------------------------------------
// Menu preferensi notifikasi WhatsApp per pengguna:
// A) Input/edit/simpan nomor WhatsApp (validasi 08xxx / 628xxx) + tampil nomor aktif
// B) Toggle aktif/nonaktif seluruh notifikasi
// C) Checkbox jenis notifikasi sesuai role (ADMIN / PENJUAL / PEMBELI)
// D) Simpan Pengaturan
// E) Kirim Pesan Percobaan ke nomor tersimpan
//
// Pilihan jenis notifikasi dikirim ke backend dan DIFILTER ULANG per role
// di sisi server (api/notification-settings.php) sehingga tidak bisa ditembus.
import { Icons } from '../../icons.js';
import { appState } from '../../state.js';
import { AuthModule } from '../auth/index.js';

// Escape teks sebelum dirender ke HTML (keamanan dasar XSS)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

// Validasi nomor Indonesia di sisi klien (server memvalidasi ulang)
const isValidWa = (raw) => /^(0|62)8[1-9][0-9]{7,10}$/.test(String(raw || '').replace(/\D/g, ''));

export const NotifWAModule = {
  id: 'notif-wa',
  title: 'Pengaturan Notifikasi WhatsApp',
  subtitle: 'Atur nomor penerima, status notifikasi, dan jenis notifikasi yang Anda inginkan',

  render: (container) => {
    const user = appState.getState().user;

    container.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <div class="page-header-info">
            <div class="breadcrumbs">
              <a href="#/dashboard">Beranda</a>
              <span class="breadcrumb-separator">/</span>
              <span class="breadcrumb-item active">Pengaturan Notifikasi WhatsApp</span>
            </div>
            <h1 class="page-title">${NotifWAModule.title}</h1>
            <p class="page-subtitle">${NotifWAModule.subtitle}</p>
          </div>
          <span class="badge" id="notif-role-badge" style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;">
            ${Icons.whatsapp} <span id="notif-role-label">Memuat role…</span>
          </span>
        </div>

        <div class="grid-config">
          <!-- ================= PENGATURAN ================= -->
          <div class="card">
            <div class="card-header" style="margin-bottom: 0.75rem;">
              <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem; margin: 0;">
                <span>${Icons.whatsapp}</span> Nomor WhatsApp Penerima
              </h4>
            </div>
            <div class="card-body">
              <!-- A. NOMOR WHATSAPP -->
              <div style="margin-bottom: 0.9rem;">
                <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-input); margin-bottom: 0.35rem;">
                  Nomor WhatsApp Anda <span style="color: red;">*</span>
                </label>
                <input
                  type="tel"
                  id="notif-wa-number"
                  class="form-input"
                  placeholder="Contoh: 081234567890 atau 6281234567890"
                  style="width: 100%;"
                  autocomplete="tel"
                >
                <small style="display: block; margin-top: 0.35rem; font-size: 0.75rem; color: var(--text-muted);">
                  Nomor aktif saat ini: <strong id="notif-wa-current" style="font-family: monospace; color: var(--color-primary);">belum diatur</strong>
                </small>
              </div>

              <!-- B. TOGGLE GLOBAL -->
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.75rem; background: var(--bg-secondary, #f8fafc); border: 1px solid var(--border-light); border-radius: var(--radius-md, 8px); margin-bottom: 1rem;">
                <div>
                  <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">Aktifkan Notifikasi WhatsApp</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">Nonaktifkan untuk berhenti menerima SEMUA pesan notifikasi.</div>
                </div>
                <input type="checkbox" id="notif-wa-enabled" checked style="margin: 0; transform: scale(1.3); cursor: pointer;">
              </div>

              <!-- C. JENIS NOTIFIKASI (RELEVAN PER ROLE) -->
              <div style="border-top: 1px solid var(--border-light); padding-top: 0.9rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.35rem;">
                  <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-main); margin: 0;">Jenis Notifikasi</h4>
                  <span id="notif-types-count" style="font-size: 0.75rem; color: var(--text-muted);">—</span>
                </div>
                <p style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.75rem;">
                  Hanya jenis notifikasi yang relevan dengan role Anda yang ditampilkan.
                </p>
                <div id="notif-types-list" style="display: flex; flex-direction: column; gap: 0.5rem;">
                  <div style="font-size: 0.82rem; color: var(--text-muted);">Memuat pilihan notifikasi…</div>
                </div>
              </div>

              <div id="notif-save-status" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.9rem; min-height: 1.1rem;"></div>
            </div>

            <div class="card-footer" style="padding: 0.75rem; border-top: 1px solid var(--border-light); display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button id="notif-save-btn" class="btn btn-primary" style="flex: 1; min-width: 180px;">
                💾 Simpan Pengaturan
              </button>
              <button id="notif-test-btn" class="btn btn-secondary" style="flex: 1; min-width: 180px;">
                ✉️ Kirim Pesan Percobaan
              </button>
            </div>
          </div>

          <!-- ================= RINGKASAN ================= -->
          <div class="card">
            <div class="card-header" style="margin-bottom: 0.75rem;">
              <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem; margin: 0;">
                <span>${Icons.shieldCheck}</span> Ringkasan Pengaturan
              </h4>
            </div>
            <div class="card-body">
              <div style="margin-bottom: 1rem;">
                <span id="notif-status-badge" class="badge" style="background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;">⏳ Memuat…</span>
              </div>

              <div style="display: flex; flex-direction: column; gap: 0.6rem; font-size: 0.83rem;">
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">Nomor tersimpan</span>
                  <strong id="summary-number" style="font-family: monospace;">—</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">Jenis notifikasi aktif</span>
                  <strong id="summary-active-types">—</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">Terakhir disimpan</span>
                  <strong id="summary-updated">—</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <span style="color: var(--text-muted);">Pengiriman via</span>
                  <strong style="font-size: 0.75rem; font-family: monospace; text-align: right;">https://api.fonnte.com/send</strong>
                </div>
              </div>

              <div id="notif-test-result" style="display: none; margin-top: 1rem; padding: 0.75rem; border-radius: var(--radius-md, 8px); font-size: 0.8rem; line-height: 1.5;"></div>

              <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-light); font-size: 0.78rem; color: var(--text-muted); line-height: 1.7;">
                <strong style="color: var(--text-main);">Aturan pengiriman:</strong><br>
                • Notifikasi hanya terkirim bila toggle aktif <strong>dan</strong> jenisnya dicentang<br>
                • Pengiriman selalu ke nomor milik Anda sendiri (per user_id)<br>
                • Tidak ada pengiriman massal & pengiriman berulang dicegah<br>
                • Perubahan nomor hanya dapat dilakukan oleh pemilik akun
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // =========================================================
    // ELEMEN & STATE
    // =========================================================
    const numberInput   = container.querySelector('#notif-wa-number');
    const numberCurrent = container.querySelector('#notif-wa-current');
    const enabledToggle = container.querySelector('#notif-wa-enabled');
    const typesList     = container.querySelector('#notif-types-list');
    const typesCount    = container.querySelector('#notif-types-count');
    const saveStatus    = container.querySelector('#notif-save-status');
    const saveBtn       = container.querySelector('#notif-save-btn');
    const testBtn       = container.querySelector('#notif-test-btn');
    const roleLabel    = container.querySelector('#notif-role-label');
    const statusBadge   = container.querySelector('#notif-status-badge');
    const sumNumber     = container.querySelector('#summary-number');
    const sumActive     = container.querySelector('#summary-active-types');
    const sumUpdated    = container.querySelector('#summary-updated');
    const testResult    = container.querySelector('#notif-test-result');

    let types = [];   // [{key,label,desc}] dari server (sudah difilter role)
    let flags = {};   // {key: bool}

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

    const countActive = () =>
      types.filter((t) => {
        const cb = typesList.querySelector(`[data-type="${t.key}"]`);
        return cb && cb.checked;
      }).length;

    const refreshCounts = () => {
      const active = countActive();
      typesCount.textContent = `${active} dari ${types.length} jenis aktif`;
      sumActive.textContent = `${active} jenis aktif`;
    };

    const renderTypes = () => {
      if (!types.length) {
        typesList.innerHTML = `<div style="font-size: 0.82rem; color: var(--text-muted);">Tidak ada jenis notifikasi untuk role Anda.</div>`;
        refreshCounts();
        return;
      }

      typesList.innerHTML = types.map((t) => {
        const checked = flags[t.key] !== false;
        return `
          <label style="display: flex; gap: 0.6rem; align-items: flex-start; padding: 0.6rem 0.7rem; background: var(--bg-secondary, #f8fafc); border: 1px solid var(--border-light); border-radius: var(--radius-md, 8px); cursor: pointer;">
            <input type="checkbox" data-type="${esc(t.key)}" ${checked ? 'checked' : ''} style="margin: 0.15rem 0 0 0; transform: scale(1.15); flex-shrink: 0;">
            <span style="min-width: 0;">
              <span style="display: block; font-size: 0.83rem; font-weight: 650; color: var(--text-main);">${esc(t.label)}</span>
              <span style="display: block; font-size: 0.74rem; color: var(--text-muted); margin-top: 0.1rem;">${esc(t.desc)}</span>
            </span>
          </label>`;
      }).join('');

      typesList.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        cb.addEventListener('change', refreshCounts);
      });
      refreshCounts();
    };

    const refreshSummary = (enabled, number) => {
      statusBadge.innerHTML = enabled
        ? `<span class="badge" style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;">✅ Notifikasi AKTIF</span>`
        : `<span class="badge" style="background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;">⛔ Notifikasi NONAKTIF</span>`;
      sumNumber.textContent = number || '—';
      refreshCounts();
    };

    const showTestResult = (ok, html) => {
      testResult.style.display = 'block';
      testResult.style.background = ok ? '#ecfdf5' : '#fef2f2';
      testResult.style.color = ok ? '#047857' : '#b91c1c';
      testResult.style.border = ok ? '1px solid #a7f3d0' : '1px solid #fecaca';
      testResult.innerHTML = html;
    };

    // =========================================================
    // MUAT PENGATURAN DARI SERVER
    // =========================================================
    const loadSettings = async () => {
      const res = await appState.notifPrefsGet(user.id);

      if (res.status !== 'success') {
        saveStatus.textContent = res.message || 'Gagal memuat pengaturan.';
        typesList.innerHTML = `<div style="font-size: 0.82rem; color: #b91c1c;">${esc(res.message || 'Gagal memuat jenis notifikasi.')}</div>`;
        return;
      }

      roleLabel.textContent = res.role_label || '—';
      types = Array.isArray(res.types) ? res.types : [];
      flags = res.flags || {};

      numberInput.value = res.wa_number || '';
      enabledToggle.checked = res.wa_notif_enabled !== false;

      const num = res.wa_number || '';
      numberCurrent.textContent = num || 'belum diatur';
      sumUpdated.textContent = res.prefs_updated_at
        ? String(res.prefs_updated_at).replace('T', ' ').slice(0, 19)
        : 'Belum pernah';

      renderTypes();
      refreshSummary(enabledToggle.checked, num);
      saveStatus.textContent = res.found
        ? 'Pengaturan dimuat. Ubah sesuai kebutuhan lalu klik Simpan Pengaturan.'
        : 'Anda belum mengatur notifikasi. Isi nomor WhatsApp lalu simpan.';
    };

    loadSettings();

    // =========================================================
    // EVENT: TOGGLE GLOBAL
    // =========================================================
    enabledToggle.addEventListener('change', () => {
      refreshSummary(enabledToggle.checked, numberInput.value.trim());
    });

    numberInput.addEventListener('input', () => {
      sumNumber.textContent = numberInput.value.trim() || '—';
    });

    // =========================================================
    // D. SIMPAN PENGATURAN
    // =========================================================
    saveBtn.onclick = async () => {
      const number = numberInput.value.trim();

      if (!isValidWa(number)) {
        AuthModule.showToast('Nomor WhatsApp tidak valid. Gunakan format 081234567890 atau 6281234567890.');
        numberInput.classList.add('is-invalid');
        numberInput.focus();
        return;
      }
      numberInput.classList.remove('is-invalid');

      if (!enabledToggle.checked) {
        const ok = window.confirm(
          'Nonaktifkan SEMUA notifikasi WhatsApp?\n\nAnda tidak akan menerima pesan notifikasi apa pun sampai diaktifkan kembali.'
        );
        if (!ok) return;
      }

      const typePrefs = {};
      types.forEach((t) => {
        const cb = typesList.querySelector(`[data-type="${t.key}"]`);
        if (cb) typePrefs[t.key] = cb.checked;
      });

      setBusy(saveBtn, true, 'Menyimpan…');
      saveStatus.textContent = 'Menyimpan pengaturan…';

      const res = await appState.notifPrefsSave(user.id, {
        wa_number: number,
        wa_notif_enabled: enabledToggle.checked,
        types: typePrefs
      });

      setBusy(saveBtn, false);

      if (res.status === 'success') {
        saveStatus.innerHTML = `<span style="color: #047857;">✅ ${esc(res.message || 'Pengaturan tersimpan.')}</span>`;
        AuthModule.showToast('Pengaturan notifikasi WhatsApp berhasil disimpan.');
        loadSettings();
      } else {
        saveStatus.innerHTML = `<span style="color: #b91c1c;">❌ ${esc(res.message || 'Gagal menyimpan pengaturan.')}</span>`;
        AuthModule.showToast(res.message || 'Gagal menyimpan pengaturan.');
      }
    };

    // =========================================================
    // E. KIRIM PESAN PERCOBAAN
    // =========================================================
    testBtn.onclick = async () => {
      const number = numberInput.value.trim();

      if (!isValidWa(number)) {
        AuthModule.showToast('Simpan nomor WhatsApp yang valid terlebih dahulu.');
        numberInput.focus();
        return;
      }

      setBusy(testBtn, true, 'Mengirim…');
      testResult.style.display = 'block';
      testResult.style.background = '#f8fafc';
      testResult.style.color = '#475569';
      testResult.style.border = '1px solid #e2e8f0';
      testResult.textContent = 'Mengirim pesan percobaan…';

      const res = await appState.notifPrefsTest(user.id);

      setBusy(testBtn, false);

      if (res.status === 'success') {
        const target = (res.result && res.result.target) || number;
        showTestResult(true,
          `<strong>✅ Pesan percobaan terkirim.</strong><br>Tujuan: <strong>${esc(target)}</strong><br>
           <span style="opacity:0.85;">${esc((res.result && res.result.message) || 'Cek WhatsApp Anda.')}</span>`);
        AuthModule.showToast(`Pesan uji terkirim ke ${target}. Cek WhatsApp Anda!`);
      } else {
        const msg = (res.result && res.result.message) || res.message || 'Gagal mengirim pesan percobaan.';
        showTestResult(false, `<strong>❌ Gagal mengirim.</strong><br>${esc(msg)}`);
        AuthModule.showToast(msg);
      }
    };
  }
};
