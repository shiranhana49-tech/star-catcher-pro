const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const bestEl = document.querySelector("#best");
const livesEl = document.querySelector("#lives");
const startButton = document.querySelector("#startButton");
const gameHelp = document.querySelector("#gameHelp");
const gameCards = [...document.querySelectorAll(".game-card")];

const games = {
  stars: {
    title: "Star Catcher Pro",
    help: "Move with arrow keys or A/D. On touch screens, drag the catcher.",
    bestKey: "shiranh-arcade-stars-best",
    good: "star",
    bad: "rock",
    playerColor: "#57d7ff",
    goodColor: "#ffcf4a",
    badColor: "#a0a8b8",
    spawnBase: 900,
    speedBase: 145,
  },
  gems: {
    title: "Neon Gem Rush",
    help: "Move with arrow keys or A/D. Catch cyan gems and avoid red sparks.",
    bestKey: "shiranh-arcade-gems-best",
    good: "gem",
    bad: "spark",
    playerColor: "#8effd2",
    goodColor: "#4bf3ff",
    badColor: "#ff5a7a",
    spawnBase: 760,
    speedBase: 175,
  },
  targets: {
    title: "Pulse Target Pro",
    help: "Click or tap each glowing target before the pulse disappears.",
    bestKey: "shiranh-arcade-targets-best",
  },
};

const state = {
  mode: "stars",
  running: false,
  score: 0,
  best: 0,
  lives: 3,
  keys: new Set(),
  drops: [],
  target: null,
  lastSpawn: 0,
  lastFrame: 0,
  player: {
    x: canvas.width / 2,
    y: canvas.height - 54,
    width: 92,
    height: 24,
    speed: 520,
  },
};

function activeGame() {
  return games[state.mode];
}

function loadBest() {
  state.best = Number(localStorage.getItem(activeGame().bestKey) || 0);
  bestEl.textContent = state.best;
}

function selectGame(mode) {
  state.mode = mode;
  state.running = false;
  state.score = 0;
  state.lives = 3;
  state.drops = [];
  state.target = null;
  startButton.textContent = "Start Game";
  gameHelp.textContent = activeGame().help;
  gameCards.forEach((card) => card.classList.toggle("active", card.dataset.game === mode));
  loadBest();
  syncHud();
  render();
}

function resetGame() {
  state.running = true;
  state.score = 0;
  state.lives = 3;
  state.drops = [];
  state.target = null;
  state.lastSpawn = 0;
  state.lastFrame = performance.now();
  state.player.x = canvas.width / 2;
  startButton.textContent = "Restart";
  syncHud();
  if (state.mode === "targets") spawnTarget(performance.now());
  requestAnimationFrame(loop);
}

function syncHud() {
  scoreEl.textContent = state.score;
  bestEl.textContent = state.best;
  livesEl.textContent = state.lives;
}

function saveBest() {
  if (state.score <= state.best) return;
  state.best = state.score;
  localStorage.setItem(activeGame().bestKey, String(state.best));
}

function spawnDrop(now) {
  const game = activeGame();
  const spawnRate = Math.max(320, game.spawnBase - state.score * 10);
  if (now - state.lastSpawn < spawnRate) return;

  const isBad = Math.random() < Math.min(0.36, 0.14 + state.score / 260);
  state.drops.push({
    x: 30 + Math.random() * (canvas.width - 60),
    y: -30,
    radius: isBad ? 18 : 15,
    speed: game.speedBase + Math.random() * 95 + state.score * 2.5,
    kind: isBad ? game.bad : game.good,
    spin: Math.random() * Math.PI,
  });
  state.lastSpawn = now;
}

function spawnTarget(now) {
  const radius = Math.max(22, 42 - state.score * 0.35);
  state.target = {
    x: 70 + Math.random() * (canvas.width - 140),
    y: 82 + Math.random() * (canvas.height - 165),
    radius,
    born: now,
    ttl: Math.max(850, 1750 - state.score * 18),
  };
}

function movePlayer(delta) {
  let direction = 0;
  if (state.keys.has("ArrowLeft") || state.keys.has("a")) direction -= 1;
  if (state.keys.has("ArrowRight") || state.keys.has("d")) direction += 1;

  state.player.x += direction * state.player.speed * delta;
  const half = state.player.width / 2;
  state.player.x = Math.max(half, Math.min(canvas.width - half, state.player.x));
}

function updateDrops(delta) {
  const game = activeGame();
  const catcher = {
    left: state.player.x - state.player.width / 2,
    right: state.player.x + state.player.width / 2,
    top: state.player.y - state.player.height / 2,
    bottom: state.player.y + state.player.height / 2,
  };

  state.drops = state.drops.filter((drop) => {
    drop.y += drop.speed * delta;
    drop.spin += delta * 4;

    const caught =
      drop.x + drop.radius > catcher.left &&
      drop.x - drop.radius < catcher.right &&
      drop.y + drop.radius > catcher.top &&
      drop.y - drop.radius < catcher.bottom;

    if (caught && drop.kind === game.good) {
      state.score += 1;
      return false;
    }

    if (caught && drop.kind === game.bad) {
      state.lives -= 1;
      return false;
    }

    if (drop.y - drop.radius > canvas.height) {
      if (drop.kind === game.good) state.lives -= 1;
      return false;
    }

    return true;
  });
}

