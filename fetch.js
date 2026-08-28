// Personal-use fetcher: pulls real headlines/data from a handful of open
// RSS feeds and public statistical APIs, classifies them with keyword
// heuristics (no LLM — see README-live.md for why), merges with the
// previous run, and writes live-data.js for the frontend to read.
//
// No npm dependencies (Node here is v13; this only uses core modules so it
// keeps running without `npm install`). Run manually with `node fetch.js`,
// or on the Task Scheduler entry described in README-live.md.
"use strict";

const https = require("https");
const fs = require("fs");
const path = require("path");

const { COUNTRIES, COUNTRY_CODES, SOURCE_URLS } = require("./live-shared.js");
const { matchCountry, matchCategory, matchNewsType, isFinanceRelevant } = require("./classify.js");

const DATA_JSON_PATH = path.join(__dirname, "live-data.json");
const DATA_JS_PATH = path.join(__dirname, "live-data.js");
const LOG_PATH = path.join(__dirname, "run-log.txt");

const RETENTION_DAYS = 14;
const MAX_ITEMS = 300;

// ---- tiny HTTP GET (no deps), follows a couple of redirects ----
function httpGet(url, extraHeaders, redirectsLeft) {
  if (redirectsLeft === undefined) redirectsLeft = 4;
  return new Promise((resolve, reject) => {
    const headers = Object.assign(
      { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) sprout-market-intelligence-live/personal-use" },
      extraHeaders || {}
    );
    const req = https.get(url, { headers: headers, timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        resolve(httpGet(next, extraHeaders, redirectsLeft - 1));
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    req.on("timeout", () => req.destroy(new Error(`Timeout fetching ${url}`)));
    req.on("error", reject);
  });
}

// ---- minimal RSS parsing (no XML dependency) ----
function decodeEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripTags(s) {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTag(block, tag) {
  const cdataRe = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, "i");
  const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = cdataRe.exec(block) || plainRe.exec(block);
  if (!m) return "";
  return decodeEntities(stripTags(m[1])).trim();
}

function parseRSS(xml) {
  const items = [];
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    items.push({
      title: extractTag(block, "title"),
      link: extractTag(block, "link"),
      description: extractTag(block, "description"),
      pubDate: extractTag(block, "pubDate"),
      guid: extractTag(block, "guid") || extractTag(block, "link"),
      category: extractTag(block, "category"),
    });
  }
  return items;
}

function trimSummary(text, maxLen) {
  if (!maxLen) maxLen = 220;
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}

function safeDate(pubDate) {
  const d = new Date(pubDate);
  return isNaN(d.getTime()) ? new Date() : d;
}

// ---- RSS sources ----
async function fetchFederalReserve() {
  const xml = await httpGet("https://www.federalreserve.gov/feeds/press_all.xml");
  const items = parseRSS(xml);
  const out = [];
  for (const it of items) {
    if (!it.title || !it.link) continue;
    const text = it.title + " " + it.description;
    const cat = matchCategory(text);
    let newsType = "Economic Driver";
    if (/enforcement/i.test(it.category)) newsType = "Regulatory";
    else if (/monetary/i.test(it.category)) newsType = "Economic Driver";
    else if (/regulatory/i.test(it.category)) newsType = "Regulatory";
    out.push({
      id: "fed-" + it.guid,
      country: "Regional", countryCode: "US", exchange: "n/a",
      sector: "Macro", industry: it.category || cat.industry,
      newsType: newsType,
      headline: it.title,
      summary: trimSummary(it.description || it.title, 200),
      story: it.description || it.title,
      source: "Federal Reserve",
      url: it.link,
      tickers: [], portfolio: false,
      publishedAt: safeDate(it.pubDate).toISOString(),
    });
  }
  return out;
}

async function fetchGeneralNewsRSS(sourceName, url) {
  const xml = await httpGet(url);
  const items = parseRSS(xml);
  const out = [];
  let skippedIrrelevant = 0;
  for (const it of items) {
    if (!it.title || !it.link) continue;
    const text = it.title + " " + it.description;
    if (!isFinanceRelevant(text)) {
      skippedIrrelevant++;
      continue;
    }
    const country = matchCountry(text);
    const cat = matchCategory(text);
    out.push({
      id: sourceName.toLowerCase().replace(/\s+/g, "-") + "-" + it.guid,
      country: country || "Regional",
      countryCode: country ? (COUNTRY_CODES[country] || "—") : "—",
      exchange: "n/a",
      sector: cat.sector, industry: cat.industry,
      newsType: matchNewsType(text),
      headline: it.title,
      summary: trimSummary(it.description || it.title, 200),
      story: it.description || it.title,
      source: sourceName,
      url: it.link,
      tickers: [], portfolio: false,
      publishedAt: safeDate(it.pubDate).toISOString(),
    });
  }
  return { items: out, skippedIrrelevant: skippedIrrelevant, totalSeen: items.length };
}

// ---- statistical / data-API sources (headline synthesized from numbers, not summarized text) ----
const WB_COUNTRIES = [
  { iso3: "NGA", name: "Nigeria" },
  { iso3: "ZAF", name: "South Africa" },
  { iso3: "KEN", name: "Kenya" },
  { iso3: "EGY", name: "Egypt" },
  { iso3: "GHA", name: "Ghana" },
  { iso3: "MAR", name: "Morocco" },
  { iso3: "ETH", name: "Ethiopia" },
  { iso3: "TZA", name: "Tanzania" },
  { iso3: "CIV", name: "Côte d'Ivoire" },
  { iso3: "AGO", name: "Angola" },
];
const WB_INDICATORS = [
  { code: "NY.GDP.MKTP.KD.ZG", label: "Real GDP growth", industry: "Growth Outlook" },
  { code: "FP.CPI.TOTL.ZG", label: "Consumer price inflation", industry: "Inflation" },
];

async function fetchWorldBankOne(country, indicator, existingById) {
  const url = `https://api.worldbank.org/v2/country/${country.iso3}/indicator/${indicator.code}?format=json&per_page=10`;
  const body = await httpGet(url);
  const json = JSON.parse(body);
  const rows = (json && json[1]) || [];
  const withValue = rows.filter((r) => r.value !== null && r.value !== undefined);
  if (withValue.length === 0) return null;
  const latest = withValue[0];
  const prior = withValue[1];
  const value = Math.round(latest.value * 10) / 10;
  let trend = "";
  if (prior && prior.value !== null) {
    const priorValue = Math.round(prior.value * 10) / 10;
    trend = value > priorValue ? `, up from ${priorValue}% in ${prior.date}` : value < priorValue ? `, down from ${priorValue}% in ${prior.date}` : "";
  }
  const id = `wb-${country.iso3}-${indicator.code}-${latest.date}`;
  const headline = `${country.name} ${indicator.label.toLowerCase()}: ${value}% (${latest.date})`;
  const existing = existingById.get(id);
  return {
    id: id,
    country: country.name, countryCode: COUNTRY_CODES[country.name] || "—", exchange: "n/a",
    sector: "Macro", industry: indicator.industry,
    newsType: "Macro Data",
    headline: headline,
    summary: `${indicator.label} was ${value}% in ${latest.date}${trend}.`,
    story: `The World Bank's latest published figure for ${country.name}'s ${indicator.label.toLowerCase()} is ${value}% for ${latest.date}${trend}. This is sourced directly from World Bank open data, not a news article.`,
    source: "World Bank",
    url: `https://data.worldbank.org/indicator/${indicator.code}?locations=${country.iso3}`,
    tickers: [], portfolio: false,
    publishedAt: existing ? existing.publishedAt : new Date().toISOString(),
  };
}

async function fetchWorldBank(existingById) {
  const out = [];
  for (const country of WB_COUNTRIES) {
    for (const indicator of WB_INDICATORS) {
      try {
        const item = await fetchWorldBankOne(country, indicator, existingById);
        if (item) out.push(item);
      } catch (err) {
        // one country/indicator failing shouldn't stop the rest
        out.push({ __error: `World Bank ${country.iso3}/${indicator.code}: ${err.message}` });
      }
    }
  }
  return out;
}

const BLS_SERIES = [
  { id: "LNS14000000", label: "U.S. unemployment rate", industry: "Labor Market", isIndex: false },
  { id: "CUUR0000SA0", label: "U.S. CPI-U inflation (year-over-year)", industry: "Inflation", isIndex: true },
];

async function fetchBLS(existingById) {
  const out = [];
  for (const series of BLS_SERIES) {
    try {
      const body = await httpGet(`https://api.bls.gov/publicAPI/v2/timeseries/data/${series.id}`);
      const json = JSON.parse(body);
      const rows = (json.Results && json.Results.series && json.Results.series[0] && json.Results.series[0].data) || [];
      if (rows.length === 0) continue;
      const latest = rows[0];
      const period = `${latest.periodName} ${latest.year}`;
      const id = `bls-${series.id}-${latest.year}-${latest.period}`;
      const existing = existingById.get(id);

      let displayValue, summary, story;
      if (series.isIndex) {
        // This is an index level (e.g. CPI-U), not directly meaningful on its
        // own — compute a proper year-over-year % change from the same
        // response instead of showing the raw index number.
        const yearAgo = rows.find((r) => r.period === latest.period && Number(r.year) === Number(latest.year) - 1);
        if (!yearAgo) continue; // not enough history in this response to compute YoY
        const pct = ((parseFloat(latest.value) - parseFloat(yearAgo.value)) / parseFloat(yearAgo.value)) * 100;
        displayValue = `${pct.toFixed(1)}%`;
        summary = `${series.label} was ${displayValue} in ${period}, based on the CPI-U index rising from ${yearAgo.value} to ${latest.value} over the year.`;
        story = `The U.S. Bureau of Labor Statistics' CPI-U index was ${latest.value} in ${period}, versus ${yearAgo.value} a year earlier — a year-over-year change of ${displayValue}. Computed directly from BLS open data, not a news article.`;
      } else {
        const prior = rows[1];
        let trend = "";
        if (prior) trend = parseFloat(latest.value) > parseFloat(prior.value)
          ? `, up from ${prior.value} in ${prior.periodName} ${prior.year}`
          : parseFloat(latest.value) < parseFloat(prior.value)
          ? `, down from ${prior.value} in ${prior.periodName} ${prior.year}`
          : "";
        displayValue = `${latest.value}%`;
        summary = `${series.label} was ${displayValue} in ${period}${trend}.`;
        story = `The U.S. Bureau of Labor Statistics' latest published figure for ${series.label.toLowerCase()} is ${displayValue} for ${period}${trend}. Sourced directly from BLS open data, not a news article.`;
      }

      out.push({
        id: id,
        country: "Regional", countryCode: "US", exchange: "n/a",
        sector: "Macro", industry: series.industry,
        newsType: "Economic Driver",
        headline: `${series.label}: ${displayValue} (${period})`,
        summary: summary,
        story: story,
        source: "U.S. Bureau of Labor Statistics",
        url: `https://data.bls.gov/timeseries/${series.id}`,
        tickers: [], portfolio: false,
        publishedAt: existing ? existing.publishedAt : new Date().toISOString(),
      });
    } catch (err) {
      out.push({ __error: `BLS ${series.id}: ${err.message}` });
    }
  }
  return out;
}

// ---- merge / retention ----
function loadExisting() {
  try {
    const raw = fs.readFileSync(DATA_JSON_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch (err) {
    return [];
  }
}

function mergeAndPrune(existingItems, freshItems) {
  const byId = new Map();
  existingItems.forEach((it) => byId.set(it.id, it));
  freshItems.forEach((it) => byId.set(it.id, it)); // fresh data wins on conflict, publishedAt already preserved where relevant

  let merged = Array.from(byId.values());
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  merged = merged.filter((it) => {
    const t = new Date(it.publishedAt).getTime();
    return isNaN(t) ? true : t >= cutoff;
  });
  merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  if (merged.length > MAX_ITEMS) merged = merged.slice(0, MAX_ITEMS);
  return merged;
}

function writeOutputs(items) {
  const now = new Date().toISOString();
  fs.writeFileSync(DATA_JSON_PATH, JSON.stringify({ lastFetchedAt: now, items: items }, null, 2), "utf8");

  // "var" (not const/let) so these reliably attach to the global object in
  // every environment that loads this as a classic <script> — including
  // ones where that distinction matters, not just mainstream browsers.
  const js = [
    "// Generated by fetch.js — do not hand-edit, it is overwritten every run.",
    "var LAST_FETCHED_AT = " + JSON.stringify(now) + ";",
    "var COUNTRIES = " + JSON.stringify(COUNTRIES) + ";",
    "var SOURCE_URLS = " + JSON.stringify(SOURCE_URLS) + ";",
    "var NEWS_ITEMS = " + JSON.stringify(items, null, 2) + ";",
    "",
  ].join("\n\n");
  fs.writeFileSync(DATA_JS_PATH, js, "utf8");
}

function appendLog(lines) {
  const header = `\n[${new Date().toISOString()}]\n`;
  fs.appendFileSync(LOG_PATH, header + lines.join("\n") + "\n", "utf8");
}

async function main() {
  const logLines = [];
  const existingItems = loadExisting();
  const existingById = new Map(existingItems.map((it) => [it.id, it]));
  let fresh = [];

  const sources = [
    { name: "Federal Reserve (RSS)", run: () => fetchFederalReserve() },
    { name: "Africanews (RSS)", run: () => fetchGeneralNewsRSS("Africanews", "https://www.africanews.com/feed/") },
    { name: "The Africa Report (RSS)", run: () => fetchGeneralNewsRSS("The Africa Report", "https://www.theafricareport.com/feed/") },
    { name: "World Bank (API)", run: () => fetchWorldBank(existingById) },
    { name: "BLS (API)", run: () => fetchBLS(existingById) },
  ];

  for (const src of sources) {
    try {
      const result = await src.run();
      const items = Array.isArray(result) ? result : result.items;
      const errors = items.filter((i) => i.__error);
      const ok = items.filter((i) => !i.__error);
      fresh = fresh.concat(ok);
      let line = `${src.name}: kept ${ok.length}`;
      if (!Array.isArray(result) && typeof result.totalSeen === "number") {
        line += ` (of ${result.totalSeen} seen, ${result.skippedIrrelevant} skipped as not finance-relevant)`;
      }
      if (errors.length) line += ` — ${errors.length} sub-errors: ${errors.map((e) => e.__error).join("; ")}`;
      logLines.push(line);
    } catch (err) {
      logLines.push(`${src.name}: FAILED — ${err.message}`);
    }
  }

  const merged = mergeAndPrune(existingItems, fresh);
  writeOutputs(merged);
  logLines.push(`Total items after merge/prune: ${merged.length} (retention ${RETENTION_DAYS}d, cap ${MAX_ITEMS})`);
  appendLog(logLines);
  console.log(logLines.join("\n"));
}

main().catch((err) => {
  appendLog([`FATAL: ${err.stack || err.message}`]);
  console.error(err);
  process.exit(1);
});
