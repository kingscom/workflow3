/* STEP 03 — 핵심 문제(Target Problem)
   위: 합의한 문제 정의문
   가운데: 끌고 온 경로 ① 업무 범위 Action(03 '업무 범위') → ② 관련 진단 Issue(03 '관련 진단 Issue' + 02 Issue List)
           → ③ 문제 후보(03 '문제 후보 비교') → ④ 핵심 문제
   아래: Task·Action 지도(01, 업무 순서)에 경로를 색칠 + 후보 목록
   오른쪽 기본 패널: 발생 시점·빈도·영향·최근 사례·선정 이유 등 Target Problem 속성과 열린 사항 */
(function(){
const {S, W, P, esc, md, inline, bget, ids, clip, isSel, RE_ACT, RE_ISS} = PI;

/* 03이 가리키는 Action·Issue 모으기 */
function trace(p){
  const p1 = P('01'), p2 = P('02');
  const scope = ids((bget(p.attrs, '업무 범위')||{}).v, RE_ACT);
  const relRaw = (bget(p.attrs, '관련 진단')||{}).v || '';
  /* "I3(기능 분류 일관성), I7(...)" → 03에 적힌 설명도 함께 */
  const notes = {}; (relRaw.match(/I\d+\s*\([^)]*\)/g) || []).forEach(m => { const x = m.match(/(I\d+)\s*\(([^)]*)\)/); notes[x[1]] = x[2]; });
  const relIds = ids(relRaw, RE_ISS);
  const issues = relIds.map(id => ({id, note: notes[id] || '', is: p2 ? p2.issues.find(x => x.id === id) : null}));
  const issActs = new Set(); issues.forEach(x => x.is && x.is.acts.forEach(a => issActs.add(a)));
  const pick = p.cands.find(c => /선정/.test(c.res));
  const act = id => p1 && p1.actions.find(a => a.id === id);
  return {scope, issues, issActs, pick, act, p1, p2};
}

