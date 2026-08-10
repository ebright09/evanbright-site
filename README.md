# evanbrig.ht

Static site served by **GitHub Pages** (free tier) on the custom domain
`www.evanbrig.ht`, registered at **Netim**.

| URL | What it is |
|---|---|
| `https://www.evanbrig.ht/` | "please hold…" holding page |
| `https://www.evanbrig.ht/carla/` | The Minnard Law Firm website redesign concept |

- GitHub account: `ebright09`
- Repo: `ebright09/evanbright-site` (must be **public**)
- Registrar / DNS: Netim

## Layout

```
.
├── index.html        # holding page
├── 404.html          # not-found page (Pages serves this site-wide)
├── CNAME             # custom domain — exactly: www.evanbrig.ht
├── .nojekyll         # REQUIRED — see below
├── robots.txt        # keeps /carla/ out of search results
└── carla/
    ├── index.html    # the redesign page
    └── support.js    # its rendering runtime (Claude Design "dc" runtime)
```

No build step. What is committed is what is served.

## Why `.nojekyll` is not optional

GitHub Pages pipes every push through Jekyll unless a `.nojekyll` file sits at
the repo root. Jekyll reads `{{ … }}` as its own Liquid template syntax — and
`carla/index.html` uses `{{ … }}` for its 14 data bindings (`{{ onSubmit }}`,
`{{ year }}`, …). Without `.nojekyll`, Jekyll strips them all and the page ships
quietly broken.

**Never delete `.nojekyll`.**

---

# First-time setup

Do these in order. **DNS goes first** — it is the slowest step, and doing it
first avoids a confusing redirect loop (see the note in step 3).

## Step 1 — Netim DNS

### 1a. Nameservers — already correct

`evanbrig.ht` is on Netim's own DNS (`ns1.netim.net`, `ns2.netim.net`,
`ns3.netim.net`), so the Netim zone editor is the right place to make these
changes. Nothing to do here.

### 1b. Open the zone file

**Netim Direct → My Domains → evanbrig.ht → "Zone file"**

### 1c. Drop the TTL first

The zone's **default TTL is 24 hours**. Leave it there and every mistake below
takes a day to correct, because resolvers worldwide will have cached the old
answer.

Before editing anything, click **Update** next to "Default zone TTL" and set it
to **1 hour**. Raise it again once the site is confirmed working, if you like.

### 1d. Delete the two parking records

The zone ships with Netim's parking page on `185.26.106.234`. Both of these must
go:

| Name | Type | Value | Action |
|---|---|---|---|
| `evanbrig.ht` | A | `185.26.106.234` | **delete** |
| `www.evanbrig.ht` | A | `185.26.106.234` | **delete** |

