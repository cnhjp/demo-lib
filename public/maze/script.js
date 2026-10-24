// ====== 工具：可复现随机数（xmur3 + mulberry32）======
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededRandom(seedStr) { return mulberry32(xmur3(seedStr)()); }
function randomSeedString() { return (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).toUpperCase(); }

// ====== DOM 与状态 ======
const canvas = document.getElementById("maze");
const ctx = canvas.getContext("2d");
const timeEl = document.getElementById("time");
const movesEl = document.getElementById("moves");
const keysEl = document.getElementById("keys");
const trapsEl = document.getElementById("traps");
const shortestEl = document.getElementById("shortest");
const bestEl = document.getElementById("best");
const statusEl = document.getElementById("status");
const toggleBtn = document.getElementById("toggleBtn");
const demoBtn = document.getElementById("demoBtn");
const autoWalkBtn = document.getElementById("autoWalkBtn");
const soundBtn = document.getElementById("soundBtn");
const newBtn = document.getElementById("newBtn");
const nextLevelBtn = document.getElementById("nextLevelBtn");
const pauseBtn = document.getElementById("pauseBtn");
const undoBtn = document.getElementById("undoBtn");
const difficultySel = document.getElementById("difficulty");
const seedInput = document.getElementById("seed");
const rollBtn = document.getElementById("roll");
const applySeedBtn = document.getElementById("applySeed");
const fogChk = document.getElementById("fog");
const crumbsChk = document.getElementById("crumbs");
const historyBtn = document.getElementById("historyBtn");
const historyModal = document.getElementById("historyModal");
const closeHistoryBtn = document.getElementById("closeHistoryBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const historyTableBody = document.querySelector("#historyTable tbody");
const pads = document.querySelectorAll(".pad");
const gameOverOverlay = document.getElementById('game-over-overlay');
const themeSelector = document.getElementById('theme');

const keysCard = document.getElementById('keys-card');
const trapsCard = document.getElementById('traps-card');
const bestCard = document.getElementById('best-card');

// ==========================================
// Web Audio 原生声学音效系统 (零外部资源依赖)
// ==========================================
const SoundSystem = {
  ctx: null,
  enabled: localStorage.getItem('mazeSoundEnabled') !== 'false',
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },
  playStep() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const baseFreq = 380 + (Math.random() * 40 - 20);
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.05);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  },
  playKey() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.16, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.16);
    });
  },
  playTrap() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.25);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  },
  playCaught() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.4);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  },
  playWin() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.2, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.3);
    });
  },
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('mazeSoundEnabled', String(this.enabled));
    return this.enabled;
  }
};

// 画布用到的颜色
const FOG_COLOR = "#0b1131";

// 游戏模式配置
const treasureDifficulties = {
    easy:   { name: "夺宝 (简单)", gridSize: 21, keysTotal: 7, keysRequired: 3, guards: 1, guardSpeed: 0.015, traps: 5 },
    normal: { name: "夺宝 (普通)", gridSize: 25, keysTotal: 7, keysRequired: 5, guards: 1, guardSpeed: 0.02,  traps: 10 },
    hard:   { name: "夺宝 (困难)", gridSize: 31, keysTotal: 7, keysRequired: 7, guards: 2, guardSpeed: 0.025, traps: 20 }
};
let currentTreasureConfig = treasureDifficulties.normal;

let gameMode = 'classic';
let gridSize = 21;
let cellSize = canvas.width / gridSize;

let maze = [];
const idx = (x, y) => y * gridSize + x;
const inBounds = (x, y) => x >= 0 && y >= 0 && x < gridSize && y < gridSize;
const opp = d => (d + 2) % 4;
const dirVecs = [ { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 } ];
const neighbors = (x, y) => dirVecs.map((v, dir) => ({ x: x + v.dx, y: y + v.dy, dir })).filter(n => inBounds(n.x, n.y));

let rng = Math.random;
let currentSeed = "";

let player = { x: 0, y: 0 };
let playerAnim = { fromX: 0, fromY: 0, toX: 0, toY: 0, t: 1 };
let goal = { x: gridSize - 1, y: gridSize - 1 };

let started = false;
let paused = false;
let finished = false;
let moves = 0;
let startTime = 0;
let finishTime = 0;
let rafId = null;
let isTrapped = false;
let trapEndTime = 0;

let solution = [];
let showSolution = false;
let visitedCells = new Set();
let undoStack = [];

// 夺宝模式状态
let keys = [];
let collectedKeys = 0;
let traps = [];
let guards = [];
let demo = { playing: false, path: [], i: 0, acc: 0, stepMs: 60 };
let autoWalk = { active: false, target: null, stepDelay: 95, lastStepTime: 0, path: [], lockedKey: null };

const fogRadius = 3;

function isMazeReady() { return Array.isArray(maze) && maze.length === gridSize * gridSize && maze[0] && Array.isArray(maze[0].walls); }

function adaptCanvas() {
  const canvasSize = canvas.getBoundingClientRect().width;
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  cellSize = canvas.width / gridSize;
  if (isMazeReady()) drawMaze();
}
window.addEventListener("resize", adaptCanvas);

function initMazeArray() {
  maze = Array.from({ length: gridSize * gridSize }, (_, i) => ({
    x: i % gridSize,
    y: Math.floor(i / gridSize),
    walls: [true, true, true, true],
    visited: false,
  }));
}

