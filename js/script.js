/* ============================================
   SEMENTAUN — site behaviour
   ============================================ */

/* ---------- mobile nav ---------- */
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.classList.toggle('open', open);
  navToggle.setAttribute('aria-expanded', String(open));
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

/* ---------- header background on scroll ---------- */
const header = document.getElementById('siteHeader');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

/* ---------- click-to-load video embeds ----------
   Thumbnails render immediately; the YouTube iframe is only created when a card
   is clicked, so 30 videos cost 30 images instead of 30 embedded players. */
document.querySelectorAll('.video-card').forEach(card => {
  const thumb = card.querySelector('.video-thumb');
  const id = card.dataset.id;
  if (!thumb || !id) return;

  thumb.addEventListener('click', () => {
    if (thumb.querySelector('iframe')) return;

    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    iframe.title = card.querySelector('.video-title')?.textContent.trim() || 'Sementaun cover';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    thumb.appendChild(iframe);
    thumb.classList.add('is-playing');
  });
});

/* ---------- show all / show fewer videos ---------- */
const showAllBtn = document.getElementById('showAllVideos');

if (showAllBtn) {
  const hiddenCards = Array.from(document.querySelectorAll('.video-card.is-hidden'));

  showAllBtn.addEventListener('click', () => {
    const expanding = hiddenCards[0]?.classList.contains('is-hidden');

    hiddenCards.forEach(card => {
      card.classList.toggle('is-hidden', !expanding);
      if (expanding) card.classList.add('visible');
    });

    showAllBtn.textContent = expanding ? showAllBtn.dataset.less : showAllBtn.dataset.more;

    if (!expanding) {
      // collapsing: stop any player that was inside a card we just hid
      hiddenCards.forEach(card => {
        const iframe = card.querySelector('iframe');
        if (iframe) iframe.remove();
        card.querySelector('.video-thumb')?.classList.remove('is-playing');
      });
      document.getElementById('watch').scrollIntoView({ block: 'start' });
    }
  });
}

/* ---------- scroll reveal ---------- */
const revealItems = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      obs.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

  revealItems.forEach(el => observer.observe(el));
} else {
  revealItems.forEach(el => el.classList.add('visible'));
}

/* ---------- footer year ---------- */
document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- fan club form ----------
   No signup backend yet, so this opens a pre-filled email to the band's inbox
   instead. Swap for Mailchimp / Buttondown / Formspree once one is set up. */
const fanclubForm = document.getElementById('fanclubForm');
const fanclubStatus = document.getElementById('fanclubStatus');
const FANCLUB_EMAIL = 'hello@weverx.com';

fanclubForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const email = fanclubForm.email.value.trim();
  if (!email || !email.includes('@')) {
    fanclubStatus.textContent = 'Drop a valid email so we can reach you.';
    return;
  }

  const subject = encodeURIComponent('Fan Club Signup');
  const body = encodeURIComponent(`Hey Sementaun, add me to the fan club!\n\nMy email: ${email}`);
  window.location.href = `mailto:${FANCLUB_EMAIL}?subject=${subject}&body=${body}`;

  fanclubStatus.textContent = `Opening your email app — send it to ${FANCLUB_EMAIL} and you're in.`;
});
