/* fix: бургер-меню с фокус-ловушкой и aria */
const menuBtn = document.getElementById('menuBtn');
const navMobile = document.getElementById('navMobile');
const navOverlay = document.getElementById('navOverlay');
const focusableSelectors = 'a[href], button:not([disabled]), [tabindex="0"]';
if(menuBtn && navMobile){
  menuBtn.type = 'button';
  const toggleMenu = (state) => {
    const willOpen = typeof state === 'boolean' ? state : navMobile.dataset.open !== 'true';
    navMobile.dataset.open = String(willOpen);
    menuBtn.setAttribute('aria-expanded', String(willOpen));
    navMobile.setAttribute('aria-hidden', String(!willOpen));
    navOverlay?.setAttribute('data-active', String(willOpen));
    navOverlay?.setAttribute('aria-hidden', String(!willOpen));
    document.body.classList.toggle('no-scroll', willOpen);
    if(willOpen){
      const focusables = navMobile.querySelectorAll(focusableSelectors);
      focusables[0]?.focus();
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
  navMobile.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => toggleMenu(false)));
}

/* fix: плавное появление блоков */
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if(entry.isIntersecting){
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, {threshold:0.2});
document.querySelectorAll('.reveal-in').forEach((el) => observer.observe(el));

/* fix: слайдер до/после с aria */
document.querySelectorAll('.ba').forEach((wrapper) => {
  const range = wrapper.querySelector('.ba-range');
  const afterImg = wrapper.querySelector('.after');
  if(!range || !afterImg){return;}
  const update = (value) => {
    afterImg.style.clipPath = `inset(0 ${100 - value}% 0 0)`;
    range.setAttribute('aria-valuenow', String(value));
  };
  update(Number(range.value || 50));
  range.addEventListener('input', (event) => {
    update(Number(event.target.value));
  });
});

/* fix: маска телефона и сообщения формы */
const phoneInputs = document.querySelectorAll('input[data-mask="phone"]');
phoneInputs.forEach((input) => {
  input.addEventListener('input', () => {
    const raw = input.value.replace(/\D/g, '');
    if(!raw.length){
      input.value = '';
      return;
    }
    let digits = raw;
    if(digits.startsWith('8')){
      digits = `7${digits.slice(1)}`;
    }else if(!digits.startsWith('7')){
      digits = `7${digits}`;
    }
    digits = digits.slice(0,11);
    let formatted = '+7';
    if(digits.length > 1){
      formatted += ' (' + digits.slice(1,4);
      if(digits.length >= 4){formatted += ') ' + digits.slice(4,7);}
      if(digits.length >= 7){formatted += '-' + digits.slice(7,9);}
      if(digits.length >= 9){formatted += '-' + digits.slice(9,11);}
    }
    input.value = formatted;
  });
});

document.querySelectorAll('form[data-validate]').forEach((form) => {
  form.addEventListener('submit', () => {
    form.querySelectorAll('.error').forEach((error) => { error.textContent = ''; });
  });
  form.addEventListener('invalid', (event) => {
    if(!(event.target instanceof HTMLElement)){return;}
    const field = event.target;
    const errorContainer = form.querySelector(`[data-error-for="${field.name}"]`);
    if(errorContainer){
      errorContainer.textContent = field.validationMessage;
    }
  }, true);
  form.querySelectorAll('input, textarea, select').forEach((field) => {
    field.addEventListener('input', () => {
      const errorContainer = form.querySelector(`[data-error-for="${field.name}"]`);
      if(errorContainer){
        errorContainer.textContent = '';
      }
    });
  });
});
