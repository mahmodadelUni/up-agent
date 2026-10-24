// Renders results/index.html: every run in one page, with a trend chart and a
// per-test stability grid. Links point at each run's own report.html.
import path from "node:path";
import { RUNS, listRuns, readJson } from "./common.mjs";
import { CSS, safeJson } from "./report-html.mjs";

export function renderIndex() {
  const runs = listRuns()
    .map((id) => readJson(path.join(RUNS, id, "run.json"), null))
    .filter((r) => r && r.totals)
    .map((r) => ({
      id: r.id,
      label: r.label,
      trigger: r.trigger,
      branch: r.git?.branch || null,
      sha: r.git?.sha || null,
      started_at: r.started_at,
      duration_ms: r.duration_ms,
      totals: r.totals,
      verdict: r.verdict,
      bugs: (r.bugs || []).length,
      tests: (r.tests || []).map((t) => [t.tc_id, t.status, t.title]),
    }))
    .reverse(); // newest first
  const project = process.env.QA_PROJECT_NAME || "QA Agent";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${project.replace(/[<&>"]/g, "")} — run history</title>
<style>${CSS}${INDEX_CSS}</style>
</head>
<body>
<div id="app"></div>
<div id="tip" class="tip" role="tooltip" hidden></div>
<script type="application/json" id="runs">${safeJson({ project, runs })}</script>
<script>${INDEX_JS}</script>
</body>
</html>
`;
}

const INDEX_CSS = String.raw`
.wrap{max-width:1240px;margin:0 auto;padding:28px clamp(16px,3vw,40px) 60px}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}
table.runs{width:100%;border-collapse:collapse;font-size:13px;min-width:860px}
.runs th{text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:650;padding:9px 12px;background:var(--panel-2);border-bottom:1px solid var(--border)}
.runs td{padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:middle;font-variant-numeric:tabular-nums}
.runs tr:hover td{background:var(--panel-2)}
.runs a.open{font-weight:600;text-decoration:none}
.mini{display:flex;height:8px;width:120px;border-radius:4px;overflow:hidden;background:var(--panel-2);gap:2px}
.mini i{display:block;height:100%}
.matrix{border-collapse:separate;border-spacing:3px;font-size:12px}
.matrix th{font-weight:500;color:var(--muted);text-align:left;padding:0 8px 0 0;white-space:nowrap}
.matrix th.col{writing-mode:vertical-rl;transform:rotate(180deg);height:92px;padding:0;font-size:10.5px;text-align:left}
.cellx{width:22px;height:22px;border-radius:5px;display:grid;place-items:center;color:#fff}
.cellx.none{background:var(--panel-2);color:var(--faint)}
.cellx svg{width:12px;height:12px}
.cellx.BLOCKED{color:#2a1f00}
.rate{font-weight:700}
.wrap .chart svg{max-width:none}
`;

const INDEX_JS = String.raw`
(function(){
var D=JSON.parse(document.getElementById("runs").textContent), runs=D.runs;
var ST={"PASS":{l:"Passed",c:"var(--pass)",bg:"var(--pass-bg)",i:"check"},"FAIL":{l:"Failed",c:"var(--fail)",bg:"var(--fail-bg)",i:"x"},"FLAKY":{l:"Flaky",c:"var(--flaky)",bg:"var(--flaky-bg)",i:"retry"},"BLOCKED":{l:"Blocked",c:"var(--blocked)",bg:"var(--blocked-bg)",i:"alert"},"NOT RUN":{l:"Not run",c:"var(--notrun)",bg:"var(--notrun-bg)",i:"minus"}};
var ORDER=["PASS","FAIL","FLAKY","BLOCKED","NOT RUN"];
var IC={check:'<path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',x:'<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',retry:'<path d="M12.5 6A5 5 0 1 0 13 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M13 2.5V6H9.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',alert:'<path d="M8 2.2L14.2 13H1.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 6.3v3.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',minus:'<path d="M4 8h8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'};
function icon(n,s){ var e=document.createElementNS("http://www.w3.org/2000/svg","svg"); e.setAttribute("viewBox","0 0 16 16"); e.setAttribute("width",s||12); e.setAttribute("height",s||12); e.setAttribute("aria-hidden","true"); e.innerHTML=IC[n]; return e; }
function h(tag,a){ var el=document.createElement(tag); a=a||{}; for(var k in a){ var v=a[k]; if(v==null) continue; if(k==="class") el.className=v; else if(k==="text") el.textContent=v; else if(k==="style") el.setAttribute("style",v); else if(k.slice(0,2)==="on") el.addEventListener(k.slice(2),v); else el.setAttribute(k,v); } for(var i=2;i<arguments.length;i++) add(el,arguments[i]); return el; }
function add(el,c){ if(c==null||c===false) return; if(Array.isArray(c)) c.forEach(function(x){add(el,x)}); else el.appendChild(typeof c==="object"?c:document.createTextNode(String(c))); }
function svg(t,a){ var e=document.createElementNS("http://www.w3.org/2000/svg",t); for(var k in a) e.setAttribute(k,a[k]); return e; }
function dur(ms){ if(ms==null) return "–"; var s=Math.round(ms/1000); if(s<60) return s+"s"; var m=Math.floor(s/60); return m<60? m+"m "+(s%60)+"s" : Math.floor(m/60)+"h "+(m%60)+"m"; }
function when(iso){ var d=new Date(iso); return isNaN(d)? (iso||"–") : d.toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}); }
function vkey(v){ return v==="PASSED"?"PASS": v==="PASSED WITH FLAKY TESTS"?"FLAKY": v==="NO TESTS"?"NOT RUN":"FAIL"; }
function pill(k,text){ var s=ST[k]; return h("span",{class:"pill",style:"--c:"+s.c+";--cbg:"+s.bg},h("span",{style:"color:"+s.c+";display:inline-flex"},icon(s.i,12)),text||s.l); }
var tip=document.getElementById("tip");
function tipOn(el,text){ el.addEventListener("mousemove",function(e){ tip.textContent=text; tip.hidden=false; var x=e.clientX+14,y=e.clientY+14,r=tip.getBoundingClientRect(); if(x+r.width>innerWidth-8) x=e.clientX-r.width-14; tip.style.left=x+"px"; tip.style.top=y+"px"; }); el.addEventListener("mouseleave",function(){tip.hidden=true}); el.setAttribute("aria-label",text); return el; }
try{ var th=localStorage.getItem("qa-report-theme"); if(th) document.documentElement.setAttribute("data-theme",th); }catch(e){}

function trend(){
  var list=runs.slice(0,30).reverse(); if(!list.length) return null;
  var W=900,H=220,pl=34,pr=12,pt=10,pb=26,max=Math.max.apply(null,list.map(function(r){return r.totals.total}).concat([1]));
  var bw=Math.min((W-pl-pr)/list.length,70), s=svg("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Results of the last "+list.length+" runs"});
  var stepv=Math.max(1,Math.ceil(max/4)); for(var v=0;v<=max;v+=stepv){ var y=H-pb-(H-pt-pb)*v/max; s.appendChild(svg("line",{x1:pl,x2:W-pr,y1:y,y2:y,class:"gridline"})); var t=svg("text",{x:pl-6,y:y+4,"text-anchor":"end"}); t.setAttribute("fill","var(--muted)"); t.setAttribute("font-size","11"); t.textContent=v; s.appendChild(t); }
  list.forEach(function(r,i){ var x=pl+i*bw+bw*0.18, w=Math.max(bw*0.64,3), y=H-pb;
    ORDER.forEach(function(k){ var n=r.totals[k]||0; if(!n) return; var hgt=(H-pt-pb)*n/max; y-=hgt; var rc=svg("rect",{x:x,y:y+1,width:w,height:Math.max(hgt-2,1),rx:3,fill:ST[k].c,class:"mark"}); tipOn(rc, when(r.started_at)+" · "+r.label+" · "+ST[k].l+": "+n+" · pass rate "+r.totals.pass_rate+"%"); s.appendChild(rc); });
    if(list.length<=16 || i%Math.ceil(list.length/12)===0){ var lt=svg("text",{x:x+w/2,y:H-8,"text-anchor":"middle"}); lt.setAttribute("fill","var(--muted)"); lt.setAttribute("font-size","10.5"); var d=new Date(r.started_at); lt.textContent=isNaN(d)?"":(d.getMonth()+1)+"/"+d.getDate(); s.appendChild(lt); }
  });
  var lg=h("div",{class:"mini-legend"}); ORDER.forEach(function(k){ lg.appendChild(h("span",null,h("i",{class:"sw",style:"--c:"+ST[k].c}),ST[k].l)); });
  return h("div",{class:"card chart"}, h("h3",{text:"Results per run"}), h("p",{class:"cap",text:"The last "+list.length+" runs, oldest on the left. Hover a bar for details."}), s, lg);
}
function matrix(){
  var cols=runs.slice(0,20).reverse(); if(!cols.length) return null;
  var tests={}; cols.forEach(function(r){ r.tests.forEach(function(t){ tests[t[0]]=t[2]; }); });
  var ids=Object.keys(tests).sort();
  var thead=h("tr",null,h("th"),cols.map(function(r){ return h("th",{class:"col",text:when(r.started_at)}); }), h("th",{text:"Stability"}));
  var body=ids.map(function(id){
    var seen=0, pass=0;
    var cells=cols.map(function(r){ var t=r.tests.find(function(x){return x[0]===id}); if(!t) return h("td",null,h("span",{class:"cellx none",text:"·"}));
      seen++; if(t[1]==="PASS") pass++; var s=ST[t[1]]||ST["NOT RUN"];
      return h("td",null, tipOn(h("a",{class:"cellx "+t[1].replace(" ","-"),style:"background:"+s.c,href:"runs/"+encodeURIComponent(r.id)+"/report.html#"+encodeURIComponent(id)},icon(s.i,12)), id+" · "+s.l+" · "+when(r.started_at))); });
    return h("tr",null, h("th",null,h("span",{class:"mono",text:id+" "}),h("span",{class:"muted",text:tests[id].length>34?tests[id].slice(0,33)+"…":tests[id]})), cells, h("td",{class:"rate",text:seen? Math.round(100*pass/seen)+"%":"–"}));
  });
  return h("div",{class:"card chart"}, h("h3",{text:"Test stability"}), h("p",{class:"cap",text:"Each cell is one test in one run. A test that flips between colours is unstable. Click a cell to open that result."}),
    h("div",{style:"overflow-x:auto"}, h("table",{class:"matrix"}, h("thead",null,thead), h("tbody",null,body))));
}
function table(){
  var tb=h("tbody");
  runs.forEach(function(r){ var T=r.totals;
    var bar=h("span",{class:"mini"}); ORDER.forEach(function(k){ if(T[k]) bar.appendChild(h("i",{style:"background:"+ST[k].c+";flex:"+T[k]})); });
    tb.appendChild(h("tr",null,
      h("td",null,h("a",{class:"open",href:"runs/"+encodeURIComponent(r.id)+"/report.html",text:when(r.started_at)}),h("div",{class:"mono muted",style:"font-size:11px",text:r.id})),
      h("td",{text:r.label}), h("td",{text:r.trigger+(r.branch?" · "+r.branch:"")}),
      h("td",null,pill(vkey(r.verdict), r.verdict.charAt(0)+r.verdict.slice(1).toLowerCase())),
      h("td",null,tipOn(bar, T.PASS+" passed, "+T.FAIL+" failed, "+T.FLAKY+" flaky, "+T.BLOCKED+" blocked, "+T["NOT RUN"]+" not run")),
      h("td",{text:(T.PASS+T.FLAKY)+"/"+T.total+" ("+T.pass_rate+"%)"+(T.FLAKY?" incl. "+T.FLAKY+" flaky":"")}), h("td",{text:r.bugs}), h("td",{text:dur(r.duration_ms)}),
      h("td",null,h("a",{href:"runs/"+encodeURIComponent(r.id)+"/SUMMARY.md",text:"summary"}))));
  });
  return h("div",{class:"card",style:"overflow-x:auto"}, h("table",{class:"runs"}, h("thead",null,h("tr",null,["Run","Label","Trigger","Verdict","Results","Passed","Defects","Duration",""].map(function(x){return h("th",{text:x})}))), tb));
}
var last=runs[0], recent=runs.slice(0,10), avg=recent.length? Math.round(recent.reduce(function(a,r){return a+r.totals.pass_rate},0)/recent.length):0;
var app=document.getElementById("app");
add(app, h("div",{class:"wrap"},
  h("div",{class:"top"}, h("div",null, h("p",{class:"eyebrow",text:D.project}), h("h1",{text:"Run history"}), h("p",{class:"sub",text:runs.length+" run"+(runs.length===1?"":"s")+" recorded in results/runs/"})),
    h("button",{class:"btn",type:"button",onclick:function(){ var dark=(document.documentElement.getAttribute("data-theme")|| (matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"))==="dark"; document.documentElement.setAttribute("data-theme",dark?"light":"dark"); try{localStorage.setItem("qa-report-theme",dark?"light":"dark")}catch(e){} }},"Light / dark")),
  runs.length? [
    h("div",{class:"kpis"},
      h("div",{class:"card kpi"},h("div",{class:"n",text:runs.length}),h("div",{class:"l",text:"Runs"})),
      h("div",{class:"card kpi",style:"--c:"+ST[vkey(last.verdict)].c},h("div",{class:"n",style:"font-size:17px;padding:5px 0 4px",text:last.verdict}),h("div",{class:"l",text:"Latest verdict"})),
      h("div",{class:"card kpi"},h("div",{class:"n",text:last.totals.pass_rate+"%"}),h("div",{class:"l",text:"Latest pass rate"})),
      h("div",{class:"card kpi"},h("div",{class:"n",text:avg+"%"}),h("div",{class:"l",text:"Avg pass rate, last "+recent.length})),
      h("div",{class:"card kpi"},h("div",{class:"n",text:runs.reduce(function(a,r){return a+r.bugs},0)}),h("div",{class:"l",text:"Defects reported"}))),
    h("div",{style:"margin-top:12px"},trend()), h("div",{style:"margin-top:12px"},matrix()),
    h("section",null,h("div",{class:"sec-head"},h("h2",{text:"All runs"})), table())
  ] : h("div",{class:"card empty",text:"No runs yet. Run /run-suite tests/ to create the first one."})));
})();
`;
