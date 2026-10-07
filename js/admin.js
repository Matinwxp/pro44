/**
 * ==========================================================================
 * منطق پنل مدیریت سامانه پویش (Admin Panel Logic)
 * عملیات کامل مدیریت پویش‌ها، پرداخت‌ها، فیلترها و تنظیمات
 * ==========================================================================
 */

let allCampaigns = [];
let allPayments = [];
let allNotifications = [];
let activeSection = 'dashboard';
let activeNotifCategory = 'users';
let editingCampaignId = null;
let editingPaymentId = null;
let activeDatepickerInput = null;

let paymentFilters = {
  status: 'all',
  minAmount: null,
  maxAmount: null,
  name: '',
  tracking: '',
  phone: ''
};

let userFilters = {
  search: '',
  anonymous: 'all',
  from_date: '',
  to_date: '',
  page: 1,
  limit: 10
};

let logFilters = {
  search: '',
  action_type: 'all',
  actor: 'all',
  from_date: '',
  to_date: '',
  page: 1,
  limit: 15
};

let termsInitialContent = '';
let termsIsDirty = false;

function formatAdminRelativeTime(dateStr) {
  if (!dateStr) return 'به تازگی';
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'هم‌اکنون';
    if (diffMin < 60) return `${window.CampaignDB.toPersianDigits(diffMin)} دقیقه پیش`;
    if (diffHour < 24) return `${window.CampaignDB.toPersianDigits(diffHour)} ساعت پیش`;
    if (diffDay < 30) return `${window.CampaignDB.toPersianDigits(diffDay)} روز پیش`;
    return window.CampaignDB.toPersianDigits(new Date(dateStr).toLocaleDateString('fa-IR'));
  } catch (e) {
    return 'به تازگی';
  }
}

async function reloadNotifications() {
  try {
    if (typeof window.CampaignDB.getNotifications === 'function') {
      const data = await window.CampaignDB.getNotifications();
      allNotifications = data.notifications || [];
      renderNotificationsDropdown(data.unread_count || 0);
    }
  } catch (err) {
    console.warn('خطا در دریافت اعلان‌های مدیریت:', err);
  }
}

function getNotificationCategory(n) {
  if (!n) return 'site';
  if (n.category === 'users' || n.category === 'admin' || n.category === 'site') {
    return n.category;
  }
  const type = String(n.type || '').toLowerCase();
  if (type.includes('user') || type === 'user_approval' || type === 'user_visibility' || type === 'user_status') {
    return 'users';
  }
  if (type.includes('terms') || type.includes('setting') || type.includes('gateway') || type.includes('admin') || type.includes('system') || type === 'campaign_status' || type.includes('log') || type.includes('backup') || type.includes('auth')) {
    return 'admin';
  }
  if (type.includes('pay') || type.includes('camp') || type.includes('site') || type.includes('trans')) {
    return 'site';
  }
  return 'site';
}

