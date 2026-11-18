# DesaBiz AI — Platform B2B untuk UMKM Pedesaan

DesaBiz AI adalah platform web B2B yang dirancang khusus untuk memberdayakan Usaha Mikro, Kecil, dan Menengah (UMKM) di pedesaan. Platform ini memfasilitasi pencarian supplier desa, transaksi grosir, negosiasi harga transparan, manajemen stok, serta integrasi kecerdasan buatan (AI Assistant) untuk rekomendasi harga dan strategi bisnis.

---

## 🎯 Sasaran PRD

1. **Pencarian Supplier**: Memudahkan UMKM menemukan sumber pasokan langsung dari petani/koperasi desa.
2. **Peran Ganda (Dual-Role)**: UMKM dapat bertindak fleksibel sebagai **Pembeli** (sourcing pasokan) maupun **Penjual** (menjual komoditas).
3. **Penawaran Produk**: Manajemen katalog komoditas unggulan desa dengan spesifikasi mutu.
4. **Pemesanan B2B**: Alur Purchase Order (PO) yang terlacak dari pemesanan hingga pengiriman.
5. **Negosiasi Harga**: Mekanisme tawar-menawar digital dua arah yang transparan.
6. **Chat Terpadu**: Komunikasi langsung antara pembeli dan supplier untuk konfirmasi barang.
7. **Kelola Stok & Transaksi**: Pencatatan mutasi barang, peringatan stok menipis, dan faktur digital.
8. **Fitur AI**: Rekomendasi harga komoditas pasar, pencocokan supplier, dan saran efisiensi.

---

## 📂 Struktur Project Modular

Aplikasi ini menggunakan arsitektur **Single Page Application (SPA) berbasis Vanilla ES6 Modules** yang sangat modular, ringan, cepat, dan tidak memerlukan proses kompilasi (*build-step*):

```
c:\xampp\htdocs\APK_UMKM\
│
├── index.php                      # Entry point Apache / PHP Server
├── index.html                     # Entry point SPA Semantic HTML5
├── .htaccess                      # Konfigurasi Apache (MIME Types & Caching)
├── config/
│   └── config.php                 # Konfigurasi AI (API key NVIDIA NIM) — server-side only
├── README.md                      # Dokumentasi teknis proyek
│
├── assets/
│   └── css/
│       ├── variables.css          # Design tokens & color system DesaBiz
│       ├── reset.css              # Normalize & reset CSS
│       ├── layout.css             # Layout shell (Sidebar, Navbar, Main area)
│       ├── components.css         # UI components (KPI cards, buttons, badges)
│       └── main.css               # Master stylesheet
│
├── js/
│   ├── app.js                     # Bootstrap inisialisasi aplikasi
│   ├── router.js                  # Client-side SPA Router berbasis hash
│   ├── state.js                   # State manager reaktif (Role, profil, sidebar)
│   ├── icons.js                   # Library SVG icons
│   │
│   ├── components/                # Komponen UI Layout Shell
│   │   ├── Navbar.js              # Top bar, search, role switch (Pembeli/Penjual)
│   │   └── Sidebar.js             # Navigasi bertingkat 11 modul & AI pulse
│   │
│   ├── services/                  # Layanan lintas modul (terisolasi & mudah ditukar)
│   │   └── aiAssistantService.js  # "Otak" chatbot: intent, memori, snapshot sistem, mock engine
│   │
│   └── modules/                   # 11 Modul Fungsional Sesuai PRD
│       ├── auth/                  # Autentikasi & legalitas UMKM desa
│       ├── dashboard/             # Dashboard utama & ringkasan operasional
│       ├── produk/                # Katalog & penawaran komoditas
│       ├── supplier/              # Direktori & pencarian supplier desa
│       ├── pesanan/               # Purchase Order & tracking pengiriman
│       ├── negosiasi/             # Sistem tawar-menawar harga B2B
│       ├── chat/                  # Pesan instan pembeli-penjual
│       ├── stok/                  # Manajemen inventaris & restock alert
│       ├── transaksi/             # Faktur digital & rekonsiliasi kas
│       ├── ai-assistant/          # Renderer chat bersama (dipakai dashboard; bukan menu halaman)
│       └── admin/                 # Admin Dashboard: KPI, monitoring, pengguna & kategori
│
├── config/
│   └── config.example.php         # Template konfigurasi database & API
└── api/
    ├── index.php                  # REST API gateway PHP untuk backend
    └── ai.php                     # Proksi AI server-side (API key tetap di server)
```

---

## 🤖 Arsitektur AI Assistant (Chatbot)

Chatbot berdiri sendiri di luar UI sehingga logika AI bisa diganti tanpa menyentuh halaman chat.

