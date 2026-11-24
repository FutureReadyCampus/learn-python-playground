'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const DIRS=[[0,-1],[1,0],[0,1],[-1,0]];            // 북 동 남 서
class Fail extends Error{} class Stop extends Error{}

/* 화면이 아는 지금 상태. 규칙은 없어요. py/puzzle.py 가 돌려준 기록(actions)을 차례로 받아 따라갈 뿐이에요.
   (숫자판, 테마를 바꿔 다시 그릴 때 되살리기, 성공 판정 표시에 쓰여요) */
class View{
  constructor(spec){
    this.spec=spec;this.H=spec.H.map(r=>[...r]);
    this.gems=new Set(spec.gems.map(String));this.gemTotal=this.gems.size;this.collected=0;
    this.sws=new Set(spec.sws);this.on=new Set();
    const s=spec.start;this.actors=[{x:s[0],z:s[1],d:s[2],kind:'hero'}];
    this.portalOff=new Set(spec.portals_off||[]);this.placed=[];this.log=[];
  }
  apply(r){
    this.log.push(r);const a=this.actors[r.a||0];
    if(r.t=='move'){const e=r.tele||r.to;a.x=e[0];a.z=e[1]}
    else if(r.t=='turn')a.d=r.d;
    else if(r.t=='gem'&&r.ok){this.gems.delete(r.at+'');this.collected++}
    else if(r.t=='sw'&&r.ok){r.on?this.on.add(r.at+''):this.on.delete(r.at+'')}
    else if(r.t=='portal'){r.on?this.portalOff.delete(r.k):this.portalOff.add(r.k)}
    else if(r.t=='lock'){r.plats.forEach(p=>this.H[p.at[1]][p.at[0]]=p.h)}
    else if(r.t=='spawn'){this.actors[r.a]={x:r.at[0],z:r.at[1],d:r.d,kind:r.kind}}
    else if(r.t=='place'){
      this.H[r.at[1]][r.at[0]]=r.h;
      if(r.kind=='gem'){this.gems.add(r.at+'');this.gemTotal++}
      else if(r.kind=='switch')this.sws.add(r.at+'');
      this.placed.push(r);
    }
  }
}
