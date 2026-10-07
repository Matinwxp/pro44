/**
 * ==============================================================================
 * کتابخانه ارتباط با API و دیتابیس پویش: js/api.js
 * ==============================================================================
 * ارتباط با اندپوینت‌های RESTful پویش و مدیریت محاسبات سهم و مبالغ
 */

function getApiUrl(endpoint) {
  const base = (window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl) || window.API_BASE_URL || '/api';
  const cleanBase = base.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  return `${cleanBase}/${cleanEndpoint}`;
}

function getAuthHeaders(includeJson = true) {
  const headers = {};
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }
  let token = null;
  if (window.AdminAuth && typeof window.AdminAuth.getAuthToken === 'function') {
    token = window.AdminAuth.getAuthToken();
  } else {
    try {
      token = localStorage.getItem('ADMIN_AUTH_TOKEN') 
        || sessionStorage.getItem('ADMIN_AUTH_TOKEN');
    } catch (e) {}
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Auth-Token'] = token;
    headers['X-Admin-Token'] = token;
  }
  return headers;
}

function toPersianDigits(num) {
  if (num === null || num === undefined) return '';
  const str = String(num);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, w => persianDigits[+w]);
}

function toEnglishDigits(str) {
  if (!str) return '';
  const persianNumbers = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicNumbers = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let res = String(str);
  for (let i = 0; i < 10; i++) {
    res = res.replace(persianNumbers[i], i).replace(arabicNumbers[i], i);
  }
  return res;
}

function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '۰';
  const parts = Number(num).toLocaleString('en-US');
  return toPersianDigits(parts);
}

function formatCurrency(num) {
  return `${formatNumber(num)} تومان`;
}

function generateTrackingCode() {
  const letters = 'POY';
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `${letters}-${digits}`;
}

async function getCampaigns() {
  const resp = await fetch(getApiUrl('campaigns'));
  const res = await resp.json();
  if (!res.success) {
    throw new Error(res.message || 'خطا در دریافت لیست پویش‌ها');
  }
  return res.data || [];
}

async function getCampaignById(id) {
  const resp = await fetch(getApiUrl(`campaigns?id=${encodeURIComponent(id)}`));
  const res = await resp.json();
  if (!res.success) {
    throw new Error(res.message || 'پویش یافت نشد');
  }
  return res.data;
}

async function getActiveCampaign(preferredId = null) {
  let url = 'campaigns?action=active';
  if (preferredId) {
    url += `&preferred_id=${encodeURIComponent(preferredId)}`;
  }
  const resp = await fetch(getApiUrl(url));
  const res = await resp.json();
  if (!res.success) {
    throw new Error(res.message || 'خطا در دریافت پویش فعال');
  }
  return res.data || null;
}

async function createCampaign(campaignData) {
  const resp = await fetch(getApiUrl('campaigns'), {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify(campaignData)
  });
  const res = await resp.json();
  if (!res.success) {
    throw new Error(res.message || 'خطا در ایجاد پویش در دیتابیس');
  }
  return res.data;
}

async function updateCampaign(id, updateData) {
  const resp = await fetch(getApiUrl(`campaigns?action=update&id=${encodeURIComponent(id)}`), {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify(updateData)
  });
  const res = await resp.json();
  if (!res.success) {
    throw new Error(res.message || 'خطا در ویرایش پویش');
  }
  return res.data;
}

async function deleteCampaign(id) {
  const resp = await fetch(getApiUrl(`campaigns?action=delete&id=${encodeURIComponent(id)}`), {
    method: 'POST',
    headers: getAuthHeaders(true)
  });
  const res = await resp.json();
  if (!res.success) {
    throw new Error(res.message || 'خطا در حذف پویش');
  }
  return true;
}

async function getPayments(campaignId = null) {
  let url = 'payments';
  if (campaignId) {
    url += `?campaign_id=${encodeURIComponent(campaignId)}`;
  }
  const resp = await fetch(getApiUrl(url), {
    headers: getAuthHeaders(false)
  });
  const res = await resp.json();
  if (!res.success) {
    throw new Error(res.message || 'خطا در دریافت لیست پرداخت‌ها');
  }
  return res.data || [];
}

