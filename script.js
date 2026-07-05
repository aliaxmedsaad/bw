/* ==========================================================
   For Aisha — three-scene story logic
   1. Scroll progress drives the scene-1 lake zoom + fade
   2. Scene 2: message reveal, lanterns drift in from off-screen
      and stay, glowing brighter near a fingertip
   3. Scene 3: tulip bloom timeline → starburst fireworks
      (point-origin, no rockets) → word-by-word message reveal
   Plain JavaScript, no dependencies, works from file://
   ========================================================== */

(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);

  /* ---------------- helpers: split text into word spans ---------------- */

  // wraps each word of `text` in a .word span appended to `el`,
  // staggering transition delays from `base` by `step` seconds
  function wordify(el, text, base, step, startIndex = 0) {
    const words = text.trim().split(/\s+/);
    words.forEach((w, i) => {
      const span = document.createElement('span');
      span.className = 'word';
      span.textContent = w;
      span.setAttribute('aria-hidden', 'true');
      span.style.transitionDelay = (base + (startIndex + i) * step).toFixed(2) + 's';
      el.appendChild(span);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return startIndex + words.length;
  }

  /* ================================================================
     SCENE 1 · sunset lake — ambient particles + scroll-driven zoom
     ================================================================ */

  const sunset = document.getElementById('sunset');
  const sticky = document.getElementById('sunsetSticky');

  // floating golden/pink motes
  (() => {
    const holder = document.getElementById('sunsetParticles');
    const count = reduceMotion ? 8 : 16;
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.style.setProperty('--x', rand(3, 95).toFixed(1) + '%');
      s.style.setProperty('--y', rand(5, 70).toFixed(1) + '%');
      s.style.setProperty('--d', rand(3, 7).toFixed(1) + 'px');
      s.style.setProperty('--dur', rand(4, 8).toFixed(2) + 's');
      s.style.setProperty('--delay', rand(0.6, 3.5).toFixed(2) + 's');
      holder.appendChild(s);
    }
  })();

  // scroll progress 0→1 across the sunset section's extra height;
  // CSS consumes --p for the zoom, fades and the dark veil
  let scrollTick = false;
  function readProgress() {
    scrollTick = false;
    const rect = sunset.getBoundingClientRect();
    const vh = window.innerHeight;
    const runway = rect.height - vh;
    const p = runway > 0 ? Math.min(1, Math.max(0, -rect.top / runway)) : 0;
    sticky.style.setProperty('--p', p.toFixed(4));
  }
  function onScroll() {
    if (!scrollTick) {
      scrollTick = true;
      requestAnimationFrame(readProgress);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  readProgress();

  /* ================================================================
     SCENE 2 · dark lantern boat — message + lantern flight + touch
     ================================================================ */

  const lanternScene = document.getElementById('lanterns');
  const lanternField = document.getElementById('lanternField');
  const lanternMsg = document.getElementById('lanternMessage');

  // split "You make every day special" into rising words
  {
    const text = lanternMsg.textContent;
    lanternMsg.textContent = '';
    lanternMsg.setAttribute('aria-label', text.trim());
    wordify(lanternMsg, text, 0.5, 0.16);
  }

  const LANTERN_COUNT = 18;
  const lanterns = []; // { el, x, y, boost } for the touch glow

  function spawnLanterns() {
    const w = lanternField.clientWidth;
    const h = lanternField.clientHeight;
    const edges = ['left', 'right', 'top', 'bottom'];

    for (let i = 0; i < LANTERN_COUNT; i++) {
      // scatter positions, keeping the central message band clear so
      // "You make every day special" stays readable: any lantern that
      // would land near the message is pushed to the side edges
      let x = rand(4, 92);
      let y = rand(5, 74);
      if (y > 10 && y < 40 && x > 16 && x < 84) {
        x = x < 50 ? rand(2, 14) : rand(86, 95);
      }

      const el = document.createElement('div');
      el.className = 'lantern';
      const s = rand(0.75, 1.7);
      if (s < 1.02) el.classList.add('far');

      // off-screen start offset, per entry edge
      const edge = edges[i % 4];
      let sx = 0, sy = 0;
      if (edge === 'left')   { sx = -((x / 100) * w + 90);       sy = rand(-50, 50); }
      if (edge === 'right')  { sx = ((100 - x) / 100) * w + 90;  sy = rand(-50, 50); }
      if (edge === 'top')    { sy = -((y / 100) * h + 90);       sx = rand(-60, 60); }
      if (edge === 'bottom') { sy = ((100 - y) / 100) * h + 90;  sx = rand(-60, 60); }

      const edelay = reduceMotion ? 0 : rand(2.0, 4.2);
      const edur = reduceMotion ? 0.01 : rand(2.2, 3.6);

      el.style.setProperty('--lx', x.toFixed(1) + '%');
      el.style.setProperty('--ly', y.toFixed(1) + '%');
      el.style.setProperty('--s', s.toFixed(2));
      el.style.setProperty('--sx', (reduceMotion ? 0 : sx).toFixed(0) + 'px');
      el.style.setProperty('--sy', (reduceMotion ? 0 : sy).toFixed(0) + 'px');
      el.style.setProperty('--edelay', edelay.toFixed(2) + 's');
      el.style.setProperty('--edur', edur.toFixed(2) + 's');

      const float = document.createElement('div');
      float.className = 'l-float';
      float.style.setProperty('--fdur', rand(4.5, 7.5).toFixed(2) + 's');
      float.style.setProperty('--fdelay', (edelay + edur).toFixed(2) + 's');

      const body = document.createElement('div');
      body.className = 'l-body';
      body.style.setProperty('--pdur', rand(2.6, 4.6).toFixed(2) + 's');
      body.style.setProperty('--pdelay', (-rand(0, 4)).toFixed(2) + 's');

      float.appendChild(body);
      el.appendChild(float);
      lanternField.appendChild(el);
      lanterns.push({ el, x, y, boost: 0 });
    }
  }

  // touch/pointer proximity brightens nearby lanterns (never blocks scroll)
  const RADIUS = 150;
  const pointer = { x: 0, y: 0, active: false, lastMove: 0 };
  let glowRaf = 0;

  function onPoint(x, y) {
    pointer.x = x;
    pointer.y = y;
    pointer.active = true;
    pointer.lastMove = performance.now();
    if (!glowRaf) glowRaf = requestAnimationFrame(glowFrame);
  }
  lanternScene.addEventListener('pointermove', (e) => onPoint(e.clientX, e.clientY), { passive: true });
  lanternScene.addEventListener('pointerdown', (e) => onPoint(e.clientX, e.clientY), { passive: true });
  lanternScene.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (t) onPoint(t.clientX, t.clientY);
  }, { passive: true });
  lanternScene.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (t) onPoint(t.clientX, t.clientY);
  }, { passive: true });

  function glowFrame(now) {
    const rect = lanternScene.getBoundingClientRect();
    const idle = now - pointer.lastMove > 2200;
    let anyLit = false;

    for (const g of lanterns) {
      let target = 0;
      if (pointer.active && !idle) {
        const cx = rect.left + (rect.width * g.x) / 100;
        const cy = rect.top + (rect.height * g.y) / 100;
        const d = Math.hypot(pointer.x - cx, pointer.y - cy);
        const t = Math.max(0, 1 - d / RADIUS);
        target = t * t * (3 - 2 * t); // smoothstep falloff
      }
      g.boost += (target - g.boost) * 0.14;
      if (g.boost < 0.004) g.boost = 0;
      else anyLit = true;
      g.el.style.setProperty('--boost', g.boost.toFixed(3));
    }

    glowRaf = anyLit || !idle ? requestAnimationFrame(glowFrame) : 0;
  }

  let lanternsStarted = false;
  const lanternIO = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!lanternsStarted && entry.intersectionRatio > 0.35) {
          lanternsStarted = true;
          lanternScene.classList.add('active'); // boat + message reveal
          spawnLanterns();                      // lanterns drift in and stay
          lanternIO.disconnect();
        }
      }
    },
    { threshold: [0, 0.35] }
  );
  lanternIO.observe(lanternScene);

  /* ================================================================
     SCENE 3 · finale — stars, tulips, petals, starburst fireworks
     ================================================================ */

  const finale = document.getElementById('finale');
  const finalMsg = document.getElementById('finalMessage');

  // split the exact final message into rising words (across both lines)
  {
    let idx = 0;
    finalMsg.querySelectorAll('.message-line').forEach((line) => {
      idx = wordify(line, line.dataset.line, 0, 0.22, idx);
    });
  }

  // faint twinkling background stars
  (() => {
    const holder = document.getElementById('finaleStars');
    const count = reduceMotion ? 8 : 16;
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.style.setProperty('--x', rand(2, 96).toFixed(1) + '%');
      s.style.setProperty('--y', rand(2, 60).toFixed(1) + '%');
      s.style.setProperty('--d', rand(2, 4.5).toFixed(1) + 'px');
      s.style.setProperty('--dur', rand(2.5, 5.5).toFixed(2) + 's');
      s.style.setProperty('--delay', rand(0, 4).toFixed(2) + 's');
      holder.appendChild(s);
    }
  })();

  // gentle recycled falling petals (start after the bloom, ~4.4s in)
  function spawnPetals() {
    const holder = document.getElementById('petalLayer');
    for (let i = 0; i < 10; i++) {
      const p = document.createElement('div');
      p.className = 'fall-petal';
      p.style.setProperty('--px', rand(6, 92).toFixed(1) + '%');
      p.style.setProperty('--pw', rand(9, 14).toFixed(1) + 'px');
      p.style.setProperty('--ph', rand(13, 19).toFixed(1) + 'px');
      p.style.setProperty('--dx', rand(-60, 60).toFixed(0) + 'px');
      p.style.setProperty('--dur', rand(7, 11).toFixed(2) + 's');
      p.style.setProperty('--delay', (4.4 + rand(0, 5.5)).toFixed(2) + 's');
      holder.appendChild(p);
    }
  }

  /* ---------------- starburst fireworks (canvas) ----------------
     Point-origin radial explosions: a bright core swells, then a
     star of glowing sparks expands outward. No bottom rockets.    */

  const fireworks = (() => {
    const canvas = document.getElementById('fireworks');
    const ctx = canvas.getContext('2d');

    // gold and soft pink lead; white sparkle and a touch of purple
    const COLORS = [
      [255, 210, 122], [255, 210, 122], [255, 184, 112],
      [255, 143, 189], [255, 143, 189], [255, 79, 154],
      [255, 255, 255], [214, 160, 255],
    ];

    const cores = [];
    const sparks = [];
    let started = false;
    let calm = false;
    let sceneVisible = false;
    let pageVisible = !document.hidden;
    let rafId = 0;
    let lastT = 0;
    let burstIn = 0;

    function resize() {
      const w = finale.clientWidth;
      const h = finale.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75); // cap for mobile GPUs
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', () => { if (started) resize(); });

    const pick = () => COLORS[(Math.random() * COLORS.length) | 0];

    // a burst begins as a swelling star core at a random point;
    // bursts in the upper (message) band are pushed to the outer
    // sides so they never sit directly over the final text
    function spawnBurst() {
      const w = finale.clientWidth;
      const h = finale.clientHeight;
      let x = rand(0.14, 0.86);
      const y = rand(0.1, 0.52);
      if (y < 0.32) {
        x = x < 0.5 ? rand(0.08, 0.24) : rand(0.76, 0.92);
      }
      cores.push({
        x: w * x,
        y: h * y,
        life: 0,
        max: 24 + Math.random() * 10, // ~0.4–0.55s swell
        color: pick(),
      });
    }

    function explode(c) {
      const n = calm ? 14 + ((Math.random() * 8) | 0) : 26 + ((Math.random() * 20) | 0);
      const base = 1.7 + Math.random() * 1.3;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.1;
        const sp = base * (0.4 + 0.6 * Math.sqrt(Math.random()));
        sparks.push({
          x: c.x,
          y: c.y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0,
          max: 65 + Math.random() * 45,
          size: 1.3 + Math.random() * 1.4,
          color: Math.random() < 0.85 ? c.color : [255, 255, 255],
        });
      }
    }

    function step(now) {
      rafId = 0;
      if (!sceneVisible || !pageVisible) return; // paused; resumes on visibility
      const dt = Math.min(2.5, (now - lastT) / 16.7 || 1); // in ~60fps frames
      lastT = now;

      // burst cadence — slower and sparser once the message has landed
      burstIn -= dt * 16.7;
      if (burstIn <= 0 && sparks.length < 240) {
        spawnBurst();
        if (!calm && Math.random() < 0.3) spawnBurst(); // occasional pair
        burstIn = calm ? rand(2800, 4200) : rand(750, 1400);
      }

      const w = finale.clientWidth;
      const h = finale.clientHeight;

      // erase a little alpha each frame → soft fading trails,
      // canvas stays transparent so spotlight/stars show through
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      // swelling cores — a bright point that flashes before the star
      for (let i = cores.length - 1; i >= 0; i--) {
        const c = cores[i];
        c.life += dt;
        const t = c.life / c.max;
        if (t >= 1) {
          cores.splice(i, 1);
          explode(c);
          continue;
        }
        const r = 1.5 + t * 3.6;
        ctx.save();
        ctx.shadowBlur = 16;
        ctx.shadowColor = `rgba(${c.color[0]},${c.color[1]},${c.color[2]},0.9)`;
        ctx.fillStyle = `rgba(255,255,255,${(0.35 + t * 0.65).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, 6.2832);
        ctx.fill();
        ctx.restore();
      }

      // radial sparks with drag, soft gravity and a glow halo
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life += dt;
        if (p.life >= p.max) {
          sparks.splice(i, 1);
          continue;
        }
        p.vx *= 0.984;
        p.vy = p.vy * 0.984 + 0.022 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const a = 1 - p.life / p.max;
        const [cr, cg, cb] = p.color;
        const size = p.size * (0.5 + a * 0.7);
        // faint halo + bright core (cheaper than shadowBlur per spark)
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${(a * a * 0.24).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 2.6, 0, 6.2832);
        ctx.fill();
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${(a * a * 0.9).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, 6.2832);
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
        spawnBurst();
        burstIn = 500;
        run();
      },
      calmDown() { calm = true; },
      setSceneVisible(v) { sceneVisible = v; run(); },
      setPageVisible(v) { pageVisible = v; run(); },
    };
  })();

  document.addEventListener('visibilitychange', () => {
    fireworks.setPageVisible(!document.hidden);
  });

  /* ---------------- scene 3 orchestration ----------------
     0.0s spotlight · 0.8s stems · 1.8s leaves · 2.4s heads ·
     3.0s petals bloom · 4.0s glow · 4.4s petals fall ·
     5.8s star cores / first bursts · 7.2s message · then calm */

  const FIREWORKS_AT = 5800;
  const MESSAGE_AT = 7200;
  const CALM_AT = 9500; // calm soon after the message settles, for readability
  let finaleStarted = false;

  const finaleIO = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        fireworks.setSceneVisible(entry.isIntersecting);

        if (!finaleStarted && entry.intersectionRatio > 0.35) {
          finaleStarted = true;
          finale.classList.add('grow');

          if (reduceMotion) {
            // no choreography — just the finished, readable scene
            finalMsg.classList.add('show');
          } else {
            spawnPetals(); // petal delays start at ~4.4s
            setTimeout(() => fireworks.start(), FIREWORKS_AT);
            setTimeout(() => finalMsg.classList.add('show'), MESSAGE_AT);
            setTimeout(() => fireworks.calmDown(), CALM_AT);
          }
        }
      }
    },
    { threshold: [0, 0.35] }
  );
  finaleIO.observe(finale);
})();
