import { Blocks, fromData as renderBlocks, toData as collectAST, cloneAST, loadPageAST } from './blocks-core.js';

const EDIT_FLAG = 'atm_edit';
const AUTOSAVE_PREFIX = 'atm_ast_draft_';
const HISTORY_LIMIT = 50;

const params = new URLSearchParams(location.search);
const isEdit = params.get('edit') === '1' || localStorage.getItem(EDIT_FLAG) === '1';
if (isEdit) localStorage.setItem(EDIT_FLAG, '1');

const state = {
  site: {},
  home: {},
  ast: [],
  history: { past: [], future: [] },
  assets: new Map(),
  selected: null,
  dirty: false,
  autosaveTimer: null,
  slug: detectSlug()
};
state.autosaveKey = `${AUTOSAVE_PREFIX}${state.slug}`;

const editRoot = document.querySelector('main') || document.body;

function detectSlug() {
  let pathname = location.pathname;
  if (pathname.endsWith('/')) pathname += 'index.html';
  const parts = pathname.split('/').filter(Boolean);
  let last = parts.pop() || 'index.html';
  if (!/\.html$/i.test(last)) last += '.html';
  return last.replace(/\.html$/i, '') || 'index';
}
const $ = (selector, root = document) => root.querySelector(selector);
const $all = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const css = (el, styles) => Object.assign(el.style, styles);
const safeName = str => str.replace(/[^\w.\-]+/g, '_').toLowerCase();
const suggestImgPath = file => `/img/uploads/${Date.now()}-${safeName(file.name)}`;
let wrap, body, miniToolbar, slashMenu;
let syncTimer = null;

const loadJSON = path => fetch(path, { cache: 'no-store' }).then(r => r.ok ? r.json() : {}).catch(() => ({}));

// ---- load libs from unpkg (CSP allows)  ✅ используем UMD, не ESM
async function use(url){
  return new Promise((ok, bad)=>{
    const s = document.createElement('script');
    s.src = url;
    s.onload = ok;
    s.onerror = bad;
    document.head.append(s);
  });
}
async function ensureLibs(){
  // Эти UMD-версии создают глобальные window.Sortable, window.JSZip, window.saveAs
  await use('https://unpkg.com/sortablejs@1.15.0/Sortable.min.js');   // ⬅ вместо modular/*.esm*.js
  await use('https://unpkg.com/jszip@3.10.1/dist/jszip.min.js');
  await use('https://unpkg.com/file-saver@2.0.5/dist/FileSaver.min.js');
}

function captureSelectionPath(el) {
  if (!el || !el.dataset?.blockType) return null;
  const path = {
    type: el.dataset.blockType,
    selector: el.dataset.blockSelector || null,
    container: el.dataset.blockContainer || null
  };
  if (!path.selector) {
    const parent = el.parentElement;
    if (parent) {
      const siblings = $all(`[data-block-type="${path.type}"]`, parent);
      path.index = siblings.indexOf(el);
      const container = parent.closest('[data-block-container]');
      if (container) path.container = container.dataset.blockContainer;
    }
  }
  return path;
}

function resolveSelection(path) {
  if (!path) return null;
  if (path.selector) {
    const el = $(path.selector);
    if (el) return el;
  }
  if (path.container) {
    const container = $(path.container) || $(`[data-block-container="${path.container}"]`);
    if (container) {
      const list = $all(`[data-block-type="${path.type}"]`, container);
      if (list[path.index ?? 0]) return list[path.index ?? 0];
    }
  }
  return $all(`[data-block-type="${path.type}"]`)[path.index ?? 0] || null;
}

function pushHistorySnapshot() {
  const snapshot = { ast: cloneAST(state.ast), selection: captureSelectionPath(state.selected) };
  state.history.past.push(snapshot);
  if (state.history.past.length > HISTORY_LIMIT) state.history.past.shift();
  state.history.future = [];
  updateHistoryButtons();
}

function applySnapshot(snapshot) {
  state.ast = cloneAST(snapshot.ast);
  renderBlocks(state.ast, editRoot);
  enableSortables();
  const el = resolveSelection(snapshot.selection);
  select(el);
  state.dirty = true;
}

function undo() {
  if (state.history.past.length <= 1) return;
  const current = state.history.past.pop();
  state.history.future.push(current);
  const prev = state.history.past[state.history.past.length - 1];
  applySnapshot(prev);
  updateHistoryButtons();
}

