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
  renderer.toneMappingExposure = 1.0;
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  var scene = new T.Scene();
  scene.fog = new T.Fog(0x8c6247, 60, 170);
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
    var cols = [], p = g.attributes.position, top = C(0xe8c9a2), mid = C(0x9a6c4c), bot = C(0x24160f);
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
  var soilTex = canvasTex(512, 512, function (x, w, h) {
    x.fillStyle = '#563828'; x.fillRect(0, 0, w, h);
    for (var i = 0; i < 14000; i++) {
      var l = rnd(), r = 82 + l * 50, g2 = 52 + l * 34, b = 36 + l * 22;
      x.fillStyle = 'rgba(' + (r | 0) + ',' + (g2 | 0) + ',' + (b | 0) + ',' + (.18 + rnd() * .35) + ')';
      var sz = .8 + rnd() * 2.2; x.fillRect(rnd() * w, rnd() * h, sz, sz);
    }
  }, 70, 70);
  var brickTex = canvasTex(512, 512, function (x, w, h) {
    x.fillStyle = '#b9ab9a'; x.fillRect(0, 0, w, h);
    var bh = 512 / 14, bw = 512 / 4.4;
    for (var j = 0; j < 14; j++) for (var i = -1; i < 5; i++) {
      var t = rnd(), r = 150 + t * 50, g = 72 + t * 30, b = 44 + t * 18;
      if (rnd() < .12) { r -= 40; g -= 22; b -= 12; }
      x.fillStyle = 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
      x.fillRect(i * bw + (j % 2 ? bw / 2 : 0) + 3, j * bh + 3, bw - 6, bh - 6);
      x.fillStyle = 'rgba(0,0,0,' + (rnd() * .12) + ')'; x.fillRect(i * bw + (j % 2 ? bw / 2 : 0) + 3, j * bh + bh - 9, bw - 6, 6);
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
    x.fillStyle = '#2f2b28'; x.fillRect(0, 0, w, h);
    for (var i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#38332f' : '#2a2623'; x.fillRect(0, i * 16, w, 16); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, i * 16 + 15, w, 1); }
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
    plaster: new T.MeshStandardMaterial({ color: 0xe6e2db, roughness: .9 }),
    slab: new T.MeshStandardMaterial({ color: 0xefebe5, roughness: .85 }),
    charcoal: new T.MeshStandardMaterial({ color: 0x2a2725, roughness: .75 }),
    stone: new T.MeshStandardMaterial({ map: stoneTex, roughness: .95 }),
    glass: new T.MeshStandardMaterial({ color: 0x14110f, metalness: .92, roughness: .05, envMapIntensity: 1.9, emissive: 0xffffff, emissiveMap: roomTex, emissiveIntensity: 0 }),
    timber: new T.MeshStandardMaterial({ color: 0x8c5a37, roughness: .62 }),
    door: new T.MeshStandardMaterial({ map: doorTex, roughness: .55, metalness: .3 }),
    pave: new T.MeshStandardMaterial({ map: paveTex, roughness: .95 }),
    lawn: new T.MeshStandardMaterial({ color: 0x3d4a26, roughness: 1 }),
    leaf: new T.MeshStandardMaterial({ color: 0x2a3820, roughness: .95 }),
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
  var gnd = new T.Mesh(new T.PlaneGeometry(400, 400), new T.MeshStandardMaterial({ map: soilTex, color: 0xffffff, roughness: 1 }));
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

  /* ---------- setting out: lime lines on the soil, string lines on pegs ---------- */
  var limePts = [], strPts = [], pegAt = [];
  function segTo(arr, y, a, b) {
    var L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / .3));
    for (var i = 0; i < n; i++) {
      var t0 = i / n, t1 = (i + 1) / n;
      arr.push(a[0] + (b[0] - a[0]) * t0, y, a[1] + (b[1] - a[1]) * t0, a[0] + (b[0] - a[0]) * t1, y, a[1] + (b[1] - a[1]) * t1);
    }
  }
  function lime(a, b) { segTo(limePts, -0.1, a, b); }
  function string(x0, z0, x1, z1) { // builder's lines run past the corners to profile pegs
    var e = 1.4;
    segTo(strPts, .42, [x0 - e, z0], [x1 + e, z0]); segTo(strPts, .42, [x1, z0 - e], [x1, z1 + e]);
    segTo(strPts, .42, [x1 + e, z1], [x0 - e, z1]); segTo(strPts, .42, [x0, z1 + e], [x0, z0 - e]);
    pegAt.push([x0 - e, z0], [x1 + e, z0], [x1, z0 - e], [x1, z1 + e], [x1 + e, z1], [x0 - e, z1], [x0, z1 + e], [x0, z0 - e]);
  }
  string(-6, -4.5, 6, 4.5); string(6, -4.5, 12, 3);
  [[-6, 0, -1.35, 0], [1.6, -1, 6, -1], [3, -4.5, 3, -1], [-.65, 1.6, 2.4, 1.6], [-1.35, -4.6, -1.35, 6.25], [-.65, -4.6, -.65, 6.25],
   [-7, 5.5, 4, 5.5], [-7, -4, -7, 5.5], [4, 4.5, 4, 5.5]].forEach(function (q) { lime([q[0], q[1]], [q[2], q[3]]); });
  for (var k = 0; k < 7; k++) lime([-5.6 + k * .5, -4.1], [-5.6 + k * .5, -2.4]);
  function lineSet(pts, color, op) {
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
    var m = new T.LineBasicMaterial({ color: color, transparent: true, opacity: op });
    var l = new T.LineSegments(g, m); scene.add(l); return { g: g, m: m, n: pts.length / 3 };
  }
  var strings = lineSet(strPts, 0xff7a1f, 1), limes = lineSet(limePts, 0xf1e9dc, .85);
  var pegMat = new T.MeshStandardMaterial({ color: 0xc89a62, roughness: .8, transparent: true });
  var pegs = pegAt.map(function (q) {
    var g = new T.BoxGeometry(.09, .62, .09); g.translate(0, .31, 0);
    var m = new T.Mesh(g, pegMat); m.position.set(q[0], -0.12, q[1]); m.castShadow = true; m.scale.y = .001; scene.add(m); return m;
  });

  /* ---------- brickwork: raw walls rise course by course (clipped) ---------- */
  var clipLow = new T.Plane(new T.Vector3(0, -1, 0), 0), clipHigh = new T.Plane(new T.Vector3(0, -1, 0), 0);
  var brickA = new T.MeshStandardMaterial({ map: brickTex, roughness: .92, side: T.DoubleSide, clippingPlanes: [clipLow], clipShadows: true });
  var brickB = brickA.clone(); brickB.clippingPlanes = [clipHigh];
  var concrete = new T.MeshStandardMaterial({ color: 0x8a8279, roughness: .95, clippingPlanes: [clipHigh], clipShadows: true });
  var raw = new T.Group(); scene.add(raw);
  function rbox(x0, x1, y0, y1, z0, z1, mat, tile) {
    var w = x1 - x0 - .04, h = y1 - y0, d = z1 - z0 - .04, g = new T.BoxGeometry(w, h, d);
    if (mat.map) {
      var uv = g.attributes.uv, n = g.attributes.normal;
      for (var i = 0; i < uv.count; i++) {
        var nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
        uv.setXY(i, uv.getX(i) * (nx > .5 ? d : w) / tile, uv.getY(i) * (ny > .5 ? d : h) / tile);
      }
    }
    var m = new T.Mesh(g, mat); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.castShadow = true; m.receiveShadow = true; raw.add(m); return m;
  }
  rbox(-6.4, 12.4, -0.12, 0.12, -5, 4.9, concrete, 3);
  rbox(-6, 6, 0.12, 3, -4.5, 4.5, brickA, 1.25);
  rbox(6, 12, 0.12, 3, -4.5, 3, brickA, 1.25);
  rbox(-1.35, -0.65, 0.12, 3, -4.6, 6.25, brickA, 1.25);
  rbox(5.8, 12.4, 3, 3.28, -4.7, 3.7, concrete, 3);
  rbox(-7, 4, 3, 3.25, -4, 5.5, concrete, 3);
  rbox(-7, 4, 3.25, 6.2, -4, 5.5, brickB, 1.25);
  rbox(-1.35, -0.65, 3, 6.95, -4.6, 6.25, brickB, 1.25);
  rbox(-7.4, 4.4, 6.2, 6.46, -4.4, 5.95, concrete, 3);
  var rawMats = [brickA, brickB, concrete];

  // warm light pools on the ground for dusk
  var glows = [];
  [[-3.6, 6.2, 6.5, 3.4], [3.7, 6.2, 5.5, 3.2], [9, 5.4, 7.5, 3.6], [.7, 7.4, 3.4, 4.5]].forEach(function (q) {
    var m = new T.Mesh(new T.PlaneGeometry(q[2], q[3]), new T.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(q[0], -0.08, q[1]); scene.add(m); glows.push(m);
  });

  /* ---------- lights ---------- */
  var hemi = new T.HemisphereLight(0xf3cfa3, 0x4a2a1a, .55); scene.add(hemi);
  var sun = new T.DirectionalLight(0xffd3a1, 2.2);
  sun.position.set(-30, 19, 20); sun.castShadow = true;
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
    ['#16120F', '#3A2A20', '#8C6247'], // late afternoon on site
    ['#28201A', '#6A5040', '#C3936C'], // golden hour
    ['#0F0C0A', '#2A1D16', '#7E3E20']  // dusk
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

    var draw = Math.max(sm(intro, 0, 1), sm(p, 0, .16));
    var rise1 = sm(p, .19, .34), rise2 = sm(p, .32, .46);
    var solid = sm(p, .47, .64), rawOut = sm(p, .58, .7);
    var dusk = sm(p, .72, .95);

    strings.g.setDrawRange(0, Math.floor(strings.n * draw / 2) * 2);
    limes.g.setDrawRange(0, Math.floor(limes.n * sm(draw, .25, 1) / 2) * 2);
    strings.m.opacity = 1 - solid; limes.m.opacity = .85 * (1 - solid);
    pegMat.opacity = 1 - solid;
    for (var q = 0; q < pegs.length; q++) pegs[q].scale.y = Math.max(.001, sm(draw, q / pegs.length * .8, q / pegs.length * .8 + .2));
    clipLow.constant = -0.2 + rise1 * 3.3;
    clipHigh.constant = 3 + rise2 * 4;
    raw.visible = rise1 > .001 && rawOut < .999;
    for (var r = 0; r < rawMats.length; r++) {
      var rm = rawMats[r], tr = rawOut > .001; rm.opacity = 1 - rawOut;
      if (rm.transparent !== tr) { rm.transparent = tr; rm.needsUpdate = true; }
    }
    setFade(solid);

    // lighting and sky
    var sk = skyAt(solid, dusk);
    sky.style.setProperty('--sk1', sk[0]); sky.style.setProperty('--sk2', sk[1]); sky.style.setProperty('--sk3', sk[2]);
    sky.style.setProperty('--glow', 'rgba(255,128,48,' + (.1 + dusk * .2).toFixed(3) + ')');
    scene.fog.color.set(sk[2]);
    sun.intensity = lerp(1.9, 2.4, solid) * (1 - dusk * .9);
    sun.color.copy(mixHex('#ffd3a1', '#ff9a5a', dusk));
    hemi.intensity = .5 * (1 - dusk * .65) + .05;
    gnd.material.color.copy(mixHex('#ffffff', '#6a5a50', dusk));
    hemi.color.copy(mixHex('#f3cfa3', '#8a6a58', dusk));
    renderer.toneMappingExposure = 1.0 - dusk * .14;
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
