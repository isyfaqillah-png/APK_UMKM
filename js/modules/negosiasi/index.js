// DesaBiz AI - Modul Negosiasi Harga B2B
import { Icons } from '../../icons.js';
import { appState } from '../../state.js';

export const NegosiasiModule = {
  id: 'negosiasi',
  title: 'Negosiasi Harga B2B',
  subtitle: 'Tawar-menawar harga grosir transparan langsung antara pembeli dan produsen desa',

  // Active view states
  activeRoleTab: 'buyer', // 'buyer' (Penawaran Saya) or 'seller' (Tawaran Masuk)
  activeStatusFilter: 'all',
  searchQuery: '',

  render: (container, params = new URLSearchParams()) => {
    const user = appState.getState().user;
    if (!user) return;

    if (params.get('tab') === 'seller' || params.get('tab') === 'buyer') {
      NegosiasiModule.activeRoleTab = params.get('tab');
    }

    const allNegs = appState.getState().negotiations || [];
    const buyerNegs = allNegs.filter(n => n.buyerId === user.id);
    const sellerNegs = allNegs.filter(n => n.sellerId === user.id);

    const targetNegs = NegosiasiModule.activeRoleTab === 'seller' ? sellerNegs : buyerNegs;

    // Status counts
    const statusCounts = {
      all: targetNegs.length,
      Menunggu: targetNegs.filter(n => n.status === 'Menunggu').length,
      'Dinegosiasi Balik': targetNegs.filter(n => n.status === 'Dinegosiasi Balik').length,
      Disetujui: targetNegs.filter(n => n.status === 'Disetujui').length,
      Ditolak: targetNegs.filter(n => n.status === 'Ditolak').length,
      'Dikonversi ke Pesanan': targetNegs.filter(n => n.status === 'Dikonversi ke Pesanan').length
    };

    // Filtered
    const filteredNegs = targetNegs.filter(n => {
      const matchStatus = NegosiasiModule.activeStatusFilter === 'all' || n.status === NegosiasiModule.activeStatusFilter;
      const q = NegosiasiModule.searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        n.id.toLowerCase().includes(q) ||
        n.productName.toLowerCase().includes(q) ||
        n.buyerName.toLowerCase().includes(q) ||
        n.sellerName.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });

    const isSellerTab = NegosiasiModule.activeRoleTab === 'seller';

    container.innerHTML = `
      <div class="fade-in">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header-info">
            <div class="breadcrumbs">
              <a href="#/dashboard">Beranda</a>
              <span class="breadcrumb-separator">/</span>
              <span class="breadcrumb-item active">Negosiasi Harga</span>
            </div>
            <h1 class="page-title">${NegosiasiModule.title}</h1>
            <p class="page-subtitle">Sistem tawar-menawar harga grosir dan kuantitas pasokan secara digital tanpa konflik.</p>
          </div>
          <div class="page-header-actions flex gap-2">
            <a href="#/pesanan" class="btn btn-secondary btn-sm">
              ${Icons.pesanan} Lihat Daftar Pesanan
            </a>
            <button class="btn btn-primary btn-sm" id="btn-open-create-neg-modal">
              ${Icons.plus} Ajukan Negosiasi Baru
            </button>
          </div>
        </div>

        <!-- Role Switcher Tabs (Penawaran Saya vs Tawaran Masuk) -->
        <div class="role-tabs-wrap">
          <div class="role-tabs">
            <button class="role-tab-btn ${NegosiasiModule.activeRoleTab === 'buyer' ? 'active' : ''}" id="tab-neg-buyer-btn">
              ${Icons.box} Penawaran Saya (Pembeli)
              <span class="role-tab-badge">${buyerNegs.length}</span>
            </button>
            <button class="role-tab-btn ${NegosiasiModule.activeRoleTab === 'seller' ? 'active' : ''}" id="tab-neg-seller-btn">
              ${Icons.truck} Tawaran Masuk (Penjual)
              <span class="role-tab-badge">${sellerNegs.length}</span>
            </button>
          </div>

          <div style="font-size: 0.85rem; color: var(--text-muted);">
            Tampilan: <strong style="color: var(--color-primary);">${isSellerTab ? 'Tanggapan Penjual' : 'Pengajuan Pembeli'}</strong>
          </div>
        </div>

        <!-- Filter and Search Bar -->
        <div class="marketplace-filters-bar" style="margin-bottom: 1.5rem;">
          <div class="search-input-wrap flex-1">
            <span class="search-icon">${Icons.search}</span>
            <input type="text" id="neg-search-input" class="search-input" 
                   placeholder="Cari ID negosiasi, nama komoditas, atau mitra..." 
                   value="${NegosiasiModule.searchQuery}">
            ${NegosiasiModule.searchQuery ? `<button id="clear-neg-search-btn" class="clear-search" style="border:none;background:transparent;cursor:pointer;">${Icons.x}</button>` : ''}
          </div>

          <!-- Status Filter Chips -->
          <div class="category-chips-scroll" style="display: flex; gap: 0.5rem; overflow-x: auto; padding: 0.25rem 0;">
            ${[
              { key: 'all', label: 'Semua Status' },
              { key: 'Menunggu', label: 'Menunggu' },
              { key: 'Dinegosiasi Balik', label: 'Tawar Balik' },
              { key: 'Disetujui', label: 'Disetujui' },
              { key: 'Ditolak', label: 'Ditolak' },
              { key: 'Dikonversi ke Pesanan', label: 'Jadi PO' }
            ].map(s => {
              const active = NegosiasiModule.activeStatusFilter === s.key ? 'active' : '';
              const count = statusCounts[s.key] || 0;
              return `
                <button class="chip-filter ${active}" data-status="${s.key}" style="white-space: nowrap; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.85rem; font-size: 0.8rem; border-radius: var(--radius-full); border: 1px solid var(--border-light); background: ${active ? 'var(--color-primary)' : 'var(--bg-surface)'}; color: ${active ? '#fff' : 'var(--text-muted)'}; cursor: pointer;">
                  ${s.label} (${count})
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Negotiations List -->
        ${filteredNegs.length === 0 ? `
          <div class="empty-state-card" style="text-align: center; padding: 3.5rem 1.5rem; background: var(--bg-surface); border: 1px dashed var(--border-light); border-radius: var(--radius-xl);">
            <div style="width: 56px; height: 56px; margin: 0 auto 1rem; border-radius: 50%; background: #fef3c7; color: #b45309; display: flex; align-items: center; justify-content: center;">
              ${Icons.negosiasi}
            </div>
            <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-main);">
              Tidak Ada Negosiasi Harga
            </h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); max-width: 440px; margin: 0 auto 1.5rem;">
              ${NegosiasiModule.searchQuery || NegosiasiModule.activeStatusFilter !== 'all'
                ? 'Tidak ada negosiasi yang cocok dengan kriteria filter Anda.'
                : isSellerTab 
                  ? 'Belum ada pembeli yang mengajukan penawaran harga khusus untuk produk jualan Anda.' 
                  : 'Anda belum mengajukan negosiasi harga untuk komoditas yang ingin dibeli.'}
            </p>
            ${!isSellerTab ? `
              <button class="btn btn-primary btn-sm" id="empty-state-create-btn">
                ${Icons.plus} Ajukan Negosiasi Baru Sekarang
              </button>
            ` : ''}
          </div>
        ` : `
          <div class="neg-list-wrap">
            ${filteredNegs.map(neg => NegosiasiModule.renderNegCard(neg, isSellerTab)).join('')}
          </div>
        `}

        <!-- MODAL CONTAINER (Placeholders for Create & Respond Modals) -->
        <div id="neg-modal-container"></div>
      </div>
    `;

    NegosiasiModule.bindEvents(container, params);

    // If query contains action=create, open modal automatically
    if (params.get('action') === 'create') {
      NegosiasiModule.openCreateModal(container, params.get('productId'));
    }
  },

  // Render Single Negotiation Card
  renderNegCard: (neg, isSellerTab) => {
    const statusBadges = {
      'Menunggu': '<span class="badge badge-menunggu">⏳ Menunggu Respon</span>',
      'Dinegosiasi Balik': '<span class="badge badge-dinegosiasi">🔄 Ditawar Balik Penjual</span>',
      'Disetujui': '<span class="badge badge-selesai">✅ Tawaran Disetujui</span>',
      'Ditolak': '<span class="badge badge-dibatalkan">❌ Tawaran Ditolak</span>',
      'Dikonversi ke Pesanan': '<span class="badge badge-dikonfirmasi">📦 Dikonversi Jadi PO</span>'
    };

    const discountPercent = Math.round(((neg.initialPrice - neg.offerPrice) / neg.initialPrice) * 100);
    const totalSaving = (neg.initialPrice - neg.offerPrice) * neg.quantity;

    const partnerLabel = isSellerTab ? 'Calon Pembeli' : 'Supplier Target';
    const partnerName = isSellerTab ? neg.buyerName : neg.sellerName;

    return `
      <div class="neg-card" data-neg-id="${neg.id}">
        <!-- Top row: ID, Date, Partner & Status -->
        <div class="neg-header-row">
          <div class="flex items-center gap-3 flex-wrap">
            <span style="font-family: monospace; font-size: 0.95rem; font-weight: 800; color: #d97706;">
              ${neg.id}
            </span>
            <span style="font-size: 0.775rem; color: var(--text-muted);">
              Diajukan: ${neg.createdAt}
            </span>
            <span style="font-size: 0.8rem; color: var(--text-muted);">
              • ${partnerLabel}: <strong style="color: var(--text-main);">${partnerName}</strong>
            </span>
          </div>

          <div class="flex items-center gap-2">
            ${statusBadges[neg.status] || `<span class="badge">${neg.status}</span>`}
          </div>
        </div>

        <!-- Product Preview + Volume -->
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem;">
          <img src="${neg.productImage || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'}" 
               alt="${neg.productName}" 
               style="width: 65px; height: 65px; border-radius: var(--radius-md); object-fit: cover; border: 1px solid var(--border-light);">
          <div>
            <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin: 0 0 0.25rem 0;">
              ${neg.productName}
            </h3>
            <div style="font-size: 0.85rem; color: var(--text-muted);">
              Kuantitas Pasokan yang Diajukan: <strong style="color: var(--text-main);">${neg.quantity.toLocaleString('id-ID')} ${neg.productUnit}</strong>
            </div>
          </div>
        </div>

        <!-- Price Comparison Grid (Original vs Offered vs Counter) -->
        <div class="price-comparison-grid">
          <div class="price-stat-box original">
            <span class="price-stat-label">1. Harga Normal Katalog</span>
            <span class="price-stat-value">Rp ${neg.initialPrice.toLocaleString('id-ID')} / ${neg.productUnit}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
              Total Normal: Rp ${(neg.initialPrice * neg.quantity).toLocaleString('id-ID')}
            </span>
          </div>

          <div class="price-stat-box offered">
            <span class="price-stat-label">2. Penawaran Pembeli</span>
            <span class="price-stat-value">Rp ${neg.offerPrice.toLocaleString('id-ID')} / ${neg.productUnit}</span>
            <span class="discount-tag">
              Hemat Rp ${totalSaving.toLocaleString('id-ID')} (-${discountPercent}%)
            </span>
          </div>

          <div class="price-stat-box counter">
            <span class="price-stat-label">3. Respon / Harga Balasan Penjual</span>
            ${neg.counterPrice ? `
              <span class="price-stat-value">Rp ${neg.counterPrice.toLocaleString('id-ID')} / ${neg.productUnit}</span>
              <span class="discount-tag green">
                Tawar Balik: Rp ${(neg.counterPrice * neg.quantity).toLocaleString('id-ID')}
              </span>
            ` : neg.status === 'Disetujui' ? `
              <span style="font-size: 1.1rem; font-weight: 800; color: #047857;">Disetujui di Rp ${neg.offerPrice.toLocaleString('id-ID')}</span>
              <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Penjual menerima harga pembeli</span>
            ` : neg.status === 'Ditolak' ? `
              <span style="font-size: 1.1rem; font-weight: 800; color: #b91c1c;">Ditolak</span>
              <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Penjual menolak penawaran</span>
            ` : `
              <span style="font-size: 0.9rem; color: var(--text-muted); font-style: italic;">Menunggu tanggapan...</span>
            `}
          </div>
        </div>

        <!-- Dialogue / History Timeline -->
        <div class="neg-history-box">
          <div class="neg-history-title">Catatan & Riwayat Tawar-Menawar</div>
          <div class="neg-timeline-list">
            ${(neg.history || []).map(h => `
              <div class="neg-bubble ${h.role === 'buyer' ? 'buyer' : 'seller'}">
                <div class="neg-bubble-meta">
                  <span>${h.role === 'buyer' ? '🛒 Pembeli (' + neg.buyerName + ')' : '📦 Penjual (' + neg.sellerName + ')'}</span>
                  <span>${h.time}</span>
                </div>
                <div style="color: var(--text-main); font-size: 0.85rem;">
                  ${h.note}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Action Toolbar -->
        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-light); flex-wrap: wrap;">
          <a href="#/chat?partnerId=${isSellerTab ? neg.buyerId : neg.sellerId}&negId=${neg.id}&productId=${neg.productId}" class="btn btn-secondary btn-sm" title="Chat langsung dengan rekan negosiasi">
            ${Icons.chat} Chat Negosiasi
          </a>

          <!-- Seller Action: Respond when status is Menunggu -->
          ${isSellerTab && neg.status === 'Menunggu' ? `
            <button class="btn btn-primary btn-sm btn-respond-neg" data-neg-id="${neg.id}">
              ${Icons.edit} Tanggapi Negosiasi (Terima / Tawar Balik / Tolak)
            </button>
          ` : ''}

          <!-- Buyer Action: When counter-offered or approved, can convert to order -->
          ${!isSellerTab && (neg.status === 'Disetujui' || neg.status === 'Dinegosiasi Balik') ? `
            <button class="btn btn-primary btn-sm btn-convert-po" data-neg-id="${neg.id}" style="background: linear-gradient(135deg, #059669, #047857);">
              ${Icons.checkCircle} Konversi Jadi Pesanan Resmi (PO)
            </button>
          ` : ''}

          ${neg.status === 'Dikonversi ke Pesanan' && neg.orderId ? `
            <a href="#/pesanan-detail?id=${neg.orderId}" class="btn btn-secondary btn-sm">
              ${Icons.eye} Lihat Dokumen PO (${neg.orderId})
            </a>
          ` : ''}
        </div>
      </div>
    `;
  },

  // Bind Events for Negosiasi Module
  bindEvents: (container) => {
    // Role tabs
    container.querySelector('#tab-neg-buyer-btn')?.addEventListener('click', () => {
      NegosiasiModule.activeRoleTab = 'buyer';
      NegosiasiModule.activeStatusFilter = 'all';
      NegosiasiModule.render(container, new URLSearchParams('tab=buyer'));
    });

    container.querySelector('#tab-neg-seller-btn')?.addEventListener('click', () => {
      NegosiasiModule.activeRoleTab = 'seller';
      NegosiasiModule.activeStatusFilter = 'all';
      NegosiasiModule.render(container, new URLSearchParams('tab=seller'));
    });

    // Status chips
    container.querySelectorAll('.chip-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        NegosiasiModule.activeStatusFilter = btn.getAttribute('data-status');
        NegosiasiModule.render(container, new URLSearchParams(`tab=${NegosiasiModule.activeRoleTab}`));
      });
    });

    // Search input
    container.querySelector('#neg-search-input')?.addEventListener('input', (e) => {
      NegosiasiModule.searchQuery = e.target.value;
      NegosiasiModule.render(container, new URLSearchParams(`tab=${NegosiasiModule.activeRoleTab}`));
    });

    // Clear search
    container.querySelector('#clear-neg-search-btn')?.addEventListener('click', () => {
      NegosiasiModule.searchQuery = '';
      NegosiasiModule.render(container, new URLSearchParams(`tab=${NegosiasiModule.activeRoleTab}`));
    });

    // Open create modal button
    container.querySelector('#btn-open-create-neg-modal')?.addEventListener('click', () => {
      NegosiasiModule.openCreateModal(container);
    });

    container.querySelector('#empty-state-create-btn')?.addEventListener('click', () => {
      NegosiasiModule.openCreateModal(container);
    });

    // Open seller response modal
    container.querySelectorAll('.btn-respond-neg').forEach(btn => {
      btn.addEventListener('click', () => {
        const negId = btn.getAttribute('data-neg-id');
        NegosiasiModule.openRespondModal(container, negId);
      });
    });

    // Convert to PO button
    container.querySelectorAll('.btn-convert-po').forEach(btn => {
      btn.addEventListener('click', () => {
        const negId = btn.getAttribute('data-neg-id');
        NegosiasiModule.openConvertPOModal(container, negId);
      });
    });
  },

  // ==========================================
  // MODAL 1: AJUKAN NEGOSIASI BARU (BUYER)
  // ==========================================
  openCreateModal: (container, preselectedProductId = null) => {
    const products = appState.getProducts();
    const targetProduct = products.find(p => p.id === preselectedProductId) || products[0];

    const modalHost = container.querySelector('#neg-modal-container');
    if (!modalHost) return;

    modalHost.innerHTML = `
      <div class="modal-backdrop fade-in" id="create-neg-modal-backdrop" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
        <div class="modal-card" style="background: var(--bg-surface); border-radius: var(--radius-xl); max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-xl); border: 1px solid var(--border-light); padding: 2rem;">
          <!-- Modal Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-light);">
            <div>
              <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin: 0;">
                ${Icons.negosiasi} Ajukan Negosiasi Harga B2B
              </h2>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0.2rem 0 0;">
                Tawarkan harga pasokan grosir berdasarkan komitmen volume pembelian.
              </p>
            </div>
            <button id="close-neg-modal-btn" style="background: transparent; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">
              ${Icons.x}
            </button>
          </div>

          <form id="create-neg-form">
            <!-- Product Selector -->
            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label class="form-label" style="font-weight: 700; margin-bottom: 0.4rem; display: block;">
                Pilih Komoditas <span style="color: red;">*</span>
              </label>
              <select id="modal-product-select" class="form-input" style="padding: 0.65rem;">
                ${products.map(p => `
                  <option value="${p.id}" ${p.id === targetProduct.id ? 'selected' : ''}>
                    ${p.name} - Rp ${p.price.toLocaleString('id-ID')}/${p.unit} (Supplier: ${p.sellerName})
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Product Quick Info -->
            <div id="modal-prod-summary" style="background: var(--bg-app); border-radius: var(--radius-lg); padding: 1rem; margin-bottom: 1.25rem; border: 1px solid var(--border-light); display: flex; justify-content: space-between; font-size: 0.825rem;">
              <div>
                Harga Normal: <strong id="modal-normal-price" style="color: var(--text-main);">Rp ${targetProduct.price.toLocaleString('id-ID')} / ${targetProduct.unit}</strong>
              </div>
              <div>
                Min. Order: <strong id="modal-min-order" style="color: var(--color-primary);">${targetProduct.minOrder} ${targetProduct.unit}</strong>
              </div>
              <div>
                Stok: <strong id="modal-stock">${targetProduct.stock.toLocaleString('id-ID')} ${targetProduct.unit}</strong>
              </div>
            </div>

            <!-- Volume & Offer Price Inputs -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
              <div class="form-group">
                <label class="form-label" style="font-weight: 700; margin-bottom: 0.4rem; display: block;">
                  Jumlah Kuantitas (<span class="modal-unit">${targetProduct.unit}</span>) <span style="color: red;">*</span>
                </label>
                <input type="number" id="modal-qty-input" class="form-input" 
                       value="${targetProduct.minOrder}" 
                       min="${targetProduct.minOrder}" 
                       step="10" 
                       required>
              </div>

              <div class="form-group">
                <label class="form-label" style="font-weight: 700; margin-bottom: 0.4rem; display: block;">
                  Harga Tawaran Satuan (Rp) <span style="color: red;">*</span>
                </label>
                <input type="number" id="modal-offer-input" class="form-input" 
                       value="${Math.round(targetProduct.price * 0.92)}" 
                       max="${targetProduct.price - 100}" 
                       step="100" 
                       required>
              </div>
            </div>

            <!-- Savings Live Box -->
            <div id="modal-savings-box" style="background: #fef3c7; border: 1px solid #fde68a; border-radius: var(--radius-lg); padding: 0.85rem 1rem; margin-bottom: 1.25rem; font-size: 0.825rem; color: #b45309;">
              <div style="font-weight: 700; margin-bottom: 0.25rem;" id="modal-saving-text">
                Diskon Diajukan: -8% (Hemat Rp 0)
              </div>
              <div style="font-size: 0.775rem; color: #92400e;" id="modal-total-calc-text">
                Total Normal: Rp 0 ➔ Total Tawaran: Rp 0
              </div>
            </div>

            <!-- Buyer Justification Note -->
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label" style="font-weight: 700; margin-bottom: 0.4rem; display: block;">
                Alasan / Komitmen Pembelian <span style="color: red;">*</span>
              </label>
              <textarea id="modal-note-input" class="form-input" rows="3" 
                        placeholder="Contoh: Kami berencana memesan pasokan ini secara rutin setiap 2 minggu untuk kebutuhan industri binaan..." 
                        required>Kami berencana menjalin kontrak pasokan rutin bulanan untuk kebutuhan produksi mitra.</textarea>
              <div style="font-size: 0.725rem; color: var(--text-muted); margin-top: 0.25rem;">
                Tips: Supplier lebih mudah menyetujui tawaran bila Anda menyertakan rencana pembelian berulang atau volume besar.
              </div>
            </div>

            <!-- Actions -->
            <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
              <button type="button" class="btn btn-secondary" id="modal-cancel-btn">Batal</button>
              <button type="submit" class="btn btn-primary" id="modal-submit-btn">
                ${Icons.negosiasi} Kirim Penawaran Harga
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Modal Live Calculation and Events
    let activeProd = targetProduct;
    const prodSelect = modalHost.querySelector('#modal-product-select');
    const qtyInput = modalHost.querySelector('#modal-qty-input');
    const offerInput = modalHost.querySelector('#modal-offer-input');
    const savingText = modalHost.querySelector('#modal-saving-text');
    const totalCalcText = modalHost.querySelector('#modal-total-calc-text');

    const updateModalCalc = () => {
      const qty = parseInt(qtyInput.value, 10) || activeProd.minOrder;
      const offer = parseInt(offerInput.value, 10) || activeProd.price;
      const normalTotal = qty * activeProd.price;
      const offerTotal = qty * offer;
      const diff = normalTotal - offerTotal;
      const percent = Math.round((diff / normalTotal) * 100);

      savingText.textContent = `Diskon Diajukan: -${percent}% (Hemat Rp ${Math.max(0, diff).toLocaleString('id-ID')})`;
      totalCalcText.textContent = `Total Normal: Rp ${normalTotal.toLocaleString('id-ID')} ➔ Total Tawaran: Rp ${offerTotal.toLocaleString('id-ID')}`;
    };

    updateModalCalc();

    prodSelect?.addEventListener('change', (e) => {
      const found = products.find(p => p.id === e.target.value);
      if (found) {
        activeProd = found;
        modalHost.querySelector('#modal-normal-price').textContent = `Rp ${activeProd.price.toLocaleString('id-ID')} / ${activeProd.unit}`;
        modalHost.querySelector('#modal-min-order').textContent = `${activeProd.minOrder} ${activeProd.unit}`;
        modalHost.querySelector('#modal-stock').textContent = `${activeProd.stock.toLocaleString('id-ID')} ${activeProd.unit}`;
        modalHost.querySelectorAll('.modal-unit').forEach(el => el.textContent = activeProd.unit);

        qtyInput.min = activeProd.minOrder;
        qtyInput.value = activeProd.minOrder;
        offerInput.value = Math.round(activeProd.price * 0.92);
        offerInput.max = activeProd.price - 100;
        updateModalCalc();
      }
    });

    qtyInput?.addEventListener('input', updateModalCalc);
    offerInput?.addEventListener('input', updateModalCalc);

    const closeModal = () => {
      modalHost.innerHTML = '';
    };

    modalHost.querySelector('#close-neg-modal-btn')?.addEventListener('click', closeModal);
    modalHost.querySelector('#modal-cancel-btn')?.addEventListener('click', closeModal);
    modalHost.querySelector('#create-neg-modal-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'create-neg-modal-backdrop') closeModal();
    });

    modalHost.querySelector('#create-neg-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const qty = parseInt(qtyInput.value, 10);
      const offer = parseInt(offerInput.value, 10);
      const note = modalHost.querySelector('#modal-note-input').value.trim();

      if (qty < activeProd.minOrder) {
        alert(`Jumlah penawaran (${qty}) kurang dari batas minimum order (${activeProd.minOrder} ${activeProd.unit}).`);
        return;
      }

      if (offer >= activeProd.price) {
        alert(`Harga penawaran harus lebih murah dari harga normal (Rp ${activeProd.price.toLocaleString('id-ID')}).`);
        return;
      }

      const res = appState.createNegotiation({
        productId: activeProd.id,
        quantity: qty,
        offerPrice: offer,
        buyerNote: note
      });

      if (res.success) {
        closeModal();
        NegosiasiModule.showToast(`Penawaran #${res.negotiation.id} berhasil diajukan ke penjual!`);
        NegosiasiModule.activeRoleTab = 'buyer';
        NegosiasiModule.render(container, new URLSearchParams('tab=buyer'));
      } else {
        alert(res.message || 'Gagal mengajukan negosiasi.');
      }
    });
  },

  // ==========================================
  // MODAL 2: TANGGAPI NEGOSIASI (SELLER FLOW)
  // ==========================================
  openRespondModal: (container, negId) => {
    const neg = appState.getNegotiationById(negId);
    if (!neg) return;

    const modalHost = container.querySelector('#neg-modal-container');
    if (!modalHost) return;

    modalHost.innerHTML = `
      <div class="modal-backdrop fade-in" id="respond-neg-modal-backdrop" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
        <div class="modal-card" style="background: var(--bg-surface); border-radius: var(--radius-xl); max-width: 620px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-xl); border: 1px solid var(--border-light); padding: 2rem;">
          <!-- Modal Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-light);">
            <div>
              <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin: 0;">
                Tanggapi Negosiasi #${neg.id}
              </h2>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0.2rem 0 0;">
                Dari Pembeli: <strong>${neg.buyerName}</strong> • Komoditas: <strong>${neg.productName}</strong>
              </p>
            </div>
            <button id="close-respond-modal-btn" style="background: transparent; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">
              ${Icons.x}
            </button>
          </div>

          <!-- Summary of Buyer Bid -->
          <div style="background: var(--bg-app); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 1.25rem; margin-bottom: 1.5rem;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.85rem; margin-bottom: 0.75rem;">
              <div>Volume Diminta: <strong>${neg.quantity.toLocaleString('id-ID')} ${neg.productUnit}</strong></div>
              <div>Harga Normal: <strong style="text-decoration: line-through; color: var(--text-muted);">Rp ${neg.initialPrice.toLocaleString('id-ID')}</strong></div>
              <div>Tawaran Pembeli: <strong style="color: #d97706; font-size: 1.05rem;">Rp ${neg.offerPrice.toLocaleString('id-ID')} / ${neg.productUnit}</strong></div>
              <div>Potensi Total PO: <strong style="color: var(--color-primary);">Rp ${(neg.offerPrice * neg.quantity).toLocaleString('id-ID')}</strong></div>
            </div>
            <div style="background: #ffffff; border-radius: var(--radius-md); padding: 0.75rem; font-size: 0.825rem; border: 1px solid var(--border-light); color: var(--text-muted);">
              <strong>Pesan Pembeli:</strong> "${neg.buyerNote || '-'}"
            </div>
          </div>

          <form id="respond-neg-form">
            <!-- 3 Decision Choices -->
            <label class="form-label" style="font-weight: 700; margin-bottom: 0.6rem; display: block;">
              Pilih Keputusan Anda Sebagai Penjual: <span style="color: red;">*</span>
            </label>
            <div class="response-choice-grid">
              <div class="choice-btn selected" data-choice="accept" id="choice-accept">
                <span class="choice-icon">✅</span>
                <span class="choice-title" style="color: #047857;">Terima Tawaran</span>
                <span class="choice-desc">Sepakati harga Rp ${neg.offerPrice.toLocaleString('id-ID')}</span>
              </div>

              <div class="choice-btn" data-choice="counter" id="choice-counter">
                <span class="choice-icon">🔄</span>
                <span class="choice-title" style="color: #d97706;">Tawar Balik</span>
                <span class="choice-desc">Ajukan harga kompromi baru</span>
              </div>

              <div class="choice-btn" data-choice="reject" id="choice-reject">
                <span class="choice-icon">❌</span>
                <span class="choice-title" style="color: #b91c1c;">Tolak Tawaran</span>
                <span class="choice-desc">Tolak dan akhiri negosiasi</span>
              </div>
            </div>

            <!-- Counter-Offer Price Input (Visible when 'counter' is selected) -->
            <div id="counter-price-group" style="display: none; margin-bottom: 1.25rem;">
              <label class="form-label" style="font-weight: 700; margin-bottom: 0.4rem; display: block;">
                Masukkan Harga Balasan Anda (Rp / ${neg.productUnit}) <span style="color: red;">*</span>
              </label>
              <input type="number" id="counter-price-input" class="form-input" 
                     value="${Math.round((neg.initialPrice + neg.offerPrice) / 2)}" 
                     min="${neg.offerPrice + 100}" 
                     max="${neg.initialPrice}" 
                     step="100">
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
                Tawarkan harga jalan tengah antara tawaran pembeli (Rp ${neg.offerPrice.toLocaleString('id-ID')}) dan harga normal (Rp ${neg.initialPrice.toLocaleString('id-ID')}).
              </div>
            </div>

            <!-- Seller Response Message -->
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label" style="font-weight: 700; margin-bottom: 0.4rem; display: block;">
                Catatan Respon ke Pembeli
              </label>
              <textarea id="seller-msg-input" class="form-input" rows="3" 
                        placeholder="Contoh: Kami setujui tawaran Anda dengan ketentuan pengambilan langsung di gudang desa..."></textarea>
            </div>

            <!-- Modal Action Buttons -->
            <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
              <button type="button" class="btn btn-secondary" id="respond-cancel-btn">Batal</button>
              <button type="submit" class="btn btn-primary" id="respond-submit-btn">
                ${Icons.check} Kirim Tanggapan Resmi
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    let selectedAction = 'accept';
    const counterGroup = modalHost.querySelector('#counter-price-group');
    const counterInput = modalHost.querySelector('#counter-price-input');
    const msgInput = modalHost.querySelector('#seller-msg-input');

    // Default message for accept
    msgInput.value = 'Penawaran harga Anda kami terima. Silakan terbitkan Purchase Order resmi agar kami siapkan pasokan komoditas.';

    const setChoice = (action) => {
      selectedAction = action;
      modalHost.querySelectorAll('.choice-btn').forEach(btn => {
        if (btn.getAttribute('data-choice') === action) {
          btn.classList.add('selected');
        } else {
          btn.classList.remove('selected');
        }
      });

      if (action === 'counter') {
        counterGroup.style.display = 'block';
        msgInput.value = `Kami tawarkan harga jalan tengah di Rp ${parseInt(counterInput.value, 10).toLocaleString('id-ID')}/${neg.productUnit} untuk menjaga kualitas mutu panen.`;
      } else if (action === 'reject') {
        counterGroup.style.display = 'none';
        msgInput.value = 'Mohon maaf penawaran harga belum dapat kami terima karena di bawah HPP biaya produksi tani kami.';
      } else {
        counterGroup.style.display = 'none';
        msgInput.value = 'Penawaran harga Anda kami terima. Silakan terbitkan Purchase Order resmi agar kami siapkan pasokan komoditas.';
      }
    };

    modalHost.querySelector('#choice-accept')?.addEventListener('click', () => setChoice('accept'));
    modalHost.querySelector('#choice-counter')?.addEventListener('click', () => setChoice('counter'));
    modalHost.querySelector('#choice-reject')?.addEventListener('click', () => setChoice('reject'));

    counterInput?.addEventListener('input', () => {
      const val = parseInt(counterInput.value, 10) || 0;
      msgInput.value = `Kami tawarkan harga jalan tengah di Rp ${val.toLocaleString('id-ID')}/${neg.productUnit} untuk menjaga kualitas mutu panen.`;
    });

    const closeRespondModal = () => {
      modalHost.innerHTML = '';
    };

    modalHost.querySelector('#close-respond-modal-btn')?.addEventListener('click', closeRespondModal);
    modalHost.querySelector('#respond-cancel-btn')?.addEventListener('click', closeRespondModal);
    modalHost.querySelector('#respond-neg-modal-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'respond-neg-modal-backdrop') closeRespondModal();
    });

    modalHost.querySelector('#respond-neg-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const message = msgInput.value.trim();
      const counterPrice = selectedAction === 'counter' ? counterInput.value : null;

      const res = appState.respondNegotiation(neg.id, selectedAction, counterPrice, message);
      if (res.success) {
        closeRespondModal();
        NegosiasiModule.showToast(`Respon negosiasi #${neg.id} berhasil dikirim!`);
        NegosiasiModule.render(container, new URLSearchParams('tab=seller'));
      } else {
        alert(res.message || 'Gagal mengirim respon.');
      }
    });
  },

  // ==========================================
  // MODAL 3: KONVERSI NEGOSIASI KE PESANAN PO
  // ==========================================
  openConvertPOModal: (container, negId) => {
    const neg = appState.getNegotiationById(negId);
    if (!neg) return;

    const user = appState.getState().user;
    const finalPrice = neg.counterPrice || neg.offerPrice;
    const subtotal = finalPrice * neg.quantity;
    const shipping = 250000;
    const total = subtotal + shipping;

    const modalHost = container.querySelector('#neg-modal-container');
    if (!modalHost) return;

    modalHost.innerHTML = `
      <div class="modal-backdrop fade-in" id="convert-po-modal-backdrop" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
        <div class="modal-card" style="background: var(--bg-surface); border-radius: var(--radius-xl); max-width: 580px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-xl); border: 1px solid var(--border-light); padding: 2rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; padding-bottom: 0.85rem; border-bottom: 1px solid var(--border-light);">
            <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin: 0;">
              Konversi Jadi Purchase Order (PO)
            </h2>
            <button id="close-convert-modal-btn" style="background: transparent; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">
              ${Icons.x}
            </button>
          </div>

          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: var(--radius-lg); padding: 1rem; margin-bottom: 1.25rem; font-size: 0.85rem; color: #065f46;">
            <strong>Harga Kesepakatan: Rp ${finalPrice.toLocaleString('id-ID')} / ${neg.productUnit}</strong>
            <p style="margin: 0.25rem 0 0; font-size: 0.8rem;">
              Negosiasi #${neg.id} akan dikonversi menjadi dokumen Purchase Order resmi B2B.
            </p>
          </div>

          <form id="convert-po-form">
            <div class="order-calc-card" style="margin-bottom: 1.25rem;">
              <div class="calc-row">
                <span>Komoditas:</span>
                <strong style="color: var(--text-main);">${neg.productName}</strong>
              </div>
              <div class="calc-row">
                <span>Volume Pasokan:</span>
                <strong>${neg.quantity.toLocaleString('id-ID')} ${neg.productUnit}</strong>
              </div>
              <div class="calc-row">
                <span>Subtotal Harga Kesepakatan:</span>
                <strong style="color: var(--color-primary);">Rp ${subtotal.toLocaleString('id-ID')}</strong>
              </div>
              <div class="calc-row">
                <span>Armada Logistik Desa:</span>
                <strong>Rp ${shipping.toLocaleString('id-ID')}</strong>
              </div>
              <div class="calc-row total">
                <span>Total Purchase Order:</span>
                <span>Rp ${total.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label class="form-label" style="font-weight: 700; margin-bottom: 0.4rem; display: block;">
                Alamat Tujuan Pengiriman Gudang
              </label>
              <textarea id="convert-address-input" class="form-input" rows="2">${user.address || ''}, ${user.village || ''}, ${user.district || ''}, ${user.regency || ''}</textarea>
            </div>

            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label" style="font-weight: 700; margin-bottom: 0.4rem; display: block;">
                Catatan Kontrak PO
              </label>
              <textarea id="convert-notes-input" class="form-input" rows="2">Pesanan diterbitkan berdasarkan kesepakatan negosiasi harga #${neg.id}.</textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
              <button type="button" class="btn btn-secondary" id="convert-cancel-btn">Batal</button>
              <button type="submit" class="btn btn-primary">
                ${Icons.checkCircle} Konfirmasi & Terbitkan PO
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeConvertModal = () => {
      modalHost.innerHTML = '';
    };

    modalHost.querySelector('#close-convert-modal-btn')?.addEventListener('click', closeConvertModal);
    modalHost.querySelector('#convert-cancel-btn')?.addEventListener('click', closeConvertModal);
    modalHost.querySelector('#convert-po-modal-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'convert-po-modal-backdrop') closeConvertModal();
    });

    modalHost.querySelector('#convert-po-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const addr = modalHost.querySelector('#convert-address-input').value.trim();
      const notes = modalHost.querySelector('#convert-notes-input').value.trim();

      const res = appState.convertNegotiationToOrder(neg.id, addr, notes);
      if (res.success) {
        closeConvertModal();
        NegosiasiModule.showToast(`Purchase Order #${res.order.id} berhasil diterbitkan dari negosiasi!`);
        window.location.hash = `#/pesanan-detail?id=${res.order.id}`;
      } else {
        alert(res.message || 'Gagal mengonversi negosiasi.');
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
