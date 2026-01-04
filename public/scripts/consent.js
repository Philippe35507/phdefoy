(function() {
  const GA_ID = 'G-841MD302XC';
  const CONSENT_KEY = 'phdefoy_cookie_consent';

  const banner = document.getElementById('cookie-banner');
  const modal = document.getElementById('cookie-settings-modal');
  const analyticsCheckbox = document.getElementById('analytics-checkbox');

  if (!banner) return;

  // Boutons du bandeau
  const btnAccept = banner.querySelector('.btn-accept');
  const btnReject = banner.querySelector('.btn-reject');
  const btnSettings = banner.querySelector('.btn-settings');
  const btnSave = modal ? modal.querySelector('.btn-save') : null;

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
    banner.style.display = 'block';
    banner.classList.add('visible');
  }

  function hideBanner() {
    banner.classList.remove('visible');
    banner.style.display = 'none';
  }

  // Afficher/masquer le modal
  function showModal() {
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('visible');
    }
  }

  function hideModal() {
    if (modal) {
      modal.classList.remove('visible');
      modal.style.display = 'none';
    }
  }

  // Charger Google Analytics
  function loadGoogleAnalytics() {
    if (document.querySelector('script[src*="googletagmanager"]')) return;

    var script = document.createElement('script');
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
    try {
      if (storageAvailable) {
        localStorage.setItem(CONSENT_KEY, value);
      }
    } catch (e) {}
    // Toujours sauvegarder en cookie aussi
    document.cookie = CONSENT_KEY + '=' + value + ';path=/;max-age=31536000;SameSite=Lax';
  }

  // Lire le consentement
  function getConsent() {
    try {
      if (storageAvailable) {
        var ls = localStorage.getItem(CONSENT_KEY);
        if (ls) return ls;
      }
    } catch (e) {}
    // Fallback : lire depuis cookie
    var match = document.cookie.match(new RegExp('(^| )' + CONSENT_KEY + '=([^;]+)'));
    return match ? match[2] : null;
  }

  // Actions
  function acceptAll() {
    saveConsent('all');
    hideBanner();
    loadGoogleAnalytics();
  }

  function rejectAll() {
    saveConsent('none');
    hideBanner();
  }

  function openSettings() {
    showModal();
  }

  function saveSettings() {
    var analyticsAccepted = analyticsCheckbox && analyticsCheckbox.checked;
    if (analyticsAccepted) {
      saveConsent('analytics');
      loadGoogleAnalytics();
    } else {
      saveConsent('none');
    }
    hideModal();
    hideBanner();
  }

  // Attacher les event listeners
  if (btnAccept) {
    btnAccept.addEventListener('click', acceptAll);
  }
  if (btnReject) {
    btnReject.addEventListener('click', rejectAll);
  }
  if (btnSettings) {
    btnSettings.addEventListener('click', openSettings);
  }
  if (btnSave) {
    btnSave.addEventListener('click', saveSettings);
  }

  // Fermer le modal en cliquant à l'extérieur
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        hideModal();
      }
    });
  }

  // Vérifier le consentement au chargement
  function checkConsent() {
    var consent = getConsent();
    if (!consent) {
      showBanner();
    } else if (consent === 'all' || consent === 'analytics') {
      loadGoogleAnalytics();
    }
  }

  checkConsent();
})();