function redo() {
  const next = state.history.future.pop();
  if (!next) return;
  state.history.past.push(next);
  applySnapshot(next);
  updateHistoryButtons();
}

function updateHistoryButtons() {
  const undoBtn = wrap?.querySelector('#atm-undo');
  const redoBtn = wrap?.querySelector('#atm-redo');
  if (undoBtn) undoBtn.disabled = state.history.past.length <= 1;
  if (redoBtn) redoBtn.disabled = state.history.future.length === 0;
}

function scheduleAutosave() {
  if (state.autosaveTimer) return;
  state.autosaveTimer = setInterval(saveDraft, 10000);
}

function saveDraft() {
  if (!state.dirty) return;
  try {
    localStorage.setItem(state.autosaveKey, JSON.stringify({ ast: state.ast, ts: Date.now() }));
    state.dirty = false;
  } catch (err) {
    console.warn('autosave failed', err);
  }
}

function checkDraft() {
  const raw = localStorage.getItem(state.autosaveKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn('draft parse failed', err);
    return null;
  }
}

function highlight(el, on = true) {
  if (!el) return;
  if (on) {
    el.style.outline = '1px dashed rgba(11,92,85,.7)';
    el.style.outlineOffset = '2px';
  } else {
    el.style.outline = '';
    el.style.outlineOffset = '';
  }
}

function select(el) {
  const block = el?.closest?.('[data-block-type]') || el;
  if (state.selected && state.selected !== block) highlight(state.selected, false);
  state.selected = block;
  if (block) highlight(block, true);
  paintInspector(block);
}

function inspectorUI() {
  const wrap = document.createElement('div');
  wrap.id = 'atm-editor';
  css(wrap, {
    position: 'fixed', right: '12px', top: '12px', zIndex: 99999,
    width: 'min(380px,92vw)', maxHeight: '90vh', overflow: 'hidden',
    background: '#fff', color: '#0d1514', border: '1px solid rgba(0,0,0,.08)',
    borderRadius: '16px', boxShadow: '0 18px 48px rgba(0,0,0,.18)',
    display: 'flex', flexDirection: 'column'
  });
  wrap.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:12px;border-bottom:1px solid rgba(0,0,0,.08)">
      <strong style="flex:1">Editor Pro v2</strong>
      <button id="atm-undo" title="Отменить" style="padding:6px 10px;border:0;border-radius:8px;background:#f0f4f3">↺</button>
      <button id="atm-redo" title="Повторить" style="padding:6px 10px;border:0;border-radius:8px;background:#f0f4f3">↻</button>
      <button id="atm-exit" style="padding:6px 12px;border:0;border-radius:8px;background:#0b5c55;color:#fff">Выйти</button>
    </div>
    <div style="display:flex;gap:6px;padding:10px;border-bottom:1px solid rgba(0,0,0,.06);flex-wrap:wrap">
      <button data-tab="inspector">🛠 Инспектор</button>
      <button data-tab="add">➕ Добавить</button>
      <button data-tab="theme">🌈 Тема</button>
      <button data-tab="export">⬇ Экспорт</button>
    </div>
    <div id="atm-body" style="padding:12px;overflow:auto;flex:1;display:grid;gap:12px"></div>
  `;
  wrap.querySelectorAll('button[data-tab]').forEach(btn => {
    btn.style.cssText = 'padding:8px 10px;border:0;border-radius:8px;background:#0b5c55;color:#fff;cursor:pointer';
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });
  wrap.querySelector('#atm-undo').onclick = undo;
  wrap.querySelector('#atm-redo').onclick = redo;
  wrap.querySelector('#atm-exit').onclick = () => { localStorage.removeItem(EDIT_FLAG); location.href = location.pathname; };
  document.body.append(wrap);
  return wrap;
}

function showTab(name) {
  if (name === 'add') paintAdd();
  else if (name === 'theme') paintTheme();
  else if (name === 'export') paintExport();
  else paintInspector(state.selected);
}

function ensureUid(el) {
  if (!el) return;
  if (!el.dataset.blockUid) {
    const uid = `block-${el.dataset.blockType || 'node'}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    el.dataset.blockUid = uid;
    el.setAttribute('data-block-uid', uid);
    el.dataset.blockSelector = `[data-block-uid="${uid}"]`;
  }
}

