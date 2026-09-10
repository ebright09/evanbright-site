# Berkeley AI Risk speaker series

Live design proposal: https://www.evanbrig.ht/BAIRS/
Official site: https://ai-risk.berkeley.edu/

A static site served from the `BAIRS/` directory of `ebright09/evanbright-site` on GitHub Pages. No build service or new hosting account is required.

## Design and navigation

The home page puts the next speaker immediately after a blue-and-gold typographic masthead. Upcoming dates, affiliation, venue, Zoom access and summary are visible without a hover interaction. Registration and calendar actions are separate.

Past talks form a chronological index grouped by semester. Native HTML disclosure controls reveal each summary, recording and original abstract. Opening a talk does not start a video; the visitor explicitly selects the play button. Closing a talk stops its player. Direct links such as `#stuart-russell` open the corresponding archive entry.

The reading group has its own page. Organizer profiles include the confirmed LinkedIn link for Wes Holliday and Twitter/X, Berkeley and Google Scholar links for Will Fithian. The sponsor row includes CDSS, Kavli, BRSL, and CITRIS and the Banatao Institute, following the project owner's correction. SCET is not included.

## Edit and build

- `data/site.json`: site settings, organizers, sponsors and shared links.
- `data/talks.json`: dates, speakers, summaries, original abstracts, recordings, slides and RSVP URLs.
- `data/reading-group.json`: reading sessions.
- `tools/build.mjs`: generates the three HTML pages and `series.ics`.
- `styles.css`: responsive visual design.
- `app.js`: calendar menus, mailing form, video playback and elapsed-talk handling.

From this directory:

```sh
node tools/build.mjs
node --check app.js
```

Commit both source and generated HTML/calendar files. Keep asset and page links relative so they work beneath `/BAIRS/`.

Dates are interpreted in `America/Los_Angeles`. A talk becomes past after its scheduled end time. The browser also moves elapsed upcoming talks into the archive between rebuilds. Add a `pastSummary` to future talks when their introductory copy needs a different tense after the event. Update `summary` for the new talk content when it is known. Speaker abstracts are preserved verbatim inside a separately labeled disclosure.

## Mailing list

The custom modal opens only after a visitor requests it. It posts name, email and optional department to the existing Google Form; its field IDs are in `app.js`.

The form validates locally, includes a honeypot, traps keyboard focus, makes the background inert and returns focus when closed. Network failures show an error and allow retrying. Google Forms returns an opaque cross-origin response, so the page cannot verify acceptance. The completion message says the request was sent and explicitly avoids claiming the visitor is subscribed. A direct Google Form link remains available with or without JavaScript.

No test subscriber data should be sent to the real mailing list.

## Calendar

`series.ics` is generated from the same talk records as the website. It contains the Los Angeles timezone definition and UTF-8 lines folded to the calendar specification.

Each upcoming talk offers Google Calendar, Outlook.com, Outlook 365, and an Apple/ICS download. The series subscription menu offers:

- Apple Calendar / Outlook via `webcal:`.
- A one-time download of all dates.
- A copyable public calendar address and a link to Google Calendar's **From URL** settings. Google requires a desktop browser to add a URL subscription.

Calendar subscriptions use the canonical published URL, including during local preview. The older Google Calendar is a separate resource and is not updated by this build.

## Luma connection still pending

All current `rsvpUrl` fields are empty. Until an event link exists, the upcoming talk has a **Get talk updates** button and a **Registration link forthcoming** label. This is a mailing-list signup, not a reservation.

Add the actual Luma event URL to that talk's `rsvpUrl` and rebuild. Its button becomes **RSVP**. An optional `lumaCalendar` site setting provides a shared fallback. Configure in-person and online attendance in Luma before publishing that link; confirm capacities, location, Zoom delivery and reminder behavior in the actual event settings. The site does not create events or registrations in Luma.

## Asset sources

Existing portraits, video thumbnails, fonts and Berkeley marks were retained. All are self-hosted. YouTube is contacted only after a visitor requests playback.

New assets:

- John Sherman: portrait published on https://www.guardrailnow.org/about, downloaded without alteration. CSS crops it to fit the portrait frame.
- CITRIS: official full-color horizontal mark from https://citris-uc.org/news-events/media/brand-assets/, linked to its homepage.

Organizer links use labeled icons for email, websites, Google Scholar, LinkedIn and Twitter/X. Wesley’s LinkedIn and Will’s Google Scholar URLs were supplied by the project owner. Wesley’s Google Scholar profile was verified from the Google Scholar link on https://wesholliday.net. The Scholar mark is from Simple Icons (https://github.com/simple-icons/simple-icons). Kavli uses the existing text wordmark.

## Preview and publishing

Serve the parent directory to exercise the production subdirectory path:

```sh
python3 -m http.server 4184 --bind 127.0.0.1 --directory ..
```

Open `http://127.0.0.1:4184/BAIRS/`.

Deploy by copying this directory into the repository's `BAIRS/`, reviewing that only the intended BAIRS files changed, then committing and pushing to `main`. Preserve the repository's CNAME and other sites.

`proposalNotice` and `noindex` remain enabled on this personal-domain review copy. If the organizers adopt it on their official domain, change `canonical`, review all links and set those flags to false before rebuilding.

## Validation for this redesign

The build and JavaScript syntax checks pass. Local checks cover the three page routes, internal anchors and assets, all 15 headshots, nine recordings, unchanged original abstracts, all 15 calendar dates and daylight-saving offsets, and the updated organizer and sponsor links. No live form submissions were made. Browser interaction and visual checks are separate from these source checks.
