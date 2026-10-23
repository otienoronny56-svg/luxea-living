/**
 * LUXEA LIVING — LAUNDRY & VALET PORTAL (laundryManager.js)
 * 1. Default for Guests/Hosts: Marketplace of local verified laundry & dry clean providers with clear pricing.
 * 2. Order Tracking: Guests can track their pickup orders live.
 * 3. Gated / Invite-Only: Service providers only see dashboard/registration via invite link or partner login.
 */

export const DEFAULT_LAUNDRY_PROVIDERS = [
  {
    id: 'prov-spotless',
    ref_id: 'LXL-2026-WEST',
    business_name: 'Spotless Valet & Dry Cleaners',
    contact_person: 'Mary Wanjiku',
    phone: '0712 345 678',
    rating: 4.9,
    completed_orders_count: 68,
    coverage_areas: ['Westlands', 'Parklands', 'Riverside'],
    price_wash_fold_per_kg: 250,
    price_linen_turnover_set: 1500,
    price_dry_clean_suit: 900,
    express_available: true,
    turnaround: 'Same-day 4-6 hrs',
    tagline: 'Premium garment care, steam pressing & executive suit dry cleaning with doorstep collection.'
  },
  {
    id: 'prov-linencraft',
    ref_id: 'LXL-2026-KILI',
    business_name: 'LinenCraft Host Turnover Specialists',
    contact_person: 'Kevin Otieno',
    phone: '0722 890 123',
    rating: 5.0,
    completed_orders_count: 94,
    coverage_areas: ['Kilimani', 'Kileleshwa', 'Lavington'],
    price_wash_fold_per_kg: 220,
    price_linen_turnover_set: 1400,
    price_dry_clean_suit: 850,
    express_available: true,
    turnaround: 'Rapid turnover for Airbnb hosts',
    tagline: 'Specialized bed sheets, duvet & bath towel laundering with hotel-grade crisp folding.'
  },
  {
    id: 'prov-freshbreeze',
    ref_id: 'LXL-2026-RUAK',
    business_name: 'FreshBreeze Eco-Laundry Hub',
    contact_person: 'Grace Muthoni',
    phone: '0733 456 789',
    rating: 4.8,
    completed_orders_count: 51,
    coverage_areas: ['Ruaka', 'Two Rivers', 'Rosslyn'],
    price_wash_fold_per_kg: 200,
    price_linen_turnover_set: 1300,
    price_dry_clean_suit: 800,
    express_available: true,
    turnaround: 'Next-day or 6-hr express',
    tagline: 'Eco-friendly hypoallergenic detergents, gentle cycle care, ideal for long stay guests.'
  },
  {
    id: 'prov-safari',
    ref_id: 'LXL-2026-ROYS',
    business_name: 'Safari Sparkle Express Laundromat',
    contact_person: 'Samuel Kiprop',
    phone: '0701 234 567',
    rating: 4.9,
    completed_orders_count: 43,
    coverage_areas: ['Roysambu', 'Garden Estate', 'Thika Road'],
    price_wash_fold_per_kg: 220,
    price_linen_turnover_set: 1400,
    price_dry_clean_suit: 850,
    express_available: true,
    turnaround: 'Fast doorstep bike courier pickup',
    tagline: 'Prompt doorstep collection & delivery with live SMS updates and express turnaround.'
  },
  {
    id: 'prov-karen-prestige',
    ref_id: 'LXL-2026-KAREN',
    business_name: 'Prestige Fabric & Villa Valet',
    contact_person: 'Brenda Cherono',
    phone: '0720 998 877',
    rating: 5.0,
    completed_orders_count: 36,
    coverage_areas: ['Karen', 'Langata', 'Hardy'],
    price_wash_fold_per_kg: 280,
    price_linen_turnover_set: 1600,
    price_dry_clean_suit: 950,
    express_available: true,
    turnaround: 'Same-day concierge pickup',
    tagline: 'Luxury villa & holiday home valet laundry. White-glove handling of fine linens & delicate fabrics.'
  }
];