function renderNotificationsDropdown(unreadCount = 0) {
  const badge = document.getElementById('notifBadgeCount');
  const headerTag = document.getElementById('notifUnreadHeaderTag');
  const listEl = document.getElementById('adminNotificationsList');
  if (!badge || !listEl) return;

  if (unreadCount > 0) {
    badge.textContent = window.CampaignDB.toPersianDigits(unreadCount);
    badge.style.display = 'flex';
    if (headerTag) {
      headerTag.textContent = `${window.CampaignDB.toPersianDigits(unreadCount)} جدید`;
      headerTag.style.display = 'inline-block';
    }
  } else {
    badge.style.display = 'none';
    if (headerTag) {
      headerTag.style.display = 'none';
    }
  }

  // بروزرسانی شمارنده‌های ۳ تب دسته‌بندی اعلان‌ها
  const userNotifs = (allNotifications || []).filter(n => getNotificationCategory(n) === 'users');
  const adminNotifs = (allNotifications || []).filter(n => getNotificationCategory(n) === 'admin');
  const siteNotifs = (allNotifications || []).filter(n => getNotificationCategory(n) === 'site');

  const badgeUsers = document.getElementById('notifCatBadgeUsers');
  const badgeAdmin = document.getElementById('notifCatBadgeAdmin');
  const badgeSite = document.getElementById('notifCatBadgeSite');

  if (badgeUsers) badgeUsers.textContent = window.CampaignDB.toPersianDigits(userNotifs.length);
  if (badgeAdmin) badgeAdmin.textContent = window.CampaignDB.toPersianDigits(adminNotifs.length);
  if (badgeSite) badgeSite.textContent = window.CampaignDB.toPersianDigits(siteNotifs.length);

  // بروزرسانی وضعیت فعال بودن تب‌های ۳ گانه
  const catTabs = document.querySelectorAll('#notifCategoryTabs .notif-cat-tab-btn');
  catTabs.forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-notif-category') === activeNotifCategory);
  });

  // فیلتر کردن اعلان‌ها بر اساس تب انتخابی (کاربران، پنل مدیریت، سایت)
  const filteredNotifications = (allNotifications || []).filter(n => getNotificationCategory(n) === activeNotifCategory);

  if (!filteredNotifications || filteredNotifications.length === 0) {
    const categoryTitles = {
      users: 'کاربران',
      admin: 'پنل مدیریت',
      site: 'سایت'
    };
    const catName = categoryTitles[activeNotifCategory] || '';
    listEl.innerHTML = `
      <div class="notif-empty-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="margin: 0 auto 8px; opacity: 0.5;">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        <div>در حال حاضر هیچ اعلانی در بخش «${catName}» وجود ندارد.</div>
      </div>
    `;
    return;
  }

  listEl.innerHTML = filteredNotifications.map(n => {
    let iconClass = 'notif-icon-system';
    let iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';

    if (n.type === 'payment') {
      iconClass = 'notif-icon-payment';
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>';
    } else if (n.type === 'user' || n.type === 'user_approval' || n.type === 'user_visibility') {
      iconClass = 'notif-icon-user';
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
    } else if (n.type === 'campaign' || n.type === 'campaign_status') {
      iconClass = 'notif-icon-campaign';
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>';
    } else if (n.type === 'terms_update') {
      iconClass = 'notif-icon-terms';
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';
    }

    const timeAgo = formatAdminRelativeTime(n.created_at);

    let actionBtnHtml = '';
    if (n.reversible && !n.undone) {
      actionBtnHtml = `
        <button type="button" class="btn-notif-undo" data-undo-id="${n.id}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
          <span>لغو تغییرات</span>
        </button>
      `;
    } else if (n.undone) {
      actionBtnHtml = `
        <span class="badge-undone">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>لغو شد</span>
        </span>
      `;
    }

    return `
      <div class="notif-item-card ${!n.is_read ? 'unread' : ''}" data-notif-item-id="${n.id}">
        <div class="notif-icon-bubble ${iconClass}">
          ${iconSvg}
        </div>
        <div class="notif-body">
          <div class="notif-title-row">
            <span class="notif-title-text">${n.title}</span>
          </div>
          <div class="notif-desc-text">${n.description || ''}</div>
          <div class="notif-footer-row">
            <span class="notif-time-text">${timeAgo}</span>
            ${actionBtnHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.btn-notif-undo').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const notifId = btn.getAttribute('data-undo-id');
      if (notifId) {
        await handleUndoNotification(notifId, btn);
      }
    };
  });

  listEl.querySelectorAll('.notif-item-card').forEach(card => {
    card.onclick = async () => {
      const id = card.getAttribute('data-notif-item-id');
      if (id && card.classList.contains('unread')) {
        try {
          await window.CampaignDB.markNotificationRead(id);
          card.classList.remove('unread');
          const found = allNotifications.find(n => n.id === id);
          if (found) found.is_read = true;
          const unreadRemaining = allNotifications.filter(n => !n.is_read).length;
          renderNotificationsDropdown(unreadRemaining);
        } catch (e) {}
      }
    };
  });
}

async function handleUndoNotification(notifId, btnEl) {
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerHTML = '<span>در حال لغو...</span>';
  }

  try {
    const res = await window.CampaignDB.undoNotification(notifId);
    if (res.success) {
      showAdminToast(res.message || 'عملیات با موفقیت به حالت قبلی بازگردانده شد.', 'success');
      await reloadAdminData();
      await reloadNotifications();
      renderCurrentSection();
    } else {
      showAdminToast(res.message || 'خطا در لغو تغییرات', 'error');
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerHTML = '<span>لغو تغییرات</span>';
      }
    }
  } catch (err) {
    console.error('خطای بازگردانی عملیات:', err);
    showAdminToast(err.message || 'خطا در بازگردانی عملیات', 'error');
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = '<span>لغو تغییرات</span>';
    }
  }
}

function setupNotificationEvents() {
  const toggleBtn = document.getElementById('btnAdminNotificationsToggle');
  const dropdown = document.getElementById('adminNotificationsDropdown');
  const markAllBtn = document.getElementById('btnMarkAllNotifsRead');

  // اتصال رویداد تب‌های ۳ گانه اعلان‌ها (کاربران، پنل مدیریت، سایت)
  const catTabs = document.querySelectorAll('#notifCategoryTabs .notif-cat-tab-btn');
  catTabs.forEach(tab => {
    tab.onclick = (e) => {
      e.stopPropagation();
      const cat = tab.getAttribute('data-notif-category');
      if (cat) {
        activeNotifCategory = cat;
        catTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-notif-category') === cat));
        const unreadCount = (allNotifications || []).filter(n => !n.is_read).length;
        renderNotificationsDropdown(unreadCount);
      }
    };
  });

  if (toggleBtn && dropdown) {
    toggleBtn.onclick = (e) => {
      e.stopPropagation();
      const isVisible = dropdown.style.display === 'block';
      dropdown.style.display = isVisible ? 'none' : 'block';
    };

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !toggleBtn.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }

  if (markAllBtn) {
    markAllBtn.onclick = async (e) => {
      e.stopPropagation();
      try {
        await window.CampaignDB.markAllNotificationsRead();
        allNotifications.forEach(n => n.is_read = true);
        renderNotificationsDropdown(0);
        showAdminToast('همه اعلان‌ها خوانده شدند.', 'info');
      } catch (err) {
        console.error('خطا در خواندن همه اعلان‌ها:', err);
      }
    };
  }
}

/**
 * پاپ‌آپ وضعیت عملیات مدیریت:
 * - عملیات موفق: پاپ‌آپ سبز با عنوان "عملیات موفقیت آمیز بود"
 * - عملیات ناموفق: پاپ‌آپ قرمز با عنوان "خطا در عملیات"
 */
function showAdminPopup(title, message, type = 'success') {
  let container = document.getElementById('adminPopupContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'adminPopupContainer';
    container.className = 'admin-popup-container';
    document.body.appendChild(container);
  }

  const popup = document.createElement('div');
  popup.className = `admin-action-popup popup-${type}`;

  let iconSvg = '';
  let badgeClass = 'badge-info';

  if (type === 'success') {
    badgeClass = 'badge-success';
    iconSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  } else if (type === 'error') {
    badgeClass = 'badge-error';
    iconSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
  } else {
    badgeClass = 'badge-info';
    iconSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  }

  // تنظیم عناوین دقیق درخواستی
  let finalTitle = title;
  let finalMessage = message;

  if (type === 'success') {
    finalTitle = 'عملیات موفقیت آمیز بود';
    if (title && title !== 'success' && title !== 'عملیات موفقیت آمیز بود' && !message) {
      finalMessage = title;
    } else if (!finalMessage) {
      finalMessage = 'عملیات با موفقیت انجام شد.';
    }
  } else if (type === 'error') {
    finalTitle = 'خطا در عملیات';
    if (title && title !== 'error' && title !== 'خطا در عملیات' && !message) {
      finalMessage = title;
    } else if (!finalMessage) {
      finalMessage = 'در انجام عملیات خطایی رخ داده است.';
    }
  } else if (!finalTitle) {
    finalTitle = 'پیام سیستم';
  }

  popup.innerHTML = `
    <div class="popup-icon-badge ${badgeClass}">
      ${iconSvg}
    </div>
    <div class="popup-text-content">
      <div class="popup-title">${finalTitle}</div>
      ${finalMessage ? `<div class="popup-message">${finalMessage}</div>` : ''}
    </div>
    <button type="button" class="btn-popup-dismiss" aria-label="بستن">×</button>
  `;

  let isDismissed = false;
  const dismiss = () => {
    if (isDismissed) return;
    isDismissed = true;
    popup.classList.add('hide');
    setTimeout(() => {
      if (popup.parentNode) popup.parentNode.removeChild(popup);
    }, 280);
  };

  const dismissBtn = popup.querySelector('.btn-popup-dismiss');
  if (dismissBtn) {
    dismissBtn.onclick = (e) => {
      e.stopPropagation();
      dismiss();
    };
  }

  container.appendChild(popup);
  setTimeout(dismiss, 4500);
}

function showAdminToast(message, type = 'info') {
  if (type === 'success') {
    showAdminPopup('عملیات موفقیت آمیز بود', message || 'عملیات با موفقیت انجام شد.', 'success');
  } else if (type === 'error') {
    showAdminPopup('خطا در عملیات', message || 'در انجام عملیات خطایی رخ داده است.', 'error');
  } else {
    showAdminPopup('پیام سیستم', message, 'info');
  }
}

window.showAdminPopup = showAdminPopup;
window.showAdminToast = showAdminToast;

let selectedAddCampaignFile = null;
let selectedEditCampaignFile = null;

async function initAdminPanel(force = false) {
  try {
    const isAuth = force || await window.AdminAuth.isAuthenticatedAdmin();
    if (!isAuth) {
      showLoginView();
      setupLoginEvents();
      return;
    }

    showAdminView();
    await updateAdminUserInfo();
    await reloadAdminData();
    await reloadNotifications();
    setupAdminNavigation();
    setupNotificationEvents();
    setupAdminEvents();
    initImageUploadFeatures();
    initPersianDatePicker();
    renderCurrentSection();

    // بروزرسانی دوره‌ای آرام اعلان‌ها
    if (!window._adminNotifInterval) {
      window._adminNotifInterval = setInterval(() => {
        reloadNotifications();
      }, 25000);
    }
  } catch (err) {
    console.error('خطا در راه‌اندازی پنل ادمین:', err);
    try {
      const isAuth = await window.AdminAuth.isAuthenticatedAdmin();
      if (!isAuth) {
        showLoginView();
        setupLoginEvents();
      } else {
        showAdminView();
        renderCurrentSection();
      }
    } catch (e) {
      showLoginView();
      setupLoginEvents();
    }
  }
}

async function updateAdminUserInfo() {
  const emailEl = document.getElementById('adminLoggedInEmail') || document.getElementById('adminLoggedInPhone');
  if (emailEl) {
    const email = await window.AdminAuth.getAdminEmail();
    emailEl.textContent = email || 'Matinshariati1404@gmail.com';
  }
}

function showLoginView() {
  const loginScreen = document.getElementById('adminLoginScreen');
  const appShell = document.getElementById('adminAppShell');
  if (loginScreen) {
    loginScreen.style.display = 'flex';
    loginScreen.removeAttribute('hidden');
  }
  if (appShell) {
    appShell.style.display = 'none';
    appShell.setAttribute('hidden', '');
  }
}

function showAdminView() {
  const loginScreen = document.getElementById('adminLoginScreen');
  const appShell = document.getElementById('adminAppShell');
  if (loginScreen) {
    loginScreen.style.display = 'none';
    loginScreen.setAttribute('hidden', '');
  }
  if (appShell) {
    appShell.style.display = 'flex';
    appShell.removeAttribute('hidden');
  }
  updateAdminUserInfo();
}

window.showLoginView = showLoginView;
window.showAdminView = showAdminView;

function setupLoginEvents() {
  const loginForm = document.getElementById('adminLoginForm');
  if (!loginForm) return;

  loginForm.onsubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const emailInput = (document.getElementById('adminEmailInput')?.value || '').trim();
    const passInput = (document.getElementById('adminPasswordInput')?.value || '').trim();
    const submitBtn = document.getElementById('btnAdminLoginSubmit') || loginForm.querySelector('button[type="submit"]');
    const errorEl = document.getElementById('loginErrorMessage');
    if (errorEl) errorEl.style.display = 'none';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>در حال بررسی...</span>';
    }

    try {
      const result = await window.AdminAuth.loginAdmin(emailInput, passInput);
      if (result.success) {
        showAdminToast(result.message || 'ورود با موفقیت انجام شد.', 'success');
        showAdminView();
        await initAdminPanel(true);
      } else {
        if (errorEl) {
          errorEl.textContent = result.message || 'اطلاعات ورود نادرست است.';
          errorEl.style.display = 'block';
        }
      }
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = `خطا: ${err.message}`;
        errorEl.style.display = 'block';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'ورود به پنل مدیریت';
      }
    }
  };
}

async function reloadAdminData() {
  try {
    allCampaigns = await window.CampaignDB.getCampaigns();
    allPayments = await window.CampaignDB.getPayments();
  } catch (err) {
    console.error('خطا در دریافت اطلاعات:', err);
    showAdminToast('خطا در دریافت اطلاعات از پایگاه داده', 'error');
  }
}

function setupAdminNavigation() {
  const navBtns = document.querySelectorAll('.sidebar-nav .nav-item-btn');
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('sidebarOverlay');

  navBtns.forEach(btn => {
    btn.onclick = () => {
      const section = btn.getAttribute('data-section');
      if (section) {
        navigateToSection(section);
      }
      if (sidebar && window.innerWidth < 900) {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
      }
    };
  });

  const logoutBtn = document.getElementById('btnAdminLogout');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      const modal = document.getElementById('modalConfirmLogout');
      if (modal) {
        modal.classList.add('open');
      } else {
        window.AdminAuth.logoutAdmin();
      }
    };
  }

  const btnConfirmLogoutYes = document.getElementById('btnConfirmLogoutYes');
  if (btnConfirmLogoutYes) {
    btnConfirmLogoutYes.onclick = () => {
      const modal = document.getElementById('modalConfirmLogout');
      if (modal) modal.classList.remove('open');
      window.AdminAuth.logoutAdmin();
    };
  }

  const toggleBtn = document.getElementById('btnToggleSidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.onclick = () => {
      const isOpen = sidebar.classList.toggle('open');
      if (overlay) {
        if (isOpen) overlay.classList.add('active');
        else overlay.classList.remove('active');
      }
    };
  }

  if (overlay) {
    overlay.onclick = () => {
      if (sidebar) sidebar.classList.remove('open');
      overlay.classList.remove('active');
    };
  }
}

function navigateToSection(sectionName) {
  activeSection = sectionName;
  document.querySelectorAll('.sidebar-nav .nav-item-btn').forEach(btn => {
    if (btn.getAttribute('data-section') === sectionName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  document.querySelectorAll('.admin-section').forEach(sec => {
    sec.classList.remove('active');
  });

  const targetSec = document.getElementById(`section-${sectionName}`);
  if (targetSec) {
    targetSec.classList.add('active');
  }

  const breadcrumbEl = document.getElementById('adminBreadcrumb');
  if (breadcrumbEl) {
    const titles = {
      dashboard: 'داشبورد و آمار کلی',
      campaigns: 'مدیریت پویش‌ها',
      'add-campaign': 'ایجاد پویش جدید',
      payments: 'مدیریت تراکنش‌ها و واریزی‌ها',
      reports: 'گزارشات و عملکرد مالی',
      users: 'مدیریت کاربران و مشارکت‌کنندگان',
      logs: 'لاگ‌ها و رویدادهای سیستم',
      settings: 'تنظیمات درگاه و دیتابیس'
    };
    breadcrumbEl.textContent = titles[sectionName] || 'مدیریت';
  }

  renderCurrentSection();
}

window.navigateToSection = navigateToSection;

function renderCurrentSection() {
  switch (activeSection) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'campaigns':
      renderCampaignsTable();
      break;
    case 'add-campaign':
      resetAddCampaignForm();
      break;
    case 'payments':
      renderPaymentsTable();
      break;
    case 'reports':
      renderReports();
      break;
    case 'users':
      renderUsersSection();
      break;
    case 'logs':
      renderLogsSection();
      break;
    case 'settings':
      renderSettings();
      break;
  }
}

function renderDashboard() {
  const totalCampaigns = allCampaigns.length;
  const activeCampaigns = allCampaigns.filter(c => c.status === 'active').length;
  const successfulPayments = allPayments.filter(p => p.status === 'successful' || p.status === 'success');
  const totalCompletedShares = successfulPayments.reduce((sum, p) => sum + (Number(p.shares) || 0), 0);
  const totalCollectedAmount = successfulPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalCampEl = document.getElementById('dashTotalCampaigns');
  if (totalCampEl) totalCampEl.textContent = window.CampaignDB.formatNumber(totalCampaigns);

  const activeCampEl = document.getElementById('dashActiveCampaigns');
  if (activeCampEl) activeCampEl.textContent = window.CampaignDB.formatNumber(activeCampaigns);

  const completedSharesEl = document.getElementById('dashCompletedShares');
  if (completedSharesEl) completedSharesEl.textContent = window.CampaignDB.formatNumber(totalCompletedShares);

  const collectedAmountEl = document.getElementById('dashCollectedAmount');
  if (collectedAmountEl) collectedAmountEl.textContent = window.CampaignDB.formatCurrency(totalCollectedAmount);

  const activeCamp = allCampaigns.find(c => c.status === 'active') || allCampaigns[0];
  const activeCampBox = document.getElementById('dashActiveCampaignSpotlight');

  if (activeCamp && activeCampBox) {
    const stats = window.CampaignDB.calculateCampaignStats(activeCamp, allPayments);
    activeCampBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="badge-status ${activeCamp.status}">${getCampaignStatusLabel(activeCamp.status)}</span>
          <h3 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; margin-top: 6px;">${activeCamp.title}</h3>
        </div>
        <div style="text-align: left;">
          <div style="font-size: 1.6rem; font-weight: 900; color: #047857;">${window.CampaignDB.toPersianDigits(stats.progress)}٪</div>
          <div style="font-size: 0.8rem; color: #64748b;">پیشرفت پویش فعال</div>
        </div>
      </div>
      <div style="height: 10px; background: #e2e8f0; border-radius: 99px; overflow: hidden; margin-bottom: 18px;">
        <div style="width: ${Math.min(100, stats.progress)}%; height: 100%; background: linear-gradient(90deg, #059669, #10b981);"></div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; font-size: 0.85rem;">
        <div style="background: #f8fafc; padding: 10px; border-radius: 8px;">
          <span style="color: #64748b; display: block; font-size: 0.75rem;">هدف مالی:</span>
          <strong>${window.CampaignDB.formatCurrency(stats.target_amount)}</strong>
        </div>
        <div style="background: #f8fafc; padding: 10px; border-radius: 8px;">
          <span style="color: #64748b; display: block; font-size: 0.75rem;">جمع‌آوری شده:</span>
          <strong style="color: #047857;">${window.CampaignDB.formatCurrency(stats.collected_amount)}</strong>
        </div>
        <div style="background: #f8fafc; padding: 10px; border-radius: 8px;">
          <span style="color: #64748b; display: block; font-size: 0.75rem;">سهم‌های تکمیل‌شده:</span>
          <strong>${window.CampaignDB.formatNumber(stats.paid_shares)} از ${window.CampaignDB.formatNumber(stats.total_shares)}</strong>
        </div>
        <div style="background: #f8fafc; padding: 10px; border-radius: 8px;">
          <span style="color: #64748b; display: block; font-size: 0.75rem;">باقیمانده:</span>
          <strong style="color: #d97706;">${window.CampaignDB.formatNumber(stats.remaining_shares)} سهم</strong>
        </div>
      </div>
    `;
  }

  const dashPaymentsTbody = document.getElementById('dashRecentPaymentsTable');
  if (dashPaymentsTbody) {
    const recent = allPayments.slice(0, 5);
    if (recent.length === 0) {
      dashPaymentsTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">هیچ پرداختی ثبت نشده است.</td></tr>';
    } else {
      dashPaymentsTbody.innerHTML = recent.map(p => {
        const camp = allCampaigns.find(c => String(c.id) === String(p.campaign_id));
        return `
          <tr>
            <td style="font-weight: 700; color: #047857;">${p.tracking_code || '-'}</td>
            <td><strong>${p.payer_name || 'ناشناس'}</strong></td>
            <td>${camp ? camp.title : 'نامشخص'}</td>
            <td><strong style="color: #047857;">${window.CampaignDB.toPersianDigits(p.shares)} سهم</strong></td>
            <td>${window.CampaignDB.formatCurrency(p.amount)}</td>
            <td><span class="badge-status ${p.status}">${getPaymentStatusPersianLabel(p.status)}</span></td>
          </tr>
        `;
      }).join('');
    }
  }
}

function getCampaignStatusLabel(status) {
  const map = {
    pending: 'در انتظار / به‌زودی',
    active: 'فعال',
    completed: 'پایان یافته',
    inactive: 'غیرفعال'
  };
  return map[status] || 'فعال';
}

function getPaymentStatusPersianLabel(status) {
  const map = {
    pending: 'در انتظار پرداخت',
    success: 'موفق و تایید شده',
    successful: 'موفق و تایید شده',
    failed: 'ناموفق',
    cancelled: 'لغو شده',
    verification_failed: 'عدم تایید'
  };
  return map[status] || status;
}

