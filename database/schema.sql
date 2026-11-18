-- ==============================================================================
-- DesaBiz AI - Database Schema & Initial Data (MySQL / MariaDB XAMPP)
-- Database Name: db_desabiz_umkm
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `db_desabiz_umkm` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `db_desabiz_umkm`;

-- ------------------------------------------------------------------------------
-- 1. TABEL PENGGUNA (users)
-- Menyimpan data akun pelaku UMKM desa dan Administrator platform
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(50) NOT NULL PRIMARY KEY,
    `owner_name` VARCHAR(100) NOT NULL,
    `business_name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `phone` VARCHAR(30) NOT NULL,
    `wa_number` VARCHAR(30) NULL,
    `wa_notif_enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `wa_updated_at` DATETIME NULL,
    `address` TEXT NULL,
    `village` VARCHAR(100) NULL,
    `district` VARCHAR(100) NULL,
    `regency` VARCHAR(100) NULL,
    `business_type` VARCHAR(100) NULL,
    `role` ENUM('buyer', 'seller') NOT NULL DEFAULT 'buyer',
    `account_role` ENUM('UMKM', 'ADMIN') NOT NULL DEFAULT 'UMKM',
    `is_verified` TINYINT(1) NOT NULL DEFAULT 1,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_email` (`email`),
    INDEX `idx_phone` (`phone`),
    INDEX `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. TABEL PRODUK (products)
-- Menyimpan katalog komoditas pertanian, perkebunan, dan hasil desa
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
    `id` VARCHAR(50) NOT NULL PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `unit` VARCHAR(30) NOT NULL DEFAULT 'Kg',
    `stock` INT NOT NULL DEFAULT 0,
    `min_order` INT NOT NULL DEFAULT 1,
    `location` VARCHAR(150) NULL,
    `regency` VARCHAR(100) NULL,
    `seller_id` VARCHAR(50) NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_category` (`category`),
    INDEX `idx_seller` (`seller_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. TABEL PESANAN (orders)
-- Menyimpan alur Purchase Order (PO) antara pembeli dan penjual
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
    `id` VARCHAR(50) NOT NULL PRIMARY KEY,
    `buyer_id` VARCHAR(50) NOT NULL,
    `buyer_name` VARCHAR(150) NOT NULL,
    `buyer_phone` VARCHAR(30) NULL,
    `seller_id` VARCHAR(50) NOT NULL,
    `seller_name` VARCHAR(150) NOT NULL,
    `seller_phone` VARCHAR(30) NULL,
    `product_id` VARCHAR(50) NOT NULL,
    `product_name` VARCHAR(150) NOT NULL,
    `product_unit` VARCHAR(30) NOT NULL DEFAULT 'Kg',
    `quantity` INT NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `subtotal` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `shipping_cost` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `status` ENUM('Menunggu', 'Diproses', 'Dikonfirmasi', 'Dikirim', 'Selesai', 'Dibatalkan') NOT NULL DEFAULT 'Menunggu',
    `shipping_address` TEXT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_buyer` (`buyer_id`),
    INDEX `idx_seller` (`seller_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. TABEL TRANSAKSI (transactions)
