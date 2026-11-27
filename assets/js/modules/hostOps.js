/**
 * LUXEA LIVING — HOST OPERATIONS SUITE (hostOps.js)
 * 1. Interactive Monthly Calendar (Auto-blocks booked/pending dates)
 * 2. Bookings & Manual Client/Payment Ledger (M-Pesa, Cash, Bank, Balance tracking)
 * 3. Today's Check-in / Check-out & Auto-Laundry Turnover Dispatch
 * 4. One-Click Phone / Google Calendar (.ics), Excel/Sheets CSV & JSON Backups
 */

const CACHE_KEY = 'luxea_host_bookings_cache';

function esc(v) {
  if (window.LuxeaSanitize) return window.LuxeaSanitize.escapeHtml(v);
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtKes(amount) {
  if (window.LuxeaCurrency && typeof window.LuxeaCurrency.formatFromKes === 'function') {
    return window.LuxeaCurrency.formatFromKes(amount);
  }
  return `KSh ${Math.round(Number(amount) || 0).toLocaleString()}`;
}

function isoDate(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function downloadTextFile(filename, content, mime = 'text/plain;charset=utf-8;') {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function buildIcsEvents(bookings) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Luxea Living//Host Calendar//EN',
    'CALSCALE:GREGORIAN'
  ];

  bookings.forEach((b) => {
    if (b.status === 'cancelled') return;
    const ci = String(b.check_in || '').replace(/-/g, '');
    const co = String(b.check_out || '').replace(/-/g, '');
    if (ci.length !== 8 || co.length !== 8) return;

    // Check-in event
    lines.push(
      'BEGIN:VEVENT',
      `UID:checkin-${b.id || b.booking_code}@luxealiving.co.ke`,
      `DTSTART:${ci}T140000`,
      `DTEND:${ci}T150000`,
      `SUMMARY:Check-In: ${b.guest_name} (${b.property_name})`,
      `DESCRIPTION:Code: ${b.booking_code || ''} | Phone: ${b.guest_phone || 'N/A'} | Total: KSh ${b.total_kes} | Paid: KSh ${b.amount_paid_kes}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT2H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Guest checking in soon',
      'END:VALARM',
      'END:VEVENT'
    );

    // Check-out + Laundry Turnover reminder
    lines.push(
      'BEGIN:VEVENT',
      `UID:checkout-${b.id || b.booking_code}@luxealiving.co.ke`,
      `DTSTART:${co}T100000`,
      `DTEND:${co}T120000`,
      `SUMMARY:Check-Out${b.auto_laundry ? ' + Laundry' : ''}: ${b.guest_name} (${b.property_name})`,
      `DESCRIPTION:Checkout 10:00 AM. ${b.auto_laundry ? 'Linen laundry turnover scheduled.' : 'Remember room cleaning & linen change.'}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT12H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Guest checkout & cleaning tomorrow morning',
      'END:VALARM',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function initHostOps() {
  const tabsBar = document.getElementById('hostOpsTabsBar');
  const staysWrap = document.getElementById('hostManagerContainer');
  const opsContainer = document.getElementById('hostOpsContainer');
  if (!tabsBar || !opsContainer) return;

  let activeTab = 'stays'; // 'stays' | 'calendar' | 'bookings' | 'backup'
  let myProperties = [];
  let bookings = [];
  let calDate = new Date();
  let selectedPropFilter = 'all';

  async function loadOpsData() {
    // Load cached offline copy first for instant display
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
      if (Array.isArray(cached) && cached.length && bookings.length === 0) bookings = cached;
    } catch (e) {}

    if (window.LuxeaDB) {
      const [props, bks] = await Promise.all([
        window.LuxeaDB.fetchProperties(),
        window.LuxeaDB.fetchBookings({ limit: 250 })
      ]);
      const userSession = JSON.parse(localStorage.getItem('luxea_user_session') || 'null');
      const isSuperAdmin = userSession && userSession.isSuperAdmin;

      if (Array.isArray(props)) {
        if (userSession?.refId && !isSuperAdmin) {
          const mine = props.filter(p => p.host_ref_id === userSession.refId || p.owner_id === userSession.id);
          myProperties = mine.length ? mine : props;
        } else {
          myProperties = props;
        }
      }

      if (Array.isArray(bks)) {
        bookings = bks;
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(bks.slice(0, 120))); } catch (e) {}
      }
    }

    updateBadges();
    if (activeTab !== 'stays') renderActiveOpsTab();
  }

  function updateBadges() {
    const pendingCnt = bookings.filter(b => b.status === 'pending').length;
    const badge = document.getElementById('hostBookingsBadge');
    if (badge) badge.textContent = pendingCnt > 0 ? `${pendingCnt} new` : bookings.length;
  }

  function switchOpsTab(tab) {
    activeTab = tab;
    tabsBar.querySelectorAll('.host-ops-tab').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    });
    if (tab === 'stays') {
      staysWrap?.classList.remove('hidden');
      opsContainer.classList.add('hidden');
    } else {
      staysWrap?.classList.add('hidden');
      opsContainer.classList.remove('hidden');
      renderActiveOpsTab();
    }
  }

  tabsBar.querySelectorAll('.host-ops-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      switchOpsTab(btn.getAttribute('data-tab'));
    });
  });

  function renderActiveOpsTab(prefillDate = null, prefillPropId = null) {
    if (activeTab === 'calendar') renderCalendarTab();
    else if (activeTab === 'bookings') renderBookingsTab(prefillDate, prefillPropId);
    else if (activeTab === 'backup') renderBackupTab();
  }

  // =========================================================================
  // TAB 2: INTERACTIVE MONTHLY CALENDAR
  // =========================================================================
  function renderCalendarTab() {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    const monthLabel = calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const firstDayIdx = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = isoDate(new Date());

    const visibleBookings = bookings.filter(b =>
      b.status !== 'cancelled' &&
      (selectedPropFilter === 'all' || String(b.property_id) === String(selectedPropFilter))
    );

    const dayCells = [];
    for (let i = 0; i < firstDayIdx; i++) {
      dayCells.push(`<div class="cal-day empty"></div>`);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const activeOnDay = visibleBookings.filter(b => dateStr >= b.check_in && dateStr < b.check_out);
      const checkingOut = visibleBookings.filter(b => dateStr === b.check_out);

      let cls = 'avail';
      if (activeOnDay.some(b => b.status === 'confirmed' || b.status === 'checked_in')) cls = 'booked';
      else if (activeOnDay.some(b => b.status === 'pending')) cls = 'pending';
      if (dateStr === todayStr) cls += ' today';

      const tagsHtml = activeOnDay.slice(0, 2).map(b => {
        const first = (b.guest_name || 'Guest').split(' ')[0];
        return `<span class="cal-tag ${b.status === 'pending' ? 'pending' : ''}" title="${esc(`${b.guest_name} • ${b.property_name}`)}">${esc(first)}</span>`;
      }).join('');

      const laundryIcon = checkingOut.length > 0 ? `<span title="${checkingOut.length} check-out(s) today">🧺</span>` : '';

      dayCells.push(`
        <div class="cal-day ${cls}" data-date="${dateStr}">
          <div class="cal-day-num">
            <span>${d}</span>
            ${laundryIcon}
          </div>
          ${tagsHtml}
        </div>
      `);
    }

    opsContainer.innerHTML = `
      <div class="host-ops-card">
        <div class="host-ops-head">
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <h3>📅 ${esc(monthLabel)}</h3>
            <button type="button" class="ops-mini-btn" id="calPrevBtn">← Prev</button>
            <button type="button" class="ops-mini-btn" id="calTodayBtn">Today</button>
            <button type="button" class="ops-mini-btn" id="calNextBtn">Next →</button>
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <select id="calPropFilter" class="form-control" style="width:auto; min-width:170px; height:36px; padding:4px 10px; font-size:0.8rem;">
              <option value="all">All Properties (${myProperties.length})</option>
              ${myProperties.map(p => `<option value="${esc(p.id)}" ${String(selectedPropFilter) === String(p.id) ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
            </select>
            <button type="button" class="btn btn-primary btn-sm" id="calQuickAddBtn">+ Add Client</button>
          </div>
        </div>

        <div class="cal-weekdays">
          <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
        </div>
        <div class="cal-grid">${dayCells.join('')}</div>

        <div class="cal-legend">
          <span><span class="cal-dot" style="background:#BBF7D0;"></span>Available</span>
          <span><span class="cal-dot" style="background:#D4AF37;"></span>Booked</span>
          <span><span class="cal-dot" style="background:#F59E0B;"></span>Pending Request</span>
          <span>🧺 Checkout / Laundry Day</span>
          <span style="color:#8C6436;">Tip: Click any open date to book a client</span>
        </div>
      </div>
    `;

    opsContainer.querySelector('#calPrevBtn')?.addEventListener('click', () => {
      calDate = new Date(year, month - 1, 1);
      renderCalendarTab();
    });
    opsContainer.querySelector('#calTodayBtn')?.addEventListener('click', () => {
      calDate = new Date();
      renderCalendarTab();
    });
    opsContainer.querySelector('#calNextBtn')?.addEventListener('click', () => {
      calDate = new Date(year, month + 1, 1);
      renderCalendarTab();
    });
    opsContainer.querySelector('#calPropFilter')?.addEventListener('change', (e) => {
      selectedPropFilter = e.target.value;
      renderCalendarTab();
    });
    opsContainer.querySelector('#calQuickAddBtn')?.addEventListener('click', () => {
      switchOpsTab('bookings');
    });

    opsContainer.querySelectorAll('.cal-day[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        const dt = cell.getAttribute('data-date');
        activeTab = 'bookings';
        tabsBar.querySelectorAll('.host-ops-tab').forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === 'bookings'));
        renderBookingsTab(dt, selectedPropFilter !== 'all' ? selectedPropFilter : null);
      });
    });
  }

  // =========================================================================
  // TAB 3: BOOKINGS, MANUAL CLIENT LEDGER & AUTO-LAUNDRY DISPATCH
  // =========================================================================
  function renderBookingsTab(prefillDate = null, prefillPropId = null) {
    const todayStr = isoDate(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultIn = prefillDate || todayStr;
    const defaultOutObj = new Date(defaultIn);
    defaultOutObj.setDate(defaultOutObj.getDate() + 2);
    const defaultOut = isoDate(defaultOutObj);

    const checkInsToday = bookings.filter(b => b.check_in === todayStr && b.status !== 'cancelled');
    const checkOutsToday = bookings.filter(b => b.check_out === todayStr && b.status !== 'cancelled');
    const pendingList = bookings.filter(b => b.status === 'pending');
    const unpaidTotal = bookings
      .filter(b => b.status !== 'cancelled')
      .reduce((sum, b) => sum + Math.max(0, (Number(b.total_kes) || 0) - (Number(b.amount_paid_kes) || 0)), 0);

    opsContainer.innerHTML = `
      <!-- Today & Money KPIs -->
      <div class="host-ops-grid-4">
        <div class="host-kpi-box">
          <div class="host-kpi-label">Check-ins Today</div>
          <div class="host-kpi-val">${checkInsToday.length}</div>
        </div>
        <div class="host-kpi-box">
          <div class="host-kpi-label" style="color:#B45309;">Check-outs Today</div>
          <div class="host-kpi-val" style="color:#B45309;">${checkOutsToday.length}</div>
        </div>
        <div class="host-kpi-box">
          <div class="host-kpi-label" style="color:#1D4ED8;">Pending Requests</div>
          <div class="host-kpi-val" style="color:#1D4ED8;">${pendingList.length}</div>
        </div>
        <div class="host-kpi-box">
          <div class="host-kpi-label" style="color:#B91C1C;">Unpaid Balance</div>
          <div class="host-kpi-val" style="color:#B91C1C;">${esc(fmtKes(unpaidTotal))}</div>
        </div>
      </div>

      ${checkOutsToday.length > 0 ? `
        <div class="host-ops-card" style="border-left: 4px solid #D97706; background: #FFFBEB;">
          <div class="host-ops-head" style="margin-bottom: 10px; padding-bottom: 8px;">
            <h3>🔔 Today's Check-outs &amp; Cleaning (10:00 AM)</h3>
          </div>
          ${checkOutsToday.map(b => `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; padding:6px 0;">
              <div><strong>${esc(b.guest_name)}</strong> · ${esc(b.property_name)}</div>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button type="button" class="ops-mini-btn ok quick-laundry-btn" data-id="${esc(b.id)}">🧺 Book Laundry</button>
                <button type="button" class="ops-mini-btn wa quick-wa-checkout" data-id="${esc(b.id)}">💬 Checkout Msg</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Add Manual / Walk-In / WhatsApp Client -->
      <div class="host-ops-card">
        <div class="host-ops-head">
          <h3>+ Add Client Booking &amp; Payment</h3>
          <span style="font-size:0.76rem; color:#604D42;">Auto-blocks dates on your calendar</span>
        </div>

        <form id="manualBookingForm">
          <div class="host-form-grid">
            <div>
              <label style="display:block; font-size:0.76rem; font-weight:700; margin-bottom:4px;">Property *</label>
              <select id="mbProp" class="form-control" required>
                ${myProperties.map(p => `<option value="${esc(p.id)}" data-rate="${Number(p.price_per_night_kes) || 12000}" data-name="${esc(p.name)}" data-area="${esc(p.area || p.city || 'Nairobi')}" ${String(prefillPropId) === String(p.id) ? 'selected' : ''}>${esc(p.name)} (${fmtKes(p.price_per_night_kes || 12000)}/nt)</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="display:block; font-size:0.76rem; font-weight:700; margin-bottom:4px;">Client Name *</label>
              <input type="text" id="mbGuestName" class="form-control" placeholder="e.g. Brian Kamau" required>
            </div>
            <div>
              <label style="display:block; font-size:0.76rem; font-weight:700; margin-bottom:4px;">Phone</label>
              <input type="text" id="mbGuestPhone" class="form-control" placeholder="0712 345 678">
            </div>
          </div>

          <div class="host-form-grid">
            <div>
              <label style="display:block; font-size:0.76rem; font-weight:700; margin-bottom:4px;">Check-in *</label>
              <input type="date" id="mbCheckIn" class="form-control" value="${defaultIn}" required>
            </div>
            <div>
              <label style="display:block; font-size:0.76rem; font-weight:700; margin-bottom:4px;">Check-out *</label>
              <input type="date" id="mbCheckOut" class="form-control" value="${defaultOut}" required>
            </div>
            <div>
              <label style="display:block; font-size:0.76rem; font-weight:700; margin-bottom:4px;">Booking Source</label>
              <select id="mbSource" class="form-control">
                <option value="manual">Walk-in / Direct</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="airbnb">Airbnb</option>
                <option value="booking_com">Booking.com</option>
                <option value="luxea">Luxea</option>
              </select>
            </div>
          </div>

          <div class="host-form-grid">
            <div>
              <label style="display:block; font-size:0.76rem; font-weight:700; margin-bottom:4px;">Total (KSh) *</label>
              <input type="number" id="mbTotalKes" class="form-control" min="0" required>
            </div>
            <div>
              <label style="display:block; font-size:0.76rem; font-weight:700; margin-bottom:4px;">Paid Now (KSh)</label>
              <input type="number" id="mbPaidKes" class="form-control" min="0" value="0">
            </div>
            <div>
              <label style="display:block; font-size:0.76rem; font-weight:700; margin-bottom:4px;">M-Pesa / Payment Ref</label>
              <input type="text" id="mbMpesaCode" class="form-control" placeholder="e.g. SLK94X2M1P">
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-top:8px;">
            <label style="display:inline-flex; align-items:center; gap:8px; font-size:0.82rem; font-weight:600; cursor:pointer;">
              <input type="checkbox" id="mbAutoLaundry" checked style="width:16px; height:16px;">
              <span>🧺 Auto-schedule Linen Laundry on Checkout Day</span>
            </label>
            <button type="submit" class="btn btn-primary btn-sm" id="mbSaveBtn">Save Booking &amp; Lock Dates</button>
          </div>
        </form>
      </div>

      <!-- Bookings & Client Payments Ledger -->
      <div class="host-ops-card">
        <div class="host-ops-head">
          <h3>Bookings &amp; Payment Records (${bookings.length})</h3>
          <button type="button" class="ops-mini-btn" id="btnExportAllIcs">📅 Sync Calendar (.ics)</button>
        </div>

        <div class="host-ledger-wrap">
          <table class="host-ledger-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Stay &amp; Dates</th>
                <th>Total / Paid</th>
                <th>Status</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody id="hostBookingsTbody">
              ${bookings.length === 0 ? `
                <tr><td colspan="5" style="text-align:center; padding:28px; color:#604D42;">No bookings recorded yet. Add your first client above!</td></tr>
              ` : bookings.map(b => {
                const total = Number(b.total_kes) || 0;
                const paid = Number(b.amount_paid_kes) || 0;
                const bal = Math.max(0, total - paid);
                const payChip = b.payment_status === 'paid' ? 'green' : b.payment_status === 'deposit' ? 'amber' : 'red';
                const stChip = b.status === 'confirmed' || b.status === 'checked_in' ? 'green' : b.status === 'pending' ? 'amber' : 'gray';
                return `
                  <tr>
                    <td>
                      <div style="font-weight:700; color:#241812;">${esc(b.guest_name)}</div>
                      <div style="font-size:0.7rem; color:#604D42;">${esc(b.guest_phone || '—')} · ${esc(b.source || 'manual')}</div>
                    </td>
                    <td>
                      <div style="font-weight:600;">${esc(b.property_name)}</div>
                      <div style="font-size:0.7rem; color:#604D42;">${esc(b.check_in)} → ${esc(b.check_out)} (${b.nights || 1} nt)</div>
                    </td>
                    <td>
                      <div style="font-weight:700;">${esc(fmtKes(total))}</div>
                      <div style="font-size:0.7rem;">
                        <span class="ops-chip ${payChip}">${esc(b.payment_status || 'unpaid')}</span>
                        ${bal > 0 ? `<span style="color:#B91C1C; font-weight:700;"> Bal: ${esc(fmtKes(bal))}</span>` : ''}
                        ${b.mpesa_code ? `<code style="font-size:0.65rem; margin-left:4px;">${esc(b.mpesa_code)}</code>` : ''}
                      </div>
                    </td>
                    <td>
                      <span class="ops-chip ${stChip}">${esc(b.status)}</span>
                    </td>
                    <td style="text-align:right; white-space:nowrap;">
                      <div style="display:inline-flex; gap:4px; flex-wrap:nowrap;">
                        ${b.status === 'pending' ? `<button type="button" class="ops-mini-btn ok row-confirm-btn" data-id="${esc(b.id)}">Confirm</button>` : ''}
                        ${bal > 0 && b.status !== 'cancelled' ? `<button type="button" class="ops-mini-btn row-pay-btn" data-id="${esc(b.id)}">+ Pay</button>` : ''}
                        <button type="button" class="ops-mini-btn wa row-wa-btn" data-id="${esc(b.id)}" title="WhatsApp Receipt / Reminder">💬</button>
                        <button type="button" class="ops-mini-btn row-ics-btn" data-id="${esc(b.id)}" title="Add reminder to phone calendar">📅</button>
                        <button type="button" class="ops-mini-btn row-laundry-btn" data-id="${esc(b.id)}" title="Book linen laundry for checkout">🧺</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Auto-calc Total KSh when dates or property change
    const selProp = opsContainer.querySelector('#mbProp');
    const inEl = opsContainer.querySelector('#mbCheckIn');
    const outEl = opsContainer.querySelector('#mbCheckOut');
    const totEl = opsContainer.querySelector('#mbTotalKes');

    function recalcTotal() {
      const opt = selProp?.options[selProp.selectedIndex];
      const rate = parseFloat(opt?.getAttribute('data-rate') || '12000');
      const d1 = new Date(inEl.value);
      const d2 = new Date(outEl.value);
      const nights = Math.max(1, Math.round((d2 - d1) / 86400000) || 1);
      if (totEl) totEl.value = Math.round(nights * rate);
    }
    recalcTotal();
    selProp?.addEventListener('change', recalcTotal);
    inEl?.addEventListener('change', recalcTotal);
    outEl?.addEventListener('change', recalcTotal);

    // Save Manual Client Booking
    opsContainer.querySelector('#manualBookingForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = opsContainer.querySelector('#mbSaveBtn');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      const opt = selProp?.options[selProp.selectedIndex];
      const propId = selProp?.value || null;
      const propName = opt?.getAttribute('data-name') || 'Luxea Stay';
      const propArea = opt?.getAttribute('data-area') || 'Nairobi';
      const autoLaundry = opsContainer.querySelector('#mbAutoLaundry')?.checked ?? false;
      const checkIn = inEl.value;
      const checkOut = outEl.value;

      const userSession = JSON.parse(localStorage.getItem('luxea_user_session') || 'null');
      const res = await window.LuxeaDB.createBooking({
        property_id: propId,
        property_name: propName,
        host_ref_id: userSession?.refId || null,
        guest_name: opsContainer.querySelector('#mbGuestName').value.trim(),
        guest_phone: opsContainer.querySelector('#mbGuestPhone').value.trim(),
        check_in: checkIn,
        check_out: checkOut,
        source: opsContainer.querySelector('#mbSource').value,
        total_kes: parseFloat(totEl.value) || 0,
        amount_paid_kes: parseFloat(opsContainer.querySelector('#mbPaidKes').value) || 0,
        mpesa_code: opsContainer.querySelector('#mbMpesaCode').value.trim(),
        status: 'confirmed',
        auto_laundry: autoLaundry
      });

      if (res.success) {
        if (autoLaundry && window.LuxeaDB.createLaundryOrder) {
          await window.LuxeaDB.createLaundryOrder({
            customerName: userSession?.name || 'Host Turnover',
            customerPhone: userSession?.phone || opsContainer.querySelector('#mbGuestPhone').value.trim() || '0700000000',
            orderType: 'host_turnover',
            propertyName: propName,
            locationArea: propArea,
            pickupDate: checkOut,
            pickupTimeSlot: '10:00 AM - 12:00 PM',
            serviceType: 'Host Linen Turnover Set',
            estimatedWeight: 'Full Turnover Linen',
            totalAmountKes: 1500
          });
        }
        if (window.showToast) window.showToast(autoLaundry ? '✅ Booking saved, dates locked & checkout laundry scheduled!' : '✅ Booking saved & dates locked!');
        await loadOpsData();
      } else {
        if (window.showToast) window.showToast('Error: ' + (res.error || 'Could not save'));
        btn.disabled = false;
        btn.textContent = 'Save Booking & Lock Dates';
      }
    });

    // Row & Reminder Actions
    const findB = (id) => bookings.find(x => String(x.id) === String(id));

    opsContainer.querySelectorAll('.row-confirm-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const res = await window.LuxeaDB.updateBooking(btn.getAttribute('data-id'), { status: 'confirmed' });
        if (res.success) {
          if (window.showToast) window.showToast('✅ Booking confirmed & dates locked.');
          await loadOpsData();
        }
      });
    });

    opsContainer.querySelectorAll('.row-pay-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const b = findB(btn.getAttribute('data-id'));
        if (!b) return;
        const bal = Math.max(0, (Number(b.total_kes) || 0) - (Number(b.amount_paid_kes) || 0));
        const addStr = prompt(`Record payment for ${b.guest_name} (Balance: KSh ${bal.toLocaleString()}):`, String(bal));
        if (!addStr) return;
        const added = parseFloat(addStr);
        if (isNaN(added) || added <= 0) return;
        const code = prompt('M-Pesa / Receipt Code (optional):', b.mpesa_code || '') || b.mpesa_code || '';
        const newPaid = (Number(b.amount_paid_kes) || 0) + added;
        const res = await window.LuxeaDB.updateBooking(b.id, { amount_paid_kes: newPaid, mpesa_code: code });
        if (res.success) {
          if (window.showToast) window.showToast(`✅ Payment of KSh ${added.toLocaleString()} recorded.`);
          await loadOpsData();
        }
      });
    });

    opsContainer.querySelectorAll('.row-wa-btn, .quick-wa-checkout').forEach(btn => {
      btn.addEventListener('click', () => {
        const b = findB(btn.getAttribute('data-id'));
        if (!b) return;
        const digits = (b.guest_phone || '').replace(/[^0-9]/g, '');
        if (!digits) {
          if (window.showToast) window.showToast('No phone number saved for this client.');
          return;
        }
        const waNum = digits.startsWith('0') ? '254' + digits.slice(1) : digits.startsWith('254') ? digits : '254' + digits;
        const bal = Math.max(0, (Number(b.total_kes) || 0) - (Number(b.amount_paid_kes) || 0));
        const isCheckout = btn.classList.contains('quick-wa-checkout');
        const msg = isCheckout
          ? `Hello ${b.guest_name}, friendly reminder that check-out at ${b.property_name} is today at 10:00 AM. Thank you for staying with us!`
          : `Hello ${b.guest_name}, booking receipt for ${b.property_name} (${b.check_in} to ${b.check_out}). Total: KSh ${Number(b.total_kes).toLocaleString()} | Paid: KSh ${Number(b.amount_paid_kes).toLocaleString()} | Balance: KSh ${bal.toLocaleString()}${b.mpesa_code ? ` | Ref: ${b.mpesa_code}` : ''}.`;
        window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
      });
    });

    opsContainer.querySelectorAll('.row-ics-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const b = findB(btn.getAttribute('data-id'));
        if (!b) return;
        downloadTextFile(`luxea-${b.booking_code || 'booking'}.ics`, buildIcsEvents([b]), 'text/calendar;charset=utf-8;');
        if (window.showToast) window.showToast('📅 Reminder file downloaded — open to add to Google / Phone Calendar.');
      });
    });

    opsContainer.querySelectorAll('.row-laundry-btn, .quick-laundry-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const b = findB(btn.getAttribute('data-id'));
        if (!b || !window.LuxeaDB.createLaundryOrder) return;
        if (!confirm(`Schedule linen laundry turnover for ${b.property_name} on ${b.check_out} (10:00 AM)?`)) return;
        const userSession = JSON.parse(localStorage.getItem('luxea_user_session') || 'null');
        await window.LuxeaDB.createLaundryOrder({
          customerName: userSession?.name || 'Host Turnover',
          customerPhone: userSession?.phone || b.guest_phone || '0700000000',
          orderType: 'host_turnover',
          propertyName: b.property_name,
          locationArea: 'Nairobi',
          pickupDate: b.check_out,
          pickupTimeSlot: '10:00 AM - 12:00 PM',
          serviceType: 'Host Linen Turnover Set',
          estimatedWeight: 'Full Turnover Linen',
          totalAmountKes: 1500
        });
        await window.LuxeaDB.updateBooking(b.id, { auto_laundry: true });
        if (window.showToast) window.showToast('🧺 Laundry turnover dispatched for checkout day!');
        await loadOpsData();
      });
    });

    opsContainer.querySelector('#btnExportAllIcs')?.addEventListener('click', () => {
      downloadTextFile('luxea-host-calendar.ics', buildIcsEvents(bookings), 'text/calendar;charset=utf-8;');
      if (window.showToast) window.showToast('📅 All upcoming check-ins & check-outs exported (.ics).');
    });
  }

  // =========================================================================
  // TAB 4: BACKUP & PERSONAL STORAGE EXPORT (Phone / Google Drive / Sheets)
  // =========================================================================
  function renderBackupTab() {
    const totalRev = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + (Number(b.amount_paid_kes) || 0), 0);

    opsContainer.innerHTML = `
      <div class="host-ops-card">
        <div class="host-ops-head">
          <h3>💾 Backup &amp; Phone Storage</h3>
          <span style="font-size:0.78rem; color:#604D42;">${bookings.length} records · ${esc(fmtKes(totalRev))} collected</span>
        </div>

        <div class="backup-cards-grid">
          <div class="backup-tile">
            <strong>📊 Excel / Google Sheets (CSV)</strong>
            <p style="font-size:0.78rem; color:#604D42; margin:0;">Download all client bookings, dates, KSh totals, balances, and M-Pesa codes. Upload straight to your Google Drive.</p>
            <button type="button" class="btn btn-primary btn-sm" id="expCsvBtn" style="margin-top:auto;">Download CSV</button>
          </div>

          <div class="backup-tile">
            <strong>📅 Phone / Google Calendar (.ics)</strong>
            <p style="font-size:0.78rem; color:#604D42; margin:0;">Import all check-ins, 10 AM check-outs, and laundry reminders so your phone alerts you automatically.</p>
            <button type="button" class="btn btn-secondary btn-sm" id="expIcsBtn" style="margin-top:auto;">Download Calendar (.ics)</button>
          </div>

          <div class="backup-tile">
            <strong>🔐 Full Offline Backup (JSON)</strong>
            <p style="font-size:0.78rem; color:#604D42; margin:0;">Save a complete backup file of your properties and bookings directly to your phone or Google Drive.</p>
            <button type="button" class="btn btn-outline btn-sm" id="expJsonBtn" style="margin-top:auto;">Download JSON Backup</button>
          </div>
        </div>
      </div>
    `;

    opsContainer.querySelector('#expCsvBtn')?.addEventListener('click', () => {
      const safeCell = (v) => {
        let s = String(v ?? '').replace(/\r?\n/g, ' ');
        if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
        return `"${s.replace(/"/g, '""')}"`;
      };
      const headers = ['Code', 'Property', 'Client', 'Phone', 'Check-In', 'Check-Out', 'Nights', 'Total KSh', 'Paid KSh', 'Balance KSh', 'M-Pesa Code', 'Source', 'Status'];
      const rows = bookings.map(b => [
        b.booking_code, b.property_name, b.guest_name, b.guest_phone,
        b.check_in, b.check_out, b.nights || 1,
        b.total_kes, b.amount_paid_kes, Math.max(0, (Number(b.total_kes) || 0) - (Number(b.amount_paid_kes) || 0)),
        b.mpesa_code || '', b.source, b.status
      ].map(safeCell).join(','));
      downloadTextFile(`luxea-host-ledger-${isoDate(new Date())}.csv`, [headers.join(','), ...rows].join('\n'), 'text/csv;charset=utf-8;');
      if (window.showToast) window.showToast('📊 CSV ledger downloaded!');
    });

    opsContainer.querySelector('#expIcsBtn')?.addEventListener('click', () => {
      downloadTextFile(`luxea-reminders-${isoDate(new Date())}.ics`, buildIcsEvents(bookings), 'text/calendar;charset=utf-8;');
      if (window.showToast) window.showToast('📅 Calendar reminders downloaded!');
    });

    opsContainer.querySelector('#expJsonBtn')?.addEventListener('click', () => {
      const payload = {
        exported_at: new Date().toISOString(),
        properties: myProperties,
        bookings
      };
      downloadTextFile(`luxea-backup-${isoDate(new Date())}.json`, JSON.stringify(payload, null, 2), 'application/json');
      if (window.showToast) window.showToast('🔐 JSON backup saved!');
    });
  }

  window.addEventListener('luxea:booking_updated', loadOpsData);
  window.addEventListener('luxea:property_updated', loadOpsData);
  loadOpsData();
}
