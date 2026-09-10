/* ==========================================================================
   Berkeley AI Risk — static site generator

   Reads data/*.json and writes the committed HTML, the ICS feed and the
   sitemap. Run it after editing any data file:

       node tools/build.mjs

   Pre-rendering (rather than the client-side rendering the old site used)
   is what makes the talks visible to search engines and link previews.
   Zero dependencies; nothing is installed to build or to serve.
   ========================================================================== */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const write = (p, s) => {
  fs.writeFileSync(path.join(ROOT, p), s);
  console.log(`  ${p.padEnd(24)} ${String(Buffer.byteLength(s)).padStart(7)} bytes`);
};

const site = read("data/site.json");
const talks = read("data/talks.json");
const reading = read("data/reading-group.json");

// "Today" has to mean today in Berkeley. Using the UTC date would flip a talk
// from upcoming to past eight hours early, every evening.
const TODAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

/* --- Time ---------------------------------------------------------------- */

const LA = "America/Los_Angeles";
const laParts = new Intl.DateTimeFormat("en-US", {
  timeZone: LA, hour12: false,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
});

// Milliseconds that must be added to a UTC instant to read it as local LA time.
function tzOffsetMs(utcMs) {
  const p = {};
  for (const x of laParts.formatToParts(utcMs)) if (x.type !== "literal") p[x.type] = +x.value;
  // en-US with hour12:false renders midnight as "24"; normalise it.
  return Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second) - utcMs;
}

// Wall-clock time in Berkeley -> the UTC instant. Two passes so the answer is
// still right for a time that sits near a DST transition.
function laToUtc(y, mo, d, hh, mm) {
  const naive = Date.UTC(y, mo - 1, d, hh, mm);
  return naive - tzOffsetMs(naive - tzOffsetMs(naive));
}

