#!/usr/bin/env node
// Check t490u-ct-bz-seo (Blake ask t490u). Node only, no browser, no deps.
// Protects: under-the-hood SEO signals on thecurltapes.com that point to blakezuniga.com,
// with ZERO visible change and ZERO load-time change versus base 7876dab.
// Usage: node checks/t490u-ct-bz-seo.mjs [--log file.log] [repoRoot]   (default root: parent of this file)
// Exit 0 = PASS, 1 = FAIL, 2 = ENV (cannot run, e.g. git/base commit missing).
// Fail-before / pass-after logs: see checks/REGISTRY.md.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const BASE = "7876dab059773c0a18ad2deae7f5371d7b30443e";
const argv = process.argv.slice(2);
const li = argv.indexOf("--log");
const LOG = li >= 0 ? argv.splice(li, 2)[1] : null; // also writes <log minus .log>.rc with the exit code
const ROOT = argv[0] || join(dirname(fileURLToPath(import.meta.url)), "..");
const APEX = "https://thecurltapes.com";
const BLAKE_ID = "https://blakezuniga.com/#blake";
const BAND_ID = "https://thecurltapes.com/#band";
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
// Head lines this job may change (www->apex URL fixes; description only on Blake's about page).
const URL_META = /^<link rel="canonical"[^>]*>$|^<meta property="og:url"[^>]*>$|^<meta name="twitter:url"[^>]*>$/;
const DESC_META = /^<meta name="description"[^>]*>$|^<meta property="og:description"[^>]*>$/;
const NEW_LD = /<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org","@graph":.*?<\/script>\n?/s;
const NAV_RE = /<nav id="ct-member-links"[^>]*>[\s\S]*?<\/nav>\n?/;
const EXPECTED_LINKS = [
  { label: "Blake's Website", href: "https://blakezuniga.com" },
  { label: "Coleman's Website", href: "https://www.facebook.com/colemanmartinmusic/" },
];

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
const sha = (b) => createHash("sha256").update(b).digest("hex");
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
const types = (n) => [].concat(n["@type"] || []);
const refIds = (v) => [].concat(v || []).map((x) => (x && typeof x === "object" ? x["@id"] : x));

// Page list sanity: every .html in the tree is one of the 26 (no unchecked pages).
function walkHtml(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules") continue;
    const f = join(dir, name);
    if (statSync(f).isDirectory()) walkHtml(f, acc);
    else if (name.endsWith(".html")) acc.push(relative(ROOT, f).split("\\").join("/"));
  }
  return acc;
}
const found = walkHtml(ROOT).sort();
const extra = found.filter((p) => !PAGES.includes(p));
if (extra.length) fail("D", `HTML pages not in the checked list: ${extra.join(", ")}`);

// Request-causing references: <script src>, <link href> (except canonical / non-fetch rels), <img src>, srcset, etc.
function requestRefs(html) {
  const set = new Set();
  for (const m of html.matchAll(/<(script|img|source|iframe|video|audio|embed|track|input)\b[^>]*>/gi)) {
    const t = m[0];
    for (const a of ["src", "data-src", "srcset", "poster"]) { const v = attr(t, a); if (v) set.add(`${m[1].toLowerCase()} ${a}=${v}`); }
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

let jsLinks = null;
// ---- JS fallback: run ct-member-links.js against a tiny DOM stub (no browser).
function runMemberJs(src, preExisting) {
  const appended = [];
  const mk = (tag) => {
    const el = { tagName: tag.toUpperCase(), attrs: {}, children: [], textContent: "",
      setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k] ?? null; },
      appendChild(c) { this.children.push(c); return c; } };
    for (const p of ["id", "className", "href", "target", "rel", "title"]) {
      Object.defineProperty(el, p, { get() { return this.attrs[p === "className" ? "class" : p] ?? ""; },
        set(v) { this.attrs[p === "className" ? "class" : p] = String(v); } });
    }
    return el;
  };
  const document = { readyState: "complete", body: { appendChild(c) { appended.push(c); return c; } },
    getElementById: (id) => (preExisting && id === "ct-member-links" ? {} : null),
    createElement: mk, addEventListener() {} };
  vm.runInNewContext(src, { document, window: {} });
  return appended;
}

