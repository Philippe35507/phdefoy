// Garde-fou anti double init si le script est inclus deux fois par erreur
if (window.__downloadsInit) { /* déjà initialisé */ }
else { window.__downloadsInit = true; }

(function () {
  function init() {
    function setupDownloadButton(btnId, containerId, filePath, fileName) {
      const btn = document.getElementById(btnId);
      const container = document.getElementById(containerId);
      if (!btn || !container) return;

      let isActive = false;
      let timer = null;

      btn.addEventListener('click', function () {
        if (isActive) return;
        isActive = true;

        btn.disabled = true;
        btn.classList.add('loading');
        btn.setAttribute('aria-busy', 'true');
        btn.textContent = 'Préparation...';

        setTimeout(showDownloadLink, 3000); // remets 3000 si tu veux garder l’attente
      });

      function showDownloadLink() {
        // rendre visible même si hidden
        container.hidden = false;
        container.removeAttribute('hidden');

        const link = document.createElement('a');
        link.href = encodeURI(filePath);
        link.download = fileName;
        link.textContent = '📁 ' + fileName;

        // Anti clic droit (basique)
        link.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          alert('Clic droit désactivé sur ce lien.');
        });

        // ---- TRACK GA4 + TÉLÉCHARGEMENT FIABLE ----
        link.addEventListener('click', (e) => {
          // Si GA n’est pas chargé (consent refusé ou pas prêt) → on laisse le navigateur télécharger
          if (typeof window.gtag !== 'function') return;

          e.preventDefault();
          const href = link.href;
          let navigated = false;
          const go = () => { if (!navigated) { navigated = true; window.location.href = href; } };

          try {
            window.gtag('event', 'file_download', {
              file_name: fileName,
              file_path: filePath,
              file_type: 'zip',
              transport_type: 'beacon',
              event_callback: go
            });
            // filet de sécurité
            setTimeout(go, 800);
          } catch {
            go();
          }
        });
        // -------------------------------------------

        const timerDiv = document.createElement('div');
        timerDiv.className = 'timer-text';

        container.innerHTML = '';
        container.appendChild(document.createTextNode('Téléchargement disponible : '));
        container.appendChild(link);
        container.appendChild(document.createElement('br'));
        container.appendChild(timerDiv);
        container.classList.add('show');

        // Fin état chargement
        btn.classList.remove('loading');
        btn.removeAttribute('aria-busy');
        btn.disabled = false;
        btn.textContent = 'Nouveau lien';

        // Focus lien (sans scroll)
        link.setAttribute('tabindex', '-1');
        try { link.focus({ preventScroll: true }); } catch {}

        // Compte à rebours 5 minutes
        let timeLeft = 300;
        timer = setInterval(() => {
          const minutes = Math.floor(timeLeft / 60);
          const seconds = timeLeft % 60;
          timerDiv.textContent = `Expire dans : ${minutes}:${seconds.toString().padStart(2, '0')}`;
          timeLeft--;
          if (timeLeft < 0) {
            clearInterval(timer);
            hideDownloadLink();
          }
        }, 1000);
      }

      function hideDownloadLink() {
        container.classList.remove('show');
        container.innerHTML = '';
        btn.textContent = 'Télécharger';
        isActive = false;
        if (timer) { clearInterval(timer); timer = null; }
      }
    }

    // Active les trois boutons
    setupDownloadButton(
      'btn-a1', 'download-container-a1',
      '/protected/audio/espagnol/Dialogues%20ESP%20niveau%20A1.zip',
      'Dialogues ESP niveau A1.zip'
    );
    setupDownloadButton(
      'btn-a2', 'download-container-a2',
      '/protected/audio/espagnol/Dialogues%20ESP%20niveau%20A2.zip',
      'Dialogues ESP niveau A2.zip'
    );
    setupDownloadButton(
      'btn-b1', 'download-container-b1',
      '/protected/audio/espagnol/Dialogues%20ESP%20niveau%20B1.zip',
      'Dialogues ESP niveau B1.zip'
    );

    // Protection basique (optionnel)
    document.addEventListener('keydown', function (e) {
      if (e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J')) ||
          (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
      }
    });
  }

  // Compatible avec tous les timings
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
