// Electric field animation for the home page hero.
// A fixed positive charge sits on the logo's nucleus; an electron follows the
// mouse (or drifts on its own). Curved arrows and faint lines trace the field
// of the two charges, computed with Coulomb's law.
(() => {
  const hero = document.querySelector(".hero");
  const logo = document.querySelector(".hero-logo img");
  if (!hero) return;

  const canvas = document.createElement("canvas");
  canvas.className = "field-canvas";
  canvas.setAttribute("aria-hidden", "true");
  hero.prepend(canvas);
  const ctx = canvas.getContext("2d");

  const NUCLEUS = { x: 77.8 / 154, y: 71.7 / 151 };
  const SKY = "#1cb0f6", SKY_DARK = "#1899d6", ORANGE = "#ff9600", LINE = "#d6e9f3";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, grid = [];
  let proton = { x: 0, y: 0 }, logoRadius = 0;
  const electron = { x: 0, y: 0 };
  let target = { x: 0, y: 0 };
  let pointerInside = false, visible = true, t = 0, frame = null;

  function layout() {
    const dpr = window.devicePixelRatio || 1;
    W = hero.clientWidth;
    H = hero.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const h = hero.getBoundingClientRect();
    if (logo && logo.offsetWidth) {
      const r = logo.getBoundingClientRect();
      // Center of the atom's nucleus in fallon-logo.svg, measured from the
      // embedded 154x151 image (not the image's geometric center).
      proton = { x: r.left - h.left + r.width * NUCLEUS.x, y: r.top - h.top + r.height * NUCLEUS.y };
      logoRadius = r.width / 2;
    } else {
      proton = { x: W * 0.8, y: H * 0.5 };
      logoRadius = 0;
    }

    grid = [];
    const gap = 36;
    for (let y = gap / 2; y < H; y += gap)
      for (let x = gap / 2; x < W; x += gap) grid.push({ x, y });

    if (!pointerInside) {
      electron.x = target.x = W * 0.45;
      electron.y = target.y = H * 0.3;
    }
    if (reduceMotion) render();
  }

  // Field of +1 at the proton and -1 at the electron (softened near each charge).
  function fieldDir(x, y) {
    let ex = 0, ey = 0, dx, dy, r2, r;
    dx = x - proton.x; dy = y - proton.y; r2 = dx * dx + dy * dy + 40; r = Math.sqrt(r2);
    ex += dx / (r2 * r); ey += dy / (r2 * r);
    dx = x - electron.x; dy = y - electron.y; r2 = dx * dx + dy * dy + 40; r = Math.sqrt(r2);
    ex -= dx / (r2 * r); ey -= dy / (r2 * r);
    const m = Math.hypot(ex, ey) || 1e-12;
    return [ex / m, ey / m, m];
  }

  const near = (x, y, c, r) => Math.hypot(x - c.x, y - c.y) < r;
  const insideLogo = (x, y) => logoRadius && near(x, y, proton, logoRadius + 4);

  // The electron rides along the logo's edge instead of crossing over it.
  function keepOffLogo(c) {
    const min = (logoRadius || 0) + 16;
    const dx = c.x - proton.x, dy = c.y - proton.y, d = Math.hypot(dx, dy) || 1;
    if (d < min) { c.x = proton.x + (dx / d) * min; c.y = proton.y + (dy / d) * min; }
  }

  function drawFieldLines() {
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.2;
    const n = 20, start = (logoRadius || 12) + 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      let x = proton.x + Math.cos(a) * start, y = proton.y + Math.sin(a) * start;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 600; k++) {
        const [u, v] = fieldDir(x, y);
        x += u * 4; y += v * 4;
        if (insideLogo(x, y)) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        if (near(x, y, electron, 10) || x < -20 || y < -20 || x > W + 20 || y > H + 20) break;
      }
      ctx.stroke();
    }
  }

  function drawArrow(p, strength) {
    let x = p.x, y = p.y;
    const path = [[x, y]], len = 10 + 8 * strength, step = len / 5;
    for (let k = 0; k < 5; k++) {
      const [u, v] = fieldDir(x, y);
      x += u * step; y += v * step;
      path.push([x, y]);
      if (near(x, y, electron, 10) || insideLogo(x, y)) break;
    }
    ctx.globalAlpha = 0.2 + 0.6 * strength;
    ctx.strokeStyle = SKY;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(path[0][0], path[0][1]);
    for (const q of path) ctx.lineTo(q[0], q[1]);
    ctx.stroke();
    const [u, v] = fieldDir(x, y);
    ctx.fillStyle = SKY;
    ctx.beginPath();
    ctx.moveTo(x + u * 5, y + v * 5);
    ctx.lineTo(x - u * 3 - v * 4, y - v * 3 + u * 4);
    ctx.lineTo(x - u * 3 + v * 4, y - v * 3 - u * 4);
    ctx.closePath();
    ctx.fill();
  }

  function drawCharge(c, color, label, radius) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `700 ${radius + 3}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, c.x, c.y + 1);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    drawFieldLines();
    for (const p of grid) {
      if (near(p.x, p.y, electron, 18) || insideLogo(p.x, p.y) || near(p.x, p.y, proton, 18)) continue;
      const m = fieldDir(p.x, p.y)[2];
      const s = Math.max(0, Math.min(1, (Math.log10(m) + 5.6) / 1.6));
      drawArrow(p, s);
    }
    drawCharge(proton, ORANGE, "+", 10);
    drawCharge(electron, SKY_DARK, "−", 12);
  }

  function tick() {
    frame = null;
    if (!visible) return;
    t += 0.007;
    if (!pointerInside) {
      target.x = W * 0.45 + Math.cos(t) * W * 0.25;
      target.y = H * 0.5 + Math.sin(t * 1.4) * H * 0.32;
    }
    electron.x += (target.x - electron.x) * 0.12;
    electron.y += (target.y - electron.y) * 0.12;
    keepOffLogo(electron);
    render();
    frame = requestAnimationFrame(tick);
  }

  function start() { if (!frame && !reduceMotion) frame = requestAnimationFrame(tick); }

  function pointerPos(ev) {
    const r = hero.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }
  hero.addEventListener("pointerenter", ev => { pointerInside = true; target = pointerPos(ev); start(); });
  hero.addEventListener("pointermove", ev => {
    pointerInside = true;
    target = pointerPos(ev);
    if (reduceMotion) { electron.x = target.x; electron.y = target.y; keepOffLogo(electron); render(); }
  });
  hero.addEventListener("pointerleave", () => { pointerInside = false; });

  // Pause when the hero is off screen to save battery.
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
  }).observe(hero);

  new ResizeObserver(layout).observe(hero);
  if (logo) logo.addEventListener("load", layout);
  layout();
  start();
})();
