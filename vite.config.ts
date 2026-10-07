import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';
import * as xlsx from 'xlsx';

const defaultTermsContent = `<h4>مقدمه و اهداف پویش</h4>
<p>این سامانه جهت تسهیل در جمع‌آوری نذورات و مشارکت‌های مردمی به صورت شفاف، سهم‌بندی شده و دقیق راه‌اندازی شده است. تمامی مبالغ واریزی منحصراً صرف اهداف اعلام‌شده در عنوان و توضیحات پویش می‌گردد.</p>
<h4>نکات مهم واریز وجه</h4>
<ul>
  <li>واریز وجه صرفاً از طریق شبکه رسمی شاپرک و درگاه‌های مجاز بانکی انجام می‌پذیرد.</li>
  <li>پس از تکمیل پرداخت، کد رهگیری یکتا نمایش داده شده و سهم شما در سامانه ثبت می‌شود.</li>
  <li>در صورت تمایل می‌توانید گزینه «میخواهم گمنام باشم» را فعال نمایید؛ در این حالت نام واقعی شما در امور مالی و سیستمی ثبت شده اما در سایت عمومی عنوان «گمنام» درج می‌گردد.</li>
  <li>در صورت بروز هرگونه قطعی شبکه، وجه کسر شده ظرف ۷۲ ساعت توسط شاپرک عودت داده می‌شود.</li>
</ul>
<div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 14px 16px; margin-top: 18px; margin-bottom: 18px; font-size: 0.85rem; color: #64748b;">
  <div style="font-weight: 700; color: #334155; margin-bottom: 4px;">پشتیبانی و ارتباط با مسئول پویش</div>
  <div>شماره تماس ثبت‌شده در پویش آماده پاسخگویی به سوالات مشارکت‌کنندگان محترم است.</div>
</div>`;

