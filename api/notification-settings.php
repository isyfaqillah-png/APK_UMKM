<?php
/**
 * DesaBiz AI - API Pengaturan Notifikasi WhatsApp (PER PENGGUNA)
 * ---------------------------------------------------------------------------
 * Membaca & menyimpan preferensi notifikasi milik satu pengguna:
 *   GET  ?action=get&user_id=...   -> nomor, toggle, jenis notifikasi (sesuai role)
 *   POST action=save               -> simpan nomor + toggle + pilihan jenis notifikasi
 *   POST action=test               -> kirim pesan percobaan ke nomor tersimpan
 *
 * ATURAN:
 * - Nomor & preferensi hanya milik user_id yang dikirim (satu per satu, tidak
 *   pernah massal) — pengguna hanya mengelola pengaturannya sendiri.
 * - Jenis notifikasi yang boleh disimpan difilter sesuai role di sisi server
 *   (ADMIN / PENJUAL / PEMBELI) — pilihan di luar role diabaikan.
 * - Nomor divalidasi format Indonesia (08xxx / 628xxx) di sisi server.
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

/**
 * Tentukan role pengguna (sumber kebenaran keamanan = database):
 * - account_role (ADMIN/UMKM) SELALU dibaca dari tabel users — tidak pernah
 *   dipercaya dari klien, sehingga filter jenis notifikasi tidak bisa ditembus.
 * - mode kerja (buyer/seller) untuk akun UMKM mengikuti sesi klien (toggle
 *   Mode Pembeli/Penjual di aplikasi bersifat lokal), fallback ke kolom DB.
 *
 * @return array {account_role: string, mode: string, label: string}
 */
function notif_role_of(string $userId, array $clientUser = [], bool $allowClientMode = false): array {
    $accountRole = 'UMKM';
    $mode = (($clientUser['role'] ?? 'buyer') === 'seller') ? 'seller' : 'buyer';
    $hasRow = false;

    $pdo = Database::getConnection();
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT `account_role`, `role` FROM `users` WHERE `id` = ? LIMIT 1");
            $stmt->execute([$userId]);
            $row = $stmt->fetch();
            if ($row) {
                $hasRow = true;
                $accountRole = ($row['account_role'] ?? 'UMKM') === 'ADMIN' ? 'ADMIN' : 'UMKM';
                $dbMode = ($row['role'] ?? 'buyer') === 'seller' ? 'seller' : 'buyer';
                // Mode kerja default mengikuti database
                $mode = $dbMode;
            }
        } catch (PDOException $e) {
            // lanjut ke fallback
        }
    }

    // Mode kerja UMKM mengikuti sesi klien (hanya untuk tampilan & filter
    // jenis notifikasi per mode — bukan untuk peran ADMIN).
    if ($accountRole !== 'ADMIN' && $allowClientMode) {
        $clientMode = $clientUser['role'] ?? null;
        if ($clientMode === 'seller' || $clientMode === 'buyer') {
            $mode = $clientMode;
        }
    }

    return [
        'account_role' => $accountRole,
        'mode'         => $mode,
        'label'        => $accountRole === 'ADMIN' ? 'ADMINISTRATOR' : ($mode === 'seller' ? 'PENJUAL' : 'PEMBELI'),
        'db_found'     => $hasRow
    ];
}

switch ($action) {

    // ==========================================================
    // BACA PENGATURAN NOTIFIKASI PENGGUNA
    // ==========================================================
    case 'get':
        $userId = trim($_GET['user_id'] ?? ($data['user_id'] ?? ''));
        if ($userId === '') {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'user_id diperlukan.'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        Database::initTables();

        // Mode kerja (buyer/seller) dikirim klien sesuai toggle mode aplikasi
        $roleInfo = notif_role_of($userId, ['role' => $_GET['mode'] ?? ''], true);
        $prefs    = $service->getNotificationPrefs($userId);
        $wa       = $service->getUserWaSettings($userId);
        $types    = $service->notifTypesForRole($roleInfo['account_role'], $roleInfo['mode']);

        echo json_encode([
            'status'            => 'success',
            'user_id'           => $userId,
            'found'             => $wa['found'],
            'wa_number'         => $wa['number'],
            'wa_notif_enabled'  => $wa['enabled'],
            'flags'             => $prefs['flags'],
            'types'             => $types,
            'account_role'      => $roleInfo['account_role'],
            'mode'              => $roleInfo['mode'],
            'role_label'        => $roleInfo['label'],
            'prefs_updated_at'  => $prefs['updated_at'],
            'timestamp'         => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        exit;

    // ==========================================================
    // SIMPAN PENGATURAN NOTIFIKASI PENGGUNA
    // ==========================================================
    case 'save':
        $userId     = trim($data['user_id'] ?? '');
        $user       = $data['user'] ?? [];
        $rawNumber  = trim($data['wa_number'] ?? '');
        $enabled    = !empty($data['wa_notif_enabled']);
        $typePrefs  = is_array($data['types'] ?? null) ? $data['types'] : [];

        if ($userId === '') {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'user_id diperlukan.'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Validasi nomor Indonesia di sisi server
        $validation = $service->validateWaNumber($rawNumber);
        if (!$validation['valid']) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => $validation['error']], JSON_UNESCAPED_UNICODE);
            exit;
        }

        Database::initTables();

        // Filter jenis notifikasi: HANYA yang relevan dengan role pengguna
        $roleInfo = notif_role_of($userId, $user, true);
        $allowedKeys = array_column(
            $service->notifTypesForRole($roleInfo['account_role'], $roleInfo['mode']),
            'key'
        );

        $flags = [];
        foreach ($allowedKeys as $key) {
            if (array_key_exists($key, $typePrefs)) {
                $flags[$key] = !empty($typePrefs[$key]);
            }
        }

        $saved = $service->saveNotificationPrefs(
            $userId,
            $validation['normalized'],
            $enabled,
            $flags,
            $user
        );

        if (!$saved['success']) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $saved['message']], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $prefs = $service->getNotificationPrefs($userId);

        echo json_encode([
            'status'           => 'success',
            'message'          => 'Pengaturan notifikasi WhatsApp berhasil disimpan.',
            'user_id'          => $userId,
            'wa_number'        => $validation['normalized'],
            'wa_notif_enabled' => $enabled,
            'flags'            => $prefs['flags'],
            'role_label'       => $roleInfo['label'],
            'timestamp'        => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        exit;

    // ==========================================================
    // KIRIM PESAN PERCOBAAN KE NOMOR PENGGUNA
    // ==========================================================
    case 'test':
        $userId = trim($data['user_id'] ?? '');
        if ($userId === '') {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'user_id diperlukan.'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $result = $service->sendTestToUser($userId);

        echo json_encode([
            'status'    => $result['success'] ? 'success' : 'error',
            'result'    => $result,
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        exit;

    default:
        http_response_code(400);
        echo json_encode([
            'status'  => 'error',
            'message' => 'Aksi tidak dikenali. Gunakan: get, save, atau test.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
}
