/**
 * LUXEA LIVING — SHARED MODERN FOOTER (footer.js)
 */
export function initFooter() {
  if (window.location.pathname.startsWith('/admin')) return;
  if (document.getElementById('luxGlobalFooter')) return;

  const footer = document.createElement('footer');
  footer.id = 'luxGlobalFooter';
  footer.style.cssText = 'background:#1E140F; color:#EDE8E3; margin-top:56px; padding:44px 20px 88px; border-top:1px solid rgba(178,135,86,0.25); font-family:var(--font-sans, "Plus Jakarta Sans", sans-serif);';
  footer.innerHTML = `
    <div style="max-width:1180px; margin:0 auto; display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:28px;">
      <div>
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
          <span style="width:32px; height:32px; border-radius:50%; background:#B28756; color:#1E140F; display:inline-flex; align-items:center; justify-content:center; font-family:'Cormorant Garamond',serif; font-weight:700; font-size:1.1rem;">L</span>
          <strong style="font-family:'Cormorant Garamond',serif; font-size:1.35rem; color:#FFFFFF;">Luxea Living</strong>
        </div>
        <p style="font-size:0.82rem; color:#C5BCB3; line-height:1.5; margin:0;">Curated homes, verified hotels &amp; doorstep valet care across Kenya. Standard KSh pricing.</p>
      </div>

      <div>
        <div style="font-size:0.74rem; text-transform:uppercase; letter-spacing:0.08em; color:#D4AF37; font-weight:700; margin-bottom:10px;">Explore</div>
        <div style="display:flex; flex-direction:column; gap:8px; font-size:0.84rem;">
          <a href="/stays" style="color:#EDE8E3; text-decoration:none;">Stays</a>
          <a href="/hotels" style="color:#EDE8E3; text-decoration:none;">Hotels</a>
          <a href="/trips" style="color:#EDE8E3; text-decoration:none;">My Trips</a>
          <a href="/laundry" style="color:#EDE8E3; text-decoration:none;">Laundry Valet</a>
        </div>
      </div>

      <div>
        <div style="font-size:0.74rem; text-transform:uppercase; letter-spacing:0.08em; color:#D4AF37; font-weight:700; margin-bottom:10px;">Partners</div>
        <div style="display:flex; flex-direction:column; gap:8px; font-size:0.84rem;">
          <a href="/host" style="color:#EDE8E3; text-decoration:none;">List a Home or Hotel</a>
          <a href="/host?mode=manage" style="color:#EDE8E3; text-decoration:none;">Host &amp; Hotel Dashboard</a>
          <a href="/partners" style="color:#EDE8E3; text-decoration:none;">Founding Host Circle</a>
          <a href="/waitlist" style="color:#EDE8E3; text-decoration:none;">VIP Guest Waitlist</a>
        </div>
      </div>

      <div>
        <div style="font-size:0.74rem; text-transform:uppercase; letter-spacing:0.08em; color:#D4AF37; font-weight:700; margin-bottom:10px;">Company</div>
        <div style="display:flex; flex-direction:column; gap:8px; font-size:0.84rem;">
          <a href="/about" style="color:#EDE8E3; text-decoration:none;">About Us</a>
          <a href="/faqs" style="color:#EDE8E3; text-decoration:none;">FAQs</a>
          <a href="mailto:concierge@luxealiving.co.ke" style="color:#EDE8E3; text-decoration:none;">concierge@luxealiving.co.ke</a>
        </div>
      </div>
    </div>

    <div style="max-width:1180px; margin:28px auto 0; padding-top:18px; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; font-size:0.76rem; color:#A89F96;">
      <span>© ${new Date().getFullYear()} Luxea Living Kenya. All rights reserved.</span>
      <span>Nairobi · Diani · Naivasha · Nanyuki</span>
    </div>
  `;

  document.body.appendChild(footer);
}
