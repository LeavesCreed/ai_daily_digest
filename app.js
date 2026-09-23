import {
  filterEntries,
  findEntry,
  getCategories,
  getTags,
  loadDailyIndex,
  loadMarkdown,
  resolveDocumentPath,
  searchEntries,
} from './data.js';
import { escapeHtml, inlineMarkdown, parseDailyMarkdown, renderBlocks, safeUrl } from './markdown.js';
import { baseURL, resolveBaseURL } from './base-url.js';

const app = document.querySelector('#app');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const STORAGE = {
  language: 'ai-daily-language',
  theme: 'ai-daily-theme',
  archive: 'ai-daily-archive-position',
};

const state = {
  index: null,
  error: null,
  language: localStorage.getItem(STORAGE.language) === 'zh' ? 'zh' : 'en',
  theme: localStorage.getItem(STORAGE.theme) === 'light' ? 'light' : 'dark',
  archiveQuery: new URLSearchParams(window.location.search).get('q') || '',
  category: new URLSearchParams(window.location.search).get('category') || 'ALL',
  tag: new URLSearchParams(window.location.search).get('tag') || 'ALL',
  readerMarkdown: null,
  readerError: null,
  readerLoading: false,
  renderToken: 0,
};

document.documentElement.dataset.theme = state.theme;

const copy = {
  en: {
    archive: 'Archive', search: 'Search', frontier: 'Frontier AI Archive', hero: 'A daily record of meaningful changes in the AI ecosystem.',
    latest: 'Latest entry', entries: 'entries', stories: 'stories', read: 'Read digest', summary: 'Executive summary', all: 'All', filter: 'Filter archive',
    categories: 'Categories', tags: 'Tags', noResults: 'No entries match these filters.', emptyTitle: 'No daily digests yet', emptyBody: 'The archive is empty. New generated documents will appear here when the index is populated.',
    indexError: 'Archive unavailable', indexErrorBody: 'The content index could not be opened. Check that a static server is serving the repository root.', retry: 'Retry',
    readerBack: 'Back to archive', loading: 'Loading document…', documentError: 'Document unavailable', documentErrorBody: 'This language document is missing or could not be read.', toc: 'Contents', paper: 'Paper', github: 'GitHub', trend: 'Trend',
    searchPlaceholder: 'Search the archive…', searchHint: 'Search daily summaries, stories, categories and tags.', searchEmpty: 'Start with a keyword such as agent, models, or infrastructure.', noSearchResults: 'No matching archive entries.',
    theme: 'Theme', language: 'Language', dark: 'Dark', light: 'Light', storiesLabel: 'stories', system: 'AI DAILY / ARCHIVE',
  },
  zh: {
    archive: '归档', search: '搜索', frontier: '前沿 AI 归档', hero: '记录 AI 生态中值得关注的每日变化。',
    latest: '最新条目', entries: '条目', stories: '篇报道', read: '阅读简报', summary: '执行摘要', all: '全部', filter: '筛选归档',
    categories: '分类', tags: '标签', noResults: '没有符合当前筛选条件的条目。', emptyTitle: '暂无每日简报', emptyBody: '归档为空。索引被填充后，新生成的文档会显示在这里。',
    indexError: '归档暂不可用', indexErrorBody: '内容索引无法打开。请确认使用静态服务器从仓库根目录提供文件。', retry: '重试',
    readerBack: '返回归档', loading: '正在加载文档…', documentError: '文档暂不可用', documentErrorBody: '该语言文档缺失或无法读取。', toc: '目录', paper: '论文', github: 'GitHub', trend: '趋势',
    searchPlaceholder: '搜索归档…', searchHint: '搜索每日摘要、报道、分类和标签。', searchEmpty: '输入 agent、models 或 infrastructure 等关键词开始搜索。', noSearchResults: '没有匹配的归档条目。',
    theme: '主题', language: '语言', dark: '深色', light: '浅色', storiesLabel: '篇报道', system: 'AI DAILY / ARCHIVE',
  },
};

