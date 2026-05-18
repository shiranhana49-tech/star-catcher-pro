const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const bestEl = document.querySelector("#best");
const livesEl = document.querySelector("#lives");
const startButton = document.querySelector("#startButton");
const gameHelp = document.querySelector("#gameHelp");
const gameCards = [...document.querySelectorAll(".game-card")];
const sudokuDifficultyPanel = document.querySelector("#sudokuDifficultyPanel");
const sudokuDifficultySelect = document.querySelector("#sudokuDifficulty");
const difficultyHint = document.querySelector("#difficultyHint");

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
  sudoku: {
    title: "Shiranh Sudoku Pro",
    help: "Select a cell, then press 1 to 9. Fill every row, column, and 3x3 box correctly.",
    bestKey: "shiranh-arcade-sudoku-best",
  },
};

const sudokuSolution = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

const sudokuDifficulties = {
  easy: { label: "Easy", clues: 46, lives: 5, hint: "Easy starts with more numbers and 5 lives." },
  normal: { label: "Normal", clues: 38, lives: 4, hint: "Normal has a balanced number of clues." },
  hard: { label: "Hard", clues: 31, lives: 3, hint: "Hard removes more clues and gives 3 lives." },
  expert: { label: "Expert", clues: 26, lives: 3, hint: "Expert is sparse and needs careful logic." },
  master: { label: "Master", clues: 22, lives: 2, hint: "Master gives very few clues and only 2 lives." },
};

let sudokuPuzzle = [];

const state = {
  mode: "stars",
  running: false,
  score: 0,
  best: 0,
  lives: 3,
  keys: new Set(),
  drops: [],
  target: null,
  sudokuBoard: [],
  sudokuSelected: { row: 0, col: 0 },
  sudokuComplete: false,
  sudokuDifficulty: "easy",
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

function saveBest() {
  if (state.score <= state.best) return;
  state.best = state.score;
  localStorage.setItem(activeGame().bestKey, String(state.best));
}

function syncHud() {
  scoreEl.textContent = state.score;
  bestEl.textContent = state.best;
  livesEl.textContent = state.lives;
}

function selectGame(mode) {
  state.mode = mode;
  state.running = false;
  state.score = 0;
  state.lives = mode === "sudoku" ? sudokuDifficulties[state.sudokuDifficulty].lives : 3;
  state.drops = [];
  state.target = null;
  state.sudokuComplete = false;
  sudokuDifficultyPanel.classList.toggle("visible", mode === "sudoku");
  if (mode === "sudoku") resetSudoku();
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
  state.lives = state.mode === "sudoku" ? sudokuDifficulties[state.sudokuDifficulty].lives : 3;
  state.drops = [];
  state.target = null;
  state.sudokuComplete = false;
  state.lastSpawn = 0;
  state.lastFrame = performance.now();
  state.player.x = canvas.width / 2;
  startButton.textContent = "Restart";
  if (state.mode === "targets") spawnTarget(performance.now());
  if (state.mode === "sudoku") resetSudoku();
  syncHud();
  requestAnimationFrame(loop);
}

function makeSudokuPuzzle(clues) {
  const puzzle = sudokuSolution.map((row) => row.map(() => 0));
  const order = [
    0, 4, 8, 40, 72, 76, 80, 10, 14, 20, 24, 28, 32, 36, 44, 48, 52, 56, 60, 66, 70, 2, 6, 18, 22,
    26, 30, 34, 46, 50, 54, 58, 62, 68, 74, 78, 1, 9, 11, 13, 17, 19, 23, 27, 31, 35, 37, 39, 41,
    43, 45, 49, 53, 57, 61, 63, 67, 69, 71, 73, 77, 79, 3, 5, 7, 12, 15, 16, 21, 25, 29, 33, 38,
    42, 47, 51, 55, 59, 64, 65, 75,
  ];

  order.slice(0, clues).forEach((index) => {
    const row = Math.floor(index / 9);
    const col = index % 9;
    puzzle[row][col] = sudokuSolution[row][col];
  });

  return puzzle;
}

function findFirstOpenSudokuCell() {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (sudokuPuzzle[row][col] === 0) return { row, col };
    }
  }
  return { row: 0, col: 0 };
}

