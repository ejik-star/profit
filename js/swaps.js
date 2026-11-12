// Таблица замен: поиск и фильтр "только бюджетные"
(function () {
  var body = document.getElementById('swaps-body');
  if (!body || typeof SWAPS === 'undefined') return;
  var search = document.getElementById('swap-search');
  var onlyBudget = document.getElementById('only-budget');
  var count = document.getElementById('swap-count');
  var empty = document.getElementById('swap-empty');

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function norm(s) { return String(s).toLowerCase().replace(/ё/g, 'е'); }

  function render() {
    var q = norm(search.value.trim());
    var rows = SWAPS.filter(function (s) {
      if (onlyBudget.checked && !s.budget) return false;
      if (!q) return true;
      return norm(s.from + ' ' + s.to + ' ' + s.why).indexOf(q) >= 0;
    });
    body.innerHTML = rows.map(function (s) {
      return '<tr' + (s.budget ? ' class="budget"' : '') + '>' +
        '<td data-label="Вместо"><span class="was">' + esc(s.from) + '</span> <span class="kc">' + s.fromKcal + ' ккал</span></td>' +
        '<td data-label="Попробуй">' + esc(s.to) + ' <span class="kc">' + s.toKcal + ' ккал</span></td>' +
        '<td data-label="Почему">' + esc(s.why) + '</td>' +
        '<td data-label="Бюджетно"' + (s.budget ? '' : ' class="nobud"') + '>' + (s.budget ? '<span class="rub" title="обычно не дороже исходного продукта">₽</span> <span class="kc">не дороже</span>' : '<span class="kc">нет</span>') + '</td>' +
        '</tr>';
    }).join('');
    count.textContent = 'Показано ' + rows.length + ' из ' + SWAPS.length;
    empty.classList.toggle('show', rows.length === 0);
  }

  search.addEventListener('input', render);
  onlyBudget.addEventListener('change', render);
  render();
})();
