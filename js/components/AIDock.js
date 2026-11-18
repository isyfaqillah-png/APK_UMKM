// DesaBiz AI - AIDock (Asisten AI di sisi kanan layar)
// ============================================================================
// Komponen presentasi SAJA:
//   • Tombol mengambang (FAB) berbentuk ikon chatbot di pojok kanan bawah.
//   • Panel percakapan yang meluncur dari sisi kanan (slide-in), berbayang,
//     dengan header (ikon, nama, status, minimalkan, tutup), area bubble chat,
//     indikator mengetik, serta composer (Enter kirim, Shift+Enter baris baru).
//
// SELURUH logika chatbot TIDAK ditulis ulang di sini. Komponen ini mendelegasikan
// ke AIAssistantModule (js/modules/ai-assistant/index.js):
//   • Riwayat percakapan  -> AIAssistantModule.loadHistory / saveHistory (per user)
//   • Pengiriman pesan    -> AIAssistantModule.handleSend -> aiAssistantService
//   • Sapaan, bubble, kartu rich, chips, indikator mengetik -> render milik modul
//   • Penyesuaian role & konteks website -> AIAssistantService (tidak berubah)
// Dengan begitu integrasi API key / provider AI / backend api/ai.php tetap
// persis seperti sebelumnya (tidak ada perubahan logika chatbot).
// ============================================================================

import { Icons } from '../icons.js';
import { appState } from '../state.js';
import { aiAssistantService } from '../services/aiAssistantService.js';
import { AIAssistantModule } from '../modules/ai-assistant/index.js';

// Route yang tidak membutuhkan tombol Asisten AI (halaman autentikasi)
const HIDDEN_ROUTES = ['login', 'register', 'logout'];

