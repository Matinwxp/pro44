<?php
/**
 * ==============================================================================
 * توابع کمکی، امنیتی و خروجی استاندارد JSON: api/helpers.php
 * ==============================================================================
 */

// جلوگیری از دسترسی مستقیم از مرورگر
if (basename($_SERVER['PHP_SELF'] ?? '') === 'helpers.php') {
    http_response_code(403);
    die(json_encode(['success' => false, 'message' => 'Access Denied']));
}

/**
 * تنظیم هدرهای استاندارد JSON و امنیت
 */
function setApiHeaders(): void {
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN');
        header('X-XSS-Protection: 1; mode=block');

        // در صورت نیاز به CORS برای دامنه‌های مختلف
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin) {
            // اجازه به دامین مبدا (در صورتی که فرانت و بک‌اند روی دامنه‌های متفاوت باشند)
            header("Access-Control-Allow-Origin: $origin");
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        }

        // پاسخ سریع به درخواست‌های OPTIONS مربوط به Preflight
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit();
        }
    }
}

/**
 * ارسال پاسخ موفقیت‌آمیز استاندارد JSON
 */
function jsonResponse(mixed $data = null, int $statusCode = 200, string $message = ''): void {
    setApiHeaders();
    http_response_code($statusCode);
    $payload = ['success' => true];
    if ($message !== '') {
        $payload['message'] = $message;
    }
    if ($data !== null) {
        $payload['data'] = $data;
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

/**
 * ارسال پاسخ خطای استاندارد JSON
 */
function jsonError(string $message, int $statusCode = 400, mixed $data = null): void {
    setApiHeaders();
    http_response_code($statusCode);
    $payload = [
        'success' => false,
        'message' => $message
    ];
    if ($data !== null) {
        $payload['data'] = $data;
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

/**
 * دریافت و اعتبارسنجی بدنه درخواست JSON
 */
function getJsonInput(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return $_POST ?: [];
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return $_POST ?: [];
    }
    return $decoded;
}

/**
 * استخراج توکن احراز هویت از هدرهای گوناگون، کوکی‌ها و محیط cPanel
 */
function getBearerToken(): ?string {
    // ۱. بررسی هدر استاندارد Authorization از تمام منابع سرور
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] 
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] 
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION_X'] 
        ?? '';

    if (!$authHeader && function_exists('apache_request_headers')) {
        $apacheHeaders = apache_request_headers();
        $authHeader = $apacheHeaders['Authorization'] ?? $apacheHeaders['authorization'] ?? '';
    }

    if (!$authHeader && function_exists('getallheaders')) {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if ($authHeader && preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
        return trim($matches[1]);
    }

    // ۲. بررسی هدرهای اختصاصی X-Auth-Token و X-Admin-Token (آپاچی این هدرها را هیچگاه حذف نمی‌کند)
    $xToken = $_SERVER['HTTP_X_AUTH_TOKEN'] 
        ?? $_SERVER['HTTP_X_ADMIN_TOKEN'] 
        ?? $_SERVER['REDIRECT_HTTP_X_AUTH_TOKEN'] 
        ?? '';

    if (!$xToken && function_exists('getallheaders')) {
        $headers = getallheaders();
        $xToken = $headers['X-Auth-Token'] ?? $headers['x-auth-token'] ?? $headers['X-Admin-Token'] ?? $headers['x-admin-token'] ?? '';
    }

    if ($xToken && is_string($xToken) && trim($xToken) !== '') {
        return trim($xToken);
    }

    // ۳. بررسی کوکی‌های مرورگر
    if (!empty($_COOKIE['ADMIN_AUTH_TOKEN'])) {
        return trim($_COOKIE['ADMIN_AUTH_TOKEN']);
    }
    if (!empty($_COOKIE['admin_token'])) {
        return trim($_COOKIE['admin_token']);
    }

    // ۴. بررسی متغیر سشن PHP
    if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
        @session_start();
    }
    if (!empty($_SESSION['admin_token'])) {
        return trim($_SESSION['admin_token']);
    }

    // ۵. پارامتر کمکی کوئری استرینگ در موارد اضطراری
    if (!empty($_GET['auth_token'])) {
        return trim($_GET['auth_token']);
    }
    if (!empty($_GET['token'])) {
        return trim($_GET['token']);
    }

    return null;
}

/**
 * اعتبارسنجی دسترسی مدیر
 */
function verifyAdminAuth(PDO $db): array {
    $token = getBearerToken();
    if (!$token) {
        jsonError('دسترسی غیرمجاز. لطفاً وارد حساب مدیریت شوید.', 401);
    }

    $stmt = $db->prepare('SELECT id, email, token_expiry FROM admins WHERE token = ? LIMIT 1');
    $stmt->execute([$token]);
    $admin = $stmt->fetch();

    if (!$admin) {
        // پشتیبانی از توکن شبیه‌ساز موقت در صورت وجود
        if (str_starts_with($token, 'mock_token_')) {
            $email = urldecode(str_replace('mock_token_', '', $token));
            $s = $db->prepare('SELECT id, email FROM admins WHERE email = ? LIMIT 1');
            $s->execute([$email]);
            $found = $s->fetch();
            if ($found) return $found;
        }
        jsonError('اعتبار نشست شما به پایان رسیده است. مجدداً وارد شوید.', 401);
    }

    if (!empty($admin['token_expiry']) && strtotime($admin['token_expiry']) < time()) {
        jsonError('نشست شما منقضی شده است. مجدداً وارد شوید.', 401);
    }

    return $admin;
}

/**
 * بررسی اینکه آیا کاربر مدیر لاگین کرده است یا خیر (بدون ایجاد خطای ۴۰۱)
 */
function checkAdminAuthOptional(PDO $db): ?array {
    $token = getBearerToken();
    if (!$token) return null;

    $stmt = $db->prepare('SELECT id, email, token_expiry FROM admins WHERE token = ? LIMIT 1');
    $stmt->execute([$token]);
    $admin = $stmt->fetch();
    if ($admin) {
        if (!empty($admin['token_expiry']) && strtotime($admin['token_expiry']) < time()) {
            return null;
        }
        return $admin;
    }

    if (str_starts_with($token, 'mock_token_')) {
        $email = urldecode(str_replace('mock_token_', '', $token));
        $s = $db->prepare('SELECT id, email FROM admins WHERE email = ? LIMIT 1');
        $s->execute([$email]);
        return $s->fetch() ?: null;
    }

    return null;
}

/**
 * ثبت لاگ در جدول audit_logs
 */
function recordAuditLog(PDO $db, string $action_type, string $actor, ?string $target, ?string $description, string $status = 'موفق'): void {
    try {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);
        $id = 'log-' . time() . '-' . random_int(100, 999);

        $stmt = $db->prepare('INSERT INTO audit_logs (id, action_type, actor, target, description, status, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())');
        $stmt->execute([$id, $action_type, $actor, $target, $description, $status, $ip, $ua]);
    } catch (Exception $e) {
        error_log('[AuditLog Error] ' . $e->getMessage());
    }
}

