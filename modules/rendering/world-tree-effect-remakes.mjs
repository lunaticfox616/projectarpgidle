import { WT_ATLAS } from './world-tree-effect-values.mjs';
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
function paint(...args){const [e,submit,role,x,y,width,height,angle=0,alpha=1,flipY=false,pivot=0]=args;
  const sheet=WT_ATLAS.skills[e.id-1],b=sheet.remake[role],sx=width/b.width,sy=height/b.height*(flipY?-1:1),c=Math.cos(angle),s=Math.sin(angle);
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
const WT_REMAKE15 = {ids,prepare,draw};

export { WT_REMAKE15 };
