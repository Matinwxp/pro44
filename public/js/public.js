/**
 * ==========================================================================
 * منطق صفحه عمومی پویش (Public Campaign Logic)
 * هماهنگ با RESTful API و پایگاه‌داده
 * ==========================================================================
 */

let currentCampaign = null;
let currentPayments = [];
let currentSettings = null;
let selectedShares = 1;

function getGatewayDisplayName(gatewayKey) {
  const map = {
    test_gateway: 'شاپرک',
    shaparak: 'شاپرک',
    zarinpal: 'زرین‌پال',
    idpay: 'آیدی پی',
    zibal: 'زیبال',
    nextpay: 'نکست پی',
    behpardakht: 'به‌پرداخت ملت',
    mellat: 'به‌پرداخت ملت',
    saman: 'سامان کیش',
    parsian: 'تجارت الکترونیک پارسیان',
    pasargad: 'پاسارگاد'
  };
  return map[gatewayKey] || gatewayKey || 'شاپرک';
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container-anchor';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast-pill toast-${type}`;
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6L9 17l-5-5"/></svg>';
  } else if (type === 'error') {
    iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  } else {
    iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  }
  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

async function initPublicPage() {
  const container = document.getElementById('campaignMainContent');
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const requestedId = urlParams.get('id');
    const paymentStatusParam = urlParams.get('payment_status');
    const trackParam = urlParams.get('track');
    const authorityParam = urlParams.get('Authority') || urlParams.get('authority');
    const refIdParam = urlParams.get('ref_id');

    currentCampaign = await window.CampaignDB.getActiveCampaign(requestedId);
    if (!currentCampaign) {
      renderEmptyState(container);
      return;
    }

    try {
      currentSettings = await window.CampaignDB.getPaymentSettings();
    } catch (e) {
      console.warn('امکان بارگذاری تنظیمات درگاه وجود نداشت:', e);
    }

    currentPayments = await window.CampaignDB.getPayments(currentCampaign.id);
    renderActiveCampaignLayout(container);
    setupEventListeners();

    // بررسی بازگشت از درگاه پرداخت
    if (paymentStatusParam && trackParam) {
      handleGatewayCallback({
        paymentStatusParam,
        trackParam,
        authorityParam,
        refIdParam
      });
    }
  } catch (error) {
    console.error('خطا در بارگذاری پویش:', error);
    renderErrorState(container, error.message);
  }
}

async function handleGatewayCallback({ paymentStatusParam, trackParam, authorityParam, refIdParam }) {
  showToast('در حال استعلام و اعتبارسنجی پرداخت از درگاه...', 'info');
  try {
    const verification = await window.CampaignDB.verifyGatewayPayment({
      tracking_code: trackParam,
      authority: authorityParam,
      status_param: paymentStatusParam,
      ref_id: refIdParam
    });

    currentPayments = await window.CampaignDB.getPayments(currentCampaign.id);
    const container = document.getElementById('campaignMainContent');
    renderActiveCampaignLayout(container);
    setupEventListeners();

    const cleanUrl = window.location.pathname + (currentCampaign ? `?id=${currentCampaign.id}` : '');
    window.history.replaceState({}, document.title, cleanUrl);

    if (verification.success && verification.payment) {
      showPaymentReceipt(verification.payment, true);
      showToast('پرداخت شما با موفقیت تایید و ثبت شد.', 'success');
    } else {
      showPaymentFailure(verification.payment || { tracking_code: trackParam }, verification.message);
      showToast('تراکنش ناموفق بود یا لغو گردید.', 'error');
    }
  } catch (err) {
    console.error('خطای بازگشت پرداخت:', err);
    showPaymentFailure({ tracking_code: trackParam }, err.message || 'خطا در تایید تراکنش.');
    showToast('خطا در تایید پرداخت.', 'error');
  }
}

