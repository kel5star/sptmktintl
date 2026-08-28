# Sprout — Market Intelligence (Live, personal use)

A second copy of the `sprout-market-intelligence` MVP that pulls **real**
content instead of sample data. The original sample-data MVP at
`C:\Users\kevin\Downloads\sprout-market-intelligence` is untouched — this is
a separate project.

**This is for personal use only.** See the legal discussion earlier in this
project's history: headline + short extractive description + link-out is a
much lower-risk pattern than reproducing article text, but scraping sites
whose Terms of Service prohibit it (Bloomberg, FT, Seeking Alpha, Reuters)
is a separate issue from copyright, and this build deliberately avoids them
rather than relying on "personal use" as legal cover.

## How it's different from the sample MVP

- **No AI summarization** (by design/choice, not a limitation of the
  approach) — free, no API key. RSS items use the source's own short
  description, trimmed, not rewritten. Country is tagged by keyword match;
  sector/industry/news-type by a small keyword dictionary
  (`classify.js`). This means classification will sometimes be wrong or
  land in "General" — it's a heuristic, not judgment.
- **Real per-article links.** Every item's "Read full story" link goes to
  the actual source article/data page, not just a homepage.
- **Auto-updates.** A Windows Task Scheduler task (`SproutLiveFeedFetch`)
  runs `fetch.js` every 45 minutes in the background. You don't need to do
  anything for new content to show up — just reopen the page.

## What's actually being pulled (verified working as of setup)

| Source | Kind | Notes |
|---|---|---|
| Federal Reserve press releases | RSS | Uses the feed's own `<category>` for news-type |
| Africanews | RSS, general news | Filtered by a finance/markets keyword gate before inclusion |
| The Africa Report | RSS | Same filter |
| World Bank | Data API | GDP growth + inflation for 10 major African economies, synthesized into a factual headline (not text summarization) |
| U.S. Bureau of Labor Statistics | Data API | Unemployment rate + a computed year-over-year CPI inflation rate |

**Deliberately not included, and why:**
- **Reuters** — no working public RSS anymore; would need a paid Reuters Connect license.
- **Bloomberg, Financial Times, Seeking Alpha, TradingView, Morningstar, Investing.com, Yahoo Finance** — none offer a free public feed/API; would need a paid data license.
- **IMF DataMapper API** — returned 403 (bot/IP filtering) from the sandbox this was built in. `fetch.js` doesn't call it at all yet; worth adding if you want to try it from your own network — treat a persistent 403 as "not available," not a bug to chase.
- **BEA, OECD** — reachable but need a free registered key (BEA) or a much heavier query setup (OECD SDMX); left out of v1 to keep the source list small and reliable rather than half-working.

## Known limitations

- **Exchange is "n/a" for almost everything.** There's no free company→stock-exchange lookup wired in, so the "NGX / JSE / GSE" filter pills won't have much to filter by yet. The country/sector/industry axes work; exchange doesn't, for now.
- **Classification is approximate.** A keyword hit on "oil" will tag an unrelated story as Energy if "oil" appears in any context (this actually happened during testing — a Brazil hair-recycling story got picked up because of "oil spills"). The relevance filter and category rules in `classify.js` are tuned to reduce this, not eliminate it.
- **Data-API items don't update often.** World Bank/BLS figures change monthly or yearly, not every 45 minutes — you'll see the same items persist with their original "first seen" timestamp until the underlying number actually changes.

## Running it

- **View the feed:** `node serve.js` from this folder, then open `http://localhost:5173`.
- **Fetch manually:** `node fetch.js` — safe to run anytime; it merges with existing data rather than replacing it.
- **Check what happened on the last run:** `run-log.txt` (per-source counts and any errors, newest at the bottom).
- **Canonical data store:** `live-data.json` (persists between runs). `live-data.js` is regenerated from it every run for the frontend to load — don't hand-edit either.

No `npm install` needed — same as the sample MVP, everything here only uses Node's built-in modules so it keeps working on the old Node version on this machine.

## The scheduled task

```
schtasks /create /tn "SproutLiveFeedFetch" /tr "node.exe C:\Users\kevin\sprout-market-intelligence-live\fetch.js" /sc minute /mo 45 /f
```

Useful commands:
- Check status: `schtasks /query /tn "SproutLiveFeedFetch" /fo LIST /v`
- Run it once right now: `schtasks /run /tn "SproutLiveFeedFetch"`
- Change the interval: delete and recreate with a different `/mo` value.
- Turn it off: `schtasks /delete /tn "SproutLiveFeedFetch" /f`

## If you change your mind about the LLM step later

Swapping in real AI summarization/classification later doesn't require
rebuilding this — in `fetch.js`, after building each item and before
pushing it into the output array, you'd call the Anthropic API with the
title + description and a small structured-output prompt (return JSON:
`summary`, `story`, `country`, `sector`, `industry`, `newsType`), replacing
the `matchCountry`/`matchCategory`/`matchNewsType` calls for that item. The
merge/retention/frontend code doesn't need to change at all — same item
shape either way.
