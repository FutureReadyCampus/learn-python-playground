'use strict';
let R=null,fx={},scene,cam,robot,inner,world,dyn,rocks;
let T=0,spd=1,yaw=0,userYaw=0,drag3=null,distT=14,distC=14,camR=5,viewH=0;
const tw=[],pops=[],cur={gems:new Map(),sws:new Map(),portals:new Map(),tiles:new Map(),marks:new Map(),H:null,dirty:false,lv:null,cx:0,cz:0};
const extra=new Map();                              // 주인공 말고 부른 도우미들 (번호 → {rb,inn,yaw})
const PCOL={orange:0xff9a3d,blue:0x3dd2ff,green:0x45e07a},PAIR=['orange','blue','green'];
const Yt=h=>h*.5,eio=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2,backo=k=>{const c=1.70158+1;return 1+c*Math.pow(k-1,3)+1.70158*Math.pow(k-1,2)};
const yawOf=d=>Math.atan2(DIRS[d][0],DIRS[d][1]);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
function tween(d,f){return new Promise(r=>tw.push({t:0,d:d,f,r}))}
let paused=false;                                   // 일시정지: 트윈과 wait 가 멈춰요
function wait(ms){return new Promise(r=>{let t=ms,l=performance.now();const f=()=>{const n=performance.now();if(!paused)t-=n-l;l=n;t<=0?r():setTimeout(f,Math.min(t,50))};f()})}

try{
  if(!window.THREE)throw 0;
  R=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
}catch(e){R=null;$('#nogl').hidden=false}

