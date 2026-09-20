/**
 * LUXEA LIVING — CURRENCY MODULE (currency.js)
 * Standardized to Kenyan Shillings (KSh / KES) for luxury local and safari market.
 */

export function initCurrency() {
  const rate = (window.LUXEA_CONFIG && window.LUXEA_CONFIG.currency && window.LUXEA_CONFIG.currency.exchangeRateUsdToKes) || 130;
  // Always default strictly to KES as requested
  const currentCurrency = 'KES';
  localStorage.setItem('luxea_currency', 'KES');

  const toggleBtn = document.getElementById('currencyToggle');
  if (toggleBtn) {
    // If the element still exists in DOM, display KES or hide
    const label = toggleBtn.querySelector('.currency-label');
    if (label) label.textContent = 'KES (KSh)';
  }

  function applyCurrency(curr) {
    document.querySelectorAll('[data-kes], [data-usd]').forEach(el => {
      const kes = parseFloat(el.getAttribute('data-kes')) || (parseFloat(el.getAttribute('data-usd')) * rate);
      if (!isNaN(kes)) {
        // If element contains a sub-unit like / night, preserve it
        const hasNight = el.innerHTML.includes('/ night') || el.classList.contains('card-large-price') || el.id === 'detailPriceNum' || el.id === 'mobilePriceVal';
        if (hasNight) {
          el.innerHTML = `KSh ${Math.round(kes).toLocaleString()}<small style="font-size: 0.85em; font-weight: normal; color: inherit; opacity: 0.8;"> / night</small>`;
        } else {
          el.textContent = `KSh ${Math.round(kes).toLocaleString()}`;
        }
      }
    });
  }

  applyCurrency(currentCurrency);
  return { getCurrent: () => 'KES', applyCurrency };
}

export function refreshPrices() {
  const rate = (window.LUXEA_CONFIG && window.LUXEA_CONFIG.currency && window.LUXEA_CONFIG.currency.exchangeRateUsdToKes) || 130;
  document.querySelectorAll('[data-kes], [data-usd]').forEach(el => {
    const kes = parseFloat(el.getAttribute('data-kes')) || (parseFloat(el.getAttribute('data-usd')) * rate);
    if (!isNaN(kes)) {
      const hasNight = el.innerHTML.includes('/ night') || el.classList.contains('card-large-price') || el.id === 'detailPriceNum' || el.id === 'mobilePriceVal';
      if (hasNight) {
        el.innerHTML = `KSh ${Math.round(kes).toLocaleString()}<small style="font-size: 0.85em; font-weight: normal; color: inherit; opacity: 0.8;"> / night</small>`;
      } else {
        el.textContent = `KSh ${Math.round(kes).toLocaleString()}`;
      }
    }
  });
}

export function initCurrencyToggle() {
  return initCurrency();
}

