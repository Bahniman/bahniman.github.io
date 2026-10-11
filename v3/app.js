/* Capsule edition: a gashapon machine that dispenses the portfolio one capsule at a time. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'bahniman-capsules-v3';

  const CAT_LABEL = {
    intro: 'Read me first', path: 'The path', work: 'Darwinbox work', case: 'Case study',
    lab: 'Startup Lab', record: 'Record', ask: 'Ask me', contact: 'Rare capsule'
  };

  // Every capsule comes from the catalogue markup, so content lives in one place.
  const items = [...document.querySelectorAll('#catGrid .item')].filter(a => a.dataset.cat !== 'intro');
  const byId = Object.fromEntries(items.map(a => [a.id, a]));
  const serial = Object.fromEntries(items.map((a, i) => [a.id, i + 1]));
  const TOTAL = items.length;

  // Resolve each ink from CSS so the canvas and the stylesheet never drift.
  const probe = document.createElement('i');
  document.body.append(probe);
  const ink = {};
  for (const cat of Object.keys(CAT_LABEL)) {
    probe.dataset.cat = cat;
    probe.style.color = 'var(--c)';
    ink[cat] = getComputedStyle(probe).color;
  }
  probe.style.color = 'var(--ink)';
  const INK = getComputedStyle(probe).color;
  probe.remove();

  let collected = [];
  try { collected = (JSON.parse(localStorage.getItem(KEY)) || []).filter(id => byId[id]); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(collected)); } catch (e) {} };

  const el = {
    machine: $('#machine'), canvas: $('#globe'), crank: $('#crank'), chute: $('#chute'),
    slot: $('#cardSlot'), tray: $('#tray'), count: $('#count'), left: $('#left'),
    empty: $('#emptyNote'), refill: $('#refill'), catalogue: $('#catalogue'), announce: $('#announce'),
    sticker: $('.sticker')
  };
  const say = msg => { el.announce.textContent = ''; setTimeout(() => { el.announce.textContent = msg; }, 30); };

  /* ---------------- globe physics ---------------- */
  const ctx = el.canvas.getContext('2d');
  let S = 0, R = 0, r = 0, balls = [];

  function size() {
    const old = S;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    S = el.canvas.clientWidth;
    el.canvas.width = S * dpr; el.canvas.height = S * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = S / 2 - 2; r = S * 0.072;
    if (old) for (const b of balls) { b.x *= S / old; b.y *= S / old; }
  }

  function fill(ids) {
    balls = ids.map(id => ({
      id, cat: byId[id].dataset.cat,
      x: S / 2 + (Math.random() - .5) * S * .5, y: S * (.15 + Math.random() * .3),
      vx: (Math.random() - .5) * 4, vy: 0, a: Math.random() * Math.PI * 2, spin: Math.random() > .5 ? 1 : -1
    }));
    if (reduced) for (let i = 0; i < 400; i++) step();
  }

  function stir(power = 1) {
    for (const b of balls) {
      b.vx += (Math.random() - .5) * 7 * power;
      b.vy -= (2 + Math.random() * 6) * power;
    }
  }

  function step() {
    const g = S * 0.0011, cx = S / 2, cy = S / 2;
    for (const b of balls) {
      b.vy += g; b.vx *= .996; b.vy *= .996;
      b.x += b.vx; b.y += b.vy;
      b.a += b.vx / r * .6;
    }
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < balls.length; i++) {
        const p = balls[i];
        for (let j = i + 1; j < balls.length; j++) {
          const q = balls[j];
          const dx = q.x - p.x, dy = q.y - p.y, d2 = dx * dx + dy * dy, min = r * 2;
          if (d2 < min * min && d2 > 0) {
            const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, push = (min - d) / 2;
            p.x -= nx * push; p.y -= ny * push; q.x += nx * push; q.y += ny * push;
            const rel = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
            if (rel < 0) {
              const imp = -rel * .6;
              p.vx -= nx * imp; p.vy -= ny * imp; q.vx += nx * imp; q.vy += ny * imp;
            }
          }
        }
        const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy), lim = R - r;
        if (d > lim) {
          const nx = dx / d, ny = dy / d;
          p.x = cx + nx * lim; p.y = cy + ny * lim;
          const vn = p.vx * nx + p.vy * ny;
          if (vn > 0) { p.vx -= 1.4 * vn * nx; p.vy -= 1.4 * vn * ny; p.vx *= .9; }
        }
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, S, S);
    for (const b of balls) {
      ctx.save();
      ctx.translate(b.x, b.y); ctx.rotate(b.a);
      // misregistered colour pass, then the key-line pass, like a two-drum riso print
      ctx.fillStyle = ink[b.cat];
      ctx.beginPath(); ctx.arc(1.6, 1.2, r - 1, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,250,240,.9)';
      ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, Math.PI); ctx.closePath(); ctx.fill();
      ctx.lineWidth = Math.max(2, r * .11); ctx.strokeStyle = INK;
      ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r + 1, 0); ctx.lineTo(r - 1, 0); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath(); ctx.ellipse(-r * .38, -r * .5, r * .2, r * .11, -.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  let last = 0, acc = 0;
  function loop(t) {
    if (!document.hidden) {
      acc += Math.min(t - last, 50); last = t;
      while (acc >= 16) { step(); acc -= 16; }
      draw();
    } else last = t;
    requestAnimationFrame(loop);
  }

  /* ---------------- crank ---------------- */
  let turn = 0, busy = false, pending = null, viaKeys = false;
  const setTurn = deg => { turn = deg; el.crank.style.setProperty('--turn', deg + 'deg'); };

  function autoTurn() {
    if (!ready()) return;
    busy = true;
    const from = turn, to = turn + 360, t0 = performance.now(), dur = reduced ? 1 : 950;
    const tickle = t => {
      const k = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3);
      setTurn(from + (to - from) * e);
      if (k < 1 && Math.random() < .25) stir(.5);
      if (k < 1) requestAnimationFrame(tickle); else dispense();
    };
    stir(1); requestAnimationFrame(tickle);
  }

  function ready() {
    if (busy) return false;
    if (pending) { pending.focus(); el.chute.animate?.([{ transform: 'rotate(-4deg)' }, { transform: 'rotate(4deg)' }, { transform: 'none' }], 300); say('Open the capsule in the tray first.'); return false; }
    if (!balls.length) { say('The machine is empty. Refill it to keep going.'); return false; }
    return true;
  }

  // Drag the crank round by hand; a short tap does a full automatic turn.
  let drag = null;
  const angleAt = e => {
    const b = el.crank.getBoundingClientRect();
    return Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) * 180 / Math.PI;
  };
  el.crank.addEventListener('pointerdown', e => {
    if (busy || pending) return;
    drag = { last: angleAt(e), done: 0, moved: 0 };
    el.crank.setPointerCapture(e.pointerId);
  });
  el.crank.addEventListener('pointermove', e => {
    if (!drag) return;
    const a = angleAt(e);
    let d = a - drag.last; if (d > 180) d -= 360; if (d < -180) d += 360;
    drag.last = a; drag.moved += Math.abs(d);
    if (d > 0) drag.done += d;
    setTurn(turn + d);
    if (Math.abs(d) > 4) stir(Math.min(Math.abs(d) / 40, .6));
    if (drag.done >= 330 && balls.length) { drag = null; busy = true; dispense(); }
  });
  const endDrag = () => {
    if (!drag) return;
    const tap = drag.moved < 18; drag = null;
    if (tap) { viaKeys = false; autoTurn(); }
  };
  el.crank.addEventListener('pointerup', endDrag);
  el.crank.addEventListener('pointercancel', () => { drag = null; });
  el.crank.addEventListener('click', e => { if (e.detail === 0) { viaKeys = true; autoTurn(); } });
  document.addEventListener('keydown', e => {
    if (e.key === ' ' && (e.target === document.body || e.target === document.documentElement)) {
      e.preventDefault(); viaKeys = true; autoTurn();
    }
  });

  /* ---------------- dispensing ---------------- */
  function dispense() {
    if (!balls.length) { busy = false; return; }
    el.sticker?.classList.add('gone');
    let low = 0;
    balls.forEach((b, i) => { if (b.y > balls[low].y) low = i; });
    const [b] = balls.splice(low, 1);
    stir(.4);
    el.left.textContent = balls.length;
    el.machine.classList.remove('shake'); void el.machine.offsetWidth; el.machine.classList.add('shake');
    el.chute.classList.add('open');

    const drop = document.createElement('button');
    drop.type = 'button'; drop.className = 'drop'; drop.dataset.cat = b.cat;
    drop.setAttribute('aria-label', `Open the ${CAT_LABEL[b.cat]} capsule`);
    drop.innerHTML = '<span class="half top"></span><span class="half bot"></span><span class="drop-tag">tap to open</span>';
    drop.addEventListener('click', () => openDrop(drop, b.id), { once: true });
    el.chute.append(drop);
    pending = drop; busy = false;
    say(`A ${CAT_LABEL[b.cat]} capsule dropped into the tray. Open it.`);
    if (viaKeys) drop.focus({ preventScroll: true });
    if (!balls.length) setTimeout(() => { el.empty.hidden = false; }, 600);
  }

  function openDrop(drop, id) {
    drop.classList.add('open');
    setTimeout(() => {
      drop.remove(); pending = null;
      el.chute.classList.remove('open');
      if (!collected.includes(id)) collected.push(id);
      save(); renderTray(id); showCard(id, true);
    }, reduced ? 0 : 380);
  }

  /* ---------------- the ticket ---------------- */
  function showCard(id, fresh) {
    const src = id === 'intro' ? $('#intro') : byId[id];
    const cat = src.dataset.cat;
    const t = document.createElement('article');
    t.className = 'ticket item' + (reduced ? '' : ' printing');
    t.dataset.cat = cat;
    t.style.setProperty('--tilt', ((Math.random() - .5) * 2.4).toFixed(2) + 'deg');
    const no = id === 'intro' ? '00' : String(serial[id]).padStart(2, '0');
    t.innerHTML = `<header class="ticket-band"><span>${CAT_LABEL[cat]}</span><span>No. ${no} / ${TOTAL}</span></header><div class="ticket-body"></div>`;
    t.querySelector('.ticket-body').append(...[...src.children].map(n => n.cloneNode(true)));
    const foot = document.createElement('footer');
    foot.className = 'ticket-foot';
    const done = collected.length;
    foot.innerHTML = `<span class="serial">${id === 'intro' ? 'Free sample · no capsule needed' : `Collected ${done} of ${TOTAL}`}</span>`;
    const again = document.createElement('button');
    again.type = 'button'; again.className = 'again';
    again.textContent = balls.length ? 'Turn the crank again ↻' : 'Refill the machine ↻';
    again.addEventListener('click', e => {
      if (!balls.length) return refill();
      viaKeys = e.detail === 0;
      if (innerWidth <= 860) el.machine.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      autoTurn();
    });
    foot.append(again);
    t.append(foot);
    el.slot.replaceChildren(t);
    if (fresh && id !== 'intro') {
      say(`${CAT_LABEL[cat]}: ${src.querySelector('h3').textContent}`);
      if (innerWidth <= 860) t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    }
  }

  /* ---------------- collection tray ---------------- */
  function renderTray(newId, current = newId) {
    el.tray.replaceChildren(...collected.map(id => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.cat = byId[id].dataset.cat;
      b.title = byId[id].querySelector('h3').textContent;
      b.setAttribute('aria-label', `Reopen: ${b.title}`);
      if (id === newId) b.classList.add('new');
      if (id === current) b.classList.add('current');
      b.addEventListener('click', () => {
        el.tray.querySelectorAll('.current').forEach(x => x.classList.remove('current'));
        b.classList.add('current'); showCard(id, true);
        el.slot.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      });
      li.append(b); return li;
    }), ...Array.from({ length: TOTAL - collected.length }, () => {
      const li = document.createElement('li');
      li.innerHTML = '<span aria-hidden="true"></span>';
      return li;
    }));
    el.count.textContent = `${collected.length} / ${TOTAL}`;
  }

  /* ---------------- refill + tip out ---------------- */
  function refill() {
    el.empty.hidden = true;
    fill(items.map(a => a.id).sort(() => Math.random() - .5));
    el.left.textContent = balls.length;
    say('Machine refilled. Your collection is kept.');
    showCard(collected.at(-1) || 'intro', false);
  }
  el.refill.addEventListener('click', refill);

  document.querySelectorAll('[data-tip]').forEach(btn => btn.addEventListener('click', e => {
    e.preventDefault();
    for (const a of items) if (!collected.includes(a.id)) collected.push(a.id);
    save(); renderTray();
    el.catalogue.classList.add('shown');
    stir(2.5);
    say(`All ${TOTAL} capsules tipped out below.`);
    el.catalogue.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    $('#catTitle').setAttribute('tabindex', '-1'); $('#catTitle').focus({ preventScroll: true });
  }));

  /* ---------------- boot ---------------- */
  size();
  fill(items.map(a => a.id).filter(id => !collected.includes(id)).sort(() => Math.random() - .5));
  el.left.textContent = balls.length;
  if (!balls.length) el.empty.hidden = false;
  renderTray();
  showCard('intro', false);
  addEventListener('resize', size);
  requestAnimationFrame(t => { last = t; loop(t); });
})();
