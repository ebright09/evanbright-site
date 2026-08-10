# evanbrig.ht

Static site served by **GitHub Pages** (free) on the custom domain `www.evanbrig.ht`,
registered at Netim.

| Path | What it is |
|---|---|
| `/` | "please hold…" holding page |
| `/carla/` | The Minnard Law Firm website redesign concept |

## Layout

```
.
├── index.html        # holding page
├── 404.html          # not-found page (GitHub Pages serves this site-wide)
├── CNAME             # custom domain — must contain exactly: www.evanbrig.ht
├── .nojekyll         # REQUIRED — see "Why .nojekyll" below
├── robots.txt        # keeps /carla/ out of search results
└── carla/
    ├── index.html    # the redesign page
    └── support.js    # its rendering runtime (Claude Design "dc" runtime)
```

There is no build step. What is committed is what is served.

## Why `.nojekyll` is not optional

GitHub Pages pipes every push through Jekyll unless a `.nojekyll` file sits at the
root. Jekyll interprets `{{ … }}` as its own Liquid template syntax — and
`carla/index.html` uses `{{ … }}` for its 14 data bindings (`{{ onSubmit }}`,
`{{ year }}`, and so on). Without `.nojekyll`, Jekyll silently strips all of them
and the page ships broken.

**Never delete `.nojekyll`.**

## First-time setup

### 1. Create the repo and push

The repo must be **public** — GitHub Pages on a Free account only serves public
repos. (Everything here is meant to be publicly visible anyway.)

```bash
git remote add origin https://github.com/<your-github-username>/evanbright-site.git
git branch -M main
git push -u origin main
```

### 2. Turn on Pages

Repo → **Settings** → **Pages**:

- **Source:** Deploy from a branch
- **Branch:** `main`, folder `/ (root)`

Wait for the green check on the deploy, then confirm it works at
`https://<your-github-username>.github.io/evanbright-site/` before touching DNS.

### 3. Point DNS at GitHub (Netim)

In the Netim panel, open the DNS zone for `evanbrig.ht` and add:

| Type | Host / Name | Value |
|---|---|---|
| CNAME | `www` | `<your-github-username>.github.io.` |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |

The `CNAME` on `www` is what actually serves the site. The apex `A`/`AAAA`
records exist so that bare `evanbrig.ht` resolves too — GitHub then redirects it
to `www.evanbrig.ht` automatically, because `CNAME` in this repo names the `www`
host.

Delete any parking-page records Netim added at `@` or `www`, or they will fight
these.

### 4. Attach the domain in GitHub

Settings → Pages → **Custom domain** → `www.evanbrig.ht` → Save.

GitHub re-checks DNS, then issues a Let's Encrypt certificate. Once
**Enforce HTTPS** stops being greyed out, tick it.

DNS propagation is usually minutes but can take up to 24h. Check progress with:

```bash
dig +short www.evanbrig.ht CNAME
```

## Making changes

```bash
git add -A && git commit -m "your message" && git push
```

Pages redeploys on push to `main`, typically within a minute.

To preview locally before pushing:

```bash
python3 -m http.server 4173 --directory .
```

Then open <http://localhost:4173/> and <http://localhost:4173/carla/>.

## Notes on `/carla/`

- **It is deliberately unindexed.** The page carries
  `<meta name="robots" content="noindex, nofollow">` and `robots.txt` disallows
  the path. This is unaffiliated demo work on a personal domain, and it should
  never surface in search as though it were the firm's real site
  (`minnardlaw.com`).
- **The intake form does not send anything.** Its submit handler only flips the
  UI to a "thank you" state — no email, no backend. Anyone who fills it in
  believes they have contacted a law firm and has not. Wire it to a form service
  (Formspree, Basin, Netlify Forms) or remove it before this is shown to anyone
  who might use it in earnest.
- **Images are hotlinked from the firm's Wix CDN** (`static.wixstatic.com`), and
  the press section embeds YouTube and Vimeo. If Wix changes or blocks those
  URLs, the images vanish. Vendoring them into `carla/assets/` would make the
  page self-contained.
- **The page renders client-side.** `support.js` fetches React 18.3.1 from unpkg
  at load, then builds the DOM. With JavaScript disabled — or if unpkg is
  unreachable — the page is blank, and crawlers see no content. That is fine for
  noindexed demo work; it would not be fine for a production law-firm site.
