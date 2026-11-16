// The box «Available on» / «Verfügbar auf» on the product page of MDB B2B Check (W5), from the platform list of MDB-apps.
//
//   node tools/sync-plattformen.mjs <path to MDB-apps>/docs/verteilung/plattformen.json
//   node tools/sync-plattformen.mjs <…>/plattformen.json --check     exit 1 if the page is not what the file gives
//
// The platform list is maintained only in MDB-apps (docs/verteilung/plattformen.md, E-191); that repo is private and
// its file holds internal notes (accounts, partner talks). So this public repo keeps no copy of it: the script takes
// only the platforms where B2B Check is «gelistet», only their name and one link (the entry of the app, else the
// platform), adds one sentence about the platform from NAMES below, and writes a box between the markers in
// apps/b2b-check/index.html, in English and German. The box ends with a link to the page «Connect». Without a
// listed platform the block stays empty and nothing shows. tools/check.mjs checks the block (form, links, both
// languages alike). Keeping it in step with MDB-apps is a maintenance step: run this after a platform changes to or
// from «gelistet» (README, «Checks»; plattformen.md, «Pflege»).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const PAGE = join(ROOT, "apps", "b2b-check", "index.html");
export const APP = "b2b-check";

/**
 * The name of each platform per language and one sentence for customers (`about`), by its id in plattformen.json.
 * A listed platform that is missing here or has no `about` stops the script.
 */
export const NAMES = {
  // The entry in the registry is only its JSON interface; for people the start page of the registry is linked.
  "offizielle-mcp-registry": {
    en: "Official MCP Registry",
    de: "Offizielle MCP Registry",
    link: "platform",
    about: {
      en: "The official directory of MCP servers. Many AI programs and other directories read from it.",
      de: "Das offizielle Verzeichnis der MCP-Server. Viele KI-Programme und andere Verzeichnisse lesen daraus.",
    },
  },
  glama: {
    en: "Glama",
    de: "Glama",
    about: {
      en: "A directory of MCP servers that shows the tools and the availability of each entry.",
      de: "Ein Verzeichnis von MCP-Servern, das die Werkzeuge und die Erreichbarkeit jedes Eintrags zeigt.",
    },
  },
  "mcp-so": { en: "mcp.so", de: "mcp.so" },
  "hugging-face": { en: "Hugging Face", de: "Hugging Face" },
  "cursor-marketplace": { en: "Cursor Marketplace", de: "Cursor Marketplace" },
  "claude-verzeichnis": { en: "Claude directory", de: "Claude-Verzeichnis" },
  chatgpt: { en: "ChatGPT", de: "ChatGPT" },
  "google-connected-apps": { en: "Google Connected Apps", de: "Google Connected Apps" },
  "meta-ai-connectors": { en: "Meta AI Connectors", de: "Meta AI Connectors" },
  langdock: { en: "Langdock", de: "Langdock" },
  perplexity: { en: "Perplexity", de: "Perplexity" },
};
/** The heading of the box and the link to the page «Connect», per language. */
export const TEXT = { en: "Available on", de: "Verfügbar auf" };
export const CONNECT = {
  href: "/apps/b2b-check/connect/",
  en: "Not on your platform yet? Connect it yourself in Claude, ChatGPT and other assistants",
  de: "Ihre Plattform fehlt noch? In Claude, ChatGPT und anderen Assistenten selbst verbinden",
};
export const marker = (lang) => [`<!-- gen:available-on ${lang} (tools/sync-plattformen.mjs) -->`, `<!-- /gen:available-on ${lang} -->`];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The listed platforms of the app: [{ id, url }] in the order of the list. Only https links. */
export function listed(data) {
  const out = [];
  for (const p of data.platforms ?? []) {
    const s = p.apps?.[APP];
    if (s?.status !== "gelistet") continue;
    const url = (NAMES[p.id]?.link === "platform" ? null : s.links?.[0]?.url) ?? p.links?.[0]?.url;
    if (!url || !/^https:\/\/[^\s"<>]+$/.test(url)) throw new Error(`platform ${p.id}: no https link for the entry`);
    if (!NAMES[p.id]) throw new Error(`platform ${p.id} is listed but has no name in NAMES (tools/sync-plattformen.mjs)`);
    if (!NAMES[p.id].about?.en || !NAMES[p.id].about?.de) throw new Error(`platform ${p.id} is listed but has no sentence «about» in NAMES (tools/sync-plattformen.mjs)`);
    out.push({ id: p.id, url });
  }
  return out;
}

/** The HTML between the markers for one language: one box (heading, one entry per platform, link to «Connect»), or nothing. */
export function block(items, lang) {
  if (!items.length) return "";
  const rows = items.map((i) => `<li><a href="${esc(i.url)}">${esc(NAMES[i.id][lang])}</a><span>${esc(NAMES[i.id].about[lang])}</span></li>`);
  return [`<div class="listed"><h2>${TEXT[lang]}</h2>`, "<ul>", ...rows, "</ul>", `<p class="more"><a href="${CONNECT.href}">${esc(CONNECT[lang])}</a></p></div>`].join("\n");
}

/** The page with both blocks replaced. Each marker pair must be there exactly once. */
export function apply(html, items) {
  let out = html;
  for (const lang of ["en", "de"]) {
    const [open, close] = marker(lang);
    const a = out.indexOf(open);
    const b = out.indexOf(close);
    if (a < 0 || b < a || out.indexOf(open, a + 1) >= 0) throw new Error(`markers for ${lang} missing or twice in the page`);
    const inner = block(items, lang);
    out = out.slice(0, a + open.length) + (inner ? "\n" + inner + "\n" : "\n") + out.slice(b);
  }
  return out;
}

const self = fileURLToPath(import.meta.url);
if (process.argv[1] && self.toLowerCase() === (await import("node:path")).resolve(process.argv[1]).toLowerCase()) {
  const file = process.argv[2];
  if (!file || file.startsWith("--")) {
    console.log("usage: node tools/sync-plattformen.mjs <MDB-apps>/docs/verteilung/plattformen.json [--check]");
    process.exit(2);
  }
  const items = listed(JSON.parse(readFileSync(file, "utf8")));
  const raw = readFileSync(PAGE, "utf8");
  const nl = raw.includes("\r\n") ? "\r\n" : "\n";
  const html = raw.replace(/\r\n/g, "\n");
  const want = apply(html, items);
  if (process.argv.includes("--check")) {
    if (want !== html) {
      console.log("apps/b2b-check/index.html: «Available on» is not what the platform list gives; run without --check");
      process.exit(1);
    }
    console.log(`«Available on» is up to date (${items.map((i) => i.id).join(", ") || "no listed platform"})`);
  } else {
    writeFileSync(PAGE, want.replace(/\n/g, nl));
    console.log(`wrote «Available on» into apps/b2b-check/index.html: ${items.map((i) => i.id).join(", ") || "no listed platform"}`);
  }
}
