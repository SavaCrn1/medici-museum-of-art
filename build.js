#!/usr/bin/env node
/**
 * Static site builder — no dependencies, no toolchain.
 *
 *   node build.js
 *
 * Reads src/pages/*.html (body content) and wraps each one in the shared
 * shell defined below, writing plain HTML to the repository root so GitHub
 * Pages can serve it directly. Header, footer, contact details and hours are
 * written once here and injected everywhere, which is what stops the site
 * contradicting itself.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { site, nav } = require('./src/site.config.js');

/**
 * Cache-busting stamps for the stylesheet and scripts, filled in by build()
 * before any page is rendered.
 *
 * GitHub Pages serves assets with `Cache-Control: max-age=600`. Without a
 * versioned URL, for ten minutes after every deploy a returning visitor gets
 * the new HTML paired with the stylesheet they already had — and markup whose
 * CSS has not arrived does not degrade gracefully, it collapses. That is
 * exactly how a five-tile exhibition grid became five full-width pictures
 * stacked down the page.
 *
 * Hashing the file contents means the URL only changes when the file does, so
 * the cache still does its job on unchanged deploys.
 */
const assetVersion = { css: '', js: '', data: '', search: '' };

function hashOf(relativePath) {
  const full = path.join(ROOT, relativePath);
  if (!fs.existsSync(full)) return '0';
  return crypto.createHash('sha1').update(fs.readFileSync(full)).digest('hex').slice(0, 8);
}

const ROOT = __dirname;
const PAGES_DIR = path.join(ROOT, 'src', 'pages');

/* ---------------------------------------------------------------------------
   Page manifest. `slug` doubles as the output directory, and every slug is
   identical to the one the live Squarespace site already uses.
   --------------------------------------------------------------------------- */

const pages = [
  { file: 'home.html', slug: '', title: 'Medici Museum of Art', description: 'A free art museum in Warren, Ohio. Classic, modern and contemporary exhibitions, an outdoor sculpture garden, tours, workshops and events.' },
  { file: 'about-us-1.html', slug: 'about-us-1', title: 'About Us', description: 'The mission and vision of the Medici Museum of Art, a nonprofit museum offering free access to the visual arts in Warren, Ohio.' },
  { file: 'visit.html', slug: 'visit', title: 'Visit Us', description: 'Hours, address, parking, directions and travel information for the Medici Museum of Art in Warren, Ohio. Admission is free.' },
  { file: 'exhibits.html', slug: 'exhibits', title: 'Exhibitions', description: 'On view at the Medici Museum of Art: the Renie and James Grohl Collection, work by Carole A. Feuerman, and the outdoor sculpture garden.' },
  { file: 'upcomingevents.html', slug: 'upcomingevents', title: 'Upcoming Events and Classes', description: 'Workshops, storytimes, festivals and classes at the Medici Museum of Art, with dates, times and booking links.' },
  { file: 'tours.html', slug: 'tours', title: 'Tours', description: 'Book a guided tour of the Medici Museum of Art for individuals, school groups, businesses and private parties.' },
  { file: 'rentals.html', slug: 'rentals', title: 'Rentals', description: 'Host weddings, corporate events and private functions at the Medici Museum of Art in Warren, Ohio.' },
  { file: 'volunteer.html', slug: 'volunteer', title: 'Volunteer', description: 'Become a Medici Museum guide. Training is provided; no prior background in art history is needed.' },
  { file: 'donate.html', slug: 'donate', title: 'Donate', description: 'Support free admission, exhibitions and community programs at the Medici Museum of Art. All donations are tax deductible.' },
  { file: 'subscribe.html', slug: 'subscribe', title: 'Subscribe', description: 'Sign up for news, exhibition announcements and event invitations from the Medici Museum of Art.' },
  { file: 'contact-us.html', slug: 'contact-us', title: 'Contact Us', description: 'Call, email or write to the Medici Museum of Art, or send a message using the contact form.' },
];

/* ---------------------------------------------------------------------------
   Small helpers
   --------------------------------------------------------------------------- */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const esc = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address.mapQuery)}`;

const icons = {
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.25 1z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 8.5V7c0-.7.3-1 1-1h1.5V3H14c-2.2 0-3.5 1.4-3.5 3.7V8.5H8V12h2.5v9H14v-9h2.4l.4-3.5z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9s.7.8.9 1.4c.1.4.3 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4s-.8.7-1.4.9c-.4.1-1 .3-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9s-.7-.8-.9-1.4c-.1-.4-.3-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4s.8-.7 1.4-.9c.4-.1 1-.3 2.2-.4 1.3-.1 1.7-.1 4.8-.1zm0 5.8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 6.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2zm5.1-6.7a.94.94 0 1 1-.94-.94.94.94 0 0 1 .94.94z"/></svg>',
  search:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10.5 3a7.5 7.5 0 0 1 5.92 12.1l4.24 4.25-1.41 1.41-4.25-4.24A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z"/></svg>',
  chevronLeft: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15.4 4.6 8 12l7.4 7.4 1.4-1.4L10.8 12l6-6z"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8.6 4.6 7.2 6l6 6-6 6 1.4 1.4L16 12z"/></svg>',
};

/* ---------------------------------------------------------------------------
   Maps and email

   Every postal address on the site is a link to a map, and every email address
   opens Gmail's compose window.

   Maps: the href written into the HTML is always the Google Maps one, because
   it resolves on every platform and needs no JavaScript. Each link also
   carries data-map-query, and on Apple devices site.js rewrites the href to
   maps.apple.com — so an iPhone opens Maps rather than bouncing through a
   browser, and everyone else is unaffected.
   --------------------------------------------------------------------------- */

function googleMapsUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * @param query   what to search for — a full postal address
 * @param label   visible link text
 * @param cls     class list; an "action-link" gets the pin icon, a button does not
 * @param context extra words for the accessible name, e.g. the venue being located
 */
function mapLink(query, { label = 'Get directions', cls = 'action-link', context = '' } = {}) {
  const icon = cls.includes('action-link') ? icons.pin : '';
  const detail = context ? ` to ${context}` : '';
  return `<a class="${cls}" data-map-query="${esc(query)}" href="${googleMapsUrl(query)}" target="_blank" rel="noopener">${icon}<span>${esc(
    label
  )}</span><span class="visually-hidden">${esc(detail)} &mdash; ${esc(query)} (opens a map in a new tab)</span></a>`;
}

/**
 * Email links.
 *
 * site.email.provider decides the destination: "gmail" opens Gmail's compose
 * window, "mail" emits a plain mailto:. The visible text is always the address
 * itself, so the accessible name still contains it and WCAG 2.5.3 Label in
 * Name holds either way.
 */
function emailUrl(address) {
  return site.email.provider === 'gmail'
    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(address)}`
    : `mailto:${address}`;
}

