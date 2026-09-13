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
  const hostsEmpty = document.getElementById('hostsEmptyState');
  const guestsEmpty = document.getElementById('guestsEmptyState');
  const hostWaitlistEmpty = document.getElementById('hostWaitlistEmptyState');
  const searchInput = document.getElementById('adminSearchInput');
  const statusPillsWrap = document.getElementById('statusPillsFilter');

  // Tabs
  const tabHosts = document.getElementById('tabHostsBtn');
  const tabStays = document.getElementById('tabStaysBtn');
  const tabGuests = document.getElementById('tabGuestsBtn');
  const tabHostWaitlist = document.getElementById('tabHostWaitlistBtn');
  const hostsPane = document.getElementById('hostsViewPane');
  const staysPane = document.getElementById('staysViewPane');
  const guestsPane = document.getElementById('guestsViewPane');
  const hostWaitlistPane = document.getElementById('hostWaitlistViewPane');

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

  // Active Data State
  let cachedHosts = [];
  let cachedStays = [];
  let cachedGuests = [];
  let cachedHostWaitlist = [];
  let currentStatusFilter = 'all';

  // =========================================================================
  // 1. AUTHENTICATION GATE
  // =========================================================================
  function checkAuth() {
    const publicHeader = document.getElementById('adminPublicHeader');
    const mobileBottomNav = document.querySelector('.mobile-bottom-nav');

    if (window.LuxeaAuth && window.LuxeaAuth.isAdminLoggedIn()) {
      const admin = window.LuxeaAuth.getCurrentAdmin();
      loginGateway?.classList.add('hidden');
      dashboardView?.classList.remove('hidden');
      if (publicHeader) publicHeader.classList.add('hidden');
      if (mobileBottomNav) mobileBottomNav.classList.add('hidden');
      adminBadge?.classList.remove('hidden');
      logoutBtn?.classList.remove('hidden');

      if (admin && admin.name) {
        const firstName = admin.name.split(' ')[0];
        const sidebarName = document.getElementById('sidebarAdminName');
        if (sidebarName) sidebarName.textContent = firstName;
        if (adminBadge) adminBadge.textContent = `Super Admin`;
      }
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
    } else {
      cachedHosts = JSON.parse(localStorage.getItem('luxea_host_applications') || '[]');
      cachedGuests = JSON.parse(localStorage.getItem('luxea_waitlist_guests') || '[]');
      cachedStays = JSON.parse(localStorage.getItem('luxea_cached_properties') || '[]');
      cachedHostWaitlist = JSON.parse(localStorage.getItem('luxea_host_waitlist') || '[]');
    }

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

    // Tab counters
    const tHost = document.getElementById('hostTabCounter');
    const tStays = document.getElementById('staysTabCounter');
    const tGuest = document.getElementById('guestTabCounter');
    const tHostWaitlist = document.getElementById('hostWaitlistTabCounter');
    if (tHost) tHost.textContent = totalHosts;
    if (tStays) tStays.textContent = totalStays;
    if (tGuest) tGuest.textContent = totalGuests;
    if (tHostWaitlist) tHostWaitlist.textContent = totalHostWaitlist;

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
    // ANALYTICS HUB 1: PORTFOLIO REVENUE & VALUATION
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
    const elOccupancy = document.getElementById('analyticsOccupancy');

    if (elTotalUsd) elTotalUsd.textContent = totalUsdVal.toLocaleString();
    if (elTotalKes) elTotalKes.textContent = totalKesVal.toLocaleString();
    const adr = activeStaysCount > 0 ? Math.round(totalUsdVal / activeStaysCount) : 0;
    if (elAdr) {
      elAdr.textContent = `$${adr.toLocaleString()} / night`;
    }
    if (elOccupancy) {
      const pct = totalStays > 0 ? Math.round((activeStaysCount / totalStays) * 100) : 100;
      elOccupancy.textContent = `${pct}% Bookable (${activeStaysCount}/${totalStays})`;
    }

    // Populate dedicated Stays View card valuations
    const staysCardUsd = document.getElementById('staysCardUsd');
    const staysCardKes = document.getElementById('staysCardKes');
    const staysCardAdr = document.getElementById('staysCardAdr');
    if (staysCardUsd) staysCardUsd.textContent = `$${totalUsdVal.toLocaleString()}`;
    if (staysCardKes) staysCardKes.textContent = `≈ KES ${totalKesVal.toLocaleString()} / Night`;
    if (staysCardAdr) staysCardAdr.textContent = `$${adr.toLocaleString()} / night`;

    // =======================================================================
    // ANALYTICS HUB 2: REGIONAL FOOTPRINT
    // =======================================================================
    const regionCounts = { ruaka: 0, westlands: 0, coast: 0, karen: 0, other: 0 };
    cachedStays.forEach(s => {
      const loc = (s.location_group || s.city || s.area || '').toLowerCase();
      if (loc.includes('ruaka') || loc.includes('kiambu')) regionCounts.ruaka++;
      else if (loc.includes('westland') || loc.includes('sarit')) regionCounts.westlands++;
      else if (loc.includes('mombasa') || loc.includes('diani') || loc.includes('coast')) regionCounts.coast++;
      else if (loc.includes('karen') || loc.includes('kitisuru')) regionCounts.karen++;
      else regionCounts.other++;
    });

    const safeTotal = totalStays || 1;
    updateRegionBar('regBarRuaka', 'regCountRuaka', regionCounts.ruaka, safeTotal, 'Ruaka & Northern Bypass');
    updateRegionBar('regBarWestlands', 'regCountWestlands', regionCounts.westlands, safeTotal, 'Westlands Skyline');
    updateRegionBar('regBarCoast', 'regCountCoast', regionCounts.coast, safeTotal, 'Mombasa & Diani Coast');
    updateRegionBar('regBarKaren', 'regCountKaren', regionCounts.karen, safeTotal, 'Karen Sanctuary');

    // =======================================================================
    // ANALYTICS HUB 3: CATEGORY MIX & PIPELINE FUNNEL
    // =======================================================================
    let penthouses = 0, villas = 0, townhouses = 0, suites = 0;
    cachedStays.forEach(s => {
      const cat = (s.property_type || s.category || '').toLowerCase();
      if (cat.includes('penthouse')) penthouses++;
      else if (cat.includes('villa')) villas++;
      else if (cat.includes('townhouse') || cat.includes('townhome')) townhouses++;
      else suites++;
    });

    const elPenthouses = document.getElementById('catCountPenthouse');
    const elVillas = document.getElementById('catCountVilla');
    const elTownhouses = document.getElementById('catCountTownhouse');
    const elSuites = document.getElementById('catCountApartment');
    if (elPenthouses) elPenthouses.textContent = penthouses;
    if (elVillas) elVillas.textContent = villas;
    if (elTownhouses) elTownhouses.textContent = townhouses;
    if (elSuites) elSuites.textContent = suites;

    // Funnel Steps
    const fTotal = document.getElementById('funnelTotal');
    const fReview = document.getElementById('funnelReview');
    const fApproved = document.getElementById('funnelApproved');
    if (fTotal) fTotal.textContent = totalHosts;
    if (fReview) fReview.textContent = pendingHosts;
    if (fApproved) fApproved.textContent = approvedHosts;
  }

  function updateRegionBar(barId, countId, count, total, name) {
    const bar = document.getElementById(barId);
    const label = document.getElementById(countId);
    const pct = Math.round((count / total) * 100);
    if (bar) bar.style.width = `${pct}%`;
    if (label) label.textContent = `${count} Stays (${pct}%)`;
  }

  function renderAllViews() {
    const filterQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
    renderHostsTable(filterQuery, currentStatusFilter);
    renderStaysTable(filterQuery);
    renderGuestsTable(filterQuery);
    renderHostWaitlistTable(filterQuery);
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

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align: center; color: var(--color-cocoa-light); font-weight: 700; font-size: 0.76rem; width: 38px;">
          ${idx + 1}
        </td>

        <td>
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span class="host-cell-name">${name}</span>
            <button class="btn-copy-micro copy-ref-btn" data-ref="${ref}" title="Click to copy Ref ID: ${ref}">
              <span>${ref}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
          <div class="host-cell-sub" style="margin-top: 2px;">
            <span style="white-space: nowrap;">${phone}</span>
            <span>•</span>
            <span title="${email}" style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${email}</span>
          </div>
        </td>

        <td>
          <div class="host-cell-name">${prop}</div>
          <div class="host-cell-sub" style="margin-top: 2px;">
            <span style="font-weight: 600; color: #241812;">${type}</span>
            <span>•</span>
            <span>${loc}</span>
          </div>
        </td>

        <td>
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span class="status-chip ${payMethod === 'M-Pesa' ? 'status-active' : 'chip-neutral'}" style="padding: 1px 6px; font-size: 0.68rem;">${payMethod}</span>
            ${idUrl ? `<a href="${idUrl}" target="_blank" rel="noopener noreferrer" class="btn-table-action btn-inspect" style="padding: 1px 6px; font-size: 0.66rem;">ID ↗</a>` : `<span style="font-size: 0.68rem; color: #888;">ID on file</span>`}
            <span style="font-size: 0.7rem; color: #B28756; font-weight: 700;">📷 ${Array.isArray(photoUrls) ? photoUrls.length : 3}</span>
          </div>
          <div style="font-family: monospace; font-size: 0.72rem; color: var(--color-cocoa); margin-top: 2px;">
            ${payNumber}
          </div>
        </td>

        <td>
          <select class="status-select-inline status-${status} host-status-select" data-ref="${ref}" style="padding: 4px 8px; font-size: 0.74rem; width: 100%;">
            <option value="pending_review" ${status === 'pending_review' ? 'selected' : ''}>⏳ Pending</option>
            <option value="approved" ${status === 'approved' ? 'selected' : ''}>✅ Approved</option>
            <option value="rejected" ${status === 'rejected' ? 'selected' : ''}>❌ Rejected</option>
          </select>
        </td>

        <td style="text-align: right;">
          <div class="table-action-btns" style="justify-content: flex-end; gap: 4px;">
            <a href="/admin/host-dossier.html?ref=${ref}" class="btn-table-action btn-inspect" title="Open full host application dossier" style="padding: 4px 8px; font-size: 0.72rem;">
              <span>Inspect ↗</span>
            </a>
            <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-table-action btn-wa-action" title="Open direct WhatsApp conversation with host" style="padding: 4px 8px; font-size: 0.72rem;">
              <span>💬 Chat</span>
            </a>
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

    // 2. Inline Status Switcher Dropdown
    hostsTableBody.querySelectorAll('.host-status-select').forEach(sel => {
      sel.addEventListener('change', async () => {
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
  }

  // =========================================================================
  // 4. HOST INSPECTION MODAL (Lightbox Dossier)
  // =========================================================================
  function openInspectModal(refId) {
    const host = cachedHosts.find(h => (h.refId || h.ref_id) === refId);
    if (!host || !inspectModal) return;

    currentInspectedRef = refId;
    if (inspectRefBadge) inspectRefBadge.textContent = refId;
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

    if (inspectBody) {
      inspectBody.innerHTML = `
        <div class="inspect-item">
          <span class="inspect-label">Host Partner Details</span>
          <div class="inspect-val"><strong>Name:</strong> ${host.fullName || host.full_name}</div>
          <div class="inspect-val"><strong>National ID / Passport:</strong> ${host.nationalId || host.national_id}</div>
          <div class="inspect-val"><strong>KRA PIN:</strong> ${host.kraPin || host.kra_pin || 'On File'}</div>
          <div class="inspect-val"><strong>Phone:</strong> ${host.phone}</div>
          <div class="inspect-val"><strong>Email:</strong> ${host.email}</div>
          <div class="inspect-val"><strong>Date of Birth:</strong> ${host.dob || '—'}</div>
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
  // 7. TAB & SIDEBAR NAVIGATION
  // =========================================================================
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

  // Per-view search inputs
  const staysSearchInput = document.getElementById('staysSearchInput');
  const guestsSearchInput = document.getElementById('guestsSearchInput');
  const hostWaitlistSearchInput = document.getElementById('hostWaitlistSearchInput');

  const tabTitles = {
    overview: { title: 'Executive Overview', sub: 'High-level command center, portfolio valuation, and platform economics.' },
    hosts: { title: 'Host Applications', sub: 'Curatorial vetting, identity verification documents, and payout routing.' },
    stays: { title: 'Live Stays Catalog', sub: 'Active bookable residences published in the live guest collection.' },
    guests: { title: 'VIP Guest Waitlist', sub: 'Founding Circle passholders with priority destination interests.' },
    hostWaitlist: { title: 'Host Partner Waitlist (partners.)', sub: 'Founding property custodians registered from partners.luxealiving.co.ke.' }
  };

  tabOverview?.addEventListener('click', () => switchTab('overview'));
  tabHosts?.addEventListener('click', () => switchTab('hosts'));
  tabStays?.addEventListener('click', () => switchTab('stays'));
  tabGuests?.addEventListener('click', () => switchTab('guests'));
  tabHostWaitlist?.addEventListener('click', () => switchTab('hostWaitlist'));

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

    viewOverview?.classList.toggle('hidden', tab !== 'overview');
    viewHosts?.classList.toggle('hidden', tab !== 'hosts');
    viewStays?.classList.toggle('hidden', tab !== 'stays');
    viewGuests?.classList.toggle('hidden', tab !== 'guests');
    viewHostWaitlist?.classList.toggle('hidden', tab !== 'hostWaitlist');

    if (adminViewTitle && tabTitles[tab]) {
      adminViewTitle.textContent = tabTitles[tab].title;
    }
    if (adminViewSub && tabTitles[tab]) {
      adminViewSub.textContent = tabTitles[tab].sub;
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
  window.addEventListener('luxea:host_updated', () => {
    loadDashboardData();
  });

  window.addEventListener('luxea:property_updated', () => {
    loadDashboardData();
  });

  window.addEventListener('luxea:dataUpdated', () => {
    loadDashboardData();
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
