// Общие вещи для всех страниц: меню, тема, хранилище в браузере, всплывашка, плавное появление
var Profit = (function () {
  // localStorage может быть выключен, тогда сайт просто ничего не запоминает
  function get(key, def) {
    try { var v = localStorage.getItem(key); return v === null ? def : JSON.parse(v); } catch (e) { return def; }
  }
  function set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
  }
  function del(key) { try { localStorage.removeItem(key); } catch (e) { /* ничего */ } }

  var toastTimer;
  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  // копирование: сначала новый способ, если не вышло, то через скрытое поле
  function copy(text, okMsg) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      toast(ok ? okMsg : 'Не получилось скопировать, выдели текст вручную');
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, fallback);
    } else fallback();
  }

  function num(x, d) { return Number(x).toFixed(d === undefined ? 1 : d).replace('.', ','); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function norm(s) { return String(s).toLowerCase().replace(/ё/g, 'е'); }
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  return { get: get, set: set, del: del, toast: toast, copy: copy, num: num, esc: esc, norm: norm, reduced: reduced };
})();

// бургер-меню
(function () {
  var burger = document.querySelector('.burger');
  var nav = document.getElementById('nav');
  if (!burger || !nav) return;
  function close() {
    nav.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
  }
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) { close(); burger.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (!nav.contains(e.target) && !burger.contains(e.target)) close();
  });
})();

// дневная и ночная тема
(function () {
  var root = document.documentElement;
  var btns = document.querySelectorAll('.theme-btn');
  var meta = document.querySelector('meta[name="theme-color"]');
  function paint() {
    var dark = root.getAttribute('data-theme') === 'dark';
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', dark ? 'true' : 'false');
      var l = btns[i].querySelector('.theme-label');
      if (l) l.textContent = dark ? 'День' : 'Ночь';
      btns[i].title = dark ? 'Включить дневную тему' : 'Включить ночную тему';
    }
    if (meta) meta.setAttribute('content', dark ? '#151814' : '#f7f2e6');
  }
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function () {
      var dark = root.getAttribute('data-theme') !== 'dark';
      if (dark) root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
      try { localStorage.setItem('profit-theme', dark ? 'dark' : 'light'); } catch (e) { /* без памяти */ }
    });
    btns[i].addEventListener('click', paint);
  }
  paint();
})();

// тень у шапки при прокрутке и плавное появление блоков
(function () {
  var header = document.querySelector('.header');
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 4); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  var items = document.querySelectorAll('.reveal');
  if (Profit.reduced || !('IntersectionObserver' in window)) {
    for (var i = 0; i < items.length; i++) items[i].classList.add('in');
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -40px 0px' });
  for (var j = 0; j < items.length; j++) io.observe(items[j]);
})();

// страница «О команде»: стереть всё, что сайт запомнил
(function () {
  var b = document.getElementById('wipe-all');
  if (!b) return;
  b.addEventListener('click', function () {
    ['profit-calc', 'profit-plate', 'profit-tips', 'profit-theme'].forEach(Profit.del);
    document.documentElement.removeAttribute('data-theme');
    var l = document.querySelectorAll('.theme-label');
    for (var i = 0; i < l.length; i++) l[i].textContent = 'Ночь';
    Profit.toast('Готово, сайт всё забыл');
  });
})();
