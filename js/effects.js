/* fix: плавное появление блоков с поддержкой reduced motion */
const revealElements = document.querySelectorAll('.reveal-in');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if(revealElements.length){
  const showImmediately = () => {
    revealElements.forEach((el) => el.classList.add('is-visible'));
  };

  if(reduceMotion.matches){
    showImmediately();
  }else{
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, {threshold:0.05});

    revealElements.forEach((el) => observer.observe(el));
  }

  const handleReduceChange = (event) => {
    if(event.matches){
      showImmediately();
    }
  };

  if(typeof reduceMotion.addEventListener === 'function'){
    reduceMotion.addEventListener('change', handleReduceChange);
  }else if(typeof reduceMotion.addListener === 'function'){
    reduceMotion.addListener(handleReduceChange);
  }
}

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

/* fix: корректируем размеры изображений без апскейла */
const applyNoUpscale = (img) => {
  if(!img){return;}
  const setMaxWidth = () => {
    if(img.naturalWidth){
      img.style.maxWidth = `${img.naturalWidth}px`;
    }
  };
  if(img.complete){
    setMaxWidth();
  }else{
    img.addEventListener('load', setMaxWidth, {once:true});
  }
};

document.querySelectorAll('img[data-no-upscale]').forEach(applyNoUpscale);

document.querySelectorAll('.ba .ba-media').forEach((box) => {
  const before = box.querySelector('img.before');
  const after = box.querySelector('img.after');
  const applyBA = () => {
    const wBefore = before?.naturalWidth || Infinity;
    const wAfter = after?.naturalWidth || Infinity;
    const w = Math.min(wBefore, wAfter);
    if(Number.isFinite(w)){
      box.style.maxWidth = `${w}px`;
    }
  };
  [before, after].forEach((img) => {
    if(!img){return;}
    if(img.complete){
      applyBA();
    }else{
      img.addEventListener('load', applyBA, {once:true});
    }
  });
});
