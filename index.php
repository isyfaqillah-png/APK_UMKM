<?php
/**
 * DesaBiz AI - B2B Platform untuk UMKM di Pedesaan
 * 
 * Entry point utama Apache/PHP Server.
 * Menyajikan Single Page Application (SPA) frontend modern 
 * dan mempersiapkan konfigurasi backend untuk tahap berikutnya.
 */

// Konfigurasi Header & Security
header("X-Frame-Options: SAMEORIGIN");
header("X-Content-Type-Options: nosniff");
header("Referrer-Policy: strict-origin-when-cross-origin");

// Include file index.html sebagai tampilan utama SPA
if (file_exists(__DIR__ . '/index.html')) {
    include_once __DIR__ . '/index.html';
} else {
    echo "<h1>DesaBiz AI</h1><p>File index.html tidak ditemukan.</p>";
}
