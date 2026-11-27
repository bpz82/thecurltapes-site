#!/usr/bin/env node
// Check t495u-ct-seo-ai (Blake ask t495u). Node only, no browser, no deps.
// Protects: under-the-hood SEO / AI-search fixes on thecurltapes.com with ZERO visitor-visible change vs base d643117:
//   Blake Zuniga is a FORMER member of The Curl Tapes (confirmed by Blake); Coleman Martin is a current member.
// A: no LocalBusiness JSON-LD; every WebSite node url is the apex https://thecurltapes.com/ (leftover WebSite block has
//    https @context and a non-empty description).
// B: on all 26 graph pages: Blake is a former member (OrganizationRole roleName "former member" and/or alumni/alumniOf),
//    never an unqualified band.member / Person.memberOf the band; Coleman is still a direct band.member; Person #blake
//    description/jobTitle never call him a current member and say "former member"; six target phrases kept; @ids
//    #blake #band #zuniga #coleman kept; no www.thecurltapes.com in JSON-LD / og:image / twitter:image / sameAs; path URLs
//    in JSON-LD end with "/"; other JSON-LD blocks (e.g. Product) unchanged apart from www->apex; ProfilePage on Blake's page.
// C: /aboutpage/blakezuniga/ description + og:description say "former member of The Curl Tapes" and never "member of"
//    unqualified; Coleman pages carry no Blake keywords in meta.
// D: /llms.txt exists, plain text (no HTML), says former member, names thecurltapes.com, blakezuniga.com, Coleman Martin;
//    no secret-looking strings.
// E: sitemap.xml + robots.txt byte-identical to base (apex sitemap, Sitemap line kept); no new request-causing refs; every
//    page <body> byte-identical to base; <head> identical apart from JSON-LD, og:image/twitter:image www->apex and (Blake's
//    about page only) description/og:description; no CSS/JS changed or added; per-page gzip delta vs base < 256 B (reported).
// Usage: node checks/t495u-ct-seo-ai.mjs [--log file.log] [repoRoot]   (default root: parent of this file)
// Exit 0 = PASS, 1 = FAIL, 2 = ENV (git or base commit missing).
// Fail-before / pass-after logs: see checks/REGISTRY.md.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "d6431171f177eb1da13526f44e2b3375bdd2224c";
const argv = process.argv.slice(2);
const li = argv.indexOf("--log");
const LOG = li >= 0 ? argv.splice(li, 2)[1] : null; // also writes <log minus .log>.rc with the exit code
const ROOT = argv[0] || join(dirname(fileURLToPath(import.meta.url)), "..");
const APEX = "https://thecurltapes.com";
const BLAKE_ID = "https://blakezuniga.com/#blake";
const BAND_ID = "https://thecurltapes.com/#band";
const ZUNIGA_ID = "https://blakezuniga.com/#zuniga";
const COLEMAN_ID = "https://thecurltapes.com/#coleman";
const PHRASES = ["Blake Zuniga", "Blake Z Music", "Zuniga", "Zuniga Music", "Blake Zuniga guitar", "folk blues"];
const PAGES = [
  "404.html", "aboutpage/blakezuniga/index.html", "aboutpage/colemanmartin/index.html", "aboutpage/index.html",
  "aboutpage/mics-and-tape-machines/index.html", "blake-bio/index.html", "blake-gg/index.html",
  "blake-gg/project-two-ky966-n329z-nnx53-feazs-s32gp-b59d5-ldeaf/index.html", "cart/index.html", "cole-bio/index.html",
  "cole-contact-1/index.html", "cole-contact/index.html", "contact-6/index.html", "index.html", "joon/index.html",
  "joon/project-four-l3zw3-dk9py-xcmem-llk7k-y7dbp-gy66a-namzd/index.html",
  "joon/project-one-f5w4d-z9nem-s3jda-eyssk-73f62-tmxz9-b5w3t/index.html",
  "joon/project-two-ky966-n329z-nnx53-feazs-s32gp-b59d5-a4pr7/index.html", "portfolio/index.html",
  "portfolio/new-portfolio-item/index.html", "store/index.html",
  "store/p/the-curl-tapes-and-friends-sparrow-nest-theater/index.html", "thecurltapes/hayloft/index.html",
  "thecurltapes/index.html", "thecurltapes/project-one-h346n-gjtmc/index.html", "welcome/index.html",
];
const BLAKE_ABOUT = "aboutpage/blakezuniga/index.html";
const COLEMAN_PAGES = ["aboutpage/colemanmartin/index.html", "cole-bio/index.html", "cole-contact/index.html", "cole-contact-1/index.html"];
const LD_LINE = /^<script type="application\/ld\+json">[\s\S]*<\/script>$/;
const IMG_META = /^<meta (property="og:image"|name="twitter:image") content="[^"]*">$/;
const DESC_META = /^<meta name="description"[^>]*>$|^<meta property="og:description"[^>]*>$/;
const GZ_BUDGET = 256;