The `www` one is not optional housekeeping — Netim refuses to create a CNAME on a
host that already holds any other record (*"It is not possible to add a CNAME
record to a domain or subdomain that already has another record, whatever its
type"*). The `www` A record must be gone before the CNAME will save.

**Keep everything else.** Specifically:

- the three `NS` records (Netim won't let you delete these anyway),
- `MX (10) mx1.netim.net` and `MX (10) mx2.netim.net`,
- `TXT "v=spf1 ip4:185.26.104.0/22 ~all"`.

The MX and SPF records are Netim's email service for this domain. They have
nothing to do with the website and do not conflict with GitHub Pages — deleting
them would break mail to `@evanbrig.ht`.

### 1e. Add these nine records

Use **Create a new record**. In the name/host field enter `www` for the CNAME and
leave it **empty** for the apex records — the list then displays them as
`www.evanbrig.ht` and `evanbrig.ht`, matching the existing rows.

Shortcut: the middle icon on each row duplicates it. Duplicating the apex row you
just deleted (or any `evanbrig.ht` row) and editing the type/value is a reliable
way to get the name field right.

| Type | Name / host | Value |
|---|---|---|
| CNAME | `www` | `ebright09.github.io.` |
| A | *(empty — apex)* | `185.199.108.153` |
| A | *(empty — apex)* | `185.199.109.153` |
| A | *(empty — apex)* | `185.199.110.153` |
| A | *(empty — apex)* | `185.199.111.153` |
| AAAA | *(empty — apex)* | `2606:50c0:8000::153` |
| AAAA | *(empty — apex)* | `2606:50c0:8001::153` |
| AAAA | *(empty — apex)* | `2606:50c0:8002::153` |
| AAAA | *(empty — apex)* | `2606:50c0:8003::153` |

Leave TTL on "By default" — step 1c set that default to 1 hour.

Notes:

- The CNAME value is `ebright09.github.io.` — **the account's Pages host, not the
  repo**. No `/evanbright-site` in it. The trailing dot marks it absolute; Netim
  usually adds it for you, and it is harmless either way.
- The `www` CNAME is what actually serves the site. The apex `A`/`AAAA` records
  exist only so bare `evanbrig.ht` resolves — GitHub then 301-redirects it to
  `www.evanbrig.ht`, because the `CNAME` file in this repo names the `www` host.
- Four A records is correct, not a mistake. They are four load-balanced GitHub
  edge addresses.
- If you have (or later add) a `CAA` record, it must permit `letsencrypt.org`,
  or GitHub can never issue the certificate. No CAA record at all is fine.

### 1f. Unrelated, but worth doing while you're in there

**Auto-renewal is switched off** on this domain, and it expires **2027-08-10**.
If that stays off, the domain lapses on that date and the site goes dark no
matter how well any of the above is configured. Turn it on in the domain
summary, or put a calendar reminder somewhere you'll actually see it.

## Step 2 — Create the GitHub repo and push

`git remote add` only writes a URL into `.git/config`; it does not create
anything on GitHub. The repo must exist there first, or the push fails with
`remote: Repository not found`.

At **[github.com/new](https://github.com/new)**:

- **Owner:** `ebright09`
- **Name:** `evanbright-site`
- **Visibility:** **Public** — required, Pages does not serve private repos on a
  Free account
- **Do not** tick "Add a README", ".gitignore", or "Choose a license". Any of
  those creates a commit on GitHub, and the push below is then rejected as a
  divergent history.

Then, from this directory:

```bash
git push -u origin main
```

The remote is already set correctly and your macOS keychain already holds a
`github.com` credential for `ebright09`, so this should not prompt.

## Step 3 — Enable GitHub Pages

Repo → **Settings** → **Pages**:

- **Source:** Deploy from a branch
- **Branch:** `main`, folder `/ (root)` → **Save**

Because `CNAME` is committed, GitHub reads it and fills in **Custom domain:
`www.evanbrig.ht`** by itself. You should not need to type it.

> **Why DNS came first:** with a `CNAME` file present, `ebright09.github.io/evanbright-site/`
> permanently redirects to `www.evanbrig.ht`. There is no working github.io
> preview URL to test against — so the custom domain needs to already resolve.

Under the custom domain box GitHub will show a DNS check. Green means it
resolves. If it complains, DNS has not propagated yet — wait and hit **Check
again**.

## Step 4 — HTTPS

Once the DNS check passes, GitHub requests a Let's Encrypt certificate. This
takes anywhere from a few minutes to a few hours.

While it is pending, **Enforce HTTPS** is greyed out. When it becomes
selectable, **tick it.** Until you do, the site answers on plain HTTP too.

## Step 5 — Verify

```bash
dig +short www.evanbrig.ht          # → ebright09.github.io. then 4 185.199.x.153 addrs
dig +short evanbrig.ht              # → the 4 185.199.x.153 addrs
curl -sI https://www.evanbrig.ht/ | head -1          # → HTTP/2 200
curl -sI https://evanbrig.ht/ | head -1              # → HTTP/2 301 (redirect to www)
curl -sI https://www.evanbrig.ht/carla/ | head -1    # → HTTP/2 200
```

Confirm the Carla page rendered rather than merely loaded — if Jekyll ate the
bindings you get a page with visible `{{ }}` or missing content:

```bash
curl -s https://www.evanbrig.ht/carla/ | grep -c '{{'   # → 14 in source (correct; React resolves them in-browser)
```

Timeline: DNS is usually minutes but is allowed up to 24h. The certificate
usually lands within the hour after DNS is green.

---

# Making changes

```bash
git add -A && git commit -m "message" && git push
```

Pages redeploys on push to `main`, normally under a minute. Watch it in the
repo's **Actions** tab.

Preview locally before pushing:

```bash
python3 -m http.server 4173 --directory .
```

Then <http://localhost:4173/> and <http://localhost:4173/carla/>. (Python's
server does not serve custom 404s; that only works on Pages.)

---

# Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `remote: Repository not found` | Repo not created on GitHub, or it is private and the credential can't see it | Create it at github.com/new; GitHub returns 404 rather than 403 to avoid leaking whether private repos exist |
| Push rejected, "fetch first" / divergent histories | You ticked "Add a README" when creating the repo | `git pull --rebase origin main` then push, or delete and recreate the repo empty |
| Push prompts for a password, then fails | Stale keychain credential; GitHub stopped accepting account passwords over HTTPS in 2021 | `printf "protocol=https\nhost=github.com\n\n" \| git credential-osxkeychain erase`, then push and paste a Personal Access Token (repo scope) as the password |
| Netim won't save the `www` CNAME | Another record already exists on `www` | Delete the existing `www` A/AAAA/CNAME first — Netim forbids a CNAME coexisting with any other record on the same host |
| Pages: "Domain does not resolve to the GitHub Pages server" | DNS not propagated, or CNAME points at the repo instead of the account | Value must be `ebright09.github.io.` with no repo path; then **Check again** |
| Zone edits have no effect | Domain is on non-Netim nameservers | `dig +short NS evanbrig.ht` and edit the zone wherever it actually points |
| Enforce HTTPS stays greyed out for hours | Cert issuance stuck, or a CAA record blocks Let's Encrypt | Remove the custom domain, save, re-add it, save. Check `dig +short CAA evanbrig.ht` is empty or allows `letsencrypt.org` |
| `/carla/` shows raw `{{ }}` or is missing chunks | `.nojekyll` was deleted | Restore it at the repo root and push |
| Apex works, `www` doesn't (or vice versa) | Only one of the two record sets was added | Both are needed: CNAME on `www`, A+AAAA on `@` |
| Site serves an old version | Pages CDN cache | Hard reload; give it a few minutes |

Free-tier limits, none of which this site approaches: 1 GB repo, 100 GB/month
bandwidth, 10 builds/hour.

### Optional: domain verification

Settings → Pages → **Verify domain** gives you a TXT record to add at Netim
(`_github-pages-challenge-ebright09`). It stops anyone else from ever claiming
`evanbrig.ht` on their own GitHub Pages site. Not required; worth doing.

---

# Notes on `/carla/`

- **Deliberately unindexed.** The page carries
  `<meta name="robots" content="noindex, nofollow">` and `robots.txt` disallows
  the path. It is unaffiliated demo work on a personal domain and should never
  surface in search as though it were the firm's real site (`minnardlaw.com`).
- **The intake form does not send anything.** Its submit handler only flips the
  UI to a "thank you" state — no email, no backend. Anyone who fills it in
  believes they have contacted a law firm and has not. Wire it to a form service
  (Formspree, Basin) or remove it before showing this to anyone who might use it
  in earnest.
- **Images are hotlinked from the firm's Wix CDN** (`static.wixstatic.com`); the
  press section embeds YouTube and Vimeo. If Wix changes those URLs the images
  vanish. Vendoring them into `carla/assets/` would make the page self-contained.
- **Renders client-side.** `support.js` fetches React 18.3.1 from unpkg at load,
  then builds the DOM. With JS disabled, or unpkg unreachable, the page is blank
  and crawlers see nothing. Fine for noindexed demo work; not fine for a
  production law-firm site.
