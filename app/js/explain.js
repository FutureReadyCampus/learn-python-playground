'use strict';
/* 유닛 소개 (설명 화면). Swift Playgrounds의 "소개"처럼 한 장씩 넘겨 봐요. 자세한 규칙: docs/EXPLAIN-GUIDE.md
   - 한 장(slide): 큰 글(text), 그림(scene), 말풍선(bubble) → 코드(code) → 덧말(note), 쉬운 퀴즈(quiz)
   - 그림은 자동으로 천천히 재생되고 끝나면 처음부터 다시 재생돼요. 아래 진행 막대가 차오르고, 누르면 그 단계로 가요.
   - 그림에 code가 있으면 왼쪽에 디버거처럼 코드가 나오고, 지금 실행하는 줄(▶)과 그 줄의 행동이 함께 보여요.
   - 유닛 맨 앞의 소개(slides) 말고도, 퍼즐이 많은 유닛은 중간 소개(mids: before 레슨 앞)가 있어요.
   퍼즐 화면과 코드 편집기는 보이지 않아요. 마지막 장의 "코딩 시작"을 누르면 이어지는 퍼즐로 가요. */
let EX={units:[]},exKey=null,exIntro=null,exPage=0,exTok=0,exPaused=false;
const svgCache={},sleep=ms=>new Promise(r=>setTimeout(r,ms)),reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const STEP_MS=4200,CODE_MS=3200,HOLD_MS=2600,MOVE_MS=1300;   // 그림 한 단계, 코드 한 줄, 다시 시작하기 전 쉬는 시간, 걷는 데 걸리는 시간
/* 일시정지할 수 있는 기다리기: 멈춘 동안에는 시간이 흐르지 않아요 */
async function wait2(ms,tok){let left=ms;while(left>0){if(tok!=exTok)return;await sleep(100);if(!exPaused)left-=100}}
function setPaused(p){exPaused=p;const b=$('#xv-pp');b.textContent=p?'▶':'❚❚';b.setAttribute('aria-label',p?'재생':'일시정지');b.classList.toggle('paused',p);
  const f=$('#xv-fill'),bar=$('#xv-prog').getBoundingClientRect().width||1;
  if(p){const w=getComputedStyle(f).width;f.style.transition='none';f.style.width=w}
  else if(f.dataset.end){const cur=parseFloat(getComputedStyle(f).width)/bar*100,st=+f.dataset.start,en=parseFloat(f.dataset.end),left=Math.max(0,(+f.dataset.left)*(en-cur)/Math.max(.001,en-st));
    f.style.transition=`width ${left}ms linear`;f.style.width=f.dataset.end}   // 남은 시간만큼만 마저 차올라요
  $('#xv-scene svg')&&$('#xv-scene svg').getAnimations({subtree:true}).forEach(a=>p?a.pause():a.play())}
async function loadSvg(p){return svgCache[p]||(svgCache[p]=await (await fetch('explain/'+p,{cache:'no-cache'})).text())}

/* ── 소개 목록: 유닛마다 맨 앞 소개 + 중간 소개들. key는 'B6' 또는 'B6@B6-4' ── */
function introsOf(u){
  const d=exData[u];if(!d)return[];
  const first=LEVELS.find(l=>l.unit==u),last=LEVELS.filter(l=>l.unit==u).pop();
  return[{key:u,unit:u,before:first&&first.id,title:'소개',slides:d.slides},
    ...(d.mids||[]).map(m=>({key:u+'@'+m.before,unit:u,before:m.before,title:m.title,slides:m.slides})),
    // 정리 페이지: 유닛의 마지막 퍼즐을 다 푼 뒤 복습 + 면접식 질문 (끝에 하나)
    ...(d.outro?[{key:u+'@end',unit:u,after:last&&last.id,outro:true,title:d.outro.title||'정리',slides:d.outro.slides}]:[])];
}
const introByKey=k=>introsOf(k.split('@')[0]).find(x=>x.key==k);
const introsBefore=id=>{const L=LEVELS.find(l=>l.id==id);return L?introsOf(L.unit).filter(x=>x.before==id):[]};
const introsAfter=id=>{const L=LEVELS.find(l=>l.id==id);return L?introsOf(L.unit).filter(x=>x.after==id):[]};

