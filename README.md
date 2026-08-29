# Sprout Market Intelligence — Live Feed

A lightweight, automated market intelligence feed that pulls real financial news and data daily.

## View the live feed

**👉 [Open the live feed](https://kel5star.github.io/sptmktintl/)**

The feed updates automatically every day at 7:30 AM EDT with real market data from 5 sources.

## How it works

- **Fetches from 5 sources**: Federal Reserve, Africanews, The Africa Report, World Bank, BLS
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
