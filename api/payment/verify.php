<?php
/**
 * ==============================================================================
 * اعتبارسنجی نهایی پرداخت (Payment Verify): api/payment/verify.php
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

$trackingCode = trim($input['tracking_code'] ?? '');
$authority    = trim($input['authority'] ?? '');
$statusParam  = trim($input['status_param'] ?? '');
$refId        = trim($input['ref_id'] ?? '');

if ($trackingCode === '') {
    jsonError('کد پیگیری معتبر نیست.', 400);
}

// واکشی تراکنش از دیتابیس با Prepared Statement
$stmt = $db->prepare('SELECT * FROM payments WHERE tracking_code = ? LIMIT 1');
$stmt->execute([$trackingCode]);
$payment = $stmt->fetch();

if (!$payment) {
    jsonError('تراکنش با این کد پیگیری یافت نشد.', 404);
}

// اگر تراکنش قبلاً با موفقیت اعتبارسنجی و ثبت شده است
if (in_array($payment['status'], ['successful', 'success'])) {
    echo json_encode([
        'success'          => true,
        'message'          => 'پرداخت قبلاً تایید گردیده است.',
        'status'           => 'successful',
        'already_verified' => true,
        'transaction_id'   => $payment['transaction_id'],
        'tracking_code'    => $payment['tracking_code'],
        'amount'           => (int)$payment['amount'],
        'verified_at'      => $payment['verified_at'],
        'payment'          => $payment,
        'data'             => [
            'status'           => 'successful',
            'already_verified' => true,
            'transaction_id'   => $payment['transaction_id'],
            'tracking_code'    => $payment['tracking_code'],
            'amount'           => (int)$payment['amount'],
            'verified_at'      => $payment['verified_at'],
            'payment'          => $payment
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

// در صورت انصراف کاربر در صفحه درگاه
if ($statusParam === 'CANCELLED') {
    $up = $db->prepare("UPDATE payments SET status = 'cancelled', updated_at = NOW() WHERE id = ?");
    $up->execute([$payment['id']]);
    recordAuditLog($db, 'لغو پرداخت', $payment['payer_name'], $trackingCode, 'انصراف کاربر از پرداخت در درگاه بانکی', 'لغو شده');

    jsonError('پرداخت توسط کاربر لغو گردید.', 400, [
        'status' => 'cancelled',
        'tracking_code' => $trackingCode
    ]);
}

// در صورت خطا یا ناموفق بودن تراکنش در بانک
if ($statusParam !== 'OK') {
    $up = $db->prepare("UPDATE payments SET status = 'failed', updated_at = NOW() WHERE id = ?");
    $up->execute([$payment['id']]);
    recordAuditLog($db, 'پرداخت ناموفق', $payment['payer_name'], $trackingCode, 'خطا در انجام تراکنش درگاه بانکی', 'ناموفق');

    jsonError('تراکنش بانکی با خطا مواجه شد.', 400, [
        'status' => 'failed',
        'tracking_code' => $trackingCode
    ]);
}

// شروع تراکنش دیتابیس برای ثبت پرداخت و بروزرسانی حساب کاربر
$db->beginTransaction();

try {
    $finalRefId = $refId ?: ('TXN-' . random_int(10000000, 99999999));
    $verifiedAt = date('Y-m-d H:i:s');
    $amount     = (int)$payment['amount'];
    $phone      = trim($payment['phone'] ?? '');
    $payerName  = trim($payment['payer_name'] ?? '');
    $isAnon     = (int)$payment['is_anonymous'];

    // ۱. ثبت یا بروزرسانی مشخصات کاربر مشارکت‌کننده در جدول users
    $userId = null;
    if ($phone !== '') {
        $uStmt = $db->prepare('SELECT id, total_amount, payments_count FROM users WHERE phone = ? LIMIT 1');
        $uStmt->execute([$phone]);
        $existingUser = $uStmt->fetch();

        if ($existingUser) {
            $newTotal = (int)$existingUser['total_amount'] + $amount;
            $newCount = (int)$existingUser['payments_count'] + 1;
            $uUp = $db->prepare('UPDATE users SET total_amount = ?, payments_count = ?, last_activity = NOW() WHERE id = ?');
            $uUp->execute([$newTotal, $newCount, $existingUser['id']]);
            $userId = $existingUser['id'];
        } else {
            $userId = 'usr-' . time() . '-' . random_int(100, 999);
            $uIns = $db->prepare("INSERT INTO users (
                id, name, phone, is_anonymous, status, is_public_visible,
                payment_status, total_amount, payments_count, last_activity, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'approved', 1, 'successful', ?, 1, NOW(), NOW(), NOW())");
            $uIns->execute([$userId, $payerName, $phone, $isAnon, $amount]);
        }
    }

    // ۲. بروزرسانی تراکنش به وضعیت موفق
    $upStmt = $db->prepare("UPDATE payments SET 
        status = 'successful',
        is_approved = 1,
        transaction_id = ?,
        verified_at = ?,
        paid_at = ?,
        user_id = ?,
        updated_at = NOW()
        WHERE id = ?");
    $upStmt->execute([$finalRefId, $verifiedAt, $verifiedAt, $userId, $payment['id']]);

    // ۳. ایجاد اعلان و ثبت لاگ نظارتی
    $displayName = $isAnon ? "مشارکت‌کننده گمنام ($payerName)" : $payerName;
    createNotification(
        $db,
        'پرداخت موفق در پویش',
        "$displayName با پرداخت " . number_format($amount) . " تومان سهم مشارکت خود را ثبت نمود.",
        'payment',
        0,
        null,
        'site'
    );

    recordAuditLog(
        $db,
        'پرداخت موفق',
        $payerName,
        $trackingCode,
        "واریز موفق مبلغ " . number_format($amount) . " تومان (کد رهگیری: $trackingCode، مرجع: $finalRefId)"
    );

    $db->commit();

    // دریافت نسخه بروزرسانی شده تراکنش
    $fStmt = $db->prepare('SELECT * FROM payments WHERE id = ? LIMIT 1');
    $fStmt->execute([$payment['id']]);
    $updatedPayment = $fStmt->fetch();

    echo json_encode([
        'success'        => true,
        'message'        => 'پرداخت با موفقیت تایید و سهم شما ثبت گردید.',
        'status'         => 'successful',
        'transaction_id' => $finalRefId,
        'tracking_code'  => $trackingCode,
        'amount'         => $amount,
        'verified_at'    => $verifiedAt,
        'payment'        => $updatedPayment,
        'data'           => [
            'status'         => 'successful',
            'transaction_id' => $finalRefId,
            'tracking_code'  => $trackingCode,
            'amount'         => $amount,
            'verified_at'    => $verifiedAt,
            'payment'        => $updatedPayment
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();

} catch (Throwable $e) {
    $db->rollBack();
    error_log('[Payment Verify Error] ' . $e->getMessage());
    jsonError('خطا در ثبت نهایی پرداخت. لطفاً با پشتیبانی تماس بگیرید.', 500);
}