function renderEmptyState(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state-modern-card">
      <div class="empty-state-icon-bubble">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h2 class="empty-state-headline">هیچ پویش فعالی یافت نشد</h2>
      <p class="empty-state-paragraph">
        در حال حاضر پویش فعالی برای نمایش وجود ندارد. مدیران می‌توانند از بخش پنل مدیریت، پویش جدید ایجاد و فعال نمایند.
      </p>
      <div>
        <a href="/admin/index.html" class="btn-utility-pill admin-pill" style="display: inline-flex;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span>ورود به پنل مدیریت</span>
        </a>
      </div>
    </div>
  `;
}

function renderErrorState(container, errorMsg) {
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state-modern-card" style="border-color: #fecdd3;">
      <div class="empty-state-icon-bubble" style="background: #fff1f2; color: #e11d48; border-color: #fecdd3;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h2 class="empty-state-headline" style="color: #9f1239;">خطا در برقراری ارتباط</h2>
      <p class="empty-state-paragraph">
        ارتباط با سرور امکان‌پذیر نشد. لطفاً از اتصال اینترنت یا فعال بودن سرویس اطمینان حاصل فرمایید.
      </p>
      <div style="font-size: 0.8rem; color: #be123c; font-family: monospace; background: #fff1f2; padding: 10px; border-radius: 8px; margin-bottom: 18px; direction: ltr;">
        ${errorMsg || 'Connection error'}
      </div>
      <div>
        <a href="/admin/index.html" class="btn-utility-pill admin-pill" style="display: inline-flex;">
          <span>ورود به پنل مدیریت</span>
        </a>
      </div>
    </div>
  `;
}

function getCampaignStatusBadgeHtml(status) {
  if (status === 'completed') {
    return `
      <div class="banner-status-tag" style="background: rgba(15, 23, 42, 0.85); color: #cbd5e1; border-color: rgba(255,255,255,0.2);">
        <span class="status-indicator-dot" style="background: #94a3b8;"></span>
        <span>تکمیل شده</span>
      </div>
    `;
  }
  if (status === 'pending') {
    return `
      <div class="banner-status-tag" style="background: rgba(120, 53, 15, 0.88); color: #fef3c7; border-color: rgba(253, 230, 138, 0.3);">
        <span class="status-indicator-dot" style="background: #f59e0b;"></span>
        <span>به زودی</span>
      </div>
    `;
  }
  return '';
}