async function createPayment(paymentData) {
  let cleanName = (paymentData.payer_name || '').trim();
  if (!cleanName || cleanName === 'مشارکت‌کننده ناشناس') {
    cleanName = 'ناشناس';
  }
  const payload = {
    ...paymentData,
    payer_name: cleanName
  };
  const resp = await fetch(getApiUrl('payments'), {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify(payload)
  });
  const res = await resp.json();
  if (!res.success) {
    throw new Error(res.message || 'خطا در ثبت پرداخت');
  }
  return res.data;
}

async function updatePayment(id, updateData) {
  const resp = await fetch(getApiUrl(`payments?action=update&id=${encodeURIComponent(id)}`), {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify(updateData)
  });
  const res = await resp.json();
  if (!res.success) {
    throw new Error(res.message || 'خطا در بروزرسانی پرداخت');
  }
  return res.data;
}

async function deletePayment(id) {
  const resp = await fetch(getApiUrl(`payments?action=delete&id=${encodeURIComponent(id)}`), {
    method: 'POST',
    headers: getAuthHeaders(true)
  });
  const res = await resp.json();
  if (!res.success) {
    throw new Error(res.message || 'خطا در حذف پرداخت');
  }
  return true;
}

async function getPaymentByTrackingCode(trackingCode) {
  const results = await findPaymentsByTrackingOrPhone(trackingCode);
  return results.length > 0 ? results[0] : null;
}

async function findPaymentsByTrackingOrPhone(query) {
  if (!query) return [];
  const clean = toEnglishDigits(query).trim();
  const resp = await fetch(getApiUrl(`payments?action=track&query=${encodeURIComponent(clean)}`));
  const res = await resp.json();
  if (!res.success) {
    return [];
  }
  return res.data || [];
}

async function getPaymentSettings() {
  try {
    const resp = await fetch(getApiUrl('settings'), {
      headers: getAuthHeaders(false)
    });
    const res = await resp.json();
    if (res.success && res.data) {
      return res.data;
    }
  } catch (e) {
    console.warn('تنظیمات درگاه در دسترس نیست:', e);
  }
  return {
    active_gateway: 'test_gateway',
    is_active: true,
    sandbox: true,
    merchant_id: '',
    api_key: '',
    terminal_id: ''
  };
}

async function savePaymentSettings(settings) {
  const resp = await fetch(getApiUrl('settings'), {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify(settings)
  });
  const res = await resp.json();
  if (!res.success) {
    throw new Error(res.message || 'خطا در ذخیره تنظیمات درگاه');
  }
  return res.data || settings;
}

async function initiateGatewayPayment({ campaign_id, payer_name, phone, shares, amount, description, is_anonymous, gateway }) {
  if (!campaign_id) throw new Error('شناسه پویش الزامی است.');
  if (amount <= 0) throw new Error('مبلغ پرداخت نامعتبر است.');
  let cleanName = (payer_name || '').trim();
  if (!cleanName) {
    throw new Error('لطفاً نام و نام خانوادگی خود را وارد کنید.');
  }
  const trackingCode = generateTrackingCode();
  const callbackUrl = window.location.origin + window.location.pathname;

  const resp = await fetch(getApiUrl('payment/initiate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      campaign_id,
      payer_name: cleanName,
      phone: (phone || '').trim(),
      shares: parseInt(toEnglishDigits(shares), 10) || 1,
      amount: parseInt(toEnglishDigits(amount), 10) || 0,
      description: (description || '').trim(),
      is_anonymous: !!is_anonymous,
      gateway: gateway || undefined,
      tracking_code: trackingCode,
      callback_url: callbackUrl
    })
  });
  const res = await resp.json();
  const redirectUrl = res.redirect_url || (res.data && res.data.redirect_url);
  const returnedTracking = res.tracking_code || (res.data && res.data.tracking_code) || trackingCode;
  const returnedAuthority = res.authority || (res.data && res.data.authority);
  const returnedPaymentId = res.payment_id || (res.data && res.data.payment_id);

  if (!res.success || !redirectUrl) {
    throw new Error(res.message || 'خطا در ایجاد تراکنش درگاه بانکی.');
  }
  return {
    success: true,
    redirect_url: redirectUrl,
    payment_id: returnedPaymentId,
    tracking_code: returnedTracking,
    authority: returnedAuthority,
    status: res.status || (res.data && res.data.status) || 'pending'
  };
}