/* ── 그림: 1단계부터 k단계까지 적용해서 같은 그림을 만들어요. 한 단계씩 나아갈 때는 움직임을 보여 줘요 ── */
const tr=s=>{const m=/translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px/.exec(s||'');return m?[+m[1],+m[2]]:[0,0]};
function dailyScene(root,steps){
  const q=id=>root.querySelector('#'+id),allShow=new Set(),allHide=new Set(),allOn=new Set(),mv=new Set(),tx0={};
  steps.forEach(s=>{(s.show||[]).forEach(i=>allShow.add(i));(s.hide||[]).forEach(i=>allHide.add(i));(s.on||[]).forEach(i=>allOn.add(i));
    Object.keys(s.move||{}).forEach(i=>mv.add(i));Object.keys(s.text||{}).forEach(i=>{const e=q(i);if(e)tx0[i]=e.textContent})});
  const pos0={};mv.forEach(i=>{const e=q(i);if(e)pos0[i]=e.style.transform});
  const svg=root.querySelector('svg');if(svg)svg.classList.add('xv-own');            // 그림 속 CSS 전환은 끄고, 움직임은 여기서 만들어요
  if(!reduceMotion)mv.forEach(id=>{const e=q(id);if(e&&e.animate)e.animate([{translate:'0 0'},{translate:'0 -5px'},{translate:'0 0'}],{duration:1700,iterations:Infinity,easing:'ease-in-out'})});
  const put=s=>{
    (s.show||[]).forEach(id=>{const e=q(id);if(e)e.style.opacity=1});(s.hide||[]).forEach(id=>{const e=q(id);if(e)e.style.opacity=0});
    Object.entries(s.move||{}).forEach(([id,[x,y]])=>{const e=q(id);if(e)e.style.transform=`translate(${x}px,${y}px)`});
    (s.on||[]).forEach(id=>{const e=q(id);if(e)e.classList.add('on')});
    Object.entries(s.text||{}).forEach(([id,t])=>{const e=q(id);if(e)e.textContent=t})};
  return(k,animate)=>{
    allHide.forEach(id=>{const e=q(id);if(e)e.style.opacity=1});allShow.forEach(id=>{const e=q(id);if(e)e.style.opacity=0});   // 처음 모습으로
    allOn.forEach(id=>{const e=q(id);if(e)e.classList.remove('on')});
    mv.forEach(id=>{const e=q(id);if(e)e.style.transform=pos0[id]});Object.entries(tx0).forEach(([id,t])=>{q(id).textContent=t});
    for(let i=0;i<k;i++)put(steps[i]);
    const s=steps[k],before={};Object.keys(s.move||{}).forEach(id=>{const e=q(id);if(e)before[id]=e.style.transform});
    put(s);
    if(!animate||reduceMotion)return;
    // 걷기: 통통 튀며 옮겨 가요 / 나타나기·사라지기: 서서히 / 강조·글자 바뀜: 반짝
    Object.entries(s.move||{}).forEach(([id,[x,y]])=>{const e=q(id);if(!e||!e.animate)return;const[a,b]=tr(before[id]),hop=Math.min(28,8+Math.hypot(x-a,y-b)/12);
      e.animate([{transform:`translate(${a}px,${b}px)`},{transform:`translate(${(a+x)/2}px,${(b+y)/2-hop}px)`,offset:.5},{transform:`translate(${x}px,${y}px)`}],{duration:MOVE_MS,easing:'ease-in-out'})});
    (s.show||[]).forEach(id=>{const e=q(id);e&&e.animate&&e.animate([{opacity:0},{opacity:1}],{duration:700,easing:'ease-out'})});
    (s.hide||[]).forEach(id=>{const e=q(id);e&&e.animate&&e.animate([{opacity:1},{opacity:1,offset:.3},{opacity:0}],{duration:900})});
    [...(s.on||[]),...Object.keys(s.text||{})].forEach(id=>{const e=q(id);e&&e.animate&&e.animate([{filter:'brightness(1)'},{filter:'brightness(1.8)'},{filter:'brightness(1)'}],{duration:900})});
  }}
/* 글: **굵게** 와 `코드` 만 꾸며요 */
const rich=s=>esc(tx(s||'')).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/`(.+?)`/g,'<code>$1</code>');

function setExUI(on){window.exOn=on;$('#app').classList.toggle('ex',on);$('#exv').hidden=!on;renderChips(true)}
function openExplain(key,page=0){
  const it=introByKey(key);if(running||!it)return;
  if(!window.exOn)codeStore[lv.id]=$('#ta').value;
  exKey=key;exIntro=it;setExUI(true);store.set('bp-seen-'+key,'1');showSlide(page);
}
function leaveExplain(){exTok++;if(!window.exOn)return;setExUI(false);$('#xv-scene').innerHTML=''}

