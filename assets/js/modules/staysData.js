/**
 * LUXEA LIVING — STAYS DATA MODULE (staysData.js)
 * Curated luxury stays catalog
 */

export const LUXEA_STAYS = [
  // RUAKA & WESTLANDS
  {
    id: 'ruaka-1',
    category: 'penthouse',
    locationGroup: 'ruaka',
    name: 'Nordic Skyline Terrace Penthouse',
    location: 'Ruaka, Nairobi • Northern Bypass',
    city: 'Ruaka',
    lat: -1.2062,
    lng: 36.7767,
    usdPrice: 120,
    kesPrice: 15600,
    rating: '★ 4.96 (42)',
    specs: '2 Beds • 2 Baths • 1,600 sqft',
    image: '/assets/images/penthouse.jpg',
    description: 'A minimalist Nordic-inspired penthouse in Ruaka with seamless access to Two Rivers and Westlands. Panoramic sunset views, private rooftop terrace, high-speed fiber WiFi, and bespoke modern furnishings.',
    amenities: ['Rooftop Terrace', 'High-Speed Fiber', 'Smart TV 65"', 'Secure Covered Parking', 'Gym Access', '24/7 Security']
  },
  {
    id: 'westlands-1',
    category: 'penthouse',
    locationGroup: 'ruaka',
    name: 'Skyline Duplex Loft Penthouse',
    location: 'Westlands, Nairobi • City Panorama',
    city: 'Westlands',
    lat: -1.2675,
    lng: 36.8111,
    usdPrice: 480,
    kesPrice: 62400,
    rating: '★ 4.98 (38)',
    specs: '3 Beds • 3.5 Baths • 3,800 sqft',
    image: '/assets/images/penthouse.jpg',
    description: 'Perched high above Nairobi with dual-aspect skyline vistas. Features soaring double-height ceilings, bespoke camel leather accents, curated contemporary African art, marble kitchen island, and high-speed executive boardroom setup.',
    amenities: ['Sky Terrace & Fire Pit', 'Ultra High-Speed Fiber', 'Heated Rooftop Pool', 'Concierge & Chauffeur Staging', 'Biometric Access', 'Full Acoustic Glazing']
  },

  // ROYSAMBU & THIKA ROAD
  {
    id: 'roysambu-1',
    category: 'suite',
    locationGroup: 'roysambu',
    name: 'The Modernist Loft at Mirema',
    location: 'Roysambu, Nairobi • Near Garden City',
    city: 'Roysambu',
    lat: -1.2185,
    lng: 36.8872,
    usdPrice: 75,
    kesPrice: 9750,
    rating: '★ 4.91 (56)',
    specs: '1 Bed • 1 Bath • 850 sqft',
    image: '/assets/images/suite.jpg',
    description: 'Chic, sunlit modern executive suite with warm mustard and cream tones, plush velvet lounging, high-speed streaming setup, and dedicated workstation near Garden City & TRM.',
    amenities: ['High-Speed WiFi', 'Dedicated Workspace', 'Smart 55" OLED TV', 'Balcony Sunset View', 'Full Kitchen', 'Elevator & Security']
  },
  {
    id: 'roysambu-2',
    category: 'suite',
    locationGroup: 'roysambu',
    name: 'Amber Glow Studio & Executive Bar',
    location: 'Roysambu, Nairobi • Thika Road Corridor',
    city: 'Roysambu',
    lat: -1.2220,
    lng: 36.8910,
    usdPrice: 85,
    kesPrice: 11050,
    rating: '★ 4.88 (31)',
    specs: '1 Bed • 1 Bath • 920 sqft',
    image: '/assets/images/suite.jpg',
    description: 'Warm ambient lighting, bespoke timber bar, plush memory foam queen bedding, and tranquil acoustic glass insulation offering a serene escape right by Nairobi’s vibrant hub.',
    amenities: ['Artisan Coffee Station', 'Fast Fiber WiFi', 'Smart Security Access', 'Free Resident Parking', 'Housekeeping']
  },

  // MOMBASA & DIANI COAST
  {
    id: 'diani-1',
    category: 'villa',
    locationGroup: 'mombasa',
    name: 'The Grand Oasis Infinity Villa',
    location: 'Galu Beach, Diani • Coast Region',
    city: 'Diani Beach',
    lat: -4.3167,
    lng: 39.5833,
    usdPrice: 650,
    kesPrice: 84500,
    rating: '★ 4.98 (64)',
    specs: '4 Beds • 4.5 Baths • 5,400 sqft',
    image: '/assets/images/villa.jpg',
    description: 'An oceanfront sanctuary framed by swaying palms and azure waters. Features expansive living pavilions, travertine sun terraces, private ocean-view infinity pool, dedicated butler, and resident private chef preparing coastal Swahili-fusion gourmet dining.',
    amenities: ['Private Beach Access', 'Infinity Pool', 'Starlink 250Mbps WiFi', 'Private Chef & Butler', '24/7 Gated Security', 'Backup Solar & Generator', 'Air Conditioning']
  },
  {
    id: 'mombasa-1',
    category: 'suite',
    locationGroup: 'mombasa',
    name: 'Nyali Azure Beachfront Apartment',
    location: 'Nyali, Mombasa • Coral Drive',
    city: 'Mombasa',
    lat: -4.0435,
    lng: 39.6682,
    usdPrice: 190,
    kesPrice: 24700,
    rating: '★ 5.0 (29)',
    specs: '2 Beds • 2 Baths • 1,750 sqft',
    image: '/assets/images/villa.jpg',
    description: 'Direct views of the Indian Ocean, private sea-facing balcony, coastal boho aesthetic with custom Swahili carved wood, and swimming pool access.',
    amenities: ['Direct Beach Walkway', 'Swimming Pool', 'Air Conditioning', 'High-Speed Fiber', 'Sea-View Balcony', 'Secure Estate']
  },

  // KAREN & KITISURU
  {
    id: 'karen-1',
    category: 'townhouse',
    locationGroup: 'karen',
    name: 'Botanica Courtyard Residence',
    location: 'Karen, Nairobi • Indigenous Forest',
    city: 'Karen',
    lat: -1.3194,
    lng: 36.7062,
    usdPrice: 390,
    kesPrice: 50700,
    rating: '★ 4.95 (34)',
    specs: '3 Beds • 3 Baths • 3,200 sqft',
    image: '/assets/images/townhouse.jpg',
    description: 'Nestled amidst the serene indigenous forest of Karen. An architectural residence highlighting natural timber, floor-to-ceiling glass pavilions, organic herb gardens, and an evening fire pit courtyard designed for intimate gatherings.',
    amenities: ['Private Forest Courtyard', 'Outdoor Fire Pit', 'Wood-burning Fireplace', 'Chef Kitchen', 'Dedicated Workspace', 'Tesla/EV Charging', 'Housekeeping']
  },
  {
    id: 'kitisuru-1',
    category: 'suite',
    locationGroup: 'karen',
    name: 'The Olive Garden Balcony Suite',
    location: 'Kitisuru, Nairobi • Coffee Orchards',
    city: 'Kitisuru',
    lat: -1.2425,
    lng: 36.7758,
    usdPrice: 220,
    kesPrice: 28600,
    rating: '★ 5.0 (18)',
    specs: '1 Bed • 1 Bath • 1,150 sqft',
    image: '/assets/images/suite.jpg',
    description: 'A serene boutique sanctuary tailored for romantic escapes and discerning executive stays. Fitted with natural organic linen bedding, brass fittings, private terrace overlooking coffee orchards, and an artisan coffee station.',
    amenities: ['Private Garden Balcony', 'Smart 65" OLED TV', 'Artisan Coffee Bar', 'High-Speed WiFi', 'Secure Parking', 'Premium Toiletries']
  }
];