// ---------------- C (JS part) ----------------
{
  const js = read("assets/js/ct-member-links.js");
  if (!js) fail("C", "assets/js/ct-member-links.js missing");
  else {
    try {
      const out = runMemberJs(js.toString(), false);
      const nav = out[0];
      if (!nav || nav.id !== "ct-member-links") fail("C", "JS fallback did not inject #ct-member-links");
      else {
        jsLinks = nav.children.map((a) => ({ label: a.textContent, href: a.href, target: a.target, rel: a.rel, title: a.attrs.title, aria: a.attrs["aria-label"] }));
        const b = jsLinks.find((l) => l.href.replace(/\/$/, "") === "https://blakezuniga.com");
        if (!b) fail("C", "JS fallback has no Blake link");
        else {
          if (/nofollow/i.test(b.rel)) fail("C", "JS fallback Blake link is nofollow");
          if (!/Blake Zuniga/.test(`${b.title || ""} ${b.aria || ""}`)) fail("C", "JS fallback Blake link has no title/aria-label containing 'Blake Zuniga'");
        }
        const labels = jsLinks.map((l) => `${l.label}|${l.href}`).join(",");
        if (labels !== EXPECTED_LINKS.map((l) => `${l.label}|${l.href}`).join(",")) fail("D", `JS fallback labels/hrefs changed: ${labels}`);
      }
      if (runMemberJs(js.toString(), true).length) fail("C", "JS fallback is not idempotent (injects when #ct-member-links exists)");
    } catch (e) { fail("C", `JS fallback threw in stub DOM: ${e.message}`); }
  }
  const css = read("assets/css/ct-member-links.css"), baseCss = baseFile("assets/css/ct-member-links.css");
  if (!css || !baseCss || sha(css) !== sha(baseCss)) fail("D", "assets/css/ct-member-links.css differs from base");
  // No CSS file anywhere may differ from base (no restyle, no CSS cloaking).
  const changedCss = git(["diff", "--name-only", BASE, "--", "*.css"]).toString().trim();
  const untrackedCss = git(["ls-files", "--others", "--exclude-standard", "--", "*.css"]).toString().trim();
  if (changedCss || untrackedCss) fail("D", `CSS changed vs base: ${changedCss} ${untrackedCss}`.trim());
}

