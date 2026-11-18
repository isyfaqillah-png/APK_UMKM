// DesaBiz AI - Modul Pemesanan (B2B Purchase Orders)
import { Icons } from '../../icons.js';
import { appState } from '../../state.js';

export const PesananModule = {
  id: 'pesanan',
  title: 'Manajemen Pemesanan B2B',
  subtitle: 'Penerbitan purchase order (PO), pelacakan tahapan status, dan konfirmasi pasokan',

  // Current active view states
  activeRoleTab: 'buyer', // 'buyer' (Pesanan Keluar) or 'seller' (Pesanan Masuk)
  activeStatusFilter: 'all',
  searchQuery: '',

  render: (container, params = new URLSearchParams(), routeKey = 'pesanan') => {
    // Check if subview requested
    const action = params.get('action');
    const orderId = params.get('id');

    if (routeKey === 'pesanan-buat' || action === 'create') {
      PesananModule.renderCreateOrder(container, params);
    } else if (routeKey === 'pesanan-detail' || (orderId && action !== 'create')) {
      PesananModule.renderOrderDetail(container, orderId);
    } else {
      PesananModule.renderOrderList(container, params);
    }
  },

  // ==========================================
  // VIEW: DAFTAR PESANAN (BUYER & SELLER TABS)
  // ==========================================
  renderOrderList: (container, params) => {
    const user = appState.getState().user;
    if (!user) return;

    // Check if tab specified in query
    if (params.get('tab') === 'seller' || params.get('tab') === 'buyer') {
      PesananModule.activeRoleTab = params.get('tab');
    }

    const allOrders = appState.getState().orders || [];
    const buyerOrders = allOrders.filter(o => o.buyerId === user.id);
    const sellerOrders = allOrders.filter(o => o.sellerId === user.id);

    // Current tab filtered orders
    const targetOrders = PesananModule.activeRoleTab === 'seller' ? sellerOrders : buyerOrders;

    // Status counts for active tab
    const statusCounts = {
      all: targetOrders.length,
      Menunggu: targetOrders.filter(o => o.status === 'Menunggu').length,
      Diproses: targetOrders.filter(o => o.status === 'Diproses').length,
      Dikonfirmasi: targetOrders.filter(o => o.status === 'Dikonfirmasi').length,
      Selesai: targetOrders.filter(o => o.status === 'Selesai').length,
      Dibatalkan: targetOrders.filter(o => o.status === 'Dibatalkan').length,
    };

    // Filter by status & search
    let filteredOrders = targetOrders.filter(o => {
      const matchStatus = PesananModule.activeStatusFilter === 'all' || o.status === PesananModule.activeStatusFilter;
      const q = PesananModule.searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        o.id.toLowerCase().includes(q) ||
        o.productName.toLowerCase().includes(q) ||
        o.buyerName.toLowerCase().includes(q) ||
        o.sellerName.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });

    const isSellerTab = PesananModule.activeRoleTab === 'seller';

    container.innerHTML = `
      <div class="fade-in">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header-info">
            <div class="breadcrumbs">
              <a href="#/dashboard">Beranda</a>
              <span class="breadcrumb-separator">/</span>
              <span class="breadcrumb-item active">Pesanan</span>
            </div>
            <h1 class="page-title">${PesananModule.title}</h1>
            <p class="page-subtitle">Kelola siklus pengadaan komoditas dari penerbitan PO, proses sortasi, konfirmasi kirim, hingga tuntas.</p>
          </div>
          <div class="page-header-actions flex gap-2">
            <a href="#/negosiasi" class="btn btn-secondary btn-sm">
              ${Icons.negosiasi} Negosiasi Harga
            </a>
            <a href="#/pesanan-buat" class="btn btn-primary btn-sm">
              ${Icons.plus} Buat Order Baru
            </a>
          </div>
        </div>

        <!-- Role Toggle Tabs (Pembelian vs Penjualan) -->
        <div class="role-tabs-wrap">
          <div class="role-tabs">
            <button class="role-tab-btn ${PesananModule.activeRoleTab === 'buyer' ? 'active' : ''}" id="tab-buyer-btn">
              ${Icons.box} Pesanan Pembelian Saya (Keluar)
              <span class="role-tab-badge">${buyerOrders.length}</span>
            </button>
            <button class="role-tab-btn ${PesananModule.activeRoleTab === 'seller' ? 'active' : ''}" id="tab-seller-btn">
              ${Icons.truck} Pesanan Penjualan Masuk (Penjual)
              <span class="role-tab-badge">${sellerOrders.length}</span>
            </button>
          </div>

          <div style="font-size: 0.85rem; color: var(--text-muted);">
            Mode Akun: <strong style="color: var(--color-primary);">${isSellerTab ? 'Pemasok / Penjual' : 'Pembeli / Pemesan'}</strong>
          </div>
        </div>

        <!-- Filters Bar: Search & 5 Status Buttons -->
        <div class="marketplace-filters-bar" style="margin-bottom: 1.5rem;">
          <div class="search-input-wrap flex-1">
            <span class="search-icon">${Icons.search}</span>
            <input type="text" id="order-search-input" class="search-input" 
                   placeholder="Cari nomor PO, nama komoditas, atau mitra..." 
                   value="${PesananModule.searchQuery}">
            ${PesananModule.searchQuery ? `<button id="clear-search-btn" class="clear-search" style="border:none;background:transparent;cursor:pointer;">${Icons.x}</button>` : ''}
          </div>

          <!-- Status Filter Pills -->
          <div class="category-chips-scroll" style="display: flex; gap: 0.5rem; overflow-x: auto; padding: 0.25rem 0;">
            ${[
              { key: 'all', label: 'Semua Status' },
              { key: 'Menunggu', label: 'Menunggu' },
              { key: 'Diproses', label: 'Diproses' },
              { key: 'Dikonfirmasi', label: 'Dikonfirmasi' },
              { key: 'Selesai', label: 'Selesai' },
              { key: 'Dibatalkan', label: 'Dibatalkan' }
            ].map(s => {
              const active = PesananModule.activeStatusFilter === s.key ? 'active' : '';
              const count = statusCounts[s.key] || 0;
              return `
                <button class="chip-filter ${active}" data-status="${s.key}" style="white-space: nowrap; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.85rem; font-size: 0.8rem; border-radius: var(--radius-full); border: 1px solid var(--border-light); background: ${active ? 'var(--color-primary)' : 'var(--bg-surface)'}; color: ${active ? '#fff' : 'var(--text-muted)'}; cursor: pointer;">
                  ${s.label} (${count})
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Orders List -->
        ${filteredOrders.length === 0 ? `
          <div class="empty-state-card" style="text-align: center; padding: 3rem 1.5rem; background: var(--bg-surface); border: 1px dashed var(--border-light); border-radius: var(--radius-xl);">
            <div style="width: 56px; height: 56px; margin: 0 auto 1rem; border-radius: 50%; background: var(--color-primary-soft); color: var(--color-primary); display: flex; align-items: center; justify-content: center;">
              ${Icons.pesanan}
            </div>
            <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-main);">
              Tidak Ada Pesanan Ditemukan
            </h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); max-width: 420px; margin: 0 auto 1.5rem;">
              ${PesananModule.searchQuery || PesananModule.activeStatusFilter !== 'all' 
                ? 'Tidak ada pesanan yang sesuai dengan filter atau kata kunci pencarian Anda.' 
                : isSellerTab 
                  ? 'Belum ada pesanan masuk dari pembeli untuk komoditas yang Anda tawarkan.' 
                  : 'Anda belum menerbitkan pesanan pasokan ke supplier desa.'}
            </p>
            ${!isSellerTab ? `
              <a href="#/pesanan-buat" class="btn btn-primary btn-sm">
                ${Icons.plus} Buat Pesanan Baru Sekarang
              </a>
            ` : ''}
          </div>
        ` : `
          <div class="order-list-grid">
            ${filteredOrders.map(order => PesananModule.renderOrderCard(order, isSellerTab)).join('')}
          </div>
        `}
      </div>
    `;

    PesananModule.bindOrderListEvents(container);
  },

  // Order Card Item Component
  renderOrderCard: (order, isSellerTab) => {
    const statusBadges = {
      'Menunggu': '<span class="badge badge-menunggu">⏳ Menunggu Konfirmasi</span>',
      'Diproses': '<span class="badge badge-diproses">⚙️ Sedang Diproses</span>',
      'Dikonfirmasi': '<span class="badge badge-dikonfirmasi">🚚 Dikonfirmasi / Dikirim</span>',
      'Selesai': '<span class="badge badge-selesai">✅ Selesai</span>',
      'Dibatalkan': '<span class="badge badge-dibatalkan">❌ Dibatalkan</span>'
    };

    const partnerLabel = isSellerTab ? 'Pembeli' : 'Pemasok / Supplier';
    const partnerName = isSellerTab ? order.buyerName : order.sellerName;
    const partnerLocation = isSellerTab ? (order.buyerAddress || '-') : (order.sellerLocation || '-');

    return `
      <div class="order-card" data-order-id="${order.id}">
        <!-- Top: PO ID, Date, Status -->
        <div class="order-card-top">
          <div class="order-id-block">
            <span class="order-id-badge">${order.id}</span>
            <span style="font-size: 0.775rem; color: var(--text-muted);">
              ${order.createdAt}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span style="font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: var(--radius-sm); background: var(--bg-app); font-weight: 600; color: var(--text-muted);">
              ${isSellerTab ? '📦 Penjualan' : '🛒 Pembelian'}
            </span>
            ${statusBadges[order.status] || `<span class="badge">${order.status}</span>`}
          </div>
        </div>

        <!-- Middle: Product, Partner, Quantity, Total Amount -->
        <div class="order-card-content">
          <img src="${order.productImage || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'}" 
               alt="${order.productName}" 
               class="order-prod-thumb">
          
          <div class="order-prod-details">
            <h3>${order.productName}</h3>
            <div class="order-partner-info">
              <span>${partnerLabel}: <strong>${partnerName}</strong></span>
              <span>•</span>
              <span style="color: var(--text-muted);">${partnerLocation}</span>
            </div>
            <div class="order-qty-price-pill">
              <span>Volume: <strong>${order.quantity.toLocaleString('id-ID')} ${order.productUnit}</strong></span>
              <span>•</span>
              <span>Harga: Rp ${order.unitPrice.toLocaleString('id-ID')} / ${order.productUnit}</span>
            </div>
          </div>

          <div class="order-amount-col">
            <span class="order-total-label">Total Nilai PO</span>
            <span class="order-total-value">Rp ${order.totalAmount.toLocaleString('id-ID')}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">
              (Termasuk logistik Rp ${order.shippingCost.toLocaleString('id-ID')})
            </span>
          </div>
        </div>

        <!-- Bottom: Action Buttons -->
        <div class="order-card-bottom">
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            Terakhir diperbarui: <strong>${order.updatedAt || order.createdAt}</strong>
          </div>
          <div class="flex gap-2">
            <a href="#/chat?partnerId=${isSellerTab ? order.buyerId : order.sellerId}&orderId=${order.id}&productId=${order.productId}" class="btn btn-secondary btn-sm" title="Chat Rekan Bisnis">
              ${Icons.chat} Chat
            </a>

            ${isSellerTab && order.status === 'Menunggu' ? `
              <button class="btn btn-primary btn-sm quick-process-btn" data-order-id="${order.id}">
                ${Icons.check} Terima & Proses
              </button>
            ` : ''}

            ${!isSellerTab && order.status === 'Menunggu' ? `
              <button class="btn btn-secondary btn-sm quick-cancel-btn" data-order-id="${order.id}" style="color: #b91c1c; border-color: #fecaca;">
                ${Icons.trash} Batalkan PO
              </button>
            ` : ''}

            <a href="#/pesanan-detail?id=${order.id}" class="btn btn-secondary btn-sm">
              ${Icons.eye} Lihat Detail PO
            </a>
          </div>
        </div>
      </div>
    `;
  },

  // Bind Order List Events
  bindOrderListEvents: (container) => {
    // Tab switching
    container.querySelector('#tab-buyer-btn')?.addEventListener('click', () => {
      PesananModule.activeRoleTab = 'buyer';
      PesananModule.activeStatusFilter = 'all';
      PesananModule.renderOrderList(container, new URLSearchParams('tab=buyer'));
    });

    container.querySelector('#tab-seller-btn')?.addEventListener('click', () => {
      PesananModule.activeRoleTab = 'seller';
      PesananModule.activeStatusFilter = 'all';
      PesananModule.renderOrderList(container, new URLSearchParams('tab=seller'));
    });

    // Status chip filters
    container.querySelectorAll('.chip-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        PesananModule.activeStatusFilter = btn.getAttribute('data-status');
        PesananModule.renderOrderList(container, new URLSearchParams(`tab=${PesananModule.activeRoleTab}`));
      });
    });

    // Search input
    const searchInput = container.querySelector('#order-search-input');
    searchInput?.addEventListener('input', (e) => {
      PesananModule.searchQuery = e.target.value;
      PesananModule.renderOrderList(container, new URLSearchParams(`tab=${PesananModule.activeRoleTab}`));
    });

    // Clear search
    container.querySelector('#clear-search-btn')?.addEventListener('click', () => {
      PesananModule.searchQuery = '';
      PesananModule.renderOrderList(container, new URLSearchParams(`tab=${PesananModule.activeRoleTab}`));
    });

    // Quick Action: Seller Accept & Process
    container.querySelectorAll('.quick-process-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const orderId = btn.getAttribute('data-order-id');
        const res = appState.updateOrderStatus(orderId, 'Diproses', 'Pesanan diterima dan mulai diproses oleh penjual.');
        if (res.success) {
          PesananModule.showToast(`Pesanan #${orderId} berhasil diproses.`);
          PesananModule.renderOrderList(container, new URLSearchParams(`tab=${PesananModule.activeRoleTab}`));
        }
      });
    });

    // Quick Action: Buyer Cancel
    container.querySelectorAll('.quick-cancel-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const orderId = btn.getAttribute('data-order-id');
        if (confirm(`Apakah Anda yakin ingin membatalkan Purchase Order #${orderId}?`)) {
          const res = appState.updateOrderStatus(orderId, 'Dibatalkan', 'Dibatalkan oleh pembeli sebelum diproses.');
          if (res.success) {
            PesananModule.showToast(`Pesanan #${orderId} telah dibatalkan.`);
            PesananModule.renderOrderList(container, new URLSearchParams(`tab=${PesananModule.activeRoleTab}`));
          }
        }
      });
    });
  },

  // ==========================================
  // VIEW: BUAT PESANAN (CREATE ORDER FORM)
  // ==========================================
  renderCreateOrder: (container, params) => {
    const user = appState.getState().user;
    if (!user) return;

    const products = appState.getProducts();
    // Default selected product from query param or first product
    const queryProductId = params.get('productId');
    const selectedProduct = products.find(p => p.id === queryProductId) || products[0];

    container.innerHTML = `
      <div class="fade-in" style="max-width: 860px; margin: 0 auto;">
        <!-- Breadcrumb & Header -->
        <div class="breadcrumbs" style="margin-bottom: 0.75rem;">
          <a href="#/dashboard">Beranda</a>
          <span class="breadcrumb-separator">/</span>
          <a href="#/pesanan">Pesanan</a>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-item active">Buat Pesanan Baru</span>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 class="page-title" style="font-size: 1.6rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.25rem;">
              Buat Purchase Order (PO) Pasokan Desa
            </h1>
            <p style="font-size: 0.875rem; color: var(--text-muted);">
              Terbitkan pesanan pasokan resmi untuk pengadaan komoditas B2B langsung dari mitra tani dan produsen desa.
            </p>
          </div>
          <a href="#/pesanan" class="btn btn-secondary btn-sm">
            ${Icons.arrowLeft} Kembali ke Daftar Pesanan
          </a>
        </div>

        <!-- Order Form Card -->
        <div class="card" style="padding: 2rem; background: var(--bg-surface); border-radius: var(--radius-xl); border: 1px solid var(--border-light); box-shadow: var(--shadow-sm);">
          <form id="create-order-form">
            <!-- 1. Product Selection -->
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label" style="font-weight: 700; margin-bottom: 0.5rem; display: block;">
                Pilih Komoditas / Produk Pasokan <span style="color: red;">*</span>
              </label>
              <select id="order-product-select" class="form-input" style="padding: 0.75rem; font-size: 0.95rem;">
                ${products.map(p => `
                  <option value="${p.id}" ${p.id === selectedProduct.id ? 'selected' : ''}>
                    ${p.name} - Rp ${p.price.toLocaleString('id-ID')}/${p.unit} (Supplier: ${p.sellerName})
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Product Preview Card -->
            <div id="product-preview-box" style="background: var(--bg-app); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 1.25rem; margin-bottom: 1.5rem; display: flex; gap: 1.25rem; align-items: center;">
              <img id="preview-img" src="${selectedProduct.imageUrl}" alt="${selectedProduct.name}" 
                   style="width: 85px; height: 85px; border-radius: var(--radius-md); object-fit: cover; border: 1px solid var(--border-light);">
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                  <h4 id="preview-name" style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin: 0;">
                    ${selectedProduct.name}
                  </h4>
                  <span class="badge badge-primary" style="font-size: 0.7rem;">${selectedProduct.category}</span>
                </div>
                <div style="font-size: 0.825rem; color: var(--text-muted); margin-bottom: 0.35rem;">
                  Pemasok: <strong id="preview-seller">${selectedProduct.sellerName}</strong> • <span id="preview-loc">${selectedProduct.location}</span>
                </div>
                <div style="display: flex; gap: 1rem; font-size: 0.85rem;">
                  <span>Harga: <strong style="color: var(--color-primary);" id="preview-price">Rp ${selectedProduct.price.toLocaleString('id-ID')}</strong> / <span class="preview-unit">${selectedProduct.unit}</span></span>
                  <span>Stok Siap: <strong id="preview-stock">${selectedProduct.stock.toLocaleString('id-ID')} ${selectedProduct.unit}</strong></span>
                  <span>Min. Order: <strong id="preview-minorder">${selectedProduct.minOrder} ${selectedProduct.unit}</strong></span>
                </div>
              </div>
            </div>

            <!-- 2. Quantity & Unit Price -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.5rem;">
              <div class="form-group">
                <label class="form-label" style="font-weight: 700; margin-bottom: 0.5rem; display: block;">
                  Jumlah Pesanan (<span class="preview-unit">${selectedProduct.unit}</span>) <span style="color: red;">*</span>
                </label>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                  <button type="button" id="qty-minus-btn" class="btn btn-secondary" style="padding: 0.6rem 0.9rem; font-weight: 800;">-</button>
                  <input type="number" id="order-qty-input" class="form-input" 
                         value="${selectedProduct.minOrder}" 
                         min="${selectedProduct.minOrder}" 
                         step="10"
                         style="text-align: center; font-size: 1.1rem; font-weight: 700;">
                  <button type="button" id="qty-plus-btn" class="btn btn-secondary" style="padding: 0.6rem 0.9rem; font-weight: 800;">+</button>
                </div>
                <div id="qty-hint" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.35rem;">
                  Batas minimal pemesanan supplier ini adalah ${selectedProduct.minOrder} ${selectedProduct.unit}.
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" style="font-weight: 700; margin-bottom: 0.5rem; display: block;">
                  Harga Satuan B2B
                </label>
                <input type="text" id="order-unitprice-display" class="form-input" 
                       value="Rp ${selectedProduct.price.toLocaleString('id-ID')} / ${selectedProduct.unit}" 
                       disabled 
                       style="background: var(--bg-app); font-weight: 700; color: var(--text-main);">
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.35rem;">
                  Ingin harga khusus grosir? <a href="#/negosiasi" style="color: var(--color-primary); font-weight: 600;">Ajukan negosiasi harga</a>
                </div>
              </div>
            </div>

            <!-- 3. Delivery Address -->
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label" style="font-weight: 700; margin-bottom: 0.5rem; display: block;">
                Alamat Pengiriman Gudang / Usaha Anda <span style="color: red;">*</span>
              </label>
              <textarea id="order-address-input" class="form-input" rows="2" 
                        placeholder="Masukkan alamat lengkap tujuan pengiriman armada logistik...">${user.address || ''}, ${user.village || ''}, ${user.district || ''}, ${user.regency || ''}</textarea>
            </div>

            <!-- 4. Notes / Terms -->
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label" style="font-weight: 700; margin-bottom: 0.5rem; display: block;">
                Instruksi & Catatan Khusus PO
              </label>
              <textarea id="order-notes-input" class="form-input" rows="2" 
                        placeholder="Contoh: Kemasan karung 25kg, mohon lampirkan hasil uji kadar air, kirim sebelum tanggal 10."></textarea>
            </div>

            <!-- 5. Real-Time Price Calculation Box -->
            <div class="order-calc-card" style="margin-bottom: 1.75rem;">
              <div style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 0.75rem;">
                Rincian Kalkulasi Purchase Order
              </div>
              <div class="calc-row">
                <span>Subtotal Komoditas (<span id="calc-qty-label">${selectedProduct.minOrder}</span> ${selectedProduct.unit} × Rp ${selectedProduct.price.toLocaleString('id-ID')})</span>
                <strong id="calc-subtotal-val" style="color: var(--text-main);">Rp ${(selectedProduct.minOrder * selectedProduct.price).toLocaleString('id-ID')}</strong>
              </div>
              <div class="calc-row">
                <span>Estimasi Biaya Logistik Armada Desa</span>
                <strong id="calc-shipping-val" style="color: var(--text-main);">Rp 250.000</strong>
              </div>
              <div class="calc-row total">
                <span>Total Estimasi PO</span>
                <span id="calc-total-val">Rp ${(selectedProduct.minOrder * selectedProduct.price + 250000).toLocaleString('id-ID')}</span>
              </div>
            </div>

            <!-- Form Actions -->
            <div style="display: flex; justify-content: flex-end; gap: 1rem; align-items: center;">
              <a href="#/pesanan" class="btn btn-secondary">Batal</a>
              <button type="submit" class="btn btn-primary btn-lg" id="submit-order-btn">
                ${Icons.check} Terbitkan Purchase Order Resmi
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    PesananModule.bindCreateOrderEvents(container, selectedProduct);
  },

  // Bind Create Order Form
  bindCreateOrderEvents: (container, initialProduct) => {
    let currentProduct = initialProduct;
    const products = appState.getProducts();

    const productSelect = container.querySelector('#order-product-select');
    const qtyInput = container.querySelector('#order-qty-input');
    const minusBtn = container.querySelector('#qty-minus-btn');
    const plusBtn = container.querySelector('#qty-plus-btn');
    const form = container.querySelector('#create-order-form');

    const updateCalc = () => {
      let qty = parseInt(qtyInput.value, 10);
      if (isNaN(qty) || qty < 1) qty = currentProduct.minOrder;

      const subtotal = qty * currentProduct.price;
      const shipping = 250000;
      const total = subtotal + shipping;

      container.querySelector('#calc-qty-label').textContent = qty.toLocaleString('id-ID');
      container.querySelector('#calc-subtotal-val').textContent = `Rp ${subtotal.toLocaleString('id-ID')}`;
      container.querySelector('#calc-total-val').textContent = `Rp ${total.toLocaleString('id-ID')}`;

      // Min order validation indicator
      const hint = container.querySelector('#qty-hint');
      if (qty < currentProduct.minOrder) {
        hint.style.color = '#ef4444';
        hint.textContent = `⚠️ Peringatan: Jumlah pesanan (${qty}) di bawah batas minimum (${currentProduct.minOrder} ${currentProduct.unit}).`;
      } else {
        hint.style.color = 'var(--text-muted)';
        hint.textContent = `Batas minimal pemesanan supplier ini adalah ${currentProduct.minOrder} ${currentProduct.unit}.`;
      }
    };

    // On change product
    productSelect?.addEventListener('change', (e) => {
      const found = products.find(p => p.id === e.target.value);
      if (found) {
        currentProduct = found;
        container.querySelector('#preview-img').src = currentProduct.imageUrl;
        container.querySelector('#preview-name').textContent = currentProduct.name;
        container.querySelector('#preview-seller').textContent = currentProduct.sellerName;
        container.querySelector('#preview-loc').textContent = currentProduct.location;
        container.querySelector('#preview-price').textContent = `Rp ${currentProduct.price.toLocaleString('id-ID')}`;
        container.querySelector('#preview-stock').textContent = `${currentProduct.stock.toLocaleString('id-ID')} ${currentProduct.unit}`;
        container.querySelector('#preview-minorder').textContent = `${currentProduct.minOrder} ${currentProduct.unit}`;
        container.querySelectorAll('.preview-unit').forEach(el => el.textContent = currentProduct.unit);
        container.querySelector('#order-unitprice-display').value = `Rp ${currentProduct.price.toLocaleString('id-ID')} / ${currentProduct.unit}`;

        qtyInput.min = currentProduct.minOrder;
        qtyInput.value = currentProduct.minOrder;
        updateCalc();
      }
    });

    qtyInput?.addEventListener('input', updateCalc);

    minusBtn?.addEventListener('click', () => {
      let val = parseInt(qtyInput.value, 10) || currentProduct.minOrder;
      const step = val >= 100 ? 50 : 10;
      if (val - step >= currentProduct.minOrder) {
        qtyInput.value = val - step;
      } else {
        qtyInput.value = currentProduct.minOrder;
      }
      updateCalc();
    });

    plusBtn?.addEventListener('click', () => {
      let val = parseInt(qtyInput.value, 10) || currentProduct.minOrder;
      const step = val >= 100 ? 50 : 10;
      qtyInput.value = val + step;
      updateCalc();
    });

    // Submit
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const qty = parseInt(qtyInput.value, 10);
      const address = container.querySelector('#order-address-input').value.trim();
      const notes = container.querySelector('#order-notes-input').value.trim();

      if (qty < currentProduct.minOrder) {
        alert(`Jumlah pesanan (${qty} ${currentProduct.unit}) kurang dari batas minimum order (${currentProduct.minOrder} ${currentProduct.unit}). Silakan sesuaikan kuantitas.`);
        return;
      }

      if (!address) {
        alert('Mohon lengkapi alamat tujuan pengiriman.');
        return;
      }

      const res = appState.createOrder({
        productId: currentProduct.id,
        quantity: qty,
        unitPrice: currentProduct.price,
        shippingAddress: address,
        notes: notes
      });

      if (res.success) {
        PesananModule.showToast(`Purchase Order #${res.order.id} berhasil diterbitkan.`);
        window.location.hash = `#/pesanan-detail?id=${res.order.id}`;
      } else {
        alert(res.message || 'Gagal menerbitkan pesanan.');
      }
    });
  },

  // ==========================================
  // VIEW: DETAIL PESANAN (PURCHASE ORDER INVOICE)
  // ==========================================
  renderOrderDetail: (container, orderId) => {
    const user = appState.getState().user;
    if (!user) return;

    const order = appState.getOrderById(orderId);
    if (!order) {
      container.innerHTML = `
        <div class="fade-in" style="text-align: center; padding: 4rem 1.5rem;">
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem;">Pesanan Tidak Ditemukan</h2>
          <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Purchase order dengan nomor <code>${orderId || '-'}</code> tidak terdaftar.</p>
          <a href="#/pesanan" class="btn btn-primary">${Icons.arrowLeft} Kembali ke Daftar Pesanan</a>
        </div>
      `;
      return;
    }

    const isSeller = order.sellerId === user.id;
    const isBuyer = order.buyerId === user.id;

    // Stepper logic: Menunggu -> Diproses -> Dikonfirmasi -> Selesai
    const steps = ['Menunggu', 'Diproses', 'Dikonfirmasi', 'Selesai'];
    const currentStepIndex = steps.indexOf(order.status);
    const isCancelled = order.status === 'Dibatalkan';

    container.innerHTML = `
      <div class="fade-in" style="max-width: 900px; margin: 0 auto;">
        <!-- Breadcrumbs & Top Bar -->
        <div class="page-header" style="margin-bottom: 1.25rem;">
          <div class="page-header-info">
            <div class="breadcrumbs">
              <a href="#/dashboard">Beranda</a>
              <span class="breadcrumb-separator">/</span>
              <a href="#/pesanan">Pesanan</a>
              <span class="breadcrumb-separator">/</span>
              <span class="breadcrumb-item active">${order.id}</span>
            </div>
            <h1 class="page-title" style="font-size: 1.5rem; font-weight: 800;">
              Purchase Order #${order.id}
            </h1>
            <p class="page-subtitle">Dokumen kontrak pemesanan pasokan B2B DesaBiz AI terverifikasi</p>
          </div>

          <div class="page-header-actions flex gap-2">
            <a href="#/chat?partnerId=${isSeller ? order.buyerId : order.sellerId}&orderId=${order.id}&productId=${order.productId}" class="btn btn-primary btn-sm" id="btn-chat-order-partner">
              ${Icons.chat} Chat Rekan Bisnis
            </a>
            ${order.status === 'Selesai' ? `
              <a href="#/transaksi-detail?id=TRX-2026-${order.id.replace('ORD-2026-', '')}" class="btn btn-primary btn-sm" style="background: #059669; border-color: #059669;">
                🧾 Faktur Transaksi
              </a>
            ` : ''}
            <button class="btn btn-secondary btn-sm" id="print-po-btn">
              🖨️ Cetak / Unduh PO
            </button>
            <a href="#/pesanan" class="btn btn-secondary btn-sm">
              ${Icons.arrowLeft} Kembali
            </a>
          </div>
        </div>

        <!-- Order Stepper Progress Tracker -->
        <div class="order-stepper-wrap">
          <div class="order-stepper-header">
            <span style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted);">
              Tahapan Status Pemesanan
            </span>
            <span class="badge ${order.status === 'Selesai' ? 'badge-selesai' : order.status === 'Dibatalkan' ? 'badge-dibatalkan' : 'badge-diproses'}" style="font-size: 0.8rem;">
              Status: ${order.status}
            </span>
          </div>

          ${isCancelled ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius-lg); padding: 1rem 1.25rem; display: flex; align-items: center; gap: 0.75rem; color: #b91c1c;">
              <span style="font-size: 1.25rem;">❌</span>
              <div>
                <strong>Pesanan Ini Telah Dibatalkan</strong>
                <p style="font-size: 0.825rem; margin: 0.15rem 0 0; color: #991b1b;">
                  ${order.notes || 'Pesanan dibatalkan oleh pihak pembeli atau penjual.'}
                </p>
              </div>
            </div>
          ` : `
            <div class="order-stepper">
              <div class="stepper-line">
                <div class="stepper-line-progress" style="width: ${Math.max(0, (currentStepIndex / 3) * 100)}%;"></div>
              </div>

              ${steps.map((step, idx) => {
                const isCompleted = currentStepIndex > idx;
                const isActive = currentStepIndex === idx;
                const stepClass = isCompleted ? 'completed' : isActive ? 'active' : '';

                // Find time from timeline
                const historyEntry = (order.timeline || []).find(t => t.status === step);

                return `
                  <div class="stepper-step ${stepClass}">
                    <div class="stepper-dot">
                      ${isCompleted ? Icons.check : idx + 1}
                    </div>
                    <span class="stepper-title">${step}</span>
                    <span class="stepper-time">${historyEntry ? historyEntry.time.split(',')[0] : '—'}</span>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Official PO Sheet (Purchase Order Invoice) -->
        <div class="po-sheet" id="printable-po-area">
          <div class="po-header">
            <div class="po-brand">
              <h2>DesaBiz AI</h2>
              <p>Platform B2B UMKM & Gapoktan Pedesaan Terintegrasi</p>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
                Sertifikasi Transaksi Digital SNI Agribisnis
              </div>
            </div>

            <div style="text-align: right;">
              <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: var(--text-muted);">
                PURCHASE ORDER (PO) RESMI
              </div>
              <div style="font-size: 1.35rem; font-weight: 800; color: var(--color-primary); font-family: monospace;">
                ${order.id}
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                Tanggal: <strong>${order.createdAt}</strong>
              </div>
            </div>
          </div>

          <!-- Parties Grid: Buyer vs Seller -->
          <div class="po-parties-grid">
            <!-- Buyer Party -->
            <div class="po-party-box">
              <div class="po-party-type">Penerbit PO (Pembeli)</div>
              <div class="po-party-name">${order.buyerName}</div>
              <div class="po-party-addr">${order.buyerAddress}</div>
              <div class="po-party-contact">
                ${Icons.auth} Kontak: ${order.buyerContact}
              </div>
              ${isBuyer 
                ? `<span class="badge badge-primary" style="margin-top: 0.5rem;">Akun Anda (Pembeli)</span>` 
                : `<a href="#/chat?partnerId=${order.buyerId}&orderId=${order.id}&productId=${order.productId}" class="btn btn-secondary btn-sm" style="margin-top: 0.5rem; width: fit-content;">${Icons.chat} Chat Pembeli</a>`}
            </div>

            <!-- Seller Party -->
            <div class="po-party-box">
              <div class="po-party-type">Pemasok / Supplier (Penjual)</div>
              <div class="po-party-name">${order.sellerName}</div>
              <div class="po-party-addr">${order.sellerLocation}</div>
              <div class="po-party-contact">
                ${Icons.phone} Kontak: ${order.sellerContact}
              </div>
              ${isSeller 
                ? `<span class="badge badge-accent" style="margin-top: 0.5rem;">Akun Anda (Penjual)</span>` 
                : `<a href="#/chat?partnerId=${order.sellerId}&orderId=${order.id}&productId=${order.productId}" class="btn btn-secondary btn-sm" style="margin-top: 0.5rem; width: fit-content;">${Icons.chat} Chat Supplier</a>`}
            </div>
          </div>

          <!-- Items Table -->
          <div class="po-table-wrap">
            <table class="po-table">
              <thead>
                <tr>
                  <th style="width: 50px;">No</th>
                  <th>Deskripsi Komoditas</th>
                  <th style="text-align: center;">Kuantitas</th>
                  <th style="text-align: right;">Harga Satuan</th>
                  <th style="text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="font-weight: 700;">1</td>
                  <td>
                    <div style="font-weight: 700; color: var(--text-main);">${order.productName}</div>
                    <div style="font-size: 0.775rem; color: var(--text-muted);">Spesifikasi B2B Standar Mutu Panen Petani Desa</div>
                  </td>
                  <td style="text-align: center; font-weight: 700;">
                    ${order.quantity.toLocaleString('id-ID')} ${order.productUnit}
                  </td>
                  <td style="text-align: right;">
                    Rp ${order.unitPrice.toLocaleString('id-ID')}
                  </td>
                  <td style="text-align: right; font-weight: 700; color: var(--text-main);">
                    Rp ${order.subtotal.toLocaleString('id-ID')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- PO Financial Summary -->
          <div class="po-summary-wrap">
            <div class="po-summary-box">
              <div class="po-summary-row">
                <span>Subtotal Komoditas:</span>
                <span>Rp ${order.subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div class="po-summary-row">
                <span>Biaya Armada Logistik Desa:</span>
                <span>Rp ${order.shippingCost.toLocaleString('id-ID')}</span>
              </div>
              <div class="po-summary-row total">
                <span>Total Nilai PO:</span>
                <span>Rp ${order.totalAmount.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          <!-- Terms & Notes -->
          <div class="po-terms-box" style="margin-bottom: 1.5rem;">
            <strong>Catatan & Kesepakatan Tambahan:</strong>
            <p style="margin: 0.25rem 0 0;">${order.notes || 'Pengiriman dilakukan sesuai jadwal kesepakatan logistik B2B.'}</p>
          </div>

          <!-- Audit Timeline Log -->
          <div>
            <div style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 0.75rem;">
              Log Riwayat Transaksi Digital
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              ${(order.timeline || []).map(t => `
                <div style="display: flex; align-items: flex-start; gap: 0.75rem; font-size: 0.825rem; padding: 0.5rem 0.75rem; background: var(--bg-app); border-radius: var(--radius-md);">
                  <span style="font-weight: 700; color: var(--color-primary); min-width: 140px;">${t.time}</span>
                  <span style="font-weight: 600; min-width: 90px;">[${t.status}]</span>
                  <span style="color: var(--text-muted);">${t.note}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Role Action Bar (Update status based on user role) -->
        ${!isCancelled && order.status !== 'Selesai' ? `
          <div class="card" style="padding: 1.5rem; background: var(--bg-surface); border-radius: var(--radius-xl); border: 1px solid var(--border-light); margin-bottom: 2rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">
                Aksi Status Pesanan (${isSeller ? 'Sebagai Penjual' : 'Sebagai Pembeli'})
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem;">
                ${isSeller 
                  ? 'Perbarui status seiring persiapan barang di gudang atau keberangkatan armada.' 
                  : 'Konfirmasi penerimaan setelah barang tiba dan diperiksa di gudang.'}
              </div>
            </div>

            <div class="flex gap-2">
              <!-- Seller Status Transitions -->
              ${isSeller && order.status === 'Menunggu' ? `
                <button class="btn btn-secondary btn-sm" id="btn-seller-reject" style="color: #b91c1c; border-color: #fecaca;">
                  ${Icons.trash} Tolak Pesanan
                </button>
                <button class="btn btn-primary btn-sm" id="btn-seller-process">
                  ${Icons.check} Terima & Proses Pesanan
                </button>
              ` : ''}

              ${isSeller && order.status === 'Diproses' ? `
                <button class="btn btn-primary btn-sm" id="btn-seller-confirm">
                  ${Icons.truck} Konfirmasi Barang Siap / Dikirim
                </button>
              ` : ''}

              ${isSeller && order.status === 'Dikonfirmasi' ? `
                <button class="btn btn-primary btn-sm" id="btn-seller-complete">
                  ${Icons.checkCircle} Tandai Transaksi Selesai
                </button>
              ` : ''}

              <!-- Buyer Status Transitions -->
              ${isBuyer && order.status === 'Menunggu' ? `
                <button class="btn btn-secondary btn-sm" id="btn-buyer-cancel" style="color: #b91c1c; border-color: #fecaca;">
                  ${Icons.trash} Batalkan Pesanan Ini
                </button>
              ` : ''}

              ${isBuyer && order.status === 'Dikonfirmasi' ? `
                <button class="btn btn-primary btn-sm" id="btn-buyer-received">
                  ${Icons.checkCircle} Konfirmasi Barang Diterima & Selesai
                </button>
              ` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    PesananModule.bindOrderDetailEvents(container, order);
  },

  // Bind Order Detail Events
  bindOrderDetailEvents: (container, order) => {
    // Print PO
    container.querySelector('#print-po-btn')?.addEventListener('click', () => {
      window.print();
    });

    // Seller: Accept & Process
    container.querySelector('#btn-seller-process')?.addEventListener('click', () => {
      const res = appState.updateOrderStatus(order.id, 'Diproses', 'Pesanan diterima oleh penjual dan barang sedang disiapkan di gudang.');
      if (res.success) {
        PesananModule.showToast(`Pesanan #${order.id} berhasil diubah ke 'Diproses'.`);
        PesananModule.renderOrderDetail(container, order.id);
      }
    });

    // Seller: Reject / Cancel
    container.querySelector('#btn-seller-reject')?.addEventListener('click', () => {
      const reason = prompt('Masukkan alasan penolakan pesanan:', 'Kapasitas produksi / stok sedang tidak mencukupi.');
      if (reason) {
        const res = appState.updateOrderStatus(order.id, 'Dibatalkan', `Ditolak oleh penjual: ${reason}`);
        if (res.success) {
          PesananModule.showToast(`Pesanan #${order.id} telah dibatalkan.`);
          PesananModule.renderOrderDetail(container, order.id);
        }
      }
    });

    // Seller: Confirm Shipment
    container.querySelector('#btn-seller-confirm')?.addEventListener('click', () => {
      const res = appState.updateOrderStatus(order.id, 'Dikonfirmasi', 'Barang telah dikonfirmasi siap & armada logistik desa diberangkatkan.');
      if (res.success) {
        PesananModule.showToast(`Pesanan #${order.id} berstatus 'Dikonfirmasi'.`);
        PesananModule.renderOrderDetail(container, order.id);
      }
    });

    // Seller: Mark Finished
    container.querySelector('#btn-seller-complete')?.addEventListener('click', () => {
      const res = appState.updateOrderStatus(order.id, 'Selesai', 'Transaksi diselesaikan dan pembayaran langsung telah dikonfirmasi.');
      if (res.success) {
        PesananModule.showToast(`Pesanan #${order.id} dinyatakan Selesai! 🎉`);
        PesananModule.renderOrderDetail(container, order.id);
      }
    });

    // Buyer: Cancel when Menunggu
    container.querySelector('#btn-buyer-cancel')?.addEventListener('click', () => {
      if (confirm(`Apakah Anda yakin ingin membatalkan Purchase Order #${order.id}?`)) {
        const res = appState.updateOrderStatus(order.id, 'Dibatalkan', 'Dibatalkan oleh pembeli.');
        if (res.success) {
          PesananModule.showToast(`Pesanan #${order.id} telah dibatalkan.`);
          PesananModule.renderOrderDetail(container, order.id);
        }
      }
    });

    // Buyer: Confirm Receipt
    container.querySelector('#btn-buyer-received')?.addEventListener('click', () => {
      if (confirm('Konfirmasi bahwa barang pesanan telah tiba dan diterima dengan kondisi sesuai?')) {
        const res = appState.updateOrderStatus(order.id, 'Selesai', 'Pembeli mengonfirmasi barang telah diterima dalam kondisi baik.');
        if (res.success) {
          PesananModule.showToast(`Terima kasih! Pesanan #${order.id} telah selesai.`);
          PesananModule.renderOrderDetail(container, order.id);
        }
      }
    });
  },

  showToast: (message) => {
    const existing = document.querySelector('.db-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'db-toast fade-in';
    toast.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: var(--color-primary-dark);
      color: #ffffff;
      padding: 0.85rem 1.4rem;
      border-radius: var(--radius-lg);
      font-size: 0.875rem;
      font-weight: 600;
      box-shadow: var(--shadow-lg);
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    `;
    toast.innerHTML = `<span>✓</span> <span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};
