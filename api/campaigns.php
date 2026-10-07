<?php
/**
 * ==============================================================================
 * مدیریت پویش‌ها (Campaigns API): api/campaigns.php
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
$id     = $_GET['id'] ?? '';

/**
 * محاسبه آمار مالی و مشارکت‌های پویش از روی تراکنش‌های واقعی دیتابیس
 */
function attachCampaignStats(PDO $db, array $campaign): array {
    $campId = $campaign['id'];
    $stmt = $db->prepare("
        SELECT 
            COALESCE(SUM(shares), 0) as paid_shares,
            COALESCE(SUM(amount), 0) as collected_amount,
            COUNT(*) as total_payments_count,
            COUNT(DISTINCT COALESCE(NULLIF(phone, ''), payer_name, id)) as participants_count
        FROM payments 
        WHERE campaign_id = ? AND status IN ('successful', 'success')
    ");
    $stmt->execute([$campId]);
    $stats = $stmt->fetch();

    $totalShares = (int)($campaign['total_shares'] ?? 0);
    $sharePrice  = (int)($campaign['share_price'] ?? 0);
    $targetAmount = $totalShares * $sharePrice;

    $paidShares = (int)($stats['paid_shares'] ?? 0);
    $collectedAmount = (int)($stats['collected_amount'] ?? 0);
    $remainingShares = max(0, $totalShares - $paidShares);
    $remainingAmount = max(0, $targetAmount - $collectedAmount);

    $progress = $totalShares > 0 ? round(($paidShares / $totalShares) * 100, 1) : 0;
    if ($progress > 100) $progress = 100;

    return array_merge($campaign, [
        'target_amount'        => $targetAmount,
        'paid_shares'          => $paidShares,
        'remaining_shares'     => $remainingShares,
        'collected_amount'     => $collectedAmount,
        'remaining_amount'     => $remainingAmount,
        'progress'             => $progress,
        'total_payments_count' => (int)($stats['total_payments_count'] ?? 0),
        'participants_count'   => (int)($stats['participants_count'] ?? 0)
    ]);
}

// ------------------------------------------------------------------------------
// دریافت داده‌های پویش (GET)
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    // ۱. دریافت پویش فعال اصلی
    if ($action === 'active') {
        $preferredId = $_GET['preferred_id'] ?? null;
        $campaign = null;

        if ($preferredId) {
            $st = $db->prepare('SELECT * FROM campaigns WHERE id = ? LIMIT 1');
            $st->execute([$preferredId]);
            $campaign = $st->fetch() ?: null;
        }

        if (!$campaign) {
            $st = $db->query("SELECT * FROM campaigns WHERE status = 'active' ORDER BY created_at DESC LIMIT 1");
            $campaign = $st->fetch() ?: null;
        }

        if (!$campaign) {
            $st = $db->query("SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 1");
            $campaign = $st->fetch() ?: null;
        }

        if ($campaign) {
            jsonResponse(attachCampaignStats($db, $campaign));
        } else {
            jsonResponse(null);
        }
    }

    // ۲. دریافت یک پویش با ID
    if ($id !== '') {
        $st = $db->prepare('SELECT * FROM campaigns WHERE id = ? LIMIT 1');
        $st->execute([$id]);
        $camp = $st->fetch();
        if ($camp) {
            jsonResponse(attachCampaignStats($db, $camp));
        } else {
            jsonError('پویش یافت نشد.', 404);
        }
    }

    // ۳. دریافت لیست همه پویش‌ها
    $st = $db->query('SELECT * FROM campaigns ORDER BY created_at DESC');
    $rows = $st->fetchAll();
    $list = array_map(fn($c) => attachCampaignStats($db, $c), $rows);
    jsonResponse($list);
}

