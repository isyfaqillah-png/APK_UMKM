<?php
/**
 * DesaBiz AI - API Konfigurasi API Key Fonnte (KHUSUS ADMINISTRATOR)
 * ---------------------------------------------------------------------------
 * Mengelola token API Fonnte untuk integrasi WhatsApp Gateway:
 *   GET  ?action=status&user_id=...  -> status koneksi (token dimasking)
 *   POST action=save                 -> simpan / perbarui API key (terenkripsi)
 *   POST action=test                 -> uji koneksi nyata ke https://api.fonnte.com/send
 *   POST action=delete               -> hapus / nonaktifkan konfigurasi
 *
 * KEAMANAN:
 * - Semua aksi WAJIB berbasis akun Administrator (dicek ke tabel users).
 * - Token disimpan terenkripsi AES-256-CTR dan TIDAK PERNAH dikirim utuh
 *   ke frontend, tidak dicatat ke log, tidak muncul di URL/HTML.
 * - Validasi koneksi dilakukan lewat pengujian pengiriman pesan sungguhan
 *   (bukan sekadar berhasil disimpan).
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/fonnte.php';
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
$action = $_GET['action'] ?? ($data['action'] ?? 'status');
$userId = trim($_GET['user_id'] ?? ($data['user_id'] ?? ''));

/**
 * Catat aksi konfigurasi ke log (TANPA pernah menuliskan token).
 */
function fonnte_config_log(string $action, string $userId, string $detail = ''): void {
    $dir = __DIR__ . '/../logs';
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
    $line = sprintf(
        "[%s] ACTION: %s | ADMIN: %s | %s\n",
        date('Y-m-d H:i:s'),
        $action,
        $userId !== '' ? $userId : '-',
        $detail
    );
    @file_put_contents($dir . '/fonnte_config.log', $line, FILE_APPEND | LOCK_EX);
}

/**
 * Gerbang otorisasi: hanya akun dengan account_role = ADMIN yang lolos.
 * Gagal terhubung database = gagal verifikasi = DITOLAK (fail closed).
 *
 * @return array {ok: bool, code: int, message: string}
 */
function fonnte_config_require_admin(string $userId): array {
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
            fonnte_config_log('ACCESS_DENIED', $userId, 'Percobaan akses menu API Key oleh non-admin');
            return ['ok' => false, 'code' => 403, 'message' => 'Akses ditolak: Konfigurasi API Key hanya untuk akun Administrator.'];
        }
    } catch (PDOException $e) {
        return ['ok' => false, 'code' => 500, 'message' => 'Gagal memverifikasi peran pengguna.'];
    }

    return ['ok' => true, 'code' => 200, 'message' => ''];
}

/** Masking nomor telepon: 62831****399 */
function fonnte_mask_phone(string $phone): string {
    $len = strlen($phone);
    if ($len <= 8) return $len ? str_repeat('*', $len) : '—';
    return substr($phone, 0, 6) . '****' . substr($phone, -3);
}

