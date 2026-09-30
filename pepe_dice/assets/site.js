// From Zero to AI Evan: renders the six class sections, lazy-loads embeds when a section
// opens, and pulls each README live from its public repo.
(() => {
  "use strict";

  const GH = "ebright09";
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };

  // ---------- shared embed pieces ----------

  function frame({ url, shownUrl, height, cover, openUrl }) {
    const el = h(`
      <div class="frame">
        <div class="frame-bar">
          <span class="dots"><i></i><i></i><i></i></span>
          <span class="url">${esc(shownUrl || url)}</span>
          <a href="${esc(openUrl || url)}" target="_blank" rel="noopener">Open in new tab ↗</a>
        </div>
        <div class="lazy-cover">${cover}</div>
      </div>`);
    el.load = () => {
      if (el.dataset.loaded) return;
      el.dataset.loaded = "1";
      const f = document.createElement("iframe");
      f.src = url;
      f.style.height = height + "px";
      f.title = shownUrl || url;
      f.addEventListener("load", () => $(".lazy-cover", el)?.remove());
      el.appendChild(f);
    };
    el.style.minHeight = height + 41 + "px";
    return el;
  }

  function tabs(defs, { cls = "" } = {}) {
    const wrap = h(`<div><div class="tabs ${cls}" role="tablist"></div></div>`);
    const bar = wrap.firstElementChild;
    defs.forEach((d, i) => {
      const b = h(`<button class="tab" role="tab" type="button" aria-selected="${i === 0}">${d.label}</button>`);
      const panel = h(`<div class="tabpanel" role="tabpanel"></div>`);
      panel.append(d.content);
      panel.hidden = i !== 0;
      b.addEventListener("click", () => {
        bar.querySelectorAll(".tab").forEach((x) => x.setAttribute("aria-selected", "false"));
        wrap.querySelectorAll(".tabpanel").forEach((p) => (p.hidden = true));
        b.setAttribute("aria-selected", "true");
        panel.hidden = false;
        d.onShow?.();
      });
      bar.append(b);
      wrap.append(panel);
    });
    wrap.showFirst = () => defs[0].onShow?.();
    return wrap;
  }

  const stats = (items) =>
    h(`<div class="stats">${items.map(([b, s]) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`).join("")}</div>`);

  // ---------- Class 3: eval curve ----------

  const EVAL = [[0, 232], [25, 344], [50, 440], [75, 260], [100, 426], [125, 578], [150, 674], [175, 802], [200, 902], [225, 724], [250, 1088], [275, 1318], [300, 568], [325, 490], [350, 872], [375, 700], [400, 434], [425, 1270], [450, 962], [475, 1262], [500, 1284]];

  function evalChart() {
    const W = 640, H = 220, L = 44, R = 12, T = 14, B = 30;
    const x = (e) => L + (e / 500) * (W - L - R);
    const y = (v) => T + (1 - v / 1400) * (H - T - B);
    const pts = EVAL.map(([e, v]) => `${x(e).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const grid = [0, 350, 700, 1050, 1400]
      .map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${v}</text>`)
      .join("");
    const xt = [0, 100, 200, 300, 400, 500].map((e) => `<text x="${x(e)}" y="${H - 10}" text-anchor="middle" font-size="11" fill="var(--muted)">${e}</text>`).join("");
    const dots = EVAL.map(([e, v]) => `<circle cx="${x(e)}" cy="${y(v)}" r="3.5" fill="var(--c3)"><title>episode ${e}: mean ${v}</title></circle>`).join("");
    return h(`
      <div class="chart-wrap">
        <h4>Phase two: evaluation score every 25 episodes</h4>
        <p>Mean of 5 fixed-seed games (ε = 0.05). 232 untrained → 1,284 at episode 500, with a dip to 434 at episode 400. Every point is from <code>results/phase_two/evaluation.json</code>.</p>
        <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Line chart of evaluation mean score rising from 232 to 1284 over 500 episodes">
          ${grid}${xt}
          <polyline points="${pts}" fill="none" stroke="var(--c3)" stroke-width="2.5" stroke-linejoin="round"/>
          ${dots}
          <text x="${x(400)}" y="${y(434) + 20}" text-anchor="middle" font-size="11" fill="var(--ink-soft)">the slump 😬</text>
        </svg>
      </div>`);
  }

  // ---------- Class 4: TrashGPT replay (recorded local outputs) ----------

  const TRASH_TURNS = [
    ["the pen is inside the jar . the jar contains the", "pen ."],
    ["the clock is above the sofa . the sofa is", "below the clock ."],
    ["mia did not buy juice . she bought", "cake . mia bought cake ."],
    ["a trout is a", "fish . a pine is a tree ."],
    ["the cup is not full . it is", "a goose ."],
    ["the opposite of hot is", "sharp ."],
    ["the opposite of big is", "big ."],
    ["can you help me with my homework ?", "is above the ."],
  ];

  function trashChat() {
    const el = h(`<div class="chat" aria-live="polite"></div>`);
    el.append(h(`<div class="bubble note">Recorded from the expanded-corpus model (3,000 steps, temperature 0.8, fresh context per prompt). These are real outputs, and yes, the goose is real.</div>`));
    let i = 0, timer;
    const next = () => {
      if (i >= TRASH_TURNS.length) return;
      const [p, r] = TRASH_TURNS[i++];
      el.append(h(`<div class="bubble user">${esc(p)}</div>`));
      timer = setTimeout(() => {
        el.append(h(`<div class="bubble bot">${esc(r)}<span class="meta">nanoGPT · word tokens · runs on 127.0.0.1</span></div>`));
        el.scrollTop = el.scrollHeight;
        timer = setTimeout(next, 900);
      }, 700);
      el.scrollTop = el.scrollHeight;
    };
    el.start = () => { if (!el.dataset.started) { el.dataset.started = "1"; next(); } };
    return el;
  }

  // ---------- Class 5: terminal replay of the offline demo ----------

  const TERM_TABS = [
    ["📡 Wi-Fi off", (t) => t.startsWith("Date") || t.startsWith("Network check")],
    ["🔎 search", (t) => t.startsWith("Search")],
    ["T1", "T1"], ["T2", "T2"], ["T3", "T3"], ["T4 (no evidence)", "T4"],
    ["💬 chat", (t) => t.startsWith("Chat")],
    ["📥 ingest", (t) => t.startsWith("Ingest")],
    ["✅ check", (t) => t.startsWith("Vault check")],
  ];

  function parseTranscript(txt) {
    const sections = [];
    let cur = null;
    for (const line of txt.split("\n")) {
      const m = line.match(/^############ (.*)$/);
      if (m) { cur = { title: m[1], lines: [line] }; sections.push(cur); } else if (cur) cur.lines.push(line);
    }
    const asks = {};
    const ask = sections.find((s) => s.title.startsWith("Ask-mode"));
    if (ask) {
      let t = null;
      for (const line of ask.lines) {
        const m = line.match(/^================ (T\d)/);
        if (m) { t = m[1]; asks[t] = []; }
        if (t) asks[t].push(line);
      }
    }
    return TERM_TABS.map(([label, match]) => {
      const lines = typeof match === "string" ? asks[match] || [] : sections.filter((s) => match(s.title)).flatMap((s) => s.lines.concat([""]));
      return { label, lines };
    });
  }

  function colorLine(line) {
    const e = esc(line);
    if (/^\$ /.test(line)) return `<span class="cmd">${e}</span>`;
    if (/^(#{12}|={16})/.test(line)) return `<span class="hdr">${e}</span>`;
    if (/^(──|gemma-|Saved |Evidence card)/.test(line.trim())) return `<span class="dim">${e}</span>`;
    return e;
  }

  function terminal() {
    const el = h(`
      <div class="term">
        <div class="term-bar"><span class="speed">loading transcript…</span></div>
        <pre tabindex="0" aria-label="Terminal replay"></pre>
      </div>`);
    const bar = $(".term-bar", el), pre = $("pre", el), speed = $(".speed", el);
    let data = null, timer = null;
    const play = (i) => {
      clearTimeout(timer);
      bar.querySelectorAll(".tab").forEach((b, j) => b.setAttribute("aria-selected", String(i === j)));
      const lines = data[i].lines;
      pre.innerHTML = "";
      let n = 0;
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const step = () => {
        const chunk = reduce ? lines.length : lines[n]?.startsWith("$ ") ? 1 : 3;
        const html = lines.slice(n, n + chunk).map(colorLine).join("\n");
        pre.querySelector(".cursor")?.remove();
        pre.insertAdjacentHTML("beforeend", (n ? "\n" : "") + html + '<span class="cursor"></span>');
        n += chunk;
        pre.scrollTop = pre.scrollHeight;
        if (n < lines.length) timer = setTimeout(step, lines[n - 1]?.startsWith("$ ") ? 450 : 40);
      };
      step();
    };
    el.start = async () => {
      if (data) return;
      try {
        const txt = await (await fetch("media/wiki-offline-transcript.txt")).text();
        data = parseTranscript(txt);
      } catch (e) {
        speed.textContent = "couldn't load the transcript";
        return;
      }
      speed.textContent = "real output · Wi-Fi off · 29 Sep 2026";
      data.forEach((d, i) => {
        const b = h(`<button class="tab" type="button">${esc(d.label)}</button>`);
        b.addEventListener("click", () => play(i));
        bar.insertBefore(b, speed);
      });
      const skip = h(`<button class="tab" type="button" title="Show the whole section">⏭ skip</button>`);
      skip.addEventListener("click", () => {
        clearTimeout(timer);
        const i = [...bar.querySelectorAll(".tab")].findIndex((b) => b.getAttribute("aria-selected") === "true");
        if (i >= 0) pre.innerHTML = data[i].lines.map(colorLine).join("\n");
      });
      bar.insertBefore(skip, speed);
      play(0);
    };
    return el;
  }

  // ---------- the six classes ----------

  const CLASSES = [
    {
      n: 1, id: "class-1", emoji: "🍕", accent: "var(--c1)",
      title: "Code & Programming Foundations",
      built: "Pepe's Pizza Discount Dungeon: a tested FastAPI rules engine wearing an arcade costume",
      repo: "pepe-fundamentals-assignment-1",
      intro: `The assignment was a tested Python business-rule program. I built the rules engine (tiers, the 30-day overdue rule, the $25k cap, manager exceptions), wrapped it in feature-sliced FastAPI, and then, because a unit test alone felt lonely, made it an 8-level arcade where you guess the right discount. <span class="roast">Pepe yells at you when you forget the cap. It's educational.</span>`,
      embed() {
        const f = frame({
          url: "embeds/pizza/index.html",
          shownUrl: "localhost:8000 → running in your browser",
          height: 760,
          cover: `<div><div class="big">🍕</div>Warming up the oven…</div>`,
        });
        const note = h(`<p class="k-intro" style="font-size:14px;margin:10px 0 0">🔌 On a laptop this talks to FastAPI. Here, <code>mock-api.js</code> answers the same six <code>/api/*</code> routes in the browser, using a JS port of <code>rules.py</code> that I checked against the Python for every invoice in the game.</p>`);
        const wrap = h(`<div></div>`);
        wrap.append(f, note);
        wrap.load = f.load;
        return wrap;
      },
    },
    {
      n: 2, id: "class-2", emoji: "🔐", accent: "var(--c2)",
      title: "Software Systems",
      built: "A deliberately psychedelic networking tracker: React SPA + Express API + Neon Postgres with row-level security, live on Vercel",
      repo: "Pepe-Fundamentals-Assignment-2",
      intro: `Frontend, backend, database, auth, secrets, deploy: the whole stack, twice over (two Vercel projects). Privacy isn't a UI promise here, it's enforced by Postgres row-level security, so even a valid token can only ever reach its owner's rows. <span class="roast">Signed-out visitors get a login screen and nothing else. That's the feature, not a bug.</span>`,
      embed() {
        const live = frame({
          url: "https://berkeley-networking-tracker.vercel.app",
          height: 720,
          cover: `<div><div class="big">🌀</div>Connecting to the live app on Vercel…</div>`,
        });
        const shots = [
          ["02-contacts", "The contact list: sortable, with priority badges"],
          ["05-two-accounts", "Account B sees only B's contacts. Row-level security in action."],
          ["06-sort-filter", "Sort and filter run in Postgres, not the browser"],
          ["03-add-form", "Adding a contact"],
          ["04-invalid", "Validation errors, checked on the server too"],
          ["14-max-trip", "MAX TRIP mode. It's a feature."],
          ["13-mobile", "Mobile layout"],
        ];
        const tour = h(`<div class="shots">${shots
          .map(([f, c]) => `<figure><a href="media/c2-${f}.jpg" target="_blank" rel="noopener"><img class="shot" loading="lazy" src="media/c2-${f}.jpg" alt="${esc(c)}"></a><figcaption>${esc(c)}</figcaption></figure>`)
          .join("")}</div>`);
        const liveWrap = h(`<div></div>`);
        liveWrap.append(
          h(`<p class="k-intro" style="font-size:14px;margin:0 0 10px">🔑 It opens on a sign-in screen on purpose: every contact belongs to one account, so there's nothing to show a stranger. Sign up with any email to get an empty tracker of your own. Some browsers block sign-in inside an embedded page, so use <b>Open in new tab</b> if it stalls.</p>`),
          live
        );
        const t = tabs([
          { label: "📸 Tour (no sign-up)", content: tour },
          { label: "🟢 Live app", content: liveWrap, onShow: () => live.load() },
        ]);
        return t;
      },
    },
    {
      n: 3, id: "class-3", emoji: "🎤", accent: "var(--c3)",
      title: "Machine Learning Foundations",
      built: "SWIFT-MAN (Taylor's Version): a Deep Q-Network that learned Ms. Pac-Man, then a from-scratch 500-episode phase two",
      repo: "swift-man-dqn-class3",
      intro: `A DQN learns Ms. Pac-Man from pixels. The skin (8-bit Taylor, Swifties, money-bag pellets) is cosmetic only, so the training numbers match the unskinned game. Phase two rebuilt the agent from scratch: resumable, decaying ε, RAM-sized replay, 500 episodes in 47 minutes on an M1. <span class="roast">It had a mid-training slump. Relatable.</span>`,
      embed() {
        const vids = [
          ["c3-before.mp4", "Untrained", "wanders, dies. Phase one baseline mean 492"],
          ["c3-after100.mp4", "After 100 games", "phase one mean 868"],
          ["c3-p2-slump.mp4", "Phase two · ep 400", "the slump: mean 434"],
          ["c3-p2-best.mp4", "Phase two · ep 500", "mean 1,284 (5.5× untrained)"],
        ];
        const wrap = h(`<div></div>`);
        wrap.append(
          stats([["232 → 1,284", "phase-two eval mean, untrained → 500 episodes"], ["322,790", "environment steps"], ["47 min", "on a MacBook M1 (mps)"], ["0.00025", "learning rate (my pick)"]]),
          h(`<div class="video-grid">${vids
            .map(([src, t, c]) => `<figure><video data-src="media/${src}" muted loop playsinline preload="none" aria-label="${esc(t)} gameplay"></video><figcaption><b>${t}</b><br>${c}</figcaption></figure>`)
            .join("")}</div>`),
          evalChart()
        );
        wrap.load = () => wrap.querySelectorAll("video[data-src]").forEach((v) => { v.src = v.dataset.src; v.removeAttribute("data-src"); v.play().catch(() => {}); });
        return wrap;
      },
    },
    {
      n: 4, id: "class-4", emoji: "🦝", accent: "var(--c4)",
      title: "Deep Learning & Transformers",
      built: "A word-token nanoGPT trained from scratch, 48 fixed language evals, an embedding explorer, and TrashGPT, a raccoon-run local chat lab",
      repo: "custom-llm-class4",
      intro: `Trained a tiny nanoGPT twice, on the starter corpus and on an expanded one, and graded both with 48 fixed evals across 11 categories. The expanded model went from 9 to 28 correct. Then I built an explorer for its actual learned embeddings and a local chat UI with a raccoon mascot. <span class="roast">It thinks a half-empty cup is "a goose." We're working on it.</span>`,
      embed() {
        const viewer = frame({
          url: "embeds/embedding-viewer.html",
          shownUrl: "embedding-viewer.html · the model's real token embeddings, in 3D",
          height: 640,
          cover: `<div><div class="big">🌌</div>Projecting embeddings…</div>`,
        });
        const chat = trashChat();
        const shots = h(`<div class="shots">
            <figure><img class="shot" loading="lazy" src="media/trashgpt-overview.png" alt="TrashGPT learning lab overview"><figcaption>TrashGPT on 127.0.0.1:8765: pick a run, a stage, a prompt.</figcaption></figure>
            <figure><img class="shot" loading="lazy" src="media/goose-interaction.png" alt="The goose interaction"><figcaption>The goose, with model output kept separate from the raccoon's commentary.</figcaption></figure>
          </div>`);
        const t = tabs([
          { label: "🌌 Embedding explorer (live)", content: viewer, onShow: () => viewer.load() },
          { label: "🦝 TrashGPT replay", content: chat, onShow: () => chat.start() },
          { label: "📸 Screenshots", content: shots },
        ]);
        const wrap = h(`<div></div>`);
        wrap.append(stats([["9 → 28", "evals correct, untrained → trained (expanded corpus)"], ["80%", "accuracy on the 35 scorable evals"], ["3,000", "training steps"], ["48", "fixed language evals"]]), t);
        wrap.load = () => t.showFirst();
        return wrap;
      },
    },
    {
      n: 5, id: "class-5", emoji: "📚", accent: "var(--c5)",
      title: "LLM Behavior & Retrieval",
      built: "A personal wiki CLI: local Gemma 4 E2B + hybrid RAG over my own coursework, with cited answers, working with the Wi-Fi off",
      repo: "personal-wiki-class5",
      intro: `Gemma reads my raw project files, drafts linked Obsidian notes, and answers questions with [n] citations, or says "Insufficient evidence" when it should. Search is hybrid BM25 + EmbeddingGemma. Below is the real transcript of the offline demo, replayed. <span class="roast">The chat persona is a drill sergeant named Sarge, who is disappointed in you personally.</span>`,
      embed() {
        const term = terminal();
        const wrap = h(`<div></div>`);
        wrap.append(stats([["Wi-Fi off", "whole demo offline; the curl to huggingface.co fails first"], ["109", "passages indexed"], ["0.03 s", "retrieval time"], ["2 · 1 · 1", "ask tests T1–T4: fully cited · partly cited · correct refusal"]]), term);
        wrap.load = () => term.start();
        return wrap;
      },
    },
    {
      n: 6, id: "class-6", emoji: "🎧", accent: "var(--c6)",
      title: "Production LLMs & Single Agents",
      built: "Spotify Insight Pipeline, part 1: a validated single-agent review enricher with evals, running on local Gemma for $0",
      repo: null,
      intro: `The capstone checkpoint: label 660k Spotify reviews by topic, intent, severity, sentiment and evidence quote. The model only proposes labels. Code owns every decision (validation, one retry, quarantine, stop conditions, spend cap). First 500 reviews ran fully local. <span class="roast">Gemma thinks "charge me for breathing also" is a severity-5 emergency. Class 7 adds a verifier.</span>`,
      embed() {
        const wrap = h(`<div></div>`);
        wrap.append(
          stats([["500", "reviews enriched (checkpoint set)"], ["492", "completed (471 first try or retry, 21 cache reuse)"], ["8", "quarantined (1.6%), each inspected"], ["18.1 min", "wall clock on the M1"], ["$0.00", "API spend: local model"]]),
          h(`<div class="table-wrap" style="margin:14px 0 0"><table class="plain-table">
              <thead><tr><th>Golden-50 agreement (provisional)</th><th>exact</th><th>within accepted set</th></tr></thead>
              <tbody>
                <tr><td>topic</td><td>0.78</td><td>0.86</td></tr>
                <tr><td>intent</td><td>0.86</td><td>0.90</td></tr>
                <tr><td>severity</td><td>0.86 (MAE 0.14)</td><td>0.94</td></tr>
                <tr><td>evidence quote is an exact substring</td><td>1.00</td><td></td></tr>
              </tbody></table></div>`),
          h(`<p class="k-intro" style="font-size:14px">Numbers are from my <code>CHECKPOINT_REPORT.md</code>. The agreement rows stay provisional until I finish hand-checking the golden labels.</p>`)
        );
        return wrap;
      },
      pending: `<div class="pending-card"><span class="badge">🔒 repo drops before 10/13</span><p><b>The repo isn't public yet.</b> Part 2 (Class 7) still needs the verifier, grouping, ranking and the full-corpus run, and the golden labels need my review first. The README will show up here when it ships.</p></div>`,
    },
  ];

  // ---------- README loader ----------

  function rewriteLinks(root, repo) {
    const raw = `https://raw.githubusercontent.com/${GH}/${repo}/HEAD/`;
    const blob = `https://github.com/${GH}/${repo}/blob/HEAD/`;
    const isRel = (u) => u && !/^([a-z]+:|\/\/|#|mailto:)/i.test(u);
    root.querySelectorAll("img[src]").forEach((img) => {
      const s = img.getAttribute("src");
      if (isRel(s)) img.src = raw + s.replace(/^\.?\//, "");
      img.loading = "lazy";
    });
    root.querySelectorAll("a[href]").forEach((a) => {
      const u = a.getAttribute("href");
      if (u.startsWith("#")) a.href = `https://github.com/${GH}/${repo}${u}`;
      else if (isRel(u)) a.href = blob + u.replace(/^\.?\//, "");
      a.target = "_blank";
      a.rel = "noopener";
    });
  }

  async function loadReadme(panel, repo) {
    const body = $(".readme-body", panel);
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${GH}/${repo}/HEAD/README.md`);
      if (!res.ok) throw new Error(res.status);
      const md = await res.text();
      body.innerHTML = DOMPurify.sanitize(marked.parse(md, { gfm: true }));
      rewriteLinks(body, repo);
    } catch (e) {
      body.innerHTML = `<p class="readme-loading">Couldn't fetch the README just now. <a href="https://github.com/${GH}/${repo}#readme" target="_blank" rel="noopener">Read it on GitHub ↗</a></p>`;
    }
  }

  // ---------- render ----------

  const chev = `<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`;

  function renderClass(c) {
    const repoUrl = c.repo && `https://github.com/${GH}/${c.repo}`;
    const d = h(`
      <details class="klass" id="${c.id}" style="--accent:${c.accent}">
        <summary>
          <span class="k-emoji" aria-hidden="true">${c.emoji}</span>
          <span class="k-head">
            <span class="k-kicker">Class ${c.n}</span>
            <h3>${esc(c.title)}</h3>
            <span class="k-built">${esc(c.built)}</span>
          </span>
          <span class="k-actions">
            ${repoUrl ? `<a class="repo-link" href="${repoUrl}" target="_blank" rel="noopener">GitHub repo here ↗</a>` : `<span class="repo-link pending">Repo: coming soon</span>`}
            ${chev}
          </span>
        </summary>
        <div class="k-body">
          <p class="k-intro">${c.intro}</p>
          <div class="step-label">① What I built</div>
          <div class="embed-slot"></div>
          <div class="step-label">② ${repoUrl ? "README, live from GitHub" : "README"}</div>
          <div class="readme-slot"></div>
        </div>
      </details>`);
    $(".repo-link", d).addEventListener("click", (e) => e.stopPropagation());

    const embed = c.embed();
    $(".embed-slot", d).append(embed);

    let readme = null;
    if (c.repo) {
      readme = h(`
        <div class="readme">
          <div class="readme-head"><span>${GH}/${c.repo} · README.md</span><button class="btn" type="button">Expand ↕</button></div>
          <div class="readme-body"><p class="readme-loading">Fetching README…</p></div>
        </div>`);
      const btn = $(".readme-head .btn", readme);
      btn.addEventListener("click", () => {
        const on = readme.classList.toggle("expanded");
        btn.textContent = on ? "Collapse ↕" : "Expand ↕";
      });
      $(".readme-slot", d).append(readme);
    } else {
      $(".readme-slot", d).append(h(c.pending));
    }

    d.addEventListener("toggle", () => {
      if (!d.open || d.dataset.loaded) return;
      d.dataset.loaded = "1";
      embed.load?.();
      if (readme) loadReadme(readme, c.repo);
    });
    return d;
  }

  const list = $("#classes");
  CLASSES.forEach((c) => list.append(renderClass(c)));

  $("#arcRows").innerHTML =
    CLASSES.map((c) => `<tr data-target="${c.id}"><td class="num">${c.n}</td><td>${c.emoji} ${esc(c.title)}</td><td>${esc(c.built)}</td></tr>`).join("") +
    `<tr class="upcoming"><td class="num">7</td><td>🧩 Agent Pipelines &amp; Software Architecture</td><td>Insight Pipeline part 2: the full 10,000-review analysis<small>unlocks after Class 7 · Oct 6</small></td></tr>`;

  $("#navClasses").innerHTML = CLASSES.map((c) => `<a href="#${c.id}" data-target="${c.id}" title="Class ${c.n}: ${esc(c.title)}">${c.emoji} ${c.n}</a>`).join("");

  const openAndGo = (id) => {
    const d = document.getElementById(id);
    d.open = true;
    d.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", "#" + id);
  };
  document.querySelectorAll("[data-target]").forEach((el) =>
    el.addEventListener("click", (e) => { e.preventDefault(); openAndGo(el.dataset.target); })
  );

  const allDetails = () => [...document.querySelectorAll("details.klass")];
  const syncToggleLabels = () => {
    const allOpen = allDetails().every((d) => d.open);
    $("#toggleAll").textContent = allOpen ? "Collapse all" : "Expand all";
    $("#toggleAll2").textContent = allOpen ? "⬆️ Collapse all" : "⬇️ Expand all";
  };
  const toggleAll = () => {
    const open = !allDetails().every((d) => d.open);
    allDetails().forEach((d) => (d.open = open));
    syncToggleLabels();
  };
  $("#toggleAll").addEventListener("click", toggleAll);
  $("#toggleAll2").addEventListener("click", toggleAll);
  allDetails().forEach((d) => d.addEventListener("toggle", syncToggleLabels));

  $("#themeBtn").addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("zte-theme", root.dataset.theme); } catch (e) {}
  });

  // Deep link like #class-3 opens that section.
  if (location.hash && document.getElementById(location.hash.slice(1))?.matches("details")) {
    document.getElementById(location.hash.slice(1)).open = true;
  }
})();
