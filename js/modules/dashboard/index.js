// DesaBiz AI - Dashboard Module (UI/UX Lengkap)
// AI Assistant terintegrasi langsung ke dashboard (hanya untuk mode Pembeli).
import { Icons } from '../../icons.js';
import { appState } from '../../state.js';
import { AIAssistantModule } from '../ai-assistant/index.js';
import { aiAssistantService } from '../../services/aiAssistantService.js';

// Riwayat chat AI Assistant di dashboard (per pengguna)
const DASH_AI_KEY = 'desabiz_dash_ai_';
const DASH_AI_MAX = 40;

export const DashboardModule = {
  id: 'dashboard',
  title: 'Dashboard Utama',
  subtitle: 'Platform operasional B2B dan pusat kendali usaha UMKM pedesaan',

  // State chatbot mengambang - disimpan di objek modul agar tetap hidup
  // saat notify() memicu render ulang halaman Beranda.
  aiChat: {
    open: false,
    messages: [],
    isBusy: false,
    draft: '',
    ownerId: null
  },

  render: (container) => {
    const state = appState.getState();
    const user = state.user;
    const stats = state.stats;
    const isBuyer = user.role === 'buyer';
    // AI hanya tampil untuk mode Pembeli (role buyer) dan Admin (accountRole ADMIN).
    // Untuk Penjual (UMKM) tidak ditampilkan di dashboard AI section.
    const isAdmin = user.accountRole === 'ADMIN';
    const showAi = isBuyer || isAdmin;
    const chartData = state.salesChart.periods[state.salesChart.activePeriod];
    const recentOrders = state.recentOrders || [];

    // Stok menipis/habis untuk kartu "Peringatan Gudang" (data-driven)
    const stockItems = (appState.getStockProducts ? appState.getStockProducts(user.id) : []) || [];
    const lowStockCount = stockItems.filter(s =>
      s.statusInfo && ['menipis', 'habis'].includes(String(s.statusInfo.status).toLowerCase())
    ).length;

    // Riwayat chatbot Beranda (per pengguna)
    DashboardModule.loadAiChat(user);

    // Filter state for orders table
    let activeOrderFilter = 'all';

    // SVG Chart Generator Helper
    const generateSvgChart = (data) => {
      const width = 640;
      const height = 200;
      const padX = 45;
      const padY = 25;
      const plotW = width - padX * 2;
      const plotH = height - padY * 2;
      const maxVal = Math.max(...data.values) * 1.15 || 1;

      const points = data.values.map((v, i) => {
        const x = padX + (i / (data.values.length - 1)) * plotW;
        const y = height - padY - (v / maxVal) * plotH;
        return { x, y, val: v, label: data.labels[i] };
      });

      const polylinePoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      const polygonPoints = `${padX},${height - padY} ${polylinePoints} ${width - padX},${height - padY}`;

      // Horizontal grid lines
      const gridLevels = [0.25, 0.5, 0.75, 1];
      const gridLines = gridLevels.map(level => {
        const y = height - padY - level * plotH;
        const valText = 'Rp ' + Math.round((maxVal * level) / 1000000) + 'jt';
        return `
          <line x1="${padX}" y1="${y}" x2="${width - padX}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="4" stroke-width="1"/>
          <text x="${padX - 8}" y="${y + 4}" font-size="10" fill="#94a3b8" text-anchor="end" font-family="Inter">${valText}</text>
        `;
      }).join('');

      // Bars & interactive points
      const barsAndPoints = points.map(p => {
        const barW = 28;
        const barH = (height - padY) - p.y;
        const formattedVal = 'Rp ' + p.val.toLocaleString('id-ID');
        return `
          <g class="chart-col-group" cursor="pointer">
            <rect 
              x="${(p.x - barW / 2).toFixed(1)}" 
              y="${p.y.toFixed(1)}" 
              width="${barW}" 
              height="${barH.toFixed(1)}" 
              rx="6" 
              fill="url(#barGradient)" 
              opacity="0.85"
            >
              <title>${p.label}: ${formattedVal}</title>
            </rect>
            <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="#0f766e" stroke="#ffffff" stroke-width="2.5">
              <title>${p.label}: ${formattedVal}</title>
            </circle>
            <text x="${p.x.toFixed(1)}" y="${height - 8}" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle" font-family="Inter">${p.label}</text>
          </g>
        `;
      }).join('');

      return `
        <svg viewBox="0 0 ${width} ${height}" class="svg-chart" preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#14b8a6" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="#14b8a6" stop-opacity="0.0"/>
            </linearGradient>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#14b8a6"/>
              <stop offset="100%" stop-color="#0f766e"/>
            </linearGradient>
          </defs>
          ${gridLines}
          <polygon points="${polygonPoints}" fill="url(#areaGradient)" />
          <polyline points="${polylinePoints}" fill="none" stroke="#0f766e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          ${barsAndPoints}
        </svg>
      `;
    };

    // Render Main Container HTML
    container.innerHTML = `
      <div class="fade-in">
        <!-- 1. PROFIL PENGGUNA & HERO BANNER -->
        <div class="hero-banner" style="margin-bottom: 1.5rem; padding: 1.75rem 2rem;">
          <div class="hero-content" style="max-width: 780px;">
            <div class="flex items-center gap-2" style="flex-wrap: wrap;">
              <span class="hero-tag">
                ${isBuyer ? '🛒 Mode Pembeli Pasokan' : '🏪 Mode Penjual Komoditas'}
              </span>
              <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #a7f3d0; border: 1px solid rgba(16, 185, 129, 0.4);">
                ✓ ${user.verificationBadge || (user.verified ? 'Terverifikasi' : 'Akun Aktif')}
              </span>
              <span class="badge" style="background: rgba(255, 255, 255, 0.12); color: #ffffff;">
                🤝 ${user.membership || 'Mitra DesaBiz AI'}
              </span>
            </div>

            <div style="margin-top: 0.5rem;">
              <h1 class="hero-title" style="font-size: 1.75rem; margin-bottom: 0.25rem;">
                Selamat Datang, ${user.ownerName || user.name || 'Pelanggan'}!
              </h1>
              <p style="font-size: 0.95rem; color: #ccfbf1; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span>🏢 <strong>${user.businessName}</strong></span>
                <span>•</span>
                <span>📍 ${user.village || user.district || user.regency || 'Wilayah Anda'}</span>
                <span>•</span>
                <a href="#/auth" style="color: #fbbf24; text-decoration: underline; font-size: 0.85rem; font-weight: 600;">Lihat Profil Lengkap</a>
              </p>
            </div>

            <p class="hero-desc" style="font-size: 0.875rem; margin-top: 0.25rem;">
              ${isBuyer ? 
                'Pantau ketersediaan pasokan dari petani lokal, negosiasikan harga terbaik, dan kelola pemesanan bahan baku usaha Anda secara terpusat.' : 
                'Tawarkan komoditas panen ke jaringan pembeli B2B, pantau pesanan yang masuk, dan amati rekomendasi harga cerdas dari DesaBiz AI.'}
            </p>
          </div>

          <div class="flex gap-2" style="position: relative; z-index: 2; align-self: center;">
            <button id="btn-quick-switch-role" class="btn btn-secondary btn-sm" style="background: rgba(255,255,255,0.15); color: #ffffff; border-color: rgba(255,255,255,0.3); backdrop-filter: blur(8px);">
              🔄 Ganti ke ${isBuyer ? 'Penjual' : 'Pembeli'}
            </button>
          </div>
        </div>

        <!-- 2. TOMBOL AKSES CEPAT (5 PINTASAN UTAMA) -->
        <div class="quick-actions-bar">
          <a href="#/produk" class="quick-action-btn">
            <div class="qa-icon" style="background: var(--color-primary-soft); color: var(--color-primary);">
              ${Icons.plus}
            </div>
            <span>Tambah Produk</span>
          </a>

          <a href="#/supplier" class="quick-action-btn">
            <div class="qa-icon" style="background: var(--color-secondary-soft); color: var(--color-secondary);">
              ${Icons.supplier}
            </div>
            <span>Cari Supplier</span>
          </a>

          <a href="#/pesanan" class="quick-action-btn">
            <div class="qa-icon" style="background: var(--color-success-soft); color: var(--color-success);">
              ${Icons.pesanan}
            </div>
            <span>Lihat Pesanan</span>
          </a>

          <a href="#/stok" class="quick-action-btn">
            <div class="qa-icon" style="background: var(--color-warning-soft); color: var(--color-warning);">
              ${Icons.stok}
            </div>
            <span>Kelola Stok</span>
          </a>

          ${showAi ? `
          <button type="button" class="quick-action-btn ai-btn-qa" id="btn-quick-ai">
            <div class="qa-icon" style="background: linear-gradient(135deg, #10b981, #06b6d4); color: #ffffff;">
              ${Icons.sparkle}
            </div>
            <span style="color: var(--color-primary-dark); font-weight: 700;">AI Assistant</span>
          </button>` : ''}
        </div>

        <!-- 3. LIMA KARTU STATISTIK UTAMA (PRD REQUIREMENT) -->
        <div class="stats-grid-5">
          <!-- 1. Total Produk -->
          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-title">Total Produk</span>
              <div class="metric-icon green">${Icons.produk}</div>
            </div>
            <div class="metric-value">${stats.totalProduk}</div>
            <div class="metric-footer">
              <span class="trend-badge positive">${Icons.trendingUp} Aktif</span>
              <span>katalog komoditas</span>
            </div>
          </div>

          <!-- 2. Pesanan Masuk -->
          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-title">Pesanan Masuk</span>
              <div class="metric-icon blue">${Icons.pesanan}</div>
            </div>
            <div class="metric-value">${stats.pesananMasuk}</div>
            <div class="metric-footer">
              <span class="trend-badge positive">3 Perlu respon</span>
              <span>dari pembeli B2B</span>
            </div>
          </div>

          <!-- 3. Pesanan Keluar -->
          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-title">Pesanan Keluar</span>
              <div class="metric-icon amber">${Icons.supplier}</div>
            </div>
            <div class="metric-value">${stats.pesananKeluar}</div>
            <div class="metric-footer">
              <span class="trend-badge neutral">Pasokan dibeli</span>
              <span>dalam pengiriman</span>
            </div>
          </div>

          <!-- 4. Total Transaksi -->
          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-title">Total Transaksi</span>
              <div class="metric-icon teal">${Icons.transaksi}</div>
            </div>
            <div class="metric-value" style="font-size: 1.45rem;">${stats.totalTransaksi}</div>
            <div class="metric-footer">
              <span class="trend-badge positive">${Icons.trendingUp} +18.4%</span>
              <a href="#/transaksi" style="margin-left: auto; text-decoration: underline; font-weight: 600; color: var(--color-primary-dark);">Lihat Faktur</a>
            </div>
          </div>

          <!-- 5. Stok Menipis -->
          <div class="metric-card highlight-danger">
            <div class="metric-top">
              <span class="metric-title" style="color: var(--color-danger); font-weight: 700;">Stok Menipis</span>
              <div class="metric-icon" style="background: linear-gradient(135deg, #ef4444, #b91c1c); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);">
                ${Icons.stok}
              </div>
            </div>
            <div class="metric-value" style="color: var(--color-danger);">${stats.stokMenipis} Item</div>
            <div class="metric-footer">
              <span class="trend-badge" style="color: var(--color-danger); font-weight: 700;">⚠️ Perlu Restock</span>
              <a href="#/stok" style="margin-left: auto; text-decoration: underline; font-weight: 600; color: var(--color-danger);">Cek</a>
            </div>
          </div>
        </div>

        <!-- 4. GRAFIK PENJUALAN SEDERHANA -->
        <div class="sales-chart-card">
          <div class="chart-header">
            <div class="chart-title-area">
              <div class="chart-title">
                <span>📈 Grafik Penjualan & Perputaran Usaha</span>
                <span class="badge badge-success">${chartData.growth} Pertumbuhan</span>
              </div>
              <p style="font-size: 0.8rem; color: var(--text-muted);">
                Tren transaksi grosir UMKM desa terupdate harian
              </p>
            </div>

            <!-- Filter Period Switcher -->
            <div class="chart-period-tabs">
              <button class="period-tab-btn ${state.salesChart.activePeriod === '7d' ? 'active' : ''}" data-period="7d">
                7 Hari Terakhir
              </button>
              <button class="period-tab-btn ${state.salesChart.activePeriod === '30d' ? 'active' : ''}" data-period="30d">
                30 Hari (Bulan Ini)
              </button>
            </div>
          </div>

          <div class="chart-metrics-strip">
            <div class="chart-stat-item">
              <span class="chart-stat-label">Total Omset Terpilih</span>
              <span class="chart-stat-val">${chartData.total}</span>
            </div>
            <div style="width: 1px; height: 32px; background: var(--border-light);"></div>
            <div class="chart-stat-item">
              <span class="chart-stat-label">Rata-Rata Harian</span>
              <span class="chart-stat-val">${chartData.avgDaily}</span>
            </div>
            <div style="width: 1px; height: 32px; background: var(--border-light);"></div>
            <div class="chart-stat-item">
              <span class="chart-stat-label">Status Pembayaran</span>
              <span class="chart-stat-val" style="color: var(--color-success); font-size: 0.95rem;">✓ 100% Terverifikasi</span>
            </div>
          </div>

          <!-- Responsive SVG Chart -->
          <div class="svg-chart-container">
            ${generateSvgChart(chartData)}
          </div>
        </div>

        <!-- 5. DAFTAR PESANAN TERBARU & AI INSIGHT -->
        <div class="dashboard-main-grid">
          <!-- Recent Orders Section -->
          <div class="orders-card">
            <div class="orders-header">
              <div>
                <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 0.5rem;">
                  ${Icons.pesanan} Daftar Pesanan Terbaru
                </h3>
                <p style="font-size: 0.8rem; color: var(--text-muted);">
                  Aktivitas transaksi jual-beli pasokan terkini
                </p>
              </div>

              <!-- Filter Tabs -->
              <div class="orders-filter-tabs">
                <button class="order-tab active" data-filter="all">Semua</button>
                <button class="order-tab" data-filter="Masuk">Pesanan Masuk</button>
                <button class="order-tab" data-filter="Keluar">Pesanan Keluar</button>
              </div>
            </div>

            <!-- Table Wrapper -->
            <div class="orders-table-wrapper">
              <table class="orders-table" id="dashboard-orders-table">
                <thead>
                  <tr>
                    <th>ID & Waktu</th>
                    <th>Mitra B2B</th>
                    <th>Komoditas & Volume</th>
                    <th>Total Nilai</th>
                    <th>Status</th>
                    <th style="text-align: right;">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentOrders.map(order => `
                    <tr class="order-row" data-type="${order.type}">
                      <td>
                        <div style="font-weight: 700; color: var(--text-main);">${order.id}</div>
                        <div style="font-size: 0.725rem; color: var(--text-subtle);">${order.date}</div>
                      </td>
                      <td>
                        <div class="order-partner-box">
                          <span class="order-partner-name">${order.partnerName}</span>
                          <span class="order-partner-meta">
                            <span class="badge ${order.type === 'Masuk' ? 'badge-primary' : 'badge-accent'}" style="font-size: 0.65rem; padding: 1px 5px;">
                              ${order.type === 'Masuk' ? 'Pembeli' : 'Supplier'}
                            </span>
                            • ${order.partnerLocation}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div class="order-commodity-box">
                          <span class="order-commodity-name">${order.commodity}</span>
                          <span class="order-volume">Kuantitas: ${order.volume}</span>
                        </div>
                      </td>
                      <td>
                        <div style="font-weight: 700; color: var(--color-primary-dark);">${order.amount}</div>
                      </td>
                      <td>
                        <span class="badge ${order.statusBadge}">${order.status}</span>
                      </td>
                      <td style="text-align: right;">
                        <a href="#/pesanan-detail?id=${order.id}" class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.65rem; font-size: 0.75rem;">
                          Detail PO
                        </a>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-light);">
              <span style="font-size: 0.8rem; color: var(--text-muted);">Menampilkan 5 transaksi terbaru</span>
              <a href="#/pesanan" class="text-sm font-bold" style="color: var(--color-primary); display: flex; align-items: center; gap: 0.25rem;">
                Buka Semua Pesanan ${Icons.arrowRight}
              </a>
            </div>
          </div>

        </div>

        <!-- 6. AI ASSISTAN (khusus Pembeli) & PERINGATAN GUDANG -->
        <div class="dashboard-ai-row">
          ${showAi ? DashboardModule.renderAiSection() : ''}

          <!-- Peringatan Cepat Stok & Pasokan -->
          <div class="card warning-card" style="border-left: 4px solid var(--color-danger);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem;">
                  <span style="color: var(--color-danger);">${Icons.stok}</span> Peringatan Gudang
                </h4>
                <span class="badge badge-accent" style="font-size: 0.65rem;">${lowStockCount} Menipis</span>
              </div>

              <div style="display: flex; flex-direction: column; gap: 0.65rem; font-size: 0.8rem;">
                ${stockItems.length
                  ? stockItems.slice(0, 3).map(s => {
                      const low = s.statusInfo && ['menipis', 'habis'].includes(String(s.statusInfo.status).toLowerCase());
                      return `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.5rem; border-bottom: 1px dashed var(--border-light);">
                          <span style="font-weight: 600;">${s.name}</span>
                          <span style="color: ${low ? 'var(--color-danger)' : 'var(--color-warning)'}; font-weight: 700;">${s.stock} ${s.unit} (Sisa)</span>
                        </div>`;
                    }).join('')
                  : '<span style="color: var(--text-muted); font-size: 0.75rem;">Stok aman — tidak ada yang menipis.</span>'}
              </div>

              <a href="#/stok" class="btn btn-secondary btn-sm w-full" style="margin-top: 1rem;">
                Restock Komoditas
              </a>
            </div>
          </div>
        </div>
    `;

    // Attach Event Handlers
    DashboardModule.attachEvents(container);
  },

  attachEvents: (container) => {
    // Quick Switch Role Button in Hero
    const switchRoleBtn = container.querySelector('#btn-quick-switch-role');
    if (switchRoleBtn) {
      switchRoleBtn.onclick = () => {
        appState.toggleRole();
      };
    }

    // Sales Chart Period Switcher Tabs (7 Hari vs 30 Hari)
    const periodTabs = container.querySelectorAll('.period-tab-btn');
    periodTabs.forEach(tab => {
      tab.onclick = () => {
        const period = tab.getAttribute('data-period');
        if (period) {
          appState.setSalesChartPeriod(period);
        }
      };
    });

    // Orders Filter Tabs (Semua, Masuk, Keluar)
    const orderTabs = container.querySelectorAll('.order-tab');
    const orderRows = container.querySelectorAll('.order-row');

    orderTabs.forEach(tab => {
      tab.onclick = () => {
        orderTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const filter = tab.getAttribute('data-filter');
        orderRows.forEach(row => {
          const type = row.getAttribute('data-type');
          if (filter === 'all' || type === filter) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      };
    });

    // Tombol quick AI Assistant (khusus Pembeli) — gulir ke bagian chat
    const quickAi = container.querySelector('#btn-quick-ai');
    if (quickAi) {
      quickAi.onclick = () => {
        const section = container.querySelector('#dash-ai-section');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const input = section.querySelector('#dash-ai-input');
          if (input) setTimeout(() => input.focus(), 400);
        }
      };
    }

    // Chatbot mengambang di halaman Beranda
    DashboardModule.attachAiChatEvents(container);
  },

  // ==========================================
  // AI ASSISTANT (terintegrasi di dashboard)
  // ==========================================
  loadAiChat(user) {
    const chat = this.aiChat;
    if (!user) return;
    
    // Bersihkan history jika user atau role berubah (privacy protection)
    const currentOwnerKey = `${user.id}_${user.accountRole || 'UMKM'}_${user.role || 'buyer'}`;
    if (chat.ownerKey && chat.ownerKey !== currentOwnerKey) {
      chat.messages = [];
      chat.ownerKey = currentOwnerKey;
    }
    
    if (chat.ownerId === user.id && chat.ownerKey === currentOwnerKey) return;
    
    try {
      const raw = localStorage.getItem(DASH_AI_KEY + user.id);
      const parsed = raw ? JSON.parse(raw) : [];
      chat.messages = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      chat.messages = [];
    }
    chat.ownerId = user.id;
    chat.ownerKey = currentOwnerKey;
  },

  saveAiChat() {
    const chat = this.aiChat;
    if (!chat.ownerId) return;
    try {
      localStorage.setItem(
        DASH_AI_KEY + chat.ownerId,
        JSON.stringify(chat.messages.slice(-DASH_AI_MAX))
      );
    } catch (e) {
      /* localStorage penuh/nonaktif: percakapan tetap hidup di memori */
    }
  },

  dashAiFirstName() {
    const user = appState.getState().user;
    return ((user && (user.ownerName || user.name)) || 'Pelanggan').split(' ')[0];
  },

  dashAiInitial() {
    const user = appState.getState().user;
    if (!user) return 'UM';
    return user.avatarInitial ||
      (user.ownerName || 'UM').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  },

  dashAiPrompts() {
    return aiAssistantService.getQuickSuggestions().slice(0, 3);
  },

  dashAiNow() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  },

  /** Nama asisten berdasarkan role aktif. */
  dashAiName() {
    const user = appState.getState().user;
    return user?.accountRole === 'ADMIN' ? 'Admin Assistant' : 'UMKM Assistant';
  },

  /** Markup bagian AI Assistant yang terintegrasi di dashboard. */
  renderAiSection() {
    const chat = this.aiChat;
    const engine = aiAssistantService.getEngineInfo();
    const prompts = this.dashAiPrompts();
    const aiName = this.dashAiName();

    const chips = prompts.map(s => `
      <button type="button" class="ai-chip" data-prompt="${AIAssistantModule.escapeAttr(s.prompt)}">
        ${s.icon} ${AIAssistantModule.escapeHtml(s.label)}
      </button>
    `).join('');

    return `
      <div class="card dash-ai-section" id="dash-ai-section">
        <div class="dash-ai-section-head">
          <div class="dash-ai-avatar">${Icons.sparkle}</div>
          <div class="dash-ai-head-text">
            <strong>${aiName}</strong>
            <span class="dash-ai-sub">
              <span class="dash-ai-dot"></span> Online •
              <span class="ai-engine-badge ${engine.mode}" id="dash-ai-engine" title="${AIAssistantModule.escapeAttr(engine.hint)}">⚡ ${AIAssistantModule.escapeHtml(engine.label)}</span>
            </span>
          </div>
        </div>

        <div class="ai-chat-scroll dash-ai-body" id="dash-ai-body">
          ${this.renderAiChatBody()}
        </div>

        <div class="dash-ai-chips" id="dash-ai-chips" ${chat.isBusy ? 'style="display:none"' : ''}>
          ${chips}
        </div>

        <form class="ai-composer dash-ai-composer" id="dash-ai-composer" autocomplete="off">
          <div class="ai-composer-box">
            <textarea id="dash-ai-input" class="ai-input" rows="1" placeholder='Tulis pertanyaan... mis. "Stok saya hampir habis"'>${AIAssistantModule.escapeHtml(chat.draft)}</textarea>
          </div>
          <button type="submit" class="btn-ai-send ${chat.isBusy ? 'is-loading' : ''}" id="dash-ai-send" title="Kirim pertanyaan" ${chat.isBusy ? 'disabled' : ''}>
            ${Icons.send}
          </button>
        </form>

        <p class="dash-ai-foot">
          Jawaban diproses model AI lewat server DesaBiz — API key tidak pernah berada di browser.
        </p>
      </div>
    `;
  },

  /** Isi area percakapan: layar sambutan bila kosong, bubble + indikator ketik selanjutnya. */
  renderAiChatBody() {
    const chat = this.aiChat;
    const prompts = this.dashAiPrompts();

    if (!chat.messages.length && !chat.isBusy) {
      return `
        <div class="dash-ai-hello">
          <div class="dash-ai-hello-icon">${Icons.sparkle}</div>
          <h4>Halo, ${AIAssistantModule.escapeHtml(this.dashAiFirstName())} 👋</h4>
          <p>Saya asisten AI yang terhubung langsung dengan data usaha Anda. Mau dibantu apa hari ini?</p>
          <div class="dash-ai-hello-list">
            ${prompts.map(s => `
              <button type="button" class="dash-ai-hello-btn" data-prompt="${AIAssistantModule.escapeAttr(s.prompt)}">
                <span class="dash-ai-hello-ico">${s.icon}</span>
                <span>${AIAssistantModule.escapeHtml(s.title)}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    const list = chat.messages.map(m => AIAssistantModule.renderMessage(m, this.dashAiInitial())).join('');
    return list + (chat.isBusy ? AIAssistantModule.renderTyping() : '');
  },

  /** Perbarui bagian chat tanpa render ulang seluruh halaman Beranda. */
  refreshAiChat() {
    const section = document.getElementById('dash-ai-section');
    if (!section) return;
    const chat = this.aiChat;

    const body = section.querySelector('#dash-ai-body');
    if (body) {
      body.innerHTML = this.renderAiChatBody();
      this.scrollDashAi();
    }

    const sendBtn = section.querySelector('#dash-ai-send');
    if (sendBtn) {
      sendBtn.disabled = chat.isBusy;
      sendBtn.classList.toggle('is-loading', chat.isBusy);
    }

    const chips = section.querySelector('#dash-ai-chips');
    if (chips) chips.style.display = chat.isBusy ? 'none' : '';

    // Badge engine: "AI API Aktif" (model NVIDIA lewat server) vs Local Engine
    const engine = aiAssistantService.getEngineInfo();
    const engineEl = section.querySelector('#dash-ai-engine');
    if (engineEl) {
      engineEl.className = `ai-engine-badge ${engine.mode}`;
      engineEl.title = engine.hint;
      engineEl.textContent = `⚡ ${engine.label}`;
    }

    const input = section.querySelector('#dash-ai-input');
    if (input && document.activeElement !== input) input.value = chat.draft;

    this.bindDashAiPrompts(section);
  },

  scrollDashAi(smooth = true) {
    requestAnimationFrame(() => {
      const body = document.getElementById('dash-ai-body');
      if (body) body.scrollTo({ top: body.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    });
  },

  /** Kirim pertanyaan ke AI Assistant Service (proksi api/ai.php -> provider AI). */
  async sendAiChat(text) {
    const chat = this.aiChat;
    const value = (text || '').trim();
    if (!value || chat.isBusy) return;

    chat.draft = '';
    chat.messages.push({
      id: `dai_${Date.now()}_u`,
      role: 'user',
      text: value,
      time: this.dashAiNow()
    });
    this.saveAiChat();

    chat.isBusy = true;
    this.refreshAiChat();

    const history = chat.messages.slice(-6).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text
    }));

    try {
      const reply = await aiAssistantService.sendMessage(value, history);
      chat.messages.push({
        id: `dai_${Date.now()}_a`,
        role: 'assistant',
        text: reply.text,
        category: reply.category,
        cards: reply.cards || [],
        actionPills: reply.actionPills || [],
        engine: reply.engine,
        time: this.dashAiNow()
      });
    } catch (e) {
      chat.messages.push({
        id: `dai_${Date.now()}_e`,
        role: 'assistant',
        text: 'Mohon maaf, terjadi gangguan saat menghubungi mesin AI DesaBiz. Silakan coba kembali beberapa saat lagi.',
        category: 'error',
        cards: [],
        actionPills: [],
        engine: 'mock',
        time: this.dashAiNow()
      });
    } finally {
      chat.isBusy = false;
      this.saveAiChat();
      this.refreshAiChat();
    }
  },

  bindDashAiPrompts(root) {
    if (!root) return;
    root.querySelectorAll('[data-prompt]').forEach(el => {
      if (el._dashPromptBound) return; // cegah binding ganda
      el._dashPromptBound = true;
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const prompt = el.dataset.prompt;
        if (!prompt) return;
        const input = document.getElementById('dash-ai-input');
        if (input) input.value = '';
        this.aiChat.draft = '';
        this.sendAiChat(prompt);
      });
    });
  },

  attachAiChatEvents(container) {
    const section = container.querySelector('#dash-ai-section');
    if (!section) return;
    const chat = this.aiChat;

    const form = section.querySelector('#dash-ai-composer');
    const input = section.querySelector('#dash-ai-input');
    const autoGrow = () => {
      if (!input) return;
      input.style.height = 'auto';
      input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    };

    if (input) {
      autoGrow();
      input.oninput = () => {
        chat.draft = input.value;
        autoGrow();
      };
      input.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (form) form.requestSubmit();
        }
      };
    }

    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const value = input ? input.value : '';
        if (input) {
          input.value = '';
          input.style.height = 'auto';
        }
        chat.draft = '';
        this.sendAiChat(value);
      };
    }

    this.bindDashAiPrompts(section);
  }
};
