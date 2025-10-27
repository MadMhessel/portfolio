
const btn = document.getElementById('menuBtn');
const nav = document.getElementById('navMobile');
if (btn && nav){
  btn.type = 'button';
  const toggle = () => {
    const open = nav.getAttribute('data-open') === 'true';
    nav.setAttribute('data-open', String(!open));
    btn.setAttribute('aria-expanded', String(!open));
  };
  btn.addEventListener('click', toggle);
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click', ()=>{
    nav.setAttribute('data-open','false'); btn.setAttribute('aria-expanded','false');
  }));
  document.addEventListener('keydown',(e)=>{
    if(e.key==='Escape'){ nav.setAttribute('data-open','false'); btn.setAttribute('aria-expanded','false');}
  });
}

const io = new IntersectionObserver((entries)=>entries.forEach(e=>{
  if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: 0.18 });
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

document.querySelectorAll('.ba').forEach(w=>{
  const r=w.querySelector('.ba-range');
  const after=w.querySelector('.after');
  const set = ()=>{ after.style.clipPath = `inset(0 0 0 ${100 - r.value}%)`; };
  r.addEventListener('input', set); set();
});
