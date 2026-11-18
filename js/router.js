// DesaBiz AI - Client-side SPA Router with Route Protection
import { appState } from './state.js';
import { DashboardModule } from './modules/dashboard/index.js';
import { AuthModule } from './modules/auth/index.js';
import { ProdukModule } from './modules/produk/index.js';
import { SupplierModule } from './modules/supplier/index.js';
import { PesananModule } from './modules/pesanan/index.js';
import { NegosiasiModule } from './modules/negosiasi/index.js';
import { ChatModule } from './modules/chat/index.js';
import { StokModule } from './modules/stok/index.js';
import { TransaksiModule } from './modules/transaksi/index.js';
import { AdminModule } from './modules/admin/index.js';
import { AIAssistantModule } from './modules/ai-assistant/index.js';
import { AIDock } from './components/AIDock.js';
import { ApiKeyModule } from './modules/api-key/index.js';
import { NotifWAModule } from './modules/notif-wa/index.js';
import { AIKeyModule } from './modules/ai-key/index.js';
import { AISettingsModule } from './modules/ai-settings/index.js';

export class Router {
  constructor(contentContainerId) {
    this.container = document.getElementById(contentContainerId);
    this.publicRoutes = ['login', 'register'];

    this.routes = {
      'dashboard': DashboardModule,
      'login': AuthModule,
      'register': AuthModule,
      'profile': AuthModule,
      'profile-edit': AuthModule,
      'auth': AuthModule,
      'logout': AuthModule,
      'produk': ProdukModule,
      'supplier': SupplierModule,
      'supplier-detail': SupplierModule,
      'pesanan': PesananModule,
      'pesanan-buat': PesananModule,
      'pesanan-detail': PesananModule,
      'negosiasi': NegosiasiModule,
      'chat': ChatModule,
      'stok': StokModule,
      'transaksi': TransaksiModule,
      'transaksi-detail': TransaksiModule,
      'admin': AdminModule,
      'ai-assistant': AIAssistantModule,
      'apikey': ApiKeyModule,
      'notif-wa': NotifWAModule,
      'ai-key': AIKeyModule,
      'ai-settings': AISettingsModule,
    };

    window.addEventListener('hashchange', () => this.handleRoute());

    // Re-render current route on state change
    // Guard: renderRoute() itself notifies state (setCurrentRoute), so a nested
    // notify would otherwise re-enter renderRoute endlessly (stack overflow).
    this.isRendering = false;
    appState.subscribe(() => {
      if (this.isRendering) return;
      const currentRoute = appState.getState().currentRoute;
      if (this.container && !this.publicRoutes.includes(currentRoute)) {
        this.renderRoute(currentRoute);
      }
    });
  }

  init() {
    this.handleRoute();
  }

  handleRoute() {
    let rawHash = window.location.hash.replace('#/', '').replace('#', '').trim();
    
    // Default route
    if (!rawHash) {
      rawHash = appState.isAuthenticated() ? 'dashboard' : 'login';
      window.location.hash = `#/${rawHash}`;
      return;
    }

    // Split base route and query parameters (e.g. supplier?id=sup_01)
    const [routeKey, queryString] = rawHash.split('?');
    const params = new URLSearchParams(queryString || '');

    if (!this.routes[routeKey]) {
      const fallback = appState.isAuthenticated() ? 'dashboard' : 'login';
      window.location.hash = `#/${fallback}`;
      return;
    }

    // ==========================================
    // ROUTE GUARD (PROTEKSI HALAMAN INTERNAL)
    // ==========================================
    const isAuth = appState.isAuthenticated();
    const isPublic = this.publicRoutes.includes(routeKey);

    // 1. Jika belum login dan mencoba akses halaman internal -> Redirect ke Login
    if (!isAuth && !isPublic) {
      AuthModule.showToast('Silakan masuk terlebih dahulu untuk mengakses DesaBiz AI.');
      window.location.hash = '#/login';
      return;
    }

    // 2. Jika sudah login dan mencoba akses Login/Register -> Redirect ke Dashboard
    if (isAuth && isPublic && routeKey !== 'logout') {
      window.location.hash = '#/dashboard';
      return;
    }

    // 3. ROUTE KHUSUS ADMIN (authorization: hanya role ADMIN)
    // Mencakup Panel Admin + seluruh menu KONFIGURASI (WhatsApp Fonnte,
    // API Key Chatbot AI, Pengaturan Chatbot AI).
    const adminOnlyRoutes = {
      admin: 'Akses ditolak: Panel Admin hanya untuk akun Administrator DesaBiz AI.',
      apikey: 'Akses ditolak: Konfigurasi API Key hanya untuk akun Administrator.',
      'ai-key': 'Akses ditolak: Konfigurasi API Key Chatbot AI hanya untuk akun Administrator.',
      'ai-settings': 'Akses ditolak: Pengaturan Chatbot AI hanya untuk akun Administrator.'
    };
    if (isAuth && adminOnlyRoutes[routeKey] && !appState.isAdmin()) {
      AuthModule.showToast(adminOnlyRoutes[routeKey]);
      window.location.hash = '#/dashboard';
      return;
    }

    // ==========================================
    // ASISTEN AI = PANEL KANAN (AIDock)
    // Route #/ai-assistant kini hanya PENCETUS pembuka panel Asisten AI di
    // sisi kanan layar (bukan halaman penuh), sehingga fitur tidak tampil
    // dua kali dan riwayat percakapan tetap satu (modul chat yang sama).
    // ==========================================
    if (routeKey === 'ai-assistant') {
      const isRendered = this.lastRenderedRoute && this.lastRenderedRoute !== 'ai-assistant';
      const target = isRendered ? this.lastRenderedRoute : 'dashboard';
      if (window.location.hash !== '#/' + target) {
        if (isRendered) {
          // Sudah berada di halaman tertentu -> normalisasi URL tanpa render ulang
          history.replaceState(null, '', '#/' + target);
        } else {
          // Deep-link langsung -> muat halaman default sebagai latar
          window.location.hash = '#/' + target;
        }
      }
      AIDock.open();
      return;
    }

    this.renderRoute(routeKey, params);
  }