function offsetLabel(utcMs) {
  const mins = tzOffsetMs(utcMs) / 60000;
  const sign = mins < 0 ? "-" : "+";
  const a = Math.abs(mins);
  return `${sign}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
}

// Format from Y/M/D as a UTC instant so nothing shifts by a day. This is the
// bug the old reading-group page had: new Date("2025-06-03") is UTC midnight,
// which renders as June 2 anywhere west of Greenwich.
const asUTC = (y, mo, d) => new Date(Date.UTC(y, mo - 1, d));
const fmt = (o) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...o });
const F = {
  dow: fmt({ weekday: "short" }), dowLong: fmt({ weekday: "long" }),
  mon: fmt({ month: "short" }), monLong: fmt({ month: "long" }),
};

function timeLabel(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const TBA = "Title to be announced";

function decorate(t) {
  const [y, mo, d] = t.date.split("-").map(Number);
  const [hh, mm] = t.time.split(":").map(Number);
  const dt = asUTC(y, mo, d);
  const startMs = laToUtc(y, mo, d, hh, mm);
  const endMs = startMs + (t.durationMinutes || 90) * 60000;
  return {
    ...t,
    title: t.title === "TBA" ? TBA : t.title,
    y, mo, d,
    dow: F.dow.format(dt), dowLong: F.dowLong.format(dt),
    mon: F.mon.format(dt), monLong: F.monLong.format(dt),
    day: d,
    longDate: `${F.dowLong.format(dt)}, ${F.monLong.format(dt)} ${d}, ${y}`,
    shortDate: `${F.mon.format(dt)} ${d}, ${y}`,
    timeLabel: timeLabel(t.time),
    startUtc: new Date(startMs).toISOString().replace(/\.\d{3}Z$/, "Z"),
    endUtc: new Date(endMs).toISOString().replace(/\.\d{3}Z$/, "Z"),
    startLocal: `${t.date}T${t.time}:00${offsetLabel(startMs)}`,
    endLocal: new Date(endMs).toISOString(),
    // Berkeley's academic calendar splits at the summer, so month >= 8 is Fall.
    season: `${mo >= 8 ? "Fall" : "Spring"} ${y}`,
    isPast: t.date < TODAY,
  };
}

const all = talks.map(decorate);
const upcoming = all.filter((t) => !t.isPast);
const past = all.filter((t) => t.isPast).reverse();

/* --- Helpers -------------------------------------------------------------- */

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const attr = (s) => esc(s);
const initials = (name) => name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const hasPhoto = (t) => t.headshot && fs.existsSync(path.join(ROOT, t.headshot));

function face(t, cls) {
  return hasPhoto(t)
    ? `<img class="${cls}" src="${attr(t.headshot)}" alt="${attr(t.speaker)}" width="400" height="400" loading="lazy" decoding="async">`
    : `<span class="${cls} initials" role="img" aria-label="${attr(t.speaker)}">${esc(initials(t.speaker))}</span>`;
}

const ICON = {
  linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5A2.5 2.5 0 1 1 0 3.5a2.5 2.5 0 0 1 4.98 0zM.4 8.4h4.2V24H.4zM8.5 8.4h4v2.1h.06c.56-1.06 1.93-2.18 3.97-2.18 4.25 0 5.03 2.8 5.03 6.43V24h-4.2v-7.4c0-1.77-.03-4.04-2.46-4.04-2.47 0-2.85 1.93-2.85 3.92V24H8.5z"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.24 2.25h3.31l-7.23 8.26L22.5 21.75h-6.66l-5.22-6.82-5.97 6.82H1.34l7.73-8.84L1.5 2.25h6.83l4.72 6.23zm-1.16 17.52h1.83L7.01 4.13H5.05z"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.95a15.7 15.7 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.9 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14a7.96 7.96 0 0 1 0-4h3.38a16.5 16.5 0 0 0 0 4zm.84 2h2.95c.3 1.26.76 2.46 1.38 3.56A8 8 0 0 1 5.1 16zm2.95-8H5.1a8 8 0 0 1 4.33-3.56A15.7 15.7 0 0 0 8.05 8zM12 19.96A13.9 13.9 0 0 1 10.09 16h3.82A13.9 13.9 0 0 1 12 19.96zM14.34 14H9.66a14.9 14.9 0 0 1 0-4h4.68a14.9 14.9 0 0 1 0 4zm.23 5.56c.62-1.1 1.08-2.3 1.38-3.56h2.95a8 8 0 0 1-4.33 3.56zM16.36 14a16.5 16.5 0 0 0 0-4h3.38a7.96 7.96 0 0 1 0 4z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h17A1.5 1.5 0 0 1 22 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18.5zm2.4.5L12 12.2 19.6 6zM20 7.9l-7.4 6a1 1 0 0 1-1.2 0L4 7.9V18h16z"/></svg>',
  chev: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
};

function iconLink(href, label, icon, extra = "") {
  return `<a class="iconbtn ${extra}" href="${attr(href)}" target="_blank" rel="noopener" title="${attr(label)}" aria-label="${attr(label)}">${icon}</a>`;
}

/* --- Shared chrome -------------------------------------------------------- */

const NAV = [
  ["index.html#upcoming", "Upcoming"],
  ["index.html#archive", "Past talks"],
  ["reading-group.html", "Reading group"],
  ["index.html#about", "About"],
  ["index.html#organizers", "Organizers"],
];

function head({ title, description, page }) {
  const url = site.canonical + (page === "index" ? "" : `${page}.html`);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${attr(description)}">
${site.noindex ? '<meta name="robots" content="noindex,nofollow">\n' : ""}<link rel="canonical" href="${attr(url)}">
<meta name="theme-color" content="#fdfdfb">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${attr(site.name)}">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(description)}">
<meta property="og:url" content="${attr(url)}">
<meta property="og:image" content="${attr(site.canonical)}assets/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/inter-var-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/newsreader-var-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="alternate" type="text/calendar" href="series.ics" title="${attr(site.name)} — talks">
<link rel="stylesheet" href="styles.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${site.proposalNotice ? notice() : ""}
${header()}
<main id="main">`;
}

function notice() {
  return `<div class="notice" id="notice">
  <div class="notice__in">
    <span><strong>Proposed redesign.</strong> Not the official site — the live one is <a href="${attr(site.officialSite)}">ai-risk.berkeley.edu</a>.</span>
    <button class="notice__x" type="button" aria-label="Dismiss">&times;</button>
  </div>
</div>`;
}