async function verifyGatewayPayment({ tracking_code, authority, status_param, ref_id }) {
  if (!tracking_code) throw new Error('کد پیگیری نامعتبر است.');
  const resp = await fetch(getApiUrl('payment/verify'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tracking_code,
      authority,
      status_param,
      ref_id
    })
  });
  const res = await resp.json();
  return res;
}

async function uploadCampaignImage(file) {
  if (!file) {
    throw new Error('فایلی انتخاب نشده است.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('حجم تصویر نباید بیشتر از ۵ مگابایت باشد.');
  }
  const formData = new FormData();
  formData.append('image', file);
  const headers = getAuthHeaders(false);
  const resp = await fetch(getApiUrl('upload'), {
    method: 'POST',
    headers: headers,
    body: formData
  });
  const res = await resp.json();
  if (!res.success || !res.url) {
    throw new Error(res.message || 'خطا در آپلود تصویر');
  }
  return res.url;
}

function calculateCampaignStats(campaign, allPayments = []) {
  if (!campaign) {
    return {
      total_shares: 0,
      share_price: 0,
      target_amount: 0,
      paid_shares: 0,
      remaining_shares: 0,
      collected_amount: 0,
      remaining_amount: 0,
      progress: 0,
      total_payments_count: 0,
      participants_count: 0
    };
  }

  const total_shares = Number(campaign.total_shares) || 0;
  const share_price = Number(campaign.share_price) || 0;
  const target_amount = total_shares * share_price;

  if (campaign.paid_shares !== undefined && campaign.collected_amount !== undefined) {
    const paid_shares = Number(campaign.paid_shares) || 0;
    const collected_amount = Number(campaign.collected_amount) || 0;
    const remaining_shares = Math.max(0, total_shares - paid_shares);
    const remaining_amount = Math.max(0, target_amount - collected_amount);
    let progress = total_shares > 0 ? (paid_shares / total_shares) * 100 : 0;
    progress = Math.min(100, Math.round(progress * 10) / 10);
    return {
      total_shares,
      share_price,
      target_amount,
      paid_shares,
      remaining_shares,
      collected_amount,
      remaining_amount,
      progress,
      total_payments_count: Number(campaign.total_payments_count) || 0,
      participants_count: Number(campaign.participants_count) || 0
    };
  }

  const relatedPayments = allPayments.filter(p => String(p.campaign_id) === String(campaign.id));
  const successfulPayments = relatedPayments.filter(p => p.status === 'successful' || p.status === 'success');
  const paid_shares = successfulPayments.reduce((sum, p) => sum + (Number(p.shares) || 0), 0);
  const collected_amount = successfulPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remaining_shares = Math.max(0, total_shares - paid_shares);
  const remaining_amount = Math.max(0, target_amount - collected_amount);
  let progress = total_shares > 0 ? (paid_shares / total_shares) * 100 : 0;
  progress = Math.min(100, Math.round(progress * 10) / 10);
  const participantIds = new Set(successfulPayments.map(p => (p.phone || p.payer_name || p.id).trim()));

  return {
    total_shares,
    share_price,
    target_amount,
    paid_shares,
    remaining_shares,
    collected_amount,
    remaining_amount,
    progress,
    total_payments_count: successfulPayments.length,
    participants_count: participantIds.size
  };
}

async function testDatabaseConnection() {
  try {
    const resp = await fetch(getApiUrl('settings?action=test_db'), {
      headers: getAuthHeaders(false)
    });
    const res = await resp.json();
    if (res.success) {
      return { success: true, message: res.message || 'ارتباط با پایگاه‌داده و API سرور برقرار است.' };
    }
    return { success: false, message: res.message || 'خطا در ارتباط با پایگاه‌داده.' };
  } catch (err) {
    try {
      const resp2 = await fetch(getApiUrl('health'));
      const res2 = await resp2.json();
      if (res2.success) {
        return { success: true, message: res2.message || 'ارتباط با پایگاه‌داده و API سرور برقرار است.' };
      }
    } catch (e) {}
    return { success: false, message: `خطای ارتباط با سرور: ${err.message}` };
  }
}

function getMySQLScript() {
  return `-- ==============================================================================
-- ساختار جداول پایگاه‌داده MySQL برای هاست‌های cPanel / DirectAdmin
-- نام پایگاه داده: sahmnazr_campaign
-- فایل: database.sql (ایمن، سازگار و بدون DROP TABLE)
-- ==============================================================================
USE \`sahmnazr_campaign\`;

SET NAMES utf8mb4;

-- جدول مدیران سیستم (admins)
CREATE TABLE IF NOT EXISTS \`admins\` (
  \`id\` INT AUTO_INCREMENT NOT NULL,
  \`email\` VARCHAR(255) NOT NULL COMMENT 'ایمیل مدیر',
  \`password\` VARCHAR(255) NOT NULL COMMENT 'هش رمز عبور bcrypt',
  \`token\` VARCHAR(255) NULL COMMENT 'توکن احراز هویت',
  \`token_expiry\` DATETIME NULL COMMENT 'زمان انقضای توکن',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_admin_email\` (\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول پویش‌ها (campaigns)
CREATE TABLE IF NOT EXISTS \`campaigns\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`title\` VARCHAR(255) NOT NULL COMMENT 'عنوان پویش',
  \`description\` TEXT NULL COMMENT 'توضیحات پویش',
  \`image_url\` VARCHAR(500) NULL COMMENT 'تصویر بنر پویش',
  \`total_shares\` INT NOT NULL DEFAULT 100 COMMENT 'کل سهم‌های هدف',
  \`share_price\` BIGINT NOT NULL DEFAULT 50000 COMMENT 'مبلغ هر سهم به تومان',
  \`start_date\` VARCHAR(50) NULL COMMENT 'تاریخ شروع',
  \`end_date\` VARCHAR(50) NULL COMMENT 'تاریخ پایان',
  \`status\` ENUM('pending', 'active', 'completed') NOT NULL DEFAULT 'active' COMMENT 'وضعیت پویش',
  \`event_location\` VARCHAR(255) NULL COMMENT 'مکان برگزاری',
  \`event_date\` VARCHAR(100) NULL COMMENT 'تاریخ مراسم',
  \`event_time\` VARCHAR(100) NULL COMMENT 'ساعت مراسم',
  \`channel_link\` VARCHAR(500) NULL COMMENT 'لینک کانال ایتا/تلگرام',
  \`social_link\` VARCHAR(500) NULL COMMENT 'لینک بله یا گروه',
  \`contact_phone\` VARCHAR(50) NULL COMMENT 'شماره تماس مسئول',
  \`additional_notes\` TEXT NULL COMMENT 'نکات تکمیلی و شیوه توزیع',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_campaigns_status\` (\`status\`),
  INDEX \`idx_campaigns_created\` (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول کاربران و مشارکت‌کنندگان (users)
CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`name\` VARCHAR(255) NOT NULL COMMENT 'نام و نام خانوادگی',
  \`phone\` VARCHAR(50) NOT NULL COMMENT 'شماره همراه',
  \`is_anonymous\` TINYINT(1) NOT NULL DEFAULT 0,
  \`status\` ENUM('approved', 'pending', 'rejected') NOT NULL DEFAULT 'approved',
  \`is_public_visible\` TINYINT(1) NOT NULL DEFAULT 1,
  \`payment_status\` VARCHAR(50) NOT NULL DEFAULT 'successful',
  \`total_amount\` BIGINT NOT NULL DEFAULT 0,
  \`payments_count\` INT NOT NULL DEFAULT 1,
  \`last_activity\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_users_phone\` (\`phone\`),
  INDEX \`idx_users_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول پرداخت‌ها (payments)
CREATE TABLE IF NOT EXISTS \`payments\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`campaign_id\` VARCHAR(64) NOT NULL COMMENT 'شناسه پویش مربوطه',
  \`user_id\` VARCHAR(64) NULL,
  \`payer_name\` VARCHAR(255) NOT NULL DEFAULT 'ناشناس' COMMENT 'نام واریز کننده',
  \`phone\` VARCHAR(50) NULL COMMENT 'شماره همراه',
  \`shares\` INT NOT NULL DEFAULT 1 COMMENT 'تعداد سهم پرداختی',
  \`amount\` BIGINT NOT NULL DEFAULT 0 COMMENT 'مبلغ پرداختی به تومان',
  \`tracking_code\` VARCHAR(64) NOT NULL COMMENT 'کد رهگیری سیستم',
  \`description\` TEXT NULL COMMENT 'توضیحات و نیت پرداخت',
  \`is_anonymous\` TINYINT(1) NOT NULL DEFAULT 0,
  \`is_approved\` TINYINT(1) NOT NULL DEFAULT 1,
  \`status\` ENUM('pending', 'successful', 'failed', 'cancelled', 'verification_failed') NOT NULL DEFAULT 'pending' COMMENT 'وضعیت تراکنش',
  \`gateway\` VARCHAR(50) NOT NULL DEFAULT 'test_gateway' COMMENT 'درگاه پرداخت',
  \`transaction_id\` VARCHAR(100) NULL COMMENT 'شماره تراکنش بانکی RefID',
  \`authority_token\` VARCHAR(100) NULL COMMENT 'شناسه درگاه بانکی',
  \`verified_at\` DATETIME NULL COMMENT 'زمان تایید نهایی',
  \`paid_at\` DATETIME NULL COMMENT 'زمان پرداخت',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_tracking_code\` (\`tracking_code\`),
  INDEX \`idx_payments_campaign\` (\`campaign_id\`),
  INDEX \`idx_payments_status\` (\`status\`),
  INDEX \`idx_payments_phone\` (\`phone\`),
  CONSTRAINT \`fk_payments_campaign\` FOREIGN KEY (\`campaign_id\`) REFERENCES \`campaigns\` (\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول تنظیمات درگاه و قوانین (settings)
CREATE TABLE IF NOT EXISTS \`settings\` (
  \`id\` VARCHAR(32) NOT NULL DEFAULT 'default',
  \`active_gateway\` VARCHAR(50) NOT NULL DEFAULT 'test_gateway' COMMENT 'درگاه فعال',
  \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`sandbox\` TINYINT(1) NOT NULL DEFAULT 1,
  \`merchant_id\` VARCHAR(255) NULL DEFAULT '',
  \`api_key\` VARCHAR(255) NULL DEFAULT '',
  \`terminal_id\` VARCHAR(100) NULL DEFAULT '',
  \`terms_content\` LONGTEXT NULL,
  \`terms_updated_at\` DATETIME NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول اعلان‌ها (notifications)
CREATE TABLE IF NOT EXISTS \`notifications\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`description\` TEXT NULL,
  \`type\` VARCHAR(50) NOT NULL DEFAULT 'info',
  \`category\` VARCHAR(50) NOT NULL DEFAULT 'site',
  \`is_read\` TINYINT(1) NOT NULL DEFAULT 0,
  \`reversible\` TINYINT(1) NOT NULL DEFAULT 0,
  \`undone\` TINYINT(1) NOT NULL DEFAULT 0,
  \`undo_data\` LONGTEXT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول لاگ‌های سیستم (audit_logs)
CREATE TABLE IF NOT EXISTS \`audit_logs\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`action_type\` VARCHAR(100) NOT NULL,
  \`actor\` VARCHAR(100) NOT NULL DEFAULT 'سیستم',
  \`target\` VARCHAR(255) NULL,
  \`description\` TEXT NULL,
  \`status\` VARCHAR(50) NOT NULL DEFAULT 'موفق',
  \`ip_address\` VARCHAR(45) NULL,
  \`user_agent\` VARCHAR(255) NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول تیکت‌ها (tickets)
CREATE TABLE IF NOT EXISTS \`tickets\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`user_id\` VARCHAR(64) NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`phone\` VARCHAR(50) NOT NULL,
  \`subject\` VARCHAR(255) NOT NULL,
  \`status\` ENUM('open', 'answered', 'closed') NOT NULL DEFAULT 'open',
  \`priority\` ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول پیام‌های تیکت (ticket_messages)
CREATE TABLE IF NOT EXISTS \`ticket_messages\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`ticket_id\` VARCHAR(64) NOT NULL,
  \`sender_type\` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  \`sender_name\` VARCHAR(255) NOT NULL,
  \`message\` TEXT NOT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_tmsg_ticket\` FOREIGN KEY (\`ticket_id\`) REFERENCES \`tickets\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- درج مدیر اولیه در صورت عدم وجود (رمز: 12345678)
INSERT INTO \`admins\` (\`id\`, \`email\`, \`password\`) VALUES 
  (1, 'Matinshariati1404@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
  (2, 'admin@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')
ON DUPLICATE KEY UPDATE \`email\` = VALUES(\`email\`);

-- درج تنظیمات اولیه درگاه
INSERT INTO \`settings\` (\`id\`, \`active_gateway\`, \`is_active\`, \`sandbox\`, \`merchant_id\`, \`api_key\`, \`terminal_id\`) 
VALUES ('default', 'test_gateway', 1, 1, '', '', '') 
ON DUPLICATE KEY UPDATE \`id\` = \`id\`;
`;
}

async function getNotifications() {
  const resp = await fetch(getApiUrl('notifications'), {
    headers: getAuthHeaders(false)
  });
  const res = await resp.json();
  if (!res.success) {
    throw new Error(res.message || 'خطا در دریافت اعلان‌ها');
  }
  const notifsList = Array.isArray(res.data) 
    ? res.data 
    : (res.data && Array.isArray(res.data.data) ? res.data.data : []);
  const unreadCount = typeof res.unread_count === 'number' 
    ? res.unread_count 
    : (res.data && typeof res.data.unread_count === 'number' ? res.data.unread_count : notifsList.filter(n => !n.is_read).length);

  return {
    notifications: notifsList,
    unread_count: unreadCount
  };
}

async function markNotificationRead(id) {
  const resp = await fetch(getApiUrl(`notifications?action=read&id=${encodeURIComponent(id)}`), {
    method: 'POST',
    headers: getAuthHeaders(true)
  });
  return await resp.json();
}

async function markAllNotificationsRead() {
  const resp = await fetch(getApiUrl('notifications?action=read_all'), {
    method: 'POST',
    headers: getAuthHeaders(true)
  });
  return await resp.json();
}

async function undoNotification(id) {
  const resp = await fetch(getApiUrl(`notifications?action=undo&id=${encodeURIComponent(id)}`), {
    method: 'POST',
    headers: getAuthHeaders(true)
  });
  const res = await resp.json();
  if (!res.success) {
    throw new Error(res.message || 'خطا در بازگردانی عملیات');
  }
  return res;
}

// ---------------------- متدهای مدیریت کاربران (Users API) ----------------------
async function getUsers(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.payment_status) query.set('payment_status', params.payment_status);
  if (params.anonymous) query.set('anonymous', params.anonymous);
  if (params.visibility) query.set('visibility', params.visibility);
  if (params.from_date) query.set('from_date', params.from_date);
  if (params.to_date) query.set('to_date', params.to_date);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  const resp = await fetch(getApiUrl(`users?${query.toString()}`), {
    headers: getAuthHeaders(false)
  });
  const res = await resp.json();
  if (!res.success) {
    throw new Error(res.message || 'خطا در دریافت لیست کاربران');
  }
  const userList = Array.isArray(res.data) 
    ? res.data 
    : (res.data && Array.isArray(res.data.data) ? res.data.data : []);
  const stats = res.stats || (res.data && res.data.stats) || {};

  return {
    success: true,
    data: userList,
    total: typeof res.total === 'number' ? res.total : (res.data?.total || userList.length),
    page: typeof res.page === 'number' ? res.page : (res.data?.page || 1),
    limit: typeof res.limit === 'number' ? res.limit : (res.data?.limit || 10),
    totalPages: typeof res.totalPages === 'number' ? res.totalPages : (res.data?.totalPages || 1),
    stats: stats
  };
}