-- Menyimpan pencatatan keuangan faktur digital dan pembayaran
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `transactions` (
    `id` VARCHAR(50) NOT NULL PRIMARY KEY,
    `order_id` VARCHAR(50) NOT NULL,
    `buyer_id` VARCHAR(50) NOT NULL,
    `seller_id` VARCHAR(50) NOT NULL,
    `product_name` VARCHAR(150) NOT NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    `total_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `payment_method` VARCHAR(50) NOT NULL DEFAULT 'Transfer Bank BNI',
    `status` ENUM('Menunggu Pembayaran', 'Selesai / Lunas', 'Dibatalkan') NOT NULL DEFAULT 'Menunggu Pembayaran',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    INDEX `idx_order` (`order_id`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. TABEL LOG NOTIFIKASI WHATSAPP (whatsapp_logs)
-- Menyimpan riwayat pengiriman notifikasi Fonnte & mekanisme anti-duplikasi
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `whatsapp_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `transaction_id` VARCHAR(50) NOT NULL,
    `event_type` VARCHAR(50) NOT NULL,
    `recipient` VARCHAR(30) NOT NULL,
    `recipient_role` VARCHAR(20) DEFAULT 'user',
    `message` TEXT NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `response` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_trx_event` (`transaction_id`, `event_type`),
    INDEX `idx_recipient` (`recipient`),
    INDEX `idx_status` (`status`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- PREFERENSI NOTIFIKASI WHATSAPP PER PENGGUNA (menu: Pengaturan Notifikasi WA)
-- Satu baris per user_id (relasi ke tabel users.id).
-- Nomor penerima, toggle global, dan 9 jenis notifikasi sesuai role.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notification_preferences` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` VARCHAR(50) NOT NULL,
    `whatsapp_number` VARCHAR(30) NULL,
    `whatsapp_enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `transaction_notifications` TINYINT(1) NOT NULL DEFAULT 1,
    `order_notifications` TINYINT(1) NOT NULL DEFAULT 1,
    `payment_notifications` TINYINT(1) NOT NULL DEFAULT 1,
    `status_notifications` TINYINT(1) NOT NULL DEFAULT 1,
    `shipping_notifications` TINYINT(1) NOT NULL DEFAULT 1,
    `completion_notifications` TINYINT(1) NOT NULL DEFAULT 1,
    `cancellation_notifications` TINYINT(1) NOT NULL DEFAULT 1,
    `account_notifications` TINYINT(1) NOT NULL DEFAULT 1,
    `announcement_notifications` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NULL,
    UNIQUE KEY `uniq_notification_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- KONFIGURASI API KEY FONNTE (menu: Konfigurasi API Key — HANYA ADMIN)
-- Token disimpan TERENKRIPSI (AES-256-CTR) dan tidak pernah dikirim utuh
-- ke frontend maupun dicatat ke log. Singleton: selalu id = 1.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `fonnte_config` (
    `id` TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    `token_encrypted` TEXT NOT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `last_test_at` DATETIME NULL,
    `last_test_status` VARCHAR(20) NULL,
    `updated_at` DATETIME NULL,
    `updated_by` VARCHAR(50) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- KONFIGURASI PROVIDER CHATBOT AI (menu: KONFIGURASI > API Key Chatbot AI)
-- Satu baris per provider (openai | gemini | custom), tepat SATU provider
-- aktif sebagai provider utama chatbot. API key disimpan TERENKRIPSI
-- (AES-256-CTR, kunci TERPISAH dari Fonnte) — tidak pernah dikirim utuh
-- ke frontend maupun dicatat ke log.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ai_configurations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `provider` VARCHAR(30) NOT NULL,
    `model` VARCHAR(80) NOT NULL DEFAULT '',
    `endpoint` VARCHAR(255) NULL,
    `encrypted_api_key` TEXT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 0,
    `last_test_at` DATETIME NULL,
    `last_test_status` VARCHAR(20) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NULL,
    `updated_by` VARCHAR(50) NULL,
    UNIQUE KEY `uniq_ai_provider` (`provider`),
    INDEX `idx_ai_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- DATA AWAL (SEED DATA UNTUK PENGUJIAN)
-- ------------------------------------------------------------------------------

-- Pengguna Demo
INSERT INTO `users` (`id`, `owner_name`, `business_name`, `email`, `phone`, `village`, `district`, `regency`, `business_type`, `role`, `account_role`) VALUES
('usr_01', 'Budi Santoso', 'UD Tani Makmur Sejahtera', 'budi.tanimakmur@desabiz.id', '081234567890', 'Desa Sukamaju', 'Kecamatan Pacet', 'Kabupaten Cianjur', 'Pertanian & Komoditas Pangan', 'buyer', 'UMKM'),
('usr_02', 'Asep Sudrajat', 'Koperasi Kopi Rancabali Makmur', 'asep.kopi@desabiz.id', '081398765432', 'Desa Patengan', 'Kecamatan Rancabali', 'Kabupaten Bandung', 'Koperasi Desa Produsen Kopi', 'seller', 'UMKM'),
('usr_admin', 'Siti Aminah Rahma', 'Admin DesaBiz AI', 'admin@desabiz.id', '081100000001', 'Desa Sukamaju', 'Kecamatan Pacet', 'Kabupaten Cianjur', 'Platform Administrator', 'buyer', 'ADMIN')
ON DUPLICATE KEY UPDATE `owner_name`=VALUES(`owner_name`);

-- Produk Demo
INSERT INTO `products` (`id`, `name`, `category`, `description`, `price`, `unit`, `stock`, `min_order`, `location`, `regency`, `seller_id`) VALUES
('prd_01', 'Beras Mentik Wangi Organik', 'Pertanian & Beras', 'Beras organik wangi pulen langsung dari petani Pacet Cianjur.', 14500.00, 'Kg', 4500, 100, 'Desa Sukamaju, Pacet', 'Kabupaten Cianjur', 'usr_01'),
('prd_02', 'Kopi Arabika Ciwidey Honey Process', 'Perkebunan & Kopi', 'Green bean specialty kopi arabika Ciwidey grade 1.', 98000.00, 'Kg', 850, 20, 'Desa Patengan, Rancabali', 'Kabupaten Bandung', 'usr_02')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

