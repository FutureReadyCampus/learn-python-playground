'use strict';
const cv=$('#gl'),stage=$('#stage');
/* ───────── 테마 / 캐릭터 ───────── */
/* 화면 전체(패널·버튼·블록 색·글꼴)를 테마별로 바꾼다. 빠진 값은 우주 테마 기준 */
const UI0={'--bg':'#0a0820','--panel':'#14112f','--panel2':'#1c1840','--line':'#342f6c','--tx':'#ece9ff','--dim':'#9d98cf',
  '--glass':'rgba(20,16,52,.72)','--glass2':'rgba(20,16,52,.94)','--btn':'#241f55','--btn2':'#2f2a6a','--acc':'#6c7bff','--code':'#0d0b25',
  '--card1':'#26205a','--card2':'#171340','--cardb':'#5a52b8','--edbg':'#14112f',
  '--b-move':'#4d8bff','--b-turn':'#8f6bff','--b-gem':'#ffcb3d','--b-sw':'#2fd4a0','--b-loop':'#e552ff','--b-cond':'#ff9440','--f-sw':'#032a1e','--f-cond':'#2e1400',
  '--font-d':"'Jua','Noto Sans KR',-apple-system,'Apple SD Gothic Neo',sans-serif"};
const FD=n=>`'${n}','Noto Sans KR',-apple-system,'Apple SD Gothic Neo',sans-serif`;
const UI={
  prince:{'--bg':'#0b1030','--panel':'#151b44','--panel2':'#1d2558','--line':'#3a4690','--tx':'#fff4d8','--dim':'#c9b98a','--glass':'rgba(24,30,72,.72)','--glass2':'rgba(24,30,72,.94)',
    '--btn':'#262f66','--btn2':'#323d80','--acc':'#c98a2a','--code':'#0e1236','--card1':'#2a2f6a','--card2':'#171c4a','--cardb':'#e0a43a',
    '--edbg':'radial-gradient(circle at 20% 30%,rgba(255,220,140,.12) 0 2px,transparent 3px) 0 0/46px 46px,radial-gradient(circle at 70% 70%,rgba(255,220,140,.08) 0 1.5px,transparent 2.5px) 0 0/38px 38px,linear-gradient(180deg,#1b2350,#121838)',
    '--b-move':'#3f7fbf','--b-turn':'#7a6bb0','--b-gem':'#e8b830','--b-sw':'#e07a3a','--f-sw':'#fff','--b-loop':'#b8508a','--b-cond':'#d89a3a','--font-d':FD('Gowun Batang')},
  wonder:{'--bg':'#150a2e','--panel':'#26104a','--panel2':'#341a62','--line':'#6a3aa8','--tx':'#fff0fb','--dim':'#d6a8e8','--glass':'rgba(50,16,90,.7)','--glass2':'rgba(50,16,90,.94)',
    '--btn':'#42207a','--btn2':'#55308f','--acc':'#e0449a','--code':'#1a0a38','--card1':'#4a2088','--card2':'#2a1050','--cardb':'#ff6ad5',
    '--edbg':'repeating-conic-gradient(rgba(255,255,255,.05) 0 25%,transparent 0 50%) 0 0/36px 36px,#26104a',
    '--b-move':'#e0558f','--b-turn':'#8a5fd8','--b-gem':'#f0c040','--b-sw':'#3fc0b0','--b-loop':'#5a8af0','--b-cond':'#f07a50','--font-d':FD('Gaegu')},
  sea:{'--bg':'#031a2e','--panel':'#073a5c','--panel2':'#0b4d78','--line':'#1f7aa8','--tx':'#e8fbff','--dim':'#8fd0e0','--glass':'rgba(6,50,84,.7)','--glass2':'rgba(6,50,84,.94)',
    '--btn':'#0f5a88','--btn2':'#1a70a0','--acc':'#1fa8b8','--code':'#04283f','--card1':'#0f5a88','--card2':'#06324f','--cardb':'#5ad8e8',
    '--edbg':'radial-gradient(ellipse at 50% 130%,rgba(90,220,232,.3),transparent 62%),radial-gradient(circle at 12% 30%,rgba(255,255,255,.10) 0 4px,transparent 5px) 0 0/90px 70px,#073a5c',
    '--b-move':'#2a9ad8','--b-turn':'#3ab0a0','--b-gem':'#f0b848','--b-sw':'#ff8aa8','--b-loop':'#7a6ae0','--b-cond':'#e08a60','--font-d':FD('Jua')},
  korea:{'--bg':'#0c0a14','--panel':'#2a1f2a','--panel2':'#3a2a30','--line':'#8a4a3a','--tx':'#fff1dc','--dim':'#d8b890','--glass':'rgba(42,24,34,.72)','--glass2':'rgba(42,24,34,.94)',
    '--btn':'#4a2a2e','--btn2':'#5e3a3a','--acc':'#c9534a','--code':'#1e1218','--card1':'#4a2a34','--card2':'#2a1620','--cardb':'#e8c36a',
    '--edbg':'linear-gradient(180deg,#c9534a 0 4px,#e8c36a 4px 7px,#3f9a94 7px 11px,transparent 11px),#2a1f2a',
    '--b-move':'#3a6aa8','--b-turn':'#3f8a82','--b-gem':'#d8a830','--b-sw':'#c9534a','--f-sw':'#fff','--b-loop':'#7a4a8a','--b-cond':'#c9784a','--f-cond':'#fff','--font-d':FD('Song Myung')},
  dino:{'--bg':'#1a0c14','--panel':'#3a2418','--panel2':'#4a3020','--line':'#8a6a3a','--tx':'#fff0d8','--dim':'#dcb888','--glass':'rgba(58,36,24,.72)','--glass2':'rgba(58,36,24,.94)',
    '--btn':'#5a3a24','--btn2':'#704a2e','--acc':'#5a9a3f','--code':'#241408','--card1':'#5a3a24','--card2':'#2e1a10','--cardb':'#8bc34a',
    '--edbg':'radial-gradient(circle at 20% 30%,rgba(139,195,74,.12) 0 18px,transparent 19px),radial-gradient(circle at 75% 60%,rgba(255,160,60,.09) 0 26px,transparent 27px),#3a2418',
    '--b-move':'#4f9a4a','--b-turn':'#3a8a7a','--b-gem':'#e0a030','--b-sw':'#d8603a','--f-sw':'#fff','--b-loop':'#8a6a3a','--b-cond':'#c9503a','--f-cond':'#fff','--font-d':FD('Black Han Sans')},
  winter:{'--bg':'#050c26','--panel':'#16295a','--panel2':'#203a72','--line':'#4a6ab0','--tx':'#f4fbff','--dim':'#a8c8f0','--glass':'rgba(20,40,90,.68)','--glass2':'rgba(20,40,90,.94)',
    '--btn':'#27427a','--btn2':'#335490','--acc':'#3a8ae0','--code':'#0c1a40','--card1':'#2a4a8a','--card2':'#152a5a','--cardb':'#bfe0ff',
    '--edbg':'radial-gradient(circle,rgba(255,255,255,.16) 0 1.5px,transparent 2px) 0 0/28px 28px,radial-gradient(circle,rgba(255,255,255,.1) 0 1px,transparent 2px) 14px 14px/28px 28px,#16295a',
    '--b-move':'#4a8af0','--b-turn':'#7a7af0','--b-gem':'#f0b840','--b-sw':'#3ab08a','--b-loop':'#d85a7a','--b-cond':'#e08a4a','--font-d':FD('Gaegu')},
  racing:{'--bg':'#07040f','--panel':'#1a1228','--panel2':'#241a38','--line':'#4a3a78','--tx':'#ffffff','--dim':'#c0b0e0','--glass':'rgba(26,18,40,.72)','--glass2':'rgba(26,18,40,.94)',
    '--btn':'#2e2048','--btn2':'#40306a','--acc':'#e0289a','--code':'#0e0820','--card1':'#34205a','--card2':'#1a1030','--cardb':'#ff3ab0',
    '--edbg':'repeating-linear-gradient(135deg,rgba(255,255,255,.045) 0 14px,transparent 14px 28px),linear-gradient(180deg,#1a1228,#120a20)',
    '--b-move':'#e8283a','--b-turn':'#2a6aff','--b-gem':'#ffd02a','--b-sw':'#2fd47a','--b-loop':'#b04ae8','--b-cond':'#ff8a2a','--font-d':FD('Do Hyeon')},
  military:{'--bg':'#070a06','--panel':'#1f261a','--panel2':'#2a3322','--line':'#5a6a3a','--tx':'#eef2dc','--dim':'#b0bc90','--glass':'rgba(31,38,26,.72)','--glass2':'rgba(31,38,26,.94)',
    '--btn':'#34402a','--btn2':'#445234','--acc':'#7a8a2a','--code':'#121810','--card1':'#3a4a2a','--card2':'#1c2616','--cardb':'#b8c860',
    '--edbg':'repeating-linear-gradient(45deg,rgba(0,0,0,.14) 0 10px,transparent 10px 20px),#1f261a',
    '--b-move':'#5a7a3a','--b-turn':'#7a6a3a','--b-gem':'#c9a830','--b-sw':'#4a7a5a','--f-sw':'#fff','--b-loop':'#7a6a4a','--b-cond':'#a8603a','--f-cond':'#fff','--font-d':FD('Black Han Sans')}
};
const THEMES={
  space:{bgimg:'assets/bg/space.svg',stars:1,ground:'paver',gacc:0x6fe9ff,out:{k:'nebula',y:-2.4,c:[0x120a30,0x6a3aa8,0x2ab0c8]},props:[['crystal',0x8affea,0xff8fe0],['rock',0x4a3a96],['pole',0x8a8fc8,0x7df9ff]],name:'우주',char:'byte',chars:['byte','prince','fox'],noun:'보석',sw:'스위치',bg:'radial-gradient(120% 90% at 50% 18%,#43297f 0%,#1c1546 46%,#080618 100%)',
    tops:[0,0x4ee6cf,0x7fa8ff,0xc88bff,0xff8fcc],under:0x3a2c7c,rock:0x4a3a96,rockE:0x1a1050,star:0xcdd6ff,starSize:.7,
    hemi:[0xaab8ff,0x3a1d6e],sun:0xfff1e0,rim:[0xff4fd8,0x39c8ff],ic:0xffd34d,swOn:0x38e0a6,swOff:0xff5d7a,swOffE:0x55101c},
  prince:{bgimg:'assets/bg/prince.svg',stars:1,ui:UI.prince,ground:'turf',gacc:[0xfff4b0,0xffffff],out:{k:'dust',y:-.55,c:[0x6a4a5a,0x3a2a44,0xa0809a]},props:[['baobab',0x8a5a3a,0x4a8a4a],['volc',0x6a4a3a,0xff8a2a],['rock',0x7a5a5a],['tuft',0x7fb35e,0xe0c27a]],name:'별빛 소행성',char:'prince',chars:['prince','fox','byte'],noun:'장미',sw:'화산',swv:'화산 깨우기',pick:['돌봐요','돌보기'],item:'rose',io:.35,
    swb:{g:[.16,.34,.3,0x7a4a36],top:[.14,.05],ty:.3},
    bg:'linear-gradient(0deg,rgba(255,176,96,.3),rgba(255,176,96,0) 40%),radial-gradient(120% 90% at 50% 15%,#34479a 0%,#1d2760 46%,#0b1033 100%)',
    tops:[0,0xd9a441,0xc98a3a,0x7fb35e,0xe0c27a],under:0x6b4a3a,rock:0x9a7a52,rockE:0x2a1a0a,star:0xfff0c0,starSize:1.1,
    hemi:[0xffe2a8,0x1d2a5a],sun:0xffd9a0,rim:[0xffb347,0x6aa7ff],ic:0xff5f8a,swOn:0xff8a2a,swOff:0x4a2418,swOffE:0x000000},
  wonder:{bgimg:'assets/bg/wonder.svg',bgpos:'12% center',ui:UI.wonder,ground:'turf',gacc:[0xffffff,0xffe14a],out:{k:'checker',y:-.55,c:[0x3a1a6a,0x5a2a8a]},props:[['mush',0xf4e8d8,0xe0334c,0xffffff],['flower',0x3f9a4f,0xff8ad0,0xffe14a],['tuft',0x4fc9a0,0xb48cf0]],name:'이상한 나라',char:'alice',chars:['alice','rabbit','cat','byte'],noun:'하트 카드',sw:'버섯',swv:'버섯 먹기',pick:['모아요','모으기'],item:'card',io:.55,
    bg:'radial-gradient(120% 90% at 50% 18%,#6a2c8f 0%,#2a1a66 48%,#0b0a2a 100%)',
    tops:[0,0xf06aa8,0x4fc9c0,0xb48cf0,0xffd36a],ck:.7,under:0x5a2a6a,rock:0xffffff,rockE:0x555566,rockT:'card',star:0xffe0ff,starSize:.9,
    hemi:[0xffd0f4,0x2a1450],sun:0xfff0d8,rim:[0xff6ad5,0x5affd8],ic:0xff4f7a,swOn:0xff6ad5,swOff:0x6a5a9a,swOffE:0x000000,
    swb:{g:[.07,.1,.26,0xf4e8d8],top:[.27,.1],ty:.3}},
  sea:{bgimg:'assets/bg/sea.svg',ui:UI.sea,ground:['','sand','planks','sand','planks'],out:{k:'water',y:-.3,c:[0x0f6a94,0x2fb8d8]},props:[['palm',0x8a5a32,0x3fb86a],['rock',0x7a8a9a],['tuft',0xff7a9a,0xffb86a]],name:'바다',char:'mermaid',chars:['mermaid','turtle','octo','byte'],noun:'진주',sw:'조개',swv:'조개 열기',pick:['모아요','모으기'],item:'pearl',io:.45,
    bg:'radial-gradient(120% 90% at 50% 15%,#1b8aa6 0%,#0d4a7a 48%,#03163a 100%)',
    tops:[0,0xf2d6a0,0xff9a86,0x5cd0e0,0xb59cff],ck:.88,under:0x1f5a7a,rock:0xbff4ff,rockE:0x2a6a8a,rockT:'bubble',rockA:.4,star:0x9ef0ff,starSize:1,
    hemi:[0x9fe8ff,0x0a2a5a],sun:0xd8fff8,rim:[0x5affd8,0xff9ad0],ic:0xffffff,swOn:0xffb0e0,swOff:0x8a6a9a,swOffE:0x000000,
    swb:{g:[.26,.3,.1,0xff9ab0],top:[.2,.06],ty:.12}},
  korea:{bgimg:'assets/bg/korea.svg',bgpos:'84% center',ui:UI.korea,ground:'hanok',out:{k:'gravel',y:-.5,c:[0xcfc7b2,0x9a937f]},props:[['pine',0x6a4a32,0x2f6a4a],['lantern',0x9a9aa4,0xffd88a],['rock',0x8a8a92],['hut',0xe8d8a8,0x7a5a3a]],name:'한국 옛이야기',char:'tiger',chars:['tiger','hare','dokk','byte'],noun:'복주머니',sw:'등불',swv:'등불 켜기',pick:['챙겨요','챙기기'],item:'pouch',io:.4,moon:1,
    bg:'radial-gradient(120% 90% at 50% 18%,#2a3a8a 0%,#161c52 48%,#070a22 100%)',
    tops:[0,0x7f94ae,0xc9534a,0x3f9a94,0xe8c36a],ck:.82,under:0x3a2f2a,rock:0xeee6d4,rockE:0x6a6a7a,rockT:'cloud',star:0xfff4d0,starSize:.9,
    hemi:[0xd8e0ff,0x20224a],sun:0xfff2d0,rim:[0xffb35a,0x7aa0ff],ic:0xffd34d,swOn:0xffc24a,swOff:0x5a2a24,swOffE:0x000000,
    swb:{g:[.17,.19,.3,0xc9534a],top:[.15,.08],ty:.32}},
  dino:{bgimg:'assets/bg/dino.svg',bgpos:'70% center',ui:UI.dino,ground:'earth',out:{k:'lava',y:-.5,c:[0xff4a0a,0x241010]},props:[['cycad',0x6a4a32,0x3f9a4a],['rock',0x3a2a28],['volc',0x4a3028,0xff7a1a],['tuft',0x5aa84a,0x8bc34a]],name:'공룡 시대',char:'trex',chars:['trex','trike','stego','byte'],noun:'공룡알',sw:'화산',swv:'화산 깨우기',pick:['찾아요','찾기'],item:'egg',io:.4,
    bg:'linear-gradient(0deg,rgba(255,120,60,.35),rgba(255,120,60,0) 45%),radial-gradient(120% 90% at 50% 15%,#d4683a 0%,#8a3a4a 46%,#2a1438 100%)',
    tops:[0,0x8bc34a,0x6aa84f,0xc8a15a,0xe0b06a],ck:.88,under:0x5a4630,rock:0x8a6a4a,rockE:0x2a1a0a,star:0xffe0b0,starSize:.8,
    hemi:[0xffe7b0,0x3a2a2a],sun:0xffe0b0,rim:[0xff8a4a,0x7aff9a],ic:0xf2ffd0,swOn:0xff8a2a,swOff:0x4a2418,swOffE:0x000000,
    swb:{g:[.16,.34,.3,0x6a4a3a],top:[.14,.05],ty:.3}},
  winter:{bgimg:'assets/bg/winter.svg',ui:UI.winter,ground:'snow',out:{k:'snow',y:-.5,dim:.4,c:[0xdfeaf8,0xb0c8e8,0x8ab0e0]},props:[['pine',0x6a4a32,0x2f7a5a,0xffffff],['rock',0xcfd8e8],['crystal',0xbfe8ff,0x8ac8ff],['tuft',0x9ac8a8,0xdfeaf8]],name:'눈의 나라',char:'snowman',chars:['snowman','penguin','bear','byte'],noun:'선물',sw:'전구',swv:'전구 켜기',pick:['모아요','모으기'],item:'gift',io:.4,
    bg:'linear-gradient(0deg,rgba(120,255,200,.2),rgba(120,255,200,0) 40%),radial-gradient(120% 90% at 50% 15%,#2a4a9a 0%,#162466 48%,#070d2e 100%)',
    tops:[0,0xcfe0f5,0xb5cdee,0x97b3e6,0xe8f2ff],ck:.9,under:0x6a8fb8,rock:0xe8f6ff,rockE:0x4a6a9a,rockT:'flake',star:0xffffff,starSize:1,
    hemi:[0xdff0ff,0x2a3f78],sun:0xffffff,rim:[0x7affd0,0xff9ae0],ic:0xff5f5f,swOn:0xffe14a,swOff:0x6a5a30,swOffE:0x000000,
    swb:{g:[.1,.14,.2,0x3a8a4a],top:[.16,.1],ty:.25}},
  racing:{bgimg:'assets/bg/racing.svg',bgpos:'50% center',ui:UI.racing,ground:'asphalt',out:{k:'grass',y:-.5,c:[0x2e7d3a,0x3a9648]},props:[['stack',0xe8283a,0xffffff],['cone',0xff7a1a,0xffffff,0x333844],['pole',0x6a6f7c,0xfff0a0],['wall',0xe8283a,0xffffff]],name:'레이싱',char:'sportscar',chars:['sportscar','formula','bike','byte'],noun:'트로피',sw:'신호등',swv:'신호등 켜기',pick:['챙겨요','챙기기'],item:'trophy',io:.4,
    bg:'linear-gradient(0deg,rgba(255,80,160,.35),rgba(255,80,160,0) 42%),radial-gradient(120% 90% at 50% 15%,#4a1f8f 0%,#231452 48%,#0a0620 100%)',
    tops:[0,0x4a4f5c,0x6a6f7c,0xe8c040,0x8a90a0],ck:.62,under:0x2a2c38,rock:0xff7a1a,rockE:0x602000,rockT:'cone',star:0xff9ae0,starSize:.9,
    hemi:[0xffb0e0,0x1a1050],sun:0xffe0f0,rim:[0xff3ab0,0x3ad0ff],ic:0xffd34d,swOn:0x44ff88,swOff:0xff4a4a,swOffE:0x550a0a,
    swb:{g:[.05,.07,.36,0x333844],top:[.12,.12],ty:.42}},
  military:{bgimg:'assets/bg/military.svg',bgpos:'16% center',ui:UI.military,ground:'paver',moss:1,out:{k:'dirt',y:-.5,c:[0x6b6a45,0x4a4a2e,0x7a8a4a]},props:[['pine',0x5a4630,0x3a5a32],['wall',0xb0a070,0xa09060],['cross',0x555a4a],['hut',0x6a7a3e,0x4a5a2e],['rock',0x8a8a6a]],name:'군대',char:'soldier',chars:['soldier','tank','heli','byte'],noun:'보급 상자',sw:'레이더',swv:'레이더 켜기',pick:['회수해요','회수하기'],item:'crate',io:.4,
    bg:'linear-gradient(0deg,rgba(255,190,90,.3),rgba(255,190,90,0) 40%),radial-gradient(120% 90% at 50% 15%,#6a7a6a 0%,#3a4a3e 48%,#10170f 100%)',
    tops:[0,0x7a8a4a,0x6a7a3e,0x9a8a5a,0xb0a070],ck:.82,under:0x4a4a30,rock:0xb0a070,rockE:0x2a2a10,rockT:'cloud',star:0xe8f0d0,starSize:.7,
    hemi:[0xe8f0d0,0x2a3020],sun:0xfff0d0,rim:[0xffb060,0x80ffa0],ic:0xb8e06a,swOn:0x66ff88,swOff:0x3a4a30,swOffE:0x000000,
    swb:{g:[.06,.1,.3,0x5a6048],top:[.2,.04],ty:.34}}
};
const CHARS={byte:{name:'Byte',lt:0x7df9ff},prince:{name:'별 여행자',lt:0xffe3a0},fox:{name:'여우',lt:0xffb070},
  alice:{name:'앨리스',lt:0xbfe0ff},rabbit:{name:'흰 토끼',lt:0xffe0e0},cat:{name:'체셔 고양이',lt:0xe0b0ff},
  mermaid:{name:'인어공주',lt:0xa0f0ff},turtle:{name:'바다거북',lt:0xb0ffc0},octo:{name:'문어',lt:0xe0a0ff},
  tiger:{name:'호랑이',lt:0xffc080},hare:{name:'토끼',lt:0xfff0e0},dokk:{name:'도깨비',lt:0xa0c0ff},
  trex:{name:'티라노',lt:0xc0ffb0},trike:{name:'트리케라톱스',lt:0xb0d0ff},stego:{name:'스테고',lt:0xb0ffd0},
  snowman:{name:'눈사람',lt:0xe0f0ff},penguin:{name:'펭귄',lt:0xd0f0ff},bear:{name:'북극곰',lt:0xe8f4ff},
  sportscar:{name:'스포츠카',lt:0xffd0d0},formula:{name:'포뮬러 카',lt:0xc0d8ff},bike:{name:'오토바이',lt:0xffe0c0},
  soldier:{name:'병사',lt:0xd8f0b0},tank:{name:'전차',lt:0xd0e8a8},heli:{name:'헬리콥터',lt:0xd0f0d0}};