function addLoops() {
    const loopsToAdd = Math.floor(gridSize * 1.5);
    let loopsAdded = 0;
    let attempts = 0;
    const maxAttempts = gridSize * gridSize * 4;

    while (loopsAdded < loopsToAdd && attempts < maxAttempts) {
        const x = Math.floor(rng() * (gridSize - 2)) + 1;
        const y = Math.floor(rng() * (gridSize - 2)) + 1;
        
        const cell = maze[idx(x, y)];
        const wallToRemove = Math.floor(rng() * 4);
        
        if (cell.walls[wallToRemove]) {
            const neighbor = neighbors(x, y).find(n => n.dir === wallToRemove);
            if (neighbor) {
                const neighborCell = maze[idx(neighbor.x, neighbor.y)];
                cell.walls[wallToRemove] = false;
                neighborCell.walls[opp(wallToRemove)] = false;
                loopsAdded++;
            }
        }
        attempts++;
    }
}


function generateMaze() {
  initMazeArray();
  const stack = [];
  let current = maze[0];
  current.visited = true;
  while (true) {
    const unvisited = neighbors(current.x, current.y).filter(n => !maze[idx(n.x, n.y)].visited);
    if (unvisited.length > 0) {
      const next = unvisited[Math.floor(rng() * unvisited.length)];
      const nextCell = maze[idx(next.x, next.y)];
      current.walls[next.dir] = false;
      nextCell.walls[opp(next.dir)] = false;
      stack.push(current);
      nextCell.visited = true;
      current = nextCell;
    } else if (stack.length > 0) {
      current = stack.pop();
    } else break;
  }
  if (gameMode === 'treasure') {
      addLoops();
  }
}

function computeSolutionFrom(sx, sy, gx, gy, blockedKeys = null) {
  const q = [];
  const seen = new Set();
  const prev = new Map();
  const startKey = key(sx, sy);
  const goalKey = key(gx, gy);
  q.push({ x: sx, y: sy });
  seen.add(startKey);
  while (q.length) {
    const { x, y } = q.shift();
    if (x === gx && y === gy) break;
    const c = maze[idx(x, y)];
    if (!c) continue; // Safety check
    for (let dir = 0; dir < 4; dir++) {
      if (c.walls[dir]) continue;
      const nx = x + dirVecs[dir].dx;
      const ny = y + dirVecs[dir].dy;
      if (!inBounds(nx, ny)) continue;
      const k = key(nx, ny);
      if (seen.has(k)) continue;
      if (blockedKeys && blockedKeys.has(k) && k !== goalKey) continue;
      seen.add(k);
      prev.set(k, key(x, y));
      q.push({ x: nx, y: ny });
    }
  }
  const path = [];
  let cur = goalKey;
  if (!prev.has(cur) && cur !== startKey) return [];
  path.push(parseKey(cur));
  while (cur !== startKey) {
    cur = prev.get(cur);
    path.push(parseKey(cur));
  }
  return path.reverse();
}

function getGuardDangerZone(radius = 2) {
  const danger = new Set();
  if (gameMode !== 'treasure' || !guards || guards.length === 0) return danger;

  guards.forEach(g => {
    const gx = Math.round(g.x);
    const gy = Math.round(g.y);
    if (!inBounds(gx, gy)) return;

    danger.add(key(gx, gy));

    if (g.path && g.path.length > 1) {
      danger.add(key(g.path[1].x, g.path[1].y));
    }

    const q = [{ x: gx, y: gy, dist: 0 }];
    const visited = new Set([key(gx, gy)]);
    while (q.length) {
      const cur = q.shift();
      if (cur.dist >= radius) continue;
      const c = maze[idx(cur.x, cur.y)];
      if (!c) continue;
      for (let dir = 0; dir < 4; dir++) {
        if (c.walls[dir]) continue;
        const nx = cur.x + dirVecs[dir].dx;
        const ny = cur.y + dirVecs[dir].dy;
        if (!inBounds(nx, ny)) continue;
        const k = key(nx, ny);
        if (!visited.has(k)) {
          visited.add(k);
          danger.add(k);
          q.push({ x: nx, y: ny, dist: cur.dist + 1 });
        }
      }
    }
  });

  return danger;
}

function getMinCorridorDistToGuards(x, y, maxCheck = 5) {
  if (gameMode !== 'treasure' || !guards || guards.length === 0) return Infinity;
  let minDist = Infinity;
  for (const g of guards) {
    const gx = Math.round(g.x);
    const gy = Math.round(g.y);
    if (Math.abs(x - gx) + Math.abs(y - gy) > maxCheck) continue;
    const p = computeSolutionFrom(gx, gy, x, y);
    if (p.length > 0 && p.length - 1 < minDist) {
      minDist = p.length - 1;
    }
  }
  return minDist;
}

function computeSolution() {
  if (gameMode === 'classic') {
    solution = computeSolutionFrom(0, 0, goal.x, goal.y);
    shortestEl.textContent = solution.length ? String(solution.length - 1) : "—";
  } else {
    solution = []; // Clear solution for treasure mode initially
    shortestEl.textContent = "—";
  }
}

function key(x, y) { return `${x},${y}`; }
function parseKey(k) { const [x, y] = k.split(",").map(Number); return { x, y }; }