if(R){
  R.setPixelRatio(Math.min(devicePixelRatio||1,2));
  R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=.85;
  R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();cam=new THREE.PerspectiveCamera(36,1,.1,300);
  const hemi=new THREE.HemisphereLight(0xaab8ff,0x3a1d6e,.85);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xfff1e0,1.05);sun.position.set(6,12,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:40});scene.add(sun);
  const r1=new THREE.PointLight(0xff4fd8,1,32);r1.position.set(-8,4,-6);scene.add(r1);
  const r2=new THREE.PointLight(0x39c8ff,1,32);r2.position.set(8,3,8);scene.add(r2);const L={hemi,sun,r1,r2};

  const gc=document.createElement('canvas');gc.width=gc.height=64;
  {const g=gc.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.5)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64)}
  const GLOW=new THREE.CanvasTexture(gc);
  const glow=(c,s,o)=>{const m=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color:c,transparent:true,opacity:o,blending:THREE.AdditiveBlending,depthWrite:false}));m.scale.set(s,s,1);return m};

  // 별
  {const n=1100,p=new Float32Array(n*3);for(let i=0;i<n;i++){const r=45+Math.random()*30,t=Math.random()*6.283,u=Math.acos(2*Math.random()-1);p[i*3]=r*Math.sin(u)*Math.cos(t);p[i*3+1]=r*Math.cos(u);p[i*3+2]=r*Math.sin(u)*Math.sin(t)}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));
   const s=new THREE.Points(g,new THREE.PointsMaterial({size:.7,map:GLOW,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,color:0xcdd6ff}));s.name='stars';scene.add(s)}

  // 달 (한국 옛이야기 테마)
  const moon=new THREE.Group();{const d=new THREE.Mesh(new THREE.CircleGeometry(1.7,40),new THREE.MeshBasicMaterial({color:0xfff1b8}));const h=glow(0xffe9a0,9,.4);h.position.z=-.5;moon.add(d,h)}
  moon.position.set(-12,-12,-18);moon.visible=false;scene.add(moon);
  // 파티클
  const NP=800,pp=new Float32Array(NP*3).fill(-999),pc=new Float32Array(NP*3),pv=new Float32Array(NP*3),pl=new Float32Array(NP),pm=new Float32Array(NP),pk=new Float32Array(NP*3);let pi=0;
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pp,3));pg.setAttribute('color',new THREE.BufferAttribute(pc,3));
  const pts=new THREE.Points(pg,new THREE.PointsMaterial({size:.26,map:GLOW,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));pts.frustumCulled=false;scene.add(pts);
  const burst=(v,hex,n=24,sp=2,life=.8)=>{const c=new THREE.Color(hex);if(reduce)n=Math.ceil(n/3);
    for(let i=0;i<n;i++){const k=pi++%NP,a=Math.random()*6.283,u=Math.random()*2-1,s=sp*(.35+Math.random()*.65),r=Math.sqrt(1-u*u);
      pp[k*3]=v.x;pp[k*3+1]=v.y;pp[k*3+2]=v.z;pv[k*3]=r*Math.cos(a)*s;pv[k*3+1]=(u*.6+.55)*s;pv[k*3+2]=r*Math.sin(a)*s;
      pm[k]=pl[k]=life*(.6+Math.random()*.6);pk[k*3]=c.r;pk[k*3+1]=c.g;pk[k*3+2]=c.b}};

  // 날씨: 눈, 단풍, 벚꽃, 반딧불
  const WN=300,wp=new Float32Array(WN*3).fill(-99),wc=new Float32Array(WN*3),wph=new Float32Array(WN*2);
  const mkTex=d=>{const c=document.createElement('canvas');c.width=c.height=64;d(c.getContext('2d'));return new THREE.CanvasTexture(c)};
  const WTEX={snow:GLOW,fire:GLOW,
    maple:mkTex(g=>{g.fillStyle='#fff';g.beginPath();for(let i=0;i<10;i++){const a=i/10*6.283-1.571,r=i%2?12:30;g.lineTo(32+Math.cos(a)*r,34+Math.sin(a)*r)}g.closePath();g.fill();g.fillRect(31,40,2,20)}),
    sakura:mkTex(g=>{g.fillStyle='#fff';g.beginPath();g.ellipse(32,32,13,24,.6,0,6.283);g.fill()})};
  const WCOL={snow:[0xffffff],maple:[0xe8481c,0xf08a1c,0xd4281c,0xf5c02a],sakura:[0xffc2d8,0xffadc8,0xffe0ea],fire:[0xe8ff70,0xb8ff90]},
    WSET={snow:{s:.14,v:[.7,1.2],d:.35},maple:{s:.22,v:[.5,.9],d:.8},sakura:{s:.2,v:[.4,.8],d:.7},fire:{s:.22,v:[0,0],d:.3}};
  const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.BufferAttribute(wp,3));wg.setAttribute('color',new THREE.BufferAttribute(wc,3));
  const wm=new THREE.PointsMaterial({size:.3,map:GLOW,vertexColors:true,transparent:true,depthWrite:false,alphaTest:.05});
  const wx=new THREE.Points(wg,wm);wx.frustumCulled=false;wx.visible=false;scene.add(wx);let wkind=null;
  const setWeather=k=>{
    if(!k||k=='none'){wx.visible=false;wkind=null;return}
    wkind=k;const ws=WSET[k],cs=WCOL[k];wm.map=WTEX[k];wm.size=ws.s;wm.blending=k=='fire'?THREE.AdditiveBlending:THREE.NormalBlending;wm.needsUpdate=true;
    for(let i=0;i<WN;i++){wp[i*3]=(Math.random()-.5)*14;wp[i*3+1]=-3+Math.random()*12;wp[i*3+2]=(Math.random()-.5)*14;
      const c=new THREE.Color(cs[i%cs.length]);wc[i*3]=c.r;wc[i*3+1]=c.g;wc[i*3+2]=c.b;wph[i*2]=Math.random()*6.28;wph[i*2+1]=ws.v[0]+Math.random()*(ws.v[1]-ws.v[0])}
    wx.visible=true;wg.attributes.position.needsUpdate=true;wg.attributes.color.needsUpdate=true};

  world=new THREE.Group();dyn=new THREE.Group();rocks=new THREE.Group();scene.add(world,dyn,rocks,GR.land);

  // 로봇 Byte
  robot=new THREE.Group();inner=new THREE.Group();robot.add(inner);
  {const M=(c,r=.4,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m}),white=M(0xf2f4ff,.3,.1),dark=M(0x1b1840,.25,.3),acc=M(0x6c7bff,.4);
   const eye=new THREE.MeshBasicMaterial({color:0x7df9ff}),add=(g,m,x,y,z,sx=1,sy=1,sz=1)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;inner.add(o);return o};
   add(new THREE.CylinderGeometry(.2,.25,.34,24),white,0,.3,0);
   add(new THREE.SphereGeometry(.27,28,20),white,0,.68,0,1,.86,.95);
   add(new THREE.SphereGeometry(.2,24,16),dark,0,.69,.12,1.1,.72,.62);
   add(new THREE.SphereGeometry(.042,12,10),eye,-.085,.7,.255);add(new THREE.SphereGeometry(.042,12,10),eye,.085,.7,.255);
   add(new THREE.CircleGeometry(.06,16),eye,0,.31,.255);
   add(new THREE.CylinderGeometry(.012,.012,.17,8),dark,0,.96,0);
   const tip=add(new THREE.SphereGeometry(.045,12,10),new THREE.MeshBasicMaterial({color:0xff5fd0}),0,1.06,0);tip.add(glow(0xff5fd0,.5,.8));
   add(new THREE.SphereGeometry(.07,12,10),acc,-.27,.32,0,.8,1.4,.8);add(new THREE.SphereGeometry(.07,12,10),acc,.27,.32,0,.8,1.4,.8);
   add(new THREE.SphereGeometry(.105,14,10),acc,-.11,.06,.03,1,.55,1.3);add(new THREE.SphereGeometry(.105,14,10),acc,.11,.06,.03,1,.55,1.3);
   inner.userData.tip=tip;
   const l=new THREE.PointLight(0x7df9ff,.8,4.5);l.position.set(0,1.1,0);robot.add(l)}
  scene.add(robot);
  // 어린왕자와 여우 (Byte를 한 그룹으로 묶고 나머지를 옆에 둔다)
  const charGroups={};
  {const bg=new THREE.Group();[...inner.children].forEach(c=>bg.add(c));inner.add(bg);charGroups.byte=bg;
   const M=(c,r=.55)=>new THREE.MeshStandardMaterial({color:c,roughness:r}),
     add=(p,g,m,x,y,z,sx=1,sy=1,sz=1)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;p.add(o);return o},
     S=r=>new THREE.SphereGeometry(r,16,12),C=(r,h,n=10)=>new THREE.ConeGeometry(r,h,n),Y=(a,b,h,n=14)=>new THREE.CylinderGeometry(a,b,h,n);
   // 별 여행자: 털모자와 배낭을 멘 우리만의 캐릭터
   const pr=new THREE.Group(),coat=M(0x2f4a8a),skin=M(0xffd9b0,.7),hat=M(0x6a3fa0,.8),scarf=M(0xe8603a,.6),boot=M(0x7a4a2a),pack=M(0xc98a3a),dk=new THREE.MeshBasicMaterial({color:0x2a2018});
   add(pr,Y(.14,.26,.4,20),coat,0,.32,0);add(pr,S(.22),skin,0,.72,0);add(pr,S(.235),hat,0,.8,-.01,1,.72,1);add(pr,S(.06),scarf,0,1.0,-.02);
   add(pr,new THREE.BoxGeometry(.26,.28,.12),pack,0,.4,-.22);
   add(pr,S(.026),dk,-.075,.73,.2);add(pr,S(.026),dk,.075,.73,.2);
   add(pr,new THREE.TorusGeometry(.15,.05,8,20),scarf,0,.52,0).rotation.x=Math.PI/2;
   const st=new THREE.Group();st.position.set(0,.5,-.1);pr.add(st);add(st,new THREE.BoxGeometry(.09,.03,.42),scarf,.07,0,-.2);
   add(pr,S(.06),coat,-.2,.34,0,.8,1.4,.8);add(pr,S(.06),coat,.2,.34,0,.8,1.4,.8);
   add(pr,S(.09),boot,-.08,.06,.03,1,.6,1.3);add(pr,S(.09),boot,.08,.06,.03,1,.6,1.3);
   pr.userData.idle=t=>{st.rotation.x=Math.sin(t*3)*.18;st.rotation.y=Math.sin(t*2.3)*.25};
   inner.add(pr);charGroups.prince=pr;
   const fo=new THREE.Group(),or=M(0xe8742a,.6),wh=M(0xfff4e6,.6),db=M(0x2a1a14,.4);
   add(fo,S(.2),or,0,.27,0,.8,.75,1.3);add(fo,S(.12),wh,0,.22,.17,.9,.9,.8);add(fo,S(.18),or,0,.5,.2,1,.9,1);
   add(fo,C(.08,.2,12),or,0,.46,.37).rotation.x=Math.PI/2;add(fo,S(.032),db,0,.46,.48);
   add(fo,S(.09),wh,-.09,.44,.3,1,.7,1);add(fo,S(.09),wh,.09,.44,.3,1,.7,1);
   add(fo,C(.07,.22,4),or,-.1,.72,.16);add(fo,C(.07,.22,4),or,.1,.72,.16);
   add(fo,S(.022),db,-.075,.54,.35);add(fo,S(.022),db,.075,.54,.35);
   [[-.09,.14],[.09,.14],[-.09,-.14],[.09,-.14]].forEach(([x,z])=>add(fo,Y(.032,.04,.17,8),db,x,.085,z));
   const tg=new THREE.Group();tg.position.set(0,.32,-.22);fo.add(tg);add(tg,S(.12),or,0,0,-.16,.6,.6,1.7);add(tg,S(.075),wh,0,0,-.35);
   fo.userData.idle=t=>{tg.rotation.y=Math.sin(t*6)*.35};
   inner.add(fo);charGroups.fox=fo}
  // ── 캐릭터 도감: 삽화풍 검은 윤곽선을 두른 단순한 도형 모델 ──
  const OL=new THREE.MeshBasicMaterial({color:0x1a1030,side:THREE.BackSide});
  const outline=g=>{const ms=[];g.traverse(o=>{if(o.isMesh&&o.material.type=='MeshStandardMaterial')ms.push(o)});ms.forEach(o=>{const h=new THREE.Mesh(o.geometry,OL);h.scale.setScalar(1.08);o.add(h)})};
  outline(charGroups.prince);outline(charGroups.fox);
  const CB={};
  {const mt=(c,r=.6)=>new THREE.MeshStandardMaterial({color:c,roughness:r}),K=new THREE.MeshBasicMaterial({color:0x2a2018}),WB=new THREE.MeshBasicMaterial({color:0xffffff}),YB=new THREE.MeshBasicMaterial({color:0xfff25a});
   const A=(p,g,m,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.set(rx,ry,rz);o.castShadow=true;p.add(o);return o};
   const S=r=>new THREE.SphereGeometry(r,16,12),C=(r,h,n=10)=>new THREE.ConeGeometry(r,h,n),Y=(a,b,h,n=14)=>new THREE.CylinderGeometry(a,b,h,n),B=(w,h,d)=>new THREE.BoxGeometry(w,h,d),TO=(r,t,a=6.283)=>new THREE.TorusGeometry(r,t,8,20,a);
   const eyes=(g,y,z,dx=.075,r=.026)=>{A(g,S(r),K,-dx,y,z);A(g,S(r),K,dx,y,z)};
   const legs=(g,m,xs,zs,h=.14,r=.04)=>xs.forEach(x=>zs.forEach(z=>A(g,Y(r,r*1.1,h,8),m,x,h/2,z)));
   const arms=(g,m,y=.34,x=.2)=>{A(g,S(.06),m,-x,y,0,.8,1.4,.8);A(g,S(.06),m,x,y,0,.8,1.4,.8)};
   CB.alice=g=>{const bl=mt(0x5aa8ff),sk=mt(0xffd9b0,.7),hr=mt(0xffd860,.7),wh=mt(0xffffff),bk=mt(0x222244);
     A(g,Y(.1,.26,.42,20),bl,0,.3,0);A(g,B(.17,.3,.03),wh,0,.28,.19,1,1,1,-.15);
     A(g,S(.21),sk,0,.72,0);A(g,S(.23),hr,0,.76,-.05,1,.95,1);A(g,S(.19),hr,0,.52,-.15,1,1.7,.7);
     A(g,S(.05),bk,-.08,.95,.02);A(g,S(.05),bk,.08,.95,.02);eyes(g,.73,.19);arms(g,bl);
     legs(g,wh,[-.07,.07],[.02],.1,.035);A(g,S(.06),bk,-.07,.03,.04,1,.6,1.3);A(g,S(.06),bk,.07,.03,.04,1,.6,1.3)};
   const rabbit=vest=>g=>{const wh=mt(0xffffff,.8),pk=mt(0xffb0c0),rd=mt(0xc83a3a),go=mt(0xffd24a,.3);
     A(g,S(.2),wh,0,.3,0,.9,1,.85);A(g,S(.17),wh,0,.62,.03);
     [-1,1].forEach(s=>{A(g,Y(.04,.05,.4,10),wh,s*.07,.98,0,1,1,1,0,0,-s*.14);A(g,Y(.02,.03,.3,8),pk,s*.075,.98,.03,1,1,1,0,0,-s*.14)});
     A(g,S(.025),pk,0,.6,.2);eyes(g,.66,.18,.065,.022);A(g,S(.07),wh,0,.2,-.2);legs(g,wh,[-.08,.08],[.04],.1,.045);
     if(vest){A(g,Y(.195,.215,.2,18),rd,0,.3,0);A(g,S(.03),go,.1,.28,.19)}};
   CB.rabbit=rabbit(true);CB.hare=rabbit(false);
   CB.cat=g=>{const pu=mt(0xb06ad8),pk=mt(0xff8ad0),wh=mt(0xffffff);
     A(g,S(.2),pu,0,.27,0,1,.8,1.25);[-.12,0,.12].forEach(z=>A(g,S(.2),pk,0,.3,z,.92,.82,.12));
     A(g,S(.2),pu,0,.55,.15,1.2,.9,1);A(g,C(.07,.15,4),pu,-.13,.76,.12);A(g,C(.07,.15,4),pu,.13,.76,.12);
     A(g,S(.05),YB,-.08,.6,.32);A(g,S(.05),YB,.08,.6,.32);A(g,S(.02),K,-.08,.6,.37);A(g,S(.02),K,.08,.6,.37);
     A(g,TO(.11,.014,Math.PI),wh,0,.52,.345,1,1,1,0,0,Math.PI);
     [[0,.3,-.28],[0,.4,-.36],[0,.52,-.38]].forEach(p=>A(g,S(.05),pk,...p));legs(g,pu,[-.1,.1],[-.1,.12],.12,.045)};
   CB.mermaid=g=>{const sk=mt(0xffd9b0,.7),hr=mt(0x2a1a3a),tl=mt(0xff7ac8,.4),fn=mt(0xb48cf0,.4),sh=mt(0xfff0f5);
     A(g,S(.18),tl,0,.2,-.2,.8,.7,2);A(g,S(.12),fn,-.1,.2,-.63,1.6,.3,1);A(g,S(.12),fn,.1,.2,-.63,1.6,.3,1);
     A(g,Y(.1,.14,.3,16),sk,0,.4,.03);A(g,S(.06),sh,-.06,.47,.12);A(g,S(.06),sh,.06,.47,.12);
     A(g,S(.17),sk,0,.72,.03);A(g,S(.19),hr,0,.74,-.03,1,1,.95);A(g,Y(.13,.07,.4,12),hr,0,.5,-.1);eyes(g,.73,.185,.06,.022);arms(g,sk,.38,.16)};
   CB.turtle=g=>{const gr=mt(0x4fb86a),dg=mt(0x2f8a4a),ye=mt(0xf0e0a0);
     A(g,new THREE.SphereGeometry(.3,20,12,0,6.283,0,1.571),gr,0,.1,0,1,.75,1.2);A(g,S(.28),ye,0,.1,0,1,.25,1.2);
     [[0,.3,0],[-.12,.26,.12],[.12,.26,.12],[-.12,.26,-.12],[.12,.26,-.12]].forEach(p=>A(g,S(.09),dg,p[0],p[1],p[2],1,.4,1));
     A(g,S(.11),gr,0,.2,.38);eyes(g,.24,.46,.05,.02);
     [[-.26,.1],[.26,.1],[-.24,-.2],[.24,-.2]].forEach(p=>A(g,S(.09),gr,p[0],.05,p[1],1.3,.4,.8));A(g,C(.04,.12,6),gr,0,.07,-.4,1,1,1,-1.57)};
   CB.octo=g=>{const pu=mt(0xb36ad8),pk=mt(0xff9ac8);
     A(g,S(.26),pu,0,.6,0,1,1.1,1);A(g,S(.07),WB,-.1,.6,.235);A(g,S(.07),WB,.1,.6,.235);A(g,S(.03),K,-.1,.6,.295);A(g,S(.03),K,.1,.6,.295);
     A(g,S(.04),pk,-.17,.5,.2,1,.6,.5);A(g,S(.04),pk,.17,.5,.2,1,.6,.5);
     for(let k=0;k<8;k++){const a=k/8*6.283;A(g,Y(.05,.02,.32,8),pu,Math.sin(a)*.17,.18,Math.cos(a)*.17,1,1,1,-Math.cos(a)*.5,0,Math.sin(a)*.5)}};
   CB.tiger=g=>{const or=mt(0xf29a2e),dk=mt(0x2a1a10),wh=mt(0xfff4e6);
     A(g,S(.22),or,0,.3,0,.85,.8,1.35);[-.12,0,.12].forEach(z=>A(g,B(.34,.03,.05),dk,0,.47,z));
     A(g,S(.2),or,0,.55,.25);A(g,S(.1),wh,0,.5,.4,1,.7,.8);A(g,S(.03),K,0,.54,.47);
     A(g,S(.07),or,-.14,.72,.2);A(g,S(.07),or,.14,.72,.2);A(g,B(.1,.015,.015),dk,0,.68,.44);A(g,B(.06,.015,.015),dk,0,.65,.45);eyes(g,.6,.425,.08,.025);
     [[0,.05,-.28],[0,.15,-.36],[0,.28,-.38]].forEach((p,i)=>A(g,S(.06),i==2?dk:or,p[0],.3+p[1],p[2]));legs(g,or,[-.1,.1],[-.14,.14],.14,.05)};
   CB.dokk=g=>{const bl=mt(0x4a78d8),ye=mt(0xf5c542),bk=mt(0x20202a),rd=mt(0xd8333f),br=mt(0x8a5a30);
     A(g,Y(.18,.22,.36,18),bl,0,.4,0);A(g,Y(.23,.25,.2,18),ye,0,.14,0);A(g,Y(.232,.252,.03,18),bk,0,.14,0);A(g,S(.22),bl,0,.7,0);
     for(let k=0;k<7;k++){const a=k/7*6.283;A(g,C(.06,.16,6),bk,Math.sin(a)*.12,.9,Math.cos(a)*.12-.03,1,1,1,Math.cos(a)*.6,0,-Math.sin(a)*.6)}
     A(g,C(.04,.16,8),ye,-.07,1.0,.03);A(g,C(.04,.16,8),ye,.07,1.0,.03);
     A(g,S(.05),WB,-.08,.73,.19);A(g,S(.05),WB,.08,.73,.19);A(g,S(.025),K,-.08,.73,.235);A(g,S(.025),K,.08,.73,.235);
     A(g,TO(.09,.02,Math.PI),rd,0,.64,.205,1,1,1,0,0,Math.PI);
     A(g,S(.06),bl,-.24,.4,0,.8,1.4,.8);A(g,S(.06),bl,.24,.45,.06,.8,1.4,.8);A(g,Y(.03,.07,.45,10),br,.3,.55,.1,1,1,1,0,0,-.35)};
   CB.trex=g=>{const gr=mt(0x56b45a),lg=mt(0xa8e07a),dg=mt(0x3a8a48),or=mt(0xf2a04a),wh=mt(0xffffff,.4);
     A(g,S(.25),gr,0,.38,0,.9,.9,1.3);A(g,S(.2),lg,0,.32,.1,.8,.8,1.1);A(g,S(.18),gr,0,.62,.28,1,.9,1.3);A(g,S(.12),gr,0,.54,.45,1,.7,1.2);
     [-.05,.05].forEach(x=>A(g,C(.015,.05,4),wh,x,.46,.52,1,1,1,3.14));
     A(g,S(.04),YB,-.12,.7,.4);A(g,S(.04),YB,.12,.7,.4);A(g,S(.02),K,-.12,.7,.435);A(g,S(.02),K,.12,.7,.435);
     A(g,S(.04),gr,-.2,.34,.2,1,1.4,1);A(g,S(.04),gr,.2,.34,.2,1,1.4,1);
     A(g,C(.14,.55,10),gr,0,.32,-.4,1,1,1,-1.571);for(let i=0;i<4;i++)A(g,C(.035,.09,4),or,0,.66-i*.04,.12-i*.12);legs(g,dg,[-.13,.13],[0],.2,.08)};
   CB.trike=g=>{const bl=mt(0x6aa0d8),or=mt(0xf2a04a),wh=mt(0xfff4e6);
     A(g,S(.26),bl,0,.3,0,1,.85,1.4);A(g,S(.18),bl,0,.38,.38);A(g,S(.27),or,0,.55,.2,1,1,.2,-.3);
     [-.09,.09].forEach(x=>A(g,C(.035,.2,8),wh,x,.52,.52,1,1,1,1.371));A(g,C(.04,.14,8),wh,0,.38,.56,1,1,1,1.571);
     A(g,S(.03),WB,-.1,.46,.5);A(g,S(.03),WB,.1,.46,.5);A(g,S(.015),K,-.1,.46,.53);A(g,S(.015),K,.1,.46,.53);
     A(g,C(.1,.4,8),bl,0,.25,-.45,1,1,1,-1.571);legs(g,bl,[-.14,.14],[-.18,.18],.14,.07)};
   CB.stego=g=>{const gr=mt(0x6bc08a),or=mt(0xf08a3a),dg=mt(0x3f9a62),pl=new THREE.OctahedronGeometry(.12);
     A(g,S(.25),gr,0,.33,0,.85,.8,1.5);A(g,S(.1),gr,0,.28,.42,1,.8,1.3);eyes(g,.32,.5,.06,.02);
     [[.2,.5],[.1,.58],[0,.6],[-.1,.57],[-.2,.5]].forEach(([z,y],i)=>A(g,pl,or,0,y+.03,z,.3,i==2?1.4:1,.8));
     A(g,C(.1,.45,8),gr,0,.28,-.42,1,1,1,-1.571);A(g,C(.025,.12,4),or,0,.36,-.6,1,1,1,-.2);A(g,C(.025,.12,4),or,0,.3,-.66);legs(g,dg,[-.13,.13],[-.15,.2],.15,.06)};
   CB.snowman=g=>{const wh=mt(0xf4f8ff,.8),or=mt(0xff8a2a),bk=mt(0x202028),rd=mt(0xd8333f),br=mt(0x6a4a2a);
     A(g,S(.23),wh,0,.23,0);A(g,S(.17),wh,0,.56,0);A(g,S(.14),wh,0,.82,0);A(g,C(.03,.14,8),or,0,.8,.17,1,1,1,1.571);eyes(g,.86,.12,.05,.02);
     [.5,.58].forEach(y=>A(g,S(.02),K,0,y,.17));A(g,Y(.1,.1,.14,16),bk,0,.99,0);A(g,Y(.17,.17,.02,16),bk,0,.92,0);A(g,TO(.13,.04),rd,0,.7,0,1,1,1,1.571);
     A(g,Y(.012,.012,.3,6),br,-.26,.62,0,1,1,1,0,0,1.2);A(g,Y(.012,.012,.3,6),br,.26,.62,0,1,1,1,0,0,-1.2)};
   CB.penguin=g=>{const bk=mt(0x20242e),wh=mt(0xffffff,.8),or=mt(0xff9a2a);
     A(g,S(.22),bk,0,.36,0,.9,1.25,.85);A(g,S(.18),wh,0,.34,.1,.8,1.1,.5);A(g,S(.16),bk,0,.76,0);A(g,C(.035,.1,8),or,0,.74,.17,1,1,1,1.571);
     A(g,S(.035),WB,-.06,.78,.15);A(g,S(.035),WB,.06,.78,.15);A(g,S(.018),K,-.06,.78,.18);A(g,S(.018),K,.06,.78,.18);
     A(g,S(.06),bk,-.23,.4,0,.4,1.4,.8,0,0,.3);A(g,S(.06),bk,.23,.4,0,.4,1.4,.8,0,0,-.3);A(g,S(.07),or,-.08,.03,.06,1,.3,1.4);A(g,S(.07),or,.08,.03,.06,1,.3,1.4)};
   CB.bear=g=>{const wh=mt(0xf4f8ff,.85),tn=mt(0xdde6f4),bl=mt(0x4a8af0);
     A(g,S(.24),wh,0,.3,0,.9,.85,1.25);A(g,S(.18),wh,0,.52,.25);A(g,S(.08),tn,0,.47,.4,1,.7,.9);A(g,S(.03),K,0,.5,.47);
     A(g,S(.06),wh,-.13,.68,.22);A(g,S(.06),wh,.13,.68,.22);eyes(g,.57,.405,.07,.022);A(g,TO(.16,.04),bl,0,.4,.14,1,1,1,1.571);
     legs(g,wh,[-.11,.11],[-.14,.14],.14,.06);A(g,S(.06),wh,0,.28,-.3)};
   CB.sportscar=g=>{const rd=mt(0xe8283a,.3),dk=mt(0x1a1a22),wh=mt(0xffffff,.4),gl=mt(0x7ad8ff,.1);
     A(g,B(.44,.14,.9),rd,0,.2,0);A(g,B(.08,.15,.92),wh,0,.2,0);A(g,S(.17),gl,0,.31,-.04,1,.6,1.3);
     A(g,B(.4,.03,.1),dk,0,.4,-.42);A(g,B(.03,.1,.03),dk,-.14,.34,-.42);A(g,B(.03,.1,.03),dk,.14,.34,-.42);
     A(g,S(.045),YB,-.14,.22,.45);A(g,S(.045),YB,.14,.22,.45);
     [[-.25,.28],[.25,.28],[-.25,-.28],[.25,-.28]].forEach(([x,z])=>A(g,Y(.1,.1,.1,16),dk,x,.1,z,1,1,1,0,0,1.571))};
   CB.formula=g=>{const bl=mt(0x2a6aff,.3),dk=mt(0x1a1a22),ye=mt(0xffd34d),wh=mt(0xffffff,.4);
     A(g,B(.2,.1,.8),bl,0,.18,-.02);A(g,C(.07,.34,10),bl,0,.18,.5,1,1,1,1.571);A(g,B(.52,.02,.12),dk,0,.1,.68);
     A(g,B(.42,.03,.1),dk,0,.38,-.44);A(g,B(.03,.16,.03),dk,-.14,.3,-.44);A(g,B(.03,.16,.03),dk,.14,.3,-.44);
     A(g,S(.075),ye,0,.3,-.05);A(g,B(.1,.01,.5),wh,0,.235,0);
     [[-.24,.4],[.24,.4],[-.25,-.34],[.25,-.34]].forEach(([x,z])=>A(g,Y(.11,.11,.11,16),dk,x,.11,z,1,1,1,0,0,1.571))};
   CB.bike=g=>{const rd=mt(0xe8283a,.3),dk=mt(0x1a1a22),wh=mt(0xffffff,.4),bl=mt(0x2a3a5a),gl=mt(0x222a3a,.1);
     [-.3,.3].forEach(z=>A(g,Y(.14,.14,.06,18),dk,0,.14,z,1,1,1,0,0,1.571));
     A(g,S(.12),rd,0,.34,.06,.7,.6,1.5);A(g,B(.08,.04,.26),dk,0,.28,-.14);A(g,B(.3,.025,.03),dk,0,.46,.2);A(g,Y(.015,.015,.34,6),dk,0,.28,.28,1,1,1,.4,0,0);
     A(g,S(.12),bl,0,.52,-.1,1,1.2,.9,.3,0,0);A(g,S(.095),wh,0,.74,-.03);A(g,S(.06),gl,0,.74,.04,1,.8,.6);
     A(g,S(.04),bl,-.14,.5,.12,1,1,2);A(g,S(.04),bl,.14,.5,.12,1,1,2)};
   CB.soldier=g=>{const ol=mt(0x5a6a3a),dk=mt(0x3a4628),sk=mt(0xffd9b0,.7),bt=mt(0x3a2a1a);
     A(g,Y(.15,.2,.4,18),ol,0,.34,0);A(g,S(.16),sk,0,.68,0);A(g,S(.19),ol,0,.78,0,1,.7,1);A(g,Y(.21,.21,.025,18),dk,0,.72,0);
     eyes(g,.67,.15,.06,.022);arms(g,ol,.36,.21);A(g,B(.22,.26,.1),dk,0,.38,-.17);A(g,Y(.01,.01,.3,6),dk,.08,.62,-.17);
     A(g,B(.22,.04,.02),dk,0,.2,.19);legs(g,dk,[-.07,.07],[.02],.12,.05);A(g,S(.06),bt,-.07,.04,.04,1,.6,1.3);A(g,S(.06),bt,.07,.04,.04,1,.6,1.3)};
   CB.tank=g=>{const ol=mt(0x5a6a3a),dk=mt(0x2a3220),tr=mt(0x23261c);
     A(g,B(.46,.16,.8),ol,0,.2,0);[-.3,.3].forEach(x=>{A(g,Y(.1,.1,.88,14),tr,x,.12,0,1,1,1,1.571);A(g,B(.1,.2,.88),tr,x,.12,0)});
     A(g,Y(.16,.19,.14,18),ol,0,.36,-.04);A(g,Y(.028,.028,.52,10),dk,0,.38,.32,1,1,1,1.571);A(g,S(.05),dk,.06,.47,-.08);A(g,B(.3,.05,.2),ol,0,.3,.3,1,1,1,-.3)};
   CB.heli=g=>{const ol=mt(0x5a6a3a),dk=mt(0x2a3220),gl=mt(0x7ad8ff,.1);
     A(g,S(.2),ol,0,.36,0,.9,.8,1.3);A(g,S(.15),gl,0,.4,.2,.9,.7,1);A(g,Y(.04,.06,.5,10),ol,0,.4,-.4,1,1,1,1.571);A(g,B(.02,.18,.1),ol,0,.5,-.64);
     [-.14,.14].forEach(x=>{A(g,Y(.012,.012,.55,6),dk,x,.1,0,1,1,1,1.571);A(g,Y(.012,.012,.18,6),dk,x,.2,.1);A(g,Y(.012,.012,.18,6),dk,x,.2,-.1)});
     const rt=new THREE.Group();rt.position.set(0,.6,0);g.add(rt);A(rt,B(1,.012,.07),dk);A(rt,B(.07,.012,1),dk);A(g,Y(.02,.02,.1,8),dk,0,.56,0);
     const t2=new THREE.Group();t2.position.set(.04,.5,-.64);g.add(t2);A(t2,B(.012,.2,.03),dk);
     g.userData.idle=t=>{rt.rotation.y=t*20;t2.rotation.x=t*20}}}
  const setChar=id=>{
    if(!charGroups[id]&&CB[id]){const g=new THREE.Group();CB[id](g);outline(g);inner.add(g);charGroups[id]=g}
    for(const k in charGroups)charGroups[k].visible=k==id;
    const l=robot.children.find(o=>o.isPointLight);if(l)l.color.set(CHARS[id].lt)};

  const BOX=new THREE.BoxGeometry(1,1,1),EDGE=new THREE.EdgesGeometry(BOX),TAPER=new THREE.CylinderGeometry(.68,.22,1,4),
        GEM=new THREE.OctahedronGeometry(.22);
  const P=(x,z)=>new THREE.Vector3(x-cur.cx,0,z-cur.cz),Hh=(p)=>cur.H[p[1]][p[0]];
  const clear=g=>{while(g.children.length){const c=g.children[0];g.remove(c);c.traverse(o=>{if(o.material&&o.material.dispose&&!o.material.userData.keep)o.material.dispose()})}};
  const pop=(o,d)=>{o.scale.setScalar(.001);pops.push({o,t:-d})};
  const place=(g,x,z,off)=>{const p=P(x,z);g.position.set(p.x,Yt(cur.H[z][x])+off,p.z)};

  function mkSwitch(){const W=TH.swb||{g:[.3,.34,.08,0x2b2760],top:[.2,.1],ty:.1},g=new THREE.Group(),b=new THREE.Mesh(new THREE.CylinderGeometry(W.g[0],W.g[1],W.g[2],24),new THREE.MeshStandardMaterial({color:W.g[3],roughness:.5}));b.position.y=W.g[2]/2;b.receiveShadow=true;
    const bt=new THREE.Mesh(new THREE.CylinderGeometry(W.top[0],W.top[0],W.top[1],24),new THREE.MeshStandardMaterial({color:0xff5d7a,emissive:0x55101c,roughness:.3}));bt.position.y=W.ty;bt.castShadow=true;
    const gl=glow(0x38e0a6,1.7,0);gl.position.y=.2;g.add(b,bt,gl);g.userData={bt,gl};return g}
  function setSw(g,on){const{bt,gl}=g.userData;bt.material.color.set(on?TH.swOn:TH.swOff);bt.material.emissive.set(on?TH.swOn:TH.swOffE);bt.material.emissiveIntensity=on?.9:1;gl.material.color.set(TH.swOn);gl.material.opacity=on?.85:0}
  function mkGem(){const g=new THREE.Group(),m=new THREE.Mesh(GEM,new THREE.MeshStandardMaterial({color:0xffd34d,emissive:0xff9a1a,emissiveIntensity:.8,roughness:.15,metalness:.2,flatShading:true}));m.scale.set(1,1.5,1);m.castShadow=true;g.add(m,glow(0xffc04d,1.35,.7));return g}
  function mkRose(){const g=new THREE.Group(),M=(c,e=0)=>new THREE.MeshStandardMaterial({color:c,roughness:.5,emissive:c,emissiveIntensity:e});
    const st=new THREE.Mesh(new THREE.CylinderGeometry(.015,.02,.26,8),M(0x3f9a4f));st.position.y=.13;
    const lf=s=>{const l=new THREE.Mesh(new THREE.SphereGeometry(.06,10,8),M(0x4fb05f));l.scale.set(1.8,.3,.8);l.position.set(s*.07,.1,0);l.rotation.z=s*.5;return l};
    const bl=new THREE.Group();[[0,0,0,.075],[.05,-.01,.02,.06],[-.05,-.01,.02,.06],[0,-.01,-.05,.06],[0,.04,0,.05]].forEach(([x,y,z,r])=>{const p=new THREE.Mesh(new THREE.SphereGeometry(r,12,10),M(0xe0334c,.35));p.position.set(x,y,z);bl.add(p)});bl.position.y=.3;
    const dome=new THREE.Mesh(new THREE.SphereGeometry(.27,24,16,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0xcdeeff,transparent:true,opacity:.2,roughness:.05,side:THREE.DoubleSide,depthWrite:false}));
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.22,.24,.05,24),M(0x6b4a3a));base.position.y=-.02;
    g.add(st,lf(1),lf(-1),bl,base,dome,glow(0xff7a9a,1.3,.6));return g}
  const hm=(c,e=0,r=.4)=>new THREE.MeshStandardMaterial({color:c,roughness:r,emissive:c,emissiveIntensity:e}),M3=(g,m)=>new THREE.Mesh(g,m);
  const ITEMS={gem:mkGem,rose:mkRose,
    card:()=>{const g=new THREE.Group(),c=M3(new THREE.BoxGeometry(.3,.42,.03),hm(0xffffff,.25)),h=M3(new THREE.OctahedronGeometry(.07),hm(0xe0334c,.5));h.scale.set(1,1.2,.3);h.position.z=.02;c.add(h);c.rotation.z=.12;g.add(c,glow(0xff7aa8,1.3,.6));return g},
    pearl:()=>{const g=new THREE.Group(),sh=M3(new THREE.SphereGeometry(.2,20,10,0,6.283,1.571,1.571),hm(0xffb0c8,.15,.3)),pe=M3(new THREE.SphereGeometry(.1,20,16),new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xcfe8ff,emissiveIntensity:.5,roughness:.1,metalness:.4}));
      sh.material.side=THREE.DoubleSide;sh.scale.y=.6;sh.position.y=-.02;pe.position.y=.06;g.add(sh,pe,glow(0xcfe8ff,1.3,.6));return g},
    pouch:()=>{const g=new THREE.Group(),b=M3(new THREE.SphereGeometry(.16,18,14),hm(0xd8333f,.2)),t=M3(new THREE.ConeGeometry(.08,.1,12),hm(0xd8333f,.2)),r=M3(new THREE.TorusGeometry(.06,.016,8,16),hm(0xffd34d,.4)),k=M3(new THREE.SphereGeometry(.03,8,8),hm(0xffd34d,.4));
      b.scale.set(1,.9,.9);t.position.y=.17;r.rotation.x=1.571;r.position.y=.14;k.position.y=.24;g.add(b,t,r,k,glow(0xffd34d,1.3,.55));return g},
    egg:()=>{const g=new THREE.Group(),e=M3(new THREE.SphereGeometry(.17,20,16),hm(0xf6f0d8,.15,.5));e.scale.set(.85,1.2,.85);g.add(e);
      [[.08,.06,.12],[-.1,-.05,.1],[0,.12,.12],[.1,-.1,.08]].forEach(([x,y,z])=>{const s=M3(new THREE.SphereGeometry(.035,8,8),hm(0x6fbf4a,.1));s.position.set(x,y,z);s.scale.z=.4;g.add(s)});g.add(glow(0xf2ffd0,1.3,.55));return g},
    gift:()=>{const g=new THREE.Group(),r=hm(0xe03c4a,.1,.5),o=hm(0xffd34d,.2),w1=M3(new THREE.SphereGeometry(.07,10,8),o),w2=M3(new THREE.SphereGeometry(.07,10,8),o);
      w1.position.set(-.05,.18,0);w2.position.set(.05,.18,0);w1.scale.set(1,.6,.6);w2.scale.set(1,.6,.6);
      g.add(M3(new THREE.BoxGeometry(.3,.26,.3),r),M3(new THREE.BoxGeometry(.32,.27,.06),o),M3(new THREE.BoxGeometry(.06,.27,.32),o),w1,w2,glow(0xff8a8a,1.4,.5));return g},
    trophy:()=>{const g=new THREE.Group(),o=new THREE.MeshStandardMaterial({color:0xffd34d,emissive:0xffa000,emissiveIntensity:.5,roughness:.2,metalness:.8});
      const cup=M3(new THREE.CylinderGeometry(.14,.07,.16,18),o),st=M3(new THREE.CylinderGeometry(.025,.03,.1,10),o),bs=M3(new THREE.BoxGeometry(.18,.04,.18),o),h1=M3(new THREE.TorusGeometry(.06,.014,8,14),o),h2=M3(new THREE.TorusGeometry(.06,.014,8,14),o);
      cup.position.y=.12;st.position.y=-.01;bs.position.y=-.09;h1.position.set(-.15,.12,0);h2.position.set(.15,.12,0);g.add(cup,st,bs,h1,h2,glow(0xffd34d,1.3,.5));return g},
    crate:()=>{const g=new THREE.Group(),o=hm(0x6a7a3e,.05,.7),y=hm(0xd8c040,.1,.6);g.add(M3(new THREE.BoxGeometry(.3,.24,.3),o),M3(new THREE.BoxGeometry(.08,.245,.31),y),M3(new THREE.BoxGeometry(.31,.245,.08),y),glow(0xb8e06a,1.3,.45));g.rotation.y=.3;return g}};
  const rockGeo=()=>{const s=.1+Math.random()*.2,t=TH.rockT;return t=='card'?new THREE.BoxGeometry(s*1.4,s*2,.02):t=='bubble'?new THREE.SphereGeometry(s*1.1,12,10):t=='cloud'?new THREE.SphereGeometry(s*1.3,10,8).scale(1.7,.55,1):t=='flake'?new THREE.OctahedronGeometry(s):t=='cone'?new THREE.ConeGeometry(s*.8,s*2,8):new THREE.DodecahedronGeometry(s)};
  function mkPortal(col){const g=new THREE.Group(),m=new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:1.2,roughness:.3});
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.36,.05,14,52),m);ring.rotation.y=Math.PI/2;ring.position.y=.45;
    const disc=new THREE.Mesh(new THREE.CircleGeometry(.33,36),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.42,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false}));disc.rotation.y=Math.PI/2;disc.position.y=.45;
    const gl=glow(col,1.7,.7);gl.position.y=.45;g.add(ring,disc,gl);g.userData={disc,gl};return g}

  /* ── 칸, 보석, 스위치, 포털 ── */
  function mkTile(x,z,h){
    const g=new THREE.Group(),top=Yt(h);g.add(GR.tile(x,z,h));
    if(GR.floating()){const dp=.5+((x*7+z*13)%5)*.2,tp=new THREE.Mesh(TAPER,GR.under());tp.rotation.y=Math.PI/4;tp.scale.set(1,dp,1);tp.position.y=-.6-dp/2;g.add(tp)}   // 허공에 뜬 테마만 밑이 뾰족해요
    const f=cur.marks.get(x+','+z);                                  // 계단은 바라보는 쪽으로 작은 화살표
    if(f!==undefined){const m=new THREE.Mesh(new THREE.ConeGeometry(.12,.28,4),new THREE.MeshStandardMaterial({color:0xffffff,emissive:0x8899ff,emissiveIntensity:.5}));m.position.y=top+.04;m.rotation.set(Math.PI/2,0,-yawOf(f));g.add(m)}
    g.position.copy(P(x,z));return g}
  function setTile(x,z,h,delay=0){
    const k=x+','+z,old=cur.tiles.get(k);if(old){world.remove(old);cur.tiles.delete(k)}
    cur.H[z][x]=h;cur.dirty=true;if(!h)return;
    const g=mkTile(x,z,h);world.add(g);cur.tiles.set(k,g);pop(g,delay)}
  function addGem(x,z,delay=.5){const g=ITEMS[TH.item||'gem']();place(g,x,z,TH.io||.6);g.userData.by=g.position.y;dyn.add(g);cur.gems.set(x+','+z,g);pop(g,delay)}
  function addSwitch(x,z,delay=.5){const g=mkSwitch();place(g,x,z,0);setSw(g,false);dyn.add(g);cur.sws.set(x+','+z,g);pop(g,delay)}
  function setPortalOn(g,on){g.userData.off=!on;g.userData.disc.material.opacity=on?.42:.06;g.userData.gl.material.opacity=on?.7:.08;g.children[0].material.emissiveIntensity=on?1.2:.05}
  function addPortal(k,at,color,off,delay=.6){const g=mkPortal(PCOL[color]);place(g,at[0],at[1],0);g.userData.portal=1;g.userData.color=PCOL[color];dyn.add(g);cur.portals.set(k,g);setPortalOn(g,!off);pop(g,delay)}
  /* ── 캐릭터 (0번 주인공, 1번부터 도우미) ── */
  const HERO={rb:robot,inn:inner,get yaw(){return yaw},set yaw(v){yaw=v}};
  const A=i=>i?extra.get(i):HERO;
  function clearExtras(){extra.forEach(a=>scene.remove(a.rb));extra.clear()}
  function ensureGroup(id){if(!charGroups[id]&&CB[id]){const g=new THREE.Group();CB[id](g);outline(g);inner.add(g);charGroups[id]=g;g.visible=false}return charGroups[id]}
  function spawnActor(i,kind,at,d){
    const ids=TH.chars.filter(c=>c!=CH),id=ids[(kind=='expert'?0:1)%ids.length]||'byte',src=ensureGroup(id)||charGroups.byte;
    const rb=new THREE.Group(),inn=new THREE.Group(),m=src.clone(true);m.traverse(o=>{o.visible=true});inn.add(m);rb.add(inn);
    const ring=new THREE.Mesh(new THREE.RingGeometry(.3,.37,32),new THREE.MeshBasicMaterial({color:kind=='expert'?0xffd34d:0x7ad0ff,side:THREE.DoubleSide,transparent:true,opacity:.95}));ring.rotation.x=-Math.PI/2;ring.position.y=.03;rb.add(ring);
    const p=P(at[0],at[1]);rb.position.set(p.x,Yt(cur.H[at[1]][at[0]]),p.z);const a={rb,inn,yaw:yawOf(d)};rb.rotation.y=a.yaw;
    scene.add(rb);extra.set(i,a);pop(rb,0);return a}
  function buildDyn(){
    const lv=cur.lv;clear(dyn);cur.gems.clear();cur.sws.clear();cur.portals.clear();clearExtras();
    lv.gems.forEach(([x,z],i)=>addGem(x,z,.55+i*.08));
    lv.sws.forEach((k,i)=>{const[x,z]=k.split(',').map(Number);addSwitch(x,z,.5+i*.06)});
    Object.keys(lv.portals).sort().forEach(k=>addPortal(k,lv.portals[k],PAIR[(k.charCodeAt(0)-97)>>1],(lv.portals_off||[]).includes(k)));
    const dc=(k,col,x,z,sz,dl)=>{const m=GR.decal(k,col,sz);place(m,x,z,.013);dyn.add(m);pop(m,dl);return m};
    lv.gems.forEach(([x,z])=>dc('spot',0xffd34d,x,z,.9,.5));lv.sws.forEach(k=>{const[x,z]=k.split(',').map(Number);dc('pad',TH.swOn,x,z,.95,.5)});
    Object.keys(lv.portals).forEach(k=>{const c=PCOL[PAIR[(k.charCodeAt(0)-97)>>1]];dc('ring',c,lv.portals[k][0],lv.portals[k][1],1.1,.6)});
    {const s=lv.start;dc('start',0xffffff,s[0],s[1],.8,.3).rotation.y=yawOf(s[2])+Math.PI}
    const s=lv.start,p=P(s[0],s[1]);robot.position.set(p.x,Yt(cur.H[s[1]][s[0]]),p.z);yaw=yawOf(s[2]);robot.rotation.y=yaw;robot.scale.setScalar(1);inner.position.y=0;inner.rotation.set(0,0,0);
  }
  function build(lv){
    cur.lv=lv;cur.H=lv.H.map(r=>[...r]);cur.dirty=false;cur.marks.clear();cur.tiles.clear();
    const gw=lv.H[0].length,gd=lv.H.length;cur.cx=(gw-1)/2;cur.cz=(gd-1)/2;clear(world);clear(rocks);
    lv.H.forEach((row,z)=>row.forEach((h,x)=>{if(!h)return;const g=mkTile(x,z,h);world.add(g);cur.tiles.set(x+','+z,g);pop(g,(x+z)*.05)}));
    camR=Math.hypot(gw,gd)/2+1.1;
    for(let i=0;i<8;i++){const r=new THREE.Mesh(rockGeo(),new THREE.MeshStandardMaterial({color:TH.rock,emissive:TH.rockE,roughness:.6,flatShading:true,transparent:!!TH.rockA,opacity:TH.rockA||1}));
      r.userData={a:Math.random()*6.28,r:camR+.6+Math.random()*1.6,y:Math.max(-1.6,TH.out.y+.5)+Math.random()*2.4,s:.2+Math.random()*.3};rocks.add(r)}
    GR.fill(lv,cur.cx,cur.cz,camR);buildDyn();fit();
  }
  function fit(){const vf=cam.fov*Math.PI/180,hf=2*Math.atan(Math.tan(vf/2)*cam.aspect);distT=camR/Math.tan(Math.min(vf,hf)/2)*1.02}
  function size(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;R.setSize(w,h,false);cam.aspect=w/h;viewH=h;cam.setViewOffset(w,h,0,-h*.04,w,h);cam.updateProjectionMatrix();if(cur.lv)fit()}
  new ResizeObserver(size).observe(stage);size();

  cv.addEventListener('pointerdown',e=>{drag3={x:e.clientX,id:e.pointerId};cv.setPointerCapture(e.pointerId);$('#spin').style.opacity=0});
  cv.addEventListener('pointermove',e=>{if(drag3&&drag3.id==e.pointerId){userYaw-=(e.clientX-drag3.x)*.008;drag3.x=e.clientX}});
  const up=()=>{drag3=null};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);

  /* 동작 연출 (i 는 캐릭터 번호, 0이 주인공) */
  fx={
    async move(a,b,i=0){const q=A(i),pa=P(a[0],a[1]),pb=P(b[0],b[1]),ha=Yt(Hh(a)),hb=Yt(Hh(b));
      await tween(.4,k=>{const e=eio(k);q.rb.position.lerpVectors(pa,pb,e);q.rb.position.y=ha+(hb-ha)*e+Math.sin(k*Math.PI)*.15;q.inn.scale.set(1,1+Math.sin(k*Math.PI)*.07,1)});
      q.inn.scale.set(1,1,1);burst(new THREE.Vector3(pb.x,hb+.05,pb.z),0xffffff,5,.8,.45)},
    async turn(s,i=0){const q=A(i),y0=q.yaw;q.yaw+=s*Math.PI/2;await tween(.3,k=>{q.rb.rotation.y=y0+(q.yaw-y0)*eio(k)})},
    async bump(d,i=0){const q=A(i),f=DIRS[d],b=q.rb.position.clone();
      await tween(.34,k=>{const s=Math.sin(k*Math.PI);q.rb.position.x=b.x+f[0]*s*.18;q.rb.position.z=b.z+f[1]*s*.18;q.inn.rotation.z=Math.sin(k*Math.PI*4)*.16*(1-k)});
      q.inn.rotation.z=0;burst(b.clone().setY(b.y+.5),0xff5d7a,16,1.6,.6)},
    async collect(p,i=0){const q=A(i),g=cur.gems.get(p[0]+','+p[1]);if(!g)return;burst(g.position,TH.ic,32,2.8,.9);burst(g.position,0xffffff,10,1.6,.6);
      await tween(.4,k=>{g.scale.setScalar(k<.3?1+k*1.6:Math.max(.001,(1-k)/.7*1.5));g.position.y+=.05;q.inn.position.y=Math.sin(k*Math.PI)*.12});
      q.inn.position.y=0;dyn.remove(g);cur.gems.delete(p[0]+','+p[1])},
    async toggle(p,on){const g=cur.sws.get(p[0]+','+p[1]);if(!g)return;const bt=g.userData.bt,y0=bt.position.y;
      await tween(.18,k=>{bt.position.y=y0-.05*k});setSw(g,on);burst(g.position.clone().setY(g.position.y+.3),on?TH.swOn:TH.swOff,22,2,.8);
      await tween(.18,k=>{bt.position.y=y0-.05+.05*k})},
    async tele(a,b,i=0){const q=A(i);burst(q.rb.position.clone().setY(q.rb.position.y+.4),0xc88bff,22,2.2,.7);
      await tween(.3,k=>q.rb.scale.setScalar(Math.max(.001,1-k)));
      const pb=P(b[0],b[1]);q.rb.position.set(pb.x,Yt(Hh(b)),pb.z);burst(q.rb.position.clone().setY(q.rb.position.y+.4),0x39c8ff,22,2.2,.7);
      await tween(.3,k=>q.rb.scale.setScalar(Math.max(.001,k)));q.rb.scale.setScalar(1)},
    async spawn(r){const a=spawnActor(r.a,r.kind,r.at,r.d);burst(a.rb.position.clone().setY(a.rb.position.y+.5),r.kind=='expert'?0xffd34d:0x7ad0ff,26,2.4,.8);await wait(450/spd)},
    async portal(k,on){const g=cur.portals.get(k);if(!g)return;burst(g.position.clone().setY(g.position.y+.4),on?0x7dffb0:0xff5d7a,20,1.8,.7);setPortalOn(g,on);await wait(300/spd)},
    async lock(plats){plats.forEach(p=>{setTile(p.at[0],p.at[1],p.h);const q=P(p.at[0],p.at[1]);burst(new THREE.Vector3(q.x,Yt(p.h),q.z),0xffd34d,18,1.6,.7)});await wait(500/spd)},
    async place(r){const[x,z]=r.at;
      if(r.kind=='block'||r.kind=='stair'){if(r.kind=='stair'&&r.facing!=null)cur.marks.set(x+','+z,r.facing);setTile(x,z,r.h)}
      else if(r.kind=='gem')addGem(x,z,0);else if(r.kind=='switch')addSwitch(x,z,0);
      else if(r.kind=='portal')addPortal(r.k,r.at,r.color,false,0);
      const q=P(x,z);burst(new THREE.Vector3(q.x,Yt(r.h)+.2,q.z),0xffffff,14,1.4,.6);await wait(260/spd)},
    async win(){const cs=[0xff5fa8,0x39c8ff,0xffd34d,0x7df9ff,0xc88bff];let i=0;
      await tween(1.5,k=>{inner.position.y=Math.abs(Math.sin(k*Math.PI*3))*.4;inner.rotation.y=k*Math.PI*4;
        if(k>i/7&&i<7){const p=robot.position;burst(new THREE.Vector3(p.x+(Math.random()-.5)*2,p.y+1.2,p.z+(Math.random()-.5)*2),cs[i%5],40,4,1.4);i++}});
      inner.position.y=0;inner.rotation.y=0}
  };
  // 다시 시작: 땅 높이가 바뀌었거나 다른 맵이면 처음부터 다시 짓고, 아니면 물건만 다시 놓는다
  fx.reset=lv=>{if(cur.dirty||(lv&&lv!==cur.lv))build(lv||cur.lv);else buildDyn()};
  fx.build=build;fx.char=setChar;fx.weather=setWeather;
  // 테마를 바꿔 다시 만들었을 때, 지금 진행 상태(칸 높이, 놓은 물건, 주운 보석, 켠 스위치, 캐릭터 위치)를 되살린다
  fx.restore=v=>{
    v.H.forEach((row,z)=>row.forEach((h,x)=>{if(cur.H[z][x]!=h)setTile(x,z,h)}));
    v.placed.forEach(r=>{const[x,z]=r.at;if(r.kind=='stair'&&r.facing!=null){cur.marks.set(x+','+z,r.facing);setTile(x,z,r.h)}
      else if(r.kind=='gem'&&!cur.gems.has(x+','+z)&&v.gems.has(x+','+z))addGem(x,z,0);
      else if(r.kind=='switch'&&!cur.sws.has(x+','+z))addSwitch(x,z,0);
      else if(r.kind=='portal'&&!cur.portals.has(r.k))addPortal(r.k,r.at,r.color,false,0)});
    cur.gems.forEach((g,k)=>{if(!v.gems.has(k)){dyn.remove(g);cur.gems.delete(k)}});cur.sws.forEach((g,k)=>setSw(g,v.on.has(k)));
    cur.portals.forEach((g,k)=>setPortalOn(g,!v.portalOff.has(k)));
    v.actors.forEach((a,i)=>{const q=i?extra.get(i)||spawnActor(i,a.kind,[a.x,a.z],a.d):HERO,p=P(a.x,a.z);q.rb.position.set(p.x,Yt(Hh([a.x,a.z])),p.z);q.yaw=yawOf(a.d);q.rb.rotation.y=q.yaw})};
  fx.theme=()=>{L.hemi.color.set(TH.hemi[0]);L.hemi.groundColor.set(TH.hemi[1]);L.sun.color.set(TH.sun);L.r1.color.set(TH.rim[0]);L.r2.color.set(TH.rim[1]);
    const s=scene.getObjectByName('stars');s.material.color.set(TH.star);s.material.size=TH.starSize;s.visible=!!TH.stars;moon.visible=false};

  /* 렌더 루프 */
  let last=performance.now(),px=0;
  const loop=now=>{requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;T+=dt;
    for(let i=tw.length-1;!paused&&i>=0;i--){const q=tw[i];q.t+=dt*spd;const k=Math.min(1,q.t/q.d);q.f(k);if(k>=1){tw.splice(i,1);q.r()}}
    for(let i=pops.length-1;i>=0;i--){const q=pops[i];q.t+=dt;const k=Math.max(0,Math.min(1,q.t/.5));if(q.t>=0)q.o.scale.setScalar(Math.max(.001,backo(k)));if(k>=1&&q.t>=0)pops.splice(i,1)}
    dyn.children.forEach((g,i)=>{if(g.userData.by!==undefined){g.position.y=g.userData.by+Math.sin(T*2+i)*.06;g.rotation.y+=dt*1.6}
      if(g.userData.portal&&!g.userData.off){const s=1+Math.sin(T*4)*.08;g.userData.disc.scale.set(s,s,s);g.userData.disc.rotation.z+=dt*2;g.userData.gl.material.opacity=.55+Math.sin(T*5)*.15;if(Math.random()<dt*6)burst(g.position.clone().setY(g.position.y+.3),g.userData.disc.material.color,1,.6,.8)}});
    GR.anim(T);
    rocks.children.forEach(r=>{const u=r.userData;u.a+=dt*u.s*.4;r.position.set(Math.cos(u.a)*u.r,u.y+Math.sin(T+u.a*3)*.15,Math.sin(u.a)*u.r);r.rotation.x+=dt*.4;r.rotation.y+=dt*.3});
    const sc=scene.getObjectByName('stars');sc.rotation.y+=dt*.004;if(moon.visible)moon.lookAt(cam.position);
    // 로봇 idle
    inner.userData.tip.position.y=1.06+Math.sin(T*5)*.02;const gi=charGroups[CH];if(gi&&gi.userData.idle)gi.userData.idle(T);if(!tw.length)inner.position.y=Math.sin(T*3)*.012;extra.forEach(a=>{a.inn.position.y=Math.sin(T*3+a.rb.id)*.012});
    for(let k=0;k<NP;k++){if(pl[k]>0){pl[k]-=dt;if(pl[k]<=0){pp[k*3+1]=-999;pc[k*3]=pc[k*3+1]=pc[k*3+2]=0}else{pv[k*3+1]-=5*dt;pp[k*3]+=pv[k*3]*dt;pp[k*3+1]+=pv[k*3+1]*dt;pp[k*3+2]+=pv[k*3+2]*dt;const f=pl[k]/pm[k];pc[k*3]=pk[k*3]*f;pc[k*3+1]=pk[k*3+1]*f;pc[k*3+2]=pk[k*3+2]*f}}}
    pg.attributes.position.needsUpdate=true;pg.attributes.color.needsUpdate=true;
    if(wkind){const ws=WSET[wkind];
      for(let i=0;i<WN;i++){const ph=wph[i*2],v=wph[i*2+1];
        if(wkind=='fire'){wp[i*3]+=Math.cos(T*.5+ph)*.25*dt;wp[i*3+1]+=Math.sin(T*.7+ph)*.2*dt;wp[i*3+2]+=Math.sin(T*.4+ph*2)*.25*dt}
        else{wp[i*3+1]-=v*dt;wp[i*3]+=Math.sin(T*1.3+ph)*ws.d*dt;wp[i*3+2]+=Math.cos(T*1.1+ph)*ws.d*dt*.6;
          if(wp[i*3+1]<-3){wp[i*3+1]=9;wp[i*3]=(Math.random()-.5)*14;wp[i*3+2]=(Math.random()-.5)*14}}}
      if(wkind=='fire')wm.size=ws.s*(.8+.3*Math.sin(T*3));
      wg.attributes.position.needsUpdate=true}
    distC+=(distT-distC)*Math.min(1,dt*3);
    const a=Math.PI/4+userYaw,pt=.78,ty=.5;
    cam.position.set(Math.sin(a)*Math.cos(pt)*distC,ty+Math.sin(pt)*distC,Math.cos(a)*Math.cos(pt)*distC);cam.lookAt(0,ty,0);
    R.render(scene,cam)};
  requestAnimationFrame(loop);
}
