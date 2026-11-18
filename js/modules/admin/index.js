// DesaBiz AI - Modul Admin Platform (Admin Dashboard)
// KPI ekosistem, monitoring aktivitas/produk/transaksi, manajemen pengguna & kategori.
// Akses dibatasi oleh router guard (role ADMIN) + pengecekan ganda di render().
import { Icons } from '../../icons.js';
import { appState } from '../../state.js';

// Escape data pengguna sebelum dirender ke HTML (keamanan dasar XSS)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const rupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

const TABS = [
  { id: 'ringkasan', label: 'Ringkasan', icon: Icons.dashboard },
  { id: 'pengguna', label: 'Manajemen Pengguna', icon: Icons.auth },
  { id: 'kategori', label: 'Kategori Produk', icon: Icons.tag },
  { id: 'produk', label: 'Monitoring Produk', icon: Icons.produk },
  { id: 'transaksi', label: 'Monitoring Transaksi', icon: Icons.transaksi }
];

const ACTIVITY_ICON = {
  auth: Icons.auth,
  user: Icons.shieldCheck,
  category: Icons.tag,
  order: Icons.pesanan,
  transaction: Icons.transaksi,
  stock: Icons.stok,
  negotiation: Icons.negosiasi,
  system: Icons.sparkle
};

const trxBadge = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('selesai') || s.includes('lunas') || s.includes('dibayar')) return 'badge-success';
  if (s.includes('menunggu')) return 'badge-menunggu';
  if (s.includes('batal')) return 'badge-dibatalkan';
  if (s.includes('proses')) return 'badge-diproses';
  return 'badge-info';
};

const orderBadge = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('selesai')) return 'badge-selesai';
  if (s.includes('menunggu')) return 'badge-menunggu';
  if (s.includes('batal')) return 'badge-dibatalkan';
  if (s.includes('proses')) return 'badge-diproses';
  if (s.includes('negosiasi')) return 'badge-dinegosiasi';
  return 'badge-info';
};

