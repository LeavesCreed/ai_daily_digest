import { resolveBaseURL } from './base-url.js';

const repositoryPath = (path) => {
  return resolveBaseURL(path);
};

const INDEX_PATH = repositoryPath('./content/data/daily-index.json');

/** @typedef {{ index: number, title: string, summary: string, category: string, tags: string[] }} NewsItem */
/** @typedef {{ date: string, title: string, summary: { en?: string, zh?: string }, categories: string[], tags: string[], newsCount: number, documents: { en?: string, zh?: string }, news: NewsItem[] }} DailyEntry */

const asString = (value, fallback = '') => (typeof value === 'string' ? value.trim() : fallback);

// The index summary is a localized object { en, zh }. Legacy string values
// are treated as English so older indexes keep working.
const asLocalizedText = (value) => {
  if (typeof value === 'string') return { en: asString(value) || undefined, zh: undefined };
  if (value && typeof value === 'object') {
    return { en: asString(value.en) || undefined, zh: asString(value.zh) || undefined };
  }
  return { en: undefined, zh: undefined };
};

const asStringList = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean))];
};

const asNewsItem = (item, fallbackIndex) => {
  if (!item || typeof item !== 'object') return null;
  const index = Number.isInteger(item.index) ? item.index : fallbackIndex;
  return {
    index,
    title: asString(item.title, `Story ${index}`),
    summary: asString(item.summary),
    category: asString(item.category, 'Uncategorized'),
    tags: asStringList(item.tags),
  };
};

const asEntry = (item) => {
  if (!item || typeof item !== 'object') return null;
  const news = Array.isArray(item.news)
    ? item.news.map((newsItem, index) => asNewsItem(newsItem, index + 1)).filter(Boolean)
    : [];
  const documents = item.documents && typeof item.documents === 'object' ? item.documents : {};
  return {
    date: asString(item.date),
    title: asString(item.title, `AI Daily Digest — ${asString(item.date, 'Unknown date')}`),
    summary: asLocalizedText(item.summary),
    categories: asStringList(item.categories),
    tags: asStringList(item.tags),
    newsCount: Number.isInteger(item.news_count) ? item.news_count : news.length,
    documents: {
      en: asString(documents.en) || undefined,
      zh: asString(documents.zh) || undefined,
    },
    news,
  };
};

/**
 * Load and safely narrow the v1 archive index. Content paths stay content-owned:
 * the application only normalizes a leading ./ for browser-relative requests.
 * @returns {Promise<{ entries: DailyEntry[], generatedAt: string, version: number }>}
 */
export async function loadDailyIndex() {
  const response = await fetch(INDEX_PATH, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Archive index returned ${response.status}`);

  const rawText = await response.text();
  if (!rawText.trim()) throw new Error('Archive index is empty');

  let raw;
  try {
    raw = JSON.parse(rawText);
  } catch {
    throw new Error('Archive index contains malformed JSON');
  }

  if (!raw || raw.version !== 1 || !Array.isArray(raw.entries)) {
    throw new Error('Archive index uses an unsupported schema');
  }

  const entries = raw.entries
    .map(asEntry)
    .filter((entry) => entry && /^\d{4}-\d{2}-\d{2}$/.test(entry.date))
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    version: 1,
    generatedAt: asString(raw.generated_at),
    entries,
  };
}

export async function loadMarkdown(path) {
  if (!path) throw new Error('This language document is not available');
  const normalizedPath = repositoryPath(path);
  const response = await fetch(normalizedPath, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Daily document returned ${response.status}`);
  return response.text();
}

export function findEntry(entries, date) {
  return entries.find((entry) => entry.date === date);
}

export function resolveDocumentPath(entry, language) {
  return entry?.documents?.[language] || undefined;
}

export function getCategories(entries) {
  return [...new Set(entries.flatMap((entry) => entry.categories))].sort((a, b) => a.localeCompare(b));
}

export function getTags(entries) {
  return [...new Set(entries.flatMap((entry) => [...entry.tags, ...entry.news.flatMap((item) => item.tags)]))].sort((a, b) => a.localeCompare(b));
}

export function filterEntries(entries, { query = '', category = 'ALL', tag = 'ALL' } = {}) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return entries.filter((entry) => {
    const categoryMatch = category === 'ALL' || entry.categories.includes(category) || entry.news.some((item) => item.category === category);
    const tagMatch = tag === 'ALL' || entry.tags.includes(tag) || entry.news.some((item) => item.tags.includes(tag));
    if (!categoryMatch || !tagMatch) return false;
    if (!normalizedQuery) return true;
    const searchable = [
      entry.date,
      entry.title,
      entry.summary?.en,
      entry.summary?.zh,
      ...entry.categories,
      ...entry.tags,
      ...entry.news.flatMap((item) => [item.title, item.summary, item.category, ...item.tags]),
    ].join(' ').toLocaleLowerCase();
    return searchable.includes(normalizedQuery);
  });
}

export function searchEntries(entries, query) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [];
  return entries
    .map((entry) => {
      const dailyText = [entry.date, entry.title, entry.summary?.en, entry.summary?.zh, ...entry.categories, ...entry.tags].join(' ').toLocaleLowerCase();
      const dailyMatch = dailyText.includes(normalizedQuery);
      const newsMatches = entry.news.filter((item) => [item.title, item.summary, item.category, ...item.tags].join(' ').toLocaleLowerCase().includes(normalizedQuery));
      return { entry, dailyMatch, newsMatches };
    })
    .filter((result) => result.dailyMatch || result.newsMatches.length);
}
