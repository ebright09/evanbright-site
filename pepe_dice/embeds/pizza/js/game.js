// Game flow: title -> map -> battle -> verdict -> next. Holds the state; delegates drawing to ui.js.

import { api } from "./api.js";
import { isMuted, sfx, toggleMute } from "./audio.js";
import { fx } from "./fx.js";
import { initOffice } from "./office.js";
import * as ui from "./ui.js";

const MAX_LIVES = 3;
const IDLE_MS = 30_000;
const SAVE_KEY = "pepe-save-v1";

const state = {
  lives: MAX_LIVES,
  coins: 0,
  combo: 0,
  rage: false,
  levels: [],
  level: null,
  round: null,
  mistakes: 0,
  allExact: true,
  save: { unlocked: 1, stars: {}, coins: 0 },
};

// --- Save file (per-browser convenience only) ------------------------------
function loadSave() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved) state.save = { ...state.save, ...saved };
  } catch { /* private mode or corrupt save: start fresh */ }
  state.coins = state.save.coins || 0;
}

function persist() {
  state.save.coins = state.coins;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state.save)); } catch { /* ignore */ }
}

const hud = () => ui.renderHUD(state, MAX_LIVES);
const say = (el, text) => ui.typewriter(el, state.rage ? text.toUpperCase() : text);

// --- Map --------------------------------------------------------------------
function openMap() {
  sfx.stopBossMusic();
  ui.setPepeMood(false);
  ui.renderMap(state.levels, state.save, startLevel);
  ui.show("map");
  const next = state.levels.find((l) => l.id === state.save.unlocked);
  say(ui.$("map-speech"), next
    ? `Next up: "${next.name}". Pick a slice. Any slice. Preferably the unlocked one.`
    : "You cleared everything. Replay levels for stars, or go outside. Touch grass. Grass is a topping now.");
}

// --- Battle -----------------------------------------------------------------
async function startLevel(level) {
  state.level = level;
  state.mistakes = 0;
  state.allExact = true;
  if (level.boss) { sfx.startBossMusic(); fx.flash("#b04cff"); fx.shake(); }
  await loadRound(0);
}

async function loadRound(index) {
  try {
    state.round = await api.round(state.level.id, index);
  } catch (err) {
    ui.show("map");
    ui.$("map-speech").textContent = `The oven broke: ${err.message}`;
    return;
  }
  ui.setPepeMood(false);
  ui.renderRound(state.level, state.round, answer);
  ui.lockAnswers(false);
  ui.show("battle");
  resetIdle();
  const intro = index === 0 ? state.level.intro : "Next invoice. Don't get cocky.";
  say(ui.$("battle-speech"), intro);
}

async function answer(guess, exact, button) {
  if (!state.round) return;
  ui.lockAnswers(true);
  let verdict;
  try {
    verdict = await api.attempt(state.level.id, {
      round_index: state.round.round_index,
      guess: String(guess),
      exact,
      combo: state.combo,
    });
  } catch (err) {
    ui.lockAnswers(false);
    say(ui.$("battle-speech"), `${err.message} Try an actual number.`);
    sfx.hit();
    return;
  }

  const rect = (button || ui.$("exact-input")).getBoundingClientRect();
  if (verdict.correct) onCorrect(verdict, exact, rect);
  else onWrong();

  hud();
  persist();
  setTimeout(() => showVerdict(verdict), verdict.correct ? 650 : 900);
}

function onCorrect(verdict, exact, rect) {
  state.combo += 1;
  state.coins += verdict.coins;
  state.allExact = state.allExact && exact;
  sfx.coin();
  if (state.combo >= 2) setTimeout(() => sfx.combo(state.combo), 120);
  fx.floatText(`+${verdict.coins} 🪙`, rect.left + rect.width / 2 - 40, rect.top);
  fx.confetti(rect.left + rect.width / 2, rect.top, verdict.level_cleared ? 140 : 50);
  if (state.level.boss) { ui.hitBoss(state.round); sfx.hit(); }
  if (exact) fx.slam("BIG BRAIN BONUS");
}

function onWrong() {
  state.lives -= 1;
  state.combo = 0;
  state.mistakes += 1;
  sfx.fail();
  fx.flash();
  fx.shake();
}

async function showVerdict(verdict) {
  ui.show("verdict");
  if (verdict.correct && verdict.level_cleared) finishLevel(verdict);

  const speaking = ui.renderVerdict(verdict, { rage: state.rage });
  const isLast = state.level.id === state.levels.length;

  if (!verdict.correct && state.lives <= 0) {
    ui.setActions([{ label: "Accept your fate", cls: "btn", onClick: gameOver }]);
  } else if (!verdict.correct) {
    ui.setActions([
      { label: "Try again", onClick: () => loadRound(state.round.round_index) },
      { label: "Flee to map", cls: "btn alt", onClick: openMap },
    ]);
  } else if (!verdict.level_cleared) {
    ui.setActions([{ label: "Next invoice ▶", onClick: () => loadRound(state.round.round_index + 1) }]);
  } else if (isLast) {
    ui.setActions([{ label: "Claim your glory", onClick: victory }]);
  } else {
    const next = state.levels.find((l) => l.id === state.level.id + 1);
    ui.setActions([
      { label: `Next: ${next.name} ▶`, onClick: () => startLevel(next) },
      { label: "Map", cls: "btn alt", onClick: openMap },
    ]);
  }
  await speaking;
}

