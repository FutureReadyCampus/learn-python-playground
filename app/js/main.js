'use strict';
/* ───────── 상태 ───────── */
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
let li=0,lv=LEVELS[0],view,running=false,ctl={abort:false},nid=1,unlocked=0;
let solved=new Set(),codeStore={};
try{solved=new Set(JSON.parse(store.get('bp-solved','[]')));codeStore=JSON.parse(store.get('bp-code','{}'))}catch(e){}
unlocked=Math.min(LEVELS.length-1,+store.get('bp-unlocked3',0)||0);
li=unlocked;
let ADMIN=store.get('bp-admin','0')=='1';
const U=()=>ADMIN?LEVELS.length-1:unlocked;       // 관리자 모드에서는 모든 잠금이 없어요
const exData={};window.exOn=false;                   // 유닛 설명 데이터와 설명 화면 여부 (js/explain.js)
const F=(n,...a)=>fx[n]?fx[n](...a):wait(90/spd);   // WebGL이 없으면 연출 없이 잠깐 쉬어요
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const starter=()=>lv.starter||`# ${lv.name}\n# 아래에 파이썬 코드를 써 보세요\n\n`;

/* ───────── 블록 (Tour) ─────────
   블록은 lessons/blocks.json 의 정의대로 만들어지고, 실행할 때는 파이썬 코드로 바꿔서 코드 코스와 같은 실행기로 돌려요.
   노드: {id, t(종류), v:[칩 값들], body?, orelse?} */
const opts=(t,i)=>(lv.conds&&['if','ifelse','while'].includes(t))?lv.conds:BK[t].chips[i];
const tplDefault=t=>BK[t].tpl.replace(/\{(\d)\}/g,(m,i)=>opts(t,+i)[0]);
function mkNode(t){const b=BK[t],n={id:'n'+nid++,t,v:(b.chips||[]).map((_,i)=>opts(t,i)[0])};if(b.body)n.body=[];if(b.orelse)n.orelse=[];return n}
const nodeText=n=>BK[n.t].tpl.replace(/\{(\d)\}/g,(m,i)=>n.v[i]);
function lines(list,ind,out){for(const n of list){const b=BK[n.t],pad='    '.repeat(ind);out.push({id:n.id,s:pad+nodeText(n)});
  if(b.body){if(n.body.length)lines(n.body,ind+1,out);else out.push({id:n.id,s:pad+'    pass'})}
  if(b.orelse){out.push({id:n.id,s:pad+'else:'});if(n.orelse.length)lines(n.orelse,ind+1,out);else out.push({id:n.id,s:pad+'    pass'})}}return out}
const pyText=()=>$('#ta').value.trim()||'# (비어 있음)';
/* 파이썬 코드 → 블록 (시작 코드와 정답 보기에 써요). 긴 틀부터 맞춰 봐요 */
const TPLS=Object.entries(BK).map(([t,b])=>({t,re:new RegExp('^'+b.tpl.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\\\{(\d)\\\}/g,'(.+?)')+'$')})).sort((a,b)=>BK[b.t].tpl.length-BK[a.t].tpl.length);
function lineToNode(s){
  for(const{t,re}of TPLS){const m=s.match(re);if(!m)continue;const n=mkNode(t);
    if(m.slice(1).every((v,i)=>opts(t,i).includes(v))){n.v=m.slice(1);return n}}
  return null}
function parseBlocks(text){
  const rows=text.split('\n').filter(l=>l.trim()&&!l.trim().startsWith('#')&&l.trim()!='pass').map(l=>({ind:(l.match(/^ */)[0].length/4)|0,s:l.trim()}));
  let i=0;
  const block=ind=>{const out=[];
    while(i<rows.length&&rows[i].ind==ind){const r=rows[i++];
      if(r.s=='else:'){const prev=out[out.length-1];if(prev.t=='if')prev.t='ifelse';prev.orelse=i<rows.length&&rows[i].ind>ind?block(ind+1):[];continue}
      const n=lineToNode(r.s);if(!n)throw new Error('블록으로 바꿀 수 없는 줄: '+r.s);
      if(n.body&&i<rows.length&&rows[i].ind>ind)n.body=block(ind+1);
      out.push(n)}
    return out};
  return block(0)}

