/* STEP 01 — As-Is 업무 구조 */
(function(){
const {S, P, esc, inline, isSel} = PI;

PI.view = function(p){
  const p2 = P('02'), a2i = p2 ? p2.act2iss : {};
  let h = `<div class="legend" style="margin-bottom:12px">
    <span><i style="background:var(--self)"></i>본인</span><span><i style="background:var(--req)"></i>요청</span><span><i style="background:var(--co)"></i>협의</span>
    <span><i style="border:1.5px dashed var(--faint)"></i>미확인(*) 추정</span>
    ${p2?'<span><span style="font-size:10.5px;font-weight:800;color:var(--s4);background:var(--s4s);border-radius:99px;padding:0 6px">2</span> 연결된 진단 Issue 수</span>':''}
    <span style="margin-left:auto;color:var(--faint)">Action을 누르면 상세</span></div><div class="tasks">`;
  p.tasks.forEach(t => {
    h += `<div class="task"><div class="th"><b>${t.id}</b><span>${esc(t.name)}</span></div>`;
    t.actions.forEach(a => {
      const n = (a2i[a.id]||[]).length;
      h += `<button type="button" class="an ${a.star?'star':''} ${isSel('act',a.id)}" style="--who:var(--${a.whoType})" data-sel="act|${a.id}" title="${esc(a.does)}">
        <span class="aid">${a.id.split('-')[1]}</span><span class="anm">${esc(a.name)}${a.star?' *':''}</span>${n?`<span class="iss">${n}</span>`:''}</button>`;
    });
    h += '</div>';
  });
  h += '</div><div class="flowbar">';
  h += `<div class="card"><div class="h">기본 순서</div><div class="b"><div class="seq">${p.seq.map((t,i)=>`${i?'<em>→</em>':''}<b>${t}</b>`).join('')}</div>${p.parallel?`<div style="margin-top:8px;font-size:12.5px;color:var(--muted)"><b style="color:var(--text)">병렬</b> ${esc(p.parallel)}</div>`:''}</div></div>`;
  if(p.loops.length) h += `<div class="card"><div class="h">되돌아감 <small>${p.loops.length}곳</small></div><div class="b">${p.loops.map(l => `<div class="loop"><span class="ft">${esc(l.from||'')} ↩ ${esc(l.to.join('·'))}</span><span>${esc(l.text)}</span></div>`).join('')}</div></div>`;
  h += '</div>';
  return h;
};

PI.inspDefault = function(){
  const p1 = P('01'); if(!p1) return '';
  const c = t => p1.actions.filter(a => a.whoType === t).length, total = p1.actions.length || 1;
  const tools = {}; p1.actions.forEach(a => a.tool.split(/[·,]/).map(x=>x.trim()).filter(Boolean).forEach(x => tools[x] = (tools[x]||0)+1));
  const tl = Object.entries(tools).sort((a,b)=>b[1]-a[1]).slice(0,8);
  return `<div class="eyebrow" style="color:var(--s1)">요약</div><h3>Task ${p1.tasks.length}개 · Action ${p1.actions.length}개</h3>
    <div class="lbl">하는 사람</div><div class="stack"><i style="width:${c('self')/total*100}%;background:var(--self)"></i><i style="width:${c('req')/total*100}%;background:var(--req)"></i><i style="width:${c('co')/total*100}%;background:var(--co)"></i></div>
    <div class="legend"><span><i style="background:var(--self)"></i>본인 ${c('self')}</span><span><i style="background:var(--req)"></i>요청 ${c('req')}</span><span><i style="background:var(--co)"></i>협의 ${c('co')}</span></div>
    <div class="lbl">많이 쓰는 도구</div>${tl.map(([k,v]) => `<div class="axis" style="grid-template-columns:120px 1fr 22px"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(k)}">${esc(k)}</span><span class="bg"><i style="width:${v/tl[0][1]*100}%;background:var(--s1)"></i></span><b>${v}</b></div>`).join('')}
    ${p1.links.length?`<div class="lbl">Task 간 연결</div><div class="box md"><ul style="margin:0;padding-left:16px">${p1.links.map(l=>`<li>${inline(l)}</li>`).join('')}</ul></div>`:''}
    <div class="lbl">열린 사항</div><div class="box md"><ul style="margin:0;padding-left:16px">${p1.open.map(o=>`<li>${inline(o)}</li>`).join('')}</ul></div>`;
};

PI.start();
})();