async function showSlide(p){
  const tok=++exTok,it=exIntro,sl=it.slides[p],N=it.slides.length;exPage=p;
  {const pgs=pagesOf(it.unit);$('#xv-unit').textContent=`Unit ${UNIT_NO[it.unit]} ${UNITS[it.unit]||it.unit} · ${it.title} (페이지 ${pageNoOf(it.unit,q=>q.t=='intro'&&q.key==it.key)} / ${pgs.length})`}
  $('#xv-text').innerHTML=rich(sl.text);$('#xv-text').hidden=!sl.text;
  // 말풍선 → 코드 → 덧말 (Swift Playgrounds 소개처럼 말풍선이 코드를 가리켜요)
  $('#xv-bubble').innerHTML=rich(sl.bubble);$('#xv-bubble').hidden=!sl.bubble;
  $('#xv-code').innerHTML=sl.code?(Array.isArray(sl.code)?sl.code:[sl.code]).map(l=>`<div>${colLine(l)||'&#8203;'}</div>`).join(''):'';$('#xv-code').hidden=!sl.code;
  $('#xv-note').innerHTML=rich(sl.note);$('#xv-note').hidden=!sl.note;
  $('#xv-call').hidden=!(sl.bubble||sl.code||sl.note);
  const last=p==N-1;$('#xv-prev').disabled=p==0;$('#xv-next').disabled=last;
  $('#xv-n').innerHTML=last?(it.outro?'다음으로':'코딩 시작'):`${p+1}/${N}`;$('#xv-n').classList.toggle('start',last);
  renderQuiz(sl.quiz);
  const box=$('#xv-scene'),stage=$('#xv-stage'),sc=sl.scene;box.innerHTML='';stage.hidden=!sc;
  // 이전 장의 재생 흔적(막대 클릭, 단계 표시, 자막, 막대)을 먼저 지워요. 그림을 불러오는 동안 막대를 눌러도 이전 그림이 되살아나지 않게
  $('#xv-prog').onclick=null;$('#xv-badge').textContent='';$('#xv-cap').textContent='';$('#xv-fill').style.transition='none';$('#xv-fill').style.width='0';$('#xv-ticks').innerHTML='';
  if(!sc)return;
  // 디버거 칸: 코드 한 줄 한 줄 (지금 줄 ▶) + 변수
  stage.classList.toggle('dbg',!!sc.code);
  $('#xv-lines').innerHTML=(sc.code||[]).map((l,i)=>`<li data-n="${i+1}"><i>${i+1}</i><span>${colLine(l)||'&#8203;'}</span></li>`).join('');
  $('#xv-vars').innerHTML='';$('#xv-vars').hidden=!sc.steps.some(s=>s.vars);
  const svg=await loadSvg(sc.svg);if(tok!=exTok)return;
  box.innerHTML=svg;box.setAttribute('aria-label',sc.alt||'');
  const[pa,pb]=sc.part||[0,sc.steps.length];
  loopScene(tok,dailyScene(box,sc.steps),sc,pa);
}
/* 한 단계 보여 주기: 그림 + 지금 줄 + 변수 + 자막 + 진행 막대 */
function showStep(go,sc,k,animate){
  const steps=sc.steps,[pa,pb]=sc.part||[0,steps.length],n=pb-pa,s=steps[k],dur=s.dur||(sc.code?CODE_MS:STEP_MS),j=k-pa;   // 이 장에서 보여 줄 범위 pa..pb-1
  go(k,animate);
  $('#xv-badge').textContent=`${j+1} / ${n}`;$('#xv-cap').textContent=tx(s.cap);
  if(sc.code){
    const ran=new Set();for(let i=0;i<k;i++)if(steps[i].line)ran.add(steps[i].line);
    $$('#xv-lines li').forEach(li=>{const ln=+li.dataset.n;li.classList.toggle('cur',ln==s.line);li.classList.toggle('ran',ran.has(ln)&&ln!=s.line)});
    const cur=$('#xv-lines li.cur');cur&&cur.scrollIntoView({block:'nearest'});
    const vars={};for(let i=0;i<=k;i++)for(const[a,v]of Object.entries(steps[i].vars||{})){if(v===null)delete vars[a];else vars[a]=v}   // null = 이름표가 사라져요
    const chg=s.vars||{};
    $('#xv-vars').innerHTML=Object.keys(vars).length?`<b>변수</b>`+Object.entries(vars).map(([a,v])=>`<div class="${a in chg&&animate?'chg':''}"><span>${esc(a)}</span><em>${esc(String(v))}</em></div>`).join(''):'';
  }
  // 진행 막대: 지금 단계 동안 천천히 차올라요
  const f=$('#xv-fill');f.style.transition='none';f.style.width=(j/n*100)+'%';void f.offsetWidth;f.dataset.start=j/n*100;f.dataset.end=((j+1)/n*100)+'%';f.dataset.left=dur;
  if(!reduceMotion&&!exPaused){f.style.transition=`width ${dur}ms linear`;f.style.width=f.dataset.end}else if(reduceMotion)f.style.width=f.dataset.end;
  $('#xv-ticks').innerHTML=Array.from({length:n},(_,i)=>`<i style="left:${i/n*100}%" class="${i<=j?'on':''}"></i>`).join('');
  return dur;
}
/* 자동 재생: 단계를 천천히 하나씩, 끝나면 잠깐 쉬고 처음부터 다시 (움직임 줄이기 설정이면 마지막 단계에서 멈춰요) */
async function loopScene(tok,go,sc,from){
  const[pa,pb]=sc.part||[0,sc.steps.length],n=pb-pa;
  $('#xv-prog').onclick=e=>{const r=e.currentTarget.getBoundingClientRect(),k=pa+Math.min(n-1,Math.max(0,Math.floor((e.clientX-r.left)/r.width*n)));loopScene(++exTok,go,sc,k)};
  if(reduceMotion){showStep(go,sc,from==pa?pb-1:from,false);return}
  let first=true;
  for(let k=from;;k++){
    if(tok!=exTok)return;
    if(k==pb){await wait2(HOLD_MS,tok);if(tok!=exTok)return;k=pa;first=true}
    const dur=showStep(go,sc,k,!first);first=false;await wait2(dur,tok);
  }
}
$('#xv-pp').onclick=()=>setPaused(!exPaused);
/* 쉬운 퀴즈: 틀리면 다시 골라 보고, 맞히면 이유를 보여 줘요. 잠금 조건은 아니에요 */
function renderQuiz(q){
  const el=$('#xv-quiz');el.hidden=!q;if(!q){el.innerHTML='';return}
  el.innerHTML=`<p class="qq"><b>퀴즈</b> ${rich(q.q)}</p>${q.code?`<pre class="qc">${(Array.isArray(q.code)?q.code:[q.code]).map(l=>colLine(l)).join('\n')}</pre>`:''}<div class="qch">${q.choices.map((c,i)=>`<button class="btn" data-q="${i}">${rich(c)}</button>`).join('')}</div><p class="qwhy" hidden></p>`;
  el.onclick=e=>{const b=e.target.closest('[data-q]');if(!b||b.disabled)return;const i=+b.dataset.q,why=el.querySelector('.qwhy');
    if(i==q.answer){el.querySelectorAll('[data-q]').forEach(x=>x.disabled=true);b.classList.add('good');why.hidden=false;why.innerHTML='맞아요! '+rich(q.why)}
    else{b.classList.add('bad');b.disabled=true;why.hidden=false;why.textContent='아쉬워요. 다시 골라 봐요.'}};
}
$('#xv-prev').onclick=()=>{if(exPage>0)showSlide(exPage-1)};
$('#xv-next').onclick=()=>{if(exPage<exIntro.slides.length-1)showSlide(exPage+1)};
$('#xv-n').onclick=()=>{if(exPage!=exIntro.slides.length-1)return;
  if(exIntro.outro){const i=LEVELS.findIndex(l=>l.id==exIntro.after)+1,n=i>=LEVELS.length?0:i;load(n);maybeIntro(LEVELS[n]);return}   // 정리가 끝나면 다음 유닛으로 (처음 가는 유닛이면 소개부터)
  const i=LEVELS.findIndex(l=>l.id==exIntro.before);load(i<0?li:i)};
