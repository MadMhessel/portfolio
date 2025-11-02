// js/editmode.js
const isIndex = /\/(index\.html)?$/.test(location.pathname);
let site = { theme: {}, contacts: {} };
let home = {};

async function loadJSON(path){
  try { const r = await fetch(path, {cache:'no-store'}); if (r.ok) return r.json(); } catch {}
  return null;
}
function saveLocalFlag(on){ localStorage.setItem('atm_edit', on ? '1' : '0'); }

function h(tag, attrs={}, ...children){
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if (k==='style' && typeof v==='object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  });
  children.flat().forEach(c=> el.append(c?.nodeType ? c : document.createTextNode(c ?? '')));
  return el;
}

function download(name, obj){
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'});
  const a = h('a', {href: URL.createObjectURL(blob), download: name});
  document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
}

function applyTheme(){
  const map = {c_bg:'--c-bg', c_surface:'--c-surface', c_text:'--c-text', c_muted:'--c-muted',
               c_primary:'--c-primary', c_primary_hover:'--c-primary-hover', c_focus:'--c-focus',
               radius:'--radius', maxw:'--maxw'};
  Object.entries(site.theme||{}).forEach(([k,v])=>{
    if (map[k] && v) document.documentElement.style.setProperty(map[k], String(v));
  });
}
function applyContacts(){
  const c = site.contacts||{};
  const set = (sel, val, pfx='') => val && document.querySelectorAll(sel).forEach(a=> a.href = pfx + val);
  set('a[href^="tel:"]', c.phone, 'tel:');
  set('a[href^="mailto:"]', c.email, 'mailto:');
  set('a[href^="https://wa.me/"]', c.whatsapp, 'https://wa.me/');
  set('a[href^="https://t.me/"]', c.telegram, 'https://t.me/');
}
function bindHeroEditors(panel){
  if (!isIndex) return;
  const hero = document.querySelector('.hero'); if (!hero) return;
  const sub = hero.querySelector('.subtitle');
  const h1  = hero.querySelector('h1');
  const cta = hero.querySelector('.btn.btn-primary, .btn-primary');

  const mkInput = (label, key, el) => {
    const inp = h('input', {type:'text', value: home[key]||'', style:{width:'100%'}});
    inp.addEventListener('input', ()=>{
      home[key] = inp.value;
      if (el) el.textContent = inp.value;
    });
    return h('label', {}, label, h('div', {}, inp));
  };

  // contenteditable on-page
  if (sub){ sub.contentEditable = 'true'; sub.addEventListener('input', ()=> { home.hero_subtitle = sub.textContent; }); }
  if (h1){  h1.contentEditable  = 'true'; h1.addEventListener('input',  ()=> { home.hero_title    = h1.textContent;  }); }
  if (cta){ cta.addEventListener('input', ()=> { home.cta_text = cta.textContent; }); cta.contentEditable='true'; }

  panel.append(
    mkInput('Подзаголовок', 'hero_subtitle', sub),
    mkInput('Заголовок (H1)', 'hero_title', h1),
    mkInput('Текст кнопки', 'cta_text', cta),
  );
}

function buildPanel(){
  const root = h('div', {id:'atm-editor-root', style:{
    position:'fixed', inset:'auto 16px 16px auto', zIndex:9999, font:'14px/1.4 system-ui,Segoe UI,Arial',
  }});

  const btn = h('button', {id:'atm-edit-btn', style:{
    width:'48px', height:'48px', borderRadius:'50%', border:'0', cursor:'pointer',
    background:'#0b5c55', color:'#fff', boxShadow:'0 4px 20px rgba(0,0,0,.25)'
  }}, '✏️');
  root.append(btn);

  const sheet = h('div', {id:'atm-edit-sheet', style:{
    display:'none', position:'fixed', right:'16px', bottom:'80px', width:'min(420px, 92vw)',
    maxHeight:'70vh', overflow:'auto', background:'#fff', color:'#111',
    border:'1px solid #ddd', borderRadius:'12px', padding:'16px', boxShadow:'0 12px 40px rgba(0,0,0,.2)'
  }});
  const tabs = h('div', {style:{display:'flex', gap:'8px', marginBottom:'8px'}},
    h('button', {id:'tab-theme'}, 'Тема'),
    h('button', {id:'tab-contacts'}, 'Контакты'),
    ...(isIndex ? [h('button', {id:'tab-home'}, 'Главная')] : [])
  );
  const body = h('div', {id:'atm-edit-body', style:{display:'grid', gap:'8px'}});

  const actions = h('div', {style:{display:'flex', gap:'8px', marginTop:'8px', flexWrap:'wrap'}},
    h('button', {id:'atm-dl', style:{background:'#eee', color:'#111'}}, 'Download JSON'),
    h('button', {id:'atm-save', style:{display:'none'}}, 'Save (server)'),
    h('button', {id:'atm-exit', style:{background:'#555'}}, 'Exit')
  );

  sheet.append(h('h3', {}, 'Редактор страницы'), tabs, body, actions);
  root.append(sheet);
  document.body.append(root);

  btn.addEventListener('click', ()=> sheet.style.display = sheet.style.display==='none' ? 'block' : 'none');
  document.getElementById('atm-exit').addEventListener('click', ()=> { sheet.style.display='none'; });
  document.getElementById('atm-dl').addEventListener('click', ()=>{
    download('site.json', site);
    if (isIndex) download('home.json', home);
  });

  // Try to detect Netlify Function (same-origin) -> then show Save
  fetch('/.netlify/functions/save-data', {method:'OPTIONS'}).then(r=>{
    if (r.ok) document.getElementById('atm-save').style.display = 'inline-block';
  }).catch(()=>{});
  document.getElementById('atm-save').addEventListener('click', async ()=>{
    const res = await fetch('/.netlify/functions/save-data', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ site, home: isIndex ? home : null })
    });
    alert(res.ok ? 'Сохранено ✅' : 'Не удалось сохранить');
  });

  // Tabs
  const paintTheme = ()=>{
    body.replaceChildren(
      ...['c_bg','c_text','c_primary','c_primary_hover','c_focus','radius','maxw'].map(key=>{
        const label = ({c_bg:'Цвет фона', c_text:'Цвет текста', c_primary:'Основной цвет',
          c_primary_hover:'Hover', c_focus:'Фокус', radius:'Радиус', maxw:'Макс. ширина'})[key];
        const input = h('input', {type: key.startsWith('c_') ? 'color':'text', value: site.theme?.[key]||''});
        input.addEventListener('input', ()=>{
          site.theme[key] = input.value;
          applyTheme();
        });
        return h('label', {}, label, h('div', {}, input));
      })
    );
  };
  const paintContacts = ()=>{
    body.replaceChildren(
      ...[['phone','Телефон'],['email','Email'],['whatsapp','WhatsApp'],['telegram','Telegram']]
      .map(([key,label])=>{
        const input = h('input', {type:'text', value: site.contacts?.[key]||''});
        input.addEventListener('input', ()=>{ site.contacts[key]=input.value; applyContacts(); });
        return h('label', {}, label, h('div', {}, input));
      })
    );
  };
  const paintHome = ()=>{
    body.replaceChildren(); bindHeroEditors(body);
  };

  document.getElementById('tab-theme').addEventListener('click', paintTheme);
  document.getElementById('tab-contacts').addEventListener('click', paintContacts);
  isIndex && document.getElementById('tab-home').addEventListener('click', paintHome);

  // default tab
  paintTheme();
}

(async function init(){
  const flag = new URLSearchParams(location.search).get('edit') === '1' || localStorage.getItem('atm_edit')==='1';
  if (!flag) return;
  saveLocalFlag(true);

  const s = await loadJSON('data/site.json');  if (s) site = s;
  const h = await loadJSON('data/home.json');  if (h) home = h;

  applyTheme(); applyContacts(); buildPanel();
})();
