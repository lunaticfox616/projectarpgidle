import { WT_ATLAS } from './world-tree-effect-values.mjs';
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
  width=Math.max(1,width);height=Math.max(1,height);const sheet=WT_ATLAS.skills[e.id-1],b=sheet.description[role],sx=width/b.width,sy=height/b.height*(flip?-1:1);
  if(pivot===1&&b.tip)angle-=Math.atan2((b.tip.y-b.tail.y)*sy,(b.tip.x-b.tail.x)*sx);const co=Math.cos(angle),si=Math.sin(angle);
  const frame=b.animation?b.animation[Math.min(b.animation.length-1,Math.floor(clamp(phase)*b.animation.length))]:b.frame;
  const {ax,ay}=poseAnchor(b,frame,pivot,sx,sy);
  submit(e,x-ax*co+ay*si,y-ax*si-ay*co,sx,0,angle,sheet.frames[frame],sy/sx,clamp(alpha));
 }
function follow(e,now,t){const p=e._d.path;p.x=e._source[0]+(e._target[0]-e._source[0])*t;p.y=e._source[1]+(e._target[1]-e._source[1])*t;p.angle=e._angle;const seg=e._segments;if(seg?.length){const age=now-e.at;let i=0;while(i<seg.length-1&&seg[i].end<=age)i++;const a=seg[i],u=clamp((age-a.start)/a.span);p.x=a.x+a.dx*u;p.y=a.y+a.dy*u;p.angle=a.angle;}return p;}
function link(e,submit,role,thickness,alpha=1){const a=e._source,b=e._target;pose(e,submit,role,(a[0]+b[0])/2,(a[1]+b[1])/2,Math.max(4,Math.hypot(b[0]-a[0],b[1]-a[1])),thickness,Math.atan2(b[1]-a[1],b[0]-a[0]),alpha);}
function revealLink(...args){const [e,submit,role,progress,thickness,alpha=1]=args;
  const sheet=WT_ATLAS.skills[e.id-1],b=sheet.description[role],f=sheet.frames[b.frame],a=e._source,z=e._target,dx=z[0]-a[0],dy=z[1]-a[1],length=Math.hypot(dx,dy),columns=Math.floor(b.width*clamp(progress));if(columns<1||length<1)return;
  const sx=length/b.width,sy=thickness/b.height,clip=e._d.clip;clip.x=f.x+Math.round(b.anchor.x+32-(b.width-1)/2);clip.y=f.y+Math.round(b.anchor.y+32-(b.height-1)/2);clip.w=columns;clip.h=b.height;
  const u=columns/b.width/2;submit(e,a[0]+dx*u,a[1]+dy*u,sx,0,Math.atan2(dy,dx),clip,sy/sx,alpha);
 }
