/* STEP 02 — Workflow 진단
   한 장의 히트맵: 가로 = Task별 Action(01 md), 세로 = 진단 영역 6개 + Issue(점수 큰 순)
   - 영역 점수: 02 md '6. Action별 진단표'에 Action마다 영역 점수(0~100)와 종합이 있으면 Action 칸마다 표시.
     없으면(예전 형식) '3. Task별 진단 요약'의 Task 점수를 그 Task의 Action 칸에 걸쳐 표시
   - Issue 칸: 02 md '4. Issue List'의 관련 Action = 진한 칸, '6. Action별 진단표'에서만 연결 = 연한 점
   항목을 누르면 오른쪽 패널에 상세가 표시된다. */
(function(){
const {S, P, esc, md, clip} = PI;

function actNum(id){ const x = id.match(/\d+/g).map(Number); return x[0]*1000 + x[1]; }

/* 01 md가 있으면 그 구조를, 없으면 Issue에 나온 Action ID로 열을 만든다 */
function columns(p2){
  const p1 = P('01');
  if(p1) return p1.tasks.map(t => ({id:t.id, name:t.name, acts:t.actions.map(a => ({id:a.id, name:a.name, star:a.star}))}));
  const all = new Set(); p2.issues.forEach(i => i.acts.forEach(a => all.add(a))); Object.keys(p2.actDiag).forEach(a => all.add(a));
  const byT = {};
  [...all].sort((a,b) => actNum(a) - actNum(b)).forEach(a => { const t = a.split('-')[0]; (byT[t] = byT[t] || []).push({id:a, name:a}); });
  const heatName = id => { const r = p2.heat && p2.heat.rows.find(x => x.id === id); return r ? r.task.replace(/^T\d+\.\s*/,'') : ''; };
  return Object.entries(byT).map(([id, acts]) => ({id, name:heatName(id), acts}));
}

PI.view = function(p){
  const cols = columns(p);
  const issues = p.issues.slice().sort((a,b) => b.score - a.score);
  const main = {}, sub = {};
  issues.forEach(is => { main[is.id] = new Set(is.acts); sub[is.id] = new Set(); });
  Object.entries(p.actDiag).forEach(([a, d]) => d.iss.forEach(i => { if(main[i] && !main[i].has(a)) sub[i].add(a); }));

  /* 선택에 따른 강조 */
  const sel = S.sel || {};
  const hlCols = new Set(), hlRows = new Set();
  if(sel.type === 'issue' && main[sel.id]){ hlRows.add(sel.id); main[sel.id].forEach(a => hlCols.add(a)); sub[sel.id].forEach(a => hlCols.add(a)); }
  if(sel.type === 'act'){ hlCols.add(sel.id); issues.forEach(is => { if(main[is.id].has(sel.id) || sub[is.id].has(sel.id)) hlRows.add(is.id); }); }
  if(sel.type === 'task'){ const t = cols.find(c => c.id === sel.id); if(t) t.acts.forEach(a => hlCols.add(a.id)); issues.forEach(is => { if([...main[is.id], ...sub[is.id]].some(a => a.startsWith(sel.id + '-'))) hlRows.add(is.id); }); }
  const anySel = hlCols.size || hlRows.size;
  const colCls = (a, first) => (first ? 'first ' : '') + (hlCols.has(a) ? 'colhl' : anySel ? 'dimc' : '');

  const taskTop = id => { const r = p.heat && p.heat.rows.find(x => x.id === id); return r && !isNaN(r.total) ? r.total : null; };
  const flat = cols.flatMap(t => t.acts.map((a, i) => ({...a, task:t.id, first:i === 0})));
  const totalCols = flat.length + 1;

  let h = `<div class="ins-line ${INS_OPEN?'open':''}" id="insLine" title="눌러서 펼치기/접기"><b class="k">종합 인사이트</b><div class="md">${md(p.insight)}</div><span class="more">${INS_OPEN?'접기 ▲':'펼치기 ▼'}</span></div>`;
  h += `<div class="hm-legend"><b style="color:var(--text)">Task·Action × 진단 히트맵</b>
    ${p.hasActScores
      ? `<span><span class="qscale"><i class="q1"></i><i class="q2"></i><i class="q3"></i><i class="q4"></i></span>영역 점수 1~29 · 30~49 · 50~74 · 75~100 (Action 단위)</span>`
      : `<span><i style="background:var(--h1)"></i><i style="background:var(--h2)"></i><i style="background:var(--h3)"></i>영역 신호 (Task 단위)</span>`}
    <span><i style="background:var(--gA)"></i>A등급 Issue의 관련 Action</span><span><i style="background:var(--gB)"></i>B등급</span>
    <span><i style="background:var(--gA);opacity:.32;border-radius:50%;width:10px;height:10px"></i>Action별 진단표에서만 연결</span>
    <span style="margin-left:auto;color:var(--faint)">Task·Action 이름이나 Issue를 누르면 연결된 칸이 강조되고 상세가 열립니다</span></div>`;

  /* 표를 본문 폭에 맞춰 늘림: 이름 칸은 고정, Action 열은 남는 폭을 똑같이 나눔 */
  h += `<div class="hm-wrap"><table class="hm"><colgroup><col class="hm-labcol">${flat.map(() => '<col>').join('')}</colgroup><thead>`;
  /* 1행: Task 묶음 */
  h += `<tr><th class="lab" rowspan="2">세로: 진단 영역 · Issue<br>가로: Task → Action</th>${cols.map(t =>
    `<th class="tg ${hlCols.size && t.acts.every(a => hlCols.has(a.id)) ? 'colhl' : ''}" colspan="${t.acts.length}" data-sel="task|${t.id}" title="${esc(t.id + '. ' + t.name)}${taskTop(t.id) != null ? ' · ' + esc(p.heat.totalLabel) + ' ' + taskTop(t.id) : ''}"><b>${t.id}</b>${esc(t.name)}</th>`).join('')}</tr>`;
  /* 2행: Action 이름(세로 글씨) */
  h += `<tr>${flat.map(a => `<th class="ah ${a.star?'star':''} ${colCls(a.id, a.first)}" data-sel="act|${a.id}" title="${esc(a.id + ' ' + a.name)}"><span>${esc(clip(a.name, 12))}</span><small>${a.id.split('-')[1]}</small></th>`).join('')}</tr></thead><tbody>`;

  if(p.hasActScores){
    /* Action 단위 영역 점수 + 종합 */
    h += `<tr class="sec"><td colspan="${totalCols}">Action별 영역 점수 <small>0(없음)~100(강함) · 빈 칸 = 0 · 02 md 6장 Action별 진단표</small></td></tr>`;
    const cell = (a, v, extra) => {
      const d = p.actDiag[a.id];
      const dim = anySel && !hlCols.has(a.id);
      return `<td class="sv q${PI.scoreLevel(v)} ${a.first?'first':''} ${dim?'dimc':''} ${extra||''}" data-sel="act|${a.id}" title="${esc(a.id + ' ' + a.name + (d && d.diag ? '\n' + d.diag : ''))}">${v == null || isNaN(v) ? '' : v}</td>`;
    };
    p.areaNames.forEach((area, ai) => {
      h += `<tr><td class="lab alab">${esc(area)}</td>${flat.map(a => { const d = p.actDiag[a.id]; return cell(a, d && d.scores ? d.scores[ai] : null); }).join('')}</tr>`;
    });
    h += `<tr class="tot"><td class="lab alab">종합</td>${flat.map(a => { const d = p.actDiag[a.id]; return cell(a, d ? d.total : null); }).join('')}</tr>`;
  } else if(p.heat){
    /* 예전 형식: Task 단위 신호 */
    const sc = p.heat.scale;
    h += `<tr class="sec"><td colspan="${totalCols}">진단 영역 신호 <small>Task별 최고 점수 0~${sc} · 02 md 3장</small></td></tr>`;
    p.heat.areas.forEach((area, ai) => {
      h += `<tr><td class="lab alab">${esc(area)}</td>${cols.map(t => {
        const r = p.heat.rows.find(x => x.id === t.id); const v = r ? r.vals[ai] : NaN;
        const vv = isNaN(v) ? 0 : Math.max(0, Math.min(3, sc === 100 ? Math.ceil(v / 34) : v));
        return `<td class="area v${vv} ${hlCols.size && !t.acts.some(a => hlCols.has(a.id)) ? 'dimc' : ''}" colspan="${t.acts.length}" data-sel="task|${t.id}" style="cursor:pointer">${isNaN(v) ? '' : v || ''}</td>`;
      }).join('')}</tr>`;
    });
  }

  /* Issue 행 */
  h += `<tr class="sec"><td colspan="${totalCols}">Issue × Action <small>점수 큰 순 · 진한 칸 = Issue List의 관련 Action, 연한 점 = Action별 진단표에서 연결 · 02 md 4·6장</small></td></tr>`;
  issues.forEach(is => {
    const rowCls = hlRows.has(is.id) ? 'rowhl' : (anySel ? 'dimrow' : '');
    h += `<tr class="${rowCls}"><td class="lab ${anySel && !hlRows.has(is.id) ? 'dimc' : ''}"><div class="ilab" data-sel="issue|${is.id}" title="${esc(is.title)}">
      <b>${is.id}</b><span class="sc"><i style="width:${is.score}%;background:var(--g${esc(is.grade)})"></i></span><span class="tag g-${esc(is.grade)}">${is.score}</span><span class="tt">${esc(is.title)}</span></div></td>`;
    flat.forEach(a => {
      const m = main[is.id].has(a.id), s = sub[is.id].has(a.id);
      const dim = anySel && !(hlRows.has(is.id) && hlCols.has(a.id));
      h += `<td class="c ${a.first?'first':''} ${hlCols.has(a.id) && !hlRows.has(is.id) ? 'colhl' : ''} ${dim && (m||s) ? 'dimc' : ''}" ${m||s ? `data-sel="issue|${is.id}" title="${esc(is.id + ' ↔ ' + a.id + ' ' + a.name)}"` : ''}>${m ? `<i class="m-${esc(is.grade)}"></i>` : s ? `<i class="s m-${esc(is.grade)}"></i>` : ''}</td>`;
    });
    h += '</tr>';
  });
  h += `</tbody></table></div>`;
  return h;
};

PI.inspDefault = function(){
  const p2 = P('02'); if(!p2) return '';
  return `<div class="eyebrow" style="color:var(--s2)">구조 요약</div><h3>Issue ${p2.issues.length}개</h3><div class="box md" style="margin-top:10px">${md(p2.structure)}</div>
    <div class="lbl">진단의 한계</div><div class="box md">${md(p2.limits)}</div><div class="lbl">다음 단계</div><div class="box md">${md(p2.next)}</div>
    <p style="color:var(--faint);font-size:12px;margin-top:14px">히트맵에서 Task·Action 이름이나 Issue를 누르면 여기에 상세가 표시됩니다.</p>`;
};

let INS_OPEN = false;
PI.bind = function(root){
  const el = root.querySelector('#insLine');
  if(el) el.onclick = () => { INS_OPEN = !INS_OPEN; PI.rerender(); };
};

PI.start();
})();