function renderActiveCampaignLayout(container) {
  if (!container || !currentCampaign) return;
  const stats = window.CampaignDB.calculateCampaignStats(currentCampaign, currentPayments);

  let bannerMediaHtml = '';
  if (currentCampaign.image_url && currentCampaign.image_url.trim()) {
    bannerMediaHtml = `
      <img src="${currentCampaign.image_url}" alt="${currentCampaign.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
      <div class="banner-pattern-shimmer" style="display: none;"></div>
    `;
  } else {
    bannerMediaHtml = `
      <div class="banner-pattern-shimmer"></div>
      <div style="position: relative; z-index: 2; text-align: center; color: #ffffff; padding: 24px;">
        <div style="width: 64px; height: 64px; border-radius: 20px; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; backdrop-filter: blur(8px);">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </div>
        <div style="font-size: 1.5rem; font-weight: 900; letter-spacing: -0.01em;">${currentCampaign.title}</div>
        <div style="font-size: 0.9rem; opacity: 0.9; margin-top: 4px;">پویش عمومی مشارکت و همدلی</div>
      </div>
    `;
  }

  const statusBadgeHtml = getCampaignStatusBadgeHtml(currentCampaign.status);
  const eventInfoHtml = buildOptionalEventDetailsHtml(currentCampaign);
  const recentListHtml = buildRecentParticipantsHtml(currentPayments);

  container.innerHTML = `
    <div class="campaign-grid-layout">
      <div>
        <div class="modern-card campaign-hero-card">
          <div class="campaign-banner-media">
            ${bannerMediaHtml}
            ${statusBadgeHtml}
          </div>
          <div class="campaign-body-inner">
            <div class="campaign-category-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <span>پویش مردمی نذورات</span>
              ${currentCampaign.start_date || currentCampaign.end_date ? `
                <span aria-hidden="true" style="opacity: 0.5;">•</span>
                <span>${currentCampaign.start_date ? `از ${window.CampaignDB.toPersianDigits(currentCampaign.start_date)}` : ''} ${currentCampaign.end_date ? `تا ${window.CampaignDB.toPersianDigits(currentCampaign.end_date)}` : ''}</span>
              ` : ''}
            </div>
            <h1 class="campaign-headline">${currentCampaign.title}</h1>
            <p class="campaign-desc-paragraph">${currentCampaign.description || 'توضیحاتی برای این پویش ثبت نشده است.'}</p>
            <div class="campaign-highlight-tags">
              <div class="highlight-tag-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>پرداخت امن و شفاف</span>
              </div>
              <div class="highlight-tag-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>ثبت آنی سهم مشارکت</span>
              </div>
              <div class="highlight-tag-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>رهگیری با کد پیگیری</span>
              </div>
            </div>
            <div class="campaign-action-links-row" style="margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--border-color); display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: flex-end;">
              <a href="/admin/index.html" class="btn-utility-pill admin-pill" style="border-radius: 12px; font-weight: 700;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span>ورود به پنل مدیریت</span>
              </a>
            </div>
          </div>
        </div>
        ${eventInfoHtml}
      </div>
      
      <div class="sidebar-sticky-panel">
        <div class="modern-card participation-box-card">
          <div class="progress-section-block">
            <div class="progress-header-labels">
              <div>
                <span class="progress-caption-badge">پیشرفت پویش</span>
              </div>
              <div class="progress-number-highlight">
                ${window.CampaignDB.toPersianDigits(stats.progress)}٪
              </div>
            </div>
            <div class="progress-track-sleek">
              <div class="progress-fill-sleek" style="width: ${Math.min(100, Math.max(0, stats.progress))}%;"></div>
            </div>
          </div>
          
          <div class="metrics-quad-grid">
            <div class="metric-quad-cell">
              <span class="metric-cell-label">مبلغ هدف</span>
              <span class="metric-cell-value">${window.CampaignDB.formatCurrency(stats.target_amount)}</span>
            </div>
            <div class="metric-quad-cell">
              <span class="metric-cell-label">جمع‌آوری شده</span>
              <span class="metric-cell-value primary-color">${window.CampaignDB.formatCurrency(stats.collected_amount)}</span>
            </div>
            <div class="metric-quad-cell">
              <span class="metric-cell-label">سهم‌های تکمیل‌شده</span>
              <span class="metric-cell-value">${window.CampaignDB.formatNumber(stats.paid_shares)} از ${window.CampaignDB.formatNumber(stats.total_shares)}</span>
            </div>
            <div class="metric-quad-cell">
              <span class="metric-cell-label">سهم‌های باقیمانده</span>
              <span class="metric-cell-value teal-color">${window.CampaignDB.formatNumber(stats.remaining_shares)} سهم</span>
            </div>
          </div>
          
          <div class="shares-control-box">
            <div class="shares-control-title-row">
              <span class="shares-control-title">تعداد سهم مشارکت:</span>
              <span class="shares-price-per-pill" id="pillPricePerShare">هر سهم ${window.CampaignDB.formatCurrency(stats.share_price)}</span>
            </div>
            <div class="stepper-counter-group">
              <button type="button" class="btn-stepper-act" id="btnIncreaseShares" aria-label="افزایش سهم">+</button>
              <input type="text" id="inputSharesCount" class="stepper-val-input" value="۱" />
              <button type="button" class="btn-stepper-act" id="btnDecreaseShares" aria-label="کاهش سهم">-</button>
            </div>
            <div class="quick-chips-row">
              <button type="button" class="chip-select-btn active" data-shares="1">۱ سهم</button>
              <button type="button" class="chip-select-btn" data-shares="2">۲ سهم</button>
              <button type="button" class="chip-select-btn" data-shares="5">۵ سهم</button>
              <button type="button" class="chip-select-btn" data-shares="10">۱۰ سهم</button>
              <button type="button" class="chip-select-btn" data-shares="20">۲۰ سهم</button>
            </div>
          </div>
          
          <div class="due-summary-line">
            <span class="due-summary-label">مبلغ قابل پرداخت:</span>
            <span class="due-summary-price" id="displayTotalAmount">${window.CampaignDB.formatCurrency(stats.share_price * selectedShares)}</span>
          </div>
          
          <button type="button" id="btnOpenParticipate" class="btn-donate-cta">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="8" cy="8" r="6"/>
              <path d="M18.09 10.37A6 6 0 1 1 10.34 18"/>
              <path d="M7 6h1v4"/>
              <path d="m16.71 13.88.7.71-2.82 2.82"/>
            </svg>
            <span>مشارکت در پویش</span>
          </button>
          
          <div class="sidebar-secondary-actions" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
            <button type="button" id="btnOpenTrackPage" class="btn-track-page-action" style="margin-top: 0;">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>پیگیری نذورات</span>
            </button>
            <button type="button" id="btnOpenRulesModal" class="btn-track-page-action" style="margin-top: 0;">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span>قوانین و مقررات</span>
            </button>
          </div>
          
          <div class="trust-badge-footer">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>اتصال امن به درگاه بانکی <strong id="trustBadgeGatewayName">${getGatewayDisplayName((currentSettings && currentSettings.active_gateway) || 'test_gateway')}</strong></span>
          </div>
        </div>
        
        <div class="modern-card recent-participants-card">
          <div class="recent-part-header">
            <span>آخرین مشارکت‌کنندگان</span>
            <span class="live-pulse-badge">
              <span class="live-pulse-dot"></span>
              <span>زنده</span>
            </span>
          </div>
          <div class="participants-items-stack" id="recentParticipantsList">
            ${recentListHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildOptionalEventDetailsHtml(campaign) {
  const loc = (campaign.event_location || '').trim();
  const date = (campaign.event_date || '').trim();
  const time = (campaign.event_time || '').trim();
  const channel = (campaign.channel_link || '').trim();
  const social = (campaign.social_link || '').trim();
  const phone = (campaign.contact_phone || '').trim();
  const notes = (campaign.additional_notes || '').trim();

  if (!loc && !date && !time && !channel && !social && !phone && !notes) {
    return '';
  }

  let itemsHtml = '';
  if (loc) {
    itemsHtml += `
      <div class="event-detail-item">
        <div class="event-detail-icon loc">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        </div>
        <div class="event-detail-content">
          <span class="event-detail-label">مکان مراسم / توزیع:</span>
          <span class="event-detail-val">${loc}</span>
        </div>
      </div>
    `;
  }
  if (date) {
    itemsHtml += `
      <div class="event-detail-item">
        <div class="event-detail-icon date">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        </div>
        <div class="event-detail-content">
          <span class="event-detail-label">زمان برگزاری:</span>
          <span class="event-detail-val">${date}</span>
        </div>
      </div>
    `;
  }
  if (time) {
    itemsHtml += `
      <div class="event-detail-item">
        <div class="event-detail-icon time">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
        <div class="event-detail-content">
          <span class="event-detail-label">ساعت مراسم:</span>
          <span class="event-detail-val">${time}</span>
        </div>
      </div>
    `;
  }
  if (phone) {
    itemsHtml += `
      <div class="event-detail-item">
        <div class="event-detail-icon phone">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
        </div>
        <div class="event-detail-content">
          <span class="event-detail-label">شماره تماس مسئول:</span>
          <a href="tel:${phone}" class="event-detail-link" style="direction: ltr; text-align: right;">${phone}</a>
        </div>
      </div>
    `;
  }

  let socialPillsHtml = '';
  if (channel) {
    socialPillsHtml += `
      <a href="${channel}" target="_blank" rel="noopener noreferrer" class="btn-social-action-pill channel">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
        <span>کانال اطلاع‌رسانی پویش</span>
      </a>
    `;
  }
  if (social) {
    socialPillsHtml += `
      <a href="${social}" target="_blank" rel="noopener noreferrer" class="btn-social-action-pill social">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path></svg>
        <span>گروه مجازی مشارکت</span>
      </a>
    `;
  }

  let notesHtml = '';
  if (notes) {
    notesHtml = `
      <div class="event-notes-box">
        <div class="event-notes-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <span>توضیحات و شیوه توزیع:</span>
        </div>
        <div class="event-notes-text">${notes}</div>
      </div>
    `;
  }

  return `
    <div class="modern-card event-details-card">
      <div class="event-details-card-header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        <span>مشخصات و جزئیات برگزاری رویداد</span>
      </div>
      <div class="event-details-grid">
        ${itemsHtml}
      </div>
      ${socialPillsHtml ? `<div class="event-social-row" style="display: flex; justify-content: center; align-items: center; text-align: center; gap: 12px; margin: 16px auto 0 auto; width: 100%;">${socialPillsHtml}</div>` : ''}
      ${notesHtml}
    </div>
  `;
}

function buildRecentParticipantsHtml(payments) {
  const successful = (payments || []).filter(p => {
    if (!p) return false;
    const isSuccess = !p.status || p.status === 'successful' || p.status === 'success';
    return isSuccess && p.is_excluded !== true;
  });
  if (successful.length === 0) {
    return `
      <div class="empty-participants-notice">
        هنوز پرداختی ثبت نشده است. اولین مشارکت‌کننده باشید!
      </div>
    `;
  }
  const sorted = successful.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  return sorted.map((p) => {
    let rawName = (p.payer_name || '').trim();
    let displayName = rawName;
    if (p.is_anonymous || rawName === 'گمنام' || !rawName || rawName === 'ناشناس' || rawName === 'مشارکت‌کننده ناشناس') {
      displayName = 'گمنام';
    }
    const timeAgoStr = formatRelativeTime(p.created_at);
    const sharesCount = p.shares || 1;
    return `
      <div class="participant-item-row">
        <div class="participant-avatar-badge" style="display: flex; align-items: center; justify-content: center;" title="${displayName}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <div class="participant-info-cell">
          <div class="participant-name-text">${displayName}</div>
          <div class="participant-time-tag">${timeAgoStr}</div>
        </div>
        <div class="participant-shares-pill">
          ${window.CampaignDB.toPersianDigits(sharesCount)} سهم
        </div>
      </div>
    `;
  }).join('');
}

function formatRelativeTime(dateStr) {
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

function updateShareCalculation() {
  if (!currentCampaign) return;
  const sharePrice = Number(currentCampaign.share_price) || 0;
  const total = selectedShares * sharePrice;

  const displayEl = document.getElementById('displayTotalAmount');
  if (displayEl) {
    displayEl.textContent = window.CampaignDB.formatCurrency(total);
  }
  const inputEl = document.getElementById('inputSharesCount');
  if (inputEl) {
    inputEl.value = window.CampaignDB.toPersianDigits(selectedShares);
  }
  const modalShares = document.getElementById('modalSharesCount');
  if (modalShares) {
    modalShares.textContent = window.CampaignDB.toPersianDigits(selectedShares);
  }
  const modalTotal = document.getElementById('modalTotalAmount');
  if (modalTotal) {
    modalTotal.textContent = window.CampaignDB.formatCurrency(total);
  }

  document.querySelectorAll('.chip-select-btn').forEach(btn => {
    const chipVal = parseInt(btn.getAttribute('data-shares'), 10);
    if (chipVal === selectedShares) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function setupEventListeners() {
  const btnInc = document.getElementById('btnIncreaseShares');
  const btnDec = document.getElementById('btnDecreaseShares');
  const inputShares = document.getElementById('inputSharesCount');

  if (btnInc) {
    btnInc.onclick = () => {
      selectedShares += 1;
      updateShareCalculation();
    };
  }
  if (btnDec) {
    btnDec.onclick = () => {
      if (selectedShares > 1) {
        selectedShares -= 1;
        updateShareCalculation();
      }
    };
  }
  if (inputShares) {
    inputShares.oninput = (e) => {
      const raw = window.CampaignDB.toEnglishDigits(e.target.value);
      const val = parseInt(raw, 10);
      if (!isNaN(val) && val > 0) {
        selectedShares = val;
      } else if (raw === '') {
        selectedShares = 1;
      }
      updateShareCalculation();
    };
  }

  document.querySelectorAll('.chip-select-btn').forEach(btn => {
    btn.onclick = () => {
      const val = parseInt(btn.getAttribute('data-shares'), 10);
      if (val) {
        selectedShares = val;
        updateShareCalculation();
      }
    };
  });

  const btnOpenModal = document.getElementById('btnOpenParticipate');
  const modalParticipate = document.getElementById('modalParticipate');
  const chkTerms = document.getElementById('chkAcceptTerms');
  const submitBtn = document.getElementById('btnSubmitPayment');

  const updateSubmitPaymentBtnState = () => {
    if (!submitBtn) return;
    if (chkTerms && chkTerms.checked) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
    } else {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';
      submitBtn.style.cursor = 'not-allowed';
    }
  };

  if (chkTerms) {
    chkTerms.addEventListener('change', updateSubmitPaymentBtnState);
    chkTerms.addEventListener('input', updateSubmitPaymentBtnState);
  }

  if (btnOpenModal && modalParticipate) {
    btnOpenModal.onclick = () => {
      updateShareCalculation();
      const errBox = document.getElementById('paymentErrorMessage');
      if (errBox) errBox.style.display = 'none';
      const chkAnon = document.getElementById('chkAnonymousPayment');
      if (chkAnon) chkAnon.checked = false;
      if (chkTerms) {
        chkTerms.checked = false;
      }
      updateSubmitPaymentBtnState();
      modalParticipate.classList.add('open');
    };
  }

  // مقداردهی اولیه وضعیت غیرفعال دکمه پرداخت
  updateSubmitPaymentBtnState();

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.modal-backdrop-smooth').forEach(m => m.classList.remove('open'));
    };
  });

  const btnOpenRules = document.getElementById('btnOpenRulesModal');
  const modalRulesTerms = document.getElementById('modalRulesTerms');
  const openRulesAction = async () => {
    if (modalRulesTerms) {
      modalRulesTerms.classList.add('open');
      const container = document.getElementById('modalRulesContentContainer');
      if (container && typeof window.CampaignDB.getTermsContent === 'function') {
        try {
          const content = await window.CampaignDB.getTermsContent();
          if (content && content.trim()) {
            container.innerHTML = content;
          }
        } catch (err) {
          console.warn('استفاده از متن پیش‌فرض قوانین:', err);
        }
      }
    }
  };
  if (btnOpenRules) btnOpenRules.onclick = openRulesAction;

  const formPayment = document.getElementById('formPayment');
  if (formPayment) {
    formPayment.onsubmit = async (e) => {
      e.preventDefault();
      if (!currentCampaign) return;

      const errBox = document.getElementById('paymentErrorMessage');
      if (errBox) errBox.style.display = 'none';

      const payerName = (document.getElementById('inputPayerName')?.value || '').trim();
      if (!payerName || payerName.length < 2) {
        if (errBox) {
          errBox.textContent = 'لطفاً نام و نام خانوادگی خود را وارد کنید.';
          errBox.style.display = 'block';
        } else {
          showToast('لطفاً نام و نام خانوادگی خود را وارد کنید.', 'error');
        }
        document.getElementById('inputPayerName')?.focus();
        return;
      }

      const phone = (document.getElementById('inputPayerPhone')?.value || '').trim();
      if (!phone) {
        if (errBox) {
          errBox.textContent = 'شماره تلفن همراه برای دریافت کد پیگیری الزامی است.';
          errBox.style.display = 'block';
        } else {
          showToast('شماره تلفن همراه الزامی است.', 'error');
        }
        document.getElementById('inputPayerPhone')?.focus();
        return;
      }

      const chkTerms = document.getElementById('chkAcceptTerms');
      if (chkTerms && !chkTerms.checked) {
        if (errBox) {
          errBox.textContent = 'لطفاً تیک پذیرش قوانین و شرایط را بزنید.';
          errBox.style.display = 'block';
        } else {
          showToast('پذیرش قوانین الزامی است.', 'error');
        }
        chkTerms.focus();
        return;
      }

      const chkAnon = document.getElementById('chkAnonymousPayment');
      const isAnonymous = chkAnon ? chkAnon.checked : false;

      const description = (document.getElementById('inputPayerDesc')?.value || '').trim();
      const sharePrice = Number(currentCampaign.share_price) || 0;
      const amount = selectedShares * sharePrice;

      if (amount <= 0) {
        if (errBox) {
          errBox.textContent = 'مبلغ سهم مشارکت نامعتبر است.';
          errBox.style.display = 'block';
        }
        return;
      }

      const submitBtn = document.getElementById('btnSubmitPayment');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>در حال انتقال به درگاه...</span>';

      try {
        const initResult = await window.CampaignDB.initiateGatewayPayment({
          campaign_id: currentCampaign.id,
          payer_name: payerName,
          phone: phone,
          shares: selectedShares,
          amount: amount,
          description: description,
          is_anonymous: isAnonymous,
          gateway: (currentSettings && currentSettings.active_gateway) || 'test_gateway'
        });

        const redirectUrl = initResult?.redirect_url || initResult?.data?.redirect_url;
        if (redirectUrl) {
          window.location.href = redirectUrl;
        } else {
          throw new Error('آدرس بازگشت درگاه دریافت نشد.');
        }
      } catch (err) {
        console.error('خطای انتقال به درگاه:', err);
        if (errBox) {
          errBox.textContent = err.message || 'خطا در اتصال به درگاه پرداخت.';
          errBox.style.display = 'block';
        }
        showToast(err.message || 'خطا در شروع پرداخت.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    };
  }

  const btnOpenTrack = document.getElementById('btnOpenTrackModal');
  const btnOpenTrackPage = document.getElementById('btnOpenTrackPage');
  const modalTrack = document.getElementById('modalTrack');
  const openTrackAction = () => {
    if (modalTrack) modalTrack.classList.add('open');
  };
  if (btnOpenTrack) btnOpenTrack.onclick = openTrackAction;
  if (btnOpenTrackPage) btnOpenTrackPage.onclick = openTrackAction;

  const formTrack = document.getElementById('formTrack');
  if (formTrack) {
    formTrack.onsubmit = async (e) => {
      e.preventDefault();
      const query = document.getElementById('inputTrackCode').value;
      const resultBox = document.getElementById('trackResultBox');
      resultBox.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 10px;">در حال جستجو...</div>';

      const results = await window.CampaignDB.findPaymentsByTrackingOrPhone(query);
      if (results.length === 0) {
        resultBox.innerHTML = `
          <div style="background: #fff1f2; border: 1px solid #fecdd3; color: #9f1239; padding: 14px; border-radius: 12px; font-size: 0.88rem; text-align: center;">
            اطلاعات پرداختی با این مشخصات یافت نشد.
          </div>
        `;
      } else {
        resultBox.innerHTML = results.map(r => `
          <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 14px; padding: 16px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-weight: 800; color: var(--primary);">کد پیگیری: ${r.tracking_code}</span>
              <span style="background: ${(r.status === 'successful' || r.status === 'success') ? '#ecfdf5' : '#fffbeb'}; color: ${(r.status === 'successful' || r.status === 'success') ? '#047857' : '#b45309'}; padding: 3px 10px; border-radius: 999px; font-size: 0.78rem; font-weight: 700;">
                ${getPaymentStatusPersianLabel(r.status)}
              </span>
            </div>
            <div style="font-size: 0.86rem; color: #334155; line-height: 1.8;">
              <div>نام واریز کننده: <strong>${r.payer_name || 'ناشناس'}</strong></div>
              <div>سهم مشارکت: <strong>${window.CampaignDB.toPersianDigits(r.shares)} سهم</strong> (${window.CampaignDB.formatCurrency(r.amount)})</div>
              <div>تاریخ ثبت: ${window.CampaignDB.toPersianDigits(new Date(r.created_at).toLocaleDateString('fa-IR'))}</div>
              ${r.transaction_id ? `<div>شماره ارجاع بانکی: <span style="direction: ltr; font-weight: bold;">${r.transaction_id}</span></div>` : ''}
              ${r.description ? `<div>نیت / یادداشت: ${r.description}</div>` : ''}
            </div>
          </div>
        `).join('');
      }
    };
  }
}

function getPaymentStatusPersianLabel(status) {
  const map = {
    pending: 'در انتظار پرداخت',
    success: 'موفق و تایید شده',
    successful: 'موفق و تایید شده',
    failed: 'ناموفق',
    cancelled: 'لغو شده توسط کاربر',
    verification_failed: 'خطا در اعتبارسنجی'
  };
  return map[status] || status;
}

function showPaymentReceipt(payment, isVerified = true) {
  const modalReceipt = document.getElementById('modalReceipt');
  if (!modalReceipt) return;

  const headRow = document.getElementById('receiptModalHeadRow');
  const title = document.getElementById('receiptModalTitle');
  const msg = document.getElementById('receiptMessageText');

  if (headRow) {
    headRow.style.background = '#f0fdfa';
    headRow.style.borderBottomColor = '#a7f3d0';
  }
  if (title) {
    title.style.color = '#0d9488';
    title.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
      <span>رسید پرداخت موفق</span>
    `;
  }
  if (msg) {
    msg.textContent = 'مشارکت و نذر شما با موفقیت در سامانه ثبت گردید. با تشکر از همدلی و نیت خیر شما.';
  }

  document.getElementById('receiptTrackingCode').textContent = payment.tracking_code;
  const rowTxn = document.getElementById('rowReceiptTxn');
  const txnEl = document.getElementById('receiptTxnId');
  if (txnEl && payment.transaction_id) {
    txnEl.textContent = payment.transaction_id;
    if (rowTxn) rowTxn.style.display = 'flex';
  } else if (rowTxn) {
    rowTxn.style.display = 'none';
  }

  document.getElementById('receiptPayerName').textContent = payment.payer_name || 'ناشناس';
  document.getElementById('receiptShares').textContent = `${window.CampaignDB.toPersianDigits(payment.shares)} سهم`;
  document.getElementById('receiptAmount').textContent = window.CampaignDB.formatCurrency(payment.amount);
  document.getElementById('receiptDate').textContent = window.CampaignDB.toPersianDigits(new Date(payment.verified_at || payment.created_at || Date.now()).toLocaleDateString('fa-IR'));

  modalReceipt.classList.add('open');
}