function burst(e,submit,p,age){const u=clamp(age/180);pose(e,submit,'burst',p[0],p[1],46,42,0,age<110?1:clamp((180-age)/70),0,false,u);}
function heatMark(e,submit,p,age){const sheet=WT_ATLAS.skills[25],f=sheet.frames[sheet.description.heat.frame],clip=e._d.clip;clip.x=f.x+24;clip.y=f.y+12;clip.w=16;clip.h=34;const sx=(age<90?10:age<180?13:16)/16,sy=(age<90?20:age<180?23:26)/34;submit(e,p[0],p[1],sx,0,0,clip,sy/sx,.62+.3*age/250);}
function stormArcs(e,submit,p,t){const sheet=WT_ATLAS.skills[14],b=sheet.description.vortex,f=sheet.frames[b.frame],clip=e._d.clip,base=.7+e.stageIndex*.14;for(let i=0;i<3;i++){const u=(t-i*.11)/(.68-i*.07);if(u<0||u>=1)continue;const scale=base*[1,.78,1.08][i],h=Math.max(1,Math.floor(b.height*[.17,.13,.2][i])),width=Math.floor(b.width*(i===1?.75:1)),a=i*2.13+e.stageIndex*.4+(i===1?-1:1)*(u*.9),r=(b.height-h)/2*scale+(i===0?-7*Math.sin(Math.PI*u):i===1?12*u:3+6*u);clip.x=f.x+Math.round(b.anchor.x+32-(b.width-1)/2)+(b.width-width>>1);clip.y=f.y+Math.round(b.anchor.y+32-(b.height-1)/2);clip.w=width;clip.h=h;submit(e,p[0]+Math.sin(a)*r,p[1]-Math.cos(a)*r,scale,0,a,clip,1,clamp((1-u)*1.8));}}
function voidGeometry(e){const a=e._source,b=e._target,dx=b[0]-a[0],dy=b[1]-a[1],distance=Math.hypot(dx,dy),angle=Math.atan2(dy,dx),length=Math.max(16,Math.round(distance-8)),cap=Math.min(32,Math.floor(length/2)),parts=[];let offset=0;parts.push({slot:0,sx:0,width:cap,offset});offset+=cap;let middle=length-cap*2;while(middle>0){const source=32+(offset-cap)%64,slot=Math.floor(source/64),sx=source%64,width=Math.min(middle,64-sx,96-source);parts.push({slot,sx,width,offset});offset+=width;middle-=width;}parts.push({slot:1,sx:64-cap,width:cap,offset});e._d.rift={x:a[0]+Math.cos(angle)*16,y:a[1]+Math.sin(angle)*16,co:Math.cos(angle),si:Math.sin(angle),angle,length,parts};}
function voidRift(e,submit,progress,phase=0,closure=0){const g=e._d.rift,clip=e._d.clip,sheet=WT_ATLAS.skills[15],shown=Math.floor(g.length*clamp(progress)),h=closure?Math.max(2,Math.round(32*(1-closure))):64,top=Math.floor((64-h)/2),alpha=closure<.25?1:closure<.5?.75:closure<.75?.5:.25;for(const p of g.parts){const width=Math.min(p.width,shown-p.offset);if(width<=0)continue;const f=sheet.frames[p.slot+phase*2],d=p.offset+width/2;clip.x=f.x+p.sx;clip.y=f.y+top;clip.w=width;clip.h=h;submit(e,g.x+g.co*d,g.y+g.si*d,1,0,g.angle,clip,1,alpha);}}
function drawWindup(e,t,now,submit){
const d=e._d,id=e.id,c=d.center,age=now-e.at;

   if(id===16){const span=Math.min(180,e.duration),ageStart=e.duration-span;if(age>=ageStart)voidRift(e,submit,(age-ageStart)/Math.max(1,span));}
   if(id===34){const start=Math.max(0,e.duration-320);if(age>=start){const u=clamp((age-start)/Math.max(1,e.duration-start)),b=WT_ATLAS.skills[33].description.main,y=c[1]-200*(1-(.65*u+.35*u*u));pose(e,submit,'main',c[0],Math.round(y),b.width*2,b.height*2,0,1,0,false,(age%180)/180);}}
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
   if(id===11){const distance=Math.max(Math.abs(p.x-e._source[0]),Math.abs(p.y-e._source[1]))/48,growth=1+Math.min(5,distance)*.06,b=WT_ATLAS.skills[10].description.main;pose(e,submit,'main',p.x,p.y,b.width*growth*1.2,b.height*growth*1.2,p.angle,1,1);return;}
   if(id===14){const carry=e.kind==='transfer',attenuation=Math.pow(.8,Math.max(1,e.stageIndex));pose(e,submit,'main',p.x,p.y,carry?36*Math.max(.6,attenuation):54,carry?6:10,p.angle,1,1);return;}
   if(id===26){pose(e,submit,'main',p.x,p.y,48,17,p.angle,1,1);return;}
   return;

}
function hit6(e,t,now,submit,p){
const age=now-e.at,fade=1-t;
if(e.stageIndex===0){const b=WT_ATLAS.skills[5].description.main;if(age<140)pose(e,submit,'main',p[0],p[1],b.width,b.height,e._angle+Math.PI/2,1,0,false,age/140);}else pose(e,submit,'hit',p[0],p[1],28-e.stageIndex*5,28-e.stageIndex*5,0,fade);
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
if(age<90){const b=WT_ATLAS.skills[33].description.contact;pose(e,submit,'contact',p[0],p[1]+4,b.width,b.height,0,age<45?1:.5);}
}
function hit16(e,t,now,submit,p){
const age=now-e.at;
if(age<90){const b=WT_ATLAS.skills[15].description.hit;pose(e,submit,'hit',p[0],p[1],b.width,b.height,e._angle+Math.PI/2,age<45?1:.5,0,false,age/90);}
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
if(e.stageIndex!==0)link(e,submit,'link',Math.max(5,13-e.stageIndex*3),fade);return;
}
function stage8(e,t,now,submit){
const d=e._d,age=now-e.at;
if(!d.cleave)cleaveGeometry(e);const b=WT_ATLAS.skills[7].description.main,g=d.cleave,u=clamp(age/90),drift=-9+20*u;pose(e,submit,'main',g.x+Math.cos(e._angle)*drift,g.y+Math.sin(e._angle)*drift,b.width*g.scale,b.height*g.scale,e._angle,age<150?1:clamp((260-age)/110),0,true,clamp(age/220));return;
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
if(e.stageIndex===0&&age<180){const role=age<65?'hit':'contact',b=WT_ATLAS.skills[33].description[role];pose(e,submit,role,c[0],c[1],b.width,b.height,0,age<130?1:.5);}if(e.stageIndex<3){const fieldAge=age+e.stageIndex*600,endFade=meteorFade(fieldAge),b=WT_ATLAS.skills[33].description.field,points=d.victims||d.targets;for(let i=0;i<points.length;i++){const p=points[i];if(fieldAge<80)continue;pose(e,submit,'field',p[0],p[1]+12,b.width,b.height,0,endFade,0,false,((fieldAge+i*79)%400)/400);}}return;
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
const WT_DESCRIPTION10 = {ids,prepare,draw};

export { WT_DESCRIPTION10 };