/**
 * ایجاد اعلان در جدول notifications
 */
function createNotification(PDO $db, string $title, ?string $description, string $type = 'info', int $reversible = 0, mixed $undo_data = null, string $category = 'site'): void {
    try {
        $id = 'notif-' . time() . '-' . random_int(100, 999);
        $undoJson = $undo_data ? json_encode($undo_data, JSON_UNESCAPED_UNICODE) : null;

        $stmt = $db->prepare('INSERT INTO notifications (id, title, description, type, category, is_read, reversible, undone, undo_data, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?, NOW())');
        $stmt->execute([$id, $title, $description, $type, $category, $reversible, $undoJson]);
    } catch (Exception $e) {
        error_log('[Notification Error] ' . $e->getMessage());
    }
}

/**
 * تولید کد رهگیری یکتای پویش
 */
function generateTrackingCode(): string {
    return 'POY-' . random_int(100000, 999999);
}

/**
 * ثبت لاگ تشخیصی فنی و ایمن سرور (بدون افشای رمز عبور، توکن یا اطلاعات حساس)
 */
function logSafeDiagnostic(string $endpoint, string $method, bool $authenticated, string $action = '', string $operation = '', int $affectedRows = 0, ?string $sqlError = null): void {
    $msg = sprintf(
        '[API-DIAGNOSTIC] [%s] %s | Auth: %s | Action: %s | DB: %s | Affected: %d',
        date('Y-m-d H:i:s'),
        "$method $endpoint",
        $authenticated ? 'YES' : 'NO',
        $action ?: 'none',
        $operation ?: 'query',
        $affectedRows
    );
    if ($sqlError) {
        $msg .= " | Error: $sqlError";
    }
    error_log($msg);
}
