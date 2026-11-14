/* =========================================================
   PI 분석 뷰어 — 공통 스크립트
   - 폴더에서 md 파일 읽기(한 번 선택하면 브라우저에 기억)
   - md 파싱(산출물 01~05, SKILL.md)
   - 상단 바·단계 바·오른쪽 상세 패널
   페이지별 시각화는 overview.js, step1.js ~ step5.js에서
   PI.view 를 정하고 PI.start()를 부른다.
   ========================================================= */
(function(){
'use strict';
const PI = window.PI = {};

/* ---------- 1. 파일 로딩 ---------- */
const CACHE_KEY = 'pi-viewer-files-v1';
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function wanted(path){
  const p = path.replace(/\\/g,'/');
  const base = p.split('/').pop();
  if(/\/\.git\//.test('/'+p)) return false;
  if(/^SKILL\.md$/i.test(base)) return true;
  return /^0[1-9]_.+\.md$/i.test(base);
}
async function readFileList(list){
  const out = {};
  for(const f of list){
    const path = f.webkitRelativePath || f._path || f.name;
    if(!wanted(path)) continue;
    out[path] = await f.text();
  }
  return out;
}
function walkEntry(entry, prefix, acc){
  return new Promise(resolve => {
    if(entry.isFile){
      entry.file(f => { f._path = prefix + f.name; acc.push(f); resolve(); }, () => resolve());
    } else if(entry.isDirectory){
      if(entry.name === '.git' || entry.name === 'node_modules'){ resolve(); return; }
      const r = entry.createReader(); const all = [];
      const readAll = () => r.readEntries(async ents => {
        if(!ents.length){ for(const e of all) await walkEntry(e, prefix + entry.name + '/', acc); resolve(); }
        else { all.push(...ents); readAll(); }
      }, () => resolve());
      readAll();
    } else resolve();
  });
}
function saveCache(files, at){
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({at, files})); } catch(e){}
}
function loadCache(){
  try { const v = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); return v && v.files ? v : null; } catch(e){ return null; }
}

/* ---------- 2. 마크다운 ---------- */
function inline(s){
  let t = esc(s);
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span style="text-decoration:underline dotted">$1</span>');
  return t;
}
function splitRow(line){
  let s = line.trim(); if(s.startsWith('|')) s = s.slice(1); if(s.endsWith('|')) s = s.slice(0,-1);
  return s.split('|').map(c => c.trim());
}
function isSep(line){ return /^\s*\|?\s*:?-{2,}/.test(line) && /^[\s|:\-]+$/.test(line); }