function updateTargetGame(now) {
  if (!state.target) spawnTarget(now);
  if (state.target && now - state.target.born > state.target.ttl) {
    state.lives -= 1;
    spawnTarget(now);
  }
}

function updateGame(delta, now) {
  if (state.mode === "targets") {
    updateTargetGame(now);
  } else {
    spawnDrop(now);
    movePlayer(delta);
    updateDrops(delta);
  }

  saveBest();
  if (state.lives <= 0) {
    state.running = false;
    startButton.textContent = "Play Again";
  }
  syncHud();
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#071426");
  gradient.addColorStop(1, "#030914");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  for (let i = 0; i < 70; i += 1) {
    const x = (i * 137) % canvas.width;
    const y = (i * 89) % canvas.height;
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255, 207, 74, 0.22)";
  ctx.font = "800 18px system-ui, sans-serif";
  ctx.fillText("SHIRANH TM", canvas.width - 24, 34);
  ctx.fillStyle = "rgba(220, 232, 248, 0.32)";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText("Developed by shiranh", canvas.width - 24, 53);
}

function drawPlayer() {
  const { x, y, width, height } = state.player;
  ctx.fillStyle = activeGame().playerColor;
  ctx.beginPath();
  ctx.roundRect(x - width / 2, y - height / 2, width, height, 12);
  ctx.fill();

  ctx.fillStyle = "#d9f7ff";
  ctx.beginPath();
  ctx.arc(x, y - 8, 10, 0, Math.PI * 2);
  ctx.fill();
}

function drawStar(drop) {
  ctx.save();
  ctx.translate(drop.x, drop.y);
  ctx.rotate(drop.spin);
  ctx.fillStyle = activeGame().goodColor;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? drop.radius : drop.radius * 0.45;
    const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGem(drop) {
  ctx.save();
  ctx.translate(drop.x, drop.y);
  ctx.rotate(drop.spin);
  ctx.fillStyle = activeGame().goodColor;
  ctx.beginPath();
  ctx.moveTo(0, -drop.radius);
  ctx.lineTo(drop.radius, 0);
  ctx.lineTo(0, drop.radius);
  ctx.lineTo(-drop.radius, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawRock(drop) {
  ctx.save();
  ctx.translate(drop.x, drop.y);
  ctx.rotate(drop.spin * 0.5);
  ctx.fillStyle = drop.kind === "spark" ? activeGame().badColor : "#a0a8b8";
  ctx.beginPath();
  ctx.moveTo(-16, -10);
  ctx.lineTo(2, -18);
  ctx.lineTo(18, -4);
  ctx.lineTo(12, 15);
  ctx.lineTo(-10, 17);
  ctx.lineTo(-20, 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDrops() {
  state.drops.forEach((drop) => {
    if (drop.kind === "star") drawStar(drop);
    else if (drop.kind === "gem") drawGem(drop);
    else drawRock(drop);
  });
}

function drawTarget(now) {
  if (!state.target) return;
  const progress = Math.max(0, 1 - (now - state.target.born) / state.target.ttl);
  const pulse = state.target.radius + (1 - progress) * 28;

  ctx.strokeStyle = `rgba(255, 207, 74, ${0.25 + progress * 0.45})`;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(state.target.x, state.target.y, pulse, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#57d7ff";
  ctx.beginPath();
  ctx.arc(state.target.x, state.target.y, state.target.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(state.target.x, state.target.y, state.target.radius * 0.42, 0, Math.PI * 2);
  ctx.fill();
}

function drawMessage(title, detail) {
  ctx.fillStyle = "rgba(6, 16, 31, 0.74)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.fillStyle = "#f7fbff";
  ctx.font = "700 46px system-ui, sans-serif";
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 10);
  ctx.fillStyle = "#b7c5d8";
  ctx.font = "22px system-ui, sans-serif";
  ctx.fillText(detail, canvas.width / 2, canvas.height / 2 + 34);
}

function render(now = performance.now()) {
  drawBackground();
  if (state.mode === "targets") {
    drawTarget(now);
  } else {
    drawDrops();
    drawPlayer();
  }

  if (!state.running) {
    const title = state.score > 0 ? "Game Over" : activeGame().title;
    const detail = state.score > 0 ? `Final score: ${state.score}` : activeGame().help;
    drawMessage(title, detail);
  }
}

function loop(now) {
  if (!state.running) {
    render(now);
    return;
  }

  const delta = Math.min(0.032, (now - state.lastFrame) / 1000);
  state.lastFrame = now;
  updateGame(delta, now);
  render(now);
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  state.keys.add(event.key);
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.key);
});

canvas.addEventListener("pointermove", (event) => {
  if (!state.running || state.mode === "targets") return;
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  state.player.x = (event.clientX - rect.left) * scale;
});

canvas.addEventListener("pointerdown", (event) => {
  if (!state.running || state.mode !== "targets" || !state.target) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;
  const distance = Math.hypot(x - state.target.x, y - state.target.y);
  if (distance <= state.target.radius) {
    state.score += 1;
    spawnTarget(performance.now());
  }
});

gameCards.forEach((card) => {
  card.addEventListener("click", () => selectGame(card.dataset.game));
});

startButton.addEventListener("click", resetGame);

selectGame("stars");
