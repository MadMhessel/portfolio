// js/editor-pro.js — FULL PAGE INLINE EDITOR (no backend)
const EDIT_FLAG = 'atm_edit';
const isEdit = new URLSearchParams(location.search).get('edit') === '1' || localStorage.getItem(EDIT_FLAG) === '1';
if (isEdit) localStorage.setItem(EDIT_FLAG, '1');

// ---- tiny helpers
function $(s, r = document) { return r.querySelector(s); }
function $all(s, r = document) { return Array.from(r.querySelectorAll(s)); }
function css(el, obj) { Object.assign(el.style, obj); }
async function loadJSON(path){ try{ const r = await fetch(path,{cache:'no-store'}); if(r.ok) return r.json(); }catch{} return {}; }
function downloadFile(name, blob){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),0); }
const safeName = s => s.replace(/[^\w.\-]+/g,'_').toLowerCase();
const suggestImgPath = f => `/img/uploads/${Date.now()}-${safeName(f.name)}`;

// ---- state
let site = {}, home = {};
let selected = null;
const assets = new Map(); // path -> File

// ---- load libs from unpkg (CSP allows)
async function use(url){ return new Promise((ok, bad)=>{ const s=document.createElement('script'); s.src=url; s.onload=ok; s.onerror=bad; document.head.append(s); }); }
async function ensureLibs(){
  await use('https://unpkg.com/sortablejs@1.15.0/modular/sortable.esm.poly.js'); // Sortable via module bundle
  await use('https://unpkg.com/jszip@3.10.1/dist/jszip.min.js');
  await use('https://unpkg.com/file-saver@2.0.5/dist/FileSaver.min.js');
}

