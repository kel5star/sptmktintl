# Controlling the Automated Feed Updates

The feed updates automatically every day at **7:30 AM EDT** via GitHub Actions. You can turn this on/off as needed.

## Turn OFF automation (pause daily updates)

1. Go to your repository: **https://github.com/YOUR_USERNAME/sptmktintl**
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `ENABLE_AUTO_FETCH`
5. Value: `false`
6. Click **Add secret**

The workflow will still exist and can be manually triggered, but daily automatic runs will stop.

## Turn ON automation (resume daily updates)

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Find `ENABLE_AUTO_FETCH`
3. Click the trash icon to delete it
4. Automatic daily runs will resume

## Manually trigger a fetch (anytime)

Even if automation is OFF, you can manually fetch right now:

1. Go to **Actions** tab
2. Click **Daily Market Data Fetch**
3. Click **Run workflow** → **Run workflow**

The fetch will run immediately and update the feed.

## Check if automation is running

Go to **Actions** tab → **Daily Market Data Fetch**

- **Green checkmarks** = Successful daily runs
- **Red X** = Run failed (check logs for errors)
- **Skipped** = Automation is disabled via `ENABLE_AUTO_FETCH = false`

## Why would you disable automation?

- **Debugging** — Test changes locally before they auto-publish
- **Maintenance** — Pause updates while you modify sources or fix issues
- **Cost control** — GitHub Actions has free tier limits (though this workflow is lightweight)
- **Manual control** — Only update when you explicitly choose to

## Default behavior

If you don't set `ENABLE_AUTO_FETCH`, automation is **ON** by default. Only create the secret to disable it.
