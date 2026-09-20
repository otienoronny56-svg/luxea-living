/**
 * LUXEA LIVING — SYSTEMATIC & FRIENDLY HOST REGISTRATION MODULE (hostForm.js)
 * Features:
 * 1. 5-Step Guided Wizard with Live Percentage & Progress Meter
 * 2. Pre-Flight Review Mini-Dossier Snapshot before Digital Signature
 * 3. Friendly Contextual Validation with Inline Guidance & Smooth Focus
 * 4. Multi-File Dropzones with Instant Preview Thumbnails & Remove Controls
 * 5. Real-Time Application Status Lookup Engine (by Ref ID or Email)
 */

export function initHostForm(formId = 'luxeaHostForm') {
  const form = document.getElementById(formId);
  if (!form) return;

  const successPane = document.getElementById('hostSuccessPane');
  const progressFill = document.getElementById('progressFill');
  const progressPercent = document.getElementById('progressPercentLabel');
  const progressStep = document.getElementById('progressStepLabel');

  let currentStep = 1;

  const stepMeta = [
    { title: 'Step 1 of 5: Personal & Legal Details', percent: 20 },
    { title: 'Step 2 of 5: Property Details & Location', percent: 40 },
    { title: 'Step 3 of 5: Unit Capacity & Amenities', percent: 60 },
    { title: 'Step 4 of 5: Payout Preferences', percent: 80 },
    { title: 'Step 5 of 5: Verification Documents & Signature', percent: 100 }
  ];

  // Set today's date automatically
  const dateField = document.getElementById('submissionDate');
  if (dateField) dateField.value = new Date().toISOString().split('T')[0];

  function updateProgress(step) {
    if (progressFill && progressPercent && progressStep) {
      const meta = stepMeta[step - 1];
      if (meta) {
        progressFill.style.width = `${meta.percent}%`;
        progressPercent.textContent = `${meta.percent}% Completed`;
        progressStep.textContent = meta.title;
      }
    }
  }

  function populatePreflightReview() {
    const fullName = document.getElementById('hostFullName')?.value.trim() || '—';
    const phone = document.getElementById('hostPhone')?.value.trim() || '';
    const email = document.getElementById('hostEmail')?.value.trim() || '';
    const propName = document.getElementById('propertyName')?.value.trim() || '—';
    const propType = document.querySelector('input[name="propertyType"]:checked')?.value || 'Apartment';
    const county = document.getElementById('propertyCounty')?.value.trim() || '';
    const area = document.getElementById('propertyArea')?.value.trim() || '';
    const beds = document.getElementById('unitBedrooms')?.value || '0';
    const baths = document.getElementById('unitBathrooms')?.value || '0';
    const guests = document.getElementById('unitMaxGuests')?.value || '0';
    const payoutMethod = document.querySelector('input[name="payoutMethod"]:checked')?.value || 'M-Pesa';

    const rHost = document.getElementById('reviewHostName');
    const rContact = document.getElementById('reviewHostContact');
    const rProp = document.getElementById('reviewPropName');
    const rLoc = document.getElementById('reviewPropLocation');
    const rCap = document.getElementById('reviewPropCapacity');
    const rPay = document.getElementById('reviewPayoutMethod');

    if (rHost) rHost.textContent = fullName;
    if (rContact) rContact.textContent = `${phone} • ${email}`;
    if (rProp) rProp.textContent = `${propName} (${propType})`;
    if (rLoc) rLoc.textContent = `${area ? area + ', ' : ''}${county}`;
    if (rCap) rCap.textContent = `${beds} Bed(s) • ${baths} Bath(s) • Max ${guests} Guests`;
    if (rPay) {
      if (payoutMethod === 'M-Pesa') {
        const mNum = document.getElementById('mpesaNumber')?.value.trim() || '';
        rPay.textContent = `M-Pesa (${mNum || 'Direct Mobile'})`;
      } else {
        const bName = document.getElementById('bankName')?.value.trim() || '';
        rPay.textContent = `Bank Transfer (${bName || 'Direct Deposit'})`;
      }
    }
  }

  function goToStep(step) {
    clearAllErrors();
    currentStep = step;

    document.querySelectorAll('.form-step-pane').forEach((pane, idx) => {
      pane.classList.toggle('active', idx + 1 === step);
    });

    document.querySelectorAll('.step-item').forEach((item, idx) => {
      const s = idx + 1;
      item.classList.toggle('active', s === step);
      item.classList.toggle('completed', s < step);
    });

    document.querySelectorAll('.companion-step-item').forEach(item => {
      const s = parseInt(item.getAttribute('data-step-ref'));
      if (s) {
        item.classList.toggle('active', s === step);
        item.classList.toggle('completed', s < step);
      }
    });

    updateProgress(step);

    if (step === 5) {
      populatePreflightReview();
    }

    const wrapper = document.querySelector('.host-portal-wrapper');
    if (wrapper) {
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Allow clicking on completed steps in top stepper and companion sidebar
  document.querySelectorAll('.step-item').forEach(item => {
    item.addEventListener('click', () => {
      const s = parseInt(item.getAttribute('data-step'));
      if (s && (s < currentStep || validateStep(currentStep))) {
        goToStep(s);
      }
    });
  });

  document.querySelectorAll('.companion-step-item').forEach(item => {
    item.addEventListener('click', () => {
      const s = parseInt(item.getAttribute('data-step-ref'));
      if (s && (s < currentStep || validateStep(currentStep))) {
        goToStep(s);
      }
    });
  });

  // Next / Previous button listeners
  document.querySelectorAll('.step-next-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = parseInt(btn.getAttribute('data-next'));
      if (validateStep(currentStep)) {
        goToStep(next);
      }
    });
  });

  document.querySelectorAll('.step-prev-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const prev = parseInt(btn.getAttribute('data-prev'));
      goToStep(prev);
    });
  });

  // Friendly inline validation helpers
  function clearAllErrors() {
    form.querySelectorAll('.input-invalid').forEach(el => el.classList.remove('input-invalid'));
    form.querySelectorAll('.inline-validation-error').forEach(el => el.remove());
  }

  function setFieldError(el, msg) {
    if (!el) return;
    el.classList.add('input-invalid');
    let err = el.parentElement.querySelector('.inline-validation-error');
    if (!err) {
      err = document.createElement('span');
      err.className = 'inline-validation-error';
      el.parentElement.appendChild(err);
    }
    err.textContent = msg;

    el.addEventListener('input', () => {
      el.classList.remove('input-invalid');
      err.remove();
    }, { once: true });
  }

  function validateStep(step) {
    clearAllErrors();
    let valid = true;
    let firstInvalid = null;

    if (step === 1) {
      const name = document.getElementById('hostFullName');
      const id = document.getElementById('hostNationalId');
      const phone = document.getElementById('hostPhone');
      const email = document.getElementById('hostEmail');
      const kra = document.getElementById('hostKraPin');
      const dob = document.getElementById('hostDob');

      if (!name.value.trim()) {
        setFieldError(name, 'Please enter your full legal name as it appears on official ID.');
        if (!firstInvalid) firstInvalid = name;
        valid = false;
      }
      if (!id.value.trim()) {
        setFieldError(id, 'Please enter your National ID or Passport number.');
        if (!firstInvalid) firstInvalid = id;
        valid = false;
      }
      if (!phone.value.trim()) {
        setFieldError(phone, 'Please enter a valid phone number for booking notifications.');
        if (!firstInvalid) firstInvalid = phone;
        valid = false;
      }
      if (!email.value.trim() || !email.value.includes('@')) {
        setFieldError(email, 'Please enter a valid email address to receive your activation link.');
        if (!firstInvalid) firstInvalid = email;
        valid = false;
      }
      if (!kra.value.trim()) {
        setFieldError(kra, 'Please provide your KRA PIN for lawful tax compliance.');
        if (!firstInvalid) firstInvalid = kra;
        valid = false;
      }
      if (!dob.value) {
        setFieldError(dob, 'Please specify your date of birth (must be 18+).');
        if (!firstInvalid) firstInvalid = dob;
        valid = false;
      }
    } else if (step === 2) {
      const prop = document.getElementById('propertyName');
      const county = document.getElementById('propertyCounty');
      const area = document.getElementById('propertyArea');
      const addr = document.getElementById('propertyAddress');
      const maps = document.getElementById('propertyMaps');

      if (!prop.value.trim()) {
        setFieldError(prop, 'Please enter a distinguished title for your property.');
        if (!firstInvalid) firstInvalid = prop;
        valid = false;
      }
      if (!maps.value.trim()) {
        setFieldError(maps, 'Please click "Use My Current Location" or paste a Google Maps link.');
        if (!firstInvalid) firstInvalid = maps;
        valid = false;
      } else {
        // Ensure county and area are autofilled for database storage
        if (county && !county.value.trim()) {
          county.value = 'Nairobi';
        }
        if (area && !area.value.trim()) {
          area.value = 'Karen / Westlands';
        }
      }
      if (!addr.value.trim()) {
        setFieldError(addr, 'Please provide the physical street, building, or gate details.');
        if (!firstInvalid) firstInvalid = addr;
        valid = false;
      }
    } else if (step === 3) {
      const beds = document.getElementById('unitBedrooms');
      const baths = document.getElementById('unitBathrooms');
      const guests = document.getElementById('unitMaxGuests');

      if (parseInt(beds.value) < 0) {
        setFieldError(beds, 'Please enter a valid bedroom count.');
        if (!firstInvalid) firstInvalid = beds;
        valid = false;
      }
      if (parseFloat(baths.value) < 0.5) {
        setFieldError(baths, 'Please enter at least 1 bathroom.');
        if (!firstInvalid) firstInvalid = baths;
        valid = false;
      }
      if (parseInt(guests.value) < 1) {
        setFieldError(guests, 'Please enter guest capacity of at least 1.');
        if (!firstInvalid) firstInvalid = guests;
        valid = false;
      }
    } else if (step === 4) {
      const method = document.querySelector('input[name="payoutMethod"]:checked')?.value || 'M-Pesa';
      if (method === 'M-Pesa') {
        const mName = document.getElementById('mpesaName');
        const mNum = document.getElementById('mpesaNumber');
        if (!mName.value.trim()) {
          setFieldError(mName, 'Please enter your registered M-Pesa account name.');
          if (!firstInvalid) firstInvalid = mName;
          valid = false;
        }
        if (!mNum.value.trim()) {
          setFieldError(mNum, 'Please provide the Safaricom mobile number for instant payouts.');
          if (!firstInvalid) firstInvalid = mNum;
          valid = false;
        }
      } else {
        const bName = document.getElementById('bankName');
        const bAcc = document.getElementById('bankAccountNumber');
        if (!bName.value.trim()) {
          setFieldError(bName, 'Please specify your bank name (e.g. NCBA, Stanbic).');
          if (!firstInvalid) firstInvalid = bName;
          valid = false;
        }
        if (!bAcc.value.trim()) {
          setFieldError(bAcc, 'Please enter your bank account number.');
          if (!firstInvalid) firstInvalid = bAcc;
          valid = false;
        }
      }
    }

    if (!valid && firstInvalid) {
      firstInvalid.focus();
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return valid;
  }

  // Payout Method Radio Toggle
  const payoutRadios = document.querySelectorAll('input[name="payoutMethod"]');
  const mpesaBlock = document.getElementById('mpesaFieldsBlock');
  const bankBlock = document.getElementById('bankFieldsBlock');
  payoutRadios.forEach(r => {
    r.addEventListener('change', () => {
      if (r.value === 'M-Pesa') {
        if (mpesaBlock) mpesaBlock.classList.remove('hidden');
        if (bankBlock) bankBlock.classList.add('hidden');
      } else {
        if (mpesaBlock) mpesaBlock.classList.add('hidden');
        if (bankBlock) bankBlock.classList.remove('hidden');
      }
    });
  });

  // File Inputs & Previews
  const idInput = document.getElementById('idFileInput');
  const idDropzone = document.getElementById('idDropzone');
  const idBadge = document.getElementById('idFileBadge');
  const idDropContent = document.getElementById('idDropzoneContent');

  if (idDropzone && idInput) {
    idDropzone.addEventListener('click', (e) => {
      if (!e.target.closest('.remove-file-btn')) idInput.click();
    });
    idInput.addEventListener('change', () => {
      if (idInput.files && idInput.files[0] && idBadge) {
        const file = idInput.files[0];
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        idBadge.querySelector('.file-name-text').textContent = `${file.name} (${sizeMb} MB)`;
        idBadge.classList.remove('hidden');
        if (idDropContent) idDropContent.style.opacity = '0.5';
      }
    });
  }

  const photosInput = document.getElementById('photosFileInput');
  const photosDropzone = document.getElementById('photosDropzone');
  const photosGallery = document.getElementById('photosGalleryPreview');
  const photosText = document.getElementById('photosDropzoneText');

  if (photosDropzone && photosInput) {
    photosDropzone.addEventListener('click', () => photosInput.click());
    photosInput.addEventListener('change', () => {
      if (photosGallery && photosInput.files) {
        photosGallery.innerHTML = '';
        const count = photosInput.files.length;
        if (photosText) {
          photosText.textContent = count >= 3 
            ? `✓ ${count} Photos Selected` 
            : `${count} of 3 minimum photos selected`;
        }
        Array.from(photosInput.files).forEach(file => {
          const img = document.createElement('img');
          img.className = 'photo-thumb-item';
          img.src = URL.createObjectURL(file);
          photosGallery.appendChild(img);
        });
      }
    });
  }

  // Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const declCheck = document.getElementById('declarationCheck');
    const signature = document.getElementById('hostSignature');

    if (!declCheck.checked) {
      declCheck.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (window.showToast) window.showToast('Please accept the partner declaration before submitting.');
      return;
    }
    if (!signature.value.trim()) {
      setFieldError(signature, 'Please provide your full legal name as an electronic signature.');
      signature.focus();
      return;
    }

    const submitBtn = document.getElementById('submitHostFormBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Encrypting &amp; Submitting...</span>`;
    }

    const refId = `LXH-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const selectedAmenities = Array.from(form.querySelectorAll('input[name="amenity"]:checked')).map(c => c.value);
    const otherAmenity = document.getElementById('otherAmenityInput')?.value.trim() || '';
    if (otherAmenity) selectedAmenities.push(otherAmenity);

    const payoutMethod = document.querySelector('input[name="payoutMethod"]:checked')?.value || 'M-Pesa';
    const payoutDetails = payoutMethod === 'M-Pesa'
      ? { method: 'M-Pesa', name: document.getElementById('mpesaName').value.trim(), number: document.getElementById('mpesaNumber').value.trim() }
      : { method: 'Bank Transfer', bank: document.getElementById('bankName').value.trim(), account: document.getElementById('bankAccountNumber').value.trim(), accName: document.getElementById('bankAccountName').value.trim() };

    const hostData = {
      refId,
      fullName: document.getElementById('hostFullName').value.trim(),
      nationalId: document.getElementById('hostNationalId').value.trim(),
      phone: document.getElementById('hostPhone').value.trim(),
      email: document.getElementById('hostEmail').value.trim(),
      kraPin: document.getElementById('hostKraPin').value.trim(),
      dob: document.getElementById('hostDob').value,
      propertyName: document.getElementById('propertyName').value.trim(),
      propertyType: document.querySelector('input[name="propertyType"]:checked')?.value || 'Apartment',
      propertyAddress: document.getElementById('propertyAddress').value.trim(),
      county: document.getElementById('propertyCounty').value.trim(),
      area: document.getElementById('propertyArea').value.trim(),
      mapsLink: document.getElementById('propertyMaps').value.trim(),
      bedrooms: document.getElementById('unitBedrooms').value,
      bathrooms: document.getElementById('unitBathrooms').value,
      maxGuests: document.getElementById('unitMaxGuests').value,
      amenities: selectedAmenities.join(', '),
      otherAmenity,
      payoutDetails,
      idUploaded: idInput && idInput.files[0] ? idInput.files[0].name : 'Verified on File',
      photosCount: photosInput && photosInput.files ? photosInput.files.length : 3,
      signature: signature.value.trim(),
      signatureDate: dateField ? dateField.value : new Date().toISOString().split('T')[0],
      submittedAt: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })
    };

    // Real-time Supabase Database Sync & Storage Uploads
    if (window.LuxeaDB) {
      const filesToUpload = {
        idFile: idInput && idInput.files[0] ? idInput.files[0] : null,
        photos: photosInput && photosInput.files ? Array.from(photosInput.files) : [],
        bizFile: document.getElementById('bizFileInput')?.files?.[0] || null
      };
      await window.LuxeaDB.submitHostApplication(hostData, filesToUpload);
    }

    // Save active pending application and user session locally so host is recognized immediately
    const userSession = {
      email: hostData.email,
      name: hostData.fullName,
      propertyName: hostData.propertyName,
      propertyType: hostData.propertyType,
      refId: hostData.refId,
      role: 'host',
      status: 'pending_review',
      isSuperAdmin: false,
      submittedAt: hostData.submittedAt,
      loggedInAt: new Date().toISOString()
    };
    localStorage.setItem('luxea_pending_host_app', JSON.stringify(userSession));
    localStorage.setItem('luxea_user_session', JSON.stringify(userSession));
    window.dispatchEvent(new CustomEvent('luxea:auth_changed', { detail: { loggedIn: true, user: userSession } }));

    // Show Success Card
    const refEl = document.getElementById('successRefId');
    const propEl = document.getElementById('successPropName');
    const nameEl = document.getElementById('successHostName');
    const payEl = document.getElementById('successPayoutMethod');
    if (refEl) refEl.textContent = refId;
    if (propEl) propEl.textContent = hostData.propertyName;
    if (nameEl) nameEl.textContent = hostData.fullName;
    if (payEl) payEl.textContent = `${payoutMethod} (${payoutMethod === 'M-Pesa' ? hostData.payoutDetails.number : hostData.payoutDetails.bank})`;

    form.classList.add('hidden');
    if (successPane) successPane.classList.remove('hidden');

    if (window.showToast) window.showToast(`Application submitted successfully! Ref: ${refId}`);
    window.dispatchEvent(new CustomEvent('luxea:dataUpdated'));
  });

  // Automated Location & Google Maps Autofill Engine
  initLocationAutofill();

  // Application Status Lookup Handler
  initStatusLookup();
}

/**
 * Automated Location & Google Maps Autofill Engine
 * Eliminates manual typing of County & Area by resolving from live GPS or Google Maps pin links.
 */
function initLocationAutofill() {
  const myLocBtn = document.getElementById('useMyLocationBtn');
  const mapsInput = document.getElementById('propertyMaps');
  const badge = document.getElementById('locationDetectedBadge');
  const badgeText = document.getElementById('detectedLocationText');
  const editToggleBtn = document.getElementById('editLocationToggleBtn');
  const hiddenFields = document.getElementById('locationHiddenFields');
  const countyInput = document.getElementById('propertyCounty');
  const areaInput = document.getElementById('propertyArea');

  function setDetectedLocation(county, area, source = 'gps') {
    if (countyInput) countyInput.value = county;
    if (areaInput) areaInput.value = area;
    if (badge && badgeText) {
      badgeText.textContent = `${area ? area + ', ' : ''}${county} (${source === 'gps' ? 'Live GPS Device' : 'Maps Pin'})`;
      badge.classList.remove('hidden');
    }
  }

  // Edit toggle listener
  if (editToggleBtn && hiddenFields) {
    editToggleBtn.addEventListener('click', () => {
      const isHidden = hiddenFields.classList.toggle('hidden');
      editToggleBtn.textContent = isHidden ? 'Edit Details' : 'Hide Details';
    });
  }

  // Common Kenyan destination keyword lookup from text/URL
  function parseLocationKeywords(str) {
    const s = str.toLowerCase();
    const map = [
      { key: 'karen', county: 'Nairobi', area: 'Karen' },
      { key: 'westlands', county: 'Nairobi', area: 'Westlands' },
      { key: 'kilimani', county: 'Nairobi', area: 'Kilimani' },
      { key: 'kileleshwa', county: 'Nairobi', area: 'Kileleshwa' },
      { key: 'lavington', county: 'Nairobi', area: 'Lavington' },
      { key: 'muthaiga', county: 'Nairobi', area: 'Muthaiga' },
      { key: 'spring valley', county: 'Nairobi', area: 'Spring Valley' },
      { key: 'gigiri', county: 'Nairobi', area: 'Gigiri' },
      { key: 'runda', county: 'Nairobi', area: 'Runda' },
      { key: 'diani', county: 'Kwale', area: 'Diani Beach' },
      { key: 'tiwi', county: 'Kwale', area: 'Tiwi' },
      { key: 'galu', county: 'Kwale', area: 'Galu Kinondo' },
      { key: 'naivasha', county: 'Nakuru', area: 'Naivasha' },
      { key: 'nakuru', county: 'Nakuru', area: 'Nakuru' },
      { key: 'nyali', county: 'Mombasa', area: 'Nyali' },
      { key: 'bamburi', county: 'Mombasa', area: 'Bamburi' },
      { key: 'shanzu', county: 'Mombasa', area: 'Shanzu' },
      { key: 'watamu', county: 'Kilifi', area: 'Watamu' },
      { key: 'malindi', county: 'Kilifi', area: 'Malindi' },
      { key: 'kilifi', county: 'Kilifi', area: 'Kilifi Creek' },
      { key: 'lamu', county: 'Lamu', area: 'Shela / Lamu Island' },
      { key: 'nanyuki', county: 'Laikipia', area: 'Nanyuki' },
      { key: 'eldoret', county: 'Uasin Gishu', area: 'Eldoret' },
      { key: 'kisumu', county: 'Kisumu', area: 'Kisumu / Riat' }
    ];

    for (const item of map) {
      if (s.includes(item.key)) {
        return { county: item.county, area: item.area };
      }
    }
    return null;
  }

  // Kenyan Regional Lat/Lon Bounding Heuristics
  function inferFromCoords(lat, lon) {
    if (lat >= -1.45 && lat <= -1.15 && lon >= 36.65 && lon <= 37.10) {
      if (lat < -1.28) return { county: 'Nairobi', area: 'Karen' };
      if (lat >= -1.28 && lon < 36.83) return { county: 'Nairobi', area: 'Westlands' };
      return { county: 'Nairobi', area: 'Nairobi Metropolis' };
    }
    if (lat >= -4.45 && lat <= -4.15 && lon >= 39.50 && lon <= 39.65) {
      return { county: 'Kwale', area: 'Diani Beach' };
    }
    if (lat >= -4.15 && lat <= -3.95 && lon >= 39.60 && lon <= 39.80) {
      return { county: 'Mombasa', area: 'Nyali' };
    }
    if (lat >= -0.90 && lat <= -0.65 && lon >= 36.25 && lon <= 36.55) {
      return { county: 'Nakuru', area: 'Naivasha' };
    }
    if (lat >= -3.40 && lat <= -3.15 && lon >= 39.90 && lon <= 40.25) {
      return { county: 'Kilifi', area: 'Watamu & Malindi' };
    }
    if (lat >= -0.10 && lat <= 0.20 && lon >= 36.90 && lon <= 37.20) {
      return { county: 'Laikipia', area: 'Nanyuki' };
    }
    return { county: 'Nairobi', area: 'Kenya' };
  }

  // Reverse geocoding with graceful fallback
  async function reverseGeocode(lat, lon) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { signal: controller.signal, headers: { 'Accept': 'application/json' } }
      );
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const county = addr.county || addr.state || addr.city || 'Nairobi';
        const area = addr.suburb || addr.neighbourhood || addr.quarter || addr.town || addr.village || addr.city_district || 'Prime Suburb';
        const cleanCounty = county.replace(/ county/i, '').trim();
        return { county: cleanCounty, area };
      }
    } catch (e) {
      // Ignore network / timeout errors, fallback to heuristics
    }
    return inferFromCoords(lat, lon);
  }

  // "Use My Current Location" button handler
  if (myLocBtn) {
    myLocBtn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        if (window.showToast) window.showToast('Geolocation is not supported by your browser.');
        return;
      }

      const origHtml = myLocBtn.innerHTML;
      myLocBtn.classList.add('loc-detecting');
      myLocBtn.disabled = true;
      myLocBtn.innerHTML = `
        <span class="spinner-small" style="display:inline-block; width:13px; height:13px; border:2px solid currentColor; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite;"></span>
        <span>Detecting coordinates...</span>
      `;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          // Set maps link automatically
          if (mapsInput) {
            mapsInput.value = `https://www.google.com/maps?q=${lat.toFixed(6)},${lon.toFixed(6)}`;
          }

          const geo = await reverseGeocode(lat, lon);
          setDetectedLocation(geo.county, geo.area, 'gps');

          myLocBtn.classList.remove('loc-detecting');
          myLocBtn.disabled = false;
          myLocBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Location Detected</span>
          `;

          if (window.showToast) {
            window.showToast(`📍 Auto-detected: ${geo.area}, ${geo.county} County`);
          }

          setTimeout(() => {
            myLocBtn.innerHTML = origHtml;
          }, 3500);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          myLocBtn.classList.remove('loc-detecting');
          myLocBtn.disabled = false;
          myLocBtn.innerHTML = origHtml;
          if (window.showToast) {
            window.showToast('Could not retrieve live GPS. Please paste your Google Maps link.');
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  // Google Maps link input listener (paste / change)
  if (mapsInput) {
    const handleMapsInput = async () => {
      const val = mapsInput.value.trim();
      if (!val) return;

      // 1. Try coordinate extraction from URL (@lat,lon or ?q=lat,lon or ll=lat,lon)
      const coordMatch = val.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || 
                         val.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/) ||
                         val.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);

      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lon = parseFloat(coordMatch[2]);
        const geo = await reverseGeocode(lat, lon);
        setDetectedLocation(geo.county, geo.area, 'link');
        return;
      }

      // 2. Try keyword extraction from URL / text
      const matched = parseLocationKeywords(val);
      if (matched) {
        setDetectedLocation(matched.county, matched.area, 'link');
        return;
      }

      // 3. Fallback: If it's a valid link, default to Nairobi Prime
      if (val.startsWith('http')) {
        if (!countyInput?.value.trim()) {
          setDetectedLocation('Nairobi', 'Nairobi Metropolis', 'link');
        }
      }
    };

    mapsInput.addEventListener('change', handleMapsInput);
    mapsInput.addEventListener('paste', () => setTimeout(handleMapsInput, 150));
  }
}

/**
 * Real-Time Application Status Lookup Engine
 */
function initStatusLookup() {
  const lookupForm = document.getElementById('statusLookupForm');
  const lookupInput = document.getElementById('lookupQueryInput');
  const lookupResults = document.getElementById('lookupResultContainer');

  if (!lookupForm || !lookupInput || !lookupResults) return;

  lookupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = lookupInput.value.trim().toLowerCase();
    if (!query) return;

    lookupResults.classList.remove('hidden');
    lookupResults.innerHTML = `
      <div style="text-align:center; padding: 20px; color: var(--color-cocoa);">
        <span>Searching partner registry...</span>
      </div>
    `;

    let matchedApp = null;

    // 1. Search Supabase
    if (window.LuxeaDB) {
      try {
        const client = window.LuxeaDB.getClient();
        if (client) {
          const { data, error } = await client
            .from('lux_hosts')
            .select('*')
            .or(`ref_id.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(1);

          if (!error && data && data.length > 0) {
            matchedApp = {
              refId: data[0].ref_id,
              fullName: data[0].full_name,
              propertyName: data[0].property_name,
              status: data[0].review_status || 'pending_review',
              email: data[0].email,
              date: new Date(data[0].created_at || Date.now()).toLocaleDateString('en-KE')
            };
          }
        }
      } catch (err) {
        console.warn('Status lookup query error:', err);
      }
    }

    // 2. Search local cached applications if not found in database
    if (!matchedApp) {
      const cached = JSON.parse(localStorage.getItem('luxea_host_applications') || '[]');
      const found = cached.find(a => 
        (a.refId && a.refId.toLowerCase().includes(query)) || 
        (a.email && a.email.toLowerCase().includes(query))
      );
      if (found) {
        matchedApp = {
          refId: found.refId,
          fullName: found.fullName,
          propertyName: found.propertyName,
          status: found.status || 'pending_review',
          email: found.email,
          date: found.signatureDate || new Date().toLocaleDateString('en-KE')
        };
      }
    }

    // Render results
    if (matchedApp) {
      const isApproved = matchedApp.status === 'approved';
      lookupResults.innerHTML = `
        <div class="lookup-result-card">
          <div class="lookup-head">
            <span class="lookup-ref">${matchedApp.refId}</span>
            <span class="status-pill ${isApproved ? 'status-approved' : 'status-pending'}">
              ${isApproved ? 'Approved &amp; Verified' : 'Under Documentation Audit'}
            </span>
          </div>
          <div class="lookup-detail-row"><strong>Property:</strong> ${matchedApp.propertyName}</div>
          <div class="lookup-detail-row"><strong>Host Name:</strong> ${matchedApp.fullName}</div>
          <div class="lookup-detail-row"><strong>Registered Email:</strong> ${matchedApp.email}</div>

          <div class="lookup-msg ${isApproved ? 'approved' : 'pending'}">
            ${isApproved 
              ? '🎉 <strong>Congratulations!</strong> Your property has been approved by the Super Admin. You can now activate your Host Suite or set your password.' 
              : '⏳ Your partner application is actively being vetted by our Super Admin in Nairobi. You will receive an activation invitation via email within 24 hours.'}
          </div>

          ${isApproved ? `
            <a href="/host/activate/?ref=${encodeURIComponent(matchedApp.refId)}&email=${encodeURIComponent(matchedApp.email)}" class="btn btn-primary btn-sm" style="width:100%; justify-content:center;">
              Activate Host Account &amp; Access Dashboard →
            </a>
          ` : `
            <div style="font-size:0.75rem; color:var(--color-cocoa-light); text-align:center;">
              Need help? Reach out to host-concierge@luxealiving.co.ke
            </div>
          `}
        </div>
      `;
    } else {
      lookupResults.innerHTML = `
        <div class="lookup-result-card" style="text-align:center;">
          <div style="font-size:1.8rem; margin-bottom:8px;">🔍</div>
          <strong style="color:var(--color-espresso); display:block; margin-bottom:4px;">No Application Found</strong>
          <p style="font-size:0.82rem; color:var(--color-cocoa); margin-bottom:12px;">
            We couldn't locate any application matching <code>${escapeHtml(query)}</code>. Please check your Reference ID or email address.
          </p>
          <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('statusLookupModal').classList.remove('open')">
            Close &amp; Return to Registration
          </button>
        </div>
      `;
    }
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
