// Живой пример замены на главной в виде чека
(function () {
  if (typeof SWAPS === 'undefined' || !document.getElementById('receipt')) return;
  var i = 0;
  function show() {
    var s = SWAPS[i];
    var d = s.toKcal - s.fromKcal;
    document.getElementById('rc-from').textContent = s.from;
    document.getElementById('rc-from-k').textContent = s.fromKcal + ' ккал';
    document.getElementById('rc-to').textContent = s.to;
    document.getElementById('rc-to-k').textContent = s.toKcal + ' ккал';
    document.getElementById('rc-diff').textContent = (d > 0 ? '+' : '−') + Math.abs(d) + ' ккал';
    document.getElementById('rc-bud').textContent = s.budget ? 'да ₽' : 'не всегда';
    document.getElementById('rc-why').textContent = 'Почему: ' + s.why + '.';
    document.getElementById('rc-num').textContent = (i + 1) + ' из ' + SWAPS.length;
  }
  document.getElementById('rc-next').addEventListener('click', function () {
    i = (i + 1) % SWAPS.length;
    show();
  });
  show();
})();
