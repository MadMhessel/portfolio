<script type="module">
// Загружаем JSON
async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Не нашёл ${path}`);
  return await res.json();
}

const site = await loadJSON('/data/site.json').catch(() => loadJSON('data/site.json'));
const home = await loadJSON('/data/home.json').catch(() => loadJSON('data/home.json'));

// 1) Тема -> CSS переменные
const toVar = {
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
for (const [k, v] of Object.entries(site.theme || {})) {
  if (toVar[k]) document.documentElement.style.setProperty(toVar[k], v);
}

// 2) Контакты -> все кнопки на всех страницах
function setHref(selector, value, prefix='') {
  document.querySelectorAll(selector).forEach(a => {
    if (!value) return;
    a.href = prefix + value;
  });
}
setHref('a[href^="tel:"]', site.contacts?.phone, 'tel:');
setHref('a[href^="mailto:"]', site.contacts?.email, 'mailto:');
setHref('a[href^="https://wa.me/"]', site.contacts?.whatsapp, 'https://wa.me/');
setHref('a[href^="https://t.me/"]', site.contacts?.telegram, 'https://t.me/');

// 3) Главная: подзаголовок, заголовок, кнопка
const hero = document.querySelector('.hero');
if (hero) {
  const sub = hero.querySelector('.subtitle');
  const h1  = hero.querySelector('h1');
  const cta = hero.querySelector('.btn.btn-primary');

  if (sub && home.hero_subtitle) sub.textContent = home.hero_subtitle;
  if (h1 && home.hero_title) h1.textContent = home.hero_title;
  if (cta && home.cta_text) cta.textContent = home.cta_text;
}
</script>
