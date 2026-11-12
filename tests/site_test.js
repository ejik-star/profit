// Автотесты сайта PROfit по тест-кейсам этапа 5 (ТК-01...ТК-15) и проверка вёрстки.
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
  await page.selectOption('#goal', d.goal);
  await page.click('#calc-form button[type=submit]');
}
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
  await page.selectOption('#goal', 'lose');
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
  await page.selectOption('#prod-group', 'Рыба');
  const pR = await page.$$eval('#prod-body tr', (t) => t.length);
  check('доп', 'Таблица продуктов: 93, поиск и группа', pAll === 93 && pG >= 1 && pR === 6, pAll + ', гречка ' + pG + ', рыба ' + pR);

  // вёрстка: нет прокрутки вбок, кнопки не меньше 48 px на телефоне, бургер
  const mobile = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const mp = await mobile.newPage();
  mp.on('pageerror', (e) => consoleErrors.push(mp.url() + ': ' + e.message));
  mp.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(mp.url() + ': ' + m.text()); });
  for (const [ctxName, pg, w] of [['ПК', page, 1280], ['телефон', mp, 360]]) {
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
  const small = await mp.$$eval('.btn, .field input:not([type=radio]), .field select, .sex label, .burger', (els) =>
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
