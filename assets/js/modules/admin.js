/**
 * LUXEA LIVING — SUPER ADMIN CONSOLE MODULE (admin.js)
 * Features:
 * 1. Authentication Gateway: otienoronny56@gmail.com / Luxeaadmin
 * 2. Host Partner Vetting & Review Status Updates (Approve / Reject)
 * 3. Property Photos & Document Inspections (loaded from Supabase Storage)
 * 4. Realtime live sync when hosts submit or toggle listings
 * 5. Live Stays Inventory Management
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
  const hostsEmpty = document.getElementById('hostsEmptyState');
  const guestsEmpty = document.getElementById('guestsEmptyState');
  const searchInput = document.getElementById('adminSearchInput');
  const statusFilterSelect = document.getElementById('statusFilterSelect');

  // Tabs
  const tabHosts = document.getElementById('tabHostsBtn');
  const tabStays = document.getElementById('tabStaysBtn');
  const tabGuests = document.getElementById('tabGuestsBtn');
  const hostsPane = document.getElementById('hostsViewPane');
  const staysPane = document.getElementById('staysViewPane');
  const guestsPane = document.getElementById('guestsViewPane');

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

  // Data State
  let cachedHosts = [];
  let cachedStays = [];
  let cachedGuests = [];

  // =========================================================================
  // 1. AUTHENTICATION GATE
  // =========================================================================
  function checkAuth() {
    if (window.LuxeaAuth && window.LuxeaAuth.isAdminLoggedIn()) {
      const admin = window.LuxeaAuth.getCurrentAdmin();
      loginGateway?.classList.add('hidden');
      dashboardView?.classList.remove('hidden');
      adminBadge?.classList.remove('hidden');
      logoutBtn?.classList.remove('hidden');
      if (admin && admin.name) {
        adminBadge.textContent = `👑 Super Admin: ${admin.name.split(' ')[0]}`;
      }
      loadDashboardData();
    } else {
      loginGateway?.classList.remove('hidden');
      dashboardView?.classList.add('hidden');
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
  // 2. DATA LOADING & METRICS
  // =========================================================================
  async function loadDashboardData() {
    // 1. Fetch Hosts
    if (window.LuxeaDB) {
      cachedHosts = await window.LuxeaDB.fetchHosts();
      cachedGuests = await window.LuxeaDB.fetchWaitlist();
      cachedStays = await window.LuxeaDB.fetchProperties();
    } else {
      cachedHosts = JSON.parse(localStorage.getItem('luxea_host_applications') || '[]');
      cachedGuests = JSON.parse(localStorage.getItem('luxea_waitlist_guests') || '[]');
      cachedStays = JSON.parse(localStorage.getItem('luxea_cached_properties') || '[]');
    }

    // Combine stays with default catalog
    if (cachedStays.length === 0) {
      cachedStays = LUXEA_STAYS.map(s => ({
        id: s.id,
        name: s.name,
        property_type: s.propertyType || s.category,
        city: s.city,
        price_per_night_kes: s.kesPrice,
        cover_image_url: s.image,
        is_available: true
      }));
    }

    renderMetrics();
    renderAllViews();
  }

  function renderMetrics() {
    const totalHosts = cachedHosts.length;
    const pendingHosts = cachedHosts.filter(h => !h.review_status || h.review_status === 'pending_review').length;
    const approvedHosts = cachedHosts.filter(h => h.review_status === 'approved').length;
    const totalStays = cachedStays.length;
    const totalGuests = cachedGuests.length;

    document.getElementById('metricTotalHosts').textContent = totalHosts;
    document.getElementById('metricPendingHosts').textContent = pendingHosts;
    document.getElementById('metricApprovedHosts').textContent = approvedHosts;
    document.getElementById('metricTotalStays').textContent = totalStays;
    document.getElementById('metricTotalGuests').textContent = totalGuests;

    document.getElementById('hostTabCounter').textContent = totalHosts;
    document.getElementById('staysTabCounter').textContent = totalStays;
    document.getElementById('guestTabCounter').textContent = totalGuests;
  }

  function renderAllViews() {
    const filterQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const statusFilter = statusFilterSelect ? statusFilterSelect.value : 'all';

    renderHostsTable(filterQuery, statusFilter);
    renderStaysTable(filterQuery);
    renderGuestsTable(filterQuery);
  }

  // =========================================================================
  // 3. HOSTS APPLICATIONS TABLE
  // =========================================================================
  function renderHostsTable(query = '', statusFilter = 'all') {
    if (!hostsTableBody) return;
    hostsTableBody.innerHTML = '';

    const filtered = cachedHosts.filter(h => {
      const matchQuery = !query ||
        (h.fullName || h.full_name || '').toLowerCase().includes(query) ||
        (h.propertyName || h.property_name || '').toLowerCase().includes(query) ||
        (h.county || '').toLowerCase().includes(query) ||
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

    filtered.forEach(h => {
      const ref = h.refId || h.ref_id;
      const name = h.fullName || h.full_name;
      const phone = h.phone;
      const email = h.email;
      const prop = h.propertyName || h.property_name;
      const loc = `${h.area || h.area_suburb || ''}, ${h.county}`;
      const type = `${h.propertyType || h.property_type || 'Apartment'} • ${h.bedrooms || 1} Bed`;
      const payMethod = h.payoutMethod || h.payout_method || (h.payoutDetails && h.payoutDetails.method) || 'M-Pesa';
      const payNumber = (h.payoutDetails && h.payoutDetails.number) || h.mpesa_number || h.bank_account_number || '';
      const status = h.review_status || 'pending_review';
      const photoUrls = h.property_photos_urls || [];
      const idUrl = h.id_document_url;

      let statusBadgeHtml = '';
      if (status === 'approved') {
        statusBadgeHtml = `<span class="status-badge-approved">✅ Approved</span>`;
      } else if (status === 'rejected') {
        statusBadgeHtml = `<span class="status-badge-rejected">❌ Rejected</span>`;
      } else {
        statusBadgeHtml = `<span class="status-badge-pending">⏳ Pending Review</span>`;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong style="font-family: monospace; color: var(--color-camel-dark);">${ref}</strong></td>
        <td>
          <strong>${name}</strong><br>
          <small style="color: var(--color-cocoa);">${phone} • ${email}</small>
        </td>
        <td>
          <strong>${prop}</strong><br>
          <small style="color: var(--color-cocoa);">${loc}</small>
        </td>
        <td><small>${type}</small></td>
        <td>
          <span class="status-chip ${payMethod === 'M-Pesa' ? 'status-active' : 'status-pending'}">${payMethod}</span><br>
          <small style="font-family: monospace; color: var(--color-cocoa);">${payNumber}</small>
        </td>
        <td>
          <div style="display: flex; gap: 4px; flex-direction: column;">
            ${idUrl ? `<a href="${idUrl}" target="_blank" rel="noopener" class="btn-table-action btn-inspect" style="text-align: center; font-size: 0.7rem;">📄 View ID Doc</a>` : `<small style="color: #888;">ID on file</small>`}
            <small style="color: var(--color-camel-dark); font-weight: 600;">📷 ${Array.isArray(photoUrls) ? photoUrls.length : 3} Bucket Photos</small>
          </div>
        </td>
        <td>${statusBadgeHtml}</td>
        <td>
          <div class="table-action-btns">
            ${status !== 'approved' ? `<button class="btn-table-action btn-approve approve-host-btn" data-ref="${ref}" title="Approve partner">Approve</button>` : ''}
            ${status !== 'rejected' ? `<button class="btn-table-action btn-reject reject-host-btn" data-ref="${ref}" title="Reject application">Reject</button>` : ''}
            <button class="btn-table-action btn-inspect inspect-host-btn" data-ref="${ref}" title="View full details">Inspect</button>
          </div>
        </td>
      `;

      hostsTableBody.appendChild(tr);
    });

    bindHostTableActions();
  }

  function bindHostTableActions() {
    // Approve buttons
    hostsTableBody.querySelectorAll('.approve-host-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ref = btn.getAttribute('data-ref');
        if (confirm(`Are you sure you want to approve host application ${ref}?`)) {
          if (window.LuxeaDB) {
            await window.LuxeaDB.updateHostStatus(ref, 'approved');
            if (window.showToast) window.showToast(`✅ Host ${ref} officially APPROVED as partner!`);
            loadDashboardData();
          }
        }
      });
    });

    // Reject buttons
    hostsTableBody.querySelectorAll('.reject-host-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ref = btn.getAttribute('data-ref');
        if (confirm(`Reject host application ${ref}?`)) {
          if (window.LuxeaDB) {
            await window.LuxeaDB.updateHostStatus(ref, 'rejected');
            if (window.showToast) window.showToast(`❌ Host ${ref} marked as Rejected.`);
            loadDashboardData();
          }
        }
      });
    });

    // Inspect buttons
    hostsTableBody.querySelectorAll('.inspect-host-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ref = btn.getAttribute('data-ref');
        openInspectModal(ref);
      });
    });
  }

  // =========================================================================
  // 4. HOST INSPECTION MODAL (Detailed View)
  // =========================================================================
  function openInspectModal(refId) {
    const host = cachedHosts.find(h => (h.refId || h.ref_id) === refId);
    if (!host || !inspectModal) return;

    currentInspectedRef = refId;
    inspectRefBadge.textContent = refId;
    inspectTitle.textContent = `${host.fullName || host.full_name} — ${host.propertyName || host.property_name}`;

    const status = host.review_status || 'pending_review';
    inspectStatusLabel.innerHTML = `Current Review Status: <strong>${status.toUpperCase()}</strong>`;

    const photos = host.property_photos_urls || [];
    let photosHtml = '';
    if (Array.isArray(photos) && photos.length > 0) {
      photosHtml = `
        <div class="inspect-photos-gallery">
          ${photos.map(p => `<img src="${p}" alt="Property Photo" class="inspect-photo-thumb" onclick="window.open('${p}', '_blank')">`).join('')}
        </div>
      `;
    } else {
      photosHtml = `<p style="font-size: 0.82rem; color: var(--color-cocoa);">Standard property staging photos uploaded.</p>`;
    }

    inspectBody.innerHTML = `
      <div>
        <label class="metric-label">Personal &amp; Tax Info</label>
        <p style="font-size: 0.88rem; margin: 4px 0;"><strong>Name:</strong> ${host.fullName || host.full_name}</p>
        <p style="font-size: 0.88rem; margin: 4px 0;"><strong>National ID / Passport:</strong> ${host.nationalId || host.national_id}</p>
        <p style="font-size: 0.88rem; margin: 4px 0;"><strong>KRA PIN:</strong> ${host.kraPin || host.kra_pin || 'On File'}</p>
        <p style="font-size: 0.88rem; margin: 4px 0;"><strong>Phone:</strong> ${host.phone}</p>
        <p style="font-size: 0.88rem; margin: 4px 0;"><strong>Email:</strong> ${host.email}</p>
        <p style="font-size: 0.88rem; margin: 4px 0;"><strong>DOB:</strong> ${host.dob || '—'}</p>
      </div>

      <div>
        <label class="metric-label">Property Specifications</label>
        <p style="font-size: 0.88rem; margin: 4px 0;"><strong>Property Name:</strong> ${host.propertyName || host.property_name}</p>
        <p style="font-size: 0.88rem; margin: 4px 0;"><strong>Type:</strong> ${host.propertyType || host.property_type}</p>
        <p style="font-size: 0.88rem; margin: 4px 0;"><strong>Location:</strong> ${host.area || host.area_suburb}, ${host.county}</p>
        <p style="font-size: 0.88rem; margin: 4px 0;"><strong>Address:</strong> ${host.propertyAddress || host.property_address || '—'}</p>
        <p style="font-size: 0.88rem; margin: 4px 0;"><strong>Layout:</strong> ${host.bedrooms} Beds • ${host.bathrooms} Baths • Max ${host.maxGuests || 2} Guests</p>
        <p style="font-size: 0.88rem; margin: 4px 0;"><strong>Amenities:</strong> ${host.amenities || 'Standard luxury'}</p>
      </div>

      <div class="inspect-row-full" style="background: var(--color-linen-light); padding: 14px; border-radius: 12px; border: 1px solid var(--color-khaki-light);">
        <label class="metric-label">Bank / M-Pesa Payout Registration</label>
        <p style="font-size: 0.9rem; margin: 2px 0;"><strong>Method:</strong> ${(host.payoutDetails && host.payoutDetails.method) || host.payoutMethod || host.payout_method || 'M-Pesa'}</p>
        <p style="font-size: 0.85rem; margin: 2px 0; color: var(--color-cocoa);">
          <strong>Account / Line:</strong> ${(host.payoutDetails && (host.payoutDetails.number || host.payoutDetails.account)) || host.mpesa_number || host.bank_account_number || 'Registered'}
        </p>
      </div>

      <div class="inspect-row-full">
        <label class="metric-label">Uploaded Photos (From Supabase Storage Bucket)</label>
        ${photosHtml}
      </div>

      <div class="inspect-row-full" style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--color-cocoa); border-top: 1px solid var(--color-khaki-light); padding-top: 10px;">
        <span><strong>Digital Signature:</strong> ${host.signature || host.fullName || host.full_name}</span>
        <span><strong>Submission Date:</strong> ${host.signatureDate || host.signature_date || host.submittedAt || 'Recent'}</span>
      </div>
    `;

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
      if (window.showToast) window.showToast(`✅ Host ${currentInspectedRef} APPROVED!`);
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
  // 5. LIVE STAYS & INVENTORY TABLE
  // =========================================================================
  function renderStaysTable(query = '') {
    if (!staysTableBody) return;
    staysTableBody.innerHTML = '';

    const availMap = JSON.parse(localStorage.getItem('luxea_host_avail_map') || '{}');

    const filtered = cachedStays.filter(s =>
      !query ||
      (s.name || '').toLowerCase().includes(query) ||
      (s.city || '').toLowerCase().includes(query) ||
      (s.property_type || '').toLowerCase().includes(query)
    );

    filtered.forEach(stay => {
      const isAvail = availMap[stay.id] !== undefined ? availMap[stay.id] : (stay.is_available !== false);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <img src="${stay.cover_image_url || stay.image || '/assets/images/villa.jpg'}" alt="${stay.name}" style="width: 60px; height: 45px; object-fit: cover; border-radius: 8px;">
        </td>
        <td><strong>${stay.name}</strong></td>
        <td>${stay.city || 'Nairobi'}</td>
        <td><span class="status-chip status-active">${(stay.property_type || 'Apartment').toUpperCase()}</span></td>
        <td><strong>KSh ${(stay.price_per_night_kes || stay.kesPrice || 12000).toLocaleString()}</strong></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <label class="lux-switch" style="width: 40px; height: 22px;">
              <input type="checkbox" class="admin-stay-avail-toggle" data-id="${stay.id}" ${isAvail ? 'checked' : ''}>
              <span class="lux-switch-slider"></span>
            </label>
            <span style="font-size: 0.8rem; font-weight: 600; color: ${isAvail ? '#1A7038' : '#C0392B'};">
              ${isAvail ? 'Available' : 'Blocked'}
            </span>
          </div>
        </td>
        <td>
          <a href="/stays/?id=${stay.id}" target="_blank" class="btn-table-action btn-inspect" style="text-decoration: none;">View Live ↗</a>
        </td>
      `;

      staysTableBody.appendChild(tr);
    });

    // Bind Super Admin availability toggles
    staysTableBody.querySelectorAll('.admin-stay-avail-toggle').forEach(chk => {
      chk.addEventListener('change', async () => {
        const id = chk.getAttribute('data-id');
        const isAvail = chk.checked;
        if (window.LuxeaDB) {
          await window.LuxeaDB.updatePropertyAvailability(id, isAvail);
          if (window.showToast) window.showToast(`Availability updated for stay.`);
          loadDashboardData();
        }
      });
    });
  }

  // =========================================================================
  // 6. VIP GUESTS WAITLIST TABLE
  // =========================================================================
  function renderGuestsTable(query = '') {
    if (!guestsTableBody) return;
    guestsTableBody.innerHTML = '';

    const filtered = cachedGuests.filter(g =>
      !query ||
      (g.fullName || g.full_name || '').toLowerCase().includes(query) ||
      (g.email || '').toLowerCase().includes(query) ||
      (g.passNumber || g.pass_number || '').toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      if (guestsEmpty) guestsEmpty.classList.remove('hidden');
      return;
    }
    if (guestsEmpty) guestsEmpty.classList.add('hidden');

    filtered.forEach(g => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong style="font-family: monospace; color: var(--color-camel-dark);">${g.passNumber || g.pass_number}</strong></td>
        <td><strong>${g.fullName || g.full_name}</strong></td>
        <td>${g.email}</td>
        <td>${g.phone || '—'}</td>
        <td><small>${g.destinations || g.preferred_destinations || 'All Kenya'}</small></td>
        <td><small>${g.timestamp || (g.created_at ? new Date(g.created_at).toLocaleDateString() : 'Recent')}</small></td>
      `;
      guestsTableBody.appendChild(tr);
    });
  }

  // =========================================================================
  // 7. TAB NAVIGATION & FILTERS
  // =========================================================================
  tabHosts?.addEventListener('click', () => {
    tabHosts.classList.add('active');
    tabStays?.classList.remove('active');
    tabGuests?.classList.remove('active');
    hostsPane?.classList.remove('hidden');
    staysPane?.classList.add('hidden');
    guestsPane?.classList.add('hidden');
  });

  tabStays?.addEventListener('click', () => {
    tabStays.classList.add('active');
    tabHosts?.classList.remove('active');
    tabGuests?.classList.remove('active');
    staysPane?.classList.remove('hidden');
    hostsPane?.classList.add('hidden');
    guestsPane?.classList.add('hidden');
  });

  tabGuests?.addEventListener('click', () => {
    tabGuests.classList.add('active');
    tabHosts?.classList.remove('active');
    tabStays?.classList.remove('active');
    guestsPane?.classList.remove('hidden');
    hostsPane?.classList.add('hidden');
    staysPane?.classList.add('hidden');
  });

  searchInput?.addEventListener('input', () => renderAllViews());
  statusFilterSelect?.addEventListener('change', () => renderAllViews());

  // CSV Exports
  document.getElementById('exportHostsCsvBtn')?.addEventListener('click', () => {
    if (cachedHosts.length === 0) return alert('No hosts to export.');
    const headers = ['Ref ID', 'Full Name', 'Phone', 'Email', 'Property', 'Type', 'County', 'Area', 'Payout Method', 'Status'];
    const rows = cachedHosts.map(h => [
      `"${h.refId || h.ref_id}"`,
      `"${h.fullName || h.full_name}"`,
      `"${h.phone}"`,
      `"${h.email}"`,
      `"${h.propertyName || h.property_name}"`,
      `"${h.propertyType || h.property_type}"`,
      `"${h.county}"`,
      `"${h.area || h.area_suburb}"`,
      `"${h.payoutMethod || h.payout_method || (h.payoutDetails && h.payoutDetails.method) || 'M-Pesa'}"`,
      `"${h.review_status || 'pending_review'}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCsv(`Luxea-Host-Applications-${new Date().toISOString().split('T')[0]}.csv`, csv);
  });

  document.getElementById('exportGuestsCsvBtn')?.addEventListener('click', () => {
    if (cachedGuests.length === 0) return alert('No waitlist guests to export.');
    const headers = ['Pass Number', 'Full Name', 'Email', 'Phone', 'Destinations'];
    const rows = cachedGuests.map(g => [
      `"${g.passNumber || g.pass_number}"`,
      `"${g.fullName || g.full_name}"`,
      `"${g.email}"`,
      `"${g.phone}"`,
      `"${g.destinations || g.preferred_destinations}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCsv(`Luxea-VIP-Waitlist-${new Date().toISOString().split('T')[0]}.csv`, csv);
  });

  function downloadCsv(filename, content) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  // =========================================================================
  // 8. SUPABASE REALTIME LIVE SYNC
  // =========================================================================
  window.addEventListener('luxea:host_updated', (e) => {
    console.log('⚡ Super Admin received host update:', e.detail);
    if (window.showToast) window.showToast('⚡ New host application / status change received in real time!');
    loadDashboardData();
  });

  window.addEventListener('luxea:property_updated', (e) => {
    console.log('⚡ Super Admin received property update:', e.detail);
    loadDashboardData();
  });

  // Initial Auth Check
  checkAuth();
}
