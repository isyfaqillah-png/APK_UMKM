<?php
/**
 * DesaBiz AI - API Konfigurasi API Key Chatbot AI (KHUSUS ADMINISTRATOR)
 * ---------------------------------------------------------------------------
 * Mengelola provider & API key chatbot AI (tabel `ai_configurations`):
 *   GET  ?action=status&user_id=...  -> daftar provider + status (key dimasking)
 *   POST action=save                 -> simpan/perbarui konfigurasi (terenkripsi)
 *   POST action=test                 -> tes koneksi nyata ke provider terpilih
 *   POST action=delete               -> hapus konfigurasi provider
 *
 * KEAMANAN:
 * - Semua aksi WAJIB berbasis akun Administrator (dicek ke tabel users,
 *   fail-closed: DB offline = DITOLAK).
 * - API key dienkripsi AES-256-CTR (kunci TERPISAH dari kunci Fonnte) dan
 *   TIDAK PERNAH dikirim utuh ke frontend, dicatat ke log, atau masuk URL.
 * - TERPISAH TOTAL dari api/fonnte-config.php (konfigurasi WhatsApp Fonnte).
 * - Tes koneksi = chat percobaan sungguhan ke provider (bukan sekadar tersimpan).
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/ai-providers.php';
require_once __DIR__ . '/../services/AIProviderService.php';

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
$action = $_GET['action'] ?? ($data['action'] ?? 'status');
$userId = trim($_GET['user_id'] ?? ($data['user_id'] ?? ''));

/**
 * Catat aksi konfigurasi ke log (TIDAK PERNAH menuliskan API key).
 */
function ai_config_log(string $action, string $userId, string $detail = ''): void {
    $dir = __DIR__ . '/../logs';
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
    $line = sprintf(
        "[%s] ACTION: %s | ADMIN: %s | %s\n",
        date('Y-m-d H:i:s'),
        $action,
        $userId !== '' ? $userId : '-',
        $detail
    );
    @file_put_contents($dir . '/ai_config.log', $line, FILE_APPEND | LOCK_EX);
}

/**
 * Gerbang otorisasi: hanya akun dengan account_role = ADMIN yang lolos.
 * Gagal terhubung database = gagal verifikasi = DITOLAK (fail closed).
 *
 * @return array {ok: bool, code: int, message: string}
 */
function ai_config_require_admin(string $userId): array {
    if ($userId === '') {
        return ['ok' => false, 'code' => 400, 'message' => 'user_id diperlukan.'];
    }

    $pdo = Database::getConnection();
    if (!$pdo) {
        return ['ok' => false, 'code' => 503, 'message' => 'Koneksi database tidak tersedia. Otorisasi Administrator tidak dapat diverifikasi.'];
    }

    try {
        $stmt = $pdo->prepare("SELECT `account_role` FROM `users` WHERE `id` = ? LIMIT 1");
        $stmt->execute([$userId]);
        $role = $stmt->fetchColumn();

        if ($role === false || $role === null || $role === '') {
            return ['ok' => false, 'code' => 403, 'message' => 'Akun tidak ditemukan di sistem.'];
        }
        if ($role !== 'ADMIN') {
            ai_config_log('ACCESS_DENIED', $userId, 'Percobaan akses konfigurasi API key chatbot oleh non-admin');
            return ['ok' => false, 'code' => 403, 'message' => 'Akses ditolak: Konfigurasi API Key Chatbot AI hanya untuk akun Administrator.'];
        }
    } catch (PDOException $e) {
        return ['ok' => false, 'code' => 500, 'message' => 'Gagal memverifikasi peran pengguna.'];
    }

    return ['ok' => true, 'code' => 200, 'message' => ''];
}

