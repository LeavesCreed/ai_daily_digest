const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const safeUrl = (value) => {
  try {
    const url = new URL(value, window.location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
};

export function inlineMarkdown(value = '') {
  let html = escapeHtml(value);
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    const safe = safeUrl(url.trim());
    return safe ? `<img src="${escapeHtml(safe)}" alt="${escapeHtml(alt)}" loading="lazy">` : '';
  });
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const safe = safeUrl(url.trim());
    return safe ? `<a href="${escapeHtml(safe)}" target="_blank" rel="noreferrer noopener">${label}</a>` : label;
  });
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  return html;
}

function withoutFrontMatter(markdown) {
  return markdown.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n?/, '');
}

function cleanLabel(label) {
  return label.replace(/[:：]\s*$/, '').trim().toLocaleLowerCase();
}

function parseLinks(lines) {
  const links = [];
  const metadata = {};
  for (const line of lines) {
    const match = line.match(/^(?:[-*]\s+)?([^:：]+)[:：]\s*(.*)$/);
    if (!match) continue;
    const label = match[1].trim();
    const value = match[2].trim();
    const normalized = cleanLabel(label);
    if (['category', 'category'].includes(normalized)) metadata.category = value;
    else if (['tags', 'tag'].includes(normalized)) metadata.tags = value.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
    else if (value && !/^n\/?a$/i.test(value)) links.push({ label, url: value });
  }
  return { links, metadata };
}

function parseBlocks(lines) {
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    if (/^```/.test(line)) {
      const language = line.slice(3).trim();
      const code = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index])) code.push(lines[index++]);
      index += 1;
      blocks.push({ type: 'code', language, value: code.join('\n') });
      continue;
    }
    if (/^---+$/.test(line.trim())) { blocks.push({ type: 'hr' }); index += 1; continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) { blocks.push({ type: 'heading', depth: heading[1].length, value: heading[2].trim() }); index += 1; continue; }
    if (/^[-*+]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^[-*+]\s+/.test(lines[index])) items.push(lines[index++].replace(/^[-*+]\s+/, ''));
      blocks.push({ type: 'list', ordered: false, items });
      continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index])) items.push(lines[index++].replace(/^\d+[.)]\s+/, ''));
      blocks.push({ type: 'list', ordered: true, items });
      continue;
    }
    if (line.includes('|') && index + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[index + 1])) {
      const rows = [];
      const splitRow = (row) => row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((cell) => cell.trim());
      rows.push(splitRow(line));
      index += 2;
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) rows.push(splitRow(lines[index++]));
      blocks.push({ type: 'table', rows });
      continue;
    }
    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^(#{1,6})\s+/.test(lines[index]) && !/^[-*+]\s+/.test(lines[index]) && !/^```/.test(lines[index]) && !/^---+$/.test(lines[index].trim())) paragraph.push(lines[index++].trim());
    blocks.push({ type: 'paragraph', value: paragraph.join('\n') });
  }
  return blocks;
}

