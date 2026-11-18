// DesaBiz AI - Fonnte WhatsApp Client Service
// ---------------------------------------------------------------------------
// Service ini menghubungkan antarmuka frontend dengan backend proxy (api/whatsapp.php).
// Semua token Fonnte tetap aman di sisi server (config/fonnte.php).
//
// Fitur:
// - Kirim notifikasi pesanan baru (notifyNewOrder)
// - Kirim notifikasi perubahan status pesanan (notifyStatusChange)
// - Kirim pesan langsung (send)
// - Uji koneksi Fonnte (testConnection)
// - Ambil riwayat log notifikasi (getLogs)
// ---------------------------------------------------------------------------

window.DESA_BIZ_WA = window.DESA_BIZ_WA || {
  api: 'api/whatsapp.php'
};

window.DesaBizWA = window.DesaBizWA || {};

/**
 * Normalisasi nomor telepon ke format internasional standar Indonesia (62)
 * @param {string} phone 
 * @returns {string}
 */
window.DesaBizWA.formatPhone = function(phone) {
  if (!phone) return '';
  const clean = String(phone).replace(/\D/g, '');
  if (!clean) return '';
  if (clean.startsWith('08')) return '628' + clean.slice(2);
  if (clean.startsWith('8')) return '62' + clean;
  if (clean.startsWith('62')) return clean;
  return clean;
};

/**
 * Kirim pesan WhatsApp langsung ke nomor tujuan
 * @param {string} to 
 * @param {string} message 
 * @returns {Promise<Object>}
 */
window.DesaBizWA.send = async function(to, message) {
  const target = window.DesaBizWA.formatPhone(to);
  if (!target) return { success: false, status: 'invalid_number', message: 'Nomor telepon tidak valid.' };
  if (!message || !message.trim()) return { success: false, status: 'empty_message', message: 'Pesan tidak boleh kosong.' };

  try {
    const response = await fetch(window.DESA_BIZ_WA.api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_direct',
        target: target,
        message: message.trim()
      })
    });
    return await response.json();
  } catch (e) {
    return { success: false, status: 'network_error', message: 'Gagal menghubungi server: ' + (e.message || e) };
  }
};

/**
 * Memicu notifikasi WhatsApp pesanan baru ke Pembeli, Penjual, dan Admin
 * @param {Object} orderData 
 * @returns {Promise<Object>}
 */
window.DesaBizWA.notifyNewOrder = async function(orderData) {
  if (!orderData) return { success: false, message: 'Data pesanan kosong.' };

  try {
    const response = await fetch(window.DESA_BIZ_WA.api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'notify_order',
        order: orderData
      })
    });
    return await response.json();
  } catch (e) {
    console.warn('⚠️ Gagal mengirim notifikasi pesanan WhatsApp:', e);
    return { success: false, message: e.message || e };
  }
};

/**
 * Memicu notifikasi perubahan status pesanan ke Pembeli dan Penjual
 * @param {Object} orderData 
 * @param {string} oldStatus 
 * @param {string} newStatus 
 * @param {string} note 
 * @returns {Promise<Object>}
 */
window.DesaBizWA.notifyStatusChange = async function(orderData, oldStatus, newStatus, note = '') {
  if (!orderData) return { success: false, message: 'Data pesanan kosong.' };

  try {
    const response = await fetch(window.DESA_BIZ_WA.api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'notify_status',
        order: orderData,
        old_status: oldStatus,
        new_status: newStatus,
        note: note
      })
    });
    return await response.json();
  } catch (e) {
    console.warn('⚠️ Gagal mengirim notifikasi status WhatsApp:', e);
    return { success: false, message: e.message || e };
  }
};

/**
 * Uji koneksi Fonnte Gateway & opsional kirim pesan tes
 * @param {string} target 
 * @param {boolean} sendTest 
 * @returns {Promise<Object>}
 */
window.DesaBizWA.testConnection = async function(target = '', sendTest = false) {
  try {
    const response = await fetch(window.DESA_BIZ_WA.api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test_connection',
        target: target,
        send_test: sendTest
      })
    });
    return await response.json();
  } catch (e) {
    return { success: false, message: e.message || e };
  }
};

/**
 * Dapatkan riwayat log notifikasi terbaru
 * @param {number} limit 
 * @returns {Promise<Object>}
 */
window.DesaBizWA.getLogs = async function(limit = 20) {
  try {
    const response = await fetch(`${window.DESA_BIZ_WA.api}?action=get_logs&limit=${limit}`);
    return await response.json();
  } catch (e) {
    return { success: false, logs: [], message: e.message || e };
  }
};

/**
 * Dispatcher event notifikasi generik (dipanggil oleh modul state.js).
 * Saat ini mendukung event 'registration_new' -> notifikasi pendaftar baru ke Admin.
 * @param {string} event
 * @param {Object} data
 * @returns {Promise<Object>}
 */
window.DesaBizWA.trigger = async function(event, data = {}) {
  if (!event) return { success: false, message: 'Nama event tidak valid.' };

  try {
    const response = await fetch(window.DESA_BIZ_WA.api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'notify_registration',
        event: event,
        registration: data
      })
    });
    return await response.json();
  } catch (e) {
    console.warn('⚠️ Gagal memicu event notifikasi WhatsApp:', event, e);
    return { success: false, message: e.message || e };
  }
};

// Log inisialisasi di browser
console.log('📲 DesaBiz WhatsApp Fonnte Service Loaded');