const fails = [];
const rows = [];
const fail = (id, msg) => fails.push(`[${id}] ${msg}`);

let git;
try {
  git = (args) => execFileSync("git", ["-C", ROOT, ...args], { maxBuffer: 64 << 20 });
  git(["cat-file", "-e", `${BASE}^{commit}`]);
} catch (e) {
  console.log(`ENV: cannot read base commit ${BASE} in ${ROOT}: ${e.message}`);
  process.exit(2);
}
const baseFile = (p) => { try { return git(["show", `${BASE}:${p}`]); } catch { return null; } };
const read = (p) => { const f = join(ROOT, p); return existsSync(f) ? readFileSync(f) : null; };
const gz = (b) => gzipSync(b, { level: 9 }).length;
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`, "i")); return m ? m[1] : null; };
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const ldBlocks = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
function nodesOf(json) {
  const out = [];
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") { out.push(v); Object.values(v).forEach(walk); }
  };
  walk(json);
  return out;
}
function stringsOf(json, acc = []) {
  if (typeof json === "string") acc.push(json);
  else if (Array.isArray(json)) json.forEach((v) => stringsOf(v, acc));
  else if (json && typeof json === "object") Object.values(json).forEach((v) => stringsOf(v, acc));
  return acc;
}
const types = (n) => [].concat(n["@type"] || []);
const arr = (v) => [].concat(v ?? []);
const directIds = (v) => arr(v).filter((x) => x && typeof x === "object" && !types(x).some((t) => /Role$/.test(t))).map((x) => x["@id"])
  .concat(arr(v).filter((x) => typeof x === "string"));
const roles = (v) => arr(v).filter((x) => x && typeof x === "object" && types(x).some((t) => /Role$/.test(t)));
const isFormer = (r) => /^former member$/i.test(String(r.roleName || ""));
const roleRefs = (r, prop) => directIds(r[prop]);
const isLocalBusiness = (j) => types(j).includes("LocalBusiness");
const isLeftoverWebSite = (j) => types(j).includes("WebSite") && !j["@graph"];
// Normalise a thecurltapes.com URL the way t495u is allowed to: www -> apex, path URLs get a trailing slash.
function normUrl(s) {
  if (typeof s !== "string" || !/^https?:\/\/(www\.)?thecurltapes\.com/.test(s)) return s;
  let u = s.replace(/^https?:\/\/(www\.)?thecurltapes\.com/, APEX);
  if (u === APEX) return `${APEX}/`;
  const path = u.slice(APEX.length).split(/[?#]/)[0];
  if (!/\/$/.test(path) && !/\.[a-z0-9]{2,5}$/i.test(path) && !/[?#]/.test(u)) u += "/";
  return u;
}
function normJson(v) {
  if (typeof v === "string") return normUrl(v);
  if (Array.isArray(v)) return v.map(normJson);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, normJson(x)]));
  return v;
}
// "says he is a current member": any mention of The Curl Tapes not introduced by "former member of".
function claimsCurrentMember(text) {
  const t = String(text || "");
  if (/(?<!former )\bmembers? of the curl tapes/i.test(t)) return true;
  if (/\bin the curl tapes/i.test(t)) return true;
  for (const m of t.matchAll(/the curl tapes/gi)) if (!/former member of $/i.test(t.slice(0, m.index))) return true;
  return false;
}
function requestRefs(html) {
  const set = new Set();
  for (const m of html.matchAll(/<(script|img|source|iframe|video|audio|embed|track|input)\b[^>]*>/gi)) {
    for (const a of ["src", "data-src", "srcset", "poster"]) { const v = attr(m[0], a); if (v) set.add(`${m[1].toLowerCase()} ${a}=${v}`); }
  }
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = (attr(m[0], "rel") || "").toLowerCase();
    if (/^(canonical|alternate|shortlink)$/.test(rel)) continue;
    const v = attr(m[0], "href"); if (v) set.add(`link ${rel} href=${v}`);
  }
  for (const m of html.matchAll(/url\(\s*['"]?([^'")]+)/gi)) set.add(`css url=${m[1]}`);
  for (const m of html.matchAll(/@import\s+['"]([^'"]+)/gi)) set.add(`css import=${m[1]}`);
  return set;
}
function splitHead(html) {
  const i = html.indexOf("</head>");
  return i < 0 ? [html, ""] : [html.slice(0, i), html.slice(i)];
}
function walkHtml(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules") continue;
    const f = join(dir, name);
    if (statSync(f).isDirectory()) walkHtml(f, acc);
    else if (name.endsWith(".html")) acc.push(relative(ROOT, f).split("\\").join("/"));
  }
  return acc;
}
const extra = walkHtml(ROOT).filter((p) => !PAGES.includes(p));
if (extra.length) fail("E", `HTML pages not in the checked list: ${extra.join(", ")}`);

// ---------------- per page ----------------
for (const p of PAGES) {
  const cur = read(p), base = baseFile(p);
  if (!cur) { fail("B", `${p}: missing`); continue; }
  if (!base) { fail("E", `${p}: not in base commit`); continue; }
  const html = cur.toString("utf8"), bhtml = base.toString("utf8");
  const [h1, b1] = splitHead(html), [h0, b0] = splitHead(bhtml);

  const blocks = [];
  for (const b of ldBlocks(html)) {
    try { blocks.push(JSON.parse(b)); } catch (e) { fail("A", `${p}: unparseable JSON-LD (${e.message})`); }
  }
  const nodes = blocks.flatMap((j) => nodesOf(j));

  // A. LocalBusiness gone, WebSite apex
  if (nodes.some((n) => types(n).includes("LocalBusiness"))) fail("A", `${p}: LocalBusiness JSON-LD still present`);
  for (const n of nodes.filter((n) => types(n).includes("WebSite"))) {
    if (n.url !== `${APEX}/`) fail("A", `${p}: WebSite url is ${n.url}, want ${APEX}/`);
  }
  for (const j of blocks.filter(isLeftoverWebSite)) {
    if (j["@context"] !== "https://schema.org") fail("A", `${p}: leftover WebSite @context is ${j["@context"]}`);
    if (!String(j.description || "").trim()) fail("A", `${p}: leftover WebSite description empty`);
    if (j.publisher && !directIds(j.publisher).includes(BAND_ID)) fail("A", `${p}: WebSite publisher is not ${BAND_ID}`);
  }

  // B. Former-member relation
  const band = nodes.find((n) => n["@id"] === BAND_ID && types(n).includes("MusicGroup"));
  const person = nodes.find((n) => n["@id"] === BLAKE_ID && types(n).includes("Person"));
  for (const id of [BLAKE_ID, BAND_ID, ZUNIGA_ID, COLEMAN_ID]) if (!nodes.some((n) => n["@id"] === id && n["@type"])) fail("B", `${p}: no typed node @id ${id}`);
  if (!band) fail("B", `${p}: no MusicGroup ${BAND_ID}`);
  else {
    if (directIds(band.member).includes(BLAKE_ID)) fail("B", `${p}: Blake is an unqualified current band.member`);
    for (const r of roles(band.member)) if (roleRefs(r, "member").includes(BLAKE_ID) && !isFormer(r)) fail("B", `${p}: band.member Role for Blake lacks roleName "former member"`);
    const formerViaMember = roles(band.member).some((r) => isFormer(r) && roleRefs(r, "member").includes(BLAKE_ID));
    const formerViaAlumni = directIds(band.alumni).includes(BLAKE_ID) || roles(band.alumni).some((r) => roleRefs(r, "alumni").includes(BLAKE_ID) && (!r.roleName || isFormer(r)));
    if (!formerViaMember && !formerViaAlumni) fail("B", `${p}: band does not express Blake as a former member`);
    if (!directIds(band.member).includes(COLEMAN_ID)) fail("B", `${p}: Coleman is not a current band.member`);
    const coleman = nodes.find((n) => n["@id"] === COLEMAN_ID && n.name === "Coleman Martin");
    if (!coleman) fail("B", `${p}: no Coleman Martin Person`);
    else if (!directIds(coleman.memberOf).includes(BAND_ID)) fail("B", `${p}: Coleman.memberOf lacks the band`);
  }
  if (!person) fail("B", `${p}: no Person ${BLAKE_ID}`);
  else {
    if (directIds(person.memberOf).includes(BAND_ID)) fail("B", `${p}: Person #blake is an unqualified current memberOf the band`);
    for (const r of roles(person.memberOf)) if (roleRefs(r, "memberOf").includes(BAND_ID) && !isFormer(r)) fail("B", `${p}: Person.memberOf Role for the band lacks roleName "former member"`);
    const fViaMember = roles(person.memberOf).some((r) => isFormer(r) && roleRefs(r, "memberOf").includes(BAND_ID));
    const fViaAlumni = directIds(person.alumniOf).includes(BAND_ID) || roles(person.alumniOf).some((r) => roleRefs(r, "alumniOf").includes(BAND_ID) && (!r.roleName || isFormer(r)));
    if (!fViaMember && !fViaAlumni) fail("B", `${p}: Person #blake does not express former membership of the band`);
    if (!directIds(person.memberOf).includes(ZUNIGA_ID)) fail("B", `${p}: Person #blake lost memberOf ${ZUNIGA_ID}`);
    for (const k of ["description", "jobTitle"]) if (claimsCurrentMember(person[k])) fail("B", `${p}: Person.${k} implies current membership: "${person[k]}"`);
    if (!/former member of the curl tapes/i.test(`${person.description || ""} ${person.jobTitle || ""}`)) fail("B", `${p}: Person description/jobTitle does not say former member`);
    if (!/folk blues guitarist and songwriter/i.test(`${person.description || ""} ${person.jobTitle || ""}`)) fail("B", `${p}: Person no longer says folk blues guitarist and songwriter`);
    const text = norm(JSON.stringify(person));
    for (const ph of PHRASES) if (!text.includes(norm(ph))) fail("B", `${p}: target phrase "${ph}" not in Person node`);
  }
  // No www leftovers; path URLs normalised.
  for (const s of stringsOf(blocks)) {
    if (/www\.thecurltapes\.com/i.test(s)) fail("B", `${p}: www URL in JSON-LD: ${s.slice(0, 100)}`);
    else if (/^https?:\/\/thecurltapes\.com/.test(s) && normUrl(s) !== s) fail("B", `${p}: JSON-LD URL not normalised: ${s}`);
  }
  for (const m of h1.matchAll(/<meta (property="og:image"|name="twitter:image") content="([^"]*)">/g))
    if (/www\.thecurltapes\.com/i.test(m[2])) fail("B", `${p}: www URL in ${m[1]}`);
  for (const n of nodes) for (const s of arr(n.sameAs)) if (/www\.thecurltapes\.com|instagram\.com/i.test(String(s))) fail("B", `${p}: bad sameAs ${s}`);
  if (p === BLAKE_ABOUT) {
    const pp = nodes.find((n) => types(n).includes("ProfilePage"));
    if (!pp || !directIds(pp.mainEntity).includes(BLAKE_ID)) fail("B", `${p}: ProfilePage with mainEntity ${BLAKE_ID} missing`);
  }
  // Other JSON-LD blocks (e.g. Product) must equal base apart from URL normalisation; no new blocks.
  const baseBlocks = ldBlocks(bhtml).map((b) => JSON.parse(b));
  const keepBase = baseBlocks.filter((j) => !isLocalBusiness(j) && !isLeftoverWebSite(j) && !j["@graph"]).map((j) => JSON.stringify(normJson(j)));
  const keepCur = blocks.filter((j) => !isLocalBusiness(j) && !isLeftoverWebSite(j) && !j["@graph"]).map((j) => JSON.stringify(j));
  if (keepBase.join("\n") !== keepCur.join("\n")) fail("B", `${p}: other JSON-LD blocks changed beyond www->apex`);
  if (blocks.filter(isLeftoverWebSite).length > baseBlocks.filter(isLeftoverWebSite).length) fail("B", `${p}: new WebSite block added`);
  if (blocks.filter((j) => j["@graph"]).length !== 1) fail("B", `${p}: expected exactly one @graph block`);

  // C. Meta
  if (p === BLAKE_ABOUT) {
    for (const re of [/<meta name="description" content="([^"]*)">/, /<meta property="og:description" content="([^"]*)">/]) {
      const m = h1.match(re);
      if (!m) { fail("C", `${p}: missing ${re.source.slice(6, 30)}`); continue; }
      if (!/former member of The Curl Tapes/i.test(m[1])) fail("C", `${p}: meta does not say former member: "${m[1]}"`);
      if (claimsCurrentMember(m[1])) fail("C", `${p}: meta implies current member: "${m[1]}"`);
      if (!/folk blues guitarist and songwriter/i.test(m[1])) fail("C", `${p}: meta lost "folk blues guitarist and songwriter"`);
    }
  }
  if (COLEMAN_PAGES.includes(p)) {
    for (const m of h1.matchAll(/<meta\b[^>]*>/gi)) if (/zuniga|folk blues|blake z/i.test(m[0])) fail("C", `${p}: Blake keywords in Coleman page meta: ${m[0]}`);
  }

  // E. Visible markup + head identity
  if (b1 !== b0) fail("E", `${p}: <body> differs from base`);
  const headLines = (h, isBase) => h.split("\n").filter((l) => !LD_LINE.test(l) && !(p === BLAKE_ABOUT && DESC_META.test(l)))
    .map((l) => (IMG_META.test(l) ? l.replace(/content="([^"]*)"/, (_, u) => `content="${isBase ? normUrl(u) : u}"`) : l));
  if (headLines(h1, false).join("\n") !== headLines(h0, true).join("\n")) fail("E", `${p}: <head> differs from base beyond JSON-LD / image-URL / allowed description lines`);
  if ((h1.match(/<title>[\s\S]*?<\/title>/) || [""])[0] !== (h0.match(/<title>[\s\S]*?<\/title>/) || [""])[0]) fail("E", `${p}: <title> changed`);
  const added = [...requestRefs(html)].filter((r) => !requestRefs(bhtml).has(r));
  if (added.length) fail("E", `${p}: new request-causing refs: ${added.join(" ; ")}`);
  const dGz = gz(cur) - gz(base);
  rows.push([p, base.length, cur.length, cur.length - base.length, gz(base), gz(cur), dGz]);
  if (dGz >= GZ_BUDGET) fail("E", `${p}: gzip delta ${dGz} >= ${GZ_BUDGET}`);
}