const t = (key) => copy[state.language][key] || copy.en[key] || key;
const formatDate = (date) => new Intl.DateTimeFormat(state.language === 'zh' ? 'zh-CN' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`)).toUpperCase();
const encode = (value) => encodeURIComponent(value);
// Resolve internal routes relative to the deployed app, including a GitHub
// Pages project site served below /<repository>/.
const appUrl = (path = '') => resolveBaseURL(path);

function updateDocumentMeta(title, description = '') {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]');
  if (meta && description) meta.setAttribute('content', description);
}

function setTheme(theme) {
  state.theme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = state.theme;
  localStorage.setItem(STORAGE.theme, state.theme);
  document.querySelectorAll('[data-theme-choice]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.themeChoice === state.theme)));
}

function setLanguage(language) {
  state.language = language === 'zh' ? 'zh' : 'en';
  localStorage.setItem(STORAGE.language, state.language);
  document.documentElement.lang = state.language === 'zh' ? 'zh-CN' : 'en';
}

function header(currentDate = '') {
  const route = currentRoute().name;
  return `<header class="site-header">
    <a class="brand" href="${appUrl()}" data-route aria-label="AI Daily archive"><span class="brand-mark">AD</span><span>AI DAILY</span></a>
    <nav class="main-nav" aria-label="Primary navigation">
      <a href="${appUrl()}" data-route class="nav-link ${route === 'archive' ? 'is-active' : ''}">${t('archive')}</a>
      <a href="${appUrl('search')}" data-route class="nav-link ${route === 'search' ? 'is-active' : ''}">${t('search')} <kbd>⌘K</kbd></a>
    </nav>
    <div class="header-tools">
      ${currentDate ? `<span class="current-date">${escapeHtml(formatDate(currentDate))}</span>` : '<span class="header-rule" aria-hidden="true"></span>'}
      <div class="segmented-control" aria-label="Language">
        <button type="button" data-language-choice="en" aria-pressed="${state.language === 'en'}">EN</button>
        <button type="button" data-language-choice="zh" aria-pressed="${state.language === 'zh'}">中</button>
      </div>
      <div class="theme-control" aria-label="Theme">
        <button type="button" class="theme-button" data-theme-choice="dark" aria-pressed="${state.theme === 'dark'}" title="${t('dark')}">◐</button>
        <button type="button" class="theme-button" data-theme-choice="light" aria-pressed="${state.theme === 'light'}" title="${t('light')}">○</button>
      </div>
    </div>
  </header>`;
}

function shell(content, currentDate = '') {
  return `${header(currentDate)}<main id="main-content">${content}</main><footer class="site-footer"><span>${t('system')}</span><span>READ / ARCHIVE / RETURN</span></footer>`;
}

function loadingView() {
  return shell(`<section class="page-loading" aria-live="polite"><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div></section>`);
}

function errorView() {
  return shell(`<section class="state-panel" aria-live="assertive"><span class="eyebrow">ERROR / CONTENT INDEX</span><h1>${escapeHtml(t('indexError'))}</h1><p>${escapeHtml(state.error?.message || t('indexErrorBody'))}</p><button class="button button-primary" data-retry>${escapeHtml(t('retry'))}</button></section>`);
}

function archiveEmptyView() {
  return `<section class="state-panel state-panel-empty"><span class="eyebrow">ARCHIVE / 000</span><h2>${escapeHtml(t('emptyTitle'))}</h2><p>${escapeHtml(t('emptyBody'))}</p></section>`;
}

function filterBar(entries, allEntries = entries) {
  const categories = getCategories(allEntries);
  const tags = getTags(allEntries);
  return `<section class="archive-controls" aria-label="${escapeHtml(t('filter'))}">
    <div class="control-heading"><span class="eyebrow">${escapeHtml(t('filter'))}</span><span class="result-count">${entries.length} ${escapeHtml(t('entries'))}</span></div>
    <div class="filter-row">
      <div class="filter-group"><span class="filter-label">${escapeHtml(t('categories'))}</span><div class="filter-options" role="group" aria-label="${escapeHtml(t('categories'))}">
        ${['ALL', ...categories].map((category) => `<button type="button" class="filter-chip ${state.category === category ? 'is-active' : ''}" data-category="${escapeHtml(category)}">${escapeHtml(category === 'ALL' ? t('all') : category)}</button>`).join('')}
      </div></div>
      ${tags.length ? `<label class="tag-select"><span class="filter-label">${escapeHtml(t('tags'))}</span><select data-tag-filter><option value="ALL">${escapeHtml(t('all'))}</option>${tags.map((tag) => `<option value="${escapeHtml(tag)}" ${state.tag === tag ? 'selected' : ''}>${escapeHtml(tag)}</option>`).join('')}</select></label>` : ''}
    </div>
  </section>`;
}

function archiveCard(entry, index) {
  const categories = entry.categories.length ? entry.categories : entry.news.map((item) => item.category).filter(Boolean);
  const tags = entry.tags.slice(0, 4);
  return `<div class="archive-card-slot" data-card-slot data-index="${index}">
    <article class="archive-card" data-date="${escapeHtml(entry.date)}" tabindex="0" aria-label="${escapeHtml(entry.title)}">
      <div class="archive-card-surface">
        <div class="card-topline"><span class="card-index">${String(index + 1).padStart(2, '0')}</span><time datetime="${escapeHtml(entry.date)}">${escapeHtml(formatDate(entry.date))}</time><span class="card-open">↗</span></div>
        <div class="card-body"><p class="card-kicker">${escapeHtml(t('system'))}</p><h2>${escapeHtml(entry.title.replace(/^AI Daily Digest\s*[-—]\s*/i, ''))}</h2>
          <div class="card-summary-reveal"><p class="card-summary"><span class="summary-label">${escapeHtml(t('summary'))}</span>${escapeHtml(entry.summary || entry.news[0]?.summary || '')}</p></div>
          <div class="card-meta"><span>${categories.slice(0, 3).map(escapeHtml).join(' · ') || '—'}</span><span>${entry.newsCount || entry.news.length} ${escapeHtml(t('stories'))}</span></div>
          ${tags.length ? `<div class="card-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        </div>
        <a class="card-hit-area" href="${appUrl(`daily/${encode(entry.date)}`)}" data-route aria-label="${escapeHtml(t('read'))}: ${escapeHtml(entry.title)}"></a>
      </div>
    </article>
  </div>`;
}

function archiveView() {
  const entries = state.index?.entries || [];
  const filtered = filterEntries(entries, { query: state.archiveQuery, category: state.category, tag: state.tag });
  const latest = entries[0]?.date || '';
  updateDocumentMeta('AI Daily — Frontier AI Archive', t('hero'));
  return shell(`<section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy"><span class="eyebrow">PERSONAL RESEARCH ARCHIVE / 01</span><h1 id="hero-title">${escapeHtml(t('frontier'))}</h1><p>${escapeHtml(t('hero'))}</p><a class="scroll-cue" href="#archive-stack"><span>↓</span><span>SCROLL TO OPEN</span></a></div>
      <div class="hero-aside"><span class="hero-stamp">AI<br />DAILY</span><span class="hero-aside-copy">A quiet index<br />of moving frontiers.</span></div>
    </section>
    <section class="archive-section" id="archive-stack" aria-labelledby="archive-title">
      <div class="section-heading"><div><span class="eyebrow">CHRONOLOGICAL / ${entries.length ? String(entries.length).padStart(3, '0') : '000'}</span><h2 id="archive-title">${escapeHtml(t('archive'))}</h2></div><span class="section-date">${latest ? escapeHtml(formatDate(latest)) : '—'}</span></div>
      ${filterBar(filtered, entries)}
      ${filtered.length ? `<div class="archive-layout"><aside class="archive-date-rail" aria-live="polite" aria-label="Current archive date"><span class="rail-label">CURRENT<br />DATE</span><time data-active-date datetime="${escapeHtml(filtered[0].date)}">${escapeHtml(formatDate(filtered[0].date))}</time><span class="rail-order" data-active-order>01 / ${String(filtered.length).padStart(2, '0')}</span></aside><div class="archive-stack" data-archive-stack>${filtered.map(archiveCard).join('')}</div></div>` : archiveEmptyView()}
    </section>`);
}

function searchResult(result) {
  const { entry, dailyMatch, newsMatches } = result;
  return `<article class="search-result"><div class="result-date"><time datetime="${escapeHtml(entry.date)}">${escapeHtml(formatDate(entry.date))}</time><span>${entry.newsCount || entry.news.length} ${escapeHtml(t('stories'))}</span></div><div class="result-content">${dailyMatch ? `<a class="result-title" href="${appUrl(`daily/${encode(entry.date)}`)}" data-route>${escapeHtml(entry.title)}</a><p>${escapeHtml(entry.summary)}</p>` : ''}${newsMatches.map((item) => `<a class="news-result" href="${appUrl(`daily/${encode(entry.date)}#news-${item.index}`)}" data-route><span class="news-index">${String(item.index).padStart(2, '0')}</span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.category)}${item.tags.length ? ` · ${escapeHtml(item.tags.slice(0, 3).join(' · '))}` : ''}</small></span><span class="result-arrow">↗</span></a>`).join('')}</div></article>`;
}