function renderCampaignsTable() {
  const tbody = document.getElementById('campaignsTableBody');
  if (!tbody) return;
  if (allCampaigns.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 32px; color: #94a3b8;">هیچ پویشی یافت نشد.</td></tr>`;
    return;
  }

  tbody.innerHTML = allCampaigns.map(camp => {
    const stats = window.CampaignDB.calculateCampaignStats(camp, allPayments);
    const hasImageBadge = camp.image_url ? '<span style="display:inline-flex; align-items:center; color:#047857; margin-left:4px;" title="دارای پوستر"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></span>' : '';
    return `
      <tr>
        <td style="font-weight: 800; color: #0f172a;">${hasImageBadge}${camp.title}</td>
        <td>${window.CampaignDB.formatNumber(stats.total_shares)}</td>
        <td>${window.CampaignDB.formatCurrency(stats.share_price)}</td>
        <td style="font-weight: 700;">${window.CampaignDB.formatCurrency(stats.target_amount)}</td>
        <td style="color: #047857; font-weight: 700;">${window.CampaignDB.formatNumber(stats.paid_shares)}</td>
        <td style="color: #d97706; font-weight: 700;">${window.CampaignDB.formatNumber(stats.remaining_shares)}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="flex: 1; min-width: 60px; height: 6px; background: #e2e8f0; border-radius: 99px; overflow: hidden;">
              <div style="width: ${Math.min(100, stats.progress)}%; height: 100%; background: #059669;"></div>
            </div>
            <span style="font-size: 0.8rem; font-weight: 700;">${window.CampaignDB.toPersianDigits(stats.progress)}٪</span>
          </div>
        </td>
        <td>
          <select class="form-control-select" style="padding: 4px 8px; font-size: 0.82rem; font-weight: 700; width: auto;" onchange="changeCampaignStatus('${camp.id}', this.value)">
            <option value="pending" ${camp.status === 'pending' || camp.status === 'inactive' ? 'selected' : ''}>به زودی</option>
            <option value="active" ${camp.status === 'active' ? 'selected' : ''}>فعال</option>
            <option value="completed" ${camp.status === 'completed' ? 'selected' : ''}>تکمیل شده</option>
          </select>
        </td>
        <td>
          <div class="table-actions-cell">
            <button type="button" class="btn-row-action btn-action-edit" onclick="openEditCampaignModal('${camp.id}')">ویرایش</button>
            <button type="button" class="btn-row-action" onclick="openCampaignDetailsModal('${camp.id}')">مشاهده</button>
            <button type="button" class="btn-row-action btn-action-delete" onclick="confirmDeleteCampaign('${camp.id}')">حذف</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.changeCampaignStatus = async function(campaignId, newStatus) {
  const camp = allCampaigns.find(c => String(c.id) === String(campaignId));
  if (!camp) return;
  await window.CampaignDB.updateCampaign(campaignId, { status: newStatus });
  await reloadAdminData();
  await reloadNotifications();
  renderCampaignsTable();
  renderDashboard();
  showAdminToast(`وضعیت پویش ${camp.title} به ${getCampaignStatusLabel(newStatus)} تغییر یافت.`, 'success');
};

window.confirmDeleteCampaign = function(campaignId) {
  const camp = allCampaigns.find(c => String(c.id) === String(campaignId));
  if (!camp) return;
  const relatedPayments = allPayments.filter(p => String(p.campaign_id) === String(campaignId));
  let warningMessage = `آیا از حذف پویش «${camp.title}» اطمینان دارید؟`;
  if (relatedPayments.length > 0) {
    warningMessage = `این پویش دارای ${window.CampaignDB.toPersianDigits(relatedPayments.length)} تراکنش ثبت شده است.\n\nبا حذف پویش ${camp.title} تمام تراکنش‌های آن نیز حذف می‌شوند. ادامه می‌دهید؟`;
  }
  if (confirm(warningMessage)) {
    executeDeleteCampaign(campaignId);
  }
};

async function executeDeleteCampaign(campaignId) {
  try {
    await window.CampaignDB.deleteCampaign(campaignId);
    await reloadAdminData();
    await reloadNotifications();
    renderCampaignsTable();
    renderDashboard();
    showAdminToast('پویش با موفقیت حذف گردید.', 'success');
  } catch (err) {
    showAdminToast('خطا در حذف پویش.', 'error');
  }
}

window.openCampaignDetailsModal = function(campaignId) {
  const camp = allCampaigns.find(c => String(c.id) === String(campaignId));
  if (!camp) return;
  const stats = window.CampaignDB.calculateCampaignStats(camp, allPayments);
  const campPayments = allPayments.filter(p => String(p.campaign_id) === String(campaignId));
  const modalBody = document.getElementById('campaignDetailsModalBody');
  modalBody.innerHTML = `
    <div style="display: flex; gap: 20px; margin-bottom: 20px; align-items: center; flex-wrap: wrap;">
      ${camp.image_url ? `<img src="${camp.image_url}" style="width: 100px; height: 75px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1;" />` : ''}
      <div style="flex: 1;">
        <span class="badge-status ${camp.status}" style="margin-bottom: 6px;">${getCampaignStatusLabel(camp.status)}</span>
        <h3 style="font-size: 1.4rem; font-weight: 800; color: #0f172a;">${camp.title}</h3>
        <p style="color: #64748b; font-size: 0.9rem; margin-top: 4px;">${camp.description || 'بدون توضیحات'}</p>
      </div>
      <div>
        <a href="/index.html?id=${camp.id}" target="_blank" class="btn-quick-action primary" style="font-size: 0.85rem;">
          مشاهده صفحه عمومی
        </a>
      </div>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 24px;">
      <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div style="font-size: 0.78rem; color: #64748b;">کل سهم‌ها</div>
        <div style="font-size: 1.1rem; font-weight: 800;">${window.CampaignDB.formatNumber(stats.total_shares)}</div>
      </div>
      <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div style="font-size: 0.78rem; color: #64748b;">سهم‌های تکمیل‌شده</div>
        <div style="font-size: 1.1rem; font-weight: 800; color: #047857;">${window.CampaignDB.formatNumber(stats.paid_shares)}</div>
      </div>
      <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div style="font-size: 0.78rem; color: #64748b;">سهم‌های باقیمانده</div>
        <div style="font-size: 1.1rem; font-weight: 800; color: #d97706;">${window.CampaignDB.formatNumber(stats.remaining_shares)}</div>
      </div>
      <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div style="font-size: 0.78rem; color: #64748b;">قیمت هر سهم</div>
        <div style="font-size: 1.1rem; font-weight: 800;">${window.CampaignDB.formatCurrency(stats.share_price)}</div>
      </div>
      <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div style="font-size: 0.78rem; color: #64748b;">مبلغ هدف</div>
        <div style="font-size: 1.1rem; font-weight: 800;">${window.CampaignDB.formatCurrency(stats.target_amount)}</div>
      </div>
      <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div style="font-size: 0.78rem; color: #64748b;">مبلغ جمع‌آوری شده</div>
        <div style="font-size: 1.1rem; font-weight: 800; color: #047857;">${window.CampaignDB.formatCurrency(stats.collected_amount)}</div>
      </div>
    </div>
    <h4 style="font-size: 1rem; font-weight: 800; margin-bottom: 12px;">لیست پرداخت‌ها (${window.CampaignDB.toPersianDigits(campPayments.length)})</h4>
    <div style="max-height: 220px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <table class="admin-table" style="font-size: 0.84rem;">
        <thead>
          <tr>
            <th>کد پیگیری</th>
            <th>واریز کننده</th>
            <th>سهم</th>
            <th>مبلغ</th>
            <th>وضعیت</th>
          </tr>
        </thead>
        <tbody>
          ${campPayments.length === 0 ? '<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;">هیچ واریزی ثبت نشده است.</td></tr>' : 
            campPayments.map(p => `
              <tr>
                <td>${p.tracking_code}</td>
                <td><strong>${p.payer_name || 'ناشناس'}</strong></td>
                <td>${window.CampaignDB.toPersianDigits(p.shares)}</td>
                <td>${window.CampaignDB.formatCurrency(p.amount)}</td>
                <td><span class="badge-status ${p.status}">${getPaymentStatusPersianLabel(p.status)}</span></td>
              </tr>
            `).join('')}
        </tbody>
      </table>
    </div>
  `;
  document.getElementById('modalCampaignDetails').classList.add('open');
};

function resetAddCampaignForm() {
  editingCampaignId = null;
  const form = document.getElementById('formAddCampaign');
  if (form) form.reset();
  const previewBox = document.getElementById('addCampImagePreviewBox');
  const previewImg = document.getElementById('addCampImagePreview');
  const hiddenInput = document.getElementById('addCampImage');
  if (hiddenInput) hiddenInput.value = '';
  if (previewImg) previewImg.src = '';
  if (previewBox) previewBox.style.display = 'none';

  const addCampSecTitle = document.getElementById('addCampaignSectionTitle');
  if (addCampSecTitle) addCampSecTitle.textContent = 'ایجاد و انتشار پویش جدید';
  const saveBtn = document.getElementById('btnSaveCampaign');
  if (saveBtn) saveBtn.textContent = 'ذخیره و انتشار پویش';
  updateAddCampaignCalculation();
}

function updateAddCampaignCalculation() {
  const sharesInput = document.getElementById('addCampTotalShares');
  const priceInput = document.getElementById('addCampSharePrice');
  if (!sharesInput || !priceInput) return;
  const shares = parseInt(window.CampaignDB.toEnglishDigits(sharesInput.value), 10) || 0;
  const price = parseInt(window.CampaignDB.toEnglishDigits(priceInput.value), 10) || 0;
  const target = shares * price;
  const targetEl = document.getElementById('addCampTargetAmountDisplay');
  if (targetEl) {
    targetEl.textContent = window.CampaignDB.formatCurrency(target);
  }
}

window.openEditCampaignModal = function(campaignId) {
  const camp = allCampaigns.find(c => String(c.id) === String(campaignId));
  if (!camp) return;
  editingCampaignId = camp.id;
  selectedEditCampaignFile = null;

  document.getElementById('editCampId').value = camp.id;
  document.getElementById('editCampTitle').value = camp.title;
  document.getElementById('editCampDesc').value = camp.description || '';
  document.getElementById('editCampTotalShares').value = camp.total_shares;
  document.getElementById('editCampSharePrice').value = camp.share_price;
  document.getElementById('editCampStartDate').value = camp.start_date || '';
  document.getElementById('editCampEndDate').value = camp.end_date || '';
  document.getElementById('editCampStatus').value = camp.status || 'active';

  document.getElementById('editCampEventLocation').value = camp.event_location || '';
  document.getElementById('editCampEventDate').value = camp.event_date || '';
  document.getElementById('editCampEventTime').value = camp.event_time || '';
  document.getElementById('editCampChannelLink').value = camp.channel_link || '';
  document.getElementById('editCampSocialLink').value = camp.social_link || '';
  document.getElementById('editCampContactPhone').value = camp.contact_phone || '';
  document.getElementById('editCampAdditionalNotes').value = camp.additional_notes || '';

  const editHiddenInput = document.getElementById('editCampImage');
  const editPreviewImg = document.getElementById('editCampImagePreview');
  const editPreviewBox = document.getElementById('editCampImagePreviewBox');
  const editUrlInput = document.getElementById('editCampImageUrlInput');

  if (camp.image_url) {
    if (editHiddenInput) editHiddenInput.value = camp.image_url;
    if (editUrlInput) editUrlInput.value = camp.image_url;
    if (editPreviewImg) editPreviewImg.src = camp.image_url;
    if (editPreviewBox) editPreviewBox.style.display = 'block';
  } else {
    if (editHiddenInput) editHiddenInput.value = '';
    if (editUrlInput) editUrlInput.value = '';
    if (editPreviewImg) editPreviewImg.src = '';
    if (editPreviewBox) editPreviewBox.style.display = 'none';
  }

  const shares = parseInt(camp.total_shares, 10) || 0;
  const price = parseInt(camp.share_price, 10) || 0;
  document.getElementById('editCampTargetAmountDisplay').textContent = window.CampaignDB.formatCurrency(shares * price);

  document.getElementById('modalEditCampaign').classList.add('open');
};

function initImageUploadFeatures() {
  const addFileInput = document.getElementById('addCampImageFile');
  const addUrlInput = document.getElementById('addCampImageUrlInput');
  const addHiddenInput = document.getElementById('addCampImage');
  const addPreviewBox = document.getElementById('addCampImagePreviewBox');
  const addPreviewImg = document.getElementById('addCampImagePreview');
  const btnRemoveAdd = document.getElementById('btnRemoveAddImage');

  if (addFileInput) {
    addFileInput.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        selectedAddCampaignFile = file;
        const objectUrl = URL.createObjectURL(file);
        if (addPreviewImg) addPreviewImg.src = objectUrl;
        if (addPreviewBox) addPreviewBox.style.display = 'block';
        if (addUrlInput) addUrlInput.value = '';
        if (addHiddenInput) addHiddenInput.value = '';
        showAdminToast('تصویر انتخاب شد.', 'info');
      }
    };
  }

  if (addUrlInput) {
    addUrlInput.oninput = () => {
      const url = addUrlInput.value.trim();
      if (url) {
        selectedAddCampaignFile = null;
        if (addFileInput) addFileInput.value = '';
        if (addHiddenInput) addHiddenInput.value = url;
        if (addPreviewImg) addPreviewImg.src = url;
        if (addPreviewBox) addPreviewBox.style.display = 'block';
      } else {
        if (!selectedAddCampaignFile) {
          if (addHiddenInput) addHiddenInput.value = '';
          if (addPreviewBox) addPreviewBox.style.display = 'none';
        }
      }
    };
  }

  if (btnRemoveAdd) {
    btnRemoveAdd.onclick = (e) => {
      e.preventDefault();
      selectedAddCampaignFile = null;
      if (addHiddenInput) addHiddenInput.value = '';
      if (addFileInput) addFileInput.value = '';
      if (addUrlInput) addUrlInput.value = '';
      if (addPreviewImg) addPreviewImg.src = '';
      if (addPreviewBox) addPreviewBox.style.display = 'none';
      showAdminToast('تصویر حذف شد.', 'info');
    };
  }

  const editFileInput = document.getElementById('editCampImageFile');
  const editUrlInput = document.getElementById('editCampImageUrlInput');
  const editHiddenInput = document.getElementById('editCampImage');
  const editPreviewBox = document.getElementById('editCampImagePreviewBox');
  const editPreviewImg = document.getElementById('editCampImagePreview');
  const btnRemoveEdit = document.getElementById('btnRemoveEditImage');

  if (editFileInput) {
    editFileInput.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        selectedEditCampaignFile = file;
        const objectUrl = URL.createObjectURL(file);
        if (editPreviewImg) editPreviewImg.src = objectUrl;
        if (editPreviewBox) editPreviewBox.style.display = 'block';
        if (editUrlInput) editUrlInput.value = '';
        if (editHiddenInput) editHiddenInput.value = '';
        showAdminToast('تصویر جدید انتخاب شد.', 'info');
      }
    };
  }

  if (editUrlInput) {
    editUrlInput.oninput = () => {
      const url = editUrlInput.value.trim();
      if (url) {
        selectedEditCampaignFile = null;
        if (editFileInput) editFileInput.value = '';
        if (editHiddenInput) editHiddenInput.value = url;
        if (editPreviewImg) editPreviewImg.src = url;
        if (editPreviewBox) editPreviewBox.style.display = 'block';
      }
    };
  }

  if (btnRemoveEdit) {
    btnRemoveEdit.onclick = (e) => {
      e.preventDefault();
      selectedEditCampaignFile = null;
      if (editHiddenInput) editHiddenInput.value = '';
      if (editFileInput) editFileInput.value = '';
      if (editUrlInput) editUrlInput.value = '';
      if (editPreviewImg) editPreviewImg.src = '';
      if (editPreviewBox) editPreviewBox.style.display = 'none';
      showAdminToast('تصویر حذف شد.', 'info');
    };
  }
}

function initPersianDatePicker() {
  const modal = document.getElementById('modalPersianDatePicker');
  const closeBtn = document.getElementById('btnCloseDatePicker');
  const selectYear = document.getElementById('dpSelectYear');
  const selectMonth = document.getElementById('dpSelectMonth');
  const daysGrid = document.getElementById('dpDaysGrid');
  const btnPrev = document.getElementById('dpBtnPrevMonth');
  const btnNext = document.getElementById('dpBtnNextMonth');

  if (!modal || !daysGrid) return;

  function renderCalendarDays(year, month) {
    daysGrid.innerHTML = '';
    const daysInMonth = month <= 6 ? 31 : (month <= 11 ? 30 : 29);

    let activeY = null, activeM = null, activeD = null;
    if (activeDatepickerInput && activeDatepickerInput.value) {
      const cleanVal = window.CampaignDB.toEnglishDigits(activeDatepickerInput.value).trim();
      const parts = cleanVal.split('/');
      if (parts.length === 3) {
        activeY = parseInt(parts[0], 10);
        activeM = parseInt(parts[1], 10);
        activeD = parseInt(parts[2], 10);
      }
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement('button');
      dayCell.type = 'button';
      dayCell.className = 'datepicker-day-cell';
      dayCell.textContent = window.CampaignDB.toPersianDigits(day);
      
      if (activeY === year && activeM === month && activeD === day) {
        dayCell.classList.add('selected');
      }

      dayCell.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (activeDatepickerInput) {
          const mStr = String(month).padStart(2, '0');
          const dStr = String(day).padStart(2, '0');
          const dateStr = `${year}/${mStr}/${dStr}`;
          activeDatepickerInput.value = window.CampaignDB.toPersianDigits(dateStr);
          activeDatepickerInput.dispatchEvent(new Event('change', { bubbles: true }));
          activeDatepickerInput.dispatchEvent(new Event('input', { bubbles: true }));
          showAdminToast(`تاریخ ${window.CampaignDB.toPersianDigits(dateStr)} انتخاب شد.`, 'info');
        }
        modal.classList.remove('open');
      };
      daysGrid.appendChild(dayCell);
    }
  }

  if (selectYear && selectMonth) {
    selectYear.onchange = () => renderCalendarDays(parseInt(selectYear.value, 10), parseInt(selectMonth.value, 10));
    selectMonth.onchange = () => renderCalendarDays(parseInt(selectMonth.value, 10), parseInt(selectMonth.value, 10));
  }

  if (btnPrev && selectMonth && selectYear) {
    btnPrev.onclick = (e) => {
      e.preventDefault();
      let m = parseInt(selectMonth.value, 10);
      let y = parseInt(selectYear.value, 10);
      if (m > 1) m--;
      else { m = 12; y--; }
      selectMonth.value = String(m);
      selectYear.value = String(y);
      renderCalendarDays(y, m);
    };
  }

  if (btnNext && selectMonth && selectYear) {
    btnNext.onclick = (e) => {
      e.preventDefault();
      let m = parseInt(selectMonth.value, 10);
      let y = parseInt(selectYear.value, 10);
      if (m < 12) m++;
      else { m = 1; y++; }
      selectMonth.value = String(m);
      selectYear.value = String(y);
      renderCalendarDays(y, m);
    };
  }

  document.querySelectorAll('[data-quick-date]').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      if (!activeDatepickerInput) return;
      const q = btn.getAttribute('data-quick-date');
      let y = parseInt(selectYear.value, 10) || 1403;
      let m = parseInt(selectMonth.value, 10) || 9;
      let d = 1;
      if (q === 'today') d = 1;
      else if (q === 'plus10') d = 10;
      else if (q === 'plus20') d = 20;
      else if (q === 'plus30') { m = m < 12 ? m + 1 : 1; d = 1; }
      else if (q === 'plus60') { m = m <= 10 ? m + 2 : (m === 11 ? 1 : 2); d = 1; }
      const mStr = String(m).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${y}/${mStr}/${dStr}`;
      activeDatepickerInput.value = window.CampaignDB.toPersianDigits(dateStr);
      modal.classList.remove('open');
    };
  });

  if (closeBtn) closeBtn.onclick = () => modal.classList.remove('open');

  window.openPersianDatePicker = function(inputElOrId) {
    const input = typeof inputElOrId === 'string' ? document.getElementById(inputElOrId) : inputElOrId;
    if (!input) return;
    activeDatepickerInput = input;
    const curYear = parseInt(selectYear?.value || '1403', 10);
    const curMonth = parseInt(selectMonth?.value || '9', 10);
    renderCalendarDays(curYear, curMonth);
    modal.classList.add('open');
  };
}

