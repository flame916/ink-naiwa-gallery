/**
 * 《墨韵蛙影》哈利·波特式动态画框引擎
 * 特性：
 * 1. 全局鼠标视线追踪视差（仅微幅偏转人物主体，古画边框与题跋纹丝不动）
 * 2. 局部水平切片网格形变 + 双态平滑交叉溶解（自然触发各种奶蛙表情包动作）
 * 3. 多层生宣墨晕扩散 + 墨点/秋风落叶彩蛋 + 跨画框串门客串渲染
 */
class LivingPortrait {
  constructor(data, canvas, cardEl, globalMouse) {
    this.data = data;
    this.canvas = canvas;
    this.cardEl = cardEl;
    this.globalMouse = globalMouse;
    this.ctx = canvas.getContext("2d");

    this.dpr = 2;
    this.w = data.displayWidth * this.dpr;
    this.h = data.displayHeight * this.dpr;
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.canvas.style.width = `${data.displayWidth}px`;
    this.canvas.style.height = `${data.displayHeight}px`;

    this.offIdle = document.createElement("canvas");
    this.offActive = document.createElement("canvas");
    this.offIdle.width = this.offActive.width = this.w;
    this.offIdle.height = this.offActive.height = this.h;

    this.imgIdle = new Image();
    this.imgActive = new Image();
    this.readyCount = 0;

    this.hovered = false;
    this.forcedUntil = 0;
    this.pokeBoost = 0;
    this.morph = 0;
    this.visitor = null;
    this.particles = [];
    this.ripples = [];
    this.phaseSeed = Math.random() * 10;

    this.statusPill = cardEl.querySelector(".state-pill");
    this.speechBubble = cardEl.querySelector(".speech-bubble");

    this.loadImages();
    this.bindEvents();
  }

  loadImages() {
    const onDone = (img, offCanvas) => {
      const octx = offCanvas.getContext("2d");
      octx.drawImage(img, 0, 0, this.w, this.h);
      this.readyCount++;
    };
    this.imgIdle.onload = () => onDone(this.imgIdle, this.offIdle);
    this.imgActive.onload = () => onDone(this.imgActive, this.offActive);
    this.imgIdle.src = this.data.idleSrc;
    this.imgActive.src = this.data.activeSrc;
  }

  bindEvents() {
    this.canvas.addEventListener("mouseenter", () => {
      this.hovered = true;
      this.spawnActionParticles(12);
      if (window.InkAmbient) {
        const r = this.canvas.getBoundingClientRect();
        window.InkAmbient.triggerWash(r.left + r.width * 0.5, r.top + r.height * 0.5, 1.15);
      }
      window.InkAudio.playPortraitEffect(this.data.motion.style, false);
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.hovered = false;
    });

    this.canvas.addEventListener("click", () => {
      this.poke();
    });
  }

  poke(durationMs = 2600) {
    this.pokeBoost = 1.0;
    this.forcedUntil = Math.max(this.forcedUntil, performance.now() + durationMs);
    this.spawnActionParticles(18);
    if (window.InkAmbient) {
      const r = this.canvas.getBoundingClientRect();
      window.InkAmbient.triggerWash(r.left + r.width * 0.5, r.top + r.height * 0.5, 1.35);
    }
    window.InkAudio.playPortraitEffect(this.data.motion.style, true);
  }

  forceWake(durationMs = 5600) {
    this.forcedUntil = Math.max(this.forcedUntil, performance.now() + durationMs);
    this.spawnActionParticles(12);
  }

  receiveVisitor(visitorImg, durationMs = 4600) {
    this.visitor = {
      img: visitorImg,
      start: performance.now(),
      until: performance.now() + durationMs
    };
    this.forceWake(durationMs);
    this.spawnActionParticles(14);
  }

