# evanbrig.ht

Holding page for `www.evanbrig.ht`, served by **GitHub Pages** (free) on a
domain registered at Netim.

```
.
├── index.html    "please hold…" holding page
├── 404.html      not-found page (Pages serves this site-wide)
├── CNAME         custom domain — must contain exactly: www.evanbrig.ht
├── .nojekyll     skips Jekyll processing
└── robots.txt
```

No build step. What is committed is what is served.

## Deploying

Push to `main`. Pages redeploys within a minute or so.

```bash
git add -A && git commit -m "message" && git push
```

Preview locally:

```bash
python3 -m http.server 4173 --directory .
```

## DNS (Netim)

`evanbrig.ht` uses Netim's nameservers (`ns1/ns2/ns3.netim.net`). The zone
holds:

| Type | Name | Value |
|---|---|---|
| CNAME | `www` | `ebright09.github.io.` |
| A | *(apex)* | `185.199.108.153` / `.109.153` / `.110.153` / `.111.153` |
| AAAA | *(apex)* | `2606:50c0:8000::153` / `:8001::153` / `:8002::153` / `:8003::153` |

The `www` CNAME serves the site. The apex records exist so bare
`evanbrig.ht` resolves; GitHub then redirects it to `www`, because `CNAME`
in this repo names the `www` host.

Netim also holds `MX` records for `mx1`/`mx2.netim.net` and an SPF `TXT`.
Those are Netim's mail service for the domain — leave them alone.

Verify:

```bash
dig +short @1.1.1.1 www.evanbrig.ht
```

## Notes

- **Keep `.nojekyll`.** Nothing here currently depends on it, but GitHub Pages
  runs Jekyll without it, and Jekyll consumes `{{ … }}` as Liquid syntax — a
  trap worth staying clear of if templated markup is ever added.
- **Auto-renewal is off** at Netim and the domain expires **2027-08-10**.
  Left off, the site goes dark on that date.
- The Minnard Law redesign that used to live at `/carla/` moved to its own
  repo and now serves the firm's live site at
  [minnardlaw.com](https://www.minnardlaw.com/). See `ebright09/minnardlaw-site`.
