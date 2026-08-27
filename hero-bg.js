/* Hero background — canvas pixel grid with light travelling through it.
   Matches the reference technique (full-bleed canvas, not CSS), and reads
   for this niche as signal moving through a system.

   Only runs when html.motion-on is set, only on the homepage hero, and
   stops itself when the hero scrolls out of view so it costs nothing
   while the visitor is reading the rest of the page. */
(function () {
  if (!document.documentElement.classList.contains('motion-on')) return;
  var host = document.querySelector('.hero .hero-fx');
  if (!host) return;

  var cfg = window.FB_HERO_BG || {};
  var DOT = cfg.dot || 'rgba(56,186,223,';
  var LIT = cfg.lit || 'rgba(111,216,246,';
  var GAP = cfg.gap || 26;
  var BASE = cfg.base || 0.10;

  var canvas = document.createElement('canvas');
  canvas.className = 'hero-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var cols = 0, rows = 0;

  function size() {
    // Measure the hero itself, not the effects layer: .hero-fx is display:none
    // whenever motion is off, and measuring a hidden element yields a 1px box.
    var target = host.parentElement || host;
    var r = target.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) { w = h = 0; return; }
    w = Math.round(r.width);
    h = Math.round(r.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / GAP) + 1;
    rows = Math.ceil(h / GAP) + 1;
  }
  size();

  var t = 0, raf = null, running = false;

  function frame() {
    if (!w || !h) { size(); if (!w || !h) { raf = requestAnimationFrame(frame); return; } }
    t += 0.016;
    ctx.clearRect(0, 0, w, h);

    // two wave fronts crossing the grid at different speeds and angles
    var w1 = (t * 0.19) % 2.2 - 0.6;
    var w2 = (t * 0.12 + 1.1) % 2.4 - 0.7;

    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var px = x * GAP, py = y * GAP;
        var u = px / w, v = py / h;

        // distance from each diagonal wave front
        var d1 = Math.abs((u * 0.75 + v * 0.25) - w1);
        var d2 = Math.abs((u * 0.2 + (1 - v) * 0.8) - w2);
        var lit = Math.max(0, 1 - d1 / 0.13) + Math.max(0, 1 - d2 / 0.16) * 0.75;
        lit = Math.min(1, lit);

        // gentle idle shimmer so the grid is never fully dead
        var idle = 0.5 + 0.5 * Math.sin(t * 0.7 + x * 0.35 + y * 0.22);
        var a = BASE * (0.55 + idle * 0.45);
        var rad = 1.1;

        if (lit > 0.01) {
          a = BASE + lit * 0.75;
          rad = 1.1 + lit * 1.9;
        }

        ctx.beginPath();
        ctx.fillStyle = (lit > 0.35 ? LIT : DOT) + a.toFixed(3) + ')';
        ctx.arc(px, py, rad, 0, 6.2832);
        ctx.fill();
      }
    }
    raf = requestAnimationFrame(frame);
  }

  function start() { if (!running) { running = true; frame(); } }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  // only animate while the hero is actually on screen
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.isIntersecting ? start() : stop(); });
    }, { threshold: 0 }).observe(host);
  } else { start(); }

  // Track the hero's real box rather than guessing from window resizes.
  if ('ResizeObserver' in window) {
    new ResizeObserver(function () { size(); }).observe(host.parentElement || host);
  } else {
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt); rt = setTimeout(size, 150);
    }, { passive: true });
  }

  // If the motion failsafe turns motion off after load, tear the canvas down
  // rather than leaving an invisible one running.
  new MutationObserver(function () {
    if (!document.documentElement.classList.contains('motion-on')) {
      stop();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  document.addEventListener('visibilitychange', function () {
    document.hidden ? stop() : start();
  });
})();
