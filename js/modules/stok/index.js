// DesaBiz AI - Modul Manajemen Stok & Inventaris B2B
import { Icons } from '../../icons.js';
import { appState } from '../../state.js';

export const StokModule = {
  id: 'stok',
  title: 'Manajemen Stok & Inventaris',
  subtitle: 'Pantau ketersediaan kuantitas komoditas, gudang desa, dan peringatan restock',

  // Active module states
  activeFilter: 'all', // 'all', 'tersedia', 'menipis', 'habis', 'mutasi'
  searchQuery: '',
  activeModal: null, // { type: 'add' | 'reduce' | 'set', productId: ... }
  selectedProductLogId: null,

  render: (container, params = new URLSearchParams(), routeKey = 'stok') => {
    const user = appState.getState().user;
    if (!user) return;

    // Check query params if requested specific filter
    if (params.get('filter')) {
      StokModule.activeFilter = params.get('filter');
    }

    // Get all user products enriched with stock status
    const allProducts = appState.getStockProducts(user.id, 'all', '');
    const filteredProducts = appState.getStockProducts(user.id, StokModule.activeFilter === 'mutasi' ? 'all' : StokModule.activeFilter, StokModule.searchQuery);

    // KPI metrics
    const totalItems = allProducts.length;
    const totalInventoryValue = allProducts.reduce((sum, p) => sum + p.inventoryValue, 0);
    const tersediaCount = allProducts.filter(p => p.statusInfo.status === 'tersedia').length;
    const menipisCount = allProducts.filter(p => p.statusInfo.status === 'menipis').length;
    const habisCount = allProducts.filter(p => p.statusInfo.status === 'habis').length;

    // Stock logs
    const stockLogs = appState.getStockLogs(StokModule.selectedProductLogId);

    container.innerHTML = `
      <div class="fade-in">
        <!-- Page Header -->
        <div class="page-header" style="margin-bottom: 1.25rem;">
          <div class="page-header-info">
            <div class="breadcrumbs">
              <a href="#/dashboard">Beranda</a>
              <span class="breadcrumb-separator">/</span>
              <span class="breadcrumb-item active">Stok & Inventaris</span>
            </div>
            <h1 class="page-title">${StokModule.title}</h1>
            <p class="page-subtitle">${StokModule.subtitle}</p>
          </div>
          <div class="page-header-actions flex gap-2">
            <button class="btn btn-secondary btn-sm" id="btn-refresh-stock" title="Segarkan Data Stok">
              ${Icons.refresh} Sinkronisasi
            </button>
            <a href="#/produk" class="btn btn-primary btn-sm">
              ${Icons.plus} Tambah Komoditas
            </a>
          </div>
        </div>

        <!-- 1. KPI SUMMARY CARDS -->
        <div class="stock-stats-grid">
          <div class="stock-stat-card">
            <div class="stock-stat-icon" style="background: #e0f2fe; color: #0284c7;">
              ${Icons.box}
            </div>
            <div class="stock-stat-info">
              <span class="stock-stat-value">${totalItems}</span>
              <span class="stock-stat-label">Jenis Komoditas</span>
            </div>
          </div>

          <div class="stock-stat-card">
            <div class="stock-stat-icon" style="background: #ecfdf5; color: #059669;">
              ${Icons.transaksi}
            </div>
            <div class="stock-stat-info">
              <span class="stock-stat-value">Rp ${(totalInventoryValue / 1000000).toFixed(1)} Jt</span>
              <span class="stock-stat-label">Nilai Aset Gudang</span>
            </div>
          </div>

          <div class="stock-stat-card">
            <div class="stock-stat-icon" style="background: #f0fdf4; color: #16a34a;">
              ${Icons.checkCircle}
            </div>
            <div class="stock-stat-info">
              <span class="stock-stat-value" style="color: #16a34a;">${tersediaCount}</span>
              <span class="stock-stat-label">Stok Tersedia Aman</span>
            </div>
          </div>

          <div class="stock-stat-card" style="${menipisCount > 0 ? 'border-color: #fde68a; background: #fffdf5;' : ''}">
            <div class="stock-stat-icon" style="background: #fef3c7; color: #d97706;">
              ⚠️
            </div>
            <div class="stock-stat-info">
              <span class="stock-stat-value" style="color: #d97706;">${menipisCount}</span>
              <span class="stock-stat-label">Stok Menipis (Kritis)</span>
            </div>
          </div>

          <div class="stock-stat-card" style="${habisCount > 0 ? 'border-color: #fecaca; background: #fff5f5;' : ''}">
            <div class="stock-stat-icon" style="background: #fee2e2; color: #dc2626;">
              🛑
            </div>
            <div class="stock-stat-info">
              <span class="stock-stat-value" style="color: #dc2626;">${habisCount}</span>
              <span class="stock-stat-label">Stok Habis (Kosong)</span>
            </div>
          </div>
        </div>

        <!-- 2. EARLY WARNING ALERT BANNER (JIKA ADA STOK MENIPIS / HABIS) -->
        ${(menipisCount > 0 || habisCount > 0) ? `
          <div class="stock-alert-banner">
            <div class="stock-alert-left">
              <span class="stock-alert-icon">⚠️</span>
              <div class="stock-alert-text">
                <strong>Peringatan Dini: Terdapat ${menipisCount + habisCount} Komoditas Membutuhkan Perhatian!</strong>
                <p>
                  ${menipisCount > 0 ? `• <strong>${menipisCount} komoditas</strong> mencapai batas minimum stok aman. ` : ''}
                  ${habisCount > 0 ? `• <strong>${habisCount} komoditas</strong> dalam kondisi stok kosong (0). ` : ''}
                  Segera lakukan penambahan pasokan atau perbarui data opname gudang.
                </p>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-quick-filter-alert" style="background: #ffffff; color: #92400e; border-color: #fde68a; font-weight: 700;">
              ${Icons.eye} Tinjau Stok Kritis
            </button>
          </div>
        ` : ''}

        <!-- 3. FILTER TABS & SEARCH TOOLBAR -->
        <div class="marketplace-toolbar" style="padding: 1rem 1.25rem; margin-bottom: 1.25rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
            <!-- Category Filter Pills -->
            <div class="category-chips-wrap" style="padding-bottom: 0;">
              <button 
                type="button" 
                class="category-chip ${StokModule.activeFilter === 'all' ? 'active' : ''}" 
                data-filter="all"
              >
                Semua Stok (${totalItems})
              </button>
              <button 
                type="button" 
                class="category-chip ${StokModule.activeFilter === 'tersedia' ? 'active' : ''}" 
                data-filter="tersedia"
              >
                🟢 Tersedia (${tersediaCount})
              </button>
              <button 
                type="button" 
                class="category-chip ${StokModule.activeFilter === 'menipis' ? 'active' : ''}" 
                data-filter="menipis"
              >
                🟡 Menipis (${menipisCount})
              </button>
              <button 
                type="button" 
                class="category-chip ${StokModule.activeFilter === 'habis' ? 'active' : ''}" 
                data-filter="habis"
              >
                🔴 Habis (${habisCount})
              </button>
              <button 
                type="button" 
                class="category-chip ${StokModule.activeFilter === 'mutasi' ? 'active' : ''}" 
                data-filter="mutasi"
              >
                📋 Riwayat Mutasi (${stockLogs.length})
              </button>
            </div>

            <!-- Search input -->
            <div style="position: relative; min-width: 240px; flex: 1; max-width: 320px;">
              <span style="position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); display: flex;">
                ${Icons.search}
              </span>
              <input 
                type="text" 
                id="stock-search-input" 
                class="form-control" 
                placeholder="Cari komoditas..." 
                value="${StokModule.searchQuery}"
                style="padding: 0.5rem 0.85rem 0.5rem 2.25rem; font-size: 0.85rem;"
              />
            </div>
          </div>
        </div>

        <!-- 4. CONTENT VIEW: INVENTORY TABLE OR STOCK MUTATION LOG -->
        ${StokModule.activeFilter === 'mutasi' ? `
          <!-- VIEW A: RIWAYAT MUTASI STOK -->
          <div class="stock-table-card">
            <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
              <div>
                <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin: 0 0 0.25rem;">
                  Log Riwayat Mutasi & Pergerakan Stok
                </h3>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">
                  Catatan audit otomatis dari transaksi pesanan, panen masuk, susut barang, dan penyesuaian opname gudang.
                </p>
              </div>
              ${StokModule.selectedProductLogId ? `
                <button class="btn btn-secondary btn-sm" id="btn-clear-log-filter">
                  Tampilkan Semua Komoditas
                </button>
              ` : ''}
            </div>

            <div class="stock-table-wrap">
              <table class="stock-table">
                <thead>
                  <tr>
                    <th>Waktu / Tanggal</th>
                    <th>Komoditas</th>
                    <th>Tipe Mutasi</th>
                    <th style="text-align: right;">Perubahan</th>
                    <th style="text-align: right;">Stok Akhir</th>
                    <th>Alasan & Referensi</th>
                    <th>Operator PIC</th>
                  </tr>
                </thead>
                <tbody>
                  ${stockLogs.length === 0 ? `
                    <tr>
                      <td colspan="7" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                        Belum ada catatan mutasi stok tercatat.
                      </td>
                    </tr>
                  ` : stockLogs.map(l => {
                    let badgeClass = 'mutasi-badge-adj';
                    if (l.type === 'in') badgeClass = 'mutasi-badge-in';
                    else if (l.type === 'out') badgeClass = 'mutasi-badge-out';
                    else if (l.type === 'order') badgeClass = 'mutasi-badge-order';
                    else if (l.type === 'order_cancel') badgeClass = 'mutasi-badge-in';

                    const isPositive = l.quantity > 0;
                    return `
                      <tr>
                        <td style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); white-space: nowrap;">
                          ${l.date}
                        </td>
                        <td>
                          <strong style="color: var(--text-main);">${l.productName}</strong>
                        </td>
                        <td>
                          <span class="${badgeClass}">${l.typeLabel}</span>
                        </td>
                        <td style="text-align: right; font-weight: 800; color: ${isPositive ? '#059669' : '#dc2626'}; white-space: nowrap;">
                          ${isPositive ? '+' : ''}${l.quantity.toLocaleString('id-ID')} ${l.unit}
                        </td>
                        <td style="text-align: right; font-weight: 700; color: var(--text-main); white-space: nowrap;">
                          ${l.stockAfter.toLocaleString('id-ID')} ${l.unit}
                        </td>
                        <td style="font-size: 0.825rem; color: var(--text-main); max-width: 280px;">
                          ${l.reason}
                        </td>
                        <td style="font-size: 0.8rem; color: var(--text-muted); white-space: nowrap;">
                          ${l.operator}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : `
          <!-- VIEW B: TABEL INVENTARIS STOK PRODUK -->
          <div class="stock-table-card">
            <div class="stock-table-wrap">
              <table class="stock-table">
                <thead>
                  <tr>
                    <th>Komoditas Produk</th>
                    <th>Kategori</th>
                    <th style="text-align: right;">Harga Satuan B2B</th>
                    <th>Kuantitas Stok & Kapasitas</th>
                    <th style="text-align: right;">Nilai Aset</th>
                    <th style="text-align: center;">Status Stok</th>
                    <th style="text-align: center;">Aksi Operasional Penjual</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredProducts.length === 0 ? `
                    <tr>
                      <td colspan="7" style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
                        <div style="font-weight: 700; font-size: 1rem; color: var(--text-main); margin-bottom: 0.25rem;">
                          Tidak ada komoditas yang cocok dengan filter
                        </div>
                        <p style="font-size: 0.825rem; margin: 0;">
                          Coba ganti filter status atau bersihkan kolom pencarian.
                        </p>
                      </td>
                    </tr>
                  ` : filteredProducts.map(p => {
                    const status = p.statusInfo;
                    const maxCap = Math.max(p.stock * 1.5, p.threshold * 2.5);
                    const percent = Math.min(100, Math.round((p.stock / maxCap) * 100));

                    let fillClass = 'green';
                    if (status.status === 'habis') fillClass = 'red';
                    else if (status.status === 'menipis') fillClass = 'amber';

                    let badgeHtml = `<span class="stock-badge-tersedia">● Stok Tersedia</span>`;
                    if (status.status === 'menipis') {
                      badgeHtml = `<span class="stock-badge-menipis">⚠️ Stok Menipis</span>`;
                    } else if (status.status === 'habis') {
                      badgeHtml = `<span class="stock-badge-habis">🛑 Stok Habis</span>`;
                    }

                    return `
                      <tr>
                        <!-- Product Info -->
                        <td>
                          <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <img 
                              src="${p.imageUrl}" 
                              alt="${p.name}" 
                              style="width: 44px; height: 44px; border-radius: var(--radius-md); object-fit: cover; border: 1px solid var(--border-light); flex-shrink: 0;"
                              onerror="this.src='https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'"
                            />
                            <div>
                              <strong style="color: var(--text-main); font-size: 0.9rem; display: block; line-height: 1.3;">
                                ${p.name}
                              </strong>
                              <span style="font-size: 0.75rem; color: var(--text-muted);">
                                ${p.regency || p.location} • Grade: ${p.harvestGrade || 'Super'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <!-- Category -->
                        <td>
                          <span class="badge badge-primary" style="font-size: 0.7rem;">${p.category}</span>
                        </td>

                        <!-- Unit Price -->
                        <td style="text-align: right; font-weight: 700; color: var(--text-main);">
                          Rp ${p.price.toLocaleString('id-ID')} <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">/ ${p.unit}</span>
                        </td>

                        <!-- Stock & Progress Bar -->
                        <td>
                          <div class="stock-progress-wrap">
                            <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 0.8rem;">
                              <strong style="font-size: 0.95rem; color: ${status.color};">
                                ${p.stock.toLocaleString('id-ID')} ${p.unit}
                              </strong>
                              <span style="font-size: 0.7rem; color: var(--text-muted);">
                                Min: ${p.threshold.toLocaleString('id-ID')} ${p.unit}
                              </span>
                            </div>
                            <div class="stock-progress-bar">
                              <div class="stock-progress-fill ${fillClass}" style="width: ${percent}%;"></div>
                            </div>
                          </div>
                        </td>

                        <!-- Inventory Value -->
                        <td style="text-align: right; font-weight: 800; color: var(--color-primary-dark);">
                          Rp ${p.inventoryValue.toLocaleString('id-ID')}
                        </td>

                        <!-- Status Badge -->
                        <td style="text-align: center;">
                          ${badgeHtml}
                        </td>

                        <!-- Operations Buttons -->
                        <td style="text-align: center;">
                          <div class="stock-action-cell" style="justify-content: center;">
                            <button 
                              class="btn btn-secondary btn-sm btn-action-add" 
                              data-id="${p.id}" 
                              title="Tambah kuantitas pasokan masuk / panen baru"
                              style="padding: 0.35rem 0.65rem; font-size: 0.775rem; color: #047857; border-color: #a7f3d0; background: #ecfdf5;"
                            >
                              + Tambah
                            </button>
                            <button 
                              class="btn btn-secondary btn-sm btn-action-reduce" 
                              data-id="${p.id}" 
                              title="Kurangi stok karena penjualan offline atau susut"
                              style="padding: 0.35rem 0.65rem; font-size: 0.775rem; color: #b45309; border-color: #fde68a; background: #fffbeb;"
                            >
                              - Kurang
                            </button>
                            <button 
                              class="btn btn-secondary btn-sm btn-action-set" 
                              data-id="${p.id}" 
                              title="Ubah stok fisik gudang (Stock Opname)"
                              style="padding: 0.35rem 0.65rem; font-size: 0.775rem;"
                            >
                              ✎ Ubah
                            </button>
                            <button 
                              class="btn btn-secondary btn-sm btn-action-log" 
                              data-id="${p.id}" 
                              title="Lihat riwayat pergerakan stok komoditas ini"
                              style="padding: 0.35rem 0.55rem; font-size: 0.775rem;"
                            >
                              📋
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `}

        <!-- MODALS SLOT -->
        <div id="stock-modal-slot"></div>
      </div>
    `;

    StokModule.attachEvents(container);
  },

  attachEvents: (container) => {
    // 1. Filter chips
    const chips = container.querySelectorAll('.category-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        StokModule.activeFilter = chip.dataset.filter;
        StokModule.render(container);
      });
    });

    // 2. Alert banner quick button
    const alertBtn = container.querySelector('#btn-quick-filter-alert');
    if (alertBtn) {
      alertBtn.addEventListener('click', () => {
        StokModule.activeFilter = 'menipis';
        StokModule.render(container);
      });
    }

    // 3. Search input
    const searchInput = container.querySelector('#stock-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        StokModule.searchQuery = e.target.value;
        StokModule.render(container);
      });
    }

    // 4. Refresh button
    const refreshBtn = container.querySelector('#btn-refresh-stock');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        StokModule.render(container);
      });
    }

    // 5. Clear log filter
    const clearLogBtn = container.querySelector('#btn-clear-log-filter');
    if (clearLogBtn) {
      clearLogBtn.addEventListener('click', () => {
        StokModule.selectedProductLogId = null;
        StokModule.render(container);
      });
    }

    // 6. Action buttons (+, -, ubah, log)
    container.addEventListener('click', (e) => {
      // Tambah Stok (+)
      const addBtn = e.target.closest('.btn-action-add');
      if (addBtn) {
        const id = addBtn.dataset.id;
        const prod = appState.getProductById(id);
        if (prod) StokModule.openModal('add', prod);
        return;
      }

      // Kurangi Stok (-)
      const reduceBtn = e.target.closest('.btn-action-reduce');
      if (reduceBtn) {
        const id = reduceBtn.dataset.id;
        const prod = appState.getProductById(id);
        if (prod) StokModule.openModal('reduce', prod);
        return;
      }

      // Ubah Stok (Set)
      const setBtn = e.target.closest('.btn-action-set');
      if (setBtn) {
        const id = setBtn.dataset.id;
        const prod = appState.getProductById(id);
        if (prod) StokModule.openModal('set', prod);
        return;
      }

      // Lihat Log Komoditas
      const logBtn = e.target.closest('.btn-action-log');
      if (logBtn) {
        const id = logBtn.dataset.id;
        StokModule.selectedProductLogId = id;
        StokModule.activeFilter = 'mutasi';
        StokModule.render(container);
        return;
      }
    });
  },

  // ==========================================
  // MODALS: TAMBAH, KURANGI, UBAH STOK
  // ==========================================
  openModal: (type, product) => {
    const slot = document.getElementById('stock-modal-slot');
    if (!slot) return;

    let modalTitle = 'Operasional Stok';
    let typeIcon = Icons.plus;
    let badgeColor = '#059669';
    let inputLabel = 'Jumlah Pasokan';
    let defaultReason = '';
    let reasons = [];

    if (type === 'add') {
      modalTitle = `Tambah Stok Pasokan: ${product.name}`;
      typeIcon = Icons.plus;
      badgeColor = '#059669';
      inputLabel = `Jumlah Kuantitas Masuk (${product.unit}) *`;
      defaultReason = 'Hasil Panen Baru Sawah / Kebun';
      reasons = [
        'Hasil Panen Baru Sawah / Kebun',
        'Pengadaan Pasokan Masuk dari Mitra Tani',
        'Retur Barang / Pembatalan Pesanan',
        'Koreksi Tambah Hasil Audit Fisik Gudang'
      ];
    } else if (type === 'reduce') {
      modalTitle = `Kurangi Stok Pasokan: ${product.name}`;
      typeIcon = Icons.trash;
      badgeColor = '#dc2626';
      inputLabel = `Jumlah Kuantitas Keluar (${product.unit}) *`;
      defaultReason = 'Penjualan Langsung / Luar Aplikasi (Offline)';
      reasons = [
        'Penjualan Langsung / Luar Aplikasi (Offline)',
        'Penyusutan Alami / Penurunan Kadar Air',
        'Komoditas Rusak / Afkir / Busuk',
        'Sampel Uji Mutu Laboratorium / Pembeli',
        'Koreksi Kurang Hasil Audit Fisik Gudang'
      ];
    } else if (type === 'set') {
      modalTitle = `Ubah / Set Nilai Stok: ${product.name}`;
      typeIcon = Icons.edit;
      badgeColor = '#2563eb';
      inputLabel = `Angka Stok Fisik Gudang Baru (${product.unit}) *`;
      defaultReason = 'Penyesuaian Hasil Stock Opname Bulanan';
      reasons = [
        'Penyesuaian Hasil Stock Opname Bulanan',
        'Koreksi Input Data Awal Sistem',
        'Sinkronisasi Timbangan Digital Gudang'
      ];
    }

    slot.innerHTML = `
      <div class="db-modal-overlay" id="modal-stock-overlay">
        <div class="db-modal" style="max-width: 520px;" role="dialog" aria-modal="true">
          <div class="db-modal-header">
            <div class="db-modal-title" style="display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem;">
              <span style="color: ${badgeColor}; display: flex;">${typeIcon}</span>
              <span>${modalTitle}</span>
            </div>
            <button type="button" class="db-modal-close-btn" id="btn-close-stock-modal">
              ${Icons.x}
            </button>
          </div>

          <form id="form-stock-action">
            <div class="db-modal-body">
              <!-- Info Box Current Stock -->
              <div style="background: var(--bg-app); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 1rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; display: block;">
                    Sisa Stok Saat Ini:
                  </span>
                  <strong style="font-size: 1.25rem; color: var(--text-main);">
                    ${product.stock.toLocaleString('id-ID')} ${product.unit}
                  </strong>
                </div>
                <div style="text-align: right;">
                  <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Batas Aman (Safety):</span>
                  <span style="font-size: 0.85rem; font-weight: 700; color: #b45309;">
                    ${(product.threshold || 1000).toLocaleString('id-ID')} ${product.unit}
                  </span>
                </div>
              </div>

              <!-- Input Quantity -->
              <div class="form-group" style="margin-bottom: 1.25rem;">
                <label class="form-label" for="stock-qty-input" style="font-weight: 700;">
                  ${inputLabel}
                </label>
                <input 
                  type="number" 
                  id="stock-qty-input" 
                  class="form-control" 
                  placeholder="${type === 'set' ? 'Masukkan stok total baru...' : 'Contoh: 100'}"
                  min="${type === 'set' ? '0' : '1'}"
                  max="${type === 'reduce' ? product.stock : '1000000'}"
                  value="${type === 'set' ? product.stock : ''}"
                  required
                  style="font-size: 1.1rem; font-weight: 700; padding: 0.65rem 0.85rem;"
                />
                ${type === 'reduce' ? `
                  <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem; display: block;">
                    Maksimal pengurangan: ${product.stock.toLocaleString('id-ID')} ${product.unit}
                  </span>
                ` : ''}
              </div>

              <!-- Alasan Perubahan -->
              <div class="form-group" style="margin-bottom: 1.25rem;">
                <label class="form-label" for="stock-reason-select" style="font-weight: 700;">
                  Pilih Alasan Perubahan Stok *
                </label>
                <select id="stock-reason-select" class="form-control" style="font-size: 0.9rem;">
                  ${reasons.map(r => `<option value="${r}">${r}</option>`).join('')}
                </select>
              </div>

              <!-- Keterangan Tambahan -->
              <div class="form-group">
                <label class="form-label" for="stock-notes-input">
                  Catatan Dokumen / Keterangan Tambahan (Opsional)
                </label>
                <textarea 
                  id="stock-notes-input" 
                  class="form-control" 
                  rows="2" 
                  placeholder="Misal: Nomor Surat Jalan, Blok Lahan Panen, Petugas Gudang..."
                ></textarea>
              </div>
            </div>

            <div class="db-modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-stock-modal">
                Batal
              </button>
              <button type="submit" class="btn btn-primary btn-sm" style="background: ${badgeColor}; border-color: ${badgeColor};">
                ${Icons.check} Simpan Perubahan Stok
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Modal Events
    const overlay = slot.querySelector('#modal-stock-overlay');
    const closeBtn = slot.querySelector('#btn-close-stock-modal');
    const cancelBtn = slot.querySelector('#btn-cancel-stock-modal');
    const form = slot.querySelector('#form-stock-action');

    const closeModal = () => {
      slot.innerHTML = '';
    };

    [closeBtn, cancelBtn].forEach(b => {
      if (b) b.addEventListener('click', closeModal);
    });

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const qtyVal = parseInt(slot.querySelector('#stock-qty-input').value, 10);
      const reasonSelect = slot.querySelector('#stock-reason-select').value;
      const notes = slot.querySelector('#stock-notes-input').value.trim();
      const fullReason = notes ? `${reasonSelect} (${notes})` : reasonSelect;

      let res;
      if (type === 'add') {
        res = appState.adjustStock({
          productId: product.id,
          type: 'add',
          amount: qtyVal,
          reason: fullReason
        });
      } else if (type === 'reduce') {
        res = appState.adjustStock({
          productId: product.id,
          type: 'reduce',
          amount: qtyVal,
          reason: fullReason
        });
      } else if (type === 'set') {
        res = appState.adjustStock({
          productId: product.id,
          type: 'set',
          newStock: qtyVal,
          reason: fullReason
        });
      }

      if (res && res.success) {
        closeModal();
        const mainContainer = document.getElementById('main-content');
        if (mainContainer) {
          StokModule.render(mainContainer);
        }
      } else {
        alert(res?.message || 'Gagal mengubah stok.');
      }
    });
  }
};
