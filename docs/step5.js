/* STEP 05 — 실행 지식(Verified Execution Knowledge)
   위: 요약(05 md 1장) — 해결하려는 문제, 대상 Action, 검증 상태, 사람 판단으로 남는 부분
   가운데: 앞 단계에서 끌고 온 것(01 Action, 04 Root Cause·개선 방향) → STEP 05에서 정리한 것
           Action × 수행 요소 표(Trigger~Evidence, 05 md 2장) — 칸 색 = 확인·문서·추정
   아래: Knowledge Map(K) · Decision Map(R) · 예외(E), 실제 사례(C)와 검증 기록
   항목을 누르면 연결된 K·R·E·C·Action이 함께 강조되고 오른쪽 패널에 상세가 열린다. */
(function(){
const {S, W, P, esc, md, inline, clip, isSel, opps4, kv, link, expandIds, st5} = PI;

const ELEMS = ['Trigger','Input','Knowledge','Inference','Decision','Exception','Output','Evidence'];
const EL_KO = {Trigger:'시작 조건', Input:'입력', Knowledge:'쓰는 지식', Inference:'추론', Decision:'판단 규칙', Exception:'예외', Output:'결과물', Evidence:'근거 사례'};
const ID_EL = {Knowledge:1, Decision:1, Exception:1, Evidence:1};
const ST_KO = {ok:'확인', doc:'문서', part:'일부 추정', guess:'추정'};
const TYPE = {K:'know', R:'rule', E:'exc', C:'case', F:'inf'};

const aName = id => { const p1 = P('01'); const a = p1 && p1.actions.find(x => x.id === id); return a ? a.name : ''; };
const stTag = s => { const c = st5(s); return c ? `<span class="st5 ${c}" title="${esc(s)}">${ST_KO[c]}</span>` : ''; };

/* 05 안의 ID를 누를 수 있는 칩으로: Action(T#-A#), 04 가설(H#), K·R·E·F·C */
function linkify(html){
  const p4 = P('04');
  return html.replace(/\b(T\d+-A\d+)\b|\b(H\d+(?:-\d+)?)\b|\b([KREFC]\d+)\b/g, (m, a, h, k) => {
    if(a) return `<span class="chip link" data-sel="act|${a}" title="${esc(aName(a))}">${a}</span>`;
    if(h) return p4 && p4.hyps[h] ? `<span class="chip link" data-sel="node|${h}|04" title="${esc(p4.hyps[h].text)}">${h}</span>` : h;
    return `<span class="chip link k5c ${isSel(TYPE[k[0]], k)}" data-sel="${TYPE[k[0]]}|${k}">${k}</span>`;
  });
}
const rich = s => linkify(inline(s || ''));
/* 칸에 적힌 K·R·E·C 번호 ('없음(C1은 …)'처럼 없다고 적은 칸은 빈 것으로) */
const eids = (a, e) => { const v = (a.el[e] || {}).v || ''; return /^없음/.test(v.trim()) ? [] : expandIds(v); };

/* 추론 F1, F2 … : Action의 Inference 칸에서 나눠 꺼냄 */
function infs(p){
  const out = [];
  p.acts.forEach(a => String((a.el.Inference || {}).v || '').split(/\s+\/\s+(?=F\d)/).forEach(x => {
    const m = x.match(/^(F\d+)\.\s*([\s\S]*)$/); if(m) out.push({id:m[1], text:m[2], act:a.id});
  }));
  return out;
}

/* 선택한 항목과 이어진 ID 모음 */
function related(p, sel){
  const r = new Set(); if(!sel) return r;
  const id = sel.id;
  const actHas = (a, el) => eids(a, el).includes(id) || (el === 'Inference' && new RegExp('\\b' + id + '\\b').test((a.el.Inference || {}).v || ''));
  if(sel.type === 'act'){ const a = p.acts.find(x => x.id === id); if(a) ELEMS.forEach(e => eids(a, e).forEach(x => r.add(x))); return r; }
  if(sel.type === 'know'){
    const k = p.know.find(x => x.id === id); if(k) expandIds(k.use).forEach(x => r.add(x));
    p.rules.forEach(x => { if(expandIds(x.know).includes(id)) r.add(x.id); });
    p.acts.forEach(a => { if(actHas(a, 'Knowledge')) r.add(a.id); });
  }
  if(sel.type === 'rule'){
    const x = p.rules.find(y => y.id === id); if(x){ expandIds(x.know).forEach(k => r.add(k)); expandIds(x.cs).forEach(c => r.add(c)); }
    p.know.forEach(k => { if(expandIds(k.use).includes(id)) r.add(k.id); });
    p.acts.forEach(a => { if(actHas(a, 'Decision')) r.add(a.id); });
  }
  if(sel.type === 'exc'){
    const x = p.excs.find(y => y.id === id); if(x) expandIds(x.cs).forEach(c => r.add(c));
    p.acts.forEach(a => { if(actHas(a, 'Exception')) r.add(a.id); });
  }
  if(sel.type === 'case'){
    p.rules.forEach(x => { if(expandIds(x.cs).includes(id)) r.add(x.id); });
    p.excs.forEach(x => { if(expandIds(x.cs).includes(id)) r.add(x.id); });
    p.acts.forEach(a => { if(actHas(a, 'Evidence')) r.add(a.id); });
  }
  if(sel.type === 'inf'){
    p.know.forEach(k => { if(expandIds(k.use).includes(id)) r.add(k.id); });
    p.acts.forEach(a => { if(actHas(a, 'Inference')) r.add(a.id); });
  }
  if(sel.type === 'el'){ const [aid, e] = id.split('~'); const a = p.acts.find(x => x.id === aid); if(a){ r.add(aid); eids(a, e).forEach(x => r.add(x)); } }
  return r;
}

/* 확인·문서·추정 분포 (Action 요소 + 규칙 + 예외) */
function stCount(p){
  const c = {ok:0, doc:0, part:0, guess:0};
  p.acts.forEach(a => ELEMS.forEach(e => { const k = st5((a.el[e] || {}).st); if(k) c[k]++; }));
  p.rules.concat(p.excs).forEach(x => { const k = st5(x.st); if(k) c[k]++; });
  return c;
}
function stBar(c, h){
  const n = Math.max(1, c.ok + c.doc + c.part + c.guess);
  return `<div class="stack" style="height:${h || 10}px">${['ok','doc','part','guess'].map(k => `<i class="b5 ${k}" style="width:${c[k]/n*100}%"></i>`).join('')}</div>
    <div class="legend">${['ok','doc','part','guess'].map(k => `<span><i class="b5 ${k}"></i>${ST_KO[k]} ${c[k]}</span>`).join('')}</div>`;
}

PI.view = function(p){
  const sel = S.sel || {};
  const rel = related(p, S.sel);
  const any = !!S.sel && rel.size > 0;
  const mark = id => (S.sel && S.sel.id === id) ? 'sel' : rel.has(id) ? 'hit' : any ? 'dim' : '';
  const Sm = p.summary;
  let h = '';

  /* ── 1. 요약 (항목 이름 그대로) */
  const keys = Object.keys(Sm);
  const first = keys.find(k => /해결하려는 문제/.test(k)) || keys[0];
  const fm = W()['05'].doc.fm;
  h += `<div class="brief b5wrap"><div class="brief-h">Verified Execution Knowledge <small>05 md 1장 · ${esc(fm.status || '')}${fm.counts ? ' · ' + esc(fm.counts) : ''}</small></div>`;
  if(first) h += `<div class="brief-top"><span class="bk">${esc(first)}</span><p>${rich(Sm[first])}</p></div>`;
  h += `<div class="brief-grid">${keys.filter(k => k !== first).map(k => `<div class="bi ${/사람 판단/.test(k) ? 'em' : ''}"><span class="bk">${esc(k)}</span><div class="bv">${
    /대상 Action/.test(k) ? Sm[k].split(/\s+\/\s+/).map(x => `<div>${rich(x)}</div>`).join('') : rich(Sm[k])}</div></div>`).join('')}
    <div class="bi"><span class="bk">확인 상태 <small style="font-weight:500">Action 요소·규칙·예외</small></span><div class="bv">${stBar(stCount(p))}</div></div></div></div>`;

  /* ── 2. 앞 단계에서 끌고 온 것 → STEP 05에서 정리한 것 */
  const p4 = P('04');
  const rcNodes = []; if(p4) (function walk(n){ if(n.rc) rcNodes.push(n); (n.kids||[]).forEach(walk); })(p4.tree);
  const opps = p4 ? opps4(p4) : [];
  h += `<div class="card v5" style="margin-top:12px"><div class="h">앞 단계에서 끌고 온 것 → STEP 05에서 정리한 것 <small>항목을 누르면 오른쪽에 상세</small></div><div class="b"><div class="path4">`;
  h += `<div class="p4grp in"><div class="p4lab">끌고 온 것</div><div class="p4row">`;
  h += `<div class="p3col"><div class="p3h"><i class="n s1">1</i>대상 Action <small>STEP 01</small></div>${p.acts.map(a =>
    `<button type="button" class="p3item core ${isSel('act', a.id)}" data-sel="act|${a.id}"><b>${a.id}</b>${esc(a.name)}<small>${esc(a.kind)}</small></button>`).join('')}</div>`;
  h += `<div class="p3arrow">→</div>`;
  h += `<div class="p3col"><div class="p3h"><i class="n s4">2</i>Root Cause <small>STEP 04</small></div>${rcNodes.map(n =>
    `<button type="button" class="p3item" data-sel="node|${esc(n.id)}|04"><b>★ ${n.rc}</b>${esc(clip(n.text, 54))}</button>`).join('') || '<span class="chip">STEP 04 산출물 없음</span>'}</div>`;
  h += `<div class="p3arrow">→</div>`;
  h += `<div class="p3col"><div class="p3h"><i class="n s4">3</i>개선 방향 <small>STEP 04</small></div>${opps.map((o, k) => { const m = o.x.match(/^(O\d+)\.\s*(.*)$/);
    return `<button type="button" class="p3item" data-sel="opp|${k}|04"><b>${m ? m[1] : '→'}</b>${esc(clip(m ? m[2] : o.x, 50))}</button>`; }).join('') || '<span class="chip">없음</span>'}</div>`;
  h += `</div></div><div class="p4mid">⇒</div>`;
  const tested = p.tests.length, matched = p.tests.filter(t => /일치|O|✓|예/.test(t.ok) && !/불일치/.test(t.ok)).length;
  h += `<div class="p4grp out"><div class="p4lab">STEP 05에서 정리한 것</div><div class="p4row">`;
  h += `<div class="p3col"><div class="p3h"><i class="n s5">4</i>수행 지식</div><div class="p5n"><b>${p.acts.length}</b> Action × <b>${ELEMS.length}</b> 요소<small>Trigger → … → Evidence</small></div></div>`;
  h += `<div class="p3arrow">→</div>`;
  h += `<div class="p3col"><div class="p3h"><i class="n s5">5</i>지식 · 규칙 · 예외</div><div class="p5n"><b>${p.know.length}</b> 지식 · <b>${p.rules.length}</b> 규칙 · <b>${p.excs.length}</b> 예외<small>아래 Knowledge·Decision Map</small></div></div>`;
  h += `<div class="p3arrow">→</div>`;
  h += `<div class="p3col"><div class="p3h"><i class="n s5">6</i>사례 · 검증</div><div class="p5n"><b>${p.cases.length}</b> 사례 · 재현 <b>${matched}/${tested}</b><small>${tested ? '검증 기록 있음' : '아직 재현 검증 전'}</small></div></div>`;
  h += `</div></div></div></div></div>`;

  /* ── 3. Action × 수행 요소 */
  h += `<div class="mapbar"><b>Action × 수행 요소</b><span class="legend">${['ok','doc','part','guess'].map(k => `<span><i class="lg st5 ${k}"></i>${ST_KO[k]}</span>`).join('')}<span style="color:var(--faint)">칸을 누르면 전체 내용 · K·R·E 번호를 누르면 연결 표시</span></span></div>`;
  h += `<div class="x5wrap"><table class="x5"><thead><tr><th class="x5a">Action</th>${ELEMS.map(e => `<th>${e}<small>${EL_KO[e]}</small></th>`).join('')}</tr></thead><tbody>`;
  p.acts.forEach(a => {
    h += `<tr class="${any ? (rel.has(a.id) || (S.sel.type === 'act' && S.sel.id === a.id) ? 'hit' : 'dim') : ''}"><th class="x5a"><button type="button" class="x5act ${isSel('act', a.id)}" data-sel="act|${a.id}"><b>${a.id}</b>${esc(a.name)}<small>${esc(a.kind)}</small></button></th>`;
    ELEMS.forEach(e => {
      const c = a.el[e] || {v:'', st:''};
      const cls = st5(c.st);
      const body = ID_EL[e]
        ? (eids(a, e).length ? `<div class="x5ids">${eids(a, e).map(x => `<span class="chip link k5c ${mark(x)}" data-sel="${TYPE[x[0]]}|${x}">${x}</span>`).join('')}</div>${c.v.replace(/\b[KREFC]\d+\b|~|,|\s/g,'').length > 2 ? `<div class="x5t">${esc(clip(c.v.replace(/^[KREFC\d~,\s]+/,''), 40))}</div>` : ''}` : `<div class="x5t muted">${esc(c.v || '-')}</div>`)
        : `<div class="x5t">${esc(clip(c.v, e === 'Inference' ? 90 : 70))}</div>`;
      h += `<td class="x5c ${cls} ${isSel('el', a.id + '~' + e)}" data-sel="el|${a.id}~${e}">${body}${cls ? `<span class="st5 ${cls}">${ST_KO[cls]}</span>` : ''}</td>`;
    });
    h += `</tr>`;
  });
  h += `</tbody></table></div>`;

  /* ── 4. Knowledge · Decision · 예외 */
  h += `<div class="k5grid">`;
  h += `<div class="card"><div class="h">Knowledge Map <small>3장 · ${p.know.length}개</small></div><div class="b k5list">${p.know.map(k =>
    `<button type="button" class="k5 ${mark(k.id)}" data-sel="know|${k.id}"><b>${k.id}</b><span class="k5t">${esc(clip(k.text, 64))}<small>${esc(k.kind)} · 문서화 ${esc(k.doc)}${k.cycle ? ' · ' + esc(k.cycle) : ''}</small></span>${/안 됨|미확인/.test(k.doc) ? '<span class="st5 guess">암묵지</span>' : ''}</button>`).join('')}</div></div>`;
  h += `<div class="card"><div class="h">Decision Map <small>4장 · 조건 → 결과 · ${p.rules.length}개${p.prio ? ' · 우선순위 ' + esc(p.prio) : ''}</small></div><div class="b k5list">${p.rules.map(r =>
    `<button type="button" class="k5 ${mark(r.id)}" data-sel="rule|${r.id}"><b>${r.id}</b><span class="k5t">${esc(clip(r.cond, 50))}<small>→ ${esc(clip(r.res, 44))}</small></span>${stTag(r.st)}</button>`).join('')}</div></div>`;
  h += `<div class="card"><div class="h">예외 <small>4장 · ${p.excs.length}개</small></div><div class="b k5list">${p.excs.map(x =>
    `<button type="button" class="k5 ${mark(x.id)}" data-sel="exc|${x.id}"><b>${x.id}</b><span class="k5t">${esc(clip(x.sit, 50))}<small>→ ${esc(clip(x.how, 44))}</small></span>${stTag(x.st)}</button>`).join('')}</div></div>`;
  h += `</div>`;

  /* ── 5. 실제 사례 · 검증 기록 */
  h += `<div class="k5grid two5">`;
  h += `<div class="card"><div class="h">Execution Trace <small>5장 · 실제 사례 ${p.cases.length}건</small></div><div class="b">${p.cases.map(c => {
    const prog = c.b.find(b => /진행/.test(b.k));
    const steps = prog ? prog.v.split(/(?=[①②③④⑤⑥⑦⑧⑨])/).map(s => s.trim()).filter(Boolean) : [];
    return `<button type="button" class="c5 ${mark(c.id)}" data-sel="case|${c.id}"><div class="c5h"><b>${c.id}</b>${esc(c.title)}</div>
      ${steps.length ? `<div class="c5steps">${steps.map(s => `<span>${esc(s)}</span>`).join('<i>→</i>')}</div>` : ''}
      <div class="c5kv">${c.b.filter(b => !/진행/.test(b.k)).map(b => `<span><em>${esc(b.k)}</em>${esc(clip(b.v, 60))}</span>`).join('')}</div>
      ${prog && /미확인|초안/.test(prog.k + prog.v) ? '<span class="st5 guess">진행 초안 · 미확인</span>' : ''}</button>`; }).join('') || '<span class="chip">사례 없음</span>'}</div></div>`;
  h += `<div class="card"><div class="h">검증 기록 <small>6장 · 규칙에 쓰지 않은 사례로 재현</small></div><div class="b">${tested
    ? `<table class="crit-tbl"><thead><tr><th>사례</th><th>상황</th><th>AI 예측</th><th>실제</th><th>일치</th></tr></thead><tbody>${p.tests.map(t => `<tr><td>${rich(t.cs)}</td><td>${esc(t.input)}</td><td>${rich(t.pred)}</td><td>${esc(t.real)}</td><td>${esc(t.ok)}</td></tr>`).join('')}</tbody></table>`
    : `<div class="t5empty"><b>0 / 0</b>아직 시험하지 않음<small>사례 재현(Validation) 전입니다. 오른쪽 열린 사항을 먼저 채웁니다.</small></div>`}</div></div>`;
  h += `</div>`;
  return h;
};

/* 05 고유 항목의 오른쪽 패널 */
PI.insp = function(sel){
  const p = P('05'); if(!p) return '';
  const id = sel.id;
  const ey = t => `<div class="eyebrow" style="color:var(--s5)">${t}</div>`;
  const usedBy = (list, field) => list.filter(x => expandIds(x[field]).includes(id));
  const actsWith = el => p.acts.filter(a => eids(a, el).includes(id) || (el === 'Inference' && new RegExp('\\b' + id + '\\.').test((a.el.Inference || {}).v || '')));
  const actChips = list => list.length ? `<div class="chips">${list.map(a => `<span class="chip link" data-sel="act|${a.id}">${a.id} ${esc(a.name)}</span>`).join('')}</div>` : '<div class="box" style="color:var(--faint)">없음</div>';
  const itemList = (list, type, f) => list.length ? list.map(x => `<div class="box i5" data-sel="${type}|${x.id}"><b>${x.id}</b> ${f(x)}</div>`).join('') : '<div class="box" style="color:var(--faint)">없음</div>';

  if(sel.type === 'act'){
    const a = p.acts.find(x => x.id === id); if(!a) return '';
    return `${ey(`ACTION · ${a.id} · ${esc(a.kind)}`)}<h3>${esc(a.name)}</h3>
      <div style="margin-top:10px">${link('act', a.id, '01', 'STEP 01에서 보기 →')}</div>
      <div class="lbl">수행 설명 ${a.descNote ? `<small style="font-weight:500;color:var(--faint)">(${esc(a.descNote)})</small>` : ''}</div><div class="box">${rich(a.desc)}</div>
      ${ELEMS.map(e => { const c = a.el[e]; return c ? `<div class="lbl">${e} · ${EL_KO[e]} ${stTag(c.st)}</div><div class="box">${rich(c.v.split(/\s+\/\s+/).join('<br>'))}</div>` : ''; }).join('')}`;
  }
  if(sel.type === 'el'){
    const [aid, e] = id.split('~'); const a = p.acts.find(x => x.id === aid); const c = a && a.el[e]; if(!c) return '';
    return `${ey(`${esc(aid)} · ${e}`)}<h3>${EL_KO[e]}</h3><div style="margin-top:6px">${stTag(c.st)} <small style="color:var(--faint)">${esc(c.st)}</small></div>
      <div class="lbl">내용</div><div class="box">${rich(c.v.split(/\s+\/\s+/).join('<br><br>'))}</div>
      <div class="lbl">Action</div>${actChips([a])}`;
  }
  if(sel.type === 'know'){
    const k = p.know.find(x => x.id === id); if(!k) return '';
    return `${ey(`KNOWLEDGE · ${k.id}`)}<h3>${esc(clip(k.text, 40))}</h3>
      ${k.text.length > 40 ? `<div class="lbl">지식 내용</div><div class="box">${rich(k.text)}</div>` : ''}
      ${kv([['종류', esc(k.kind)], ['어디에 있나', rich(k.where)], ['문서화', esc(k.doc)], ['변경 주기', esc(k.cycle)], ['쓰이는 곳', rich(k.use)]])}
      <div class="lbl">이 지식을 쓰는 규칙</div>${itemList(usedBy(p.rules, 'know'), 'rule', r => `${esc(r.cond)} <small>→ ${esc(r.res)}</small>`)}
      <div class="lbl">이 지식을 쓰는 Action</div>${actChips(actsWith('Knowledge'))}`;
  }
  if(sel.type === 'rule'){
    const r = p.rules.find(x => x.id === id); if(!r) return '';
    const ks = expandIds(r.know).map(k => p.know.find(x => x.id === k)).filter(Boolean);
    return `${ey(`DECISION RULE · ${r.id}`)}<h3>${esc(r.cond)}</h3>
      <div class="lbl">결과</div><div class="box"><b>→</b> ${rich(r.res)}</div>
      ${kv([['상태', stTag(r.st) + ' ' + esc(r.st)], ['근거 사례', rich(r.cs)]])}
      <div class="lbl">쓰는 지식</div>${itemList(ks, 'know', k => esc(clip(k.text, 90)))}
      <div class="lbl">이 규칙을 쓰는 Action</div>${actChips(actsWith('Decision'))}`;
  }
  if(sel.type === 'exc'){
    const x = p.excs.find(y => y.id === id); if(!x) return '';
    return `${ey(`EXCEPTION · ${x.id}`)}<h3>${rich(x.sit)}</h3>
      <div class="lbl">처리</div><div class="box">${rich(x.how)}</div>
      ${kv([['상태', stTag(x.st) + ' ' + esc(x.st)], ['근거 사례', rich(x.cs)]])}
      <div class="lbl">이 예외가 생기는 Action</div>${actChips(actsWith('Exception'))}`;
  }
  if(sel.type === 'case'){
    const c = p.cases.find(x => x.id === id); if(!c) return '';
    return `${ey(`EXECUTION TRACE · ${c.id}`)}<h3>${esc(c.title)}</h3>
      ${c.b.map(b => `<div class="lbl">${esc(b.k || '메모')}</div><div class="box">${rich(b.v).replace(/\s(?=[②③④⑤⑥⑦⑧⑨])/g, '<br>')}${b.sub.length ? '<ul style="margin:4px 0 0;padding-left:16px">' + b.sub.map(s => `<li>${rich(s)}</li>`).join('') + '</ul>' : ''}</div>`).join('')}
      <div class="lbl">이 사례를 근거로 한 규칙·예외</div>${usedBy(p.rules, 'cs').length + usedBy(p.excs, 'cs').length
        ? itemList(usedBy(p.rules, 'cs'), 'rule', r => esc(r.cond)).replace(/<div class="box" style="color:var\(--faint\)">없음<\/div>/, '') + itemList(usedBy(p.excs, 'cs'), 'exc', x => esc(x.sit)).replace(/<div class="box" style="color:var\(--faint\)">없음<\/div>/, '')
        : '<div class="box" style="color:var(--faint)">없음</div>'}
      <div class="lbl">Action</div>${actChips(actsWith('Evidence'))}`;
  }
  if(sel.type === 'inf'){
    const f = infs(p).find(x => x.id === id); if(!f) return '';
    return `${ey(`INFERENCE · ${f.id}`)}<h3>추론 단계</h3><div class="box" style="margin-top:10px">${rich(f.text)}</div>
      <div class="lbl">이 추론에 쓰는 지식</div>${itemList(p.know.filter(k => expandIds(k.use).includes(id)), 'know', k => esc(clip(k.text, 90)))}
      <div class="lbl">Action</div>${actChips(p.acts.filter(a => a.id === f.act))}`;
  }
  return '';
};

PI.inspDefault = function(){
  const p = P('05'); if(!p) return '';
  const fm = W()['05'].doc.fm;
  return `<div class="eyebrow" style="color:var(--s5)">검증 상태 · ${esc(fm.status || '')}</div><h3>확인 · 문서 · 추정</h3>
    <div style="margin-top:10px">${stBar(stCount(p), 12)}</div>
    ${kv([['우선순위', esc(p.prio)], ['용어 정의', esc(p.terms)], ['출처', esc(fm.sources)]])}
    <div class="lbl">열린 사항</div><div class="box md">${md(p.open)}</div>
    ${p.next ? `<div class="lbl">${esc(p.nextTitle || '다음 단계')}</div><div class="box md">${md(p.next)}</div>` : ''}`;
};

PI.start();
})();
