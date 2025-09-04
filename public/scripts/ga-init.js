(function () {
    // Ne rien charger si pas de consentement
    if (localStorage.getItem("consent") !== "granted") return;
  
    // Injecte GA4 en lazy pour limiter l'impact CWV
    function loadGA() {
      // dataLayer + gtag
      window.dataLayer = window.dataLayer || [];
      function gtag(){ window.dataLayer.push(arguments); }
      window.gtag = window.gtag || gtag;
  
      // Charge gtag.js
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=G-841MD302XC";
      document.head.appendChild(s);
  
      // Init GA4
      gtag("js", new Date());
      gtag("config", "G-841MD302XC", { send_page_view: false, anonymize_ip: true });
  
      // Envoie un premier page_view quand GA est prêt (petit délai)
      setTimeout(function(){
        if (window.gtag) {
          window.gtag("event", "page_view", {
            page_location: location.href,
            page_path: location.pathname
          });
        }
      }, 800);
  
      // Ré-émettre un page_view si l’URL change sur un site à nav client (option simple)
      var last = location.pathname + location.search;
      var obs = new MutationObserver(function () {
        var now = location.pathname + location.search;
        if (now !== last && window.gtag) {
          window.gtag("event", "page_view", {
            page_location: location.href,
            page_path: location.pathname
          });
          last = now;
        }
      });
      obs.observe(document, { subtree: true, childList: true });
    }
  
    if ("requestIdleCallback" in window) requestIdleCallback(loadGA);
    else setTimeout(loadGA, 1500);
  })();
  