| Lapisan | Berkas | Tugas |
|---|---|---|
| UI / tampilan chat | `js/modules/ai-assistant/index.js` | Renderer bubble, kartu data, pill aksi, indikator mengetik (dipakai bagian AI di dashboard) |
| Logika AI | `js/services/aiAssistantService.js` | Router intent berbasis skor, memori percakapan, snapshot sistem, pembuat jawaban |
| Proksi server | `api/ai.php` | Meneruskan pertanyaan ke penyedia AI (NVIDIA NIM / OpenAI / Gemini) — **API key tidak pernah di frontend** |

**Cara kerja**

1. `sendMessage()` mengirim pertanyaan + `snapshot` (data riil aplikasi: profil, supplier beserta produk andalan, katalog produk, stok menipis, PO, transaksi, negosiasi, chat) ke `api/ai.php`.
2. Bila backend AI belum dikonfigurasi (`status: mock_fallback`), jawaban dihasilkan oleh **Local Intelligence Engine** di `aiAssistantService.js` — tidak ada panggilan jaringan ke penyedia AI.
3. Setiap jawaban menyertakan `category`, `text`, `cards`, dan `actionPills` agar UI selalu tahu cara merendernya.

**Menghubungkan AI sungguhan** (opsional, hanya di server):

```powershell
# OpenAI
$env:OPENAI_API_KEY = "sk-..."
# atau Google Gemini
$env:GEMINI_API_KEY = "AIza..."
# atau variabel khusus DesaBiz
$env:DESABIZ_AI_API_KEY = "..."
```

Bila salah satu variabel terisi, `api/ai.php` memakai model tersebut dan otomatis kembali ke mode mock bila permintaan gagal.

**Cara yang dipakai proyek ini (NVIDIA NIM)** — kunci disimpan di `config/config.php` (tidak pernah dikirim ke browser):

```php
// config/config.php
define('AI_API_ENDPOINT', 'https://integrate.api.nvidia.com/v1/chat/completions');
define('AI_API_MODEL', 'openai/gpt-oss-20b');   // model utama
define('AI_API_KEY', 'nvapi-...');              // kunci NVIDIA NIM (server-side only)
```

- Provider dikenali otomatis dari bentuk kunci: `nvapi-...` → NVIDIA NIM, `AIza...` → Gemini, lainnya → OpenAI-compatible.
- Bila model utama tidak merespons (mis. antrean sibuk di NIM gratis), `api/ai.php` otomatis mencoba model cadangan (`z-ai/glm-5.3`, `nvidia/nemotron-3-super-120b-a12b`, lalu `openai/gpt-oss-20b`) dengan batas 8 detik per model.
- Bila semua model gagal, frontend tetap menjawab lewat **Local Intelligence Engine** (data riil aplikasi), jadi chatbot tidak pernah mati.
- Timeout sengaja longgar (backend 40 dtk, browser 35 dtk) karena endpoint NIM gratis sering menjawab 5–30 dtk di bawah beban puncak.

**Cakupan jawaban**: asisten hanya menjawab seputar sistem DesaBiz AI (supplier, produk, stok, PO, transaksi, negosiasi, chat, profil, penjualan, panduan fitur, identitas asisten). Permintaan di luar cakupan — terutama pembuatan kode/program seperti Python — ditolak sopan dan diarahkan kembali ke fitur aplikasi.

### 💬 AI Assistant terintegrasi di dashboard (khusus Pembeli)

AI Assistant **tidak lagi menjadi menu/halaman terpisah** — ia tertanam langsung di halaman `#/dashboard` sebagai bagian (kartu chat) dan **hanya tampil saat mode Pembeli** (saat beralih ke mode Penjual, bagian ini disembunyikan):

- Route `#/ai-assistant` dan menu sidebar "DesaBiz AI" sudah dihilangkan; membuka `#/ai-assistant` otomatis dialihkan ke dashboard.
- Tombol cepat **AI Assistant** di dashboard menggulirkan halaman ke bagian chat dan memfokuskan kolom pertanyaan.
- State percakapan disimpan di `DashboardModule.aiChat` sehingga tidak hilang saat re-render; riwayat disimpan per pengguna di `localStorage` (`desabiz_dash_ai_<userId>`).
- Badge engine di kepala bagian menunjukkan **⚡ AI API Aktif** (jawaban dari model AI lewat server) atau **Local Intelligence Engine** (cadangan).
- Memakai ulang renderer yang sama dengan bubble chat (bubble, kartu data, pill aksi) dan mengirim `snapshot` yang sama ke `api/ai.php`.
- CSS: `.dash-ai-*` di `assets/css/components.css` (area percakapan tetap `340px`, responsif di layar pendek).

---

## 🔐 Role Pengguna & Admin Dashboard

Sistem memiliki dua **role akun** (`accountRole`) yang tersimpan pada `js/state.js`:

| Role | Fungsi | Contoh akses |
|---|---|---|
| **UMKM** | Pengguna platform (Pembeli & Penjual) | Dashboard, produk, PO, negosiasi, stok, transaksi, chat, AI Assistant |
| **ADMIN** | Pengelola platform | Semua akses UMKM **+ Panel Admin** (`#/admin`) |