function searchView() {
  const results = state.index ? searchEntries(state.index.entries, state.archiveQuery) : [];
  updateDocumentMeta('Search — AI Daily', t('searchHint'));
  return shell(`<section class="search-page"><div class="search-heading"><span class="eyebrow">RETRIEVE / INDEX SEARCH</span><h1>${escapeHtml(t('search'))}</h1><p>${escapeHtml(t('searchHint'))}</p></div><form class="search-form" data-search-form><label for="search-input" class="sr-only">${escapeHtml(t('search'))}</label><span class="search-icon">⌕</span><input id="search-input" name="q" value="${escapeHtml(state.archiveQuery)}" placeholder="${escapeHtml(t('searchPlaceholder'))}" autocomplete="off" /><kbd>ESC</kbd></form><div class="search-results" aria-live="polite">${state.archiveQuery ? (results.length ? results.map(searchResult).join('') : `<div class="state-panel compact"><h2>${escapeHtml(t('noSearchResults'))}</h2><p>“${escapeHtml(state.archiveQuery)}”</p></div>`) : `<div class="search-empty"><span class="empty-glyph">⌕</span><p>${escapeHtml(t('searchEmpty'))}</p></div>`}</div></section>`);
}

function blockText(text) {
  return text ? `<p>${inlineMarkdown(text).replaceAll('\n', '<br>')}</p>` : '';
}

