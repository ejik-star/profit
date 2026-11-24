// Справочник КБЖУ: поиск, группы, сортировка по столбцам и тарелка дня
(function () {
  var body = document.getElementById('prod-body');
  if (!body || typeof PRODUCTS === 'undefined') return;
  var $ = function (id) { return document.getElementById(id); };
  var search = $('prod-search'), chips = $('prod-groups'), count = $('prod-count'), empty = $('prod-empty');
  var esc = Profit.esc, norm = Profit.norm, num = Profit.num;
  var byId = {};
  PRODUCTS.forEach(function (p) { byId[p.id] = p; });

  // группы берём из самих данных
  var groups = [];
  PRODUCTS.forEach(function (p) { if (groups.indexOf(p.group) < 0) groups.push(p.group); });
  var html = '<label class="chip"><input type="radio" name="prod-group" value="" checked><span>Все <i>' + PRODUCTS.length + '</i></span></label>';
  groups.forEach(function (g) {
    var n = PRODUCTS.filter(function (p) { return p.group === g; }).length;
    html += '<label class="chip"><input type="radio" name="prod-group" value="' + esc(g) + '"><span>' + esc(g) + ' <i>' + n + '</i></span></label>';
  });
  chips.innerHTML = html;

  var sort = { key: '', dir: 1 };
  var plate = Profit.get('profit-plate', []);
  if (!Array.isArray(plate)) plate = [];
  plate = plate.filter(function (x) { return x && byId[x.id]; });

  function inPlate(id) {
    for (var i = 0; i < plate.length; i++) if (plate[i].id === id) return i;
    return -1;
  }

  function render() {
    var q = norm(search.value.trim());
    var c = chips.querySelector('input:checked');
    var g = c ? c.value : '';
    var rows = PRODUCTS.filter(function (p) {
      return (!g || p.group === g) && (!q || norm(p.name).indexOf(q) >= 0);
    });
    if (sort.key) {
      rows = rows.slice().sort(function (a, b) {
        if (sort.key === 'name') return a.name.localeCompare(b.name, 'ru') * sort.dir;
        return (a[sort.key] - b[sort.key]) * sort.dir;
      });
    }
    body.innerHTML = rows.map(function (p) {
      var added = inPlate(p.id) >= 0;
      return '<tr><td><span title="FDC ID ' + p.id + '">' + esc(p.name) + '</span><br><span class="kc">' + esc(p.group) + '</span></td>' +
        '<td class="num">' + p.kcal + '</td><td class="num">' + num(p.p) + '</td>' +
        '<td class="num">' + num(p.f) + '</td><td class="num">' + num(p.c) + '</td>' +
        '<td><button type="button" class="add-btn' + (added ? ' added' : '') + '" data-id="' + p.id + '" aria-label="Положить в тарелку: ' + esc(p.name) + '">' + (added ? '✓' : '+') + '</button></td></tr>';
    }).join('');
    count.textContent = 'Показано ' + rows.length + ' из ' + PRODUCTS.length;
    empty.classList.toggle('show', rows.length === 0);
  }

  // сортировка по клику на заголовок: по возрастанию, по убыванию, как было
  var ths = document.querySelectorAll('th.sortable');
  for (var i = 0; i < ths.length; i++) {
    ths[i].querySelector('button').addEventListener('click', function () {
      var th = this.parentNode, key = th.getAttribute('data-key');
      if (sort.key !== key) { sort.key = key; sort.dir = key === 'name' ? 1 : -1; }
      else if ((key === 'name' && sort.dir === 1) || (key !== 'name' && sort.dir === -1)) sort.dir = -sort.dir;
      else sort.key = '';
      for (var j = 0; j < ths.length; j++) {
        var on = ths[j].getAttribute('data-key') === sort.key;
        ths[j].setAttribute('aria-sort', on ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none');
      }
      render();
    });
  }

  // ---------- тарелка дня ----------
  function totals() {
    var t = { kcal: 0, p: 0, f: 0, c: 0 };
    plate.forEach(function (x) {
      var p = byId[x.id], k = x.g / 100;
      t.kcal += p.kcal * k; t.p += p.p * k; t.f += p.f * k; t.c += p.c * k;
    });
    return t;
  }

  function renderPlate(keepFocus) {
    var list = $('plate-list');
    if (!keepFocus) {
      list.innerHTML = plate.map(function (x, i) {
        var p = byId[x.id];
        return '<li><span class="pn">' + esc(p.name) + '<small>' + p.kcal + ' ккал на 100 г</small></span>' +
          '<input type="text" inputmode="decimal" value="' + x.g + '" data-i="' + i + '" aria-label="Граммы: ' + esc(p.name) + '">' +
          '<button type="button" data-del="' + i + '" aria-label="Убрать из тарелки: ' + esc(p.name) + '">×</button></li>';
      }).join('');
    }
    $('plate-empty').style.display = plate.length ? 'none' : '';
    var t = totals();
    $('pl-kcal').textContent = Math.round(t.kcal);
    $('pl-p').textContent = num(t.p) + ' г';
    $('pl-f').textContent = num(t.f) + ' г';
    $('pl-c').textContent = num(t.c) + ' г';
    $('fab-kcal').textContent = Math.round(t.kcal);
    $('plate-fab').classList.toggle('show', plate.length > 0);
    var saved = Profit.get('profit-calc', null);
    var bar = $('pl-bar');
    if (saved && saved.res && saved.res.kcal) {
      var n = saved.res, pc = t.kcal / n.kcal * 100;
      bar.querySelector('i').style.width = Math.min(100, pc) + '%';
      bar.classList.toggle('over', pc > 100);
      $('pl-norm').textContent = Math.round(pc) + '% от твоей нормы ' + n.kcal + ' ккал. Белки ' + Math.round(t.p) + ' из ' + n.p + ' г, жиры ' + Math.round(t.f) + ' из ' + n.f + ' г, углеводы ' + Math.round(t.c) + ' из ' + n.c + ' г.';
      bar.style.display = '';
    } else {
      bar.style.display = 'none';
    }
    Profit.set('profit-plate', plate);
  }

  body.addEventListener('click', function (e) {
    var b = e.target.closest('.add-btn');
    if (!b) return;
    var id = b.getAttribute('data-id');
    var i = inPlate(id);
    if (i >= 0) { plate[i].g += 100; Profit.toast('Ещё 100 г: ' + byId[id].name); }
    else { plate.push({ id: id, g: 100 }); Profit.toast('В тарелке: ' + byId[id].name + ', 100 г'); }
    b.classList.add('added'); b.textContent = '✓';
    renderPlate();
  });

  $('plate-list').addEventListener('input', function (e) {
    var i = e.target.getAttribute('data-i');
    if (i === null) return;
    var v = parseFloat(String(e.target.value).replace(',', '.'));
    var ok = !isNaN(v) && v >= 0 && v <= 5000;
    e.target.classList.toggle('bad', !ok);
    e.target.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (ok) { plate[+i].g = Math.round(v * 10) / 10; renderPlate(true); }
  });
  $('plate-list').addEventListener('click', function (e) {
    var d = e.target.getAttribute('data-del');
    if (d === null) return;
    plate.splice(+d, 1);
    renderPlate(); render();
  });
  $('pl-clear').addEventListener('click', function () {
    plate = []; renderPlate(); render();
    Profit.toast('Тарелка пустая');
  });
  $('pl-copy').addEventListener('click', function () {
    if (!plate.length) { Profit.toast('Тарелка пока пустая'); return; }
    var t = totals();
    var lines = plate.map(function (x) { var p = byId[x.id]; return p.name + ', ' + num(x.g, 0) + ' г: ' + Math.round(p.kcal * x.g / 100) + ' ккал'; });
    Profit.copy('Тарелка дня (PROfit):\n' + lines.join('\n') + '\nИтого: ' + Math.round(t.kcal) + ' ккал, Б ' + num(t.p) + ' г, Ж ' + num(t.f) + ' г, У ' + num(t.c) + ' г', 'Тарелка скопирована');
  });
  $('pl-print').addEventListener('click', function () {
    document.body.classList.add('print-plate');
    window.print();
    setTimeout(function () { document.body.classList.remove('print-plate'); }, 500);
  });

  search.addEventListener('input', render);
  chips.addEventListener('change', render);
  $('prod-reset').addEventListener('click', function () {
    search.value = ''; chips.querySelector('input[value=""]').checked = true; render(); search.focus();
  });
  render();
  renderPlate();
})();
