// DesaBiz AI - Global State & Authentication Manager

const DEMO_USER = {
  id: 'usr_01',
  ownerName: 'Budi Santoso',
  businessName: 'UD Tani Makmur Sejahtera',
  email: 'budi.tanimakmur@desabiz.id',
  phone: '081234567890',
  address: 'Jl. Raya Sukamaju No. 45, RT 02/RW 04',
  village: 'Desa Sukamaju',
  district: 'Kecamatan Pacet',
  regency: 'Kabupaten Cianjur',
  businessType: 'Pertanian & Komoditas Pangan',
  description: 'Sentra budidaya dan pasokan beras organik mentik wangi, kopi arabika ciwidey, dan hasil bumi pilihan langsung dari petani mitra desa.',
  avatarInitial: 'BS',
  role: 'buyer', // 'buyer' (Pembeli) or 'seller' (Penjual)
  accountRole: 'UMKM', // 'UMKM' (pengguna platform) or 'ADMIN' (pengelola platform)
  isActive: true,
  joinedAt: '2025-01-15',
  isVerified: true,
  verificationBadge: 'UMKM Mandiri Desa Terverifikasi',
  membership: 'Mitra Gapoktan Jawa Barat',
  password: 'password123'
};

// Akun Administrator platform (role ADMIN) — untuk Panel Administrasi DesaBiz.
const DEMO_ADMIN = {
  id: 'usr_admin',
  ownerName: 'Siti Aminah Rahma',
  businessName: 'Admin DesaBiz AI',
  email: 'admin@desabiz.id',
  phone: '081100000001',
  address: 'Kantor Pusat Pengelola DesaBiz AI',
  village: 'Desa Sukamaju',
  district: 'Kecamatan Pacet',
  regency: 'Kabupaten Cianjur',
  businessType: 'Platform Administrator',
  description: 'Akun pengelola platform DesaBiz AI untuk monitoring ekosistem, moderasi pengguna, kategori komoditas, produk, dan transaksi.',
  avatarInitial: 'AD',
  role: 'buyer',
  accountRole: 'ADMIN',
  isActive: true,
  joinedAt: '2024-08-01',
  isVerified: true,
  verificationBadge: 'Administrator Platform DesaBiz',
  membership: 'Tim Pengelola DesaBiz AI',
  password: 'admin123'
};

// Daftar kategori produk bawaan (dapat dikelola Administrator)
const DEFAULT_CATEGORIES = [
  'Pertanian & Beras',
  'Perkebunan & Kopi',
  'Gula & Rempah',
  'Hortikultura & Sayur',
  'Peternakan & Pakan',
  'Pupuk & Sarana Tani'
];

const INITIAL_PRODUCTS = [
  {
    id: 'prd_01',
    name: 'Beras Mentik Wangi Organik',
    category: 'Pertanian & Beras',
    description: 'Beras varietas Mentik Wangi hasil panen alami kelompok tani binaan tanpa pestisida kimia. Memiliki aroma pandan wangi alami, pulen lembut, dan kadar air ideal 14%. Cocok untuk suplai restoran, katering hotel, dan toko beras grosir.',
    price: 14500,
    unit: 'Kg',
    stock: 4500,
    minOrder: 100,
    location: 'Desa Sukamaju, Pacet',
    regency: 'Kabupaten Cianjur',
    sellerId: 'usr_01',
    sellerName: 'UD Tani Makmur Sejahtera',
    sellerPhone: '081234567890',
    sellerVerified: true,
    harvestGrade: 'Organik Bersertifikat',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-08-15'
  },
  {
    id: 'prd_02',
    name: 'Kopi Arabika Ciwidey Honey Process',
    category: 'Perkebunan & Kopi',
    description: 'Green bean & roasted bean kopi single origin pegunungan Ciwidey ketinggian 1.500 mdpl. Diproses secara Honey Process menghasilkan cita rasa manis madu alami, acidity lembut seimbang, dan aroma floral yang khas.',
    price: 98000,
    unit: 'Kg',
    stock: 850,
    minOrder: 20,
    location: 'Desa Patengan, Rancabali',
    regency: 'Kabupaten Bandung',
    sellerId: 'usr_02',
    sellerName: 'Koperasi Kopi Rancabali Makmur',
    sellerPhone: '081398765432',
    sellerVerified: true,
    harvestGrade: 'Grade 1 Specialty (85+)',
    imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-08-18'
  },
  {
    id: 'prd_03',
    name: 'Gula Aren Organik Cetak Super',
    category: 'Gula & Rempah',
    description: 'Gula aren murni dibuat dari nira pohon aren pegunungan Kendeng tanpa campuran gula pasir atau pengawet kimia. Dicetak dalam batok kelapa tradisional dengan aroma karamel legit wangi khas pedesaan.',
    price: 26000,
    unit: 'Kg',
    stock: 1200,
    minOrder: 50,
    location: 'Desa Sobang',
    regency: 'Kabupaten Lebak',
    sellerId: 'usr_03',
    sellerName: 'KWT Giri Asri Lebak',
    sellerPhone: '085712344321',
    sellerVerified: true,
    harvestGrade: 'Super Murni 100%',
    imageUrl: 'https://images.unsplash.com/photo-1607672632458-9eb56696346b?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-08-20'
  },
  {
    id: 'prd_04',
    name: 'Cabai Merah Keriting Segar Panen',
    category: 'Hortikultura & Sayur',
    description: 'Cabai merah keriting petik segar harian langsung dari kebun dataran tinggi Sukabumi. Tekstur keras padat tahan simpan perjalanan logistik antar-kota, tingkat kepedasan optimal untuk industri olahan dan bumbu.',
    price: 32000,
    unit: 'Kg',
    stock: 1800,
    minOrder: 50,
    location: 'Desa Kadudampit',
    regency: 'Kabupaten Sukabumi',
    sellerId: 'usr_04',
    sellerName: 'Gapoktan Harapan Tani Sukabumi',
    sellerPhone: '082198877665',
    sellerVerified: true,
    harvestGrade: 'Grade A Segar',
    imageUrl: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-08-28'
  },
  {
    id: 'prd_05',
    name: 'Jagung Pipil Kering Pakan & Pangan',
    category: 'Pertanian & Beras',
    description: 'Jagung hibrida pipil kuning kering dengan kadar air maksimal 14%, bersih dari kotoran dan jamur. Sangat cocok sebagai bahan baku pakan unggas, ternak, serta industri pengolahan tepung jagung.',
    price: 5800,
    unit: 'Kg',
    stock: 15000,
    minOrder: 500,
    location: 'Desa Toroh',
    regency: 'Kabupaten Grobogan',
    sellerId: 'usr_05',
    sellerName: 'Sentra Jagung Grobogan Abadi',
    sellerPhone: '081255443322',
    sellerVerified: true,
    harvestGrade: 'Standar Pabrik SNI',
    imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-08-22'
  },
  {
    id: 'prd_06',
    name: 'Pupuk Kompos Organik Granul',
    category: 'Pupuk & Sarana Tani',
    description: 'Pupuk kompos bio-organik diperkaya mikroba trichoderma dan unsur hara esensial NPK alami. Meningkatkan kesuburan tanah, aerasi akar, dan ramah lingkungan untuk tanaman pangan maupun hortikultura.',
    price: 35000,
    unit: 'Karung (50kg)',
    stock: 600,
    minOrder: 10,
    location: 'Desa Sukamaju, Pacet',
    regency: 'Kabupaten Cianjur',
    sellerId: 'usr_01',
    sellerName: 'UD Tani Makmur Sejahtera',
    sellerPhone: '081234567890',
    sellerVerified: true,
    harvestGrade: 'Formulasi Mutu SNI',
    imageUrl: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-08-25'
  },
  {
    id: 'prd_07',
    name: 'Bawang Merah Brebes Super Sortir',
    category: 'Hortikultura & Sayur',
    description: 'Bawang merah varietas Bima Brebes sortiran super besar, aroma sangat tajam menyengat dan warna merah merona. Diproses pengasapan gantung tradisional sehingga tahan simpan hingga 2 bulan.',
    price: 28000,
    unit: 'Kg',
    stock: 3200,
    minOrder: 50,
    location: 'Desa Larangan',
    regency: 'Kabupaten Brebes',
    sellerId: 'usr_06',
    sellerName: 'Tani Bawang Berkah Brebes',
    sellerPhone: '081912345678',
    sellerVerified: true,
    harvestGrade: 'Grade Super Besar',
    imageUrl: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-08-26'
  },
  {
    id: 'prd_08',
    name: 'Ikan Nila Segar Kolam Air Deras',
    category: 'Peternakan & Pakan',
    description: 'Ikan nila hidup/segar hasil budidaya kolam air deras pegunungan Subang tanpa bau lumpur. Diberi pakan pelet berprotein tinggi, daging tebal dan padat gurih. Siap kirim hidup dengan tabung oksigen atau es curah.',
    price: 29000,
    unit: 'Kg',
    stock: 900,
    minOrder: 30,
    location: 'Desa Kasomalang',
    regency: 'Kabupaten Subang',
    sellerId: 'usr_07',
    sellerName: 'Mina Mandiri Farm Subang',
    sellerPhone: '082233445566',
    sellerVerified: true,
    harvestGrade: 'Segar Kolam Air Pegunungan',
    imageUrl: 'https://images.unsplash.com/photo-1534043464124-3be32fe000c9?auto=format&fit=crop&w=600&q=80',
    createdAt: '2026-08-29'
  }
];

const INITIAL_SUPPLIERS = [
  {
    id: 'sup_01',
    sellerId: 'usr_01',
    businessName: 'UD Tani Makmur Sejahtera',
    ownerName: 'Budi Santoso',
    businessType: 'Pertanian & Komoditas Pangan',
    categories: ['Pertanian & Beras', 'Pupuk & Sarana Tani'],
    featuredProducts: ['Beras Mentik Wangi Organik', 'Pupuk Kompos Organik Granul'],
    village: 'Desa Sukamaju',
    district: 'Kecamatan Pacet',
    regency: 'Kabupaten Cianjur',
    location: 'Desa Sukamaju, Pacet, Kab. Cianjur',
    address: 'Jl. Raya Sukamaju No. 45, RT 02/RW 04, Pacet, Cianjur',
    description: 'Sentra budidaya dan kemitraan gabungan kelompok tani (Gapoktan) Cianjur yang memproduksi beras organik varietas mentik wangi bebas pestisida kimia serta formulasi pupuk kompos bio-organik bermutu tinggi.',
    capacity: '25 Ton / Bulan',
    phone: '081234567890',
    email: 'budi.tanimakmur@desabiz.id',
    isVerified: true,
    verificationBadge: 'UMKM Mandiri Desa Terverifikasi',
    rating: 4.9,
    reviewCount: 148,
    transactionCount: 230,
    avatarInitial: 'TM',
    joinDate: 'Januari 2025'
  },
  {
    id: 'sup_02',
    sellerId: 'usr_02',
    businessName: 'Koperasi Kopi Rancabali Makmur',
    ownerName: 'Asep Sudrajat',
    businessType: 'Koperasi Desa Produsen Kopi',
    categories: ['Perkebunan & Kopi'],
    featuredProducts: ['Kopi Arabika Ciwidey Honey Process'],
    village: 'Desa Patengan',
    district: 'Kecamatan Rancabali',
    regency: 'Kabupaten Bandung',
    location: 'Desa Patengan, Rancabali, Kab. Bandung',
    address: 'Jl. Situ Patenggang KM 7, Rancabali, Bandung',
    description: 'Koperasi petani kopi lereng Gunung Patuha Ciwidey dengan ketinggian 1.500 mdpl. Menghasilkan specialty green bean dan roasted bean berstandar ekspor dengan sertifikasi mutu SCA (Specialty Coffee Association).',
    capacity: '8 Ton / Bulan',
    phone: '081398765432',
    email: 'koperasi.rancabali@desabiz.id',
    isVerified: true,
    verificationBadge: 'Koperasi Desa Terverifikasi',
    rating: 4.8,
    reviewCount: 92,
    transactionCount: 165,
    avatarInitial: 'KR',
    joinDate: 'Maret 2025'
  },
  {
    id: 'sup_03',
    sellerId: 'usr_03',
    businessName: 'KWT Giri Asri Lebak',
    ownerName: 'Siti Maryam',
    businessType: 'Kelompok Wanita Tani (KWT)',
    categories: ['Gula & Rempah'],
    featuredProducts: ['Gula Aren Organik Cetak Super'],
    village: 'Desa Sobang',
    district: 'Kecamatan Sobang',
    regency: 'Kabupaten Lebak',
    location: 'Desa Sobang, Kab. Lebak',
    address: 'Kampung Pasir Awi RT 01/RW 02, Sobang, Lebak, Banten',
    description: 'Kelompok usaha wanita perajin gula aren tradisional pegunungan Kendeng. Menjaga kemurnian nira aren 100% tanpa campuran pemanis buatan dengan metode pemanasan tungku kayu bakar alami.',
    capacity: '5 Ton / Bulan',
    phone: '085712344321',
    email: 'kwt.giriasri@desabiz.id',
    isVerified: true,
    verificationBadge: 'Sentra Pangan Tradisional Banten',
    rating: 4.9,
    reviewCount: 76,
    transactionCount: 110,
    avatarInitial: 'GA',
    joinDate: 'Februari 2025'
  },
  {
    id: 'sup_04',
    sellerId: 'usr_04',
    businessName: 'Gapoktan Harapan Tani Sukabumi',
    ownerName: 'Dedi Kurniawan',
    businessType: 'Gabungan Kelompok Tani (Gapoktan)',
    categories: ['Hortikultura & Sayur'],
    featuredProducts: ['Cabai Merah Keriting Segar Panen'],
    village: 'Desa Kadudampit',
    district: 'Kecamatan Kadudampit',
    regency: 'Kabupaten Sukabumi',
    location: 'Desa Kadudampit, Kab. Sukabumi',
    address: 'Jl. Raya Salabintana KM 9, Kadudampit, Sukabumi',
    description: 'Gabungan 12 kelompok tani hortikultura lereng Gunung Gede Pangrango. Memasok komoditas cabai, sayuran daun, dan tomat segar petik harian langsung untuk kebutuhan pasar induk dan industri olahan pangan.',
    capacity: '40 Ton / Bulan',
    phone: '082198877665',
    email: 'gapoktan.harapantani@desabiz.id',
    isVerified: true,
    verificationBadge: 'Gapoktan Binaan Dinas Pertanian',
    rating: 4.7,
    reviewCount: 185,
    transactionCount: 310,
    avatarInitial: 'HT',
    joinDate: 'Desember 2024'
  },
  {
    id: 'sup_05',
    sellerId: 'usr_05',
    businessName: 'Sentra Jagung Grobogan Abadi',
    ownerName: 'Hadi Sutrisno',
    businessType: 'Sentra Budidaya & Pakan Ternak',
    categories: ['Pertanian & Beras', 'Peternakan & Pakan'],
    featuredProducts: ['Jagung Pipil Kering Pakan & Pangan'],
    village: 'Desa Toroh',
    district: 'Kecamatan Toroh',
    regency: 'Kabupaten Grobogan',
    location: 'Desa Toroh, Kab. Grobogan',
    address: 'Jl. Raya Purwodadi - Solo KM 8, Toroh, Grobogan',
    description: 'Pusat pengeringan dan pasokan komoditas jagung pipil hibrida berskala besar. Dilengkapi fasilitas bed dryer berkapasitas 50 ton per hari guna memastikan kadar air stabil di bawah 14%.',
    capacity: '120 Ton / Bulan',
    phone: '081255443322',
    email: 'jagung.grobogan@desabiz.id',
    isVerified: true,
    verificationBadge: 'Pemasok Pangan SNI Terverifikasi',
    rating: 4.8,
    reviewCount: 120,
    transactionCount: 195,
    avatarInitial: 'SJ',
    joinDate: 'November 2024'
  },
  {
    id: 'sup_06',
    sellerId: 'usr_06',
    businessName: 'Tani Bawang Berkah Brebes',
    ownerName: 'H. Slamet Riyadi',
    businessType: 'Sentra Budidaya Bawang Merah',
    categories: ['Hortikultura & Sayur'],
    featuredProducts: ['Bawang Merah Brebes Super Sortir'],
    village: 'Desa Larangan',
    district: 'Kecamatan Larangan',
    regency: 'Kabupaten Brebes',
    location: 'Desa Larangan, Kab. Brebes',
    address: 'Jl. Raya Larangan Timur No. 12, Brebes, Jawa Tengah',
    description: 'Petani spesialis varietas Bima Brebes sortiran grade super dengan ketahanan simpan prima. Menyuplai jaringan grosir, distributor bumbu dapur kemasan, dan pabrik makanan olahan skala nasional.',
    capacity: '35 Ton / Bulan',
    phone: '081912345678',
    email: 'bawang.berkah@desabiz.id',
    isVerified: true,
    verificationBadge: 'Mitra Utama Agribisnis Brebes',
    rating: 4.9,
    reviewCount: 210,
    transactionCount: 380,
    avatarInitial: 'TB',
    joinDate: 'Oktober 2024'
  },
  {
    id: 'sup_07',
    sellerId: 'usr_07',
    businessName: 'Mina Mandiri Farm Subang',
    ownerName: 'Iwan Setiawan',
    businessType: 'Budidaya Perikanan Air Tawar',
    categories: ['Peternakan & Pakan'],
    featuredProducts: ['Ikan Nila Segar Kolam Air Deras'],
    village: 'Desa Kasomalang',
    district: 'Kecamatan Kasomalang',
    regency: 'Kabupaten Subang',
    location: 'Desa Kasomalang, Kab. Subang',
    address: 'Jl. Curug Cijalu KM 3, Kasomalang, Subang',
    description: 'Pusat budidaya perikanan air deras pegunungan dengan debit air jernih stabil sepanjang tahun. Ikan tidak berbau lumpur, daging tebal padat, melayani pengiriman hidup menggunakan tangki aerasi khusus.',
    capacity: '15 Ton / Bulan',
    phone: '082233445566',
    email: 'minamandiri.subang@desabiz.id',
    isVerified: true,
    verificationBadge: 'Sentra Perikanan Segar Subang',
    rating: 4.7,
    reviewCount: 64,
    transactionCount: 88,
    avatarInitial: 'MM',
    joinDate: 'April 2025'
  }
];