function storySection(story, entry, index) {
  const metadata = entry.news.find((item) => item.index === story.index) || {};
  const category = metadata.category || story.metadata.category;
  const tags = metadata.tags?.length ? metadata.tags : story.metadata.tags || [];
  const subsections = story.subsections.filter((section) => !/^links|链接$/i.test(section.title));
  const links = story.links.filter((link) => safeUrl(link.url));
  return `<section class="reader-story" id="news-${story.index || index + 1}" data-reader-section><header class="story-heading"><span class="story-number">${String(story.index || index + 1).padStart(2, '0')}</span><h2>${escapeHtml(story.title)}</h2></header><div class="story-content">${subsections.map((section) => `<section class="story-subsection"><h3>${escapeHtml(section.title)}</h3>${renderBlocks(section.blocks)}</section>`).join('')}${story.blocks.length ? renderBlocks(story.blocks) : ''}${category || tags.length ? `<div class="story-taxonomy">${category ? `<span>${escapeHtml(category)}</span>` : ''}${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}${links.length ? `<div class="story-links"><span class="subsection-label">LINKS</span>${links.map((link) => `<a href="${escapeHtml(safeUrl(link.url))}" target="_blank" rel="noreferrer noopener"><span>${escapeHtml(link.label)}</span><span>↗</span></a>`).join('')}</div>` : ''}</div></section>`;
}

function featuredSection(section, index) {
  const links = section.links.filter((link) => safeUrl(link.url));
  return `<section class="featured-section" id="${index === 0 ? 'paper' : index === 1 ? 'github' : 'trend'}" data-reader-section><span class="eyebrow">${index === 0 ? 'PAPER' : index === 1 ? 'OPEN SOURCE' : 'SIGNAL'}</span><h2>${escapeHtml(section.title)}</h2><div class="featured-copy">${renderBlocks(section.blocks)}</div>${links.length ? `<div class="featured-links">${links.map((link) => `<a href="${escapeHtml(safeUrl(link.url))}" target="_blank" rel="noreferrer noopener">${escapeHtml(link.label)} <span>↗</span></a>`).join('')}</div>` : ''}</section>`;
}

function readerLoadingView(entry) {
  return shell(`<section class="reader-layout"><article class="reader-document"><div class="document-loading"><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text"></div></div></article><aside class="reader-toc"><span class="eyebrow">${escapeHtml(t('toc'))}</span></aside></section>`, entry.date);
}

