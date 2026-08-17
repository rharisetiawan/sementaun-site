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

/* ---------- scroll reveal ----------
   Shared observer — both the static markup and the videos rendered later
   by fetchArchive() register with it via observeReveal(). */
let revealObserver = null;

if ('IntersectionObserver' in window) {
  revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      obs.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
}

function observeReveal(el) {
  if (revealObserver) {
    revealObserver.observe(el);
  } else {
    el.classList.add('visible');
  }
}

document.querySelectorAll('.reveal').forEach(observeReveal);

/* ---------- click-to-load video embed ----------
   Thumbnail renders immediately; the YouTube iframe is only created on click,
   so a big archive costs N thumbnails instead of N embedded players. */
function wireVideoCard(card) {
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
}

/* ---------- archive: fetched live from the YouTube playlist ----------
   /api/playlist is a Vercel serverless function that calls the YouTube Data API
   server-side (keeps the key off the client) and returns the playlist in order.
   Add a video to the playlist on YouTube and it shows up here on next page load —
   nothing in this repo needs to change. */
const INITIAL_VISIBLE = 12;

// YouTube titles are inconsistently formatted ("Artist - Song (Cover by
// Sementaun)", "Sementaun - Song (Artist Cover)", plain titles, etc.) — this only
// strips the noise common to most of them. It never guesses at an artist name,
// so there's nothing here that can end up wrong, just occasionally unstripped.
function cleanVideoTitle(raw) {
  let t = raw || '';
  t = t.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\s]+/u, '');
  t = t.replace(/\(?\s*live\s+cover\s+by\s+sementaun\s*\)?/gi, '');
  t = t.replace(/\(?\s*cover\s+by\s+sementaun\s*\)?/gi, '');
  t = t.replace(/\(\s*ft\.?[^)]*\)/gi, '');
  t = t.replace(/-\s*at\s+.+$/i, '');
  t = t.replace(/\(\s*\)/g, '');
  t = t.replace(/\s{2,}/g, ' ').trim();
  t = t.replace(/^[-–—\s]+|[-–—\s]+$/g, '').trim();
  return t || (raw || '').trim();
}

function buildVideoCard(video, hidden) {
  const title = cleanVideoTitle(video.title);

  const card = document.createElement('article');
  card.className = hidden ? 'video-card is-hidden' : 'video-card reveal';
  if (hidden) card.dataset.extra = 'true';
  card.dataset.id = video.id;

  const thumb = document.createElement('button');
  thumb.className = 'video-thumb';
  thumb.setAttribute('aria-label', `Play ${title}`);

  const img = document.createElement('img');
  img.src = video.thumbnail;
  img.alt = '';
  img.loading = 'lazy';

  const playIcon = document.createElement('span');
  playIcon.className = 'play-icon';
  playIcon.setAttribute('aria-hidden', 'true');

  thumb.append(img, playIcon);

  const heading = document.createElement('h3');
  heading.className = 'video-title';
  heading.textContent = title;

  card.append(thumb, heading);
  return card;
}

async function fetchArchive() {
  const grid = document.getElementById('videoGrid');
  const status = document.getElementById('videoGridStatus');
  const actions = document.getElementById('watchActions');
  const showAllBtn = document.getElementById('showAllVideos');

  try {
    const res = await fetch('/api/playlist');
    const data = await res.json();

    if (!res.ok || !Array.isArray(data.videos)) {
      throw new Error(data.error || 'Could not load the archive');
    }

    status.remove();

    if (data.videos.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'video-grid-status';
      empty.textContent = 'No covers in the playlist yet.';
      grid.appendChild(empty);
      return;
    }

    data.videos.forEach((video, i) => {
      const card = buildVideoCard(video, i >= INITIAL_VISIBLE);
      grid.appendChild(card);
      if (card.classList.contains('reveal')) observeReveal(card);
      wireVideoCard(card);
    });

    if (data.videos.length > INITIAL_VISIBLE) {
      showAllBtn.dataset.more = `Show all ${data.videos.length} covers`;
      showAllBtn.textContent = showAllBtn.dataset.more;
      showAllBtn.hidden = false;
    } else {
      showAllBtn.hidden = true;
    }
    actions.hidden = false;

    wireShowAllToggle();
  } catch (err) {
    status.textContent = "Couldn't load the archive right now — browse it directly on YouTube instead.";
    actions.hidden = false;
    showAllBtn.hidden = true;
  }
}

function wireShowAllToggle() {
  const showAllBtn = document.getElementById('showAllVideos');
  if (!showAllBtn || showAllBtn.dataset.wired) return;
  showAllBtn.dataset.wired = 'true';

  let expanded = false;

  showAllBtn.addEventListener('click', () => {
    expanded = !expanded;
    const extraCards = document.querySelectorAll('.video-card[data-extra="true"]');

    extraCards.forEach(card => {
      card.classList.toggle('is-hidden', !expanded);
      if (expanded) {
        card.classList.add('reveal');
        observeReveal(card);
      }
    });

    showAllBtn.textContent = expanded ? showAllBtn.dataset.less : showAllBtn.dataset.more;

    if (!expanded) {
      extraCards.forEach(card => {
        const iframe = card.querySelector('iframe');
        if (iframe) iframe.remove();
        card.querySelector('.video-thumb')?.classList.remove('is-playing');
      });
      document.getElementById('watch').scrollIntoView({ block: 'start' });
    }
  });
}

fetchArchive();

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