// ---- selection + inspector
function highlight(el, on=true){
  if(!el) return;
  if(on){ el.__oldOutline = el.style.outline; el.style.outline='1px dashed rgba(11,92,85,.6)'; el.style.outlineOffset='2px'; }
  else { el.style.outline = el.__oldOutline || ''; el.style.outlineOffset=''; delete el.__oldOutline; }
}
function select(el){
  if(selected) highlight(selected,false);
  selected = el;
  if(el) { highlight(el,true); paintInspector(el); }
}
function inspectorUI(){
  const wrap = document.createElement('div');
  wrap.id = 'atm-editor';
  css(wrap, {position:'fixed', right:'12px', top:'12px', zIndex:99999, width:'min(380px,92vw)', maxHeight:'90vh', overflow:'auto',
             background:'#fff', color:'#111', border:'1px solid #ddd', borderRadius:'12px', boxShadow:'0 16px 40px rgba(0,0,0,.2)'});
  wrap.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center;padding:10px;border-bottom:1px solid #eee">
      <strong style="flex:1">Editor Pro</strong>
      <button id="atm-exit" style="padding:6px 10px;border:0;border-radius:8px;background:#555;color:#fff">Выйти</button>
    </div>
    <div style="display:flex;gap:8px;padding:8px;border-bottom:1px solid #eee;flex-wrap:wrap">
      <button data-tab="add">➕ Добавить</button>
      <button data-tab="inspector">🛠 Инспектор</button>
      <button data-tab="theme">🌈 Тема</button>
      <button data-tab="export">⬇ Экспорт</button>
    </div>
    <div id="atm-body" style="padding:10px;display:grid;gap:10px"></div>
  `;
  document.body.append(wrap);

  // navigation
  wrap.querySelectorAll('button[data-tab]').forEach(b=>{
    b.style.cssText = 'padding:8px 10px;border:0;border-radius:8px;background:#0b5c55;color:#fff;cursor:pointer';
    b.addEventListener('click', ()=> showTab(b.dataset.tab));
  });
  wrap.querySelector('#atm-exit').onclick = ()=>{ localStorage.removeItem(EDIT_FLAG); location.href = location.pathname; };
  return wrap;
}
let wrap, body;
function showTab(name){
  if(name==='add') paintAdd();
  else if(name==='inspector') paintInspector(selected);
  else if(name==='theme') paintTheme();
  else if(name==='export') paintExport();
}
function row(label, inputEl){
  const r = document.createElement('div'); css(r,{display:'grid',gridTemplateColumns:'120px 1fr',gap:'8px',alignItems:'center'});
  const l = document.createElement('label'); l.textContent = label; r.append(l, inputEl); return r;
}
function paintInspector(el){
  body.replaceChildren();
  const hint = document.createElement('div'); hint.textContent = el ? `Выбрано: <${el.tagName.toLowerCase()}>` : 'Кликните по элементу на странице';
  body.append(hint);

  if(!el) return;

  // text content (for non-void tags)
  if(!['IMG','INPUT','SOURCE','BR','HR','META','LINK'].includes(el.tagName)){
    const ta = document.createElement('textarea'); ta.value = el.textContent.trim(); css(ta,{width:'100%',minHeight:'80px'});
    ta.oninput = ()=> el.textContent = ta.value;
    body.append(row('Текст', ta));
  }

  // common attributes
  const attrs = [['id'],['class'],['href'],['src'],['alt'],['title']];
  attrs.forEach(([name])=>{
    const inp = document.createElement('input'); inp.type='text'; inp.value = el.getAttribute(name)||'';
    inp.oninput = ()=> { if(inp.value) el.setAttribute(name, inp.value); else el.removeAttribute(name); };
    body.append(row(name, inp));
  });

  // image picker
  if(el.tagName === 'IMG' || el.querySelector && el.querySelector('img')){
    const btn = document.createElement('button'); btn.textContent = '🖼 Заменить изображение';
    btn.onclick = async ()=>{
      const input = document.createElement('input'); input.type='file'; input.accept='image/png,image/jpeg,image/webp';
      input.onchange = ()=>{
        const f = input.files?.[0]; if(!f) return;
        const path = prompt('Путь для файла в репозитории (создадите вручную):', suggestImgPath(f));
        if(!path) return;
        const target = el.tagName==='IMG' ? el : el.querySelector('img');
        target.src = URL.createObjectURL(f); // превью
        target.setAttribute('data-export-src', path); // куда сохранить в ZIP
        assets.set(path, f); // положим в архив
      };
      input.click();
    };
    body.append(btn);
  }
}

function paintAdd(){
  body.replaceChildren();
  const help = document.createElement('p'); help.textContent = 'Выберите контейнер на странице, затем добавьте блок. Подсказка: для сеток используйте .portfolio-grid, .testimonials-list и т.п.';
  body.append(help);

  const btns = [
    ['H2 раздела', ()=> h2()],
    ['Абзац', ()=> p()],
    ['Кнопка primary', ()=> btn()],
    ['Карточка портфолио', ()=> card()],
    ['Отзыв', ()=> testimonial()],
    ['Элемент галереи', ()=> galleryItem()],
  ];
  btns.forEach(([label,fn])=>{
    const b=document.createElement('button'); b.textContent=label; b.style.cssText='padding:8px 10px;border:0;border-radius:8px;background:#0b5c55;color:#fff;margin:4px;cursor:pointer';
    b.onclick = ()=> {
      const host = selected || $('.portfolio-grid') || $('.testimonials-list') || $('main');
      const el = fn();
      host.append(el);
      select(el);
      enableSortables(); // чтобы можно было перетянуть
      alert('Блок добавлен. Отредактируйте его в Инспекторе или прямо на странице.');
    };
    body.append(b);
  });

  // templates
  function h2(){ const el=document.createElement('h2'); el.className='section-title'; el.textContent='Новый раздел'; return el; }
  function p(){ const el=document.createElement('p'); el.className='subtitle'; el.textContent='Новый абзац'; return el; }
  function btn(){ const a=document.createElement('a'); a.className='btn btn-primary'; a.href='#'; a.textContent='Новая кнопка'; return a; }
  function card(){
    // шаблон карточки как на главной
    // <a class="card-link" href="..."><div class="thumb"><picture><img ...></picture></div><div><h3 class="card-title">...</h3><p class="card-meta">...</p></div></a>
    const a=document.createElement('a'); a.className='card-link'; a.href='#';
    const wrap=document.createElement('article'); wrap.className='card'; wrap.appendChild(a);
    const thumb=document.createElement('div'); thumb.className='thumb';
    const pic=document.createElement('picture'); const img=document.createElement('img'); img.src='img/placeholder.png'; img.alt=''; img.width=960; img.height=640;
    pic.append(img); thumb.append(pic);
    const info=document.createElement('div'); const h3=document.createElement('h3'); h3.className='card-title'; h3.textContent='Новый проект';
    const meta=document.createElement('p'); meta.className='card-meta'; meta.textContent='Город · метраж';
    a.append(thumb, info); info.append(h3, meta);
    return wrap;
  }
  function testimonial(){
    const art=document.createElement('article'); art.className='testimonial';
    art.innerHTML = `
      <div class="testimonial__header">
        <span class="testimonial__avatar"><img src="img/clients/placeholder.svg" width="56" height="56" alt=""></span>
        <div><cite>Имя Клиента</cite><p class="testimonial__role">Роль/описание</p></div>
      </div>
      <p>Текст отзыва…</p>
      <p class="card-meta">Короткий результат…</p>`;
    return art;
  }
  function galleryItem(){
    // <a class="card gallery" href="IMG" data-pswp-width="1280" data-pswp-height="720"><span class="thumb"><img src="IMG"></span></a>
    const a=document.createElement('a'); a.className='card gallery'; a.href='#'; a.setAttribute('data-pswp-width','1280'); a.setAttribute('data-pswp-height','720');
    const span=document.createElement('span'); span.className='thumb'; const img=document.createElement('img'); img.src='img/placeholder.png'; img.width=1280; img.height=720; img.alt='';
    span.append(img); a.append(span); return a;
  }
}

function paintTheme(){
  body.replaceChildren();
  const f = (key, label, type='text')=>{
    const inp=document.createElement('input'); inp.type=type; inp.value = site.theme?.[key]||''; inp.oninput=()=>{ site.theme[key]=inp.value; applyTheme(); };
    body.append(row(label, inp));
  };
  f('c_bg','Фон','color'); f('c_text','Текст','color'); f('c_primary','Primary','color');
  f('c_primary_hover','Primary hover','color'); f('c_focus','Фокус','color');
  f('radius','Радиус'); f('maxw','Макс. ширина');

  const f2 = (key, label)=>{
    const inp=document.createElement('input'); inp.type='text'; inp.value = site.contacts?.[key]||''; inp.oninput=()=>{ site.contacts[key]=inp.value; applyContacts(); };
    body.append(row(label, inp));
  };
  body.append(document.createElement('hr'));
  f2('phone','Телефон'); f2('email','Email'); f2('whatsapp','WhatsApp'); f2('telegram','Telegram');
}

function paintExport(){
  body.replaceChildren();
  const p=document.createElement('p'); p.textContent='Скачаем ZIP: текущая страница (HTML) + data/site.json + data/home.json + выбранные изображения.';
  const b=document.createElement('button'); b.textContent='⬇ Скачать ZIP'; b.style.cssText='padding:8px 10px;border:0;border-radius:8px;background:#0b5c55;color:#fff';
  b.onclick = async ()=>{
    const zip = new JSZip();

    // 1) HTML текущей страницы
    const clone = document.documentElement.cloneNode(true);
    // убрать редактор и рамки
    const ed = clone.querySelector('#atm-editor'); if (ed) ed.remove();
    clone.querySelectorAll('[style]').forEach(el=>{
      // снимем наши пунктирные выделения
      if (el.style.outline?.includes('dashed')) el.style.outline='';
      if (el.style.outlineOffset) el.style.outlineOffset='';
      if (el.style.position==='fixed' && el.id==='atm-editor') el.remove();
    });
    // вернуть data-export-src в src (картинки)
    clone.querySelectorAll('img[data-export-src]').forEach(img=>{
      img.setAttribute('src', img.getAttribute('data-export-src'));
      img.removeAttribute('data-export-src');
    });
    const html = '<!doctype html>\n' + clone.outerHTML;
    zip.file(location.pathname.replace(/^.*\\//,''), html);

    // 2) JSON
    zip.file('data/site.json', JSON.stringify(site, null, 2));
    zip.file('data/home.json', JSON.stringify(home, null, 2));

    // 3) assets
    for (const [path, file] of assets.entries()){
      zip.file(path.replace(/^\//,''), file);
    }

    const blob = await zip.generateAsync({type:'blob'});
    saveAs(blob, `site-edit-${Date.now()}.zip`);
  };
  body.append(p,b);
}

// live apply (совместимо с js/content.js)
function applyTheme(){
  const map = { c_bg:'--c-bg', c_surface:'--c-surface', c_text:'--c-text', c_muted:'--c-muted',
    c_primary:'--c-primary', c_primary_hover:'--c-primary-hover', c_focus:'--c-focus', radius:'--radius', maxw:'--maxw'};
  if (site.theme) Object.entries(site.theme).forEach(([k,v])=>{ if(map[k] && v) document.documentElement.style.setProperty(map[k], String(v)); });
}
function applyContacts(){
  const c = site.contacts||{};
  const set = (sel, val, pfx='') => val && $all(sel).forEach(a => a.href = pfx + val);
  set('a[href^="tel:"]', c.phone, 'tel:');
  set('a[href^="mailto:"]', c.email, 'mailto:');
  set('a[href^="https://wa.me/"]', c.whatsapp, 'https://wa.me/');
  set('a[href^="https://t.me/"]', c.telegram, 'https://t.me/');
}

// drag & drop (для списков)
function enableSortables(){
  const containers = ['.portfolio-grid', '.testimonials-list', '.case-overview__grid'].map(s=>$(s)).filter(Boolean);
  containers.forEach(c=>{
    if (c.__sortable) return;
    c.__sortable = Sortable.create(c, { animation: 150, handle: null });
  });
}

function enableClicksToSelect(){
  document.addEventListener('click', (e)=>{
    if (wrap.contains(e.target)) return; // клики в панель — мимо
    e.preventDefault(); e.stopPropagation();
    select(e.target);
  }, true);
}

async function init(){
  if (!isEdit) return;
  await ensureLibs();
  wrap = inspectorUI(); body = wrap.querySelector('#atm-body');

  // load data
  site = await loadJSON('data/site.json');
  home = await loadJSON('data/home.json');

  // initial live apply
  applyTheme(); applyContacts();
  enableSortables();
  enableClicksToSelect();
  showTab('inspector');
}
init();
