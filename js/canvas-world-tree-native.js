'use strict';
/* Generated from supplied PixelLab v3.38. Source math retained; damage/preview controllers excluded. */
let worldTreeNativeFx;
{
const G={WT_ATLAS:{skills:Object.values(SKILL_FX_ATLAS)},WT_CATALOG:[{"id":1,"name":"연속 베기","grid":{"kind":"arc","range":1},"skill":{"ele":"phys"}},{"id":2,"name":"묵직한 강타","grid":{"kind":"melee","range":1},"skill":{"ele":"phys"}},{"id":3,"name":"흡혈 타격","grid":{"kind":"melee","range":1},"skill":{"ele":"chaos"}},{"id":4,"name":"암살자의 일격","grid":{"kind":"melee","range":1},"skill":{"ele":"phys"}},{"id":5,"name":"회오리바람","grid":{"kind":"nova","range":1,"radius":1,"shape":"square"},"skill":{"ele":"phys"}},{"id":6,"name":"번개 타격","grid":{"kind":"chain","range":1,"jump":3},"skill":{"ele":"light"}},{"id":7,"name":"얼음 창","grid":{"kind":"line","range":7},"skill":{"ele":"cold"}},{"id":8,"name":"화염 참격","grid":{"kind":"arc","range":1},"skill":{"ele":"fire"}},{"id":9,"name":"독창 투척","grid":{"kind":"chain","range":5,"jump":3},"skill":{"ele":"chaos"}},{"id":10,"name":"서리 폭발","grid":{"kind":"blast","range":5,"radius":2,"shape":"circle"},"skill":{"ele":"cold","combatPattern":{"kind":"radialBurst","waveMsPerCell":90}}},{"id":11,"name":"번개 창","grid":{"kind":"line","range":7},"skill":{"ele":"light"}},{"id":12,"name":"지진 파쇄","grid":{"kind":"blast","range":1,"radius":1,"shape":"square"},"skill":{"ele":"phys","combatPattern":{"kind":"earthSpikes"}}},{"id":13,"name":"용암 강타","grid":{"kind":"cone","range":2},"skill":{"ele":"fire","combatPattern":{"kind":"authored","stages":[{"label":"용암 타격","delayMs":0,"damagePct":70,"grid":{"kind":"blast","radius":0}},{"label":"용암 균열","delayMs":340,"damagePct":30}]}}},{"id":14,"name":"관통 사격","grid":{"kind":"line","range":7},"skill":{"ele":"phys"}},{"id":15,"name":"연쇄 폭풍","grid":{"kind":"chain","range":5,"jump":3},"skill":{"ele":"light"}},{"id":16,"name":"공허 베기","grid":{"kind":"line","range":3},"skill":{"ele":"chaos","combatPattern":{"kind":"authored","stages":[{"label":"공허 절단","delayMs":0,"damagePct":100}]}}},{"id":17,"name":"혈기 폭쇄","grid":{"kind":"blast","range":1,"radius":1,"shape":"diamond"},"skill":{"ele":"phys","combatPattern":{"kind":"authored","stages":[{"label":"혈기 응축","delayMs":0,"damagePct":70,"grid":{"radius":0}},{"label":"혈기 파열","delayMs":160,"damagePct":30}]}}},{"id":18,"name":"불멸의 진동","grid":{"kind":"nova","range":2,"radius":2,"shape":"diamond"},"skill":{"ele":"phys","combatPattern":{"kind":"radialBurst","waveMsPerCell":110}}},{"id":19,"name":"화염 부패","grid":{"kind":"blast","range":6,"radius":1,"shape":"cross"},"skill":{"ele":"fire"}},{"id":20,"name":"빙결 침식","grid":{"kind":"blast","range":6,"radius":2,"shape":"diamond"},"skill":{"ele":"cold","combatPattern":{"kind":"authored","stages":[{"label":"서리 균열","delayMs":0,"damagePct":34,"grid":{"radius":0}},{"label":"침식 확산","delayMs":240,"damagePct":33,"grid":{"radius":1}},{"label":"침식 완성","delayMs":480,"damagePct":33,"grid":{"radius":2}}]}}},{"id":21,"name":"서리 파동","grid":{"kind":"line","range":5},"skill":{"ele":"cold","combatPattern":{"kind":"moving","intervalMs":160}}},{"id":22,"name":"뇌운 낙뢰","grid":{"kind":"chain","range":6,"jump":3},"skill":{"ele":"light"}},{"id":23,"name":"심연 전염","grid":{"kind":"chain","range":5,"jump":2},"skill":{"ele":"chaos"}},{"id":24,"name":"독니 사출","grid":{"kind":"line","range":7},"skill":{"ele":"chaos","combatPattern":{"kind":"boomerang","returnDelayMs":160}}},{"id":25,"name":"연발 사격","grid":{"kind":"fan","range":6,"rays":5},"skill":{"ele":"phys"}},{"id":26,"name":"폭열 창탄","grid":{"kind":"line","range":7},"skill":{"ele":"fire"}},{"id":27,"name":"암흑 파열","grid":{"kind":"blast","range":6,"radius":0},"skill":{"ele":"chaos"}},{"id":28,"name":"중력 붕괴","grid":{"kind":"blast","range":5,"radius":2,"shape":"circle"},"skill":{"ele":"phys","combatPattern":{"kind":"authored","stages":[{"label":"중력 견인","delayMs":0,"damagePct":30,"grid":{"radius":2,"shape":"circle"}},{"label":"중심 압축","delayMs":320,"damagePct":70,"grid":{"radius":1,"shape":"circle"},"skipGridControl":true}]}}},{"id":29,"name":"화염 폭풍핵","grid":{"kind":"blast","range":5,"radius":1,"shape":"circle"},"skill":{"ele":"fire","combatPattern":{"kind":"field","hits":3,"intervalMs":260,"damagePct":34}}},{"id":30,"name":"빙결 파열창","grid":{"kind":"line","range":6},"skill":{"ele":"cold"}},{"id":31,"name":"천뢰 분기","grid":{"kind":"chain","range":6,"jump":3,"fork":true},"skill":{"ele":"light"}},{"id":32,"name":"삼원 파동","grid":{"kind":"cone","range":3},"skill":{"ele":"fire","combatPattern":{"kind":"authored","stages":[{"label":"화염 파동","delayMs":0,"damagePct":34,"element":"fire","grid":{"range":1}},{"label":"냉기 파동","delayMs":180,"damagePct":33,"element":"cold","grid":{"range":2}},{"label":"번개 파동","delayMs":360,"damagePct":33,"element":"light","grid":{"range":3}}]}}},{"id":33,"name":"뇌격 삼연타","grid":{"kind":"melee","range":1},"skill":{"ele":"light"}},{"id":34,"name":"유성 낙화","grid":{"kind":"blast","range":6,"radius":2,"shape":"circle"},"skill":{"ele":"fire","combatPattern":{"kind":"meteor","groundHits":3,"groundIntervalMs":600,"groundDamagePct":8}}},{"id":35,"name":"난타 눈보라","grid":{"kind":"blast","range":5,"radius":2,"shape":"diamond"},"skill":{"ele":"cold","combatPattern":{"kind":"field","hits":4,"intervalMs":300}}},{"id":36,"name":"방패 투척","grid":{"kind":"line","range":6},"skill":{"ele":"phys","combatPattern":{"kind":"boomerang","returnDelayMs":180}}},{"id":37,"name":"룬 지뢰","grid":{"kind":"blast","range":5,"radius":2,"shape":"cross"},"skill":{"ele":"light","combatPattern":{"kind":"mine","armDelayMs":460}}},{"id":38,"name":"원소 포션 투척","grid":{"kind":"blast","range":5,"radius":1,"shape":"circle"},"skill":{"ele":"fire","combatPattern":{"kind":"field","hits":3,"intervalMs":240,"damagePct":34}}},{"id":39,"name":"방패 돌진","grid":{"kind":"arc","range":3},"skill":{"ele":"phys"}},{"id":40,"name":"그림자 점멸","grid":{"kind":"melee","range":6},"skill":{"ele":"chaos"}},{"id":41,"name":"집중 광선","grid":{"kind":"line","range":7,"directionCount":8,"widthCells":1,"aimMode":"nearest-45-degrees","lockDirectionDuringChannel":true},"skill":{"ele":"light","combatPattern":{"kind":"channel","hits":5,"intervalMs":180,"damagePct":22}}},{"id":42,"name":"용화 숨결","grid":{"kind":"cone","range":3,"directionCount":4,"halfWidthRatio":0.6,"aimMode":"nearest-cardinal","lockDirectionDuringChannel":true},"skill":{"ele":"fire","combatPattern":{"kind":"channel","hits":4,"intervalMs":220,"damagePct":27}}},{"id":43,"name":"공허 절삭광","grid":{"kind":"line","range":6},"skill":{"ele":"chaos","combatPattern":{"kind":"channel","hits":4,"intervalMs":240,"damagePct":29}}},{"id":44,"name":"탄성 플라스크","grid":{"kind":"chain","range":9},"skill":{"ele":"chaos","combatPattern":{"kind":"bouncingFlask","hits":4}}},{"id":45,"name":"광창 강림","grid":{"kind":"nova","range":3,"radius":3,"shape":"square","impactRadius":0},"skill":{"ele":"light","combatPattern":{"kind":"radiantLance","hits":1}}},{"id":46,"name":"시간 가속","grid":{"kind":"nova","range":3,"radius":3,"shape":"circle","distanceMetric":"euclidean"},"skill":{"ele":"chaos","combatPattern":{"kind":"timeAcceleration","durationMs":5000,"intervalMs":1000,"ticks":5,"initialTick":false}}},{"id":47,"name":"폭발 혼합물","grid":{"kind":"blast","range":4,"radius":1,"shape":"square","distanceMetric":"euclidean"},"skill":{"ele":"fire","combatPattern":{"kind":"explosiveMixture","impacts":1,"homing":false}}},{"id":48,"name":"과냉각 혼합물","grid":{"kind":"blast","range":4,"radius":3,"shape":"ring","distanceMetric":"euclidean"},"skill":{"ele":"cold","combatPattern":{"kind":"supercooledMixture","impacts":3,"radii":[1,2,3],"centerHit":true}}},{"id":49,"name":"빈 플라스크","grid":{"kind":"chain","range":4},"skill":{"ele":"phys","combatPattern":{"kind":"emptyFlask","baseShards":[1,4],"extraProjectileChance":true}}},{"id":50,"name":"신성한 안개","grid":{"kind":"nova","range":1,"radius":1,"shape":"square"},"skill":{"ele":"fire","combatPattern":{"kind":"holyMist","radius":1,"hits":1}}},{"id":51,"name":"파문심판","grid":{"kind":"blast","range":2,"radius":1,"shape":"cross"},"skill":{"ele":"light","combatPattern":{"kind":"rippleJudgment","forwardCells":2,"crossRadius":1}}},{"id":52,"name":"암살","grid":{"kind":"melee","range":4},"skill":{"ele":"phys","combatPattern":{"kind":"assassination","range":4}}},{"id":53,"name":"인과","grid":{"kind":"nova","range":4,"radius":4,"shape":"circle"},"skill":{"ele":"phys","combatPattern":{"kind":"channel"}}}]};
const WT_CATALOG=G.WT_CATALOG;
function judgmentPose(source,landing,direction,progress,out={}){const d=({2:{dx:0,dy:1},4:{dx:-1,dy:0},6:{dx:1,dy:0},8:{dx:0,dy:-1}})[direction],hx=source.gx*48+24+d.dx*7,hy=source.gy*48+14+d.dy*3,tx=landing.gx*48+24,ty=landing.gy*48+24,p=Math.max(0,Math.min(1,progress)),lift=Math.min(66,Math.max(8,ty-18)),backX=hx-d.dx*16,backY=hy-d.dy*16-48;let x,y;
  if(p<.28){const u=p/.28;x=hx+d.dx*(14-30*u);y=hy+d.dy*(14-30*u)-30-18*u;}else if(p<.7){const u=(p-.28)/.42,v=u*u*(3-2*u);x=backX+(tx-backX)*v;y=backY+(ty-lift-backY)*v;}else{const u=(p-.7)/.3;x=tx;y=ty-lift*(1-u*u);}
  if(p===1){x=tx;y=ty;}Object.assign(out,{hx,hy,x,y});return out;
 }
const point=c=>[c.gx*48+24,c.gy*48+24],finite=n=>Number.isFinite(n),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const broad=new Set([5,10,17,18,27,28,29,34]);
const artHeading=new Map([[6,135],[7,-45],[9,-45],[11,-45],[14,135],[15,135],[21,90],[22,90],[24,135],[25,90],[26,-45],[30,-90],[31,90],[36,135],[41,0],[42,135]].map(([id,deg])=>[id,deg*Math.PI/180]));
const groundImpact=new Set([21,22,30,31]);
const radial=new Set([23,38,43]);
const facingAngles={2:Math.PI/2,4:Math.PI,6:0,8:-Math.PI/2};
const frostDirections=Array.from({length:8},(_,i)=>{const angle=i*Math.PI/4;return {angle,x:Math.cos(angle),y:Math.sin(angle)};});
/* PixelLab v3.12: fixed source poses, event-driven geometry, one shared atlas. */
{
 const ids=new Set([6,7,8,9,11,12,14,15,16,17,18,21,22,26,34]);
 const point=c=>[c.gx*48+24,c.gy*48+24],clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const unique=cells=>[...new Map(cells.filter(c=>Number.isFinite(c.gx)&&Number.isFinite(c.gy)).map(c=>[c.gx+','+c.gy,c])).values()].map(point);
 function preparePart0(e){if(!(e.id===34&&e.kind==='stage'&&e.stageIndex===0))return;
e.duration=Math.max(600,e.duration);
}
function preparePart1(e,effects){if(!(e.kind==='hit'))return;

   const stage=effects.find(v=>v!==e&&v.id===e.id&&v.kind==='stage'&&v.at===e.at&&v.stageIndex===e.stageIndex&&v.channelId===e.channelId&&v.sourceCell.gx===e.sourceCell.gx&&v.sourceCell.gy===e.sourceCell.gy);
   if(stage?._r){if(!stage._r.victims)stage._r.victims=[];for(const c of e._r.targets)if(!stage._r.victims.some(p=>p[0]===c[0]&&p[1]===c[1]))stage._r.victims.push(c);}

}
function prepare(e,effects){const center=e.footprint?.center||e.targetCells[0];
e._r={center:point(center),cells:unique(e.footprint?.cells?.length?e.footprint.cells:e.targetCells),targets:unique(e.targetCells),victims:null,motion:{x:0,y:0,angle:0}};
preparePart0(e,effects);
preparePart1(e,effects);}
 // Place a pose by its visible bounds; tiny asymmetric source padding cannot shift a hit.
 function paint(...args){const [e,submit,role,x,y,width,height,angle=0,alpha=1,flipY=false,pivot=0]=args;
  const sheet=G.WT_ATLAS.skills[e.id-1],b=sheet.remake[role],sx=width/b.width,sy=height/b.height*(flipY?-1:1),c=Math.cos(angle),s=Math.sin(angle);
  const ax=(b.anchor.x+(pivot===1?b.width/2:0))*sx,ay=(b.anchor.y+(pivot===2?b.height/2:0))*sy;
  submit(e,x-ax*c+ay*s,y-ax*s-ay*c,sx,0,angle,sheet.frames[role==='main'?0:role==='hit'?4:7],sy/sx,clamp(alpha,0,1));
 }
 function move(e,now,t){
  const p=e._r.motion;p.x=e._source[0]+(e._target[0]-e._source[0])*t;p.y=e._source[1]+(e._target[1]-e._source[1])*t;p.angle=e._angle;
  if(e._segments?.length){const age=now-e.at;let i=0;while(i<e._segments.length-1&&e._segments[i].end<=age)i++;const a=e._segments[i],u=clamp((age-a.start)/a.span,0,1);p.x=a.x+a.dx*u;p.y=a.y+a.dy*u;p.angle=a.angle;}
  return p;
 }
 function drawWindup(e,t,now,submit){
const r=e._r,id=e.id,c=r.center,age=now-e.at;

   if(id===34){const start=Math.max(0,e.duration-220);if(age<start)return;const p=(age-start)/Math.max(1,e.duration-start),height=Math.min(116,c[1]+32);paint(e,submit,'main',c[0],c[1]-height*(1-p*p),24,66,0,1,false,2);}
   return;

}
function drawHits(e,t,now,submit){
const r=e._r,id=e.id,fade=1-t;

   if(id===8)return;
   for(const p of r.targets){
    if(id===22)paint(e,submit,'main',p[0],p[1]+4,32,64,0,fade,false,2);
    const size=(id===26?18:id===12?24:id===17?22:20)*(1+.4*t);paint(e,submit,'hit',p[0],p[1],size,size,0,fade);
   }
   return;

}
function drawTravel(e,t,now,submit){
const id=e.id;

   if(id===6||id===15){
    const a=e._source,b=e._target,dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),progress=Math.min(1,t/.72),power=id===15?1+Math.min(3,e.stageIndex)*.14:1;
    paint(e,submit,'main',a[0]+dx*progress/2,a[1]+dy*progress/2,Math.max(4,len*progress),(id===15?18:11)*power,Math.atan2(dy,dx),.75+.25*Math.sin(t*Math.PI));return;
   }
   if(id===22){paint(e,submit,'main',e._target[0],e._target[1]+4,28,58,0,.2+.35*t,false,2);return;}
   const p=move(e,now,t);
   if(id===21){paint(e,submit,'main',p.x,p.y,24,44,p.angle-Math.PI,.9);return;}
   const w=({7:44,11:52,14:44,26:46})[id]||42,h=({14:7,11:10,7:11})[id]||13;
   paint(e,submit,'main',p.x,p.y,w,h,p.angle,1,false,1);return;

}
function stage8(e,t,now,submit){
const r=e._r;

   const angle=e._angle+Math.PI/4,drift=(t-.5)*20,grow=.75+.25*Math.min(1,t/.2),opacity=t<.65?1:(1-t)/.35;
   for(const p of r.victims||e._points)paint(e,submit,'main',p[0]+Math.cos(e._angle)*drift,p[1]+Math.sin(e._angle)*drift,60*grow,15,angle,opacity,true);return;

}
function stage12(e,t,now,submit){
const r=e._r,c=r.center,fade=1-t;

   if(e.stageIndex===0){const p=Math.min(1,t/.3);paint(e,submit,'hit',c[0],c[1]-10+14*p*p,28+12*p,36-18*p,0,fade);}
   else for(const p of r.victims||r.cells){const lift=Math.min(1,t/.3),h=8+27*lift;paint(e,submit,'main',p[0],p[1]+12,30,h,0,t<.7?1:(1-t)/.3,false,2);}return;

}
function stage16(e,t,now,submit){
const fade=1-t;

   const a=e._source,b=e._target,dx=b[0]-a[0],dy=b[1]-a[1],len=Math.max(1,Math.hypot(dx,dy)),u=.18+.82*Math.min(1,t/.25);
   paint(e,submit,'main',a[0]+dx*(.15+.425*u),a[1]+dy*(.15+.425*u),len*.85*u,14*(1-.25*t),Math.atan2(dy,dx),t<.6?1:fade/.4);return;

}
function stage17(e,t,now,submit){
const r=e._r,c=r.center,fade=1-t;
const size=e.stageIndex===0?32-16*t:28+78*Math.min(1,t/.7);paint(e,submit,'main',c[0],c[1],size,size,0,e.stageIndex===0?1:t<.65?1:fade/.35);return;
}
function stage18(e,t,now,submit){
const fade=1-t;
const radius=e.footprint?.radius??2,size=20+(Math.max(1,radius)*96-20)*t;paint(e,submit,'main',e._source[0],e._source[1],size,size,0,t<.7?1:fade/.3);return;
}
function stage22(e,t,now,submit){
const r=e._r,fade=1-t;
for(const p of r.targets)paint(e,submit,'main',p[0],p[1]+4,32,64,0,fade,false,2);return;
}
function stage26(e,t,now,submit){
const r=e._r,fade=1-t;
for(const p of r.targets){const size=24+26*Math.min(1,t/.4);paint(e,submit,'hit',p[0],p[1],size,size,0,fade);}return;
}
function stage34(e,t,now,submit){
const r=e._r,c=r.center,age=now-e.at;

   if(e.stageIndex===0&&age<230){const u=age/230;paint(e,submit,'hit',c[0],c[1],38+70*u,32+58*u,0,1-u);}
   // Burning ground is present between impact and the third confirmed 600ms tick.
   if(e.stageIndex<3)for(let i=0;i<r.cells.length;i++){const p=r.cells[i],pulse=.9+.1*Math.sin(age/120+i*1.7);paint(e,submit,'field',p[0],p[1]+7,32,20*pulse,0,.78);}return;

}
function stageDefault(e,t,now,submit){
const r=e._r,fade=1-t;
for(const p of r.targets)paint(e,submit,'hit',p[0],p[1],26,26,0,fade);
}
const stageDrawers={8:stage8,12:stage12,16:stage16,17:stage17,18:stage18,22:stage22,26:stage26,34:stage34,fallback:stageDefault};
function draw(e,t,now,submit){
if(e.kind==='windup')return drawWindup(e,t,now,submit);
if(e.kind==='hit')return drawHits(e,t,now,submit);
if(e.kind==='travel'||e.kind==='transfer')return drawTravel(e,t,now,submit);
if(e.kind!=='stage')return;
(stageDrawers[e.id]||stageDrawers.fallback)(e,t,now,submit);
}
 G.WT_REMAKE15={ids,prepare,draw};
}

