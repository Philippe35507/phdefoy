(function () {
    // Affiche la bannière si aucun choix encore enregistré
    var consent = localStorage.getItem("consent");
    var banner = document.getElementById("cookie-banner");
    if (!banner) return; // au cas où le HTML n'est pas chargé sur certaines pages
    if (!consent) banner.hidden = false;
  
    var btnAccept = document.getElementById("accept-cookies");
    var btnDecline = document.getElementById("decline-cookies");
  
    if (btnAccept) {
      btnAccept.addEventListener("click", function () {
        localStorage.setItem("consent", "granted");
        banner.hidden = true;
        // Recharge pour que ga-init.js puisse charger GA4
        location.reload();
      });
    }
  
    if (btnDecline) {
      btnDecline.addEventListener("click", function () {
        localStorage.setItem("consent", "denied");
        banner.hidden = true;
      });
    }
  })();
  