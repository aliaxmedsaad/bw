/* ==========================================================
   For Aisha 🌷 — scene logic
   1. Touch/mouse-reactive lantern glows on the hero image
   2. IntersectionObserver starts the tulip growth
   3. When the tulips finish, fireworks start automatically
      and the birthday message reveals letter by letter
   Plain JavaScript, no dependencies, works from file://
   ========================================================== */

(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Section 1 · lantern hotspots ---------------- */

  const hero = document.getElementById('hero');
  const layer = document.getElementById('lanternLayer');

  // percentage positions over the hero, roughly matching lantern
  // clusters in the photo; s = relative size of the glow
  const LANTERNS = [
    { x: 50, y: 6,  s: 1.0 },
    { x: 22, y: 14, s: 0.85 },
    { x: 75, y: 12, s: 0.95 },
    { x: 36, y: 26, s: 0.8 },
    { x: 10, y: 33, s: 0.8 },
    { x: 88, y: 29, s: 0.9 },
    { x: 62, y: 37, s: 0.85 },
    { x: 30, y: 45, s: 0.75 },
    { x: 14, y: 50, s: 0.8 },
    { x: 79, y: 55, s: 1.25 }, // the lantern by the boat
  ];

  const glows = LANTERNS.map((cfg) => {
    const el = document.createElement('div');
    el.className = 'lantern';
    el.style.left = cfg.x + '%';
    el.style.top = cfg.y + '%';
    el.style.setProperty('--size', Math.round(84 * cfg.s) + 'px');

    const core = document.createElement('div');
    core.className = 'lantern-glow';
    // desynchronise the idle pulses so they feel alive
    core.style.animationDelay = (-Math.random() * 4).toFixed(2) + 's';
    core.style.animationDuration = (2.8 + Math.random() * 2.2).toFixed(2) + 's';
    el.appendChild(core);
    layer.appendChild(el);

    return { el, cfg, boost: 0 };
  });

  const RADIUS = 150; // px of influence around a fingertip / cursor
  const pointer = { x: 0, y: 0, active: false, lastMove: 0 };
  let glowRaf = 0;

  function onPoint(x, y) {
    pointer.x = x;
    pointer.y = y;
    pointer.active = true;
    pointer.lastMove = performance.now();
    if (!glowRaf) glowRaf = requestAnimationFrame(glowFrame);
  }

  hero.addEventListener('pointermove', (e) => onPoint(e.clientX, e.clientY), { passive: true });
  hero.addEventListener('pointerdown', (e) => onPoint(e.clientX, e.clientY), { passive: true });
  // explicit touch support for browsers without pointer events
  hero.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (t) onPoint(t.clientX, t.clientY);
  }, { passive: true });
  hero.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (t) onPoint(t.clientX, t.clientY);
  }, { passive: true });

  // one light rAF loop: eases each lantern's --boost toward its target,
  // then goes idle once everything has faded back down
  function glowFrame(now) {
    const rect = hero.getBoundingClientRect();
    const idle = now - pointer.lastMove > 2200;
    let anyLit = false;

    for (const g of glows) {
      let target = 0;
      if (pointer.active && !idle) {
        const cx = rect.left + (rect.width * g.cfg.x) / 100;
        const cy = rect.top + (rect.height * g.cfg.y) / 100;
        const d = Math.hypot(pointer.x - cx, pointer.y - cy);
        const t = Math.max(0, 1 - d / RADIUS);
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
      span.textContent = ch === ' ' ? ' ' : ch;
      span.style.transitionDelay = (charIndex++ * 0.045).toFixed(3) + 's';
      span.setAttribute('aria-hidden', 'true');
      line.appendChild(span);
    }
  });

  /* ---------------- fireworks (canvas, section 2 only) ---------------- */

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

    const rockets = [];
    const sparks = [];
    let started = false;
    let sceneVisible = false;
    let pageVisible = !document.hidden;
    let rafId = 0;
    let lastT = 0;
    let launchIn = 0;

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

    function launch() {
      const w = scene.clientWidth;
      const h = scene.clientHeight;
      rockets.push({
        x: w * (0.15 + Math.random() * 0.7),
        y: h + 8,
        vy: -(h * 0.011 + Math.random() * h * 0.004),
        targetY: h * (0.16 + Math.random() * 0.3),
        color: pick(),
      });
    }

    function explode(r) {
      const n = 38 + ((Math.random() * 22) | 0);
      const base = 1.6 + Math.random() * 1.2;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.12;
        const sp = base * (0.35 + 0.65 * Math.sqrt(Math.random()));
        sparks.push({
          x: r.x,
          y: r.y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0,
          max: 70 + Math.random() * 40,
          size: 1.1 + Math.random() * 1.1,
          color: Math.random() < 0.85 ? r.color : [255, 255, 255],
        });
      }
    }

    function step(now) {
      rafId = 0;
      if (!sceneVisible || !pageVisible) return; // paused; resumes on visibility
      const dt = Math.min(2.5, (now - lastT) / 16.7 || 1); // in ~60fps frames
      lastT = now;

      // gentle launch cadence, capped so mobiles never drown in particles
      launchIn -= dt * 16.7;
      if (launchIn <= 0 && sparks.length < 240) {
        launch();
        if (Math.random() < 0.25) launch(); // occasional pair
        launchIn = 700 + Math.random() * 800;
      }

      // fade the previous frame toward black for soft trails
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(0, 0, scene.clientWidth, scene.clientHeight);
      ctx.globalCompositeOperation = 'lighter';

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.y += r.vy * dt;
        ctx.fillStyle = `rgba(${r.color[0]},${r.color[1]},${r.color[2]},0.9)`;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 1.6, 0, 6.2832);
        ctx.fill();
        if (r.y <= r.targetY) {
          rockets.splice(i, 1);
          explode(r);
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life += dt;
        if (p.life >= p.max) {
          sparks.splice(i, 1);
          continue;
        }
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + 0.028 * dt; // drag + soft gravity
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
        launch();
        launch();
        launchIn = 500;
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

  // must match the end of the CSS growth timeline (lean ends at 5.5s,
  // glow fades in by ~6.3s; fireworks join as the glow settles)
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
            // no bloom choreography or fireworks — just the finished scene
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
