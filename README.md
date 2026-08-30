Live Feed

A lightweight, automated market intelligence feed that pulls real financial news and data daily.

## View the live feed

**[Open the live feed](https://kel5star.github.io/sptmktintl/)**

The feed updates automatically every day at 7:30 AM EDT with real market data from 5 sources.

### Automation control

**[View Automation Guide](AUTOMATION.md)** — Learn how to turn automatic updates on/off, manually trigger fetches, or check automation status.

The workflow can be paused/resumed anytime without deleting or breaking anything — useful for testing, maintenance, or cost control.

## How it works **!!!INTERNAL BETA!!!**

- **Fetches from 5 sources**
- **Auto-classifies** each item by country, sector, industry, and news type using keyword matching
- **Updates daily** via GitHub Actions — `live-data.json` is committed automatically
- **Zero dependencies** — runs on Node.js with built-in modules only
- **Shareable** — deployed to GitHub Pages for instant access

## Setup (for development)

Clone the repo and run locally:

```bash
git clone https://github.com/kel5star/sptmktintl.git
cd sptmktintl
node serve.js
```

Then open http://localhost:5173

## Customization

- **Change fetch time**: Edit `.github/workflows/fetch-data.yml` line 6 (cron schedule)
- **Add/remove data sources**: Edit `fetch.js`
- **Adjust classification rules**: Edit `classify.js`

## How to use the live feed

- **Filter by country**: Click country tags to see news for specific regions
- **Filter by sector/industry**: Use the sidebar to narrow down by business category
- **Filter by news type**: View only IPOs, Deals, Company Updates, etc.
- **Read full stories**: Click any headline to see the original source link

## Data sources

- **Federal Reserve**: Press releases and policy announcements
- **Africanews**: Pan-African news (filtered for finance relevance)
- **The Africa Report**: African business and economics
- **World Bank**: Economic indicators for major African economies
- **BLS**: US labor and inflation statistics

## Adding new data sources

To add a new data source:

1. **RSS feeds**: Add a new source to the `FEEDS` array in `fetch.js`, specify the URL and any parsing rules
2. **APIs**: Add a new data-pulling function to `fetch.js` following the World Bank/BLS pattern
3. **Classification**: Update `classify.js` if you need new sector/industry/news-type keywords for the new source
4. **Finance filter**: If the source is general news, add it to the `isFinanceRelevant()` filter to avoid noise

See `fetch.js` for detailed patterns on how each source type is integrated.

## Technical architecture

- **`fetch.js`** — Daily fetcher that pulls from all 5 sources, parses/classifies data, merges with existing `live-data.json`, outputs `live-data.js` for the frontend
- **`classify.js`** — Keyword-based country/sector/industry/news-type tagger (no AI, free, always works)
- **`app.js`** — Frontend renderer: loads `live-data.js`, filters/groups by country/sector/industry, renders the UI
- **`index.html`, `styles.css`** — Static UI
- **`.github/workflows/fetch-data.yml`** — GitHub Actions workflow that runs `fetch.js` daily at 7:30 AM EDT and publishes to GitHub Pages
- **`docs/`** — Built feed files deployed to GitHub Pages (auto-generated, don't edit directly)

## How the update cycle works

1. GitHub Actions runs at 7:30 AM EDT every day
2. Runs `fetch.js` to pull fresh data from all 5 sources
3. Fetched data is merged with `live-data.json` (14-day retention, 300-item cap)
4. `live-data.js` is generated and committed to the repo
5. Workflow copies everything to `docs/` folder
6. GitHub Pages auto-updates with the latest feed

## Next steps: Cloud deployment & additional sources

For more detailed information on engineering, limitations, and extending the system:

**See [`README-live.md`](README-live.md)** — Contains:
- Detailed breakdown of each data source and why others were excluded
- Known limitations and workarounds
- How to swap in AI summarization/classification later
- Manual fetch/scheduling options
- Legal/ToS considerations for different sources

**Potential sources to add** (blocked/deferred in current version):
- **IMF DataMapper** — Economic indicators (try from your network if behind IP restrictions)
- **BEA (Bureau of Economic Analysis)** — US economic data (requires free API key registration)
- **OECD SDMX** — OECD economic indicators (complex query format, deferred for v1)
- **Reuters** — Would need paid Reuters Connect license
- **Bloomberg/FT/Yahoo Finance** — Would need paid data subscriptions

**Cloud next steps:**
- Deploy `fetch.js` to AWS Lambda / Google Cloud Functions / Azure Functions for automated cloud-based fetching
- Store `live-data.json` in cloud storage (S3, GCS, Azure Blob) for resilience
- Use cloud APIs directly instead of Node.js local script
- Add Anthropic Claude API for real AI summarization/classification (drop-in replacement for keyword matching)
