/**
 * LUXEA LIVING — ADMIN MODULE (admin.js)
 * Tables for host applications & waitlist, Supabase status, CSV export, SQL viewer
 */

export function initAdminDashboard() {
  const hostsTableBody = document.getElementById('hostsTableBody');
  const guestsTableBody = document.getElementById('guestsTableBody');
  const hostsEmpty = document.getElementById('hostsEmptyState');
  const guestsEmpty = document.getElementById('guestsEmptyState');
  const searchInput = document.getElementById('adminSearchInput');

  async function loadData() {
    let hosts = [];
    let guests = [];

    if (window.LuxeaDB) {
      hosts = await window.LuxeaDB.fetchHosts();
      guests = await window.LuxeaDB.fetchWaitlist();
    } else {
      hosts = JSON.parse(localStorage.getItem('luxea_host_applications') || '[]');
      guests = JSON.parse(localStorage.getItem('luxea_waitlist_guests') || '[]');
    }

    render(hosts, guests, searchInput ? searchInput.value.toLowerCase().trim() : '');
  }

  function render(hosts, guests, filter = '') {
    // Update counters
    const hostCountEl = document.getElementById('hostTabCounter');
    const guestCountEl = document.getElementById('guestTabCounter');
    if (hostCountEl) hostCountEl.textContent = hosts.length;
    if (guestCountEl) guestCountEl.textContent = guests.length;

    // Hosts Table
    if (hostsTableBody) {
      hostsTableBody.innerHTML = '';
      const filtered = hosts.filter(h => 
        !filter ||
        (h.fullName || h.full_name || '').toLowerCase().includes(filter) ||
        (h.propertyName || h.property_name || '').toLowerCase().includes(filter) ||
        (h.county || '').toLowerCase().includes(filter) ||
        (h.refId || h.ref_id || '').toLowerCase().includes(filter)
      );

      if (filtered.length === 0) {
        if (hostsEmpty) hostsEmpty.classList.remove('hidden');
      } else {
        if (hostsEmpty) hostsEmpty.classList.add('hidden');
        filtered.forEach(h => {
          const ref = h.refId || h.ref_id;
          const name = h.fullName || h.full_name;
          const phone = h.phone;
          const prop = h.propertyName || h.property_name;
          const loc = `${h.area || h.area_suburb || ''}, ${h.county}`;
          const type = `${h.propertyType || h.property_type} • ${h.bedrooms} Bed`;
          const payMethod = h.payoutMethod || h.payout_method || (h.payoutDetails && h.payoutDetails.method) || 'M-Pesa';
          const date = h.submittedAt || (h.created_at ? new Date(h.created_at).toLocaleDateString() : 'Recent');

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${ref}</strong></td>
            <td>${name}<br><small style="color:var(--color-cocoa)">${phone}</small></td>
            <td><strong>${prop}</strong></td>
            <td>${loc}</td>
            <td>${type}</td>
            <td><span class="status-chip ${payMethod === 'M-Pesa' ? 'status-active' : 'status-pending'}">${payMethod}</span></td>
            <td><small>${date}</small></td>
          `;
          hostsTableBody.appendChild(tr);
        });
      }
    }

    // Guests Table
    if (guestsTableBody) {
      guestsTableBody.innerHTML = '';
      const filteredG = guests.filter(g =>
        !filter ||
        (g.fullName || g.full_name || '').toLowerCase().includes(filter) ||
        (g.email || '').toLowerCase().includes(filter) ||
        (g.passNumber || g.pass_number || '').toLowerCase().includes(filter)
      );

      if (filteredG.length === 0) {
        if (guestsEmpty) guestsEmpty.classList.remove('hidden');
      } else {
        if (guestsEmpty) guestsEmpty.classList.add('hidden');
        filteredG.forEach(g => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${g.passNumber || g.pass_number}</strong></td>
            <td>${g.fullName || g.full_name}</td>
            <td>${g.email}</td>
            <td>${g.phone || '—'}</td>
            <td><small>${g.destinations || g.preferred_destinations || 'All'}</small></td>
            <td><small>${g.timestamp || (g.created_at ? new Date(g.created_at).toLocaleDateString() : 'Recent')}</small></td>
          `;
          guestsTableBody.appendChild(tr);
        });
      }
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => loadData());
  }

  // Export CSV Buttons
  const exportHostsBtn = document.getElementById('exportHostsCsvBtn');
  if (exportHostsBtn) {
    exportHostsBtn.addEventListener('click', async () => {
      const hosts = window.LuxeaDB ? await window.LuxeaDB.fetchHosts() : [];
      if (hosts.length === 0) return alert('No hosts to export.');

      const headers = ['Ref ID', 'Full Name', 'Phone', 'Email', 'Property', 'Type', 'County', 'Area', 'Bedrooms', 'Bathrooms', 'Payout Method'];
      const rows = hosts.map(h => [
        `"${h.refId || h.ref_id}"`,
        `"${h.fullName || h.full_name}"`,
        `"${h.phone}"`,
        `"${h.email}"`,
        `"${h.propertyName || h.property_name}"`,
        `"${h.propertyType || h.property_type}"`,
        `"${h.county}"`,
        `"${h.area || h.area_suburb}"`,
        h.bedrooms,
        h.bathrooms,
        `"${h.payoutMethod || h.payout_method || 'M-Pesa'}"`
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCsv(`Luxea-Hosts-${new Date().toISOString().split('T')[0]}.csv`, csv);
    });
  }

  const exportGuestsBtn = document.getElementById('exportGuestsCsvBtn');
  if (exportGuestsBtn) {
    exportGuestsBtn.addEventListener('click', async () => {
      const guests = window.LuxeaDB ? await window.LuxeaDB.fetchWaitlist() : [];
      if (guests.length === 0) return alert('No waitlist signups to export.');

      const headers = ['Pass Number', 'Full Name', 'Email', 'Phone', 'Destinations'];
      const rows = guests.map(g => [
        `"${g.passNumber || g.pass_number}"`,
        `"${g.fullName || g.full_name}"`,
        `"${g.email}"`,
        `"${g.phone}"`,
        `"${g.destinations || g.preferred_destinations}"`
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCsv(`Luxea-Waitlist-${new Date().toISOString().split('T')[0]}.csv`, csv);
    });
  }

  function downloadCsv(filename, content) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  loadData();
}
