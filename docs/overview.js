/* 전체(한눈에 보기) 페이지 */
(function(){
const {S, W, P, stageOf, esc, md, bget, ids, clip, isSel, countRC, opps4, kv, RE_ACT, RE_ISS} = PI;

function sortAct(a, b){ const x = a.match(/\d+/g).map(Number), y = b.match(/\d+/g).map(Number); return x[0]-y[0] || x[1]-y[1]; }

PI.view = function(){
  const p1 = P('01'), p2 = P('02'), p3 = P('03'), p4 = P('04');
  const fc = (id, k, big, unit, sub, q) => {
    const s = stageOf(id);
    return `<button type="button" class="fc ${W()[id]?'':'none'}" data-go="${id}" style="--ac:var(${s.ac});--acs:var(${s.ac}s)">
      <span class="k">${s.label} · ${k}</span><span class="big"><b>${big}</b><span>${unit}</span></span><span class="sub">${sub}</span>${q?`<span class="q">${esc(clip(q, 56))}</span>`:''}</button>`;
  };
  let h = `<div class="chead"><h2>한눈에 보기</h2><span class="d">업무 전체에서 하나의 근본 원인까지 좁혀 온 과정 · 카드를 누르면 해당 단계 페이지로 이동</span></div><div class="flow">`;
  h += p1 ? fc('01','업무 구조', p1.actions.length, 'Actions', `Task ${p1.tasks.length}개 · 미확인 ${p1.actions.filter(a=>a.star).length}개 · 요청/협의 ${p1.actions.filter(a=>a.whoType!=='self').length}개`, p1.seq.join(' → ')) : fc('01','업무 구조','—','','산출물 없음');
  if(p2){
    const top = p2.issues[0], g = c => p2.issues.filter(i=>i.grade===c).length;
    h += fc('02','문제 가설', p2.issues.length, 'Issues', `A ${g('A')} · B ${g('B')} · C ${g('C')} · 최고 ${top?top.score:'-'}점`, top ? `${top.id}. ${top.title}` : '');
  } else h += fc('02','문제 가설','—','','산출물 없음 (선택 단계)');
  h += p3 ? fc('03','핵심 문제', 1, `/ 후보 ${p3.cands.length}`, `제외 ${p3.cands.filter(c=>/제외/.test(c.res)).length}개`, p3.statement) : fc('03','핵심 문제','—','','산출물 없음');
  if(p4){
    const rcs = Object.values(p4.rcs), hy = Object.values(p4.hyps);
    h += fc('04','근본 원인', countRC(p4.tree), `/ 가설 ${hy.length}`, `지지 ${hy.filter(x=>/^지지/.test(x.vd)).length} · 기각 ${hy.filter(x=>/기각/.test(x.vd)).length}`, rcs[0] ? `${rcs[0].id}. ${rcs[0].title}` : '');
  } else h += fc('04','근본 원인','—','','산출물 없음');
  h += '</div>';

  /* 추적 경로: 근본 원인이 어느 업무·진단에서 왔는지 */
  const actIds = new Set();
  if(p3) ids(JSON.stringify(p3.attrs.filter(a => /범위/.test(a.k))), RE_ACT).forEach(x => actIds.add(x));
  if(p4){ ids(p4.brief['업무 범위'], RE_ACT).forEach(x => actIds.add(x)); ids(p4.next, RE_ACT).forEach(x => actIds.add(x)); }
  const issIds = p3 ? ids((bget(p3.attrs,'관련 진단')||{}).v, RE_ISS) : [];
  const rcNodes = []; (function walk(n){ if(n.rc) rcNodes.push(n); (n.kids||[]).forEach(walk); })(p4 ? p4.tree : {});
  const opps = p4 ? opps4(p4) : [];
  const actName = id => { const a = p1 && p1.actions.find(x => x.id === id); return a ? a.name : ''; };
  const issT = id => { const i = p2 && p2.issues.find(x => x.id === id); return i ? i.title : ''; };
  const colH = (stage, t) => `<h4 style="--ac:var(${stageOf(stage).ac})"><i></i>${t}</h4>`;
  const node = (stage, type, id, label, text) => `<button type="button" class="tnode ${isSel(type,id)}" style="--ac:var(${stageOf(stage).ac})" data-sel="${type}|${id}" title="${esc(text)}"><span class="id">${esc(label)}</span>${esc(clip(text, 64))}</button>`;
  const none = '<span class="chip">없음</span>';
  if(actIds.size || issIds.length || rcNodes.length){
    h += `<div class="card" style="margin-top:16px"><div class="h">추적 경로 <small>근본 원인이 어느 업무·진단에서 왔는지 · 항목을 누르면 오른쪽에 상세</small></div><div class="b"><div class="trace">
      <div class="tcol">${colH('01','관련 Action')}${[...actIds].sort(sortAct).map(a => node('01','act',a,a,actName(a))).join('') || none}</div>
      <div class="tcol">${colH('02','관련 진단 Issue')}${issIds.map(i => node('02','issue',i,i,issT(i))).join('') || none}</div>
      <div class="tcol">${colH('03','Target Problem')}${p3 ? node('03','target','T','선정',p3.statement) : none}</div>
      <div class="tcol">${colH('04','Root Cause')}${rcNodes.map(n => node('04','node',n.id,n.rc,n.text)).join('') || none}</div>
      <div class="tcol">${colH('04','개선 방향')}${opps.map((o,k) => { const m = o.x.match(/^(O\d+)\.\s*(.*)$/); return node('04','opp',String(k), m?m[1]:'→', m?m[2]:o.x); }).join('') || none}</div>
    </div></div></div>`;
  }
  return h;
};

PI.inspDefault = function(){
  const p1 = P('01');
  let h = `<div class="eyebrow" style="color:var(--s0)">WORKFLOW</div><h3>${esc(S.wf || '-')}</h3>`;
  if(p1){ const fm = W()['01'].doc.fm; h += kv([['역할', esc(fm.owner_role)], ['상위 분류', esc(fm.l1_l2)]]) + `<div class="lbl">개요</div><div class="box md">${md(p1.overview)}</div>`; }
  h += `<div class="lbl">불러온 산출물</div><div class="filelist">${['01','02','03','04'].map(n => { const e = W()[n]; return `<div><span>${n} ${e?`<code>${esc(e.doc.fm.schema||'')}</code>`:'<span style="color:var(--faint)">없음</span>'}</span><span>${e?esc(e.doc.fm.status||''):''}</span></div>`; }).join('')}</div>`;
  const sk = Object.keys(S.skills).sort();
  h += `<div class="lbl">스킬 정의</div><div class="filelist">${sk.length ? sk.map(n => `<div><span>${esc(S.skills[n].dir)}</span><span>SKILL.md</span></div>`).join('') : '<div><span style="color:var(--faint)">스킬 폴더를 읽지 않았습니다 (workflow3 폴더 전체를 선택하면 표시)</span></div>'}</div>`;
  return h;
};

PI.start();
})();
