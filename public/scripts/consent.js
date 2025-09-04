(function () {
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;

  const btnAccept  = document.getElementById('accept-cookies');
  const btnDecline = document.getElementById('decline-cookies');

  const show = () => { banner.hidden = false; banner.removeAttribute('hidden'); };
  const hide = () => { banner.hidden = true;  banner.setAttribute('hidden', ''); };

  // 1er passage : pas de choix → on affiche
  const current = localStorage.getItem('consent');
  if (!current) show();

  // Accepté → stocke + recharge (pour charger GA)
  btnAccept?.addEventListener('click', () => {
    localStorage.setItem('consent', 'granted');
    location.reload();
  });

  // Refusé → stocke + masque (GA ne sera pas chargé)
  btnDecline?.addEventListener('click', () => {
    localStorage.setItem('consent', 'denied');
    hide();
  });
})();
