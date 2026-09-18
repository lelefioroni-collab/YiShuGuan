/* =========================================================
   app.js — core: i18n, page chrome, shared UI
   No build step, no dependencies. Works with a plain static server.
   ========================================================= */

const Site = (() => {
  const LANG_KEY = 'yishuguan.lang';
  const CACHE = {};

  /* ---------- utils ---------- */
  const qs  = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const esc = (str = '') => String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  async function loadJSON(path) {
    if (CACHE[path]) return CACHE[path];
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
    let data = await res.json();
    // entries carry an "order" ID (10, 20, 30…): lower = earlier in the grid.
    // Entries without an order keep their file position, after ordered ones.
    if (Array.isArray(data)) {
      data = data.slice().sort((a, b) =>
        (Number.isFinite(a.order) ? a.order : Infinity) - (Number.isFinite(b.order) ? b.order : Infinity));
    }
    CACHE[path] = data;
    return data;
  }

  /* ---------- language ---------- */
  function detectLang() {
    const saved = (() => { try { return localStorage.getItem(LANG_KEY); } catch (e) { return null; } })();
    if (saved === 'en' || saved === 'zh') return saved;
    const nav = (navigator.language || 'en').toLowerCase();
    return nav.startsWith('zh') ? 'zh' : 'en';
  }

  let lang = 'en';

  // pick a value out of a { en, zh } object, falling back gracefully
  const pick = (obj, l = lang) => {
    if (obj == null) return '';
    if (typeof obj === 'string') return obj;
    return obj[l] || obj.en || obj.zh || '';
  };

  function applyI18n(root = document) {
    qsa('[data-en]', root).forEach((el) => {
      const val = el.dataset[lang] || el.dataset.en;
      if (val != null) el.textContent = val;
    });
    qsa('[data-en-alt]', root).forEach((el) => {
      const val = el.dataset[lang + 'Alt'] || el.dataset.enAlt;
      if (val != null) el.setAttribute('alt', val);
    });
    // document title: <body data-title-en="..." data-title-zh="...">
    const b = document.body;
    const title = b.dataset['title' + (lang === 'zh' ? 'Zh' : 'En')];
    if (title) document.title = title;
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : 'en';
    qsa('[data-lang]').forEach((el) => {
      el.classList.toggle('is-on', el.dataset.lang === lang);
    });
    // fonts / line-height tuning for CJK
    document.documentElement.dataset.lang = lang;
  }

  function setLang(next) {
    lang = next === 'zh' ? 'zh' : 'en';
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
    applyI18n();
    document.dispatchEvent(new CustomEvent('site:langchange', { detail: { lang } }));
  }

  /* ---------- header / footer chrome ---------- */
  function buildChrome(site) {
    const nav = site.nav || [];
    const page = document.body.dataset.page || '';
    const navHTML = nav.map((item) => {
      const active = item.id === page ? ' is-active' : '';
      return `<a href="${item.href}" class="${active.trim()}" data-en="${esc(item.en)}" data-zh="${esc(item.zh)}">${esc(item.en)}</a>`;
    }).join('');

    const header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML = `
      <div class="site-header__inner">
        <a class="brand" href="index.html" aria-label="${esc(site.brand.latin)}">
          <span class="brand__mark" data-en="${esc(site.brand.zh)}" data-zh="${esc(site.brand.zh)}">${esc(site.brand.zh)}</span>
          <span class="brand__latin">${esc(site.brand.latin)}</span>
        </a>
        <button class="menu-btn" id="menuBtn" aria-label="Menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
        <nav class="nav" id="nav">${navHTML}</nav>
        <button class="lang-toggle" id="langToggle" aria-label="Switch language">
          <span data-lang="en">EN</span><i>/</i><span data-lang="zh">中文</span>
        </button>
      </div>`;
    document.body.prepend(header);

    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = `
      <div class="wrap">
        <div class="footer-grid">
          <div>
            <p class="eyebrow" data-en="Let us build something" data-zh="一起做点什么">Let us build something</p>
            <h2 class="footer-title" style="margin-top:14px"
                data-en="${esc(site.footer.headline_en)}" data-zh="${esc(site.footer.headline_zh)}">${esc(site.footer.headline_en)}</h2>
            <p class="lead" style="margin-top:18px" data-en="${esc(site.footer.sub_en)}" data-zh="${esc(site.footer.sub_zh)}">${esc(site.footer.sub_en)}</p>
          </div>
          <div class="footer-col">
            <h4 data-en="Menu" data-zh="目录">Menu</h4>
            <ul>${nav.map((i) => `<li><a href="${i.href}" data-en="${esc(i.en)}" data-zh="${esc(i.zh)}">${esc(i.en)}</a></li>`).join('')}</ul>
          </div>
          <div class="footer-col">
            <h4 data-en="Contact" data-zh="联系方式">Contact</h4>
            <ul>
              <li><a href="mailto:${esc(site.contact.email)}">${esc(site.contact.email)}</a></li>
              <li><a href="tel:${esc(site.contact.phone_raw)}">${esc(site.contact.phone)}</a></li>
              ${(site.social || []).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join('')}
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>&copy; ${new Date().getFullYear()} ${esc(site.brand.latin)}. <span data-en="All rights reserved." data-zh="保留所有权利。">All rights reserved.</span></span>
          <span data-en="${esc(site.footer.location_en)}" data-zh="${esc(site.footer.location_zh)}">${esc(site.footer.location_en)}</span>
        </div>
      </div>`;
    document.body.appendChild(footer);

    // draft flag: visible reminder that copy and images are placeholders.
    // Set "draft": false in data/site.json to remove it before launch.
    if (site.draft !== false) {
      const badge = document.createElement('div');
      badge.className = 'draft-badge';
      badge.innerHTML = `<span data-en="Draft — placeholder copy &amp; images" data-zh="草稿 — 文案与图片为占位内容">Draft — placeholder copy &amp; images</span>
        <button aria-label="Dismiss">&times;</button>`;
      badge.querySelector('button').addEventListener('click', () => badge.remove());
      document.body.appendChild(badge);
    }

    // interactions
    const menuBtn = qs('#menuBtn');
    const navEl = qs('#nav');
    menuBtn.addEventListener('click', () => {
      const open = navEl.classList.toggle('is-open');
      menuBtn.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    navEl.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') { navEl.classList.remove('is-open'); menuBtn.classList.remove('is-open'); }
    });
    qs('#langToggle').addEventListener('click', () => setLang(lang === 'en' ? 'zh' : 'en'));

    // sticky header state
    const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- lightbox ---------- */
  function buildLightbox() {
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.innerHTML = `
      <button class="lightbox__close" aria-label="Close">&times;</button>
      <button class="lightbox__nav lightbox__nav--prev" aria-label="Previous">&#8249;</button>
      <img alt="">
      <button class="lightbox__nav lightbox__nav--next" aria-label="Next">&#8250;</button>`;
    document.body.appendChild(box);

    const imgEl = qs('img', box);
    let list = [], idx = 0;

    const show = (i) => {
      idx = (i + list.length) % list.length;
      imgEl.src = list[idx].src;
      imgEl.alt = list[idx].alt || '';
    };
    const close = () => { box.classList.remove('is-open'); document.body.classList.remove('is-locked'); };

    qs('.lightbox__close', box).addEventListener('click', close);
    qs('.lightbox__nav--prev', box).addEventListener('click', (e) => { e.stopPropagation(); show(idx - 1); });
    qs('.lightbox__nav--next', box).addEventListener('click', (e) => { e.stopPropagation(); show(idx + 1); });
    box.addEventListener('click', (e) => { if (e.target === box) close(); });
    document.addEventListener('keydown', (e) => {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });

    return {
      open(items, i) { list = items; show(i); box.classList.add('is-open'); document.body.classList.add('is-locked'); },
    };
  }

  /* ---------- reveal on scroll ---------- */
  function initReveal(root = document) {
    const items = qsa('.reveal:not(.is-in)', root);
    if (!('IntersectionObserver' in window)) { items.forEach((i) => i.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach((i) => io.observe(i));
  }

  /* ---------- shared renderers ---------- */
  // tile markup: square image, darkens on hover, title appears
  function tileHTML(item, href, opts = {}) {
    const title = pick(item.title);
    const cat = opts.catLabel || '';
    const sub = opts.subLabel || '';
    const cover = item.cover || '';
    const index = opts.index != null ? String(opts.index).padStart(2, '0') : '';
    return `
      <a class="tile" href="${href}" aria-label="${esc(title)}">
        ${cover ? `<img class="tile__img" src="${esc(cover)}" alt="${esc(title)}" loading="lazy" data-en-alt="${esc(item.title.en)}" data-zh-alt="${esc(item.title.zh)}">` : ''}
        <span class="tile__veil"></span>
        ${index ? `<span class="tile__index">${index}</span>` : ''}
        <span class="tile__body">
          ${cat ? `<span class="tile__cat">${esc(cat)}</span>` : ''}
          <span class="tile__title">${esc(title)}</span>
          ${sub ? `<span class="tile__year">${esc(sub)}</span>` : ''}
        </span>
      </a>`;
  }

  function renderGrid(container, items, buildHref, opts = {}) {
    if (!items.length) {
      container.innerHTML = `<div class="empty-state" data-en="Nothing here yet." data-zh="暂无内容。">Nothing here yet.</div>`;
      applyI18n(container);
      return;
    }
    container.innerHTML = items.map((item) =>
      tileHTML(item, buildHref(item), {
        ...opts,
        catLabel: opts.catLabel ? opts.catLabel(item) : '',
        subLabel: opts.subLabel ? opts.subLabel(item) : '',
      })
    ).join('');
    applyI18n(container);
    initReveal(container);
  }

  /* ---------- boot ---------- */
  async function boot() {
    lang = detectLang();
    let site;
    try {
      site = await loadJSON('data/site.json');
    } catch (err) {
      console.error(err);
      document.body.insertAdjacentHTML('afterbegin',
        `<div style="padding:120px 24px;font:14px/1.6 sans-serif;color:#f4f3ef;background:#0a0a0b">
           <strong>Content could not be loaded.</strong><br>
           This site reads its content from <code>data/*.json</code>, so it must be served over http — not opened directly as a file.<br>
           Run <code>./start-local.command</code> (or <code>python3 -m http.server 4173</code>) inside the <code>site</code> folder and open
           <code>http://localhost:4173</code>.
         </div>`);
      return;
    }
    window.SITE = site;
    buildChrome(site);
    window.Lightbox = buildLightbox();
    applyI18n();
    document.addEventListener('site:langchange', () => {
      applyI18n();
      document.dispatchEvent(new CustomEvent('site:rerender'));
    });
    initReveal();
    document.dispatchEvent(new CustomEvent('site:ready', { detail: { site } }));
  }

  return {
    boot, loadJSON, pick, esc, qs, qsa, applyI18n, initReveal, renderGrid, tileHTML,
    get lang() { return lang; },
    setLang,
  };
})();

document.addEventListener('DOMContentLoaded', Site.boot);