const INITIAL_ORDERS = [
  {
    id: 'ORD-2026-089',
    buyerId: 'usr_01',
    buyerName: 'UD Tani Makmur Sejahtera',
    buyerContact: 'Budi Santoso (081234567890)',
    buyerAddress: 'Jl. Raya Sukamaju No. 45, RT 02/RW 04, Pacet, Cianjur',
    sellerId: 'usr_02',
    sellerName: 'Koperasi Kopi Rancabali Makmur',
    sellerContact: 'Asep Sudrajat (081398765432)',
    sellerLocation: 'Desa Patengan, Rancabali, Kab. Bandung',
    productId: 'prd_02',
    productName: 'Kopi Arabika Ciwidey Honey Process',
    productUnit: 'Kg',
    productImage: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80',
    quantity: 150,
    unitPrice: 98000,
    subtotal: 14700000,
    shippingCost: 350000,
    totalAmount: 15050000,
    status: 'Diproses',
    notes: 'Pengiriman via armada logistik berpendingin. Mohon sertakan sertifikat uji kadar air.',
    createdAt: '2026-09-02 09:30',
    updatedAt: '2026-09-02 11:15',
    timeline: [
      { status: 'Menunggu', time: '02 Sep 2026, 09:30', note: 'Purchase Order (PO) resmi diterbitkan oleh UD Tani Makmur Sejahtera' },
      { status: 'Diproses', time: '02 Sep 2026, 11:15', note: 'Supplier Koperasi Kopi Rancabali menyetujui PO dan mulai sortasi green bean' }
    ]
  },
  {
    id: 'ORD-2026-090',
    buyerId: 'usr_03',
    buyerName: 'KWT Giri Asri Lebak',
    buyerContact: 'Siti Maryam (085712344321)',
    buyerAddress: 'Kampung Pasir Awi RT 01/RW 02, Sobang, Lebak, Banten',
    sellerId: 'usr_01',
    sellerName: 'UD Tani Makmur Sejahtera',
    sellerContact: 'Budi Santoso (081234567890)',
    sellerLocation: 'Desa Sukamaju, Pacet, Kab. Cianjur',
    productId: 'prd_01',
    productName: 'Beras Mentik Wangi Organik',
    productUnit: 'Kg',
    productImage: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
    quantity: 500,
    unitPrice: 14500,
    subtotal: 7250000,
    shippingCost: 250000,
    totalAmount: 7500000,
    status: 'Menunggu',
    notes: 'Mohon gunakan kemasan karung goni 25kg berlabel organik standar SNI.',
    createdAt: '2026-09-03 08:15',
    updatedAt: '2026-09-03 08:15',
    timeline: [
      { status: 'Menunggu', time: '03 Sep 2026, 08:15', note: 'Pesanan masuk dari KWT Giri Asri Lebak. Menunggu konfirmasi Anda sebagai penjual.' }
    ]
  },
  {
    id: 'ORD-2026-088',
    buyerId: 'usr_04',
    buyerName: 'Gapoktan Harapan Tani Sukabumi',
    buyerContact: 'Dedi Kurniawan (082198877665)',
    buyerAddress: 'Jl. Raya Salabintana KM 9, Kadudampit, Sukabumi',
    sellerId: 'usr_01',
    sellerName: 'UD Tani Makmur Sejahtera',
    sellerContact: 'Budi Santoso (081234567890)',
    sellerLocation: 'Desa Sukamaju, Pacet, Kab. Cianjur',
    productId: 'prd_06',
    productName: 'Pupuk Kompos Bio-Organik Granul',
    productUnit: 'Kg',
    productImage: 'https://images.unsplash.com/photo-1592417817098-8f3d69106093?auto=format&fit=crop&w=600&q=80',
    quantity: 2000,
    unitPrice: 4500,
    subtotal: 9000000,
    shippingCost: 400000,
    totalAmount: 9400000,
    status: 'Dikonfirmasi',
    notes: 'Pasokan pupuk untuk musim tanam hortikultura kuartal 4.',
    createdAt: '2026-09-01 14:00',
    updatedAt: '2026-09-02 10:00',
    timeline: [
      { status: 'Menunggu', time: '01 Sep 2026, 14:00', note: 'Pesanan masuk dari Gapoktan Harapan Tani' },
      { status: 'Diproses', time: '01 Sep 2026, 16:30', note: 'Pesanan disetujui, pupuk disiapkan dari gudang Pacet' },
      { status: 'Dikonfirmasi', time: '02 Sep 2026, 10:00', note: 'Armada logistik desa telah diberangkatkan menuju Sukabumi' }
    ]
  },
  {
    id: 'ORD-2026-085',
    buyerId: 'usr_01',
    buyerName: 'UD Tani Makmur Sejahtera',
    buyerContact: 'Budi Santoso (081234567890)',
    buyerAddress: 'Jl. Raya Sukamaju No. 45, RT 02/RW 04, Pacet, Cianjur',
    sellerId: 'usr_04',
    sellerName: 'Gapoktan Harapan Tani Sukabumi',
    sellerContact: 'Dedi Kurniawan (082198877665)',
    sellerLocation: 'Desa Kadudampit, Kab. Sukabumi',
    productId: 'prd_04',
    productName: 'Cabai Merah Keriting Segar Panen',
    productUnit: 'Kg',
    productImage: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=600&q=80',
    quantity: 200,
    unitPrice: 32000,
    subtotal: 6400000,
    shippingCost: 200000,
    totalAmount: 6600000,
    status: 'Selesai',
    notes: 'Komoditas diterima lengkap dan sesuai standar mutu cabai segar petik harian.',
    createdAt: '2026-08-25 10:00',
    updatedAt: '2026-08-26 15:45',
    timeline: [
      { status: 'Menunggu', time: '25 Agu 2026, 10:00', note: 'Purchase Order diterbitkan' },
      { status: 'Diproses', time: '25 Agu 2026, 13:00', note: 'Supplier menyiapkan komoditas petik segar' },
      { status: 'Dikonfirmasi', time: '26 Agu 2026, 08:30', note: 'Pesanan dalam perjalanan pengiriman' },
      { status: 'Selesai', time: '26 Agu 2026, 15:45', note: 'Barang diterima dan pesanan telah dikonfirmasi selesai' }
    ]
  },
  {
    id: 'ORD-2026-082',
    buyerId: 'usr_01',
    buyerName: 'UD Tani Makmur Sejahtera',
    buyerContact: 'Budi Santoso (081234567890)',
    buyerAddress: 'Jl. Raya Sukamaju No. 45, Pacet, Cianjur',
    sellerId: 'usr_06',
    sellerName: 'Tani Bawang Berkah Brebes',
    sellerContact: 'H. Slamet Riyadi (081912345678)',
    sellerLocation: 'Desa Larangan, Brebes',
    productId: 'prd_07',
    productName: 'Bawang Merah Brebes Super Sortir',
    productUnit: 'Kg',
    productImage: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80',
    quantity: 300,
    unitPrice: 28000,
    subtotal: 8400000,
    shippingCost: 300000,
    totalAmount: 8700000,
    status: 'Dibatalkan',
    notes: 'Dibatalkan karena persediaan sortiran super sedang kosong pasca cuaca hujan.',
    createdAt: '2026-08-20 11:30',
    updatedAt: '2026-08-20 14:00',
    timeline: [
      { status: 'Menunggu', time: '20 Agu 2026, 11:30', note: 'PO diterbitkan' },
      { status: 'Dibatalkan', time: '20 Agu 2026, 14:00', note: 'Pesanan dibatalkan bersama karena kendala cuaca panen di Brebes' }
    ]
  }
];

const INITIAL_NEGOTIATIONS = [
  {
    id: 'NEG-2026-015',
    buyerId: 'usr_01',
    buyerName: 'UD Tani Makmur Sejahtera',
    sellerId: 'usr_03',
    sellerName: 'KWT Giri Asri Lebak',
    productId: 'prd_03',
    productName: 'Gula Aren Organik Cetak Super',
    productUnit: 'Kg',
    productImage: 'https://images.unsplash.com/photo-1607672632458-9eb56696346b?auto=format&fit=crop&w=600&q=80',
    quantity: 300,
    initialPrice: 26000,
    offerPrice: 23500,
    counterPrice: 24500,
    status: 'Dinegosiasi Balik',
    buyerNote: 'Kami berencana memesan 300 Kg rutin tiap 2 pekan untuk pasokan industri kecap dan minuman herbal binaan.',
    sellerNote: 'Kami tawarkan jalan tengah di Rp 24.500/Kg karena biaya panen nira murni sedang naik. Kualitas dijamin 100% nira murni.',
    createdAt: '2026-09-02 10:20',
    updatedAt: '2026-09-02 14:45',
    history: [
      { role: 'buyer', price: 23500, time: '02 Sep 2026, 10:20', note: 'Pengajuan harga Rp 23.500/Kg (-9.6%) untuk volume 300 Kg' },
      { role: 'seller', price: 24500, time: '02 Sep 2026, 14:45', note: 'Tawaran balasan supplier Rp 24.500/Kg (-5.7%)' }
    ]
  },
  {
    id: 'NEG-2026-014',
    buyerId: 'usr_05',
    buyerName: 'Sentra Jagung Grobogan Abadi',
    sellerId: 'usr_01',
    sellerName: 'UD Tani Makmur Sejahtera',
    productId: 'prd_01',
    productName: 'Beras Mentik Wangi Organik',
    productUnit: 'Kg',
    productImage: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
    quantity: 1500,
    initialPrice: 14500,
    offerPrice: 13200,
    counterPrice: null,
    status: 'Menunggu',
    buyerNote: 'Pembelian partai besar 1.5 Ton untuk program sembako kemitraan desa. Mohon harga khusus Gapoktan.',
    sellerNote: '',
    createdAt: '2026-09-03 07:45',
    updatedAt: '2026-09-03 07:45',
    history: [
      { role: 'buyer', price: 13200, time: '03 Sep 2026, 07:45', note: 'Pengajuan penawaran harga Rp 13.200/Kg (-8.9%) untuk 1.500 Kg' }
    ]
  },
  {
    id: 'NEG-2026-012',
    buyerId: 'usr_01',
    buyerName: 'UD Tani Makmur Sejahtera',
    sellerId: 'usr_02',
    sellerName: 'Koperasi Kopi Rancabali Makmur',
    productId: 'prd_02',
    productName: 'Kopi Arabika Ciwidey Honey Process',
    productUnit: 'Kg',
    productImage: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80',
    quantity: 100,
    initialPrice: 98000,
    offerPrice: 90000,
    counterPrice: null,
    status: 'Disetujui',
    buyerNote: 'Penawaran untuk pasokan berkala kedai kopi sentra agribisnis Cianjur.',
    sellerNote: 'Penawaran disetujui! Silakan lanjutkan ke pembuatan Purchase Order (PO) agar tim gudang segera memproses pesanan.',
    createdAt: '2026-08-30 11:00',
    updatedAt: '2026-08-31 09:15',
    history: [
      { role: 'buyer', price: 90000, time: '30 Agu 2026, 11:00', note: 'Pengajuan penawaran Rp 90.000/Kg (-8.1%) untuk 100 Kg' },
      { role: 'seller', price: 90000, time: '31 Agu 2026, 09:15', note: 'Supplier menyetujui penawaran harga Rp 90.000/Kg' }
    ]
  },
  {
    id: 'NEG-2026-010',
    buyerId: 'usr_06',
    buyerName: 'Tani Bawang Berkah Brebes',
    sellerId: 'usr_01',
    sellerName: 'UD Tani Makmur Sejahtera',
    productId: 'prd_06',
    productName: 'Pupuk Kompos Bio-Organik Granul',
    productUnit: 'Kg',
    productImage: 'https://images.unsplash.com/photo-1592417817098-8f3d69106093?auto=format&fit=crop&w=600&q=80',
    quantity: 500,
    initialPrice: 4500,
    offerPrice: 3000,
    counterPrice: null,
    status: 'Ditolak',
    buyerNote: 'Tawaran Rp 3.000/Kg untuk uji coba demplot 1 hektar bawang merah.',
    sellerNote: 'Mohon maaf penawaran belum dapat kami terima karena Rp 3.000 berada di bawah biaya HPP fermentasi bio-organik.',
    createdAt: '2026-08-27 13:20',
    updatedAt: '2026-08-27 16:00',
    history: [
      { role: 'buyer', price: 3000, time: '27 Agu 2026, 13:20', note: 'Pengajuan penawaran harga Rp 3.000/Kg (-33%)' },
      { role: 'seller', price: null, time: '27 Agu 2026, 16:00', note: 'Penawaran ditolak oleh penjual karena di bawah biaya produksi' }
    ]
  }
];

