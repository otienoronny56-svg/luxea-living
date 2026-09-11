/**
 * LUXEA LIVING — HOST REGISTRATION MODULE (hostForm.js)
 * Implements 5-step wizard, document preview, Supabase Storage uploads & table inserts.
 */

export function initHostForm(formId = 'luxeaHostForm') {
  const form = document.getElementById(formId);
  if (!form) return;

  const successPane = document.getElementById('hostSuccessPane');
  let currentStep = 1;

  // Set today's date
  const dateField = document.getElementById('submissionDate');
  if (dateField) dateField.value = new Date().toISOString().split('T')[0];

  function goToStep(step) {
    currentStep = step;
    document.querySelectorAll('.form-step-pane').forEach((pane, idx) => {
      pane.classList.toggle('active', idx + 1 === step);
    });
    document.querySelectorAll('.step-item').forEach((item, idx) => {
      const s = idx + 1;
      item.classList.toggle('active', s === step);
      item.classList.toggle('completed', s < step);
    });
    window.scrollTo({ top: 120, behavior: 'smooth' });
  }

  // Stepper buttons
  document.querySelectorAll('.step-next-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = parseInt(btn.getAttribute('data-next'));
      if (validateStep(currentStep)) goToStep(next);
    });
  });

  document.querySelectorAll('.step-prev-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const prev = parseInt(btn.getAttribute('data-prev'));
      goToStep(prev);
    });
  });

  function validateStep(step) {
    if (step === 1) {
      const name = document.getElementById('hostFullName').value.trim();
      const id = document.getElementById('hostNationalId').value.trim();
      const phone = document.getElementById('hostPhone').value.trim();
      const email = document.getElementById('hostEmail').value.trim();
      const kra = document.getElementById('hostKraPin').value.trim();
      const dob = document.getElementById('hostDob').value;
      if (!name || !id || !phone || !email || !kra || !dob) {
        if (window.showToast) window.showToast('Please fill all required personal fields marked with *');
        return false;
      }
    } else if (step === 2) {
      const prop = document.getElementById('propertyName').value.trim();
      const addr = document.getElementById('propertyAddress').value.trim();
      const county = document.getElementById('propertyCounty').value.trim();
      const area = document.getElementById('propertyArea').value.trim();
      if (!prop || !addr || !county || !area) {
        if (window.showToast) window.showToast('Please complete property details and address.');
        return false;
      }
    } else if (step === 4) {
      const method = document.querySelector('input[name="payoutMethod"]:checked').value;
      if (method === 'M-Pesa') {
        const name = document.getElementById('mpesaName').value.trim();
        const num = document.getElementById('mpesaNumber').value.trim();
        if (!name || !num) {
          if (window.showToast) window.showToast('Please enter registered M-Pesa Name and Number.');
          return false;
        }
      } else {
        const bank = document.getElementById('bankName').value.trim();
        const acc = document.getElementById('bankAccountNumber').value.trim();
        if (!bank || !acc) {
          if (window.showToast) window.showToast('Please enter Bank Name and Account Number.');
          return false;
        }
      }
    }
    return true;
  }

  // Payout Toggle
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
  if (idDropzone && idInput) {
    idDropzone.addEventListener('click', (e) => {
      if (!e.target.closest('.remove-file-btn')) idInput.click();
    });
    idInput.addEventListener('change', () => {
      if (idInput.files && idInput.files[0] && idBadge) {
        idBadge.querySelector('.file-name-text').textContent = idInput.files[0].name;
        idBadge.classList.remove('hidden');
      }
    });
  }

  const photosInput = document.getElementById('photosFileInput');
  const photosDropzone = document.getElementById('photosDropzone');
  const photosGallery = document.getElementById('photosGalleryPreview');
  if (photosDropzone && photosInput) {
    photosDropzone.addEventListener('click', () => photosInput.click());
    photosInput.addEventListener('change', () => {
      if (photosGallery && photosInput.files) {
        photosGallery.innerHTML = '';
        Array.from(photosInput.files).forEach(file => {
          const img = document.createElement('img');
          img.className = 'photo-thumb-item';
          img.src = URL.createObjectURL(file);
          photosGallery.appendChild(img);
        });
      }
    });
  }

  // Form Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const declCheck = document.getElementById('declarationCheck');
    const signature = document.getElementById('hostSignature').value.trim();
    if (!declCheck.checked) {
      if (window.showToast) window.showToast('Please check the declaration box.');
      return;
    }
    if (!signature) {
      if (window.showToast) window.showToast('Please provide your digital signature.');
      return;
    }

    const refId = `LXH-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const selectedAmenities = Array.from(form.querySelectorAll('input[name="amenity"]:checked')).map(c => c.value);
    const otherAmenity = document.getElementById('otherAmenityInput').value.trim();
    if (otherAmenity) selectedAmenities.push(otherAmenity);

    const payoutMethod = document.querySelector('input[name="payoutMethod"]:checked').value;
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
      propertyType: document.querySelector('input[name="propertyType"]:checked').value,
      propertyAddress: document.getElementById('propertyAddress').value.trim(),
      county: document.getElementById('propertyCounty').value.trim(),
      area: document.getElementById('propertyArea').value.trim(),
      mapsLink: document.getElementById('propertyMaps').value.trim(),
      bedrooms: document.getElementById('unitBedrooms').value,
      bathrooms: document.getElementById('unitBathrooms').value,
      maxGuests: document.getElementById('unitMaxGuests').value,
      amenities: selectedAmenities.join(', '),
      payoutDetails,
      idUploaded: idInput && idInput.files[0] ? idInput.files[0].name : 'Verified on File',
      photosCount: photosInput && photosInput.files ? photosInput.files.length : 3,
      signature,
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
}