async function getUserById(id) {
  const resp = await fetch(getApiUrl(`users?id=${encodeURIComponent(id)}`), {
    headers: getAuthHeaders(false)
  });
  const res = await resp.json();
  if (!res.success) {
    throw new Error(res.message || 'کاربر یافت نشد');
  }
  return res.data;
}

async function approveUser(id) {
  const resp = await fetch(getApiUrl(`users?action=approve&id=${encodeURIComponent(id)}`), {
    method: 'POST',
    headers: getAuthHeaders(true)
  });
  const res = await resp.json();
  if (!res.success) {
    throw new Error(res.message || 'خطا در تأیید کاربر');
  }
  return res;
}

async function rejectUser(id) {
  const resp = await fetch(getApiUrl(`users?action=reject&id=${encodeURIComponent(id)}`), {
    method: 'POST',
    headers: getAuthHeaders(true)
  });
  const res = await resp.json();
  if (!res.success) {
    throw new Error(res.message || 'خطا در رد کاربر');
  }
  return res;
}

async function toggleUserVisibility(id) {
  const resp = await fetch(getApiUrl(`users?action=toggle_visibility&id=${encodeURIComponent(id)}`), {
    method: 'POST',
    headers: getAuthHeaders(true)
  });
  const res = await resp.json();
  if (!res.success) {
    throw new Error(res.message || 'خطا در تغییر وضعیت نمایش کاربر');
  }
  return res;
}