// دیتابیس شبیه‌سازی شده درون حافظه برای محیط توسعه هوش مصنوعی (AI Studio)
const mockDb: {
  campaigns: any[];
  payments: any[];
  users: any[];
  notifications: any[];
  audit_logs: any[];
  settings: any;
  admins: any[];
} = {
  campaigns: [
    {
      id: 'camp-ghadir-1403',
      title: 'پویش بزرگ اطعام عید سعید غدیر خم',
      description: 'همزمان با فرارسیدن عید بزرگ امامت و ولایت، عید سعید غدیر خم، با مشارکت در این پویش معنوی سهمی در طبخ و توزیع اطعام میان نیازمندان و برپایی ایستگاه‌های صلواتی داشته باشیم. پیامبر اکرم (ص) فرمودند: هرکس مؤمنی را در روز غدیر اطعام کند، مانند کسی است که تمام پیامبران و صدیقان را اطعام کرده است.',
      image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
      total_shares: 2000,
      share_price: 50000,
      start_date: '۱۴۰۳/۰۳/۲۰',
      end_date: '۱۴۰۳/۰۴/۰۵',
      status: 'active',
      event_location: 'تهران، میدان امام حسین (ع) و پایگاه‌های توزیع منتخب',
      event_date: 'عید سعید غدیر خم',
      event_time: 'از ساعت ۱۰:۰۰ صبح الی اذان مغرب',
      channel_link: 'https://eitaa.com',
      social_link: 'https://ble.ir',
      contact_phone: '۰۹۱۰۱۲۳۴۵۶۷',
      additional_notes: 'طبخ با رعایت کامل اصول بهداشتی و توزیع غذای گرم به همراه نان گرم در مناطق محروم و سفره‌های عمومی غدیر',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'camp-fatemiye-1403',
      title: 'پویش نذر فاطمیه و توزیع ارزاق نیازمندان',
      description: 'به مناسبت ایام سوگواری شهادت صدیقه کبری حضرت فاطمه زهرا (س)، پویش نذر بسته‌های معیشتی و اطعام عزاداران اهل بیت (ع) در سراسر کشور.',
      image_url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80',
      total_shares: 1000,
      share_price: 100000,
      start_date: '۱۴۰۳/۰۸/۰۱',
      end_date: '۱۴۰۳/۰۹/۱۵',
      status: 'active',
      event_location: 'مشهد مقدس و حاشیه شهر',
      event_date: 'ایام فاطمیه دوم',
      event_time: 'همزمان با نماز مغرب و عشاء',
      channel_link: 'https://eitaa.com',
      social_link: 'https://ble.ir',
      contact_phone: '۰۹۱۹۸۷۶۵۴۳۲',
      additional_notes: 'شامل برنج، روغن، حبوبات و گوشت نذری برای خانوارهای کم‌بضاعت',
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  users: [
    {
      id: 'usr-1',
      name: 'محمد صادقی',
      phone: '09121112233',
      created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      payment_status: 'successful',
      is_anonymous: false,
      total_amount: 200000,
      payments_count: 1,
      last_activity: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 'usr-2',
      name: 'امید احمدی',
      phone: '09198765432',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      payment_status: 'successful',
      is_anonymous: true,
      total_amount: 500000,
      payments_count: 1,
      last_activity: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'usr-3',
      name: 'فاطمه حسینی',
      phone: '09351234567',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      payment_status: 'successful',
      is_anonymous: false,
      total_amount: 100000,
      payments_count: 1,
      last_activity: new Date(Date.now() - 3600000 * 5).toISOString()
    }
  ],
  payments: [
    {
      id: 'pay-seed-1',
      campaign_id: 'camp-ghadir-1403',
      user_id: 'usr-1',
      payer_name: 'محمد صادقی',
      phone: '09121112233',
      shares: 4,
      amount: 200000,
      tracking_code: 'POY-782194',
      description: 'به نیت فرج آقا امام زمان (عج)',
      is_anonymous: false,
      is_approved: true,
      status: 'successful',
      gateway: 'test_gateway',
      transaction_id: 'TXN-98432104',
      authority_token: 'AUTH_1730000001',
      verified_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      paid_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'pay-seed-2',
      campaign_id: 'camp-ghadir-1403',
      user_id: 'usr-2',
      payer_name: 'امید احمدی',
      phone: '09198765432',
      shares: 10,
      amount: 500000,
      tracking_code: 'POY-561234',
      description: 'شادی روح والدین',
      is_anonymous: true,
      is_approved: true,
      status: 'successful',
      gateway: 'test_gateway',
      transaction_id: 'TXN-45123987',
      authority_token: 'AUTH_1730000002',
      verified_at: new Date(Date.now() - 86400000).toISOString(),
      paid_at: new Date(Date.now() - 86400000).toISOString(),
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'pay-seed-3',
      campaign_id: 'camp-ghadir-1403',
      user_id: 'usr-3',
      payer_name: 'فاطمه حسینی',
      phone: '09351234567',
      shares: 2,
      amount: 100000,
      tracking_code: 'POY-334190',
      description: 'سلامتی بیماران',
      is_anonymous: false,
      is_approved: true,
      status: 'successful',
      gateway: 'test_gateway',
      transaction_id: 'TXN-87612390',
      authority_token: 'AUTH_1730000003',
      verified_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      paid_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  notifications: [
    {
      id: 'notif-1',
      title: 'مشارکت جدید در پویش',
      description: 'امید احمدی با ۱۰ سهم (۵۰۰,۰۰۰ تومان) به صورت گمنام در پویش اطعام غدیر مشارکت نمود.',
      type: 'payment',
      category: 'site',
      is_read: false,
      reversible: false,
      undone: false,
      undo_data: null,
      created_at: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: 'notif-2',
      title: 'مشارکت‌کننده جدید',
      description: 'فاطمه حسینی با پرداخت ۱۰۰,۰۰۰ تومان در پویش مشارکت نمود و در لیست کاربران ثبت شد.',
      type: 'user',
      category: 'users',
      is_read: false,
      reversible: false,
      undone: false,
      undo_data: null,
      created_at: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 'notif-3',
      title: 'تغییر وضعیت پویش نذر فاطمیه',
      description: 'وضعیت پویش از «به زودی» به «فعال» تغییر داده شد.',
      type: 'campaign_status',
      category: 'admin',
      is_read: true,
      reversible: true,
      undone: false,
      undo_data: {
        type: 'campaign_status',
        campaign_id: 'camp-fatemiye-1403',
        prev_status: 'pending',
        new_status: 'active'
      },
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'notif-4',
      title: 'بروزرسانی قوانین و مقررات',
      description: 'متن قوانین و مقررات پویش توسط مدیریت ذخیره و منتشر شد.',
      type: 'terms_update',
      category: 'admin',
      is_read: false,
      reversible: false,
      undone: false,
      undo_data: null,
      created_at: new Date(Date.now() - 3600000 * 8).toISOString()
    },
    {
      id: 'notif-5',
      title: 'عضویت مشارکت‌کننده جدید',
      description: 'محمد صادقی با ثبت ۴ سهم به جمع همراهان پویش پیوست.',
      type: 'user',
      category: 'users',
      is_read: true,
      reversible: false,
      undone: false,
      undo_data: null,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 'notif-6',
      title: 'واریز آنلاین از درگاه شاپرک',
      description: 'تراکنش TXN-98432104 در درگاه آنلاین با موفقیت تایید شد.',
      type: 'payment',
      category: 'site',
      is_read: true,
      reversible: false,
      undone: false,
      undo_data: null,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString()
    }
  ],
  audit_logs: [
    {
      id: 'log-1',
      action_type: 'تغییر وضعیت پویش',
      actor: 'admin@example.com',
      target: 'پویش نذر فاطمیه',
      description: 'تغییر وضعیت پویش از به زودی به فعال',
      status: 'موفق',
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'log-2',
      action_type: 'تأیید کاربر',
      actor: 'admin@example.com',
      target: 'محمد صادقی',
      description: 'تأیید نمایش مشارکت در سایت عمومی',
      status: 'موفق',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 'log-3',
      action_type: 'پرداخت موفق',
      actor: 'درگاه شاپرک',
      target: 'POY-782194',
      description: 'ثبت واریز موفق به مبلغ ۲۰۰,۰۰۰ تومان',
      status: 'موفق',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString()
    }
  ],
  settings: {
    id: 'default',
    active_gateway: 'test_gateway',
    is_active: true,
    sandbox: true,
    merchant_id: '',
    api_key: '',
    terminal_id: '',
    terms_content: defaultTermsContent
  },
  admins: [
    {
      id: 1,
      email: 'Matinshariati1404@gmail.com',
      password: '12345678'
    }
  ]
};

function recordAuditLog(action_type: string, actor: string, target: string, description: string, status = 'موفق') {
  mockDb.audit_logs.unshift({
    id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    action_type,
    actor,
    target,
    description,
    status,
    created_at: new Date().toISOString()
  });
}

function createNotification(title: string, description: string, type = 'info', reversible = false, undo_data: any = null, category = '') {
  let cat = category;
  if (!cat) {
    if (type === 'user' || type.startsWith('user')) cat = 'users';
    else if (type === 'terms_update' || type === 'campaign_status' || type === 'settings' || type === 'system' || type === 'admin') cat = 'admin';
    else if (type === 'payment' || type === 'campaign') cat = 'site';
    else cat = 'site';
  }

  mockDb.notifications.unshift({
    id: 'notif-' + Date.now(),
    title,
    description,
    type,
    category: cat,
    is_read: false,
    reversible,
    undone: false,
    undo_data,
    created_at: new Date().toISOString()
  });
}

function registerOrUpdateUser(payer_name: string, phone: string, amount: number, is_anonymous = false) {
  const cleanPhone = (phone || '').trim();
  const cleanName = (payer_name || '').trim();
  let user = mockDb.users.find(u => u.phone === cleanPhone);

  if (user) {
    user.payments_count = (user.payments_count || 1) + 1;
    user.total_amount = (Number(user.total_amount) || 0) + Number(amount);
    user.last_activity = new Date().toISOString();
    user.payment_status = 'successful';
    if (is_anonymous) user.is_anonymous = true;
    return user;
  }

  const newUser = {
    id: 'usr-' + Date.now(),
    name: cleanName,
    phone: cleanPhone,
    created_at: new Date().toISOString(),
    payment_status: 'successful',
    is_anonymous: !!is_anonymous,
    total_amount: Number(amount),
    payments_count: 1,
    last_activity: new Date().toISOString()
  };
  mockDb.users.unshift(newUser);

  createNotification(
    'مشارکت‌کننده جدید',
    `${cleanName} با پرداخت موفق ${amount.toLocaleString('fa-IR')} تومان به لیست کاربران و مشارکت‌کنندگان اضافه شد.`,
    'user'
  );
  recordAuditLog('ثبت کاربر جدید', 'سیستم', cleanName, `عضویت پس از پرداخت موفق (${amount.toLocaleString('fa-IR')} تومان)`);

  return newUser;
}

function calculateStats(campaign: any, payments: any[]) {
  const total_shares = Number(campaign.total_shares) || 0;
  const share_price = Number(campaign.share_price) || 0;
  const target_amount = total_shares * share_price;

  const successful = payments.filter((p: any) => String(p.campaign_id) === String(campaign.id) && (p.status === 'successful' || p.status === 'success'));
  const paid_shares = successful.reduce((sum: number, p: any) => sum + (Number(p.shares) || 0), 0);
  const collected_amount = successful.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
  const remaining_shares = Math.max(0, total_shares - paid_shares);
  const remaining_amount = Math.max(0, target_amount - collected_amount);
  let progress = total_shares > 0 ? (paid_shares / total_shares) * 100 : 0;
  progress = Math.min(100, Math.round(progress * 10) / 10);

  const participantIds = new Set(successful.map((p: any) => (p.phone || p.payer_name || p.id).trim()));

  return {
    ...campaign,
    target_amount,
    paid_shares,
    remaining_shares,
    collected_amount,
    remaining_amount,
    progress,
    total_payments_count: successful.length,
    participants_count: participantIds.size
  };
}

function setupServerMiddlewares(server: any) {
  const parseJsonBody = (req: any) => {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', (chunk: any) => { body += chunk; });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
    });
  };

  server.middlewares.use(async (req: any, res: any, next: any) => {
    if (!req.url) return next();

    const urlObj = new URL(req.url, 'http://localhost');
    const urlPath = urlObj.pathname;

    // بازنویسی مسیرهای صفحات
    if (urlPath === '/admin' || urlPath === '/admin/') {
      req.url = '/admin/index.html';
      return next();
    } else if (urlPath.startsWith('/campaign') && !urlPath.includes('.')) {
      req.url = '/campaign/index.html';
      return next();
    }

    // سرو تصاویر آپلود شده
    if (urlPath.startsWith('/uploads/')) {
      const filePath = path.resolve(import.meta.dirname, '.' + urlPath);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.webp': 'image/webp',
          '.gif': 'image/gif'
        };
        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    // پیاده‌سازی کامل اندپوینت‌های API
    if (urlPath.startsWith('/api/')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');

      // 0. تست سلامت سرویس و دیتابیس (Health Check)
      if (urlPath === '/api/health' || urlPath === '/api/health.php') {
        res.end(JSON.stringify({
          success: true,
          message: 'API و دیتابیس سالم هستند.',
          data: {
            database: 'ok',
            status: 'healthy',
            app: 'sahmnazr_campaign'
          }
        }));
        return;
      }

      // 1. احراز هویت
      if (urlPath === '/api/auth' || urlPath === '/api/auth.php') {
        const action = urlObj.searchParams.get('action') || '';
        
        if (req.method === 'GET' && action === 'check') {
          const authHeader = (req.headers['authorization'] as string) || '';
          const xToken = (req.headers['x-auth-token'] as string) || (req.headers['x-admin-token'] as string) || '';
          const cookieHeader = (req.headers['cookie'] as string) || '';
          let cookieToken = '';
          if (cookieHeader) {
            const m = cookieHeader.match(/(?:ADMIN_AUTH_TOKEN|admin_token)=([^;]+)/);
            if (m) cookieToken = decodeURIComponent(m[1].trim());
          }
          const queryToken = urlObj.searchParams.get('token') || urlObj.searchParams.get('auth_token') || '';

          let rawToken = '';
          if (authHeader.startsWith('Bearer ')) {
            rawToken = authHeader.replace('Bearer ', '').trim();
          } else if (xToken) {
            rawToken = xToken.trim();
          } else if (cookieToken) {
            rawToken = cookieToken.trim();
          } else if (queryToken) {
            rawToken = queryToken.trim();
          }

          if (rawToken && rawToken !== 'null' && rawToken !== 'undefined') {
            let email = 'Matinshariati1404@gmail.com';
            if (rawToken.startsWith('mock_token_')) {
              email = decodeURIComponent(rawToken.replace('mock_token_', ''));
            }
            const userData = { id: 1, email };
            res.end(JSON.stringify({
              success: true,
              authenticated: true,
              token: rawToken,
              user: userData,
              data: {
                authenticated: true,
                token: rawToken,
                user: userData
              }
            }));
            return;
          }
          res.end(JSON.stringify({
            success: true,
            authenticated: false,
            user: null,
            data: {
              authenticated: false,
              user: null
            }
          }));
          return;
        }

        if (req.method === 'POST') {
          const body: any = await parseJsonBody(req);
          if (action === 'logout') {
            res.end(JSON.stringify({ success: true, message: 'خروج با موفقیت انجام شد.', data: null }));
            return;
          }

          const { email, password } = body;
          const found = mockDb.admins.find(a => a.email.toLowerCase() === (email || '').toLowerCase().trim());
          if (found && (password === found.password || password === '12345678')) {
            const token = 'mock_token_' + encodeURIComponent(found.email);
            recordAuditLog('ورود مدیر', found.email, 'سیستم', 'ورود موفق به پنل مدیریت');
            const userData = { id: found.id, email: found.email };
            res.end(JSON.stringify({
              success: true,
              authenticated: true,
              token,
              user: userData,
              data: {
                token,
                user: userData
              },
              message: 'ورود موفقیت‌آمیز بود.'
            }));
            return;
          }

          res.statusCode = 401;
          res.end(JSON.stringify({ success: false, message: 'ایمیل یا رمز عبور اشتباه است.' }));
          return;
        }
      }

      // 2. مدیریت پویش‌ها (Campaigns)
      if (urlPath === '/api/campaigns' || urlPath === '/api/campaigns.php') {
        const id = urlObj.searchParams.get('id');
        const action = urlObj.searchParams.get('action');

        if (req.method === 'GET') {
          if (action === 'active') {
            const preferredId = urlObj.searchParams.get('preferred_id');
            let campaign = preferredId ? mockDb.campaigns.find(c => c.id === preferredId) : null;
            if (!campaign) {
              campaign = mockDb.campaigns.find(c => c.status === 'active') || mockDb.campaigns[0] || null;
            }
            if (campaign) {
              const fullStats = calculateStats(campaign, mockDb.payments);
              res.end(JSON.stringify({ success: true, data: fullStats }));
            } else {
              res.end(JSON.stringify({ success: true, data: null }));
            }
            return;
          }

          if (id) {
            const campaign = mockDb.campaigns.find(c => c.id === id);
            if (campaign) {
              const fullStats = calculateStats(campaign, mockDb.payments);
              res.end(JSON.stringify({ success: true, data: fullStats }));
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ success: false, message: 'پویش یافت نشد.' }));
            }
            return;
          }

          const listWithStats = mockDb.campaigns.map(c => calculateStats(c, mockDb.payments));
          res.end(JSON.stringify({ success: true, data: listWithStats }));
          return;
        }

        if (req.method === 'POST') {
          const body: any = await parseJsonBody(req);
          if (action === 'delete') {
            const delId = id || body.id;
            const targetCamp = mockDb.campaigns.find(c => c.id === delId);
            mockDb.campaigns = mockDb.campaigns.filter(c => c.id !== delId);
            recordAuditLog('حذف پویش', 'مدیر سیستم', targetCamp ? targetCamp.title : delId, 'حذف پویش از سیستم');
            res.end(JSON.stringify({ success: true, message: 'پویش حذف شد.' }));
            return;
          }

          if (action === 'update') {
            const upId = id || body.id;
            const idx = mockDb.campaigns.findIndex(c => c.id === upId);
            if (idx >= 0) {
              const oldStatus = mockDb.campaigns[idx].status;
              const newStatus = body.status;

              mockDb.campaigns[idx] = {
                ...mockDb.campaigns[idx],
                ...body,
                updated_at: new Date().toISOString()
              };

              // اگر وضعیت تغییر کرده باشد، اعلان با قابلیت لغو ایجاد می‌کنیم
              if (newStatus && newStatus !== oldStatus) {
                createNotification(
                  `تغییر وضعیت پویش ${mockDb.campaigns[idx].title}`,
                  `وضعیت پویش از «${oldStatus}» به «${newStatus}» تغییر یافت.`,
                  'campaign_status',
                  true,
                  {
                    type: 'campaign_status',
                    campaign_id: upId,
                    prev_status: oldStatus,
                    new_status: newStatus
                  }
                );
                recordAuditLog('تغییر وضعیت پویش', 'مدیر سیستم', mockDb.campaigns[idx].title, `تغییر از ${oldStatus} به ${newStatus}`);
              } else {
                recordAuditLog('ویرایش پویش', 'مدیر سیستم', mockDb.campaigns[idx].title, 'ویرایش اطلاعات پویش');
              }

              res.end(JSON.stringify({ success: true, data: mockDb.campaigns[idx], message: 'پویش با موفقیت ویرایش شد.' }));
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ success: false, message: 'پویش یافت نشد.' }));
            }
            return;
          }

          // ایجاد پویش جدید
          const newCamp = {
            id: 'camp-' + Date.now(),
            title: body.title || 'پویش جدید نذورات',
            description: body.description || '',
            image_url: body.image_url || '',
            total_shares: Number(body.total_shares) || 100,
            share_price: Number(body.share_price) || 50000,
            start_date: body.start_date || '',
            end_date: body.end_date || '',
            status: body.status || 'active',
            event_location: body.event_location || '',
            event_date: body.event_date || '',
            event_time: body.event_time || '',
            channel_link: body.channel_link || '',
            social_link: body.social_link || '',
            contact_phone: body.contact_phone || '',
            additional_notes: body.additional_notes || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          mockDb.campaigns.unshift(newCamp);
          createNotification('ایجاد پویش جدید', `پویش «${newCamp.title}» ایجاد و منتشر شد.`, 'campaign');
          recordAuditLog('ایجاد پویش', 'مدیر سیستم', newCamp.title, 'ثبت و انتشار پویش جدید');
          res.end(JSON.stringify({ success: true, data: newCamp, message: 'پویش با موفقیت ثبت شد.' }));
          return;
        }
      }

      // 3. مدیریت پرداخت‌ها (Payments)
      if (urlPath === '/api/payments' || urlPath === '/api/payments.php') {
        const action = urlObj.searchParams.get('action');
        const id = urlObj.searchParams.get('id');

        if (req.method === 'GET') {
          if (action === 'track') {
            const query = (urlObj.searchParams.get('query') || '').trim();
            const results = mockDb.payments.filter((p: any) =>
              p.tracking_code.toLowerCase().includes(query.toLowerCase()) ||
              (p.phone && p.phone.includes(query))
            );
            res.end(JSON.stringify({ success: true, data: results }));
            return;
          }

          const campaignId = urlObj.searchParams.get('campaign_id');
          const authHeader = req.headers['authorization'] || '';
          const isAdmin = Boolean(authHeader && authHeader.startsWith('Bearer ') && authHeader.length > 10 && !authHeader.includes('undefined') && !authHeader.includes('null'));

          // اگر درخواست از سمت عموم (سایت اصلی) باشد:
          // پس از پرداخت و احراز عملیات پرداخت، مشارکت‌کننده مستقیماً در لیست آخرین مشارکت‌کنندگان نمایش می‌یابد
          if (!isAdmin) {
            let filtered = mockDb.payments.filter((p: any) => {
              return (p.status === 'successful' || p.status === 'success');
            });

            if (campaignId) {
              filtered = filtered.filter((p: any) => String(p.campaign_id) === String(campaignId));
            }
            // نام گمنام را ماسک کرده و تمام مشارکت‌کنندگان موفق را برای نمایش در سایت ارسال می‌کنیم
            const safeList = filtered.map((p: any) => {
              const user = mockDb.users.find((u: any) => (p.user_id && u.id === p.user_id) || (p.phone && u.phone === p.phone));
              const isAnon = p.is_anonymous || (user && user.is_anonymous) || p.payer_name === 'گمنام';
              const displayName = isAnon ? 'گمنام' : (p.payer_name || 'مشارکت‌کننده');
              return {
                id: p.id,
                payer_name: displayName,
                shares: p.shares,
                amount: p.amount,
                status: p.status || 'successful',
                is_approved: true,
                is_anonymous: isAnon,
                created_at: p.created_at || p.verified_at || p.paid_at || new Date().toISOString()
              };
            });
            res.end(JSON.stringify({ success: true, data: safeList }));
            return;
          }

          // برای پنل ادمین
          let list = mockDb.payments;
          if (campaignId) {
            list = list.filter((p: any) => String(p.campaign_id) === String(campaignId));
          }
          res.end(JSON.stringify({ success: true, data: list }));
          return;
        }

        if (req.method === 'POST') {
          const body: any = await parseJsonBody(req);
          if (action === 'delete') {
            const delId = id || body.id;
            mockDb.payments = mockDb.payments.filter(p => p.id !== delId);
            recordAuditLog('حذف تراکنش', 'مدیر سیستم', delId, 'حذف رکورد پرداخت');
            res.end(JSON.stringify({ success: true, message: 'پرداخت با موفقیت حذف شد.' }));
            return;
          }

          if (action === 'update') {
            const upId = id || body.id;
            const idx = mockDb.payments.findIndex(p => p.id === upId);
            if (idx >= 0) {
              const prevStatus = mockDb.payments[idx].status;
              const newStatus = body.status;

              mockDb.payments[idx] = {
                ...mockDb.payments[idx],
                ...body,
                updated_at: new Date().toISOString()
              };

              // اگر تایید شد، کاربر را ایجاد یا آپدیت می‌کنیم
              if ((newStatus === 'successful' || newStatus === 'success') && prevStatus !== 'successful') {
                registerOrUpdateUser(
                  mockDb.payments[idx].payer_name,
                  mockDb.payments[idx].phone,
                  mockDb.payments[idx].amount,
                  mockDb.payments[idx].is_anonymous
                );
              }

              recordAuditLog('ویرایش تراکنش', 'مدیر سیستم', mockDb.payments[idx].tracking_code, `تغییر وضعیت به ${newStatus}`);
              res.end(JSON.stringify({ success: true, data: mockDb.payments[idx], message: 'پرداخت بروزرسانی شد.' }));
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ success: false, message: 'پرداخت یافت نشد.' }));
            }
            return;
          }

          // ثبت دستی پرداخت
          const payerName = (body.payer_name || '').trim();
          if (!payerName) {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, message: 'لطفاً نام و نام خانوادگی خود را وارد کنید.' }));
            return;
          }

          const newPay = {
            id: 'pay-' + Date.now(),
            campaign_id: body.campaign_id,
            payer_name: payerName,
            phone: body.phone || '',
            shares: Number(body.shares) || 1,
            amount: Number(body.amount) || 0,
            tracking_code: body.tracking_code || ('POY-' + Math.floor(100000 + Math.random() * 900000)),
            description: body.description || '',
            is_anonymous: !!body.is_anonymous,
            is_approved: true,
            status: body.status || 'pending',
            gateway: body.gateway || 'test_gateway',
            transaction_id: body.transaction_id || '',
            authority_token: body.authority_token || ('AUTH_' + Date.now()),
            verified_at: body.status === 'successful' ? new Date().toISOString() : null,
            paid_at: body.status === 'successful' ? new Date().toISOString() : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          mockDb.payments.unshift(newPay);

          if (newPay.status === 'successful') {
            registerOrUpdateUser(newPay.payer_name, newPay.phone, newPay.amount, newPay.is_anonymous);
          }

          recordAuditLog('ثبت پرداخت دستی', 'مدیر سیستم', newPay.tracking_code, `ثبت مبلغ ${newPay.amount.toLocaleString('fa-IR')} تومان`);
          res.end(JSON.stringify({ success: true, data: newPay }));
          return;
        }
      }

      // 4. مدیریت کاربران (Users API)
      if (urlPath === '/api/users' || urlPath === '/api/users.php') {
        const action = urlObj.searchParams.get('action');
        const id = urlObj.searchParams.get('id');

        if (req.method === 'GET') {
          if (id) {
            const user = mockDb.users.find(u => u.id === id);
            if (!user) {
              res.statusCode = 404;
              res.end(JSON.stringify({ success: false, message: 'کاربر یافت نشد.' }));
              return;
            }
            const userPayments = mockDb.payments.filter(p => p.phone === user.phone);
            res.end(JSON.stringify({
              success: true,
              data: {
                ...user,
                payments: userPayments
              }
            }));
            return;
          }

          // فیلتر و جستجوی کاربران
          const search = (urlObj.searchParams.get('search') || '').trim().toLowerCase();
          const status = urlObj.searchParams.get('status') || 'all';
          const paymentStatus = urlObj.searchParams.get('payment_status') || 'all';
          const anonymous = urlObj.searchParams.get('anonymous') || 'all';
          const visibility = urlObj.searchParams.get('visibility') || 'all';
          const fromDate = urlObj.searchParams.get('from_date');
          const toDate = urlObj.searchParams.get('to_date');
          const page = Math.max(1, parseInt(urlObj.searchParams.get('page') || '1', 10));
          const limit = Math.max(1, parseInt(urlObj.searchParams.get('limit') || '10', 10));

          let filtered = mockDb.users.filter(u => {
            // فقط کاربرانی که پرداخت موفق داشته‌اند
            if (paymentStatus === 'all') {
              if (u.payment_status && u.payment_status !== 'successful') return false;
            } else if (u.payment_status !== paymentStatus) {
              return false;
            }

            if (search) {
              const matchName = (u.name || '').toLowerCase().includes(search);
              const matchPhone = (u.phone || '').includes(search);
              if (!matchName && !matchPhone) return false;
            }
            if (anonymous !== 'all') {
              const isAnon = anonymous === 'true' || anonymous === 'anonymous';
              if (u.is_anonymous !== isAnon) return false;
            }
            if (fromDate && new Date(u.created_at) < new Date(fromDate)) {
              return false;
            }
            if (toDate && new Date(u.created_at) > new Date(toDate)) {
              return false;
            }
            return true;
          });

          // خروجی اکسل با دقیقاً ۳ ستون درخواستی
          if (action === 'export') {
            const rows = filtered.map(u => ({
              'نام و نام خانوادگی': u.name || 'بی‌نام',
              'تاریخ عضویت': u.created_at ? new Date(u.created_at).toLocaleDateString('fa-IR') : '-',
              'شماره تلفن همراه': u.phone || '-'
            }));
            const ws = xlsx.utils.json_to_sheet(rows);
            const wb = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, 'کاربران');
            const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="users.xlsx"');
            res.end(buf);
            return;
          }

          const total = filtered.length;
          const totalPages = Math.ceil(total / limit) || 1;
          const startIndex = (page - 1) * limit;
          const paginated = filtered.slice(startIndex, startIndex + limit);

          const totalPaidAmount = mockDb.users.reduce((sum, u) => sum + (Number(u.total_amount) || 0), 0);

          const stats = {
            total_users: mockDb.users.length,
            anonymous_users: mockDb.users.filter(u => u.is_anonymous === true).length,
            public_name_users: mockDb.users.filter(u => !u.is_anonymous).length,
            active_participants: mockDb.users.filter(u => u.payments_count > 0).length,
            total_paid_amount: totalPaidAmount
          };

          res.end(JSON.stringify({
            success: true,
            data: paginated,
            total,
            page,
            limit,
            totalPages,
            stats
          }));
          return;
        }

        if (req.method === 'POST') {
          const body: any = await parseJsonBody(req);
          const targetId = id || body.id;
          const userIndex = mockDb.users.findIndex(u => u.id === targetId);
          if (userIndex < 0) {
            res.statusCode = 404;
            res.end(JSON.stringify({ success: false, message: 'کاربر یافت نشد.' }));
            return;
          }

          const user = mockDb.users[userIndex];

          if (action === 'delete') {
            const userName = user.name;
            mockDb.users = mockDb.users.filter(u => u.id !== targetId);
            recordAuditLog('حذف کاربر', 'مدیر سیستم', userName, 'حذف رکورد کاربر از سیستم');
            res.end(JSON.stringify({ success: true, message: 'کاربر با موفقیت حذف شد.' }));
            return;
          }
        }
      }

      // 5. اعلان‌های مدیریت (Notifications API) با قابلیت لغو (Undo)
      if (urlPath === '/api/notifications' || urlPath === '/api/notifications.php') {
        const action = urlObj.searchParams.get('action');
        const id = urlObj.searchParams.get('id');

        if (req.method === 'GET') {
          res.end(JSON.stringify({
            success: true,
            data: mockDb.notifications,
            unread_count: mockDb.notifications.filter(n => !n.is_read).length
          }));
          return;
        }

        if (req.method === 'POST') {
          if (action === 'read_all') {
            mockDb.notifications.forEach(n => n.is_read = true);
            res.end(JSON.stringify({ success: true, message: 'همه اعلان‌ها خوانده شدند.' }));
            return;
          }

          if (action === 'read' && id) {
            const notif = mockDb.notifications.find(n => n.id === id);
            if (notif) notif.is_read = true;
            res.end(JSON.stringify({ success: true }));
            return;
          }

          // لغو تغییرات (Undo Reversible Operation)
          if (action === 'undo' && id) {
            const notif = mockDb.notifications.find(n => n.id === id);
            if (!notif) {
              res.statusCode = 404;
              res.end(JSON.stringify({ success: false, message: 'اعلان یافت نشد.' }));
              return;
            }

            if (!notif.reversible || !notif.undo_data) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, message: 'این عملیات قابل بازگردانی نیست.' }));
              return;
            }

            if (notif.undone) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, message: 'این عملیات قبلاً لغو شده است.' }));
              return;
            }

            const undoData = notif.undo_data;

            // 1. بازگردانی وضعیت پویش
            if (undoData.type === 'campaign_status') {
              const camp = mockDb.campaigns.find(c => c.id === undoData.campaign_id);
              if (camp) {
                camp.status = undoData.prev_status;
                camp.updated_at = new Date().toISOString();
              }
            }
            // 2. بازگردانی تایید/رد کاربر
            else if (undoData.type === 'user_approval') {
              const usr = mockDb.users.find(u => u.id === undoData.user_id);
              if (usr) {
                usr.status = undoData.prev_status;
                usr.is_public_visible = (undoData.prev_status === 'approved');
                mockDb.payments.forEach(p => {
                  if (p.phone === usr.phone) p.is_approved = usr.is_public_visible;
                });
              }
            }
            // 3. بازگردانی نمایش عمومی کاربر
            else if (undoData.type === 'user_visibility') {
              const usr = mockDb.users.find(u => u.id === undoData.user_id);
              if (usr) {
                usr.is_public_visible = undoData.prev_visibility;
                mockDb.payments.forEach(p => {
                  if (p.phone === usr.phone) p.is_approved = usr.is_public_visible;
                });
              }
            }
            // 4. بازگردانی متن قوانین و مقررات
            else if (undoData.type === 'terms_update') {
              mockDb.settings.terms_content = undoData.prev_content;
            }

            notif.undone = true;
            notif.title += ' (لغو شد)';
            recordAuditLog('لغو تغییرات (Undo)', 'مدیر سیستم', notif.title, 'بازگردانی موفق عملیات به وضعیت قبلی');

            res.end(JSON.stringify({
              success: true,
              message: 'عملیات با موفقیت به حالت قبلی بازگردانده شد.',
              notification: notif
            }));
            return;
          }
        }
      }

      // 6. لاگ‌های سیستم (Audit Logs API)
      if (urlPath === '/api/logs' || urlPath === '/api/logs.php') {
        const search = (urlObj.searchParams.get('search') || '').trim().toLowerCase();
        const actionType = urlObj.searchParams.get('action_type') || 'all';
        const actor = urlObj.searchParams.get('actor') || 'all';
        const fromDate = urlObj.searchParams.get('from_date');
        const toDate = urlObj.searchParams.get('to_date');
        const page = Math.max(1, parseInt(urlObj.searchParams.get('page') || '1', 10));
        const limit = Math.max(1, parseInt(urlObj.searchParams.get('limit') || '15', 10));

        let filtered = mockDb.audit_logs.filter(l => {
          if (search) {
            const matchDesc = (l.description || '').toLowerCase().includes(search);
            const matchActor = (l.actor || '').toLowerCase().includes(search);
            const matchTarget = (l.target || '').toLowerCase().includes(search);
            if (!matchDesc && !matchActor && !matchTarget) return false;
          }
          if (actionType !== 'all' && l.action_type !== actionType) {
            return false;
          }
          if (actor !== 'all' && l.actor !== actor) {
            return false;
          }
          if (fromDate && new Date(l.created_at) < new Date(fromDate)) {
            return false;
          }
          if (toDate && new Date(l.created_at) > new Date(toDate)) {
            return false;
          }
          return true;
        });

        const total = filtered.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const startIndex = (page - 1) * limit;
        const paginated = filtered.slice(startIndex, startIndex + limit);

        res.end(JSON.stringify({
          success: true,
          data: paginated,
          total,
          page,
          limit,
          totalPages
        }));
        return;
      }

      // 7. مدیریت متن قوانین و مقررات (Terms and Conditions API)
      if (urlPath === '/api/terms' || urlPath === '/api/terms.php') {
        if (req.method === 'GET') {
          res.end(JSON.stringify({
            success: true,
            content: mockDb.settings.terms_content || defaultTermsContent,
            updated_at: mockDb.settings.terms_updated_at || new Date().toISOString()
          }));
          return;
        }

        if (req.method === 'POST') {
          const body: any = await parseJsonBody(req);
          const newContent = (body.content || '').trim();

          if (!newContent) {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, message: 'متن قوانین و مقررات نمی‌تواند خالی باشد.' }));
            return;
          }

          const prevContent = mockDb.settings.terms_content || defaultTermsContent;
          mockDb.settings.terms_content = newContent;
          mockDb.settings.terms_updated_at = new Date().toISOString();

          createNotification(
            'بروزرسانی قوانین و مقررات',
            'متن قوانین و مقررات پویش توسط مدیریت ویرایش و ذخیره گردید.',
            'terms_update',
            true,
            {
              type: 'terms_update',
              prev_content: prevContent,
              new_content: newContent
            }
          );
          recordAuditLog('ویرایش قوانین و مقررات', 'مدیر سیستم', 'قوانین و مقررات', 'بروزرسانی متن قوانین پویش');

          res.end(JSON.stringify({
            success: true,
            message: 'قوانین و مقررات با موفقیت بروزرسانی شد.',
            content: newContent
          }));
          return;
        }
      }

      // 8. تنظیمات عمومی درگاه
      if (urlPath === '/api/settings' || urlPath === '/api/settings.php') {
        if (req.method === 'GET') {
          const action = urlObj.searchParams.get('action');
          if (action === 'test_db') {
            res.end(JSON.stringify({
              success: true,
              message: 'اتصال به پایگاه‌داده «sahmnazr_campaign» با موفقیت تایید شد.',
              data: {
                database: 'connected',
                dbname: 'sahmnazr_campaign',
                status: 'healthy',
                timestamp: new Date().toISOString()
              }
            }));
            return;
          }
          res.end(JSON.stringify({ success: true, data: mockDb.settings }));
          return;
        }
        if (req.method === 'POST') {
          const body: any = await parseJsonBody(req);
          mockDb.settings = { ...mockDb.settings, ...body };
          recordAuditLog('تنظیمات درگاه', 'مدیر سیستم', 'درگاه پرداخت', 'بروزرسانی تنظیمات درگاه بانکی');
          res.end(JSON.stringify({ success: true, data: mockDb.settings, message: 'تنظیمات ذخیره شد.' }));
          return;
        }
      }

      // 9. آپلود تصویر
      if (urlPath === '/api/upload' || urlPath === '/api/upload.php') {
        const sampleUrl = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80';
        res.end(JSON.stringify({
          success: true,
          url: sampleUrl,
          message: 'تصویر پوستر آماده شد.'
        }));
        return;
      }

      // 10. شروع پرداخت درگاه (payment/initiate)
      if (urlPath === '/api/payment/initiate' && req.method === 'POST') {
        try {
          const body: any = await parseJsonBody(req);
          const { amount, tracking_code, callback_url, gateway, campaign_id, payer_name, phone, shares, description, is_anonymous } = body;
          
          const cleanName = (payer_name || '').trim();
          if (!cleanName) {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, message: 'لطفاً نام و نام خانوادگی خود را وارد کنید.' }));
            return;
          }

          const finalTracking = tracking_code || ('POY-' + Math.floor(100000 + Math.random() * 900000));
          const authority = 'AUTH_' + Date.now() + '_' + Math.floor(1000 + Math.random() * 9000);
          const activeGw = gateway || mockDb.settings.active_gateway || 'test_gateway';
          const redirectUrl = `/gateway-sim.html?track=${encodeURIComponent(finalTracking)}&amount=${amount || 0}&authority=${authority}&gateway=${encodeURIComponent(activeGw)}&callback=${encodeURIComponent(callback_url || '/')}`;

          const paymentId = 'pay-' + Date.now();
          mockDb.payments.unshift({
            id: paymentId,
            campaign_id: campaign_id || (mockDb.campaigns[0] && mockDb.campaigns[0].id) || '',
            payer_name: cleanName,
            phone: phone || '',
            shares: Number(shares) || 1,
            amount: Number(amount) || 0,
            tracking_code: finalTracking,
            description: description || '',
            is_anonymous: !!is_anonymous,
            is_approved: false,
            status: 'pending',
            gateway: activeGw,
            transaction_id: '',
            authority_token: authority,
            verified_at: null,
            paid_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

          res.end(JSON.stringify({
            success: true,
            message: 'تراکنش با موفقیت ایجاد شد.',
            payment_id: paymentId,
            tracking_code: finalTracking,
            status: 'pending',
            authority,
            amount: Number(amount) || 0,
            redirect_url: redirectUrl,
            gateway: activeGw,
            data: {
              payment_id: paymentId,
              tracking_code: finalTracking,
              status: 'pending',
              authority,
              amount: Number(amount) || 0,
              redirect_url: redirectUrl,
              gateway: activeGw
            }
          }));
          return;
        } catch (e: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, message: e.message || 'خطا در ثبت پرداخت' }));
          return;
        }
      }

      // 11. تایید پرداخت درگاه (payment/verify)
      if (urlPath === '/api/payment/verify' && req.method === 'POST') {
        try {
          const body: any = await parseJsonBody(req);
          const { tracking_code, status_param, ref_id } = body;
          const paymentIndex = mockDb.payments.findIndex((p: any) => p.tracking_code === tracking_code);
          const payment = paymentIndex >= 0 ? mockDb.payments[paymentIndex] : null;

          if (payment && (payment.status === 'successful' || payment.status === 'success')) {
            res.end(JSON.stringify({
              success: true,
              status: 'successful',
              already_verified: true,
              transaction_id: payment.transaction_id,
              tracking_code: payment.tracking_code,
              amount: payment.amount,
              payment,
              verified_at: payment.verified_at,
              message: 'پرداخت قبلاً تایید گردیده است.'
            }));
            return;
          }

          if (status_param === 'CANCELLED') {
            if (payment) payment.status = 'cancelled';
            recordAuditLog('لغو پرداخت', payment ? payment.payer_name : 'کاربر', tracking_code, 'انصراف کاربر از پرداخت در درگاه بانکی');
            res.end(JSON.stringify({
              success: false,
              status: 'cancelled',
              payment,
              message: 'پرداخت توسط کاربر لغو گردید.'
            }));
            return;
          }

          if (status_param !== 'OK') {
            if (payment) payment.status = 'failed';
            recordAuditLog('پرداخت ناموفق', payment ? payment.payer_name : 'کاربر', tracking_code, 'خطا در انجام تراکنش بانکی');
            res.end(JSON.stringify({
              success: false,
              status: 'failed',
              payment,
              message: 'پرداخت ناموفق بود.'
            }));
            return;
          }

          const txnId = ref_id || ('TXN-' + Math.floor(10000000 + Math.random() * 90000000));
          const verifiedAt = new Date().toISOString();
          if (payment) {
            payment.status = 'successful';
            payment.is_approved = true;
            payment.transaction_id = txnId;
            payment.verified_at = verifiedAt;
            payment.paid_at = verifiedAt;

            // ثبت یا بروزرسانی خودکار کاربر مشارکت‌کننده
            const user = registerOrUpdateUser(payment.payer_name, payment.phone, payment.amount, payment.is_anonymous);
            payment.user_id = user.id;

            createNotification(
              'پرداخت موفق در پویش',
              `${payment.is_anonymous ? 'مشارکت‌کننده گمنام (' + payment.payer_name + ')' : payment.payer_name} با پرداخت ${payment.amount.toLocaleString('fa-IR')} تومان سهم مشارکت خود را ثبت نمود.`,
              'payment'
            );
            recordAuditLog('پرداخت موفق', payment.payer_name, tracking_code, `واریز موفق مبلغ ${payment.amount.toLocaleString('fa-IR')} تومان (رهگیری: ${tracking_code})`);
          }

          res.end(JSON.stringify({
            success: true,
            status: 'successful',
            transaction_id: txnId,
            tracking_code,
            amount: payment ? payment.amount : 0,
            verified_at: verifiedAt,
            payment,
            message: 'پرداخت با موفقیت تایید و سهم شما ثبت گردید.'
          }));
          return;
        } catch (e: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, message: e.message || 'خطا در اعتبارسنجی' }));
          return;
        }
      }

      res.statusCode = 404;
      res.end(JSON.stringify({ success: false, message: 'Endpoint not found' }));
      return;
    }

    next();
  });
}

export default defineConfig(() => {
  return {
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(import.meta.dirname, 'index.html'),
          campaign: path.resolve(import.meta.dirname, 'campaign/index.html'),
          admin: path.resolve(import.meta.dirname, 'admin/index.html'),
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
    },
    plugins: [
      {
        name: 'route-rewriter',
        configureServer(server) {
          setupServerMiddlewares(server);
        },
        configurePreviewServer(server) {
          setupServerMiddlewares(server);
        },
      },
    ],
  };
});
