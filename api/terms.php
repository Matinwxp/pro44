<?php
/**
 * ==============================================================================
 * قوانین و مقررات پویش (Terms API): api/terms.php
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

$defaultTerms = '<h4>مقدمه و اهداف پویش</h4>
<p>این سامانه جهت تسهیل در جمع‌آوری نذورات و مشارکت‌های مردمی به صورت شفاف، سهم‌بندی شده و دقیق راه‌اندازی شده است. تمامی مبالغ واریزی منحصراً صرف اهداف اعلام‌شده در عنوان و توضیحات پویش می‌گردد.</p>
<h4>نکات مهم واریز وجه</h4>
<ul>
  <li>واریز وجه صرفاً از طریق شبکه رسمی شاپرک و درگاه‌های دارای مجوز انجام می‌شود.</li>
  <li>پس از تکمیل پرداخت، کد پیگیری یکتا نمایش داده شده و سهم شما در داشبورد ثبت می‌شود.</li>
  <li>در صورت تمایل می‌توانید گزینه «میخواهم گمنام باشم» را فعال نمایید؛ در این حالت نام واقعی شما در امور مالی و سیستمی ثبت شده اما در سایت عمومی عنوان «گمنام» درج می‌گردد.</li>
  <li>در صورت بروز هرگونه مغایرت بانکی، وجه کسر شده ظرف ۷۲ ساعت توسط شاپرک بازگردانده می‌شود.</li>
</ul>
<div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 14px 16px; margin-top: 18px; margin-bottom: 18px; font-size: 0.85rem; color: #64748b;">
  <div style="font-weight: 700; color: #334155; margin-bottom: 4px;">پشتیبانی و ارتباط با مسئول پویش</div>
  <div>شماره تماس ثبت‌شده در پویش آماده پاسخگویی به سوالات مشارکت‌کنندگان محترم است.</div>
</div>';

// ------------------------------------------------------------------------------
// دریافت متن قوانین و مقررات (GET)
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    $stmt = $db->query("SELECT terms_content, terms_updated_at FROM settings WHERE id = 'default' LIMIT 1");
    $row = $stmt->fetch();

    $content = (!empty($row['terms_content'])) ? $row['terms_content'] : $defaultTerms;
    $updatedAt = $row['terms_updated_at'] ?? date('Y-m-d H:i:s');

    logSafeDiagnostic('terms.php', 'GET', false, 'read', 'SELECT terms_content');

    echo json_encode([
        'success'    => true,
        'content'    => $content,
        'updated_at' => $updatedAt,
        'data'       => [
            'content'    => $content,
            'updated_at' => $updatedAt
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

// ------------------------------------------------------------------------------
// ذخیره قوانین و مقررات (POST - نیازمند لاگین مدیر)
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    $admin = verifyAdminAuth($db);
    $input = getJsonInput();

    $newContent = trim($input['content'] ?? '');
    if ($newContent === '') {
        jsonError('متن قوانین و مقررات نمی‌تواند خالی باشد.', 400);
    }

    $currStmt = $db->query("SELECT terms_content FROM settings WHERE id = 'default' LIMIT 1");
    $curr = $currStmt->fetch();
    $prevContent = (!empty($curr['terms_content'])) ? $curr['terms_content'] : $defaultTerms;

    $stmt = $db->prepare("INSERT INTO settings (id, terms_content, terms_updated_at, updated_at) 
        VALUES ('default', ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE 
            terms_content = VALUES(terms_content),
            terms_updated_at = NOW(),
            updated_at = NOW()");
    $stmt->execute([$newContent]);
    $affected = $stmt->rowCount();

    createNotification(
        $db,
        'بروزرسانی قوانین و مقررات',
        'متن قوانین و مقررات پویش توسط مدیریت ویرایش و ذخیره گردید.',
        'terms_update',
        1,
        [
            'type'         => 'terms_update',
            'prev_content' => $prevContent,
            'new_content'  => $newContent
        ],
        'admin'
    );

    recordAuditLog($db, 'ویرایش قوانین و مقررات', $admin['email'], 'قوانین و مقررات', 'بروزرسانی متن قوانین پویش');
    logSafeDiagnostic('terms.php', 'POST', true, 'save', 'INSERT/UPDATE terms', $affected);

    echo json_encode([
        'success'    => true,
        'message'    => 'قوانین و مقررات با موفقیت بروزرسانی شد.',
        'content'    => $newContent,
        'data'       => [
            'content' => $newContent
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

jsonError('درخواست نامعتبر است.', 405);