/* v3.16: describe the action, then draw its PixelLab poses. No damage calculation. */
{
 const ids=new Set([6,8,11,14,15,16,17,22,26,34]),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),point=c=>[c.gx*48+24,c.gy*48+24];
 const cells=list=>[...new Map(list.map(c=>[c.gx+','+c.gy,c])).values()].map(point);
 function preparePart0(e){if(!(e.id===26&&e.kind==='hit'))return;
e.duration=Math.max(e.duration,430);
}
function preparePart1(e){if(!(e.id===34&&e.kind==='stage'&&e.stageIndex===0))return;
e.duration=Math.max(e.duration,600);
}
function matchingRiftWindup(windup,stage){return windup.id===16&&windup.kind==='windup'&&windup.channelId===stage.channelId&&windup._d&&Math.abs(windup.at+windup.duration-stage.at)<1&&windup.sourceCell.gx===stage.sourceCell.gx&&windup.sourceCell.gy===stage.sourceCell.gy;}
function preparePart2(e,effects){if(!(e.id===16&&(e.kind==='stage'||e.kind==='windup')))return;
if(e.kind==='stage')e.duration=Math.max(e.duration,600);voidGeometry(e);const stage=e.kind==='stage'?e:effects.find(v=>v.id===16&&v.kind==='stage'&&v.channelId===e.channelId&&v._d?.rift&&Math.abs(v.at-e.at-e.duration)<1&&v.sourceCell.gx===e.sourceCell.gx&&v.sourceCell.gy===e.sourceCell.gy);if(stage)for(const windup of effects)if(matchingRiftWindup(windup,stage))windup._d.rift=stage._d.rift;
}
function preparePart3(e,effects){if(!(e.id===22&&e.effectRole==='periodicTick'))return;
const cloud=effects.find(v=>v.id===22&&v.effectRole==='stormCloud'&&v.targetCells.some(c=>e.targetCells.some(p=>p.gx===c.gx&&p.gy===c.gy)));e._d.cloudUntil=cloud?cloud.at+cloud.duration:e.at;
}
function preparePart4(e,effects){if(!(e.kind==='hit'))return;

   const stage=effects.find(v=>v!==e&&v.id===e.id&&v.kind==='stage'&&v.at===e.at&&v.stageIndex===e.stageIndex&&v.channelId===e.channelId);
   if(stage?._d){if(!stage._d.victims)stage._d.victims=[];for(const p of e._d.targets)if(!stage._d.victims.some(q=>q[0]===p[0]&&q[1]===p[1]))stage._d.victims.push(p);if(e.id===8)cleaveGeometry(stage);}

}
function preparePart5(e,effects){if(!(e.id===26))return;
for(const hit of effects)if(hit.id===26&&hit.kind==='hit'&&hit._d){hit._d.delayed=effects.some(stage=>stage.id===26&&stage.kind==='stage'&&(stage.stageIndex>0||stage.effectRole==='periodicTick')&&Math.abs(stage.at-hit.at-250)<1&&stage.targetCells.some(c=>hit.targetCells.some(v=>c.gx===v.gx&&c.gy===v.gy)));}
}
function prepare(e,effects){e._d={center:point(e.footprint?.center||e.targetCells[0]),targets:cells(e.targetCells),victims:null,path:{x:0,y:0,angle:0},clip:{x:0,y:0,w:64,h:64},delayed:false};
preparePart0(e,effects);
preparePart1(e,effects);
preparePart2(e,effects);
preparePart3(e,effects);
preparePart4(e,effects);
preparePart5(e,effects);}
 function cleaveGeometry(e){const points=e._d.victims||e._d.targets,angle=e._angle+Math.PI/4,co=Math.cos(angle),si=Math.sin(angle);let x=0,y=0,lo=Infinity,hi=-Infinity;for(const p of points){x+=p[0];y+=p[1];const q=p[0]*co+p[1]*si;lo=Math.min(lo,q);hi=Math.max(hi,q);}e._d.cleave={x:x/points.length,y:y/points.length,scale:Math.min(2,Math.max(1,(hi-lo+36)/64))};}
 function poseAnchor(b,frame,pivot,sx,sy){const anchor=b.anchors?.[frame]||b.anchor,ax=(pivot===1&&b.tip?b.tip.x:anchor.x+(pivot===1?b.width/2:0))*sx,ay=(pivot===1&&b.tip?b.tip.y:anchor.y+(pivot===2?b.height/2:0))*sy;return {ax,ay};}