function md(src){
  const L = String(src || '').replace(/\r/g,'').split('\n');
  let i = 0, h = '';
  const listRe = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
  while(i < L.length){
    const line = L[i];
    if(/^\s*```/.test(line)){
      const buf = []; i++;
      while(i < L.length && !/^\s*```/.test(L[i])) buf.push(L[i++]);
      i++; h += '<pre><code>' + esc(buf.join('\n')) + '</code></pre>'; continue;
    }
    if(/^\s*\|/.test(line) && i+1 < L.length && isSep(L[i+1])){
      const head = splitRow(line); i += 2; const rows = [];
      while(i < L.length && /^\s*\|/.test(L[i])) rows.push(splitRow(L[i++]));
      h += '<div class="tw"><table><thead><tr>' + head.map(c=>'<th>'+inline(c)+'</th>').join('') + '</tr></thead><tbody>' +
        rows.map(r=>'<tr>'+r.map(c=>'<td>'+inline(c)+'</td>').join('')+'</tr>').join('') + '</tbody></table></div>';
      continue;
    }
    const hm = line.match(/^(#{1,4})\s+(.*)$/);
    if(hm){ h += `<h${hm[1].length}>${inline(hm[2])}</h${hm[1].length}>`; i++; continue; }
    if(/^\s*>/.test(line)){
      const buf = [];
      while(i < L.length && /^\s*>/.test(L[i])) buf.push(L[i++].replace(/^\s*>\s?/,''));
      h += '<blockquote>' + md(buf.join('\n')) + '</blockquote>'; continue;
    }
    if(listRe.test(line)){
      const items = [];
      while(i < L.length){
        const m = L[i].match(listRe);
        if(m){ items.push({ind:m[1].length, ord:/\d/.test(m[2]), text:m[3]}); i++; }
        else if(/^\s{2,}\S/.test(L[i]) && items.length){ items[items.length-1].text += ' ' + L[i].trim(); i++; }
        else break;
      }
      h += renderList(items); continue;
    }
    if(!line.trim()){ i++; continue; }
    const buf = [];
    while(i < L.length && L[i].trim() && !/^(#{1,4}\s|\s*```|\s*>|\s*\|)/.test(L[i]) && !listRe.test(L[i])) buf.push(L[i++]);
    h += '<p>' + inline(buf.join(' ')) + '</p>';
  }
  return h;
}
function renderList(items){
  let pos = 0;
  function build(ind){
    const ord = items[pos].ord; let h = ord ? '<ol>' : '<ul>';
    while(pos < items.length && items[pos].ind >= ind){
      if(items[pos].ind > ind){ h = h.replace(/<\/li>$/, '') + build(items[pos].ind) + '</li>'; continue; }
      h += '<li>' + inline(items[pos].text) + '</li>'; pos++;
    }
    return h + (ord ? '</ol>' : '</ul>');
  }
  let h = '';
  while(pos < items.length) h += build(items[pos].ind);
  return h;
}

/* ---------- 3. 구조 파싱 유틸 ---------- */
function parseFM(text){
  const t = text.replace(/\r/g,'');
  const m = t.match(/^---\n([\s\S]*?)\n---\n?/);
  const fm = {};
  if(m) m[1].split('\n').forEach(l => { const k = l.match(/^([\w-]+)\s*:\s*(.*)$/); if(k) fm[k[1]] = k[2].replace(/^["']|["']$/g,''); });
  return {fm, body: m ? t.slice(m[0].length) : t};
}
function sectionsOf(body, level){
  const mark = '#'.repeat(level) + ' ';
  const out = []; let cur = {title:'', body:[]}; let inFence = false;
  body.split('\n').forEach(l => {
    if(/^\s*```/.test(l)) inFence = !inFence;
    if(!inFence && l.startsWith(mark)){ out.push(cur); cur = {title:l.slice(mark.length).trim(), body:[]}; }
    else cur.body.push(l);
  });
  out.push(cur);
  return out.map(s => ({title:s.title, body:s.body.join('\n')}));
}
function sec(doc, kw){ return doc.sections.find(s => s.title.includes(kw)); }
function tables(text){
  const L = String(text||'').split('\n'), out = [];
  for(let i=0;i<L.length;i++){
    if(/^\s*\|/.test(L[i]) && i+1 < L.length && isSep(L[i+1])){
      const head = splitRow(L[i]); i += 2; const rows = [];
      while(i < L.length && /^\s*\|/.test(L[i])) rows.push(splitRow(L[i++]));
      out.push({head, rows});
    }
  }
  return out;
}
function col(head, ...kws){
  for(const k of kws){ const i = head.findIndex(h => h.replace(/\s/g,'') === k.replace(/\s/g,'')); if(i>=0) return i; }
  for(const k of kws){ const i = head.findIndex(h => h.includes(k)); if(i>=0) return i; }
  return -1;
}
/* "- 키: 값" 불릿과 하위 불릿 */
function bullets(text){
  const out = []; let last = null;
  String(text||'').split('\n').forEach(l => {
    const top = l.match(/^- (.+)$/), sub = l.match(/^\s{2,}- (.+)$/);
    if(top){
      const kv = top[1].match(/^([^:：]{1,24})[:：]\s*(.*)$/);
      last = kv ? {k:kv[1].trim(), v:kv[2].trim(), sub:[]} : {k:'', v:top[1].trim(), sub:[]};
      out.push(last);
    } else if(sub && last){ last.sub.push(sub[1].trim()); }
  });
  return out;
}
const bget = (bs, kw) => (bs || []).find(b => b.k.includes(kw));
const clip = (s, n) => { s = String(s || '').replace(/\*\*/g,''); return s.length > n ? s.slice(0, n).trim() + '…' : s; };
const ids = (s, re) => [...new Set((String(s||'').match(re) || []))];
const RE_ACT = /T\d+-A\d+/g, RE_ISS = /\bI\d+\b/g;

/* ---------- 4. 산출물별 파서 ---------- */
function parseDoc(text){
  const {fm, body} = parseFM(text);
  return {fm, body, sections: sectionsOf(body, 2), h1: (body.match(/^# (.+)$/m) || [])[1] || '', raw:text};
}

function p01(doc){
  const s = sec(doc, '구조') || {body:''};
  const tasks = [];
  sectionsOf(s.body, 3).forEach(t => {
    const m = t.title.match(/^(T\d+)\.\s*(.+)$/); if(!m) return;
    const task = {id:m[1], name:m[2], actions:[]};
    t.body.split('\n').forEach(l => {
      const a = l.match(/^- (T\d+-A\d+)\.\s*(.+)$/); if(!a) return;
      task.actions.push(parseAction(a[1], a[2], task));
    });
    tasks.push(task);
  });
  const flowSec = sec(doc, '흐름'), flow = flowSec ? flowSec.body : '';
  const seqLine = (flow.match(/기본 순서[:：]\s*(.+)/) || [])[1] || '';
  const fb = bullets(flow), loops = [];
  const lb = bget(fb, '분기');
  if(lb) (lb.sub.length ? lb.sub : [lb.v]).forEach(x => {
    const after = x.split('→')[1] || '';
    loops.push({from:(x.match(/T\d+/)||[])[0], to:(after.match(/T\d+/g)||[]), text:x});
  });
  const par = bget(fb, '병렬'), links = bget(fb, '연결');
  return {
    tasks, actions: tasks.flatMap(t => t.actions),
    overview: (sec(doc,'개요')||{}).body || '',
    seq: ids(seqLine, /T\d+/g), loops, parallel: par ? par.v : '', links: links ? links.sub : [],
    open: bullets((sec(doc,'열린 사항')||{}).body).map(b => (b.k ? b.k + ': ' : '') + b.v)
  };
}
function parseAction(id, rest, task){
  const a = {id, task:task.id, taskName:task.name, name:rest, star:false, does:'', out:'', tool:'', who:'', whoType:'self'};
  const m = rest.match(/^(.*?)(\*?)\s+—\s+(.*)$/);
  if(!m) return a;
  a.name = m[1].trim(); a.star = !!m[2]; let tail = m[3];
  const meta = tail.match(/\(([^()]*)\)\s*$/);
  if(meta){
    tail = tail.slice(0, meta.index).trim();
    const k = meta[1].lastIndexOf(' / ');
    a.tool = k >= 0 ? meta[1].slice(0,k).trim() : meta[1]; a.who = k >= 0 ? meta[1].slice(k+3).trim() : '';
  }
  const j = tail.lastIndexOf('→');
  a.does = j >= 0 ? tail.slice(0,j).trim() : tail; a.out = j >= 0 ? tail.slice(j+1).trim() : '';
  a.whoType = /^요청/.test(a.who) ? 'req' : /^협의/.test(a.who) ? 'co' : 'self';
  return a;
}

function p02(doc){
  const hs = sec(doc, 'Task별'); const ht = hs ? tables(hs.body)[0] : null;
  /* 점수 척도: 예전 형식은 0~3, 새 형식은 0~100. 표 안 최댓값으로 판단 */
  const heat = ht ? {areas: ht.head.slice(1, -1), totalLabel: ht.head[ht.head.length-1], rows: ht.rows.map(r => ({task:r[0], id:(r[0].match(/T\d+/)||[])[0], vals:r.slice(1,-1).map(Number), total:Number(r[r.length-1])}))} : null;
  if(heat) heat.scale = Math.max(0, ...heat.rows.flatMap(r => r.vals.filter(v => !isNaN(v)))) > 3 ? 100 : 3;
  const ls = sec(doc, 'Issue List'); const it = ls ? tables(ls.body)[0] : null;
  const issues = [];
  if(it){
    const H = it.head, c = {id:col(H,'ID'), t:col(H,'Issue 가설','Issue'), act:col(H,'관련 Action'), area:col(H,'영역'), hard:col(H,'예상 어려움'), opp:col(H,'개선 기회'),
      imp:col(H,'영향도'), sig:col(H,'신호'), fix:col(H,'개선'), score:col(H,'점수'), grade:col(H,'등급'), conf:col(H,'확신도')};
    it.rows.forEach(r => issues.push({id:r[c.id], title:r[c.t], acts:ids(r[c.act], RE_ACT), area:r[c.area], hard:r[c.hard], opp:r[c.opp],
      imp:+r[c.imp], sig:+r[c.sig], fix:+r[c.fix], score:+r[c.score], grade:r[c.grade], conf:r[c.conf]}));
  }
  const ds = sec(doc, 'Issue 상세');
  if(ds) sectionsOf(ds.body, 3).forEach(s => {
    const m = s.title.match(/^(I\d+)\.\s*(.+)$/); if(!m) return;
    const is = issues.find(x => x.id === m[1]); if(is){ is.detail = bullets(s.body); is.longTitle = m[2]; }
  });
  const as = sec(doc, 'Action별'); const at = as ? tables(as.body)[0] : null;
  const actDiag = {};
  /* Action별 진단표: 헤더 이름으로 열을 찾음.
     새 형식 = 6개 영역 점수(0~100) + 종합 + AI 진단 + 관련 Issue / 예전 형식 = AI 진단·예상 어려움·개선 기회·관련 Issue */
  const areaCols = [];
  if(at){
    const H = at.head, c = {diag:col(H,'AI 진단'), hard:col(H,'예상 어려움'), opp:col(H,'개선 기회'), iss:col(H,'관련 Issue'), total:col(H,'종합')};
    const areaNames = heat ? heat.areas : ['반복성','병목','중복','복잡성','판단 어려움','지식 의존성'];
    areaNames.forEach(a => { const i = H.findIndex(h => h.replace(/\s/g,'') === a.replace(/\s/g,'')); if(i >= 0) areaCols.push({name:a, i}); });
    at.rows.forEach(r => {
      const id = (r[0].match(RE_ACT)||[])[0]; if(!id) return;
      actDiag[id] = {
        diag: c.diag >= 0 ? r[c.diag] : '', hard: c.hard >= 0 ? r[c.hard] : '', opp: c.opp >= 0 ? r[c.opp] : '',
        iss: c.iss >= 0 ? ids(r[c.iss], RE_ISS) : [],
        scores: areaCols.length ? areaCols.map(a => Number(r[a.i]) || 0) : null,
        total: c.total >= 0 ? Number(r[c.total]) : null
      };
    });
  }
  const act2iss = {};
  issues.forEach(is => is.acts.forEach(a => (act2iss[a] = act2iss[a] || []).push(is.id)));
  Object.entries(actDiag).forEach(([a,d]) => d.iss.forEach(i => { act2iss[a] = act2iss[a] || []; if(!act2iss[a].includes(i)) act2iss[a].push(i); }));
  return {
    insight: (sec(doc,'종합 인사이트')||{}).body || '', structure: (sec(doc,'구조 요약')||{}).body || '',
    heat, issues, actDiag, act2iss, areaNames: areaCols.map(a => a.name), hasActScores: areaCols.length > 0,
    actNote: as ? as.body.split('\n').filter(l => l.trim() && !/^\s*\|/.test(l)).join('\n') : '',
    limits: (sec(doc,'한계')||{}).body || '', next: (sec(doc,'다음 단계')||{}).body || ''
  };
}

function p03(doc){
  const s = sec(doc, 'Target Problem') || doc.sections.find(x => /^1\./.test(x.title)) || {body:''};
  const statement = (s.body.match(/\*\*(.+?)\*\*/) || [])[1] || '';
  const cs = sec(doc, '후보 비교'); const ct = cs ? tables(cs.body)[0] : null;
  const cands = [];
  if(ct){
    const H = ct.head, c = {id:col(H,'ID'), p:col(H,'문제'), src:col(H,'출처'), imp:col(H,'영향도'), bur:col(H,'체감 부담'), sol:col(H,'해결 가능성'), score:col(H,'점수'), res:col(H,'결과')};
    ct.rows.forEach(r => cands.push({id:r[c.id], text:r[c.p], src:r[c.src], imp:r[c.imp], bur:r[c.bur], sol:r[c.sol], score:r[c.score], res:r[c.res]}));
  }
  const note = cs ? cs.body.split('\n').filter(l => l.trim() && !/^\s*\|/.test(l)).join('\n') : '';
  return {statement, attrs: bullets(s.body), cands, note, memo:(sec(doc,'후보별 메모')||{}).body || '', open:(sec(doc,'열린 사항')||{}).body || ''};
}

function p04(doc){
  const bs = sec(doc, 'Problem Definition Brief') || doc.sections.find(x => /^1\./.test(x.title));
  const brief = {};
  if(bs){ const t = tables(bs.body)[0]; if(t) t.rows.forEach(r => brief[r[0]] = r[1]); }
  const ms = sec(doc, 'Root Cause Map');
  const code = ms ? ((ms.body.match(/```[^\n]*\n([\s\S]*?)```/) || [])[1] || '') : '';
  const hs = sec(doc, '가설 검증'); const htab = hs ? tables(hs.body)[0] : null;
  const hyps = {};
  if(htab){
    const H = htab.head, c = {id:col(H,'ID'), t:col(H,'원인 가설'), cat:col(H,'범주'), src:col(H,'출처'), ev:col(H,'확인한 근거'), cx:col(H,'반례'), vd:col(H,'판정'), st:col(H,'근거 강도')};
    htab.rows.forEach(r => hyps[r[c.id]] = {id:r[c.id], text:r[c.t], cat:r[c.cat], src:r[c.src], ev:r[c.ev], cx:r[c.cx], vd:r[c.vd], st:r[c.st]});
  }
  const rs = sec(doc, 'Root Cause 상세'); const rcs = {};
  if(rs) sectionsOf(rs.body, 3).forEach(s => { const m = s.title.match(/^(RC\d+)\.\s*(.+)$/); if(m) rcs[m[1]] = {id:m[1], title:m[2], b:bullets(s.body)}; });
  const ss = sec(doc, '성공 기준'); const stab = ss ? tables(ss.body)[0] : null;
  const crit = stab ? stab.rows.map(r => ({type:r[0], metric:r[1], now:r[2], goal:r[3], how:r[4]})) : [];
  return {brief, tree: parseTree(code), treeRaw:code, hyps, rcs, crit, open:(sec(doc,'열린 사항')||{}).body || '', next:(sec(doc,'다음 단계')||{}).body || ''};
}
/* 05 Verified Execution Knowledge */
const RE_KREC = /\b[KREFC]\d+\b/g;
/* "R1~R6, E1" → ['R1',...,'R6','E1'] */
function expandIds(s){
  const out = [];
  String(s||'').replace(/\b([KREFC])(\d+)\s*~\s*(?:\1)?(\d+)\b|\b([KREFC])(\d+)\b/g, (m, p, a, b, q, c) => {
    if(p){ for(let i = +a; i <= +b; i++) out.push(p + i); } else out.push(q + c); return m;
  });
  return [...new Set(out)];
}
function p05(doc){
  const tab = kw => { const s = sec(doc, kw); return s ? tables(s.body) : []; };
  const summary = {}; (tab('요약')[0] || {rows:[]}).rows.forEach(r => summary[r[0]] = r[1]);
  const acts = [];
  const as = sec(doc, 'Action별 수행 지식');
  if(as) sectionsOf(as.body, 3).forEach(x => {
    const m = x.title.match(/^(T\d+-A\d+)\.\s*(.+?)(?:\s*\(([^)]*)\))?$/); if(!m) return;
    const el = {}; const t = tables(x.body)[0];
    if(t) t.rows.forEach(r => el[r[0]] = {v:r[1] || '', st:r[2] || ''});
    const dm = x.body.match(/\*\*수행 설명\*\*\s*(\([^)]*\))?\s*\n([\s\S]*)$/);
    acts.push({id:m[1], name:m[2], kind:m[3] || '', el, descNote:dm && dm[1] ? dm[1].replace(/[()]/g,'') : '', desc:dm ? dm[2].trim() : ''});
  });
  const rowsBy = (t, map) => t ? t.rows.map(r => { const o = {}; Object.entries(map).forEach(([k, kws]) => { const i = col(t.head, ...kws); o[k] = i >= 0 ? (r[i] || '') : ''; }); return o; }) : [];
  const know = rowsBy(tab('Knowledge Map')[0], {id:['ID'], text:['지식'], kind:['종류'], where:['어디에'], doc:['문서화'], cycle:['변경 주기'], use:['쓰이는 곳']});
  const dt = tab('Decision Map');
  const rules = rowsBy(dt[0], {id:['ID'], cond:['조건'], res:['결과'], know:['쓰는 지식'], cs:['근거 사례'], st:['상태']});
  const excs = rowsBy(dt[1], {id:['ID'], sit:['상황'], how:['처리'], cs:['근거 사례'], st:['상태']});
  const ds = sec(doc, 'Decision Map') || {body:''};
  const prio = (ds.body.match(/우선순위[:：]\s*(.+)/) || [])[1] || '';
  const terms = (ds.body.match(/용어 정의[:：]\s*(.+)/) || [])[1] || '';
  const cases = [];
  const ts = sec(doc, 'Execution Trace');
  if(ts) sectionsOf(ts.body, 3).forEach(x => { const m = x.title.match(/^(C\d+)\.\s*(.+)$/); if(m) cases.push({id:m[1], title:m[2], b:bullets(x.body)}); });
  const tests = rowsBy(tab('검증 기록')[0], {cs:['사례'], type:['유형'], input:['상황'], pred:['AI 예측'], real:['실제 결과'], ok:['일치'], fix:['보완']}).filter(t => t.cs && t.cs !== '-');
  return {summary, acts, know, rules, excs, prio, terms, cases, tests,
    open:(sec(doc,'열린 사항')||{}).body || '', next:(sec(doc,'다음 단계')||{}).body || '', nextTitle:((sec(doc,'다음 단계')||{}).title || '').replace(/^\d+\.\s*/,'')};
}
/* 상태 표시: 확인 / 문서 / * 추정 */
function st5(s){
  s = String(s || ''); const g = /\*/.test(s), ok = /확인/.test(s), d = /문서/.test(s);
  if(!s.trim()) return '';
  if(g && (ok || d)) return 'part';
  if(g) return 'guess';
  if(ok) return 'ok';
  if(d) return 'doc';
  return '';
}
function parseTree(code){
  const root = {text:'', kids:[], root:true};
  const stack = [{depth:-1, node:root}];
  String(code).split('\n').forEach(line => {
    if(/^\s*\[문제\]/.test(line)){ root.text = line.replace(/^\s*\[문제\]\s*/,''); return; }
    const m = line.match(/^([│\s]*)[├└]─+\s*(.*)$/); if(!m) return;
    const depth = Math.round(m[1].replace(/\t/g,'    ').length / 4);
    let body = m[2];
    const n = {kids:[]};
    const idm = body.match(/^([^\s.]+)\.\s*/); if(idm){ n.id = idm[1]; body = body.slice(idm[0].length); }
    const parts = body.split(/\s+—\s+/); n.text = parts[0]; const tail = parts.slice(1).join(' — ');
    n.vd = (tail.match(/부분 지지|지지|기각|미검증/) || [''])[0];
    n.st = (tail.match(/근거\s*(상|중|하)/) || [,''])[1];
    n.rc = (tail.match(/★\s*(RC\d+)/) || [,''])[1];
    n.cons = /\[제약\]/.test(tail);
    while(stack[stack.length-1].depth >= depth) stack.pop();
    stack[stack.length-1].node.kids.push(n);
    stack.push({depth, node:n});
  });
  return root;
}
function parseSkill(text){
  const doc = parseDoc(text);
  const nav = [];
  doc.sections.forEach((s, i) => {
    if(!s.title) return;
    const parts = sectionsOf(s.body, 3), subs = parts.filter(x => x.title);
    nav.push({title:s.title, body: subs.length ? parts[0].body : s.body, full:s.body, depth:0, key:'s'+i});
    if(/진행 단계/.test(s.title)) subs.forEach((x, j) => nav.push({title:x.title, body:x.body, depth:1, key:'s'+i+'_'+j}));
  });
  return {fm:doc.fm, title:doc.h1, nav};
}

/* ---------- 5. 상태 ---------- */
/* 전체 페이지(skill-guide.html)는 저장소 최상위에, 단계 페이지는 docs/ 에 있다. 최상위 페이지는 data-base="docs/" 를 준다. */
const BASE = document.body.dataset.base || '';
const HOME = BASE ? 'skill-guide.html' : '../skill-guide.html';
const STAGES = [
  {id:'00', page:HOME, label:'전체', name:'한눈에 보기', ac:'--s0'},
  {id:'01', page:BASE + 'step1.html', label:'STEP 01', name:'As-Is 업무 구조', ac:'--s1'},
  {id:'02', page:BASE + 'step2.html', label:'STEP 02', name:'Workflow 진단', ac:'--s2'},
  {id:'03', page:BASE + 'step3.html', label:'STEP 03', name:'핵심 문제', ac:'--s3'},
  {id:'04', page:BASE + 'step4.html', label:'STEP 04', name:'근본 원인', ac:'--s4'},
  {id:'05', page:BASE + 'step5.html', label:'STEP 05', name:'실행 지식', ac:'--s5'}
];
const S = {files:{}, at:null, wfs:{}, wfNames:[], skills:{}, wf:null, stage:'00', view:'viz', sel:null, filter:null, skillKey:{}};
const W = () => S.wfs[S.wf] || {};
const P = n => (W()[n] || {}).p;
const stageOf = id => STAGES.find(s => s.id === id);

function ingest(files, at){
  S.files = files; S.at = at; S.wfs = {}; S.skills = {};
  Object.entries(files).forEach(([path, text]) => {
    const p = path.replace(/\\/g,'/'), base = p.split('/').pop();
    if(/^SKILL\.md$/i.test(base)){
      const dir = p.split('/').slice(-2,-1)[0] || ''; const n = (dir.match(/^(\d{2})-/)||[])[1];
      if(n){ try { S.skills[n] = Object.assign(parseSkill(text), {path:p, dir}); } catch(e){ console.warn(e); } }
      return;
    }
    const n = (base.match(/^(0[1-9])_/)||[])[1]; if(!n) return;
    const doc = parseDoc(text);
    const wf = doc.fm.workflow || base.replace(/^0\d_[a-z_]+?_/,'').replace(/\.md$/,'');
    const Wf = S.wfs[wf] = S.wfs[wf] || {};
    let parsed = null, err = null;
    try { parsed = ({'01':p01,'02':p02,'03':p03,'04':p04,'05':p05}[n] || (()=>null))(doc); } catch(e){ err = e; console.warn(e); }
    Wf[n] = {doc, p:parsed, err, path:p, base};
  });
  S.wfNames = Object.keys(S.wfs);
  let saved = null; try { saved = localStorage.getItem('pi-viewer-wf'); } catch(e){}
  S.wf = S.wfNames.includes(saved) ? saved : (S.wfNames[0] || null);
  $('#loader').classList.add('hide');
  readHash();
  render();
}

/* 다른 페이지에서 넘어올 때 선택 항목: step2.html#issue=I3 */
function readHash(){
  const m = decodeURIComponent(location.hash.slice(1)).match(/^(\w+)=(.+)$/);
  S.sel = m ? {type:m[1], id:m[2]} : null;
}

/* ---------- 6. 렌더링: 공통 틀 ---------- */
function render(){
  const st = stageOf(S.stage);
  document.documentElement.style.setProperty('--ac', `var(${st.ac})`);
  document.documentElement.style.setProperty('--acs', `var(${st.ac}s)`);
  renderTop(); renderRail(); renderCanvas(); renderInsp();
  const el = document.querySelector('.canvas .sel'); if(el) el.scrollIntoView({block:'nearest'});
}
function renderTop(){
  const box = $('#wfBox');
  if(!S.wfNames.length) box.innerHTML = '<span>Workflow</span><strong>산출물 없음</strong>';
  else if(S.wfNames.length === 1) box.innerHTML = `<span>Workflow</span><strong title="${esc(S.wf)}">${esc(S.wf)}</strong>`;
  else {
    box.innerHTML = `<span>Workflow</span><select id="wfSel">${S.wfNames.map(n=>`<option ${n===S.wf?'selected':''}>${esc(n)}</option>`).join('')}</select>`;
    $('#wfSel').onchange = e => { S.wf = e.target.value; try { localStorage.setItem('pi-viewer-wf', S.wf); } catch(x){} S.sel = null; S.filter = null; render(); };
  }
  const n = Object.keys(S.files).length;
  $('#meta').textContent = S.at ? `md ${n}개 · ${new Date(S.at).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} 불러옴` : '';
}
function countRC(t){ let n = t.rc ? 1 : 0; (t.kids||[]).forEach(k => n += countRC(k)); return n; }
function railKV(id){
  const e = W()[id], p = P(id), fm = e ? e.doc.fm : {};
  if(id === '00') return `${Object.keys(W()).length}/${STAGES.length - 1} 단계 산출물`;
  if(!p) return '산출물 없음';
  if(id === '01') return `Task ${p.tasks.length} · Action ${p.actions.length} · ${fm.status||''}`;
  if(id === '02'){ const g = c => p.issues.filter(i=>i.grade===c).length; return `Issue ${p.issues.length} · A ${g('A')} / B ${g('B')}`; }
  if(id === '03') return `후보 ${p.cands.length} → 선정 1 · ${fm.status||''}`;
  if(id === '04') return `가설 ${Object.keys(p.hyps).length} → RC ${countRC(p.tree)} · ${fm.status||''}`;
  if(id === '05') return `Action ${p.acts.length} · 지식 ${p.know.length} · 규칙 ${p.rules.length} · ${fm.status||''}`;
}
function renderRail(){
  $('#rail').innerHTML = STAGES.map(s => {
    const has = s.id === '00' || W()[s.id];
    return `<a href="${s.page}" class="st ${S.stage===s.id?'on':''} ${has?'':'empty'}" style="--ac:var(${s.ac});--acs:var(${s.ac}s)" ${S.stage===s.id?'aria-current="page"':''}>
      <span class="ix">${s.id==='00'?'∑':s.id}</span><span class="tx"><span class="lb">${s.label}</span><span class="nm">${s.name}</span><span class="kv">${esc(railKV(s.id))}</span></span></a>`;
  }).join('');
}

/* 같은 페이지면 선택만 바꾸고, 다른 단계면 그 페이지로 이동 */
function go(stage, sel){
  if(stage === S.stage){ select(sel || null); return; }
  location.href = stageOf(stage).page + (sel ? '#' + sel.type + '=' + encodeURIComponent(sel.id) : '');
}
function select(sel){
  S.sel = sel;
  history.replaceState(null, '', sel ? '#' + sel.type + '=' + encodeURIComponent(sel.id) : location.pathname);
  renderCanvas(); renderInsp();
}
const isSel = (type, id) => S.sel && S.sel.type === type && S.sel.id === id ? 'sel' : '';

function canvasHead(title, desc, hasViz){
  const entry = W()[S.stage], skill = S.skills[S.stage];
  const tabs = [];
  if(hasViz) tabs.push(['viz','시각화']);
  if(entry) tabs.push(['raw','산출물 원문']);
  if(skill) tabs.push(['skill','스킬 절차']);
  if(!tabs.find(t => t[0] === S.view)) S.view = tabs.length ? tabs[0][0] : 'viz';
  return `<div class="chead"><h2>${title}</h2>${desc?`<span class="d">${desc}</span>`:''}
    ${tabs.length > 1 ? `<div class="seg">${tabs.map(t=>`<button type="button" data-v="${t[0]}" class="${S.view===t[0]?'on':''}">${t[1]}</button>`).join('')}</div>` : ''}</div>`;
}
function renderCanvas(){
  const c = $('#canvas'), st = S.stage;
  let h = '';
  try {
    if(st === '00') h = PI.view();
    else {
      const entry = W()[st], stage = stageOf(st);
      const desc = entry ? `<code>${esc(entry.base)}</code> · status <b>${esc(entry.doc.fm.status||'-')}</b> · ${esc(entry.doc.fm.updated||'')}` : '이 단계의 산출물이 아직 없습니다';
      h = canvasHead(stage.name, desc, !!(entry && entry.p));
      if(S.view === 'raw' && entry) h += `<div class="card"><div class="b md">${md(entry.doc.body)}</div></div>`;
      else if(S.view === 'skill') h += vSkill(st);
      else if(entry && entry.p) h += PI.view(entry.p);
      else h += emptyStage(st);
    }
  } catch(e){
    console.error(e);
    const entry = W()[st];
    h = `<div class="card"><div class="b"><p class="err">이 파일 형식을 시각화하지 못해 원문으로 보여줍니다. (${esc(e.message)})</p>${entry?`<div class="md">${md(entry.doc.body)}</div>`:''}</div></div>`;
  }
  c.innerHTML = h;
  bindCanvas();
  if(PI.bind) PI.bind(c);
}
function emptyStage(st){
  return `<div class="card"><div class="b" style="text-align:center;padding:40px;color:var(--muted)">
    <p><code>output/${st}_*.md</code> 산출물이 없습니다.</p>${S.skills[st]?'<p>위의 <b>스킬 절차</b> 탭에서 이 단계가 무엇을 하는지 볼 수 있습니다.</p>':''}</div></div>`;
}
function bindSel(root){
  root.querySelectorAll('[data-sel]').forEach(el => el.onclick = e => {
    e.stopPropagation();
    const [type, id, stage] = el.dataset.sel.split('|');
    go(stage || S.stage, {type, id});
  });
}
function bindCanvas(){
  const c = $('#canvas');
  c.querySelectorAll('.seg button').forEach(b => b.onclick = () => { S.view = b.dataset.v; renderCanvas(); });
  bindSel(c);
  c.querySelectorAll('[data-go]').forEach(el => el.onclick = () => go(el.dataset.go));
  c.querySelectorAll('[data-filter]').forEach(el => el.onclick = () => {
    S.filter = S.filter === el.dataset.filter ? null : el.dataset.filter;
    select(S.filter ? {type:'task', id:S.filter} : null);
  });
  c.querySelectorAll('.snav button').forEach(b => b.onclick = () => { S.skillKey[S.stage] = b.dataset.k; renderCanvas(); });
}

/* 스킬 절차 탭 */
function vSkill(st){
  const sk = S.skills[st]; if(!sk) return '';
  const key = S.skillKey[st] || (sk.nav.find(n => n.depth === 1) || sk.nav[0] || {}).key;
  const cur = sk.nav.find(n => n.key === key) || sk.nav[0];
  return `<div class="box" style="margin-bottom:12px"><b>${esc(sk.fm.name || sk.dir)}</b> — ${esc(sk.fm.description || '')}</div>
  <div class="skill"><div class="snav">${sk.nav.map(n => `<button type="button" class="${n.depth?'sub':''} ${n.key===cur.key?'on':''}" data-k="${n.key}">${esc(n.title)}</button>`).join('')}</div>
  <div class="card"><div class="b md"><h2 style="margin-top:0">${esc(cur.title)}</h2>${md(cur.depth ? cur.body : cur.full)}</div></div></div>`;
}

/* 04 트리 (전체 페이지와 04 페이지에서 사용) */
function vdClass(v){ return /부분/.test(v) ? 'part' : /지지/.test(v) ? 'ok' : /기각/.test(v) ? 'no' : /미검증/.test(v) ? 'unk' : ''; }

/* ---------- 7. 오른쪽 상세 패널 ---------- */
function renderInsp(){
  const el = $('#insp'); let h = '';
  /* data-insp="drawer" 페이지: 오른쪽 패널을 숨겨 두었다가 항목을 누를 때만 펼침 */
  const drawer = document.body.dataset.insp === 'drawer';
  if(drawer && !S.sel){ el.classList.remove('open'); el.innerHTML = ''; return; }
  try { h = inspHTML(); } catch(e){ console.error(e); h = `<p class="err">${esc(e.message)}</p>`; }
  if(drawer) h = `<button type="button" class="insp-x" id="inspClose" title="닫기 (Esc)">×</button>` + h;
  el.innerHTML = h;
  el.classList.toggle('open', drawer);
  bindSel(el);
  const x = $('#inspClose'); if(x) x.onclick = () => { S.filter = null; select(null); };
}
/* 0~100 점수 → 색 (낮음 회색 ~ 높음 진한 청록) */
function scoreLevel(v){ v = Number(v) || 0; return v >= 75 ? 4 : v >= 50 ? 3 : v >= 30 ? 2 : v > 0 ? 1 : 0; }
function scoreColor(v){ return ['var(--line2)','var(--q2)','var(--q2)','var(--q3)','var(--q4)'][scoreLevel(v)]; }
const kv = rows => `<dl class="kvs">${rows.filter(r => r[1]).map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('')}</dl>`;
const link = (type, id, stage, label) => `<span class="chip link" data-sel="${type}|${id}|${stage}">${esc(label||id)}</span>`;
function opps4(p4){
  const out = [];
  Object.values(p4.rcs).forEach(rc => { const b = bget(rc.b,'개선 방향'); if(b) (b.sub.length?b.sub:[b.v]).forEach(x => out.push({rc, x})); });
  return out;
}

function inspHTML(){
  const sel = S.sel, st = S.stage;
  /* 페이지가 자기 항목 종류를 처리하면 그것을 씀 */
  if(sel && PI.insp){ const h = PI.insp(sel); if(h) return h; }
  const p1 = P('01'), p2 = P('02'), p3 = P('03'), p4 = P('04');
  if(sel && sel.type === 'act' && p1){
    const a = p1.actions.find(x => x.id === sel.id); if(!a) return inspDefault(st);
    const who = {self:'본인', req:'요청', co:'협의'}[a.whoType];
    let h = `<div class="eyebrow" style="color:var(--s1)">ACTION · ${a.id}${a.star?' · 미확인 추정':''}</div><h3>${esc(a.name)}</h3>
      <div style="margin-top:4px;color:var(--muted);font-size:12.5px">${a.task}. ${esc(a.taskName)}</div>
      <div class="lbl">하는 일</div><div class="box">${inline(a.does)}</div>
      ${kv([['결과물', inline(a.out)], ['도구', inline(a.tool)], ['하는 사람', `<span class="chip" style="border-color:var(--${a.whoType});color:var(--${a.whoType})">${esc(a.who||who)}</span>`]])}`;
    if(st !== '01') h += `<div style="margin-top:10px">${link('act', a.id, '01', 'STEP 01에서 보기 →')}</div>`;
    if(p2){
      const d = p2.actDiag[a.id], iss = p2.act2iss[a.id] || [];
      h += `<div class="lbl">STEP 02 진단</div>`;
      if(d && d.scores) h += `<div class="scorebox" style="margin-top:0;margin-bottom:8px"><div class="n">${d.total ?? '-'}</div><div><b style="font-size:13px">종합 점수</b><div class="f">최고 영역×0.7 + 둘째 영역×0.3 · 0~100</div></div></div>
        ${p2.areaNames.map((n, i) => `<div class="axis"><span>${esc(n)}</span><span class="bg"><i style="width:${d.scores[i]}%;background:${scoreColor(d.scores[i])}"></i></span><b>${d.scores[i]}</b></div>`).join('')}`;
      if(d) h += `<div class="box" style="margin-top:8px">${kv([['AI 진단', inline(d.diag)], ['예상 어려움', inline(d.hard)], ['개선 기회', inline(d.opp)]])}</div>`;
      h += iss.length ? `<div class="chips" style="margin-top:8px">${iss.map(i => link('issue', i, '02', i + ' ' + clip((p2.issues.find(x=>x.id===i)||{}).title, 22))).join('')}</div>` : (d ? '' : '<div class="box" style="color:var(--faint)">진단 신호 없음</div>');
    }
    return h;
  }
  if(sel && sel.type === 'issue' && p2){
    const is = p2.issues.find(x => x.id === sel.id); if(!is) return inspDefault(st);
    const calc = Math.round((is.imp*0.4 + is.sig*0.3 + is.fix*0.3) * 20);
    const reason = bget(is.detail, '점수 근거');
    const rs = reason ? reason.v.split(' / ') : [];
    const ax = (lb, v, i) => `<div class="axis"><span>${lb}</span><span class="bg"><i style="width:${v*20}%"></i></span><b>${v}</b></div>${rs[i]?`<div style="font-size:11.5px;color:var(--faint);margin:-2px 0 6px 86px">${esc(rs[i].replace(/^[^—]*—\s*/,''))}</div>`:''}`;
    let h = `<div class="eyebrow" style="color:var(--s2)">ISSUE HYPOTHESIS · ${is.id}</div><h3>${esc(is.longTitle || is.title)}</h3>
      <div class="scorebox"><div class="n">${is.score}</div><div><span class="tag g-${esc(is.grade)}">등급 ${esc(is.grade)}</span> <span class="chip">확신도 ${esc(is.conf)}</span><div class="f" style="margin-top:4px">${calc === is.score ? '검산 일치' : `검산 ${calc}점 (표기와 다름)`}</div></div></div>
      ${st !== '02' ? `<div style="margin-top:10px">${link('issue', is.id, '02', 'STEP 02에서 보기 →')}</div>` : ''}
      <div class="lbl">점수 구성</div>${ax('영향도 40%', is.imp, 0)}${ax('신호 30%', is.sig, 1)}${ax('개선 30%', is.fix, 2)}
      <div class="lbl">관련 Action</div><div class="chips">${is.acts.map(a => link('act', a, '01', a + ' ' + ((p1 && (p1.actions.find(x=>x.id===a)||{}).name) || ''))).join('')}</div>`;
    ['영역','근거','예상 어려움','반대 가능성','개선 기회','검증 질문'].forEach(k => { const b = bget(is.detail, k); if(b) h += `<div class="lbl">${k}</div><div class="box">${inline(b.v)}</div>`; });
    if(!is.detail) h += `<div class="lbl">개선 기회</div><div class="box">${inline(is.opp)}</div><div class="lbl">예상 어려움</div><div class="box">${inline(is.hard)}</div>`;
    if(p3){ const rel = ids((bget(p3.attrs,'관련 진단')||{}).v, RE_ISS); if(rel.includes(is.id)) h += `<div class="lbl">STEP 03 연결</div><div class="box">Target Problem의 관련 진단 Issue로 이어짐 ${link('target','T','03','핵심 문제 보기')}</div>`; }
    return h;
  }
  if(sel && sel.type === 'task' && p2 && p2.heat){
    const r = p2.heat.rows.find(x => x.id === sel.id); if(!r) return inspDefault(st);
    const iss = p2.issues.filter(i => i.acts.some(a => a.startsWith(sel.id + '-')));
    const sc = p2.heat.scale;
    const acts = Object.entries(p2.actDiag).filter(([a, d]) => a.startsWith(sel.id + '-') && d.total != null).sort((x, y) => y[1].total - x[1].total);
    const aname = a => (p1 && (p1.actions.find(x => x.id === a)||{}).name) || '';
    return `<div class="eyebrow" style="color:var(--s2)">TASK 진단 · ${r.id}</div><h3>${esc(r.task.replace(/^T\d+\.\s*/,''))}</h3>
      <div class="lbl">영역별 최고 점수 (0~${sc})</div>${p2.heat.areas.map((a,i)=>`<div class="axis"><span>${esc(a)}</span><span class="bg"><i style="width:${(r.vals[i]||0)/sc*100}%;background:${sc === 100 ? scoreColor(r.vals[i]) : 'var(--s2)'}"></i></span><b>${r.vals[i]}</b></div>`).join('')}
      ${acts.length ? `<div class="lbl">Action 종합 점수 (큰 순)</div>${acts.map(([a, d]) => `<div class="axis" style="grid-template-columns:150px 1fr 22px;cursor:pointer" data-sel="act|${a}"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(a + ' ' + aname(a))}">${a.split('-')[1]} ${esc(aname(a))}</span><span class="bg"><i style="width:${d.total}%;background:${scoreColor(d.total)}"></i></span><b>${d.total}</b></div>`).join('')}` : ''}
      <div class="lbl">이 Task가 걸린 Issue ${iss.length}개</div><div class="chips">${iss.map(i => link('issue', i.id, '02', `${i.id} · ${i.score}`)).join('')}</div>`;
  }
  if(sel && sel.type === 'cand' && p3){
    const c = p3.cands.find(x => x.id === sel.id); if(!c) return inspDefault(st);
    const di = ids(c.src, RE_ISS)[0];
    return `<div class="eyebrow" style="color:var(--s3)">문제 후보 · ${esc(c.id)}</div><h3>${esc(c.text)}</h3>
      ${kv([['출처', esc(c.src) + (di && p2 ? ' ' + link('issue', di, '02', di + ' 진단 보기') : '')], ['결과', esc(c.res)], ['점수', esc(c.score)], ['영향도', esc(c.imp)], ['체감 부담', esc(c.bur)], ['해결 가능성', esc(c.sol)]])}
      ${p3.memo ? `<div class="lbl">후보별 메모</div><div class="box md">${md(p3.memo)}</div>` : ''}`;
  }
  if(sel && sel.type === 'target' && p3){
    const a = p3.attrs;
    return `<div class="eyebrow" style="color:var(--s3)">TARGET PROBLEM</div><h3>${esc(p3.statement)}</h3>
      ${st !== '03' ? `<div style="margin-top:10px">${link('target', 'T', '03', 'STEP 03에서 보기 →')}</div>` : ''}
      ${['업무 범위','빈도','선정 이유','고객이 짐작하는 원인'].map(k => { const b = bget(a, k); return b ? `<div class="lbl">${esc(b.k)}</div><div class="box">${inline(b.v)}</div>` : ''; }).join('')}`;
  }
  if(sel && sel.type === 'node' && p4){
    const hy = p4.hyps[sel.id];
    let node = null; (function walk(n){ if(n.id === sel.id) node = n; (n.kids||[]).forEach(walk); })(p4.tree);
    const rc = node && node.rc ? p4.rcs[node.rc] : null;
    let h = `<div class="eyebrow" style="color:var(--s4)">원인 가설 · ${esc(sel.id)}${node && node.rc ? ' · ★ ' + node.rc : ''}</div><h3>${esc(hy ? hy.text : node ? node.text : sel.id)}</h3>`;
    if(st !== '04') h += `<div style="margin-top:10px">${link('node', sel.id, '04', 'STEP 04에서 보기 →')}</div>`;
    if(hy) h += kv([['판정', `<span class="node ${vdClass(hy.vd)}" style="padding:1px 8px;box-shadow:none"><span class="vd" style="margin:0">${esc(hy.vd)}</span></span>`], ['근거 강도', esc(hy.st)], ['범주', esc(hy.cat)], ['출처', esc(hy.src)]]) + `<div class="lbl">확인한 근거</div><div class="box">${inline(hy.ev)}</div><div class="lbl">반례</div><div class="box">${inline(hy.cx)}</div>`;
    if(rc){ h += `<div class="lbl">Root Cause 상세</div>`; rc.b.forEach(b => h += `<div class="box"><b style="font-size:12px;color:var(--faint)">${esc(b.k)}</b><div>${inline(b.v)}${b.sub.length?'<ul style="margin:4px 0 0;padding-left:16px">'+b.sub.map(s=>`<li>${inline(s)}</li>`).join('')+'</ul>':''}</div></div>`); }
    return h;
  }
  if(sel && sel.type === 'opp' && p4){
    const o = opps4(p4)[+sel.id]; if(!o) return inspDefault(st);
    const cons = bget(o.rc.b, '전제');
    return `<div class="eyebrow" style="color:var(--s4)">개선 방향 · ${o.rc.id}에 대응</div><h3>${inline(o.x)}</h3><div class="lbl">대응하는 Root Cause</div><div class="box">${esc(o.rc.title)}</div>${cons?`<div class="lbl">전제·제약</div><div class="box">${inline(cons.v)}</div>`:''}<div class="lbl">다음 단계</div><div class="box md">${md(p4.next)}</div>`;
  }
  return inspDefault(st);
}
/* 아무것도 선택하지 않았을 때: 페이지가 PI.inspDefault 를 정하면 그것을 씀 */
function inspDefault(st){
  if(PI.inspDefault){ const h = PI.inspDefault(); if(h) return h; }
  return '<div class="empty-insp">항목을 누르면 상세 내용이 여기에 표시됩니다</div>';
}

/* ---------- 8. 공통 HTML 틀과 시작 ---------- */
const SHELL = `
<div class="app" id="app">
  <header class="top">
    <a class="brand" href="${HOME}" style="text-decoration:none;color:inherit"><div class="logo">PI</div><b>업무분석·개선 뷰어</b></a>
    <div class="wf" id="wfBox"></div>
    <div class="sp"></div>
    <span class="meta" id="meta"></span>
    <button class="btn" id="reloadBtn" type="button" title="md 파일을 고친 뒤 다시 불러올 때">폴더 다시 불러오기</button>
    <button class="btn" id="themeBtn" type="button">테마</button>
  </header>
  <nav class="rail" id="rail"></nav>
  <div class="main">
    <section class="canvas" id="canvas"></section>
    <aside class="insp" id="insp"></aside>
  </div>
</div>
<div class="loader" id="loader">
  <div class="drop" id="drop">
    <div class="logo" style="margin:0 auto;width:40px;height:40px;font-size:15px;border-radius:10px">PI</div>
    <h1>분석 폴더를 불러오세요</h1>
    <p>브라우저는 보안상 이 HTML 옆의 파일을 스스로 읽을 수 없어서, 처음 한 번만 폴더를 선택해야 합니다.</p>
    <p>한 번 불러오면 모든 페이지(전체, STEP 01~05)에서 같은 내용을 씁니다. 파일은 어디에도 전송되지 않습니다.</p>
    <div class="path"><b>workflow3</b> 폴더 전체를 선택하면 → 산출물(<code>output/</code>)과 스킬 정의(<code>.github/skills/</code>)를 함께 읽습니다<br><b>output</b> 폴더만 선택해도 → 산출물 화면은 모두 볼 수 있습니다</div>
    <div class="acts"><button class="btn primary" id="pickBtn" type="button">폴더 선택</button></div>
    <p style="margin-top:12px;font-size:12px;color:var(--faint)">또는 폴더를 이 상자에 끌어다 놓으세요</p>
    <div class="err" id="err"></div>
  </div>
</div>
<input type="file" id="dirInput" webkitdirectory directory multiple hidden>`;

function applyTheme(){
  const root = document.documentElement;
  try { const t = localStorage.getItem('pi-viewer-theme'); if(t) root.dataset.theme = t; } catch(e){}
  $('#themeBtn').onclick = () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('pi-viewer-theme', root.dataset.theme); } catch(e){}
  };
}
async function acceptFiles(list){
  $('#err').textContent = '';
  const files = await readFileList(list);
  if(!Object.keys(files).length){
    $('#err').textContent = '이 폴더에서 산출물 md(01_~05_*.md)나 SKILL.md를 찾지 못했습니다. workflow3 또는 output 폴더를 선택해 주세요.';
    $('#loader').classList.remove('hide'); return;
  }
  const at = new Date().toISOString(); saveCache(files, at); ingest(files, at);
}

PI.start = function(){
  S.stage = document.body.dataset.stage || '00';
  document.body.insertAdjacentHTML('afterbegin', SHELL);
  applyTheme();
  $('#pickBtn').onclick = () => $('#dirInput').click();
  $('#reloadBtn').onclick = () => $('#dirInput').click();
  $('#dirInput').onchange = e => { if(e.target.files.length) acceptFiles([...e.target.files]); e.target.value = ''; };
  const drop = $('#drop');
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', async e => {
    const items = [...(e.dataTransfer.items || [])].map(i => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
    const acc = [];
    for(const it of items) await walkEntry(it, '', acc);
    acceptFiles(acc.length ? acc : [...e.dataTransfer.files]);
  });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && S.sel){ S.filter = null; select(null); } });
  window.addEventListener('hashchange', () => { readHash(); renderCanvas(); renderInsp(); });
  const cached = loadCache();
  if(cached) ingest(cached.files, cached.at);
};
/* 테스트·자동화용: 파일 내용을 직접 넣기 */
PI.load = files => { const at = new Date().toISOString(); saveCache(files, at); ingest(files, at); };

/* 페이지 스크립트에서 쓰는 도구 */
PI.rerender = () => { renderCanvas(); renderInsp(); };
Object.assign(PI, {scoreLevel, scoreColor, expandIds, st5, RE_KREC});
Object.assign(PI, {S, W, P, STAGES, stageOf, esc, md, inline, bget, ids, clip, isSel, countRC, vdClass, opps4, kv, link, RE_ACT, RE_ISS});
})();