// ---------------- per page ----------------
for (const p of PAGES) {
  const cur = read(p), base = baseFile(p);
  if (!cur) { fail("A", `${p}: missing`); continue; }
  if (!base) { fail("D", `${p}: not in base commit`); continue; }
  const html = cur.toString("utf8"), bhtml = base.toString("utf8");

  // A. JSON-LD
  let nodes = [], ldOk = true;
  for (const b of ldBlocks(html)) {
    try { nodes.push(...nodesOf(JSON.parse(b))); } catch (e) { ldOk = false; fail("A", `${p}: unparseable JSON-LD (${e.message})`); }
  }
  const person = nodes.find((n) => n["@id"] === BLAKE_ID && types(n).includes("Person"));
  const band = nodes.find((n) => n["@id"] === BAND_ID && types(n).includes("MusicGroup"));
  if (!person) fail("A", `${p}: no Person @id ${BLAKE_ID}`);
  else {
    if (!["https://blakezuniga.com/", "https://blakezuniga.com"].includes(person.url)) fail("A", `${p}: Blake Person url is ${person.url}`);
    const text = norm(JSON.stringify(person));
    for (const ph of PHRASES) if (!text.includes(norm(ph))) fail("A", `${p}: target phrase "${ph}" not in Blake Person node`);
  }
  if (!band) fail("A", `${p}: no MusicGroup @id ${BAND_ID}`);
  else {
    const mem = refIds(band.member);
    if (!mem.includes(BLAKE_ID)) fail("A", `${p}: band.member lacks Blake`);
    const others = mem.filter((m) => m !== BLAKE_ID);
    const coleman = nodes.find((n) => others.includes(n["@id"]) && n.name === "Coleman Martin");
    if (!coleman) fail("A", `${p}: band.member lacks a Coleman Martin Person`);
    else if (JSON.stringify(coleman).includes("blakezuniga.com")) fail("A", `${p}: Coleman node points at blakezuniga.com`);
  }
  if (nodes.filter((n) => types(n).includes("Person") && n.name === "Blake Zuniga" && n["@id"] !== BLAKE_ID).length)
    fail("A", `${p}: a second Person @id for Blake`);

  // B. ProfilePage on Blake's about page
  if (p === BLAKE_ABOUT) {
    const pp = nodes.find((n) => types(n).includes("ProfilePage"));
    if (!pp) fail("B", `${p}: no ProfilePage`);
    else {
      if (!refIds(pp.mainEntity).includes(BLAKE_ID)) fail("B", `${p}: ProfilePage.mainEntity is not ${BLAKE_ID}`);
      if (!String(pp.url || "").startsWith(`${APEX}/aboutpage/blakezuniga`)) fail("B", `${p}: ProfilePage.url not apex about URL`);
    }
  }

  // C. Blake corner link: static, followable, titled; no hidden blakezuniga.com links or keyword blocks.
  const navs = html.match(new RegExp(NAV_RE.source, "g")) || [];
  if (navs.length !== 1) fail("C", `${p}: expected 1 static #ct-member-links nav, found ${navs.length}`);
  const anchors = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)].map((m) => m[0]);
  const bzAnchors = anchors.filter((a) => /href="https?:\/\/(www\.)?blakezuniga\.com/i.test(a));
  if (bzAnchors.length !== 1) fail("C", `${p}: expected exactly 1 blakezuniga.com anchor, found ${bzAnchors.length}`);
  if (navs.length === 1) {
    const nav = navs[0];
    const navOpen = nav.match(/^<nav[^>]*>/)[0];
    if (attr(navOpen, "class") !== "ct-member-links" || attr(navOpen, "aria-label") !== "Member websites" || /style=|hidden/i.test(navOpen))
      fail("C", `${p}: static nav attributes differ from the JS module`);
    const links = [...nav.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({ tag: `<a${m[1]}>`, label: m[2] }));
    const got = links.map((l) => `${l.label}|${attr(l.tag, "href")}|${attr(l.tag, "target")}|${attr(l.tag, "rel")}`).join(",");
    const want = EXPECTED_LINKS.map((l) => `${l.label}|${l.href}|_blank|noopener noreferrer`).join(",");
    if (got !== want) fail("D", `${p}: static nav links differ from existing buttons: ${got}`);
    const b = links.find((l) => /blakezuniga\.com/.test(attr(l.tag, "href") || ""));
    if (b) {
      const t = b.tag;
      if (/nofollow|ugc|sponsored/i.test(attr(t, "rel") || "")) fail("C", `${p}: Blake link rel has nofollow/ugc/sponsored`);
      if (/\b(style|hidden|aria-hidden|tabindex|class)=?/i.test(t.replace(/\s(href|target|rel|title|aria-label)="[^"]*"/g, "")))
        fail("C", `${p}: Blake link carries style/hidden/aria-hidden/tabindex/class`);
      if (!/Blake Zuniga/.test(`${attr(t, "title") || ""} ${attr(t, "aria-label") || ""}`)) fail("C", `${p}: Blake link title/aria-label lacks "Blake Zuniga"`);
      if (jsLinks) {
        const jb = jsLinks.find((l) => l.href === attr(t, "href"));
        if (jb && (jb.title || "") !== (attr(t, "title") || "")) fail("C", `${p}: static Blake title differs from JS fallback title`);
        if (jb && (jb.aria || "") !== (attr(t, "aria-label") || "")) fail("C", `${p}: static Blake aria-label differs from JS fallback`);
      }
    }
  }
  // No inline-hidden elements mentioning Zuniga, no noscript keyword dumps, no new <style>/style= anywhere.
  for (const m of html.matchAll(/<(\w+)\b[^>]*(style="[^"]*(display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?![.\d])|left\s*:\s*-\d{3,}|text-indent\s*:\s*-\d{3,}|font-size\s*:\s*0(?![.\d]))[^"]*"|\shidden[\s>]|aria-hidden="true")[^>]*>([\s\S]{0,400})/gi)) {
    if (/zuniga|blake z|folk blues/i.test(m[0])) fail("C", `${p}: hidden element mentions Zuniga/folk blues: ${m[0].slice(0, 120)}`);
  }
  for (const m of html.matchAll(/<noscript\b[\s\S]*?<\/noscript>/gi)) if (/zuniga|folk blues/i.test(m[0])) fail("C", `${p}: noscript mentions Zuniga/folk blues`);
  const countStyle = (s) => (s.match(/<style\b|\sstyle="/gi) || []).length;
  if (countStyle(html) !== countStyle(bhtml)) fail("D", `${p}: inline <style>/style= count changed`);

  // Coleman pages: no Blake-only keyword lists in their meta.
  if (COLEMAN_PAGES.includes(p)) {
    const [h] = splitHead(html);
    for (const m of h.matchAll(/<meta\b[^>]*>/gi)) if (/zuniga|folk blues|blake z/i.test(m[0])) fail("C", `${p}: Blake keywords in Coleman page meta: ${m[0]}`);
  }

  // D. Visible markup unchanged.
  const [h1, b1] = splitHead(html), [h0, b0] = splitHead(bhtml);
  const bodyNow = b1.replace(NAV_RE, "");
  if (bodyNow !== b0) fail("D", `${p}: <body> differs from base beyond the static #ct-member-links nav`);
  const headLines = (h, allowDesc) => h.replace(NEW_LD, "").split("\n").filter((l) => !URL_META.test(l) && !(allowDesc && DESC_META.test(l)));
  const allowDesc = p === BLAKE_ABOUT;
  if (headLines(h1, allowDesc).join("\n") !== headLines(h0, allowDesc).join("\n")) fail("D", `${p}: <head> differs from base beyond allowed JSON-LD / URL / description lines`);
  // title text unchanged
  if ((h1.match(/<title>[\s\S]*?<\/title>/) || [""])[0] !== (h0.match(/<title>[\s\S]*?<\/title>/) || [""])[0]) fail("D", `${p}: <title> changed`);
  // Any URL meta now present must be apex, and keep the same path as base (only host / trailing-slash normalised).
  for (const l of h1.split("\n").filter((l) => URL_META.test(l))) {
    const u = attr(l, "href") || attr(l, "content") || "";
    if (/www\.thecurltapes\.com/.test(u)) fail("D", `${p}: still-www URL meta: ${l}`);
    const baseLine = h0.split("\n").find((x) => URL_META.test(x) && x.slice(0, 30) === l.slice(0, 30));
    if (!baseLine) fail("D", `${p}: new URL meta line not in base: ${l}`);
    else {
      const bu = (attr(baseLine, "href") || attr(baseLine, "content") || "").replace("://www.", "://").replace(/\/$/, "");
      if (u.replace("://www.", "://").replace(/\/$/, "") !== bu) fail("D", `${p}: URL meta path changed: ${baseLine} -> ${l}`);
    }
  }

  // E. Bytes + requests.
  const dRaw = cur.length - base.length, dGz = gz(cur) - gz(base);
  rows.push([p, base.length, cur.length, dRaw, gz(base), gz(cur), dGz]);
  if (dGz >= 1024) fail("E", `${p}: gzip delta ${dGz} >= 1024`);
  const rNow = requestRefs(html), rBase = requestRefs(bhtml);
  const added = [...rNow].filter((r) => !rBase.has(r));
  if (added.length) fail("E", `${p}: new request-causing refs: ${added.join(" ; ")}`);
}

// E for JS
{
  const js = read("assets/js/ct-member-links.js"), bjs = baseFile("assets/js/ct-member-links.js");
  if (js && bjs) rows.push(["assets/js/ct-member-links.js", bjs.length, js.length, js.length - bjs.length, gz(bjs), gz(js), gz(js) - gz(bjs)]);
  const newJs = git(["ls-files", "--others", "--exclude-standard", "--", "*.js", "*.mjs"]).toString().trim().split("\n").filter((f) => f && !f.startsWith("checks/"));
  const changedJs = git(["diff", "--name-only", BASE, "--", "*.js"]).toString().trim().split("\n").filter((f) => f && f !== "assets/js/ct-member-links.js");
  if (newJs.length || changedJs.length) fail("E", `JS added/changed beyond ct-member-links.js: ${[...newJs, ...changedJs].join(", ")}`);
}

// ---------------- F. sitemap + robots ----------------
{
  const sm = read("sitemap.xml");
  if (!sm) fail("F", "sitemap.xml missing");
  else {
    const s = sm.toString("utf8");
    if (!/^<\?xml[^>]*\?>\s*<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/.test(s)) fail("F", "sitemap.xml is not a sitemaps.org urlset");
    const locs = [...s.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
    if (!locs.length) fail("F", "sitemap.xml lists no URLs");
    for (const u of locs) if (!u.startsWith(`${APEX}/`)) fail("F", `sitemap URL not apex: ${u}`);
    if (new Set(locs).size !== locs.length) fail("F", "sitemap has duplicate URLs");
    if (!locs.includes(`${APEX}/`)) fail("F", "sitemap lacks homepage");
    if (!locs.some((u) => u.replace(/\/$/, "") === `${APEX}/aboutpage/blakezuniga`)) fail("F", "sitemap lacks /aboutpage/blakezuniga/");
    if (locs.some((u) => /404/.test(u))) fail("F", "sitemap lists 404");
    for (const u of locs) {
      const path = u.slice(APEX.length).replace(/^\//, "").replace(/\/$/, "");
      const file = path === "" ? "index.html" : `${path}/index.html`;
      const f = read(file);
      if (!f) { fail("F", `sitemap URL has no page file: ${u}`); continue; }
      const h = splitHead(f.toString("utf8"))[0];
      if (/<meta name="robots"[^>]*noindex/i.test(h)) fail("F", `sitemap lists noindex page: ${u}`);
      const can = (h.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
      if (can && can.replace(/\/$/, "") !== u.replace(/\/$/, "")) fail("F", `sitemap URL ${u} is canonicalised elsewhere (${can})`);
    }
    // Every indexable, self-canonical page must be listed.
    for (const p of PAGES) {
      if (p === "404.html") continue;
      const h = splitHead((read(p) || "").toString("utf8"))[0];
      if (/<meta name="robots"[^>]*noindex/i.test(h)) continue;
      const url = `${APEX}/${p.replace(/index\.html$/, "")}`;
      const can = (h.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
      if (can && can.replace(/\/$/, "") !== url.replace(/\/$/, "")) continue;
      if (!locs.includes(url)) fail("F", `indexable page missing from sitemap: ${url}`);
    }
    rows.push(["sitemap.xml (new)", 0, sm.length, sm.length, 0, gz(sm), gz(sm)]);
  }
  const rb = read("robots.txt");
  if (!rb) fail("F", "robots.txt missing");
  else {
    const r = rb.toString("utf8");
    if (!/^Sitemap:\s*https:\/\/thecurltapes\.com\/sitemap\.xml\s*$/m.test(r)) fail("F", "robots.txt lacks Sitemap line");
    if (/^Disallow:\s*\/\s*$/m.test(r)) fail("F", "robots.txt disallows all");
    if (!/^User-agent:\s*\*\s*$/m.test(r)) fail("F", "robots.txt has no User-agent: *");
    rows.push(["robots.txt (new)", 0, rb.length, rb.length, 0, gz(rb), gz(rb)]);
  }
}

// ---------------- report ----------------
const out = [];
out.push(`t490u-ct-bz-seo  base ${BASE}  root ${ROOT}  head ${git(["rev-parse", "HEAD"]).toString().trim()}  at ${new Date().toISOString()}`);
out.push(`worktree status (git status --short):\n${git(["status", "--short"]).toString().trimEnd() || "(clean)"}`);
out.push("file | raw before | raw after | raw delta | gzip9 before | gzip9 after | gzip9 delta");
for (const r of rows) out.push(r.join(" | "));
const rc = fails.length ? 1 : 0;
if (fails.length) { out.push(`\nFAIL (${fails.length}):`); for (const f of fails) out.push("  " + f); }
else out.push("\nPASS: A B C D E F");
out.push(`exit=${rc}`);
const text = out.join("\n") + "\n";
process.stdout.write(text);
if (LOG) { writeFileSync(LOG, text); writeFileSync(LOG.replace(/\.log$/, "") + ".rc", `${rc}\n`); }
process.exit(rc);
