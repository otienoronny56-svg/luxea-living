/**
 * LUXEA LIVING — CURRENCY MODULE (currency.js)
 * Toggles USD ($) and KES (KSh) prices with live conversion
 */

export function initCurrency() {
  const rate = (window.LUXEA_CONFIG && window.LUXEA_CONFIG.currency.exchangeRateUsdToKes) || 130;
  let currentCurrency = localStorage.getItem('luxea_currency') || 'USD';

  function applyCurrency(curr) {
    currentCurrency = curr;
    localStorage.setItem('luxea_currency', curr);

    const toggleBtn = document.getElementById('currencyToggle');
    if (toggleBtn) {
      const label = toggleBtn.querySelector('.currency-label');
      if (label) label.textContent = curr === 'USD' ? 'USD ($)' : 'KES (KSh)';
    }

    document.querySelectorAll('[data-usd]').forEach(el => {
      const usd = parseFloat(el.getAttribute('data-usd'));
      const kes = parseFloat(el.getAttribute('data-kes')) || Math.round(usd * rate);

      if (curr === 'USD') {
        el.textContent = `$${usd.toLocaleString()}`;
      } else {
        el.textContent = `KSh ${kes.toLocaleString()}`;
      }
    });
  }

  const toggleBtn = document.getElementById('currencyToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      applyCurrency(currentCurrency === 'USD' ? 'KES' : 'USD');
      if (window.showToast) window.showToast(`Currency set to ${currentCurrency}`);
    });
  }

  applyCurrency(currentCurrency);
  return { getCurrent: () => currentCurrency, applyCurrency };
}
