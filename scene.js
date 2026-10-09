(function () {
  var stage = document.querySelector('.stage');
  var canvas = document.getElementById('scene');
  var sky = document.getElementById('sky');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var api = { target: 0 };
  window.KPN_SCENE = api;

  function fail() { document.documentElement.classList.add('no-gl'); }
  if (!window.THREE) return fail();
  var T = window.THREE, renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return fail(); }
  var mobile = Math.min(innerWidth, innerHeight) < 700;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 2 : 2));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  var scene = new T.Scene();
  scene.fog = new T.Fog(0x13263a, 55, 150);
  var camera = new T.PerspectiveCamera(32, 1, 0.5, 400);

  /* ---------- helpers ---------- */
  function C(h) { return new T.Color(h); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function sm(x, a, b) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function mixHex(a, b, t) { return C(a).lerp(C(b), t); }

  /* ---------- environment for reflections ---------- */
  (function () {
    var pm = new T.PMREMGenerator(renderer);
    var es = new T.Scene();
    var g = new T.SphereGeometry(60, 48, 24);
    var cols = [], p = g.attributes.position, top = C(0x93a9c2), mid = C(0x4c5966), bot = C(0x0d1116);
    for (var i = 0; i < p.count; i++) {
      var y = p.getY(i) / 60, c = y > 0 ? mid.clone().lerp(top, Math.pow(y, .6)) : mid.clone().lerp(bot, Math.pow(-y, .4));
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    es.add(new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
    var panel = new T.Mesh(new T.PlaneGeometry(40, 14), new T.MeshBasicMaterial({ color: 0xffffff }));
    panel.position.set(-20, 28, 26); panel.lookAt(0, 0, 0); es.add(panel);
    scene.environment = pm.fromScene(es, 0.03).texture;
  })();

  /* ---------- procedural textures ---------- */
  function canvasTex(w, h, draw, rx, ry) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx || 1, ry || 1);
    t.encoding = T.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }
  var rnd = (function (s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })(7);
  var stoneTex = canvasTex(512, 512, function (x, w, h) {
    x.fillStyle = '#3b3833'; x.fillRect(0, 0, w, h);
    var y = 0;
    while (y < h) {
      var rh = 18 + rnd() * 26, xx = -rnd() * 40;
      while (xx < w) {
        var rw = 40 + rnd() * 90, l = 92 + rnd() * 70, tone = rnd();
        var r = l + tone * 22, g = l + tone * 12 - 4, b = l - 10 + (1 - tone) * 10;
        x.fillStyle = 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
        x.fillRect(xx + 2, y + 2, rw - 4, rh - 4);
        x.fillStyle = 'rgba(255,255,255,' + (rnd() * .08) + ')'; x.fillRect(xx + 2, y + 2, rw - 4, 3);
        xx += rw;
      }
      y += rh;
    }
  }, 1, 1);
  var paveTex = canvasTex(512, 512, function (x, w, h) {
    x.fillStyle = '#7d7b76'; x.fillRect(0, 0, w, h);
    for (var j = 0; j < 8; j++) for (var i = 0; i < 4; i++) {
      var l = 150 + rnd() * 28; x.fillStyle = 'rgb(' + (l | 0) + ',' + ((l - 3) | 0) + ',' + ((l - 8) | 0) + ')';
      x.fillRect(i * 128 + (j % 2 ? 64 : 0) + 3, j * 64 + 3, 122, 58);
      x.fillRect(i * 128 + (j % 2 ? 64 : 0) - 128 + 3, j * 64 + 3, 122, 58);
    }
  }, 2, 6);
  var doorTex = canvasTex(256, 256, function (x, w, h) {
    x.fillStyle = '#2f3439'; x.fillRect(0, 0, w, h);
    for (var i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#353b41' : '#2a2f34'; x.fillRect(0, i * 16, w, 16); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, i * 16 + 15, w, 1); }
  }, 1, 1);
  var roomTex = canvasTex(256, 256, function (x, w, h) {
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3a2414'); g.addColorStop(.35, '#b06a32'); g.addColorStop(.8, '#ffd09a'); g.addColorStop(1, '#8a5428');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (var i = 0; i < 5; i++) { x.fillStyle = 'rgba(30,18,10,' + (.25 + rnd() * .35) + ')'; x.fillRect(rnd() * w, h * .45 + rnd() * h * .2, 18 + rnd() * 40, h); }
  });
  var glowTex = canvasTex(128, 128, function (x, w, h) {
    var g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,190,120,.9)'); g.addColorStop(.35, 'rgba(255,150,80,.28)'); g.addColorStop(1, 'rgba(255,140,60,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });

  /* ---------- materials ---------- */
  var M = {
    plaster: new T.MeshStandardMaterial({ color: 0xdedcd6, roughness: .9 }),
    slab: new T.MeshStandardMaterial({ color: 0xe9e8e4, roughness: .85 }),
    charcoal: new T.MeshStandardMaterial({ color: 0x2c3035, roughness: .75 }),
    stone: new T.MeshStandardMaterial({ map: stoneTex, roughness: .95 }),
    glass: new T.MeshStandardMaterial({ color: 0x0b141c, metalness: .92, roughness: .05, envMapIntensity: 1.9, emissive: 0xffffff, emissiveMap: roomTex, emissiveIntensity: 0 }),
    timber: new T.MeshStandardMaterial({ color: 0x8c5a37, roughness: .62 }),
    door: new T.MeshStandardMaterial({ map: doorTex, roughness: .55, metalness: .3 }),
    pave: new T.MeshStandardMaterial({ map: paveTex, roughness: .95 }),
    lawn: new T.MeshStandardMaterial({ color: 0x24382a, roughness: 1 }),
    leaf: new T.MeshStandardMaterial({ color: 0x15231a, roughness: .95 }),
    bark: new T.MeshStandardMaterial({ color: 0x3a2c22, roughness: 1 }),
    strip: new T.MeshBasicMaterial({ color: 0xffc58a, transparent: true, opacity: 0 })
  };
  var fadeMats = ['plaster', 'slab', 'charcoal', 'stone', 'glass', 'timber', 'door', 'pave', 'lawn', 'leaf', 'bark'].map(function (k) { var m = M[k]; m.transparent = true; m.opacity = 0; return m; });

  /* ---------- house ---------- */
  var solids = new T.Group(); scene.add(solids);
  var edgePos = [];
  function box(x0, x1, y0, y1, z0, z1, mat, opts) {
    opts = opts || {};
    var w = x1 - x0, h = y1 - y0, d = z1 - z0;
    var g = new T.BoxGeometry(w, h, d);
    if (mat.map) { // scale UVs to world size so textures keep their scale
      var uv = g.attributes.uv, n = g.attributes.normal;
      for (var i = 0; i < uv.count; i++) {
        var nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
        var su = nx > .5 ? d : w, sv = ny > .5 ? d : h;
        uv.setXY(i, uv.getX(i) * su / (opts.tile || 3), uv.getY(i) * sv / (opts.tile || 3));
      }
    }
    var m = new T.Mesh(g, mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.castShadow = opts.cast !== false; m.receiveShadow = true;
    solids.add(m);
    if (opts.edges !== false) {
      var e = new T.EdgesGeometry(g), a = e.attributes.position;
      for (var j = 0; j < a.count; j++) edgePos.push(a.getX(j) + m.position.x, a.getY(j) + m.position.y, a.getZ(j) + m.position.z);
    }
    return m;
  }
  // plinth and masses
  box(-6.4, 12.4, -0.12, 0.12, -5, 4.9, M.slab, { edges: false });
  box(-6, 6, 0.12, 3, -4.5, 4.5, M.plaster);                 // ground floor
  box(6, 12, 0.12, 3, -4.5, 3, M.charcoal);                  // garage
  box(5.8, 12.4, 3, 3.28, -4.7, 3.7, M.slab);                // garage roof
  box(-7, 4, 3, 6.2, -4, 5.5, M.plaster);                    // upper floor (cantilever)
  box(-7.4, 4.4, 6.2, 6.46, -4.4, 5.95, M.slab);             // roof slab
  box(-1.35, -0.65, 0.12, 6.95, -4.6, 6.25, M.stone, { tile: 2.4 }); // stone blade wall
  // openings
  var glassList = [];
  glassList.push(box(-5.5, -1.7, 0.3, 2.78, 4.5, 4.58, M.glass, { cast: false }));
  glassList.push(box(1.9, 5.5, 0.7, 2.78, 4.5, 4.58, M.glass, { cast: false }));
  glassList.push(box(0.2, 3.7, 3.4, 5.95, 5.5, 5.58, M.glass, { cast: false }));
  glassList.push(box(-6.5, -2.0, 3.55, 5.65, 5.5, 5.58, M.glass, { cast: false }));
  glassList.forEach(function (g) {
    var gp = g.geometry.parameters, cx = g.position.x, cy = g.position.y, z = g.position.z + .06;
    var x0 = cx - gp.width / 2, x1 = cx + gp.width / 2, y0 = cy - gp.height / 2, y1 = cy + gp.height / 2;
    var n = Math.max(1, Math.round(gp.width / 1.3));
    for (var i = 0; i <= n; i++) { var xx = x0 + (x1 - x0) * i / n; box(xx - .04, xx + .04, y0, y1, z - .04, z + .04, M.charcoal, { edges: false, cast: false }); }
    box(x0, x1, y0 - .04, y0 + .04, z - .04, z + .04, M.charcoal, { edges: false, cast: false });
    box(x0, x1, y1 - .04, y1 + .04, z - .04, z + .04, M.charcoal, { edges: false, cast: false });
  });
  box(0, 1.35, 0.12, 2.62, 4.5, 4.62, M.timber);             // front door
  box(6.6, 11.4, 0.12, 2.45, 3, 3.08, M.door, { tile: 6 });  // garage door
  for (var sx = 0.25; sx <= 3.65; sx += 0.24) box(sx, sx + 0.07, 3.3, 6.2, 5.62, 5.78, M.timber, { edges: false }); // slatted screen
  var strip = new T.Mesh(new T.BoxGeometry(4.8, .05, .05), M.strip); strip.position.set(9, 2.98, 3.5); solids.add(strip);
  // landscape
  var gnd = new T.Mesh(new T.PlaneGeometry(400, 400), new T.MeshStandardMaterial({ color: 0x0d151d, roughness: 1 }));
  gnd.rotation.x = -Math.PI / 2; gnd.position.y = -0.13; gnd.receiveShadow = true; scene.add(gnd);
  var drive = new T.Mesh(new T.PlaneGeometry(7, 14), M.pave); drive.rotation.x = -Math.PI / 2; drive.position.set(9, -0.11, 10); drive.receiveShadow = true; solids.add(drive);
  var path = new T.Mesh(new T.PlaneGeometry(1.8, 11.3), M.pave); path.rotation.x = -Math.PI / 2; path.position.set(.7, -0.11, 10.6); path.receiveShadow = true; solids.add(path);
  var lawn = new T.Mesh(new T.PlaneGeometry(17, 11.3), M.lawn); lawn.rotation.x = -Math.PI / 2; lawn.position.set(-8.9, -0.115, 10.6); lawn.receiveShadow = true; solids.add(lawn);
  function tree(x, z, s) {
    var t = new T.Mesh(new T.CylinderGeometry(.12 * s, .18 * s, 3 * s, 8), M.bark); t.position.set(x, 1.5 * s, z); t.castShadow = true; solids.add(t);
    var c = new T.Mesh(new T.CapsuleGeometry(1.05 * s, 3.4 * s, 8, 20), M.leaf); c.position.set(x, 4.2 * s, z); c.castShadow = true; solids.add(c);
  }
  box(-6, -1.8, -0.12, .75, 4.75, 5.45, M.leaf, { edges: false });
  box(1.8, 5.6, -0.12, .62, 4.75, 5.35, M.leaf, { edges: false });
  box(-17, -6.6, -0.12, 1.4, -6.2, -5.8, M.plaster, { edges: false });
  box(12.8, 13.2, -0.12, 1.4, -6.2, 3.4, M.plaster, { edges: false });
  box(-16.8, -15.6, -0.12, .9, 6, 13, M.leaf, { edges: false });

  /* ---------- linework: wire (rises) and plan (draws) ---------- */
  var wireMat = new T.LineBasicMaterial({ color: 0x7fb2ee, transparent: true, opacity: .95, fog: false });
  var wg = new T.BufferGeometry(); wg.setAttribute('position', new T.Float32BufferAttribute(edgePos, 3));
  var wire = new T.LineSegments(wg, wireMat);
  var wireRig = new T.Group(); wireRig.add(wire); scene.add(wireRig);

  var planPts = [];
  function seg(a, b) { // subdivide so the drawing progresses smoothly
    var L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / .3));
    for (var i = 0; i < n; i++) {
      var t0 = i / n, t1 = (i + 1) / n;
      planPts.push(a[0] + (b[0] - a[0]) * t0, .02, a[1] + (b[1] - a[1]) * t0, a[0] + (b[0] - a[0]) * t1, .02, a[1] + (b[1] - a[1]) * t1);
    }
  }
  function rect(x0, z0, x1, z1) { seg([x0, z0], [x1, z0]); seg([x1, z0], [x1, z1]); seg([x1, z1], [x0, z1]); seg([x0, z1], [x0, z0]); }
  function arc(cx, cz, r, a0, a1) { var n = 14; for (var i = 0; i < n; i++) { var t0 = a0 + (a1 - a0) * i / n, t1 = a0 + (a1 - a0) * (i + 1) / n; seg([cx + r * Math.cos(t0), cz + r * Math.sin(t0)], [cx + r * Math.cos(t1), cz + r * Math.sin(t1)]); } }
  rect(-6, -4.5, 6, 4.5); rect(6, -4.5, 12, 3); rect(-1.35, -4.6, -.65, 6.25);
  seg([-6, 0], [-1.35, 0]); seg([1.6, -1], [6, -1]); seg([3, -4.5], [3, -1]); seg([-.65, 1.6], [2.4, 1.6]);
  arc(0, 4.5, 1.3, -Math.PI / 2, -Math.PI); seg([0, 4.5], [0, 3.2]);
  rect(6.6, 2.9, 11.4, 3.1); rect(-5.5, 4.4, -1.7, 4.6); rect(1.9, 4.4, 5.5, 4.6);
  // dimension lines
  seg([-6, 7.2], [12, 7.2]); [-6, -1, 4, 6, 12].forEach(function (x) { seg([x, 6.8], [x, 7.6]); seg([x - .25, 7.45], [x + .25, 6.95]); });
  seg([-8.4, -4.5], [-8.4, 4.5]); [-4.5, 0, 4.5].forEach(function (z) { seg([-8.8, z], [-8, z]); seg([-8.65, z + .25], [-8.15, z - .25]); });
  // stair and kitchen hints
  for (var k = 0; k < 7; k++) seg([-5.6 + k * .5, -4.1], [-5.6 + k * .5, -2.4]);
  rect(1.9, -4.1, 5.6, -3.4);
  var pg = new T.BufferGeometry(); pg.setAttribute('position', new T.Float32BufferAttribute(planPts, 3));
  var planMat = new T.LineBasicMaterial({ color: 0x8fc0ff, transparent: true, opacity: 1, fog: false });
  var plan = new T.LineSegments(pg, planMat); scene.add(plan);
  var planVerts = planPts.length / 3;

  var grid = new T.GridHelper(120, 120, 0x2d4a69, 0x1a2c40);
  grid.position.y = -0.125; grid.material.transparent = true; grid.material.opacity = .55; grid.material.fog = true; scene.add(grid);

  // warm light pools on the ground for dusk
  var glows = [];
  [[-3.6, 6.2, 6.5, 3.4], [3.7, 6.2, 5.5, 3.2], [9, 5.4, 7.5, 3.6], [.7, 7.4, 3.4, 4.5]].forEach(function (q) {
    var m = new T.Mesh(new T.PlaneGeometry(q[2], q[3]), new T.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(q[0], -0.08, q[1]); scene.add(m); glows.push(m);
  });

  /* ---------- lights ---------- */
  var hemi = new T.HemisphereLight(0xbfd3ea, 0x1b1f24, .55); scene.add(hemi);
  var sun = new T.DirectionalLight(0xfff1df, 1.6);
  sun.position.set(-26, 27, 11); sun.castShadow = true;
  var sz = mobile ? 1024 : 2048; sun.shadow.mapSize.set(sz, sz);
  var sc = sun.shadow.camera; sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -26; sc.near = 5; sc.far = 90;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = .03; sun.shadow.radius = 3;
  scene.add(sun);
  var porch = new T.PointLight(0xffb26b, 0, 9, 2); porch.position.set(.7, 2.4, 6); scene.add(porch);
  var garL = new T.PointLight(0xffb26b, 0, 8, 2); garL.position.set(9, 2.6, 5); scene.add(garL);

  /* ---------- camera path ---------- */
  var V = function (x, y, z) { return new T.Vector3(x, y, z); };
  var camPath = new T.CatmullRomCurve3([V(3, 52, 17), V(27, 20, 31), V(29, 8.5, 25), V(17, 5.2, 31), V(-13, 5.6, 29)]);
  var tgtPath = new T.CatmullRomCurve3([V(2.6, 0, 1.2), V(2.6, 1.5, .8), V(2.8, 2.8, .6), V(2.4, 2.9, 1.2), V(1.6, 3, 1.4)]);

  /* ---------- palette keys ---------- */
  var SKY = [
    ['#071019', '#0C1826', '#122438'], // blueprint
    ['#0E1D2D', '#3B5770', '#9DAAB1'], // blue hour with light
    ['#04070B', '#0E1823', '#2A2A33']  // dusk
  ];
  function skyAt(t1, t2) {
    var out = [];
    for (var i = 0; i < 3; i++) out.push('#' + mixHex(SKY[0][i], SKY[1][i], t1).lerp(C(SKY[2][i]), t2).getHexString());
    return out;
  }

  /* ---------- state ---------- */
  var intro = reduce ? 1 : 0, introStart = performance.now() + 250;
  var p = 0, mx = 0, my = 0, tmx = 0, tmy = 0, visible = true, last = performance.now();
  var vCam = new T.Vector3(), vTgt = new T.Vector3();
  if (!reduce) window.addEventListener('pointermove', function (e) { tmx = e.clientX / innerWidth - .5; tmy = e.clientY / innerHeight - .5; }, { passive: true });

  function size() {
    var w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < .8 ? 44 : w / h < 1.3 ? 38 : 32;
    // frame the house off-centre: right of the copy on wide screens, above it on phones
    if (w / h < .8) camera.setViewOffset(w, h, 0, h * .08, w, h);
    else if (w / h < 1.3) camera.setViewOffset(w, h, -w * .08, h * .06, w, h);
    else camera.setViewOffset(w, h, -w * .17, 0, w, h);
    camera.updateProjectionMatrix();
  }
  size();
  if (window.ResizeObserver) new ResizeObserver(size).observe(stage); else addEventListener('resize', size);
  if (window.IntersectionObserver) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) loop(); }, { rootMargin: '100px' }).observe(stage);

  var opaque = false;
  function setFade(o) {
    for (var i = 0; i < fadeMats.length; i++) {
      var m = fadeMats[i];
      m.opacity = o;
      var tr = o < .999;
      if (m.transparent !== tr) { m.transparent = tr; m.depthWrite = true; m.needsUpdate = true; }
    }
    solids.visible = o > .001;
  }

  function frame(now) {
    var dt = Math.min(64, now - last); last = now;
    if (!reduce && intro < 1 && now > introStart) intro = Math.min(1, intro + dt / 3200);
    var k = 1 - Math.pow(.001, dt / 1000 * (reduce ? 50 : 2.6)); // frame-rate independent easing
    p += (api.target - p) * k;
    mx += (tmx - mx) * .05; my += (tmy - my) * .05;

    var draw = Math.max(sm(intro, 0, 1), sm(p, 0, .18));
    var rise = sm(p, .2, .46);
    var solid = sm(p, .44, .68);
    var dusk = sm(p, .72, .95);

    var cnt = Math.floor(planVerts * draw / 2) * 2;
    pg.setDrawRange(0, cnt);
    planMat.opacity = 1 - solid * .85;
    wireRig.scale.y = Math.max(.002, rise);
    wireRig.visible = rise > .004;
    wireMat.opacity = .95 * (1 - sm(p, .54, .7));
    grid.material.opacity = (.55 + rise * .1) * (1 - solid * .7) * Math.max(.25, draw);
    setFade(solid);

    // lighting and sky
    var day = solid * (1 - dusk);
    var sk = skyAt(solid, dusk);
    sky.style.setProperty('--sk1', sk[0]); sky.style.setProperty('--sk2', sk[1]); sky.style.setProperty('--sk3', sk[2]);
    sky.style.setProperty('--glow', 'rgba(255,150,80,' + (dusk * .22).toFixed(3) + ')');
    scene.fog.color.set(sk[2]);
    sun.intensity = lerp(.15, 2.5, solid) * (1 - dusk * .92);
    sun.color.copy(mixHex('#fff3e4', '#ffc79a', dusk));
    hemi.intensity = lerp(.08, .6, solid) * (1 - dusk * .62) + .05;
    gnd.material.color.copy(mixHex('#05080c', '#0c131a', solid));
    hemi.color.copy(mixHex('#c4d6ea', '#6e7f99', dusk));
    renderer.toneMappingExposure = 1.08 - dusk * .16;
    M.glass.emissiveIntensity = dusk * 1.15;
    M.glass.envMapIntensity = 1.9 - dusk * 1.3;
    M.strip.opacity = dusk;
    porch.intensity = dusk * 1.1; garL.intensity = dusk * 1.3;
    for (var i = 0; i < glows.length; i++) glows[i].material.opacity = dusk * .55;

    // camera
    var t = clamp(p, 0, 1);
    camPath.getPoint(t, vCam); tgtPath.getPoint(t, vTgt);
    var asp = camera.aspect, far = asp < .8 ? 1.8 : asp < 1.3 ? 1.22 : 1;
    vCam.sub(vTgt).multiplyScalar(far).add(vTgt);
    var idle = reduce ? 0 : now / 1000;
    var ox = Math.sin(idle * .13) * .9 + mx * 3.2, oy = Math.cos(idle * .11) * .35 - my * 1.6;
    camera.position.set(vCam.x + ox, vCam.y + oy, vCam.z);
    camera.lookAt(vTgt);
    renderer.render(scene, camera);
  }
  var raf = 0;
  function loop() { if (raf) return; raf = requestAnimationFrame(function tick(now) { raf = 0; if (!visible) return; frame(now); loop(); }); }
  frame(performance.now()); loop();
  api.ready = true;
})();
