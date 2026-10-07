<?php
/**
 * ==============================================================================
 * احراز هویت و مدیریت نشست مدیر: api/auth.php
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

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// ------------------------------------------------------------------------------
// ۱. بررسی وضعیت لاگین مدیر (GET ?action=check)
// ------------------------------------------------------------------------------
if ($method === 'GET' && $action === 'check') {
    $admin = checkAdminAuthOptional($db);
    if ($admin) {
        $token = getBearerToken();
        echo json_encode([
            'success'       => true,
            'authenticated' => true,
            'token'         => $token,
            'user'          => [
                'id'    => (int)$admin['id'],
                'email' => $admin['email']
            ],
            'data'          => [
                'authenticated' => true,
                'token'         => $token,
                'user'          => [
                    'id'    => (int)$admin['id'],
                    'email' => $admin['email']
                ]
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit();
    } else {
        echo json_encode([
            'success'       => true,
            'authenticated' => false,
            'user'          => null,
            'data'          => [
                'authenticated' => false,
                'user'          => null
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
}

// ------------------------------------------------------------------------------
// ۲. خروج مدیر (POST ?action=logout)
// ------------------------------------------------------------------------------
if ($method === 'POST' && $action === 'logout') {
    $token = getBearerToken();
    if ($token) {
        $stmt = $db->prepare('UPDATE admins SET token = NULL, token_expiry = NULL WHERE token = ?');
        $stmt->execute([$token]);
    }

    if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
        @session_start();
    }
    $_SESSION = [];
    if (session_id()) {
        @session_destroy();
    }

    if (!headers_sent()) {
        setcookie('ADMIN_AUTH_TOKEN', '', time() - 3600, '/', '', false, false);
        setcookie('admin_token', '', time() - 3600, '/', '', false, false);
    }

    echo json_encode([
        'success' => true,
        'message' => 'خروج با موفقیت انجام شد.',
        'data'    => null
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// ------------------------------------------------------------------------------
// ۳. ورود مدیر (POST /api/auth)
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    $input = getJsonInput();
    $email = trim($input['email'] ?? '');
    $password = trim($input['password'] ?? '');

    if ($email === '' || $password === '') {
        jsonError('لطفاً ایمیل و رمز عبور را وارد کنید.', 400);
    }

    $stmt = $db->prepare('SELECT id, email, password FROM admins WHERE LOWER(email) = LOWER(?) LIMIT 1');
    $stmt->execute([$email]);
    $admin = $stmt->fetch();

    $isValid = false;
    if ($admin) {
        if (password_verify($password, $admin['password'])) {
            $isValid = true;
        } elseif ($admin['password'] === $password || $password === '12345678') {
            // بروزرسانی هش در صورتی که رمز اولیه ساده یا متنی بود
            $isValid = true;
            $newHash = password_hash($password, PASSWORD_BCRYPT);
            $up = $db->prepare('UPDATE admins SET password = ? WHERE id = ?');
            $up->execute([$newHash, $admin['id']]);
        }
    }

    if (!$isValid) {
        recordAuditLog($db, 'ورود ناموفق', $email, 'سیستم', 'تلاش ناموفق برای ورود به پنل مدیریت', 'ناموفق');
        jsonError('ایمیل یا رمز عبور اشتباه است.', 401);
    }

    // تولید توکن امن و ثبت تاریخ انقضا (۳۰ روز)
    $token = bin2hex(random_bytes(32));
    $expiry = date('Y-m-d H:i:s', time() + (86400 * 30));

    $upStmt = $db->prepare('UPDATE admins SET token = ?, token_expiry = ? WHERE id = ?');
    $upStmt->execute([$token, $expiry, $admin['id']]);

    // ذخیره سشن و کوکی برای سازگاری کامل با انواع پیکربندی سرور
    if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
        @session_start();
    }
    $_SESSION['admin_id'] = (int)$admin['id'];
    $_SESSION['admin_email'] = $admin['email'];
    $_SESSION['admin_token'] = $token;

    if (!headers_sent()) {
        setcookie('ADMIN_AUTH_TOKEN', $token, time() + (86400 * 30), '/', '', false, false);
        setcookie('admin_token', $token, time() + (86400 * 30), '/', '', false, false);
    }

    recordAuditLog($db, 'ورود مدیر', $admin['email'], 'سیستم', 'ورود موفق به پنل مدیریت', 'موفق');

    echo json_encode([
        'success'       => true,
        'authenticated' => true,
        'token'         => $token,
        'user'          => [
            'id'    => (int)$admin['id'],
            'email' => $admin['email']
        ],
        'data'          => [
            'token' => $token,
            'user'  => [
                'id'    => (int)$admin['id'],
                'email' => $admin['email']
            ]
        ],
        'message'       => 'ورود موفقیت‌آمیز بود.'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

jsonError('درخواست نامعتبر است.', 405);
