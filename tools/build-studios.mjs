/**
 * Regenerates the studio cards in studio/index.html from tools/studios.json.
 *
 * This runs as the Vercel build step, so editing studios.json (from the admin
 * dashboard, the GitHub web UI, or locally) is enough — the static HTML is
 * rebuilt automatically on deploy. Cards are emitted as real HTML rather than
 * rendered client-side so every listing stays crawlable.
 *
 * Local run:  node tools/build-studios.mjs
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dataPath = join(here, 'studios.json');
const pagePath = join(root, 'studio', 'index.html');

const START = '      <!-- STUDIO_LIST:START -->';
const END = '      <!-- STUDIO_LIST:END -->';

const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const mapsUrl = (s) => {
  const q = s.address ? `${s.name}, ${s.address}` : `${s.name}, Malang`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
};

function card(s) {
  const classes = ['studio-card'];
  if (s.featured) classes.push('studio-card--featured');

  const blob = esc(`${s.name} ${s.area || ''} ${s.district || ''} ${s.address || ''}`).toLowerCase();
  const badge = s.featured ? ' <span class="studio-badge">Studio kami</span>' : '';

  const status = s.verified
    ? `          <span class="studio-status studio-status--verified" title="Alamat dan kontak dicocokkan dengan sumber publik pada ${esc(s.verifiedOn || '')}">Terverifikasi &middot; ${esc(s.verifiedOn || '')}</span>`
    : '          <span class="studio-status studio-status--unverified">Belum terverifikasi</span>';

  const rows = [];
  if (s.address) rows.push(`          <div><dt>Alamat</dt><dd>${esc(s.address)}</dd></div>`);
  rows.push(
    s.price
      ? `          <div><dt>Tarif</dt><dd class="studio-price-val">${esc(s.price)}</dd></div>`
      : `          <div><dt>Tarif</dt><dd class="studio-unknown">Belum ada data &mdash; tanyakan langsung</dd></div>`
  );
  if (s.hours) rows.push(`          <div><dt>Jam buka</dt><dd>${esc(s.hours)}</dd></div>`);
  if (s.phone) {
    const tel = String(s.phone).replace(/[^0-9+]/g, '');
    rows.push(`          <div><dt>Telepon</dt><dd><a href="tel:${tel}">${esc(s.phone)}</a></dd></div>`);
  }
  if (s.instagram) {
    const handle = '@' + s.instagram.replace(/\/+$/, '').split('/').pop();
    rows.push(
      `          <div><dt>Instagram</dt><dd><a href="${esc(s.instagram)}" target="_blank" rel="noopener">${esc(handle)}</a></dd></div>`
    );
  }
  rows.push(
    `          <div><dt>Peta</dt><dd><a class="studio-map" href="${esc(mapsUrl(s))}" target="_blank" rel="noopener nofollow">Buka di Google Maps</a></dd></div>`
  );

  const note = s.notes ? `        <p class="studio-note">${esc(s.notes)}</p>\n` : '';

  return (
    `      <article class="${classes.join(' ')}" data-search="${blob}" data-district="${esc(s.district || '')}" data-verified="${s.verified ? 'true' : 'false'}">\n` +
    `        <div class="studio-head">\n` +
    `          <h2>${esc(s.name)}${badge}</h2>\n` +
    `${status}\n` +
    `        </div>\n` +
    `        <dl class="studio-meta">\n` +
    rows.join('\n') + '\n' +
    `        </dl>\n` +
    note +
    `      </article>\n`
  );
}

// Editors on Windows (PowerShell's Set-Content, Notepad) prepend a UTF-8 BOM,
// which JSON.parse rejects. Strip it so a local edit can't break the build.
const raw = (await readFile(dataPath, 'utf8')).replace(/^﻿/, '');
const studios = JSON.parse(raw);
const verified = studios.filter((s) => s.verified).length;

let html = await readFile(pagePath, 'utf8');
const startIdx = html.indexOf(START);
const endIdx = html.indexOf(END);

if (startIdx < 0 || endIdx < 0) {
  throw new Error(`Markers STUDIO_LIST:START / STUDIO_LIST:END not found in ${pagePath}`);
}

const cards = studios.map(card).join('\n');
html = html.slice(0, startIdx + START.length) + '\n' + cards + html.slice(endIdx);

// keep the visible counts and schema in sync with the data
html = html
  .replace(/(<span id="countTotal">)\d+(<\/span>)/, `$1${studios.length}$2`)
  .replace(/(<span id="countVerified">)\d+(<\/span>)/, `$1${verified}$2`)
  .replace(/("numberOfItems":\s*)\d+/, `$1${studios.length}`);

await writeFile(pagePath, html, 'utf8');

console.log(`Generated ${studios.length} studio cards (${verified} verified) into studio/index.html`);
