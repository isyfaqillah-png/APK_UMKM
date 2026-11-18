<?php
/**
 * DesaBiz AI - WhatsApp Controller
 * 
 * Controller ini menangani permintaan API terkait notifikasi WhatsApp Fonnte:
 * - Event Transaksi / Pesanan Baru (notify_order)
 * - Event Perubahan Status Pesanan (notify_status)
 * - Pengiriman Pesan Langsung (send_direct)
 * - Pengujian Koneksi Fonnte (test_connection)
 * - Monitoring Log Notifikasi (get_logs)
 */

require_once __DIR__ . '/../services/WhatsAppService.php';

class WhatsAppController {
    private WhatsAppService $service;

    public function __construct() {
        $this->service = WhatsAppService::getInstance();
    }

    /**
     * Dispatcher utama permintaan API
     */
    public function handleRequest(): void {
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
            http_response_code(200);
            exit();
        }

        // Ambil input body JSON atau POST
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true) ?: $_POST;

        $action = $_GET['action'] ?? ($data['action'] ?? 'status');

        switch ($action) {
            case 'notify_order':
                $this->handleNotifyOrder($data);
                break;

            case 'notify_status':
                $this->handleNotifyStatus($data);
                break;

            case 'notify_registration':
                $this->handleNotifyRegistration($data);
                break;

            case 'send_direct':
                $this->handleSendDirect($data);
                break;

            case 'test_connection':
                $this->handleTestConnection($data);
                break;

            case 'get_logs':
                $this->handleGetLogs();
                break;

            case 'status':
            default:
                $this->handleStatus();
                break;
        }
    }

    /**
     * Event Notifikasi Pesanan / Transaksi Baru
     */
    private function handleNotifyOrder(array $data): void {
        $orderData = $data['order'] ?? $data;

        if (empty($orderData) || (empty($orderData['id']) && empty($orderData['order_id']))) {
            http_response_code(400);
            echo json_encode([
                'status'  => 'error',
                'message' => 'Data pesanan tidak lengkap (diperlukan minimal order id).'
            ], JSON_UNESCAPED_UNICODE);
            return;
        }

        $results = $this->service->notifyNewOrder($orderData);

        echo json_encode([
            'status'    => 'success',
            'message'   => 'Proses notifikasi WhatsApp transaksi selesai.',
            'timestamp' => date('Y-m-d H:i:s'),
            'results'   => $results
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

    /**
     * Event Notifikasi Perubahan Status Pesanan
     */
    private function handleNotifyStatus(array $data): void {
        $orderData = $data['order'] ?? $data;
        $oldStatus = $data['old_status'] ?? ($data['oldStatus'] ?? 'Menunggu');
        $newStatus = $data['new_status'] ?? ($data['newStatus'] ?? ($orderData['status'] ?? 'Diproses'));
        $note      = $data['note'] ?? '';

        if (empty($orderData)) {
            http_response_code(400);
            echo json_encode([
                'status'  => 'error',
                'message' => 'Data pesanan diperlukan untuk notifikasi perubahan status.'
            ], JSON_UNESCAPED_UNICODE);
            return;
        }

        $results = $this->service->notifyOrderStatusChange($orderData, $oldStatus, $newStatus, $note);

        echo json_encode([
            'status'    => 'success',
            'message'   => "Proses notifikasi perubahan status ke '{$newStatus}' selesai.",
            'timestamp' => date('Y-m-d H:i:s'),
            'results'   => $results
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

    /**
     * Event Notifikasi Pendaftar Baru (ke Administrator)
     */
    private function handleNotifyRegistration(array $data): void {
        $regData = $data['registration'] ?? ($data['data'] ?? $data);

        if (empty($regData) || (empty($regData['ownerName']) && empty($regData['email']))) {
            http_response_code(400);
            echo json_encode([
                'status'  => 'error',
                'message' => 'Data pendaftar tidak lengkap (diperlukan ownerName atau email).'
            ], JSON_UNESCAPED_UNICODE);
            return;
        }

        $results = $this->service->notifyNewRegistration($regData);

        echo json_encode([
            'status'    => 'success',
            'message'   => 'Proses notifikasi pendaftar baru ke Admin selesai.',
            'timestamp' => date('Y-m-d H:i:s'),
            'results'   => $results
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

    /**
     * Pengiriman Pesan Langsung
     */
    private function handleSendDirect(array $data): void {
        $target  = $data['target'] ?? ($data['to'] ?? '');
        $message = $data['message'] ?? '';
        $trxId   = $data['transaction_id'] ?? 'DIRECT-' . time();

        if (empty($target) || empty($message)) {
            http_response_code(400);
            echo json_encode([
                'status'  => 'error',
                'message' => 'Parameter target (nomor WhatsApp) dan message wajib diisi.'
            ], JSON_UNESCAPED_UNICODE);
            return;
        }

        $result = $this->service->send($target, $message, [
            'transaction_id' => $trxId,
            'event_type'     => 'direct_message',
            'bypass_duplicate' => true
        ]);

        echo json_encode([
            'status'    => $result['success'] ? 'success' : 'error',
            'result'    => $result,
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

    /**
     * Pengujian Koneksi Fonnte & Pengiriman Pesan Uji Coba
     */
    private function handleTestConnection(array $data): void {
        $isLive = fonnte_is_live();
        $target = $data['target'] ?? ($data['to'] ?? FONNTE_ADMIN_PHONE);
        $token  = fonnte_get_token();

        $info = [
            'gateway'       => 'Fonnte WhatsApp Gateway',
            'endpoint'      => FONNTE_API_URL,
            'is_live'       => $isLive,
            'token_status'  => $isLive ? 'Aktif (Token Pribadi Terpasang)' : 'Mode Simulasi (Placeholder FONNTE_API_TOKEN)',
            'token_mask'    => $isLive ? substr($token, 0, 4) . '***' . substr($token, -4) : 'FONNTE_API_TOKEN',
            'admin_phone'   => FONNTE_ADMIN_PHONE,
            'database_conn' => Database::isConnected() ? 'Terkoneksi (MySQL)' : 'Fallback Log File (' . Database::getLastError() . ')'
        ];

        // Jika diminta mengirim pesan uji coba
        $sendTest = isset($data['send_test']) && ($data['send_test'] === true || $data['send_test'] === 'true' || $data['send_test'] === 1);
        $testResult = null;

        if ($sendTest && !empty($target)) {
            $testMsg = "Halo! Ini adalah pesan uji coba integrasi *Fonnte WhatsApp Gateway* pada sistem *DesaBiz AI*.\n\nWaktu kirim: " . date('d M Y, H:i:s') . " WIB.\nStatus: Gateway siap digunakan!";
            $testResult = $this->service->send($target, $testMsg, [
                'transaction_id'   => 'TEST-' . time(),
                'event_type'       => 'test_ping',
                'bypass_duplicate' => true
            ]);
        }

        echo json_encode([
            'status'      => 'success',
            'system_info' => $info,
            'test_result' => $testResult,
            'timestamp'   => date('Y-m-d H:i:s')
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

    /**
     * Dapatkan Log Notifikasi Terbaru
     */
    private function handleGetLogs(): void {
        $limit = isset($_GET['limit']) ? max(1, min(200, (int)$_GET['limit'])) : 50;
        $logs = $this->service->getLogs($limit);

        echo json_encode([
            'status'    => 'success',
            'total'     => count($logs),
            'logs'      => $logs,
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

    /**
     * Cek Status Layanan WhatsApp
     */
    private function handleStatus(): void {
        echo json_encode([
            'status'         => 'online',
            'gateway'        => 'Fonnte WhatsApp Gateway',
            'mode'           => fonnte_is_live() ? 'live' : 'simulation',
            'database'       => Database::isConnected() ? 'connected' : 'offline_fallback_file_log',
            'timestamp'      => date('Y-m-d H:i:s'),
            'available_apis' => [
                'POST ?action=notify_order'     => 'Kirim notifikasi transaksi / pesanan baru',
                'POST ?action=notify_status'    => 'Kirim notifikasi perubahan status pesanan',
                'POST ?action=notify_registration' => 'Kirim notifikasi pendaftar baru ke Admin',
                'POST ?action=send_direct'      => 'Kirim pesan WhatsApp langsung',
                'POST/GET ?action=test_connection' => 'Uji konektivitas Fonnte & pesan percobaan',
                'GET ?action=get_logs'          => 'Lihat riwayat log pengiriman'
            ]
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
}