// ---------------- D. llms.txt ----------------
{
  const f = read("llms.txt");
  if (!f) fail("D", "llms.txt missing at site root");
  else {
    const t = f.toString("utf8");
    if (t.trim().length < 200) fail("D", "llms.txt is nearly empty");
    if (/<\s*(!doctype|html|head|body|div|span|script|style|a\s)/i.test(t)) fail("D", "llms.txt contains HTML");
    if (!/former member/i.test(t)) fail("D", "llms.txt does not say former member");
    // Every sentence/line that mentions Blake together with band membership must say "former".
    for (const s of t.split(/(?<=[.;])\s+|\n/)) if (/blake/i.test(s) && /\bmember/i.test(s) && /the curl tapes/i.test(s) && !/former member/i.test(s))
      fail("D", `llms.txt line implies Blake is a current member: "${s.trim()}"`);
    for (const s of ["thecurltapes.com", "blakezuniga.com", "Coleman Martin", "Blake Zuniga"]) if (!t.includes(s)) fail("D", `llms.txt does not name ${s}`);
    if (/www\.thecurltapes\.com/i.test(t)) fail("D", "llms.txt uses www.thecurltapes.com");
    if (/(api[_-]?key|secret|password|token)\s*[:=]|sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}/i.test(t)) fail("D", "llms.txt contains a secret-looking string");
    rows.push(["llms.txt (new)", 0, f.length, f.length, 0, gz(f), gz(f)]);
  }
  const hdr = read("_headers"), bh = baseFile("_headers");
  if (!hdr || !bh || !hdr.equals(bh)) fail("E", "_headers changed");
}

