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
    /**
     * Upload property photos directly to the "lux_listings" public bucket with timeout
     */
    uploadListingPhoto: async function (file, folder = 'properties') {
      const client = this.getClient();
      if (!client || !file) return null;

      try {
        const ext = (file.name || 'photo.jpg').split('.').pop();
        const safeName = (file.name || 'photo').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
        const path = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${safeName}.${ext}`;

        let bucket = 'lux_listings';
        
        // Timeout guard: 12 seconds per upload to prevent hanging
        const uploadPromise = client.storage
          .from(bucket)
          .upload(path, file, { cacheControl: '3600', upsert: true });
        
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Upload timeout')), 12000));

        let res;
        try {
          res = await Promise.race([uploadPromise, timeoutPromise]);
        } catch (e) {
          console.warn('Storage upload timeout or error, trying fallback bucket...', e.message);
          bucket = 'lux_documents';
          res = await client.storage
            .from(bucket)
            .upload(path, file, { cacheControl: '3600', upsert: true })
            .catch(() => ({ error: { message: 'Fallback failed' } }));
        }

        if (res && res.error) {
          console.warn('Storage upload notice:', res.error.message);
          return null;
        }

        const { data: publicUrlData } = client.storage
          .from(bucket)
          .getPublicUrl(path);

        return publicUrlData ? publicUrlData.publicUrl : null;
      } catch (err) {
        console.warn('Photo upload exception (non-fatal):', err);
        return null;
      }
    },

    /**
     * Upload multiple property photos concurrently with Promise.all
     */
    uploadListingPhotos: async function (files, folder = 'properties') {
      if (!files || files.length === 0) return [];
      const fileList = Array.from(files).slice(0, 6);
      try {
        const uploadPromises = fileList.map(f => this.uploadListingPhoto(f, folder));
        const results = await Promise.all(uploadPromises);
        return results.filter(Boolean);
      } catch (err) {
        console.warn('Batch upload exception:', err);
        return [];
      }
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

    // =========================================================================
    // 4B. HOST PARTNER WAITLIST (Founding Host Partners)
    // =========================================================================
    submitHostWaitlist: async function (hostData) {
      const client = this.getClient();

      const dbRow = {
        pass_number: hostData.passNumber,
        pass_code: hostData.passCode,
        full_name: hostData.fullName,
        email: hostData.email,
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

      if (client) {
        try {
          const { data, error } = await client.from('lux_host_waitlist').insert([dbRow]);
          if (error) console.error('Error inserting into lux_host_waitlist:', error);
          else console.log('✅ Record inserted into lux_host_waitlist:', data);
        } catch (err) {
          console.error('Supabase host waitlist insert exception:', err);
        }
      }

      const cached = JSON.parse(localStorage.getItem('luxea_host_waitlist') || '[]');
      cached.unshift({ ...hostData, id: `host-waitlist-${Date.now()}` });
      localStorage.setItem('luxea_host_waitlist', JSON.stringify(cached));

      // 📨 Dispatch automated Founding Host Welcome & Priority Pass email via Edge Function
      this.sendAutomatedEmail('host_waitlist_welcome', dbRow);

      return dbRow;
    },

    fetchHostWaitlist: async function () {
      const client = this.getClient();
      if (client) {
        try {
          const { data, error } = await client
            .from('lux_host_waitlist')
            .select('*')
            .order('created_at', { ascending: false });
          if (!error && data) return data;
        } catch (e) {}
      }
      return JSON.parse(localStorage.getItem('luxea_host_waitlist') || '[]');
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

    /**
     * Guarantee any user (guest, host, waitlist, or admin) is provisioned in the
     * Supabase Authentication tab (auth.users) with email_confirm: true, and in lux_profiles.
     */
    syncAuthUser: async function (userData) {
      if (!userData || !userData.email) return null;
      console.log(`🔐 Syncing user to Supabase Authentication tab (auth.users): ${userData.email}`);
      return await this.sendAutomatedEmail('sync_auth_user', userData);
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
    },

    // =========================================================================
    // 7. USER PROFILES & ROLE REGISTRY ("lux_profiles")
    // =========================================================================
    fetchProfiles: async function () {
      const client = this.getClient();
      if (client) {
        try {
          const { data, error } = await client
            .from('lux_profiles')
            .select('*')
            .order('created_at', { ascending: false });
          if (!error && data) return data;
          if (error) console.warn('Supabase fetchProfiles error:', error.message);
        } catch (e) {
          console.warn('Supabase fetchProfiles exception:', e);
        }
      }
      return [];
    },

    updateProfileRole: async function (userId, newRole) {
      const client = this.getClient();
      if (!client) return { success: false, error: 'Database client not initialized' };

      try {
        const { data, error } = await client
          .from('lux_profiles')
          .update({ role: newRole, updated_at: new Date().toISOString() })
          .eq('id', userId)
          .select();

        if (error) {
          console.error('Supabase updateProfileRole error:', error.message);
          return { success: false, error: error.message };
        }
        console.log(`✅ Role updated for ${userId} -> ${newRole}:`, data);
        return { success: true, data };
      } catch (err) {
        console.error('Supabase updateProfileRole exception:', err);
        return { success: false, error: err.message };
      }
    },

    // =========================================================================
    // 8. EXECUTIVE ACCOUNT PROVISIONING & HOST PROFILE MANAGEMENT
    // =========================================================================
    provisionUser: async function (accountData) {
      console.log(`🚀 Executive provisioning requested for: ${accountData.email}`);
      const res = await this.sendAutomatedEmail('admin_provision_user', accountData);
      if (res && res.success) {
        // Also refresh cached profiles if possible
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

        // 1. Update lux_hosts
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

        if (updates.ref_id) hostQuery = hostQuery.eq('ref_id', updates.ref_id);
        else if (email) hostQuery = hostQuery.ilike('email', email);

        const { data: hostData, error: hostErr } = await hostQuery.select();
        if (hostErr) console.warn('Update lux_hosts error:', hostErr.message);

        // 2. Update lux_profiles
        if (email) {
          await client.from('lux_profiles').update({
            full_name: updates.full_name,
            phone: updates.phone,
            avatar_url: updates.avatar_url,
            bio: updates.bio,
            role: updates.role || undefined,
            updated_at: now
          }).ilike('email', email);
        }

        window.dispatchEvent(new CustomEvent('luxea:host_updated', { detail: { email, updates } }));
        return { success: true, hostData };
      } catch (err) {
        console.error('updateHostProfile exception:', err);
        return { success: false, error: err.message };
      }
    },

    toggleHostSuspension: async function (email, isSuspended) {
      const client = this.getClient();
      if (!client || !email) return { success: false };

      try {
        const cleanEmail = email.toLowerCase().trim();
        const newStatus = isSuspended ? 'suspended' : 'approved';
        const now = new Date().toISOString();

        // Update lux_hosts
        await client.from('lux_hosts').update({
          is_suspended: isSuspended,
          review_status: newStatus,
          updated_at: now
        }).ilike('email', cleanEmail);

        // Update lux_profiles
        await client.from('lux_profiles').update({
          is_suspended: isSuspended,
          role: isSuspended ? 'suspended' : 'host',
          updated_at: now
        }).ilike('email', cleanEmail);

        window.dispatchEvent(new CustomEvent('luxea:host_updated', { detail: { email: cleanEmail, isSuspended } }));
        return { success: true, isSuspended };
      } catch (err) {
        console.error('toggleHostSuspension error:', err);
        return { success: false, error: err.message };
      }
    },

    toggleHostDelist: async function (email, isDelisted) {
      const client = this.getClient();
      if (!client || !email) return { success: false };

      try {
        const cleanEmail = email.toLowerCase().trim();
        const now = new Date().toISOString();

        // Update lux_hosts
        await client.from('lux_hosts').update({
          is_delisted: isDelisted,
          updated_at: now
        }).ilike('email', cleanEmail);

        // Update lux_properties for this host (hide or show on platform)
        // Match properties by owner name or slug
        const { data: hostRows } = await client.from('lux_hosts').select('property_name').ilike('email', cleanEmail);
        if (hostRows && hostRows.length > 0) {
          const propName = hostRows[0].property_name;
          if (propName) {
            await client.from('lux_properties').update({
              is_active: !isDelisted,
              is_available: !isDelisted,
              updated_at: now
            }).ilike('name', `%${propName}%`);
          }
        }

        window.dispatchEvent(new CustomEvent('luxea:property_updated', { detail: { email: cleanEmail, isDelisted } }));
        return { success: true, isDelisted };
      } catch (err) {
        console.error('toggleHostDelist error:', err);
        return { success: false, error: err.message };
      }
    }
  };

  // =========================================================================
  // SUPER ADMIN AUTHENTICATION GATEWAY
  // Credentials: otienoronny56@gmail.com / dennbarasa@gmail.com
  // =========================================================================
  window.LuxeaAuth = {
    SUPER_ADMIN_EMAILS: ['otienoronny56@gmail.com', 'dennbarasa@gmail.com'],

    isSuperAdminEmail: function (email) {
      if (!email) return false;
      return this.SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
    },

    isAdminLoggedIn: function () {
      try {
        const sess = JSON.parse(localStorage.getItem('luxea_admin_session') || '{}');
        return !!(sess && sess.email && (this.isSuperAdminEmail(sess.email) || sess.role === 'super_admin' || sess.role === 'admin' || sess.role === 'Super Administrator') && sess.isSuperAdmin);
      } catch (e) {
        return false;
      }
    },

    loginAdmin: async function (email, password) {
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanPass = (password || '').trim();

      const client = window.LuxeaDB ? window.LuxeaDB.getClient() : null;
      const isSuper = this.isSuperAdminEmail(cleanEmail);
      const defaultName = cleanEmail === 'dennbarasa@gmail.com' ? 'Dennis Barasa' : 'Ronald Otieno';

      // 1. Try Supabase Auth first
      if (client && client.auth) {
        try {
          const { data, error } = await client.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPass
          });
          if (!error && data && data.user) {
            const userName = data.user.user_metadata?.full_name || data.user.user_metadata?.name || defaultName;
            const sessionData = {
              email: data.user.email,
              id: data.user.id,
              isSuperAdmin: isSuper,
              name: `${userName} (Super Admin)`,
              role: 'super_admin',
              token: data.session?.access_token,
              loggedInAt: new Date().toISOString()
            };
            localStorage.setItem('luxea_admin_session', JSON.stringify(sessionData));
            localStorage.setItem('luxea_user_session', JSON.stringify(sessionData));
            return { success: true, user: sessionData };
          }
        } catch (e) {
          console.warn('Supabase Auth signIn attempt:', e);
        }
      }

      // 2. Direct Super Admin Credential Check
      if (isSuper && cleanPass === 'Luxeaadmin') {
        const sessionData = {
          email: cleanEmail,
          isSuperAdmin: true,
          name: defaultName,
          role: 'super_admin',
          loggedInAt: new Date().toISOString()
        };
        localStorage.setItem('luxea_admin_session', JSON.stringify(sessionData));
        localStorage.setItem('luxea_user_session', JSON.stringify(sessionData));

        // Background registration attempt on Supabase Auth
        if (client && client.auth) {
          client.auth.signUp({
            email: cleanEmail,
            password: 'Luxeaadmin',
            options: { data: { full_name: defaultName, role: 'super_admin' } }
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
