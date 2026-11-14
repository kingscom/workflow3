/* STEP 03 — 핵심 문제(Target Problem) */
(function(){
const {W, P, esc, md, inline, bget, isSel} = PI;

PI.view = function(p){
  const main = ['업무 범위','발생 시점','빈도','선정 이유','고객이 짐작하는 원인','관련 진단 Issue'];
  let h = `<div class="hero"><div class="k">TARGET PROBLEM <span class="res pick">${esc(W()['03'].doc.fm.status || '')}</span></div><p>${inline(p.statement)}</p></div><div class="attrs">`;
  main.forEach(k => {
    const b = bget(p.attrs, k);
    if(b) h += `<div class="attr"><div class="k">${esc(b.k)}</div><div class="v">${inline(b.v)}${b.sub.length?'<ul style="margin:4px 0 0;padding-left:16px">'+b.sub.map(s=>`<li>${inline(s)}</li>`).join('')+'</ul>':''}</div></div>`;
  });
  h += '</div><div class="two" style="margin-top:12px">';
  const imp = bget(p.attrs, '영향'), ex = bget(p.attrs, '최근 사례');
  h += `<div class="card"><div class="h">영향</div><div class="b">${imp ? `<ul class="md" style="margin:0;padding-left:18px">${(imp.sub.length?imp.sub:[imp.v]).map(s=>`<li>${inline(s)}</li>`).join('')}</ul>` : '-'}${ex?`<div class="lbl">최근 사례</div><div class="box">${inline(ex.v)}</div>`:''}</div></div>`;
  h += `<div class="card"><div class="h">후보 → 선정 <small>${p.cands.length}개 중 1개</small></div><div class="b"><div class="funnel">`;
  p.cands.forEach(c => {
    const cls = /선정/.test(c.res) ? 'pick' : /제외/.test(c.res) ? 'out' : 'next';
    h += `<button type="button" class="cand ${cls==='next'?'':cls} ${isSel('cand',c.id)}" data-sel="cand|${c.id}"><b>${esc(c.id)}</b><span>${esc(c.text)}<br><span style="font-size:11px;color:var(--faint)">출처: ${esc(c.src)}</span></span><span class="res ${cls}">${esc(c.res.split(':')[0])}</span></button>`;
  });
  h += `</div>${p.note?`<div class="md" style="font-size:12px;color:var(--faint);margin-top:8px">${md(p.note)}</div>`:''}</div></div></div>`;
  return h;
};

PI.inspDefault = function(){
  const p3 = P('03'); if(!p3) return '';
  return `<div class="eyebrow" style="color:var(--s3)">열린 사항</div><h3>확인이 더 필요한 것</h3><div class="box md" style="margin-top:10px">${md(p3.open)}</div>
    <p style="color:var(--faint);font-size:12px;margin-top:14px">후보를 누르면 출처가 된 진단 Issue와 메모를 볼 수 있습니다.</p>`;
};

PI.start();
})();
