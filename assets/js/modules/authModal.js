/**
 * LUXEA LIVING — GLOBAL AUTHENTICATION & ACCOUNT SUITE (authModal.js)
 * Manages:
 * 1. Global Header Sign-In button and User Account Dropdown
 * 2. High-end Luxury Auth Modal with Sign Up, Sign In & Host Password Setup
 * 3. Google OAuth One-Click Sign-In / Registration
 * 4. Property Owner (Host Partner) password setting & verification against lux_hosts
 * 5. Supabase Auth onAuthStateChange listener & multi-page session synchronization
 */

export function initAuthSuite() {
  injectAuthModalHtml();
  updateHeaderAuthState();

  // Listen to custom session updates
  window.addEventListener('luxea:auth_changed', () => {
    updateHeaderAuthState();
  });

  // Cross-tab synchronization
  window.addEventListener('storage', (e) => {
    if (e.key === 'luxea_admin_session' || e.key === 'luxea_user_session') {
      updateHeaderAuthState();
    }
  });

  // Initialize Supabase Auth state listener for OAuth redirects (e.g. Google)
  initSupabaseAuthListener();
}

/**
 * Listen to Supabase Auth state changes (crucial for Google OAuth redirects)
 */
function initSupabaseAuthListener() {
  const tryInitListener = () => {
    const client = window.LuxeaDB ? window.LuxeaDB.getClient() : null;
    if (!client || !client.auth) {
      setTimeout(tryInitListener, 250);
      return;
    }

    try {
      client.auth.onAuthStateChange(async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session && session.user) {
          const user = session.user;
          const email = (user.email || '').toLowerCase();
          const fullName = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0];

          // Check if Super Admin
          const SUPER_ADMINS = ['otienoronny56@gmail.com', 'dennbarasa@gmail.com'];
          if (SUPER_ADMINS.includes(email)) {
            const adminName = email === 'dennbarasa@gmail.com' ? 'Dennis Barasa' : 'Ronald Otieno';
            const adminSession = {
              email: email,
              name: fullName || adminName,
              role: 'super_admin',
              isSuperAdmin: true,
              authMethod: session.provider_token ? 'google' : 'supabase_auth',
              loggedInAt: new Date().toISOString()
            };
            localStorage.setItem('luxea_admin_session', JSON.stringify(adminSession));
            localStorage.setItem('luxea_user_session', JSON.stringify(adminSession));
            window.dispatchEvent(new CustomEvent('luxea:auth_changed', { detail: { loggedIn: true, user: adminSession } }));
            updateHeaderAuthState();
            return;
          }

          // Check role from lux_profiles
          let profileRole = user.user_metadata?.role;
          try {
            const { data: prof } = await client
              .from('lux_profiles')
              .select('role, full_name')
              .eq('id', user.id)
              .maybeSingle();
            if (prof && prof.role) {
              profileRole = prof.role;
              if (profileRole === 'super_admin' || profileRole === 'admin') {
                const adminSession = {
                  email: email,
                  name: prof.full_name || fullName,
                  role: profileRole,
                  isSuperAdmin: true,
                  authMethod: session.provider_token ? 'google' : 'supabase_auth',
                  loggedInAt: new Date().toISOString()
                };
                localStorage.setItem('luxea_admin_session', JSON.stringify(adminSession));
                localStorage.setItem('luxea_user_session', JSON.stringify(adminSession));
                window.dispatchEvent(new CustomEvent('luxea:auth_changed', { detail: { loggedIn: true, user: adminSession } }));
                updateHeaderAuthState();
                return;
              }
            }
          } catch (e) {}

          // Check if registered Host Partner in lux_hosts
          let hostData = null;
          try {
            const { data: hostRows } = await client
              .from('lux_hosts')
              .select('*')
              .ilike('email', email)
              .limit(1);

            if (hostRows && hostRows.length > 0) {
              hostData = hostRows[0];
            }
          } catch (e) {
            console.warn('Could not query host partner profile:', e);
          }

          let sessionData;
          if (hostData) {
            sessionData = {
              email: hostData.email,
              name: hostData.full_name || fullName,
              refId: hostData.ref_id,
              role: 'host',
              status: hostData.review_status || 'pending_review',
              propertyName: hostData.property_name,
              isSuperAdmin: false,
              authMethod: 'supabase_auth',
              loggedInAt: new Date().toISOString()
            };
          } else {
            sessionData = {
              email: user.email,
              id: user.id,
              name: fullName,
              role: user.user_metadata?.role || 'member',
              isSuperAdmin: false,
              authMethod: 'supabase_auth',
              loggedInAt: new Date().toISOString()
            };
          }

          localStorage.setItem('luxea_user_session', JSON.stringify(sessionData));
          window.dispatchEvent(new CustomEvent('luxea:auth_changed', { detail: { loggedIn: true, user: sessionData } }));
          updateHeaderAuthState();

          // Clean URL hash if returning from OAuth redirect
          if (window.location.hash && window.location.hash.includes('access_token')) {
            window.history.replaceState({}, document.title, window.location.pathname);
            if (window.showToast) {
              window.showToast(`✅ Welcome, ${sessionData.name}!`);
            }
          }
        }
      });
    } catch (err) {
      console.warn('Supabase Auth listener error:', err);
    }
  };

  tryInitListener();
}