function finishLevel(verdict) {
  sfx.stopBossMusic();
  const stars = state.mistakes === 0 ? (state.allExact ? 3 : 2) : 1;
  const id = state.level.id;
  state.save.stars[id] = Math.max(state.save.stars[id] || 0, stars);
  state.save.unlocked = Math.max(state.save.unlocked, id + 1);
  persist();
  setTimeout(() => sfx.fanfare(), 300);
  if (verdict.boss_defeated) {
    fx.slam(id === state.levels.length ? "AUDIT SURVIVED" : "CRITICAL DISCOUNT DENIED");
    fx.pizzaRain(70);
  } else {
    fx.slam(`${"★".repeat(stars)} LEVEL CLEAR`);
  }
}

async function gameOver() {
  sfx.stopBossMusic();
  sfx.gameOver();
  state.lives = MAX_LIVES;
  state.combo = 0;
  state.coins = Math.floor(state.coins / 2);
  persist();
  hud();
  ui.show("gameover");
  const lines = await api.quips("game_over").catch(() => null);
  const line = lines ? lines[Math.floor(Math.random() * lines.length)] : "Out of slices. Dish duty. Forever.";
  say(ui.$("gameover-speech"), line);
}

function victory() {
  ui.show("victory");
  fx.pizzaRain(120);
  fx.confetti(window.innerWidth / 2, window.innerHeight / 2, 200);
  sfx.fanfare();
  ui.$("victory-coins").textContent = `Final hoard: 🪙 ${state.coins.toLocaleString()}`;
  say(ui.$("victory-speech"),
    "You did it. Every rule, every boss, every overdue Mayor. I'm promoting you to Assistant Deputy Discount Wizard. " +
    "There is no raise. The title IS the raise.");
}

// --- Idle nagging -----------------------------------------------------------
let idleTimer = null;
let idleLines = [];
function resetIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (!ui.$("battle").classList.contains("active") || !idleLines.length) return;
    ui.setPepeMood(true);
    say(ui.$("battle-speech"), idleLines[Math.floor(Math.random() * idleLines.length)]);
  }, IDLE_MS);
}

// --- Konami code: Pepe Rage Mode ----------------------------------------------
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
let konamiPos = 0;
function checkKonami(key) {
  konamiPos = key === KONAMI[konamiPos] ? konamiPos + 1 : (key === KONAMI[0] ? 1 : 0);
  if (konamiPos === KONAMI.length) {
    konamiPos = 0;
    state.rage = !state.rage;
    document.body.classList.toggle("rage", state.rage);
    sfx.powerUp();
    fx.flash("#ffd23f");
    fx.slam(state.rage ? "PEPE RAGE MODE" : "pepe calm mode");
    fx.pizzaRain(40, "🌶️");
  }
}

// --- Wiring -------------------------------------------------------------------
function bind() {
  ui.$("btn-start").addEventListener("click", () => { sfx.powerUp(); fx.confetti(); openMap(); });
  ui.$("btn-map").addEventListener("click", () => { sfx.click(); openMap(); });
  const openOffice = () => { sfx.click(); sfx.stopBossMusic(); ui.show("office"); };
  ui.$("btn-office").addEventListener("click", openOffice);
  ui.$("btn-title-office").addEventListener("click", openOffice);
  ui.$("btn-victory-office").addEventListener("click", openOffice);
  ui.$("btn-victory-map").addEventListener("click", openMap);
  ui.$("btn-continue").addEventListener("click", openMap);

  const mute = ui.$("btn-mute");
  mute.textContent = isMuted() ? "🔇" : "🔊";
  mute.addEventListener("click", () => {
    mute.textContent = toggleMute() ? "🔇" : "🔊";
    sfx.click();
  });

  ui.$("btn-reset").addEventListener("click", () => {
    if (!confirm("Wipe all progress and coins? Pepe will pretend he never met you.")) return;
    state.save = { unlocked: 1, stars: {}, coins: 0 };
    state.coins = 0;
    state.combo = 0;
    state.lives = MAX_LIVES;
    persist();
    hud();
    fx.shake();
    sfx.gameOver();
    openMap();
  });

  ui.$("exact-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const value = ui.$("exact-input").value.trim();
    if (value) answer(value, true, null);
  });

  document.addEventListener("keydown", (event) => {
    resetIdle();
    checkKonami(event.key);
    const inBattle = ui.$("battle").classList.contains("active");
    const typing = document.activeElement?.tagName === "INPUT";
    if (inBattle && !typing && /^[1-4]$/.test(event.key)) {
      document.querySelectorAll("#choices .btn")[Number(event.key) - 1]?.click();
    }
  });
  document.addEventListener("pointerdown", resetIdle);
}

async function boot() {
  ui.drawPepes();
  loadSave();
  hud();
  bind();
  try {
    state.levels = await api.levels();
    idleLines = await api.quips("idle");
  } catch (err) {
    ui.$("title").insertAdjacentHTML("beforeend",
      `<p class="error">Can't reach the kitchen (${err.message}). Is the server running?</p>`);
  }
  initOffice();
}

boot();
