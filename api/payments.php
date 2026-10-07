<?php
/**
 * ==============================================================================
 * مدیریت و استعلام تراکنش‌ها (Payments API): api/payments.php
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

// بررسی اینکه آیا درخواست از طرف مدیر است یا عموم
$admin = checkAdminAuthOptional($db);

// ------------------------------------------------------------------------------
// دریافت پرداخت‌ها (GET)
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    // ۱. استعلام و پیگیری پرداخت با کد رهگیری یا شماره همراه (Track)
    if ($action === 'track') {
        $query = trim($_GET['query'] ?? '');
        if ($query === '') {
            jsonResponse([]);
        }

        $stmt = $db->prepare('SELECT * FROM payments WHERE tracking_code = ? OR phone = ? ORDER BY created_at DESC LIMIT 20');
        $stmt->execute([$query, $query]);
        $rows = $stmt->fetchAll();

        // اگر کاربر عادی است، نام افراد گمنام ماسک شود
        if (!$admin) {
            $rows = array_map(function($p) {
                if ($p['is_anonymous'] || $p['payer_name'] === 'گمنام') {
                    $p['payer_name'] = 'گمنام';
                }
                // محافظت از حریم خصوصی شماره تماس
                if (!empty($p['phone']) && strlen($p['phone']) >= 7) {
                    $p['phone'] = substr($p['phone'], 0, 4) . '***' . substr($p['phone'], -3);
                }
                return $p;
            }, $rows);
        }

        jsonResponse($rows);
    }

    $campaignId = $_GET['campaign_id'] ?? null;

    // ۲. نمایش عمومی در سایت (سایدبار آخرین مشارکت‌ها)
    if (!$admin) {
        $sql = "SELECT id, campaign_id, payer_name, shares, amount, status, is_anonymous, is_approved, created_at, verified_at, paid_at 
                FROM payments 
                WHERE status IN ('successful', 'success') AND is_approved = 1";
        $params = [];
        if ($campaignId) {
            $sql .= ' AND campaign_id = ?';
            $params[] = $campaignId;
        }
        $sql .= ' ORDER BY COALESCE(verified_at, paid_at, created_at) DESC LIMIT 100';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $payments = $stmt->fetchAll();

        $safeList = array_map(function($p) {
            $isAnon = (bool)$p['is_anonymous'] || $p['payer_name'] === 'گمنام';
            return [
                'id'          => $p['id'],
                'campaign_id' => $p['campaign_id'],
                'payer_name'  => $isAnon ? 'گمنام' : $p['payer_name'],
                'shares'      => (int)$p['shares'],
                'amount'      => (int)$p['amount'],
                'status'      => $p['status'],
                'is_anonymous'=> $isAnon,
                'is_approved' => true,
                'created_at'  => $p['verified_at'] ?: ($p['paid_at'] ?: $p['created_at'])
            ];
        }, $payments);

        jsonResponse($safeList);
    }

    // ۳. نمایش کامل در پنل مدیریت (Admin)
    $sql = 'SELECT * FROM payments';
    $params = [];
    if ($campaignId) {
        $sql .= ' WHERE campaign_id = ?';
        $params[] = $campaignId;
    }
    $sql .= ' ORDER BY created_at DESC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $all = $stmt->fetchAll();

    jsonResponse($all);
}

// ------------------------------------------------------------------------------
// عملیات ویرایش / حذف و ثبت پرداخت (POST - نیازمند لاگین مدیر)
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    $admin = verifyAdminAuth($db);
    $input = getJsonInput();

    // حذف پرداخت
    if ($action === 'delete') {
        $delId = $id ?: ($input['id'] ?? '');
        if ($delId === '') {
            jsonError('شناسه پرداخت نامعتبر است.', 400);
        }

        $check = $db->prepare('SELECT tracking_code, payer_name, amount FROM payments WHERE id = ?');
        $check->execute([$delId]);
        $row = $check->fetch();
        if (!$row) {
            jsonError('پرداخت یافت نشد.', 404);
        }

        $del = $db->prepare('DELETE FROM payments WHERE id = ?');
        $del->execute([$delId]);

        recordAuditLog($db, 'حذف پرداخت', $admin['email'], $row['tracking_code'], "حذف تراکنش به مبلغ {$row['amount']} تومان");
        jsonResponse(null, 200, 'پرداخت با موفقیت حذف شد.');
    }

    // ویرایش وضعیت پرداخت
    if ($action === 'update') {
        $upId = $id ?: ($input['id'] ?? '');
        if ($upId === '') {
            jsonError('شناسه پرداخت نامعتبر است.', 400);
        }

        $check = $db->prepare('SELECT * FROM payments WHERE id = ?');
        $check->execute([$upId]);
        $curr = $check->fetch();
        if (!$curr) {
            jsonError('پرداخت یافت نشد.', 404);
        }

        $newStatus = $input['status'] ?? $curr['status'];
        $shares    = isset($input['shares']) ? (int)$input['shares'] : (int)$curr['shares'];
        $amount    = isset($input['amount']) ? (int)$input['amount'] : (int)$curr['amount'];
        $payerName = trim($input['payer_name'] ?? $curr['payer_name']);
        $phone     = trim($input['phone'] ?? $curr['phone']);
        $desc      = $input['description'] ?? $curr['description'];
        $isAnon    = isset($input['is_anonymous']) ? (int)$input['is_anonymous'] : (int)$curr['is_anonymous'];

        $db->beginTransaction();

        $upStmt = $db->prepare("UPDATE payments SET 
            status = ?, shares = ?, amount = ?, payer_name = ?, 
            phone = ?, description = ?, is_anonymous = ?, updated_at = NOW() 
            WHERE id = ?");
        $upStmt->execute([$newStatus, $shares, $amount, $payerName, $phone, $desc, $isAnon, $upId]);

        // اگر وضعیت به موفق تغییر کرد، کاربر مربوطه در جدول users بروزرسانی شود
        if (in_array($newStatus, ['successful', 'success']) && !in_array($curr['status'], ['successful', 'success'])) {
            if ($phone !== '') {
                $uStmt = $db->prepare('SELECT id, total_amount, payments_count FROM users WHERE phone = ?');
                $uStmt->execute([$phone]);
                $user = $uStmt->fetch();

                if ($user) {
                    $newTotal = $user['total_amount'] + $amount;
                    $newCount = $user['payments_count'] + 1;
                    $uUp = $db->prepare('UPDATE users SET total_amount = ?, payments_count = ?, last_activity = NOW() WHERE id = ?');
                    $uUp->execute([$newTotal, $newCount, $user['id']]);
                    $userId = $user['id'];
                } else {
                    $userId = 'usr-' . time() . '-' . random_int(100, 999);
                    $uIns = $db->prepare("INSERT INTO users (id, name, phone, is_anonymous, status, is_public_visible, total_amount, payments_count, last_activity, created_at) VALUES (?, ?, ?, ?, 'approved', 1, ?, 1, NOW(), NOW())");
                    $uIns->execute([$userId, $payerName, $phone, $isAnon, $amount]);
                }
                $db->prepare('UPDATE payments SET user_id = ? WHERE id = ?')->execute([$userId, $upId]);
            }
        }

        recordAuditLog($db, 'ویرایش پرداخت', $admin['email'], $curr['tracking_code'], "تغییر وضعیت از {$curr['status']} به {$newStatus}");
        $db->commit();

        $fetchStmt = $db->prepare('SELECT * FROM payments WHERE id = ?');
        $fetchStmt->execute([$upId]);
        $updated = $fetchStmt->fetch();

        jsonResponse($updated, 200, 'پرداخت بروزرسانی شد.');
    }

    // ثبت پرداخت دستی از پنل ادمین
    $payerName = trim($input['payer_name'] ?? '');
    if ($payerName === '') {
        jsonError('نام و نام خانوادگی الزامی است.', 400);
    }

    $campaignId = $input['campaign_id'] ?? '';
    if ($campaignId === '') {
        $st = $db->query("SELECT id FROM campaigns WHERE status = 'active' LIMIT 1");
        $camp = $st->fetch();
        $campaignId = $camp ? $camp['id'] : '';
    }

    // بررسی وجود پویش جهت ممانعت از خطای کلید خارجی
    $chkCamp = $db->prepare('SELECT id FROM campaigns WHERE id = ? LIMIT 1');
    $chkCamp->execute([$campaignId]);
    if (!$chkCamp->fetch()) {
        $stLatest = $db->query("SELECT id FROM campaigns ORDER BY created_at DESC LIMIT 1");
        $latest = $stLatest->fetch();
        if ($latest) {
            $campaignId = $latest['id'];
        } else {
            jsonError('هیچ پویشی در سامانه یافت نشد. ابتدا یک پویش ثبت کنید.', 400);
        }
    }

    $shares     = max(1, (int)($input['shares'] ?? 1));
    $amount     = (int)($input['amount'] ?? 0);
    $phone      = trim($input['phone'] ?? '');
    $desc       = trim($input['description'] ?? '');
    $isAnon     = (int)($input['is_anonymous'] ?? 0);
    $status     = $input['status'] ?? 'successful';
    $tracking   = trim($input['tracking_code'] ?? '') ?: generateTrackingCode();
    $newId      = 'pay-' . time() . '-' . random_int(100, 999);
    $txnId      = 'MANUAL-' . time();
    $isSuccess  = in_array($status, ['successful', 'success']);
    $verifiedAt = $isSuccess ? date('Y-m-d H:i:s') : null;

    $db->beginTransaction();

    $userId = null;
    // کاربر مشارکت‌کننده فقط در صورت موفق بودن پرداخت ایجاد یا بروزرسانی می‌شود
    if ($phone !== '' && $isSuccess) {
        $uStmt = $db->prepare('SELECT id, total_amount, payments_count FROM users WHERE phone = ?');
        $uStmt->execute([$phone]);
        $user = $uStmt->fetch();

        if ($user) {
            $newTotal = $user['total_amount'] + $amount;
            $newCount = $user['payments_count'] + 1;
            $db->prepare('UPDATE users SET total_amount = ?, payments_count = ?, last_activity = NOW() WHERE id = ?')->execute([$newTotal, $newCount, $user['id']]);
            $userId = $user['id'];
        } else {
            $userId = 'usr-' . time() . '-' . random_int(100, 999);
            $db->prepare("INSERT INTO users (id, name, phone, is_anonymous, status, is_public_visible, total_amount, payments_count, last_activity, created_at) VALUES (?, ?, ?, ?, 'approved', 1, ?, 1, NOW(), NOW())")
               ->execute([$userId, $payerName, $phone, $isAnon, $amount]);
        }
    }

    $insStmt = $db->prepare("INSERT INTO payments (
        id, campaign_id, user_id, payer_name, phone, shares, amount,
        tracking_code, description, is_anonymous, is_approved, status,
        gateway, transaction_id, authority_token, verified_at, paid_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'manual', ?, ?, ?, ?, NOW())");

    $insStmt->execute([
        $newId, $campaignId, $userId, $payerName, $phone, $shares, $amount,
        $tracking, $desc, $isAnon, $status, $txnId, 'AUTH_' . time(),
        $verifiedAt, $verifiedAt
    ]);

    recordAuditLog($db, 'ثبت پرداخت دستی', $admin['email'], $tracking, "واریز مبلغ $amount تومان برای $payerName (وضعیت: $status)");
    logSafeDiagnostic('payments.php', 'POST', true, 'manual_create', 'INSERT payments', 1);

    $db->commit();

    $fetchStmt = $db->prepare('SELECT * FROM payments WHERE id = ?');
    $fetchStmt->execute([$newId]);
    $created = $fetchStmt->fetch();

    jsonResponse($created, 201, 'پرداخت با موفقیت ثبت شد.');
}

jsonError('درخواست نامعتبر است.', 405);
