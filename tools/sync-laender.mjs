// The page «Countries» / «Länder» of MDB B2B Check: which check for which country, and the official system behind it.
//
//   node tools/sync-laender.mjs <path to MDB-apps>/docs/apps/b2b-check/laender.json
//   node tools/sync-laender.mjs <…>/laender.json --check     exit 1 if the page is not what the file gives
//
// laender.json is generated in MDB-apps from the country tables of the app and its live switches
// (b2b-check/test/country-overview.test.ts). This repo keeps no copy: the script writes the whole page
// apps/b2b-check/countries/index.html from it. One table for both languages (country names in both, systems by
// their short name), so the page stays small; a legend names each system with the page where a person can repeat
// the check. Run it after laender.json changes (README, «Checks»).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const PAGE = join(ROOT, "apps", "b2b-check", "countries", "index.html");

/** The column heads, per language, in the order of laender.json `checks`. A check missing here stops the script. */
export const CHECK_TEXT = {
  vat_live: { en: "VAT ID live", de: "USt-IdNr. live" },
  company_register: { en: "Company register", de: "Firmenregister" },
  bank_account: { en: "Bank account at the tax office", de: "Bankkonto beim Finanzamt" },
  eori: { en: "EORI", de: "EORI" },
  peppol: { en: "Peppol by VAT ID", de: "Peppol über USt-IdNr." },
  late_interest: { en: "Late-payment interest", de: "Verzugszins" },
  iban: { en: "IBAN", de: "IBAN" },
  number_format: { en: "Number format", de: "Format der Nummer" },
};
/** Short name of each system in the table (language-neutral); its full name and link are in the legend. */
export const SHORT = {
  vies: "VIES", uid_ch: "UID", eos: "EOS", peppol_directory: "Peppol", ecb: "ECB", riksbank: "Riksbank",
  dk_nationalbank: "Nationalbank", nbp: "NBP", cnb: "ČNB", pl_whitelist: "Biała lista", cz_adis: "Registr DPH",
  ares: "ARES", brreg: "Brønnøysund", prh: "PRH/YTJ", gb_companies_house: "Companies House",
  fr_sirene: "Sirene", sk_rpo: "RPO", lv_ur: "UR", tw_gcis: "GCIS", th_rd: "RD", aeo: "AEO",
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const both = (t) => `<span lang="en">${esc(t.en)}</span><span lang="de">${esc(t.de)}</span>`;

export function page(data) {
  for (const c of data.checks) if (!CHECK_TEXT[c.key]) throw new Error(`check ${c.key} has no text in CHECK_TEXT (tools/sync-laender.mjs)`);
  for (const id of Object.keys(data.sources)) if (!SHORT[id]) throw new Error(`source ${id} has no short name in SHORT (tools/sync-laender.mjs)`);
  for (const s of Object.values(data.sources)) if (!/^https:\/\/[^\s"<>]+$/.test(s.url)) throw new Error(`source ${s.name}: no https link`);
  const keys = data.checks.map((c) => c.key);
  const cell = (c) => (!c ? "<td>–</td>" : c.calculated ? `<td class="calc">✓</td>` : `<td>${esc(SHORT[c.source])}</td>`);
  const rows = [...data.countries]
    .sort((a, b) => a.name.en.localeCompare(b.name.en, "en"))
    .map((c) => `<tr><th scope="row">${both(c.name)}</th>${keys.map((k) => cell(c.checks[k])).join("")}</tr>`);
  const count = (k) => data.countries.filter((c) => c.checks[k]).length;
  const legend = Object.entries(data.sources).map(([id, s]) => `<li><b>${esc(SHORT[id])}</b> <a href="${esc(s.url)}">${esc(s.name)}</a></li>`);
  const n = data.countries.length;

  const intro = {
    en: `What MDB B2B Check checks in which country, and which system the answer comes from. ${n} countries and territories; the list is generated from the app itself and shows only what is switched on.`,
    de: `Was MDB B2B Check in welchem Land prüft und aus welchem System die Antwort kommt. ${n} Länder und Gebiete; die Liste entsteht aus der App selbst und zeigt nur, was eingeschaltet ist.`,
  };
  const how = {
    en: [
      "<b>VIES, UID, EOS, registers and tax offices</b> are official systems. The app asks them live and passes on their answer with source and time.",
      "<b>Peppol</b> is the e-invoicing network run by OpenPeppol, with its directory of participants. A missing entry is a hint, not proof.",
      "<b>Late-payment interest</b>: the rate comes from the central bank, the app does the calculation.",
      "<b>✓</b> means the app checks itself, without asking anyone: IBAN length and check digits after the SWIFT register, number formats and check digits after the rules of the country, and the statutory 5 % in Switzerland.",
      "<b>Worldwide</b>, without a country list: LEI search and the bank behind a BIC (GLEIF), Peppol search by company name, ECB exchange rates.",
    ],
    de: [
      "<b>VIES, UID, EOS, Register und Steuerverwaltungen</b> sind amtliche Systeme. Die App fragt sie live und gibt ihre Antwort mit Quelle und Zeitpunkt weiter.",
      "<b>Peppol</b> ist das Netz für E-Rechnungen von OpenPeppol, mit dem Verzeichnis der Teilnehmer. Ein fehlender Eintrag ist ein Hinweis, kein Beweis.",
      "<b>Verzugszins</b>: Den Zinssatz liefert die Notenbank, die Rechnung macht die App.",
      "<b>✓</b> heisst: Die App prüft selbst, ohne jemanden zu fragen: Länge und Prüfziffern der IBAN nach dem SWIFT-Register, Form und Prüfziffer von Nummern nach den Regeln des Landes, in der Schweiz der gesetzliche Satz von 5 %.",
      "<b>Weltweit</b>, ohne Länderliste: LEI-Suche und Bank hinter einem BIC (GLEIF), Peppol-Suche nach Firmenname, Wechselkurse der EZB.",
    ],
  };
  const lang = (l, title) => `<div lang="${l}">
<section class="pagehead"><div class="wrap"><h1>${title}</h1></div></section>
<section class="section"><div class="wrap"><div class="narrow">
<p>${intro[l]}</p>
<ul class="how">${how[l].map((x) => `<li>${x}</li>`).join("")}</ul>
</div></div></section>
</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0E2A47">
<link rel="canonical" href="https://mdb-group.info/apps/b2b-check/countries/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="MDB Group">
<meta property="og:title" content="Countries – MDB B2B Check – MDB Group">
<meta property="og:description" content="Which check MDB B2B Check offers in which country, and which official system the answer comes from.">
<meta property="og:url" content="https://mdb-group.info/apps/b2b-check/countries/">
<meta property="og:image" content="https://mdb-group.info/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Countries – MDB B2B Check – MDB Group</title>
<meta name="description" content="Which check MDB B2B Check offers in which country, and which official system the answer comes from.">
<link rel="stylesheet" href="/assets/site.css">
<script src="/assets/lang.js"></script>
<script src="/assets/countries.js" defer></script>
</head>
<body class="home app">
<a class="skip" href="#main"><span lang="en">Skip to content</span><span lang="de">Zum Inhalt</span></a>
%HEADER%
<main id="main">${lang("en", "Countries")}
${lang("de", "Länder")}
<section class="section tint"><div class="wrap">
<!-- gen:countries (tools/sync-laender.mjs from laender.json of MDB-apps) -->
<p class="csearch"><label><span lang="en">Find a country</span><span lang="de">Land suchen</span> <input type="search" id="csearch" autocomplete="off" spellcheck="false"></label> <span id="ccount" aria-live="polite"></span></p>
<div class="ctab"><table>
<thead><tr><th scope="col">${both({ en: "Country", de: "Land" })}</th>${keys.map((k) => `<th scope="col">${both(CHECK_TEXT[k])} <small>${count(k)}</small></th>`).join("")}</tr></thead>
<tbody>
${rows.join("\n")}
</tbody></table></div>
<h2>${both({ en: "Systems", de: "Systeme" })}</h2>
<p>${both({ en: "Each answer names its source and links to the page where you can repeat the check by hand:", de: "Jede Antwort nennt ihre Quelle und verlinkt die Seite, auf der Sie die Prüfung von Hand wiederholen können:" })}</p>
<ul class="legend">${legend.join("")}</ul>
<!-- /gen:countries -->
</div></section>
</main>
%FOOTER%
</body>
</html>
`;
}

/** The page, with header and footer taken from the page «Connect», so the menus stay the same everywhere. */
export function build(data) {
  const connect = readFileSync(join(ROOT, "apps", "b2b-check", "connect", "index.html"), "utf8").replace(/\r\n/g, "\n");
  const header = connect.slice(connect.indexOf("<header>"), connect.indexOf("<main id=\"main\">")).trimEnd();
  const footer = connect.slice(connect.indexOf("<footer>"), connect.indexOf("</footer>") + "</footer>".length);
  if (!header.startsWith("<header>") || !footer) throw new Error("header or footer not found in the page «Connect»");
  // Breadcrumb ends with this page; the menu of the app marks it.
  const crumbHere = '<li><span aria-current="page"><span lang="en">Countries</span><span lang="de">Länder</span></span></li>';
  const h = header
    .replace(/<li><span aria-current="page">[\s\S]*?<\/span><\/span><\/li>/, crumbHere)
    .replace(/ aria-current="page">(?=<span lang="en">Connect)/, ">")
    .replace('<a href="/apps/b2b-check/countries/">', '<a href="/apps/b2b-check/countries/" aria-current="page">');
  return page(data).replace("%HEADER%", h).replace("%FOOTER%", footer);
}

const self = fileURLToPath(import.meta.url);
if (process.argv[1] && self.toLowerCase() === resolve(process.argv[1]).toLowerCase()) {
  const file = process.argv[2];
  if (!file || file.startsWith("--")) {
    console.log("usage: node tools/sync-laender.mjs <MDB-apps>/docs/apps/b2b-check/laender.json [--check]");
    process.exit(2);
  }
  const want = build(JSON.parse(readFileSync(file, "utf8")));
  let have = "";
  try { have = readFileSync(PAGE, "utf8").replace(/\r\n/g, "\n"); } catch {}
  if (process.argv.includes("--check")) {
    if (want !== have) { console.log("apps/b2b-check/countries/index.html is not what laender.json gives; run without --check"); process.exit(1); }
    console.log("countries page is up to date");
  } else {
    mkdirSync(dirname(PAGE), { recursive: true });
    writeFileSync(PAGE, want);
    console.log(`wrote apps/b2b-check/countries/index.html: ${(want.match(/<tr><th scope="row">/g) || []).length} countries`);
  }
}