function emailLink(address, { cls = 'action-link', label } = {}) {
  const icon = cls.includes('action-link') ? icons.mail : '';
  const gmail = site.email.provider === 'gmail';
  const suffix = gmail ? '<span class="visually-hidden"> (opens Gmail in a new tab)</span>' : '';
  const attrs = gmail ? ' target="_blank" rel="noopener"' : '';
  return `<a class="${cls}" href="${emailUrl(address)}"${attrs}>${icon}<span>${esc(
    label || address
  )}</span>${suffix}</a>`;
}

/* ---------------------------------------------------------------------------
   Shared blocks
   --------------------------------------------------------------------------- */

function link(base, slug) {
  return slug === '' ? base || './' : `${base}${slug}/`;
}

/**
 * How far a page sits below the site root, as a relative prefix. Detail pages
 * live two levels down (upcomingevents/<slug>/), so a flat '../' is not enough
 * — every asset and link on them would resolve one directory too high.
 */
function baseFor(slug) {
  return slug === '' ? '' : '../'.repeat(slug.split('/').length);
}

/** Leaves absolute URLs alone; makes repo-relative ones base-aware. */
function resolveUrl(url) {
  return /^https?:\/\//.test(url) ? url : `{{base}}${url}`;
}

function buildNav(base, current) {
  const item = (entry) => {
    if (entry.children) {
      const id = `nav-${entry.label.toLowerCase().replace(/\s+/g, '-')}`;
      const containsCurrent = entry.children.some((child) => child.slug === current);
      const classes = [
        'nav__folder',
        entry.cta ? 'nav__cta' : '',
        containsCurrent ? 'nav__folder--current' : '',
      ]
        .filter(Boolean)
        .join(' ');
      return `
          <li class="${classes}">
            <button type="button" aria-expanded="false" aria-controls="${id}">
              ${esc(entry.label)}${
        // Said out loud as well as shown, because the underline that marks the
        // open section is no use to anyone who cannot see it, and the child's
        // aria-current is hidden inside a collapsed panel.
        containsCurrent ? '<span class="visually-hidden"> (current section)</span>' : ''
      }<span class="nav__chevron" aria-hidden="true"></span>
            </button>
            <ul class="nav__panel" id="${id}" hidden>
              ${entry.children
                .map(
                  (child) =>
                    `<li><a href="${link(base, child.slug)}"${
                      child.slug === current ? ' aria-current="page"' : ''
                    }>${esc(child.label)}</a></li>`
                )
                .join('\n              ')}
            </ul>
          </li>`;
    }
    return `
          <li${entry.cta ? ' class="nav__cta"' : ''}>
            <a href="${link(base, entry.slug)}"${entry.slug === current ? ' aria-current="page"' : ''}>${esc(
      entry.label
    )}</a>
          </li>`;
  };

  return `
  <header class="site-header">
    <div class="shell site-header__inner">
      <a class="brand" href="${link(base, '')}">
        <img src="${base}assets/img/logo-medici.png" alt="Medici Museum of Art — home" width="433" height="210">
      </a>

      <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="primary-nav">
        <span class="nav-toggle__bars" aria-hidden="true"></span>
        Menu
      </button>

      <nav class="nav" id="primary-nav" aria-label="Main">
        <ul>${nav.map(item).join('')}
        </ul>
        <ul class="nav__social">
          ${site.social
            .map(
              (s) =>
                `<li><a href="${s.href}" aria-label="${esc(site.name)} on ${esc(
                  s.name
                )} (opens in a new tab)" target="_blank" rel="noopener">${icons[s.name.toLowerCase()]}</a></li>`
            )
            .join('\n          ')}
          <!-- Search cannot work without JavaScript — there is no server to ask
               — so the button ships hidden and site.js reveals it. A control
               that cannot do anything should not be offered. -->
          <li class="nav__search" hidden data-search-item>
            <button type="button" data-search-toggle aria-expanded="false" aria-controls="site-search">
              ${icons.search}<span class="visually-hidden">Search this site</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>

    <div class="search-panel" id="site-search" hidden>
      <div class="shell">
        <form class="search-panel__form" role="search" data-search-form>
          <label for="site-search-input">Search the Medici Museum of Art</label>
          <div class="search-panel__row">
            <input id="site-search-input" type="search" name="q" autocomplete="off"
                   placeholder="Exhibitions, hours, tours&hellip;" data-search-input>
            <button type="button" class="btn btn--ghost" data-search-close>Close</button>
          </div>
        </form>
        <p class="search-panel__status" role="status" aria-live="polite" data-search-status></p>
        <div data-search-results></div>
      </div>
    </div>
  </header>`;
}

function hoursTable() {
  const rows = DAY_NAMES.map((name, index) => {
    const open = site.hours.days.includes(index);
    return `        <tr data-day="${index}">
          <th scope="row">${name}<span data-today-label></span></th>
          <td>${open ? esc(site.hours.time) : 'Closed'}</td>
        </tr>`;
  }).join('\n');

  return `<table class="hours-table">
      <caption class="visually-hidden">Opening hours by day of the week</caption>
      <tbody>
