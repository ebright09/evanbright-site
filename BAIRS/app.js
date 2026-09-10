/* ==========================================================================
   Berkeley AI Risk — interaction layer

   No dependencies, no third-party requests. Everything degrades: with
   JavaScript off you still get the full talk list, every abstract, the RSVP
   links, the ICS subscribe link and a plain link to the mailing-list form.
   ========================================================================== */

(function () {
  "use strict";

  /* --- Config ------------------------------------------------------------ */

  // The mailing list posts to the Google Form the series already uses, so no
  // subscriber has to be migrated. Field ids read off the live form.
  // To move to a real newsletter tool later, replace submitSubscriber() only.
  var FORM = {
    action: "https://docs.google.com/forms/d/e/1FAIpQLSfCB4AqVE-REphg2nBPK9Bz3Y7TDbdYvFnjop_MHmt4zj3UzA/formResponse",
    name: "entry.981192462",
    email: "entry.1331725139",
    dept: "entry.2055940634"
  };

  // Open the mailing-list modal once, unprompted, on a visitor's first read.
  // Set to false to make the modal purely click-triggered.
  var AUTO_OPEN = true;
  var AUTO_OPEN_DELAY = 25000;   // ms
  var AUTO_OPEN_SCROLL = 0.5;    // fraction of the page

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // localStorage throws outright in some privacy modes, so every access is guarded.
  function store(key, val) {
    try {
      if (val === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, val);
    } catch (e) { /* private mode, blocked site data — carry on without it */ }
    return null;
  }

  /* Served over http(s), but a calendar client needs the webcal scheme to offer
     a subscription rather than a one-off import. Computed up front because the
     calendar menus below are built from it. */
  var WEBCAL = new URL("series.ics", location.href).href.replace(/^https?:/, "webcal:");
  document.body.setAttribute("data-webcal", WEBCAL);

  var TALKS = {};
  try {
    var node = $("#talk-data");
    if (node) {
      JSON.parse(node.textContent).forEach(function (t) { TALKS[t.slug] = t; });
    }
  } catch (e) { /* leave TALKS empty; calendar menus simply won't render */ }

  /* --- Notice bar -------------------------------------------------------- */

  var notice = $("#notice");
  if (notice) {
    if (store("bair.notice") === "off") {
      notice.remove();
    } else {
      var nx = $(".notice__x", notice);
      if (nx) nx.addEventListener("click", function () {
        notice.remove();
        store("bair.notice", "off");
      });
    }
  }

  /* --- Mobile nav -------------------------------------------------------- */

  var burger = $("#burger"), nav = $("#nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") === "true";
      burger.setAttribute("aria-expanded", String(!open));
      nav.hidden = open;
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A" && window.matchMedia("(max-width: 900px)").matches) {
        burger.setAttribute("aria-expanded", "false");
        nav.hidden = true;
      }
    });
  }

  /* --- Upcoming rows: accordion ------------------------------------------ */

  $$(".row__toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      if (panel) panel.hidden = open;
      hideCard();
    });
  });

  /* --- Upcoming rows: elapsed guard -------------------------------------- */

  /* Upcoming vs past is decided at build time and baked into the HTML, so
     between a talk finishing and the next rebuild a finished talk would still
     sit under "Upcoming" offering an RSVP. Catch that in the browser. */
  (function () {
    var now = Date.now();
    $$(".row").forEach(function (row) {
      var t = TALKS[row.getAttribute("data-slug")];
      if (!t || !t.endUtc || Date.parse(t.endUtc) > now) return;
      row.classList.add("is-elapsed");
      var cta = $(".row__cta", row);
      if (cta) cta.innerHTML = '<span class="tag">This talk has taken place</span>';
    });
  })();

  /* --- Upcoming rows: hover preview -------------------------------------- */

  /* Hover is a desktop-only enhancement. On touch, the same content is one tap
     away in the accordion panel, so nothing is hidden behind a hover state. */
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
  var card = $("#hovercard");
  var cardTimer = null;

  function hideCard() {
    if (cardTimer) { clearTimeout(cardTimer); cardTimer = null; }
    if (card) card.setAttribute("data-show", "0");
  }

  function showCard(btn) {
    if (!card) return;
    var talk = TALKS[btn.closest(".row").getAttribute("data-slug")];
    if (!talk || !talk.summary) return;

    card.innerHTML =
      '<div class="hovercard__title"></div><div class="hovercard__sum"></div>' +
      '<div class="hovercard__foot"></div>';
    $(".hovercard__title", card).textContent = talk.title;
    $(".hovercard__sum", card).textContent = talk.summary;
    $(".hovercard__foot", card).textContent =
      talk.longDate + " · " + talk.timeLabel + " · " + talk.location + " — click for full details";

    // Prefer the right of the row; fall back to the left when there is no room.
    var r = btn.getBoundingClientRect();
    card.setAttribute("data-show", "1");
    var w = card.offsetWidth, h = card.offsetHeight, pad = 16;
    var left = r.right + pad;
    if (left + w + pad > window.innerWidth) left = Math.max(pad, r.left - w - pad);
    var top = Math.min(
      Math.max(pad, r.top + r.height / 2 - h / 2),
      window.innerHeight - h - pad
    );
    card.style.left = left + "px";
    card.style.top = top + "px";
  }

  if (card && canHover.matches) {
    $$(".row__toggle").forEach(function (btn) {
      btn.addEventListener("pointerenter", function (e) {
        if (e.pointerType !== "mouse") return;
        if (btn.getAttribute("aria-expanded") === "true") return;
        if (window.innerWidth < 900) return;
        cardTimer = setTimeout(function () { showCard(btn); }, 150);
      });
      btn.addEventListener("pointerleave", hideCard);
      btn.addEventListener("focus", hideCard);
    });
    window.addEventListener("scroll", hideCard, { passive: true });
  }

  /* --- Archive cards ----------------------------------------------------- */

  function openCard(article) {
    var panel = $(".card__panel", article);
    var toggles = $$('[aria-controls="' + (panel && panel.id) + '"]', article);
    var open = article.classList.contains("is-open");

    article.classList.toggle("is-open", !open);
    if (panel) panel.hidden = open;
    toggles.forEach(function (t) { t.setAttribute("aria-expanded", String(!open)); });

    // Swap the thumbnail for the player only on first open — nothing is
    // requested from YouTube until someone actually asks for the video.
    if (!open) {
      var media = $(".card__media", article);
      var id = article.getAttribute("data-video");
      if (media && id && !$(".card__frame", article)) {
        var frame = document.createElement("div");
        frame.className = "card__frame";
        var iframe = document.createElement("iframe");
        iframe.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
        iframe.title = $(".card__title", article).textContent;
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture";
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        iframe.allowFullscreen = true;
        frame.appendChild(iframe);
        media.replaceWith(frame);
      }
    }
  }

  $$(".card").forEach(function (article) {
    $$(".card__media, .card__toggle", article).forEach(function (t) {
      t.addEventListener("click", function () { openCard(article); });
    });
  });

  /* --- Add to calendar --------------------------------------------------- */

  function icsEscape(s) {
    return String(s == null ? "" : s)
      .replace(/\\/g, "\\\\").replace(/;/g, "\\;")
      .replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }

  // RFC 5545 caps lines at 75 octets; long abstracts must be folded or the
  // file is rejected by strict parsers (Outlook among them).
  function fold(line) {
    if (line.length <= 73) return line;
    var out = line.slice(0, 73), rest = line.slice(73);
    while (rest.length > 72) { out += "\r\n " + rest.slice(0, 72); rest = rest.slice(72); }
    return out + "\r\n " + rest;
  }

  function stamp(iso) { return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }

  function singleIcs(talk) {
    var body = talk.summary + (talk.rsvpUrl ? "\n\nRSVP: " + talk.rsvpUrl : "") +
      "\n\n" + location.href.split("#")[0];
    return [
      "BEGIN:VCALENDAR", "VERSION:2.0",
      "PRODID:-//Berkeley AI Risk//Speaker Series//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + talk.slug + "@ai-risk.berkeley.edu",
      "DTSTAMP:" + stamp(new Date().toISOString()),
      "DTSTART:" + stamp(talk.startUtc),
      "DTEND:" + stamp(talk.endUtc),
      fold("SUMMARY:" + icsEscape("Berkeley AI Risk — " + talk.speaker)),
      fold("DESCRIPTION:" + icsEscape(body)),
      fold("LOCATION:" + icsEscape(talk.location)),
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
  }

  function download(name, text) {
    var blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function googleUrl(talk) {
    var p = new URLSearchParams({
      action: "TEMPLATE",
      text: "Berkeley AI Risk — " + talk.speaker,
      dates: stamp(talk.startUtc) + "/" + stamp(talk.endUtc),
      details: talk.summary + (talk.rsvpUrl ? "\n\nRSVP: " + talk.rsvpUrl : ""),
      location: talk.location,
      ctz: "America/Los_Angeles"
    });
    return "https://calendar.google.com/calendar/render?" + p;
  }

  function outlookUrl(talk, host) {
    var p = new URLSearchParams({
      path: "/calendar/action/compose", rru: "addevent",
      subject: "Berkeley AI Risk — " + talk.speaker,
      startdt: talk.startUtc, enddt: talk.endUtc,
      body: talk.summary + (talk.rsvpUrl ? "\n\nRSVP: " + talk.rsvpUrl : ""),
      location: talk.location
    });
    return "https://outlook." + host + "/calendar/0/deeplink/compose?" + p;
  }

  var openMenu = null;
  function closeMenu() {
    if (!openMenu) return;
    $(".cal__menu", openMenu).hidden = true;
    $(".cal__btn", openMenu).setAttribute("aria-expanded", "false");
    openMenu = null;
  }

  $$(".cal").forEach(function (wrap) {
    var btn = $(".cal__btn", wrap), menu = $(".cal__menu", wrap);
    var talk = TALKS[wrap.getAttribute("data-slug")];
    if (!btn || !menu || !talk) { if (btn) btn.hidden = true; return; }

    menu.innerHTML =
      '<a data-k="g" href="' + googleUrl(talk) + '" target="_blank" rel="noopener">Google Calendar</a>' +
      '<a data-k="o" href="' + outlookUrl(talk, "live.com") + '" target="_blank" rel="noopener">Outlook.com</a>' +
      '<a data-k="m" href="' + outlookUrl(talk, "office.com") + '" target="_blank" rel="noopener">Outlook 365</a>' +
      '<button type="button" data-k="i">Apple Calendar / .ics</button>' +
      '<div class="cal__sep"></div>' +
      '<a href="' + WEBCAL + '">Subscribe to the whole series</a>' +
      '<div class="cal__note">Subscribing keeps every future talk up to date automatically.</div>';

    $('[data-k="i"]', menu).addEventListener("click", function () {
      download(talk.slug + ".ics", singleIcs(talk));
      closeMenu();
    });

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var isOpen = openMenu === wrap;
      closeMenu();
      if (!isOpen) {
        menu.hidden = false;
        btn.setAttribute("aria-expanded", "true");
        openMenu = wrap;
      }
    });
  });

  document.addEventListener("click", function (e) {
    if (openMenu && !openMenu.contains(e.target)) closeMenu();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });

  /* --- Mailing list modal ------------------------------------------------ */

  var modal = $("#subscribe");

  if (modal) {
    var box = $(".modal__box", modal);
    var form = $("#sub-form", modal);
    var okPanel = $("#sub-ok", modal);
    var lastFocus = null;

    function focusables() {
      return $$("a[href], button:not([disabled]), input:not([type=hidden])", box)
        .filter(function (el) { return el.offsetParent !== null; });
    }

    function openModal(trigger) {
      lastFocus = trigger || document.activeElement;
      modal.hidden = false;
      document.body.style.overflow = "hidden";
      store("bair.sub.seen", "1");
      var f = focusables();
      if (f.length) f[Math.min(1, f.length - 1)].focus();
    }

    function closeModal() {
      modal.hidden = true;
      document.body.style.overflow = "";
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    $$("[data-subscribe]").forEach(function (t) {
      t.addEventListener("click", function (e) { e.preventDefault(); openModal(t); });
    });
    $$("[data-close]", modal).forEach(function (t) {
      t.addEventListener("click", closeModal);
    });
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });

    modal.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeModal(); return; }
      if (e.key !== "Tab") return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    function setError(input, msg) {
      var err = $("#" + input.id + "-err");
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      if (err) { err.textContent = msg || ""; err.hidden = !msg; }
      return !msg;
    }

    /* The one place the backend is named. Swap the body of this function to
       move to Buttondown, MailerLite or anything else. */
    function submitSubscriber(values) {
      var body = new URLSearchParams();
      body.set(FORM.name, values.name);
      body.set(FORM.email, values.email);
      body.set(FORM.dept, values.dept);
      // Google Forms sends no CORS headers, so the response is opaque and
      // cannot be read. Validation therefore has to happen before this point.
      return fetch(FORM.action, { method: "POST", mode: "no-cors", body: body });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var nameEl = $("#sub-name"), mailEl = $("#sub-email"), deptEl = $("#sub-dept");
      var ok = true;
      ok = setError(nameEl, nameEl.value.trim() ? "" : "Please enter your name.") && ok;
      var mail = mailEl.value.trim();
      ok = setError(mailEl,
        !mail ? "Please enter your email address."
          : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail) ? "That doesn’t look like an email address."
            : "") && ok;
      if (!ok) { (nameEl.getAttribute("aria-invalid") === "true" ? nameEl : mailEl).focus(); return; }

      // Honeypot. Answer as though it worked so a bot learns nothing.
      if ($("#sub-company").value) { form.hidden = true; okPanel.hidden = false; return; }

      var submit = $("#sub-submit");
      submit.disabled = true;
      submit.textContent = "Signing you up…";

      submitSubscriber({ name: nameEl.value.trim(), email: mail, dept: deptEl.value.trim() })
        .catch(function () { /* opaque responses reject in some browsers; treat as sent */ })
        .then(function () {
          form.hidden = true;
          okPanel.hidden = false;
          $("#sub-ok-mail").textContent = mail;
          store("bair.sub.done", "1");
          okPanel.setAttribute("tabindex", "-1");
          okPanel.focus();
        });
    });

    // One unprompted open, ever, per browser.
    if (AUTO_OPEN && !store("bair.sub.seen") && !store("bair.sub.done")) {
      var fired = false;
      var fire = function () {
        if (fired || !modal.hidden) return;
        fired = true;
        window.removeEventListener("scroll", onScroll);
        openModal(null);
      };
      var onScroll = function () {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        if (max > 0 && window.scrollY / max >= AUTO_OPEN_SCROLL) fire();
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      setTimeout(fire, AUTO_OPEN_DELAY);
    }
  }

  /* --- webcal:// ---------------------------------------------------------- */

  $$("[data-webcal-link]").forEach(function (a) { a.href = WEBCAL; });
})();
