// Keyword-based classification, used because this project deliberately has
// no LLM step (see README-live.md). Best-effort, not a substitute for real
// entity extraction — some items will be miscategorized.
"use strict";

const { COUNTRIES } = require("./live-shared.js");

// Ordered so more specific multi-word names are tried before generic ones.
const COUNTRY_MATCHERS = COUNTRIES.slice().sort((a, b) => b.length - a.length);

function matchCountry(text) {
  const lower = text.toLowerCase();
  for (const country of COUNTRY_MATCHERS) {
    if (lower.includes(country.toLowerCase())) return country;
  }
  // Common short forms not equal to their official name.
  if (/\bivory coast\b/i.test(text)) return "Côte d'Ivoire";
  if (/\bcape verde\b/i.test(text)) return "Cabo Verde";
  if (/\bdr congo\b|\bdrc\b/i.test(text)) return "Democratic Republic of the Congo";
  if (/\bswaziland\b/i.test(text)) return "Eswatini";
  return null;
}

const CATEGORY_RULES = [
  { re: /\b(bank|lender|banking|loan|deposit)\b/i, sector: "Financials", industry: "Banking" },
  { re: /\b(cement)\b/i, sector: "Materials", industry: "Cement" },
  { re: /\b(oil|gas|petroleum|crude|pipeline)\b/i, sector: "Energy", industry: "Oil & Gas" },
  { re: /\b(telecom|mobile|5g|spectrum|network operator)\b/i, sector: "Communication Services", industry: "Telecom Services" },
  { re: /\b(mining|copper|gold|diamond|cobalt|lithium)\b/i, sector: "Materials", industry: "Mining" },
  { re: /\b(cocoa|coffee|agricultur|farm|crop)\b/i, sector: "Consumer Staples", industry: "Agriculture" },
  { re: /\b(power|electricity|grid|solar|renewable|hydro)\b/i, sector: "Utilities", industry: "Power Generation" },
  { re: /\b(inflation|interest rate|monetary policy|central bank|gdp|policy rate)\b/i, sector: "Financials", industry: "Central Banking" },
  { re: /\b(insurance|insurer)\b/i, sector: "Financials", industry: "Insurance" },
  { re: /\b(automaker|automotive|vehicle assembly)\b/i, sector: "Industrials", industry: "Automotive" },
];

function matchCategory(text) {
  for (const rule of CATEGORY_RULES) {
    if (rule.re.test(text)) return { sector: rule.sector, industry: rule.industry };
  }
  return { sector: "General", industry: "General News" };
}

const NEWS_TYPE_RULES = [
  { re: /\bipo\b|initial public offering|listing date|to list on/i, type: "IPO" },
  { re: /\b(acqui|merger|stake|expansion|invest(ment|s)?|deal valued|signs? (a |an )?agreement)\b/i, type: "Deal" },
  { re: /\b(profit|earnings|revenue|quarterly|q[1-4] results|reports? (a )?(rise|growth|decline))\b/i, type: "Company Update" },
  { re: /\b(license|licence|regulat|approv|ban|enforcement action|compliance|requirement)\b/i, type: "Regulatory" },
  { re: /\b(rate|inflation|gdp|policy|cpi|unemployment|monetary|fiscal)\b/i, type: "Economic Driver" },
];

function matchNewsType(text, fallback) {
  for (const rule of NEWS_TYPE_RULES) {
    if (rule.re.test(text)) return rule.type;
  }
  return fallback || "Macro Data";
}

// Deliberately excludes bare "million"/"billion"/"shares" — too generic
// (sports transfer fees, disaster costs, casual phrasing all trip them);
// "$" and "%" already catch genuine monetary/rate mentions more precisely.
const RELEVANCE_RE = new RegExp(
  [
    "econom", "\\bmarket", "\\bstock", "exchange", "\\bbank", "invest", "\\bgdp\\b", "inflation",
    "\\btrade\\b", "export", "import", "currency", "\\bipo\\b", "budget", "\\btax", "central bank",
    "revenue", "profit", "earnings", "mining", "\\boil\\b", "\\bgas\\b", "telecom", "agricultur",
    "\\bdeal\\b", "acquisition", "merger", "regulator", "interest rate",
    "\\bdebt\\b", "\\bbond", "\\bloan", "%", "\\$",
  ].join("|"),
  "i"
);

function isFinanceRelevant(text) {
  return RELEVANCE_RE.test(text);
}

module.exports = { matchCountry, matchCategory, matchNewsType, isFinanceRelevant };