function header() {
  return `<header class="hdr">
  <div class="hdr__in">
    <a class="brand" href="index.html"><span class="brand__dot"></span>Berkeley AI Risk</a>
    <button class="burger" id="burger" type="button" aria-expanded="false" aria-controls="nav" aria-label="Menu"><span></span></button>
    <nav class="nav" id="nav" hidden>
      ${NAV.map(([h, l]) => `<a href="${attr(h)}">${esc(l)}</a>`).join("\n      ")}
      <a href="#" data-subscribe>Join mailing list</a>
    </nav>
    <a class="btn btn--sm hdr__cta" href="${attr(site.mailingListForm)}" data-subscribe>Join mailing list</a>
  </div>
</header>`;
}

function footer() {
  return `</main>
<footer class="ftr">
  <div class="wrap">
    <div class="ftr__grid">
      <div>
        <div class="ftr__brand">Berkeley AI Risk</div>
        <p style="max-width:38ch">${esc(site.tagline)}.</p>
        <p class="ftr__a11y"><strong style="color:#efece3">Accessibility.</strong> ${esc(site.accessibility)} <a href="${attr(site.accessibilityLink)}">Accessibility information for Sutardja Dai Hall</a>.</p>
      </div>
      <div>
        <h4>The series</h4>
        <ul>
          <li><a href="index.html#upcoming">Upcoming talks</a></li>
          <li><a href="index.html#archive">Past talks</a></li>
          <li><a href="reading-group.html">Reading group</a></li>
          <li><a href="${attr(site.youtubePlaylist)}">Video archive</a></li>
          <li><a href="series.ics" data-webcal-link>Subscribe to the calendar</a></li>
        </ul>
      </div>
      <div>
        <h4>Get in touch</h4>
        <ul>
          <li><a href="#" data-subscribe>Join the mailing list</a></li>
          ${site.organizers.map((o) => `<li><a href="mailto:${attr(o.email)}">${esc(o.name)}</a></li>`).join("\n          ")}
        </ul>
      </div>
    </div>
    <div class="ftr__base">
      <span>&copy; ${new Date().getFullYear()} Berkeley AI Risk. Talks are recorded and published by the <a href="https://kavlicenter.berkeley.edu">Kavli Center for Ethics, Science, and the Public</a>.</span>
      <span>Redesign proposal &middot; <a href="${attr(site.officialSite)}">official site</a></span>
    </div>
  </div>
</footer>
${modal()}
<div class="hovercard" id="hovercard" data-show="0" aria-hidden="true"></div>
<script type="application/json" id="talk-data">${JSON.stringify(
    all.map((t) => ({
      slug: t.slug, speaker: t.speaker, title: t.title, summary: t.summary,
      location: t.location, longDate: t.longDate, timeLabel: t.timeLabel,
      startUtc: t.startUtc, endUtc: t.endUtc, rsvpUrl: t.rsvpUrl,
    }))
  ).replace(/</g, "\\u003c")}</script>
<script src="app.js" defer></script>
</body>
</html>
`;
}

function modal() {
  return `<div class="modal" id="subscribe" hidden role="dialog" aria-modal="true" aria-labelledby="sub-h">
  <div class="modal__box">
    <div class="modal__head">
      <button class="modal__x" type="button" data-close aria-label="Close">&times;</button>
      <h2 id="sub-h">Join the mailing list</h2>
      <p class="modal__sub">One email before each talk. Nothing else, and no forwarding of your address.</p>
    </div>
    <form id="sub-form" novalidate>
      <div class="field">
        <label for="sub-name">Name</label>
        <input id="sub-name" name="name" type="text" autocomplete="name" required aria-describedby="sub-name-err">
        <span class="err" id="sub-name-err" hidden></span>
      </div>
      <div class="field">
        <label for="sub-email">Email</label>
        <input id="sub-email" name="email" type="email" autocomplete="email" required aria-describedby="sub-email-err">
        <span class="err" id="sub-email-err" hidden></span>
      </div>
      <div class="field">
        <label for="sub-dept">Department <span class="opt">— optional, for Cal students and staff</span></label>
        <input id="sub-dept" name="dept" type="text" autocomplete="organization">
      </div>
      <div class="hp" aria-hidden="true"><label for="sub-company">Company website</label><input id="sub-company" name="company_website" type="text" tabindex="-1" autocomplete="off"></div>
      <button class="btn btn--lg" id="sub-submit" type="submit" style="width:100%">Sign me up</button>
      <p class="modal__fine">Prefer the plain form? <a href="${attr(site.mailingListForm)}" target="_blank" rel="noopener">Open it on Google Forms</a>.</p>
    </form>
    <div id="sub-ok" hidden>
      <div class="modal__ok">
        <div class="tick" aria-hidden="true">&#10003;</div>
        <h2 style="font-size:23px;margin-bottom:8px">You&rsquo;re on the list</h2>
        <p class="modal__sub" style="margin-bottom:20px">We&rsquo;ll write to <strong id="sub-ok-mail"></strong> before the next talk.</p>
        <button class="btn btn--ghost" type="button" data-close>Close</button>
      </div>
    </div>
  </div>
</div>`;
}

