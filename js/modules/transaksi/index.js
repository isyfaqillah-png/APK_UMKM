// DesaBiz AI - Modul Transaksi & Faktur Digital B2B
import { Icons } from '../../icons.js';
import { appState } from '../../state.js';

export const TransaksiModule = {
  id: 'transaksi',
  title: 'Transaksi & Keuangan B2B',
  subtitle: 'Faktur digital, rekonsiliasi arus kas pengadaan & penjualan komoditas desa',

  // Active module states
  activeTab: 'all', // 'buy' (pembelian), 'sell' (penjualan), 'all' (riwayat semua)
  activeStatusFilter: 'all', // 'all', 'Selesai / Lunas', 'Dibayar / Lunas', 'Menunggu Pembayaran', 'Dibatalkan'
  searchQuery: '',

  render: (container, params = new URLSearchParams(), routeKey = 'transaksi') => {
    const user = appState.getState().user;
    if (!user) return;

    // Check if viewing single transaction detail / invoice
    const trxId = params.get('id');
    if (routeKey === 'transaksi-detail' || trxId) {
      TransaksiModule.renderInvoiceDetail(container, trxId);
      return;
    }

    // Check tab query param
    const tabParam = params.get('tab');
    if (tabParam && ['buy', 'sell', 'all'].includes(tabParam)) {
      TransaksiModule.activeTab = tabParam;
    }

    // Check status query param
    const statusParam = params.get('status');
    if (statusParam) {
      TransaksiModule.activeStatusFilter = statusParam;
    }

    TransaksiModule.renderTransactionList(container);
  },

  // ==========================================
  // VIEW A: LIST TRANSAKSI (PEMBELIAN, PENJUALAN, RIWAYAT)
  // ==========================================
  renderTransactionList: (container) => {
    const user = appState.getState().user;
    const currentUserId = user?.id || 'usr_01';

    // Fetch filtered transactions
    const transactions = appState.getTransactions(
      TransaksiModule.activeTab,
      TransaksiModule.activeStatusFilter,
      TransaksiModule.searchQuery
    );

    // Calculate Financial KPIs
    const allUserTrx = appState.getTransactions('all', 'all', '');
    const buyTrx = allUserTrx.filter(t => t.buyerId === currentUserId);
    const sellTrx = allUserTrx.filter(t => t.sellerId === currentUserId);

    const totalBelanja = buyTrx
      .filter(t => t.status !== 'Dibatalkan')
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

    const totalOmzet = sellTrx
      .filter(t => t.status !== 'Dibatalkan')
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

    const lunasCount = allUserTrx.filter(t => t.status === 'Selesai / Lunas' || t.status === 'Dibayar / Lunas').length;
    const pendingCount = allUserTrx.filter(t => t.status === 'Menunggu Pembayaran').length;

    container.innerHTML = `
      <div class="fade-in">
        <!-- Page Header -->
        <div class="page-header" style="margin-bottom: 1.25rem;">
          <div class="page-header-info">
            <div class="breadcrumbs">
              <a href="#/dashboard">Beranda</a>
              <span class="breadcrumb-separator">/</span>
              <span class="breadcrumb-item active">Transaksi B2B</span>
            </div>
            <h1 class="page-title">${TransaksiModule.title}</h1>
            <p class="page-subtitle">${TransaksiModule.subtitle}</p>
          </div>
          <div class="page-header-actions flex gap-2">
            <a href="#/pesanan-buat" class="btn btn-secondary btn-sm">
              ${Icons.plus} Buat PO Baru
            </a>
            <button class="btn btn-primary btn-sm" id="btn-export-csv">
              Unduh Rekap Laporan
            </button>
          </div>
        </div>

        <!-- 1. KPI SUMMARY METRICS -->
        <div class="stock-stats-grid" style="margin-bottom: 1.5rem;">
          <!-- Omzet Penjualan -->
          <div class="stock-stat-card">
            <div class="stock-stat-icon" style="background: #ecfdf5; color: #059669;">
              ${Icons.trendingUp}
            </div>
            <div class="stock-stat-info">
              <span class="stock-stat-value" style="color: #059669;">Rp ${(totalOmzet / 1000000).toFixed(1)} Jt</span>
              <span class="stock-stat-label">Total Penjualan (Omzet)</span>
            </div>
          </div>

          <!-- Belanja Pengadaan -->
          <div class="stock-stat-card">
            <div class="stock-stat-icon" style="background: #eff6ff; color: #2563eb;">
              ${Icons.transaksi}
            </div>
            <div class="stock-stat-info">
              <span class="stock-stat-value" style="color: #2563eb;">Rp ${(totalBelanja / 1000000).toFixed(1)} Jt</span>
              <span class="stock-stat-label">Total Pembelian (Belanja)</span>
            </div>
          </div>

          <!-- Transaksi Lunas -->
          <div class="stock-stat-card">
            <div class="stock-stat-icon" style="background: #f0fdf4; color: #16a34a;">
              ${Icons.checkCircle}
            </div>
            <div class="stock-stat-info">
              <span class="stock-stat-value" style="color: #16a34a;">${lunasCount}</span>
              <span class="stock-stat-label">Transaksi Berhasil / Lunas</span>
            </div>
          </div>

          <!-- Menunggu Pembayaran -->
          <div class="stock-stat-card" style="${pendingCount > 0 ? 'border-color: #fde68a; background: #fffdf5;' : ''}">
            <div class="stock-stat-icon" style="background: #fef3c7; color: #d97706;">
              ⏳
            </div>
            <div class="stock-stat-info">
              <span class="stock-stat-value" style="color: #d97706;">${pendingCount}</span>
              <span class="stock-stat-label">Menunggu Pembayaran</span>
            </div>
          </div>
        </div>

        <!-- 2. NAVIGATION TABS (PEMBELIAN, PENJUALAN, RIWAYAT) -->
        <div class="trx-tabs-wrap">
          <button 
            type="button" 
            class="trx-tab-btn ${TransaksiModule.activeTab === 'all' ? 'active' : ''}" 
            data-tab="all"
          >
            📋 Riwayat Semua Transaksi (${allUserTrx.length})
          </button>
          <button 
            type="button" 
            class="trx-tab-btn ${TransaksiModule.activeTab === 'buy' ? 'active' : ''}" 
            data-tab="buy"
          >
            🛒 Transaksi Pembelian (${buyTrx.length})
          </button>
          <button 
            type="button" 
            class="trx-tab-btn ${TransaksiModule.activeTab === 'sell' ? 'active' : ''}" 
            data-tab="sell"
          >
            💰 Transaksi Penjualan (${sellTrx.length})
          </button>
        </div>

        <!-- 3. TOOLBAR: SEARCH & STATUS FILTER CHIPS -->
        <div class="marketplace-toolbar" style="padding: 1rem 1.25rem; margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
            <!-- Filter Status Chips -->
            <div class="category-chips-wrap" style="padding-bottom: 0;">
              <button 
                type="button" 
                class="category-chip ${TransaksiModule.activeStatusFilter === 'all' ? 'active' : ''}" 
                data-status="all"
              >
                Semua Status
              </button>
              <button 
                type="button" 
                class="category-chip ${TransaksiModule.activeStatusFilter === 'Selesai / Lunas' ? 'active' : ''}" 
                data-status="Selesai / Lunas"
              >
                🟢 Selesai / Lunas
              </button>
              <button 
                type="button" 
                class="category-chip ${TransaksiModule.activeStatusFilter === 'Menunggu Pembayaran' ? 'active' : ''}" 
                data-status="Menunggu Pembayaran"
              >
                🟡 Menunggu Pembayaran
              </button>
              <button 
                type="button" 
                class="category-chip ${TransaksiModule.activeStatusFilter === 'Dibatalkan' ? 'active' : ''}" 
                data-status="Dibatalkan"
              >
                🔴 Dibatalkan
              </button>
            </div>

            <!-- Search input -->
            <div style="position: relative; min-width: 250px; flex: 1; max-width: 340px;">
              <span style="position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); display: flex;">
                ${Icons.search}
              </span>
              <input 
                type="text" 
                id="trx-search-input" 
                class="form-control" 
                placeholder="Cari ID TRX, PO, komoditas, rekan..." 
                value="${TransaksiModule.searchQuery}"
                style="padding: 0.5rem 0.85rem 0.5rem 2.25rem; font-size: 0.85rem;"
              />
            </div>
          </div>
        </div>

        <!-- 4. TRANSACTIONS LIST -->
        <div class="trx-card-grid">
          ${transactions.length === 0 ? `
            <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-xl); padding: 3.5rem 1.5rem; text-align: center; color: var(--text-muted);">
              <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🧾</div>
              <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.35rem;">
                Tidak ada data transaksi yang sesuai
              </h3>
              <p style="font-size: 0.85rem; max-width: 420px; margin: 0 auto 1.25rem;">
                Belum ditemukan catatan transaksi untuk tab atau filter ini. Lakukan pemesanan komoditas untuk memulai transaksi.
              </p>
              <a href="#/pesanan-buat" class="btn btn-primary btn-sm">
                ${Icons.plus} Buat Pesanan Baru
              </a>
            </div>
          ` : transactions.map(t => {
            const isBuyer = t.buyerId === currentUserId;
            const partnerName = isBuyer ? t.sellerName : t.buyerName;
            const roleLabel = isBuyer ? 'Pembelian / Belanja' : 'Penjualan / Omzet';
            const roleBadgeStyle = isBuyer 
              ? 'background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;' 
              : 'background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;';

            let statusBadge = `<span class="badge badge-success">● ${t.status}</span>`;
            if (t.status === 'Menunggu Pembayaran') {
              statusBadge = `<span class="badge badge-warning" style="background: #fffbeb; color: #b45309; border-color: #fde68a;">⏳ ${t.status}</span>`;
            } else if (t.status === 'Dibatalkan') {
              statusBadge = `<span class="badge badge-danger">🛑 ${t.status}</span>`;
            }

            return `
              <div class="trx-card">
                <!-- Header -->
                <div class="trx-card-header">
                  <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
                    <strong style="font-size: 1rem; color: var(--text-main); letter-spacing: -0.01em;">
                      ${t.id}
                    </strong>
                    <span style="font-size: 0.725rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: var(--radius-sm); ${roleBadgeStyle}">
                      ${roleLabel}
                    </span>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">
                      • ${t.invoiceNumber || 'No Faktur Otomatis'}
                    </span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">
                      📅 ${t.date}
                    </span>
                    ${statusBadge}
                  </div>
                </div>

                <!-- Body -->
                <div class="trx-card-body">
                  <!-- Product thumbnail & name -->
                  <div style="display: flex; align-items: center; gap: 1rem; min-width: 260px; flex: 1.5;">
                    <img 
                      src="${t.productImage}" 
                      alt="${t.productName}" 
                      style="width: 52px; height: 52px; border-radius: var(--radius-md); object-fit: cover; border: 1px solid var(--border-light); flex-shrink: 0;"
                      onerror="this.src='https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'"
                    />
                    <div>
                      <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--text-main); margin: 0 0 0.2rem;">
                        ${t.productName}
                      </h4>
                      <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">
                        ${isBuyer ? 'Penjual (Supplier):' : 'Pembeli:'} <strong>${partnerName}</strong>
                      </p>
                    </div>
                  </div>

                  <!-- Volume & Unit Price -->
                  <div style="display: flex; gap: 2rem; align-items: center; flex: 1; justify-content: flex-end; flex-wrap: wrap;">
                    <div>
                      <span style="font-size: 0.725rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; display: block;">
                        Kuantitas:
                      </span>
                      <strong style="font-size: 0.95rem; color: var(--text-main);">
                        ${(t.quantity || 0).toLocaleString('id-ID')} ${t.productUnit || 'Kg'}
                      </strong>
                    </div>

                    <div>
                      <span style="font-size: 0.725rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; display: block;">
                        Harga Satuan:
                      </span>
                      <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-main);">
                        Rp ${(t.unitPrice || 0).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <!-- Total Amount -->
                    <div style="text-align: right; min-width: 140px;">
                      <span style="font-size: 0.725rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; display: block;">
                        Total Tagihan:
                      </span>
                      <strong style="font-size: 1.15rem; font-weight: 900; color: var(--color-primary-dark);">
                        Rp ${(t.totalAmount || 0).toLocaleString('id-ID')}
                      </strong>
                    </div>
                  </div>
                </div>

                <!-- Footer -->
                <div class="trx-card-footer">
                  <div style="display: flex; align-items: center; gap: 1rem; font-size: 0.8rem; color: var(--text-muted); flex-wrap: wrap;">
                    <span>Ref PO: <a href="#/pesanan-detail?id=${t.orderId}" style="color: var(--color-primary); font-weight: 700; text-decoration: underline;">#${t.orderId}</a></span>
                    <span>•</span>
                    <span>Metode: <strong style="color: var(--text-main);">${t.paymentMethod || 'Transfer Rekening DesaBiz'}</strong></span>
                  </div>

                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    ${t.status === 'Menunggu Pembayaran' ? `
                      <button 
                        class="btn btn-secondary btn-sm btn-mark-paid" 
                        data-id="${t.id}"
                        style="background: #ecfdf5; color: #047857; border-color: #a7f3d0; font-weight: 700;"
                      >
                        ${Icons.check} Catat / Bayar
                      </button>
                    ` : ''}

                    <a href="#/transaksi-detail?id=${t.id}" class="btn btn-primary btn-sm">
                      ${Icons.eye} Faktur Digital
                    </a>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- MODAL SLOT -->
        <div id="trx-modal-slot"></div>
      </div>
    `;

    TransaksiModule.attachListEvents(container);
  },

  attachListEvents: (container) => {
    // 1. Tab buttons
    const tabBtns = container.querySelectorAll('.trx-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        TransaksiModule.activeTab = btn.dataset.tab;
        TransaksiModule.renderTransactionList(container);
      });
    });

    // 2. Status filter chips
    const statusChips = container.querySelectorAll('.category-chip');
    statusChips.forEach(chip => {
      chip.addEventListener('click', () => {
        TransaksiModule.activeStatusFilter = chip.dataset.status;
        TransaksiModule.renderTransactionList(container);
      });
    });

    // 3. Search input
    const searchInput = container.querySelector('#trx-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        TransaksiModule.searchQuery = e.target.value;
        TransaksiModule.renderTransactionList(container);
      });
    }

    // 4. Export CSV button
    const exportBtn = container.querySelector('#btn-export-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        TransaksiModule.exportToCSV();
      });
    }

    // 5. Mark paid button
    container.addEventListener('click', (e) => {
      const payBtn = e.target.closest('.btn-mark-paid');
      if (payBtn) {
        const id = payBtn.dataset.id;
        TransaksiModule.openPaymentModal(id);
      }
    });
  },

  // ==========================================
  // VIEW B: DETAIL TRANSAKSI / FAKTUR DIGITAL (INVOICE)
  // ==========================================
  renderInvoiceDetail: (container, trxId) => {
    const trx = appState.getTransactionById(trxId);
    if (!trx) {
      container.innerHTML = `
        <div class="fade-in" style="padding: 3rem 1.5rem; text-align: center;">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🔍</div>
          <h2>Transaksi Tidak Ditemukan</h2>
          <p style="color: var(--text-muted); margin-bottom: 1.5rem;">ID transaksi '${trxId}' tidak ada dalam basis data.</p>
          <a href="#/transaksi" class="btn btn-primary">Kembali ke Daftar Transaksi</a>
        </div>
      `;
      return;
    }

    const user = appState.getState().user;
    const isBuyer = trx.buyerId === user?.id;
    const isSeller = trx.sellerId === user?.id;
    const partnerId = isBuyer ? trx.sellerId : trx.buyerId;
    const isPaid = trx.status === 'Selesai / Lunas' || trx.status === 'Dibayar / Lunas';

    container.innerHTML = `
      <div class="fade-in">
        <!-- Top Action Navigation Bar -->
        <div class="invoice-actions-bar" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div class="breadcrumbs">
            <a href="#/dashboard">Beranda</a>
            <span class="breadcrumb-separator">/</span>
            <a href="#/transaksi">Transaksi B2B</a>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-item active">Faktur #${trx.id}</span>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <a href="#/transaksi" class="btn btn-secondary btn-sm">
              ${Icons.arrowLeft} Kembali
            </a>
            <a href="#/chat?partnerId=${partnerId}&productId=${trx.productId}&orderId=${trx.orderId}" class="btn btn-secondary btn-sm">
              ${Icons.chat} Chat Rekan Bisnis
            </a>
            ${trx.orderId ? `
              <a href="#/pesanan-detail?id=${trx.orderId}" class="btn btn-secondary btn-sm">
                ${Icons.pesanan} Lihat PO #${trx.orderId}
              </a>
            ` : ''}
            <button class="btn btn-primary btn-sm" id="btn-print-invoice" style="background: #0f766e; border-color: #0f766e;">
              🖨️ Cetak / Simpan PDF
            </button>
          </div>
        </div>

        <!-- LEMBAR FAKTUR DIGITAL (INVOICE SHEET) -->
        <div class="invoice-sheet" id="invoice-sheet-container">
          <!-- Kop Faktur -->
          <div class="invoice-header-row">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 50px; height: 50px; border-radius: var(--radius-lg); background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 900;">
                DB
              </div>
              <div>
                <h2 style="font-size: 1.4rem; font-weight: 900; color: var(--text-main); margin: 0; line-height: 1.2;">
                  FAKTUR TRANSAKSI B2B
                </h2>
                <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">
                  Platform Agribisnis Pedesaan DesaBiz AI
                </span>
              </div>
            </div>

            <!-- Stempel & Meta Invoice -->
            <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
              <div class="invoice-stamp ${isPaid ? 'paid' : (trx.status === 'Dibatalkan' ? 'pending' : 'pending')}">
                ${isPaid ? 'LUNAS' : (trx.status === 'Dibatalkan' ? 'DIBATALKAN' : 'MENUNGGU PEMBAYARAN')}
              </div>
              <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;">
                <div>No. Faktur: <strong style="color: var(--text-main);">${trx.invoiceNumber || 'INV-DBZ-2026-000'}</strong></div>
                <div>ID Transaksi: <strong style="color: var(--text-main);">${trx.id}</strong></div>
                <div>Tanggal: <strong>${trx.date}</strong></div>
              </div>
            </div>
          </div>

          <!-- Pihak Terlibat: Penjual vs Pembeli -->
          <div class="invoice-parties-grid">
            <!-- Penjual (Penerbit Faktur) -->
            <div class="invoice-party-box">
              <div class="invoice-party-label">Diterbitkan Oleh (Penjual / Supplier):</div>
              <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin: 0 0 0.35rem;">
                ${trx.sellerName}
              </h3>
              <div style="font-size: 0.825rem; color: var(--text-muted); line-height: 1.5;">
                <div>📍 Lokasi: ${trx.sellerLocation || 'Sentra Pertanian Jawa Barat'}</div>
                <div>📞 Kontak PIC: ${trx.sellerContact || '-'}</div>
                <div style="margin-top: 0.35rem; color: var(--color-primary-dark); font-weight: 600;">
                  ✓ Rekening Terverifikasi DesaBiz AI
                </div>
              </div>
            </div>

            <!-- Pembeli (Ditagihkan Kepada) -->
            <div class="invoice-party-box">
              <div class="invoice-party-label">Ditagihkan Kepada (Pembeli):</div>
              <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin: 0 0 0.35rem;">
                ${trx.buyerName}
              </h3>
              <div style="font-size: 0.825rem; color: var(--text-muted); line-height: 1.5;">
                <div>📍 Alamat Kirim: ${trx.buyerAddress || 'Gudang Pembeli'}</div>
                <div>📞 Kontak PIC: ${trx.buyerContact || '-'}</div>
                <div style="margin-top: 0.35rem; color: #475569; font-weight: 600;">
                  Referensi PO: #${trx.orderId}
                </div>
              </div>
            </div>
          </div>

          <!-- Tabel Rincian Komoditas -->
          <div class="invoice-table-wrap">
            <table class="invoice-table">
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;">No</th>
                  <th>Deskripsi Komoditas</th>
                  <th style="text-align: right;">Kuantitas</th>
                  <th style="text-align: right;">Harga Satuan B2B</th>
                  <th style="text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: center; font-weight: 700; color: var(--text-muted);">1</td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                      <img 
                        src="${trx.productImage}" 
                        alt="${trx.productName}" 
                        style="width: 44px; height: 44px; border-radius: var(--radius-md); object-fit: cover; border: 1px solid var(--border-light);"
                        onerror="this.src='https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'"
                      />
                      <div>
                        <strong style="color: var(--text-main); font-size: 0.95rem; display: block;">
                          ${trx.productName}
                        </strong>
                        <span style="font-size: 0.775rem; color: var(--text-muted);">
                          Mutu Terjamin SNI • Sertifikasi Kemitraan Desa
                        </span>
                      </div>
                    </div>
                  </td>
                  <td style="text-align: right; font-weight: 800; color: var(--text-main);">
                    ${(trx.quantity || 0).toLocaleString('id-ID')} ${trx.productUnit || 'Kg'}
                  </td>
                  <td style="text-align: right; font-weight: 600; color: var(--text-main);">
                    Rp ${(trx.unitPrice || 0).toLocaleString('id-ID')}
                  </td>
                  <td style="text-align: right; font-weight: 800; color: var(--text-main);">
                    Rp ${(trx.subtotal || (trx.quantity * trx.unitPrice) || 0).toLocaleString('id-ID')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Ringkasan Finansial Tagihan -->
          <div class="invoice-summary-box">
            <div class="invoice-summary-card">
              <div class="invoice-summary-row">
                <span>Subtotal Komoditas:</span>
                <span style="font-weight: 700; color: var(--text-main);">
                  Rp ${(trx.subtotal || (trx.quantity * trx.unitPrice) || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div class="invoice-summary-row">
                <span>Logistik Armada Desa:</span>
                <span style="font-weight: 700; color: var(--text-main);">
                  Rp ${(trx.shippingCost || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div class="invoice-summary-row">
                <span>Pajak Transaksi UMKM (0%):</span>
                <span style="font-weight: 700; color: #16a34a;">Bebas Pajak Desa</span>
              </div>
              <div class="invoice-summary-row total">
                <span>Total Pembayaran:</span>
                <span>Rp ${(trx.totalAmount || 0).toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          <!-- Informasi Pembayaran & Catatan B2B -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-lg); padding: 1.25rem; font-size: 0.825rem; color: var(--text-muted); line-height: 1.5;">
            <div style="font-weight: 800; color: var(--text-main); margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem;">
              💳 Metode Pembayaran & Ketentuan B2B:
            </div>
            <div>• <strong>Metode Terpilih:</strong> ${trx.paymentMethod || 'Transfer Bank Rekening DesaBiz'}</div>
            <div>• <strong>Catatan Transaksi:</strong> ${trx.notes || 'Transaksi resmi tercatat pada sistem pembukuan DesaBiz AI.'}</div>
            <div style="margin-top: 0.5rem; font-size: 0.775rem; color: #94a3b8;">
              * Dokumen ini adalah bukti faktur digital sah yang dihasilkan secara otomatis oleh DesaBiz AI dan diakui oleh mitra paguyuban UMKM desa terkait.
            </div>
          </div>

          <!-- Action jika masih pending payment -->
          ${!isPaid && trx.status !== 'Dibatalkan' ? `
            <div style="margin-top: 1.5rem; padding: 1rem 1.25rem; background: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
              <div>
                <strong style="color: #92400e; font-size: 0.9rem; display: block;">Status: Belum Lunas</strong>
                <span style="color: #b45309; font-size: 0.8rem;">
                  ${isBuyer ? 'Segera selesaikan pembayaran ke rekening penjual/escrow desa.' : 'Konfirmasi penerimaan dana jika pembeli telah mengirimkan bukti transfer.'}
                </span>
              </div>
              <button 
                class="btn btn-primary btn-sm btn-mark-paid" 
                data-id="${trx.id}"
                style="background: #059669; border-color: #059669;"
              >
                ${Icons.check} Tandai Lunas / Konfirmasi Pembayaran
              </button>
            </div>
          ` : ''}
        </div>

        <!-- MODAL SLOT -->
        <div id="trx-modal-slot"></div>
      </div>
    `;

    // Attach Invoice Detail Events
    const printBtn = container.querySelector('#btn-print-invoice');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    const markPaidBtn = container.querySelector('.btn-mark-paid');
    if (markPaidBtn) {
      markPaidBtn.addEventListener('click', () => {
        TransaksiModule.openPaymentModal(trx.id, () => {
          TransaksiModule.renderInvoiceDetail(container, trx.id);
        });
      });
    }
  },

  // ==========================================
  // MODAL: CATAT / KONFIRMASI PEMBAYARAN
  // ==========================================
  openPaymentModal: (trxId, onSuccess = null) => {
    const slot = document.getElementById('trx-modal-slot');
    if (!slot) return;

    const trx = appState.getTransactionById(trxId);
    if (!trx) return;

    slot.innerHTML = `
      <div class="db-modal-overlay" id="modal-pay-overlay">
        <div class="db-modal" style="max-width: 480px;" role="dialog" aria-modal="true">
          <div class="db-modal-header">
            <div class="db-modal-title" style="display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem;">
              <span style="color: #059669; display: flex;">${Icons.transaksi}</span>
              <span>Konfirmasi Pembayaran Transaksi</span>
            </div>
            <button type="button" class="db-modal-close-btn" id="btn-close-pay-modal">
              ${Icons.x}
            </button>
          </div>

          <form id="form-pay-action">
            <div class="db-modal-body">
              <!-- Info Box -->
              <div style="background: var(--bg-app); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 1rem; margin-bottom: 1.25rem;">
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                  <span style="color: var(--text-muted);">ID Transaksi:</span>
                  <strong style="color: var(--text-main);">${trx.id}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                  <span style="color: var(--text-muted);">Komoditas:</span>
                  <span style="color: var(--text-main); font-weight: 600;">${trx.productName}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.95rem; border-top: 1px dashed var(--border-light); padding-top: 0.5rem; margin-top: 0.5rem;">
                  <span style="font-weight: 700; color: var(--text-main);">Total Tagihan:</span>
                  <strong style="color: var(--color-primary-dark); font-size: 1.1rem;">
                    Rp ${(trx.totalAmount || 0).toLocaleString('id-ID')}
                  </strong>
                </div>
              </div>

              <!-- Pilih Metode Pembayaran -->
              <div class="form-group" style="margin-bottom: 1.25rem;">
                <label class="form-label" for="pay-method-select" style="font-weight: 700;">
                  Pilih Kanal Pembayaran *
                </label>
                <select id="pay-method-select" class="form-control" style="font-size: 0.9rem;">
                  <option value="Transfer Bank BJB Agribisnis">Transfer Bank BJB Agribisnis</option>
                  <option value="Transfer Bank BRI Desa">Transfer Bank BRI Desa</option>
                  <option value="Transfer Bank Mandiri">Transfer Bank Mandiri</option>
                  <option value="Rekening Bersama Escrow DesaBiz">Rekening Bersama Escrow DesaBiz</option>
                  <option value="Tunai saat Pengiriman (COD)">Tunai saat Pengiriman (COD)</option>
                </select>
              </div>

              <!-- Referensi Pembayaran / Bukti -->
              <div class="form-group" style="margin-bottom: 1.25rem;">
                <label class="form-label" for="pay-ref-input" style="font-weight: 700;">
                  Nomor Referensi Bukti Transfer / Slip (Opsional)
                </label>
                <input 
                  type="text" 
                  id="pay-ref-input" 
                  class="form-control" 
                  placeholder="Contoh: TRF-2026-99214 / No Resi Bank"
                  style="font-size: 0.9rem;"
                />
              </div>

              <!-- Catatan Pelunasan -->
              <div class="form-group">
                <label class="form-label" for="pay-notes-input">
                  Catatan Rekonsiliasi Kas (Opsional)
                </label>
                <textarea 
                  id="pay-notes-input" 
                  class="form-control" 
                  rows="2" 
                  placeholder="Misal: Dana telah masuk ke rekening bendahara, siap cetak bukti lunas."
                ></textarea>
              </div>
            </div>

            <div class="db-modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-pay-modal">
                Batal
              </button>
              <button type="submit" class="btn btn-primary btn-sm" style="background: #059669; border-color: #059669;">
                ${Icons.check} Konfirmasi Lunas
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const overlay = slot.querySelector('#modal-pay-overlay');
    const closeBtn = slot.querySelector('#btn-close-pay-modal');
    const cancelBtn = slot.querySelector('#btn-cancel-pay-modal');
    const form = slot.querySelector('#form-pay-action');

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
      const method = slot.querySelector('#pay-method-select').value;
      const refInput = slot.querySelector('#pay-ref-input').value.trim();
      const notesInput = slot.querySelector('#pay-notes-input').value.trim();

      const res = appState.updateTransactionStatus(trx.id, 'Selesai / Lunas', method);
      if (res && res.success) {
        appState.addNotification({
          type: 'order',
          title: `Pembayaran Transaksi #${trx.id} Dikonfirmasi`,
          message: `Transaksi untuk ${trx.productName} telah lunas melalui ${method}.`,
          link: `#/transaksi-detail?id=${trx.id}`
        });

        closeModal();

        if (onSuccess) {
          onSuccess();
        } else {
          const mainContainer = document.getElementById('main-content');
          if (mainContainer) {
            TransaksiModule.renderTransactionList(mainContainer);
          }
        }
      } else {
        alert(res?.message || 'Gagal memproses pembayaran.');
      }
    });
  },

  // ==========================================
  // EXPORT CSV HELPER
  // ==========================================
  exportToCSV: () => {
    const transactions = appState.getTransactions(TransaksiModule.activeTab, TransaksiModule.activeStatusFilter, TransaksiModule.searchQuery);
    if (!transactions.length) {
      alert('Tidak ada data transaksi untuk diunduh.');
      return;
    }

    const headers = ['ID Transaksi', 'No Faktur', 'Ref PO', 'Produk', 'Kuantitas', 'Satuan', 'Harga Satuan', 'Total Tagihan', 'Pembeli', 'Penjual', 'Tanggal', 'Status', 'Metode Pembayaran'];
    const rows = transactions.map(t => [
      t.id,
      t.invoiceNumber || '-',
      t.orderId || '-',
      `"${(t.productName || '').replace(/"/g, '""')}"`,
      t.quantity || 0,
      t.productUnit || 'Kg',
      t.unitPrice || 0,
      t.totalAmount || 0,
      `"${(t.buyerName || '').replace(/"/g, '""')}"`,
      `"${(t.sellerName || '').replace(/"/g, '""')}"`,
      `"${(t.date || '').replace(/"/g, '""')}"`,
      t.status || '-',
      `"${(t.paymentMethod || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Transaksi_DesaBiz_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
