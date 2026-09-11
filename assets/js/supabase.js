/**
 * LUXEA LIVING — SUPABASE CLIENT & DATA LAYER
 * Handles bucket uploads to "lux_documents" and table transactions
 * for "lux_hosts", "lux_waitlist", and "lux_properties".
 */

(function () {
  let supabase = null;

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
        supabase = window.supabase.createClient(creds.url, creds.anonKey);
        console.log('✅ Supabase initialized for Luxea Living:', creds.url);
      } catch (err) {
        console.warn('⚠️ Supabase init failed:', err);
      }
    }
    return supabase;
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
      supabase = null;
    },

    // 1. Upload File to "lux_documents" bucket
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
          console.warn('Supabase storage upload error:', error);
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

    // 2. Submit Host Application to "lux_hosts"
    submitHostApplication: async function (hostData, files = {}) {
      const client = this.getClient();

      let idUrl = null;
      let photoUrls = [];
      let bizUrl = null;

      if (client) {
        if (files.idFile) idUrl = await this.uploadDocument(files.idFile, 'host_ids');
        if (files.photos && files.photos.length > 0) {
          for (const photo of files.photos) {
            const url = await this.uploadDocument(photo, 'property_photos');
            if (url) photoUrls.push(url);
          }
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

      return dbRow;
    },

    // 3. Submit Guest Waitlist to "lux_waitlist"
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

      return dbRow;
    },

    // 4. Fetch Records
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
    }
  };

  init();
})();