/* --- Sections ------------------------------------------------------------- */

function rsvpButton(t, size = "") {
  const cls = `btn btn--berkeley${size}`;
  if (t.rsvpUrl) return `<a class="${cls}" href="${attr(t.rsvpUrl)}" target="_blank" rel="noopener">RSVP</a>`;
  if (site.lumaCalendar) return `<a class="${cls}" href="${attr(site.lumaCalendar)}" target="_blank" rel="noopener">RSVP</a>`;
  // No RSVP target configured yet, so offer the next most useful thing rather
  // than a dead button. Replace by filling in rsvpUrl or site.lumaCalendar.
  return `<button class="${cls}" type="button" data-subscribe>Notify me</button>`;
}

function calMenu(t) {
  return `<div class="cal" data-slug="${attr(t.slug)}">
        <button class="cal__btn btn btn--ghost btn--sm" type="button" aria-expanded="false" aria-haspopup="true" hidden>Add to calendar</button>
        <div class="cal__menu" hidden></div>
      </div>`;
}

function upcomingRow(t) {
  const pid = `p-${t.slug}`;
  return `<li class="row" data-slug="${attr(t.slug)}">
    <div class="row__main">
      <time class="badge" datetime="${attr(t.date)}">
        <span class="dow">${esc(t.dow)}</span><span class="mon">${esc(t.mon)}</span><span class="day">${t.day}</span>
      </time>
      <button class="row__toggle" type="button" aria-expanded="false" aria-controls="${pid}">
        ${face(t, "row__face")}
        <span class="row__txt">
          <span class="row__speaker">${esc(t.speaker)} <span class="row__affil">(${esc(t.affiliation)})</span></span>
          <span class="row__title">${esc(t.title)}</span>
        </span>
        <span class="row__chev">${ICON.chev}</span>
      </button>
      <div class="row__cta">${rsvpButton(t)}</div>
    </div>
    <div class="row__panel" id="${pid}" hidden>
      <div class="row__meta">
        <span><strong>${esc(t.longDate)}</strong></span>
        <span>${esc(t.timeLabel)} PT</span>
        <span>${esc(t.location)}</span>
      </div>
      <p>${esc(t.summary)}</p>
      ${t.abstract ? `<div style="margin-top:16px"><div class="abstract-label">Abstract &mdash; in the speaker&rsquo;s words</div>${t.abstract}</div>` : ""}
      <div class="card__links">
        ${t.website ? `<a class="btn btn--ghost btn--sm" href="${attr(t.website)}" target="_blank" rel="noopener">Speaker&rsquo;s site</a>` : ""}
        ${calMenu(t)}
      </div>
    </div>
  </li>`;
}

function archiveCard(t) {
  const pid = `c-${t.slug}`;
  const media = t.videoId
    ? `<button class="card__media" type="button" aria-expanded="false" aria-controls="${pid}" aria-label="Play the recording of ${attr(t.speaker)}&rsquo;s talk">
        <img src="assets/thumbs/${attr(t.slug)}.jpg" alt="" width="640" height="360" loading="lazy" decoding="async">
        <span class="play" aria-hidden="true"><span></span></span>
      </button>`
    : `<button class="card__media card__media--none" type="button" aria-expanded="false" aria-controls="${pid}">
        <span class="m0">Berkeley AI Risk</span><span class="m2">Recording not available</span>
      </button>`;

  return `<article class="card"${t.videoId ? ` data-video="${attr(t.videoId)}"` : ""}>
    ${media}
    <div class="card__body">
      <div class="card__when">${esc(t.shortDate)}</div>
      <div class="card__who">
        ${face(t, "card__face")}
        <span><span class="card__name">${esc(t.speaker)}</span><br><span class="card__affil">${esc(t.affiliation)}</span></span>
      </div>
      <button class="card__toggle" type="button" aria-expanded="false" aria-controls="${pid}">
        <h3 class="card__title">${esc(t.title)}</h3>
        <p class="card__sum">${esc(t.summary)}</p>
      </button>
      <div class="card__panel" id="${pid}" hidden>
        ${t.abstract ? `<div class="abstract-label">Abstract &mdash; in the speaker&rsquo;s words</div>${t.abstract}` : "<p>No abstract was published for this talk.</p>"}
        <div class="card__links">
          ${t.videoId ? `<a class="btn btn--ghost btn--sm" href="https://www.youtube.com/watch?v=${attr(t.videoId)}" target="_blank" rel="noopener">Watch on YouTube</a>` : ""}
          ${t.slidesUrl ? `<a class="btn btn--ghost btn--sm" href="${attr(t.slidesUrl)}" target="_blank" rel="noopener">Slides (PDF)</a>` : ""}
          ${t.website ? `<a class="btn btn--ghost btn--sm" href="${attr(t.website)}" target="_blank" rel="noopener">Speaker&rsquo;s site</a>` : ""}
        </div>
      </div>
    </div>
  </article>`;
}

