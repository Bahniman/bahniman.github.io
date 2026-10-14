/* Bahniman Talukdar, v4: living scene engine + small UI.
   One fixed WebGL canvas paints the active scene (tea, river, rootbridge) with
   foliage sway, mist, water ripple and a time-of-day grade that follows scroll.
   A 2D canvas on top carries falling leaves (tea) and fireflies (rootbridge).
   Without WebGL, CSS background layers crossfade instead. */
(function () {
  'use strict';

  var root = document.documentElement;
  var mqReduce = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var reduce = mqReduce.matches;
  var touch = window.matchMedia ? matchMedia('(pointer: coarse)').matches : false;
  var SCENES = ['tea', 'river', 'rootbridge'];

  /* ------------------------------------------------------------------
     Per-image config. All coordinates are fractions of the image
     (x right, y down).
     focal: point kept in view when cover-fit crops (portrait phones)
     sway:  foliage displacement strength (CSS px at full gust-free wind)
     fg:    rect [x0,y0,x1,y1] treated as foreground foliage (sways more)
     fgY:   below this y everything counts as foreground
     mist:  {x:[x0,x1], y:[y0,y1], amt}
     water: {quad:[tl,tr,br,bl], rip (px), excl rect kept still}
     leaves:{x:[a,b], y:[a,b]} screen-fraction spawn box, tea scenes only
  ------------------------------------------------------------------ */
  var CONFIG = {
    photo: {
      tea: {
        src: 'assets/photo-tea.webp', w: 2400, h: 1340,
        focal: [0.6, 0.58], sway: 2.0, fg: [0, 0, 0, 0], fgY: 0.6,
        mist: { x: [0.0, 1.0], y: [0.34, 0.52], amt: 0.34 },
        water: null,
        leaves: { x: [0.7, 1.05], y: [-0.08, 0.3] }
      },
      river: {
        src: 'assets/photo-river.webp', w: 2048, h: 1143,
        focal: [0.56, 0.62], sway: 2.2, fg: [0.7, 0.05, 1.0, 1.0], fgY: 0.86,
        mist: { x: [0.0, 0.72], y: [0.4, 0.52], amt: 0.28 },
        water: { quad: [[0.0, 0.465], [0.665, 0.465], [0.71, 0.86], [0.0, 0.95]], rip: 2.2, excl: [0.425, 0.69, 0.7, 0.815] }
      },
      rootbridge: {
        src: 'assets/photo-rootbridge.webp', w: 2048, h: 1152,
        focal: [0.5, 0.52], sway: 1.8, fg: [0, 0, 0, 0], fgY: 0.55,
        mist: { x: [0.36, 0.7], y: [0.04, 0.36], amt: 0.3 },
        water: { quad: [[0.39, 0.69], [0.61, 0.69], [0.95, 1.0], [0.2, 1.0]], rip: 1.2, excl: [0, 0, 0, 0] }
      }
    },
    painted: {
      tea: {
        src: 'assets/painted-tea.webp', w: 2048, h: 1143,
        focal: [0.52, 0.56], sway: 2.4, fg: [0.58, 0.0, 1.0, 0.5], fgY: 0.7,
        mist: { x: [0.3, 1.0], y: [0.34, 0.56], amt: 0.32 },
        water: null,
        leaves: { x: [0.62, 0.98], y: [0.0, 0.3] }
      },
      river: {
        src: 'assets/painted-river.webp', w: 2048, h: 1143,
        focal: [0.34, 0.62], sway: 2.2, fg: [0.62, 0.1, 1.0, 1.0], fgY: 0.88,
        mist: { x: [0.0, 0.66], y: [0.52, 0.63], amt: 0.3 },
        water: { quad: [[0.0, 0.575], [0.6, 0.575], [0.74, 1.0], [0.0, 1.0]], rip: 2.0, excl: [0.17, 0.685, 0.38, 0.79] }
      },
      rootbridge: {
        src: 'assets/painted-rootbridge.webp', w: 2048, h: 1143,
        focal: [0.52, 0.55], sway: 1.8, fg: [0, 0, 0, 0], fgY: 0.6,
        mist: { x: [0.34, 0.7], y: [0.0, 0.46], amt: 0.28 },
        water: { quad: [[0.43, 0.69], [0.6, 0.69], [0.86, 1.0], [0.37, 1.0]], rip: 1.4, excl: [0, 0, 0, 0] }
      }
    }
  };

  /* ---------------- scene style (photo / painted) ---------------- */
  var params = null;
  try { params = new URLSearchParams(location.search); } catch (e) {}
  var set = root.getAttribute('data-set') === 'painted' ? 'painted' : 'photo';
  var setBtns = document.querySelectorAll('[data-set-btn]');
  function markSet(name, busy) {
    setBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-set-btn') === name ? 'true' : 'false');
    });
    document.querySelectorAll('.set-switch').forEach(function (g) {
      if (busy) g.setAttribute('aria-busy', 'true'); else g.removeAttribute('aria-busy');
    });
  }
  markSet(set);

  /* ---------------- layout model ---------------- */
  var stills = {};
  document.querySelectorAll('.still').forEach(function (el) { stills[el.getAttribute('data-still')] = el; });
  var sceneBox = document.querySelector('.scene');
  var marks = [];        // every [data-scene] block, in page order
  var bounds = [];       // scene changes
  var ranges = {};       // first/last y of each scene
  var vw = innerWidth, vh = innerHeight;

  function measure() {
    vw = innerWidth; vh = innerHeight;
    marks = [];
    document.querySelectorAll('[data-scene]').forEach(function (el) {
      var r = el.getBoundingClientRect();
      marks.push({ el: el, top: r.top + scrollY, h: Math.max(1, r.height), scene: el.getAttribute('data-scene'), tod: parseFloat(el.getAttribute('data-tod')) || 0 });
    });
    bounds = []; ranges = {};
    marks.forEach(function (m, i) {
      if (!ranges[m.scene]) ranges[m.scene] = { a: m.top, b: m.top + m.h };
      ranges[m.scene].b = m.top + m.h;
      if (i && marks[i - 1].scene !== m.scene) bounds.push({ y: m.top, from: marks[i - 1].scene, to: m.scene });
    });
  }

  function smooth(x) { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); }

  /* what the scroll position asks for: scene pair, mix and time of day */
  function readScroll() {
    var y = scrollY + vh * 0.5;
    var st = { a: marks.length ? marks[0].scene : 'tea', b: null, mix: 0, tod: 0, el: null };
    var idx = 0;
    for (var i = 0; i < marks.length; i++) { if (marks[i].top <= y) idx = i; }
    var m = marks[idx];
    if (m) {
      st.el = m.el;
      st.a = m.scene;
      var nx = marks[idx + 1];
      var f = Math.min(1, Math.max(0, (y - m.top) / m.h));
      st.tod = reduce ? m.tod : (nx ? m.tod + (nx.tod - m.tod) * f : m.tod);
      if (y < m.top) st.tod = m.tod;
    }
    var W = vh * 0.4;
    for (var j = 0; j < bounds.length; j++) {
      var b = bounds[j];
      if (Math.abs(y - b.y) < W / 2) {
        st.a = b.from; st.b = b.to;
        st.mix = reduce ? (y >= b.y ? 1 : 0) : smooth((y - b.y) / W + 0.5);
        break;
      }
    }
    if (st.b && st.mix >= 0.999) { st.a = st.b; st.b = null; st.mix = 0; }
    if (st.b && st.mix <= 0.001) { st.b = null; st.mix = 0; }
    return st;
  }
  function progress(scene) {
    var r = ranges[scene]; if (!r) return 0;
    return Math.min(1, Math.max(0, (scrollY + vh * 0.5 - r.a) / Math.max(1, r.b - r.a)));
  }
  function weights(st) {
    var w = { tea: 0, river: 0, rootbridge: 0 };
    w[st.a] += 1 - st.mix;
    if (st.b) w[st.b] += st.mix;
    return w;
  }

  /* ---------------- pointer and gust ---------------- */
  var mouse = { x: 0.5, y: 0.5, sx: 0.5, sy: 0.5 }, gust = 0, lastP = null, lastScroll = scrollY;
  addEventListener('pointermove', function (e) {
    var x = e.clientX / vw, y = e.clientY / vh;
    if (lastP && e.pointerType === 'mouse') gust = Math.min(1.5, gust + Math.hypot(x - lastP.x, y - lastP.y) * 5);
    lastP = { x: x, y: y };
    if (e.pointerType === 'mouse') { mouse.x = x; mouse.y = y; }
  }, { passive: true });

  /* ---------------- shaders ---------------- */
  var VS = 'attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; v.y = 1. - v.y; gl_Position = vec4(p, 0., 1.); }';
  var FS = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'varying vec2 v;',
    'uniform sampler2D uT0, uT1;',
    'uniform vec2 uRes, uMouse;',
    'uniform float uDpr, uTime, uGust, uMix, uTod;',
    'uniform vec2 uView0, uCen0, uView1, uCen1;',
    'uniform float uSway0, uFgY0, uMistA0, uRip0, uSway1, uFgY1, uMistA1, uRip1;',
    'uniform vec4 uFg0, uMistR0, uWa0, uWb0, uEx0, uFg1, uMistR1, uWa1, uWb1, uEx1;',
    'float hash(vec2 p){ p = fract(p * vec2(.1031, .1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }',
    'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }',
    'float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++){ s += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return s; }',
    'float rectM(vec2 p, vec4 r, float f){ return smoothstep(r.x - f, r.x + f, p.x) * smoothstep(r.z + f, r.z - f, p.x) * smoothstep(r.y - f, r.y + f, p.y) * smoothstep(r.w + f, r.w - f, p.y); }',
    'float edgeD(vec2 p, vec2 a, vec2 b){ vec2 e = b - a; return (e.x * (p.y - a.y) - e.y * (p.x - a.x)) / max(length(e), 1e-4); }',
    'float quadM(vec2 p, vec4 a, vec4 b){ float d = min(min(edgeD(p, a.xy, a.zw), edgeD(p, a.zw, b.xy)), min(edgeD(p, b.xy, b.zw), edgeD(p, b.zw, a.xy))); return smoothstep(0., .02, d); }',
    'vec3 scene(sampler2D tex, vec2 view, vec2 cen, float sway, vec4 fg, float fgY, vec4 mr, float ma, vec4 wa, vec4 wb, float rip, vec4 ex){',
    '  vec2 uv = cen + (v - .5) * view;',
    '  vec2 px = view / uRes * uDpr;',
    '  float t = uTime;',
    '  vec3 b = (texture2D(tex, uv + px * vec2(6., 0.)).rgb + texture2D(tex, uv - px * vec2(6., 0.)).rgb + texture2D(tex, uv + px * vec2(0., 6.)).rgb + texture2D(tex, uv - px * vec2(0., 6.)).rgb) * .25;',
    '  float green = smoothstep(.01, .08, b.g - max(b.r, b.b) * .9) * smoothstep(.04, .2, b.g);',
    '  float wind = .55 * sin(t * .55) + .3 * sin(t * 1.3 + 1.7) + .15 * sin(t * 2.9 + .4);',
    '  float fgw = max(rectM(uv, fg, .06), smoothstep(fgY, fgY + .25, uv.y));',
    '  vec2 asp = vec2(uRes.x / uRes.y, 1.);',
    '  float near = smoothstep(.3, 0., distance(v * asp, uMouse * asp));',
    '  float amp = green * sway * (.35 + .65 * fgw) * (1. + .8 * uGust + 1.4 * near * uGust);',
    '  float sw = (noise(uv * vec2(3., 4.) + vec2(t * .22, t * .05)) - .5) * 2. * (.75 + .45 * wind);',
    '  vec2 sp = uv / px;',
    '  float fl = (noise(sp * .085 + vec2(t * 2.1, -t * 1.3)) - .5) * 2.;',
    '  vec2 d = vec2(sw * 1.4 + fl * .55, sw * .3 + fl * .4) * amp;',
    '  float wm = 0.;',
    '  if (rip > 0.) {',
    '    wm = quadM(uv, wa, wb) * (1. - green) * (1. - rectM(uv, ex, .008));',
    '    float top = min(wa.y, wa.w), bot = max(wb.y, wb.w);',
    '    float depth = clamp((uv.y - top) / max(bot - top, .01), 0., 1.);',
    '    float ph = sp.y * mix(.6, .24, depth) - t * 1.4 + noise(uv * vec2(7., 46.) + vec2(t * .1, 0.)) * 5.;',
    '    float r1 = sin(ph), r2 = sin(ph * 1.63 + sp.x * .021 + t * .8);',
    '    d += vec2(r1 * .85 + r2 * .4, r1 * .22) * wm * rip * (.3 + .7 * depth);',
    '  }',
    '  float L = length(d); d *= min(1., 3.5 / max(L, 1e-4));',
    '  vec3 c = texture2D(tex, uv + d * px).rgb;',
    '  float lum = dot(c, vec3(.3, .59, .11));',
    '  float gl = smoothstep(.9, 1., noise(vec2(sp.x * .07, sp.y * .4) + vec2(t * .45, -t * .15))) * smoothstep(.5, .85, noise(uv * vec2(5., 18.) + vec2(t * .04, 0.)));',
    '  c += gl * wm * smoothstep(.3, .75, lum) * .12 * min(rip, 1.5);',
    '  if (ma > 0.) {',
    '    float band = smoothstep(mr.x - .1, mr.x + .12, uv.x) * smoothstep(mr.y + .1, mr.y - .12, uv.x) * smoothstep(mr.z - .05, mr.z + .06, uv.y) * smoothstep(mr.w + .05, mr.w - .06, uv.y);',
    '    vec2 mp = uv * vec2(2.4, 8.) + vec2(t * .022, 0.);',
    '    float m = fbm(mp + vec2(noise(mp * .5 + vec2(t * .016, 0.)) * 1.6, 0.));',
    '    c = mix(c, vec3(.95, .95, .96), smoothstep(.42, .84, m) * band * ma);',
    '  }',
    '  return c;',
    '}',
    'vec3 sat(vec3 c, float s){ float l = dot(c, vec3(.2126, .7152, .0722)); return mix(vec3(l), c, s); }',
    'vec3 grade(vec3 c, float k){',
    '  float l = dot(c, vec3(.2126, .7152, .0722));',
    '  vec3 dawn = c * vec3(1.03, 1., .97) + vec3(.018, .01, 0.);',
    '  vec3 morn = sat(c, 1.06) * vec3(1.01, 1.02, 1.02) * 1.03;',
    '  vec3 noon = sat(c, 1.1) * vec3(1.07, 1.02, .9);',
    '  vec3 dusk = sat(c, 1.08) * vec3(1.14, .93, .74) * .94 + vec3(.03, .005, .02) * (1. - l);',
    '  vec3 nb = sat(c, .55) * vec3(.82, .92, 1.08);',
    '  nb = nb * nb * 1.1 + nb * .42 + vec3(.01, .016, .032);',
    '  float warm = smoothstep(.35, .7, l) * smoothstep(.06, .22, c.r - c.b);',
    '  vec3 nt = mix(nb, c * 1.12, warm);',
    '  vec3 g = mix(dawn, morn, clamp(k, 0., 1.));',
    '  g = mix(g, noon, clamp(k - 1., 0., 1.));',
    '  g = mix(g, dusk, clamp(k - 2., 0., 1.));',
    '  g = mix(g, nt, clamp(k - 3., 0., 1.));',
    '  float vig = smoothstep(1.05, .3, length((v - .5) * vec2(1., 1.25)));',
    '  g *= mix(1., mix(.8, 1., vig), clamp(k - 2., 0., 1.) * .8 + .2);',
    '  return clamp(g, 0., 1.);',
    '}',
    'void main(){',
    '  vec3 c = scene(uT0, uView0, uCen0, uSway0, uFg0, uFgY0, uMistR0, uMistA0, uWa0, uWb0, uRip0, uEx0);',
    '  if (uMix > .001) {',
    '    vec3 c1 = scene(uT1, uView1, uCen1, uSway1, uFg1, uFgY1, uMistR1, uMistA1, uWa1, uWb1, uRip1, uEx1);',
    '    c = mix(c, c1, uMix);',
    '  }',
    '  gl_FragColor = vec4(grade(c, uTod), 1.);',
    '}'
  ].join('\n');

  /* ---------------- WebGL setup ---------------- */
  var cv = document.getElementById('sceneGl');
  var fx = document.getElementById('sceneFx');
  var ctx = fx && fx.getContext ? fx.getContext('2d') : null;
  var gl = null, isGL2 = false, prog = null, U = {};
  function initGL() {
    if (!cv || !cv.getContext) return false;
    var opts = { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power' };
    try { gl = cv.getContext('webgl2', opts); isGL2 = !!gl; if (!gl) gl = cv.getContext('webgl', opts) || cv.getContext('experimental-webgl', opts); } catch (e) { gl = null; }
    if (!gl) return false;
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
      return s;
    }
    var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) { gl = null; return false; }
    prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl = null; return false; }
    gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uT0', 'uT1', 'uRes', 'uMouse', 'uDpr', 'uTime', 'uGust', 'uMix', 'uTod'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    ['uView', 'uCen', 'uSway', 'uFgY', 'uMistA', 'uRip', 'uFg', 'uMistR', 'uWa', 'uWb', 'uEx'].forEach(function (n) {
      U[n + '0'] = gl.getUniformLocation(prog, n + '0'); U[n + '1'] = gl.getUniformLocation(prog, n + '1');
    });
    gl.uniform1i(U.uT0, 0); gl.uniform1i(U.uT1, 1);
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); toFallback(); }, false);
    return true;
  }

  /* ---------------- textures, lazy per style set ---------------- */
  var store = { photo: {}, painted: {} };   // store[set][scene] = { tex, img, ready }
  var shown = set;                           // set whose textures are on screen
  function loadImage(src) {
    return new Promise(function (res, rej) {
      var im = new Image(); im.decoding = 'async';
      im.onload = function () { res(im); }; im.onerror = rej; im.src = src;
    });
  }
  function upload(im) {
    var tx = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (isGL2) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
    else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    return tx;
  }
  function loadSet(name, first) {
    var order = SCENES.slice();
    if (first) order.sort(function (a, b) { return (a === first ? -1 : 0) - (b === first ? -1 : 0); });
    var jobs = order.map(function (sc) {
      var slot = store[name][sc];
      if (slot && slot.promise) return slot.promise;
      slot = store[name][sc] = { ready: false };
      slot.promise = loadImage(CONFIG[name][sc].src).then(function (im) {
        slot.img = im;
        if (gl) slot.tex = upload(im);
        slot.ready = true;
        if (mode === 'css') paintStills();
        kick();
        return slot;
      });
      return slot.promise;
    });
    return Promise.all(jobs);
  }
  function texFor(sc) {
    var s = store[shown][sc];
    if (s && s.ready) return { tex: s.tex, cfg: CONFIG[shown][sc] };
    for (var i = 0; i < SCENES.length; i++) {
      var o = store[shown][SCENES[i]];
      if (o && o.ready) return { tex: o.tex, cfg: CONFIG[shown][SCENES[i]] };
    }
    return null;
  }

  /* ---------------- sizing ---------------- */
  var dpr = 1;
  function resize() {
    var cap = touch ? 1.5 : 2;
    dpr = Math.min(window.devicePixelRatio || 1, cap);
    vw = innerWidth; vh = innerHeight;
    if (gl) {
      cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
      gl.viewport(0, 0, cv.width, cv.height);
    }
    if (ctx) { fx.width = Math.round(vw * dpr); fx.height = Math.round(vh * dpr); }
    measure();
    kick();
  }

  /* cover-fit window into the image, focal-aware, with push-in and drift */
  function fit(cfg, p) {
    var zoom = 1.06 + 0.06 * p;
    var ai = cfg.w / cfg.h, as = vw / vh, view;
    if (as > ai) view = [1 / zoom, (ai / as) / zoom];
    else view = [(as / ai) / zoom, 1 / zoom];
    var cx = cfg.focal[0], cy = cfg.focal[1] - 0.02 + 0.05 * p;
    if (!reduce) { cx += (mouse.sx - 0.5) * -0.012; cy += (mouse.sy - 0.5) * -0.008; }
    cx = Math.min(1 - view[0] / 2, Math.max(view[0] / 2, cx));
    cy = Math.min(1 - view[1] / 2, Math.max(view[1] / 2, cy));
    return { view: view, cen: [cx, cy] };
  }
  function setSlot(i, cfg, p) {
    var f = fit(cfg, p), s = String(i);
    gl.uniform2f(U['uView' + s], f.view[0], f.view[1]);
    gl.uniform2f(U['uCen' + s], f.cen[0], f.cen[1]);
    gl.uniform1f(U['uSway' + s], reduce ? 0 : cfg.sway);
    gl.uniform4f(U['uFg' + s], cfg.fg[0], cfg.fg[1], cfg.fg[2], cfg.fg[3]);
    gl.uniform1f(U['uFgY' + s], cfg.fgY);
    gl.uniform4f(U['uMistR' + s], cfg.mist.x[0], cfg.mist.x[1], cfg.mist.y[0], cfg.mist.y[1]);
    gl.uniform1f(U['uMistA' + s], cfg.mist.amt);
    var w = cfg.water;
    if (w) {
      gl.uniform4f(U['uWa' + s], w.quad[0][0], w.quad[0][1], w.quad[1][0], w.quad[1][1]);
      gl.uniform4f(U['uWb' + s], w.quad[2][0], w.quad[2][1], w.quad[3][0], w.quad[3][1]);
      gl.uniform4f(U['uEx' + s], w.excl[0], w.excl[1], w.excl[2], w.excl[3]);
      gl.uniform1f(U['uRip' + s], reduce ? 0 : w.rip);
    } else gl.uniform1f(U['uRip' + s], 0);
  }

  /* ---------------- particles ---------------- */
  var leaves = [], flies = [], nextLeaf = 0, glow = null;
  function makeGlow() {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,246,196,1)'); r.addColorStop(0.18, 'rgba(255,214,110,.9)');
    r.addColorStop(0.45, 'rgba(240,180,60,.25)'); r.addColorStop(1, 'rgba(240,180,60,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64); return c;
  }
  function spawnLeaf(cfg) {
    var box = (cfg && cfg.leaves) || { x: [0.6, 1], y: [-0.05, 0.2] };
    leaves.push({
      x: box.x[0] + Math.random() * (box.x[1] - box.x[0]),
      y: box.y[0] + Math.random() * (box.y[1] - box.y[0]),
      vx: -0.015 - Math.random() * 0.02, vy: 0.028 + Math.random() * 0.022,
      r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 2.2,
      s: 6 + Math.random() * 6, hue: Math.random(), ph: Math.random() * 6.28
    });
  }
  function spawnFly() {
    return { x: Math.random(), y: 0.25 + Math.random() * 0.75, vx: (Math.random() - 0.5) * 0.01, vy: (Math.random() - 0.5) * 0.008,
      ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 1.4, s: 0.6 + Math.random() * 0.8 };
  }
  function drawParticles(t, dt, w, st, wind) {
    if (!ctx) return;
    var W = fx.width, H = fx.height;
    ctx.clearRect(0, 0, W, H);
    if (reduce) return;
    /* leaves in tea scenes */
    var cfg = CONFIG[shown].tea;
    if (w.tea > 0.2 && leaves.length < 7 && t > nextLeaf) { spawnLeaf(cfg); nextLeaf = t + 1.4 + Math.random() * 2.6; }
    var unit = Math.max(0.75, Math.min(1.2, vw / 1440)) * dpr;
    for (var i = leaves.length - 1; i >= 0; i--) {
      var l = leaves[i];
      l.x += (l.vx - wind * 0.025 - gust * 0.03) * dt;
      l.y += (l.vy + Math.sin(t * 1.8 + l.ph) * 0.012) * dt;
      l.r += l.vr * dt;
      if (l.y > 1.08 || l.x < -0.08) { leaves.splice(i, 1); continue; }
      var a = Math.min(1, w.tea * 1.2);
      if (a < 0.02) continue;
      var s = l.s * unit;
      ctx.save();
      ctx.globalAlpha = a * 0.92;
      ctx.translate(l.x * W, l.y * H); ctx.rotate(l.r);
      ctx.scale(1, Math.cos(t * 2.2 + l.ph) * 0.45 + 0.6);
      ctx.fillStyle = 'hsl(' + (88 + l.hue * 26).toFixed(0) + ',' + (34 + l.hue * 18).toFixed(0) + '%,' + (26 + l.hue * 12).toFixed(0) + '%)';
      ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * 0.52, s, 0); ctx.quadraticCurveTo(0, s * 0.52, -s, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(220,235,180,.35)'; ctx.lineWidth = Math.max(0.6, s * 0.08);
      ctx.beginPath(); ctx.moveTo(-s * 0.9, 0); ctx.lineTo(s * 0.9, 0); ctx.stroke();
      ctx.restore();
    }
    /* fireflies near the root bridge */
    var maxF = vw < 720 ? 24 : 40;
    var want = Math.round(maxF * Math.min(1, w.rootbridge * 1.15));
    while (flies.length < want) flies.push(spawnFly());
    if (flies.length > want) flies.length = want;
    if (!flies.length) return;
    if (!glow) glow = makeGlow();
    var night = Math.min(1, Math.max(0.45, (st.tod - 2.4) / 1.4));
    ctx.globalCompositeOperation = 'lighter';
    for (var k = 0; k < flies.length; k++) {
      var f = flies[k];
      f.vx += (Math.random() - 0.5) * 0.02 * dt; f.vy += (Math.random() - 0.5) * 0.016 * dt;
      f.vx *= 0.99; f.vy *= 0.99;
      f.x += (f.vx - wind * 0.002) * dt; f.y += f.vy * dt;
      if (f.x < -0.05) f.x = 1.05; if (f.x > 1.05) f.x = -0.05;
      if (f.y < 0.15) f.vy += 0.004; if (f.y > 1.0) f.vy -= 0.004;
      var blink = Math.pow(0.5 + 0.5 * Math.sin(t * f.sp + f.ph), 3);
      var al = blink * w.rootbridge * night;
      if (al < 0.02) continue;
      var size = (10 + 14 * f.s) * dpr;
      ctx.globalAlpha = Math.min(1, al);
      ctx.drawImage(glow, f.x * W - size / 2, f.y * H - size / 2, size, size);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  /* ---------------- render loop ---------------- */
  var mode = 'none';   // 'gl' | 'css'
  var raf = 0, t0 = performance.now(), last = t0, dirty = true, firstFrame = false;
  function frame(now) {
    raf = 0;
    var dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    var t = reduce ? 14 : ((now - t0) / 1000 + 6) % 3600;
    var ds = Math.abs(scrollY - lastScroll); lastScroll = scrollY;
    if (!reduce) gust = Math.min(1.5, gust + Math.min(0.06, ds / Math.max(1, vh) * 0.6));
    gust *= Math.exp(-dt * 1.6);
    mouse.sx += (mouse.x - mouse.sx) * Math.min(1, dt * 2.5);
    mouse.sy += (mouse.y - mouse.sy) * Math.min(1, dt * 2.5);
    var st = readScroll();
    var w = weights(st);
    var wind = 0.55 * Math.sin(t * 0.55) + 0.3 * Math.sin(t * 1.3 + 1.7);

    if (mode === 'gl') {
      var A = texFor(st.a), B = st.b ? texFor(st.b) : null;
      if (A) {
        gl.uniform2f(U.uRes, cv.width, cv.height);
        gl.uniform1f(U.uDpr, dpr);
        gl.uniform1f(U.uTime, t);
        gl.uniform1f(U.uGust, reduce ? 0 : gust);
        gl.uniform2f(U.uMouse, mouse.sx, mouse.sy);
        gl.uniform1f(U.uTod, st.tod);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A.tex);
        setSlot(0, A.cfg, progress(st.a));
        if (B) {
          gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, B.tex);
          setSlot(1, B.cfg, progress(st.b));
          gl.uniform1f(U.uMix, st.mix);
        } else {
          gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, A.tex);
          gl.uniform1f(U.uMix, 0);
        }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (!firstFrame) { firstFrame = true; sceneBox.classList.add('gl-on'); }
      }
      drawParticles(t, dt, w, st, wind);
    } else if (mode === 'css') {
      cssFrame(st);
      drawParticles(t, dt, w, st, wind);
    }
    dirty = false;
    if (!reduce) schedule();
  }
  function schedule() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
  function kick() { dirty = true; schedule(); }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; }
    else { last = performance.now(); kick(); }
  });
  addEventListener('scroll', function () { if (reduce) kick(); }, { passive: true });
  var rzT = 0;
  addEventListener('resize', function () { clearTimeout(rzT); rzT = setTimeout(resize, 120); });
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function () { measure(); kick(); });
    ro.observe(document.querySelector('main'));
  }
  addEventListener('load', function () { measure(); kick(); });
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', function (e) { reduce = e.matches; leaves = []; flies = []; kick(); });

  /* ---------------- CSS fallback ---------------- */
  var lastCss = '';
  function paintStills() {
    SCENES.forEach(function (sc) {
      var s = store[shown][sc], el = stills[sc], cfg = CONFIG[shown][sc];
      if (!el) return;
      el.style.backgroundPosition = (cfg.focal[0] * 100).toFixed(1) + '% ' + (cfg.focal[1] * 100).toFixed(1) + '%';
      if (s && s.ready) { el.style.backgroundImage = 'url(' + cfg.src + ')'; el.classList.add('full'); }
    });
    lastCss = '';
  }
  function cssFrame(st) {
    var key = st.a + '|' + st.b + '|' + st.mix.toFixed(3) + '|' + st.tod.toFixed(2);
    if (key === lastCss) return;
    lastCss = key;
    SCENES.forEach(function (sc) {
      var el = stills[sc]; if (!el) return;
      var o = 0;
      if (sc === st.a) o = 1;
      if (sc === st.b) o = st.mix;
      el.style.opacity = o;
      el.style.zIndex = sc === st.b ? 2 : (sc === st.a ? 1 : 0);
    });
    var k = st.tod;
    var bright = k < 3 ? 1 : 1 - (k - 3) * 0.22, satur = k < 3 ? 1 + Math.min(k, 2) * 0.04 : 1.08 - (k - 3) * 0.3;
    var sep = k > 2 && k < 3.6 ? 0.18 * (1 - Math.abs(k - 2.9) / 0.7) : 0;
    sceneBox.style.filter = 'brightness(' + bright.toFixed(3) + ') saturate(' + satur.toFixed(3) + ') sepia(' + Math.max(0, sep).toFixed(3) + ')';
  }
  function toFallback() {
    mode = 'css';
    gl = null;
    sceneBox.classList.remove('gl-on');
    sceneBox.classList.add('no-gl');
    if (cv) cv.style.display = 'none';
    paintStills();
    kick();
  }

  /* ---------------- switching style sets ---------------- */
  function applySet(name, save) {
    if (name !== 'photo' && name !== 'painted') return;
    set = name;
    root.setAttribute('data-set', name);
    if (save) {
      try { localStorage.setItem('v4-scene-set', name); } catch (e) {}
      try {
        if (params && params.has('set')) {
          params.set('set', name);
          history.replaceState(null, '', location.pathname + '?' + params.toString() + location.hash);
        }
      } catch (e) {}
    }
    markSet(name, true);
    var st = readScroll();
    loadSet(name, st.a).then(function () {
      if (set !== name) return;
      shown = name;
      leaves = [];
      markSet(name, false);
      if (mode === 'css') paintStills();
      kick();
    }).catch(function () { markSet(shown, false); });
  }
  setBtns.forEach(function (b) {
    b.addEventListener('click', function () { applySet(b.getAttribute('data-set-btn'), true); });
  });

  /* ---------------- start ---------------- */
  measure();
  if (initGL()) mode = 'gl'; else { mode = 'css'; sceneBox.classList.add('no-gl'); if (cv) cv.style.display = 'none'; }
  resize();
  if (mode === 'css') paintStills();
  var startScene = readScroll().a;
  loadSet(set, startScene).then(function () { markSet(set, false); }).catch(function () {});
  kick();

})();
