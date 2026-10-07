-- ==============================================================================
-- پایگاه داده پویش نذورات و مشارکت‌های مردمی
-- نام دیتابیس: sahmnazr_campaign
-- سازگار با MySQL 8.x / MariaDB و هاست‌های cPanel و DirectAdmin
-- تولید شده به صورت ایمن (بدون DROP TABLE) برای محیط Production
-- ==============================================================================

USE `sahmnazr_campaign`;

SET NAMES utf8mb4;
SET time_zone = '+03:30';

-- ------------------------------------------------------------------------------
-- 1. جدول مدیران سیستم (admins)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `email` VARCHAR(255) NOT NULL COMMENT 'ایمیل یا نام کاربری مدیر',
  `password` VARCHAR(255) NOT NULL COMMENT 'هش رمز عبور bcrypt',
  `token` VARCHAR(255) NULL COMMENT 'توکن احراز هویت نشست',
  `token_expiry` DATETIME NULL COMMENT 'زمان انقضای توکن',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admin_email` (`email`),
  INDEX `idx_admin_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مدیران و دسترسی‌های سامانه';

-- ------------------------------------------------------------------------------
-- 2. جدول پویش‌ها (campaigns)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `campaigns` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL COMMENT 'عنوان پویش',
  `description` TEXT NULL COMMENT 'توضیحات و اهداف پویش',
  `image_url` VARCHAR(500) NULL COMMENT 'آدرس تصویر بنر پویش',
  `total_shares` INT NOT NULL DEFAULT 100 COMMENT 'کل سهم‌های هدف پویش',
  `share_price` BIGINT NOT NULL DEFAULT 50000 COMMENT 'مبلغ هر سهم به تومان',
  `start_date` VARCHAR(50) NULL COMMENT 'تاریخ شروع شمسی',
  `end_date` VARCHAR(50) NULL COMMENT 'تاریخ پایان شمسی',
  `status` ENUM('pending', 'active', 'completed') NOT NULL DEFAULT 'active' COMMENT 'وضعیت پویش',
  `event_location` VARCHAR(255) NULL COMMENT 'محل برگزاری یا توزیع نذورات',
  `event_date` VARCHAR(100) NULL COMMENT 'تاریخ رویداد یا مراسم',
  `event_time` VARCHAR(100) NULL COMMENT 'ساعت رویداد',
  `channel_link` VARCHAR(500) NULL COMMENT 'لینک کانال اطلاع‌رسانی',
  `social_link` VARCHAR(500) NULL COMMENT 'لینک شبکه اجتماعی',
  `contact_phone` VARCHAR(50) NULL COMMENT 'شماره تماس مسئول پویش',
  `additional_notes` TEXT NULL COMMENT 'نکات تکمیلی و توضیحات توزیع',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_campaigns_status` (`status`),
  INDEX `idx_campaigns_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='پویش‌های نذورات و اطعام';