function row(label, control) {
  const wrap = document.createElement('div');
  css(wrap, { display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', alignItems: 'center' });
  const lab = document.createElement('label');
  lab.textContent = label;
  wrap.append(lab, control);
  return wrap;
}

function createInput(value, onChange, { multiline = false, type = 'text', placeholder = '' } = {}) {
  const el = multiline ? document.createElement('textarea') : document.createElement('input');
  if (!multiline) el.type = type;
  el.value = value ?? '';
  el.placeholder = placeholder;
  el.style.width = '100%';
  if (multiline) el.style.minHeight = '80px';
  el.addEventListener('input', () => { onChange(el.value); queueSync(); });
  return el;
}

function paintInspector(el) {
  body.replaceChildren();
  const hint = document.createElement('div');
  hint.textContent = el ? `Выбрано: ${el.dataset.blockType || el.tagName}` : 'Кликните по блоку, чтобы настроить его.';
  body.append(hint);
  if (!el) return;
  ensureUid(el);
  const type = el.dataset.blockType || '';
  if (type === 'hero') return paintHeroInspector(el);
  if (type === 'card') return paintCardInspector(el);
  if (type === 'testimonial') return paintTestimonialInspector(el);
  if (type === 'gallery_item') return paintGalleryInspector(el);
  if (type === 'button') return paintButtonInspector(el);
  if (type === 'h2' || type === 'paragraph') return paintTextInspector(el, type === 'h2');
  paintGenericInspector(el);
}

function paintGenericInspector(el) {
  if (!el) return;
  if (el.children.length === 0) {
    body.append(row('Текст', createInput(el.textContent.trim(), value => { el.textContent = value; }, { multiline: true })));
  } else {
    const note = document.createElement('p');
    note.textContent = 'Редактируйте текст прямо на странице (двойной клик).';
    body.append(note);
  }
  addAttributeEditors(el);
  maybeAddImageButton(el);
}

function paintHeroInspector(el) {
  const subtitle = el.querySelector('.subtitle');
  const title = el.querySelector('h1');
  const desc = el.querySelector('p:not(.subtitle)');
  const cta = el.querySelector('.btn.btn-primary, .btn-primary');
  const img = el.querySelector('img');
  if (subtitle) body.append(row('Подзаголовок', createInput(subtitle.textContent.trim(), v => { subtitle.textContent = v; })));
  if (title) body.append(row('Заголовок', createInput(title.textContent.trim(), v => { title.textContent = v; })));
  if (desc) body.append(row('Описание', createInput(desc.textContent.trim(), v => { desc.textContent = v; }, { multiline: true })));
  if (cta) {
    body.append(row('Текст кнопки', createInput(cta.textContent.trim(), v => { cta.textContent = v; })));
    body.append(row('Ссылка', createInput(cta.getAttribute('href') || '', v => { cta.setAttribute('href', v || '#'); })));
  }
  if (img) {
    const preview = document.createElement('img');
    preview.src = img.currentSrc || img.src;
    preview.style.maxWidth = '100%';
    preview.style.borderRadius = '10px';
    body.append(preview);
    body.append(createImageButton(img));
  }
  addAttributeEditors(el);
}

function paintCardInspector(el) {
  const title = el.querySelector('.card-title');
  const meta = el.querySelector('.card-meta');
  const link = el.querySelector('a');
  const img = el.querySelector('img');
  if (title) body.append(row('Название', createInput(title.textContent.trim(), v => { title.textContent = v; })));
  if (meta) body.append(row('Описание', createInput(meta.textContent.trim(), v => { meta.textContent = v; })));
  if (link) body.append(row('Ссылка', createInput(link.getAttribute('href') || '', v => { link.setAttribute('href', v || '#'); })));
  if (img) {
    const preview = document.createElement('img');
    preview.src = img.currentSrc || img.src;
    preview.style.maxWidth = '100%';
    preview.style.borderRadius = '10px';
    body.append(preview);
    body.append(createImageButton(img));
  }
  addAttributeEditors(el);
}

function paintTestimonialInspector(el) {
  const cite = el.querySelector('cite');
  const role = el.querySelector('.testimonial__role');
  const quote = el.querySelector('p');
  const result = el.querySelector('.card-meta');
  const img = el.querySelector('img');
  if (cite) body.append(row('Автор', createInput(cite.textContent.trim(), v => { cite.textContent = v; })));
  if (role) body.append(row('Роль', createInput(role.textContent.trim(), v => { role.textContent = v; })));
  if (quote) body.append(row('Цитата', createInput(quote.textContent.trim(), v => { quote.textContent = v; }, { multiline: true })));
  if (result) body.append(row('Результат', createInput(result.textContent.trim(), v => { result.textContent = v; }, { multiline: true })));
  if (img) {
    const preview = document.createElement('img');
    preview.src = img.currentSrc || img.src;
    preview.style.maxWidth = '80px';
    preview.style.borderRadius = '50%';
    body.append(preview);
    body.append(createImageButton(img));
  }
  addAttributeEditors(el);
}

function paintGalleryInspector(el) {
  const img = el.querySelector('img');
  body.append(row('Ссылка', createInput(el.getAttribute('href') || '', v => { el.setAttribute('href', v || '#'); })));
  body.append(row('Ширина', createInput(el.getAttribute('data-pswp-width') || '', v => { if (v) el.setAttribute('data-pswp-width', v); else el.removeAttribute('data-pswp-width'); })));
  body.append(row('Высота', createInput(el.getAttribute('data-pswp-height') || '', v => { if (v) el.setAttribute('data-pswp-height', v); else el.removeAttribute('data-pswp-height'); })));
  if (img) {
    body.append(row('Alt', createInput(img.getAttribute('alt') || '', v => { img.setAttribute('alt', v); })));
    const preview = document.createElement('img');
    preview.src = img.currentSrc || img.src;
    preview.style.maxWidth = '100%';
    preview.style.borderRadius = '10px';
    body.append(preview);
    body.append(createImageButton(img));
  }
  addAttributeEditors(el);
}

function paintButtonInspector(el) {
  body.append(row('Текст', createInput(el.textContent.trim(), v => { el.textContent = v; })));
  body.append(row('Ссылка', createInput(el.getAttribute('href') || '', v => { el.setAttribute('href', v || '#'); })));
  body.append(row('Классы', createInput(el.className || '', v => { el.className = v; })));
  addAttributeEditors(el);
}

function paintTextInspector(el, isHeading) {
  body.append(row(isHeading ? 'Заголовок' : 'Текст', createInput(el.textContent.trim(), v => { el.textContent = v; }, { multiline: !isHeading })));
  addAttributeEditors(el);
}

function addAttributeEditors(el) {
  ['id', 'class', 'href', 'src', 'alt', 'title'].forEach(name => {
    const current = el.getAttribute(name) || '';
    body.append(row(name, createInput(current, v => {
      if (v) el.setAttribute(name, v);
      else el.removeAttribute(name);
    })));
  });
}

function maybeAddImageButton(el) {
  if (el.tagName === 'IMG' || el.querySelector?.('img')) {
    const img = el.tagName === 'IMG' ? el : el.querySelector('img');
    if (img) body.append(createImageButton(img));
  }
}

function createImageButton(target) {
  const btn = document.createElement('button');
  btn.textContent = '🖼 Заменить изображение';
  btn.style.cssText = 'padding:8px 12px;border:0;border-radius:8px;background:#0b5c55;color:#fff;cursor:pointer';
  btn.onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const path = suggestImgPath(file);
      target.src = URL.createObjectURL(file);
      target.setAttribute('data-export-src', path);
      state.assets.set(path, file);
      queueSync();
    };
    input.click();
  };
  return btn;
}