let themeId='space',CH='byte',TH=THEMES.space;
try{const s=(localStorage.getItem('bp-skin')||'').split(',');if(THEMES[s[0]]){themeId=s[0];CH=THEMES[s[0]].char;if(THEMES[s[0]].chars.includes(s[1]))CH=s[1]}}catch(e){}
TH=THEMES[themeId];
const WXOPT=[['auto','테마 기본'],['none','없음'],['snow','눈'],['maple','단풍'],['sakura','벚꽃'],['fire','반딧불']],
  WXAUTO={winter:'snow',korea:'maple',prince:'fire',wonder:'sakura'};
let WX='auto',RND=false,started=false;
try{const w=localStorage.getItem('bp-wx');if(WXOPT.some(o=>o[0]==w))WX=w;RND=localStorage.getItem('bp-rand')=='1'}catch(e){}
const curWx=()=>WX=='auto'?(WXAUTO[themeId]||'none'):WX;
// 테마에 맞게 화면 속 낱말을 바꿔요
const KIND={을:'o',를:'o',이:'s',가:'s',은:'t',는:'t',과:'w',와:'w'},JP={o:['을','를'],s:['이','가'],t:['은','는'],w:['과','와']};
const jong=w=>(w.charCodeAt(w.length-1)-44032)%28>0;
const swap=(s,a,b)=>s.replace(new RegExp(a+'(을|를|이|가|은|는|과|와)?','g'),(m,p)=>b+(p?JP[KIND[p]][jong(b)?0:1]:''));
const tx=s=>{
  if(TH.pick)s=s.replace(/주워요/g,TH.pick[0]).replace(/줍기/g,TH.pick[1]);
  if(TH.swv)s=s.replace(/스위치 누르기/g,TH.swv);
  if(TH.noun!='보석')s=swap(s,'보석',TH.noun);
  if(TH.sw!='스위치')s=swap(s,'스위치',TH.sw);
  return swap(s,'Byte',CHARS[CH].name);
};