-- ------------------------------------------------------------------------------
-- 3. جدول کاربران و مشارکت‌کنندگان (users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL COMMENT 'نام و نام خانوادگی کاربر',
  `phone` VARCHAR(50) NOT NULL COMMENT 'شماره تلفن همراه کاربر',
  `is_anonymous` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'آیا مشارکت گمنام است',
  `status` ENUM('approved', 'pending', 'rejected') NOT NULL DEFAULT 'approved' COMMENT 'وضعیت تأیید',
  `is_public_visible` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'نمایش در سایت عمومی',
  `payment_status` VARCHAR(50) NOT NULL DEFAULT 'successful' COMMENT 'وضعیت آخرین پرداخت',
  `total_amount` BIGINT NOT NULL DEFAULT 0 COMMENT 'مجموع مبلغ واریزی به تومان',
  `payments_count` INT NOT NULL DEFAULT 1 COMMENT 'تعداد کل تراکنش‌های موفق',
  `last_activity` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'آخرین تاریخ فعالیت',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'تاریخ عضویت',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_phone` (`phone`),
  INDEX `idx_users_status` (`status`),
  INDEX `idx_users_visibility` (`is_public_visible`),
  INDEX `idx_users_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='لیست کاربران و مشارکت‌کنندگان';

-- ------------------------------------------------------------------------------
-- 4. جدول تراکنش‌ها و پرداخت‌ها (payments)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
  `id` VARCHAR(64) NOT NULL,
  `campaign_id` VARCHAR(64) NOT NULL COMMENT 'شناسه پویش مربوطه',
  `user_id` VARCHAR(64) NULL COMMENT 'شناسه کاربر در صورت وجود',
  `payer_name` VARCHAR(255) NOT NULL DEFAULT 'ناشناس' COMMENT 'نام و نام خانوادگی واریزکننده',
  `phone` VARCHAR(50) NULL COMMENT 'شماره همراه واریزکننده',
  `shares` INT NOT NULL DEFAULT 1 COMMENT 'تعداد سهم خریداری شده',
  `amount` BIGINT NOT NULL DEFAULT 0 COMMENT 'مبلغ تراکنش به تومان',
  `tracking_code` VARCHAR(64) NOT NULL COMMENT 'کد رهگیری یکتای سیستم',
  `description` TEXT NULL COMMENT 'نیت یا توضیحات واریزکننده',
  `is_anonymous` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'نمایش به صورت گمنام',
  `is_approved` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'تایید نمایش در لیست',
  `status` ENUM('pending', 'successful', 'failed', 'cancelled', 'verification_failed') NOT NULL DEFAULT 'pending' COMMENT 'وضعیت پرداخت',
  `gateway` VARCHAR(50) NOT NULL DEFAULT 'test_gateway' COMMENT 'نام درگاه پرداخت',
  `transaction_id` VARCHAR(100) NULL COMMENT 'شناسه مرجع بانکی RefID',
  `authority_token` VARCHAR(100) NULL COMMENT 'شناسه پرداخت بانکی Authority',
  `verified_at` DATETIME NULL COMMENT 'زمان تایید تراکنش در شاپرک',
  `paid_at` DATETIME NULL COMMENT 'زمان واریز وجه',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tracking_code` (`tracking_code`),
  INDEX `idx_payments_campaign` (`campaign_id`),
  INDEX `idx_payments_user` (`user_id`),
  INDEX `idx_payments_status` (`status`),
  INDEX `idx_payments_phone` (`phone`),
  INDEX `idx_payments_authority` (`authority_token`),
  INDEX `idx_payments_created` (`created_at`),
  CONSTRAINT `fk_payments_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_payments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='تراکنش‌ها و واریزی‌های پویش';

-- ------------------------------------------------------------------------------
-- 5. جدول تنظیمات درگاه و سیستم (settings)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `id` VARCHAR(32) NOT NULL DEFAULT 'default',
  `active_gateway` VARCHAR(50) NOT NULL DEFAULT 'test_gateway' COMMENT 'درگاه فعال',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'وضعیت فعال بودن درگاه',
  `sandbox` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'حالت تست سندباکس',
  `merchant_id` VARCHAR(255) NULL DEFAULT '' COMMENT 'کد مرچنت درگاه شاپرک',
  `api_key` VARCHAR(255) NULL DEFAULT '' COMMENT 'کلید خصوصی درگاه',
  `terminal_id` VARCHAR(100) NULL DEFAULT '' COMMENT 'شماره ترمینال بانکی',
  `terms_content` LONGTEXT NULL COMMENT 'متن کامل قوانین و مقررات پویش',
  `terms_updated_at` DATETIME NULL COMMENT 'زمان آخرین بروزرسانی قوانین',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='تنظیمات درگاه بانکی و متن قوانین';

-- ------------------------------------------------------------------------------
-- 6. جدول اعلان‌های مدیریت با قابلیت Undo (notifications)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL COMMENT 'عنوان اعلان',
  `description` TEXT NULL COMMENT 'متن توضیحی اعلان',
  `type` VARCHAR(50) NOT NULL DEFAULT 'info' COMMENT 'نوع اعلان',
  `category` VARCHAR(50) NOT NULL DEFAULT 'site' COMMENT 'دسته‌بندی اعلان',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'خوانده شده یا نشده',
  `reversible` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'آیا عملیات قابل لغو است',
  `undone` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'آیا لغو شده است',
  `undo_data` LONGTEXT NULL COMMENT 'داده‌های بازگردانی عملیات (JSON)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_notif_read` (`is_read`),
  INDEX `idx_notif_category` (`category`),
  INDEX `idx_notif_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='اعلان‌ها و رویدادهای مدیریت';

-- ------------------------------------------------------------------------------
-- 7. جدول لاگ‌های نظارتی و حسابرسی (audit_logs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(64) NOT NULL,
  `action_type` VARCHAR(100) NOT NULL COMMENT 'نوع عملیات',
  `actor` VARCHAR(100) NOT NULL DEFAULT 'سیستم' COMMENT 'انجام‌دهنده عملیات',
  `target` VARCHAR(255) NULL COMMENT 'هدف یا شناسه تغییر یافته',
  `description` TEXT NULL COMMENT 'شرح کامل رویداد',
  `status` VARCHAR(50) NOT NULL DEFAULT 'موفق' COMMENT 'نتیجه عملیات',
  `ip_address` VARCHAR(45) NULL COMMENT 'آدرس آی‌پی',
  `user_agent` VARCHAR(255) NULL COMMENT 'مرورگر کاربر',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_logs_action` (`action_type`),
  INDEX `idx_logs_actor` (`actor`),
  INDEX `idx_logs_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='لاگ‌های امنیتی و رویدادهای سیستمی';

-- ------------------------------------------------------------------------------
-- 8. جدول تیکت‌ها و پشتیبانی (tickets)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tickets` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NULL COMMENT 'شناسه کاربر در صورت عضویت',
  `name` VARCHAR(255) NOT NULL COMMENT 'نام ارسال‌کننده تیکت',
  `phone` VARCHAR(50) NOT NULL COMMENT 'شماره تماس',
  `subject` VARCHAR(255) NOT NULL COMMENT 'موضوع تیکت',
  `status` ENUM('open', 'answered', 'closed') NOT NULL DEFAULT 'open' COMMENT 'وضعیت تیکت',
  `priority` ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium' COMMENT 'اولویت بررسی',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_tickets_phone` (`phone`),
  INDEX `idx_tickets_status` (`status`),
  INDEX `idx_tickets_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='تیکت‌های ارتباط و پشتیبانی';

-- ------------------------------------------------------------------------------
-- 9. جدول پیام‌های تیکت (ticket_messages)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ticket_messages` (
  `id` VARCHAR(64) NOT NULL,
  `ticket_id` VARCHAR(64) NOT NULL COMMENT 'شناسه تیکت مربوطه',
  `sender_type` ENUM('user', 'admin') NOT NULL DEFAULT 'user' COMMENT 'ارسال‌کننده',
  `sender_name` VARCHAR(255) NOT NULL COMMENT 'نام فرستنده پیام',
  `message` TEXT NOT NULL COMMENT 'متن پیام',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_messages_ticket` (`ticket_id`),
  CONSTRAINT `fk_messages_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='پیام‌های گفتگوی تیکت';

-- ==============================================================================
-- داده‌های پیش‌فرض و اولیه (Seed Data)
-- این بخش از دستور INSERT IGNORE / ON DUPLICATE KEY UPDATE استفاده می‌کند
-- بنابراین هیچ داده موجودی را پاک یا مخدوش نخواهد کرد.
-- ==============================================================================

-- درج مدیر اولیه (ایمیل: Matinshariati1404@gmail.com - رمز عبور اولیه: 12345678 - پس از اولین ورود خودکار به bcrypt تبدیل می‌شود)
INSERT INTO `admins` (`id`, `email`, `password`) VALUES 
  (1, 'Matinshariati1404@gmail.com', '12345678'),
  (2, 'admin@example.com', '12345678')
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

-- درج تنظیمات اولیه درگاه و قوانین
INSERT INTO `settings` (`id`, `active_gateway`, `is_active`, `sandbox`, `merchant_id`, `api_key`, `terminal_id`, `terms_content`) VALUES 
(
  'default',
  'test_gateway',
  1,
  1,
  '',
  '',
  '',
  '<h4>مقدمه و اهداف پویش</h4><p>این سامانه جهت تسهیل در جمع‌آوری نذورات و مشارکت‌های مردمی به صورت شفاف، سهم‌بندی شده و دقیق راه‌اندازی شده است. تمامی مبالغ واریزی منحصراً صرف اهداف اعلام‌شده در عنوان و توضیحات پویش می‌گردد.</p><h4>نکات مهم واریز وجه</h4><ul><li>واریز وجه صرفاً از طریق شبکه رسمی شاپرک و درگاه‌های دارای مجوز انجام می‌شود.</li><li>پس از تکمیل پرداخت، کد پیگیری یکتا نمایش داده شده و سهم شما در داشبورد ثبت می‌شود.</li><li>در صورت تمایل می‌توانید گزینه «میخواهم گمنام باشم» را فعال نمایید؛ در این حالت نام واقعی شما در امور مالی و سیستمی ثبت شده اما در سایت عمومی عنوان «گمنام» درج می‌گردد.</li><li>در صورت بروز هرگونه مغایرت بانکی، وجه کسر شده ظرف ۷۲ ساعت توسط شاپرک بازگردانده می‌شود.</li></ul><div style=\"background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 14px 16px; margin-top: 18px; margin-bottom: 18px; font-size: 0.85rem; color: #64748b;\"><div style=\"font-weight: 700; color: #334155; margin-bottom: 4px;\">پشتیبانی و ارتباط با مسئول پویش</div><div>شماره تماس ثبت‌شده در پویش آماده پاسخگویی به سوالات مشارکت‌کنندگان محترم است.</div></div>'
)
ON DUPLICATE KEY UPDATE `id` = `id`;

-- درج پویش پیش‌فرض اولیه در صورت خالی بودن جدول
INSERT INTO `campaigns` (`id`, `title`, `description`, `image_url`, `total_shares`, `share_price`, `start_date`, `end_date`, `status`, `event_location`, `event_date`, `event_time`, `channel_link`, `social_link`, `contact_phone`, `additional_notes`) VALUES 
(
  'camp-ghadir-1403',
  'پویش بزرگ اطعام عید سعید غدیر خم',
  'همزمان با فرارسیدن عید بزرگ امامت و ولایت، عید سعید غدیر خم، با مشارکت در این پویش معنوی سهمی در طبخ و توزیع اطعام میان نیازمندان و برپایی ایستگاه‌های صلواتی داشته باشیم. پیامبر اکرم (ص) فرمودند: هرکس مؤمنی را در روز غدیر اطعام کند، مانند کسی است که تمام پیامبران و صدیقان را اطعام کرده است.',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
  2000,
  50000,
  '۱۴۰۳/۰۳/۲۰',
  '۱۴۰۳/۰۴/۰۵',
  'active',
  'تهران، میدان امام حسین (ع) و پایگاه‌های توزیع منتخب',
  'عید سعید غدیر خم',
  'از ساعت ۱۰:۰۰ صبح الی اذان مغرب',
  'https://eitaa.com',
  'https://ble.ir',
  '۰۹۱۰۱۲۳۴۵۶۷',
  'طبخ با رعایت کامل اصول بهداشتی و توزیع غذای گرم به همراه نان گرم در مناطق محروم و سفره‌های عمومی غدیر'
)
ON DUPLICATE KEY UPDATE `id` = `id`;

-- ثبت یک لاگ اولیه در سیستم
INSERT INTO `audit_logs` (`id`, `action_type`, `actor`, `target`, `description`, `status`) VALUES
(
  'log-init-1',
  'راه‌اندازی پایگاه داده',
  'سیستم',
  'sahmnazr_campaign',
  'جداول پایگاه داده با موفقیت ایجاد و آماده‌سازی شدند.',
  'موفق'
)
ON DUPLICATE KEY UPDATE `id` = `id`;
