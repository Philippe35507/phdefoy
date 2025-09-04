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

        setTimeout(showDownloadLink, 3000); // mets 3000ms si tu veux garder le délai
      });

      function showDownloadLink() {
        // s'assurer que le conteneur est visible
        container.hidden = false;
        container.removeAttribute('hidden');

        const link = document.createElement('a');
        link.href = encodeURI(filePath);
        link.download = fileName;
        link.textContent = '📁 ' + fileName;

        // Anti clic droit basique
        link.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          alert('Clic droit désactivé sur ce lien.');
        });

        // ⬇️ Track + téléchargement fiable
        link.addEventListener('click', (e) => {
          const href = link.href;

          // si GA pas prêt, on tente d'attendre un petit peu ; sinon on télécharge quand même
          const sendAndGo = () => {
            if (!window.gtag) {
              // GA pas chargé → on n’empêche pas l’utilisateur
              return window.location.href = href;
            }
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
              // Fallback au cas où event_callback ne se déclenche pas
              setTimeout(go, 800);
            } catch {
              go();
            }
          };

          // Empêche la nav immédiate → on envoie l’event d’abord
          e.preventDefault();

          if (window.gtag) return sendAndGo();

          // Attend jusqu’à 1,2s que GA arrive, puis envoie l’event (sinon on télécharge)
          let waited = 0;
          const iv = setInterval(() => {
            waited += 100;
            if (window.gtag || waited >= 1200) {
              clearInterval(iv);
              sendAndGo();
            }
          }, 100);
        });

        const timerDiv = document.createElement('div');
        timerDiv.className = 'timer-text';

        container.innerHTML = '';
        container.appendChild(document.createTextNode('Téléchargement disponible : '));
        container.appendChild(link);
        container.appendChild(document.createElement('br'));
        container.appendChild(timerDiv);
        container.classList.add('show');

        // Fin de l'état chargement
        btn.classList.remove('loading');
        btn.removeAttribute('aria-busy');
        btn.disabled = false;
        btn.textContent = 'Nouveau lien';

        // Focus lien
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

  // Compatible avec tous les timings de chargement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
