/** Scheduled gem contacts. Inputs are combat snapshots; outputs are commands, never UI calls.
 * Casts are transient and captured with the combat runtime during offline simulation.
 */
const skillGemCasts = (() => {
    const cell = unit => ({gx:unit.gx, gy:unit.gy});
    const same = (a,b) => a.gx===b.gx && a.gy===b.gy;
    const distance = (a,b) => Math.hypot(a.gx-b.gx,a.gy-b.gy);
    const dirs = {2:[0,1],4:[-1,0],6:[1,0],8:[0,-1]};
    // Gems that never overlap themselves: the clock, the assassination and the movement gems.
    const SINGLE_CAST = new Set([46,52,54,55,56,70,77]);
    // 효과 확장 +N (js/skill-effect-expansion.js): 탄성 플라스크 bounces, 폭발 혼합물·신성한 안개 radius, 파문심판 cross arms,
    // 빈 플라스크 shard reach, 암살 reach and 전도성 난격 cuts grow by it; 신성한 기도·시간 가속·과냉각 혼합물 never do.
    const grow = stats => skillEffectExpansion.extra(stats && stats.sSkill);
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
    /** A landing cell: on the board, walkable (walls and sealed gates block), not under a living enemy, not where the story guide
     * stands (js/act-exploration-doors.js guideCells) and not on a map object (a chest, a jar, a nest: like grid blinks, 2026-10-20). */
    function free(destination,enemies) {
        const taken=new Set(enemies.flatMap(e=>getGridUnitCells(e).map(c=>gridCellKey(c.gx,c.gy)))),run=actExplorationState.current(game);
        actExplorationDoors.guideCells(run).forEach(key=>taken.add(key));
        actExplorationState.objects.solidCells(run).forEach(key=>taken.add(key));
        return canPlaceGridFootprint(taken,destination.gx,destination.gy,{columns:1,rows:1});
    }
    const nearness=(c,source)=>Math.max(Math.abs(c.gx-source.gx),Math.abs(c.gy-source.gy))*100+(c.gx-source.gx)**2+(c.gy-source.gy)**2;
    /** Where 암살 may land, in order: straight behind the enemy, then its two sides (the one nearer the caster first). */
    function blindSpots(enemy,source) {
        const direction=enemy.facingDirection || facing(enemy,source),size=getGridUnitFootprint(enemy),at=cell(enemy);
        const sides=direction===4 || direction===6 ? [{gx:at.gx,gy:at.gy-1},{gx:at.gx,gy:at.gy+size.rows}]
            : [{gx:at.gx-1,gy:at.gy},{gx:at.gx+size.columns,gy:at.gy}];
        return [behind(enemy,source),...sides.sort((a,b)=>nearness(a,source)-nearness(b,source))];
    }
    function landing(enemy,source,enemies) {return blindSpots(enemy,source).find(c=>free(c,enemies)) || null;}
    /** Facing (2/4/6/8) from the landing cell toward the enemy: the dagger strikes from where the assassin stands. */
    function toward(from,enemy) {
        const center=getGridUnitCenter(enemy),x=center.gx-from.gx,y=center.gy-from.gy;
        return Math.abs(x)>=Math.abs(y) ? (x<0?4:6) : (y<0?8:2);
    }
    const onCross=(c,center,radius)=>{const x=Math.abs(c.gx-center.gx),y=Math.abs(c.gy-center.gy);return (x===0 || y===0) && x+y<=radius;};
    function cross(source,target,radius=1) {
        for(const [direction,[x,y]] of Object.entries(dirs)) {
            const center={gx:source.gx+x*2,gy:source.gy+y*2};
            if(hasGridCell(center) && getGridUnitCells(target).some(c=>onCross(c,center,radius))) {
                return {center,direction:Number(direction)};
            }
        }
        return null;
    }
    function targets(id,source,enemies,extra=0) {
        const live=enemies.filter(e=>e.hp>0);
        if(MOVES[id])return moveTargets(id,source,live,extra);
        if(id===51)return live.filter(e=>cross(source,e,1+extra));
        if(id===52)return live.filter(e=>getGridUnitDistance(source,e)<=4+extra && landing(e,source,live));
        if(id===70)return live.filter(e=>getGridUnitDistance(source,e)<=FLICKER.first && flickerLanding(e,cell(source),live));
        const range=({44:9,45:3,46:3,47:4,48:4,49:4,50:1+extra,78:HOMING.cells+extra,79:4,80:TIME_SLASH.range+extra})[id];
        return live.filter(e=>getGridUnitCells(e).some(c=>inArea(id,source,c,range)));
    }
    function inArea(id,source,c,range) {
        if(id===45 || id===50)return Math.max(Math.abs(c.gx-source.gx),Math.abs(c.gy-source.gy))<=range && !same(c,source);
        return distance(source,c)<=range;
    }
    function area(enemies,center,shape,radius) {
        return enemies.filter(e=>e.hp>0 && getGridUnitCells(e).some(c=>{
            const x=Math.abs(c.gx-center.gx),y=Math.abs(c.gy-center.gy);
            if(shape==='cross')return (x===0 || y===0) && x+y<=radius;
            if(shape==='square')return Math.max(x,y)<=radius;
            if(shape==='ring')return distance(c,center)>radius-.5 && distance(c,center)<=radius+.5;
            return distance(c,center)<=radius;
        }));
    }
    /** The pattern's floor cells on the live board: the act map on wide maps, in bounds and walkable (walls and sealed
     * gates stay dark). It used to pick from a fixed 9×8 board, so a wide map's floor strikes drew nothing. */
    function cells(center,shape,radius) {
        const board=[],open=new Set();
        for(let gy=Math.floor(center.gy-radius);gy<=Math.ceil(center.gy+radius);gy++) {
            for(let gx=Math.floor(center.gx-radius);gx<=Math.ceil(center.gx+radius);gx++) {
                if(canPlaceGridFootprint(open,gx,gy,{columns:1,rows:1}))board.push({gx,gy,hp:1});
            }
        }
        return area(board,center,shape,radius).map(cell);
    }
    function createState() {return {casts:[],events:[],sequence:0,lastSkill:''};}
    function event(cast,phase,at,duration,extra={}) {
        const keys={44:'flaskPhase',45:'lancePhase',46:'timePhase',47:'mixturePhase',48:'supercooledPhase',
            49:'emptyFlaskPhase',50:'holyMistPhase',51:'judgmentPhase',52:'assassinationPhase',
            54:'riftPhase',55:'smokePhase',56:'harpoonPhase',70:'flickerPhase',77:'rockFlaskPhase',78:'homingPhase',79:'petrifyPhase',80:'timeSlashPhase'};
        const travel=['flight','flask','shard','fall'].includes(phase);
        const ground=['clock','wave','mist'].includes(phase);
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
            targets:targets.map(e=>e.id),at,key:cast.key,splashCells:contactCells(cast),...extra};
    }
    /** Damaging geometry, independent of victims and visual events. Props never enter the targeting/bounce pool. */
    function contactCells(c) {
        const resolver=contactAreas[c.id];return resolver?resolver(c):[];
    }
    const contactAreas={45:c=>c.points,46:c=>cells(c.source,'circle',3),47:c=>cells(c.aim,'square',1+grow(c.stats)),
        48:c=>cells(c.aim,'ring',c.index+1).concat(c.index?[]:cells(c.aim,'square',.5)),
        50:c=>cells(c.source,'square',1+grow(c.stats)).filter(p=>!same(p,c.source)),51:c=>cells(c.aim,'cross',c.geometry.crossRadius),
        54:c=>cells(c.move.to,'square',moveRadius(c)),55:c=>cells(c.move.to,'square',SMOKE_RADIUS),77:c=>cells(c.move.foe,'square',moveRadius(c)),79:c=>cells(c.aim,'circle',petrifyRadius(c))};
    function flight(cast,base,perCell) {
        return Math.max(1,Math.round((base+distance(cast.source,cast.aim)*perCell)/cast.speed/1.8));
    }
    function start(state,input) {
        const {id,name,stats,source,enemies,now}=input;
        state.visuals=input.visuals;
        const options=targets(id,source,enemies,grow(stats));
        if(!options.length)return false;
        if(SINGLE_CAST.has(id) && state.casts.some(c=>c.id===id))return false;
        // 잠근 몬스터(js/act-exploration-state.js lockOn)가 닿으면 그 몬스터를, 아니면 가장 가까운 몬스터를 노린다(다른 룬과 같다).
        const locked=actExplorationState.lockedEnemy(actExplorationState.current(game));
        const target=(locked && options.find(enemy=>enemy.id===locked.id)) || findNearestGridEnemy(source,options);
        const cast={id,name,stats,attackOptions:input.attackOptions,source:cell(source),aim:getGridUnitCenter(target),targetId:target.id,
            speed:Math.max(.5,Math.min(2.5,stats.aspd)),key:'gem-'+(++state.sequence),at:now,index:0,nextAt:now};
        state.lastSkill=name;
        if(id===44)cast.targetId=null;
        launch[id](state,cast,enemies);
        state.casts.push(cast);
        return true;
    }
    /** 무대의 주인공이 놓는 순간(js/combat.js noteNativeGemSwing): 그 룬의 동작이 이때 타격 장에 온다. */
    const letGo=(c,impact,until)=>{c.swing={impact,until};};
    function launchFlask(state,c) {
        const phase=c.id===49?'flask':'flight',release=c.at+ms(c,FLASK_RELEASE);
        c.nextAt=c.at+flight(c,420,c.id===49?45:50);
        letGo(c,release,release+ms(c,160));
        visual(state,c,phase,release,Math.max(1,c.nextAt-release));
    }
    function launchLance(state,c,enemies) {
        c.points=targets(45,c.source,enemies).map(getGridUnitCenter);
        c.nextAt=c.at+440/c.speed;
        letGo(c,c.at+180/c.speed,c.nextAt);
        visual(state,c,'fall',c.at+180/c.speed,260/c.speed,{targetCells:c.points});
    }
    function launchClock(state,c) {
        const pattern=c.stats.sSkill.combatPattern;
        c.nextAt=c.at+pattern.intervalMs;
        letGo(c,c.at+ms(c,120),c.at+ms(c,320));
        c.event=visual(state,c,'clock',c.at,pattern.durationMs+200,{timeCenter:cell(c.source),timeRadius:3,
            timeTickTimes:Array.from({length:pattern.ticks},(_,i)=>c.at+(i+1)*pattern.intervalMs),timeTickTargets:[],sourcePath:[]});
    }
    /** 신성한 안개(2026-11-01 전달본 V3.6): 향로 회전 동작(9장 0.69초)을 제 시간대로 튼다. 마지막 타격 장(7장)이 0.52초에 온다. 연기는 그 동작의 향로 머리에서 난다. */
    const MIST_LAST_STRIKE=520;
    function launchMist(state,c) {
        c.nextAt=c.at+Math.round(330/c.speed);
        const strike=c.at+ms(c,MIST_LAST_STRIKE);
        letGo(c,strike,strike);
        c.event=visual(state,c,'censer',c.at,ms(c,690),{holySource:cell(c.source),holyRate:c.speed});
    }
    /** 파문심판(2026-11-01 전달본 V3.6): 향로 강타 동작이 바닥에 닿는 장에 맞춰 친다(비술사만 한 장 늦다). 낙뢰는 십자의 칸마다 가까운 곳부터 0.045초 간격으로 내려친다. */
    const JUDGMENT=Object.freeze({contact:540,frame:6,mageContact:630,mageFrame:7,gap:45});
    function launchJudgment(state,c,enemies) {
        const radius=1+grow(c.stats),plan=cross(c.source,enemies.find(e=>e.id===c.targetId),radius),mage=getHeroAppearanceId()==='occultist';
        c.aim=plan.center;c.nextAt=c.at+Math.round((mage?JUDGMENT.mageContact:JUDGMENT.contact)/c.speed);c.direction=plan.direction;
        const near=cells(c.aim,'cross',radius).sort((a,b)=>distance(c.source,a)-distance(c.source,b));
        c.geometry={judgmentDirection:c.direction,crossRadius:radius,impactOffsetMs:c.nextAt-c.at,judgmentRate:c.speed,judgmentCells:near,
            holdMs:Math.round(140/c.speed),footprint:{cells:near}};
        letGo(c,c.nextAt,c.nextAt+c.geometry.holdMs);
        c.swing.contactFrame=mage?JUDGMENT.mageFrame:JUDGMENT.frame;
        visual(state,c,'censer',c.at,c.nextAt-c.at+c.geometry.holdMs,c.geometry);
    }
    /** 암살: 박차고 나간 뒤(2026-10-20 스킬룬 전달본 v42, 무대의 주인공은 한손검 이동 동작) 사라져 등 뒤에 나타나 찌른다. 사라짐은 박차고
     * 나가는 만큼(lead) 늦다. */
    function launchAssassin(state,c) {
        state.pose=c;
        c.lead=ms(c,240);c.nextAt=c.at+c.lead+100;
        c.swing={impact:c.at+Math.round(c.lead*0.75),until:c.at+c.lead+ms(c,60),pose:'kickoff'};
        visual(state,c,'vanish',c.at+c.lead,180,{blinkCell:cell(c.source)});
    }
    /** 탄성 플라스크(2026-10-17 스킬룬 인계 v32)의 다음 대상: 처음에는 사거리 안의 가장 가까운 적. 그 뒤로는 3칸 안의 아직 안 맞은 적,
     * 없으면 3칸 안의 다른 적(둘이면 왔다 갔다), 그것도 없으면 같은 적에게 다시(제자리에서 높이 튄다). */
    const BOUNCE_REACH=3;
    function bounceTarget(c,enemies) {
        const live=enemies.filter(e=>e.hp>0);
        if(c.targetId===null)return findNearestGridEnemy(c.source,targets(44,c.source,live,grow(c.stats)));
        const near=live.filter(e=>e.id!==c.targetId && distance(c.aim,getGridUnitCenter(e))<=BOUNCE_REACH);
        const fresh=near.filter(e=>!c.struck.has(e.id));
        if(fresh.length || near.length)return findNearestGridEnemy(c.aim,fresh.length?fresh:near);
        return live.find(e=>e.id===c.targetId) || null;
    }
    function bounce(state,c,enemies) {
        c.struck ??= new Set();
        const target=bounceTarget(c,enemies);
        if(!target){c.done=true;return;}
        c.struck.add(target.id);
        c.targetId=target.id;c.aim=getGridUnitCenter(target);
        const duration=Math.round(Math.max(340,Math.min(520,300+distance(c.source,c.aim)*45))/c.speed/1.8);
        const release=c.struck.size===1 ? Math.min(c.nextAt+ms(c,FLASK_RELEASE),c.nextAt+duration-1) : c.nextAt;   // 첫 투척은 손을 떠날 때부터 난다
        if(c.struck.size===1)letGo(c,release,release+ms(c,160));
        visual(state,c,'flight',release,c.nextAt+duration-release);c.nextAt+=duration;
    }
    // ---------------------------------------------------------------- 54~56 이동기 (스킬 변경분 2 · 인계 mob4_core.js. 57 공중강타는 2026-10-13에 지웠다)
    // Reach is Euclidean; a landing is free (see free()) and never the caster's own cell; timings scale with attack speed.
    // Each cast carries its whole choreography in c.move (one 'move' event) for the redrawn art and the caster's motion.
    const MOVES={54:{range:4,grows:'radius'},55:{range:5,grows:'range'},56:{range:5,grows:'range'},77:{range:5,grows:'radius'}};
    const N8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    const reach2=(a,b)=>(a.gx-b.gx)**2+(a.gy-b.gy)**2;
    const ms=(c,value)=>Math.round(value/c.speed);
    /** 플라스크가 손을 떠나는 때(시전 뒤 ms, 공격 속도로 줄어든다): 주인공의 던지기 동작이 그 장에 온다. 떨어지는 때는 그대로다. */
    const FLASK_RELEASE=90;
    const moveReach=(id,extra)=>MOVES[id].range+(MOVES[id].grows==='range'?extra:0);
    const moveRadius=c=>1+(MOVES[c.id].grows==='radius'?grow(c.stats):0);
    function lineCells(a,b) {
        const n=Math.max(Math.abs(b.gx-a.gx),Math.abs(b.gy-a.gy)),out=[];
        for(let i=1;i<=n;i++)out.push({gx:Math.round(a.gx+(b.gx-a.gx)*i/n),gy:Math.round(a.gy+(b.gy-a.gy)*i/n)});
        return out;
    }
    /** The neighbour of c that passes ok and lies nearest the caster (straight before diagonal on a tie). */
    function nearestNeighbour(c,source,ok) {
        let best=null,bd=Infinity;
        for(const [dx,dy] of N8) {
            const q={gx:c.gx+dx,gy:c.gy+dy},d=reach2(q,source)+(dx && dy?.01:0);
            if(d<bd && ok(q)){bd=d;best=q;}
        }
        return best;
    }
    /** 차원찢기 lands on the aimed cell if free, else on the first free cell back toward the caster, else on the aimed
     * cell's free neighbour nearest the caster — always within reach. */
    function landNear(source,want,enemies,range) {
        const ok=c=>!same(c,source) && reach2(source,c)<=range*range && free(c,enemies);
        return ok(want) ? cell(want) : (lineCells(want,source).find(ok) || nearestNeighbour(want,source,ok));
    }
    /** 향로구름: the target's free neighbour nearest the caster. */
    function besideTarget(source,target,enemies) {return nearestNeighbour(target,source,c=>!same(c,source) && free(c,enemies));}
    /** 작살화살: the last free cell on the way in when it touches the target, else the target's free neighbour nearest the
     * archer; none when the archer already stands next to it. */
    function pullLanding(source,target,enemies) {
        const touches=c=>Math.max(Math.abs(c.gx-target.gx),Math.abs(c.gy-target.gy))<=1;
        if(touches(source))return null;
        const before=lineCells(source,target).slice(0,-1).reverse().find(c=>free(c,enemies));
        return before && touches(before) ? before : nearestNeighbour(target,source,c=>free(c,enemies));
    }
    function moveTargets(id,source,live,extra) {
        const range=moveReach(id,extra);
        return live.filter(e=>{
            const aim=getClosestGridUnitCell(source,e);
            if(reach2(source,aim)>range*range)return false;
            if(id===56 || id===77)return true;
            return !!(id===55 ? besideTarget(source,aim,live) : landNear(source,aim,live,range));
        });
    }
    function moveStart(state,c,enemies) {
        const live=enemies.filter(e=>e.hp>0);
        state.pose=c;
        return {live,aim:getClosestGridUnitCell(c.source,live.find(e=>e.id===c.targetId))};
    }
    function launchRift(state,c,enemies) {                   // 54: a tear before the caster, out of a second one
        const {live,aim}=moveStart(state,c,enemies),to=landNear(c.source,aim,live,moveReach(54,grow(c.stats)));
        if(!to){c.done=true;return;}
        const tear=c.at+ms(c,300),close=tear+ms(c,380);
        c.move={from:cell(c.source),to,tear,openB:tear+ms(c,120),vanish:[tear+ms(c,80),tear+ms(c,340)],close,burst:close+ms(c,40),
            swing:{impact:tear,until:tear+ms(c,140)}};
        c.nextAt=tear+ms(c,210);
        visual(state,c,'move',c.at,c.move.burst+ms(c,520)-c.at,{move:c.move,targetCells:[to],footprint:{center:to,radius:moveRadius(c)}});
    }
    const SMOKE_RADIUS=1;
    function launchSmoke(state,c,enemies) {                  // 55: a smoke puff, then out of another beside the target
        const {live,aim}=moveStart(state,c,enemies),to=besideTarget(c.source,aim,live);
        if(!to){c.done=true;return;}
        const puff=c.at+ms(c,400);
        c.move={from:cell(c.source),to,foe:aim,puff,puffB:puff+ms(c,120),vanish:[puff+ms(c,30),puff+ms(c,310)],lifeA:ms(c,720),lifeB:ms(c,1000),
            swing:{impact:puff,until:puff+ms(c,140)}};
        c.nextAt=puff+ms(c,170);
        visual(state,c,'move',c.at,c.move.puffB+c.move.lifeB+80-c.at,{move:c.move,targetCells:[aim]});
    }
    function launchHarpoon(state,c,enemies) {                // 56: the harpoon strikes, the rope pulls the archer in
        const {live,aim}=moveStart(state,c,enemies),to=pullLanding(c.source,aim,live);
        const release=c.at+ms(c,360),hitAt=release+ms(c,70+distance(c.source,aim)*42),pull0=hitAt+ms(c,90);
        const pull1=to ? pull0+ms(c,70+distance(c.source,to)*75) : hitAt;
        c.move={from:cell(c.source),to:to || cell(c.source),foe:aim,release,hitAt,pull0,pull1,moved:!!to,swing:{impact:release,until:release+ms(c,140)}};
        c.nextAt=hitAt;
        visual(state,c,'move',c.at,pull1+ms(c,420)-c.at,{move:c.move,targetCells:[aim]});
    }
    /** 77 바위 플라스크(2026-10-20 스킬룬 추가본 v44, 사용자 구상): 줄 매단 바위 병을 던져 떨어진 자리 둘레(3×3, 효과 확장 +N칸)를 치고,
     * 0.11초 뒤 줄을 당겨 그 앞 칸까지 0.26초에 돌진한다(작살화살의 pullLanding, 이미 붙어 있으면 줄만 당긴다). 던진 팔은 돌진이 끝날 때까지
     * 뻗은 채다(c.move.swing의 until). 대상이 없으면 쓰지 않는다(작살화살과 같다). */
    function launchRockFlask(state,c,enemies) {
        const {live,aim}=moveStart(state,c,enemies),to=pullLanding(c.source,aim,live);
        const release=c.at+ms(c,360),hitAt=release+ms(c,300+distance(c.source,aim)*32),pull0=hitAt+ms(c,110);
        const pull1=to ? pull0+ms(c,260) : pull0;
        c.move={from:cell(c.source),to:to || cell(c.source),foe:aim,release,hitAt,pull0,pull1,moved:!!to,swing:{impact:release,until:pull1+ms(c,60)}};
        c.nextAt=hitAt;
        visual(state,c,'move',c.at,pull1+ms(c,420)-c.at,{move:c.move,targetCells:[aim],footprint:{center:aim,radius:moveRadius(c)}});
    }
    // ---------------------------------------------------------------- 70 전도성 난격 (2026-10-19 스킬룬 인계 v36: 점멸)
    // 번개가 되어 적 사이를 순간이동하며 벤다(사용자: 패스오브 엑자일 1의 점멸 타격처럼). 처음엔 5칸 안 가장 가까운 적 곁으로, 그다음
    // 0.15초마다 그 적에게서 4칸 안의 아직 안 벤 적(가까운 순), 다 벴으면 덜 벤 적, 혼자 남은 적은 반대편으로 건너가 다시 벤다.
    // 모두 6번(효과 확장 +N = 횟수), 마지막 자리에 바닥 방전. 한 번 건널 때: 사라짐 0.04초, 적 옆에 단타 자세로 나타나 0.03초 뒤 벤다.
    // 값(6번, 5칸, 4칸, 0.15초, 피해 70)은 인계의 제안 값이다. 한 번 건너기가 한 걸음이라 전투 틱(0.1초)에 맞춰 건넌다.
    const FLICKER={first:5,jump:4,cuts:6,every:150,appear:40,cut:70,pose:110};
    const flickerNear=origin=>(a,b)=>getGridUnitDistance(origin,a)-getGridUnitDistance(origin,b);
    /** Where to stand beside the foe: its left or right neighbour on its middle row (the side nearer `from` first), else any free
     * neighbour nearest `from`. Never `from` itself, so the same foe is crossed to its other side. */
    function flickerLanding(enemy,from,live) {
        const at=cell(enemy),size=getGridUnitFootprint(enemy),gy=at.gy+Math.floor((size.rows-1)/2);
        const sides=[{gx:at.gx-1,gy},{gx:at.gx+size.columns,gy}];
        if(from.gx>getGridUnitCenter(enemy).gx)sides.reverse();
        const ok=q=>!same(q,from) && free(q,live);
        return sides.find(ok) || nearestNeighbour(getClosestGridUnitCell(from,enemy),from,ok);
    }
    /** Foes in the order the next cut tries them. */
    function flickerOrder(c,live,from) {
        if(!c.index) {
            const first=live.find(e=>e.id===c.targetId);
            return [first,...live.filter(e=>e!==first && getGridUnitDistance(from,e)<=FLICKER.first).sort(flickerNear(from))].filter(Boolean);
        }
        const last=live.find(e=>e.id===c.prev),base=last||from;
        const near=live.filter(e=>e!==last && getGridUnitDistance(base,e)<=FLICKER.jump).sort(flickerNear(base));
        const fresh=near.filter(e=>!c.struck.has(e.id)),again=near.filter(e=>c.struck.has(e.id)).sort((a,b)=>c.struck.get(a.id)-c.struck.get(b.id));
        return [...fresh,...again,...(last?[last]:[])];
    }
    function launchFlicker(state,c) {
        c.struck=new Map();c.prev=null;c.holds=true;c.total=FLICKER.cuts+grow(c.stats);
    }
    /** The last spot discharges into the floor; a flicker that found no foe at all just ends. */
    function flickerEnd(state,c,spot,at) {
        c.done=true;
        if(!c.index){c.failed=true;return [];}
        visual(state,c,'discharge',at+ms(c,40),ms(c,320),{sourceCell:spot,landingCell:spot,targetCells:[spot]});
        return [];
    }
    // ---------------------------------------------------------------- 78 추적 사격 (2026-11-01 스킬 전체 전달본 V3.6)
    // 쏜 화살이 가장 가까운 적 쪽으로 초당 11라디안까지 방향을 틀며 난다. 판정은 화면과 같은 도트 공간(칸 64×32)에서 20ms 걸음으로 본다. 대상이 쓰러지면
    // 아직 안 맞힌 다음 적을 쫓고, 같은 발사의 화살끼리는 서로 다른 적을 고른다. 한 번 맞히면 사라지고, 8칸(효과 확장 +N칸)을 날면 사라진다.
    // 속도는 전달본의 640(칸 72)을 칸 64로 옮긴 값이라 회전 반지름 약 0.8칸이 같다.
    const HOMING={cells:8,wide:64,deep:32,speed:569,turn:11,stepMs:20,release:200,spread:.35,hitX:32,hitY:16};
    function launchHoming(state,c,enemies) {
        const release=c.at+ms(c,HOMING.release),shots=1+rollProjectileExtraShots(c.stats.projectileExtraShots);
        const foe=getGridUnitCenter(enemies.find(e=>e.id===c.targetId)),base=Math.atan2((foe.gy-c.source.gy)*HOMING.deep,(foe.gx-c.source.gx)*HOMING.wide);
        letGo(c,release,release+ms(c,160));
        c.nextAt=release;c.flownTo=release;c.claimed=new Set();
        c.arrows=Array.from({length:shots},(_,i)=>({gx:c.source.gx,gy:c.source.gy,angle:base+(i-(shots-1)/2)*HOMING.spread,flown:0,foe:null,dead:false,
            path:[{at:release,gx:c.source.gx,gy:c.source.gy,angle:base+(i-(shots-1)/2)*HOMING.spread}]}));
        c.arrows.forEach(arrow=>{arrow.event=visual(state,c,'fly',release,4000,{homingPath:arrow.path,sourceCell:cell(c.source)});});
    }
    /** 화살이 쫓는 적: 쫓던 적이 살아 있으면 그대로, 아니면 다른 화살이 안 고른 가장 가까운 적, 그것도 없으면 가장 가까운 적. */
    function homingFoe(c,arrow,live) {
        if(arrow.foe && live.includes(arrow.foe))return arrow.foe;
        const pool=live.filter(e=>!c.claimed.has(e.id)),near=(a,b)=>homingGap(arrow,a)-homingGap(arrow,b);
        arrow.foe=(pool.length?pool:live).slice().sort(near)[0]||null;
        if(arrow.foe)c.claimed.add(arrow.foe.id);
        return arrow.foe;
    }
    const homingGap=(arrow,e)=>{const p=getGridUnitCenter(e);return Math.hypot((p.gx-arrow.gx)*HOMING.wide,(p.gy-arrow.gy)*HOMING.deep);};
    const homingTouches=(arrow,e)=>getGridUnitCells(e).some(p=>Math.abs((p.gx-arrow.gx)*HOMING.wide)<=HOMING.hitX && Math.abs((p.gy-arrow.gy)*HOMING.deep)<=HOMING.hitY);
    /** 한 걸음: 쫓는 적 쪽으로 돌고 나아간다. 닿은 적을 돌려준다. */
    function homingStep(c,arrow,live) {
        const foe=homingFoe(c,arrow,live),step=HOMING.speed*HOMING.stepMs/1000;
        if(foe) {
            const p=getGridUnitCenter(foe),want=Math.atan2((p.gy-arrow.gy)*HOMING.deep,(p.gx-arrow.gx)*HOMING.wide),turn=Math.atan2(Math.sin(want-arrow.angle),Math.cos(want-arrow.angle)),limit=HOMING.turn*HOMING.stepMs/1000;
            arrow.angle+=Math.max(-limit,Math.min(limit,turn));
        }
        arrow.gx+=Math.cos(arrow.angle)*step/HOMING.wide;arrow.gy+=Math.sin(arrow.angle)*step/HOMING.deep;arrow.flown+=step;
        return live.find(e=>homingTouches(arrow,e))||null;
    }
    function homingEnd(arrow,at) {
        arrow.dead=true;
        arrow.event.duration=at-arrow.event.at+40;
    }
    /** 화살 하나를 지금까지 날린다: 닿으면 그때의 타격 명령을 돌려준다. */
    function homingFly(c,arrow,live,at) {
        const reach=(HOMING.cells+grow(c.stats))*HOMING.wide;
        if(arrow.dead)return null;
        const hit=homingStep(c,arrow,live);
        arrow.path.push({at,gx:arrow.gx,gy:arrow.gy,angle:arrow.angle});
        if(hit){homingEnd(arrow,at);return contact(c,[hit],at);}
        if(arrow.flown>=reach){homingEnd(arrow,at);arrow.event.homingMissed=true;}
        return null;
    }
    function stepHoming(state,c,input) {
        const live=input.enemies.filter(e=>e.hp>0),commands=[];
        for(;c.flownTo+HOMING.stepMs<=input.now;c.flownTo+=HOMING.stepMs) {
            for(const arrow of c.arrows) {
                const hit=homingFly(c,arrow,live,c.flownTo+HOMING.stepMs);
                if(hit)commands.push(hit);
            }
        }
        c.nextAt=input.now;
        c.done=c.arrows.every(arrow=>arrow.dead);
        return commands;
    }
    // ---------------------------------------------------------------- 79 석화 혼합물 (같은 전달본)
    // 던진 병이 떨어진 자리 둘레 1.5칸(효과 확장 +N칸)을 치고 굳힌다. 굳히는 일은 js/combat.js가 맡는다(보스는 굳지 않는다).
    const PETRIFY={radius:1.5,ms:1800};
    const petrifyRadius=c=>PETRIFY.radius+grow(c.stats);
    function stepPetrify(state,c,input) {
        const radius=petrifyRadius(c),hit=area(input.enemies,c.aim,'circle',radius);
        visual(state,c,'shatter',c.nextAt,700,{footprint:{center:cell(c.aim),radius}});
        c.done=true;
        return [contact(c,hit,c.nextAt),{type:'petrify',targets:hit.map(e=>e.id),at:c.nextAt,ms:PETRIFY.ms}];
    }
    // ---------------------------------------------------------------- 80 시간의 사선 (같은 전달본, 시뮬레이터 time-slash-homage.js)
    // 공격 속도 1에서 찌르기 7장 0.89초. 2번째 장(0.23초)에 6칸 안의 적을 1.3초 둔화하고(이동만 30%, js/combat.js) 대상을 정한다. 칼날이 대상 머리 위에 서 있다가
    // 0.12초에 날아가 맞힌다(궁수와 성직자는 칼이 앞으로 나오는 장이 하나 늦어 0.66초, 나머지 0.46초). 투사체 N발은 가까운 적 N명에게 먼저, 모자라면 0.06초 간격으로
    // 다시 친다. 대상마다 첫 적중은 2칸 안의 다른 적 둘에게 20% 피해로 0.09초 뒤 튕긴다(주대상과 이미 튕긴 적은 빼고, 다시 튕기지 않는다). 칼날 일곱은 그림이고 피해는 한 번이다.
    const TIME_SLASH={range:6,cycle:890,slowStart:229.7,slow:1300,hit:459.4,lateHit:660.3,lateClasses:new Set(['archer','cleric']),flight:120,again:60,bounce:90,bounceReach:2,bounceTargets:2,bouncePct:20};
    function launchTimeSlash(state,c) {
        const late=TIME_SLASH.lateClasses.has(getHeroAppearanceId());
        c.hitDelay=ms(c,late?TIME_SLASH.lateHit:TIME_SLASH.hit);c.flightMs=ms(c,TIME_SLASH.flight);
        letGo(c,c.at+ms(c,TIME_SLASH.hit),c.at+ms(c,TIME_SLASH.cycle));
        c.nextAt=c.at+ms(c,TIME_SLASH.slowStart);c.queue=[];c.bounced=new Set();c.primary=new Set();
    }
    /** 찌르기가 나가는 때: 둔화할 적과 치는 차례(strikes)를 정한다. 대상이 없으면 둔화만 남는다(시뮬레이터의 빈 시간장). */
    function timeSlashRelease(state,c,input) {
        const range=TIME_SLASH.range+grow(c.stats),near=input.enemies.filter(e=>e.hp>0 && getGridUnitCells(e).some(p=>distance(input.source,p)<=range)).sort((a,b)=>getGridUnitDistance(input.source,a)-getGridUnitDistance(input.source,b));
        const shots=1+rollProjectileExtraShots(c.stats.projectileExtraShots),aimed=near.slice(0,shots),at=c.at+c.hitDelay;
        c.index=1;c.source=cell(input.source);
        aimed.forEach(e=>c.primary.add(e.id));
        visual(state,c,'field',c.nextAt,ms(c,TIME_SLASH.cycle-TIME_SLASH.slowStart)+TIME_SLASH.slow,{timeSlowUntil:c.nextAt+TIME_SLASH.slow,timeActorEnd:c.at+ms(c,TIME_SLASH.cycle),timeSpeed:c.speed,sourceCell:c.source});
        for(let i=0;i<(aimed.length?shots:0);i++) {
            const foe=aimed[i%aimed.length],again=i>=aimed.length,arrive=at+(again?(i-aimed.length+1)*ms(c,TIME_SLASH.again):0);
            c.queue.push({at:arrive,kind:'strike',id:foe.id,first:!again,index:i});
            visual(state,c,'blades',c.nextAt,arrive-c.nextAt+ms(c,200),{timeFoe:foe.id,timeCell:getGridUnitCenter(foe),timeArrive:arrive,timeFly:again?ms(c,TIME_SLASH.again):c.flightMs,timeShot:i,timeSpeed:c.speed});
        }
        return [{type:'timeSlow',targets:near.map(e=>e.id),at:c.nextAt,ms:TIME_SLASH.slow}];
    }
    /** 첫 적중의 튕김: 2칸 안의 다른 적 둘(가까운 순). */
    function timeSlashBounces(state,c,foe,at,enemies) {
        const near=enemies.filter(e=>e.hp>0 && !c.primary.has(e.id) && !c.bounced.has(e.id) && getGridUnitDistance(foe,e)<=TIME_SLASH.bounceReach)
            .sort((a,b)=>getGridUnitDistance(foe,a)-getGridUnitDistance(foe,b)).slice(0,TIME_SLASH.bounceTargets);
        for(const e of near) {
            c.bounced.add(e.id);
            const arrive=at+ms(c,TIME_SLASH.bounce);
            c.queue.push({at:arrive,kind:'bounce',id:e.id});
            visual(state,c,'bounce',at,arrive-at+ms(c,110),{sourceCell:getGridUnitCenter(foe),landingCell:getGridUnitCenter(e),targetCells:[getGridUnitCenter(e)],timeArrive:arrive});
        }
    }
    function timeSlashContact(state,c,row,enemies) {
        const foe=enemies.find(e=>e.id===row.id && e.hp>0);
        if(!foe)return [];
        if(row.kind==='bounce')return [contact(c,[foe],row.at,{damagePct:TIME_SLASH.bouncePct,key:c.key+':'+row.id})];
        if(row.first)timeSlashBounces(state,c,foe,row.at,enemies);
        return [contact(c,[foe],row.at,{key:c.key+':'+row.index})];
    }
    function stepTimeSlash(state,c,input) {
        const commands=c.index?[]:timeSlashRelease(state,c,input);
        for(const row of c.queue.filter(row=>row.at<=input.now)) {
            c.queue.splice(c.queue.indexOf(row),1);
            commands.push(...timeSlashContact(state,c,row,input.enemies));
        }
        c.done=!c.queue.length;
        if(!c.done)c.nextAt=Math.min(...c.queue.map(row=>row.at));
        return commands;
    }
    const launch={44:bounce,45:launchLance,46:launchClock,47:launchFlask,48:launchFlask,49:launchFlask,
        50:launchMist,51:launchJudgment,52:launchAssassin,54:launchRift,55:launchSmoke,56:launchHarpoon,70:launchFlicker,77:launchRockFlask,78:launchHoming,79:launchFlask,80:launchTimeSlash};
    /** 튕길 때마다 떨어진 자리의 작은 중독 폭발: 1칸 안의 적에게 30%(인계의 제안 값). */
    const BOUNCE_POP_PCT=30;
    function stepBounce(state,c,input) {
        visual(state,c,'splash',c.nextAt,280/c.speed);
        const pop=contact(c,area(input.enemies,c.aim,'circle',1),c.nextAt,{damagePct:BOUNCE_POP_PCT,key:c.key+':pop'});
        const result=contact(c,input.enemies.filter(e=>e.id===c.targetId && e.hp>0),c.nextAt);
        c.index++;
        if(c.index===4+grow(c.stats))c.done=true;
        else {c.source=cell(c.aim);c.nextAt+=80/c.speed;c.pendingBounce=true;}
        return pop.targets.length ? [result,pop] : [result];
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
        c.nextAt+=c.stats.sSkill.combatPattern.intervalMs;c.done=++c.index===c.stats.sSkill.combatPattern.ticks;
        return [contact(c,hit,at,{type:'dot'})];
    }
    function stepExplosion(state,c,input) {
        visual(state,c,'burst',c.nextAt,Math.round(540/c.speed));c.done=true;
        return [contact(c,area(input.enemies,c.aim,'square',1+grow(c.stats)),c.nextAt)];
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
        const hit=targets(50,input.source,input.enemies,grow(c.stats));c.done=true;
        visual(state,c,'mist',c.nextAt,Math.round(700/c.speed),{holySource:cell(input.source),holyRadius:1+grow(c.stats)});
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
    /** 낙뢰 하나: 그 칸에 선 적(아직 안 맞은)을 친다. 마지막 차례에는 칸 목록에 없던 자리(벽에 걸친 큰 적)까지 빠짐없이 친다. */
    function stepJudgment(state,c,input) {
        if(!c.bolts){visual(state,c,'cross',c.nextAt,Math.round(420/c.speed),c.geometry);c.bolts=[...c.geometry.judgmentCells];c.struck=new Set();c.index=0;}
        const spot=c.bolts.shift(),inCross=area(input.enemies,c.aim,'cross',c.geometry.crossRadius),at=c.nextAt,step=c.index++;
        c.done=!c.bolts.length;
        const hit=inCross.filter(e=>!c.struck.has(e.id) && (c.done || !spot || getGridUnitCells(e).some(p=>same(p,spot))));
        hit.forEach(e=>c.struck.add(e.id));
        if(!c.done)c.nextAt+=ms(c,JUDGMENT.gap);
        return hit.length ? [contact(c,hit,at,{key:c.key+':'+step})] : [];
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
        const destination=landing(target,input.source,input.enemies.filter(e=>e.hp>0));
        if(!destination || getGridUnitDistance(input.source,target)>4+grow(c.stats)){c.done=true;c.failed=true;return [];}
        c.destination=destination;c.anchor=cell(target);c.direction=toward(destination,target);
        const lead=c.lead||0;c.index=1;c.nextAt=c.at+lead+240;
        visual(state,c,'arrive',c.at+lead+100,180,{blinkCell:cell(destination)});
        return [{type:'teleport',name:c.name,element:c.stats.sSkill.ele,from:cell(input.source),to:destination,at:c.at+lead+100,swing:{impactDelayMs:140,duration:260}}];
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
        const live=area(input.enemies,c.aim,'circle',3+grow(c.stats)),others=live.filter(e=>e.id!==c.targetId),unused=[...others];
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
    const moveTo=(c,motion)=>({type:'teleport',name:c.name,from:c.move.from,to:c.move.to,motion});
    /** The planned landing — or, if an enemy walked onto it meanwhile, its free neighbour nearest the caster (the art and
     * the caster's motion follow c.move.to). Null when nothing around it is free. */
    function landingNow(c,input) {
        const live=input.enemies.filter(e=>e.hp>0);
        if(free(c.move.to,live))return c.move.to;
        const near=nearestNeighbour(c.move.to,c.move.from,q=>!same(q,input.source) && free(q,live));
        if(near)c.move.to=near;
        return near;
    }
    function stepRift(state,c,input) {                       // mid-vanish: into one tear, out of the other; the burst
        if(!c.index) {
            c.index=1;c.nextAt=c.move.burst;
            if(!landingNow(c,input)){c.done=true;c.failed=true;return [];}
            return [moveTo(c,'vanish')];
        }
        c.done=true;
        return same(input.source,c.move.to) ? [contact(c,area(input.enemies,c.move.to,'square',moveRadius(c)),c.move.burst)] : [];
    }
    /** 향로구름(2026-11-01 전달본 V3.6): 닿는 순간 그 자리와 주변 1칸에 물리 피해를 대상마다 한 번 준다. */
    function stepSmoke(state,c,input) {
        c.done=true;
        if(!landingNow(c,input))return [];
        const hit=area(input.enemies,c.move.to,'square',SMOKE_RADIUS),move=moveTo(c,'vanish');
        c.source=c.move.to;
        return [move,contact(c,hit,c.nextAt)];
    }
    function stepHarpoon(state,c,input) {                    // the strike, then (if it moved) the arrival at the rope's end
        if(!c.index) {
            c.index=1;c.nextAt=c.move.pull1;c.done=!c.move.moved;
            const hit=contact(c,input.enemies.filter(e=>e.id===c.targetId && e.hp>0),c.move.hitAt);
            return c.move.moved ? [hit,harpoonPull(c)] : [hit];
        }
        c.done=true;
        return landingNow(c,input) ? [moveTo(c,'pull')] : [];
    }
    function stepRockFlask(state,c,input) {                  // the flask breaks around where it lands, then (if it moved) the dash
        if(!c.index) {
            c.index=1;c.nextAt=c.move.pull1;c.done=!c.move.moved;
            return [contact(c,area(input.enemies,c.move.foe,'square',moveRadius(c)),c.move.hitAt)];
        }
        c.done=true;
        return landingNow(c,input) ? [moveTo(c,'pull')] : [];
    }
    /** 작살화살이 끌려가는 동안 무대의 주인공이 밧줄을 당긴다(2026-10-20 v42, 활 이동 동작): 당기기 시작에 한 번 힘을 주고 끝까지. */
    function harpoonPull(c) {
        const m=c.move;
        return {type:'pose',name:c.name,element:c.stats.sSkill.ele,targets:[],swing:{impactDelayMs:m.pull0-m.hitAt+ms(c,60),duration:m.pull1-m.hitAt+ms(c,120),pose:'pull'}};
    }
    /** One cut: across to the next foe (teleport, arriving in the strike pose), then the hit; the last one discharges. */
    function stepFlicker(state,c,input) {
        const live=input.enemies.filter(e=>e.hp>0),from=cell(input.source),at=c.nextAt;
        let foe=null,to=null;
        for(const enemy of flickerOrder(c,live,from)){to=flickerLanding(enemy,from,live);if(to){foe=enemy;break;}}
        if(!foe)return flickerEnd(state,c,from,at);
        const aim=getGridUnitCenter(foe),cutAt=at+ms(c,FLICKER.cut),face=Math.sign(aim.gx-to.gx) || 1;
        visual(state,c,'jump',at,ms(c,240),{sourceCell:from,landingCell:to,targetCells:[to],flickerFace:face});
        visual(state,c,'cut',cutAt,ms(c,260),{sourceCell:to,landingCell:aim,targetCells:[aim],flickerIndex:c.index});
        c.struck.set(foe.id,(c.struck.get(foe.id)||0)+1);c.prev=foe.id;c.source=to;c.aim=aim;c.index++;c.nextAt=at+ms(c,FLICKER.every);
        const commands=[{type:'teleport',name:c.name,from,to,element:c.stats.sSkill.ele,
            swing:{impactDelayMs:ms(c,FLICKER.cut-FLICKER.appear),duration:ms(c,FLICKER.pose)}},contact(c,[foe],cutAt)];
        if(c.index>=c.total)flickerEnd(state,c,to,cutAt);
        return commands;
    }
    const steps={44:stepBounce,45:stepLance,46:stepClock,47:stepExplosion,48:stepCold,49:stepEmpty,
        50:stepMist,51:stepJudgment,52:stepAssassin,54:stepRift,55:stepSmoke,56:stepHarpoon,70:stepFlicker,77:stepRockFlask,78:stepHoming,79:stepPetrify,80:stepTimeSlash};
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
    return {createState,start,update,targets,facing,free,behind,blindSpots,cross,singleCast:SINGLE_CAST};
})();
safeExposeGlobals({skillGemCasts});
