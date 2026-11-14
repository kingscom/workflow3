/* STEP 04 — 근본 원인(Root Cause) */
(function(){
const {W, P, esc, md, inline, isSel, vdClass, opps4} = PI;

function treeHTML(n){
  if(n.root) return `<ul class="tree"><li><span class="node root">[문제] ${esc(n.text)}</span>${n.kids.length?'<ul>'+n.kids.map(treeHTML).join('')+'</ul>':''}</li></ul>`;
  return `<li><button type="button" class="node ${vdClass(n.vd)} ${n.rc?'rc':''} ${isSel('node',n.id)}" data-sel="node|${esc(n.id)}">
    ${n.rc?`<span class="rcb">★ ${n.rc}</span>`:''}<span class="nid">${esc(n.id||'')}</span><span class="ntx">${esc(n.text)}</span>
    ${n.vd?`<span class="vd">${esc(n.vd)}${n.st?' · 근거 '+esc(n.st):''}</span>`:''}${n.cons?'<span class="cons">제약</span>':''}</button>
    ${n.kids.length?'<ul>'+n.kids.map(treeHTML).join('')+'</ul>':''}</li>`;
}

PI.view = function(p){
  let h = `<div class="card"><div class="h">Root Cause Map <small>★ = Root Cause · 초록 = 지지 · 회색 취소선 = 기각 · 노드를 누르면 검증 기록</small></div><div class="b" style="overflow-x:auto">${p.tree.text ? treeHTML(p.tree) : `<pre>${esc(p.treeRaw)}</pre>`}</div></div><div class="cards3">`;
  let opps = opps4(p).map((o, k) => ({x:o.x, k}));
  if(!opps.length && p.brief['개선 기회']) opps = p.brief['개선 기회'].split(' / ').map(x => ({x}));
  h += `<div class="card"><div class="h">개선 방향</div><div class="b">${opps.map(o => { const m = o.x.match(/^(O\d+)\.\s*(.*)$/);
    return `<div class="opp ${o.k!=null?isSel('opp',String(o.k)):''}" ${o.k!=null?`data-sel="opp|${o.k}" style="cursor:pointer"`:''}>${m?`<b>${m[1]}</b>${inline(m[2])}`:inline(o.x)}</div>`; }).join('') || '-'}</div></div>`;
  h += `<div class="card"><div class="h">성공 기준</div><div class="b">${p.crit.map(c => `<div class="crit"><span class="ty ${/유지/.test(c.type)?'keep':''}">${esc(c.type)}</span><span>${inline(c.metric)}<small>현재 ${esc(c.now)} → ${esc(c.goal)}</small></span></div>`).join('') || '-'}</div></div>`;
  const cons = p.brief['전제·제약'] || '';
  h += `<div class="card"><div class="h">전제·제약</div><div class="b">${cons ? `<ul class="md" style="margin:0;padding-left:18px">${cons.split(' / ').map(x=>`<li>${inline(x)}</li>`).join('')}</ul>` : '-'}</div></div>`;
  h += '</div>';
  return h;
};

PI.inspDefault = function(){
  const p4 = P('04'); if(!p4) return '';
  const hy = Object.values(p4.hyps), n = hy.length || 1;
  const cnt = re => hy.filter(x => re.test(x.vd)).length;
  const ok = cnt(/^지지/), part = cnt(/부분/), no = cnt(/기각/), unk = cnt(/미검증/);
  return `<div class="eyebrow" style="color:var(--s4)">검증 상태 · ${esc(W()['04'].doc.fm.status||'')}</div><h3>가설 ${hy.length}개 검토</h3>
    <div class="stack" style="height:12px;margin-top:12px"><i style="width:${ok/n*100}%;background:var(--good)"></i><i style="width:${part/n*100}%;background:var(--s3)"></i><i style="width:${no/n*100}%;background:var(--bad)"></i><i style="width:${unk/n*100}%;background:var(--line2)"></i></div>
    <div class="legend"><span><i style="background:var(--good)"></i>지지 ${ok}</span><span><i style="background:var(--s3)"></i>부분 지지 ${part}</span><span><i style="background:var(--bad)"></i>기각 ${no}</span><span><i style="background:var(--line2)"></i>미검증 ${unk}</span></div>
    ${p4.brief['검증 상태']?`<div class="lbl">검증 상태</div><div class="box">${inline(p4.brief['검증 상태'])}</div>`:''}
    <div class="lbl">열린 사항</div><div class="box md">${md(p4.open)}</div>`;
};

PI.start();
})();
