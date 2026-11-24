// Автотесты сайта PROfit: тест-кейсы этапа 5 (ТК-01...ТК-15), новые функции версии 2 и проверка вёрстки.
// Запуск: npm install, потом node site_test.js
// Нужен установленный Google Chrome или Chromium (путь можно задать в CHROME_PATH).
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const url = (p) => 'file://' + path.join(ROOT, p);
const SHOTS = process.env.SHOTS || '';
const CHROME = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));

const results = [];
function check(id, name, ok, info) {
  results.push({ id, name, ok: !!ok, info: info || '' });
  console.log((ok ? 'OK   ' : 'FAIL ') + id + ' ' + name + (info ? ' (' + info + ')' : ''));
}

// ручной расчёт по Миффлину-Сан Жеору, чтобы сверить с сайтом
function manual(sex, age, h, w, act, goal) {
  const bmr = 10 * w + 6.25 * h - 5 * age + (sex === 'm' ? 5 : -161);
  const k = { lose: 0.85, keep: 1, gain: 1.1 }[goal];
  const sp = { lose: [0.3, 0.3, 0.4], keep: [0.25, 0.3, 0.45], gain: [0.25, 0.25, 0.5] }[goal];
  const kcal = bmr * act * k;
  return [Math.round(kcal), Math.round(kcal * sp[0] / 4), Math.round(kcal * sp[1] / 9), Math.round(kcal * sp[2] / 4)];
}

