# Skill: AI Frontier Daily Digest

## Purpose

Generate a high-signal AI frontier daily digest by autonomously:
- searching recent AI developments
- filtering low-value noise
- ranking events by technical significance
- generating structured markdown reports
- maintaining historical memory/state
- publishing reports to GitHub
- optionally pushing summaries through notification bots

This skill is designed to operate as a long-running AI intelligence pipeline rather than a one-off chatbot response.

The primary goal is:
- maximize signal-to-noise ratio
- prioritize technical relevance
- surface meaningful ecosystem changes
- build long-term AI trend awareness

NOT:
- maximize article count
- chase hype
- mirror social media trends

---

# Runtime Workflow

The agent MUST follow this workflow strictly.

## Phase 1 — Load Configuration

Before searching for news, load:

- `./config/source_weights.yaml`
- `./config/scoring_rules.yaml`
- `./config/noise_filter.yaml`
- `./config/ranking_policy.yaml`

These files define:
- source credibility
- scoring logic
- ranking behavior
- blocked topics
- noise filtering rules

Do NOT hardcode these values inside the skill runtime.

---

## Phase 2 — Load Historical State

Load:

- `./state/seen_urls.json`
- `./state/seen_titles.json`
- `./state/entity_history.json`
- `./state/trend_memory.json`

These files are used to:
- avoid duplicate reporting
- track recurring entities
- detect emerging trends
- maintain long-term continuity

If state files do not exist:
- initialize empty state

---

# Phase 3 — Search Recent AI Developments

Search the web for:
- last 24 hours by default
- extend to last 7 days only if necessary

The agent SHOULD prioritize:
- official announcements
- research papers
- GitHub repositories
- engineering blogs
- technical forums
- arXiv
- conference materials

The agent SHOULD avoid:
- low-quality media aggregation
- SEO farms
- repost-only content
- shallow tech journalism

---

# Phase 4 — Candidate Extraction

Extract candidate news items.

Each candidate should include:
- title
- summary
- source
- publication date
- primary link
- optional paper link
- optional GitHub link

Normalize titles before duplicate checking.

---

# Phase 5 — Deduplication

Before scoring:

## URL Deduplication

Skip items already present in:
`./state/seen_urls.json`

## Semantic Deduplication

Skip items whose titles are semantically equivalent to previously reported items in:
`./state/seen_titles.json`

When multiple articles describe the same event:
- keep the highest quality source
- prefer primary sources

---

# Phase 6 — Noise Filtering

Load rules from:
`./config/noise_filter.yaml`

Apply aggressive noise filtering.

Popularity MUST NOT increase ranking.

Technical significance is mandatory.

---

# Phase 7 — Importance Scoring

Load scoring rules from:
`./config/scoring_rules.yaml`

The agent SHOULD compute:

final_score =
importance_score × source_weight

---

# Phase 8 — Source Weighting

Load:
`./config/source_weights.yaml`

Apply source credibility weighting to the importance score.

---

# Phase 9 — Ranking

Load:
`./config/ranking_policy.yaml`

Apply ranking policy during candidate ordering.

---

# Phase 10 — Content Taxonomy

The agent MUST classify every selected news item using a controlled category vocabulary.

## Allowed Categories

Use only the following categories:

* Models
* Research
* Agents
* Infrastructure
* Open Source
* Robotics
* Multimodal
* AI Safety
* Industry
* Applications

The agent SHOULD select the smallest number of categories necessary to describe the day's content.

The agent MUST NOT invent new category names when an existing category is applicable.

## Tags

Tags are more specific than categories and may represent:

* organizations
* model families
* technologies
* projects
* research topics
* datasets
* products
* infrastructure systems

Tags MUST be written as a comma-separated list.

Example:
- Tags: OpenAI, Agents, Reasoning, LLM

Tags are free-form but SHOULD remain concise and reusable.

Examples:

* OpenAI
* Anthropic
* GPT
* Llama
* Reasoning
* Reinforcement Learning
* CUDA
* AI Agents

Each selected news item MUST have:

* exactly one primary `Category`
* zero or more `Tags`

The daily digest MUST also expose aggregated `categories` and `tags` in its YAML front matter.

---

# Phase 11 — Digest Generation

The agent MUST execute TWO distinct generation pipelines to produce TWO separate daily digest files.

1. Read `./TEMPLATE.md` and generate the English digest.
2. Read `./TEMPLATE_zh.md` and generate the Simplified Chinese digest.

