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
  /* The loop runs only while a glide is in progress and sleeps after three still frames,
     so reading costs nothing. The leftover sub-pixel fraction of each glide goes on <main>
     as a GPU transform, because browsers round page scroll to whole pixels. */
  var lenis = null, loopOn = false, idle = 0;
  var main = document.getElementById('main');
  function loop(t) {
    if (!lenis) { loopOn = false; return; }
    lenis.raf(t);
    if (lenis.isScrolling) idle = 0; else idle++;
    if (idle < 3) requestAnimationFrame(loop); else loopOn = false;
  }
  function wake() { if (!loopOn && lenis) { loopOn = true; idle = 0; requestAnimationFrame(loop); } }
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.07, smoothWheel: true, syncTouch: false, autoRaf: false, anchors: false });
    lenis.on('virtual-scroll', wake);
    lenis.on('scroll', function () {
      var d = window.scrollY - lenis.animatedScroll;
      main.style.transform = Math.abs(d) > 0.004 ? 'translate3d(0,' + d.toFixed(3) + 'px,0)' : '';
    });
  }
  /* land each section's heading about 40px under the top bar, skipping its top padding */
  function goTo(target) {
    if (target === 0) {
      if (lenis) { wake(); lenis.scrollTo(0, { duration: 1.1 }); } else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      return;
    }
    var pad = parseFloat(getComputedStyle(target).paddingTop) || 0;
    var bar = topBar ? topBar.offsetHeight : 64;
    var y = target.getBoundingClientRect().top + window.scrollY + pad - bar - 40;
    if (lenis) { wake(); lenis.scrollTo(Math.max(0, y), { duration: 1.1 }); }
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
  var labels = { hero: 'Top', path: 'Path', work: 'Work', lab: 'Lab', record: 'Record', ask: 'Ask', contact: 'Contact' };
  var allSecs = ['hero', 'path', 'work', 'lab', 'record', 'ask', 'contact'].map(function (id) { return document.getElementById(id); });

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

  /* ---- figures count up once, when first seen ---- */
  function countUp(el) {
    var end = +el.getAttribute('data-count');
    if (reduce || !end) { el.textContent = end.toLocaleString('en-US'); return; }
    var t0 = null, dur = 1100;
    function step(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))).toLocaleString('en-US');
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll('.facts [data-count]');
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { countUp(en.target); cio.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---- case file: six results, one open at a time, advancing on its own until touched ---- */
  var cases = document.getElementById('cases');
  if (cases) {
    var items = Array.prototype.slice.call(cases.querySelectorAll('.item'));
    var nav = document.createElement('div');
    nav.className = 'case-nav';
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', 'Darwinbox results');
    var tabs = items.map(function (it, i) {
      var fig = it.querySelector('.fig');
      var b = document.createElement('button');
      b.type = 'button';
      b.id = 'case-t' + i;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', 'case-p' + i);
      b.innerHTML = '<b>' + fig.querySelector('b').textContent + '</b><small>' + fig.querySelector(':scope > span').textContent + '</small><i aria-hidden="true"></i>';
      it.id = 'case-p' + i;
      it.setAttribute('role', 'tabpanel');
      it.setAttribute('aria-labelledby', b.id);
      it.setAttribute('tabindex', '0');
      nav.appendChild(b);
      return b;
    });
    var foot = document.createElement('div');
    foot.className = 'case-foot';
    foot.innerHTML = '<span id="caseCount"></span><button type="button" id="caseNext">Next result &rarr;</button>';
    cases.insertBefore(nav, cases.firstChild);
    cases.appendChild(foot);
    cases.classList.add('cased');
    var cur = -1, auto = !reduce;
    var caseCount = document.getElementById('caseCount');
    function show(i, focus) {
      if (i === cur) return;
      cur = i;
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        t.classList.remove('run');
        items[k].hidden = !on;
        items[k].classList.toggle('show', on);
      });
      if (auto) { void tabs[i].offsetWidth; tabs[i].classList.add('run'); }
      caseCount.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
      var n = items[i].querySelector('[data-count]');
      if (n && !reduce) countUp(n);
      if (focus) tabs[i].focus();
    }
    function stopAuto() {
      if (!auto) return;
      auto = false;
      tabs.forEach(function (t) { t.classList.remove('run'); });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { stopAuto(); show(i); });
      t.addEventListener('animationend', function () { if (auto) show((i + 1) % items.length); });
    });
    nav.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (e.key === 'Home') { e.preventDefault(); stopAuto(); show(0, true); return; }
      if (e.key === 'End') { e.preventDefault(); stopAuto(); show(items.length - 1, true); return; }
      if (!d) return;
      e.preventDefault();
      stopAuto();
      show((cur + d + items.length) % items.length, true);
    });
    document.getElementById('caseNext').addEventListener('click', function () { stopAuto(); show((cur + 1) % items.length); });
    /* pause the timer while the case file is off screen or being read */
    cases.classList.add('cases-paused');
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        cases.classList.toggle('cases-paused', !en[0].isIntersecting);
      }, { threshold: 0.35 }).observe(cases);
    }
    cases.addEventListener('pointerenter', function () { cases.classList.add('hovering', 'cases-paused'); });
    cases.addEventListener('pointerleave', function () { cases.classList.remove('hovering', 'cases-paused'); });
    cases.addEventListener('focusin', stopAuto);
    show(0);
  }

  /* ---- spec checklist ---- */
  var specBtns = document.querySelectorAll('.spec-list button');
  var specBar = document.getElementById('specBar');
  var specStatus = document.getElementById('specStatus');
  function specUpdate() {
    var n = document.querySelectorAll('.spec-list button[aria-pressed="true"]').length, all = specBtns.length;
    specBar.style.transform = 'scaleX(' + (n / all) + ')';
    specStatus.textContent = n === all ? 'All eight answered · ready for engineering' : 'Tick each one off · ' + n + ' of ' + all;
    specStatus.classList.toggle('done', n === all);
  }
  specBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      specUpdate();
    });
  });

  /* ---- ask cards: swap the pill text ---- */
  document.querySelectorAll('details.ask').forEach(function (d) {
    var rv = d.querySelector('.rv');
    d.addEventListener('toggle', function () { rv.textContent = d.open ? 'Hide' : 'Reveal'; });
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
