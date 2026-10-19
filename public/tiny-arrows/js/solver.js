// ==========================================
// AI 自动解题器与动态心流节拍控制引擎
// ==========================================

export class AutoSolver {
  constructor({
    getMovableArrows,
    onStep,
    onFinish,
    onBlocked
  }) {
    this.getMovableArrows = getMovableArrows;
    this.onStep = onStep;
    this.onFinish = onFinish;
    this.onBlocked = onBlocked;

    this.isAutoSolving = false;
    this.autoSolveTimer = null;
    this.autoSolveSpeed = 140; // 内部基准速度
  }

  setSpeed(val) {
    this.autoSolveSpeed = 460 - val;
  }

  start(totalArrowsCount) {
    if (this.isAutoSolving) return;
    this.isAutoSolving = true;

    const totalSteps = totalArrowsCount;

    const step = (remainingCount) => {
      if (!this.isAutoSolving || remainingCount === 0) {
        this.stop();
        this.onFinish?.();
        return;
      }

      const movables = this.getMovableArrows();
      if (movables.length === 0) {
        this.stop();
        this.onBlocked?.();
        return;
      }

      const pick = movables[0];

      // 动态非线性心流节奏曲线（前 12% 适度启动 -> 中段 73% 疾风暴雨扫射 -> 后 15% 沉稳慢收官）
      const progress = (totalSteps - remainingCount) / Math.max(1, totalSteps);
      let baseDelay = 42;
      let baseFlightDur = 160;

      if (progress < 0.12) {
        // 慢启动阶段：从 150ms 平滑加速至 50ms
        const t = progress / 0.12;
        baseDelay = 150 - t * 100;
        baseFlightDur = 240 - t * 80;
      } else if (progress > 0.85) {
        // 慢收尾阶段：从 50ms 平缓降速至 220ms
        const t = (progress - 0.85) / 0.15;
        baseDelay = 50 + t * 170;
        baseFlightDur = 160 + t * 80;
      } else {
        // 中间高潮暴风雨阶段：极速机关枪连发（42ms 超高速）
        baseDelay = 42;
        baseFlightDur = 150;
      }

      // 用户速度滑块倍率微调
      const userSpeedMultiplier = (460 - this.autoSolveSpeed) / 280;
      const finalDelay = Math.max(20, Math.round(baseDelay / Math.max(0.3, userSpeedMultiplier)));
      const finalFlightDur = Math.max(110, Math.round(baseFlightDur / Math.max(0.3, userSpeedMultiplier)));

      this.onStep(pick, finalFlightDur, (nextRemainingCount) => {
        if (this.isAutoSolving && nextRemainingCount > 0) {
          this.autoSolveTimer = setTimeout(() => step(nextRemainingCount), finalDelay);
        } else {
          this.stop();
          this.onFinish?.();
        }
      });
    };

    step(totalSteps);
  }

  stop() {
    this.isAutoSolving = false;
    if (this.autoSolveTimer) {
      clearTimeout(this.autoSolveTimer);
      this.autoSolveTimer = null;
    }
  }
}
