const TEXT_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'A']);

function ensureEditable(el) {
  if (!el) return;
  if (TEXT_TAGS.has(el.tagName)) {
    el.setAttribute('contenteditable', 'true');
    el.spellcheck = false;
  }
}

function query(root, selector) {
  if (!selector) return null;
  try {
    return root.querySelector(selector);
  } catch (err) {
    console.warn('blocks-core: selector failed', selector, err);
    return null;
  }
}

function setDataset(el, type, extra = {}) {
  if (!el) return;
  el.dataset.blockType = type;
  Object.entries(extra).forEach(([k, v]) => {
    if (v != null) el.dataset[k] = v;
  });
}

function createPicture(imgSrc, alt = '', width = 960, height = 640) {
  const picture = document.createElement('picture');
  const img = document.createElement('img');
  img.src = imgSrc || 'img/placeholder.png';
  img.alt = alt || '';
  if (width) img.width = width;
  if (height) img.height = height;
  img.loading = 'lazy';
  img.decoding = 'async';
  picture.append(img);
  return picture;
}

const Blocks = {
  hero: {
    selector: '.hero',
    fromData(blocks, root = document) {
      const block = blocks?.[0];
      const heroEl = block?.data?.selector ? query(root, block.data.selector) : root.querySelector('.hero');
      if (!block || !heroEl) return;
      setDataset(heroEl, 'hero', { blockSelector: block.data.selector || '.hero' });

      const subtitleEl = heroEl.querySelector('.subtitle');
      if (subtitleEl && block.data.subtitle != null) {
        subtitleEl.textContent = block.data.subtitle;
        ensureEditable(subtitleEl);
      }
      const titleEl = heroEl.querySelector('h1');
      if (titleEl && block.data.title != null) {
        titleEl.textContent = block.data.title;
        ensureEditable(titleEl);
      }
      const descEl = heroEl.querySelector('p:not(.subtitle)');
      if (descEl && block.data.description != null) {
        descEl.textContent = block.data.description;
        ensureEditable(descEl);
      }
      const ctaEl = heroEl.querySelector('.btn.btn-primary, .btn-primary');
      if (ctaEl) {
        if (block.data.cta_text != null) {
          ctaEl.textContent = block.data.cta_text;
          ensureEditable(ctaEl);
        }
        if (block.data.cta_href != null) {
          ctaEl.setAttribute('href', block.data.cta_href);
        }
        setDataset(ctaEl, 'button', { blockSelector: `${block.data.selector || '.hero'} .btn-primary` });
      }
      const img = heroEl.querySelector('img');
      if (img && block.data.image) {
        img.src = block.data.image;
        img.loading = 'lazy';
        img.decoding = 'async';
      }
    },
    toDataItem(el) {
      const subtitle = el.querySelector('.subtitle')?.textContent?.trim() || '';
      const title = el.querySelector('h1')?.textContent?.trim() || '';
      const desc = el.querySelector('p:not(.subtitle)')?.textContent?.trim() || '';
      const ctaEl = el.querySelector('.btn.btn-primary, .btn-primary');
      const image = el.querySelector('img')?.getAttribute('src') || '';
      const data = {
        subtitle,
        title,
        description: desc,
        cta_text: ctaEl?.textContent?.trim() || '',
        cta_href: ctaEl?.getAttribute('href') || '',
        image
      };
      if (el.dataset.blockSelector) data.selector = el.dataset.blockSelector;
      return data;
    }
  },
  h2: {
    selector: '.section-title, h2',
    fromData(blocks, root = document) {
      blocks?.forEach((block, index) => {
        const { data } = block;
        const target = data.selector ? query(root, data.selector) : root.querySelectorAll(this.selector)[index];
        if (!target) return;
        target.textContent = data.text ?? '';
        ensureEditable(target);
        setDataset(target, 'h2', { blockSelector: data.selector || undefined });
      });
    },
    toDataItem(el) {
      return { text: el.textContent?.trim() || '' };
    },
    create(data = {}) {
      const h2 = document.createElement('h2');
      h2.className = data.className || 'section-title';
      h2.textContent = data.text || 'Новый заголовок';
      ensureEditable(h2);
      setDataset(h2, 'h2');
      return h2;
    }
  },
  paragraph: {
    selector: 'p, .subtitle',
    fromData(blocks, root = document) {
      blocks?.forEach((block, index) => {
        const { data } = block;
        const target = data.selector ? query(root, data.selector) : root.querySelectorAll(this.selector)[index];
        if (!target) return;
        if (data.className) target.className = data.className;
        target.textContent = data.text ?? '';
        ensureEditable(target);
        setDataset(target, 'paragraph', {
          blockSelector: data.selector || undefined,
          blockClass: data.className || undefined
        });
      });
    },
    toDataItem(el) {
      return {
        text: el.textContent?.trim() || '',
        className: el.dataset.blockClass || el.className || ''
      };
    },
    create(data = {}) {
      const p = document.createElement('p');
      if (data.className) p.className = data.className;
      p.textContent = data.text || 'Новый абзац';
      ensureEditable(p);
      setDataset(p, 'paragraph', { blockClass: data.className || undefined });
      return p;
    }
  },
  button: {
    selector: 'a.btn, button.btn',
    fromData(blocks, root = document) {
      blocks?.forEach((block, index) => {
        const { data } = block;
        const target = data.selector ? query(root, data.selector) : root.querySelectorAll(this.selector)[index];
        if (!target) return;
        target.textContent = data.text ?? '';
        if (data.href != null) target.setAttribute('href', data.href);
        if (data.className) target.className = data.className;
        ensureEditable(target);
        setDataset(target, 'button', {
          blockSelector: data.selector || undefined,
          blockClass: data.className || undefined
        });
      });
    },
    toDataItem(el) {
      return {
        text: el.textContent?.trim() || '',
        href: el.getAttribute('href') || '',
        className: el.dataset.blockClass || el.className || ''
      };
    },
    create(data = {}) {
      const a = document.createElement('a');
      a.className = data.className || 'btn btn-primary';
      a.href = data.href || '#';
      a.textContent = data.text || 'Новая кнопка';
      ensureEditable(a);
      setDataset(a, 'button', { blockClass: a.className });
      return a;
    }
  },
  card: {
    selector: '.card',
    containers: ['.portfolio-grid', '.case-overview__grid'],
    ensureContainer(root, selector) {
      if (!selector) return null;
      return query(root, selector);
    },
    fromData(blocks, root = document) {
      if (!blocks || !blocks.length) return;
      const grouped = new Map();
      blocks.forEach((block, idx) => {
        const sel = block.data.container || this.containers.find(s => query(root, s));
        const container = this.ensureContainer(root, sel);
        if (!container) return;
        if (sel) container.dataset.blockContainer = sel;
        if (!grouped.has(container)) grouped.set(container, []);
        grouped.get(container).push({ block, index: idx });
      });
      grouped.forEach((items, container) => {
        container.querySelectorAll('[data-block-type="card"]').forEach(el => el.remove());
        items.sort((a, b) => a.index - b.index);
        items.forEach(({ block }) => {
          const el = this.create(block.data);
          if (!el) return;
          setDataset(el, 'card', { blockContainer: block.data.container || this.containers[0] });
          container.append(el);
        });
      });
    },
    toDataItem(el) {
      const link = el.querySelector('a.card-link, a.card, a');
      const img = el.querySelector('img');
      const title = el.querySelector('.card-title, h3');
      const meta = el.querySelector('.card-meta');
      return {
        title: title?.textContent?.trim() || '',
        meta: meta?.textContent?.trim() || '',
        href: link?.getAttribute('href') || '',
        img: img?.getAttribute('src') || '',
        alt: img?.getAttribute('alt') || '',
        container: el.dataset.blockContainer || (el.parentElement?.dataset.blockContainer) || ''
      };
    },
    create(data = {}) {
      const article = document.createElement('article');
      article.className = data.className || 'card';
      const link = document.createElement('a');
      link.className = 'card-link';
      link.href = data.href || '#';

      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      const picture = createPicture(data.img || 'img/placeholder.png', data.alt || '', data.width || 960, data.height || 640);
      thumb.append(picture);

      const info = document.createElement('div');
      const title = document.createElement('h3');
      title.className = 'card-title';
      title.textContent = data.title || 'Новый проект';
      ensureEditable(title);
      const meta = document.createElement('p');
      meta.className = 'card-meta';
      meta.textContent = data.meta || 'Город · площадь';
      ensureEditable(meta);

      info.append(title, meta);
      link.append(thumb, info);
      article.append(link);
      return article;
    }
  },
  testimonial: {
    selector: '.testimonial',
    containerSelectors: ['.testimonials-list'],
    fromData(blocks, root = document) {
      if (!blocks || !blocks.length) return;
      const grouped = new Map();
      blocks.forEach((block, idx) => {
        const sel = block.data.container || this.containerSelectors.find(s => query(root, s));
        const container = sel ? query(root, sel) : null;
        if (!container) return;
        if (sel) container.dataset.blockContainer = sel;
        if (!grouped.has(container)) grouped.set(container, []);
        grouped.get(container).push({ block, index: idx });
      });
      grouped.forEach((items, container) => {
        container.querySelectorAll('[data-block-type="testimonial"]').forEach(el => el.remove());
        items.sort((a, b) => a.index - b.index);
        items.forEach(({ block }) => {
          const el = this.create(block.data);
          if (!el) return;
          setDataset(el, 'testimonial', { blockContainer: block.data.container || this.containerSelectors[0] });
          container.append(el);
        });
      });
    },
    toDataItem(el) {
      const cite = el.querySelector('cite');
      const role = el.querySelector('.testimonial__role');
      const quote = el.querySelector('p');
      const result = el.querySelector('.card-meta');
      const avatar = el.querySelector('img');
      return {
        author: cite?.textContent?.trim() || '',
        role: role?.textContent?.trim() || '',
        quote: quote?.textContent?.trim() || '',
        result: result?.textContent?.trim() || '',
        avatar: avatar?.getAttribute('src') || '',
        alt: avatar?.getAttribute('alt') || '',
        container: el.dataset.blockContainer || this.containerSelectors[0]
      };
    },
    create(data = {}) {
      const article = document.createElement('article');
      article.className = 'testimonial';
      const header = document.createElement('div');
      header.className = 'testimonial__header';
      const avatarWrap = document.createElement('span');
      avatarWrap.className = 'testimonial__avatar';
      const img = document.createElement('img');
      img.src = data.avatar || 'img/clients/placeholder.svg';
      img.width = 56;
      img.height = 56;
      img.alt = data.alt || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      avatarWrap.append(img);

      const info = document.createElement('div');
      const cite = document.createElement('cite');
      cite.textContent = data.author || 'Имя клиента';
      ensureEditable(cite);
      const role = document.createElement('p');
      role.className = 'testimonial__role';
      role.textContent = data.role || 'Роль/описание';
      ensureEditable(role);
      info.append(cite, role);

      header.append(avatarWrap, info);

      const quote = document.createElement('p');
      quote.textContent = data.quote || 'Текст отзыва…';
      ensureEditable(quote);
      const result = document.createElement('p');
      result.className = 'card-meta';
      result.textContent = data.result || 'Короткий результат…';
      ensureEditable(result);

      article.append(header, quote, result);
      return article;
    }
  },
  gallery_item: {
    selector: '.card.gallery',
    containerSelectors: ['.portfolio-grid', '.gallery-grid'],
    fromData(blocks, root = document) {
      if (!blocks || !blocks.length) return;
      const grouped = new Map();
      blocks.forEach((block, idx) => {
        const sel = block.data.container || this.containerSelectors.find(s => query(root, s));
        const container = sel ? query(root, sel) : null;
        if (!container) return;
        if (sel) container.dataset.blockContainer = sel;
        if (!grouped.has(container)) grouped.set(container, []);
        grouped.get(container).push({ block, index: idx });
      });
      grouped.forEach((items, container) => {
        container.querySelectorAll('[data-block-type="gallery_item"]').forEach(el => el.remove());
        items.sort((a, b) => a.index - b.index);
        items.forEach(({ block }) => {
          const el = this.create(block.data);
          if (!el) return;
          setDataset(el, 'gallery_item', { blockContainer: block.data.container || this.containerSelectors[0] });
          container.append(el);
        });
      });
    },
    toDataItem(el) {
      const img = el.querySelector('img');
      return {
        href: el.getAttribute('href') || '',
        img: img?.getAttribute('src') || '',
        alt: img?.getAttribute('alt') || '',
        width: Number(el.getAttribute('data-pswp-width') || img?.width || 0),
        height: Number(el.getAttribute('data-pswp-height') || img?.height || 0),
        container: el.dataset.blockContainer || this.containerSelectors[0]
      };
    },
    create(data = {}) {
      const link = document.createElement('a');
      link.className = 'card gallery';
      link.href = data.href || '#';
      if (data.width) link.setAttribute('data-pswp-width', data.width);
      if (data.height) link.setAttribute('data-pswp-height', data.height);
      const thumb = document.createElement('span');
      thumb.className = 'thumb';
      const img = document.createElement('img');
      img.src = data.img || 'img/placeholder.png';
      img.alt = data.alt || '';
      if (data.width) img.width = data.width;
      if (data.height) img.height = data.height;
      img.loading = 'lazy';
      img.decoding = 'async';
      thumb.append(img);
      link.append(thumb);
      return link;
    }
  }
};

