/* fix: плавающий CTA с локальным состоянием и компактным режимом */
const CTA_STORAGE_KEY = 'ctaStickyDismissed';

document.querySelectorAll('.cta-sticky').forEach((cta) => {
  const action = cta.querySelector('.cta-sticky__action');
  const closeBtn = cta.querySelector('.cta-sticky__close');
  const setHidden = (hidden) => {
    cta.dataset.hidden = hidden ? 'true' : 'false';
  };
  const rememberHidden = () => {
    try{
      localStorage.setItem(CTA_STORAGE_KEY, 'true');
    }catch(error){
      /* noop */
    }
  };
  let dismissed = false;
  try{
    dismissed = localStorage.getItem(CTA_STORAGE_KEY) === 'true';
  }catch(error){
    dismissed = false;
  }
  setHidden(dismissed);

  const hideCta = () => {
    setHidden(true);
    rememberHidden();
  };

  closeBtn?.addEventListener('click', () => {
    hideCta();
  });

  const compactMedia = window.matchMedia('(max-width: 479px)');
  const applyCompact = (matches) => {
    cta.dataset.compact = matches ? 'true' : 'false';
  };
  applyCompact(compactMedia.matches);
  const compactListener = (event) => applyCompact(event.matches);
  if(typeof compactMedia.addEventListener === 'function'){
    compactMedia.addEventListener('change', compactListener);
  }else if(typeof compactMedia.addListener === 'function'){
    compactMedia.addListener(compactListener);
  }

  action?.addEventListener('click', () => {
    if(cta.dataset.compact === 'true'){
      hideCta();
    }
  });
});
