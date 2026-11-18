<?php
/**
 * DesaBiz AI - Layanan Konfigurasi & Adapter Provider Chatbot AI
 * ---------------------------------------------------------------------------
 * Tanggung jawab:
 * 1. Mengelola tabel `ai_configurations` (satu baris per provider, tepat SATU
 *    provider aktif sebagai provider utama chatbot).
 * 2. Menyediakan ADAPTER request terpisah per provider sesuai dokumentasi
 *    resmi masing-masing (format request & parsing jawaban BERBEDA tiap provider):
 *      - openai : POST /v1/chat/completions      (Authorization: Bearer)
 *      - gemini : POST /v1beta/models/{model}:generateContent (x-goog-api-key)
 *      - custom : endpoint kompatibel OpenAI milik admin (Authorization: Bearer)
 * 3. Menjalankan "Tes Koneksi" sungguhan (chat percobaan minimal, bukan sekadar
 *    "berhasil disimpan").
 *
 * KEAMANAN:
 * - API key diambil terenkripsi dari database, didekripsi HANYA di memori
 *   server untuk keperluan request, dan TIDAK PERNAH dikirim ke frontend,
 *   dimasukkan ke URL, atau dicatat ke log.
 * - TERPISAH dari WhatsAppService/Fonnte (konfigurasi & kunci enkripsi berbeda).
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/ai-providers.php';

class AIProviderService
{
    /** @var ?self */
    private static $instance = null;

    /** @var bool once-per-request schema guard */
    private static $schemaEnsured = false;

    private function __construct() {}

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /** Pastikan tabel konfigurasi provider AI tersedia (dipanggil sekali per request). */
    private function ensureSchema(): void
    {
        if (self::$schemaEnsured) return;
        self::$schemaEnsured = true;
        try {
            Database::initTables();
        } catch (Throwable $e) {
            // Biarkan pemanggil menangani koneksi yang tidak tersedia
        }
    }

    // =========================================================================
    // AKSES DATABASE
    // =========================================================================

    /**
     * Ambil semua baris konfigurasi provider.
     * @return ?array null bila database tidak tersedia
     */
    public function getRows(): ?array
    {
        $this->ensureSchema();
        $pdo = Database::getConnection();
        if (!$pdo) return null;
        try {
            $stmt = $pdo->query(
                "SELECT `id`, `provider`, `model`, `endpoint`, `encrypted_api_key`,
                        `is_active`, `last_test_at`, `last_test_status`,
                        `updated_at`, `updated_by`
                 FROM `ai_configurations`
                 ORDER BY `id` ASC"
            );
            return $stmt ? $stmt->fetchAll() : [];
        } catch (PDOException $e) {
            return [];
        }
    }

    /**
     * Ambil konfigurasi provider AKTIF beserta API key yang sudah didekripsi.
     * Kunci plaintext hanya hidup di memori request ini.
     *
     * @return ?array {provider, model, endpoint, key, ...} atau null bila:
     *   - tidak ada provider aktif, atau
     *   - provider aktif belum punya API key (chatbot -> Local Engine)
     */
    public function getActiveConfig(): ?array
    {
        $rows = $this->getRows();
        if ($rows === null || !$rows) return null;

        foreach ($rows as $row) {
            if ((int) ($row['is_active'] ?? 0) !== 1) continue;

            $provider = (string) $row['provider'];
            $def = ai_provider_def($provider);
            if ($def === null) continue;

            $key = ai_decrypt((string) ($row['encrypted_api_key'] ?? ''));
            if ($key === '') continue; // aktif tapi tanpa kunci -> dianggap belum dikonfigurasi

            $endpoint = (string) ($row['endpoint'] ?? '');
            if ($endpoint === '') $endpoint = (string) $def['endpoint'];

            return [
                'provider'     => $provider,
                'label'        => $def['label'],
                'format'       => $def['format'],
                'model'        => (string) $row['model'],
                'endpoint'     => $endpoint,
                'key'          => $key,
                'updated_at'   => $row['updated_at'] ?? null,
            ];
        }
        return null;
    }

    /**
     * Ringkasan status SELURUH provider untuk halaman konfigurasi
     * (API key selalu dimasking — tidak pernah utuh).
     *
     * @return ?array null bila database tidak tersedia
     */
    public function getStatusAll(): ?array
    {
        $rows = $this->getRows();
        if ($rows === null) return null;

        $byProvider = [];
        foreach ($rows as $row) {
            $byProvider[(string) $row['provider']] = $row;
        }

        $list = [];
        $activeProvider = null;
        $activeModel = null;
        $activeEndpoint = null;
        $chatbotReady = false;

        foreach (ai_providers() as $key => $def) {
            $row = $byProvider[$key] ?? null;
            $encrypted = $row ? (string) ($row['encrypted_api_key'] ?? '') : '';
            $plain = $encrypted !== '' ? ai_decrypt($encrypted) : '';
            $isActive = $row && (int) ($row['is_active'] ?? 0) === 1;
            $endpoint = $row ? trim((string) ($row['endpoint'] ?? '')) : '';
            if ($endpoint === '') $endpoint = (string) $def['endpoint'];

            $list[] = [
                'key'             => $key,
                'label'           => $def['label'],
                'docs'            => $def['docs'],
                'models'          => $def['models'],
                'editable'        => $def['editable'],
                'key_hint'        => $def['key_hint'],
                'key_prefix'      => $def['key_prefix'],
                'endpoint'        => $endpoint,
                'default_endpoint'=> (string) $def['endpoint'],
                'has_key'         => $plain !== '',
                'key_mask'        => $plain !== '' ? ai_mask_key($plain) : '—',
                'is_active'       => (bool) $isActive,
                'model'           => $row ? (string) $row['model'] : '',
                'endpoint_saved'  => $row ? trim((string) ($row['endpoint'] ?? '')) : '',
                'last_test_at'    => $row['last_test_at'] ?? null,
                'last_test_status'=> $row['last_test_status'] ?? null,
                'updated_at'      => $row['updated_at'] ?? null,
                'updated_by'      => $row['updated_by'] ?? null,
                'exists'          => $row !== null,
            ];

            if ($isActive && $plain !== '') {
                $activeProvider = $key;
                $activeModel = (string) $row['model'];
                $activeEndpoint = $endpoint;
                $chatbotReady = true;
            }
        }

        return [
            'providers'       => $list,
            'active_provider' => $activeProvider,
            'active_model'    => $activeModel,
            'active_endpoint' => $activeEndpoint,
            'chatbot_ready'   => $chatbotReady,
        ];
    }

    /**
     * Simpan konfigurasi provider (insert/update + jaminan hanya SATU aktif).
     *
     * @param array $p {provider, model, api_key ('' = pertahankan kunci tersimpan),
     *                  is_active (bool), endpoint ('' hanya utk custom), updated_by}
     * @return array {ok, message, mode, key_mask}
     */
    public function save(array $p): array
    {
        $provider = trim((string) ($p['provider'] ?? ''));
        $model    = trim((string) ($p['model'] ?? ''));
        $apiKey   = trim((string) ($p['api_key'] ?? ''));
        $endpoint = trim((string) ($p['endpoint'] ?? ''));
        $isActive = !empty($p['is_active']);
        $updatedBy = trim((string) ($p['updated_by'] ?? ''));

        if (($msg = ai_validate_provider($provider)) !== '') {
            return ['ok' => false, 'message' => $msg, 'mode' => '', 'key_mask' => ''];
        }
        if (($msg = ai_validate_model($provider, $model)) !== '') {
            return ['ok' => false, 'message' => $msg, 'mode' => '', 'key_mask' => ''];
        }
        if ($provider === 'custom' && ($msg = ai_validate_endpoint($endpoint)) !== '') {
            return ['ok' => false, 'message' => $msg, 'mode' => '', 'key_mask' => ''];
        }

        $this->ensureSchema();
        $pdo = Database::getConnection();
        if (!$pdo) {
            return ['ok' => false, 'message' => 'Koneksi database tidak tersedia.', 'mode' => '', 'key_mask' => ''];
        }

        try {
            $stmt = $pdo->prepare("SELECT `id`, `encrypted_api_key` FROM `ai_configurations` WHERE `provider` = ? LIMIT 1");
            $stmt->execute([$provider]);
            $row = $stmt->fetch();

            $mode = $row ? 'update' : 'create';

            // API key: kosong saat update = pertahankan kunci tersimpan
            if ($apiKey !== '') {
                if (($msg = ai_validate_key($provider, $apiKey)) !== '') {
                    return ['ok' => false, 'message' => $msg, 'mode' => '', 'key_mask' => ''];
                }
                $encrypted = ai_encrypt($apiKey);
                if ($encrypted === '') {
                    return ['ok' => false, 'message' => 'Gagal mengenkripsi API key.', 'mode' => '', 'key_mask' => ''];
                }
            } else {
                $encrypted = $row ? (string) $row['encrypted_api_key'] : '';
                if ($encrypted === '') {
                    return ['ok' => false, 'message' => 'API Key wajib diisi saat pertama kali menyimpan provider ini.', 'mode' => '', 'key_mask' => ''];
                }
            }

            $endpointSave = ($provider === 'custom') ? $endpoint : null;
            $pdo->beginTransaction();

            if ($isActive) {
                // Jaminan: hanya SATU provider aktif sebagai provider utama
                $pdo->exec("UPDATE `ai_configurations` SET `is_active` = 0 WHERE `is_active` = 1");
            }

            if ($row) {
                $upd = $pdo->prepare("
                    UPDATE `ai_configurations`
                    SET `model` = ?, `endpoint` = ?, `encrypted_api_key` = ?,
                        `is_active` = ?, `updated_at` = NOW(), `updated_by` = ?
                    WHERE `id` = ?
                ");
                $upd->execute([
                    $model,
                    $endpointSave,
                    $encrypted,
                    $isActive ? 1 : 0,
                    $updatedBy,
                    (int) $row['id'],
                ]);
            } else {
                $ins = $pdo->prepare("
                    INSERT INTO `ai_configurations`
                        (`provider`, `model`, `endpoint`, `encrypted_api_key`, `is_active`, `updated_at`, `updated_by`)
                    VALUES (?, ?, ?, ?, ?, NOW(), ?)
                ");
                $ins->execute([
                    $provider,
                    $model,
                    $endpointSave,
                    $encrypted,
                    $isActive ? 1 : 0,
                    $updatedBy,
                ]);
            }

            $pdo->commit();

            return [
                'ok'       => true,
                'message'  => $mode === 'create'
                    ? 'Konfigurasi provider berhasil disimpan (API key terenkripsi).'
                    : 'Konfigurasi provider berhasil diperbarui (API key terenkripsi).',
                'mode'     => $mode,
                'key_mask' => ai_mask_key($apiKey !== '' ? $apiKey : ai_decrypt($encrypted)),
            ];
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            return ['ok' => false, 'message' => 'Gagal menyimpan konfigurasi ke database.', 'mode' => '', 'key_mask' => ''];
        }
    }

    /**
     * Hapus konfigurasi provider (API key ikut terhapus dari database).
     * @return array {ok, message, removed}
     */
    public function delete(string $provider): array
    {
        if (($msg = ai_validate_provider($provider)) !== '') {
            return ['ok' => false, 'message' => $msg, 'removed' => false];
        }
        $this->ensureSchema();
        $pdo = Database::getConnection();
        if (!$pdo) {
            return ['ok' => false, 'message' => 'Koneksi database tidak tersedia.', 'removed' => false];
        }
        try {
            $stmt = $pdo->prepare("DELETE FROM `ai_configurations` WHERE `provider` = ?");
            $stmt->execute([$provider]);
            $removed = $stmt->rowCount() > 0;
            return [
                'ok'      => true,
                'message' => $removed
                    ? 'Konfigurasi provider (termasuk API key) berhasil dihapus dari database.'
                    : 'Tidak ada konfigurasi tersimpan untuk provider ini.',
                'removed' => $removed,
            ];
        } catch (PDOException $e) {
            return ['ok' => false, 'message' => 'Gagal menghapus konfigurasi.', 'removed' => false];
        }
    }

    /** Catat hasil tes koneksi (tanpa API key) ke baris provider bila ada. */
    public function recordTest(string $provider, bool $ok): void
    {
        $this->ensureSchema();
        $pdo = Database::getConnection();
        if (!$pdo) return;
        try {
            $stmt = $pdo->prepare("
                UPDATE `ai_configurations`
                SET `last_test_at` = NOW(), `last_test_status` = ?
                WHERE `provider` = ?
            ");
            $stmt->execute([$ok ? 'success' : 'failed', $provider]);
        } catch (PDOException $e) {
            // abaikan
        }
    }

    // =========================================================================
    // ADAPTER PROVIDER (mengikuti dokumentasi resmi masing-masing)
    // =========================================================================

    /** POST JSON via cURL (fallback: stream context) — tanpa jejak API key di URL. */
    private function httpPost(string $url, array $headers, array $body, int $timeout = 20): array
    {
        $payload = json_encode($body, JSON_UNESCAPED_UNICODE);
        $started = microtime(true);

        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => $payload,
                CURLOPT_HTTPHEADER     => $headers,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => $timeout,
                CURLOPT_CONNECTTIMEOUT => 8,
            ]);
            $response = curl_exec($ch);
            $error    = curl_error($ch);
            $code     = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($response === false) {
                return ['ok' => false, 'code' => 0, 'body' => '', 'error' => $error ?: 'Koneksi gagal', 'ms' => (int) ((microtime(true) - $started) * 1000)];
            }
            return [
                'ok'    => $code >= 200 && $code < 300,
                'code'  => $code,
                'body'  => $response,
                'error' => '',
                'ms'    => (int) ((microtime(true) - $started) * 1000),
            ];
        }

        $context = stream_context_create([
            'http' => [
                'method'        => 'POST',
                'header'        => implode("\r\n", $headers),
                'content'       => $payload,
                'timeout'       => $timeout,
                'ignore_errors' => true,
            ],
        ]);
        $response = @file_get_contents($url, false, $context);
        if ($response === false) {
            return ['ok' => false, 'code' => 0, 'body' => '', 'error' => 'HTTP request gagal', 'ms' => (int) ((microtime(true) - $started) * 1000)];
        }
        $code = (int) (preg_replace('/[^0-9]/', '', strtok((string) ($_SERVER['http_response_header'][0] ?? '200'), ' ')) ?: 200);
        return ['ok' => $code >= 200 && $code < 300, 'code' => $code, 'body' => $response, 'error' => '', 'ms' => (int) ((microtime(true) - $started) * 1000)];
    }

    /**
     * Susun request sesuai provider terpilih.
     * @param array $messages daftar [{role, content}] — item pertama boleh system
     * @param int $maxTokens batas token jawaban
     * @return array{url: string, headers: array, body: array}
     */
    private function buildRequest(array $config, array $messages, int $maxTokens, float $temperature = 0.4): array
    {
        $provider = $config['provider'];
        $def      = ai_provider_def($provider);
        $model    = $config['model'];
        $key      = $config['key'];
        $endpoint = $config['endpoint'];

        if ($provider === 'gemini') {
            $url = str_replace('{model}', rawurlencode($model), (string) ($def['endpoint'] ?? ''));
            if ($url === '' || strpos($url, '{model}') !== false) {
                $url = 'https://generativelanguage.googleapis.com/v1beta/models/'
                     . rawurlencode($model) . ':generateContent';
            }

            // Pisahkan system prompt dari riwayat percakapan
            $systemText = '';
            $convo = $messages;
            if ($convo && ($convo[0]['role'] ?? '') === 'system') {
                $systemText = (string) $convo[0]['content'];
                array_shift($convo);
            }

            $contents = [];
            foreach ($convo as $m) {
                $role = ($m['role'] ?? '') === 'assistant' ? 'model' : 'user';
                $last = $contents ? $contents[count($contents) - 1] : null;
                if ($last !== null && $last['role'] === $role) {
                    $contents[count($contents) - 1]['parts'][] = ['text' => (string) $m['content']];
                } else {
                    $contents[] = ['role' => $role, 'parts' => [['text' => (string) $m['content']]]];
                }
            }

            $body = ['contents' => $contents];
            if ($systemText !== '') {
                $body['systemInstruction'] = ['parts' => [['text' => $systemText]]];
            }
            $body['generationConfig'] = ['temperature' => $temperature, 'maxOutputTokens' => $maxTokens];

            // Autentikasi via HEADER (API key tidak pernah masuk URL/log)
            return [
                'url'     => $url,
                'headers' => ['Content-Type: application/json', 'x-goog-api-key: ' . $key],
                'body'    => $body,
            ];
        }

        // openai & custom: format OpenAI Chat Completions (Bearer)
        return [
            'url'     => $endpoint,
            'headers' => ['Content-Type: application/json', 'Authorization: Bearer ' . $key],
            'body'    => [
                'model'       => $model,
                'messages'    => $messages,
                'temperature' => $temperature,
                'max_tokens'  => $maxTokens,
            ],
        ];
    }

    /** Ekstrak teks jawaban sesuai format provider + pesan error yang jelas. */
    private function parseReply(array $config, string $raw): array
    {
        $json = json_decode($raw, true);

        if (is_array($json) && isset($json['error'])) {
            $errMsg = is_array($json['error'])
                ? (string) ($json['error']['message'] ?? json_encode($json['error'], JSON_UNESCAPED_UNICODE))
                : (string) $json['error'];
            return ['text' => '', 'error' => trim($errMsg) !== '' ? $errMsg : 'Provider menolak permintaan.'];
        }

        if ($config['format'] === 'gemini') {
            $text = (string) ($json['candidates'][0]['content']['parts'][0]['text'] ?? '');
            return ['text' => $text, 'error' => $text === '' ? 'Respons Gemini tidak berisi teks jawaban.' : ''];
        }

        $text = (string) ($json['choices'][0]['message']['content'] ?? '');
        return ['text' => $text, 'error' => $text === '' ? 'Respons provider tidak berisi teks jawaban.' : ''];
    }

    /**
     * Kirim percakapan ke provider AI aktif (dipakai api/ai.php).
     *
     * @param array $config hasil getActiveConfig()
     * @param array $messages [{role, content}] termasuk system prompt di awal
     * @return array {ok, text, error, code, ms}
     */
    public function chat(array $config, array $messages): array
    {
        $req = $this->buildRequest($config, $messages, 1000, 0.4);
        $res = $this->httpPost($req['url'], $req['headers'], $req['body'], 35);

        if (!$res['ok'] && $res['body'] === '') {
            return ['ok' => false, 'text' => '', 'error' => $res['error'] ?: ('Gagal terhubung (HTTP ' . $res['code'] . ')'), 'code' => $res['code'], 'ms' => $res['ms']];
        }

        $parsed = $this->parseReply($config, $res['body']);
        if ($parsed['text'] === '') {
            $detail = $parsed['error'];
            if (!$res['ok']) {
                $detail = 'HTTP ' . $res['code'] . ($detail !== '' ? ' — ' . $detail : '');
            }
            return ['ok' => false, 'text' => '', 'error' => $detail, 'code' => $res['code'], 'ms' => $res['ms']];
        }

        return ['ok' => true, 'text' => $parsed['text'], 'error' => '', 'code' => $res['code'], 'ms' => $res['ms']];
    }

    /**
     * Tes koneksi sungguhan ke provider (chat percobaan minimal "BALAS: OK").
     *
     * @param string $provider provider uji
     * @param string $apiKeyOpsional kunci dari form (bila kosong -> kunci tersimpan)
     * @param string $modelOpsional model uji (bila kosong -> model tersimpan/pertama)
     * @param string $endpointOpsional endpoint utk provider custom
     * @return array {ok, message, provider, model, endpoint, http_code, ms, source}
     */
    public function testConnection(string $provider, string $apiKeyOpsional = '', string $modelOpsional = '', string $endpointOpsional = ''): array
    {
        if (($msg = ai_validate_provider($provider)) !== '') {
            return ['ok' => false, 'message' => $msg, 'provider' => $provider, 'model' => '', 'endpoint' => '', 'http_code' => 0, 'ms' => 0, 'source' => ''];
        }

        $def = ai_provider_def($provider);

        // Resolusi kunci: form -> baris tersimpan
        $key = trim($apiKeyOpsional);
        $source = 'form';
        if ($key === '') {
            $rows = $this->getRows() ?: [];
            foreach ($rows as $row) {
                if ((string) $row['provider'] === $provider) {
                    $key = ai_decrypt((string) ($row['encrypted_api_key'] ?? ''));
                    $source = 'database';
                    break;
                }
            }
        } else {
            if (($msg = ai_validate_key($provider, $key)) !== '') {
                return ['ok' => false, 'message' => $msg, 'provider' => $provider, 'model' => '', 'endpoint' => '', 'http_code' => 0, 'ms' => 0, 'source' => 'form'];
            }
        }
        if ($key === '') {
            return ['ok' => false, 'message' => 'Belum ada API Key untuk provider ini. Simpan API Key terlebih dahulu.', 'provider' => $provider, 'model' => '', 'endpoint' => '', 'http_code' => 0, 'ms' => 0, 'source' => ''];
        }

        // Resolusi model
        $model = trim($modelOpsional);
        if ($model === '') {
            $rows = $this->getRows() ?: [];
            foreach ($rows as $row) {
                if ((string) $row['provider'] === $provider) {
                    $model = trim((string) $row['model']);
                    break;
                }
            }
        }
        if ($model === '' && $def['models']) {
            $model = $def['models'][0];
        }
        if (($msg = ai_validate_model($provider, $model)) !== '') {
            return ['ok' => false, 'message' => $msg, 'provider' => $provider, 'model' => $model, 'endpoint' => '', 'http_code' => 0, 'ms' => 0, 'source' => $source];
        }

        // Resolusi endpoint (hanya custom)
        $endpoint = (string) $def['endpoint'];
        if ($provider === 'custom') {
            $endpoint = trim($endpointOpsional);
            if ($endpoint === '') {
                $rows = $this->getRows() ?: [];
                foreach ($rows as $row) {
                    if ((string) $row['provider'] === $provider) {
                        $endpoint = trim((string) ($row['endpoint'] ?? ''));
                        break;
                    }
                }
            }
            if (($msg = ai_validate_endpoint($endpoint)) !== '') {
                return ['ok' => false, 'message' => $msg, 'provider' => $provider, 'model' => $model, 'endpoint' => $endpoint, 'http_code' => 0, 'ms' => 0, 'source' => $source];
            }
        }

        $config = [
            'provider' => $provider,
            'format'   => $def['format'],
            'model'    => $model,
            'endpoint' => $endpoint,
            'key'      => $key,
        ];

        $messages = [['role' => 'user', 'content' => 'BALAS: OK']];
        $req = $this->buildRequest($config, $messages, 64, 0.0);
        $res = $this->httpPost($req['url'], $req['headers'], $req['body'], 25);

        $parsed = $res['body'] !== '' ? $this->parseReply($config, $res['body']) : ['text' => '', 'error' => $res['error']];
        $ok = $res['ok'] && $parsed['text'] !== '';

        $this->recordTest($provider, $ok);

        $endpointShown = $provider === 'gemini'
            ? str_replace('{model}', rawurlencode($model), (string) $def['endpoint'])
            : $endpoint;

        return [
            'ok'        => $ok,
            'message'   => $ok
                ? 'Koneksi BERHASIL — ' . $def['label'] . ' merespons chat percobaan.'
                : 'Koneksi GAGAL: ' . ($parsed['error'] !== '' ? $parsed['error'] : ('HTTP ' . $res['code'])),
            'provider'  => $provider,
            'provider_label' => $def['label'],
            'model'     => $model,
            'endpoint'  => $endpointShown,
            'http_code' => $res['code'],
            'ms'        => $res['ms'],
            'source'    => $source,
        ];
    }
}
