/**
 * 《墨韵蛙影》低沉魔性奶蛙笑声与古琴雅韵合成器（Web Audio API）
 * 重点参考奶蛙经典降调魔性笑声：「齁-齁-齁-齁——」低沉胸腔共鸣 + 咽喉共振峰滤波 + 气声喘息感
 */
class InkAudioEngine {
  constructor() {
    this.ctx = null;
    this.mode = "off"; // 'off' | 'ya' | 'meme'
    this.lastTriggerMap = new Map();
    this.guqinTimer = null;
    // 中国五声音阶（低八度至中音区）
    this.pentatonic = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
    this.noiseBuffer = null;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.createNoiseBuffer();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  createNoiseBuffer() {
    if (!this.ctx) return;
    const len = this.ctx.sampleRate * 0.5;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buf;
  }

  cycleMode() {
    const order = ["meme", "ya", "off"];
    const next = order[(order.indexOf(this.mode) + 1) % order.length];
    this.setMode(next);
    return this.mode;
  }

  setMode(nextMode) {
    this.mode = nextMode;
    if (nextMode === "off") {
      this.stopAmbientGuqin();
    } else {
      this.ensureContext();
      this.startAmbientGuqin();
      if (nextMode === "meme") {
        // 开启魔音时直接来一声低沉「齁齁齁」预览反馈
        this.playDeepNaiwaLaugh(false);
      } else {
        this.playGuqinNote(this.pentatonic[3], 0.08, 1.4);
      }
    }
  }

  // 古琴余韵泛音
  playGuqinNote(freq, volume = 0.05, duration = 1.9) {
    if (this.mode === "off") return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const harmonic = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.005, now + 0.14);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 0.45);

    harmonic.type = "sine";
    harmonic.frequency.setValueAtTime(freq * 2, now);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(340, now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    harmonic.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    harmonic.start(now);
    osc.stop(now + duration + 0.05);
    harmonic.stop(now + duration + 0.05);
  }

  startAmbientGuqin() {
    this.stopAmbientGuqin();
    let step = 0;
    const pattern = [0, 3, 4, 2, 5, 3, 1, 0];
    this.guqinTimer = setInterval(() => {
      if (this.mode === "off" || document.hidden) return;
      const idx = pattern[step % pattern.length];
      step++;
      if (Math.random() < 0.65) {
        this.playGuqinNote(this.pentatonic[idx] * 0.5, 0.022, 2.8);
      }
    }, 2600);
  }

  stopAmbientGuqin() {
    if (this.guqinTimer) {
      clearInterval(this.guqinTimer);
      this.guqinTimer = null;
    }
  }

