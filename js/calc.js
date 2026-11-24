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
    var h = d.height / 100;
    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      kcal: Math.round(kcal),
      p: Math.round(kcal * s[0] / 4),
      f: Math.round(kcal * s[1] / 9),
      c: Math.round(kcal * s[2] / 4),
      split: s,
      bmi: Math.round(d.weight / (h * h) * 10) / 10
    };
  }

  // классификация ИМТ ВОЗ для взрослых
  function bmiCategory(b) {
    if (b < 18.5) return 'ниже нормы';
    if (b < 25) return 'в норме';
    if (b < 30) return 'выше нормы';
    return 'намного выше нормы';
  }

  function checkField(key, raw) {
    var text = String(raw === undefined ? '' : raw).trim();
    if (text === '') return 'Впиши ' + NAMES[key] + ' числом';
    var v = toNumber(text);
    if (isNaN(v)) {
      if (/[a-zа-яё]/i.test(text)) return 'Впиши ' + NAMES[key] + ' числом, без букв';
      if (/^-/.test(text)) return 'Впиши ' + NAMES[key] + ' без минуса';
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

  return { compute: compute, validate: validate, bmiCategory: bmiCategory, LIMITS: LIMITS, GOAL_K: GOAL_K };
})();

(function () {
  var form = document.getElementById('calc-form');
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var result = $('result');
  var formErr = $('form-err');
  var fields = ['age', 'height', 'weight'];
  var GOAL_TEXT = { lose: 'цель: снизить вес', keep: 'цель: держать вес', gain: 'цель: набрать массу' };
  var GOAL_TIP = {
    lose: 'Обычно советуют худеть не быстрее чем на 0,5-1 кг в неделю. Если вес стоит три-четыре недели подряд, пересчитай норму с новым весом.',
    keep: 'Если вес за месяц заметно поменялся, хотя ты ешь примерно по норме, поправь цифру на 100-200 ккал в нужную сторону.',
    gain: 'Набирать лучше постепенно и вместе с силовыми тренировками, тогда растут мышцы, а не только жир.'
  };
  var last = null;

  // подсветка выбранных кнопок (для браузеров без :has)
  var radios = form.querySelectorAll('input[type="radio"]');
  function paintRadios() {
    for (var i = 0; i < radios.length; i++) radios[i].parentNode.classList.toggle('on', radios[i].checked);
  }
  for (var i = 0; i < radios.length; i++) radios[i].addEventListener('change', paintRadios);

  function setError(k, msg) {
    var input = $(k);
    input.classList.toggle('bad', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    $(k + '-err').textContent = msg ? msg + '.' : '';
  }

  function readForm() {
    return {
      sex: form.querySelector('input[name="sex"]:checked').value,
      age: $('age').value,
      height: $('height').value,
      weight: $('weight').value,
      activity: $('activity').value,
      goal: form.querySelector('input[name="goal"]:checked').value
    };
  }

  function fillForm(d) {
    var sex = form.querySelector('input[name="sex"][value="' + (d.sex === 'm' ? 'm' : 'f') + '"]');
    if (sex) sex.checked = true;
    var goal = form.querySelector('input[name="goal"][value="' + d.goal + '"]');
    if (goal) goal.checked = true;
    if (d.age) $('age').value = d.age;
    if (d.height) $('height').value = d.height;
    if (d.weight) $('weight').value = d.weight;
    if (d.activity) $('activity').value = d.activity;
    paintRadios();
  }

  // ошибка пропадает, как только поле поправили
  fields.forEach(function (k) {
    $(k).addEventListener('input', function () {
      if (this.classList.contains('bad')) setError(k, '');
    });
  });

  // кольцевая диаграмма: доля калорий из белков, жиров и углеводов
  function drawDonut(r) {
    var parts = [[r.split[0], '#2f7a43', 'белки'], [r.split[1], '#f3b61f', 'жиры'], [r.split[2], '#e0482f', 'углеводы']];
    var off = 0, svg = '<circle class="bg" cx="21" cy="21" r="15.9" fill="none" stroke="#eee7d6" stroke-width="7"></circle>', leg = '';
    parts.forEach(function (x) {
      var pc = x[0] * 100;
      svg += '<circle cx="21" cy="21" r="15.9" fill="none" stroke="' + x[1] + '" stroke-width="7" stroke-dasharray="' + pc.toFixed(2) + ' ' + (100 - pc).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '"></circle>';
      off += pc;
      leg += '<div><i style="background:' + x[1] + '"></i>' + x[2] + ' ' + Math.round(pc) + '%</div>';
    });
    $('donut').innerHTML = svg;
    $('legend').innerHTML = leg;
  }

  function sign(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n); }

  function show(d, r, animate) {
    $('r-kcal').textContent = r.kcal;
    $('r-p').textContent = r.p;
    $('r-f').textContent = r.f;
    $('r-c').textContent = r.c;
    $('r-pkg').textContent = Profit.num(r.p / d.weight) + ' г/кг';
    $('r-fkg').textContent = Profit.num(r.f / d.weight) + ' г/кг';
    $('r-ckg').textContent = Profit.num(r.c / d.weight) + ' г/кг';
    $('r-goal').textContent = GOAL_TEXT[d.goal];
    $('r-bmr').textContent = r.bmr + ' ккал';
    $('r-act-name').textContent = 'с активностью ×' + String(d.activity).replace('.', ',');
    $('r-tdee').textContent = r.tdee + ' ккал';
    $('r-adj').textContent = d.goal === 'keep' ? '0' : sign(r.kcal - r.tdee) + ' ккал';
    $('r-total').textContent = r.kcal + ' ккал';
    $('r-bmi').textContent = Profit.num(r.bmi);
    $('r-bmi-cat').textContent = '(' + ProfitCalc.bmiCategory(r.bmi) + ')';
    // шкала от 15 до 40
    var pos = Math.max(0, Math.min(100, (r.bmi - 15) / 25 * 100));
    $('r-bmi-mark').style.left = pos + '%';
    $('r-bmi-note').textContent = d.age < 18
      ? 'Шкала ВОЗ рассчитана на взрослых. До 18 лет ИМТ сравнивают с таблицами по возрасту, так что это только примерная прикидка.'
      : 'ИМТ не видит, где жир, а где мышцы, поэтому у спортсменов он бывает выше нормы и это нормально.';
    $('r-tip').textContent = GOAL_TIP[d.goal];
    drawDonut(r);
    var wasShown = result.classList.contains('show');
    result.classList.add('show');
    if (animate && !Profit.reduced && !wasShown) {
      result.classList.remove('printing');
      void result.offsetWidth;
      result.classList.add('printing');
    }
    last = { d: d, r: r };
  }

  function save(raw, r) {
    if (!$('remember').checked) return;
    Profit.set('profit-calc', { form: raw, res: { kcal: r.kcal, p: r.p, f: r.f, c: r.c, goal: raw.goal }, at: Date.now() });
  }

  function run(opts) {
    var raw = readForm();
    var v = ProfitCalc.validate(raw);
    fields.forEach(function (k) { setError(k, ''); });
    if (v.errors.length) {
      v.errors.forEach(function (x) { setError(x.k, x.msg); });
      formErr.textContent = 'Поправь поля, отмеченные красным.';
      result.classList.remove('show');
      if (opts.focus) $(v.errors[0].k).focus();
      return false;
    }
    formErr.textContent = '';
    var r = ProfitCalc.compute(v.data);
    show(v.data, r, opts.animate);
    save(raw, r);
    return true;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = run({ focus: true, animate: true });
    if (ok && result.scrollIntoView && window.innerWidth < 900) {
      result.scrollIntoView({ behavior: Profit.reduced ? 'auto' : 'smooth', block: 'start' });
    }
  });

  // когда результат уже есть, переключатели пересчитывают его сразу
  form.addEventListener('change', function (e) {
    paintRadios();
    if (e.target.id === 'remember') {
      if (!e.target.checked) { Profit.del('profit-calc'); Profit.toast('Данные больше не запоминаются'); }
      else if (last) save(readForm(), last.r);
      return;
    }
    if (result.classList.contains('show')) run({ focus: false, animate: false });
  });

  $('r-copy').addEventListener('click', function () {
    if (!last) return;
    var d = last.d, r = last.r;
    var text = 'Моя норма по калькулятору PROfit (' + GOAL_TEXT[d.goal] + '):\n' +
      r.kcal + ' ккал в день\n' +
      'белки ' + r.p + ' г, жиры ' + r.f + ' г, углеводы ' + r.c + ' г\n' +
      'обмен в покое ' + r.bmr + ' ккал, с активностью ' + r.tdee + ' ккал, ИМТ ' + Profit.num(r.bmi) + '\n' +
      'Посчитано на ' + location.href.split('#')[0].split('?')[0];
    Profit.copy(text, 'Результат скопирован');
  });
  $('r-print').addEventListener('click', function () {
    document.body.classList.add('print-result');
    window.print();
    setTimeout(function () { document.body.classList.remove('print-result'); }, 500);
  });
  $('r-forget').addEventListener('click', function () {
    Profit.del('profit-calc');
    form.reset();
    paintRadios();
    fields.forEach(function (k) { setError(k, ''); });
    result.classList.remove('show');
    last = null;
    Profit.toast('Данные стёрты с этого устройства');
    $('age').focus();
  });

  // если данные сохранены, сразу показываем последний расчёт
  var saved = Profit.get('profit-calc', null);
  if (saved && saved.form) {
    fillForm(saved.form);
    run({ focus: false, animate: false });
  } else paintRadios();
})();