const col=s=>esc(s).replace(/\b(for|in|while|if|else|not|pass)\b/g,'<span class=k>$1</span>').replace(/\b(range)\b/g,'<span class=f>$1</span>').replace(/\b(\d+)\b/g,'<span class=n>$1</span>').replace(/(# .*)$/,'<span class=c>$1</span>');

/* 코드 편집기 (입문편·활용편): 글자 뒤에 색칠한 층을 깔고 투명한 textarea를 겹쳐요 */
const KW=/\b(for|in|while|if|elif|else|def|class|not|and|or|pass|break|continue|return|True|False|None|self|try|except|finally|with|as|raise)\b/g,
  FN=/\b(move_forward|turn_left|turn_right|collect_gem|toggle_switch|is_on_gem|is_blocked|is_blocked_left|is_blocked_right|is_on_closed_switch|range|print|len|list|Expert|Character|Block|Stair|Gem|Switch|Portal|Coordinate|turn_lock_up|turn_lock_down|place|all_coordinates)\b/g;
function colLine(l){const i=l.indexOf('#'),c=i<0?l:l.slice(0,i),m=i<0?'':l.slice(i);
  return esc(c).replace(KW,'<span class=k>$1</span>').replace(FN,'<span class=f>$1</span>').replace(/\b(\d+)\b/g,'<span class=n>$1</span>')+(m?`<span class=c>${esc(m)}</span>`:'')}
let codeTimer;
function edUpdate(){
  const ta=$('#ta'),v=ta.value,ls=v.split('\n'),ed=$('#ed'),lh=parseFloat(getComputedStyle(ta).lineHeight)||21;
  $('#hlp').innerHTML=ls.map((l,i)=>`<div class="cl" data-id="L${i+1}">${colLine(l)||'&#8203;'}</div>`).join('');
  $('#gut').innerHTML=ls.map((_,i)=>`<div>${i+1}</div>`).join('');
  ta.style.height=Math.max((ls.length+2)*lh+20,ed.clientHeight)+'px';
  ta.style.width=`max(100%, calc(${Math.max(...ls.map(l=>l.length))}ch + 40px))`;
  codeStore[lv.id]=v;clearTimeout(codeTimer);codeTimer=setTimeout(()=>store.set('bp-code',JSON.stringify(codeStore)),400);
  let c=pyCount?pyCount(v):null;if(c<0)c=null;
  $('#cnt').textContent=c===null?'명령 -':`명령 ${c}${lv.max?' / '+lv.max:''}`;$('#cnt').classList.toggle('full',c!==null&&!!lv.max&&c>=lv.max);
}
function setMode(){
  $('#editor').classList.add('codemode');
  $('#snippets').hidden=lv.course.mode!='blocks';
  $('#ta').value=codeStore[lv.id]??starter();edUpdate();
}
function setTa(val,pos){const ta=$('#ta');ta.value=val;ta.setSelectionRange(pos,pos);edUpdate()}
const conditionLabels={
  is_blocked:"앞이 막혔으면",
  is_on_closed_switch:"아직 켜지지 않은 스위치 위라면",
};
const snippetText=(k,condition)=>condition?`if ${condition}():`:tplDefault(k);
function insertSnippet(k,condition){
  const ta=$('#ta'),v=ta.value,s=ta.selectionStart,e=ta.selectionEnd;
  const lineStart=v.lastIndexOf('\n',s-1)+1,line=v.slice(lineStart,s),indent=line.match(/^ */)[0];
  const prefix=line.trim()?'\n'+indent:'',body=!!BK[k].body;
  let text=prefix+snippetText(k,condition)+(body?'\n'+indent+'    ':'\n'+indent);
  const pos=s+text.length;
  if(BK[k].orelse)text+='\n'+indent+'else:\n'+indent+'    pass';
  setTa(v.slice(0,s)+text+v.slice(e),pos);ta.focus();
}
$('#pal').addEventListener('click',e=>{const b=e.target.closest('[data-snip]');if(b&&!running)insertSnippet(b.dataset.snip,b.dataset.condition)});
function indentSel(d){
  const ta=$('#ta'),v=ta.value,s=ta.selectionStart,e=ta.selectionEnd,ls=v.lastIndexOf('\n',s-1)+1;let le=v.indexOf('\n',e);if(le<0)le=v.length;
  if(d>0&&s==e){const n=4-((s-ls)%4);setTa(v.slice(0,s)+' '.repeat(n)+v.slice(s),s+n);return}
  const first=v.slice(ls,le).split('\n')[0],rm=d<0?Math.min(4,first.match(/^ */)[0].length):0;
  const blk=v.slice(ls,le).split('\n').map(l=>d>0?'    '+l:l.replace(/^ {1,4}/,'')).join('\n'),delta=blk.length-(le-ls);
  ta.value=v.slice(0,ls)+blk+v.slice(le);ta.setSelectionRange(Math.max(ls,s+(d>0?4:-rm)),e+delta);edUpdate();
}
$('#ta').addEventListener('input',edUpdate);
$('#ta').addEventListener('keydown',e=>{
  const ta=e.target,v=ta.value,s=ta.selectionStart,en=ta.selectionEnd;
  if(e.key=='Tab'){e.preventDefault();indentSel(e.shiftKey?-1:1);return}
  if(e.key=='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();run();return}
  if(e.key=='Enter'){e.preventDefault();const ls=v.lastIndexOf('\n',s-1)+1,line=v.slice(ls,s),ind=line.match(/^ */)[0]+(line.trimEnd().endsWith(':')?'    ':'');setTa(v.slice(0,s)+'\n'+ind+v.slice(en),s+1+ind.length);return}
  if(e.key=='Backspace'&&s==en){const ls=v.lastIndexOf('\n',s-1)+1,pre=v.slice(ls,s);if(pre&&!pre.trim()){e.preventDefault();const k=pre.length%4||4;setTa(v.slice(0,s-k)+v.slice(s),s-k)}}
});
function codeErr(e){const m=tx(e.msg||e.message),ln=e.line||e.ln;toast(m,'bad');outLine(m,true);if(ln){const el=$(`.cl[data-id="L${ln}"]`);el&&el.classList.add('err')}}
function refresh(){edUpdate()}
/* 왼쪽 목록: 코스별로 묶은 레슨 */
const KIND_KO={challenge:'도전',bonus:'보너스'};
/* 왼쪽 목록: 코스 → 유닛(접고 펴는 묶음) → 소개 + 레슨 (Swift Playgrounds의 챕터 목록처럼) */
const openUnits=new Set();let lastUnit=null;
const FOLDER='<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 4.5v8h13v-7h-6l-1.5-1.5h-5.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
const CHEV='<svg class="chev" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M3 2l4 3-4 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const PAGE='<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 3h10M2 6h10M2 9h7M2 12h9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
/* 유닛 안의 페이지 순서: 소개(맨 앞·중간)도 레슨과 같은 번호 줄에 넣어요 */
function pagesOf(u){const out=[];LEVELS.forEach((L,x)=>{if(L.unit!=u)return;(window.introsBefore?introsBefore(L.id):[]).forEach(it=>out.push({t:'intro',key:it.key}));out.push({t:'lesson',x});(window.introsAfter?introsAfter(L.id):[]).forEach(it=>out.push({t:'intro',key:it.key}))});return out}
const pageNoOf=(u,pred)=>pagesOf(u).findIndex(pred)+1;
// 각 유닛의 첫 레슨과 그 유닛에서 완료한 레슨 다음까지 열어요.
function unitLimit(first,end){
  let limit=first;
  for(let x=first;x<end;x++)if(solved.has(LEVELS[x].id)){
    let next=x+1;while(next<end&&LEVELS[next].kind!='core')next++;
    limit=Math.max(limit,Math.min(next,end-1));
  }
  return limit;
}
/* follow=true 는 다른 페이지로 갈 때만: 그때만 현재 항목이 보이게 사이드바를 움직여요 (유닛을 펴고 접을 때는 스크롤을 그대로 둬요) */
function renderChips(follow=false){
  const box=$('#sl'),keep=box.scrollTop;
  const curUnit=window.exOn&&exIntro?exIntro.unit:lv.unit;
  if(curUnit!==lastUnit){openUnits.add(curUnit);lastUnit=curUnit}           // 지금 유닛은 저절로 펼쳐요
  const cur=LEVELS[li].course,lockSvg='<svg width="12" height="12" viewBox="0 0 16 16"><path d="M4.5 7V5.5a3.5 3.5 0 0 1 7 0V7M3.5 7h9v6.5h-9z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
  box.innerHTML=COURSES.map((s,k)=>{
    const total=s.to-s.from+1;let n=0;for(let i=s.from;i<=s.to;i++)if(solved.has(LEVELS[i].id))n++;
    let un=0;
    let h=`<div class="sg${s==cur?' on':''}"><span><em>COURSE ${k+1} · ${s.en.toUpperCase()}</em>${s.name}</span><span>코드 · ${n}/${total}</span></div>`;
    for(let i=s.from;i<=s.to;){
      const u=LEVELS[i].unit;let j=i;while(j<=s.to&&LEVELS[j].unit==u)j++;
      const open=openUnits.has(u),done=LEVELS.slice(i,j).filter(L=>solved.has(L.id)).length;
      un++;h+=`<button class="uh${open?' open':''}${u==curUnit?' cur':''}" data-uh="${u}" aria-expanded="${open}">${CHEV}${FOLDER}<b><em class="un">Unit ${un}</em>${UNITS[u]||u}</b><small>${done}/${j-i}</small></button>`;
      if(open){
        h+='<div class="ub">';let pg=0;
        const unitUnlocked=unitLimit(i,j);
        for(let x=i;x<j;x++){const L=LEVELS[x],lock=x>U()&&x>unitUnlocked;
          // 이 레슨 앞의 소개 (유닛 맨 앞 소개와, 퍼즐이 많은 유닛의 중간 소개)
          (window.introsBefore?introsBefore(L.id):[]).forEach(it=>{h+=`<button class="si intro${window.exOn&&exKey==it.key?' on':''}${store.get('bp-seen-'+it.key,'')=='1'?' seen':''}" data-u="${it.key}"><i>${++pg}</i><span>${it.title=='소개'?'소개':'소개 · '+esc(it.title)}</span></button>`});
          h+=`<button class="si${x==li&&!window.exOn?' on':''}${solved.has(L.id)?' done':''}${lock?' lock':''}" data-i="${x}" ${lock?'disabled':''}><i>${++pg}</i>${lock?`<span class="si-lock">${lockSvg}</span>`:''}<span>${L.tag?`<b class="tg">${esc(L.tag)}</b> - `:''}${tx(L.name)}${KIND_KO[L.kind]?`<em class="kd">${KIND_KO[L.kind]}</em>`:''}</span></button>`;
          (window.introsAfter?introsAfter(L.id):[]).forEach(it=>{h+=`<button class="si intro outro${window.exOn&&exKey==it.key?' on':''}${store.get('bp-seen-'+it.key,'')=='1'?' seen':''}" data-u="${it.key}"><i>${++pg}</i><span>${esc(it.title)}</span></button>`});}
        h+='</div>';
      }
      i=j;
    }
    return h}).join('');
  box.scrollTop=keep;
  if(follow){const on=$('#sl .si.on');if(on){const r=on.getBoundingClientRect(),b=box.getBoundingClientRect(),to=box.scrollTop+(r.top-b.top)-(b.height/2-r.height/2);box.scrollTo({top:Math.max(0,to),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}}
}
function renderGoal(){
  {const pgs=pagesOf(lv.unit);$('#g-n').textContent=`${lv.course.en} · Unit ${UNIT_NO[lv.unit]} ${UNITS[lv.unit]||lv.unit} · ${pageNoOf(lv.unit,p=>p.t=='lesson'&&LEVELS[p.x]===lv)} / ${pgs.length}`}
  $('#g-t').textContent=titleOf(lv);$('#g-d').textContent=tx(lv.goal);
  $('#hint').hidden=true;$('#hint').textContent=tx(lv.hint);updHud();
  // 코드 칸 위의 레슨 설명 (Swift Playgrounds의 퍼즐 화면처럼: 목표 → 설명 → 할 일)
  $('#li-goal').textContent=tx(lv.goal);$('#li-desc').textContent=tx(lv.desc||'');
  $('#li-steps').innerHTML=(lv.steps||[]).map(s=>`<li>${colLine(tx(s))}</li>`).join('');
}
function updHud(){
  if(!view)return;const w=lv.win||{};
  const g=w.collect!=null?w.collect:view.gemTotal,s=w.switches!=null?w.switches:view.sws.size,gl=Math.min(view.collected,g),sl=view.on.size;
  $('#g-p').innerHTML=(g?`<span class="pill${gl>=g?' ok':''}"><i></i>${tx('보석')} ${gl}/${g}</span> `:'')+(s?`<span class="pill s${sl>=s?' ok':''}"><i></i>${tx('스위치')} ${sl}/${s}</span>`:'');
}
/* 살펴보기에서 명령 상용구를 보여 줘요. */
function renderPal(){
  if(lv.course.mode!='blocks'){$('#pal').innerHTML='';return}
  const button=(k,condition)=>{
    const label=tx(condition?conditionLabels[condition]:BK[k].k);
    const attr=condition?` data-condition="${condition}"`:'';
    return`<button type="button" class="blk pb ${BK[k].c}" data-snip="${k}"${attr} title="${label}"><code>${esc(snippetText(k,condition))}</code><small>${label}</small></button>`;
  };
  const conditions=lv.condition_snippets||[];
  $('#pal').innerHTML=lv.tools.map(k=>button(k)).concat(conditions.map(condition=>button('if',condition))).join('');
}
let tt;function toast(m,k=''){const t=$('#toast');t.textContent=m;t.className='show '+k;clearTimeout(tt);tt=setTimeout(()=>t.className='',2200)}
function hl(id){$$('.now').forEach(e=>e.classList.remove('now'));if(!id)return;$$(`[data-id="${id}"]`).forEach(e=>{if(e.classList.contains('blk')||e.classList.contains('ln')||e.classList.contains('cl'))e.classList.add('now')});
  const l=$('.ln.now,.cl.now');l&&l.scrollIntoView({block:'nearest'})}
const hlLine=ln=>hl('L'+ln);
/* 실행 제어: 일시정지(paused 는 scene.js)와 한 줄씩 실행 */
let stepMode=false,gate=null;
function ctlUI(){
  $('#pz').hidden=!running;$('#pz').textContent=paused?'▶ 재생':'❚❚ 일시정지';
  $('#stp').textContent='한 줄씩 '+(stepMode?'●':'○');$('#stp').setAttribute('aria-pressed',stepMode);$('#stp').classList.toggle('on',stepMode);
  $('#nx').hidden=$('#auto').hidden=!gate;
  document.body.classList.toggle('paused',paused);document.body.classList.toggle('stepping',stepMode&&running);
}
function ctlReset(){paused=false;if(gate){const g=gate;gate=null;g()}ctlUI()}      // 멈춘 약속(promise)이 남지 않게 풀어 줘요
function abortRun(){ctl.abort=true;ctlReset()}
const nextLine=()=>{if(gate){const g=gate;gate=null;ctlUI();g()}};
// 한 줄 실행이 끝나면 그 줄에 표시하고 '다음 줄'을 기다려요
async function boundary(ln){
  if(!stepMode||ctl.abort)return;
  hlLine(ln);await new Promise(r=>{gate=r;ctlUI()});
  if(ctl.abort)throw new Stop();
}
function runUI(){ctlUI();document.body.classList.toggle('running',running);const b=$('#run');b.classList.toggle('stop',running);
  b.innerHTML=running?'<svg width="14" height="14" viewBox="0 0 14 14"><rect x="2" y="2" width="10" height="10" rx="2" fill="currentColor"/></svg>정지':'<svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 1.5v11l9-5.5z" fill="currentColor"/></svg>실행'}

const closeMore=()=>{$('#moremenu').hidden=true;$('#morebtn').setAttribute('aria-expanded','false')};
$('#morebtn').onclick=e=>{e.stopPropagation();const o=$('#moremenu').hidden;$('#moremenu').hidden=!o;$('#morebtn').setAttribute('aria-expanded',String(o))};
addEventListener('pointerdown',e=>{if(!e.target.closest('#more'))closeMore()});addEventListener('keydown',e=>{if(e.key=='Escape')closeMore()});
$('#moremenu').addEventListener('click',closeMore);
$('#clr').onclick=()=>{if(running)return;$('#ta').value=starter();edUpdate()};

/* ───────── 실행: 파이썬 실행기가 돌려준 기록(actions)을 3D로 재생해요 ───────── */
function resetWorld(){view=new View(lv);F('reset',lv);updHud()}
let pyRun=null,pyCount=null;
async function initPy(){
  try{
    const pd=await loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'});
    pd.runPython(await (await fetch('py/puzzle.py',{cache:'no-cache'})).text());
    pyRun=pd.globals.get('run_json');pyCount=pd.globals.get('count_json');
    edUpdate();
  }catch(e){console.error(e);toast('Python 실행기를 불러오지 못했어요. 인터넷 연결을 확인해 주세요','bad')}
}
/* 기록 하나를 재생한다. 화면은 규칙을 모르고 기록대로만 움직여요 */
async function playRec(r){
  hlLine(r.ln);
  if(r.t=='print'){outLine(r.s);return}
  const a=r.a||0;
  if(r.t=='move'){await F('move',r.from,r.to,a);if(r.tele)await F('tele',r.to,r.tele,a)}
  else if(r.t=='turn')await F('turn',-r.s,a);
  else if(r.t=='bump')await F('bump',r.d,a);
  else if(r.t=='gem'){if(r.ok)await F('collect',r.at,a)}
  else if(r.t=='sw'){if(r.ok)await F('toggle',r.at,r.on)}
  else if(r.t=='portal')await F('portal',r.k,r.on);
  else if(r.t=='lock')await F('lock',r.plats);
  else if(r.t=='place')await F('place',r);
  else if(r.t=='spawn')await F('spawn',r);
  else if(r.t=='state')return;
  else if(r.t=='file'){outLine(`${r.name} 파일에 저장했어요: ${r.s}`);return}                                // 상태 기록은 퍼즐 화면에서 쓰지 않아요
  view.apply(r);updHud();
}
async function replay(res){
  // 같은 줄의 기록을 한 묶음으로 보고, 같은 종류가 또 나오면 반복의 다음 차례로 봐요
  // ponytail: 한 줄에 같은 동작이 여러 번 나오는 경우(예: move(); move())는 따로 나뉘어요
  let g=null;
  for(const r of res.actions){
    if(ctl.abort)throw new Stop();
    if(r.t!='state'){
      if(g&&(r.ln!=g.ln||g.ts.has(r.t))){await boundary(g.ln);g=null}
      if(!g)g={ln:r.ln,ts:new Set};g.ts.add(r.t);
    }
    await playRec(r);
  }
  if(g)await boundary(g.ln);
  if(res.error)throw Object.assign(new Fail(res.error.msg),{ln:res.error.line});
}
function outClear(){const o=$('#out');o.innerHTML='';o.hidden=true}
function outLine(s,bad){const o=$('#out'),d=document.createElement('div');d.textContent=s;if(bad)d.className='e';o.appendChild(d);o.hidden=false;o.scrollTop=1e6}
async function run(){
  if(running){abortRun();return}
  if(!pyRun){toast('Python을 불러오는 중이에요. 잠시 후 다시 눌러 주세요','warn');return}
  outClear();
  const res=JSON.parse(pyRun(rawOf(lv),$('#ta').value));
  if(res.static){codeErr(res.static);return}
  if(!res.n){toast('코드를 먼저 입력해 보세요','warn');return}
  $('#win').hidden=true;ctl={abort:false};ctlReset();running=true;runUI();
  let err=null;
  try{
    for(let i=0;i<res.runs.length;i++){
      const r=res.runs[i];
      if(i==0)resetWorld();else{view=new View(r.spec);await F('build',r.spec);await wait(400/spd)}      // 다음 맵으로 바뀌어요
      if(lv.maps.length>1)toast(`맵 ${i+1} / ${lv.maps.length}`);
      await replay(r);
      if(!r.done){
        if(r.goal_msg){outLine(r.goal_msg,true);toast(r.goal_msg,'warn')}
        else toast(lv.maps.length>1?`맵 ${i+1}에서는 목표를 다 못 채웠어요`:'아직 목표를 다 못 채웠어요. 다시 해볼까요?','warn');
        await wait(1600);resetWorld();return;
      }
    }
    if(res.ok)await win();
  }catch(e){
    if(e instanceof Stop){}
    else if(e instanceof Fail){const b=$('.cl.now');b&&b.classList.add('err');codeErr(e);await wait(1800)}
    else{err=e}
    resetWorld();
  }finally{
    if(!ctl.abort && res.conditions.length){
      outLine('아직 충족하지 못한 풀이 조건이 있어요.',true);
      for(const message of res.conditions)outLine(message,true);
    }
    running=false;ctlReset();hl(null);runUI();
  }
  if(err)throw err;
}
async function win(){
  solved.add(lv.id);store.set('bp-solved',JSON.stringify([...solved]));
  // 도전·보너스 레슨은 건너뛸 수 있어요: 다음 '핵심' 레슨까지 열어요
  let j=li+1;while(j<LEVELS.length&&LEVELS[j].kind!='core')j++;j=Math.min(j,LEVELS.length-1);
  if(li<=unlocked&&j>unlocked){unlocked=j;store.set('bp-unlocked3',unlocked)}
  renderChips();
  if(fx.win)await fx.win();
  const end=li==lv.course.to;
  $('#w-t').textContent=end?`${lv.course.name} 완료!`:'성공!';
  $('#w-c').textContent=tx(lv.concept)+(end?'\n\n'+lv.course.done:'');
  $('#w-term').innerHTML=lv.term?`<b>새 용어</b>${esc(lv.term)}`:'';$('#w-term').hidden=!lv.term;
  $('#w-code').innerHTML=col(pyText());
  const hasOutro=window.introsAfter&&introsAfter(lv.id).some(x=>store.get('bp-seen-'+x.key,'')!='1');
  $('#next').textContent=hasOutro?'정리 보기':li+1>=LEVELS.length?'처음부터':end?`${LEVELS[li+1].course.name}으로`:'다음 레슨';$('#win').hidden=false;
}
$('#run').onclick=run;
$('#again').onclick=()=>{$('#win').hidden=true;resetWorld()};
$('#next').onclick=()=>{$('#win').hidden=true;
  const o=window.introsAfter?introsAfter(lv.id).find(x=>store.get('bp-seen-'+x.key,'')!='1'):null;
  if(o){openExplain(o.key);return}                                              // 유닛의 마지막 퍼즐을 풀었으면 정리 페이지 먼저
  const n=li+1<LEVELS.length?li+1:0;load(n);window.maybeIntro&&maybeIntro(LEVELS[n])};   // 새 유닛에 들어가면 소개부터
$('#sol').onclick=()=>{
  if(running)return;
  $('#ta').value=lv.solution;edUpdate();
  setTimeout(run,450);
};
$('#rst').onclick=()=>{if(running)abortRun();else resetWorld()};
$('#pz').onclick=()=>{paused=!paused;ctlUI()};
$('#stp').onclick=()=>{stepMode=!stepMode;if(!stepMode)nextLine();ctlUI()};
$('#nx').onclick=nextLine;$('#auto').onclick=()=>{stepMode=false;nextLine();ctlUI()};
addEventListener('keydown',e=>{
  if(!gate)return;
  if(e.key=='F10'||(!/^(TEXTAREA|INPUT|BUTTON)$/.test(e.target.tagName)&&(e.key==' '||e.key=='ArrowRight'))){e.preventDefault();nextLine()}
});
$('#spd').onclick=()=>{spd=spd==1?2.2:1;$('#spd').textContent=spd==1?'1x':'2x'};
$('#hintb').onclick=()=>{const h=$('#hint');h.hidden=!h.hidden};
$('#sl').addEventListener('click',e=>{
  if(running)return;
  const t=e.target,uh=t.closest('[data-uh]');
  if(uh){const u=uh.dataset.uh;openUnits.has(u)?openUnits.delete(u):openUnits.add(u);renderChips();return}
  const u=t.closest('[data-u]');if(u){openExplain(u.dataset.u);return}
  const b=t.closest('[data-i]');if(b)load(+b.dataset.i)});
$('#sbt').onclick=$('#xv-sbt').onclick=()=>$('#app').classList.toggle('sbhide');
function load(i){
  if(running)return;
  window.leaveExplain&&leaveExplain();
  if(RND&&started&&i!==li){pickRandom();applyTheme(false);toast(`테마: ${TH.name} · ${CHARS[CH].name}`)}
  if(started)codeStore[lv.id]=$('#ta').value;
  li=i;lv=LEVELS[i];
  view=new View(lv);$('#win').hidden=true;outClear();
  if(R)fx.build(lv);
  setMode();renderChips(true);renderGoal();renderPal();refresh();
}
function skinUI(){
  $('#o-wx').innerHTML=WXOPT.map(([k,n])=>`<button class="opt${k==WX?' on':''}" data-wx="${k}">${n}</button>`).join('');$('#rnd').checked=RND;
  $('#o-theme').innerHTML=Object.entries(THEMES).map(([k,t])=>`<button class="opt${k==themeId?' on':''}" data-th="${k}">${t.name}</button>`).join('');
  $('#o-char').innerHTML=TH.chars.map(k=>[k,CHARS[k]]).map(([k,c])=>`<button class="opt${k==CH?' on':''}" data-ch="${k}">${c.name}</button>`).join('');
}
/* 배경 그림: 두 겹을 번갈아 보여 주며 부드럽게 바뀐다 */
let bgL=[],bgN=0,bgCur='';
function setBgImg(u,pos='center'){
  if(u==bgCur)return;bgCur=u;
  if(!bgL.length)for(let i=0;i<2;i++){const d=document.createElement('div');d.className='bgimg';stage.insertBefore(d,stage.firstChild);bgL.push(d)}
  const a=bgL[bgN^=1],b=bgL[bgN^1];
  a.style.backgroundImage=u?`url(${u})`:'none';a.style.backgroundPosition=pos;a.style.opacity=1;b.style.opacity=0;
}
function applyTheme(re=true){
  if(running)abortRun();
  TH=THEMES[themeId];stage.style.setProperty('--stage',TH.bg);setBgImg(TH.bgimg,TH.bgpos);
  {const ui={...UI0,...(TH.ui||{})};for(const k in ui)document.documentElement.style.setProperty(k,ui[k])}
  fx.theme&&fx.theme();fx.char&&fx.char(CH);fx.weather&&fx.weather(curWx());
  if(re&&view){if(fx.build){fx.build(view.spec);fx.restore(view)}renderGoal();renderPal()}
  skinUI();
}
function saveSkin(){store.set('bp-skin',themeId+','+CH)}
function pickRandom(){const ks=Object.keys(THEMES).filter(k=>k!=themeId);themeId=ks[Math.random()*ks.length|0];const cs=THEMES[themeId].chars;CH=cs[Math.random()*cs.length|0];saveSkin()}
$('#skin').onclick=()=>{$('#skinp').hidden=!$('#skinp').hidden};
$('#skinp').addEventListener('click',e=>{
  const t=e.target.closest('[data-th],[data-ch],[data-wx],#shuf');if(!t)return;
  if(t.id=='shuf')pickRandom();
  else if(t.dataset.wx){WX=t.dataset.wx;store.set('bp-wx',WX)}
  else{if(t.dataset.th){themeId=t.dataset.th;CH=THEMES[themeId].char}else CH=t.dataset.ch;saveSkin()}
  applyTheme();
});
$('#rnd').onchange=e=>{RND=e.target.checked;store.set('bp-rand',RND?'1':'0')};
/* 관리자 모드: 비밀번호를 맞추면 모든 잠금이 풀려요 (화면 안에 들어 있는 간이 비밀번호라 보안용은 아니에요) */
function saveAdm(){store.set('bp-admin',ADMIN?'1':'0')}
function admUI(){$('#adm').classList.toggle('on',ADMIN)}
function tryPw(){
  if($('#pw').value=='1234'){ADMIN=true;saveAdm();$('#admp').hidden=true;renderChips();admUI();toast('관리자 모드: 모든 잠금이 풀렸어요')}
  else{$('#pwmsg').textContent='비밀번호가 맞지 않아요';$('#pw').select()}
}
$('#adm').onclick=()=>{
  if(ADMIN){ADMIN=false;saveAdm();renderChips();admUI();toast('관리자 모드를 껐어요');return}
  const p=$('#admp');p.hidden=!p.hidden;$('#pw').value='';$('#pwmsg').textContent='';if(!p.hidden)$('#pw').focus();
};
$('#pwok').onclick=tryPw;$('#pw').addEventListener('keydown',e=>{if(e.key=='Enter')tryPw()});
/* 점검용: 브라우저 콘솔에서 __bp.checkAll() 로 모든 레슨의 정답을 실행기에 돌려 볼 수 있어요 */
window.__bp={LEVELS,py:()=>pyRun,rawOf,parseBlocks,lines,
  async checkAll(){const bad=[];for(const L of LEVELS){const blocks=L.course.mode=='blocks',code=blocks?lines(parseBlocks(L.solution),0,[]).map(l=>l.s).join('\n')+'\n':L.solution;
    const r=JSON.parse(pyRun(rawOf(L),code));if(!r.ok)bad.push(L.id)}return bad}};
runUI();admUI();applyTheme(false);load(li);started=true;initPy();