async function fill(page, d) {
  await page.click('input[name="sex"][value="' + d.sex + '"] + span');
  await page.fill('#age', d.age);
  await page.fill('#height', d.height);
  await page.fill('#weight', d.weight);
  await page.selectOption('#activity', d.activity);
  await page.click('.goal label:has(input[value="' + d.goal + '"])');
  await page.click('#calc-form button[type=submit]');
}
async function goal(page, g) { await page.click('.goal label:has(input[value="' + g + '"])'); }
async function readResult(page) {
  return page.evaluate(() => ['r-kcal', 'r-p', 'r-f', 'r-c'].map((id) => +document.getElementById(id).textContent));
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(page.url() + ': ' + m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(page.url() + ': ' + e.message));
  const outside = [];
  ctx.on('request', (r) => { if (!/^(file:|data:)/.test(r.url())) outside.push(r.url()); });

  // ТК-01
  await page.goto(url('index.html'));
  const h1 = await page.textContent('h1');
  const heroBtn = await page.locator('.hero a.btn', { hasText: 'Посчитать КБЖУ' }).boundingBox();
  check('ТК-01', 'Открыть главную', h1.includes('Питаться') && heroBtn && heroBtn.y + heroBtn.height <= 800 &&
    await page.isVisible('.header .btn-head'), 'кнопка на первом экране, y=' + (heroBtn && Math.round(heroBtn.y)));

  // ТК-02
  await page.click('.hero a.btn:has-text("Посчитать КБЖУ")');
  check('ТК-02', 'Переход в калькулятор с главной', page.url().endsWith('calculator.html'));

  // ТК-03
  await fill(page, { sex: 'f', age: '19', height: '165', weight: '58', activity: '1.375', goal: 'keep' });
  let r = await readResult(page);
  check('ТК-03', 'Расчёт нормы', r.join() === '1863,116,62,210', r.join('/'));

  // ТК-04
  await goal(page, 'lose');
  await page.click('#calc-form button[type=submit]');
  r = await readResult(page);
  check('ТК-04', 'Расчёт для другой цели', r[0] === 1584, r.join('/'));

  // ТК-05
  await page.fill('#weight', '62,5');
  await page.click('#calc-form button[type=submit]');
  r = await readResult(page);
  const m5 = manual('f', 19, 165, 62.5, 1.375, 'lose');
  check('ТК-05', 'Вес с запятой', await page.isVisible('#result') && r.join() === m5.join() &&
    (await page.textContent('#weight-err')) === '', r.join('/'));

  // ТК-06
  await page.fill('#weight', '');
  await page.click('#calc-form button[type=submit]');
  const err6 = await page.textContent('#weight-err');
  const bad6 = await page.getAttribute('#weight', 'class');
  check('ТК-06', 'Пустое поле', !(await page.isVisible('#result')) && /bad/.test(bad6) && err6.includes('Впиши вес числом'), err6);

  // ТК-07
  await page.fill('#weight', '58');
  await page.fill('#age', '200');
  await page.click('#calc-form button[type=submit]');
  const err7 = await page.textContent('#age-err');
  check('ТК-07', 'Значение вне диапазона', err7.includes('Проверь возраст: нужно от 16 до 80') &&
    (await page.textContent('#weight-err')) === '', err7);

  // ТК-08
  await page.fill('#age', '19');
  await page.click('#calc-form button[type=submit]');
  await page.click('#result a:has-text("Чем заменить вредное")');
  check('ТК-08', 'Переход к заменам после расчёта', page.url().endsWith('swaps.html'));

  // ТК-09
  await page.fill('#swap-search', 'чипсы');
  const rows9 = await page.$$eval('#swaps-body tr', (t) => t.map((x) => x.innerText));
  check('ТК-09', 'Поиск замены', rows9.length === 1 && rows9[0].includes('Попкорн') && /\d+ ккал[\s\S]*\d+ ккал/.test(rows9[0]), rows9[0] && rows9[0].replace(/\s+/g, ' '));

  // ТК-10
  await page.fill('#swap-search', '');
  const all10 = await page.$$eval('#swaps-body tr', (t) => t.length);
  await page.check('#only-budget');
  const bud10 = await page.$$eval('#swaps-body tr', (t) => t.length);
  const rubAll = await page.$$eval('#swaps-body tr', (t) => t.every((x) => x.querySelector('.rub')));
  const legend = await page.textContent('.page-head .lead');
  check('ТК-10', 'Бюджетные замены', all10 === 27 && bud10 === 21 && rubAll && legend.includes('Значком'), 'всего ' + all10 + ', бюджетных ' + bud10);
  await page.fill('#swap-search', 'абракадабра');
  const empty = await page.isVisible('#swap-empty');
  check('доп', 'Пустой поиск показывает подсказку', empty);
  await page.fill('#swap-search', 'Сёмга');
  const yo = await page.$$eval('#swaps-body tr', (t) => t.length);
  await page.fill('#swap-search', 'семга');
  const ye = await page.$$eval('#swaps-body tr', (t) => t.length);
  check('доп', 'Поиск не различает е и ё', yo === ye && yo > 0, yo + '=' + ye);

  // ТК-11
  await page.click('#nav a:has-text("Советы")');
  const tips = await page.$$eval('.tip', (t) => t.length);
  check('ТК-11', 'Переход к советам', page.url().endsWith('tips.html') && tips === 13, tips + ' карточек');

  // ТК-12
  await page.click('main a.btn:has-text("Посчитать КБЖУ")');
  check('ТК-12', 'Возврат в калькулятор', page.url().endsWith('calculator.html'));

  // ТК-13
  await page.click('#nav a:has-text("О команде")');
  const people = await page.$$eval('.person', (t) => t.map((x) => x.innerText));
  const contact = await page.textContent('.box');
  check('ТК-13', 'Страница о команде', people.length === 3 && people.every((p) => p.length > 30) && contact.includes('Напишите нам'),
    'контакт пока плашка, вписывает команда');

  // ТК-14: все внутренние ссылки со всех страниц
  const pages = ['index.html', 'calculator.html', 'swaps.html', 'tips.html', 'products.html', 'about.html', '404.html'];
  const broken = [];
  let linkCount = 0;
  for (const p of pages) {
    await page.goto(url(p));
    const links = await page.$$eval('a[href], link[href], script[src], img[src]', (els) => els.map((e) => e.getAttribute('href') || e.getAttribute('src')));
    for (const l of links) {
      if (/^(https?:|mailto:|#)/.test(l)) continue;
      linkCount++;
      if (!fs.existsSync(path.join(ROOT, l.split('#')[0]))) broken.push(p + ' -> ' + l);
    }
  }
  check('ТК-14', 'Битые ссылки', broken.length === 0, linkCount + ' ссылок проверено' + (broken.length ? ', битые: ' + broken.join(', ') : ''));

  // ТК-15: полный сценарий кликами, считаем клики
  await page.goto(url('index.html'));
  let clicks = 0;
  const t0 = Date.now();
  await page.click('.hero a.btn:has-text("Посчитать КБЖУ")'); clicks++;
  await fill(page, { sex: 'm', age: '20', height: '180', weight: '75', activity: '1.55', goal: 'keep' }); clicks += 2;
  r = await readResult(page);
  await page.click('#result a:has-text("Чем заменить вредное")'); clicks++;
  const okSwap = (await page.$$eval('#swaps-body tr', (t) => t.length)) === 27;
  await page.click('#nav a:has-text("Советы")'); clicks++;
  const okTip = (await page.$$eval('.tip', (t) => t.length)) === 13;
  const m15 = manual('m', 20, 180, 75, 1.55, 'keep');
  check('ТК-15', 'Полный сценарий', r.join() === m15.join() && okSwap && okTip,
    'около ' + clicks + ' кликов (без ввода текста), ' + (Date.now() - t0) + ' мс автотеста');

  // сверка калькулятора с ручным расчётом ещё на нескольких примерах
  const examples = [
    ['m', '25', '182', '80', '1.725', 'gain'],
    ['f', '45', '160', '70,4', '1.2', 'lose'],
    ['m', '16', '170', '55', '1.9', 'keep'],
    ['f', '80', '150', '45', '1.55', 'gain']
  ];
  await page.goto(url('calculator.html'));
  for (const e of examples) {
    await fill(page, { sex: e[0], age: e[1], height: e[2], weight: e[3], activity: e[4], goal: e[5] });
    const got = await readResult(page);
    const exp = manual(e[0], +e[1], +e[2], +e[3].replace(',', '.'), +e[4], e[5]);
    check('расчёт', e.join(' '), got.join() === exp.join(), 'сайт ' + got.join('/') + ', вручную ' + exp.join('/'));
  }

  // валидация: буквы, границы, дробный возраст
  const bad = [['#height', 'сто', 'height-err', 'без букв'], ['#height', '119', 'height-err', 'от 120 до 230'],
    ['#weight', '251', 'weight-err', 'от 35 до 250'], ['#age', '15', 'age-err', 'от 16 до 80'], ['#age', '19.5', 'age-err', 'целым']];
  for (const b of bad) {
    await fill(page, { sex: 'f', age: '19', height: '165', weight: '58', activity: '1.375', goal: 'keep' });
    await page.fill(b[0], b[1]);
    await page.click('#calc-form button[type=submit]');
    const t = await page.textContent('#' + b[2]);
    check('ввод', b[0] + ' = ' + b[1], t.includes(b[3]) && !(await page.isVisible('#result')), t);
  }
  // граничные значения проходят
  await fill(page, { sex: 'f', age: '16', height: '120', weight: '35', activity: '1.2', goal: 'keep' });
  check('ввод', 'нижние границы 16/120/35 принимаются', await page.isVisible('#result'));
  await fill(page, { sex: 'm', age: '80', height: '230', weight: '250', activity: '1.9', goal: 'keep' });
  check('ввод', 'верхние границы 80/230/250 принимаются', await page.isVisible('#result'));

  // таблица продуктов
  await page.goto(url('products.html'));
  const pAll = await page.$$eval('#prod-body tr', (t) => t.length);
  await page.fill('#prod-search', 'гречка');
  const pG = await page.$$eval('#prod-body tr', (t) => t.length);
  await page.fill('#prod-search', '');
  await page.click('#prod-groups label:has-text("Рыба")');
  const pR = await page.$$eval('#prod-body tr', (t) => t.length);
  check('доп', 'Таблица продуктов: 93, поиск и группа', pAll === 93 && pG >= 1 && pR === 6, pAll + ', гречка ' + pG + ', рыба ' + pR);


  // ---------- версия 2: новые функции ----------
  // калькулятор: разбивка, ИМТ, автопересчёт, запоминание
  await page.goto(url('calculator.html'));
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  check('v2', 'без сохранённых данных результат скрыт, поля пустые', !(await page.isVisible('#result')) && (await page.inputValue('#age')) === '');
  await fill(page, { sex: 'f', age: '19', height: '165', weight: '58', activity: '1.375', goal: 'keep' });
  const bd = await page.evaluate(() => ['r-bmr', 'r-tdee', 'r-adj', 'r-total', 'r-bmi', 'r-bmi-cat', 'r-pkg'].map((id) => document.getElementById(id).textContent));
  check('v2', 'разбивка расчёта: обмен в покое, активность, цель, итог', bd[0] === '1355 ккал' && bd[1] === '1863 ккал' && bd[2] === '0' && bd[3] === '1863 ккал', bd.slice(0, 4).join(' / '));
  check('v2', 'ИМТ 58 кг / 165 см = 21,3, в норме', bd[4] === '21,3' && bd[5].includes('в норме'), bd[4] + ' ' + bd[5]);
  check('v2', 'белок в граммах на кг веса', bd[6] === '2,0 г/кг', bd[6]);
  await goal(page, 'gain');
  r = await readResult(page);
  const mg = manual('f', 19, 165, 58, 1.375, 'gain');
  const adj = await page.textContent('#r-adj');
  check('v2', 'смена цели пересчитывает сразу, без кнопки', r.join() === mg.join() && adj === '+187 ккал', r.join('/') + ', поправка ' + adj);
  await page.reload();
  r = await readResult(page);
  check('v2', 'данные запоминаются: после перезагрузки форма и результат на месте',
    (await page.inputValue('#weight')) === '58' && (await page.isVisible('#result')) && r.join() === mg.join() &&
    await page.isChecked('input[name=goal][value=gain]'), r.join('/'));
  await page.click('#r-copy');
  await page.waitForSelector('#toast.show');
  check('v2', 'кнопка «Скопировать» срабатывает', /скопирован/i.test(await page.textContent('#toast')), await page.textContent('#toast'));
  await page.goto(url('index.html'));
  check('v2', 'на главной видна последняя норма', (await page.isVisible('#lastcalc')) && (await page.textContent('#lc-kcal')) === String(mg[0]), await page.textContent('#lc-kcal'));
  await page.goto(url('calculator.html'));
  await page.click('#r-forget');
  await page.reload();
  check('v2', '«Забыть мои данные» стирает всё', !(await page.isVisible('#result')) && (await page.inputValue('#age')) === '' &&
    (await page.evaluate(() => localStorage.getItem('profit-calc'))) === null);
  await page.uncheck('#remember');
  await fill(page, { sex: 'm', age: '30', height: '175', weight: '70', activity: '1.2', goal: 'keep' });
  check('v2', 'без галочки «Запомнить» ничего не сохраняется', (await page.evaluate(() => localStorage.getItem('profit-calc'))) === null && await page.isVisible('#result'));
  await page.check('#remember');
  await fill(page, { sex: 'f', age: '19', height: '165', weight: '58', activity: '1.375', goal: 'keep' });

  // замены: группы, сортировка, ссылка с поиском, сброс
  await page.goto(url('swaps.html'));
  await page.click('#swap-cats label:has-text("Напитки")');
  const drinks = await page.$$eval('#swaps-body tr', (t) => t.map((x) => x.innerText));
  check('v2', 'замены: фильтр по группе «Напитки»', drinks.length === 2 && drinks.every((x) => /Кола|Энергетик/.test(x)), drinks.length + ' строки');
  await page.click('#swap-cats label:has-text("Все")');
  await page.selectOption('#swap-sort', 'save');
  const diffs = await page.$$eval('#swaps-body .diff', (t) => t.map((x) => +x.textContent.replace('−', '-').replace(/[^\d-]/g, '')));
  check('v2', 'замены: сортировка по экономии калорий', diffs.length === 27 && diffs.every((d, i) => i === 0 || diffs[i - 1] <= d), 'первая ' + diffs[0] + ', последняя ' + diffs[diffs.length - 1]);
  const bjuShown = await page.$$eval('#swaps-body tr:first-child .bju', (t) => t.length);
  check('v2', 'у замен показаны Б/Ж/У из справочника', bjuShown === 2);
  await page.fill('#swap-search', 'абракадабра');
  await page.click('#swap-reset');
  check('v2', 'кнопка «сбрось фильтры» возвращает все 27', (await page.$$eval('#swaps-body tr', (t) => t.length)) === 27 && (await page.inputValue('#swap-search')) === '');
  await page.goto(url('swaps.html') + '#' + encodeURIComponent('майонез'));
  const hashRows = await page.$$eval('#swaps-body tr', (t) => t.length);
  check('v2', 'ссылка swaps.html#майонез сразу ищет', hashRows === 1, hashRows + '');

  // справочник: сортировка и тарелка дня
  await page.goto(url('products.html'));
  await page.click('th[data-key="kcal"] button');
  const top = await page.$$eval('#prod-body tr td.num:nth-child(2)', (t) => t.map((x) => +x.textContent));
  const sortOk = top.every((v, i) => i === 0 || top[i - 1] >= v);
  const ariaSort = await page.getAttribute('th[data-key="kcal"]', 'aria-sort');
  check('v2', 'справочник: сортировка по калориям по убыванию', sortOk && ariaSort === 'descending', 'первая ' + top[0]);
  await page.click('th[data-key="name"] button');
  const firstName = await page.textContent('#prod-body tr:first-child td:first-child');
  check('v2', 'справочник: сортировка по алфавиту', /^Апельсин/.test(firstName), firstName.slice(0, 20));
  await page.click('th[data-key="name"] button');
  await page.click('th[data-key="name"] button');
  await page.fill('#prod-search', 'гречка');
  await page.click('#prod-body tr:first-child .add-btn');
  await page.fill('#prod-search', 'яйцо');
  await page.click('#prod-body tr:first-child .add-btn');
  await page.fill('#plate-list li:nth-child(2) input', '120');
  const pl = await page.evaluate(() => ['pl-kcal', 'pl-p', 'pl-f', 'pl-c'].map((id) => document.getElementById(id).textContent));
  // гречка 100 г: 346/11,7/2,7/75,0; яйцо 120 г: 143/12,6/9,5/0,7 на 100 г
  const ek = Math.round(346 + 143 * 1.2), ep = (11.7 + 12.6 * 1.2).toFixed(1).replace('.', ',');
  check('v2', 'тарелка дня складывает КБЖУ с учётом граммов', pl[0] === String(ek) && pl[1] === ep + ' г', pl.join(' / ') + ', ждали ' + ek + ' и ' + ep);
  const normTxt = await page.textContent('#pl-norm');
  check('v2', 'тарелка показывает долю от сохранённой нормы', normTxt.includes('от твоей нормы 1863 ккал'), normTxt.slice(0, 40));
  await page.reload();
  const plN = await page.$$eval('#plate-list li', (t) => t.length);
  check('v2', 'тарелка сохраняется после перезагрузки', plN === 2 && (await page.textContent('#pl-kcal')) === String(ek));
  await page.click('#pl-clear');
  check('v2', 'тарелку можно очистить', (await page.$$eval('#plate-list li', (t) => t.length)) === 0 && (await page.textContent('#pl-kcal')) === '0');

  // советы: отметки и случайный совет
  await page.goto(url('tips.html'));
  await page.click('#tip-2 .tried');
  await page.reload();
  check('v2', 'советы: отметка «уже пробую» сохраняется', (await page.isChecked('#tip-2 input')) && (await page.textContent('#tip-progress')).includes('1 из 13'), await page.textContent('#tip-progress'));
  await page.click('#tip-random');
  check('v2', 'кнопка «случайный совет» подсвечивает стикер', (await page.$$eval('.tip.flash', (t) => t.length)) === 1);
  await page.click('#tip-reset');
  check('v2', 'отметки можно снять', (await page.textContent('#tip-progress')).includes('0 из 13'));

  // тема
  await page.click('.theme-btn');
  const dark1 = await page.getAttribute('html', 'data-theme');
  await page.goto(url('swaps.html'));
  const dark2 = await page.getAttribute('html', 'data-theme');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.click('.theme-btn');
  check('v2', 'ночная тема включается и запоминается', dark1 === 'dark' && dark2 === 'dark' && bg === 'rgb(21, 24, 20)' && !(await page.getAttribute('html', 'data-theme')), [dark1, dark2, bg].join(' '));

  // чек на главной листается вперёд и назад
  await page.goto(url('index.html'));
  const n0 = await page.textContent('#rc-num');
  await page.click('#rc-next');
  await page.waitForTimeout(250);
  const n1 = await page.textContent('#rc-num');
  await page.click('#rc-prev');
  await page.waitForTimeout(250);
  const n2 = await page.textContent('#rc-num');
  check('v2', 'чек замены на главной листается кнопками', n0 === '1 из 27' && n1 === '2 из 27' && n2 === '1 из 27', [n0, n1, n2].join(' → '));
  const facts = await page.$$eval('[data-count]', (t) => t.map((x) => x.textContent).join(','));
  check('v2', 'цифры на главной совпадают с данными', facts === '93,27,21,13', facts);

  // «стереть всё» на странице о команде
  await page.goto(url('about.html'));
  await page.click('#wipe-all');
  const left = await page.evaluate(() => ['profit-calc', 'profit-plate', 'profit-tips', 'profit-theme'].filter((k) => localStorage.getItem(k) !== null));
  check('v2', '«Стереть всё» убирает все данные сайта из браузера', left.length === 0, left.join(','));

  // доступность и мета-теги на всех страницах
  const a11y = [];
  for (const p of pages) {
    await page.goto(url(p));
    const info = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      h1: document.querySelectorAll('h1').length,
      noAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
      unlabeled: [...document.querySelectorAll('input, select, textarea')].filter((e) => !(e.labels && e.labels.length) && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby')).length,
      og: !!document.querySelector('meta[property="og:image"]') && !!document.querySelector('meta[name="description"]') && !!document.querySelector('link[rel="canonical"]'),
      title: document.title.length > 5
    }));
    if (info.lang !== 'ru' || info.h1 !== 1 || info.noAlt || info.unlabeled || !info.og || !info.title) a11y.push(p + ' ' + JSON.stringify(info));
  }
  check('доступн.', 'lang, один h1, alt у картинок, подписи у полей, мета-теги OG', a11y.length === 0, a11y.join(' | '));
  await page.goto(url('calculator.html'));
  await page.keyboard.press('Tab');
  const firstFocus = await page.evaluate(() => document.activeElement.className + ' ' + getComputedStyle(document.activeElement).outlineStyle);
  check('доступн.', 'первый Tab попадает на ссылку «К содержимому», фокус видно', /skip/.test(firstFocus) && !/none/.test(firstFocus), firstFocus);
  check('доступн.', 'картинка для соцсетей на месте', fs.existsSync(path.join(ROOT, 'img/og.png')));

  // при «уменьшить движение» всё видно сразу
  const calm = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const cp = await calm.newPage();
  await cp.goto(url('index.html'));
  const hidden = await cp.$$eval('.reveal', (t) => t.filter((x) => getComputedStyle(x).opacity !== '1').length);
  check('доступн.', 'prefers-reduced-motion: блоки видны сразу, без анимации', hidden === 0, hidden + ' скрытых');
  await calm.close();

  // вёрстка: нет прокрутки вбок, кнопки не меньше 48 px на телефоне, бургер
  const mobile = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const mp = await mobile.newPage();
  mp.on('pageerror', (e) => consoleErrors.push(mp.url() + ': ' + e.message));
  mp.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(mp.url() + ': ' + m.text()); });
  for (const [ctxName, pg, w] of [['ПК', page, 1280], ['телефон', mp, 360]]) {
    await pg.evaluate(() => localStorage.clear()).catch(() => {});
    const wide = [];
    for (const p of pages) {
      await pg.goto(url(p));
      if (p === 'calculator.html') {
        await fill(pg, { sex: 'f', age: '19', height: '165', weight: '58', activity: '1.375', goal: 'keep' });
      }
      const sw = await pg.evaluate(() => document.documentElement.scrollWidth);
      if (sw > w) wide.push(p + ' ' + sw);
      if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, (ctxName === 'ПК' ? 'pc_' : 'phone_') + p.replace('.html', '') + '.png'), fullPage: true });
    }
    check('вёрстка', 'нет прокрутки вбок на ' + w + ' px', wide.length === 0, wide.join(', '));
  }
  await mp.goto(url('calculator.html'));
  const small = await mp.$$eval('.btn, .field input:not([type=radio]), .field select, .sex label, .goal label, .burger', (els) =>
    els.filter((e) => e.offsetParent && e.getBoundingClientRect().height < 42).map((e) => e.className + ' ' + e.getBoundingClientRect().height));
  check('вёрстка', 'элементы управления на телефоне не ниже 42-48 px', small.length === 0, small.join(', '));
  const fontSize = await mp.$eval('#age', (e) => getComputedStyle(e).fontSize);
  check('вёрстка', 'шрифт в полях не меньше 16 px (iPhone не зумит)', parseFloat(fontSize) >= 16, fontSize);
  await mp.goto(url('index.html'));
  const navHidden = !(await mp.isVisible('#nav'));
  await mp.click('.burger');
  const navOpen = await mp.isVisible('#nav a:has-text("Советы")');
  const headBtn = await mp.isVisible('.header .btn-head');
  if (SHOTS) await mp.screenshot({ path: path.join(SHOTS, 'phone_menu_open.png') });
  await mp.click('#nav a:has-text("Советы")');
  check('вёрстка', 'бургер открывается, пункт меню работает, кнопка КБЖУ видна в шапке', navHidden && navOpen && headBtn && mp.url().endsWith('tips.html'));

  check('консоль', 'нет ошибок в консоли', consoleErrors.length === 0, consoleErrors.join(' | '));
  check('приватность', 'нет запросов на чужие сайты (счётчиков, шрифтов, CDN)', outside.length === 0, outside.slice(0, 3).join(', '));

  await browser.close();
  const ok = results.filter((x) => x.ok).length;
  const tk = results.filter((x) => x.id.startsWith('ТК'));
  const summary = 'Тест-кейсы этапа 5: ' + tk.filter((x) => x.ok).length + '/' + tk.length + '. Всего проверок: ' + ok + '/' + results.length;
  console.log('\n' + summary);
  const lines = results.map((x) => (x.ok ? 'OK   ' : 'FAIL ') + x.id + ' ' + x.name + (x.info ? ' (' + x.info + ')' : ''));
  fs.writeFileSync(path.join(__dirname, 'site_test_result.txt'),
    'Проверка сайта PROfit, ' + new Date().toLocaleString('ru-RU') + ', Chrome без окна\n\n' + lines.join('\n') + '\n\n' + summary + '\n');
  process.exit(ok === results.length ? 0 : 1);
})();
