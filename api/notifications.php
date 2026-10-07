<?php
/**
 * ==============================================================================
 * مدیریت اعلان‌ها و لغو تغییرات (Notifications & Undo API): api/notifications.php
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

// تمام متدها نیازمند لاگین مدیر هستند
$admin = verifyAdminAuth($db);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';
$id     = $_GET['id'] ?? '';

// ------------------------------------------------------------------------------
// دریافت لیست اعلان‌ها (GET)
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    $stmt = $db->query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
    $notifications = $stmt->fetchAll();

    // تبدیل فیلدهای بولین و پارس JSON undo_data
    $formatted = array_map(function($n) {
        return [
            'id'          => $n['id'],
            'title'       => $n['title'],
            'description' => $n['description'],
            'type'        => $n['type'],
            'category'    => $n['category'],
            'is_read'     => (bool)$n['is_read'],
            'reversible'  => (bool)$n['reversible'],
            'undone'      => (bool)$n['undone'],
            'undo_data'   => !empty($n['undo_data']) ? json_decode($n['undo_data'], true) : null,
            'created_at'  => $n['created_at']
        ];
    }, $notifications);

    $unreadCountStmt = $db->query('SELECT COUNT(*) as unread FROM notifications WHERE is_read = 0');
    $unreadCount = (int)$unreadCountStmt->fetch()['unread'];

    logSafeDiagnostic('notifications.php', 'GET', true, 'list', 'SELECT notifications', count($formatted));

    echo json_encode([
        'success'      => true,
        'data'         => $formatted,
        'unread_count' => $unreadCount
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

// ------------------------------------------------------------------------------
// عملیات خواندن و بازگردانی (POST)
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    // خواندن همه اعلان‌ها
    if ($action === 'read_all') {
        $db->exec('UPDATE notifications SET is_read = 1 WHERE is_read = 0');
        logSafeDiagnostic('notifications.php', 'POST', true, 'read_all', 'UPDATE is_read=1');
        jsonResponse(null, 200, 'همه اعلان‌ها به عنوان خوانده شده علامت‌گذاری شدند.');
    }

    // خواندن یک اعلان
    if ($action === 'read') {
        if ($id === '') jsonError('شناسه اعلان الزامی است.', 400);
        $db->prepare('UPDATE notifications SET is_read = 1 WHERE id = ?')->execute([$id]);
        logSafeDiagnostic('notifications.php', 'POST', true, 'read', 'UPDATE is_read=1', 1);
        jsonResponse(null, 200, 'اعلان خوانده شد.');
    }

    // عملیات بازگردانی واقعی در دیتابیس (Undo)
    if ($action === 'undo') {
        if ($id === '') jsonError('شناسه اعلان الزامی است.', 400);

        $stmt = $db->prepare('SELECT * FROM notifications WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $notif = $stmt->fetch();

        if (!$notif) {
            jsonError('اعلان مورد نظر یافت نشد.', 404);
        }

        if (empty($notif['reversible']) || empty($notif['undo_data'])) {
            jsonError('این عملیات قابل بازگردانی نیست.', 400);
        }

        if (!empty($notif['undone'])) {
            jsonError('این عملیات قبلاً لغو و بازگردانده شده است.', 400);
        }

        $undoData = json_decode($notif['undo_data'], true);
        if (!$undoData || !is_array($undoData)) {
            jsonError('اطلاعات بازگردانی نامعتبر است.', 400);
        }

        $db->beginTransaction();
        try {
            $undoType = $undoData['type'] ?? '';

            // ۱. بازگردانی وضعیت پویش
            if ($undoType === 'campaign_status') {
                $campId     = $undoData['campaign_id'] ?? '';
                $prevStatus = $undoData['prev_status'] ?? 'pending';
                if ($campId !== '') {
                    $uCamp = $db->prepare('UPDATE campaigns SET status = ?, updated_at = NOW() WHERE id = ?');
                    $uCamp->execute([$prevStatus, $campId]);
                }
            }

            // ۲. بازگردانی تأیید/رد کاربر
            elseif ($undoType === 'user_approval') {
                $userId     = $undoData['user_id'] ?? '';
                $prevStatus = $undoData['prev_status'] ?? 'pending';
                $isVis      = ($prevStatus === 'approved') ? 1 : 0;
                if ($userId !== '') {
                    $uUser = $db->prepare('UPDATE users SET status = ?, is_public_visible = ?, updated_at = NOW() WHERE id = ?');
                    $uUser->execute([$prevStatus, $isVis, $userId]);
                }
            }

            // ۳. بازگردانی نمایش عمومی کاربر
            elseif ($undoType === 'user_visibility') {
                $userId  = $undoData['user_id'] ?? '';
                $prevVis = (int)($undoData['prev_visibility'] ?? 1);
                if ($userId !== '') {
                    $uUser = $db->prepare('UPDATE users SET is_public_visible = ?, updated_at = NOW() WHERE id = ?');
                    $uUser->execute([$prevVis, $userId]);
                    // بروزرسانی پرداخت‌ها
                    $db->prepare('UPDATE payments SET is_approved = ? WHERE user_id = ?')->execute([$prevVis, $userId]);
                }
            }

            // ۴. بازگردانی متن قوانین و مقررات
            elseif ($undoType === 'terms_update') {
                $prevContent = $undoData['prev_content'] ?? '';
                $db->prepare('UPDATE settings SET terms_content = ?, terms_updated_at = NOW() WHERE id = "default"')->execute([$prevContent]);
            }

            // علامت‌گذاری اعلان به عنوان لغو شده
            $newTitle = $notif['title'] . ' (لغو شد)';
            $upNotif = $db->prepare('UPDATE notifications SET undone = 1, is_read = 1, title = ? WHERE id = ?');
            $upNotif->execute([$newTitle, $id]);

            recordAuditLog($db, 'لغو تغییرات (Undo)', $admin['email'], $notif['title'], 'بازگردانی موفق عملیات به وضعیت قبلی');

            $db->commit();
            jsonResponse([
                'undone' => true
            ], 200, 'عملیات با موفقیت به حالت قبلی بازگردانده شد.');

        } catch (Throwable $e) {
            $db->rollBack();
            error_log('[Undo Error] ' . $e->getMessage());
            jsonError('خطا در بازگردانی عملیات.', 500);
        }
    }
}

jsonError('درخواست نامعتبر است.', 405);
