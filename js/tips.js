// Стикеры с советами: отметка «уже пробую» и случайный совет
(function () {
  var box = document.getElementById('tips');
  if (!box || typeof TIPS === 'undefined') return;
  var esc = Profit.esc;
  var done = Profit.get('profit-tips', []);
  if (!Array.isArray(done)) done = [];
  var progress = document.getElementById('tip-progress');
  var reset = document.getElementById('tip-reset');

  box.innerHTML = TIPS.map(function (t, i) {
    var on = done.indexOf(i) >= 0;
    return '<article class="tip' + (on ? ' done' : '') + '" id="tip-' + (i + 1) + '" tabindex="-1"><h3>' + esc(t.title) + '</h3><p>' + esc(t.text) + '</p>' +
      '<label class="tried"><input type="checkbox" data-i="' + i + '"' + (on ? ' checked' : '') + '> уже пробую</label></article>';
  }).join('');

  function paint() {
    progress.textContent = 'Пробуешь ' + done.length + ' из ' + TIPS.length;
    reset.hidden = done.length === 0;
  }
  box.addEventListener('change', function (e) {
    var i = +e.target.getAttribute('data-i');
    if (isNaN(i)) return;
    var pos = done.indexOf(i);
    if (e.target.checked && pos < 0) done.push(i);
    if (!e.target.checked && pos >= 0) done.splice(pos, 1);
    e.target.closest('.tip').classList.toggle('done', e.target.checked);
    Profit.set('profit-tips', done);
    paint();
  });
  reset.addEventListener('click', function () {
    done = [];
    Profit.del('profit-tips');
    var cb = box.querySelectorAll('input');
    for (var i = 0; i < cb.length; i++) { cb[i].checked = false; cb[i].closest('.tip').classList.remove('done'); }
    paint();
  });
  var lastRand = -1;
  document.getElementById('tip-random').addEventListener('click', function () {
    // сначала из тех, что ещё не пробуешь
    var pool = [];
    for (var i = 0; i < TIPS.length; i++) if (done.indexOf(i) < 0 && i !== lastRand) pool.push(i);
    if (!pool.length) for (var j = 0; j < TIPS.length; j++) if (j !== lastRand) pool.push(j);
    var n = pool[Math.floor(Math.random() * pool.length)];
    lastRand = n;
    var el = document.getElementById('tip-' + (n + 1));
    el.scrollIntoView({ behavior: Profit.reduced ? 'auto' : 'smooth', block: 'center' });
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    el.focus({ preventScroll: true });
  });
  paint();
})();
