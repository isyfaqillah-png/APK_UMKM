// DesaBiz AI - Top Navbar Component
import { Icons } from '../icons.js';
import { appState } from '../state.js';

export class Navbar {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    appState.subscribe((state) => this.update(state));

    // Handle outside clicks to close notification dropdown
    document.addEventListener('click', (e) => {
      const state = appState.getState();
      if (state.notificationDropdownOpen) {
        const notifContainer = this.container.querySelector('.notif-wrapper');
        if (notifContainer && !notifContainer.contains(e.target)) {
          appState.toggleNotificationDropdown(false);
        }
      }
    });
  }

  render() {
    const state = appState.getState();
    // Saat logout state.user = null — pakai objek aman agar render tidak gagal.
    const user = state.user || { avatarInitial: '—', businessName: 'Tamu', village: '' };
    const isBuyer = user.role === 'buyer';
    const unreadCount = appState.getUnreadNotificationsCount();
    const unreadChatCount = appState.getTotalUnreadChatCount();
    const isNotifOpen = state.notificationDropdownOpen;
    const notifications = state.notifications || [];

    this.container.className = 'app-navbar';
    this.container.innerHTML = `
      <div class="navbar-left">
        <button id="mobile-menu-trigger" class="mobile-menu-btn" title="Buka Menu">
          ${Icons.menu}
        </button>
        <div class="navbar-search-box">
          ${Icons.search}
          <input 
            type="text" 
            class="navbar-search-input" 
            placeholder="Cari komoditas, supplier desa, atau produk..."
            id="global-search-input"
          />
        </div>
      </div>

      <div class="navbar-right">
        ${user.accountRole === 'ADMIN' ? '' : `
        <!-- Dual-Role Switcher (PRD Requirement: Pembeli & Penjual) -->
        <div class="role-switcher-container" title="Ganti Mode Peran UMKM">
          <button 
            type="button" 
            class="role-tab-btn ${isBuyer ? 'active' : ''}" 
            id="role-btn-buyer"
          >
            🛒 Mode Pembeli
          </button>
          <button 
            type="button" 
            class="role-tab-btn ${!isBuyer ? 'active seller' : ''}" 
            id="role-btn-seller"
          >
            🏪 Mode Penjual
          </button>
        </div>
        `}

        <!-- Chat Direct Action Button -->
        <a href="#/chat" class="nav-action-btn" id="nav-chat-btn" title="Pusat Pesan & Chat B2B" style="position: relative; display: flex; align-items: center; justify-content: center; text-decoration: none;">
          ${Icons.chat}
          ${unreadChatCount > 0 ? `<span class="notification-badge" style="background: var(--color-primary);">${unreadChatCount}</span>` : ''}
        </a>

        <!-- Notification Bell with Popover Dropdown -->
        <div class="notif-wrapper" style="position: relative;">
          <button class="nav-action-btn" id="notifications-btn" title="Notifikasi Transaksi & Penawaran">
            ${Icons.bell}
            ${unreadCount > 0 ? `<span class="notification-badge">${unreadCount}</span>` : ''}
          </button>

          ${isNotifOpen ? `
            <div class="notification-dropdown">
              <div class="notif-header">
                <div class="notif-title">
                  <span>Notifikasi Usaha</span>
                  ${unreadCount > 0 ? `<span class="badge badge-primary">${unreadCount} Baru</span>` : ''}
                </div>
                ${unreadCount > 0 ? `
                  <button class="notif-mark-btn" id="btn-mark-all-read">Tandai semua dibaca</button>
                ` : ''}
              </div>
              <div class="notif-list">
                ${notifications.length === 0 ? `
                  <div style="padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                    Tidak ada notifikasi baru
                  </div>
                ` : notifications.map(n => `
                  <a href="${n.link}" class="notif-item ${!n.read ? 'unread' : ''}" data-id="${n.id}">
                    <div class="notif-icon-box" style="
                      background: ${n.type === 'order' ? 'var(--color-secondary-soft)' : (n.type === 'negotiation' ? 'var(--color-accent-soft)' : (n.type === 'stock' ? 'var(--color-danger-soft)' : 'var(--color-primary-soft)'))};
                      color: ${n.type === 'order' ? 'var(--color-secondary)' : (n.type === 'negotiation' ? '#b45309' : (n.type === 'stock' ? 'var(--color-danger)' : 'var(--color-primary)'))};
                    ">
                      ${n.type === 'order' ? Icons.pesanan : (n.type === 'negotiation' ? Icons.negosiasi : (n.type === 'stock' ? Icons.stok : Icons.sparkle))}
                    </div>
                    <div class="notif-content">
                      <span class="notif-item-title">${n.title}</span>
                      <span class="notif-item-desc">${n.message}</span>
                      <span class="notif-item-time">${n.time}</span>
                    </div>
                  </a>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- User Profile Pill -->
        <a href="#/profile" class="user-profile-btn" title="Pengaturan Profil Usaha">
          <div class="user-avatar">
            ${user.avatarInitial || 'UM'}
          </div>
          <div class="user-meta">
            <span class="user-name">${user.businessName}</span>
            <span class="user-role-label">
              ${user.accountRole === 'ADMIN'
                ? '👑 Administrator'
                : (isBuyer ? '🌾 Pembeli Pasokan' : '📦 Penjual / Supplier')} • ${(user.village || 'Cianjur').split(',')[0]}
            </span>
          </div>
        </a>
      </div>
    `;

    this.attachEvents();
    this.container.dataset.built = '1';
    this._lastNotifOpen = isNotifOpen;
    this._lastRole = user.role;
    this._lastUnread = unreadCount;
    this._lastUserKey = `${user.avatarInitial || ''}|${user.businessName || ''}|${user.accountRole || ''}`;
  }

  attachEvents() {
    // Mobile Hamburger
    const mobileBtn = this.container.querySelector('#mobile-menu-trigger');
    if (mobileBtn) {
      mobileBtn.onclick = () => appState.toggleMobileSidebar();
    }

    // Role Switchers
    const buyerBtn = this.container.querySelector('#role-btn-buyer');
    const sellerBtn = this.container.querySelector('#role-btn-seller');

    if (buyerBtn) {
      buyerBtn.onclick = () => {
        appState.setRole('buyer');
        this.showToast('Beralih ke Mode Pembeli: Fokus pencarian supplier & negosiasi harga pasokan.');
      };
    }

    if (sellerBtn) {
      sellerBtn.onclick = () => {
        appState.setRole('seller');
        this.showToast('Beralih ke Mode Penjual: Kelola katalog produk, stok pasokan, dan pesanan masuk.');
      };
    }

    // Notification Dropdown Toggle
    const notifBtn = this.container.querySelector('#notifications-btn');
    if (notifBtn) {
      notifBtn.onclick = (e) => {
        e.stopPropagation();
        appState.toggleNotificationDropdown();
      };
    }

    // Mark all read button
    const markAllBtn = this.container.querySelector('#btn-mark-all-read');
    if (markAllBtn) {
      markAllBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        appState.markAllNotificationsRead();
        this.showToast('Semua notifikasi ditandai telah dibaca.');
      };
    }

    // Notification items click
    const notifItems = this.container.querySelectorAll('.notif-item');
    notifItems.forEach(item => {
      item.onclick = () => {
        const id = item.getAttribute('data-id');
        if (id) {
          appState.markNotificationRead(id);
          appState.toggleNotificationDropdown(false);
        }
      };
    });

    // Search input enter event
    const searchInput = this.container.querySelector('#global-search-input');
    if (searchInput) {
      // Pertahankan teks pencarian saat navbar dirender ulang (mis. buka dropdown notifikasi)
      if (this._searchValue) searchInput.value = this._searchValue;
      searchInput.addEventListener('input', () => { this._searchValue = searchInput.value; });
      searchInput.onkeydown = (e) => {
        if (e.key === 'Enter' && searchInput.value.trim()) {
          const query = encodeURIComponent(searchInput.value.trim());
          window.location.hash = `#/supplier?q=${query}`;
          this.showToast(`Mencari "${searchInput.value.trim()}" di direktori supplier DesaBiz...`);
        }
      };
    }
  }

  showToast(message) {
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
      <div style="color: var(--color-primary);">${Icons.check}</div>
      <div style="flex: 1;">${message}</div>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  /**
   * Patch ringan badge hitung (chat & lonceng notifikasi) tanpa membangun
   * ulang seluruh navbar — menjaga isi kolom pencarian dan keadaan DOM tetap utuh.
   */
  syncCounters(state) {
    const unreadCount = appState.getUnreadNotificationsCount();
    const unreadChatCount = appState.getTotalUnreadChatCount();

    const setBadge = (selector, count) => {
      const btn = this.container.querySelector(selector);
      if (!btn) return;
      let badge = btn.querySelector('.notification-badge');
      if (count > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'notification-badge';
          btn.appendChild(badge);
        }
        if (badge.textContent !== String(count)) badge.textContent = String(count);
      } else if (badge) {
        badge.remove();
      }
    };

    setBadge('#nav-chat-btn', unreadChatCount);
    setBadge('#notifications-btn', unreadCount);
  }

  update(state) {
    // Perubahan struktural (buka/tutup dropdown notifikasi, ganti peran,
    // ganti data user) tetap membutuhkan render ulang penuh.
    const notifOpen = !!state.notificationDropdownOpen;
    const role = state.user?.role;
    const userKey = `${state.user?.avatarInitial || ''}|${state.user?.businessName || ''}|${state.user?.accountRole || ''}`;
    const structural = !this.container.dataset.built
      || notifOpen !== this._lastNotifOpen
      || role !== this._lastRole
      || userKey !== this._lastUserKey
      // Saat dropdown terbuka, isi daftar notifikasi harus ikut diperbarui
      || (notifOpen && appState.getUnreadNotificationsCount() !== this._lastUnread);

    if (structural) {
      this.render();
      return;
    }
    this.syncCounters(state);
  }
}
