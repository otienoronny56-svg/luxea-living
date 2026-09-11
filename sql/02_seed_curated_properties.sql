-- ==============================================================================
-- LUXEA LIVING — SEED INITIAL CURATED PROPERTIES (IDEMPOTENT)
-- Populates default curated luxury stays into public.lux_properties
-- Safe to re-run multiple times (uses ON CONFLICT (slug) DO NOTHING)
-- ==============================================================================

INSERT INTO public.lux_properties (
    slug, name, category, property_type, tagline, description,
    county, city, area, location_group, price_per_night_usd, price_per_night_kes,
    bedrooms, bathrooms, square_feet, rating, reviews_count, cover_image_url,
    gallery_images, amenities, is_featured, is_active, is_available
)
VALUES
(
    'nordic-skyline-terrace-penthouse',
    'Nordic Skyline Terrace Penthouse',
    'penthouse',
    'penthouse',
    'Minimalist Nordic-inspired penthouse in Ruaka',
    'A minimalist Nordic-inspired penthouse in Ruaka with seamless access to Two Rivers and Westlands. Panoramic sunset views, private rooftop terrace, high-speed fiber WiFi, and bespoke modern furnishings.',
    'Kiambu', 'Ruaka', 'Ruaka / Northern Bypass', 'ruaka',
    120, 15600, 2, 2, 1600, 4.96, 42, '/assets/images/penthouse.jpg',
    '["/assets/images/penthouse.jpg", "/assets/images/suite.jpg"]'::jsonb,
    '["Rooftop Terrace", "High-Speed Fiber", "Smart TV 65\"", "Secure Covered Parking", "Gym Access", "24/7 Security"]'::jsonb,
    true, true, true
),
(
    'the-palm-haven-balcony-studio',
    'The Palm Haven Balcony Studio',
    'apartment',
    'apartment',
    'Chic, sun-drenched apartment near Two Rivers',
    'A chic, sun-drenched apartment in Ruaka with private balcony, high-speed WiFi, modern kitchenette, smart Netflix TV, and 24/7 security. Perfect for staycations or business travel.',
    'Kiambu', 'Ruaka', 'Ruaka / Two Rivers', 'ruaka',
    55, 7150, 1, 1, 650, 4.92, 38, '/assets/images/suite.jpg',
    '["/assets/images/suite.jpg", "/assets/images/penthouse.jpg"]'::jsonb,
    '["High-Speed WiFi", "Smart 50\" 4K TV", "Balcony View", "Fully Equipped Kitchen", "Free Parking", "Elevator"]'::jsonb,
    false, true, true
),
(
    'skyline-duplex-loft-penthouse',
    'Skyline Duplex Loft Penthouse',
    'penthouse',
    'penthouse',
    'Perched high above Nairobi with dual-aspect skyline vistas',
    'Perched high above Nairobi with dual-aspect skyline vistas. Features soaring double-height ceilings, bespoke camel leather accents, curated contemporary African art, marble kitchen island, and high-speed executive boardroom setup.',
    'Nairobi', 'Westlands', 'Westlands Skyline Panorama', 'westlands',
    480, 62400, 3, 3.5, 3800, 4.98, 38, '/assets/images/penthouse.jpg',
    '["/assets/images/penthouse.jpg", "/assets/images/suite.jpg"]'::jsonb,
    '["Sky Terrace & Fire Pit", "Ultra High-Speed Fiber", "Heated Rooftop Pool", "Concierge & Chauffeur Staging", "Biometric Access", "Full Acoustic Glazing"]'::jsonb,
    true, true, true
),
(
    'the-grand-oasis-infinity-villa',
    'The Grand Oasis Infinity Villa',
    'villa',
    'villa',
    'Oceanfront sanctuary framed by swaying palms',
    'An oceanfront sanctuary framed by swaying palms and azure waters. Features expansive living pavilions, travertine sun terraces, private ocean-view infinity pool, dedicated butler, and resident private chef preparing coastal Swahili-fusion gourmet dining.',
    'Kwale', 'Diani Beach', 'Galu Beach, Diani', 'mombasa',
    650, 84500, 4, 4.5, 5400, 4.98, 64, '/assets/images/villa.jpg',
    '["/assets/images/villa.jpg", "/assets/images/penthouse.jpg"]'::jsonb,
    '["Private Beach Access", "Infinity Pool", "Starlink 250Mbps WiFi", "Private Chef & Butler", "24/7 Gated Security", "Backup Solar & Generator", "Air Conditioning"]'::jsonb,
    true, true, true
),
(
    'botanica-courtyard-residence',
    'Botanica Courtyard Residence',
    'townhouse',
    'townhouse',
    'Nestled amidst the serene indigenous forest of Karen',
    'Nestled amidst the serene indigenous forest of Karen. An architectural residence highlighting natural timber, floor-to-ceiling glass pavilions, organic herb gardens, and an evening fire pit courtyard designed for intimate gatherings.',
    'Nairobi', 'Karen', 'Karen Indigenous Forest', 'karen',
    390, 50700, 3, 3, 3200, 4.95, 34, '/assets/images/townhouse.jpg',
    '["/assets/images/townhouse.jpg", "/assets/images/villa.jpg"]'::jsonb,
    '["Private Forest Courtyard", "Outdoor Fire Pit", "Wood-burning Fireplace", "Chef Kitchen", "Dedicated Workspace", "Tesla/EV Charging", "Housekeeping"]'::jsonb,
    true, true, true
)
ON CONFLICT (slug) DO NOTHING;
