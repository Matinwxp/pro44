<?php
/**
 * ==============================================================================
 * سامانه تیکت‌ها و پشتیبانی (Tickets API): api/tickets.php
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
$admin  = checkAdminAuthOptional($db);

// ------------------------------------------------------------------------------
// دریافت تیکت‌ها (GET)
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    // دریافت یک تیکت و پیام‌های گفتگو
    if ($id !== '') {
        $stmt = $db->prepare('SELECT * FROM tickets WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $ticket = $stmt->fetch();

        if (!$ticket) {
            jsonError('تیکت یافت نشد.', 404);
        }

        // اگر کاربر عادی است، شماره همراه باید با شماره تیکت مطابقت داشته باشد
        $phoneQuery = trim($_GET['phone'] ?? '');
        if (!$admin && $phoneQuery !== '' && $ticket['phone'] !== $phoneQuery) {
            jsonError('دسترسی غیرمجاز.', 403);
        }

        $mStmt = $db->prepare('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC');
        $mStmt->execute([$id]);
        $ticket['messages'] = $mStmt->fetchAll();

        jsonResponse($ticket);
    }

    // دریافت لیست تیکت‌ها
    if ($admin) {
        $stmt = $db->query('SELECT * FROM tickets ORDER BY updated_at DESC');
        jsonResponse($stmt->fetchAll());
    } else {
        $phone = trim($_GET['phone'] ?? '');
        if ($phone === '') {
            jsonResponse([]);
        }
        $stmt = $db->prepare('SELECT * FROM tickets WHERE phone = ? ORDER BY updated_at DESC');
        $stmt->execute([$phone]);
        jsonResponse($stmt->fetchAll());
    }
}

// ------------------------------------------------------------------------------
// ثبت یا پاسخ به تیکت (POST)
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    $input = getJsonInput();

    // ایجاد تیکت جدید
    if ($action === 'create' || $action === '') {
        $name    = trim($input['name'] ?? '');
        $phone   = trim($input['phone'] ?? '');
        $subject = trim($input['subject'] ?? '');
        $message = trim($input['message'] ?? '');

        if ($name === '' || $phone === '' || $subject === '' || $message === '') {
            jsonError('تمام فیلدها (نام، شماره، موضوع و متن پیام) الزامی هستند.', 400);
        }

        $ticketId  = 'tkt-' . time() . '-' . random_int(100, 999);
        $messageId = 'msg-' . time() . '-' . random_int(100, 999);

        $db->beginTransaction();

        $tStmt = $db->prepare("INSERT INTO tickets (id, name, phone, subject, status, priority, created_at, updated_at) 
            VALUES (?, ?, ?, ?, 'open', 'medium', NOW(), NOW())");
        $tStmt->execute([$ticketId, $name, $phone, $subject]);

        $mStmt = $db->prepare("INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_name, message, created_at) 
            VALUES (?, ?, 'user', ?, ?, NOW())");
        $mStmt->execute([$messageId, $ticketId, $name, $message]);

        createNotification($db, "تیکت پشتیبانی جدید: $subject", "تیکت جدید از طرف $name ($phone) ثبت شد.", 'ticket', 0, null, 'site');

        $db->commit();

        jsonResponse([
            'id'      => $ticketId,
            'subject' => $subject
        ], 201, 'تیکت شما با موفقیت ثبت شد و به زودی بررسی خواهد شد.');
    }

    // پاسخ به تیکت
    if ($action === 'reply') {
        $ticketId = $id ?: ($input['ticket_id'] ?? '');
        $message  = trim($input['message'] ?? '');

        if ($ticketId === '' || $message === '') {
            jsonError('شناسه تیکت و متن پیام الزامی است.', 400);
        }

        $cStmt = $db->prepare('SELECT * FROM tickets WHERE id = ? LIMIT 1');
        $cStmt->execute([$ticketId]);
        $ticket = $cStmt->fetch();

        if (!$ticket) {
            jsonError('تیکت یافت نشد.', 404);
        }

        $senderType = $admin ? 'admin' : 'user';
        $senderName = $admin ? 'مدیریت سامانه' : ($input['name'] ?? $ticket['name']);
        $newStatus  = $admin ? 'answered' : 'open';

        $db->beginTransaction();

        $msgId = 'msg-' . time() . '-' . random_int(100, 999);
        $mStmt = $db->prepare("INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_name, message, created_at) 
            VALUES (?, ?, ?, ?, ?, NOW())");
        $mStmt->execute([$msgId, $ticketId, $senderType, $senderName, $message]);

        $upStmt = $db->prepare('UPDATE tickets SET status = ?, updated_at = NOW() WHERE id = ?');
        $upStmt->execute([$newStatus, $ticketId]);

        $db->commit();

        jsonResponse([
            'id'          => $msgId,
            'ticket_id'   => $ticketId,
            'sender_type' => $senderType,
            'sender_name' => $senderName,
            'message'     => $message
        ], 200, 'پاسخ شما با موفقیت ثبت شد.');
    }

    // بستن تیکت
    if ($action === 'close') {
        $ticketId = $id ?: ($input['ticket_id'] ?? '');
        if ($ticketId === '') jsonError('شناسه تیکت الزامی است.', 400);

        $upStmt = $db->prepare("UPDATE tickets SET status = 'closed', updated_at = NOW() WHERE id = ?");
        $upStmt->execute([$ticketId]);

        jsonResponse(null, 200, 'تیکت بسته شد.');
    }
}

jsonError('درخواست نامعتبر است.', 405);