function getFilteredPayments() {
  const statusFilter = paymentFilters.status;
  const nameQuery = (paymentFilters.name || '').trim().toLowerCase();
  const trackQuery = window.CampaignDB.toEnglishDigits(paymentFilters.tracking || '').trim().toUpperCase();
  const phoneQuery = window.CampaignDB.toEnglishDigits(paymentFilters.phone || '').trim();

  return allPayments.filter(pay => {
    // 1. فیلتر وضعیت
    if (statusFilter !== 'all') {
      if (statusFilter === 'successful' || statusFilter === 'success') {
        if (pay.status !== 'successful' && pay.status !== 'success') return false;
      } else if (pay.status !== statusFilter) {
        return false;
      }
    }
    // 2. فیلتر بازه مبلغی
    const amount = Number(pay.amount) || 0;
    if (paymentFilters.minAmount !== null && !isNaN(paymentFilters.minAmount)) {
      if (amount < paymentFilters.minAmount) return false;
    }
    if (paymentFilters.maxAmount !== null && !isNaN(paymentFilters.maxAmount)) {
      if (amount > paymentFilters.maxAmount) return false;
    }
    // 3. جستجوی نام
    if (nameQuery) {
      const payer = (pay.payer_name || '').toLowerCase();
      if (!payer.includes(nameQuery)) return false;
    }
    // 4. جستجوی کد پیگیری
    if (trackQuery) {
      const track = window.CampaignDB.toEnglishDigits(pay.tracking_code || '').toUpperCase();
      if (!track.includes(trackQuery)) return false;
    }
    // 5. جستجوی شماره همراه
    if (phoneQuery) {
      const phone = window.CampaignDB.toEnglishDigits(pay.phone || '');
      if (!phone.includes(phoneQuery)) return false;
    }
    return true;
  });
}

