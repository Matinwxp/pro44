<?php
/**
 * ==============================================================================
 * آپلود امن تصاویر پویش (Upload API): api/upload.php
 * ==============================================================================
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/database.php';

setApiHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('متد درخواست باید POST باشد.', 405);
}

try {
    $db = Database::getConnection();
} catch (Throwable $e) {
    jsonError('خطا در اتصال به پایگاه داده', 500);
}

// آپلود تصویر بنر پویش فقط توسط مدیر مجاز است
$admin = verifyAdminAuth($db);

$config = require __DIR__ . '/config.php';
$uploadConfig = $config['upload'];

if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $errMsg = 'فایلی برای آپلود ارسال نشده یا خطایی رخ داده است.';
    if (isset($_FILES['image']['error'])) {
        switch ($_FILES['image']['error']) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                $errMsg = 'حجم فایل بیشتر از حد مجاز سرور است.';
                break;
            case UPLOAD_ERR_PARTIAL:
                $errMsg = 'فایل به صورت ناقص آپلود شد.';
                break;
            case UPLOAD_ERR_NO_FILE:
                $errMsg = 'هیچ فایلی انتخاب نشده است.';
                break;
        }
    }
    jsonError($errMsg, 400);
}

$file = $_FILES['image'];

// اعتبارسنجی حجم فایل (حداکثر ۵ مگابایت)
if ($file['size'] > $uploadConfig['max_size']) {
    jsonError('حجم تصویر نباید بیشتر از ۵ مگابایت باشد.', 400);
}

// اعتبارسنجی پسوند فایل
$origName = $file['name'];
$ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));

if (!in_array($ext, $uploadConfig['allowed_ext'], true)) {
    jsonError('فرمت فایل مجاز نیست. لطفاً یکی از فرمت‌های JPG, PNG, WEBP یا GIF را انتخاب کنید.', 400);
}

// بررسی پسوندهای خطرناک دوتایی (Double Extension) مانند image.php.jpg
if (preg_match('/\.(php|phtml|phar|sh|cgi|pl|py|jsp|asp|htaccess)/i', $origName)) {
    jsonError('پسوند فایل نامعتبر و غیرامن است.', 400);
}

// اعتبارسنجی امن نوع MIME با finfo
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $uploadConfig['allowed_mime'], true)) {
    jsonError('محتوای فایل تصویر نامعتبر است.', 400);
}

// اطمینان از وجود پوشه آپلود
$targetDir = $uploadConfig['dir'];
if (!is_dir($targetDir)) {
    mkdir($targetDir, 0755, true);
}

// تولید نام امن و یکتا
$safeFileName = 'camp_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
$targetPath = $targetDir . $safeFileName;

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    jsonError('خطا در ذخیره‌سازی فایل روی سرور.', 500);
}

// تنظیم دسترسی ایمن
@chmod($targetPath, 0644);

$publicUrl = $uploadConfig['url_prefix'] . $safeFileName;

recordAuditLog($db, 'آپلود تصویر', $admin['email'], $safeFileName, "آپلود بنر پویش با حجم " . round($file['size'] / 1024) . " کیلوبایت");

jsonResponse([
    'url'     => $publicUrl,
    'message' => 'تصویر با موفقیت آپلود شد.'
], 200, 'تصویر پوستر آماده شد.');
