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

// Orrery: planets move with Kepler's third law (period ∝ a^1.5). Radii are compressed, not to scale.
(() => {
  const svg = document.getElementById('orrery');
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    svg.appendChild(n);
    return n;
  };
  const scale = (au) => 58 * Math.sqrt(au);

  const bodies = [
    { name: 'Earth', au: 1.0, r: 3, cls: 'planet' },
    { name: 'Mars', au: 1.52, r: 2.5, cls: 'planet' },
    { name: 'Zhaoye', au: 2.6, r: 3.5, cls: 'zhaoye' },
    { name: 'Jupiter', au: 5.2, r: 6, cls: 'planet' },
  ];

  // Main belt
  for (let i = 0; i < 160; i++) {
    const au = 2.2 + Math.random() * 1.1;
    const th = Math.random() * Math.PI * 2;
    el('circle', { cx: scale(au) * Math.cos(th), cy: scale(au) * Math.sin(th), r: 0.8, class: 'belt' });
  }
  for (const b of bodies) {
    el('circle', { cx: 0, cy: 0, r: scale(b.au), class: b.cls === 'zhaoye' ? 'zhaoye-orbit' : 'orbit' });
  }
  el('circle', { cx: 0, cy: 0, r: 7, class: 'sun' });

  for (const b of bodies) {
    b.node = el('circle', { r: b.r, class: b.cls });
    b.phase = Math.random() * Math.PI * 2;
    b.period = Math.pow(b.au, 1.5);
  }
  const label = el('text', { class: 'label-z' });
  label.textContent = '25102 Zhaoye';

  function frame(time) {
    const years = reduceMotion ? 0 : time / 9000;
    for (const b of bodies) {
      const th = b.phase + (2 * Math.PI * years) / b.period;
      const x = scale(b.au) * Math.cos(th);
      const y = scale(b.au) * Math.sin(th);
      b.node.setAttribute('cx', x);
      b.node.setAttribute('cy', y);
      if (b.cls === 'zhaoye') {
        label.setAttribute('x', x + (x > 40 ? -70 : 7));
        label.setAttribute('y', y - 7);
      }
    }
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
