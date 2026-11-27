/**
 * LUXEA LIVING — SUPER ADMIN COMMAND MODULE (admin.js)
 * High-End Executive Command Center
 * Security:
 * 1. Strictly backend-authenticated via Supabase Auth JWT + public.lux_profiles role verification
 * 2. Zero hardcoded passwords or client-side localStorage auth bypasses
 * 3. HTML-escaped rendering (XSS protection) & CSV formula injection protection
 * 4. Private KYC documents opened via short-lived 5-minute signed URLs
 */

import { LUXEA_STAYS } from './staysData.js';
import { DEFAULT_LAUNDRY_PROVIDERS } from './laundryManager.js';

function esc(v) {
  if (window.LuxeaSanitize) return window.LuxeaSanitize.escapeHtml(v);
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(u, fallback = '') {
  if (window.LuxeaSanitize) return window.LuxeaSanitize.safeUrl(u, fallback);
  return fallback;
}

function csvCell(v) {
  let s = String(v ?? '').replace(/\r?\n/g, ' ');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

// Short area/city codes so long location names fit cleanly in tables (full value kept in title tooltip)
const LOCATION_ABBR_RULES = [
  [/\bNairobi\b/gi, 'NRB'],
  [/\bWestlands\b/gi, 'WST'],
  [/\bKilimani\b/gi, 'KLM'],
  [/\bLavington\b/gi, 'LVG'],
  [/\bKileleshwa\b/gi, 'KLS'],
  [/\bRoysambu\b/gi, 'RYS'],
  [/\bKitisuru\b/gi, 'KTS'],
  [/\bMombasa\b/gi, 'MBA'],
  [/\bNaivasha\b/gi, 'NVS'],
  [/\bNanyuki\b/gi, 'NYK'],
  [/\bDiani\s*Beach\b/gi, 'Diani'],
  [/\bNorthern\s*Bypass\b/gi, 'N.Bypass'],
  [/\bRift\s*Valley\b/gi, 'R.Valley'],
  [/\bSouth\s*Coast\b/gi, 'S.Coast'],
  [/\bNorth\s*Coast\b/gi, 'N.Coast'],
  [/\bRuaka\b/gi, 'RKA'],
  [/\bKaren\b/gi, 'KRN'],
  [/\bKilifi\b/gi, 'KLF'],
  [/\bWatamu\b/gi, 'WTM'],
  [/\bMalindi\b/gi, 'MLD'],
  [/\bNakuru\b/gi, 'NKR'],
  [/\bKisumu\b/gi, 'KSM'],
  [/\bEldoret\b/gi, 'ELD'],
  [/\bKenya\b/gi, 'KE']
];

function abbrLocation(raw) {
  if (!raw) return '—';
  let out = String(raw).trim();
  LOCATION_ABBR_RULES.forEach(([rx, rep]) => {
    out = out.replace(rx, rep);
  });
  // Deduplicate repeated comma-separated parts (e.g. "NRB, NRB" -> "NRB")
  const parts = out.split(',').map(s => s.trim()).filter(Boolean);
  const seen = new Set();
  const dedup = parts.filter(p => {
    const k = p.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return dedup.join(', ') || '—';
}

function abbrType(raw) {
  const s = String(raw || '').trim();
  if (!s) return 'Stay';
  const l = s.toLowerCase();
  if (l.includes('apartment') || l.includes('bnb')) return 'Apt';
  if (l.includes('penthouse')) return 'Penthouse';
  if (l.includes('villa')) return 'Villa';
  if (l.includes('townhouse') || l.includes('townhome')) return 'Townhome';
  if (l.includes('hotel')) return 'Hotel';
  if (l.includes('studio')) return 'Studio';
  return s.length > 12 ? s.slice(0, 11) + '…' : s;
}

function abbrStatus(raw) {
  const l = String(raw || '').toLowerCase();
  if (l.includes('ready') || l.includes('active')) return 'Ready';
  if (l.includes('soon') || l.includes('month')) return 'Soon';
  if (l.includes('build') || l.includes('renovat')) return 'Setup';
  return raw ? (raw.length > 14 ? raw.slice(0, 13) + '…' : raw) : 'Ready';
}

export function initAdminDashboard() {
  let analyticsCurrencyMode = 'KES';
  let chartRegionalInstance = null;
  let chartAssetMixInstance = null;
  let chartGrowthInstance = null;
  let chartPricingInstance = null;

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
  const tabLaundry = document.getElementById('tabLaundryBtn');
  const viewLaundry = document.getElementById('viewLaundry');
  const laundryPartnersTableBody = document.getElementById('laundryPartnersTableBody');
  const laundryOrdersTableBody = document.getElementById('laundryOrdersTableBody');
  const laundryPartnersEmpty = document.getElementById('laundryPartnersEmptyState');
  const laundryOrdersEmpty = document.getElementById('laundryOrdersEmptyState');
  const laundrySearchInput = document.getElementById('laundrySearchInput');
  const laundryAreaFilter = document.getElementById('laundryAreaFilter');
  const copyLaundryInviteLinkBtn = document.getElementById('copyLaundryInviteLinkBtn');
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
  let cachedLaundryPartners = [];
  let cachedLaundryOrders = [];
  let currentStatusFilter = 'all';

  // =========================================================================
  // 1. STRICT SERVER-VERIFIED AUTHENTICATION GATE (SUPABASE JWT + lux_profiles)
  // =========================================================================
  async function checkAuth() {
    const publicHeader = document.getElementById('adminPublicHeader');
    const mobileBottomNav = document.querySelector('.mobile-bottom-nav');

    const verification = window.LuxeaAuth && typeof window.LuxeaAuth.verifyAdminSession === 'function'
      ? await window.LuxeaAuth.verifyAdminSession()
      : { valid: false };

    if (verification.valid && verification.admin) {
      const admin = verification.admin;
      loginGateway?.classList.add('hidden');
      dashboardView?.classList.remove('hidden');
      if (publicHeader) publicHeader.classList.add('hidden');
      if (mobileBottomNav) mobileBottomNav.classList.add('hidden');
      adminBadge?.classList.remove('hidden');
      logoutBtn?.classList.remove('hidden');

      const adminName = admin.name || admin.email || 'Admin';
      const firstName = adminName.split(' ')[0];
      const sidebarName = document.getElementById('sidebarAdminName');
      if (sidebarName) sidebarName.textContent = firstName;
      if (adminBadge) adminBadge.textContent = admin.role === 'super_admin' ? 'Super Admin' : 'System Admin';

      if (window.LuxeaDB && typeof window.LuxeaDB.initAdminRealtime === 'function') {
        window.LuxeaDB.initAdminRealtime();
      }
      const initialTab = new URLSearchParams(window.location.search).get('tab');
      if (initialTab && ['overview', 'hosts', 'stays', 'guests', 'hostWaitlist', 'profiles', 'laundry'].includes(initialTab)) {
        switchTab(initialTab, false);
      }
      loadDashboardData();
    } else {
      if (window.LuxeaDB && typeof window.LuxeaDB.stopAdminRealtime === 'function') {
        window.LuxeaDB.stopAdminRealtime();
      }
      loginGateway?.classList.remove('hidden');
      dashboardView?.classList.add('hidden');
      if (publicHeader) publicHeader.classList.remove('hidden');
      if (mobileBottomNav) mobileBottomNav.classList.remove('hidden');
      adminBadge?.classList.add('hidden');
      logoutBtn?.classList.add('hidden');
      if (verification.reason === 'not_admin' && loginErrorMsg) {
        loginErrorMsg.textContent = 'Access denied. Your signed-in account does not have active Administrator privileges.';
        loginErrorMsg.classList.remove('hidden');
      }
    }
  }

  // Listen to Supabase Auth OAuth return & token changes — always re-verify on server
  const authClient = window.LuxeaDB ? window.LuxeaDB.getClient() : null;
  if (authClient && authClient.auth) {
    try {
      authClient.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          if (window.location.hash && window.location.hash.includes('access_token')) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          checkAuth();
        }
      });
    } catch (e) {}
  }

  // Google OAuth for Verified Admins
  const adminGoogleBtn = document.getElementById('adminGoogleBtn');
  adminGoogleBtn?.addEventListener('click', async () => {
    const client = window.LuxeaDB ? window.LuxeaDB.getClient() : null;
    if (client && client.auth) {
      const btnText = document.getElementById('adminGoogleBtnText');
      if (btnText) btnText.textContent = 'Verifying with Google...';
      try {
        await client.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin + '/admin' }
        });
      } catch (err) {
        if (loginErrorMsg) {
          loginErrorMsg.textContent = 'Could not start Google Sign-In. Use verified credentials below.';
          loginErrorMsg.classList.remove('hidden');
        }
      }
    }
  });

  // Strict Email + Password Admin Login via Supabase Auth (ZERO client-side bypass)
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginErrorMsg?.classList.add('hidden');
    const submitBtn = document.getElementById('loginSubmitBtn');
    if (submitBtn) submitBtn.disabled = true;

    const email = loginEmail.value.trim().toLowerCase();
    const pass = loginPass.value;

    try {
      if (window.LuxeaAuth) {
        const result = await window.LuxeaAuth.loginAdmin(email, pass);
        if (result.success) {
          if (window.showToast) window.showToast(`✅ Welcome, ${result.user?.name?.split(' ')[0] || 'Admin'}!`);
          await checkAuth();
        } else if (loginErrorMsg) {
          loginErrorMsg.textContent = result.message || 'Invalid admin credentials.';
          loginErrorMsg.classList.remove('hidden');
        }
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  logoutBtn?.addEventListener('click', async () => {
    if (window.LuxeaAuth) {
      await window.LuxeaAuth.logoutAdmin();
      if (window.showToast) window.showToast('Signed out of Super Admin Console.');
      await checkAuth();
    }
  });

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

      // Laundry Partners & Orders
      const dbLaundry = typeof window.LuxeaDB.fetchLaundryPartners === 'function'
        ? await window.LuxeaDB.fetchLaundryPartners()
        : JSON.parse(localStorage.getItem('luxea_laundry_partners') || '[]');
      cachedLaundryPartners = (dbLaundry && dbLaundry.length > 0) ? dbLaundry : [...DEFAULT_LAUNDRY_PROVIDERS];

      cachedLaundryOrders = typeof window.LuxeaDB.fetchLaundryOrders === 'function'
        ? await window.LuxeaDB.fetchLaundryOrders()
        : JSON.parse(localStorage.getItem('luxea_laundry_orders') || '[]');
    } else {
      cachedHosts = JSON.parse(localStorage.getItem('luxea_host_applications') || '[]');
      cachedGuests = JSON.parse(localStorage.getItem('luxea_waitlist_guests') || '[]');
      cachedStays = JSON.parse(localStorage.getItem('luxea_cached_properties') || '[]');
      cachedHostWaitlist = JSON.parse(localStorage.getItem('luxea_host_waitlist') || '[]');
      cachedProfiles = [];
      cachedLaundryPartners = JSON.parse(localStorage.getItem('luxea_laundry_partners') || '[]');
      if (!cachedLaundryPartners || cachedLaundryPartners.length === 0) {
        cachedLaundryPartners = [...DEFAULT_LAUNDRY_PROVIDERS];
      }
      cachedLaundryOrders = JSON.parse(localStorage.getItem('luxea_laundry_orders') || '[]');
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
    cachedLaundryPartners = sortNewestFirst(cachedLaundryPartners);
    cachedLaundryOrders = sortNewestFirst(cachedLaundryOrders);



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

    // Dedicated Laundry Cards & Metrics
    const totalLaundryPartners = cachedLaundryPartners.length;
    const activeLaundryOrders = cachedLaundryOrders.filter(o => {
      const s = (o.status || '').toLowerCase();
      return s === 'requested' || s === 'accepted' || s === 'picked_up' || s === 'in_process';
    }).length;
    const completedLaundryOrders = cachedLaundryOrders.filter(o => {
      const s = (o.status || '').toLowerCase();
      return s === 'delivered' || s === 'completed';
    }).length;
    const laundryGmv = cachedLaundryOrders.reduce((sum, o) => {
      const val = parseFloat(o.total_amount_kes || o.amount_kes || o.amount || 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    const elTotalLaundry = document.getElementById('metricTotalLaundryPartners');
    const elActiveLaundry = document.getElementById('metricActiveLaundryOrders');
    const elCompletedLaundry = document.getElementById('metricCompletedLaundryOrders');
    const elLaundryGmv = document.getElementById('metricLaundryGmv');
    if (elTotalLaundry) elTotalLaundry.textContent = totalLaundryPartners;
    if (elActiveLaundry) elActiveLaundry.textContent = activeLaundryOrders;
    if (elCompletedLaundry) elCompletedLaundry.textContent = completedLaundryOrders;
    if (elLaundryGmv) elLaundryGmv.textContent = formatAdminMoney(laundryGmv);

    const countTagPartners = document.getElementById('laundryPartnersCountTag');
    if (countTagPartners) countTagPartners.textContent = `${totalLaundryPartners}`;

    const countTagOrders = document.getElementById('laundryOrdersCountTag');
    if (countTagOrders) countTagOrders.textContent = `${cachedLaundryOrders.length}`;

    // Tab counters & overview quick jump counts
    const tHost = document.getElementById('hostTabCounter');
    const tStays = document.getElementById('staysTabCounter');
    const tGuest = document.getElementById('guestTabCounter');
    const tHostWaitlist = document.getElementById('hostWaitlistTabCounter');
    const tProfiles = document.getElementById('profilesTabCounter');
    const tLaundry = document.getElementById('laundryTabCounter');
    if (tHost) tHost.textContent = totalHosts;
    if (tStays) tStays.textContent = totalStays;
    if (tGuest) tGuest.textContent = totalGuests;
    if (tHostWaitlist) tHostWaitlist.textContent = totalHostWaitlist;
    if (tProfiles) tProfiles.textContent = totalProfiles;
    if (tLaundry) tLaundry.textContent = totalLaundryPartners;

    const jHosts = document.getElementById('jumpHostsCount');
    const jStays = document.getElementById('jumpStaysCount');
    const jGuests = document.getElementById('jumpGuestsCount');
    const jWaitlist = document.getElementById('jumpWaitlistCount');
    const jLaundry = document.getElementById('jumpLaundryCount');
    if (jHosts) jHosts.textContent = totalHosts;
    if (jStays) jStays.textContent = totalStays;
    if (jGuests) jGuests.textContent = totalGuests;
    if (jWaitlist) jWaitlist.textContent = totalHostWaitlist;
    if (jLaundry) jLaundry.textContent = totalLaundryPartners;

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
      if (pendingPill) {
        pendingPill.classList.add('has-pending');
        if (!pendingPill.querySelector('.pulsing-beacon-dot')) {
          const dot = document.createElement('span');
          dot.className = 'pulsing-beacon-dot';
          pendingPill.prepend(dot);
        }
      }

      if (pendingBanner) {
        pendingBanner.classList.remove('hidden');
        if (pendingBannerCount) pendingBannerCount.textContent = pendingHosts;
        const latestPending = cachedHosts.find(h => !h.review_status || h.review_status === 'pending_review');
        if (latestPending && pendingBannerLink) {
          const ref = latestPending.ref_id || latestPending.refId;
          pendingBannerLink.href = `/admin/host-dossier?ref=${encodeURIComponent(ref)}&from=hosts`;
          pendingBannerLink.textContent = `Review ${latestPending.full_name || latestPending.fullName || 'Host'} ↗`;
        }
      }

      if (trendPendingBadge) {
        trendPendingBadge.textContent = `${pendingHosts} new`;
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
        trendPendingBadge.textContent = '0';
        trendPendingBadge.classList.remove('pulse-badge');
      }
    }

    // =======================================================================
    // ANALYTICS HUB 1: NUMBERS-FIRST VALUATION (STANDARD KSh, OPTIONAL USD)
    // =======================================================================
    const availMap = JSON.parse(localStorage.getItem('luxea_host_avail_map') || '{}');
    const usdRate = (window.LUXEA_CONFIG && window.LUXEA_CONFIG.currency && window.LUXEA_CONFIG.currency.exchangeRateUsdToKes) || 130;
    let totalKesVal = 0;
    let activeStaysCount = 0;

    cachedStays.forEach(s => {
      const isAvail = availMap[s.id] !== undefined ? availMap[s.id] : (s.is_available !== false);
      if (isAvail) {
        activeStaysCount++;
        const kes = parseFloat(s.price_per_night_kes) || parseFloat(s.kesPrice) || ((parseFloat(s.price_per_night_usd) || 0) * usdRate);
        totalKesVal += kes;
      }
    });

    const isKes = analyticsCurrencyMode === 'KES';
    const totalDisplayVal = isKes ? Math.round(totalKesVal) : Math.round(totalKesVal / usdRate);
    const adrKes = activeStaysCount > 0 ? Math.round(totalKesVal / activeStaysCount) : 0;
    const monthlyGrossKes = Math.round(totalKesVal * 30 * 0.7);

    const elMainSymbol = document.getElementById('analyticsMainSymbol');
    const elTotalPrimary = document.getElementById('analyticsTotalPrimary');
    const elAdr = document.getElementById('analyticsAdr');
    const elMonthlyGross = document.getElementById('analyticsMonthlyGross');
    const elApprovalRate = document.getElementById('analyticsApprovalRate');
    const elApprovalSub = document.getElementById('analyticsApprovalSub');
    const elAssetMixTag = document.getElementById('assetMixTotalTag');
    const elChartAdrTag = document.getElementById('chartAdrTag');
    const elChartAreaCurrTag = document.getElementById('chartAreaCurrencyTag');

    if (elMainSymbol) elMainSymbol.textContent = isKes ? 'KSh' : '$';
    if (elTotalPrimary) elTotalPrimary.textContent = totalDisplayVal.toLocaleString();
    if (elAdr) elAdr.textContent = formatAdminMoney(adrKes);
    if (elMonthlyGross) elMonthlyGross.textContent = formatAdminMoney(monthlyGrossKes, true);

    const totalApplications = approvedHosts + pendingHosts;
    const approvalPct = totalApplications > 0 ? Math.round((approvedHosts / totalApplications) * 1000) / 10 : 100;
    if (elApprovalRate) elApprovalRate.textContent = `${approvalPct}%`;
    if (elApprovalSub) elApprovalSub.textContent = `${pendingHosts} pending`;

    if (elAssetMixTag) elAssetMixTag.textContent = `${cachedStays.length} stays`;
    if (elChartAdrTag) elChartAdrTag.textContent = `Avg: ${formatAdminMoney(adrKes)}`;
    if (elChartAreaCurrTag) elChartAreaCurrTag.textContent = isKes ? 'KSh' : 'USD';

    // Populate dedicated Stays View KPI cards
    const staysCardUsd = document.getElementById('staysCardUsd');
    const staysCardAdr = document.getElementById('staysCardAdr');
    const staysCardOnlinePct = document.getElementById('staysCardOnlinePct');
    if (staysCardUsd) staysCardUsd.textContent = formatAdminMoney(totalKesVal);
    if (staysCardAdr) staysCardAdr.textContent = formatAdminMoney(adrKes);
    if (staysCardOnlinePct) {
      const onlinePct = cachedStays.length > 0 ? Math.round((activeStaysCount / cachedStays.length) * 100) : 0;
      staysCardOnlinePct.textContent = `${onlinePct}%`;
    }

    // Render / Update Chart.js graphs
    renderAnalyticsCharts();
  }

  // =========================================================================
  // CHARTS ENGINE (CHART.JS — STANDARD KSh, OPTIONAL USD)
  // =========================================================================
  function formatAdminMoney(kesVal, compact = false) {
    const usdRate = (window.LUXEA_CONFIG && window.LUXEA_CONFIG.currency && window.LUXEA_CONFIG.currency.exchangeRateUsdToKes) || 130;
    const isKes = analyticsCurrencyMode === 'KES';
    const raw = isKes ? Math.round(Number(kesVal) || 0) : Math.round((Number(kesVal) || 0) / usdRate);
    if (compact) {
      if (raw >= 1000000) {
        const m = (raw / 1000000).toFixed(1).replace(/\.0$/, '');
        return isKes ? `KSh ${m}M` : `$${m}M`;
      }
      if (raw >= 100000) {
        const k = Math.round(raw / 1000);
        return isKes ? `KSh ${k}k` : `$${k}k`;
      }
    }
    return isKes ? `KSh ${raw.toLocaleString()}` : `$${raw.toLocaleString()}`;
  }

  function renderAnalyticsCharts() {
    if (typeof Chart === 'undefined') {
      setTimeout(renderAnalyticsCharts, 250);
      return;
    }

    const usdRate = (window.LUXEA_CONFIG && window.LUXEA_CONFIG.currency && window.LUXEA_CONFIG.currency.exchangeRateUsdToKes) || 130;
    const isKes = analyticsCurrencyMode === 'KES';

    // 1. Chart: Value by Area
    const regionVal = {};
    cachedStays.forEach(s => {
      const isAvail = s.is_available !== false;
      if (!isAvail) return;
      const hub = s.city || s.location_group || s.area || 'Other';
      const cleanHub = abbrLocation(hub.split(',')[0].trim());

      const kes = parseFloat(s.price_per_night_kes) || parseFloat(s.kesPrice) || ((parseFloat(s.price_per_night_usd) || 0) * usdRate);
      const val = isKes ? Math.round(kes) : Math.round(kes / usdRate);
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
            label: isKes ? 'KSh / Night' : 'USD / Night',
            data: regionData,
            backgroundColor: [
              'rgba(212, 175, 55, 0.88)',
              'rgba(56, 189, 248, 0.88)',
              'rgba(74, 222, 128, 0.88)',
              'rgba(178, 150, 125, 0.88)'
            ],
            borderColor: ['#B28756', '#0284C7', '#16A34A', '#7D5A44'],
            borderWidth: 1.5,
            borderRadius: 6,
            maxBarThickness: 34
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
              padding: 8,
              titleFont: { size: 10, family: "'Plus Jakarta Sans', sans-serif" },
              bodyFont: { size: 9.5, family: "'Plus Jakarta Sans', sans-serif" },
              callbacks: {
                label: function (ctx) {
                  return isKes
                    ? ` KSh ${ctx.raw.toLocaleString()} / night`
                    : ` $${ctx.raw.toLocaleString()} / night`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 10, family: "'Plus Jakarta Sans', sans-serif", weight: '600' }, color: '#604D42' }
            },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(178, 150, 125, 0.12)' },
              ticks: {
                callback: (v) => isKes ? (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`) : `$${v}`,
                font: { size: 9.5, family: "'Plus Jakarta Sans', sans-serif" },
                color: '#604D42'
              }
            }
          }
        }
      });
    }

    // 2. Chart: Stay Types (Doughnut)
    const catMap = { 'Penthouse': 0, 'Villa': 0, 'Townhome': 0, 'Apt': 0 };
    cachedStays.forEach(s => {
      const cat = (s.property_type || s.category || '').toLowerCase();
      if (cat.includes('penthouse')) catMap['Penthouse']++;
      else if (cat.includes('villa')) catMap['Villa']++;
      else if (cat.includes('townhouse') || cat.includes('townhome')) catMap['Townhome']++;
      else catMap['Apt']++;
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
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 10,
                padding: 10,
                font: { size: 9.5, family: "'Plus Jakarta Sans', sans-serif", weight: '600' },
                color: '#241812'
              }
            },
            tooltip: {
              backgroundColor: '#1E140F',
              titleColor: '#D4AF37',
              bodyColor: '#EDE8E3',
              borderColor: '#B28756',
              borderWidth: 1,
              padding: 8,
              titleFont: { size: 10, family: "'Plus Jakarta Sans', sans-serif" },
              bodyFont: { size: 9.5, family: "'Plus Jakarta Sans', sans-serif" },
              callbacks: {
                label: function (ctx) {
                  const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                  const pct = Math.round((ctx.raw / (total || 1)) * 100);
                  return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
                }
              }
            }
          },
          cutout: '66%'
        }
      });
    }

    // 3. Chart: Growth
    const approvedCount = cachedHosts.filter(h => h.review_status === 'approved').length;
    const canvasGrowth = document.getElementById('chartGrowthTrajectory');
    if (canvasGrowth) {
      const ctx = canvasGrowth.getContext('2d');
      if (chartGrowthInstance) chartGrowthInstance.destroy();
      chartGrowthInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Launch', 'W1', 'W2', 'Now', 'Goal'],
          datasets: [
            {
              label: 'Stays',
              data: [1, 2, 3, cachedStays.length, 12],
              borderColor: '#B28756',
              backgroundColor: 'rgba(212, 175, 55, 0.12)',
              fill: true,
              tension: 0.35,
              borderWidth: 2,
              pointBackgroundColor: '#B28756',
              pointRadius: 3
            },
            {
              label: 'Hosts',
              data: [1, 2, 4, approvedCount, 15],
              borderColor: '#4A342A',
              borderWidth: 1.8,
              tension: 0.35,
              pointBackgroundColor: '#4A342A',
              pointRadius: 3
            },
            {
              label: 'Waitlist',
              data: [2, 3, 5, cachedHostWaitlist.length, 25],
              borderColor: '#F59E0B',
              borderDash: [5, 5],
              borderWidth: 1.8,
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
              labels: { boxWidth: 10, padding: 10, font: { size: 9.5, family: "'Plus Jakarta Sans', sans-serif" }, color: '#241812' }
            },
            tooltip: {
              backgroundColor: '#1E140F',
              titleColor: '#D4AF37',
              bodyColor: '#EDE8E3',
              borderColor: '#B28756',
              borderWidth: 1,
              padding: 8,
              titleFont: { size: 10, family: "'Plus Jakarta Sans', sans-serif" },
              bodyFont: { size: 9.5, family: "'Plus Jakarta Sans', sans-serif" }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 9.5, family: "'Plus Jakarta Sans', sans-serif" }, color: '#604D42' }
            },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(178, 150, 125, 0.12)' },
              ticks: { font: { size: 9.5, family: "'Plus Jakarta Sans', sans-serif" }, color: '#604D42' }
            }
          }
        }
      });
    }

    // 4. Chart: Nightly Rates
    const sortedStays = [...cachedStays].sort((a, b) => {
      const pA = parseFloat(a.price_per_night_kes) || ((parseFloat(a.price_per_night_usd) || 0) * usdRate);
      const pB = parseFloat(b.price_per_night_kes) || ((parseFloat(b.price_per_night_usd) || 0) * usdRate);
      return pB - pA;
    });

    const stayLabels = sortedStays.map(s => {
      const n = s.name || 'Stay';
      return n.length > 16 ? n.substring(0, 15) + '…' : n;
    });
    const stayPrices = sortedStays.map(s => {
      const kes = parseFloat(s.price_per_night_kes) || parseFloat(s.kesPrice) || ((parseFloat(s.price_per_night_usd) || 0) * usdRate);
      return isKes ? Math.round(kes) : Math.round(kes / usdRate);
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
            label: isKes ? 'KSh / Night' : 'USD / Night',
            data: stayPrices,
            backgroundColor: [
              '#059669',
              '#B28756',
              '#D97706',
              '#7D5A44',
              '#9CA3AF'
            ],
            borderRadius: 6,
            barThickness: 14
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
              padding: 8,
              titleFont: { size: 10, family: "'Plus Jakarta Sans', sans-serif" },
              bodyFont: { size: 9.5, family: "'Plus Jakarta Sans', sans-serif" },
              callbacks: {
                label: function (ctx) {
                  return isKes
                    ? ` KSh ${ctx.raw.toLocaleString()} / night`
                    : ` $${ctx.raw.toLocaleString()} / night`;
                }
              }
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: 'rgba(178, 150, 125, 0.12)' },
              ticks: {
                callback: (v) => isKes ? (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`) : `$${v}`,
                font: { size: 9.5, family: "'Plus Jakarta Sans', sans-serif" },
                color: '#604D42'
              }
            },
            y: {
              grid: { display: false },
              ticks: { font: { size: 9.5, family: "'Plus Jakarta Sans', sans-serif", weight: '600' }, color: '#241812' }
            }
          }
        }
      });
    }
  }

  // Global Currency Switch (Default: KSh; optional USD)
  const btnToggleUsd = document.getElementById('btnToggleUsd');
  const btnToggleKes = document.getElementById('btnToggleKes');

  btnToggleUsd?.addEventListener('click', () => {
    analyticsCurrencyMode = 'USD';
    btnToggleUsd.classList.add('active');
    btnToggleKes?.classList.remove('active');
    renderMetricsAndAnalytics();
    renderAllViews();
  });

  btnToggleKes?.addEventListener('click', () => {
    analyticsCurrencyMode = 'KES';
    btnToggleKes.classList.add('active');
    btnToggleUsd?.classList.remove('active');
    renderMetricsAndAnalytics();
    renderAllViews();
  });

  function renderAllViews() {
    const filterQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
    renderHostsTable(filterQuery, currentStatusFilter);
    renderStaysTable(filterQuery);
    renderGuestsTable(filterQuery);
    renderHostWaitlistTable(filterQuery);
    renderProfilesTable(filterQuery);
    renderLaundryTable(filterQuery);
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
      tr.title = 'Click row to view full details';
      const shortLoc = abbrLocation(loc);
      const shortRef = ref && ref.length > 12 ? ref.slice(-8) : ref;
      tr.innerHTML = `
        <td>
          <div class="cell-inline-row">
            <span class="host-cell-name cell-ellipsis" title="${esc(name)}">${esc(name)}</span>
            <button type="button" class="btn-copy-micro copy-ref-btn" data-ref="${esc(ref)}" title="Copy Ref: ${esc(ref)}">${esc(shortRef)}</button>
            ${isSuspended ? '<span class="status-chip chip-red" style="padding: 1px 5px; font-size: 0.62rem;">Blocked</span>' : ''}
            ${isDelisted ? '<span class="status-chip chip-neutral" style="padding: 1px 5px; font-size: 0.62rem; background:#FEF3C7; color:#B45309;">Hidden</span>' : ''}
          </div>
          <div class="host-cell-sub cell-ellipsis" title="${esc(email)}">${esc(email)}</div>
        </td>

        <td>
          <div class="host-cell-name cell-ellipsis" title="${esc(prop)}">${esc(prop)}</div>
          <div class="host-cell-sub cell-ellipsis" title="${esc(loc)}">${esc(shortLoc)}</div>
        </td>

        <td>
          <select class="status-select-inline status-${esc(status)} host-status-select" data-ref="${esc(ref)}" style="width: 100%;">
            <option value="pending_review" ${status === 'pending_review' ? 'selected' : ''}>Pending</option>
            <option value="approved" ${status === 'approved' ? 'selected' : ''}>Approved</option>
            <option value="rejected" ${status === 'rejected' ? 'selected' : ''}>Rejected</option>
            <option value="suspended" ${status === 'suspended' || isSuspended ? 'selected' : ''}>Blocked</option>
          </select>
        </td>

        <td style="text-align: right;">
          <div class="table-action-row">
            <button type="button" class="btn-table-action btn-edit-host" data-ref="${esc(ref)}" data-email="${esc(email)}" title="Edit host" style="background: #FAF5EE; border: 1px solid #D4AF37; color: #9A7B0C;">Edit</button>
            <button type="button" class="btn-table-action btn-toggle-suspend-quick" data-email="${esc(email)}" data-suspended="${isSuspended ? 'true' : 'false'}" title="${isSuspended ? 'Unblock host access' : 'Block host access'}" style="${isSuspended ? 'background: #DCFCE7; color: #15803D; border: 1px solid #86EFAC;' : 'background: #FEE2E2; color: #DC2626; border: 1px solid #FCA5A5;'}">${isSuspended ? 'Unblock' : 'Block'}</button>
            <button type="button" class="btn-table-action btn-toggle-delist-quick" data-email="${esc(email)}" data-delisted="${isDelisted ? 'true' : 'false'}" title="${isDelisted ? 'Show on site' : 'Hide from site'}" style="${isDelisted ? 'background: #DBEAFE; color: #1D4ED8; border: 1px solid #93C5FD;' : 'background: #FEF3C7; color: #D97706; border: 1px solid #FCD34D;'}">${isDelisted ? 'Show' : 'Hide'}</button>
            <button type="button" class="btn-table-action btn-inspect trigger-inspect-btn" data-ref="${esc(ref)}" title="View full dossier">View ↗</button>
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

    // 2. Edit Host Profile button (dedicated page)
    hostsTableBody.querySelectorAll('.btn-edit-host').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ref = btn.getAttribute('data-ref') || '';
        const email = btn.getAttribute('data-email') || '';
        openEditProfileModal(ref, 'hosts', email);
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
        sel.disabled = true;

        try {
          if (window.LuxeaDB) {
            await window.LuxeaDB.updateHostStatus(ref, newStatus);
            // Immediately update in-memory cache
            const hostObj = cachedHosts.find(h => (h.refId || h.ref_id) === ref);
            if (hostObj) {
              hostObj.review_status = newStatus;
              hostObj.status = newStatus;
            }
            if (window.showToast) {
              window.showToast(`Updated status for ${ref} → ${newStatus.toUpperCase()}`);
            }
            // Refresh analytics and counters
            await loadDashboardData();
          }
        } catch (err) {
          console.error('Failed to update host status:', err);
          if (window.showToast) window.showToast('Error updating status: ' + (err.message || 'Failed'));
        } finally {
          sel.disabled = false;
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
  // 4. HOST DOSSIER PAGE NAVIGATION (Dedicated spacious page, no crunched modal)
  // =========================================================================
  function openInspectModal(refId) {
    if (!refId) return;
    window.location.href = `/admin/host-dossier?ref=${encodeURIComponent(refId)}&from=hosts`;
  }

  closeInspectBtn?.addEventListener('click', () => inspectModal?.classList.remove('open'));
  inspectModal?.addEventListener('click', (e) => {
    if (e.target === inspectModal) inspectModal.classList.remove('open');
  });

  inspectApproveBtn?.addEventListener('click', async () => {
    if (!currentInspectedRef) return;
    inspectApproveBtn.disabled = true;
    const origHtml = inspectApproveBtn.innerHTML;
    inspectApproveBtn.innerHTML = 'Approving...';

    try {
      if (window.LuxeaDB) {
        await window.LuxeaDB.updateHostStatus(currentInspectedRef, 'approved');
        const hostObj = cachedHosts.find(h => (h.refId || h.ref_id) === currentInspectedRef);
        if (hostObj) {
          hostObj.review_status = 'approved';
          hostObj.status = 'approved';
        }
        if (window.showToast) window.showToast(`✅ Host ${currentInspectedRef} officially APPROVED!`);
        inspectModal?.classList.remove('open');
        await loadDashboardData();
      }
    } catch (err) {
      console.error('Approval error:', err);
      if (window.showToast) window.showToast('Error approving host: ' + (err.message || 'Failed'));
    } finally {
      inspectApproveBtn.disabled = false;
      inspectApproveBtn.innerHTML = origHtml;
    }
  });

  inspectRejectBtn?.addEventListener('click', async () => {
    if (!currentInspectedRef) return;
    inspectRejectBtn.disabled = true;
    const origHtml = inspectRejectBtn.innerHTML;
    inspectRejectBtn.innerHTML = 'Rejecting...';

    try {
      if (window.LuxeaDB) {
        await window.LuxeaDB.updateHostStatus(currentInspectedRef, 'rejected');
        const hostObj = cachedHosts.find(h => (h.refId || h.ref_id) === currentInspectedRef);
        if (hostObj) {
          hostObj.review_status = 'rejected';
          hostObj.status = 'rejected';
        }
        if (window.showToast) window.showToast(`❌ Host ${currentInspectedRef} marked as Rejected.`);
        inspectModal?.classList.remove('open');
        await loadDashboardData();
      }
    } catch (err) {
      console.error('Rejection error:', err);
      if (window.showToast) window.showToast('Error rejecting host: ' + (err.message || 'Failed'));
    } finally {
      inspectRejectBtn.disabled = false;
      inspectRejectBtn.innerHTML = origHtml;
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

      const fullArea = `${stay.city || 'Nairobi'}, ${stay.area || stay.county || 'Kenya'}`;
      const shortArea = abbrLocation(fullArea);
      const shortType = abbrType(stay.property_type || stay.category || 'Apartment');
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
            <img src="${esc(safeUrl(stay.cover_image_url || stay.image, '/assets/images/hero-1.webp'))}" alt="${esc(stay.name)}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover; flex-shrink: 0;" loading="lazy">
            <div style="min-width: 0; flex: 1;">
              <div class="host-cell-name cell-ellipsis" title="${esc(stay.name)}">${esc(stay.name)}</div>
              <span class="status-chip chip-neutral" style="padding: 1px 6px; font-size: 0.65rem; margin-top: 2px;" title="${esc(stay.property_type || stay.category || '')}">${esc(shortType)}</span>
            </div>
          </div>
        </td>

        <td>
          <div class="cell-ellipsis" style="font-weight: 600; font-size: 0.78rem; color: #241812;" title="${esc(fullArea)}">${esc(shortArea)}</div>
          <div class="host-cell-sub cell-ellipsis" title="${esc(hostName)}">${esc(hostName)}</div>
        </td>

        <td>
          <div style="font-weight: 700; color: #241812; font-size: 0.84rem; white-space: nowrap;">${esc(formatAdminMoney(kesPrice))}</div>
          <small style="color: var(--color-cocoa); font-size: 0.68rem;">/ night</small>
        </td>

        <td>
          <label class="lux-toggle-switch">
            <input type="checkbox" class="lux-toggle-input admin-stay-avail-toggle" data-id="${esc(stay.id || stay.slug)}" ${isAvail ? 'checked' : ''}>
            <span class="lux-toggle-slider"></span>
            <span class="lux-toggle-status-text" style="font-size: 0.72rem;">${isAvail ? 'Live' : 'Off'}</span>
          </label>
        </td>

        <td style="text-align: right;">
          <a href="/stays/?id=${encodeURIComponent(stay.id || stay.slug)}" target="_blank" rel="noopener noreferrer" class="btn-table-action btn-inspect" style="padding: 4px 8px; font-size: 0.7rem;">
            <span>Open ↗</span>
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

      const shortDest = abbrLocation(dest);
      const shortTier = tier.replace(/Founding\s*Circle/i, 'Founding');
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <strong class="cell-ellipsis" style="font-family: monospace; color: #B28756; font-size: 0.76rem;" title="${esc(pass)}">${esc(pass)}</strong>
        </td>
        <td>
          <div class="host-cell-name cell-ellipsis" title="${esc(name)}">${esc(name)}</div>
          <div class="host-cell-sub cell-inline-row">
            <span style="flex-shrink: 0;">${esc(phone)}</span>
            ${waUrl ? `<a href="${esc(waUrl)}" target="_blank" rel="noopener noreferrer" title="WhatsApp" style="color: #22C55E; font-size: 11px; text-decoration: none; flex-shrink: 0;">💬</a>` : ''}
            <span class="cell-ellipsis" title="${esc(email)}">${esc(email)}</span>
          </div>
        </td>
        <td>
          <div class="cell-ellipsis" style="font-weight: 600; color: #241812; font-size: 0.76rem;" title="${esc(dest)}">${esc(shortDest)}</div>
        </td>
        <td>
          <span class="status-chip chip-gold" style="padding: 2px 7px; font-size: 0.68rem;" title="${esc(tier)}">${esc(shortTier)}</span>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <small style="color: var(--color-cocoa); font-weight: 600;">${esc(date)}</small>
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

      const safePortfolioLink = safeUrl(link);
      const shortRegion = abbrLocation(region);
      const shortType = abbrType(propType);
      const shortReady = abbrStatus(readiness);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <strong class="cell-ellipsis" style="font-family: monospace; color: #D4AF37; font-size: 0.76rem;" title="${esc(pass)}">${esc(pass)}</strong>
        </td>
        <td>
          <div class="host-cell-name cell-ellipsis" title="${esc(name)}">${esc(name)}</div>
          <div class="host-cell-sub cell-inline-row">
            <span style="flex-shrink: 0;">${esc(phone)}</span>
            ${waUrl ? `<a href="${esc(waUrl)}" target="_blank" rel="noopener noreferrer" title="WhatsApp" style="color: #22C55E; font-size: 11px; text-decoration: none; flex-shrink: 0;">💬</a>` : ''}
            <span class="cell-ellipsis" title="${esc(email)}">${esc(email)}</span>
          </div>
        </td>
        <td>
          <div class="cell-ellipsis" style="font-weight: 700; color: #241812; font-size: 0.8rem;" title="${esc(propName)}">${esc(propName)}</div>
          <div class="host-cell-sub cell-ellipsis" title="${esc(`${propType} • ${beds} Bed • ${region}`)}">${esc(shortType)} • ${esc(beds)}B • ${esc(shortRegion)}</div>
        </td>
        <td>
          <div class="cell-inline-row">
            <span class="status-chip ${readiness.toLowerCase().includes('ready') ? 'chip-green' : 'chip-neutral'}" style="padding: 1px 6px; font-size: 0.66rem;" title="${esc(readiness)}">${esc(shortReady)}</span>
            <span style="color: #1E8449; font-weight: 700; font-size: 0.68rem;">0%</span>
            ${safePortfolioLink ? `<a href="${esc(safePortfolioLink)}" target="_blank" rel="noopener noreferrer" style="color: #B28756; text-decoration: underline; font-size: 0.68rem;">Link ↗</a>` : ''}
          </div>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <small style="color: var(--color-cocoa); font-weight: 600;">${esc(date)}</small>
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

      // Status chip: Active vs Blocked
      const statusChip = isSuspended
        ? `<span class="status-chip chip-red" style="padding: 2px 7px; font-size: 0.68rem; font-weight: 700;">Blocked</span>`
        : `<span class="status-chip chip-green" style="padding: 2px 7px; font-size: 0.68rem; font-weight: 700;">Active</span>`;

      // Cross check linked registries
      let linkedBadge = '<span class="status-chip chip-neutral" style="padding: 1px 6px; font-size: 0.65rem;">User</span>';
      const hostMatch = cachedHosts.find(h => (h.email || '').toLowerCase() === email.toLowerCase());
      const waitlistMatch = cachedGuests.find(g => (g.email || '').toLowerCase() === email.toLowerCase());
      const hostWaitlistMatch = cachedHostWaitlist.find(hw => (hw.email || '').toLowerCase() === email.toLowerCase());

      if (hostMatch) {
        const hs = hostMatch.review_status === 'approved' ? 'Live' : 'Pending';
        linkedBadge = `<span class="status-chip ${hostMatch.review_status === 'approved' ? 'chip-green' : 'chip-gold'}" style="padding: 1px 6px; font-size: 0.65rem;">Host (${hs})</span>`;
      } else if (hostWaitlistMatch) {
        linkedBadge = `<span class="status-chip chip-gold" style="padding: 1px 6px; font-size: 0.65rem;">Waitlist</span>`;
      } else if (waitlistMatch) {
        linkedBadge = `<span class="status-chip chip-green" style="padding: 1px 6px; font-size: 0.65rem;">VIP</span>`;
      }

      const isSuperAdminRole = currentRole === 'super_admin';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
            <div style="width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg, #B28756, #241812); color: #FFF; font-weight: 700; font-size: 0.68rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${esc(initials)}
            </div>
            <div style="min-width: 0; flex: 1;">
              <div class="host-cell-name cell-inline-row">
                <span class="cell-ellipsis" title="${esc(name)}">${esc(name)}</span>
                ${isSuperAdminRole ? '<span title="Super Admin" style="font-size: 11px; flex-shrink: 0;">👑</span>' : ''}
              </div>
              <div class="host-cell-sub cell-ellipsis" style="font-family: monospace; font-size: 0.64rem; color: #8F847C;" title="${esc(p.id || '')}">
                ${p.id ? esc(p.id.substring(0, 8)) : '—'}
              </div>
            </div>
          </div>
        </td>
        <td>
          <div class="cell-ellipsis" style="font-weight: 600; color: #241812; font-size: 0.76rem;" title="${esc(email)}">${esc(email)}</div>
          ${p.phone ? `<div class="host-cell-sub cell-ellipsis">${esc(p.phone)}</div>` : ''}
        </td>
        <td>
          <select class="form-control profile-role-select" data-user-id="${esc(p.id)}" data-email="${esc(email)}" style="width: 100%; padding: 2px 6px; font-size: 0.7rem; border-radius: 6px; font-weight: 600; height: 28px; cursor: pointer; ${currentRole === 'super_admin' ? 'border-color: #D4AF37; background: rgba(212, 175, 55, 0.08); color: #9A7B0C;' : currentRole === 'admin' ? 'border-color: #3B82F6; color: #1D4ED8;' : currentRole === 'host' ? 'border-color: #10B981; color: #047857;' : 'border-color: #D1D5DB; color: #374151;'}">
            <option value="super_admin" ${currentRole === 'super_admin' ? 'selected' : ''}>Super Admin</option>
            <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>Admin</option>
            <option value="host" ${currentRole === 'host' ? 'selected' : ''}>Host</option>
            <option value="member" ${currentRole === 'member' || !currentRole ? 'selected' : ''}>Member</option>
          </select>
        </td>
        <td>${statusChip}</td>
        <td>${linkedBadge}</td>
        <td style="text-align: right; white-space: nowrap;">
          <small style="color: var(--color-cocoa); font-weight: 600;">${esc(date)}</small>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <button type="button" class="btn-table-action btn-edit-profile-row" data-email="${esc(email)}" data-user-id="${esc(p.id)}" title="Edit user" style="background: #FAF5EE; border: 1px solid #D4AF37; color: #9A7B0C;">Edit</button>
        </td>
      `;

      profilesTableBody.appendChild(tr);
    });

    // Wire up Edit button clicks on profile rows (dedicated page)
    profilesTableBody.querySelectorAll('.btn-edit-profile-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const email = btn.getAttribute('data-email') || '';
        openEditProfileModal('', 'profiles', email);
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
  // 6D. LAUNDRY & VALET SERVICE PARTNERS & ORDERS REGISTRY
  // =========================================================================
  function renderLaundryTable(query = '', areaFilter = 'all') {
    const selectedArea = areaFilter !== 'all' ? areaFilter : (laundryAreaFilter ? laundryAreaFilter.value : 'all');
    const q = query.toLowerCase().trim();

    // 1. RENDER PARTNERS TABLE
    if (laundryPartnersTableBody) {
      laundryPartnersTableBody.innerHTML = '';

      const filteredPartners = cachedLaundryPartners.filter(p => {
        const name = (p.business_name || p.businessName || '').toLowerCase();
        const contact = (p.contact_person || p.contactPerson || '').toLowerCase();
        const phone = (p.phone || '').toLowerCase();
        const refId = (p.ref_id || p.refId || '').toLowerCase();
        const email = (p.email || '').toLowerCase();
        const areas = Array.isArray(p.coverage_areas) ? p.coverage_areas : [];
        const areasStr = areas.join(' ').toLowerCase();

        const matchQuery = !q || name.includes(q) || contact.includes(q) || phone.includes(q) || refId.includes(q) || email.includes(q) || areasStr.includes(q);
        const matchArea = selectedArea === 'all' || areasStr.includes(selectedArea.toLowerCase());

        return matchQuery && matchArea;
      });

      if (filteredPartners.length === 0) {
        if (laundryPartnersEmpty) laundryPartnersEmpty.classList.remove('hidden');
      } else {
        if (laundryPartnersEmpty) laundryPartnersEmpty.classList.add('hidden');

        filteredPartners.forEach(p => {
          const bizName = p.business_name || p.businessName || 'Valet Service Partner';
          const refId = p.ref_id || p.refId || 'LXL-2026-PARTNER';
          const contact = p.contact_person || p.contactPerson || 'Manager';
          const phone = p.phone || '—';
          const email = p.email || '';
          const rating = p.rating || 5.0;
          const completedJobs = p.completed_orders_count || 0;
          const areas = Array.isArray(p.coverage_areas) ? p.coverage_areas : ['Westlands', 'Kilimani'];
          const washRate = p.price_wash_fold_per_kg || 250;
          const linenRate = p.price_linen_turnover_set || 1500;
          const suitRate = p.price_dry_clean_suit || 900;
          const isExpress = p.express_available !== false;

          const digitsOnly = phone.replace(/[^0-9]/g, '');
          const waNumber = digitsOnly.startsWith('0') ? '254' + digitsOnly.substring(1) : digitsOnly.startsWith('254') ? digitsOnly : '254' + digitsOnly;
          const waUrl = digitsOnly ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello ${contact}, this is Ronald from Luxea Living Admin regarding your valet partnership (${refId}).`)}` : '';

          const areasFull = areas.join(', ');
          const areasShort = abbrLocation(areasFull);

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>
              <div class="cell-ellipsis" style="font-weight: 700; color: #241812; font-size: 0.78rem;" title="${esc(bizName)}">${esc(bizName)}</div>
              <div class="cell-inline-row" style="margin-top: 2px;">
                <code style="font-family: monospace; font-size: 0.64rem; color: #8C6D58; background: #F6F3EE; padding: 1px 4px; border-radius: 3px; border: 1px solid #E5DFD7;">${esc(refId)}</code>
                ${isExpress ? '<span class="status-chip chip-gold" style="font-size: 0.58rem; padding: 1px 4px;">Fast</span>' : ''}
              </div>
            </td>
            <td>
              <div class="host-cell-name cell-ellipsis" style="font-size: 0.76rem;" title="${esc(contact)}">${esc(contact)}</div>
              <div class="host-cell-sub cell-inline-row" style="font-size: 0.7rem;">
                <span>${esc(phone)}</span>
                ${waUrl ? `<a href="${esc(waUrl)}" target="_blank" rel="noopener noreferrer" title="WhatsApp" style="color: #22C55E; font-size: 11px; text-decoration: none;">💬</a>` : ''}
              </div>
            </td>
            <td>
              <div class="cell-ellipsis" style="font-size: 0.74rem; color: #4A3B32; font-weight: 600;" title="${esc(areasFull)}">${esc(areasShort)}</div>
            </td>
            <td>
              <div style="font-size: 0.7rem; color: #241812; line-height: 1.3; white-space: nowrap;">
                <div><span style="color: #8C6D58;">Kg:</span> <strong>${esc(formatAdminMoney(washRate))}</strong></div>
                <div><span style="color: #8C6D58;">Set:</span> <strong>${esc(formatAdminMoney(linenRate))}</strong></div>
              </div>
            </td>
            <td style="text-align: right; white-space: nowrap;">
              <div style="font-weight: 700; color: #B28756; font-size: 0.76rem;">⭐ ${esc(rating)}</div>
              <small style="color: #8C6D58; font-size: 0.64rem;">${esc(completedJobs)} jobs</small>
            </td>
          `;
          laundryPartnersTableBody.appendChild(tr);
        });
      }
    }

    // 2. RENDER ORDERS AUDIT LOG
    if (laundryOrdersTableBody) {
      laundryOrdersTableBody.innerHTML = '';

      const filteredOrders = cachedLaundryOrders.filter(o => {
        const orderNum = (o.order_number || o.id || '').toLowerCase();
        const custName = (o.customer_name || '').toLowerCase();
        const custPhone = (o.customer_phone || '').toLowerCase();
        const propName = (o.property_name || '').toLowerCase();
        const area = (o.location_area || '').toLowerCase();
        const service = (o.service_type || '').toLowerCase();

        const matchQuery = !q || orderNum.includes(q) || custName.includes(q) || custPhone.includes(q) || propName.includes(q) || area.includes(q) || service.includes(q);
        const matchArea = selectedArea === 'all' || area.includes(selectedArea.toLowerCase());

        return matchQuery && matchArea;
      });

      if (filteredOrders.length === 0) {
        if (laundryOrdersEmpty) laundryOrdersEmpty.classList.remove('hidden');
      } else {
        if (laundryOrdersEmpty) laundryOrdersEmpty.classList.add('hidden');

        filteredOrders.forEach(o => {
          const orderNum = o.order_number || o.id || 'ORD-LX';
          const isTurnover = o.order_type === 'host_turnover';
          const custName = o.customer_name || 'Client';
          const custPhone = o.customer_phone || '—';
          const propName = o.property_name || 'Luxea Stay';
          const unit = o.unit_number ? `(${o.unit_number})` : '';
          const area = o.location_area || 'Nairobi';
          const service = o.service_type || 'Wash & Fold';
          const weight = o.estimated_weight_or_items || 'Standard Bag';
          const pickupDate = o.pickup_date || 'Today';
          const timeSlot = o.pickup_time_slot || '';
          const amount = parseFloat(o.total_amount_kes || o.amount_kes || 0);
          const status = o.status || 'requested';

          let statusBadgeClass = 'chip-amber';
          let statusText = 'New Request';
          if (status === 'accepted') { statusBadgeClass = 'chip-neutral'; statusText = 'Accepted'; }
          else if (status === 'picked_up') { statusBadgeClass = 'chip-neutral'; statusText = 'Picked Up'; }
          else if (status === 'in_process') { statusBadgeClass = 'chip-amber'; statusText = 'In Wash'; }
          else if (status === 'out_for_delivery') { statusBadgeClass = 'chip-gold'; statusText = 'Out For Delivery'; }
          else if (status === 'delivered') { statusBadgeClass = 'chip-green'; statusText = 'Delivered'; }

          const digitsOnly = custPhone.replace(/[^0-9]/g, '');
          const waNumber = digitsOnly.startsWith('0') ? '254' + digitsOnly.substring(1) : digitsOnly.startsWith('254') ? digitsOnly : '254' + digitsOnly;
          const waUrl = digitsOnly ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello ${custName}, this is Luxea Living Concierge regarding your laundry valet pickup (${orderNum}).`)}` : '';

          const shortArea = abbrLocation(area);
          const propFull = `${propName} ${unit}`.trim();
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>
              <code class="cell-ellipsis" style="font-family: monospace; font-size: 0.72rem; font-weight: 700; color: #241812;" title="${esc(orderNum)}">${esc(orderNum)}</code>
              <div style="margin-top: 2px;">
                <span class="status-chip ${isTurnover ? 'chip-gold' : 'chip-neutral'}" style="font-size: 0.58rem; padding: 1px 4px;">
                  ${isTurnover ? 'Linen' : 'Valet'}
                </span>
              </div>
            </td>
            <td>
              <div class="host-cell-name cell-ellipsis" style="font-size: 0.76rem;" title="${esc(custName)}">${esc(custName)}</div>
              <div class="host-cell-sub cell-inline-row" style="font-size: 0.7rem;">
                <span>${esc(custPhone)}</span>
                ${waUrl ? `<a href="${esc(waUrl)}" target="_blank" rel="noopener noreferrer" title="WhatsApp" style="color: #22C55E; font-size: 11px; text-decoration: none;">💬</a>` : ''}
              </div>
            </td>
            <td>
              <div class="cell-ellipsis" style="font-weight: 600; color: #241812; font-size: 0.75rem;" title="${esc(propFull)}">${esc(propFull)}</div>
              <small class="cell-ellipsis" style="color: #8C6D58; font-size: 0.68rem;" title="${esc(area)}">${esc(shortArea)}</small>
            </td>
            <td>
              <div class="cell-ellipsis" style="font-size: 0.74rem; font-weight: 600; color: #241812;" title="${esc(service)}">${esc(service)}</div>
              <small class="cell-ellipsis" style="color: #8C6D58; font-size: 0.66rem;">${esc(pickupDate)}</small>
            </td>
            <td style="white-space: nowrap;">
              <div style="font-weight: 700; color: #B28756; font-size: 0.78rem;">${esc(formatAdminMoney(amount))}</div>
              <small style="color: #1E8449; font-size: 0.64rem; font-weight: 600;">M-Pesa</small>
            </td>
            <td style="text-align: right; white-space: nowrap;">
              <span class="status-chip ${statusBadgeClass}" style="font-size: 0.64rem; padding: 1px 6px;">
                ${esc(statusText)}
              </span>
            </td>
          `;
          laundryOrdersTableBody.appendChild(tr);
        });
      }
    }
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
    overview: { title: 'Overview', sub: '' },
    hosts: { title: 'Hosts', sub: '' },
    stays: { title: 'Stays', sub: '' },
    guests: { title: 'VIP Guests', sub: '' },
    hostWaitlist: { title: 'Host Waitlist', sub: '' },
    profiles: { title: 'Users', sub: '' },
    laundry: { title: 'Laundry', sub: '' }
  };

  tabOverview?.addEventListener('click', () => switchTab('overview'));
  tabHosts?.addEventListener('click', () => switchTab('hosts'));
  tabStays?.addEventListener('click', () => switchTab('stays'));
  tabGuests?.addEventListener('click', () => switchTab('guests'));
  tabHostWaitlist?.addEventListener('click', () => switchTab('hostWaitlist'));
  tabProfiles?.addEventListener('click', () => switchTab('profiles'));
  tabLaundry?.addEventListener('click', () => switchTab('laundry'));

  // Quick Jump cards from Overview
  document.getElementById('jumpToHostsCard')?.addEventListener('click', () => switchTab('hosts'));
  document.getElementById('jumpToStaysCard')?.addEventListener('click', () => switchTab('stays'));
  document.getElementById('jumpToGuestsCard')?.addEventListener('click', () => switchTab('guests'));
  document.getElementById('jumpToWaitlistCard')?.addEventListener('click', () => switchTab('hostWaitlist'));
  document.getElementById('jumpToLaundryCard')?.addEventListener('click', () => switchTab('laundry'));

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

  // Laundry Search & Filters
  laundrySearchInput?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const area = laundryAreaFilter ? laundryAreaFilter.value : 'all';
    renderLaundryTable(q, area);
  });

  laundryAreaFilter?.addEventListener('change', (e) => {
    const q = laundrySearchInput ? laundrySearchInput.value.toLowerCase().trim() : '';
    renderLaundryTable(q, e.target.value);
  });

  copyLaundryInviteLinkBtn?.addEventListener('click', () => {
    const inviteUrl = `${window.location.origin}/laundry/?partner=register`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      if (window.showToast) window.showToast('📋 Partner registration invite link copied to clipboard!');
      const span = copyLaundryInviteLinkBtn.querySelector('span');
      if (span) {
        const orig = span.textContent;
        span.textContent = '✓ Link Copied!';
        setTimeout(() => { span.textContent = orig; }, 2500);
      }
    }).catch(() => {
      prompt('Copy partner invite link:', inviteUrl);
    });
  });

  // Inline Export Triggers
  document.getElementById('exportGuestsCsvBtnInline')?.addEventListener('click', () => {
    exportGuestsBtn?.click();
  });

  document.getElementById('exportHostWaitlistCsvBtnInline')?.addEventListener('click', () => {
    exportHostWaitlistBtn?.click();
  });

  function switchTab(tab, updateUrl = true) {
    tabOverview?.classList.toggle('active', tab === 'overview');
    tabHosts?.classList.toggle('active', tab === 'hosts');
    tabStays?.classList.toggle('active', tab === 'stays');
    tabGuests?.classList.toggle('active', tab === 'guests');
    tabHostWaitlist?.classList.toggle('active', tab === 'hostWaitlist');
    tabProfiles?.classList.toggle('active', tab === 'profiles');
    tabLaundry?.classList.toggle('active', tab === 'laundry');

    viewOverview?.classList.toggle('hidden', tab !== 'overview');
    viewHosts?.classList.toggle('hidden', tab !== 'hosts');
    viewStays?.classList.toggle('hidden', tab !== 'stays');
    viewGuests?.classList.toggle('hidden', tab !== 'guests');
    viewHostWaitlist?.classList.toggle('hidden', tab !== 'hostWaitlist');
    viewProfiles?.classList.toggle('hidden', tab !== 'profiles');
    viewLaundry?.classList.toggle('hidden', tab !== 'laundry');

    if (updateUrl && window.history && typeof window.history.replaceState === 'function') {
      const targetUrl = tab === 'overview' ? '/admin' : `/admin?tab=${encodeURIComponent(tab)}`;
      window.history.replaceState(null, '', targetUrl);
    }

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
      csvCell(h.refId || h.ref_id || ''),
      csvCell(h.fullName || h.full_name || ''),
      csvCell(h.phone || ''),
      csvCell(h.email || ''),
      csvCell(h.propertyName || h.property_name || ''),
      csvCell(h.county || ''),
      csvCell(h.area || h.area_suburb || ''),
      csvCell(h.propertyType || h.property_type || ''),
      h.bedrooms || 1,
      csvCell((h.payoutDetails && h.payoutDetails.method) || h.payoutMethod || h.payout_method || ''),
      csvCell(h.review_status || 'pending_review'),
      csvCell(h.signatureDate || h.created_at || '')
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
      csvCell(g.pass_number || g.passNumber || ''),
      csvCell(g.full_name || g.fullName || ''),
      csvCell(g.email || ''),
      csvCell(g.phone || ''),
      csvCell(g.preferred_destinations || g.destinations || ''),
      csvCell(g.tier || 'Founding Circle'),
      csvCell(g.created_at || '')
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
      csvCell(h.pass_number || h.passNumber || ''),
      csvCell(h.full_name || h.fullName || ''),
      csvCell(h.email || ''),
      csvCell(h.phone || ''),
      csvCell(h.property_name || h.propertyName || ''),
      csvCell(h.property_type || h.propertyType || ''),
      h.bedrooms || 1,
      csvCell(h.region || ''),
      csvCell(h.operational_status || h.operationalStatus || ''),
      csvCell(h.portfolio_link || h.portfolioLink || ''),
      csvCell(h.notes || ''),
      csvCell(h.tier || 'Founding Host Partner'),
      csvCell(h.created_at || h.timestamp || '')
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

  function openCreateAccountModal(role = 'host', fromTab = 'hosts') {
    window.location.href = `/admin/add-account?role=${encodeURIComponent(role)}&from=${encodeURIComponent(fromTab)}`;
  }

  function closeCreateAccountModal() {}

  function openEditProfileModal(refOrId = '', fromTab = 'hosts', emailOpt = '') {
    const params = new URLSearchParams();
    if (refOrId && !String(refOrId).includes('@')) {
      params.set('ref', refOrId);
    } else if (refOrId && !emailOpt) {
      emailOpt = refOrId;
    }
    if (emailOpt) params.set('email', emailOpt);
    params.set('from', fromTab === 'profile' ? 'profiles' : (fromTab || 'hosts'));
    window.location.href = `/admin/edit-account?${params.toString()}`;
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
      } else {
        res = { success: false, error: 'Database provisioning client unavailable.' };
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

  // Dedicated Page Navigation Triggers
  openCreateHostModalBtn?.addEventListener('click', () => {
    openCreateAccountModal('host', 'hosts');
  });

  openCreateUserModalBtn?.addEventListener('click', () => {
    openCreateAccountModal('member', 'profiles');
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