function drawMaze() {
  if (!isMazeReady()) return;
  const currentTheme = document.body.dataset.theme || 'dark';
  const wallColor = getComputedStyle(document.documentElement).getPropertyValue('--maze-wall');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 墙体
  ctx.strokeStyle = wallColor;
  ctx.lineWidth = Math.max(1, 2 * (600 / gridSize / 21));
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const c = maze[idx(x, y)];
      const px = x * cellSize;
      const py = y * cellSize;
      if (c.walls[0]) line(px, py, px + cellSize, py);
      if (c.walls[1]) line(px + cellSize, py, px + cellSize, py + cellSize);
      if (c.walls[2]) line(px, py + cellSize, px + cellSize, py + cellSize);
      if (c.walls[3]) line(px, py, px, py + cellSize);
    }
  }

  // 起点/终点
  const padding = Math.max(1, cellSize * 0.1);
  ctx.fillStyle = "#2adf86";
  ctx.fillRect(padding, padding, cellSize - padding * 2, cellSize - padding * 2);
  
  const keysRequired = gameMode === 'treasure' ? currentTreasureConfig.keysRequired : 0;
  const allKeysCollected = gameMode === 'treasure' && collectedKeys >= keysRequired;
  ctx.fillStyle = gameMode === 'treasure' ? (allKeysCollected ? '#a77dff' : '#5a4a7e') : '#ff6b6b';
  ctx.fillRect(goal.x * cellSize + padding, goal.y * cellSize + padding, cellSize - padding * 2, cellSize - padding * 2);


  // 面包屑
  if (crumbsChk.checked && visitedCells.size > 0) {
    ctx.fillStyle = "#6ef3a5";
    visitedCells.forEach(k => {
      const p = parseKey(k);
      ctx.beginPath();
      ctx.arc(p.x * cellSize + cellSize / 2, p.y * cellSize + cellSize / 2, Math.max(1, cellSize / 12), 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 夺宝模式元素
  if (gameMode === 'treasure') {
    // 钥匙
    ctx.fillStyle = "gold";
    keys.forEach(k => {
      if (!k.collected) {
        ctx.fillRect(k.x * cellSize + cellSize * 0.25, k.y * cellSize + cellSize * 0.25, cellSize / 2, cellSize / 2);
      }
    });
    // 陷阱
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    traps.forEach(t => {
      if (t.revealed) {
        const cx = t.x * cellSize + cellSize / 2;
        const cy = t.y * cellSize + cellSize / 2;
        const size = cellSize / 4;
        line(cx - size, cy - size, cx + size, cy + size);
        line(cx - size, cy + size, cx + size, cy - size);
      }
    });
    // 守卫
    guards.forEach(guard => {
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(guard.x * cellSize + cellSize / 2, guard.y * cellSize + cellSize / 2, Math.max(2, cellSize / 3), 0, Math.PI * 2);
        ctx.fill();
    });
  }

  // 答案路径
  if (showSolution && solution.length > 0) {
    ctx.strokeStyle = "#6ef3a5";
    ctx.lineWidth = Math.max(1.5, 3 * (600 / gridSize / 21));
    ctx.beginPath();
    for (let i = 0; i < solution.length; i++) {
      const p = solution[i];
      const cx = p.x * cellSize + cellSize / 2;
      const cy = p.y * cellSize + cellSize / 2;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // 演示解法（幽灵）
  if (demo.playing && demo.path.length > 1) {
    const i = Math.max(0, Math.min(demo.i, demo.path.length - 1));
    ctx.fillStyle = "#7fb6ff"; // Ghost trail color
    for (let k = 0; k <= i; k++) {
      const p = demo.path[k];
      ctx.beginPath();
      ctx.arc(p.x * cellSize + cellSize / 2, p.y * cellSize + cellSize / 2, Math.max(1, 2.2 * (600/gridSize/21)), 0, Math.PI * 2);
      ctx.fill();
    }
    const head = demo.path[i];
    ctx.fillStyle = "#3fa1ff"; // Ghost head color
    ctx.beginPath();
    ctx.arc(head.x * cellSize + cellSize / 2, head.y * cellSize + cellSize / 2, Math.max(2, 4 * (600/gridSize/21)), 0, Math.PI * 2);
    ctx.fill();
  }

  // 自动寻路目标点指示
  if (autoWalk.active && autoWalk.target) {
    const tx = autoWalk.target.x * cellSize + cellSize / 2;
    const ty = autoWalk.target.y * cellSize + cellSize / 2;
    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = Math.max(1.5, 2 * (600 / gridSize / 21));
    ctx.beginPath();
    ctx.arc(tx, ty, Math.max(3, cellSize * 0.35), 0, Math.PI * 2);
    ctx.stroke();
  }

  // 玩家
  const t = Math.min(1, playerAnim.t);
  const ax = lerp(playerAnim.fromX, playerAnim.toX, t);
  const ay = lerp(playerAnim.fromY, playerAnim.toY, t);
  ctx.fillStyle = isTrapped ? "gray" : "#ffd166";
  ctx.beginPath();
  ctx.arc(ax * cellSize + cellSize / 2, ay * cellSize + cellSize / 2, Math.max(2, cellSize / 4), 0, Math.PI * 2);
  ctx.fill();

  // 完成高亮
  if (finished) {
    ctx.strokeStyle = "#ffd166aa";
    ctx.lineWidth = Math.max(2, 6 * (600/gridSize/21));
    const hlPadding = Math.max(2, 4 * (600/gridSize/21));
    ctx.strokeRect(goal.x * cellSize + hlPadding, goal.y * cellSize + hlPadding, cellSize - hlPadding * 2, cellSize - hlPadding * 2);
  }

  // 迷雾
  if (fogChk.checked) {
    const playerCX = ax * cellSize + cellSize / 2;
    const playerCY = ay * cellSize + cellSize / 2;
    const innerRadius = (fogRadius - 1) * cellSize;
    const outerRadius = (fogRadius + 2.5) * cellSize;
    const gradient = ctx.createRadialGradient(playerCX, playerCY, innerRadius, playerCX, playerCY, outerRadius);
    gradient.addColorStop(0, 'rgba(11, 17, 49, 0)');
    gradient.addColorStop(0.7, 'rgba(11, 17, 49, 0.9)');
    gradient.addColorStop(1, FOG_COLOR);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function lerp(a, b, t) { return a + (b - a) * t; }

function tryMove(dx, dy) {
  if (finished || paused || isTrapped) return;
  if (playerAnim.t < 1) return;

  const dir = dirVecs.findIndex(v => v.dx === dx && v.dy === dy);
  if (dir < 0) return;

  const c = maze[idx(player.x, player.y)];
  if (c.walls[dir]) return;

  if (!started) { started = true; startTime = performance.now(); }

  undoStack.push({ x: player.x, y: player.y });
  visitedCells.add(key(player.x, player.y));

  const nx = player.x + dx;
  const ny = player.y + dy;

  playerAnim = { fromX: player.x, fromY: player.y, toX: nx, toY: ny, t: 0 };
  player.x = nx; player.y = ny;
  moves += 1; movesEl.textContent = String(moves);
  SoundSystem.playStep();

  if (gameMode === 'treasure') {
    const keyIndex = keys.findIndex(k => !k.collected && k.x === player.x && k.y === player.y);
    if (keyIndex > -1) {
      keys[keyIndex].collected = true;
      collectedKeys++;
      keysEl.textContent = `${collectedKeys} / ${currentTreasureConfig.keysRequired}`;
      statusEl.textContent = "找到一把钥匙！";
      SoundSystem.playKey();
    }
    const trapIndex = traps.findIndex(t => !t.revealed && t.x === player.x && t.y === player.y);
    if (trapIndex > -1) {
      traps[trapIndex].revealed = true;
      isTrapped = true;
      trapEndTime = performance.now() + 2000;
      statusEl.textContent = "踩到陷阱了！定身2秒！";
      SoundSystem.playTrap();
    }
    if (showSolution) updateTreasureSolution();
  }
  
  checkWinCondition();
}

function checkWinCondition() {
    if (player.x === goal.x && player.y === goal.y) {
        if (gameMode === 'treasure') {
            if (collectedKeys >= currentTreasureConfig.keysRequired) {
                endGame(true, "成功逃脱！🎉");
            } else {
                statusEl.textContent = `还需要 ${currentTreasureConfig.keysRequired - collectedKeys} 把钥匙！`;
            }
        } else {
            endGame(true, "完成！🎉");
        }
    }
}

function triggerConfetti() {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.6 },
            zIndex: 9999
        });
    }
}

function triggerShake() {
    const gameContainer = document.querySelector('.game-container');
    gameContainer.classList.add('shake');
    setTimeout(() => gameContainer.classList.remove('shake'), 500);
}

function showWinModal(isWin, message) {
  const winModal = document.getElementById("winModal");
  if (!winModal) return;

  const winTitle = document.getElementById("winModalTitle");
  const winSubtitle = document.getElementById("winModalSubtitle");
  const winMode = document.getElementById("winMode");
  const winTime = document.getElementById("winTime");
  const winMoves = document.getElementById("winMoves");
  const winShortest = document.getElementById("winShortest");
  const winShortestCard = document.getElementById("winShortestCard");

  const selectedOption = difficultySel.options[difficultySel.selectedIndex];
  if (winMode) winMode.textContent = selectedOption ? selectedOption.text : "";
  if (winTime) winTime.textContent = formatMs(finishTime - startTime);
  if (winMoves) winMoves.textContent = String(moves);

  if (gameMode === 'classic') {
    if (winShortestCard) winShortestCard.style.display = '';
    if (winShortest) winShortest.textContent = shortestEl.textContent;
  } else {
    if (winShortestCard) winShortestCard.style.display = 'none';
  }

  const nextBtn = document.getElementById("winNextBtn");
  if (isWin) {
    if (winTitle) {
      winTitle.textContent = "🎉 挑战成功！";
      winTitle.style.color = "var(--accent)";
    }
    if (winSubtitle) winSubtitle.textContent = "恭喜你顺利逃离迷宫，太棒了！";
    if (nextBtn) nextBtn.style.display = '';
  } else {
    if (winTitle) {
      winTitle.textContent = "💀 挑战失败";
      winTitle.style.color = "var(--danger)";
    }
    if (winSubtitle) winSubtitle.textContent = message || "你被守卫抓住了！";
    if (nextBtn) nextBtn.style.display = 'none';
  }

  winModal.style.display = "flex";
}

function endGame(isWin, message) {
    stopAutoWalk();
    finished = true;
    finishTime = performance.now();
    timeEl.textContent = formatMs(finishTime - startTime);
    statusEl.textContent = message;
    saveGameResult(isWin ? "胜利" : "失败");
    if (isWin) {
        SoundSystem.playWin();
        triggerConfetti();
        if (gameMode === 'classic') showSolution = true;
        toggleBtn.textContent = "隐藏答案";
        updateBest();
        nextLevelBtn.style.display = '';
        newBtn.style.display = 'none';
    } else {
        SoundSystem.playCaught();
        triggerShake();
    }
    showWinModal(isWin, message);
}

function undoMove() {
  if (paused || finished || gameMode === 'treasure') return;
  stopAutoWalk();
  if (playerAnim.t < 1) return;
  const prev = undoStack.pop();
  if (!prev) return;
  playerAnim = { fromX: player.x, fromY: player.y, toX: prev.x, toY: prev.y, t: 0 };
  player.x = prev.x; player.y = prev.y;
  moves = Math.max(0, moves - 1);
  movesEl.textContent = String(moves);
}

function onKey(e) {
  if (e.target.id === 'seed') return;
  let handled = false;
  switch (e.key) {
    case "ArrowUp": case "w": case "W": stopAutoWalk(); tryMove(0, -1); handled = true; break;
    case "ArrowRight": case "d": case "D": stopAutoWalk(); tryMove(1, 0); handled = true; break;
    case "ArrowDown": case "s": case "S": stopAutoWalk(); tryMove(0, 1); handled = true; break;
    case "ArrowLeft": case "a": case "A": stopAutoWalk(); tryMove(-1, 0); handled = true; break;
    case "z": case "Z": toggleAutoWalk(); handled = true; break;
    case "h": case "H": toggleAnswer(); handled = true; break;
    case "g": case "G": toggleDemo(); handled = true; break;
    case "r": case "R": newMaze(); handled = true; break;
    case "p": case "P": togglePause(); handled = true; break;
    case "u": case "U": case "Backspace": undoMove(); handled = true; break;
  }
  if (handled) { e.preventDefault(); e.stopPropagation(); }
}

pads.forEach(p => p.addEventListener("click", () => {
  stopAutoWalk();
  const m = p.getAttribute("data-m");
  if (m === "u") tryMove(0, -1);
  else if (m === "r") tryMove(1, 0);
  else if (m === "d") tryMove(0, 1);
  else if (m === "l") tryMove(-1, 0);
}));

function tick() {
  const now = performance.now();
  if (!paused) {
      if (playerAnim.t < 1) {
        playerAnim.t = Math.min(1, playerAnim.t + (1 / 60) * 10);
      }
      if (isTrapped && now > trapEndTime) {
          isTrapped = false;
          statusEl.textContent = "";
      }
      if (started && !finished) {
        timeEl.textContent = formatMs(now - startTime);
      }
      if (gameMode === 'treasure' && !finished) {
          updateGuards(now);
      }
      if (autoWalk.active && !paused && !isTrapped && !finished) {
        updateAutoWalk(now);
      }
      if (demo.playing && !paused) {
        demo.acc += 16.67; // Assuming ~60fps
        while (demo.acc >= demo.stepMs && demo.i < demo.path.length - 1) {
          demo.acc -= demo.stepMs;
          demo.i++;
        }
        if (demo.i >= demo.path.length - 1) {
            demo.playing = false;
            statusEl.textContent = "演示完成";
        }
      }
  }
  drawMaze();
  rafId = requestAnimationFrame(tick);
}

function updateGuards(now) {
    guards.forEach(guard => {
        if (now - guard.lastUpdate > guard.updateInterval) {
            const guardGridX = Math.round(guard.x);
            const guardGridY = Math.round(guard.y);
            if (inBounds(guardGridX, guardGridY)) {
                guard.path = computeSolutionFrom(guardGridX, guardGridY, player.x, player.y);
            }
            guard.lastUpdate = now;
        }
        
        if (guard.path && guard.path.length > 1) {
            const nextPos = guard.path[1];
            const dx = Math.sign(nextPos.x - guard.x);
            const dy = Math.sign(nextPos.y - guard.y);
            
            guard.x += dx * guard.speed;
            guard.y += dy * guard.speed;

            if (Math.abs(guard.x - nextPos.x) < guard.speed && Math.abs(guard.y - nextPos.y) < guard.speed) {
                 guard.x = nextPos.x;
                 guard.y = nextPos.y;
                 guard.path.shift();
            }
        }
        
        if (Math.abs(player.x - guard.x) < 0.5 && Math.abs(player.y - guard.y) < 0.5) {
            endGame(false, "你被守卫抓住了！");
        }
    });
}

function formatMs(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function updateTreasureSolution() {
    if (gameMode !== 'treasure') return;
    const allRequiredKeysCollected = collectedKeys >= currentTreasureConfig.keysRequired;

    if (allRequiredKeysCollected) {
        solution = computeSolutionFrom(player.x, player.y, goal.x, goal.y);
    } else {
        let shortestPath = [];
        let minLength = Infinity;
        const uncollectedKeys = keys.filter(k => !k.collected);
        for (const key of uncollectedKeys) {
            const path = computeSolutionFrom(player.x, player.y, key.x, key.y);
            if (path.length > 0 && path.length < minLength) {
                minLength = path.length;
                shortestPath = path;
            }
        }
        solution = shortestPath;
    }
}

function startDemo() {
    if (finished || paused) return;
    let path;
    if (gameMode === 'classic') {
        path = computeSolutionFrom(player.x, player.y, goal.x, goal.y);
    } else { // treasure mode
        updateTreasureSolution(); // This function now calculates the correct path
        path = solution;
    }
    
    if (path && path.length > 1) {
        demo.path = path;
        demo.i = 0;
        demo.acc = 0;
        demo.playing = true;
        statusEl.textContent = "演示进行中...";
    } else {
        statusEl.textContent = "无可演示路径";
    }
}

function toggleAnswer() { 
    showSolution = !showSolution; 
    toggleBtn.textContent = showSolution ? "隐藏答案" : "显示答案";
    if (gameMode === 'treasure' && showSolution) {
        updateTreasureSolution();
    } else if (gameMode === 'classic') {
        // No update needed, solution is static
    } else {
        solution = []; // Hide path if toggled off
    }
}

function startAutoWalk(target = null) {
  if (finished || paused || isTrapped) return;
  SoundSystem.init();
  if (target) {
    const path = computeSolutionFrom(player.x, player.y, target.x, target.y);
    if (!path || path.length < 2) {
      statusEl.textContent = "无法到达该位置";
      return;
    }
  }
  if (demo.playing) demo.playing = false;
  autoWalk.active = true;
  autoWalk.target = target;
  autoWalk.lastStepTime = performance.now();
  autoWalk.path = [];
  autoWalk.lockedKey = null;

  if (autoWalkBtn) {
    autoWalkBtn.textContent = "停止自动";
    autoWalkBtn.style.background = "#e11d48";
    autoWalkBtn.style.color = "#ffffff";
  }
  statusEl.textContent = target ? "正在前往目标点..." : "自动寻路中...";
}

function stopAutoWalk() {
  if (!autoWalk.active) return;
  autoWalk.active = false;
  autoWalk.target = null;
  autoWalk.path = [];
  autoWalk.lockedKey = null;
  if (autoWalkBtn) {
    autoWalkBtn.textContent = "自动走路";
    autoWalkBtn.style.background = "";
    autoWalkBtn.style.color = "";
  }
  if (statusEl.textContent.includes("自动") || statusEl.textContent.includes("目标点") || statusEl.textContent.includes("守卫") || statusEl.textContent.includes("巡航") || statusEl.textContent.includes("等待")) {
    statusEl.textContent = "";
  }
}

function toggleAutoWalk() {
  if (autoWalk.active) {
    stopAutoWalk();
  } else {
    startAutoWalk();
  }
}

function updateAutoWalk(now) {
  if (playerAnim.t < 1) return;
  if (now - autoWalk.lastStepTime < autoWalk.stepDelay) return;

  // 1. 点选目标寻路
  if (autoWalk.target) {
    if (player.x === autoWalk.target.x && player.y === autoWalk.target.y) {
      stopAutoWalk();
      statusEl.textContent = "已到达目标点";
      return;
    }
    const dangerZone = (gameMode === 'treasure') ? getGuardDangerZone(2) : null;
    let path = computeSolutionFrom(player.x, player.y, autoWalk.target.x, autoWalk.target.y, dangerZone);
    if (!path || path.length < 2) {
      path = computeSolutionFrom(player.x, player.y, autoWalk.target.x, autoWalk.target.y);
      if (!path || path.length < 2) {
        stopAutoWalk();
        statusEl.textContent = "无法到达目标点";
        return;
      }
    }
    const nextCell = path[1];
    autoWalk.lastStepTime = now;
    tryMove(nextCell.x - player.x, nextCell.y - player.y);
    return;
  }

  // 2. 经典模式：锁存并沿单向最短解队列行进，绝不折返重算
  if (gameMode === 'classic') {
    if (player.x === goal.x && player.y === goal.y) {
      stopAutoWalk();
      return;
    }
    if (!autoWalk.path || autoWalk.path.length < 2 || autoWalk.path[0].x !== player.x || autoWalk.path[0].y !== player.y) {
      autoWalk.path = computeSolutionFrom(player.x, player.y, goal.x, goal.y);
    }
    if (!autoWalk.path || autoWalk.path.length < 2) {
      stopAutoWalk();
      statusEl.textContent = "无可用路径";
      return;
    }
    const nextCell = autoWalk.path[1];
    autoWalk.path.shift();
    autoWalk.lastStepTime = now;
    tryMove(nextCell.x - player.x, nextCell.y - player.y);
    return;
  }

  // 3. 夺宝模式：同走廊怪物真实威胁距离判定 + 目标钥匙锁定
  const allRequiredKeys = collectedKeys >= currentTreasureConfig.keysRequired;
  const corridorDist = getMinCorridorDistToGuards(player.x, player.y, 4);

  // 仅当怪物在同走廊且仅剩 2 步以内时才触发战术避让（彻底解决隔墙虚假避障）
  if (corridorDist <= 2) {
    let bestEvade = null;
    let maxDist = corridorDist;
    const curCell = maze[idx(player.x, player.y)];
    if (curCell) {
      for (let dir = 0; dir < 4; dir++) {
        if (!curCell.walls[dir]) {
          const nx = player.x + dirVecs[dir].dx;
          const ny = player.y + dirVecs[dir].dy;
          if (inBounds(nx, ny)) {
            const d = getMinCorridorDistToGuards(nx, ny, 6);
            if (d > maxDist) {
              maxDist = d;
              bestEvade = { dx: dirVecs[dir].dx, dy: dirVecs[dir].dy };
            }
          }
        }
      }
    }

    if (bestEvade) {
      statusEl.textContent = "守卫逼近，紧急避让中...";
      autoWalk.lastStepTime = now;
      autoWalk.lockedKey = null;
      tryMove(bestEvade.dx, bestEvade.dy);
      return;
    } else {
      statusEl.textContent = "原地戒备，等待守卫走开...";
      autoWalk.lastStepTime = now;
      return;
    }
  }

  // 钥匙收集完成，直奔出口
  if (allRequiredKeys) {
    if (player.x === goal.x && player.y === goal.y) {
      stopAutoWalk();
      return;
    }
    const dangerZone = getGuardDangerZone(2);
    let path = computeSolutionFrom(player.x, player.y, goal.x, goal.y, dangerZone);
    if (!path || path.length < 2) {
      path = computeSolutionFrom(player.x, player.y, goal.x, goal.y);
    }
    if (path && path.length > 1) {
      const nextCell = path[1];
      autoWalk.lastStepTime = now;
      statusEl.textContent = "钥匙集齐，前往出口逃离！";
      tryMove(nextCell.x - player.x, nextCell.y - player.y);
      return;
    }
  }

  // 锁定当前目标钥匙，禁止在多把钥匙间徘徊折返
  const uncollectedKeys = keys.filter(k => !k.collected);
  if (uncollectedKeys.length === 0) return;

  const dangerZone = getGuardDangerZone(2);
  let targetKey = autoWalk.lockedKey;

  if (!targetKey || targetKey.collected || dangerZone.has(key(targetKey.x, targetKey.y))) {
    let bestKey = null;
    let minPathLen = Infinity;
    for (const k of uncollectedKeys) {
      const p = computeSolutionFrom(player.x, player.y, k.x, k.y, dangerZone);
      if (p.length > 0 && p.length < minPathLen) {
        minPathLen = p.length;
        bestKey = k;
      }
    }
    if (!bestKey) {
      for (const k of uncollectedKeys) {
        const p = computeSolutionFrom(player.x, player.y, k.x, k.y);
        if (p.length > 0 && p.length < minPathLen) {
          minPathLen = p.length;
          bestKey = k;
        }
      }
    }
    targetKey = bestKey;
    autoWalk.lockedKey = targetKey;
  }

  if (targetKey) {
    let path = computeSolutionFrom(player.x, player.y, targetKey.x, targetKey.y, dangerZone);
    if (!path || path.length < 2) {
      path = computeSolutionFrom(player.x, player.y, targetKey.x, targetKey.y);
    }
    if (path && path.length > 1) {
      const nextCell = path[1];
      autoWalk.lastStepTime = now;
      statusEl.textContent = "精准寻路中（锁定钥匙目标）...";
      tryMove(nextCell.x - player.x, nextCell.y - player.y);
      return;
    }
  }

  statusEl.textContent = "等待守卫走开...";
  autoWalk.lastStepTime = now;
}

function toggleDemo() {
    if (demo.playing) {
        demo.playing = false;
        statusEl.textContent = "";
    } else {
        startDemo();
    }
}
function togglePause() { 
  paused = !paused; 
  pauseBtn.textContent = paused ? "继续" : "暂停"; 
  statusEl.textContent = paused ? "已暂停" : ""; 
  if (paused) stopAutoWalk();
}

function resetState() {
  stopAutoWalk();
  player = { x: 0, y: 0 };
  playerAnim = { fromX: 0, fromY: 0, toX: 0, toY: 0, t: 1 };
  moves = 0; movesEl.textContent = "0";
  started = false; paused = false; finished = false;
  finishTime = 0; timeEl.textContent = "00:00.000";
  statusEl.textContent = "";
  showSolution = false; toggleBtn.textContent = "显示答案";
  visitedCells = new Set([key(0, 0)]);
  undoStack = [];
  isTrapped = false;
  demo.playing = false;
  nextLevelBtn.style.display = 'none';
  newBtn.style.display = '';
  const winModal = document.getElementById("winModal");
  if (winModal) winModal.style.display = "none";
  if (gameOverOverlay) gameOverOverlay.classList.remove('visible');
  
  if (gameMode === 'treasure') {
      collectedKeys = 0;
      keysEl.textContent = `0 / ${currentTreasureConfig.keysRequired}`;
      trapsEl.textContent = `${currentTreasureConfig.traps}`;
      guards = [];
      for (let i = 0; i < currentTreasureConfig.guards; i++) {
          guards.push({
              x: Math.floor(gridSize / 2) + i,
              y: Math.floor(gridSize / 2),
              path: [],
              speed: currentTreasureConfig.guardSpeed,
              updateInterval: 1000,
              lastUpdate: 0
          });
      }
      undoBtn.style.display = 'none';
      demoBtn.style.display = '';
      bestCard.style.display = 'none';
      keysCard.style.display = '';
      trapsCard.style.display = '';
  } else {
      undoBtn.style.display = '';
      demoBtn.style.display = '';
      bestCard.style.display = '';
      keysCard.style.display = 'none';
      trapsCard.style.display = 'none';
  }

  pauseBtn.textContent = "暂停";
}

function placeTreasureModeItems() {
    const safeZone = new Set([key(0,0), key(goal.x, goal.y)]);
    
    // Place keys
    keys = [];
    for(let i=0; i < currentTreasureConfig.keysTotal; i++) {
        let kx, ky;
        do {
            kx = Math.floor(rng() * gridSize);
            ky = Math.floor(rng() * gridSize);
        } while (safeZone.has(key(kx, ky)));
        keys.push({x: kx, y: ky, collected: false});
        safeZone.add(key(kx, ky));
    }
    
    // Protect paths to keys
    for (const k of keys) {
        const path = computeSolutionFrom(0, 0, k.x, k.y);
        path.forEach(p => safeZone.add(key(p.x, p.y)));
    }

    // Place traps
    traps = [];
    for(let i=0; i < currentTreasureConfig.traps; i++) {
        let tx, ty;
        do {
            tx = Math.floor(rng() * gridSize);
            ty = Math.floor(rng() * gridSize);
        } while (safeZone.has(key(tx, ty)));
        traps.push({x: tx, y: ty, revealed: false});
    }
}

function newMaze() {
  if (!seedInput.value) {
    currentSeed = randomSeedString();
    seedInput.value = currentSeed;
  } else {
    currentSeed = seedInput.value.trim();
  }
  rng = seededRandom(currentSeed);

  const selectedValue = difficultySel.value;
  if (selectedValue.startsWith('treasure')) {
      gameMode = 'treasure';
      const difficulty = selectedValue.split('_')[1];
      currentTreasureConfig = treasureDifficulties[difficulty];
      gridSize = currentTreasureConfig.gridSize;
      goal = { x: gridSize - 1, y: gridSize - 1 };
  } else {
      gameMode = 'classic';
      gridSize = Number(selectedValue);
      goal = { x: gridSize - 1, y: gridSize - 1 };
  }
  
  cellSize = canvas.width / gridSize;
  generateMaze();
  
  if (gameMode === 'treasure') {
      placeTreasureModeItems();
  }

  computeSolution();
  updateBestDisplay();
  resetState();
  adaptCanvas(); // Call adaptCanvas after setting new grid size
  drawMaze();
  canvas.focus();
}

function applyDifficulty() {
    const selectedValue = difficultySel.value;
    if (selectedValue.startsWith('treasure')) {
        const difficulty = selectedValue.split('_')[1];
        const config = treasureDifficulties[difficulty];
        keysEl.textContent = `0 / ${config.keysRequired}`;
        trapsEl.textContent = `${config.traps}`;
        keysCard.style.display = '';
        trapsCard.style.display = '';
        bestCard.style.display = 'none';
    } else {
        keysCard.style.display = 'none';
        trapsCard.style.display = 'none';
        bestCard.style.display = '';
    }
    newMaze(); 
}
function applySeed() { newMaze(); }

function goToNextLevel() {
    seedInput.value = ""; // Clear seed to get a new random maze
    newMaze();
}

function saveGameResult(result) {
    const history = JSON.parse(localStorage.getItem('mazeGameHistory')) || [];
    const selectedOption = difficultySel.options[difficultySel.selectedIndex];
    
    const gameData = {
        date: new Date().toLocaleString('zh-CN'),
        mode: gameMode === 'classic' ? '经典' : '夺宝',
        difficulty: selectedOption.text,
        result: result,
        time: formatMs(finishTime - startTime),
        moves: moves,
        seed: currentSeed
    };

    history.unshift(gameData); // Add to the beginning
    if (history.length > 50) { // Keep last 50 records
        history.pop();
    }
    localStorage.setItem('mazeGameHistory', JSON.stringify(history));
}

function renderHistory() {
    const history = JSON.parse(localStorage.getItem('mazeGameHistory')) || [];
    historyTableBody.innerHTML = ''; // Clear existing table
    if (history.length === 0) {
        historyTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">暂无历史记录</td></tr>';
        return;
    }
    history.forEach(rec => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${rec.date}</td>
            <td>${rec.mode}</td>
            <td>${rec.difficulty}</td>
            <td>${rec.result}</td>
            <td>${rec.time}</td>
            <td>${rec.moves}</td>
            <td>${rec.seed}</td>
        `;
        historyTableBody.appendChild(row);
    });
}

function updateBest() {
  const keyLS = `maze_pb_${gameMode}_${gridSize}`;
  const ms = finishTime - startTime;
  const prev = Number(localStorage.getItem(keyLS) || "0");
  if (prev === 0 || ms < prev) {
    localStorage.setItem(keyLS, String(ms));
    bestEl.textContent = formatMs(ms);
  }
}

function updateBestDisplay() {
  const keyLS = `maze_pb_${gameMode}_${gridSize}`;
  const prev = Number(localStorage.getItem(keyLS) || "0");
  bestEl.textContent = prev ? formatMs(prev) : "—";
}

function applyTheme(theme) {
    document.body.dataset.theme = theme;
    localStorage.setItem('mazeTheme', theme);
    drawMaze(); // Redraw maze with new theme colors
}

window.addEventListener("keydown", onKey);
canvas.addEventListener("pointerdown", () => canvas.focus());
canvas.addEventListener("click", (e) => {
  if (finished || paused || isTrapped) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;
  const targetX = Math.floor(clickX / cellSize);
  const targetY = Math.floor(clickY / cellSize);

  if (inBounds(targetX, targetY)) {
    if (targetX === player.x && targetY === player.y) return;
    startAutoWalk({ x: targetX, y: targetY });
  }
});
toggleBtn.addEventListener("click", toggleAnswer);
demoBtn.addEventListener("click", toggleDemo);
if (autoWalkBtn) autoWalkBtn.addEventListener("click", toggleAutoWalk);
if (soundBtn) {
  soundBtn.textContent = SoundSystem.enabled ? "🔊 音效: 开" : "🔈 音效: 关";
  soundBtn.addEventListener("click", () => {
    const isEnabled = SoundSystem.toggle();
    soundBtn.textContent = isEnabled ? "🔊 音效: 开" : "🔈 音效: 关";
    if (isEnabled) SoundSystem.playKey();
  });
}
newBtn.addEventListener("click", newMaze);
nextLevelBtn.addEventListener("click", goToNextLevel);
pauseBtn.addEventListener("click", togglePause);
undoBtn.addEventListener("click", undoMove);
difficultySel.addEventListener("change", applyDifficulty);
rollBtn.addEventListener("click", () => { seedInput.value = randomSeedString(); });
applySeedBtn.addEventListener("click", applySeed);

historyBtn.addEventListener('click', () => {
    renderHistory();
    historyModal.style.display = 'flex';
});
closeHistoryBtn.addEventListener('click', () => {
    historyModal.style.display = 'none';
});
clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem('mazeGameHistory');
    renderHistory();
});
historyModal.addEventListener('click', (e) => {
    if (e.target === historyModal) {
        historyModal.style.display = 'none';
    }
});

themeSelector.addEventListener('change', (e) => applyTheme(e.target.value));

// 全局交互唤醒音频上下文，杜绝浏览器自动静音策略拦截
window.addEventListener("pointerdown", () => SoundSystem.init(), { once: true });
window.addEventListener("keydown", () => SoundSystem.init(), { once: true });

// 结算弹窗按钮事件
const winModal = document.getElementById("winModal");
const winNextBtn = document.getElementById("winNextBtn");
const winRestartBtn = document.getElementById("winRestartBtn");
const winCloseBtn = document.getElementById("winCloseBtn");

if (winNextBtn) {
  winNextBtn.addEventListener("click", () => {
    if (winModal) winModal.style.display = "none";
    goToNextLevel();
  });
}
if (winRestartBtn) {
  winRestartBtn.addEventListener("click", () => {
    if (winModal) winModal.style.display = "none";
    newMaze();
  });
}
if (winCloseBtn) {
  winCloseBtn.addEventListener("click", () => {
    if (winModal) winModal.style.display = "none";
  });
}
if (winModal) {
  winModal.addEventListener("click", (e) => {
    if (e.target === winModal) winModal.style.display = "none";
  });
}

// 初始化
const savedTheme = localStorage.getItem('mazeTheme') || 'dark';
themeSelector.value = savedTheme;
applyTheme(savedTheme);

applyDifficulty(); // Use this to set initial UI state correctly
if (rafId) cancelAnimationFrame(rafId);
rafId = requestAnimationFrame(tick);