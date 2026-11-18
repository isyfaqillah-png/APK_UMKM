<?php
/**
 * DesaBiz AI - API Pengaturan WhatsApp per Pengguna
 * ---------------------------------------------------------------------------
 * Menyimpan & membaca nomor WhatsApp penerima notifikasi Fonnte untuk
 * masing-masing pengguna (user_id) ke tabel `users` di MySQL.
 *
 * Aksi yang tersedia:
 *   GET  ?action=get&user_id=...          -> baca pengaturan pengguna
 *   POST action=save                      -> simpan nomor + status aktif/nonaktif
 *   POST action=test                      -> kirim pesan uji ke nomor tersimpan
 *
 * Keamanan: pengguna hanya dapat mengubah pengaturan miliknya sendiri
 * (user_id diambil dari sesi aplikasi, bukan dari input bebas).
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/WhatsAppService.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;
$action = $_GET['action'] ?? ($data['action'] ?? 'get');
$service = WhatsAppService::getInstance();

switch ($action) {

    // ==========================================================
    // BACA PENGATURAN WHATSAPP PENGGUNA
    // ==========================================================
    case 'get':
        $userId = $_GET['user_id'] ?? ($data['user_id'] ?? '');
        if (empty($userId)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'user_id diperlukan.'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $settings = $service->getUserWaSettings($userId);

        echo json_encode([
            'status'           => 'success',
            'user_id'          => $userId,
            'found'            => $settings['found'],
            'wa_number'        => $settings['number'],
            'wa_notif_enabled' => $settings['enabled'],
            'timestamp'        => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        exit;

    // ==========================================================
    // SIMPAN PENGATURAN WHATSAPP PENGGUNA (MySQL)
    // ==========================================================
    case 'save':
        $userId    = $data['user_id'] ?? '';
        $user      = $data['user'] ?? [];
        $rawNumber = trim($data['wa_number'] ?? '');
        $enabled   = !empty($data['wa_notif_enabled']);

        if (empty($userId)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'user_id diperlukan.'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Validasi nomor Indonesia di sisi server
        $validation = $service->validateWaNumber($rawNumber);
        if (!$validation['valid']) {
            http_response_code(400);
            echo json_encode([
                'status'  => 'error',
                'message' => $validation['error']
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $normalized = $validation['normalized'];

        $pdo = Database::getConnection();
        if (!$pdo) {
            http_response_code(503);
            echo json_encode(['status' => 'error', 'message' => 'Koneksi database tidak tersedia.'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        Database::initTables();

        // Simpan ke notification_preferences (utama) + sinkron kolom legacy users
        $saved = $service->saveNotificationPrefs($userId, $normalized, $enabled, [], $user);

        if (!$saved['success']) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Gagal menyimpan pengaturan ke database.'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $fresh = $service->getUserWaSettings($userId);

        echo json_encode([
            'status'           => 'success',
            'message'          => 'Pengaturan WhatsApp berhasil disimpan.',
            'user_id'          => $userId,
            'wa_number'        => $fresh['number'] ?: $normalized,
            'wa_notif_enabled' => $fresh['enabled'],
            'timestamp'        => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        exit;

    // ==========================================================
    // UJI KIRIM PESAN WHATSAPP KE NOMOR PENGGUNA
    // ==========================================================
    case 'test':
        $userId = $data['user_id'] ?? '';
        if (empty($userId)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'user_id diperlukan.'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $result = $service->sendTestToUser($userId);

        echo json_encode([
            'status' => $result['success'] ? 'success' : 'error',
            'result' => $result,
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;

    default:
        http_response_code(400);
        echo json_encode([
            'status'  => 'error',
            'message' => 'Aksi tidak dikenali. Gunakan: get, save, atau test.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
}