function renderPaymentsTable() {
  const tbody = document.getElementById('paymentsTableBody');
  if (!tbody) return;
  const filtered = getFilteredPayments();
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 32px; color: #94a3b8;">تراکنشی با مشخصات فیلترشده یافت نشد.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(pay => {
    const camp = allCampaigns.find(c => String(c.id) === String(pay.campaign_id));
    const dateFormatted = pay.created_at ? new Date(pay.created_at).toLocaleDateString('fa-IR') : '-';
    return `
      <tr>
        <td style="font-weight: 700; color: #047857;">${pay.tracking_code}</td>
        <td style="font-weight: 700;">
          <span>${pay.payer_name || 'ناشناس'}</span>
          ${pay.is_anonymous ? '<span style="font-size: 0.72rem; background: #e0f2fe; color: #0369a1; padding: 2px 7px; border-radius: 6px; margin-right: 6px; font-weight: 600; display: inline-block;">گمنام در سایت</span>' : ''}
        </td>
        <td><span style="direction: ltr; display: inline-block;">${window.CampaignDB.toPersianDigits(pay.phone || '-')}</span></td>
        <td>${camp ? camp.title : 'نامشخص'}</td>
        <td style="font-weight: 800; color: #047857;">${window.CampaignDB.toPersianDigits(pay.shares)}</td>
        <td style="font-weight: 700;">${window.CampaignDB.formatCurrency(pay.amount)}</td>
        <td style="font-size: 0.8rem; color: #64748b;">${window.CampaignDB.toPersianDigits(dateFormatted)}</td>
        <td><span class="badge-status ${pay.status}">${getPaymentStatusPersianLabel(pay.status)}</span></td>
        <td>
          <div class="table-actions-cell">
            ${(pay.status !== 'successful' && pay.status !== 'success') ? `<button type="button" class="btn-row-action btn-action-status" onclick="setPaymentStatus('${pay.id}', 'successful')">تایید دستی</button>` : ''}
            ${pay.status !== 'cancelled' ? `<button type="button" class="btn-row-action" style="color: #d97706;" onclick="setPaymentStatus('${pay.id}', 'cancelled')">لغو</button>` : ''}
            <button type="button" class="btn-row-action btn-action-edit" onclick="openEditPaymentModal('${pay.id}')">ویرایش</button>
            <button type="button" class="btn-row-action btn-action-delete" onclick="confirmDeletePayment('${pay.id}')">حذف</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function exportPaymentsToExcel() {
  const filtered = getFilteredPayments();
  if (filtered.length === 0) {
    showAdminToast('تراکنشی برای خروجی اکسل وجود ندارد.', 'warning');
    return;
  }
  if (typeof window.XLSX === 'undefined') {
    showAdminToast('کتابخانه اکسل بارگذاری نشده است.', 'error');
    return;
  }

  const exportData = filtered.map(p => {
    const camp = allCampaigns.find(c => String(c.id) === String(p.campaign_id));
    const createdDate = p.created_at ? new Date(p.created_at).toLocaleDateString('fa-IR') : '-';
    const verifiedDate = p.verified_at ? new Date(p.verified_at).toLocaleDateString('fa-IR') : ((p.status === 'successful' || p.status === 'success') ? createdDate : '-');
    return {
      'نام واریز کننده': p.payer_name || 'ناشناس',
      'شماره تماس': p.phone || '-',
      'مبلغ (تومان)': Number(p.amount) || 0,
      'تعداد سهم': Number(p.shares) || 1,
      'عنوان پویش': camp ? camp.title : 'نامشخص',
      'وضعیت تراکنش': getPaymentStatusPersianLabel(p.status),
      'کد پیگیری': p.tracking_code || '-',
      'شماره ارجاع بانک': p.transaction_id || p.authority_token || '-',
      'تاریخ تایید': verifiedDate,
      'تاریخ ثبت': createdDate,
      'توضیحات و نیت': p.description || ''
    };
  });

  const worksheet = window.XLSX.utils.json_to_sheet(exportData);
  const workbook = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(workbook, worksheet, 'پرداخت‌ها');
  const fileName = `گزارش_پرداخت‌های_پویش_${new Date().toISOString().slice(0, 10)}.xlsx`;
  window.XLSX.writeFile(workbook, fileName);
  showAdminToast(`فایل اکسل با ${window.CampaignDB.toPersianDigits(filtered.length)} رکورد دریافت شد.`, 'success');
}

window.setPaymentStatus = async function(paymentId, newStatus) {
  await window.CampaignDB.updatePayment(paymentId, { status: newStatus });
  await reloadAdminData();
  await reloadNotifications();
  renderPaymentsTable();
  renderDashboard();
  showAdminToast(`وضعیت تراکنش به ${getPaymentStatusPersianLabel(newStatus)} تغییر یافت.`, 'success');
};

window.confirmDeletePayment = function(paymentId) {
  if (confirm('آیا از حذف این رکورد پرداخت اطمینان دارید؟')) {
    executeDeletePayment(paymentId);
  }
};

async function executeDeletePayment(paymentId) {
  try {
    await window.CampaignDB.deletePayment(paymentId);
    await reloadAdminData();
    await reloadNotifications();
    renderPaymentsTable();
    renderDashboard();
    showAdminToast('پرداخت با موفقیت حذف شد.', 'success');
  } catch (err) {
    showAdminToast('خطا در حذف پرداخت.', 'error');
  }
}

window.openAddPaymentModal = function() {
  editingPaymentId = null;
  const form = document.getElementById('formManualPayment');
  if (form) form.reset();
  const select = document.getElementById('manualPaymentCampaignSelect');
  select.innerHTML = allCampaigns.map(c => `
    <option value="${c.id}" data-price="${c.share_price}">${c.title} (قیمت هر سهم: ${window.CampaignDB.formatCurrency(c.share_price)})</option>
  `).join('');
  document.getElementById('manualPaymentTrackingCode').value = 'TRK-' + Math.floor(100000 + Math.random() * 900000);
  document.getElementById('manualPaymentShares').value = '1';
  updateManualPaymentAmount();
  document.getElementById('modalManualPaymentTitle').textContent = 'ثبت پرداخت دستی / حضوری';
  document.getElementById('modalManualPayment').classList.add('open');
};

function updateManualPaymentAmount() {
  const select = document.getElementById('manualPaymentCampaignSelect');
  const selectedOption = select ? select.options[select.selectedIndex] : null;
  const sharePrice = selectedOption ? Number(selectedOption.getAttribute('data-price')) || 50000 : 50000;
  const shares = parseInt(window.CampaignDB.toEnglishDigits(document.getElementById('manualPaymentShares')?.value), 10) || 1;
  const amtEl = document.getElementById('manualPaymentAmount');
  if (amtEl) amtEl.value = shares * sharePrice;
}

window.openEditPaymentModal = function(paymentId) {
  const pay = allPayments.find(p => String(p.id) === String(paymentId));
  if (!pay) return;
  editingPaymentId = pay.id;

  const select = document.getElementById('manualPaymentCampaignSelect');
  select.innerHTML = allCampaigns.map(c => `
    <option value="${c.id}" data-price="${c.share_price}" ${String(c.id) === String(pay.campaign_id) ? 'selected' : ''}>
      ${c.title}
    </option>
  `).join('');

  document.getElementById('manualPaymentPayerName').value = pay.payer_name || 'ناشناس';
  document.getElementById('manualPaymentPhone').value = pay.phone || '';
  document.getElementById('manualPaymentShares').value = pay.shares;
  document.getElementById('manualPaymentAmount').value = pay.amount;
  document.getElementById('manualPaymentTrackingCode').value = pay.tracking_code;
  document.getElementById('manualPaymentDesc').value = pay.description || '';
  document.getElementById('manualPaymentStatus').value = pay.status;

  document.getElementById('modalManualPaymentTitle').textContent = 'ویرایش تراکنش پرداخت';
  document.getElementById('modalManualPayment').classList.add('open');
};

function renderReports() {
  const tbody = document.getElementById('reportsCampaignsTableBody');
  if (!tbody) return;
  tbody.innerHTML = allCampaigns.map(camp => {
    const stats = window.CampaignDB.calculateCampaignStats(camp, allPayments);
    return `
      <tr>
        <td style="font-weight: 800; color: #0f172a;">${camp.title}</td>
        <td>${window.CampaignDB.formatNumber(stats.total_shares)}</td>
        <td style="color: #047857; font-weight: 700;">${window.CampaignDB.formatNumber(stats.paid_shares)}</td>
        <td style="color: #d97706; font-weight: 700;">${window.CampaignDB.formatNumber(stats.remaining_shares)}</td>
        <td>${window.CampaignDB.formatCurrency(stats.target_amount)}</td>
        <td style="color: #047857; font-weight: 800;">${window.CampaignDB.formatCurrency(stats.collected_amount)}</td>
        <td style="color: #64748b;">${window.CampaignDB.formatCurrency(stats.remaining_amount)}</td>
        <td><strong style="color: #047857;">${window.CampaignDB.toPersianDigits(stats.progress)}٪</strong></td>
        <td>${window.CampaignDB.formatNumber(stats.total_payments_count)}</td>
        <td>${window.CampaignDB.formatNumber(stats.participants_count)} نفر</td>
      </tr>
    `;
  }).join('');

  const successCount = allPayments.filter(p => p.status === 'successful' || p.status === 'success').length;
  const pendingCount = allPayments.filter(p => p.status === 'pending').length;
  const cancelledCount = allPayments.filter(p => p.status === 'cancelled' || p.status === 'failed').length;

  const scEl = document.getElementById('reportCountSuccessful');
  if (scEl) scEl.textContent = window.CampaignDB.formatNumber(successCount);
  const pcEl = document.getElementById('reportCountPending');
  if (pcEl) pcEl.textContent = window.CampaignDB.formatNumber(pendingCount);
  const ccEl = document.getElementById('reportCountCancelled');
  if (ccEl) ccEl.textContent = window.CampaignDB.formatNumber(cancelledCount);
}

async function renderSettings() {
  const apiBase = (window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl) || window.API_BASE_URL || '/api';
  const uploadsBase = (window.APP_CONFIG && window.APP_CONFIG.uploadsBaseUrl) || '/uploads/campaigns';

  const apiEl = document.getElementById('settingsApiUrl');
  if (apiEl) apiEl.value = apiBase;
  const uploadsEl = document.getElementById('settingsUploadsUrl');
  if (uploadsEl) uploadsEl.value = uploadsBase;

  const sqlBlock = document.getElementById('mysqlSqlCodeDisplay') || document.getElementById('supabaseSqlCodeDisplay');
  if (sqlBlock && typeof window.CampaignDB.getMySQLScript === 'function') {
    sqlBlock.textContent = window.CampaignDB.getMySQLScript();
  }

  try {
    const gwSettings = await window.CampaignDB.getPaymentSettings();
    const selGw = document.getElementById('settingActiveGateway');
    const selEnabled = document.getElementById('settingGatewayEnabled');
    const chkSandbox = document.getElementById('settingGatewaySandbox');
    const txtMerchant = document.getElementById('settingGatewayMerchantId');
    const txtApiKey = document.getElementById('settingGatewayApiKey');
    const txtTerminal = document.getElementById('settingGatewayTerminalId');

    if (selGw) selGw.value = gwSettings.active_gateway || 'test_gateway';
    if (selEnabled) selEnabled.value = String(gwSettings.is_active !== false);
    if (chkSandbox) chkSandbox.checked = gwSettings.sandbox !== false;
    if (txtMerchant) txtMerchant.value = gwSettings.merchant_id || '';
    if (txtApiKey) txtApiKey.value = gwSettings.api_key || '';
    if (txtTerminal) txtTerminal.value = gwSettings.terminal_id || '';

    updateGatewayBadge(gwSettings.is_active);
    updateGatewayFieldsDisplay(gwSettings.active_gateway);
  } catch (err) {
    console.error('خطا در بارگذاری تنظیمات درگاه:', err);
  }

  // بارگذاری متن قوانین و مقررات
  try {
    const termsContent = await window.CampaignDB.getTermsContent();
    const txtTerms = document.getElementById('settingTermsContent');
    const previewTerms = document.getElementById('termsPreviewContainer');
    const badgeUnsaved = document.getElementById('termsUnsavedBadge');
    if (txtTerms) {
      txtTerms.value = termsContent || '';
      termsInitialContent = termsContent || '';
      termsIsDirty = false;
    }
    if (previewTerms) {
      previewTerms.innerHTML = termsContent || '<div style="color: #94a3b8; text-align: center;">متنی ثبت نشده است.</div>';
    }
    if (badgeUnsaved) {
      badgeUnsaved.style.display = 'none';
    }
  } catch (err) {
    console.warn('خطا در دریافت قوانین و مقررات:', err);
  }
}

function updateGatewayBadge(isActive) {
  const badge = document.getElementById('gatewayActiveStatusBadge');
  const txt = document.getElementById('gatewayActiveStatusText');
  if (!badge || !txt) return;
  if (isActive) {
    badge.style.background = '#ecfdf5';
    badge.style.color = '#047857';
    badge.querySelector('span:first-child').style.background = '#10b981';
    txt.textContent = 'درگاه فعال است';
  } else {
    badge.style.background = '#fff1f2';
    badge.style.color = '#be123c';
    badge.querySelector('span:first-child').style.background = '#e11d48';
    txt.textContent = 'درگاه غیرفعال است';
  }
}

function updateGatewayFieldsDisplay(gatewayType) {
  const labelMerchant = document.getElementById('labelGatewayMerchantId');
  const groupApiKey = document.getElementById('groupGatewayApiKey');
  const groupTerminal = document.getElementById('groupGatewayTerminalId');

  if (gatewayType === 'zarinpal') {
    if (labelMerchant) labelMerchant.textContent = 'کد مرچنت زرین‌پال (Merchant ID - ۳۶ کاراکتر)';
    if (groupApiKey) groupApiKey.style.display = 'none';
    if (groupTerminal) groupTerminal.style.display = 'none';
  } else if (gatewayType === 'idpay') {
    if (labelMerchant) labelMerchant.textContent = 'کلید API آیدی پی (API Key)';
    if (groupApiKey) groupApiKey.style.display = 'block';
    if (groupTerminal) groupTerminal.style.display = 'none';
  } else if (gatewayType === 'zibal') {
    if (labelMerchant) labelMerchant.textContent = 'کد مرچنت زیبال (Merchant ID)';
    if (groupApiKey) groupApiKey.style.display = 'none';
    if (groupTerminal) groupTerminal.style.display = 'none';
  } else if (gatewayType === 'nextpay') {
    if (labelMerchant) labelMerchant.textContent = 'کلید API نکست پی (API Key)';
    if (groupApiKey) groupApiKey.style.display = 'none';
    if (groupTerminal) groupTerminal.style.display = 'none';
  } else {
    if (labelMerchant) labelMerchant.textContent = 'کد مرچنت آزمایشی';
    if (groupApiKey) groupApiKey.style.display = 'block';
    if (groupTerminal) groupTerminal.style.display = 'none';
  }
}

// ==============================================================================
// ۵. بخش کاربران (Users Management)
// ==============================================================================
async function renderUsersSection() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 32px; color: #64748b;">در حال دریافت اطلاعات کاربران...</td></tr>`;

  try {
    const res = await window.CampaignDB.getUsers(userFilters);
    const users = res.data || [];
    const stats = res.stats || {};

    const statTotal = document.getElementById('usersStatTotal');
    const statActive = document.getElementById('usersStatActive');
    const statAnonymous = document.getElementById('usersStatAnonymous');
    const statTotalAmount = document.getElementById('usersStatTotalAmount');

    if (statTotal) statTotal.textContent = window.CampaignDB.toPersianDigits(stats.total_users || 0);
    if (statActive) statActive.textContent = window.CampaignDB.toPersianDigits(stats.active_participants || 0);
    if (statAnonymous) statAnonymous.textContent = window.CampaignDB.toPersianDigits(stats.anonymous_users || 0);
    if (statTotalAmount) statTotalAmount.textContent = window.CampaignDB.formatCurrency(stats.total_paid_amount || 0);

    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 36px; color: #94a3b8;">کاربری با مشخصات جستجو شده یافت نشد.</td></tr>`;
      renderUsersPagination(0, 1, userFilters.limit || 10);
      return;
    }

    const startIndex = ((res.page || 1) - 1) * (res.limit || 10);

    tbody.innerHTML = users.map((u, idx) => {
      const rowNum = window.CampaignDB.toPersianDigits(startIndex + idx + 1);
      const regDate = u.created_at ? window.CampaignDB.toPersianDigits(new Date(u.created_at).toLocaleDateString('fa-IR')) : '-';
      const totalAmt = window.CampaignDB.formatCurrency(u.total_amount || 0);

      let anonBadge = u.is_anonymous ? '<span class="badge-status anonymous">گمنام</span>' : '<span class="badge-status public_name">با نام</span>';

      return `
        <tr>
          <td style="font-weight: 700; color: #64748b;">${rowNum}</td>
          <td style="font-weight: 800; color: #0f172a;">
            <div>${u.name || 'بی‌نام'}</div>
            ${u.is_anonymous ? '<span class="badge-anon-pill">درخواست گمنامی</span>' : ''}
          </td>
          <td>
            <span style="direction: ltr; display: inline-block; font-family: inherit;">${window.CampaignDB.toPersianDigits(u.phone || '-')}</span>
          </td>
          <td style="font-size: 0.84rem; color: #64748b;">${regDate}</td>
          <td>
            <span class="badge-status successful">موفق</span>
          </td>
          <td>${anonBadge}</td>
          <td style="font-weight: 800; color: #047857;">${totalAmt}</td>
          <td>
            <div class="table-actions-cell">
              <button type="button" class="btn-row-action" style="color: #0284c7;" onclick="openUserDetailsModal('${u.id}')" title="مشاهده جزئیات">
                مشاهده جزئیات
              </button>
              <button type="button" class="btn-row-action btn-action-delete" onclick="confirmDeleteUser('${u.id}', '${(u.name || '').replace(/'/g, "\\'")}')" title="حذف کاربر">
                حذف
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    renderUsersPagination(res.total || 0, res.page || 1, res.limit || 10);
  } catch (err) {
    console.error('خطا در بارگذاری کاربران:', err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: #dc2626;">خطا در دریافت لیست کاربران: ${err.message}</td></tr>`;
  }
}

function renderUsersPagination(total, currentPage, limit) {
  const infoEl = document.getElementById('usersPaginationInfo');
  const controlsEl = document.getElementById('usersPaginationControls');
  if (!infoEl || !controlsEl) return;

  const totalPages = Math.ceil(total / limit) || 1;
  const start = total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const end = Math.min(currentPage * limit, total);

  infoEl.textContent = `نمایش ${window.CampaignDB.toPersianDigits(start)} تا ${window.CampaignDB.toPersianDigits(end)} از مجموع ${window.CampaignDB.toPersianDigits(total)} کاربر`;

  let html = '';
  html += `
    <button type="button" class="btn-page-nav" ${currentPage <= 1 ? 'disabled' : ''} onclick="goToUsersPage(${currentPage - 1})">
      صفحه قبلی
    </button>
    <span class="page-indicator-pill">صفحه ${window.CampaignDB.toPersianDigits(currentPage)} از ${window.CampaignDB.toPersianDigits(totalPages)}</span>
    <button type="button" class="btn-page-nav" ${currentPage >= totalPages ? 'disabled' : ''} onclick="goToUsersPage(${currentPage + 1})">
      صفحه بعدی
    </button>
  `;
  controlsEl.innerHTML = html;
}

window.goToUsersPage = function(page) {
  userFilters.page = page;
  renderUsersSection();
};

async function exportUsersToExcel() {
  const exportBtn = document.getElementById('btnExportUsersExcel');
  const origHtml = exportBtn ? exportBtn.innerHTML : '';
  if (exportBtn) {
    exportBtn.disabled = true;
    exportBtn.innerHTML = '<span>در حال ایجاد فایل...</span>';
  }

  try {
    const exportParams = {
      ...userFilters,
      page: 1,
      limit: 10000
    };
    const res = await window.CampaignDB.getUsers(exportParams);
    const users = res.data || [];

    if (users.length === 0) {
      showAdminToast('کاربری برای خروجی اکسل یافت نشد.', 'warning');
      return;
    }

    // الزامات مهم: فایل اکسل خروجی باید فقط و فقط شامل این ۳ ستون باشد:
    // 1. نام و نام خانوادگی
    // 2. تاریخ عضویت
    // 3. شماره تلفن همراه
    const exportRows = users.map(u => ({
      'نام و نام خانوادگی': u.name || 'بی‌نام',
      'تاریخ عضویت': u.created_at ? new Date(u.created_at).toLocaleDateString('fa-IR') : '-',
      'شماره تلفن همراه': u.phone || '-'
    }));

    if (typeof window.XLSX !== 'undefined') {
      const ws = window.XLSX.utils.json_to_sheet(exportRows);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'کاربران');
      const fileName = `لیست_کاربران_پویش_${new Date().toISOString().slice(0, 10)}.xlsx`;
      window.XLSX.writeFile(wb, fileName);
      showAdminToast(`فایل اکسل با ${window.CampaignDB.toPersianDigits(users.length)} کاربر دریافت شد.`, 'success');
    } else {
      const query = new URLSearchParams();
      query.set('action', 'export');
      if (userFilters.search) query.set('search', userFilters.search);
      if (userFilters.status) query.set('status', userFilters.status);
      if (userFilters.from_date) query.set('from_date', userFilters.from_date);
      if (userFilters.to_date) query.set('to_date', userFilters.to_date);
      window.location.href = `/api/users?${query.toString()}`;
      showAdminToast('در حال دانلود فایل اکسل...', 'info');
    }
  } catch (err) {
    console.error('خطا در خروجی اکسل کاربران:', err);
    showAdminToast('خطا در ایجاد فایل اکسل: ' + err.message, 'error');
  } finally {
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.innerHTML = origHtml;
    }
  }
}

