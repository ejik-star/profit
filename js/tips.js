// Карточки советов из data.js
(function () {
  var box = document.getElementById('tips');
  if (!box || typeof TIPS === 'undefined') return;
  box.innerHTML = TIPS.map(function (t) {
    return '<article class="tip"><h3>' + t.title + '</h3><p>' + t.text + '</p></article>';
  }).join('');
})();