The generated files MUST be:

* English: `./daily/YYYY-MM-DD.md`
* Chinese: `./daily_zh/YYYY-MM-DD.md`

The agent MUST:

* follow the section ordering defined by the corresponding template;
* generate exactly 5 major news items;
* preserve the required YAML front matter;
* preserve Markdown formatting;
* assign one primary category to every news item;
* assign zero or more tags to every news item;
* aggregate all used news categories into the daily `categories` field;
* aggregate all used news tags into the daily `tags` field;
* ensure that the English and Chinese versions describe the same five news items in the same order.

Each major news item MUST contain:

* title
* summary
* importance
* key technical points
* official link
* optional paper link
* optional GitHub link
* category
* tags

The category and tags MUST appear at the end of each news item's Links section using the exact following format:

```markdown
- Category: {{CATEGORY}}
- Tags: {{TAG1}}, {{TAG2}}, {{TAG3}}
```

Do not use alternative labels or formats.

The agent SHOULD:

* reference `./SAMPLE.md`;
* imitate its tone and information density.

---

# Writing Style

Chinese summary (`./daily_zh/YYYY-MM-DD.md`) MUST:
- preserve technical precision
- avoid over-localization
- maintain engineering terminology (keep proper nouns and tech stacks in English if standard)
- use concise professional Chinese

English summary (`./daily/YYYY-MM-DD.md`) MUST:
- remain concise
- remain technical
- remain research-oriented

Audience:
- engineers
- researchers
- AI practitioners
- technical founders

The digest should resemble:
- internal research briefings
- technical intelligence reports
- engineering trend summaries

NOT:
- mainstream tech journalism
- influencer newsletters
- hype threads

---

# Phase 12 — Trend Memory Update

After generating the digest:

Update:
- `./state/entity_history.json`
- `./state/trend_memory.json`

Track:
- recurring entities
- rising topics
- ecosystem shifts
- model families
- infrastructure trends

Trend memory should later support:
- weekly digests
- monthly digests
- long-term trend analysis

---

# Phase 13 — Persist Markdown Digest

Create TWO distinct digest files for the current date:

* `./daily/YYYY-MM-DD.md` (English version)
* `./daily_zh/YYYY-MM-DD.md` (Simplified Chinese version)

Both files MUST:

* contain valid YAML front matter;
* contain the same `date`;
* contain the same `news_count`;
* contain the same category set;
* contain the same tag set;
* contain the same five major news items in the same order;
* render correctly in standard Markdown;
* remain mobile-friendly;
* support GitHub native rendering.

The YAML front matter MUST contain:

```yaml
---
date: YYYY-MM-DD
language: en
summary: ...
categories:
  - ...
tags:
  - ...
news_count: 5
---
```

For the Chinese version:

```yaml
---
date: YYYY-MM-DD
language: zh_CN
summary: ...
categories:
  - ...
tags:
  - ...
news_count: 5
---
```

The English file MUST contain only English content except necessary technical terms, project names, URLs, and code elements.

The Chinese file MUST contain Simplified Chinese content except necessary technical terms, project names, URLs, and code elements.

---

# Phase 14 — Generate Daily Index

After the English and Chinese daily digest files have been successfully persisted, generate or update:

`./data/daily-index.json`

The daily index is the machine-readable archive index used by frontend applications.

## Data Source

The agent MUST derive the daily index from the generated daily digest files and their YAML front matter.

The agent MUST NOT invent metadata independently of the generated digest.

The Markdown digest is the canonical source for the full article content.

The daily index is a derived metadata representation for archive navigation, search, filtering, timeline rendering, and language switching.

## Initialization

If `./data/daily-index.json` does not exist, create:

```json
{
  "version": 1,
  "generated_at": "YYYY-MM-DDTHH:mm:ssZ",
  "entries": []
}
```

## Entry Schema

Each daily entry MUST contain:

```json
{
  "date": "YYYY-MM-DD",
  "title": "string",
  "summary":  {
    "en": "string",
    "zh": "string"
  },
  "categories": [],
  "tags": [],
  "news_count": 5,
  "documents": {
    "en": "./daily/YYYY-MM-DD.md",
    "zh": "./daily_zh/YYYY-MM-DD.md"
  },
  "news": []
}
```

Each `news` item MUST contain:

```json
{
  "index": 1,
  "title": "string",
  "summary": "string",
  "category": "string",
  "tags": []
}
```

