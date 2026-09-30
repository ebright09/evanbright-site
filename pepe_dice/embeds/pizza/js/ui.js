// Rendering only: turns game state and API data into DOM. No scoring, no rules.

import { sfx } from "./audio.js";

export const $ = (id) => document.getElementById(id);

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export const fmt = (value) => money.format(Number(value));

// Anything that can contain user-typed text (like "approved by") goes through this before innerHTML.
export const esc = (text) =>
  String(text ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

// --- Pepe, in 16x16 glorious pixels --------------------------------------
const PEPE = [
  "....WWWWWWWW....",
  "...WWWWWWWWWW...",
  "..WWWWWWWWWWWW..",
  "...WWWWWWWWWW...",
  "....GGGGGGGG....",
  "...CCCCCCCCCC...",
  "..CYYYYYYYYYYC..",
  ".CYKKKYYYYKKKYC.",
  ".CYYKYYRRYYKYYC.",
  ".CYRYYYRRYYYRYC.",
  ".CYYMMMMMMMMYYC.",
  ".CYMMYYYYYYMMYC.",
  ".CYYYYKKKKYYYYC.",
  "..CYYRYYYYRYYC..",
  "...CCCCCCCCCC...",
  "................",
];
const PALETTE = { W: "#fff4dc", G: "#9a8f80", C: "#c98a4b", Y: "#ffd23f", K: "#1a0f0a", R: "#e63b2e", M: "#4a2a14" };

export function pepeSVG() {
  let rects = "";
  PEPE.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (PALETTE[ch]) rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${PALETTE[ch]}"/>`;
    });
  });
  return `<svg viewBox="0 0 16 16" width="100%" height="100%" shape-rendering="crispEdges" role="img" aria-label="Pepe, an unimpressed pizza chef">${rects}</svg>`;
}

export function drawPepes() {
  document.querySelectorAll(".pepe, .logo-pepe").forEach((el) => { el.innerHTML = pepeSVG(); });
}

export function setPepeMood(angry) {
  document.querySelectorAll(".pepe").forEach((el) => el.classList.toggle("angry", angry));
}

// --- Screens --------------------------------------------------------------
export function show(screenId) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === screenId));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

let typingToken = 0;
export function typewriter(el, text, speed = 22) {
  const token = ++typingToken;
  el.textContent = "";
  const caret = document.createElement("span");
  caret.className = "caret";
  caret.textContent = "▌";
  el.append(caret);
  return new Promise((resolve) => {
    let i = 0;
    const step = () => {
      if (token !== typingToken) return resolve();
      if (i >= text.length) { caret.remove(); return resolve(); }
      caret.before(text[i]);
      if (i % 3 === 0 && text[i] !== " ") sfx.type();
      i += 1;
      setTimeout(step, speed);
    };
    step();
  });
}

// --- HUD -------------------------------------------------------------------
export function renderHUD(state, maxLives) {
  $("hud-lives").innerHTML = Array.from({ length: maxLives }, (_, i) =>
    `<span class="${i < state.lives ? "" : "lost"}">🍕</span>`).join("");
  $("hud-coins").textContent = `🪙 ${state.coins.toLocaleString()}`;
  const combo = $("hud-combo");
  combo.textContent = `x${state.combo} COMBO`;
  combo.classList.toggle("hot", state.combo >= 3);
}

// --- Map -------------------------------------------------------------------
export function renderMap(levels, save, onPick) {
  const grid = $("map-grid");
  grid.innerHTML = "";
  for (const level of levels) {
    const locked = level.id > save.unlocked;
    const stars = save.stars[level.id] || 0;
    const tile = document.createElement("button");
    tile.className = `level-tile${level.boss ? " boss" : ""}`;
    tile.disabled = locked;
    tile.innerHTML = `
      <span class="num">${level.boss ? "☠" : "🍕"} ${level.id}</span>
      <span class="stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</span>
      <span class="name">${level.name}</span>
      <span class="sub">${level.subtitle}</span>
      ${locked ? '<span class="lock">🔒</span>' : ""}`;
    tile.addEventListener("click", () => { sfx.click(); onPick(level); });
    grid.append(tile);
  }
}

