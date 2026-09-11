-- ==============================================================================
-- LUXEA LIVING — SEED PROPERTY OWNERS & HOST PARTNERS (IDEMPOTENT)
-- Populates authentic property owners for seeded curated stays into public.lux_hosts
-- and links them via host_ref_id on public.lux_properties.
-- ==============================================================================

-- 1. INSERT HOST PARTNERS (PROPERTY OWNERS)
INSERT INTO public.lux_hosts (
    ref_id,
    full_name,
    national_id,
    phone,
    email,
    kra_pin,
    dob,
    property_name,
    property_type,
    property_address,
    county,
    area_suburb,
    google_maps_link,
    bedrooms,
    bathrooms,
    max_guests,
    amenities,
    payout_method,
    mpesa_name,
    mpesa_number,
    bank_name,
    bank_account_number,
    bank_account_name,
    id_document_url,
    property_photos_urls,
    declaration_agreed,
    signature,
    signature_date,
    review_status,
    internal_notes
)
VALUES
(
    'LXH-2026-1042',
    'Dr. Wanjiku Mwangi',
    '24891024',
    '+254 722 345 891',
    'wanjiku.mwangi@luxea-partner.co.ke',
    'A004829104M',
    '1984-06-14',
    'Nordic Skyline Terrace Penthouse',
    'Penthouse',
    'Penthouse 12B, The Silver Oak Residences, Northern Bypass',
    'Kiambu',
    'Ruaka',
    'https://maps.google.com/?q=Ruaka+Northern+Bypass',
    2,
    2,
    4,
    'Rooftop Terrace, High-Speed Fiber WiFi, Smart TV 65", Secure Covered Parking, Gym Access, 24/7 Security',
    'Bank Transfer',
    NULL,
    NULL,
    'Standard Chartered Kenya',
    '01004829100',
    'Dr. Wanjiku Mwangi',
    '/assets/images/penthouse.jpg',
    '["/assets/images/penthouse.jpg", "/assets/images/suite.jpg"]'::jsonb,
    true,
    'Dr. Wanjiku Mwangi',
    '2026-02-10',
    'approved',
    'Verified medical consultant and luxury property owner. Property inspected and approved with premium tier score.'
),
(
    'LXH-2026-1185',
    'Brenda Muthoni',
    '29104822',
    '+254 718 902 411',
    'bmuthoni.haven@gmail.com',
    'A007412950P',
    '1990-11-22',
    'The Palm Haven Balcony Studio',
    'Apartment',
    'Apt 4F, Palms Residence, Limuru Road opposite Two Rivers',
    'Kiambu',
    'Ruaka',
    'https://maps.google.com/?q=Two+Rivers+Ruaka',
    1,
    1,
    2,
    'High-Speed WiFi, Smart 50" 4K TV, Balcony View, Fully Equipped Kitchen, Free Parking, Elevator',
    'M-Pesa',
    'Brenda Muthoni',
    '0718902411',
    NULL,
    NULL,
    NULL,
    '/assets/images/suite.jpg',
    '["/assets/images/suite.jpg", "/assets/images/penthouse.jpg"]'::jsonb,
    true,
    'Brenda Muthoni',
    '2026-02-18',
    'approved',
    'Interior designer host. Studio is consistently booked, vetted clean record.'
),
(
    'LXH-2026-2189',
    'Kiprono Rotich',
    '21948301',
    '+254 720 889 123',
    'k.rotich@summit-holdings.co.ke',
    'A001928475K',
    '1979-03-08',
    'Skyline Duplex Loft Penthouse',
    'Penthouse',
    'Skyline Heights, 18th Floor, Chiromo Road / Westlands',
    'Nairobi',
    'Westlands',
    'https://maps.google.com/?q=Westlands+Chiromo+Road+Nairobi',
    3,
    3.5,
    6,
    'Sky Terrace & Fire Pit, Ultra High-Speed Fiber, Heated Rooftop Pool, Concierge & Chauffeur Staging, Biometric Access, Full Acoustic Glazing',
    'Bank Transfer',
    NULL,
    NULL,
    'NCBA Bank Kenya',
    '10048291044',
    'Kiprono Rotich (Summit Holdings)',
    '/assets/images/penthouse.jpg',
    '["/assets/images/penthouse.jpg", "/assets/images/suite.jpg"]'::jsonb,
    true,
    'K. Rotich',
    '2026-01-15',
    'approved',
    'Executive boardroom & penthouse. Host is Managing Partner at Summit Holdings. High-value flagship asset.'
),
(
    'LXH-2026-3401',
    'Amina Hassan',
    '26491038',
    '+254 733 654 210',
    'amina.hassan@dianioasis.com',
    'A003847291Z',
    '1986-09-30',
    'The Grand Oasis Infinity Villa',
    'Villa',
    'Galu Beach Road, Plot 42, Diani Beach',
    'Kwale',
    'Diani Beach',
    'https://maps.google.com/?q=Galu+Beach+Diani',
    4,
    4.5,
    8,
    'Private Beach Access, Infinity Pool, Starlink 250Mbps WiFi, Private Chef & Butler, 24/7 Gated Security, Backup Solar & Generator, Air Conditioning',
    'Bank Transfer',
    NULL,
    NULL,
    'Stanbic Bank Kenya',
    '01489201948',
    'Amina Hassan Luxury Retreats',
    '/assets/images/villa.jpg',
    '["/assets/images/villa.jpg", "/assets/images/penthouse.jpg"]'::jsonb,
    true,
    'Amina Hassan',
    '2026-01-20',
    'approved',
    'Flagship beachfront villa. Complete with private chef & butler staffing contract.'
),
(
    'LXH-2026-4592',
    'Patrick Njenga',
    '23194820',
    '+254 721 554 987',
    'p.njenga@karenbotanica.co.ke',
    'A005928104D',
    '1981-12-05',
    'Botanica Courtyard Residence',
    'Townhouse',
    '14 Mbagathi Ridge, Karen Forest',
    'Nairobi',
    'Karen',
    'https://maps.google.com/?q=Mbagathi+Ridge+Karen+Nairobi',
    3,
    3,
    6,
    'Private Forest Courtyard, Outdoor Fire Pit, Wood-burning Fireplace, Chef Kitchen, Dedicated Workspace, Tesla/EV Charging, Housekeeping',
    'M-Pesa',
    'Patrick Njenga',
    '0721554987',
    NULL,
    NULL,
    NULL,
    '/assets/images/townhouse.jpg',
    '["/assets/images/townhouse.jpg", "/assets/images/villa.jpg"]'::jsonb,
    true,
    'Patrick Njenga',
    '2026-03-01',
    'approved',
    'Forest eco-architecture townhouse in Karen. Tesla charging station verified. All compliance checks passed.'
)
ON CONFLICT (ref_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    property_name = EXCLUDED.property_name,
    review_status = EXCLUDED.review_status,
    internal_notes = EXCLUDED.internal_notes,
    updated_at = NOW();

-- 2. LINK PROPERTIES TO PROPERTY OWNERS (via host_ref_id)
UPDATE public.lux_properties
SET host_ref_id = 'LXH-2026-1042'
WHERE slug = 'nordic-skyline-terrace-penthouse';

UPDATE public.lux_properties
SET host_ref_id = 'LXH-2026-1185'
WHERE slug = 'the-palm-haven-balcony-studio';

UPDATE public.lux_properties
SET host_ref_id = 'LXH-2026-2189'
WHERE slug = 'skyline-duplex-loft-penthouse';

UPDATE public.lux_properties
SET host_ref_id = 'LXH-2026-3401'
WHERE slug = 'the-grand-oasis-infinity-villa';

UPDATE public.lux_properties
SET host_ref_id = 'LXH-2026-4592'
WHERE slug = 'botanica-courtyard-residence';