${rows}
      </tbody>
    </table>
    <p class="field"><small>${esc(site.hours.note)}. ${esc(site.hours.admission)}</small></p>`;
}

/**
 * The contact block. Every detail is an action: the phone number dials, the
 * email opens a message to the address actually shown, and the address opens
 * directions. On the old site all three were inert text.
 */
function contactBlock({ heading = true } = {}) {
  return `${heading ? '<h2>Visit &amp; contact</h2>' : ''}
    <dl class="contact-list">
      <div>
        <dt>Address</dt>
        <dd>
          <address>
            ${esc(site.address.street)}<br>
            ${esc(site.address.city)}, ${esc(site.address.state)} ${esc(site.address.zip)}
          </address>
          ${mapLink(site.address.mapQuery, { label: 'Get directions' })}
        </dd>
      </div>
      <div>
        <dt>Phone</dt>
        <dd>
          <a class="action-link" href="tel:${site.phone.href}">
            ${icons.phone}<span>${esc(site.phone.display)}</span>
          </a>
        </dd>
      </div>
      <div>
        <dt>Email</dt>
        <dd>
          ${emailLink(site.email.href, { label: site.email.display })}
        </dd>
      </div>
      <div>
        <dt>Hours</dt>
        <dd>
          <p class="status-pill" data-open-status hidden></p>
          ${hoursTable()}
        </dd>
      </div>
    </dl>`;
}

function buildFooter(base) {
  return `
  <footer class="site-footer">
    <div class="shell">
      <div class="site-footer__grid">
        <div class="site-footer__logo">
          <img src="${base}assets/img/logo-medici-white.png" alt="Medici Museum of Art" width="300" height="146">
          <p><small>${esc(site.tagline)}</small></p>
          <ul class="social-row footer-links" style="grid-auto-flow: column; justify-content: start;">
            ${site.social
              .map(
                (s) =>
                  `<li><a href="${s.href}" aria-label="${esc(site.name)} on ${esc(
                    s.name
                  )} (opens in a new tab)" target="_blank" rel="noopener">${icons[s.name.toLowerCase()]}</a></li>`
              )
              .join('\n            ')}
          </ul>
        </div>

        <div>
          ${contactBlock({ heading: false }).replace('<h2>Visit &amp; contact</h2>', '')}
        </div>

        <nav aria-label="Footer">
          <h2>Explore</h2>
          <ul class="footer-links">
            ${nav
              .flatMap((entry) => (entry.children ? entry.children : [entry]))
              .filter((entry) => entry.slug !== '')
              .map((entry) => `<li><a href="${link(base, entry.slug)}">${esc(entry.label)}</a></li>`)
              .join('\n            ')}${
    site.external.rightsAndReproductions
      ? `\n            <li><a href="${site.external.rightsAndReproductions}">Rights and Reproductions</a></li>`
      : ''
  }
          </ul>
        </nav>
      </div>

      <div class="partners">
        <h2 class="visually-hidden">Accreditation and support</h2>
        ${site.partners
          .map((p) => {
            // When the logo is wrapped in a link, the link's text carries the
            // name and the image goes alt="" — otherwise the accessible name
            // is the organisation announced twice, once from the span and
            // again from the alt.
            return p.href
              ? `<a href="${p.href}" target="_blank" rel="noopener"><span class="visually-hidden">${esc(
                  p.name
                )} (opens in a new tab)</span><img src="${base}${p.logo}" alt="" height="54"></a>`
              : `<img src="${base}${p.logo}" alt="${esc(p.alt)}" height="54">`;
          })
          .join('\n        ')}
      </div>

      <div class="colophon">
        <p>&copy; ${new Date().getFullYear()} ${esc(site.name)}. A nonprofit museum. Admission is free.</p>
        <p><a href="${link(base, 'contact-us')}">Accessibility &amp; feedback</a></p>
      </div>
    </div>
  </footer>`;
}

/* ---------------------------------------------------------------------------
   Events — rendered into the HTML at build time so the listing exists with or
   without JavaScript. The calendar grid is layered on top of the same data.
   --------------------------------------------------------------------------- */

const eventData = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'events.json'), 'utf8'));

/**
 * Events split by whether they have finished, against the clock at build time.
 *
 * Upcoming runs soonest-first, which is the order someone deciding what to
 * attend actually wants. Past runs most-recent-first, which is the order
 * someone looking back wants. They are different questions, so they get
 * different orders.
 *
 * An event counts as upcoming until it has *ended*, so something running today
 * is not filed under history halfway through the afternoon.
 *
 * This is a build-time split, and a site that is not rebuilt would let it
 * drift. site.js re-checks the same dates in the browser and moves anything
 * that has since finished, so the page stays truthful between deploys.
 */
const BUILD_NOW = new Date();
const eventHasPassed = (ev) => new Date(ev.end || ev.start) < BUILD_NOW;

const upcomingEvents = eventData.events
  .filter((ev) => !eventHasPassed(ev))
  .sort((a, b) => new Date(a.start) - new Date(b.start));

const pastEvents = eventData.events
  .filter(eventHasPassed)
  .sort((a, b) => new Date(b.start) - new Date(a.start));

function fmtDate(iso) {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).formatToParts(d);
  const bag = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return bag;
}

function fmtTime(iso) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
  })
    .format(new Date(iso))
    .replace(':00', '')
    .toLowerCase()
    .replace(' ', '');
}

/**
 * Where an event's own page lives. Derived from the slug rather than stored,
 * so the link can never point at a host we no longer control — the previous
 * version linked every event to its Squarespace page, all of which would have
 * 404'd the moment the domain moved.
 */
function eventPath(base, ev) {
  return `${base}upcomingevents/${ev.slug}/`;
}

/** "Add to Google Calendar" needs UTC stamps in this exact compact form. */
function calendarStamp(iso) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function googleCalendarUrl(ev) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${calendarStamp(ev.start)}/${calendarStamp(ev.end || ev.start)}`,
    location: `${site.address.street}, ${site.address.city}, ${site.address.state} ${site.address.zip}`,
    details: `${ev.title} at ${site.name}.`,
  });
  return `https://www.google.com/calendar/render?${params.toString()}`;
}

