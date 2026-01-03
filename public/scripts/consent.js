(function() {
  const GA_ID = 'G-841MD302XC';
  const CONSENT_KEY = 'phdefoy_cookie_consent';

  const banner = document.getElementById('cookie-banner');
  const modal = document.getElementById('cookie-settings-modal');
  const analyticsCheckbox = document.getElementById('analytics-checkbox');

  if (!banner) return;

  // Afficher/masquer le bandeau
  function showBanner() {
    banner.classList.add('visible');
  }

  function hideBanner() {
    banner.classList.remove('visible');
  }

  // Afficher/masquer le modal
  function toggleModal() {
    if (modal) {
      modal.classList.toggle('visible');
    }
  }

  // Charger Google Analytics
  function loadGoogleAnalytics() {
    if (document.querySelector('script[src*="googletagmanager"]')) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID, { 'anonymize_ip': true });
  }

  // Actions des boutons
  window.acceptAllCookies = function() {
    localStorage.setItem(CONSENT_KEY, 'all');
    hideBanner();
    loadGoogleAnalytics();
  };

  window.rejectAllCookies = function() {
    localStorage.setItem(CONSENT_KEY, 'none');
    hideBanner();
  };

  window.toggleCookieSettings = function() {
    toggleModal();
  };

  window.saveCookieSettings = function() {
    const analyticsAccepted = analyticsCheckbox && analyticsCheckbox.checked;
    if (analyticsAccepted) {
      localStorage.setItem(CONSENT_KEY, 'analytics');
      loadGoogleAnalytics();
    } else {
      localStorage.setItem(CONSENT_KEY, 'none');
    }
    toggleModal();
    hideBanner();
  };

  // Fermer le modal en cliquant à l'extérieur
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        toggleModal();
      }
    });
  }

  // Vérifier le consentement au chargement
  function checkConsent() {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      showBanner();
    } else if (consent === 'all' || consent === 'analytics') {
      loadGoogleAnalytics();
    }
  }

  checkConsent();
})();
