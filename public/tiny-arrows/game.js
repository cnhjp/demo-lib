// ==========================================
// 小小箭头 (Tiny Arrows) - 游戏主调度控制器
// ==========================================

import { DIRS, SHAPES, GAME_RULES } from './js/constants.js';
import { SoundSynth } from './js/audio.js';
import { buildArrowSvgGeometry } from './js/geometry.js';
import { checkArrowClearance, checkFlightLoot } from './js/physics.js';
import { generateLevel } from './js/generator.js';
import { animateSlitherFlowOut, animateSlitherRewindIn } from './js/animator.js';
import { AutoSolver } from './js/solver.js';

class TinyArrowsGame {
  constructor() {
    this.sound = new SoundSynth();
    this.shapeKey = 'rect';
    this.difficulty = 'medium';

    this.rows = 24;
    this.cols = 16;
    this.cellSize = 20;

    this.arrows = [];
    this.hourglasses = [];
    this.initialArrows = [];
    this.initialHourglasses = [];

    this.history = [];
    this.moves = 0;

    this.totalTime = GAME_RULES.BASE_TIME_LIMIT;
    this.timeLeft = GAME_RULES.BASE_TIME_LIMIT;
    this.timerInterval = null;

    this.isRewinding = false;
    this.showAllMovable = false;
    this.currentHintLaser = null;

    this.initDOM();
    this.initSolver();
    this.bindEvents();
    this.startNewGame();
  }

  initDOM() {
    this.dom = {
      shapeSelect: document.getElementById('shape-select'),
      diffSelect: document.getElementById('difficulty-select'),
      btnNewGame: document.getElementById('btn-new-game'),
      btnHint: document.getElementById('btn-hint'),
      btnToggleEye: document.getElementById('btn-toggle-eye'),
      eyeStatusText: document.getElementById('eye-status-text'),
      btnAutoSolve: document.getElementById('btn-autosolve'),
      btnUndo: document.getElementById('btn-undo'),
      btnRestart: document.getElementById('btn-restart'),
      btnMute: document.getElementById('btn-mute'),

      statTime: document.getElementById('stat-time'),
      statRemaining: document.getElementById('stat-remaining'),
      statMoves: document.getElementById('stat-moves'),
      timerBarFill: document.getElementById('timer-bar-fill'),

      boardContainer: document.getElementById('board-container'),
      flightOverlay: document.getElementById('fullscreen-flight-overlay'),

      autoSolvePanel: document.getElementById('autosolve-panel'),
      btnStopAuto: document.getElementById('btn-stop-auto'),
      speedSlider: document.getElementById('speed-slider'),
      speedValueText: document.getElementById('speed-value-text'),

      winModal: document.getElementById('win-modal'),
      winDesc: document.getElementById('win-desc'),
      btnModalNewGame: document.getElementById('btn-modal-new-game'),

      gameoverModal: document.getElementById('gameover-modal'),
      btnAddTime: document.getElementById('btn-add-time'),
      btnRetry: document.getElementById('btn-retry')
    };

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.classList.add('game-svg-canvas');
    this.dom.boardContainer.appendChild(this.svg);
  }

  initSolver() {
    this.solver = new AutoSolver({
      getMovableArrows: () => this.getMovableArrows(),
      onStep: (pick, flightDuration, nextCallback) => {
        this.sound.playWhoosh();
        this.moves++;
        this.triggerFlightLoot(pick);

        const boardRect = this.svg.getBoundingClientRect();
        const svgW = this.cols * this.cellSize;
        const svgH = this.rows * this.cellSize;

        animateSlitherFlowOut({
          arrow: pick,
          flightOverlayEl: this.dom.flightOverlay,
          cellSize: this.cellSize,
          boardRect,
          svgWidth: svgW,
          svgHeight: svgH,
          durationOverride: flightDuration,
          onComplete: () => {
            this.arrows = this.arrows.filter(a => a.id !== pick.id);
            this.updateStats();
            this.checkWin();
            this.updateMovableHighlights();
            nextCallback(this.arrows.length);
          }
        });
      },
      onFinish: () => this.stopAutoSolve(),
      onBlocked: () => {
        alert('当前盘面无直接可飞出箭头，请尝试撤销上一步！');
        this.stopAutoSolve();
      }
    });
  }