function paintAdd() {
  body.replaceChildren();
  const hint = document.createElement('p');
  hint.textContent = 'Добавьте блок (H2, абзац, карточка и т.д.). Перетаскивайте элементы в сетках для изменения порядка.';
  body.append(hint);
  const items = [
    ['H2 раздела', () => createBlock('h2')],
    ['Абзац', () => createBlock('paragraph')],
    ['Кнопка', () => createBlock('button')],
    ['Карточка портфолио', () => createBlock('card')],
    ['Отзыв', () => createBlock('testimonial')],
    ['Элемент галереи', () => createBlock('gallery_item')]
  ];
  const list = document.createElement('div');
  css(list, { display: 'grid', gap: '8px' });
  items.forEach(([label, fn]) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = 'padding:10px 12px;border:0;border-radius:10px;background:#0b5c55;color:#fff;text-align:left;cursor:pointer';
    btn.onclick = fn;
    list.append(btn);
  });
  body.append(list);
}

function createBlock(type) {
  const plugin = Blocks[type];
  if (!plugin || !plugin.create) {
    alert('Шаблон блока не найден.');
    return null;
  }
  const el = plugin.create();
  if (!el) return null;
  el.dataset.blockType = type;
  ensureUid(el);
  let parent;
  if (type === 'card') {
    parent = state.selected?.closest('.portfolio-grid') || $('.portfolio-grid');
    if (!parent) return alert('Контейнер .portfolio-grid не найден.');
    parent.append(el);
    el.dataset.blockContainer = parent.dataset.blockContainer || '.portfolio-grid';
    parent.dataset.blockContainer = el.dataset.blockContainer;
  } else if (type === 'testimonial') {
    parent = state.selected?.closest('.testimonials-list') || $('.testimonials-list');
    if (!parent) return alert('Контейнер .testimonials-list не найден.');
    parent.append(el);
    el.dataset.blockContainer = parent.dataset.blockContainer || '.testimonials-list';
    parent.dataset.blockContainer = el.dataset.blockContainer;
  } else if (type === 'gallery_item') {
    parent = state.selected?.closest('.portfolio-grid, .gallery-grid') || $('.portfolio-grid') || $('.gallery-grid');
    if (!parent) return alert('Контейнер галереи не найден.');
    parent.append(el);
    el.dataset.blockContainer = parent.dataset.blockContainer || (parent.classList.contains('gallery-grid') ? '.gallery-grid' : '.portfolio-grid');
    parent.dataset.blockContainer = el.dataset.blockContainer;
  } else {
    const ref = state.selected?.closest('[data-block-type]');
    if (ref && ref.parentElement) ref.parentElement.insertBefore(el, ref.nextSibling);
    else editRoot.append(el);
  }
  enableSortables();
  select(el);
  syncStateFromDOM();
  showTab('inspector');
  return el;
}

