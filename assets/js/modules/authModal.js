/**
 * LUXEA LIVING — GLOBAL AUTHENTICATION & ACCOUNT SUITE (authModal.js)
 * Manages:
 * 1. Global Header Sign-In button and User Account Dropdown
 * 2. High-end Luxury Auth Modal with Super Admin, Host Partner & Guest VIP access
 * 3. Fast one-click role presets for testing
 * 4. Multi-page session synchronization across all routes
 */

export function initAuthSuite() {
  injectAuthModalHtml();
  updateHeaderAuthState();

  // Listen to auth state changes across tabs/windows
  window.addEventListener('luxea:auth_changed', () => {
    updateHeaderAuthState();
  });

  window.addEventListener('storage', (e) => {
    if (e.key === 'luxea_admin_session' || e.key === 'luxea_user_session') {
      updateHeaderAuthState();
    }
  });
}

/**
 * Update the header UI: Show "Sign In" button or User Profile Pill
 */
export function updateHeaderAuthState() {
  const headerActionsList = document.querySelectorAll('.header-actions');
  const user = getActiveSession();

  headerActionsList.forEach(headerActions => {
    // Check if auth container already exists
    let authContainer = headerActions.querySelector('.lux-header-auth-slot');
    if (!authContainer) {
      authContainer = document.createElement('div');
      authContainer.className = 'lux-header-auth-slot';
      // Insert right before the last action item or append
      headerActions.insertBefore(authContainer, headerActions.firstChild);
    }

    if (user) {
      // User is logged in: Render profile pill & dropdown
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

      // Wire dropdown toggle
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
      // User is logged out: Render "Sign In" button
      authContainer.innerHTML = `
        <button class="btn btn-outline btn-sm lux-auth-trigger-btn" id="openAuthModalHeaderBtn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>Sign In</span>
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
 * Get active session (Super admin or general user)
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

  if (window.LuxeaAuth && window.LuxeaAuth.logoutAdmin) {
    await window.LuxeaAuth.logoutAdmin();
  }

  if (window.showToast) {
    window.showToast('Signed out of Luxea Living.');
  }

  window.dispatchEvent(new CustomEvent('luxea:auth_changed', { detail: { loggedIn: false } }));
  updateHeaderAuthState();

  // If currently on admin console, reload or show gateway
  if (window.location.pathname.startsWith('/admin')) {
    window.location.reload();
  }
}

/**
 * Open the high-end luxury Auth Modal
 */
window.openAuthModal = function (preferredRole = 'admin') {
  const modal = document.getElementById('luxAuthModal');
  if (!modal) return;
  modal.classList.add('active');

  // Set role preset tab
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

function selectAuthRole(role) {
  document.querySelectorAll('.auth-role-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-role') === role);
  });

  const emailInput = document.getElementById('authModalEmail');
  const passInput = document.getElementById('authModalPassword');
  const roleHint = document.getElementById('authRoleHint');

  if (role === 'admin') {
    if (emailInput) emailInput.value = 'otienoronny56@gmail.com';
    if (passInput) passInput.value = 'Luxeaadmin';
    if (roleHint) roleHint.innerHTML = '👑 <strong>Super Admin Mode:</strong> Pre-filled with your authorized credentials.';
  } else if (role === 'host') {
    if (emailInput) emailInput.value = '';
    if (passInput) passInput.value = '';
    if (roleHint) roleHint.innerHTML = '🏡 <strong>Host Partner:</strong> Enter the email registered with your Luxea property.';
  } else {
    if (emailInput) emailInput.value = '';
    if (passInput) passInput.value = '';
    if (roleHint) roleHint.innerHTML = '💎 <strong>VIP Founding Member:</strong> Enter your member email to access VIP bookings.';
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
        <p class="auth-modal-sub">Sign in to your Super Admin console, Host Partner portal, or VIP guest suite.</p>
      </div>

      <!-- Role Selector Tabs -->
      <div class="auth-role-tabs">
        <button type="button" class="auth-role-tab active" data-role="admin">
          <span>👑 Super Admin</span>
        </button>
        <button type="button" class="auth-role-tab" data-role="host">
          <span>🏡 Host Partner</span>
        </button>
        <button type="button" class="auth-role-tab" data-role="member">
          <span>💎 VIP Member</span>
        </button>
      </div>

      <div id="authRoleHint" class="auth-role-hint">
        👑 <strong>Super Admin Mode:</strong> Pre-filled with your authorized credentials.
      </div>

      <form id="luxGlobalAuthForm" class="auth-modal-form">
        <div class="form-group">
          <label class="form-label" for="authModalEmail">Email Address</label>
          <input 
            type="email" 
            id="authModalEmail" 
            class="form-control" 
            value="otienoronny56@gmail.com" 
            placeholder="name@example.com" 
            required 
            autocomplete="username"
          >
        </div>

        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label class="form-label" for="authModalPassword">Password</label>
          </div>
          <input 
            type="password" 
            id="authModalPassword" 
            class="form-control" 
            value="Luxeaadmin" 
            placeholder="Enter password" 
            required 
            autocomplete="current-password"
          >
        </div>

        <div id="authModalError" class="auth-error-banner hidden">
          Invalid credentials. Please verify your email and password.
        </div>

        <button type="submit" class="btn btn-primary btn-block btn-large" id="authModalSubmitBtn">
          <span id="authBtnText">Sign In to Luxea</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </form>

      <div class="auth-card-footer">
        <span>Looking for a partnership?</span>
        <a href="/host/" class="auth-link-gold" id="authApplyHostLink">Apply as Host Partner ↗</a>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  // Wire events
  const closeBtn = modalOverlay.querySelector('#closeAuthModalBtn');
  closeBtn?.addEventListener('click', window.closeAuthModal);

  modalOverlay.querySelectorAll('.auth-role-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      selectAuthRole(tab.getAttribute('data-role'));
    });
  });

  const form = modalOverlay.querySelector('#luxGlobalAuthForm');
  const emailInput = modalOverlay.querySelector('#authModalEmail');
  const passInput = modalOverlay.querySelector('#authModalPassword');
  const errorBanner = modalOverlay.querySelector('#authModalError');
  const submitBtn = modalOverlay.querySelector('#authModalSubmitBtn');
  const btnText = modalOverlay.querySelector('#authBtnText');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBanner?.classList.add('hidden');
    submitBtn.disabled = true;
    btnText.textContent = 'Verifying...';

    const email = emailInput.value.trim();
    const pass = passInput.value.trim();

    try {
      // 1. Check Super Admin credentials
      if (email.toLowerCase() === 'otienoronny56@gmail.com' && pass === 'Luxeaadmin') {
        const sessionData = {
          email: 'otienoronny56@gmail.com',
          name: 'Ronald Otieno',
          role: 'super_admin',
          isSuperAdmin: true,
          loggedInAt: new Date().toISOString()
        };
        localStorage.setItem('luxea_admin_session', JSON.stringify(sessionData));
        localStorage.setItem('luxea_user_session', JSON.stringify(sessionData));

        window.dispatchEvent(new CustomEvent('luxea:auth_changed', { detail: { loggedIn: true, user: sessionData } }));
        window.closeAuthModal();

        if (window.showToast) {
          window.showToast('✅ Welcome back, Super Admin Ronald!');
        }

        // If on admin or requested admin, redirect to admin
        setTimeout(() => {
          window.location.href = '/admin/';
        }, 300);
        return;
      }

      // 2. Supabase Auth Check if client is available
      const client = window.LuxeaDB ? window.LuxeaDB.getClient() : null;
      if (client && client.auth) {
        const { data, error } = await client.auth.signInWithPassword({
          email: email,
          password: pass
        });

        if (!error && data && data.user) {
          const sessionData = {
            email: data.user.email,
            id: data.user.id,
            name: data.user.user_metadata?.full_name || email.split('@')[0],
            role: 'member',
            isSuperAdmin: email.toLowerCase() === 'otienoronny56@gmail.com',
            loggedInAt: new Date().toISOString()
          };
          localStorage.setItem('luxea_user_session', JSON.stringify(sessionData));

          window.dispatchEvent(new CustomEvent('luxea:auth_changed', { detail: { loggedIn: true, user: sessionData } }));
          window.closeAuthModal();

          if (window.showToast) window.showToast(`✅ Welcome back, ${sessionData.name}!`);
          updateHeaderAuthState();
          return;
        }
      }

      // 3. Fallback: Host Partner Check in Supabase lux_hosts table
      if (window.LuxeaDB) {
        const client = window.LuxeaDB.getClient();
        if (client) {
          const { data: hostRows } = await client
            .from('lux_hosts')
            .select('*')
            .eq('email', email)
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
              loggedInAt: new Date().toISOString()
            };
            localStorage.setItem('luxea_user_session', JSON.stringify(sessionData));
            window.dispatchEvent(new CustomEvent('luxea:auth_changed', { detail: { loggedIn: true, user: sessionData } }));
            window.closeAuthModal();

            if (isApproved) {
              if (window.showToast) window.showToast(`🏡 Welcome, Verified Host Partner ${host.full_name}!`);
            } else {
              if (window.showToast) window.showToast(`⏳ Welcome, ${host.full_name}. Your host application is currently under admin verification.`);
            }
            updateHeaderAuthState();
            return;
          }
        }
      }

      // If credentials didn't match
      if (errorBanner) {
        errorBanner.textContent = 'Invalid credentials. For Super Admin, use otienoronny56@gmail.com';
        errorBanner.classList.remove('hidden');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (errorBanner) {
        errorBanner.textContent = 'An unexpected error occurred. Please try again.';
        errorBanner.classList.remove('hidden');
      }
    } finally {
      submitBtn.disabled = false;
      btnText.textContent = 'Sign In to Luxea';
    }
  });

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.lux-user-menu-wrap')) {
      document.querySelectorAll('.lux-user-dropdown').forEach(m => m.classList.add('hidden'));
      document.querySelectorAll('#luxUserDropdownToggle').forEach(t => t.setAttribute('aria-expanded', 'false'));
    }
  });
}
