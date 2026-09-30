// Chiptune SFX synthesized with WebAudio. No audio files.

let ctx = null;
let master = null;
let muted = readMuted();
let bossTimer = null;

function readMuted() {
  try { return localStorage.getItem("pepe-muted") === "1"; } catch { return false; }
}

function ensure() {
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.18;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq, start, duration, { type = "square", slideTo = null, volume = 1, vibrato = 0 } = {}) {
  if (!ensure()) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  if (vibrato) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 7;
    depth.gain.value = vibrato;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + duration);
  }
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

const notes = (list, type = "square", step = 0.1) =>
  list.forEach((f, i) => f && tone(f, i * step, step * 0.95, { type }));

export const sfx = {
  click: () => tone(660, 0, 0.05, { volume: 0.5 }),
  type: () => tone(1200 + Math.random() * 300, 0, 0.02, { volume: 0.15 }),
  coin: () => { tone(988, 0, 0.08); tone(1319, 0.08, 0.25); },
  combo: (n) => notes([523, 659, 784, 1047].map((f) => f * (1 + Math.min(n, 8) * 0.06)), "square", 0.06),
  fail: () => [392, 370, 349, 311].forEach((f, i) =>
    tone(f, i * 0.28, i === 3 ? 0.9 : 0.26, { type: "sawtooth", vibrato: i === 3 ? 8 : 0, volume: 0.7 })),
  fanfare: () => notes([523, 523, 523, 659, 0, 587, 659, 784, 0, 1047], "square", 0.11),
  ding: () => { tone(1568, 0, 0.9, { type: "triangle" }); tone(2093, 0.02, 0.8, { type: "triangle", volume: 0.5 }); },
  hit: () => tone(200, 0, 0.25, { type: "sawtooth", slideTo: 40 }),
  gameOver: () => notes([392, 330, 262, 196, 0, 131], "triangle", 0.25),
  powerUp: () => tone(220, 0, 0.5, { slideTo: 1760 }),
  startBossMusic() {
    this.stopBossMusic();
    const bass = [110, 110, 131, 110, 147, 110, 131, 104];
    let i = 0;
    const beat = () => {
      tone(bass[i % bass.length], 0, 0.16, { type: "sawtooth", volume: 0.5 });
      if (i % 2 === 0) tone(80, 0, 0.05, { type: "square", slideTo: 40, volume: 0.7 });
      i += 1;
    };
    beat();
    bossTimer = setInterval(beat, 180);
  },
  stopBossMusic() {
    clearInterval(bossTimer);
    bossTimer = null;
  },
};

export function isMuted() { return muted; }

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem("pepe-muted", muted ? "1" : "0"); } catch { /* private mode */ }
  if (master) master.gain.value = muted ? 0 : 0.18;
  return muted;
}
