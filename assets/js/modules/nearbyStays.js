/**
 * LUXEA LIVING — LOCATION-BASED DISCOVERY & GEOLOCATION (nearbyStays.js)
 * Groups stays into Airbnb-style location shelves:
 * - "Stays near you" (Calculated via Geolocation API)
 * - "Popular homes in Roysambu"
 * - "Available in Mombasa this weekend"
 * - "Stay in Ruaka & Westlands"
 * - "Popular homes in Karen & Kitisuru"
 */

import { LUXEA_STAYS } from './staysData.js';

// Calculate Haversine distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function initNearbyStays(containerId = 'locationSectionsContainer') {
  const container = document.getElementById(containerId);
  if (!container) return;

  let userCoords = null;

  function renderAllSections() {
    container.innerHTML = '';

    // 1. NEARBY SECTION (If coordinates granted, sort by distance)
    if (userCoords) {
      const sortedByDistance = [...LUXEA_STAYS].map(stay => {
        const dist = calculateDistance(userCoords.latitude, userCoords.longitude, stay.lat, stay.lng);
        return { ...stay, distanceKm: dist };
      }).sort((a, b) => a.distanceKm - b.distanceKm);

      const nearbyItems = sortedByDistance.slice(0, 4);
      renderShelf(container, {
        title: `Stays near you (${nearbyItems[0].distanceKm < 15 ? 'Within 15 km' : 'Nearest to your location'})`,
        subtitle: 'Sorted by distance from your current position',
        link: '/stays/',
        items: nearbyItems,
        isNearbyShelf: true
      });
    } else {
      // Permission request bar
      const permBanner = document.createElement('div');
      permBanner.className = 'location-perm-banner';
      permBanner.innerHTML = `
        <div class="perm-banner-left">
          <span class="perm-icon">📍</span>
          <div>
            <strong class="perm-title">Find luxury stays near you</strong>
            <p class="perm-desc">Allow location access to see verified residences closest to where you are.</p>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" id="enableLocationBtn">Enable Location</button>
      `;
      container.appendChild(permBanner);

      const enableBtn = permBanner.querySelector('#enableLocationBtn');
      enableBtn?.addEventListener('click', requestLocation);
    }

    // 2. SHELF: Stay in Ruaka & Westlands
    const ruakaItems = LUXEA_STAYS.filter(s => s.locationGroup === 'ruaka');
    renderShelf(container, {
      title: 'Stay in Ruaka & Westlands',
      link: '/stays/?filter=ruaka',
      items: ruakaItems
    });

    // 3. SHELF: Available in Mombasa & Diani this weekend
    const coastItems = LUXEA_STAYS.filter(s => s.locationGroup === 'mombasa');
    renderShelf(container, {
      title: 'Available in Mombasa & Diani this weekend',
      link: '/stays/?filter=mombasa',
      items: coastItems
    });

    // 4. SHELF: Popular homes in Roysambu
    const roysambuItems = LUXEA_STAYS.filter(s => s.locationGroup === 'roysambu');
    renderShelf(container, {
      title: 'Popular homes in Roysambu',
      link: '/stays/?filter=roysambu',
      items: roysambuItems
    });

    // 5. SHELF: Popular homes in Karen & Kitisuru
    const karenItems = LUXEA_STAYS.filter(s => s.locationGroup === 'karen');
    renderShelf(container, {
      title: 'Popular homes in Karen & Kitisuru',
      link: '/stays/?filter=karen',
      items: karenItems
    });
  }

  function renderShelf(parent, config) {
    const shelf = document.createElement('section');
    shelf.className = 'location-shelf-section';

    const header = document.createElement('div');
    header.className = 'shelf-head-row';
    header.innerHTML = `
      <div>
        <h2 class="shelf-title">${config.title}</h2>
        ${config.subtitle ? `<span class="shelf-sub">${config.subtitle}</span>` : ''}
      </div>
      <a href="${config.link}" class="shelf-arrow-btn" aria-label="See all ${config.title}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
      </a>
    `;
    shelf.appendChild(header);

    const scrollWrap = document.createElement('div');
    scrollWrap.className = 'shelf-cards-scroll';

    config.items.forEach(item => {
      const card = document.createElement('a');
      card.href = '/stays/';
      card.className = 'shelf-card';
      card.innerHTML = `
        <div class="shelf-card-thumb">
          <img src="${item.image}" alt="${item.name}" loading="lazy">
          <span class="guest-favorite-badge">Guest favorite</span>
          <button class="shelf-heart-btn" aria-label="Save to wishlist" onclick="event.preventDefault(); this.classList.toggle('active')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
        <div class="shelf-card-details">
          <div class="shelf-type-city">${item.category.toUpperCase()} • ${item.city}</div>
          <h3 class="shelf-card-name">${item.name}</h3>
          <div class="shelf-pricing-row">
            <span class="shelf-price price-num" data-usd="${item.usdPrice}" data-kes="${item.kesPrice}">KSh ${(item.kesPrice).toLocaleString()}<small> / night</small></span>
            <span class="shelf-rating">${item.rating.split(' ')[0]} ${item.rating.split(' ')[1]}</span>
          </div>
          ${item.distanceKm !== undefined ? `<div class="shelf-dist-pill">📍 ${item.distanceKm.toFixed(1)} km from you</div>` : ''}
        </div>
      `;
      scrollWrap.appendChild(card);
    });

    shelf.appendChild(scrollWrap);
    parent.appendChild(shelf);
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      if (window.showToast) window.showToast('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userCoords = pos.coords;
        if (window.showToast) window.showToast('Location enabled! Showing stays closest to you.');
        renderAllSections();
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        if (window.showToast) window.showToast('Location access denied. Showing all destinations.');
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  }

  // Attempt auto-detection if permission previously granted
  if (navigator.permissions) {
    navigator.permissions.query({ name: 'geolocation' }).then(result => {
      if (result.state === 'granted') {
        requestLocation();
      } else {
        renderAllSections();
      }
    }).catch(() => {
      renderAllSections();
    });
  } else {
    renderAllSections();
  }
}
