// Главная: живой пример замены в виде чека, счётчики и последний расчёт
(function () {
  if (typeof SWAPS === 'undefined' || !document.getElementById('receipt')) return;
  var $ = function (id) { return document.getElementById(id); };
  var i = 0;
  var body = $('rc-body');

  function fill() {
    var s = SWAPS[i];
    var d = s.toKcal - s.fromKcal;
    $('rc-from').textContent = s.from;
    $('rc-from-k').textContent = s.fromKcal + ' ккал';
    $('rc-to').textContent = s.to;
    $('rc-to-k').textContent = s.toKcal + ' ккал';
    $('rc-diff').textContent = (d > 0 ? '+' : d < 0 ? '−' : '') + Math.abs(d) + ' ккал';
    $('rc-bud').textContent = s.budget ? 'да ₽' : 'не всегда';
    $('rc-why').textContent = 'Почему: ' + s.why + '.';
    $('rc-num').textContent = (i + 1) + ' из ' + SWAPS.length;
    $('rc-stamp').classList.toggle('on', !!s.budget);
  }
  function go(n) {
    i = (n + SWAPS.length) % SWAPS.length;
    if (Profit.reduced) { fill(); return; }
    body.classList.add('swap');
    setTimeout(function () { fill(); body.classList.remove('swap'); }, 160);
  }
  $('rc-next').addEventListener('click', function () { go(i + 1); });
  $('rc-prev').addEventListener('click', function () { go(i - 1); });
  $('rc-rand').addEventListener('click', function () {
    var n = i;
    while (n === i && SWAPS.length > 1) n = Math.floor(Math.random() * SWAPS.length);
    go(n);
  });
  // стрелки на клавиатуре, когда фокус внутри чека
  $('receipt').addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { go(i + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { go(i - 1); e.preventDefault(); }
  });
  // свайп по чеку на телефоне
  var x0 = null;
  $('receipt').addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  $('receipt').addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) go(dx < 0 ? i + 1 : i - 1);
    x0 = null;
  });
  fill();

  // цифры берём из данных, чтобы они не расходились с таблицами
  var counts = {
    products: typeof PRODUCTS !== 'undefined' ? PRODUCTS.length : null,
    swaps: SWAPS.length,
    budget: SWAPS.filter(function (s) { return s.budget; }).length,
    tips: typeof TIPS !== 'undefined' ? TIPS.length : null
  };
  var els = document.querySelectorAll('[data-count]');
  for (var k = 0; k < els.length; k++) {
    var v = counts[els[k].getAttribute('data-count')];
    if (v !== null && v !== undefined) els[k].textContent = v;
  }

  // последний расчёт из калькулятора, если человек разрешил его запомнить
  var saved = Profit.get('profit-calc', null);
  if (saved && saved.res && saved.res.kcal) {
    var g = { lose: 'чтобы снизить вес', keep: 'чтобы держать вес', gain: 'чтобы набрать массу' };
    $('lc-kcal').textContent = saved.res.kcal;
    $('lc-goal').textContent = g[saved.res.goal] || 'чтобы держать вес';
    $('lastcalc').classList.add('show');
  }
})();
