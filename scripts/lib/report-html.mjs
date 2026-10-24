// Renders one run as a single, self-contained, interactive HTML file.
// Screenshots are embedded, so the file can be emailed or attached as-is.
// All agent-written text is inserted with textContent on the client (never as HTML),
// because it can contain text copied from the app under test.
import fs from "node:fs";
import path from "node:path";

const MAX_EMBED_BYTES =
  Number(process.env.QA_REPORT_MAX_MB || 40) * 1024 * 1024;
const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function collectShots(dir, tests, bugs) {
  const wanted = new Set();
  for (const t of tests)
    for (const a of t.attempts)
      for (const s of a.steps) if (s.screenshot) wanted.add(s.screenshot);
  for (const b of bugs) for (const s of b.screenshots || []) wanted.add(s);
  const shots = {};
  let total = 0;
  const shotRoot = path.join(dir, "screenshots") + path.sep;
  for (const p of wanted) {
    const abs = [path.resolve(dir, p), path.resolve(p)].find((x) =>
      fs.existsSync(x),
    );
    if (!abs || !(abs + "").startsWith(shotRoot)) continue; // only files from this run's screenshots/
    const mime = MIME[path.extname(abs).toLowerCase()];
    if (!mime) continue;
    const size = fs.statSync(abs).size;
    const key = path.relative(dir, abs).split(path.sep).join("/");
    if (total + size > MAX_EMBED_BYTES) {
      shots[p] = key; // too big to embed: fall back to a relative link next to report.html
      continue;
    }
    total += size;
    shots[p] = `data:${mime};base64,${fs.readFileSync(abs).toString("base64")}`;
  }
  return shots;
}

export const safeJson = (v) =>
  JSON.stringify(v)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
export const escHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

export function renderReport({ dir, run, tests, bugs, totals, verdict }) {
  const project = process.env.QA_PROJECT_NAME || "UP Agent";
  const data = {
    project,
    generated_at: new Date().toISOString(),
    run,
    tests,
    bugs,
    totals,
    verdict,
  };
  const shots = collectShots(dir, tests, bugs);
  const title = `${project} — ${run.label} — ${run.id}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(title)}</title>
<style>${CSS}</style>
</head>
<body>
<div id="app" class="layout"><noscript><p style="padding:24px">This report needs JavaScript. Open SUMMARY.md in the same folder for a plain-text version.</p></noscript></div>
<div id="lightbox" class="lightbox" hidden role="dialog" aria-modal="true" aria-label="Screenshot viewer">
  <button class="lb-close" type="button" aria-label="Close">✕</button>
  <button class="lb-nav lb-prev" type="button" aria-label="Previous screenshot">‹</button>
  <figure><img alt=""><figcaption></figcaption></figure>
  <button class="lb-nav lb-next" type="button" aria-label="Next screenshot">›</button>
</div>
<div id="tip" class="tip" role="tooltip" hidden></div>
<script type="application/json" id="report-data">${safeJson(data)}</script>
<script type="application/json" id="report-shots">${safeJson(shots)}</script>
<script>${JS}</script>
</body>
</html>
`;
}

