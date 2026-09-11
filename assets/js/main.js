/**
 * LUXEA LIVING — MAIN ENTRY POINT (main.js)
 * Global utilities, toasts, announcement bar, mobile navigation
 */

window.showToast = function (message) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

document.addEventListener('DOMContentLoaded', () => {
  // Announcement banner close
  const closeAnnouncement = document.getElementById('closeAnnouncement');
  const announcementBar = document.getElementById('announcementBar');
  if (closeAnnouncement && announcementBar) {
    closeAnnouncement.addEventListener('click', () => {
      announcementBar.style.display = 'none';
    });
  }

  // Update footer year
  const yearEl = document.getElementById('currentYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Close modals on backdrop click or ESC
  document.querySelectorAll('.lux-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.lux-modal-overlay.active').forEach(m => m.classList.remove('active'));
    }
  });
});