// ---------------- E. sitemap / robots / CSS / JS / hosting files ----------------
for (const f of ["sitemap.xml", "robots.txt", "CNAME", "_redirects"]) {
  const c = read(f), b = baseFile(f);
  if (!c || !b || !c.equals(b)) fail("E", `${f} differs from base (or missing)`);
}
{
  const sm = (read("sitemap.xml") || "").toString("utf8");
  const locs = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  if (!locs.length || locs.some((u) => !u.startsWith(`${APEX}/`))) fail("E", "sitemap not all apex");
  if (!/^Sitemap:\s*https:\/\/thecurltapes\.com\/sitemap\.xml\s*$/m.test((read("robots.txt") || "").toString("utf8"))) fail("E", "robots.txt lacks apex Sitemap line");
  const changed = git(["diff", "--name-only", BASE, "--", "*.css", "*.js"]).toString().trim();
  const untracked = git(["ls-files", "--others", "--exclude-standard", "--", "*.css", "*.js", "*.mjs"]).toString().trim().split("\n").filter((f) => f && !f.startsWith("checks/"));
  if (changed || untracked.length) fail("E", `CSS/JS changed or added vs base: ${changed} ${untracked.join(" ")}`.trim());
}

// ---------------- report ----------------
const out = [];
out.push(`t495u-ct-seo-ai  base ${BASE}  root ${ROOT}  head ${git(["rev-parse", "HEAD"]).toString().trim()}  at ${new Date().toISOString()}`);
out.push(`worktree status (git status --short, .pre-t495u backups omitted):\n${git(["status", "--short"]).toString().split("\n").filter((l) => l && !/\.pre-t495u$/.test(l)).join("\n") || "(clean)"}`);
out.push("file | raw before | raw after | raw delta | gzip9 before | gzip9 after | gzip9 delta");
for (const r of rows) out.push(r.join(" | "));
const rc = fails.length ? 1 : 0;
if (fails.length) { out.push(`\nFAIL (${fails.length}):`); for (const f of fails) out.push("  " + f); }
else out.push("\nPASS: A B C D E");
out.push(`exit=${rc}`);
const text = out.join("\n") + "\n";
process.stdout.write(text);
if (LOG) { writeFileSync(LOG, text); writeFileSync(LOG.replace(/\.log$/, "") + ".rc", `${rc}\n`); }
process.exit(rc);