async function deleteUser(id) {
  const resp = await fetch(getApiUrl(`users?action=delete&id=${encodeURIComponent(id)}`), {
    method: 'POST',
    headers: getAuthHeaders(true)
  });
  const res = await resp.json();
  if (!res.success) {
    throw new Error(res.message || 'خطا در حذف کاربر');
  }
  return res;
}

// ---------------------- متدهای لاگ سیستم (Audit Logs API) ----------------------
async function getLogs(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.action_type) query.set('action_type', params.action_type);
  if (params.actor) query.set('actor', params.actor);
  if (params.from_date) query.set('from_date', params.from_date);
  if (params.to_date) query.set('to_date', params.to_date);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  const resp = await fetch(getApiUrl(`logs?${query.toString()}`), {
    headers: getAuthHeaders(false)
  });
  const res = await resp.json();
  if (!res.success) {
    throw new Error(res.message || 'خطا در دریافت لاگ‌های سیستم');
  }
  const logsList = Array.isArray(res.data) 
    ? res.data 
    : (res.data && Array.isArray(res.data.data) ? res.data.data : []);

  return {
    success: true,
    data: logsList,
    total: typeof res.total === 'number' ? res.total : (res.data?.total || logsList.length),
    page: typeof res.page === 'number' ? res.page : (res.data?.page || 1),
    limit: typeof res.limit === 'number' ? res.limit : (res.data?.limit || 15),
    totalPages: typeof res.totalPages === 'number' ? res.totalPages : (res.data?.totalPages || 1)
  };
}

