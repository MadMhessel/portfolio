// js/editmode.js — INLINE EDIT MODE (без внешних запросов)
const isIndex = /\/(index\.html)?$/.test(location.pathname);
let site = { theme:{}, contacts:{} };
let home = {};

const qs = new URLSearchParams(location.search);
const EDIT_ON = qs.get('edit') === '1' || localStorage.getItem('atm_edit') === '1';
if (EDIT_ON) localStorage.setItem('atm_edit','1');

async function loadJSON(path){
  try{ const r = await fetch(path,{cache:'no-store'}); if(r.ok) return r.json(); }catch{}
  return null;
}
function download(name, obj){
  const blob = new Blob([JSON.stringify(obj,null,2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 0);
}
function applyTheme(){
  const map = {c_bg:'--c-bg', c_surface:'--c-surface', c_text:'--c-text', c_muted:'--c-muted',
               c_primary:'--c-primary', c_primary_hover:'--c-primary-hover', c_focus:'--c-focus',
               radius:'--radius', maxw:'--maxw'};
  Object.entries(site.theme||{}).forEach(([k,v])=>{
    if(map[k] && v) document.documentElement.style.setProperty(map[k], String(v));
  });
}
function applyContacts(){
  const c = site.contacts||{};
  const set = (sel, val, pfx='') => val && document.querySelectorAll(sel).forEach(a => a.href = pfx+val);
  set('a[href^="tel:"]',     c.phone,    'tel:');
  set('a[href^="mailto:"]',  c.email,    'mailto:');
  set('a[href^="https://wa.me/"]', c.whatsapp, 'https://wa.me/');
  set('a[href^="https://t.me/"]',  c.telegram, 'https://t.me/');
}
function hi(el){ if(!el) return; el.style.outline='1px dashed rgba(11,92,85,.6)'; el.style.outlineOffset='2px'; }
function bye(el){ if(!el) return; el.style.outline=''; el.style.outlineOffset=''; }
function safeName(name){ return name.replace(/[^\w.\-]+/g, '_').toLowerCase(); }
function suggestImagePath(file){ return `/img/uploads/${Date.now()}-${safeName(file.name)}`; }

function buildChip(){
  const wrap = Object.assign(document.createElement('div'), {id:'atm-inline-chip'});
  Object.assign(wrap.style, {
    position:'fixed', right:'12px', bottom:'12px', zIndex:9999, display:'grid', gap:'6px',
    font:'13px/1.2 system-ui,Segoe UI,Arial'
  });
  const btn = (t, title)=>{ const b=document.createElement('button'); b.textContent=t; b.title=title||''; 
    Object.assign(b.style,{padding:'8px 10px', border:'0', borderRadius:'10px', cursor:'pointer', background:'#0b5c55', color:'#fff'});
    return b;
  };

  // POPUP "Тема"
  const pop = document.createElement('div');
  Object.assign(pop.style,{display:'none', position:'fixed', right:'12px', bottom:'60px', background:'#fff', color:'#111',
    border:'1px solid #ddd', borderRadius:'10px', padding:'10px', boxShadow:'0 12px 30px rgba(0,0,0,.15)'});
  const themeFields = [
    ['c_bg','Фон', 'color'], ['c_text','Текст','color'], ['c_primary','Primary','color'],
    ['c_primary_hover','Primary hover','color'], ['c_focus','Фокус','color'],
    ['radius','Радиус','text'], ['maxw','Макс. ширина','text'],
  ].map(([key,label,type])=>{
    const row = document.createElement('label'); row.style.display='grid'; row.style.gridTemplateColumns='120px 1fr'; row.style.gap='8px'; row.style.alignItems='center';
    row.textContent = label;
    const input = document.createElement('input'); input.type = type; input.value = site.theme?.[key] || '';
    input.addEventListener('input', ()=>{ site.theme[key]=input.value; applyTheme(); });
    row.appendChild(document.createElement('span')); row.lastChild.replaceWith(input);
    return row;
  });
  pop.append(...themeFields);

  const bTheme = btn('🌈 Тема','Настроить цвета');
  const bImg   = btn('🖼 Изображение','Заменить обложку на главной');
  const bSave  = btn('💾 Скачать','Скачать site.json / home.json');
  const bExit  = btn('✖ Выйти','Выйти из режима редактирования');

  bTheme.addEventListener('click', ()=> pop.style.display = pop.style.display==='none' ? 'block' : 'none');

  bImg.addEventListener('click', ()=>{
    if (!isIndex) { alert('Картинку сейчас редактируем только на главной'); return; }
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp';
    input.onchange = () => {
      const file = input.files?.[0]; if (!file) return;
      if (file.size > 3 * 1024 * 1024) return alert('Файл слишком большой (макс. 3 МБ).');
      if (!/image\/(png|jpeg|webp)/.test(file.type)) return alert('Поддерживаются PNG, JPG, WEBP.');

      // Превью на странице
      const hero = document.querySelector('.hero');
      if (hero) {
        let img = hero.querySelector('img');
        if (!img) {
          img = document.createElement('img');
          img.alt = ''; img.style.maxWidth = '100%'; img.style.display = 'block';
          hero.prepend(img);
        }
        img.src = URL.createObjectURL(file);
      }

      // Предлагаем путь и записываем его в данные
      const path = suggestImagePath(file);
      home.hero_image = path;

      alert(
        'Изображение показано как превью.\n' +
        'Чтобы картинка была на сайте после публикации:\n' +
        '1) Скачайте обновлённый home.json (кнопка 💾 «Скачать»).\n' +
        '2) Загрузите выбранный файл в репозиторий по пути:\n   ' + path + '\n' +
        '3) Замените data/home.json в репозитории на скачанный.\n'
      );
    };
    input.click();
  });

  bSave.addEventListener('click', ()=>{
    download('site.json', site);
    if (isIndex) download('home.json', home);
  });

  bExit.addEventListener('click', ()=>{
    localStorage.removeItem('atm_edit');
    location.href = location.pathname; // убрать ?edit=1
  });

  wrap.append(pop, bTheme, bImg, bSave, bExit);
  document.body.append(wrap);
}

async function init(){
  if (!EDIT_ON) return;

  // загрузить текущие данные
  const s = await loadJSON('data/site.json'); if(s) site = s;
  const h = await loadJSON('data/home.json'); if(h) home = h;

  applyTheme(); applyContacts(); buildChip();

  // --- инлайн тексты на главной
  if (isIndex) {
    const hero = document.querySelector('.hero'); if (hero){
      const sub = hero.querySelector('.subtitle');
      const h1  = hero.querySelector('h1');
      const cta = hero.querySelector('.btn.btn-primary, .btn-primary');

      [sub,h1,cta].forEach(el=>{
        if(!el) return;
        hi(el); el.contentEditable = 'true';
        el.addEventListener('focus', ()=>hi(el));
        el.addEventListener('blur',  ()=>hi(el));
      });

      if (sub) sub.addEventListener('input', ()=> home.hero_subtitle = sub.textContent);
      if (h1)  h1 .addEventListener('input', ()=> home.hero_title    = h1.textContent);
      if (cta) cta.addEventListener('input', ()=> home.cta_text      = cta.textContent);
    }
  }

  // --- правка контактов (Shift+клик)
  document.querySelectorAll('.quick-contacts a[href]').forEach(a=>{
    hi(a);
    a.addEventListener('click', (e)=>{
      if(!e.shiftKey) return; // обычный клик — как ссылка
      e.preventDefault();
      const href = a.getAttribute('href') || '';
      let kind = href.startsWith('https://wa.me/') ? 'whatsapp'
              : href.startsWith('https://t.me/')   ? 'telegram'
              : href.startsWith('mailto:')         ? 'email'
              : href.startsWith('tel:')            ? 'phone' : null;
      if(!kind) return;
      const current = (site.contacts?.[kind] || '').toString();
      const next = prompt(`Новое значение для ${kind}:\n(только цифры для WhatsApp, ник без @ для Telegram)`, current);
      if(next == null) return;
      site.contacts = Object.assign({}, site.contacts, { [kind]: next.trim() });
      applyContacts();
    }, true);
  });

  // --- горячие клавиши (Cmd/Ctrl + S -> скачать JSON)
  window.addEventListener('keydown', (e)=>{
    if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase() === 's'){
      e.preventDefault();
      download('site.json', site);
      if (isIndex) download('home.json', home);
    }
  });
}
init();
