(function () {
  if (localStorage.getItem('consent') !== 'granted') return;

  // charge gtag.js
  const s = document.createElement('script');
  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-841MD302XC';
  s.async = true;
  document.head.appendChild(s);

  // init GA4
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  gtag('js', new Date());
  gtag('config', 'G-841MD302XC', { anonymize_ip: true });
})();
