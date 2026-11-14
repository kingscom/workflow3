/* STEP 04 — 근본 원인(Root Cause)
   위: Problem Definition Brief(04 md 1장)를 항목 이름과 함께 그대로 보여줌
   가운데: 앞 단계에서 끌고 온 것(① 업무 범위 Action ② 관련 진단 Issue ③ 핵심 문제·고객이 짐작한 원인)
           → STEP 04에서 밝힌 것(④ 원인 가설 검증 ⑤ Root Cause ⑥ 개선 방향)
   아래: Root Cause Map(04 md 2장) 트리
   오른쪽 기본 패널: 가설 판정 분포, 성공 기준 상세(5장), 열린 사항 */
(function(){
const {S, W, P, esc, md, inline, bget, ids, clip, isSel, vdClass, opps4, RE_ACT, RE_ISS} = PI;

function treeHTML(n){
  if(n.root) return `<ul class="tree"><li><span class="node root">[문제] ${esc(n.text)}</span>${n.kids.length?'<ul>'+n.kids.map(treeHTML).join('')+'</ul>':''}</li></ul>`;
  return `<li><button type="button" class="node ${vdClass(n.vd)} ${n.rc?'rc':''} ${isSel('node',n.id)}" data-sel="node|${esc(n.id)}">
    ${n.rc?`<span class="rcb">★ ${n.rc}</span>`:''}<span class="nid">${esc(n.id||'')}</span><span class="ntx">${esc(n.text)}</span>
    ${n.vd?`<span class="vd">${esc(n.vd)}${n.st?' · 근거 '+esc(n.st):''}</span>`:''}${n.cons?'<span class="cons">제약</span>':''}</button>
    ${n.kids.length?'<ul>'+n.kids.map(treeHTML).join('')+'</ul>':''}</li>`;
}
const split = s => String(s || '').split(/\s+\/\s+/).map(x => x.trim()).filter(Boolean);
const vdTone = v => /부분/.test(v) ? 'part' : /^지지/.test(v) ? 'ok' : /기각/.test(v) ? 'no' : 'unk';

/* Action ID를 누를 수 있는 칩으로 */
function actChips(text, p1){
  return esc(text).replace(/T\d+-A\d+/g, id => {
    const a = p1 && p1.actions.find(x => x.id === id);
    return `<span class="chip link" data-sel="act|${id}" title="${esc(a ? a.name : '')}">${id}</span>`;
  });
}

PI.view = function(p){
  const p1 = P('01'), p2 = P('02'), p3 = P('03');
  const B = p.brief;
  let h = '';

  /* ── 1. Problem Definition Brief (항목 이름 그대로) */
  const rows = Object.keys(B);
  if(rows.length){
    const first = rows.find(k => /선정된 문제/.test(k)) || rows[0];
    h += `<div class="brief"><div class="brief-h">Problem Definition Brief <small>04 md 1장 · ${esc(W()['04'].doc.fm.status || '')}</small></div>`;
    h += `<div class="brief-top"><span class="bk">${esc(first)}</span><p>${inline(B[first])}</p></div><div class="brief-grid">`;
    rows.filter(k => k !== first).forEach(k => {
      const v = B[k];
      let body;
      if(/Root Cause/i.test(k)) body = v.split(/\s+\/\s+(?=RC\d)/).map(x => { const m = x.match(/^(RC\d+)\.?\s*(.*)$/);
        const n = m && findRC(p.tree, m[1]); return m ? `<button type="button" class="b-rc ${n ? isSel('node', n.id) : ''}" ${n ? `data-sel="node|${esc(n.id)}"` : ''}><b>★ ${m[1]}</b>${inline(m[2])}</button>` : inline(x); }).join('');
      else if(/업무 범위/.test(k)) body = actChips(v, p1);
      else if(/개선 기회|성공 기준|전제/.test(k) && split(v).length > 1) body = `<ul>${split(v).map(x => `<li>${inline(x)}</li>`).join('')}</ul>`;
      else body = inline(v);
      h += `<div class="bi ${/Root Cause|개선 기회/i.test(k) ? 'em' : ''}"><span class="bk">${esc(k)}</span><div class="bv">${body}</div></div>`;
    });
    h += `</div></div>`;
  }

  /* ── 2. 앞 단계에서 끌고 온 것 → STEP 04에서 밝힌 것 */
  const core = ids(B['업무 범위'], RE_ACT);
  const rel = ids(p.next, RE_ACT).filter(a => !core.includes(a));
  const relIss = p3 ? ids((bget(p3.attrs, '관련 진단')||{}).v, RE_ISS) : [];
  const guess = p3 ? bget(p3.attrs, '짐작') : null;
  const hyps = Object.values(p.hyps);
  const fromCustomer = hyps.filter(x => /고객/.test(x.src || ''));
  const rcNodes = []; (function walk(n){ if(n.rc) rcNodes.push(n); (n.kids||[]).forEach(walk); })(p.tree);
  const opps = opps4(p);
  const aName = id => { const a = p1 && p1.actions.find(x => x.id === id); return a ? a.name : ''; };

  h += `<div class="card" style="margin-top:12px"><div class="h">앞 단계에서 끌고 온 것 → STEP 04에서 밝힌 것 <small>항목을 누르면 오른쪽에 상세</small></div><div class="b"><div class="path4">`;
  /* 끌고 온 것 */
  h += `<div class="p4grp in"><div class="p4lab">끌고 온 것</div><div class="p4row">`;
  h += `<div class="p3col"><div class="p3h"><i class="n s1">1</i>업무 범위 <small>STEP 01</small></div>
    ${core.map(a => `<button type="button" class="p3item core ${isSel('act', a)}" data-sel="act|${a}"><b>${a}</b>${esc(aName(a))}</button>`).join('')}
    ${rel.length ? `<div class="p4sub">연관 Action</div><div class="chips">${rel.map(a => `<span class="chip link" data-sel="act|${a}" title="${esc(aName(a))}">${a}</span>`).join('')}</div>` : ''}</div>`;
  h += `<div class="p3arrow">→</div>`;
  h += `<div class="p3col"><div class="p3h"><i class="n s2">2</i>관련 진단 Issue <small>STEP 02</small></div>
    ${relIss.length ? relIss.map(id => { const is = p2 && p2.issues.find(x => x.id === id);
      return is ? `<button type="button" class="p3item ${isSel('issue', id)}" data-sel="issue|${id}"><b>${id}</b><span class="tag g-${esc(is.grade)}">${is.score}</span> ${esc(clip(is.title, 40))}</button>`
                : `<div class="p3item warn"><b>${id}</b>02 진단에 없는 번호</div>`; }).join('') : '<span class="chip">없음</span>'}</div>`;
  h += `<div class="p3arrow">→</div>`;
  h += `<div class="p3col"><div class="p3h"><i class="n s3">3</i>핵심 문제 <small>STEP 03</small></div>
    ${p3 ? `<button type="button" class="p3item core" data-sel="target|T">${esc(clip(p3.statement, 60))}</button>` : '<span class="chip">STEP 03 산출물 없음</span>'}
    ${guess && guess.v && !/^없음/.test(guess.v) ? `<div class="p4guess"><span>고객이 짐작한 원인</span>${esc(clip(guess.v.replace(/\(미검증\)/,''), 40))}
      ${fromCustomer.map(x => `<button type="button" class="p4v ${vdTone(x.vd)}" data-sel="node|${esc(x.id)}">→ ${esc(x.id)} ${esc(x.vd.split(' ')[0])}</button>`).join('')}</div>` : ''}</div>`;
  h += `</div></div>`;
  h += `<div class="p4mid">⇒</div>`;
  /* 밝힌 것 */
  const cnt = re => hyps.filter(x => re.test(x.vd)).length;
  h += `<div class="p4grp out"><div class="p4lab">STEP 04에서 밝힌 것</div><div class="p4row">`;
  h += `<div class="p3col"><div class="p3h"><i class="n s4">4</i>원인 가설 검증</div>
    <div class="p4hyp"><b>${hyps.length}</b>개 가설 → 지지 ${cnt(/^지지/)} · 부분 ${cnt(/부분/)} · 기각 ${cnt(/기각/)} · 미검증 ${cnt(/미검증/)}</div>
    <div class="p4dots">${hyps.map(x => `<button type="button" class="p4v ${vdTone(x.vd)} ${isSel('node', x.id)}" data-sel="node|${esc(x.id)}" title="${esc(x.text)} — ${esc(x.vd)}">${esc(x.id)}</button>`).join('')}</div></div>`;
  h += `<div class="p3arrow">→</div>`;
  h += `<div class="p3col"><div class="p3h"><i class="n s4">5</i>Root Cause</div>
    ${rcNodes.map(n => `<button type="button" class="p3item core ${isSel('node', n.id)}" data-sel="node|${esc(n.id)}"><b>★ ${n.rc}</b>${esc(clip(n.text, 60))}<small>${esc(n.id)} · ${esc(n.vd)}${n.st ? ' · 근거 ' + esc(n.st) : ''}</small></button>`).join('') || '<span class="chip">없음</span>'}</div>`;
  h += `<div class="p3arrow">→</div>`;
  h += `<div class="p3col"><div class="p3h"><i class="n s4">6</i>개선 방향</div>
    ${opps.map((o, k) => { const m = o.x.match(/^(O\d+)\.\s*(.*)$/);
      return `<button type="button" class="p3item ${isSel('opp', String(k))}" data-sel="opp|${k}"><b>${m ? m[1] : '→'}</b>${esc(clip(m ? m[2] : o.x, 56))}<small>${o.rc.id}에 대응</small></button>`; }).join('') || '<span class="chip">없음</span>'}</div>`;
  h += `</div></div></div></div></div>`;

  /* ── 3. Root Cause Map */
  h += `<div class="card" style="margin-top:12px"><div class="h">Root Cause Map <small>04 md 2장 · ★ = Root Cause · 초록 = 지지 · 회색 취소선 = 기각 · 노드를 누르면 검증 기록</small></div><div class="b" style="overflow-x:auto">${p.tree.text ? treeHTML(p.tree) : `<pre>${esc(p.treeRaw)}</pre>`}</div></div>`;

  /* ── 4. 성공 기준 */
  if(p.crit.length){
    h += `<div class="card" style="margin-top:12px"><div class="h">성공 기준 <small>04 md 5장 · 개선 목표 ${p.crit.filter(c => !/유지/.test(c.type)).length}개 · 유지 조건 ${p.crit.filter(c => /유지/.test(c.type)).length}개</small></div><div class="b"><table class="crit-tbl">
      <thead><tr><th>종류</th><th>지표</th><th>현재 수준</th><th></th><th>목표</th><th>확인 방법</th></tr></thead><tbody>
      ${p.crit.map(c => `<tr class="${/유지/.test(c.type) ? 'keep' : 'goal'}"><td><span class="ty">${esc(c.type)}</span></td><td class="m">${actChips(c.metric || '', p1)}</td>
        <td class="now">${esc(c.now || '-')}</td><td class="ar">→</td><td class="gl">${esc(c.goal || '-')}</td><td class="how">${esc(c.how || '-')}</td></tr>`).join('')}
      </tbody></table></div></div>`;
  }
  return h;
};
function findRC(t, rc){ let r = null; (function walk(n){ if(n.rc === rc) r = n; (n.kids||[]).forEach(walk); })(t); return r; }

PI.inspDefault = function(){
  const p4 = P('04'); if(!p4) return '';
  const hy = Object.values(p4.hyps), n = hy.length || 1;
  const cnt = re => hy.filter(x => re.test(x.vd)).length;
  const ok = cnt(/^지지/), part = cnt(/부분/), no = cnt(/기각/), unk = cnt(/미검증/);
  return `<div class="eyebrow" style="color:var(--s4)">검증 상태 · ${esc(W()['04'].doc.fm.status||'')}</div><h3>가설 ${hy.length}개 검토</h3>
    <div class="stack" style="height:12px;margin-top:12px"><i style="width:${ok/n*100}%;background:var(--good)"></i><i style="width:${part/n*100}%;background:var(--s3)"></i><i style="width:${no/n*100}%;background:var(--bad)"></i><i style="width:${unk/n*100}%;background:var(--line2)"></i></div>
    <div class="legend"><span><i style="background:var(--good)"></i>지지 ${ok}</span><span><i style="background:var(--s3)"></i>부분 지지 ${part}</span><span><i style="background:var(--bad)"></i>기각 ${no}</span><span><i style="background:var(--line2)"></i>미검증 ${unk}</span></div>
    <div class="lbl">열린 사항</div><div class="box md">${md(p4.open)}</div>`;
};

PI.start();
})();
