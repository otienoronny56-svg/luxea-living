/**
 * LUXEA LIVING — CURRENCY MODULE (currency.js)
 * Standard currency across the entire site is Kenyan Shillings (KSh / KES).
 * Users can optionally switch to USD, EUR, or GBP via the compact header switcher.
 */

const DEFAULT_CURRENCY = 'KES';
const STORAGE_KEY = 'luxea_currency';

function getUsdRate() {
  return (window.LUXEA_CONFIG && window.LUXEA_CONFIG.currency && window.LUXEA_CONFIG.currency.exchangeRateUsdToKes) || 130;
}

export function getCurrencyRates() {
  const usd = getUsdRate();
  return {
    KES: { code: 'KES', symbol: 'KSh', perUnitKes: 1, label: 'KSh' },
    USD: { code: 'USD', symbol: '$', perUnitKes: usd, label: 'USD' },
    EUR: { code: 'EUR', symbol: '€', perUnitKes: Math.round(usd * 1.08), label: 'EUR' },
    GBP: { code: 'GBP', symbol: '£', perUnitKes: Math.round(usd * 1.27), label: 'GBP' }
  };
}

export function getCurrency() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const rates = getCurrencyRates();
    if (saved && rates[saved]) return saved;
  } catch (e) {}
  return DEFAULT_CURRENCY;
}

export function formatFromKes(kesAmount, currencyCode) {
  const code = currencyCode || getCurrency();
  const rates = getCurrencyRates();
  const meta = rates[code] || rates.KES;
  const num = Number(kesAmount) || 0;
  const converted = code === 'KES' ? Math.round(num) : Math.round(num / meta.perUnitKes);
  return code === 'KES'
    ? `KSh ${converted.toLocaleString()}`
    : `${meta.symbol}${converted.toLocaleString()}`;
}

function applyPriceToElement(el, currencyCode) {
  const usdRate = getUsdRate();
  const rawKes = parseFloat(el.getAttribute('data-kes'));
  const rawUsd = parseFloat(el.getAttribute('data-usd'));
  const kes = !isNaN(rawKes) ? rawKes : (!isNaN(rawUsd) ? rawUsd * usdRate : NaN);
  if (isNaN(kes)) return;

  const formatted = formatFromKes(kes, currencyCode);
  const hasNight =
    el.getAttribute('data-per-night') === 'true' ||
    el.innerHTML.includes('/ night') ||
    el.classList.contains('card-large-price') ||
    el.classList.contains('shelf-price');

  if (hasNight) {
    el.setAttribute('data-per-night', 'true');
    el.innerHTML = `${formatted}<small style="font-size: 0.82em; font-weight: normal; color: inherit; opacity: 0.8;"> / night</small>`;
  } else {
    el.textContent = formatted;
  }
}

export function refreshPrices(currencyCode) {
  const code = currencyCode || getCurrency();
  document.querySelectorAll('[data-kes], [data-usd]').forEach(el => {
    applyPriceToElement(el, code);
  });
}

export function setCurrency(newCode) {
  const rates = getCurrencyRates();
  const code = rates[newCode] ? newCode : DEFAULT_CURRENCY;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch (e) {}

  document.querySelectorAll('.lux-currency-select').forEach(sel => {
    if (sel.value !== code) sel.value = code;
  });

  refreshPrices(code);
  window.dispatchEvent(new CustomEvent('luxea:currency_changed', { detail: { currency: code } }));
  return code;
}

function mountHeaderSwitcher(activeCode) {
  // Admin dashboard has its own dedicated currency switch in the toolbar
  if (window.location.pathname.startsWith('/admin')) return;
  if (document.getElementById('luxCurrencySelect')) {
    document.getElementById('luxCurrencySelect').value = activeCode;
    return;
  }

  const actionsBar = document.querySelector('.lux-header .header-actions');
  if (!actionsBar) return;

  const select = document.createElement('select');
  select.id = 'luxCurrencySelect';
  select.className = 'lux-currency-select';
  select.setAttribute('aria-label', 'Currency');
  select.title = 'Change currency (Default: KSh)';
  select.innerHTML = `
    <option value="KES">KSh</option>
    <option value="USD">USD ($)</option>
    <option value="EUR">EUR (€)</option>
    <option value="GBP">GBP (£)</option>
  `;
  select.value = activeCode;
  select.addEventListener('change', (e) => {
    setCurrency(e.target.value);
  });

  actionsBar.insertBefore(select, actionsBar.firstChild);
}

export function initCurrency() {
  const currentCurrency = getCurrency();

  const toggleBtn = document.getElementById('currencyToggle');
  if (toggleBtn) {
    const label = toggleBtn.querySelector('.currency-label');
    if (label) label.textContent = currentCurrency === 'KES' ? 'KSh' : currentCurrency;
  }

  mountHeaderSwitcher(currentCurrency);
  refreshPrices(currentCurrency);

  window.LuxeaCurrency = {
    getCurrency,
    setCurrency,
    formatFromKes,
    refreshPrices,
    getCurrencyRates
  };

  return {
    getCurrent: getCurrency,
    setCurrency,
    applyCurrency: refreshPrices,
    formatFromKes
  };
}

export function initCurrencyToggle() {
  return initCurrency();
}