/**
 * @param kind      "upcoming" or "past" — used by site.js to find the two
 *                  lists and move anything that has finished since the build.
 * @param emptyHtml what to show when there is nothing in this list at all.
 */
function eventList(events, { limit, kind = 'upcoming', emptyHtml = '' } = {}) {
  const list = limit ? events.slice(0, limit) : events;

  return `<div data-event-list="${kind}">
    <ul class="event-list"${list.length ? '' : ' hidden'}>
      ${list
        .map((ev) => {
          const d = fmtDate(ev.start);
          const monthIndex = MONTHS_LONG.indexOf(d.month);
          const past = eventHasPassed(ev);
          const sameDay = !ev.end || fmtDate(ev.end).day === d.day;
          const when = sameDay
            ? `${d.weekday}, ${d.month} ${d.day}, ${d.year}, ${fmtTime(ev.start)}${
                ev.end ? `–${fmtTime(ev.end)}` : ''
              }`
            : `${d.month} ${d.day}–${fmtDate(ev.end).day}, ${d.year}`;

          return `<li data-event-end="${ev.end || ev.start}">
        <p class="event-list__date" aria-hidden="true">
          <span class="event-list__month">${MONTHS_SHORT[monthIndex]}</span>
          <span class="event-list__day">${d.day}</span>
          <span class="event-list__year">${d.year}</span>
        </p>
        <div>
          <h3>${esc(ev.title)}</h3>
          <time datetime="${ev.start}">${esc(when)}</time>
          <p class="event-list__past"${past ? '' : ' hidden'}>This event has passed</p>
          <p class="event-list__links">
            <a href="{{base}}upcomingevents/${ev.slug}/">Event details<span class="visually-hidden"> for ${esc(
            ev.title
          )}</span></a>
            ${
              ev.tickets
                ? `<a href="${ev.tickets}" target="_blank" rel="noopener">Tickets on Eventbrite<span class="visually-hidden"> for ${esc(
                    ev.title
                  )} (opens in a new tab)</span></a>`
                : ''
            }
          </p>
        </div>
      </li>`;
        })
        .join('\n      ')}
    </ul>
    <div data-event-empty${list.length ? ' hidden' : ''}>${emptyHtml}</div>
  </div>`;
}

const NOTHING_UPCOMING = `<p>No events are scheduled at the moment. New workshops and classes are
      announced by email first &mdash; <a href="{{base}}subscribe/">join the mailing list</a> &mdash; and
      tickets go on sale on <a href="${site.external.eventbrite}" target="_blank" rel="noopener">Eventbrite<span class="visually-hidden"> (opens in a new tab)</span></a>.</p>`;

const NOTHING_PAST = `<p>Past events will be listed here.</p>`;

/**
 * The calendar shell. JavaScript fills the tbody; the month heading, the two
 * navigation buttons and the live region are real markup from the start.
 */
function calendarBlock() {
  return `<div class="calendar" data-calendar hidden>
      <div class="calendar__bar">
        <h3 class="calendar__month" data-calendar-month>Loading calendar</h3>
        <div class="calendar__nav">
          <button type="button" data-calendar-prev aria-label="Previous month">${icons.chevronLeft}</button>
          <button type="button" data-calendar-next aria-label="Next month">${icons.chevronRight}</button>
        </div>
      </div>
      <p class="visually-hidden" role="status" aria-live="polite" data-calendar-status></p>
      <p class="notice" data-calendar-note hidden></p>
      <div class="calendar__scroll">
        <table>
          <caption class="visually-hidden">
            Events by date. Use the arrow keys to move between days, Page Up and Page Down to change month, and Enter to open an event.
          </caption>
          <thead>
            <tr>
              ${DAY_NAMES.map(
                (d) =>
                  `<th scope="col"><abbr title="${d}"><span class="calendar__dayname-long">${d.slice(
                    0,
                    3
                  )}</span><span class="calendar__dayname-short" aria-hidden="true">${d.slice(
                    0,
                    1
                  )}</span></abbr></th>`
              ).join('\n              ')}
            </tr>
          </thead>
          <tbody data-calendar-grid></tbody>
        </table>
      </div>

      <!-- Tapping or focusing a day fills this in. On a narrow screen the cells
           are too small to hold event titles, so the detail lands here instead
           of being truncated or pushed off-screen behind a horizontal scroll. -->
      <div class="calendar__detail" data-calendar-detail hidden>
        <h4 data-calendar-detail-date></h4>
        <div data-calendar-detail-body></div>
      </div>

      <p class="calendar__hint">Days marked <strong>Open</strong> are regular opening days (${esc(
        site.hours.label
      )}, ${esc(site.hours.time)}). Select a day for its details. Every event is also listed as text.</p>
    </div>`;
}

/* ---------------------------------------------------------------------------
   Exhibitions
   Sorted into On View / Upcoming / Past from their own dates at build time, so
   an exhibition that has opened or closed cannot sit under the wrong heading —
   which is how the old site ended up showing a permanent collection under a
   heading that said nothing about what was actually on.
   --------------------------------------------------------------------------- */

const exhibitionData = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src', 'exhibitions.json'), 'utf8')
);

const TODAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());

function fmtDayMonth(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${d}`;
}

function fmtFullDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${d}, ${y}`;
}

