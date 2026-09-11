/**
 * LUXEA LIVING — SUPABASE CLIENT & DATA LAYER
 * Handles:
 * 1. Storage Buckets: "lux_listings" (property photos) & "lux_documents" (IDs, documents)
 * 2. Tables: "lux_hosts", "lux_waitlist", and "lux_properties"
 * 3. Realtime: Subscriptions on "lux_properties" for live availability toggling & dates
 */

(function () {
  let supabase = null;
  let realtimeChannel = null;

  function getCredentials() {
    try {
      const stored = JSON.parse(localStorage.getItem('luxea_supabase_credentials') || '{}');
      if (stored.url && stored.anonKey) return stored;
    } catch (e) {}

    if (window.LUXEA_CONFIG && window.LUXEA_CONFIG.supabase) {
      return window.LUXEA_CONFIG.supabase;
    }
    return null;
  }

  function init() {
    const creds = getCredentials();
    if (creds && window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        supabase = window.supabase.createClient(creds.url, creds.anonKey, {
          realtime: {
            params: {
              eventsPerSecond: 10
            }
          }
        });
        console.log('✅ Supabase initialized for Luxea Living:', creds.url);
        initRealtimeSubscriptions();
      } catch (err) {
        console.warn('⚠️ Supabase init failed:', err);
      }
    }
    return supabase;
  }

  function initRealtimeSubscriptions() {
    if (!supabase || realtimeChannel) return;

    try {
      realtimeChannel = supabase
        .channel('lux_realtime_all')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'lux_properties' },
          (payload) => {
            console.log('⚡ Supabase Realtime [lux_properties]:', payload);
            window.dispatchEvent(new CustomEvent('luxea:property_updated', { detail: payload }));
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'lux_hosts' },
          (payload) => {
            console.log('⚡ Supabase Realtime [lux_hosts]:', payload);
            window.dispatchEvent(new CustomEvent('luxea:host_updated', { detail: payload }));
          }
        )
        .subscribe((status) => {
          console.log('📡 Supabase Realtime Channel Status:', status);
        });
    } catch (e) {
      console.warn('Realtime subscription error:', e);
    }
  }

  window.LuxeaDB = {
    getClient: function () {
      if (!supabase) init();
      return supabase;
    },

    isConfigured: function () {
      const creds = getCredentials();
      return !!(creds && creds.url && !creds.url.includes('your-project-ref'));
    },

    saveCredentials: function (url, anonKey) {
      localStorage.setItem('luxea_supabase_credentials', JSON.stringify({ url, anonKey }));
      init();
    },

    clearCredentials: function () {
      localStorage.removeItem('luxea_supabase_credentials');
      if (realtimeChannel && supabase) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
      supabase = null;
    },

    // =========================================================================
    // 1. STORAGE BUCKET UPLOADS ("lux_listings" & "lux_documents")
    // =========================================================================

    /**
     * Upload property photos directly to the "lux_listings" public bucket
     */
    uploadListingPhoto: async function (file, folder = 'properties') {
      const client = this.getClient();
      if (!client || !file) return null;

      try {
        const ext = file.name.split('.').pop();
        const safeName = file.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
        const path = `${folder}/${Date.now()}_${safeName}.${ext}`;

        // Attempt upload to 'lux_listings' first, fallback to 'lux_documents'
        let bucket = 'lux_listings';
        let { data, error } = await client.storage
          .from(bucket)
          .upload(path, file, { cacheControl: '3600', upsert: true });

        if (error) {
          console.warn(`Upload to ${bucket} failed, trying fallback:`, error.message);
          bucket = 'lux_documents';
          const retry = await client.storage
            .from(bucket)
            .upload(path, file, { cacheControl: '3600', upsert: true });
          error = retry.error;
          data = retry.data;
        }

        if (error) {
          console.error('Supabase storage upload error:', error);
          return null;
        }

        const { data: publicUrlData } = client.storage
          .from(bucket)
          .getPublicUrl(path);

        return publicUrlData.publicUrl;
      } catch (err) {
        console.error('Photo upload exception:', err);
        return null;
      }
    },

    /**
     * Upload multiple property photos to "lux_listings"
     */
    uploadListingPhotos: async function (files, folder = 'properties') {
      const urls = [];
      for (const file of Array.from(files)) {
        const url = await this.uploadListingPhoto(file, folder);
        if (url) urls.push(url);
      }
      return urls;
    },

    /**
     * Upload verification documents (ID, business certificates) to "lux_documents"
     */
    uploadDocument: async function (file, folder = 'documents') {
      const client = this.getClient();
      if (!client || !file) return null;

      try {
        const ext = file.name.split('.').pop();
        const path = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

        const { data, error } = await client.storage
          .from('lux_documents')
          .upload(path, file, { cacheControl: '3600', upsert: false });

        if (error) {
          console.warn('Document storage upload error:', error);
          return null;
        }

        const { data: publicUrlData } = client.storage
          .from('lux_documents')
          .getPublicUrl(path);

        return publicUrlData.publicUrl;
      } catch (err) {
        console.error('File upload exception:', err);
        return null;
      }
    },

    // =========================================================================
    // 2. HOST LISTING MANAGEMENT & LIVE AVAILABILITY / DATES
    // =========================================================================

    /**
     * Fetch all properties from Supabase "lux_properties"
     */
    fetchProperties: async function () {
      const client = this.getClient();
      if (client) {
        try {
          const { data, error } = await client
            .from('lux_properties')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data && data.length > 0) {
            localStorage.setItem('luxea_cached_properties', JSON.stringify(data));
            return data;
          }
        } catch (e) {
          console.warn('Fetch properties error:', e);
        }
      }

      // Fallback to locally saved properties
      return JSON.parse(localStorage.getItem('luxea_cached_properties') || '[]');
    },

    /**
     * Live Host Availability Toggle: Switch property ON (bookable) or OFF (unavailable)
     * Broadcasts via Realtime to all connected guests and stays pages
     */
    updatePropertyAvailability: async function (propertyId, isAvailable) {
      console.log(`Updating availability for ${propertyId} -> ${isAvailable}`);

      // 1. Update in local storage cache immediately
      const cached = JSON.parse(localStorage.getItem('luxea_cached_properties') || '[]');
      const idx = cached.findIndex(p => p.id === propertyId || p.slug === propertyId);
      if (idx !== -1) {
        cached[idx].is_available = isAvailable;
        cached[idx].updated_at = new Date().toISOString();
        localStorage.setItem('luxea_cached_properties', JSON.stringify(cached));
      }

      // Also track in host availability map
      const availMap = JSON.parse(localStorage.getItem('luxea_host_avail_map') || '{}');
      availMap[propertyId] = isAvailable;
      localStorage.setItem('luxea_host_avail_map', JSON.stringify(availMap));

      // 2. Update Supabase
      const client = this.getClient();
      if (client) {
        try {
          const { data, error } = await client
            .from('lux_properties')
            .update({ 
              is_available: isAvailable, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', propertyId)
            .select();

          if (error) console.warn('Supabase availability update error:', error.message);
          else console.log('✅ Supabase availability updated:', data);
        } catch (err) {
          console.error('Supabase update exception:', err);
        }
      }

      // 3. Dispatch local event for instant UI reaction
      window.dispatchEvent(new CustomEvent('luxea:property_updated', {
        detail: { eventType: 'UPDATE', new: { id: propertyId, is_available: isAvailable } }
      }));

      return { success: true, propertyId, isAvailable };
    },

    /**
     * Host Dates & Blackout Management: Set available date range or blocked dates
     */
    updatePropertyDates: async function (propertyId, { availableFrom, availableTo, blockedDates = [] }) {
      console.log(`Updating dates for ${propertyId}:`, { availableFrom, availableTo, blockedDates });

      // Update local storage
      const cached = JSON.parse(localStorage.getItem('luxea_cached_properties') || '[]');
      const idx = cached.findIndex(p => p.id === propertyId || p.slug === propertyId);
      if (idx !== -1) {
        if (availableFrom) cached[idx].available_from = availableFrom;
        if (availableTo) cached[idx].available_to = availableTo;
        if (blockedDates) cached[idx].blocked_dates = blockedDates;
        localStorage.setItem('luxea_cached_properties', JSON.stringify(cached));
      }

      const datesMap = JSON.parse(localStorage.getItem('luxea_host_dates_map') || '{}');
      datesMap[propertyId] = { availableFrom, availableTo, blockedDates };
      localStorage.setItem('luxea_host_dates_map', JSON.stringify(datesMap));

      const client = this.getClient();
      if (client) {
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

          if (error) console.warn('Supabase dates update error:', error.message);
          else console.log('✅ Supabase dates updated:', data);
        } catch (err) {
          console.error('Supabase dates update exception:', err);
        }
      }

      window.dispatchEvent(new CustomEvent('luxea:property_updated', {
        detail: { eventType: 'UPDATE', new: { id: propertyId, available_from: availableFrom, available_to: availableTo, blocked_dates: blockedDates } }
      }));

      return { success: true };
    },

    /**
     * Host Add New Listing: Uploads photos to "lux_listings" and inserts into "lux_properties"
     */
    addPropertyListing: async function (listingData, photoFiles = []) {
      const client = this.getClient();

      // 1. Upload photos to bucket
      let photoUrls = [];
      if (photoFiles && photoFiles.length > 0) {
        photoUrls = await this.uploadListingPhotos(photoFiles, 'properties');
      }

      const coverImage = photoUrls[0] || listingData.coverImage || '/assets/images/villa.jpg';
      const gallery = photoUrls.length > 0 ? photoUrls : [coverImage];

      const newProperty = {
        id: crypto.randomUUID ? crypto.randomUUID() : `prop-${Date.now()}`,
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
        host_ref_id: listingData.hostRefId || 'LXH-HOST-DIRECT',
        created_at: new Date().toISOString()
      };

      // 2. Save locally
      const cached = JSON.parse(localStorage.getItem('luxea_cached_properties') || '[]');
      cached.unshift(newProperty);
      localStorage.setItem('luxea_cached_properties', JSON.stringify(cached));

      // 3. Insert into Supabase
      if (client) {
        try {
          const { data, error } = await client.from('lux_properties').insert([newProperty]);
          if (error) console.warn('Supabase insert error into lux_properties:', error.message);
          else console.log('✅ Supabase listing inserted:', data);
        } catch (err) {
          console.error('Supabase listing insert exception:', err);
        }
      }

      window.dispatchEvent(new CustomEvent('luxea:property_updated', {
        detail: { eventType: 'INSERT', new: newProperty }
      }));

      return newProperty;
    },

    // =========================================================================
    // 3. HOST REGISTRATION APPLICATION
    // =========================================================================
    submitHostApplication: async function (hostData, files = {}) {
      const client = this.getClient();

      let idUrl = null;
      let photoUrls = [];
      let bizUrl = null;

      if (client) {
        if (files.idFile) idUrl = await this.uploadDocument(files.idFile, 'host_ids');
        if (files.photos && files.photos.length > 0) {
          // Upload property photos to the 'lux_listings' bucket!
          photoUrls = await this.uploadListingPhotos(files.photos, 'host_applications');
        }
        if (files.bizFile) bizUrl = await this.uploadDocument(files.bizFile, 'business_reg');
      }

      const dbRow = {
        ref_id: hostData.refId,
        full_name: hostData.fullName,
        national_id: hostData.nationalId,
        phone: hostData.phone,
        email: hostData.email,
        kra_pin: hostData.kraPin,
        dob: hostData.dob,
        property_name: hostData.propertyName,
        property_type: hostData.propertyType,
        property_address: hostData.propertyAddress,
        county: hostData.county,
        area_suburb: hostData.area,
        google_maps_link: hostData.mapsLink,
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
        id_document_url: idUrl || hostData.idUploaded || null,
        property_photos_urls: photoUrls,
        business_reg_url: bizUrl,
        declaration_agreed: true,
        signature: hostData.signature,
        signature_date: hostData.signatureDate,
        review_status: 'pending_review'
      };

      if (client) {
        try {
          const { data, error } = await client.from('lux_hosts').insert([dbRow]);
          if (error) console.error('Error inserting into lux_hosts:', error);
          else console.log('✅ Record inserted into lux_hosts:', data);
        } catch (err) {
          console.error('Supabase host insert exception:', err);
        }
      }

      // Also persist to local cache for instant UI availability
      const cached = JSON.parse(localStorage.getItem('luxea_host_applications') || '[]');
      cached.unshift(hostData);
      localStorage.setItem('luxea_host_applications', JSON.stringify(cached));

      // 📨 Dispatch Stage 1: Waiting for Verification & Audit email via Edge Function
      this.sendAutomatedEmail('host_waiting_verification', dbRow);

      return dbRow;
    },

    // =========================================================================
    // 4. GUEST WAITLIST
    // =========================================================================
    submitWaitlistGuest: async function (guestData) {
      const client = this.getClient();

      const dbRow = {
        pass_number: guestData.passNumber,
        pass_code: guestData.passCode,
        full_name: guestData.fullName,
        email: guestData.email,
        phone: guestData.phone,
        preferred_destinations: guestData.destinations,
        tier: 'Founding Circle',
        status: 'active'
      };

      if (client) {
        try {
          const { data, error } = await client.from('lux_waitlist').insert([dbRow]);
          if (error) console.error('Error inserting into lux_waitlist:', error);
          else console.log('✅ Record inserted into lux_waitlist:', data);
        } catch (err) {
          console.error('Supabase waitlist insert exception:', err);
        }
      }

      const cached = JSON.parse(localStorage.getItem('luxea_waitlist_guests') || '[]');
      cached.unshift(guestData);
      localStorage.setItem('luxea_waitlist_guests', JSON.stringify(cached));

      // 📨 Dispatch automated VIP Founding Circle welcome & digital pass email via Edge Function
      this.sendAutomatedEmail('guest_welcome', dbRow);

      return dbRow;
    },

    /**
     * Dispatch automated email via Supabase Edge Function & Resend
     * (Zero API keys exposed to browser)
     */
    sendAutomatedEmail: async function (type, record) {
      if (!record || !record.email) return null;
      console.log(`📨 Triggering automated ${type} email for: ${record.email}`);

      const client = this.getClient();
      try {
        if (client && client.functions) {
          const { data, error } = await client.functions.invoke('luxea-mailer', {
            body: { type, record }
          });
          if (error) console.warn('Supabase functions.invoke mailer notice:', error);
          else console.log('✅ Automated email dispatched via Edge Function:', data);
          return data;
        } else {
          const res = await fetch('https://abzcabiqdkmfaijnqbkf.supabase.co/functions/v1/luxea-mailer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, record })
          });
          const data = await res.json();
          console.log('✅ Automated email dispatched via Edge API:', data);
          return data;
        }
      } catch (err) {
        console.warn('Mailer dispatch exception (non-blocking):', err);
        return null;
      }
    },

    // =========================================================================
    // 5. FETCH DATA FOR ADMIN & DASHBOARDS
    // =========================================================================
    fetchHosts: async function () {
      const client = this.getClient();
      if (client) {
        try {
          const { data, error } = await client
            .from('lux_hosts')
            .select('*')
            .order('created_at', { ascending: false });
          if (!error && data) return data;
        } catch (e) {}
      }
      return JSON.parse(localStorage.getItem('luxea_host_applications') || '[]');
    },

    fetchWaitlist: async function () {
      const client = this.getClient();
      if (client) {
        try {
          const { data, error } = await client
            .from('lux_waitlist')
            .select('*')
            .order('created_at', { ascending: false });
          if (!error && data) return data;
        } catch (e) {}
      }
      return JSON.parse(localStorage.getItem('luxea_waitlist_guests') || '[]');
    },

    // 6. UPDATE HOST APPLICATION REVIEW STATUS
    updateHostStatus: async function (refId, newStatus) {
      console.log(`Updating host application ${refId} -> ${newStatus}`);

      // Update local cache
      const cached = JSON.parse(localStorage.getItem('luxea_host_applications') || '[]');
      const idx = cached.findIndex(h => (h.refId || h.ref_id) === refId);
      if (idx !== -1) {
        cached[idx].review_status = newStatus;
        localStorage.setItem('luxea_host_applications', JSON.stringify(cached));
      }

      const client = this.getClient();
      if (client) {
        try {
          const { data, error } = await client
            .from('lux_hosts')
            .update({ review_status: newStatus, updated_at: new Date().toISOString() })
            .eq('ref_id', refId)
            .select();

          if (error) {
            console.warn('Supabase host review status update error:', error.message);
          } else {
            console.log('✅ Supabase host review status updated:', data);
            if (newStatus === 'approved' && data && data.length > 0) {
              // 📨 Trigger Stage 2: Verification Approved & Account Activation invitation
              this.sendAutomatedEmail('host_approved', data[0]);
            }
          }
        } catch (err) {
          console.error('Supabase host status update exception:', err);
        }
      } else if (newStatus === 'approved' && idx !== -1) {
        this.sendAutomatedEmail('host_approved', cached[idx]);
      }

      window.dispatchEvent(new CustomEvent('luxea:host_updated', {
        detail: { eventType: 'UPDATE', refId, newStatus }
      }));

      return { success: true, refId, newStatus };
    }
  };

  // =========================================================================
  // SUPER ADMIN AUTHENTICATION GATEWAY
  // Credentials: otienoronny56@gmail.com / Luxeaadmin
  // =========================================================================
  window.LuxeaAuth = {
    SUPER_ADMIN_EMAIL: 'otienoronny56@gmail.com',

    isAdminLoggedIn: function () {
      try {
        const sess = JSON.parse(localStorage.getItem('luxea_admin_session') || '{}');
        return !!(sess && sess.email && sess.email.toLowerCase() === this.SUPER_ADMIN_EMAIL.toLowerCase() && sess.isSuperAdmin);
      } catch (e) {
        return false;
      }
    },

    loginAdmin: async function (email, password) {
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanPass = (password || '').trim();

      const client = window.LuxeaDB ? window.LuxeaDB.getClient() : null;

      // 1. Try Supabase Auth first
      if (client && client.auth) {
        try {
          const { data, error } = await client.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPass
          });
          if (!error && data && data.user) {
            const sessionData = {
              email: data.user.email,
              id: data.user.id,
              isSuperAdmin: cleanEmail === this.SUPER_ADMIN_EMAIL.toLowerCase(),
              name: 'Ronald Otieno (Super Admin)',
              role: 'Super Administrator',
              token: data.session?.access_token,
              loggedInAt: new Date().toISOString()
            };
            localStorage.setItem('luxea_admin_session', JSON.stringify(sessionData));
            return { success: true, user: sessionData };
          }
        } catch (e) {
          console.warn('Supabase Auth signIn attempt:', e);
        }
      }

      // 2. Direct Super Admin Credential Check
      if (cleanEmail === this.SUPER_ADMIN_EMAIL.toLowerCase() && cleanPass === 'Luxeaadmin') {
        const sessionData = {
          email: this.SUPER_ADMIN_EMAIL,
          isSuperAdmin: true,
          name: 'Ronald Otieno',
          role: 'Super Administrator',
          loggedInAt: new Date().toISOString()
        };
        localStorage.setItem('luxea_admin_session', JSON.stringify(sessionData));

        // Background registration attempt on Supabase Auth
        if (client && client.auth) {
          client.auth.signUp({
            email: this.SUPER_ADMIN_EMAIL,
            password: 'Luxeaadmin'
          }).catch(() => {});
        }

        return { success: true, user: sessionData };
      }

      return { success: false, message: 'Invalid admin credentials. Access restricted to Super Admin.' };
    },

    logoutAdmin: async function () {
      localStorage.removeItem('luxea_admin_session');
      const client = window.LuxeaDB ? window.LuxeaDB.getClient() : null;
      if (client && client.auth) {
        try { await client.auth.signOut(); } catch (e) {}
      }
      return { success: true };
    },

    getCurrentAdmin: function () {
      try {
        return JSON.parse(localStorage.getItem('luxea_admin_session') || 'null');
      } catch (e) {
        return null;
      }
    }
  };

  init();
})();