const ICON_MINIMIZE = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const ICON_EXPAND = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>`;

export const AIDock = {
  _mounted: false,
  root: null,
  fab: null,
  panel: null,

  // ==========================================================
  // MOUNT (sekali saja, dipanggil dari app.js)
  // ==========================================================
  mount() {
    if (this._mounted || typeof document === 'undefined') return;
    this._mounted = true;

    const root = document.createElement('div');
    root.id = 'aidock-root';
    root.dataset.state = 'closed';
    root.innerHTML = `
      <!-- Tombol mengambang: tetap terlihat saat halaman digulir (position: fixed) -->
      <button
        type="button"
        class="aidock-fab"
        id="aidock-fab"
        aria-label="Buka Asisten AI DesaBiz"
        aria-expanded="false"
        aria-controls="aidock-panel"
        title="Asisten AI DesaBiz"
      >${Icons.aiAssistant}</button>

      <!-- Panel kanan: muncul dengan animasi slide dari kanan -->
      <aside
        class="aidock-panel"
        id="aidock-panel"
        role="dialog"
        aria-modal="false"
        aria-label="Asisten AI DesaBiz"
      >
        <header class="aidock-head" id="aidock-head">
          <span class="aidock-avatar" aria-hidden="true">${Icons.sparkle}</span>
          <span class="aidock-head-text">
            <strong>Asisten AI DesaBiz</strong>
            <span class="aidock-status">
              <span class="aidock-dot" aria-hidden="true"></span>
              <span>Online</span>
              <span class="aidock-sep" aria-hidden="true">•</span>
              <em id="aidock-engine" title="">…</em>
            </span>
          </span>
          <span class="aidock-actions">
            <button type="button" class="aidock-btn" id="aidock-new" title="Obrolan baru" aria-label="Mulai obrolan baru">${Icons.refresh}</button>
            <button type="button" class="aidock-btn" id="aidock-min" title="Minimalkan" aria-label="Minimalkan panel Asisten AI" aria-expanded="true">${ICON_MINIMIZE}</button>
            <button type="button" class="aidock-btn" id="aidock-close" title="Tutup" aria-label="Tutup panel Asisten AI">${Icons.x}</button>
          </span>
        </header>

        <div class="aidock-body">
          <!-- ID elemen chat sengaja sama dengan halaman chat lama sehingga
               seluruh helper AIAssistantModule (refresh, scroll, binding)
               bekerja tanpa perubahan logika. Tampilan penuh & panel tidak
               pernah tampil bersamaan (route lama diarahkan ke panel). -->
          <div class="ai-chat-scroll aidock-scroll" id="ai-chat-scroll"></div>
          <div class="ai-suggest-strip" id="ai-suggest-strip"></div>
          <form class="ai-composer aidock-composer" id="ai-composer" autocomplete="off">
            <div class="ai-composer-box">
              <textarea
                id="ai-input"
                class="ai-input"
                rows="1"
                placeholder='Tulis pertanyaan... mis. "Stok saya hampir habis"'
                aria-label="Tulis pesan untuk Asisten AI DesaBiz"
              ></textarea>
            </div>
            <button type="submit" class="btn-ai-send" id="ai-send" title="Kirim pertanyaan" aria-label="Kirim pesan">${Icons.send}</button>
          </form>
          <p class="ai-disclaimer aidock-disclaimer">
            DesaBiz AI dapat membuat kesalahan — periksa kembali informasi penting.
            API key tidak pernah disimpan di browser.
          </p>
        </div>
      </aside>
    `;

    document.body.appendChild(root);
    this.root = root;
    this.fab = root.querySelector('#aidock-fab');
    this.panel = root.querySelector('#aidock-panel');

    this._bindEvents();
    this._updateStatus();

    // Sinkronisasi visibilitas: hanya untuk pengguna login & di luar halaman auth
    appState.subscribe((state) => this.syncVisibility(state));
    this.syncVisibility(appState.getState());
  },

  // ==========================================================
  // STATE PANEL (closed | open | min)
  // ==========================================================
  _setState(next) {
    if (!this.root) return;
    this.root.dataset.state = next;

    const minBtn = this.root.querySelector('#aidock-min');
    if (minBtn) {
      if (next === 'min') {
        minBtn.innerHTML = ICON_EXPAND;
        minBtn.title = 'Kembalikan panel';
        minBtn.setAttribute('aria-label', 'Kembalikan panel Asisten AI');
        minBtn.setAttribute('aria-expanded', 'false');
      } else {
        minBtn.innerHTML = ICON_MINIMIZE;
        minBtn.title = 'Minimalkan';
        minBtn.setAttribute('aria-label', 'Minimalkan panel Asisten AI');
        minBtn.setAttribute('aria-expanded', String(next === 'open'));
      }
    }
    if (this.fab) this.fab.setAttribute('aria-expanded', String(next !== 'closed'));
  },

  isOpen() {
    return !!this.root && this.root.dataset.state !== 'closed';
  },

  // ==========================================================
  // BUKA / TUTUP / MINIMALKAN
  // ==========================================================
  open() {
    this.mount();
    const user = appState.getState().user;
    if (!user) return;
    this._renderConversation(user);
    this._setState('open');
    setTimeout(() => AIAssistantModule.focusInput(), 320);
  },

  close() {
    if (!this.root) return;
    this._setState('closed');
    // Percakapan TIDAK dihapus: isi panel & riwayat di memori/localStorage tetap,
    // sehingga dibuka kembali tanpa kehilangan percakapan yang sedang berlangsung.
    if (this.fab) this.fab.focus({ preventScroll: true });
  },

  minimize() {
    this._setState('min');
  },

  toggle() {
    if (!this.root) return this.open();
    if (this.root.dataset.state === 'open') this.close();
    else this.open();
  },

  // ==========================================================
  // RENDER PERCAKAPAN (delegasi penuh ke AIAssistantModule)
  // ==========================================================
  _renderConversation(user) {
    AIAssistantModule.loadHistory(user);   // riwayat per pengguna (localStorage)
    AIAssistantModule.refresh();           // sapaan/bubble/typing + binding chips (scope: panel dock)
    this._renderSuggestChips();
    this._updateStatus();
  },

  // Chip saran di bawah kolom input. Pada halaman penuh, chip dirender oleh
  // template AIAssistantModule.render(); panel dock mengisi dari sumber yang
  // sama (getQuickSuggestions -> peran pengguna) lalu memasang handler modul.
  _renderSuggestChips() {
    const strip = this.panel && this.panel.querySelector('#ai-suggest-strip');
    if (!strip) return;
    try {
      const suggestions = aiAssistantService.getQuickSuggestions();
      strip.innerHTML = suggestions.slice(0, 5).map((s) => `
        <button type="button" class="ai-chip" data-prompt="${AIAssistantModule.escapeAttr(s.prompt)}">${s.icon} ${s.label}</button>
      `).join('');
      AIAssistantModule.bindPromptElements(this.panel);
    } catch (e) {
      // Saran tidak kritis — percakapan tetap berjalan tanpanya
    }
  },

  // Status engine: baca kondisi nyata dari service (Local Engine / AI API aktif)
  _updateStatus() {
    const el = this.root && this.root.querySelector('#aidock-engine');
    if (!el) return;
    try {
      const info = aiAssistantService.getEngineInfo();
      el.textContent = info.label;
      el.title = info.hint || '';
    } catch (e) {
      el.textContent = 'Siap membantu';
    }
  },

  // ==========================================================
  // VISIBILITAS (tidak muncul di halaman login / saat belum masuk)
  // ==========================================================
  syncVisibility(state) {
    if (!this.root) return;
    const authed = typeof appState.isAuthenticated === 'function' ? appState.isAuthenticated() : !!state.user;
    const visible = !!(
      state.user &&
      authed &&
      !HIDDEN_ROUTES.includes(state.currentRoute) &&
      !(state.mobileSidebarOpen && window.innerWidth <= 768)
    );
    const wasHidden = this.root.classList.contains('aidock-hidden');
    this.root.classList.toggle('aidock-hidden', !visible);

    // Muncul kembali (ganti halaman/sesi berganti) -> pastikan isi sesuai pemilik
    if (visible && wasHidden && state.user) this._renderConversation(state.user);
  },

  // ==========================================================
  // EVENTS
  // ==========================================================
  _bindEvents() {
    // 1. Tombol mengambang -> buka panel
    this.fab.addEventListener('click', () => this.open());

    // 2. Tutup / minimalkan / obrolan baru
    this.root.querySelector('#aidock-close').addEventListener('click', () => this.close());

    this.root.querySelector('#aidock-min').addEventListener('click', () => {
      this.root.dataset.state === 'open' ? this.minimize() : this.open();
    });

    this.root.querySelector('#aidock-new').addEventListener('click', (e) => {
      e.preventDefault();
      if (!AIAssistantModule.messages || AIAssistantModule.messages.length === 0) return;
      if (window.confirm('Hapus seluruh riwayat percakapan dengan DesaBiz AI?')) {
        AIAssistantModule.clearChat();
      }
    });

    // Saat diminimalkan, klik area kepala panel (di luar tombol) -> kembalikan
    this.root.querySelector('#aidock-head').addEventListener('click', (e) => {
      if (this.root.dataset.state !== 'min') return;
      if (e.target.closest('button')) return;
      this.open();
    });

    // 3. Composer: Enter = kirim, Shift+Enter = baris baru, auto-grow
    const form = this.root.querySelector('#ai-composer');
    const input = this.root.querySelector('#ai-input');
    const autoGrow = () => {
      input.style.height = 'auto';
      input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
    };

    input.addEventListener('input', () => {
      AIAssistantModule.draft = input.value; // draft bersama -> tidak hilang saat pindah halaman
      autoGrow();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      // Sedang memproses -> pesan tetap di kolom (tidak hilang)
      if (AIAssistantModule.isBusy) return;
      const value = input.value;
      if (!value.trim()) return;
      input.value = '';
      input.style.height = 'auto';
      AIAssistantModule.draft = '';
      await AIAssistantModule.handleSend(value); // logika kirim, riwayat, kartu, role: MODUL SAMA
      this._updateStatus();
      AIAssistantModule.focusInput();
    });

    // 4. Esc menutup panel
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        e.preventDefault();
        this.close();
      }
    });
  }
};

export default AIDock;