PI.view = function(p){
  const t = trace(p);
  const sel = S.sel || {};
  /* 선택에 따라 지도에서 추가로 강조할 Action */
  let hit = null;
  if(sel.type === 'issue' && t.p2){ const is = t.p2.issues.find(x => x.id === sel.id); if(is) hit = new Set(is.acts); }
  if(sel.type === 'cand'){ const c = p.cands.find(x => x.id === sel.id); const iid = c && ids(c.src, RE_ISS)[0]; const is = iid && t.p2 && t.p2.issues.find(x => x.id === iid); hit = is ? new Set(is.acts) : (c && /고객/.test(c.src) ? new Set(t.scope) : new Set()); }

  /* ── 문제 정의 */
  let h = `<div class="hero"><div class="k">TARGET PROBLEM · 이번에 집중 분석할 문제 <span class="res pick">${esc(W()['03'].doc.fm.status || '')}</span></div><p>${inline(p.statement)}</p></div>`;

  /* ── 끌고 온 경로 */
  h += `<div class="card" style="margin-top:12px"><div class="h">이 문제는 어디서 왔나 <small>왼쪽에서 오른쪽으로 · 항목을 누르면 아래 지도와 오른쪽 패널에 표시</small></div><div class="b"><div class="path3">`;
  h += `<div class="p3col"><div class="p3h"><i class="n">1</i>업무 범위 <small>STEP 01 Action</small></div>${t.scope.length ? t.scope.map(id => { const a = t.act(id);
      return `<button type="button" class="p3item core ${isSel('act', id)}" data-sel="act|${id}"><b>${id}</b>${esc(a ? a.name : '')}${a ? `<small>${a.task}. ${esc(a.taskName)}</small>` : ''}</button>`; }).join('') : '<span class="chip">03에 업무 범위 Action ID 없음</span>'}</div>`;
  h += `<div class="p3arrow">→</div>`;
  h += `<div class="p3col"><div class="p3h"><i class="n">2</i>관련 진단 Issue <small>STEP 02</small></div>${t.issues.length ? t.issues.map(x => x.is
      ? `<button type="button" class="p3item ${isSel('issue', x.id)}" data-sel="issue|${x.id}"><b>${x.id}</b><span class="tag g-${esc(x.is.grade)}">${x.is.score}</span> ${esc(clip(x.is.title, 48))}${x.note ? `<small>03에 적힌 설명: ${esc(x.note)}</small>` : ''}</button>`
      : `<div class="p3item warn"><b>${x.id}</b>02 진단에 없는 번호${x.note ? `<small>03에 적힌 설명: ${esc(x.note)}</small>` : ''}</div>`).join('') : '<span class="chip">없음</span>'}</div>`;
  h += `<div class="p3arrow">→</div>`;
  const out = p.cands.filter(c => /제외/.test(c.res)).length, next = p.cands.filter(c => !/제외|선정/.test(c.res)).length;
  h += `<div class="p3col"><div class="p3h"><i class="n">3</i>문제 후보 <small>STEP 03 인터뷰</small></div>
      <div class="p3funnel"><span><b>${p.cands.length}</b> 후보</span><span>제외 <b>${out}</b>${next ? ` · 다음 후보 <b>${next}</b>` : ''}</span><span>선정 <b>1</b></span></div>
      ${t.pick ? `<button type="button" class="p3item core ${isSel('cand', t.pick.id)}" data-sel="cand|${t.pick.id}"><b>${esc(t.pick.id)}</b>선정 · 출처 ${esc(t.pick.src)}</button>` : ''}</div>`;
  h += `<div class="p3arrow">→</div>`;
  const reason = bget(p.attrs, '선정 이유');
  h += `<div class="p3col tgt"><div class="p3h"><i class="n">4</i>핵심 문제</div><div class="p3item core" data-sel="target|T" style="cursor:pointer">${esc(clip(p.statement, 70))}</div>${reason ? `<small class="p3why">선정 이유: ${esc(clip(reason.v, 60))}</small>` : ''}</div>`;
  h += `</div></div></div>`;

  /* ── Task·Action 지도 (업무 순서) */
  if(t.p1){
    h += `<div class="mapbar"><b>Task·Action 지도</b><span class="legend"><span><i class="lg core"></i>핵심 문제 업무 범위</span><span><i class="lg rel"></i>관련 진단 Issue의 Action</span><span><i class="lg none"></i>그 외</span>${hit ? '<span><i class="lg" style="outline:2px solid var(--s2)"></i>지금 선택한 항목과 연결</span>' : ''}</span></div><div class="tmap3">`;
    t.p1.tasks.forEach(task => {
      const lv = a => t.scope.includes(a.id) ? 'core' : t.issActs.has(a.id) ? 'rel' : 'none';
      const on = task.actions.some(a => lv(a) !== 'none') || (hit && task.actions.some(a => hit.has(a.id)));
      h += `<div class="tm3 ${on ? '' : 'off'}"><div class="tm3-h"><b>${task.id}</b>${esc(task.name)}</div>${task.actions.map(a =>
        `<button type="button" class="ta lv-${lv(a)} ${hit ? (hit.has(a.id) ? 'hit' : '') : ''} ${isSel('act', a.id)}" data-sel="act|${a.id}" title="${esc(a.id + ' ' + a.name + ' — ' + a.does)}"><span class="ta-id">${a.id.split('-')[1]}</span><span class="ta-n">${esc(a.name)}</span></button>`).join('')}</div>`;
    });
    h += `</div>`;
  }

  /* ── 후보 목록 (영향·최근 사례는 오른쪽 패널) */
  h += `<div class="card" style="margin-top:12px"><div class="h">후보 → 선정 <small>${p.cands.length}개 중 1개 · 누르면 출처 Issue의 Action을 지도에 표시</small></div><div class="b"><div class="funnel cand-grid">`;
  p.cands.forEach(c => {
    const cls = /선정/.test(c.res) ? 'pick' : /제외/.test(c.res) ? 'out' : 'next';
    h += `<button type="button" class="cand ${cls==='next'?'':cls} ${isSel('cand',c.id)}" data-sel="cand|${c.id}"><b>${esc(c.id)}</b><span>${esc(c.text)}<br><span style="font-size:11px;color:var(--faint)">출처: ${esc(c.src)}</span></span><span class="res ${cls}">${esc(c.res.split(':')[0])}</span></button>`;
  });
  h += `</div>${p.note?`<div class="md" style="font-size:12px;color:var(--faint);margin-top:8px">${md(p.note)}</div>`:''}</div></div>`;
  return h;
};

PI.inspDefault = function(){
  const p3 = P('03'); if(!p3) return '';
  const keys = ['업무 범위','발생 시점','빈도','영향','최근 사례','선정 이유','고객이 짐작하는 원인','관련 진단 Issue'];
  return `<div class="eyebrow" style="color:var(--s3)">TARGET PROBLEM 속성</div><h3>${esc(clip(p3.statement, 60))}</h3>
    ${keys.map(k => { const b = bget(p3.attrs, k); return b ? `<div class="lbl">${esc(b.k)}</div><div class="box">${inline(b.v)}${b.sub.length?'<ul style="margin:4px 0 0;padding-left:16px">'+b.sub.map(s=>`<li>${inline(s)}</li>`).join('')+'</ul>':''}</div>` : ''; }).join('')}
    <div class="lbl">열린 사항</div><div class="box md">${md(p3.open)}</div>`;
};

PI.start();
})();