/**
 * Update the header UI: Show "Sign In" button or User Profile Pill
 */
export function updateHeaderAuthState() {
  const headerActionsList = document.querySelectorAll('.header-actions');
  const user = getActiveSession();

  headerActionsList.forEach(headerActions => {
    let authContainer = headerActions.querySelector('.lux-header-auth-slot');
    if (!authContainer) {
      authContainer = document.createElement('div');
      authContainer.className = 'lux-header-auth-slot';
      headerActions.insertBefore(authContainer, headerActions.firstChild);
    }

    if (user) {
      const initials = (user.name || user.email || 'U')
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

      const roleLabel = user.isSuperAdmin
        ? 'Super Admin'
        : user.role === 'host'
        ? 'Host Partner'
        : 'VIP Member';

      const roleBadgeClass = user.isSuperAdmin ? 'badge-admin' : user.role === 'host' ? 'badge-host' : 'badge-member';

      authContainer.innerHTML = `
        <div class="lux-user-menu-wrap">
          <button class="lux-user-pill-btn" id="luxUserDropdownToggle" aria-expanded="false" aria-label="Account menu">
            <span class="user-avatar-initials">${user.isSuperAdmin ? '👑' : initials}</span>
            <span class="user-name-short">${user.name ? user.name.split(' ')[0] : 'Account'}</span>
            <span class="user-role-badge ${roleBadgeClass}">${roleLabel}</span>
            <svg class="dropdown-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          <div class="lux-user-dropdown hidden" id="luxUserDropdownMenu">
            <div class="dropdown-user-info">
              <div class="user-info-name">${user.name || 'Ronald Otieno'}</div>
              <div class="user-info-email">${user.email}</div>
              <span class="user-info-role ${roleBadgeClass}">${roleLabel}</span>
            </div>

            <div class="dropdown-divider"></div>

            ${user.isSuperAdmin ? `
              <a href="/admin/" class="dropdown-link active-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                <span>Super Admin Console</span>
              </a>
            ` : ''}

            <a href="/host/" class="dropdown-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
              <span>Host Partner Portal</span>
            </a>

            <a href="/stays/" class="dropdown-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <span>Browse All Stays</span>
            </a>

            <a href="/waitlist/" class="dropdown-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>Founding VIP Pass</span>
            </a>

            <div class="dropdown-divider"></div>

            <button class="dropdown-link dropdown-logout" id="luxGlobalSignOutBtn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      `;

      const toggle = authContainer.querySelector('#luxUserDropdownToggle');
      const menu = authContainer.querySelector('#luxUserDropdownMenu');
      const signOutBtn = authContainer.querySelector('#luxGlobalSignOutBtn');

      toggle?.addEventListener('click', (e) => {
        e.stopPropagation();
        menu?.classList.toggle('hidden');
        toggle.setAttribute('aria-expanded', !menu?.classList.contains('hidden'));
      });

      signOutBtn?.addEventListener('click', async () => {
        await handleSignOut();
      });

    } else {
      authContainer.innerHTML = `
        <button class="btn btn-outline btn-sm lux-auth-trigger-btn" id="openAuthModalHeaderBtn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>Sign In / Join</span>
        </button>
      `;

      const btn = authContainer.querySelector('#openAuthModalHeaderBtn');
      btn?.addEventListener('click', () => {
        window.openAuthModal();
      });
    }
  });

  // Mobile Bottom Nav integration if present
  const mobileNav = document.querySelector('.mobile-bottom-nav');
  if (mobileNav && !mobileNav.querySelector('#mobileAuthNavBtn')) {
    const authNavItem = document.createElement('a');
    authNavItem.href = '#';
    authNavItem.className = 'mobile-nav-item';
    authNavItem.id = 'mobileAuthNavBtn';
    authNavItem.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span>${user ? 'Account' : 'Sign In'}</span>
    `;
    authNavItem.addEventListener('click', (e) => {
      e.preventDefault();
      if (user) {
        if (user.isSuperAdmin) window.location.href = '/admin/';
        else window.openAuthModal();
      } else {
        window.openAuthModal();
      }
    });
    mobileNav.appendChild(authNavItem);
  }
}

/**
 * Get active session
 */
export function getActiveSession() {
  try {
    const adminSess = JSON.parse(localStorage.getItem('luxea_admin_session') || 'null');
    if (adminSess && adminSess.email) return adminSess;

    const userSess = JSON.parse(localStorage.getItem('luxea_user_session') || 'null');
    if (userSess && userSess.email) return userSess;
  } catch (e) {
    return null;
  }
  return null;
}

/**
 * Handle Sign Out across the entire app
 */
export async function handleSignOut() {
  localStorage.removeItem('luxea_admin_session');
  localStorage.removeItem('luxea_user_session');

  const client = window.LuxeaDB ? window.LuxeaDB.getClient() : null;
  if (client && client.auth) {
    try { await client.auth.signOut(); } catch (e) {}
  }

  if (window.LuxeaAuth && window.LuxeaAuth.logoutAdmin) {
    await window.LuxeaAuth.logoutAdmin();
  }

  if (window.showToast) {
    window.showToast('Signed out of Luxea Living.');
  }

  window.dispatchEvent(new CustomEvent('luxea:auth_changed', { detail: { loggedIn: false } }));
  updateHeaderAuthState();

  if (window.location.pathname.startsWith('/admin')) {
    window.location.reload();
  }
}

/**
 * Open the high-end luxury Auth Modal
 * @param {string} preferredRole - 'admin' | 'host' | 'member'
 * @param {string} preferredMode - 'signin' | 'signup' | 'set-password'
 */
window.openAuthModal = function (preferredRole = 'member', preferredMode = 'signin') {
  const modal = document.getElementById('luxAuthModal');
  if (!modal) return;
  modal.classList.add('active');

  setAuthMode(preferredMode);
  selectAuthRole(preferredRole);

  const emailInput = document.getElementById('authModalEmail');
  if (emailInput && !emailInput.value) {
    emailInput.focus();
  }
};

/**
 * Close Auth Modal
 */
window.closeAuthModal = function () {
  const modal = document.getElementById('luxAuthModal');
  modal?.classList.remove('active');
};

let currentAuthMode = 'signin';
let currentAuthRole = 'member';

function setAuthMode(mode) {
  currentAuthMode = mode;
  document.querySelectorAll('.auth-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
  });

  const nameGroup = document.getElementById('authNameGroup');
  const confirmPassGroup = document.getElementById('authConfirmPassGroup');
  const hostRefGroup = document.getElementById('authHostRefGroup');
  const roleTabsWrap = document.getElementById('authRoleTabsWrap');
  const googleBtn = document.getElementById('authGoogleBtn');
  const googleDivider = document.getElementById('authGoogleDivider');
  const submitBtn = document.getElementById('authModalSubmitBtn');
  const btnText = document.getElementById('authBtnText');
  const forgotPassLink = document.getElementById('authForgotPassLink');
  const errorBanner = document.getElementById('authModalError');
  const successBanner = document.getElementById('authModalSuccess');

  errorBanner?.classList.add('hidden');
  successBanner?.classList.add('hidden');

  if (mode === 'signup') {
    nameGroup?.classList.remove('hidden');
    confirmPassGroup?.classList.remove('hidden');
    hostRefGroup?.classList.add('hidden');
    roleTabsWrap?.classList.remove('hidden');
    googleBtn?.classList.remove('hidden');
    googleDivider?.classList.remove('hidden');
    if (forgotPassLink) forgotPassLink.classList.add('hidden');
    if (btnText) btnText.textContent = 'Create Luxea Account';
  } else if (mode === 'set-password') {
    nameGroup?.classList.add('hidden');
    confirmPassGroup?.classList.remove('hidden');
    hostRefGroup?.classList.remove('hidden');
    roleTabsWrap?.classList.add('hidden');
    googleBtn?.classList.add('hidden');
    googleDivider?.classList.add('hidden');
    if (forgotPassLink) forgotPassLink.classList.add('hidden');
    if (btnText) btnText.textContent = 'Set Secure Host Password';
  } else {
    // signin
    nameGroup?.classList.add('hidden');
    confirmPassGroup?.classList.add('hidden');
    hostRefGroup?.classList.add('hidden');
    roleTabsWrap?.classList.remove('hidden');
    googleBtn?.classList.remove('hidden');
    googleDivider?.classList.remove('hidden');
    if (forgotPassLink) forgotPassLink.classList.remove('hidden');
    if (btnText) btnText.textContent = 'Sign In to Luxea';
  }
}

function selectAuthRole(role) {
  currentAuthRole = role;
  document.querySelectorAll('.auth-role-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-role') === role);
  });

  const emailInput = document.getElementById('authModalEmail');
  const passInput = document.getElementById('authModalPassword');
  const roleHint = document.getElementById('authRoleHint');

  if (role === 'admin') {
    if (roleHint) roleHint.innerHTML = '👑 <strong>Super Admin Mode:</strong> Enter your executive credentials or use Google below.';
  } else if (role === 'host') {
    if (roleHint) roleHint.innerHTML = '🏡 <strong>Host Partner:</strong> Enter your property registration email to manage your listings or set your password.';
  } else {
    if (roleHint) roleHint.innerHTML = '💎 <strong>VIP Member:</strong> Sign in or register to unlock private reservations & curated stays.';
  }
}

/**
 * Inject the Luxury Auth Modal markup once into document body
 */
function injectAuthModalHtml() {
  if (document.getElementById('luxAuthModal')) return;

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'luxAuthModal';
  modalOverlay.className = 'lux-modal-overlay lux-auth-modal-overlay';
  modalOverlay.innerHTML = `
    <div class="lux-modal-card lux-auth-modal-card" role="dialog" aria-labelledby="authModalTitle">
      <button class="lux-modal-close" id="closeAuthModalBtn" aria-label="Close modal">✕</button>

      <div class="auth-card-header">
        <div class="auth-brand-badge">
          <span class="auth-monogram">L</span>
        </div>
        <h2 class="auth-modal-title" id="authModalTitle">Welcome to Luxea Living</h2>
        <p class="auth-modal-sub">Curated residences in Kenya • Private guest suite & host command.</p>
      </div>

      <!-- Auth Mode Switcher (Sign In vs Create Account) -->
      <div class="auth-mode-switch">
        <button type="button" class="auth-mode-btn active" data-mode="signin">
          <span>Sign In</span>
        </button>
        <button type="button" class="auth-mode-btn" data-mode="signup">
          <span>Create Account</span>
        </button>
      </div>

      <!-- Role Selector Tabs -->
      <div class="auth-role-tabs" id="authRoleTabsWrap">
        <button type="button" class="auth-role-tab active" data-role="member">
          <span>💎 VIP Member</span>
        </button>
        <button type="button" class="auth-role-tab" data-role="host">
          <span>🏡 Host Partner</span>
        </button>
        <button type="button" class="auth-role-tab" data-role="admin">
          <span>👑 Admin</span>
        </button>
      </div>

      <div id="authRoleHint" class="auth-role-hint">
        💎 <strong>VIP Member:</strong> Sign in or register to unlock private reservations & curated stays.
      </div>

      <!-- Google OAuth Button -->
      <button type="button" class="btn-google-auth-modal" id="authGoogleBtn">
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M12 5c1.7 0 3 .6 4 1.5l3-3C17.2 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
          <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"/>
          <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3.1l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.3 0-6.1-2.2-7.1-5.2L1.2 16c1.8 3.7 5.6 7 10.8 7z"/>
        </svg>
        <span id="authGoogleBtnText">Continue with Google</span>
      </button>

      <div class="auth-divider" id="authGoogleDivider">
        <span>or with email</span>
      </div>

      <!-- Feedback Alerts -->
      <div id="authModalError" class="auth-error-banner hidden"></div>
      <div id="authModalSuccess" class="auth-success-banner hidden"></div>

      <!-- Main Form -->
      <form id="luxGlobalAuthForm" class="auth-modal-form">
        <!-- Full Name (Only for Sign Up) -->
        <div class="form-group hidden" id="authNameGroup">
          <label class="form-label" for="authModalName">Full Name</label>
          <input 
            type="text" 
            id="authModalName" 
            class="form-control" 
            placeholder="e.g. Ronald Otieno" 
            autocomplete="name"
          >
        </div>

        <!-- Host Reference ID (Only for Set Password) -->
        <div class="form-group hidden" id="authHostRefGroup">
          <label class="form-label" for="authModalHostRef">Host Reference ID (Optional)</label>
          <input 
            type="text" 
            id="authModalHostRef" 
            class="form-control" 
            placeholder="e.g. LUX-HOST-2026-XXXX" 
            autocomplete="off"
          >
        </div>

        <!-- Email Address -->
        <div class="form-group">
          <label class="form-label" for="authModalEmail">Email Address</label>
          <input 
            type="email" 
            id="authModalEmail" 
            class="form-control" 
            placeholder="name@example.com" 
            required 
            autocomplete="username"
          >
        </div>

        <!-- Password -->
        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label class="form-label" for="authModalPassword" style="margin-bottom: 0;">Password</label>
            <a href="#" id="authForgotPassLink" class="auth-link-gold" style="font-size: 0.75rem;">Set / Reset Password?</a>
          </div>
          <input 
            type="password" 
            id="authModalPassword" 
            class="form-control" 
            placeholder="Enter password (min. 6 characters)" 
            required 
            autocomplete="current-password"
          >
        </div>

        <!-- Confirm Password (for Sign Up and Set Password) -->
        <div class="form-group hidden" id="authConfirmPassGroup">
          <label class="form-label" for="authModalConfirmPass">Confirm Password</label>
          <input 
            type="password" 
            id="authModalConfirmPass" 
            class="form-control" 
            placeholder="Repeat password" 
            autocomplete="new-password"
          >
        </div>

        <button type="submit" class="btn btn-primary btn-block btn-large" id="authModalSubmitBtn">
          <span id="authBtnText">Sign In to Luxea</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </form>

      <div class="auth-card-footer">
        <span id="authFooterNote">Property owner in Kenya?</span>
        <a href="/host/" class="auth-link-gold" id="authFooterLink">List Your Residence ↗</a>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  // Wire events
  const closeBtn = modalOverlay.querySelector('#closeAuthModalBtn');
  closeBtn?.addEventListener('click', window.closeAuthModal);

  modalOverlay.querySelectorAll('.auth-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setAuthMode(btn.getAttribute('data-mode'));
    });
  });

  modalOverlay.querySelectorAll('.auth-role-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      selectAuthRole(tab.getAttribute('data-role'));
    });
  });

  // Google OAuth button
  const googleBtn = modalOverlay.querySelector('#authGoogleBtn');
  googleBtn?.addEventListener('click', async () => {
    await handleGoogleAuth();
  });

  // Forgot / Set Password link
  const forgotPassLink = modalOverlay.querySelector('#authForgotPassLink');
  forgotPassLink?.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthMode('set-password');
  });

  // Main Form Submit (Sign In, Sign Up, Set Password)
  const form = modalOverlay.querySelector('#luxGlobalAuthForm');
  const emailInput = modalOverlay.querySelector('#authModalEmail');
  const passInput = modalOverlay.querySelector('#authModalPassword');
  const nameInput = modalOverlay.querySelector('#authModalName');
  const confirmPassInput = modalOverlay.querySelector('#authModalConfirmPass');
  const hostRefInput = modalOverlay.querySelector('#authModalHostRef');
  const errorBanner = modalOverlay.querySelector('#authModalError');
  const successBanner = modalOverlay.querySelector('#authModalSuccess');
  const submitBtn = modalOverlay.querySelector('#authModalSubmitBtn');
  const btnText = modalOverlay.querySelector('#authBtnText');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBanner?.classList.add('hidden');
    successBanner?.classList.add('hidden');

    const email = emailInput.value.trim();
    const pass = passInput.value.trim();
    const name = nameInput?.value.trim() || '';
    const confirmPass = confirmPassInput?.value.trim() || '';
    const hostRef = hostRefInput?.value.trim() || '';

    // Password validation for signup or set-password
    if (currentAuthMode === 'signup' || currentAuthMode === 'set-password') {
      if (pass.length < 6) {
        showError('Password must be at least 6 characters long.');
        return;
      }
      if (pass !== confirmPass) {
        showError('Passwords do not match. Please verify and re-type.');
        return;
      }
    }

    submitBtn.disabled = true;
    btnText.textContent = currentAuthMode === 'signup' 
      ? 'Creating Account...' 
      : currentAuthMode === 'set-password' 
      ? 'Encrypting Password...' 
      : 'Verifying...';

    try {
      const client = window.LuxeaDB ? window.LuxeaDB.getClient() : null;

      // =========================================================================
      // MODE 1: CREATE ACCOUNT (SIGN UP)
      // =========================================================================
      if (currentAuthMode === 'signup') {
        if (!name) {
          showError('Please provide your full name.');
          submitBtn.disabled = false;
          btnText.textContent = 'Create Luxea Account';
          return;
        }

        // 1. Ensure user is provisioned in Supabase Authentication tab (auth.users) with email_confirm: true
        if (window.LuxeaDB && typeof window.LuxeaDB.syncAuthUser === 'function') {
          try {
            await window.LuxeaDB.syncAuthUser({
              email: email,
              name: name,
              role: currentAuthRole,
              password: pass,
              source: 'signup_modal'
            });
          } catch (e) {
            console.warn('Sync auth user notice:', e);
          }
        }

        if (client && client.auth) {
          // Attempt sign in directly since user is confirmed via admin API, or fallback to signUp
          let { data, error } = await client.auth.signInWithPassword({
            email: email,
            password: pass
          });

          if (error) {
            const signupRes = await client.auth.signUp({
              email: email,
              password: pass,
              options: {
                data: {
                  full_name: name,
                  role: currentAuthRole
                }
              }
            });
            data = signupRes.data;
            error = signupRes.error;
          }

          if (error) {
            if (error.message && error.message.includes('already registered')) {
              showError('An account with this email already exists. Please switch to Sign In or Set Password.');
            } else {
              showError(error.message);
            }
            return;
          }

          // If session is returned immediately (email confirmation disabled/auto-confirmed)
          if (data && data.session && data.user) {
            let sessionData = {
              email: data.user.email,
              id: data.user.id,
              name: name,
              role: currentAuthRole,
              isSuperAdmin: email.toLowerCase() === 'otienoronny56@gmail.com',
              authMethod: 'supabase_auth',
              loggedInAt: new Date().toISOString()
            };

            // If registered as host, link property if available
            if (currentAuthRole === 'host') {
              try {
                const { data: hostRows } = await client
                  .from('lux_hosts')
                  .select('*')
                  .ilike('email', email)
                  .limit(1);

                if (hostRows && hostRows.length > 0) {
                  sessionData.status = hostRows[0].review_status;
                  sessionData.refId = hostRows[0].ref_id;
                  sessionData.propertyName = hostRows[0].property_name;
                }
              } catch (e) {}
            }

            localStorage.setItem('luxea_user_session', JSON.stringify(sessionData));
            window.dispatchEvent(new CustomEvent('luxea:auth_changed', { detail: { loggedIn: true, user: sessionData } }));
            window.closeAuthModal();

            if (window.showToast) {
              window.showToast(`✅ Welcome to Luxea Living, ${name}!`);
            }
            updateHeaderAuthState();
            return;
          }

          // If email confirmation is required by Supabase
          showSuccess(`🎉 Account created! We've sent a verification link to <strong>${email}</strong>. Please check your inbox to activate your account.`);
          submitBtn.classList.add('hidden');
          return;

        } else {
          // Fallback local session if Supabase Auth client isn't configured
          const sessionData = {
            email: email,
            name: name,
            role: currentAuthRole,
            isSuperAdmin: false,
            authMethod: 'local',
            loggedInAt: new Date().toISOString()
          };
          localStorage.setItem('luxea_user_session', JSON.stringify(sessionData));
          window.dispatchEvent(new CustomEvent('luxea:auth_changed', { detail: { loggedIn: true, user: sessionData } }));
          window.closeAuthModal();
          if (window.showToast) window.showToast(`✅ Welcome, ${name}!`);
          updateHeaderAuthState();
          return;
        }
      }

      // =========================================================================
      // MODE 2: PROPERTY OWNER / HOST SET PASSWORD
      // =========================================================================
      if (currentAuthMode === 'set-password') {
        let hostMatch = null;

        // Verify host in lux_hosts
        if (client) {
          try {
            let query = client.from('lux_hosts').select('*').ilike('email', email);
            if (hostRef) query = query.eq('ref_id', hostRef);
            const { data: hostRows } = await query.limit(1);
            if (hostRows && hostRows.length > 0) {
              hostMatch = hostRows[0];
            }
          } catch (e) {}
        }

        // Guarantee host is provisioned in Supabase Authentication tab (auth.users)
        if (window.LuxeaDB && typeof window.LuxeaDB.syncAuthUser === 'function') {
          try {
            await window.LuxeaDB.syncAuthUser({
              email: email,
              name: hostMatch ? hostMatch.full_name : email.split('@')[0],
              role: 'host',
              password: pass,
              phone: hostMatch ? hostMatch.phone : '',
              source: 'host_set_password'
            });
          } catch (e) {
            console.warn('Host auth sync notice:', e);
          }
        }

        if (client && client.auth) {
          // Attempt direct sign in with new password
          const { error: signInErr } = await client.auth.signInWithPassword({ email, password: pass });
          if (signInErr) {
            // Fallback to signUp or password reset if needed
            await client.auth.signUp({
              email: email,
              password: pass,
              options: {
                data: {
                  full_name: hostMatch ? hostMatch.full_name : email.split('@')[0],
                  role: 'host',
                  ref_id: hostMatch ? hostMatch.ref_id : hostRef
                }
              }
            });
          }
        }

        // Establish Host Partner session
        const hostSession = {
          email: email,
          name: hostMatch ? hostMatch.full_name : email.split('@')[0],
          role: 'host',
          refId: hostMatch ? hostMatch.ref_id : hostRef,
          status: hostMatch ? hostMatch.review_status : 'pending_review',
          propertyName: hostMatch ? hostMatch.property_name : 'Residence',
          isSuperAdmin: false,
          authMethod: 'password_set',
          loggedInAt: new Date().toISOString()
        };

        localStorage.setItem('luxea_user_session', JSON.stringify(hostSession));
        window.dispatchEvent(new CustomEvent('luxea:auth_changed', { detail: { loggedIn: true, user: hostSession } }));
        window.closeAuthModal();

        if (window.showToast) {
          window.showToast(`🏡 Password set! Welcome to your Host Partner Suite.`);
        }
        updateHeaderAuthState();
        return;
      }

      // =========================================================================
      // MODE 3: SIGN IN
      // =========================================================================
      // 1. Super Admin check
      const SUPER_ADMINS_LIST = ['otienoronny56@gmail.com', 'dennbarasa@gmail.com'];
      const cleanEmail = email.toLowerCase().trim();
      if (SUPER_ADMINS_LIST.includes(cleanEmail) && pass === 'Luxeaadmin') {
        const defaultName = cleanEmail === 'dennbarasa@gmail.com' ? 'Dennis Barasa' : 'Ronald Otieno';
        const sessionData = {
          email: cleanEmail,
          name: defaultName,
          role: 'super_admin',
          isSuperAdmin: true,
          loggedInAt: new Date().toISOString()
        };
        localStorage.setItem('luxea_admin_session', JSON.stringify(sessionData));
        localStorage.setItem('luxea_user_session', JSON.stringify(sessionData));

        window.dispatchEvent(new CustomEvent('luxea:auth_changed', { detail: { loggedIn: true, user: sessionData } }));
        window.closeAuthModal();

        if (window.showToast) window.showToast(`✅ Welcome back, Super Admin ${defaultName.split(' ')[0]}!`);
        setTimeout(() => { window.location.href = '/admin/'; }, 300);
        return;
      }

      // 2. Supabase Auth SignIn with Password
      if (client && client.auth) {
        let { data, error } = await client.auth.signInWithPassword({
          email: email,
          password: pass
        });

        // If credentials failed or user was not yet in auth.users, attempt sync via Edge Function & retry
        if (error) {
          if (window.LuxeaDB && typeof window.LuxeaDB.syncAuthUser === 'function') {
            try {
              // Look up if user has a name in lux_hosts or lux_waitlist
              let existingName = email.split('@')[0];
              let userRole = currentAuthRole;
              const { data: hRows } = await client.from('lux_hosts').select('full_name').ilike('email', email).limit(1);
              if (hRows && hRows.length > 0) {
                existingName = hRows[0].full_name;
                userRole = 'host';
              } else {
                const { data: wRows } = await client.from('lux_waitlist').select('full_name').ilike('email', email).limit(1);
                if (wRows && wRows.length > 0) existingName = wRows[0].full_name;
              }

              await window.LuxeaDB.syncAuthUser({
                email: email,
                name: existingName,
                role: userRole,
                password: pass,
                source: 'login_sync'
              });

              // Retry sign in with newly set password
              const retry = await client.auth.signInWithPassword({
                email: email,
                password: pass
              });
              if (!retry.error && retry.data) {
                data = retry.data;
                error = null;
              }
            } catch (syncErr) {
              console.warn('Auth sync on login notice:', syncErr);
            }
          }
        }

        if (!error && data && data.user) {
          let role = data.user.user_metadata?.role || currentAuthRole;
          let hostInfo = null;


          // Check role from lux_profiles
          try {
            const { data: prof } = await client
              .from('lux_profiles')
              .select('role, full_name')
              .eq('id', data.user.id)
              .maybeSingle();
            if (prof && prof.role) role = prof.role;
          } catch (e) {}

          // Check if host
          try {
            const { data: hostRows } = await client
              .from('lux_hosts')
              .select('*')
              .ilike('email', email)
              .limit(1);

            if (hostRows && hostRows.length > 0) {
              if (role !== 'super_admin' && role !== 'admin') role = 'host';
              hostInfo = hostRows[0];
            }
          } catch (e) {}

          const isSuperAdmin = SUPER_ADMINS_LIST.includes(cleanEmail) || role === 'super_admin';
          const defaultAdminName = cleanEmail === 'dennbarasa@gmail.com' ? 'Dennis Barasa' : 'Ronald Otieno';

          const sessionData = {
            email: data.user.email,
            id: data.user.id,
            name: data.user.user_metadata?.full_name || hostInfo?.full_name || (isSuperAdmin ? defaultAdminName : email.split('@')[0]),
            role: isSuperAdmin ? 'super_admin' : role,
            status: hostInfo ? hostInfo.review_status : undefined,
            refId: hostInfo ? hostInfo.ref_id : undefined,
            propertyName: hostInfo ? hostInfo.property_name : undefined,
            isSuperAdmin: isSuperAdmin,
            authMethod: 'supabase_auth',
            loggedInAt: new Date().toISOString()
          };

          localStorage.setItem('luxea_user_session', JSON.stringify(sessionData));
          if (sessionData.isSuperAdmin) {
            localStorage.setItem('luxea_admin_session', JSON.stringify(sessionData));
          }

          window.dispatchEvent(new CustomEvent('luxea:auth_changed', { detail: { loggedIn: true, user: sessionData } }));
          window.closeAuthModal();

          if (window.showToast) window.showToast(`✅ Welcome back, ${sessionData.name}!`);
          updateHeaderAuthState();
          return;
        }
      }

      // 3. Fallback: Host Partner Check in lux_hosts table
      if (client) {
        const { data: hostRows } = await client
          .from('lux_hosts')
          .select('*')
          .ilike('email', email)
          .limit(1);

        if (hostRows && hostRows.length > 0) {
          const host = hostRows[0];
          const isApproved = host.review_status === 'approved';
          const sessionData = {
            email: host.email,
            name: host.full_name,
            refId: host.ref_id,
            role: 'host',
            status: host.review_status || 'pending_review',
            propertyName: host.property_name,
            isSuperAdmin: false,
            authMethod: 'host_match',
            loggedInAt: new Date().toISOString()
          };

          localStorage.setItem('luxea_user_session', JSON.stringify(sessionData));
          window.dispatchEvent(new CustomEvent('luxea:auth_changed', { detail: { loggedIn: true, user: sessionData } }));
          window.closeAuthModal();

          if (isApproved) {
            if (window.showToast) window.showToast(`🏡 Welcome, Verified Host Partner ${host.full_name}!`);
          } else {
            if (window.showToast) window.showToast(`⏳ Welcome, ${host.full_name}. Your host application is under review.`);
          }
          updateHeaderAuthState();
          return;
        }
      }

      // If credentials failed
      showError('Invalid email or password. If you are a host, use "Set / Reset Password" above.');

    } catch (err) {
      console.error('Auth submit error:', err);
      showError('An unexpected error occurred. Please try again.');
    } finally {
      submitBtn.disabled = false;
      btnText.textContent = currentAuthMode === 'signup' 
        ? 'Create Luxea Account' 
        : currentAuthMode === 'set-password' 
        ? 'Set Secure Host Password' 
        : 'Sign In to Luxea';
    }
  });

  function showError(msg) {
    if (errorBanner) {
      errorBanner.innerHTML = msg;
      errorBanner.classList.remove('hidden');
    }
    if (successBanner) successBanner.classList.add('hidden');
  }

  function showSuccess(msg) {
    if (successBanner) {
      successBanner.innerHTML = msg;
      successBanner.classList.remove('hidden');
    }
    if (errorBanner) errorBanner.classList.add('hidden');
  }

  async function handleGoogleAuth() {
    const client = window.LuxeaDB ? window.LuxeaDB.getClient() : null;
    if (!client || !client.auth) {
      showError('Authentication service is initializing. Please try again in a moment.');
      return;
    }

    try {
      const googleBtnText = document.getElementById('authGoogleBtnText');
      if (googleBtnText) googleBtnText.textContent = 'Connecting with Google...';

      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname
        }
      });

      if (error) {
        if (error.message && (error.message.includes('not enabled') || error.message.includes('provider is not enabled'))) {
          showError('Google Sign-In is awaiting provider activation in Supabase Dashboard. You can create an account with email & password below in 10 seconds.');
        } else {
          showError(error.message || 'Google authentication error. Please use email & password.');
        }
        if (googleBtnText) googleBtnText.textContent = 'Continue with Google';
      }
    } catch (e) {
      console.error('Google OAuth error:', e);
      showError('Could not start Google sign in. Please use email and password below.');
    }
  }

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.lux-user-menu-wrap')) {
      document.querySelectorAll('.lux-user-dropdown').forEach(m => m.classList.add('hidden'));
      document.querySelectorAll('#luxUserDropdownToggle').forEach(t => t.setAttribute('aria-expanded', 'false'));
    }
  });
}
