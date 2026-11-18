<?php
/**
 * DesaBiz AI - REST API Gateway (Backend Ready)
 * 
 * Endpoint ini disiapkan untuk melayani komunikasi data JSON antara 
 * frontend SPA DesaBiz AI dan database MySQL pada tahap berikutnya.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$action = $_GET['action'] ?? 'status';

// Zona waktu respons: WIB (Asia/Jakarta, UTC+7) agar timestamp real time
if (date_default_timezone_get() !== 'Asia/Jakarta') {
    date_default_timezone_set('Asia/Jakarta');
}

$response = [
    'app' => 'DesaBiz AI Backend API',
    'status' => 'online',
    'version' => '1.0.0',
    'timestamp' => date('Y-m-d H:i:s'),
    'action' => $action,
    'message' => 'Fondasi API siap digunakan untuk integrasi modul pada tahap berikutnya.'
];

echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
