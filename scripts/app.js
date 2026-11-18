/**
 * 《墨韵蛙影 · 丹青幻境》应用主控脚本（极简水墨 UI 版）
 */
(function initApp() {
  const track = document.getElementById("galleryTrack");
  const dotsContainer = document.getElementById("galleryDots");
  const btnPrevPainting = document.getElementById("btnPrevPainting");
  const btnNextPainting = document.getElementById("btnNextPainting");
  const btnCallFamily = document.getElementById("btnCallFamily");
  const btnAudioMode = document.getElementById("btnAudioMode");
  const audioLabel = document.getElementById("audioLabel");
  const bannerScroll = document.getElementById("bannerScroll");
  const bannerText = document.getElementById("bannerText");
  const visitFlightLayer = document.getElementById("visitFlightLayer");

  // 考据弹窗元素
  const archiveModal = document.getElementById("archiveModal");
  const modalBackdrop = document.getElementById("modalBackdrop");
  const btnCloseModal = document.getElementById("btnCloseModal");
  const modalCompareImg = document.getElementById("modalCompareImg");
  const modalCompareCaption = document.getElementById("modalCompareCaption");
  const modalDynastyBadge = document.getElementById("modalDynastyBadge");
  const modalMuseumBadge = document.getElementById("modalMuseumBadge");
  const modalTitle = document.getElementById("modalTitle");
  const modalOriginalRef = document.getElementById("modalOriginalRef");
  const modalDimensions = document.getElementById("modalDimensions");
  const modalMemeRef = document.getElementById("modalMemeRef");
  const modalTechnique = document.getElementById("modalTechnique");
  const modalInscription = document.getElementById("modalInscription");
  const modalActionDesc = document.getElementById("modalActionDesc");
  const btnModalTrigger = document.getElementById("btnModalTrigger");
  const compareTabs = Array.from(document.querySelectorAll(".compare-tab"));

  const globalMouse = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
  window.addEventListener("mousemove", (e) => {
    globalMouse.x = e.clientX;
    globalMouse.y = e.clientY;
  });

  const portraits = [];
  const cards = [];
  const dotButtons = [];
  let activeIndex = 0;
  let currentModalItem = null;
  let bannerTimer = null;

  function showBanner(text, duration = 4200) {
    if (!bannerScroll || !bannerText) return;
    bannerText.textContent = text;
    bannerScroll.classList.add("is-visible");
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => {
      bannerScroll.classList.remove("is-visible");
    }, duration);
  }

  // 构建 6 幅去卡片化的宋式绫裱画轴与极简书法落款
  window.INK_PAINTINGS.forEach((item) => {
    const card = document.createElement("article");
    card.className = item.isLandscape ? "scroll-card is-landscape" : "scroll-card";
    card.dataset.id = item.id;

    card.innerHTML = `
      <div class="ink-aura" aria-hidden="true"></div>
      <div class="scroll-hanger" aria-hidden="true"></div>
      <div class="scroll-top-rod" aria-hidden="true"></div>
      <div class="scroll-silk-body">
        <div class="speech-bubble">${item.speechIdle}</div>
        <div class="canvas-bezel">
          <canvas class="portrait-canvas" aria-label="${item.title}动态肖像画"></canvas>
        </div>
      </div>
      <div class="scroll-bottom-rod" aria-hidden="true"></div>
      <div class="ink-caption">
        <div class="caption-main">
          <h2 class="caption-title">${item.title}</h2>
          <button type="button" class="seal-archive-mini" title="展开原画真迹考据">考據</button>
        </div>
        <p class="caption-meta">${item.dynasty} · ${item.author} · ${item.museum}藏</p>
      </div>
    `;

    track.appendChild(card);
    cards.push(card);

    const canvas = card.querySelector(".portrait-canvas");
    const portrait = new window.LivingPortrait(item, canvas, card, globalMouse);
    portraits.push(portrait);

    card.querySelector(".seal-archive-mini").addEventListener("click", () => {
      openArchiveModal(item);
    });
  });

  // 构建下方水墨点阵切换导航
  function setActivePainting(nextIndex, playSound = true) {
    const total = cards.length;
    if (!total) return;
    activeIndex = ((nextIndex % total) + total) % total;

    cards.forEach((c, idx) => {
      c.classList.remove("is-current");
      if (idx === activeIndex) {
        void c.offsetWidth;
        c.classList.add("is-current");
      }
    });
    dotButtons.forEach((btn, idx) => {
      const active = idx === activeIndex;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-current", active ? "true" : "false");
    });

    if (playSound) {
      window.InkAudio.playWhooshInk();
      if (window.InkAmbient) {
        window.InkAmbient.triggerWash(window.innerWidth * 0.5, window.innerHeight * 0.48, 1.5);
      }
    }
  }

  if (dotsContainer) {
    window.INK_PAINTINGS.forEach((item, idx) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "ink-dot-btn";
      dot.setAttribute("aria-label", `切换至 ${item.title}`);
      dot.dataset.title = `${item.index} ${item.title.replace(/[《》]/g, "")}`;
      dot.innerHTML = `<span class="ink-dot-core"></span>`;
      dot.addEventListener("click", () => setActivePainting(idx, true));
      dotsContainer.appendChild(dot);
      dotButtons.push(dot);
    });
  }

  if (btnPrevPainting) {
    btnPrevPainting.addEventListener("click", () => setActivePainting(activeIndex - 1, true));
  }
  if (btnNextPainting) {
    btnNextPainting.addEventListener("click", () => setActivePainting(activeIndex + 1, true));
  }

  window.addEventListener("keydown", (e) => {
    if (archiveModal && !archiveModal.hidden) return;
    if (e.key === "ArrowLeft") setActivePainting(activeIndex - 1, true);
    if (e.key === "ArrowRight") setActivePainting(activeIndex + 1, true);
  });

  // 初始化显示第一幅画作
  setActivePainting(0, false);

  // 音效印章「聽音」三态循环
  function refreshAudioUI(mode) {
    const map = {
      off: "聽音",
      ya: "雅韻",
      meme: "魔音"
    };
    if (audioLabel) audioLabel.textContent = map[mode] || "聽音";
    if (btnAudioMode) btnAudioMode.classList.toggle("is-on", mode !== "off");
  }

  if (btnAudioMode) {
    btnAudioMode.addEventListener("click", () => {
      const next = window.InkAudio.cycleMode();
      refreshAudioUI(next);
    });
  }

  // 跨框串门调度器（单幅焦点下：另一幅画的奶蛙自画外飞入当前画作客串）
  function triggerCrossFrameVisit() {
    if (portraits.length < 2) return;
    const fromIdx = (activeIndex + 1 + Math.floor(Math.random() * (portraits.length - 1))) % portraits.length;
    const fromP = portraits[fromIdx];
    const toP = portraits[activeIndex];

    const toRect = toP.canvas.getBoundingClientRect();
    const flyer = document.createElement("div");
    flyer.className = "flying-naiwa";
    flyer.innerHTML = `<img src="${fromP.data.activeSrc}" alt="串门奶蛙" />`;
    visitFlightLayer.appendChild(flyer);

    const startX = window.innerWidth * 0.88;
    const startY = window.innerHeight * 0.24;
    const endX = toRect.left + toRect.width * 0.68;
    const endY = toRect.top + toRect.height * 0.74;

    flyer.style.left = `${startX}px`;
    flyer.style.top = `${startY}px`;

    const tStart = performance.now();
    const flightDuration = 780;

    function animateFlight(now) {
      const t = Math.min(1, (now - tStart) / flightDuration);
      const ease = 1 - Math.pow(1 - t, 3);
      const arcY = Math.sin(t * Math.PI) * -95;
      const curX = startX + (endX - startX) * ease;
      const curY = startY + (endY - startY) * ease + arcY;
      flyer.style.left = `${curX}px`;
      flyer.style.top = `${curY}px`;
      flyer.style.transform = `translate(-50%, -50%) scale(${1 + Math.sin(t * Math.PI) * 0.35}) rotate(${t * 360}deg)`;

      if (t < 1) {
        requestAnimationFrame(animateFlight);
      } else {
        flyer.remove();
        toP.receiveVisitor(fromP.imgActive, 4600);
        if (window.InkAmbient) {
          window.InkAmbient.triggerWash(endX, endY, 1.4);
        }
      }
    }
    requestAnimationFrame(animateFlight);
  }

  // 朱文方印「喚蛙」：唤醒当前焦点画作并召唤蛙友客串
  if (btnCallFamily) {
    btnCallFamily.addEventListener("click", () => {
      if (window.InkAudio.mode === "off") {
        window.InkAudio.setMode("meme");
        refreshAudioUI("meme");
      }
      showBanner("全网呼叫奶家人——每日来上这么两下，浑身都通透了！", 4800);
      window.InkAudio.playWhooshInk();

      const cur = portraits[activeIndex];
      if (cur) {
        cur.forceWake(5400);
        window.InkAudio.playPortraitEffect(cur.data.motion.style, true);
        if (window.InkAmbient) {
          const r = cur.canvas.getBoundingClientRect();
          window.InkAmbient.triggerWash(r.left + r.width * 0.5, r.top + r.height * 0.5, 1.45);
        }
      }

      setTimeout(triggerCrossFrameVisit, 600);
    });
  }

  // 丹青考据弹窗控制
  function updateCompareView(view) {
    if (!currentModalItem) return;
    compareTabs.forEach((t) => t.classList.toggle("is-active", t.dataset.view === view));

    if (view === "original") {
      modalCompareImg.src = currentModalItem.originalSrc;
      modalCompareCaption.textContent = `博物馆真迹：${currentModalItem.dynasty} · ${currentModalItem.author} ${currentModalItem.originalTitle}（${currentModalItem.museum}）`;
    } else if (view === "idle") {
      modalCompareImg.src = currentModalItem.idleSrc;
      modalCompareCaption.textContent = `静谧原画态：保留原画题跋、印章与宋纸笔墨，主体换为奶蛙`;
    } else {
      modalCompareImg.src = currentModalItem.activeSrc;
      modalCompareCaption.textContent = `动容触发态：演绎奶蛙 Hub「${currentModalItem.memeName}」表情包动态`;
    }
  }

  function openArchiveModal(item) {
    currentModalItem = item;
    modalDynastyBadge.textContent = item.dynasty;
    modalMuseumBadge.textContent = `${item.museum}藏`;
    modalTitle.textContent = item.title;
    modalOriginalRef.textContent = `原画基准：${item.originalTitle} · ${item.author} 绘`;
    modalDimensions.textContent = item.dimensions;
    modalMemeRef.textContent = item.memeName;
    modalTechnique.textContent = item.technique;
    modalInscription.textContent = item.inscription;
    modalActionDesc.textContent = item.actionDesc;

    updateCompareView("original");
    archiveModal.hidden = false;
    window.InkAudio.playWhooshInk();
  }

  function closeArchiveModal() {
    archiveModal.hidden = true;
    currentModalItem = null;
  }

  compareTabs.forEach((tab) => {
    tab.addEventListener("click", () => updateCompareView(tab.dataset.view));
  });

  if (btnCloseModal) btnCloseModal.addEventListener("click", closeArchiveModal);
  if (modalBackdrop) modalBackdrop.addEventListener("click", closeArchiveModal);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !archiveModal.hidden) closeArchiveModal();
  });

  if (btnModalTrigger) {
    btnModalTrigger.addEventListener("click", () => {
      if (!currentModalItem) return;
      const targetP = portraits.find((p) => p.data.id === currentModalItem.id);
      closeArchiveModal();
      if (targetP) {
        targetP.cardEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "center" });
        targetP.poke(3200);
      }
    });
  }

  let lastFrame = 0;
  const TARGET_FRAME_MS = 1000 / 16; // 16 FPS 传统手绘定格动画韵律，使演变从容自然
  function tick(now) {
    if (!lastFrame) lastFrame = now;
    const elapsed = now - lastFrame;
    if (elapsed >= TARGET_FRAME_MS) {
      const dt = Math.min(0.12, elapsed / 1000);
      lastFrame = now - (elapsed % TARGET_FRAME_MS);

      for (let i = 0; i < portraits.length; i++) {
        // 仅渲染当前焦点画作或仍在退场过渡中的画作
        if (i === activeIndex || portraits[i].morph > 0.01) {
          portraits[i].update(dt, now);
        }
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
