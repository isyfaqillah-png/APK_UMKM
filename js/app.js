// DesaBiz AI - Main Application Bootstrap
import { appState } from './state.js';
import { Sidebar } from './components/Sidebar.js';
import { Navbar } from './components/Navbar.js';
import { Router } from './router.js';
import { AIDock } from './components/AIDock.js';

class DesaBizApp {
  constructor() {
    this.sidebar = null;
    this.navbar = null;
    this.router = null;
  }

  init() {
    console.log('🚀 Initializing DesaBiz AI - B2B Platform UMKM Desa...');

    // Initialize Layout Components
    this.sidebar = new Sidebar('app-sidebar-container');
    this.sidebar.render();

    this.navbar = new Navbar('app-navbar-container');
    this.navbar.render();

    // Asisten AI: tombol mengambang + panel kanan (dipasang sekali untuk seluruh aplikasi)
    AIDock.mount();

    // Initialize SPA Router with Main Content target
    this.router = new Router('app-content-container');
    this.router.init();

    // Global backdrop click for mobile drawer
    document.addEventListener('click', (e) => {
      const state = appState.getState();
      if (state.mobileSidebarOpen && window.innerWidth <= 768) {
        const sidebarEl = document.getElementById('app-sidebar-container');
        const triggerBtn = document.getElementById('mobile-menu-trigger');
        if (sidebarEl && !sidebarEl.contains(e.target) && triggerBtn && !triggerBtn.contains(e.target)) {
          appState.toggleMobileSidebar(false);
        }
      }
    });

    console.log('✅ DesaBiz AI Ready!');
  }
}

// Bootstrap on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new DesaBizApp();
  app.init();
});