const INITIAL_CONVERSATIONS = [
  {
    id: 'conv_01',
    participantIds: ['usr_01', 'usr_02'],
    partner: {
      id: 'usr_02',
      name: 'Asep Sudrajat',
      businessName: 'Koperasi Kopi Rancabali Makmur',
      role: 'supplier',
      location: 'Desa Patengan, Rancabali, Kab. Bandung',
      avatarInitial: 'KR',
      phone: '081398765432',
      isOnline: true,
      lastSeen: 'Online'
    },
    productRef: {
      id: 'prd_02',
      name: 'Kopi Arabika Ciwidey Honey Process',
      price: 98000,
      unit: 'Kg',
      minOrder: 20,
      imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80',
      orderId: 'ORD-2026-089'
    },
    lastMessage: 'Baik Pak Budi, 150 Kg kopi sortasi grade 1 sudah disiapkan sesuai PO #ORD-2026-089.',
    lastMessageTime: '09:45',
    unreadCount: 0,
    updatedAt: '2026-09-02 09:45',
    messages: [
      {
        id: 'msg_01_1',
        senderId: 'usr_01',
        senderName: 'Budi Santoso',
        text: 'Selamat pagi Pak Asep. Kami baru saja menerbitkan Purchase Order #ORD-2026-089 untuk 150 Kg Kopi Arabika Ciwidey Honey Process.',
        time: '09:32',
        date: '02 Sep 2026',
        status: 'read'
      },
      {
        id: 'msg_01_2',
        senderId: 'usr_01',
        senderName: 'Budi Santoso',
        text: 'Mohon pastikan kadar air di bawah 12% dan sertakan hasil cupping test SCA saat pengiriman ya Pak.',
        time: '09:35',
        date: '02 Sep 2026',
        status: 'read'
      },
      {
        id: 'msg_01_3',
        senderId: 'usr_02',
        senderName: 'Asep Sudrajat',
        text: 'Pagi Pak Budi. PO sudah kami terima dan statusnya kami ubah ke Diproses. Kadar air kami jaga di 11.4% dengan zero defect fisik.',
        time: '09:42',
        date: '02 Sep 2026',
        status: 'read'
      },
      {
        id: 'msg_01_4',
        senderId: 'usr_02',
        senderName: 'Asep Sudrajat',
        text: 'Baik Pak Budi, 150 Kg kopi sortasi grade 1 sudah disiapkan sesuai PO #ORD-2026-089.',
        time: '09:45',
        date: '02 Sep 2026',
        status: 'read'
      }
    ]
  },
  {
    id: 'conv_02',
    participantIds: ['usr_01', 'usr_03'],
    partner: {
      id: 'usr_03',
      name: 'Siti Maryam',
      businessName: 'KWT Giri Asri Lebak',
      role: 'supplier',
      location: 'Desa Sobang, Kab. Lebak',
      avatarInitial: 'GA',
      phone: '085712344321',
      isOnline: true,
      lastSeen: 'Online'
    },
    productRef: {
      id: 'prd_03',
      name: 'Gula Aren Organik Cetak Super',
      price: 26000,
      unit: 'Kg',
      minOrder: 50,
      imageUrl: 'https://images.unsplash.com/photo-1607672632458-9eb56696346b?auto=format&fit=crop&w=600&q=80',
      negId: 'NEG-2026-015'
    },
    lastMessage: 'Kami bisa kirimkan sampel 1 kg nira murni ke Cianjur hari ini untuk tes laboratorium mutu.',
    lastMessageTime: '14:50',
    unreadCount: 1,
    updatedAt: '2026-09-02 14:50',
    messages: [
      {
        id: 'msg_02_1',
        senderId: 'usr_01',
        senderName: 'Budi Santoso',
        text: 'Assalamu\'alaikum Bu Siti, terkait pengajuan negosiasi harga #NEG-2026-015 untuk 300 Kg gula aren organik cetak.',
        time: '10:25',
        date: '02 Sep 2026',
        status: 'read'
      },
      {
        id: 'msg_02_2',
        senderId: 'usr_03',
        senderName: 'Siti Maryam',
        text: 'Wa\'alaikumsalam Pak Budi. Tawaran balasan kami di Rp 24.500/kg karena saat ini nira aren murni dari pohon pegunungan Kendeng sedang masa awal sadap.',
        time: '14:46',
        date: '02 Sep 2026',
        status: 'read'
      },
      {
        id: 'msg_02_3',
        senderId: 'usr_03',
        senderName: 'Siti Maryam',
        text: 'Kami bisa kirimkan sampel 1 kg nira murni ke Cianjur hari ini untuk tes laboratorium mutu.',
        time: '14:50',
        date: '02 Sep 2026',
        status: 'delivered'
      }
    ]
  },
  {
    id: 'conv_03',
    participantIds: ['usr_01', 'usr_04'],
    partner: {
      id: 'usr_04',
      name: 'Dedi Kurniawan',
      businessName: 'Gapoktan Harapan Tani Sukabumi',
      role: 'buyer',
      location: 'Desa Kadudampit, Kab. Sukabumi',
      avatarInitial: 'HT',
      phone: '082198877665',
      isOnline: false,
      lastSeen: '1 jam yang lalu'
    },
    productRef: {
      id: 'prd_06',
      name: 'Pupuk Kompos Bio-Organik Granul',
      price: 4500,
      unit: 'Kg',
      minOrder: 150,
      imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d69106093?auto=format&fit=crop&w=600&q=80',
      orderId: 'ORD-2026-088'
    },
    lastMessage: 'Armada truk logistik pupuk 2 ton sudah jalan dari Pacet menuju Kadudampit Pak Dedi.',
    lastMessageTime: '10:05',
    unreadCount: 0,
    updatedAt: '2026-09-02 10:05',
    messages: [
      {
        id: 'msg_03_1',
        senderId: 'usr_04',
        senderName: 'Dedi Kurniawan',
        text: 'Halo Pak Budi (UD Tani Makmur), bagaimana kesiapan pasokan pupuk bio-organik pesanan PO #ORD-2026-088?',
        time: '09:10',
        date: '02 Sep 2026',
        status: 'read'
      },
      {
        id: 'msg_03_2',
        senderId: 'usr_01',
        senderName: 'Budi Santoso',
        text: 'Siap Pak Dedi, 2.000 Kg granul bio-organik sudah dimuat dan ditimbang akurat di gudang Pacet.',
        time: '09:40',
        date: '02 Sep 2026',
        status: 'read'
      },
      {
        id: 'msg_03_3',
        senderId: 'usr_01',
        senderName: 'Budi Santoso',
        text: 'Armada truk logistik pupuk 2 ton sudah jalan dari Pacet menuju Kadudampit Pak Dedi.',
        time: '10:05',
        date: '02 Sep 2026',
        status: 'read'
      }
    ]
  },
  {
    id: 'conv_04',
    participantIds: ['usr_01', 'usr_05'],
    partner: {
      id: 'usr_05',
      name: 'Hadi Sutrisno',
      businessName: 'Sentra Jagung Grobogan Abadi',
      role: 'buyer',
      location: 'Desa Toroh, Kab. Grobogan',
      avatarInitial: 'SJ',
      phone: '081255443322',
      isOnline: false,
      lastSeen: '3 jam yang lalu'
    },
    productRef: {
      id: 'prd_01',
      name: 'Beras Mentik Wangi Organik',
      price: 14500,
      unit: 'Kg',
      minOrder: 100,
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
      negId: 'NEG-2026-014'
    },
    lastMessage: 'Apakah karung kemasannya bisa disablon logo Gapoktan bersama Pak?',
    lastMessageTime: '08:00',
    unreadCount: 1,
    updatedAt: '2026-09-03 08:00',
    messages: [
      {
        id: 'msg_04_1',
        senderId: 'usr_05',
        senderName: 'Hadi Sutrisno',
        text: 'Salam Pak Budi, kami berminat ambil pasokan 1.5 Ton Beras Mentik Wangi Organik untuk paket kemitraan daerah di Grobogan.',
        time: '07:50',
        date: '03 Sep 2026',
        status: 'read'
      },
      {
        id: 'msg_04_2',
        senderId: 'usr_05',
        senderName: 'Hadi Sutrisno',
        text: 'Apakah karung kemasannya bisa disablon logo Gapoktan bersama Pak?',
        time: '08:00',
        date: '03 Sep 2026',
        status: 'delivered'
      }
    ]
  }
];

const INITIAL_TRANSACTIONS = [
  {
    id: 'TRX-2026-085',
    orderId: 'ORD-2026-085',
    buyerId: 'usr_01',
    buyerName: 'UD Tani Makmur Sejahtera',
    buyerContact: 'Budi Santoso (081234567890)',
    buyerAddress: 'Jl. Raya Sukamaju No. 45, RT 02/RW 04, Pacet, Cianjur',
    sellerId: 'usr_04',
    sellerName: 'Gapoktan Harapan Tani Sukabumi',
    sellerContact: 'Dedi Kurniawan (082198877665)',
    sellerLocation: 'Desa Kadudampit, Kab. Sukabumi',
    productId: 'prd_04',
    productName: 'Cabai Merah Keriting Segar Panen',
    productUnit: 'Kg',
    productImage: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=600&q=80',
    quantity: 200,
    unitPrice: 32000,
    subtotal: 6400000,
    shippingCost: 200000,
    totalAmount: 6600000,
    status: 'Selesai / Lunas',
    paymentMethod: 'Transfer Bank BJB Agribisnis',
    invoiceNumber: 'INV-DBZ-20260826-085',
    date: '26 Agu 2026, 15:45',
    createdAt: '2026-08-26 15:45',
    notes: 'Komoditas diterima lengkap dan sesuai standar mutu SNI.'
  },
  {
    id: 'TRX-2026-088',
    orderId: 'ORD-2026-088',
    buyerId: 'usr_04',
    buyerName: 'Gapoktan Harapan Tani Sukabumi',
    buyerContact: 'Dedi Kurniawan (082198877665)',
    buyerAddress: 'Jl. Raya Salabintana KM 9, Kadudampit, Sukabumi',
    sellerId: 'usr_01',
    sellerName: 'UD Tani Makmur Sejahtera',
    sellerContact: 'Budi Santoso (081234567890)',
    sellerLocation: 'Desa Sukamaju, Pacet, Kab. Cianjur',
    productId: 'prd_06',
    productName: 'Pupuk Kompos Bio-Organik Granul',
    productUnit: 'Karung (50kg)',
    productImage: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&w=600&q=80',
    quantity: 20,
    unitPrice: 35000,
    subtotal: 700000,
    shippingCost: 150000,
    totalAmount: 850000,
    status: 'Dibayar / Lunas',
    paymentMethod: 'Termin DP 50% + Pelunasan Transfer',
    invoiceNumber: 'INV-DBZ-20260902-088',
    date: '02 Sep 2026, 10:00',
    createdAt: '2026-09-02 10:00',
    notes: 'Pembayaran telah diverifikasi bendahara Gapoktan.'
  },
  {
    id: 'TRX-2026-089',
    orderId: 'ORD-2026-089',
    buyerId: 'usr_01',
    buyerName: 'UD Tani Makmur Sejahtera',
    buyerContact: 'Budi Santoso (081234567890)',
    buyerAddress: 'Jl. Raya Sukamaju No. 45, RT 02/RW 04, Pacet, Cianjur',
    sellerId: 'usr_02',
    sellerName: 'Koperasi Kopi Rancabali Makmur',
    sellerContact: 'Asep Sudrajat (081398765432)',
    sellerLocation: 'Desa Patengan, Rancabali, Kab. Bandung',
    productId: 'prd_02',
    productName: 'Kopi Arabika Ciwidey Honey Process',
    productUnit: 'Kg',
    productImage: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80',
    quantity: 150,
    unitPrice: 98000,
    subtotal: 14700000,
    shippingCost: 350000,
    totalAmount: 15050000,
    status: 'Menunggu Pembayaran',
    paymentMethod: 'Tempo 14 Hari (Invoice B2B)',
    invoiceNumber: 'INV-DBZ-20260902-089',
    date: '02 Sep 2026, 11:15',
    createdAt: '2026-09-02 11:15',
    notes: 'Jatuh tempo pembayaran tanggal 16 September 2026.'
  },
  {
    id: 'TRX-2026-090',
    orderId: 'ORD-2026-090',
    buyerId: 'usr_03',
    buyerName: 'KWT Giri Asri Lebak',
    buyerContact: 'Siti Maryam (085712344321)',
    buyerAddress: 'Kampung Pasir Awi RT 01/RW 02, Sobang, Lebak, Banten',
    sellerId: 'usr_01',
    sellerName: 'UD Tani Makmur Sejahtera',
    sellerContact: 'Budi Santoso (081234567890)',
    sellerLocation: 'Desa Sukamaju, Pacet, Kab. Cianjur',
    productId: 'prd_01',
    productName: 'Beras Mentik Wangi Organik',
    productUnit: 'Kg',
    productImage: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
    quantity: 500,
    unitPrice: 14500,
    subtotal: 7250000,
    shippingCost: 250000,
    totalAmount: 7500000,
    status: 'Menunggu Pembayaran',
    paymentMethod: 'Transfer Bank BRI Desa',
    invoiceNumber: 'INV-DBZ-20260903-090',
    date: '03 Sep 2026, 08:15',
    createdAt: '2026-09-03 08:15',
    notes: 'Menunggu bukti transfer pelunasan dari bendahara KWT.'
  },
  {
    id: 'TRX-2026-079',
    orderId: 'ORD-2026-079',
    buyerId: 'usr_05',
    buyerName: 'Sentra Jagung Grobogan Abadi',
    buyerContact: 'Hadi Sutrisno (081255443322)',
    buyerAddress: 'Desa Toroh, Kab. Grobogan',
    sellerId: 'usr_01',
    sellerName: 'UD Tani Makmur Sejahtera',
    sellerContact: 'Budi Santoso (081234567890)',
    sellerLocation: 'Desa Sukamaju, Pacet, Kab. Cianjur',
    productId: 'prd_01',
    productName: 'Beras Mentik Wangi Organik',
    productUnit: 'Kg',
    productImage: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
    quantity: 1200,
    unitPrice: 14500,
    subtotal: 17400000,
    shippingCost: 500000,
    totalAmount: 17900000,
    status: 'Selesai / Lunas',
    paymentMethod: 'Transfer Bank Mandiri',
    invoiceNumber: 'INV-DBZ-20260820-079',
    date: '20 Agu 2026, 14:00',
    createdAt: '2026-08-20 14:00',
    notes: 'Penyaluran beras organik kemitraan B2B Grobogan.'
  },
  {
    id: 'TRX-2026-072',
    orderId: 'ORD-2026-072',
    buyerId: 'usr_01',
    buyerName: 'UD Tani Makmur Sejahtera',
    buyerContact: 'Budi Santoso (081234567890)',
    buyerAddress: 'Jl. Raya Sukamaju No. 45, Pacet, Cianjur',
    sellerId: 'usr_06',
    sellerName: 'Tani Bawang Berkah Brebes',
    sellerContact: 'H. Slamet Riyadi (081912345678)',
    sellerLocation: 'Desa Larangan, Brebes',
    productId: 'prd_07',
    productName: 'Bawang Merah Brebes Super Sortir',
    productUnit: 'Kg',
    productImage: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80',
    quantity: 300,
    unitPrice: 28000,
    subtotal: 8400000,
    shippingCost: 300000,
    totalAmount: 8700000,
    status: 'Selesai / Lunas',
    paymentMethod: 'Transfer Bank BJB Agribisnis',
    invoiceNumber: 'INV-DBZ-20260812-072',
    date: '12 Agu 2026, 16:30',
    createdAt: '2026-08-12 16:30',
    notes: 'Bawang merah varietas bima brebes grade super.'
  }
];

const INITIAL_STOCK_LOGS = [
  {
    id: 'log_01',
    productId: 'prd_01',
    productName: 'Beras Mentik Wangi Organik',
    type: 'in', // 'in', 'out', 'adjustment', 'order', 'order_cancel'
    typeLabel: 'Stok Masuk',
    quantity: 4000,
    stockBefore: 4500,
    stockAfter: 8500,
    unit: 'Kg',
    reason: 'Panen Raya Gabah Organik Sawah Pacet Blok A',
    operator: 'Budi Santoso',
    date: '28 Agu 2026, 09:30'
  },
  {
    id: 'log_02',
    productId: 'prd_06',
    productName: 'Pupuk Kompos Organik Granul',
    type: 'in',
    typeLabel: 'Stok Masuk',
    quantity: 600,
    stockBefore: 0,
    stockAfter: 600,
    unit: 'Karung (50kg)',
    reason: 'Selesai Siklus Fermentasi Bio-Kompos Rumah Produksi Pacet',
    operator: 'Budi Santoso',
    date: '25 Agu 2026, 14:15'
  },
  {
    id: 'log_03',
    productId: 'prd_01',
    productName: 'Beras Mentik Wangi Organik',
    type: 'out',
    typeLabel: 'Stok Keluar',
    quantity: 1200,
    stockBefore: 9700,
    stockAfter: 8500,
    unit: 'Kg',
    reason: 'Pengiriman Pesanan PO #ORD-2026-079 (Sentra Jagung Grobogan)',
    operator: 'Sistem Logistik',
    date: '20 Agu 2026, 15:00'
  },
  {
    id: 'log_04',
    productId: 'prd_06',
    productName: 'Pupuk Kompos Organik Granul',
    type: 'order',
    typeLabel: 'Terpotong Pesanan',
    quantity: 20,
    stockBefore: 620,
    stockAfter: 600,
    unit: 'Karung (50kg)',
    reason: 'Alokasi Pengiriman PO #ORD-2026-088 (Gapoktan Harapan Tani)',
    operator: 'Sistem Otomatis',
    date: '01 Sep 2026, 16:30'
  },
  {
    id: 'log_05',
    productId: 'prd_01',
    productName: 'Beras Mentik Wangi Organik',
    type: 'adjustment',
    typeLabel: 'Penyesuaian Opname',
    quantity: -50,
    stockBefore: 8550,
    stockAfter: 8500,
    unit: 'Kg',
    reason: 'Penyusutan Alami Kadar Air & Sortir Ulang Karung Goni',
    operator: 'Budi Santoso',
    date: '02 Sep 2026, 16:45'
  }
];