function paintTheme() {
  body.replaceChildren();
  const theme = state.site.theme || (state.site.theme = {});
  const contacts = state.site.contacts || (state.site.contacts = {});
  const fields = [
    ['c_bg', 'Фон', 'color'],
    ['c_surface', 'Поверхность', 'color'],
    ['c_text', 'Текст', 'color'],
    ['c_muted', 'Muted', 'color'],
    ['c_primary', 'Primary', 'color'],
    ['c_primary_hover', 'Primary hover', 'color'],
    ['c_focus', 'Focus', 'color'],
    ['radius', 'Радиус'],
    ['maxw', 'Макс. ширина']
  ];
  fields.forEach(([key, label, type]) => {
    body.append(row(label, createInput(theme[key] || '', v => { theme[key] = v; applyTheme(); }, { type: type || 'text' })));
  });
  body.append(document.createElement('hr'));
  const contactsFields = [
    ['phone', 'Телефон'],
    ['email', 'Email'],
    ['whatsapp', 'WhatsApp'],
    ['telegram', 'Telegram']
  ];
  contactsFields.forEach(([key, label]) => {
    body.append(row(label, createInput(contacts[key] || '', v => { contacts[key] = v; applyContacts(); })));
  });
}

function paintExport() {
  body.replaceChildren();
  const info = document.createElement('p');
  info.textContent = 'Скачайте ZIP с HTML текущей страницы, JSON-данными и выбранными изображениями.';
  const btn = document.createElement('button');
  btn.textContent = '⬇ Экспорт ZIP';
  btn.style.cssText = 'padding:10px 14px;border:0;border-radius:10px;background:#0b5c55;color:#fff;cursor:pointer';
  btn.onclick = exportZip;
  const list = document.createElement('ul');
  list.style.paddingLeft = '20px';
  list.innerHTML = `
    <li>HTML: ${location.pathname.replace(/^.*\//, '') || 'index.html'}</li>
    <li>JSON: data/site.json, data/home.json, data/pages/${state.slug}.json</li>
    <li>Assets: ${state.assets.size} файл(ов)</li>`;
  body.append(info, btn, list);
}

