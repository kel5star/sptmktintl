# Sprout Market Intelligence — Setup with GitHub Actions

This is a **fully automated, shareable** version of the Sprout feed. No local setup needed.

## What happens automatically

1. **GitHub Actions (Daily at 7:30 AM EDT)**
   - Fetches real market data from 5 sources (Fed, Africanews, Africa Report, World Bank, BLS)
   - Classifies with keyword heuristics
   - Commits `live-data.json` to the repo

2. **Cloud Routine (Daily at 7:30 AM EDT)**
   - Reads `live-data.json` from GitHub
   - Builds the HTML feed
   - Publishes to a shareable artifact link

## Setup (5 minutes)

### Step 1: Fork the repository
1. Go to the repo on GitHub
2. Click **Fork** in the top right
3. Choose where to fork it (your account)

### Step 2: Enable GitHub Actions
1. In your forked repo, go to **Settings** → **Actions** → **General**
2. Under "Actions permissions", select **Allow all actions and reusable workflows**
3. Click **Save**

### Step 3: Get your raw data URL
Your feed data will be published at:
```
https://raw.githubusercontent.com/YOUR_USERNAME/sprout-market-intelligence-live/main/live-data.json
```

### Step 4: Set up the cloud routine
The cloud routine will automatically read from your repo's URL and publish the feed to a shareable artifact.

## That's it!

The workflow runs daily at 7:30 AM EDT. Check the **Actions** tab in your repo to see the runs.

## Manual run

To trigger a fetch right now:
1. Go to **Actions** tab
2. Select "Daily Market Data Fetch" workflow
3. Click **Run workflow** → **Run workflow**

## Viewing your feed

Once the cloud routine is set up, your feed will be live at a shareable link. Click it anytime to see the latest data.

## Customization

- **Change fetch time**: Edit `.github/workflows/fetch-data.yml`, line 6 (cron schedule)
- **Add/remove data sources**: Edit `fetch.js` in the repo
- **Adjust classification rules**: Edit `classify.js`

## Troubleshooting

**Actions not running?**
- Make sure Actions are enabled (Step 2 above)
- Check the **Actions** tab → workflow logs for errors

**No data in the feed?**
- Wait for the first run (7:30 AM EDT or manually trigger)
- Check the Actions run log to see if fetch succeeded

## Notes

- No Windows Task Scheduler needed
- No local machine setup required
- Completely portable — anyone can fork and set up their own
- All data is open-source (Fed, World Bank, BLS, Africanews, Africa Report)
