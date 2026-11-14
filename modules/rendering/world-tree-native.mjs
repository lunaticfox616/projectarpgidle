import { WT_CATALOG, point, artHeading, WT_ATLAS, clamp } from './world-tree-effect-values.mjs';
import { prepareEvent, prepareEventStyle0, prepareEventStyle1, prepareEventStyle2, prepareEventStyle3, prepareEventStyle4, prepareEventStyle5, prepareEventStyle6 } from './world-tree-effect-prepare.mjs';
import { drawEvent } from './world-tree-effect-draw.mjs';
class WorldTreeFX {
constructor(cloneEvent){this.cloneEvent=cloneEvent;this.effects=[];this.cancelled=new Map();}
emit(event){const item=WT_CATALOG.find(s=>s.name===event.skillName);if(!item)return false;const e=this.cloneEvent({kind:'stage',stageIndex:0,repeatIndex:0,...event,element:event.element||item.skill.ele,id:item.id});this.effects.push(e);return e;}
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
const submit=(...args)=>{const [e,x,y,scale,frame,rotation,override,stretch=1,alpha=1]=args;const sheet=WT_ATLAS.skills[e.id-1],variant=sheet.variants?.[e.element]||sheet.frames,f=override||variant[Math.min(variant.length-1,frame)];if(used>=48)return;visit({x:Math.round(x),y:Math.round(y),scale,angle:rotation,frame:{x:f.x,y:f.y,w:f.w||64,h:f.h||64},scaleY:scale*stretch,alpha,ground:e.renderLayer==='ground',effect:e,now});used++;};
for(const e of this.effects){if(now<e.at||now>=e.at+e.duration)continue;drawEvent(e,clamp((now-e.at)/e.duration,0,.999999),now,submit);}
return used;
}
}

export function createWorldTreeNativeFx(cloneEvent) {
    return Object.freeze({
        create(event) {
            const renderer = new PixelLabFX(cloneEvent);
            renderer.emit(event);
            return renderer;
        }
    });
}
