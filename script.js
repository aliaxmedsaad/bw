/* ==========================================================
   For Aisha 🌷 — scene logic
   1. Pointer-reactive lantern glows on the hero image,
      calibrated in image space so hotspots track the photo
      through any object-fit: cover crop
   2. IntersectionObserver starts the tulip photo reveal
   3. When the reveal finishes, radial starburst fireworks
      start and the birthday message reveals letter by letter
   Plain JavaScript, no dependencies, works from file://
   ========================================================== */

(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Section 1 · lantern hotspots ---------------- */

  const hero = document.getElementById('hero');
  const heroImg = document.querySelector('.hero-img');
  const layer = document.getElementById('lanternLayer');

  // Lantern positions as percentages of the X.png IMAGE itself (not the
  // viewport). They are mapped through the object-fit: cover geometry on
  // every layout pass, so each hotspot stays glued to its lantern on any
  // viewport from 360px phones to wide desktops. s = relative glow size.
  const LANTERNS = [
    { x: 36, y: 11, s: 0.9  },
    { x: 61, y: 15, s: 0.95 },
    { x: 14, y: 18, s: 0.85 },
    { x: 80, y: 20, s: 0.9  },
    { x: 81, y: 27, s: 1.0  },
    { x: 47, y: 28, s: 0.8  },
    { x: 9,  y: 35, s: 0.85 },
    { x: 43, y: 39, s: 0.8  },
    { x: 19, y: 47, s: 0.85 },
    { x: 83, y: 56, s: 1.25 }, // the lantern by the boat
  ];

  const glows = LANTERNS.map((cfg) => {
    const el = document.createElement('div');
    el.className = 'lantern';

    const core = document.createElement('div');
    core.className = 'lantern-glow';
    // desynchronise the idle pulses so they feel alive
    core.style.animationDelay = (-Math.random() * 4).toFixed(2) + 's';
    core.style.animationDuration = (2.8 + Math.random() * 2.2).toFixed(2) + 's';
    el.appendChild(core);
    layer.appendChild(el);

    return { el, cfg, boost: 0, hx: 0, hy: 0 }; // hx/hy: hero-local px centre
  });

  // Mirrors the object-fit: cover / object-position values in style.css
  // (.hero-img is `center 45%`, switching to `center 62%` on wide screens).
  function layoutLanterns() {
    const rect = hero.getBoundingClientRect();
    const nw = heroImg.naturalWidth;
    const nh = heroImg.naturalHeight;
    if (!nw || !nh || !rect.width || !rect.height) return;

    const scale = Math.max(rect.width / nw, rect.height / nh);
    const rw = nw * scale;
    const rh = nh * scale;
    const posY = window.matchMedia('(min-aspect-ratio: 5/4)').matches ? 0.62 : 0.45;
    const left = (rect.width - rw) * 0.5;
    const top = (rect.height - rh) * posY;

    const base = Math.min(110, Math.max(64, rect.width * 0.22));

    for (const g of glows) {
      g.hx = left + (rw * g.cfg.x) / 100;
      g.hy = top + (rh * g.cfg.y) / 100;
      const visible =
        g.hx > -30 && g.hx < rect.width + 30 &&
        g.hy > -30 && g.hy < rect.height + 30;
      g.el.style.display = visible ? '' : 'none';
      g.el.style.left = g.hx.toFixed(1) + 'px';
      g.el.style.top = g.hy.toFixed(1) + 'px';
      g.el.style.setProperty('--size', Math.round(base * g.cfg.s) + 'px');
    }
  }

  if (heroImg.complete && heroImg.naturalWidth) layoutLanterns();
  else heroImg.addEventListener('load', layoutLanterns, { once: true });
  window.addEventListener('resize', layoutLanterns);
  window.addEventListener('orientationchange', layoutLanterns);

  // Unified mouse + touch via the PointerEvent API. The hero has
  // `touch-action: pan-y` in CSS, so vertical scrolling stays native
  // while taps and sideways strokes still deliver pointer events.
  const pointer = { x: 0, y: 0, active: false, lastMove: 0 };
  let glowRaf = 0;

  function onPoint(e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
    pointer.lastMove = performance.now();
    if (!glowRaf) glowRaf = requestAnimationFrame(glowFrame);
  }
  function onRelease() {
    // let the glow linger a moment, then ease back down
    pointer.lastMove = Math.min(pointer.lastMove, performance.now() - 1400);
  }

  hero.addEventListener('pointermove', onPoint, { passive: true });
  hero.addEventListener('pointerdown', onPoint, { passive: true });
  hero.addEventListener('pointerleave', onRelease, { passive: true });
  hero.addEventListener('pointercancel', onRelease, { passive: true });

  // one light rAF loop: eases each lantern's --boost toward its target,
  // then goes idle once everything has faded back down
  function glowFrame(now) {
    const rect = hero.getBoundingClientRect();
    // influence radius scales with the viewport (~thumb reach on phones)
    const radius = Math.min(190, Math.max(110, rect.width * 0.32));
    const idle = now - pointer.lastMove > 2200;
    let anyLit = false;

    for (const g of glows) {
      let target = 0;
      if (pointer.active && !idle) {
        const d = Math.hypot(pointer.x - (rect.left + g.hx), pointer.y - (rect.top + g.hy));
        const t = Math.max(0, 1 - d / radius);
        target = t * t * (3 - 2 * t); // smoothstep for a gentle falloff
      }
      g.boost += (target - g.boost) * 0.14;
      if (g.boost < 0.004) g.boost = 0;
      else anyLit = true;
      g.el.style.setProperty('--boost', g.boost.toFixed(3));
    }

    glowRaf = anyLit || !idle ? requestAnimationFrame(glowFrame) : 0;
  }

  /* ---------------- message: split lines into letters ---------------- */

  const message = document.getElementById('message');
  let charIndex = 0;
  message.querySelectorAll('.message-line').forEach((line) => {
    for (const ch of line.dataset.line) {
      const span = document.createElement('span');
      span.className = 'char';
      // NBSP: a plain space collapses to zero width inside an
      // inline-block span, which glued the words together
      span.textContent = ch === ' ' ? ' ' : ch;
      span.style.transitionDelay = (charIndex++ * 0.045).toFixed(3) + 's';
      span.setAttribute('aria-hidden', 'true');
      line.appendChild(span);
    }
  });

  /* ---------- fireworks: radial point-origin starbursts ---------- */

  const scene = document.getElementById('tulips');

  const fireworks = (() => {
    const canvas = document.getElementById('fireworks');
    const ctx = canvas.getContext('2d');

    // gold and pink lead; white sparkle and a touch of purple
    const COLORS = [
      [255, 210, 122], [255, 210, 122], [255, 184, 112],
      [255, 143, 189], [255, 143, 189], [255, 79, 154],
      [255, 255, 255], [214, 160, 255],
    ];

    const sparks = [];
    let started = false;
    let sceneVisible = false;
    let pageVisible = !document.hidden;
    let rafId = 0;
    let lastT = 0;
    let burstIn = 0;

    function resize() {
      const w = scene.clientWidth;
      const h = scene.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75); // cap for mobile GPUs
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', () => { if (started) resize(); });

    const pick = () => COLORS[(Math.random() * COLORS.length) | 0];

    // a starburst born at a random point, expanding radially outward
    function burst() {
      const w = scene.clientWidth;
      const h = scene.clientHeight;
      const cx = w * (0.12 + Math.random() * 0.76);
      const cy = h * (0.12 + Math.random() * 0.48); // upper half, above the tulips
      const color = pick();
      const n = 42 + ((Math.random() * 26) | 0);
      // expansion speed scales with the viewport so bursts read the same
      // on a 360px phone and a desktop
      const base = Math.min(w, h) * (0.0042 + Math.random() * 0.0028);

      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.1;
        const sp = base * (0.4 + 0.6 * Math.sqrt(Math.random()));
        sparks.push({
          x: cx,
          y: cy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0,
          max: 68 + Math.random() * 44,
          size: 1.1 + Math.random() * 1.2,
          color: Math.random() < 0.85 ? color : [255, 255, 255],
        });
      }
      // brief white-hot flash at the point of origin
      sparks.push({
        x: cx, y: cy, vx: 0, vy: 0,
        life: 0, max: 13, size: 6.5, color: [255, 255, 255],
      });
    }

    function step(now) {
      rafId = 0;
      if (!sceneVisible || !pageVisible) return; // paused; resumes on visibility
      const dt = Math.min(2.5, (now - lastT) / 16.7 || 1); // in ~60fps frames
      lastT = now;

      // gentle burst cadence, capped so mobiles never drown in particles
      burstIn -= dt * 16.7;
      if (burstIn <= 0 && sparks.length < 260) {
        burst();
        if (Math.random() < 0.3) burst(); // occasional pair
        burstIn = 650 + Math.random() * 850;
      }

      // fade the previous frame toward black (never clearRect) for trails
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(0, 0, scene.clientWidth, scene.clientHeight);
      ctx.globalCompositeOperation = 'lighter'; // additive cinematic glow

      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life += dt;
        if (p.life >= p.max) {
          sparks.splice(i, 1);
          continue;
        }
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + 0.026 * dt; // drag + soft gravity
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const a = 1 - p.life / p.max;
        ctx.fillStyle = `rgba(${p.color[0]},${p.color[1]},${p.color[2]},${(a * a * 0.9).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.7), 0, 6.2832);
        ctx.fill();
      }

      rafId = requestAnimationFrame(step);
    }

    function run() {
      if (!rafId && started && sceneVisible && pageVisible) {
        lastT = performance.now();
        rafId = requestAnimationFrame(step);
      }
    }

    return {
      start() {
        if (started || reduceMotion) return;
        started = true;
        resize();
        burst();
        burstIn = 450;
        run();
      },
      setSceneVisible(v) { sceneVisible = v; run(); },
      setPageVisible(v) { pageVisible = v; run(); },
    };
  })();

  document.addEventListener('visibilitychange', () => {
    fireworks.setPageVisible(!document.hidden);
  });

  /* ---------------- Section 2 orchestration ---------------- */

  // Must cover the end of the CSS reveal timeline in style.css:
  // field photo 0.3s→2.7s, solo tulip 1.4s→4.0s, halo settles at 5.4s.
  // Fireworks only join once the reveal has completely finished.
  const TULIP_TOTAL_MS = 6000;
  const MESSAGE_DELAY_MS = 700;
  let sceneStarted = false;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        fireworks.setSceneVisible(entry.isIntersecting);

        if (!sceneStarted && entry.intersectionRatio > 0.35) {
          sceneStarted = true;
          scene.classList.add('grow');

          if (reduceMotion) {
            // no reveal choreography or fireworks — just the finished scene
            message.classList.add('show');
          } else {
            setTimeout(() => {
              fireworks.start();
              setTimeout(() => message.classList.add('show'), MESSAGE_DELAY_MS);
            }, TULIP_TOTAL_MS);
          }
        }
      }
    },
    { threshold: [0, 0.35] }
  );
  io.observe(scene);
})();
