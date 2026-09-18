/* =========================================================
   pages.js — page-specific rendering
   Each page renders from data/*.json so content lives in one place.
   ========================================================= */

const Pages = (() => {
  const { qs, qsa, pick, esc, renderGrid, applyI18n, initReveal, loadJSON } = Site;

  /* ---------- HOME ---------- */
  async function home() {
    // hero image is a setting, not markup — swap it from data/site.json
    const heroImg = qs('#heroImg');
    if (heroImg && window.SITE.hero && window.SITE.hero.image) {
      heroImg.src = window.SITE.hero.image;
      heroImg.alt = pick({ en: window.SITE.hero.alt_en, zh: window.SITE.hero.alt_zh });
    }

    const [projects, artworks] = await Promise.all([
      loadJSON('data/projects.json'),
      loadJSON('data/artworks.json'),
    ]);

    const featured = projects.filter((p) => p.featured !== false).slice(0, 6);
    const grid = qs('#featuredGrid');
    if (grid) {
      renderGrid(grid, featured, (p) => `project.html?type=project&slug=${encodeURIComponent(p.slug)}`, {
        catLabel: (p) => catLabel(p.category),
      });
    }

    const artGrid = qs('#homeArtGrid');
    if (artGrid) {
      renderGrid(artGrid, artworks.slice(0, 3), (a) => `project.html?type=art&slug=${encodeURIComponent(a.slug)}`, {
        catLabel: (a) => pick(a.medium),
      });
    }
  }

  function catLabel(id) {
    const s = (window.SITE.services || []).find((x) => x.id === id);
    return s ? pick(s.title) : id;
  }

  /* ---------- SERVICES ---------- */
  async function services() {
    const box = qs('#serviceGrid');
    if (!box) return;
    box.innerHTML = (window.SITE.services || []).map((s, i) => `
      <article class="svc reveal" style="transition-delay:${i * 70}ms">
        <span class="svc__no">${String(i + 1).padStart(2, '0')}</span>
        <h3 class="h3 svc__title" data-en="${esc(s.title.en)}" data-zh="${esc(s.title.zh)}">${esc(s.title.en)}</h3>
        <p class="svc__desc" data-en="${esc(s.desc.en)}" data-zh="${esc(s.desc.zh)}">${esc(s.desc.en)}</p>
        <ul class="svc__tags">
          ${(s.tags || []).map((t) => `<li data-en="${esc(t.en)}" data-zh="${esc(t.zh)}">${esc(t.en)}</li>`).join('')}
        </ul>
        <a class="svc__link" href="${esc(s.href)}" data-en="${esc(s.link_en || 'See work')}" data-zh="${esc(s.link_zh || '查看作品')}">${esc(s.link_en || 'See work')}</a>
      </article>`).join('');
    applyI18n(box);
    initReveal(box);
  }

  /* ---------- PORTFOLIO ---------- */
  async function portfolio() {
    const items = await loadJSON('data/projects.json');
    const grid = qs('#portfolioGrid');
    const filterBox = qs('#portfolioFilters');
    if (!grid) return;

    // only offer filters for categories that actually have work
    const used = Array.from(new Set(items.map((i) => i.category)));
    const cats = (window.SITE.services || []).filter((s) => used.includes(s.id));

    const params = new URLSearchParams(location.search);
    let active = params.get('category') || 'all';

    function paint() {
      const list = active === 'all' ? items : items.filter((i) => i.category === active);
      renderGrid(grid, list, (p) => `project.html?type=project&slug=${encodeURIComponent(p.slug)}`, {
        catLabel: (p) => catLabel(p.category),
        subLabel: (p) => p.year,
      });
      qsa('button', filterBox).forEach((b) => b.classList.toggle('is-on', b.dataset.cat === active));
    }

    filterBox.innerHTML = [
      `<button data-cat="all" data-en="All" data-zh="全部">All</button>`,
      ...cats.map((c) => `<button data-cat="${esc(c.id)}" data-en="${esc(c.title.en)}" data-zh="${esc(c.title.zh)}">${esc(c.title.en)}</button>`),
    ].join('');
    applyI18n(filterBox);

    filterBox.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      active = btn.dataset.cat;
      const url = active === 'all' ? location.pathname : `${location.pathname}?category=${active}`;
      history.replaceState(null, '', url);
      paint();
    });

    document.addEventListener('site:rerender', paint);
    paint();
  }

  /* ---------- ART ---------- */
  function artCatPair(id) {
    const c = (window.SITE.artCategories || []).find((x) => x.id === id);
    return c ? { en: c.en, zh: c.zh } : { en: id || '', zh: id || '' };
  }

  async function art() {
    const items = await loadJSON('data/artworks.json');
    const grid = qs('#artGrid');
    const filterBox = qs('#artFilters');
    if (!grid) return;

    const used = Array.from(new Set(items.map((a) => a.category).filter(Boolean)));
    const cats = (window.SITE.artCategories || []).filter((c) => used.includes(c.id));

    let active = new URLSearchParams(location.search).get('category') || 'all';

    if (filterBox && cats.length) {
      filterBox.innerHTML = [
        `<button data-cat="all" data-en="All" data-zh="全部">All</button>`,
        ...cats.map((c) => `<button data-cat="${esc(c.id)}" data-en="${esc(c.en)}" data-zh="${esc(c.zh)}">${esc(c.en)}</button>`),
      ].join('');
      applyI18n(filterBox);
      filterBox.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        active = btn.dataset.cat;
        const url = active === 'all' ? location.pathname : `${location.pathname}?category=${active}`;
        history.replaceState(null, '', url);
        paint();
      });
    }

    function paint() {
      const list = active === 'all' ? items : items.filter((a) => a.category === active);
      renderGrid(grid, list,
        (a) => `project.html?type=art&slug=${encodeURIComponent(a.slug)}`,
        { catLabel: (a) => pick(a.medium), subLabel: (a) => [a.size, a.year].filter(Boolean).join(' \u00b7 ') });
      if (filterBox) qsa('button', filterBox).forEach((b) => b.classList.toggle('is-on', b.dataset.cat === active));
    }

    document.addEventListener('site:rerender', paint);
    paint();
  }

  /* ---------- PROJECT / ARTWORK DETAIL ---------- */
  async function detail() {
    const root = qs('#detail');
    if (!root) return;
    const params = new URLSearchParams(location.search);
    const type = params.get('type') === 'art' ? 'art' : 'project';
    const slug = params.get('slug');

    const file = type === 'art' ? 'data/artworks.json' : 'data/projects.json';
    const items = await loadJSON(file);
    const i = items.findIndex((x) => x.slug === slug);

    if (i === -1) {
      root.innerHTML = `
        <div class="empty-state">
          <p class="h3" data-en="This item could not be found." data-zh="没有找到这个项目。">This item could not be found.</p>
          <p><a class="backlink" href="${type === 'art' ? 'art.html' : 'portfolio.html'}"
                data-en="Back to the index" data-zh="返回列表">Back to the index</a></p>
        </div>`;
      applyI18n(root);
      return;
    }

    const item = items[i];
    const next = items[(i + 1) % items.length];
    const listHref = type === 'art' ? 'art.html' : 'portfolio.html';
    // cover first, then the rest of the gallery, no duplicates
    const gallery = [...new Set([item.cover, ...(item.gallery || [])].filter(Boolean))];

    const metaRows = type === 'art'
      ? [
        { label: { en: 'Category', zh: '类别' }, value: artCatPair(item.category) },
        { label: { en: 'Medium', zh: '材质' }, value: item.medium },
        { label: { en: 'Size', zh: '尺寸' }, value: item.size },
        { label: { en: 'Year', zh: '年份' }, value: item.year },
        { label: { en: 'Availability', zh: '状态' }, value: item.status },
      ]
      : [
        { label: { en: 'Client', zh: '客户' }, value: item.client },
        { label: { en: 'Service', zh: '服务' }, value: { en: catLabel(item.category), zh: catLabel(item.category) } },
        { label: { en: 'Scope', zh: '工作范围' }, value: Array.isArray(item.scope) ? item.scope.join(' / ') : item.scope },
        { label: { en: 'Year', zh: '年份' }, value: item.year },
        { label: { en: 'Location', zh: '地点' }, value: item.location },
      ];

    root.innerHTML = `
      <div class="wrap">
        <a class="backlink" href="${listHref}" data-en="${type === 'art' ? 'Back to artworks' : 'Back to portfolio'}"
           data-zh="${type === 'art' ? '返回艺术作品' : '返回作品集'}">${type === 'art' ? 'Back to artworks' : 'Back to portfolio'}</a>

        <p class="eyebrow" data-en="${esc(item.eyebrow_en || '')}" data-zh="${esc(item.eyebrow_zh || '')}">${esc(item.eyebrow_en || '')}</p>
        <h1 class="detail-title" id="detailTitle" data-en="${esc(item.title.en)}" data-zh="${esc(item.title.zh)}">${esc(item.title.en)}</h1>
        <p class="detail-sub" id="detailSub" data-en="${esc(pick({ en: item.subtitle && item.subtitle.en, zh: item.subtitle && item.subtitle.zh }, 'en'))}"
           data-zh="${esc(pick(item.subtitle, 'zh'))}">${esc(pick(item.subtitle, 'en'))}</p>

        ${item.cover ? `<div class="detail-hero__media reveal"><img src="${esc(item.cover)}" alt="${esc(item.title.en)}" data-en-alt="${esc(item.title.en)}" data-zh-alt="${esc(item.title.zh)}"></div>` : ''}

        <div class="grid-2" style="margin-top:clamp(36px,5vw,72px);align-items:start">
          <div class="prose" id="detailBody">${(item.body?.en || []).map((p) => `<p>${esc(p)}</p>`).join('')}</div>
          <dl class="meta-table" style="margin-top:0">
            ${metaRows.map((r) => `
              <div class="meta-row">
                <dt data-en="${esc(r.label.en)}" data-zh="${esc(r.label.zh)}">${esc(r.label.en)}</dt>
                <dd data-en="${esc(pick(r.value, 'en'))}" data-zh="${esc(pick(r.value, 'zh'))}">${esc(pick(r.value, 'en'))}</dd>
              </div>`).join('')}
          </dl>
        </div>

        <section class="section--tight">
          <div class="gallery ${gallery.length === 1 ? 'gallery--single' : ''}" id="detailGallery">
            ${gallery.map((src, gi) => `
              <figure class="reveal" data-index="${gi}">
                <img src="${esc(src)}" alt="${esc(item.title.en)} ${gi + 1}" loading="lazy"
                     data-en-alt="${esc(item.title.en)} — ${gi + 1}" data-zh-alt="${esc(item.title.zh)} — ${gi + 1}">
              </figure>`).join('')}
          </div>
        </section>

        <section class="next-project">
          <div>
            <p class="mono-label" data-en="Next" data-zh="下一个">Next</p>
            <a class="next-project__link" href="project.html?type=${type}&slug=${encodeURIComponent(next.slug)}">
              ${next.cover ? `<img src="${esc(next.cover)}" alt="">` : ''}
              <span class="h3" data-en="${esc(next.title.en)}" data-zh="${esc(next.title.zh)}">${esc(next.title.en)}</span>
            </a>
          </div>
          <a class="backlink" style="margin:0" href="${listHref}" data-en="See all" data-zh="查看全部">See all</a>
        </section>
      </div>`;

    // body copy is bilingual and re-renders on language switch
    const paintBody = () => {
      const body = qs('#detailBody');
      if (body) body.innerHTML = (pick(item.body) || []).map((p) => `<p>${esc(p)}</p>`).join('');
      const t = pick(item.title);
      document.title = `${t} — ${window.SITE.brand.latin}`;
    };
    paintBody();
    document.addEventListener('site:langchange', paintBody);
    document.addEventListener('site:rerender', paintBody);

    // lightbox
    const figures = qsa('#detailGallery figure');
    figures.forEach((fig) => fig.addEventListener('click', () => {
      const images = gallery.map((src, gi) => ({ src, alt: `${item.title.en} ${gi + 1}` }));
      window.Lightbox.open(images, Number(fig.dataset.index));
    }));

    applyI18n(root);
    initReveal(root);
  }

  /* ---------- CONTACT ---------- */
  async function contact() {
    const list = qs('#socialList');
    const site = window.SITE;
    if (list) {
      list.innerHTML = (site.social || []).map((s) => `
        <li>
          <a href="${esc(s.url)}" target="_blank" rel="noopener">
            <span>${esc(s.label)}</span>
            <span class="handle">${esc(s.handle || '')}</span>
          </a>
        </li>`).join('');
    }
    const addr = qs('#addressText');
    if (addr) {
      addr.dataset.en = site.contact.address_en;
      addr.dataset.zh = site.contact.address_zh;
      addr.textContent = site.contact.address_en;
    }
    applyI18n(document);
  }

  const routes = { home, services, portfolio, art, project: detail, contact };

  document.addEventListener('site:ready', () => {
    const page = document.body.dataset.page;
    if (routes[page]) { try { routes[page](); } catch (e) { console.error(e); } }
  });

  return { catLabel };
})();
