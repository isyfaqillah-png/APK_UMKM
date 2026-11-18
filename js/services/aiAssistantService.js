// DesaBiz AI - AI Assistant Service & Intelligence Engine
// ---------------------------------------------------------------------------
// Arsitektur Terpisah (Service Layer):
//   1. Service ini SATU-SATUNYA tempat frontend berbicara dengan "otak" AI.
//   2. Panggilan pertama diarahkan ke proksi backend (api/ai.php) yang membaca
//      API key dari environment server (getenv) -> TIDAK PERNAH ada API key di frontend.
//   3. Jika backend/API AI belum tersedia (belum diatur, timeout, atau error),
//      service otomatis jatuh ke Mock Intelligence Engine lokal yang tetap
//      membaca data riil aplikasi DesaBiz (produk, supplier, stok, pesanan, omzet).
//   4. Untuk mengganti ke API AI sungguhan cukup:
//      - Atur env DESABIZ_AI_API_KEY (atau OPENAI_API_KEY / GEMINI_API_KEY) di server, ATAU
//      - Ubah this.apiEndpoint ke endpoint lain dengan kontrak respons:
//        { status: "success", reply: { text, category, cards[], actionPills[] } }
//      Tidak perlu menyentuh UI sama sekali.
//
// Yang membuat chatbot "paham sistemnya":
//   A. buildSystemSnapshot()  -> memotret seluruh state aplikasi (produk, PO,
//      stok, nego, faktur, chat, notifikasi, halaman aktif) SEBELUM menjawab.
//   B. resolveIntent()        -> router intent berbasis SKOR (bukan if berantai),
//      sehingga kalimat campuran tetap diarahkan ke kemampuan yang benar.
//   C. memory / reference     -> chatbot mengingat daftar yang baru saja
//      ditampilkan, jadi lanjutan seperti "yang pertama", "yang termurah",
//      atau "yang di Sukabumi" tetap dimengerti.
//   D. Fallback berbasis data -> kalau tidak ada intent yang cocok, kata kunci
//      dicocokkan ke data riil dulu, baru mengajukan pertanyaan klarifikasi.
// ---------------------------------------------------------------------------

import { appState } from '../state.js';

// ==========================================
// 1. LEXICON (kamus bahasa + domain)
// ==========================================
const COMMODITIES = [
  { key: 'beras', label: 'beras & gabah', triggers: ['beras', 'gabah', 'padi', 'mentik'], terms: ['beras', 'gabah', 'padi', 'mentik'], cats: ['Pertanian & Beras'] },
  { key: 'kopi', label: 'kopi', triggers: ['kopi', 'arabika', 'robusta'], terms: ['kopi', 'arabika', 'robusta'], cats: ['Perkebunan & Kopi'] },
  { key: 'cabai', label: 'cabai & hortikultura', triggers: ['cabai', 'cabe', 'tomat', 'sayur'], terms: ['cabai', 'cabe', 'tomat', 'sayur', 'hortikultura'], cats: ['Hortikultura & Sayur'] },
  { key: 'bawang', label: 'bawang merah', triggers: ['bawang', 'brambang'], terms: ['bawang'], cats: ['Hortikultura & Sayur'] },
  { key: 'gula', label: 'gula aren & pemanis alami', triggers: ['gula', 'aren', 'pemanis'], terms: ['gula', 'aren'], cats: ['Gula & Rempah'] },
  { key: 'pupuk', label: 'pupuk & sarana tani', triggers: ['pupuk', 'kompos', 'zat hara'], terms: ['pupuk', 'kompos'], cats: ['Pupuk & Sarana Tani'] },
  { key: 'ikan', label: 'ikan & perikanan', triggers: ['ikan', 'nila', 'lele', 'udang'], terms: ['ikan', 'nila', 'lele', 'udang'], cats: ['Peternakan & Pakan'] },
  { key: 'jagung', label: 'jagung & pakan', triggers: ['jagung', 'pakan'], terms: ['jagung', 'pakan'], cats: ['Pertanian & Beras', 'Peternakan & Pakan'] },
  { key: 'rempah', label: 'rempah & bumbu', triggers: ['rempah', 'kunyit', 'temulawak', 'lada'], terms: ['rempah', 'kunyit', 'lada'], cats: ['Gula & Rempah'] },
  { key: 'teh', label: 'teh', triggers: ['teh', 'daun teh'], terms: ['teh'], cats: ['Perkebunan & Kopi'] },
  { key: 'kelapa', label: 'kelapa', triggers: ['kelapa', 'santan'], terms: ['kelapa'], cats: ['Perkebunan & Kopi'] },
  { key: 'telur', label: 'telur & unggas', triggers: ['telur', 'ayam', 'bebek'], terms: ['telur', 'ayam'], cats: ['Peternakan & Pakan'] },
  { key: 'madu', label: 'madu & olahan desa', triggers: ['madu', 'olahan'], terms: ['madu'], cats: ['Gula & Rempah'] }
];

// Kata kunci kemampuan (bobot diberikan oleh resolveIntent, bukan urutan if)
const SUPPLIER_TRIGGERS = ['supplier', 'pemasok', 'penyedia', 'distributor', 'produsen', 'gapoktan', 'koperasi', 'cari mitra', 'butuh mitra'];
const PRODUCT_TRIGGERS = ['cari produk', 'cari komoditas', 'ada produk', 'produk apa', 'katalog', 'beli produk', 'jual produk', 'harga'];
const HOWTO_TRIGGERS = ['bagaimana', 'gimana', 'cara ', 'cara pakai', 'panduan', 'tutorial', 'fitur apa', 'di mana', 'dimana', 'kenapa', 'mengapa', 'jelaskan'];
const NEARBY_REGENCIES = ['cianjur', 'sukabumi', 'bandung', 'bogor', 'depok', 'bekasi', 'purwakarta', 'karawang', 'garut', 'tasikmalaya', 'sumedang', 'ciamis', 'cirebon', 'subang'];

const GREETING_RE = /^(hai|halo|hi|hey|pagi|siang|sore|malam|assalam|assalamualaikum|trimakasih|terima kasih|makasih|thanks|tes|test)\b/;
const ORDER_ID_RE = /\b((?:ORD|TRX|INV|NEG)[-_ ]?\d{3,}[-_]?\d*)\b/i;
// Permintaan penulisan kode/program -> di luar cakupan asisten sistem DesaBiz
const CODE_RE = /\b(codingan|coding|koding|kode|script|python|javascript|nodejs|php|html|css|algoritma|compiler|kompilasi|debug|debugging|sourcecode|pseudocode)\b/;
const PRICE_UNDER_RE = /(?:di bawah|kurang dari|dibawah|<|maksimal|maks\.?|terjangkau)\s*(?:rp\.?\s*)?([\d.,]+)\s*(ribu|jt|juta)?/;

// Definisi intent: PHRASE (bobot 3) + WORD (bobot 1). Urutan = pemecah seri.
const INTENTS = [
  {
    key: 'whoami',
    label: 'Identitas & Rules Pengguna',
    phrases: [
      'siapa saya', 'siapakah saya', 'saya siapa', 'siapa aku', 'aku siapa', 'saya ini siapa',
      'siapa saya dari masing-masing rules', 'siapa saya dari masing masing rules',
      'siapa saya dari masing-masing role', 'siapa saya dari masing masing role',
      'siapa saya dari masing-masing aturan', 'siapa saya dari masing masing aturan',
      'peran saya', 'role saya', 'rules saya', 'aturan saya', 'hak akses saya',
      'apa peran saya', 'apa role saya', 'apa rules saya', 'apa aturan saya', 'apa hak akses saya',
      'aturan peran saya', 'aturan role saya', 'masing-masing rules', 'masing masing rules',
      'masing-masing role', 'masing masing role', 'semua rules', 'semua role', 'apa saja rules',
      'apa saja role', 'peran apa saja', 'pembagian peran', 'pembagian role', 'dual role',
      'dual-role', 'satu akun dua peran', 'jelaskan peran saya', 'jelaskan rules', 'status peran saya'
    ],
    words: ['whoami', 'rules', 'rule']
  },
  {
    key: 'all_systems',
    label: 'Seluruh Sistem Web',
    phrases: [
      'semua sistem', 'semua sistem yang ada', 'sistem yang ada di web', 'sistem yang ada di aplikasi',
      'jelaskan semua sistem', 'sistem apa saja', 'ada sistem apa saja', 'fitur dan sistem',
      'seluruh sistem', 'arsitektur sistem', 'alur sistem', 'modul sistem', 'apa saja sistem',
      'alur kerja sistem', 'ekosistem desabiz', 'semua modul', 'daftar sistem', 'seluruh modul',
      'sistem di web ini', 'sistem dalam web', 'sistem pada web', 'mengetahui semua sistem'
    ],
    words: ['ekosistem']
  },
  {
    // Paling depan karena dijadikan pemecah seri: pertanyaan identitas harus
    // selalu dijawab dengan profil asisten (bukan tercampur intent data).
    key: 'identity',
    label: 'Identitas asisten',
    phrases: ['siapakah anda', 'siapa anda', 'siapa kamu', 'kamu siapa', 'anda siapa', 'siapa dirimu',
      'dirimu siapa', 'siapa asisten', 'asisten siapa', 'nama kamu', 'nama anda', 'nama asisten',
      'siapa pembuat', 'siapa yang membuat', 'kamu dari mana', 'anda dari mana', 'apa kamu robot',
      'kamu robot', 'kamu bot', 'anda bot', 'ini siapa', 'siapa ini', 'kenalan dong', 'perkenalkan diri',
      'siapa desabiz ai', 'apa itu desabiz ai', 'tentang asisten', 'profil kamu', 'profil anda'],
    words: ['dirimu']
  },
  {
    key: 'supplier',
    label: 'Pencarian supplier',
    phrases: ['cari supplier', 'butuh supplier', 'membutuhkan supplier', 'mencari supplier', 'pemasok', 'supplier di daerah', 'supplier terdekat', 'supplier beras', 'cari pemasok', 'butuh pemasok', 'butuh mitra', 'cari mitra'],
    words: ['supplier', 'pemasok', 'distributor', 'gapoktan', 'penyedia']
  },
  {
    key: 'product_recommend',
    label: 'Rekomendasi produk',
    phrases: ['rekomendasi produk', 'rekomendasi komoditas', 'produk apa yang cocok', 'cocok untuk usaha', 'produk untuk usaha', 'komoditas unggulan', 'produk laris', 'jual apa', 'saran produk'],
    words: ['rekomendasi', 'cocok', 'potensial', 'disarankan']
  },
  {
    key: 'stock',
    label: 'Audit & saran stok',
    phrases: ['stoknya hampir habis', 'stok menipis', 'stok habis', 'saran stok', 'kelola stok', 'cek stok', 'kondisi gudang', 'persediaan', 'stok saya', 'sisa stok', 'batas aman',
      'stok semua', 'semua stok', 'stok semua barang', 'daftar stok', 'seluruh stok', 'stok lengkap', 'stok terbanyak', 'urutkan stok', 'stok dari terbanyak', 'jumlah stok', 'stok barang', 'daftar barang', 'barang saya'],
    words: ['stok', 'gudang', 'persediaan', 'inventaris', 'habis', 'menipis', 'inventory']
  },
  {
    key: 'sales',
    label: 'Data penjualan',
    phrases: ['data penjualan', 'performa penjualan', 'penjualan saya', 'omzet', 'pendapatan', 'laba', 'total transaksi', 'grafik penjualan', 'keuangan', 'laporan keuangan', 'berapa untung'],
    words: ['penjualan', 'omzet', 'laba', 'performa', 'keuangan', 'grafik', 'revenue']
  },
  {
    key: 'orders',
    label: 'Pesanan / PO',
    phrases: ['pesanan terbaru', 'tampilkan pesanan', 'cek pesanan', 'status pesanan', 'pesanan saya', 'purchase order', 'po saya', 'order saya', 'pesanan masuk', 'pesanan keluar'],
    words: ['pesanan', 'order', 'pengiriman', 'po']
  },
  {
    key: 'negotiation',
    label: 'Negosiasi harga',
    phrases: ['negosiasi saya', 'penawaran saya', 'tawaran saya', 'ajukan nego', 'status nego'],
    words: ['negosiasi', 'nego', 'tawar', 'penawaran', 'tawaran']
  },
  {
    key: 'transactions',
    label: 'Transaksi & faktur',
    phrases: ['transaksi saya', 'faktur saya', 'tagihan saya', 'belum bayar', 'belum dibayar', 'cetak faktur', 'invoice', 'riwayat transaksi'],
    words: ['transaksi', 'faktur', 'tagihan', 'invoice', 'bayar', 'pembayaran', 'lunas']
  },
  {
    key: 'my_products',
    label: 'Katalog milik saya',
    phrases: ['produk saya', 'katalog saya', 'yang saya jual', 'produk milik saya', 'tambah produk', 'jual produk saya'],
    words: ['produkku', 'dagangan']
  },
  {
    key: 'chats',
    label: 'Pesan & percakapan',
    phrases: ['chat masuk', 'pesan masuk', 'percakapan', 'inbox', 'kotak masuk', 'siapa yang chat'],
    words: ['chat', 'pesan', 'inbox']
  },
  {
    key: 'profile',
    label: 'Profil usaha',
    phrases: ['profil saya', 'data usaha', 'data diri', 'akun saya', 'info akun'],
    words: ['profil', 'akun']
  },
  {
    key: 'summary',
    label: 'Ringkasan sistem',
    phrases: ['ringkas sistem', 'ringkasan sistem', 'kondisi usaha', 'kondisi saya', 'bagaimana usaha saya', 'status usaha saya', 'ringkas semua', 'ringkasan data', 'snapshot', 'dashboard saya'],
    words: ['ringkasan', 'ringkas', 'kondisi', 'snapshots']
  },
  {
    key: 'product_search',
    label: 'Pencarian produk & harga',
    phrases: ['cari produk', 'cari komoditas', 'ada produk', 'produk apa', 'harga berapa', 'harga produk', 'beli produk', 'katalog produk', 'produk di katalog'],
    words: ['harga', 'komoditas', 'katalog', 'beli']
  },
  {
    key: 'feature',
    label: 'Panduan fitur',
    phrases: ['fitur apa', 'panduan fitur', 'cara pakai', 'menu apa', 'tutorial', 'bantuan', 'cara menggunakan', 'cara kerja', 'di mana', 'dimana'],
    words: ['fitur', 'panduan', 'menu', 'tutorial', 'bantuan', 'cara', 'bagaimana', 'gimana', 'kenapa', 'mengapa', 'jelaskan']
  },
  // ===== ADMIN INTENTS (hanya aktif untuk accountRole ADMIN) =====
  {
    key: 'admin_users',
    label: 'Manajemen pengguna',
    phrases: ['jumlah umkm', 'umkm terdaftar', 'daftar pengguna', 'pengguna platform', 'akun umkm', 'total pengguna', 'pengguna non aktif', 'non aktifkan', 'aktifkan akun',
      'siapa saja pengguna', 'pengguna yang ada', 'user yang ada', 'daftar user', 'pengguna sistem', 'user sistem', 'siapa saja user', 'akun yang terdaftar',
      'pengguna terdaftar', 'user terdaftar', 'jumlah user', 'berapa user', 'pengguna aktif', 'user aktif', 'tampilkan pengguna', 'tampilkan user'],
    words: ['pengguna', 'umkm', 'akun', 'daftar', 'total', 'user', 'users']
  },
  {
    key: 'admin_products',
    label: 'Monitoring produk',
    phrases: ['produk perlu ditinjau', 'produk bermasalah', 'monitoring produk', 'produk terdaftar', 'total produk', 'produk platform'],
    words: ['produk', 'monitoring', 'daftar']
  },
  {
    key: 'admin_transactions',
    label: 'Monitoring transaksi',
    phrases: ['ringkasan transaksi', 'transaksi platform', 'total transaksi', 'transaksi bermasalah', 'transaksi tertunda', 'monitoring transaksi'],
    words: ['transaksi', 'platform', 'ringkasan']
  },
  {
    key: 'admin_categories',
    label: 'Manajemen kategori',
    phrases: ['kelola kategori', 'kategori produk', 'tambah kategori', 'edit kategori', 'hapus kategori'],
    words: ['kategori']
  }
];

// ==========================================
// 2. SERVICE
// ==========================================
export class AIAssistantService {
  constructor() {
    // Endpoint proksi backend (server PHP), bukan langsung ke provider LLM.
    this.apiEndpoint = 'api/ai.php';
    this.isGenerating = false;
    // 'mock' = Local Intelligence Engine, 'api' = respons dari backend AI sungguhan
    this.lastEngine = 'mock';
    // Memori percakapan singkat: membuat chatbot mengerti lanjutan ("yang pertama")
    this.memory = { at: 0, intent: null, kind: null, items: [], commodity: null, location: null };
  }

  // ==========================================
  // PUBLIC API UNTUK UI
  // ==========================================