// ---------------------------------------------------------------- styles
export const CSS = String.raw`
:root{
  --bg:#f3f5f6; --panel:#ffffff; --panel-2:#f0f3f4; --border:#dce3e6; --border-strong:#c5cfd4;
  --text:#11181b; --muted:#56666e; --faint:#7d8c93; --accent:#1c6e9c; --accent-soft:#1c6e9c14;
  --pass:#0ca30c; --fail:#d03b3b; --flaky:#6250d6; --blocked:#fab219; --notrun:#8a8a85;
  --pass-bg:#0ca30c14; --fail-bg:#d03b3b12; --flaky-bg:#6250d612; --blocked-bg:#fab21920; --notrun-bg:#8a8a8516;
  --shadow:0 1px 2px #0b16200f, 0 4px 16px #0b162008; --radius:12px;
  --mono:ui-monospace,SFMono-Regular,"Cascadia Code","JetBrains Mono",Menlo,Consolas,monospace;
  --sans:"Segoe UI Variable","Segoe UI",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif;
  color-scheme:light;
}
@media (prefers-color-scheme:dark){ :root:not([data-theme="light"]){
  --bg:#0d1215; --panel:#151c20; --panel-2:#1b2429; --border:#26333a; --border-strong:#34444c;
  --text:#e6ecee; --muted:#9aabb2; --faint:#73858d; --accent:#5ab4e0; --accent-soft:#5ab4e01a;
  --flaky:#9085e9; --pass-bg:#0ca30c1f; --fail-bg:#d03b3b22; --flaky-bg:#9085e922; --blocked-bg:#fab2191c; --notrun-bg:#8a8a8522;
  --shadow:none; color-scheme:dark;
}}
:root[data-theme="dark"]{
  --bg:#0d1215; --panel:#151c20; --panel-2:#1b2429; --border:#26333a; --border-strong:#34444c;
  --text:#e6ecee; --muted:#9aabb2; --faint:#73858d; --accent:#5ab4e0; --accent-soft:#5ab4e01a;
  --flaky:#9085e9; --pass-bg:#0ca30c1f; --fail-bg:#d03b3b22; --flaky-bg:#9085e922; --blocked-bg:#fab2191c; --notrun-bg:#8a8a8522;
  --shadow:none; color-scheme:dark;
}
*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--bg);color:var(--text);font:14px/1.5 var(--sans);-webkit-font-smoothing:antialiased}
a{color:var(--accent)}
button{font:inherit;color:inherit}
.mono{font-family:var(--mono);font-size:.92em}
.muted{color:var(--muted)}
.layout{display:grid;grid-template-columns:272px minmax(0,1fr);min-height:100vh}
/* sidebar */
.side{position:sticky;top:0;height:100vh;overflow:auto;background:var(--panel);border-right:1px solid var(--border);padding:22px 18px;display:flex;flex-direction:column;gap:18px}
.brand{display:flex;align-items:center;gap:10px}
.brand-mark{width:30px;height:30px;border-radius:8px;background:var(--accent);display:grid;place-items:center;color:var(--panel);flex:none}
.brand-name{font-weight:700;letter-spacing:.01em}
.brand-sub{font-size:12px;color:var(--muted)}
.donut-wrap{display:grid;place-items:center;position:relative}
.donut-center{position:absolute;inset:0;display:grid;place-items:center;text-align:center;pointer-events:none}
.donut-center b{display:block;font-size:30px;line-height:1;font-variant-numeric:tabular-nums}
.donut-center span{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.legend{display:flex;flex-direction:column;gap:2px}
.legend button{display:flex;align-items:center;gap:10px;width:100%;padding:7px 8px;border:1px solid transparent;border-radius:8px;background:none;cursor:pointer;text-align:left}
.legend button:hover{background:var(--panel-2)}
.legend button[aria-pressed="true"]{border-color:var(--border-strong);background:var(--panel-2)}
.legend .lbl{flex:1;color:var(--muted)}
.legend .cnt{font-weight:700;font-variant-numeric:tabular-nums}
.nav{display:flex;flex-direction:column;gap:2px;border-top:1px solid var(--border);padding-top:14px}
.nav a{color:var(--muted);text-decoration:none;padding:6px 8px;border-radius:7px;display:flex;justify-content:space-between}
.nav a:hover,.nav a.on{color:var(--text);background:var(--panel-2)}
.side-actions{margin-top:auto;display:flex;gap:8px;flex-wrap:wrap}
.btn{border:1px solid var(--border-strong);background:var(--panel);border-radius:8px;padding:6px 11px;cursor:pointer;font-size:12.5px;display:inline-flex;gap:6px;align-items:center}
.btn:hover{background:var(--panel-2)}
.btn:focus-visible,.legend button:focus-visible,.chip:focus-visible,.tc-head:focus-visible,.thumb:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
/* main */
.main{padding:28px clamp(16px,3vw,40px) 60px;max-width:1280px;width:100%}
.eyebrow{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 6px}
h1{font-size:clamp(22px,2.4vw,30px);line-height:1.2;margin:0 0 4px;letter-spacing:-.01em}
h2{font-size:18px;margin:0;letter-spacing:-.005em}
.sub{color:var(--muted);margin:0 0 20px}
section{scroll-margin-top:16px;margin-top:34px}
.sec-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap}
.card{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow)}
.verdict{display:grid;grid-template-columns:auto 1fr;gap:16px;padding:18px 20px;border-left:5px solid var(--c)}
.verdict-icon{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:var(--cbg);color:var(--c)}
.verdict-title{font-weight:800;letter-spacing:.04em;font-size:13px;text-transform:uppercase}
.verdict p{margin:4px 0 0;font-size:15px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:10px;margin-top:14px}
.kpi{padding:14px 14px 12px;position:relative;overflow:hidden}
.kpi::before{content:"";position:absolute;inset:0 auto 0 0;width:3px;background:var(--c,transparent)}
.kpi .n{font-size:26px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums}
.kpi .l{font-size:11.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;display:flex;gap:6px;align-items:center;margin-top:4px}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,400px),1fr));gap:12px;margin-top:12px}
.chart{padding:16px 18px}
.chart h3{margin:0 0 2px;font-size:14px}
.chart .cap{margin:0 0 12px;font-size:12.5px;color:var(--muted)}
.chart svg{display:block;width:100%;max-width:560px;height:auto;overflow:visible}
.axis text{fill:var(--muted);font-size:11px}
.axis line,.gridline{stroke:var(--border);stroke-width:1}
.bar-label{fill:var(--text);font-size:12px}
.mark{cursor:default}
.mark:hover{filter:brightness(1.12)}
.mini-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin-top:10px}
.mini-legend span{display:inline-flex;align-items:center;gap:6px}
.sw{width:10px;height:10px;border-radius:3px;display:inline-block;background:var(--c)}
.attention{display:flex;flex-direction:column;gap:8px}
.att{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:start;padding:12px 14px;text-decoration:none;color:inherit;border-left:4px solid var(--c)}
.att:hover{background:var(--panel-2)}
.att .why{color:var(--muted);font-size:13px;margin-top:2px}
.empty{padding:18px;color:var(--muted);text-align:center}
/* pills */
.pill{display:inline-flex;align-items:center;gap:5px;padding:2px 9px 2px 7px;border-radius:999px;font-size:11.5px;font-weight:650;white-space:nowrap;background:var(--cbg);border:1px solid color-mix(in srgb,var(--c) 40%,transparent);color:var(--text)}
.pill svg{color:var(--c);flex:none}
.tag{display:inline-block;font-size:11px;padding:1px 8px;border-radius:999px;background:var(--panel-2);border:1px solid var(--border);color:var(--muted)}
.prio{font-size:11px;font-weight:650;padding:1px 7px;border-radius:5px;border:1px solid var(--border-strong);color:var(--muted)}
.prio.High{color:var(--text);border-color:var(--text)}
/* toolbar */
.toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
.search{flex:1 1 220px;min-width:0;border:1px solid var(--border-strong);background:var(--panel);border-radius:8px;padding:7px 11px;color:var(--text);font:inherit}
.chip{border:1px solid var(--border-strong);background:var(--panel);border-radius:999px;padding:4px 11px;cursor:pointer;font-size:12.5px;display:inline-flex;gap:6px;align-items:center}
.chip[aria-pressed="true"]{background:var(--text);color:var(--panel);border-color:var(--text)}
.chip[aria-pressed="true"] svg{color:inherit}
select.search{flex:0 0 auto}
/* test cards */
.tc{margin-bottom:8px;border-left:4px solid var(--c);overflow:hidden}
.tc-head{display:grid;grid-template-columns:auto auto 1fr auto auto;gap:12px;align-items:center;padding:12px 14px;cursor:pointer;background:none;border:0;width:100%;text-align:left}
.tc-head:hover{background:var(--panel-2)}
.chev{transition:transform .15s;color:var(--muted)}
.tc.open .chev{transform:rotate(90deg)}
.tc-title{font-weight:600;min-width:0}
.tc-title .mono{color:var(--muted);margin-right:8px;font-weight:500}
.tc-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:3px}
.tc-dur{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}
.tc-body{display:none;padding:2px 18px 18px;border-top:1px solid var(--border)}
.tc.open .tc-body{display:block}
.meta{display:flex;gap:6px 18px;flex-wrap:wrap;font-size:12.5px;color:var(--muted);margin:12px 0}
.meta b{color:var(--text);font-weight:600}
.callout{border:1px solid color-mix(in srgb,var(--c) 45%,transparent);background:var(--cbg);border-radius:10px;padding:12px 14px;margin:10px 0}
.callout h4{margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
.ea{display:grid;grid-template-columns:90px 1fr;gap:4px 12px;font-size:13.5px}
.ea dt{color:var(--muted)}
.ea dd{margin:0}
.attempts{display:flex;gap:6px;margin:14px 0 8px;flex-wrap:wrap}
.table-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:10px}
table.steps{width:100%;border-collapse:collapse;font-size:13px;min-width:720px}
.steps th{text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:650;padding:8px 10px;background:var(--panel-2);border-bottom:1px solid var(--border)}
.steps td{padding:9px 10px;border-bottom:1px solid var(--border);vertical-align:top}
.steps tr:last-child td{border-bottom:0}
.steps tr.is-fail td{background:var(--fail-bg)}
.steps tr.is-skip td{color:var(--faint)}
.steps td.n{width:34px;color:var(--muted);font-variant-numeric:tabular-nums}
.thumb{display:block;width:120px;aspect-ratio:16/10;object-fit:cover;object-position:top;border-radius:6px;border:1px solid var(--border);cursor:zoom-in;background:var(--panel-2);padding:0}
.thumb img{width:100%;height:100%;object-fit:cover;object-position:top;border-radius:5px;display:block}
.gallery{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
.gallery figure{margin:0}
.gallery figcaption{font-size:11px;color:var(--muted);margin-top:4px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.obs{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:14px}
.obs > div{background:var(--panel-2);border-radius:10px;padding:10px 12px;font-size:13px}
.obs h5{margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.obs ul{margin:0;padding-left:18px}
.obs li+li{margin-top:4px}
/* defects */
.defect{padding:16px 18px;margin-bottom:10px;border-left:4px solid var(--fail)}
.defect-head{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.defect h3{font-size:15px;margin:0;flex:1 1 300px}
.defect ol{margin:10px 0;padding-left:20px}
.sev{font-size:11px;font-weight:700;padding:2px 8px;border-radius:5px;border:1px solid var(--border-strong)}
.sev.Critical,.sev.High{border-color:var(--fail);color:var(--fail)}
.jira{font-size:12.5px;font-weight:600;text-decoration:none;border:1px solid var(--border-strong);padding:2px 9px;border-radius:999px}
/* environment */
.env{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
.env div{padding:12px 14px}
.env dt{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.env dd{margin:3px 0 0;word-break:break-word}
footer{margin-top:40px;color:var(--faint);font-size:12px}
/* tooltip + lightbox */
.tip{position:fixed;z-index:30;pointer-events:none;background:var(--text);color:var(--panel);font-size:12px;padding:6px 9px;border-radius:7px;max-width:280px;box-shadow:0 6px 24px #0004}
.lightbox{position:fixed;inset:0;z-index:40;background:#05090bE6;display:grid;grid-template-columns:56px 1fr 56px;align-items:center;padding:24px 8px}
.lightbox[hidden]{display:none}
.lightbox figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:10px;min-width:0}
.lightbox img{max-width:100%;max-height:82vh;border-radius:8px;background:#fff}
.lightbox figcaption{color:#dfe7ea;font-size:13px;text-align:center}
.lb-nav,.lb-close{background:#ffffff1a;border:0;color:#fff;border-radius:50%;width:44px;height:44px;font-size:26px;cursor:pointer;justify-self:center}
.lb-close{position:absolute;top:14px;right:16px;font-size:18px}
.lb-nav:hover,.lb-close:hover{background:#ffffff33}
@media (max-width:900px){
  .layout{grid-template-columns:1fr}
  .side{position:static;height:auto;border-right:0;border-bottom:1px solid var(--border);display:grid;grid-template-columns:1fr 1fr;align-items:center}
  .brand,.side-actions,.nav{grid-column:1/-1}
  .nav{flex-direction:row;flex-wrap:wrap}
  .tc-head{grid-template-columns:auto 1fr auto}
  .tc-head .pill-slot{grid-column:2}
  .tc-dur{display:none}
}
@media (max-width:560px){ .side{grid-template-columns:1fr} .ea{grid-template-columns:1fr} }
@media print{
  :root{--bg:#fff;--panel:#fff;--panel-2:#f5f7f8;--text:#000;--muted:#444;--border:#ccc;color-scheme:light}
  .layout{display:block} .side{position:static;height:auto;display:none}
  .toolbar,.side-actions,.lightbox,.tip,.chev{display:none!important}
  .tc-body{display:block!important} .tc{break-inside:avoid-page} .card{box-shadow:none}
  .print-head{display:block!important}
}
.print-head{display:none}
`;

