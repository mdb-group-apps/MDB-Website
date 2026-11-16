// The shared design of MDB Group (KONZEPT-DOKU in MDB-apps, D-C, #161): MDB-apps holds the source, design/mdb.css with
// the fonts in design/fonts/. This repo keeps an exact copy in assets/mdb.css and fonts/, because MDB-apps is private
// and GitHub Pages serves only this repo. The app pages load assets/mdb.css, then assets/site.css (their own rules).
//
//   node tools/sync-design.mjs <path to MDB-apps>/design           copies mdb.css and the fonts
//   node tools/sync-design.mjs <path to MDB-apps>/design --check   exit 1 if a file differs (QA, before a release)
//
// Compared byte for byte, with line endings normalised for the text files .css and .txt (a Windows checkout may have CRLF). Change the design
// in MDB-apps, never here; then run this and open a pull request here (README, «Checks»).
import { readFileSync, writeFileSync, readdirSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Pairs [source in MDB-apps/design, copy in this repo]. */
export function pairs(designDir) {
  const out = [[join(designDir, "mdb.css"), join(ROOT, "assets", "mdb.css")]];
  for (const f of readdirSync(join(designDir, "fonts"))) out.push([join(designDir, "fonts", f), join(ROOT, "fonts", f)]);
  return out;
}

/** Text files (.css, .txt) are compared and written with LF line endings: a Windows checkout may have CRLF. Fonts byte for byte. */
export const isText = (p) => /\.(css|txt)$/.test(p);
const norm = (p, buf) => (isText(p) ? Buffer.from(buf.toString("utf8").replace(/\r\n/g, "\n")) : buf);

const self = fileURLToPath(import.meta.url);
if (process.argv[1] && self.toLowerCase() === (await import("node:path")).resolve(process.argv[1]).toLowerCase()) {
  const dir = process.argv[2];
  if (!dir || dir.startsWith("--") || !existsSync(join(dir, "mdb.css"))) {
    console.log("usage: node tools/sync-design.mjs <MDB-apps>/design [--check]");
    process.exit(2);
  }
  const check = process.argv.includes("--check");
  let differ = 0;
  for (const [src, dst] of pairs(dir)) {
    const a = norm(src, readFileSync(src));
    const same = existsSync(dst) && norm(dst, readFileSync(dst)).equals(a);
    if (same) continue;
    differ++;
    if (check) console.log(`differs: ${dst.slice(ROOT.length + 1)}`);
    else if (isText(src)) writeFileSync(dst, a);
    else copyFileSync(src, dst);
  }
  if (check) {
    console.log(differ ? `design: ${differ} file(s) differ from MDB-apps; run without --check` : "design: assets/mdb.css and fonts/ are the same as in MDB-apps");
    process.exitCode = differ ? 1 : 0;
  } else console.log(`design: ${differ} file(s) copied from MDB-apps`);
}
