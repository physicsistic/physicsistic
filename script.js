const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Starfield
(() => {
  const canvas = document.getElementById('stars');
  const ctx = canvas.getContext('2d');
  let stars = [];

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round((innerWidth * innerHeight) / 5000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: Math.random() * 1.1 + 0.2,
      a: Math.random() * 0.5 + 0.1,
      t: Math.random() * Math.PI * 2,
    }));
  }

  function draw(time) {
    const rgb = getComputedStyle(document.documentElement).getPropertyValue('--star').trim();
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const s of stars) {
      const twinkle = reduceMotion ? 1 : 0.6 + 0.4 * Math.sin(time / 1400 + s.t);
      ctx.fillStyle = `rgba(${rgb}, ${s.a * twinkle})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!reduceMotion) requestAnimationFrame(draw);
  }

  addEventListener('resize', resize);
  resize();
  requestAnimationFrame(draw);
})();

// Cursor spotlight
addEventListener('pointermove', (e) => {
  document.documentElement.style.setProperty('--x', e.clientX + 'px');
  document.documentElement.style.setProperty('--y', e.clientY + 'px');
});

// Orrery: real Keplerian orbits, starting from today's positions.
// Planets: J2000 mean elements (Standish, JPL). 25102 Zhaoye: JPL Small-Body Database, orbit solution 52.
// Distances are square-root compressed so Earth and Jupiter both fit; angles and shapes are true.
(() => {
  const svg = document.getElementById('orrery');
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    svg.appendChild(n);
    return n;
  };
  const rad = Math.PI / 180;
  const scale = (au) => 58 * Math.sqrt(au);
  const J2000 = 2451545.0;

  // a (au), e, i, node, peri (argument of perihelion), M0 (deg at epoch), n (deg/day), epoch (JD)
  const planet = (a, e, i, L, varpi, node, Lrate) => ({
    a, e, i, node, peri: varpi - node, M0: L - varpi, n: Lrate / 36525, epoch: J2000,
  });
  const bodies = [
    { name: 'Earth', r: 3, cls: 'planet', ...planet(1.00000261, 0.01671123, 0, 100.46457166, 102.93768193, 0, 35999.37244981) },
    { name: 'Mars', r: 2.5, cls: 'planet', ...planet(1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891, 19140.30268499) },
    { name: 'Jupiter', r: 6, cls: 'planet', ...planet(5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909, 3034.74612775) },
    { name: 'Zhaoye', r: 3.5, cls: 'zhaoye', a: 2.687038898894236, e: 0.02374883082791939, i: 2.413764885603403,
      node: 294.4896599371769, peri: 210.8029562177128, M0: 320.8459119872244, n: 0.2237655079541734, epoch: 2461200.5 },
  ];

  // Heliocentric ecliptic position for mean anomaly M (deg), mapped to SVG coords.
  function position(b, M) {
    M = (((M % 360) + 360) % 360) * rad;
    let E = M;
    for (let k = 0; k < 8; k++) E -= (E - b.e * Math.sin(E) - M) / (1 - b.e * Math.cos(E));
    const xp = b.a * (Math.cos(E) - b.e);
    const yp = b.a * Math.sqrt(1 - b.e * b.e) * Math.sin(E);
    const w = b.peri * rad, O = b.node * rad, i = b.i * rad;
    const x = (Math.cos(w) * Math.cos(O) - Math.sin(w) * Math.sin(O) * Math.cos(i)) * xp +
              (-Math.sin(w) * Math.cos(O) - Math.cos(w) * Math.sin(O) * Math.cos(i)) * yp;
    const y = (Math.cos(w) * Math.sin(O) + Math.sin(w) * Math.cos(O) * Math.cos(i)) * xp +
              (-Math.sin(w) * Math.sin(O) + Math.cos(w) * Math.cos(O) * Math.cos(i)) * yp;
    const r = Math.hypot(x, y), k = scale(r) / r;
    return [x * k, -y * k];
  }

  // Main belt (decorative)
  for (let n = 0; n < 160; n++) {
    const au = 2.2 + Math.random() * 1.1;
    const th = Math.random() * Math.PI * 2;
    el('circle', { cx: scale(au) * Math.cos(th), cy: scale(au) * Math.sin(th), r: 0.8, class: 'belt' });
  }
  for (const b of bodies) {
    const pts = [];
    for (let M = 0; M < 360; M += 3) pts.push(position(b, M).map((v) => v.toFixed(2)).join(','));
    el('polygon', { points: pts.join(' '), class: b.cls === 'zhaoye' ? 'zhaoye-orbit' : 'orbit' });
  }
  el('circle', { cx: 0, cy: 0, r: 7, class: 'sun' });
  for (const b of bodies) b.node_el = el('circle', { r: b.r, class: b.cls });

  const label = el('text', { class: 'label-z' });
  label.textContent = '25102 Zhaoye';
  const clock = el('text', { x: -136, y: 134, class: 'clock' });

  const startJD = Date.now() / 86400000 + 2440587.5;
  const DAYS_PER_MS = 365.25 / 8000; // one Earth year every 8 seconds

  function frame(time) {
    const jd = startJD + (reduceMotion ? 0 : time * DAYS_PER_MS);
    for (const b of bodies) {
      const [x, y] = position(b, b.M0 + b.n * (jd - b.epoch));
      b.node_el.setAttribute('cx', x);
      b.node_el.setAttribute('cy', y);
      if (b.cls === 'zhaoye') {
        label.setAttribute('x', x + (x > 30 ? -72 : 7));
        label.setAttribute('y', y + (y < -110 ? 16 : -7));
      }
    }
    clock.textContent = new Date((jd - 2440587.5) * 86400000).toISOString().slice(0, 7);
    if (!reduceMotion) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

// Reveal sections and highlight nav
(() => {
  const sections = document.querySelectorAll('.reveal');
  const links = document.querySelectorAll('nav a');
  if (!('IntersectionObserver' in window)) {
    sections.forEach((s) => s.classList.add('in'));
    return;
  }
  const reveal = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) e.target.classList.add('in');
  }, { threshold: 0.1 });
  sections.forEach((s) => reveal.observe(s));

  const active = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    }
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach((s) => active.observe(s));
})();