/** Kirim respons error lalu hentikan. */
function ai_config_fail(int $code, string $message): void {
    http_response_code($code);
    echo json_encode(['status' => 'error', 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit();
}

$service = AIProviderService::getInstance();

// ===========================================================================
// DISPATCHER AKSI
// ===========================================================================
switch ($action) {

    // ==========================================================
    // STATUS KONFIGURASI (API key selalu dimasking)
    // ==========================================================
    case 'status':
        $gate = ai_config_require_admin($userId);
        if (!$gate['ok']) ai_config_fail($gate['code'], $gate['message']);

        $status = $service->getStatusAll();
        if ($status === null) {
            ai_config_fail(503, 'Koneksi database tidak tersedia.');
        }

        echo json_encode([
            'status'          => 'success',
            'user_id'         => $userId,
            'database_conn'   => Database::isConnected() ? 'Terkoneksi (MySQL)' : 'Offline',
            'providers'       => $status['providers'],
            'active_provider' => $status['active_provider'],
            'active_model'    => $status['active_model'],
            'active_endpoint' => $status['active_endpoint'],
            'chatbot_ready'   => $status['chatbot_ready'],
            'timestamp'       => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        exit;

    // ==========================================================
    // SIMPAN / PERBARUI KONFIGURASI (terenkripsi, satu provider aktif)
    // ==========================================================
    case 'save':
        $gate = ai_config_require_admin($userId);
        if (!$gate['ok']) ai_config_fail($gate['code'], $gate['message']);

        $result = $service->save([
            'provider'   => (string) ($data['provider'] ?? ''),
            'model'      => (string) ($data['model'] ?? ''),
            'api_key'    => (string) ($data['api_key'] ?? ''),
            'is_active'  => !empty($data['is_active']),
            'endpoint'   => (string) ($data['endpoint'] ?? ''),
            'updated_by' => $userId,
        ]);

        if (!$result['ok']) ai_config_fail(400, $result['message']);

        ai_config_log('SAVE_' . strtoupper($result['mode']), $userId,
            'Provider=' . $data['provider'] . ' | model=' . $data['model'] . ' | API key terenkripsi');

        echo json_encode([
            'status'     => 'success',
            'message'    => $result['message'],
            'mode'       => $result['mode'],
            'key_mask'   => $result['key_mask'],
            'updated_at' => date('Y-m-d H:i:s'),
            'timestamp'  => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        exit;

    // ==========================================================
    // TES KONEKSI PROVIDER (chat percobaan sungguhan)
    // ==========================================================
    case 'test':
        $gate = ai_config_require_admin($userId);
        if (!$gate['ok']) ai_config_fail($gate['code'], $gate['message']);

        $provider   = (string) ($data['provider'] ?? '');
        $apiKey     = (string) ($data['api_key'] ?? '');
        $model      = (string) ($data['model'] ?? '');
        $endpoint   = (string) ($data['endpoint'] ?? '');

        if ($provider === '') ai_config_fail(400, 'Provider AI wajib dipilih untuk tes koneksi.');

        $res = $service->testConnection($provider, $apiKey, $model, $endpoint);

        ai_config_log('TEST_CONNECTION', $userId,
            'Provider=' . $provider . ' | Hasil: ' . ($res['ok'] ? 'BERHASIL' : 'GAGAL') . ' | HTTP ' . $res['http_code']);

        echo json_encode([
            'status'         => $res['ok'] ? 'success' : 'error',
            'message'        => $res['message'],
            'connection'     => [
                'ok'             => $res['ok'],
                'provider'       => $res['provider'],
                'provider_label' => $res['provider_label'] ?? '',
                'model'          => $res['model'],
                'endpoint'       => $res['endpoint'],
                'http_code'      => $res['http_code'],
                'latency_ms'     => $res['ms'],
                'key_source'     => $res['source'],
            ],
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        exit;

    // ==========================================================
    // HAPUS KONFIGURASI PROVIDER (API key ikut terhapus)
    // ==========================================================
    case 'delete':
        $gate = ai_config_require_admin($userId);
        if (!$gate['ok']) ai_config_fail($gate['code'], $gate['message']);

        $provider = (string) ($data['provider'] ?? '');
        if ($provider === '') ai_config_fail(400, 'Provider wajib ditentukan untuk menghapus konfigurasi.');

        $result = $service->delete($provider);
        if (!$result['ok']) ai_config_fail(400, $result['message']);

        ai_config_log('DELETE', $userId, 'Provider=' . $provider . ' | konfigurasi & API key dihapus dari database');

        echo json_encode([
            'status'    => 'success',
            'message'   => $result['message'],
            'removed'   => $result['removed'],
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        exit;

    default:
        ai_config_fail(400, 'Aksi tidak dikenali. Gunakan: status, save, test, atau delete.');
}