function personCard(o) {
  const links = [
    o.linkedin && iconLink(o.linkedin, `${o.name} on LinkedIn`, ICON.linkedin, "iconbtn--li"),
    o.x && iconLink(o.x, `${o.name} on X`, ICON.x),
  ].filter(Boolean).join("\n          ");

  return `<div class="person">
    <img class="person__photo" src="${attr(o.photo)}" alt="${attr(o.name)}" width="400" height="400" loading="lazy" decoding="async">
    <div>
      <div class="person__name">${esc(o.name)}${links ? `\n          ${links}` : ""}</div>
      <div class="person__role">${esc(o.role)}</div>
      <div class="person__links">
        <a class="btn btn--ghost btn--sm" href="mailto:${attr(o.email)}">${esc(o.email)}</a>
        ${o.website ? `<a class="btn btn--ghost btn--sm" href="${attr(o.website)}" target="_blank" rel="noopener">Faculty page</a>` : ""}
      </div>
    </div>
  </div>`;
}

function sponsorMark(s) {
  const inner = s.logo
    ? `<img src="${attr(s.logo)}" alt="${attr(s.name)}" data-l="${attr(s.key)}" loading="lazy">`
    : `<span class="wordmark"><b>${esc(s.wordmark.line1)}</b><span>${esc(s.wordmark.line2)}</span></span>`;
  return `<a href="${attr(s.url)}" target="_blank" rel="noopener" title="${attr(s.name)}">${inner}</a>`;
}

/* --- Structured data ------------------------------------------------------ */

function jsonLd() {
  const events = all.map((t) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${t.speaker} — ${t.title}`,
    startDate: t.startLocal,
    endDate: new Date(new Date(t.startUtc).getTime() + (t.durationMinutes || 90) * 60000).toISOString(),
    eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    description: t.summary,
    url: `${site.canonical}#${t.slug}`,
    ...(hasPhoto(t) ? { image: site.canonical + t.headshot } : {}),
    location: /zoom/i.test(t.location)
      ? { "@type": "VirtualLocation", url: site.zoom }
      : {
          "@type": "Place", name: t.location,
          address: { "@type": "PostalAddress", addressLocality: "Berkeley", addressRegion: "CA", addressCountry: "US" },
        },
    performer: { "@type": "Person", name: t.speaker, affiliation: { "@type": "Organization", name: t.affiliation }, ...(t.website ? { url: t.website } : {}) },
    organizer: { "@type": "Organization", name: site.name, url: site.officialSite },
    isAccessibleForFree: true,
  }));
  return `<script type="application/ld+json">${JSON.stringify(events).replace(/</g, "\\u003c")}</script>`;
}

/* --- index.html ----------------------------------------------------------- */