**Akun demo**

| Email | Password | Role |
|---|---|---|
| `budi.tanimakmur@desabiz.id` | `password123` | UMKM |
| `admin@desabiz.id` | `admin123` | ADMIN |

Keduanya tersedia sebagai tombol cepat di halaman login (**Akun UMKM** / **Akun Admin**).

**Fitur Admin Dashboard** (`js/modules/admin/index.js`)

1. **Ringkasan** — KPI Total Pengguna, Total UMKM, Total Produk, Total Transaksi, Total Pesanan + strip statistik ekosistem + **Monitoring Aktivitas** (log login, PO, transaksi, stok, negosiasi, aksi admin).
2. **Manajemen Pengguna** — daftar seluruh akun, pencarian, filter role/status, dan tombol **Aktifkan / Nonaktifkan** akun (akun nonaktif tidak bisa login).
3. **Manajemen Kategori Produk** — tambah, ubah (input inline), dan hapus kategori; kategori terpakai produk tidak bisa dihapus; hasilnya langsung dipakai dropdown/chip di modul Produk & Supplier.
4. **Monitoring Produk** — seluruh komoditas lintas UMKM: harga, stok, penjual, status.
5. **Monitoring Transaksi** — nilai, mitra, status pembayaran, filter status, plus tabel monitoring PO.

**Aturan otorisasi**

- Route `#/admin` **hanya** untuk `accountRole === 'ADMIN'` (dicek di `js/router.js` dan ulang di dalam modul sebagai *defense in depth*).
- Menu **Panel Admin** hanya dirender pada Sidebar untuk akun ADMIN.
- Metode state `setUserActive()`, `addCategory()`, `renameCategory()`, `deleteCategory()` menolak pemanggil non-admin.
- Login akun yang dinonaktifkan diblokir dengan pesan jelas.

**Penyimpanan data (localStorage)**

| Kunci | Isi |
|---|---|
| `desabiz_users` | Akun pengguna (UMKM + ADMIN) + status aktif & role |
| `desabiz_session` | Sesi login aktif |
| `desabiz_categories` | Daftar kategori produk (dikelola admin) |
| `desabiz_activity_logs` | Log aktivitas platform untuk monitoring |
| `desabiz_dash_ai_<userId>` | Riwayat percakapan AI Assistant di bagian dashboard (per pengguna) |

> Data masih disimpan di `localStorage` (dummy/prototype) — migrasi ke MySQL cukup dengan mengganti pembacaan `getStored*()` di `js/state.js` ke endpoint `api/*.php`.

---

## ✅ Status Implementasi

| Bagian | Status keterangan |
|---|---|
| 8 sasaran PRD (supplier, dual-role, produk, PO, negosiasi, chat, stok/transaksi, AI) | Terimplementasi penuh (SPA, data dummy) |
| Autentikasi (login/register/logout, validasi form, sesi) | Aktif (localStorage) |
| Authorization (guard route + role ADMIN) | Aktif |
| Admin Dashboard & manajemen pengguna/kategori | Aktif |
| AI Assistant (intent + snapshot data + mode API server) | Aktif — terintegrasi di `#/dashboard` (khusus mode Pembeli), lewat `api/ai.php` (NVIDIA NIM) |
| Backend PHP (`api/index.php`, `api/ai.php`) | Kontrak REST aktif; **belum** terhubung database MySQL |
| Pembayaran/ekspedisi sungguhan, notifikasi email, unggah foto asli | Masih simulasi/dummy |

---

## 🚀 Cara Menjalankan Aplikasi

### Opsi 1: Menggunakan XAMPP Apache (Rekomendasi)
1. Buka **XAMPP Control Panel**.
2. Pastikan service **Apache** dalam status **Start** (Running).
3. Buka browser dan kunjungi:
   ```
   http://localhost/APK_UMKM/
   ```

### Opsi 2: Menggunakan PHP Built-in Server
Jika ingin menjalankan tanpa Apache, jalankan perintah berikut di PowerShell pada direktori project:
```powershell
& "C:\xampp\php\php.exe" -S localhost:8000
```
Lalu buka:
```
http://localhost:8000/
```

---

## 🧭 Panduan Pengembangan Tahap Berikutnya

Setiap modul di dalam `js/modules/<nama_modul>/index.js` mengimplementasikan pola standar:
```javascript
export const ModuleName = {
  id: 'nama-modul',
  title: 'Judul Modul',
  subtitle: 'Deskripsi Subtitle',
  render: (container) => {
    // Logika render dan event handler modul di sini
  }
};
```
Untuk mengintegrasikan database MySQL pada tahap lanjutan, cukup buat endpoint baru di `api/` (misal: `api/products.php`) dan panggil dengan `fetch()` dari modul masing-masing.