addEventListener('keydown',e=>{if(!window.exOn||e.target.closest('input,textarea'))return;
  if(e.key==' '&&!$('#xv-stage').hidden){e.preventDefault();setPaused(!exPaused);return}
  if(e.key=='ArrowRight')$('#xv-next').disabled?$('#xv-n').click():$('#xv-next').click();else if(e.key=='ArrowLeft')$('#xv-prev').click()});

/* 이 레슨 앞에 아직 안 본 소개가 있으면 퍼즐 전에 먼저 보여 줘요 (Swift Playgrounds처럼 소개 → 퍼즐) */
function maybeIntro(L){
  if(window.exOn)return false;
  const it=introsBefore(L.id).find(x=>store.get('bp-seen-'+x.key,'')!='1');
  if(!it)return false;openExplain(it.key);return true;
}
async function initExplain(){
  try{EX=await (await fetch('explain/index.json',{cache:'no-cache'})).json()}catch(e){return}
  await Promise.all(EX.units.map(async u=>{exData[u]=await (await fetch(`explain/${u}.json`,{cache:'no-cache'})).json()}));
  renderChips(true);maybeIntro(lv);
}
window.leaveExplain=leaveExplain;window.maybeIntro=maybeIntro;window.introsBefore=introsBefore;window.introsAfter=introsAfter;
initExplain();
