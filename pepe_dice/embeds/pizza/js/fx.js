// Visual effects: particle confetti, screen shake, flashes, floating text, title slams.

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.getElementById("fx-canvas");
const g = canvas.getContext("2d");
let particles = [];
let running = false;

function resize() {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
window.addEventListener("resize", resize);
resize();

function loop() {
  g.clearRect(0, 0, window.innerWidth, window.innerHeight);
  particles = particles.filter((p) => p.life > 0 && p.y < window.innerHeight + 60);
  for (const p of particles) {
    p.vy += p.gravity;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.spin;
    p.life -= 1;
    g.save();
    g.globalAlpha = Math.min(1, p.life / 30);
    g.translate(p.x, p.y);
    g.rotate(p.rot);
    if (p.emoji) {
      g.font = `${p.size}px serif`;
      g.fillText(p.emoji, -p.size / 2, p.size / 2);
    } else {
      g.fillStyle = p.color;
      g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    }
    g.restore();
  }
  if (particles.length) requestAnimationFrame(loop);
  else running = false;
}

function spawn(list) {
  particles.push(...list);
  if (!running) {
    running = true;
    requestAnimationFrame(loop);
  }
}

const COLORS = ["#e63b2e", "#ffd23f", "#4cc96b", "#fff4dc", "#c98a4b"];
const FOOD = ["🍕", "🍕", "🧀", "🍅", "🌿", "🪙"];

export const fx = {
  confetti(x = window.innerWidth / 2, y = window.innerHeight / 3, count = 90) {
    if (reduced) return;
    spawn(Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      const useEmoji = Math.random() < 0.35;
      return {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 6,
        gravity: 0.25,
        rot: Math.random() * 6,
        spin: (Math.random() - 0.5) * 0.4,
        size: useEmoji ? 18 + Math.random() * 14 : 8 + Math.random() * 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        emoji: useEmoji ? FOOD[Math.floor(Math.random() * FOOD.length)] : null,
        life: 140 + Math.random() * 60,
      };
    }));
  },

  pizzaRain(count = 60, emoji = null) {
    if (reduced) return;
    spawn(Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: -40 - Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 2 + Math.random() * 3,
      gravity: 0.05,
      rot: 0,
      spin: (Math.random() - 0.5) * 0.1,
      size: 22 + Math.random() * 20,
      emoji: emoji || FOOD[Math.floor(Math.random() * FOOD.length)],
      life: 400,
    })));
  },

  shake(el = document.body) {
    el.classList.remove("shake");
    void el.offsetWidth; // restart the animation
    el.classList.add("shake");
  },

  flash(color = "#e63b2e") {
    const div = document.createElement("div");
    div.className = "flash";
    div.style.background = color;
    document.body.append(div);
    setTimeout(() => div.remove(), 400);
  },

  floatText(text, x, y, color) {
    const div = document.createElement("div");
    div.className = "float-text";
    div.textContent = text;
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;
    if (color) div.style.color = color;
    document.body.append(div);
    setTimeout(() => div.remove(), 1300);
  },

  slam(text) {
    const div = document.createElement("div");
    div.className = "slam";
    div.textContent = text;
    document.body.append(div);
    setTimeout(() => div.remove(), 1700);
  },
};
