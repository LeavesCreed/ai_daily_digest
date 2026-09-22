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

- `/config/source_weights.yaml`
- `/config/scoring_rules.yaml`
- `/config/noise_filter.yaml`
- `/config/ranking_policy.md`

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

- `/state/seen_urls.json`
- `/state/seen_titles.json`
- `/state/entity_history.json`
- `/state/trend_memory.json`

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
`/state/seen_urls.json`

## Semantic Deduplication

Skip items whose titles are semantically equivalent to previously reported items in:
`/state/seen_titles.json`

When multiple articles describe the same event:
- keep the highest quality source
- prefer primary sources

---

# Phase 6 — Noise Filtering

Load rules from:
`/config/noise_filter.yaml`

Apply aggressive noise filtering.

Popularity MUST NOT increase ranking.

Technical significance is mandatory.

---

# Phase 7 — Importance Scoring

Load scoring rules from:
`/config/scoring_rules.yaml`

The agent SHOULD compute:

final_score =
importance_score × source_weight

---

# Phase 8 — Source Weighting

Load:
`/config/source_weights.yaml`

Apply source credibility weighting to the importance score.

---

# Phase 9 — Ranking

Load:
`/config/ranking_policy.yaml`

Apply ranking policy during candidate ordering.

---

# Phase 10 — Digest Generation

The agent MUST execute TWO distinct generation pipelines to output TWO separate files:
1. Read `./TEMPLATE.md` to generate the English digest (`diary.md`).
2. Read `./TEMPLATE_zh.md` to generate the Chinese digest (`diary_zh.md`).
- Follow section ordering strictly as defined in the respective templates.
- Maintain markdown formatting.

The agent SHOULD:
- reference `/SAMPLE.md`
- imitate tone and information density

---

# Digest Requirements

Generate:
- 5 to 10 high-quality items total
- concise summaries
- high information density

Output Structure MUST be strictly separated:
- File 1 (`diary.md`): 100% English. DO NOT include any Chinese text.
- File 2 (`diary_zh.md`): 100% Simplified Chinese. DO NOT include any English text (except for necessary technical terms, project names, or code elements).
- DO NOT mix English and Chinese summaries within the same section or the same file.

Avoid:
- filler
- marketing tone
- exaggerated language
- giant paragraphs

---

# Required Output Sections (Per File)

Both digests MUST independently include:
- Executive Summary
- Major News Items
- Important Paper of the Day
- Important GitHub Project
- Trend Observation

---

# Writing Style

Chinese summary (`diary_zh.md`) MUST:
- preserve technical precision
- avoid over-localization
- maintain engineering terminology (keep proper nouns and tech stacks in English if standard)
- use concise professional Chinese

English summary (`diary.md`) MUST:
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

# Phase 11 — Trend Memory Update

After generating the digest:

Update:
- `/state/entity_history.json`
- `/state/trend_memory.json`

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

# Phase 12 — Persist Markdown Digest

Create TWO distinct digest files for the current date:
- `/daily/YYYY-MM-DD.md` (English version)
- `/daily/YYYY-MM-DD_zh.md` (Chinese version)

Optional (Maintain the same naming convention if aggregated):
- `/weekly/YYYY-WW.md` and `/weekly/YYYY-WW_zh.md`
- `/monthly/YYYY-MM.md` and `/monthly/YYYY-MM_zh.md`

Both digest files MUST:
- render cleanly in standard Markdown
- remain mobile-friendly
- support GitHub native rendering (e.g., correct use of tables, code blocks, and line breaks)

---

# Phase 13 — Update README

Update:
`/README.md`

README should contain:
- latest digest links
- reverse chronological ordering
- maximum 30 recent entries

---

# Phase 14 — Update State Files

Append newly processed items to:
- `/state/seen_urls.json`
- `/state/seen_titles.json`

Persist updated trend information.

---

# Phase 15 — GitHub Publishing

After markdown generation:

1. git add
2. git commit
3. git push

Commit format:

`feat(daily): add AI digest for YYYY-MM-DD`

The agent SHOULD ensure:
- repository consistency
- no broken links
- clean markdown rendering

---

# Phase 16 — Notification Push

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

/daily/
/daily_zh/
/weekly/
/weekly_zh/
/monthly/
/monthly_zh/
/state/
/config/
/assets/

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

- no duplicate stories
- all links valid
- primary sources preferred
- markdown renders correctly
- no hype-only content included
- summaries contain technical substance
- ranking follows scoring rules
- trend observations are meaningful

The agent MUST prioritize:
signal quality over quantity.