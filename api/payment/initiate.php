<?php
/**
 * ==============================================================================
 * شروع فرآیند پرداخت و اتصال به درگاه (Payment Initiate): api/payment/initiate.php
 * ==============================================================================
 */

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../database.php';

setApiHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('متد درخواست باید POST باشد.', 405);
}

try {
    $db = Database::getConnection();
} catch (Throwable $e) {
    jsonError('خطا در اتصال به پایگاه داده', 500);
}

$input = getJsonInput();

$campaignId   = trim($input['campaign_id'] ?? '');
$payerName    = trim($input['payer_name'] ?? '');
$phone        = trim($input['phone'] ?? '');
$shares       = max(1, (int)($input['shares'] ?? 1));
$description  = trim($input['description'] ?? '');
$isAnonymous  = !empty($input['is_anonymous']) ? 1 : 0;
$callbackUrl  = trim($input['callback_url'] ?? '/');
$gateway      = trim($input['gateway'] ?? '');

// اعتبارسنجی فیلدهای الزامی
if ($campaignId === '') {
    jsonError('شناسه پویش الزامی است.', 400);
}

if ($payerName === '') {
    jsonError('لطفاً نام و نام خانوادگی خود را وارد کنید.', 400);
}

if ($phone === '') {
    jsonError('لطفاً شماره تلفن همراه خود را وارد کنید.', 400);
}

// استعلام مشخصات پویش از دیتابیس برای اعتبارسنجی مبلغ واقعی هر سهم
$cStmt = $db->prepare('SELECT id, title, share_price, status FROM campaigns WHERE id = ? LIMIT 1');
$cStmt->execute([$campaignId]);
$campaign = $cStmt->fetch();

if (!$campaign) {
    jsonError('پویش مورد نظر یافت نشد.', 404);
}

if ($campaign['status'] !== 'active') {
    jsonError('این پویش در حال حاضر فعال نیست و امکان واریز وجود ندارد.', 400);
}

// اعتبارسنجی امن مبلغ در سمت سرور (جلوگیری از دستکاری مقدار در فرانت‌اند)
$sharePrice = (int)$campaign['share_price'];
$calculatedAmount = $shares * $sharePrice;

if ($calculatedAmount <= 0) {
    jsonError('مبلغ محاسبه شده سهم نامعتبر است.', 400);
}

// استعلام درگاه فعال از تنظیمات دیتابیس
$sStmt = $db->query("SELECT active_gateway, sandbox, merchant_id FROM settings WHERE id = 'default' LIMIT 1");
$settings = $sStmt->fetch() ?: ['active_gateway' => 'test_gateway', 'sandbox' => 1];

$activeGateway = $gateway ?: ($settings['active_gateway'] ?? 'test_gateway');

// تولید شناسه‌های یکتا
$trackingCode   = !empty($input['tracking_code']) ? trim($input['tracking_code']) : generateTrackingCode();
$authorityToken = 'AUTH_' . time() . '_' . random_int(1000, 9999);
$paymentId      = 'pay-' . time() . '-' . random_int(100, 999);

// ثبت تراکنش با وضعیت اولیه pending در MySQL
$stmt = $db->prepare("INSERT INTO payments (
    id, campaign_id, user_id, payer_name, phone, shares, amount,
    tracking_code, description, is_anonymous, is_approved, status,
    gateway, transaction_id, authority_token, verified_at, paid_at,
    created_at, updated_at
) VALUES (
    ?, ?, NULL, ?, ?, ?, ?,
    ?, ?, ?, 0, 'pending',
    ?, NULL, ?, NULL, NULL,
    NOW(), NOW()
)");

$stmt->execute([
    $paymentId,
    $campaignId,
    $payerName,
    $phone,
    $shares,
    $calculatedAmount,
    $trackingCode,
    $description,
    $isAnonymous,
    $activeGateway,
    $authorityToken
]);

// در محیط شبیه‌ساز یا هاست، به صفحه شبیه‌ساز یا درگاه متصل می‌شود
$redirectUrl = "/gateway-sim.html?payment_id=" . urlencode($paymentId) .
               "&track=" . urlencode($trackingCode) .
               "&tracking_code=" . urlencode($trackingCode) .
               "&amount=" . $calculatedAmount .
               "&authority=" . urlencode($authorityToken) .
               "&gateway=" . urlencode($activeGateway) .
               "&callback=" . urlencode($callbackUrl);

logSafeDiagnostic('payment/initiate.php', 'POST', false, 'initiate', "INSERT pending payment: ID=$paymentId, Track=$trackingCode, Amount=$calculatedAmount");

echo json_encode([
    'success'       => true,
    'message'       => 'تراکنش با موفقیت ایجاد شد.',
    'payment_id'    => $paymentId,
    'tracking_code' => $trackingCode,
    'status'        => 'pending',
    'redirect_url'  => $redirectUrl,
    'authority'     => $authorityToken,
    'amount'        => $calculatedAmount,
    'gateway'       => $activeGateway,
    'data'          => [
        'payment_id'    => $paymentId,
        'tracking_code' => $trackingCode,
        'status'        => 'pending',
        'redirect_url'  => $redirectUrl,
        'authority'     => $authorityToken,
        'amount'        => $calculatedAmount,
        'gateway'       => $activeGateway
    ]
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
exit();