// ===========================================================================
// DISPATCHER AKSI
// ===========================================================================
switch ($action) {

    // ==========================================================
    // STATUS KONFIGURASI (token selalu dimasking)
    // ==========================================================
    case 'status':
        $gate = fonnte_config_require_admin($userId);
        if (!$gate['ok']) {
            http_response_code($gate['code']);
            echo json_encode(['status' => 'error', 'message' => $gate['message']], JSON_UNESCAPED_UNICODE);
            exit;
        }

        Database::initTables();

        $row = null;
        $pdo = Database::getConnection();
        if ($pdo) {
            try {
                $stmt = $pdo->query("SELECT `is_active`, `token_encrypted`, `last_test_at`, `last_test_status`, `updated_at`, `updated_by` FROM `fonnte_config` WHERE `id` = 1 LIMIT 1");
                $row = $stmt ? $stmt->fetch() : false;
            } catch (PDOException $e) {
                $row = false;
            }
        }

        $configured   = $row && (int) ($row['is_active'] ?? 0) === 1;
        $dbToken      = ($configured && !empty($row['token_encrypted'])) ? fonnte_decrypt((string) $row['token_encrypted']) : '';
        $activeToken  = fonnte_get_token(true);
        $source       = fonnte_token_source();
        $hasFallback  = defined('FONNTE_API_TOKEN') && FONNTE_API_TOKEN !== '' && FONNTE_API_TOKEN !== 'FONNTE_API_TOKEN';

        echo json_encode([
            'status'           => 'success',
            'user_id'          => $userId,
            'configured'       => $configured && $dbToken !== '',
            'is_active'        => $configured,
            'token_mask'       => fonnte_mask_token($activeToken),
            'source'           => $source, // database | config
            'is_live'          => fonnte_is_live(),
            'has_config_fallback' => $hasFallback,
            'endpoint'         => FONNTE_API_URL,
            'updated_at'       => $row['updated_at'] ?? null,
            'updated_by'       => $row['updated_by'] ?? null,
            'last_test_at'     => $row['last_test_at'] ?? null,
            'last_test_status' => $row['last_test_status'] ?? null,
            'database_conn'    => Database::isConnected() ? 'Terkoneksi (MySQL)' : 'Offline',
            'timestamp'        => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        exit;

    // ==========================================================
    // SIMPAN / PERBARUI API KEY (terenkripsi)
    // ==========================================================
    case 'save':
        $gate = fonnte_config_require_admin($userId);
        if (!$gate['ok']) {
            http_response_code($gate['code']);
            echo json_encode(['status' => 'error', 'message' => $gate['message']], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $apiKey = trim((string) ($data['api_key'] ?? ''));

        // Validasi format token di sisi server (tanpa pernah mencatat nilainya)
        if ($apiKey === '') {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'API Key Fonnte tidak boleh kosong.'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        if (!preg_match('/^[A-Za-z0-9_\-]{6,128}$/', $apiKey)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Format API Key tidak valid. Gunakan 6-128 karakter huruf/angka/tanda hubung.'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $pdo = Database::getConnection();
        if (!$pdo) {
            http_response_code(503);
            echo json_encode(['status' => 'error', 'message' => 'Koneksi database tidak tersedia.'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        Database::initTables();

        try {
            $encrypted = fonnte_encrypt($apiKey);
            if ($encrypted === '') {
                http_response_code(500);
                echo json_encode(['status' => 'error', 'message' => 'Gagal mengenkripsi API key.'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $stmt = $pdo->prepare("SELECT `id` FROM `fonnte_config` WHERE `id` = 1 LIMIT 1");
            $stmt->execute();
            $exists = (bool) $stmt->fetchColumn();

            if ($exists) {
                $upd = $pdo->prepare("
                    UPDATE `fonnte_config`
                    SET `token_encrypted` = ?, `is_active` = 1, `updated_at` = NOW(), `updated_by` = ?
                    WHERE `id` = 1
                ");
                $upd->execute([$encrypted, $userId]);
                $mode = 'update';
            } else {
                $ins = $pdo->prepare("
                    INSERT INTO `fonnte_config` (`id`, `token_encrypted`, `is_active`, `updated_at`, `updated_by`)
                    VALUES (1, ?, 1, NOW(), ?)
                ");
                $ins->execute([$encrypted, $userId]);
                $mode = 'create';
            }

            // Refresh cache token di memori request ini
            fonnte_get_token(true);

            fonnte_config_log('SAVE_' . strtoupper($mode), $userId, 'API key disimpan terenkripsi (AES-256-CTR)');

            echo json_encode([
                'status'     => 'success',
                'message'    => $mode === 'create'
                    ? 'API Key berhasil disimpan (terenkripsi). Jalankan Tes Koneksi untuk memvalidasi.'
                    : 'API Key berhasil diperbarui (terenkripsi). Jalankan Tes Koneksi untuk memvalidasi.',
                'mode'       => $mode,
                'token_mask' => fonnte_mask_token($apiKey),
                'updated_at' => date('Y-m-d H:i:s'),
                'timestamp'  => date('Y-m-d H:i:s')
            ], JSON_UNESCAPED_UNICODE);
            exit;
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Gagal menyimpan API key ke database.'], JSON_UNESCAPED_UNICODE);
            exit;
        }

    // ==========================================================
    // TES KONEKSI FONNTE (kirim pesan percobaan sungguhan)
    // ==========================================================
    case 'test':
        $gate = fonnte_config_require_admin($userId);
        if (!$gate['ok']) {
            http_response_code($gate['code']);
            echo json_encode(['status' => 'error', 'message' => $gate['message']], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $service = WhatsAppService::getInstance();

        // Token aktif (database -> fallback config). Selalu baca ulang.
        $token = fonnte_get_token(true);

        if (!fonnte_is_live()) {
            echo json_encode([
                'status'     => 'error',
                'message'    => 'Belum ada API Key Fonnte yang valid. Simpan API Key terlebih dahulu.',
                'connection' => ['ok' => false, 'message' => 'Token belum dikonfigurasi.'],
                'timestamp'  => date('Y-m-d H:i:s')
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Tujuan pesan uji: nomor WhatsApp admin yang tersimpan (fallback config)
        $selfSettings = $service->getUserWaSettings($userId);
        $target = !empty($selfSettings['number'])
            ? $selfSettings['number']
            : (defined('FONNTE_ADMIN_PHONE') ? FONNTE_ADMIN_PHONE : '');

        $testMsg = "Halo! Ini adalah *tes koneksi* API Key Fonnte dari menu *Konfigurasi API Key* DesaBiz AI.\n\n"
                 . "Waktu uji: " . date('d M Y, H:i:s') . " WIB\n"
                 . "Token: " . fonnte_mask_token($token) . "\n\n"
                 . "Jika pesan ini masuk, konfigurasi API Key Anda VALID.";

        $result = $service->send($target, $testMsg, [
            'transaction_id'   => 'FONNTE-TEST-' . time(),
            'event_type'       => 'fonnte_config_test',
            'recipient_role'   => 'admin',
            'bypass_duplicate' => true
        ]);

        $ok = !empty($result['success']) && in_array($result['status'] ?? '', ['sent', 'simulated'], true);

        // Catat hasil uji (tanpa token) ke tabel konfigurasi
        $pdo = Database::getConnection();
        if ($pdo) {
            try {
                $upd = $pdo->prepare("
                    UPDATE `fonnte_config`
                    SET `last_test_at` = NOW(), `last_test_status` = ?
                    WHERE `id` = 1
                ");
                $upd->execute([$ok ? 'success' : 'failed']);
            } catch (PDOException $e) {
                // abaikan
            }
        }

        fonnte_config_log('TEST_CONNECTION', $userId, 'Hasil: ' . ($ok ? 'BERHASIL' : 'GAGAL'));

        echo json_encode([
            'status'    => $ok ? 'success' : 'error',
            'message'   => $ok
                ? 'Koneksi Fonnte BERHASIL. Pesan percobaan sudah dikirim.'
                : 'Koneksi Fonnte GAGAL: ' . ($result['message'] ?? 'tanpa keterangan'),
            'connection' => [
                'ok'            => $ok,
                'status'        => $result['status'] ?? 'unknown',
                'message'       => $result['message'] ?? '',
                'target_masked' => fonnte_mask_phone($service->formatPhoneNumber($target)),
                'token_mask'    => fonnte_mask_token($token),
                'source'        => fonnte_token_source(),
                'endpoint'      => FONNTE_API_URL
            ],
            'result'    => [
                'success' => $result['success'] ?? false,
                'status'  => $result['status'] ?? ''
            ],
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        exit;

    // ==========================================================
    // HAPUS / NONAKTIFKAN KONFIGURASI
    // ==========================================================
    case 'delete':
        $gate = fonnte_config_require_admin($userId);
        if (!$gate['ok']) {
            http_response_code($gate['code']);
            echo json_encode(['status' => 'error', 'message' => $gate['message']], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $pdo = Database::getConnection();
        if (!$pdo) {
            http_response_code(503);
            echo json_encode(['status' => 'error', 'message' => 'Koneksi database tidak tersedia.'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        try {
            $stmt = $pdo->prepare("DELETE FROM `fonnte_config` WHERE `id` = 1");
            $stmt->execute();
            $removed = $stmt->rowCount() > 0;

            fonnte_get_token(true);
            fonnte_config_log('DELETE', $userId, 'Konfigurasi API key dihapus dari database');

            $hasFallback = defined('FONNTE_API_TOKEN') && FONNTE_API_TOKEN !== '' && FONNTE_API_TOKEN !== 'FONNTE_API_TOKEN';

            echo json_encode([
                'status'  => 'success',
                'message' => $removed
                    ? 'Konfigurasi API Key berhasil dihapus. Sistem kembali ' . ($hasFallback ? 'ke token bawaan config/fonnte.php.' : 'ke mode simulasi (belum ada token).')
                    : 'Tidak ada konfigurasi tersimpan untuk dihapus.',
                'removed' => $removed,
                'source'  => fonnte_token_source(),
                'is_live' => fonnte_is_live(),
                'timestamp' => date('Y-m-d H:i:s')
            ], JSON_UNESCAPED_UNICODE);
            exit;
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Gagal menghapus konfigurasi.'], JSON_UNESCAPED_UNICODE);
            exit;
        }

    default:
        http_response_code(400);
        echo json_encode([
            'status'  => 'error',
            'message' => 'Aksi tidak dikenali. Gunakan: status, save, test, atau delete.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
}