function poseStyle(args){const [angle=0,alpha=1,pivot=0,flip=false,phase=0]=args;return {angle,alpha,pivot,flip,phase};}
function pose(...args){let [e,submit,role,x,y,width,height]=args;let {angle,alpha,pivot,flip,phase}=poseStyle(args.slice(7));
  width=Math.max(1,width);height=Math.max(1,height);const sheet=G.WT_ATLAS.skills[e.id-1],b=sheet.description[role],sx=width/b.width,sy=height/b.height*(flip?-1:1);
  if(pivot===1&&b.tip)angle-=Math.atan2((b.tip.y-b.tail.y)*sy,(b.tip.x-b.tail.x)*sx);const co=Math.cos(angle),si=Math.sin(angle);
  const frame=b.animation?b.animation[Math.min(b.animation.length-1,Math.floor(clamp(phase)*b.animation.length))]:b.frame;
  const {ax,ay}=poseAnchor(b,frame,pivot,sx,sy);
  submit(e,x-ax*co+ay*si,y-ax*si-ay*co,sx,0,angle,sheet.frames[frame],sy/sx,clamp(alpha));
 }
 function follow(e,now,t){const p=e._d.path;p.x=e._source[0]+(e._target[0]-e._source[0])*t;p.y=e._source[1]+(e._target[1]-e._source[1])*t;p.angle=e._angle;const seg=e._segments;if(seg?.length){const age=now-e.at;let i=0;while(i<seg.length-1&&seg[i].end<=age)i++;const a=seg[i],u=clamp((age-a.start)/a.span);p.x=a.x+a.dx*u;p.y=a.y+a.dy*u;p.angle=a.angle;}return p;}
 function link(e,submit,role,thickness,alpha=1){const a=e._source,b=e._target;pose(e,submit,role,(a[0]+b[0])/2,(a[1]+b[1])/2,Math.max(4,Math.hypot(b[0]-a[0],b[1]-a[1])),thickness,Math.atan2(b[1]-a[1],b[0]-a[0]),alpha);}
 // Reveal native source columns along a fixed connection. The texture never
 // stretches from zero on every frame, and reaches the next target at its hit.
 function revealLink(...args){const [e,submit,role,progress,thickness,alpha=1]=args;
  const sheet=G.WT_ATLAS.skills[e.id-1],b=sheet.description[role],f=sheet.frames[b.frame],a=e._source,z=e._target,dx=z[0]-a[0],dy=z[1]-a[1],length=Math.hypot(dx,dy),columns=Math.floor(b.width*clamp(progress));if(columns<1||length<1)return;
  const sx=length/b.width,sy=thickness/b.height,clip=e._d.clip;clip.x=f.x+Math.round(b.anchor.x+32-(b.width-1)/2);clip.y=f.y+Math.round(b.anchor.y+32-(b.height-1)/2);clip.w=columns;clip.h=b.height;
  const u=columns/b.width/2;submit(e,a[0]+dx*u,a[1]+dy*u,sx,0,Math.atan2(dy,dx),clip,sy/sx,alpha);
 }
 function burst(e,submit,p,age){const u=clamp(age/180);pose(e,submit,'burst',p[0],p[1],46,42,0,age<110?1:clamp((180-age)/70),0,false,u);}
 function heatMark(e,submit,p,age){const sheet=G.WT_ATLAS.skills[25],f=sheet.frames[sheet.description.heat.frame],clip=e._d.clip;clip.x=f.x+24;clip.y=f.y+12;clip.w=16;clip.h=34;const sx=(age<90?10:age<180?13:16)/16,sy=(age<90?20:age<180?23:26)/34;submit(e,p[0],p[1],sx,0,0,clip,sy/sx,.62+.3*age/250);}
 function stormArcs(e,submit,p,t){const sheet=G.WT_ATLAS.skills[14],b=sheet.description.vortex,f=sheet.frames[b.frame],clip=e._d.clip,base=.7+e.stageIndex*.14;for(let i=0;i<3;i++){const u=(t-i*.11)/(.68-i*.07);if(u<0||u>=1)continue;const scale=base*[1,.78,1.08][i],h=Math.max(1,Math.floor(b.height*[.17,.13,.2][i])),width=Math.floor(b.width*(i===1?.75:1)),a=i*2.13+e.stageIndex*.4+(i===1?-1:1)*(u*.9),r=(b.height-h)/2*scale+(i===0?-7*Math.sin(Math.PI*u):i===1?12*u:3+6*u);clip.x=f.x+Math.round(b.anchor.x+32-(b.width-1)/2)+(b.width-width>>1);clip.y=f.y+Math.round(b.anchor.y+32-(b.height-1)/2);clip.w=width;clip.h=h;submit(e,p[0]+Math.sin(a)*r,p[1]-Math.cos(a)*r,scale,0,a,clip,1,clamp((1-u)*1.8));}}
 // Assemble native caps and a clipped/repeated middle once per cast. Every
 // source pixel remains 1x; extending the line never stretches the texture.
 function voidGeometry(e){const a=e._source,b=e._target,dx=b[0]-a[0],dy=b[1]-a[1],distance=Math.hypot(dx,dy),angle=Math.atan2(dy,dx),length=Math.max(16,Math.round(distance-8)),cap=Math.min(32,Math.floor(length/2)),parts=[];let offset=0;parts.push({slot:0,sx:0,width:cap,offset});offset+=cap;let middle=length-cap*2;while(middle>0){const source=32+(offset-cap)%64,slot=Math.floor(source/64),sx=source%64,width=Math.min(middle,64-sx,96-source);parts.push({slot,sx,width,offset});offset+=width;middle-=width;}parts.push({slot:1,sx:64-cap,width:cap,offset});e._d.rift={x:a[0]+Math.cos(angle)*16,y:a[1]+Math.sin(angle)*16,co:Math.cos(angle),si:Math.sin(angle),angle,length,parts};}
 function voidRift(e,submit,progress,phase=0,closure=0){const g=e._d.rift,clip=e._d.clip,sheet=G.WT_ATLAS.skills[15],shown=Math.floor(g.length*clamp(progress)),h=closure?Math.max(2,Math.round(32*(1-closure))):64,top=Math.floor((64-h)/2),alpha=closure<.25?1:closure<.5?.75:closure<.75?.5:.25;for(const p of g.parts){const width=Math.min(p.width,shown-p.offset);if(width<=0)continue;const f=sheet.frames[p.slot+phase*2],d=p.offset+width/2;clip.x=f.x+p.sx;clip.y=f.y+top;clip.w=width;clip.h=h;submit(e,g.x+g.co*d,g.y+g.si*d,1,0,g.angle,clip,1,alpha);}}
 function drawWindup(e,t,now,submit){
const d=e._d,id=e.id,c=d.center,age=now-e.at;

   if(id===16){const span=Math.min(180,e.duration),ageStart=e.duration-span;if(age>=ageStart)voidRift(e,submit,(age-ageStart)/Math.max(1,span));}
   if(id===34){const start=Math.max(0,e.duration-320);if(age>=start){const u=clamp((age-start)/Math.max(1,e.duration-start)),b=G.WT_ATLAS.skills[33].description.main,y=c[1]-200*(1-(.65*u+.35*u*u));pose(e,submit,'main',c[0],Math.round(y),b.width*2,b.height*2,0,1,0,false,(age%180)/180);}}
   return;

}
function drawCloud(e,t,now,submit){
const d=e._d;
for(const p of d.targets)pose(e,submit,'cloud',p[0],p[1]-46,38,22,0,.82);return;
}
function drawIgnite(e,t,now,submit){
const d=e._d,age=now-e.at;
for(const p of d.targets)pose(e,submit,'ember',p[0],p[1]+6,14,20,0,.6+.15*Math.sin(age/150));return;
}
function drawTravel(e,t,now,submit){
const id=e.id;

   if(id===6){if(e.stageIndex===0)return;revealLink(e,submit,'link',t,Math.max(6,14-Math.min(2,e.stageIndex)*3),.95);return;}
   if(id===15){const power=1+Math.min(3,e.stageIndex)*.18;revealLink(e,submit,'main',t,10*power);return;}
   if(id===22){revealLink(e,submit,'main',t,8,.9);return;}
   const p=follow(e,now,t);
   if(id===11){const distance=Math.max(Math.abs(p.x-e._source[0]),Math.abs(p.y-e._source[1]))/48,growth=1+Math.min(5,distance)*.06,b=G.WT_ATLAS.skills[10].description.main;pose(e,submit,'main',p.x,p.y,b.width*growth*1.2,b.height*growth*1.2,p.angle,1,1);return;}
   if(id===14){const carry=e.kind==='transfer',attenuation=Math.pow(.8,Math.max(1,e.stageIndex));pose(e,submit,'main',p.x,p.y,carry?36*Math.max(.6,attenuation):54,carry?6:10,p.angle,1,1);return;}
   if(id===26){pose(e,submit,'main',p.x,p.y,48,17,p.angle,1,1);return;}
   return;

}
function hit6(e,t,now,submit,p){
const age=now-e.at,fade=1-t;
if(e.stageIndex===0){const b=G.WT_ATLAS.skills[5].description.main;if(age<140)pose(e,submit,'main',p[0],p[1],b.width,b.height,e._angle+Math.PI/2,1,0,false,age/140);}else pose(e,submit,'hit',p[0],p[1],28-e.stageIndex*5,28-e.stageIndex*5,0,fade);
}
function hit15(e,t,now,submit,p){
const age=now-e.at;
stormArcs(e,submit,p,t);if(age<55)pose(e,submit,'hit',p[0],p[1],24+e.stageIndex*4,24+e.stageIndex*4,0,1-age/55);
}
function hit17(e,t,now,submit,p){
const age=now-e.at;
if(e.stageIndex>0&&age<65)pose(e,submit,'main',p[0],p[1],15,15,0,1-age/65);
}
function hit26(e,t,now,submit,p){
const d=e._d,age=now-e.at;
if(age<250)heatMark(e,submit,p,age);else if(!d.delayed)burst(e,submit,p,age-250);
}
function hit34(e,t,now,submit,p){
const age=now-e.at;
if(age<90){const b=G.WT_ATLAS.skills[33].description.contact;pose(e,submit,'contact',p[0],p[1]+4,b.width,b.height,0,age<45?1:.5);}
}
function hit16(e,t,now,submit,p){
const age=now-e.at;
if(age<90){const b=G.WT_ATLAS.skills[15].description.hit;pose(e,submit,'hit',p[0],p[1],b.width,b.height,e._angle+Math.PI/2,age<45?1:.5,0,false,age/90);}
}
function hit11(e,t,now,submit,p){
const age=now-e.at;
if(age<108)pose(e,submit,'hit',p[0],p[1],24,24,e._angle,1,0,false,age/108);
}
function hit14(e,t,now,submit,p){
const age=now-e.at;
if(age<108){const size=age<32?25:18;pose(e,submit,'hit',p[0],p[1],size,size*.72,e._angle,clamp((108-age)/76));}
}
function hit22(e,t,now,submit,p){
const age=now-e.at;
if(age<72)pose(e,submit,'hit',p[0],p[1],24,24,0,1-age/72,0,false,age/72);
}
function hitDefault(e,t,now,submit,p){
const id=e.id,fade=1-t;
const size=id===11?12:id===14?14:18;pose(e,submit,'hit',p[0],p[1],size,size,id===14?e._angle:0,fade);
}
const hitDrawers={6:hit6,15:hit15,17:hit17,26:hit26,34:hit34,16:hit16,11:hit11,14:hit14,22:hit22,fallback:hitDefault};
function drawHits(e,t,now,submit){
const d=e._d,id=e.id,age=now-e.at;

   if(id===8){if(age<72)for(const p of d.targets)pose(e,submit,'ember',p[0],p[1],12,16,0,1-age/72);return;}
   for(const p of d.targets){
    (hitDrawers[id]||hitDrawers.fallback)(e,t,now,submit,p);
   }return;

}
function stage14(e,t,now,submit){
const d=e._d,fade=1-t;
for(const p of d.targets){const power=Math.pow(.8,Math.max(1,e.stageIndex));pose(e,submit,'hit',p[0],p[1],26*power,20*power,e._angle,fade);}return;
}
function stage6(e,t,now,submit){
const fade=1-t;
if(e.stageIndex===0){/* confirmed hit carries the first strong melee blow */}else link(e,submit,'link',Math.max(5,13-e.stageIndex*3),fade);return;
}
function stage8(e,t,now,submit){
const d=e._d,age=now-e.at;
if(!d.cleave)cleaveGeometry(e);const b=G.WT_ATLAS.skills[7].description.main,g=d.cleave,u=clamp(age/90),drift=-9+20*u;pose(e,submit,'main',g.x+Math.cos(e._angle)*drift,g.y+Math.sin(e._angle)*drift,b.width*g.scale,b.height*g.scale,e._angle,age<150?1:clamp((260-age)/110),0,true,clamp(age/220));return;
}
function stage16(e,t,now,submit){
const age=now-e.at;
if(age<520)voidRift(e,submit,1,age>=260&&age<315?2:age>=220&&age<340?1:0,age>=340?clamp((age-340)/180):0);return;
}
function stage17(e,t,now,submit){
const d=e._d,c=d.center,age=now-e.at;
if(e.stageIndex===0){const size=38-22*t;pose(e,submit,'main',c[0],c[1],size,size,0,.65+.35*t);}else{pose(e,submit,'burst',c[0],c[1],92,92,0,age<150?1:clamp((240-age)/90),0,false,clamp(age/230));}return;
}
function stage22(e,t,now,submit){
const d=e._d,age=now-e.at;
if(age>=110)return;for(const p of d.targets){if(e.effectRole!=='periodicTick'||now>=d.cloudUntil)pose(e,submit,'cloud',p[0],p[1]-46,38,22,0,.82*clamp((110-age)/65));pose(e,submit,'bolt',p[0],p[1]+4,age<28?23:age<65?13:6,54,0,age<65?1:clamp((110-age)/45),2);if(age<50)pose(e,submit,'hit',p[0],p[1]+3,25,16,0,1-age/50,0,false,age/50);}return;
}
function stage26(e,t,now,submit){
const d=e._d,age=now-e.at;
for(const p of d.targets)burst(e,submit,p,age);return;
}
function meteorFade(age){return age<1640?1:age<1720?.66:.33;}
function stage34(e,t,now,submit){
const d=e._d,c=d.center,age=now-e.at;
if(e.stageIndex===0&&age<180){const role=age<65?'hit':'contact',b=G.WT_ATLAS.skills[33].description[role];pose(e,submit,role,c[0],c[1],b.width,b.height,0,age<130?1:.5);}if(e.stageIndex<3){const fieldAge=age+e.stageIndex*600,endFade=meteorFade(fieldAge),b=G.WT_ATLAS.skills[33].description.field,points=d.victims||d.targets;for(let i=0;i<points.length;i++){const p=points[i];if(fieldAge<80)continue;pose(e,submit,'field',p[0],p[1]+12,b.width,b.height,0,endFade,0,false,((fieldAge+i*79)%400)/400);}}return;
}
function stageDefault(e,t,now,submit){
const d=e._d,fade=1-t;
for(const p of d.targets)pose(e,submit,'hit',p[0],p[1],20,20,0,fade);
}
const stageDrawers={14:stage14,6:stage6,8:stage8,16:stage16,17:stage17,22:stage22,26:stage26,34:stage34,fallback:stageDefault};
function draw(e,t,now,submit){
if(e.kind==='windup')return drawWindup(e,t,now,submit);
if(e.effectRole==='stormCloud')return drawCloud(e,t,now,submit);
if(e.effectRole==='igniteExample')return drawIgnite(e,t,now,submit);
if(e.kind==='travel'||e.kind==='transfer')return drawTravel(e,t,now,submit);
if(e.kind==='hit')return drawHits(e,t,now,submit);
if(e.kind!=='stage')return;
(stageDrawers[e.id]||stageDrawers.fallback)(e,t,now,submit);
}
 G.WT_DESCRIPTION10={ids,prepare,draw};
}