function readerErrorView(entry) {
  return shell(`<section class="state-panel reader-error"><a href="${appUrl()}" data-route class="back-link">← ${escapeHtml(t('readerBack'))}</a><span class="eyebrow">DOCUMENT / ${escapeHtml(entry.date)}</span><h1>${escapeHtml(t('documentError'))}</h1><p>${escapeHtml(state.readerError?.message || t('documentErrorBody'))}</p></section>`, entry.date);
}

function readerView(entry, documentModel) {
  const stories = documentModel.stories.length ? documentModel.stories : entry.news.map((item) => ({ index: item.index, title: item.title, blocks: [], subsections: [], links: [], metadata: {} }));
  const summary = documentModel.summary || entry.summary;
  updateDocumentMeta(`${entry.title} — AI Daily`, summary);
  return shell(`<section class="reader-layout"><article class="reader-document"><div class="reader-topline"><a href="${appUrl()}" data-route class="back-link">← ${escapeHtml(t('readerBack'))}</a><span class="reader-path">DAILY / ${escapeHtml(entry.date)}</span></div><header class="document-header"><span class="eyebrow">${escapeHtml(formatDate(entry.date))} / ${escapeHtml(state.language === 'zh' ? '简体中文' : 'ENGLISH')}</span><h1>${escapeHtml(documentModel.title || entry.title)}</h1>${summary ? `<section class="executive-summary" id="executive-summary"><span class="subsection-label">${escapeHtml(t('summary'))}</span><p>${inlineMarkdown(summary).replaceAll('\n', '<br>')}</p></section>` : ''}</header><div class="story-list">${stories.map((story, index) => storySection(story, entry, index)).join('')}</div><div class="featured-list">${documentModel.featured.map(featuredSection).join('')}</div></article><aside class="reader-toc" aria-label="${escapeHtml(t('toc'))}"><div class="toc-inner"><span class="eyebrow">${escapeHtml(t('toc'))}</span><nav>${stories.map((story, index) => `<a href="#news-${story.index || index + 1}"><span>${String(story.index || index + 1).padStart(2, '0')}</span><small>${escapeHtml(story.title)}</small></a>`).join('')}<span class="toc-divider"></span>${documentModel.featured.map((section, index) => `<a href="#${index === 0 ? 'paper' : index === 1 ? 'github' : 'trend'}"><span>—</span><small>${escapeHtml(index === 0 ? t('paper') : index === 1 ? t('github') : t('trend'))}</small></a>`).join('')}</nav></div></aside><details class="mobile-toc"><summary>${escapeHtml(t('toc'))}<span>+</span></summary><nav>${stories.map((story, index) => `<a href="#news-${story.index || index + 1}"><span>${String(story.index || index + 1).padStart(2, '0')}</span>${escapeHtml(story.title)}</a>`).join('')}</nav></details></section>`, entry.date);
}

function currentRoute() {
  const basePath = baseURL.pathname.replace(/\/$/, '');
  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  const path = basePath && pathname.startsWith(basePath) ? pathname.slice(basePath.length) || '/' : pathname;
  if (path === '/search') return { name: 'search' };
  const match = path.match(/^\/daily\/([^/]+)$/);
  if (match) return { name: 'reader', date: decodeURIComponent(match[1]) };
  return { name: 'archive' };
}

