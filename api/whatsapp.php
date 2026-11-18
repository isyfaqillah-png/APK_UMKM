<?php
/**
 * DesaBiz AI - REST API Gateway WhatsApp (Fonnte Gateway)
 * 
 * Endpoint ini menerima panggilan HTTP untuk pengiriman notifikasi WhatsApp
 * dari frontend SPA DesaBiz AI maupun sistem eksternal.
 */

require_once __DIR__ . '/../controllers/WhatsAppController.php';

$controller = new WhatsAppController();
$controller->handleRequest();

