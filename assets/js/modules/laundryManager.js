/**
 * LUXEA LIVING — LAUNDRY PARTNER PORTAL & DASHBOARD (laundryManager.js)
 * Clean, mobile-first management for Laundry Service Providers in Kenya.
 */

export function initLaundryManager() {
  const regForm = document.getElementById('laundryRegisterForm');
  const dashboardView = document.getElementById('laundryDashboardView');
  const registerView = document.getElementById('laundryRegisterView');
  const navTabs = document.querySelectorAll('.laundry-mode-tab');
  const ordersContainer = document.getElementById('laundryOrdersContainer');
  const orderModal = document.getElementById('laundryOrderModal');
  const orderForm = document.getElementById('createLaundryOrderForm');
  const openOrderBtn = document.getElementById('openCreateOrderBtn');
  const closeOrderBtn = document.getElementById('closeOrderModalBtn');
  const cancelOrderBtn = document.getElementById('cancelOrderModalBtn');

  // Check if laundry partner session exists
  let partnerSession = window.LuxeaDB ? window.LuxeaDB.getCurrentLaundryPartner() : null;

  // Initial seed orders if none exist
  seedInitialOrdersIfEmpty();

  // Mode switching
  function switchView(mode) {
    navTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-mode') === mode));
    if (mode === 'dashboard') {
      registerView?.classList.add('hidden');
      dashboardView?.classList.remove('hidden');
      renderDashboard();
    } else {
      dashboardView?.classList.add('hidden');
      registerView?.classList.remove('hidden');
    }
  }

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchView(tab.getAttribute('data-mode'));
    });
  });

  // 1. Partner Registration Form Submit
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
        partnerSession = partnerData;
        localStorage.setItem('luxea_laundry_session', JSON.stringify(partnerData));
      }

      if (window.showToast) window.showToast(`✅ Welcome, ${partnerData.businessName}! Partner Dashboard is live.`);
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

  // 2. Render Partner Dashboard
  async function renderDashboard() {
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

    loadOrders();
  }

  // Load and display orders
  async function loadOrders() {
    let orders = [];
    if (window.LuxeaDB && typeof window.LuxeaDB.fetchLaundryOrders === 'function') {
      orders = await window.LuxeaDB.fetchLaundryOrders();
    } else {
      orders = JSON.parse(localStorage.getItem('luxea_laundry_orders') || '[]');
    }

    // Update summary metrics
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

    // Render list
    if (!ordersContainer) return;

    if (orders.length === 0) {
      ordersContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--color-cocoa); background: var(--color-linen-light); border-radius: var(--radius-md);">
          <div style="font-size: 2rem; margin-bottom: 8px;">🧺</div>
          <p style="font-weight: 600; color: var(--color-espresso); margin-bottom: 4px;">No laundry orders yet</p>
          <p style="font-size: 0.82rem; margin-bottom: 16px;">New orders placed by guests or hosts in your coverage areas will appear here.</p>
          <button class="btn btn-outline btn-sm" id="emptySeedOrderBtn">Create Sample Test Order</button>
        </div>
      `;
      ordersContainer.querySelector('#emptySeedOrderBtn')?.addEventListener('click', () => {
        openOrderModal();
      });
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
              <span>${order.property_name || 'Curated Villa'} ${order.unit_number ? `(Unit ${order.unit_number})` : ''}</span>
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

    // Bind action buttons
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

        if (window.showToast) window.showToast(`Status updated to: ${getStatusLabel(nextStatus)}`);
        loadOrders();
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

  // 3. New Order Placement (Guest/Host simulation modal)
  function openOrderModal() {
    orderModal?.classList.add('active');
  }

  function closeOrderModal() {
    orderModal?.classList.remove('active');
  }

  openOrderBtn?.addEventListener('click', openOrderModal);
  closeOrderBtn?.addEventListener('click', closeOrderModal);
  cancelOrderBtn?.addEventListener('click', closeOrderModal);

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
      specialInstructions: orderForm.querySelector('#ordNotes').value.trim()
    };

    try {
      if (window.LuxeaDB && typeof window.LuxeaDB.createLaundryOrder === 'function') {
        await window.LuxeaDB.createLaundryOrder(orderData);
      } else {
        const cached = JSON.parse(localStorage.getItem('luxea_laundry_orders') || '[]');
        cached.unshift({ id: `ord-${Date.now()}`, order_number: `ORD-LX-${Math.floor(100000 + Math.random() * 900000)}`, ...orderData, status: 'requested' });
        localStorage.setItem('luxea_laundry_orders', JSON.stringify(cached));
      }

      if (window.showToast) window.showToast('✅ Laundry order submitted! Alert sent to local partner.');
      closeOrderModal();
      orderForm.reset();
      loadOrders();
    } catch (err) {
      console.error('Order creation error:', err);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Request Pickup →</span>';
      }
    }
  });

  // Seed sample orders if none exist
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
          status: 'requested',
          created_at: new Date().toISOString()
        },
        {
          id: 'ord-sample-2',
          order_number: 'ORD-LX-592014',
          customer_name: 'Gabriel Kamau (Host)',
          customer_phone: '0722 889 900',
          order_type: 'host_turnover',
          property_name: 'Ruby Apartments',
          unit_number: 'Apt 302',
          location_area: 'Roysambu',
          pickup_date: new Date().toISOString().split('T')[0],
          pickup_time_slot: '10:00 AM - 12:00 PM',
          service_type: 'Host Linen Turnover Set',
          estimated_weight_or_items: '3 Bed Sets + 6 Bath Towels',
          special_instructions: 'Urgent turnaround before 3:00 PM check-in.',
          total_amount_kes: 3500,
          status: 'picked_up',
          created_at: new Date(Date.now() - 3600000).toISOString()
        }
      ];
      localStorage.setItem('luxea_laundry_orders', JSON.stringify(samples));
    }
  }

  // Logout partner button
  document.getElementById('logoutLaundryBtn')?.addEventListener('click', () => {
    if (window.LuxeaDB) window.LuxeaDB.logoutLaundryPartner();
    else localStorage.removeItem('luxea_laundry_session');
    if (window.showToast) window.showToast('Signed out of Laundry Dashboard.');
    switchView('register');
  });

  // Default view: if partner is already logged in, show dashboard; else show dashboard with sample data or registration
  if (partnerSession) {
    switchView('dashboard');
  } else {
    // Check URL parameters (e.g. ?view=register or ?view=dashboard)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tab') === 'register') {
      switchView('register');
    } else {
      switchView('dashboard');
    }
  }
}
