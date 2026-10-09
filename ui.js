(function () {
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  /* ---------- smooth scrolling ---------- */
  var lenis = null;
  if (window.Lenis && !reduce) {
    try { lenis = new window.Lenis({ lerp: .085, smoothWheel: true, wheelMultiplier: .9 }); } catch (e) { lenis = null; }
  }
  function scrollToEl(el) {
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.6 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }
  $$('[data-go]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (!id || id.charAt(0) !== '#') return;
      e.preventDefault(); closeMenu();
      scrollToEl(id === '#top' ? document.body : $(id));
    });
  });

  /* ---------- black / white switch ---------- */
  var tg = $('#tg'), meta = document.querySelector('meta[name="theme-color"]');
  function syncTheme() {
    var light = doc.getAttribute('data-kpn') === 'light';
    $$('span', tg).forEach(function (s) { s.classList.toggle('on', (s.getAttribute('data-v') === 'light') === light); });
    tg.setAttribute('aria-pressed', String(light));
    if (meta) meta.setAttribute('content', light ? '#FFFFFF' : '#151311');
  }
  tg.addEventListener('click', function () {
    var light = doc.getAttribute('data-kpn') !== 'light';
    doc.classList.add('theming');
    if (light) doc.setAttribute('data-kpn', 'light'); else doc.removeAttribute('data-kpn');
    try { localStorage.setItem('kpn-theme', light ? 'light' : 'dark'); } catch (e) {}
    syncTheme();
    setTimeout(function () { doc.classList.remove('theming'); }, 700);
  });
  syncTheme();

  /* ---------- menu ---------- */
  var menuBtn = $('#menuBtn'), sheet = $('#sheet');
  function closeMenu() { doc.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', 'false'); sheet.setAttribute('aria-hidden', 'true'); if (lenis) lenis.start(); }
  menuBtn.addEventListener('click', function () {
    var open = !doc.classList.contains('menu-open');
    doc.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open)); sheet.setAttribute('aria-hidden', String(!open));
    if (lenis) open ? lenis.stop() : lenis.start();
  });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* ---------- giant wordmark ---------- */
  var giant = $('#giant');
  var gin = document.createElement('div'); gin.className = 'gin'; giant.appendChild(gin);
  'KHENSIWE PN'.split('').forEach(function (ch, i) {
    var s = document.createElement('span'); s.textContent = ch === ' ' ? ' ' : ch;
    s.style.transitionDelay = (i * 0.045) + 's'; gin.appendChild(s);
  });

  function fitGiant() {
    giant.style.setProperty('--gf', '100px');
    var w = gin.getBoundingClientRect().width, avail = giant.clientWidth;
    if (w > 0) giant.style.setProperty('--gf', (100 * avail / w * .995).toFixed(2) + 'px');
  }
  fitGiant();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitGiant);
  addEventListener('resize', fitGiant);

  /* ---------- statement words ---------- */
  var st = $('#statement'), words = [];
  (function split(node) {
    $$('*', node).length; // noop
    Array.prototype.slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
          var s = document.createElement('span'); s.className = 'w'; s.textContent = w; frag.appendChild(s); words.push(s);
        });
        n.parentNode.replaceChild(frag, n);
      } else if (n.nodeType === 1) split(n);
    });
  })(st);

  /* ---------- reveal (only things below the first screen start hidden) ---------- */
  var rvs = $$('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var vh = innerHeight;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.remove('pre-up', 'pre-pic'); io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    rvs.forEach(function (el, i) {
      var r = el.getBoundingClientRect();
      if (r.top > vh) {
        el.classList.add(el.classList.contains('pic') ? 'pre-pic' : 'pre-up');
        var sib = el.parentNode ? $$('.rv', el.parentNode).indexOf(el) : 0;
        el.style.transitionDelay = Math.min(sib, 4) * 0.08 + 's';
        io.observe(el);
      }
    });
    var gio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { giant.classList.add('in'); $$('span', giant).forEach(function (s) { s.style.setProperty('--gy', '0'); }); gio.disconnect(); } });
    $$('span', giant).forEach(function (s) { s.style.setProperty('--gy', '105%'); });
    gio.observe(giant);
  }

  /* ---------- scroll-linked motion ---------- */
  var fab = $('#fab'), contact = $('#contact'), fabReady = false;
  setTimeout(function () { fabReady = true; onScroll(y()); }, 1800);
  var hdr = $('#hdr'), build = $('#build'), caps = $$('[data-cap]'), nav = $('#stepsNav'), navItems = $$('div', nav), cue = $('#cue');
  var pics = $$('.pic img'), band = $('#band'), frame = $('.band .frame'), bandImg = $('.band .frame img'), bandWords = $('.band .words');
  var track = $('#track'), trackItems = $$('li', track), swoosh = $('#swoosh');
  var lastY = 0, curStage = 0, scene = window.KPN_SCENE || { target: 0 };

  function onScroll(y) {
    var H = innerHeight;
    // header
    hdr.classList.toggle('solid', y > H * .9);
    if (!doc.classList.contains('menu-open')) hdr.classList.toggle('away', y > lastY + 2 && y > H * 1.2);
    if (y < lastY - 2) hdr.classList.remove('away');
    lastY = y;

    // floating WhatsApp shows once the hero intro has settled, hides over the form
    if (fab) {
      var cr = contact.getBoundingClientRect();
      var overForm = cr.top < H * .6 && cr.bottom > H * .4;
      fab.classList.toggle('show', fabReady && !overForm);
    }

    // hero build progress
    var bt = build.offsetTop, bh = build.offsetHeight - H;
    var p = clamp((y - bt) / bh, 0, 1);
    scene.target = p;
    nav.style.setProperty('--prog', p.toFixed(4));
    var s = p < .2 ? 0 : p < .46 ? 1 : p < .72 ? 2 : 3;
    if (s !== curStage) {
      curStage = s;
      caps.forEach(function (c, i) { c.classList.toggle('off', i !== s); });
      navItems.forEach(function (n, i) { n.classList.toggle('on', i === s); });
    }
    if (cue) cue.classList.toggle('gone', p > .03);

    // statement highlight
    var r = st.getBoundingClientRect();
    var sp = clamp((H * .85 - r.top) / (r.height + H * .35), 0, 1);
    var n = words.length;
    for (var i = 0; i < n; i++) {
      var o = clamp(sp * n * 1.15 - i, 0, 1);
      words[i].style.setProperty('--o', (0.22 + o * .78).toFixed(3));
    }

    // gallery parallax
    if (!reduce) for (var j = 0; j < pics.length; j++) {
      var pr = pics[j].parentNode.getBoundingClientRect();
      if (pr.bottom < -50 || pr.top > H + 50) continue;
      var c = (pr.top + pr.height / 2 - H / 2) / (H / 2 + pr.height / 2);
      pics[j].style.setProperty('--py', (c * -7).toFixed(2) + '%');
    }

    // render band: frame opens to full bleed
    var br = band.getBoundingClientRect();
    var bp = clamp(-br.top / (band.offsetHeight - H), 0, 1);
    var e = 1 - Math.pow(1 - clamp(bp / .7, 0, 1), 3);
    var narrow = innerWidth < 700;
    frame.style.setProperty('--ci', ((1 - e) * (narrow ? 18 : 14)).toFixed(2) + '%');
    frame.style.setProperty('--cx', ((1 - e) * (narrow ? 8 : 22)).toFixed(2) + '%');
    frame.style.setProperty('--cr', ((1 - e) * 8).toFixed(1) + 'px');
    bandImg.style.setProperty('--bs', (1.25 - e * .2).toFixed(3));
    bandWords.style.opacity = clamp((bp - .2) / .3, 0, 1).toFixed(3);
    bandWords.style.transform = 'translateY(' + ((1 - clamp((bp - .2) / .4, 0, 1)) * 40).toFixed(1) + 'px)';

    // brand swoosh above the footer wordmark draws itself
    if (swoosh) {
      var fr = swoosh.getBoundingClientRect();
      var fp = reduce ? 1 : clamp((H - fr.top) / (H * .55), 0, 1);
      swoosh.style.setProperty('--sd', (1 - (1 - Math.pow(1 - fp, 3))).toFixed(4));
    }

    // process line
    var tr = track.getBoundingClientRect();
    var tp = clamp((H * .75 - tr.top) / (tr.height * .9 + H * .2), 0, 1);
    track.style.setProperty('--tp', tp.toFixed(4));
    var vertical = innerWidth <= 900;
    trackItems.forEach(function (li, k) { li.classList.toggle('on', tp >= (vertical ? k / trackItems.length : k / trackItems.length) - .001 && tp > 0); });
  }

  function y() { return lenis ? lenis.scroll : (window.scrollY || pageYOffset); }
  if (lenis) {
    lenis.on('scroll', function () { onScroll(y()); });
    requestAnimationFrame(function raf(t) { lenis.raf(t); requestAnimationFrame(raf); });
  } else {
    addEventListener('scroll', function () { onScroll(y()); }, { passive: true });
  }
  addEventListener('resize', function () { onScroll(y()); });
  onScroll(y());
  if (window.KPN_SCENE) scene = window.KPN_SCENE;

  /* ---------- quote form to WhatsApp ---------- */
  var f = $('#qf'), send = $('#q-send');
  function v(id) { return ($('#' + id).value || '').trim(); }
  function buildMsg() {
    var s = $$('.ticks input:checked', f).map(function (i) { return i.value; });
    var t = 'Hi Khensiwe PN, I would like a quote.\n\nName: ' + (v('q-name') || '-') + '\nArea: ' + (v('q-area') || '-') + '\nNeed: ' + (s.join(', ') || 'Not sure yet') + '\nBudget: ' + v('q-budget') + '\nStart: ' + v('q-when') + (v('q-msg') ? '\n\n' + v('q-msg') : '');
    send.href = 'https://wa.me/27738752722?text=' + encodeURIComponent(t);
  }
  f.addEventListener('input', buildMsg); f.addEventListener('change', buildMsg);
  f.addEventListener('submit', function (e) { e.preventDefault(); });
  buildMsg();
})();
