<?php
/**
 * ==============================================================================
 * مدیریت اتصال به پایگاه‌داده با PDO: api/database.php
 * ==============================================================================
 * برقراری ارتباط پایدار، ایمن و بهینه با دیتابیس MySQL / MariaDB با Prepared Statements
 */

// جلوگیری از دسترسی مستقیم از مرورگر
if (basename($_SERVER['PHP_SELF'] ?? '') === 'database.php') {
    http_response_code(403);
    die(json_encode(['success' => false, 'message' => 'Access Denied']));
}

class Database {
    private static ?PDO $instance = null;

    /**
     * دریافت نمونه یکتای اتصال PDO به پایگاه داده
     */
    public static function getConnection(): PDO {
        if (self::$instance !== null) {
            return self::$instance;
        }

        $config = require __DIR__ . '/config.php';
        $dbConfig = $config['db'];

        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            $dbConfig['host'],
            $dbConfig['port'],
            $dbConfig['dbname'],
            $dbConfig['charset']
        );

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ];

        try {
            self::$instance = new PDO(
                $dsn,
                $dbConfig['username'],
                $dbConfig['password'],
                $options
            );
            return self::$instance;
        } catch (PDOException $e) {
            // ثبت خطای فنی در لاگ سرور بدون افشای رمز عبور یا مسیرها در خروجی مرورگر
            error_log('[DB Error] Connection failed: ' . $e->getMessage());
            throw new Exception('خطا در برقراری ارتباط با پایگاه‌داده MySQL. لطفاً تنظیمات اتصال را بررسی کنید.');
        }
    }
}
