<?php
/**
 * DesaBiz AI - WhatsApp Service (Fonnte Gateway Integration)
 * 
 * Service ini menangani seluruh logika integrasi WhatsApp:
 * 1. Format dan validasi nomor telepon internasional (62).
 * 2. Pengiriman pesan via Fonnte Gateway API (cURL).
 * 3. Mekanisme anti-duplikasi pengiriman notifikasi.
 * 4. Pencatatan log ke Database MySQL (Prepared Statement) dan file logs/whatsapp.log.
 * 5. Template pesan otomatis untuk Pembeli, Penjual, Admin, dan Perubahan Status.
 * 6. Penanganan non-blocking agar kegagalan WhatsApp tidak mengganggu transaksi website.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/fonnte.php';

class WhatsAppService {
    private static ?WhatsAppService $instance = null;
    private string $logFilePath;

    public function __construct() {
        $this->logFilePath = __DIR__ . '/../logs/whatsapp.log';
        $this->ensureLogDirectory();
    }

    /**
     * Singleton instance
     */
    public static function getInstance(): WhatsAppService {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Pastikan folder logs/ tersedia
     */
    private function ensureLogDirectory(): void {
        $dir = dirname($this->logFilePath);
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
        if (!file_exists($this->logFilePath)) {
            @file_put_contents($this->logFilePath, "# DesaBiz AI - Fonnte WhatsApp Notification Log\n# Format: [Timestamp] [Status] [Event] [Recipient] [TransactionID] Message / Details\n\n");
        }
    }

    /**
     * Memformat nomor telepon ke format internasional standar Indonesia (62).
     * Contoh:
     * - '0812-3456-7890' -> '6281234567890'
     * - '81234567890'    -> '6281234567890'
     * - '+62 812 3456'   -> '628123456'
     * 
     * @param string|null $phone
     * @return string
     */
    public function formatPhoneNumber(?string $phone): string {
        if (empty($phone)) return '';

        // Hapus semua karakter non-angka
        $clean = preg_replace('/\D/', '', $phone);

        if (empty($clean)) return '';

        // Jika diawali 08 -> ganti jadi 628
        if (str_starts_with($clean, '08')) {
            return '628' . substr($clean, 2);
        }

        // Jika diawali 8 -> tambahkan 62
        if (str_starts_with($clean, '8')) {
            return '62' . $clean;
        }

        // Jika sudah diawali 62 -> gunakan langsung
        if (str_starts_with($clean, '62')) {
            return $clean;
        }

        return $clean;
    }

    /**
     * Memvalidasi apakah nomor telepon valid sebagai nomor WhatsApp Indonesia.
     * Nomor harus diawali 628 dan panjang antara 10 sampai 15 digit.
     * 
     * @param string $phone
     * @return bool
     */
    public function validatePhoneNumber(string $phone): bool {
        $formatted = $this->formatPhoneNumber($phone);
        // Validasi: 628 diikuti 7 hingga 12 digit angka
        return (bool) preg_match('/^628[0-9]{7,12}$/', $formatted);
    }

    /**
     * Memvalidasi nomor WhatsApp Indonesia yang diinput pengguna.
     * Format yang diterima: 08xxxxxxxxxx atau 628xxxxxxxxxx (10-13 digit).
     *
     * @param string $raw
     * @return array {valid: bool, normalized: string, error: string}
     */
    public function validateWaNumber(string $raw): array {
        $digits = preg_replace('/\D/', '', trim($raw));

        if (empty($digits)) {
            return ['valid' => false, 'normalized' => '', 'error' => 'Nomor WhatsApp tidak boleh kosong.'];
        }

        if (!preg_match('/^(0|62)8[1-9][0-9]{7,10}$/', $digits)) {
            return [
                'valid' => false,
                'normalized' => '',
                'error' => 'Nomor tidak valid. Gunakan nomor seluler Indonesia, contoh: 081234567890 atau 6281234567890.'
            ];
        }

        return ['valid' => true, 'normalized' => $this->formatPhoneNumber($digits), 'error' => ''];
    }

    /**
     * Ambil pengaturan WhatsApp pengguna dari database berdasarkan user_id.
     * Sumber utama: tabel `notification_preferences` (menu Pengaturan Notifikasi
     * WhatsApp). Fallback: kolom legacy `users.wa_number` / `users.wa_notif_enabled`.
     *
     * @param string $userId
     * @return array {found: bool, number: string, enabled: bool}
     */
    public function getUserWaSettings(string $userId): array {
        if (empty($userId)) {
            return ['found' => false, 'number' => '', 'enabled' => true];
        }

        $prefs = $this->getNotificationPrefs($userId);
        if ($prefs['found']) {
            return [
                'found'   => true,
                'number'  => $prefs['number'],
                'enabled' => $prefs['enabled']
            ];
        }

        $pdo = Database::getConnection();
        if (!$pdo) {
            return ['found' => false, 'number' => '', 'enabled' => true];
        }

        try {
            Database::initTables();
            $stmt = $pdo->prepare("SELECT `wa_number`, `wa_notif_enabled` FROM `users` WHERE `id` = ? LIMIT 1");
            $stmt->execute([$userId]);
            $row = $stmt->fetch();

            if (!$row) {
                return ['found' => false, 'number' => '', 'enabled' => true];
            }

            return [
                'found'   => true,
                'number'  => $this->formatPhoneNumber($row['wa_number'] ?? ''),
                'enabled' => ((int) ($row['wa_notif_enabled'] ?? 1)) !== 0
            ];
        } catch (PDOException $e) {
            return ['found' => false, 'number' => '', 'enabled' => true];
        }
    }

    // =========================================================================
    // PREFERENSI NOTIFIKASI PER PENGGUNA (tabel notification_preferences)
    // =========================================================================

    /** Semua kolom jenis notifikasi yang tersedia di database. */
    public const NOTIF_FLAG_COLUMNS = [
        'transaction_notifications',
        'order_notifications',
        'payment_notifications',
        'status_notifications',
        'shipping_notifications',
        'completion_notifications',
        'cancellation_notifications',
        'account_notifications',
        'announcement_notifications'
    ];

    /**
     * Daftar jenis notifikasi yang relevan untuk sebuah role.
     * - ADMIN     : transaksi, pengguna baru/akun, laporan & pengumuman
     * - PENJUAL   : pesanan baru, perubahan status, pembatalan
     * - PEMBELI   : konfirmasi pesanan, perubahan status, pengiriman,
     *               pesanan selesai, pesanan dibatalkan
     *
     * @param string $accountRole ADMIN | UMKM
     * @param string $mode        buyer | seller (mode kerja pelaku UMKM)
     * @return array<int, array{key: string, label: string, desc: string}>
     */
    public function notifTypesForRole(string $accountRole, string $mode = 'buyer'): array {
        if ($accountRole === 'ADMIN') {
            return [
                ['key' => 'transaction_notifications',   'label' => 'Notifikasi transaksi baru',            'desc' => 'Transaksi & pesanan baru di seluruh platform'],
                ['key' => 'account_notifications',       'label' => 'Notifikasi pengguna baru',             'desc' => 'Pendaftar baru dan informasi akun pengguna'],
                ['key' => 'announcement_notifications',  'label' => 'Notifikasi laporan & pengumuman admin', 'desc' => 'Laporan kendala sistem dan pengumuman platform']
            ];
        }

        if ($mode === 'seller') {
            return [
                ['key' => 'order_notifications',        'label' => 'Notifikasi pesanan baru',              'desc' => 'Saat pembeli membuat purchase order kepada Anda'],
                ['key' => 'status_notifications',       'label' => 'Notifikasi perubahan status pesanan',  'desc' => 'Status PO berubah: dikonfirmasi, diproses, selesai'],
                ['key' => 'cancellation_notifications', 'label' => 'Notifikasi pembatalan pesanan',        'desc' => 'PO dibatalkan oleh pembeli']
            ];
        }

        return [
            ['key' => 'payment_notifications',    'label' => 'Notifikasi konfirmasi pesanan & pembayaran', 'desc' => 'Konfirmasi PO dan tagihan pembayaran transaksi'],
            ['key' => 'status_notifications',     'label' => 'Notifikasi perubahan status pesanan',        'desc' => 'Status pesanan Anda berubah'],
            ['key' => 'shipping_notifications',   'label' => 'Notifikasi pesanan dikirim',                 'desc' => 'Pesanan sedang dikirim oleh penjual'],
            ['key' => 'completion_notifications', 'label' => 'Notifikasi pesanan selesai',                 'desc' => 'Pesanan diterima dan berhasil selesai'],
            ['key' => 'cancellation_notifications', 'label' => 'Notifikasi pesanan dibatalkan',            'desc' => 'Pesanan dibatalkan']
        ];
    }

    /**
     * Baca preferensi notifikasi lengkap milik seorang pengguna.
     *
     * @param string $userId
     * @return array {found: bool, number: string, enabled: bool,
     *                flags: array<string, bool>, updated_at: ?string}
     */
    public function getNotificationPrefs(string $userId): array {
        $defaultFlags = array_fill_keys(self::NOTIF_FLAG_COLUMNS, true);
        $result = [
            'found'      => false,
            'number'     => '',
            'enabled'    => true,
            'flags'      => $defaultFlags,
            'updated_at' => null
        ];

        if (empty($userId)) return $result;

        $pdo = Database::getConnection();
        if (!$pdo) return $result;

        try {
            Database::initTables();
            $stmt = $pdo->prepare("SELECT * FROM `notification_preferences` WHERE `user_id` = ? LIMIT 1");
            $stmt->execute([$userId]);
            $row = $stmt->fetch();

            if (!$row) return $result;

            $flags = $defaultFlags;
            foreach (self::NOTIF_FLAG_COLUMNS as $col) {
                $flags[$col] = ((int) ($row[$col] ?? 1)) !== 0;
            }

            return [
                'found'      => true,
                'number'     => $this->formatPhoneNumber($row['whatsapp_number'] ?? ''),
                'enabled'    => ((int) ($row['whatsapp_enabled'] ?? 1)) !== 0,
                'flags'      => $flags,
                'updated_at' => $row['updated_at'] ?? null
            ];
        } catch (PDOException $e) {
            return $result;
        }
    }

    /**
     * Cek apakah sebuah jenis notifikasi dipilih oleh pengguna.
     * Default: true (aktif) bila pengguna belum pernah menyimpan preferensi.
     *
     * @param string $userId
     * @param string $flag salah satu kolom NOTIF_FLAG_COLUMNS
     * @return bool
     */
    public function isNotifTypeEnabled(string $userId, string $flag): bool {
        if (!in_array($flag, self::NOTIF_FLAG_COLUMNS, true)) return true;

        $prefs = $this->getNotificationPrefs($userId);
        if (!$prefs['found']) return true;

        return (bool) ($prefs['flags'][$flag] ?? true);
    }

    /**
     * Simpan nomor WhatsApp + toggle global + pilihan jenis notifikasi.
     * Menulis ke `notification_preferences` (utama) DAN menyinkronkan kolom
     * legacy `users.wa_number` / `users.wa_notif_enabled`.
     *
     * @param string $userId
     * @param string $normalizedNumber Nomor sudah dinormalisasi (628xxx)
     * @param bool   $enabled          Toggle global notifikasi
     * @param array  $flags            Hanya kunci flag yang BOLEH diubah (sudah difilter role)
     * @param array  $profile          Data profil bila pengguna belum ada di tabel users
     * @return array {success: bool, message: string}
     */
    public function saveNotificationPrefs(string $userId, string $normalizedNumber, bool $enabled, array $flags = [], array $profile = []): array {
        if (empty($userId)) {
            return ['success' => false, 'message' => 'user_id diperlukan.'];
        }

        $pdo = Database::getConnection();
        if (!$pdo) {
            return ['success' => false, 'message' => 'Koneksi database tidak tersedia.'];
        }

        try {
            Database::initTables();
            $pdo->beginTransaction();

            // --- 1. Sinkronkan kolom legacy di tabel users ---
            $stmt = $pdo->prepare("SELECT `id` FROM `users` WHERE `id` = ? LIMIT 1");
            $stmt->execute([$userId]);
            $exists = (bool) $stmt->fetchColumn();

            if ($exists) {
                $upd = $pdo->prepare("
                    UPDATE `users`
                    SET `wa_number` = ?, `wa_notif_enabled` = ?, `wa_updated_at` = NOW()
                    WHERE `id` = ?
                ");
                $upd->execute([$normalizedNumber, $enabled ? 1 : 0, $userId]);
            } else {
                $ownerName    = $profile['ownerName'] ?? ($profile['owner_name'] ?? 'Pengguna DesaBiz');
                $businessName = $profile['businessName'] ?? ($profile['business_name'] ?? 'Usaha Desa');
                $email        = !empty($profile['email']) ? $profile['email'] : ('user_' . md5($userId) . '@desabiz.local');
                $phone        = !empty($profile['phone']) ? $profile['phone'] : $normalizedNumber;

                $ins = $pdo->prepare("
                    INSERT INTO `users`
                    (`id`, `owner_name`, `business_name`, `email`, `phone`,
                     `wa_number`, `wa_notif_enabled`, `wa_updated_at`, `role`, `account_role`)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 'buyer', 'UMKM')
                ");
                $ins->execute([$userId, $ownerName, $businessName, $email, $phone, $normalizedNumber, $enabled ? 1 : 0]);
            }

            // --- 2. Upsert notification_preferences (nomor + toggle global) ---
            $stmt = $pdo->prepare("SELECT `id` FROM `notification_preferences` WHERE `user_id` = ? LIMIT 1");
            $stmt->execute([$userId]);
            $hasPrefs = (bool) $stmt->fetchColumn();

            if ($hasPrefs) {
                $upd = $pdo->prepare("
                    UPDATE `notification_preferences`
                    SET `whatsapp_number` = ?, `whatsapp_enabled` = ?, `updated_at` = NOW()
                    WHERE `user_id` = ?
                ");
                $upd->execute([$normalizedNumber, $enabled ? 1 : 0, $userId]);
            } else {
                $ins = $pdo->prepare("
                    INSERT INTO `notification_preferences`
                    (`user_id`, `whatsapp_number`, `whatsapp_enabled`, `updated_at`)
                    VALUES (?, ?, ?, NOW())
                ");
                $ins->execute([$userId, $normalizedNumber, $enabled ? 1 : 0]);
            }

            // --- 3. Perbarui hanya flag yang dikirim & diizinkan role ---
            if ($flags) {
                $allowed = array_intersect_key($flags, array_flip(self::NOTIF_FLAG_COLUMNS));
                if ($allowed) {
                    $setParts = [];
                    $values  = [];
                    foreach ($allowed as $col => $val) {
                        $setParts[] = "`{$col}` = ?";
                        $values[]   = $val ? 1 : 0;
                    }
                    $setParts[] = "`updated_at` = NOW()";
                    $values[]   = $userId;

                    $upd = $pdo->prepare("UPDATE `notification_preferences` SET " . implode(', ', $setParts) . " WHERE `user_id` = ?");
                    $upd->execute($values);
                }
            }

            $pdo->commit();
            return ['success' => true, 'message' => 'Pengaturan notifikasi berhasil disimpan.'];
        } catch (PDOException $e) {
            if (isset($pdo) && $pdo->inTransaction()) {
                try { $pdo->rollBack(); } catch (Throwable $t) { /* abaikan */ }
            }
            return ['success' => false, 'message' => 'Gagal menyimpan pengaturan notifikasi ke database.'];
        }
    }

    /**
     * Tentukan nomor penerima notifikasi untuk sebuah user_id.
     * Prioritas: nomor WhatsApp yang disimpan pengguna di database.
     * Fallback : nomor yang ada pada data pesanan (buyerPhone/sellerPhone).
     *
     * @param string $userId
     * @param string $fallbackPhone
     * @return array {number: string, enabled: bool, source: string}
     */
    private function resolveRecipient(string $userId, string $fallbackPhone = ''): array {
        $settings = $this->getUserWaSettings($userId);

        if ($settings['found'] && !empty($settings['number'])) {
            return [
                'number'  => $settings['number'],
                'enabled' => $settings['enabled'],
                'source'  => 'db'
            ];
        }

        return [
            'number'  => $this->formatPhoneNumber($fallbackPhone),
            'enabled' => true,
            'source'  => 'fallback'
        ];
    }

    /**
     * Kirim pesan uji notifikasi ke nomor WhatsApp yang disimpan pengguna.
     *
     * @param string $userId
     * @param string $fallbackPhone Nomor cadangan jika pengaturan belum ada
     * @return array
     */
    public function sendTestToUser(string $userId, string $fallbackPhone = ''): array {
        $recipient = $this->resolveRecipient($userId, $fallbackPhone);

        if (!$recipient['enabled']) {
            return [
                'success' => false,
                'status'  => 'disabled',
                'message' => 'Notifikasi WhatsApp pengguna ini sedang dinonaktifkan.',
                'target'  => $recipient['number']
            ];
        }

        if (empty($recipient['number'])) {
            return [
                'success' => false,
                'status'  => 'no_number',
                'message' => 'Nomor WhatsApp pengguna belum diatur. Simpan nomor terlebih dahulu.',
                'target'  => ''
            ];
        }

        $msg = "Halo! Ini adalah *pesan uji* notifikasi WhatsApp dari *DesaBiz AI*.\n\n"
             . "Nomor WhatsApp terdaftar Anda: {$recipient['number']}\n"
             . "Waktu pengiriman: " . date('d M Y, H:i') . " WIB\n\n"
             . "Jika pesan ini masuk, pengaturan notifikasi Anda sudah benar. Terima kasih!";

        return $this->send($recipient['number'], $msg, [
            'transaction_id'   => 'WA-TEST-' . $userId,
            'event_type'       => 'user_test_ping',
            'recipient_role'   => 'user',
            'bypass_duplicate' => true
        ]);
    }

    /**
     * Cek apakah notifikasi untuk transaksi dan event tertentu sudah pernah terkirim (Anti-duplikasi).
     * 
     * @param string $transactionId
     * @param string $eventType
     * @param string $recipient
     * @return bool
     */
    public function isDuplicate(string $transactionId, string $eventType, string $recipient): bool {
        if (empty($transactionId) || empty($recipient)) return false;

        $formattedRecipient = $this->formatPhoneNumber($recipient);

        // 1. Cek pada database via Prepared Statement jika koneksi aktif
        $pdo = Database::getConnection();
        if ($pdo) {
            try {
                $stmt = $pdo->prepare("
                    SELECT COUNT(*) as total 
                    FROM `whatsapp_logs` 
                    WHERE `transaction_id` = ? 
                      AND `event_type` = ? 
                      AND `recipient` = ? 
                      AND `status` IN ('sent', 'simulated')
                      AND `created_at` >= (NOW() - INTERVAL 1 HOUR)
                ");
                $stmt->execute([$transactionId, $eventType, $formattedRecipient]);
                $count = (int) $stmt->fetchColumn();
                if ($count > 0) return true;
            } catch (PDOException $e) {
                // Lanjutkan pengecekan log file jika DB gagal
            }
        }

        // 2. Cek pada log file (fallback)
        if (file_exists($this->logFilePath)) {
            $lines = @file($this->logFilePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if ($lines) {
                $needle = "TrxID: {$transactionId} | Event: {$eventType} | Recipient: {$formattedRecipient}";
                // Cek 50 baris terakhir
                $recent = array_slice($lines, -50);
                foreach ($recent as $line) {
                    if (str_contains($line, $needle) && (str_contains($line, '[SENT]') || str_contains($line, '[SIMULATED]'))) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * Kirim pesan WhatsApp menggunakan Fonnte Gateway API.
     * 
     * @param string $target Nomor penerima
     * @param string $message Isi pesan
     * @param array $meta Metadata (transaction_id, event_type, recipient_role, bypass_duplicate)
     * @return array Status pengiriman
     */
    public function send(string $target, string $message, array $meta = []): array {
        $formattedTarget = $this->formatPhoneNumber($target);
        $transactionId   = $meta['transaction_id'] ?? 'TRX-UNKNOWN';
        $eventType       = $meta['event_type'] ?? 'general';
        $recipientRole   = $meta['recipient_role'] ?? 'user';
        $bypassDuplicate = $meta['bypass_duplicate'] ?? false;

        // 1. Validasi fitur aktif
        if (!FONNTE_ENABLED) {
            return [
                'success' => false,
                'status'  => 'disabled',
                'message' => 'Pengiriman notifikasi WhatsApp dinonaktifkan di konfigurasi.',
                'target'  => $formattedTarget
            ];
        }

        // 2. Validasi nomor penerima
        if (!$this->validatePhoneNumber($formattedTarget)) {
            $err = "Nomor WhatsApp tidak valid: '{$target}' (harus format nomor seluler Indonesia 628xxx).";
            $this->writeLog('FAILED', $eventType, $formattedTarget, $transactionId, $err);
            $this->logToDatabase($transactionId, $eventType, $formattedTarget, $recipientRole, $message, 'failed', $err);
            return [
                'success' => false,
                'status'  => 'invalid_number',
                'message' => $err,
                'target'  => $formattedTarget
            ];
        }

        // 3. Validasi isi pesan
        if (trim($message) === '') {
            return [
                'success' => false,
                'status'  => 'empty_message',
                'message' => 'Isi pesan WhatsApp tidak boleh kosong.',
                'target'  => $formattedTarget
            ];
        }

        // 4. Pencegahan Pengiriman Ganda (Anti-Duplikasi)
        if (!$bypassDuplicate && $this->isDuplicate($transactionId, $eventType, $formattedTarget)) {
            $msg = "Notifikasi diabaikan karena sudah pernah terkirim untuk transaksi ini.";
            $this->writeLog('DUPLICATE_SKIPPED', $eventType, $formattedTarget, $transactionId, $msg);
            return [
                'success' => true,
                'status'  => 'duplicate_skipped',
                'message' => $msg,
                'target'  => $formattedTarget
            ];
        }

        // 5. Cek apakah Token Fonnte adalah Token Asli atau Placeholder
        if (!fonnte_is_live()) {
            // Mode Simulasi / Placeholder Token
            $simMsg = "Mode Simulasi: Token Fonnte masih placeholder (FONNTE_API_TOKEN). Pesan siap dikirim saat token diatur.";
            $this->writeLog('SIMULATED', $eventType, $formattedTarget, $transactionId, $message);
            $this->logToDatabase($transactionId, $eventType, $formattedTarget, $recipientRole, $message, 'simulated', json_encode(['simulation' => true, 'note' => $simMsg]));

            return [
                'success'  => true,
                'status'   => 'simulated',
                'message'  => $simMsg,
                'target'   => $formattedTarget,
                'preview'  => $message
            ];
        }

        // 6. Pengiriman Nyata melalui cURL ke Fonnte API
        return $this->executeCurlSend($formattedTarget, $message, $transactionId, $eventType, $recipientRole);
    }

    /**
     * Eksekusi HTTP Request POST via cURL ke Fonnte API
     */
    private function executeCurlSend(string $target, string $message, string $transactionId, string $eventType, string $recipientRole): array {
        $token = fonnte_get_token();

        $postData = [
            'target'      => $target,
            'message'     => $message,
            'countryCode' => FONNTE_COUNTRY_CODE,
        ];

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => FONNTE_API_URL,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $postData,
            CURLOPT_HTTPHEADER     => [
                'Authorization: ' . $token
            ],
            CURLOPT_TIMEOUT        => 20,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => true
        ]);

        $rawResponse = curl_exec($ch);
        $httpCode    = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError   = curl_error($ch);
        curl_close($ch);

        if ($rawResponse === false || !empty($curlError)) {
            $err = "cURL Error ({$httpCode}): " . ($curlError ?: 'Gagal terhubung ke Fonnte');
            $this->writeLog('FAILED', $eventType, $target, $transactionId, $err);
            $this->logToDatabase($transactionId, $eventType, $target, $recipientRole, $message, 'failed', $err);
            return [
                'success' => false,
                'status'  => 'curl_error',
                'message' => $err,
                'target'  => $target
            ];
        }

        $json = json_decode($rawResponse, true);
        $isSuccess = ($httpCode >= 200 && $httpCode < 300) && (isset($json['status']) && $json['status'] === true);

        if ($isSuccess) {
            $this->writeLog('SENT', $eventType, $target, $transactionId, "Sukses terkirim via Fonnte");
            $this->logToDatabase($transactionId, $eventType, $target, $recipientRole, $message, 'sent', $rawResponse);
            return [
                'success'  => true,
                'status'   => 'sent',
                'message'  => 'Pesan WhatsApp berhasil dikirim via Fonnte.',
                'target'   => $target,
                'response' => $json
            ];
        } else {
            $reason = $json['reason'] ?? ($json['message'] ?? "HTTP Status {$httpCode}");
            $this->writeLog('FAILED', $eventType, $target, $transactionId, "Fonnte error: {$reason}");
            $this->logToDatabase($transactionId, $eventType, $target, $recipientRole, $message, 'failed', $rawResponse);
            return [
                'success'  => false,
                'status'   => 'api_error',
                'message'  => "Fonnte menolak pengiriman: {$reason}",
                'target'   => $target,
                'response' => $json
            ];
        }
    }

    /**
     * Tulis riwayat notifikasi ke file logs/whatsapp.log
     */
    private function writeLog(string $status, string $eventType, string $recipient, string $trxId, string $detail): void {
        $timestamp = date('Y-m-d H:i:s');
        $cleanDetail = str_replace(["\r", "\n"], ' ', substr($detail, 0, 300));
        $line = sprintf("[%s] [%s] TrxID: %s | Event: %s | Recipient: %s | %s\n",
            $timestamp,
            strtoupper($status),
            $trxId ?: '-',
            $eventType ?: 'general',
            $recipient ?: '-',
            $cleanDetail
        );
        @file_put_contents($this->logFilePath, $line, FILE_APPEND | LOCK_EX);
    }

    /**
     * Tulis riwayat notifikasi ke tabel whatsapp_logs di database MySQL
     */
    private function logToDatabase(string $trxId, string $eventType, string $recipient, string $role, string $message, string $status, ?string $response): void {
        $pdo = Database::getConnection();
        if (!$pdo) return;

        try {
            Database::initTables();
            $stmt = $pdo->prepare("
                INSERT INTO `whatsapp_logs` 
                (`transaction_id`, `event_type`, `recipient`, `recipient_role`, `message`, `status`, `response`, `created_at`)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                $trxId,
                $eventType,
                $recipient,
                $role,
                $message,
                $status,
                $response
            ]);
        } catch (PDOException $e) {
            // Jangan menghentikan jalannya aplikasi jika pencatatan DB gagal
        }
    }

    // ==========================================
    // TEMPLATE PESAN RESMI (Sesuai Spesifikasi)
    // ==========================================

    /**
     * Template pesan untuk Pembeli saat pesanan baru berhasil dibuat
     * Sesuai format PRD:
     * 
     * Halo *{nama_pembeli}*!
     * 
     * Pesanan Anda berhasil dibuat di *DesaBiz AI*.
     * 
     * Detail transaksi:
     * - Nomor transaksi: {kode_transaksi}
     * - Produk: {nama_produk}
     * - Jumlah: {jumlah}
     * - Total pembayaran: {total_harga}
     * - Status: {status_transaksi}
     * 
     * Terima kasih telah menggunakan DesaBiz AI.
     */
    /**
     * Format jumlah (quantity) pesan secara aman.
     * Menerima angka maupun teks (mis. "10 karung") tanpa menyebabkan fatal error.
     *
     * @param mixed $qty
     * @return string
     */
    private function fmtQty($qty): string {
        if ($qty === null || $qty === '') return '1';
        if (is_numeric($qty)) return number_format((float) $qty, 0, ',', '.');
        return trim((string) $qty);
    }

    /**
     * Format total harga (Rp) secara aman.
     * Menerima angka (5000000), teks angka ("5.000.000"), atau teks "Rp 5.000.000".
     *
     * @param mixed $total
     * @return string
     */
    private function fmtTotal($total): string {
        if (is_numeric($total)) return 'Rp ' . number_format((float) $total, 0, ',', '.');
        $s = trim((string) $total);
        if ($s === '') return 'Rp 0';
        if (preg_match('/^rp\s*/i', $s)) return 'Rp ' . trim(preg_replace('/^rp\s*/i', '', $s));
        return 'Rp ' . $s;
    }

    public function formatBuyerOrderMessage(array $order): string {
        $buyerName   = $order['buyerName'] ?? $order['buyer_name'] ?? 'Pelanggan';
        $trxCode     = $order['id'] ?? $order['order_id'] ?? $order['transaction_id'] ?? '-';
        $productName = $order['productName'] ?? $order['product_name'] ?? 'Komoditas Desa';
        $qty         = $this->fmtQty($order['quantity'] ?? '1');
        $unit        = $order['productUnit'] ?? $order['unit'] ?? 'Unit';
        $totalRaw    = $order['totalAmount'] ?? $order['total_price'] ?? $order['total'] ?? null;
        $totalPrice  = $totalRaw !== null ? $this->fmtTotal($totalRaw) : 'Rp 0';
        $status      = $order['status'] ?? 'Menunggu';

        return "Halo *{$buyerName}*!\n\n"
             . "Pesanan Anda berhasil dibuat di *DesaBiz AI*.\n\n"
             . "Detail transaksi:\n"
             . "- Nomor transaksi: {$trxCode}\n"
             . "- Produk: {$productName}\n"
             . "- Jumlah: {$qty} {$unit}\n"
             . "- Total pembayaran: {$totalPrice}\n"
             . "- Status: {$status}\n\n"
             . "Terima kasih telah menggunakan DesaBiz AI.";
    }

    /**
     * Template pesan untuk Penjual saat menerima pesanan baru
     * Sesuai format PRD:
     * 
     * Halo *{nama_penjual}*!
     * 
     * Anda mendapatkan pesanan baru melalui DesaBiz AI.
     * 
     * Detail pesanan:
     * - Pembeli: {nama_pembeli}
     * - Produk: {nama_produk}
     * - Jumlah: {jumlah}
     * - Total: {total_harga}
     * - Kode transaksi: {kode_transaksi}
     * 
     * Silakan periksa dashboard untuk memproses pesanan.
     */
    public function formatSellerOrderMessage(array $order): string {
        $sellerName  = $order['sellerName'] ?? $order['seller_name'] ?? 'Mitra Penjual';
        $buyerName   = $order['buyerName'] ?? $order['buyer_name'] ?? 'Pembeli';
        $trxCode     = $order['id'] ?? $order['order_id'] ?? $order['transaction_id'] ?? '-';
        $productName = $order['productName'] ?? $order['product_name'] ?? 'Komoditas Desa';
        $qty         = $this->fmtQty($order['quantity'] ?? '1');
        $unit        = $order['productUnit'] ?? $order['unit'] ?? 'Unit';
        $totalRaw    = $order['totalAmount'] ?? $order['total_price'] ?? $order['total'] ?? null;
        $totalPrice  = $totalRaw !== null ? $this->fmtTotal($totalRaw) : 'Rp 0';

        return "Halo *{$sellerName}*!\n\n"
             . "Anda mendapatkan pesanan baru melalui DesaBiz AI.\n\n"
             . "Detail pesanan:\n"
             . "- Pembeli: {$buyerName}\n"
             . "- Produk: {$productName}\n"
             . "- Jumlah: {$qty} {$unit}\n"
             . "- Total: {$totalPrice}\n"
             . "- Kode transaksi: {$trxCode}\n\n"
             . "Silakan periksa dashboard untuk memproses pesanan.";
    }

    /**
     * Template pesan untuk Administrator saat terjadi pesanan baru
     */
    public function formatAdminOrderMessage(array $order): string {
        $trxCode     = $order['id'] ?? $order['order_id'] ?? $order['transaction_id'] ?? '-';
        $buyerName   = $order['buyerName'] ?? $order['buyer_name'] ?? '-';
        $sellerName  = $order['sellerName'] ?? $order['seller_name'] ?? '-';
        $productName = $order['productName'] ?? $order['product_name'] ?? 'Komoditas Desa';
        $qty         = $this->fmtQty($order['quantity'] ?? '1');
        $unit        = $order['productUnit'] ?? $order['unit'] ?? 'Unit';
        $totalRaw    = $order['totalAmount'] ?? $order['total_price'] ?? $order['total'] ?? null;
        $totalPrice  = $totalRaw !== null ? $this->fmtTotal($totalRaw) : 'Rp 0';
        $time        = date('d M Y, H:i');

        return "Halo *Admin DesaBiz AI*!\n\n"
             . "Terdapat transaksi pesanan baru di platform.\n\n"
             . "Detail pesanan:\n"
             . "- Kode transaksi: {$trxCode}\n"
             . "- Pembeli: {$buyerName}\n"
             . "- Penjual: {$sellerName}\n"
             . "- Produk: {$productName} ({$qty} {$unit})\n"
             . "- Total: {$totalPrice}\n"
             . "- Waktu: {$time} WIB\n\n"
             . "Silakan periksa Panel Admin untuk memantau transaksi.";
    }

    /**
     * Template pesan notifikasi saat terjadi Perubahan Status Pesanan
     * 
     * Status yang didukung:
     * - Menunggu
     * - Diproses
     * - Dikonfirmasi / Dikirim
     * - Selesai
     * - Dibatalkan
     */
    public function formatStatusChangeMessage(array $order, string $oldStatus, string $newStatus, string $note = '', string $recipientName = 'Pengguna'): string {
        $trxCode     = $order['id'] ?? $order['order_id'] ?? '-';
        $productName = $order['productName'] ?? $order['product_name'] ?? 'Komoditas';
        $qty         = $this->fmtQty($order['quantity'] ?? '1');
        $unit        = $order['productUnit'] ?? $order['unit'] ?? 'Unit';

        // Penjelasan status yang user-friendly
        $statusDescriptions = [
            'Menunggu'     => 'Pesanan telah dibuat dan sedang menunggu konfirmasi penjual.',
            'Diproses'     => 'Pesanan telah diterima dan barang sedang dipersiapkan di gudang penjual.',
            'Dikonfirmasi' => 'Pesanan siap dan armada pengiriman logistik telah dijadwalkan.',
            'Dikirim'      => 'Pesanan sedang dalam perjalanan ke alamat gudang tujuan Anda.',
            'Selesai'      => 'Pesanan telah selesai diterima dan transaksi dinyatakan lunas.',
            'Dibatalkan'   => 'Pesanan telah dibatalkan.'
        ];

        $desc = $note ?: ($statusDescriptions[$newStatus] ?? 'Status pesanan Anda telah diperbarui.');

        return "Halo *{$recipientName}*!\n\n"
             . "Status pesanan Anda di *DesaBiz AI* telah diperbarui.\n\n"
             . "Detail pesanan:\n"
             . "- Nomor transaksi: {$trxCode}\n"
             . "- Produk: {$productName}\n"
             . "- Jumlah: {$qty} {$unit}\n"
             . "- Status sebelumnya: {$oldStatus}\n"
             . "- Status terbaru: *{$newStatus}*\n"
             . "- Catatan: {$desc}\n\n"
             . "Silakan buka website DesaBiz AI untuk melihat detail selengkapnya.";
    }

    // ==========================================
    // WORKFLOW NOTIFIKASI TINGKAT TINGGI
    // ==========================================

    /**
     * Notifikasi Transaksi Baru (Kirim otomatis ke Pembeli, Penjual, dan Admin)
     * 
     * @param array $orderData
     * @return array Ringkasan pengiriman
     */
    public function notifyNewOrder(array $orderData): array {
        $results = [
            'buyer'  => null,
            'seller' => null,
            'admin'  => null
        ];

        $trxId = $orderData['id'] ?? $orderData['order_id'] ?? 'TRX-' . time();

        // 1. Notifikasi ke Pembeli (nomor dari pengaturan pengguna di DB)
        if (FONNTE_NOTIFY_BUYER) {
            $buyerId     = $orderData['buyerId'] ?? $orderData['buyer_id'] ?? '';
            $buyerPhone  = $orderData['buyerPhone'] ?? $orderData['buyer_phone'] ?? '';
            // Jika nomor tidak ada di field order, coba ambil dari buyerContact misal 'Budi (081234567890)'
            if (empty($buyerPhone) && !empty($orderData['buyerContact'])) {
                if (preg_match('/\(?([0-9\+\s\-]+)\)?/', $orderData['buyerContact'], $m)) {
                    $buyerPhone = $m[1];
                }
            }

            $recipient = $this->resolveRecipient($buyerId, $buyerPhone);

            if (!$recipient['enabled']) {
                $results['buyer'] = [
                    'success' => true,
                    'status'  => 'disabled',
                    'message' => 'Pengguna menonaktifkan notifikasi WhatsApp.',
                    'target'  => $recipient['number']
                ];
            } elseif (!$this->isNotifTypeEnabled($buyerId, 'payment_notifications')) {
                $results['buyer'] = [
                    'success' => true,
                    'status'  => 'pref_disabled',
                    'message' => 'Pembeli tidak memilih notifikasi konfirmasi pesanan di Pengaturan Notifikasi WhatsApp.',
                    'target'  => $recipient['number']
                ];
            } elseif (!empty($recipient['number'])) {
                $msg = $this->formatBuyerOrderMessage($orderData);
                $results['buyer'] = $this->send($recipient['number'], $msg, [
                    'transaction_id' => $trxId,
                    'event_type'     => 'order_created_buyer',
                    'recipient_role' => 'buyer'
                ]);
            }
        }

        // 2. Notifikasi ke Penjual (nomor dari pengaturan pengguna di DB)
        if (FONNTE_NOTIFY_SELLER) {
            $sellerId     = $orderData['sellerId'] ?? $orderData['seller_id'] ?? '';
            $sellerPhone  = $orderData['sellerPhone'] ?? $orderData['seller_phone'] ?? '';
            if (empty($sellerPhone) && !empty($orderData['sellerContact'])) {
                if (preg_match('/\(?([0-9\+\s\-]+)\)?/', $orderData['sellerContact'], $m)) {
                    $sellerPhone = $m[1];
                }
            }

            $recipient = $this->resolveRecipient($sellerId, $sellerPhone);

            if (!$recipient['enabled']) {
                $results['seller'] = [
                    'success' => true,
                    'status'  => 'disabled',
                    'message' => 'Pengguna menonaktifkan notifikasi WhatsApp.',
                    'target'  => $recipient['number']
                ];
            } elseif (!$this->isNotifTypeEnabled($sellerId, 'order_notifications')) {
                $results['seller'] = [
                    'success' => true,
                    'status'  => 'pref_disabled',
                    'message' => 'Penjual tidak memilih notifikasi pesanan baru di Pengaturan Notifikasi WhatsApp.',
                    'target'  => $recipient['number']
                ];
            } elseif (!empty($recipient['number'])) {
                $msg = $this->formatSellerOrderMessage($orderData);
                $results['seller'] = $this->send($recipient['number'], $msg, [
                    'transaction_id' => $trxId,
                    'event_type'     => 'order_created_seller',
                    'recipient_role' => 'seller'
                ]);
            }
        }

        // 3. Notifikasi ke Administrator Platform (nomor Admin dari pengaturan di DB)
        if (FONNTE_NOTIFY_ADMIN) {
            $recipient = $this->resolveRecipient('usr_admin', defined('FONNTE_ADMIN_PHONE') ? FONNTE_ADMIN_PHONE : '');

            if (!$recipient['enabled']) {
                $results['admin'] = [
                    'success' => true,
                    'status'  => 'disabled',
                    'message' => 'Admin menonaktifkan notifikasi WhatsApp.',
                    'target'  => $recipient['number']
                ];
            } elseif (!$this->isNotifTypeEnabled('usr_admin', 'transaction_notifications')) {
                $results['admin'] = [
                    'success' => true,
                    'status'  => 'pref_disabled',
                    'message' => 'Admin tidak memilih notifikasi transaksi baru di Pengaturan Notifikasi WhatsApp.',
                    'target'  => $recipient['number']
                ];
            } else {
                $msg = $this->formatAdminOrderMessage($orderData);
                $results['admin'] = $this->send($recipient['number'], $msg, [
                    'transaction_id' => $trxId,
                    'event_type'     => 'order_created_admin',
                    'recipient_role' => 'admin'
                ]);
            }
        }

        return $results;
    }

    /**
     * Petakan status pesanan baru ke jenis notifikasi yang dipilih penerima.
     * - Dibatalkan  -> cancellation_notifications
     * - Dikirim     -> shipping_notifications
     * - Selesai     -> completion_notifications (pembeli) / status_notifications (penjual)
     * - Lainnya     -> status_notifications
     *
     * @param string $newStatus
     * @param string $role buyer|seller
     * @return string salah satu kolom NOTIF_FLAG_COLUMNS
     */
    private function statusChangeFlag(string $newStatus, string $role): string {
        $s = strtolower($newStatus);

        if (str_contains($s, 'batal')) return 'cancellation_notifications';
        if (str_contains($s, 'kirim')) return 'shipping_notifications';
        if (str_contains($s, 'selesai')) {
            return $role === 'seller' ? 'status_notifications' : 'completion_notifications';
        }
        return 'status_notifications';
    }

    /**
     * Notifikasi Perubahan Status Pesanan (Kirim ke Pembeli dan Penjual)
     * 
     * @param array $orderData
     * @param string $oldStatus
     * @param string $newStatus
     * @param string $note
     * @return array
     */
    public function notifyOrderStatusChange(array $orderData, string $oldStatus, string $newStatus, string $note = ''): array {
        $results = [
            'buyer'  => null,
            'seller' => null
        ];

        if (!FONNTE_NOTIFY_STATUS_CHANGE) return $results;

        $trxId = $orderData['id'] ?? $orderData['order_id'] ?? 'TRX-' . time();

        // 1. Kirim ke Pembeli (nomor dari pengaturan pengguna di DB)
        $buyerId    = $orderData['buyerId'] ?? $orderData['buyer_id'] ?? '';
        $buyerPhone = $orderData['buyerPhone'] ?? $orderData['buyer_phone'] ?? '';
        if (empty($buyerPhone) && !empty($orderData['buyerContact'])) {
            if (preg_match('/\(?([0-9\+\s\-]+)\)?/', $orderData['buyerContact'], $m)) {
                $buyerPhone = $m[1];
            }
        }
        $buyerName = $orderData['buyerName'] ?? 'Pembeli';

        $recipient = $this->resolveRecipient($buyerId, $buyerPhone);

        if (!$recipient['enabled']) {
            $results['buyer'] = [
                'success' => true,
                'status'  => 'disabled',
                'message' => 'Pengguna menonaktifkan notifikasi WhatsApp.',
                'target'  => $recipient['number']
            ];
        } elseif (!$this->isNotifTypeEnabled($buyerId, $this->statusChangeFlag($newStatus, 'buyer'))) {
            $results['buyer'] = [
                'success' => true,
                'status'  => 'pref_disabled',
                'message' => "Pembeli tidak memilih notifikasi status '{$newStatus}' di Pengaturan Notifikasi WhatsApp.",
                'target'  => $recipient['number']
            ];
        } elseif (!empty($recipient['number'])) {
            $msgBuyer = $this->formatStatusChangeMessage($orderData, $oldStatus, $newStatus, $note, $buyerName);
            $results['buyer'] = $this->send($recipient['number'], $msgBuyer, [
                'transaction_id' => $trxId,
                'event_type'     => 'status_change_' . strtolower(str_replace([' ', '/'], '_', $newStatus)),
                'recipient_role' => 'buyer'
            ]);
        }

        // 2. Kirim ke Penjual (hanya jika dibatalkan atau selesai oleh pembeli)
        if (in_array($newStatus, ['Selesai', 'Dibatalkan'])) {
            $sellerId     = $orderData['sellerId'] ?? $orderData['seller_id'] ?? '';
            $sellerPhone  = $orderData['sellerPhone'] ?? $orderData['seller_phone'] ?? '';
            if (empty($sellerPhone) && !empty($orderData['sellerContact'])) {
                if (preg_match('/\(?([0-9\+\s\-]+)\)?/', $orderData['sellerContact'], $m)) {
                    $sellerPhone = $m[1];
                }
            }
            $sellerName = $orderData['sellerName'] ?? 'Penjual';

            $recipientSeller = $this->resolveRecipient($sellerId, $sellerPhone);

            if (!$recipientSeller['enabled']) {
                $results['seller'] = [
                    'success' => true,
                    'status'  => 'disabled',
                    'message' => 'Pengguna menonaktifkan notifikasi WhatsApp.',
                    'target'  => $recipientSeller['number']
                ];
            } elseif (!$this->isNotifTypeEnabled($sellerId, $this->statusChangeFlag($newStatus, 'seller'))) {
                $results['seller'] = [
                    'success' => true,
                    'status'  => 'pref_disabled',
                    'message' => "Penjual tidak memilih notifikasi status '{$newStatus}' di Pengaturan Notifikasi WhatsApp.",
                    'target'  => $recipientSeller['number']
                ];
            } elseif (!empty($recipientSeller['number'])) {
                $msgSeller = $this->formatStatusChangeMessage($orderData, $oldStatus, $newStatus, $note, $sellerName);
                $results['seller'] = $this->send($recipientSeller['number'], $msgSeller, [
                    'transaction_id' => $trxId,
                    'event_type'     => 'status_change_' . strtolower(str_replace([' ', '/'], '_', $newStatus)) . '_seller',
                    'recipient_role' => 'seller'
                ]);
            }
        }

        return $results;
    }

    /**
     * Template pesan notifikasi pendaftar baru untuk Administrator
     * Dipicu otomatis setelah registrasi UMKM berhasil.
     */
    public function formatRegistrationMessage(array $data): string {
        $ownerName   = $data['ownerName'] ?? $data['owner_name'] ?? 'Pengguna Baru';
        $business    = $data['businessName'] ?? $data['business_name'] ?? '-';
        $email       = $data['email'] ?? '-';
        $phone       = $data['phone'] ?? '';
        $time        = date('d M Y, H:i') . ' WIB';

        $msg = "Halo *Admin DesaBiz AI*!\n\n"
             . "Terdapat pendaftar baru di platform.\n\n"
             . "Detail pendaftar:\n"
             . "- Nama pemilik: {$ownerName}\n"
             . "- Email: {$email}\n";

        if (!empty($phone)) {
            $msg .= "- WhatsApp: {$phone}\n";
        }

        if ($business !== '-') {
            $msg .= "- Nama usaha: {$business}\n";
        }

        $msg .= "- Waktu: {$time}\n\n"
              . "Silakan verifikasi akun melalui Panel Admin.";

        return $msg;
    }

    /**
     * Kirim notifikasi pendaftar baru ke Administrator (via FONNTE_ADMIN_PHONE).
     *
     * @param array $registrationData Data pendaftar (ownerName, email, phone, businessName)
     * @return array Hasil pengiriman
     */
    public function notifyNewRegistration(array $registrationData): array {
        if (!FONNTE_NOTIFY_ADMIN) {
            return ['admin' => ['success' => false, 'status' => 'disabled', 'message' => 'Notifikasi admin dinonaktifkan.']];
        }

        $regId = !empty($registrationData['email']) ? 'REG-' . substr(md5($registrationData['email']), 0, 10) : 'REG-' . time();
        $msg   = $this->formatRegistrationMessage($registrationData);

        // Penerima: nomor WhatsApp Admin yang tersimpan di DB (fallback FONNTE_ADMIN_PHONE)
        $recipient = $this->resolveRecipient('usr_admin', defined('FONNTE_ADMIN_PHONE') ? FONNTE_ADMIN_PHONE : '');

        if (!$recipient['enabled']) {
            return ['admin' => [
                'success' => true,
                'status'  => 'disabled',
                'message' => 'Admin menonaktifkan notifikasi WhatsApp.',
                'target'  => $recipient['number']
            ]];
        }

        if (!$this->isNotifTypeEnabled('usr_admin', 'account_notifications')) {
            return ['admin' => [
                'success' => true,
                'status'  => 'pref_disabled',
                'message' => 'Admin tidak memilih notifikasi pengguna baru di Pengaturan Notifikasi WhatsApp.',
                'target'  => $recipient['number']
            ]];
        }

        $result = $this->send($recipient['number'], $msg, [
            'transaction_id' => $regId,
            'event_type'     => 'registration_new',
            'recipient_role' => 'admin'
        ]);

        return ['admin' => $result];
    }

    /**
     * Dapatkan daftar log notifikasi terbaru (dari database jika ada, atau file)
     * 
     * @param int $limit
     * @return array
     */
    public function getLogs(int $limit = 50): array {
        $pdo = Database::getConnection();
        if ($pdo) {
            try {
                Database::initTables();
                $stmt = $pdo->prepare("SELECT * FROM `whatsapp_logs` ORDER BY `id` DESC LIMIT ?");
                $stmt->bindValue(1, $limit, PDO::PARAM_INT);
                $stmt->execute();
                return $stmt->fetchAll();
            } catch (PDOException $e) {}
        }

        // Fallback: baca dari file log
        if (!file_exists($this->logFilePath)) return [];
        $lines = @file($this->logFilePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (!$lines) return [];

        $parsed = [];
        $recent = array_slice($lines, -$limit);
        foreach (array_reverse($recent) as $line) {
            if (str_starts_with($line, '#')) continue;
            $parsed[] = ['raw' => $line];
        }
        return $parsed;
    }
}