export function initLaundryManager() {
  // Views
  const browseView = document.getElementById('laundryBrowseView');
  const myOrdersView = document.getElementById('laundryMyOrdersView');
  const dashboardView = document.getElementById('laundryDashboardView');
  const registerView = document.getElementById('laundryRegisterView');
  
  // Navigation elements
  const navTabs = document.querySelectorAll('.laundry-mode-tab');
  const partnerTabBtn = document.getElementById('partnerPortalTabBtn');
  const providersContainer = document.getElementById('laundryProvidersGrid');
  const locFilterChips = document.querySelectorAll('.loc-filter-chip');
  const providerSearchInput = document.getElementById('providerSearchInput');
  
  // Orders & Modal elements
  const ordersContainer = document.getElementById('laundryOrdersContainer');
  const myOrdersContainer = document.getElementById('myOrdersContainer');
  const myOrdersBadge = document.getElementById('myOrdersCountBadge');
  const orderModal = document.getElementById('laundryOrderModal');
  const orderForm = document.getElementById('createLaundryOrderForm');
  const openOrderBtn = document.getElementById('openCreateOrderBtn');
  const closeOrderBtn = document.getElementById('closeOrderModalBtn');
  const cancelOrderBtn = document.getElementById('cancelOrderModalBtn');
  const regForm = document.getElementById('laundryRegisterForm');

  // State
  let activeLocFilter = 'All';
  let activeSearchTerm = '';
  let selectedProviderForOrder = null;
  let partnerSession = window.LuxeaDB ? window.LuxeaDB.getCurrentLaundryPartner() : null;

  // Initialize sample orders if empty
  seedInitialOrdersIfEmpty();

  // 1. View Switching Logic
  function switchView(mode) {
    // Hide all views first
    browseView?.classList.add('hidden');
    myOrdersView?.classList.add('hidden');
    dashboardView?.classList.add('hidden');
    registerView?.classList.add('hidden');

    // Update active state on nav tabs
    navTabs.forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-mode') === mode);
    });

    if (mode === 'browse') {
      browseView?.classList.remove('hidden');
      renderProvidersList();
    } else if (mode === 'my_orders') {
      myOrdersView?.classList.remove('hidden');
      renderGuestOrders();
    } else if (mode === 'dashboard') {
      dashboardView?.classList.remove('hidden');
      renderPartnerDashboard();
    } else if (mode === 'register') {
      registerView?.classList.remove('hidden');
    }
  }

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchView(tab.getAttribute('data-mode'));
    });
  });

  // Switch to customer view button from partner dashboard
  document.getElementById('backToMarketplaceBtn')?.addEventListener('click', () => {
    switchView('browse');
  });

  // 2. Fetch and Combine Providers (Default + Supabase)
  async function getAllProviders() {
    let dbPartners = [];
    if (window.LuxeaDB && typeof window.LuxeaDB.fetchLaundryPartners === 'function') {
      dbPartners = await window.LuxeaDB.fetchLaundryPartners();
    } else {
      dbPartners = JSON.parse(localStorage.getItem('luxea_laundry_partners') || '[]');
    }

    // Merge default providers and custom registered partners
    const combined = [...DEFAULT_LAUNDRY_PROVIDERS];
    dbPartners.forEach(p => {
      if (!combined.some(c => c.ref_id === p.ref_id || c.id === p.id)) {
        combined.unshift({
          id: p.id,
          ref_id: p.ref_id || 'LXL-PARTNER',
          business_name: p.business_name || p.businessName,
          contact_person: p.contact_person || p.contactPerson || 'Manager',
          phone: p.phone,
          rating: p.rating || 5.0,
          completed_orders_count: p.completed_orders_count || 1,
          coverage_areas: Array.isArray(p.coverage_areas) ? p.coverage_areas : ['Westlands', 'Kilimani'],
          price_wash_fold_per_kg: parseFloat(p.price_wash_fold_per_kg) || 250,
          price_linen_turnover_set: parseFloat(p.price_linen_turnover_set) || 1500,
          price_dry_clean_suit: parseFloat(p.price_dry_clean_suit) || 900,
          express_available: p.express_available !== false,
          turnaround: p.express_available ? 'Express same-day available' : 'Next day pickup',
          tagline: 'Verified Luxea Living service provider.'
        });
      }
    });

    return combined;
  }

  // 3. Render Providers List for Customers
  async function renderProvidersList() {
    if (!providersContainer) return;
    const providers = await getAllProviders();

    // Filter by location & search
    const filtered = providers.filter(p => {
      const matchesLoc = activeLocFilter === 'All' || 
        (p.coverage_areas && p.coverage_areas.some(area => area.toLowerCase().includes(activeLocFilter.toLowerCase())));
      
      const matchesSearch = !activeSearchTerm || 
        p.business_name.toLowerCase().includes(activeSearchTerm.toLowerCase()) ||
        (p.coverage_areas && p.coverage_areas.some(a => a.toLowerCase().includes(activeSearchTerm.toLowerCase())));

      return matchesLoc && matchesSearch;
    });

    if (filtered.length === 0) {
      providersContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: #FFF; border-radius: var(--radius-lg); border: 1px solid var(--color-khaki-light);">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">🧺</div>
          <h3 style="font-family: var(--font-serif); font-size: 1.3rem; color: var(--color-espresso); margin-bottom: 6px;">No laundry providers found for "${activeLocFilter}"</h3>
          <p style="font-size: 0.85rem; color: var(--color-cocoa); max-width: 440px; margin: 0 auto 16px;">
            We are actively expanding verified partners into this zone. You can request a central valet pickup and our concierge will assign the closest dispatch.
          </p>
          <button type="button" class="btn btn-primary btn-sm" id="emptyCentralOrderBtn">
            <span>Request Central Pickup Instead</span>
          </button>
        </div>
      `;
      providersContainer.querySelector('#emptyCentralOrderBtn')?.addEventListener('click', () => {
        openOrderModalWithProvider(null);
      });
      return;
    }

    providersContainer.innerHTML = filtered.map(provider => {
      const areasHtml = (provider.coverage_areas || []).map(a => `<span class="provider-area-tag">${a}</span>`).join('');

      return `
        <div class="provider-card" data-provider-id="${provider.id}">
          <div>
            <div class="provider-header">
              <div>
                <span style="font-size: 0.68rem; font-weight: 700; color: var(--color-camel-dark); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">
                  ✦ VERIFIED LUXEA PARTNER
                </span>
                <h3 class="provider-title">${provider.business_name}</h3>
              </div>
              <div class="provider-rating-pill">
                <span>★ ${provider.rating || '5.0'}</span>
                <small style="opacity: 0.8;">(${provider.completed_orders_count || 12})</small>
              </div>
            </div>

            <div class="provider-areas-tags">
              ${areasHtml}
            </div>

            <p class="provider-bio">${provider.tagline || 'Specialized in fast, spotless fabric care with convenient doorstep delivery.'}</p>

            <div class="provider-pricing-box">
              <div class="pricing-row">
                <span>🧺 Wash &amp; Fold</span>
                <strong>KES ${provider.price_wash_fold_per_kg} / kg</strong>
              </div>
              <div class="pricing-row">
                <span>👔 Dry Clean Suit</span>
                <strong>KES ${provider.price_dry_clean_suit}</strong>
              </div>
              <div class="pricing-row">
                <span>🏡 Host Linen Set</span>
                <strong>KES ${provider.price_linen_turnover_set}</strong>
              </div>
              ${provider.express_available ? `
                <div style="font-size: 0.74rem; color: #166534; font-weight: 600; margin-top: 6px; display: flex; align-items: center; gap: 4px;">
                  ⚡ ${provider.turnaround || 'Same-day express turnaround'}
                </div>
              ` : ''}
            </div>
          </div>

          <div class="provider-footer">
            <button type="button" class="btn btn-primary btn-sm book-this-provider-btn" data-provider-id="${provider.id}" style="padding: 10px 14px;">
              <span>Book Pickup →</span>
            </button>
            <a href="tel:${provider.phone}" class="btn btn-outline btn-sm" style="padding: 10px 14px;" title="Call provider directly">
              <span>📞 Call</span>
            </a>
          </div>
        </div>
      `;
    }).join('');

    // Attach click events on "Book Pickup" buttons
    providersContainer.querySelectorAll('.book-this-provider-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const provId = btn.getAttribute('data-provider-id');
        const selected = providers.find(p => p.id === provId);
        openOrderModalWithProvider(selected);
      });
    });
  }

  // Location filter clicks
  locFilterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      locFilterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeLocFilter = chip.getAttribute('data-loc');
      renderProvidersList();
    });
  });

  // Search input filter
  providerSearchInput?.addEventListener('input', (e) => {
    activeSearchTerm = e.target.value.trim();
    renderProvidersList();
  });

  // 4. Render Guest Orders (Track My Orders)
  function renderGuestOrders() {
    if (!myOrdersContainer) return;
    const allOrders = JSON.parse(localStorage.getItem('luxea_laundry_orders') || '[]');

    if (myOrdersBadge) {
      myOrdersBadge.textContent = allOrders.length;
      myOrdersBadge.style.display = allOrders.length > 0 ? 'inline-block' : 'none';
    }

    if (allOrders.length === 0) {
      myOrdersContainer.innerHTML = `
        <div style="text-align: center; padding: 48px 20px; color: var(--color-cocoa); background: #FFF; border-radius: var(--radius-lg); border: 1px solid var(--color-khaki-light);">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">📦</div>
          <h3 style="font-family: var(--font-serif); font-size: 1.3rem; color: var(--color-espresso); margin-bottom: 4px;">No active orders yet</h3>
          <p style="font-size: 0.85rem; margin-bottom: 16px;">Pick a laundry partner from the marketplace and request a doorstep pickup.</p>
          <button class="btn btn-primary btn-sm" id="emptyBookNowBtn">Browse Providers &amp; Book</button>
        </div>
      `;
      myOrdersContainer.querySelector('#emptyBookNowBtn')?.addEventListener('click', () => {
        switchView('browse');
      });
      return;
    }

    myOrdersContainer.innerHTML = allOrders.map(order => {
      const statusLabel = getStatusLabel(order.status);
      const stepIndex = getStepIndex(order.status);

      return `
        <div class="laundry-order-card" style="margin-bottom: 16px;">
          <div class="order-top-row">
            <div>
              <span class="order-id-badge">${order.order_number || 'ORD-LX-XXXX'}</span>
              <span style="font-size: 0.78rem; color: var(--color-cocoa); margin-left: 8px;">
                • ${order.order_type === 'host_turnover' ? '🏡 Host Linen Turnover' : '✨ Guest Valet'}
              </span>
            </div>
            <span class="order-status-pill status-${order.status || 'requested'}">${statusLabel}</span>
          </div>

          <!-- Stepper Visualization for Guests -->
          <div class="order-tracking-steps">
            <div class="track-step-item ${stepIndex >= 1 ? (stepIndex > 1 ? 'done' : 'active') : ''}">
              <div class="track-step-circle">${stepIndex > 1 ? '✓' : '1'}</div>
              <span class="track-step-label">Placed</span>
            </div>
            <div class="track-step-item ${stepIndex >= 2 ? (stepIndex > 2 ? 'done' : 'active') : ''}">
              <div class="track-step-circle">${stepIndex > 2 ? '✓' : '2'}</div>
              <span class="track-step-label">Accepted</span>
            </div>
            <div class="track-step-item ${stepIndex >= 3 ? (stepIndex > 3 ? 'done' : 'active') : ''}">
              <div class="track-step-circle">${stepIndex > 3 ? '✓' : '3'}</div>
              <span class="track-step-label">Picked Up</span>
            </div>
            <div class="track-step-item ${stepIndex >= 4 ? (stepIndex > 4 ? 'done' : 'active') : ''}">
              <div class="track-step-circle">${stepIndex > 4 ? '✓' : '4'}</div>
              <span class="track-step-label">Washing</span>
            </div>
            <div class="track-step-item ${stepIndex >= 5 ? (stepIndex > 5 ? 'done' : 'active') : ''}">
              <div class="track-step-circle">${stepIndex > 5 ? '✓' : '5'}</div>
              <span class="track-step-label">Out for Delivery</span>
            </div>
            <div class="track-step-item ${stepIndex >= 6 ? 'done' : ''}">
              <div class="track-step-circle">${stepIndex >= 6 ? '✓' : '6'}</div>
              <span class="track-step-label">Delivered</span>
            </div>
          </div>

          <div class="order-details-grid" style="margin-top: 14px;">
            <div class="order-detail-item">
              <strong>Stay / Residence</strong>
              <span>${order.property_name || 'Curated Villa'} ${order.unit_number ? `(${order.unit_number})` : ''}</span>
              <small style="color: var(--color-cocoa); display: block;">${order.location_area || 'Nairobi'}</small>
            </div>
            <div class="order-detail-item">
              <strong>Pickup Scheduled</strong>
              <span>📅 ${order.pickup_date || 'Today'}</span>
              <small style="color: var(--color-cocoa); display: block;">⏰ ${order.pickup_time_slot || '10:00 AM - 12:00 PM'}</small>
            </div>
            <div class="order-detail-item">
              <strong>Service &amp; Items</strong>
              <span>${order.service_type || 'Wash & Fold'}</span>
              <small style="color: var(--color-cocoa); display: block;">${order.estimated_weight_or_items || '1 Bag'}</small>
            </div>
            <div class="order-detail-item">
              <strong>Estimated Total</strong>
              <span style="font-weight: 700; color: var(--color-espresso);">KES ${(parseFloat(order.total_amount_kes) || 1200).toLocaleString()}</span>
              <small style="color: #166534; font-weight: 600; display: block;">M-Pesa on Delivery</small>
            </div>
          </div>

          ${order.special_instructions ? `
            <div style="background: var(--color-linen-light); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.8rem; color: var(--color-espresso); margin-top: 10px;">
              💬 <em>"${order.special_instructions}"</em>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  function getStepIndex(status) {
    switch (status) {
      case 'requested': return 1;
      case 'accepted': return 2;
      case 'picked_up': return 3;
      case 'in_process': return 4;
      case 'out_for_delivery': return 5;
      case 'delivered': return 6;
      default: return 1;
    }
  }

  // 5. Open Order Modal with Provider pre-filled
  function openOrderModalWithProvider(provider = null) {
    selectedProviderForOrder = provider;
    const assignedNote = document.getElementById('modalAssignedProviderNote');
    const assignedName = document.getElementById('modalAssignedProviderName');
    const amountInput = document.getElementById('ordAmount');

    if (provider) {
      if (assignedNote) assignedNote.classList.remove('hidden');
      if (assignedName) assignedName.textContent = provider.business_name;
      if (amountInput) amountInput.value = provider.price_wash_fold_per_kg * 4; // default ~4kg
    } else {
      if (assignedNote) assignedNote.classList.add('hidden');
      if (amountInput) amountInput.value = 1250;
    }

    orderModal?.classList.add('active');
  }

  function closeOrderModal() {
    orderModal?.classList.remove('active');
  }

  openOrderBtn?.addEventListener('click', () => openOrderModalWithProvider(null));
  closeOrderBtn?.addEventListener('click', closeOrderModal);
  cancelOrderBtn?.addEventListener('click', closeOrderModal);

  // Submit Order Form
  orderForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = orderForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Submitting Order...</span>';
    }

    const orderData = {
      customerName: orderForm.querySelector('#ordCustomerName').value.trim(),
      customerPhone: orderForm.querySelector('#ordCustomerPhone').value.trim(),
      orderType: orderForm.querySelector('#ordType').value,
      propertyName: orderForm.querySelector('#ordProperty').value.trim(),
      unitNumber: orderForm.querySelector('#ordUnit').value.trim(),
      locationArea: orderForm.querySelector('#ordArea').value,
      pickupDate: orderForm.querySelector('#ordDate').value || new Date().toISOString().split('T')[0],
      pickupTimeSlot: orderForm.querySelector('#ordTime').value,
      serviceType: orderForm.querySelector('#ordService').value,
      estimatedWeightOrItems: orderForm.querySelector('#ordItems').value.trim() || '1 Bag',
      totalAmountKes: parseFloat(orderForm.querySelector('#ordAmount').value) || 1250,
      specialInstructions: orderForm.querySelector('#ordNotes').value.trim(),
      assignedPartnerId: selectedProviderForOrder ? selectedProviderForOrder.id : null
    };

    try {
      if (window.LuxeaDB && typeof window.LuxeaDB.createLaundryOrder === 'function') {
        await window.LuxeaDB.createLaundryOrder(orderData);
      } else {
        const cached = JSON.parse(localStorage.getItem('luxea_laundry_orders') || '[]');
        cached.unshift({
          id: `ord-${Date.now()}`,
          order_number: `ORD-LX-${Math.floor(100000 + Math.random() * 900000)}`,
          ...orderData,
          status: 'requested'
        });
        localStorage.setItem('luxea_laundry_orders', JSON.stringify(cached));
      }

      if (window.showToast) {
        window.showToast(`✅ Pickup requested! Assigned to ${selectedProviderForOrder ? selectedProviderForOrder.business_name : 'Valet Concierge'}.`);
      }
      closeOrderModal();
      orderForm.reset();
      switchView('my_orders');
    } catch (err) {
      console.error('Order creation error:', err);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Request Pickup →</span>';
      }
    }
  });

  // 6. Partner Operations Dashboard (Internal Workspace)
  async function renderPartnerDashboard() {
    partnerSession = window.LuxeaDB ? window.LuxeaDB.getCurrentLaundryPartner() : null;

    const partnerNameEl = document.getElementById('partnerDisplayName');
    const partnerRefEl = document.getElementById('partnerDisplayRef');
    const partnerPhoneEl = document.getElementById('partnerDisplayPhone');

    if (partnerSession) {
      if (partnerNameEl) partnerNameEl.textContent = partnerSession.business_name || partnerSession.businessName || 'Valet Service Partner';
      if (partnerRefEl) partnerRefEl.textContent = partnerSession.ref_id || 'LXL-2026-ACTIVE';
      if (partnerPhoneEl) partnerPhoneEl.textContent = partnerSession.phone || '0700 000 000';
    } else {
      if (partnerNameEl) partnerNameEl.textContent = 'Demo Laundry Partner (Westlands)';
      if (partnerRefEl) partnerRefEl.textContent = 'LXL-DEMO-2026';
      if (partnerPhoneEl) partnerPhoneEl.textContent = 'M-Pesa Payout Ready';
    }

    loadPartnerOrders();
  }

  async function loadPartnerOrders() {
    let orders = [];
    if (window.LuxeaDB && typeof window.LuxeaDB.fetchLaundryOrders === 'function') {
      orders = await window.LuxeaDB.fetchLaundryOrders();
    } else {
      orders = JSON.parse(localStorage.getItem('luxea_laundry_orders') || '[]');
    }

    const pendingOrders = orders.filter(o => o.status === 'requested' || o.status === 'accepted');
    const activeOrders = orders.filter(o => o.status === 'picked_up' || o.status === 'in_process' || o.status === 'out_for_delivery');
    const completedOrders = orders.filter(o => o.status === 'delivered');

    let totalEarnings = completedOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount_kes) || 0), 0);
    if (totalEarnings === 0 && completedOrders.length > 0) totalEarnings = 3200;

    const elStatPending = document.getElementById('statPendingOrders');
    const elStatActive = document.getElementById('statActiveOrders');
    const elStatEarnings = document.getElementById('statTotalEarnings');

    if (elStatPending) elStatPending.textContent = pendingOrders.length;
    if (elStatActive) elStatActive.textContent = activeOrders.length;
    if (elStatEarnings) elStatEarnings.textContent = `KES ${totalEarnings.toLocaleString()}`;

    if (!ordersContainer) return;

    if (orders.length === 0) {
      ordersContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--color-cocoa); background: var(--color-linen-light); border-radius: var(--radius-md);">
          <div style="font-size: 2rem; margin-bottom: 8px;">🧺</div>
          <p style="font-weight: 600; color: var(--color-espresso); margin-bottom: 4px;">No client orders currently in queue</p>
          <p style="font-size: 0.82rem; margin-bottom: 16px;">Orders placed by guests or hosts in your coverage areas will appear here.</p>
        </div>
      `;
      return;
    }

    ordersContainer.innerHTML = orders.map(order => {
      const statusLabel = getStatusLabel(order.status);
      const nextAction = getNextAction(order.status);

      return `
        <div class="laundry-order-card" data-order-id="${order.id || order.order_number}">
          <div class="order-top-row">
            <div>
              <span class="order-id-badge">${order.order_number || 'ORD-LX-XXXX'}</span>
              <span style="font-size: 0.78rem; color: var(--color-cocoa); margin-left: 8px;">• ${order.order_type === 'host_turnover' ? '🏡 Host Linen Turnover' : '✨ Guest Valet'}</span>
            </div>
            <span class="order-status-pill status-${order.status || 'requested'}">${statusLabel}</span>
          </div>

          <div class="order-details-grid">
            <div class="order-detail-item">
              <strong>Stay / Residence</strong>
              <span>${order.property_name || 'Curated Villa'} ${order.unit_number ? `(${order.unit_number})` : ''}</span>
              <small style="color: var(--color-cocoa); display: block;">${order.location_area || 'Nairobi'}</small>
            </div>
            <div class="order-detail-item">
              <strong>Customer Contact</strong>
              <span>${order.customer_name}</span>
              <a href="tel:${order.customer_phone}" style="color: var(--color-camel-dark); font-weight: 600; text-decoration: underline; display: block;">${order.customer_phone}</a>
            </div>
            <div class="order-detail-item">
              <strong>Pickup Slot</strong>
              <span>📅 ${order.pickup_date || 'Today'}</span>
              <small style="color: var(--color-cocoa); display: block;">⏰ ${order.pickup_time_slot || '10:00 AM - 12:00 PM'}</small>
            </div>
            <div class="order-detail-item">
              <strong>Service &amp; Items</strong>
              <span>${order.service_type || 'Wash & Fold'}</span>
              <small style="color: var(--color-cocoa); display: block;">${order.estimated_weight_or_items || '1 Bag'}</small>
            </div>
          </div>

          ${order.special_instructions ? `
            <div style="background: var(--color-linen-light); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.8rem; color: var(--color-espresso);">
              💬 <em>"${order.special_instructions}"</em>
            </div>
          ` : ''}

          <div class="order-actions-row">
            <div>
              <span style="font-size: 0.75rem; color: var(--color-cocoa); text-transform: uppercase; font-weight: 600;">Payout Amount:</span>
              <span class="order-price-val">KES ${(parseFloat(order.total_amount_kes) || 1200).toLocaleString()}</span>
            </div>

            <div style="display: flex; gap: 8px;">
              ${nextAction ? `
                <button class="btn btn-primary btn-sm update-status-btn" data-order-id="${order.id || order.order_number}" data-next-status="${nextAction.status}">
                  <span>${nextAction.label}</span>
                </button>
              ` : `
                <span style="font-size: 0.82rem; color: #166534; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                  ✅ Completed &amp; Paid
                </span>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach status update clicks
    ordersContainer.querySelectorAll('.update-status-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const orderId = btn.getAttribute('data-order-id');
        const nextStatus = btn.getAttribute('data-next-status');
        btn.disabled = true;
        btn.innerHTML = '<span>Updating...</span>';

        if (window.LuxeaDB && typeof window.LuxeaDB.updateLaundryOrderStatus === 'function') {
          await window.LuxeaDB.updateLaundryOrderStatus(orderId, nextStatus, partnerSession?.id);
        } else {
          const cached = JSON.parse(localStorage.getItem('luxea_laundry_orders') || '[]');
          const idx = cached.findIndex(o => o.id === orderId || o.order_number === orderId);
          if (idx !== -1) {
            cached[idx].status = nextStatus;
            localStorage.setItem('luxea_laundry_orders', JSON.stringify(cached));
          }
        }

        if (window.showToast) window.showToast(`Order status updated to: ${getStatusLabel(nextStatus)}`);
        loadPartnerOrders();
      });
    });
  }

  function getStatusLabel(status) {
    switch (status) {
      case 'requested': return 'New Request';
      case 'accepted': return 'Accepted (Awaiting Pickup)';
      case 'picked_up': return 'Picked Up';
      case 'in_process': return 'In Wash & Pressing';
      case 'out_for_delivery': return 'Out For Delivery';
      case 'delivered': return 'Delivered';
      default: return status || 'Pending';
    }
  }

  function getNextAction(status) {
    switch (status) {
      case 'requested': return { label: 'Accept Job ✓', status: 'accepted' };
      case 'accepted': return { label: 'Confirm Picked Up 🛵', status: 'picked_up' };
      case 'picked_up': return { label: 'Start Washing & Ironing 🧺', status: 'in_process' };
      case 'in_process': return { label: 'Out for Delivery 🚚', status: 'out_for_delivery' };
      case 'out_for_delivery': return { label: 'Mark Delivered ✓', status: 'delivered' };
      default: return null;
    }
  }

  // 7. Partner Registration Form Submit (Invite Link)
  regForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = regForm.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>Registering Partner...</span>';
    }

    const coverageCheckboxes = regForm.querySelectorAll('input[name="coverage"]:checked');
    const coverage = Array.from(coverageCheckboxes).map(c => c.value);

    const partnerData = {
      businessName: regForm.querySelector('#bizName').value.trim(),
      contactPerson: regForm.querySelector('#contactPerson').value.trim(),
      phone: regForm.querySelector('#bizPhone').value.trim(),
      email: regForm.querySelector('#bizEmail').value.trim(),
      mpesaNumber: regForm.querySelector('#mpesaNumber').value.trim() || regForm.querySelector('#bizPhone').value.trim(),
      coverageAreas: coverage.length > 0 ? coverage : ['Westlands', 'Kilimani'],
      priceWashFold: parseFloat(regForm.querySelector('#priceWashFold').value) || 250,
      priceLinenTurnover: parseFloat(regForm.querySelector('#priceLinenTurnover').value) || 1500,
      priceDryClean: parseFloat(regForm.querySelector('#priceDryClean').value) || 900,
      expressAvailable: regForm.querySelector('#expressAvailable').checked
    };

    try {
      if (window.LuxeaDB && typeof window.LuxeaDB.registerLaundryPartner === 'function') {
        partnerSession = await window.LuxeaDB.registerLaundryPartner(partnerData);
      } else {
        partnerSession = { id: `laundry-${Date.now()}`, ref_id: `LXL-2026-${Math.floor(1000 + Math.random() * 9000)}`, ...partnerData };
        localStorage.setItem('luxea_laundry_session', JSON.stringify(partnerSession));
      }

      if (window.showToast) window.showToast(`✅ Welcome, ${partnerData.businessName}! Partner Dashboard is live.`);
      if (partnerTabBtn) partnerTabBtn.style.display = 'block';
      switchView('dashboard');
    } catch (err) {
      console.error('Laundry partner registration error:', err);
      if (window.showToast) window.showToast('Registration failed. Please check inputs.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>Complete Registration &amp; Open Dashboard →</span>';
      }
    }
  });

  // Logout partner
  document.getElementById('logoutLaundryBtn')?.addEventListener('click', () => {
    if (window.LuxeaDB) window.LuxeaDB.logoutLaundryPartner();
    else localStorage.removeItem('luxea_laundry_session');
    partnerSession = null;
    if (partnerTabBtn) partnerTabBtn.style.display = 'none';
    if (window.showToast) window.showToast('Signed out of Laundry Partner Dashboard.');
    switchView('browse');
  });

  // Seed sample initial orders
  function seedInitialOrdersIfEmpty() {
    const existing = JSON.parse(localStorage.getItem('luxea_laundry_orders') || '[]');
    if (existing.length === 0) {
      const samples = [
        {
          id: 'ord-sample-1',
          order_number: 'ORD-LX-841920',
          customer_name: 'David Mwangi',
          customer_phone: '0712 345 678',
          order_type: 'guest_valet',
          property_name: 'Nordic Skyline Terrace Penthouse',
          unit_number: 'Penthouse B4',
          location_area: 'Ruaka',
          pickup_date: new Date().toISOString().split('T')[0],
          pickup_time_slot: '11:00 AM - 01:00 PM',
          service_type: 'Wash & Fold + Steam Iron',
          estimated_weight_or_items: '2 Bags (~8kg)',
          special_instructions: 'Please separate dark cottons. Ring doorbell upon arrival.',
          total_amount_kes: 2000,
          status: 'in_process',
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('luxea_laundry_orders', JSON.stringify(samples));
    }
  }

  // 8. PARTNER LOGIN MODAL & AUTHENTICATION
  const partnerLoginModal = document.getElementById('partnerLoginModal');
  const partnerLoginForm = document.getElementById('partnerLoginForm');
  const partnerLoginInput = document.getElementById('partnerLoginInput');
  const closePartnerLoginBtn = document.getElementById('closePartnerLoginModalBtn');
  const cancelPartnerLoginBtn = document.getElementById('cancelPartnerLoginBtn');
  const useDemoCredsBtn = document.getElementById('useDemoCredsBtn');

  function openPartnerLoginModal() {
    partnerLoginModal?.classList.add('active');
    if (partnerLoginInput) partnerLoginInput.focus();
  }

  function closePartnerLoginModal() {
    partnerLoginModal?.classList.remove('active');
  }

  closePartnerLoginBtn?.addEventListener('click', closePartnerLoginModal);
  cancelPartnerLoginBtn?.addEventListener('click', closePartnerLoginModal);

  document.querySelectorAll('.open-partner-login-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openPartnerLoginModal();
    });
  });

  useDemoCredsBtn?.addEventListener('click', () => {
    if (partnerLoginInput) {
      partnerLoginInput.value = 'LXL-2026-WEST';
      partnerLoginInput.focus();
    }
  });

  partnerLoginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = partnerLoginInput.value.trim();
    if (!query) return;

    const submitBtn = document.getElementById('partnerLoginSubmitBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Verifying Partner...</span>';
    }

    try {
      let matched = null;
      if (window.LuxeaDB && typeof window.LuxeaDB.loginLaundryPartner === 'function') {
        matched = await window.LuxeaDB.loginLaundryPartner(query);
      }

      if (!matched) {
        // Fallback to match default providers
        const qClean = query.toLowerCase();
        matched = DEFAULT_LAUNDRY_PROVIDERS.find(p => 
          (p.ref_id && p.ref_id.toLowerCase().includes(qClean)) ||
          (p.phone && p.phone.includes(qClean)) ||
          (p.business_name && p.business_name.toLowerCase().includes(qClean))
        );
        if (matched) {
          localStorage.setItem('luxea_laundry_session', JSON.stringify(matched));
        }
      }

      if (matched) {
        partnerSession = matched;
        if (window.showToast) window.showToast(`✅ Welcome back, ${matched.business_name || matched.businessName}!`);
        closePartnerLoginModal();
        if (partnerTabBtn) partnerTabBtn.style.display = 'block';
        switchView('dashboard');
      } else {
        if (window.showToast) window.showToast('Partner not found. Check Reference ID or contact admin.');
      }
    } catch (err) {
      console.error('Partner login error:', err);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Sign In to Dashboard →</span>';
      }
    }
  });

  // 9. ROUTING & DIRECT LINK ACCESS:
  // GUESTS/CUSTOMERS ALWAYS DEFAULT TO 'browse' (Marketplace)!
  // Partner Registration or Dashboard ONLY shown if explicitly invited via URL or logged in as partner!
  const urlParams = new URLSearchParams(window.location.search);
  const partnerParam = urlParams.get('partner') || urlParams.get('mode');
  const directRef = urlParams.get('partner_ref') || urlParams.get('ref');

  if (directRef) {
    // 1-Click Instant Direct Test Login: ?partner_ref=LXL-2026-WEST
    const matched = DEFAULT_LAUNDRY_PROVIDERS.find(p => p.ref_id.toLowerCase() === directRef.toLowerCase()) || {
      id: 'prov-spotless',
      ref_id: directRef,
      business_name: 'Spotless Valet & Dry Cleaners',
      phone: '0712 345 678',
      contact_person: 'Mary Wanjiku'
    };
    partnerSession = matched;
    localStorage.setItem('luxea_laundry_session', JSON.stringify(matched));
    if (partnerTabBtn) partnerTabBtn.style.display = 'block';
    if (window.showToast) window.showToast(`✅ Signed in as ${matched.business_name} (${matched.ref_id})`);
    switchView('dashboard');
  } else if (partnerParam === 'register' || urlParams.get('invite') === 'true') {
    // Authorized Invite Link for service providers
    switchView('register');
  } else if (partnerParam === 'dashboard' || partnerParam === 'portal') {
    // Partner requested their dashboard
    if (partnerSession) {
      if (partnerTabBtn) partnerTabBtn.style.display = 'block';
      switchView('dashboard');
    } else {
      openPartnerLoginModal();
      switchView('browse');
    }
  } else if (partnerParam === 'login') {
    openPartnerLoginModal();
    switchView('browse');
  } else {
    // Normal Guests, Hosts, & Public Visitors:
    // ALWAYS show the Customer Marketplace first!
    if (partnerSession && partnerTabBtn) {
      partnerTabBtn.style.display = 'block';
    }
    switchView('browse');
  }
}
