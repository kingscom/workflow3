/* 전체(한눈에 보기) 페이지 — STEP 01~05를 한 장으로 요약
   위: 이번에 해결할 문제(03)와 근본 원인·개선 방향(04), 좁혀 온 과정(01~05)
   가운데: 단계별 요약 카드 5장(01 업무 구조 → 02 진단 → 03 핵심 문제 → 04 근본 원인 → 05 실행 지식)
   아래: Task별 업무 지도(문제 큰 Task부터, 05에서 실행 지식을 정리한 Action 표시)
   색: 핵심 문제 범위 > 연관 범위 > A등급 Issue > B·C등급 Issue > 신호 없음 */
(function(){
const {S, W, P, stageOf, esc, md, inline, bget, ids, clip, isSel, countRC, opps4, kv, link, st5, RE_ACT, RE_ISS} = PI;

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

/* 단계별 요약 카드 5장 */
function summaryCards(p1, p2, p3, p4, p5, f){
  const fmOf = n => (W()[n] || {doc:{fm:{}}}).doc.fm;
  const card = (n, body, big, unit, sub) => {
    const st = stageOf(n), fm = fmOf(n), has = !!P(n);
    return `<div class="sc5 ${has ? '' : 'empty'}" style="--ac:var(${st.ac});--acs:var(${st.ac}s)">
      <div class="sc5-h" data-go="${n}" title="${st.label} 페이지로"><span class="ix">${n}</span><span class="nm">${st.name}</span>${fm.status ? `<span class="stt">${esc(fm.status)}</span>` : ''}</div>
      ${has ? `<div class="sc5-big"><b>${big}</b><span>${unit}</span>${sub ? `<small>${sub}</small>` : ''}</div><div class="sc5-b">${body}</div>` : `<div class="sc5-b"><p class="muted">아직 산출물이 없습니다</p></div>`}
      <button type="button" class="sc5-go" data-go="${n}">${st.label} 자세히 →</button></div>`;
  };
  const aName = id => { const a = p1 && p1.actions.find(x => x.id === id); return a ? a.name : id; };
  const actBtn = id => `<button type="button" class="sc5-i ${isSel('act', id)}" data-sel="act|${id}"><b>${id}</b>${esc(clip(aName(id), 18))}</button>`;
  const bar = parts => { const n = Math.max(1, parts.reduce((x, p) => x + p[1], 0));
    return `<div class="stack" style="height:8px">${parts.map(p => `<i style="width:${p[1]/n*100}%;background:${p[2]}"></i>`).join('')}</div><div class="sc5-lg">${parts.map(p => `<span><i style="background:${p[2]}"></i>${p[0]} ${p[1]}</span>`).join('')}</div>`; };
  let h = `<div class="sc5-row">`;

  /* 01 업무 구조 */
  let b = '';
  if(p1){
    const c = k => p1.actions.filter(a => a.whoType === k).length;
    b += `<div class="sc5-l">누가 하나</div>${bar([['본인', c('self'), 'var(--self)'], ['요청', c('req'), 'var(--req)'], ['협의', c('co'), 'var(--co)']])}`;
    b += `<div class="sc5-l">핵심 문제 범위</div>${[...f.core].map(actBtn).join('') || '<span class="muted">없음</span>'}`;
  }
  h += card('01', b, p1 ? p1.actions.length : 0, 'Action', p1 ? `Task ${p1.tasks.length}개` : '');
  h += `<div class="sc5-ar">→</div>`;

  /* 02 진단 */
  b = '';
  if(p2){
    const top = p2.issues.slice().sort((x, y) => y.score - x.score).slice(0, 3);
    b += `<div class="sc5-l">점수 큰 Issue</div>${top.map(is => `<button type="button" class="sc5-i ${isSel('issue', is.id)}" data-sel="issue|${is.id}"><b>${is.id}</b><span class="tag g-${esc(is.grade)}">${is.score}</span> ${esc(clip(is.title, 22))}</button>`).join('')}`;
    const tg = p2.issues.filter(is => f.issues.has(is.id));
    if(tg.length) b += `<div class="sc5-l">핵심 문제로 이어진 Issue</div><div class="chips">${tg.map(is => `<span class="chip link ${isSel('issue', is.id)}" data-sel="issue|${is.id}" title="${esc(is.title)}">${is.id} · ${is.score}</span>`).join('')}</div>`;
  }
  const g = c => p2 ? p2.issues.filter(i => i.grade === c).length : 0;
  h += card('02', b, p2 ? p2.issues.length : 0, 'Issue', p2 ? `A ${g('A')} · B ${g('B')} · C ${g('C')}` : '');
  h += `<div class="sc5-ar">→</div>`;

  /* 03 핵심 문제 */
  b = '';
  if(p3){
    const why = bget(p3.attrs, '선정 이유'), freq = bget(p3.attrs, '빈도');
    b += `<button type="button" class="sc5-q ${isSel('target', 'T')}" data-sel="target|T">${esc(clip(p3.statement, 64))}</button>`;
    if(freq) b += `<div class="sc5-l">빈도</div><div class="sc5-t">${esc(clip(freq.v, 50))}</div>`;
    if(why) b += `<div class="sc5-l">선정 이유</div><div class="sc5-t">${esc(clip(why.v, 60))}</div>`;
  }
  h += card('03', b, p3 ? 1 : 0, '핵심 문제', p3 ? `후보 ${p3.cands.length}개 중 선정` : '');
  h += `<div class="sc5-ar">→</div>`;

  /* 04 근본 원인 */
  b = '';
  if(p4){
    const hy = Object.values(p4.hyps), c = re => hy.filter(x => re.test(x.vd)).length;
    b += `<div class="sc5-l">가설 판정</div>${bar([['지지', c(/^지지/), 'var(--good)'], ['부분', c(/부분/), 'var(--s3)'], ['기각', c(/기각/), 'var(--bad)'], ['미검증', c(/미검증/), 'var(--line2)']])}`;
    const rcs = []; (function walk(n){ if(n.rc) rcs.push(n); (n.kids||[]).forEach(walk); })(p4.tree);
    b += `<div class="sc5-l">Root Cause</div>${rcs.map(n => `<button type="button" class="sc5-i rc ${isSel('node', n.id)}" data-sel="node|${esc(n.id)}"><b>★ ${n.rc}</b>${esc(clip(n.text, 40))}</button>`).join('')}`;
    const ops = opps4(p4);
    if(ops.length) b += `<div class="sc5-l">개선 방향</div><div class="chips">${ops.map((o, k) => { const m = o.x.match(/^(O\d+)\.\s*(.*)$/); return `<span class="chip link ${isSel('opp', String(k))}" data-sel="opp|${k}" title="${esc(o.x)}">${m ? m[1] : '→'} ${esc(clip(m ? m[2] : o.x, 16))}</span>`; }).join('')}</div>`;
  }
  h += card('04', b, p4 ? countRC(p4.tree) : 0, 'Root Cause', p4 ? `가설 ${Object.keys(p4.hyps).length}개 검토` : '');
  h += `<div class="sc5-ar">→</div>`;

  /* 05 실행 지식 */
  b = '';
  if(p5){
    const c = {ok:0, doc:0, part:0, guess:0};
    p5.acts.forEach(a => Object.values(a.el).forEach(e => { const k = st5(e.st); if(k) c[k]++; }));
    p5.rules.concat(p5.excs).forEach(x => { const k = st5(x.st); if(k) c[k]++; });
    b += `<div class="sc5-trio"><span><b>${p5.know.length}</b>지식</span><span><b>${p5.rules.length}</b>규칙</span><span><b>${p5.excs.length}</b>예외</span><span><b>${p5.tests.length}</b>재현</span></div>`;
    b += `<div class="sc5-l">확인 상태</div>${bar([['확인', c.ok, 'var(--good)'], ['문서', c.doc, 'var(--s1)'], ['일부 추정', c.part, 'var(--s3)'], ['추정', c.guess, 'var(--line2)']])}`;
    const hum = Object.keys(p5.summary).find(k => /사람 판단/.test(k));
    if(hum) b += `<div class="sc5-l">사람 판단으로 남는 부분</div><div class="sc5-t">${esc(clip(p5.summary[hum], 60))}</div>`;
  }
  h += card('05', b, p5 ? p5.acts.length : 0, '대상 Action', p5 ? p5.acts.map(a => a.id).join(' · ') : '');
  h += `</div>`;
  return h;
}

/* 열린 사항 개수 (불릿 수) */
const openCount = s => Array.isArray(s) ? s.length : (String(s || "").match(/^\s*[-*] /gm) || []).length;

PI.view = function(){
  const p1 = P('01'), p2 = P('02'), p3 = P('03'), p4 = P('04'), p5 = P('05');
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
    ['04', p4 ? countRC(p4.tree) : '—', '근본 원인', p4 ? `가설 ${Object.keys(p4.hyps).length}개 중` : '산출물 없음'],
    ['05', p5 ? p5.acts.length : '—', '실행 지식', p5 ? `지식 ${p5.know.length} · 규칙 ${p5.rules.length} · 예외 ${p5.excs.length}` : '산출물 없음']
  ];
  h += `<div class="pb-funnel"><div class="pb-fk">좁혀 온 과정</div>${steps.map((s, i) => { const st = stageOf(s[0]);
    return `<button type="button" class="fn" data-go="${s[0]}" style="--ac:var(${st.ac});--acs:var(${st.ac}s);--w:${100 - i*15}%"><span class="fn-bar"><b>${s[1]}</b> ${s[2]}</span><span class="fn-sub">${s[3]}</span></button>`; }).join('')}</div></div>`;

  /* ── 2. 단계별 요약 */
  h += summaryCards(p1, p2, p3, p4, p5, f);

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
      <span class="legend"><span><i class="lg core"></i>핵심 문제 범위</span><span><i class="lg rel"></i>연관 범위</span><span><i class="lg ia"></i>A등급 Issue</span><span><i class="lg ib"></i>B·C등급 Issue</span><span><i class="lg none"></i>신호 없음</span>${p5 ? '<span><i class="lg k5"></i>05 실행 지식 정리</span>' : ''}</span>
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
          <span class="ta-id">${a.id.split('-')[1]}</span><span class="ta-n">${esc(a.name)}${a.star?' *':''}</span>${f.score[a.id]?`<span class="ta-s">${f.score[a.id]}</span>`:''}${p5 && p5.acts.some(x => x.id === a.id) ? '<span class="ta-k" title="STEP 05에서 실행 지식을 정리한 Action">05</span>' : ''}</button>`;
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
  const p1 = P('01'), p5 = P('05');
  let h = `<div class="eyebrow" style="color:var(--s0)">WORKFLOW</div><h3>${esc(S.wf || '-')}</h3>`;
  if(p1){ const fm = W()['01'].doc.fm; h += kv([['역할', esc(fm.owner_role)], ['상위 분류', esc(fm.l1_l2)]]); }
  /* 단계별 진행 상태 */
  h += `<div class="lbl">단계별 진행 상태</div><div class="prog5">${['01','02','03','04','05'].map(n => {
    const st = stageOf(n), e = W()[n], p = P(n), op = p && p.open ? openCount(p.open) : 0;
    return `<a class="pg" href="${st.page}" style="--ac:var(${st.ac})"><span class="ix">${n}</span><span class="nm">${st.name}</span>
      <span class="ss">${e ? esc(e.doc.fm.status || '-') : '<span style="color:var(--faint)">없음</span>'}</span>${op ? `<span class="op" title="열린 사항 수">열린 ${op}</span>` : ''}</a>`; }).join('')}</div>`;
  if(p5 && p5.next) h += `<div class="lbl">다음 할 일 · ${esc(p5.nextTitle || '다음 단계')}</div><div class="box md">${md(p5.next)}</div>`;
  else { const p4 = P('04'); if(p4 && p4.next) h += `<div class="lbl">다음 할 일</div><div class="box md">${md(p4.next)}</div>`; }
  if(p1) h += `<div class="lbl">업무 개요</div><div class="box md">${md(p1.overview)}</div>`;
  h += `<div class="lbl">읽는 방법</div><div class="box" style="font-size:12.5px">위는 해결할 문제와 근본 원인, 가운데는 STEP 01~05 요약, 아래는 Task별 업무 지도입니다. 카드 제목을 누르면 그 단계 페이지로 가고, 항목을 누르면 여기에 상세가 나옵니다.</div>`;
  return h;
};

PI.start();
})();