function indexPage() {
  const next = upcoming[0];
  const seasons = [];
  for (const t of past) {
    let s = seasons.find((x) => x.name === t.season);
    if (!s) seasons.push((s = { name: t.season, items: [] }));
    s.items.push(t);
  }

  return head({
    title: `${site.name} — speaker series on AI risk at UC Berkeley`,
    description: `${site.tagline}. Talks by researchers from academia, civil society and industry, with the full archive of past talks and recordings.`,
    page: "index",
  }) + `
<section class="hero">
  <div class="wrap hero__grid">
    <div>
      <p class="eyebrow">UC Berkeley &middot; Speaker series</p>
      <h1>Berkeley AI&nbsp;Risk</h1>
      <p class="lede">${esc(site.tagline)}.</p>
      <div class="btn-row">
        <a class="btn btn--lg" href="#" data-subscribe>Join the mailing list</a>
        <a class="btn btn--ghost btn--lg" href="series.ics" data-webcal-link>Subscribe to the calendar</a>
      </div>
    </div>
    ${next ? `<div class="next">
      <div class="next__label">Next talk</div>
      <div class="next__when">${esc(next.longDate)} &middot; ${esc(next.timeLabel)} PT &middot; ${esc(next.location)}</div>
      <div class="next__who">${esc(next.speaker)}</div>
      <div class="next__affil">${esc(next.affiliation)}</div>
      <div class="next__title">${esc(next.title)}</div>
      <div class="btn-row">${rsvpButton(next)}<a class="btn btn--ghost" href="#upcoming">Details</a></div>
    </div>` : `<div class="next"><div class="next__label">Next talk</div><p class="next__none">The next season is being scheduled. Join the mailing list and we&rsquo;ll write when dates are set.</p><div class="btn-row" style="margin-top:16px"><a class="btn" href="#" data-subscribe>Join the mailing list</a></div></div>`}
  </div>
</section>

<section id="upcoming">
  <div class="wrap">
    <div class="sec-head">
      <div>
        <p class="eyebrow">Click a name for details</p>
        <h2>Upcoming speakers</h2>
        <p>Hover or click any name to read what the talk is about. The RSVP button works from anywhere in the row.</p>
      </div>
      <a class="btn btn--ghost btn--sm" href="series.ics" data-webcal-link>Subscribe to the calendar</a>
    </div>
    ${upcoming.length ? `<ul class="rows">
    ${upcoming.map(upcomingRow).join("\n    ")}
    </ul>` : ""}
    ${upcoming.length < 3 ? `<div class="thin-note">
      <span>${upcoming.length ? "More talks for this season are still being scheduled." : "No talks are scheduled right now."} Mailing-list subscribers hear first.</span>
      <button class="btn btn--sm" type="button" data-subscribe>Join the mailing list</button>
    </div>` : ""}
  </div>
</section>

<section id="archive" class="band">
  <div class="wrap">
    <div class="sec-head">
      <div>
        <p class="eyebrow">${past.filter((t) => t.videoId).length} recordings &middot; ${past.length} talks</p>
        <h2>Past talks</h2>
        <p>Every talk in the series, with the recording where one exists. Click any talk to play it here and read the full abstract.</p>
      </div>
      <a class="btn btn--ghost btn--sm" href="${attr(site.youtubePlaylist)}" target="_blank" rel="noopener">Full playlist on YouTube</a>
    </div>
    ${seasons.map((s) => `<div class="season">
      <div class="season__h">${esc(s.name)}</div>
      <div class="cards">
        ${s.items.map(archiveCard).join("\n        ")}
      </div>
    </div>`).join("\n    ")}
  </div>
</section>

<section id="about">
  <div class="wrap">
    <div class="sec-head"><div><p class="eyebrow">About</p><h2>An interdisciplinary community</h2></div></div>
    <div style="display:grid;grid-template-columns:1.05fr 0.95fr;gap:clamp(28px,5vw,60px);align-items:start" class="about-grid">
      <div>
        ${site.about.map((p) => `<p class="lede" style="margin-bottom:18px">${esc(p)}</p>`).join("\n        ")}
        <details class="disclose">
          <summary>${site.departments.length} departments, schools and centers are represented</summary>
          <div class="depts">${site.departments.map((d) => `<span>${esc(d)}</span>`).join("")}</div>
        </details>
      </div>
      <div>
        <p class="eyebrow">Key questions</p>
        <ol class="qs">${site.questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ol>
      </div>
    </div>
  </div>
</section>

<section id="organizers" class="band">
  <div class="wrap">
    <div class="sec-head"><div><p class="eyebrow">Organizers</p><h2>Who runs the series</h2></div></div>
    <div class="people">${site.organizers.map(personCard).join("\n    ")}</div>
    <hr class="hr" style="margin:clamp(36px,5vw,56px) 0 30px">
    <p class="eyebrow">Co-sponsored by</p>
    <div class="sponsors">${site.sponsors.map(sponsorMark).join("\n      ")}</div>
  </div>
</section>

<section id="reading-group">
  <div class="wrap wrap--narrow" style="text-align:center">
    <p class="eyebrow">Also from Berkeley AI Risk</p>
    <h2>Reading group</h2>
    <p class="lede" style="color:var(--muted);margin:14px auto 24px;max-width:52ch">Discussions of papers and research on AI risk, safety, ethics and alignment, run alongside the speaker series.</p>
    <div class="btn-row" style="justify-content:center"><a class="btn btn--ghost" href="reading-group.html">See the sessions</a></div>
  </div>
</section>
${jsonLd()}
` + footer();
}

