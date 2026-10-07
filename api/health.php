<?php
/**
 * ==============================================================================
 * تست سلامت سرویس و اتصال دیتابیس: api/health.php
 * ==============================================================================
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/database.php';

setApiHeaders();

try {
    $db = Database::getConnection();
    $stmt = $db->query('SELECT 1');
    $stmt->fetch();

    jsonResponse([
        'database'   => 'ok',
        'status'     => 'healthy',
        'app'        => 'sahmnazr_campaign',
        'timestamp'  => date('Y-m-d H:i:s')
    ], 200, 'API و دیتابیس سالم هستند.');
} catch (Throwable $e) {
    error_log('[Health Check Failed] ' . $e->getMessage());
    jsonError('عدم برقراری ارتباط با پایگاه داده. لطفاً تنظیمات دیتابیس را بررسی کنید.', 500, [
        'database' => 'disconnected'
    ]);
}
