// ==========================================
// Web Audio 纯原生音效合成器模块 (纯物理声学建模)
// ==========================================

import { AUDIO_PRESETS } from './constants.js';

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
      // 整体主输出总线：纯净增益与动态压限，手机外放纯净无杂音
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-8, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.12, this.ctx.currentTime);

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
    }
    if (this.ctx && !this.pinkNoiseBuffer) {
      // 预先合成 0.5 秒柔和粉红噪声 (用于真实气流位移破风声，零高频刺耳毛刺)
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.5);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.12;
        b6 = white * 0.115926;
      }
      this.pinkNoiseBuffer = buffer;
    }
  }

  get output() {
    return this.masterGain || this.ctx?.destination;
  }

  // 真实物理气动破风“咻——”声 (柔和气流位移 + 温润木质瞬态微击，极度解压且毫无电音感)
  playWhoosh() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const cfgSwish = AUDIO_PRESETS.SWISH;
    const cfgSnap = AUDIO_PRESETS.WOOD_SNAP;
    const cfgAir = AUDIO_PRESETS.AIR_BODY;
    const pitchVar = 1.0 + (Math.random() - 0.5) * cfgSwish.pitchVariation;

    // 1. 真实羽箭气流破风层 (粉红声学湍流 + 双二阶动态平滑扫频，优雅俯冲，软阻尼 Q=1.2)
    if (this.pinkNoiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.pinkNoiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(cfgSwish.bandpassQ, now);
      filter.frequency.setValueAtTime(cfgSwish.startFreq * pitchVar, now);
      filter.frequency.exponentialRampToValueAtTime(cfgSwish.endFreq * pitchVar, now + cfgSwish.duration);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.linearRampToValueAtTime(cfgSwish.gainPeak, now + 0.018);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + cfgSwish.duration);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.output);

      noise.start(now);
      noise.stop(now + cfgSwish.duration);
    }

    // 2. 温润木质解压微弹 (Marimba/Wood Snap: 420Hz -> 180Hz 20ms 饱满圆润瞬态，赋能手指触感)
    const pop = this.ctx.createOscillator();
    const popGain = this.ctx.createGain();

    pop.type = 'sine';
    pop.frequency.setValueAtTime(cfgSnap.startFreq * pitchVar, now);
    pop.frequency.exponentialRampToValueAtTime(cfgSnap.endFreq * pitchVar, now + cfgSnap.duration);

    popGain.gain.setValueAtTime(cfgSnap.gainPeak, now);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + cfgSnap.duration);

    pop.connect(popGain);
    popGain.connect(this.output);

    pop.start(now);
    pop.stop(now + cfgSnap.duration);

    // 3. 伴随低频空气气垫 (Subtle Air Body: 增加箭体飞掠的真实物理量感)
    const airBody = this.ctx.createOscillator();
    const airGain = this.ctx.createGain();

    airBody.type = 'sine';
    airBody.frequency.setValueAtTime(cfgAir.startFreq * pitchVar, now);
    airBody.frequency.exponentialRampToValueAtTime(cfgAir.endFreq, now + cfgAir.duration);

    airGain.gain.setValueAtTime(cfgAir.gainPeak, now);
    airGain.gain.exponentialRampToValueAtTime(0.001, now + cfgAir.duration);

    airBody.connect(airGain);
    airGain.connect(this.output);

    airBody.start(now);
    airBody.stop(now + cfgAir.duration);
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
