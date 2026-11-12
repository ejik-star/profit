// Общие вещи для всех страниц: бургер-меню
(function () {
  var burger = document.querySelector('.burger');
  var nav = document.getElementById('nav');
  if (!burger || !nav) return;

  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // закрываем меню по Esc и при клике мимо
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      nav.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('click', function (e) {
    if (!nav.contains(e.target) && !burger.contains(e.target)) {
      nav.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });
})();