function splitDocument(markdown) {
  const blocks = parseBlocks(withoutFrontMatter(markdown).replaceAll('\r\n', '\n').split('\n'));
  const document = { title: '', summary: '', stories: [], featured: [] };
  let current = null;
  let currentSubsection = null;

  const pushBlock = (block) => {
    if (currentSubsection) currentSubsection.blocks.push(block);
    else if (current) current.blocks.push(block);
  };

  for (const block of blocks) {
    if (block.type === 'heading' && block.depth === 1) {
      if (!document.title) {
        document.title = block.value;
      } else if (/^(important|今日重要|trend|趋势)/i.test(block.value)) {
        current = { title: block.value, blocks: [], subsections: [], links: [], metadata: {}, featured: true };
        document.featured.push(current);
        currentSubsection = null;
      }
      continue;
    }
    if (block.type === 'heading' && block.depth === 2) {
      const storyMatch = block.value.match(/^(\d+)[.)]\s+(.+)$/);
      const isFeatured = /^(important|今日重要|trend|趋势)/i.test(block.value);
      if (storyMatch) {
        current = { index: Number(storyMatch[1]), title: storyMatch[2], blocks: [], subsections: [], links: [], metadata: {} };
        document.stories.push(current);
        currentSubsection = null;
      } else if (isFeatured) {
        current = { title: block.value, blocks: [], subsections: [], links: [], metadata: {}, featured: true };
        document.featured.push(current);
        currentSubsection = null;
      } else if (current?.featured && !current.subsections.length && !current.blocks.length) {
        current.title = block.value;
      } else if (!document.summary && /executive summary|执行摘要/i.test(block.value)) {
        current = { type: 'summary', blocks: [] };
        currentSubsection = null;
      } else {
        current = { title: block.value, blocks: [], subsections: [], links: [], metadata: {}, featured: true };
        document.featured.push(current);
        currentSubsection = null;
      }
      continue;
    }
    if (block.type === 'heading' && block.depth === 3 && current) {
      currentSubsection = { title: block.value, blocks: [] };
      current.subsections.push(currentSubsection);
      continue;
    }
    pushBlock(block);
  }

  const renderText = (blocks) => blocks.filter((block) => block.type === 'paragraph').map((block) => block.value).join('\n\n').trim();
  const summarySection = blocks.length ? document : document;
  if (!document.summary) {
    const summaryBlock = blocks.find((block, index) => block.type === 'heading' && /executive summary|执行摘要/i.test(block.value) && blocks[index + 1]?.type === 'paragraph');
    if (summaryBlock) document.summary = blocks[blocks.indexOf(summaryBlock) + 1].value;
  }
  for (const story of document.stories) {
    const linksSection = story.subsections.find((section) => /^links|链接$/i.test(section.title));
    const linkLines = linksSection ? linksSection.blocks.filter((block) => block.type === 'list').flatMap((block) => block.items) : [];
    const parsedLinks = parseLinks(linkLines);
    story.links = parsedLinks.links;
    story.metadata = parsedLinks.metadata;
    story.subsections = story.subsections.filter((section) => section !== linksSection);
    story.what = renderText(story.subsections.filter((section) => /what happened|发生了什么/i.test(section.title)).flatMap((section) => section.blocks));
    story.why = renderText(story.subsections.filter((section) => /why it matters|为什么重要/i.test(section.title)).flatMap((section) => section.blocks));
    story.technical = story.subsections.filter((section) => /technical|技术点|核心技术/i.test(section.title)).flatMap((section) => section.blocks);
  }
  for (const section of document.featured) {
    const linkBlockIndex = section.blocks.findIndex((block) => block.type === 'paragraph' && /^(link|链接)[:：]/i.test(block.value));
    if (linkBlockIndex >= 0) {
      const match = section.blocks[linkBlockIndex].value.match(/^(?:link|链接)[:：]\s*(\S+)/i);
      if (match) section.links = [{ label: 'Link', url: match[1] }];
      section.blocks.splice(linkBlockIndex, 1);
    }
  }
  return document;
}

export function parseDailyMarkdown(markdown) {
  return splitDocument(markdown);
}

function renderBlock(block) {
  if (block.type === 'paragraph') return `<p>${inlineMarkdown(block.value).replaceAll('\n', '<br>')}</p>`;
  if (block.type === 'list') {
    const tag = block.ordered ? 'ol' : 'ul';
    return `<${tag}>${block.items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</${tag}>`;
  }
  if (block.type === 'code') return `<pre><code class="language-${escapeHtml(block.language)}">${escapeHtml(block.value)}</code></pre>`;
  if (block.type === 'hr') return '<hr />';
  if (block.type === 'table') return `<div class="table-wrap"><table><thead><tr>${block.rows[0].map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join('')}</tr></thead><tbody>${block.rows.slice(1).map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  return '';
}

export function renderBlocks(blocks = []) {
  return blocks.map(renderBlock).join('');
}

export { escapeHtml, safeUrl };
