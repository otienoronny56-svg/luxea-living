/**
 * LUXEA LIVING — GUEST WAITLIST MODULE (waitlist.js)
 * Form processing, Supabase sync, and VIP Priority Pass generation
 */

export function initWaitlist() {
  const waitlistForm = document.getElementById('luxeaGuestWaitlistForm');
  const inlineForm = document.getElementById('inlineWaitlistForm');
  const waitlistModal = document.getElementById('waitlistModalOverlay');
  const waitlistFormBody = document.getElementById('waitlistFormBody');
  const waitlistResultCard = document.getElementById('waitlistResultCard');

  function getGuests() {
    try {
      return JSON.parse(localStorage.getItem('luxea_waitlist_guests') || '[]');
    } catch {
      return [];
    }
  }

  function handleRegistration(fullName, email, phone = '', destinations = 'All Collections') {
    const guests = getGuests();
    const passNumber = (1249 + guests.length).toString().padStart(4, '0');
    const passCode = `LXA-VIP-${Math.floor(1000 + Math.random() * 9000)}`;

    const newGuest = {
      id: `guest-${Date.now()}`,
      passNumber: `#${passNumber}`,
      passCode,
      fullName,
      email,
      phone: phone || 'Not provided',
      destinations,
      timestamp: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })
    };

    // Save to local cache
    guests.unshift(newGuest);
    localStorage.setItem('luxea_waitlist_guests', JSON.stringify(guests));

    // Real-time Supabase Database Sync
    if (window.LuxeaDB) {
      window.LuxeaDB.submitWaitlistGuest(newGuest);
    }

    // Update VIP Card UI
    const numEl = document.getElementById('vipPositionNumber');
    const nameEl = document.getElementById('vipMemberName');
    const codeEl = document.getElementById('vipCodeText');

    if (numEl) numEl.textContent = `#${passNumber}`;
    if (nameEl) nameEl.textContent = fullName;
    if (codeEl) codeEl.textContent = passCode;

    const inlineContainer = document.getElementById('inlineWaitlistFormContainer');
    if (inlineContainer) inlineContainer.classList.add('hidden');
    if (waitlistFormBody) waitlistFormBody.classList.add('hidden');
    if (waitlistResultCard) {
      waitlistResultCard.classList.remove('hidden');
      waitlistResultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (waitlistModal) waitlistModal.classList.add('active');

    if (window.showToast) {
      window.showToast(`Welcome ${fullName}! You are #${passNumber} on the waitlist.`);
    }

    // Trigger update of counters
    window.dispatchEvent(new CustomEvent('luxea:dataUpdated'));
  }

  if (waitlistForm) {
    waitlistForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('guestModalName').value.trim();
      const email = document.getElementById('guestModalEmail').value.trim();
      const phone = document.getElementById('guestModalPhone').value.trim();
      const dests = Array.from(waitlistForm.querySelectorAll('input[name="dest"]:checked')).map(c => c.value).join(', ');

      if (name && email) {
        handleRegistration(name, email, phone, dests || 'All Collections');
      }
    });
  }

  if (inlineForm) {
    inlineForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('inlineGuestName').value.trim();
      const email = document.getElementById('inlineGuestEmail').value.trim();

      if (name && email) {
        handleRegistration(name, email, '', 'All Early Drops');
        inlineForm.reset();
      }
    });
  }

  // Copy invite link button
  const copyBtn = document.getElementById('copyShareLinkBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.origin + window.location.pathname);
      if (window.showToast) window.showToast('Exclusive invite link copied to clipboard!');
    });
  }
}