/** "September 10, 2026 – January 4, 2027", collapsing the year when shared. */
function exhibitionDates(ex) {
  if (!ex.start || !ex.end) return null;
  const sameYear = ex.start.slice(0, 4) === ex.end.slice(0, 4);
  return sameYear
    ? `${fmtDayMonth(ex.start)} – ${fmtFullDate(ex.end)}`
    : `${fmtFullDate(ex.start)} – ${fmtFullDate(ex.end)}`;
}

function classify(ex) {
  if (ex.datesUnconfirmed || !ex.start || !ex.end) return 'current';
  if (TODAY < ex.start) return 'upcoming';
  if (TODAY > ex.end) return 'past';
  return 'current';
}

const exhibitions = {
  current: exhibitionData.temporary.filter((e) => classify(e) === 'current'),
  upcoming: exhibitionData.temporary.filter((e) => classify(e) === 'upcoming'),
  past: exhibitionData.temporary.filter((e) => classify(e) === 'past'),
  permanent: exhibitionData.permanent,
};

/** Days until an exhibition opens — used for the "opens in N days" line. */
function daysUntil(iso) {
  const ms = Date.parse(iso + 'T00:00:00-05:00') - Date.parse(TODAY + 'T00:00:00-05:00');
  return Math.round(ms / 86400000);
}

/** Where an exhibition's own page lives. Derived, never stored. */
function exhibitionPath(ex) {
  return `exhibits/${ex.slug}/`;
}

/**
 * A picture tile, in the manner of a museum's "On View" index: the whole card
 * is one link, so the image, the title and the dates are a single target
 * rather than three competing ones.
 *
 * The image is alt="" on purpose. The link's text already names the
 * exhibition, and a descriptive alt here would be read out as part of the
 * link, giving a 40-word link name. The full description lives on the
 * exhibition's own page, where the image is the content rather than a label.
 */
function exhibitionTile(ex, { status = '', dateLine = '' } = {}) {
  const fit = ex.imageFit === 'cover' ? 'tile__img--cover' : 'tile__img--contain';

  return `<li class="tile">
        <a href="{{base}}${exhibitionPath(ex)}">
          <span class="tile__frame">
            <img class="${fit}" src="{{base}}${ex.image}" alt="" loading="lazy">
          </span>
          <span class="tile__body">
            ${status ? `<span class="tile__status">${esc(status)}</span>` : ''}
            <span class="tile__title">${
              // The trailing space matters: without it the artist's name runs
              // into the title in the link's accessible name.
              ex.artist ? `<span class="tile__artist">${esc(ex.artist)}</span> ` : ''
            }<em>${esc(ex.title)}</em></span>
            ${dateLine ? `<span class="tile__dates">${esc(dateLine)}</span>` : ''}
          </span>
        </a>
      </li>`;
}

/**
 * The Exhibitions index: what is on and what is coming, then the permanent
 * collection. Two tiles above three, which is also the natural reading order.
 */
function exhibitionsGrid() {
  const featured = [...exhibitions.upcoming, ...exhibitions.current];

  const featuredTiles = featured
    .map((ex) => {
      const state = classify(ex);
      const dates = exhibitionDates(ex);
      return exhibitionTile(ex, {
        status: state === 'upcoming' ? 'Coming up' : 'On view now',
        dateLine: dates || (ex.datesUnconfirmed ? 'Currently on view' : ''),
      });
    })
    .join('\n      ');

  const permanentTiles = exhibitions.permanent
    .map((ex) => exhibitionTile(ex, { status: ex.kind || 'Permanent', dateLine: 'Ongoing' }))
    .join('\n      ');

  return `<h2 id="on-view-now">Exhibitions and galleries</h2>
    <ul class="tile-grid tile-grid--feature">
      ${featuredTiles}
    </ul>

    <h2 id="permanent" class="tile-heading">Permanent Collection</h2>
    <ul class="tile-grid tile-grid--three">
      ${permanentTiles}
    </ul>`;
}

/** The single exhibition worth leading the homepage with. */
function headlineExhibition() {
  const ex = exhibitions.upcoming[0] || exhibitions.current[0];
  if (!ex) return '';

  const state = classify(ex);
  const dates = exhibitionDates(ex);

  return `<section class="band band--tight" aria-labelledby="headline-exhibition">
  <div class="shell split">
    <img src="{{base}}${ex.image}" alt="${esc(ex.imageAlt || '')}">
    <div>
      <p class="eyebrow">${state === 'upcoming' ? 'Coming up' : 'On view now'}</p>
      <h2 id="headline-exhibition"><span class="exhibition__artist">${esc(ex.artist || '')}</span>
        <em>${esc(ex.title)}</em></h2>
      ${
        dates
          ? `<p class="exhibition__dates"><time datetime="${ex.start}">${fmtFullDate(
              ex.start
            )}</time> – <time datetime="${ex.end}">${fmtFullDate(ex.end)}</time></p>`
          : ''
      }
      ${
        state === 'upcoming' && ex.start
          ? `<p class="exhibition__countdown">Opens in ${daysUntil(ex.start)} day${
              daysUntil(ex.start) === 1 ? '' : 's'
            }</p>`
          : ''
      }
      <p class="lede">${esc(ex.blurb || '')}</p>
      <p>
        ${ex.url ? `<a class="btn" href="${resolveUrl(ex.url)}">About ${esc(ex.artist || ex.title)}</a>` : ''}
        <a class="btn btn--ghost" href="{{base}}exhibits/">All exhibitions</a>
      </p>
    </div>
  </div>
</section>`;
}

/**
 * Forms in this rebuild are not wired to a delivery service yet. A form that
 * looks like it sends but silently discards a message is worse than no form at
 * all, so every form says so and offers the phone and email that do work.
 * Delete this block (and the {{formNotice}} tokens) once an endpoint is set.
 */
