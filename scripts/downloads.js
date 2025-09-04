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

        setTimeout(showDownloadLink, 3000);
      });

      function showDownloadLink() {
        const link = document.createElement('a');
        link.href = filePath;
        link.download = fileName;
        link.textContent = '📁 ' + fileName;

        link.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          alert('Clic droit désactivé sur ce lien.');
        });

        const timerDiv = document.createElement('div');
        timerDiv.className = 'timer-text';

        container.innerHTML = '';
        container.appendChild(document.createTextNode('Téléchargement disponible : '));
        container.appendChild(link);
        container.appendChild(document.createElement('br'));
        container.appendChild(timerDiv);
        container.classList.add('show');

        btn.classList.remove('loading');
        btn.removeAttribute('aria-busy');
        btn.disabled = false;
        btn.textContent = 'Nouveau lien';

        link.setAttribute('tabindex', '-1');
        link.focus({ preventScroll: true });

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

    // Active les trois boutons (laisse tel quel si c’est bien ces IDs)
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

    // Protection basique
    document.addEventListener('keydown', function (e) {
      if (e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J')) ||
          (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
      }
    });
  }

  // ✅ Fonctionne quel que soit le moment de chargement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
