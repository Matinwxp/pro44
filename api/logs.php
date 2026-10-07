<?php
/**
 * ==============================================================================
 * لاگ‌ها و رویدادهای امنیتی سیستم (Audit Logs API): api/logs.php
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

// این بخش فقط برای مدیر در دسترس است
$admin = verifyAdminAuth($db);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('متد درخواست باید GET باشد.', 405);
}

$search     = trim($_GET['search'] ?? '');
$actionType = $_GET['action_type'] ?? 'all';
$actor      = $_GET['actor'] ?? 'all';
$fromDate   = $_GET['from_date'] ?? null;
$toDate     = $_GET['to_date'] ?? null;
$page       = max(1, (int)($_GET['page'] ?? 1));
$limit      = max(1, min(100, (int)($_GET['limit'] ?? 15)));
$offset     = ($page - 1) * $limit;

$where = [];
$params = [];

if ($search !== '') {
    $where[] = '(description LIKE ? OR target LIKE ? OR actor LIKE ?)';
    $params[] = "%$search%";
    $params[] = "%$search%";
    $params[] = "%$search%";
}

if ($actionType !== 'all') {
    $where[] = 'action_type = ?';
    $params[] = $actionType;
}

if ($actor !== 'all') {
    $where[] = 'actor = ?';
    $params[] = $actor;
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

$countStmt = $db->prepare("SELECT COUNT(*) as total FROM audit_logs $whereSql");
$countStmt->execute($params);
$total = (int)$countStmt->fetch()['total'];
$totalPages = max(1, (int)ceil($total / $limit));

$dataStmt = $db->prepare("SELECT * FROM audit_logs $whereSql ORDER BY created_at DESC LIMIT $limit OFFSET $offset");
$dataStmt->execute($params);
$logs = $dataStmt->fetchAll();

logSafeDiagnostic('logs.php', 'GET', true, 'list', 'SELECT audit_logs', count($logs));

echo json_encode([
    'success'    => true,
    'data'       => $logs,
    'total'      => $total,
    'page'       => $page,
    'limit'      => $limit,
    'totalPages' => $totalPages
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
exit();
