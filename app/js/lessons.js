'use strict';
// 레슨 JSON(lessons/*.json)을 화면에서 쓰는 레슨(LEVELS)으로 바꿔요. 규칙은 py/puzzle.py 가 갖고 있고, 여기서는 지도를 그리는 데 필요한 값만 읽어요.
// H: 높이(1~4, .은 빈 칸) / O: ^>v< 주인공 시작+방향, g 보석, o 스위치, a~f 포털(a b / c d / e f 가 한 쌍)
const BK=window.BLOCKS;                                    // lessons/blocks.json: Tour 블록 정의
const joinLines=l=>Array.isArray(l)?l.join('\n')+'\n':l;
function parseMap(H,O){
  const m={H:H.map(r=>[...r].map(c=>c=='.'?0:+c)),gems:[],sws:[],portals:{},start:null};
  O.forEach((r,z)=>[...r].forEach((c,x)=>{
    if('^>v<'.includes(c))m.start=[x,z,'^>v<'.indexOf(c)];
    else if(c=='g')m.gems.push([x,z]);else if(c=='o')m.sws.push(x+','+z);else if('abcdef'.includes(c))m.portals[c]=[x,z];
  }));
  return m;
}
const slotsOf=s=>(s||[]).map(a=>[a[0],a[1],'^>v<'.indexOf(a[2]),...a.slice(3)]);
function mk(d){
  const base={plats:d.plats||[],slots:slotsOf(d.slots),portals_off:d.portals_off||[]};
  const lv={...d,...parseMap(d.H,d.O),...base,solution:joinLines(d.solution),starter:d.starter?joinLines(d.starter):undefined};
  lv.variants=(d.variants||[]).map(v=>({...parseMap(v.H,v.O),...base,plats:v.plats||base.plats,slots:v.slots?slotsOf(v.slots):base.slots}));
  lv.maps=[lv,...lv.variants];                             // 실행마다 보여 줄 맵들 (맵이 하나뿐이면 길이 1)
  return lv;
}
/* 3개 코스: 살펴보기(블록) → 입문편(코드) → 활용편(코드). 파일 순서가 곧 레슨 순서 */
const COURSES=[
  {name:'살펴보기',en:'Tour',mode:'blocks',file:'tour',done:'살펴보기를 마쳤어요. 이제 입문편에서는 파이썬 코드를 직접 써 봐요.'},
  {name:'입문편',en:'Basics',mode:'code',file:'basics',done:'입문편을 마쳤어요. 활용편에서는 배운 것을 섞어서 풀어 봐요.'},
  {name:'활용편',en:'Practice',mode:'code',file:'practice',done:'모든 단계를 마쳤어요. 정말 잘했어요!'}
];
/* 유닛(챕터) 이름. 왼쪽 목록에서 접고 펴는 묶음이 돼요 */
const UNITS={T1:'명령',T2:'반복',T3:'조건',T4:'논리',T5:'변수',T6:'객체와 속성',T7:'객체 만들기',T8:'함수',T9:'매개변수',
  B1:'명령과 순서',B2:'함수',B3:'for 반복',B4:'조건문',B5:'논리 연산자',B6:'while 반복',B7:'알고리즘',B8:'print와 문자열',B9:'break와 continue',B10:'try와 except',
  P1:'변수',P2:'객체와 속성',P3:'객체 만들기',P4:'매개변수',P5:'세상 만들기',P6:'리스트',P7:'딕셔너리',P8:'클래스',P9:'파일과 with',P10:'리스트 컴프리헨션'};
/* 레슨 제목 앞에 개념 이름을 붙여요: 'and - 둘 다 맞을 때' */
const titleOf=L=>(L.tag?L.tag+' - ':'')+tx(L.name);
const LEVELS=[];
COURSES.forEach(c=>{
  const ls=window.LESSONS[c.file];
  c.from=LEVELS.length;c.to=c.from+ls.length-1;
  ls.forEach(d=>{const lv=mk(d);lv.course=c;LEVELS.push(lv)});
});
/* 유닛 번호: 코스마다 1부터 (왼쪽 목록의 Unit N) */
const UNIT_NO={};COURSES.forEach(c=>{let n=0;for(let i=c.from;i<=c.to;i++){const u=LEVELS[i].unit;if(!(u in UNIT_NO)){UNIT_NO[u]=++n}}});
/* 파이썬 실행기에 넘기는 레슨: Tour는 블록 종류를 문법 열쇠로 바꿔요 */
const gatesOf=tools=>[...new Set(tools.map(k=>BK[k]&&BK[k].gate).filter(Boolean))];
const rawOf=lv=>JSON.stringify(lv.course.mode=='blocks'?{...lv.raw,tools:gatesOf(lv.tools)}:lv.raw);
// 실행기는 문자열 지도(H/O)를 읽으니 원본 JSON을 그대로 들고 있어요
LEVELS.forEach(lv=>{lv.raw=window.LESSONS[lv.course.file].find(d=>d.id==lv.id)});