function prepareEventStyle0(e){if(e.kind==='hit')e._scale=.5;}
function prepareEventStyle1(e){if(e.kind==='hit'&&artHeading.has(e.id)&&!groundImpact.has(e.id))e._orient=true;}
function prepareEventStyle2(e){if(e.kind==='windup'){e._points=[e.id===34?point(e.targetCells[0]):e._source];e._scale=e.id===34?1:.5;}}
function prepareEventStyle3(e){if(e.kind==='mobility'||e.kind==='travel'||e.kind==='transfer'){e._moving=true;e._orient=true;}}
function prepareEventStyle4(e){if(radial.has(e.id)||e.kind==='stage'&&groundImpact.has(e.id))e._orient=false;}
function prepareEventStyle5(e){if(e._moving&&e.travelPath?.length>1){e._segments=[];let lastAngle=e._angle;
    for(let i=1;i<e.travelPath.length;i++){const a=e.travelPath[i-1],b=e.travelPath[i],dx=(b.gx-a.gx)*48,dy=(b.gy-a.gy)*48;
     if(dx||dy)lastAngle=Math.atan2(dy,dx);
     e._segments.push({x:a.gx*48+24,y:a.gy*48+24,dx,dy,start:a.offsetMs,end:b.offsetMs,span:Math.max(1,b.offsetMs-a.offsetMs),angle:lastAngle});
    }
   }}
function prepareEventStyle6(e){if(G.WT_DESCRIPTION10?.ids.has(e.id))G.WT_DESCRIPTION10.prepare(e,this.effects);
   else if(G.WT_REMAKE15?.ids.has(e.id))G.WT_REMAKE15.prepare(e,this.effects);}