  /**
   * Kirim pesan pengguna dan terima balasan terstruktur.
   * @param {string} userPrompt - Pertanyaan/perintah pengguna
   * @param {Array} history - Riwayat percakapan [{role, content}]
   * @returns {Promise<{category,text,cards,actionPills,engine}>}
   */
  async sendMessage(userPrompt, history = []) {
    this.isGenerating = true;
    const cleanPrompt = (userPrompt || '').trim();
    const user = appState.getState().user;
    const snapshot = this.buildSystemSnapshot(user);

    // Simulasi jeda berpikir alami (600 - 1100ms)
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 500));

    try {
      // 1. Coba hubungi proksi backend AI (API key tetap berada di server)
      // Timeout sengaja longgar: model AI sungguhan (mis. NVIDIA NIM) butuh 5-30 detik
      // di server, dan backend bisa mencoba beberapa model cadangan. Bila semuanya
      // gagal, frontend tetap fallback ke Local Intelligence Engine.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: cleanPrompt,
          userContext: this.buildUserContext(user),
          // Snapshot sistem agar model AI luar juga memahami isi aplikasi
          snapshot: this.describeSnapshot(snapshot),
          history: history.slice(-6)
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && data.status === 'success' && data.reply && data.reply.text) {
          this.isGenerating = false;
          this.lastEngine = 'api';
          return this.normalizeReply(data.reply, 'api');
        }
      }
    } catch (e) {
      // Fallback anggun: backend belum online / timeout / API key belum diatur
    }

    // 2. Mock Intelligence Engine Mandiri (membaca state riil DesaBiz AI)
    this.isGenerating = false;
    this.lastEngine = 'mock';
    return this.normalizeReply(this.generateMockResponse(cleanPrompt, user, history, snapshot), 'mock');
  }

  /** Info engine terakhir (untuk badge UI). */
  getEngineInfo() {
    return this.lastEngine === 'api'
      ? { mode: 'api', label: 'AI API Aktif', hint: 'Balasan diproses oleh model AI melalui proksi server DesaBiz.' }
      : { mode: 'mock', label: 'Local Intelligence Engine', hint: 'API AI belum diatur di server. Balasan diproses oleh engine lokal yang tetap membaca data riil aplikasi Anda.' };
  }

  /** 7 kemampuan utama (dipakai panel samping & layar selamat datang). */
  getCapabilities() {
    const user = appState.getState().user;
    const isAdmin = user?.accountRole === 'ADMIN';
    
    if (isAdmin) {
      return [
        { icon: '👥', title: 'Monitor pengguna', desc: 'Lihat & kelola akun UMKM' },
        { icon: '🏷️', title: 'Kelola kategori', desc: 'Atur kategori produk platform' },
        { icon: '📦', title: 'Pantau produk', desc: 'Monitoring produk terdaftar' },
        { icon: '📑', title: 'Pantau pesanan', desc: 'Semua transaksi & PO platform' },
        { icon: '📊', title: 'Laporan sistem', desc: 'Statistik & aktivitas platform' },
        { icon: '⚠️', title: 'Deteksi masalah', desc: 'Temukan operasional bermasalah' },
        { icon: '🧭', title: 'Panduan admin', desc: 'Cara gunakan fitur administrasi' }
      ];
    }

    // Kapabilitas disesuaikan mode sesi: Penjual vs Pembeli
    if ((user?.role) === 'seller') {
      return [
        { icon: '📦', title: 'Kelola produk & stok', desc: 'Pantau produk & stok usaha' },
        { icon: '🧾', title: 'Bantuan pesanan', desc: 'Pesanan masuk & konfirmasi status' },
        { icon: '📊', title: 'Transaksi penjualan', desc: 'Ringkasan omzet & faktur jual' },
        { icon: '🧭', title: 'Dashboard penjual', desc: 'Panduan mode penjual' },
        { icon: '🌾', title: 'Cari supplier', desc: 'Temukan pemasok desa terverifikasi' },
        { icon: '💡', title: 'Rekomendasi produk', desc: 'Saran komoditas sesuai usaha' },
        { icon: '🤝', title: 'Rekomendasi supplier', desc: 'Peringkat mitra terbaik' }
      ];
    }

    return [
      { icon: '🌾', title: 'Mencari supplier', desc: 'Temukan pemasok desa terverifikasi' },
      { icon: '🛒', title: 'Mencari produk', desc: 'Telusuri katalog komoditas B2B' },
      { icon: '💡', title: 'Rekomendasi produk', desc: 'Saran komoditas sesuai perfil usaha' },
      { icon: '🤝', title: 'Rekomendasi supplier', desc: 'Peringkat mitra terbaik & terdekat' },
      { icon: '📊', title: 'Memahami data penjualan', desc: 'Ringkasan omzet & performa transaksi' },
      { icon: '📦', title: 'Saran sederhana soal stok', desc: 'Peringatan dini stok menipis & habis' },
      { icon: '🧭', title: 'Menemukan fitur aplikasi', desc: 'Panduan menu & cara pakai fitur' }
    ];
  }

  /** Pertanyaan cepat (contoh prompt) — berbeda per role. */
  getQuickSuggestions() {
    const user = appState.getState().user;
    const isAdmin = user?.accountRole === 'ADMIN';
    
    if (isAdmin) {
      return [
        {
          icon: '👤',
          label: 'Siapa saya & rules',
          title: 'Siapa saya dan apa peran saya dari masing-masing rules?',
          desc: 'Identitas admin, hak akses & aturan platform',
          prompt: 'Siapa saya dan apa peran saya dari masing-masing rules?'
        },
        {
          icon: '🌐',
          label: 'Semua sistem web',
          title: 'Jelaskan semua sistem yang ada di web DesaBiz AI',
          desc: 'Panduan lengkap 12 sistem terpadu platform',
          prompt: 'Jelaskan semua sistem yang ada di web DesaBiz AI.'
        },
        {
          icon: '👥',
          label: 'Total pengguna',
          title: 'Berapa jumlah UMKM yang terdaftar?',
          desc: 'Statistik pengguna platform',
          prompt: 'Berapa jumlah UMKM yang terdaftar di platform?'
        },
        {
          icon: '📦',
          label: 'Produk perlu ditinjau',
          title: 'Tampilkan produk yang perlu ditinjau',
          desc: 'Identifikasi produk bermasalah',
          prompt: 'Tampilkan produk yang perlu ditinjau.'
        },
        {
          icon: '🏷️',
          label: 'Kelola kategori',
          title: 'Bagaimana cara mengelola kategori produk?',
          desc: 'Panduan manajemen kategori',
          prompt: 'Bagaimana cara mengelola kategori produk?'
        },
        {
          icon: '📊',
          label: 'Ringkasan transaksi',
          title: 'Tampilkan ringkasan transaksi platform',
          desc: 'Statistik transaksi keseluruhan',
          prompt: 'Tampilkan ringkasan transaksi platform.'
        },
        {
          icon: '⚠️',
          label: 'Pesanan bermasalah',
          title: 'Apa saja pesanan yang bermasalah?',
          desc: 'Deteksi anomali pesanan',
          prompt: 'Apa saja pesanan yang bermasalah?'
        },
        {
          icon: '📈',
          label: 'Laporan sistem',
          title: 'Bagaimana kondisi keseluruhan platform?',
          desc: 'Laporan performa ekosistem',
          prompt: 'Bagaimana kondisi keseluruhan platform?'
        }
      ];
    }
    
    return [
      {
        icon: '👤',
        label: 'Siapa saya & rules',
        title: 'Siapa saya dan apa peran saya dari masing-masing rules?',
        desc: 'Identitas usaha, mode aktif, dan 3 rules sistem',
        prompt: 'Siapa saya dan apa peran saya dari masing-masing rules?'
      },
      {
        icon: '🌐',
        label: 'Semua sistem web',
        title: 'Jelaskan semua sistem yang ada di web ini',
        desc: 'Panduan lengkap 12 sistem terintegrasi DesaBiz AI',
        prompt: 'Jelaskan semua sistem yang ada di web ini.'
      },
      {
        icon: '🌾',
        label: 'Supplier beras',
        title: 'Saya membutuhkan supplier beras',
        desc: 'Cari pemasok beras & gabah terverifikasi',
        prompt: 'Saya membutuhkan supplier beras.'
      },
      {
        icon: '📍',
        label: 'Supplier daerah saya',
        title: 'Cari supplier di daerah saya',
        desc: 'Saring mitra terdekat dari lokasi usaha Anda',
        prompt: 'Cari supplier di daerah saya.'
      },
      {
        icon: '💡',
        label: 'Rekomendasi produk',
        title: 'Produk apa yang cocok untuk usaha saya?',
        desc: 'Rekomendasi komoditas sesuai profil usaha',
        prompt: 'Produk apa yang cocok untuk usaha saya?'
      },
      {
        icon: '⚠️',
        label: 'Stok hampir habis',
        title: 'Produk saya yang stoknya hampir habis apa saja?',
        desc: 'Audit cepat komoditas di bawah batas aman',
        prompt: 'Produk saya yang stoknya hampir habis apa saja?'
      },
      {
        icon: '📑',
        label: 'Pesanan terbaru',
        title: 'Tampilkan pesanan terbaru saya',
        desc: 'Lihat status PO terbaru beserta nominalnya',
        prompt: 'Tampilkan pesanan terbaru saya.'
      },
      {
        icon: '📊',
        label: 'Data penjualan',
        title: 'Bagaimana performa penjualan saya?',
        desc: 'Ringkasan omzet, transaksi & insight bisnis',
        prompt: 'Bagaimana performa penjualan saya?'
      },
      {
        icon: '🧭',
        label: 'Panduan fitur',
        title: 'Fitur apa saja yang ada di aplikasi ini?',
        desc: 'Bantu saya menemukan menu & cara pakainya',
        prompt: 'Fitur apa saja yang ada di aplikasi ini?'
      }
    ];
  }

  // ==========================================
  // 3. KONTEKS & SNAPSHOT SISTEM
  // ==========================================
  buildUserContext(user) {
    if (!user) return {};
    return {
      userId: user.id,
      ownerName: user.ownerName,
      businessName: user.businessName,
      businessType: user.businessType,
      email: user.email || '-',
      phone: user.phone || '-',
      address: user.address || '-',
      location: `${user.village || ''}, ${user.district || ''}, ${user.regency || ''}`.replace(/^,\s*/g, ''),
      memberSince: user.joinedAt || user.memberSince || '-',
      membership: user.membership || '-',
      isVerified: user.isVerified === true || user.verified === true,
      verificationBadge: user.verificationBadge || '-',
      role: user.role,
      accountRole: user.accountRole || 'UMKM'
    };
  }

  /** Potret lengkap state aplikasi — dipakai untuk menjawab & dikirim ke API. */
  buildSystemSnapshot(user) {
    const state = appState.getState();
    const uid = user?.id || null;

    const products = appState.getProducts() || [];
    const myProducts = (uid ? appState.getMyProducts(uid) : []) || [];
    const suppliers = appState.getSuppliers() || [];
    const orders = appState.getOrders('all', 'all') || [];
    const myOrders = orders.filter(o => o.buyerId === uid || o.sellerId === uid);
    const stock = (uid ? appState.getStockProducts(uid) : []) || [];
    const transactions = appState.getTransactions('all', 'all', '') || [];
    const myTrx = transactions.filter(t => t.buyerId === uid || t.sellerId === uid);
    const negotiations = appState.getNegotiations('all', 'all') || [];
    const conversations = appState.getConversations('all', '') || [];

    const lowStock = stock.filter(p => ['menipis', 'habis'].includes(p?.statusInfo?.status));
    const pendingTrx = myTrx.filter(t => t.status === 'Menunggu Pembayaran');
    const activeNegs = negotiations.filter(n => !['Selesai', 'Ditolak', 'Dibatalkan'].includes(n.status));
    const unreadChat = typeof appState.getTotalUnreadChatCount === 'function' ? appState.getTotalUnreadChatCount() : 0;
    const unreadNotif = appState.getUnreadNotificationsCount();

    const omzet = myTrx
      .filter(t => t.status !== 'Dibatalkan')
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

    // ===== Cakupan data berdasarkan role =====
    // ADMIN  : seluruh data platform (semua pengguna, kategori, log aktivitas, statistik admin)
    // UMKM   : hanya data milik pengguna sendiri
    const isAdmin = (user?.accountRole === 'ADMIN');
    const allUsers = isAdmin ? (appState.getUsers() || []) : [];
    const categories = isAdmin ? (appState.getCategories() || []) : [];
    const activityLogs = isAdmin ? (appState.getActivityLogs() || []) : [];
    const adminStats = isAdmin && typeof appState.getAdminStats === 'function' ? appState.getAdminStats() : {};
    // Stok SELURUH produk platform (khusus Admin) — untuk pertanyaan
    // "stok semua barang" yang mencakup seluruh sistem.
    const platformStock = isAdmin ? (appState.getStockProducts('all') || []) : [];
    // SELURUH transaksi platform (khusus Admin)
    const platformTransactions = isAdmin ? transactions : [];

    return {
      route: state.currentRoute || 'dashboard',
      user,
      profile: {
        ownerName: user?.ownerName || '-',
        businessName: user?.businessName || '-',
        businessType: user?.businessType || '-',
        email: user?.email || '-',
        phone: user?.phone || '-',
        address: user?.address || '-',
        village: user?.village || '-',
        district: user?.district || '-',
        regency: user?.regency || '-',
        role: user?.role || 'buyer',
        accountRole: user?.accountRole || 'UMKM',
        membership: user?.membership || '-',
        memberSince: user?.joinedAt || user?.memberSince || '-',
        isVerified: user?.isVerified === true || user?.verified === true,
        verificationBadge: user?.verificationBadge || '-',
        avatarInitial: user?.avatarInitial || 'UM'
      },
      products,
      myProducts,
      suppliers,
      orders,
      myOrders,
      stock,
      lowStock,
      transactions: myTrx,
      pendingTrx,
      negotiations,
      activeNegs,
      conversations,
      unreadChat,
      unreadNotif,
      allUsers,
      categories,
      activityLogs,
      adminStats,
      platformStock,
      platformTransactions,
      stats: state.stats || {},
      chart: state.salesChart || {},
      kpis: {
        totalProduk: myProducts.length || products.length,
        stokMenipis: lowStock.length,
        poAktif: myOrders.filter(o => !['Selesai / Lunas', 'Dibatalkan'].includes(o.status)).length,
        negoAktif: activeNegs.length,
        tagihanPending: pendingTrx.length,
        chatBelumDibaca: unreadChat,
        omzet
      }
    };
  }

  /** Ringkasan teks snapshot (dikirim ke model AI luar sebagai "pengetahuan sistem").
   *  Cakupan data berbeda per role:
   *  - ADMIN => SELURUH data platform (semua pengguna, kategori, pesanan, transaksi,
   *             negosiasi, log aktivitas, statistik).
   *  - UMKM/Pembeli => HANYA data milik pengguna sendiri (tidak boleh memahami
   *             data pengguna/platform lain). */
  describeSnapshot(snap) {
    if (!snap) return '';
    const rp = n => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
    const isAdmin = (snap.profile.accountRole === 'ADMIN');

    // Bagian dasar: selalu memuat profil & katalog pasar publik
    const lines = [
      `Halaman aktif: ${snap.route}`,
      `IDENTITAS PENGGUNA SAAT INI: ${snap.profile.ownerName} — pemilik usaha "${snap.profile.businessName}" ` +
        `(${snap.profile.businessType}), email ${snap.profile.email}, WhatsApp/telepon ${snap.profile.phone}, ` +
        `alamat ${snap.profile.address} (${snap.profile.village}, ${snap.profile.district}, ${snap.profile.regency}), ` +
        `keanggotaan "${snap.profile.membership}" sejak ${snap.profile.memberSince}, ` +
        `status verifikasi: ${snap.profile.isVerified ? 'Terverifikasi' : 'Belum terverifikasi'}${snap.profile.verificationBadge && snap.profile.verificationBadge !== '-' ? ` (${snap.profile.verificationBadge})` : ''}.`,
      `Peran di platform: ${snap.profile.role} (buyer = pembeli pasokan, seller = penjual komoditas), hak akses: ${snap.profile.accountRole}${isAdmin ? ' — ADMINISTRATOR platform (SELURUH platform)' : ' — pelaku UMKM (hanya data milik sendiri)'}.`,
      `Katalog pasar: ${snap.products.length} produk, ${snap.suppliers.length} supplier.`
    ];

    if (isAdmin) {
      // ================= SCOPE ADMIN: SELURUH SISTEM =================
      lines.push(`AKSES ADMIN: Anda sedang melayani ADMINISTRATOR platform. SELURUH data platform di bawah ini adalah data yang Anda kelola — Anda BOLEH dan HARUS membahasnya (termasuk total pengguna, semua transaksi, statistik keseluruhan, daftar pengguna). Tindakan perubahan data hanya via Panel Admin, bukan via chat.`);
      const a = snap.adminStats || {};
      lines.push(`Ringkasan platform: ${a.totalPengguna ?? '-'} pengguna (${a.totalUmkM ?? '-'} UMKM, ${a.totalAdmin ?? '-'} admin, ${a.penggunaNonAktif ?? 0} non-aktif), ${a.totalProduk ?? snap.products.length} produk, ${a.totalPesanan ?? snap.orders.length} pesanan, ${a.totalTransaksi ?? snap.transactions.length} transaksi, ${a.totalKategori ?? (snap.categories || []).length} kategori.`);
      if (a.totalTransaksiNominal != null) lines.push(`Total nilai transaksi tercatat: ${rp(a.totalTransaksiNominal)}.`);
      if (a.transaksiTertunda != null) lines.push(`Transaksi menunggu pembayaran: ${a.transaksiTertunda}.`);

      // Daftar pengguna (lengkap: nama | usaha | email | peran | status | lokasi)
      if ((snap.allUsers || []).length) {
        const us = [...snap.allUsers].sort((a, b) => String(a.ownerName || '').localeCompare(String(b.ownerName || '')));
        lines.push(`Daftar SELURUH pengguna platform (${us.length} akun) — format (nama | usaha | email | peran | status | lokasi):\n` +
          us.map(u => `• ${u.ownerName || '-'} | ${u.businessName || '-'} | ${u.email || '-'} | ${u.accountRole || 'UMKM'} | ${u.isActive === false ? 'NON-AKTIF' : 'aktif'} | ${[u.village, u.regency].filter(Boolean).join(', ') || '-'}`).join('\n'));
        const inactive = us.filter(u => u.isActive === false);
        lines.push(`Pengguna non-aktif: ${inactive.length ? inactive.map(u => u.ownerName).join(', ') : 'tidak ada'}.`);
      }
      // Kategori
      if ((snap.categories || []).length) {
        lines.push(`Kategori produk: ${snap.categories.join(', ')}.`);
      }
      // Katalog produk
      if (snap.products.length) {
        lines.push(`Katalog produk (nama | kategori | harga | penjual):\n` +
          snap.products.map(p => `• ${p.name || '-'} | ${p.category || '-'} | ${rp(p.price)}/${p.unit || 'unit'} | ${p.sellerName || '-'}`).join('\n'));
      }
      // Stok SELURUH barang platform — urut dari stok TERBANYAK ke TERENDAH
      const pStock = [...(snap.platformStock || snap.stock || [])].sort((a, b) => (b.stock || 0) - (a.stock || 0));
      if (pStock.length) {
        lines.push(`STOK SELURUH BARANG DI SISTEM (${pStock.length} barang, urut dari stok TERBANYAK ke TERENDAH) — format (urutan. nama | stok | satuan | batas aman | status | pemilik):\n` +
          pStock.map((x, i) => `${i + 1}. ${x.name || '-'} | ${Number(x.stock || 0).toLocaleString('id-ID')} | ${x.unit || '-'} | ${Number(x.threshold || 0).toLocaleString('id-ID')} | ${String(x.statusInfo?.status || '-').toUpperCase()} | ${x.sellerName || '-'}`).join('\n'));
        const lowP = pStock.filter(x => ['menipis', 'habis'].includes(String(x.statusInfo?.status || '').toLowerCase()));
        lines.push(`Barang menipis/habis: ${lowP.length ? lowP.map(x => `${x.name} (sisa ${Number(x.stock || 0).toLocaleString('id-ID')} ${x.unit || ''})`).join(', ') : 'tidak ada'}.`);
        lines.push(`Barang stok terbanyak: ${pStock[0]?.name || '-'} (${Number(pStock[0]?.stock || 0).toLocaleString('id-ID')} ${pStock[0]?.unit || ''}); stok paling sedikit: ${pStock[pStock.length - 1]?.name || '-'} (${Number(pStock[pStock.length - 1]?.stock || 0).toLocaleString('id-ID')} ${pStock[pStock.length - 1]?.unit || ''}).`);
      }
      // Pesanan
      if (snap.orders.length) {
        const o = snap.orders;
        lines.push(`Seluruh pesanan (${o.length} PO):\n` +
          o.map(x => `• ${x.id} | ${x.buyerName} membeli ${x.productName} (${x.quantity} ${x.productUnit || ''}) dari ${x.sellerName} | ${rp(x.totalAmount)} | ${x.status}`).join('\n'));
      }
      // Transaksi (seluruh platform untuk Admin)
      const adminTrx = snap.platformTransactions || snap.transactions;
      if (adminTrx.length) {
        lines.push(`Seluruh transaksi (${adminTrx.length}):\n` +
          adminTrx.map(t => `• ${t.id} | ${t.buyerName} → ${t.sellerName} | ${rp(t.totalAmount)} | ${t.status}`).join('\n'));
      }
      // Negosiasi
      if (snap.negotiations.length) {
        lines.push(`Negosiasi aktif (${snap.negotiations.length}):\n` +
          snap.negotiations.map(n => `• ${n.id} | ${n.buyerName} ↔ ${n.sellerName} | ${n.productName} | tawar ${rp(n.offerPrice)} | ${n.status}`).join('\n'));
      }
      // Log aktivitas
      if ((snap.activityLogs || []).length) {
        lines.push(`Log aktivitas terbaru:\n` +
          snap.activityLogs.slice(0, 12).map(l => `• [${l.time || '-'}] ${l.title || l.action || '-'} — ${l.desc || ''}`).join('\n'));
      }
    } else {
      // ================= SCOPE UMKM: DATA MILIK SENDIRI =================
      lines.push(`Cakupan jawaban Anda TERBATAS pada data usaha Anda sendiri (milik ${snap.profile.ownerName}). Jangan membocorkan atau mengarang data pengguna/platform lain. Jika diminta fungsi admin (kelola kategori, lihat semua pengguna), jelaskan bahwa hal itu memerlukan akses Admin.`);
      lines.push(`RINGKASAN BAGIAN ANDA DI WEB INI: ${snap.myProducts.length} produk dijual, ${snap.myOrders.length} PO tercatat (${snap.kpis.poAktif} aktif), ${snap.transactions.length} transaksi (${snap.kpis.tagihanPending} menunggu pembayaran), ${snap.negotiations.length} negosiasi (${snap.kpis.negoAktif} aktif), ${snap.unreadChat} chat belum dibaca, ${snap.unreadNotif} notifikasi belum dibaca, omzet ${rp(snap.kpis.omzet)}.`);
      lines.push(`Supplier terdaftar: ${snap.suppliers.length}.`);
      lines.push(`Daftar supplier (nama | jenis usaha | lokasi | rating | produk andalan):\n` +
        snap.suppliers.map(s => `• ${s.businessName || s.name || '-'} | ${s.businessType || '-'} | ${s.location || '-'} | rating ${s.rating ?? '-'} | ${(s.featuredProducts || []).join(', ') || '-'}`).join('\n'));
      lines.push(`Stok menipis/habis milik Anda: ` + ((snap.stock || []).filter(x => ['menipis', 'habis'].includes(String(x.statusInfo?.status || '').toLowerCase())).map(x => `${x.name} sisa ${x.stock} ${x.unit || ''}`).join(', ') || 'tidak ada'));
      // SELURUH stok milik pengguna — urut dari stok TERBANYAK ke TERENDAH
      const myStock = [...(snap.stock || [])].sort((a, b) => (b.stock || 0) - (a.stock || 0));
      if (myStock.length) {
        lines.push(`STOK SEMUA BARANG MILIK ANDA (${myStock.length} barang, urut dari stok TERBANYAK ke TERENDAH) — format (urutan. nama | stok | satuan | batas aman | status):\n` +
          myStock.map((x, i) => `${i + 1}. ${x.name || '-'} | ${Number(x.stock || 0).toLocaleString('id-ID')} | ${x.unit || '-'} | ${Number(x.threshold || 0).toLocaleString('id-ID')} | ${String(x.statusInfo?.status || '-').toUpperCase()}`).join('\n'));
        lines.push(`Stok terbanyak: ${myStock[0]?.name || '-'} (${Number(myStock[0]?.stock || 0).toLocaleString('id-ID')} ${myStock[0]?.unit || ''}); stok paling sedikit: ${myStock[myStock.length - 1]?.name || '-'} (${Number(myStock[myStock.length - 1]?.stock || 0).toLocaleString('id-ID')} ${myStock[myStock.length - 1]?.unit || ''}).`);
      }
      lines.push(`Pesanan milik Anda: ${snap.myOrders.length} PO (${snap.kpis.poAktif} aktif).`);
      if (snap.myOrders.length) {
        lines.push(`  Detail:\n` +
          snap.myOrders.map(x => `  • ${x.id} | ${x.productName} (${x.quantity} ${x.productUnit || ''}) | ${rp(x.totalAmount)} | ${x.status} (${x.buyerId === snap.user?.id ? 'Anda pembeli' : 'Anda penjual'})`).join('\n'));
      }
      lines.push(`Transaksi milik Anda: ${snap.transactions.length} (${snap.kpis.tagihanPending} menunggu pembayaran).`);
      lines.push(`Omzet tercatat Anda: ${rp(snap.kpis.omzet)}.`);
      lines.push(`Negosiasi milik Anda: ${snap.negotiations.length} total, ${snap.kpis.negoAktif} aktif.`);
      lines.push(`Chat belum dibaca: ${snap.unreadChat}; notifikasi: ${snap.unreadNotif}.`);
    }

    return lines.join('\n');
  }

  // ==========================================
  // 4. PARSING PERTANYAAN
  // ==========================================
  detectCommodity(text) {
    // Pemicu satu kata dicocokkan dengan batas kata agar "teh" tidak cocok
    // dengan potongan kata lain; pemicu frasa dicocokkan sebagai substring.
    const q = (text || '').toLowerCase();
    return COMMODITIES.find(c =>
      c.triggers.some(t =>
        t.includes(' ')
          ? q.includes(t)
          : new RegExp(`(^|[^a-z])${t}([^a-z]|$)`).test(q)
      )
    ) || null;
  }

  isHowTo(text) {
    const q = ` ${(text || '').toLowerCase()} `;
    return HOWTO_TRIGGERS.some(t => q.includes(t));
  }

  detectLocation(text, user) {
    const q = (text || '').toLowerCase();
    const mine = (user?.regency || '').toLowerCase().replace(/^kabupaten\s+|^kota\s+/, '');
    if (['daerah saya', 'lokasi saya', 'sekitar saya', 'terdekat', 'di daerah', 'dekat saya', 'di sini'].some(t => q.includes(t))) {
      return { label: user?.regency || 'daerah Anda', mine: true };
    }
    const found = NEARBY_REGENCIES.find(r => q.includes(r));
    if (found) {
      const pretty = found.charAt(0).toUpperCase() + found.slice(1);
      return { label: `Kabupaten ${pretty}`, mine: found === mine };
    }
    if (mine && q.includes(mine)) return { label: user.regency, mine: true };
    return null;
  }

  /** Ekstrak ekstra dari kalimat: batas harga, urutan, filter status, ID dokumen. */
  parsePrompt(text, user) {
    const lower = (text || '').toLowerCase().trim();
    const commodity = this.detectCommodity(lower);
    const location = this.detectLocation(lower, user);
    const howTo = this.isHowTo(lower);

    // Batas harga: "di bawah 50 ribu", "maks Rp 12.000"
    let maxPrice = null;
    const priceMatch = lower.match(PRICE_UNDER_RE);
    if (priceMatch) {
      let value = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
      if (priceMatch[2] === 'ribu') value *= 1000;
      if (priceMatch[2] === 'jt' || priceMatch[2] === 'juta') value *= 1000000;
      if (value > 0) maxPrice = value;
    }

    const wantsCheapest = ['termurah', 'paling murah', 'yang murah', 'murah ', 'harga paling rendah', 'paling terjangkau']
      .some(t => lower.includes(t));
    const wantsCostliest = ['termahal', 'paling mahal', 'harga tertinggi', 'premium'].some(t => lower.includes(t));

    // Nomor urut untuk melanjutkan jawaban sebelumnya ("yang kedua", "nomor 3")
    let ordinal = 0;
    const ordWords = { pertama: 1, kedua: 2, ketiga: 3, keempat: 4, kelima: 5, keenam: 6, ketujuh: 7, kedelapan: 8, kesembilan: 9, kesepuluh: 10 };
    Object.keys(ordWords).forEach(w => { if (new RegExp(`\\b${w}\\b`).test(lower)) ordinal = ordWords[w]; });
    const ordMatch = lower.match(/\byang\s+ke[-\s]?(\d+)\b/) || lower.match(/\bnomor\s+(\d+)\b/) || lower.match(/^\s*(\d+)\s*$/);
    if (ordMatch) ordinal = parseInt(ordMatch[1], 10);

    // Filter status yang diminta
    let statusFilter = null;
    if (['belum bayar', 'belum dibayar', 'menunggu pembayaran', 'pending', 'tagihan'].some(t => lower.includes(t))) statusFilter = 'pending';
    else if (['sudah lunas', 'selesai', 'lunas', 'berhasil'].some(t => lower.includes(t))) statusFilter = 'done';
    else if (['dibatalkan', 'batal'].some(t => lower.includes(t))) statusFilter = 'cancelled';
    else if (['dikirim', 'pengiriman'].some(t => lower.includes(t))) statusFilter = 'shipped';
    else if (['masuk', 'sebagai penjual', 'dari pembeli'].some(t => lower.includes(t))) statusFilter = 'incoming';
    else if (['keluar', 'saya beli', 'sebagai pembeli', 'ke supplier'].some(t => lower.includes(t))) statusFilter = 'outgoing';

    // Referensi ke jawaban sebelumnya
    const wantsAll = ['tampilkan semua', 'semua lagi', 'selanjutnya', 'lanjut', 'yang lain', 'lainnya', 'sisa nya', 'sisanya'].some(t => lower.includes(t));
    const wantsDetail = ['detail', ' jelaskan', 'lebih lanjut', 'siapa itu', 'ceritakan'].some(t => lower.includes(t));

    // Sapaan: longgarkan pengulangan huruf agar "halooo"/"haiii" tetap terbaca sapaan
    const greetingNorm = lower.replace(/(.)\1+/g, '$1');
    const greeting = GREETING_RE.test(greetingNorm) || GREETING_RE.test(lower);

    // Kata penunjuk lanjutan percakapan: "yang pertama", "yang di Sukabumi",
    // "termurah", "nomor 2", "yang tadi" -> hanya inilah yang boleh jadi referensi.
    const looksLikeReference = [
      'yang pertama', 'yang kedua', 'yang ketiga', 'yang ke', 'nomor', 'tersebut', 'tadi',
      'sebelumnya', 'selanjutnya', 'sisanya', 'sisa nya', 'termurah', 'termahal', 'paling murah',
      'paling mahal', 'yang murah', 'yang mahal', 'yang di', 'yang ada di', 'yang lain', 'lainnya',
      'lanjut', 'tampilkan semua', 'semua', 'yang itu', 'itu saja', 'yang kemarin'
    ].some(t => lower.includes(t)) || /\byang\s+ke[-\s]?\d+\b/.test(lower) || /^\s*\d+\s*$/.test(lower);

    const wantsSupplier = SUPPLIER_TRIGGERS.some(t => lower.includes(t));
    const wantsProduct = PRODUCT_TRIGGERS.some(t => lower.includes(t));

    return {
      raw: text || '',
      lower,
      words: lower.match(/[a-z0-9]+/g) || [],
      commodity,
      location,
      howTo,
      maxPrice,
      wantsCheapest,
      wantsCostliest,
      ordinal,
      statusFilter,
      wantsAll,
      wantsDetail,
      looksLikeReference,
      wantsSupplier,
      wantsProduct,
      // "kode pos" adalah data profil, bukan permintaan menulis kode
      outOfScope: CODE_RE.test(lower) && !/\bkode\s+pos\b/.test(lower),
      greeting,
      idMatch: (text || '').match(ORDER_ID_RE),
      isShort: (text || '').length <= 40
    };
  }

  // ==========================================
  // 5. ROUTER INTENT (berbasis skor)
  // ==========================================
  scoreIntents(parsed) {
    const scores = {};
    INTENTS.forEach(def => {
      let score = 0;
      def.phrases.forEach(p => { if (parsed.lower.includes(p)) score += 3; });
      def.words.forEach(w => {
        if (new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(parsed.lower)) score += 1;
      });
      scores[def.key] = score;
    });
    return scores;
  }

  resolveIntent(parsed) {
    const scores = this.scoreIntents(parsed);
    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [bestKey, bestScore] = ranked[0];

    // Di luar cakupan sistem (mis. "Buatkan codingan python...") -> penolakan sopan
    // yang mengarahkan pengguna kembali ke fitur DesaBiz AI. Dicek lebih dulu
    // agar tidak terjatuh ke intent lain yang kebetulan ikut cocok (mis. "nama anda").
    if (parsed.outOfScope && bestScore < 4) return { key: 'out_of_scope', scores };

    // Sapaan murni
    if (parsed.greeting && bestScore < 3) return { key: 'greeting', scores };

    // "Bagaimana/cara X" -> panduan fitur HANYA bila kata "cara/fitur" itu sendiri
    // yang paling dominan. Kalau topiknya data (penjualan, stok, pesanan), jawaban
    // data yang dipakai agar pertanyaan dijawab sesuai maksudnya.
    if (parsed.howTo && scores.feature >= bestScore) return { key: 'feature', scores, topic: bestKey };

    // Kalimat yang jelas menunjuk jawaban sebelumnya -> lanjutkan memori
    if (bestScore === 0 && parsed.looksLikeReference) return { key: 'reference', scores };

    if (bestScore === 0) return { key: 'fallback', scores };
    return { key: bestKey, scores };
  }

  // ==========================================
  // 6. MEMORI PERCAKAPAN
  // ==========================================
  remember(payload) {
    this.memory = { at: Date.now(), ...payload };
  }

  recall() {
    // Memori hanya relevan bila percakapan masih hangat (< 30 menit)
    if (Date.now() - this.memory.at > 30 * 60 * 1000) return null;
    return this.memory.items?.length ? this.memory : null;
  }

  /**
   * Bila memori kosong (mis. setelah reload), rekonstruksi dari riwayat chat:
   * jalankan ulang intent pesan user sebelumnya untuk mengembalikan daftar item.
   */
  rebuildMemory(parsed, user, snap, history) {
    if (this.recall()) return this.memory;
    const lastUserMsg = [...(history || [])].reverse().find(h => h.role === 'user' && h.content !== parsed.raw);
    if (!lastUserMsg) return null;

    const prevParsed = this.parsePrompt(lastUserMsg.content, user);
    const prevIntent = this.resolveIntent(prevParsed);
    if (['greeting', 'feature', 'fallback', 'reference', 'identity', 'out_of_scope', 'whoami', 'all_systems'].includes(prevIntent.key)) return null;

    this.runIntent(prevIntent.key, prevParsed, user, snap, { silent: true });
    return this.memory.items?.length ? this.memory : null;
  }

  // ==========================================
  // 7. MOCK INTELLIGENCE ENGINE (dispatcher)
  // ==========================================
  generateMockResponse(prompt, user, history = [], snapshot = null) {
    const snap = snapshot || this.buildSystemSnapshot(user);
    const parsed = this.parsePrompt(prompt, user);
    const intent = this.resolveIntent(parsed);

    // A. Tanya langsung tentang ID dokumen (PO / faktur / nego)
    if (parsed.idMatch && ['fallback', 'reference', 'orders', 'transactions', 'negotiation'].includes(intent.key)) {
      return this.replyById(parsed.idMatch[1].toUpperCase().replace(/\s/g, '-'), user, snap);
    }

    // B. Lanjutan percakapan ("yang pertama", "yang termurah", "yang di Sukabumi")
    if (intent.key === 'reference') {
      const mem = this.recall() || this.rebuildMemory(parsed, user, snap, history);
      if (mem) return this.replyReference(parsed, mem, user, snap);
      // Tidak ada memori -> perlakukan sebagai pertanyaan baru
      return this.replyClarify(user, snap, parsed);
    }

    return this.runIntent(intent.key, parsed, user, snap);
  }

  /** Jalankan satu intent -> handler yang sesuai. */
  runIntent(key, parsed, user, snap, opts = {}) {
    switch (key) {
      case 'whoami': return this.replyWhoAmI(parsed, user, snap);
      case 'all_systems': return this.replyAllSystems(parsed, user, snap);
      case 'supplier': return this.replySupplier(parsed, user, snap);
      case 'product_recommend': return this.replyProductRecommend(parsed, user, snap);
      case 'product_search': return this.replyProductSearch(parsed, user, snap);
      case 'stock': return this.replyStock(parsed, user, snap);
      case 'sales': return this.replySales(parsed, user, snap);
      case 'orders': return this.replyOrders(parsed, user, snap);
      case 'negotiation': return this.replyNegotiations(parsed, user, snap);
      case 'transactions': return this.replyTransactions(parsed, user, snap);
      case 'my_products': return this.replyMyProducts(parsed, user, snap);
      case 'chats': return this.replyChats(parsed, user, snap);
      case 'profile': return this.replyProfile(parsed, user, snap);
      case 'summary': return this.replySummary(parsed, user, snap);
      case 'feature': return this.replyFeature(parsed, user, snap);
      case 'identity': return this.replyIdentity(user, snap);
      case 'admin_users': return this.replyAdminUsers(parsed, user, snap);
      case 'admin_products': return this.replyAdminProducts(parsed, user, snap);
      case 'admin_transactions': return this.replyAdminTransactions(parsed, user, snap);
      case 'admin_categories': return this.replyAdminCategories(parsed, user, snap);
      case 'out_of_scope': return this.replyOutOfScope(user, snap, parsed);
      case 'greeting': return this.replyGreeting(user, snap);
      default: return this.replyFallback(parsed, user, snap, opts);
    }
  }

  // ==========================================
  // 8. HANDLER: SUPPLIER
  // ==========================================
  replySupplier(parsed, user, snap) {
    const commodity = parsed.commodity;
    const location = parsed.location;
    let candidates = snap.suppliers.filter(s => s.sellerId !== user?.id && s.id !== user?.id);

    if (location) {
      const needle = location.label.toLowerCase().replace(/^kabupaten\s+|^kota\s+/, '');
      const inArea = candidates.filter(s => {
        const hay = `${s.regency || ''} ${s.location || ''} ${s.district || ''}`.toLowerCase();
        return hay.includes(needle) || NEARBY_REGENCIES.some(n => hay.includes(n) && (location.mine || n === needle));
      });
      if (inArea.length) candidates = inArea;
    }

    let matched = [];
    if (commodity) {
      matched = candidates
        .map(s => ({ s, score: this.scoreSupplier(s, commodity) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score || (b.s.rating || 0) - (a.s.rating || 0))
        .map(x => x.s);
    }
    if (!matched.length) {
      matched = [...candidates].sort(
        (a, b) => (b.rating || 0) - (a.rating || 0) || (b.transactionCount || 0) - (a.transactionCount || 0)
      );
    }

    if (!matched.length) {
      return {
        category: 'supplier',
        text:
          `Saya belum menemukan supplier lain di jaringan Anda` +
          (commodity ? ` untuk komoditas **${commodity.label}**` : '') +
          (location ? ` di wilayah **${location.label}**` : '') +
          `. Buka **Direktori Supplier** untuk menelusuri seluruh mitra desa, atau sebutkan kabupaten lain (mis. *Sukabumi*, *Bandung*).`,
        cards: [],
        actionPills: [
          { label: '🌾 Buka Direktori Supplier', link: '#/supplier' },
          { label: '🛒 Jelajah Katalog Produk', link: '#/produk' },
          { label: '💡 Lihat rekomendasi produk', prompt: 'Produk apa yang cocok untuk usaha saya?' }
        ]
      };
    }

    const userName = user?.ownerName || 'Budi';
    const userBiz = user?.businessName || 'usaha Anda';

    let intro;
    if (commodity && location) {
      intro = `Siap, Pak **${userName}**. Saya dapat **${matched.length} supplier ${commodity.label}** yang beroperasi di sekitar **${location.label}**${location.mine ? ` (lokasi usaha *${userBiz}*)` : ''}. Ini yang paling saya rekomendasikan:`;
    } else if (commodity) {
      intro = `Kebutuhan **${commodity.label}** saya tangkap. Ada **${matched.length} supplier** yang cocok — ini yang terbaik:`;
    } else if (location) {
      intro = `Untuk wilayah **${location.label}**, ini supplier terdekat yang bisa diajak kerja sama:`;
    } else {
      intro = `Ini supplier terverifikasi yang paling relevan dengan kebutuhan pasokan Anda:`;
    }

    this.remember({ intent: 'supplier', kind: 'supplier', items: matched, commodity, location: location?.label || null });

    return {
      category: 'supplier',
      text:
        `${intro}` +
        (commodity?.key === 'beras'
          ? `\n\n*Catatan kecil:* usaha Anda (*${userBiz}*) sendiri dikenal sebagai sentra **Beras Mentik Wangi Organik** di Pacet, jadi daftar ini lebih ke pemasok pelengkap.`
          : '') +
        `\n\nMau saya urutkan ulang berdasarkan **jarak terdekat** atau **rating tertinggi**?`,
      cards: matched.slice(0, 3).map(s => this.supplierCard(s)),
      actionPills: [
        { label: '🌾 Lihat semua supplier', link: '#/supplier' },
        { label: '💬 Chat supplier #1', link: `#/chat?partnerId=${matched[0]?.sellerId || ''}` },
        { label: '📍 Yang di daerah saya', prompt: 'Cari supplier di daerah saya.' }
      ]
    };
  }

  // ==========================================
  // 9. HANDLER: PRODUK (pencarian + rekomendasi)
  // ==========================================
  filterProducts(parsed, user, snap, { excludeMine = true, useKeywords = true } = {}) {
    let list = snap.products.filter(p => (excludeMine ? p.sellerId !== user?.id : true));

    if (parsed.commodity) {
      const hits = list.filter(p =>
        parsed.commodity.cats.includes(p.category) ||
        parsed.commodity.terms.some(t => `${p.name} ${p.category} ${p.description || ''}`.toLowerCase().includes(t))
      );
      if (hits.length) list = hits;
    } else if (useKeywords) {
      // Kata kunci bebas (mis. "kopi arabika", "cabai keriting"). Pertanyaan umum
      // ("apa yang cocok untuk usaha saya") sengaja TIDAK difilter di sini.
      const stop = new Set([
        'yang', 'untuk', 'dengan', 'harga', 'cari', 'produk', 'saya', 'mau', 'ada', 'berapa',
        'tolong', 'silakan', 'cocok', 'usaha', 'rekomendasi', 'komoditas', 'jual', 'beli',
        'butuh', 'lihat', 'tampilkan', 'bantu', 'sebutkan', 'aplikasi', 'katalog', 'punya'
      ]);
      const keys = parsed.words.filter(w => w.length > 3 && !stop.has(w));
      if (keys.length) {
        const hits = list.filter(p => keys.some(k => `${p.name} ${p.category} ${p.description || ''}`.toLowerCase().includes(k)));
        if (hits.length) list = hits;
      }
    }

    if (parsed.location) {
      const needle = parsed.location.label.toLowerCase().replace(/^kabupaten\s+|^kota\s+/, '');
      const hits = list.filter(p => `${p.regency || ''} ${p.location || ''}`.toLowerCase().includes(needle));
      if (hits.length) list = hits;
    }

    if (parsed.maxPrice) {
      const hits = list.filter(p => Number(p.price) <= parsed.maxPrice);
      if (hits.length) list = hits;
    }

    if (parsed.wantsCheapest) list = [...list].sort((a, b) => Number(a.price) - Number(b.price));
    else if (parsed.wantsCostliest) list = [...list].sort((a, b) => Number(b.price) - Number(a.price));
    else list = [...list].sort((a, b) => (Number(b.stock) > 0 ? 1 : 0) - (Number(a.stock) > 0 ? 1 : 0) || (b.rating || 0) - (a.rating || 0));

    return list;
  }

  replyProductSearch(parsed, user, snap) {
    const list = this.filterProducts(parsed, user, snap);
    const userLoc = user?.regency || 'Kabupaten Cianjur';

    if (!list.length) {
      return {
        category: 'product',
        text:
          `Maaf, belum ada komoditas ${parsed.commodity ? `**${parsed.commodity.label}**` : 'yang Anda maksud'} yang cocok di katalog B2B DesaBiz AI` +
          `${parsed.location ? ` untuk wilayah **${parsed.location.label}**` : ''}. ` +
          `Coba sebutkan komoditas lain (mis. *kopi*, *cabai*, *pupuk*) atau lihat seluruh katalog.`,
        cards: [],
        actionPills: [
          { label: '🛒 Buka Marketplace B2B', link: '#/produk' },
          { label: '🌾 Cari Supplier Komoditas', prompt: `Saya membutuhkan supplier ${parsed.commodity ? parsed.commodity.key : 'beras'}.` },
          { label: '💡 Rekomendasi untuk usaha saya', prompt: 'Produk apa yang cocok untuk usaha saya?' }
        ]
      };
    }

    const sortNote = parsed.wantsCheapest ? ' Saya urutkan dari yang **paling murah**.'
      : parsed.wantsCostliest ? ' Saya urutkan dari yang **paling mahal**.' : '';

    this.remember({ intent: 'product_search', kind: 'product', items: list, commodity: parsed.commodity, location: parsed.location?.label || null });

    return {
      category: 'product',
      text:
        `Ketemu. Ada **${list.length} komoditas**${parsed.commodity ? ` ${parsed.commodity.label}` : ''}` +
        `${parsed.location ? ` di sekitar **${parsed.location.label}**` : ''}.${sortNote} Ini yang paling layak Anda lihat:`,
      cards: list.slice(0, 3).map(p => this.productCard(p)),
      actionPills: [
        { label: '🛒 Lihat semua di katalog', link: '#/produk' },
        { label: '📑 Buat PO untuk #1', link: `#/pesanan-buat?productId=${list[0]?.id}` },
        { label: '🤝 Nego harga #1', link: `#/negosiasi?action=create&productId=${list[0]?.id}` },
        { label: 'Yang lebih murah', prompt: 'Produk paling murah.' }
      ]
    };
  }

  replyProductRecommend(parsed, user, snap) {
    const list = this.filterProducts(parsed, user, snap, { useKeywords: false });
    const recommended = list.slice(0, 3);
    const userLoc = user?.regency || 'Kabupaten Cianjur';

    this.remember({ intent: 'product_recommend', kind: 'product', items: list, commodity: parsed.commodity, location: null });

    const reasons = recommended
      .map((p, i) => `${i + 1}. **${p.name}** — Rp ${Number(p.price).toLocaleString('id-ID')}/${p.unit} dari ${p.sellerName} (${p.regency || p.location})`)
      .join('\n');

    return {
      category: 'product',
      text:
        `Berdasarkan profil usaha *${snap.profile.businessName}* di **${snap.profile.regency}**, ini komoditas yang paling berpotensi melengkapi lini jualan Anda:\n\n` +
        `${reasons}\n\n` +
        `Mau saya carikan **supplier** untuk salah satunya?`,
      cards: recommended.map(p => this.productCard(p)),
      actionPills: [
        { label: '🛒 Jelajah katalog', link: '#/produk' },
        { label: '🤝 Nego harga partai besar', link: '#/negosiasi' },
        { label: '⚠️ Cek stok saya dulu', prompt: 'Produk saya yang stoknya hampir habis apa saja?' }
      ]
    };
  }

  // ==========================================
  // 10. HANDLER: STOK
  // ==========================================
  replyStock(parsed, user, snap) {
    const isAdmin = snap.profile.accountRole === 'ADMIN';
    const ownStock = snap.stock || [];

    // Sumber data: Admin boleh melihat stok SELURUH platform bila ditanya
    // tentang "semua barang di sistem"; UMKM tetap hanya stok miliknya sendiri.
    const asksPlatform = isAdmin && ['sistem', 'platform', 'semua pengguna', 'seluruh', 'di desabiz', 'gudang semua', 'semua umkm']
      .some(t => parsed.lower.includes(t));
    let stock = asksPlatform ? (snap.platformStock || ownStock) : ownStock;
    // Admin umumnya tidak memiliki produk sendiri — bila stok milik kosong,
    // jatuhkan ke stok platform agar pertanyaan "stok saya" tetap terjawab.
    if (isAdmin && !stock.length) stock = snap.platformStock || ownStock;

    if (!stock.length) {
      return {
        category: 'stock',
        text: `Belum ada komoditas tercatat di gudang Anda. Tambahkan produk terlebih dahulu agar saya bisa memantau batas aman stoknya.`,
        cards: [],
        actionPills: [
          { label: '📦 Buka Manajemen Stok', link: '#/stok' },
          { label: '➕ Tambah Produk', link: '#/produk' }
        ]
      };
    }

    let pool = stock;
    if (parsed.commodity) {
      const hits = stock.filter(p => `${p.name} ${p.category || ''}`.toLowerCase().includes(parsed.commodity.terms[0]));
      if (hits.length) pool = hits;
    }

    const statusOf = p => String(p?.statusInfo?.status || '').toLowerCase();
    const isLow = p => ['menipis', 'habis'].includes(statusOf(p));
    const totalValue = pool.reduce((s, p) => s + (p.inventoryValue || 0), 0);

    // Urutkan SELURUH daftar: dari stok TERBANYAK ke TERENDAH (menipis di paling bawah)
    const sorted = [...pool].sort((a, b) => (b.stock || 0) - (a.stock || 0));
    const low = sorted.filter(isLow);

    // Permintaan daftar lengkap: "stok semua barang", "daftar stok", "urutkan stok",
    // "dari terbanyak", "tampilkan semua stok" — diprioritaskan meski kalimat ikut
    // menyebut kata "menipis" (kata "menipis" hanya menandai, bukan filter tunggal).
    const wantFullList = (
      ['semua stok', 'stok semua', 'stok semua barang', 'daftar stok', 'seluruh stok', 'stok lengkap',
        'urutkan stok', 'urut stok', 'terbanyak', 'dari stok', 'semua barang', 'semua produk',
        'tampilkan semua', 'daftar barang', 'dari yang terbanyak', 'sampai yang menipis']
        .some(t => parsed.lower.includes(t)) || parsed.wantsAll
    );

    this.remember({ intent: 'stock', kind: 'stock', items: sorted, commodity: parsed.commodity, location: null });

    const fmt = n => Number(n || 0).toLocaleString('id-ID');
    let replyText;

    if (wantFullList) {
      // ===== DAFTAR LENGKAP: stok terbanyak -> stok menipis =====
      replyText =
        `Berikut **seluruh ${sorted.length} barang** di ${asksPlatform ? 'gudang seluruh sistem' : 'gudang Anda'}, ` +
        `diurutkan dari **stok terbanyak** sampai **stok paling sedikit**:\n\n`;
      sorted.forEach((p, i) => {
        const st = statusOf(p);
        const flag = st === 'habis' ? ' 🚫 HABIS' : st === 'menipis' ? ' ⚠️ MENIPIS' : ' ✅';
        replyText +=
          `${i + 1}. **${p.name}** — **${fmt(p.stock)} ${p.unit || ''}** ` +
          `(batas aman ${fmt(p.threshold)}${p.sellerName ? ` • ${p.sellerName}` : ''})${flag}\n`;
      });
      replyText += `\n**Total nilai persediaan: Rp ${fmt(totalValue)}.**\n`;
      if (low.length) {
        replyText += `⚠️ **${low.length} barang menipis/habis:** ` +
          low.map(p => `${p.name} (sisa ${fmt(p.stock)} ${p.unit || ''})`).join(', ') + `.\n\n` +
          `Mau saya carikan supplier untuk barang yang menipis?`;
      } else {
        replyText += `✅ Semua barang masih di atas batas aman.\n\nSaran saya, lakukan stock opname tiap akhir pekan supaya tidak kaget saat PO masuk.`;
      }
    } else if (low.length) {
      // ===== FOKUS BARANG BERMASALAH =====
      const critical = [...low].sort((a, b) => (a.stock || 0) - (b.stock || 0));
      replyText = `Hati-hati, Pak. **${critical.length} komoditas** sudah di bawah batas aman:\n\n`;
      critical.forEach(p => {
        replyText +=
          `• **${p.name}** tinggal **${fmt(p.stock)} ${p.unit || ''}** ` +
          `(batas aman ${fmt(p.threshold)} ${p.unit || ''}) → idealnya stok ulang ${fmt((p.threshold || 0) * 2)} ${p.unit || ''}.\n`;
      });
      replyText += `\nTotal seluruh barang: **${sorted.length} jenis**, senilai **Rp ${fmt(totalValue)}**. `;
      replyText += `Mau saya carikan supplier untuk komoditas di atas?`;
    } else {
      // ===== AMAN: ringkas + 3 stok teratas =====
      replyText =
        `Aman, stok Anda masih aman semua. ✅\n\n` +
        `• **${sorted.length} jenis** komoditas aktif, senilai **Rp ${fmt(totalValue)}**.\n` +
        `• Stok terbanyak: **${sorted[0]?.name || '-'}** (${fmt(sorted[0]?.stock)} ${sorted[0]?.unit || ''}).\n` +
        `• Paling mendekati batas: **${sorted[sorted.length - 1]?.name || '-'}** (sisa ${fmt(sorted[sorted.length - 1]?.stock)} ${sorted[sorted.length - 1]?.unit || ''}).\n\n` +
        `Tanya *"tampilkan semua stok saya"* untuk daftar lengkap dari terbanyak sampai terendah.`;
    }

    return {
      category: 'stock',
      text: replyText,
      cards: (wantFullList ? sorted.slice(0, 3) : (low.length ? low : sorted.slice(0, 3))).map(p => this.stockCard(p)),
      actionPills: [
        { label: '📦 Buka Manajemen Stok', link: '#/stok' },
        { label: '📋 Semua stok terurut', prompt: 'Tampilkan semua stok saya dari yang terbanyak sampai yang menipis.' },
        low.length
          ? { label: '⚠️ Filter Stok Menipis', link: '#/stok?filter=menipis' }
          : { label: '📊 Lihat performa penjualan', prompt: 'Bagaimana performa penjualan saya?' }
      ]
    };
  }

  // ==========================================
  // 11. HANDLER: DATA PENJUALAN
  // ==========================================
  replySales(parsed, user, snap) {
    const chart = snap.chart?.periods?.['7d'] || { total: 'Rp 48.500.000', growth: '+18.4%', avgDaily: 'Rp 6.928.000' };
    const trx = snap.transactions;
    const valid = trx.filter(t => t.status !== 'Dibatalkan');
    const pending = snap.pendingTrx.length;

    const byProduct = {};
    valid.forEach(t => { byProduct[t.productName] = (byProduct[t.productName] || 0) + (t.totalAmount || 0); });
    const top = Object.entries(byProduct).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topLine = top.length
      ? top.map(([name, val], i) => `${i + 1}. **${name}** — Rp ${val.toLocaleString('id-ID')}`).join('\n')
      : '1. Belum ada komoditas tercatat pada periode ini.';

    const rp = n => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
    const text =
      `Ini ringkasan penjualan Anda: 📊\n\n` +
      `• Omzet tercatat: **${rp(snap.kpis.omzet)}** dari **${valid.length} transaksi**.\n` +
      `• 7 hari terakhir: **${chart.total}** (tren **${chart.growth}** dari pekan lalu).\n` +
      `• Rata-rata per hari: **${chart.avgDaily}**.\n` +
      `• **${pending} faktur** masih menunggu pembayaran.\n\n` +
      `Penopang omzet terbesar:\n${topLine}\n\n` +
      `Biasanya permintaan grosir & restoran memuncak akhir pekan — pasokan panen enaknya dijadwalkan ke situ. Mau saya bedah per komoditas?`;

    return {
      category: 'sales',
      text,
      cards: [{
        type: 'sales_summary',
        title: 'Ringkasan Omzet 7 Hari',
        totalOmzet: chart.total,
        growth: chart.growth,
        avgDaily: chart.avgDaily,
        recordedOmzet: rp(snap.kpis.omzet),
        settledTrx: trx.filter(t => ['Selesai / Lunas', 'Dibayar / Lunas'].includes(t.status)).length,
        pendingTrx: pending
      }],
      actionPills: [
        { label: '📊 Dashboard Utama', link: '#/dashboard' },
        { label: '🧾 Transaksi & Faktur', link: '#/transaksi' },
        { label: 'Ringkasan seluruh sistem', prompt: 'Ringkas seluruh data sistem saya.' }
      ]
    };
  }

  // ==========================================
  // 12. HANDLER: PESANAN / PO
  // ==========================================
  replyOrders(parsed, user, snap) {
    let orders = snap.myOrders;
    const label = { pending: 'Menunggu', done: 'Selesai', cancelled: 'Dibatalkan', shipped: 'Dikirim' }[parsed.statusFilter];

    if (parsed.statusFilter === 'incoming') orders = orders.filter(o => o.sellerId === user?.id);
    else if (parsed.statusFilter === 'outgoing') orders = orders.filter(o => o.buyerId === user?.id);
    else if (label) orders = orders.filter(o => (o.status || '').toLowerCase().includes(label.toLowerCase()));

    if (parsed.commodity) {
      const hits = orders.filter(o => `${o.productName || ''}`.toLowerCase().includes(parsed.commodity.terms[0]));
      if (hits.length) orders = hits;
    }

    if (!orders.length) {
      const allEmpty = !snap.myOrders.length;
      return {
        category: 'orders',
        text: allEmpty
          ? `Anda belum memiliki Purchase Order (PO) tercatat. Anda bisa langsung menerbitkan PO baru dari katalog produk supplier.`
          : `Tidak ada pesanan yang cocok dengan filter Anda${label ? ` (status *${label}*)` : ''}. Total PO Anda saat ini: **${snap.myOrders.length}**.`,
        cards: [],
        actionPills: [
          { label: '📦 Semua Pesanan', link: '#/pesanan' },
          { label: '🛒 Pilih Produk di Katalog', link: '#/produk' }
        ]
      };
    }

    this.remember({ intent: 'orders', kind: 'order', items: orders, commodity: null, location: null });

    return {
      category: 'orders',
      text:
        `Ini **${orders.length} PO** terbaru di akun Anda${label ? ` (status *${label}*)` : ''}, urut dari yang paling baru:\n\n` +
        `Mau saya bukakan detail salah satu nomor PO-nya?`,
      cards: orders.slice(0, 3).map(o => this.orderCard(o, user)),
      actionPills: [
        { label: '📦 Daftar Semua Pesanan', link: '#/pesanan' },
        { label: '➕ Buat PO Baru', link: '#/pesanan-buat' },
        { label: '🧾 Cek tagihan', prompt: 'Transaksi saya yang belum dibayar.' }
      ]
    };
  }

  // ==========================================
  // 13. HANDLER: NEGOSIASI
  // ==========================================
  replyNegotiations(parsed, user, snap) {
    let negs = snap.negotiations;
    if (parsed.statusFilter === 'pending') negs = negs.filter(n => n.status === 'Menunggu Respons Penjual' || !n.status);
    if (!negs.length) {
      return {
        category: 'negotiation',
        text: snap.negotiations.length
          ? `Tidak ada negosiasi yang cocok dengan filter tersebut. Total negosiasi Anda: **${snap.negotiations.length}**.`
          : `Anda belum mengajukan negosiasi harga. Buka katalog produk lalu klik **Nego** untuk mendapatkan harga grosir.`,
        cards: [],
        actionPills: [
          { label: '🤝 Buka Negosiasi Harga', link: '#/negosiasi' },
          { label: '🛒 Lihat Katalog', link: '#/produk' }
        ]
      };
    }

    this.remember({ intent: 'negotiation', kind: 'negotiation', items: negs, commodity: null, location: null });

    const active = negs.filter(n => !['Selesai', 'Ditolak', 'Dibatalkan'].includes(n.status)).length;
    return {
      category: 'negotiation',
      text:
        `Ada **${negs.length} negosiasi** milik Anda, **${active}** masih berjalan. Yang terbaru:\n\n` +
        negs.slice(0, 3).map((n, i) =>
          `${i + 1}. **${n.productName || 'Produk'}** — tawar Rp ${Number(n.offerPrice || 0).toLocaleString('id-ID')}` +
          `${n.counterPrice ? ` (balasan penjual Rp ${Number(n.counterPrice).toLocaleString('id-ID')})` : ''} • *${n.status || 'Menunggu'}*`
        ).join('\n') +
        `\n\nKalau ada yang menggantung lebih dari 24 jam, sebaiknya ditindaklanjuti lewat chat mitra.`,
      cards: negs.slice(0, 3).map(n => this.infoCard({
        title: n.productName || 'Negosiasi',
        subtitle: `Penawaran Rp ${Number(n.offerPrice || 0).toLocaleString('id-ID')}${n.productUnit ? '/' + n.productUnit : ''}`,
        badge: { label: n.status || 'Menunggu', cls: 'badge-info' },
        rows: [
          { label: 'Nomor nego', value: n.id || '-' },
          { label: 'Mitra', value: n.sellerName || n.buyerName || '-' },
          n.counterPrice ? { label: 'Harga balasan', value: `Rp ${Number(n.counterPrice).toLocaleString('id-ID')}` } : null,
          { label: 'Volume', value: `${Number(n.quantity || 0).toLocaleString('id-ID')} ${n.productUnit || ''}` }
        ].filter(Boolean),
        actions: [
          { label: 'Buka Negosiasi', link: '#/negosiasi' },
          { label: 'Chat Mitra', link: `#/chat?partnerId=${n.sellerId === user?.id ? n.buyerId : n.sellerId}` }
        ]
      })),
      actionPills: [
        { label: '🤝 Kelola Negosiasi', link: '#/negosiasi' },
        { label: '➡️ Yang nomor berikutnya', prompt: 'Tampilkan semua negosiasi' }
      ]
    };
  }

  // ==========================================
  // 14. HANDLER: TRANSAKSI & FAKTUR
  // ==========================================
  replyTransactions(parsed, user, snap) {
    let trx = snap.transactions;
    if (parsed.statusFilter === 'pending') trx = trx.filter(t => t.status === 'Menunggu Pembayaran');
    else if (parsed.statusFilter === 'done') trx = trx.filter(t => /lunas|selesai/i.test(t.status || ''));
    else if (parsed.statusFilter === 'cancelled') trx = trx.filter(t => t.status === 'Dibatalkan');

    if (!trx.length) {
      return {
        category: 'transactions',
        text: snap.transactions.length
          ? `Tidak ada transaksi yang cocok dengan filter tersebut. Total transaksi Anda: **${snap.transactions.length}**.`
          : `Belum ada transaksi tercatat. Faktur otomatis terbentuk setelah PO diproses.`,
        cards: [],
        actionPills: [
          { label: '🧾 Transaksi & Faktur', link: '#/transaksi' },
          { label: '📦 Pesanan Saya', link: '#/pesanan' }
        ]
      };
    }

    const pendingTotal = snap.pendingTrx.reduce((s, t) => s + (t.totalAmount || 0), 0);
    this.remember({ intent: 'transactions', kind: 'transaction', items: trx, commodity: null, location: null });

    return {
      category: 'transactions',
      text:
        `Ini ${parsed.statusFilter === 'pending' ? '**tagihan yang belum dibayar**' : `**${trx.length} transaksi** terakhir`}:\n\n` +
        trx.slice(0, 3).map((t, i) =>
          `${i + 1}. **${t.invoiceNumber || t.id}** — ${t.productName || '-'} • Rp ${Number(t.totalAmount || 0).toLocaleString('id-ID')} • *${t.status}*`
        ).join('\n') +
        (snap.pendingTrx.length
          ? `\n\nTotal yang masih menggantung: **Rp ${pendingTotal.toLocaleString('id-ID')}** dari ${snap.pendingTrx.length} faktur. Mau saya pandu cara bayarnya?`
          : `\n\nSemua tagihan Anda sudah lunas — bagus! 🎉`),
      cards: trx.slice(0, 3).map(t => this.infoCard({
        title: t.invoiceNumber || t.id || 'Faktur',
        subtitle: `${t.productName || 'Transaksi'} • ${t.date || ''}`,
        badge: { label: t.status || '-', cls: this.statusBadge(t.status) },
        rows: [
          { label: 'Nomor PO', value: t.orderId || '-' },
          { label: 'Mitra', value: t.sellerId === user?.id ? (t.buyerName || '-') : (t.sellerName || '-') },
          { label: 'Nilai', value: `Rp ${Number(t.totalAmount || 0).toLocaleString('id-ID')}` },
          { label: 'Metode bayar', value: t.paymentMethod || 'Belum dipilih' }
        ],
        actions: [
          { label: 'Lihat Faktur', link: `#/transaksi-detail?id=${t.id}` },
          { label: 'Semua Transaksi', link: '#/transaksi' }
        ]
      })),
      actionPills: [
        { label: '🧾 Buka Transaksi & Faktur', link: '#/transaksi' },
        { label: '🖨️ Panduan cetak faktur', prompt: 'Bagaimana cara mencetak faktur?' }
      ]
    };
  }

  // ==========================================
  // 15. HANDLER: PRODUK SAYA / PROFIL / CHAT
  // ==========================================
  replyMyProducts(parsed, user, snap) {
    let items = snap.myProducts;
    if (parsed.commodity) {
      const hits = items.filter(p => `${p.name} ${p.category || ''}`.toLowerCase().includes(parsed.commodity.terms[0]));
      if (hits.length) items = hits;
    }

    if (!items.length) {
      return {
        category: 'product',
        text:
          `Anda belum memiliki produk terdaftar di katalog. Dengan menjadi penjual, produk Anda tampil untuk dibeli UMKM lain dan ` +
          `stoknya terpantau otomatis oleh asisten ini.`,
        cards: [],
        actionPills: [
          { label: '➕ Tambah Produk', link: '#/produk' },
          { label: '📦 Cek Manajemen Stok', link: '#/stok' }
        ]
      };
    }

    this.remember({ intent: 'my_products', kind: 'product', items, commodity: parsed.commodity, location: null });

    const lowCount = items.filter(p => Number(p.stock) < 1000).length;
    return {
      category: 'product',
      text:
        `Katalog **${snap.profile.businessName}** ada **${items.length} produk** aktif` +
        (lowCount ? `, dan **${lowCount}** di antaranya stoknya sudah menipis.` : ' — semuanya masih aman.') +
        `\n\n` +
        items.slice(0, 3).map((p, i) =>
          `${i + 1}. **${p.name}** — Rp ${Number(p.price).toLocaleString('id-ID')}/${p.unit} • stok ${Number(p.stock || 0).toLocaleString('id-ID')} ${p.unit}`
        ).join('\n'),
      cards: items.slice(0, 3).map(p => this.infoCard({
        title: p.name,
        subtitle: `${p.category || 'Komoditas'} • ${p.regency || p.location || '-'}`,
        badge: { label: Number(p.stock) < 1000 ? 'Stok Menipis' : 'Tersedia', cls: Number(p.stock) < 1000 ? 'badge-warning' : 'badge-success' },
        rows: [
          { label: 'Harga', value: `Rp ${Number(p.price).toLocaleString('id-ID')}/${p.unit}` },
          { label: 'Stok', value: `${Number(p.stock || 0).toLocaleString('id-ID')} ${p.unit}` },
          { label: 'MOQ', value: `${Number(p.minOrder || 1).toLocaleString('id-ID')} ${p.unit}` }
        ],
        actions: [
          { label: 'Kelola Produk', link: '#/produk' },
          { label: 'Kelola Stok', link: '#/stok' }
        ]
      })),
      actionPills: [
        { label: '🛒 Buka Katalog Produk', link: '#/produk' },
        { label: '⚠️ Audit stok saya', prompt: 'Produk saya yang stoknya hampir habis apa saja?' }
      ]
    };
  }

  replyProfile(parsed, user, snap) {
    const p = snap.profile;
    return {
      category: 'profile',
      text:
        `Ini data usaha Anda yang tercatat di sistem: 👤\n\n` +
        `• **Pemilik:** ${p.ownerName}\n` +
        `• **Usaha:** ${p.businessName} (${p.businessType})\n` +
        `• **Lokasi:** ${p.village}, ${p.district}, ${p.regency}\n` +
        `• **Mode aktif:** ${p.role === 'seller' ? 'Penjual / Supplier' : 'Pembeli Pasokan'}\n\n` +
        `Ada yang mau diubah? Data ini yang saya pakai untuk memberi rekomendasi.`,
      cards: [this.infoCard({
        title: p.businessName,
        subtitle: `${p.ownerName} • ${p.businessType}`,
        badge: { label: p.role === 'seller' ? 'Mode Penjual' : 'Mode Pembeli', cls: 'badge-primary' },
        rows: [
          { label: 'Lokasi', value: `${p.village}, ${p.regency}` },
          { label: 'Produk dijual', value: `${snap.myProducts.length} item` },
          { label: 'PO tercatat', value: `${snap.myOrders.length} order` },
          { label: 'Omzet', value: `Rp ${Number(snap.kpis.omzet).toLocaleString('id-ID')}` }
        ],
        actions: [{ label: 'Edit Profil', link: '#/profile-edit' }, { label: 'Dashboard', link: '#/dashboard' }]
      })],
      actionPills: [
        { label: '✏️ Edit Profil UMKM', link: '#/profile-edit' },
        { label: 'Ringkas sistem saya', prompt: 'Ringkas seluruh data sistem saya.' }
      ]
    };
  }

  replyChats(parsed, user, snap) {
    const convs = snap.conversations;
    if (!convs.length) {
      return {
        category: 'chats',
        text: 'Belum ada percakapan. Mulai chat dari kartu supplier atau produk untuk koordinasi pasokan.',
        cards: [],
        actionPills: [{ label: '💬 Buka Chat', link: '#/chat' }, { label: '🌾 Cari Supplier', link: '#/supplier' }]
      };
    }
    const unread = convs.filter(c => (c.unreadCount || 0) > 0);
    return {
      category: 'chats',
      text:
        `Anda punya **${convs.length} percakapan**${unread.length ? ` dan **${unread.length} di antaranya belum dibaca**` : ''}. Terbaru:\n\n` +
        convs.slice(0, 3).map((c, i) =>
          `${i + 1}. **${c.partner?.name || c.partner?.businessName || 'Mitra'}** — ${c.lastMessage || '(tanpa pesan)'}${c.unreadCount ? ` *(+${c.unreadCount})*` : ''}`
        ).join('\n'),
      cards: convs.slice(0, 3).map(c => this.infoCard({
        title: c.partner?.name || c.partner?.businessName || 'Mitra Bisnis',
        subtitle: c.lastMessage || 'Belum ada pesan',
        badge: { label: c.unreadCount ? `${c.unreadCount} Baru` : 'Dibaca', cls: c.unreadCount ? 'badge-primary' : 'badge-success' },
        rows: [
          { label: 'Peran', value: c.partner?.role || '-' },
          { label: 'Topik', value: c.productRef?.name || 'Umum' }
        ],
        actions: [{ label: 'Buka Percakapan', link: `#/chat?partnerId=${c.partner?.id || ''}` }]
      })),
      actionPills: [
        { label: '💬 Buka Pusat Chat', link: '#/chat' },
        { label: 'Unread saja', prompt: 'Chat saya yang belum dibaca.' }
      ]
    };
  }

  // ==========================================
  // 16. HANDLER: RINGKASAN SISTEM
  // ==========================================
  replySummary(parsed, user, snap) {
    const k = snap.kpis;
    const rp = n => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
    return {
      category: 'summary',
      text:
        `Ini kondisi sistem Anda saat ini (Anda sedang di halaman *${snap.route}*): 🧠\n\n` +
        `• **Katalog:** ${snap.products.length} produk tersedia, ${snap.myProducts.length} dijual oleh Anda.\n` +
        `• **Supplier:** ${snap.suppliers.length} mitra terverifikasi.\n` +
        `• **Pesanan:** ${snap.myOrders.length} PO, **${k.poAktif} masih aktif**.\n` +
        `• **Stok:** **${k.stokMenipis} menipis/habis** dari ${snap.stock.length} jenis.\n` +
        `• **Negosiasi:** ${k.negoAktif} penawaran berjalan.\n` +
        `• **Keuangan:** omzet ${rp(k.omzet)}, **${k.tagihanPending} faktur menunggu bayar**.\n` +
        `• **Kotak masuk:** ${k.chatBelumDibaca} chat & ${snap.unreadNotif} notifikasi belum dibaca.\n\n` +
        (k.stokMenipis || k.tagihanPending
          ? `Kalau saya boleh sarankan, urusan hari ini: **${k.stokMenipis} stok menipis** dulu, lalu tagih **${k.tagihanPending} faktur**. Mau saya buka yang mana?`
          : `Semuanya terkendali. Ada bagian yang mau dibedah lebih dalam?`),
      cards: [],
      actionPills: [
        { label: '⚠️ Stok menipis', prompt: 'Produk saya yang stoknya hampir habis apa saja?' },
        { label: '🧾 Faktur pending', prompt: 'Transaksi saya yang belum dibayar.' },
        { label: '📊 Performa penjualan', prompt: 'Bagaimana performa penjualan saya?' },
        { label: '📦 Pesanan aktif', prompt: 'Tampilkan pesanan terbaru saya.' }
      ]
    };
  }

  // ==========================================
  // 17. HANDLER: PANDUAN FITUR
  // ==========================================
  replyFeature(parsed, user, snap) {
    const q = parsed.lower;
    let guide;

    if (q.includes('negosiasi') || q.includes('nego') || q.includes('tawar')) {
      guide =
        `🤝 **Panduan Negosiasi Harga B2B:**\n` +
        `1. Buka menu **Negosiasi Harga** atau klik *Nego* pada halaman produk/chat.\n` +
        `2. Tentukan volume lalu ajukan harga di bawah harga normal.\n` +
        `3. Penjual dapat menerima, menolak, atau mengajukan *tawaran balasan*.\n` +
        `4. Setelah disepakati, klik **Konversi ke Pesanan** untuk menerbitkan PO resmi.`;
    } else if (q.includes('faktur') || q.includes('invoice') || q.includes('cetak') || q.includes('bayar')) {
      guide =
        `🧾 **Panduan Faktur & Pembayaran:**\n` +
        `1. Buka **Transaksi & Faktur** di sidebar operasional.\n` +
        `2. Pilih transaksi, klik **Faktur Digital**.\n` +
        `3. Klik **🖨️ Cetak / Simpan PDF** untuk salinan berstempel LUNAS.\n` +
        `4. Status *Menunggu Pembayaran* menandakan tagihan belum diselesaikan.`;
    } else if (q.includes('po') || q.includes('pesan') || q.includes('order') || q.includes('beli')) {
      guide =
        `📦 **Panduan Menerbitkan Purchase Order (PO):**\n` +
        `1. Klik **Buat PO Baru** di menu Pesanan B2B atau dari tombol produk.\n` +
        `2. Pilih komoditas, isi kuantitas di atas MOQ, dan alamat gudang tujuan.\n` +
        `3. PO resmi terbit dan memotong stok gudang penjual setelah diproses.\n` +
        `4. Pantau statusnya di **Pesanan B2B**.`;
    } else if (q.includes('stok') || q.includes('gudang') || q.includes('persediaan')) {
      guide =
        `📦 **Panduan Manajemen Stok:**\n` +
        `1. Buka **Manajemen Stok** untuk melihat status batas aman tiap komoditas.\n` +
        `2. Pakai filter *Stok Menipis* untuk fokus pada komoditas kritis.\n` +
        `3. Catat **Stok Masuk/Keluar** agar riwayat mutasi gudang akurat.`;
    } else if (q.includes('chat') || q.includes('pesan') || q.includes('kontak') || q.includes('whatsapp')) {
      guide =
        `💬 **Panduan Chat Terpadu:**\n` +
        `1. Buka **Pesan / Chat** atau klik *Chat* pada kartu supplier/produk.\n` +
        `2. Pakai chip balasan cepat untuk cek stok, minta sampel, atau jadwal kirim.\n` +
        `3. Percakapan tersimpan otomatis dan bisa dilanjutkan dari mana saja.`;
    } else if (q.includes('produk') || q.includes('jual') || q.includes('katalog')) {
      guide =
        `🛒 **Panduan Katalog Produk:**\n` +
        `1. Buka **Produk & Pasar** lalu klik **Tambah Produk**.\n` +
        `2. Isi komoditas, harga, MOQ, dan stok awal.\n` +
        `3. Produk langsung tampil di pencarian supplier/buyer dan terhubung ke modul stok.`;
    } else if (q.includes('supplier') || q.includes('cari mitra')) {
      guide =
        `🌾 **Panduan Cari Supplier:**\n` +
        `1. Buka **Cari Supplier** atau tanyakan langsung ke saya (mis. *"supplier beras di Cianjur"*).\n` +
        `2. Saring berdasarkan komoditas, rating, dan kabupaten.\n` +
        `3. Klik **Chat** untuk koordinasi sampel & jadwal kirim, atau **Nego** untuk harga grosir.`;
    } else if (q.includes('profil') || q.includes('akun')) {
      guide = `👤 **Profil UMKM:** buka **Profil UMKM** untuk mengubah data usaha, lokasi, dan peran (Pembeli/Penjual). Perubahan langsung dipakai dalam rekomendasi saya.`;
    } else if (q.includes('notif')) {
      guide = `🔔 **Notifikasi:** klik lonceng di navbar untuk melihat update PO, negosiasi, dan tagihan. Centang *Tandai semua dibaca* setelah ditinjau.`;
    } else {
      guide =
        `🧭 **Panduan Modul Ekosistem DesaBiz AI:**\n` +
        `• **🌾 Cari Supplier:** kelompok tani & produsen desa terverifikasi.\n` +
        `• **🛒 Produk & Pasar:** katalog komoditas pertanian, perkebunan, dan rempah.\n` +
        `• **🤝 Negosiasi Harga:** tawar-menawar B2B dua arah yang transparan.\n` +
        `• **📦 Pesanan B2B:** penerbitan kontrak Purchase Order resmi.\n` +
        `• **📊 Manajemen Stok:** monitoring stok aman, menipis, dan mutasi gudang.\n` +
        `• **🧾 Transaksi & Faktur:** faktur digital, rekonsiliasi kas, dan cetak PDF.\n` +
        `• **💬 Chat Rekan Bisnis:** pesan instan dengan mitra dagang desa.\n` +
        `• **🧠 DesaBiz AI Assistant:** halaman tempat Anda bertanya seperti sekarang.\n\n` +
        `Sebut saja nama modulnya, saya akan pandu langkah demi langkah.`;
    }

    return {
      category: 'feature',
      text: guide,
      cards: [],
      actionPills: [
        { label: '🤝 Negosiasi Harga', link: '#/negosiasi' },
        { label: '📦 Terbitkan PO', link: '#/pesanan-buat' },
        { label: '🧾 Transaksi & Faktur', link: '#/transaksi' },
        { label: '📊 Manajemen Stok', link: '#/stok' }
      ]
    };
  }

  // ==========================================
  // 18. HANDLER: IDENTITAS, LUAR CAKUPAN, SAPAAN, ID DOKUMEN, KLARIFIKASI
  // ==========================================
  /**
   * Pertanyaan di luar cakupan sistem DesaBiz (mis. diminta menulis kode/program
   * Python). Dijawab sopan: jelaskan batasan peran lalu arahkan kembali ke
   * fitur sistem yang bisa ditangani asisten.
   */
  // ==========================================
  // 16b. HANDLER: INTENT ADMIN (pengguna, produk, transaksi, kategori)
  // ==========================================
  /** Daftar & detail pengguna platform — dipahami penuh oleh Admin; untuk UMKM dijawab dengan batasan cakupan. */
  replyAdminUsers(parsed, user, snap) {
    const isAdmin = snap.profile.accountRole === 'ADMIN';

    if (!isAdmin) {
      return {
        category: 'admin_users',
        text:
          `Daftar pengguna platform hanya tersedia untuk **Administrator**. 🙏\n\n` +
          `Sebagai pelaku UMKM, Anda bisa melihat mitra yang bertransaksi dengan Anda sendiri — ` +
          `misalnya lewat menu **Pesanan B2B**, **Transaksi & Faktur**, dan **Pesan / Chat**.\n\n` +
          `Akun Anda saat ini: **${snap.profile.ownerName}** (${snap.profile.email}).`,
        cards: [],
        actionPills: [
          { label: '🧾 Pesanan saya', link: '#/pesanan' },
          { label: '👤 Profil saya', link: '#/profile' },
          { label: 'Ringkas data saya', prompt: 'Ringkas seluruh data sistem saya.' }
        ]
      };
    }

    const users = [...(snap.allUsers || [])];
    if (!users.length) {
      return {
        category: 'admin_users',
        text: 'Belum ada pengguna terdaftar di sistem.',
        cards: [],
        actionPills: [{ label: '👥 Buka Panel Admin', link: '#/admin' }]
      };
    }

    const a = snap.adminStats || {};
    const q = parsed.lower;
    // Filter: hanya non-aktif / hanya aktif / hanya UMKM / hanya admin / pencarian teks
    let list = users;
    if (['non aktif', 'non-aktif', 'tidak aktif'].some(t => q.includes(t))) list = users.filter(u => u.isActive === false);
    else if (q.includes('aktif') && !q.includes('non')) list = users.filter(u => u.isActive !== false);
    if (q.includes('umkm') && !q.includes('admin')) list = list.filter(u => u.accountRole !== 'ADMIN');
    if (q.includes('admin') && !q.includes('umkm')) list = list.filter(u => u.accountRole === 'ADMIN');
    const search = (parsed.words || []).find(w => w.length > 2 && !['siapa', 'tampilkan', 'pengguna', 'user', 'akun', 'daftar'].includes(w));
    if (search && !['umkm', 'admin', 'aktif'].includes(search)) {
      const hits = list.filter(u => `${u.ownerName} ${u.businessName} ${u.email}`.toLowerCase().includes(search));
      if (hits.length) list = hits;
    }

    const fmtUser = (u, i) =>
      `${i + 1}. **${u.ownerName || '-'}** — ${u.businessName || '-'} (${u.businessType || '-'})\n` +
      `   • Email: ${u.email || '-'} • Telepon: ${u.phone || '-'}\n` +
      `   • Peran: ${u.accountRole === 'ADMIN' ? 'Administrator' : 'UMKM'}${u.role ? ` / mode ${u.role === 'seller' ? 'Penjual' : 'Pembeli'}` : ''} • Status: ${u.isActive === false ? '❌ Non-aktif' : '✅ Aktif'}\n` +
      `   • Lokasi: ${[u.village, u.district, u.regency].filter(Boolean).join(', ') || '-'} • Bergabung: ${u.joinedAt || '-'}\n` +
      `   • Verifikasi: ${u.isVerified === false ? 'Belum' : 'Terverifikasi'}`;

    let text =
      `👥 **Daftar pengguna sistem — total ${users.length} akun** ` +
      `(${a.totalUmkM ?? users.filter(u => u.accountRole !== 'ADMIN').length} UMKM, ` +
      `${a.totalAdmin ?? users.filter(u => u.accountRole === 'ADMIN').length} admin, ` +
      `${a.penggunaNonAktif ?? users.filter(u => u.isActive === false).length} non-aktif).\n\n`;

    if (q.includes('jumlah') || q.includes('berapa') || q.includes('total')) {
      text += `**Ringkasan jumlah:**\n`;
      text += `• Total akun: **${users.length}**\n`;
      text += `• UMKM: **${users.filter(u => u.accountRole !== 'ADMIN').length}** • Admin: **${users.filter(u => u.accountRole === 'ADMIN').length}**\n`;
      text += `• Aktif: **${users.filter(u => u.isActive !== false).length}** • Non-aktif: **${users.filter(u => u.isActive === false).length}**\n\n`;
    }

    text += `**${list.length === users.length ? 'Seluruh pengguna' : `${list.length} pengguna cocok dengan filter Anda`}:**\n\n`;
    text += list.map(fmtUser).join('\n');
    if (!list.length) text += `Tidak ada pengguna yang cocok dengan filter tersebut.`;

    text += `\n\n> Perubahan status akun dilakukan lewat **Panel Admin**.`;

    this.remember({ intent: 'admin_users', kind: 'users', items: list, commodity: null, location: null });

    return {
      category: 'admin_users',
      text,
      cards: list.slice(0, 3).map(u => this.infoCard({
        title: u.ownerName || '-',
        subtitle: `${u.businessName || '-'} • ${u.accountRole === 'ADMIN' ? 'Administrator' : 'UMKM'}`,
        badge: { label: u.isActive === false ? 'Non-aktif' : 'Aktif', cls: u.isActive === false ? 'badge-danger' : 'badge-success' },
        rows: [
          { label: 'Email', value: u.email || '-' },
          { label: 'Telepon', value: u.phone || '-' },
          { label: 'Lokasi', value: [u.village, u.regency].filter(Boolean).join(', ') || '-' },
          { label: 'Bergabung', value: u.joinedAt || '-' }
        ],
        actions: [{ label: 'Panel Admin', link: '#/admin' }]
      })),
      actionPills: [
        { label: '👥 Panel Admin', link: '#/admin' },
        { label: '⚠️ Pengguna non-aktif', prompt: 'Tampilkan pengguna non aktif.' },
        { label: '📊 Ringkasan platform', prompt: 'Tampilkan ringkasan transaksi platform.' }
      ]
    };
  }

  /** Monitoring produk platform (Admin) / katalog sendiri (UMKM). */
  replyAdminProducts(parsed, user, snap) {
    const isAdmin = snap.profile.accountRole === 'ADMIN';
    const products = isAdmin ? (snap.products || []) : (snap.myProducts || []);

    if (!products.length) {
      return { category: 'admin_products', text: 'Belum ada produk tercatat di sistem.', cards: [], actionPills: [{ label: '📦 Produk', link: '#/produk' }] };
    }

    const q = parsed.lower;
    let list = products;
    const needReview = ['perlu ditinjau', 'bermasalah', 'ditinjau', 'review'].some(t => q.includes(t));
    if (needReview) {
      const bad = products.filter(p => !p.sellerVerified || !p.imageUrl || (p.stock || 0) <= 0 || !p.description);
      list = bad.length ? bad : products.filter(p => (p.stock || 0) <= 0);
    }

    const byCat = {};
    products.forEach(p => { byCat[p.category || 'Lainnya'] = (byCat[p.category || 'Lainnya'] || 0) + 1; });
    const lowP = products.filter(p => (p.stock || 0) < 1000);

    let text = isAdmin
      ? `📦 **Monitoring produk platform — ${products.length} produk terdaftar.**\n\n`
      : `📦 **Produk milik Anda — ${products.length} produk.**\n\n`;
    text += `**Sebaran kategori:** ${Object.entries(byCat).map(([k, v]) => `${k} (${v})`).join(', ')}.\n`;
    text += `**Stok menipis (<1.000):** ${lowP.length ? lowP.map(p => `${p.name} (${Number(p.stock || 0).toLocaleString('id-ID')} ${p.unit || ''})`).join(', ') : 'tidak ada'}.\n\n`;
    text += `**${needReview ? 'Produk perlu ditinjau' : 'Daftar produk'}:**\n`;
    list.slice(0, 12).forEach((p, i) => {
      text += `${i + 1}. **${p.name}** — Rp ${Number(p.price || 0).toLocaleString('id-ID')}/${p.unit || 'unit'} • stok ${Number(p.stock || 0).toLocaleString('id-ID')} • ${p.sellerName || '-'}${p.sellerVerified === false ? ' ⚠️ belum verifikasi' : ''}\n`;
    });
    if (list.length > 12) text += `\n… dan ${list.length - 12} produk lainnya.`;

    this.remember({ intent: 'admin_products', kind: 'products', items: list, commodity: null, location: null });

    return {
      category: 'admin_products',
      text,
      cards: list.slice(0, 3).map(p => this.productCard(p)),
      actionPills: [
        { label: '📦 Buka Produk', link: '#/produk' },
        { label: '🌾 Cari supplier', prompt: 'Saya membutuhkan supplier beras.' },
        ...(isAdmin ? [{ label: '👥 Pengguna platform', prompt: 'Tampilkan daftar semua pengguna yang ada di sistem.' }] : [])
      ]
    };
  }

  /** Ringkasan transaksi platform (Admin) / transaksi sendiri (UMKM). */
  replyAdminTransactions(parsed, user, snap) {
    const isAdmin = snap.profile.accountRole === 'ADMIN';
    const trx = isAdmin
      ? (snap.platformTransactions || snap.transactions || [])
      : (snap.transactions || []);
    const a = snap.adminStats || {};
    const rp = n => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
    const q = parsed.lower;

    let list = trx;
    if (q.includes('tertunda') || q.includes('menunggu')) list = trx.filter(t => t.status === 'Menunggu Pembayaran');
    else if (q.includes('lunas') || q.includes('selesai')) list = trx.filter(t => ['Lunas', 'Selesai'].includes(t.status));
    else if (q.includes('bermasalah') || q.includes('batal')) list = trx.filter(t => t.status === 'Dibatalkan');

    const totalAll = trx.reduce((s, t) => s + (t.totalAmount || 0), 0);
    const pending = trx.filter(t => t.status === 'Menunggu Pembayaran');

    let text = isAdmin
      ? `📊 **Ringkasan transaksi platform**\n\n`
      : `📊 **Transaksi milik Anda**\n\n`;
    text += `• Total transaksi: **${trx.length}** senilai **${rp(totalAll)}**\n`;
    text += `• Menunggu pembayaran: **${pending.length}** (${rp(pending.reduce((s, t) => s + (t.totalAmount || 0), 0))})\n`;
    if (isAdmin) text += `• Nilai seluruh platform: **${rp(a.totalTransaksiNominal)}** (${a.totalTransaksi ?? trx.length} tercatat)\n`;
    text += `\n**${list.length === trx.length ? 'Seluruh transaksi' : `${list.length} transaksi cocok`}:**\n`;
    list.slice(0, 10).forEach((t, i) => {
      text += `${i + 1}. **${t.id}** — ${t.buyerName || '-'} → ${t.sellerName || '-'} • ${rp(t.totalAmount)} • ${t.status}\n`;
    });
    if (!list.length) text += `Tidak ada transaksi yang cocok dengan filter tersebut.`;
    if (list.length > 10) text += `\n… dan ${list.length - 10} transaksi lainnya.`;

    this.remember({ intent: 'admin_transactions', kind: 'transactions', items: list, commodity: null, location: null });

    return {
      category: 'admin_transactions',
      text,
      cards: list.slice(0, 3).map(t => this.infoCard({
        title: t.id || '-',
        subtitle: `${t.buyerName || '-'} → ${t.sellerName || '-'}`,
        badge: { label: t.status || '-', cls: t.status === 'Menunggu Pembayaran' ? 'badge-warning' : 'badge-success' },
        rows: [
          { label: 'Produk', value: t.productName || '-' },
          { label: 'Nilai', value: rp(t.totalAmount) },
          { label: 'Tanggal', value: t.date || t.createdAt || '-' }
        ],
        actions: [{ label: 'Transaksi', link: '#/transaksi' }]
      })),
      actionPills: [
        { label: '💳 Buka Transaksi', link: '#/transaksi' },
        { label: '⏳ Yang menunggu bayar', prompt: 'Tampilkan transaksi yang menunggu pembayaran.' },
        ...(isAdmin ? [{ label: '📈 Laporan sistem', prompt: 'Tampilkan ringkasan transaksi platform.' }] : [])
      ]
    };
  }

  /** Kategori produk platform (Admin) / panduan (UMKM). */
  replyAdminCategories(parsed, user, snap) {
    const isAdmin = snap.profile.accountRole === 'ADMIN';
    const cats = snap.categories || [];
    const products = snap.products || [];
    const countIn = c => products.filter(p => p.category === c).length;

    if (!isAdmin) {
      return {
        category: 'admin_categories',
        text:
          `Pengelolaan kategori produk hanya tersedia untuk **Administrator**. 🙏\n\n` +
          `Untuk produk Anda sendiri, kategori dipilih saat menambahkan produk di menu **Produk & Pasar** ` +
          `(mis. *Pertanian & Beras*, *Perkebunan & Kopi*).`,
        cards: [],
        actionPills: [
          { label: '🌾 Buka Produk & Pasar', link: '#/produk' },
          { label: '➕ Tambah produk', prompt: 'Bagaimana cara menambah produk?' }
        ]
      };
    }

    let text = `🏷️ **Kategori produk platform — ${cats.length} kategori.**\n\n`;
    cats.forEach((c, i) => {
      text += `${i + 1}. **${c}** — ${countIn(c)} produk\n`;
    });
    text += `\n> Kelola (tambah/edit/hapus) lewat **Panel Admin → Kategori**.`;

    return {
      category: 'admin_categories',
      text,
      cards: [this.infoCard({
        title: 'Kategori Produk',
        subtitle: `${cats.length} kategori • ${products.length} produk`,
        badge: { label: 'Admin', cls: 'badge-info' },
        rows: cats.slice(0, 6).map(c => ({ label: c, value: `${countIn(c)} produk` })),
        actions: [{ label: 'Panel Admin', link: '#/admin' }]
      })],
      actionPills: [
        { label: '👥 Buka Panel Admin', link: '#/admin' },
        { label: '📦 Monitoring produk', prompt: 'Tampilkan monitoring produk platform.' }
      ]
    };
  }

  replyOutOfScope(user, snap, parsed) {
    const lower = parsed && parsed.lower ? parsed.lower : '';
    const isCodeAsk = CODE_RE.test(lower);

    const scopeList =
      `• 🔎 **Cari supplier & produk** — komoditas, lokasi, harga, dan rating mitra.\n` +
      `• 📊 **Data usaha Anda** — penjualan, omzet, stok, PO, faktur, negosiasi, chat.\n` +
      `• 🧭 **Panduan fitur** — cara pakai menu PO, negosiasi, faktur, manajemen stok.\n` +
      `• 🧠 **Ringkasan sistem** — kondisi akun *${snap.profile.businessName}* saat ini.`;

    const text = isCodeAsk
      ? `Maaf, untuk yang satu ini saya tidak bisa membantu. 🙏\n\n` +
        `Saya adalah asisten AI **khusus sistem DesaBiz AI**, jadi jawaban saya hanya seputar ` +
        `isi dan operasional aplikasi ini saja — termasuk **saya tidak membuatkan kode/program** ` +
        `(Python atau bahasa apa pun) karena hal itu di luar cakupan saya.\n\n` +
        `Yang bisa saya bantu justru ini:\n${scopeList}\n\n` +
        `Silakan tanyakan salah satu di atas, misalnya *"Ringkas seluruh data sistem saya."*`
      : `Maaf, topik itu di luar cakupan saya. Saya hanya menjawab seputar sistem DesaBiz AI.\n\n` +
        `Berikut yang bisa saya tangani:\n${scopeList}`;

    return {
      category: 'general',
      text,
      cards: [],
      actionPills: [
        { label: '🧠 Ringkas data sistem', prompt: 'Ringkas seluruh data sistem saya.' },
        { label: '🌾 Cari supplier', prompt: 'Saya membutuhkan supplier beras.' },
        { label: '📖 Panduan fitur aplikasi', prompt: 'Fitur apa saja yang ada di aplikasi ini?' }
      ]
    };
  }

  /** Handler intent "whoami": identitas pengguna + seluruh bagiannya di web. */
  replyWhoAmI(parsed, user, snap) {
    const p = snap.profile;
    const k = snap.kpis;
    const isAdmin = p.accountRole === 'ADMIN';
    const roleLabel = p.role === 'seller' ? 'Penjual / Supplier' : 'Pembeli Pasokan';

    // ===== 1. Identitas lengkap =====
    let text = `👤 **${p.ownerName}** — Anda adalah pemilik usaha **"${p.businessName}"** (${p.businessType}).\n\n`;
    text += `**Identitas akun Anda di DesaBiz AI:**\n`;
    text += `• Nama pemilik: ${p.ownerName}\n`;
    text += `• Usaha: ${p.businessName} (${p.businessType})\n`;
    text += `• Email: ${p.email}\n`;
    text += `• WhatsApp/telepon: ${p.phone}\n`;
    text += `• Lokasi: ${p.village}, ${p.district}, ${p.regency}\n`;
    text += `• Keanggotaan: ${p.membership} (sejak ${p.memberSince})\n`;
    text += `• Verifikasi: ${p.isVerified ? 'Terverifikasi' : 'Belum terverifikasi'}${p.verificationBadge && p.verificationBadge !== '-' ? ` (${p.verificationBadge})` : ''}\n\n`;

    // ===== 2. Peran & aturan (rules) =====
    if (isAdmin) {
      text += `**Peran & hak akses Anda (ADMIN):**\n`;
      text += `• Anda adalah **Administrator platform** — bukan sekadar pelaku UMKM.\n`;
      text += `• Hak akses: **seluruh data platform** (semua pengguna, katalog, pesanan, transaksi, log aktivitas).\n`;
      text += `• Tindakan ubah/hapus data hanya via **Panel Admin**, bukan lewat chat ini.\n\n`;
    } else {
      text += `**Peran & aturan Anda (UMKM):**\n`;
      text += `• Mode aktif saat ini: **${roleLabel}**.\n`;
      text += `• Sebagai **Pembeli**: cari supplier, terbitkan PO, negosiasi harga, belanja komoditas.\n`;
      text += `• Sebagai **Penjual**: kelola katalog & stok, terima pesanan, proses pengiriman.\n`;
      text += `• Satu akun punya **dua peran** — bisa beralih kapan saja dari halaman Profil.\n`;
      text += `• Batasan: hanya melihat & mengelola **data usaha Anda sendiri**.\n\n`;
    }

    // ===== 3. Seluruh bagiannya di web =====
    if (isAdmin) {
      const a = snap.adminStats || {};
      text += `**Bagian Anda di web ini (seluruh platform):**\n`;
      text += `• ${a.totalPengguna ?? '-'} pengguna (${a.totalUmkM ?? '-'} UMKM, ${a.totalAdmin ?? '-'} admin, ${a.penggunaNonAktif ?? 0} non-aktif)\n`;
      text += `• ${a.totalProduk ?? '-'} produk, ${a.totalPesanan ?? '-'} pesanan, ${a.totalTransaksi ?? '-'} transaksi\n`;
      text += `• Nilai transaksi tercatat: Rp ${Number(a.totalTransaksiNominal || 0).toLocaleString('id-ID')}\n`;
      text += `• ${a.transaksiTertunda ?? 0} transaksi menunggu pembayaran\n`;
      text += `• ${snap.unreadNotif} notifikasi belum dibaca\n`;
    } else {
      text += `**Bagian Anda di web ini:**\n`;
      text += `• Produk dijual: ${snap.myProducts.length} item\n`;
      text += `• Pesanan (PO): ${snap.myOrders.length} (${k.poAktif} aktif)\n`;
      if (snap.myOrders.length) {
        text += `• Terbaru: ${snap.myOrders.slice(0, 3).map(o => `${o.id} (${o.productName}, ${o.status})`).join('; ')}\n`;
      }
      text += `• Transaksi: ${snap.transactions.length} (${k.tagihanPending} menunggu pembayaran)\n`;
      text += `• Omzet tercatat: Rp ${Number(k.omzet || 0).toLocaleString('id-ID')}\n`;
      text += `• Negosiasi: ${k.negoAktif} aktif\n`;
      text += `• Chat belum dibaca: ${snap.unreadChat}; notifikasi: ${snap.unreadNotif}\n`;
      if (k.stokMenipis > 0) text += `• ⚠️ Stok menipis: ${k.stokMenipis} produk\n`;
    }

    // ===== 4. Seluruh bagian web & peran Anda di masing-masing bagian =====
    // Peta lengkap menu/sidebar — asisten WAJIB hafal semua bagian web.
    const webParts = isAdmin
      ? [
          ['Dashboard', 'ringkasan seluruh platform: pengguna, produk, pesanan, transaksi.'],
          ['DesaBiz AI', 'chat dengan Anda (Admin Assistant) untuk menanyakan data sistem.'],
          ['Cari Supplier & Produk & Pasar', 'memantau katalog dan kualitas produk yang terdaftar.'],
          ['Negosiasi Harga & Pesanan B2B', 'memantau seluruh negosiasi dan PO antar pengguna.'],
          ['Manajemen Stok & Transaksi & Faktur', 'memantau stok mitra, transaksi, dan penerimaan pembayaran.'],
          ['Pesan / Chat', 'memantau komunikasi antar pengguna bila perlu penyelesaian sengketa.'],
          ['Panel Admin', 'satu-satunya bagian khusus Anda: kelola pengguna, produk, transaksi, kategori.'],
          ['Profil UMKM', 'data akun admin dan pengaturan nomor WhatsApp notifikasi Anda.']
        ]
      : [
          ['📊 Dashboard', 'ringkasan usaha Anda: KPI, rekomendasi, akses cepat ke semua menu.'],
          ['🧠 DesaBiz AI', 'chat dengan saya — tanya data usaha, cari supplier, panduan fitur.'],
          ['🌾 Cari Supplier', 'sebagai Pembeli: cari & bandingkan supplier; sebagai Penjual: pantau kondisi pasar.'],
          ['🌾 Produk & Pasar', 'Pembeli: telusuri katalog & belanja grosir; Penjual: tambah/ubah produk dan harga jual.'],
          ['🤝 Negosiasi Harga', 'Pembeli: ajukan tawaran harga; Penjual: terima, tolak, atau musyawarah tawaran.'],
          ['🧾 Pesanan B2B', 'Pembeli: terbitkan PO & lacak status; Penjual: terima dan proses pesanan masuk.'],
          ['📦 Manajemen Stok', 'Penjual: atur stok & batas aman; Pembeli: cek ketersediaan sebelum pesan.'],
          ['💳 Transaksi & Faktur', 'keduanya: lihat transaksi milik sendiri, status bayar, dan cetak faktur.'],
          ['💬 Pesan / Chat', 'kirim pesan ke lawan transaksi untuk koordinasi pengiriman atau negosiasi.'],
          ['👤 Profil UMKM', 'ubah data usaha, ganti peran, dan atur nomor WhatsApp notifikasi (Simpan & Uji Kirim).'],
          ['🚪 Keluar Sesi', 'akhiri sesi login di perangkat ini.']
        ];

    text += `**Seluruh bagian web ini & peran Anda di masing-masing bagian:**\n`;
    webParts.forEach(([name, desc]) => {
      text += `• **${name}** — ${desc}\n`;
    });
    text += `\n>Batasan yang berlaku di SEMUA bagian di atas: Anda hanya melihat dan mengelola ` +
      `**data usaha Anda sendiri**${isAdmin ? ' — kecuali Panel Admin yang mencakup seluruh platform.' : '.'}\n`;

    return {
      category: 'whoami',
      text,
      cards: [this.infoCard({
        title: `${p.ownerName} — ${p.businessName}`,
        subtitle: `${p.businessType} • ${p.accountRole}`,
        badge: { label: isAdmin ? 'Admin Platform' : roleLabel, cls: isAdmin ? 'badge-info' : 'badge-primary' },
        rows: [
          { label: 'Email', value: p.email },
          { label: 'WhatsApp', value: p.phone },
          { label: 'Lokasi', value: `${p.village}, ${p.regency}` },
          { label: 'Produk / PO', value: `${snap.myProducts.length} produk • ${snap.myOrders.length} PO` },
          { label: 'Omzet', value: `Rp ${Number(k.omzet || 0).toLocaleString('id-ID')}` }
        ],
        actions: [{ label: 'Edit Profil', link: '#/profile-edit' }, { label: 'Dashboard', link: '#/dashboard' }]
      })],
      actionPills: [
        { label: 'Ringkas data saya', prompt: 'Ringkas seluruh data sistem saya.' },
        { label: 'Edit Profil', link: '#/profile-edit' },
        ...(isAdmin
          ? [{ label: 'Pengguna platform', prompt: 'Tampilkan daftar pengguna platform.' }]
          : [{ label: 'Cari supplier', prompt: 'Saya membutuhkan supplier beras.' }])
      ]
    };
  }

  replyIdentity(user, snap) {
    const engineName = this.lastEngine === 'api'
      ? 'AI Cloud Engine (OpenAI/Gemini via server DesaBiz)'
      : 'Local Intelligence Engine (berjalan di aplikasi ini)';
    const k = snap.kpis;

    return {
      category: 'info',
      text:
        `Saya **DesaBiz AI Assistant** — asisten AI yang **tertanam langsung di dalam sistem DesaBiz AI**, ` +
        `platform B2B untuk UMKM pedesaan Indonesia. Saya bukan chatbot umum di luar sana: saya memantau aplikasi Anda secara langsung. 🤖\n\n` +
        `**Apa peran saya di aplikasi ini?**\n` +
        `• **Memahami sistem** — saya membaca data riil akun Anda (katalog, PO, stok, transaksi, negosiasi, chat) ` +
        `sehingga jawaban saya sesuai kondisi nyata, bukan tebakan.\n` +
        `• **Mencari mitra** — cari supplier & produk komoditas sesuai jenis usaha dan lokasi Anda.\n` +
        `• **Menganalisis usaha** — rekap omzet, tren penjualan, stok menipis, dan tagihan yang belum tertagih.\n` +
        `• **Memandu fitur** — langkah pemakaian menu PO, negosiasi harga, faktur, manajemen stok, sampai cetak laporan.\n\n` +
        `**Bagaimana saya bekerja?**\n` +
        `• Mode saat ini: **${engineName}**. Bila admin DesaBiz menghubungkan penyedia AI resmi, ` +
        `**API key tetap tersimpan di server** — tidak pernah dikirim ke halaman web ini.\n` +
        `• Riwayat percakapan singkat disimpan **hanya di perangkat Anda** agar saya bisa melanjutkan obrolan ` +
        `(mis. *"yang pertama"*, *"yang termurah"*).\n` +
        `• Saya menyimpan data sesuai kebutuhan saja dan tidak membagikannya ke pihak ketiga di luar penyedia AI yang dipakai.\n\n` +
        `**Batasan saya:**\n` +
        `• Saya **tidak** menyetujui pembayaran, mengirim pesan, atau mengubah data atas nama Anda.\n` +
        `• Saya **tidak pernah** meminta API key maupun kata sandi akun Anda.\n\n` +
        `Saat ini saya memantau **${snap.products.length} produk**, **${snap.suppliers.length} supplier**, ` +
        `**${snap.myOrders.length} PO**, dan **${k.stokMenipis} stok menipis** di akun *${snap.profile.businessName}*.\n\n` +
        `Mau mulai dari mana? Coba tanya *"Ringkas seluruh data sistem saya"* atau *"Cari supplier beras."*`,
      cards: [
        {
          type: 'info',
          title: 'DesaBiz AI Assistant',
          subtitle: 'Asisten AI terintegrasi sistem DesaBiz AI',
          badge: { label: this.lastEngine === 'api' ? 'AI Cloud' : 'Local Engine', cls: 'badge-info' },
          rows: [
            { label: 'Mode engine', value: engineName },
            { label: 'Data yang dibaca', value: 'Snapshot sistem akun Anda (riil, bukan tebakan)' },
            { label: 'Privasi', value: 'API key di server, riwayat chat di perangkat Anda' },
            { label: 'Cara pakai', value: 'Tulis pertanyaan biasa, bahasa Indonesia sehari-hari' }
          ],
          actions: [
            { label: '🧠 Ringkas sistem', link: '#/dashboard' },
            { label: '🌾 Cari supplier', link: '#/supplier' },
            { label: '📦 Katalog produk', link: '#/produk' }
          ]
        }
      ],
      actionPills: [
        { label: '🧠 Tanya data sistem', prompt: 'Ringkas seluruh data sistem saya.' },
        { label: '📖 Fitur apa saja?', prompt: 'Fitur apa saja yang ada di aplikasi ini?' },
        { label: '🌾 Cari supplier beras', prompt: 'Saya membutuhkan supplier beras.' }
      ]
    };
  }

  replyGreeting(user, snap) {
    const hour = new Date().getHours();
    const waktu = hour < 11 ? 'pagi' : hour < 15 ? 'siang' : hour < 18 ? 'sore' : 'malam';
    return {
      category: 'general',
      text:
        `Halo Pak **${user?.ownerName || 'Budi'}**! 👋 Selamat ${waktu} — senang bisa membantu *${snap.profile.businessName}* hari ini.\n\n` +
        `Saya memantau sistem Anda: **${snap.myOrders.length} PO**, **${snap.kpis.stokMenipis} stok menipis**, ` +
        `**${snap.kpis.tagihanPending} faktur pending**, dan **${snap.unreadChat} chat belum dibaca**.\n\n` +
        `Silakan sampaikan kebutuhan Anda — cari supplier, rekomendasi produk, audit stok, baca penjualan, sampai panduan fitur.`,
      cards: [],
      actionPills: [
        { label: '⚠️ Cek stok menipis', prompt: 'Produk saya yang stoknya hampir habis apa saja?' },
        { label: '📊 Lihat data penjualan', prompt: 'Bagaimana performa penjualan saya?' },
        { label: '🧠 Ringkas sistem saya', prompt: 'Ringkas seluruh data sistem saya.' }
      ]
    };
  }

  replyById(id, user, snap) {
    const norm = id.replace(/\s/g, '').toUpperCase();
    const order = snap.myOrders.find(o => (o.id || '').toUpperCase().replace(/\s/g, '').includes(norm));
    if (order) {
      this.remember({ intent: 'orders', kind: 'order', items: [order], commodity: null, location: null });
      return {
        category: 'orders',
        text:
          `📦 **Detail PO ${order.id}:**\n\n` +
          `• **Produk:** ${order.productName}\n• **Kuantitas:** ${Number(order.quantity || 0).toLocaleString('id-ID')} ${order.productUnit || ''}\n` +
          `• **Nilai:** Rp ${Number(order.totalAmount || 0).toLocaleString('id-ID')}\n` +
          `• **Status:** *${order.status}*\n` +
          `• **Mitra:** ${order.sellerId === user?.id ? order.buyerName : order.sellerName}\n` +
          `• **Tanggal:** ${order.date || order.createdAt || '-'}`,
        cards: [this.orderCard(order, user)],
        actionPills: [
          { label: '🔎 Buka detail PO', link: `#/pesanan-detail?id=${order.id}` },
          { label: '📦 Semua pesanan', link: '#/pesanan' }
        ]
      };
    }

    const trx = snap.transactions.find(t => [t.id, t.invoiceNumber, t.orderId].some(v => (v || '').toUpperCase().includes(norm)));
    if (trx) {
      return {
        category: 'transactions',
        text:
          `🧾 **Detail faktur ${trx.invoiceNumber || trx.id}:**\n\n` +
          `• **PO terkait:** ${trx.orderId}\n• **Produk:** ${trx.productName}\n` +
          `• **Nilai:** Rp ${Number(trx.totalAmount || 0).toLocaleString('id-ID')}\n` +
          `• **Status:** *${trx.status}*\n• **Metode bayar:** ${trx.paymentMethod || '-'}`,
        cards: [],
        actionPills: [
          { label: '🖨️ Lihat faktur', link: `#/transaksi-detail?id=${trx.id}` },
          { label: '🧾 Semua transaksi', link: '#/transaksi' }
        ]
      };
    }

    const neg = snap.negotiations.find(n => (n.id || '').toUpperCase().includes(norm));
    if (neg) {
      return {
        category: 'negotiation',
        text:
          `🤝 **Negosiasi ${neg.id}:** ${neg.productName} — tawar Rp ${Number(neg.offerPrice || 0).toLocaleString('id-ID')}` +
          `${neg.counterPrice ? `, balasan penjual Rp ${Number(neg.counterPrice).toLocaleString('id-ID')}` : ''}. Status: *${neg.status}*.`,
        cards: [],
        actionPills: [{ label: '🤝 Buka Negosiasi', link: '#/negosiasi' }]
      };
    }

    return {
      category: 'general',
      text: `Saya tidak menemukan dokumen dengan kode **${id}** pada akun Anda. Pastikan kodenya lengkap (format: *ORD-2026-001*, *INV-...*, atau *TRX-...*).`,
      cards: [],
      actionPills: [
        { label: '📦 Pesanan', link: '#/pesanan' },
        { label: '🧾 Transaksi', link: '#/transaksi' }
      ]
    };
  }

  /** Lanjutan percakapan: ordinal, termurah, ganti wilayah, minta semua. */
  replyReference(parsed, mem, user, snap) {
    let items = [...mem.items];
    const kind = mem.kind;
    const moneyish = ['product', 'negotiation', 'transaction'].includes(kind);
    let note = '';

    if (parsed.location && mem.kind === 'supplier') {
      const needle = parsed.location.label.toLowerCase().replace(/^kabupaten\s+|^kota\s+/, '');
      const hits = items.filter(s => `${s.regency || ''} ${s.location || ''}`.toLowerCase().includes(needle));
      if (hits.length) { items = hits; note = `hasil disaring ke wilayah **${parsed.location.label}**`; }
    } else if (parsed.commodity && mem.kind === 'product') {
      const hits = items.filter(p => `${p.name} ${p.category || ''}`.toLowerCase().includes(parsed.commodity.terms[0]));
      if (hits.length) { items = hits; note = `dipersempit ke **${parsed.commodity.label}**`; }
    }

    if (parsed.wantsCheapest && moneyish) {
      items.sort((a, b) => Number(a.price || a.offerPrice || a.totalAmount || 0) - Number(b.price || b.offerPrice || b.totalAmount || 0));
      note = 'diurutkan dari **paling murah**';
    } else if (parsed.wantsCostliest && moneyish) {
      items.sort((a, b) => Number(b.price || b.offerPrice || b.totalAmount || 0) - Number(a.price || a.offerPrice || a.totalAmount || 0));
      note = 'diurutkan dari **paling mahal**';
    }

    if (!items.length) {
      return this.replyClarify(user, snap, parsed, mem);
    }

    if (parsed.ordinal > 0) {
      const chosen = items[parsed.ordinal - 1];
      if (!chosen) {
        return {
          category: mem.intent || 'general',
          text: `Daftar sebelumnya hanya berisi **${items.length} item**, jadi tidak ada nomor ${parsed.ordinal}.`,
          cards: [],
          actionPills: [{ label: '➡️ Tampilkan semua', prompt: `Tampilkan semua ${kind}` }]
        };
      }
      return {
        category: mem.intent || 'general',
        text: `Berikut rincian **#${parsed.ordinal}** dari daftar sebelumnya${note ? ` (${note})` : ''}:`,
        cards: [this.cardFor(kind, chosen, user)],
        actionPills: this.pillsFor(kind, items, user)
      };
    }

    const slice = parsed.wantsAll ? items : items.slice(0, 3);
    return {
      category: mem.intent || 'general',
      text:
        `Berikut kelanjutan daftar ${this.kindLabel(kind)} Anda${note ? `, ${note}` : ''} — total **${items.length} item**:`,
      cards: slice.slice(0, 3).map(i => this.cardFor(kind, i, user)),
      actionPills: this.pillsFor(kind, items, user)
    };
  }

  /** Tidak ada intent yang cocok: cari di data dulu, baru klarifikasi. */
  replyFallback(parsed, user, snap, opts = {}) {
    const stop = new Set(['yang', 'untuk', 'dengan', 'tolong', 'mohon', 'berapa', 'silakan', 'bisa', 'saya', 'ada', 'ini', 'itu']);
    const tokens = parsed.words.filter(w => w.length > 3 && !stop.has(w));

    if (tokens.length) {
      const hitProduct = snap.products.find(p => tokens.some(t => `${p.name} ${p.category || ''}`.toLowerCase().includes(t)));
      if (hitProduct) {
        const sub = { ...parsed, words: tokens, commodity: parsed.commodity || this.detectCommodity(tokens.join(' ')) };
        return this.replyProductSearch(sub, user, snap);
      }
      const hitSupplier = snap.suppliers.find(s =>
        tokens.some(t => `${s.businessName || ''} ${(s.categories || []).join(' ') || ''}`.toLowerCase().includes(t))
      );
      if (hitSupplier) return this.replySupplier(parsed, user, snap);
      const hitOrder = snap.myOrders.find(o => tokens.some(t => (o.productName || '').toLowerCase().includes(t)));
      if (hitOrder) return this.replyOrders({ ...parsed, commodity: null }, user, snap);
    }

    return this.replyClarify(user, snap, parsed);
  }

  /** Pertanyaan yang belum bisa dipahami -> ajukan pilihan konkret. */
  replyClarify(user, snap, parsed, mem = null) {
    const top = (mem?.items?.length ? `Daftar ${this.kindLabel(mem.kind)} terakhir saya sudah siap — ` : '');
    return {
      category: 'general',
      text:
        `Maaf, saya belum yakin maksud Anda. ${top}bisa tolong diperjelas dengan salah satu gaya berikut?\n\n` +
        `• *"Cari supplier beras di Cianjur"* → pencarian mitra\n` +
        `• *"Produk apa yang cocok untuk usaha saya?"* → rekomendasi komoditas\n` +
        `• *"Stok saya yang hampir habis"* → audit gudang\n` +
        `• *"Berapa omzet saya?"* → data penjualan\n` +
        `• *"Bagaimana cara mencetak faktur?"* → panduan fitur`,
      cards: [],
      actionPills: [
        { label: '🌾 Supplier beras', prompt: 'Saya membutuhkan supplier beras.' },
        { label: '📍 Supplier daerah saya', prompt: 'Cari supplier di daerah saya.' },
        { label: '💡 Rekomendasi produk', prompt: 'Produk apa yang cocok untuk usaha saya?' },
        { label: '🧠 Ringkas sistem', prompt: 'Ringkas seluruh data sistem saya.' }
      ]
    };
  }

  // ==========================================
  // 19. PEMBANGUN KARTU, LABEL & PILL
  // ==========================================
  supplierCard(s) {
    return {
      type: 'supplier',
      id: s.id,
      name: s.businessName,
      owner: s.ownerName,
      businessType: s.businessType,
      location: s.location || `${s.district || ''}, ${s.regency || ''}`.replace(/^,\s*/, ''),
      rating: s.rating,
      reviewCount: s.reviewCount,
      transactionCount: s.transactionCount,
      avatarInitial: s.avatarInitial,
      verifiedBadge: s.verificationBadge,
      isVerified: s.isVerified,
      featuredProducts: s.featuredProducts || [],
      phone: s.phone,
      sellerId: s.sellerId
    };
  }

  productCard(p) {
    return {
      type: 'product',
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      unit: p.unit,
      minOrder: p.minOrder,
      location: p.regency || p.location,
      sellerName: p.sellerName,
      sellerId: p.sellerId,
      imageUrl: p.imageUrl,
      harvestGrade: p.harvestGrade,
      stock: p.stock
    };
  }

  stockCard(p) {
    return {
      type: 'stock',
      id: p.id,
      name: p.name,
      stock: p.stock,
      unit: p.unit,
      threshold: p.threshold,
      status: p.statusInfo?.status,
      statusLabel: p.statusInfo?.label,
      price: p.price,
      inventoryValue: p.inventoryValue,
      imageUrl: p.imageUrl
    };
  }

  orderCard(o, user) {
    return {
      type: 'order',
      id: o.id,
      productName: o.productName,
      quantity: o.quantity,
      productUnit: o.productUnit,
      totalAmount: o.totalAmount,
      status: o.status,
      date: o.date || o.createdAt,
      isSeller: o.sellerId === user?.id,
      partnerName: o.sellerId === user?.id ? o.buyerName : o.sellerName
    };
  }

  infoCard({ title, subtitle, badge, rows = [], actions = [] }) {
    return { type: 'info', title, subtitle, badge, rows, actions };
  }

  statusBadge(status = '') {
    const s = String(status).toLowerCase();
    if (s.includes('selesai') || s.includes('lunas')) return 'badge-success';
    if (s.includes('batal') || s.includes('tolak')) return 'badge-accent';
    if (s.includes('menunggu') || s.includes('proses')) return 'badge-info';
    return 'badge-primary';
  }

  cardFor(kind, item, user) {
    switch (kind) {
      case 'supplier': return this.supplierCard(item);
      case 'product': return this.productCard(item);
      case 'stock': return this.stockCard(item);
      case 'order': return this.orderCard(item, user);
      case 'negotiation':
        return this.infoCard({
          title: item.productName || 'Negosiasi',
          subtitle: `Penawaran Rp ${Number(item.offerPrice || 0).toLocaleString('id-ID')}`,
          badge: { label: item.status || 'Menunggu', cls: 'badge-info' },
          rows: [
            { label: 'Nomor nego', value: item.id || '-' },
            { label: 'Volume', value: `${Number(item.quantity || 0).toLocaleString('id-ID')} ${item.productUnit || ''}` }
          ],
          actions: [{ label: 'Buka Negosiasi', link: '#/negosiasi' }]
        });
      case 'transaction':
        return this.infoCard({
          title: item.invoiceNumber || item.id || 'Faktur',
          subtitle: `${item.productName || 'Transaksi'} • ${item.date || ''}`,
          badge: { label: item.status || '-', cls: this.statusBadge(item.status) },
          rows: [{ label: 'Nilai', value: `Rp ${Number(item.totalAmount || 0).toLocaleString('id-ID')}` }],
          actions: [{ label: 'Lihat Faktur', link: `#/transaksi-detail?id=${item.id}` }]
        });
      default: return this.infoCard({ title: 'Data', subtitle: '', rows: [], actions: [] });
    }
  }

  kindLabel(kind) {
    return ({
      supplier: 'supplier',
      product: 'produk',
      stock: 'komoditas stok',
      order: 'pesanan',
      negotiation: 'negosiasi',
      transaction: 'transaksi'
    })[kind] || 'data';
  }

  pillsFor(kind, items, user) {
    const nextPrompt = `Tampilkan semua ${this.kindLabel(kind)}`;
    switch (kind) {
      case 'supplier':
        return [
          { label: '💬 Chat #1', link: `#/chat?partnerId=${items[0]?.sellerId || ''}` },
          { label: '🌾 Direktori Supplier', link: '#/supplier' },
          { label: '➡️ Lanjut daftar', prompt: nextPrompt }
        ];
      case 'product':
        return [
          { label: '📑 Buat PO', link: `#/pesanan-buat?productId=${items[0]?.id}` },
          { label: '🛒 Katalog', link: '#/produk' },
          { label: '➡️ Lanjut daftar', prompt: nextPrompt }
        ];
      case 'stock':
        return [
          { label: '📦 Kelola Stok', link: '#/stok' },
          { label: '➡️ Lanjut daftar', prompt: nextPrompt }
        ];
      case 'order':
        return [
          { label: '🔎 Detail PO', link: `#/pesanan-detail?id=${items[0]?.id}` },
          { label: '📦 Semua Pesanan', link: '#/pesanan' },
          { label: '➡️ Lanjut daftar', prompt: nextPrompt }
        ];
      case 'negotiation':
        return [
          { label: '🤝 Kelola Negosiasi', link: '#/negosiasi' },
          { label: '➡️ Lanjut daftar', prompt: nextPrompt }
        ];
      case 'transaction':
        return [
          { label: '🧾 Semua Transaksi', link: '#/transaksi' },
          { label: '➡️ Lanjut daftar', prompt: nextPrompt }
        ];
      default:
        return [{ label: '🏠 Dashboard', link: '#/dashboard' }];
    }
  }

  /** Skor kecocokan supplier terhadap komoditas yang dicari. */
  scoreSupplier(supplier, commodity) {
    if (!commodity) return 0;
    let score = 0;
    const featured = (supplier.featuredProducts || []).join(' ').toLowerCase();
    const cats = supplier.categories || [];
    const profile = `${supplier.businessType || ''} ${supplier.description || ''}`.toLowerCase();

    commodity.terms.forEach(t => {
      if (featured.includes(t)) score += 5;
      if (profile.includes(t)) score += 2;
    });
    commodity.cats.forEach(c => {
      if (cats.includes(c)) score += 4;
    });
    if (supplier.isVerified) score += 1;
    score += Math.max(0, Math.round(((supplier.rating || 0) - 4) * 2));
    return score;
  }

  /** Samakan bentuk respons antara jalur API dan jalur mock. */
  normalizeReply(reply, engine) {
    const base = {
      category: 'general',
      text: '',
      cards: [],
      actionPills: []
    };
    return { ...base, ...(reply || {}), engine };
  }
}

export const aiAssistantService = new AIAssistantService();
