// Shared constants for the Node-side scripts (fetch.js, classify.js).
// Kept in sync in spirit with the sample MVP's data.js, but this file is
// CommonJS (require()'d by fetch.js) rather than a browser global.
"use strict";

const COUNTRIES = [
  "Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cabo Verde",
  "Cameroon","Central African Republic","Chad","Comoros",
  "Democratic Republic of the Congo","Republic of the Congo","Côte d'Ivoire",
  "Djibouti","Egypt","Equatorial Guinea","Eritrea","Eswatini","Ethiopia",
  "Gabon","Gambia","Ghana","Guinea","Guinea-Bissau","Kenya","Lesotho",
  "Liberia","Libya","Madagascar","Malawi","Mali","Mauritania","Mauritius",
  "Morocco","Mozambique","Namibia","Niger","Nigeria","Rwanda",
  "São Tomé and Príncipe","Senegal","Seychelles","Sierra Leone","Somalia",
  "South Africa","South Sudan","Sudan","Tanzania","Togo","Tunisia","Uganda",
  "Zambia","Zimbabwe"
];

const COUNTRY_CODES = {
  "Algeria": "DZ", "Angola": "AO", "Benin": "BJ", "Botswana": "BW",
  "Burkina Faso": "BF", "Burundi": "BI", "Cabo Verde": "CV", "Cameroon": "CM",
  "Central African Republic": "CF", "Chad": "TD", "Comoros": "KM",
  "Democratic Republic of the Congo": "CD", "Republic of the Congo": "CG",
  "Côte d'Ivoire": "CI", "Djibouti": "DJ", "Egypt": "EG",
  "Equatorial Guinea": "GQ", "Eritrea": "ER", "Eswatini": "SZ",
  "Ethiopia": "ET", "Gabon": "GA", "Gambia": "GM", "Ghana": "GH",
  "Guinea": "GN", "Guinea-Bissau": "GW", "Kenya": "KE", "Lesotho": "LS",
  "Liberia": "LR", "Libya": "LY", "Madagascar": "MG", "Malawi": "MW",
  "Mali": "ML", "Mauritania": "MR", "Mauritius": "MU", "Morocco": "MA",
  "Mozambique": "MZ", "Namibia": "NA", "Niger": "NE", "Nigeria": "NG",
  "Rwanda": "RW", "São Tomé and Príncipe": "ST", "Senegal": "SN",
  "Seychelles": "SC", "Sierra Leone": "SL", "Somalia": "SO",
  "South Africa": "ZA", "South Sudan": "SS", "Sudan": "SD", "Tanzania": "TZ",
  "Togo": "TG", "Tunisia": "TN", "Uganda": "UG", "Zambia": "ZM",
  "Zimbabwe": "ZW",
};

const SOURCE_URLS = {
  "Federal Reserve": "https://www.federalreserve.gov",
  "Africanews": "https://www.africanews.com/",
  "The Africa Report": "https://www.theafricareport.com/",
  "World Bank": "https://www.worldbank.org",
  "U.S. Bureau of Labor Statistics": "https://www.bls.gov",
};

module.exports = { COUNTRIES, COUNTRY_CODES, SOURCE_URLS };