const preparation={p0(e) {

    const sheet=G.WT_ATLAS.skills[52],offset=e.causalityPhase==='wave'?4:0;e._causalityParts=sheet.frames.slice(offset,offset+4).map((frame,i)=>({frame,x:(i%2)*64-32,y:Math.floor(i/2)*64-32}));

},
p1(e) {

    const sheet=G.WT_ATLAS.skills[51];e._assassinParts={};for(const role of ['smoke','dagger','slash','poison','bleed']){const c=sheet.assassination[role],f=sheet.frames[c.frame];e._assassinParts[role]={x:f.x+c.x,y:f.y+c.y,w:c.w,h:c.h};}
    e._assassinAngle=facingAngles[e.facingDirection]??0;e._assassinBlink=e.blinkCell?point(e.blinkCell):null;e._assassinLanding=e.landingCell?point(e.landingCell):null;

},
p2(e) {

    const sheet=G.WT_ATLAS.skills[50],art=sheet.rippleJudgment;e._judgmentFrames={};for(const role of ['censer','chain','bolt','core']){const c=art[role],f=sheet.frames[c.frame];e._judgmentFrames[role]={x:f.x+c.x,y:f.y+c.y,w:c.w,h:c.h};}e._judgmentPose={};e._judgmentChainSlice={...e._judgmentFrames.chain};e._judgmentBoltSlice={...e._judgmentFrames.bolt};e._judgmentCells=e.footprint.cells;

},
p3(e) {

    const sheet=G.WT_ATLAS.skills[49],c=sheet.holyMist[e.holyMistPhase==='censer'?'censer':'debuff'],f=sheet.frames[c.frame];e._holyCrop={x:f.x+c.x,y:f.y+c.y,w:c.w,h:c.h};
    if(e.holyMistPhase==='censer'){const a=sheet.holyMist.chain,b=sheet.frames[a.frame];e._holyChain={x:b.x+a.x,y:b.y+a.y,w:a.w,h:a.h};}

},
p4(e) {

    e._emptyHeading=Math.round(e._angle/(Math.PI/32))*(Math.PI/32);
    if(e.emptyFlaskPhase==='shard'||e.emptyFlaskPhase==='contact'){
     const dx=e._target[0]-e._source[0],dy=e._target[1]-e._source[1],index=Number.isInteger(e.projectileIndex)?Math.max(0,e.projectileIndex):0;
     // Cache the same path for flight and contact; never change hit deadlines.
     const height=Math.min(68,26+Math.hypot(dx,dy)*.24+(index%3)*6,Math.max(6,Math.min(e._source[1],e._target[1])-12));
     e._emptyArc={dx,dy,height,landingAngle:Math.round(Math.atan2(dy+4*height,dx)/(Math.PI/32))*(Math.PI/32)};
    }

},
p5(e) {

    e._supercooledCenter=point(e.landingCell||e.targetCells[0]);
    e._supercooledParts=G.WT_ATLAS.skills[47].frames.slice(1).map((f,i)=>({x:i%2*64-32,y:Math.floor(i/2)*64-32,frame:f}));

},
p6(e) {

    e._gravityCenter=point(e.footprint?.center||e.targetCells[0]);e._angle=0;
    if(e.kind==='stage'){
     e.renderLayer='ground';e._gravityOriginalDuration=e.duration;
     // Bridge the original 80 ms visual gap while preserving caller damage events.
     if(e.stageIndex===0)e.duration=Math.max(e.duration,320);
    }

},
p7(e) {

    // One immutable impact pivot for every phase. Caster heading never rotates it.
    e._bloodCenter=point(e.footprint?.center||e.targetCells[0]);e._angle=0;
    const sheet=G.WT_ATLAS.skills[16],f=sheet.frames[0],c=sheet.bloodBurst.core;
    e._bloodCore={x:f.x+c.x,y:f.y+c.y,w:c.w,h:c.h};

},
p8(e) {

    if(e.kind==='stage'){const cone=e.footprint?.cone,reach=cone?.length??(e.stageIndex+1.5);e.renderLayer='ground';e._triOriginalDuration=e.duration;e.duration=Math.max(340,e.duration);e._triReach=reach*48;e._triScale=clamp(Math.round(reach-.5),1,4);e._angle=cone?Math.atan2(cone.dy,cone.dx):e._angle;e._triCos=Math.cos(e._angle);e._triSin=Math.sin(e._angle);const sheet=G.WT_ATLAS.skills[31],f=(sheet.variants[e.element]||sheet.frames)[0],c=sheet.quiet.crop;e._triFrame={x:f.x+c.x,y:f.y+c.y,w:c.w,h:c.h};}

},
p9(e,s) {

    const cone=e.dragonBreathCone||G.WT_DRAGON_BREATH?.cone(e.sourceCell,e.targetCells.at(-1),{range:s.grid.range});e._breathParts=[];
    if(e.kind==='stage'&&cone?.cells?.length){const sheet=G.WT_ATLAS.skills[41],art=sheet.dragonBreath;e.dragonBreathCone=cone;e._angle=cone.direction.angle;e._breathScale=art.scale*(cone.range+.5)/3.5;e._breathOrigin=point(cone.sourceCell);e._breathAnchor=art.anchor;
     for(const i of art.tiles)e._breathParts.push({left:i%2*64,top:Math.floor(i/2)*64,frame:{...sheet.frames[i],w:64,h:64}});
    }

},
p10(e) {
    const ray=e.focusBeamRay;
    e._beamParts=[];
    if(e.kind==='stage'&&ray?.cells?.length){
     const a=point(ray.sourceCell),b=point(ray.endCell),angle=ray.direction.angle,ux=Math.cos(angle),uy=Math.sin(angle),sheet=G.WT_ATLAS.skills[40],parts=sheet.focusBeam,scale=parts.scale;
     e._angle=angle;e.focusBeamRay=ray;
     // Crop and cache a continuous strip at emission; never stretch pixel width.
     const start=14,total=Math.max(24,Math.round((Math.hypot(b[0]-a[0],b[1]-a[1])+22-start)/scale)*scale),end=start+total;
     let pos=start;const add=(role,width)=>{const p=parts[role],f=sheet.frames[p.frame],w=Math.max(1,Math.min(p.w,width??p.w));e._beamParts.push({x:a[0]+ux*(pos+w*scale/2),y:a[1]+uy*(pos+w*scale/2),frame:{x:f.x+p.x,y:f.y+p.y,w,h:p.h}});pos+=w*scale-1;};
     if(parts){add('source');const tipWidth=parts.tip.w*scale;while(end-pos>tipWidth+1&&e._beamParts.length<10)add('body',Math.min(parts.body.w,Math.ceil((end-pos-tipWidth)/scale)));pos=end-tipWidth;add('tip');}
    }

},
p11(e,s) {

    // Preserve the incoming damage/preview events. Only these renderer caches
    // change: one quiet ground wave/field and no copied windup or hit explosions.
    const center=e.footprint?.center||e.targetCells[0];e._quietCenter=point(center);
    if(e.kind==='stage')e.renderLayer='ground';
    if(e.id===10&&e.kind==='stage'){
     e._frostWaveDuration=e.duration;e.duration=Math.max(420,e.duration);
     // Only the visual tail is extended. Source hit events and wave timing stay intact.
     e._frostReach=Math.max(0,((e.footprint?.radius??2)+.5)*48-16);
    }
    if(e.id===29){const pattern=s.skill.combatPattern;e._quietInterval=pattern.intervalMs;e._quietFieldStart=e.at-e.stageIndex*pattern.intervalMs;e._quietFieldDuration=pattern.hits*pattern.intervalMs;}

},
p12(e) {

    // Snapshot the caster heading once; all victims share the same swing orientation.
    const primary=point(e.targetCells[0]);
    e._angle=finite(facingAngles[e.facingDirection])?facingAngles[e.facingDirection]:finite(e.facingAngle)?e.facingAngle:Math.atan2(primary[1]-e._source[1],primary[0]-e._source[0]);
    e._points=[...new Map(e.targetCells.map(c=>[c.gx+','+c.gy,c])).values()].map(point);
    // Synchronous confirmed hits add victims to the cast, never extra repeat slashes.
    if(e.kind!=='hit')return;
    {
     const stage=this.effects.find(v=>v!==e&&v.id===e.id&&v.kind==='stage'&&v.at===e.at&&v.stageIndex===e.stageIndex&&v.channelId===e.channelId&&v.sourceCell.gx===e.sourceCell.gx&&v.sourceCell.gy===e.sourceCell.gy);
     if(!stage)return;for(const p of e._points)if(!stage._points.some(q=>q[0]===p[0]&&q[1]===p[1]))stage._points.push(p);
    }

},
p13(e) {

    // Overlapping spears share a cell draw; every damage target remains in the combat batch.
    const unique=new Map(e.targetCells.map(c=>[c.gx+','+c.gy,c]));e._points=[...unique.values()].map(point);

},
p14(e) {

    e._mixtureHitPoints=[...new Map((e.hitCells||[]).filter(c=>Number.isInteger(c.gx)&&Number.isInteger(c.gy)&&c.gx>=0&&c.gx<9&&c.gy>=0&&c.gy<8).map(c=>[c.gx+','+c.gy,c])).values()].map(point);
    const first=G.WT_ATLAS.skills[46]?.frames[1];e._mixtureContactFrame=first?{x:first.x+16,y:first.y+16,w:32,h:32}:null;

},
p15(e) {

    // Each confirmed field pulse has six cosmetic hail falls inside its supplied footprint.
    // Positions and timing are deterministic and allocated once when the pulse arrives.
    const seen=new Set(),cells=[];for(const c of e.footprint?.cells?.length?e.footprint.cells:e.targetCells){const k=c.gx+','+c.gy;if(!seen.has(k)&&finite(c.gx)&&finite(c.gy)){seen.add(k);cells.push(c);}}
    let seed=(Math.floor(e.at)*31+(e.stageIndex+1)*977+e._target[0]*17+e._target[1])>>>0;
    const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=cells.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
    const life=Math.min(210,e.duration*.72),fall=life*.62,n=Math.min(6,cells.length);e._rain=[];
    for(let i=0;i<n;i++){const c=cells[i],p=point(c);e._rain.push({gx:c.gx,gy:c.gy,x:p[0]+Math.floor(rand()*13)-6,y:p[1]+Math.floor(rand()*13)-6,start:i/Math.max(1,n-1)*(e.duration-life),life,fall,height:68+Math.floor(rand()*17)});}

},
p16(e) {

    const c=e.footprint?.center||e.targetCells[0];e._points=[point(c)];e._scale=clamp(Math.round(((e.footprint?.radius??0)*2+1)*48/48),1,5);

},
p17(e) {

    e._points=[[Math.round((e._source[0]+e._target[0])/2),Math.round((e._source[1]+e._target[1])/2)]];e._orient=true;

},
p18(e) {

    const a=e._source,b=e._target,reach=e.footprint?.cone?.length||1,an=Math.atan2(b[1]-a[1],b[0]-a[0]);e._points=[[a[0]+Math.cos(an)*reach*30,a[1]+Math.sin(an)*reach*30]];e._scale=clamp(Math.round(reach),1,3);e._orient=true;

},
p19(e) {

    const a=e._source,b=e._target,n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/40));
    for(let i=0;i<n;i++)e._points.push([a[0]+(b[0]-a[0])*(i+.5)/n,a[1]+(b[1]-a[1])*(i+.5)/n]);e._orient=true;

},
p20(e,s) {

    const keys=new Set();for(const c of e.footprint.cells){const key=c.gx+','+c.gy;if(keys.has(key)||!finite(c.gx)||!finite(c.gy))continue;keys.add(key);e._points.push(point(c));}e._orient=['line','cone','fan','arc'].includes(s.grid.kind);

},
p21(e) {
e._points=[point(e.targetCells[0])];
}};
const prepareRoutes=[{matches:(e)=>e.id===53,run:preparation.p0},
{matches:(e)=>e.id===52,run:preparation.p1},
{matches:(e)=>e.id===51,run:preparation.p2},
{matches:(e)=>e.id===50,run:preparation.p3},
{matches:(e)=>e.id===49,run:preparation.p4},
{matches:(e)=>e.id===48,run:preparation.p5},
{matches:(e)=>e.id===28,run:preparation.p6},
{matches:(e)=>e.id===17,run:preparation.p7},
{matches:(e)=>e.id===32,run:preparation.p8},
{matches:(e)=>e.id===42,run:preparation.p9},
{matches:(e)=>e.id===41,run:preparation.p10},
{matches:(e)=>e.id===10||e.id===29,run:preparation.p11},
{matches:(e)=>e.id===1||e.id===2||e.id===6||e.id===8,run:preparation.p12},
{matches:(e)=>e.id===45,run:preparation.p13},
{matches:(e)=>e.id===47,run:preparation.p14},
{matches:(e)=>e.kind==='stage'&&e.id===35,run:preparation.p15},
{matches:(e)=>e.kind==='stage'&&broad.has(e.id),run:preparation.p16},
{matches:(e,s)=>e.kind==='stage'&&['melee','arc'].includes(s.grid.kind),run:preparation.p17},
{matches:(e)=>e.kind==='stage'&&e.id===32,run:preparation.p18},
{matches:(e,s)=>e.kind==='stage'&&s.grid.kind==='chain',run:preparation.p19},
{matches:(e)=>e.kind==='stage'&&e.footprint?.cells?.length,run:preparation.p20},
{matches:()=>true,run:preparation.p21}];
function prepareEvent(e,s){
return prepareRoutes.find(row=>row.matches(e,s)).run.call(this,e,s);
}
function gemDraw2Part0(e,t,now,submit){
const art=G.WT_ATLAS.skills[50].rippleJudgment;
const parts=e._judgmentFrames;
const age=now-e.at;

      const p=judgmentPose(e.sourceCell,e.landingCell,e.judgmentDirection,age/e.impactOffsetMs,e._judgmentPose),x=p.x-art.bottomAnchor.x,y=p.y-art.bottomAnchor.y,ax=x+art.chainAnchor.x,ay=y+art.chainAnchor.y,dx=ax-p.hx,dy=ay-p.hy,length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx),co=Math.cos(angle),si=Math.sin(angle),w=parts.chain.w,fade=Math.min(1,age/55,Math.max(0,(e.duration-age)/e.holdMs));
      // Crop only the last link segment. Every segment shares this atlas and never stretches pixels.
      for(let offset=0;offset<length;offset+=w){const width=Math.min(w,Math.ceil(length-offset));e._judgmentChainSlice.w=width;submit(e,p.hx+co*(offset+width/2),p.hy+si*(offset+width/2),1,0,angle,e._judgmentChainSlice,1,fade*.85);}
      submit(e,x,y,1,0,0,parts.censer,1,fade);

}
function gemDraw2Part1(e,t,now,submit){
const art=G.WT_ATLAS.skills[50].rippleJudgment;
const parts=e._judgmentFrames;
const age=now-e.at;
const sky=art.skyStrike;
const lead=e.impactOffsetMs*sky.leadRatio;
const fall=e.judgmentPhase==='censer'?(age-(e.impactOffsetMs-lead))/lead:1;

      const cross=e.judgmentPhase==='cross',progress=clamp(fall,0,1),scale=sky.scale,tip=art.boltTip,crop=e._judgmentBoltSlice;
      crop.h=Math.min(parts.bolt.h,Math.max(1,Math.floor((tip.y+16)*progress)+1));
      const alpha=sky.maxAlpha*(cross?Math.min(1,(e.duration-age)/(e.duration*.72)):Math.min(1,progress*3));
      for(const c of e._judgmentCells){const x=c.gx*48+24,y=c.gy*48+24;submit(e,x-tip.x*scale,y-tip.y*scale+(crop.h-parts.bolt.h)*scale/2,scale,0,0,crop,1,Math.max(0,alpha));
       if(cross){const glow=.45*Math.min(1,age/65,(e.duration-age)/220);submit(e,x,y,1,0,0,parts.core,1,Math.max(0,glow));}}

}
function gemDraw3Part2(e,t,now,submit){
const sheet=G.WT_ATLAS.skills[49];

      const c=e.holySource,age=now-e.at,u=t*t*(3-2*t),angle=Math.round((-Math.PI*.8+Math.PI*2.15*u)/(Math.PI/32))*(Math.PI/32),co=Math.cos(angle),si=Math.sin(angle),p=sheet.holyMist.censer.pivot,scale=2;
      const handX=c.gx*48+30,handY=c.gy*48+16,swing=sheet.holyMist.swing,alpha=Math.min(1,age/65,(e.duration-age)/110);
      const bowlDistance=swing.extension+52;submit(e,handX-si*bowlDistance,handY+co*bowlDistance,.65,0,0,sheet.frames[1],1,.28*alpha);
      for(let i=0;i<swing.links;i++){const distance=(i+.5)*swing.step;submit(e,handX-si*distance,handY+co*distance,scale,0,angle,e._holyChain,1,alpha);}
      submit(e,handX-(p.x*co-p.y*si)*scale-si*swing.extension,handY-(p.x*si+p.y*co)*scale+co*swing.extension,scale,0,angle,e._holyCrop,1,alpha);

}
function gemDraw3Part3(e,t,now,submit){
const sheet=G.WT_ATLAS.skills[49];

      const c=e.holySource,age=now-e.at,alpha=.64*Math.min(1,age/140,(e.duration-age)/310);submit(e,c.gx*48+24,c.gy*48+24,2,0,0,sheet.frames[1],1,Math.max(0,alpha));

}
function gemDraw3Part4(e,t,now,submit){


      // Drawing is deduplicated per occupied cell; damage/debuff records retain every enemy ID.
      const targets=e.holyTargets;for(let i=0;i<targets.length;i++){const c=targets[i];if(now<c.appliedAt||now>=c.expiresAt)continue;let duplicate=false;for(let j=0;j<i;j++)if(targets[j].gx===c.gx&&targets[j].gy===c.gy&&now<targets[j].expiresAt){duplicate=true;break;}if(duplicate)continue;
       const alpha=.9*Math.min(1,(now-c.appliedAt)/140,(c.expiresAt-now)/200);submit(e,c.gx*48+24,c.gy*48+4,1,0,0,e._holyCrop,1,Math.max(0,alpha));
      }

}
function gemDraw4Part5(e,t,now,submit){
const sheet=G.WT_ATLAS.skills[48];

      const dx=e._target[0]-e._source[0],dy=e._target[1]-e._source[1],x=e._source[0]+dx*t,ground=e._source[1]+dy*t,height=Math.min(80,40+Math.hypot(dx,dy)*.14,Math.max(0,Math.min(e._source[1],e._target[1])-20)),y=ground-12*(1-t)-4*height*t*(1-t),turn=Math.round((dx<0?-1:1)*Math.PI*2*t/(Math.PI/16))*(Math.PI/16),co=Math.cos(turn),si=Math.sin(turn),a=sheet.bottleAnchor;
      submit(e,x-(a.x*co-a.y*si),y-(a.x*si+a.y*co),1,0,turn,sheet.frames[0]);

}
function gemDraw4Part6(e,t,now,submit){
const sheet=G.WT_ATLAS.skills[48];
const phase=e.emptyFlaskPhase;

      const arc=e._emptyArc,u=phase==='shard'?t:1,vy=arc.dy-4*arc.height*(1-2*u),angle=phase==='contact'||Math.abs(arc.dx)+Math.abs(vy)<.0001?arc.landingAngle:Math.round(Math.atan2(vy,arc.dx)/(Math.PI/32))*(Math.PI/32),co=Math.cos(angle),si=Math.sin(angle),a=sheet.shardTip;
      const x=e._source[0]+arc.dx*u,y=e._source[1]+arc.dy*u-4*arc.height*u*(1-u);
      // Tip follows the ballistic curve; contact retains the arriving direction.
      submit(e,x-(a.x*co-a.y*si),y-(a.x*si+a.y*co),1,0,angle,sheet.frames[1],1,phase==='contact'?(1-t)*.9:1);

}
function gemDraw4Part7(e,t,now,submit){
const sheet=G.WT_ATLAS.skills[48];

      const scale=Math.round((.75+t*.5)*16)/16;submit(e,e._target[0],e._target[1],scale,0,0,sheet.frames[2],1,.85*Math.min(1,(1-t)/.65));

}
function gemDraw13Part8(e,t,now,submit){
const c=e.timeCenter;
const x=c.gx*48+24;
const y=c.gy*48+24;
const age=now-e.at;
const sheet=G.WT_ATLAS.skills[45];
const fade=Math.min(1,age/180,Math.max(0,(5200-age)/200));
const tick=age>=1000&&age<=5180?Math.floor(Math.min(age,5000)/1000)*1000:-1000;
const pulse=Math.max(0,1-(age-tick)/180);
for(let i=0;i<9;i++)submit(e,x+(sheet.ringOffset?.x||0)+(i%3-1)*128,y+(sheet.ringOffset?.y||0)+(Math.floor(i/3)-1)*128,2,0,0,sheet.frames[i],1,fade*(.62+.38*pulse));
}
function gemDraw13Part9(e,t,now,submit){
const c=e.timeCenter;
const x=c.gx*48+24;
const y=c.gy*48+24;
const age=now-e.at;
const sec=age/1000;
const sheet=G.WT_ATLAS.skills[45];
const fade=Math.min(1,age/180,Math.max(0,(5200-age)/200));
for(let h=0;h<2;h++){const scale=h===0?2:1,angle=Math.round((sec*.7+sec*sec*.28)*(h===0?1:.29)*32)/32,co=Math.cos(angle),si=Math.sin(angle),p=sheet.handPivot;
      submit(e,x-(p.x*co-p.y*si)*scale,y-(p.x*si+p.y*co)*scale,scale,0,angle,sheet.frames[9+h],1,fade*.88);
     }
}
function gemDraw13Part10(e,t,now,submit){
const sheet=G.WT_ATLAS.skills[45];
for(const batch of e.timeTickTargets||[]){const dt=now-batch.at;if(dt<0||dt>=180)continue;for(const p of batch.cells)submit(e,p.gx*48+24,p.gy*48+24,2,0,0,sheet.frames[11],1,1-dt/180);}
}
function gemDraw14Part11(e,t,now,submit){
const sheet=G.WT_ATLAS.skills[46];

      const dx=e._target[0]-e._source[0],dy=e._target[1]-e._source[1],x=e._source[0]+dx*t,ground=e._source[1]+dy*t;
      const height=Math.min(88,42+Math.hypot(dx,dy)*.16,Math.max(0,Math.min(e._source[1],e._target[1])-20)),y=ground-12*(1-t)-4*height*t*(1-t);
      const turn=Math.round((dx<0?-1:1)*Math.PI*2*t/(Math.PI/16))*(Math.PI/16),co=Math.cos(turn),si=Math.sin(turn),anchor=sheet.bottleAnchor||{x:0,y:12};
      // Rotate around the bottle's physical bottom so that its final contact point
      // converges to the locked landing cell, regardless of the throwing direction.
      submit(e,x-(anchor.x*co-anchor.y*si),y-(anchor.x*si+anchor.y*co),1,0,turn,sheet.frames[0]);

}
function gemDraw14Part12(e,t,now,submit){
const sheet=G.WT_ATLAS.skills[46];

      const frame=Math.min(8,Math.floor(t*9)),anchor=sheet.blastAnchors?.[frame]||{x:0,y:0},scale=2;
      submit(e,e._target[0]-anchor.x*scale,e._target[1]-anchor.y*scale,scale,0,0,sheet.frames[frame+1],1,Math.min(1,(1-t)/.24));
      if(now-e.at<100&&e._mixtureContactFrame)for(const p of e._mixtureHitPoints)submit(e,p[0],p[1],1,0,0,e._mixtureContactFrame,1,1-(now-e.at)/100);

}
const drawing={d0(e,t,now,submit) {

     if(now>=(e.assassinationCancelledAt??Infinity))return;
     const age=now-e.at,p=e._assassinParts,an=e._assassinAngle,co=Math.cos(an),si=Math.sin(an);
     if(e.assassinationPhase==='vanish'||e.assassinationPhase==='arrive'){
      const c=e._assassinBlink,alpha=.68*Math.min(1,age/60,(e.duration-age)/110);submit(e,c[0],c[1]-Math.min(8,age/25),1,0,0,p.smoke,1,Math.max(0,alpha));
     }else if(e.assassinationPhase==='dagger'){
      const c=e._assassinLanding,swing=clamp(age/Math.max(1,e.duration-60),0,1),cross=-13+26*swing;
      submit(e,c[0]+co*31-si*cross,c[1]+si*31+co*cross,1,0,an-3*Math.PI/4+(-.55+1.1*swing),p.dagger,1,.95*Math.min(1,age/30,(e.duration-age)/60));
     }else if(e.assassinationPhase==='slash'){
      const c=e._target,cross=-7+14*t;submit(e,c[0]-si*cross,c[1]+co*cross,1,0,an+Math.PI/2,p.slash,1,.92*Math.min(1,age/25,(e.duration-age)/100));
     }else if(e.assassinationPhase==='confirmation'){
      submit(e,e._target[0]+(e.ailmentType==='poison'?-8:8),e._target[1]-24,1,0,0,p[e.ailmentType],1,.9*Math.min(1,age/60,(e.duration-age)/160));
     }

},
d1(e,t,now,submit) {

     const age=now-e.at,art=G.WT_ATLAS.skills[52].causality,wave=e.causalityPhase==='wave',ease=1-(1-t)*(1-t),scale=wave?Math.round((.3+(art.waveScale-.3)*ease)*64)/64:3,alpha=wave?.5*Math.min(1,age/75,(e.duration-age)/210):.56*Math.min(1,age/100,(e.duration-age)/420);
     for(const part of e._causalityParts)submit(e,e._source[0]+part.x*scale,e._source[1]+part.y*scale,scale,0,0,part.frame,1,Math.max(0,alpha));

},
d2(e,t,now,submit) {
const art=G.WT_ATLAS.skills[50].rippleJudgment;
const age=now-e.at;
const sky=art.skyStrike;
const lead=e.impactOffsetMs*sky.leadRatio;
const fall=e.judgmentPhase==='censer'?(age-(e.impactOffsetMs-lead))/lead:1;
if(now>=(e.judgmentCancelledAt??Infinity))return;
if(e.judgmentPhase==='censer'){gemDraw2Part0(e,t,now,submit);}
if(e.judgmentPhase==='censer'&&fall>0&&fall<1||e.judgmentPhase==='cross'){gemDraw2Part1(e,t,now,submit);}
},
d3(e,t,now,submit) {
const phase=e.holyMistPhase;
if(now>=(e.holyMistCancelledAt??Infinity))return;
if(phase==='censer'){gemDraw3Part2(e,t,now,submit);}else if(phase==='mist'){gemDraw3Part3(e,t,now,submit);}else if(phase==='debuff'){gemDraw3Part4(e,t,now,submit);}
},
d4(e,t,now,submit) {
const phase=e.emptyFlaskPhase;
if(now>=(e.emptyFlaskCancelledAt??Infinity))return;
if(phase==='flask'){gemDraw4Part5(e,t,now,submit);}else if(phase==='shard'||phase==='contact'){gemDraw4Part6(e,t,now,submit);}else if(phase==='shatter'){gemDraw4Part7(e,t,now,submit);}
},
d5(e,t,now,submit) {

     if(now>=(e.supercooledCancelledAt??Infinity))return;
     const sheet=G.WT_ATLAS.skills[47];
     if(e.supercooledPhase==='flight'){
      const dx=e._target[0]-e._source[0],dy=e._target[1]-e._source[1],x=e._source[0]+dx*t,ground=e._source[1]+dy*t;
      const height=Math.min(88,42+Math.hypot(dx,dy)*.16,Math.max(0,Math.min(e._source[1],e._target[1])-20)),y=ground-12*(1-t)-4*height*t*(1-t);
      const turn=Math.round((dx<0?-1:1)*Math.PI*2*t/(Math.PI/16))*(Math.PI/16),co=Math.cos(turn),si=Math.sin(turn),anchor=sheet.bottleAnchor;
      submit(e,x-(anchor.x*co-anchor.y*si),y-(anchor.x*si+anchor.y*co),1,0,turn,sheet.frames[0]);
     }else if(e.supercooledPhase==='wave'){
      const age=now-e.at,interval=e.ringInterval,phase=Math.min(2,Math.floor(age/interval)),u=clamp((age-phase*interval-interval*.38)/(interval*.62),0,1),radius=phase+1+(phase<2?u*u*(3-2*u):0);
      // Quantized scale keeps 64px tile edges and centres on integer pixels.
      const scale=Math.round(radius*48/sheet.supercooledMixture.nativeRadius*32)/32,alpha=.52*Math.min(1,age/(interval*.3),Math.max(0,(e.duration-age)/(interval*.7))),center=e._supercooledCenter;
      for(const p of e._supercooledParts)submit(e,center[0]+p.x*scale,center[1]+p.y*scale,scale,0,0,p.frame,1,alpha);
     }

},
d6(e,t,now,submit) {

     if(e.kind!=='stage')return;
     const age=now-e.at,sheet=G.WT_ATLAS.skills[27],art=sheet.gravityCollapse,
      f=e.stageIndex===0?Math.min(4,Math.floor(age/64)):5+Math.min(3,Math.floor(t*4)),
      alpha=.82*(e.stageIndex===0?Math.min(1,age/85):Math.min(1,(e.duration-age)/150));
     submit(e,e._gravityCenter[0]-art.anchor.x*3,e._gravityCenter[1]-art.anchor.y*3,3,f,0,null,1,alpha);

},
d7(e,t,now,submit) {

     if(e.kind!=='stage')return;
     const age=now-e.at,center=e._bloodCenter;
     if(e.stageIndex===0)submit(e,center[0],center[1],1,0,0,e._bloodCore,1,.45+.4*t);
     else submit(e,center[0],center[1],2,1+Math.min(7,Math.floor(t*8)),0,null,1,.88*Math.min(1,(e.duration-age)/65));

},
d8(e,t,now,submit) {

     if(e.kind!=='stage')return;
     const age=now-e.at,progress=clamp(age/180,0,1),reach=e._triReach-12-(1-progress)*32,alpha=.62*Math.min(1,age/90,Math.max(0,(e.duration-age)/160)),sheet=G.WT_ATLAS.skills[31],scale=e._triScale,an=e._angle-Math.PI,co=-e._triCos,si=-e._triSin,a=sheet.quiet.anchor;
     submit(e,e._source[0]+e._triCos*reach-(a.x*co-a.y*si)*scale,e._source[1]+e._triSin*reach-(a.x*si+a.y*co)*scale,scale,0,an,e._triFrame,1,alpha);

},
d9(e,t,now,submit) {

     if(e.kind!=='stage'||now>=(e.dragonBreathCancelledAt??Infinity))return;
     const age=now-e.at,alpha=.84*Math.min(1,age/120,Math.max(0,(e.duration-age)/180)),scale=e._breathScale,co=Math.cos(e._angle),si=Math.sin(e._angle),reveal=Math.max(1,Math.ceil(84*Math.min(1,age/180)));
     for(const part of e._breathParts){const w=Math.min(64,reveal-part.left);if(w<=0)continue;const localX=(part.left+w/2-e._breathAnchor.x)*scale,localY=(part.top+32-e._breathAnchor.y)*scale;
      part.frame.w=w;submit(e,e._breathOrigin[0]+localX*co-localY*si,e._breathOrigin[1]+localX*si+localY*co,scale,0,e._angle,part.frame,1,alpha);
     }

},
d10(e,t,now,submit) {

     if(e.kind!=='stage'||now>=(e.focusBeamCancelledAt??Infinity))return;
     const age=now-e.at,alpha=.92*Math.min(1,age/120,Math.max(0,(e.duration-age)/160));
     for(const part of e._beamParts)submit(e,part.x,part.y,2,0,e._angle,part.frame,1,alpha);

},
d11(e,t,now,submit) {

     if(e.kind!=='stage')return;
     const age=now-e.at,sheet=G.WT_ATLAS.skills[9],msPerCell=WT_CATALOG[9].skill.combatPattern.waveMsPerCell,
      radius=Math.min(e._frostReach,age/msPerCell*48),cx=e._quietCenter[0],cy=e._quietCenter[1];
     // The stationary crown fractures once; eight large facets carry the burst outward.
     if(age<230){const pose=Math.min(4,Math.floor(Math.max(0,age-35)/35)),alpha=.9*Math.min(1,age/40,Math.max(0,(230-age)/100));submit(e,cx,cy,1,0,0,sheet.frames[pose],1,alpha);}
     if(age>=45){const alpha=.88*Math.min(1,(age-45)/40,Math.max(0,(e.duration-age)/190));
      for(const d of frostDirections)submit(e,cx+d.x*radius,cy+d.y*radius,1,0,d.angle,sheet.frames[5],1,alpha);
     }

},
d12(e,t,now,submit) {

     if(e.kind!=='stage')return;
     const age=now-e._quietFieldStart,duration=e._quietFieldDuration,sheet=G.WT_ATLAS.skills[28],
      alpha=.72*Math.min(1,Math.max(0,age/120),Math.max(0,(duration-age)/180)),step=Math.PI/90,
      angle=Math.round(clamp(age/duration,0,1)*(Math.PI/6)/step)*step,anchor=sheet.quiet?.anchor,co=Math.cos(angle),si=Math.sin(angle),ax=anchor?.x||0,ay=anchor?.y||0;
     if(alpha>0)submit(e,e._quietCenter[0]-(ax*co-ay*si)*2,e._quietCenter[1]-(ax*si+ay*co)*2,2,0,angle,sheet.frames[0],1,alpha);

},
d13(e,t,now,submit) {
const c=e.timeCenter;
if(e.timePhase!=='clock'||e.timeSourceValid===false||now>=(e.timeCancelledAt??Infinity))return;
if(!c)return;
gemDraw13Part8(e,t,now,submit);
gemDraw13Part9(e,t,now,submit);
gemDraw13Part10(e,t,now,submit);
},
d14(e,t,now,submit) {

if(now>=(e.mixtureCancelledAt??Infinity))return;
if(e.mixturePhase==='flight'){gemDraw14Part11(e,t,now,submit);}else if(e.mixturePhase==='burst'){gemDraw14Part12(e,t,now,submit);}
},
d15(e,t,now,submit) {

     G.WT_DESCRIPTION10.draw(e,t,now,submit);

},
d16(e,t,now,submit) {

     G.WT_REMAKE15.draw(e,t,now,submit);

},
d17(e,t,now,submit) {

     // A short vertical blow at the victim. The later damage stage is a contact
     // aftershock only; it does not summon or drop a second object.
     if(e.kind!=='stage')return;
     const sheet=G.WT_ATLAS.skills[1],smash=sheet.smash;
     for(const c of e._points){
      if(e.stageIndex===0&&t<.34){
       const p=t/.34,scaleX=smash.strokeScaleX,scaleY=smash.strokeScaleY;
       submit(e,c[0]-smash.strokeAnchor.x*scaleX,c[1]-22+26*p*p-smash.strokeAnchor.y*scaleY,scaleX,0,0,sheet.frames[0],scaleY/scaleX);
      }else{
       const p=e.stageIndex===0?(t-.34)/.66:t,strength=e.stageIndex===0?1:.8,scaleX=smash.impactScaleX*strength*(.85+.25*p),scaleY=smash.impactScaleY*strength*(1-.4*p);
       submit(e,c[0]-smash.impactAnchor.x*scaleX,c[1]+6-smash.impactAnchor.y*scaleY,scaleX,0,0,sheet.frames[5],scaleY/scaleX,1-p);
      }
     }

},
d18(e,t,now,submit) {

     // Cut through each confirmed victim with one caster-relative direction.
     // These are visual passes only: the existing combat events and hit timestamps stay intact.
     if(e.kind!=='stage')return;
     const cuts=e.id===1?2:1,cut=Math.min(cuts-1,Math.floor(t*cuts)),phase=t*cuts-cut;
     const angle=e._angle+(e.id===8||cut===1?Math.PI/4:Math.PI/2),drift=(phase-.5)*20;
     const fade=phase<.65?1:Math.max(0,(1-phase)/.35),growth=.75+.25*Math.min(1,phase/.2),scale=1.15;
     // The source sprite bows toward local +Y. Mirror it so the convex edge faces
     // away from the caster; move forward through the victim, not along the blade.
     for(const c of e._points)submit(e,c[0]+Math.cos(e._angle)*drift,c[1]+Math.sin(e._angle)*drift,scale*growth,0,angle,null,-1/growth,fade);

},
d19(e,t,now,submit) {

     const sheet=G.WT_ATLAS.skills[44],anchor=sheet.lanceAnchor,scale=sheet.lanceScale;
     // One batch for the whole cast avoids exceeding the event limit on a crowded board.
     for(const c of e._points){
      if(e.lancePhase==='fall'){
       const tip=-18+(c[1]+18)*t*t;
       submit(e,c[0]-anchor.x*scale,tip-anchor.y*scale,scale,0,0,sheet.lanceFrame);
      }else if(e.lancePhase==='land'){
       submit(e,c[0]-anchor.x*scale,c[1]-anchor.y*scale,scale,0,0,sheet.lanceFrame,1,1-t);
      }
     }

},
d20(e,t,now,submit) {

     const sheet=G.WT_ATLAS.skills[43];
     if(e.flaskPhase==='flight'){
      const x=e._source[0]+(e._target[0]-e._source[0])*t,ground=e._source[1]+(e._target[1]-e._source[1])*t;
      const height=Math.min(86,50+Math.hypot(e._target[0]-e._source[0],e._target[1]-e._source[1])*.1,Math.max(0,Math.min(e._source[1],e._target[1])-29));
      const y=ground-12-4*height*t*(1-t),turn=(e._target[0]<e._source[0]?-1:1)*Math.PI*2*t;
      submit(e,x,y,1,0,turn,sheet.flaskFrame);
     }else if(e.flaskPhase==='settle'){
      const squash=Math.sin(Math.PI*t);submit(e,e._target[0],e._target[1]-12*(1-.3*squash),1+.2*squash,0,0,sheet.flaskFrame,(1-.3*squash)/(1+.2*squash));
     }else submit(e,e._target[0],e._target[1]-8,1.5,Math.floor(t*sheet.frames.length),0);

},
d21(e,t,now,submit) {
const shard=G.WT_ATLAS?.skills[34].rainFrame;
     for(const r of e._rain){const age=now-e.at-r.start;if(age<0||age>=r.life)continue;
      if(age<r.fall)submit(e,r.x,r.y-r.height*(1-age/r.fall)-14,.5,0,0,shard);
      else submit(e,r.x,r.y,.5,Math.min(8,Math.floor((age-r.fall)/(r.life-r.fall)*9)),0);
     }

},
d22(e,t,now,submit) {
let rot=e._orient?e._angle-e._artHeading:0;
const frame=Math.floor(t*9);
let x=e._source[0]+(e._target[0]-e._source[0])*t,y=e._source[1]+(e._target[1]-e._source[1])*t;
     if(e._segments?.length){const age=now-e.at;let i=0;while(i<e._segments.length-1&&e._segments[i].end<=age)i++;const a=e._segments[i],p=clamp((age-a.start)/a.span,0,1);x=a.x+a.dx*p;y=a.y+a.dy*p;if(e._orient)rot=a.angle-e._artHeading;}
     if(e.id===38)y-=Math.sin(Math.PI*t)*62;
     if(e.kind==='mobility'&&e.id===40){submit(e,...e._source,1,frame,0);submit(e,...e._target,1,frame,0);}else submit(e,x,y,1,frame,rot);

},
d23(e,t,now,submit) {
let rot=e._orient?e._angle-e._artHeading:0;
const frame=Math.floor(t*9);
for(const p of e._points)submit(e,p[0],p[1],e._scale,frame,rot);
}};
const drawRoutes=[{matches:(e)=>e.id===52,run:drawing.d0},
{matches:(e)=>e.id===53,run:drawing.d1},
{matches:(e)=>e.id===51,run:drawing.d2},
{matches:(e)=>e.id===50,run:drawing.d3},
{matches:(e)=>e.id===49,run:drawing.d4},
{matches:(e)=>e.id===48,run:drawing.d5},
{matches:(e)=>e.id===28,run:drawing.d6},
{matches:(e)=>e.id===17,run:drawing.d7},
{matches:(e)=>e.id===32,run:drawing.d8},
{matches:(e)=>e.id===42,run:drawing.d9},
{matches:(e)=>e.id===41,run:drawing.d10},
{matches:(e)=>e.id===10,run:drawing.d11},
{matches:(e)=>e.id===29,run:drawing.d12},
{matches:(e)=>e.id===46,run:drawing.d13},
{matches:(e)=>e.id===47,run:drawing.d14},
{matches:(e)=>G.WT_DESCRIPTION10?.ids.has(e.id),run:drawing.d15},
{matches:(e)=>G.WT_REMAKE15?.ids.has(e.id),run:drawing.d16},
{matches:(e)=>e.id===2,run:drawing.d17},
{matches:(e)=>e.id===1||e.id===8,run:drawing.d18},
{matches:(e)=>e.id===45,run:drawing.d19},
{matches:(e)=>e.id===44,run:drawing.d20},
{matches:(e)=>e._rain,run:drawing.d21},
{matches:(e)=>e._moving,run:drawing.d22},
{matches:()=>true,run:drawing.d23}];
function drawEvent(e,t,now,submit){
return drawRoutes.find(row=>row.matches(e)).run.call(this,e,t,now,submit);
}
class WorldTreeFX {
constructor(){this.effects=[];this.cancelled=new Map();}
emit(event){const item=G.WT_CATALOG.find(s=>s.name===event.skillName);if(!item)return false;const e=structuredClone({kind:'stage',stageIndex:0,repeatIndex:0,...event,element:event.element||item.skill.ele,id:item.id});this.effects.push(e);return e;}
}
class PixelLabFX extends WorldTreeFX {
emit(event){
   const e=super.emit(event);if(!e)return false;const s=WT_CATALOG[e.id-1];
   e._source=point(e.sourceCell);e._target=point(e.targetCells.at(-1));e._angle=Math.atan2(e._target[1]-e._source[1],e._target[0]-e._source[0]);
   e._points=[];e._scale=1;e._orient=false;
   prepareEvent.call(this,e,s);
   prepareEventStyle0.call(this,e);
   prepareEventStyle1.call(this,e);
   prepareEventStyle2.call(this,e);
   prepareEventStyle3.call(this,e);
   prepareEventStyle4.call(this,e);
   e._artHeading=artHeading.get(e.id)||0;
   // Cache path geometry and headings once per emission, never allocate segments per frame.
   prepareEventStyle5.call(this,e);
   prepareEventStyle6.call(this,e);
   return e;
  }
layout(now,visit){
let used=0;
const submit=(...args)=>{const [e,x,y,scale,frame,rotation,override,stretch=1,alpha=1]=args;const sheet=G.WT_ATLAS.skills[e.id-1],variant=sheet.variants?.[e.element]||sheet.frames,f=override||variant[Math.min(variant.length-1,frame)];if(used>=48)return;visit({x:Math.round(x),y:Math.round(y),scale,angle:rotation,frame:{x:f.x,y:f.y,w:f.w||64,h:f.h||64},scaleY:scale*stretch,alpha,ground:e.renderLayer==='ground'});used++;};
for(const e of this.effects){if(now<e.at||now>=e.at+e.duration)continue;drawEvent(e,clamp((now-e.at)/e.duration,0,.999999),now,submit);}
return used;
}
}
worldTreeNativeFx={create(event){const renderer=new PixelLabFX();renderer.emit(event);return renderer;}};
}
safeExposeGlobals({worldTreeNativeFx});
