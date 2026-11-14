/* 전체(한눈에 보기) 페이지
   위: 이번에 해결할 문제(03)와 근본 원인·개선 방향(04), 좁혀 온 과정
   가운데: 진단 Issue(점수 큰 순) → Task별 업무 지도(이슈 큰 Task부터)
   색: 핵심 문제 범위 > 연관 범위 > A등급 Issue > B·C등급 Issue > 신호 없음 */
(function(){
const {S, W, P, stageOf, esc, md, inline, bget, ids, clip, isSel, countRC, opps4, kv, RE_ACT, RE_ISS} = PI;

let SORT = 'issue';
try { SORT = localStorage.getItem('pi-viewer-ovsort') || 'issue'; } catch(e){}

function actNum(id){ const x = id.match(/\d+/g).map(Number); return x[0]*1000 + x[1]; }

/* 핵심 문제와 연결된 Action, Issue 모으기 */
function focus(){
  const p2 = P('02'), p3 = P('03'), p4 = P('04');
  const core = new Set(), rel = new Set();
  if(p3) ids((bget(p3.attrs, '업무 범위')||{}).v, RE_ACT).forEach(a => core.add(a));
  if(p4){
    ids(p4.brief['업무 범위'], RE_ACT).forEach(a => core.size ? rel.add(a) : core.add(a));
    ids(p4.next, RE_ACT).forEach(a => rel.add(a));
  }
  core.forEach(a => rel.delete(a));
  const issues = new Set(p3 ? ids((bget(p3.attrs, '관련 진단')||{}).v, RE_ISS) : []);
  const score = {}, grade = {};
  /* Issue List의 관련 Action + Action별 진단표의 관련 Issue를 모두 반영 */
  if(p2) Object.entries(p2.act2iss).forEach(([a, list]) => list.forEach(id => {
    const is = p2.issues.find(x => x.id === id); if(!is) return;
    if(!(a in score) || is.score > score[a]){ score[a] = is.score; grade[a] = is.grade; }
  }));
  return {core, rel, issues, score, grade};
}

function level(a, f){
  if(f.core.has(a)) return 'core';
  if(f.rel.has(a)) return 'rel';
  if(f.grade[a] === 'A') return 'ia';
  if(f.grade[a]) return 'ib';
  return 'none';
}
const LV_ORDER = {core:0, rel:1, ia:2, ib:3, none:4};

PI.view = function(){
  const p1 = P('01'), p2 = P('02'), p3 = P('03'), p4 = P('04');
  const f = focus();
  const selIssue = S.sel && S.sel.type === 'issue' && p2 ? p2.issues.find(i => i.id === S.sel.id) : null;
  let h = '';

  /* ── 1. 문제 정의 배너 */
  const rcNodes = []; (function walk(n){ if(n.rc) rcNodes.push(n); (n.kids||[]).forEach(walk); })(p4 ? p4.tree : {});
  const opps = p4 ? opps4(p4) : [];
  h += `<div class="pbanner"><div class="pb-main">`;
  if(p3){
    h += `<div class="pb-k"><span class="pb-dot"></span>이번에 해결할 문제 <span class="pb-st">STEP 03 · ${esc(W()['03'].doc.fm.status||'')}</span></div>
      <p class="pb-stmt" data-sel="target|T" title="눌러서 상세 보기">${inline(p3.statement)}</p>`;
  } else {
    h += `<div class="pb-k">이번에 해결할 문제</div><p class="pb-stmt" style="color:var(--muted)">아직 STEP 03 산출물이 없습니다.</p>`;
  }
  if(rcNodes.length) h += `<div class="pb-row"><span class="pb-l">근본 원인</span><div class="pb-v">${rcNodes.map(n => `<button type="button" class="pb-rc ${isSel('node', n.id)}" data-sel="node|${esc(n.id)}"><b>★ ${n.rc}</b>${esc(n.text)}</button>`).join('')}</div></div>`;
  if(opps.length) h += `<div class="pb-row"><span class="pb-l">개선 방향</span><div class="pb-v">${opps.map((o, k) => { const m = o.x.match(/^(O\d+)\.\s*(.*)$/);
    return `<button type="button" class="pb-op ${isSel('opp', String(k))}" data-sel="opp|${k}" title="${esc(o.x)}"><b>${m?m[1]:'→'}</b>${esc(clip(m?m[2]:o.x, 46))}</button>`; }).join('')}</div></div>`;
  h += `</div>`;

  /* 좁혀 온 과정: 큰 것 → 작은 것 */
  const steps = [
    ['01', p1 ? p1.actions.length : '—', 'Actions', p1 ? `Task ${p1.tasks.length}개` : '산출물 없음'],
    ['02', p2 ? p2.issues.length : '—', 'Issues', p2 ? `A ${p2.issues.filter(i=>i.grade==='A').length} · B ${p2.issues.filter(i=>i.grade==='B').length}` : '선택 단계'],
    ['03', p3 ? 1 : '—', '핵심 문제', p3 ? `후보 ${p3.cands.length}개 중` : '산출물 없음'],
    ['04', p4 ? countRC(p4.tree) : '—', '근본 원인', p4 ? `가설 ${Object.keys(p4.hyps).length}개 중` : '산출물 없음']
  ];
  h += `<div class="pb-funnel"><div class="pb-fk">좁혀 온 과정</div>${steps.map((s, i) => { const st = stageOf(s[0]);
    return `<button type="button" class="fn" data-go="${s[0]}" style="--ac:var(${st.ac});--acs:var(${st.ac}s);--w:${100 - i*18}%"><span class="fn-bar"><b>${s[1]}</b> ${s[2]}</span><span class="fn-sub">${s[3]}</span></button>`; }).join('')}</div></div>`;

  /* ── 2. 진단 Issue (점수 큰 순) */
  if(p2){
    h += `<div class="istrip"><span class="is-l">진단 Issue<small>점수 큰 순 · 누르면 해당 Action 표시</small></span><div class="is-v">${p2.issues.slice().sort((a,b) => b.score - a.score).map(is =>
      `<button type="button" class="ichip ${f.issues.has(is.id)?'tgt':''} ${isSel('issue', is.id)}" data-sel="issue|${is.id}" title="${esc(is.title)}">
        <b>${is.id}</b><span class="tag g-${esc(is.grade)}">${is.score}</span>${f.issues.has(is.id)?'<em>해결 대상</em>':''}</button>`).join('')}</div></div>`;
  }

  /* ── 3. Task별 업무 지도 */
  if(p1){
    const heat = {}; if(p2 && p2.heat) p2.heat.rows.forEach(r => heat[r.id] = r.total);
    const heatLabel = p2 && p2.heat && p2.heat.scale === 100 ? '최고 종합' : '신호';
    const maxHeat = Math.max(1, ...Object.values(heat));
    const tasks = p1.tasks.map((t, i) => {
      const lv = t.actions.map(a => level(a.id, f));
      return {t, i, heat: heat[t.id] || 0, hasCore: lv.includes('core'), hasRel: lv.includes('rel'), issueActs: lv.filter(x => x !== 'none').length};
    });
    if(SORT === 'issue') tasks.sort((a, b) => (b.hasCore - a.hasCore) || (b.hasRel - a.hasRel) || (b.heat - a.heat) || (a.i - b.i));

    h += `<div class="mapbar"><b>Task별 업무 지도</b>
      <span class="legend"><span><i class="lg core"></i>핵심 문제 범위</span><span><i class="lg rel"></i>연관 범위</span><span><i class="lg ia"></i>A등급 Issue</span><span><i class="lg ib"></i>B·C등급 Issue</span><span><i class="lg none"></i>신호 없음</span></span>
      <div class="seg"><button type="button" data-ovsort="issue" class="${SORT==='issue'?'on':''}">문제 큰 순</button><button type="button" data-ovsort="flow" class="${SORT==='flow'?'on':''}">업무 순서</button></div></div>
      <div class="tmap">`;
    tasks.forEach((x, rank) => {
      const t = x.t;
      const acts = t.actions.slice();
      if(SORT === 'issue') acts.sort((a, b) => (LV_ORDER[level(a.id, f)] - LV_ORDER[level(b.id, f)]) || ((f.score[b.id]||0) - (f.score[a.id]||0)) || (actNum(a.id) - actNum(b.id)));
      const cls = x.hasCore ? 'core' : x.hasRel ? 'rel' : '';
      h += `<div class="tm ${cls}">
        <div class="tm-h"><span class="tm-r">${SORT==='issue' ? rank + 1 : ''}</span><span class="tm-id">${t.id}</span><span class="tm-n">${esc(t.name)}</span></div>
        <div class="tm-s"><span class="tm-bar"><i style="width:${x.heat/maxHeat*100}%"></i></span><span>${esc(heatLabel)} ${x.heat}</span><span>Issue 연결 ${x.issueActs}/${t.actions.length}</span></div>`;
      acts.forEach(a => {
        const lv = level(a.id, f);
        const hit = selIssue ? (selIssue.acts.includes(a.id) ? 'hit' : 'dim') : '';
        h += `<button type="button" class="ta lv-${lv} ${hit} ${isSel('act', a.id)}" data-sel="act|${a.id}" title="${esc(a.does)}">
          <span class="ta-id">${a.id.split('-')[1]}</span><span class="ta-n">${esc(a.name)}${a.star?' *':''}</span>${f.score[a.id]?`<span class="ta-s">${f.score[a.id]}</span>`:''}</button>`;
      });
      h += `</div>`;
    });
    h += `</div>`;
  }
  return h;
};

PI.bind = function(root){
  root.querySelectorAll('[data-ovsort]').forEach(b => b.onclick = () => {
    SORT = b.dataset.ovsort;
    try { localStorage.setItem('pi-viewer-ovsort', SORT); } catch(e){}
    PI.rerender();
  });
};

PI.inspDefault = function(){
  const p1 = P('01');
  let h = `<div class="eyebrow" style="color:var(--s0)">WORKFLOW</div><h3>${esc(S.wf || '-')}</h3>`;
  if(p1){ const fm = W()['01'].doc.fm; h += kv([['역할', esc(fm.owner_role)], ['상위 분류', esc(fm.l1_l2)]]) + `<div class="lbl">개요</div><div class="box md">${md(p1.overview)}</div>`; }
  h += `<div class="lbl">읽는 방법</div><div class="box" style="font-size:12.5px">위쪽은 이번에 해결할 문제와 근본 원인, 가운데는 진단 Issue와 Task별 업무 지도입니다. Task는 핵심 문제와 가까운 것, 신호가 큰 것부터 놓입니다. Issue나 Action을 누르면 여기에 상세가 표시됩니다.</div>`;
  h += `<div class="lbl">불러온 산출물</div><div class="filelist">${['01','02','03','04','05'].map(n => { const e = W()[n]; return `<div><span>${n} ${e?`<code>${esc(e.doc.fm.schema||'')}</code>`:'<span style="color:var(--faint)">없음</span>'}</span><span>${e?esc(e.doc.fm.status||''):''}</span></div>`; }).join('')}</div>`;
  return h;
};

PI.start();
})();
