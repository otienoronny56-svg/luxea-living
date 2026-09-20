/**
 * LUXEA LIVING — LOCATION & PROPERTY TYPE DISCOVERY (nearbyStays.js)
 * Supports live dual filtering:
 * 1. By Locations: Roysambu, Ruaka, Westlands, Karen, Diani, Mombasa, Naivasha, Near You
 * 2. By Property Types: Luxury Villas, Modern Apartments & BnBs, Boutique Hotels & Suites, Sky Penthouses, Townhomes
 * 3. Geolocation: Live proximity detection & immediate banner dismissal
 */

import { LUXEA_STAYS } from './staysData.js?v=2.4.0';

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

  // Restore cached coordinates & permission state
  const cachedLat = localStorage.getItem('luxea_user_lat');
  const cachedLng = localStorage.getItem('luxea_user_lng');
  let userCoords = (cachedLat && cachedLng) 
    ? { latitude: parseFloat(cachedLat), longitude: parseFloat(cachedLng) } 
    : null;

  let isLocationBannerDismissed = 
    localStorage.getItem('luxea_loc_dismissed') === 'true' || 
    localStorage.getItem('luxea_location_enabled') === 'true' ||
    userCoords !== null;

  let activeTypeFilter = 'all'; // all, apartment, villa, hotel, penthouse, townhouse
  let activeLocationFilter = 'all'; // all, near_me, ruaka, westlands, roysambu, mombasa, karen, naivasha

  function filterStays(items) {
    return items.filter(stay => {
      // Type match
      let typeMatch = false;
      if (activeTypeFilter === 'all') {
        typeMatch = true;
      } else if (activeTypeFilter === 'apartment') {
        typeMatch = stay.propertyType === 'apartment' || stay.category === 'apartment';
      } else if (activeTypeFilter === 'hotel') {
        typeMatch = stay.propertyType === 'hotel' || stay.category === 'hotel' || stay.category === 'suite';
      } else if (activeTypeFilter === 'villa') {
        typeMatch = stay.propertyType === 'villa' || stay.category === 'villa';
      } else if (activeTypeFilter === 'penthouse') {
        typeMatch = stay.propertyType === 'penthouse' || stay.category === 'penthouse';
      } else if (activeTypeFilter === 'townhouse') {
        typeMatch = stay.propertyType === 'townhouse' || stay.category === 'townhouse';
      }

      // Location match
      let locMatch = false;
      if (activeLocationFilter === 'all' || activeLocationFilter === 'near_me') {
        locMatch = true;
      } else if (activeLocationFilter === 'ruaka') {
        locMatch = stay.locationGroup === 'ruaka' || stay.city.toLowerCase().includes('ruaka');
      } else if (activeLocationFilter === 'westlands') {
        locMatch = stay.locationGroup === 'westlands' || stay.city.toLowerCase().includes('westlands');
      } else if (activeLocationFilter === 'roysambu') {
        locMatch = stay.locationGroup === 'roysambu' || stay.city.toLowerCase().includes('roysambu');
      } else if (activeLocationFilter === 'mombasa') {
        locMatch = stay.locationGroup === 'mombasa' || stay.city.toLowerCase().includes('mombasa') || stay.city.toLowerCase().includes('diani');
      } else if (activeLocationFilter === 'karen') {
        locMatch = stay.locationGroup === 'karen' || stay.city.toLowerCase().includes('karen') || stay.city.toLowerCase().includes('kitisuru');
      } else if (activeLocationFilter === 'naivasha') {
        locMatch = stay.locationGroup === 'naivasha' || stay.city.toLowerCase().includes('naivasha');
      }

      return typeMatch && locMatch;
    });
  }

  function renderAllSections() {
    container.innerHTML = '';

    // 1. NEARBY SECTION (If GPS available or user explicitly picked 'near_me')
    if (userCoords || activeLocationFilter === 'near_me') {
      const allWithDist = [...LUXEA_STAYS].map(stay => {
        const dist = userCoords 
          ? calculateDistance(userCoords.latitude, userCoords.longitude, stay.lat, stay.lng)
          : 0;
        return { ...stay, distanceKm: dist };
      }).sort((a, b) => a.distanceKm - b.distanceKm);

      const filteredNearby = filterStays(allWithDist);
      if (filteredNearby.length > 0) {
        const within15 = filteredNearby.filter(s => s.distanceKm <= 15);
        const useRadius = within15.length >= 2;
        const itemsToShow = useRadius ? within15.slice(0, 4) : filteredNearby.slice(0, 4);

        renderShelf(container, {
          title: userCoords 
            ? (useRadius ? 'Stays near you (Within 15 km)' : 'Stays closest to your location')
            : 'Stays near you',
          subtitle: userCoords ? 'Live GPS proximity calculation' : 'Top verified stays across Nairobi & beyond',
          link: '/stays/?near=true',
          items: itemsToShow,
          isNearbyShelf: true
        });
      }
    } else if (!isLocationBannerDismissed) {
      // Permission request banner - ONLY rendered if never dismissed and never enabled
      const permBanner = document.createElement('div');
      permBanner.className = 'location-perm-banner';
      permBanner.id = 'locationPermBanner';
      permBanner.innerHTML = `
        <div class="perm-banner-left">
          <span class="perm-icon">📍</span>
          <div>
            <strong class="perm-title">Find luxury stays near you</strong>
            <p class="perm-desc">Enable location to discover boutique hotels, villas &amp; airbnbs nearest to your current spot.</p>
          </div>
        </div>
        <div class="perm-banner-actions">
          <button class="btn btn-primary btn-sm" id="enableLocationBtn">Enable Location</button>
          <button class="perm-banner-close-btn" id="dismissPermBannerBtn" aria-label="Dismiss banner" title="Dismiss">&times;</button>
        </div>
      `;
      container.appendChild(permBanner);

      const enableBtn = permBanner.querySelector('#enableLocationBtn');
      const dismissBtn = permBanner.querySelector('#dismissPermBannerBtn');

      dismissBtn?.addEventListener('click', () => {
        isLocationBannerDismissed = true;
        localStorage.setItem('luxea_loc_dismissed', 'true');
        permBanner.style.opacity = '0';
        permBanner.style.transform = 'translateY(-10px)';
        permBanner.style.transition = 'all 0.25s ease';
        setTimeout(() => permBanner.remove(), 250);
      });

      enableBtn?.addEventListener('click', () => {
        // Immediately dismiss banner UI on click
        isLocationBannerDismissed = true;
        localStorage.setItem('luxea_location_enabled', 'true');
        permBanner.style.opacity = '0';
        permBanner.style.transform = 'translateY(-10px)';
        permBanner.style.transition = 'all 0.25s ease';
        setTimeout(() => permBanner.remove(), 250);

        requestLocation();
      });
    }

    // Shelves definitions
    const shelvesConfig = [
      {
        id: 'ruaka',
        title: 'Stay in Ruaka & Westlands',
        link: '/stays/?loc=ruaka',
        items: filterStays(LUXEA_STAYS.filter(s => s.locationGroup === 'ruaka' || s.locationGroup === 'westlands'))
      },
      {
        id: 'mombasa',
        title: 'Available in Mombasa & Diani this weekend',
        link: '/stays/?loc=mombasa',
        items: filterStays(LUXEA_STAYS.filter(s => s.locationGroup === 'mombasa'))
      },
      {
        id: 'roysambu',
        title: 'Popular homes in Roysambu',
        link: '/stays/?loc=roysambu',
        items: filterStays(LUXEA_STAYS.filter(s => s.locationGroup === 'roysambu'))
      },
      {
        id: 'karen',
        title: 'Popular homes in Karen & Kitisuru',
        link: '/stays/?loc=karen',
        items: filterStays(LUXEA_STAYS.filter(s => s.locationGroup === 'karen'))
      },
      {
        id: 'naivasha',
        title: 'Safari Escapes in Naivasha & Rift Valley',
        link: '/stays/?loc=naivasha',
        items: filterStays(LUXEA_STAYS.filter(s => s.locationGroup === 'naivasha'))
      }
    ];

    let renderedAny = false;
    shelvesConfig.forEach(config => {
      // If user selected a specific location filter, only show matching shelves
      if (activeLocationFilter !== 'all' && activeLocationFilter !== 'near_me') {
        const matchesGroup = config.id === activeLocationFilter || 
                             config.items.some(i => i.locationGroup === activeLocationFilter || i.city.toLowerCase().includes(activeLocationFilter));
        if (!matchesGroup) {
          return;
        }
      }

      if (config.items.length > 0) {
        renderShelf(container, config);
        renderedAny = true;
      }
    });

    if (!renderedAny && (!userCoords || activeLocationFilter !== 'near_me')) {
      container.innerHTML += `
        <div class="empty-filter-state">
          <div style="font-size: 2rem; margin-bottom: 8px;">🏡</div>
          <p style="font-size: 1rem; font-weight: 600; color: var(--color-espresso); margin-bottom: 6px;">No stays found for this combination</p>
          <p style="font-size: 0.82rem; color: var(--color-cocoa); margin-bottom: 16px;">Try clearing filters or exploring all locations across Kenya.</p>
          <button class="btn btn-primary btn-sm" id="resetFiltersBtn">Reset All Filters</button>
        </div>
      `;
      container.querySelector('#resetFiltersBtn')?.addEventListener('click', () => {
        activeTypeFilter = 'all';
        activeLocationFilter = 'all';
        document.querySelectorAll('.location-chip').forEach(c => c.classList.remove('active'));
        document.querySelector('.location-chip[data-loc="all"]')?.classList.add('active');
        document.querySelectorAll('.type-chip').forEach(c => c.classList.remove('active'));
        document.querySelector('.type-chip[data-type="all"]')?.classList.add('active');
        renderAllSections();
      });
    }
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

    const availMap = JSON.parse(localStorage.getItem('luxea_host_avail_map') || '{}');

    config.items.forEach(item => {
      const isAvail = availMap[item.id] !== undefined ? availMap[item.id] : (item.is_available !== false);
      const gallery = (item.images && item.images.length > 0) ? item.images : [item.image];
      const hasMultiple = gallery.length > 1;

      const card = document.createElement('a');
      card.href = `/stays/?id=${item.id}`;
      card.className = `shelf-card ${isAvail ? '' : 'shelf-card-blocked'}`;
      card.innerHTML = `
        <div class="shelf-card-thumb" data-stay-id="${item.id}">
          <img src="${gallery[0]}" alt="${item.name}" loading="lazy" class="shelf-thumb-img">
          ${hasMultiple ? `
            <button class="card-carousel-arrow arrow-prev" aria-label="Previous photo" title="Previous photo">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <button class="card-carousel-arrow arrow-next" aria-label="Next photo" title="Next photo">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <div class="card-carousel-dots">
              ${gallery.map((_, i) => `<span class="carousel-dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></span>`).join('')}
            </div>
          ` : ''}
          <span class="guest-favorite-badge ${isAvail ? '' : 'badge-unavailable'}">
            ${isAvail ? (item.propertyTypeName || 'Verified') : '🚫 Dates Blocked'}
          </span>
          <button class="shelf-heart-btn" aria-label="Save to wishlist" onclick="event.preventDefault(); event.stopPropagation(); this.classList.toggle('active')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
        <div class="shelf-card-details">
          <div class="shelf-type-city">${item.propertyTypeName} • ${item.city}</div>
          <h3 class="shelf-card-name">${item.name}</h3>
          <div class="shelf-pricing-row">
            <span class="shelf-price price-num" data-usd="${item.usdPrice}" data-kes="${item.kesPrice}">KSh ${(item.kesPrice).toLocaleString()}<small> / night</small></span>
            <span class="shelf-rating">${item.rating.split(' ')[0]} ${item.rating.split(' ')[1]}</span>
          </div>
          ${item.distanceKm !== undefined && userCoords ? `<div class="shelf-dist-pill">📍 ${item.distanceKm.toFixed(1)} km from you</div>` : ''}
        </div>
      `;

      if (hasMultiple) {
        let activeIdx = 0;
        const img = card.querySelector('.shelf-thumb-img');
        const prevBtn = card.querySelector('.arrow-prev');
        const nextBtn = card.querySelector('.arrow-next');
        const dots = card.querySelectorAll('.carousel-dot');

        const updateImage = (newIdx) => {
          activeIdx = (newIdx + gallery.length) % gallery.length;
          img.src = gallery[activeIdx];
          dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === activeIdx);
          });
        };

        prevBtn?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          updateImage(activeIdx - 1);
        });

        nextBtn?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          updateImage(activeIdx + 1);
        });

        dots.forEach((dot, i) => {
          dot.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            updateImage(i);
          });
        });

        // Touch swipe support
        let startX = 0;
        const thumb = card.querySelector('.shelf-card-thumb');
        thumb?.addEventListener('touchstart', (e) => {
          startX = e.changedTouches[0].screenX;
        }, { passive: true });
        thumb?.addEventListener('touchend', (e) => {
          const endX = e.changedTouches[0].screenX;
          const diff = endX - startX;
          if (Math.abs(diff) > 35) {
            if (diff < 0) updateImage(activeIdx + 1);
            else updateImage(activeIdx - 1);
          }
        }, { passive: true });
      }

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
        localStorage.setItem('luxea_user_lat', pos.coords.latitude.toString());
        localStorage.setItem('luxea_user_lng', pos.coords.longitude.toString());
        localStorage.setItem('luxea_location_enabled', 'true');
        isLocationBannerDismissed = true;

        activeLocationFilter = 'near_me';
        // Highlight near me chip
        document.querySelectorAll('.location-chip').forEach(c => c.classList.remove('active'));
        document.querySelector('.location-chip[data-loc="near_me"]')?.classList.add('active');

        if (window.showToast) window.showToast('Location enabled! Showing stays closest to you.');
        renderAllSections();
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        localStorage.setItem('luxea_loc_dismissed', 'true');
        isLocationBannerDismissed = true;
        if (window.showToast) window.showToast('Showing all Kenya destinations.');
        renderAllSections();
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  }

  // Bind Location Filter Chips
  document.querySelectorAll('.location-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.location-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const loc = chip.getAttribute('data-loc');
      activeLocationFilter = loc;

      if (loc === 'near_me') {
        if (!userCoords) {
          requestLocation();
        } else {
          renderAllSections();
        }
      } else {
        renderAllSections();
      }
    });
  });

  // Bind Property Type Filter Chips
  document.querySelectorAll('.type-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.type-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeTypeFilter = chip.getAttribute('data-type');
      renderAllSections();
    });
  });

  // Check initial permission
  if (navigator.permissions && !userCoords) {
    navigator.permissions.query({ name: 'geolocation' }).then(result => {
      if (result.state === 'granted') {
        navigator.geolocation.getCurrentPosition((pos) => {
          userCoords = pos.coords;
          localStorage.setItem('luxea_user_lat', pos.coords.latitude.toString());
          localStorage.setItem('luxea_user_lng', pos.coords.longitude.toString());
          localStorage.setItem('luxea_location_enabled', 'true');
          isLocationBannerDismissed = true;
          renderAllSections();
        }, () => {
          renderAllSections();
        });
      } else {
        renderAllSections();
      }
    }).catch(() => {
      renderAllSections();
    });
  } else {
    renderAllSections();
  }

  // Supabase Realtime: Re-render landing sections when host toggles availability
  window.addEventListener('luxea:property_updated', () => {
    console.log('⚡ NearbyStays Realtime refresh triggered');
    renderAllSections();
  });
}
