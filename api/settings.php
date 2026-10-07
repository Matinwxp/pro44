<?php
/**
 * ==============================================================================
 * تنظیمات درگاه و سیستم (Settings API): api/settings.php
 * ==============================================================================
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/database.php';

setApiHeaders();

try {
    $db = Database::getConnection();
} catch (Throwable $e) {
    jsonError('خطا در اتصال به پایگاه داده', 500);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

// ------------------------------------------------------------------------------
// دریافت تنظیمات یا تست اتصال دیتابیس (GET)
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    // تست اتصال واقعی به دیتابیس با بازگرداندن وضعیت سلامت
    if ($action === 'test_db') {
        try {
            $stmt = $db->query("SELECT DATABASE() as dbname, VERSION() as version");
            $info = $stmt->fetch();
            $currentDb = $info['dbname'] ?? 'sahmnazr_campaign';
            jsonResponse([
                'database' => 'connected',
                'dbname'   => $currentDb,
                'status'   => 'healthy',
                'timestamp'=> date('Y-m-d H:i:s')
            ], 200, "اتصال به پایگاه‌داده «{$currentDb}» با موفقیت تایید شد.");
        } catch (Throwable $e) {
            jsonError('خطا در برقراری ارتباط با پایگاه‌داده: ' . $e->getMessage(), 500, [
                'database' => 'disconnected'
            ]);
        }
    }

    $stmt = $db->query("SELECT * FROM settings WHERE id = 'default' LIMIT 1");
    $settings = $stmt->fetch();

    if (!$settings) {
        $settings = [
            'id'             => 'default',
            'active_gateway' => 'test_gateway',
            'is_active'      => 1,
            'sandbox'        => 1,
            'merchant_id'    => '',
            'api_key'        => '',
            'terminal_id'    => ''
        ];
    } else {
        $settings['is_active'] = (bool)$settings['is_active'];
        $settings['sandbox']   = (bool)$settings['sandbox'];
    }

    jsonResponse($settings);
}

// ------------------------------------------------------------------------------
// ذخیره تنظیمات (POST - نیازمند لاگین مدیر)
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    $admin = verifyAdminAuth($db);
    $input = getJsonInput();

    $activeGateway = trim($input['active_gateway'] ?? 'test_gateway');
    $isActive      = isset($input['is_active']) ? ((int)$input['is_active'] ? 1 : 0) : 1;
    $sandbox       = isset($input['sandbox']) ? ((int)$input['sandbox'] ? 1 : 0) : 1;
    $merchantId    = trim($input['merchant_id'] ?? '');
    $apiKey        = trim($input['api_key'] ?? '');
    $terminalId    = trim($input['terminal_id'] ?? '');

    // در صورت خالی بودن کلید جدید، کلید قبلی ذخیره‌شده حفظ شود
    if ($apiKey === '') {
        $prevStmt = $db->query("SELECT api_key FROM settings WHERE id = 'default' LIMIT 1");
        $prev = $prevStmt->fetch();
        if (!empty($prev['api_key'])) {
            $apiKey = $prev['api_key'];
        }
    }

    $stmt = $db->prepare("INSERT INTO settings (id, active_gateway, is_active, sandbox, merchant_id, api_key, terminal_id, updated_at) 
        VALUES ('default', ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
            active_gateway = VALUES(active_gateway),
            is_active = VALUES(is_active),
            sandbox = VALUES(sandbox),
            merchant_id = VALUES(merchant_id),
            api_key = VALUES(api_key),
            terminal_id = VALUES(terminal_id),
            updated_at = NOW()");

    $stmt->execute([$activeGateway, $isActive, $sandbox, $merchantId, $apiKey, $terminalId]);
    $affected = $stmt->rowCount();

    recordAuditLog($db, 'تنظیمات درگاه', $admin['email'], 'درگاه پرداخت', "بروزرسانی درگاه فعال به $activeGateway");
    createNotification($db, 'بروزرسانی تنظیمات درگاه', "تنظیمات درگاه بانکی ($activeGateway) توسط مدیریت ذخیره گردید.", 'settings', 0, null, 'admin');

    logSafeDiagnostic('settings.php', 'POST', true, 'save', 'INSERT/UPDATE settings', $affected);

    $fetchStmt = $db->query("SELECT * FROM settings WHERE id = 'default' LIMIT 1");
    $updated = $fetchStmt->fetch();
    $updated['is_active'] = (bool)$updated['is_active'];
    $updated['sandbox']   = (bool)$updated['sandbox'];

    jsonResponse($updated, 200, 'تنظیمات درگاه با موفقیت ذخیره شد.');
}

jsonError('درخواست نامعتبر است.', 405);
