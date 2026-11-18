// DesaBiz AI - Sidebar Component
import { Icons } from '../icons.js';
import { appState } from '../state.js';

export class Sidebar {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.navSections = [
      {
        title: 'Menu Utama',
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: Icons.dashboard, badge: null },
          { id: 'ai-assistant', label: 'DesaBiz AI', icon: Icons.sparkle, badge: 'AI' },
        ]
      },
      {
        title: 'Pasar & B2B',
        items: [
          { id: 'supplier', label: 'Cari Supplier', icon: Icons.supplier, badge: null },
          { id: 'produk', label: 'Produk & Pasar', icon: Icons.produk, badge: 'B2B' },
          { id: 'negosiasi', label: 'Negosiasi Harga', icon: Icons.negosiasi, badge: '2 Aktif' },
          { id: 'pesanan', label: 'Pesanan B2B', icon: Icons.pesanan, badge: null },
        ]
      },
      {
        title: 'Operasional UMKM',
        items: [
          { id: 'stok', label: 'Manajemen Stok', icon: Icons.stok, badge: null },
          { id: 'transaksi', label: 'Transaksi & Faktur', icon: Icons.transaksi, badge: null },
          { id: 'chat', label: 'Pesan / Chat', icon: Icons.chat, badge: '3 Baru' },
        ]
      },
      {
        title: 'KONFIGURASI',
        items: [
          { id: 'apikey', label: 'WhatsApp Fonnte', icon: Icons.whatsapp, badge: null, roles: ['ADMIN'] },
          { id: 'ai-key', label: 'API Key Chatbot AI', icon: Icons.key, badge: 'AI', roles: ['ADMIN'] },
          { id: 'notif-wa', label: 'Notifikasi WhatsApp', icon: Icons.bell, badge: 'WA' },
          { id: 'ai-settings', label: 'Pengaturan Chatbot AI', icon: Icons.sliders, badge: null, roles: ['ADMIN'] },
        ]
      },
      {
        title: 'Pengaturan',
        items: [
          { id: 'admin', label: 'Panel Admin', icon: Icons.admin, badge: null, roles: ['ADMIN'] },
          { id: 'profile', label: 'Profil UMKM', icon: Icons.auth, badge: null },
          { 
            id: 'logout', 
            label: 'Keluar Sesi', 
            icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`, 
            badge: null 
          },
        ]
      }
    ];

    appState.subscribe((state) => this.update(state));
  }

  render() {
    const state = appState.getState();
    const isCollapsed = state.sidebarCollapsed;
    const isMobileOpen = state.mobileSidebarOpen;

    const unreadChats = appState.getTotalUnreadChatCount();

    this.container.className = `app-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`;    this.container.innerHTML = `
      <div class="sidebar-header">
        <a href="#/dashboard" class="sidebar-brand">
          <div class="brand-icon-box">
            ${Icons.logo}
          </div>
          <div class="brand-info">
            <span class="brand-title">
              DesaBiz <span class="brand-badge">AI</span>
            </span>
            <span class="brand-subtitle">B2B Ekosistem UMKM</span>
          </div>
        </a>
        <button id="sidebar-toggle-btn" class="sidebar-toggle-btn" title="Toggle Sidebar">
          ${isCollapsed ? Icons.chevronRight : Icons.chevronLeft}
        </button>
      </div>

      <nav class="sidebar-content">
        ${this.navSections.map(section => {
          const visibleItems = section.items.filter(item => !item.roles || item.roles.includes(state.user?.accountRole || 'UMKM'));
          if (!visibleItems.length) return '';
          return `
          <div class="nav-group">
            <div class="nav-group-title">${section.title}</div>
            ${visibleItems.map(item => {
              const isActive = state.currentRoute === item.id;
              let itemBadge = item.badge;
              let itemBadgeClass = item.badgeClass || '';
              if (item.id === 'chat') {
                itemBadge = unreadChats > 0 ? `${unreadChats} Baru` : null;
              } else if (item.id === 'stok') {
                itemBadge = state.stats?.stokMenipis > 0 ? `${state.stats.stokMenipis} Menipis` : null;
                itemBadgeClass = 'badge-warning';
              } else if (item.id === 'transaksi') {
                const pendingTrx = (state.transactions || []).filter(t => t.status === 'Menunggu Pembayaran').length;
                itemBadge = pendingTrx > 0 ? `${pendingTrx} Tagihan` : null;
                itemBadgeClass = 'badge-warning';
              } else if (item.id === 'admin') {
                const pendingVerify = appState.getUsers().filter(u => u.accountRole !== 'ADMIN' && u.isVerified === false).length;
                itemBadge = pendingVerify > 0 ? `${pendingVerify} Verifikasi` : null;
                itemBadgeClass = 'badge-warning';
              }
              return `
                <a href="#/${item.id}" class="nav-item ${isActive ? 'active' : ''}" data-route="${item.id}">
                  <span class="nav-icon">${item.icon}</span>
                  <span class="nav-text">${item.label}</span>
                  ${itemBadge ? `<span class="nav-badge ${itemBadgeClass}">${itemBadge}</span>` : ''}
                </a>
              `;
            }).join('')}
          </div>
        `;
        }).join('')}
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-ai-card">
          <div class="ai-card-header">
            <span class="ai-pulse-dot"></span>
            <span>DesaBiz Engine</span>
          </div>
          <div class="ai-card-desc">
            Asisten AI aktif memantau tren harga pasokan & panen lokal.
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
    this.container.dataset.built = '1';
    this._lastAccountRole = state.user?.accountRole || 'UMKM';
  }

  attachEvents() {
    const toggleBtn = this.container.querySelector('#sidebar-toggle-btn');
    if (toggleBtn) {
      toggleBtn.onclick = (e) => {
        e.preventDefault();
        appState.toggleSidebar();
      };
    }

    // Close mobile drawer on item click
    const navItems = this.container.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          appState.toggleMobileSidebar(false);
        }
      });
    });
  }

  /**
   * Perhitungan badge satu menu (badge statis + badge dinamis dari data).
   * Dipakai oleh render() maupun update() agar hasilnya selalu konsisten.
   */
  resolveBadge(itemId, state, unreadChats) {
    const item = this.navSections
      .flatMap(s => s.items)
      .find(i => i.id === itemId);

    let label = item ? item.badge : null;
    let cls = (item && item.badgeClass) || '';

    if (itemId === 'chat') {
      label = unreadChats > 0 ? `${unreadChats} Baru` : null;
      cls = '';
    } else if (itemId === 'stok') {
      label = state.stats?.stokMenipis > 0 ? `${state.stats.stokMenipis} Menipis` : null;
      cls = 'badge-warning';
    } else if (itemId === 'transaksi') {
      const pendingTrx = (state.transactions || []).filter(t => t.status === 'Menunggu Pembayaran').length;
      label = pendingTrx > 0 ? `${pendingTrx} Tagihan` : null;
      cls = 'badge-warning';
    } else if (itemId === 'admin') {
      const pendingVerify = appState.getUsers().filter(u => u.accountRole !== 'ADMIN' && u.isVerified === false).length;
      label = pendingVerify > 0 ? `${pendingVerify} Verifikasi` : null;
      cls = 'badge-warning';
    }

    return { label, cls };
  }

  /**
   * Patch ringan: cukup perbarui kelas aktif, ikon toggle, dan badge
   * TANPA membangun ulang innerHTML (mencegah sidebar "kedip" saat pindah menu).
   */
  update(state) {
    if (!this.container.dataset.built) { this.render(); return; }

    // Perubahan role akun (UMKM <-> ADMIN, login/logout) butuh render ulang penuh
    // karena daftar menu yang tampil ikut berubah.
    const accountRole = state.user?.accountRole || 'UMKM';
    if (accountRole !== this._lastAccountRole) {
      this.render();
      return;
    }

    this.container.className = `app-sidebar ${state.sidebarCollapsed ? 'collapsed' : ''} ${state.mobileSidebarOpen ? 'mobile-open' : ''}`;

    const toggleBtn = this.container.querySelector('#sidebar-toggle-btn');
    if (toggleBtn) {
      const icon = state.sidebarCollapsed ? Icons.chevronRight : Icons.chevronLeft;
      if (toggleBtn.innerHTML !== icon) toggleBtn.innerHTML = icon;
    }

    const unreadChats = appState.getTotalUnreadChatCount();
    this.container.querySelectorAll('.nav-item[data-route]').forEach(link => {
      const id = link.dataset.route;
      link.classList.toggle('active', state.currentRoute === id);

      const { label, cls } = this.resolveBadge(id, state, unreadChats);
      let badgeEl = link.querySelector('.nav-badge');
      if (label) {
        if (!badgeEl) {
          badgeEl = document.createElement('span');
          link.appendChild(badgeEl);
        }
        badgeEl.className = `nav-badge ${cls}`.trim();
        if (badgeEl.textContent !== label) badgeEl.textContent = label;
      } else if (badgeEl) {
        badgeEl.remove();
      }
    });
  }
}
