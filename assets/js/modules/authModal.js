/**
 * LUXEA LIVING — HARDENED GLOBAL AUTHENTICATION SUITE (authModal.js)
 * Security controls:
 * 1. Zero hardcoded admin emails/passwords or client-side bypasses
 * 2. Zero password overwrite on failed sign-in (syncAuthUser permanently removed)
 * 3. Password resets strictly via Supabase Auth email verification (resetPasswordForEmail)
 * 4. Roles strictly derived from server-verified public.lux_profiles (never user_metadata)
 * 5. All user strings HTML-escaped before rendering
 */

let activeVerifiedUser = null;

function esc(val) {
  if (window.LuxeaSanitize) return window.LuxeaSanitize.escapeHtml(val);
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function initAuthSuite() {
  injectAuthModalHtml();
  updateHeaderAuthState();

  window.addEventListener('luxea:auth_changed', () => {
    updateHeaderAuthState();
  });

  initSupabaseAuthListener();
}

export function redirectUserToPortal(session) {
  if (!session) return;
  if (session.role === 'super_admin' || session.role === 'admin') {
    if (!window.location.pathname.startsWith('/admin')) {
      setTimeout(() => { window.location.href = '/admin'; }, 250);
    }
    return;
  }
  if (session.role === 'host') {
    if (!window.location.pathname.startsWith('/host')) {
      setTimeout(() => { window.location.href = '/host?mode=manage'; }, 250);
    }
    return;
  }
  if (window.location.pathname === '/' || window.location.pathname.includes('/login') || window.location.pathname.includes('/waitlist')) {
    setTimeout(() => { window.location.href = '/stays'; }, 250);
  }
}

async function resolveVerifiedSession(client) {
  if (!client || !client.auth) return null;
  try {
    const { data: userData, error } = await client.auth.getUser();
    if (error || !userData?.user) return null;

    const user = userData.user;
    const { data: profile } = await client
      .from('lux_profiles')
      .select('id, email, full_name, role, is_suspended')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.is_suspended) {
      await client.auth.signOut().catch(() => {});
      return null;
    }

    const role = profile?.role || 'member';
    const fullName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Member';

    let hostInfo = null;
    if (role === 'host') {
      const { data: hostRows } = await client
        .from('lux_hosts')
        .select('ref_id, property_name, review_status')
        .eq('user_id', user.id)
        .limit(1);
      if (hostRows && hostRows.length > 0) hostInfo = hostRows[0];
    }

    return {
      id: user.id,
      email: user.email,
      name: fullName,
      role,
      isSuperAdmin: role === 'super_admin' || role === 'admin',
      refId: hostInfo?.ref_id,
      status: hostInfo?.review_status,
      propertyName: hostInfo?.property_name,
      authMethod: 'supabase_auth'
    };
  } catch (e) {
    return null;
  }
}

function initSupabaseAuthListener() {
  const tryInitListener = () => {
    const client = window.LuxeaDB ? window.LuxeaDB.getClient() : null;
    if (!client || !client.auth) {
      setTimeout(tryInitListener, 250);
      return;
    }

    // Hydrate current verified session on page load
    resolveVerifiedSession(client).then((sess) => {
      activeVerifiedUser = sess;
      updateHeaderAuthState();
    });

    client.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        activeVerifiedUser = null;
        updateHeaderAuthState();
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const verified = await resolveVerifiedSession(client);
        activeVerifiedUser = verified;
        window.dispatchEvent(new CustomEvent('luxea:auth_changed', { detail: { loggedIn: !!verified, user: verified } }));
        updateHeaderAuthState();

        if (window.location.hash && window.location.hash.includes('access_token')) {
          window.history.replaceState({}, document.title, window.location.pathname);
          if (verified && window.showToast) {
            window.showToast(`✅ Welcome, ${verified.name}!`);
          }
          if (verified) redirectUserToPortal(verified);
        }
      }
    });
  };

  tryInitListener();
}

