const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const bestEl = document.querySelector("#best");
const livesEl = document.querySelector("#lives");
const startButton = document.querySelector("#startButton");
const GAME_TITLE = "Star Catcher Pro";

const state = {
  running: false,
  score: 0,
  best: Number(localStorage.getItem("star-catcher-best") || 0),
  lives: 3,
  keys: new Set(),
  drops: [],
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

bestEl.textContent = state.best;

function resetGame() {
  state.running = true;
  state.score = 0;
  state.lives = 3;
  state.drops = [];
  state.lastSpawn = 0;
  state.lastFrame = performance.now();
  state.player.x = canvas.width / 2;
  startButton.textContent = "Restart";
  syncHud();
  requestAnimationFrame(loop);
}

function syncHud() {
  scoreEl.textContent = state.score;
  bestEl.textContent = state.best;
  livesEl.textContent = state.lives;
}

function spawnDrop(now) {
  const spawnRate = Math.max(360, 920 - state.score * 11);
  if (now - state.lastSpawn < spawnRate) return;

  const isRock = Math.random() < Math.min(0.34, 0.14 + state.score / 280);
  state.drops.push({
    x: 30 + Math.random() * (canvas.width - 60),
    y: -30,
    radius: isRock ? 18 : 15,
    speed: 145 + Math.random() * 95 + state.score * 2.5,
    kind: isRock ? "rock" : "star",
    spin: Math.random() * Math.PI,
  });
  state.lastSpawn = now;
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

    if (caught && drop.kind === "star") {
      state.score += 1;
      return false;
    }

    if (caught && drop.kind === "rock") {
      state.lives -= 1;
      return false;
    }

    if (drop.y - drop.radius > canvas.height) {
      if (drop.kind === "star") state.lives -= 1;
      return false;
    }

    return true;
  });

  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem("star-catcher-best", String(state.best));
  }

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
  ctx.fillStyle = "#57d7ff";
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
  ctx.fillStyle = "#ffcf4a";
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

function drawRock(drop) {
  ctx.save();
  ctx.translate(drop.x, drop.y);
  ctx.rotate(drop.spin * 0.5);
  ctx.fillStyle = "#a0a8b8";
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
    else drawRock(drop);
  });
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

function render() {
  drawBackground();
  drawDrops();
  drawPlayer();

  if (!state.running) {
    const title = state.score > 0 ? "Game Over" : GAME_TITLE;
    const detail = state.score > 0 ? `Final score: ${state.score}` : "Catch stars. Dodge rocks.";
    drawMessage(title, detail);
  }
}

function loop(now) {
  if (!state.running) {
    render();
    return;
  }

  const delta = Math.min(0.032, (now - state.lastFrame) / 1000);
  state.lastFrame = now;
  spawnDrop(now);
  movePlayer(delta);
  updateDrops(delta);
  render();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  state.keys.add(event.key);
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.key);
});

canvas.addEventListener("pointermove", (event) => {
  if (!state.running) return;
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  state.player.x = (event.clientX - rect.left) * scale;
});

startButton.addEventListener("click", resetGame);

render();
