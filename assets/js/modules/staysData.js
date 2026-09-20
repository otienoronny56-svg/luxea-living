/**
 * LUXEA LIVING — STAYS DATA MODULE (staysData.js)
 * Curated luxury stays catalog
 */

export const LUXEA_STAYS = [
  // 1. RUAKA & WESTLANDS
  {
    id: 'ruaka-1',
    category: 'penthouse',
    propertyType: 'penthouse',
    propertyTypeName: 'Sky Penthouse',
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
    images: [
      '/assets/images/penthouse.jpg',
      '/assets/images/penthouse_terrace.jpg',
      '/assets/images/suite_living.jpg',
      '/assets/images/suite_bath.jpg'
    ],
    description: 'A minimalist Nordic-inspired penthouse in Ruaka with seamless access to Two Rivers and Westlands. Panoramic sunset views, private rooftop terrace, high-speed fiber WiFi, and bespoke modern furnishings.',
    amenities: ['Rooftop Terrace', 'High-Speed Fiber', 'Smart TV 65"', 'Secure Covered Parking', 'Gym Access', '24/7 Security']
  },
  {
    id: 'ruaka-2',
    category: 'apartment',
    propertyType: 'apartment',
    propertyTypeName: 'Modern Apartment / BnB',
    locationGroup: 'ruaka',
    name: 'The Palm Haven Balcony Studio',
    location: 'Ruaka, Nairobi • Near Two Rivers Mall',
    city: 'Ruaka',
    lat: -1.2030,
    lng: 36.7745,
    usdPrice: 55,
    kesPrice: 7150,
    rating: '★ 4.92 (38)',
    specs: '1 Bed • 1 Bath • 650 sqft',
    image: '/assets/images/suite.jpg',
    images: [
      '/assets/images/suite.jpg',
      '/assets/images/suite_balcony.jpg',
      '/assets/images/suite_living.jpg',
      '/assets/images/suite_bath.jpg'
    ],
    description: 'A chic, sun-drenched apartment in Ruaka with private balcony, high-speed WiFi, modern kitchenette, smart Netflix TV, and 24/7 security. Perfect for staycations or business travel.',
    amenities: ['High-Speed WiFi', 'Smart 50" 4K TV', 'Balcony View', 'Fully Equipped Kitchen', 'Free Parking', 'Elevator']
  },
  {
    id: 'westlands-1',
    category: 'penthouse',
    propertyType: 'penthouse',
    propertyTypeName: 'Sky Penthouse',
    locationGroup: 'westlands',
    name: 'Skyline Duplex Loft Penthouse',
    location: 'Westlands, Nairobi • City Panorama',
    city: 'Westlands',
    lat: -1.2675,
    lng: 36.8111,
    usdPrice: 480,
    kesPrice: 62400,
    rating: '★ 4.98 (38)',
    specs: '3 Beds • 3.5 Baths • 3,800 sqft',
    image: '/assets/images/penthouse_terrace.jpg',
    images: [
      '/assets/images/penthouse_terrace.jpg',
      '/assets/images/penthouse.jpg',
      '/assets/images/suite_living.jpg',
      '/assets/images/suite_bath.jpg'
    ],
    description: 'Perched high above Nairobi with dual-aspect skyline vistas. Features soaring double-height ceilings, bespoke camel leather accents, curated contemporary African art, marble kitchen island, and high-speed executive boardroom setup.',
    amenities: ['Sky Terrace & Fire Pit', 'Ultra High-Speed Fiber', 'Heated Rooftop Pool', 'Concierge & Chauffeur Staging', 'Biometric Access', 'Full Acoustic Glazing']
  },
  {
    id: 'westlands-2',
    category: 'hotel',
    propertyType: 'hotel',
    propertyTypeName: 'Boutique Hotel Suite',
    locationGroup: 'westlands',
    name: 'The Sarit Executive Hotel Suite',
    location: 'Westlands, Nairobi • Parklands Avenue',
    city: 'Westlands',
    lat: -1.2612,
    lng: 36.8045,
    usdPrice: 150,
    kesPrice: 19500,
    rating: '★ 4.97 (45)',
    specs: '1 Bed • 1 Bath • 1,100 sqft',
    image: '/assets/images/suite_living.jpg',
    images: [
      '/assets/images/suite_living.jpg',
      '/assets/images/suite.jpg',
      '/assets/images/suite_bath.jpg',
      '/assets/images/suite_balcony.jpg'
    ],
    description: 'Luxury boutique hotel suite with 24/7 concierge, room service, executive work lounge, marble rainfall shower, and complimentary artisan breakfast.',
    amenities: ['24/7 Concierge', 'Complimentary Breakfast', 'High-Speed Fiber', 'Marble Bath', 'Valet Parking', 'Fitness Center']
  },

  // 2. ROYSAMBU & THIKA ROAD
  {
    id: 'roysambu-1',
    category: 'apartment',
    propertyType: 'apartment',
    propertyTypeName: 'Modern Apartment / BnB',
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
    image: '/assets/images/suite_balcony.jpg',
    images: [
      '/assets/images/suite_balcony.jpg',
      '/assets/images/suite.jpg',
      '/assets/images/suite_living.jpg',
      '/assets/images/suite_bath.jpg'
    ],
    description: 'Chic, sunlit modern executive suite with warm mustard and cream tones, plush velvet lounging, high-speed streaming setup, and dedicated workstation near Garden City & TRM.',
    amenities: ['High-Speed WiFi', 'Dedicated Workspace', 'Smart 55" OLED TV', 'Balcony Sunset View', 'Full Kitchen', 'Elevator & Security']
  },
  {
    id: 'roysambu-2',
    category: 'hotel',
    propertyType: 'hotel',
    propertyTypeName: 'Boutique Hotel Suite',
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
    image: '/assets/images/modern_loft.jpg',
    images: [
      '/assets/images/modern_loft.jpg',
      '/assets/images/suite.jpg',
      '/assets/images/suite_living.jpg',
      '/assets/images/suite_bath.jpg'
    ],
    description: 'Warm ambient lighting, bespoke timber bar, plush memory foam queen bedding, and tranquil acoustic glass insulation offering a serene escape right by Nairobi’s vibrant hub.',
    amenities: ['Artisan Coffee Station', 'Fast Fiber WiFi', 'Smart Security Access', 'Free Resident Parking', 'Housekeeping']
  },

  // 3. MOMBASA & DIANI COAST
  {
    id: 'diani-1',
    category: 'villa',
    propertyType: 'villa',
    propertyTypeName: 'Luxury Villa',
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
    image: '/assets/images/villa_pool.jpg',
    images: [
      '/assets/images/villa_pool.jpg',
      '/assets/images/villa.jpg',
      '/assets/images/suite_balcony.jpg',
      '/assets/images/suite_bath.jpg'
    ],
    description: 'An oceanfront sanctuary framed by swaying palms and azure waters. Features expansive living pavilions, travertine sun terraces, private ocean-view infinity pool, dedicated butler, and resident private chef preparing coastal Swahili-fusion gourmet dining.',
    amenities: ['Private Beach Access', 'Infinity Pool', 'Starlink 250Mbps WiFi', 'Private Chef & Butler', '24/7 Gated Security', 'Backup Solar & Generator', 'Air Conditioning']
  },
  {
    id: 'mombasa-1',
    category: 'apartment',
    propertyType: 'apartment',
    propertyTypeName: 'Modern Apartment / BnB',
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
    images: [
      '/assets/images/villa.jpg',
      '/assets/images/villa_pool.jpg',
      '/assets/images/suite_balcony.jpg',
      '/assets/images/suite_living.jpg'
    ],
    description: 'Direct views of the Indian Ocean, private sea-facing balcony, coastal boho aesthetic with custom Swahili carved wood, and swimming pool access.',
    amenities: ['Direct Beach Walkway', 'Swimming Pool', 'Air Conditioning', 'High-Speed Fiber', 'Sea-View Balcony', 'Secure Estate']
  },

  // 4. KAREN & KITISURU
  {
    id: 'karen-1',
    category: 'townhouse',
    propertyType: 'townhouse',
    propertyTypeName: 'Townhome',
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
    image: '/assets/images/townhouse_garden.jpg',
    images: [
      '/assets/images/townhouse_garden.jpg',
      '/assets/images/townhouse.jpg',
      '/assets/images/suite_living.jpg',
      '/assets/images/suite_bath.jpg'
    ],
    description: 'Nestled amidst the serene indigenous forest of Karen. An architectural residence highlighting natural timber, floor-to-ceiling glass pavilions, organic herb gardens, and an evening fire pit courtyard designed for intimate gatherings.',
    amenities: ['Private Forest Courtyard', 'Outdoor Fire Pit', 'Wood-burning Fireplace', 'Chef Kitchen', 'Dedicated Workspace', 'Tesla/EV Charging', 'Housekeeping']
  },
  {
    id: 'kitisuru-1',
    category: 'hotel',
    propertyType: 'hotel',
    propertyTypeName: 'Boutique Hotel Suite',
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
    image: '/assets/images/townhouse.jpg',
    images: [
      '/assets/images/townhouse.jpg',
      '/assets/images/townhouse_garden.jpg',
      '/assets/images/suite_balcony.jpg',
      '/assets/images/suite_bath.jpg'
    ],
    description: 'A serene boutique sanctuary tailored for romantic escapes and discerning executive stays. Fitted with natural organic linen bedding, brass fittings, private terrace overlooking coffee orchards, and an artisan coffee station.',
    amenities: ['Private Garden Balcony', 'Smart 65" OLED TV', 'Artisan Coffee Bar', 'High-Speed WiFi', 'Secure Parking', 'Premium Toiletries']
  },

  // 5. NAIVASHA & RIFT VALLEY
  {
    id: 'naivasha-1',
    category: 'villa',
    propertyType: 'villa',
    propertyTypeName: 'Luxury Villa',
    locationGroup: 'naivasha',
    name: 'Rift Valley Lakeside Safari Villa',
    location: 'Moi South Lake Road, Naivasha',
    city: 'Naivasha',
    lat: -0.7172,
    lng: 36.4310,
    usdPrice: 350,
    kesPrice: 45500,
    rating: '★ 4.97 (22)',
    specs: '3 Beds • 3 Baths • 2,900 sqft',
    image: '/assets/images/townhouse_garden.jpg',
    images: [
      '/assets/images/townhouse_garden.jpg',
      '/assets/images/villa_pool.jpg',
      '/assets/images/townhouse.jpg',
      '/assets/images/suite_living.jpg'
    ],
    description: 'A magnificent stone and timber safari villa facing Lake Naivasha. Features resident zebras grazing on the lawn, wrap-around sunset deck, private plunge pool, and wood-burning stone hearth.',
    amenities: ['Lake View Deck', 'Private Plunge Pool', 'Wood Fireplace', 'Chef on Demand', 'Game Viewing', 'Starlink WiFi']
  },

  // 6. ADDITIONAL DIVERSE STAYS (AIRBNBS, VILLAS & HOTELS)
  {
    id: 'westlands-3',
    category: 'apartment',
    propertyType: 'apartment',
    propertyTypeName: 'Modern Apartment / BnB',
    locationGroup: 'westlands',
    name: 'The Artisan Glass Loft at Rhapta',
    location: 'Rhapta Road, Westlands • Nairobi',
    city: 'Westlands',
    lat: -1.2640,
    lng: 36.7980,
    usdPrice: 95,
    kesPrice: 12350,
    rating: '★ 4.94 (48)',
    specs: '1 Bed • 1 Bath • 880 sqft',
    image: '/assets/images/modern_loft.jpg',
    images: [
      '/assets/images/modern_loft.jpg',
      '/assets/images/suite_balcony.jpg',
      '/assets/images/suite_living.jpg',
      '/assets/images/suite_bath.jpg'
    ],
    description: 'A curated modern Airbnb with industrial black glass partitions, custom acacia dining counter, high-speed Starlink WiFi, washer/dryer, and heated swimming pool.',
    amenities: ['High-Speed WiFi', 'Heated Pool', 'Washer & Dryer', 'Full Kitchen', 'Dedicated Workspace', 'Gym']
  },
  {
    id: 'mombasa-2',
    category: 'villa',
    propertyType: 'villa',
    propertyTypeName: 'Luxury Villa',
    locationGroup: 'mombasa',
    name: 'Vipingo Coral Cliff Oceanfront Villa',
    location: 'Vipingo, Kilifi / Mombasa Coast',
    city: 'Mombasa',
    lat: -3.8180,
    lng: 39.8140,
    usdPrice: 580,
    kesPrice: 75400,
    rating: '★ 4.99 (36)',
    specs: '4 Beds • 4 Baths • 4,800 sqft',
    image: '/assets/images/villa_pool.jpg',
    images: [
      '/assets/images/villa_pool.jpg',
      '/assets/images/villa.jpg',
      '/assets/images/suite_balcony.jpg',
      '/assets/images/suite_living.jpg'
    ],
    description: 'Perched above pristine coral cliffs with private stairs down to turquoise waters. Private infinity edge pool, open-air coral stone dining loggia, and resident chef.',
    amenities: ['Cliffside Infinity Pool', 'Private Beach Stairs', 'Private Chef', 'Air Conditioning', 'Generator Backup', 'Starlink']
  },
  {
    id: 'karen-2',
    category: 'hotel',
    propertyType: 'hotel',
    propertyTypeName: 'Boutique Hotel Suite',
    locationGroup: 'karen',
    name: 'Hemingways Inspired Garden Pavilion',
    location: 'Mbagathi Way, Karen • Nairobi',
    city: 'Karen',
    lat: -1.3320,
    lng: 36.7150,
    usdPrice: 260,
    kesPrice: 33800,
    rating: '★ 4.98 (29)',
    specs: '1 Bed • 1 Bath • 1,200 sqft',
    image: '/assets/images/suite_living.jpg',
    images: [
      '/assets/images/suite_living.jpg',
      '/assets/images/townhouse_garden.jpg',
      '/assets/images/suite_bath.jpg',
      '/assets/images/suite.jpg'
    ],
    description: 'Classic colonial luxury meets contemporary bespoke service. Butler service, clawfoot soaking tub, afternoon tea terrace, and serene views of the Ngong Hills.',
    amenities: ['Butler Service', 'Ngong Hills View', 'Clawfoot Soaking Tub', 'Complimentary Breakfast', 'Fine Dining Lounge', 'High-Speed WiFi']
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