  /**
   * 奶蛙标志性「低沉魔性齁齁笑声」双共振峰声学合成
   * - 基频落在男低音区 92Hz ~ 132Hz（告别高频尖锐电子鸡叫）
   * - 经过口腔共振峰 F1 (420Hz) + F2 (780Hz) 塑形出厚重「齁/哈」音色
   * - 每次笑声前加短促带通气声冲击，真实还原「齁-齁-齁-齁-呵~」的憋笑喘息节奏
   */
  playDeepNaiwaLaugh(isPoke = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;
    // 笑声节拍：越来越沉、带喘息顿挫感
    const syllables = isPoke
      ? [
          { off: 0.00, f0: 126, dur: 0.13, f1: 480 },
          { off: 0.14, f0: 132, dur: 0.12, f1: 500 },
          { off: 0.27, f0: 118, dur: 0.13, f1: 450 },
          { off: 0.41, f0: 110, dur: 0.14, f1: 420 },
          { off: 0.56, f0: 98,  dur: 0.22, f1: 380 }
        ]
      : [
          { off: 0.00, f0: 118, dur: 0.13, f1: 460 },
          { off: 0.15, f0: 124, dur: 0.12, f1: 470 },
          { off: 0.29, f0: 108, dur: 0.14, f1: 420 },
          { off: 0.45, f0: 96,  dur: 0.20, f1: 370 }
        ];

    syllables.forEach((s) => {
      const start = t0 + s.off;
      // 1. 声带脉冲源（锯齿波 + 低八度副振荡增强胸腔厚度）
      const osc = ctx.createOscillator();
      const subOsc = ctx.createOscillator();
      osc.type = "sawtooth";
      subOsc.type = "triangle";

      osc.frequency.setValueAtTime(s.f0 * 0.92, start);
      osc.frequency.exponentialRampToValueAtTime(s.f0 * 1.12, start + s.dur * 0.35);
      osc.frequency.exponentialRampToValueAtTime(s.f0 * 0.80, start + s.dur);

      subOsc.frequency.setValueAtTime(s.f0 * 0.5, start);
      subOsc.frequency.exponentialRampToValueAtTime(s.f0 * 0.42, start + s.dur);

      // 2. 轻微喉音颤动（24Hz 粗糙胸腔振动）
      const vibrato = ctx.createOscillator();
      const vibGain = ctx.createGain();
      vibrato.frequency.setValueAtTime(24, start);
      vibGain.gain.setValueAtTime(6.5, start);
      vibrato.connect(vibGain);
      vibGain.connect(osc.frequency);

      // 3. 双并联共振峰带通滤波（塑形「齁 / 哈」低沉共鸣腔）
      const f1Filter = ctx.createBiquadFilter();
      f1Filter.type = "bandpass";
      f1Filter.frequency.setValueAtTime(s.f1, start);
      f1Filter.Q.setValueAtTime(4.2, start);

      const f2Filter = ctx.createBiquadFilter();
      f2Filter.type = "bandpass";
      f2Filter.frequency.setValueAtTime(s.f1 * 1.75, start);
      f2Filter.Q.setValueAtTime(5.0, start);

      const lowShelf = ctx.createBiquadFilter();
      lowShelf.type = "lowpass";
      lowShelf.frequency.setValueAtTime(1100, start);

      const env = ctx.createGain();
      const peakVol = isPoke ? 0.22 : 0.16;
      env.gain.setValueAtTime(0.001, start);
      env.gain.linearRampToValueAtTime(peakVol, start + 0.025);
      env.gain.exponentialRampToValueAtTime(0.001, start + s.dur);

      osc.connect(f1Filter);
      osc.connect(f2Filter);
      subOsc.connect(lowShelf);

      f1Filter.connect(env);
      f2Filter.connect(env);
      lowShelf.connect(env);
      env.connect(ctx.destination);

      osc.start(start);
      subOsc.start(start);
      vibrato.start(start);
      osc.stop(start + s.dur + 0.02);
      subOsc.stop(start + s.dur + 0.02);
      vibrato.stop(start + s.dur + 0.02);

      // 4. 气声呼气爆发（h- 气音质感）
      if (this.noiseBuffer) {
        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const nFilter = ctx.createBiquadFilter();
        nFilter.type = "bandpass";
        nFilter.frequency.setValueAtTime(620, start);
        nFilter.Q.setValueAtTime(1.8, start);
        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.001, start);
        nGain.gain.linearRampToValueAtTime(0.045, start + 0.015);
        nGain.gain.exponentialRampToValueAtTime(0.001, start + 0.07);
        noise.connect(nFilter);
        nFilter.connect(nGain);
        nGain.connect(ctx.destination);
        noise.start(start);
        noise.stop(start + 0.08);
      }
    });
  }

  // 根据画作对应动作播放 6 种截然不同的专属低沉趣味音效（不再只有大笑）
  playPortraitEffect(style, isPoke = false) {
    if (this.mode === "off") return;
    const nowMs = performance.now();
    const last = this.lastTriggerMap.get(style) || 0;
    if (!isPoke && nowMs - last < 1050) return;
    this.lastTriggerMap.set(style, nowMs);

    const ctx = this.ensureContext();
    if (!ctx) return;

    if (this.mode === "ya") {
      const note = this.pentatonic[Math.floor(Math.random() * this.pentatonic.length)];
      this.playGuqinNote(note, isPoke ? 0.08 : 0.05, 1.5);
      return;
    }

    switch (style) {
      case "belly-laugh":
        // 01《泼墨蛙仙》：招牌低沉胸腔「齁-齁-齁」捧腹大笑
        this.playDeepNaiwaLaugh(isPoke);
        break;
      case "sway-chant":
        // 02《青莲蛙吟》：嘚瑟摇摆节奏「咚-哒-啵-哒」
        this.playSwayGroove(ctx, isPoke);
        break;
      case "hug-laugh":
        // 03《一团蛙气》：双蛙一高一低交错憨笑「嘿-齁-嘿-齁」
        this.playDuoChuckle(ctx, isPoke);
        break;
      case "sad-sob":
        // 04《秋风纨扇》：委屈降调抽泣「呜-呜-嘤-哼」
        this.playSadSob(ctx);
        break;
      case "zen-chuckle":
        // 05《古禅调心》：木鱼一声「叩」+ 惊醒呆萌「嗯？！」
        this.playZenStartle(ctx);
        break;
      case "head-tilt":
        // 06《波臣蛙公》：歪头疑惑「咦——嗯？」低沉滑音
        this.playHeadTiltHuh(ctx);
        break;
      default:
        this.playDeepNaiwaLaugh(isPoke);
    }
  }

  // 02 快乐摇摆低音律动：「咚-哒-啵-哒」
  playSwayGroove(ctx, isPoke) {
    const t0 = ctx.currentTime;
    const steps = [
      { off: 0.00, f1: 115, f2: 145, dur: 0.12 },
      { off: 0.16, f1: 155, f2: 120, dur: 0.11 },
      { off: 0.31, f1: 125, f2: 175, dur: 0.14 },
      { off: 0.48, f1: 140, f2: 110, dur: 0.16 }
    ];
    steps.forEach((st) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(st.f1, t0 + st.off);
      osc.frequency.exponentialRampToValueAtTime(st.f2, t0 + st.off + st.dur);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(620, t0 + st.off);
      g.gain.setValueAtTime(0.001, t0 + st.off);
      g.gain.linearRampToValueAtTime(isPoke ? 0.18 : 0.13, t0 + st.off + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + st.off + st.dur);
      osc.connect(filter);
      filter.connect(g);
      g.connect(ctx.destination);
      osc.start(t0 + st.off);
      osc.stop(t0 + st.off + st.dur + 0.02);
    });
  }

  // 03 双蛙交错憨笑：「嘿-齁-嘿-齁」
  playDuoChuckle(ctx, isPoke) {
    const t0 = ctx.currentTime;
    const notes = [
      { off: 0.00, f0: 142, dur: 0.11 },
      { off: 0.13, f0: 102, dur: 0.13 },
      { off: 0.28, f0: 136, dur: 0.11 },
      { off: 0.41, f0: 96,  dur: 0.18 }
    ];
    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const bp = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(n.f0, t0 + n.off);
      osc.frequency.exponentialRampToValueAtTime(n.f0 * 0.85, t0 + n.off + n.dur);
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(480, t0 + n.off);
      bp.Q.setValueAtTime(3.6, t0 + n.off);
      g.gain.setValueAtTime(0.001, t0 + n.off);
      g.gain.linearRampToValueAtTime(isPoke ? 0.18 : 0.13, t0 + n.off + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + n.off + n.dur);
      osc.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      osc.start(t0 + n.off);
      osc.stop(t0 + n.off + n.dur + 0.02);
    });
  }

  // 04 委屈抽泣：「呜-呜-嘤-哼」
  playSadSob(ctx) {
    const t0 = ctx.currentTime;
    [0, 0.22, 0.44].forEach((off, i) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = "triangle";
      const f = 175 - i * 14;
      osc.frequency.setValueAtTime(f, t0 + off);
      osc.frequency.exponentialRampToValueAtTime(f * 0.74, t0 + off + 0.19);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(520, t0 + off);
      g.gain.setValueAtTime(0.001, t0 + off);
      g.gain.linearRampToValueAtTime(0.12, t0 + off + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + off + 0.20);
      osc.connect(filter);
      filter.connect(g);
      g.connect(ctx.destination);
      osc.start(t0 + off);
      osc.stop(t0 + off + 0.21);
    });
  }

  // 05 古禅木鱼「叩」+ 惊醒「嗯？！」
  playZenStartle(ctx) {
    const t0 = ctx.currentTime;
    // 木鱼叩击
    const wood = ctx.createOscillator();
    const wg = ctx.createGain();
    wood.type = "sine";
    wood.frequency.setValueAtTime(340, t0);
    wood.frequency.exponentialRampToValueAtTime(190, t0 + 0.09);
    wg.gain.setValueAtTime(0.001, t0);
    wg.gain.linearRampToValueAtTime(0.16, t0 + 0.008);
    wg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
    wood.connect(wg);
    wg.connect(ctx.destination);
    wood.start(t0);
    wood.stop(t0 + 0.18);

    // 惊醒低沉「嗯？！」
    const huh = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const hg = ctx.createGain();
    huh.type = "triangle";
    huh.frequency.setValueAtTime(115, t0 + 0.20);
    huh.frequency.exponentialRampToValueAtTime(210, t0 + 0.36);
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(640, t0 + 0.20);
    hg.gain.setValueAtTime(0.001, t0 + 0.20);
    hg.gain.linearRampToValueAtTime(0.14, t0 + 0.23);
    hg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.40);
    huh.connect(lp);
    lp.connect(hg);
    hg.connect(ctx.destination);
    huh.start(t0 + 0.20);
    huh.stop(t0 + 0.42);
  }

  // 06 歪头杀疑惑：「咦——嗯？」
  playHeadTiltHuh(ctx) {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(145, t0);
    osc.frequency.exponentialRampToValueAtTime(108, t0 + 0.15);
    osc.frequency.exponentialRampToValueAtTime(195, t0 + 0.38);
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(580, t0);
    g.gain.setValueAtTime(0.001, t0);
    g.gain.linearRampToValueAtTime(0.15, t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.42);
    osc.connect(lp);
    lp.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.44);
  }

  playWhooshInk() {
    if (this.mode === "off") return;
    this.playGuqinNote(392.0, 0.06, 1.4);
  }
}

window.InkAudio = new InkAudioEngine();
