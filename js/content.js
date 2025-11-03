// js/content.js
import { fromData as renderBlocks, loadPageAST } from './blocks-core.js';
async function loadJSON(path) {
  const tryPaths = [path, path.replace(/^\//, '')];
  for (const p of tryPaths) {
    try {
      const res = await fetch(p, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (_) {}
  }
  return {};
}

// грузим данные (работает и с /data, и с data)
const site = await loadJSON('/data/site.json');
const home = await loadJSON('/data/home.json');

// 1) Тема -> CSS custom properties
const map = {
  c_bg: '--c-bg',
  c_surface: '--c-surface',
  c_text: '--c-text',
  c_muted: '--c-muted',
  c_primary: '--c-primary',
  c_primary_hover: '--c-primary-hover',
  c_focus: '--c-focus',
  radius: '--radius',
  maxw: '--maxw'
};
if (site.theme) {
  Object.entries(site.theme).forEach(([k, v]) => {
    if (map[k] && v) document.documentElement.style.setProperty(map[k], String(v));
  });
}

// 2) Контакты -> все повторяющиеся кнопки/ссылки
function setHref(selector, value, prefix = '') {
  if (!value) return;
  document.querySelectorAll(selector).forEach(a => { a.href = prefix + value; });
}
if (site.contacts) {
  setHref('a[href^="tel:"]', site.contacts.phone, 'tel:');
  setHref('a[href^="mailto:"]', site.contacts.email, 'mailto:');
  setHref('a[href^="https://wa.me/"]', site.contacts.whatsapp, 'https://wa.me/');
  setHref('a[href^="https://t.me/"]', site.contacts.telegram, 'https://t.me/');
}

// 3) Главная: hero-тексты и CTA, если блок существует
const hero = document.querySelector('.hero');
if (hero && home) {
  const sub = hero.querySelector('.subtitle');
  const h1 = hero.querySelector('h1');
  const cta = hero.querySelector('.btn.btn-primary, .btn-primary');

  if (sub && home.hero_subtitle) sub.textContent = home.hero_subtitle;
  if (h1 && home.hero_title) h1.textContent = home.hero_title;
  if (cta && home.cta_text) cta.textContent = home.cta_text;

  // hero image (если есть поле и <img> внутри .hero)
  {
    const heroEl = document.querySelector('.hero');
    if (heroEl) {
      const heroImg = heroEl.querySelector('img');
      if (heroImg && home.hero_image) {
        heroImg.src = home.hero_image;
        heroImg.loading = 'lazy';
        heroImg.decoding = 'async';
      }
    }
  }
}

// 4) Блоки из AST per page
function detectSlug() {
  let pathname = location.pathname;
  if (pathname.endsWith('/')) pathname += 'index.html';
  const parts = pathname.split('/').filter(Boolean);
  let last = parts.pop() || 'index.html';
  if (!/\.html$/i.test(last)) last += '.html';
  return last.replace(/\.html$/i, '') || 'index';
}

const pageRoot = document.querySelector('main') || document.body;
const slug = detectSlug();
try {
  const ast = await loadPageAST(slug);
  if (Array.isArray(ast) && ast.length) {
    renderBlocks(ast, pageRoot);
  }
} catch (err) {
  console.warn('content.js: failed to load AST', err);
}