async function render() {
  const token = ++state.renderToken;
  const route = currentRoute();
  document.documentElement.classList.toggle('archive-route', route.name === 'archive');
  if (!state.index && !state.error) {
    app.innerHTML = loadingView();
    try { state.index = await loadDailyIndex(); } catch (error) { state.error = error; }
  }
  if (token !== state.renderToken) return;
  if (state.error) { app.innerHTML = errorView(); bindCommon(); return; }
  if (route.name === 'reader') {
    const entry = findEntry(state.index.entries, route.date);
    if (!entry) { app.innerHTML = shell(`<section class="state-panel"><a href="${appUrl()}" data-route class="back-link">← ${escapeHtml(t('readerBack'))}</a><span class="eyebrow">404 / DAILY</span><h1>Unknown date</h1><p>${escapeHtml(route.date)}</p></section>`); bindCommon(); return; }
    if (!state.readerMarkdown || state.readerMarkdown.date !== entry.date || state.readerMarkdown.language !== state.language) {
      state.readerLoading = true; state.readerError = null; app.innerHTML = readerLoadingView(entry);
      try { state.readerMarkdown = { date: entry.date, language: state.language, model: parseDailyMarkdown(await loadMarkdown(resolveDocumentPath(entry, state.language))) }; }
      catch (error) { state.readerError = error; state.readerMarkdown = null; }
      state.readerLoading = false;
    }
    if (state.readerError) app.innerHTML = readerErrorView(entry);
    else app.innerHTML = readerView(entry, state.readerMarkdown.model);
    bindCommon();
    requestAnimationFrame(() => scrollToHash());
    return;
  }
  state.readerMarkdown = null;
  app.innerHTML = route.name === 'search' ? searchView() : archiveView();
  bindCommon();
  if (route.name === 'search') document.querySelector('#search-input')?.focus();
  if (route.name === 'archive') requestAnimationFrame(() => { restoreArchivePosition(); updateArchiveMotion(); });
}

function navigate(url, { replace = false } = {}) {
  const next = new URL(url, baseURL);
  if (replace) history.replaceState({}, '', next.href); else history.pushState({}, '', next.href);
  state.archiveQuery = next.searchParams.get('q') || '';
  state.category = next.searchParams.get('category') || 'ALL';
  state.tag = next.searchParams.get('tag') || 'ALL';
  render();
}

function updateArchiveUrl() {
  const params = new URLSearchParams();
  if (state.archiveQuery) params.set('q', state.archiveQuery);
  if (state.category !== 'ALL') params.set('category', state.category);
  if (state.tag !== 'ALL') params.set('tag', state.tag);
  const query = params.toString();
  history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
}

function saveArchivePosition() {
  sessionStorage.setItem(STORAGE.archive, JSON.stringify({ y: window.scrollY, date: document.querySelector('.archive-card.is-current')?.dataset.date || '' }));
}

function restoreArchivePosition() {
  const saved = sessionStorage.getItem(STORAGE.archive);
  if (!saved) return;
  try { const value = JSON.parse(saved); if (Number.isFinite(value.y)) window.scrollTo({ top: value.y, behavior: 'instant' }); } catch { sessionStorage.removeItem(STORAGE.archive); }
  sessionStorage.removeItem(STORAGE.archive);
}