/* --- reading-group.html ---------------------------------------------------- */

function readingPage() {
  const items = reading.map((s) => {
    const [y, mo, d] = s.date.split("-").map(Number);
    const dt = asUTC(y, mo, d);
    return { ...s, label: `${F.dow.format(dt)}<br>${F.mon.format(dt)} ${d}, ${y}`, tl: timeLabel(s.time) };
  });

  return head({
    title: `Reading group — ${site.name}`,
    description: "Discussions of papers and research on AI risk, safety, ethics and alignment at UC Berkeley.",
    page: "reading-group",
  }) + `
<section class="hero" style="padding-bottom:clamp(28px,4vw,40px)">
  <div class="wrap wrap--narrow">
    <p class="eyebrow">Berkeley AI Risk</p>
    <h1>Reading group</h1>
    <p class="lede" style="color:var(--muted);max-width:46ch;margin-top:16px">Discussions of papers and research on AI risk, safety, ethics and alignment.</p>
    <div class="btn-row" style="margin-top:26px">
      <a class="btn" href="#" data-subscribe>Join the mailing list</a>
      <a class="btn btn--ghost" href="index.html#upcoming">Speaker series</a>
    </div>
  </div>
</section>

<section>
  <div class="wrap wrap--narrow">
    <div class="sec-head"><div><p class="eyebrow">Summer 2025 &middot; ${items.length} sessions</p><h2>Sessions</h2></div></div>
    <ul class="rg">
      ${items.map((s) => `<li>
        <div class="rg__date">${s.label}<br>${esc(s.tl)}</div>
        <div>
          <div class="rg__title">${esc(s.title)}</div>
          <div class="rg__meta">${esc(s.location)} &middot; led by ${esc(s.presenter)}</div>
          <div class="rg__read">${s.readings}</div>
        </div>
      </li>`).join("\n      ")}
    </ul>
    <p style="margin-top:26px;color:var(--muted);font-size:15px">The reading group is not currently meeting. Mailing-list subscribers will hear when it resumes.</p>
  </div>
</section>
` + footer();
}

/* --- 404 ------------------------------------------------------------------ */

function notFoundPage() {
  return head({ title: `Page not found — ${site.name}`, description: "Page not found.", page: "404" }) + `
<section class="hero">
  <div class="wrap wrap--narrow">
    <p class="eyebrow">404</p>
    <h1>Page not found</h1>
    <p class="lede" style="color:var(--muted);margin-top:16px">That page doesn&rsquo;t exist here.</p>
    <div class="btn-row" style="margin-top:26px">
      <a class="btn" href="index.html">Back to the series</a>
      <a class="btn btn--ghost" href="index.html#archive">Past talks</a>
    </div>
  </div>
</section>
` + footer();
}

/* --- series.ics ------------------------------------------------------------ */

