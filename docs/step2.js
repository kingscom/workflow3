/* STEP 02 — Workflow 진단 */
(function(){
const {S, P, esc, md, isSel} = PI;

PI.view = function(p){
  let h = `<div class="card" style="margin-bottom:14px"><div class="h">종합 인사이트</div><div class="b insight md">${md(p.insight)}</div></div><div class="two w02">`;
  if(p.heat){
    const max = Math.max(...p.heat.rows.map(r=>r.total), 1);
    h += `<div class="card"><div class="h">Task별 신호 히트맵 <small>0 없음 ~ 3 강함 · Task를 누르면 관련 Issue만 표시</small></div><div class="b" style="overflow-x:auto"><table class="heat"><thead><tr><th>Task</th>${p.heat.areas.map(a=>`<th>${esc(a)}</th>`).join('')}<th>합계</th></tr></thead><tbody>`;
    p.heat.rows.forEach(r => {
      h += `<tr class="${S.filter===r.id?'on':''}"><td class="tn" data-filter="${r.id}" title="${esc(r.task)}">${esc(r.task)}</td>${r.vals.map(v=>`<td class="v${Math.max(0,Math.min(3,v||0))}">${isNaN(v)?'-':v}</td>`).join('')}<td class="tot"><span class="tbar" style="width:${Math.round(r.total/max*22)}px"></span>${r.total}</td></tr>`;
    });
    h += '</tbody></table></div></div>';
  } else h += '<div></div>';
  h += `<div class="card"><div class="h">Issue 우선순위 <small>점수 = (영향도×0.4 + 신호×0.3 + 개선×0.3)×20</small></div><div class="b">`;
  p.issues.forEach(is => {
    const dim = S.filter && !is.acts.some(a => a.startsWith(S.filter + '-'));
    h += `<button type="button" class="irow ${dim?'dim':''} ${isSel('issue',is.id)}" data-sel="issue|${is.id}">
      <span class="iid">${is.id}</span><span><span class="ttl">${esc(is.title)}</span><span class="area">${esc(is.area)} · ${is.acts.length}개 Action</span></span>
      <span class="sbar"><span class="bg"><i style="width:${is.score}%;background:var(--g${is.grade})"></i></span><b>${is.score}</b><span class="tag g-${esc(is.grade)}">${esc(is.grade)}</span></span>
      <span class="conf" title="확신도">${esc(is.conf)}</span></button>`;
  });
  h += '</div></div></div>';
  return h;
};

PI.inspDefault = function(){
  const p2 = P('02'); if(!p2) return '';
  return `<div class="eyebrow" style="color:var(--s2)">구조 요약</div><h3>Issue ${p2.issues.length}개</h3><div class="box md" style="margin-top:10px">${md(p2.structure)}</div>
    <div class="lbl">진단의 한계</div><div class="box md">${md(p2.limits)}</div><div class="lbl">다음 단계</div><div class="box md">${md(p2.next)}</div>
    <p style="color:var(--faint);font-size:12px;margin-top:14px">Issue를 누르면 점수 구성과 근거, 관련 Action을 볼 수 있습니다.</p>`;
};

PI.start();
})();