  spawnActionParticles(count) {
    const cx = this.w * this.data.motion.centerX;
    const cy = this.h * ((this.data.motion.bellyTop + this.data.motion.bellyBottom) * 0.5);
    this.ripples.push({ x: cx, y: cy, r: 10, alpha: 0.32 });

    const isLeaf = this.data.motion.particleType === "leaf";
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = isLeaf ? 0.5 + Math.random() * 1.1 : 0.7 + Math.random() * 2.1;
      this.particles.push({
        x: isLeaf ? Math.random() * this.w : cx + (Math.random() - 0.5) * 48,
        y: isLeaf ? this.h * (0.12 + Math.random() * 0.35) : cy + (Math.random() - 0.5) * 42,
        vx: isLeaf ? -0.7 - Math.random() * 0.8 : Math.cos(angle) * speed,
        vy: isLeaf ? 0.9 + Math.random() * 1.2 : Math.sin(angle) * speed - 0.5,
        rot: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.08,
        size: isLeaf ? 4 + Math.random() * 4 : 2.5 + Math.random() * 5.0,
        alpha: 0.42,
        isLeaf
      });
    }
  }

  smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  getBodyWeight(ny) {
    const m = this.data.motion;
    const topFade = this.smoothstep(m.topKeep, m.topKeep + 0.08, ny);
    const botFade = 1 - this.smoothstep(m.bottomKeep - 0.12, m.bottomKeep, ny);
    return topFade * botFade;
  }

  getBellyWeight(ny) {
    const m = this.data.motion;
    return this.smoothstep(m.bellyTop - 0.03, m.bellyTop + 0.07, ny) *
      (1 - this.smoothstep(m.bellyBottom - 0.06, m.bellyBottom + 0.04, ny));
  }

  drawWarpedImage(srcCanvas, alpha, timeSec) {
    if (alpha <= 0.008) return;
    const ctx = this.ctx;
    const m = this.data.motion;
    const W = this.w;
    const H = this.h;
    const stripH = 4;

    const rect = this.canvas.getBoundingClientRect();
    const lookX = Math.max(-1, Math.min(1, (this.globalMouse.x - (rect.left + rect.width * 0.5)) / 420));
    const lookY = Math.max(-1, Math.min(1, (this.globalMouse.y - (rect.top + rect.height * 0.4)) / 420));

    const breath = Math.sin(timeSec * 1.8 + this.phaseSeed);
    const activeAmp = this.morph * 0.88 + this.pokeBoost * 1.25;
    const freq = m.laughFreq;

    ctx.save();
    ctx.globalAlpha = alpha;

    for (let y = 0; y < H; y += stripH) {
      const ny = y / H;
      const bodyW = this.getBodyWeight(ny);
      if (bodyW < 0.01) {
        ctx.drawImage(srcCanvas, 0, y, W, stripH, 0, y, W, stripH);
        continue;
      }

      const bellyW = this.getBellyWeight(ny);
      const headW = bodyW * (1 - bellyW * 0.7);

      let dx = lookX * 3.0 * headW * (1 - this.morph * 0.45);
      let dy = lookY * 1.2 * headW * (1 - this.morph * 0.5) + breath * 1.1 * bellyW;
      let stretchX = 0;

      if (activeAmp > 0.02) {
        const primary = Math.sin(timeSec * freq + this.phaseSeed);
        const harmonic = Math.sin(timeSec * freq * 1.68) * 0.35;
        const composite = primary * 0.68 + harmonic;

        if (m.style === "sway-chant") {
          dx += Math.sin(timeSec * 6.5) * 6.5 * activeAmp * bodyW * (1 - ny * 0.3);
          dy += Math.abs(Math.cos(timeSec * 6.5)) * -2.8 * activeAmp * headW;
        } else if (m.style === "sad-sob") {
          const sob = Math.sin(timeSec * 22.0) * Math.max(0, Math.sin(timeSec * 3.2));
          dx += sob * 1.8 * activeAmp * headW;
          dy += (1.8 + sob * 2.2) * activeAmp * bodyW;
        } else if (m.style === "head-tilt") {
          const tilt = this.morph * 5.2;
          dx += tilt * headW * (1 - ny * 1.2) + composite * 1.5 * activeAmp * bellyW;
          dy += composite * 2.2 * activeAmp * bodyW;
          stretchX = composite * 2.2 * activeAmp * bellyW;
        } else {
          dy += -this.morph * 2.6 * headW + composite * 2.6 * activeAmp * bodyW;
          dx += Math.cos(timeSec * (freq * 0.82) + ny * 3.0) * 1.6 * activeAmp * bodyW;
          stretchX = composite * 2.6 * activeAmp * bellyW;
        }
      }

      const destW = W + stretchX * 1.7;
      const destX = -(destW - W) * m.centerX + dx;
      const destY = y + dy;
      ctx.drawImage(srcCanvas, 0, y, W, stripH, destX, destY, destW, stripH + 0.7);
    }

    ctx.restore();
  }

  update(dt, nowMs) {
    if (this.readyCount < 2) return;

    const timeSec = nowMs / 1000;
    const isForced = nowMs < this.forcedUntil;
    const isActiveTarget = this.hovered || isForced;

    const targetMorph = isActiveTarget ? 1 : 0;
    const rate = targetMorph > this.morph ? 4.8 : 2.9;
    this.morph += (targetMorph - this.morph) * Math.min(1, dt * rate);
    this.pokeBoost = Math.max(0, this.pokeBoost - dt * 1.25);

    const isActuallyMoving = this.morph > 0.35;
    this.cardEl.classList.toggle("is-active", isActuallyMoving);
    this.cardEl.classList.toggle("is-speaking", isActuallyMoving || (this.visitor && nowMs < this.visitor.until));

    if (this.speechBubble) {
      if (this.visitor && nowMs < this.visitor.until) {
        this.speechBubble.textContent = "哟！隔壁这幅画好热闹，我也来凑一脚！";
      } else if (isActuallyMoving) {
        this.speechBubble.textContent = this.data.speechActive;
      } else {
        this.speechBubble.textContent = this.data.speechIdle;
      }
    }

    if (this.statusPill) {
      if (this.visitor && nowMs < this.visitor.until) {
        this.statusPill.textContent = "邻蛙来串门";
      } else if (isActuallyMoving) {
        this.statusPill.textContent = "入画动容";
      } else {
        this.statusPill.textContent = "静谧真迹";
      }
    }

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.drawImage(this.offIdle, 0, 0);
    this.drawWarpedImage(this.offIdle, 1 - this.morph * 0.92, timeSec);
    this.drawWarpedImage(this.offActive, this.morph, timeSec);

    if (this.visitor) {
      if (nowMs >= this.visitor.until) {
        this.visitor = null;
      } else {
        const progress = (nowMs - this.visitor.start) / (this.visitor.until - this.visitor.start);
        const pop = Math.sin(Math.min(1, progress * 3.5) * Math.PI * 0.5) *
          (progress > 0.8 ? (1 - progress) * 5 : 1);
        const vSize = Math.min(this.w, this.h) * 0.42;
        const bob = Math.sin(timeSec * 14) * 4;
        const vx = this.w - vSize * 0.82;
        const vy = this.h - vSize * 0.72 * pop + bob;

        ctx.save();
        ctx.beginPath();
        ctx.arc(vx + vSize * 0.45, vy + vSize * 0.45, vSize * 0.44, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(this.visitor.img, 0, 0, this.visitor.img.width, this.visitor.img.height * 0.72, vx, vy, vSize * 0.9, vSize * 0.9);
        ctx.restore();
      }
    }

    // 生宣柔和墨澜扩散圈
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const rp = this.ripples[i];
      rp.r += dt * 115;
      rp.alpha -= dt * 0.42;
      if (rp.alpha <= 0) {
        this.ripples.splice(i, 1);
        continue;
      }
      const g = ctx.createRadialGradient(rp.x, rp.y, rp.r * 0.65, rp.x, rp.y, rp.r);
      g.addColorStop(0, "rgba(38, 32, 24, 0)");
      g.addColorStop(0.8, `rgba(38, 32, 24, ${rp.alpha * 0.45})`);
      g.addColorStop(1, "rgba(38, 32, 24, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 淡墨晕散墨滴与水墨落叶粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vRot;
      if (!p.isLeaf) {
        p.vy += 0.03;
        p.size += 0.04; // 墨滴微幅向宣纸扩散
      }
      p.alpha -= dt * (p.isLeaf ? 0.24 : 0.48);
      if (p.alpha <= 0 || p.y > this.h) {
        this.particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.isLeaf) {
        ctx.fillStyle = `rgba(110, 74, 40, ${p.alpha})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.4, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
        g.addColorStop(0, `rgba(30, 26, 21, ${p.alpha})`);
        g.addColorStop(1, "rgba(30, 26, 21, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

window.LivingPortrait = LivingPortrait;
