// downloads.js — anti-double init + GA4 safe + nom de fichier identique

(function () {
  // ❗ Empêche toute double initialisation si le script est inclus deux fois
  if (window.__downloadsInit) return;
  window.__downloadsInit = true;

  // Déclenche un download en honorant l'attribut "download" (nom de fichier)
  function triggerDownload(href, name) {
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    a.rel = 'noopener';
    a.target = '_self';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

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

        setTimeout(showDownloadLink, 3000); // remets 3000 si tu veux l'attente
      });

      function showDownloadLink() {
        // rendre visible même si hidden
        container.hidden = false;
        container.removeAttribute('hidden');

        const link = document.createElement('a');
        const href = encodeURI(filePath);
        link.href = href;
        link.download = fileName; // utilisé quand on ne bloque pas la nav
        link.textContent = '📁 ' + fileName;

        // Anti-clic droit (basique)
        link.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          alert('Clic droit désactivé sur ce lien.');
        });

        // ---- GA4 + Téléchargement FIABLE (sans double) ----
        link.addEventListener('click', (e) => {
          // Si GA n’est pas chargé (consent refusé/pas prêt), on laisse le navigateur gérer (honore "download")
          if (typeof window.gtag !== 'function') return;

          // Sinon, on traque puis on déclenche le download programmatique (même nom de fichier)
          e.preventDefault();

          let fired = false;
          const go = () => {
            if (fired) return;         // évite double appel
            fired = true;
            triggerDownload(href, fileName);
          };

          // filet de sécurité si event_callback ne revient pas
          const safety = setTimeout(go, 1500);

          const ext = (filePath.split('.').pop() || '').toLowerCase();
          const fileType = ext.match(/^[a-z0-9]+$/) ? ext : 'file';

          try {
            window.gtag('event', 'file_download', {
              file_name: fileName,
              file_path: filePath,
              file_type: fileType,
              transport_type: 'beacon',
              event_callback: () => { clearTimeout(safety); go(); }
            });
          } catch {
            clearTimeout(safety);
            go();
          }
        });
        // ----------------------------------------------------

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

    // Active les trois boutons ESP (URLs slugifiées, noms lisibles)
    setupDownloadButton(
      'btn-a1', 'download-container-a1',
      '/protected/audio/espagnol/dialogues-esp-a1.zip',
      'Dialogues ESP niveau A1.zip'
    );
    setupDownloadButton(
      'btn-a2', 'download-container-a2',
      '/protected/audio/espagnol/dialogues-esp-a2.zip',
      'Dialogues ESP niveau A2.zip'
    );
    setupDownloadButton(
      'btn-b1', 'download-container-b1',
      '/protected/audio/espagnol/dialogues-esp-b1.zip',
      'Dialogues ESP niveau B1.zip'
    );

    // Active les trois boutons RUSSE
    setupDownloadButton(
      'btn-russe-a1', 'download-container-russe-a1',
      '/protected/audio/russe/dialogues-russe-a1.zip',
      'Dialogues RUSSE niveau A1.zip'
    );
    setupDownloadButton(
      'btn-russe-a2', 'download-container-russe-a2',
      '/protected/audio/russe/dialogues-russe-a2.zip',
      'Dialogues RUSSE niveau A2.zip'
    );
    setupDownloadButton(
      'btn-russe-b1', 'download-container-russe-b1',
      '/protected/audio/russe/dialogues-russe-b1.zip',
      'Dialogues RUSSE niveau B1.zip'
    );

    // Télécharger les Misérables Tome 1
    setupDownloadButton(
      'btn-epub-miserables-t1',
      'download-container-epub-miserables-t1',
      '/protected/ebooks/hugo_les_miserables_fantine.epub',
      'Les Misérables – Tome 1.epub'
    );
    setupDownloadButton(
      'btn-pdf-miserables-t1',
      'download-container-pdf-miserables-t1',
      '/protected/ebooks/hugo_les_miserables_fantine.pdf',
      'Les Misérables – Tome 1.pdf'
    );

     // Télécharger Crime et Châtiment
     setupDownloadButton(
      'btn-epub-crime-et-châtiment',
      'download-container-epub-crime-et-châtiment',
      '/protected/ebooks/dostoievski_crime_et_chatiment.epub',
      'Crime et Châtiment.epub'
    );
    setupDownloadButton(
      'btn-pdf-crime-et-châtiment',
      'download-container-pdf-crime-et-châtiment',
      '/protected/ebooks/dostoievski_crime_et_chatiment.pdf',
      'Crime et Châtiment.pdf'
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
