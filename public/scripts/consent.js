(function() {
  const GA_ID = 'G-841MD302XC';
  const CONSENT_KEY = 'phdefoy_cookie_consent';

  const banner = document.getElementById('cookie-banner');
  const modal = document.getElementById('cookie-settings-modal');
  const analyticsCheckbox = document.getElementById('analytics-checkbox');

  if (!banner) return;

  // Vérifier si localStorage est disponible
  function isLocalStorageAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  const storageAvailable = isLocalStorageAvailable();

  // Afficher/masquer le bandeau
  function showBanner() {
    banner.classList.add('visible');
  }

  function hideBanner() {
    banner.classList.remove('visible');
    banner.style.display = 'none'; // Force la disparition
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

  // Sauvegarder le consentement
  function saveConsent(value) {
    if (storageAvailable) {
      localStorage.setItem(CONSENT_KEY, value);
    }
    // Fallback : utiliser un cookie si localStorage indisponible
    document.cookie = CONSENT_KEY + '=' + value + ';path=/;max-age=31536000;SameSite=Lax';
  }

  // Lire le consentement
  function getConsent() {
    if (storageAvailable) {
      const ls = localStorage.getItem(CONSENT_KEY);
      if (ls) return ls;
    }
    // Fallback : lire depuis cookie
    const match = document.cookie.match(new RegExp('(^| )' + CONSENT_KEY + '=([^;]+)'));
    return match ? match[2] : null;
  }

  // Actions des boutons
  window.acceptAllCookies = function() {
    saveConsent('all');
    hideBanner();
    loadGoogleAnalytics();
  };

  window.rejectAllCookies = function() {
    saveConsent('none');
    hideBanner();
  };

  window.toggleCookieSettings = function() {
    toggleModal();
  };

  window.saveCookieSettings = function() {
    const analyticsAccepted = analyticsCheckbox && analyticsCheckbox.checked;
    if (analyticsAccepted) {
      saveConsent('analytics');
      loadGoogleAnalytics();
    } else {
      saveConsent('none');
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
    const consent = getConsent();
    if (!consent) {
      showBanner();
    } else if (consent === 'all' || consent === 'analytics') {
      loadGoogleAnalytics();
    }
    // Si consent existe (all, analytics, ou none), le bandeau reste caché
  }

  checkConsent();
})();