async function exportZip() {
  await syncStateFromDOM({ pushHistory: false });
  const zip = new JSZip();
  const clone = document.documentElement.cloneNode(true);
  const editor = clone.querySelector('#atm-editor');
  if (editor) editor.remove();
  clone.querySelectorAll('[data-block-type]').forEach(node => {
    node.removeAttribute('contenteditable');
    node.removeAttribute('spellcheck');
    node.removeAttribute('data-block-uid');
    node.removeAttribute('data-block-type');
    node.removeAttribute('data-block-selector');
    node.removeAttribute('data-block-container');
  });
  clone.querySelectorAll('[style]').forEach(node => {
    if (node.style.outline) node.style.outline = '';
    if (node.style.outlineOffset) node.style.outlineOffset = '';
  });
  clone.querySelectorAll('img[data-export-src]').forEach(img => {
    const src = img.getAttribute('data-export-src');
    if (src) img.setAttribute('src', src);
    img.removeAttribute('data-export-src');
  });
  const html = '<!doctype html>
' + clone.outerHTML;
  const pageName = location.pathname.replace(/^.*\//, '') || 'index.html';
  zip.file(pageName, html);
  zip.file('data/site.json', JSON.stringify(state.site, null, 2));
  zip.file('data/home.json', JSON.stringify(state.home, null, 2));
  zip.file(`data/pages/${state.slug}.json`, JSON.stringify(state.ast, null, 2));
  for (const [path, file] of state.assets.entries()) {
    zip.file(path.replace(/^\//, ''), file);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `site-export-${state.slug}-${Date.now()}.zip`);
}

function applyTheme() {
  const map = { c_bg: '--c-bg', c_surface: '--c-surface', c_text: '--c-text', c_muted: '--c-muted', c_primary: '--c-primary', c_primary_hover: '--c-primary-hover', c_focus: '--c-focus', radius: '--radius', maxw: '--maxw' };
  Object.entries(map).forEach(([key, cssVar]) => {
    const val = state.site.theme?.[key];
    if (val) document.documentElement.style.setProperty(cssVar, String(val));
  });
}

function applyContacts() {
  const contacts = state.site.contacts || {};
  const set = (selector, value, prefix = '') => {
    if (!value) return;
    $all(selector).forEach(node => node.href = prefix + value);
  };
  set('a[href^="tel:"]', contacts.phone, 'tel:');
  set('a[href^="mailto:"]', contacts.email, 'mailto:');
  set('a[href^="https://wa.me/"]', contacts.whatsapp, 'https://wa.me/');
  set('a[href^="https://t.me/"]', contacts.telegram, 'https://t.me/');
}

function enableSortables() {
  if (typeof Sortable === 'undefined') return;
  const selectors = ['.portfolio-grid', '.testimonials-list', '.case-overview__grid'];
  selectors.forEach(sel => {
    $all(sel).forEach(container => {
      if (container.__sortable) return;
      container.__sortable = Sortable.create(container, {
        animation: 150,
        onEnd: () => queueSync()
      });
    });
  });
}

function enableClicks() {
  document.addEventListener('click', evt => {
    if (wrap.contains(evt.target)) return;
    const target = evt.target.closest('[data-block-type]') || evt.target;
    if (!evt.target.isContentEditable) {
      evt.preventDefault();
      evt.stopPropagation();
    }
    select(target);
  }, true);
}

function queueSync({ pushHistory = true } = {}) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncStateFromDOM({ pushHistory }), 350);
}

async function syncStateFromDOM({ pushHistory = true } = {}) {
  syncTimer = null;
  state.ast = collectAST(editRoot);
  state.dirty = true;
  if (pushHistory) pushHistorySnapshot();
}

function setupInputs() {
  document.addEventListener('input', evt => {
    if (wrap.contains(evt.target)) return;
    if (evt.target.isContentEditable) queueSync({ pushHistory: true });
  });
}

function setupMiniToolbar() {
  miniToolbar = document.createElement('div');
  miniToolbar.id = 'atm-mini-toolbar';
  css(miniToolbar, {
    position: 'absolute', padding: '6px', background: '#0b5c55', color: '#fff', borderRadius: '8px',
    display: 'none', gap: '6px', zIndex: 99998
  });
  ['bold', 'italic', 'link'].forEach(cmd => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = cmd === 'bold' ? 'B' : cmd === 'italic' ? 'I' : '🔗';
    btn.style.cssText = 'border:0;background:transparent;color:#fff;font-weight:600;cursor:pointer';
    btn.onmousedown = evt => evt.preventDefault();
    btn.onclick = () => {
      if (cmd === 'link') {
        const url = prompt('Ссылка:');
        if (url) document.execCommand('createLink', false, url);
      } else {
        document.execCommand(cmd, false, null);
      }
      queueSync();
    };
    miniToolbar.append(btn);
  });
  document.body.append(miniToolbar);
  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      miniToolbar.style.display = 'none';
      return;
    }
    const anchor = sel.anchorNode?.parentElement;
    if (!anchor?.closest('[contenteditable]')) {
      miniToolbar.style.display = 'none';
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    miniToolbar.style.display = 'flex';
    miniToolbar.style.left = `${rect.left + window.scrollX}px`;
    miniToolbar.style.top = `${rect.top + window.scrollY - miniToolbar.offsetHeight - 8}px`;
  });
}

