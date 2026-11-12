// Таблица КБЖУ продуктов: поиск по названию и фильтр по группе
(function () {
  var body = document.getElementById('prod-body');
  if (!body || typeof PRODUCTS === 'undefined') return;
  var search = document.getElementById('prod-search');
  var group = document.getElementById('prod-group');
  var count = document.getElementById('prod-count');
  var empty = document.getElementById('prod-empty');

  function norm(s) { return String(s).toLowerCase().replace(/ё/g, 'е'); }
  function fmt(x) { return Number(x).toFixed(1).replace('.', ','); }

  // список групп берём из самих данных
  var groups = [];
  PRODUCTS.forEach(function (p) { if (groups.indexOf(p.group) < 0) groups.push(p.group); });
  groups.forEach(function (g) {
    var o = document.createElement('option');
    o.value = g; o.textContent = g;
    group.appendChild(o);
  });

  function render() {
    var q = norm(search.value.trim());
    var g = group.value;
    var rows = PRODUCTS.filter(function (p) {
      return (!g || p.group === g) && (!q || norm(p.name).indexOf(q) >= 0);
    });
    body.innerHTML = rows.map(function (p) {
      return '<tr><td>' + p.name + '<br><span class="kc">' + p.group + '</span></td>' +
        '<td class="num">' + p.kcal + '</td><td class="num">' + fmt(p.p) + '</td>' +
        '<td class="num">' + fmt(p.f) + '</td><td class="num">' + fmt(p.c) + '</td></tr>';
    }).join('');
    count.textContent = 'Показано ' + rows.length + ' из ' + PRODUCTS.length;
    empty.classList.toggle('show', rows.length === 0);
  }

  search.addEventListener('input', render);
  group.addEventListener('change', render);
  render();
})();