function resetSudoku() {
  const level = sudokuDifficulties[state.sudokuDifficulty];
  sudokuPuzzle = makeSudokuPuzzle(level.clues);
  state.sudokuBoard = sudokuPuzzle.map((row) => [...row]);
  state.sudokuSelected = findFirstOpenSudokuCell();
  state.sudokuComplete = false;
  difficultyHint.textContent = level.hint;
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
  state.target = {
    x: 70 + Math.random() * (canvas.width - 140),
    y: 82 + Math.random() * (canvas.height - 165),
    radius: Math.max(22, 42 - state.score * 0.35),
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

function updateGame(delta, now) {
  if (state.mode === "targets") {
    if (!state.target) spawnTarget(now);
    if (state.target && now - state.target.born > state.target.ttl) {
      state.lives -= 1;
      spawnTarget(now);
    }
  } else if (state.mode !== "sudoku") {
    spawnDrop(now);
    movePlayer(delta);
    updateDrops(delta);
  }

  saveBest();
  if (state.lives <= 0 || state.sudokuComplete) {
    state.running = false;
    startButton.textContent = "Play Again";
  }
  syncHud();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#071426");
  gradient.addColorStop(1, "#030914");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  for (let i = 0; i < 70; i += 1) ctx.fillRect((i * 137) % canvas.width, (i * 89) % canvas.height, 2, 2);
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
  ctx.strokeStyle = `rgba(255, 207, 74, ${0.25 + progress * 0.45})`;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(state.target.x, state.target.y, state.target.radius + (1 - progress) * 28, 0, Math.PI * 2);
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

function drawSudokuBoard() {
  if (!state.sudokuBoard.length) resetSudoku();
  const size = Math.min(canvas.height - 76, canvas.width - 270);
  const cell = size / 9;
  const startX = 44;
  const startY = 40;
  ctx.fillStyle = "rgba(247, 251, 255, 0.95)";
  ctx.fillRect(startX, startY, size, size);
  ctx.fillStyle = "rgba(87, 215, 255, 0.24)";
  ctx.fillRect(startX + state.sudokuSelected.col * cell, startY + state.sudokuSelected.row * cell, cell, cell);

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = state.sudokuBoard[row][col];
      if (!value) continue;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = sudokuPuzzle[row][col] ? "#071426" : "#0c86c8";
      ctx.font = `${sudokuPuzzle[row][col] ? 700 : 800} ${Math.floor(cell * 0.52)}px system-ui, sans-serif`;
      ctx.fillText(String(value), startX + col * cell + cell / 2, startY + row * cell + cell / 2);
    }
  }

  for (let i = 0; i <= 9; i += 1) {
    ctx.strokeStyle = i % 3 === 0 ? "#071426" : "rgba(7, 20, 38, 0.25)";
    ctx.lineWidth = i % 3 === 0 ? 4 : 1;
    ctx.beginPath();
    ctx.moveTo(startX + i * cell, startY);
    ctx.lineTo(startX + i * cell, startY + size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(startX, startY + i * cell);
    ctx.lineTo(startX + size, startY + i * cell);
    ctx.stroke();
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f7fbff";
  ctx.font = "800 26px system-ui, sans-serif";
  ctx.fillText("Shiranh Sudoku Pro", startX + size + 34, startY + 42);
  ctx.fillStyle = "#b7c5d8";
  ctx.font = "16px system-ui, sans-serif";
  ctx.fillText("Select an empty cell.", startX + size + 34, startY + 84);
  ctx.fillText("Press 1 to 9 to solve.", startX + size + 34, startY + 112);
  ctx.fillText("Wrong number costs a life.", startX + size + 34, startY + 140);
  ctx.fillText(`Level: ${sudokuDifficulties[state.sudokuDifficulty].label}`, startX + size + 34, startY + 168);
  ctx.fillStyle = "#ffcf4a";
  ctx.font = "900 18px system-ui, sans-serif";
  ctx.fillText("SHIRANH TM", startX + size + 34, startY + 230);
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
  if (state.mode === "sudoku") drawSudokuBoard();
  else if (state.mode === "targets") drawTarget(now);
  else {
    drawDrops();
    drawPlayer();
  }

  if (!state.running) {
    const title = state.sudokuComplete ? "Sudoku Complete" : state.score > 0 ? "Game Over" : activeGame().title;
    const detail = state.sudokuComplete ? "Excellent logic. Puzzle solved." : state.score > 0 ? `Final score: ${state.score}` : activeGame().help;
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

function moveSudokuSelection(key) {
  const delta = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  }[key];
  state.sudokuSelected.row = Math.max(0, Math.min(8, state.sudokuSelected.row + delta[0]));
  state.sudokuSelected.col = Math.max(0, Math.min(8, state.sudokuSelected.col + delta[1]));
  render();
}

function selectSudokuCell(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const size = Math.min(canvas.height - 76, canvas.width - 270);
  const cell = size / 9;
  const col = Math.floor(((event.clientX - rect.left) * scaleX - 44) / cell);
  const row = Math.floor(((event.clientY - rect.top) * scaleY - 40) / cell);
  if (row < 0 || row > 8 || col < 0 || col > 8) return;
  state.sudokuSelected = { row, col };
  render();
}

function enterSudokuNumber(number) {
  const { row, col } = state.sudokuSelected;
  if (sudokuPuzzle[row][col] !== 0) return;
  if (sudokuSolution[row][col] === number) {
    state.sudokuBoard[row][col] = number;
    state.score += 1;
  } else {
    state.lives -= 1;
  }

  if (state.sudokuBoard.every((line) => line.every((cell) => cell !== 0))) {
    state.sudokuComplete = true;
    state.score += 20;
  }
  if (state.sudokuComplete || state.lives <= 0) {
    state.running = false;
    startButton.textContent = "Play Again";
  }
  saveBest();
  syncHud();
  render();
}

window.addEventListener("keydown", (event) => {
  if (state.running && state.mode === "sudoku" && /^[1-9]$/.test(event.key)) {
    enterSudokuNumber(Number(event.key));
    return;
  }
  if (state.running && state.mode === "sudoku" && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
    moveSudokuSelection(event.key);
    return;
  }
  state.keys.add(event.key);
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.key);
});

canvas.addEventListener("pointermove", (event) => {
  if (!state.running || state.mode === "targets" || state.mode === "sudoku") return;
  const rect = canvas.getBoundingClientRect();
  state.player.x = (event.clientX - rect.left) * (canvas.width / rect.width);
});

canvas.addEventListener("pointerdown", (event) => {
  if (state.running && state.mode === "sudoku") {
    selectSudokuCell(event);
    return;
  }
  if (!state.running || state.mode !== "targets" || !state.target) return;
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);
  if (Math.hypot(x - state.target.x, y - state.target.y) <= state.target.radius) {
    state.score += 1;
    spawnTarget(performance.now());
  }
});

gameCards.forEach((card) => card.addEventListener("click", () => selectGame(card.dataset.game)));

sudokuDifficultySelect.addEventListener("change", () => {
  state.sudokuDifficulty = sudokuDifficultySelect.value;
  if (state.mode !== "sudoku") return;
  state.running = false;
  state.score = 0;
  state.lives = sudokuDifficulties[state.sudokuDifficulty].lives;
  startButton.textContent = "Start Game";
  resetSudoku();
  syncHud();
  render();
});

startButton.addEventListener("click", resetGame);

selectGame("stars");
