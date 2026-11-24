'use strict';
/* 칸 무늬, 바깥 땅, 소품, 바닥 표시 (scene.js 가 GR 로 불러 써요). 그림은 전부 캔버스로 그려서 테마별로 한 번만 만들어 두고 다시 써요 */
const GR=window.THREE?(()=>{
  const S=256,TEX=new Map(),MAT=new Map(),GEO=new Map();let key='';
  const rnd=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const hx=h=>[(h>>16)&255,(h>>8)&255,h&255],css=(h,k=1,a=1)=>{const[r,g,b]=hx(h);return`rgba(${Math.min(255,r*k)|0},${Math.min(255,g*k)|0},${Math.min(255,b*k)|0},${a})`};
  const mixc=(a,b,t)=>{const A=hx(a),B=hx(b);return(A[0]+(B[0]-A[0])*t&255)<<16|(A[1]+(B[1]-A[1])*t&255)<<8|(A[2]+(B[2]-A[2])*t&255)};
  const mkc=(w,h,f)=>{const c=document.createElement('canvas');c.width=w;c.height=h;f(c.getContext('2d'),w,h);return c};
  const mkt=(c,rep)=>{const t=new THREE.CanvasTexture(c);t.anisotropy=4;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping}return t};
  const memo=(m,k,f)=>{let v=m.get(k);if(!v){v=f();m.set(k,v)}return v};
  const keep=m=>{m.userData.keep=1;return m};
  const arr=x=>Array.isArray(x)?x:[x];
  const GRND=h=>{const g=TH.ground||'paver';return Array.isArray(g)?g[h]||g[1]:g};
  const SIDE={paver:'brick',hanok:'brick',turf:'soil',earth:'soil',sand:'soil',planks:'planks',snow:'snow',asphalt:'concrete'},ROT={paver:1,turf:1,sand:1,earth:1,snow:1};
  const wrap=(g,f)=>{for(const dx of[-S,0,S])for(const dy of[-S,0,S]){g.save();g.translate(dx,dy);f();g.restore()}};
  const line=(g,pts)=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke()};
  const crack=(g,r,col,w=2)=>{let x=r()*S,y=r()*S;const p=[[x,y]];for(let i=0;i<6;i++){x+=(r()-.5)*70;y+=(r()-.5)*70;p.push([x,y])}g.strokeStyle=col;g.lineWidth=w;line(g,p)};
  const star=(g,x,y,s,a)=>{g.fillStyle=`rgba(255,255,255,${a})`;g.beginPath();g.moveTo(x,y-s);g.lineTo(x+s*.25,y-s*.25);g.lineTo(x+s,y);g.lineTo(x+s*.25,y+s*.25);g.lineTo(x,y+s);g.lineTo(x-s*.25,y+s*.25);g.lineTo(x-s,y);g.lineTo(x-s*.25,y-s*.25);g.fill()};

  /* ── 칸 윗면 ── */
  const TOPS={
    paver(g,c,r){const sx=S*(.4+r()*.2),sy=S*(.4+r()*.2);
      [[0,0,sx,sy],[sx,0,S-sx,sy],[0,sy,sx,S-sy],[sx,sy,S-sx,S-sy]].forEach(([x,y,w,h])=>{g.fillStyle=`rgba(${r()<.5?'255,255,255':'0,0,0'},${.03+r()*.05})`;g.fillRect(x,y,w,h)});
      g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=4;line(g,[[sx,0],[sx,S]]);line(g,[[0,sy],[S,sy]]);
      for(let i=0;i<70;i++){g.fillStyle=`rgba(0,0,0,${.05+r()*.06})`;g.fillRect(r()*S,r()*S,2+r()*3,2+r()*3)}
      crack(g,r,'rgba(0,0,0,.28)');crack(g,r,'rgba(0,0,0,.22)',1.5);
      if(TH.moss)for(let i=0;i<5;i++){g.fillStyle=`rgba(${70+r()*30|0},${120+r()*30|0},50,.3)`;g.beginPath();g.ellipse(r()<.5?r()*40:S-r()*40,r()<.5?r()*40:S-r()*40,16+r()*22,10+r()*14,r()*3,0,6.3);g.fill()}
      if(TH.gacc){g.strokeStyle=css(arr(TH.gacc)[0],1,.3);g.lineWidth=2;g.strokeRect(18,18,S-36,S-36);g.fillStyle=css(arr(TH.gacc)[0],1,.4);[[18,18],[S-18,18],[18,S-18],[S-18,S-18]].forEach(([x,y])=>{g.beginPath();g.arc(x,y,4,0,6.3);g.fill()})}},
    turf(g,c,r){for(let i=0;i<420;i++){g.strokeStyle=css(c,.82+r()*.4,.55);g.lineWidth=1.5;const x=r()*S,y=r()*S;line(g,[[x,y],[x+(r()-.5)*5,y-5-r()*6]])}
      const fl=arr(TH.gacc||0xffffff);for(let i=0;i<6;i++){const x=20+r()*(S-40),y=20+r()*(S-40),col=fl[i%fl.length];g.fillStyle=css(col,1,.9);for(let k=0;k<5;k++){g.beginPath();g.arc(x+Math.cos(k*1.256)*5,y+Math.sin(k*1.256)*5,3.3,0,6.3);g.fill()}g.fillStyle='rgba(255,200,60,.95)';g.beginPath();g.arc(x,y,2.6,0,6.3);g.fill()}},
    sand(g,c,r){for(let y=10;y<S;y+=20){g.strokeStyle=`rgba(${y%40?'255,255,255':'0,0,0'},.1)`;g.lineWidth=3;g.beginPath();for(let x=0;x<=S;x+=8)g.lineTo(x,y+Math.sin(x/22+y)*4);g.stroke()}
      for(let i=0;i<120;i++){g.fillStyle=`rgba(${r()<.5?'255,255,255':'60,40,0'},.12)`;g.fillRect(r()*S,r()*S,2,2)}
      const x=30+r()*(S-60),y=30+r()*(S-60);g.strokeStyle='rgba(255,245,235,.55)';g.lineWidth=2;for(let k=-2;k<=2;k++)line(g,[[x,y],[x+k*5,y-12]]);},
    planks(g,c,r){const n=4,h=S/n;for(let i=0;i<n;i++){g.fillStyle=`rgba(${r()<.5?'255,255,255':'0,0,0'},${.03+r()*.06})`;g.fillRect(0,i*h,S,h);
        for(let k=0;k<3;k++){g.strokeStyle='rgba(0,0,0,.09)';g.lineWidth=1.5;g.beginPath();const y=i*h+8+r()*(h-16);for(let x=0;x<=S;x+=16)g.lineTo(x,y+Math.sin(x/30+k)*2);g.stroke()}
        g.fillStyle='rgba(0,0,0,.28)';[14,S-14].forEach(x=>{g.beginPath();g.arc(x,i*h+h/2,3,0,6.3);g.fill()})}
      g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=4;for(let i=1;i<n;i++)line(g,[[0,i*h],[S,i*h]])},
    earth(g,c,r){for(let i=0;i<50;i++){g.fillStyle=`rgba(${r()<.5?'255,235,200':'0,0,0'},${.08+r()*.1})`;g.beginPath();g.ellipse(r()*S,r()*S,2+r()*6,2+r()*4,r()*3,0,6.3);g.fill()}
      g.strokeStyle='rgba(70,40,20,.45)';g.lineWidth=3;let x=0,y=30+r()*60;const p=[[x,y]];for(let i=0;i<6;i++){x+=45;y+=(r()-.3)*30;p.push([x,y])}line(g,p);line(g,[p[2],[p[2][0]+20,p[2][1]+40]]);
      const fx=S-70,fy=S-30;g.strokeStyle='rgba(60,150,60,.7)';g.lineWidth=2;line(g,[[fx,fy],[fx+20,fy-60]]);for(let k=1;k<6;k++){const t=k/6,px=fx+20*t,py=fy-60*t;line(g,[[px,py],[px-12*(1-t),py-5]]);line(g,[[px,py],[px+12*(1-t),py-5]])}},
    snow(g,c,r,h){for(let i=0;i<7;i++){g.fillStyle=i%2?'rgba(255,255,255,.2)':'rgba(120,150,200,.1)';g.beginPath();g.ellipse(r()*S,r()*S,30+r()*40,14+r()*20,r()*3,0,6.3);g.fill()}
      for(let i=0;i<9;i++)star(g,r()*S,r()*S,3+r()*3,.55+r()*.4);if(h>1){crack(g,r,'rgba(110,170,230,.55)',2);crack(g,r,'rgba(110,170,230,.4)',1.5)}},
    asphalt(g,c,r,h,v){for(let i=0;i<1400;i++){g.fillStyle=`rgba(${r()<.5?'255,255,255':'0,0,0'},${.05+r()*.05})`;g.fillRect(r()*S,r()*S,2,2)}
      if(h==3){g.save();g.beginPath();g.rect(0,0,S,S);g.clip();g.strokeStyle='rgba(0,0,0,.17)';g.lineWidth=18;for(let i=-S;i<S*2;i+=52)line(g,[[i,0],[i+S,S]]);g.restore()}
      else if(!v){g.fillStyle='rgba(255,255,255,.55)';g.fillRect(14,S/2-6,80,12);g.fillRect(S-94,S/2-6,80,12)}
      else{crack(g,r,'rgba(0,0,0,.3)',2)}},
    hanok(g,c,r){const n=3,w=S/n;for(let i=0;i<n;i++)for(let j=0;j<n;j++){g.fillStyle=`rgba(${r()<.5?'255,255,255':'0,0,0'},${.02+r()*.06})`;g.fillRect(i*w,j*w,w,w)}
      g.strokeStyle='rgba(0,0,0,.27)';g.lineWidth=3;for(let i=1;i<n;i++){line(g,[[i*w,0],[i*w,S]]);line(g,[[0,i*w],[S,i*w]])}
      for(let i=0;i<260;i++){g.fillStyle=`rgba(${r()<.5?'255,255,255':'0,0,0'},.08)`;g.fillRect(r()*S,r()*S,2,2)}
      g.strokeStyle='rgba(255,240,200,.28)';g.lineWidth=3;const m=S*.3;g.strokeRect(m,m,S-2*m,S-2*m);g.beginPath();g.arc(S/2,S/2,S*.13,0,6.3);g.stroke()}
  };
  const bevel=g=>{g.lineWidth=6;g.strokeStyle='rgba(255,255,255,.2)';line(g,[[3,S-3],[3,3],[S-3,3]]);g.strokeStyle='rgba(0,0,0,.3)';line(g,[[S-3,3],[S-3,S-3],[3,S-3]])};
  const topTex=(h,v)=>memo(TEX,'t'+h+v,()=>{const st=GRND(h),c=TH.tops[h],r=rnd(h*131+v*17+7);
    const cv=mkc(S,S,g=>{g.fillStyle=css(c);g.fillRect(0,0,S,S);TOPS[st](g,c,r,h,v);bevel(g)});return mkt(cv)});
  /* ── 칸 옆면 ── */
  const sideTex=h=>memo(TEX,'s'+h,()=>{const st=GRND(h),kind=SIDE[st],c=TH.tops[h],r=rnd(h*71+3),Z=128;
    const cv=mkc(Z,Z,g=>{
      if(kind=='brick'){g.fillStyle=css(c,.5);g.fillRect(0,0,Z,Z);for(let j=0;j<3;j++){const y=j*43,off=j%2?32:0;for(let x=-64+off;x<Z;x+=64){g.fillStyle=`rgba(${r()<.5?'255,255,255':'0,0,0'},${.04+r()*.07})`;g.fillRect(x,y,64,43)}}
        g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=2.5;for(let j=0;j<3;j++){const y=j*43,off=j%2?32:0;line(g,[[0,y],[Z,y]]);for(let x=off;x<=Z;x+=64)line(g,[[x,y],[x,y+43]])}}
      else if(kind=='soil'){const base=st=='turf'?mixc(c,0x6b4a32,.75):st=='earth'?mixc(c,0x3a2a1a,.5):mixc(c,0xc9a870,.3);g.fillStyle=css(base,.58);g.fillRect(0,0,Z,Z);
        for(let j=0;j<4;j++){g.fillStyle=`rgba(${j%2?'255,255,255':'0,0,0'},.07)`;g.fillRect(0,18+j*28,Z,16)}
        for(let i=0;i<24;i++){g.fillStyle=`rgba(${r()<.5?'255,255,255':'0,0,0'},.15)`;g.beginPath();g.ellipse(r()*Z,20+r()*100,2+r()*3,1.5+r()*2,0,0,6.3);g.fill()}
        if(st=='turf'){g.fillStyle='#4f9a3c';g.fillRect(0,0,Z,12);for(let x=0;x<Z;x+=9){g.beginPath();g.arc(x+4,12,4+r()*6,0,3.15);g.fill()}g.fillStyle='rgba(255,255,255,.14)';g.fillRect(0,0,Z,3)}}
      else if(kind=='snow'){g.fillStyle=css(mixc(c,0x6a8fb8,.5),.8);g.fillRect(0,0,Z,Z);for(let i=0;i<6;i++){g.fillStyle=`rgba(255,255,255,${.06+r()*.08})`;g.fillRect(0,20+r()*100,Z,3+r()*6)}
        g.fillStyle='#f4f9ff';g.fillRect(0,0,Z,14);for(let x=0;x<Z;x+=10){g.beginPath();g.arc(x+5,14,4+r()*7,0,3.15);g.fill()}}
      else if(kind=='planks'){g.fillStyle=css(c,.45);g.fillRect(0,0,Z,Z);for(let i=0;i<5;i++){g.fillStyle=`rgba(${r()<.5?'255,255,255':'0,0,0'},.07)`;g.fillRect(i*26,0,26,Z)}g.strokeStyle='rgba(0,0,0,.45)';g.lineWidth=3;for(let i=0;i<=5;i++)line(g,[[i*26,0],[i*26,Z]]);g.fillStyle='rgba(255,255,255,.15)';g.fillRect(0,0,Z,12);g.fillStyle='rgba(0,0,0,.3)';g.fillRect(0,12,Z,3)}
      else{g.fillStyle=css(c,.42);g.fillRect(0,0,Z,Z);g.fillStyle='rgba(255,255,255,.5)';g.fillRect(0,6,Z,6);g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=2;line(g,[[0,70],[Z,70]]);for(let i=0;i<60;i++){g.fillStyle='rgba(0,0,0,.08)';g.fillRect(r()*Z,r()*Z,2,2)}}
      g.fillStyle='rgba(255,255,255,.16)';g.fillRect(0,0,Z,4);const gr=g.createLinearGradient(0,Z-34,0,Z);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.38)');g.fillStyle=gr;g.fillRect(0,Z-34,Z,34)});
    const t=mkt(cv,1),hg=h*.5+.6;t.repeat.y=hg;t.offset.y=-(hg%1);return t});

  const tileGeo=h=>memo(GEO,'b'+h,()=>{const hg=h*.5+.6,g=new THREE.BoxGeometry(.98,hg,.98),I=g.index.array,o=[];
    [0,1,4,5,2].forEach(f=>o.push(...I.slice(f*6,f*6+6)));g.setIndex(o);g.clearGroups();g.addGroup(0,24,0);g.addGroup(24,6,1);return g});   // 옆 4면 + 윗면 (밑면은 안 그림)
  const tMat=(h,v)=>memo(MAT,'m'+h+v,()=>{const[r,g,b]=hx(TH.tops[h]),ck=(v?(TH.ck||.9):1)*((r+g+b)/765>.7?.68:.82);return[keep(new THREE.MeshStandardMaterial({map:sideTex(h),color:new THREE.Color(ck,ck,ck),roughness:.8})),keep(new THREE.MeshStandardMaterial({map:topTex(h,v),color:new THREE.Color(ck,ck,ck),roughness:.55}))]});
  const under=()=>memo(MAT,'under',()=>keep(new THREE.MeshStandardMaterial({color:TH.under,roughness:.85,flatShading:true})));

  /* ── 바깥 땅 ── */
  const TERR={
    water(g,o,r){g.fillStyle=css(o.c[0]);g.fillRect(0,0,S,S);wrap(g,()=>{for(let i=0;i<12;i++){g.fillStyle=css(o.c[1],1,.12);g.beginPath();g.ellipse(r()*S,r()*S,30+r()*40,14+r()*18,r()*3,0,6.3);g.fill()}
      g.strokeStyle='rgba(255,255,255,.22)';g.lineWidth=2;for(let i=0;i<22;i++){const x=r()*S,y=r()*S;g.beginPath();g.arc(x,y,10+r()*14,3.6,5.8);g.stroke()}})},
    lava(g,o,r){g.fillStyle=css(o.c[0]);g.fillRect(0,0,S,S);wrap(g,()=>{for(let i=0;i<30;i++){const x=r()*S,y=r()*S;g.fillStyle=css(o.c[1],.8+r()*.5);g.beginPath();g.ellipse(x,y,30+r()*24,22+r()*16,r()*3,0,6.3);g.fill()}
      for(let i=0;i<10;i++){g.fillStyle='rgba(255,230,120,.5)';g.beginPath();g.arc(r()*S,r()*S,2+r()*3,0,6.3);g.fill()}})},
    snow(g,o,r){g.fillStyle=css(o.c[0]);g.fillRect(0,0,S,S);wrap(g,()=>{for(let i=0;i<16;i++){g.fillStyle=i%2?'rgba(255,255,255,.35)':css(o.c[1],1,.25);g.beginPath();g.ellipse(r()*S,r()*S,26+r()*40,10+r()*16,r()*3,0,6.3);g.fill()}
      g.strokeStyle=css(o.c[2],1,.5);g.lineWidth=1.5;for(let i=0;i<4;i++){let x=r()*S,y=r()*S;const p=[[x,y]];for(let k=0;k<5;k++){x+=(r()-.5)*50;y+=(r()-.5)*50;p.push([x,y])}line(g,p)}})
      for(let i=0;i<14;i++)star(g,r()*S,r()*S,2.5+r()*2.5,.8)},
    dust(g,o,r){g.fillStyle=css(o.c[0]);g.fillRect(0,0,S,S);wrap(g,()=>{for(let i=0;i<5;i++){const x=r()*S,y=r()*S,w=20+r()*26;g.fillStyle=css(o.c[1],1,.55);g.beginPath();g.ellipse(x,y,w,w*.7,0,0,6.3);g.fill();g.strokeStyle=css(o.c[2],1,.5);g.lineWidth=3;g.beginPath();g.ellipse(x,y,w+2,w*.7+2,0,.5,3.6);g.stroke()}
      for(let i=0;i<60;i++){g.fillStyle=css(o.c[r()<.5?1:2],1,.4);g.beginPath();g.arc(r()*S,r()*S,1+r()*2.5,0,6.3);g.fill()}})},
    nebula(g,o,r){g.fillStyle=css(o.c[0]);g.fillRect(0,0,S,S);wrap(g,()=>{for(let i=0;i<14;i++){const x=r()*S,y=r()*S,w=40+r()*50,gr=g.createRadialGradient(x,y,0,x,y,w);gr.addColorStop(0,css(o.c[1+i%2],1,.3));gr.addColorStop(1,css(o.c[1+i%2],1,0));g.fillStyle=gr;g.fillRect(x-w,y-w,w*2,w*2)}});
      for(let i=0;i<50;i++){g.fillStyle=`rgba(255,255,255,${.3+r()*.5})`;g.fillRect(r()*S,r()*S,1.5,1.5)}},
    grass(g,o,r){g.fillStyle=css(o.c[0]);g.fillRect(0,0,S,S);for(let i=0;i<4;i++){g.fillStyle=css(o.c[1],1,.35);g.fillRect(i*64,0,32,S)}
      for(let i=0;i<500;i++){g.strokeStyle=css(o.c[r()<.5?0:1],.8+r()*.5,.5);g.lineWidth=1.5;const x=r()*S,y=r()*S;line(g,[[x,y],[x+2,y-6]])}},
    checker(g,o,r){for(let i=0;i<8;i++)for(let j=0;j<8;j++){g.fillStyle=css(o.c[(i+j)%2]);g.fillRect(i*32,j*32,32,32)}g.strokeStyle='rgba(255,255,255,.1)';g.lineWidth=2;for(let i=0;i<=8;i++){line(g,[[i*32,0],[i*32,S]]);line(g,[[0,i*32],[S,i*32]])}},
    gravel(g,o,r){g.fillStyle=css(o.c[0]);g.fillRect(0,0,S,S);for(let y=6;y<S;y+=12){g.strokeStyle=css(o.c[1],1,.35);g.lineWidth=2;g.beginPath();for(let x=0;x<=S;x+=8)g.lineTo(x,y+Math.sin(x/(S/(2*Math.PI))+y*.1)*3);g.stroke()}
      for(let i=0;i<160;i++){g.fillStyle=css(o.c[r()<.5?1:0],r()<.5?.8:1.15,.5);g.beginPath();g.arc(r()*S,r()*S,1+r()*2,0,6.3);g.fill()}},
    dirt(g,o,r){g.fillStyle=css(o.c[0]);g.fillRect(0,0,S,S);wrap(g,()=>{for(let i=0;i<14;i++){g.fillStyle=css(o.c[1+i%2],1,.4);g.beginPath();g.ellipse(r()*S,r()*S,20+r()*40,12+r()*20,r()*3,0,6.3);g.fill()}
      for(let i=0;i<30;i++){g.fillStyle=`rgba(${r()<.5?'255,255,255':'0,0,0'},.1)`;g.beginPath();g.arc(r()*S,r()*S,1+r()*3,0,6.3);g.fill()}})}
  };
  const uR={value:20};
  const fade=m=>{m.transparent=true;m.onBeforeCompile=s=>{s.uniforms.uR=uR;
    s.vertexShader='varying vec3 vWP;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;');
    s.fragmentShader='varying vec3 vWP;uniform float uR;\n'+s.fragmentShader.replace('#include <dithering_fragment>','gl_FragColor.a*=1.-smoothstep(uR*.55,uR,length(vWP.xz));\n#include <dithering_fragment>')};return m};
  const terrMat=()=>memo(MAT,'terr',()=>{const o=TH.out,r=rnd(99),t=mkt(mkc(S,S,g=>TERR[o.k](g,o,r)),1);
    const dm=o.dim||.5,m=o.k=='nebula'?new THREE.MeshBasicMaterial({map:t}):o.k=='lava'?new THREE.MeshStandardMaterial({map:t,color:0x777777,emissiveMap:t,emissive:0xffffff,emissiveIntensity:.55,roughness:.9}):new THREE.MeshStandardMaterial({map:t,color:new THREE.Color(dm,dm,dm),roughness:o.k=='water'?.3:.95});
    if(o.k=='water')m.opacity=.9;return keep(fade(m))});
  const glintMat=()=>memo(MAT,'glint',()=>{const r=rnd(5),t=mkt(mkc(S,S,g=>{wrap(g,()=>{g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=2;for(let i=0;i<14;i++){g.beginPath();g.arc(r()*S,r()*S,6+r()*10,3.7,5.7);g.stroke()}});for(let i=0;i<20;i++)star(g,r()*S,r()*S,2+r()*2,.9)}),1);
    return keep(fade(new THREE.MeshBasicMaterial({map:t,transparent:true,opacity:.2,blending:THREE.AdditiveBlending,depthWrite:false})))});
  const shoreMat=()=>memo(MAT,'shore',()=>{const o=TH.out,r=rnd(11),w=o.k=='water',l=o.k=='lava';
    const t=mkt(mkc(128,128,g=>{for(let i=0;i<22;i++){const e=i*1.6,a=Math.pow(1-i/22,2)*(w?.55:l?.22:.38);g.strokeStyle=w?`rgba(255,255,255,${a})`:l?`rgba(255,140,40,${a})`:`rgba(0,0,0,${a})`;g.lineWidth=2.4;const m=34+e;g.beginPath();g.rect(64-(m),64-(m),m*2,m*2);g.stroke()}
      if(w)for(let i=0;i<40;i++){const a=r()*6.3,d=44+r()*8;g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.arc(64+Math.cos(a)*d*1.02,64+Math.sin(a)*d*1.02,1.5+r()*2,0,6.3);g.fill()}}));
    return keep(new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,blending:l?THREE.AdditiveBlending:THREE.NormalBlending,polygonOffset:true,polygonOffsetFactor:-1}))});

  /* ── 소품 (여러 조각을 한 덩어리로 합쳐서 같은 종류는 한 번에 그려요) ── */
  const G={cyl:new THREE.CylinderGeometry(1,1,1,6),cone:new THREE.ConeGeometry(1,1,6),cone4:new THREE.ConeGeometry(1,1,4),ico:new THREE.IcosahedronGeometry(1,0),box:new THREE.BoxGeometry(1,1,1),oct:new THREE.OctahedronGeometry(1,0),dod:new THREE.DodecahedronGeometry(1,0)};
  const P=(g,c,x,y,z,sx,sy,sz,ry=0,rz=0,rx=0)=>({g,c,x,y,z,sx,sy,sz,ry,rz,rx});
  const splay=(n,y0,len,w,cols,tilt,r0=0)=>Array.from({length:n},(_,i)=>{const a=i/n*6.283+r0;return P('cone',cols[i%cols.length],Math.sin(a)*len*.3,y0+len*.42,Math.cos(a)*len*.3,w,len,w,0,-tilt*Math.sin(a),tilt*Math.cos(a))});
  const B={
    tree:(a,b,c=b)=>[P('cyl',a,0,.3,0,.07,.6,.07),P('ico',b,0,.8,0,.38,.34,.38),P('ico',c,.16,1.1,.05,.24,.22,.24)],
    baobab:(a,b)=>[P('cyl',a,0,.35,0,.17,.7,.17),P('ico',b,0,.8,0,.4,.16,.4),P('ico',b,.14,.9,.1,.22,.12,.22)],
    palm:(a,b,c=0xf2d6a0)=>[P('dod',c,0,.03,0,.34,.1,.34),P('cyl',a,0,.55,0,.05,1.1,.05),...[0,1,2].map(i=>P('ico',b,0,1.12,0,.55,.05,.14,i*1.05)),P('ico',a,.06,1.08,0,.06,.06,.06)],
    pine:(a,b,c)=>[P('cyl',a,0,.15,0,.06,.3,.06),P('cone',b,0,.55,0,.4,.6,.4),P('cone',b,0,.88,0,.3,.5,.3),P('cone',b,0,1.17,0,.2,.4,.2),...(c!=null?[P('cone',c,0,.68,0,.3,.3,.3),P('cone',c,0,1,0,.22,.3,.22),P('cone',c,0,1.3,0,.14,.25,.14)]:[])],
    rock:(a)=>[P('dod',a,0,.12,0,.3,.2,.26,.5),P('dod',a,.28,.07,.1,.16,.12,.14,1)],
    crystal:(a,b)=>[P('oct',a,0,.45,0,.14,.55,.14),P('oct',b,.2,.28,.05,.1,.36,.1,0,-.3)],
    pole:(a,b)=>[P('cyl',a,0,.55,0,.025,1.1,.025),P('cyl',a,0,.03,0,.1,.06,.1),P('ico',b,0,1.15,0,.1,.1,.1)],
    mush:(a,b,c)=>[P('cyl',a,0,.15,0,.07,.3,.07),P('ico',b,0,.34,0,.27,.16,.27),P('ico',c,.1,.44,.08,.05,.03,.05),P('ico',c,-.1,.42,-.1,.05,.03,.05),P('ico',c,-.05,.44,.14,.04,.03,.04)],
    flower:(a,b,c)=>[P('cyl',a,0,.25,0,.02,.5,.02),P('ico',b,0,.55,0,.17,.1,.17),P('ico',c,0,.62,0,.08,.05,.08)],
    stack:(a,b)=>[0,1,2].map(i=>P('cyl',i%2?b:a,0,.06+i*.12,0,.2,.12,.2)),
    wall:(a,b=a)=>[P('box',a,0,.07,0,.5,.14,.2),P('box',b,0,.21,0,.5,.14,.2),P('box',a,.12,.35,0,.26,.14,.2)],
    cross:(a)=>[0,1,2].map(i=>P('box',a,0,.2,0,.5,.05,.05,i*1.05,i-1?.8*(i-1):.8,0)),
    cone:(a,b,c)=>[P('box',c,0,.015,0,.24,.03,.24),P('cone',a,0,.17,0,.1,.3,.1),P('cyl',b,0,.17,0,.065,.05,.065)],
    volc:(a,b)=>[P('cone',a,0,.28,0,.5,.56,.5),P('ico',b,0,.56,0,.16,.07,.16)],
    tuft:(a,b=a)=>splay(6,0,.4,.05,[a,b],.5),
    cycad:(a,b)=>[P('cyl',a,0,.25,0,.08,.5,.08),...splay(5,.45,.7,.06,[b],1.1)],
    lantern:(a,b)=>[P('box',a,0,.05,0,.2,.1,.2),P('cyl',a,0,.25,0,.05,.3,.05),P('box',b,0,.47,0,.17,.14,.17),P('cone4',a,0,.62,0,.26,.12,.26,.78)],
    hut:(a,b)=>[P('box',a,0,.15,0,.5,.3,.4),P('cone4',b,0,.44,0,.46,.3,.46,.78)]
  };
  const LOW=new Set(['rock','tuft','stack','wall','cross','cone','flower']);
  const propGeo=(t,a,b,c)=>memo(GEO,'p'+t+a+b+c,()=>{const ps=B[t](a,b,c),pos=[],nor=[],col=[],m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),s=new THREE.Vector3(),cc=new THREE.Color();
    ps.forEach(p=>{const g=G[p.g].clone().toNonIndexed();g.applyMatrix4(m.compose(v.set(p.x,p.y,p.z),q.setFromEuler(e.set(p.rx,p.ry,p.rz)),s.set(p.sx,p.sy,p.sz)));cc.set(p.c).multiplyScalar(.72);
      for(const n of g.attributes.position.array)pos.push(n);for(const n of g.attributes.normal.array)nor.push(n);for(let i=0;i<g.attributes.position.count;i++)col.push(cc.r,cc.g,cc.b);g.dispose()});
    const o=new THREE.BufferGeometry();o.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));o.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));o.setAttribute('color',new THREE.Float32BufferAttribute(col,3));return o});
  const propMat=()=>memo(MAT,'prop',()=>keep(new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.8})));

  /* ── 바닥 표시 (보석, 스위치, 포털, 출발) ── */
  const DG=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),ringMats=[];
  const decalMat=(kind,col)=>memo(MAT,'d'+kind+col,()=>{const k=col,t=mkt(mkc(128,128,g=>{
      if(kind=='pad'){g.fillStyle='rgba(0,0,0,.22)';g.beginPath();g.arc(64,64,52,0,6.3);g.fill();g.strokeStyle=css(k,1,.85);g.lineWidth=5;g.beginPath();g.arc(64,64,54,0,6.3);g.stroke();g.lineWidth=3;for(let i=0;i<8;i++){const a=i*.785;line(g,[[64+Math.cos(a)*42,64+Math.sin(a)*42],[64+Math.cos(a)*50,64+Math.sin(a)*50]])}}
      else if(kind=='ring'){const gr=g.createRadialGradient(64,64,20,64,64,62);gr.addColorStop(0,css(k,1,0));gr.addColorStop(.6,css(k,1,.5));gr.addColorStop(1,css(k,1,0));g.fillStyle=gr;g.fillRect(0,0,128,128);g.strokeStyle=css(k,1.2,.95);g.lineWidth=5;g.beginPath();g.arc(64,64,40,0,6.3);g.stroke()}
      else if(kind=='spot'){const gr=g.createRadialGradient(64,64,0,64,64,58);gr.addColorStop(0,css(k,1,.55));gr.addColorStop(1,css(k,1,0));g.fillStyle=gr;g.fillRect(0,0,128,128)}
      else{g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=5;g.beginPath();g.arc(64,64,40,0,6.3);g.stroke();g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.moveTo(64,2);g.lineTo(84,26);g.lineTo(44,26);g.fill()}}));
    const m=keep(new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,blending:kind=='ring'?THREE.AdditiveBlending:THREE.NormalBlending}));if(kind=='ring')ringMats.push(m);return m});

  const land=new THREE.Group();
  const clearLand=()=>{while(land.children.length){const o=land.children[0];land.remove(o);if(o.isInstancedMesh)o.dispose&&o.dispose();if(o.userData.own)o.geometry.dispose()}};
  const hash=s=>[...s].reduce((a,c)=>a*31+c.charCodeAt(0)|0,7);
  const sync=()=>{if(key==themeId)return;MAT.forEach(m=>arr(m).forEach(x=>{x.map&&x.map.dispose();x.emissiveMap&&x.emissiveMap.dispose();x.dispose()}));GEO.forEach(g=>g.dispose());TEX.clear();MAT.clear();GEO.clear();ringMats.length=0;key=themeId};
  const T0=new THREE.Matrix4(),Q=new THREE.Quaternion(),E=new THREE.Euler(),V=new THREE.Vector3(),SC=new THREE.Vector3();
  let base=null,terrM=null,glintM=null,lavaM=null;
  return{land,sync,
    floating:()=>TH.out.y<-.7,
    under,
    tile(x,z,h){sync();const m=new THREE.Mesh(tileGeo(h),tMat(h,(x+z)%2));m.position.y=(h*.5-.6)/2;if(ROT[GRND(h)])m.rotation.y=((x*3+z*5)%4)*Math.PI/2;m.castShadow=m.receiveShadow=true;return m},
    decal(kind,col,sz=1){sync();const m=new THREE.Mesh(DG,decalMat(kind,col));m.scale.setScalar(sz);m.renderOrder=2;return m},
    fill(lv,cx,cz,camR){sync();clearLand();const o=TH.out,R=camR+4.5,gw=lv.H[0].length,gd=lv.H.length;uR.value=R;
      const mat=terrM=terrMat(),L=8,e=[(gw%2?0:.5),(gd%2?0:.5)];
      const mk=(mt,y,own)=>{const g=new THREE.CircleGeometry(R,48).rotateX(-Math.PI/2),t=new THREE.Mesh(g,mt);t.position.y=y;t.userData.own=1;t.receiveShadow=true;land.add(t);return t};
      mat.map.repeat.set(2*R/L,2*R/L);mat.map.offset.set(-(R+e[0])/L,(e[1]-R)/L);base=mat.map.offset.clone();
      if(mat.emissiveMap){mat.emissiveMap.repeat.copy(mat.map.repeat)}
      mk(mat,o.y);lavaM=o.k=='lava'?mat:null;
      glintM=null;if(o.k=='water'){const gm=glintMat();gm.map.repeat.set(2*R/5,2*R/5);glintM=gm;mk(gm,o.y+.02)}
      // 땅 가장자리 (물거품, 용암 빛, 그림자)
      if(o.k!='nebula'){let n=0;lv.H.forEach(r=>r.forEach(h=>{if(h)n++}));const im=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),shoreMat(),Math.max(1,n));im.userData.own=1;let i=0;
        lv.H.forEach((r,z)=>r.forEach((h,x)=>{if(h){im.setMatrixAt(i++,T0.compose(V.set(x-cx,o.y+.02,z-cz),Q.identity(),SC.set(1.7,1,1.7)))}}));im.renderOrder=1;land.add(im)}
      // 소품
      const list=TH.props,rr=hash(themeId),groups=new Map(),pm=propMat();
      for(let gz=-4;gz<gd+4;gz++)for(let gx=-4;gx<gw+4;gx++){
        const dx=gx<0?-gx:gx>=gw?gx-gw+1:0,dz=gz<0?-gz:gz>=gd?gz-gd+1:0,d=Math.max(dx,dz);if(!d)continue;
        const r=rnd((gx+9)*73856093^(gz+9)*19349663^rr);if(r()>(d==1?.3:.2))continue;
        const ok=list.filter(p=>d>1||LOW.has(p[0]));if(!ok.length)continue;const p=ok[r()*ok.length|0],j=d==1?.2:.32;
        let g=groups.get(p[0]);if(!g){g={p,m:[]};groups.set(p[0],g)}
        const s=.8+r()*.5;g.m.push(new THREE.Matrix4().compose(V.set(gx-cx+(r()-.5)*2*j,o.y,gz-cz+(r()-.5)*2*j),Q.setFromEuler(E.set(0,r()*6.3,0)),SC.set(s,s*(.9+r()*.3),s)))}
      groups.forEach(({p,m})=>{const im=new THREE.InstancedMesh(propGeo(p[0],p[1],p[2],p[3]),pm,m.length);m.forEach((mm,i)=>im.setMatrixAt(i,mm));im.castShadow=im.receiveShadow=true;land.add(im)})},
    anim(T){if(reduce)return;
      if(terrM&&TH.out.k=='water'){const b=base;terrM.map.offset.set(b.x+T*.012,b.y+T*.008)}
      if(glintM){glintM.map.offset.set(-T*.02,T*.015)}
      if(lavaM)lavaM.emissiveIntensity=.55+Math.sin(T*1.6)*.2;
      ringMats.forEach(m=>m.opacity=.75+Math.sin(T*4)*.25)}}
})():null;
