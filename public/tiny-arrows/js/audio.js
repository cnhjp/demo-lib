// ==========================================
// Web Audio 纯原生音效合成器模块
// ==========================================

export class SoundSynth {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.masterGain = null;
    this.compressor = null;
    this.noiseBuffer = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.ctx && !this.masterGain) {
      // 整体主输出总线：放大音量并串接动态压限器，确保声音大且绝不爆音
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.65, this.ctx.currentTime);

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(15, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
    }
    if (this.ctx && !this.noiseBuffer) {
      // 预先合成 0.6 秒白噪声缓存，供逼真空气摩擦/破空声快速调用
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.6);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
  }

  get output() {
    return this.masterGain || this.ctx?.destination;
  }

  // 爽脆破空“咻——”声 (空气摩擦带通扫频白噪声 + 高频正弦音芯)
  playWhoosh() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const dur = 0.22;

    // 1. 空气摩擦撕裂白噪声 (Bandpass Swept Noise 模拟真实破空气流)
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(3.6, now);
      filter.frequency.setValueAtTime(850, now);
      filter.frequency.exponentialRampToValueAtTime(3800, now + dur * 0.38);
      filter.frequency.exponentialRampToValueAtTime(1100, now + dur);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.001, now);
      noiseGain.gain.linearRampToValueAtTime(0.72, now + 0.025);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.output);

      noise.start(now);
      noise.stop(now + dur);
    }

    // 2. 破空尖啸音芯 (正弦波动态扫频)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + dur * 0.36);
    osc.frequency.exponentialRampToValueAtTime(550, now + dur);

    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.linearRampToValueAtTime(0.45, now + 0.025);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(oscGain);
    oscGain.connect(this.output);

    osc.start(now);
    osc.stop(now + dur);
  }

  // 受阻钝击木鱼声
  playBonk() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.14);

    gain.gain.setValueAtTime(0.48, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.output);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  // 出错扣时降频警报音效
  playPenalty() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(75, now + 0.22);

    gain.gain.setValueAtTime(0.38, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.output);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  // 撤销时间倒流神秘升频音效
  playRewind() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.3);

    gain.gain.setValueAtTime(0.36, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.output);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  // 拾取奖励/提示清脆和弦
  playBonus() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const notes = [659.25, 880, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime + idx * 0.05;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.output);
      osc.start(now);
      osc.stop(now + 0.22);
    });
  }

  // 倒计时紧急滴答
  playTick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, now);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.output);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  // 通关喜庆琶音
  playWin() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime + idx * 0.09;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.42, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.output);
      osc.start(now);
      osc.stop(now + 0.35);
    });
  }
}