window.openUserDetailsModal = async function(userId) {
  const modal = document.getElementById('modalUserDetails');
  const bodyEl = document.getElementById('modalUserDetailsBody');
  const actionBtns = document.getElementById('modalUserActionButtons');
  if (!modal || !bodyEl) return;

  bodyEl.innerHTML = '<div style="text-align: center; padding: 32px; color: #64748b;">در حال دریافت اطلاعات کاربر...</div>';
  if (actionBtns) actionBtns.innerHTML = '';
  modal.classList.add('open');

  try {
    const user = await window.CampaignDB.getUserById(userId);
    const regDate = user.created_at ? window.CampaignDB.toPersianDigits(new Date(user.created_at).toLocaleString('fa-IR')) : '-';

    let statusLabel = 'در انتظار تأیید';
    if (user.status === 'approved') statusLabel = 'تأیید شده';
    else if (user.status === 'rejected') statusLabel = 'رد شده';

    const paymentsList = user.payments || [];
    let paymentsTableHtml = '';
    if (paymentsList.length > 0) {
      paymentsTableHtml = `
        <div style="margin-top: 20px;">
          <h4 style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin-bottom: 10px;">سوابق تراکنش‌های کاربر (${window.CampaignDB.toPersianDigits(paymentsList.length)} پرداخت)</h4>
          <div class="table-responsive" style="max-height: 240px; overflow-y: auto;">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>کد پیگیری</th>
                  <th>مبلغ (تومان)</th>
                  <th>تعداد سهم</th>
                  <th>وضعیت</th>
                  <th>تاریخ</th>
                  <th>شماره تراکنش</th>
                </tr>
              </thead>
              <tbody>
                ${paymentsList.map(p => `
                  <tr>
                    <td style="font-weight: 700; color: #047857;">${p.tracking_code || '-'}</td>
                    <td style="font-weight: 700;">${window.CampaignDB.formatCurrency(p.amount || 0)}</td>
                    <td>${window.CampaignDB.toPersianDigits(p.shares || 1)}</td>
                    <td><span class="badge-status ${p.status}">${getPaymentStatusPersianLabel(p.status)}</span></td>
                    <td style="font-size: 0.8rem;">${p.created_at ? window.CampaignDB.toPersianDigits(new Date(p.created_at).toLocaleDateString('fa-IR')) : '-'}</td>
                    <td style="direction: ltr; font-size: 0.8rem;">${p.transaction_id || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else {
      paymentsTableHtml = '<div style="margin-top: 14px; font-size: 0.85rem; color: #94a3b8;">سوابق تراکنشی برای این کاربر ثبت نشده است.</div>';
    }

    bodyEl.innerHTML = `
      <div class="user-profile-grid">
        <div class="user-profile-unit">
          <div class="label">نام و نام خانوادگی</div>
          <div class="val">${user.name || 'بی‌نام'}</div>
        </div>
        <div class="user-profile-unit">
          <div class="label">شماره تلفن همراه</div>
          <div class="val" style="direction: ltr; text-align: right;">${window.CampaignDB.toPersianDigits(user.phone || '-')}</div>
        </div>
        <div class="user-profile-unit">
          <div class="label">تاریخ عضویت و پرداخت</div>
          <div class="val" style="font-size: 0.85rem;">${regDate}</div>
        </div>
        <div class="user-profile-unit">
          <div class="label">وضعیت پرداخت</div>
          <div class="val" style="color: #047857;">پرداخت موفق و احراز شده</div>
        </div>
        <div class="user-profile-unit">
          <div class="label">نوع مشارکت (گمنامی)</div>
          <div class="val">${user.is_anonymous ? 'گمنام در سایت عمومی' : 'نمایش با نام واقعی'}</div>
        </div>
        <div class="user-profile-unit">
          <div class="label">مجموع مبلغ پرداختی</div>
          <div class="val" style="color: #0891b2;">${window.CampaignDB.formatCurrency(user.total_amount || 0)}</div>
        </div>
        <div class="user-profile-unit">
          <div class="label">تعداد مشارکت‌ها</div>
          <div class="val">${window.CampaignDB.toPersianDigits(user.payments_count || 1)} تراکنش</div>
        </div>
      </div>
      ${paymentsTableHtml}
    `;

    if (actionBtns) {
      actionBtns.innerHTML = `
        <button type="button" class="btn-quick-action btn-action-delete" onclick="confirmDeleteUser('${user.id}', '${(user.name || '').replace(/'/g, "\\'")}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          <span>حذف کاربر</span>
        </button>
      `;
    }
  } catch (err) {
    bodyEl.innerHTML = `<div style="color: #dc2626; padding: 20px;">خطا در دریافت مشخصات کاربر: ${err.message}</div>`;
  }
};

window.confirmDeleteUser = function(userId, userName) {
  if (confirm(`آیا از حذف کاربر «${userName || ''}» اطمینان کامل دارید؟ این عمل غیرقابل بازگشت است.`)) {
    executeDeleteUser(userId);
  }
};

async function executeDeleteUser(userId) {
  try {
    const res = await window.CampaignDB.deleteUser(userId);
    showAdminToast(res.message || 'کاربر با موفقیت حذف گردید.', 'success');
    await reloadAdminData();
    await reloadNotifications();
    renderUsersSection();
    const modal = document.getElementById('modalUserDetails');
    if (modal) modal.classList.remove('open');
  } catch (err) {
    showAdminToast(err.message || 'خطا در حذف کاربر', 'error');
  }
}

// ==============================================================================
// ۶. مدیریت لاگ‌ها و رویدادهای سیستم (Audit Logs Management)
// ==============================================================================
async function renderLogsSection() {
  const tbody = document.getElementById('logsTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 32px; color: #64748b;">در حال دریافت لاگ‌های سیستم...</td></tr>`;

  try {
    const res = await window.CampaignDB.getLogs(logFilters);
    const logs = res.data || [];

    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 36px; color: #94a3b8;">هیچ رخدادی با مشخصات فیلتر شده ثبت نشده است.</td></tr>`;
      renderLogsPagination(0, 1, logFilters.limit || 15);
      return;
    }

    const startIndex = ((res.page || 1) - 1) * (res.limit || 15);

    tbody.innerHTML = logs.map((l, idx) => {
      const rowNum = window.CampaignDB.toPersianDigits(startIndex + idx + 1);
      const timeStr = l.created_at ? window.CampaignDB.toPersianDigits(new Date(l.created_at).toLocaleString('fa-IR')) : '-';

      let actionClass = 'badge-log-action settings';
      if (l.action_type.includes('پرداخت')) actionClass = 'badge-log-action payment';
      else if (l.action_type.includes('کاربر')) actionClass = 'badge-log-action user';
      else if (l.action_type.includes('پویش')) actionClass = 'badge-log-action campaign';
      else if (l.action_type.includes('ورود')) actionClass = 'badge-log-action auth';
      else if (l.action_type.includes('قوانین')) actionClass = 'badge-log-action terms';
      else if (l.action_type.includes('لغو')) actionClass = 'badge-log-action undo';

      const statusBadge = (l.status === 'ناموفق' || l.status === 'failed') ?
        '<span class="badge-log-status failed">ناموفق</span>' :
        '<span class="badge-log-status success">موفق</span>';

      return `
        <tr>
          <td style="font-weight: 700; color: #64748b;">${rowNum}</td>
          <td style="font-size: 0.82rem; color: #475569; white-space: nowrap;">${timeStr}</td>
          <td><span class="${actionClass}">${l.action_type}</span></td>
          <td style="font-weight: 600; color: #0f172a;">${l.actor || 'سیستم'}</td>
          <td style="color: #0284c7; font-weight: 700;">${l.target || '-'}</td>
          <td style="font-size: 0.85rem; color: #334155; line-height: 1.6;">${l.description || '-'}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');

    renderLogsPagination(res.total || 0, res.page || 1, res.limit || 15);
  } catch (err) {
    console.error('خطا در بارگذاری لاگ‌ها:', err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: #dc2626;">خطا در دریافت لاگ‌ها: ${err.message}</td></tr>`;
  }
}

function renderLogsPagination(total, currentPage, limit) {
  const infoEl = document.getElementById('logsPaginationInfo');
  const controlsEl = document.getElementById('logsPaginationControls');
  if (!infoEl || !controlsEl) return;

  const totalPages = Math.ceil(total / limit) || 1;
  const start = total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const end = Math.min(currentPage * limit, total);

  infoEl.textContent = `نمایش ${window.CampaignDB.toPersianDigits(start)} تا ${window.CampaignDB.toPersianDigits(end)} از مجموع ${window.CampaignDB.toPersianDigits(total)} رویداد`;

  let html = '';
  html += `
    <button type="button" class="btn-page-nav" ${currentPage <= 1 ? 'disabled' : ''} onclick="goToLogsPage(${currentPage - 1})">
      صفحه قبلی
    </button>
    <span class="page-indicator-pill">صفحه ${window.CampaignDB.toPersianDigits(currentPage)} از ${window.CampaignDB.toPersianDigits(totalPages)}</span>
    <button type="button" class="btn-page-nav" ${currentPage >= totalPages ? 'disabled' : ''} onclick="goToLogsPage(${currentPage + 1})">
      صفحه بعدی
    </button>
  `;
  controlsEl.innerHTML = html;
}

window.goToLogsPage = function(page) {
  logFilters.page = page;
  renderLogsSection();
};

// ==============================================================================
// ۷. ویرایشگر قوانین و مقررات پویش (Terms & Regulations Editor)
// ==============================================================================
function setupTermsEditorEvents() {
  const txtTerms = document.getElementById('settingTermsContent');
  const previewTerms = document.getElementById('termsPreviewContainer');
  const editorContainer = document.getElementById('termsEditorContainer');
  const toolbar = document.getElementById('termsToolbar');
  const badgeUnsaved = document.getElementById('termsUnsavedBadge');
  const btnTabEditor = document.getElementById('btnTabTermsEditor');
  const btnTabPreview = document.getElementById('btnTabTermsPreview');
  const btnSaveTerms = document.getElementById('btnSaveTermsContent');
  const btnCancelTerms = document.getElementById('btnCancelTermsContent');
  const btnResetTemplate = document.getElementById('btnTermsResetTemplate');

  if (txtTerms) {
    txtTerms.addEventListener('input', () => {
      termsIsDirty = (txtTerms.value !== termsInitialContent);
      if (badgeUnsaved) badgeUnsaved.style.display = termsIsDirty ? 'inline-block' : 'none';
      if (previewTerms) previewTerms.innerHTML = txtTerms.value || '<div style="color: #94a3b8; text-align: center;">متنی وارد نشده است.</div>';
    });
  }

  if (btnTabEditor && btnTabPreview && editorContainer && previewTerms && toolbar) {
    btnTabEditor.onclick = () => {
      btnTabEditor.classList.add('primary');
      btnTabEditor.style.background = '';
      btnTabEditor.style.color = '';
      btnTabPreview.classList.remove('primary');
      btnTabPreview.style.background = '#f1f5f9';
      btnTabPreview.style.color = '#475569';
      editorContainer.style.display = 'block';
      toolbar.style.display = 'flex';
      previewTerms.style.display = 'none';
    };

    btnTabPreview.onclick = () => {
      btnTabPreview.classList.add('primary');
      btnTabPreview.style.background = '';
      btnTabPreview.style.color = '';
      btnTabEditor.classList.remove('primary');
      btnTabEditor.style.background = '#f1f5f9';
      btnTabEditor.style.color = '#475569';
      editorContainer.style.display = 'none';
      toolbar.style.display = 'none';
      previewTerms.style.display = 'block';
      previewTerms.innerHTML = txtTerms?.value || '<div style="color: #94a3b8; text-align: center;">متنی وارد نشده است.</div>';
    };
  }

  document.querySelectorAll('.btn-terms-tool[data-tool]').forEach(btn => {
    btn.onclick = () => {
      if (!txtTerms) return;
      const tool = btn.getAttribute('data-tool');
      insertTextAtCursor(txtTerms, tool);
      txtTerms.dispatchEvent(new Event('input'));
    };
  });

  if (btnResetTemplate) {
    btnResetTemplate.onclick = () => {
      if (confirm('آیا مایل به بازنشانی متن قوانین به قالب استاندارد پیش‌فرض هستید؟')) {
        const standardTemplate = `<h4>مقدمه و اهداف پویش</h4>
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
        if (txtTerms) {
          txtTerms.value = standardTemplate;
          txtTerms.dispatchEvent(new Event('input'));
        }
      }
    };
  }

  if (btnSaveTerms) {
    btnSaveTerms.onclick = async () => {
      const content = (txtTerms?.value || '').trim();
      if (!content) {
        showAdminToast('متن قوانین و مقررات نمی‌تواند خالی باشد.', 'error');
        txtTerms?.focus();
        return;
      }

      btnSaveTerms.disabled = true;
      const origHtml = btnSaveTerms.innerHTML;
      btnSaveTerms.innerHTML = '<span>در حال ذخیره...</span>';

      try {
        await window.CampaignDB.saveTermsContent(content);
        termsInitialContent = content;
        termsIsDirty = false;
        if (badgeUnsaved) badgeUnsaved.style.display = 'none';
        showAdminToast('قوانین و مقررات با موفقیت ذخیره و در سایت عمومی اعمال گردید.', 'success');
        await reloadNotifications();
      } catch (err) {
        console.error('خطا در ذخیره قوانین:', err);
        showAdminToast(err.message || 'خطا در ذخیره قوانین و مقررات', 'error');
      } finally {
        btnSaveTerms.disabled = false;
        btnSaveTerms.innerHTML = origHtml;
      }
    };
  }

  if (btnCancelTerms) {
    btnCancelTerms.onclick = () => {
      if (txtTerms) {
        txtTerms.value = termsInitialContent;
        termsIsDirty = false;
        if (badgeUnsaved) badgeUnsaved.style.display = 'none';
        if (previewTerms) previewTerms.innerHTML = termsInitialContent;
        showAdminToast('تغییرات ذخیره‌نشده لغو شد.', 'info');
      }
    };
  }
}

function insertTextAtCursor(textarea, tool) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.substring(start, end);

  let snippet = '';
  switch (tool) {
    case 'h4':
      snippet = `<h4>${selected || 'سرتیتر جدید'}</h4>\n`;
      break;
    case 'bold':
      snippet = `<strong>${selected || 'متن برجسته'}</strong>`;
      break;
    case 'list':
      snippet = `<ul>\n  <li>${selected || 'مورد اول'}</li>\n  <li>مورد دوم</li>\n</ul>\n`;
      break;
    case 'p':
      snippet = `<p>${selected || 'متن پاراگراف جدید...'}</p>\n`;
      break;
    case 'notice':
      snippet = `<div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 14px 16px; margin-top: 14px; font-size: 0.85rem; color: #64748b;">\n  <div style="font-weight: 700; color: #334155;">راهنما و پشتیبانی</div>\n  <div>${selected || 'توضیحات راهنما یا پاسخگویی...'}</div>\n</div>\n`;
      break;
  }

  textarea.value = text.substring(0, start) + snippet + text.substring(end);
  textarea.focus();
  textarea.setSelectionRange(start + snippet.length, start + snippet.length);
}

function setupAdminEvents() {
  document.querySelectorAll('[data-quick-action]').forEach(btn => {
    btn.onclick = () => {
      const action = btn.getAttribute('data-quick-action');
      if (action === 'add-campaign') {
        navigateToSection('add-campaign');
      } else if (action === 'add-payment') {
        openAddPaymentModal();
      } else if (action === 'campaigns') {
        navigateToSection('campaigns');
      } else if (action === 'reports') {
        navigateToSection('reports');
      }
    };
  });

  const addSharesInput = document.getElementById('addCampTotalShares');
  const addPriceInput = document.getElementById('addCampSharePrice');
  if (addSharesInput && addPriceInput) {
    addSharesInput.oninput = updateAddCampaignCalculation;
    addPriceInput.oninput = updateAddCampaignCalculation;
  }

  const editSharesInput = document.getElementById('editCampTotalShares');
  const editPriceInput = document.getElementById('editCampSharePrice');
  if (editSharesInput && editPriceInput) {
    editSharesInput.oninput = () => {
      const s = parseInt(window.CampaignDB.toEnglishDigits(editSharesInput.value), 10) || 0;
      const p = parseInt(window.CampaignDB.toEnglishDigits(editPriceInput.value), 10) || 0;
      document.getElementById('editCampTargetAmountDisplay').textContent = window.CampaignDB.formatCurrency(s * p);
    };
    editPriceInput.oninput = () => {
      const s = parseInt(window.CampaignDB.toEnglishDigits(editSharesInput.value), 10) || 0;
      const p = parseInt(window.CampaignDB.toEnglishDigits(editPriceInput.value), 10) || 0;
      document.getElementById('editCampTargetAmountDisplay').textContent = window.CampaignDB.formatCurrency(s * p);
    };
  }

  const formAddCamp = document.getElementById('formAddCampaign');
  if (formAddCamp) {
    formAddCamp.onsubmit = async (e) => {
      e.preventDefault();
      const title = document.getElementById('addCampTitle').value.trim();
      const description = document.getElementById('addCampDesc').value.trim();
      const totalShares = parseInt(window.CampaignDB.toEnglishDigits(document.getElementById('addCampTotalShares').value), 10) || 100;
      const sharePrice = parseInt(window.CampaignDB.toEnglishDigits(document.getElementById('addCampSharePrice').value), 10) || 50000;
      const startDate = document.getElementById('addCampStartDate').value.trim();
      const endDate = document.getElementById('addCampEndDate').value.trim();
      const status = document.getElementById('addCampStatus').value || 'active';

      const eventLocation = document.getElementById('addCampEventLocation')?.value.trim() || '';
      const eventDate = document.getElementById('addCampEventDate')?.value.trim() || '';
      const eventTime = document.getElementById('addCampEventTime')?.value.trim() || '';
      const channelLink = document.getElementById('addCampChannelLink')?.value.trim() || '';
      const socialLink = document.getElementById('addCampSocialLink')?.value.trim() || '';
      const contactPhone = document.getElementById('addCampContactPhone')?.value.trim() || '';
      const additionalNotes = document.getElementById('addCampAdditionalNotes')?.value.trim() || '';

      const submitBtn = document.getElementById('btnSaveCampaign');
      const originalText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>در حال ذخیره...</span>';
      }

      try {
        let imageUrl = document.getElementById('addCampImageUrlInput')?.value.trim() || document.getElementById('addCampImage')?.value.trim() || '';
        if (selectedAddCampaignFile) {
          if (submitBtn) submitBtn.innerHTML = '<span>در حال آپلود تصویر...</span>';
          imageUrl = await window.CampaignDB.uploadCampaignImage(selectedAddCampaignFile);
          showAdminToast('تصویر بنر آپلود شد.', 'info');
        }

        if (submitBtn) submitBtn.innerHTML = '<span>در حال ثبت در دیتابیس...</span>';
        await window.CampaignDB.createCampaign({
          title,
          description,
          image_url: imageUrl,
          total_shares: totalShares,
          share_price: sharePrice,
          start_date: startDate,
          end_date: endDate,
          status,
          event_location: eventLocation,
          event_date: eventDate,
          event_time: eventTime,
          channel_link: channelLink,
          social_link: socialLink,
          contact_phone: contactPhone,
          additional_notes: additionalNotes
        });

        await reloadAdminData();
        await reloadNotifications();
        showAdminToast('پویش جدید با موفقیت ایجاد و منتشر گردید.', 'success');
        resetAddCampaignForm();
        navigateToSection('campaigns');
      } catch (err) {
        console.error('خطای ثبت پویش:', err);
        showAdminToast(`خطا: ${err.message}`, 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText || 'ذخیره و انتشار پویش';
        }
      }
    };
  }

  const formEditCamp = document.getElementById('formEditCampaign');
  if (formEditCamp) {
    formEditCamp.onsubmit = async (e) => {
      e.preventDefault();
      const title = document.getElementById('editCampTitle').value.trim();
      const description = document.getElementById('editCampDesc').value.trim();
      const totalShares = parseInt(window.CampaignDB.toEnglishDigits(document.getElementById('editCampTotalShares').value), 10) || 100;
      const sharePrice = parseInt(window.CampaignDB.toEnglishDigits(document.getElementById('editCampSharePrice').value), 10) || 50000;
      const startDate = document.getElementById('editCampStartDate').value.trim();
      const endDate = document.getElementById('editCampEndDate').value.trim();
      const status = document.getElementById('editCampStatus').value;

      const eventLocation = document.getElementById('editCampEventLocation')?.value.trim() || '';
      const eventDate = document.getElementById('editCampEventDate')?.value.trim() || '';
      const eventTime = document.getElementById('editCampEventTime')?.value.trim() || '';
      const channelLink = document.getElementById('editCampChannelLink')?.value.trim() || '';
      const socialLink = document.getElementById('editCampSocialLink')?.value.trim() || '';
      const contactPhone = document.getElementById('editCampContactPhone')?.value.trim() || '';
      const additionalNotes = document.getElementById('editCampAdditionalNotes')?.value.trim() || '';

      const submitBtn = document.getElementById('btnSaveEditCampaign');
      const originalText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) submitBtn.disabled = true;

      try {
        let imageUrl = document.getElementById('editCampImageUrlInput')?.value.trim() || document.getElementById('editCampImage')?.value.trim() || '';
        if (selectedEditCampaignFile) {
          imageUrl = await window.CampaignDB.uploadCampaignImage(selectedEditCampaignFile);
          showAdminToast('تصویر جدید آپلود گردید.', 'info');
        }

        await window.CampaignDB.updateCampaign(editingCampaignId, {
          title,
          description,
          image_url: imageUrl,
          total_shares: totalShares,
          share_price: sharePrice,
          start_date: startDate,
          end_date: endDate,
          status,
          event_location: eventLocation,
          event_date: eventDate,
          event_time: eventTime,
          channel_link: channelLink,
          social_link: socialLink,
          contact_phone: contactPhone,
          additional_notes: additionalNotes
        });

        await reloadAdminData();
        await reloadNotifications();
        document.getElementById('modalEditCampaign').classList.remove('open');
        showAdminToast('تغییرات پویش با موفقیت ذخیره شد.', 'success');
        selectedEditCampaignFile = null;
        renderCampaignsTable();
        renderDashboard();
      } catch (err) {
        showAdminToast(`خطا: ${err.message}`, 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText || 'ذخیره تغییرات پویش';
        }
      }
    };
  }

  const formManualPay = document.getElementById('formManualPayment');
  if (formManualPay) {
    const sharesInp = document.getElementById('manualPaymentShares');
    const campSel = document.getElementById('manualPaymentCampaignSelect');
    if (sharesInp) sharesInp.oninput = updateManualPaymentAmount;
    if (campSel) campSel.onchange = updateManualPaymentAmount;

    formManualPay.onsubmit = async (e) => {
      e.preventDefault();
      const campaignId = document.getElementById('manualPaymentCampaignSelect').value;
      const payerName = (document.getElementById('manualPaymentPayerName').value || 'ناشناس').trim();
      const phone = document.getElementById('manualPaymentPhone').value.trim();
      const shares = parseInt(window.CampaignDB.toEnglishDigits(document.getElementById('manualPaymentShares').value), 10) || 1;
      const amount = parseInt(window.CampaignDB.toEnglishDigits(document.getElementById('manualPaymentAmount').value), 10) || 0;
      const trackingCode = document.getElementById('manualPaymentTrackingCode').value.trim();
      const description = document.getElementById('manualPaymentDesc').value.trim();
      const status = document.getElementById('manualPaymentStatus').value;

      try {
        if (editingPaymentId) {
          await window.CampaignDB.updatePayment(editingPaymentId, {
            campaign_id: campaignId,
            payer_name: payerName,
            phone,
            shares,
            amount,
            tracking_code: trackingCode,
            description,
            status
          });
          showAdminToast('تراکنش پرداخت بروزرسانی شد.', 'success');
        } else {
          await window.CampaignDB.createPayment({
            campaign_id: campaignId,
            payer_name: payerName,
            phone,
            shares,
            amount,
            tracking_code: trackingCode,
            description,
            status
          });
          showAdminToast('پرداخت جدید ثبت شد.', 'success');
        }

        await reloadAdminData();
        await reloadNotifications();
        document.getElementById('modalManualPayment').classList.remove('open');
        renderPaymentsTable();
        renderDashboard();
      } catch (err) {
        showAdminToast('خطا در ثبت پرداخت.', 'error');
      }
    };
  }

  const statusFilterEl = document.getElementById('paymentFilterStatus');
  const minAmountEl = document.getElementById('paymentFilterMinAmount');
  const maxAmountEl = document.getElementById('paymentFilterMaxAmount');
  const nameFilterEl = document.getElementById('paymentFilterName');
  const trackFilterEl = document.getElementById('paymentFilterTracking');
  const phoneFilterEl = document.getElementById('paymentFilterPhone');
  const btnResetFilters = document.getElementById('btnResetPaymentFilters');
  const btnExportExcel = document.getElementById('btnExportPaymentsExcel');

  if (statusFilterEl) {
    statusFilterEl.onchange = (e) => {
      paymentFilters.status = e.target.value;
      renderPaymentsTable();
    };
  }

  if (minAmountEl) {
    minAmountEl.oninput = (e) => {
      const raw = window.CampaignDB.toEnglishDigits(e.target.value).trim();
      paymentFilters.minAmount = (raw !== '' && !isNaN(Number(raw))) ? Number(raw) : null;
      renderPaymentsTable();
    };
  }

  if (maxAmountEl) {
    maxAmountEl.oninput = (e) => {
      const raw = window.CampaignDB.toEnglishDigits(e.target.value).trim();
      paymentFilters.maxAmount = (raw !== '' && !isNaN(Number(raw))) ? Number(raw) : null;
      renderPaymentsTable();
    };
  }

  document.querySelectorAll('[data-amount-range]').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const range = btn.getAttribute('data-amount-range');
      if (range === 'all') {
        paymentFilters.minAmount = null;
        paymentFilters.maxAmount = null;
        if (minAmountEl) minAmountEl.value = '';
        if (maxAmountEl) maxAmountEl.value = '';
      } else if (range === '10k-200k') {
        paymentFilters.minAmount = 10000;
        paymentFilters.maxAmount = 200000;
        if (minAmountEl) minAmountEl.value = '10000';
        if (maxAmountEl) maxAmountEl.value = '200000';
      } else if (range === '200k-500k') {
        paymentFilters.minAmount = 200000;
        paymentFilters.maxAmount = 500000;
        if (minAmountEl) minAmountEl.value = '200000';
        if (maxAmountEl) maxAmountEl.value = '500000';
      } else if (range === '500k-plus') {
        paymentFilters.minAmount = 500000;
        paymentFilters.maxAmount = null;
        if (minAmountEl) minAmountEl.value = '500000';
        if (maxAmountEl) maxAmountEl.value = '';
      }
      renderPaymentsTable();
      showAdminToast('بازه مبلغی اعمال شد.', 'info');
    };
  });

  if (nameFilterEl) {
    nameFilterEl.oninput = (e) => {
      paymentFilters.name = e.target.value;
      renderPaymentsTable();
    };
  }
  if (trackFilterEl) {
    trackFilterEl.oninput = (e) => {
      paymentFilters.tracking = e.target.value;
      renderPaymentsTable();
    };
  }
  if (phoneFilterEl) {
    phoneFilterEl.oninput = (e) => {
      paymentFilters.phone = e.target.value;
      renderPaymentsTable();
    };
  }
  if (btnResetFilters) {
    btnResetFilters.onclick = () => {
      paymentFilters = { status: 'all', minAmount: null, maxAmount: null, name: '', tracking: '', phone: '' };
      if (statusFilterEl) statusFilterEl.value = 'all';
      if (minAmountEl) minAmountEl.value = '';
      if (maxAmountEl) maxAmountEl.value = '';
      if (nameFilterEl) nameFilterEl.value = '';
      if (trackFilterEl) trackFilterEl.value = '';
      if (phoneFilterEl) phoneFilterEl.value = '';
      renderPaymentsTable();
      showAdminToast('فیلترها ریست شدند.', 'info');
    };
  }
  if (btnExportExcel) {
    btnExportExcel.onclick = exportPaymentsToExcel;
  }

  const formGatewaySettings = document.getElementById('formPaymentGatewaySettings');
  const selectGateway = document.getElementById('settingActiveGateway');
  if (selectGateway) {
    selectGateway.onchange = (e) => {
      updateGatewayFieldsDisplay(e.target.value);
    };
  }
  if (formGatewaySettings) {
    formGatewaySettings.onsubmit = async (e) => {
      e.preventDefault();
      const active_gateway = document.getElementById('settingActiveGateway').value;
      const is_active = document.getElementById('settingGatewayEnabled').value === 'true';
      const sandbox = document.getElementById('settingGatewaySandbox').checked;
      const merchant_id = document.getElementById('settingGatewayMerchantId').value.trim();
      const api_key = document.getElementById('settingGatewayApiKey').value.trim();
      const terminal_id = document.getElementById('settingGatewayTerminalId').value.trim();

      const saveBtn = document.getElementById('btnSaveGatewaySettings');
      const origText = saveBtn ? saveBtn.innerHTML : '';
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span>در حال ذخیره...</span>';
      }

      try {
        await window.CampaignDB.savePaymentSettings({
          active_gateway,
          is_active,
          sandbox,
          merchant_id,
          api_key,
          terminal_id
        });
        updateGatewayBadge(is_active);
        showAdminToast('تنظیمات درگاه بانکی با موفقیت ذخیره گردید.', 'success');
      } catch (err) {
        showAdminToast('خطا: ' + err.message, 'error');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = origText || 'ذخیره تنظیمات درگاه';
        }
      }
    };
  }

  const btnTestDb = document.getElementById('btnTestDatabaseConnection') || document.getElementById('btnSaveSupabaseConfig');
  if (btnTestDb) {
    btnTestDb.onclick = async () => {
      const statusBox = document.getElementById('databaseConnectionStatus') || document.getElementById('supabaseConnectionStatus');
      if (statusBox) statusBox.innerHTML = '<span style="color: #64748b;">در حال تست اتصال پایگاه‌داده...</span>';
      const result = await window.CampaignDB.testDatabaseConnection();
      if (result.success) {
        if (statusBox) statusBox.innerHTML = `<span style="color: #15803d; font-weight: 700;">${result.message}</span>`;
        showAdminToast('اتصال با موفقیت تایید شد.', 'success');
        await reloadAdminData();
        renderCurrentSection();
      } else {
        if (statusBox) statusBox.innerHTML = `<span style="color: #b91c1c; font-weight: 700;">${result.message}</span>`;
        showAdminToast(result.message, 'error');
      }
    };
  }

  const btnCopySql = document.getElementById('btnCopySqlScript');
  if (btnCopySql) {
    btnCopySql.onclick = () => {
      const sql = typeof window.CampaignDB.getMySQLScript === 'function' ? window.CampaignDB.getMySQLScript() : '';
      navigator.clipboard.writeText(sql).then(() => {
        showAdminToast('کد اسکریپت SQL در کلیپ‌بورد کپی شد.', 'success');
      }).catch(() => {
        showAdminToast('خطا در کپی خودکار.', 'warning');
      });
    };
  }

  document.querySelectorAll('[data-close-admin-modal]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.admin-modal-backdrop').forEach(m => m.classList.remove('open'));
    };
  });

  // فیلترها و دکمه‌های بخش کاربران
  const uSearch = document.getElementById('usersFilterSearch');
  const uStatus = document.getElementById('usersFilterStatus');
  const uAnon = document.getElementById('usersFilterAnonymous');
  const uVis = document.getElementById('usersFilterVisibility');
  const uFrom = document.getElementById('usersFilterFromDate');
  const uTo = document.getElementById('usersFilterToDate');
  const btnResetU = document.getElementById('btnResetUsersFilters');
  const btnRefreshU = document.getElementById('btnRefreshUsers');
  const btnExportU = document.getElementById('btnExportUsersExcel');

  if (uSearch) {
    uSearch.oninput = () => {
      userFilters.search = uSearch.value.trim();
      userFilters.page = 1;
      renderUsersSection();
    };
  }
  if (uVis) {
    uVis.onchange = () => {
      userFilters.visibility = uVis.value;
      userFilters.page = 1;
      renderUsersSection();
    };
  }
  if (uAnon) {
    uAnon.onchange = () => {
      userFilters.anonymous = uAnon.value;
      userFilters.page = 1;
      renderUsersSection();
    };
  }
  if (uFrom) {
    uFrom.onchange = () => {
      userFilters.from_date = uFrom.value.trim();
      userFilters.page = 1;
      renderUsersSection();
    };
  }
  if (uTo) {
    uTo.onchange = () => {
      userFilters.to_date = uTo.value.trim();
      userFilters.page = 1;
      renderUsersSection();
    };
  }
  if (btnResetU) {
    btnResetU.onclick = () => {
      userFilters.search = '';
      userFilters.anonymous = 'all';
      userFilters.visibility = 'all';
      userFilters.from_date = '';
      userFilters.to_date = '';
      userFilters.page = 1;
      if (uSearch) uSearch.value = '';
      if (uAnon) uAnon.value = 'all';
      if (uVis) uVis.value = 'all';
      if (uFrom) uFrom.value = '';
      if (uTo) uTo.value = '';
      renderUsersSection();
    };
  }
  if (btnRefreshU) {
    btnRefreshU.onclick = () => {
      renderUsersSection();
      showAdminToast('لیست کاربران بروزرسانی شد.', 'info');
    };
  }
  if (btnExportU) {
    btnExportU.onclick = exportUsersToExcel;
  }

  // فیلترها و دکمه‌های بخش لاگ‌ها
  const lSearch = document.getElementById('logsFilterSearch');
  const lAction = document.getElementById('logsFilterActionType');
  const lActor = document.getElementById('logsFilterActor');
  const lFrom = document.getElementById('logsFilterFromDate');
  const lTo = document.getElementById('logsFilterToDate');
  const btnResetL = document.getElementById('btnResetLogsFilters');
  const btnRefreshL = document.getElementById('btnRefreshLogs');

  if (lSearch) {
    lSearch.oninput = () => {
      logFilters.search = lSearch.value.trim();
      logFilters.page = 1;
      renderLogsSection();
    };
  }
  if (lAction) {
    lAction.onchange = () => {
      logFilters.action_type = lAction.value;
      logFilters.page = 1;
      renderLogsSection();
    };
  }
  if (lActor) {
    lActor.onchange = () => {
      logFilters.actor = lActor.value;
      logFilters.page = 1;
      renderLogsSection();
    };
  }
  if (lFrom) {
    lFrom.onchange = () => {
      logFilters.from_date = lFrom.value.trim();
      logFilters.page = 1;
      renderLogsSection();
    };
  }
  if (lTo) {
    lTo.onchange = () => {
      logFilters.to_date = lTo.value.trim();
      logFilters.page = 1;
      renderLogsSection();
    };
  }
  if (btnResetL) {
    btnResetL.onclick = () => {
      logFilters.search = '';
      logFilters.action_type = 'all';
      logFilters.actor = 'all';
      logFilters.from_date = '';
      logFilters.to_date = '';
      logFilters.page = 1;
      if (lSearch) lSearch.value = '';
      if (lAction) lAction.value = 'all';
      if (lActor) lActor.value = 'all';
      if (lFrom) lFrom.value = '';
      if (lTo) lTo.value = '';
      renderLogsSection();
    };
  }
  if (btnRefreshL) {
    btnRefreshL.onclick = () => {
      renderLogsSection();
      showAdminToast('لیست لاگ‌ها بروزرسانی شد.', 'info');
    };
  }

  // راه‌اندازی رویدادهای ویرایشگر قوانین
  setupTermsEditorEvents();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initAdminPanel();
  });
} else {
  initAdminPanel();
}
