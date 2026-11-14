import { WT_ATLAS, judgmentPose, clamp, WT_CATALOG, frostDirections } from './world-tree-effect-values.mjs';
import { WT_DESCRIPTION10 } from './world-tree-effect-descriptions.mjs';
import { WT_REMAKE15 } from './world-tree-effect-remakes.mjs';
function gemDraw2Part0(e,t,now,submit){
const art=WT_ATLAS.skills[50].rippleJudgment;
const parts=e._judgmentFrames;
const age=now-e.at;

      const p=judgmentPose(e.sourceCell,e.landingCell,e.judgmentDirection,age/e.impactOffsetMs,e._judgmentPose),x=p.x-art.bottomAnchor.x,y=p.y-art.bottomAnchor.y,ax=x+art.chainAnchor.x,ay=y+art.chainAnchor.y,dx=ax-p.hx,dy=ay-p.hy,length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx),co=Math.cos(angle),si=Math.sin(angle),w=parts.chain.w,fade=Math.min(1,age/55,Math.max(0,(e.duration-age)/e.holdMs));
      // Crop only the last link segment. Every segment shares this atlas and never stretches pixels.
      for(let offset=0;offset<length;offset+=w){const width=Math.min(w,Math.ceil(length-offset));e._judgmentChainSlice.w=width;submit(e,p.hx+co*(offset+width/2),p.hy+si*(offset+width/2),1,0,angle,e._judgmentChainSlice,1,fade*.85);}
      submit(e,x,y,1,0,0,parts.censer,1,fade);

}
function gemDraw2Part1(e,t,now,submit){
const art=WT_ATLAS.skills[50].rippleJudgment;
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
const sheet=WT_ATLAS.skills[49];

      const c=e.holySource,age=now-e.at,u=t*t*(3-2*t),angle=Math.round((-Math.PI*.8+Math.PI*2.15*u)/(Math.PI/32))*(Math.PI/32),co=Math.cos(angle),si=Math.sin(angle),p=sheet.holyMist.censer.pivot,scale=2;
      const handX=c.gx*48+30,handY=c.gy*48+16,swing=sheet.holyMist.swing,alpha=Math.min(1,age/65,(e.duration-age)/110);
      const bowlDistance=swing.extension+52;submit(e,handX-si*bowlDistance,handY+co*bowlDistance,.65,0,0,sheet.frames[1],1,.28*alpha);
      for(let i=0;i<swing.links;i++){const distance=(i+.5)*swing.step;submit(e,handX-si*distance,handY+co*distance,scale,0,angle,e._holyChain,1,alpha);}
      submit(e,handX-(p.x*co-p.y*si)*scale-si*swing.extension,handY-(p.x*si+p.y*co)*scale+co*swing.extension,scale,0,angle,e._holyCrop,1,alpha);

}
function gemDraw3Part3(e,t,now,submit){
const sheet=WT_ATLAS.skills[49];

      const c=e.holySource,age=now-e.at,alpha=.64*Math.min(1,age/140,(e.duration-age)/310);submit(e,c.gx*48+24,c.gy*48+24,2,0,0,sheet.frames[1],1,Math.max(0,alpha));

}
function gemDraw3Part4(e,t,now,submit){


      // Drawing is deduplicated per occupied cell; damage/debuff records retain every enemy ID.
      const targets=e.holyTargets;for(let i=0;i<targets.length;i++){const c=targets[i];if(now<c.appliedAt||now>=c.expiresAt)continue;let duplicate=false;for(let j=0;j<i;j++)if(targets[j].gx===c.gx&&targets[j].gy===c.gy&&now<targets[j].expiresAt){duplicate=true;break;}if(duplicate)continue;
       const alpha=.9*Math.min(1,(now-c.appliedAt)/140,(c.expiresAt-now)/200);submit(e,c.gx*48+24,c.gy*48+4,1,0,0,e._holyCrop,1,Math.max(0,alpha));
      }

}
function gemDraw4Part5(e,t,now,submit){
const sheet=WT_ATLAS.skills[48];

      const dx=e._target[0]-e._source[0],dy=e._target[1]-e._source[1],x=e._source[0]+dx*t,ground=e._source[1]+dy*t,height=Math.min(80,40+Math.hypot(dx,dy)*.14,Math.max(0,Math.min(e._source[1],e._target[1])-20)),y=ground-12*(1-t)-4*height*t*(1-t),turn=Math.round((dx<0?-1:1)*Math.PI*2*t/(Math.PI/16))*(Math.PI/16),co=Math.cos(turn),si=Math.sin(turn),a=sheet.bottleAnchor;
      submit(e,x-(a.x*co-a.y*si),y-(a.x*si+a.y*co),1,0,turn,sheet.frames[0]);

}
function gemDraw4Part6(e,t,now,submit){
const sheet=WT_ATLAS.skills[48];
const phase=e.emptyFlaskPhase;

      const arc=e._emptyArc,u=phase==='shard'?t:1,vy=arc.dy-4*arc.height*(1-2*u),angle=phase==='contact'||Math.abs(arc.dx)+Math.abs(vy)<.0001?arc.landingAngle:Math.round(Math.atan2(vy,arc.dx)/(Math.PI/32))*(Math.PI/32),co=Math.cos(angle),si=Math.sin(angle),a=sheet.shardTip;
      const x=e._source[0]+arc.dx*u,y=e._source[1]+arc.dy*u-4*arc.height*u*(1-u);
      // Tip follows the ballistic curve; contact retains the arriving direction.
      submit(e,x-(a.x*co-a.y*si),y-(a.x*si+a.y*co),1,0,angle,sheet.frames[1],1,phase==='contact'?(1-t)*.9:1);

}
function gemDraw4Part7(e,t,now,submit){
const sheet=WT_ATLAS.skills[48];

      const scale=Math.round((.75+t*.5)*16)/16;submit(e,e._target[0],e._target[1],scale,0,0,sheet.frames[2],1,.85*Math.min(1,(1-t)/.65));

}
function gemDraw13Part8(e,t,now,submit){
const c=e.timeCenter;
const x=c.gx*48+24;
const y=c.gy*48+24;
const age=now-e.at;
const sheet=WT_ATLAS.skills[45];
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
const sheet=WT_ATLAS.skills[45];
const fade=Math.min(1,age/180,Math.max(0,(5200-age)/200));
for(let h=0;h<2;h++){const scale=h===0?2:1,angle=Math.round((sec*.7+sec*sec*.28)*(h===0?1:.29)*32)/32,co=Math.cos(angle),si=Math.sin(angle),p=sheet.handPivot;
      submit(e,x-(p.x*co-p.y*si)*scale,y-(p.x*si+p.y*co)*scale,scale,0,angle,sheet.frames[9+h],1,fade*.88);
     }
}
function gemDraw13Part10(e,t,now,submit){
const sheet=WT_ATLAS.skills[45];
for(const batch of e.timeTickTargets||[]){const dt=now-batch.at;if(dt<0||dt>=180)continue;for(const p of batch.cells)submit(e,p.gx*48+24,p.gy*48+24,2,0,0,sheet.frames[11],1,1-dt/180);}
}
function gemDraw14Part11(e,t,now,submit){
const sheet=WT_ATLAS.skills[46];

      const dx=e._target[0]-e._source[0],dy=e._target[1]-e._source[1],x=e._source[0]+dx*t,ground=e._source[1]+dy*t;
      const height=Math.min(88,42+Math.hypot(dx,dy)*.16,Math.max(0,Math.min(e._source[1],e._target[1])-20)),y=ground-12*(1-t)-4*height*t*(1-t);
      const turn=Math.round((dx<0?-1:1)*Math.PI*2*t/(Math.PI/16))*(Math.PI/16),co=Math.cos(turn),si=Math.sin(turn),anchor=sheet.bottleAnchor||{x:0,y:12};
      // Rotate around the bottle's physical bottom so that its final contact point
      // converges to the locked landing cell, regardless of the throwing direction.
      submit(e,x-(anchor.x*co-anchor.y*si),y-(anchor.x*si+anchor.y*co),1,0,turn,sheet.frames[0]);

}
function gemDraw14Part12(e,t,now,submit){
const sheet=WT_ATLAS.skills[46];

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
d2(e,t,now,submit) {
const art=WT_ATLAS.skills[50].rippleJudgment;
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
     const sheet=WT_ATLAS.skills[47];
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
     const age=now-e.at,sheet=WT_ATLAS.skills[27],art=sheet.gravityCollapse,
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
     const age=now-e.at,progress=clamp(age/180,0,1),reach=e._triReach-12-(1-progress)*32,alpha=.62*Math.min(1,age/90,Math.max(0,(e.duration-age)/160)),sheet=WT_ATLAS.skills[31],scale=e._triScale,an=e._angle-Math.PI,co=-e._triCos,si=-e._triSin,a=sheet.quiet.anchor;
     submit(e,e._source[0]+e._triCos*reach-(a.x*co-a.y*si)*scale,e._source[1]+e._triSin*reach-(a.x*si+a.y*co)*scale,scale,0,an,e._triFrame,1,alpha);

},
d10(e,t,now,submit) {

     if(e.kind!=='stage'||now>=(e.focusBeamCancelledAt??Infinity))return;
     const age=now-e.at,alpha=.92*Math.min(1,age/120,Math.max(0,(e.duration-age)/160));
     for(const part of e._beamParts)submit(e,part.x,part.y,2,0,e._angle,part.frame,1,alpha);

},
d11(e,t,now,submit) {

     if(e.kind!=='stage')return;
     const age=now-e.at,sheet=WT_ATLAS.skills[9],msPerCell=WT_CATALOG[9].skill.combatPattern.waveMsPerCell,
      radius=Math.min(e._frostReach,age/msPerCell*48),cx=e._quietCenter[0],cy=e._quietCenter[1];
     // The stationary crown fractures once; eight large facets carry the burst outward.
     if(age<230){const pose=Math.min(4,Math.floor(Math.max(0,age-35)/35)),alpha=.9*Math.min(1,age/40,Math.max(0,(230-age)/100));submit(e,cx,cy,1,0,0,sheet.frames[pose],1,alpha);}
     if(age>=45){const alpha=.88*Math.min(1,(age-45)/40,Math.max(0,(e.duration-age)/190));
      for(const d of frostDirections)submit(e,cx+d.x*radius,cy+d.y*radius,1,0,d.angle,sheet.frames[5],1,alpha);
     }

},
d12(e,t,now,submit) {

     if(e.kind!=='stage')return;
     const age=now-e._quietFieldStart,duration=e._quietFieldDuration,sheet=WT_ATLAS.skills[28],
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

     WT_DESCRIPTION10.draw(e,t,now,submit);

},
d16(e,t,now,submit) {

     WT_REMAKE15.draw(e,t,now,submit);

},
d17(e,t,now,submit) {

     // A short vertical blow at the victim. The later damage stage is a contact
     // aftershock only; it does not summon or drop a second object.
     if(e.kind!=='stage')return;
     const sheet=WT_ATLAS.skills[1],smash=sheet.smash;
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

     const sheet=WT_ATLAS.skills[44],anchor=sheet.lanceAnchor,scale=sheet.lanceScale;
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

     const sheet=WT_ATLAS.skills[43];
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
const shard=WT_ATLAS?.skills[34].rainFrame;
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
{matches:(e)=>e.id===51,run:drawing.d2},
{matches:(e)=>e.id===50,run:drawing.d3},
{matches:(e)=>e.id===49,run:drawing.d4},
{matches:(e)=>e.id===48,run:drawing.d5},
{matches:(e)=>e.id===28,run:drawing.d6},
{matches:(e)=>e.id===17,run:drawing.d7},
{matches:(e)=>e.id===32,run:drawing.d8},
{matches:(e)=>e.id===41,run:drawing.d10},
{matches:(e)=>e.id===10,run:drawing.d11},
{matches:(e)=>e.id===29,run:drawing.d12},
{matches:(e)=>e.id===46,run:drawing.d13},
{matches:(e)=>e.id===47,run:drawing.d14},
{matches:(e)=>WT_DESCRIPTION10?.ids.has(e.id),run:drawing.d15},
{matches:(e)=>WT_REMAKE15?.ids.has(e.id),run:drawing.d16},
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
export { drawEvent };
