/**
 * 《墨韵蛙影》沉浸式水墨视觉引擎：
 * 1. 背景层 (#inkWashBgCanvas)：宋代水墨远山叠嶂、缓慢流淌烟云与生宣渗透墨团
 * 2. 前景层 (#inkCursorCanvas)：变速毛笔中侧锋飞白笔触 + 点击水墨花朵晕染
 */
(function initInkVisuals() {
  const bgCanvas = document.getElementById("inkWashBgCanvas");
  const fgCanvas = document.getElementById("inkCursorCanvas");
  if (!fgCanvas) return;

  const bgCtx = bgCanvas ? bgCanvas.getContext("2d") : null;
  const fgCtx = fgCanvas.getContext("2d");

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;

  // 背景水墨云团与交互触发大墨晕
  const clouds = Array.from({ length: 7 }, (_, i) => ({
    xFrac: (i + 0.5) / 7,
    yFrac: 0.18 + (i % 3) * 0.25,
    rx: 220 + (i % 4) * 90,
    ry: 110 + (i % 3) * 45,
    speed: 0.004 + (i % 3) * 0.002,
    phase: i * 1.4,
    alpha: 0.032 + (i % 2) * 0.018
  }));

  const ambientWashedBlots = [];
  const mistMotes = Array.from({ length: 28 }, () => ({
    x: Math.random(),
    y: Math.random(),
    vx: 0.00008 + Math.random() * 0.00014,
    vy: -0.00004 + Math.random() * 0.00008,
    r: 1.2 + Math.random() * 2.6,
    alpha: 0.05 + Math.random() * 0.09
  }));

  // 暴露供画廊悬停/唤蛙召唤宣纸墨晕的全局方法
  window.InkAmbient = {
    triggerWash(clientX, clientY, scale = 1.0) {
      const petals = Array.from({ length: 5 }, (_, idx) => ({
        ox: (Math.random() - 0.5) * 34 * scale,
        oy: (Math.random() - 0.5) * 34 * scale,
        rMul: 0.65 + (idx % 3) * 0.22
      }));
      ambientWashedBlots.push({
        x: clientX,
        y: clientY,
        r: 24 * scale,
        maxR: 175 * scale,
        life: 1.0,
        petals
      });
    }
  };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    fgCanvas.width = width * dpr;
    fgCanvas.height = height * dpr;
    fgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (bgCanvas && bgCtx) {
      bgCanvas.width = width * dpr;
      bgCanvas.height = height * dpr;
      bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }
  window.addEventListener("resize", resize);
  resize();

  // 绘制三层连绵起伏宋画水墨远山（浓淡墨韵层次）
  function drawDistantMountains(ctx, timeSec) {
    const layers = [
      { baseY: 0.68, amp: 65, freq: 0.0030, drift: timeSec * 4, color: "rgba(38, 37, 34, 0.085)" },
      { baseY: 0.78, amp: 48, freq: 0.0044, drift: -timeSec * 6, color: "rgba(28, 27, 25, 0.115)" },
      { baseY: 0.87, amp: 34, freq: 0.0060, drift: timeSec * 3, color: "rgba(18, 17, 15, 0.145)" }
    ];

    layers.forEach((layer, idx) => {
      ctx.save();
      ctx.beginPath();
      const y0 = height * layer.baseY;
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 18) {
        const ridge =
          Math.sin(x * layer.freq + layer.drift * 0.02 + idx) * layer.amp +
          Math.cos(x * layer.freq * 2.1 - idx * 1.7) * (layer.amp * 0.42);
        ctx.lineTo(x, y0 + ridge);
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, y0 - layer.amp, 0, height);
      grad.addColorStop(0, layer.color);
      grad.addColorStop(0.68, layer.color);
      grad.addColorStop(1, "rgba(231, 229, 221, 0)");
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    });
  }

  // 角落写意水墨竹影（烘托纯水墨画卷质感，不遮挡画作主体）
  function drawInkBambooCorner(ctx, timeSec) {
    const sway = Math.sin(timeSec * 0.7) * 4;
    ctx.save();
    ctx.strokeStyle = "rgba(26, 25, 23, 0.12)";
    ctx.fillStyle = "rgba(26, 25, 23, 0.11)";
    ctx.lineCap = "round";

    // 右下角斜出竹枝
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(width + 10, height - 40);
    ctx.quadraticCurveTo(width - 70, height - 130, width - 130 + sway, height - 220);
    ctx.stroke();

    const leaves = [
      [width - 92 + sway * 0.5, height - 160, -0.6],
      [width - 108 + sway * 0.6, height - 175, -1.1],
      [width - 125 + sway * 0.8, height - 210, -0.4],
      [width - 114 + sway * 0.8, height - 225, -1.4]
    ];
    leaves.forEach(([lx, ly, ang]) => {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  // 左侧苍劲水墨古松斜枝
  function drawInkPineBranch(ctx, timeSec) {
    const sway = Math.sin(timeSec * 0.55 + 1.2) * 3;
    ctx.save();
    ctx.strokeStyle = "rgba(22, 21, 19, 0.14)";
    ctx.fillStyle = "rgba(26, 25, 22, 0.10)";
    ctx.lineCap = "round";

    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(-10, height * 0.28);
    ctx.quadraticCurveTo(width * 0.08, height * 0.24, width * 0.14 + sway, height * 0.29);
    ctx.stroke();

    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(width * 0.07, height * 0.26);
    ctx.quadraticCurveTo(width * 0.11, height * 0.20, width * 0.17 + sway, height * 0.21);
    ctx.stroke();

    // 淡墨松针簇
    const clusters = [
      [width * 0.14 + sway, height * 0.29, 30],
      [width * 0.17 + sway, height * 0.21, 24],
      [width * 0.08, height * 0.24, 22]
    ];
    clusters.forEach(([cx, cy, r]) => {
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const a = -Math.PI * 0.5 + i * 0.28;
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.65);
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  // 天际掠过的水墨远雁
  function drawInkBirds(ctx, timeSec) {
    ctx.save();
    ctx.strokeStyle = "rgba(28, 27, 24, 0.22)";
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      const bx = ((0.18 + i * 0.045 + timeSec * 0.008) % 1.2 - 0.1) * width;
      const by = height * (0.16 + (i % 2) * 0.03) + Math.sin(timeSec * 1.4 + i) * 4;
      const wing = 6 + Math.sin(timeSec * 4.5 + i * 0.9) * 2.5;
      ctx.beginPath();
      ctx.moveTo(bx - 8, by + wing * 0.3);
      ctx.quadraticCurveTo(bx - 3, by - wing * 0.4, bx, by);
      ctx.quadraticCurveTo(bx + 3, by - wing * 0.4, bx + 8, by + wing * 0.3);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 底部水面淡墨涟漪
  function drawWaterRipples(ctx, timeSec) {
    ctx.save();
    ctx.strokeStyle = "rgba(38, 37, 34, 0.08)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      const rx = width * (0.22 + i * 0.19) + Math.sin(timeSec * 0.3 + i) * 14;
      const ry = height * (0.91 + (i % 2) * 0.03);
      const len = 48 + (i % 3) * 24;
      ctx.beginPath();
      ctx.moveTo(rx - len, ry);
      ctx.quadraticCurveTo(rx, ry + 3, rx + len, ry);
      ctx.stroke();
    }
    ctx.restore();
  }

  function renderBg(timeSec) {
    if (!bgCtx) return;
    bgCtx.clearRect(0, 0, width, height);

    // 缓慢流动的水墨云烟团（不绘制程序化几何线条，由手绘真迹图层提供山水与竹石）
    clouds.forEach((c) => {
      const cx = ((c.xFrac + timeSec * c.speed) % 1.3 - 0.15) * width;
      const cy = c.yFrac * height + Math.sin(timeSec * 0.4 + c.phase) * 18;
      const grad = bgCtx.createRadialGradient(cx, cy, 10, cx, cy, c.rx);
      grad.addColorStop(0, `rgba(28, 27, 24, ${c.alpha * 1.6})`);
      grad.addColorStop(0.55, `rgba(48, 46, 42, ${c.alpha * 0.7})`);
      grad.addColorStop(1, "rgba(48, 46, 42, 0)");

      bgCtx.save();
      bgCtx.translate(cx, cy);
      bgCtx.scale(1, c.ry / c.rx);
      bgCtx.translate(-cx, -cy);
      bgCtx.fillStyle = grad;
      bgCtx.beginPath();
      bgCtx.arc(cx, cy, c.rx, 0, Math.PI * 2);
      bgCtx.fill();
      bgCtx.restore();
    });

    // 飘浮的淡墨微尘
    mistMotes.forEach((m) => {
      m.x = (m.x + m.vx) % 1.02;
      m.y = (m.y + m.vy + 1) % 1;
      bgCtx.fillStyle = `rgba(45, 40, 34, ${m.alpha})`;
      bgCtx.beginPath();
      bgCtx.arc(m.x * width, m.y * height, m.r, 0, Math.PI * 2);
      bgCtx.fill();
    });

    // 交互触发的宣纸水墨渗透大晕斑
    for (let i = ambientWashedBlots.length - 1; i >= 0; i--) {
      const b = ambientWashedBlots[i];
      b.r += (b.maxR - b.r) * 0.045;
      b.life -= 0.012;
      if (b.life <= 0) {
        ambientWashedBlots.splice(i, 1);
        continue;
      }
      b.petals.forEach((p) => {
        const px = b.x + p.ox * (b.r / 60);
        const py = b.y + p.oy * (b.r / 60);
        const pr = b.r * p.rMul;
        const g = bgCtx.createRadialGradient(px, py, pr * 0.1, px, py, pr);
        g.addColorStop(0, `rgba(34, 30, 25, ${b.life * 0.11})`);
        g.addColorStop(0.6, `rgba(54, 48, 40, ${b.life * 0.055})`);
        g.addColorStop(1, "rgba(54, 48, 40, 0)");
        bgCtx.fillStyle = g;
        bgCtx.beginPath();
        bgCtx.arc(px, py, pr, 0, Math.PI * 2);
        bgCtx.fill();
      });
    }
  }

  // ==========================================================================
  // 前景层：毛笔飞白笔锋轨迹 + 不规则点墨墨花涟漪
  // ==========================================================================
  const strokes = [];
  const dryBristles = [];
  const inkFlowers = [];
  let prevMouse = null;

  window.addEventListener("mousemove", (e) => {
    const nowX = e.clientX;
    const nowY = e.clientY;
    let speed = 0;
    if (prevMouse) {
      speed = Math.hypot(nowX - prevMouse.x, nowY - prevMouse.y);
    }

    // 变速笔锋：慢则丰润浓墨，快则瘦硬兼生飞白丝
    const brushWidth = Math.max(0.9, Math.min(5.4, 5.2 - speed * 0.11));
    const opacity = Math.max(0.14, Math.min(0.42, 0.42 - speed * 0.006));

    strokes.push({
      x: nowX,
      y: nowY,
      w: brushWidth,
      op: opacity,
      life: 1.0
    });
    if (strokes.length > 32) strokes.shift();

    // 快速挥毫时产生飞白分叉枯笔丝线
    if (prevMouse && speed > 14) {
      for (let k = 0; k < 2; k++) {
        const off = (k === 0 ? -1 : 1) * (2.5 + Math.random() * 2.5);
        dryBristles.push({
          x1: prevMouse.x + off,
          y1: prevMouse.y - off * 0.5,
          x2: nowX + off,
          y2: nowY - off * 0.5,
          life: 0.75
        });
      }
    }

    prevMouse = { x: nowX, y: nowY };
  });

  window.addEventListener("mousedown", (e) => {
    // 绽放不规则水墨花朵墨晕
    const petals = Array.from({ length: 7 }, (_, i) => {
      const ang = (Math.PI * 2 * i) / 7 + (Math.random() - 0.5) * 0.45;
      return {
        ang,
        dist: 0.35 + Math.random() * 0.65,
        size: 0.45 + Math.random() * 0.4
      };
    });
    inkFlowers.push({
      x: e.clientX,
      y: e.clientY,
      r: 5,
      maxR: 46,
      life: 1.0,
      petals
    });
  });

  function renderFg() {
    fgCtx.clearRect(0, 0, width, height);

    // 主毛笔笔锋
    if (strokes.length > 1) {
      for (let i = 1; i < strokes.length; i++) {
        const s0 = strokes[i - 1];
        const s1 = strokes[i];
        s0.life -= 0.045;
        if (s0.life <= 0) continue;

        fgCtx.beginPath();
        fgCtx.moveTo(s0.x, s0.y);
        fgCtx.lineTo(s1.x, s1.y);
        fgCtx.strokeStyle = `rgba(28, 25, 21, ${s0.life * s1.op})`;
        fgCtx.lineWidth = Math.max(0.5, s0.life * s1.w);
        fgCtx.lineCap = "round";
        fgCtx.stroke();
      }
      while (strokes.length > 0 && strokes[0].life <= 0) strokes.shift();
    }

    // 飞白枯笔丝线
    for (let i = dryBristles.length - 1; i >= 0; i--) {
      const b = dryBristles[i];
      b.life -= 0.055;
      if (b.life <= 0) {
        dryBristles.splice(i, 1);
        continue;
      }
      fgCtx.beginPath();
      fgCtx.moveTo(b.x1, b.y1);
      fgCtx.lineTo(b.x2, b.y2);
      fgCtx.strokeStyle = `rgba(42, 38, 32, ${b.life * 0.22})`;
      fgCtx.lineWidth = 0.8;
      fgCtx.stroke();
    }

    // 点击水墨花朵晕染
    for (let i = inkFlowers.length - 1; i >= 0; i--) {
      const fl = inkFlowers[i];
      fl.r += (fl.maxR - fl.r) * 0.09;
      fl.life -= 0.025;
      if (fl.life <= 0) {
        inkFlowers.splice(i, 1);
        continue;
      }
      fl.petals.forEach((p) => {
        const px = fl.x + Math.cos(p.ang) * fl.r * p.dist;
        const py = fl.y + Math.sin(p.ang) * fl.r * p.dist;
        const pr = fl.r * p.size;
        const grad = fgCtx.createRadialGradient(px, py, 1, px, py, pr);
        grad.addColorStop(0, `rgba(26, 23, 19, ${fl.life * 0.22})`);
        grad.addColorStop(0.7, `rgba(46, 41, 34, ${fl.life * 0.1})`);
        grad.addColorStop(1, "rgba(46, 41, 34, 0)");
        fgCtx.fillStyle = grad;
        fgCtx.beginPath();
        fgCtx.arc(px, py, pr, 0, Math.PI * 2);
        fgCtx.fill();
      });
    }
  }

  function loop(ts) {
    renderBg(ts / 1000);
    renderFg();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
