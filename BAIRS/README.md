# Berkeley AI Risk — redesign proposal

A rebuild of [ai-risk.berkeley.edu](https://ai-risk.berkeley.edu/), staged at
**https://www.evanbrig.ht/BAIRS/** for Will Fithian and Wes Holliday to look at.

Static HTML on GitHub Pages. No build step at deploy — what is committed is what
is served. There *is* a generator, but you run it locally and commit its output.

```
BAIRS/
├── index.html            generated — hero, upcoming, past talks, about, organizers
├── reading-group.html    generated
├── 404.html              generated
├── series.ics            generated — the calendar subscribe feed
├── sitemap.xml           generated
├── robots.txt            generated
├── styles.css            hand-written; tokens at the top
├── app.js                hand-written; modal, accordion, calendar menus
├── data/
│   ├── talks.json        ← the source of truth for every talk
│   ├── reading-group.json
│   └── site.json         copy, organizers, sponsors, departments
├── tools/build.mjs       data/*.json  →  the generated files above
└── assets/
    ├── speakers/         16 headshots, 400×400
    ├── thumbs/           9 video thumbnails, self-hosted
    ├── logos/            cdss.svg, brsl.svg, scet.svg
    ├── fonts/            Inter + Newsreader, variable, latin subset
    ├── og.png            social share image
    └── favicon.svg
```

---

## Adding a talk

1. Add an entry to `data/talks.json`.
2. `node tools/build.mjs`
3. Commit everything, including the regenerated HTML and `series.ics`.

```jsonc
{
  "slug": "jane-doe",                    // also the headshot filename
  "speaker": "Jane Doe",
  "affiliation": "Example Institute",
  "website": "https://example.com",
  "linkedin": null,                      // only if verified — see below
  "headshot": "assets/speakers/jane-doe.jpg",
  "title": "The title of the talk",
  "summary": "One or two sentences, third person, tense matching the date.",
  "abstract": "<p>The speaker's own words, verbatim.</p>",
  "date": "2026-10-06",                  // YYYY-MM-DD, zero-padded
  "time": "16:00",                       // 24h, Berkeley local
  "durationMinutes": 90,
  "location": "621 Sutardja Dai Hall",
  "videoId": null,                       // YouTube id once the recording is up
  "slidesUrl": null,
  "rsvpUrl": null                        // the Luma event URL
}
```

Nothing else needs touching. Upcoming/past, season grouping, the calendar feed,
the JSON-LD and the sitemap all follow from `date`.

**After a talk happens**, set `videoId` to the YouTube id and rebuild. The video
then embeds under that talk in the archive automatically.

**Headshots**: square, 400×400, `assets/speakers/<slug>.jpg`. If the file is
missing the build falls back to an initials tile, so nothing breaks — it just
prints a note.

---

## The two-tier voice

Every talk carries both a `summary` and an `abstract`, on purpose.

`summary` is written by us: third person, uniform across the whole series, tense
keyed to whether the talk has happened. It's what appears on the card and in the
hover preview.

`abstract` is the speaker's own words, verbatim, shown on expand under an
*"Abstract — in the speaker's words"* label.

This is the only arrangement that fixes the two entries (Chandar, Mulligan) whose
"abstracts" were lifted academic paper abstracts that never described the talk —
without putting words in anyone's mouth under their own name.

---

## Mailing list

The modal posts to **the Google Form the series already uses**, so no subscriber
was migrated and the existing responses sheet keeps filling up. Field ids are in
`app.js` under `FORM`.

Google Forms sends no CORS headers, so the response is opaque and unreadable —
which is why validation is strict *before* the request and the success state is
shown optimistically. There is a honeypot field, and a plain link to the Google
Form for anyone with JavaScript off.

**Limitation:** Google Forms cannot send a confirmation email or do double
opt-in. To move to a real newsletter tool (Buttondown's free tier is the obvious
one), replace the body of `submitSubscriber()` in `app.js`. Nothing else changes.

The modal also opens itself once, unprompted, after 25 seconds or half a page of
scrolling, whichever comes first — once per browser, ever. Set `AUTO_OPEN = false`
in `app.js` to turn that off.

---

## Calendar

The old "Add to Calendar" button linked to a Google Calendar *embed* view, which
adds nothing on click. That calendar was also nine months stale — its last event
was 2025-12-09 while the site advertised talks through 2026-09.

The root cause was that a hand-maintained calendar was the source of truth. Here
it is the other way round: `data/talks.json` is canonical and the calendar is
generated from it, so the two cannot disagree.

Three layers:

1. **Per-talk "Add to calendar"** — Google, Outlook.com, Outlook 365, and a
   client-side `.ics` download for Apple Calendar. Built from the talk record at
   click time.
2. **"Subscribe to the calendar"** → `webcal://www.evanbrig.ht/BAIRS/series.ics`.
   One click and Apple Calendar / Outlook / Google poll it forever. This is the
   thing the old button was trying to be.
3. **Luma's own invite** on RSVP, once Luma is wired up.

`series.ics` carries a full `VTIMEZONE` for `America/Los_Angeles`, so wall-clock
times are unambiguous and no client has to guess an offset — the usual cause of
an 8-hour drift. Lines are folded to the 75-octet limit, which strict parsers
(Outlook included) require.

**Retire or repoint the old Google Calendar.** Leaving it live is what makes the
current button lie.

---

## RSVP — Luma, not yet wired

`rsvpUrl` is `null` on every talk, so RSVP buttons currently fall back to
"Notify me", which opens the mailing-list modal. That is deliberate: a button
that goes nowhere is worse than one that does something useful.

To turn RSVP on: create the Luma calendar, add one event per upcoming talk, and
put each event URL in `rsvpUrl`. Set `lumaCalendar` in `data/site.json` to have
un-wired talks point at the calendar page instead of the modal.

Luma handles the hybrid problem properly — **two free ticket types on one event**:

| Ticket | Capacity | What the registrant gets |
|---|---|---|
| In person — 621 Sutardja Dai Hall | 40 (the room's real cap) | Address and room |
| Online — Zoom | unlimited | A unique `luma.com/join/…` link in the confirmation and reminder emails |

The Zoom link is delivered only to online registrants, and if the Zoom URL ever
changes Luma re-points the existing join links — no re-mailing. Luma also sends
reminders and attaches a calendar invite.

Note the Luma **API** needs a paid Luma Plus plan. The **embeds** are free, and
this site doesn't need the API — talk data lives in `talks.json`.

---

## Things that need a human decision

1. **SCET may not be a sponsor.** The current site names exactly three
   co-sponsors — CDSS, the Kavli Center, and BRSL — and the Kavli Center's own
   page says the same three. SCET appears only in the homepage list of
   *affiliated units* that scholars come from, which is probably where the
   association came from. It is included in the sponsor row here with
   `"unconfirmed": true` in `data/site.json`. Confirm with the organizers, or
   delete that entry.

2. **LinkedIn URLs are deliberately blank.** Will Fithian appears to have no
   LinkedIn profile (his faculty page links X instead). Wes Holliday has two
   plausible profiles and LinkedIn blocks automated verification, so guessing
   risks linking a stranger under his name. Fill in `linkedin` in
   `data/site.json` and the button appears on its own. Same policy for speakers:
   only Jessica Newman's is populated, because hers is the only one linked from
   an official page.

3. **The Kavli Center publishes no logo file.** Their own site renders a text
   wordmark, so it is set as type here to match the other marks' optical weight.

4. **`noindex` is on.** This copy carries UC Berkeley marks on a personal domain,
   so it must not compete with the official site in search or read as
   impersonation. `robots.txt` disallows it and there is a dismissible bar at the
   top of every page. When this moves to `ai-risk.berkeley.edu`, set
   `"noindex": false` and `"proposalNotice": false` in `data/site.json`, update
   `canonical`, and rebuild — both disappear.

---

## What this recovers from the old site

- **Five recordings that existed but were never linked** — Newman, Raji, Elmore,
  Mulligan and Drago were all on the Kavli Center's YouTube playlist and
  unreachable from the site. All nine recordings now embed in place.
- **The accessibility statement**, which existed only inside a Google Calendar
  event description and appeared nowhere on the site.
- **The Zoom link**, likewise buried in the calendar description.
- **Talk content for crawlers.** The old pages rendered every talk client-side
  into an empty `<div>`, so search engines and link previews saw nothing. Shared
  links previewed as a bare URL.

Fixed along the way: the reading group's off-by-one date bug (`new
Date("2025-06-03")` parses as UTC midnight and rendered every session a day
early), an unpadded `2025-10-7`, two talks out of chronological order, raw
markdown asterisks rendering literally in Steinhardt's abstract, and the
copy-pasted `&index=1` on four video links.

---

## Local preview

```bash
python3 -m http.server 4173 --directory "$(dirname "$PWD")"
```

Then open **http://localhost:4173/BAIRS/** — served from the parent directory so
the local path matches production exactly. Serving `BAIRS/` itself as the root
would hide any subdirectory path bug.

## Deploying

This directory drops into the `ebright09/evanbright-site` repo as `BAIRS/`, the
same way the Minnard redesign used `/carla/`.

```bash
node tools/build.mjs
rsync -a --delete BAIRS/ /path/to/evanbright-site/BAIRS/
cd /path/to/evanbright-site && git add -A && git commit -m "Add BAIRS" && git push
```

Two traps that directory imposes:

- **Every path must stay relative** (`assets/…`, never `/assets/…`), or nothing
  loads from the subdirectory.
- **`/BAIRS` is case-sensitive** on GitHub Pages.

## Credits

Headshots are the speakers' own public photos, taken from their institutional or
personal pages and self-hosted rather than hotlinked. Recordings are hosted by
the Kavli Center for Ethics, Science, and the Public. Slide PDFs are still served
from `ai-risk.berkeley.edu` rather than duplicated here — about 20 MB of files.
