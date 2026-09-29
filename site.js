/* Bahniman Talukdar · portfolio behaviour
   Lenis smooth wheel scroll, reveal-on-scroll, active nav, progress line,
   floating back-to-top pill, theme switch, copy email. */
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

  /* ---- load-in ---- */
  function start() {
    document.body.classList.add('loaded');
  }

  /* ---- smooth wheel scrolling (Lenis) ---- */
  /* Sleep at rest, but exclude idle time from the animation clock on resume. */
  var lenis = null, loopOn = false, idle = 0, lastFrame = 0, scrollTime = 0;
  function loop(t) {
    if (!lenis) { loopOn = false; return; }
    if (lastFrame) scrollTime += Math.min(64, Math.max(0, t - lastFrame));
    lastFrame = t;
    lenis.raf(scrollTime);
    if (lenis.isScrolling) idle = 0; else idle++;
    if (idle < 3) requestAnimationFrame(loop); else { loopOn = false; lastFrame = 0; }
  }
  function wake() { if (!loopOn && lenis) { loopOn = true; idle = 0; requestAnimationFrame(loop); } }
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.07, smoothWheel: true, syncTouch: false, autoRaf: false, anchors: false });
    lenis.on('virtual-scroll', wake);
  }
  /* land each section's heading about 40px under the top bar, skipping its top padding */
  function goTo(target, immediate) {
    var y = 0;
    if (target !== 0) {
      var pad = parseFloat(getComputedStyle(target).paddingTop) || 0;
      var bar = topBar ? topBar.offsetHeight : 64;
      y = target.getBoundingClientRect().top + window.scrollY + pad - bar - 40;
    }
    if (lenis) {
      lenis.resize();
      lenis.scrollTo(Math.max(0, y), { duration: 1.1, lerp: 0, easing: function (t) { return 1 - Math.pow(1 - t, 3); }, immediate: !!immediate });
      wake();
    } else window.scrollTo({ top: Math.max(0, y), behavior: reduce || immediate ? 'auto' : 'smooth' });
  }
  function visit(id, push) {
    var el = id && id !== '#hero' ? document.getElementById(id.slice(1)) : null;
    if (id && id !== '#hero' && !el) return;
    if (push) {
      var url = location.pathname + location.search + (el ? id : '');
      if (location.pathname + location.search + location.hash !== url) history.pushState(null, '', url);
    }
    var focus = el || document.querySelector('.logo');
    if (focus) { if (el) el.setAttribute('tabindex', '-1'); focus.focus({ preventScroll: true }); }
    goTo(el || 0);
  }
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  document.querySelectorAll('a[data-go]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      visit(id, true);
    });
  });
  if (floatBtn) floatBtn.addEventListener('click', function () { visit('#hero', true); });
  window.addEventListener('popstate', function () { visit(location.hash, false); });

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
  var labels = { hero: 'Top', path: 'Path', play: 'Play', work: 'Work', studies: 'Cases', lab: 'Lab', record: 'Record', ask: 'Ask', contact: 'Contact' };
  var allSecs = ['hero', 'play', 'path', 'work', 'studies', 'lab', 'record', 'ask', 'contact'].map(function (id) { return document.getElementById(id); });

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

  /* ---- theme: apply immediately so all controls stay interactive ---- */
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
    if (root.getAttribute('data-theme')) metas.forEach(function (m) { m.setAttribute('content', d ? '#191613' : '#f3ecdf'); });
  }
  syncMeta();
  themeBtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    var apply = function () {
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      syncMeta();
    };
    apply();
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
  var counters = document.querySelectorAll('.glance [data-count]');
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
      if (focus) tabs[i].focus({ preventScroll: true });
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

  /* ---- play: two games on one stage ---- */
  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var k = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[k]; a[k] = t; } return a; }
  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {}
    return null;
  }
  function bestScore(key, max) {
    var raw = store(key);
    if (raw === null || !/^(0|[1-9]\d*)$/.test(raw)) return null;
    var score = Number(raw);
    return Number.isInteger(score) && score <= max ? score : null;
  }
  function copyText(txt, note) {
    var done = function () { note.textContent = 'Copied'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { note.textContent = txt; });
    else note.textContent = txt;
  }

  /* Game 1 data: y = this change breaks it, n = not affected */
  var EDGE = [
    { req: 'Let employees change their display name.', items: [
      ['y', 'Notification emails', 'Templates insert the employee\'s name. Each one needs a decision: display name or legal name.'],
      ['y', 'Payslips and letters', 'Legal documents must keep the legal name, so they have to read a different field.'],
      ['y', 'People search and org chart', 'Colleagues search by the name they know. Search has to match both names.'],
      ['y', 'Audit log', 'HR will ask who changed a name and when. Log the old value, the new value and who made the change.'],
      ['y', 'Bulk imports', 'An HR upload must not wipe a name the employee set. The import template needs a rule for this column.'],
      ['y', 'Connected systems', 'Payroll, single sign-on and other tools may read the name over the API. They need to know which name they get.'],
      ['n', 'Leave balances', 'Leave is tied to the employee ID, not the name. Nothing changes.'],
      ['n', 'Salary calculation', 'Pay is worked out from the employee ID and pay structure. The name plays no part.'],
      ['n', 'Shift rosters', 'Rosters also use the employee ID. The new name simply shows up.'],
      ['q', 'Mobile app', 'Only if the app stores names for offline use. Worth a quick check with the mobile team before promising a date.']
    ] },
    { req: 'Add a probation end date field to the employee profile.', items: [
      ['y', 'Existing employees', 'Thousands of current records have no value. Leave it blank, calculate it from the joining date, or ask HR to upload it?'],
      ['y', 'Bulk import template', 'HR will want to fill it in bulk, so the template needs the column and a date-format check.'],
      ['y', 'Who can see it', 'Probation status is sensitive. Decide which roles can view it and which can edit it.'],
      ['y', 'Reminder emails', 'Managers need a reminder before the date. That means a scheduled job and a new notification.'],
      ['y', 'Reports and filters', 'HR will ask for everyone whose probation ends this month. The field has to be available in reports.'],
      ['y', 'Confirmation approval', 'The date should start the confirmation approval, or HR keeps tracking it in a spreadsheet.'],
      ['n', 'Login page', 'Nothing about signing in changes.'],
      ['n', 'Holiday calendar', 'Holidays are set by location, not by a date on the profile.'],
      ['n', 'Profile photo rules', 'A date field has no effect on photos.'],
      ['q', 'Leave eligibility', 'Some clients restrict leave during probation. Check whether any leave policy will start reading this date.']
    ] },
    { req: 'Let HR backdate a department transfer by two months.', items: [
      ['y', 'Cost centre in payroll', 'Salary already booked to the old department for those months may need to move.'],
      ['y', 'Pending approvals', 'Leave and expense requests from that window went to the old manager. Do they move?'],
      ['y', 'Headcount reports', 'Last month\'s headcount changes after the fact. Finance needs to know which version is final.'],
      ['y', 'Audit log', 'Record both the date the change was entered and the date it takes effect.'],
      ['y', 'Data access', 'The new manager may now see records from before they managed this person. Is that allowed?'],
      ['n', 'Password policy', 'Unrelated to departments.'],
      ['n', 'Language settings', 'Language belongs to the user, not the department.'],
      ['n', 'Profile photo', 'Unaffected.'],
      ['q', 'Leave policy', 'Only matters if leave rules differ by department. Check how this client has set up its policies.']
    ] },
    { req: 'Make the mobile number mandatory on every employee profile.', items: [
      ['y', 'Existing employees', 'Profiles without a number can no longer be saved. The next edit to any of them fails until someone fills it in.'],
      ['y', 'Bulk imports', 'Upload rows without a number are now rejected. HR needs to know before their next file fails.'],
      ['y', 'Connected systems', 'A recruiting tool that creates employees over the API will start failing if it does not send a number.'],
      ['y', 'New joiner forms', 'The pre-joining form must ask for it, or new hires get stuck on day one.'],
      ['y', 'Who can see it', 'A mandatory personal number is now on every profile. Check which roles can view it.'],
      ['n', 'Salary calculation', 'Pay does not use the phone number.'],
      ['n', 'Holiday calendar', 'Unrelated.'],
      ['n', 'Leave balances', 'Unrelated.']
    ] },
    { req: 'Let managers approve leave straight from the email, without logging in.', items: [
      ['y', 'Link security', 'The approve link is now a key. It must work once, expire, and only for that manager.'],
      ['y', 'Audit log', 'Record who approved, when, and that it came from email.'],
      ['y', 'Already-handled requests', 'An old email clicked after someone else approved or the employee cancelled must not change anything.'],
      ['y', 'Delegated approvers', 'If the manager has handed approvals to someone while away, whose email carries the button?'],
      ['y', 'Email templates', 'The notification needs approve and reject buttons, in every language the client uses.'],
      ['n', 'Org chart', 'Unaffected.'],
      ['n', 'Profile photo', 'Unaffected.'],
      ['n', 'Expense currency', 'Leave approval has nothing to do with expenses.'],
      ['q', 'Payroll cut-off', 'An approval that lands after payroll locks may move unpaid leave into next month. Check the cut-off rules.']
    ] },
    { req: 'Rename the "Grade" field to "Level" for one client.', items: [
      ['y', 'Other clients', 'The rename must be scoped to this client, or every customer sees "Level" tomorrow.'],
      ['y', 'Translations', 'Every language this client uses needs the new word, or French users still see the old one.'],
      ['y', 'Notification text', 'Emails that print the label, like "your grade has been updated", need the new word.'],
      ['y', 'Report headers', 'Saved reports and exports show column names. They should match what the client now calls it.'],
      ['y', 'Import template', 'Templates HR teams saved still say "Grade". Decide whether both headers are accepted.'],
      ['y', 'Help articles', 'Guides that say "grade" confuse people once the screen says "level".'],
      ['n', 'Expense limits', 'The trap. Limits read the field, not the word on screen, so nothing underneath changes.'],
      ['n', 'Salary structures', 'Same reason: the logic reads the field, not its label.'],
      ['n', 'Attendance rules', 'Attendance does not use the grade label at all.']
    ] }
  ];

  /* Game 2 data: b = index of the clearest label */
  var LABELS = [
    { task: 'You want employees to see who their manager reports to.', now: 'Enable ESS visibility for RM hierarchy',
      opts: ['Show reporting chain', 'Show employees their reporting chain on their profile', 'Show employees their manager'], b: 1,
      rule: 'Say who sees what, and where.', why: '"Show employees their manager" sounds right but promises less than the setting does. "Show reporting chain" is short, but leaves out who sees it and where.',
      help: 'Employees see who they report to, and who that person reports to, on their profile.' },
    { task: 'You want HR to record a change that took effect last month.', now: 'Allow retro effective-dating of transactions',
      opts: ['Let HR edit past records', 'Allow backdated changes', 'Let HR backdate changes, with pay recalculated from that date'], b: 2,
      rule: 'Name the consequence.', why: 'In this setting, backdating also recalculates pay. An admin needs to know that before switching it on. "Edit past records" is wrong: nothing is overwritten, a change simply starts from an earlier date.',
      help: 'HR can set a change to apply from an earlier date. Payroll and reports update from that date.' },
    { task: 'You want onboarding tasks to start on a new joiner\'s first day.', now: 'Auto-trigger ONB workflow on DOJ',
      opts: ['Start onboarding tasks on the joining date', 'Automate onboarding', 'Send onboarding emails on the joining date'], b: 0,
      rule: 'Say what happens and when.', why: '"Automate onboarding" is short and says nothing about when. "Send onboarding emails" sounds precise but describes the wrong thing: tasks start, not just emails.',
      help: 'On the joining date, the new joiner and their manager get their onboarding tasks.' },
    { task: 'You want phone numbers and home addresses hidden when HR downloads employee data.', now: 'Mask PII in exports',
      opts: ['Hide personal data in downloads', 'Hide phone numbers and addresses in downloaded files', 'Hide phone numbers and addresses'], b: 1,
      rule: 'Name exactly what is affected, and where.', why: '"Personal data" makes the admin guess which fields. "Hide phone numbers and addresses" reads as if they vanish from the screen too, which would alarm HR.',
      help: 'Downloaded files show phone numbers and addresses as hidden. The data on screen is unchanged.' },
    { task: 'You want employees to update their own bank details, but only after HR approves.', now: 'ESS edit: bank (maker-checker)',
      opts: ['Let employees edit bank details', 'Bank detail changes need HR approval', 'Let employees update bank details, with HR approval'], b: 2,
      rule: 'Say who does what.', why: 'The first option drops the approval, which is the part finance cares about. The second reads like a restriction and hides that employees can now edit at all.',
      help: 'Changes wait for HR approval before payroll uses the new account.' },
    { task: 'You want employees to see their payslip only after payroll is locked for the month.', now: 'Payslip publish post-lock',
      opts: ['Delay payslips until payroll is locked', 'Show payslips to employees after payroll is locked', 'Payslip release after lock'], b: 1,
      rule: 'Pick the verb that matches what happens.', why: '"Delay" suggests something is late or broken. Nothing is: employees see the payslip once it is final. "Payslip release after lock" is a pile of nouns.',
      help: 'Employees see this month\'s payslip once HR locks payroll. Until then they see last month\'s.' }
  ];

  var arcPick = document.getElementById('arcPick');
  var stage = document.getElementById('stage');
  if (arcPick && stage) {
    var stageBody = document.getElementById('stageBody');
    var stageTitle = document.getElementById('stageTitle');
    var dotsEl = document.getElementById('dots');
    var gTimer = document.getElementById('gTimer');
    var SITE = 'https://bahniman.github.io/#play';

    var showBest = function () {
      var e = bestScore('bt-best-edge-v2', 100), l = bestScore('bt-best-label', LABELS.length);
      document.getElementById('bestEdge').textContent = e !== null ? 'Your best: ' + e + '%' : '';
      document.getElementById('bestLabel').textContent = l !== null ? 'Your best: ' + l + ' of ' + LABELS.length : '';
    };
    var setDots = function (n, cur) {
      var out = '';
      for (var i = 0; i < n; i++) out += '<li class="' + (i < cur ? 'done' : i === cur ? 'on' : '') + '"></li>';
      dotsEl.innerHTML = out;
    };
    var lastGame = 'edge';
    var focusRound = function () {
      var hd = stageBody.querySelector('.g-req, .g-big');
      if (hd) { hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); }
    };
    var openGame = function (name) {
      lastGame = name;
      arcPick.hidden = true;
      stage.hidden = false;
      if (name === 'edge') edgeStart(); else labelStart();
      goTo(stage);
      focusRound();
    };
    var closeGame = function () {
      stopEdgeTimer();
      stage.hidden = true;
      arcPick.hidden = false;
      showBest();
      var back = arcPick.querySelector('.btn[data-play="' + lastGame + '"]');
      if (back) back.focus({ preventScroll: true });
      goTo(back ? back.closest('.cab') : document.getElementById('play'));
    };
    document.querySelectorAll('[data-play]').forEach(function (b) {
      b.addEventListener('click', function () { openGame(b.getAttribute('data-play')); });
    });
    document.getElementById('stageBack').addEventListener('click', closeGame);
    showBest();

    /* ---------- game 1: spot the edge cases ---------- */
    var eRound = 0, eTot, eTimer = null, eDeadline = 0, eLeft = 60, eDone = false, eItems = [];
    function stopEdgeTimer() { clearInterval(eTimer); eTimer = null; eDeadline = 0; }
    function edgeTick() {
      if (!eDeadline || eDone) return;
      eLeft = Math.max(0, Math.ceil((eDeadline - Date.now()) / 1000));
      timerShow();
      if (eLeft === 0) edgeCheck();
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) edgeTick(); });
    var edgeStart = function () {
      eRound = 0; eTot = { caught: 0, total: 0, falses: 0 };
      stageTitle.textContent = 'Spot the edge cases';
      edgeRender();
    };
    var wrapLabel = function (t) {
      var w = t.split(' '), lines = [''];
      w.forEach(function (word) {
        var cur = lines[lines.length - 1];
        if (cur && (cur + ' ' + word).length > 15) lines.push(word);
        else lines[lines.length - 1] = cur ? cur + ' ' + word : word;
      });
      return lines;
    };
    var edgeMap = function (items) {
      var cx = 360, cy = 250, rx = 212, ry = 180, n = items.length, lines = '', nodes = '';
      items.forEach(function (it, i) {
        var a = -Math.PI / 2 + i * 2 * Math.PI / n, c = Math.cos(a), sn = Math.sin(a);
        var x = cx + rx * c, y = cy + ry * sn;
        var side = Math.abs(c) < 0.3;
        var anchor = side ? 'middle' : c > 0 ? 'start' : 'end';
        var tx = x + (anchor === 'start' ? 18 : anchor === 'end' ? -18 : 0);
        var L = wrapLabel(it[1]);
        var ty = side ? (sn < 0 ? y - 22 - (L.length - 1) * 17 : y + 32) : y + 5 - (L.length - 1) * 8.5;
        lines += '<line class="ln" data-i="' + i + '" x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '" pathLength="1"/>';
        nodes += '<g class="nd" data-i="' + i + '"><circle class="hit" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="30"/>' +
          '<circle class="dot" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="10"/>' +
          '<text class="nl" text-anchor="' + anchor + '" y="' + ty.toFixed(1) + '">' +
          L.map(function (t, k) { return '<tspan x="' + tx.toFixed(1) + '" dy="' + (k ? 17 : 0) + '">' + esc(t) + '</tspan>'; }).join('') + '</text></g>';
      });
      return '<svg class="map" viewBox="0 0 720 500" aria-hidden="true">' +
        '<g class="rip"><circle cx="' + cx + '" cy="' + cy + '" r="40"/><circle cx="' + cx + '" cy="' + cy + '" r="40"/></g>' + lines +
        '<circle class="core" cx="' + cx + '" cy="' + cy + '" r="40"/><text class="core-t" x="' + cx + '" y="' + (cy - 2) + '">THE</text><text class="core-t" x="' + cx + '" y="' + (cy + 11) + '">CHANGE</text>' +
        nodes + '</svg>';
    };
    var timerShow = function () {
      gTimer.querySelector('span').textContent = eLeft + 's';
      gTimer.style.setProperty('--left', Math.max(0, eLeft / 60));
      gTimer.classList.toggle('low', eLeft <= 10);
    };
    var edgeRender = function () {
      var sc = EDGE[eRound];
      stopEdgeTimer();
      eItems = shuffle(sc.items); eDone = false; eLeft = 60;
      setDots(EDGE.length, eRound);
      gTimer.hidden = false; timerShow();
      stageBody.innerHTML = '<div class="edge">' +
        '<div class="edge-map">' + edgeMap(eItems) + '</div>' +
        '<div class="edge-side">' +
          '<p class="kick sm">Round ' + (eRound + 1) + ' of ' + EDGE.length + ' · the request</p>' +
          '<h3 class="g-req">"' + esc(sc.req) + '"</h3>' +
          '<p class="g-hint">Tick what this change will break, on the map or in the list. Every false alarm costs a point, and some items only need a check, so ticking everything will not work. Your 60 seconds start on the first tick and keep running if you leave this tab.</p>' +
          '<div class="tiles">' + eItems.map(function (it, i) {
            return '<button type="button" class="tile" aria-pressed="false" data-i="' + i + '"><b>' + esc(it[1]) + '</b></button>';
          }).join('') + '</div>' +
          '<div class="g-actions"><button type="button" class="btn pri" id="eCheck">Check my answer</button><p class="g-score" id="eScore" aria-live="polite"></p></div>' +
        '</div></div>';
      stageBody.querySelectorAll('.tile').forEach(function (b) {
        b.addEventListener('click', function () { edgeToggle(+b.getAttribute('data-i')); });
      });
      stageBody.querySelectorAll('.nd').forEach(function (g) {
        g.addEventListener('click', function () { edgeToggle(+g.getAttribute('data-i')); });
      });
      document.getElementById('eCheck').addEventListener('click', edgeCheck);
    };
    var edgeToggle = function (i) {
      edgeTick();
      if (eDone) return;
      var tile = stageBody.querySelector('.tile[data-i="' + i + '"]');
      var on = tile.getAttribute('aria-pressed') !== 'true';
      tile.setAttribute('aria-pressed', on ? 'true' : 'false');
      stageBody.querySelector('.nd[data-i="' + i + '"]').classList.toggle('on', on);
      stageBody.querySelector('.ln[data-i="' + i + '"]').classList.toggle('on', on);
      if (!eTimer) {
        eDeadline = Date.now() + 60000;
        eTimer = setInterval(edgeTick, 250);
      }
    };
    var edgeCheck = function (event) {
      if (eDone) return;
      eDone = true; stopEdgeTimer();
      var caught = 0, total = 0, falses = 0;
      stageBody.querySelector('.edge').classList.add('checked');
      eItems.forEach(function (it, i) {
        var tile = stageBody.querySelector('.tile[data-i="' + i + '"]');
        var real = it[0] === 'y', on = tile.getAttribute('aria-pressed') === 'true', cls, tag;
        if (real) total++;
        if (it[0] === 'q') { cls = 'check'; tag = on ? 'Worth checking: no points either way' : 'Worth checking'; }
        else if (real && on) { caught++; cls = 'caught'; tag = 'Caught'; }
        else if (real) { cls = 'missed'; tag = 'Missed'; }
        else if (on) { falses++; cls = 'false'; tag = 'False alarm: not affected'; }
        else { cls = 'clear'; tag = 'Not affected'; }
        tile.classList.add(cls);
        tile.setAttribute('aria-disabled', 'true');
        tile.insertAdjacentHTML('beforeend', '<small>' + esc(it[2]) + '</small><span class="tag">' + tag + '</span>');
        var nd = stageBody.querySelector('.nd[data-i="' + i + '"]'), ln = stageBody.querySelector('.ln[data-i="' + i + '"]');
        nd.classList.remove('on'); ln.classList.remove('on');
        nd.classList.add(cls); ln.classList.add(cls);
      });
      eTot.caught += caught; eTot.total += total; eTot.falses += falses;
      var last = eRound === EDGE.length - 1;
      document.getElementById('eScore').innerHTML = 'You caught <b>' + caught + ' of ' + total + '</b>' +
        (falses ? ', with ' + falses + ' false alarm' + (falses > 1 ? 's' : '') : '') + '.' +
        '<span class="net">Round score ' + Math.max(0, caught - falses) + ' / ' + total + '</span>';
      var old = document.getElementById('eCheck'), btn = old.cloneNode(false);
      var hadFocus = document.activeElement === old;
      btn.textContent = last ? 'See your result' : 'Next round';
      old.parentNode.replaceChild(btn, old);
      if (hadFocus) btn.focus({ preventScroll: true });
      if (event && event.type === 'click') goTo(btn);
      btn.addEventListener('click', function () {
        if (last) edgeEnd(); else { eRound++; edgeRender(); }
        focusRound();
        goTo(stage);
      });
    };
    var edgeEnd = function () {
      var net = Math.max(0, eTot.caught - eTot.falses);
      var pct = Math.round(net / eTot.total * 100);
      var prev = bestScore('bt-best-edge-v2', 100);
      if (prev === null || pct > prev) store('bt-best-edge-v2', String(pct));
      setDots(EDGE.length, EDGE.length);
      gTimer.hidden = true;
      var verdict = eTot.falses > eTot.caught / 2 ? 'Ticking everything is not a spec. Each false alarm is engineering time spent in the wrong place.'
        : pct >= 85 ? 'Strong impact review. You caught most of the risks with few false alarms.'
        : pct >= 60 ? 'Solid. A careful reviewer would catch the rest.'
        : 'This is why every PRD needs a module-impact section.';
      stageBody.innerHTML = '<div class="g-endscreen">' +
        '<div><p class="kick sm">Your score: breakages caught minus false alarms</p><p class="g-big">' + net + '<small>/ ' + eTot.total + '</small></p>' +
          '<p class="g-verdict">' + verdict + '</p>' +
          '<p class="g-score" style="margin-top:10px">Caught ' + eTot.caught + ' of ' + eTot.total + ' breakages, ' + eTot.falses + ' false alarm' + (eTot.falses === 1 ? '' : 's') + '. Net ' + pct + '%.' + (prev && pct <= prev ? ' Your best is ' + prev + '%.' : '') + '</p></div>' +
        '<div><p class="kick sm">The habit behind it</p><p class="g-rule">Before writing a line of a spec, list every place the data is read, written, shown or sent: screens, emails, documents, imports, reports, other systems and the audit log. That list is what the module-impact section of every PRD I wrote was for.</p>' +
          '<div class="g-actions"><button type="button" class="btn pri" id="eAgain">Play again</button><button type="button" class="btn" id="eOther">Try Name the setting</button>' +
          '<button type="button" class="btn" id="eShare">Copy my score</button><span class="copied-note" id="eNote" aria-live="polite"></span></div></div>' +
        '</div>';
      document.getElementById('eAgain').addEventListener('click', function () { edgeStart(); focusRound(); goTo(stage); });
      document.getElementById('eOther').addEventListener('click', function () { lastGame = 'label'; labelStart(); goTo(stage); focusRound(); });
      document.getElementById('eShare').addEventListener('click', function () {
        copyText('I scored ' + net + ' of ' + eTot.total + ' (breakages caught minus false alarms) in the edge-case game on Bahniman Talukdar\'s portfolio. Try it: ' + SITE, document.getElementById('eNote'));
      });
    };

    /* ---------- game 2: name the setting ---------- */
    var lRound = 0, lScore = 0;
    var FACE = '<svg class="face" viewBox="0 0 52 52" aria-hidden="true"><circle class="hd" cx="26" cy="20" r="11"/><path d="M8 50c2-10 9-15 18-15s16 5 18 15"/></svg>';
    var labelStart = function () {
      stopEdgeTimer();
      lRound = 0; lScore = 0;
      stageTitle.textContent = 'Name the setting';
      gTimer.hidden = true;
      labelRender();
    };
    var labelRender = function () {
      var r = LABELS[lRound];
      setDots(LABELS.length, lRound);
      stageBody.innerHTML = '<div class="lab">' +
        '<div class="admin" aria-hidden="true">' +
          '<div class="admin-bar"><i></i><i></i><i></i><span>Settings · Employees</span></div>' +
          '<div class="admin-main"><div class="admin-side"><b>Settings</b><span>Company</span><span class="on">Employees</span><span>Payroll</span><span>Leave</span><span>Notifications</span></div>' +
          '<div class="admin-rows"><div class="arow dim"><span>Employee ID format</span><em>EMP-0000</em></div>' +
          '<div class="arow cur" id="aRow"><div><span id="aLabel">' + esc(r.now) + '</span><small id="aHelp"></small></div><i class="sw"></i></div>' +
          '<div class="arow dim"><span>Probation period (days)</span><em>90</em></div></div></div>' +
          '<div class="persona" id="aPersona">' + FACE + '<div class="bubble-wrap"><p class="bubble" id="aBubble">Which of these do I switch on?</p><small>New HR admin, week one</small></div></div>' +
        '</div>' +
        '<div class="lab-side">' +
          '<p class="kick sm">Round ' + (lRound + 1) + ' of ' + LABELS.length + ' · the task</p>' +
          '<h3 class="g-req">' + esc(r.task) + '</h3>' +
          '<p class="g-hint">The setting on screen does this today. All three new labels are plain English; pick the one that is accurate as well as clear.</p>' +
          '<div class="opts">' + r.opts.map(function (o, i) {
            return '<button type="button" class="opt" data-i="' + i + '"><em>' + 'ABC'.charAt(i) + '</em>' + esc(o) + '</button>';
          }).join('') + '</div><div id="lWhy" aria-live="polite" aria-atomic="true"></div><div class="g-actions" id="lActions"></div>' +
        '</div></div>';
      stageBody.querySelectorAll('.opt').forEach(function (b) {
        b.addEventListener('click', function () { labelPick(+b.getAttribute('data-i')); });
      });
    };
    var setRow = function (text, help, cls, bubble, mood) {
      var row = document.getElementById('aRow'), lab = document.getElementById('aLabel');
      if (!row) return;
      row.classList.add('swap');
      setTimeout(function () {
        if (!row.isConnected) return;
        lab.textContent = text;
        document.getElementById('aHelp').textContent = help;
        row.classList.remove('swap', 'good', 'bad');
        row.classList.add(cls);
        var p = document.getElementById('aPersona'), bb = document.getElementById('aBubble');
        p.classList.remove('happy', 'lost'); p.classList.add(mood);
        bb.textContent = bubble;
        bb.classList.remove('pop'); void bb.offsetWidth; bb.classList.add('pop');
      }, 180);
    };
    var labelPick = function (i) {
      var side = stageBody.querySelector('.lab-side');
      if (side.classList.contains('answered')) return;
      side.classList.add('answered');
      var r = LABELS[lRound], right = i === r.b;
      if (right) lScore++;
      stageBody.querySelectorAll('.opt').forEach(function (b, k) {
        b.setAttribute('aria-disabled', 'true');
        if (k === r.b) b.classList.add('best');
        if (k === i) b.classList.add(right ? 'picked' : 'wrong');
      });
      if (right) setRow(r.opts[i], r.help, 'good', 'Got it. That is the one I need.', 'happy');
      else {
        setRow(r.opts[i], '', 'bad', 'I still do not know what this does.', 'lost');
        var rowNow = document.getElementById('aRow');
        setTimeout(function () {
          if (document.getElementById('aRow') === rowNow) setRow(r.opts[r.b], r.help, 'good', 'Oh. That one makes sense.', 'happy');
        }, 1500);
      }
      var last = lRound === LABELS.length - 1;
      document.getElementById('lWhy').innerHTML =
        '<div class="g-why"><p class="kick sm">' + (right ? 'Right' : 'Not quite') + ' · Rule ' + (lRound + 1) + '</p>' +
        '<p><b>' + esc(r.rule) + '</b> ' + esc(r.why) + '</p><p>Help text under it: ' + esc(r.help) + '</p></div>';
      document.getElementById('lActions').innerHTML = '<button type="button" class="btn pri" id="lNext">' + (last ? 'See your result' : 'Next round') + '</button>';
      document.getElementById('lNext').addEventListener('click', function () {
        if (last) labelEnd(); else { lRound++; labelRender(); }
        focusRound();
        goTo(stage);
      });
    };
    var labelEnd = function () {
      var prev = bestScore('bt-best-label', LABELS.length);
      if (prev === null || lScore > prev) store('bt-best-label', String(lScore));
      setDots(LABELS.length, LABELS.length);
      var verdict = lScore >= 5 ? 'Clear, accurate labels. You made these settings easier to understand.' : lScore >= 3 ? 'Good instincts. The rules below close the gap.' : 'This is why settings get renamed.';
      stageBody.innerHTML = '<div class="g-endscreen">' +
        '<div><p class="kick sm">Your result</p><p class="g-big">' + lScore + '<small>/ ' + LABELS.length + '</small></p><p class="g-verdict">' + verdict + '</p></div>' +
        '<div><p class="kick sm">Six rules to keep</p><ol class="g-rules">' +
          LABELS.map(function (r) { return '<li>' + esc(r.rule) + '</li>'; }).join('') + '</ol>' +
          '<p class="g-rule">A setting should explain itself without relying on release notes. When I renamed settings like these and added help text, usage of them went up.</p>' +
          '<div class="g-actions"><button type="button" class="btn pri" id="lAgain">Play again</button><button type="button" class="btn" id="lOther">Try Spot the edge cases</button>' +
          '<button type="button" class="btn" id="lShare">Copy my score</button><span class="copied-note" id="lNote" aria-live="polite"></span></div></div>' +
        '</div>';
      document.getElementById('lAgain').addEventListener('click', function () { labelStart(); focusRound(); goTo(stage); });
      document.getElementById('lOther').addEventListener('click', function () { lastGame = 'edge'; edgeStart(); goTo(stage); focusRound(); });
      document.getElementById('lShare').addEventListener('click', function () {
        copyText('I picked the clearest label ' + lScore + ' of ' + LABELS.length + ' times in the settings game on Bahniman Talukdar\'s portfolio. Try it: ' + SITE, document.getElementById('lNote'));
      });
    };
  }

  /* ---- ask cards: swap the pill text ---- */
  document.querySelectorAll('details.ask').forEach(function (d) {
    var rv = d.querySelector('.rv');
    d.addEventListener('toggle', function () { d.querySelector('summary').setAttribute('aria-label', (d.open ? 'Hide answer: ' : 'Show answer: ') + d.querySelector('summary b').textContent); });
  });

  /* ---- phone section menu ---- */
  var menuBtn = document.getElementById('menuBtn'), mnav = document.getElementById('mnav');
  if (menuBtn && mnav) {
    var compactNav = window.matchMedia('(max-width: 1080px)');
    var setMenu = function (open) {
      mnav.hidden = !open;
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.setAttribute('aria-label', open ? 'Close section menu' : 'Open section menu');
    };
    menuBtn.addEventListener('click', function (e) { e.stopPropagation(); setMenu(mnav.hidden); });
    mnav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('click', function (e) { if (!mnav.hidden && !mnav.contains(e.target)) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !mnav.hidden) { setMenu(false); menuBtn.focus(); } });
    compactNav.addEventListener('change', function () {
      if (!compactNav.matches) {
        var active = document.activeElement;
        var href = mnav.contains(active) ? active.getAttribute('href') : null;
        setMenu(false);
        if (href) document.querySelector('.nav a[href="' + href + '"]').focus({ preventScroll: true });
        else if (active === menuBtn) document.querySelector('.logo').focus({ preventScroll: true });
      }
    });
  }

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
  /* Only conceal content once the enhancement and its observers are ready. */
  root.classList.add('js');
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 900); })]).then(start);
  } else { start(); }
})();
