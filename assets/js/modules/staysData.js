/**
 * LUXEA LIVING — STAYS DATA MODULE (staysData.js)
 * Curated luxury stays catalog
 */

export const LUXEA_STAYS = [
  {
    id: 'villa-1',
    category: 'villa',
    name: 'The Grand Oasis Infinity Villa',
    location: 'Galu Beach, Diani • Coast Region',
    usdPrice: 650,
    kesPrice: 84500,
    rating: '★ 4.98 (28)',
    specs: '4 Beds • 4.5 Baths • 5,400 sqft',
    image: 'assets/images/villa.jpg',
    description: 'An oceanfront sanctuary framed by swaying palms and azure waters. Features expansive living pavilions, travertine sun terraces, private ocean-view infinity pool, dedicated butler, and resident private chef preparing coastal Swahili-fusion gourmet dining.',
    amenities: ['Private Beach Access', 'Infinity Pool', 'Starlink 250Mbps WiFi', 'Private Chef & Butler', '24/7 Gated Security', 'Backup Solar & Generator', 'Air Conditioning']
  },
  {
    id: 'penthouse-1',
    category: 'penthouse',
    name: 'Skyline Duplex Loft Penthouse',
    location: 'Westlands, Nairobi • City Panorama',
    usdPrice: 480,
    kesPrice: 62400,
    rating: '★ 4.96 (19)',
    specs: '3 Beds • 3.5 Baths • 3,800 sqft',
    image: 'assets/images/penthouse.jpg',
    description: 'Perched high above Nairobi with dual-aspect skyline vistas. Features soaring double-height ceilings, bespoke camel leather accents, curated contemporary African art, marble kitchen island, and high-speed executive boardroom setup.',
    amenities: ['Sky Terrace & Fire Pit', 'Ultra High-Speed Fiber', 'Heated Rooftop Pool', 'Concierge & Chauffeur Staging', 'Biometric Access', 'Full Acoustic Glazing']
  },
  {
    id: 'townhouse-1',
    category: 'townhouse',
    name: 'Botanica Courtyard Residence',
    location: 'Karen, Nairobi • Lush Sanctuary',
    usdPrice: 390,
    kesPrice: 50700,
    rating: '★ 4.94 (34)',
    specs: '3 Beds • 3 Baths • 3,200 sqft',
    image: 'assets/images/townhouse.jpg',
    description: 'Nestled amidst the serene indigenous forest of Karen. An architectural residence highlighting natural timber, floor-to-ceiling glass pavilions, organic herb gardens, and an evening fire pit courtyard designed for intimate gatherings.',
    amenities: ['Private Forest Courtyard', 'Outdoor Fire Pit', 'Wood-burning Fireplace', 'Chef Kitchen', 'Dedicated Workspace', 'Tesla/EV Charging', 'Housekeeping']
  },
  {
    id: 'suite-1',
    category: 'suite',
    name: 'The Olive Garden Balcony Suite',
    location: 'Kitisuru, Nairobi • Quiet Sanctuary',
    usdPrice: 220,
    kesPrice: 28600,
    rating: '★ 5.0 (14)',
    specs: '1 Bed • 1 Bath • 1,150 sqft',
    image: 'assets/images/suite.jpg',
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
          <button class="btn btn-secondary btn-sm open-stay-modal-btn" data-stay-id="${stay.id}">View Details</button>
          <a href="index.html#waitlist-section" class="btn btn-primary btn-sm">Waitlist Access</a>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}
