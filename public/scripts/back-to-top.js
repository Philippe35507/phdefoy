(function() {
  function initBackToTop() {
    const btn = document.getElementById('back-to-top');

    if (btn) {
      // Show/hide button based on scroll position
      window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
          btn.classList.add('visible');
        } else {
          btn.classList.remove('visible');
        }
      });

      // Scroll to top on click
      btn.addEventListener('click', () => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
    }
  }

  // Handle both cases: DOM already loaded or not yet
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackToTop);
  } else {
    initBackToTop();
  }
})();