function formNotice() {
  return `<div class="notice" role="note">
      <p><strong>This form is not connected yet.</strong> It is part of a site rebuild and does not send
        anywhere. To reach us today, call
        <a href="tel:${site.phone.href}">${esc(site.phone.display)}</a> or email
        ${emailLink(site.email.href, { cls: '', label: site.email.display })}.</p>
    </div>`;
}

/* ---------------------------------------------------------------------------
   Structured data — helps search engines and voice assistants answer
   "when is the Medici Museum open" and "what's the phone number" correctly.
   --------------------------------------------------------------------------- */

function jsonLd() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Museum',
    name: site.name,
    url: site.url,
    telephone: `+1-330-856-2120`,
    email: site.email.display,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      addressLocality: site.address.city,
      addressRegion: site.address.state,
      postalCode: site.address.zip,
      addressCountry: 'US',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: site.hours.days.map((d) => `https://schema.org/${DAY_NAMES[d]}`),
        opens: site.hours.opens,
        closes: site.hours.closes,
      },
    ],
    isAccessibleForFree: true,
    sameAs: site.social.map((s) => s.href),
  });
}

/* ---------------------------------------------------------------------------
   Layout
   --------------------------------------------------------------------------- */

function layout(page, content) {
  const base = baseFor(page.slug);
  const canonical = page.slug === '' ? `${site.url}/` : `${site.url}/${page.slug}`;
  const fullTitle = page.slug === '' ? site.name : `${page.title} — ${site.name}`;

  return `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(page.description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<link rel="icon" href="${base}assets/img/logo-medici.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600&display=swap">
<link rel="stylesheet" href="${base}assets/css/site.css?v=${assetVersion.css}">
<script type="application/ld+json">${jsonLd()}</script>
</head>
<body data-base="${base}">
<a class="skip-link" href="#main">Skip to main content</a>
${buildNav(base, page.slug)}

<main id="main" tabindex="-1">
${content}
</main>
${buildFooter(base)}

<script src="${base}assets/js/data.js?v=${assetVersion.data}"></script>
<script src="${base}assets/js/search-index.js?v=${assetVersion.search}"></script>
<script src="${base}assets/js/site.js?v=${assetVersion.js}"></script>
</body>
</html>
`;
}

/* ---------------------------------------------------------------------------
   Build
   --------------------------------------------------------------------------- */

function render(template, page) {
  const base = baseFor(page.slug);

  // {{base}} is substituted LAST, because several of the blocks injected below
  // (exhibition cards, the contact block) contain {{base}} of their own.
  return template
    .replace(/\{\{contact\}\}/g, () => contactBlock())
    .replace(/\{\{contactNoHeading\}\}/g, () => contactBlock({ heading: false }))
    .replace(/\{\{hoursTable\}\}/g, () => hoursTable())
    .replace(/\{\{calendar\}\}/g, () => calendarBlock())
    .replace(/\{\{formNotice\}\}/g, () => formNotice())
    .replace(/\{\{exhibitionsGrid\}\}/g, () => exhibitionsGrid())
    .replace(/\{\{headlineExhibition\}\}/g, () => headlineExhibition())
    .replace(/\{\{eventsUpcoming\}\}/g, () =>
      eventList(upcomingEvents, { kind: 'upcoming', emptyHtml: NOTHING_UPCOMING })
    )
    .replace(/\{\{eventsUpcomingShort\}\}/g, () =>
      eventList(upcomingEvents, { limit: 4, kind: 'upcoming', emptyHtml: NOTHING_UPCOMING })
    )
    .replace(/\{\{eventsPast\}\}/g, () =>
      eventList(pastEvents, { kind: 'past', emptyHtml: NOTHING_PAST })
    )
    .replace(/\{\{mapsUrl\}\}/g, mapsUrl)
    .replace(/\{\{phoneHref\}\}/g, `tel:${site.phone.href}`)
    .replace(/\{\{phone\}\}/g, esc(site.phone.display))
    .replace(/\{\{emailHref\}\}/g, `mailto:${site.email.href}`)
    .replace(/\{\{email\}\}/g, esc(site.email.display))
    .replace(/\{\{hoursLabel\}\}/g, esc(site.hours.label))
    .replace(/\{\{hoursTime\}\}/g, esc(site.hours.time))
    .replace(/\{\{eventbrite\}\}/g, site.external.eventbrite)
    .replace(/\{\{volunteerApplication\}\}/g, site.external.volunteerApplication)
    // {{map:<query>|<label>|<class>|<context>}} — query "SELF" means the museum.
    .replace(/\{\{map:([^}]*)\}\}/g, (_, args) => {
      const [rawQuery, label, cls, context] = args.split('|').map((s) => (s || '').trim());
      const query = rawQuery === 'SELF' ? site.address.mapQuery : rawQuery;
      return mapLink(query, {
        label: label || 'Get directions',
        cls: cls || 'action-link',
        context: context || '',
      });
    })
    // {{email:<address>|<label>|<class>}} — address "SELF" means the museum.
    .replace(/\{\{email:([^}]*)\}\}/g, (_, args) => {
      const [rawAddress, label, cls] = args.split('|').map((s) => (s || '').trim());
      const address = rawAddress === 'SELF' ? site.email.href : rawAddress;
      return emailLink(address, { cls: cls || 'action-link', label: label || undefined });
    })
    .replace(/\{\{base\}\}/g, base);
}

/* ---------------------------------------------------------------------------
   Detail pages

   These exist because the rebuild previously linked out to Squarespace for
   them — 14 event pages, the Dragana Crnjak page, and a Rights and
   Reproductions page that was already a 404. Every one of those links would
   have broken the moment the domain was repointed, because they resolve to the
   same domain. They are now pages in this repository.
   --------------------------------------------------------------------------- */