class AppState {
  constructor() {
    // Initialize LocalStorage users and session
    this.initStorage();

    const storedSession = this.getStoredSession();
    // Normalisasi sesi lama agar selalu memiliki accountRole (UMKM/ADMIN) & status aktif
    let currentUser = storedSession || DEMO_USER;
    if (currentUser && (!currentUser.accountRole || typeof currentUser.isActive !== 'boolean')) {
      const fresh = this.getStoredUsers().find(u => u.id === currentUser.id);
      currentUser = {
        ...currentUser,
        accountRole: fresh ? fresh.accountRole : (currentUser.accountRole || 'UMKM'),
        isActive: fresh ? fresh.isActive : (typeof currentUser.isActive === 'boolean' ? currentUser.isActive : true),
        joinedAt: currentUser.joinedAt || (fresh && fresh.joinedAt) || '2025-01-15'
      };
      try {
        localStorage.setItem('desabiz_session', JSON.stringify(currentUser));
      } catch (e) {}
    }
    const isAuthenticated = storedSession ? true : true; // Default logged in as demo for instant experience, fully toggleable via logout
    const products = this.getStoredProducts();
    const suppliers = this.getStoredSuppliers();
    const orders = this.getStoredOrders();
    const negotiations = this.getStoredNegotiations();
    const conversations = this.getStoredConversations();
    const transactions = this.getStoredTransactions();
    const stockLogs = this.getStoredStockLogs();

    const pesananMasuk = orders.filter(o => o.sellerId === currentUser.id && o.status !== 'Dibatalkan').length;
    const pesananKeluar = orders.filter(o => o.buyerId === currentUser.id && o.status !== 'Dibatalkan').length;

    // Hitung total transaksi berhasil / lunas
    const totalTrxNominal = transactions
      .filter(t => t.status === 'Selesai / Lunas' || t.status === 'Dibayar / Lunas')
      .reduce((acc, t) => acc + (t.totalAmount || 0), 0);

    // Hitung stok menipis (stock <= 1000 atau safety threshold)
    const lowStockCount = products.filter(p => {
      const threshold = p.minOrder * 2 > 1000 ? p.minOrder * 2 : 1000;
      return p.stock > 0 && p.stock <= threshold;
    }).length;

    this.state = {
      isAuthenticated: isAuthenticated,
      user: currentUser,
      currentRoute: 'dashboard',
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      notificationDropdownOpen: false,
      products: products,
      suppliers: suppliers,
      orders: orders,
      negotiations: negotiations,
      conversations: conversations,
      transactions: transactions,
      stockLogs: stockLogs,

      // 5 Statistik Utama Dashboard (PRD Requirement)
      stats: {
        totalProduk: products.length,
        pesananMasuk: pesananMasuk,
        pesananKeluar: pesananKeluar,
        totalTransaksi: `Rp ${(totalTrxNominal || 48500000).toLocaleString('id-ID')}`,
        totalTransaksiNumeric: totalTrxNominal || 48500000,
        stokMenipis: lowStockCount,
      },

      // Data Grafik Penjualan Sederhana (SVG Chart)
      salesChart: {
        activePeriod: '7d',
        periods: {
          '7d': {
            labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
            values: [4200000, 5800000, 3900000, 7500000, 8900000, 11200000, 7000000],
            total: 'Rp 48.500.000',
            growth: '+18.4%',
            avgDaily: 'Rp 6.928.000'
          },
          '30d': {
            labels: ['Mgg 1', 'Mgg 2', 'Mgg 3', 'Mgg 4'],
            values: [28500000, 36200000, 42100000, 48500000],
            total: 'Rp 155.300.000',
            growth: '+24.6%',
            avgDaily: 'Rp 5.176.000'
          }
        }
      },

      // Daftar Pesanan Terbaru
      recentOrders: [
        {
          id: 'ORD-2026-089',
          partnerName: 'Koperasi Tani Mekar Jaya',
          partnerType: 'Supplier Desa',
          partnerLocation: 'Cianjur',
          commodity: 'Beras Mentik Wangi Organik',
          volume: '2.5 Ton',
          amount: 'Rp 32.500.000',
          date: '03 Sep 2026, 08:30',
          status: 'Diproses',
          statusBadge: 'badge-info',
          type: 'Keluar'
        },
        {
          id: 'ORD-2026-088',
          partnerName: 'Toko Berkah Grosir',
          partnerType: 'Pembeli B2B',
          partnerLocation: 'Bandung',
          commodity: 'Kopi Arabika Ciwidey Grade A',
          volume: '500 Kg',
          amount: 'Rp 12.000.000',
          date: '02 Sep 2026, 16:15',
          status: 'Dikirim',
          statusBadge: 'badge-primary',
          type: 'Masuk'
        },
        {
          id: 'ORD-2026-087',
          partnerName: 'CV Sumber Pangan Alami',
          partnerType: 'Pembeli B2B',
          partnerLocation: 'Jakarta',
          commodity: 'Gula Aren Organik Cetak',
          volume: '800 Kg',
          amount: 'Rp 9.600.000',
          date: '01 Sep 2026, 11:20',
          status: 'Selesai',
          statusBadge: 'badge-success',
          type: 'Masuk'
        },
        {
          id: 'ORD-2026-086',
          partnerName: 'Gapoktan Harapan Makmur',
          partnerType: 'Supplier Desa',
          partnerLocation: 'Sukabumi',
          commodity: 'Cabai Merah Keriting Segar',
          volume: '1.2 Ton',
          amount: 'Rp 28.800.000',
          date: '31 Agu 2026, 14:00',
          status: 'Negosiasi',
          statusBadge: 'badge-accent',
          type: 'Keluar'
        },
        {
          id: 'ORD-2026-085',
          partnerName: 'Resto Sunda Raos Pisan',
          partnerType: 'Pembeli B2B',
          partnerLocation: 'Bogor',
          commodity: 'Ikan Nila Kolam Alami',
          volume: '350 Kg',
          amount: 'Rp 10.500.000',
          date: '30 Agu 2026, 09:45',
          status: 'Selesai',
          statusBadge: 'badge-success',
          type: 'Masuk'
        }
      ],

      // Daftar Notifikasi
      notifications: [
        {
          id: 'notif-1',
          type: 'order',
          title: 'Pesanan Masuk Baru',
          message: 'Toko Berkah Grosir memesan 500 Kg Kopi Arabika Ciwidey.',
          time: '15 menit yang lalu',
          read: false,
          link: '#/pesanan'
        },
        {
          id: 'notif-2',
          type: 'negotiation',
          title: 'Tawaran Harga Diterima',
          message: 'Gapoktan Sukabumi menyetujui tawaran negosiasi Cabai Merah Rp 24.000/Kg.',
          time: '1 jam yang lalu',
          read: false,
          link: '#/negosiasi'
        },
        {
          id: 'notif-3',
          type: 'stock',
          title: 'Peringatan Stok Menipis',
          message: 'Stok Gula Aren tersisa 120 Kg (di bawah batas aman 200 Kg).',
          time: '3 jam yang lalu',
          read: false,
          link: '#/stok'
        },
        {
          id: 'notif-4',
          type: 'ai',
          title: 'Saran AI DesaBiz',
          message: 'Harga pasokan pupuk organik diprediksi turun 5% minggu depan.',
          time: '1 hari yang lalu',
          read: true,
          link: '#/dashboard'
        }
      ],

      aiActiveStatus: true
    };

    this.listeners = [];
  }

