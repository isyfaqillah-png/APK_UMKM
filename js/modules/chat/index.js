// DesaBiz AI - Modul Komunikasi & Chat B2B
import { Icons } from '../../icons.js';
import { appState } from '../../state.js';

export const ChatModule = {
  id: 'chat',
  title: 'Pesan & Komunikasi B2B',
  subtitle: 'Percakapan langsung, konfirmasi spesifikasi komoditas, dan negosiasi pasokan dengan mitra',

  // Active module states
  activeConversationId: null,
  activeFilter: 'all', // 'all', 'unread', 'supplier', 'buyer'
  searchQuery: '',
  mobileShowChat: false,

  render: (container, params = new URLSearchParams(), routeKey = 'chat') => {
    const user = appState.getState().user;
    if (!user) return;

    // Check query parameters for deep-linking
    const partnerId = params.get('partnerId');
    const productId = params.get('productId');
    const orderId = params.get('orderId');
    const negId = params.get('negId');
    const directConvId = params.get('conversationId') || params.get('id');

    if (partnerId) {
      const conv = appState.findOrCreateConversation({
        partnerId,
        productId,
        orderId,
        negId
      });
      if (conv) {
        ChatModule.activeConversationId = conv.id;
        ChatModule.mobileShowChat = true;
      }
    } else if (directConvId) {
      ChatModule.activeConversationId = directConvId;
      ChatModule.mobileShowChat = true;
    }

    // Only get conversations involving the current logged-in user (Privacy Guaranteed)
    const userConversations = appState.getConversations();

    // Default to the first conversation if none selected
    if (!ChatModule.activeConversationId && userConversations.length > 0) {
      ChatModule.activeConversationId = userConversations[0].id;
    }

    // Filter conversations based on active filter & search query
    const filteredConvs = userConversations.filter(c => {
      // Filter tab
      if (ChatModule.activeFilter === 'unread' && (!c.unreadCount || c.unreadCount === 0)) {
        return false;
      }
      if (ChatModule.activeFilter === 'supplier' && c.partner?.role !== 'supplier') {
        return false;
      }
      if (ChatModule.activeFilter === 'buyer' && c.partner?.role !== 'buyer') {
        return false;
      }

      // Search query
      if (ChatModule.searchQuery.trim()) {
        const q = ChatModule.searchQuery.toLowerCase().trim();
        const pName = (c.partner?.name || '').toLowerCase();
        const bName = (c.partner?.businessName || '').toLowerCase();
        const prodName = (c.productRef?.name || '').toLowerCase();
        const lastMsg = (c.lastMessage || '').toLowerCase();
        return pName.includes(q) || bName.includes(q) || prodName.includes(q) || lastMsg.includes(q);
      }

      return true;
    });

    // Active conversation object
    const activeConv = userConversations.find(c => c.id === ChatModule.activeConversationId) || (filteredConvs[0] || null);

    // If active conversation has unread messages, mark as read
    if (activeConv && activeConv.unreadCount > 0) {
      appState.markConversationAsRead(activeConv.id);
    }

    const totalUnreadCount = appState.getTotalUnreadChatCount();

    container.innerHTML = `
      <div class="fade-in">
        <!-- Page Header -->
        <div class="page-header" style="margin-bottom: 1.25rem;">
          <div class="page-header-info">
            <div class="breadcrumbs">
              <a href="#/dashboard">Beranda</a>
              <span class="breadcrumb-separator">/</span>
              <span class="breadcrumb-item active">Pesan</span>
            </div>
            <h1 class="page-title">${ChatModule.title}</h1>
            <p class="page-subtitle">${ChatModule.subtitle}</p>
          </div>
          <div>
            ${totalUnreadCount > 0 ? `
              <span class="badge badge-primary" style="font-size: 0.85rem; padding: 0.4rem 0.85rem;">
                ${totalUnreadCount} Pesan Belum Dibaca
              </span>
            ` : `
              <span class="badge badge-success" style="font-size: 0.85rem; padding: 0.4rem 0.85rem;">
                Semua Percakapan Terbaca
              </span>
            `}
          </div>
        </div>

        <!-- Main Chat Box (Modern Two-Column Layout) -->
        <div class="chat-container">
          <!-- 1. LEFT COLUMN: CONVERSATION THREADS LIST -->
          <div class="chat-threads-col ${ChatModule.mobileShowChat ? 'mobile-hide' : ''}" id="chat-threads-col">
            <div class="chat-threads-header">
              <div class="chat-threads-top">
                <div class="chat-threads-title">
                  ${Icons.chat}
                  <span>Percakapan B2B</span>
                </div>
                <span class="badge badge-neutral" style="font-size: 0.75rem;">
                  ${userConversations.length} Kontak
                </span>
              </div>

              <!-- Search Input -->
              <div class="thread-search-box">
                <span class="thread-search-icon">${Icons.search}</span>
                <input 
                  type="text" 
                  id="chat-search-input" 
                  class="thread-search-input" 
                  placeholder="Cari mitra atau nama komoditas..."
                  value="${ChatModule.searchQuery}"
                />
              </div>

              <!-- Filter Pills -->
              <div class="thread-filter-pills">
                <button 
                  type="button" 
                  class="thread-filter-pill ${ChatModule.activeFilter === 'all' ? 'active' : ''}" 
                  data-filter="all"
                >
                  Semua
                </button>
                <button 
                  type="button" 
                  class="thread-filter-pill ${ChatModule.activeFilter === 'unread' ? 'active' : ''}" 
                  data-filter="unread"
                >
                  Belum Dibaca ${totalUnreadCount > 0 ? `(${totalUnreadCount})` : ''}
                </button>
                <button 
                  type="button" 
                  class="thread-filter-pill ${ChatModule.activeFilter === 'supplier' ? 'active' : ''}" 
                  data-filter="supplier"
                >
                  Mitra Supplier
                </button>
                <button 
                  type="button" 
                  class="thread-filter-pill ${ChatModule.activeFilter === 'buyer' ? 'active' : ''}" 
                  data-filter="buyer"
                >
                  Mitra Pembeli
                </button>
              </div>
            </div>

            <!-- Scrollable Threads List -->
            <div class="thread-list-scroll" id="thread-list-scroll">
              ${filteredConvs.length === 0 ? `
                <div style="padding: 2.5rem 1rem; text-align: center; color: var(--text-muted);">
                  <div style="font-size: 2rem; margin-bottom: 0.5rem;">💬</div>
                  <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main); margin-bottom: 0.25rem;">
                    Tidak ada obrolan ditemukan
                  </div>
                  <div style="font-size: 0.8rem; line-height: 1.4;">
                    ${ChatModule.searchQuery ? 'Coba ganti kata kunci pencarian Anda.' : 'Pilih filter lain atau hubungi supplier melalui katalog produk.'}
                  </div>
                </div>
              ` : filteredConvs.map(c => {
                const isActive = activeConv && activeConv.id === c.id;
                const isOnline = c.partner?.isOnline;
                const roleBadge = c.partner?.role === 'supplier' 
                  ? '<span class="badge badge-primary" style="font-size: 0.65rem; padding: 0.1rem 0.35rem;">Supplier</span>'
                  : '<span class="badge badge-accent" style="font-size: 0.65rem; padding: 0.1rem 0.35rem;">Pembeli</span>';

                return `
                  <div class="thread-item ${isActive ? 'active' : ''}" data-id="${c.id}">
                    <div class="thread-avatar-wrap">
                      <div class="thread-avatar">
                        ${c.partner?.avatarInitial || 'UM'}
                      </div>
                      <span class="online-dot ${isOnline ? '' : 'offline'}" title="${isOnline ? 'Online' : 'Offline'}"></span>
                    </div>

                    <div class="thread-info">
                      <div class="thread-info-top">
                        <span class="thread-name">${c.partner?.name || 'Mitra DesaBiz'}</span>
                        <span class="thread-time">${c.lastMessageTime || ''}</span>
                      </div>

                      <div class="thread-business-row">
                        <span style="font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;">
                          ${c.partner?.businessName || 'Usaha UMKM'}
                        </span>
                        ${roleBadge}
                      </div>

                      <div class="thread-msg-preview-row">
                        <span class="thread-msg-preview" style="${c.unreadCount > 0 ? 'font-weight: 700; color: var(--text-main);' : ''}">
                          ${c.lastMessage || 'Mulai percakapan...'}
                        </span>
                        ${c.unreadCount > 0 ? `
                          <span class="thread-unread-pill">${c.unreadCount}</span>
                        ` : ''}
                      </div>

                      ${c.productRef ? `
                        <div class="thread-prod-tag" title="${c.productRef.name}">
                          ${Icons.produk} ${c.productRef.name}
                        </div>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- 2. RIGHT COLUMN: ACTIVE CHAT ROOM -->
          <div class="chat-main-col ${ChatModule.mobileShowChat ? 'mobile-active' : ''}" id="chat-main-col">
            ${!activeConv ? `
              <!-- Empty Room Placeholder -->
              <div class="chat-empty-room">
                <div style="width: 72px; height: 72px; border-radius: 50%; background: var(--color-primary-soft); color: var(--color-primary); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem;">
                  ${Icons.chat}
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem;">
                  Pilih Percakapan untuk Memulai Chat
                </h3>
                <p style="font-size: 0.875rem; color: var(--text-muted); max-width: 380px; line-height: 1.5;">
                  Pilih mitra usaha di sebelah kiri atau mulai obrolan baru langsung dari halaman Detail Produk, Supplier, ataupun Negosiasi Harga.
                </p>
              </div>
            ` : `
              <!-- Active Chat Header -->
              <div class="chat-header-bar">
                <div class="chat-header-partner">
                  <!-- Mobile Back Button -->
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-chat-back-mobile" style="padding: 0.4rem 0.6rem; display: none;">
                    ${Icons.chevronLeft}
                  </button>

                  <div class="thread-avatar-wrap">
                    <div class="thread-avatar" style="width: 40px; height: 40px; font-size: 0.85rem;">
                      ${activeConv.partner?.avatarInitial || 'UM'}
                    </div>
                    <span class="online-dot ${activeConv.partner?.isOnline ? '' : 'offline'}"></span>
                  </div>

                  <div class="chat-partner-titles">
                    <h3>
                      ${activeConv.partner?.name || 'Mitra'}
                      ${activeConv.partner?.role === 'supplier' ? `<span style="color: var(--color-primary);" title="Supplier Terverifikasi">${Icons.checkCircle}</span>` : ''}
                    </h3>
                    <div class="chat-partner-status ${activeConv.partner?.isOnline ? '' : 'offline'}">
                      <span>${activeConv.partner?.businessName} • </span>
                      <span>${activeConv.partner?.isOnline ? '● Online' : 'Terakhir dilihat ' + (activeConv.partner?.lastSeen || 'beberapa saat lalu')}</span>
                    </div>
                  </div>
                </div>

                <div class="chat-header-actions">
                  <a 
                    href="https://wa.me/62${(activeConv.partner?.phone || '81234567890').replace(/^0/, '')}?text=Halo%20${encodeURIComponent(activeConv.partner?.name || '')},%20saya%20menghubungi%20melalui%20DesaBiz%20AI." 
                    target="_blank" 
                    class="btn btn-secondary btn-sm" 
                    title="Hubungi via WhatsApp"
                    style="gap: 0.35rem;"
                  >
                    ${Icons.phone} <span class="hide-mobile">WhatsApp</span>
                  </a>
                </div>
              </div>

              <!-- Contextual Product Information Banner (PRD Requirement) -->
              ${activeConv.productRef ? `
                <div class="chat-product-banner">
                  <div class="chat-prod-info-left">
                    <img 
                      src="${activeConv.productRef.imageUrl || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'}" 
                      alt="${activeConv.productRef.name}" 
                      class="chat-prod-thumb" 
                      onerror="this.src='https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'"
                    />
                    <div>
                      <div class="chat-prod-name" title="${activeConv.productRef.name}">
                        🌾 ${activeConv.productRef.name}
                      </div>
                      <div class="chat-prod-price-moq">
                        Harga: <strong>Rp ${(activeConv.productRef.price || 0).toLocaleString('id-ID')} / ${activeConv.productRef.unit || 'Kg'}</strong> • 
                        Min. Order: <strong>${(activeConv.productRef.minOrder || 0).toLocaleString('id-ID')} ${activeConv.productRef.unit || 'Kg'}</strong>
                        ${activeConv.productRef.orderId ? ` • <span class="badge badge-secondary" style="font-size: 0.65rem;">PO #${activeConv.productRef.orderId}</span>` : ''}
                        ${activeConv.productRef.negId ? ` • <span class="badge badge-accent" style="font-size: 0.65rem;">Negosiasi #${activeConv.productRef.negId}</span>` : ''}
                      </div>
                    </div>
                  </div>

                  <div class="chat-prod-actions">
                    <a href="#/pesanan-buat?productId=${activeConv.productRef.id}" class="btn btn-primary btn-sm" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">
                      ${Icons.pesanan} Buat PO
                    </a>
                    <a href="#/negosiasi?action=create&productId=${activeConv.productRef.id}" class="btn btn-secondary btn-sm" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; color: #d97706; border-color: #fde68a;">
                      ${Icons.negosiasi} Tawar
                    </a>
                  </div>
                </div>
              ` : ''}

              <!-- Messages Scrollable Conversation History -->
              <div class="chat-messages-scroll" id="chat-messages-scroll">
                ${ChatModule.renderMessagesList(activeConv, user.id)}
              </div>

              <!-- Quick Reply Chips for B2B Conversations -->
              <div class="chat-quick-templates" id="chat-quick-templates">
                <button type="button" class="quick-template-chip" data-text="Halo, apakah stok komoditas ini masih ready dan siap kirim?">
                  📦 Cek Kesiapan Stok
                </button>
                <button type="button" class="quick-template-chip" data-text="Bisa kirimkan sampel 1-2 Kg terlebih dahulu untuk uji mutu/kadar air?">
                  🧪 Minta Sampel Mutu
                </button>
                <button type="button" class="quick-template-chip" data-text="Apakah harga masih bisa negosiasi untuk pemesanan partai besar?">
                  💰 Nego Volume Besar
                </button>
                <button type="button" class="quick-template-chip" data-text="Berapa estimasi waktu pengiriman armada logistik ke lokasi kami?">
                  🚚 Jadwal Pengiriman
                </button>
                <button type="button" class="quick-template-chip" data-text="Kapan estimasi masa panen raya komoditas ini berikutnya?">
                  📅 Jadwal Panen Berikutnya
                </button>
              </div>

              <!-- Message Input Bar -->
              <form class="chat-input-bar" id="chat-send-form">
                <input 
                  type="text" 
                  id="chat-message-input" 
                  class="chat-input-field" 
                  placeholder="Tulis pesan atau pertanyaan pasokan ke ${activeConv.partner?.name || 'mitra'}..."
                  autocomplete="off"
                />
                <button type="submit" class="btn-chat-send" id="btn-chat-send" title="Kirim Pesan">
                  ${Icons.send}
                </button>
              </form>
            `}
          </div>
        </div>
      </div>
    `;

    ChatModule.attachEvents(container, activeConv);
    ChatModule.scrollToBottom();
  },

  // Render message bubbles with date separators and status indicators
  renderMessagesList: (conv, currentUserId) => {
    const messages = conv.messages || [];
    if (messages.length === 0) {
      return `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">👋</div>
          <div style="font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem;">
            Mulai Percakapan dengan ${conv.partner?.name || 'Mitra'}
          </div>
          <div style="font-size: 0.825rem;">
            Tanyakan ketersediaan komoditas, negosiasi harga, atau konfirmasi detail jadwal armada pengiriman.
          </div>
        </div>
      `;
    }

    let lastDate = null;
    let html = '';

    messages.forEach((m) => {
      // Date separator
      if (m.date && m.date !== lastDate) {
        lastDate = m.date;
        html += `
          <div class="chat-date-separator">
            <span class="chat-date-pill">${m.date}</span>
          </div>
        `;
      }

      const isOutgoing = m.senderId === currentUserId;
      
      // Status checkmark formatting
      let statusCheck = '';
      if (isOutgoing) {
        if (m.status === 'read') {
          statusCheck = `<span class="chat-status-check" style="color: #6ee7b7;" title="Dibaca">✓✓</span>`;
        } else if (m.status === 'delivered') {
          statusCheck = `<span class="chat-status-check" style="color: rgba(255,255,255,0.75);" title="Terkirim">✓✓</span>`;
        } else {
          statusCheck = `<span class="chat-status-check" style="color: rgba(255,255,255,0.6);" title="Mengirim">✓</span>`;
        }
      }

      html += `
        <div class="chat-msg-row ${isOutgoing ? 'outgoing' : 'incoming'}">
          <div class="chat-bubble ${isOutgoing ? 'outgoing' : 'incoming'}">
            <div style="white-space: pre-wrap;">${ChatModule.escapeHtml(m.text)}</div>
            <div class="chat-bubble-meta">
              <span>${m.time || ''}</span>
              ${statusCheck}
            </div>
          </div>
        </div>
      `;
    });

    return html;
  },

  attachEvents: (container, activeConv) => {
    // 1. Thread selection
    const threadItems = container.querySelectorAll('.thread-item');
    threadItems.forEach(item => {
      item.addEventListener('click', () => {
        const convId = item.dataset.id;
        ChatModule.activeConversationId = convId;
        ChatModule.mobileShowChat = true;
        ChatModule.render(container);
      });
    });

    // 2. Filter tabs
    const filterPills = container.querySelectorAll('.thread-filter-pill');
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        ChatModule.activeFilter = pill.dataset.filter;
        ChatModule.render(container);
      });
    });

    // 3. Search input
    const searchInput = container.querySelector('#chat-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        ChatModule.searchQuery = e.target.value;
        const listContainer = container.querySelector('#thread-list-scroll');
        if (listContainer) {
          const userConversations = appState.getConversations();
          const filtered = userConversations.filter(c => {
            if (ChatModule.activeFilter === 'unread' && (!c.unreadCount || c.unreadCount === 0)) return false;
            if (ChatModule.activeFilter === 'supplier' && c.partner?.role !== 'supplier') return false;
            if (ChatModule.activeFilter === 'buyer' && c.partner?.role !== 'buyer') return false;
            if (ChatModule.searchQuery.trim()) {
              const q = ChatModule.searchQuery.toLowerCase().trim();
              const pName = (c.partner?.name || '').toLowerCase();
              const bName = (c.partner?.businessName || '').toLowerCase();
              const prodName = (c.productRef?.name || '').toLowerCase();
              const lastMsg = (c.lastMessage || '').toLowerCase();
              return pName.includes(q) || bName.includes(q) || prodName.includes(q) || lastMsg.includes(q);
            }
            return true;
          });

          listContainer.innerHTML = filtered.length === 0 ? `
            <div style="padding: 2.5rem 1rem; text-align: center; color: var(--text-muted);">
              <div style="font-size: 1.8rem; margin-bottom: 0.5rem;">🔍</div>
              <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">
                Tidak ada hasil pencarian
              </div>
            </div>
          ` : filtered.map(c => {
            const isActive = ChatModule.activeConversationId === c.id;
            const isOnline = c.partner?.isOnline;
            const roleBadge = c.partner?.role === 'supplier' 
              ? '<span class="badge badge-primary" style="font-size: 0.65rem; padding: 0.1rem 0.35rem;">Supplier</span>'
              : '<span class="badge badge-accent" style="font-size: 0.65rem; padding: 0.1rem 0.35rem;">Pembeli</span>';

            return `
              <div class="thread-item ${isActive ? 'active' : ''}" data-id="${c.id}">
                <div class="thread-avatar-wrap">
                  <div class="thread-avatar">
                    ${c.partner?.avatarInitial || 'UM'}
                  </div>
                  <span class="online-dot ${isOnline ? '' : 'offline'}"></span>
                </div>
                <div class="thread-info">
                  <div class="thread-info-top">
                    <span class="thread-name">${c.partner?.name || 'Mitra'}</span>
                    <span class="thread-time">${c.lastMessageTime || ''}</span>
                  </div>
                  <div class="thread-business-row">
                    <span style="font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;">
                      ${c.partner?.businessName || ''}
                    </span>
                    ${roleBadge}
                  </div>
                  <div class="thread-msg-preview-row">
                    <span class="thread-msg-preview" style="${c.unreadCount > 0 ? 'font-weight: 700; color: var(--text-main);' : ''}">
                      ${c.lastMessage || ''}
                    </span>
                    ${c.unreadCount > 0 ? `<span class="thread-unread-pill">${c.unreadCount}</span>` : ''}
                  </div>
                  ${c.productRef ? `
                    <div class="thread-prod-tag" title="${c.productRef.name}">
                      ${Icons.produk} ${c.productRef.name}
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('');

          // Rebind click to filtered items
          listContainer.querySelectorAll('.thread-item').forEach(it => {
            it.addEventListener('click', () => {
              ChatModule.activeConversationId = it.dataset.id;
              ChatModule.mobileShowChat = true;
              ChatModule.render(container);
            });
          });
        }
      });
    }

    // 4. Mobile back button
    const backBtn = container.querySelector('#btn-chat-back-mobile');
    if (backBtn) {
      // Show back button on smaller screens
      if (window.innerWidth <= 768) {
        backBtn.style.display = 'inline-flex';
      }
      backBtn.addEventListener('click', () => {
        ChatModule.mobileShowChat = false;
        ChatModule.render(container);
      });
    }

    // 5. Quick template chips
    const templateChips = container.querySelectorAll('.quick-template-chip');
    const msgInput = container.querySelector('#chat-message-input');
    templateChips.forEach(chip => {
      chip.addEventListener('click', () => {
        if (msgInput) {
          msgInput.value = chip.dataset.text;
          msgInput.focus();
        }
      });
    });

    // 6. Send message form
    const sendForm = container.querySelector('#chat-send-form');
    if (sendForm && activeConv) {
      sendForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = msgInput ? msgInput.value.trim() : '';
        if (!text) return;

        // Send message in state
        const res = appState.sendMessage({
          conversationId: activeConv.id,
          text: text
        });

        if (res.success) {
          if (msgInput) msgInput.value = '';

          // Dynamically append new outgoing bubble to scroll container
          const scrollArea = container.querySelector('#chat-messages-scroll');
          if (scrollArea) {
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

            const newBubble = document.createElement('div');
            newBubble.className = 'chat-msg-row outgoing';
            newBubble.innerHTML = `
              <div class="chat-bubble outgoing">
                <div style="white-space: pre-wrap;">${ChatModule.escapeHtml(text)}</div>
                <div class="chat-bubble-meta">
                  <span>${timeStr}</span>
                  <span class="chat-status-check" style="color: rgba(255,255,255,0.75);">✓✓</span>
                </div>
              </div>
            `;
            scrollArea.appendChild(newBubble);
            ChatModule.scrollToBottom();
          }

          // Update snippet in left thread list
          const activeThreadItem = container.querySelector(`.thread-item[data-id="${activeConv.id}"]`);
          if (activeThreadItem) {
            const previewEl = activeThreadItem.querySelector('.thread-msg-preview');
            const timeEl = activeThreadItem.querySelector('.thread-time');
            if (previewEl) previewEl.textContent = text;
            if (timeEl) {
              const now = new Date();
              const pad = (n) => String(n).padStart(2, '0');
              timeEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
            }
          }
        }
      });
    }

    // 7. Subscribe to real-time incoming messages
    if (!ChatModule._subscribed) {
      ChatModule._subscribed = true;
      appState.subscribe(() => {
        // If user is currently viewing the chat module
        if (appState.getState().currentRoute === 'chat') {
          const currentContainer = document.getElementById('main-content');
          if (currentContainer && ChatModule.activeConversationId) {
            const currentConv = appState.getConversationById(ChatModule.activeConversationId);
            const scrollArea = currentContainer.querySelector('#chat-messages-scroll');
            if (currentConv && scrollArea) {
              const currentUserId = appState.getState().user?.id || 'usr_01';
              scrollArea.innerHTML = ChatModule.renderMessagesList(currentConv, currentUserId);
              ChatModule.scrollToBottom();

              // Also update thread item snippet
              const activeThread = currentContainer.querySelector(`.thread-item[data-id="${currentConv.id}"]`);
              if (activeThread) {
                const previewEl = activeThread.querySelector('.thread-msg-preview');
                const timeEl = activeThread.querySelector('.thread-time');
                if (previewEl) previewEl.textContent = currentConv.lastMessage || '';
                if (timeEl) timeEl.textContent = currentConv.lastMessageTime || '';
              }
            }
          }
        }
      });
    }
  },

  scrollToBottom: () => {
    setTimeout(() => {
      const scrollArea = document.getElementById('chat-messages-scroll');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }, 50);
  },

  escapeHtml: (str) => {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