// ------------------------------------------------------------------------------
// عملیات مدیریتی پویش‌ها (POST - نیازمند لاگین مدیر)
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    $admin = verifyAdminAuth($db);
    $input = getJsonInput();

    // حذف پویش
    if ($action === 'delete') {
        $delId = $id ?: ($input['id'] ?? '');
        if ($delId === '') {
            jsonError('شناسه پویش نامعتبر است.', 400);
        }

        $check = $db->prepare('SELECT title FROM campaigns WHERE id = ?');
        $check->execute([$delId]);
        $camp = $check->fetch();
        if (!$camp) {
            jsonError('پویش یافت نشد.', 404);
        }

        $delStmt = $db->prepare('DELETE FROM campaigns WHERE id = ?');
        $delStmt->execute([$delId]);

        recordAuditLog($db, 'حذف پویش', $admin['email'], $camp['title'], 'حذف پویش از سامانه');
        jsonResponse(null, 200, 'پویش با موفقیت حذف شد.');
    }

    // ویرایش پویش
    if ($action === 'update') {
        $upId = $id ?: ($input['id'] ?? '');
        if ($upId === '') {
            jsonError('شناسه پویش نامعتبر است.', 400);
        }

        $currStmt = $db->prepare('SELECT * FROM campaigns WHERE id = ? LIMIT 1');
        $currStmt->execute([$upId]);
        $curr = $currStmt->fetch();
        if (!$curr) {
            jsonError('پویش یافت نشد.', 404);
        }

        $title          = trim($input['title'] ?? $curr['title']);
        $description    = $input['description'] ?? $curr['description'];
        $imageUrl       = $input['image_url'] ?? $curr['image_url'];
        $totalShares    = (int)($input['total_shares'] ?? $curr['total_shares']);
        $sharePrice     = (int)($input['share_price'] ?? $curr['share_price']);
        $startDate      = $input['start_date'] ?? $curr['start_date'];
        $endDate        = $input['end_date'] ?? $curr['end_date'];
        $status         = $input['status'] ?? $curr['status'];
        $eventLocation  = $input['event_location'] ?? $curr['event_location'];
        $eventDate      = $input['event_date'] ?? $curr['event_date'];
        $eventTime      = $input['event_time'] ?? $curr['event_time'];
        $channelLink    = $input['channel_link'] ?? $curr['channel_link'];
        $socialLink     = $input['social_link'] ?? $curr['social_link'];
        $contactPhone   = $input['contact_phone'] ?? $curr['contact_phone'];
        $notes          = $input['additional_notes'] ?? $curr['additional_notes'];

        $db->beginTransaction();

        // قانون صریح کسب‌وکار: فقط یک پویش در آن واحد می‌تواند Active باشد
        if ($status === 'active' && $curr['status'] !== 'active') {
            $db->prepare("UPDATE campaigns SET status = 'pending' WHERE id != ? AND status = 'active'")->execute([$upId]);
        }

        $upQuery = "UPDATE campaigns SET 
            title = ?, description = ?, image_url = ?, total_shares = ?, share_price = ?,
            start_date = ?, end_date = ?, status = ?, event_location = ?, event_date = ?,
            event_time = ?, channel_link = ?, social_link = ?, contact_phone = ?,
            additional_notes = ?, updated_at = NOW()
            WHERE id = ?";
        
        $upSql = $db->prepare($upQuery);
        $upSql->execute([
            $title, $description, $imageUrl, $totalShares, $sharePrice,
            $startDate, $endDate, $status, $eventLocation, $eventDate,
            $eventTime, $channelLink, $socialLink, $contactPhone,
            $notes, $upId
        ]);

        if ($status !== $curr['status']) {
            createNotification(
                $db,
                "تغییر وضعیت پویش $title",
                "وضعیت پویش از «{$curr['status']}» به «{$status}» تغییر یافت.",
                'campaign_status',
                1,
                [
                    'type'        => 'campaign_status',
                    'campaign_id' => $upId,
                    'prev_status' => $curr['status'],
                    'new_status'  => $status
                ],
                'admin'
            );
            recordAuditLog($db, 'تغییر وضعیت پویش', $admin['email'], $title, "تغییر از {$curr['status']} به {$status}");
        } else {
            recordAuditLog($db, 'ویرایش پویش', $admin['email'], $title, 'ویرایش مشخصات پویش');
        }

        $db->commit();

        $fetchStmt = $db->prepare('SELECT * FROM campaigns WHERE id = ?');
        $fetchStmt->execute([$upId]);
        $updated = $fetchStmt->fetch();

        jsonResponse(attachCampaignStats($db, $updated), 200, 'پویش با موفقیت ویرایش شد.');
    }

    // ایجاد پویش جدید
    $title = trim($input['title'] ?? '');
    if ($title === '') {
        jsonError('عنوان پویش الزامی است.', 400);
    }

    $newId        = 'camp-' . time() . '-' . random_int(100, 999);
    $description  = $input['description'] ?? '';
    $imageUrl     = $input['image_url'] ?? '';
    $totalShares  = (int)($input['total_shares'] ?? 100);
    $sharePrice   = (int)($input['share_price'] ?? 50000);
    $startDate    = $input['start_date'] ?? '';
    $endDate      = $input['end_date'] ?? '';
    $status       = $input['status'] ?? 'active';
    $eventLoc     = $input['event_location'] ?? '';
    $eventDate    = $input['event_date'] ?? '';
    $eventTime    = $input['event_time'] ?? '';
    $channelLink  = $input['channel_link'] ?? '';
    $socialLink   = $input['social_link'] ?? '';
    $contactPhone = $input['contact_phone'] ?? '';
    $notes        = $input['additional_notes'] ?? '';

    $db->beginTransaction();

    // اجرای قانون تک‌پویشی بودن فعال
    if ($status === 'active') {
        $db->exec("UPDATE campaigns SET status = 'pending' WHERE status = 'active'");
    }

    $insStmt = $db->prepare("INSERT INTO campaigns (
        id, title, description, image_url, total_shares, share_price,
        start_date, end_date, status, event_location, event_date,
        event_time, channel_link, social_link, contact_phone, additional_notes,
        created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())");

    $insStmt->execute([
        $newId, $title, $description, $imageUrl, $totalShares, $sharePrice,
        $startDate, $endDate, $status, $eventLoc, $eventDate,
        $eventTime, $channelLink, $socialLink, $contactPhone, $notes
    ]);

    createNotification($db, 'ایجاد پویش جدید', "پویش «{$title}» ثبت و منتشر شد.", 'campaign', 0, null, 'site');
    recordAuditLog($db, 'ایجاد پویش', $admin['email'], $title, 'ثبت پویش جدید در دیتابیس');

    $db->commit();

    $fetchStmt = $db->prepare('SELECT * FROM campaigns WHERE id = ?');
    $fetchStmt->execute([$newId]);
    $created = $fetchStmt->fetch();

    jsonResponse(attachCampaignStats($db, $created), 201, 'پویش با موفقیت ایجاد شد.');
}

jsonError('درخواست نامعتبر است.', 405);