  // ==========================================
  // AUTHENTICATION & LOCALSTORAGE PERSISTENCE
  // ==========================================
  initStorage() {
    try {
      if (!localStorage.getItem('desabiz_users')) {
        localStorage.setItem('desabiz_users', JSON.stringify([DEMO_USER]));
      }
      this.migrateAccounts();
      if (!localStorage.getItem('desabiz_session')) {
        localStorage.setItem('desabiz_session', JSON.stringify(DEMO_USER));
      }
      if (!localStorage.getItem('desabiz_products')) {
        localStorage.setItem('desabiz_products', JSON.stringify(INITIAL_PRODUCTS));
      }
      if (!localStorage.getItem('desabiz_suppliers')) {
        localStorage.setItem('desabiz_suppliers', JSON.stringify(INITIAL_SUPPLIERS));
      }
      if (!localStorage.getItem('desabiz_orders')) {
        localStorage.setItem('desabiz_orders', JSON.stringify(INITIAL_ORDERS));
      }
      if (!localStorage.getItem('desabiz_negotiations')) {
        localStorage.setItem('desabiz_negotiations', JSON.stringify(INITIAL_NEGOTIATIONS));
      }
      if (!localStorage.getItem('desabiz_conversations')) {
        localStorage.setItem('desabiz_conversations', JSON.stringify(INITIAL_CONVERSATIONS));
      }
      if (!localStorage.getItem('desabiz_transactions')) {
        localStorage.setItem('desabiz_transactions', JSON.stringify(INITIAL_TRANSACTIONS));
      }
      if (!localStorage.getItem('desabiz_stock_logs')) {
        localStorage.setItem('desabiz_stock_logs', JSON.stringify(INITIAL_STOCK_LOGS));
      }
      if (!localStorage.getItem('desabiz_categories')) {
        localStorage.setItem('desabiz_categories', JSON.stringify(DEFAULT_CATEGORIES));
      }
      if (!localStorage.getItem('desabiz_activity_logs')) {
        localStorage.setItem('desabiz_activity_logs', JSON.stringify(this.buildSeedActivityLogs()));
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }

  /**
   * Migrasi & pelengkapan akun agar konsisten dengan role UMKM/ADMIN:
   * - memastikan akun Administrator selalu tersedia,
   * - menambahkan akun UMKM untuk setiap supplier terverifikasi (relasi data
   *   transaksi/pesanan menunjuk sellerId usr_02..usr_07),
   * - melengkapi field accountRole / isActive / joinedAt pada data lama.
   */
  migrateAccounts() {
    try {
      let users = this.getStoredUsers();

      // 1. Lengkapi field role & status pada data lama (backwards compatible)
      users = users.map(u => ({
        ...u,
        accountRole: u.accountRole === 'ADMIN' ? 'ADMIN' : 'UMKM',
        isActive: typeof u.isActive === 'boolean' ? u.isActive : true,
        joinedAt: u.joinedAt || '2025-01-15'
      }));

      // 2. Pastikan akun admin tersedia
      if (!users.some(u => u.accountRole === 'ADMIN')) {
        users.push(DEMO_ADMIN);
      }

      // 3. Akun UMKM untuk supplier agar relasi buyer/seller pada transaksi valid
      const supplierAccounts = INITIAL_SUPPLIERS
        .filter(s => s.sellerId && s.sellerId !== DEMO_USER.id)
        .map(s => ({
          id: s.sellerId,
          ownerName: s.ownerName,
          businessName: s.businessName,
          email: s.email,
          phone: s.phone,
          address: s.address,
          village: s.village,
          district: s.district,
          regency: s.regency,
          businessType: s.businessType,
          description: s.description,
          avatarInitial: s.avatarInitial,
          role: 'seller',
          accountRole: 'UMKM',
          isActive: true,
          joinedAt: '2025-01-15',
          isVerified: s.isVerified,
          verificationBadge: s.verificationBadge,
          membership: `Mitra ${s.businessType}`,
          supplierId: s.id,
          password: 'password123'
        }));

      supplierAccounts.forEach(acc => {
        if (!users.some(u => u.id === acc.id)) users.push(acc);
      });

      localStorage.setItem('desabiz_users', JSON.stringify(users));
    } catch (e) {
      console.warn('Account migration error:', e);
    }
  }

  /** Log aktivitas awal (dipakai Panel Admin sebagai riwayat sistem). */
  buildSeedActivityLogs() {
    const orders = this.getStoredOrders();
    const transactions = this.getStoredTransactions();
    const logs = [];

    orders.slice(0, 5).forEach(o => {
      logs.push({
        id: 'act_order_' + o.id,
        type: 'order',
        title: `PO ${o.id} — ${o.status}`,
        desc: `${o.buyerName} memesan ${o.productName} (${o.quantity} ${o.productUnit})`,
        time: o.createdAt || o.updatedAt || '-',
        at: o.createdAt || ''
      });
    });

    transactions.slice(0, 5).forEach(t => {
      logs.push({
        id: 'act_trx_' + t.id,
        type: 'transaction',
        title: `Transaksi ${t.id} — ${t.status}`,
        desc: `Nilai Rp ${(t.totalAmount || 0).toLocaleString('id-ID')} • ${t.paymentMethod}`,
        time: t.createdAt || '-',
        at: t.createdAt || ''
      });
    });

    return logs.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 12);
  }

  getStoredSession() {
    try {
      const data = localStorage.getItem('desabiz_session');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  getStoredUsers() {
    try {
      const data = localStorage.getItem('desabiz_users');
      return data ? JSON.parse(data) : [DEMO_USER];
    } catch (e) {
      return [DEMO_USER];
    }
  }

  getStoredProducts() {
    try {
      const data = localStorage.getItem('desabiz_products');
      return data ? JSON.parse(data) : INITIAL_PRODUCTS;
    } catch (e) {
      return INITIAL_PRODUCTS;
    }
  }

  getStoredSuppliers() {
    try {
      const data = localStorage.getItem('desabiz_suppliers');
      return data ? JSON.parse(data) : INITIAL_SUPPLIERS;
    } catch (e) {
      return INITIAL_SUPPLIERS;
    }
  }

  getStoredOrders() {
    try {
      const data = localStorage.getItem('desabiz_orders');
      return data ? JSON.parse(data) : INITIAL_ORDERS;
    } catch (e) {
      return INITIAL_ORDERS;
    }
  }

  getStoredNegotiations() {
    try {
      const data = localStorage.getItem('desabiz_negotiations');
      return data ? JSON.parse(data) : INITIAL_NEGOTIATIONS;
    } catch (e) {
      return INITIAL_NEGOTIATIONS;
    }
  }

  getStoredConversations() {
    try {
      const data = localStorage.getItem('desabiz_conversations');
      return data ? JSON.parse(data) : INITIAL_CONVERSATIONS;
    } catch (e) {
      return INITIAL_CONVERSATIONS;
    }
  }

  getStoredTransactions() {
    try {
      const data = localStorage.getItem('desabiz_transactions');
      return data ? JSON.parse(data) : INITIAL_TRANSACTIONS;
    } catch (e) {
      return INITIAL_TRANSACTIONS;
    }
  }

  getStoredStockLogs() {
    try {
      const data = localStorage.getItem('desabiz_stock_logs');
      return data ? JSON.parse(data) : INITIAL_STOCK_LOGS;
    } catch (e) {
      return INITIAL_STOCK_LOGS;
    }
  }

  isAuthenticated() {
    return Boolean(this.state.isAuthenticated && this.state.user);
  }

  login(email, password) {
    const users = this.getStoredUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user) {
      return { success: false, message: 'Alamat email belum terdaftar di DesaBiz AI.' };
    }

    if (user.isActive === false) {
      return { success: false, message: 'Akun Anda sedang dinonaktifkan oleh Administrator DesaBiz AI. Silakan hubungi pengelola platform.' };
    }

    if (user.password !== password) {
      return { success: false, message: 'Kata sandi tidak sesuai. Silakan periksa kembali.' };
    }

    this.state.isAuthenticated = true;
    this.state.user = { ...user };
    try {
      localStorage.setItem('desabiz_session', JSON.stringify(this.state.user));
    } catch (e) {}

    this.logActivity({
      type: 'auth',
      title: `${user.accountRole === 'ADMIN' ? 'Administrator' : 'Pengguna UMKM'} masuk sistem`,
      desc: `${user.ownerName} (${user.email}) melakukan login.`,
      time: 'Baru saja'
    });

    this.notify();
    return { success: true, user: this.state.user };
  }

  register(userData) {
    const users = this.getStoredUsers();
    const exists = users.find(u => u.email.toLowerCase() === userData.email.toLowerCase().trim());

    if (exists) {
      return { success: false, message: 'Alamat email sudah digunakan oleh UMKM lain.' };
    }

    // Compute initials
    const initials = (userData.ownerName || 'UM')
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const newUser = {
      id: 'usr_' + Date.now().toString(36),
      ownerName: userData.ownerName.trim(),
      businessName: userData.businessName.trim(),
      email: userData.email.toLowerCase().trim(),
      phone: userData.phone.trim(),
      address: userData.address.trim(),
      village: userData.village.trim(),
      district: userData.district.trim(),
      regency: userData.regency.trim(),
      businessType: userData.businessType,
      description: userData.description.trim(),
      avatarInitial: initials,
      role: 'buyer', // Default mode
      accountRole: 'UMKM',
      isActive: true,
      joinedAt: new Date().toISOString().slice(0, 10),
      isVerified: false,
      verificationBadge: 'Pendaftaran Baru (Verifikasi 1x24 Jam)',
      membership: 'Anggota Baru DesaBiz AI',
      password: userData.password
    };

    users.push(newUser);
    try {
      localStorage.setItem('desabiz_users', JSON.stringify(users));
      localStorage.setItem('desabiz_session', JSON.stringify(newUser));
    } catch (e) {}

    this.state.isAuthenticated = true;
    this.state.user = newUser;

    this.logActivity({
      type: 'auth',
      title: 'Pendaftaran UMKM baru',
      desc: `${newUser.ownerName} mendaftar dengan usaha ${newUser.businessName}.`,
      time: 'Baru saja'
    });

    // === TRIGGER NOTIFIKASI WHATSAPP: Pendaftar Baru ===
    // Kirim notifikasi ke admin tentang pengguna baru yang terdaftar.
    // Berjalan async & non-blocking: kegagalan WhatsApp tidak memblokir registrasi.
    this.waTriggerNewRegistration(newUser.ownerName, newUser.email, newUser.phone);
    // ===============================================

    this.notify();

    return { success: true, user: newUser };
  }

  logout() {
    this.state.isAuthenticated = false;
    this.state.user = null;
    try {
      localStorage.removeItem('desabiz_session');
    } catch (e) {}
    this.notify();
  }

  updateProfile(updatedData) {
    if (!this.state.user) return { success: false, message: 'Tidak ada sesi aktif.' };

    const initials = (updatedData.ownerName || this.state.user.ownerName)
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const merged = {
      ...this.state.user,
      ...updatedData,
      avatarInitial: initials
    };

    this.state.user = merged;

    // Sync in storage
    const users = this.getStoredUsers().map(u => u.id === merged.id ? merged : u);
    try {
      localStorage.setItem('desabiz_users', JSON.stringify(users));
      localStorage.setItem('desabiz_session', JSON.stringify(merged));
    } catch (e) {}

    this.notify();
    return { success: true, user: merged };
  }

  // ==========================================
  // ADMIN: ROLE, PENGGUNA, KATEGORI, AKTIVITAS
  // ==========================================

  /** Apakah sesi aktif saat ini berperan sebagai Administrator (role ADMIN)? */
  isAdmin() {
    return Boolean(this.state.user && this.state.user.accountRole === 'ADMIN');
  }

  /** Seluruh akun pengguna platform (UMKM + ADMIN). */
  getUsers() {
    return this.getStoredUsers();
  }

  /** (De)aktivasi akun pengguna — hanya Administrator. */
  setUserActive(userId, isActive) {
    if (!this.isAdmin()) {
      return { success: false, message: 'Hanya Administrator yang dapat mengubah status akun.' };
    }
    if (userId === this.state.user?.id && !isActive) {
      return { success: false, message: 'Anda tidak dapat menonaktifkan akun yang sedang digunakan.' };
    }

    const users = this.getStoredUsers();
    const target = users.find(u => u.id === userId);
    if (!target) return { success: false, message: 'Akun tidak ditemukan.' };

    const next = users.map(u => (u.id === userId ? { ...u, isActive: Boolean(isActive) } : u));
    try {
      localStorage.setItem('desabiz_users', JSON.stringify(next));
    } catch (e) {}

    if (this.state.user && this.state.user.id === userId) {
      this.state.user = { ...this.state.user, isActive: Boolean(isActive) };
      try {
        localStorage.setItem('desabiz_session', JSON.stringify(this.state.user));
      } catch (e) {}
    }

    this.logActivity({
      type: 'user',
      title: isActive ? 'Akun pengguna diaktifkan' : 'Akun pengguna dinonaktifkan',
      desc: `${target.ownerName} (${target.email}) ${isActive ? 'diaktifkan' : 'dinonaktifkan'} oleh Administrator.`,
      time: 'Baru saja'
    });

    this.notify();
    return {
      success: true,
      message: `Akun ${target.ownerName} berhasil ${isActive ? 'diaktifkan' : 'dinonaktifkan'}.`
    };
  }

  /** Daftar kategori produk (dapat dikelola Administrator). */
  getCategories() {
    try {
      const data = localStorage.getItem('desabiz_categories');
      const parsed = data ? JSON.parse(data) : null;
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch (e) {}
    return [...DEFAULT_CATEGORIES];
  }

  persistCategories(categories) {
    try {
      localStorage.setItem('desabiz_categories', JSON.stringify(categories));
    } catch (e) {}
  }

  countProductsInCategory(name) {
    return (this.state.products || []).filter(p => p.category === name).length;
  }

  addCategory(name) {
    if (!this.isAdmin()) return { success: false, message: 'Hanya Administrator yang dapat mengelola kategori.' };
    const clean = String(name || '').trim().replace(/\s+/g, ' ');
    if (clean.length < 3) return { success: false, message: 'Nama kategori minimal 3 karakter.' };
    if (clean.length > 40) return { success: false, message: 'Nama kategori maksimal 40 karakter.' };

    const cats = this.getCategories();
    if (cats.some(c => c.toLowerCase() === clean.toLowerCase())) {
      return { success: false, message: 'Kategori tersebut sudah ada.' };
    }

    this.persistCategories([...cats, clean]);
    this.logActivity({
      type: 'category',
      title: 'Kategori produk ditambahkan',
      desc: `Kategori "${clean}" dibuat oleh Administrator.`,
      time: 'Baru saja'
    });
    this.notify();
    return { success: true, message: `Kategori "${clean}" berhasil ditambahkan.` };
  }

  renameCategory(oldName, newName) {
    if (!this.isAdmin()) return { success: false, message: 'Hanya Administrator yang dapat mengelola kategori.' };
    const clean = String(newName || '').trim().replace(/\s+/g, ' ');
    const cats = this.getCategories();
    if (!cats.includes(oldName)) return { success: false, message: 'Kategori asal tidak ditemukan.' };
    if (clean.length < 3 || clean.length > 40) return { success: false, message: 'Nama kategori harus 3–40 karakter.' };
    if (cats.some(c => c !== oldName && c.toLowerCase() === clean.toLowerCase())) {
      return { success: false, message: 'Nama kategori tersebut sudah dipakai.' };
    }
    if (clean === oldName) return { success: false, message: 'Nama kategori tidak berubah.' };

    this.persistCategories(cats.map(c => (c === oldName ? clean : c)));

    // Sinkronkan produk yang memakai kategori lama
    const products = (this.state.products || []).map(p => (p.category === oldName ? { ...p, category: clean } : p));
    this.state.products = products;
    try {
      localStorage.setItem('desabiz_products', JSON.stringify(products));
    } catch (e) {}

    this.logActivity({
      type: 'category',
      title: 'Kategori produk diubah',
      desc: `Kategori "${oldName}" diganti menjadi "${clean}".`,
      time: 'Baru saja'
    });
    this.notify();
    return { success: true, message: `Kategori berhasil diubah menjadi "${clean}".` };
  }

  deleteCategory(name) {
    if (!this.isAdmin()) return { success: false, message: 'Hanya Administrator yang dapat mengelola kategori.' };
    const cats = this.getCategories();
    if (!cats.includes(name)) return { success: false, message: 'Kategori tidak ditemukan.' };
    if (cats.length <= 1) return { success: false, message: 'Minimal harus tersisa satu kategori.' };

    const used = this.countProductsInCategory(name);
    if (used > 0) {
      return { success: false, message: `Kategori "${name}" masih dipakai ${used} produk. Pindahkan produk tersebut terlebih dahulu.` };
    }

    this.persistCategories(cats.filter(c => c !== name));
    this.logActivity({
      type: 'category',
      title: 'Kategori produk dihapus',
      desc: `Kategori "${name}" dihapus oleh Administrator.`,
      time: 'Baru saja'
    });
    this.notify();
    return { success: true, message: `Kategori "${name}" berhasil dihapus.` };
  }

  /** Catat aktivitas sistem (ditampilkan pada monitoring Panel Admin). */
  logActivity(entry) {
    try {
      const raw = localStorage.getItem('desabiz_activity_logs');
      const logs = raw ? JSON.parse(raw) : [];
      const item = {
        id: 'act_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        type: entry.type || 'system',
        title: entry.title || 'Aktivitas sistem',
        desc: entry.desc || '',
        time: entry.time || 'Baru saja',
        at: new Date().toISOString().slice(0, 16).replace('T', ' ')
      };
      logs.unshift(item);
      localStorage.setItem('desabiz_activity_logs', JSON.stringify(logs.slice(0, 60)));
    } catch (e) {}
  }

  getActivityLogs() {
    try {
      const raw = localStorage.getItem('desabiz_activity_logs');
      const logs = raw ? JSON.parse(raw) : [];
      return Array.isArray(logs) ? logs : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Monitoring aktivitas platform: gabungan log tersimpan (login, aksi admin,
   * PO, transaksi) dengan aktivitas terbaru dari stok & negosiasi.
   */
  getActivityFeed(limit = 14) {
    const MONTHS = { jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', jun: '06', jul: '07', agu: '08', sep: '09', okt: '10', nov: '11', des: '12' };
    // Format tanggal data aplikasi ("03 Sep 2026, 08:15") maupun ISO ("2026-09-03 08:15")
    const sortKey = (s) => {
      const str = String(s || '').toLowerCase();
      const id = str.match(/(\d{1,2})\s+([a-z]{3})[a-z]*\s+(\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?/);
      if (id) {
        return `${id[3]}-${MONTHS[id[2]] || '00'}-${id[1].padStart(2, '0')} ${String(id[4] || '0').padStart(2, '0')}:${id[5] || '00'}`;
      }
      const iso = str.match(/(\d{4})-(\d{2})-(\d{2})(?:[t\s]+(\d{2}):(\d{2}))?/);
      if (iso) return `${iso[1]}-${iso[2]}-${iso[3]} ${iso[4] || '00'}:${iso[5] || '00'}`;
      return '';
    };

    const entries = this.getActivityLogs().map(l => ({ ...l, _at: sortKey(l.at || l.time) }));

    (this.state.stockLogs || []).slice(0, 4).forEach(s => {
      entries.push({
        id: 'feed_stock_' + s.id,
        type: 'stock',
        title: `${s.typeLabel}: ${s.productName}`,
        desc: `${s.quantity} ${s.unit} — ${s.reason} (Oleh: ${s.operator})`,
        time: s.date,
        _at: sortKey(s.date)
      });
    });

    (this.state.negotiations || []).slice(0, 4).forEach(n => {
      entries.push({
        id: 'feed_neg_' + n.id,
        type: 'negotiation',
        title: `Negosiasi ${n.id} — ${n.status}`,
        desc: `${n.buyerName} ↔ ${n.sellerName} • ${n.productName}`,
        time: n.updatedAt || n.createdAt,
        _at: sortKey(n.updatedAt || n.createdAt)
      });
    });

    return entries
      .sort((a, b) => String(b._at || '').localeCompare(String(a._at || '')))
      .slice(0, limit);
  }

  /** Metrik ringkas untuk KPI Panel Admin. */
  getAdminStats() {
    const users = this.getUsers();
    const products = this.state.products || [];
    const transactions = this.state.transactions || [];
    const orders = this.state.orders || [];
    const categories = this.getCategories();

    const trxNominal = transactions.reduce((acc, t) => acc + (t.totalAmount || 0), 0);
    const pendingTrx = transactions.filter(t => t.status === 'Menunggu Pembayaran').length;
    const inactiveUsers = users.filter(u => u.isActive === false).length;

    return {
      totalPengguna: users.length,
      totalUmkM: users.filter(u => u.accountRole !== 'ADMIN').length,
      totalAdmin: users.filter(u => u.accountRole === 'ADMIN').length,
      totalProduk: products.length,
      totalTransaksi: transactions.length,
      totalTransaksiNominal: trxNominal,
      totalPesanan: orders.length,
      totalKategori: categories.length,
      penggunaNonAktif: inactiveUsers,
      transaksiTertunda: pendingTrx,
      stokMenipis: this.state.stats?.stokMenipis || 0
    };
  }

  // ==========================================
  // WHATSAPP NOTIFICATION PREFERENCES
  // ==========================================

  /** Mendapatkan preferensi notifikasi WhatsApp untuk pengguna saat ini. */
  waGetPrefs() {
    const userId = this.state.user?.id;
    if (!userId) return { events: {} };
    try {
      const raw = localStorage.getItem('desabiz_wa_prefs_' + userId);
      return raw ? JSON.parse(raw) : { events: {} };
    } catch (e) {
      return { events: {} };
    }
  }

  /** Menyimpan preferensi notifikasi WhatsApp untuk pengguna. */
  waSavePrefs(events) {
    const userId = this.state.user?.id;
    if (!userId) return { success: false, message: 'User tidak terautentikasi' };
    try {
      localStorage.setItem('desabiz_wa_prefs_' + userId, JSON.stringify(events));
      this.notify();
      return { success: true };
    } catch (e) {
      return { success: false, message: 'Gagal menyimpan preferensi' };
    }
  }

  /** Mengaktifkan/menonaktifkan kategori notifikasi WhatsApp. */
  waToggleEvent(eventKey) {
    const userId = this.state.user?.id;
    if (!userId) return { success: false, message: 'User tidak terautentikasi' };
    const current = this.waGetPrefs();
    current.events = current.events || {};
    current.events[eventKey] = !current.events[eventKey];
    return this.waSavePrefs(current.events);
  }

  /** Daftar event notifikasi yang tersedia. */
  waGetEventList() {
    return [
      { key: 'order_new', label: 'Pesanan Baru Masuk', description: 'Kepada penjual saat ada pesanan baru' },
      { key: 'order_status', label: 'Status Pesanan Berubah', description: 'Ketika status pesanan diupdate' },
      { key: 'negotiation_new', label: 'Negosiasi Harga Baru', description: 'Kepada penjual saat ada penawaran harga' },
      { key: 'stock_low', label: 'Stok Menipis', description: 'Kepada penjual saat stok bawah batas aman' },
      { key: 'transaction_status', label: 'Status Transaksi', description: 'Ketika transaksi status berubah' },
      { key: 'registration_new', label: 'Pendaftar Baru', description: 'Kepada admin saat ada pengguna baru terdaftar' }
    ];
  }

  /** ==========================================
  // NOTIFIKASI PENDAFTAR BARU (via WhatsApp)
  // ========================================== */
  /** Memicu notifikasi WhatsApp ke admin tentang pendaftar baru.
   *  Hanya akan terkirim jika admin memiliki preferensi 'registration_new' aktif.
   *  Menggunakan window.DesaBizWA.trigger (tidak butuh import ES6).
   */
  waTriggerNewRegistration(ownerName, email, phone = '') {
    const triggerData = {
      adminId: 'usr_admin', // Demo admin ID tetap
      ownerName: ownerName,
      email: email,
      phone: phone
    };
    // Panggil via window global function (sudah tersedia setelah DOMContentLoaded)
    if (window.DesaBizWA && typeof window.DesaBizWA.trigger === 'function') {
      window.DesaBizWA.trigger('registration_new', triggerData);
    } else {
      // Fallback: langsung POST ke endpoint proksi backend
      console.info('📲 [WhatsApp Fonnte] Trigger registrasi (fallback fetch): owner=', ownerName, 'email=', email);
      try {
        fetch('api/whatsapp.php?action=notify_registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'notify_registration', registration: triggerData })
        }).catch(() => {});
      } catch (e) { /* non-blocking */ }
    }
    return { status: 'info', message: 'Proses trigger notifikasi pendaftar baru' };
  }

  // ==========================================
  // PENGATURAN NOMOR WHATSAPP (Backend MySQL)
  // ==========================================
  // Setiap pengguna menentukan sendiri nomor WhatsApp penerima notifikasi.
  // Data tersimpan di tabel `users` (kolom wa_number & wa_notif_enabled).

  /** Ambil pengaturan WhatsApp pengguna dari backend (MySQL). */
  async waGetSettings(userId) {
    try {
      const res = await fetch(`api/user-settings.php?action=get&user_id=${encodeURIComponent(userId)}`);
      return await res.json();
    } catch (e) {
      return { status: 'error', found: false, wa_number: '', wa_notif_enabled: true };
    }
  }

  /** Simpan nomor WhatsApp + status aktif/nonaktif pengguna ke backend (MySQL). */
  async waSaveSettings(userId, payload) {
    try {
      const res = await fetch('api/user-settings.php?action=save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          user_id: userId,
          user: this.state.user || {},
          wa_number: payload.wa_number,
          wa_notif_enabled: payload.wa_notif_enabled
        })
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Gagal terhubung ke server.' };
    }
  }

  /** Uji kirim pesan WhatsApp ke nomor yang disimpan pengguna. */
  async waTestNotification(userId) {
    try {
      const res = await fetch('api/user-settings.php?action=test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', user_id: userId })
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Gagal terhubung ke server.' };
    }
  }

  // ==========================================
  // KONFIGURASI API KEY FONNTE (KHUSUS ADMIN)
  // ==========================================
  // Token hanya diproses di backend (tersimpan terenkripsi & dimasking).
  // Tidak pernah menyimpan token mentah di localStorage/JS.

  /** Status konfigurasi API key (token selalu dimasking oleh server). */
  async fonnteConfigStatus(userId) {
    try {
      const res = await fetch(`api/fonnte-config.php?action=status&user_id=${encodeURIComponent(userId)}`);
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Gagal terhubung ke server.' };
    }
  }

  /** Simpan / perbarui API key Fonnte (divalidasi & dienkripsi di server). */
  async fonnteConfigSave(userId, apiKey) {
    try {
      const res = await fetch('api/fonnte-config.php?action=save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', user_id: userId, api_key: apiKey })
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Gagal terhubung ke server.' };
    }
  }

  /** Tes koneksi Fonnte sungguhan (kirim pesan percobaan via cURL). */
  async fonnteConfigTest(userId) {
    try {
      const res = await fetch('api/fonnte-config.php?action=test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', user_id: userId })
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Gagal terhubung ke server.' };
    }
  }

  /** Hapus / nonaktifkan konfigurasi API key. */
  async fonnteConfigDelete(userId) {
    try {
      const res = await fetch('api/fonnte-config.php?action=delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', user_id: userId })
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Gagal terhubung ke server.' };
    }
  }

  // ==========================================
  // KONFIGURASI API KEY CHATBOT AI (KHUSUS ADMIN)
  // ==========================================
  // API key chatbot AI diproses sepenuhnya di backend (tersimpan terenkripsi
  // & selalu dimasking). TIDAK PERNAH disimpan di JS/localStorage dan tidak
  // pernah dikirim utuh ke frontend. Terpisah dari konfigurasi Fonnte.

  /** Status konfigurasi provider & API key chatbot AI (selalu dimasking). */
  async aiConfigStatus(userId) {
    try {
      const res = await fetch(`api/ai-config.php?action=status&user_id=${encodeURIComponent(userId)}`);
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Gagal terhubung ke server.' };
    }
  }

  /** Simpan/perbarui konfigurasi provider (provider, model, API key, status aktif). */
  async aiConfigSave(userId, payload) {
    try {
      const res = await fetch('api/ai-config.php?action=save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          user_id: userId,
          provider: payload.provider,
          model: payload.model,
          api_key: payload.api_key || '',
          is_active: !!payload.is_active,
          endpoint: payload.endpoint || ''
        })
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Gagal terhubung ke server.' };
    }
  }