export function renderStaysGrid(containerId, category = 'all') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';
  const filtered = category === 'all' ? LUXEA_STAYS : LUXEA_STAYS.filter(s => s.category === category);

  filtered.forEach(stay => {
    const card = document.createElement('div');
    card.className = 'stay-card';
    card.setAttribute('data-category', stay.category);
    card.setAttribute('data-id', stay.id);
    card.innerHTML = `
      <div class="stay-thumb-wrap">
        <img src="${stay.image}" alt="${stay.name}" class="stay-thumb" loading="lazy">
        <div class="thumb-top-badges">
          <span class="badge-tag badge-gold">Verified Partner</span>
          <span class="badge-tag badge-white">Exclusive</span>
        </div>
        <button class="stay-heart-btn" title="Add to wishlist" aria-label="Save">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>
      <div class="stay-info">
        <div class="stay-pricing-row">
          <div class="stay-price">
            <span class="price-num" data-usd="${stay.usdPrice}" data-kes="${stay.kesPrice}">$${stay.usdPrice}</span>
            <span class="price-period">/ night</span>
          </div>
          <span class="stay-rating">${stay.rating}</span>
        </div>
        <h3 class="stay-name">${stay.name}</h3>
        <p class="stay-loc">${stay.location}</p>
        <div class="stay-features">${stay.specs}</div>
        <div class="stay-card-bottom">
          <button class="btn btn-secondary btn-sm open-stay-detail-btn" data-stay-id="${stay.id}">View Details</button>
          <a href="/waitlist/" class="btn btn-primary btn-sm">Waitlist Access</a>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}
