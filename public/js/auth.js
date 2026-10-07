/**
 * ==============================================================================
 * ماژول احراز هویت مدیریت: js/auth.js
 * ==============================================================================
 * مدیریت ورود، خروج، و بررسی نشست مدیر در سیستم
 * با پشتیبانی از هدرهای چندگانه (Bearer, X-Auth-Token)، کوکی‌ها و سشن امن
 */
let _cachedAdminEmail = null;
let _memoryToken = null;

function getCookie(name) {
  try {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift().trim());
  } catch (e) {}
  return null;
}

function getAuthToken() {
  if (_memoryToken) return _memoryToken;
  try {
    const t = localStorage.getItem('ADMIN_AUTH_TOKEN') 
      || sessionStorage.getItem('ADMIN_AUTH_TOKEN')
      || getCookie('ADMIN_AUTH_TOKEN')
      || getCookie('admin_token');
    if (t && t !== 'null' && t !== 'undefined' && t.trim() !== '') {
      _memoryToken = t.trim();
      return _memoryToken;
    }
  } catch (e) {}
  return null;
}

function setAuthToken(token) {
  _memoryToken = token ? token.trim() : null;
  try {
    if (_memoryToken) {
      localStorage.setItem('ADMIN_AUTH_TOKEN', _memoryToken);
      sessionStorage.setItem('ADMIN_AUTH_TOKEN', _memoryToken);
      document.cookie = `ADMIN_AUTH_TOKEN=${encodeURIComponent(_memoryToken)}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `admin_token=${encodeURIComponent(_memoryToken)}; path=/; max-age=2592000; SameSite=Lax`;
    } else {
      localStorage.removeItem('ADMIN_AUTH_TOKEN');
      sessionStorage.removeItem('ADMIN_AUTH_TOKEN');
      document.cookie = 'ADMIN_AUTH_TOKEN=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'admin_token=; path=/; max-age=0; SameSite=Lax';
    }
  } catch (e) {}
}

function getAuthApiUrl(endpoint) {
  const base = (window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl) || window.API_BASE_URL || '/api';
  const cleanBase = base.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  return `${cleanBase}/${cleanEndpoint}`;
}

async function isAuthenticatedAdmin() {
  const token = getAuthToken();
  if (!token) {
    _cachedAdminEmail = null;
    return false;
  }

  try {
    const resp = await fetch(getAuthApiUrl('auth?action=check'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Auth-Token': token,
        'X-Admin-Token': token
      },
      credentials: 'same-origin'
    });

    if (resp.status === 401) {
      _cachedAdminEmail = null;
      setAuthToken(null);
      return false;
    }

    const res = await resp.json();
    const isAuth = Boolean(res.authenticated || (res.data && res.data.authenticated));
    const user = res.user || (res.data && res.data.user);

    if (isAuth && user) {
      _cachedAdminEmail = user.email || 'Matinshariati1404@gmail.com';
      return true;
    }

    if (res.authenticated === false) {
      _cachedAdminEmail = null;
      setAuthToken(null);
      return false;
    }

    // در صورتی که توکن موجود بود و پاسخ نامشخص بود
    return Boolean(token && token.length > 5);
  } catch (err) {
    console.warn('خطا در بررسی توکن ادمین:', err);
    // در صورت خطای موقت شبکه یا سرور، نشست محلی را حفظ می‌کنیم
    return Boolean(token && token.length > 5);
  }
}

async function getAdminEmail() {
  if (_cachedAdminEmail) {
    return _cachedAdminEmail;
  }
  const isAuth = await isAuthenticatedAdmin();
  return isAuth ? (_cachedAdminEmail || 'Matinshariati1404@gmail.com') : '';
}

async function loginAdmin(email, password) {
  const cleanEmail = (email || '').trim();
  const cleanPass = (password || '').trim();

  if (!cleanEmail) {
    return { success: false, message: 'لطفاً ایمیل مدیریت را وارد کنید.' };
  }
  if (!cleanPass) {
    return { success: false, message: 'لطفاً رمز عبور را وارد کنید.' };
  }

  try {
    const resp = await fetch(getAuthApiUrl('auth'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        email: cleanEmail,
        password: cleanPass
      })
    });
    const res = await resp.json();
    const token = res.token || (res.data && res.data.token);
    const user = res.user || (res.data && res.data.user);

    if (!res.success || !token) {
      return {
        success: false,
        message: res.message || 'ایمیل یا رمز عبور نامعتبر است.'
      };
    }

    setAuthToken(token);
    _cachedAdminEmail = user ? user.email : cleanEmail;

    return {
      success: true,
      user: user || { email: cleanEmail },
      token: token,
      message: res.message || 'ورود موفقیت‌آمیز بود.'
    };
  } catch (err) {
    return {
      success: false,
      message: `خطا در ارتباط با سرور: ${err.message}`
    };
  }
}

async function logoutAdmin() {
  const token = getAuthToken();
  setAuthToken(null);
  _cachedAdminEmail = null;

  if (token) {
    try {
      await fetch(getAuthApiUrl('auth?action=logout'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Auth-Token': token,
          'X-Admin-Token': token
        },
        credentials: 'same-origin'
      });
    } catch (e) {}
  }

  if (typeof window.showLoginView === 'function') {
    window.showLoginView();
  } else {
    window.location.reload();
  }
}

window.AdminAuth = {
  getAuthToken,
  setAuthToken,
  isAuthenticatedAdmin,
  getAdminEmail,
  loginAdmin,
  logoutAdmin
};
