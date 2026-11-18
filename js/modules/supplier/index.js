// DesaBiz AI - Modul Supplier & Direktori B2B Pedesaan
import { Icons } from '../../icons.js';
import { appState } from '../../state.js';

const CATEGORIES = [
  'Pertanian & Beras',
  'Perkebunan & Kopi',
  'Gula & Rempah',
  'Hortikultura & Sayur',
  'Peternakan & Pakan',
  'Pupuk & Sarana Tani'
];

const BUSINESS_TYPES = [
  'Semua Jenis Usaha',
  'Kelompok Tani / Gapoktan',
  'Koperasi Desa',
  'UMKM Mandiri',
  'Sentra Budidaya'
];

export const SupplierModule = {
  id: 'supplier',
  title: 'Direktori & Pencarian Supplier',
  subtitle: 'Temukan mitra produsen desa, koperasi, dan kelompok tani terpercaya',

  // Local state
  currentView: 'list', // 'list' | 'detail'
  selectedSupplierId: null,
  searchQuery: '',
  selectedCategory: 'all',
  selectedLocation: 'all',
  selectedBusinessType: 'all',
  onlyVerified: false,

  // Active modals state
  activeChatSupplier: null,
  activeOrderSupplier: null,
  selectedOrderProductId: null,

  render: (container, params = null) => {
    // If router passes a query param e.g. ?id=sup_01 or ?q=beras
    if (params && params instanceof URLSearchParams) {
      const q = params.get('q');
      if (q) {
        SupplierModule.searchQuery = decodeURIComponent(q);
        SupplierModule.currentView = 'list';
      }
      const supId = params.get('id');
      if (supId) {
        SupplierModule.currentView = 'detail';
        SupplierModule.selectedSupplierId = supId;
      }
    }

    if (SupplierModule.currentView === 'detail' && SupplierModule.selectedSupplierId) {
      const supplier = appState.getSupplierById(SupplierModule.selectedSupplierId);
      if (supplier) {
        SupplierModule.renderDetailView(container, supplier);
        return;
      }
    }

    // Default to Directory List View
    SupplierModule.renderListView(container);
  },

  // ==========================================
  // VIEW 1: DAFTAR, PENCARIAN & FILTER SUPPLIER
  // ==========================================
  renderListView: (container) => {
    const allSuppliers = appState.getSuppliers();
    
    // Extract unique regencies for location filter
    const uniqueLocations = [...new Set(allSuppliers.map(s => s.regency).filter(Boolean))];

    // Filter suppliers using multi-criteria search
    const filteredSuppliers = appState.searchSuppliers(SupplierModule.searchQuery, {
      category: SupplierModule.selectedCategory,
      location: SupplierModule.selectedLocation,
      businessType: SupplierModule.selectedBusinessType === 'Semua Jenis Usaha' ? 'all' : SupplierModule.selectedBusinessType,
      onlyVerified: SupplierModule.onlyVerified
    });

    const isFiltered = SupplierModule.searchQuery ||
      SupplierModule.selectedCategory !== 'all' ||
      SupplierModule.selectedLocation !== 'all' ||
      (SupplierModule.selectedBusinessType !== 'all' && SupplierModule.selectedBusinessType !== 'Semua Jenis Usaha') ||
      SupplierModule.onlyVerified;

    // AI Assistant hanya untuk mode Pembeli dan ADMIN
    const _u = appState.getState().user || {};
    const isBuyer = _u.role === 'buyer' || _u.accountRole === 'ADMIN';

    container.innerHTML = `
      <div class="fade-in">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header-info">
            <div class="breadcrumbs">
              <a href="#/dashboard">Beranda</a>
              <span class="breadcrumb-separator">/</span>
              <span class="breadcrumb-item active">Direktori Supplier</span>
            </div>
            <h1 class="page-title">${SupplierModule.title}</h1>
            <p class="page-subtitle">${SupplierModule.subtitle}</p>
          </div>
          <div class="page-header-actions flex gap-2">
            <a href="#/produk" class="btn btn-secondary btn-sm">
              ${Icons.store} Lihat Semua Produk
            </a>
            ${isBuyer ? `
            <a href="#/dashboard" class="btn btn-ai btn-sm">
              ${Icons.sparkle} AI Match Supplier
            </a>` : ''}
          </div>
        </div>

        <!-- 1. PENCARIAN & FILTER TOOLBAR -->
        <div class="marketplace-toolbar">
          <div class="toolbar-search-row">
            <!-- Search Bar Multi-Kriteria -->
            <div class="toolbar-search-box" style="flex: 2;">
              <span class="toolbar-search-icon">${Icons.search}</span>
              <input 
                type="text" 
                class="toolbar-search-input" 
                id="supplier-search-input" 
                placeholder="Cari berdasarkan nama UMKM, produk, komoditas, lokasi, pemilik, atau jenis usaha..." 
                value="${SupplierModule.searchQuery}"
              />
            </div>

            <!-- Filter Kategori -->
            <select class="toolbar-select" id="supplier-filter-category">
              <option value="all" ${SupplierModule.selectedCategory === 'all' ? 'selected' : ''}>Semua Kategori Produk</option>
              ${appState.getCategories().map(c => `<option value="${c}" ${SupplierModule.selectedCategory === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>

            <!-- Filter Lokasi (Kabupaten) -->
            <select class="toolbar-select" id="supplier-filter-location">
              <option value="all" ${SupplierModule.selectedLocation === 'all' ? 'selected' : ''}>Semua Wilayah Sentra</option>
              ${uniqueLocations.map(loc => `<option value="${loc}" ${SupplierModule.selectedLocation === loc ? 'selected' : ''}>${loc}</option>`).join('')}
            </select>

            <!-- Filter Jenis Usaha -->
            <select class="toolbar-select" id="supplier-filter-type">
              ${BUSINESS_TYPES.map(t => `<option value="${t}" ${SupplierModule.selectedBusinessType === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>

            ${isFiltered ? `
              <button class="btn btn-secondary btn-sm" id="btn-reset-supplier-filter" title="Reset Semua Filter">
                ${Icons.refresh} Reset
              </button>
            ` : ''}
          </div>

          <!-- Quick Filter Chips: Jenis Usaha & Verifikasi -->
          <div class="category-chips-wrap" style="align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0.5rem; overflow-x: auto;">
              <button 
                type="button" 
                class="category-chip ${SupplierModule.selectedBusinessType === 'all' || SupplierModule.selectedBusinessType === 'Semua Jenis Usaha' ? 'active' : ''}" 
                data-type="all"
              >
                Semua Produsen
              </button>
              <button 
                type="button" 
                class="category-chip ${SupplierModule.selectedBusinessType === 'Gapoktan' ? 'active' : ''}" 
                data-type="Gapoktan"
              >
                Kelompok Tani (Gapoktan)
              </button>
              <button 
                type="button" 
                class="category-chip ${SupplierModule.selectedBusinessType === 'Koperasi Desa' ? 'active' : ''}" 
                data-type="Koperasi Desa"
              >
                Koperasi Desa
              </button>
              <button 
                type="button" 
                class="category-chip ${SupplierModule.selectedBusinessType === 'UMKM Mandiri' ? 'active' : ''}" 
                data-type="UMKM Mandiri"
              >
                UMKM Mandiri
              </button>
              <button 
                type="button" 
                class="category-chip ${SupplierModule.selectedBusinessType === 'Sentra Budidaya' ? 'active' : ''}" 
                data-type="Sentra Budidaya"
              >
                Sentra Budidaya
              </button>
            </div>

            <!-- Toggle Hanya Terverifikasi -->
            <label style="display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; font-weight: 700; color: var(--color-primary-dark); cursor: pointer; white-space: nowrap;">
              <input type="checkbox" id="check-only-verified" ${SupplierModule.onlyVerified ? 'checked' : ''} style="cursor: pointer;" />
              ${Icons.shieldCheck} Hanya Mitra Terverifikasi
            </label>
          </div>

          <!-- Results Summary Bar -->
          <div class="toolbar-results-bar">
            <div>
              Menampilkan <strong>${filteredSuppliers.length}</strong> supplier terpercaya dari total <strong>${allSuppliers.length}</strong> mitra terdaftar
            </div>
            ${isFiltered ? `
              <div style="font-size: 0.8rem; color: var(--color-primary); font-weight: 600;">
                Filter aktif: ${SupplierModule.searchQuery ? `"${SupplierModule.searchQuery}" ` : ''}${SupplierModule.selectedCategory !== 'all' ? `[${SupplierModule.selectedCategory}] ` : ''}${SupplierModule.selectedLocation !== 'all' ? `[${SupplierModule.selectedLocation}] ` : ''}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- 2. DAFTAR SUPPLIER GRID -->
        ${filteredSuppliers.length === 0 ? `
          <div class="card" style="text-align: center; padding: 3.5rem 1.5rem;">
            <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🔍</div>
            <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">
              Tidak ada supplier yang sesuai dengan kriteria pencarian
            </h3>
            <p style="color: var(--text-muted); font-size: 0.875rem; max-width: 480px; margin: 0 auto 1.25rem;">
              Coba cari dengan nama komoditas seperti "Beras", "Kopi", "Cabai", atau ubah filter wilayah sentra.
            </p>
            <button class="btn btn-secondary btn-sm" id="btn-empty-reset-supplier">
              ${Icons.refresh} Bersihkan Filter Pencarian
            </button>
          </div>
        ` : `
          <div class="supplier-grid">
            ${filteredSuppliers.map(s => SupplierModule.renderSupplierCard(s)).join('')}
          </div>
        `}

        <!-- Modals Slot -->
        <div id="supplier-modal-slot"></div>
      </div>
    `;

    SupplierModule.attachListEvents(container);
  },

  // Single Supplier Card Component
  renderSupplierCard: (s) => {
    const productsCount = (s.products || []).length;
    const firstProduct = (s.products && s.products[0]) ? s.products[0] : null;

    return `
      <div class="supplier-card" data-id="${s.id}">
        <div class="supplier-card-header">
          <div class="supplier-avatar">
            ${s.avatarInitial || s.businessName.substring(0, 2).toUpperCase()}
          </div>
          <div class="supplier-header-info">
            <h3 class="supplier-name-title" title="${s.businessName}">
              ${s.businessName}
              ${s.isVerified ? `<span style="color: var(--color-primary);" title="${s.verificationBadge}">${Icons.checkCircle}</span>` : ''}
            </h3>
            <div class="supplier-owner-sub">
              <span>👤 Pemilik: <strong>${s.ownerName}</strong></span>
            </div>
          </div>
        </div>

        <div class="supplier-card-body">
          <div class="supplier-badge-row">
            <span class="badge badge-primary">${s.businessType}</span>
            <span class="supplier-rating-badge">
              ${Icons.star} ${s.rating} (${s.transactionCount || 50}+ B2B)
            </span>
          </div>

          <div class="supplier-location-badge">
            ${Icons.mapPin} <span>${s.location || s.regency}</span>
          </div>

          <p class="supplier-desc-snippet" title="${s.description}">
            ${s.description}
          </p>

          <!-- Produk yang Dijual (Harga & Minimum Order) -->
          <div class="supplier-products-box">
            <div class="supplier-products-label">
              <span>Komoditas Unggulan:</span>
              <span>${productsCount} Produk Aktif</span>
            </div>

            ${firstProduct ? `
              <div class="supplier-product-pill">
                <span class="prod-name" title="${firstProduct.name}">
                  🌾 ${firstProduct.name}
                </span>
                <span class="prod-price">
                  Rp ${SupplierModule.formatNum(firstProduct.price)} / ${firstProduct.unit}
                </span>
              </div>
              <div style="font-size: 0.725rem; color: var(--text-muted); display: flex; justify-content: space-between; padding: 0 0.2rem;">
                <span>${Icons.truck} Min. Order: <strong>${SupplierModule.formatNum(firstProduct.minOrder)} ${firstProduct.unit}</strong></span>
                <span>Stok: ${SupplierModule.formatNum(firstProduct.stock)} ${firstProduct.unit}</span>
              </div>
            ` : `
              <div style="font-size: 0.775rem; color: var(--text-muted); font-style: italic;">
                Komoditas: ${s.featuredProducts ? s.featuredProducts.join(', ') : 'Hasil panen desa pilihan'}
              </div>
            `}
          </div>
        </div>

        <div class="supplier-card-footer">
          <button class="btn btn-secondary btn-sm btn-detail btn-view-supplier-detail" data-id="${s.id}">
            ${Icons.eye} Detail Supplier
          </button>
          <button class="btn btn-secondary btn-sm btn-icon-action btn-quick-chat" data-id="${s.id}" title="Kirim Pesan / Chat">
            ${Icons.chat} Chat
          </button>
          <button class="btn btn-primary btn-sm btn-icon-action btn-quick-order-supplier" data-id="${s.id}" title="Pesan Pasokan Grosir">
            ${Icons.pesanan} Pesan
          </button>
        </div>
      </div>
    `;
  },

  // ==========================================
  // VIEW 2: HALAMAN DETAIL SUPPLIER
  // ==========================================
  renderDetailView: (container, supplier) => {
    const products = supplier.products || [];

    container.innerHTML = `
      <div class="fade-in supplier-detail-container">
        <!-- Back Bar -->
        <div class="supplier-back-bar">
          <button class="btn btn-secondary btn-sm" id="btn-back-to-suppliers">
            ${Icons.arrowLeft} Kembali ke Daftar Supplier
          </button>
          <div class="breadcrumbs" style="margin: 0;">
            <a href="#/dashboard">Beranda</a>
            <span class="breadcrumb-separator">/</span>
            <a href="#/supplier" id="link-breadcrumb-supplier">Supplier</a>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-item active">${supplier.businessName}</span>
          </div>
        </div>

        <!-- Hero Card Profil Supplier -->
        <div class="supplier-hero-card">
          <div class="supplier-hero-profile">
            <div class="supplier-hero-avatar">
              ${supplier.avatarInitial || supplier.businessName.substring(0, 2).toUpperCase()}
            </div>
            <div class="supplier-hero-meta">
              <h1>
                ${supplier.businessName}
                ${supplier.isVerified ? `<span style="font-size: 1.25rem; vertical-align: middle;" title="Mitra Desa Terverifikasi">${Icons.checkCircle}</span>` : ''}
              </h1>
              <div style="font-size: 0.95rem; opacity: 0.9; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span>👤 Pemilik: <strong>${supplier.ownerName}</strong></span>
                <span>•</span>
                <span>${Icons.mapPin} ${supplier.location || supplier.regency}</span>
                <span>•</span>
                <span>Mitra sejak: ${supplier.joinDate || '2025'}</span>
              </div>

              <div class="supplier-hero-badges">
                <span class="supplier-hero-badge">
                  🏷️ ${supplier.businessType}
                </span>
                <span class="supplier-hero-badge" style="background: rgba(245, 158, 11, 0.35); color: #fff;">
                  ⭐ Rating: ${supplier.rating} / 5.0 (${supplier.reviewCount || 90} Ulasan)
                </span>
                <span class="supplier-hero-badge">
                  📦 Kapasitas: ${supplier.capacity || '25 Ton / Bulan'}
                </span>
                <span class="supplier-hero-badge" style="background: rgba(16, 185, 129, 0.35);">
                  ✅ ${supplier.verificationBadge || 'UMKM Mandiri Desa Terverifikasi'}
                </span>
              </div>
            </div>
          </div>

          <div class="supplier-hero-actions">
            <button class="btn btn-secondary btn-sm" id="btn-hero-chat" data-id="${supplier.id}" style="background: rgba(255,255,255,0.9); color: var(--color-primary-dark); font-weight: 700;">
              ${Icons.chat} Chat Supplier
            </button>
            <button class="btn btn-accent btn-sm" id="btn-hero-order" data-id="${supplier.id}" style="font-weight: 700;">
              ${Icons.pesanan} Pesan Komoditas
            </button>
          </div>
        </div>

        <!-- Detail 2-Column Grid Layout -->
        <div class="supplier-detail-grid">
          <!-- Left Column: Deskripsi & Daftar Produk yang Dijual -->
          <div>
            <!-- Deskripsi UMKM -->
            <div class="supplier-detail-section">
              <h2 class="supplier-section-heading">
                <span>Deskripsi & Profil Usaha</span>
                <span class="badge badge-primary">${supplier.businessType}</span>
              </h2>
              <p style="font-size: 0.95rem; color: var(--text-main); line-height: 1.7; margin-bottom: 1.25rem;">
                ${supplier.description}
              </p>

              <div style="background: var(--bg-app); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 1.25rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                <div>
                  <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 0.2rem;">Kapasitas Pasokan</span>
                  <strong style="color: var(--color-primary-dark); font-size: 1.05rem;">${supplier.capacity || '25 Ton / Bulan'}</strong>
                </div>
                <div>
                  <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 0.2rem;">Total Transaksi Sukses</span>
                  <strong style="color: var(--text-main); font-size: 1.05rem;">${supplier.transactionCount || 150}+ Pesanan B2B</strong>
                </div>
                <div>
                  <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 0.2rem;">Kategori Spesialisasi</span>
                  <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.2rem;">
                    ${supplier.categories.map(c => `<span class="badge badge-primary" style="font-size: 0.7rem;">${c}</span>`).join('')}
                  </div>
                </div>
              </div>
            </div>

            <!-- Produk yang Dijual oleh Supplier (Beserta Harga & Minimum Order) -->
            <div class="supplier-detail-section">
              <h2 class="supplier-section-heading">
                <span>Katalog Produk yang Dijual (${products.length})</span>
                <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">Siap pasok partai grosir B2B</span>
              </h2>

              ${products.length === 0 ? `
                <div style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
                  <div style="font-size: 2rem; margin-bottom: 0.5rem;">📦</div>
                  <p>Supplier ini sedang memperbarui daftar komoditas panen terbaru.</p>
                </div>
              ` : `
                <div class="supplier-products-list">
                  ${products.map(p => `
                    <div class="supplier-prod-item-card">
                      <img 
                        src="${p.imageUrl}" 
                        alt="${p.name}" 
                        class="supplier-prod-thumb"
                        onerror="this.src='https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'"
                      />
                      
                      <div class="supplier-prod-meta">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                          <span class="badge badge-primary" style="font-size: 0.68rem;">${p.category}</span>
                          ${p.harvestGrade ? `<span class="badge badge-accent" style="font-size: 0.68rem;">${p.harvestGrade}</span>` : ''}
                        </div>
                        <h3 class="supplier-prod-title">${p.name}</h3>
                        
                        <div class="supplier-prod-price-tag">
                          <span style="font-size: 0.85rem; font-weight: 700; color: var(--color-primary-dark);">Rp</span>
                          <span style="font-size: 1.25rem; font-weight: 800; color: var(--color-primary-dark);">${SupplierModule.formatNum(p.price)}</span>
                          <span style="font-size: 0.8rem; color: var(--text-muted);">/ ${p.unit}</span>
                        </div>

                        <div class="supplier-prod-specs">
                          <span style="background: #f1f5f9; padding: 0.2rem 0.5rem; border-radius: 4px;">
                            ${Icons.truck} <strong>Min. Order:</strong> ${SupplierModule.formatNum(p.minOrder)} ${p.unit}
                          </span>
                          <span style="background: #f1f5f9; padding: 0.2rem 0.5rem; border-radius: 4px;">
                            ${Icons.stok} <strong>Stok Tersedia:</strong> ${SupplierModule.formatNum(p.stock)} ${p.unit}
                          </span>
                        </div>
                      </div>

                      <div style="display: flex; flex-direction: column; gap: 0.5rem; justify-content: center;">
                        <button class="btn btn-primary btn-sm btn-order-this-product" data-supplier-id="${supplier.id}" data-product-id="${p.id}">
                          ${Icons.pesanan} Pesan Produk
                        </button>
                        <a href="#/produk" class="btn btn-secondary btn-sm" style="text-align: center;">
                          ${Icons.eye} Detail Produk
                        </a>
                      </div>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
          </div>

          <!-- Right Column: Informasi Kontak & Legalitas -->
          <div>
            <!-- Informasi Kontak -->
            <div class="supplier-detail-section">
              <h2 class="supplier-section-heading">
                <span>Informasi Kontak Langsung</span>
              </h2>

              <div class="supplier-contact-info-list">
                <div class="supplier-contact-item">
                  <div class="supplier-contact-icon">${Icons.phone}</div>
                  <div>
                    <div class="supplier-contact-label">Nomor WhatsApp / Telepon</div>
                    <div class="supplier-contact-val">
                      <a href="https://wa.me/62${supplier.phone.replace(/^0/, '')}?text=Halo%20${encodeURIComponent(supplier.businessName)},%20saya%20menghubungi%20Anda%20melalui%20platform%20DesaBiz%20AI." target="_blank" style="color: var(--color-primary); text-decoration: underline; font-weight: 700;">
                        ${supplier.phone} ${Icons.externalLink}
                      </a>
                    </div>
                  </div>
                </div>

                <div class="supplier-contact-item">
                  <div class="supplier-contact-icon">${Icons.mail}</div>
                  <div>
                    <div class="supplier-contact-label">Alamat Email Resmi</div>
                    <div class="supplier-contact-val">
                      <a href="mailto:${supplier.email}" style="color: var(--text-main);">
                        ${supplier.email}
                      </a>
                    </div>
                  </div>
                </div>

                <div class="supplier-contact-item">
                  <div class="supplier-contact-icon">${Icons.mapPin}</div>
                  <div>
                    <div class="supplier-contact-label">Alamat Kantor / Gudang Sentra</div>
                    <div class="supplier-contact-val">
                      ${supplier.address || supplier.location}
                    </div>
                  </div>
                </div>

                <div class="supplier-contact-item">
                  <div class="supplier-contact-icon">${Icons.shieldCheck}</div>
                  <div>
                    <div class="supplier-contact-label">Status Verifikasi & Sertifikasi</div>
                    <div class="supplier-contact-val" style="color: var(--color-success); font-weight: 700;">
                      ${supplier.verificationBadge}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
                <button class="btn btn-primary btn-sm" id="btn-sidebar-chat" data-id="${supplier.id}" style="width: 100%;">
                  ${Icons.chat} Kirim Pesan / Mulai Chat
                </button>
                <button class="btn btn-accent btn-sm" id="btn-sidebar-order" data-id="${supplier.id}" style="width: 100%;">
                  ${Icons.pesanan} Buat Pesanan B2B
                </button>
              </div>
            </div>

            <!-- Jaminan Keamanan B2B DesaBiz -->
            <div class="card" style="background: #f0fdfa; border-color: rgba(20, 184, 166, 0.3);">
              <div style="font-weight: 700; color: var(--color-primary-dark); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
                ${Icons.shieldCheck} Transaksi B2B Tanpa Perantara
              </div>
              <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; margin: 0;">
                DesaBiz AI menghubungkan UMKM pembeli langsung dengan produsen utama pedesaan. Anda dapat menegosiasikan volume, jadwal pengiriman, dan ketentuan pembayaran secara langsung dan transparan.
              </p>
            </div>
          </div>
        </div>

        <!-- Modals Slot -->
        <div id="supplier-modal-slot"></div>
      </div>
    `;

    SupplierModule.attachDetailEvents(container, supplier);
  },

  // ==========================================
  // MODAL 1: CHAT SIMULATOR MODAL
  // ==========================================
  renderChatModal: (supplier) => {
    return `
      <div class="db-modal-overlay" id="modal-chat-overlay">
        <div class="db-modal" style="max-width: 500px;" role="dialog" aria-modal="true">
          <div class="db-modal-header">
            <div class="db-modal-title">
              ${Icons.chat} Obrolan dengan ${supplier.businessName}
            </div>
            <button type="button" class="db-modal-close-btn" id="btn-close-chat-modal">
              ${Icons.x}
            </button>
          </div>

          <div class="db-modal-body">
            <div style="background: var(--bg-app); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.75rem;">
              <div class="supplier-avatar-mini" style="background: var(--color-primary); color: #fff; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700;">
                ${supplier.avatarInitial || 'UM'}
              </div>
              <div>
                <strong style="font-size: 0.875rem; color: var(--text-main); display: block;">${supplier.businessName}</strong>
                <span style="font-size: 0.75rem; color: var(--color-success); font-weight: 600;">● Online • Respon cepat</span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="chat-message-input">Pesan Anda:</label>
              <textarea 
                class="form-control" 
                id="chat-message-input" 
                rows="4" 
                placeholder="Halo ${supplier.businessName}, saya ingin menanyakan ketersediaan pasokan dan jadwal pengiriman..."
              >Halo ${supplier.businessName}, saya tertarik untuk memesan komoditas dari UMKM Anda melalui DesaBiz AI. Apakah stok pasokan masih tersedia?</textarea>
            </div>
          </div>

          <div class="db-modal-footer">
            <a 
              href="https://wa.me/62${supplier.phone.replace(/^0/, '')}?text=Halo%20${encodeURIComponent(supplier.businessName)},%20saya%20tertarik%20dengan%20produk%20Anda%20di%20DesaBiz%20AI." 
              target="_blank" 
              class="btn btn-secondary btn-sm"
            >
              ${Icons.phone} Chat via WhatsApp
            </a>
            <button type="button" class="btn btn-primary btn-sm" id="btn-send-internal-chat">
              ${Icons.chat} Kirim Pesan
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ==========================================
  // MODAL 2: B2B ORDER MODAL DIRECT TO SUPPLIER
  // ==========================================
  renderOrderModal: (supplier, preselectedProductId = null) => {
    const products = supplier.products || [];
    const activeProd = products.find(p => p.id === preselectedProductId) || products[0] || null;
    const initialQty = activeProd ? activeProd.minOrder : 100;
    const initialPrice = activeProd ? activeProd.price : 0;
    const initialUnit = activeProd ? activeProd.unit : 'Kg';
    const estTotal = initialQty * initialPrice;

    return `
      <div class="db-modal-overlay" id="modal-order-overlay">
        <div class="db-modal" style="max-width: 560px;" role="dialog" aria-modal="true">
          <div class="db-modal-header">
            <div class="db-modal-title">
              ${Icons.pesanan} Buat Pesanan Pasokan ke ${supplier.businessName}
            </div>
            <button type="button" class="db-modal-close-btn" id="btn-close-order-modal">
              ${Icons.x}
            </button>
          </div>

          <div class="db-modal-body">
            <div class="form-group">
              <label class="form-label" for="order-product-select">Pilih Komoditas Produk:</label>
              ${products.length === 0 ? `
                <input type="text" class="form-control" value="${supplier.featuredProducts ? supplier.featuredProducts[0] : 'Komoditas Umum'}" readonly />
              ` : `
                <select class="form-control" id="order-product-select">
                  ${products.map(p => `
                    <option value="${p.id}" ${activeProd && activeProd.id === p.id ? 'selected' : ''} data-price="${p.price}" data-unit="${p.unit}" data-min="${p.minOrder}">
                      ${p.name} — Rp ${SupplierModule.formatNum(p.price)} / ${p.unit} (Min. ${SupplierModule.formatNum(p.minOrder)} ${p.unit})
                    </option>
                  `).join('')}
                </select>
              `}
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="order-qty-input">
                  Jumlah Pasokan (<span id="order-unit-label">${initialUnit}</span>) *
                </label>
                <input 
                  type="number" 
                  class="form-control" 
                  id="order-qty-input" 
                  min="${activeProd ? activeProd.minOrder : 1}" 
                  value="${initialQty}" 
                />
                <span style="font-size: 0.725rem; color: var(--text-muted); margin-top: 0.25rem; display: block;">
                  Batas minimum order (MOQ): <strong id="order-moq-label">${activeProd ? activeProd.minOrder : 1} ${initialUnit}</strong>
                </span>
              </div>

              <div class="form-group">
                <label class="form-label">Estimasi Total Harga:</label>
                <div style="background: var(--bg-app); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 0.65rem 0.85rem; font-size: 1.25rem; font-weight: 800; color: var(--color-primary-dark);" id="order-total-display">
                  Rp ${SupplierModule.formatNum(estTotal)}
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="order-notes-input">Catatan Tambahan / Spesifikasi Pengiriman:</label>
              <textarea class="form-control" id="order-notes-input" rows="2" placeholder="Cantumkan ketentuan pengemasan atau target tanggal kirim..."></textarea>
            </div>

            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-md); padding: 0.75rem; font-size: 0.75rem; color: #92400e;">
              ℹ️ Permintaan pesanan partai grosir ini akan diteruskan ke supplier untuk kesepakatan logistik. Tanpa biaya perantara dan tanpa pembayaran online.
            </div>
          </div>

          <div class="db-modal-footer">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-order-modal">
              Batal
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="btn-submit-b2b-order">
              ${Icons.pesanan} Konfirmasi & Ajukan Pesanan
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ==========================================
  // EVENT LISTENERS: LIST VIEW
  // ==========================================
  attachListEvents: (container) => {
    // 1. Search input
    const searchInput = container.querySelector('#supplier-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        SupplierModule.searchQuery = e.target.value;
        SupplierModule.renderListView(container);
      });
    }

    // 2. Filter Category
    const catSelect = container.querySelector('#supplier-filter-category');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        SupplierModule.selectedCategory = e.target.value;
        SupplierModule.renderListView(container);
      });
    }

    // 3. Filter Location
    const locSelect = container.querySelector('#supplier-filter-location');
    if (locSelect) {
      locSelect.addEventListener('change', (e) => {
        SupplierModule.selectedLocation = e.target.value;
        SupplierModule.renderListView(container);
      });
    }

    // 4. Filter Business Type Dropdown
    const typeSelect = container.querySelector('#supplier-filter-type');
    if (typeSelect) {
      typeSelect.addEventListener('change', (e) => {
        SupplierModule.selectedBusinessType = e.target.value;
        SupplierModule.renderListView(container);
      });
    }

    // 5. Quick chips for business type
    const chips = container.querySelectorAll('.category-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        SupplierModule.selectedBusinessType = chip.dataset.type;
        SupplierModule.renderListView(container);
      });
    });

    // 6. Checkbox Only Verified
    const verifiedCheck = container.querySelector('#check-only-verified');
    if (verifiedCheck) {
      verifiedCheck.addEventListener('change', (e) => {
        SupplierModule.onlyVerified = e.target.checked;
        SupplierModule.renderListView(container);
      });
    }

    // 7. Reset filters
    const resetBtn = container.querySelector('#btn-reset-supplier-filter');
    const emptyResetBtn = container.querySelector('#btn-empty-reset-supplier');
    [resetBtn, emptyResetBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          SupplierModule.searchQuery = '';
          SupplierModule.selectedCategory = 'all';
          SupplierModule.selectedLocation = 'all';
          SupplierModule.selectedBusinessType = 'all';
          SupplierModule.onlyVerified = false;
          SupplierModule.renderListView(container);
        });
      }
    });

    // 8. Card actions: Detail, Chat, Order
    container.addEventListener('click', (e) => {
      // Detail button
      const detailBtn = e.target.closest('.btn-view-supplier-detail');
      if (detailBtn) {
        const id = detailBtn.dataset.id;
        SupplierModule.currentView = 'detail';
        SupplierModule.selectedSupplierId = id;
        window.location.hash = `#/supplier?id=${id}`;
        SupplierModule.render(container);
        return;
      }

      // Quick Chat button
      const chatBtn = e.target.closest('.btn-quick-chat');
      if (chatBtn) {
        const id = chatBtn.dataset.id;
        const supplier = appState.getSupplierById(id);
        if (supplier) {
          window.location.hash = `#/chat?partnerId=${supplier.sellerId || supplier.id}`;
        }
        return;
      }

      // Quick Order button
      const orderBtn = e.target.closest('.btn-quick-order-supplier');
      if (orderBtn) {
        const id = orderBtn.dataset.id;
        const supplier = appState.getSupplierById(id);
        if (supplier) {
          SupplierModule.openOrderModal(supplier);
        }
        return;
      }
    });
  },

  // ==========================================
  // EVENT LISTENERS: DETAIL VIEW
  // ==========================================
  attachDetailEvents: (container, supplier) => {
    // Back to list
    const backBtn = container.querySelector('#btn-back-to-suppliers');
    const breadcrumbLink = container.querySelector('#link-breadcrumb-supplier');
    [backBtn, breadcrumbLink].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          SupplierModule.currentView = 'list';
          SupplierModule.selectedSupplierId = null;
          window.location.hash = '#/supplier';
          SupplierModule.render(container);
        });
      }
    });

    // Chat Buttons (Hero and Sidebar)
    const heroChat = container.querySelector('#btn-hero-chat');
    const sidebarChat = container.querySelector('#btn-sidebar-chat');
    [heroChat, sidebarChat].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          window.location.hash = `#/chat?partnerId=${supplier.sellerId || supplier.id}`;
        });
      }
    });

    // Order Buttons (Hero, Sidebar, and individual products)
    const heroOrder = container.querySelector('#btn-hero-order');
    const sidebarOrder = container.querySelector('#btn-sidebar-order');
    [heroOrder, sidebarOrder].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          SupplierModule.openOrderModal(supplier);
        });
      }
    });

    const prodOrderBtns = container.querySelectorAll('.btn-order-this-product');
    prodOrderBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const prodId = btn.dataset.productId;
        SupplierModule.openOrderModal(supplier, prodId);
      });
    });
  },

  // ==========================================
  // MODALS LOGIC
  // ==========================================
  openChatModal: (supplier) => {
    const slot = document.getElementById('supplier-modal-slot');
    if (!slot) return;

    slot.innerHTML = SupplierModule.renderChatModal(supplier);

    const overlay = slot.querySelector('#modal-chat-overlay');
    const closeBtn = slot.querySelector('#btn-close-chat-modal');
    const sendBtn = slot.querySelector('#btn-send-internal-chat');
    const input = slot.querySelector('#chat-message-input');

    const closeModal = () => {
      slot.innerHTML = '';
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        const msg = input ? input.value.trim() : '';
        if (!msg) {
          alert('Silakan tulis pesan terlebih dahulu.');
          return;
        }

        closeModal();
        SupplierModule.showToast(`Pesan terkirim ke ${supplier.businessName}! Anda dapat melanjutkan percakapan di menu Chat.`);
      });
    }
  },

  openOrderModal: (supplier, preselectedProductId = null) => {
    const slot = document.getElementById('supplier-modal-slot');
    if (!slot) return;

    slot.innerHTML = SupplierModule.renderOrderModal(supplier, preselectedProductId);

    const overlay = slot.querySelector('#modal-order-overlay');
    const closeBtn = slot.querySelector('#btn-close-order-modal');
    const cancelBtn = slot.querySelector('#btn-cancel-order-modal');
    const submitBtn = slot.querySelector('#btn-submit-b2b-order');
    const prodSelect = slot.querySelector('#order-product-select');
    const qtyInput = slot.querySelector('#order-qty-input');
    const totalDisplay = slot.querySelector('#order-total-display');
    const unitLabel = slot.querySelector('#order-unit-label');
    const moqLabel = slot.querySelector('#order-moq-label');

    const closeModal = () => {
      slot.innerHTML = '';
    };

    [closeBtn, cancelBtn].forEach(btn => {
      if (btn) btn.addEventListener('click', closeModal);
    });

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });
    }

    const updateTotal = () => {
      if (!prodSelect || !qtyInput) return;
      const selectedOption = prodSelect.options[prodSelect.selectedIndex];
      if (!selectedOption) return;

      const price = Number(selectedOption.dataset.price) || 0;
      const unit = selectedOption.dataset.unit || 'Kg';
      const minMoq = Number(selectedOption.dataset.min) || 1;
      const qty = Number(qtyInput.value) || minMoq;

      if (unitLabel) unitLabel.innerText = unit;
      if (moqLabel) moqLabel.innerText = `${minMoq} ${unit}`;
      if (totalDisplay) totalDisplay.innerText = `Rp ${SupplierModule.formatNum(qty * price)}`;
    };

    if (prodSelect) {
      prodSelect.addEventListener('change', () => {
        const selectedOption = prodSelect.options[prodSelect.selectedIndex];
        if (selectedOption && qtyInput) {
          const minMoq = Number(selectedOption.dataset.min) || 1;
          qtyInput.min = minMoq;
          if (Number(qtyInput.value) < minMoq) {
            qtyInput.value = minMoq;
          }
        }
        updateTotal();
      });
    }

    if (qtyInput) {
      qtyInput.addEventListener('input', updateTotal);
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const selectedOption = prodSelect ? prodSelect.options[prodSelect.selectedIndex] : null;
        const prodId = selectedOption ? selectedOption.value : null;

        closeModal();
        if (prodId) {
          window.location.hash = `#/pesanan-buat?productId=${prodId}`;
        } else {
          window.location.hash = '#/pesanan-buat';
        }
      });
    }
  },

  // ==========================================
  // UTILITIES
  // ==========================================
  formatNum: (num) => {
    if (num === null || num === undefined) return '0';
    return new Intl.NumberFormat('id-ID').format(num);
  },

  showToast: (message) => {
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
      <span style="color: var(--color-primary);">${Icons.checkCircle}</span>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};
