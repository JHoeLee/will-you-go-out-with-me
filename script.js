/* ===========================================================
   A Day in JB — interactions
   - scroll-driven car nudge
   - reveal-on-scroll cards
   - runaway "No" button (mouse + touch)
   - self-contained confetti (no external libraries)
   =========================================================== */

(function () {
  "use strict";

  /* -------- 1 & 2. Horizontal journey + progress bar --------
     The .journey is a tall scroll runway. Inside it a sticky
     .viewport stays put while the .track slides left, so the
     buildings glide past the (CSS-animated) car. We also light
     up the nearest scene's info card and move the progress bar. */
  const journey = document.getElementById("journey");
  const track = document.getElementById("track");
  const scenes = track ? Array.prototype.slice.call(track.querySelectorAll(".scene")) : [];
  const progressFill = document.getElementById("progress-fill");
  const progressCar = document.getElementById("progress-car");
  let ticking = false;
  let activeIdx = -1;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // Cache layout metrics. Reading scrollWidth / offsetHeight / offsetTop
  // forces a synchronous layout — doing it every scroll frame is what made
  // the itinerary feel laggy on phones. We measure once and on resize only.
  const M = { journeyTop: 0, total: 0, maxShift: 0, docMax: 0 };
  function measure() {
    if (!journey || !track) return;
    M.journeyTop = journey.offsetTop;
    M.total = journey.offsetHeight - window.innerHeight;
    M.maxShift = track.scrollWidth - window.innerWidth;
    M.docMax = document.documentElement.scrollHeight - window.innerHeight;
  }

  function onScroll() {
    const y = window.scrollY;
    // Overall page progress bar (hero → question) — no layout reads
    const pct = M.docMax > 0 ? clamp((y / M.docMax) * 100, 0, 100) : 0;
    if (progressFill) progressFill.style.width = pct + "%";
    if (progressCar) progressCar.style.left = pct + "%";

    // Horizontal track within the journey section (cached metrics only)
    if (journey && track && scenes.length) {
      const p = clamp(M.total > 0 ? (y - M.journeyTop) / M.total : 0, 0, 1);
      track.style.transform = "translate3d(" + (-p * M.maxShift) + "px,0,0)";

      const idx = Math.round(p * (scenes.length - 1));
      if (idx !== activeIdx) { // only touch the DOM when the active stop changes
        activeIdx = idx;
        for (let i = 0; i < scenes.length; i++) {
          scenes[i].classList.toggle("active", i === idx);
        }
      }
    }
    ticking = false;
  }

  function requestScroll() {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }
  measure();
  onScroll();
  window.addEventListener("scroll", requestScroll, { passive: true });
  window.addEventListener("resize", () => { measure(); onScroll(); });
  window.addEventListener("load", () => { measure(); onScroll(); });

  /* -------- 3. Runaway "No" button (vanishes after 10 catches) -------- */
  const noBtn = document.getElementById("btn-no");
  const hintNo = document.getElementById("hint-no");
  const MAX_TRIES = 10;
  let noCount = 0;
  let lastDodge = 0;
  let lastMouse = { x: -9999, y: -9999 };

  window.addEventListener(
    "mousemove",
    (e) => { lastMouse.x = e.clientX; lastMouse.y = e.clientY; },
    { passive: true }
  );

  // Move the button to a random spot inside a LIMITED, fully on-screen band
  // (never the edges / top bar / off-screen), away from the pointer.
  function moveNo() {
    noBtn.classList.add("runaway");
    const bw = noBtn.offsetWidth || 110;
    const bh = noBtn.offsetHeight || 54;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Roaming zone: horizontal 6%–94%, vertical 22%–88% of the viewport.
    let minX = vw * 0.06;
    let maxX = vw * 0.94 - bw;
    let minY = vh * 0.22;
    let maxY = vh * 0.88 - bh;
    // Guard against tiny screens where the button barely fits.
    if (maxX < minX) { minX = 6; maxX = Math.max(6, vw - bw - 6); }
    if (maxY < minY) { minY = 6; maxY = Math.max(6, vh - bh - 6); }
    let x, y, tries = 0;
    do {
      x = minX + Math.random() * (maxX - minX);
      y = minY + Math.random() * (maxY - minY);
      tries++;
    } while (
      tries < 12 &&
      Math.abs(x + bw / 2 - lastMouse.x) < 140 &&
      Math.abs(y + bh / 2 - lastMouse.y) < 140
    );
    // Final clamp — it can never leave the screen.
    x = clamp(x, 4, vw - bw - 4);
    y = clamp(y, 4, vh - bh - 4);
    noBtn.style.left = x + "px";
    noBtn.style.top = y + "px";
  }

  function dodge() {
    const now = performance.now();
    // Debounce: a single "catch attempt" shouldn't count many times if
    // hover/move events fire in a burst. Still relocate every time.
    if (now - lastDodge < 250) { moveNo(); return; }
    lastDodge = now;
    noCount++;
    moveNo();
    if (hintNo) hintNo.textContent = "Why are you pressing No... :( :(";
    if (noCount >= MAX_TRIES) vanishNo();
  }

  function vanishNo() {
    noBtn.classList.add("poof");
    setTimeout(() => { noBtn.style.display = "none"; }, 350);
    if (hintNo) hintNo.textContent = "Only YES allowed hehehe";
  }

  if (noBtn) {
    // Mouse (desktop): mouseenter fires once per approach
    noBtn.addEventListener("mouseenter", dodge);
    // Touch / pen (mobile): hover doesn't fire, so dodge on tap and
    // stop the tap from counting as a click.
    noBtn.addEventListener("touchstart", (e) => { e.preventDefault(); dodge(); }, { passive: false });
    noBtn.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") { e.preventDefault(); dodge(); }
    });
    noBtn.addEventListener("focus", dodge);
    noBtn.addEventListener("click", (e) => { e.preventDefault(); dodge(); });
  }

  /* -------- 4. "Yes" → celebration + confetti -------- */
  const yesBtn = document.getElementById("btn-yes");
  const againBtn = document.getElementById("btn-again");
  const celebration = document.getElementById("celebration");

  function sayYes() {
    if (celebration) {
      celebration.classList.add("show");
      celebration.setAttribute("aria-hidden", "false");
    }
    burst();
    setTimeout(burst, 450); // one gentle follow-up (keeps it light)
  }

  function closeCelebration() {
    if (!celebration) return;
    celebration.classList.remove("show");
    celebration.setAttribute("aria-hidden", "true");
  }

  if (yesBtn) yesBtn.addEventListener("click", sayYes);
  if (againBtn) againBtn.addEventListener("click", () => { burst(); });

  const celebClose = document.getElementById("celeb-close");
  if (celebClose) celebClose.addEventListener("click", closeCelebration);
  // Click the dimmed backdrop (outside the card) to dismiss too.
  if (celebration) celebration.addEventListener("click", (e) => {
    if (e.target === celebration) closeCelebration();
  });

  /* -------- 5. Self-contained confetti (perf-tuned) -------- */
  const canvas = document.getElementById("confetti-canvas");
  const ctx = canvas ? canvas.getContext("2d") : null;
  // Cap the pixel ratio: a full-screen canvas at 3x DPR is what causes
  // the lag on retina / phone screens. 2x looks crisp and is ~2x cheaper.
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let particles = [];
  let rafId = null;
  const COLORS = ["#38a8ff", "#5cc0ff", "#1f7fe0", "#7fe6d2", "#bfe4ff", "#ffd166", "#ff8fb6", "#fff3a8"];
  const HEARTS = ["💙", "🩵", "⭐", "✨", "🎈", "💖"];

  function sizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth * DPR;
    canvas.height = window.innerHeight * DPR;
    if (ctx) ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  sizeCanvas();
  window.addEventListener("resize", () => {
    sizeCanvas();
    dodgeIfOffscreen();
  });

  function burst() {
    if (!ctx) return;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.35;
    const count = 55;            // fewer particles = far less per-frame work
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 9;
      const isHeart = Math.random() < 0.14; // emoji (fillText) is the costly path — keep rare
      particles.push({
        x: cx + (Math.random() - 0.5) * 120,
        y: cy + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        g: 0.18 + Math.random() * 0.12,
        size: isHeart ? 16 + Math.random() * 10 : 6 + Math.random() * 7,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        life: 0,
        ttl: 130 + Math.random() * 50,
        heart: isHeart ? HEARTS[(Math.random() * HEARTS.length) | 0] : null,
      });
    }
    if (!rafId) loop();
  }

  function loop() {
    if (!ctx) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles = particles.filter((p) => p.life < p.ttl && p.y < window.innerHeight + 40);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.life++;
      p.vy += p.g;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      const fade = Math.max(0, 1 - p.life / p.ttl);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.heart) {
        ctx.font = p.size * 1.6 + "px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.heart, 0, 0);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      }
      ctx.restore();
    }
    if (particles.length > 0) {
      rafId = window.requestAnimationFrame(loop);
    } else {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      rafId = null;
    }
  }

  /* keep a dodged No-button on screen after resize/rotate */
  function dodgeIfOffscreen() {
    if (!noBtn || !noBtn.classList.contains("runaway")) return;
    const r = noBtn.getBoundingClientRect();
    if (r.right > window.innerWidth || r.bottom > window.innerHeight) dodge();
  }

  /* -------- 6. Sparkle cursor trail (desktop pointers only) -------- */
  const sCanvas = document.getElementById("sparkle-canvas");
  const sCtx = sCanvas ? sCanvas.getContext("2d") : null;
  let sparks = [];
  let sparkRaf = null;
  const SPARK_COLORS = ["#38a8ff", "#7fe6d2", "#bfe4ff", "#ffd166", "#ffffff"];

  function sizeSparkCanvas() {
    if (!sCanvas) return;
    sCanvas.width = window.innerWidth * DPR;
    sCanvas.height = window.innerHeight * DPR;
    sCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  if (sCtx) {
    sizeSparkCanvas();
    window.addEventListener("resize", sizeSparkCanvas);

    let lastSpawn = 0;
    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType !== "mouse") return; // skip touch — keep it light on phones
        const now = performance.now();
        if (now - lastSpawn < 18) return;
        lastSpawn = now;
        for (let i = 0; i < 2; i++) {
          sparks.push({
            x: e.clientX, y: e.clientY,
            vx: (Math.random() - 0.5) * 1.6,
            vy: (Math.random() - 0.5) * 1.6 + 0.4,
            size: 2 + Math.random() * 3,
            life: 0, ttl: 32 + Math.random() * 22,
            color: SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0],
          });
        }
        if (!sparkRaf) sparkLoop();
      },
      { passive: true }
    );
  }

  function sparkLoop() {
    if (!sCtx) return;
    sCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    sparks = sparks.filter((p) => p.life < p.ttl);
    sparks.forEach((p) => {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      const fade = 1 - p.life / p.ttl;
      sCtx.save();
      sCtx.globalAlpha = fade;
      sCtx.fillStyle = p.color;
      sCtx.shadowColor = p.color;
      sCtx.shadowBlur = 8;
      sCtx.beginPath();
      sCtx.arc(p.x, p.y, p.size * fade, 0, Math.PI * 2);
      sCtx.fill();
      sCtx.restore();
    });
    if (sparks.length > 0) {
      sparkRaf = window.requestAnimationFrame(sparkLoop);
    } else {
      sCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      sparkRaf = null;
    }
  }
})();