export function getActiveSession() {
  return activeVerifiedUser;
}

export function updateHeaderAuthState() {
  const headerActionsList = document.querySelectorAll('.header-actions');
  const user = getActiveSession();

  headerActionsList.forEach((headerActions) => {
    let authContainer = headerActions.querySelector('.lux-header-auth-slot');
    if (!authContainer) {
      authContainer = document.createElement('div');
      authContainer.className = 'lux-header-auth-slot';
      headerActions.insertBefore(authContainer, headerActions.firstChild);
    }

    if (user) {
      const safeName = esc(user.name || 'Member');
      const safeEmail = esc(user.email || '');
      const firstInitial = esc((user.name ? user.name.trim()[0] : (user.email ? user.email[0] : 'L')).toUpperCase());

      const isAdmin = user.role === 'super_admin' || user.role === 'admin';
      const roleLabel = user.role === 'super_admin'
        ? 'Super Admin'
        : user.role === 'admin'
        ? 'System Admin'
        : user.role === 'host'
        ? 'Host Partner'
        : 'VIP Member';
      const roleBadgeClass = isAdmin ? 'badge-admin' : user.role === 'host' ? 'badge-host' : 'badge-member';

      authContainer.innerHTML = `
        <div class="lux-user-menu-wrap">
          <button class="lux-user-avatar-btn" id="luxUserDropdownToggle" aria-expanded="false" aria-label="Account menu: ${safeName}" title="${safeName} (${roleLabel})">
            <span class="user-avatar-initial">${firstInitial}</span>
            ${isAdmin ? '<span class="avatar-crown-indicator" title="Admin">👑</span>' : ''}
          </button>

          <div class="lux-user-dropdown hidden" id="luxUserDropdownMenu">
            <div class="dropdown-user-info">
              <div class="user-info-name">${safeName}</div>
              <div class="user-info-email">${safeEmail}</div>
              <span class="user-info-role ${roleBadgeClass}">${roleLabel}</span>
            </div>

            <div class="dropdown-divider"></div>

            ${isAdmin ? `
              <a href="/admin" class="dropdown-link active-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                <span>Super Admin Console</span>
              </a>
              <a href="/host?mode=manage" class="dropdown-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                <span>Host Partner Suite</span>
              </a>
            ` : user.role === 'host' ? `
              <a href="/host?mode=manage" class="dropdown-link active-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                <span>Host Suite Dashboard</span>
              </a>
              <a href="/host" class="dropdown-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                <span>Register Another Property</span>
              </a>
            ` : ''}

            <a href="/stays" class="dropdown-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <span>Browse All Stays</span>
            </a>

            <a href="/trips" class="dropdown-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              <span>My Trips</span>
            </a>

            ${user.role !== 'host' && !isAdmin ? `
              <a href="/host" class="dropdown-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                <span>Host with Luxea</span>
              </a>
            ` : ''}

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
        toggle.setAttribute('aria-expanded', String(!menu?.classList.contains('hidden')));
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

      authContainer.querySelector('#openAuthModalHeaderBtn')?.addEventListener('click', () => {
        window.openAuthModal();
      });
    }
  });

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
      if (activeVerifiedUser) {
        if (activeVerifiedUser.isSuperAdmin || activeVerifiedUser.role === 'admin') window.location.href = '/admin';
        else if (activeVerifiedUser.role === 'host') window.location.href = '/host?mode=manage';
        else window.openAuthModal();
      } else {
        window.openAuthModal();
      }
    });
    mobileNav.appendChild(authNavItem);
  }
}

export async function handleSignOut() {
  activeVerifiedUser = null;
  if (window.LuxeaAuth && window.LuxeaAuth.logoutAdmin) {
    await window.LuxeaAuth.logoutAdmin();
  } else {
    const client = window.LuxeaDB ? window.LuxeaDB.getClient() : null;
    if (client && client.auth) {
      try { await client.auth.signOut(); } catch (e) {}
    }
  }

  if (window.showToast) window.showToast('Signed out of Luxea Living.');
  window.dispatchEvent(new CustomEvent('luxea:auth_changed', { detail: { loggedIn: false } }));
  updateHeaderAuthState();

  if (window.location.pathname.startsWith('/admin')) {
    window.location.reload();
  }
}

window.openAuthModal = function (preferredRole = 'member', preferredMode = 'signin') {
  const modal = document.getElementById('luxAuthModal');
  if (!modal) return;
  modal.classList.add('active');
  setAuthMode(preferredMode);
  const emailInput = document.getElementById('authModalEmail');
  if (emailInput && !emailInput.value) emailInput.focus();
};

window.closeAuthModal = function () {
  document.getElementById('luxAuthModal')?.classList.remove('active');
};

let currentAuthMode = 'signin';

function setAuthMode(mode) {
  currentAuthMode = mode;
  document.querySelectorAll('.auth-mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
  });

  const nameGroup = document.getElementById('authNameGroup');
  const passGroup = document.getElementById('authPassGroup');
  const confirmPassGroup = document.getElementById('authConfirmPassGroup');
  const googleBtn = document.getElementById('authGoogleBtn');
  const googleDivider = document.getElementById('authGoogleDivider');
  const btnText = document.getElementById('authBtnText');
  const forgotPassLink = document.getElementById('authForgotPassLink');
  const passInput = document.getElementById('authModalPassword');
  const submitBtn = document.getElementById('authModalSubmitBtn');

  document.getElementById('authModalError')?.classList.add('hidden');
  document.getElementById('authModalSuccess')?.classList.add('hidden');
  submitBtn?.classList.remove('hidden');

  if (mode === 'signup') {
    nameGroup?.classList.remove('hidden');
    passGroup?.classList.remove('hidden');
    confirmPassGroup?.classList.remove('hidden');
    googleBtn?.classList.remove('hidden');
    googleDivider?.classList.remove('hidden');
    forgotPassLink?.classList.add('hidden');
    if (passInput) passInput.required = true;
    if (btnText) btnText.textContent = 'Create Luxea Account';
  } else if (mode === 'reset') {
    nameGroup?.classList.add('hidden');
    passGroup?.classList.add('hidden');
    confirmPassGroup?.classList.add('hidden');
    googleBtn?.classList.add('hidden');
    googleDivider?.classList.add('hidden');
    forgotPassLink?.classList.add('hidden');
    if (passInput) passInput.required = false;
    if (btnText) btnText.textContent = 'Send Secure Reset Link';
  } else {
    nameGroup?.classList.add('hidden');
    passGroup?.classList.remove('hidden');
    confirmPassGroup?.classList.add('hidden');
    googleBtn?.classList.remove('hidden');
    googleDivider?.classList.remove('hidden');
    forgotPassLink?.classList.remove('hidden');
    if (passInput) passInput.required = true;
    if (btnText) btnText.textContent = 'Sign In to Luxea';
  }
}

function injectAuthModalHtml() {
  if (document.getElementById('luxAuthModal')) return;

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'luxAuthModal';
  modalOverlay.className = 'lux-modal-overlay lux-auth-modal-overlay';
  modalOverlay.innerHTML = `
    <div class="lux-modal-card lux-auth-modal-card" role="dialog" aria-labelledby="authModalTitle">
      <button class="lux-modal-close" id="closeAuthModalBtn" aria-label="Close modal">✕</button>

      <div class="auth-card-header">
        <div class="auth-brand-badge"><span class="auth-monogram">L</span></div>
        <h2 class="auth-modal-title" id="authModalTitle">Welcome to Luxea Living</h2>
        <p class="auth-modal-sub">Curated residences in Kenya • Verified guest &amp; host access.</p>
      </div>

      <div class="auth-mode-switch">
        <button type="button" class="auth-mode-btn active" data-mode="signin"><span>Sign In</span></button>
        <button type="button" class="auth-mode-btn" data-mode="signup"><span>Create Account</span></button>
      </div>

      <button type="button" class="btn-google-auth-modal" id="authGoogleBtn">
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M12 5c1.7 0 3 .6 4 1.5l3-3C17.2 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
          <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"/>
          <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3.1l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.3 0-6.1-2.2-7.1-5.2L1.2 16c1.8 3.7 5.6 7 10.8 7z"/>
        </svg>
        <span id="authGoogleBtnText">Continue with Google</span>
      </button>

      <div class="auth-divider" id="authGoogleDivider"><span>or with email</span></div>

      <div id="authModalError" class="auth-error-banner hidden"></div>
      <div id="authModalSuccess" class="auth-success-banner hidden"></div>

      <form id="luxGlobalAuthForm" class="auth-modal-form">
        <div class="form-group hidden" id="authNameGroup">
          <label class="form-label" for="authModalName">Full Name</label>
          <input type="text" id="authModalName" class="form-control" placeholder="e.g. Amina Hassan" autocomplete="name">
        </div>

        <div class="form-group">
          <label class="form-label" for="authModalEmail">Email Address</label>
          <input type="email" id="authModalEmail" class="form-control" placeholder="name@example.com" required autocomplete="username">
        </div>

        <div class="form-group" id="authPassGroup">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label class="form-label" for="authModalPassword" style="margin-bottom: 0;">Password</label>
            <a href="#" id="authForgotPassLink" class="auth-link-gold" style="font-size: 0.75rem;">Forgot / Reset Password?</a>
          </div>
          <input type="password" id="authModalPassword" class="form-control" placeholder="Min. 10 characters" required minlength="8" autocomplete="current-password">
        </div>

        <div class="form-group hidden" id="authConfirmPassGroup">
          <label class="form-label" for="authModalConfirmPass">Confirm Password</label>
          <input type="password" id="authModalConfirmPass" class="form-control" placeholder="Repeat password" autocomplete="new-password">
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

  modalOverlay.querySelector('#closeAuthModalBtn')?.addEventListener('click', window.closeAuthModal);
  modalOverlay.querySelectorAll('.auth-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => setAuthMode(btn.getAttribute('data-mode')));
  });
  modalOverlay.querySelector('#authGoogleBtn')?.addEventListener('click', handleGoogleAuth);
  modalOverlay.querySelector('#authForgotPassLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthMode('reset');
  });

  const form = modalOverlay.querySelector('#luxGlobalAuthForm');
  const emailInput = modalOverlay.querySelector('#authModalEmail');
  const passInput = modalOverlay.querySelector('#authModalPassword');
  const nameInput = modalOverlay.querySelector('#authModalName');
  const confirmPassInput = modalOverlay.querySelector('#authModalConfirmPass');
  const errorBanner = modalOverlay.querySelector('#authModalError');
  const successBanner = modalOverlay.querySelector('#authModalSuccess');
  const submitBtn = modalOverlay.querySelector('#authModalSubmitBtn');
  const btnText = modalOverlay.querySelector('#authBtnText');

  function showError(msg) {
    if (errorBanner) {
      errorBanner.textContent = msg;
      errorBanner.classList.remove('hidden');
    }
    successBanner?.classList.add('hidden');
  }

  function showSuccess(msg) {
    if (successBanner) {
      successBanner.textContent = msg;
      successBanner.classList.remove('hidden');
    }
    errorBanner?.classList.add('hidden');
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBanner?.classList.add('hidden');
    successBanner?.classList.add('hidden');

    const email = emailInput.value.trim().toLowerCase();
    const pass = passInput.value;
    const name = nameInput?.value.trim() || '';
    const confirmPass = confirmPassInput?.value || '';

    const client = window.LuxeaDB ? window.LuxeaDB.getClient() : null;
    if (!client || !client.auth) {
      showError('Authentication service unavailable. Please refresh.');
      return;
    }

    submitBtn.disabled = true;

    try {
      // MODE 1: PASSWORD RESET (Verified Email Ownership Only)
      if (currentAuthMode === 'reset') {
        btnText.textContent = 'Sending Reset Link...';
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/host/activate`
        });
        if (error) {
          showError(error.message || 'Unable to send reset link.');
          return;
        }
        showSuccess(`If an account exists for ${email}, a secure password reset link has been sent to your inbox.`);
        submitBtn.classList.add('hidden');
        return;
      }

      // MODE 2: CREATE ACCOUNT (Server trigger enforces least-privilege 'member' role)
      if (currentAuthMode === 'signup') {
        if (!name) {
          showError('Please provide your full name.');
          return;
        }
        if (pass.length < 10) {
          showError('Password must be at least 10 characters long.');
          return;
        }
        if (pass !== confirmPass) {
          showError('Passwords do not match.');
          return;
        }

        btnText.textContent = 'Creating Account...';
        const { data, error } = await client.auth.signUp({
          email,
          password: pass,
          options: {
            data: { full_name: name }
          }
        });

        if (error) {
          showError(error.message || 'Could not create account.');
          return;
        }

        if (data?.session && data?.user) {
          const verified = await resolveVerifiedSession(client);
          activeVerifiedUser = verified;
          window.closeAuthModal();
          if (window.showToast) window.showToast(`✅ Welcome to Luxea Living, ${name}!`);
          updateHeaderAuthState();
          if (verified) redirectUserToPortal(verified);
          return;
        }

        showSuccess(`Account created! Please check ${email} to verify your email address.`);
        submitBtn.classList.add('hidden');
        return;
      }

      // MODE 3: STRICT SIGN IN (Real Supabase Auth Password Verification Only)
      btnText.textContent = 'Verifying...';
      const { data, error } = await client.auth.signInWithPassword({ email, password: pass });

      if (error || !data?.user) {
        showError('Invalid email or password. Use "Forgot / Reset Password?" if you need to reset it.');
        return;
      }

      const verified = await resolveVerifiedSession(client);
      if (!verified) {
        showError('This account is suspended or could not be verified.');
        return;
      }

      activeVerifiedUser = verified;
      window.dispatchEvent(new CustomEvent('luxea:auth_changed', { detail: { loggedIn: true, user: verified } }));
      window.closeAuthModal();
      if (window.showToast) window.showToast(`✅ Welcome back, ${verified.name}!`);
      updateHeaderAuthState();
      redirectUserToPortal(verified);
    } catch (err) {
      showError('An unexpected authentication error occurred. Please try again.');
    } finally {
      submitBtn.disabled = false;
      btnText.textContent =
        currentAuthMode === 'signup' ? 'Create Luxea Account' :
        currentAuthMode === 'reset' ? 'Send Secure Reset Link' :
        'Sign In to Luxea';
    }
  });

  async function handleGoogleAuth() {
    const client = window.LuxeaDB ? window.LuxeaDB.getClient() : null;
    if (!client || !client.auth) {
      showError('Authentication service is initializing. Please try again.');
      return;
    }

    const googleBtnText = document.getElementById('authGoogleBtnText');
    if (googleBtnText) googleBtnText.textContent = 'Connecting with Google...';

    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    });

    if (error) {
      showError(error.message || 'Google authentication unavailable. Please use email and password.');
      if (googleBtnText) googleBtnText.textContent = 'Continue with Google';
    }
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.lux-user-menu-wrap')) {
      document.querySelectorAll('.lux-user-dropdown').forEach((m) => m.classList.add('hidden'));
      document.querySelectorAll('#luxUserDropdownToggle').forEach((t) => t.setAttribute('aria-expanded', 'false'));
    }
  });
}
