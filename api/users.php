<?php
/**
 * ==============================================================================
 * مدیریت کاربران و مشارکت‌کنندگان (Users API): api/users.php
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

// تمام متدهای این بخش نیازمند لاگین مدیر هستند
$admin = verifyAdminAuth($db);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';
$id     = $_GET['id'] ?? '';

// ------------------------------------------------------------------------------
// دریافت لیست یا جزئیات کاربران (GET)
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    // ۱. دریافت جزئیات یک کاربر و سوابق تراکنش‌های او
    if ($id !== '') {
        $stmt = $db->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $user = $stmt->fetch();

        if (!$user) {
            jsonError('کاربر یافت نشد.', 404);
        }

        $pStmt = $db->prepare('SELECT * FROM payments WHERE user_id = ? OR phone = ? ORDER BY created_at DESC');
        $pStmt->execute([$user['id'], $user['phone']]);
        $payments = $pStmt->fetchAll();

        $user['payments'] = $payments;
        jsonResponse($user);
    }

    // ۲. فیلترها و صفحه‌بندی کاربران
    $search        = trim($_GET['search'] ?? '');
    $status        = $_GET['status'] ?? 'all';
    $paymentStatus = $_GET['payment_status'] ?? 'all';
    $anonymous     = $_GET['anonymous'] ?? 'all';
    $visibility    = $_GET['visibility'] ?? 'all';
    $fromDate      = $_GET['from_date'] ?? null;
    $toDate        = $_GET['to_date'] ?? null;
    $page          = max(1, (int)($_GET['page'] ?? 1));
    $limit         = max(1, min(100, (int)($_GET['limit'] ?? 10)));
    $offset        = ($page - 1) * $limit;

    $where = [];
    $params = [];

    if ($search !== '') {
        $where[] = '(name LIKE ? OR phone LIKE ?)';
        $params[] = "%$search%";
        $params[] = "%$search%";
    }

    if ($status !== 'all') {
        $where[] = 'status = ?';
        $params[] = $status;
    }

    if ($paymentStatus !== 'all') {
        $where[] = 'payment_status = ?';
        $params[] = $paymentStatus;
    }

    if ($anonymous !== 'all') {
        $isAnon = ($anonymous === 'true' || $anonymous === '1' || $anonymous === 'anonymous') ? 1 : 0;
        $where[] = 'is_anonymous = ?';
        $params[] = $isAnon;
    }

    if ($visibility !== 'all') {
        $isVis = ($visibility === 'visible' || $visibility === '1' || $visibility === 'true') ? 1 : 0;
        $where[] = 'is_public_visible = ?';
        $params[] = $isVis;
    }

    if ($fromDate) {
        $where[] = 'created_at >= ?';
        $params[] = $fromDate;
    }

    if ($toDate) {
        $where[] = 'created_at <= ?';
        $params[] = $toDate;
    }

    $whereSql = count($where) > 0 ? ('WHERE ' . implode(' AND ', $where)) : '';

    // ۳. خروجی اکسل / CSV با دقیقاً ۳ ستون الزامی درخواستی کاربر
    if ($action === 'export') {
        $expStmt = $db->prepare("SELECT name, created_at, phone FROM users $whereSql ORDER BY created_at DESC");
        $expStmt->execute($params);
        $rows = $expStmt->fetchAll();

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="users_' . date('Y-m-d') . '.csv"');
        
        // ارسال UTF-8 BOM جهت نمایش صحیح حروف فارسی در مایکروسافت اکسل
        echo "\xEF\xBB\xBF";
        $out = fopen('php://output', 'w');

        // دقیقاً ۳ ستون مشخص شده در الزامات پروژه
        fputcsv($out, ['نام و نام خانوادگی', 'تاریخ عضویت', 'شماره تلفن همراه']);

        foreach ($rows as $r) {
            fputcsv($out, [
                $r['name'] ?: 'بی‌نام',
                $r['created_at'],
                $r['phone']
            ]);
        }
        fclose($out);
        exit();
    }

    // محاسبه آمار کلی کاربران
    $statsStmt = $db->query("SELECT 
        COUNT(*) as total_users,
        COALESCE(SUM(CASE WHEN is_anonymous = 1 THEN 1 ELSE 0 END), 0) as anonymous_users,
        COALESCE(SUM(CASE WHEN is_anonymous = 0 THEN 1 ELSE 0 END), 0) as public_name_users,
        COALESCE(SUM(CASE WHEN payments_count > 0 THEN 1 ELSE 0 END), 0) as active_participants,
        COALESCE(SUM(total_amount), 0) as total_paid_amount
    FROM users");
    $stats = $statsStmt->fetch();

    // محاسبه تعداد کل رکوردهای منطبق
    $countStmt = $db->prepare("SELECT COUNT(*) as total FROM users $whereSql");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetch()['total'];
    $totalPages = max(1, (int)ceil($total / $limit));

    // دریافت داده‌های این صفحه
    $dataStmt = $db->prepare("SELECT * FROM users $whereSql ORDER BY created_at DESC LIMIT $limit OFFSET $offset");
    $dataStmt->execute($params);
    $users = $dataStmt->fetchAll();

    logSafeDiagnostic('users.php', 'GET', true, $action, 'SELECT users', count($users));

    echo json_encode([
        'success'     => true,
        'data'        => $users,
        'total'       => $total,
        'page'        => $page,
        'limit'       => $limit,
        'totalPages'  => $totalPages,
        'stats'       => [
            'total_users'         => (int)$stats['total_users'],
            'anonymous_users'     => (int)$stats['anonymous_users'],
            'public_name_users'   => (int)$stats['public_name_users'],
            'active_participants' => (int)$stats['active_participants'],
            'total_paid_amount'   => (int)$stats['total_paid_amount']
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

// ------------------------------------------------------------------------------
// عملیات ویرایش وضعیت / حذف کاربر (POST)
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    $input = getJsonInput();
    $targetId = $id ?: ($input['id'] ?? '');

    if ($targetId === '') {
        jsonError('شناسه کاربر الزامی است.', 400);
    }

    $cStmt = $db->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $cStmt->execute([$targetId]);
    $user = $cStmt->fetch();

    if (!$user) {
        jsonError('کاربر یافت نشد.', 404);
    }

    // تایید کاربر
    if ($action === 'approve') {
        $prevStatus = $user['status'];
        $db->prepare("UPDATE users SET status = 'approved', is_public_visible = 1, updated_at = NOW() WHERE id = ?")->execute([$targetId]);
        
        createNotification(
            $db,
            'تایید کاربر',
            "کاربر {$user['name']} توسط مدیریت تایید گردید.",
            'user',
            1,
            [
                'type'        => 'user_approval',
                'user_id'     => $targetId,
                'prev_status' => $prevStatus,
                'new_status'  => 'approved'
            ],
            'users'
        );
        recordAuditLog($db, 'تایید کاربر', $admin['email'], $user['name'], 'تایید کاربر جهت نمایش در سایت');
        jsonResponse(null, 200, 'کاربر با موفقیت تایید شد.');
    }

    // رد کاربر
    if ($action === 'reject') {
        $prevStatus = $user['status'];
        $db->prepare("UPDATE users SET status = 'rejected', is_public_visible = 0, updated_at = NOW() WHERE id = ?")->execute([$targetId]);
        recordAuditLog($db, 'رد کاربر', $admin['email'], $user['name'], 'رد کاربر و مخفی‌سازی از سایت');
        jsonResponse(null, 200, 'وضعیت کاربر به رد شده تغییر یافت.');
    }

    // تغییر وضعیت نمایش عمومی کاربر
    if ($action === 'toggle_visibility') {
        $prevVis = (int)$user['is_public_visible'];
        $newVis = $prevVis ? 0 : 1;

        $db->beginTransaction();
        $db->prepare('UPDATE users SET is_public_visible = ?, updated_at = NOW() WHERE id = ?')->execute([$newVis, $targetId]);
        // بروزرسانی وضعیت نمایش پرداخت‌های این کاربر
        $db->prepare('UPDATE payments SET is_approved = ? WHERE user_id = ? OR phone = ?')->execute([$newVis, $targetId, $user['phone']]);

        createNotification(
            $db,
            'تغییر وضعیت نمایش کاربر',
            "نمایش عمومی مشارکت‌های {$user['name']} به حالت " . ($newVis ? 'آشکار' : 'مخفی') . " تغییر یافت.",
            'user',
            1,
            [
                'type'            => 'user_visibility',
                'user_id'         => $targetId,
                'prev_visibility' => $prevVis,
                'new_visibility'  => $newVis
            ],
            'users'
        );

        recordAuditLog($db, 'تغییر نمایش کاربر', $admin['email'], $user['name'], "تغییر وضعیت نمایش به $newVis");
        $db->commit();

        jsonResponse(['is_public_visible' => (bool)$newVis], 200, 'وضعیت نمایش با موفقیت تغییر کرد.');
    }

    // حذف کاربر
    if ($action === 'delete') {
        $userName = $user['name'];
        $db->prepare('DELETE FROM users WHERE id = ?')->execute([$targetId]);
        recordAuditLog($db, 'حذف کاربر', $admin['email'], $userName, 'حذف رکورد کاربر از سامانه');
        jsonResponse(null, 200, 'کاربر با موفقیت حذف شد.');
    }
}

jsonError('درخواست نامعتبر است.', 405);