## Update Rules

When adding a new daily digest:

1. Create exactly one entry for the new date.
2. Preserve all existing historical entries.
3. Replace the existing entry when the same date is regenerated.
4. Do not create duplicate entries for the same date.
5. Keep entries sorted by `date` in reverse chronological order.
6. Keep the English and Chinese document paths explicitly separated.
7. Keep `news_count` consistent with `news.length`.
8. Keep the five news items in the same order as the Markdown digest.

## News Metadata Extraction

For each major news item, extract:

* `index`
* `title`
* `summary`
* `category`
* `tags`

The category MUST be read from:

```markdown
- Category: ...
```

The tags MUST be read from:

```markdown
- Tags: ...
```

The agent MUST NOT infer category or tags from the article title or body when explicit metadata is present.

If the English and Chinese digests contain inconsistent news metadata, the agent MUST resolve the inconsistency before publishing the index.

## Validation

Before publishing, the agent MUST verify:

* `./data/daily-index.json` is valid JSON;
* `version` is `1`;
* all dates are unique;
* entries are sorted newest first;
* every indexed English document exists;
* every indexed Chinese document exists;
* every entry has exactly 5 news items;
* `news_count` equals `news.length`;
* all five news items have unique indexes from 1 to 5;
* all five news items have a category;
* all news metadata matches the generated Markdown.

The agent MUST NOT include full Markdown content in `daily-index.json`.


---

# Phase 15 — Update README

Update:

* `./README.md`

README is the human-readable repository entry point.

`./data/daily-index.json` is the machine-readable archive index.

README SHOULD contain:

* the latest digest link;
* reverse chronological ordering;
* a maximum of 30 recent entries.

The README MUST NOT be treated as the canonical data source for frontend applications.

The frontend MUST use `./data/daily-index.json` for archive metadata.


---

# Phase 16 — Update State Files

Append newly processed items to:
- `./state/seen_urls.json`
- `./state/seen_titles.json`

Persist updated trend information.

---

# Phase 17 — GitHub Publishing

After all generation, indexing, README, and state updates succeed:

1. Run `git add` for all changed digest, index, README, and state files.
2. Create a commit.
3. Push to the configured GitHub repository.

The commit MUST include:

* the English daily digest;
* the Chinese daily digest;
* `./data/daily-index.json`;
* `./README.md` when changed;
* updated state files when changed.

Commit format:

`feat(daily): add AI digest for YYYY-MM-DD`

The agent SHOULD verify before committing:

* repository consistency;
* no broken links;
* valid Markdown;
* valid JSON;
* valid daily index;
* no duplicate daily index entries.

---

# Phase 18 — Notification Push

Optionally send:
- NTQQ/WeChat
- Telegram
- Feishu
- Slack
- Discord
- Notion updates
- mobile reading notifications

Push notifications should contain:
- short executive summary
- top headlines
- link to GitHub digest

Push content should remain:
- compact
- mobile-friendly
- markdown-safe

---

# Archive Structure

The repository SHOULD follow:

./daily/
./daily_zh/
./weekly/
./weekly_zh/
./monthly/
./monthly_zh/
./data/
./state/
./config/
./assets/

---

# State Rules

State files are dynamic runtime memory.

The agent MUST:
- update state after each successful run
- avoid corrupting state
- preserve historical continuity

The agent SHOULD NOT:
- erase previous state
- overwrite historical memory accidentally

---

# Failure Handling

If insufficient high-quality news exists:
- output fewer items
- maintain quality standards

Never:
- fill space with low-value news
- include hype-only stories

If GitHub publishing fails:
- preserve generated markdown locally
- retry publishing later

If state files are corrupted:
- initialize safe fallback state

---

# Quality Control Checklist

Before final publishing, verify:

* no duplicate stories;
* all links valid;
* primary sources preferred;
* markdown renders correctly;
* no hype-only content included;
* summaries contain technical substance;
* ranking follows scoring rules;
* trend observations are meaningful;
* exactly 5 major news items are present;
* every news item has exactly one category;
* every news item has zero or more tags;
* English and Chinese digests contain the same five news items in the same order;
* both daily documents contain valid YAML front matter;
* `./data/daily-index.json` is valid JSON;
* every indexed document exists;
* every index entry contains exactly 5 news items;
* `news_count` equals `news.length`;
* daily index dates are unique and sorted newest first.


The agent MUST prioritize:
signal quality over quantity.