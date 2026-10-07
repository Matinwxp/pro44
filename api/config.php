<?php
/**
 * ==============================================================================
 * تنظیمات پیکربندی پایگاه داده و سامانه: api/config.php
 * ==============================================================================
 * این فایل اطلاعات اتصال به پایگاه‌داده MySQL هاست و پارامترهای امنیتی را تعیین می‌کند.
 * برای اعمال مشخصات هاست cPanel خود مقادیر زیر را با اطلاعات واقعی دیتابیس جایگزین نمایید.
 */

// جلوگیری از دسترسی مستقیم به این فایل از طریق مرورگر
if (basename($_SERVER['PHP_SELF'] ?? '') === 'config.php') {
    http_response_code(403);
    die(json_encode(['success' => false, 'message' => 'Access Denied']));
}

// تنظیم منطقه زمانی به ساعت رسمی کشور
date_default_timezone_set('Asia/Tehran');

// عدم نمایش خطاهای خام PHP به کاربر در محیط Production و ثبت در error_log سرور
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
error_reporting(E_ALL);
ini_set('log_errors', '1');

// بررسی وجود فایل .env خارجی (در صورت قرار گرفتن در پوشه بالاتر یا ریشه هاست)
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        if (strpos($line, '=') !== false) {
            list($key, $val) = explode('=', $line, 2);
            $key = trim($key);
            $val = trim($val, " \t\n\r\0\x0B\"'");
            if (!isset($_SERVER[$key]) && !isset($_ENV[$key])) {
                putenv("$key=$val");
                $_ENV[$key] = $val;
                $_SERVER[$key] = $val;
            }
        }
    }
}

// ------------------------------------------------------------------------------
// پارامترهای اتصال به دیتابیس MySQL هاست (cPanel / DirectAdmin)
// ------------------------------------------------------------------------------
return [
    'db' => [
        'host'     => getenv('DB_HOST') ?: 'localhost',
        'port'     => getenv('DB_PORT') ?: '3306',
        'dbname'   => getenv('DB_NAME') ?: 'sahmnazr_campaign', // نام دقیق پایگاه داده
        'username' => getenv('DB_USER') ?: 'YOUR_DATABASE_USER',
        'password' => getenv('DB_PASSWORD') ?: 'YOUR_DATABASE_PASSWORD',
        'charset'  => 'utf8mb4'
    ],

    // کلید رمزنگاری نشست‌ها و توکن‌های مدیریت
    'auth' => [
        'secret_key'   => getenv('APP_SECRET') ?: 'sahm_nazr_secure_jwt_token_key_1403',
        'token_expiry' => 86400 * 30 // ۳۰ روز اعتبار توکن
    ],

    // مسیر پوشه آپلود تصاویر بنر پویش‌ها
    'upload' => [
        'dir'         => dirname(__DIR__) . '/uploads/campaigns/',
        'url_prefix'  => '/uploads/campaigns/',
        'max_size'    => 5 * 1024 * 1024, // ۵ مگابایت
        'allowed_ext' => ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        'allowed_mime'=> ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    ],

    // تنظیمات درگاه پیش‌فرض
    'gateway' => [
        'default'  => 'test_gateway',
        'sandbox'  => true
    ]
];