function ics() {
  const esc5545 = (s) => String(s ?? "")
    .replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

  // RFC 5545 lines are capped at 75 octets, so long abstracts must be folded
  // or strict parsers reject the file.
  const fold = (line) => {
    const bytes = Buffer.from(line, "utf8");
    if (bytes.length <= 73) return line;
    const out = [];
    let cur = "", len = 0;
    for (const ch of line) {
      const n = Buffer.byteLength(ch, "utf8");
      if (len + n > (out.length ? 72 : 73)) { out.push(cur); cur = ""; len = 0; }
      cur += ch; len += n;
    }
    out.push(cur);
    return out.join("\r\n ");
  };

  const local = (t) => `${t.date.replace(/-/g, "")}T${t.time.replace(":", "")}00`;
  const endLocal = (t) => {
    const ms = laToUtc(t.y, t.mo, t.d, ...t.time.split(":").map(Number)) + (t.durationMinutes || 90) * 60000;
    const p = {};
    for (const x of laParts.formatToParts(ms)) if (x.type !== "literal") p[x.type] = x.value;
    return `${p.year}${p.month}${p.day}T${String(+p.hour % 24).padStart(2, "0")}${p.minute}00`;
  };
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0",
    "PRODID:-//Berkeley AI Risk//Speaker Series//EN",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${esc5545(site.name)}`),
    fold(`X-WR-CALDESC:${esc5545(site.tagline)}`),
    "X-WR-TIMEZONE:America/Los_Angeles",
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    "X-PUBLISHED-TTL:PT12H",
    // Emitting a VTIMEZONE means the wall-clock times are unambiguous and no
    // client has to guess an offset — the usual cause of an 8-hour drift.
    "BEGIN:VTIMEZONE", "TZID:America/Los_Angeles", "X-LIC-LOCATION:America/Los_Angeles",
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:-0800", "TZOFFSETTO:-0700", "TZNAME:PDT",
    "DTSTART:19700308T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:-0700", "TZOFFSETTO:-0800", "TZNAME:PST",
    "DTSTART:19701101T020000", "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU", "END:STANDARD",
    "END:VTIMEZONE",
  ];

  for (const t of all) {
    const desc = [
      t.summary,
      t.rsvpUrl ? `RSVP: ${t.rsvpUrl}` : "",
      /zoom/i.test(t.location) ? `Zoom: ${site.zoom}` : `Zoom: ${site.zoom}`,
      t.videoId ? `Recording: https://www.youtube.com/watch?v=${t.videoId}` : "",
      site.canonical,
    ].filter(Boolean).join("\n\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${t.slug}@ai-risk.berkeley.edu`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=America/Los_Angeles:${local(t)}`,
      `DTEND;TZID=America/Los_Angeles:${endLocal(t)}`,
      fold(`SUMMARY:${esc5545(`Berkeley AI Risk — ${t.speaker} (${t.affiliation})`)}`),
      fold(`DESCRIPTION:${esc5545(desc)}`),
      fold(`LOCATION:${esc5545(t.location)}`),
      `URL:${site.canonical}`,
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/* --- sitemap / robots ------------------------------------------------------ */

const sitemap = () =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  ["", "reading-group.html"].map((p) =>
    `  <url><loc>${site.canonical}${p}</loc><lastmod>${TODAY}</lastmod></url>`).join("\n") +
  `\n</urlset>\n`;

/* robots.txt is only honoured at a domain root, so a copy inside this
   subdirectory would do nothing. Indexing is controlled by the noindex meta tag
   instead — which is also the right tool: a Disallow rule stops the crawl
   before the crawler can read the noindex, which can leave the bare URL indexed
   with no content. A robots.txt is therefore only written when this site owns
   its domain root. Same for the sitemap: pointless while noindex is on. */
const ownsRoot = () => { try { return new URL(site.canonical).pathname === "/"; } catch { return false; } };

/* --- Run ------------------------------------------------------------------- */

console.log(`\nBerkeley AI Risk — build  (today ${TODAY})`);
console.log(`  ${all.length} talks · ${upcoming.length} upcoming · ${past.length} past · ${all.filter((t) => t.videoId).length} recordings\n`);

write("index.html", indexPage());
write("reading-group.html", readingPage());
write("404.html", notFoundPage());
write("series.ics", ics());
if (ownsRoot() && !site.noindex) {
  write("sitemap.xml", sitemap());
  write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${site.canonical}sitemap.xml\n`);
} else {
  for (const f of ["sitemap.xml", "robots.txt"]) {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  console.log(`  ${"sitemap.xml/robots.txt".padEnd(24)} skipped (noindex, or not at a domain root)`);
}

const missing = all.filter((t) => !hasPhoto(t)).map((t) => t.speaker);
if (missing.length) console.log(`\n  note: initials tile used for ${missing.join(", ")} (no public headshot found)`);
const noThumb = all.filter((t) => t.videoId && !fs.existsSync(path.join(ROOT, `assets/thumbs/${t.slug}.jpg`)));
if (noThumb.length) console.log(`  warn: missing thumbnails for ${noThumb.map((t) => t.slug).join(", ")}`);
console.log("");
