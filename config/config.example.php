<?php
/**
 * DesaBiz AI - Konfigurasi Sistem & Database
 * 
 * Salin file ini menjadi config.php saat menghubungkan ke database MySQL XAMPP.
 */

define('APP_NAME', 'DesaBiz AI');
define('APP_ENV', 'development'); // 'development' atau 'production'
define('APP_URL', 'http://localhost/APK_UMKM');

// Konfigurasi Database MySQL (XAMPP Default)
define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'db_desabiz_umkm');

// Konfigurasi API AI Assistant (Tahap Lanjutan)
define('AI_API_ENDPOINT', 'https://api.openai.com/v1/chat/completions');
define('AI_API_KEY', ''); // Masukkan API Key untuk AI DesaBiz