function setupSlashMenu() {
  slashMenu = document.createElement('div');
  slashMenu.id = 'atm-slash-menu';
  css(slashMenu, {
    position: 'absolute', background: '#fff', border: '1px solid rgba(0,0,0,.12)', borderRadius: '10px',
    boxShadow: '0 16px 40px rgba(0,0,0,.16)', padding: '6px', display: 'none', zIndex: 99997
  });
  document.body.append(slashMenu);
  const options = [
    ['Заголовок H2', 'h2'],
    ['Абзац', 'paragraph'],
    ['Кнопка', 'button'],
    ['Карточка', 'card'],
    ['Отзыв', 'testimonial'],
    ['Галерея', 'gallery_item']
  ];
  document.addEventListener('keydown', evt => {
    if (evt.key !== '/' || !evt.target.isContentEditable) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed === false) return;
    evt.preventDefault();
    slashMenu.replaceChildren();
    options.forEach(([label, type]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.style.cssText = 'display:block;width:100%;padding:6px 10px;border:0;background:transparent;text-align:left;cursor:pointer';
      btn.onmouseenter = () => btn.style.background = '#f0f4f3';
      btn.onmouseleave = () => btn.style.background = 'transparent';
      btn.onclick = () => {
        slashMenu.style.display = 'none';
        const node = sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode.parentElement;
        const block = node?.closest('[data-block-type]') || state.selected;
        select(block);
        createBlock(type);
      };
      slashMenu.append(btn);
    });
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    slashMenu.style.left = `${rect.left + window.scrollX}px`;
    slashMenu.style.top = `${rect.bottom + window.scrollY + 8}px`;
    slashMenu.style.display = 'block';
  });
  document.addEventListener('click', evt => {
    if (!slashMenu.contains(evt.target)) slashMenu.style.display = 'none';
  });
}

async function init() {
  if (!isEdit) return;

  let libsOk = true;
  try {
    await ensureLibs();
  } catch (e) {
    libsOk = false;
    console.error('Libs load failed', e);
  }

  // Панель редактора должна появиться в любом случае
  wrap = inspectorUI();
  body = wrap.querySelector('#atm-body');
  updateHistoryButtons();

  // Данные
  state.site = await loadJSON('data/site.json');
  state.home = await loadJSON('data/home.json');

  let ast = await loadPageAST(state.slug);
  if (Array.isArray(ast) && ast.length) {
    state.ast = cloneAST(ast);
    renderBlocks(state.ast, editRoot);
  } else {
    state.ast = collectAST(editRoot);
  }

  const draft = checkDraft();
  if (draft?.ast?.length && confirm('Найден черновик. Восстановить?')) {
    state.ast = cloneAST(draft.ast);
    renderBlocks(state.ast, editRoot);
  }

  // Применяем «на лету»
  applyTheme();
  applyContacts();

  // Включаем DnD только если Sortable реально загрузился
  if (libsOk && typeof Sortable !== 'undefined') {
    enableSortables();
  }

  // Клики для выбора + стартовая вкладка
  enableClicks();
  setupInputs();
  setupMiniToolbar();
  setupSlashMenu();
  showTab('inspector');
  state.ast = collectAST(editRoot);
  pushHistorySnapshot();
  scheduleAutosave();
  window.addEventListener('beforeunload', saveDraft);
}

init();
