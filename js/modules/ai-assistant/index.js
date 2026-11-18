// DesaBiz AI - Halaman Chat "DesaBiz AI Assistant"
// UI chat modern (welcome state, bubble chat, kartu kaya, chips saran, typing indicator)
// Seluruh "kecerdasan" didelegasikan ke AIAssistantService (lihat js/services/aiAssistantService.js)

import { Icons } from '../../icons.js';
import { appState } from '../../state.js';
import { aiAssistantService } from '../../services/aiAssistantService.js';

const HISTORY_KEY = 'desabiz_ai_chat_v1_';
const MAX_STORED_MESSAGES = 60;

export const AIAssistantModule = {
  id: 'ai-assistant',
  title: 'DesaBiz AI Assistant',
  subtitle: 'Cari supplier & produk, minta rekomendasi dagang, baca data penjualan, cek stok, hingga panduan fitur — semua dalam satu percakapan',

  // State lokal halaman chat
  messages: [],
  isBusy: false,
  draft: '',
  _ownerId: null,
  _inputFocused: false,

  // ==========================================
  // RIWAYAT PERCAKAPAN (localStorage, per pengguna)
  // ==========================================
  loadHistory(user) {
    if (!user) {
      this.messages = [];
      this._ownerId = null;
      return;
    }
    if (this._ownerId === user.id) return;
    try {
      const raw = localStorage.getItem(HISTORY_KEY + user.id);
      const parsed = raw ? JSON.parse(raw) : [];
      this.messages = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      this.messages = [];
    }
    this._ownerId = user.id;
  },

  saveHistory() {
    if (!this._ownerId) return;
    try {
      localStorage.setItem(
        HISTORY_KEY + this._ownerId,
        JSON.stringify(this.messages.slice(-MAX_STORED_MESSAGES))
      );
    } catch (e) {
      /* localStorage penuh/di-nonaktifkan: percakapan tetap hidup di memori */
    }
  },

  clearChat() {
    this.messages = [];
    this.draft = '';
    this.saveHistory();
    this.refresh();
    this.focusInput(true);
  },

  // ==========================================
  // RENDER HALAMAN
  // ==========================================
  render(container) {
    const state = appState.getState();
    const user = state.user;
    if (!user || !container) return;

    this.loadHistory(user);

    const suggestions = aiAssistantService.getQuickSuggestions();
    const capabilities = aiAssistantService.getCapabilities();
    const engine = aiAssistantService.getEngineInfo();
    const firstName = (user.ownerName || 'Pelanggan').split(' ')[0];
    const userInitial = user.avatarInitial ||
      (user.ownerName || 'UM').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    const aiName = user.accountRole === 'ADMIN' ? 'Admin Assistant' : 'UMKM Assistant';
    this.aiName = aiName;

    container.innerHTML = `
      <div class="fade-in">
        <!-- Page Header -->
        <div class="page-header" style="margin-bottom: 1rem;">
          <div class="page-header-info">
            <div class="breadcrumbs">
              <a href="#/dashboard">Beranda</a>
              <span class="breadcrumb-separator">/</span>
              <span class="breadcrumb-item active">DesaBiz AI Assistant</span>
            </div>
            <h1 class="page-title">${this.title}</h1>
            <p class="page-subtitle">${this.subtitle}</p>
          </div>
          <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
            <span class="ai-engine-badge ${engine.mode}" id="ai-engine-badge" title="${this.escapeHtml(engine.hint)}">
              ⚡ ${engine.label}
            </span>
            <button type="button" class="btn btn-secondary btn-sm" id="ai-new-chat">
              ${Icons.refresh} Obrolan Baru
            </button>
          </div>
        </div>

        <!-- AI Chat Shell -->
        <div class="ai-chat-shell">
          <!-- 1. Panel kiri: identitas, saran cepat, kemampuan -->
          <aside class="ai-chat-side">
            <div class="ai-side-brand">
              <div class="ai-side-avatar">${Icons.sparkle}</div>
              <div class="ai-side-brand-info">
                <div class="ai-side-name">${aiName}</div>
                <div class="ai-side-status"><span class="ai-pulse-dot"></span> Online • siap membantu</div>
              </div>
            </div>

            <div class="ai-side-scroll">
              <div class="ai-side-label">Pertanyaan populer</div>
              <div class="ai-side-prompts">
                ${suggestions.map(s => `
                  <button type="button" class="ai-side-prompt" data-prompt="${this.escapeAttr(s.prompt)}">
                    <span class="ai-side-prompt-icon">${s.icon}</span>
                    <span>${s.label}</span>
                  </button>
                `).join('')}
              </div>

              <div class="ai-side-label">Kemampuan asisten</div>
              <ul class="ai-side-caps">
                ${capabilities.map(c => `
                  <li>
                    <span class="ai-cap-icon">${c.icon}</span>
                    <span class="ai-cap-text">
                      <strong>${c.title}</strong>
                      <em>${c.desc}</em>
                    </span>
                  </li>
                `).join('')}
              </ul>
            </div>

            <div class="ai-side-footer">
              <button type="button" class="ai-side-clear" id="ai-clear-chat">
                ${Icons.trash} Hapus riwayat percakapan
              </button>
              <p>Jawaban dibuat dari data aplikasi Anda. API key tidak pernah disimpan di browser.</p>
            </div>
          </aside>

          <!-- 2. Kolom kanan: ruang chat -->
          <section class="ai-chat-main">
            <header class="ai-chat-topbar">
              <div class="ai-chat-topbar-info">
                <div class="ai-topbar-avatar">${Icons.sparkle}</div>
                <div>
                  <h2>${aiName}</h2>
                  <span class="ai-topbar-status">Terhubung dengan ${this.escapeHtml(user.businessName || user.ownerName)}</span>
                </div>
              </div>
              <div class="ai-chat-topbar-actions">
                <span class="ai-topbar-model">DesaBiz Hybrid Engine</span>
                <button type="button" class="btn btn-ai btn-sm" id="ai-new-chat-top">
                  ${Icons.plus} Obrolan Baru
                </button>
              </div>
            </header>

            <div class="ai-chat-scroll" id="ai-chat-scroll">
              ${this.messages.length
                ? this.messages.map(m => this.renderMessage(m, userInitial)).join('') + (this.isBusy ? this.renderTyping() : '')
                : this.renderWelcome(firstName, suggestions)}
            </div>

            <div class="ai-suggest-strip" id="ai-suggest-strip" ${this.isBusy ? 'style="display:none"' : ''}>
              ${suggestions.slice(0, 5).map(s => `
                <button type="button" class="ai-chip" data-prompt="${this.escapeAttr(s.prompt)}">${s.icon} ${s.label}</button>
              `).join('')}
            </div>

            <form class="ai-composer" id="ai-composer" autocomplete="off">
              <div class="ai-composer-box">
                <textarea
                  id="ai-input"
                  class="ai-input"
                  rows="1"
                  placeholder='Tulis pertanyaan... mis. "Saya membutuhkan supplier beras."'
                >${this.escapeHtml(this.draft)}</textarea>
              </div>
              <button type="submit" class="btn-ai-send ${this.isBusy ? 'is-loading' : ''}" id="ai-send"
                title="Kirim pertanyaan" ${this.isBusy ? 'disabled' : ''}>
                ${Icons.send}
              </button>
            </form>
            <p class="ai-disclaimer">
              DesaBiz AI dapat membuat kesalahan — periksa kembali informasi penting.
              Konteks dikirim hanya untuk memproses pertanyaan Anda.
            </p>
          </section>
        </div>
      </div>
    `;

    this.attachEvents(container);
    this.scrollBottom(false);
    if (this._inputFocused) this.focusInput(false);
  },

  // ==========================================
  // LAYAR SELAMAT DATANG (belum ada pesan)
  // ==========================================
  renderWelcome(firstName, suggestions) {
    return `
      <div class="ai-welcome">
        <div class="ai-welcome-orb">${Icons.sparkle}</div>
        <h3>Halo, ${this.escapeHtml(firstName)} 👋</h3>
        <p>
          Saya <strong>${this.aiName || 'DesaBiz AI Assistant'}</strong>. Tanyakan apa saja seputar pasokan dan penjualan UMKM Anda —
          dari mencari supplier, rekomendasi produk, audit stok, sampai membaca data penjualan.
        </p>
        <div class="ai-welcome-grid">
          ${suggestions.map(s => `
            <button type="button" class="ai-welcome-card" data-prompt="${this.escapeAttr(s.prompt)}">
              <span class="ai-welcome-card-icon">${s.icon}</span>
              <span class="ai-welcome-card-title">${s.title}</span>
              <span class="ai-welcome-card-desc">${s.desc}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  },

  // ==========================================
  // RENDER SATU PESAN (bubble)
  // ==========================================
  renderMessage(m, userInitial = 'UM') {
    if (!m) return '';
    const time = m.time || '';

    if (m.role === 'user') {
      return `
        <div class="ai-msg-row user">
          <div class="ai-msg-content">
            <div class="ai-bubble user">
              <div class="ai-bubble-text">${this.formatRichText(m.text)}</div>
              <div class="ai-msg-meta"><span>${time}</span></div>
            </div>
          </div>
          <div class="ai-msg-avatar user">${this.escapeHtml(userInitial)}</div>
        </div>
      `;
    }

    const engineLabel = m.engine === 'api' ? 'AI API' : 'Local Engine';
    return `
      <div class="ai-msg-row assistant">
        <div class="ai-msg-avatar">${Icons.sparkle}</div>
        <div class="ai-msg-content">
          <div class="ai-bubble assistant">
            <div class="ai-bubble-text">${this.formatRichText(m.text)}</div>
            ${(m.cards && m.cards.length) ? `<div class="ai-cards">${m.cards.map(c => this.renderCard(c)).join('')}</div>` : ''}
            ${(m.actionPills && m.actionPills.length) ? `<div class="ai-action-pills">${this.renderPills(m.actionPills)}</div>` : ''}
            <div class="ai-msg-meta">
              <span class="ai-meta-name">DesaBiz AI</span>
              <span>${time}</span>
              <span class="ai-meta-engine">${engineLabel}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderTyping() {
    return `
      <div class="ai-msg-row assistant" id="ai-typing-row">
        <div class="ai-msg-avatar">${Icons.sparkle}</div>
        <div class="ai-msg-content">
          <div class="ai-bubble assistant ai-typing-bubble">
            <span class="ai-typing"><i></i><i></i><i></i></span>
          </div>
          <div class="ai-typing-label">DesaBiz AI sedang menganalisis data Anda...</div>
        </div>
      </div>
    `;
  },

  // ==========================================
  // KARTU RICH (supplier / produk / stok / pesanan / omzet)
  // ==========================================
  renderCard(card) {
    if (!card) return '';
    switch (card.type) {
      case 'supplier':
        return this.renderSupplierCard(card);
      case 'product':
        return this.renderProductCard(card);
      case 'stock':
        return this.renderStockCard(card);
      case 'order':
        return this.renderOrderCard(card);
      case 'sales_summary':
        return this.renderSalesCard(card);
      case 'info':
        return this.renderInfoCard(card);
      default:
        return '';
    }
  },

  // Kartu informasi generik (negosiasi, faktur, profil, katalog milik sendiri, chat)
  renderInfoCard(c) {
    const badgeClass = c.badge?.cls || 'badge-info';
    return `
      <div class="ai-card info">
        <div class="ai-card-head">
          <div class="ai-card-body">
            <div class="ai-card-title">${this.escapeHtml(c.title || '-')}</div>
            ${c.subtitle ? `<div class="ai-card-sub">${this.escapeHtml(c.subtitle)}</div>` : ''}
          </div>
          ${c.badge?.label ? `<span class="badge ${badgeClass}">${this.escapeHtml(c.badge.label)}</span>` : ''}
        </div>
        ${(c.rows && c.rows.length) ? `
          <div class="ai-card-meta">
            ${c.rows.map(r => `<span>${this.escapeHtml(r.label)}: <strong>${this.escapeHtml(String(r.value))}</strong></span>`).join('')}
          </div>
        ` : ''}
        ${(c.actions && c.actions.length) ? `
          <div class="ai-card-actions">
            ${c.actions.map(a => `<a class="btn btn-secondary btn-sm" href="${this.escapeAttr(a.link || '#')}">${this.escapeHtml(a.label)}</a>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  },

  renderSupplierCard(c) {
    const rating = Number(c.rating || 0);
    const stars = '★★★★★'.slice(0, Math.round(rating)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(rating));
    return `
      <div class="ai-card supplier">
        <div class="ai-card-head">
          <div class="ai-card-avatar">${this.escapeHtml(c.avatarInitial || 'SM')}</div>
          <div class="ai-card-head-info">
            <div class="ai-card-title">
              ${this.escapeHtml(c.name || '-')}
              ${c.isVerified ? `<span class="ai-card-verified" title="${this.escapeHtml(c.verifiedBadge || 'Terverifikasi')}">${Icons.checkCircle}</span>` : ''}
            </div>
            <div class="ai-card-sub">${Icons.store} ${this.escapeHtml(c.businessType || 'Supplier Desa')} • ${this.escapeHtml(c.owner || '')}</div>
          </div>
          <div class="ai-card-rating" title="Rating ${rating} dari ${c.reviewCount || 0} ulasan">
            <span class="ai-stars">${stars}</span>
            <strong>${rating.toFixed(1)}</strong>
            <span>(${c.reviewCount || 0})</span>
          </div>
        </div>

        <div class="ai-card-meta">
          <span>${Icons.mapPin} ${this.escapeHtml(c.location || '-')}</span>
          <span>${Icons.truck} ${(c.transactionCount || 0).toLocaleString('id-ID')} transaksi</span>
        </div>

        ${(c.featuredProducts && c.featuredProducts.length) ? `
          <div class="ai-card-tags">
            ${c.featuredProducts.map(p => `<span class="ai-card-tag">${Icons.tag} ${this.escapeHtml(p)}</span>`).join('')}
          </div>
        ` : ''}

        <div class="ai-card-actions">
          <a class="btn btn-primary btn-sm" href="#/supplier?id=${this.escapeAttr(c.id)}">Lihat Profil</a>
          <a class="btn btn-secondary btn-sm" href="#/chat?partnerId=${this.escapeAttr(c.sellerId || '')}">${Icons.chat} Chat</a>
        </div>
      </div>
    `;
  },

  renderProductCard(c) {
    const fallbackImg = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80';
    return `
      <div class="ai-card product">
        <img class="ai-card-img" src="${this.escapeAttr(c.imageUrl || fallbackImg)}" alt="${this.escapeAttr(c.name || 'Produk')}"
          onerror="this.src='${fallbackImg}'" />
        <div class="ai-card-body">
          <div class="ai-card-title">${this.escapeHtml(c.name || '-')}</div>
          <div class="ai-card-sub">${this.escapeHtml(c.category || 'Komoditas')} • ${Icons.mapPin} ${this.escapeHtml(c.location || '-')}</div>
          <div class="ai-card-price">
            Rp ${Number(c.price || 0).toLocaleString('id-ID')}<span>/${this.escapeHtml(c.unit || 'unit')}</span>
          </div>
          <div class="ai-card-meta">
            <span>MOQ ${Number(c.minOrder || 0).toLocaleString('id-ID')} ${this.escapeHtml(c.unit || '')}</span>
            <span>Penjual: ${this.escapeHtml(c.sellerName || '-')}</span>
            ${c.harvestGrade ? `<span>${this.escapeHtml(c.harvestGrade)}</span>` : ''}
          </div>
          <div class="ai-card-actions">
            <a class="btn btn-primary btn-sm" href="#/pesanan-buat?productId=${this.escapeAttr(c.id)}">${Icons.pesanan} Buat PO</a>
            <a class="btn btn-secondary btn-sm" href="#/negosiasi?action=create&productId=${this.escapeAttr(c.id)}">${Icons.negosiasi} Nego</a>
          </div>
        </div>
      </div>
    `;
  },

  renderStockCard(c) {
    const threshold = Number(c.threshold || 1000);
    const stock = Number(c.stock || 0);
    const pct = Math.max(4, Math.min(100, Math.round((stock / (threshold * 2)) * 100)));
    const tone = c.status === 'habis' ? 'danger' : (c.status === 'menipis' ? 'warning' : 'success');
    const badgeClass = c.status === 'habis' ? 'badge-info' : (c.status === 'menipis' ? 'badge-accent' : 'badge-success');
    return `
      <div class="ai-card stock">
        <div class="ai-card-head">
          <div class="ai-card-body">
            <div class="ai-card-title">${this.escapeHtml(c.name || '-')}</div>
            <div class="ai-card-sub">Batas aman ${threshold.toLocaleString('id-ID')} ${this.escapeHtml(c.unit || '')}</div>
          </div>
          <span class="badge ${badgeClass}">${this.escapeHtml(c.statusLabel || 'Stok')}</span>
        </div>

        <div class="ai-stock-bar"><span class="ai-stock-fill ${tone}" style="width: ${pct}%"></span></div>

        <div class="ai-card-meta">
          <span>Tersisa <strong>${stock.toLocaleString('id-ID')} ${this.escapeHtml(c.unit || '')}</strong></span>
          <span>Nilai persediaan: <strong>Rp ${Number(c.inventoryValue || 0).toLocaleString('id-ID')}</strong></span>
        </div>

        <div class="ai-card-actions">
          <a class="btn btn-primary btn-sm" href="#/stok">Kelola Stok</a>
          <a class="btn btn-secondary btn-sm" href="#/stok?filter=${c.status === 'tersedia' ? 'all' : 'menipis'}">Lihat Detail</a>
        </div>
      </div>
    `;
  },

  renderOrderCard(c) {
    const badgeClass = this.statusBadgeClass(c.status);
    return `
      <div class="ai-card order">
        <div class="ai-card-head">
          <div class="ai-card-body">
            <div class="ai-card-title">#${this.escapeHtml(c.id || '-')} • ${this.escapeHtml(c.productName || '-')}</div>
            <div class="ai-card-sub">${this.escapeHtml(c.partnerName || '-')} • ${this.escapeHtml(c.date || '')}</div>
          </div>
          <span class="badge ${badgeClass}">${this.escapeHtml(c.status || '-')}</span>
        </div>

        <div class="ai-card-meta">
          <span>${Icons.box} ${Number(c.quantity || 0).toLocaleString('id-ID')} ${this.escapeHtml(c.productUnit || '')}</span>
          <span>Nilai: <strong>Rp ${Number(c.totalAmount || 0).toLocaleString('id-ID')}</strong></span>
          <span>${c.isSeller ? 'Anda sebagai penjual' : 'Anda sebagai pembeli'}</span>
        </div>

        <div class="ai-card-actions">
          <a class="btn btn-primary btn-sm" href="#/pesanan-detail?id=${this.escapeAttr(c.id)}">Lihat Detail PO</a>
          <a class="btn btn-secondary btn-sm" href="#/pesanan">Semua Pesanan</a>
        </div>
      </div>
    `;
  },

  renderSalesCard(c) {
    return `
      <div class="ai-card sales">
        <div class="ai-card-title">${Icons.trendingUp} ${this.escapeHtml(c.title || 'Ringkasan Penjualan')}</div>
        <div class="ai-card-kpis">
          <div class="ai-kpi">
            <span>Total Omzet</span>
            <strong>${this.escapeHtml(c.totalOmzet || '-')}</strong>
          </div>
          <div class="ai-kpi">
            <span>Tren Pekan Ini</span>
            <strong class="up">${this.escapeHtml(c.growth || '-')}</strong>
          </div>
          <div class="ai-kpi">
            <span>Rata-rata / Hari</span>
            <strong>${this.escapeHtml(c.avgDaily || '-')}</strong>
          </div>
          <div class="ai-kpi">
            <span>Faktur</span>
            <strong>${c.settledTrx || 0} lunas • ${c.pendingTrx || 0} pending</strong>
          </div>
        </div>
        <div class="ai-card-actions">
          <a class="btn btn-primary btn-sm" href="#/transaksi">Lihat Transaksi & Faktur</a>
          <a class="btn btn-secondary btn-sm" href="#/dashboard">Dashboard</a>
        </div>
      </div>
    `;
  },

  statusBadgeClass(status = '') {
    const s = status.toLowerCase();
    if (s.includes('selesai') || s.includes('lunas')) return 'badge-success';
    if (s.includes('batal')) return 'badge-accent';
    if (s.includes('menunggu') || s.includes('proses')) return 'badge-info';
    if (s.includes('konfirmasi') || s.includes('dikirim')) return 'badge-primary';
    return 'badge-info';
  },

  renderPills(pills) {
    return pills.map(p => {
      if (!p) return '';
      if (p.link) {
        return `<a class="ai-action-pill" href="${this.escapeAttr(p.link)}">${p.label}</a>`;
      }
      if (p.prompt) {
        return `<button type="button" class="ai-action-pill" data-prompt="${this.escapeAttr(p.prompt)}">${p.label}</button>`;
      }
      return '';
    }).join('');
  },

  // ==========================================
  // PERFORMA TEKS RICH (aman: escape dulu, lalu format)
  // ==========================================
  formatRichText(raw) {
    if (!raw) return '';
    const escaped = this.escapeHtml(raw);
    const inline = (t) => t
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');

    const lines = escaped.split('\n');
    let html = '';
    let inList = false;
    let inCode = false;
    let codeBuf = [];

    const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };
    const flushCode = () => {
      if (!codeBuf.length) return;
      html += `<pre class="ai-code"><code>${codeBuf.join('\n')}</code></pre>`;
      codeBuf = [];
    };

    lines.forEach(line => {
      const t = line.trim();

      // Blok kode (``` ... ```)
      if (/^```/.test(t)) {
        if (inCode) { flushCode(); inCode = false; }
        else { closeList(); inCode = true; }
        return;
      }
      if (inCode) { codeBuf.push(line); return; }

      const bullet = t.match(/^(?:[•\-\u2022]\s+|\d+\.\s+)(.*)$/);
      if (bullet) {
        if (!inList) { html += '<ul class="ai-rich-list">'; inList = true; }
        html += `<li>${inline(bullet[1])}</li>`;
      } else {
        closeList();
        if (t) html += `<p>${inline(t)}</p>`;
      }
    });
    closeList();
    if (inCode) flushCode();
    return html || '<p></p>';
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  escapeAttr(str) {
    return this.escapeHtml(str);
  },

  // ==========================================
  // REFRESH SEBAGIAN (tanpa render ulang seluruh halaman)
  // Scope: bila area chat halaman penuh tampil -> pakai situ; jika tidak
  // (Asisten AI kini berupa panel kanan / AIDock) -> pakai panel dock.
  // ==========================================
  refresh() {
    const pageRoot = document.getElementById('app-content-container');
    const pageScroll = pageRoot ? pageRoot.querySelector('#ai-chat-scroll') : null;
    const root = pageScroll ? pageRoot : (document.getElementById('aidock-panel') || document);
    const scroll = pageScroll || root.querySelector('#ai-chat-scroll');
    const user = appState.getState().user;
    const userInitial = user
      ? (user.avatarInitial || (user.ownerName || 'UM').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase())
      : 'UM';

    if (scroll) {
      scroll.innerHTML = this.messages.length
        ? this.messages.map(m => this.renderMessage(m, userInitial)).join('') + (this.isBusy ? this.renderTyping() : '')
        : this.renderWelcome((user?.ownerName || 'Pelanggan').split(' ')[0], aiAssistantService.getQuickSuggestions());
      this.scrollBottom();
    }

    const sendBtn = root.querySelector('#ai-send');
    if (sendBtn) {
      sendBtn.disabled = this.isBusy;
      sendBtn.classList.toggle('is-loading', this.isBusy);
    }

    const strip = root.querySelector('#ai-suggest-strip');
    if (strip) strip.style.display = this.isBusy ? 'none' : '';

    // Pasang handler untuk elemen saran yang baru dirender ulang
    this.bindPromptElements(root);
  },

  scrollBottom(smooth = true) {
    setTimeout(() => {
      const scroll = document.getElementById('ai-chat-scroll');
      if (scroll) {
        scroll.scrollTo({ top: scroll.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
      }
    }, 60);
  },

  focusInput(select = false) {
    const input = document.getElementById('ai-input');
    if (!input) return;
    input.focus();
    if (select) input.setSelectionRange(input.value.length, input.value.length);
    this._inputFocused = true;
  },

  updateEngineBadge() {
    const el = document.getElementById('ai-engine-badge');
    if (!el) return;
    const info = aiAssistantService.getEngineInfo();
    el.className = `ai-engine-badge ${info.mode}`;
    el.title = info.hint;
    el.textContent = `⚡ ${info.label}`;
  },

  // ==========================================
  // KIRIM PERTANYAAN
  // ==========================================
  async handleSend(text) {
    const trimmed = (text || '').trim();
    if (!trimmed || this.isBusy) return;

    this.draft = '';
    this.messages.push({
      id: `ai_${Date.now()}_u`,
      role: 'user',
      text: trimmed,
      time: this.nowTime()
    });
    this.saveHistory();

    this.isBusy = true;
    this.refresh();
    this.scrollBottom();

    const history = this.messages.slice(-8).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text
    }));

    try {
      const reply = await aiAssistantService.sendMessage(trimmed, history);
      this.messages.push({
        id: `ai_${Date.now()}_a`,
        role: 'assistant',
        text: reply.text,
        category: reply.category,
        cards: reply.cards || [],
        actionPills: reply.actionPills || [],
        engine: reply.engine,
        time: this.nowTime()
      });
      this.updateEngineBadge();
    } catch (e) {
      this.messages.push({
        id: `ai_${Date.now()}_e`,
        role: 'assistant',
        text: 'Mohon maaf, terjadi gangguan saat menghubungi mesin AI DesaBiz. Silakan coba kembali beberapa saat lagi.',
        category: 'error',
        cards: [],
        actionPills: [{ label: '🔁 Coba Kirim Ulang', prompt: trimmed }],
        engine: 'mock',
        time: this.nowTime()
      });
    } finally {
      this.isBusy = false;
      this.saveHistory();
      this.refresh();
      this.scrollBottom();
    }
  },

  nowTime() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  },

  // ==========================================
  // EVENTS
  // ==========================================
  bindPromptElements(root) {
    if (!root) return;
    root.querySelectorAll('[data-prompt]').forEach(el => {
      if (el._promptBound) return; // cegah binding ganda saat refresh parsial
      el._promptBound = true;
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const prompt = el.dataset.prompt;
        if (!prompt) return;
        const input = document.getElementById('ai-input');
        if (input) input.value = prompt;
        this.draft = prompt;
        this.handleSend(prompt);
      });
    });
  },

  attachEvents(container) {
    // 1. Semua elemen dengan data-prompt (kartu saran, chips, pill balasan)
    this.bindPromptElements(container);

    // 2. Tombol obrolan baru / hapus riwayat
    const clearHandler = (e) => {
      e.preventDefault();
      if (this.messages.length === 0) return;
      const ok = window.confirm('Hapus seluruh riwayat percakapan dengan DesaBiz AI?');
      if (ok) this.clearChat();
    };
    ['ai-new-chat', 'ai-new-chat-top', 'ai-clear-chat'].forEach(id => {
      const btn = container.querySelector(`#${id}`);
      if (btn) btn.addEventListener('click', clearHandler);
    });

    // 3. Form composer
    const form = container.querySelector('#ai-composer');
    const input = container.querySelector('#ai-input');
    const autoGrow = () => {
      if (!input) return;
      input.style.height = 'auto';
      input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
    };

    if (input) {
      autoGrow();
      input.addEventListener('input', () => {
        this.draft = input.value;
        autoGrow();
      });
      input.addEventListener('focus', () => { this._inputFocused = true; });
      input.addEventListener('blur', () => { this._inputFocused = false; });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (form) form.requestSubmit();
        }
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const value = input ? input.value : '';
        if (input) {
          input.value = '';
          input.style.height = 'auto';
        }
        this.draft = '';
        this.handleSend(value);
      });
    }
  }
};