function updateArchiveMotion() {
  const cards = [...document.querySelectorAll('[data-card-slot]')];
  if (!cards.length) return;
  const viewportCenter = window.innerHeight * 0.5;
  let current = null;
  let currentDistance = Infinity;
  cards.forEach((slot, index) => {
    const card = slot.querySelector('.archive-card');
    const box = slot.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    const center = cardBox.top + cardBox.height / 2;
    const distance = (center - viewportCenter) / Math.max(window.innerHeight * 0.58, 1);
    const abs = Math.abs(distance);
    const focus = Math.min(abs, 1.5);
    const translate = Math.max(-30, Math.min(34, distance * -20));
    const scale = 1 - Math.min(0.055, focus * 0.045);
    const opacity = 1 - Math.min(0.26, Math.max(0, focus - 0.65) * 0.18);
    card.style.transform = `translate3d(0, ${translate}px, 0) scale(${scale})`;
    card.style.opacity = String(opacity);
    card.style.setProperty('--archive-layer', String(100 - index));
    const targetCardTop = window.innerHeight * 0.5 - cardBox.height / 2;
    const anchorDistance = Math.abs(box.top - targetCardTop);
    if (anchorDistance < currentDistance) { current = { card, index }; currentDistance = anchorDistance; }
  });
  document.querySelectorAll('.archive-card.is-current').forEach((card) => card.classList.remove('is-current'));
  if (current) {
    current.card.classList.add('is-current');
    const date = current.card.dataset.date;
    const dateIndicator = document.querySelector('[data-active-date]');
    const orderIndicator = document.querySelector('[data-active-order]');
    if (dateIndicator && date) {
      dateIndicator.dateTime = date;
      dateIndicator.textContent = formatDate(date);
    }
    if (orderIndicator) orderIndicator.textContent = `${String(current.index + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
  }
}

let motionFrame = null;

// Absolute scroll positions at which each card's center axis sits on the
// viewport's middle axis (50vh).
function getSnapPoints() {
  const maxScrollTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return [...document.querySelectorAll('[data-card-slot]')].map((slot) => {
    const card = slot.querySelector('.archive-card');
    const targetCardTop = window.innerHeight * 0.5 - (card.offsetHeight || 430) / 2;
    const idealScrollTop = window.scrollY + slot.getBoundingClientRect().top - targetCardTop;
    return Math.min(maxScrollTop, Math.max(0, idealScrollTop));
  });
}

// ---------------------------------------------------------------------------
// Summary reveal — Web Animations API (native, works in every browser).
// ---------------------------------------------------------------------------

const REVEAL_EASE = 'cubic-bezier(.2, .8, .2, 1)';
const revealAnimations = new WeakMap();

function animateCardSummary(card, open) {
  const reveal = card.querySelector('.card-summary-reveal');
  const summary = card.querySelector('.card-summary');
  if (!reveal || !summary || !reveal.animate) return;
  // Read the current animated state BEFORE cancelling so an interrupted
  // animation reverses smoothly from its exact current values.
  const fromStyle = getComputedStyle(reveal);
  const fromSummary = getComputedStyle(summary);
  revealAnimations.get(reveal)?.forEach((animation) => animation.cancel());
  const animations = [
    reveal.animate(
      [
        { height: fromStyle.height, marginTop: fromStyle.marginTop },
        { height: open ? `${summary.offsetHeight}px` : '0px', marginTop: open ? '24px' : '0px' },
      ],
      { duration: 500, easing: REVEAL_EASE, fill: 'forwards' }
    ),
    summary.animate(
      open
        ? [{ opacity: fromSummary.opacity, transform: fromSummary.transform }, { opacity: 1, transform: 'translateY(0px)' }]
        : [{ opacity: fromSummary.opacity, transform: fromSummary.transform }, { opacity: 0, transform: 'translateY(8px)' }],
      { duration: 500, easing: REVEAL_EASE, fill: 'forwards' }
    ),
  ];
  if (!open) {
    animations[0].onfinish = () => {
      reveal.style.height = '';
      reveal.style.marginTop = '';
      summary.style.opacity = '';
      summary.style.transform = '';
      revealAnimations.delete(reveal);
    };
  }
  revealAnimations.set(reveal, animations);
}

// ---------------------------------------------------------------------------
// Spring snap — underdamped oscillator, no dependencies.
// ---------------------------------------------------------------------------

let springFrame = null;
let snapTimer = null;

// User-initiated scroll cancels any in-flight spring so it never fights the
// user's own scrolling.
function cancelSpringSnap() {
  if (springFrame !== null) { cancelAnimationFrame(springFrame); springFrame = null; }
}

// Closed-form step response of an underdamped mass-spring-damper:
//   x(t) = 1 - e^(-ζω₀t) · (cos(ωd·t) + (ζω₀/ωd) · sin(ωd·t))
// ζ ≈ 0.55 gives one soft overshoot (~12% of the distance) and settles in
// about 1.1s — the "spring to the axis" feel.
function springScrollTo(targetY) {
  cancelSpringSnap();
  const startY = window.scrollY;
  const distance = targetY - startY;
  if (Math.abs(distance) < 0.5) return;
  const startTime = performance.now();
  const omega0 = 10; // natural frequency (rad/s)
  const zeta = 0.55; // damping ratio
  const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
  const alpha = (zeta * omega0) / omegaD;
  function frame(now) {
    const t = (now - startTime) / 1000;
    const envelope = Math.exp(-zeta * omega0 * t);
    const value = 1 - envelope * (Math.cos(omegaD * t) + alpha * Math.sin(omegaD * t));
    // behavior: 'instant' — the CSS `scroll-behavior: smooth` must not smooth
    // each frame of the spring.
    window.scrollTo({ top: startY + distance * value, behavior: 'instant' });
    if (t < 1.6 && Math.abs(window.scrollY - targetY) > 0.5) springFrame = requestAnimationFrame(frame);
    else { window.scrollTo({ top: targetY, behavior: 'instant' }); springFrame = null; }
  }
  springFrame = requestAnimationFrame(frame);
}

// After scrolling stops, pull the card axis nearest to the middle axis onto
// it with the spring. Skips when the nearest axis is too far away (e.g. the
// hero is still on screen).
function snapArchiveOnIdle() {
  if (!document.querySelector('[data-archive-stack]')) return;
  const points = getSnapPoints();
  let closest = null;
  let closestDistance = Infinity;
  points.forEach((point) => {
    const distance = Math.abs(point - window.scrollY);
    if (distance < closestDistance) { closestDistance = distance; closest = point; }
  });
  if (closest === null || closestDistance < 4 || closestDistance > window.innerHeight * 0.5) return;
  springScrollTo(closest);
}

function onArchiveScroll() {
  if (motionFrame) return;
  motionFrame = requestAnimationFrame(() => { motionFrame = null; updateArchiveMotion(); });
  window.clearTimeout(snapTimer);
  snapTimer = window.setTimeout(snapArchiveOnIdle, 140);
}

function scrollToHash() {
  if (!window.location.hash) return;
  const target = document.querySelector(window.location.hash);
  if (target) target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
}

function bindCommon() {
  window.removeEventListener('scroll', onArchiveScroll);
  window.removeEventListener('wheel', cancelSpringSnap);
  window.removeEventListener('touchstart', cancelSpringSnap);
  cancelSpringSnap();
  window.clearTimeout(snapTimer);
  document.querySelectorAll('[data-route]').forEach((link) => link.addEventListener('click', (event) => {
    const href = link.getAttribute('href');
    if (!href || link.target === '_blank' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (href.includes('/daily/')) saveArchivePosition();
    navigate(href);
  }));
  document.querySelectorAll('[data-language-choice]').forEach((button) => button.addEventListener('click', () => { setLanguage(button.dataset.languageChoice); render(); }));
  document.querySelectorAll('[data-theme-choice]').forEach((button) => button.addEventListener('click', () => setTheme(button.dataset.themeChoice)));
  document.querySelector('[data-retry]')?.addEventListener('click', () => { state.error = null; state.index = null; render(); });
  document.querySelectorAll('[data-category]').forEach((button) => button.addEventListener('click', () => { state.category = button.dataset.category; updateArchiveUrl(); render(); }));
  document.querySelector('[data-tag-filter]')?.addEventListener('change', (event) => { state.tag = event.target.value; updateArchiveUrl(); render(); });
  document.querySelector('[data-search-form]')?.addEventListener('submit', (event) => { event.preventDefault(); state.archiveQuery = new FormData(event.target).get('q')?.toString().trim() || ''; updateArchiveUrl(); render(); });
  document.querySelectorAll('.archive-card').forEach((card) => card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); card.querySelector('[data-route]')?.click(); } }));
  if (currentRoute().name === 'archive') {
    window.addEventListener('scroll', onArchiveScroll, { passive: true });
    window.addEventListener('wheel', cancelSpringSnap, { passive: true });
    window.addEventListener('touchstart', cancelSpringSnap, { passive: true });
    document.querySelectorAll('.archive-card').forEach((card) => {
      card.addEventListener('mouseenter', () => animateCardSummary(card, true));
      card.addEventListener('mouseleave', () => animateCardSummary(card, false));
    });
  }
}

window.addEventListener('popstate', () => render());
window.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); navigate(appUrl('search')); }
  if (event.key === 'Escape' && currentRoute().name === 'search') navigate(appUrl());
});

render();
