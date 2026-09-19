/**
 * LUXEA LIVING — SUPER ADMIN COMMAND MODULE (admin.js)
 * High-End Executive Command Center
 * Features:
 * 1. Authentication Gateway: otienoronny56@gmail.com / Luxeaadmin
 * 2. Executive Analytics: Portfolio valuation, ADR, Regional gauges, Category mix & Funnel
 * 3. Modernized Data Tables: Inline Status Switcher, Direct WhatsApp outreach, Photo Lightbox
 * 4. Live Stays Inventory Management with Realtime Supabase Sync
 * 5. VIP Waitlist Management & Multi-format CSV exports
 */

import { LUXEA_STAYS } from './staysData.js';

export function initAdminDashboard() {
  const loginGateway = document.getElementById('adminLoginGateway');
  const dashboardView = document.getElementById('adminDashboardView');
  const loginForm = document.getElementById('adminLoginForm');
  const loginEmail = document.getElementById('adminEmailInput');
  const loginPass = document.getElementById('adminPasswordInput');
  const loginErrorMsg = document.getElementById('loginErrorMsg');
  const adminBadge = document.getElementById('superAdminBadge');
  const logoutBtn = document.getElementById('adminLogoutBtn');

  // Dashboard Table & Search Elements
  const hostsTableBody = document.getElementById('hostsTableBody');
  const staysTableBody = document.getElementById('staysTableBody');
  const guestsTableBody = document.getElementById('guestsTableBody');
  const hostWaitlistTableBody = document.getElementById('hostWaitlistTableBody');
  const profilesTableBody = document.getElementById('profilesTableBody');
  const hostsEmpty = document.getElementById('hostsEmptyState');
  const guestsEmpty = document.getElementById('guestsEmptyState');
  const hostWaitlistEmpty = document.getElementById('hostWaitlistEmptyState');
  const profilesEmpty = document.getElementById('profilesEmptyState');
  const searchInput = document.getElementById('adminSearchInput');
  const statusPillsWrap = document.getElementById('statusPillsFilter');

  // Tabs
  const tabHosts = document.getElementById('tabHostsBtn');
  const tabStays = document.getElementById('tabStaysBtn');
  const tabGuests = document.getElementById('tabGuestsBtn');
  const tabHostWaitlist = document.getElementById('tabHostWaitlistBtn');
  const tabProfiles = document.getElementById('tabProfilesBtn');
  const hostsPane = document.getElementById('hostsViewPane');
  const staysPane = document.getElementById('staysViewPane');
  const guestsPane = document.getElementById('guestsViewPane');
  const hostWaitlistPane = document.getElementById('hostWaitlistViewPane');
  const profilesPane = document.getElementById('viewProfiles');
  const profilesSearchInput = document.getElementById('profilesSearchInput');
  const profilesRoleFilter = document.getElementById('profilesRoleFilter');
  const profilesSortFilter = document.getElementById('profilesSortFilter');
  const profilesStatusFilter = document.getElementById('profilesStatusFilter');


  // CSV Export Buttons
  const exportHostsBtn = document.getElementById('exportHostsCsvBtn');
  const exportGuestsBtn = document.getElementById('exportGuestsCsvBtn');
  const exportHostWaitlistBtn = document.getElementById('exportHostWaitlistCsvBtn');

  // Inspection Modal
  const inspectModal = document.getElementById('hostInspectModal');
  const closeInspectBtn = document.getElementById('closeInspectModalBtn');
  const inspectBody = document.getElementById('inspectModalBody');
  const inspectRefBadge = document.getElementById('inspectRefBadge');
  const inspectTitle = document.getElementById('inspectTitle');
  const inspectStatusLabel = document.getElementById('inspectStatusLabel');
  const inspectApproveBtn = document.getElementById('inspectApproveBtn');
  const inspectRejectBtn = document.getElementById('inspectRejectBtn');
  let currentInspectedRef = null;

  // Account Provisioning Modal Elements
  const createUserModal = document.getElementById('createUserModal');
  const openCreateHostModalBtn = document.getElementById('openCreateHostModalBtn');
  const openCreateUserModalBtn = document.getElementById('openCreateUserModalBtn');
  const closeCreateUserModalBtn = document.getElementById('closeCreateUserModalBtn');
  const cancelCreateUserBtn = document.getElementById('cancelCreateUserBtn');
  const createUserForm = document.getElementById('createUserForm');
  const btnGenPass = document.getElementById('btnGenPass');
  const newAccRole = document.getElementById('newAccRole');
  const newAccHostSection = document.getElementById('newAccHostSection');
  const newAccPropPhotoWrap = document.getElementById('newAccPropPhotoWrap');
  const newAccAvatarFile = document.getElementById('newAccAvatarFile');
  const newAccAvatarPreview = document.getElementById('newAccAvatarPreview');
  const newAccAvatarImg = document.getElementById('newAccAvatarImg');
  const newAccPropPhotoFile = document.getElementById('newAccPropPhotoFile');
  const newAccPropPhotoPreview = document.getElementById('newAccPropPhotoPreview');
  const newAccPropPhotoImg = document.getElementById('newAccPropPhotoImg');

  // Edit Profile & Security Controls Modal Elements
  const editProfileModal = document.getElementById('editProfileModal');
  const closeEditProfileModalBtn = document.getElementById('closeEditProfileModalBtn');
  const cancelEditProfileBtn = document.getElementById('cancelEditProfileBtn');
  const editProfileForm = document.getElementById('editProfileForm');
  const editProfileRef = document.getElementById('editProfileRef');
  const editProfileTitle = document.getElementById('editProfileTitle');
  const editProfileUserId = document.getElementById('editProfileUserId');
  const editProfileRefId = document.getElementById('editProfileRefId');
  const editProfileFullName = document.getElementById('editProfileFullName');
  const editProfileEmail = document.getElementById('editProfileEmail');
  const editProfileRole = document.getElementById('editProfileRole');
  const editProfilePhone = document.getElementById('editProfilePhone');
  const editProfileHostSection = document.getElementById('editProfileHostSection');
  const editProfilePropName = document.getElementById('editProfilePropName');
  const editProfileBio = document.getElementById('editProfileBio');
  const editProfileAvatarFile = document.getElementById('editProfileAvatarFile');
  const editProfileAvatarImg = document.getElementById('editProfileAvatarImg');
  const editProfileAvatarStatus = document.getElementById('editProfileAvatarStatus');
  const editProfilePropPhotoWrap = document.getElementById('editProfilePropPhotoWrap');
  const editProfilePropPhotoFile = document.getElementById('editProfilePropPhotoFile');
  const editProfilePropImg = document.getElementById('editProfilePropImg');
  const editProfilePropStatus = document.getElementById('editProfilePropStatus');
  const editProfileHostControls = document.getElementById('editProfileHostControls');
  const btnToggleSuspendHost = document.getElementById('btnToggleSuspendHost');
  const labelToggleSuspend = document.getElementById('labelToggleSuspend');
  const btnToggleDelistHost = document.getElementById('btnToggleDelistHost');
  const labelToggleDelist = document.getElementById('labelToggleDelist');

  // Active Data State
  let cachedHosts = [];
  let cachedStays = [];
  let cachedGuests = [];
  let cachedHostWaitlist = [];
  let cachedProfiles = [];
  let currentStatusFilter = 'all';

  // =========================================================================
  // 1. AUTHENTICATION GATE
  // =========================================================================
  function checkAuth() {
    const publicHeader = document.getElementById('adminPublicHeader');
    const mobileBottomNav = document.querySelector('.mobile-bottom-nav');

    // Verify if Super Admin is logged in (via session or Supabase Google auth)
    let isSuperAdmin = false;
    let admin = null;

    if (window.LuxeaAuth && window.LuxeaAuth.isAdminLoggedIn()) {
      isSuperAdmin = true;
      admin = window.LuxeaAuth.getCurrentAdmin();
    } else {
      const userSession = JSON.parse(localStorage.getItem('luxea_user_session') || '{}');
      const email = (userSession?.email || '').toLowerCase().trim();
      if (email === 'otienoronny56@gmail.com' || email === 'dennbarasa@gmail.com' || userSession.role === 'super_admin' || userSession.isSuperAdmin) {
        isSuperAdmin = true;
        admin = userSession;
        admin.isSuperAdmin = true;
        if (!admin.name) admin.name = email === 'dennbarasa@gmail.com' ? 'Dennis Barasa' : 'Ronald Otieno';
        localStorage.setItem('luxea_admin_session', JSON.stringify(admin));
      }
    }

    if (isSuperAdmin && admin) {
      loginGateway?.classList.add('hidden');
      dashboardView?.classList.remove('hidden');
      if (publicHeader) publicHeader.classList.add('hidden');
      if (mobileBottomNav) mobileBottomNav.classList.add('hidden');
      adminBadge?.classList.remove('hidden');
      logoutBtn?.classList.remove('hidden');

      const adminName = admin.name || (admin.email === 'dennbarasa@gmail.com' ? 'Dennis Barasa' : 'Ronald Otieno');
      const firstName = adminName.split(' ')[0];
      const sidebarName = document.getElementById('sidebarAdminName');
      if (sidebarName) sidebarName.textContent = firstName;
      if (adminBadge) adminBadge.textContent = `Super Admin`;
      loadDashboardData();
    } else {
      loginGateway?.classList.remove('hidden');
      dashboardView?.classList.add('hidden');
      if (publicHeader) publicHeader.classList.remove('hidden');
      if (mobileBottomNav) mobileBottomNav.classList.remove('hidden');
      adminBadge?.classList.add('hidden');
      logoutBtn?.classList.add('hidden');
    }
  }

  // Google OAuth for Super Admin
  const adminGoogleBtn = document.getElementById('adminGoogleBtn');
  adminGoogleBtn?.addEventListener('click', async () => {
    const client = window.LuxeaDB ? window.LuxeaDB.getClient() : null;
    if (client && client.auth) {
      const btnText = document.getElementById('adminGoogleBtnText');
      if (btnText) btnText.textContent = 'Verifying with Google...';
      try {
        await client.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + '/admin/'
          }
        });
      } catch (err) {
        console.error('Admin Google sign in error:', err);
        if (loginErrorMsg) {
          loginErrorMsg.textContent = 'Could not start Google Sign-In. Use credentials below.';
          loginErrorMsg.classList.remove('hidden');
        }
      }
    }
  });

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginErrorMsg?.classList.add('hidden');
    const submitBtn = document.getElementById('loginSubmitBtn');
    if (submitBtn) submitBtn.disabled = true;

    const email = loginEmail.value.trim();
    const pass = loginPass.value.trim();

    if (window.LuxeaAuth) {
      const result = await window.LuxeaAuth.loginAdmin(email, pass);
      if (result.success) {
        if (window.showToast) window.showToast('✅ Welcome, Super Admin Ronald!');
        checkAuth();
      } else {
        if (loginErrorMsg) {
          loginErrorMsg.textContent = result.message || 'Invalid admin credentials.';
          loginErrorMsg.classList.remove('hidden');
        }
      }
    }

    if (submitBtn) submitBtn.disabled = false;
  });

  logoutBtn?.addEventListener('click', async () => {
    if (window.LuxeaAuth) {
      await window.LuxeaAuth.logoutAdmin();
      if (window.showToast) window.showToast('Signed out of Super Admin Console.');
      checkAuth();
    }
  });

  // Guarantee LuxeaDB methods if older supabase.js is in browser cache
  if (window.LuxeaDB) {
    if (typeof window.LuxeaDB.provisionUser !== 'function') {
      window.LuxeaDB.provisionUser = async function (accountData) {
        if (typeof this.sendAutomatedEmail === 'function') {
          return await this.sendAutomatedEmail('admin_provision_user', accountData);
        }
        try {
          const res = await fetch('https://abzcabiqdkmfaijnqbkf.supabase.co/functions/v1/luxea-mailer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'admin_provision_user', record: accountData })
          });
          return await res.json();
        } catch (e) {
          return { success: false, error: e.message };
        }
      };
    }
    if (typeof window.LuxeaDB.fetchProfiles !== 'function') {
      window.LuxeaDB.fetchProfiles = async function () {
        const client = this.getClient();
        if (client) {
          try {
            const { data, error } = await client.from('lux_profiles').select('*').order('created_at', { ascending: false });
            if (!error && data) return data;
          } catch (e) {}
        }
        return [];
      };
    }
  }

  // =========================================================================
  // 2. DATA LOADING & ANALYTICS CALCULATION
  // =========================================================================
  async function loadDashboardData() {
    if (window.LuxeaDB) {
      cachedHosts = await window.LuxeaDB.fetchHosts();
      cachedGuests = await window.LuxeaDB.fetchWaitlist();
      cachedStays = await window.LuxeaDB.fetchProperties();
      cachedHostWaitlist = typeof window.LuxeaDB.fetchHostWaitlist === 'function'
        ? await window.LuxeaDB.fetchHostWaitlist()
        : JSON.parse(localStorage.getItem('luxea_host_waitlist') || '[]');
      cachedProfiles = typeof window.LuxeaDB.fetchProfiles === 'function'
        ? await window.LuxeaDB.fetchProfiles()
        : [];
      
      // Fallback direct query if cachedProfiles is empty
      if (!cachedProfiles || cachedProfiles.length === 0) {
        try {
          const client = window.LuxeaDB.getClient();
          if (client) {
            const { data } = await client.from('lux_profiles').select('*').order('created_at', { ascending: false });
            if (data && data.length > 0) cachedProfiles = data;
          }
        } catch (e) {}
      }
    } else {
      cachedHosts = JSON.parse(localStorage.getItem('luxea_host_applications') || '[]');
      cachedGuests = JSON.parse(localStorage.getItem('luxea_waitlist_guests') || '[]');
      cachedStays = JSON.parse(localStorage.getItem('luxea_cached_properties') || '[]');
      cachedHostWaitlist = JSON.parse(localStorage.getItem('luxea_host_waitlist') || '[]');
      cachedProfiles = [];
    }

    // Arrange all lists from NEWEST to OLDEST by default
    const sortNewestFirst = (arr) => {
      if (!Array.isArray(arr)) return [];
      return arr.sort((a, b) => new Date(b.created_at || b.signature_date || 0) - new Date(a.created_at || a.signature_date || 0));
    };

    cachedHosts = sortNewestFirst(cachedHosts);
    cachedGuests = sortNewestFirst(cachedGuests);
    cachedHostWaitlist = sortNewestFirst(cachedHostWaitlist);
    cachedProfiles = sortNewestFirst(cachedProfiles);
    cachedStays = sortNewestFirst(cachedStays);



    // Fallback stays catalog
    if (!cachedStays || cachedStays.length === 0) {
      cachedStays = LUXEA_STAYS.map(s => ({
        id: s.id,
        slug: s.id,
        name: s.name,
        category: s.category,
        property_type: s.propertyType || s.category,
        city: s.city,
        area: s.location,
        location_group: s.locationGroup,
        price_per_night_usd: s.usdPrice,
        price_per_night_kes: s.kesPrice,
        cover_image_url: s.image,
        is_available: true
      }));
    }

    renderMetricsAndAnalytics();
    renderAllViews();
  }

  function renderMetricsAndAnalytics() {
    const totalHosts = cachedHosts.length;
    const pendingHosts = cachedHosts.filter(h => !h.review_status || h.review_status === 'pending_review').length;
    const approvedHosts = cachedHosts.filter(h => h.review_status === 'approved').length;
    const rejectedHosts = cachedHosts.filter(h => h.review_status === 'rejected').length;
    const totalStays = cachedStays.length;
    const totalGuests = cachedGuests.length;
    const totalHostWaitlist = cachedHostWaitlist.length;
    const totalProfiles = cachedProfiles.length;
    const adminProfiles = cachedProfiles.filter(p => p.role === 'super_admin' || p.role === 'admin').length;
    const hostProfiles = cachedProfiles.filter(p => p.role === 'host').length;
    const memberProfiles = cachedProfiles.filter(p => !p.role || p.role === 'member' || p.role === 'guest').length;

    // Top KPI Numbers
    const elTotalHosts = document.getElementById('metricTotalHosts');
    const elPendingHosts = document.getElementById('metricPendingHosts');
    const elApprovedHosts = document.getElementById('metricApprovedHosts');
    const elTotalStays = document.getElementById('metricTotalStays');
    const elTotalGuests = document.getElementById('metricTotalGuests');

    if (elTotalHosts) elTotalHosts.textContent = totalHosts;
    if (elPendingHosts) elPendingHosts.textContent = pendingHosts;
    if (elApprovedHosts) elApprovedHosts.textContent = approvedHosts;
    if (elTotalStays) elTotalStays.textContent = totalStays;
    if (elTotalGuests) elTotalGuests.textContent = totalGuests;

    // Dedicated Host View Cards
    const hostCardTotal = document.getElementById('hostCardTotal');
    const hostCardPending = document.getElementById('hostCardPending');
    const hostCardApproved = document.getElementById('hostCardApproved');
    const hostCardRejected = document.getElementById('hostCardRejected');
    if (hostCardTotal) hostCardTotal.textContent = totalHosts;
    if (hostCardPending) hostCardPending.textContent = pendingHosts;
    if (hostCardApproved) hostCardApproved.textContent = approvedHosts;
    if (hostCardRejected) hostCardRejected.textContent = rejectedHosts;

    // Dedicated Stays View Cards
    const staysCardTotal = document.getElementById('staysCardTotal');
    if (staysCardTotal) staysCardTotal.textContent = totalStays;

    // Dedicated Guest View Cards
    const guestsCardTotal = document.getElementById('guestsCardTotal');
    if (guestsCardTotal) guestsCardTotal.textContent = totalGuests;

    // Dedicated Host Waitlist Cards
    const waitlistCardTotal = document.getElementById('waitlistCardTotal');
    const waitlistCardReady = document.getElementById('waitlistCardReady');
    if (waitlistCardTotal) waitlistCardTotal.textContent = totalHostWaitlist;
    if (waitlistCardReady) {
      const readyHosts = cachedHostWaitlist.filter(w => {
        const r = (w.readiness || w.property_ready || '').toLowerCase();
        return r.includes('immediate') || r.includes('ready') || r.includes('now') || r.includes('active');
      }).length;
      waitlistCardReady.textContent = readyHosts || totalHostWaitlist;
    }

    // Dedicated Profiles Cards
    const cProfilesTotal = document.getElementById('profilesCardTotal');
    const cProfilesAdmins = document.getElementById('profilesCardAdmins');
    const cProfilesHosts = document.getElementById('profilesCardHosts');
    const cProfilesMembers = document.getElementById('profilesCardMembers');
    if (cProfilesTotal) cProfilesTotal.textContent = totalProfiles;
    if (cProfilesAdmins) cProfilesAdmins.textContent = adminProfiles;
    if (cProfilesHosts) cProfilesHosts.textContent = hostProfiles;
    if (cProfilesMembers) cProfilesMembers.textContent = memberProfiles;

    // Tab counters
    const tHost = document.getElementById('hostTabCounter');
    const tStays = document.getElementById('staysTabCounter');
    const tGuest = document.getElementById('guestTabCounter');
    const tHostWaitlist = document.getElementById('hostWaitlistTabCounter');
    const tProfiles = document.getElementById('profilesTabCounter');
    if (tHost) tHost.textContent = totalHosts;
    if (tStays) tStays.textContent = totalStays;
    if (tGuest) tGuest.textContent = totalGuests;
    if (tHostWaitlist) tHostWaitlist.textContent = totalHostWaitlist;
    if (tProfiles) tProfiles.textContent = totalProfiles;

    // Filter pill count badges
    const pAll = document.getElementById('pillCountAll');
    const pPending = document.getElementById('pillCountPending');
    const pApproved = document.getElementById('pillCountApproved');
    const pRejected = document.getElementById('pillCountRejected');
    if (pAll) pAll.textContent = totalHosts;
    if (pPending) pPending.textContent = pendingHosts;
    if (pApproved) pApproved.textContent = approvedHosts;
    if (pRejected) pRejected.textContent = rejectedHosts;

    // =======================================================================
    // BLINKING INDICATOR & URGENT PENDING ACTION BANNER
    // =======================================================================
    const pendingPill = document.querySelector('.status-pill.pill-amber');
    const pendingBanner = document.getElementById('pendingAuditBanner');
    const pendingBannerCount = document.getElementById('pendingBannerCount');
    const pendingBannerLink = document.getElementById('pendingBannerLink');
    const trendPendingBadge = document.getElementById('trendPendingBadge');

    if (pendingHosts > 0) {
      // 1. Blinking pulsing glow on Pending filter pill
      if (pendingPill) {
        pendingPill.classList.add('has-pending');
        if (!pendingPill.querySelector('.pulsing-beacon-dot')) {
          const dot = document.createElement('span');
          dot.className = 'pulsing-beacon-dot';
          pendingPill.prepend(dot);
        }
      }

      // 2. Urgent Action Banner at top of table
      if (pendingBanner) {
        pendingBanner.classList.remove('hidden');
        if (pendingBannerCount) pendingBannerCount.textContent = pendingHosts;
        const latestPending = cachedHosts.find(h => !h.review_status || h.review_status === 'pending_review');
        if (latestPending && pendingBannerLink) {
          const ref = latestPending.ref_id || latestPending.refId;
          pendingBannerLink.href = `/admin/host-dossier.html?ref=${ref}`;
          pendingBannerLink.textContent = `Audit ${latestPending.full_name || latestPending.fullName || 'Host'} [${ref}] ↗`;
        }
      }

      // 3. Pulse badge on Pending KPI card
      if (trendPendingBadge) {
        trendPendingBadge.textContent = `⚡ ${pendingHosts} Action Req`;
        trendPendingBadge.classList.add('pulse-badge');
      }
    } else {
      if (pendingPill) {
        pendingPill.classList.remove('has-pending');
        const dot = pendingPill.querySelector('.pulsing-beacon-dot');
        if (dot) dot.remove();
      }
      if (pendingBanner) {
        pendingBanner.classList.add('hidden');
      }
      if (trendPendingBadge) {
        trendPendingBadge.textContent = 'All Vetted';
        trendPendingBadge.classList.remove('pulse-badge');
      }
    }

    // =======================================================================
    // ANALYTICS HUB 1: PORTFOLIO REVENUE, VALUATION & METRICS
    // =======================================================================
    const availMap = JSON.parse(localStorage.getItem('luxea_host_avail_map') || '{}');
    let totalUsdVal = 0;
    let totalKesVal = 0;
    let activeStaysCount = 0;

    cachedStays.forEach(s => {
      const isAvail = availMap[s.id] !== undefined ? availMap[s.id] : (s.is_available !== false);
      if (isAvail) {
        activeStaysCount++;
        const usd = parseFloat(s.price_per_night_usd) || Math.round((s.price_per_night_kes || s.kesPrice || 0) / 130);
        const kes = parseFloat(s.price_per_night_kes) || ((s.price_per_night_usd || 0) * 130);
        totalUsdVal += usd;
        totalKesVal += kes;
      }
    });

    const elTotalUsd = document.getElementById('analyticsTotalUsd');
    const elTotalKes = document.getElementById('analyticsTotalKes');
    const elAdr = document.getElementById('analyticsAdr');
    const elAdrSub = document.getElementById('analyticsAdrSub');
    const elMonthlyGross = document.getElementById('analyticsMonthlyGross');
    const elApprovalRate = document.getElementById('analyticsApprovalRate');
    const elApprovalSub = document.getElementById('analyticsApprovalSub');

    if (elTotalUsd) elTotalUsd.textContent = totalUsdVal.toLocaleString();
    if (elTotalKes) elTotalKes.textContent = totalKesVal.toLocaleString();

    const adr = activeStaysCount > 0 ? Math.round(totalUsdVal / activeStaysCount) : 0;
    if (elAdr) elAdr.textContent = `$${adr.toLocaleString()} / nt`;
    if (elAdrSub) elAdrSub.textContent = `≈ KES ${(adr * 130).toLocaleString()} Median Rate`;

    const monthlyGrossUsd = Math.round(totalUsdVal * 30 * 0.7);
    const monthlyGrossKes = monthlyGrossUsd * 130;
    if (elMonthlyGross) elMonthlyGross.textContent = `$${monthlyGrossUsd.toLocaleString()}`;

    const totalApplications = approvedHosts + pendingHosts;
    const approvalPct = totalApplications > 0 ? Math.round((approvedHosts / totalApplications) * 1000) / 10 : 100;
    if (elApprovalRate) elApprovalRate.textContent = `${approvalPct}%`;
    if (elApprovalSub) elApprovalSub.textContent = `${pendingHosts} Host(s) In Audit`;

    // Populate dedicated Stays View card valuations
    const staysCardUsd = document.getElementById('staysCardUsd');
    const staysCardKes = document.getElementById('staysCardKes');
    const staysCardAdr = document.getElementById('staysCardAdr');
    if (staysCardUsd) staysCardUsd.textContent = `$${totalUsdVal.toLocaleString()}`;
    if (staysCardKes) staysCardKes.textContent = `≈ KES ${totalKesVal.toLocaleString()} / Night`;
    if (staysCardAdr) staysCardAdr.textContent = `$${adr.toLocaleString()} / night`;

    // Update dynamic executive briefing narratives
    const insightYieldText = document.getElementById('insightYieldText');
    if (insightYieldText) {
      insightYieldText.innerHTML = `The catalog commands <strong>$${totalUsdVal.toLocaleString()} / KES ${totalKesVal.toLocaleString()}</strong> in gross nightly potential. At a modeled 70% monthly occupancy, projected gross volume is <strong>$${monthlyGrossUsd.toLocaleString()} (KES ${(monthlyGrossKes / 1000000).toFixed(2)}M)</strong>, generating an estimated <strong>KES ${(Math.round(monthlyGrossKes * 0.15)).toLocaleString()} in monthly platform commissions</strong>.`;
    }

    const insightVettingText = document.getElementById('insightVettingText');
    if (insightVettingText) {
      const pendingNames = cachedHosts.filter(h => !h.review_status || h.review_status === 'pending_review').map(h => h.full_name || h.fullName).join(', ');
      insightVettingText.innerHTML = `<strong>${approvalPct}%</strong> approval rate across evaluated host submissions (${approvedHosts} approved, ${pendingHosts} pending). ${pendingHosts > 0 ? `<strong>${pendingNames || 'Pending Hosts'}</strong> is currently under curatorial inspection for high-speed fiber and staging before catalog launch.` : 'All submitted host dossiers are fully audited and contracted.'}`;
    }

    const insightPipelineText = document.getElementById('insightPipelineText');
    if (insightPipelineText) {
      insightPipelineText.innerHTML = `<strong>${cachedHostWaitlist.length} verified host partners</strong> are on the Founding Waitlist (including Naivasha, Kilifi, Nanyuki, Watamu, Nairobi), representing an incoming pipeline of <strong>~KES 450,000/night</strong> in verified inventory.`;
    }

    // Render / Update Chart.js luxury graphs
    renderAnalyticsCharts();
  }

  // =========================================================================
  // LUXURY CHARTS ENGINE (CHART.JS)
  // =========================================================================
  let chartRegionalInstance = null;
  let chartAssetMixInstance = null;
  let chartGrowthInstance = null;
  let chartPricingInstance = null;
  let analyticsCurrencyMode = 'USD';

  function renderAnalyticsCharts() {
    if (typeof Chart === 'undefined') {
      setTimeout(renderAnalyticsCharts, 250);
      return;
    }

    // 1. Chart: Regional Nightly Yield
    const regionVal = {};
    cachedStays.forEach(s => {
      const isAvail = s.is_available !== false;
      if (!isAvail) return;
      const hub = s.city || s.location_group || s.area || 'Other';
      const cleanHub = hub.includes('Ruaka') ? 'Ruaka & Northern Bypass'
        : hub.includes('Westlands') ? 'Westlands Skyline'
        : hub.includes('Diani') || hub.includes('Coast') ? 'Diani Beach'
        : hub.includes('Karen') ? 'Karen Sanctuary'
        : hub;

      const usd = parseFloat(s.price_per_night_usd) || Math.round((s.price_per_night_kes || 0) / 130);
      const val = analyticsCurrencyMode === 'KES' ? (usd * 130) : usd;
      regionVal[cleanHub] = (regionVal[cleanHub] || 0) + val;
    });

    const regionLabels = Object.keys(regionVal);
    const regionData = Object.values(regionVal);

    const canvasRegional = document.getElementById('chartRegionalYield');
    if (canvasRegional) {
      const ctx = canvasRegional.getContext('2d');
      if (chartRegionalInstance) chartRegionalInstance.destroy();
      chartRegionalInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: regionLabels,
          datasets: [{
            label: analyticsCurrencyMode === 'KES' ? 'Nightly Value (KES)' : 'Nightly Value (USD)',
            data: regionData,
            backgroundColor: [
              'rgba(212, 175, 55, 0.88)',
              'rgba(56, 189, 248, 0.88)',
              'rgba(74, 222, 128, 0.88)',
              'rgba(178, 150, 125, 0.88)'
            ],
            borderColor: ['#B28756', '#0284C7', '#16A34A', '#7D5A44'],
            borderWidth: 1.5,
            borderRadius: 8,
            maxBarThickness: 46
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1E140F',
              titleColor: '#D4AF37',
              bodyColor: '#EDE8E3',
              borderColor: '#B28756',
              borderWidth: 1,
              padding: 10,
              callbacks: {
                label: function (ctx) {
                  return analyticsCurrencyMode === 'KES'
                    ? ` Nightly Yield: KES ${ctx.raw.toLocaleString()}`
                    : ` Nightly Yield: $${ctx.raw.toLocaleString()}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 11, family: "'Plus Jakarta Sans', sans-serif", weight: '600' }, color: '#604D42' }
            },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(178, 150, 125, 0.12)' },
              ticks: {
                callback: (v) => analyticsCurrencyMode === 'KES' ? `KES ${(v / 1000)}k` : `$${v}`,
                font: { size: 10, family: "'Plus Jakarta Sans', sans-serif" },
                color: '#604D42'
              }
            }
          }
        }
      });
    }

    // 2. Chart: Asset Allocation / Category Mix (Doughnut Ring Chart)
    const catMap = { 'Penthouses': 0, 'Beach Villas': 0, 'Townhomes': 0, 'Modern Suites': 0 };
    cachedStays.forEach(s => {
      const cat = (s.property_type || s.category || '').toLowerCase();
      if (cat.includes('penthouse')) catMap['Penthouses']++;
      else if (cat.includes('villa')) catMap['Beach Villas']++;
      else if (cat.includes('townhouse') || cat.includes('townhome')) catMap['Townhomes']++;
      else catMap['Modern Suites']++;
    });

    const canvasAsset = document.getElementById('chartAssetMix');
    if (canvasAsset) {
      const ctx = canvasAsset.getContext('2d');
      if (chartAssetMixInstance) chartAssetMixInstance.destroy();
      chartAssetMixInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(catMap),
          datasets: [{
            data: Object.values(catMap),
            backgroundColor: ['#D4AF37', '#38BDF8', '#4ADE80', '#A0958C'],
            borderWidth: 2,
            borderColor: '#FFFFFF',
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                padding: 12,
                font: { size: 11, family: "'Plus Jakarta Sans', sans-serif", weight: '600' },
                color: '#241812'
              }
            },
            tooltip: {
              backgroundColor: '#1E140F',
              titleColor: '#D4AF37',
              bodyColor: '#EDE8E3',
              borderColor: '#B28756',
              borderWidth: 1,
              padding: 10,
              callbacks: {
                label: function (ctx) {
                  const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                  const pct = Math.round((ctx.raw / (total || 1)) * 100);
                  return ` ${ctx.label}: ${ctx.raw} Residence(s) (${pct}%)`;
                }
              }
            }
          },
          cutout: '66%'
        }
      });
    }

    // 3. Chart: Platform Growth & Pipeline Trajectory (Spline Chart)
    const approvedCount = cachedHosts.filter(h => h.review_status === 'approved').length;
    const canvasGrowth = document.getElementById('chartGrowthTrajectory');
    if (canvasGrowth) {
      const ctx = canvasGrowth.getContext('2d');
      if (chartGrowthInstance) chartGrowthInstance.destroy();
      chartGrowthInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Alpha Launch', 'Week 1', 'Week 2', 'Current Live', 'Q4 Target'],
          datasets: [
            {
              label: 'Approved Live Stays',
              data: [1, 2, 3, cachedStays.length, 12],
              borderColor: '#B28756',
              backgroundColor: 'rgba(212, 175, 55, 0.12)',
              fill: true,
              tension: 0.35,
              borderWidth: 2.5,
              pointBackgroundColor: '#B28756',
              pointRadius: 4
            },
            {
              label: 'Verified Host Partners',
              data: [1, 2, 4, approvedCount, 15],
              borderColor: '#4A342A',
              borderWidth: 2,
              tension: 0.35,
              pointBackgroundColor: '#4A342A',
              pointRadius: 3
            },
            {
              label: 'Founding Waitlist Pipeline',
              data: [2, 3, 5, cachedHostWaitlist.length, 25],
              borderColor: '#F59E0B',
              borderDash: [5, 5],
              borderWidth: 2,
              tension: 0.35,
              pointBackgroundColor: '#F59E0B',
              pointRadius: 3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 10, padding: 12, font: { size: 10, family: "'Plus Jakarta Sans', sans-serif" }, color: '#241812' }
            },
            tooltip: {
              backgroundColor: '#1E140F',
              titleColor: '#D4AF37',
              bodyColor: '#EDE8E3',
              borderColor: '#B28756',
              borderWidth: 1,
              padding: 10
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 10, family: "'Plus Jakarta Sans', sans-serif" }, color: '#604D42' }
            },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(178, 150, 125, 0.12)' },
              ticks: { font: { size: 10 }, color: '#604D42' }
            }
          }
        }
      });
    }

    // 4. Chart: Residence Nightly Pricing Benchmark vs ADR
    const sortedStays = [...cachedStays].sort((a, b) => {
      const pA = parseFloat(a.price_per_night_usd) || 0;
      const pB = parseFloat(b.price_per_night_usd) || 0;
      return pB - pA;
    });

    const stayLabels = sortedStays.map(s => {
      const n = s.name || 'Residence';
      return n.length > 20 ? n.substring(0, 20) + '...' : n;
    });
    const stayPrices = sortedStays.map(s => {
      const usd = parseFloat(s.price_per_night_usd) || Math.round((s.price_per_night_kes || 0) / 130);
      return analyticsCurrencyMode === 'KES' ? (usd * 130) : usd;
    });

    const canvasPricing = document.getElementById('chartPricingBenchmark');
    if (canvasPricing) {
      const ctx = canvasPricing.getContext('2d');
      if (chartPricingInstance) chartPricingInstance.destroy();
      chartPricingInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: stayLabels,
          datasets: [{
            label: analyticsCurrencyMode === 'KES' ? 'Nightly Rate (KES)' : 'Nightly Rate (USD)',
            data: stayPrices,
            backgroundColor: [
              '#059669',
              '#B28756',
              '#D97706',
              '#7D5A44',
              '#9CA3AF'
            ],
            borderRadius: 6,
            barThickness: 18
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1E140F',
              titleColor: '#D4AF37',
              bodyColor: '#EDE8E3',
              borderColor: '#B28756',
              borderWidth: 1,
              padding: 10,
              callbacks: {
                label: function (ctx) {
                  return analyticsCurrencyMode === 'KES'
                    ? ` Rate: KES ${ctx.raw.toLocaleString()} / night`
                    : ` Rate: $${ctx.raw.toLocaleString()} / night`;
                }
              }
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: 'rgba(178, 150, 125, 0.12)' },
              ticks: {
                callback: (v) => analyticsCurrencyMode === 'KES' ? `KES ${(v / 1000)}k` : `$${v}`,
                font: { size: 10, family: "'Plus Jakarta Sans', sans-serif" },
                color: '#604D42'
              }
            },
            y: {
              grid: { display: false },
              ticks: { font: { size: 10, family: "'Plus Jakarta Sans', sans-serif", weight: '600' }, color: '#241812' }
            }
          }
        }
      });
    }
  }

  // Currency Toggle Handler for Charts & Valuations
  const btnToggleUsd = document.getElementById('btnToggleUsd');
  const btnToggleKes = document.getElementById('btnToggleKes');

  btnToggleUsd?.addEventListener('click', () => {
    analyticsCurrencyMode = 'USD';
    btnToggleUsd.classList.add('active');
    btnToggleKes?.classList.remove('active');
    renderAnalyticsCharts();
  });

  btnToggleKes?.addEventListener('click', () => {
    analyticsCurrencyMode = 'KES';
    btnToggleKes.classList.add('active');
    btnToggleUsd?.classList.remove('active');
    renderAnalyticsCharts();
  });

  function renderAllViews() {
    const filterQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
    renderHostsTable(filterQuery, currentStatusFilter);
    renderStaysTable(filterQuery);
    renderGuestsTable(filterQuery);
    renderHostWaitlistTable(filterQuery);
    renderProfilesTable(filterQuery);
  }

  // =========================================================================
  // 3. HOSTS APPLICATIONS TABLE WITH ADVANCED ACTIONS
  // =========================================================================
  function renderHostsTable(query = '', statusFilter = 'all') {
    if (!hostsTableBody) return;
    hostsTableBody.innerHTML = '';

    const filtered = cachedHosts.filter(h => {
      const matchQuery = !query ||
        (h.fullName || h.full_name || '').toLowerCase().includes(query) ||
        (h.propertyName || h.property_name || '').toLowerCase().includes(query) ||
        (h.county || '').toLowerCase().includes(query) ||
        (h.area || h.area_suburb || '').toLowerCase().includes(query) ||
        (h.email || '').toLowerCase().includes(query) ||
        (h.phone || '').includes(query) ||
        (h.refId || h.ref_id || '').toLowerCase().includes(query);

      const status = h.review_status || 'pending_review';
      const matchStatus = statusFilter === 'all' || status === statusFilter;

      return matchQuery && matchStatus;
    });

    if (filtered.length === 0) {
      if (hostsEmpty) hostsEmpty.classList.remove('hidden');
      return;
    }
    if (hostsEmpty) hostsEmpty.classList.add('hidden');

    filtered.forEach((h, idx) => {
      const ref = h.refId || h.ref_id;
      const name = h.fullName || h.full_name;
      const phone = h.phone || '';
      const email = h.email || '';
      const prop = h.propertyName || h.property_name || 'Bespoke Residence';
      const loc = `${h.area || h.area_suburb || ''}, ${h.county || 'Kenya'}`;
      const type = `${h.propertyType || h.property_type || 'Apartment'} • ${h.bedrooms || 1} Bed`;
      const payMethod = h.payoutMethod || h.payout_method || (h.payoutDetails && h.payoutDetails.method) || 'M-Pesa';
      const payNumber = (h.payoutDetails && (h.payoutDetails.number || h.payoutDetails.account)) || h.mpesa_number || h.bank_account_number || 'Registered';
      const status = h.review_status || 'pending_review';
      const photoUrls = h.property_photos_urls || [];
      const idUrl = h.id_document_url;

      // Clean phone for WhatsApp link
      const digitsOnly = phone.replace(/[^0-9]/g, '');
      const waNumber = digitsOnly.startsWith('0') ? '254' + digitsOnly.substring(1) : digitsOnly.startsWith('254') ? digitsOnly : '254' + digitsOnly;
      const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello ${name}, this is Ronald from Luxea Living regarding your host application (${ref}).`)}`;

      const isSuspended = h.is_suspended === true || status === 'suspended';
      const isDelisted = h.is_delisted === true;

      const tr = document.createElement('tr');
      tr.className = 'host-table-row';
      tr.setAttribute('data-ref', ref);
      tr.setAttribute('data-email', email);
      tr.title = 'Click row to inspect full dossier';
      tr.innerHTML = `
        <td>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="host-cell-name" style="font-size: 0.94rem; font-weight: 700; color: #241812;">${name}</span>
            <button type="button" class="btn-copy-micro copy-ref-btn" data-ref="${ref}" title="Click to copy Ref ID: ${ref}">
              <span>${ref}</span>
            </button>
            ${isSuspended ? '<span class="status-chip chip-red" style="font-size:0.65rem; padding: 1px 6px;">🚫 Suspended</span>' : ''}
            ${isDelisted ? '<span class="status-chip chip-neutral" style="font-size:0.65rem; padding: 1px 6px; background:#FEF3C7; color:#B45309;">🙈 Delisted</span>' : ''}
          </div>
          <div style="font-size: 0.74rem; color: #8F847C; margin-top: 3px;">${email}</div>
        </td>

        <td>
          <div style="font-weight: 600; font-size: 0.88rem; color: #241812;">${prop}</div>
          <div style="font-size: 0.76rem; color: var(--color-cocoa); margin-top: 2px;">${loc}</div>
        </td>

        <td>
          <select class="status-select-inline status-${status} host-status-select" data-ref="${ref}" style="padding: 6px 12px; font-size: 0.78rem; font-weight: 700; width: 100%; min-width: 130px;">
            <option value="pending_review" ${status === 'pending_review' ? 'selected' : ''}>⏳ Pending Review</option>
            <option value="approved" ${status === 'approved' ? 'selected' : ''}>✅ Approved</option>
            <option value="rejected" ${status === 'rejected' ? 'selected' : ''}>❌ Rejected</option>
            <option value="suspended" ${status === 'suspended' || isSuspended ? 'selected' : ''}>🚫 Suspended</option>
          </select>
        </td>

        <td style="text-align: right; white-space: nowrap;">
          <div style="display: inline-flex; align-items: center; gap: 6px; justify-content: flex-end;">
            <button type="button" class="btn-table-action btn-edit-host" data-ref="${ref}" data-email="${email}" title="Edit host bio, photo, property details & security controls" style="padding: 6px 10px; font-size: 0.76rem; font-weight: 600; background: #FAF5EE; border: 1px solid #D4AF37; color: #9A7B0C;">
              <span>✏️ Edit</span>
            </button>
            <button type="button" class="btn-table-action btn-toggle-suspend-quick" data-email="${email}" data-suspended="${isSuspended ? 'true' : 'false'}" title="${isSuspended ? 'Unsuspend portal access' : 'Block / Suspend access to earnings & portal'}" style="padding: 6px 8px; font-size: 0.74rem; font-weight: 600; ${isSuspended ? 'background: #DCFCE7; color: #15803D; border: 1px solid #86EFAC;' : 'background: #FEE2E2; color: #DC2626; border: 1px solid #FCA5A5;'}">
              <span>${isSuspended ? '🔓 Unblock' : '🔒 Block'}</span>
            </button>
            <button type="button" class="btn-table-action btn-toggle-delist-quick" data-email="${email}" data-delisted="${isDelisted ? 'true' : 'false'}" title="${isDelisted ? 'Relist property on platform catalog' : 'Delist / Hide residence from stays catalog'}" style="padding: 6px 8px; font-size: 0.74rem; font-weight: 600; ${isDelisted ? 'background: #DBEAFE; color: #1D4ED8; border: 1px solid #93C5FD;' : 'background: #FEF3C7; color: #D97706; border: 1px solid #FCD34D;'}">
              <span>${isDelisted ? '🌐 Relist' : '🚫 Delist'}</span>
            </button>
            <button type="button" class="btn-table-action btn-inspect trigger-inspect-btn" data-ref="${ref}" title="Inspect full application dossier (photos, payout, KYC)" style="padding: 6px 10px; font-size: 0.76rem; font-weight: 700;">
              <span>Inspect ↗</span>
            </button>
          </div>
        </td>
      `;

      hostsTableBody.appendChild(tr);
    });

    bindHostTableActions();
  }

  function bindHostTableActions() {
    // 1. Copy Ref ID buttons
    hostsTableBody.querySelectorAll('.copy-ref-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ref = btn.getAttribute('data-ref');
        navigator.clipboard.writeText(ref);
        if (window.showToast) window.showToast(`📋 Copied Ref ID: ${ref}`);
      });
    });

    // 2. Edit Host Profile button
    hostsTableBody.querySelectorAll('.btn-edit-host').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ref = btn.getAttribute('data-ref');
        const email = btn.getAttribute('data-email');
        openEditProfileModal(ref || email, 'host');
      });
    });

    // 3. Quick Suspend toggle
    hostsTableBody.querySelectorAll('.btn-toggle-suspend-quick').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const email = btn.getAttribute('data-email');
        const isSuspended = btn.getAttribute('data-suspended') === 'true';
        await handleToggleSuspend(email, isSuspended);
      });
    });

    // 4. Quick Delist toggle
    hostsTableBody.querySelectorAll('.btn-toggle-delist-quick').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const email = btn.getAttribute('data-email');
        const isDelisted = btn.getAttribute('data-delisted') === 'true';
        await handleToggleDelist(email, isDelisted);
      });
    });

    // 5. Trigger Inspect Modal from button
    hostsTableBody.querySelectorAll('.trigger-inspect-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ref = btn.getAttribute('data-ref');
        openInspectModal(ref);
      });
    });

    // 6. Inline Status Switcher Dropdown
    hostsTableBody.querySelectorAll('.host-status-select').forEach(sel => {
      sel.addEventListener('click', (e) => e.stopPropagation());
      sel.addEventListener('change', async (e) => {
        e.stopPropagation();
        const ref = sel.getAttribute('data-ref');
        const newStatus = sel.value;

        sel.className = `status-select-inline status-${newStatus} host-status-select`;

        if (window.LuxeaDB) {
          await window.LuxeaDB.updateHostStatus(ref, newStatus);
          if (window.showToast) {
            window.showToast(`Updated status for ${ref} → ${newStatus.toUpperCase()}`);
          }
          // Refresh analytics and counters
          loadDashboardData();
        }
      });
    });

    // 7. Row click & Inspect Modal trigger
    hostsTableBody.querySelectorAll('.host-table-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.host-status-select') || e.target.closest('.copy-ref-btn') || e.target.closest('.btn-table-action')) return;
        const ref = row.getAttribute('data-ref');
        openInspectModal(ref);
      });
    });
  }

  // =========================================================================
  // 4. HOST INSPECTION MODAL (Lightbox Dossier)
  // =========================================================================
  function openInspectModal(refId) {
    const host = cachedHosts.find(h => (h.refId || h.ref_id) === refId);
    if (!host || !inspectModal) return;

    currentInspectedRef = refId;
    if (inspectRefBadge) {
      inspectRefBadge.innerHTML = `
        <span>${refId}</span>
        <a href="/admin/host-dossier.html?ref=${refId}" target="_blank" rel="noopener noreferrer" style="color: #241812; font-size: 0.72rem; text-decoration: underline; margin-left: 10px; font-weight: 600;">Open Separate Page ↗</a>
      `;
    }
    if (inspectTitle) inspectTitle.textContent = `${host.fullName || host.full_name} — ${host.propertyName || host.property_name}`;

    const status = host.review_status || 'pending_review';
    if (inspectStatusLabel) {
      inspectStatusLabel.innerHTML = `Review Status: <strong style="text-transform: uppercase;">${status}</strong>`;
    }

    const photos = host.property_photos_urls || [];
    let photosHtml = '';
    if (Array.isArray(photos) && photos.length > 0) {
      photosHtml = `
        <div class="inspect-photos-gallery">
          ${photos.map(p => `
            <img src="${p}" alt="Property Staging" class="inspect-photo-thumb" onclick="window.open('${p}', '_blank')">
          `).join('')}
        </div>
      `;
    } else {
      photosHtml = `<p style="font-size: 0.82rem; color: var(--color-cocoa);">Standard luxury property staging photos on file.</p>`;
    }

    const idDocUrl = host.id_document_url;
    const phone = host.phone || '';
    const digitsOnly = phone.replace(/[^0-9]/g, '');
    const waNumber = digitsOnly.startsWith('0') ? '254' + digitsOnly.substring(1) : digitsOnly.startsWith('254') ? digitsOnly : '254' + digitsOnly;
    const waUrl = digitsOnly ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello ${host.fullName || host.full_name}, this is Ronald from Luxea Living regarding your host application (${refId}).`)}` : '';

    if (inspectBody) {
      inspectBody.innerHTML = `
        <div class="inspect-item">
          <span class="inspect-label">Host Partner Details</span>
          <div class="inspect-val"><strong>Name:</strong> ${host.fullName || host.full_name}</div>
          <div class="inspect-val" style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
            <strong>Phone:</strong> <span>${phone || '—'}</span>
            ${phone ? `<a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-table-action btn-wa-action" style="padding: 2px 8px; font-size: 0.72rem; margin-left: 6px;">💬 Chat on WhatsApp</a>` : ''}
          </div>
          <div class="inspect-val" style="margin-top: 4px;">
            <strong>Email:</strong> <a href="mailto:${host.email}" style="color: var(--color-camel-dark); text-decoration: underline;">${host.email}</a>
          </div>
          <div class="inspect-val" style="margin-top: 4px;">
            <strong>National ID / Passport:</strong> ${host.nationalId || host.national_id || 'On File'}
            ${idDocUrl ? `<a href="${idDocUrl}" target="_blank" rel="noopener noreferrer" style="color: #B28756; font-size: 0.75rem; text-decoration: underline; margin-left: 8px; font-weight: 700;">View Document ↗</a>` : ''}
          </div>
          <div class="inspect-val" style="margin-top: 4px;"><strong>KRA PIN:</strong> ${host.kraPin || host.kra_pin || 'On File'}</div>
          <div class="inspect-val" style="margin-top: 4px;"><strong>Date of Birth:</strong> ${host.dob || '—'}</div>
        </div>

        <div class="inspect-item">
          <span class="inspect-label">Property Specifications</span>
          <div class="inspect-val"><strong>Property:</strong> ${host.propertyName || host.property_name}</div>
          <div class="inspect-val"><strong>Type:</strong> ${host.propertyType || host.property_type}</div>
          <div class="inspect-val"><strong>Location:</strong> ${host.area || host.area_suburb}, ${host.county}</div>
          <div class="inspect-val"><strong>Address:</strong> ${host.propertyAddress || host.property_address || '—'}</div>
          <div class="inspect-val"><strong>Layout:</strong> ${host.bedrooms} Beds • ${host.bathrooms} Baths • Max ${host.maxGuests || 2} Guests</div>
          <div class="inspect-val"><strong>Amenities:</strong> ${host.amenities || 'Standard luxury portfolio amenities'}</div>
        </div>

        <div class="inspect-item inspect-row-full" style="background: #F5EFE6;">
          <span class="inspect-label">Payout &amp; Settlement Information</span>
          <div class="inspect-val"><strong>Method:</strong> ${(host.payoutDetails && host.payoutDetails.method) || host.payoutMethod || host.payout_method || 'M-Pesa'}</div>
          <div class="inspect-val" style="color: #241812; font-family: monospace;">
            <strong>Account / Mobile:</strong> ${(host.payoutDetails && (host.payoutDetails.number || host.payoutDetails.account)) || host.mpesa_number || host.bank_account_number || 'Registered'}
          </div>
        </div>

        <div class="inspect-item inspect-row-full">
          <span class="inspect-label">Verified High-Resolution Property Photos</span>
          ${photosHtml}
        </div>

        <div class="inspect-row-full" style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--color-cocoa); padding-top: 10px;">
          <span><strong>Digital Signature:</strong> ${host.signature || host.fullName || host.full_name}</span>
          <span><strong>Submitted:</strong> ${host.signatureDate || host.signature_date || host.submittedAt || 'Recent'}</span>
        </div>
      `;
    }

    inspectModal.classList.add('open');
  }

  closeInspectBtn?.addEventListener('click', () => inspectModal?.classList.remove('open'));
  inspectModal?.addEventListener('click', (e) => {
    if (e.target === inspectModal) inspectModal.classList.remove('open');
  });

  inspectApproveBtn?.addEventListener('click', async () => {
    if (!currentInspectedRef) return;
    if (window.LuxeaDB) {
      await window.LuxeaDB.updateHostStatus(currentInspectedRef, 'approved');
      if (window.showToast) window.showToast(`✅ Host ${currentInspectedRef} officially APPROVED!`);
      inspectModal?.classList.remove('open');
      loadDashboardData();
    }
  });

  inspectRejectBtn?.addEventListener('click', async () => {
    if (!currentInspectedRef) return;
    if (window.LuxeaDB) {
      await window.LuxeaDB.updateHostStatus(currentInspectedRef, 'rejected');
      if (window.showToast) window.showToast(`❌ Host ${currentInspectedRef} marked as Rejected.`);
      inspectModal?.classList.remove('open');
      loadDashboardData();
    }
  });

  // =========================================================================
  // 5. LIVE STAYS & INVENTORY TABLE WITH REALTIME TOGGLES
  // =========================================================================
  function renderStaysTable(query = '') {
    if (!staysTableBody) return;
    staysTableBody.innerHTML = '';

    const availMap = JSON.parse(localStorage.getItem('luxea_host_avail_map') || '{}');

    const filtered = cachedStays.filter(s => {
      const host = cachedHosts.find(h => (h.ref_id || h.refId) === (s.host_ref_id || s.hostRefId));
      const hostName = host ? (host.full_name || host.fullName || '') : '';
      return (
        !query ||
        (s.name || '').toLowerCase().includes(query) ||
        (s.city || '').toLowerCase().includes(query) ||
        (s.area || '').toLowerCase().includes(query) ||
        (s.property_type || '').toLowerCase().includes(query) ||
        (s.host_ref_id || '').toLowerCase().includes(query) ||
        hostName.toLowerCase().includes(query)
      );
    });

    filtered.forEach(stay => {
      const isAvail = availMap[stay.id] !== undefined ? availMap[stay.id] : (stay.is_available !== false);
      const usdPrice = stay.price_per_night_usd || Math.round((stay.price_per_night_kes || stay.kesPrice || 0) / 130);
      const kesPrice = stay.price_per_night_kes || (usdPrice * 130);

      const host = cachedHosts.find(h => (h.ref_id || h.refId) === (stay.host_ref_id || stay.hostRefId));
      const hostName = host ? (host.full_name || host.fullName) : 'Luxea Prime Owner';
      const hostRef = host ? (host.ref_id || host.refId) : (stay.host_ref_id || 'Verified Partner');
      const hostPhone = host ? (host.phone || '') : '';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${stay.cover_image_url || stay.image || '/assets/images/hero-1.webp'}" alt="${stay.name}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex-shrink: 0;" loading="lazy">
            <div>
              <div class="host-cell-name">${stay.name}</div>
              <span class="status-chip chip-neutral" style="padding: 1px 6px; font-size: 0.66rem; margin-top: 2px;">${stay.property_type || stay.category || 'Apartment'}</span>
            </div>
          </div>
        </td>

        <td>
          <div style="font-weight: 600; font-size: 0.82rem; color: #241812;">${stay.city || 'Nairobi'}, ${stay.area || stay.county || 'Kenya'}</div>
          <div class="host-cell-sub" style="margin-top: 2px;">Owner: ${hostName}</div>
        </td>

        <td>
          <div style="font-weight: 700; color: #241812; font-size: 0.86rem;">$${usdPrice} <span style="font-size: 0.7rem; color: var(--color-cocoa);">/nt</span></div>
          <small style="color: var(--color-camel-dark); font-weight: 600; font-size: 0.72rem;">KES ${kesPrice.toLocaleString()}</small>
        </td>

        <td>
          <label class="lux-toggle-switch">
            <input type="checkbox" class="lux-toggle-input admin-stay-avail-toggle" data-id="${stay.id || stay.slug}" ${isAvail ? 'checked' : ''}>
            <span class="lux-toggle-slider"></span>
            <span class="lux-toggle-status-text" style="font-size: 0.74rem;">${isAvail ? 'Live' : 'Hidden'}</span>
          </label>
        </td>

        <td style="text-align: right;">
          <a href="/stays/?id=${stay.id || stay.slug}" target="_blank" rel="noopener noreferrer" class="btn-table-action btn-inspect" style="padding: 4px 8px; font-size: 0.72rem;">
            <span>Preview ↗</span>
          </a>
        </td>
      `;

      staysTableBody.appendChild(tr);
    });

    // Bind copy buttons in stays table
    staysTableBody.querySelectorAll('.copy-ref-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ref = btn.getAttribute('data-ref');
        navigator.clipboard.writeText(ref);
        if (window.showToast) window.showToast(`📋 Copied Host Ref: ${ref}`);
      });
    });

    // Bind real-time availability switches
    staysTableBody.querySelectorAll('.admin-stay-avail-toggle').forEach(chk => {
      chk.addEventListener('change', async () => {
        const id = chk.getAttribute('data-id');
        const isAvail = chk.checked;
        if (window.LuxeaDB) {
          await window.LuxeaDB.updatePropertyAvailability(id, isAvail);
          if (window.showToast) {
            window.showToast(`Listing ${isAvail ? 'activated as Bookable' : 'marked Unavailable'}`);
          }
          loadDashboardData();
        }
      });
    });
  }

  // =========================================================================
  // 6. VIP WAITLIST GUESTS TABLE
  // =========================================================================
  function renderGuestsTable(query = '') {
    if (!guestsTableBody) return;
    guestsTableBody.innerHTML = '';

    const filtered = cachedGuests.filter(g =>
      !query ||
      (g.full_name || g.fullName || '').toLowerCase().includes(query) ||
      (g.email || '').toLowerCase().includes(query) ||
      (g.phone || '').includes(query) ||
      (g.pass_number || g.passNumber || '').toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      if (guestsEmpty) guestsEmpty.classList.remove('hidden');
      return;
    }
    if (guestsEmpty) guestsEmpty.classList.add('hidden');

    filtered.forEach(guest => {
      const pass = guest.pass_number || guest.passNumber || 'LX-VIP';
      const name = guest.full_name || guest.fullName || 'VIP Guest';
      const email = guest.email || '';
      const phone = guest.phone || '—';
      const dest = guest.preferred_destinations || guest.destinations || 'Nairobi, Coast';
      const tier = guest.tier || 'Founding Circle';
      const date = guest.created_at ? new Date(guest.created_at).toLocaleDateString('en-GB') : 'Recent';

      const digitsOnly = phone.replace(/[^0-9]/g, '');
      const waNumber = digitsOnly.startsWith('0') ? '254' + digitsOnly.substring(1) : digitsOnly.startsWith('254') ? digitsOnly : '254' + digitsOnly;
      const waUrl = digitsOnly ? `https://wa.me/${waNumber}` : '';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <strong style="font-family: monospace; color: #B28756; font-size: 0.8rem;">${pass}</strong>
        </td>
        <td>
          <div class="host-cell-name">${name}</div>
          <div class="host-cell-sub" style="margin-top: 2px;">
            <span>${phone}</span>
            ${waUrl ? `<a href="${waUrl}" target="_blank" rel="noopener noreferrer" title="Chat on WhatsApp" style="color: #22C55E; font-size: 12px; text-decoration: none;">💬</a>` : ''}
            <span>•</span>
            <span title="${email}" style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${email}</span>
          </div>
        </td>
        <td>
          <div style="font-weight: 500; color: #241812; font-size: 0.8rem;">${dest}</div>
        </td>
        <td>
          <span class="status-chip chip-gold" style="padding: 2px 8px; font-size: 0.72rem;">${tier}</span>
        </td>
        <td style="text-align: right;">
          <small style="color: var(--color-cocoa); font-weight: 600;">${date}</small>
        </td>
      `;

      guestsTableBody.appendChild(tr);
    });
  }

  // =========================================================================
  // 6B. HOST PARTNER WAITLIST TABLE (partners.luxealiving.co.ke)
  // =========================================================================
  function renderHostWaitlistTable(query = '') {
    if (!hostWaitlistTableBody) return;
    hostWaitlistTableBody.innerHTML = '';

    const filtered = cachedHostWaitlist.filter(h =>
      !query ||
      (h.full_name || h.fullName || '').toLowerCase().includes(query) ||
      (h.email || '').toLowerCase().includes(query) ||
      (h.phone || '').includes(query) ||
      (h.property_name || h.propertyName || '').toLowerCase().includes(query) ||
      (h.region || '').toLowerCase().includes(query) ||
      (h.property_type || h.propertyType || '').toLowerCase().includes(query) ||
      (h.pass_number || h.passNumber || '').toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      if (hostWaitlistEmpty) hostWaitlistEmpty.classList.remove('hidden');
      return;
    }
    if (hostWaitlistEmpty) hostWaitlistEmpty.classList.add('hidden');

    filtered.forEach(item => {
      const pass = item.pass_number || item.passNumber || '#LXA-HOST';
      const name = item.full_name || item.fullName || 'Founding Host';
      const email = item.email || '';
      const phone = item.phone || '—';
      const propName = item.property_name || item.propertyName || 'Luxury Residence';
      const propType = item.property_type || item.propertyType || 'Villa';
      const beds = item.bedrooms || 1;
      const region = item.region || 'Kenya';
      const readiness = item.operational_status || item.operationalStatus || 'Active';
      const link = item.portfolio_link || item.portfolioLink || '';
      const notes = item.notes || '';
      const tier = item.tier || 'Founding Host Partner';
      const date = item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB') : (item.timestamp || 'Recent');

      const digitsOnly = phone.replace(/[^0-9]/g, '');
      const waNumber = digitsOnly.startsWith('0') ? '254' + digitsOnly.substring(1) : digitsOnly.startsWith('254') ? digitsOnly : '254' + digitsOnly;
      const waUrl = digitsOnly ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello ${name}, this is Ronald from Luxea Living regarding your host registration (${pass}).`)}` : '';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <strong style="font-family: monospace; color: #D4AF37; font-size: 0.8rem;">${pass}</strong>
          <div style="margin-top: 2px;">
            <span class="status-chip chip-gold" style="padding: 1px 6px; font-size: 0.65rem;">${tier}</span>
          </div>
        </td>
        <td>
          <div class="host-cell-name">${name}</div>
          <div class="host-cell-sub" style="margin-top: 2px;">
            <span>${phone}</span>
            ${waUrl ? `<a href="${waUrl}" target="_blank" rel="noopener noreferrer" title="Chat on WhatsApp" style="color: #22C55E; font-size: 12px; text-decoration: none;">💬</a>` : ''}
            <span>•</span>
            <span title="${email}" style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${email}</span>
          </div>
        </td>
        <td>
          <div style="font-weight: 700; color: #241812; font-size: 0.85rem;">${propName}</div>
          <div class="host-cell-sub" style="margin-top: 2px;">
            <span>${propType} • ${beds} Bed</span>
            <span>•</span>
            <span style="font-weight: 600;">${region}</span>
          </div>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span class="status-chip ${readiness.toLowerCase().includes('ready') ? 'chip-green' : 'chip-neutral'}" style="padding: 1px 6px; font-size: 0.68rem;">${readiness}</span>
            <span style="color: #22C55E; font-weight: 700; font-size: 0.7rem;">0% (90d)</span>
          </div>
          ${link ? `<div style="margin-top: 2px;"><a href="${link}" target="_blank" rel="noopener noreferrer" style="color: #B28756; text-decoration: underline; font-size: 0.72rem;">Portfolio Link ↗</a></div>` : ''}
        </td>
        <td style="text-align: right;">
          <small style="color: var(--color-cocoa); font-weight: 600;">${date}</small>
        </td>
      `;

      hostWaitlistTableBody.appendChild(tr);
    });
  }

  // =========================================================================
  // 6C. USER PROFILES & ACCESS ROLE MANAGER (lux_profiles)
  // =========================================================================
  function renderProfilesTable(query = '', roleFilter = 'all') {
    if (!profilesTableBody) return;
    profilesTableBody.innerHTML = '';

    const selectedRole = roleFilter !== 'all' ? roleFilter : (profilesRoleFilter ? profilesRoleFilter.value : 'all');
    const selectedStatus = profilesStatusFilter ? profilesStatusFilter.value : 'all';
    const selectedSort = profilesSortFilter ? profilesSortFilter.value : 'newest';

    let filtered = cachedProfiles.filter(p => {
      const name = (p.full_name || '').toLowerCase();
      const email = (p.email || '').toLowerCase();
      const role = (p.role || 'member').toLowerCase();
      const id = (p.id || '').toLowerCase();

      const matchQuery = !query || name.includes(query) || email.includes(query) || role.includes(query) || id.includes(query);
      const matchRole = selectedRole === 'all' || role === selectedRole;

      const isSuspended = p.is_suspended === true;
      let matchStatus = true;
      if (selectedStatus === 'active') matchStatus = !isSuspended;
      else if (selectedStatus === 'suspended') matchStatus = isSuspended;

      return matchQuery && matchRole && matchStatus;
    });

    // Arrange list: Default Newest to Oldest!
    filtered.sort((a, b) => {
      if (selectedSort === 'oldest') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      } else if (selectedSort === 'name_asc') {
        return (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '');
      } else {
        // Default: Newest first
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
    });

    if (filtered.length === 0) {
      if (profilesEmpty) profilesEmpty.classList.remove('hidden');
      return;
    }
    if (profilesEmpty) profilesEmpty.classList.add('hidden');

    filtered.forEach(p => {
      const name = p.full_name || (p.email ? p.email.split('@')[0] : 'User');
      const email = p.email || '';
      const currentRole = p.role || 'member';
      const date = p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : 'Recent';
      const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
      const isSuspended = p.is_suspended === true;

      // Status chip: Active vs Inactive / Suspended
      const statusChip = isSuspended
        ? `<span class="status-chip chip-red" style="padding: 2px 8px; font-size: 0.7rem; font-weight: 700;">🔴 Suspended</span>`
        : `<span class="status-chip chip-green" style="padding: 2px 8px; font-size: 0.7rem; font-weight: 700;">🟢 Active</span>`;

      // Cross check linked registries
      let linkedBadge = '<span class="status-chip chip-neutral" style="padding: 1px 6px; font-size: 0.65rem;">Auth Account</span>';
      const hostMatch = cachedHosts.find(h => (h.email || '').toLowerCase() === email.toLowerCase());
      const waitlistMatch = cachedGuests.find(g => (g.email || '').toLowerCase() === email.toLowerCase());
      const hostWaitlistMatch = cachedHostWaitlist.find(hw => (hw.email || '').toLowerCase() === email.toLowerCase());

      if (hostMatch) {
        linkedBadge = `<span class="status-chip ${hostMatch.review_status === 'approved' ? 'chip-green' : 'chip-gold'}" style="padding: 1px 6px; font-size: 0.65rem;">Host: ${hostMatch.review_status || 'Pending'}</span>`;
      } else if (hostWaitlistMatch) {
        linkedBadge = `<span class="status-chip chip-gold" style="padding: 1px 6px; font-size: 0.65rem;">Host Waitlist</span>`;
      } else if (waitlistMatch) {
        linkedBadge = `<span class="status-chip chip-green" style="padding: 1px 6px; font-size: 0.65rem;">VIP Waitlist</span>`;
      }

      const isSuperAdminEmail = email.toLowerCase() === 'otienoronny56@gmail.com' || email.toLowerCase() === 'dennbarasa@gmail.com';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #B28756, #241812); color: #FFF; font-weight: 700; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
              ${initials}
            </div>
            <div>
              <div class="host-cell-name" style="display: flex; align-items: center; gap: 6px;">
                <span>${name}</span>
                ${isSuperAdminEmail ? '<span title="Super Admin" style="font-size: 11px;">👑</span>' : ''}
              </div>
              <div class="host-cell-sub" style="font-family: monospace; font-size: 0.72rem; color: #8F847C;" title="Supabase Auth UUID">
                ${p.id ? p.id.substring(0, 13) + '...' : 'Auth UUID'}
              </div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight: 600; color: #241812; font-size: 0.85rem;">${email}</div>
          ${p.phone ? `<div class="host-cell-sub" style="font-size: 0.75rem;">${p.phone}</div>` : ''}
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px;">
            <select class="form-control profile-role-select" data-user-id="${p.id}" data-email="${email}" style="padding: 4px 8px; font-size: 0.8rem; border-radius: 6px; font-weight: 600; cursor: pointer; ${currentRole === 'super_admin' ? 'border-color: #D4AF37; background: rgba(212, 175, 55, 0.08); color: #9A7B0C;' : currentRole === 'admin' ? 'border-color: #3B82F6; color: #1D4ED8;' : currentRole === 'host' ? 'border-color: #10B981; color: #047857;' : 'border-color: #D1D5DB; color: #374151;'}">
              <option value="super_admin" ${currentRole === 'super_admin' ? 'selected' : ''}>👑 Super Admin</option>
              <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>🛡️ System Admin</option>
              <option value="host" ${currentRole === 'host' ? 'selected' : ''}>🏡 Host Partner</option>
              <option value="member" ${currentRole === 'member' || !currentRole ? 'selected' : ''}>✨ VIP Member</option>
            </select>
          </div>
        </td>
        <td>
          ${statusChip}
        </td>
        <td>
          ${linkedBadge}
        </td>
        <td style="text-align: right;">
          <small style="color: var(--color-cocoa); font-weight: 600;">${date}</small>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <button type="button" class="btn-table-action btn-edit-profile-row" data-email="${email}" data-user-id="${p.id}" title="Edit profile bio, avatar, role & permissions" style="padding: 4px 10px; font-size: 0.75rem; font-weight: 600; background: #FAF5EE; border: 1px solid #D4AF37; color: #9A7B0C;">
            <span>✏️ Edit</span>
          </button>
        </td>
      `;

      profilesTableBody.appendChild(tr);
    });

    // Wire up Edit button clicks on profile rows
    profilesTableBody.querySelectorAll('.btn-edit-profile-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const email = btn.getAttribute('data-email');
        openEditProfileModal(email, 'profile');
      });
    });

    // Wire up change listeners on the role dropdowns
    profilesTableBody.querySelectorAll('.profile-role-select').forEach(select => {
      select.addEventListener('change', async (e) => {
        const userId = e.target.dataset.userId;
        const userEmail = e.target.dataset.email;
        const newRole = e.target.value;

        select.disabled = true;
        select.style.opacity = '0.5';

        if (window.showToast) window.showToast(`Updating role to "${newRole}" for ${userEmail}...`);

        if (window.LuxeaDB && typeof window.LuxeaDB.updateProfileRole === 'function') {
          const res = await window.LuxeaDB.updateProfileRole(userId, newRole);
          if (res.success) {
            // Update cached profile
            const idx = cachedProfiles.findIndex(cp => cp.id === userId);
            if (idx !== -1) cachedProfiles[idx].role = newRole;

            if (window.showToast) window.showToast(`✅ Successfully updated ${userEmail} role to ${newRole}!`);
            renderMetricsAndAnalytics();
          } else {
            if (window.showToast) window.showToast(`⚠️ Role update error: ${res.error || 'Check database permissions'}`);
          }
        }
        select.disabled = false;
        select.style.opacity = '1';
        renderProfilesTable(profilesSearchInput ? profilesSearchInput.value.toLowerCase().trim() : '');
      });
    });
  }

  // =========================================================================
  // 7. TOOLBAR, SEARCH & FILTER EVENTS
  // =========================================================================
  searchInput?.addEventListener('input', () => {
    renderAllViews();
  });

  // Status Filter Pills
  statusPillsWrap?.querySelectorAll('.status-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      statusPillsWrap.querySelectorAll('.status-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentStatusFilter = pill.getAttribute('data-status');
      renderAllViews();
    });
  });

  // =========================================================================
  // 7. TAB & SIDEBAR NAVIGATION (DEDICATED VIEW PAGES)
  // =========================================================================
  const adminViewTitle = document.getElementById('adminViewTitle');
  const adminViewSub = document.getElementById('adminViewSub');
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const adminSidebar = document.getElementById('adminSidebar');
  const refreshAdminDataBtn = document.getElementById('refreshAdminDataBtn');

  // View elements
  const tabOverview = document.getElementById('tabOverviewBtn');
  const viewOverview = document.getElementById('viewOverview');
  const viewHosts = document.getElementById('viewHosts');
  const viewStays = document.getElementById('viewStays');
  const viewGuests = document.getElementById('viewGuests');
  const viewHostWaitlist = document.getElementById('viewHostWaitlist');
  const viewProfiles = document.getElementById('viewProfiles');

  // Per-view search inputs
  const staysSearchInput = document.getElementById('staysSearchInput');
  const guestsSearchInput = document.getElementById('guestsSearchInput');
  const hostWaitlistSearchInput = document.getElementById('hostWaitlistSearchInput');

  const tabTitles = {
    overview: { title: 'Executive Overview', sub: 'High-level command center, portfolio valuation, and platform economics.' },
    hosts: { title: 'Host Applications', sub: 'Curatorial vetting, identity verification documents, and payout routing.' },
    stays: { title: 'Live Stays Catalog', sub: 'Active bookable residences published in the live guest collection.' },
    guests: { title: 'VIP Guest Waitlist', sub: 'Founding Circle passholders with priority destination interests.' },
    hostWaitlist: { title: 'Host Partner Waitlist (partners.)', sub: 'Founding property custodians registered from partners.luxealiving.co.ke.' },
    profiles: { title: 'User Profiles & Access Roles', sub: 'Registered Supabase Auth users (lux_profiles). Assign administrative privileges and change roles.' }
  };

  tabOverview?.addEventListener('click', () => switchTab('overview'));
  tabHosts?.addEventListener('click', () => switchTab('hosts'));
  tabStays?.addEventListener('click', () => switchTab('stays'));
  tabGuests?.addEventListener('click', () => switchTab('guests'));
  tabHostWaitlist?.addEventListener('click', () => switchTab('hostWaitlist'));
  tabProfiles?.addEventListener('click', () => switchTab('profiles'));

  // Quick Jump cards from Overview
  document.getElementById('jumpToHostsCard')?.addEventListener('click', () => switchTab('hosts'));
  document.getElementById('jumpToStaysCard')?.addEventListener('click', () => switchTab('stays'));
  document.getElementById('jumpToGuestsCard')?.addEventListener('click', () => switchTab('guests'));
  document.getElementById('jumpToWaitlistCard')?.addEventListener('click', () => switchTab('hostWaitlist'));

  // Per-view Search Listeners
  staysSearchInput?.addEventListener('input', (e) => {
    renderStaysTable(e.target.value.toLowerCase().trim());
  });

  guestsSearchInput?.addEventListener('input', (e) => {
    renderGuestsTable(e.target.value.toLowerCase().trim());
  });

  hostWaitlistSearchInput?.addEventListener('input', (e) => {
    renderHostWaitlistTable(e.target.value.toLowerCase().trim());
  });

  profilesSearchInput?.addEventListener('input', (e) => {
    renderProfilesTable(e.target.value.toLowerCase().trim());
  });

  profilesRoleFilter?.addEventListener('change', (e) => {
    renderProfilesTable(profilesSearchInput ? profilesSearchInput.value.toLowerCase().trim() : '', e.target.value);
  });

  profilesSortFilter?.addEventListener('change', () => {
    renderProfilesTable(profilesSearchInput ? profilesSearchInput.value.toLowerCase().trim() : '');
  });

  profilesStatusFilter?.addEventListener('change', () => {
    renderProfilesTable(profilesSearchInput ? profilesSearchInput.value.toLowerCase().trim() : '');
  });


  // Inline Export Triggers
  document.getElementById('exportGuestsCsvBtnInline')?.addEventListener('click', () => {
    exportGuestsBtn?.click();
  });

  document.getElementById('exportHostWaitlistCsvBtnInline')?.addEventListener('click', () => {
    exportHostWaitlistBtn?.click();
  });

  function switchTab(tab) {
    tabOverview?.classList.toggle('active', tab === 'overview');
    tabHosts?.classList.toggle('active', tab === 'hosts');
    tabStays?.classList.toggle('active', tab === 'stays');
    tabGuests?.classList.toggle('active', tab === 'guests');
    tabHostWaitlist?.classList.toggle('active', tab === 'hostWaitlist');
    tabProfiles?.classList.toggle('active', tab === 'profiles');

    viewOverview?.classList.toggle('hidden', tab !== 'overview');
    viewHosts?.classList.toggle('hidden', tab !== 'hosts');
    viewStays?.classList.toggle('hidden', tab !== 'stays');
    viewGuests?.classList.toggle('hidden', tab !== 'guests');
    viewHostWaitlist?.classList.toggle('hidden', tab !== 'hostWaitlist');
    viewProfiles?.classList.toggle('hidden', tab !== 'profiles');

    if (adminViewTitle && tabTitles[tab]) {
      adminViewTitle.textContent = tabTitles[tab].title;
    }
    if (adminViewSub && tabTitles[tab]) {
      adminViewSub.textContent = tabTitles[tab].sub;
    }

    // Refresh charts animation when overview is opened
    if (tab === 'overview') {
      setTimeout(() => {
        if (typeof renderAnalyticsCharts === 'function') {
          renderAnalyticsCharts();
        }
      }, 60);
    }

    // Scroll workspace to top smoothly
    const workspace = document.querySelector('.admin-workspace');
    if (workspace) workspace.scrollTop = 0;

    // Dismiss mobile sidebar drawer if open
    adminSidebar?.classList.remove('open');
    sidebarBackdrop?.classList.remove('active');
  }

  // Mobile Sidebar Drawer Controls
  sidebarToggleBtn?.addEventListener('click', () => {
    adminSidebar?.classList.toggle('open');
    sidebarBackdrop?.classList.toggle('active');
  });

  sidebarBackdrop?.addEventListener('click', () => {
    adminSidebar?.classList.remove('open');
    sidebarBackdrop?.classList.remove('active');
  });

  // Sync Engine Button
  refreshAdminDataBtn?.addEventListener('click', async () => {
    refreshAdminDataBtn.classList.add('rotating');
    await loadDashboardData();
    refreshAdminDataBtn.classList.remove('rotating');
    if (window.showToast) window.showToast('✅ Super Admin data refreshed from Supabase.');
  });

  // =========================================================================
  // 8. CSV EXPORTS
  // =========================================================================
  exportHostsBtn?.addEventListener('click', () => {
    if (cachedHosts.length === 0) {
      if (window.showToast) window.showToast('No host applications to export.');
      return;
    }

    const headers = ['Ref ID', 'Full Name', 'Phone', 'Email', 'Property Name', 'County', 'Area', 'Property Type', 'Bedrooms', 'Payout Method', 'Status', 'Date'];
    const rows = cachedHosts.map(h => [
      `"${h.refId || h.ref_id || ''}"`,
      `"${h.fullName || h.full_name || ''}"`,
      `"${h.phone || ''}"`,
      `"${h.email || ''}"`,
      `"${h.propertyName || h.property_name || ''}"`,
      `"${h.county || ''}"`,
      `"${h.area || h.area_suburb || ''}"`,
      `"${h.propertyType || h.property_type || ''}"`,
      h.bedrooms || 1,
      `"${(h.payoutDetails && h.payoutDetails.method) || h.payoutMethod || h.payout_method || ''}"`,
      `"${h.review_status || 'pending_review'}"`,
      `"${h.signatureDate || h.created_at || ''}"`
    ]);

    downloadCsv('luxea_host_partners.csv', [headers.join(','), ...rows.map(r => r.join(','))].join('\n'));
  });

  exportGuestsBtn?.addEventListener('click', () => {
    if (cachedGuests.length === 0) {
      if (window.showToast) window.showToast('No waitlist members to export.');
      return;
    }

    const headers = ['Pass #', 'Full Name', 'Email', 'Phone', 'Preferred Destinations', 'Tier', 'Joined Date'];
    const rows = cachedGuests.map(g => [
      `"${g.pass_number || g.passNumber || ''}"`,
      `"${g.full_name || g.fullName || ''}"`,
      `"${g.email || ''}"`,
      `"${g.phone || ''}"`,
      `"${g.preferred_destinations || g.destinations || ''}"`,
      `"${g.tier || 'Founding Circle'}"`,
      `"${g.created_at || ''}"`
    ]);

    downloadCsv('luxea_vip_waitlist.csv', [headers.join(','), ...rows.map(r => r.join(','))].join('\n'));
  });

  exportHostWaitlistBtn?.addEventListener('click', () => {
    if (cachedHostWaitlist.length === 0) {
      if (window.showToast) window.showToast('No host waitlist members to export.');
      return;
    }

    const headers = ['Pass #', 'Full Name', 'Email', 'Phone', 'Property Name', 'Property Type', 'Bedrooms', 'Region', 'Readiness', 'Portfolio Link', 'Notes', 'Tier', 'Date'];
    const rows = cachedHostWaitlist.map(h => [
      `"${h.pass_number || h.passNumber || ''}"`,
      `"${h.full_name || h.fullName || ''}"`,
      `"${h.email || ''}"`,
      `"${h.phone || ''}"`,
      `"${h.property_name || h.propertyName || ''}"`,
      `"${h.property_type || h.propertyType || ''}"`,
      h.bedrooms || 1,
      `"${h.region || ''}"`,
      `"${h.operational_status || h.operationalStatus || ''}"`,
      `"${h.portfolio_link || h.portfolioLink || ''}"`,
      `"${(h.notes || '').replace(/"/g, '""')}"`,
      `"${h.tier || 'Founding Host Partner'}"`,
      `"${h.created_at || h.timestamp || ''}"`
    ]);

    downloadCsv('luxea_founding_host_waitlist.csv', [headers.join(','), ...rows.map(r => r.join(','))].join('\n'));
  });

  function downloadCsv(filename, content) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (window.showToast) window.showToast(`📥 Exported ${filename}`);
  }

  // Live Sync Engine Button
  const refreshBtn = document.getElementById('refreshAdminDataBtn');
  refreshBtn?.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.style.opacity = '0.7';
    if (window.showToast) window.showToast('🔄 Synchronizing live portfolio data...');
    await loadDashboardData();
    setTimeout(() => {
      refreshBtn.disabled = false;
      refreshBtn.style.opacity = '1';
      if (window.showToast) window.showToast('✅ Live engine synchronized.');
    }, 400);
  });

  // =========================================================================
  // 9. LIVE MULTI-TAB & REALTIME LISTENERS
  // =========================================================================
  let reloadTimer = null;
  const triggerLiveReload = () => {
    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(async () => {
      console.log('⚡ [Admin Realtime] Live change detected -> refreshing admin views');
      await loadDashboardData();
    }, 300);
  };

  window.addEventListener('luxea:host_updated', triggerLiveReload);
  window.addEventListener('luxea:property_updated', triggerLiveReload);
  window.addEventListener('luxea:profile_updated', triggerLiveReload);
  window.addEventListener('luxea:waitlist_updated', triggerLiveReload);
  window.addEventListener('luxea:host_waitlist_updated', triggerLiveReload);
  window.addEventListener('luxea:data_updated', triggerLiveReload);
  window.addEventListener('luxea:dataUpdated', triggerLiveReload);

  // =========================================================================
  // 10. EXECUTIVE PROVISIONING & HOST EDIT / SECURITY CONTROL MODALS
  // =========================================================================
  let activeEditingEmail = null;
  let activeEditingUserId = null;
  let activeEditingRef = null;
  let activeEditingIsSuspended = false;
  let activeEditingIsDelisted = false;

  async function handleToggleSuspend(email, isCurrentlySuspended) {
    if (!email) {
      if (window.showToast) window.showToast('No email associated with this host partner.');
      return;
    }
    const nextState = !isCurrentlySuspended;
    const actionDesc = nextState ? 'BLOCK / SUSPEND portal access (hide earnings & payout dashboard)' : 'RESTORE portal access';
    if (!confirm(`Are you sure you want to ${actionDesc} for ${email}?`)) return;

    if (window.showToast) window.showToast('Updating host portal access...');
    if (window.LuxeaDB && typeof window.LuxeaDB.toggleHostSuspension === 'function') {
      const res = await window.LuxeaDB.toggleHostSuspension(email, nextState);
      if (res && res.success) {
        if (window.showToast) {
          window.showToast(nextState
            ? '🔒 Host portal access suspended. Earnings, payouts & personal details are now hidden.'
            : '🔓 Host portal access successfully restored.');
        }
        await loadDashboardData();
      } else {
        if (window.showToast) window.showToast(`Error: ${res?.error || 'Database operation failed'}`);
      }
    }
  }

  async function handleToggleDelist(email, isCurrentlyDelisted) {
    if (!email) {
      if (window.showToast) window.showToast('No email associated with this host partner.');
      return;
    }
    const nextState = !isCurrentlyDelisted;
    const actionDesc = nextState ? 'DELIST & HIDE residences from live Stays catalog' : 'RELIST & PUBLISH residences on live platform';
    if (!confirm(`Are you sure you want to ${actionDesc} for ${email}?`)) return;

    if (window.showToast) window.showToast('Updating platform listing status...');
    if (window.LuxeaDB && typeof window.LuxeaDB.toggleHostDelist === 'function') {
      const res = await window.LuxeaDB.toggleHostDelist(email, nextState);
      if (res && res.success) {
        if (window.showToast) {
          window.showToast(nextState
            ? '🚫 Host properties delisted and unpublished from the live platform.'
            : '🌐 Host properties relisted and published live on the platform catalog.');
        }
        await loadDashboardData();
      } else {
        if (window.showToast) window.showToast(`Error: ${res?.error || 'Database operation failed'}`);
      }
    }
  }

  function openCreateAccountModal() {
    if (createUserModal) createUserModal.classList.add('open');
  }

  function closeCreateAccountModal() {
    if (createUserModal) createUserModal.classList.remove('open');
    if (createUserForm) createUserForm.reset();
    if (newAccAvatarPreview) newAccAvatarPreview.classList.add('hidden');
    if (newAccPropPhotoPreview) newAccPropPhotoPreview.classList.add('hidden');
  }

  function openEditProfileModal(identifier, type = 'host') {
    if (!editProfileModal) return;

    const host = cachedHosts.find(h =>
      (h.refId || h.ref_id) === identifier ||
      (h.email || '').toLowerCase() === (identifier || '').toLowerCase()
    );

    const profile = cachedProfiles.find(p =>
      (p.email || '').toLowerCase() === (identifier || '').toLowerCase() ||
      p.id === identifier
    );

    const email = host?.email || profile?.email || identifier || '';
    const name = host?.fullName || host?.full_name || profile?.full_name || (email ? email.split('@')[0] : 'User');
    const phone = host?.phone || profile?.phone || '';
    const ref = host?.refId || host?.ref_id || 'LUX-USER';
    const propName = host?.propertyName || host?.property_name || '';
    const bio = host?.host_bio || profile?.bio || '';
    const role = profile?.role || (host ? 'host' : 'member');
    const avatarUrl = profile?.avatar_url || host?.avatar_url || '';
    const photoUrls = host?.property_photos_urls || [];
    const isSuspended = host?.is_suspended === true || profile?.is_suspended === true || (role === 'suspended') || (host?.review_status === 'suspended');
    const isDelisted = host?.is_delisted === true;

    activeEditingEmail = email;
    activeEditingUserId = profile?.id || null;
    activeEditingRef = ref;
    activeEditingIsSuspended = isSuspended;
    activeEditingIsDelisted = isDelisted;

    if (editProfileRef) editProfileRef.textContent = ref;
    if (editProfileTitle) editProfileTitle.textContent = `Edit Profile: ${name}`;
    if (editProfileUserId) editProfileUserId.value = activeEditingUserId || '';
    if (editProfileRefId) editProfileRefId.value = activeEditingRef || '';
    if (editProfileFullName) editProfileFullName.value = name;
    if (editProfileEmail) editProfileEmail.value = email;
    if (editProfileRole) editProfileRole.value = isSuspended ? 'suspended' : role;
    if (editProfilePhone) editProfilePhone.value = phone;
    if (editProfilePropName) editProfilePropName.value = propName;
    if (editProfileBio) editProfileBio.value = bio;

    // Avatar preview
    if (editProfileAvatarImg && editProfileAvatarStatus) {
      if (avatarUrl) {
        editProfileAvatarImg.src = avatarUrl;
        editProfileAvatarImg.style.display = 'block';
        editProfileAvatarStatus.textContent = 'Current custom avatar';
        editProfileAvatarStatus.style.color = '#15803D';
      } else {
        editProfileAvatarImg.style.display = 'none';
        editProfileAvatarStatus.textContent = 'No custom avatar';
        editProfileAvatarStatus.style.color = '#8F847C';
      }
    }

    // Property photo preview
    if (editProfilePropImg && editProfilePropStatus) {
      if (photoUrls && photoUrls.length > 0) {
        editProfilePropImg.src = photoUrls[0];
        editProfilePropImg.style.display = 'block';
        editProfilePropStatus.textContent = `${photoUrls.length} photo(s) on file`;
        editProfilePropStatus.style.color = '#15803D';
      } else {
        editProfilePropImg.style.display = 'none';
        editProfilePropStatus.textContent = 'No property photo';
        editProfilePropStatus.style.color = '#8F847C';
      }
    }

    // Host controls visibility & labels
    const isHostAccount = host || role === 'host';
    if (editProfileHostSection) editProfileHostSection.style.display = isHostAccount ? 'block' : 'none';
    if (editProfilePropPhotoWrap) editProfilePropPhotoWrap.style.display = isHostAccount ? 'block' : 'none';
    if (editProfileHostControls) editProfileHostControls.style.display = isHostAccount ? 'flex' : 'none';

    updateSecurityButtonsUI();
    editProfileModal.classList.add('open');
  }

  function closeEditProfileModal() {
    if (editProfileModal) editProfileModal.classList.remove('open');
    if (editProfileAvatarFile) editProfileAvatarFile.value = '';
    if (editProfilePropPhotoFile) editProfilePropPhotoFile.value = '';
  }

  function updateSecurityButtonsUI() {
    if (labelToggleSuspend && btnToggleSuspendHost) {
      if (activeEditingIsSuspended) {
        labelToggleSuspend.textContent = '🔓 Unblock / Restore Access';
        btnToggleSuspendHost.style.color = '#15803D';
        btnToggleSuspendHost.style.borderColor = '#86EFAC';
        btnToggleSuspendHost.style.background = '#DCFCE7';
      } else {
        labelToggleSuspend.textContent = '🔒 Block / Suspend Access';
        btnToggleSuspendHost.style.color = '#DC2626';
        btnToggleSuspendHost.style.borderColor = '#FCA5A5';
        btnToggleSuspendHost.style.background = 'transparent';
      }
    }

    if (labelToggleDelist && btnToggleDelistHost) {
      if (activeEditingIsDelisted) {
        labelToggleDelist.textContent = '🌐 Relist on Platform';
        btnToggleDelistHost.style.color = '#1D4ED8';
        btnToggleDelistHost.style.borderColor = '#93C5FD';
        btnToggleDelistHost.style.background = '#DBEAFE';
      } else {
        labelToggleDelist.textContent = '🚫 Delist from Platform';
        btnToggleDelistHost.style.color = '#D97706';
        btnToggleDelistHost.style.borderColor = '#FCD34D';
        btnToggleDelistHost.style.background = 'transparent';
      }
    }
  }

  // Hook Security Control Buttons inside Edit Profile Modal
  btnToggleSuspendHost?.addEventListener('click', async () => {
    if (!activeEditingEmail) return;
    const nextState = !activeEditingIsSuspended;
    await handleToggleSuspend(activeEditingEmail, activeEditingIsSuspended);
    activeEditingIsSuspended = nextState;
    updateSecurityButtonsUI();
  });

  btnToggleDelistHost?.addEventListener('click', async () => {
    if (!activeEditingEmail) return;
    const nextState = !activeEditingIsDelisted;
    await handleToggleDelist(activeEditingEmail, activeEditingIsDelisted);
    activeEditingIsDelisted = nextState;
    updateSecurityButtonsUI();
  });

  // Edit Profile Form Submission
  editProfileForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('saveEditProfileBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span>Saving...</span>';
    }

    try {
      let newAvatarUrl = null;
      let newPropUrl = null;

      if (editProfileAvatarFile && editProfileAvatarFile.files[0]) {
        if (window.showToast) window.showToast('Uploading custom avatar...');
        newAvatarUrl = await window.LuxeaDB.uploadListingPhoto(editProfileAvatarFile.files[0], 'hosts');
      }

      if (editProfilePropPhotoFile && editProfilePropPhotoFile.files[0]) {
        if (window.showToast) window.showToast('Uploading property photo...');
        newPropUrl = await window.LuxeaDB.uploadListingPhoto(editProfilePropPhotoFile.files[0], 'properties');
      }

      const updates = {
        email: activeEditingEmail,
        ref_id: activeEditingRef,
        full_name: editProfileFullName ? editProfileFullName.value.trim() : '',
        phone: editProfilePhone ? editProfilePhone.value.trim() : '',
        role: editProfileRole ? editProfileRole.value : 'member',
        property_name: editProfilePropName ? editProfilePropName.value.trim() : '',
        bio: editProfileBio ? editProfileBio.value.trim() : '',
        avatar_url: newAvatarUrl || undefined
      };

      if (newPropUrl) {
        const existing = cachedHosts.find(h => (h.email || '').toLowerCase() === (activeEditingEmail || '').toLowerCase());
        const photos = existing?.property_photos_urls || [];
        updates.property_photos_urls = [newPropUrl, ...photos];
      }

      if (window.LuxeaDB && typeof window.LuxeaDB.updateHostProfile === 'function') {
        const res = await window.LuxeaDB.updateHostProfile(activeEditingEmail, updates);
        if (res && res.success) {
          if (activeEditingUserId && updates.role && typeof window.LuxeaDB.updateProfileRole === 'function') {
            await window.LuxeaDB.updateProfileRole(activeEditingUserId, updates.role);
          }
          if (window.showToast) window.showToast('✅ Profile updated successfully!');
          closeEditProfileModal();
          await loadDashboardData();
        } else {
          if (window.showToast) window.showToast(`Error: ${res?.error || 'Update failed'}`);
        }
      }
    } catch (err) {
      console.error('Save profile exception:', err);
      if (window.showToast) window.showToast('Failed to save profile changes');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<span>Save Changes ↗</span>';
      }
    }
  });

  // Account Provisioning Form Submission
  createUserForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submitCreateUserBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Provisioning Account...</span>';
    }

    try {
      let avatarUrl = '';
      let propPhotoUrl = '';

      if (newAccAvatarFile && newAccAvatarFile.files[0]) {
        if (window.showToast) window.showToast('Uploading profile avatar...');
        avatarUrl = await window.LuxeaDB.uploadListingPhoto(newAccAvatarFile.files[0], 'hosts') || '';
      }

      if (newAccPropPhotoFile && newAccPropPhotoFile.files[0]) {
        if (window.showToast) window.showToast('Uploading property photo...');
        propPhotoUrl = await window.LuxeaDB.uploadListingPhoto(newAccPropPhotoFile.files[0], 'properties') || '';
      }

      const accountData = {
        full_name: document.getElementById('newAccFullName').value.trim(),
        email: document.getElementById('newAccEmail').value.trim(),
        role: newAccRole ? newAccRole.value : 'host',
        phone: document.getElementById('newAccPhone')?.value?.trim() || '',
        password: document.getElementById('newAccPassword').value,
        property_name: document.getElementById('newAccPropName')?.value?.trim() || 'Luxury Residence',
        property_type: document.getElementById('newAccPropType')?.value || 'Apartment',
        county: document.getElementById('newAccCounty')?.value?.trim() || 'Nairobi',
        area: document.getElementById('newAccArea')?.value?.trim() || 'Kenya',
        bio: document.getElementById('newAccBio')?.value?.trim() || '',
        avatar_url: avatarUrl,
        property_photos_urls: propPhotoUrl ? [propPhotoUrl] : [],
        send_credentials: document.getElementById('newAccSendEmail')?.checked ?? true
      };

      if (window.showToast) window.showToast(`Provisioning account for ${accountData.email}...`);

      let res = null;
      if (window.LuxeaDB && typeof window.LuxeaDB.provisionUser === 'function') {
        res = await window.LuxeaDB.provisionUser(accountData);
      } else if (window.LuxeaDB && typeof window.LuxeaDB.sendAutomatedEmail === 'function') {
        res = await window.LuxeaDB.sendAutomatedEmail('admin_provision_user', accountData);
      } else {
        const fetchRes = await fetch('https://abzcabiqdkmfaijnqbkf.supabase.co/functions/v1/luxea-mailer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'admin_provision_user', record: accountData })
        });
        res = await fetchRes.json();
      }
      if (res && res.success) {
        if (window.showToast) {
          window.showToast(`✅ Account successfully created for ${accountData.email}! ${accountData.send_credentials ? 'Credentials dispatched via email.' : ''}`);
        }
        closeCreateAccountModal();
        await loadDashboardData();
        // Immediately jump to the right tab so the admin sees the new entry
        if (accountData.role === 'host') {
          switchTab('hosts');
        } else {
          switchTab('profiles');
        }
      } else {
        if (window.showToast) {
          window.showToast(`❌ Provisioning notice: ${res?.error || 'Account could not be created.'}`);
        }
        closeCreateAccountModal();
        await loadDashboardData();
      }
    } catch (err) {
      console.error('Provisioning exception:', err);
      if (window.showToast) window.showToast('Provisioning failed. Check network or permissions.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Provision &amp; Verify Account ↗</span>';
      }
    }
  });

  // Modal Triggers & File Previews
  openCreateHostModalBtn?.addEventListener('click', () => {
    if (newAccRole) newAccRole.value = 'host';
    if (newAccHostSection) newAccHostSection.style.display = 'block';
    if (newAccPropPhotoWrap) newAccPropPhotoWrap.style.display = 'block';
    openCreateAccountModal();
  });

  openCreateUserModalBtn?.addEventListener('click', () => {
    openCreateAccountModal();
  });

  closeCreateUserModalBtn?.addEventListener('click', closeCreateAccountModal);
  cancelCreateUserBtn?.addEventListener('click', closeCreateAccountModal);
  createUserModal?.addEventListener('click', (e) => {
    if (e.target === createUserModal) closeCreateAccountModal();
  });

  closeEditProfileModalBtn?.addEventListener('click', closeEditProfileModal);
  cancelEditProfileBtn?.addEventListener('click', closeEditProfileModal);
  editProfileModal?.addEventListener('click', (e) => {
    if (e.target === editProfileModal) closeEditProfileModal();
  });

  newAccRole?.addEventListener('change', () => {
    const isHost = newAccRole.value === 'host';
    if (newAccHostSection) newAccHostSection.style.display = isHost ? 'block' : 'none';
    if (newAccPropPhotoWrap) newAccPropPhotoWrap.style.display = isHost ? 'block' : 'none';
  });

  btnGenPass?.addEventListener('click', () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    const pass = `LX-${code}!${Math.floor(1000 + Math.random() * 9000)}`;
    const passInput = document.getElementById('newAccPassword');
    if (passInput) passInput.value = pass;
    if (navigator.clipboard) navigator.clipboard.writeText(pass);
    if (window.showToast) window.showToast(`📋 Secure password generated & copied: ${pass}`);
  });

  newAccAvatarFile?.addEventListener('change', () => {
    const file = newAccAvatarFile.files[0];
    if (file && newAccAvatarImg && newAccAvatarPreview) {
      newAccAvatarImg.src = URL.createObjectURL(file);
      newAccAvatarPreview.classList.remove('hidden');
    }
  });

  newAccPropPhotoFile?.addEventListener('change', () => {
    const file = newAccPropPhotoFile.files[0];
    if (file && newAccPropPhotoImg && newAccPropPhotoPreview) {
      newAccPropPhotoImg.src = URL.createObjectURL(file);
      newAccPropPhotoPreview.classList.remove('hidden');
    }
  });

  editProfileAvatarFile?.addEventListener('change', () => {
    const file = editProfileAvatarFile.files[0];
    if (file && editProfileAvatarImg && editProfileAvatarStatus) {
      editProfileAvatarImg.src = URL.createObjectURL(file);
      editProfileAvatarImg.style.display = 'block';
      editProfileAvatarStatus.textContent = '✓ New photo selected';
      editProfileAvatarStatus.style.color = '#15803D';
    }
  });

  editProfilePropPhotoFile?.addEventListener('change', () => {
    const file = editProfilePropPhotoFile.files[0];
    if (file && editProfilePropImg && editProfilePropStatus) {
      editProfilePropImg.src = URL.createObjectURL(file);
      editProfilePropImg.style.display = 'block';
      editProfilePropStatus.textContent = '✓ New property photo selected';
      editProfilePropStatus.style.color = '#15803D';
    }
  });

  // Initial check
  checkAuth();
}

// Auto-run if on admin page
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('adminDashboardView')) {
    initAdminDashboard();
  }
});
