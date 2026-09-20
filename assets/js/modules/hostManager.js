/**
 * LUXEA LIVING — HOST DASHBOARD & LISTINGS MANAGER (hostManager.js)
 * Features:
 * 1. Live Availability Toggle (ON/OFF) via Supabase Realtime
 * 2. Available Date Ranges & Blackout Dates
 * 3. Direct Image Uploads to Supabase Storage "lux_listings" Bucket
 * 4. Add New Listing with Bucket Photo Upload
 */

import { LUXEA_STAYS } from './staysData.js';

export function initHostManager(containerId = 'hostManagerContainer') {
  const container = document.getElementById(containerId);
  if (!container) return;

  let listings = [];

  // Load properties (from Supabase or local cache + seed)
  async function loadHostListings() {
    let supabaseProps = [];
    if (window.LuxeaDB) {
      supabaseProps = await window.LuxeaDB.fetchProperties();
    }

    // Seed default properties if none exist in local storage
    if (!supabaseProps || supabaseProps.length === 0) {
      const saved = localStorage.getItem('luxea_cached_properties');
      if (saved) {
        supabaseProps = JSON.parse(saved);
      } else {
        supabaseProps = LUXEA_STAYS.slice(0, 4).map(s => ({
          id: s.id,
          name: s.name,
          property_type: s.propertyType || s.category,
          city: s.city,
          county: 'Nairobi',
          price_per_night_kes: s.kesPrice,
          price_per_night_usd: s.usdPrice,
          cover_image_url: s.image,
          gallery_images: [s.image],
          is_available: true,
          available_from: new Date().toISOString().split('T')[0],
          available_to: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
          blocked_dates: []
        }));
        localStorage.setItem('luxea_cached_properties', JSON.stringify(supabaseProps));
      }
    }

    // Sync with availability map if host toggled earlier
    const availMap = JSON.parse(localStorage.getItem('luxea_host_avail_map') || '{}');
    const datesMap = JSON.parse(localStorage.getItem('luxea_host_dates_map') || '{}');

    listings = supabaseProps.map(p => {
      const isAvail = availMap[p.id] !== undefined ? availMap[p.id] : (p.is_available !== false);
      const dates = datesMap[p.id] || {};
      return {
        ...p,
        is_available: isAvail,
        available_from: dates.availableFrom || p.available_from || new Date().toISOString().split('T')[0],
        available_to: dates.availableTo || p.available_to || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        blocked_dates: dates.blockedDates || p.blocked_dates || []
      };
    });

    renderListings();
  }

  function renderListings() {
    const userSession = JSON.parse(localStorage.getItem('luxea_user_session') || 'null');
    const adminSession = JSON.parse(localStorage.getItem('luxea_admin_session') || 'null');
    const isSuperAdmin = (adminSession && adminSession.isSuperAdmin) || (userSession && userSession.isSuperAdmin);
    const hostTitle = userSession && userSession.name && !isSuperAdmin ? `${userSession.name}'s Property Portfolio` : 'Your Property Portfolio';
    const hostSub = isSuperAdmin 
      ? 'Super Admin Control: Manage live availability, rates, and blackout calendar across all listings.' 
      : 'Manage live guest availability, blackout calendar dates, and photography for your residence.';

    container.innerHTML = `
      <div class="host-manager-header">
        <div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
            <span class="badge-tag badge-gold" style="font-size:0.68rem; padding:3px 8px;">VERIFIED HOST PARTNER</span>
            ${userSession && userSession.refId ? `<span style="font-family:monospace; font-size:0.75rem; font-weight:700; color:var(--color-camel-dark);">${userSession.refId}</span>` : ''}
          </div>
          <h2 class="manager-title">${hostTitle}</h2>
          <p class="manager-sub">${hostSub}</p>
        </div>
        <button class="btn btn-primary btn-sm" id="openNewListingBtn">
          <span>+ Add New Listing</span>
        </button>
      </div>

      <div class="host-listings-grid" id="hostListingsGrid">
        <!-- Rendered cards -->
      </div>

      <!-- Quick Add Listing Modal -->
      <div class="host-modal-backdrop" id="newListingModalBackdrop">
        <div class="host-modal-card">
          <div class="modal-head">
            <h3 style="font-family: var(--font-sans); font-size: 1.25rem; font-weight: 700; color: var(--color-espresso);">Add New Stay to Supabase</h3>
            <button class="modal-close-btn" id="closeNewListingModal">&times;</button>
          </div>
          <form id="newListingForm" style="padding: 20px 24px;">
            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label">Stay / Property Title *</label>
              <input type="text" id="newStayTitle" class="form-control" placeholder="e.g. Amber Oasis Balcony Apartment" required>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label">Property Type</label>
                <select id="newStayType" class="form-control">
                  <option value="apartment">Apartment &amp; BnB</option>
                  <option value="villa">Luxury Villa</option>
                  <option value="hotel">Boutique Hotel Suite</option>
                  <option value="penthouse">Sky Penthouse</option>
                  <option value="townhouse">Townhome</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Location / City</label>
                <select id="newStayCity" class="form-control">
                  <option value="Ruaka">Ruaka</option>
                  <option value="Westlands">Westlands</option>
                  <option value="Roysambu">Roysambu</option>
                  <option value="Mombasa">Mombasa &amp; Diani</option>
                  <option value="Karen">Karen &amp; Kitisuru</option>
                  <option value="Naivasha">Naivasha</option>
                </select>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label">Price / Night (KES) *</label>
                <input type="number" id="newStayPriceKes" class="form-control" value="12500" required>
              </div>
              <div class="form-group">
                <label class="form-label">Price / Night (USD)</label>
                <input type="number" id="newStayPriceUsd" class="form-control" value="95">
              </div>
            </div>
            
            <div class="form-group" style="margin-bottom: 18px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" style="margin: 0;">Property Photos (Upload Multiple Rooms) *</label>
                <span id="newStayPhotosCountBadge" style="font-size: 0.75rem; color: var(--color-camel-dark); font-weight: 600;">0 selected</span>
              </div>
              <input type="file" id="newStayPhotosInput" class="form-control" accept="image/*" multiple>
              <div id="newStayPhotosPreviewGrid" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;"></div>
              <small style="color: var(--color-cocoa); font-size: 0.78rem; display: block; margin-top: 4px;">Upload multiple room photos (living room, bedroom, bathroom, etc.). First photo acts as primary cover. Photos are saved into Supabase bucket <code>lux_listings</code>.</small>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn btn-outline btn-sm" id="cancelNewListingBtn">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm" id="saveNewListingBtn">Publish Stay to Supabase</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const grid = container.querySelector('#hostListingsGrid');

    listings.forEach(listing => {
      const isAvailable = listing.is_available !== false;
      const hostGallery = (listing.gallery_images && listing.gallery_images.length > 0)
        ? listing.gallery_images
        : (listing.cover_image_url ? [listing.cover_image_url] : ['/assets/images/villa.jpg']);
      const hasGalleryMultiple = hostGallery.length > 1;

      const card = document.createElement('div');
      card.className = `host-manage-card ${isAvailable ? 'card-available' : 'card-unavailable'}`;
      card.setAttribute('data-id', listing.id);

      card.innerHTML = `
        <div class="manage-card-thumb-wrap" data-listing-id="${listing.id}">
          <img src="${hostGallery[0]}" alt="${listing.name}" class="manage-thumb-img" id="thumb-${listing.id}">
          ${hasGalleryMultiple ? `
            <button class="card-carousel-arrow arrow-prev" aria-label="Previous photo" style="z-index: 12; width: 28px; height: 28px;">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <button class="card-carousel-arrow arrow-next" aria-label="Next photo" style="z-index: 12; width: 28px; height: 28px;">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <div class="card-carousel-dots" style="z-index: 12;">
              ${hostGallery.map((_, i) => `<span class="carousel-dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></span>`).join('')}
            </div>
          ` : ''}
          <div class="manage-thumb-overlay">
            <label class="bucket-upload-label" title="Upload more photos to Supabase Storage bucket">
              <input type="file" class="card-bucket-file-input" data-id="${listing.id}" accept="image/*" multiple style="display: none;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              <span>+ Add Photos (${hostGallery.length})</span>
            </label>
          </div>
          <span class="status-indicator-pill ${isAvailable ? 'pill-green' : 'pill-red'}" id="statusPill-${listing.id}">
            ${isAvailable ? '🟢 Accepting Guests' : '🔴 Unavailable / Blocked'}
          </span>
        </div>

        <div class="manage-card-body">
          <div class="manage-title-row">
            <div>
              <span class="manage-type-tag">${(listing.property_type || 'Apartment').toUpperCase()} • ${listing.city}</span>
              <h3 class="manage-prop-name">${listing.name}</h3>
              <p class="manage-price-line">KSh ${(listing.price_per_night_kes || 12000).toLocaleString()}<small> / night</small></p>
            </div>
          </div>

          <!-- AVAILABILITY TOGGLE ROW -->
          <div class="manage-toggle-box">
            <div class="toggle-info">
              <strong class="toggle-heading">Live Guest Availability</strong>
              <p class="toggle-help" id="toggleHelp-${listing.id}">
                ${isAvailable ? 'Your property is currently live and bookable on the Luxea browse feed.' : 'Hidden from guests. Toggling this off immediately marks the stay as unavailable.'}
              </p>
            </div>
            <label class="lux-switch" aria-label="Toggle availability">
              <input type="checkbox" class="avail-checkbox" data-id="${listing.id}" ${isAvailable ? 'checked' : ''}>
              <span class="lux-switch-slider"></span>
            </label>
          </div>

          <!-- DATES & BLACKOUT ACCORDION -->
          <div class="manage-dates-box">
            <div class="dates-head">
              <span style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--color-camel-dark); letter-spacing: 0.04em;">Available Booking Dates</span>
            </div>
            <div class="dates-inputs-row">
              <div class="date-input-wrap">
                <label>From</label>
                <input type="date" class="date-ctrl start-date-ctrl" data-id="${listing.id}" value="${listing.available_from || ''}">
              </div>
              <div class="date-input-wrap">
                <label>To</label>
                <input type="date" class="date-ctrl end-date-ctrl" data-id="${listing.id}" value="${listing.available_to || ''}">
              </div>
              <button class="btn btn-outline btn-sm save-dates-btn" data-id="${listing.id}" style="align-self: flex-end; padding: 6px 12px; font-size: 0.78rem;">
                Save Dates
              </button>
            </div>
            <div class="blackout-info-row">
              <span class="blackout-tag">🚫 Block Next Weekend</span>
              <button class="quick-block-btn" data-id="${listing.id}">Quick Block Dates</button>
            </div>
          </div>
        </div>
      `;

      grid.appendChild(card);
    });

    bindEvents();
  }

  function bindEvents() {
    // 1. Availability Toggles
    container.querySelectorAll('.avail-checkbox').forEach(chk => {
      chk.addEventListener('change', async (e) => {
        const id = chk.getAttribute('data-id');
        const isAvail = chk.checked;
        const statusPill = container.querySelector(`#statusPill-${id}`);
        const toggleHelp = container.querySelector(`#toggleHelp-${id}`);
        const card = container.querySelector(`.host-manage-card[data-id="${id}"]`);

        // Instant UI update
        if (isAvail) {
          statusPill.textContent = '🟢 Accepting Guests';
          statusPill.className = 'status-indicator-pill pill-green';
          toggleHelp.textContent = 'Your property is currently live and bookable on the Luxea browse feed.';
          card.classList.add('card-available');
          card.classList.remove('card-unavailable');
        } else {
          statusPill.textContent = '🔴 Unavailable / Blocked';
          statusPill.className = 'status-indicator-pill pill-red';
          toggleHelp.textContent = 'Hidden from guests. Toggling this off immediately marks the stay as unavailable.';
          card.classList.remove('card-available');
          card.classList.add('card-unavailable');
        }

        if (window.showToast) {
          window.showToast(isAvail ? 'Availability toggled ON (Live on Browse Feed)' : 'Availability toggled OFF (Stay marked Unavailable)');
        }

        // Push to Supabase & broadcast via Realtime
        if (window.LuxeaDB) {
          await window.LuxeaDB.updatePropertyAvailability(id, isAvail);
        }
      });
    });

    // 2. Direct Photo Upload to Supabase Storage Bucket
    container.querySelectorAll('.card-bucket-file-input').forEach(input => {
      input.addEventListener('change', async (e) => {
        const id = input.getAttribute('data-id');
        const files = input.files;
        if (!files || files.length === 0) return;

        if (window.showToast) window.showToast(`Uploading ${files.length} photo(s) to Supabase bucket "lux_listings"...`);

        if (window.LuxeaDB) {
          const uploadedUrls = await window.LuxeaDB.uploadListingPhotos(files, 'properties');
          if (uploadedUrls && uploadedUrls.length > 0) {
            await window.LuxeaDB.appendPropertyPhotos(id, uploadedUrls);
            if (window.showToast) window.showToast(`✅ Saved ${uploadedUrls.length} photo(s) to Supabase gallery!`);
            await loadHostListings();
          } else {
            // Local preview fallback
            const thumbImg = container.querySelector(`#thumb-${id}`);
            if (thumbImg) thumbImg.src = URL.createObjectURL(files[0]);
            if (window.showToast) window.showToast(`Photo updated locally.`);
          }
        }
      });
    });

    // 2B. Host Card Photo Carousel Navigation
    container.querySelectorAll('.host-manage-card').forEach(card => {
      const id = card.getAttribute('data-id');
      const listing = listings.find(l => l.id === id);
      if (!listing) return;
      const gallery = (listing.gallery_images && listing.gallery_images.length > 0)
        ? listing.gallery_images
        : (listing.cover_image_url ? [listing.cover_image_url] : ['/assets/images/villa.jpg']);
      if (gallery.length <= 1) return;

      let activeIdx = 0;
      const img = card.querySelector(`#thumb-${id}`);
      const prevBtn = card.querySelector('.arrow-prev');
      const nextBtn = card.querySelector('.arrow-next');
      const dots = card.querySelectorAll('.carousel-dot');

      const setHostPhoto = (newIdx) => {
        activeIdx = (newIdx + gallery.length) % gallery.length;
        if (img) img.src = gallery[activeIdx];
        dots.forEach((dot, i) => dot.classList.toggle('active', i === activeIdx));
      };

      prevBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setHostPhoto(activeIdx - 1);
      });

      nextBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setHostPhoto(activeIdx + 1);
      });

      dots.forEach((dot, i) => {
        dot.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          setHostPhoto(i);
        });
      });
    });

    // 2C. Multi-photo selection preview in New Listing modal
    const photosInput = container.querySelector('#newStayPhotosInput');
    const previewGrid = container.querySelector('#newStayPhotosPreviewGrid');
    const countBadge = container.querySelector('#newStayPhotosCountBadge');

    photosInput?.addEventListener('change', () => {
      if (!photosInput.files || !previewGrid) return;
      previewGrid.innerHTML = '';
      const count = photosInput.files.length;
      if (countBadge) countBadge.textContent = count > 0 ? `${count} photo(s) selected` : '0 selected';

      Array.from(photosInput.files).forEach((file, idx) => {
        const thumbWrap = document.createElement('div');
        thumbWrap.style.cssText = 'position: relative; width: 68px; height: 50px; border-radius: 8px; overflow: hidden; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 1px 4px rgba(0,0,0,0.06);';
        thumbWrap.innerHTML = `
          <img src="${URL.createObjectURL(file)}" style="width: 100%; height: 100%; object-fit: cover;">
          ${idx === 0 ? '<span style="position: absolute; bottom: 2px; left: 2px; background: rgba(0,0,0,0.7); color: #fff; font-size: 0.55rem; padding: 1px 4px; border-radius: 4px; font-weight: 700;">COVER</span>' : ''}
        `;
        previewGrid.appendChild(thumbWrap);
      });
    });

    // 3. Save Dates Button
    container.querySelectorAll('.save-dates-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const start = container.querySelector(`.start-date-ctrl[data-id="${id}"]`)?.value;
        const end = container.querySelector(`.end-date-ctrl[data-id="${id}"]`)?.value;

        if (window.LuxeaDB) {
          await window.LuxeaDB.updatePropertyDates(id, { availableFrom: start, availableTo: end });
        }

        if (window.showToast) window.showToast(`✅ Dates updated in Supabase (${start} to ${end})`);
      });
    });

    // 4. Quick Block Next Weekend Button
    container.querySelectorAll('.quick-block-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const today = new Date();
        const nextSat = new Date(today.setDate(today.getDate() + (6 - today.getDay())));
        const nextSun = new Date(today.setDate(today.getDate() + 1));
        const dates = [nextSat.toISOString().split('T')[0], nextSun.toISOString().split('T')[0]];

        if (window.LuxeaDB) {
          await window.LuxeaDB.updatePropertyDates(id, { blockedDates: dates });
        }

        if (window.showToast) window.showToast(`🚫 Blocked next weekend (${dates.join(', ')}) in Supabase`);
      });
    });

    // 5. New Listing Modal Triggers
    const openModalBtn = container.querySelector('#openNewListingBtn');
    const modalBackdrop = container.querySelector('#newListingModalBackdrop');
    const closeModalBtn = container.querySelector('#closeNewListingModal');
    const cancelModalBtn = container.querySelector('#cancelNewListingBtn');
    const newForm = container.querySelector('#newListingForm');

    openModalBtn?.addEventListener('click', () => modalBackdrop?.classList.add('open'));
    closeModalBtn?.addEventListener('click', () => modalBackdrop?.classList.remove('open'));
    cancelModalBtn?.addEventListener('click', () => modalBackdrop?.classList.remove('open'));

    newForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = container.querySelector('#newStayTitle').value.trim();
      const type = container.querySelector('#newStayType').value;
      const city = container.querySelector('#newStayCity').value;
      const priceKes = parseFloat(container.querySelector('#newStayPriceKes').value) || 12000;
      const priceUsd = parseFloat(container.querySelector('#newStayPriceUsd').value) || 95;
      const photoFiles = container.querySelector('#newStayPhotosInput').files;
      const saveBtn = container.querySelector('#saveNewListingBtn');

      if (!title) return;

      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span>Uploading Photos &amp; Publishing...</span>';
      }

      if (window.showToast) window.showToast('Publishing stay and uploading photos to Supabase...');

      try {
        if (window.LuxeaDB) {
          const newListing = await window.LuxeaDB.addPropertyListing({
            name: title,
            propertyType: type,
            city: city,
            locationGroup: city.toLowerCase(),
            priceKes: priceKes,
            priceUsd: priceUsd
          }, photoFiles);

          modalBackdrop?.classList.remove('open');
          newForm.reset();
          if (window.showToast) window.showToast('✅ Stay published to Supabase! Now live across platform.');
          await loadHostListings();
        }
      } catch (err) {
        console.error('Publish stay error:', err);
        if (window.showToast) window.showToast('Notice: Stay saved locally. Check Supabase connection.');
        modalBackdrop?.classList.remove('open');
        await loadHostListings();
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = 'Publish Stay to Supabase';
        }
      }
    });
  }


  // Listen for Realtime property updates dispatched by Supabase client
  window.addEventListener('luxea:property_updated', (e) => {
    console.log('Host Manager received realtime update:', e.detail);
  });

  loadHostListings();
}
