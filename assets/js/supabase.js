/**
 * LUXEA LIVING — HARDENED SUPABASE CLIENT, AUTH & DATA LAYER
 * Security architecture:
 * 1. Strictly pinned Supabase URL & publishable key (no localStorage credential override)
 * 2. Real Supabase Auth JWT + server-backed public.lux_profiles verification for Admins & Hosts
 * 3. Zero hardcoded passwords, zero client-side bypasses, zero plaintext PII in localStorage
 * 4. Public Realtime only subscribes to public catalog (lux_properties); admin Realtime starts only after JWT verification
 * 5. Private lux_documents bucket served via short-lived admin signed URLs
 * 6. Shared XSS sanitization utilities (window.LuxeaSanitize)
 */

(function () {
  let supabase = null;
  let publicRealtimeChannel = null;
  let adminRealtimeChannel = null;

  const SUPABASE_URL = 'https://abzcabiqdkmfaijnqbkf.supabase.co';
  const ACTIVE_ANON_KEY = 'sb_publishable_WWUoQIj6P8LL3WCXrwMbAw_x_rtBQZn';
  const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/luxea-mailer`;

  // Shared XSS & URL sanitization helpers
  function escapeHtml(val) {
    return String(val ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeUrl(val, fallback = '') {
    const str = String(val ?? '').trim();
    if (!str) return fallback;
    if (str.startsWith('/') && !str.startsWith('//')) return str;
    try {
      const u = new URL(str);
      if (u.protocol === 'https:' || u.protocol === 'http:') return u.toString();
    } catch (e) {}
    return fallback;
  }

  window.LuxeaSanitize = { escapeHtml, safeUrl };

  const PUBLIC_LAUNDRY_COLUMNS = [
    'id', 'ref_id', 'business_name', 'contact_person', 'phone',
    'coverage_areas', 'services_offered',
    'price_wash_fold_per_kg', 'price_linen_turnover_set', 'price_dry_clean_suit',
    'express_available', 'status', 'rating', 'completed_orders_count', 'created_at'
  ].join(',');

  function getCredentials() {
    if (window.LUXEA_CONFIG && window.LUXEA_CONFIG.supabase && window.LUXEA_CONFIG.supabase.url === SUPABASE_URL) {
      return window.LUXEA_CONFIG.supabase;
    }
    return { url: SUPABASE_URL, anonKey: ACTIVE_ANON_KEY };
  }

  function clearAllLocalCaches() {
    const keysToRemove = [
      'luxea_admin_session',
      'luxea_user_session',
      'luxea_pending_host_auth',
      'luxea_pending_host_app',
      'luxea_host_applications',
      'luxea_waitlist_guests',
      'luxea_host_waitlist',
      'luxea_laundry_orders',
      'luxea_laundry_partners',
      'luxea_laundry_session',
      'luxea_supabase_credentials'
    ];
    keysToRemove.forEach((k) => {
      try { localStorage.removeItem(k); } catch (e) {}
    });
  }

  function init() {
    const creds = getCredentials();
    if (creds && window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        supabase = window.supabase.createClient(creds.url, creds.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          },
          realtime: {
            params: { eventsPerSecond: 5 }
          }
        });
        initPublicRealtimeSubscriptions();
      } catch (err) {
        console.warn('Supabase init failed:', err);
      }
    }
    return supabase;
  }

  // Public visitors ONLY subscribe to the public active listings catalog
  function initPublicRealtimeSubscriptions() {
    if (!supabase || publicRealtimeChannel) return;
    try {
      publicRealtimeChannel = supabase
        .channel('lux_public_properties')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'lux_properties' },
          (payload) => {
            window.dispatchEvent(new CustomEvent('luxea:property_updated', { detail: payload }));
            window.dispatchEvent(new CustomEvent('luxea:data_updated', { detail: { table: 'lux_properties', payload } }));
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Public realtime error:', e);
    }
  }

  // Admin Realtime subscriptions are initialized ONLY after verified admin JWT check
  function initAdminRealtimeSubscriptions() {
    if (!supabase || adminRealtimeChannel) return;
    try {
      adminRealtimeChannel = supabase
        .channel('lux_admin_ops')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lux_hosts' }, (payload) => {
          window.dispatchEvent(new CustomEvent('luxea:host_updated', { detail: payload }));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lux_profiles' }, (payload) => {
          window.dispatchEvent(new CustomEvent('luxea:profile_updated', { detail: payload }));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lux_host_waitlist' }, (payload) => {
          window.dispatchEvent(new CustomEvent('luxea:host_waitlist_updated', { detail: payload }));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lux_waitlist' }, (payload) => {
          window.dispatchEvent(new CustomEvent('luxea:waitlist_updated', { detail: payload }));
        })
        .subscribe();
    } catch (e) {
      console.warn('Admin realtime error:', e);
    }
  }

  function stopAdminRealtimeSubscriptions() {
    if (adminRealtimeChannel && supabase) {
      try { supabase.removeChannel(adminRealtimeChannel); } catch (e) {}
      adminRealtimeChannel = null;
    }
  }

  async function getAccessToken() {
    const client = supabase || init();
    if (!client || !client.auth) return null;
    try {
      const { data } = await client.auth.getSession();
      return data?.session?.access_token || null;
    } catch (e) {
      return null;
    }
  }

  async function callEdgeFunction(type, record, { requireAuth = false } = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'apikey': ACTIVE_ANON_KEY
    };

    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (requireAuth) {
      return { success: false, error: 'Authentication required.' };
    }

    try {
      const res = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type, record })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, status: res.status, error: data.error || `Request failed (${res.status})` };
      }
      return data;
    } catch (err) {
      return { success: false, error: err.message || 'Network error' };
    }
  }

  window.LuxeaDB = {
    getClient: function () {
      if (!supabase) init();
      return supabase;
    },

    isConfigured: function () {
      return true;
    },

    initAdminRealtime: initAdminRealtimeSubscriptions,
    stopAdminRealtime: stopAdminRealtimeSubscriptions,

    // =========================================================================
    // 1. STORAGE BUCKETS ("lux_listings" public, "lux_documents" PRIVATE)
    //    Includes automatic browser-side WebP compression (~90-95% lighter!)
    // =========================================================================

    compressImageToWebp: async function (file, maxDim = 1280, quality = 0.8) {
      if (!file || !file.type || !file.type.startsWith('image/')) return file;
      // Skip tiny files already under 140KB
      if (file.size && file.size < 140 * 1024 && file.type === 'image/webp') return file;
      try {
        const bitmap = await createImageBitmap(file);
        let w = bitmap.width;
        let h = bitmap.height;
        if (w > maxDim || h > maxDim) {
          if (w >= h) { h = Math.round((h * maxDim) / w); w = maxDim; }
          else { w = Math.round((w * maxDim) / h); h = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0, w, h);
        bitmap.close?.();

        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
        if (!blob || blob.size === 0) return file;
        const baseName = (file.name || 'photo').replace(/\.[^.]+$/, '');
        return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
      } catch (e) {
        return file;
      }
    },

    uploadListingPhoto: async function (file, folder = 'properties') {
      const client = this.getClient();
      if (!client || !file) return null;

      const allowedFolders = ['properties', 'hosts', 'host_applications', 'laundry'];
      const safeFolder = allowedFolders.includes(folder) ? folder : 'properties';

      try {
        const optimized = await this.compressImageToWebp(file, 1280, 0.8);
        const rawExt = (optimized.name || 'photo.webp').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
        const ext = ['jpg', 'jpeg', 'png', 'webp'].includes(rawExt) ? rawExt : 'webp';
        const safeName = (optimized.name || 'photo').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
        const path = `${safeFolder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${safeName}.${ext}`;

        const uploadPromise = client.storage
          .from('lux_listings')
          .upload(path, optimized, {
            cacheControl: '31536000',
            contentType: optimized.type || 'image/webp',
            upsert: false
          });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Upload timeout')), 15000)
        );

        const res = await Promise.race([uploadPromise, timeoutPromise]);
        if (res && res.error) {
          console.warn('Listing photo upload rejected:', res.error.message);
          return null;
        }

        const { data: publicUrlData } = client.storage
          .from('lux_listings')
          .getPublicUrl(path);

        return publicUrlData ? publicUrlData.publicUrl : null;
      } catch (err) {
        console.warn('Photo upload exception:', err.message);
        return null;
      }
    },

    uploadListingPhotos: async function (files, folder = 'properties') {
      if (!files || files.length === 0) return [];
      const fileList = Array.from(files).slice(0, 6);
      const results = await Promise.all(fileList.map((f) => this.uploadListingPhoto(f, folder)));
      return results.filter(Boolean);
    },

    /**
     * Upload private KYC/verification documents to PRIVATE "lux_documents" bucket.
     * Stores only the object path (never a public URL); admins open via short-lived signed URLs.
     */
    uploadDocument: async function (file, folder = 'host_ids') {
      const client = this.getClient();
      if (!client || !file) return null;

      const safeFolder = folder === 'business_reg' ? 'business_reg' : 'host_ids';
      try {
        const rawExt = (file.name || 'doc.pdf').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
        const ext = ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(rawExt) ? rawExt : 'pdf';
        const path = `${safeFolder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

        const { error } = await client.storage
          .from('lux_documents')
          .upload(path, file, { cacheControl: '3600', upsert: false });

        if (error) {
          console.warn('Document storage upload error:', error.message);
          return null;
        }
        return path;
      } catch (err) {
        console.error('File upload exception:', err);
        return null;
      }
    },

    /**
     * Request a short-lived (5 minute) signed URL for a private KYC document (Admin JWT required).
     */
    getSignedDocumentUrl: async function (pathOrUrl) {
      if (!pathOrUrl) return null;
      const res = await callEdgeFunction('admin_get_signed_doc_url', { path: pathOrUrl }, { requireAuth: true });
      if (res && res.success && res.signedUrl) return res.signedUrl;
      return null;
    },

    // =========================================================================
    // 2. PROPERTIES & LIVE AVAILABILITY
    // =========================================================================

    fetchProperties: async function () {
      const client = this.getClient();
      if (client) {
        try {
          const { data, error } = await client
            .from('lux_properties')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && Array.isArray(data)) {
            return data;
          }
        } catch (e) {
          console.warn('Fetch properties error:', e);
        }
      }
      return [];
    },

    updatePropertyAvailability: async function (propertyId, isAvailable) {
      const client = this.getClient();
      if (!client) return { success: false, error: 'Database unavailable' };

      try {
        const { data, error } = await client
          .from('lux_properties')
          .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
          .eq('id', propertyId)
          .select();

        if (error) {
          console.warn('Supabase availability update error:', error.message);
          return { success: false, error: error.message };
        }

        window.dispatchEvent(new CustomEvent('luxea:property_updated', {
          detail: { eventType: 'UPDATE', new: { id: propertyId, is_available: isAvailable } }
        }));
        return { success: true, propertyId, isAvailable, data };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    updatePropertyDates: async function (propertyId, { availableFrom, availableTo, blockedDates = [] }) {
      const client = this.getClient();
      if (!client) return { success: false, error: 'Database unavailable' };

      try {
        const updatePayload = { updated_at: new Date().toISOString() };
        if (availableFrom) updatePayload.available_from = availableFrom;
        if (availableTo) updatePayload.available_to = availableTo;
        if (blockedDates) updatePayload.blocked_dates = blockedDates;

        const { data, error } = await client
          .from('lux_properties')
          .update(updatePayload)
          .eq('id', propertyId)
          .select();

        if (error) return { success: false, error: error.message };

        window.dispatchEvent(new CustomEvent('luxea:property_updated', {
          detail: { eventType: 'UPDATE', new: { id: propertyId, available_from: availableFrom, available_to: availableTo, blocked_dates: blockedDates } }
        }));
        return { success: true, data };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    appendPropertyPhotos: async function (propertyId, newPhotoUrls = []) {
      if (!newPhotoUrls || newPhotoUrls.length === 0) return { success: false };
      const client = this.getClient();
      if (!client) return { success: false };

      try {
        const { data: prop } = await client
          .from('lux_properties')
          .select('gallery_images, cover_image_url')
          .eq('id', propertyId)
          .single();

        const existing = (prop && Array.isArray(prop.gallery_images)) ? prop.gallery_images : [];
        const updatedGallery = [...new Set([...existing, ...newPhotoUrls])];
        const updatedCover = (prop && prop.cover_image_url) || updatedGallery[0];

        const { error } = await client
          .from('lux_properties')
          .update({
            gallery_images: updatedGallery,
            cover_image_url: updatedCover,
            updated_at: new Date().toISOString()
          })
          .eq('id', propertyId)
          .select();

        if (error) return { success: false, error: error.message };

        window.dispatchEvent(new CustomEvent('luxea:property_updated', {
          detail: { eventType: 'UPDATE', new: { id: propertyId, gallery_images: updatedGallery, cover_image_url: updatedCover } }
        }));
        return { success: true, propertyId, gallery: updatedGallery };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    updatePropertyListing: async function (propertyId, updates = {}) {
      const client = this.getClient();
      if (!client) return null;

      try {
        const dbPayload = { updated_at: new Date().toISOString() };
        if (updates.name) dbPayload.name = updates.name;
        if (updates.propertyType) {
          dbPayload.property_type = updates.propertyType;
          dbPayload.category = updates.propertyType;
        }
        if (updates.city) {
          dbPayload.city = updates.city;
          dbPayload.location_group = updates.city.toLowerCase();
        }
        if (updates.priceKes !== undefined) dbPayload.price_per_night_kes = parseFloat(updates.priceKes);
        if (updates.priceUsd !== undefined) dbPayload.price_per_night_usd = parseFloat(updates.priceUsd);

        const { data, error } = await client
          .from('lux_properties')
          .update(dbPayload)
          .eq('id', propertyId)
          .select();

        if (error) return null;
        const updatedObj = data && data[0] ? data[0] : { id: propertyId, ...updates };
        window.dispatchEvent(new CustomEvent('luxea:property_updated', {
          detail: { eventType: 'UPDATE', new: updatedObj }
        }));
        return updatedObj;
      } catch (err) {
        return null;
      }
    },

    deletePropertyListing: async function (propertyId) {
      const client = this.getClient();
      if (!client) return { success: false };

      try {
        const { error } = await client
          .from('lux_properties')
          .delete()
          .eq('id', propertyId);

        if (error) {
          // Soft-deactivate if hard delete restricted
          await client
            .from('lux_properties')
            .update({ is_active: false, is_available: false, updated_at: new Date().toISOString() })
            .eq('id', propertyId);
        }

        window.dispatchEvent(new CustomEvent('luxea:property_updated', {
          detail: { eventType: 'DELETE', old: { id: propertyId } }
        }));
        return { success: true, id: propertyId };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    addPropertyListing: async function (listingData, photoFiles = []) {
      const client = this.getClient();
      if (!client) return null;

      const { data: userData } = await client.auth.getUser();
      const authUser = userData?.user;
      if (!authUser) {
        throw new Error('Please sign in as an approved host or admin to publish a stay.');
      }

      let photoUrls = [];
      if (photoFiles && photoFiles.length > 0) {
        photoUrls = await this.uploadListingPhotos(photoFiles, 'properties');
      }

      const coverImage = photoUrls[0] || listingData.coverImage || '/assets/images/stays/westlands_loft_1.webp';
      const gallery = photoUrls.length > 0 ? photoUrls : [coverImage];

      const newProperty = {
        id: crypto.randomUUID(),
        slug: (listingData.name || 'stay').toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-${Date.now().toString().slice(-4)}`,
        name: listingData.name,
        category: listingData.category || 'apartment',
        property_type: listingData.propertyType || 'apartment',
        tagline: listingData.tagline || 'Curated luxury stay in Kenya',
        description: listingData.description || 'Modern luxury stay curated by Luxea.',
        county: listingData.county || 'Nairobi',
        city: listingData.city || 'Nairobi',
        area: listingData.area || 'Westlands',
        location_group: listingData.locationGroup || 'westlands',
        price_per_night_usd: parseFloat(listingData.priceUsd) || 120,
        price_per_night_kes: parseFloat(listingData.priceKes) || 15600,
        bedrooms: parseInt(listingData.bedrooms) || 2,
        bathrooms: parseFloat(listingData.bathrooms) || 2,
        square_feet: parseInt(listingData.squareFeet) || 1400,
        rating: 5.0,
        reviews_count: 1,
        cover_image_url: coverImage,
        gallery_images: gallery,
        amenities: listingData.amenities || ['High-Speed WiFi', 'Secure Parking', 'Air Conditioning'],
        is_featured: false,
        is_active: true,
        is_available: true,
        available_from: listingData.availableFrom || new Date().toISOString().split('T')[0],
        available_to: listingData.availableTo || null,
        blocked_dates: listingData.blockedDates || [],
        host_ref_id: listingData.hostRefId || null,
        owner_id: authUser.id,
        created_at: new Date().toISOString()
      };

      const { data, error } = await client.from('lux_properties').insert([newProperty]).select();
      if (error) {
        throw new Error(error.message);
      }

      const inserted = (data && data[0]) || newProperty;
      window.dispatchEvent(new CustomEvent('luxea:property_updated', {
        detail: { eventType: 'INSERT', new: inserted }
      }));
      return inserted;
    },

    // =========================================================================
    // 3. HOST APPLICATION & PRIVACY-SAFE STATUS LOOKUP
    // =========================================================================

    submitHostApplication: async function (hostData, files = {}) {
      const client = this.getClient();
      if (!client) throw new Error('Database client unavailable');

      let idPath = null;
      let photoUrls = [];
      let bizPath = null;

      if (files.idFile) idPath = await this.uploadDocument(files.idFile, 'host_ids');
      if (files.photos && files.photos.length > 0) {
        photoUrls = await this.uploadListingPhotos(files.photos, 'host_applications');
      }
      if (files.bizFile) bizPath = await this.uploadDocument(files.bizFile, 'business_reg');

      const dbRow = {
        ref_id: hostData.refId,
        full_name: hostData.fullName,
        national_id: hostData.nationalId,
        phone: hostData.phone,
        email: (hostData.email || '').trim().toLowerCase(),
        kra_pin: hostData.kraPin,
        dob: hostData.dob,
        property_name: hostData.propertyName,
        property_type: hostData.propertyType,
        property_address: hostData.propertyAddress,
        county: hostData.county,
        area_suburb: hostData.area,
        google_maps_link: hostData.mapsLink || null,
        bedrooms: parseFloat(hostData.bedrooms) || 1,
        bathrooms: parseFloat(hostData.bathrooms) || 1,
        max_guests: parseInt(hostData.maxGuests) || 2,
        amenities: hostData.amenities,
        other_amenities: hostData.otherAmenity || '',
        payout_method: hostData.payoutDetails.method,
        mpesa_name: hostData.payoutDetails.name || null,
        mpesa_number: hostData.payoutDetails.number || null,
        bank_name: hostData.payoutDetails.bank || null,
        bank_account_number: hostData.payoutDetails.account || null,
        bank_account_name: hostData.payoutDetails.accName || null,
        id_document_url: idPath,
        property_photos_urls: photoUrls,
        business_reg_url: bizPath,
        declaration_agreed: true,
        signature: hostData.signature,
        signature_date: hostData.signatureDate,
        review_status: 'pending_review',
        is_suspended: false,
        is_delisted: false,
        internal_notes: null
      };

      const { error } = await client.from('lux_hosts').insert([dbRow]);
      if (error) {
        throw new Error(error.message);
      }

      // Emails are dispatched automatically & securely by the authenticated DB pg_net trigger
      return { ref_id: dbRow.ref_id, property_name: dbRow.property_name, review_status: 'pending_review' };
    },

    /**
     * Privacy-safe application status lookup via Edge Function (requires BOTH exact Ref ID + Email).
     * Never exposes KYC/payout fields.
     */
    lookupHostStatus: async function (refId, email) {
      return await callEdgeFunction('lookup_host_status', { ref_id: refId, email });
    },

    // =========================================================================
    // 4. GUEST & HOST WAITLISTS (Emails fired securely by DB pg_net triggers)
    // =========================================================================

    submitWaitlistGuest: async function (guestData) {
      const client = this.getClient();
      if (!client) throw new Error('Database client unavailable');

      const dbRow = {
        pass_number: guestData.passNumber,
        pass_code: guestData.passCode,
        full_name: guestData.fullName,
        email: (guestData.email || '').trim().toLowerCase(),
        phone: guestData.phone,
        preferred_destinations: guestData.destinations,
        tier: 'Founding Circle',
        status: 'active'
      };

      const { error } = await client.from('lux_waitlist').insert([dbRow]);
      if (error) throw new Error(error.message);
      return dbRow;
    },

    submitHostWaitlist: async function (hostData) {
      const client = this.getClient();
      if (!client) throw new Error('Database client unavailable');

      const dbRow = {
        pass_number: hostData.passNumber,
        pass_code: hostData.passCode,
        full_name: hostData.fullName,
        email: (hostData.email || '').trim().toLowerCase(),
        phone: hostData.phone || '',
        property_name: hostData.propertyName || 'Luxury Residence',
        property_type: hostData.propertyType || 'Villa',
        region: hostData.region || 'Nairobi',
        bedrooms: hostData.bedrooms ? Number(hostData.bedrooms) : 1,
        operational_status: hostData.operationalStatus || 'Active',
        portfolio_link: hostData.portfolioLink || '',
        notes: hostData.notes || '',
        tier: 'Founding Host Partner',
        commission_perk: '0% for 90 Days',
        status: 'waitlisted'
      };

      const { error } = await client.from('lux_host_waitlist').insert([dbRow]);
      if (error) throw new Error(error.message);
      return dbRow;
    },

    // =========================================================================
    // 5. ADMIN DATA QUERIES (Strictly RLS-Protected, Zero PII localStorage Cache)
    // =========================================================================

    fetchHosts: async function () {
      const client = this.getClient();
      if (!client) return [];
      const { data, error } = await client
        .from('lux_hosts')
        .select('*')
        .order('created_at', { ascending: false });
      return (!error && Array.isArray(data)) ? data : [];
    },

    fetchWaitlist: async function () {
      const client = this.getClient();
      if (!client) return [];
      const { data, error } = await client
        .from('lux_waitlist')
        .select('*')
        .order('created_at', { ascending: false });
      return (!error && Array.isArray(data)) ? data : [];
    },

    fetchHostWaitlist: async function () {
      const client = this.getClient();
      if (!client) return [];
      const { data, error } = await client
        .from('lux_host_waitlist')
        .select('*')
        .order('created_at', { ascending: false });
      return (!error && Array.isArray(data)) ? data : [];
    },

    fetchProfiles: async function () {
      const client = this.getClient();
      if (!client) return [];
      const { data, error } = await client
        .from('lux_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      return (!error && Array.isArray(data)) ? data : [];
    },

    updateHostStatus: async function (refId, newStatus) {
      const client = this.getClient();
      if (!client) return { success: false, error: 'Database client unavailable' };

      const cleanRef = String(refId || '').trim();
      const now = new Date().toISOString();

      let res = await client
        .from('lux_hosts')
        .update({ review_status: newStatus, updated_at: now })
        .eq('ref_id', cleanRef)
        .select();

      if ((!res.data || res.data.length === 0) && cleanRef.includes('@')) {
        res = await client
          .from('lux_hosts')
          .update({ review_status: newStatus, updated_at: now })
          .ilike('email', cleanRef)
          .select();
      }

      if (res.error) return { success: false, error: res.error.message };
      const updatedRecord = res.data && res.data[0] ? res.data[0] : null;

      if (updatedRecord) {
        if (updatedRecord.email) {
          await client
            .from('lux_profiles')
            .update({ role: newStatus === 'approved' ? 'host' : 'member', updated_at: now })
            .ilike('email', updatedRecord.email);

          await client
            .from('lux_host_waitlist')
            .update({ status: newStatus, updated_at: now })
            .ilike('email', updatedRecord.email);
        }

        if (newStatus === 'approved') {
          const { data: existingProp } = await client
            .from('lux_properties')
            .select('id')
            .eq('host_ref_id', updatedRecord.ref_id);

          if (!existingProp || existingProp.length === 0) {
            const newProp = {
              name: updatedRecord.property_name || `${updatedRecord.full_name}'s Residence`,
              slug: (updatedRecord.property_name || `stay-${updatedRecord.ref_id}`)
                .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + `-${Date.now().toString().slice(-4)}`,
              category: (updatedRecord.property_type || 'Apartment').toLowerCase(),
              property_type: (updatedRecord.property_type || 'Apartment').toLowerCase(),
              tagline: `Curated luxury stay in ${updatedRecord.area_suburb || updatedRecord.county || 'Kenya'}`,
              description: updatedRecord.host_bio || 'Curated luxury residence verified by Luxea Living.',
              county: updatedRecord.county || 'Nairobi',
              city: updatedRecord.area_suburb || 'Nairobi',
              area: updatedRecord.area_suburb || 'Westlands',
              location_group: (updatedRecord.area_suburb || updatedRecord.county || 'westlands').toLowerCase(),
              price_per_night_usd: 150,
              price_per_night_kes: 19500,
              bedrooms: updatedRecord.bedrooms || 2,
              bathrooms: updatedRecord.bathrooms || 2,
              square_feet: 1600,
              rating: 5.0,
              reviews_count: 1,
              cover_image_url: (updatedRecord.property_photos_urls && updatedRecord.property_photos_urls[0]) || '/assets/images/hero-1.webp',
              gallery_images: updatedRecord.property_photos_urls || [],
              amenities: ['High-Speed WiFi', 'Secure Parking', 'Air Conditioning', 'Private Balcony'],
              is_featured: false,
              is_active: true,
              is_available: true,
              host_ref_id: updatedRecord.ref_id,
              owner_id: updatedRecord.user_id || null,
              created_at: now
            };
            await client.from('lux_properties').insert([newProp]);
          }
          // Stage 2 approval email + cryptographically signed activation link is fired automatically by DB trigger!
        }
      }

      window.dispatchEvent(new CustomEvent('luxea:host_updated', {
        detail: { eventType: 'UPDATE', refId: cleanRef, newStatus }
      }));
      return { success: true, newStatus, record: updatedRecord };
    },

    updateProfileRole: async function (userId, newRole) {
      const client = this.getClient();
      if (!client) return { success: false, error: 'Database client not initialized' };
      const { data, error } = await client
        .from('lux_profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select();

      if (error) return { success: false, error: error.message };
      return { success: true, data };
    },

    provisionUser: async function (accountData) {
      const res = await callEdgeFunction('admin_provision_user', accountData, { requireAuth: true });
      if (res && res.success) {
        window.dispatchEvent(new CustomEvent('luxea:dataUpdated'));
      }
      return res;
    },

    updateHostProfile: async function (emailOrRef, updates) {
      const client = this.getClient();
      if (!client) return { success: false, error: 'Supabase client unavailable' };

      try {
        const email = updates.email;
        const now = new Date().toISOString();

        let hostQuery = client.from('lux_hosts').update({
          full_name: updates.full_name,
          phone: updates.phone,
          property_name: updates.property_name,
          property_type: updates.property_type,
          county: updates.county,
          area_suburb: updates.area,
          host_bio: updates.bio,
          avatar_url: updates.avatar_url,
          property_photos_urls: updates.property_photos_urls,
          updated_at: now
        });

        if (updates.ref_id && updates.ref_id !== 'LUX-USER') hostQuery = hostQuery.eq('ref_id', updates.ref_id);
        else if (email) hostQuery = hostQuery.ilike('email', email);

        const { data: hostData, error: hostErr } = await hostQuery.select();
        if (hostErr) console.warn('Update lux_hosts error:', hostErr.message);

        if (email) {
          const profUpdate = {
            full_name: updates.full_name,
            phone: updates.phone,
            avatar_url: updates.avatar_url,
            bio: updates.bio,
            updated_at: now
          };
          if (updates.role) profUpdate.role = updates.role;
          await client.from('lux_profiles').update(profUpdate).ilike('email', email);
        }

        window.dispatchEvent(new CustomEvent('luxea:host_updated', { detail: { email, updates } }));
        return { success: true, hostData };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    toggleHostSuspension: async function (email, isSuspended) {
      const client = this.getClient();
      if (!client || !email) return { success: false };

      try {
        const cleanEmail = email.toLowerCase().trim();
        const now = new Date().toISOString();

        await client.from('lux_hosts').update({
          is_suspended: isSuspended,
          review_status: isSuspended ? 'suspended' : 'approved',
          updated_at: now
        }).ilike('email', cleanEmail);

        await client.from('lux_profiles').update({
          is_suspended: isSuspended,
          role: isSuspended ? 'suspended' : 'host',
          updated_at: now
        }).ilike('email', cleanEmail);

        window.dispatchEvent(new CustomEvent('luxea:host_updated', { detail: { email: cleanEmail, isSuspended } }));
        return { success: true, isSuspended };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    toggleHostDelist: async function (email, isDelisted) {
      const client = this.getClient();
      if (!client || !email) return { success: false };

      try {
        const cleanEmail = email.toLowerCase().trim();
        const now = new Date().toISOString();

        await client.from('lux_hosts').update({
          is_delisted: isDelisted,
          updated_at: now
        }).ilike('email', cleanEmail);

        const { data: hostRows } = await client
          .from('lux_hosts')
          .select('ref_id, property_name')
          .ilike('email', cleanEmail);

        if (hostRows && hostRows.length > 0) {
          const refId = hostRows[0].ref_id;
          if (refId) {
            await client.from('lux_properties').update({
              is_active: !isDelisted,
              is_available: !isDelisted,
              updated_at: now
            }).eq('host_ref_id', refId);
          }
        }

        window.dispatchEvent(new CustomEvent('luxea:property_updated', { detail: { email: cleanEmail, isDelisted } }));
        return { success: true, isDelisted };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // =========================================================================
    // 6. LAUNDRY PARTNERS & ORDERS (COLUMN-SAFE PUBLIC READ + STRICT AUTH OPS)
    // =========================================================================

    registerLaundryPartner: async function (partnerData) {
      const client = this.getClient();
      if (!client) throw new Error('Database client unavailable');

      const { data: userData } = await client.auth.getUser();
      const refId = `LXL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newPartner = {
        id: crypto.randomUUID(),
        ref_id: refId,
        user_id: userData?.user?.id || null,
        business_name: partnerData.businessName,
        contact_person: partnerData.contactPerson,
        phone: partnerData.phone,
        email: (partnerData.email || '').trim().toLowerCase() || null,
        mpesa_number: partnerData.mpesaNumber || partnerData.phone,
        coverage_areas: partnerData.coverageAreas || ['Westlands', 'Kilimani', 'Ruaka'],
        price_wash_fold_per_kg: parseFloat(partnerData.priceWashFold) || 250,
        price_linen_turnover_set: parseFloat(partnerData.priceLinenTurnover) || 1500,
        price_dry_clean_suit: parseFloat(partnerData.priceDryClean) || 900,
        express_available: partnerData.expressAvailable !== false,
        status: 'pending',
        rating: 5.0,
        completed_orders_count: 0,
        created_at: new Date().toISOString()
      };

      const { error } = await client.from('lux_laundry_partners').insert([newPartner]);
      if (error) throw new Error(error.message);
      return newPartner;
    },

    fetchLaundryPartners: async function () {
      const client = this.getClient();
      if (!client) return [];

      try {
        const { data: sessData } = await client.auth.getSession();
        const cols = sessData?.session ? '*' : PUBLIC_LAUNDRY_COLUMNS;
        const { data, error } = await client
          .from('lux_laundry_partners')
          .select(cols)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) return data;
      } catch (e) {
        console.warn('Fetch laundry partners error:', e);
      }
      return [];
    },

    createLaundryOrder: async function (orderData) {
      const client = this.getClient();
      if (!client) throw new Error('Database client unavailable');

      const { data: userData } = await client.auth.getUser();
      const orderNum = `ORD-LX-${Math.floor(100000 + Math.random() * 900000)}`;

      const newOrder = {
        id: crypto.randomUUID(),
        order_number: orderNum,
        customer_user_id: userData?.user?.id || null,
        customer_name: orderData.customerName,
        customer_phone: orderData.customerPhone,
        customer_email: (orderData.customerEmail || userData?.user?.email || '').trim().toLowerCase() || null,
        order_type: orderData.orderType || 'guest_valet',
        property_name: orderData.propertyName || 'Luxea Residence',
        unit_number: orderData.unitNumber || '',
        location_area: orderData.locationArea || 'Westlands',
        pickup_date: orderData.pickupDate || new Date().toISOString().split('T')[0],
        pickup_time_slot: orderData.pickupTimeSlot || '10:00 AM - 12:00 PM',
        service_type: orderData.serviceType || 'Wash & Fold',
        estimated_weight_or_items: orderData.estimatedWeightOrItems || '1 Bag (~5kg)',
        special_instructions: orderData.specialInstructions || '',
        total_amount_kes: parseFloat(orderData.totalAmountKes) || 1250,
        payment_status: 'pending',
        status: 'requested',
        assigned_partner_id: orderData.assignedPartnerId || null,
        created_at: new Date().toISOString()
      };

      const { error } = await client.from('lux_laundry_orders').insert([newOrder]);
      if (error) throw new Error(error.message);

      window.dispatchEvent(new CustomEvent('luxea:laundry_order_created', { detail: newOrder }));
      return newOrder;
    },

    fetchLaundryOrders: async function () {
      const client = this.getClient();
      if (!client) return [];
      const { data, error } = await client
        .from('lux_laundry_orders')
        .select('*')
        .order('created_at', { ascending: false });
      return (!error && Array.isArray(data)) ? data : [];
    },

    updateLaundryOrderStatus: async function (orderId, newStatus, partnerId = null) {
      const client = this.getClient();
      if (!client) return null;

      const updatePayload = { status: newStatus, updated_at: new Date().toISOString() };
      if (partnerId) updatePayload.assigned_partner_id = partnerId;

      const { data, error } = await client
        .from('lux_laundry_orders')
        .update(updatePayload)
        .eq('id', orderId)
        .select();

      if (error) return null;
      const updatedOrder = (data && data[0]) || { id: orderId, status: newStatus };
      window.dispatchEvent(new CustomEvent('luxea:laundry_order_updated', { detail: updatedOrder }));
      return updatedOrder;
    },

    getCurrentLaundryPartner: async function () {
      const client = this.getClient();
      if (!client) return null;
      const { data: userData } = await client.auth.getUser();
      if (!userData?.user) return null;

      const { data } = await client
        .from('lux_laundry_partners')
        .select('*')
        .eq('user_id', userData.user.id)
        .eq('status', 'approved')
        .maybeSingle();
      return data || null;
    },

    updateLaundryPartner: async function (refOrId, updates = {}) {
      const client = this.getClient();
      if (!client) return { success: false, error: 'Database unavailable' };
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(refOrId);
      const col = isUuid ? 'id' : 'ref_id';
      const payload = { ...updates, updated_at: new Date().toISOString() };
      const { data, error } = await client
        .from('lux_laundry_partners')
        .update(payload)
        .eq(col, refOrId)
        .select()
        .maybeSingle();
      if (error) return { success: false, error: error.message };
      return { success: true, data };
    },

    // =========================================================================
    // 7. BOOKINGS, HOST CALENDAR & CLIENT PAYMENT LEDGER (lux_bookings)
    // =========================================================================
    fetchBookings: async function ({ propertyId = null, hostRefId = null, limit = 200 } = {}) {
      const client = this.getClient();
      if (!client) return [];
      try {
        let q = client.from('lux_bookings').select('*').order('check_in', { ascending: false }).limit(limit);
        if (propertyId) q = q.eq('property_id', propertyId);
        if (hostRefId) q = q.eq('host_ref_id', hostRefId);
        const { data, error } = await q;
        if (error) {
          console.warn('Fetch bookings error:', error.message);
          return [];
        }
        return Array.isArray(data) ? data : [];
      } catch (e) {
        return [];
      }
    },

    getPropertyBookedDates: async function (propertyId) {
      const client = this.getClient();
      if (!client || !propertyId) return [];
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId);
      if (!isUuid) return [];
      try {
        const { data, error } = await client.rpc('get_property_booked_dates', { p_property_id: propertyId });
        if (error || !Array.isArray(data)) return [];
        return data;
      } catch (e) {
        return [];
      }
    },

    createBooking: async function (booking) {
      const client = this.getClient();
      if (!client) return { success: false, error: 'Database unavailable' };
      try {
        const { data: userData } = await client.auth.getUser();
        const uid = userData?.user?.id || null;
        const payload = {
          booking_code: booking.booking_code || `LXB-${Date.now().toString().slice(-6)}`,
          property_id: booking.property_id || null,
          property_name: booking.property_name || 'Luxea Stay',
          host_ref_id: booking.host_ref_id || null,
          owner_id: booking.owner_id || (booking.source && booking.source !== 'luxea' ? uid : null),
          guest_user_id: booking.guest_user_id || (booking.source === 'luxea' ? uid : null),
          guest_name: (booking.guest_name || '').trim(),
          guest_phone: (booking.guest_phone || '').trim() || null,
          guest_email: (booking.guest_email || '').trim() || null,
          guests_count: parseInt(booking.guests_count, 10) || 2,
          check_in: booking.check_in,
          check_out: booking.check_out,
          total_kes: parseFloat(booking.total_kes) || 0,
          amount_paid_kes: parseFloat(booking.amount_paid_kes) || 0,
          payment_method: booking.payment_method || 'M-Pesa',
          mpesa_code: (booking.mpesa_code || '').trim() || null,
          source: booking.source || 'luxea',
          status: booking.status || 'pending',
          auto_laundry: Boolean(booking.auto_laundry),
          notes: (booking.notes || '').trim() || null
        };

        const { data, error } = await client.from('lux_bookings').insert([payload]).select().maybeSingle();
        if (error) return { success: false, error: error.message };

        window.dispatchEvent(new CustomEvent('luxea:booking_updated', { detail: data || payload }));
        return { success: true, data: data || payload };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    updateBooking: async function (bookingId, updates = {}) {
      const client = this.getClient();
      if (!client || !bookingId) return { success: false, error: 'Invalid booking' };
      try {
        const { data, error } = await client
          .from('lux_bookings')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', bookingId)
          .select()
          .maybeSingle();
        if (error) return { success: false, error: error.message };
        window.dispatchEvent(new CustomEvent('luxea:booking_updated', { detail: data }));
        return { success: true, data };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // =========================================================================
    // 8. REVIEWS, COMPLAINTS & TRUST CREDITS (lux_reviews_complaints)
    // =========================================================================
    fetchReviewsAndComplaints: async function ({ targetType = null, targetId = null, kind = null, limit = 100 } = {}) {
      const client = this.getClient();
      if (!client) return [];
      try {
        let q = client.from('lux_reviews_complaints').select('*').order('created_at', { ascending: false }).limit(limit);
        if (targetType) q = q.eq('target_type', targetType);
        if (targetId) q = q.eq('target_id', String(targetId));
        if (kind) q = q.eq('kind', kind);
        const { data, error } = await q;
        if (error) return [];
        return Array.isArray(data) ? data : [];
      } catch (e) {
        return [];
      }
    },

    submitReviewOrComplaint: async function (entry) {
      const client = this.getClient();
      if (!client) return { success: false, error: 'Database unavailable' };
      try {
        const payload = {
          target_type: entry.target_type,
          target_id: String(entry.target_id),
          target_name: entry.target_name || '',
          booking_id: entry.booking_id || null,
          kind: entry.kind === 'complaint' ? 'complaint' : 'review',
          rating: entry.rating ? parseInt(entry.rating, 10) : (entry.kind === 'complaint' ? 1 : 5),
          category: entry.category || (entry.kind === 'complaint' ? 'Service' : 'Great Stay'),
          reviewer_name: (entry.reviewer_name || '').trim(),
          reviewer_phone: (entry.reviewer_phone || '').trim() || null,
          comment: (entry.comment || '').trim()
        };
        const { data, error } = await client.from('lux_reviews_complaints').insert([payload]).select().maybeSingle();
        if (error) return { success: false, error: error.message };
        return { success: true, data };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    resolveComplaint: async function (id, status = 'resolved', resolution = '') {
      const client = this.getClient();
      if (!client || !id) return { success: false, error: 'Invalid ID' };
      const { data, error } = await client
        .from('lux_reviews_complaints')
        .update({ status, admin_resolution: resolution, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) return { success: false, error: error.message };
      return { success: true, data };
    }
  };

  // =========================================================================
  // SERVER-VERIFIED SUPER ADMIN & ROLE AUTHENTICATION GATEWAY
  // Zero hardcoded passwords, zero client-side localStorage trust
  // =========================================================================
  window.LuxeaAuth = {
    /**
     * Authoritatively verifies the active Supabase Auth JWT with the backend
     * and checks public.lux_profiles for an active 'super_admin' or 'admin' role.
     */
    verifyAdminSession: async function () {
      const client = window.LuxeaDB.getClient();
      if (!client || !client.auth) return { valid: false };

      try {
        const { data: userData, error: userErr } = await client.auth.getUser();
        if (userErr || !userData?.user) {
          return { valid: false };
        }

        const { data: profile, error: profErr } = await client
          .from('lux_profiles')
          .select('id, email, full_name, role, is_suspended')
          .eq('id', userData.user.id)
          .maybeSingle();

        if (profErr || !profile || profile.is_suspended === true) {
          return { valid: false };
        }

        if (profile.role !== 'super_admin' && profile.role !== 'admin') {
          return { valid: false, reason: 'not_admin' };
        }

        return {
          valid: true,
          user: userData.user,
          profile,
          admin: {
            id: profile.id,
            email: profile.email,
            name: profile.full_name || profile.email,
            role: profile.role,
            isSuperAdmin: profile.role === 'super_admin'
          }
        };
      } catch (e) {
        return { valid: false };
      }
    },

    /**
     * Strict backend-authenticated admin sign-in (Supabase Auth password + lux_profiles role check).
     */
    loginAdmin: async function (email, password) {
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanPass = (password || '').trim();
      if (!cleanEmail || !cleanPass) {
        return { success: false, message: 'Email and password are required.' };
      }

      const client = window.LuxeaDB.getClient();
      if (!client || !client.auth) {
        return { success: false, message: 'Authentication service unavailable.' };
      }

      const { data, error } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass
      });

      if (error || !data?.user) {
        return { success: false, message: 'Invalid admin email or password.' };
      }

      const verification = await this.verifyAdminSession();
      if (!verification.valid) {
        await client.auth.signOut().catch(() => {});
        clearAllLocalCaches();
        return { success: false, message: 'Access denied. This account does not have active Administrator privileges.' };
      }

      return { success: true, user: verification.admin };
    },

    logoutAdmin: async function () {
      stopAdminRealtimeSubscriptions();
      clearAllLocalCaches();
      const client = window.LuxeaDB.getClient();
      if (client && client.auth) {
        try { await client.auth.signOut(); } catch (e) {}
      }
      return { success: true };
    },

    clearCaches: clearAllLocalCaches
  };

  init();
})();
