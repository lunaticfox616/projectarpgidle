// Verbatim v3.7 consumeBattleFx reference. Source SHA256: ca4da86d43e9152a461334ea03912de95ab685990c4dc9bf90629b38752e17cd
// Minimal event recorder replaces the external renderer; method body is unchanged.
const G={WT_CATALOG:[{"id":1,"name":"연속 베기","grid":{"kind":"arc"}},{"id":2,"name":"묵직한 강타","grid":{"kind":"melee"}},{"id":3,"name":"흡혈 타격","grid":{"kind":"melee"}},{"id":4,"name":"암살자의 일격","grid":{"kind":"melee"}},{"id":5,"name":"회오리바람","grid":{"kind":"nova"}},{"id":6,"name":"번개 타격","grid":{"kind":"chain"}},{"id":7,"name":"얼음 창","grid":{"kind":"line"}},{"id":8,"name":"화염 참격","grid":{"kind":"arc"}},{"id":9,"name":"독창 투척","grid":{"kind":"chain"}},{"id":10,"name":"서리 폭발","grid":{"kind":"blast"}},{"id":11,"name":"번개 창","grid":{"kind":"line"}},{"id":12,"name":"지진 파쇄","grid":{"kind":"blast"}},{"id":13,"name":"용암 강타","grid":{"kind":"cone"}},{"id":14,"name":"관통 사격","grid":{"kind":"line"}},{"id":15,"name":"연쇄 폭풍","grid":{"kind":"chain"}},{"id":16,"name":"공허 베기","grid":{"kind":"line"}},{"id":17,"name":"혈기 폭쇄","grid":{"kind":"blast"}},{"id":18,"name":"불멸의 진동","grid":{"kind":"nova"}},{"id":19,"name":"화염 부패","grid":{"kind":"blast"}},{"id":20,"name":"빙결 침식","grid":{"kind":"blast"}},{"id":21,"name":"서리 파동","grid":{"kind":"line"}},{"id":22,"name":"뇌운 낙뢰","grid":{"kind":"chain"}},{"id":23,"name":"심연 전염","grid":{"kind":"chain"}},{"id":24,"name":"독니 사출","grid":{"kind":"line"}},{"id":25,"name":"연발 사격","grid":{"kind":"fan"}},{"id":26,"name":"폭열 창탄","grid":{"kind":"line"}},{"id":27,"name":"암흑 파열","grid":{"kind":"blast"}},{"id":28,"name":"중력 붕괴","grid":{"kind":"blast"}},{"id":29,"name":"화염 폭풍핵","grid":{"kind":"blast"}},{"id":30,"name":"빙결 파열창","grid":{"kind":"line"}},{"id":31,"name":"천뢰 분기","grid":{"kind":"chain"}},{"id":32,"name":"삼원 파동","grid":{"kind":"cone"}},{"id":33,"name":"뇌격 삼연타","grid":{"kind":"melee"}},{"id":34,"name":"유성 낙화","grid":{"kind":"blast"}},{"id":35,"name":"난타 눈보라","grid":{"kind":"blast"}},{"id":36,"name":"방패 투척","grid":{"kind":"line"}},{"id":37,"name":"룬 지뢰","grid":{"kind":"blast"}},{"id":38,"name":"원소 포션 투척","grid":{"kind":"blast"}},{"id":39,"name":"방패 돌진","grid":{"kind":"arc"}},{"id":40,"name":"그림자 점멸","grid":{"kind":"melee"}},{"id":41,"name":"집중 광선","grid":{"kind":"line"}},{"id":42,"name":"용화 숨결","grid":{"kind":"cone"}},{"id":43,"name":"공허 절삭광","grid":{"kind":"line"}}]};
const cellOK = c=>c && Number.isFinite(c.gx) && Number.isFinite(c.gy);
module.exports=class NativeBridgeReference {
 constructor(){this.effects=[];this.stageKeys=new Map();}
 emit(event){this.effects.push(structuredClone(event));return true;}
    consumeBattleFx(type,data,{now,resolveEnemyCell,playerCell,channelId}={}){
      const item=G.WT_CATALOG.find(s=>s.name===data.skillName);if(!item)return false;
      if(type==='playerMobility')return this.emit({skillName:data.skillName,kind:'mobility',sourceCell:data.fromCell,targetCells:[data.toCell],at:now,duration:data.duration||240,element:data.element});
      const source=data.sourceCell||playerCell;
      let targets=(data.targetCells||[]).filter(cellOK);
      if(type==='hit'){const target=resolveEnemyCell?.(data.enemyId);if(!cellOK(target))return false;targets=[target];}
      if(!targets.length)return false;
      const shared={skillName:data.skillName,sourceCell:source,targetCells:targets,element:data.element,footprint:data.attackFootprint,stageIndex:data.stageIndex||0,repeatIndex:data.repeatIndex||0,channelId};
      if(type==='hit'){
        if([1,2,3,4,5,6,8,12,33,39,40].includes(item.id)){
          const key=`${data.skillName}:${data.damageTextGroupId||now}:${data.stageIndex||0}`;
          if(!this.stageKeys.has(key)){this.stageKeys.set(key,now);this.emit({...shared,kind:'stage',at:now,duration:data.duration||260});}
        }
        return this.emit({...shared,kind:'hit',at:now,duration:data.duration||240});
      }
      if(type!=='combatTravel')return false;
      const release=Math.max(0,data.releaseDelayMs||0), flight=Math.max(1,data.flightMs||1);
      const travelling=data.delivery?.startsWith('projectile')||data.delivery==='magicMoving';
      if(item.id===25&&travelling){
        const rays=new Map();for(const c of data.attackFootprint?.cells||targets){const dx=c.gx-source.gx,dy=c.gy-source.gy;if(!dx&&!dy)continue;const key=`${Math.sign(dx)},${Math.sign(dy)}`,prev=rays.get(key);if(!prev||Math.hypot(dx,dy)>Math.hypot(prev.gx-source.gx,prev.gy-source.gy))rays.set(key,c);}
        let result=false;for(const target of rays.values())result=this.emit({...shared,kind:'travel',at:now+release,duration:flight,targetCells:[target]})||result;return result;
      }
      if(!travelling&&[34,37,38].includes(item.id))this.emit({...shared,kind:item.id===38?'travel':'windup',at:now,duration:flight});
      if(!travelling&&item.grid.kind==='line'&&data.attackFootprint?.cells?.length){const a=source;shared.targetCells=[data.attackFootprint.cells.reduce((best,c)=>Math.hypot(c.gx-a.gx,c.gy-a.gy)>Math.hypot(best.gx-a.gx,best.gy-a.gy)?c:best,a)];}
      return this.emit({...shared,kind:travelling?'travel':'stage',travelPath:data.travelPath,at:now+(travelling?release:flight),duration:travelling?flight:Math.max(160,(data.duration||400)-flight)});
    }
};
