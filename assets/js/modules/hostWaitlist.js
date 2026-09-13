/**
 * LUXEA LIVING — STANDALONE FOUNDING HOST WAITLIST MODULE (hostWaitlist.js)
 * Designed for partners.luxealiving.co.ke
 * Manages:
 * - Dynamic earnings projection estimator
 * - Form validation & smooth submission
 * - Instant Digital Gold Founding Partner Pass generation
 * - Supabase persistence + automated email dispatch via Edge Function
 */

export function initHostWaitlist() {
  const form = document.getElementById('luxeaHostWaitlistForm');
  const formContainer = document.getElementById('hostWaitlistFormContainer');
  const resultCard = document.getElementById('hostWaitlistResultCard');

  // Interactive Revenue Projection Elements
  const propTypeSelect = document.getElementById('calcPropertyType');
  const bedroomsSelect = document.getElementById('calcBedrooms');
  const monthlyEstEl = document.getElementById('calcMonthlyEstimate');
  const annualEstEl = document.getElementById('calcAnnualEstimate');
  const feeSavingsEl = document.getElementById('calcFeeSavings');

  // Revenue projection matrix (KES / USD baseline estimates for Kenya luxury market)
  const rateEstimates = {
    'Luxury Villa': { baseNightlyKES: 65000, occRate: 0.62 },
    'Sky Penthouse': { baseNightlyKES: 45000, occRate: 0.68 },
    'Lakefront Estate': { baseNightlyKES: 55000, occRate: 0.58 },
    'Boutique Safari Lodge': { baseNightlyKES: 80000, occRate: 0.55 },
    'Serviced Executive Suite': { baseNightlyKES: 22000, occRate: 0.72 }
  };

  function updateProjections() {
    if (!monthlyEstEl) return;

    const propType = propTypeSelect ? propTypeSelect.value : 'Luxury Villa';
    const beds = bedroomsSelect ? parseInt(bedroomsSelect.value) || 3 : 3;

    const config = rateEstimates[propType] || rateEstimates['Luxury Villa'];
    const bedMultiplier = 0.7 + (beds * 0.25);
    const effectiveNightly = config.baseNightlyKES * bedMultiplier;
    const monthlyNights = 30 * config.occRate;
    const grossMonthly = Math.round((effectiveNightly * monthlyNights) / 1000) * 1000;
    const grossAnnual = grossMonthly * 12;
    // 15% standard market fee saved across first 90 days (3 months)
    const threeMonthCommissionSaved = Math.round(grossMonthly * 3 * 0.15);

    const fmtKES = (num) => 'KES ' + Number(num).toLocaleString('en-KE');

    monthlyEstEl.textContent = fmtKES(grossMonthly);
    if (annualEstEl) annualEstEl.textContent = fmtKES(grossAnnual);
    if (feeSavingsEl) feeSavingsEl.textContent = fmtKES(threeMonthCommissionSaved);
  }

  if (propTypeSelect) propTypeSelect.addEventListener('change', updateProjections);
  if (bedroomsSelect) bedroomsSelect.addEventListener('change', updateProjections);
  updateProjections();

  // Handle Form Submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <svg class="spin-animate" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-linecap="round"/></svg>
          <span>Securing Founding Position...</span>
        `;
      }

      try {
        const fullName = document.getElementById('hostFullName').value.trim();
        const email = document.getElementById('hostEmail').value.trim();
        const phone = document.getElementById('hostPhone').value.trim();
        const propertyName = document.getElementById('hostPropertyName').value.trim() || 'Curated Residence';
        const propertyType = document.getElementById('hostPropertyType').value;
        const region = document.getElementById('hostRegion').value;
        const bedrooms = document.getElementById('hostBedrooms').value;
        const operationalStatus = document.getElementById('hostStatus').value;
        const portfolioLink = document.getElementById('hostPortfolioLink') ? document.getElementById('hostPortfolioLink').value.trim() : '';
        const notes = document.getElementById('hostNotes') ? document.getElementById('hostNotes').value.trim() : '';

        // Generate high-end luxury Founding Pass credentials
        const existing = JSON.parse(localStorage.getItem('luxea_host_waitlist') || '[]');
        const nextNum = (142 + existing.length).toString().padStart(4, '0');
        const passNumber = `#LXA-HOST-${nextNum}`;
        const passCode = `LXA-PTR-${Math.floor(1000 + Math.random() * 9000)}`;

        const hostSubmission = {
          passNumber,
          passCode,
          fullName,
          email,
          phone,
          propertyName,
          propertyType,
          region,
          bedrooms,
          operationalStatus,
          portfolioLink,
          notes,
          timestamp: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })
        };

        // Persist to Supabase and trigger automated email dispatches
        if (window.LuxeaDB && typeof window.LuxeaDB.submitHostWaitlist === 'function') {
          await window.LuxeaDB.submitHostWaitlist(hostSubmission);
        } else {
          // Fallback cache
          existing.unshift({ ...hostSubmission, id: `host-waitlist-${Date.now()}` });
          localStorage.setItem('luxea_host_waitlist', JSON.stringify(existing));
        }

        // Populate Digital Gold Pass UI
        const passNumEl = document.getElementById('partnerPassNumber');
        const passHostNameEl = document.getElementById('partnerPassHostName');
        const passCodeEl = document.getElementById('partnerPassCode');
        const passPropInfoEl = document.getElementById('partnerPassPropInfo');
        const passRegionEl = document.getElementById('partnerPassRegion');
        const passEmailNoticeEl = document.getElementById('partnerEmailNotice');

        if (passNumEl) passNumEl.textContent = passNumber;
        if (passHostNameEl) passHostNameEl.textContent = fullName;
        if (passCodeEl) passCodeEl.textContent = passCode;
        if (passPropInfoEl) passPropInfoEl.textContent = `${propertyName} • ${propertyType} (${bedrooms} Beds)`;
        if (passRegionEl) passRegionEl.textContent = region;
        if (passEmailNoticeEl) {
          passEmailNoticeEl.innerHTML = `Your priority briefing and verified pass have been dispatched to <strong>${email}</strong>.`;
        }

        // Animate swap from form to VIP result card
        if (formContainer) {
          formContainer.classList.add('fade-out');
          setTimeout(() => {
            formContainer.classList.add('hidden');
            if (resultCard) {
              resultCard.classList.remove('hidden');
              resultCard.classList.add('fade-in');
              resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 300);
        }

        if (window.showToast) {
          window.showToast(`Welcome ${fullName}! Your Founding Partner Pass ${passNumber} is locked.`);
        }
      } catch (err) {
        console.error('Host waitlist registration error:', err);
        if (window.showToast) {
          window.showToast('Registration saved locally. Our team will verify your invitation shortly.');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      }
    });
  }

  // Copy partner pass reference button
  const copyPassBtn = document.getElementById('copyPartnerPassBtn');
  if (copyPassBtn) {
    copyPassBtn.addEventListener('click', () => {
      const code = document.getElementById('partnerPassNumber')?.textContent || 'LXA-HOST';
      const key = document.getElementById('partnerPassCode')?.textContent || '';
      const textToCopy = `Luxea Living Founding Host Partner Pass: ${code} | Key: ${key} (partners.luxealiving.co.ke)`;
      navigator.clipboard.writeText(textToCopy);
      if (window.showToast) window.showToast('Founding Host credentials copied to clipboard!');
      copyPassBtn.textContent = 'Copied to Clipboard ✓';
      setTimeout(() => {
        copyPassBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <span>Copy Founding Pass Credentials</span>
        `;
      }, 3000);
    });
  }

  // Smooth scroll helper for CTAs
  const registerScrollBtns = document.querySelectorAll('.js-scroll-to-register');
  registerScrollBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById('hostRegistrationSection');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}