function eventDetailBody(ev) {
  const d = fmtDate(ev.start);
  const endDay = ev.end ? fmtDate(ev.end) : d;
  const sameDay = endDay.day === d.day && endDay.month === d.month;
  const past = new Date(ev.end || ev.start) < new Date();

  // The whitespace around <br> is load-bearing: without it textContent runs the
  // year into the time and a screen reader says "twenty thousand two hundred
  // and sixty-two pm" instead of "2026, 2pm".
  const when = sameDay
    ? `${d.weekday}, ${d.month} ${d.day}, ${d.year} <br> ${fmtTime(ev.start)}${
        ev.end ? `&ndash;${fmtTime(ev.end)}` : ''
      } Eastern Time`
    : `${d.month} ${d.day} &ndash; ${endDay.month} ${endDay.day}, ${d.year}`;

  return `<section class="band band--tight">
  <div class="shell">
    <p class="eyebrow"><a href="{{base}}upcomingevents/">Events and classes</a></p>
    <h1>${esc(ev.title)}</h1>
    ${past ? '<p class="notice" role="note">This event has already taken place.</p>' : ''}
  </div>
</section>

<section class="band band--tight">
  <div class="shell split">
    <div>
      <h2>Details</h2>
      <dl class="contact-list">
        <div>
          <dt>When</dt>
          <dd><time datetime="${ev.start}">${when}</time></dd>
        </div>
        <div>
          <dt>Where</dt>
          <dd>
            <address>${esc(site.address.street)}<br>${esc(site.address.city)}, ${esc(
    site.address.state
  )} ${esc(site.address.zip)}</address>
            {{map:SELF|Get directions}}
          </dd>
        </div>
        <div>
          <dt>Admission</dt>
          <dd>${esc(site.hours.admission)}</dd>
        </div>
      </dl>

      <!-- TO BE COMPLETED BY MUSEUM STAFF: add a "description" to this event in
           src/events.json and it will appear here. Left out rather than
           invented, because no description was ever published for these. -->
      ${ev.description ? `<p>${esc(ev.description)}</p>` : ''}

      <p style="margin-top:2rem">
        ${
          ev.tickets
            ? `<a class="btn" href="${ev.tickets}" target="_blank" rel="noopener">Tickets on Eventbrite<span class="visually-hidden"> for ${esc(
                ev.title
              )} (opens in a new tab)</span></a>`
            : ''
        }
        ${
          past
            ? ''
            : `<a class="btn btn--ghost" href="${googleCalendarUrl(
                ev
              )}" target="_blank" rel="noopener">Add to calendar<span class="visually-hidden"> &mdash; ${esc(
                ev.title
              )} (opens Google Calendar in a new tab)</span></a>`
        }
      </p>
    </div>

    <div>
      <h2>Questions?</h2>
      <p><a class="action-link" href="tel:${site.phone.href}"><span>${esc(
    site.phone.display
  )}</span></a></p>
      <p>{{email:SELF|${site.email.display}}}</p>
      <p style="margin-top:2rem"><a class="btn btn--ghost" href="{{base}}upcomingevents/">All events and classes</a></p>
    </div>
  </div>
</section>`;
}

function exhibitionDetailBody(ex, { permanent = false } = {}) {
  const dates = exhibitionDates(ex);
  const state = permanent ? 'permanent' : classify(ex);
  const status = permanent
    ? 'Ongoing'
    : state === 'upcoming'
    ? 'Coming up'
    : state === 'past'
    ? 'Past exhibition'
    : 'On view now';

  // Body copy varies by how much the museum has actually published. Rather
  // than pad a thin entry with invented text, a page with nothing but a blurb
  // simply says less and points at the people who can say more.
  const hasProse = Boolean(ex.statement || ex.bio);

  return `<section class="band band--tight">
  <div class="shell">
    <p class="eyebrow"><a href="{{base}}exhibits/">Exhibitions</a></p>
    <p class="exhibition__badge${state === 'current' || permanent ? ' exhibition__badge--now' : ''}">${esc(
    status
  )}</p>
    <h1>${ex.artist ? `<span class="exhibition__artist">${esc(ex.artist)}</span>\n      ` : ''}<em>${esc(
    ex.title
  )}</em></h1>
    ${dates ? `<p class="exhibition__dates">${esc(dates)}</p>` : ''}
    ${
      !dates && ex.datesUnconfirmed
        ? `<p class="exhibition__dates">Currently on view.
             <!-- TO BE COMPLETED BY MUSEUM STAFF: add "start" and "end" to this
                  entry in src/exhibitions.json. No dates for this exhibition are
                  published anywhere, so none were invented. --></p>`
        : ''
    }
    <p class="lede">${esc(ex.blurb || '')}</p>
  </div>
</section>

<section class="band band--tight">
  <div class="shell${hasProse ? ' split' : ''}">
    <img src="{{base}}${ex.secondaryImage || ex.image}" alt="${esc(
    ex.secondaryImageAlt || ex.imageAlt || ''
  )}"${hasProse ? '' : ' style="max-width:52rem"'}>
    ${
      hasProse
        ? `<div>
      ${ex.statement ? `<h2>Artist statement</h2><p>${esc(ex.statement)}</p>` : ''}
      ${ex.bio ? `<h2>About ${esc(ex.artist || ex.title)}</h2><p>${esc(ex.bio)}</p>` : ''}
      ${
        ex.artistUrl
          ? `<p><a class="btn btn--ghost" href="${ex.artistUrl}" target="_blank" rel="noopener">${esc(
              ex.artist || ex.title
            )}'s website<span class="visually-hidden"> (opens in a new tab)</span></a></p>`
          : ''
      }
    </div>`
        : ''
    }
  </div>
</section>

<section class="band band--warm band--tight">
  <div class="shell split">
    <div>
      <h2>Plan your visit</h2>
      <p>Admission is free, ${esc(site.hours.label)}, ${esc(site.hours.time)}.</p>
      <p><a class="btn" href="{{base}}visit/">Visitor information</a></p>
    </div>
    <div>{{contactNoHeading}}</div>
  </div>
</section>`;
}