export async function loadPageAST(slug) {
  const path = `data/pages/${slug}.json`;
  try {
    const res = await fetch(path, { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('blocks-core: cannot load AST', path, err);
  }
  return [];
}

export function fromData(ast = [], root = document) {
  if (!Array.isArray(ast)) return;
  const grouped = ast.reduce((acc, block, index) => {
    if (!block || !block.type || !Blocks[block.type]) return acc;
    if (!acc[block.type]) acc[block.type] = [];
    acc[block.type].push({ ...block, index });
    return acc;
  }, {});
  Object.entries(grouped).forEach(([type, blocks]) => {
    try {
      Blocks[type].fromData(blocks, root);
    } catch (err) {
      console.error('blocks-core: fromData failed for', type, err);
    }
  });
}

export function toData(root = document) {
  const ast = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      return node.dataset?.blockType ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  let current;
  while ((current = walker.nextNode())) {
    const type = current.dataset.blockType;
    const plugin = Blocks[type];
    if (!plugin || !plugin.toDataItem) continue;
    try {
      const data = plugin.toDataItem(current, root);
      if (!data) continue;
      if (current.dataset.blockSelector) data.selector = current.dataset.blockSelector;
      if (current.dataset.blockContainer) data.container = current.dataset.blockContainer;
      ast.push({ type, data });
    } catch (err) {
      console.error('blocks-core: toData failed for', type, err);
    }
  }
  return ast;
}

export function cloneAST(ast) {
  return JSON.parse(JSON.stringify(ast || []));
}

export { Blocks };
