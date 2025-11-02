/* fix: бургер-меню с фокус-ловушкой и aria */
const menuBtn = document.getElementById('menuBtn');
const navMobile = document.getElementById('navMobile');
const navOverlay = document.getElementById('navOverlay');
const focusableSelectors = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea';

if(menuBtn && navMobile){
  menuBtn.type = 'button';
  navMobile.setAttribute('role', navMobile.getAttribute('role') || 'dialog');
  navMobile.setAttribute('aria-modal', 'false');

  const setBodyScroll = (blocked) => {
    document.body.classList.toggle('no-scroll', blocked);
  };

  const toggleMenu = (state) => {
    const willOpen = typeof state === 'boolean' ? state : navMobile.dataset.open !== 'true';
    navMobile.dataset.open = String(willOpen);
    menuBtn.setAttribute('aria-expanded', String(willOpen));
    navMobile.setAttribute('aria-hidden', String(!willOpen));
    navMobile.setAttribute('aria-modal', String(willOpen));
    menuBtn.setAttribute('aria-label', willOpen ? 'Закрыть меню' : 'Открыть меню');
    navOverlay?.setAttribute('data-active', String(willOpen));
    navOverlay?.setAttribute('aria-hidden', String(!willOpen));
    setBodyScroll(willOpen);

    if(willOpen){
      const focusables = navMobile.querySelectorAll(focusableSelectors);
      if(focusables.length){
        focusables[0].focus();
      }
    }else{
      menuBtn.focus();
    }
  };

  menuBtn.addEventListener('click', () => toggleMenu());
  navOverlay?.addEventListener('click', () => toggleMenu(false));

  navMobile.addEventListener('keydown', (event) => {
    if(event.key === 'Escape'){
      toggleMenu(false);
    }
    if(event.key === 'Tab'){
      const focusables = Array.from(navMobile.querySelectorAll(focusableSelectors));
      if(!focusables.length){return;}
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if(event.shiftKey && document.activeElement === first){
        event.preventDefault();
        last.focus();
      }else if(!event.shiftKey && document.activeElement === last){
        event.preventDefault();
        first.focus();
      }
    }
  });

  navMobile.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => toggleMenu(false));
  });

  window.addEventListener('keydown', (event) => {
    if(event.key === 'Escape' && navMobile.dataset.open === 'true'){
      toggleMenu(false);
    }
  });
}