export const AdminModule = {
  id: 'admin',
  title: 'Panel Administrasi DesaBiz',
  subtitle: 'Monitoring ekosistem B2B: pengguna, kategori, produk, transaksi, dan aktivitas platform',

  // State tampilan tab (dipertahankan saat halaman di-render ulang oleh notify())
  activeTab: 'ringkasan',
  userQuery: '',
  userRoleFilter: 'all',
  userStatusFilter: 'all',
  prodQuery: '',
  prodCategoryFilter: 'all',
  trxStatusFilter: 'all',

  render: (container) => {
    // Pengecekan ganda (defense in depth) — router sudah melakukan guard.
    if (!appState.isAdmin()) {
      container.innerHTML = `
        <div class="fade-in">
          <div class="card" style="max-width: 560px; margin: 4rem auto; text-align: center; border-left: 4px solid var(--color-danger);">
            <div class="module-icon-large" style="color: var(--color-danger); background: var(--color-danger-soft, #fef2f2); border-color: #fecaca; margin-bottom: 1rem;">${Icons.admin}</div>
            <h2 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 0.5rem;">Akses Ditolak</h2>
            <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1.25rem;">
              Halaman ini hanya tersedia untuk akun dengan role <strong>ADMIN</strong>. Anda masuk sebagai akun <strong>UMKM</strong>.
            </p>
            <a href="#/dashboard" class="btn btn-primary">${Icons.arrowLeft} Kembali ke Dashboard</a>
          </div>
        </div>`;
      return;
    }

    const stats = appState.getAdminStats();
    const user = appState.getState().user;

    container.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <div class="page-header-info">
            <div class="breadcrumbs">
              <a href="#/dashboard">Beranda</a>
              <span class="breadcrumb-separator">/</span>
              <span class="breadcrumb-item active">Panel Admin</span>
            </div>
            <h1 class="page-title">${AdminModule.title}</h1>
            <p class="page-subtitle">${AdminModule.subtitle}</p>
          </div>
          <span class="badge" style="background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe;">
            ${Icons.shieldCheck} Role: ADMIN • ${esc(user.ownerName)}
          </span>
        </div>

        <!-- KPI UTAMA EKOSISTEM -->
        <div class="stats-grid-5" style="margin-bottom: 1.5rem;">
          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-title">Total Pengguna</span>
              <div class="metric-icon teal">${Icons.auth}</div>
            </div>
            <div class="metric-value">${stats.totalPengguna}</div>
            <div class="metric-footer"><span>${stats.totalAdmin} Admin • ${stats.penggunaNonAktif} nonaktif</span></div>
          </div>
          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-title">Total UMKM</span>
              <div class="metric-icon green">${Icons.store}</div>
            </div>
            <div class="metric-value">${stats.totalUmkM}</div>
            <div class="metric-footer"><span>Akun UMKM terdaftar di platform</span></div>
          </div>
          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-title">Total Produk</span>
              <div class="metric-icon blue">${Icons.produk}</div>
            </div>
            <div class="metric-value">${stats.totalProduk}</div>
            <div class="metric-footer"><span>${stats.totalKategori} kategori komoditas</span></div>
          </div>
          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-title">Total Transaksi</span>
              <div class="metric-icon amber">${Icons.transaksi}</div>
            </div>
            <div class="metric-value" style="font-size: 1.45rem;">${stats.totalTransaksi}</div>
            <div class="metric-footer"><span>${rupiah(stats.totalTransaksiNominal)} nilai akumulasi</span></div>
          </div>
          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-title">Total Pesanan</span>
              <div class="metric-icon green">${Icons.pesanan}</div>
            </div>
            <div class="metric-value" style="font-size: 1.45rem;">${stats.totalPesanan}</div>
            <div class="metric-footer"><span>${stats.transaksiTertunda} transaksi menunggu bayar</span></div>
          </div>
        </div>

        <!-- TAB NAVIGASI PANEL ADMIN -->
        <div class="marketplace-tabs" style="margin-bottom: 1.25rem;">
          ${TABS.map(t => `
            <button type="button" class="marketplace-tab-btn ${AdminModule.activeTab === t.id ? 'active' : ''}" data-admin-tab="${t.id}">
              ${t.icon} ${t.label}
            </button>
          `).join('')}
        </div>

        <div id="admin-panel">
          ${AdminModule.renderPanel()}
        </div>
      </div>
    `;

    AdminModule.attachEvents(container);
  },

  renderPanel() {
    switch (AdminModule.activeTab) {
      case 'pengguna': return AdminModule.renderUsers();
      case 'kategori': return AdminModule.renderCategories();
      case 'produk': return AdminModule.renderProducts();
      case 'transaksi': return AdminModule.renderTransactions();
      default: return AdminModule.renderOverview();
    }
  },

  // ==========================================
  // TAB 1: RINGKASAN + MONITORING AKTIVITAS
  // ==========================================
  renderOverview() {
    const stats = appState.getAdminStats();
    const feed = appState.getActivityFeed(12);

    const stripItem = (label, value, color) => `
      <div class="chart-stat-item">
        <span class="chart-stat-label">${label}</span>
        <span class="chart-stat-val" ${color ? `style="color: ${color};"` : ''}>${value}</span>
      </div>`;

    return `
      <div style="display: grid; gap: 1.25rem;">
        <div class="card">
          <div class="chart-header" style="margin-bottom: 0.75rem;">
            <h4 class="chart-title">Statistik Ekosistem Platform</h4>
            <span class="badge badge-primary">${stats.totalPengguna} Akun • ${stats.totalProduk} Produk</span>
          </div>
          <div class="chart-metrics-strip">
            ${stripItem('Nilai Transaksi Akumulasi', rupiah(stats.totalTransaksiNominal))}
            ${stripItem('Kategori Komoditas', `${stats.totalKategori} Kategori`)}
            ${stripItem('Akun Nonaktif', `${stats.penggunaNonAktif} Akun`, stats.penggunaNonAktif > 0 ? 'var(--color-danger)' : 'var(--color-success)')}
            ${stripItem('Transaksi Tertunda', `${stats.transaksiTertunda} Transaksi`, stats.transaksiTertunda > 0 ? '#b45309' : 'var(--color-success)')}
            ${stripItem('Stok Menipis (Akun Demo)', `${stats.stokMenipis} Item`, stats.stokMenipis > 0 ? 'var(--color-danger)' : 'var(--color-success)')}
          </div>
        </div>

        <div class="card">
          <div class="chart-header" style="margin-bottom: 1rem;">
            <h4 class="chart-title">${Icons.bell} Monitoring Aktivitas Platform</h4>
            <span class="badge badge-accent">Realtime (Log Sistem)</span>
          </div>

          ${feed.length === 0 ? `
            <div style="padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
              Belum ada aktivitas tercatat.
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 0.65rem;">
              ${feed.map(a => `
                <div style="display: flex; gap: 0.85rem; align-items: flex-start; padding: 0.7rem 0.85rem; border: 1px solid var(--border-light); border-radius: var(--radius-md); background: #fcfdfe;">
                  <div style="width: 34px; height: 34px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 10px; background: var(--color-primary-soft, #ecfdf5); color: var(--color-primary-dark, #0f766e);">
                    ${ACTIVITY_ICON[a.type] || Icons.sparkle}
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">${esc(a.title)}</div>
                    <div style="font-size: 0.775rem; color: var(--text-muted); line-height: 1.45;">${esc(a.desc)}</div>
                  </div>
                  <span style="font-size: 0.7rem; color: var(--text-subtle); white-space: nowrap;">${esc(a.time)}</span>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  },

  // ==========================================
  // TAB 2: MANAJEMEN PENGGUNA (AKTIF/NONAKTIF)
  // ==========================================
  renderUsers() {
    const users = appState.getUsers();
    const roleOptions = [
      { v: 'all', l: 'Semua Role' },
      { v: 'UMKM', l: 'Role UMKM' },
      { v: 'ADMIN', l: 'Role ADMIN' }
    ];
    const statusOptions = [
      { v: 'all', l: 'Semua Status' },
      { v: 'active', l: 'Aktif' },
      { v: 'inactive', l: 'Nonaktif' }
    ];

    const rows = users.map(u => {
      const isAdminRole = u.accountRole === 'ADMIN';
      const active = u.isActive !== false;
      const search = `${u.ownerName} ${u.businessName} ${u.email}`.toLowerCase();

      return `
        <tr class="admin-user-row"
            data-search="${esc(search)}"
            data-role="${isAdminRole ? 'ADMIN' : 'UMKM'}"
            data-status="${active ? 'active' : 'inactive'}">
          <td>
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <div class="user-avatar" style="width: 34px; height: 34px; font-size: 0.72rem; ${isAdminRole ? 'background: linear-gradient(135deg, #6366f1, #4338ca);' : ''}">${esc(u.avatarInitial || 'UM')}</div>
              <div style="min-width: 0;">
                <div style="font-weight: 700; color: var(--text-main); font-size: 0.85rem;">${esc(u.ownerName)}</div>
                <div style="font-size: 0.725rem; color: var(--text-subtle);">${esc(u.email)}</div>
              </div>
            </div>
          </td>
          <td>
            <div style="font-weight: 600; font-size: 0.825rem;">${esc(u.businessName)}</div>
            <div style="font-size: 0.725rem; color: var(--text-subtle);">${esc(u.businessType || '-')}</div>
          </td>
          <td>
            <span class="badge ${isAdminRole ? 'badge-primary' : 'badge-info'}" style="font-size: 0.675rem;">
              ${isAdminRole ? 'ADMIN' : 'UMKM'}
            </span>
          </td>
          <td>
            <span class="badge ${active ? 'badge-success' : 'badge-dibatalkan'}" style="font-size: 0.675rem;">
              ${active ? '✓ Aktif' : '✕ Nonaktif'}
            </span>
            <div style="font-size: 0.675rem; color: var(--text-subtle); margin-top: 0.2rem;">
              ${u.isVerified ? 'Terverifikasi' : 'Belum verifikasi'}
            </div>
          </td>
          <td style="font-size: 0.775rem; color: var(--text-muted); white-space: nowrap;">${esc(u.joinedAt || '-')}</td>
          <td style="text-align: right;">
            <button type="button"
                    class="btn ${active ? 'btn-secondary' : 'btn-primary'} btn-sm admin-toggle-user"
                    data-user-id="${esc(u.id)}"
                    data-user-active="${active}"
                    style="padding: 0.3rem 0.7rem; font-size: 0.725rem;">
              ${active ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="card">
        <div class="chart-header" style="margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h4 class="chart-title">${Icons.auth} Manajemen Pengguna</h4>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Lihat pengguna, aktifkan / nonaktifkan akun</span>
          </div>
          <span class="badge badge-primary">${users.length} Akun</span>
        </div>

        <div class="toolbar-search-row" style="margin-bottom: 1rem;">
          <div class="toolbar-search-box" style="flex: 1; min-width: 220px;">
            ${Icons.search}
            <input type="text" class="toolbar-search-input" id="admin-user-search"
                   placeholder="Cari nama, email, atau nama usaha..." value="${esc(AdminModule.userQuery)}" />
          </div>
          <select class="toolbar-select" id="admin-user-role">
            ${roleOptions.map(o => `<option value="${o.v}" ${AdminModule.userRoleFilter === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}
          </select>
          <select class="toolbar-select" id="admin-user-status">
            ${statusOptions.map(o => `<option value="${o.v}" ${AdminModule.userStatusFilter === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}
          </select>
        </div>

        <div class="orders-table-wrapper">
          <table class="orders-table" id="admin-user-table">
            <thead>
              <tr>
                <th>Pengguna</th>
                <th>Usaha</th>
                <th>Role</th>
                <th>Status Akun</th>
                <th>Bergabung</th>
                <th style="text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">Belum ada pengguna terdaftar.</td></tr>`}
            </tbody>
          </table>
        </div>

        <div id="admin-user-empty" style="display: none; padding: 1.75rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          Tidak ada pengguna yang cocok dengan filter.
        </div>

        <div style="margin-top: 0.85rem; font-size: 0.775rem; color: var(--text-muted);">
          Menampilkan <strong id="admin-user-count">${users.length}</strong> dari ${users.length} pengguna.
        </div>
      </div>
    `;
  },

  // ==========================================
  // TAB 3: MANAJEMEN KATEGORI PRODUK
  // ==========================================
  renderCategories() {
    const categories = appState.getCategories();

    return `
      <div style="display: grid; gap: 1.25rem;">
        <div class="card">
          <div class="chart-header" style="margin-bottom: 1rem;">
            <h4 class="chart-title">${Icons.plus} Tambah Kategori Produk</h4>
          </div>
          <form id="admin-cat-form" style="display: flex; gap: 0.65rem; flex-wrap: wrap; align-items: flex-start;">
            <div style="flex: 1; min-width: 240px;">
              <input type="text" id="admin-cat-input" class="form-input"
                     placeholder="Contoh: Perikanan & Kelautan" maxlength="40" />
              <div class="form-error" id="admin-cat-error" style="display: none;"></div>
            </div>
            <button type="submit" class="btn btn-primary" style="white-space: nowrap;">${Icons.plus} Tambah Kategori</button>
          </form>
          <p class="form-hint" style="margin-top: 0.6rem;">
            Kategori hasil pengelolaan Administrator langsung dipakai pada form produk & filter katalog UMKM.
          </p>
        </div>

        <div class="card">
          <div class="chart-header" style="margin-bottom: 1rem;">
            <h4 class="chart-title">${Icons.tag} Daftar Kategori Produk</h4>
            <span class="badge badge-accent">${categories.length} Kategori</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 0.85rem;">
            ${categories.map(c => {
              const used = appState.countProductsInCategory(c);
              return `
                <div class="admin-cat-card" data-cat="${esc(c)}" style="border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 0.9rem; background: #fcfdfe;">
                  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <span style="color: var(--color-primary);">${Icons.layers}</span>
                    <strong style="font-size: 0.875rem; flex: 1; min-width: 0; word-break: break-word;">${esc(c)}</strong>
                  </div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.7rem;">
                    Dipakai oleh <strong style="color: ${used ? 'var(--color-primary-dark)' : 'var(--text-subtle)'};">${used}</strong> produk
                  </div>
                  <div style="display: flex; gap: 0.4rem;">
                    <button type="button" class="btn btn-secondary btn-sm admin-cat-rename" data-cat="${esc(c)}" style="flex: 1; font-size: 0.725rem; padding: 0.3rem 0.5rem;">${Icons.edit} Ubah</button>
                    <button type="button" class="btn btn-secondary btn-sm admin-cat-delete" data-cat="${esc(c)}" style="font-size: 0.725rem; padding: 0.3rem 0.5rem; color: var(--color-danger); border-color: #fecaca;">${Icons.trash}</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  },

  // ==========================================
  // TAB 4: MONITORING PRODUK
  // ==========================================
  renderProducts() {
    const products = appState.getState().products || [];
    const users = appState.getUsers();
    const categories = appState.getCategories();
    const sellerName = (p) => {
      if (p.sellerName) return p.sellerName;
      const u = users.find(x => x.id === p.sellerId);
      return u ? u.businessName : (p.sellerId || '-');
    };

    const rows = products.map(p => {
      const low = p.stock <= (p.minOrder * 2 > 1000 ? p.minOrder * 2 : 1000);
      const stockBadge = p.stock <= 0
        ? '<span class="stock-badge-habis">Habis</span>'
        : (low ? '<span class="stock-badge-menipis">Menipis</span>' : '<span class="stock-badge-tersedia">Tersedia</span>');
      const search = `${p.name} ${p.category} ${sellerName(p)}`.toLowerCase();

      return `
        <tr class="admin-prod-row" data-search="${esc(search)}" data-category="${esc(p.category || '')}">
          <td>
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <img src="${esc(p.imageUrl || '')}" alt="" style="width: 38px; height: 38px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-light);" onerror="this.style.visibility='hidden'" />
              <div>
                <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-main);">${esc(p.name)}</div>
                <div style="font-size: 0.725rem; color: var(--text-subtle);">${esc(p.harvestGrade || 'Standar Desa')}</div>
              </div>
            </div>
          </td>
          <td><span class="badge badge-info" style="font-size: 0.675rem;">${esc(p.category || '-')}</span></td>
          <td style="font-weight: 700; color: var(--color-primary-dark); white-space: nowrap;">${rupiah(p.price)}<span style="font-weight: 500; color: var(--text-subtle);">/${esc(p.unit || '')}</span></td>
          <td style="white-space: nowrap;">
            <div style="font-weight: 700;">${Number(p.stock || 0).toLocaleString('id-ID')}</div>
            ${stockBadge}
          </td>
          <td style="font-size: 0.8rem;">${esc(sellerName(p))}</td>
          <td style="text-align: right; white-space: nowrap;">
            <span class="badge ${p.isActive === false ? 'badge-dibatalkan' : 'badge-success'}" style="font-size: 0.675rem;">
              ${p.isActive === false ? 'Nonaktif' : 'Dipasarkan'}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="card">
        <div class="chart-header" style="margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h4 class="chart-title">${Icons.produk} Monitoring Produk</h4>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Seluruh komoditas yang dipasarkan oleh UMKM mitra</span>
          </div>
          <span class="badge badge-primary">${products.length} Produk</span>
        </div>

        <div class="toolbar-search-row" style="margin-bottom: 1rem;">
          <div class="toolbar-search-box" style="flex: 1; min-width: 220px;">
            ${Icons.search}
            <input type="text" class="toolbar-search-input" id="admin-prod-search"
                   placeholder="Cari nama produk, kategori, atau penjual..." value="${esc(AdminModule.prodQuery)}" />
          </div>
          <select class="toolbar-select" id="admin-prod-category">
            <option value="all" ${AdminModule.prodCategoryFilter === 'all' ? 'selected' : ''}>Semua Kategori</option>
            ${categories.map(c => `<option value="${esc(c)}" ${AdminModule.prodCategoryFilter === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select>
        </div>

        <div class="orders-table-wrapper">
          <table class="orders-table" id="admin-prod-table">
            <thead>
              <tr>
                <th>Produk</th>
                <th>Kategori</th>
                <th>Harga</th>
                <th>Stok</th>
                <th>Penjual</th>
                <th style="text-align: right;">Status</th>
              </tr>
            </thead>
            <tbody>${rows || `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">Belum ada produk.</td></tr>`}</tbody>
          </table>
        </div>

        <div id="admin-prod-empty" style="display: none; padding: 1.75rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          Tidak ada produk yang cocok dengan filter.
        </div>

        <div style="margin-top: 0.85rem; font-size: 0.775rem; color: var(--text-muted);">
          Menampilkan <strong id="admin-prod-count">${products.length}</strong> dari ${products.length} produk.
        </div>
      </div>
    `;
  },

  // ==========================================
  // TAB 5: MONITORING TRANSAKSI
  // ==========================================
  renderTransactions() {
    const transactions = appState.getState().transactions || [];
    const orders = appState.getState().orders || [];
    const totalValue = transactions.reduce((a, t) => a + (t.totalAmount || 0), 0);
    const paid = transactions.filter(t => /lunas/i.test(t.status || '')).length;
    const pending = transactions.filter(t => /menunggu/i.test(t.status || '')).length;
    const cancelled = transactions.filter(t => /batal/i.test(t.status || '')).length;

    const statusOptions = [
      { v: 'all', l: 'Semua Status' },
      { v: 'lunas', l: 'Lunas' },
      { v: 'menunggu', l: 'Menunggu Pembayaran' },
      { v: 'batal', l: 'Dibatalkan' }
    ];

    const rows = transactions.map(t => {
      const s = String(t.status || '').toLowerCase();
      const key = /batal/.test(s) ? 'batal' : (/menunggu/.test(s) ? 'menunggu' : 'lunas');
      return `
        <tr class="admin-trx-row" data-status="${key}">
          <td>
            <div style="font-weight: 700; color: var(--text-main); font-size: 0.825rem;">${esc(t.id)}</div>
            <div style="font-size: 0.7rem; color: var(--text-subtle);">${esc(t.invoiceNumber || '-')}</div>
          </td>
          <td>
            <div style="font-size: 0.8rem; font-weight: 600;">${esc(t.buyerName)}</div>
            <div style="font-size: 0.725rem; color: var(--text-subtle);">→ ${esc(t.sellerName)}</div>
          </td>
          <td style="font-size: 0.8rem;">${esc(t.productName)}<div style="font-size: 0.7rem; color: var(--text-subtle);">${Number(t.quantity || 0).toLocaleString('id-ID')} ${esc(t.productUnit || '')}</div></td>
          <td style="font-weight: 700; color: var(--color-primary-dark); white-space: nowrap;">${rupiah(t.totalAmount)}</td>
          <td style="font-size: 0.775rem; color: var(--text-muted); white-space: nowrap;">${esc(t.date || '-')}</td>
          <td><span class="badge ${trxBadge(t.status)}" style="font-size: 0.675rem;">${esc(t.status)}</span></td>
        </tr>
      `;
    }).join('');

    const orderRows = orders.map(o => `
      <tr class="admin-order-row">
        <td>
          <div style="font-weight: 700; font-size: 0.825rem;">${esc(o.id)}</div>
          <div style="font-size: 0.7rem; color: var(--text-subtle);">${esc(o.createdAt || '-')}</div>
        </td>
        <td style="font-size: 0.8rem;">${esc(o.buyerName)}<div style="font-size: 0.725rem; color: var(--text-subtle);">→ ${esc(o.sellerName)}</div></td>
        <td style="font-size: 0.8rem;">${esc(o.productName)}<div style="font-size: 0.7rem; color: var(--text-subtle);">${Number(o.quantity || 0).toLocaleString('id-ID')} ${esc(o.productUnit || '')}</div></td>
        <td style="font-weight: 700; white-space: nowrap;">${rupiah(o.totalAmount)}</td>
        <td><span class="badge ${orderBadge(o.status)}" style="font-size: 0.675rem;">${esc(o.status)}</span></td>
      </tr>
    `).join('');

    return `
      <div style="display: grid; gap: 1.25rem;">
        <div class="card">
          <div class="chart-header" style="margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <h4 class="chart-title">${Icons.transaksi} Monitoring Transaksi</h4>
              <span style="font-size: 0.75rem; color: var(--text-muted);">Nilai, status pembayaran, dan mitra transaksi B2B</span>
            </div>
            <span class="badge badge-primary">${transactions.length} Transaksi • ${rupiah(totalValue)}</span>
          </div>

          <div class="chart-metrics-strip" style="margin-bottom: 1rem;">
            <div class="chart-stat-item">
              <span class="chart-stat-label">Total Nilai</span>
              <span class="chart-stat-val">${rupiah(totalValue)}</span>
            </div>
            <div class="chart-stat-item">
              <span class="chart-stat-label">Lunas</span>
              <span class="chart-stat-val" style="color: var(--color-success);">${paid} Transaksi</span>
            </div>
            <div class="chart-stat-item">
              <span class="chart-stat-label">Menunggu Pembayaran</span>
              <span class="chart-stat-val" style="color: #b45309;">${pending} Transaksi</span>
            </div>
            <div class="chart-stat-item">
              <span class="chart-stat-label">Dibatalkan</span>
              <span class="chart-stat-val" style="color: var(--color-danger);">${cancelled} Transaksi</span>
            </div>
          </div>

          <div class="toolbar-search-row" style="margin-bottom: 1rem;">
            <select class="toolbar-select" id="admin-trx-status">
              ${statusOptions.map(o => `<option value="${o.v}" ${AdminModule.trxStatusFilter === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}
            </select>
          </div>

          <div class="orders-table-wrapper">
            <table class="orders-table" id="admin-trx-table">
              <thead>
                <tr>
                  <th>ID Transaksi</th>
                  <th>Mitra</th>
                  <th>Produk</th>
                  <th>Nilai</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>${rows || `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">Belum ada transaksi.</td></tr>`}</tbody>
            </table>
          </div>

          <div id="admin-trx-empty" style="display: none; padding: 1.75rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
            Tidak ada transaksi dengan status tersebut.
          </div>
        </div>

        <div class="card">
          <div class="chart-header" style="margin-bottom: 1rem;">
            <h4 class="chart-title">${Icons.pesanan} Monitoring Pesanan (Purchase Order)</h4>
            <span class="badge badge-accent">${orders.length} PO</span>
          </div>
          <div class="orders-table-wrapper">
            <table class="orders-table">
              <thead>
                <tr>
                  <th>ID PO</th>
                  <th>Mitra</th>
                  <th>Produk</th>
                  <th>Nilai</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>${orderRows || `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-muted);">Belum ada pesanan.</td></tr>`}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  // ==========================================
  // EVENT HANDLERS
  // ==========================================
  attachEvents(container) {
    // Ganti tab panel
    container.querySelectorAll('[data-admin-tab]').forEach(btn => {
      btn.onclick = () => {
        AdminModule.activeTab = btn.getAttribute('data-admin-tab');
        appState.setState({}); // trigger re-render ringan
      };
    });

    AdminModule.attachUserEvents(container);
    AdminModule.attachCategoryEvents(container);
    AdminModule.attachProductEvents(container);
    AdminModule.attachTransactionEvents(container);
  },

  attachUserEvents(container) {
    const search = container.querySelector('#admin-user-search');
    const roleSel = container.querySelector('#admin-user-role');
    const statusSel = container.querySelector('#admin-user-status');
    if (!search) return;

    const applyFilter = () => {
      AdminModule.userQuery = search.value;
      AdminModule.userRoleFilter = roleSel.value;
      AdminModule.userStatusFilter = statusSel.value;

      const q = search.value.trim().toLowerCase();
      const role = roleSel.value;
      const status = statusSel.value;
      let visible = 0;
      const total = container.querySelectorAll('.admin-user-row').length;

      container.querySelectorAll('.admin-user-row').forEach(row => {
        const ok = (!q || row.dataset.search.includes(q))
          && (role === 'all' || row.dataset.role === role)
          && (status === 'all' || row.dataset.status === status);
        row.style.display = ok ? '' : 'none';
        if (ok) visible++;
      });

      const countEl = container.querySelector('#admin-user-count');
      if (countEl) countEl.textContent = visible;
      const tableWrap = container.querySelector('#admin-user-table');
      const empty = container.querySelector('#admin-user-empty');
      if (tableWrap) tableWrap.style.display = visible === 0 ? 'none' : '';
      if (empty) empty.style.display = visible === 0 ? 'block' : 'none';
    };

    search.addEventListener('input', applyFilter);
    if (roleSel) roleSel.addEventListener('change', applyFilter);
    if (statusSel) statusSel.addEventListener('change', applyFilter);
    if (AdminModule.userQuery || AdminModule.userRoleFilter !== 'all' || AdminModule.userStatusFilter !== 'all') applyFilter();

    // Aktifkan / nonaktifkan akun
    container.querySelectorAll('.admin-toggle-user').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-user-id');
        const isActive = btn.getAttribute('data-user-active') === 'true';
        const target = appState.getUsers().find(u => u.id === id);
        if (!target) return;

        const message = isActive
          ? `Nonaktifkan akun "${target.ownerName}" (${target.email})? Akun ini tidak akan bisa login sampai diaktifkan kembali.`
          : `Aktifkan kembali akun "${target.ownerName}" (${target.email})?`;

        if (!window.confirm(message)) return;

        const res = appState.setUserActive(id, !isActive);
        AdminModule.showToast(res.message, res.success ? 'success' : 'error');
      };
    });
  },

  attachCategoryEvents(container) {
    const form = container.querySelector('#admin-cat-form');
    if (!form) return;

    const input = container.querySelector('#admin-cat-input');
    const errBox = container.querySelector('#admin-cat-error');

    const showError = (msg) => {
      errBox.textContent = msg;
      errBox.style.display = 'flex';
      input.classList.add('is-invalid');
    };

    input.addEventListener('input', () => {
      errBox.style.display = 'none';
      input.classList.remove('is-invalid');
    });

    form.onsubmit = (e) => {
      e.preventDefault();
      const res = appState.addCategory(input.value);
      if (res.success) {
        input.value = '';
        AdminModule.showToast(res.message, 'success');
      } else {
        showError(res.message);
      }
    };

    container.querySelectorAll('.admin-cat-rename').forEach(btn => {
      btn.onclick = () => {
        const oldName = btn.getAttribute('data-cat');
        const card = btn.closest('.admin-cat-card');
        if (!card || card.dataset.editing === '1') return;
        card.dataset.editing = '1';

        card.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <label class="form-label" style="margin: 0; font-size: 0.725rem;">Ubah nama kategori</label>
            <input type="text" class="form-input admin-cat-rename-input" value="${esc(oldName)}" maxlength="40" style="font-size: 0.825rem;" />
            <div class="form-error admin-cat-rename-err" style="display: none;"></div>
            <div style="display: flex; gap: 0.4rem;">
              <button type="button" class="btn btn-primary btn-sm admin-cat-save" style="flex: 1; font-size: 0.725rem; padding: 0.3rem 0.5rem;">Simpan</button>
              <button type="button" class="btn btn-secondary btn-sm admin-cat-cancel" style="font-size: 0.725rem; padding: 0.3rem 0.5rem;">Batal</button>
            </div>
          </div>
        `;

        const input = card.querySelector('.admin-cat-rename-input');
        const errBox = card.querySelector('.admin-cat-rename-err');
        input.focus();
        input.select();

        const showError = (msg) => {
          errBox.textContent = msg;
          errBox.style.display = 'flex';
        };

        card.querySelector('.admin-cat-cancel').onclick = () => {
          card.dataset.editing = '0';
          // Render ulang panel agar kartu kembali normal dan handler terpasang kembali
          appState.setState({});
        };

        card.querySelector('.admin-cat-save').onclick = () => {
          const res = appState.renameCategory(oldName, input.value);
          if (res.success) {
            AdminModule.showToast(res.message, 'success');
          } else {
            showError(res.message);
          }
        };

        input.onkeydown = (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            card.querySelector('.admin-cat-save').click();
          }
        };
      };
    });

    container.querySelectorAll('.admin-cat-delete').forEach(btn => {
      btn.onclick = () => {
        const name = btn.getAttribute('data-cat');
        if (!window.confirm(`Hapus kategori "${name}"? Kategori yang masih dipakai produk tidak dapat dihapus.`)) return;
        const res = appState.deleteCategory(name);
        AdminModule.showToast(res.message, res.success ? 'success' : 'error');
      };
    });
  },

  attachProductEvents(container) {
    const search = container.querySelector('#admin-prod-search');
    const catSel = container.querySelector('#admin-prod-category');
    if (!search) return;

    const applyFilter = () => {
      AdminModule.prodQuery = search.value;
      AdminModule.prodCategoryFilter = catSel.value;

      const q = search.value.trim().toLowerCase();
      const cat = catSel.value;
      let visible = 0;
      const total = container.querySelectorAll('.admin-prod-row').length;

      container.querySelectorAll('.admin-prod-row').forEach(row => {
        const ok = (!q || row.dataset.search.includes(q))
          && (cat === 'all' || row.dataset.category === cat);
        row.style.display = ok ? '' : 'none';
        if (ok) visible++;
      });

      const countEl = container.querySelector('#admin-prod-count');
      if (countEl) countEl.textContent = visible;
      const tableWrap = container.querySelector('#admin-prod-table');
      const empty = container.querySelector('#admin-prod-empty');
      if (tableWrap) tableWrap.style.display = visible === 0 ? 'none' : '';
      if (empty) empty.style.display = visible === 0 ? 'block' : 'none';
      void total;
    };

    search.addEventListener('input', applyFilter);
    if (catSel) catSel.addEventListener('change', applyFilter);
    if (AdminModule.prodQuery || AdminModule.prodCategoryFilter !== 'all') applyFilter();
  },

  attachTransactionEvents(container) {
    const sel = container.querySelector('#admin-trx-status');
    if (!sel) return;

    const applyFilter = () => {
      AdminModule.trxStatusFilter = sel.value;
      const status = sel.value;
      let visible = 0;

      container.querySelectorAll('.admin-trx-row').forEach(row => {
        const ok = status === 'all' || row.dataset.status === status;
        row.style.display = ok ? '' : 'none';
        if (ok) visible++;
      });

      const tableWrap = container.querySelector('#admin-trx-table');
      const empty = container.querySelector('#admin-trx-empty');
      if (tableWrap) tableWrap.style.display = visible === 0 ? 'none' : '';
      if (empty) empty.style.display = visible === 0 ? 'block' : 'none';
    };

    sel.addEventListener('change', applyFilter);
    if (AdminModule.trxStatusFilter !== 'all') applyFilter();
  },

  showToast(message, type = 'success') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <div style="color: ${type === 'error' ? 'var(--color-danger)' : 'var(--color-primary)'};">
        ${type === 'error' ? Icons.x : Icons.check}
      </div>
      <div style="flex: 1;">${esc(message)}</div>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};
