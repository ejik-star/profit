// Калькулятор КБЖУ по формуле Миффлина-Сан Жеора.
// Ничего не отправляется на сервер, всё считается в браузере.
var ProfitCalc = (function () {
  var LIMITS = { age: [16, 80], height: [120, 230], weight: [35, 250] };
  var NAMES = { age: 'возраст', height: 'рост', weight: 'вес' };
  var UNITS = { age: 'лет', height: 'см', weight: 'кг' };
  var ACTIVITY = [1.2, 1.375, 1.55, 1.725, 1.9];
  var GOAL_K = { lose: 0.85, keep: 1, gain: 1.1 };
  // доли калорий на белки, жиры, углеводы
  var SPLIT = { lose: [0.30, 0.30, 0.40], keep: [0.25, 0.30, 0.45], gain: [0.25, 0.25, 0.50] };

  // "62,5" -> 62.5, всё нечисловое -> NaN
  function toNumber(v) {
    if (v === null || v === undefined) return NaN;
    v = String(v).trim().replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(v)) return NaN;
    return parseFloat(v);
  }

  function compute(d) {
    var bmr = 10 * d.weight + 6.25 * d.height - 5 * d.age + (d.sex === 'm' ? 5 : -161);
    var tdee = bmr * d.activity;
    var kcal = tdee * GOAL_K[d.goal];
    var s = SPLIT[d.goal];
    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      kcal: Math.round(kcal),
      p: Math.round(kcal * s[0] / 4),
      f: Math.round(kcal * s[1] / 9),
      c: Math.round(kcal * s[2] / 4)
    };
  }

  function checkField(key, raw) {
    var text = String(raw === undefined ? '' : raw).trim();
    if (text === '') return 'Впиши ' + NAMES[key] + ' числом';
    var v = toNumber(text);
    if (isNaN(v)) {
      if (/[a-zа-яё]/i.test(text)) return 'Впиши ' + NAMES[key] + ' числом, без букв';
      return 'Впиши ' + NAMES[key] + ' числом';
    }
    if (key === 'age' && v % 1 !== 0) return 'Впиши возраст целым числом';
    if (v < LIMITS[key][0] || v > LIMITS[key][1]) {
      return 'Проверь ' + NAMES[key] + ': нужно от ' + LIMITS[key][0] + ' до ' + LIMITS[key][1] + ' ' + UNITS[key];
    }
    return '';
  }

  function validate(raw) {
    var errors = [];
    var out = {
      sex: raw.sex === 'm' ? 'm' : 'f',
      activity: parseFloat(raw.activity),
      goal: GOAL_K[raw.goal] ? raw.goal : 'keep'
    };
    ['age', 'height', 'weight'].forEach(function (k) {
      var msg = checkField(k, raw[k]);
      if (msg) errors.push({ k: k, msg: msg });
      out[k] = toNumber(raw[k]);
    });
    if (ACTIVITY.indexOf(out.activity) < 0) out.activity = 1.375;
    return { data: out, errors: errors };
  }

  return { compute: compute, validate: validate, LIMITS: LIMITS };
})();

(function () {
  var form = document.getElementById('calc-form');
  if (!form) return;
  var result = document.getElementById('result');
  var formErr = document.getElementById('form-err');
  var fields = ['age', 'height', 'weight'];

  // подсветка выбранного пола (для браузеров без :has)
  var sexInputs = form.querySelectorAll('input[name="sex"]');
  function paintSex() {
    for (var i = 0; i < sexInputs.length; i++) {
      sexInputs[i].parentNode.classList.toggle('on', sexInputs[i].checked);
    }
  }
  for (var i = 0; i < sexInputs.length; i++) sexInputs[i].addEventListener('change', paintSex);
  paintSex();

  function setError(k, msg) {
    var input = document.getElementById(k);
    var box = document.getElementById(k + '-err');
    input.classList.toggle('bad', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    box.textContent = msg ? msg + '.' : '';
  }

  // ошибка пропадает, как только поле поправили
  fields.forEach(function (k) {
    document.getElementById(k).addEventListener('input', function () {
      if (this.classList.contains('bad')) setError(k, '');
    });
  });

  // кольцевая диаграмма: доля калорий из белков, жиров и углеводов
  function drawDonut(r) {
    var parts = [[r.p * 4, '#2f7a43', 'белки'], [r.f * 9, '#f3b61f', 'жиры'], [r.c * 4, '#e0482f', 'углеводы']];
    var sum = parts[0][0] + parts[1][0] + parts[2][0];
    var off = 25, svg = '', leg = '';
    parts.forEach(function (x) {
      var pc = x[0] / sum * 100;
      svg += '<circle cx="21" cy="21" r="15.9" fill="none" stroke="' + x[1] + '" stroke-width="7" stroke-dasharray="' + pc.toFixed(2) + ' ' + (100 - pc).toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '"></circle>';
      off -= pc;
      leg += '<div><i style="background:' + x[1] + '"></i>' + x[2] + ' ' + Math.round(pc) + '%</div>';
    });
    document.getElementById('donut').innerHTML = svg;
    document.getElementById('legend').innerHTML = leg;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var raw = {
      sex: form.querySelector('input[name="sex"]:checked').value,
      age: document.getElementById('age').value,
      height: document.getElementById('height').value,
      weight: document.getElementById('weight').value,
      activity: document.getElementById('activity').value,
      goal: document.getElementById('goal').value
    };
    var v = ProfitCalc.validate(raw);
    fields.forEach(function (k) { setError(k, ''); });

    if (v.errors.length) {
      v.errors.forEach(function (x) { setError(x.k, x.msg); });
      formErr.textContent = 'Поправь поля, отмеченные красным.';
      result.classList.remove('show');
      document.getElementById(v.errors[0].k).focus();
      return;
    }
    formErr.textContent = '';
    var r = ProfitCalc.compute(v.data);
    document.getElementById('r-kcal').textContent = r.kcal;
    document.getElementById('r-p').textContent = r.p;
    document.getElementById('r-f').textContent = r.f;
    document.getElementById('r-c').textContent = r.c;
    document.getElementById('r-bmr').textContent =
      'Обмен в покое около ' + r.bmr + ' ккал, с учётом активности около ' + r.tdee + ' ккал.';
    drawDonut(r);
    result.classList.add('show');
    if (result.scrollIntoView && window.innerWidth < 640) result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
