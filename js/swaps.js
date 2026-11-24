// Таблица замен: поиск, фильтр «только бюджетные», группы и сортировка
(function () {
  var body = document.getElementById('swaps-body');
  if (!body || typeof SWAPS === 'undefined') return;
  var search = document.getElementById('swap-search');
  var onlyBudget = document.getElementById('only-budget');
  var sortSel = document.getElementById('swap-sort');
  var cats = document.getElementById('swap-cats');
  var count = document.getElementById('swap-count');
  var empty = document.getElementById('swap-empty');
  var esc = Profit.esc, norm = Profit.norm, num = Profit.num;

  // КБЖУ подтягиваем из справочника по названию продукта
  var byName = {};
  if (typeof PRODUCTS !== 'undefined') PRODUCTS.forEach(function (p) { byName[p.name] = p; });
  function group(s) {
    var p = byName[s.from];
    return p ? p.group : 'Другое';
  }
  function bju(name) {
    var p = byName[name];
    return p ? '<span class="bju">Б ' + num(p.p) + ' · Ж ' + num(p.f) + ' · У ' + num(p.c) + '</span>' : '';
  }

  // группы по исходному продукту, в порядке появления
  var groups = [];
  SWAPS.forEach(function (s) { var g = group(s); if (groups.indexOf(g) < 0) groups.push(g); });
  var html = '<label class="chip"><input type="radio" name="swap-cat" value="" checked><span>Все <i>' + SWAPS.length + '</i></span></label>';
  groups.forEach(function (g) {
    var n = SWAPS.filter(function (s) { return group(s) === g; }).length;
    html += '<label class="chip"><input type="radio" name="swap-cat" value="' + esc(g) + '"><span>' + esc(g) + ' <i>' + n + '</i></span></label>';
  });
  cats.innerHTML = html;

  function currentCat() {
    var c = cats.querySelector('input:checked');
    return c ? c.value : '';
  }

  function render() {
    var q = norm(search.value.trim());
    var cat = currentCat();
    var rows = SWAPS.filter(function (s) {
      if (onlyBudget.checked && !s.budget) return false;
      if (cat && group(s) !== cat) return false;
      if (!q) return true;
      return norm(s.from + ' ' + s.to + ' ' + s.why).indexOf(q) >= 0;
    });
    if (sortSel.value === 'save') rows = rows.slice().sort(function (a, b) { return (a.toKcal - a.fromKcal) - (b.toKcal - b.fromKcal); });
    if (sortSel.value === 'az') rows = rows.slice().sort(function (a, b) { return a.from.localeCompare(b.from, 'ru'); });
    body.innerHTML = rows.map(function (s) {
      var d = s.toKcal - s.fromKcal;
      var cls = d < 0 ? 'minus' : d > 0 ? 'plus' : 'zero';
      var dt = (d > 0 ? '+' : d < 0 ? '−' : '') + Math.abs(d) + ' ккал';
      return '<tr' + (s.budget ? ' class="budget"' : '') + '>' +
        '<td data-label="Вместо"><span class="was">' + esc(s.from) + '</span> <span class="kc">' + s.fromKcal + ' ккал</span>' + bju(s.from) + '</td>' +
        '<td data-label="Попробуй"><span class="to-name">' + esc(s.to) + '</span> <span class="kc">' + s.toKcal + ' ккал</span>' + bju(s.to) + '</td>' +
        '<td data-label="Почему">' + esc(s.why) + '</td>' +
        '<td data-label="Разница на 100 г" class="inline"><span class="diff ' + cls + '">' + dt + '</span></td>' +
        '<td data-label="Бюджетно" class="inline' + (s.budget ? '' : ' nobud') + '">' + (s.budget ? '<span class="rub" title="обычно не дороже исходного продукта">₽</span> <span class="kc">не дороже</span>' : '<span class="kc">нет</span>') + '</td>' +
        '</tr>';
    }).join('');
    count.textContent = 'Показано ' + rows.length + ' из ' + SWAPS.length;
    empty.classList.toggle('show', rows.length === 0);
  }

  search.addEventListener('input', render);
  onlyBudget.addEventListener('change', render);
  sortSel.addEventListener('change', render);
  cats.addEventListener('change', render);
  document.getElementById('swap-reset').addEventListener('click', function () {
    search.value = ''; onlyBudget.checked = false; sortSel.value = '';
    cats.querySelector('input[value=""]').checked = true;
    render(); search.focus();
  });
  // ссылка вида swaps.html#чипсы сразу ищет
  function fromHash() {
    if (location.hash.length < 2) return;
    try { search.value = decodeURIComponent(location.hash.slice(1)); } catch (e) { /* кривой адрес */ }
    render();
  }
  window.addEventListener('hashchange', fromHash);
  render();
  fromHash();
})();