  /** Tes koneksi sungguhan ke provider terpilih (chat percobaan via cURL). */
  async aiConfigTest(userId, payload) {
    try {
      const res = await fetch('api/ai-config.php?action=test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          user_id: userId,
          provider: payload.provider,
          api_key: payload.api_key || '',
          model: payload.model || '',
          endpoint: payload.endpoint || ''
        })
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Gagal terhubung ke server.' };
    }
  }

  /** Hapus konfigurasi provider (API key ikut dihapus dari database). */
  async aiConfigDelete(userId, provider) {
    try {
      const res = await fetch('api/ai-config.php?action=delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', user_id: userId, provider })
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Gagal terhubung ke server.' };
    }
  }

  // ==========================================
  // PENGATURAN NOTIFIKASI WHATSAPP (PER ROLE)
  // ==========================================

  /** Baca nomor, toggle, dan pilihan jenis notifikasi milik pengguna. */
  async notifPrefsGet(userId) {
    try {
      const mode = (this.state.user && this.state.user.role) || 'buyer';
      const res = await fetch(
        `api/notification-settings.php?action=get&user_id=${encodeURIComponent(userId)}&mode=${encodeURIComponent(mode)}`
      );
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Gagal terhubung ke server.' };
    }
  }

  /** Simpan nomor + toggle + pilihan jenis notifikasi (difilter role di server). */
  async notifPrefsSave(userId, payload) {
    try {
      const res = await fetch('api/notification-settings.php?action=save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          user_id: userId,
          user: this.state.user || {},
          wa_number: payload.wa_number,
          wa_notif_enabled: payload.wa_notif_enabled,
          types: payload.types || {}
        })
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Gagal terhubung ke server.' };
    }
  }

  /** Kirim pesan percobaan ke nomor WhatsApp yang tersimpan. */
  async notifPrefsTest(userId) {
    try {
      const res = await fetch('api/notification-settings.php?action=test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', user_id: userId })
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Gagal terhubung ke server.' };
    }
  }

  // ==========================================
  // WHATSAPP FONNTE NOTIFICATION TRIGGERS
  // ==========================================

  /**
   * Memicu notifikasi WhatsApp Fonnte otomatis untuk transaksi / pesanan baru.
   * Berjalan secara asynchronous & non-blocking agar tidak mengganggu transaksi.
   * @param {Object} order 
   */
  triggerWhatsAppNewOrder(order) {
    if (!order) return;
    try {
      fetch('api/whatsapp.php?action=notify_order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'notify_order', order })
      })
      .then(res => res.json())
      .then(data => {
        console.log('📲 [WhatsApp Fonnte] Notifikasi transaksi baru diproses:', data);
      })
      .catch(err => {
        // Jangan mengganggu proses transaksi jika WhatsApp gagal
        console.warn('⚠️ [WhatsApp Fonnte] Pengiriman notifikasi pesanan gagal:', err.message || err);
      });
    } catch (e) {
      console.warn('⚠️ [WhatsApp Fonnte] Exception saat memicu notifikasi pesanan:', e);
    }
  }

  /**
   * Memicu notifikasi WhatsApp Fonnte otomatis untuk perubahan status pesanan.
   * @param {Object} order 
   * @param {string} oldStatus 
   * @param {string} newStatus 
   * @param {string} note 
   */
  triggerWhatsAppStatusChange(order, oldStatus, newStatus, note = '') {
    if (!order) return;
    try {
      fetch('api/whatsapp.php?action=notify_status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'notify_status',
          order,
          old_status: oldStatus,
          new_status: newStatus,
          note
        })
      })
      .then(res => res.json())
      .then(data => {
        console.log(`📲 [WhatsApp Fonnte] Notifikasi perubahan status '${newStatus}' diproses:`, data);
      })
      .catch(err => {
        console.warn('⚠️ [WhatsApp Fonnte] Pengiriman notifikasi status gagal:', err.message || err);
      });
    } catch (e) {
      console.warn('⚠️ [WhatsApp Fonnte] Exception saat memicu notifikasi status:', e);
    }
  }

  // ==========================================
  // PRODUCT & MARKETPLACE B2B METHODS
  // ==========================================
  getProducts() {
    return this.state.products || [];
  }

  getMyProducts(sellerId) {
    const targetId = sellerId || (this.state.user ? this.state.user.id : DEMO_USER.id);
    return (this.state.products || []).filter(p => p.sellerId === targetId);
  }

  getProductById(id) {
    return (this.state.products || []).find(p => p.id === id);
  }

  addProduct(productData) {
    const user = this.state.user || DEMO_USER;
    const newProduct = {
      id: 'prd_' + Date.now().toString(36),
      name: productData.name.trim(),
      category: productData.category || 'Pertanian & Beras',
      description: productData.description.trim(),
      price: Number(productData.price) || 0,
      unit: productData.unit || 'Kg',
      stock: Number(productData.stock) || 0,
      minOrder: Number(productData.minOrder) || 1,
      location: productData.location ? productData.location.trim() : `${user.village || 'Desa Sukamaju'}, ${user.district || 'Pacet'}`,
      regency: productData.regency || user.regency || 'Kabupaten Cianjur',
      sellerId: user.id,
      sellerName: user.businessName || user.ownerName || 'UMKM Desa Sejahtera',
      sellerPhone: user.phone || '081234567890',
      sellerVerified: Boolean(user.isVerified !== false),
      harvestGrade: productData.harvestGrade || 'Grade A Super',
      imageUrl: productData.imageUrl || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date().toISOString().split('T')[0]
    };

    const updated = [newProduct, ...(this.state.products || [])];
    this.state.products = updated;
    this.state.stats.totalProduk = updated.length;
    this.state.stats.stokMenipis = updated.filter(p => p.stock < 1000).length;

    try {
      localStorage.setItem('desabiz_products', JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    this.notify();
    return { success: true, product: newProduct };
  }

  updateProduct(id, updatedData) {
    const index = (this.state.products || []).findIndex(p => p.id === id);
    if (index === -1) {
      return { success: false, message: 'Produk tidak ditemukan.' };
    }

    const current = this.state.products[index];
    const merged = {
      ...current,
      ...updatedData,
      price: updatedData.price !== undefined ? Number(updatedData.price) : current.price,
      stock: updatedData.stock !== undefined ? Number(updatedData.stock) : current.stock,
      minOrder: updatedData.minOrder !== undefined ? Number(updatedData.minOrder) : current.minOrder
    };

    this.state.products[index] = merged;
    this.state.stats.stokMenipis = this.state.products.filter(p => p.stock < 1000).length;

    try {
      localStorage.setItem('desabiz_products', JSON.stringify(this.state.products));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    this.notify();
    return { success: true, product: merged };
  }

  deleteProduct(id) {
    const initialLength = (this.state.products || []).length;
    this.state.products = (this.state.products || []).filter(p => p.id !== id);

    if (this.state.products.length !== initialLength) {
      this.state.stats.totalProduk = this.state.products.length;
      this.state.stats.stokMenipis = this.state.products.filter(p => p.stock < 1000).length;
      try {
        localStorage.setItem('desabiz_products', JSON.stringify(this.state.products));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }
      this.notify();
      return { success: true };
    }
    return { success: false, message: 'Produk tidak ditemukan.' };
  }

  updateProductStock(id, newStock) {
    return this.updateProduct(id, { stock: Number(newStock) || 0 });
  }

  // ==========================================
  // SUPPLIER DIRECTORY & B2B METHODS
  // ==========================================
  getSuppliers() {
    const rawSuppliers = this.state.suppliers || this.getStoredSuppliers();
    const allProducts = this.getProducts();

    return rawSuppliers.map(s => {
      // Find all products owned or sold by this supplier
      const supplierProducts = allProducts.filter(p => 
        p.sellerId === s.sellerId || 
        p.sellerId === s.id || 
        (p.sellerName && p.sellerName.toLowerCase().trim() === s.businessName.toLowerCase().trim())
      );

      return {
        ...s,
        products: supplierProducts
      };
    });
  }

  getSupplierById(id) {
    if (!id) return null;
    const suppliers = this.getSuppliers();
    return suppliers.find(s => s.id === id || s.sellerId === id) || null;
  }

  searchSuppliers(query = '', filters = {}) {
    const suppliers = this.getSuppliers();
    const q = query.toLowerCase().trim();

    return suppliers.filter(s => {
      // Match query across: Nama UMKM, Produk yang dijual, Kategori, Lokasi, Jenis usaha, Pemilik
      const matchQuery = !q ||
        s.businessName.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q) ||
        s.businessType.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        s.regency.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.categories.some(cat => cat.toLowerCase().includes(q)) ||
        s.featuredProducts.some(p => p.toLowerCase().includes(q)) ||
        (s.products && s.products.some(prod => prod.name.toLowerCase().includes(q) || prod.category.toLowerCase().includes(q)));

      // Match category filter
      const matchCategory = !filters.category || filters.category === 'all' ||
        s.categories.includes(filters.category) ||
        (s.products && s.products.some(prod => prod.category === filters.category));

      // Match location filter (regency or village)
      const matchLocation = !filters.location || filters.location === 'all' ||
        s.regency === filters.location ||
        s.location.includes(filters.location);

      // Match business type filter
      const matchBusinessType = !filters.businessType || filters.businessType === 'all' ||
        s.businessType.toLowerCase().includes(filters.businessType.toLowerCase());

      // Match verified filter
      const matchVerified = !filters.onlyVerified || s.isVerified === true;

      return matchQuery && matchCategory && matchLocation && matchBusinessType && matchVerified;
    });
  }

  // ==========================================
  // ORDER (PEMESANAN) MANAGEMENT
  // ==========================================
  getOrders(role = 'all', status = 'all') {
    const orders = this.state.orders || [];
    const currentUserId = this.state.user?.id || 'usr_01';

    return orders.filter(order => {
      // Role filter: 'buyer', 'seller', or 'all'
      let matchRole = true;
      if (role === 'buyer') {
        matchRole = order.buyerId === currentUserId;
      } else if (role === 'seller') {
        matchRole = order.sellerId === currentUserId;
      } else {
        matchRole = order.buyerId === currentUserId || order.sellerId === currentUserId;
      }

      // Status filter
      const matchStatus = !status || status === 'all' || order.status === status;

      return matchRole && matchStatus;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getOrderById(id) {
    const orders = this.state.orders || [];
    return orders.find(o => o.id === id) || null;
  }

  createOrder(data) {
    const currentUser = this.state.user || DEMO_USER;
    const product = this.getProductById(data.productId);

    if (!product) {
      return { success: false, message: 'Produk yang dipesan tidak ditemukan.' };
    }

    const qty = parseInt(data.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return { success: false, message: 'Jumlah pesanan harus lebih besar dari 0.' };
    }

    if (qty < product.minOrder) {
      return {
        success: false,
        message: `Jumlah pesanan (${qty} ${product.unit}) kurang dari batas minimum order (${product.minOrder} ${product.unit}).`
      };
    }

    const unitPrice = data.unitPrice ? Number(data.unitPrice) : product.price;
    const subtotal = qty * unitPrice;
    const shippingCost = data.shippingCost !== undefined ? Number(data.shippingCost) : 250000;
    const totalAmount = subtotal + shippingCost;

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateFormatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const dateDisplay = `${pad(now.getDate())} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const orderId = `ORD-2026-${String(Math.floor(100 + Math.random() * 900))}`;

    const newOrder = {
      id: orderId,
      buyerId: currentUser.id,
      buyerName: currentUser.businessName || currentUser.ownerName,
      buyerContact: `${currentUser.ownerName} (${currentUser.phone || '-'})`,
      buyerPhone: currentUser.phone || '',
      buyerAddress: data.shippingAddress || currentUser.address || 'Alamat Belum Diisi',
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      sellerContact: `${product.sellerName} (${product.sellerPhone || '-'})`,
      sellerPhone: product.sellerPhone || '',
      sellerLocation: product.location || '-',
      productId: product.id,
      productName: product.name,
      productUnit: product.unit,
      productImage: product.imageUrl,
      quantity: qty,
      unitPrice: unitPrice,
      subtotal: subtotal,
      shippingCost: shippingCost,
      totalAmount: totalAmount,
      status: 'Menunggu',
      notes: data.notes || 'Pesanan pasokan komoditas B2B reguler.',
      createdAt: dateFormatted,
      updatedAt: dateFormatted,
      timeline: [
        {
          status: 'Menunggu',
          time: dateDisplay,
          note: `Purchase Order diterbitkan oleh ${currentUser.businessName || currentUser.ownerName}. Menunggu konfirmasi penjual.`
        }
      ]
    };

    const updatedOrders = [newOrder, ...(this.state.orders || [])];
    this.state.orders = updatedOrders;
    this.updateStatsFromOrders(updatedOrders);

    try {
      localStorage.setItem('desabiz_orders', JSON.stringify(updatedOrders));
    } catch (e) {
      console.warn('Gagal menyimpan pesanan:', e);
    }

    // Add notification
    this.addNotification({
      title: 'Pesanan Diterbitkan',
      message: `PO #${orderId} untuk ${product.name} berhasil dibuat dengan total Rp ${totalAmount.toLocaleString('id-ID')}.`,
      link: `#/pesanan-detail?id=${orderId}`
    });

    this.notify();

    // Trigger Notifikasi WhatsApp Fonnte (Pembeli, Penjual, Admin)
    this.triggerWhatsAppNewOrder(newOrder);

    return { success: true, order: newOrder };
  }

  updateOrderStatus(orderId, newStatus, note = '') {
    const validStatuses = ['Menunggu', 'Diproses', 'Dikonfirmasi', 'Selesai', 'Dibatalkan'];
    if (!validStatuses.includes(newStatus)) {
      return { success: false, message: `Status '${newStatus}' tidak valid.` };
    }

    const orders = this.state.orders || [];
    const index = orders.findIndex(o => o.id === orderId);
    if (index === -1) {
      return { success: false, message: 'Pesanan tidak ditemukan.' };
    }

    const order = { ...orders[index] };
    const oldStatus = order.status || 'Menunggu';
    order.status = newStatus;

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateFormatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const dateDisplay = `${pad(now.getDate())} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    order.updatedAt = dateFormatted;

    let defaultNote = '';
    if (newStatus === 'Diproses') defaultNote = 'Pesanan telah diterima dan sedang dipersiapkan oleh penjual.';
    else if (newStatus === 'Dikonfirmasi') defaultNote = 'Pesanan dikonfirmasi siap kirim / armada logistik telah dijadwalkan.';
    else if (newStatus === 'Selesai') defaultNote = 'Komoditas telah diterima dengan baik dan transaksi dinyatakan selesai.';
    else if (newStatus === 'Dibatalkan') defaultNote = 'Pesanan telah dibatalkan.';

    const timelineEntry = {
      status: newStatus,
      time: dateDisplay,
      note: note || defaultNote
    };

    order.timeline = [...(order.timeline || []), timelineEntry];

    // ==========================================
    // LOGIKA INTEGRASI STOK DENGAN PESANAN
    // ==========================================
    if (newStatus === 'Diproses' || newStatus === 'Dikonfirmasi') {
      if (!order.stockDeducted) {
        const prod = this.getProductById(order.productId);
        if (prod) {
          const oldStock = prod.stock;
          const newStock = Math.max(0, prod.stock - order.quantity);
          order.stockDeducted = true;
          this.updateProduct(prod.id, { stock: newStock });

          this.addStockLog({
            productId: prod.id,
            productName: prod.name,
            type: 'order',
            typeLabel: 'Terpotong Pesanan',
            quantity: -order.quantity,
            stockBefore: oldStock,
            stockAfter: newStock,
            unit: prod.unit,
            reason: `Alokasi pengiriman pasokan PO #${order.id} (${order.buyerName})`,
            operator: 'Sistem Pesanan Otomatis'
          });

          // Peringatan jika mencapai batas minimum
          const threshold = this.getStockThreshold(prod);
          if (newStock === 0) {
            this.addNotification({
              type: 'stock',
              title: `Stok Habis: ${prod.name}`,
              message: `Stok ${prod.name} telah habis (0 ${prod.unit}) setelah dialokasikan ke pesanan #${order.id}.`,
              link: '#/stok'
            });
          } else if (newStock <= threshold) {
            this.addNotification({
              type: 'stock',
              title: `Peringatan Stok Menipis: ${prod.name}`,
              message: `Stok ${prod.name} tersisa ${newStock.toLocaleString('id-ID')} ${prod.unit} (di bawah batas aman ${threshold.toLocaleString('id-ID')} ${prod.unit}).`,
              link: '#/stok'
            });
          }
        }
      }
    } else if (newStatus === 'Dibatalkan') {
      if (order.stockDeducted) {
        const prod = this.getProductById(order.productId);
        if (prod) {
          const oldStock = prod.stock;
          const newStock = prod.stock + order.quantity;
          order.stockDeducted = false;
          this.updateProduct(prod.id, { stock: newStock });

          this.addStockLog({
            productId: prod.id,
            productName: prod.name,
            type: 'order_cancel',
            typeLabel: 'Restock Pembatalan',
            quantity: order.quantity,
            stockBefore: oldStock,
            stockAfter: newStock,
            unit: prod.unit,
            reason: `Restock otomatis pembatalan pesanan PO #${order.id}`,
            operator: 'Sistem Pesanan Otomatis'
          });
        }
      }
    } else if (newStatus === 'Selesai') {
      // Hubungkan dengan modul transaksi
      this.syncOrderToTransaction(order);
    }

    orders[index] = order;
    this.state.orders = [...orders];
    this.updateStatsFromOrders(this.state.orders);

    try {
      localStorage.setItem('desabiz_orders', JSON.stringify(this.state.orders));
    } catch (e) {
      console.warn('Gagal update status pesanan:', e);
    }

    this.addNotification({
      title: `Status Pesanan #${orderId}: ${newStatus}`,
      message: note || defaultNote,
      link: `#/pesanan-detail?id=${orderId}`
    });

    this.notify();

    // Trigger Notifikasi WhatsApp Fonnte Perubahan Status
    this.triggerWhatsAppStatusChange(order, oldStatus, newStatus, note || defaultNote);

    return { success: true, order };
  }

  updateStatsFromOrders(orders) {
    const currentUserId = this.state.user?.id || 'usr_01';
    const pesananMasuk = orders.filter(o => o.sellerId === currentUserId && o.status !== 'Dibatalkan').length;
    const pesananKeluar = orders.filter(o => o.buyerId === currentUserId && o.status !== 'Dibatalkan').length;
    
    // Calculate total completed or active transaction
    const transactions = this.state.transactions || [];
    const totalTrx = transactions
      .filter(t => t.status === 'Selesai / Lunas' || t.status === 'Dibayar / Lunas')
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

    const products = this.state.products || [];
    const lowStockCount = products.filter(p => {
      const threshold = p.minOrder * 2 > 1000 ? p.minOrder * 2 : 1000;
      return p.stock > 0 && p.stock <= threshold;
    }).length;

    if (this.state.stats) {
      this.state.stats.pesananMasuk = pesananMasuk;
      this.state.stats.pesananKeluar = pesananKeluar;
      this.state.stats.stokMenipis = lowStockCount;
      if (totalTrx > 0) {
        this.state.stats.totalTransaksiNumeric = totalTrx;
        this.state.stats.totalTransaksi = `Rp ${totalTrx.toLocaleString('id-ID')}`;
      }
    }
  }

  // ==========================================
  // MANAJEMEN STOK & INVENTARIS
  // ==========================================
  getStockThreshold(product) {
    if (!product) return 1000;
    return product.minOrder * 2 > 1000 ? product.minOrder * 2 : 1000;
  }

  getStockStatus(product) {
    if (!product) return { status: 'habis', label: 'Stok Habis', class: 'danger', color: '#ef4444' };
    const threshold = this.getStockThreshold(product);
    if (product.stock === 0) {
      return { status: 'habis', label: 'Stok Habis', class: 'danger', color: '#ef4444' };
    } else if (product.stock <= threshold) {
      return { status: 'menipis', label: 'Stok Menipis', class: 'warning', color: '#f59e0b' };
    } else {
      return { status: 'tersedia', label: 'Stok Tersedia', class: 'success', color: '#10b981' };
    }
  }

  getStockProducts(sellerId = null, filterStatus = 'all', searchQuery = '') {
    const currentUserId = this.state.user?.id || 'usr_01';
    const targetSellerId = sellerId === 'all' ? null : (sellerId || currentUserId);
    const allProducts = this.state.products || [];

    return allProducts
      .filter(p => {
        // Filter penjual
        if (targetSellerId && p.sellerId !== targetSellerId) {
          return false;
        }

        // Filter status stok
        const statusObj = this.getStockStatus(p);
        if (filterStatus && filterStatus !== 'all' && statusObj.status !== filterStatus) {
          return false;
        }

        // Filter search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = p.name.toLowerCase().includes(q);
          const matchCat = (p.category || '').toLowerCase().includes(q);
          const matchLoc = (p.location || p.regency || '').toLowerCase().includes(q);
          if (!matchName && !matchCat && !matchLoc) return false;
        }

        return true;
      })
      .map(p => ({
        ...p,
        threshold: this.getStockThreshold(p),
        statusInfo: this.getStockStatus(p),
        inventoryValue: (p.price || 0) * (p.stock || 0)
      }));
  }

  adjustStock({ productId, type, amount, reason, newStock, operator }) {
    const products = this.state.products || [];
    const index = products.findIndex(p => p.id === productId);
    if (index === -1) {
      return { success: false, message: 'Komoditas tidak ditemukan.' };
    }

    const prod = { ...products[index] };
    const oldStock = prod.stock;
    let finalStock = oldStock;
    let delta = 0;
    let typeLabel = 'Penyesuaian';

    if (type === 'add') {
      const addVal = parseInt(amount, 10);
      if (isNaN(addVal) || addVal <= 0) {
        return { success: false, message: 'Jumlah penambahan stok harus lebih dari 0.' };
      }
      delta = addVal;
      finalStock = oldStock + addVal;
      typeLabel = 'Stok Masuk';
    } else if (type === 'reduce') {
      const redVal = parseInt(amount, 10);
      if (isNaN(redVal) || redVal <= 0) {
        return { success: false, message: 'Jumlah pengurangan stok harus lebih dari 0.' };
      }
      if (redVal > oldStock) {
        return { success: false, message: `Jumlah pengurangan (${redVal} ${prod.unit}) melebihi stok yang ada (${oldStock} ${prod.unit}).` };
      }
      delta = -redVal;
      finalStock = Math.max(0, oldStock - redVal);
      typeLabel = 'Stok Keluar';
    } else if (type === 'set') {
      const setVal = parseInt(newStock, 10);
      if (isNaN(setVal) || setVal < 0) {
        return { success: false, message: 'Jumlah stok baru tidak boleh negatif.' };
      }
      delta = setVal - oldStock;
      finalStock = setVal;
      typeLabel = 'Ubah Stok (Opname)';
    } else {
      return { success: false, message: 'Jenis perubahan stok tidak valid.' };
    }

    prod.stock = finalStock;
    products[index] = prod;
    this.state.products = [...products];

    try {
      localStorage.setItem('desabiz_products', JSON.stringify(this.state.products));
    } catch (e) {}

    // Record Log Mutasi
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateDisplay = `${pad(now.getDate())} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    this.addStockLog({
      productId: prod.id,
      productName: prod.name,
      type: type,
      typeLabel: typeLabel,
      quantity: delta,
      stockBefore: oldStock,
      stockAfter: finalStock,
      unit: prod.unit,
      reason: reason || 'Penyesuaian stok manual oleh penjual',
      operator: operator || (this.state.user?.ownerName || 'Budi Santoso')
    });

    // Peringatan notifikasi jika mencapai batas minimum
    const threshold = this.getStockThreshold(prod);
    if (finalStock === 0) {
      this.addNotification({
        type: 'stock',
        title: `Stok Habis: ${prod.name}`,
        message: `Stok komoditas ${prod.name} telah habis (0 ${prod.unit})! Segera lakukan penambahan pasokan.`,
        link: '#/stok'
      });
    } else if (finalStock <= threshold) {
      this.addNotification({
        type: 'stock',
        title: `Peringatan Stok Menipis: ${prod.name}`,
        message: `Stok ${prod.name} tersisa ${finalStock.toLocaleString('id-ID')} ${prod.unit} (di bawah batas aman ${threshold.toLocaleString('id-ID')} ${prod.unit}).`,
        link: '#/stok'
      });
    }

    // Update stats
    if (this.state.stats) {
      this.state.stats.stokMenipis = products.filter(p => {
        const th = this.getStockThreshold(p);
        return p.stock > 0 && p.stock <= th;
      }).length;
    }

    this.notify();
    return { success: true, product: prod, oldStock, newStock: finalStock };
  }

  addStockLog(logData) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateDisplay = `${pad(now.getDate())} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const newLog = {
      id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      date: dateDisplay,
      ...logData
    };

    const updatedLogs = [newLog, ...(this.state.stockLogs || [])];
    this.state.stockLogs = updatedLogs;

    try {
      localStorage.setItem('desabiz_stock_logs', JSON.stringify(updatedLogs));
    } catch (e) {}

    return newLog;
  }

  getStockLogs(productId = null) {
    const logs = this.state.stockLogs || [];
    if (!productId) return logs;
    return logs.filter(l => l.productId === productId);
  }

  // ==========================================
  // MANAJEMEN TRANSAKSI & FAKTUR B2B
  // ==========================================
  getTransactions(type = 'all', status = 'all', searchQuery = '') {
    const currentUserId = this.state.user?.id || 'usr_01';
    const allTrx = this.state.transactions || [];

    return allTrx.filter(t => {
      // Type: buy (pembelian), sell (penjualan), all
      if (type === 'sell' && t.sellerId !== currentUserId) {
        return false;
      }
      if (type === 'buy' && t.buyerId !== currentUserId) {
        return false;
      }

      // Status filter
      if (status && status !== 'all' && t.status !== status) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = t.id.toLowerCase().includes(q);
        const matchOrder = (t.orderId || '').toLowerCase().includes(q);
        const matchProd = (t.productName || '').toLowerCase().includes(q);
        const matchBuyer = (t.buyerName || '').toLowerCase().includes(q);
        const matchSeller = (t.sellerName || '').toLowerCase().includes(q);
        if (!matchId && !matchOrder && !matchProd && !matchBuyer && !matchSeller) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  }

  getTransactionById(id) {
    const allTrx = this.state.transactions || [];
    return allTrx.find(t => t.id === id) || null;
  }

  syncOrderToTransaction(order) {
    if (!order) return null;
    const allTrx = this.state.transactions || [];
    const existingIndex = allTrx.findIndex(t => t.orderId === order.id);

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateFormatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const dateDisplay = `${pad(now.getDate())} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    if (existingIndex !== -1) {
      allTrx[existingIndex].status = 'Selesai / Lunas';
      allTrx[existingIndex].updatedAt = dateFormatted;
      this.state.transactions = [...allTrx];
      try {
        localStorage.setItem('desabiz_transactions', JSON.stringify(this.state.transactions));
      } catch (e) {}
      return allTrx[existingIndex];
    } else {
      const newTrxId = `TRX-2026-${order.id.replace('ORD-2026-', '')}`;
      const newTrx = {
        id: newTrxId,
        orderId: order.id,
        buyerId: order.buyerId,
        buyerName: order.buyerName,
        buyerContact: order.buyerContact,
        buyerAddress: order.buyerAddress,
        sellerId: order.sellerId,
        sellerName: order.sellerName,
        sellerContact: order.sellerContact,
        sellerLocation: order.sellerLocation,
        productId: order.productId,
        productName: order.productName,
        productUnit: order.productUnit,
        productImage: order.productImage,
        quantity: order.quantity,
        unitPrice: order.unitPrice,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        totalAmount: order.totalAmount,
        status: 'Selesai / Lunas',
        paymentMethod: 'Transfer Bank Rekening DesaBiz',
        invoiceNumber: `INV-DBZ-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${newTrxId.replace('TRX-2026-', '')}`,
        date: dateDisplay,
        createdAt: dateFormatted,
        notes: order.notes || 'Transaksi diselesaikan otomatis dari pesanan PO selesai.'
      };

      const updatedTrx = [newTrx, ...allTrx];
      this.state.transactions = updatedTrx;
      try {
        localStorage.setItem('desabiz_transactions', JSON.stringify(updatedTrx));
      } catch (e) {}
      return newTrx;
    }
  }

  updateTransactionStatus(trxId, newStatus, paymentMethod = null) {
    const allTrx = this.state.transactions || [];
    const index = allTrx.findIndex(t => t.id === trxId);
    if (index === -1) return { success: false, message: 'Transaksi tidak ditemukan.' };

    const trx = { ...allTrx[index] };
    trx.status = newStatus;
    if (paymentMethod) trx.paymentMethod = paymentMethod;

    allTrx[index] = trx;
    this.state.transactions = [...allTrx];

    try {
      localStorage.setItem('desabiz_transactions', JSON.stringify(this.state.transactions));
    } catch (e) {}

    this.notify();
    return { success: true, transaction: trx };
  }

  // ==========================================
  // NEGOTIATION (NEGOSIASI HARGA) MANAGEMENT
  // ==========================================
  getNegotiations(role = 'all', status = 'all') {
    const negs = this.state.negotiations || [];
    const currentUserId = this.state.user?.id || 'usr_01';

    return negs.filter(item => {
      // Role filter
      let matchRole = true;
      if (role === 'buyer') {
        matchRole = item.buyerId === currentUserId;
      } else if (role === 'seller') {
        matchRole = item.sellerId === currentUserId;
      } else {
        matchRole = item.buyerId === currentUserId || item.sellerId === currentUserId;
      }

      // Status filter
      const matchStatus = !status || status === 'all' || item.status === status;

      return matchRole && matchStatus;
    }).sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }

  getNegotiationById(id) {
    const negs = this.state.negotiations || [];
    return negs.find(n => n.id === id) || null;
  }

  createNegotiation(data) {
    const currentUser = this.state.user || DEMO_USER;
    const product = this.getProductById(data.productId);

    if (!product) {
      return { success: false, message: 'Produk yang ditawar tidak ditemukan.' };
    }

    const qty = parseInt(data.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return { success: false, message: 'Jumlah kuantitas harus lebih dari 0.' };
    }

    if (qty < product.minOrder) {
      return {
        success: false,
        message: `Jumlah penawaran (${qty} ${product.unit}) harus minimal sama dengan minimum order (${product.minOrder} ${product.unit}).`
      };
    }

    const offerPrice = parseInt(data.offerPrice, 10);
    if (isNaN(offerPrice) || offerPrice <= 0) {
      return { success: false, message: 'Harga penawaran harus valid dan lebih besar dari 0.' };
    }

    if (offerPrice >= product.price) {
      return {
        success: false,
        message: `Harga penawaran (Rp ${offerPrice.toLocaleString('id-ID')}) harus lebih rendah dari harga normal (Rp ${product.price.toLocaleString('id-ID')}). Untuk harga normal, gunakan fitur Buat Pesanan.`
      };
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateFormatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const dateDisplay = `${pad(now.getDate())} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const negId = `NEG-2026-${String(Math.floor(100 + Math.random() * 900))}`;
    const discountPercent = Math.round(((product.price - offerPrice) / product.price) * 100);

    const newNeg = {
      id: negId,
      buyerId: currentUser.id,
      buyerName: currentUser.businessName || currentUser.ownerName,
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      productId: product.id,
      productName: product.name,
      productUnit: product.unit,
      productImage: product.imageUrl,
      quantity: qty,
      initialPrice: product.price,
      offerPrice: offerPrice,
      counterPrice: null,
      status: 'Menunggu',
      buyerNote: data.buyerNote || `Pengajuan harga Rp ${offerPrice.toLocaleString('id-ID')}/${product.unit} untuk kuantitas ${qty} ${product.unit}.`,
      sellerNote: '',
      createdAt: dateFormatted,
      updatedAt: dateFormatted,
      history: [
        {
          role: 'buyer',
          price: offerPrice,
          time: dateDisplay,
          note: `Pengajuan penawaran harga Rp ${offerPrice.toLocaleString('id-ID')}/${product.unit} (-${discountPercent}%) untuk volume ${qty} ${product.unit}. Catatan: "${data.buyerNote || '-'}"`
        }
      ]
    };

    const updatedNegs = [newNeg, ...(this.state.negotiations || [])];
    this.state.negotiations = updatedNegs;

    try {
      localStorage.setItem('desabiz_negotiations', JSON.stringify(updatedNegs));
    } catch (e) {
      console.warn('Gagal menyimpan negosiasi:', e);
    }

    this.addNotification({
      title: 'Negosiasi Harga Diajukan',
      message: `Penawaran ${negId} untuk ${product.name} (Rp ${offerPrice.toLocaleString('id-ID')}/${product.unit}) berhasil dikirim ke penjual.`,
      link: `#/negosiasi`
    });

    this.notify();
    return { success: true, negotiation: newNeg };
  }

  respondNegotiation(negId, action, counterPrice = null, message = '') {
    const negs = this.state.negotiations || [];
    const index = negs.findIndex(n => n.id === negId);
    if (index === -1) {
      return { success: false, message: 'Negosiasi tidak ditemukan.' };
    }

    const neg = { ...negs[index] };
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateFormatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const dateDisplay = `${pad(now.getDate())} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    neg.updatedAt = dateFormatted;

    if (action === 'accept') {
      neg.status = 'Disetujui';
      neg.sellerNote = message || 'Penawaran harga Anda kami terima. Silakan terbitkan Purchase Order resmi.';
      neg.history.push({
        role: 'seller',
        price: neg.offerPrice,
        time: dateDisplay,
        note: `Penjual MENERIMA penawaran harga Rp ${neg.offerPrice.toLocaleString('id-ID')}/${neg.productUnit}. ${message ? `Catatan: "${message}"` : ''}`
      });
    } else if (action === 'reject') {
      neg.status = 'Ditolak';
      neg.sellerNote = message || 'Mohon maaf penawaran harga belum dapat kami terima.';
      neg.history.push({
        role: 'seller',
        price: null,
        time: dateDisplay,
        note: `Penjual MENOLAK penawaran harga. ${message ? `Alasan: "${message}"` : ''}`
      });
    } else if (action === 'counter') {
      const parsedCounter = parseInt(counterPrice, 10);
      if (isNaN(parsedCounter) || parsedCounter <= 0) {
        return { success: false, message: 'Harga balasan negosiasi tidak valid.' };
      }
      neg.status = 'Dinegosiasi Balik';
      neg.counterPrice = parsedCounter;
      neg.sellerNote = message || `Penjual menawarkan harga balasan Rp ${parsedCounter.toLocaleString('id-ID')}/${neg.productUnit}.`;
      neg.history.push({
        role: 'seller',
        price: parsedCounter,
        time: dateDisplay,
        note: `Penjual mengajukan HARGA BALASAN: Rp ${parsedCounter.toLocaleString('id-ID')}/${neg.productUnit}. ${message ? `Catatan: "${message}"` : ''}`
      });
    } else {
      return { success: false, message: 'Aksi negosiasi tidak dikenali.' };
    }

    negs[index] = neg;
    this.state.negotiations = [...negs];

    try {
      localStorage.setItem('desabiz_negotiations', JSON.stringify(this.state.negotiations));
    } catch (e) {
      console.warn('Gagal simpan respon negosiasi:', e);
    }

    this.addNotification({
      title: `Respon Negosiasi #${negId}`,
      message: `Status negosiasi kini '${neg.status}'.`,
      link: `#/negosiasi`
    });

    this.notify();
    return { success: true, negotiation: neg };
  }

  convertNegotiationToOrder(negId, shippingAddress = '', notes = '') {
    const neg = this.getNegotiationById(negId);
    if (!neg) {
      return { success: false, message: 'Data negosiasi tidak ditemukan.' };
    }

    if (neg.status !== 'Disetujui' && neg.status !== 'Dinegosiasi Balik') {
      return { success: false, message: 'Hanya negosiasi berstatus Disetujui atau Tawaran Balik yang dapat dijadikan pesanan.' };
    }

    // Agreed unit price: if counterPrice exists and user accepted it, or offerPrice
    const finalPrice = neg.counterPrice || neg.offerPrice;

    // Create Order with negotiated price
    const orderResult = this.createOrder({
      productId: neg.productId,
      quantity: neg.quantity,
      unitPrice: finalPrice,
      shippingAddress: shippingAddress || this.state.user?.address || '',
      notes: notes || `Pesanan hasil kesepakatan negosiasi #${neg.id} (Harga sepakat: Rp ${finalPrice.toLocaleString('id-ID')}/${neg.productUnit}).`
    });

    if (!orderResult.success) {
      return orderResult;
    }

    // Update negotiation status to Dikonversi ke Pesanan
    neg.status = 'Dikonversi ke Pesanan';
    neg.orderId = orderResult.order.id;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    neg.updatedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    
    try {
      localStorage.setItem('desabiz_negotiations', JSON.stringify(this.state.negotiations));
    } catch (e) {}

    this.notify();
    return { success: true, order: orderResult.order, negotiation: neg };
  }

  addNotification(notifData) {
    const notif = {
      id: `notif-${Date.now()}`,
      type: notifData.type || 'order',
      title: notifData.title || 'Pemberitahuan DesaBiz',
      message: notifData.message || '',
      time: 'Baru saja',
      read: false,
      link: notifData.link || '#/dashboard'
    };
    this.state.notifications = [notif, ...(this.state.notifications || [])];
  }

  // ==========================================
  // CHAT & MESSAGING SYSTEM
  // ==========================================
  getConversations(filter = 'all', searchQuery = '') {
    const currentUserId = this.state.user?.id || 'usr_01';
    let convs = (this.state.conversations || []).filter(c => 
      c.participantIds && c.participantIds.includes(currentUserId)
    );

    // Filter by tab
    if (filter === 'unread') {
      convs = convs.filter(c => (c.unreadCount || 0) > 0);
    } else if (filter === 'supplier') {
      convs = convs.filter(c => c.partner?.role === 'supplier');
    } else if (filter === 'buyer') {
      convs = convs.filter(c => c.partner?.role === 'buyer');
    }

    // Filter by query
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      convs = convs.filter(c => 
        (c.partner?.name && c.partner.name.toLowerCase().includes(q)) ||
        (c.partner?.businessName && c.partner.businessName.toLowerCase().includes(q)) ||
        (c.productRef?.name && c.productRef.name.toLowerCase().includes(q)) ||
        (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
      );
    }

    return convs.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }

  getConversationById(id) {
    const currentUserId = this.state.user?.id || 'usr_01';
    const convs = this.state.conversations || [];
    return convs.find(c => c.id === id && c.participantIds.includes(currentUserId)) || null;
  }

  findOrCreateConversation({ partnerId, productId = null, orderId = null, negId = null }) {
    const currentUserId = this.state.user?.id || 'usr_01';
    const convs = this.state.conversations || [];

    // Find existing
    let conv = convs.find(c => 
      c.participantIds.includes(currentUserId) && c.participantIds.includes(partnerId)
    );

    // Context product
    let productRef = null;
    if (productId) {
      const prod = this.getProductById(productId);
      if (prod) {
        productRef = {
          id: prod.id,
          name: prod.name,
          price: prod.price,
          unit: prod.unit,
          minOrder: prod.minOrder,
          imageUrl: prod.imageUrl,
          orderId: orderId || null,
          negId: negId || null
        };
      }
    } else if (orderId) {
      const order = this.getOrderById(orderId);
      if (order) {
        productRef = {
          id: order.productId,
          name: order.productName,
          price: order.unitPrice,
          unit: order.productUnit,
          minOrder: order.quantity,
          imageUrl: order.productImage,
          orderId: order.id,
          negId: null
        };
      }
    } else if (negId) {
      const neg = this.getNegotiationById(negId);
      if (neg) {
        productRef = {
          id: neg.productId,
          name: neg.productName,
          price: neg.offerPrice || neg.initialPrice,
          unit: neg.productUnit,
          minOrder: neg.quantity,
          imageUrl: neg.productImage,
          orderId: null,
          negId: neg.id
        };
      }
    }

    if (conv) {
      // If productRef passed and differs, update it
      if (productRef) {
        conv.productRef = productRef;
        conv.updatedAt = new Date().toISOString();
        try {
          localStorage.setItem('desabiz_conversations', JSON.stringify(this.state.conversations));
        } catch (e) {}
      }
      return conv;
    }

    // Lookup partner info
    const supplier = (this.state.suppliers || []).find(s => s.sellerId === partnerId || s.id === partnerId);
    const partnerUser = (this.getStoredUsers() || []).find(u => u.id === partnerId);

    const partnerName = supplier?.ownerName || partnerUser?.ownerName || 'Mitra UMKM';
    const partnerBusiness = supplier?.businessName || partnerUser?.businessName || 'Usaha Mandiri Desa';
    const partnerLocation = supplier?.location || partnerUser?.address || 'Pedesaan Jawa Barat';
    const partnerPhone = supplier?.phone || partnerUser?.phone || '081234567890';
    const avatarInit = supplier?.avatarInitial || partnerName.substring(0, 2).toUpperCase();

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const dateFormatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${timeStr}`;

    const newConv = {
      id: `conv_${Date.now()}`,
      participantIds: [currentUserId, partnerId],
      partner: {
        id: partnerId,
        name: partnerName,
        businessName: partnerBusiness,
        role: supplier ? 'supplier' : 'buyer',
        location: partnerLocation,
        avatarInitial: avatarInit,
        phone: partnerPhone,
        isOnline: true,
        lastSeen: 'Online'
      },
      productRef: productRef,
      lastMessage: productRef ? `Mulai obrolan terkait komoditas ${productRef.name}.` : 'Percakapan baru dimulai.',
      lastMessageTime: timeStr,
      unreadCount: 0,
      updatedAt: dateFormatted,
      messages: []
    };

    this.state.conversations = [newConv, ...(this.state.conversations || [])];
    try {
      localStorage.setItem('desabiz_conversations', JSON.stringify(this.state.conversations));
    } catch (e) {}

    this.notify();
    return newConv;
  }

  sendMessage({ conversationId, text, senderId = null }) {
    const currentUserId = this.state.user?.id || 'usr_01';
    const actualSenderId = senderId || currentUserId;
    const convs = this.state.conversations || [];
    const index = convs.findIndex(c => c.id === conversationId);

    if (index === -1) {
      return { success: false, message: 'Percakapan tidak ditemukan.' };
    }

    const conv = { ...convs[index] };
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const dateDisplay = `${pad(now.getDate())} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}`;
    const dateISO = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${timeStr}`;

    const senderName = actualSenderId === currentUserId 
      ? (this.state.user?.ownerName || 'Anda')
      : (conv.partner?.name || 'Mitra');

    const newMsg = {
      id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      senderId: actualSenderId,
      senderName: senderName,
      text: text.trim(),
      time: timeStr,
      date: dateDisplay,
      status: actualSenderId === currentUserId ? 'read' : 'delivered'
    };

    conv.messages = [...(conv.messages || []), newMsg];
    conv.lastMessage = text.trim();
    conv.lastMessageTime = timeStr;
    conv.updatedAt = dateISO;

    if (actualSenderId !== currentUserId) {
      conv.unreadCount = (conv.unreadCount || 0) + 1;
    }

    convs[index] = conv;
    this.state.conversations = [...convs];

    try {
      localStorage.setItem('desabiz_conversations', JSON.stringify(this.state.conversations));
    } catch (e) {}

    this.notify();

    // Trigger simulated partner reply if user sent message
    if (actualSenderId === currentUserId) {
      this.simulatePartnerReply(conv.id, text.trim());
    }

    return { success: true, message: newMsg, conversation: conv };
  }

  simulatePartnerReply(conversationId, userText) {
    const conv = this.getConversationById(conversationId);
    if (!conv || !conv.partner) return;

    setTimeout(() => {
      // Re-fetch conversation in case it changed
      const currentConv = this.getConversationById(conversationId);
      if (!currentConv) return;

      const lower = userText.toLowerCase();
      let replyText = '';

      if (lower.includes('stok') || lower.includes('tersedia') || lower.includes('ada')) {
        replyText = `Halo Pak ${this.state.user?.ownerName || 'Budi'}! Stok ${currentConv.productRef?.name || 'komoditas kami'} saat ini aman dan siap kirim dari gudang. Berapa volume yang direncanakan?`;
      } else if (lower.includes('sampel') || lower.includes('sample') || lower.includes('uji')) {
        replyText = `Tentu Pak, kami bisa kirimkan sampel 1-2 Kg terlebih dahulu untuk pengujian kadar air dan mutu. Silakan konfirmasi alamat gudang tujuannya.`;
      } else if (lower.includes('harga') || lower.includes('tawar') || lower.includes('diskon') || lower.includes('murah')) {
        replyText = `Untuk kontrak rutin atau partai di atas MOQ, kami siap berikan penyesuaian harga kemitraan. Anda bisa ajukan melalui menu Negosiasi Harga agar langsung terdata di sistem.`;
      } else if (lower.includes('kirim') || lower.includes('logistik') || lower.includes('ongkir') || lower.includes('truk') || lower.includes('kapan')) {
        replyText = `Armada logistik desa kami dijadwalkan jalan 2 kali seminggu. Estimasi pengiriman antar-kabupaten sekitar 1x24 jam kerja dengan armada berpendingin/terpal standar SNI.`;
      } else if (lower.includes('po') || lower.includes('pesan') || lower.includes('order')) {
        replyText = `Terima kasih banyak Pak! PO resmi Anda segera kami validasi dengan bagian sortasi panen. Kami pastikan mutu sesuai spesifikasi.`;
      } else {
        replyText = `Baik Pak, pesan Anda telah kami catat dengan baik. Tim operasional ${currentConv.partner.businessName} akan segera mempersiapkannya. Ada hal lain yang perlu kami bantu?`;
      }

      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const dateDisplay = `${pad(now.getDate())} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()}`;
      const dateISO = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${timeStr}`;

      const replyMsg = {
        id: `msg_${Date.now()}_reply`,
        senderId: currentConv.partner.id,
        senderName: currentConv.partner.name,
        text: replyText,
        time: timeStr,
        date: dateDisplay,
        status: 'delivered'
      };

      currentConv.messages = [...(currentConv.messages || []), replyMsg];
      currentConv.lastMessage = replyText;
      currentConv.lastMessageTime = timeStr;
      currentConv.updatedAt = dateISO;

      // Unread only if user not on chat view
      if (this.state.currentRoute !== 'chat') {
        currentConv.unreadCount = (currentConv.unreadCount || 0) + 1;
      }

      const allConvs = (this.state.conversations || []).map(c => c.id === currentConv.id ? currentConv : c);
      this.state.conversations = allConvs;

      try {
        localStorage.setItem('desabiz_conversations', JSON.stringify(this.state.conversations));
      } catch (e) {}

      this.addNotification({
        title: `Pesan Baru dari ${currentConv.partner.name}`,
        message: replyText,
        link: `#/chat?conversationId=${currentConv.id}`
      });

      this.notify();
    }, 1500);
  }

  markConversationAsRead(conversationId) {
    const convs = this.state.conversations || [];
    const index = convs.findIndex(c => c.id === conversationId);
    if (index === -1) return;

    const conv = { ...convs[index] };
    conv.unreadCount = 0;
    conv.messages = (conv.messages || []).map(m => ({ ...m, status: 'read' }));

    convs[index] = conv;
    this.state.conversations = [...convs];

    try {
      localStorage.setItem('desabiz_conversations', JSON.stringify(this.state.conversations));
    } catch (e) {}

    this.notify();
  }

  getTotalUnreadChatCount() {
    const currentUserId = this.state.user?.id || 'usr_01';
    const convs = (this.state.conversations || []).filter(c => c.participantIds?.includes(currentUserId));
    return convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }

  // ==========================================
  // STATE GETTERS & SETTERS
  // ==========================================
  getState() {
    return this.state;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  setRole(newRole) {
    if (newRole === 'buyer' || newRole === 'seller') {
      if (this.state.user) {
        this.state.user.role = newRole;
        try {
          localStorage.setItem('desabiz_session', JSON.stringify(this.state.user));
        } catch (e) {}
      }
      this.notify();
    }
  }

  toggleRole() {
    if (!this.state.user) return;
    const nextRole = this.state.user.role === 'buyer' ? 'seller' : 'buyer';
    this.setRole(nextRole);
  }

  toggleSidebar() {
    this.state.sidebarCollapsed = !this.state.sidebarCollapsed;
    this.notify();
  }

  toggleMobileSidebar(forceState) {
    if (typeof forceState === 'boolean') {
      this.state.mobileSidebarOpen = forceState;
    } else {
      this.state.mobileSidebarOpen = !this.state.mobileSidebarOpen;
    }
    this.notify();
  }

  toggleNotificationDropdown(forceState) {
    if (typeof forceState === 'boolean') {
      this.state.notificationDropdownOpen = forceState;
    } else {
      this.state.notificationDropdownOpen = !this.state.notificationDropdownOpen;
    }
    this.notify();
  }

  markNotificationRead(id) {
    const notif = this.state.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.notify();
    }
  }

  markAllNotificationsRead() {
    this.state.notifications.forEach(n => n.read = true);
    this.notify();
  }

  setSalesChartPeriod(period) {
    if (this.state.salesChart.periods[period]) {
      this.state.salesChart.activePeriod = period;
      this.notify();
    }
  }

  setCurrentRoute(route) {
    this.state.currentRoute = route;
    this.notify();
  }

  getUnreadNotificationsCount() {
    return (this.state.notifications || []).filter(n => !n.read).length;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => {
      try {
        fn(this.state);
      } catch (err) {
        console.error('State notification error:', err);
      }
    });
  }
}

export const appState = new AppState();