  bindEvents() {
    this.dom.shapeSelect.addEventListener('change', (e) => {
      this.shapeKey = e.target.value;
      this.startNewGame();
    });

    this.dom.diffSelect.addEventListener('change', (e) => {
      this.difficulty = e.target.value;
      this.startNewGame();
    });

    this.dom.btnNewGame.addEventListener('click', () => this.startNewGame());
    this.dom.btnRestart.addEventListener('click', () => this.restartCurrentLevel());
    this.dom.btnUndo.addEventListener('click', () => this.undo());
    this.dom.btnHint.addEventListener('click', () => this.showHint());
    if (this.dom.btnToggleEye) {
      this.dom.btnToggleEye.addEventListener('click', () => this.toggleHighlightAllMovable());
    }

    this.dom.btnAutoSolve.addEventListener('click', () => this.startAutoSolve());
    this.dom.btnStopAuto.addEventListener('click', () => this.stopAutoSolve());

    this.dom.speedSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.solver.setSpeed(val);
      this.dom.speedValueText.textContent = `${(val / 100).toFixed(1)}x`;
    });

    this.dom.btnMute.addEventListener('click', () => {
      this.sound.muted = !this.sound.muted;
      this.dom.btnMute.textContent = this.sound.muted ? '🔇 静音' : '🔊 声音';
    });

    this.dom.btnModalNewGame.addEventListener('click', () => {
      this.dom.winModal.classList.remove('show');
      this.startNewGame();
    });

    this.dom.btnAddTime.addEventListener('click', () => {
      this.dom.gameoverModal.classList.remove('show');
      this.timeLeft += 30;
      this.startTimer();
    });

    this.dom.btnRetry.addEventListener('click', () => {
      this.dom.gameoverModal.classList.remove('show');
      this.restartCurrentLevel();
    });
  }

  // ==========================================
  // 关卡数据初始化与重置
  // ==========================================
  startNewGame() {
    const levelData = generateLevel({
      shapeKey: this.shapeKey,
      difficulty: this.difficulty
    });

    this.rows = levelData.rows;
    this.cols = levelData.cols;
    this.totalTime = levelData.totalTime;

    this.initialArrows = levelData.arrows.map(a => ({ ...a, cells: [...a.cells] }));
    this.initialHourglasses = levelData.hourglasses.map(h => ({ ...h }));

    this.restartCurrentLevel();
  }

  restartCurrentLevel() {
    this.stopAutoSolve();
    this.isRewinding = false;
    this.dom.winModal.classList.remove('show');
    this.dom.gameoverModal.classList.remove('show');

    this.arrows = this.initialArrows.map(a => ({ ...a, cells: [...a.cells] }));
    this.hourglasses = (this.initialHourglasses || []).map(h => ({ ...h }));

    this.history = [];
    this.moves = 0;
    this.timeLeft = this.totalTime;
    this.startTimer();
    this.renderBoard();
  }

  // ==========================================
  // 棋盘渲染 (高精微距矢量)
  // ==========================================
  renderBoard() {
    this.svg.innerHTML = '';

    let cellSize = 22;
    if (this.rows >= 28) cellSize = 18.5; // 困难模式
    else if (this.rows >= 24) cellSize = 20.5; // 中等模式
    else cellSize = 23; // 简单模式
    this.cellSize = cellSize;

    const width = this.cols * cellSize;
    const height = this.rows * cellSize;
    this.svg.setAttribute('width', width);
    this.svg.setAttribute('height', height);
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const S = this.cellSize;

    // 渲染精致时间漏斗 (金色微光，只作贯穿加时)
    this.hourglasses.forEach(hg => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'hourglass-item');
      g.setAttribute('transform', `translate(${hg.c * S + S / 2}, ${hg.r * S + S / 2})`);
      g.innerHTML = `
        <circle r="${S * 0.38}" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.2" stroke-dasharray="2.5 1.5" />
        <text y="${S * 0.16}" text-anchor="middle" font-size="${S * 0.44}">⏳</text>
      `;
      this.svg.appendChild(g);
      hg.el = g;
    });

    // 渲染规整正交折线箭头
    this.arrows.forEach(arrow => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'arrow-group');
      g.dataset.id = arrow.id;

      const geom = buildArrowSvgGeometry(arrow, S);
      arrow.geometry = geom;
      arrow.groupEl = g;

      const body = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      body.setAttribute('class', 'arrow-body');
      body.setAttribute('points', geom.shaftPointsStr);
      body.setAttribute('fill', 'none');
      body.setAttribute('stroke', arrow.color);
      body.setAttribute('stroke-width', geom.shaftWidth);

      const head = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      head.setAttribute('class', 'arrow-head');
      head.setAttribute('points', geom.headPointsStr);
      head.setAttribute('fill', arrow.color);

      g.appendChild(body);
      g.appendChild(head);
      g.addEventListener('click', () => this.handleArrowShoot(arrow.id));
      this.svg.appendChild(g);
    });

    this.updateStats();
    this.updateMovableHighlights();
  }

  // ==========================================
  // 交互控制：点击射出与失误扣时反馈
  // ==========================================
  handleArrowShoot(arrowId) {
    if (this.solver.isAutoSolving || this.isRewinding) return;

    const arrow = this.arrows.find(a => a.id === arrowId);
    if (!arrow) return;

    const res = checkArrowClearance(arrow, this.arrows, this.rows, this.cols);

    if (!res.clear) {
      this.sound.playBonk();
      this.sound.playPenalty();

      // 出错扣除 5 秒惩罚时间
      this.timeLeft = Math.max(0, this.timeLeft - GAME_RULES.PENALTY_SECONDS);
      this.spawnFloatingPenalty(arrow.head.c, arrow.head.r);

      if (this.dom.statTime) {
        this.dom.statTime.classList.remove('time-penalty-pulse');
        void this.dom.statTime.offsetWidth;
        this.dom.statTime.classList.add('time-penalty-pulse');
      }
      this.updateStats();

      // 箭头受阻震颤抖动
      arrow.groupEl.classList.remove('arrow-blocked-shake');
      void arrow.groupEl.offsetWidth;
      arrow.groupEl.classList.add('arrow-blocked-shake');

      // 阻挡方警示
      if (res.blocker && res.blocker.groupEl) {
        const targetEl = res.blocker.groupEl;
        targetEl.classList.remove('arrow-blocker-warning');
        void targetEl.offsetWidth;
        targetEl.classList.add('arrow-blocker-warning');
        setTimeout(() => targetEl.classList.remove('arrow-blocker-warning'), 1000);
      }

      if (this.timeLeft <= 0) {
        this.handleTimeout();
      }
    } else {
      this.sound.playWhoosh();
      this.moves++;

      const looted = this.triggerFlightLoot(arrow);
      this.history.push({ ...arrow, cells: [...arrow.cells], lootedHourglasses: looted || [] });

      const boardRect = this.svg.getBoundingClientRect();
      const svgW = this.cols * this.cellSize;
      const svgH = this.rows * this.cellSize;

      animateSlitherFlowOut({
        arrow,
        flightOverlayEl: this.dom.flightOverlay,
        cellSize: this.cellSize,
        boardRect,
        svgWidth: svgW,
        svgHeight: svgH,
        onComplete: () => {
          this.arrows = this.arrows.filter(a => a.id !== arrowId);
          this.updateStats();
          this.checkWin();
          this.updateMovableHighlights();
        }
      });
    }
  }

  // 飞行穿透拾取漏斗
  triggerFlightLoot(arrow) {
    const looted = checkFlightLoot(arrow, this.hourglasses, this.rows, this.cols);
    looted.forEach(hg => {
      if (hg.el) {
        hg.el.style.transform += ' scale(1.4)';
        hg.el.style.opacity = '0';
        setTimeout(() => hg.el?.remove(), 300);
      }
      this.timeLeft += GAME_RULES.HOURGLASS_BONUS_SECONDS;
      this.sound.playBonus();
      this.spawnFloatingBonus(hg.c, hg.r);

      if (this.dom.statTime) {
        this.dom.statTime.classList.remove('time-bonus-pulse');
        void this.dom.statTime.offsetWidth;
        this.dom.statTime.classList.add('time-bonus-pulse');
      }
    });
    return looted;
  }

  spawnFloatingBonus(c, r) {
    const floatEl = document.createElement('div');
    floatEl.className = 'floating-bonus-text';
    floatEl.textContent = `+${GAME_RULES.HOURGLASS_BONUS_SECONDS}s`;
    const S = this.cellSize;
    floatEl.style.left = `${c * S + S / 2 + 10}px`;
    floatEl.style.top = `${r * S + S / 2 + 10}px`;
    this.dom.boardContainer.appendChild(floatEl);
    setTimeout(() => floatEl.remove(), 1100);
  }

  spawnFloatingPenalty(c, r) {
    const floatEl = document.createElement('div');
    floatEl.className = 'floating-penalty-text';
    floatEl.textContent = `-${GAME_RULES.PENALTY_SECONDS}s`;
    const S = this.cellSize;
    floatEl.style.left = `${c * S + S / 2 + 10}px`;
    floatEl.style.top = `${r * S + S / 2 + 10}px`;
    this.dom.boardContainer.appendChild(floatEl);
    setTimeout(() => floatEl.remove(), 1100);
  }

  // ==========================================
  // 撤销：时间倒流逆向归位
  // ==========================================
  undo() {
    if (this.solver.isAutoSolving || this.isRewinding || this.history.length === 0) return;
    this.isRewinding = true;

    const last = this.history.pop();

    // 回滚该步射出拾取的漏斗与时间奖励
    if (last.lootedHourglasses && last.lootedHourglasses.length > 0) {
      last.lootedHourglasses.forEach(hg => {
        this.hourglasses.push({ id: hg.id, r: hg.r, c: hg.c });
      });
      this.timeLeft = Math.max(1, this.timeLeft - GAME_RULES.HOURGLASS_BONUS_SECONDS * last.lootedHourglasses.length);
    }

    this.moves = Math.max(0, this.moves - 1);
    this.arrows.push(last);
    this.renderBoard();

    // 重新挂载后先隐藏箭头实际 SVG 节点，由逆流引擎播完后再现身
    if (last.groupEl) {
      last.groupEl.style.visibility = 'hidden';
    }

    this.sound.playRewind();

    const boardRect = this.svg.getBoundingClientRect();
    const svgW = this.cols * this.cellSize;
    const svgH = this.rows * this.cellSize;

    animateSlitherRewindIn({
      arrow: last,
      flightOverlayEl: this.dom.flightOverlay,
      cellSize: this.cellSize,
      boardRect,
      svgWidth: svgW,
      svgHeight: svgH,
      onComplete: () => {
        if (last.groupEl) {
          last.groupEl.style.visibility = 'visible';
        }
        this.isRewinding = false;
        this.updateStats();
        this.updateMovableHighlights();
      }
    });
  }

  // ==========================================
  // 提示与辅助透视系统
  // ==========================================
  getMovableArrows() {
    return this.arrows.filter(a => checkArrowClearance(a, this.arrows, this.rows, this.cols).clear);
  }

  showHint() {
    const movables = this.getMovableArrows();
    if (movables.length === 0) return;

    this.sound.playBonus();
    const pick = movables[Math.floor(Math.random() * movables.length)];

    if (pick.groupEl) {
      pick.groupEl.classList.remove('arrow-movable-ready');
      void pick.groupEl.offsetWidth;
      pick.groupEl.classList.add('arrow-movable-ready');
      setTimeout(() => {
        if (!this.showAllMovable) pick.groupEl?.classList.remove('arrow-movable-ready');
      }, 1600);
    }

    // 绘制射向边缘的高光激光引导虚线
    const S = this.cellSize;
    const { dr, dc } = DIRS[pick.head.dir];
    const geom = pick.geometry?.headGeometry;
    if (geom) {
      const tipX = geom.tipX;
      const tipY = geom.tipY;

      let targetX = tipX;
      let targetY = tipY;
      if (dc > 0) targetX = this.cols * S + 50;
      else if (dc < 0) targetX = -50;
      if (dr > 0) targetY = this.rows * S + 50;
      else if (dr < 0) targetY = -50;

      const laser = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      laser.setAttribute('class', 'guideline-laser');
      laser.setAttribute('x1', tipX);
      laser.setAttribute('y1', tipY);
      laser.setAttribute('x2', targetX);
      laser.setAttribute('y2', targetY);
      laser.setAttribute('stroke', '#06b6d4');
      laser.setAttribute('stroke-width', Math.max(3.5, S * 0.18));
      laser.setAttribute('stroke-linecap', 'round');
      this.svg.appendChild(laser);
      this.currentHintLaser = laser;

      setTimeout(() => {
        if (this.currentHintLaser === laser) {
          laser.remove();
          this.currentHintLaser = null;
        }
      }, 1400);
    }
  }

  toggleHighlightAllMovable() {
    this.showAllMovable = !this.showAllMovable;
    if (this.dom.eyeStatusText) {
      this.dom.eyeStatusText.textContent = this.showAllMovable ? '开' : '关';
    }
    if (this.dom.btnToggleEye) {
      this.dom.btnToggleEye.classList.toggle('active-eye', this.showAllMovable);
    }
    this.updateMovableHighlights();
  }

  updateMovableHighlights() {
    this.arrows.forEach(a => {
      if (a.groupEl) a.groupEl.classList.remove('arrow-movable-ready');
    });
    if (!this.showAllMovable) return;
    const movables = this.getMovableArrows();
    movables.forEach(a => {
      if (a.groupEl) a.groupEl.classList.add('arrow-movable-ready');
    });
  }

  // ==========================================
  // AI 自动解题调度
  // ==========================================
  startAutoSolve() {
    if (this.solver.isAutoSolving) return;
    this.dom.autoSolvePanel.classList.add('active');
    this.dom.btnAutoSolve.disabled = true;
    this.solver.start(this.initialArrows?.length || this.arrows.length);
  }

  stopAutoSolve() {
    this.solver.stop();
    this.dom.autoSolvePanel.classList.remove('active');
    this.dom.btnAutoSolve.disabled = false;
  }

  // ==========================================
  // 倒计时与结算系统
  // ==========================================
  startTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timeLeft--;

      if (this.timeLeft <= 10 && this.timeLeft > 0) {
        this.sound.playTick();
      }

      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.handleTimeout();
      }

      this.updateStats();
    }, 1000);
  }

  handleTimeout() {
    clearInterval(this.timerInterval);
    this.stopAutoSolve();
    this.sound.playBonk();
    this.dom.gameoverModal.classList.add('show');
  }

  updateStats() {
    this.dom.statRemaining.textContent = this.arrows.length;
    this.dom.statMoves.textContent = this.moves;

    const m = String(Math.floor(this.timeLeft / 60)).padStart(2, '0');
    const s = String(this.timeLeft % 60).padStart(2, '0');
    this.dom.statTime.textContent = `${m}:${s}`;

    const pct = Math.max(0, Math.min(100, (this.timeLeft / this.totalTime) * 100));
    this.dom.timerBarFill.style.width = `${pct}%`;

    const isUrgent = this.timeLeft <= 15;
    this.dom.statTime.classList.toggle('urgent', isUrgent);
    this.dom.timerBarFill.classList.toggle('urgent', isUrgent);
  }

  checkWin() {
    if (this.arrows.length === 0) {
      clearInterval(this.timerInterval);
      this.sound.playWin();
      setTimeout(() => {
        this.dom.winDesc.textContent = `完美清屏！剩余时间 ${this.dom.statTime.textContent}，仅用 ${this.moves} 步解救所有折线箭头！`;
        this.dom.winModal.classList.add('show');
      }, 400);
    }
  }
}

// 启动
window.addEventListener('DOMContentLoaded', () => {
  window.game = new TinyArrowsGame();
});