function showPaymentFailure(payment, errorText) {
  const modalReceipt = document.getElementById('modalReceipt');
  if (!modalReceipt) return;

  const headRow = document.getElementById('receiptModalHeadRow');
  const title = document.getElementById('receiptModalTitle');
  const msg = document.getElementById('receiptMessageText');

  if (headRow) {
    headRow.style.background = '#fff1f2';
    headRow.style.borderBottomColor = '#fecdd3';
  }
  if (title) {
    title.style.color = '#be123c';
    title.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>تراکنش ناموفق</span>
    `;
  }
  if (msg) {
    msg.textContent = errorText || 'عملیات پرداخت انجام نشد یا توسط کاربر لغو گردید. در صورت کسر وجه، مبلغ طی ۷۲ ساعت توسط بانک عودت داده خواهد شد.';
  }

  document.getElementById('receiptTrackingCode').textContent = payment.tracking_code || '---';
  const rowTxn = document.getElementById('rowReceiptTxn');
  if (rowTxn) rowTxn.style.display = 'none';
  document.getElementById('receiptPayerName').textContent = payment.payer_name || 'ناشناس';
  document.getElementById('receiptShares').textContent = payment.shares ? `${window.CampaignDB.toPersianDigits(payment.shares)} سهم` : '---';
  document.getElementById('receiptAmount').textContent = payment.amount ? window.CampaignDB.formatCurrency(payment.amount) : '---';
  document.getElementById('receiptDate').textContent = window.CampaignDB.toPersianDigits(new Date().toLocaleDateString('fa-IR'));

  modalReceipt.classList.add('open');
}

document.addEventListener('DOMContentLoaded', () => {
  initPublicPage();
});
