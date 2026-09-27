/* Bahniman Talukdar · portfolio behaviour
   Lenis smooth wheel scroll, reveal-on-scroll, active nav, progress line,
   floating back-to-top pill, circular theme switch, copy email. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var topBar = document.getElementById('top');
  var prog = document.getElementById('prog');
  var floatBtn = document.getElementById('float');
  var ring = document.getElementById('ring');
  var floatLabel = document.getElementById('floatLabel');
  var hero = document.getElementById('hero');
  var sheet = document.querySelector('.sheet');

  /* ---- load-in ---- */
  function start() {
    document.body.classList.add('loaded');
    if (sheet) sheet.classList.add('go');
  }
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 900); })]).then(start);
  } else { start(); }

  /* ---- smooth wheel scrolling (Lenis) ---- */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.08, smoothWheel: true, syncTouch: false });
    var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  /* land each section's heading about 40px under the top bar, skipping its top padding */
  function goTo(target) {
    if (target === 0) {
      if (lenis) lenis.scrollTo(0, { duration: 1.1 }); else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      return;
    }
    var pad = parseFloat(getComputedStyle(target).paddingTop) || 0;
    var bar = topBar ? topBar.offsetHeight : 64;
    var y = target.getBoundingClientRect().top + window.scrollY + pad - bar - 40;
    if (lenis) lenis.scrollTo(Math.max(0, y), { duration: 1.1 });
    else window.scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' });
  }
  document.querySelectorAll('a[data-go]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      var el = id === '#hero' ? null : document.querySelector(id);
      e.preventDefault();
      goTo(el || 0);
      if (history.replaceState) history.replaceState(null, '', id === '#hero' ? location.pathname : id);
      if (el) { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
    });
  });
  if (floatBtn) floatBtn.addEventListener('click', function () { goTo(0); });

  /* ---- reveal on scroll ---- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- active section in nav ---- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  var sections = navLinks.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  var labels = { hero: 'Top', path: 'Path', work: 'Work', lab: 'Lab', record: 'Record', contact: 'Contact' };
  var allSecs = ['hero', 'path', 'work', 'lab', 'record', 'contact'].map(function (id) { return document.getElementById(id); });

  /* ---- one scroll handler, batched per frame ---- */
  var ticking = false;
  function update() {
    ticking = false;
    /* reads first */
    var y = window.scrollY;
    var vh = window.innerHeight;
    var max = document.documentElement.scrollHeight - vh;
    var heroEnd = hero ? hero.offsetTop + hero.offsetHeight * 0.6 : 400;
    var mark = y + vh * 0.35;
    var cur = null;
    allSecs.forEach(function (s) { if (s && s.offsetTop <= mark) cur = s; });
    /* then writes */
    var p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    prog.style.transform = 'scaleX(' + p + ')';
    topBar.classList.toggle('scrolled', y > 8);
    floatBtn.classList.toggle('show', y > heroEnd);
    ring.style.strokeDashoffset = String(100 - p * 100);
    if (cur && floatLabel) floatLabel.textContent = labels[cur.id] || 'Top';
    navLinks.forEach(function (a, i) {
      var on = sections[i] === cur;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();

  /* ---- theme: circular reveal from the button ---- */
  var themeBtn = document.getElementById('theme');
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  function isDark() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : mq.matches;
  }
  var metas = document.querySelectorAll('meta[name="theme-color"]');
  function syncMeta() {
    var d = isDark();
    themeBtn.setAttribute('aria-label', d ? 'Switch to light theme' : 'Switch to dark theme');
    if (root.getAttribute('data-theme')) metas.forEach(function (m) { m.setAttribute('content', d ? '#141313' : '#faf9f6'); });
  }
  syncMeta();
  themeBtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    var apply = function () {
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      syncMeta();
    };
    if (!document.startViewTransition || reduce) { apply(); return; }
    var r = themeBtn.getBoundingClientRect();
    var x = r.left + r.width / 2, yy = r.top + r.height / 2;
    var rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(yy, innerHeight - yy));
    root.style.setProperty('--vx', x + 'px');
    root.style.setProperty('--vy', yy + 'px');
    root.style.setProperty('--vr', rad + 'px');
    document.startViewTransition(apply);
  });

  /* ---- copy email ---- */
  var copyBtn = document.getElementById('copy');
  var copied = document.getElementById('copied');
  if (copyBtn) copyBtn.addEventListener('click', function () {
    var addr = 'bahniman30@gmail.com';
    var done = function () {
      copied.textContent = 'Copied';
      clearTimeout(copyBtn._t);
      copyBtn._t = setTimeout(function () { copied.textContent = ''; }, 2200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(addr).then(done, function () { copied.textContent = 'Select and copy the address'; });
    } else { copied.textContent = 'Select and copy the address'; }
  });
})();