/**
 * A standing redirect for a URL the old site published. /new-page is where the
 * Dragana Crnjak page lived on Squarespace — an unhelpful slug, but one that
 * may sit in printed material and inbound links, so it keeps working.
 */
function redirectPage(target, title) {
  return `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — ${esc(site.name)}</title>
<link rel="canonical" href="${site.url}/${target}">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=../${target}">
<link rel="stylesheet" href="../assets/css/site.css?v=${assetVersion.css}">
</head>
<body>
<main id="main" class="band">
  <div class="shell">
    <h1>This page has moved</h1>
    <p class="lede">${esc(title)} is now at a new address.</p>
    <p><a class="btn" href="../${target}">Continue to ${esc(title)}</a></p>
  </div>
</main>
</body>
</html>
`;
}

/* ---------------------------------------------------------------------------
   Search index

   There is no server, so search has to be a small index shipped with the site.
   It is built from each page's own rendered body, which means it can never
   describe a page that does not exist or miss one that does.
   --------------------------------------------------------------------------- */

function indexableText(bodyHtml) {
  return bodyHtml
    .replace(/<!--[\s\S]*?-->/g, ' ') // build notes are not content
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\{\{[^}]*\}\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1400);
}

function build() {
  // Client-side data mirrors the build-time data — one source, two consumers.
  // The calendar links each event to its own page. Only the slug is stored —
  // site.js joins it to the page's own base path, because the calendar appears
  // at more than one depth and a single hard-coded path would be wrong on one
  // of them.
  const dataFile = `/* Generated by build.js — edit src/events.json or src/site.config.js instead. */
window.MEDICI = ${JSON.stringify({ events: eventData.events, hours: site.hours }, null, 2)};
`;
  fs.mkdirSync(path.join(ROOT, 'assets', 'js'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'assets', 'js', 'data.js'), dataFile);

  /* Pass one: render every page body and collect it. Bodies are rendered
     before anything is written because the search index is built from them,
     and the index has to exist — and be hashed — before layout() can stamp it
     into the pages that load it. */
  const rendered = [];

  for (const page of pages) {
    const template = fs.readFileSync(path.join(PAGES_DIR, page.file), 'utf8');
    rendered.push({ page, body: render(template, page), dir: page.slug === '' ? ROOT : path.join(ROOT, page.slug) });
  }

  // One page per event, at the same /upcomingevents/<slug>/ path the old site
  // used, so those URLs keep resolving after the move off Squarespace.
  for (const ev of eventData.events) {
    const page = {
      file: null,
      slug: `upcomingevents/${ev.slug}`,
      title: ev.title,
      description: `${ev.title} at ${site.name} — date, time, location and booking.`,
    };
    rendered.push({ page, body: render(eventDetailBody(ev), page), dir: path.join(ROOT, 'upcomingevents', ev.slug) });
  }

  // A page for every exhibition and gallery, temporary and permanent, because
  // each is a tile on /exhibits and a tile that leads nowhere is not a tile.
  const allExhibitions = [
    ...exhibitionData.temporary.map((ex) => ({ ex, permanent: false })),
    ...exhibitionData.permanent.map((ex) => ({ ex, permanent: true })),
  ];

  for (const { ex, permanent } of allExhibitions) {
    const page = {
      file: null,
      slug: `exhibits/${ex.slug}`,
      title: ex.artist ? `${ex.artist}: ${ex.title}` : ex.title,
      description: ex.blurb ? ex.blurb.slice(0, 155) : `${ex.title} at ${site.name}.`,
    };
    rendered.push({
      page,
      body: render(exhibitionDetailBody(ex, { permanent }), page),
      dir: path.join(ROOT, 'exhibits', ex.slug),
    });
  }

  // The index: every page that was actually generated, nothing else.
  const searchIndex = rendered.map(({ page, body }) => ({
    u: page.slug === '' ? '' : page.slug + '/',
    t: page.title,
    d: page.description,
    x: indexableText(body),
  }));

  fs.writeFileSync(
    path.join(ROOT, 'assets', 'js', 'search-index.js'),
    `/* Generated by build.js from the rendered pages. Do not edit. */\nwindow.MEDICI_SEARCH = ${JSON.stringify(
      searchIndex
    )};\n`
  );

  // Stamp the assets before wrapping anything, so every page references this
  // build's exact stylesheet and scripts rather than whatever the browser kept.
  assetVersion.css = hashOf('assets/css/site.css');
  assetVersion.js = hashOf('assets/js/site.js');
  assetVersion.data = hashOf('assets/js/data.js');
  assetVersion.search = hashOf('assets/js/search-index.js');
  console.log(
    `  assets stamped  css=${assetVersion.css} js=${assetVersion.js} data=${assetVersion.data} search=${assetVersion.search}`
  );
  console.log(`  search index    ${searchIndex.length} pages, ${Math.round(
    fs.statSync(path.join(ROOT, 'assets', 'js', 'search-index.js')).size / 1024
  )} KB\n`);

  // Pass two: wrap each body in the shell and write it out.
  let count = 0;
  for (const { page, body, dir } of rendered) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), layout(page, body));
    count += 1;
  }
  console.log(`  ${pages.length} main pages, ${eventData.events.length} events, ${allExhibitions.length} exhibitions`);

  // Keep the old Squarespace URL working.
  fs.mkdirSync(path.join(ROOT, 'new-page'), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, 'new-page', 'index.html'),
    redirectPage('exhibits/dragana-crnjak-forest/', 'Dragana Crnjak: Forest')
  );
  count += 1;
  console.log('  new-page/index.html  (redirect)');

  // GitHub Pages: skip Jekyll so directories starting with _ are served as-is.
  fs.writeFileSync(path.join(ROOT, '.nojekyll'), '');

  console.log(`\nBuilt ${count} pages.`);
}

build();