// ---------------------- متدهای قوانین و مقررات (Terms API) ----------------------
async function getTermsContent() {
  const resp = await fetch(getApiUrl('terms'));
  const res = await resp.json();
  if (!res.success) {
    throw new Error(res.message || 'خطا در دریافت قوانین و مقررات');
  }
  return res.content || (res.data && res.data.content) || '';
}

async function saveTermsContent(content) {
  const resp = await fetch(getApiUrl('terms'), {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ content })
  });
  const res = await resp.json();
  if (!res.success) {
    throw new Error(res.message || 'خطا در ذخیره قوانین و مقررات');
  }
  return res;
}

window.CampaignDB = {
  getCampaigns,
  getCampaignById,
  getActiveCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getPayments,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentByTrackingCode,
  findPaymentsByTrackingOrPhone,
  getPaymentSettings,
  savePaymentSettings,
  initiateGatewayPayment,
  verifyGatewayPayment,
  uploadCampaignImage,
  calculateCampaignStats,
  testDatabaseConnection,
  getMySQLScript,
  generateTrackingCode,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  undoNotification,
  getUsers,
  getUserById,
  approveUser,
  rejectUser,
  toggleUserVisibility,
  deleteUser,
  getLogs,
  getTermsContent,
  saveTermsContent,
  formatCurrency,
  formatNumber,
  toPersianDigits,
  toEnglishDigits
};
