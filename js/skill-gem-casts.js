/** Scheduled gem contacts. Inputs are combat snapshots; outputs are commands, never UI calls.
 * Casts are transient and captured with the combat runtime during offline simulation.
 */
const skillGemCasts = (() => {
    const cell = unit => ({gx:unit.gx, gy:unit.gy});
    const same = (a,b) => a.gx===b.gx && a.gy===b.gy;
    const distance = (a,b) => Math.hypot(a.gx-b.gx,a.gy-b.gy);
    const dirs = {2:[0,1],4:[-1,0],6:[1,0],8:[0,-1]};
    function facing(enemy,source) {
        const center=getGridUnitCenter(enemy),x=source.gx-center.gx,y=source.gy-center.gy;
        return Math.abs(x)>=Math.abs(y) ? (x<0?4:6) : (y<0?8:2);
    }
    function behind(enemy,source) {
        const direction=enemy.facingDirection || facing(enemy,source);
        const size=getGridUnitFootprint(enemy),destination=cell(enemy);
        if(direction===4)destination.gx+=size.columns;
        if(direction===6)destination.gx--;
        if(direction===8)destination.gy+=size.rows;
        if(direction===2)destination.gy--;
        return destination;
    }
    function free(destination,enemies) {
        return hasGridCell(destination) && !enemies.some(e=>getGridUnitCells(e).some(c=>same(c,destination)));
    }
    function cross(source,target) {
        for(const [direction,[x,y]] of Object.entries(dirs)) {
            const center={gx:source.gx+x*2,gy:source.gy+y*2};
            if(hasGridCell(center) && getGridUnitCells(target).some(c=>Math.abs(c.gx-center.gx)+Math.abs(c.gy-center.gy)<=1)) {
                return {center,direction:Number(direction)};
            }
        }
        return null;
    }
    function targets(id,source,enemies) {
        const live=enemies.filter(e=>e.hp>0);
        if(id===51)return live.filter(e=>cross(source,e));
        if(id===52)return live.filter(e=>getGridUnitDistance(source,e)<=4 && free(behind(e,source),live));
        const range=({44:9,45:3,46:3,47:4,48:4,49:4,50:1,53:4})[id];
        return live.filter(e=>getGridUnitCells(e).some(c=>inArea(id,source,c,range)));
    }
    function inArea(id,source,c,range) {
        if(id===45 || id===50)return Math.max(Math.abs(c.gx-source.gx),Math.abs(c.gy-source.gy))<=range && !same(c,source);
        return distance(source,c)<=range;
    }
    function area(enemies,center,shape,radius) {
        return enemies.filter(e=>e.hp>0 && getGridUnitCells(e).some(c=>{
            const x=Math.abs(c.gx-center.gx),y=Math.abs(c.gy-center.gy);
            if(shape==='cross')return x+y<=radius;
            if(shape==='square')return Math.max(x,y)<=radius;
            if(shape==='ring')return distance(c,center)>radius-.5 && distance(c,center)<=radius+.5;
            return distance(c,center)<=radius;
        }));
    }
    function cells(center,shape,radius) {
        const board=Array.from({length:72},(_,i)=>({gx:i%9,gy:Math.floor(i/9),hp:1}));
        return area(board,center,shape,radius).map(cell);
    }
    function createState() {return {casts:[],events:[],sequence:0,channel:null,lastSkill:''};}
    function event(cast,phase,at,duration,extra={}) {
        const keys={44:'flaskPhase',45:'lancePhase',46:'timePhase',47:'mixturePhase',48:'supercooledPhase',
            49:'emptyFlaskPhase',50:'holyMistPhase',51:'judgmentPhase',52:'assassinationPhase',53:'causalityPhase'};
        const travel=['flight','flask','shard','fall'].includes(phase);
        const ground=['clock','wave','mist','sigil'].includes(phase);
        return {skillName:cast.name,kind:travel?'travel':'stage',[keys[cast.id]]:phase,at,duration,
            sourceCell:cell(cast.source),targetCells:[cell(cast.aim)],landingCell:cell(cast.aim),
            stageIndex:cast.index||0,element:cast.stats.sSkill.ele,channelId:cast.key,
            renderLayer:ground?'ground':'foreground',...extra};
    }
    function visual(state,cast,...args) {
        const [phase,at,duration,extra]=args;
        const row=event(cast,phase,at,duration,extra);
        if(state.visuals!==false)state.events.push(row);
        return row;
    }
    function contact(cast,targets,at,extra={}) {
        return {type:'hit',name:cast.name,stats:cast.stats,attackOptions:cast.attackOptions,sourceCell:cell(cast.source),
            targets:targets.map(e=>e.id),at,key:cast.key,...extra};
    }
    function flight(cast,base,perCell) {
        return Math.max(1,Math.round((base+distance(cast.source,cast.aim)*perCell)/cast.speed/1.8));
    }
    function start(state,input) {
        const {id,name,stats,source,enemies,now}=input;
        state.visuals=input.visuals;
        const options=targets(id,source,enemies);
        if(!options.length)return false;
        if([46,52].includes(id) && state.casts.some(c=>c.id===id))return false;
        const target=findNearestGridEnemy(source,options);
        const cast={id,name,stats,attackOptions:input.attackOptions,source:cell(source),aim:getGridUnitCenter(target),targetId:target.id,
            speed:Math.max(.5,Math.min(2.5,stats.aspd)),key:'gem-'+(++state.sequence),at:now,index:0,nextAt:now};
        state.lastSkill=name;
        if(id===53) {state.channel={source:cell(source),count:0,attackOptions:input.attackOptions};return true;}
        if(id===44)cast.targetId=null;
        launch[id](state,cast,enemies);
        state.casts.push(cast);
        return true;
    }
    function launchFlask(state,c) {
        const phase=c.id===49?'flask':'flight';
        c.nextAt=c.at+flight(c,420,c.id===49?45:50);
        visual(state,c,phase,c.at,c.nextAt-c.at);
    }
    function launchLance(state,c,enemies) {
        c.points=targets(45,c.source,enemies).map(getGridUnitCenter);
        c.nextAt=c.at+440/c.speed;
        visual(state,c,'fall',c.at+180/c.speed,260/c.speed,{targetCells:c.points});
    }
    function launchClock(state,c) {
        c.nextAt=c.at+1000;
        c.event=visual(state,c,'clock',c.at,5200,{timeCenter:cell(c.source),timeRadius:3,
            timeTickTimes:[1,2,3,4,5].map(i=>c.at+i*1000),timeTickTargets:[],sourcePath:[]});
    }
    function launchMist(state,c) {
        c.nextAt=c.at+Math.round(330/c.speed);
        c.event=visual(state,c,'censer',c.at,Math.round(520/c.speed),{holySource:cell(c.source)});
    }
    function launchJudgment(state,c,enemies) {
        const plan=cross(c.source,enemies.find(e=>e.id===c.targetId));
        c.aim=plan.center;c.nextAt=c.at+Math.round(480/c.speed);c.direction=plan.direction;
        c.geometry={judgmentDirection:c.direction,crossRadius:1,impactOffsetMs:c.nextAt-c.at,
            holdMs:Math.round(140/c.speed),footprint:{cells:cells(c.aim,'cross',1)}};
        visual(state,c,'censer',c.at,c.nextAt-c.at+c.geometry.holdMs,c.geometry);
    }
    function launchAssassin(state,c) {
        state.pose=c;
        c.nextAt=c.at+100;
        visual(state,c,'vanish',c.at,180,{blinkCell:cell(c.source)});
    }
    function bounce(state,c,enemies) {
        const live=enemies.filter(e=>e.hp>0),others=live.filter(e=>e.id!==c.targetId);
        const pool=others.length?others:live;
        if(!pool.length){c.done=true;return;}
        const target=pool[Math.floor(Math.random()*pool.length)];
        c.targetId=target.id;c.aim=getGridUnitCenter(target);
        const duration=Math.round(Math.max(340,Math.min(520,300+distance(c.source,c.aim)*45))/c.speed/1.8);
        visual(state,c,'flight',c.nextAt,duration);c.nextAt+=duration;
    }
    const launch={44:bounce,45:launchLance,46:launchClock,47:launchFlask,48:launchFlask,49:launchFlask,
        50:launchMist,51:launchJudgment,52:launchAssassin};
    function stepBounce(state,c,input) {
        visual(state,c,'splash',c.nextAt,280/c.speed);
        const result=contact(c,input.enemies.filter(e=>e.id===c.targetId && e.hp>0),c.nextAt);
        c.index++;
        if(c.index===4)c.done=true;
        else {c.source=cell(c.aim);c.nextAt+=80/c.speed;c.pendingBounce=true;}
        return [result];
    }
    function stepLance(state,c,input) {
        const hit=input.enemies.filter(e=>e.hp>0 && c.points.some(p=>getGridUnitCells(e).some(t=>
            Math.max(Math.abs(t.gx-p.gx),Math.abs(t.gy-p.gy))<=.5)));
        visual(state,c,'land',c.nextAt,144/c.speed,{targetCells:c.points});c.done=true;
        return [contact(c,hit,c.nextAt)];
    }
    function stepClock(state,c,input) {
        c.source=cell(input.source);c.event.timeCenter=cell(input.source);
        const hit=area(input.enemies,c.source,'circle',3),at=c.nextAt;
        c.event.timeTickTargets.push({at,cells:hit.map(getGridUnitCenter)});
        c.nextAt+=1000;c.done=++c.index===5;
        return [contact(c,hit,at,{type:'dot'})];
    }
    function stepExplosion(state,c,input) {
        visual(state,c,'burst',c.nextAt,Math.round(540/c.speed));c.done=true;
        return [contact(c,area(input.enemies,c.aim,'square',1),c.nextAt)];
    }
    function stepCold(state,c,input) {
        if(!c.index)visual(state,c,'wave',c.nextAt,Math.round(860/c.speed),{ringInterval:Math.round(260/c.speed)});
        const hit=area(input.enemies,c.aim,'ring',c.index+1);
        if(!c.index)for(const enemy of area(input.enemies,c.aim,'square',.5))if(!hit.includes(enemy))hit.push(enemy);
        const result=contact(c,hit,c.nextAt);c.nextAt+=Math.round(260/c.speed);c.done=++c.index===3;
        return [result];
    }
    function stepMist(state,c,input) {
        c.source=cell(input.source);c.aim=cell(input.source);c.event.holySource=cell(input.source);
        const hit=targets(50,input.source,input.enemies);c.done=true;
        visual(state,c,'mist',c.nextAt,Math.round(700/c.speed),{holySource:cell(input.source)});
        markMistTargets(state,c,hit);
        return [contact(c,hit,c.nextAt),{type:'mist',targets:hit.map(e=>e.id),at:c.nextAt}];
    }
    function markMistTargets(state,c,hit) {
        if(state.visuals===false || !hit.length)return;
        state.mist ??= visual(state,c,'debuff',c.nextAt,4000,{holyTargets:[]});
        const targets=new Map(state.mist.holyTargets.map(row=>[row.id,row]));
        for(const enemy of hit)targets.set(enemy.id,{id:enemy.id,...getGridUnitCenter(enemy),appliedAt:c.nextAt,expiresAt:c.nextAt+4000});
        state.mist.holyTargets=[...targets.values()];
        state.mist.duration=c.nextAt+4000-state.mist.at;
    }
    function updateMistTargets(state,input) {
        if(!state.mist)return;
        const live=new Map(input.enemies.filter(e=>e.hp>0).map(e=>[e.id,e]));
        state.mist.holyTargets=state.mist.holyTargets.filter(row=>row.expiresAt>input.now && live.has(row.id));
        for(const row of state.mist.holyTargets)Object.assign(row,getGridUnitCenter(live.get(row.id)));
        if(!state.mist.holyTargets.length){state.mist.duration=0;state.mist=null;}
    }
    function stepJudgment(state,c,input) {
        visual(state,c,'cross',c.nextAt,Math.round(420/c.speed),c.geometry);c.done=true;
        return [contact(c,area(input.enemies,c.aim,'cross',1),c.nextAt)];
    }
    function stepAssassin(state,c,input) {
        const target=input.enemies.find(e=>e.id===c.targetId && e.hp>0);
        if(!target){c.done=true;c.failed=true;return [];}
        if(!c.index)return teleport(state,c,input,target);
        c.done=true;
        if(!same(input.source,c.destination) || !same(target,c.anchor)){c.failed=true;return [];}
        c.source=cell(input.source);c.aim=getGridUnitCenter(target);
        visual(state,c,'slash',c.nextAt,120,{facingDirection:c.direction});c.contact=true;
        const ailment=Math.random()<.5?'poison':'bleed';
        return [contact(c,[target],c.nextAt,{ailment:Math.random()<.3?ailment:null})];
    }
    function teleport(state,c,input,target) {
        const destination=behind(target,input.source);
        if(!free(destination,input.enemies) || getGridUnitDistance(input.source,target)>4){c.done=true;c.failed=true;return [];}
        c.destination=destination;c.anchor=cell(target);c.direction=target.facingDirection || facing(target,input.source);
        c.index=1;c.nextAt=c.at+240;
        visual(state,c,'arrive',c.at+100,180,{blinkCell:cell(destination)});
        return [{type:'teleport',from:cell(input.source),to:destination,at:c.at+100}];
    }
    function shardPlan(extra) {
        const base=1+Math.floor(Math.random()*4),plan=Array.from({length:base},()=>false);
        for(let i=0;i<base;i++) {
            const count=Math.floor(extra)+(Math.random()<extra%1?1:0);
            for(let j=0;j<count && plan.length<11;j++)plan.push(true);
        }
        return plan;
    }
    function shards(state,c,input) {
        const plan=shardPlan(Math.max(0,c.stats.projectileExtraShots || 0));
        const live=area(input.enemies,c.aim,'circle',3),others=live.filter(e=>e.id!==c.targetId),unused=[...others];
        return plan.map((bonus,i)=>{
            const pool=unused.length?unused:(others.length?others:live);
            if(!pool.length)return null;
            const target=pool[Math.floor(Math.random()*pool.length)];
            if(unused.includes(target))unused.splice(unused.indexOf(target),1);
            const aim=getGridUnitCenter(target),at=c.nextAt+Math.round((70+i*26)/c.speed);
            const duration=Math.round((150+distance(c.aim,aim)*46)/c.speed/1.8);
            visual(state,c,'shard',at,duration,{sourceCell:cell(c.aim),targetCells:[aim],bonusShard:bonus,projectileIndex:i});
            return {aim,at:at+duration,bonus,id:target.id};
        }).filter(Boolean).sort((a,b)=>a.at-b.at);
    }
    function stepEmpty(state,c,input) {
        if(!c.pending) {
            visual(state,c,'shatter',c.nextAt,Math.round(200/c.speed));
            const result=contact(c,area(input.enemies,c.aim,'square',.5),c.nextAt);
            c.pending=shards(state,c,input);c.done=!c.pending.length;
            if(!c.done)c.nextAt=c.pending[0].at;
            return [result];
        }
        const shard=c.pending.shift(),hit=area(input.enemies,shard.aim,'square',.5).filter(e=>e.id===shard.id);
        if(hit.length)visual(state,c,'contact',shard.at,110/c.speed,{targetCells:[shard.aim]});
        c.done=!c.pending.length;if(!c.done)c.nextAt=c.pending[0].at;
        return [contact(c,hit,shard.at,{bonus:shard.bonus})];
    }
    const steps={44:stepBounce,45:stepLance,46:stepClock,47:stepExplosion,48:stepCold,49:stepEmpty,
        50:stepMist,51:stepJudgment,52:stepAssassin};
    function update(state,input) {
        const commands=[];
        updateMistTargets(state,input);
        for(const c of state.casts) {
            if(c.id===46)c.event.timeCenter=cell(input.source);
            if(c.id===50)c.event.holySource=cell(input.source);
            if(c.done || c.nextAt>input.now)continue;
            if(c.pendingBounce){c.pendingBounce=false;bounce(state,c,input.enemies);}
            if(!c.done && c.nextAt<=input.now)commands.push(...steps[c.id](state,c,input));
        }
        state.casts=state.casts.filter(c=>!c.done);
        state.events=state.events.filter(e=>input.now<e.at+e.duration);
        if(state.events.length>128)state.events.splice(0,state.events.length-128);
        return commands;
    }
    function receiveHit(state,input) {
        if(!state.channel || !(input.damage>0) || !input.alive)return [];
        if(++state.channel.count<5)return [];
        state.channel.count=0;
        const c={id:53,name:'인과',source:cell(input.source),aim:cell(input.source),stats:input.stats,
            attackOptions:{...state.channel.attackOptions,forcedCrit:undefined},key:'gem-'+(++state.sequence)};
        for(const phase of ['sigil','wave'])visual(state,c,phase,input.now,phase==='sigil'?1000:580,
            {footprint:{cells:cells(input.source,'circle',4)}});
        return [contact(c,area(input.enemies,input.source,'circle',4),input.now)];
    }
    return {createState,start,update,receiveHit,targets,facing,free,behind,cross};
})();
safeExposeGlobals({skillGemCasts});