// --- Battle ----------------------------------------------------------------
function stamp(invoice) {
  if (invoice.exception_approved) return `<span class="stamp approved">EXCEPTION APPROVED</span>`;
  if (invoice.days_overdue > 0) return `<span class="stamp late">${invoice.days_overdue} DAYS LATE</span>`;
  return `<span class="stamp ok">PAID ON TIME</span>`;
}

export function renderRound(level, round, onChoice) {
  $("battle-title").textContent = level.name;
  $("battle-sub").textContent = `${level.subtitle} · Invoice ${round.round_index + 1} of ${round.round_count}`;

  const bossBar = $("boss-bar");
  const sprite = $("boss-sprite");
  bossBar.hidden = sprite.hidden = !level.boss;
  if (level.boss) {
    const hp = round.round_count - round.round_index;
    $("boss-name").textContent = `☠ ${round.customer.name.toUpperCase()}`;
    $("boss-hp-text").textContent = `HP ${hp}/${round.round_count}`;
    $("boss-fill").style.width = `${(hp / round.round_count) * 100}%`;
    sprite.textContent = round.customer.emoji;
  }

  const c = round.customer;
  const inv = round.invoice;
  $("invoice").innerHTML = `
    <strong>PEPE'S PIZZA · INVOICE ${inv.id}</strong>
    <div>${stamp(inv)}</div>
    <dl>
      <dt>Customer</dt><dd>${c.emoji} ${c.name}</dd>
      <dt>Tier</dt><dd>${c.tier.toUpperCase()}</dd>
      <dt>Order</dt><dd>${inv.description}</dd>
      <dt>Amount</dt><dd><strong>${fmt(inv.amount)}</strong></dd>
      <dt>Days overdue</dt><dd>${inv.days_overdue}</dd>
      <dt>Exception</dt><dd>${inv.exception_approved ? `Approved by ${inv.approved_by}` : "None"}</dd>
    </dl>
    <p class="muted" style="color:#7a5a40;margin:10px 0 0;font-size:9px">${c.bio}</p>`;

  const choices = $("choices");
  choices.innerHTML = "";
  round.choices.forEach((value, i) => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.innerHTML = `<span class="key">${i + 1}</span>${fmt(value)}`;
    btn.dataset.value = value;
    btn.addEventListener("click", () => onChoice(value, false, btn));
    choices.append(btn);
  });
  $("exact-input").value = "";
}

export function lockAnswers(locked) {
  document.querySelectorAll("#choices .btn, #exact-form button, #exact-input").forEach((el) => { el.disabled = locked; });
}

export function hitBoss(round) {
  const sprite = $("boss-sprite");
  sprite.classList.remove("hit");
  void sprite.offsetWidth;
  sprite.classList.add("hit");
  const hp = round.round_count - round.round_index - 1;
  $("boss-hp-text").textContent = `HP ${hp}/${round.round_count}`;
  $("boss-fill").style.width = `${(hp / round.round_count) * 100}%`;
}

// --- Verdict ---------------------------------------------------------------
export function renderVerdict(verdict, { rage }) {
  const banner = $("verdict-banner");
  banner.className = `verdict-banner ${verdict.correct ? "good" : "bad"}`;
  banner.textContent = verdict.correct
    ? (verdict.boss_defeated ? "BOSS DEFEATED!" : verdict.level_cleared ? "LEVEL CLEAR!" : "CORRECT!")
    : "WRONG!";
  $("audit-title").textContent = verdict.correct ? "THE ENGINE'S RECEIPTS" : "PEPE EXPLAINS YOUR FAILURE";
  $("audit").innerHTML = verdict.result.audit_trail.map((line) => `<li>${esc(line)}</li>`).join("");
  $("verdict-answer").innerHTML = `Correct discount: <strong class="coins">${fmt(verdict.correct_discount)}</strong>` +
    (verdict.coins ? ` · <span class="coins">+${verdict.coins} 🪙</span>` : "");
  setPepeMood(!verdict.correct);
  const quip = rage ? verdict.quip.toUpperCase() : verdict.quip;
  return typewriter($("verdict-speech"), quip);
}

export function setActions(buttons) {
  const box = $("verdict-actions");
  box.innerHTML = "";
  for (const { label, cls = "btn gold", onClick } of buttons) {
    const btn = document.createElement("button");
    btn.className = cls;
    btn.textContent = label;
    btn.addEventListener("click", () => { sfx.click(); onClick(); });
    box.append(btn);
  }
  box.querySelector("button")?.focus();
}