// ---------------------------------------------------------------- client script
const JS = String.raw`
(function(){
"use strict";
var D = JSON.parse(document.getElementById("report-data").textContent);
var SHOTS = JSON.parse(document.getElementById("report-shots").textContent);
var ST = {
  "PASS":    {label:"Passed",  c:"var(--pass)",    bg:"var(--pass-bg)",    icon:"check"},
  "FAIL":    {label:"Failed",  c:"var(--fail)",    bg:"var(--fail-bg)",    icon:"x"},
  "FLAKY":   {label:"Flaky",   c:"var(--flaky)",   bg:"var(--flaky-bg)",   icon:"retry"},
  "BLOCKED": {label:"Blocked", c:"var(--blocked)", bg:"var(--blocked-bg)", icon:"alert"},
  "NOT RUN": {label:"Not run", c:"var(--notrun)",  bg:"var(--notrun-bg)",  icon:"minus"}
};
var STEP = {"PASS":"PASS","FAIL":"FAIL","SKIPPED":"NOT RUN","BLOCKED":"BLOCKED"};
var CAUSE = {
  "product-bug":{label:"Product defect", c:"var(--fail)"},
  "test-data":{label:"Test data", c:"var(--blocked)"},
  "environment":{label:"Environment", c:"var(--notrun)"},
  "test-defect":{label:"Test case problem", c:"var(--flaky)"}
};
var ORDER = ["PASS","FAIL","FLAKY","BLOCKED","NOT RUN"];
var ICONS = {
  check:'<path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  x:'<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  retry:'<path d="M12.5 6A5 5 0 1 0 13 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M13 2.5V6H9.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  alert:'<path d="M8 2.2L14.2 13H1.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 6.3v3.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="8" cy="11.4" r=".95" fill="currentColor"/>',
  minus:'<circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.3 8h5.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  chev:'<path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  bug:'<path d="M5.5 5.5h5v4.5a2.5 2.5 0 0 1-5 0zM6 5.5a2 2 0 0 1 4 0M2.5 8.5h3M10.5 8.5h3M3 5l2.5 1.5M13 5l-2.5 1.5M3 12.5l2.6-1.3M13 12.5l-2.6-1.3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  clock:'<circle cx="8" cy="8" r="5.8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 4.8V8l2.2 1.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  sum:'<path d="M3 3.5h10M3 8h10M3 12.5h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
};
function icon(name, size){ size=size||14; var s=document.createElementNS("http://www.w3.org/2000/svg","svg"); s.setAttribute("viewBox","0 0 16 16"); s.setAttribute("width",size); s.setAttribute("height",size); s.setAttribute("aria-hidden","true"); s.innerHTML=ICONS[name]; return s; }
function h(tag, attrs){
  var el=document.createElement(tag), a=attrs||{};
  for (var k in a){ var v=a[k]; if(v==null||v===false) continue;
    if(k==="class") el.className=v; else if(k==="text") el.textContent=v; else if(k==="style") el.setAttribute("style",v);
    else if(k.slice(0,2)==="on") el.addEventListener(k.slice(2),v); else el.setAttribute(k, v===true?"":v); }
  for (var i=2;i<arguments.length;i++) add(el, arguments[i]);
  return el;
}
function add(el,c){ if(c==null||c===false) return; if(Array.isArray(c)) c.forEach(function(x){add(el,x)}); else el.appendChild(typeof c==="string"||typeof c==="number"? document.createTextNode(String(c)) : c); }
function svg(tag, attrs){ var el=document.createElementNS("http://www.w3.org/2000/svg",tag); for(var k in attrs) el.setAttribute(k, attrs[k]); return el; }
function pill(status,label){ var s=ST[status]||ST["NOT RUN"]; var p=h("span",{class:"pill",style:"--c:"+s.c+";--cbg:"+s.bg},icon(s.icon,12),label||s.label); return p; }
function dur(ms){ if(ms==null) return "–"; var s=Math.round(ms/1000); if(s<60) return s+"s"; var m=Math.floor(s/60); if(m<60) return m+"m "+(s%60)+"s"; return Math.floor(m/60)+"h "+(m%60)+"m"; }
function when(iso){ if(!iso) return "–"; var d=new Date(iso); if(isNaN(d)) return iso; return d.toLocaleString(undefined,{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}); }
function plural(n, w){ return n+" "+w+(n===1?"":"s"); }
function host(u){ try{ return new URL(u).host; }catch(e){ return u||""; } }

var run=D.run, T=D.totals, tests=D.tests, bugs=D.bugs;
var envUrl = run.base_url_override || (tests.find(function(t){return t.environment;})||{}).environment || "";

// ---------- tooltip
var tip=document.getElementById("tip");
function showTip(e, text){ tip.textContent=text; tip.hidden=false; moveTip(e); }
function moveTip(e){ var x=e.clientX+14, y=e.clientY+14; var r=tip.getBoundingClientRect(); if(x+r.width>innerWidth-8) x=e.clientX-r.width-14; if(y+r.height>innerHeight-8) y=e.clientY-r.height-14; tip.style.left=x+"px"; tip.style.top=y+"px"; }
function hideTip(){ tip.hidden=true; }
function tipOn(el, text){ el.addEventListener("mousemove",function(e){showTip(e,text)}); el.addEventListener("mouseleave",hideTip); el.setAttribute("aria-label",text); return el; }

// ---------- lightbox
var LB=document.getElementById("lightbox"), lbImg=LB.querySelector("img"), lbCap=LB.querySelector("figcaption"), lbList=[], lbIdx=0, lbReturn=null;
function openLB(list, idx){ lbList=list; lbIdx=idx; lbReturn=document.activeElement; LB.hidden=false; drawLB(); LB.querySelector(".lb-close").focus(); }
function drawLB(){ var it=lbList[lbIdx]; lbImg.src=it.src; lbImg.alt=it.cap; lbCap.textContent=it.cap+"  ("+(lbIdx+1)+" / "+lbList.length+")"; }
function closeLB(){ LB.hidden=true; lbImg.src=""; if(lbReturn) lbReturn.focus(); }
LB.querySelector(".lb-close").onclick=closeLB;
LB.querySelector(".lb-prev").onclick=function(){ lbIdx=(lbIdx-1+lbList.length)%lbList.length; drawLB(); };
LB.querySelector(".lb-next").onclick=function(){ lbIdx=(lbIdx+1)%lbList.length; drawLB(); };
LB.addEventListener("click",function(e){ if(e.target===LB) closeLB(); });
document.addEventListener("keydown",function(e){ if(LB.hidden) return; if(e.key==="Escape") closeLB(); if(e.key==="ArrowLeft") LB.querySelector(".lb-prev").click(); if(e.key==="ArrowRight") LB.querySelector(".lb-next").click(); });
function thumb(path, cap, list){
  var src=SHOTS[path]; if(!src) return h("span",{class:"muted",style:"font-size:12px",text:"(screenshot missing)"});
  var entry={src:src,cap:cap}; list.push(entry); var idx=list.length-1;
  return h("button",{class:"thumb",type:"button","aria-label":"Open screenshot: "+cap,onclick:function(){openLB(list,idx)}}, h("img",{src:src,alt:cap,loading:"lazy"}));
}

// ---------- theme
function setTheme(t){ document.documentElement.setAttribute("data-theme",t); try{localStorage.setItem("qa-report-theme",t)}catch(e){} }
try{ var saved=localStorage.getItem("qa-report-theme"); if(saved) document.documentElement.setAttribute("data-theme",saved); }catch(e){}
function currentTheme(){ var a=document.documentElement.getAttribute("data-theme"); if(a) return a; return matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"; }

// ---------- state
var state={status:null, q:"", prio:"", open:{}};

// ---------- donut
function donut(){
  var size=184, r=78, w=22, cx=size/2, cy=size/2, C=2*Math.PI*r, gap=ORDER.filter(function(s){return T[s]>0}).length>1? 3:0;
  var s=svg("svg",{viewBox:"0 0 "+size+" "+size,width:size,height:size,role:"img","aria-label":"Results: "+ORDER.map(function(k){return T[k]+" "+ST[k].label.toLowerCase()}).join(", ")});
  s.appendChild(svg("circle",{cx:cx,cy:cy,r:r,fill:"none",stroke:"var(--panel-2)","stroke-width":w}));
  var off=0;
  ORDER.forEach(function(k){ var n=T[k]; if(!n||!T.total) return; var len=C*n/T.total; var seg=svg("circle",{cx:cx,cy:cy,r:r,fill:"none",stroke:ST[k].c,"stroke-width":w,"stroke-dasharray":Math.max(len-gap,0.5)+" "+(C-Math.max(len-gap,0.5)),"stroke-dashoffset":-off,transform:"rotate(-90 "+cx+" "+cy+")",class:"mark"});
    tipOn(seg, ST[k].label+": "+n+" of "+T.total+" ("+Math.round(100*n/T.total)+"%)"); s.appendChild(seg); off+=len; });
  return h("div",{class:"donut-wrap"}, s, h("div",{class:"donut-center"}, h("div",null,h("b",{text:T.pass_rate+"%"}),h("span",{text:"pass rate"}))));
}

// ---------- sidebar
function sidebar(){
  var legend=h("div",{class:"legend",role:"group","aria-label":"Filter tests by status"});
  ORDER.forEach(function(k){ legend.appendChild(h("button",{type:"button","aria-pressed":String(state.status===k),onclick:function(){ state.status= state.status===k? null:k; renderTests(); syncLegend(); location.hash="tests"; }},
    h("span",{style:"color:"+ST[k].c+";display:inline-flex"},icon(ST[k].icon,15)), h("span",{class:"lbl",text:ST[k].label}), h("span",{class:"cnt",text:T[k]}))); });
  var nav=h("nav",{class:"nav","aria-label":"Sections"},
    h("a",{href:"#overview"},"Overview"), h("a",{href:"#tests"},"Test cases",h("span",{class:"muted",text:T.total})),
    h("a",{href:"#defects"},"Defects",h("span",{class:"muted",text:bugs.length})), h("a",{href:"#environment"},"Run details"));
  var actions=h("div",{class:"side-actions"},
    h("button",{class:"btn",type:"button",onclick:function(){ setTheme(currentTheme()==="dark"?"light":"dark"); }},"Light / dark"),
    h("button",{class:"btn",type:"button",onclick:function(){ document.querySelectorAll(".tc").forEach(function(c){c.classList.add("open")}); window.print(); }},"Print / PDF"),
    h("button",{class:"btn",type:"button",onclick:exportCsv},"Export CSV"));
  return h("aside",{class:"side"},
    h("div",{class:"brand"}, h("div",{class:"brand-mark"},icon("check",16)), h("div",null,h("div",{class:"brand-name",text:D.project}),h("div",{class:"brand-sub",text:"Test run report"}))),
    donut(), legend, nav, actions);
}
function syncLegend(){ document.querySelectorAll(".legend button").forEach(function(b,i){ b.setAttribute("aria-pressed", String(state.status===ORDER[i])); }); document.querySelectorAll(".chip[data-status]").forEach(function(c){ c.setAttribute("aria-pressed", String((c.getAttribute("data-status")||null)===(state.status||""))); }); }

// ---------- overview
function verdictCard(){
  var v=D.verdict, key = v==="PASSED"?"PASS": v==="PASSED WITH FLAKY TESTS"?"FLAKY": v==="NO TESTS"?"NOT RUN":"FAIL", s=ST[key];
  var passed=T.PASS+T.FLAKY;
  var bits=[passed+" of "+plural(T.total,"test")+" passed ("+T.pass_rate+"%)"+(T.FLAKY? ", "+T.FLAKY+" of them only on the re-run (flaky)." : ".")];
  var fails=tests.filter(function(t){return t.status==="FAIL"});
  if(fails.length){ var by={}; fails.forEach(function(t){ var c=t.category||"untriaged"; by[c]=(by[c]||0)+1; });
    bits.push(plural(fails.length,"test")+" failed: "+Object.keys(by).map(function(c){ return by[c]+" "+(CAUSE[c]?CAUSE[c].label.toLowerCase():"not yet triaged"); }).join(", ")+"."); }
  if(T.BLOCKED) bits.push(plural(T.BLOCKED,"test")+" could not run (blocked).");
  if(T["NOT RUN"]) bits.push(plural(T["NOT RUN"],"test")+" produced no result.");
  bits.push(bugs.length? plural(bugs.length,"bug report")+" written." : "No bug reports written.");
  return h("div",{class:"card verdict",style:"--c:"+s.c+";--cbg:"+s.bg},
    h("div",{class:"verdict-icon"},icon(s.icon,22)),
    h("div",null,h("div",{class:"verdict-title",style:"color:var(--text)",text:"Verdict: "+v}), h("p",{text:bits.join(" ")})));
}
function kpi(n,l,c,ic){ return h("div",{class:"card kpi",style:c?"--c:"+c:""}, h("div",{class:"n",text:n}), h("div",{class:"l"}, ic? h("span",{style:"color:"+(c||"var(--muted)")+";display:inline-flex"},icon(ic,12)):null, l)); }
function kpis(){
  return h("div",{class:"kpis"},
    kpi(T.total,"Total tests",null,"sum"), kpi(T.PASS,"Passed",ST.PASS.c,"check"), kpi(T.FAIL,"Failed",ST.FAIL.c,"x"),
    kpi(T.FLAKY,"Flaky",ST.FLAKY.c,"retry"), kpi(T.BLOCKED,"Blocked",ST.BLOCKED.c,"alert"), kpi(T["NOT RUN"],"Not run",ST["NOT RUN"].c,"minus"),
    kpi(bugs.length,"Defects",bugs.length?"var(--fail)":null,"bug"), kpi(dur(run.duration_ms),"Duration",null,"clock"));
}
function stackedBars(title, cap, groups){
  // groups: [{label, counts:{STATUS:n}}]
  var W=520, rowH=30, padL=96, padR=36, H=groups.length*rowH+24, max=Math.max.apply(null,groups.map(function(g){return ORDER.reduce(function(a,k){return a+(g.counts[k]||0)},0)}).concat([1]));
  var s=svg("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":title});
  var scale=(W-padL-padR)/max;
  for(var t=0;t<=max;t+= Math.max(1,Math.ceil(max/5))){ var x=padL+t*scale; s.appendChild(svg("line",{x1:x,x2:x,y1:0,y2:H-20,class:"gridline"})); var tx=svg("text",{x:x,y:H-4,"text-anchor":"middle",class:"axis"}); tx.setAttribute("fill","var(--muted)"); tx.setAttribute("font-size","11"); tx.textContent=t; s.appendChild(tx); }
  groups.forEach(function(g,i){
    var y=i*rowH+6, x=padL, total=0;
    var lab=svg("text",{x:padL-10,y:y+13,"text-anchor":"end",class:"bar-label"}); lab.textContent=g.label; s.appendChild(lab);
    ORDER.forEach(function(k){ var n=g.counts[k]||0; if(!n) return; var w=n*scale; var r=svg("rect",{x:x,y:y,width:Math.max(w-2,1),height:18,rx:4,fill:ST[k].c,class:"mark"}); tipOn(r, g.label+" · "+ST[k].label+": "+n); s.appendChild(r); x+=w; total+=n; });
    var tl=svg("text",{x:x+6,y:y+13,class:"bar-label"}); tl.textContent=total; s.appendChild(tl);
  });
  var lg=h("div",{class:"mini-legend"}); ORDER.forEach(function(k){ if(groups.some(function(g){return g.counts[k]})) lg.appendChild(h("span",null,h("i",{class:"sw",style:"--c:"+ST[k].c}),ST[k].label)); });
  return h("div",{class:"card chart"}, h("h3",{text:title}), h("p",{class:"cap",text:cap}), s, lg);
}
function byField(fn, labels){
  var m={}; tests.forEach(function(t){ fn(t).forEach(function(k){ (m[k]=m[k]||{})[t.status]=((m[k]||{})[t.status]||0)+1; }); });
  var keys=labels? labels.filter(function(l){return m[l]}) : Object.keys(m).sort(function(a,b){ return sum(m[b])-sum(m[a]); }).slice(0,8);
  function sum(o){ return ORDER.reduce(function(a,k){return a+(o[k]||0)},0); }
  return keys.map(function(k){ return {label:k, counts:m[k]}; });
}
function timeline(){
  var rows=tests.filter(function(t){ return t.started_at && t.finished_at && Date.parse(t.finished_at)>=Date.parse(t.started_at); });
  if(rows.length<1) return null;
  var t0=Math.min.apply(null,rows.map(function(t){return Date.parse(t.started_at)}).concat([Date.parse(run.started_at)||Infinity]));
  var t1=Math.max.apply(null,rows.map(function(t){return Date.parse(t.finished_at)}));
  var span=Math.max(t1-t0,1000), W=520, rowH=26, padL=72, padR=50, H=rows.length*rowH+26, sc=(W-padL-padR)/span;
  var s=svg("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Execution timeline"});
  for(var i=0;i<=4;i++){ var x=padL+(W-padL-padR)*i/4; s.appendChild(svg("line",{x1:x,x2:x,y1:0,y2:H-20,class:"gridline"})); var tx=svg("text",{x:x,y:H-4,"text-anchor":"middle"}); tx.setAttribute("fill","var(--muted)"); tx.setAttribute("font-size","11"); tx.textContent=dur(span*i/4); s.appendChild(tx); }
  rows.forEach(function(t,i){ var y=i*rowH+5, a=Date.parse(t.started_at), b=Date.parse(t.finished_at);
    var lab=svg("text",{x:padL-10,y:y+12,"text-anchor":"end",class:"bar-label"}); lab.setAttribute("font-family","var(--mono)"); lab.textContent=t.tc_id; s.appendChild(lab);
    var r=svg("rect",{x:padL+(a-t0)*sc,y:y,width:Math.max((b-a)*sc,3),height:16,rx:4,fill:(ST[t.status]||ST["NOT RUN"]).c,class:"mark"});
    tipOn(r, t.tc_id+" "+t.title+" · "+(ST[t.status]||{}).label+" · "+dur(b-a)); s.appendChild(r);
    var dl=svg("text",{x:padL+(b-t0)*sc+6,y:y+12,class:"bar-label"}); dl.setAttribute("fill","var(--muted)"); dl.setAttribute("font-size","11"); dl.textContent=dur(b-a); s.appendChild(dl); });
  return h("div",{class:"card chart"}, h("h3",{text:"Execution timeline"}), h("p",{class:"cap",text:"When each test ran, relative to the start of the run. Overlapping bars ran in parallel."}), s);
}
function causes(){
  var f=tests.filter(function(t){return t.status!=="PASS"&&t.status!=="NOT RUN"});
  if(!f.length) return null;
  var m={}; f.forEach(function(t){ var c=t.status==="FLAKY"?"flaky":(t.category||"untriaged"); m[c]=(m[c]||0)+1; });
  var meta={"flaky":{label:"Flaky (passed on re-run)",c:"var(--flaky)"},"untriaged":{label:"Not triaged",c:"var(--notrun)"}};
  var keys=Object.keys(m).sort(function(a,b){return m[b]-m[a]}), max=Math.max.apply(null,keys.map(function(k){return m[k]}));
  var W=520,rowH=30,padL=150,padR=36,H=keys.length*rowH+6,sc=(W-padL-padR)/max;
  var s=svg("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Causes of non-passing tests"});
  keys.forEach(function(k,i){ var info=CAUSE[k]||meta[k]||{label:k,c:"var(--notrun)"}, y=i*rowH+6;
    var lab=svg("text",{x:padL-10,y:y+13,"text-anchor":"end",class:"bar-label"}); lab.textContent=info.label; s.appendChild(lab);
    var r=svg("rect",{x:padL,y:y,width:Math.max(m[k]*sc-2,3),height:18,rx:4,fill:info.c,class:"mark"}); tipOn(r, info.label+": "+m[k]); s.appendChild(r);
    var tl=svg("text",{x:padL+m[k]*sc+6,y:y+13,class:"bar-label"}); tl.textContent=m[k]; s.appendChild(tl); });
  return h("div",{class:"card chart"}, h("h3",{text:"Why tests did not pass"}), h("p",{class:"cap",text:"The agent's triage of each failure. Every failure is reported to Jira with this label."}), s);
}
function attention(){
  var list=tests.filter(function(t){return t.status!=="PASS"});
  var box=h("div",{class:"attention"});
  if(!list.length) box.appendChild(h("div",{class:"card empty",text:"Nothing needs attention. Every test passed."}));
  list.forEach(function(t){ var s=ST[t.status];
    var why = t.status==="BLOCKED"? (t.blocked_reason||"Blocked.") : t.status==="NOT RUN"? "No result was written for this test." : t.status==="FLAKY"? "Failed on the first attempt and passed on the re-run." : "Step "+(t.failed_step||"?")+" failed. "+(t.category_reason||"");
    box.appendChild(h("a",{class:"card att",href:"#"+t.tc_id,style:"--c:"+s.c,onclick:function(){ state.open[t.tc_id]=true; state.status=null; state.q=""; renderTests(); syncLegend(); }},
      pill(t.status), h("div",null, h("div",null,h("span",{class:"mono muted",text:t.tc_id+"  "}),h("b",{text:t.title})), h("div",{class:"why",text:why})),
      t.category && CAUSE[t.category]? h("span",{class:"tag",text:CAUSE[t.category].label}) : h("span")));
  });
  return box;
}

// ---------- tests
var testsBox, countLabel;
function toolbar(){
  var chips=[h("button",{class:"chip",type:"button","data-status":"","aria-pressed":String(!state.status),onclick:function(){state.status=null;renderTests();syncLegend();}},"All "+T.total)];
  ORDER.forEach(function(k){ if(!T[k]) return; chips.push(h("button",{class:"chip",type:"button","data-status":k,"aria-pressed":String(state.status===k),onclick:function(){state.status=state.status===k?null:k;renderTests();syncLegend();}}, h("span",{style:"color:"+ST[k].c+";display:inline-flex"},icon(ST[k].icon,12)), ST[k].label+" "+T[k])); });
  var prios=[""].concat(["High","Medium","Low"].filter(function(p){return tests.some(function(t){return t.priority===p})}));
  var sel=h("select",{class:"search","aria-label":"Priority",onchange:function(e){state.prio=e.target.value;renderTests();}}); prios.forEach(function(p){ sel.appendChild(h("option",{value:p,text:p?p+" priority":"Any priority"})); });
  return h("div",{class:"toolbar"},
    h("input",{class:"search",type:"search",placeholder:"Search id, title, tag or step text…","aria-label":"Search tests",oninput:function(e){state.q=e.target.value.toLowerCase();renderTests();}}),
    sel, chips,
    h("button",{class:"btn",type:"button",onclick:function(){ tests.forEach(function(t){state.open[t.tc_id]=true}); renderTests(); }},"Expand all"),
    h("button",{class:"btn",type:"button",onclick:function(){ state.open={}; renderTests(); }},"Collapse"));
}
function matches(t){
  if(state.status && t.status!==state.status) return false;
  if(state.prio && t.priority!==state.prio) return false;
  if(!state.q) return true;
  var hay=[t.tc_id,t.title,t.file,(t.tags||[]).join(" "),t.category||"",t.blocked_reason,t.category_reason].concat(t.steps.map(function(s){return s.action+" "+s.expected+" "+s.actual})).join(" ").toLowerCase();
  return hay.indexOf(state.q)>=0;
}
function stepTable(a, t, shots){
  var tb=h("tbody");
  a.steps.forEach(function(s){ var cls= s.result==="FAIL"?"is-fail": s.result==="SKIPPED"?"is-skip":"";
    tb.appendChild(h("tr",{class:cls}, h("td",{class:"n",text:s.n}), h("td",{text:s.action}), h("td",{text:s.expected||"–"}), h("td",{text:s.actual||(s.result==="SKIPPED"?"Not executed":"–")}),
      h("td",null,pill(STEP[s.result]||"NOT RUN", s.result==="SKIPPED"?"Skipped":null)), h("td",null, s.screenshot? thumb(s.screenshot, t.tc_id+" · attempt "+a.n+" · step "+s.n, shots) : h("span",{class:"muted",text:"–"})))); });
  return h("div",{class:"table-wrap"}, h("table",{class:"steps"}, h("thead",null,h("tr",null,["#","Action","Expected","Actual (from snapshot)","Result","Evidence"].map(function(x){return h("th",{scope:"col",text:x})}))), tb));
}
function list(items){ return items.length? h("ul",null,items.map(function(x){return h("li",{text:x})})) : h("div",{class:"muted",text:"None"}); }
function testCard(t){
  var s=ST[t.status]||ST["NOT RUN"], open=!!state.open[t.tc_id];
  var card=h("article",{class:"card tc"+(open?" open":""),id:t.tc_id,style:"--c:"+s.c});
  var head=h("button",{class:"tc-head",type:"button","aria-expanded":String(open),onclick:function(){ state.open[t.tc_id]=!state.open[t.tc_id]; card.classList.toggle("open"); head.setAttribute("aria-expanded",String(card.classList.contains("open"))); if(card.classList.contains("open")&&!body.firstChild) fillBody(); }},
    h("span",{class:"chev"},icon("chev",14)), h("span",{class:"pill-slot"},pill(t.status)),
    h("span",{class:"tc-title"}, h("span",{class:"mono",text:t.tc_id}), h("span",{text:t.title}),
      h("span",{class:"tc-tags"}, t.priority? h("span",{class:"prio "+t.priority,text:t.priority}):null, (t.tags||[]).map(function(g){return h("span",{class:"tag",text:g})}))),
    h("span",{class:"tc-dur",text:t.attempts.length>1? plural(t.attempts.length,"attempt"):""}),
    h("span",{class:"tc-dur",text:dur(t.duration_ms)}));
  var body=h("div",{class:"tc-body"});
  function fillBody(){
    var shots=[];
    add(body, h("div",{class:"meta"},
      h("span",null,"File ",h("b",{class:"mono",text:t.file||"–"})), h("span",null,"Started ",h("b",{text:when(t.started_at)})), h("span",null,"Duration ",h("b",{text:dur(t.duration_ms)})),
      t.environment? h("span",null,"Environment ",h("b",{text:t.environment})):null, t.session? h("span",null,"Session ",h("b",{class:"mono",text:t.session})):null));
    if(t.status==="BLOCKED") add(body, h("div",{class:"callout",style:"--c:var(--blocked);--cbg:var(--blocked-bg)"}, h("h4",{text:"Why it could not run"}), h("div",{text:t.blocked_reason||"No reason given."})));
    if(t.status==="NOT RUN") add(body, h("div",{class:"callout",style:"--c:var(--notrun);--cbg:var(--notrun-bg)"}, h("h4",{text:"No result"}), h("div",{text:"The run finished without a result for this test. The runner may have crashed or hit its turn limit."})));
    if(t.status==="FAIL"||t.status==="FLAKY"){
      var fa=t.attempts.find(function(a){return a.status==="FAIL"})||t.attempts[0]; var fs= fa? fa.steps.find(function(x){return x.result==="FAIL"}) : null;
      if(fs) add(body, h("div",{class:"callout",style:"--c:"+s.c+";--cbg:"+s.bg}, h("h4",{text:(t.status==="FLAKY"?"First attempt failed at step ":"Failed at step ")+fs.n}),
        h("dl",{class:"ea"}, h("dt",{text:"Action"}),h("dd",{text:fs.action}), h("dt",{text:"Expected"}),h("dd",{text:fs.expected}), h("dt",{text:"Actual"}),h("dd",{text:fs.actual}),
          t.category&&CAUSE[t.category]? [h("dt",{text:"Cause"}),h("dd",null,h("b",{text:CAUSE[t.category].label}),t.category_reason?" — "+t.category_reason:"")] : null)));
    }
    if(t.attempts.length){
      var holder=h("div"), tabs=h("div",{class:"attempts",role:"tablist"});
      t.attempts.forEach(function(a,i){ var b=h("button",{class:"chip",type:"button",role:"tab","aria-selected":String(i===t.attempts.length-1),"aria-pressed":String(i===t.attempts.length-1),onclick:function(){ tabs.querySelectorAll(".chip").forEach(function(c){c.setAttribute("aria-pressed","false");c.setAttribute("aria-selected","false")}); b.setAttribute("aria-pressed","true"); b.setAttribute("aria-selected","true"); holder.replaceChildren(stepTable(a,t,shots)); }}, h("span",{style:"color:"+ST[a.status==="PASS"?"PASS":"FAIL"].c+";display:inline-flex"},icon(a.status==="PASS"?"check":"x",12)), "Attempt "+a.n+" · "+(a.status==="PASS"?"passed":a.status==="BLOCKED"?"blocked":"failed")); tabs.appendChild(b); });
      if(t.attempts.length>1) add(body, tabs);
      holder.appendChild(stepTable(t.attempts[t.attempts.length-1],t,shots)); add(body, holder);
    }
    var o=t.observations;
    add(body, h("div",{class:"obs"}, h("div",null,h("h5",{text:"Console errors"}),list(o.console_errors)), h("div",null,h("h5",{text:"Failed network requests"}),list(o.failed_requests)),
      h("div",null,h("h5",{text:"Other observations"}),list(o.other.concat(t.lint_warnings.map(function(w){return "Test file: "+w}))))));
  }
  if(open) fillBody();
  card.appendChild(head); card.appendChild(body);
  return card;
}
function renderTests(){
  var shown=tests.filter(matches);
  testsBox.replaceChildren.apply(testsBox, shown.length? shown.map(testCard) : [h("div",{class:"card empty",text:"No tests match the current filters."})]);
  countLabel.textContent = shown.length===tests.length? plural(tests.length,"test") : shown.length+" of "+plural(tests.length,"test");
}

// ---------- defects
function defects(){
  var box=h("div");
  if(!bugs.length){ box.appendChild(h("div",{class:"card empty",text:"No bug reports in this run."})); return box; }
  bugs.forEach(function(b){ var shots=[];
    box.appendChild(h("article",{class:"card defect"},
      h("div",{class:"defect-head"}, h("span",{style:"color:var(--fail);display:inline-flex"},icon("bug",18)), h("h3",{text:b.title}),
        b.severity? h("span",{class:"sev "+b.severity,text:b.severity}):null,
        b.category&&CAUSE[b.category]? h("span",{class:"tag",text:CAUSE[b.category].label}):null,
        h("a",{class:"tag",href:"#"+b.tc_id,text:b.tc_id,onclick:function(){state.open[b.tc_id]=true;renderTests();}}),
        b.jira? h("a",{class:"jira",href:b.jira.url||"#",target:"_blank",rel:"noopener",text:b.jira.key+" ↗"}) : h("span",{class:"tag",text:"Not in Jira yet"})),
      b.link? h("div",{class:"meta"},"Page ",h("b",{class:"mono",text:b.link})):null,
      h("ol",null,(b.steps||[]).map(function(x){return h("li",{text:x})})),
      h("dl",{class:"ea"}, b.category_reason?[h("dt",{text:"Triage"}),h("dd",{text:b.category_reason})]:null, h("dt",{text:"Expected"}),h("dd",{text:b.expected}), h("dt",{text:"Actual"}),h("dd",{text:b.actual}), b.observations?[h("dt",{text:"Notes"}),h("dd",{class:"muted",text:b.observations})]:null),
      (b.screenshots||[]).length? h("div",{class:"gallery"}, b.screenshots.map(function(p){ return h("figure",null, thumb(p, b.tc_id+" · "+p.split("/").pop(), shots), h("figcaption",{text:p.split("/").pop()})); })) : null));
  });
  return box;
}

// ---------- environment
function environment(){
  var items=[["Run id",run.id,true],["Label",run.label],["Trigger",run.trigger],["Started",when(run.started_at)],["Finished",when(run.finished_at)],["Duration",dur(run.duration_ms)],
    ["Environment",envUrl||"Each test's base_url"],["Branch",run.git&&run.git.branch],["Commit",run.git&&run.git.sha&&run.git.sha.slice(0,10),true],["Headed",run.headed?"yes":"no"],
    ["Node",run.tools&&run.tools.node],["playwright-cli",run.tools&&run.tools["playwright-cli"]],["Claude Code",run.tools&&run.tools["claude-code"]],["Model",run.tools&&run.tools.model]];
  var g=h("dl",{class:"env"});
  items.forEach(function(it){ if(!it[1]) return; g.appendChild(h("div",{class:"card"}, h("dt",{text:it[0]}), h("dd",{class:it[2]?"mono":null,text:it[1]}))); });
  return g;
}

// ---------- CSV
function exportCsv(){
  var rows=[["ID","Title","Priority","Status","Cause","Failed step","Duration (s)","Attempts","File"]];
  tests.forEach(function(t){ rows.push([t.tc_id,t.title,t.priority||"",t.status,t.category||"",t.failed_step||"",t.duration_ms!=null?Math.round(t.duration_ms/1000):"",t.attempts.length,t.file]); });
  var csv=rows.map(function(r){return r.map(function(c){ c=String(c); if(/^[=+\-@]/.test(c)) c="'"+c; return /[",\n]/.test(c)? '"'+c.replace(/"/g,'""')+'"' : c; }).join(",")}).join("\r\n");
  var a=h("a",{href:URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv"})),download:run.id+"-results.csv"}); document.body.appendChild(a); a.click(); a.remove();
}

// ---------- page
function render(){
  var app=document.getElementById("app"); app.replaceChildren();
  testsBox=h("div"); countLabel=h("span",{class:"muted"});
  var charts=[stackedBars("Results by priority","How each priority level fared in this run.", byField(function(t){return [t.priority||"Unset"]},["High","Medium","Low","Unset"]))];
  var tags=byField(function(t){return (t.tags&&t.tags.length)?t.tags:["untagged"]}); if(tags.length>1) charts.push(stackedBars("Results by area (tag)","Top tags by number of tests.", tags));
  var c=causes(); if(c) charts.push(c);
  var tl=timeline(); if(tl) charts.push(tl);
  var main=h("main",{class:"main"},
    h("div",{class:"print-head"},h("b",{text:D.project+" · Test run report"})),
    h("section",{id:"overview",style:"margin-top:0"},
      h("p",{class:"eyebrow",text:"Test run · "+when(run.started_at)}),
      h("h1",{text:run.label.charAt(0).toUpperCase()+run.label.slice(1)+" run"}),
      h("p",{class:"sub"}, envUrl? "Against "+host(envUrl)+" · ":"", plural(T.total,"test")+" · "+dur(run.duration_ms)+(run.git&&run.git.branch?" · branch "+run.git.branch:"")),
      verdictCard(), kpis(), h("div",{class:"grid2"},charts)),
    h("section",{id:"attention"}, h("div",{class:"sec-head"},h("h2",{text:"Needs attention"})), attention()),
    h("section",{id:"tests"}, h("div",{class:"sec-head"},h("h2",{text:"Test cases"}),countLabel), toolbar(), testsBox),
    h("section",{id:"defects"}, h("div",{class:"sec-head"},h("h2",{text:"Defects"}),h("span",{class:"muted",text:bugs.length?"Bug reports from failed tests, with the agent's triage":""})), defects()),
    h("section",{id:"environment"}, h("div",{class:"sec-head"},h("h2",{text:"Run details"})), environment()),
    h("footer",null,"Generated "+when(D.generated_at)+" by the QA agent from "+run.id+". Verdicts come from an AI agent reading page snapshots; screenshots are the evidence."));
  app.appendChild(sidebar()); app.appendChild(main);
  renderTests();
  var id=decodeURIComponent(location.hash.slice(1)); if(id && tests.some(function(t){return t.tc_id===id})){ state.open[id]=true; renderTests(); var el=document.getElementById(id); if(el) el.scrollIntoView(); }
  var links=document.querySelectorAll(".nav a"); var secs=["overview","tests","defects","environment"].map(function(i){return document.getElementById(i)});
  if("IntersectionObserver" in window){ var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ links.forEach(function(l){ l.classList.toggle("on", l.getAttribute("href")==="#"+e.target.id); }); } }); },{rootMargin:"-30% 0px -60% 0px"}); secs.forEach(function(s){ if(s) io.observe(s); }); }
}
window.addEventListener("beforeprint",function(){ tests.forEach(function(t){state.open[t.tc_id]=true}); state.status=null; state.q=""; renderTests(); });
render();
})();
`;
