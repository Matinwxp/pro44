<?php
/**
 * ==============================================================================
 * مسیردهی مرکزی درخواست‌های API (Front Controller Router): api/index.php
 * ==============================================================================
 * پشتیبانی از آدرس‌های بدون پسوند .php روی هاست‌های cPanel و سرورهای وب
 */

require_once __DIR__ . '/helpers.php';
setApiHeaders();

// استخراج مسیر پس از /api/ به صورت منعطف و ایمن
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$parsed = parse_url($requestUri, PHP_URL_PATH) ?? '/';

$pos = strpos($parsed, '/api');
if ($pos !== false) {
    $sub = substr($parsed, $pos + 4); // بعد از /api
    $path = trim($sub, '/');
} else {
    $path = trim($parsed, '/');
}

// در صورت درخواست مستقیم /api/ ریدایرکت به health
if ($path === '' || $path === 'index' || $path === 'index.php') {
    $path = 'health';
}

// حذف پسوند .php در صورت ارسال
if (str_ends_with($path, '.php')) {
    $path = substr($path, 0, -4);
}

// نگاشت مسیرها به فایل‌های مربوطه
$routes = [
    'health'           => 'health.php',
    'auth'             => 'auth.php',
    'campaigns'        => 'campaigns.php',
    'payments'         => 'payments.php',
    'payment/initiate' => 'payment/initiate.php',
    'payment/verify'   => 'payment/verify.php',
    'users'            => 'users.php',
    'notifications'    => 'notifications.php',
    'logs'             => 'logs.php',
    'settings'         => 'settings.php',
    'terms'            => 'terms.php',
    'tickets'          => 'tickets.php',
    'upload'           => 'upload.php',
];

if (isset($routes[$path])) {
    $targetFile = __DIR__ . '/' . $routes[$path];
    if (file_exists($targetFile)) {
        require $targetFile;
        exit();
    }
}

// در صورت نبود مسیر منطبق
jsonError("اندپوینت درخواستی در سامانه یافت نشد: $path", 404);
