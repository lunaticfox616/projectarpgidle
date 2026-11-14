import { artHeading, groundImpact, point, radial, WT_ATLAS, facingAngles, clamp, finite, broad } from './world-tree-effect-values.mjs';
import { WT_DESCRIPTION10 } from './world-tree-effect-descriptions.mjs';
import { WT_REMAKE15 } from './world-tree-effect-remakes.mjs';
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
function prepareEventStyle6(e){if(WT_DESCRIPTION10?.ids.has(e.id))WT_DESCRIPTION10.prepare(e,this.effects);
   else if(WT_REMAKE15?.ids.has(e.id))WT_REMAKE15.prepare(e,this.effects);}
const preparation={p1(e) {

    const sheet=WT_ATLAS.skills[51];e._assassinParts={};for(const role of ['smoke','dagger','slash','poison','bleed']){const c=sheet.assassination[role],f=sheet.frames[c.frame];e._assassinParts[role]={x:f.x+c.x,y:f.y+c.y,w:c.w,h:c.h};}
    e._assassinAngle=facingAngles[e.facingDirection]??0;e._assassinBlink=e.blinkCell?point(e.blinkCell):null;e._assassinLanding=e.landingCell?point(e.landingCell):null;

},
p2(e) {

    const sheet=WT_ATLAS.skills[50],art=sheet.rippleJudgment;e._judgmentFrames={};for(const role of ['censer','chain','bolt','core']){const c=art[role],f=sheet.frames[c.frame];e._judgmentFrames[role]={x:f.x+c.x,y:f.y+c.y,w:c.w,h:c.h};}e._judgmentPose={};e._judgmentChainSlice={...e._judgmentFrames.chain};e._judgmentBoltSlice={...e._judgmentFrames.bolt};e._judgmentCells=e.footprint.cells;

},
p3(e) {

    const sheet=WT_ATLAS.skills[49],c=sheet.holyMist[e.holyMistPhase==='censer'?'censer':'debuff'],f=sheet.frames[c.frame];e._holyCrop={x:f.x+c.x,y:f.y+c.y,w:c.w,h:c.h};
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
    e._supercooledParts=WT_ATLAS.skills[47].frames.slice(1).map((f,i)=>({x:i%2*64-32,y:Math.floor(i/2)*64-32,frame:f}));

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
    const sheet=WT_ATLAS.skills[16],f=sheet.frames[0],c=sheet.bloodBurst.core;
    e._bloodCore={x:f.x+c.x,y:f.y+c.y,w:c.w,h:c.h};

},
p8(e) {

    if(e.kind==='stage'){const cone=e.footprint?.cone,reach=cone?.length??(e.stageIndex+1.5);e.renderLayer='ground';e._triOriginalDuration=e.duration;e.duration=Math.max(340,e.duration);e._triReach=reach*48;e._triScale=clamp(Math.round(reach-.5),1,4);e._angle=cone?Math.atan2(cone.dy,cone.dx):e._angle;e._triCos=Math.cos(e._angle);e._triSin=Math.sin(e._angle);const sheet=WT_ATLAS.skills[31],f=(sheet.variants[e.element]||sheet.frames)[0],c=sheet.quiet.crop;e._triFrame={x:f.x+c.x,y:f.y+c.y,w:c.w,h:c.h};}

},
p10(e) {
    const ray=e.focusBeamRay;
    e._beamParts=[];
    if(e.kind==='stage'&&ray?.cells?.length){
     const a=point(ray.sourceCell),b=point(ray.endCell),angle=ray.direction.angle,ux=Math.cos(angle),uy=Math.sin(angle),sheet=WT_ATLAS.skills[40],parts=sheet.focusBeam,scale=parts.scale;
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
    const first=WT_ATLAS.skills[46]?.frames[1];e._mixtureContactFrame=first?{x:first.x+16,y:first.y+16,w:32,h:32}:null;

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
const prepareRoutes=[{matches:(e)=>e.id===52,run:preparation.p1},
{matches:(e)=>e.id===51,run:preparation.p2},
{matches:(e)=>e.id===50,run:preparation.p3},
{matches:(e)=>e.id===49,run:preparation.p4},
{matches:(e)=>e.id===48,run:preparation.p5},
{matches:(e)=>e.id===28,run:preparation.p6},
{matches:(e)=>e.id===17,run:preparation.p7},
{matches:(e)=>e.id===32,run:preparation.p8},
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
export { prepareEvent, prepareEventStyle0, prepareEventStyle1, prepareEventStyle2, prepareEventStyle3, prepareEventStyle4, prepareEventStyle5, prepareEventStyle6 };