  renderRoute(routeKey, params = new URLSearchParams()) {
    this.isRendering = true;
    try {
      this.renderRouteInner(routeKey, params);
    } finally {
      this.isRendering = false;
    }
  }

  renderRouteInner(routeKey, params) {
    appState.setCurrentRoute(routeKey);
    // Halaman terakhir yang dirender (pemicu #/ai-assistant -> panel kanan)
    this.lastRenderedRoute = routeKey;

    // Toggle fullscreen layout for Auth pages
    if (this.publicRoutes.includes(routeKey)) {
      document.body.classList.add('auth-view');
    } else {
      document.body.classList.remove('auth-view');
    }

    const module = this.routes[routeKey];

    // Document title update
    let pageTitle = module.title;
    if (routeKey === 'login') pageTitle = 'Masuk Akun';
    else if (routeKey === 'register') pageTitle = 'Pendaftaran UMKM Baru';
    else if (routeKey === 'profile' || routeKey === 'auth') pageTitle = 'Profil UMKM Desa';
    else if (routeKey === 'profile-edit') pageTitle = 'Edit Profil UMKM';
    else if (routeKey === 'supplier-detail') pageTitle = 'Detail Supplier Desa';
    else if (routeKey === 'pesanan-buat') pageTitle = 'Buat Purchase Order (PO)';
    else if (routeKey === 'pesanan-detail') pageTitle = 'Detail Purchase Order (PO)';
    else if (routeKey === 'negosiasi') pageTitle = 'Negosiasi Harga B2B';
    else if (routeKey === 'chat') pageTitle = 'Pesan & Komunikasi B2B';
    else if (routeKey === 'stok') pageTitle = 'Manajemen Stok & Inventaris';
    else if (routeKey === 'transaksi') pageTitle = 'Transaksi B2B';
    else if (routeKey === 'transaksi-detail') pageTitle = 'Faktur & Detail Transaksi';
    else if (routeKey === 'ai-assistant') pageTitle = 'DesaBiz AI Assistant';
    else if (routeKey === 'apikey') pageTitle = 'Konfigurasi WhatsApp Fonnte';
    else if (routeKey === 'notif-wa') pageTitle = 'Pengaturan Notifikasi WhatsApp';
    else if (routeKey === 'ai-key') pageTitle = 'Konfigurasi API Key Chatbot AI';
    else if (routeKey === 'ai-settings') pageTitle = 'Pengaturan Chatbot AI';

    document.title = `${pageTitle} | DesaBiz AI - B2B UMKM Pedesaan`;

    if (this.container) {
      this.container.innerHTML = '';
      if (module === AuthModule) {
        module.render(this.container, routeKey);
      } else if (module === SupplierModule || module === PesananModule || module === NegosiasiModule || module === ChatModule || module === StokModule || module === TransaksiModule) {
        module.render(this.container, params, routeKey);
      } else {
        module.render(this.container);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
