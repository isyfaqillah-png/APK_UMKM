// DesaBiz AI - Modul Produk & Marketplace B2B
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

const UNITS = ['Kg', 'Ton', 'Karung (50kg)', 'Liter', 'Kuintal', 'Dus'];

const HARVEST_GRADES = [
  'Grade A Super',
  'Organik Bersertifikat',
  'Grade 1 Specialty',
  'Super Murni 100%',
  'Standar Pabrik SNI',
  'Grade Premium'
];

const PHOTO_PRESETS = [
  { name: 'Beras', url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80' },
  { name: 'Kopi', url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80' },
  { name: 'Gula Aren', url: 'https://images.unsplash.com/photo-1607672632458-9eb56696346b?auto=format&fit=crop&w=600&q=80' },
  { name: 'Cabai', url: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=600&q=80' },
  { name: 'Jagung', url: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80' },
  { name: 'Pupuk Kompos', url: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&w=600&q=80' },
  { name: 'Bawang', url: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80' },
  { name: 'Ikan Air Tawar', url: 'https://images.unsplash.com/photo-1534043464124-3be32fe000c9?auto=format&fit=crop&w=600&q=80' }
];

export const ProdukModule = {
  id: 'produk',
  title: 'Katalog & Marketplace B2B',
  subtitle: 'Pusat perdagangan komoditas unggulan UMKM & kelompok tani pedesaan',

  // Local component state
  activeTab: 'marketplace', // 'marketplace' | 'my-products'
  searchQuery: '',
  selectedCategory: 'all',
  selectedLocation: 'all',
  detailProductId: null,
  isAddModalOpen: false,
  editingProduct: null,
  deleteTargetId: null,
  selectedPresetUrl: PHOTO_PRESETS[0].url,
  orderSimQty: 0,

  render: (container) => {
    const state = appState.getState();
    const user = state.user;
    const isSeller = user && user.role === 'seller';

    // Auto default tab to my-products if role is seller and first load
    if (isSeller && ProdukModule.activeTab === 'marketplace' && !ProdukModule._tabUserChosen) {
      ProdukModule.activeTab = 'my-products';
    }

    const allProducts = appState.getProducts();
    const myProducts = appState.getMyProducts(user ? user.id : 'usr_01');

    // Extract unique regencies for location filter
    const uniqueLocations = [...new Set(allProducts.map(p => p.regency || p.location).filter(Boolean))];

    // Filter products for Marketplace view
    const filteredProducts = allProducts.filter(product => {
      const q = ProdukModule.searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        product.name.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q) ||
        product.sellerName.toLowerCase().includes(q) ||
        (product.description && product.description.toLowerCase().includes(q)) ||
        (product.location && product.location.toLowerCase().includes(q));

      const matchCategory = ProdukModule.selectedCategory === 'all' || product.category === ProdukModule.selectedCategory;
      const matchLocation = ProdukModule.selectedLocation === 'all' || 
        product.regency === ProdukModule.selectedLocation || 
        product.location.includes(ProdukModule.selectedLocation);

      return matchQuery && matchCategory && matchLocation;
    });

    container.innerHTML = `
      <div class="fade-in">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header-info">
            <div class="breadcrumbs">
              <a href="#/dashboard">Beranda</a>
              <span class="breadcrumb-separator">/</span>
              <span class="breadcrumb-item active">Produk & Marketplace</span>
            </div>
            <h1 class="page-title">${ProdukModule.title}</h1>
            <p class="page-subtitle">${ProdukModule.subtitle}</p>
          </div>
          <div class="page-header-actions flex gap-2">
            <a href="#/stok" class="btn btn-secondary btn-sm" title="Pantau Stok & Inventaris">
              ${Icons.stok} Stok Gudang
            </a>
            <button class="btn btn-secondary btn-sm" id="btn-quick-switch-tab">
              ${ProdukModule.activeTab === 'marketplace' ? `${Icons.box} Kelola Produk Saya` : `${Icons.store} Jelajah Marketplace`}
            </button>
            <button class="btn btn-primary btn-sm" id="btn-tambah-penawaran-header">
              ${Icons.plus} Tambah Produk Baru
            </button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="marketplace-tabs">
          <button 
            type="button" 
            class="marketplace-tab-btn ${ProdukModule.activeTab === 'marketplace' ? 'active' : ''}" 
            id="tab-btn-marketplace"
          >
            ${Icons.store} Jelajah Marketplace B2B 
            <span class="tab-badge">${allProducts.length}</span>
          </button>
          <button 
            type="button" 
            class="marketplace-tab-btn ${ProdukModule.activeTab === 'my-products' ? 'active' : ''}" 
            id="tab-btn-my-products"
          >
            ${Icons.box} Produk Saya (Penjual) 
            <span class="tab-badge">${myProducts.length}</span>
          </button>
        </div>

        <!-- View Content Router -->
        <div id="marketplace-view-content">
          ${ProdukModule.activeTab === 'marketplace' 
            ? ProdukModule.renderMarketplaceView(filteredProducts, uniqueLocations, allProducts.length)
            : ProdukModule.renderMyProductsView(myProducts)
          }
        </div>

        <!-- Dynamic Modals Container -->
        <div id="modal-slot"></div>
      </div>
    `;

    // Attach Event Listeners
    ProdukModule.attachEvents(container);

    // Re-render any active modals
    ProdukModule.renderModals();
  },

  // ==========================================
  // VIEW: 1. JELAJAH MARKETPLACE B2B (PEMBELI)
  // ==========================================
  renderMarketplaceView: (filteredProducts, uniqueLocations, totalCount) => {
    const isFiltered = ProdukModule.searchQuery || ProdukModule.selectedCategory !== 'all' || ProdukModule.selectedLocation !== 'all';

    return `
      <!-- Marketplace Filter & Search Toolbar -->
      <div class="marketplace-toolbar">
        <div class="toolbar-search-row">
          <div class="toolbar-search-box">
            <span class="toolbar-search-icon">${Icons.search}</span>
            <input 
              type="text" 
              class="toolbar-search-input" 
              id="marketplace-search-input" 
              placeholder="Cari nama komoditas, beras, kopi, cabai, supplier desa..." 
              value="${ProdukModule.searchQuery}"
            />
          </div>

          <select class="toolbar-select" id="filter-category-select">
            <option value="all" ${ProdukModule.selectedCategory === 'all' ? 'selected' : ''}>Semua Kategori Komoditas</option>
            ${appState.getCategories().map(c => `<option value="${c}" ${ProdukModule.selectedCategory === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>

          <select class="toolbar-select" id="filter-location-select">
            <option value="all" ${ProdukModule.selectedLocation === 'all' ? 'selected' : ''}>Semua Lokasi Asal</option>
            ${uniqueLocations.map(loc => `<option value="${loc}" ${ProdukModule.selectedLocation === loc ? 'selected' : ''}>${loc}</option>`).join('')}
          </select>

          ${isFiltered ? `
            <button class="btn btn-secondary btn-sm" id="btn-reset-filters" title="Reset Semua Filter">
              ${Icons.refresh} Reset
            </button>
          ` : ''}
        </div>

        <!-- Quick Filter Pills -->
        <div class="category-chips-wrap">
          <button 
            type="button" 
            class="category-chip ${ProdukModule.selectedCategory === 'all' ? 'active' : ''}" 
            data-category="all"
          >
            Semua Komoditas
          </button>
          ${appState.getCategories().map(cat => `
            <button 
              type="button" 
              class="category-chip ${ProdukModule.selectedCategory === cat ? 'active' : ''}" 
              data-category="${cat}"
            >
              ${cat}
            </button>
          `).join('')}
        </div>

        <div class="toolbar-results-bar">
          <div>
            Menampilkan <strong>${filteredProducts.length}</strong> dari total <strong>${totalCount}</strong> komoditas B2B aktif
          </div>
          ${isFiltered ? `
            <div style="font-size: 0.8rem; color: var(--color-primary); font-weight: 600;">
              Filter aktif: ${ProdukModule.selectedCategory !== 'all' ? `[${ProdukModule.selectedCategory}] ` : ''}${ProdukModule.selectedLocation !== 'all' ? `[${ProdukModule.selectedLocation}] ` : ''}${ProdukModule.searchQuery ? `"${ProdukModule.searchQuery}"` : ''}
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Products Grid -->
      ${filteredProducts.length === 0 ? `
        <div class="card" style="text-align: center; padding: 3.5rem 1.5rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🔍</div>
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">
            Tidak ada produk yang cocok dengan pencarian Anda
          </h3>
          <p style="color: var(--text-muted); font-size: 0.875rem; max-width: 480px; margin: 0 auto 1.25rem;">
            Coba gunakan kata kunci umum lainnya, pilih kategori berbeda, atau hapus filter lokasi.
          </p>
          <button class="btn btn-secondary btn-sm" id="btn-empty-reset">
            ${Icons.refresh} Bersihkan Filter Pencarian
          </button>
        </div>
      ` : `
        <div class="product-grid">
          ${filteredProducts.map(p => ProdukModule.renderProductCard(p)).join('')}
        </div>
      `}
    `;
  },

  // Single Product Card in Marketplace
  renderProductCard: (p) => {
    const currentUser = appState.getState().user;
    const isOwner = currentUser && p.sellerId === currentUser.id;
    const isLowStock = p.stock < 1000;

    return `
      <div class="b2b-product-card" data-id="${p.id}">
        <div class="product-img-wrapper">
          <img 
            src="${p.imageUrl}" 
            alt="${p.name}" 
            loading="lazy"
            onerror="this.src='https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'"
          />
          <div class="product-badge-overlay">
            <span class="product-moq-pill" title="Minimum Order Quantity (Partai Grosir)">
              ${Icons.truck} Min. ${ProdukModule.formatNum(p.minOrder)} ${p.unit}
            </span>
            ${p.harvestGrade ? `
              <span class="product-grade-pill">
                ${Icons.sparkle} ${p.harvestGrade}
              </span>
            ` : ''}
          </div>
        </div>

        <div class="product-card-body">
          <div class="product-category-row">
            <span class="product-cat-tag">${p.category}</span>
            <span class="product-date-tag">${p.createdAt || 'Baru'}</span>
          </div>

          <h3 class="product-name-title" title="${p.name}">${p.name}</h3>

          <!-- Supplier Information -->
          <div class="product-supplier-badge">
            <div class="supplier-avatar-mini">
              ${(p.sellerName || 'UM').charAt(0)}
            </div>
            <div class="supplier-info-text">
              <span class="supplier-name-line" title="${p.sellerName}">
                ${p.sellerName}
                ${p.sellerVerified ? `<span style="color: var(--color-primary);" title="Supplier Desa Terverifikasi">${Icons.checkCircle}</span>` : ''}
              </span>
              <span class="supplier-loc-line" title="${p.location || p.regency}">
                ${Icons.mapPin} ${p.regency || p.location || 'Jawa Barat'}
              </span>
            </div>
          </div>

          <!-- Price & Stock Section -->
          <div class="product-price-section">
            <div class="price-unit-block">
              <span class="price-currency">Rp</span>
              <span class="price-amount">${ProdukModule.formatNum(p.price)}</span>
              <span class="price-unit">/ ${p.unit}</span>
            </div>

            <div class="stock-indicator ${isLowStock ? 'low' : ''}" title="Ketersediaan stok panen di gudang supplier">
              ${isLowStock ? '⚠️ Stok Sisa:' : 'Stok:'} ${ProdukModule.formatNum(p.stock)} ${p.unit}
            </div>
          </div>
        </div>

        <div class="product-card-footer">
          <button class="btn btn-secondary btn-sm btn-view-detail" data-id="${p.id}">
            ${Icons.eye} Detail & Supplier
          </button>
          ${isOwner ? `
            <button class="btn btn-primary btn-sm btn-edit-product" data-id="${p.id}" title="Kelola Produk Saya">
              ${Icons.edit} Kelola
            </button>
          ` : `
            <button class="btn btn-primary btn-sm btn-quick-order" data-id="${p.id}">
              ${Icons.pesanan} Pesan B2B
            </button>
          `}
        </div>
      </div>
    `;
  },

  // ==========================================
  // VIEW: 2. PRODUK SAYA (PENJUAL)
  // ==========================================
  renderMyProductsView: (myProducts) => {
    const totalInventoryValue = myProducts.reduce((acc, p) => acc + (p.price * p.stock), 0);
    const lowStockCount = myProducts.filter(p => p.stock < 1000).length;

    return `
      <!-- Seller Inventory KPI Summary -->
      <div class="seller-stats-grid">
        <div class="seller-stat-card">
          <div class="seller-stat-icon" style="background: var(--color-primary-soft); color: var(--color-primary);">
            ${Icons.box}
          </div>
          <div class="seller-stat-info">
            <span class="seller-stat-value">${myProducts.length}</span>
            <span class="seller-stat-label">Komoditas Terdaftar</span>
          </div>
        </div>

        <div class="seller-stat-card">
          <div class="seller-stat-icon" style="background: var(--color-secondary-soft); color: var(--color-secondary);">
            ${Icons.transaksi}
          </div>
          <div class="seller-stat-info">
            <span class="seller-stat-value">Rp ${ProdukModule.formatNum(totalInventoryValue)}</span>
            <span class="seller-stat-label">Estimasi Nilai Stok</span>
          </div>
        </div>

        <div class="seller-stat-card">
          <div class="seller-stat-icon" style="background: ${lowStockCount > 0 ? '#fef2f2' : 'var(--color-success-soft)'}; color: ${lowStockCount > 0 ? 'var(--color-danger)' : 'var(--color-success)'};">
            ${Icons.stok}
          </div>
          <div class="seller-stat-info">
            <span class="seller-stat-value" style="color: ${lowStockCount > 0 ? 'var(--color-danger)' : 'inherit'};">${lowStockCount} Komoditas</span>
            <span class="seller-stat-label">${lowStockCount > 0 ? 'Perlu Restock Segera' : 'Semua Stok Aman'}</span>
          </div>
        </div>
      </div>

      <!-- Seller Products Management Table -->
      <div class="seller-table-container">
        <div class="seller-table-header">
          <div>
            <h2 class="seller-table-title">Daftar Komoditas UMKM Anda</h2>
            <p style="font-size: 0.825rem; color: var(--text-muted); margin-top: 0.2rem;">
              Atur harga penawaran grosir, kuota stok gudang, dan batas minimum order (MOQ) produk Anda.
            </p>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-tambah-produk-body">
            ${Icons.plus} Tambah Penawaran Baru
          </button>
        </div>

        ${myProducts.length === 0 ? `
          <div style="text-align: center; padding: 3rem 1.5rem;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📦</div>
            <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem;">
              Anda belum memiliki produk penawaran aktif
            </h3>
            <p style="color: var(--text-muted); font-size: 0.85rem; max-width: 440px; margin: 0 auto 1.25rem;">
              Mulai tawarkan komoditas panen atau produk olahan desa Anda ke ribuan pembeli B2B di DesaBiz AI.
            </p>
            <button class="btn btn-primary btn-sm" id="btn-tambah-pertama">
              ${Icons.plus} Tambah Komoditas Pertama Sekarang
            </button>
          </div>
        ` : `
          <div style="overflow-x: auto;">
            <table class="seller-product-table">
              <thead>
                <tr>
                  <th>Komoditas</th>
                  <th>Kategori & Mutu</th>
                  <th>Harga Satuan</th>
                  <th>Stok Tersedia</th>
                  <th>Minimum Order (MOQ)</th>
                  <th style="text-align: right;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${myProducts.map(p => {
                  const isLow = p.stock < 1000;
                  return `
                    <tr>
                      <td>
                        <div class="seller-product-cell">
                          <img 
                            src="${p.imageUrl}" 
                            alt="${p.name}" 
                            class="seller-thumb-img"
                            onerror="this.src='https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'"
                          />
                          <div>
                            <div class="seller-prod-title">${p.name}</div>
                            <div class="seller-prod-desc">${p.location || 'Desa Sukamaju'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="badge badge-primary">${p.category}</span>
                        ${p.harvestGrade ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">${p.harvestGrade}</div>` : ''}
                      </td>
                      <td>
                        <strong style="color: var(--color-primary-dark); font-size: 0.95rem;">
                          Rp ${ProdukModule.formatNum(p.price)}
                        </strong>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">/ ${p.unit}</span>
                      </td>
                      <td>
                        <div style="font-weight: 700; color: ${isLow ? 'var(--color-danger)' : 'var(--text-main)'};">
                          ${ProdukModule.formatNum(p.stock)} ${p.unit}
                        </div>
                        ${isLow ? `<span class="badge badge-accent" style="font-size: 0.65rem; margin-top: 0.2rem;">Menipis</span>` : ''}
                      </td>
                      <td>
                        <span class="badge badge-info">
                          ${Icons.truck} ${ProdukModule.formatNum(p.minOrder)} ${p.unit}
                        </span>
                      </td>
                      <td style="text-align: right;">
                        <div class="action-btn-group" style="justify-content: flex-end;">
                          <button class="action-icon-btn btn-view-detail" data-id="${p.id}" title="Lihat Tampilan Pembeli">
                            ${Icons.eye}
                          </button>
                          <button class="action-icon-btn btn-edit-product" data-id="${p.id}" title="Edit Data Komoditas">
                            ${Icons.edit}
                          </button>
                          <button class="action-icon-btn delete btn-delete-product" data-id="${p.id}" title="Hapus Produk">
                            ${Icons.trash}
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  },

  // ==========================================
  // MODALS: DETAIL, TAMBAH, EDIT, HAPUS
  // ==========================================
  renderModals: () => {
    const slot = document.getElementById('modal-slot');
    if (!slot) return;

    if (ProdukModule.detailProductId) {
      const product = appState.getProductById(ProdukModule.detailProductId);
      if (product) {
        slot.innerHTML = ProdukModule.renderDetailModal(product);
        ProdukModule.attachDetailModalEvents(slot, product);
        return;
      }
    }

    if (ProdukModule.isAddModalOpen) {
      slot.innerHTML = ProdukModule.renderFormModal(null);
      ProdukModule.attachFormModalEvents(slot, null);
      return;
    }

    if (ProdukModule.editingProduct) {
      slot.innerHTML = ProdukModule.renderFormModal(ProdukModule.editingProduct);
      ProdukModule.attachFormModalEvents(slot, ProdukModule.editingProduct);
      return;
    }

    if (ProdukModule.deleteTargetId) {
      const targetProduct = appState.getProductById(ProdukModule.deleteTargetId);
      slot.innerHTML = ProdukModule.renderDeleteConfirmModal(targetProduct);
      ProdukModule.attachDeleteModalEvents(slot);
      return;
    }

    slot.innerHTML = '';
  },

  // 1. Modal Detail Produk & Supplier
  renderDetailModal: (p) => {
    const defaultQty = Math.max(p.minOrder, ProdukModule.orderSimQty || p.minOrder);
    const estTotal = defaultQty * p.price;

    return `
      <div class="db-modal-overlay" id="modal-detail-overlay">
        <div class="db-modal db-modal-lg" role="dialog" aria-modal="true">
          <div class="db-modal-header">
            <div class="db-modal-title">
              ${Icons.store} Detail Komoditas & Supplier Desa
            </div>
            <button type="button" class="db-modal-close-btn" id="btn-close-detail-modal">
              ${Icons.x}
            </button>
          </div>

          <div class="db-modal-body">
            <div class="product-detail-layout">
              <!-- Left Column: Photo & Supplier Card -->
              <div>
                <div class="detail-img-box">
                  <img 
                    src="${p.imageUrl}" 
                    alt="${p.name}" 
                    onerror="this.src='https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'"
                  />
                  <div class="product-badge-overlay">
                    <span class="product-moq-pill">
                      ${Icons.truck} Minimum Order: ${ProdukModule.formatNum(p.minOrder)} ${p.unit}
                    </span>
                  </div>
                </div>

                <!-- Supplier Profile Box -->
                <div class="detail-supplier-card">
                  <div class="detail-supplier-header">
                    <div class="supplier-avatar-lg">
                      ${(p.sellerName || 'UM').charAt(0)}
                    </div>
                    <div>
                      <div style="font-weight: 800; font-size: 1rem; color: var(--text-main); display: flex; align-items: center; gap: 0.35rem;">
                        ${p.sellerName}
                        ${p.sellerVerified ? `<span style="color: var(--color-primary);">${Icons.checkCircle}</span>` : ''}
                      </div>
                      <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.25rem;">
                        ${Icons.mapPin} ${p.location || p.regency || 'Cianjur, Jawa Barat'}
                      </div>
                    </div>
                  </div>

                  <div style="font-size: 0.825rem; color: var(--text-muted); padding: 0.5rem 0; border-top: 1px solid var(--border-light); border-bottom: 1px solid var(--border-light);">
                    <div><strong>Status Mitra:</strong> UMKM Desa Terverifikasi</div>
                    <div style="margin-top: 0.25rem;"><strong>Kontak Langsung:</strong> ${p.sellerPhone || '081234567890'}</div>
                  </div>

                  <div style="display: flex; flex-direction: column; gap: 0.45rem; margin-top: 0.75rem;">
                    <a 
                      href="#/chat?partnerId=${p.sellerId}&productId=${p.id}" 
                      class="btn btn-primary btn-sm btn-inapp-chat" 
                      id="btn-chat-product-supplier"
                      style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.35rem;"
                    >
                      ${Icons.chat} Chat Supplier Langsung
                    </a>
                    <a 
                      href="https://wa.me/62${(p.sellerPhone || '81234567890').replace(/^0/, '')}?text=Halo%20${encodeURIComponent(p.sellerName)},%20saya%20tertarik%20dengan%20produk%20${encodeURIComponent(p.name)}%20di%20DesaBiz%20AI." 
                      target="_blank" 
                      class="btn btn-secondary btn-sm" 
                      style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.35rem;"
                    >
                      ${Icons.phone} Chat WhatsApp
                    </a>
                  </div>
                </div>
              </div>

              <!-- Right Column: Specs, Desc & B2B Order Sim -->
              <div>
                <span class="badge badge-primary" style="margin-bottom: 0.5rem;">${p.category}</span>
                <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-main); line-height: 1.3; margin-bottom: 0.5rem;">
                  ${p.name}
                </h2>

                <div class="detail-price-box">
                  <span style="font-size: 0.775rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700;">
                    Harga Pasokan Partai Grosir B2B
                  </span>
                  <div style="display: flex; align-items: baseline; gap: 0.4rem;">
                    <span style="font-size: 1.1rem; font-weight: 700; color: var(--color-primary-dark);">Rp</span>
                    <span style="font-size: 2rem; font-weight: 800; color: var(--color-primary-dark); line-height: 1;">
                      ${ProdukModule.formatNum(p.price)}
                    </span>
                    <span style="font-size: 0.95rem; font-weight: 600; color: var(--text-muted);">/ ${p.unit}</span>
                  </div>
                </div>

                <div class="detail-specs-list">
                  <div class="spec-cell">
                    <span class="spec-cell-label">Minimum Order (MOQ)</span>
                    <span class="spec-cell-value">${ProdukModule.formatNum(p.minOrder)} ${p.unit}</span>
                  </div>
                  <div class="spec-cell">
                    <span class="spec-cell-label">Stok Tersedia</span>
                    <span class="spec-cell-value">${ProdukModule.formatNum(p.stock)} ${p.unit}</span>
                  </div>
                  <div class="spec-cell">
                    <span class="spec-cell-label">Mutu / Grade Panen</span>
                    <span class="spec-cell-value">${p.harvestGrade || 'Grade A Super'}</span>
                  </div>
                  <div class="spec-cell">
                    <span class="spec-cell-label">Asal Komoditas</span>
                    <span class="spec-cell-value">${p.regency || 'Jawa Barat'}</span>
                  </div>
                </div>

                <div style="margin-bottom: 1.5rem;">
                  <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.35rem;">
                    Deskripsi & Standar Mutu Komoditas:
                  </h4>
                  <p style="font-size: 0.875rem; color: var(--text-muted); line-height: 1.6; margin: 0;">
                    ${p.description}
                  </p>
                </div>

                <!-- B2B Order Simulator (No Online Payment) -->
                <div class="order-calculator-box">
                  <div style="font-weight: 700; font-size: 0.9rem; color: #92400e; display: flex; align-items: center; gap: 0.4rem;">
                    ${Icons.sparkle} Simulasi Pemesanan Pasokan Grosir
                  </div>
                  
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="flex: 1;">
                      <label style="font-size: 0.75rem; font-weight: 700; color: #78350f; display: block; margin-bottom: 0.25rem;">
                        Jumlah Pasokan (${p.unit}):
                      </label>
                      <input 
                        type="number" 
                        class="form-control" 
                        id="input-sim-qty" 
                        min="${p.minOrder}" 
                        max="${p.stock}" 
                        value="${defaultQty}"
                        style="padding: 0.45rem 0.75rem; background: #ffffff;"
                      />
                    </div>
                    <div style="flex: 1.3; text-align: right;">
                      <span style="font-size: 0.75rem; color: #78350f; display: block;">Estimasi Total:</span>
                      <strong id="sim-total-display" style="font-size: 1.25rem; color: var(--color-primary-dark); font-weight: 800;">
                        Rp ${ProdukModule.formatNum(estTotal)}
                      </strong>
                    </div>
                  </div>

                  <div style="display: flex; gap: 0.5rem; width: 100%;">
                    <button class="btn btn-primary btn-sm flex-1" id="btn-submit-order-sim">
                      ${Icons.pesanan} Buat Pesanan PO
                    </button>
                    <button class="btn btn-secondary btn-sm" id="btn-negotiate-sim" style="color: #d97706; border-color: #fde68a; background: #fffbeb;">
                      ${Icons.negosiasi} Tawar Harga
                    </button>
                  </div>
                  <span style="font-size: 0.725rem; color: #78350f; text-align: center;">
                    *Transaksi B2B langsung tanpa biaya gerbang pembayaran online.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="db-modal-footer">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-close-detail-footer">
              Tutup
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // 2. Modal Form: Tambah / Edit Produk
  renderFormModal: (editingProduct) => {
    const isEdit = Boolean(editingProduct);
    const state = appState.getState();
    const user = state.user;

    const initialData = editingProduct || {
      name: '',
      category: 'Pertanian & Beras',
      description: '',
      price: '',
      unit: 'Kg',
      stock: '',
      minOrder: '',
      harvestGrade: 'Grade A Super',
      location: user ? `${user.village || 'Desa Sukamaju'}, ${user.district || 'Pacet'}` : 'Desa Sukamaju, Pacet',
      regency: user ? user.regency : 'Kabupaten Cianjur',
      imageUrl: ProdukModule.selectedPresetUrl
    };

    return `
      <div class="db-modal-overlay" id="modal-form-overlay">
        <div class="db-modal db-modal-lg" role="dialog" aria-modal="true">
          <div class="db-modal-header">
            <div class="db-modal-title">
              ${isEdit ? Icons.edit : Icons.plus} ${isEdit ? 'Edit Komoditas Produk' : 'Tambah Penawaran Produk Baru'}
            </div>
            <button type="button" class="db-modal-close-btn" id="btn-close-form-modal">
              ${Icons.x}
            </button>
          </div>

          <form id="form-product-crud">
            <div class="db-modal-body">
              <div id="form-error-banner" style="display: none; background: #fef2f2; border: 1px solid #fecaca; color: var(--color-danger); padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.85rem; margin-bottom: 1.25rem;"></div>

              <div class="form-row">
                <div class="form-group" style="flex: 2;">
                  <label class="form-label" for="prod-name">Nama Produk Komoditas *</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    id="prod-name" 
                    name="name" 
                    placeholder="Contoh: Beras Mentik Wangi Organik" 
                    value="${initialData.name}"
                    required
                  />
                </div>

                <div class="form-group" style="flex: 1.2;">
                  <label class="form-label" for="prod-category">Kategori Komoditas *</label>
                  <select class="form-control" id="prod-category" name="category" required>
                    ${appState.getCategories().map(c => `<option value="${c}" ${initialData.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                  </select>
                </div>
              </div>

              <!-- Price, Unit, Stock, MOQ in 4 columns -->
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="prod-price">Harga Grosir (Rp) *</label>
                  <input 
                    type="number" 
                    class="form-control" 
                    id="prod-price" 
                    name="price" 
                    placeholder="14500" 
                    value="${initialData.price}"
                    min="100"
                    required
                  />
                </div>

                <div class="form-group">
                  <label class="form-label" for="prod-unit">Satuan *</label>
                  <select class="form-control" id="prod-unit" name="unit" required>
                    ${UNITS.map(u => `<option value="${u}" ${initialData.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label" for="prod-stock">Stok Tersedia *</label>
                  <input 
                    type="number" 
                    class="form-control" 
                    id="prod-stock" 
                    name="stock" 
                    placeholder="2500" 
                    value="${initialData.stock}"
                    min="1"
                    required
                  />
                </div>

                <div class="form-group">
                  <label class="form-label" for="prod-min-order">Min. Order (MOQ) *</label>
                  <input 
                    type="number" 
                    class="form-control" 
                    id="prod-min-order" 
                    name="minOrder" 
                    placeholder="100" 
                    value="${initialData.minOrder}"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="prod-grade">Mutu / Standar Panen</label>
                  <select class="form-control" id="prod-grade" name="harvestGrade">
                    ${HARVEST_GRADES.map(g => `<option value="${g}" ${initialData.harvestGrade === g ? 'selected' : ''}>${g}</option>`).join('')}
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label" for="prod-location">Lokasi Asal Panen (Desa/Kecamatan)</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    id="prod-location" 
                    name="location" 
                    placeholder="Contoh: Desa Sukamaju, Kec. Pacet" 
                    value="${initialData.location}"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label" for="prod-regency">Kabupaten</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    id="prod-regency" 
                    name="regency" 
                    placeholder="Contoh: Kabupaten Cianjur" 
                    value="${initialData.regency}"
                  />
                </div>
              </div>

              <!-- Product Photo Presets & URL -->
              <div class="form-group">
                <label class="form-label">Foto Produk Komoditas</label>
                <div class="preset-picker-label">Pilih Foto Cepat (Preset Hasil Panen):</div>
                <div class="preset-img-grid">
                  ${PHOTO_PRESETS.map(preset => `
                    <div 
                      class="preset-img-thumb ${initialData.imageUrl === preset.url ? 'selected' : ''}" 
                      data-url="${preset.url}"
                      title="${preset.name}"
                    >
                      <img src="${preset.url}" alt="${preset.name}" />
                      <span class="preset-img-name">${preset.name}</span>
                    </div>
                  `).join('')}
                </div>

                <div style="display: flex; gap: 0.75rem; align-items: center;">
                  <input 
                    type="url" 
                    class="form-control" 
                    id="prod-image-url" 
                    name="imageUrl" 
                    placeholder="Atau masukkan tautan URL foto kustom..." 
                    value="${initialData.imageUrl}"
                  />
                  <div style="width: 44px; height: 44px; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border-light); flex-shrink: 0;">
                    <img id="form-img-preview" src="${initialData.imageUrl}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'" />
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="prod-description">Deskripsi Lengkap & Spesifikasi *</label>
                <textarea 
                  class="form-control" 
                  id="prod-description" 
                  name="description" 
                  rows="3" 
                  placeholder="Jelaskan kadar air, varietas, cara budidaya, standar sortiran, sertifikasi, serta ketentuan logistik pengiriman..." 
                  required
                >${initialData.description}</textarea>
              </div>
            </div>

            <div class="db-modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-form">
                Batal
              </button>
              <button type="submit" class="btn btn-primary btn-sm" id="btn-save-product">
                ${isEdit ? `${Icons.check} Simpan Perubahan` : `${Icons.plus} Terbitkan Produk`}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  // 3. Modal Konfirmasi Hapus Produk
  renderDeleteConfirmModal: (product) => {
    return `
      <div class="db-modal-overlay" id="modal-delete-overlay">
        <div class="db-modal" style="max-width: 440px;" role="dialog" aria-modal="true">
          <div class="db-modal-header" style="border-bottom: none; padding-bottom: 0;">
            <div class="db-modal-title" style="color: var(--color-danger);">
              ${Icons.trash} Hapus Produk
            </div>
            <button type="button" class="db-modal-close-btn" id="btn-close-delete-modal">
              ${Icons.x}
            </button>
          </div>

          <div class="db-modal-body" style="padding-top: 1rem;">
            <p style="font-size: 0.95rem; color: var(--text-main); margin-bottom: 0.5rem;">
              Apakah Anda yakin ingin menghapus komoditas <strong>"${product ? product.name : 'produk ini'}"</strong> dari katalog?
            </p>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">
              Data yang dihapus tidak dapat dipulihkan kembali dari penawaran marketplace.
            </p>
          </div>

          <div class="db-modal-footer">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-delete">
              Batal
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="btn-confirm-delete" style="background: var(--color-danger); border-color: var(--color-danger);">
              Ya, Hapus Produk
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ==========================================
  // EVENT LISTENERS & ACTIONS
  // ==========================================
  attachEvents: (container) => {
    // 1. Tab Switching
    const tabMarketplace = container.querySelector('#tab-btn-marketplace');
    const tabMyProducts = container.querySelector('#tab-btn-my-products');
    const quickSwitch = container.querySelector('#btn-quick-switch-tab');

    if (tabMarketplace) {
      tabMarketplace.addEventListener('click', () => {
        ProdukModule._tabUserChosen = true;
        ProdukModule.activeTab = 'marketplace';
        ProdukModule.render(container);
      });
    }

    if (tabMyProducts) {
      tabMyProducts.addEventListener('click', () => {
        ProdukModule._tabUserChosen = true;
        ProdukModule.activeTab = 'my-products';
        ProdukModule.render(container);
      });
    }

    if (quickSwitch) {
      quickSwitch.addEventListener('click', () => {
        ProdukModule._tabUserChosen = true;
        ProdukModule.activeTab = ProdukModule.activeTab === 'marketplace' ? 'my-products' : 'marketplace';
        ProdukModule.render(container);
      });
    }

    // 2. Header Add Product Button
    const btnAddHeader = container.querySelector('#btn-tambah-penawaran-header');
    if (btnAddHeader) {
      btnAddHeader.addEventListener('click', () => {
        ProdukModule.isAddModalOpen = true;
        ProdukModule.renderModals();
      });
    }

    // 3. Body Add Product Button (Seller view)
    const btnAddBody = container.querySelector('#btn-tambah-produk-body');
    const btnAddFirst = container.querySelector('#btn-tambah-pertama');
    [btnAddBody, btnAddFirst].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          ProdukModule.isAddModalOpen = true;
          ProdukModule.renderModals();
        });
      }
    });

    // 4. Search Input Real-Time
    const searchInput = container.querySelector('#marketplace-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        ProdukModule.searchQuery = e.target.value;
        const viewContent = container.querySelector('#marketplace-view-content');
        if (viewContent) {
          const all = appState.getProducts();
          const uniqueLocs = [...new Set(all.map(p => p.regency || p.location).filter(Boolean))];
          const filtered = all.filter(p => {
            const q = ProdukModule.searchQuery.toLowerCase().trim();
            const matchQ = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.sellerName.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
            const matchC = ProdukModule.selectedCategory === 'all' || p.category === ProdukModule.selectedCategory;
            const matchL = ProdukModule.selectedLocation === 'all' || p.regency === ProdukModule.selectedLocation || (p.location && p.location.includes(ProdukModule.selectedLocation));
            return matchQ && matchC && matchL;
          });
          viewContent.innerHTML = ProdukModule.renderMarketplaceView(filtered, uniqueLocs, all.length);
          ProdukModule.attachMarketplaceFilterEvents(container);
        }
      });
    }

    ProdukModule.attachMarketplaceFilterEvents(container);

    // 5. Card Clicks (Detail, Quick Order, Edit, Delete)
    container.addEventListener('click', (e) => {
      // View detail
      const detailBtn = e.target.closest('.btn-view-detail');
      if (detailBtn) {
        const id = detailBtn.dataset.id;
        ProdukModule.detailProductId = id;
        ProdukModule.orderSimQty = 0;
        ProdukModule.renderModals();
        return;
      }

      // Quick order (from card)
      const orderBtn = e.target.closest('.btn-quick-order');
      if (orderBtn) {
        const id = orderBtn.dataset.id;
        window.location.hash = `#/pesanan-buat?productId=${id}`;
        return;
      }

      // Edit product
      const editBtn = e.target.closest('.btn-edit-product');
      if (editBtn) {
        const id = editBtn.dataset.id;
        ProdukModule.editingProduct = appState.getProductById(id);
        ProdukModule.renderModals();
        return;
      }

      // Delete product
      const deleteBtn = e.target.closest('.btn-delete-product');
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        ProdukModule.deleteTargetId = id;
        ProdukModule.renderModals();
        return;
      }
    });
  },

  attachMarketplaceFilterEvents: (container) => {
    // Select category
    const catSelect = container.querySelector('#filter-category-select');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        ProdukModule.selectedCategory = e.target.value;
        ProdukModule.render(container);
      });
    }

    // Select location
    const locSelect = container.querySelector('#filter-location-select');
    if (locSelect) {
      locSelect.addEventListener('change', (e) => {
        ProdukModule.selectedLocation = e.target.value;
        ProdukModule.render(container);
      });
    }

    // Category chips
    const chips = container.querySelectorAll('.category-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        ProdukModule.selectedCategory = chip.dataset.category;
        ProdukModule.render(container);
      });
    });

    // Reset buttons
    const resetBtn = container.querySelector('#btn-reset-filters');
    const emptyResetBtn = container.querySelector('#btn-empty-reset');
    [resetBtn, emptyResetBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          ProdukModule.searchQuery = '';
          ProdukModule.selectedCategory = 'all';
          ProdukModule.selectedLocation = 'all';
          ProdukModule.render(container);
        });
      }
    });
  },

  // Modal 1 Events: Detail & Simulator
  attachDetailModalEvents: (slot, product) => {
    const overlay = slot.querySelector('#modal-detail-overlay');
    const closeBtn = slot.querySelector('#btn-close-detail-modal');
    const footerClose = slot.querySelector('#btn-close-detail-footer');

    const closeModal = () => {
      ProdukModule.detailProductId = null;
      slot.innerHTML = '';
    };

    [closeBtn, footerClose].forEach(btn => {
      if (btn) btn.addEventListener('click', closeModal);
    });

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });
    }

    // Simulator input change
    const qtyInput = slot.querySelector('#input-sim-qty');
    const totalDisplay = slot.querySelector('#sim-total-display');
    if (qtyInput && totalDisplay) {
      qtyInput.addEventListener('input', (e) => {
        const val = Number(e.target.value) || product.minOrder;
        ProdukModule.orderSimQty = val;
        const total = val * product.price;
        totalDisplay.innerText = `Rp ${ProdukModule.formatNum(total)}`;
      });
    }

    // Submit simulator order
    const btnSimOrder = slot.querySelector('#btn-submit-order-sim');
    if (btnSimOrder) {
      btnSimOrder.addEventListener('click', () => {
        closeModal();
        window.location.hash = `#/pesanan-buat?productId=${product.id}`;
      });
    }

    // Negotiate simulator button
    const btnNegotiate = slot.querySelector('#btn-negotiate-sim');
    if (btnNegotiate) {
      btnNegotiate.addEventListener('click', () => {
        closeModal();
        window.location.hash = `#/negosiasi?action=create&productId=${product.id}`;
      });
    }

    // In-App Chat button
    const btnInAppChat = slot.querySelector('#btn-chat-product-supplier');
    if (btnInAppChat) {
      btnInAppChat.addEventListener('click', () => {
        closeModal();
      });
    }
  },

  // Modal 2 Events: Form Tambah/Edit
  attachFormModalEvents: (slot, editingProduct) => {
    const isEdit = Boolean(editingProduct);
    const overlay = slot.querySelector('#modal-form-overlay');
    const closeBtn = slot.querySelector('#btn-close-form-modal');
    const cancelBtn = slot.querySelector('#btn-cancel-form');
    const form = slot.querySelector('#form-product-crud');
    const errorBanner = slot.querySelector('#form-error-banner');
    const urlInput = slot.querySelector('#prod-image-url');
    const previewImg = slot.querySelector('#form-img-preview');

    const closeModal = () => {
      ProdukModule.isAddModalOpen = false;
      ProdukModule.editingProduct = null;
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

    // Preset photo selector
    const presetThumbs = slot.querySelectorAll('.preset-img-thumb');
    presetThumbs.forEach(thumb => {
      thumb.addEventListener('click', () => {
        presetThumbs.forEach(t => t.classList.remove('selected'));
        thumb.classList.add('selected');
        const url = thumb.dataset.url;
        if (urlInput) urlInput.value = url;
        if (previewImg) previewImg.src = url;
      });
    });

    // Custom URL preview
    if (urlInput && previewImg) {
      urlInput.addEventListener('input', (e) => {
        previewImg.src = e.target.value.trim() || PHOTO_PRESETS[0].url;
      });
    }

    // Form submission
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const name = formData.get('name')?.toString().trim();
        const category = formData.get('category')?.toString();
        const price = Number(formData.get('price'));
        const unit = formData.get('unit')?.toString();
        const stock = Number(formData.get('stock'));
        const minOrder = Number(formData.get('minOrder'));
        const harvestGrade = formData.get('harvestGrade')?.toString();
        const location = formData.get('location')?.toString().trim();
        const regency = formData.get('regency')?.toString().trim();
        const imageUrl = formData.get('imageUrl')?.toString().trim() || PHOTO_PRESETS[0].url;
        const description = formData.get('description')?.toString().trim();

        // Validations
        if (!name || name.length < 3) {
          errorBanner.innerText = 'Nama komoditas minimal 3 karakter.';
          errorBanner.style.display = 'block';
          return;
        }

        if (!price || price <= 0) {
          errorBanner.innerText = 'Harga satuan harus lebih besar dari Rp 0.';
          errorBanner.style.display = 'block';
          return;
        }

        if (stock === undefined || stock < 0) {
          errorBanner.innerText = 'Jumlah stok tidak boleh bernilai negatif.';
          errorBanner.style.display = 'block';
          return;
        }

        if (!minOrder || minOrder < 1) {
          errorBanner.innerText = 'Minimum order (MOQ) harus minimal 1 unit.';
          errorBanner.style.display = 'block';
          return;
        }

        if (!description || description.length < 10) {
          errorBanner.innerText = 'Deskripsi produk minimal 10 karakter agar pembeli memahami kualitas panen.';
          errorBanner.style.display = 'block';
          return;
        }

        const payload = {
          name,
          category,
          price,
          unit,
          stock,
          minOrder,
          harvestGrade,
          location,
          regency,
          imageUrl,
          description
        };

        if (isEdit) {
          const res = appState.updateProduct(editingProduct.id, payload);
          if (res.success) {
            closeModal();
            ProdukModule.showToast(`Produk "${name}" berhasil diperbarui!`);
            const contentContainer = document.getElementById('app-content-container');
            if (contentContainer) ProdukModule.render(contentContainer);
          } else {
            errorBanner.innerText = res.message || 'Gagal memperbarui produk.';
            errorBanner.style.display = 'block';
          }
        } else {
          const res = appState.addProduct(payload);
          if (res.success) {
            closeModal();
            ProdukModule.showToast(`Produk "${name}" berhasil ditambahkan ke penawaran pasar!`);
            // Switch to my-products view to show newly added item
            ProdukModule.activeTab = 'my-products';
            const contentContainer = document.getElementById('app-content-container');
            if (contentContainer) ProdukModule.render(contentContainer);
          } else {
            errorBanner.innerText = res.message || 'Gagal menambahkan produk.';
            errorBanner.style.display = 'block';
          }
        }
      });
    }
  },

  // Modal 3 Events: Delete confirmation
  attachDeleteModalEvents: (slot) => {
    const overlay = slot.querySelector('#modal-delete-overlay');
    const closeBtn = slot.querySelector('#btn-close-delete-modal');
    const cancelBtn = slot.querySelector('#btn-cancel-delete');
    const confirmBtn = slot.querySelector('#btn-confirm-delete');

    const closeModal = () => {
      ProdukModule.deleteTargetId = null;
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

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        const id = ProdukModule.deleteTargetId;
        const res = appState.deleteProduct(id);
        closeModal();

        if (res.success) {
          ProdukModule.showToast('Komoditas produk berhasil dihapus dari katalog penawaran.');
          const contentContainer = document.getElementById('app-content-container');
          if (contentContainer) ProdukModule.render(contentContainer);
        } else {
          ProdukModule.showToast(res.message || 'Gagal menghapus produk.');
        }
      });
    }
  },

  // ==========================================
  // UTILITIES & HELPERS
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
