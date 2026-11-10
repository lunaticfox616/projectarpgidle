// Exploration objects on the stage (js/canvas-stage-objects.js draws the sheet). Standing objects are actors sorted with the hero; broken
// pots and crates, a spent nest and ambush tracks are ground decals drawn on the terrain, under the fog, the loot and every actor.
// Until the sheet has arrived (it is fetched again after a failure, js/stage-asset-retry.js) nothing is drawn: the top-down field's
// 16-dot sprites that stood in were removed on 2026-11-11 (사용자: 구버전 맵 방식은 쓰지 않는다). DOM buttons provide touch/keyboard hit areas only.
actExplorationView.objects=(()=>{
    let layer,lastRun;
    const buttons=new Map();
    // 누를 수 있는 오브젝트는 그림 바깥에 밝은 도트 테를 한 겹 두르고 천천히 숨 쉬듯 밝아진다(2026-10-07 사용자 요청: 가장 어두운
    // 색의 제 테두리만으로는 어두운 바닥에 묻혔다). 색은 종류마다(상자 금빛, 봉인 보라, 몬스터가 나오는 둥지 주황, 항아리와 나무 상자
    // 옅은 빛), 마우스를 올리거나 초점이 가면 하얗게.
    const RIM={chest:'#ffd36b',sealed:'#e0b4ff',nest:'#ff9a6a',pot:'#f3d6a4',crate:'#f3d6a4'},RIM_HOT='#fff8e6';
    // 등급 있는 보급 상자의 테: 은은 차가운 흰빛, 금은 짙은 금빛(무대의 상자 그림에는 등급 빛깔을 옅게만 얹는다).
    const RIM_GRADE={silver:'#e4eefa',gold:'#ffbf2e'},rimColour=row=>(row.kind==='chest'&&RIM_GRADE[row.grade])||RIM[row.kind];
    const SILVER_HALO=0.3; // 은빛 상자 테 바깥의 옅은 한 겹(무대): 테의 불투명도에 곱한다
    let hovered=null;
    /** 누른 물건(상자의 pendingId): 주인공이 다가가 열거나 부술 때까지 테가 밝은 채로 멈추고 머리 위에 금빛 화살표가 선다
     * (2026-10-17 사용자 "상자, 항아리(파괴하거나 열러가기 전까지) 클릭 시 타겟이 지정되었다는 표시", js/canvas-target-marks.js). */
    function targeted(row) {
        const run=actExplorationState.current(game);
        return !!run?.objects && run.objects.pendingId===row.id && row.phase==='ready';
    }
    /** 테를 밝게 그리는가: 마우스를 올렸거나 초점이 갔거나, 누른 물건이다. */
    const lit=row=>hovered===row.id||targeted(row);
    /** Which picture a row shows, and whether it stands (actor) or lies on the floor (decal). */
    function look(row) {
        const spent=row.phase==='spent';
        if(row.kind==='chest')return {name:spent?'chestOpen':'chest',standing:true,tint:row.grade};
        if(row.kind==='sealed')return {name:spent?'sealedOpen':'sealed',standing:true};
        if(row.kind==='nest')return {name:spent?'nestSpent':'nest',standing:!spent};
        if(row.kind==='ambush')return {name:'tracks',standing:false};
        return {name:spent?(row.kind==='pot'?'potBroken':'crateBroken'):row.kind,standing:!spent};
    }
    let pending=null;
    /** Actor pass: standing objects join the sort, and the clickable ones are noted for flushButtons. */
    function append(actors,view) {
        const run=actExplorationState.current(game),p=view.gridProj;
        pending={run,p,rows:[]};
        if(!run?.objects)return;
        for(const row of run.objects.entries) {
            if(!actExplorationState.objects.visible(run,row))continue;
            const point=p.cellToScreen(row.gx,row.gy),y=point.y+p.actorGroundOffsetY;
            if(!nearScreen(point,view,p))continue; // 가 본 다른 방이나 지도 먼 곳의 물건은 그리지 않는다
            const ready=canClick(run,row);
            if(look(row).standing)actors.push({kind:'object',id:row.id,y,point,object:row,ready});
            if(ready&&onScreen(point,view))pending.rows.push({row,point});
        }
    }
    /** The buttons' DOM side, once the frame has drawn (renderBattlefield's end). Moving them between canvas calls made the next
     * ctx.font or ctx.filter recompute the page's styles mid-frame, once or twice a frame while the camera scrolled (2026-10-07
     * frame drops). */
    function flushButtons() {
        if(!pending)return;
        const {run,p,rows}=pending;
        pending=null;
        syncLayer(run);
        if(!run?.objects)return;
        const shown=new Set();
        for(const {row,point} of rows){button(row,point,p);shown.add(row.id);}
        for(const [id,node] of buttons)if(!shown.has(id)){node.remove();buttons.delete(id);}
    }
    function canClick(run,row) {return row.phase==='ready'&&row.kind!=='ambush'&&!run.arrival&&!run.completionApplied&&run.status==='active';}
    function onScreen(point,view) {return point.x>=0&&point.y>=0&&point.x<=view.width&&point.y<=view.height;}
    /** Whether an object's picture can touch the view ({width, height}): its cell is within DRAW_REACH cells of the screen. */
    const DRAW_REACH=3;
    function nearScreen(point,view,p) {
        const reach=p.tileW*DRAW_REACH;
        return point.x>=-reach&&point.y>=-reach&&point.x<=view.width+reach&&point.y<=view.height+reach;
    }
    function syncLayer(run) {
        if(!layer) {
            const wrap=document.getElementById('battlefield-wrap');if(!wrap)return;
            layer=document.createElement('div');layer.id='exploration-object-actions';layer.setAttribute('aria-label',_t('발견한 상자와 오브젝트'));
            wrap.appendChild(layer);
        }
        if(lastRun!==run){buttons.forEach(n=>n.remove());buttons.clear();lastRun=run;}
        layer.hidden=!run?.objects||!!game.isBackgroundCalculation;
    }
    function button(row,point,p) {
        if(!layer)return;
        let node=buttons.get(row.id);
        if(!node) {
            node=document.createElement('button');node.type='button';node.className='exploration-object-action';
            node.dataset.objectId=row.id;
            const action=['pot','crate'].includes(row.kind)?'부수기':row.kind==='nest'?'건드리기':'열기';
            const name=actExplorationState.objects.name(row);
            node.setAttribute('aria-label',`${name} ${action}`);
            const text=document.createElement('span');text.textContent=`${name} ${action}`;node.appendChild(text);
            node.addEventListener('click',event=>{event.stopPropagation();actExplorationProgress.objects.request(row.id);});
            const hot=on=>()=>{if(on)hovered=row.id;else if(hovered===row.id)hovered=null;};
            node.addEventListener('pointerenter',hot(true));node.addEventListener('focus',hot(true));
            node.addEventListener('pointerleave',hot(false));node.addEventListener('blur',hot(false));
            layer.appendChild(node);buttons.set(row.id,node);
        }
        const size=Math.max(28,p.tileW*.9),x=Math.round(point.x-size/2),y=Math.round(point.y+p.actorGroundOffsetY-size);
        const style=`left:${x}px;top:${y}px;width:${size}px;height:${size}px`;
        if(node.dataset.bounds!==style){node.style.cssText=style;node.dataset.bounds=style;}
        node.disabled=game.combatHalted||game.playerHp<=0||game.moveTimer>0;
    }
    /** Fog mode dims an object past the sight radius; a room seen whole (room mode) dims nothing. */
    function fade(row) {
        const run=actExplorationState.current(game);
        if(actExplorationSight.wholeRoom(run))return 1;
        const distance=Math.hypot(row.gx-game.gridPlayer.gx,row.gy-game.gridPlayer.gy);
        return Math.max(.35,1-Math.max(0,distance-actExplorationState.sight(run))*.08);
    }
    /** A standing object (actor pass): ground shadow, the sprite, a shake and a fuse bar while an event is about to burst. */
    function draw(ctx,actor,view) {
        if(!stageObjects.ready())return;
        drawStaged(ctx,actor,view);
        if(targeted(actor.object))targetArrow(ctx,actor,view);
    }
    /** 누른 물건 위의 금빛 화살표: 그림의 맨 위, 이름이 달린 물건(몬스터가 나오는 것)은 이름 위에 선다. */
    function targetArrow(ctx,actor,view) {
        const row=actor.object,tile=view.gridProj.tileW,dot=stageActors.scaleFor(tile);
        const top=stageObjects.top(look(row),{x:actor.point.x,y:actor.y,dot});
        const label=actExplorationState.objects.isEvent(row)?actor.y-tile*.98-8:Infinity;   // nameLabel의 글 위 끝
        targetMarks.arrow(ctx,actor.point.x,Math.min(top,label)-dot*2,dot);
    }
    /** 무대의 숨 쉬는 테. 은빛 상자는 테로 읽힌다: 덜 꺼지는 숨(.75~1)과 그 바깥 한 도트의 옅은 테(SILVER_HALO). */
    function drawStagedRim(ctx,row,at) {
        const hot=lit(row),silver=row.kind==='chest'&&row.grade==='silver'&&!hot,dot=at.dot;
        const wave=Math.sin(performance.now()/300+row.gx+row.gy),breath=hot?1:silver?.875+.125*wave:.6+.4*wave;
        if(silver) {
            ctx.globalAlpha=fade(row)*breath*SILVER_HALO;
            for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])stageObjects.outline(ctx,look(row),{x:at.x+dx*dot,y:at.y+dy*dot,dot},rimColour(row));
        }
        ctx.globalAlpha=fade(row)*breath;
        stageObjects.outline(ctx,look(row),at,hot?RIM_HOT:rimColour(row));
        ctx.globalAlpha=fade(row);
    }
    /** 옆에서 보는 무대(js/canvas-stage-objects.js): 캐릭터와 같은 도트 크기의 그림으로, 같은 그림자와 숨 쉬는 테, 흔들림, 도화선 막대. */
    function drawStaged(ctx,actor,view) {
        const row=actor.object,dot=stageActors.scaleFor(view.gridProj.tileW),now=getCombatTime(),tile=view.gridProj.tileW;
        const shake=row.phase==='warning'?Math.round(Math.sin(now/45))*dot*2:0,at={x:actor.point.x+shake,y:actor.y,dot};
        ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=fade(row);
        ctx.fillStyle='rgba(10,6,4,.4)';ctx.beginPath();ctx.ellipse(at.x+dot*2,at.y-dot,tile*.36,tile*.085,0,0,Math.PI*2);ctx.fill();
        if(actor.ready&&RIM[row.kind])drawStagedRim(ctx,row,at);
        stageObjects.draw(ctx,look(row),at);
        nameLabel(ctx,row,at.x,at.y-tile*.98);
        if(row.phase==='warning') {
            const width=tile*.7,left=at.x-width/2,top=at.y-tile*.78;
            ctx.fillStyle='#1a120d';ctx.fillRect(left-dot,top-dot,width+dot*2,dot*4);
            ctx.fillStyle=row.kind==='sealed'?'#b47ae0':'#dfae75';ctx.fillRect(left,top,width*(1-row.remainingMs/actExplorationState.objects.warningMs[row.kind]),dot*2);
        }
        ctx.restore();
    }
    /** 몬스터가 나오는 물체(봉인된 보물함, 알집, 매복 흔적)는 다 쓰기 전까지 머리 위에 이름이 달린다(2026-10-16 사용자: "몬스터가 나오는 컨텐츠는
     * 위에 이름이 달려있어야"). NPC 이름과 같은 글꼴, 테의 빛깔. y = 이름의 가운데(화면 px). */
    const NAME_FONT=`12px ${i18n.fontFamily("'Galmuri11'")}`;
    function nameLabel(ctx,row,x,y) {
        if(!actExplorationState.objects.isEvent(row)||row.phase==='spent')return;
        ctx.save();ctx.globalAlpha=1;ctx.font=NAME_FONT;ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.lineWidth=2;ctx.strokeStyle='rgba(8,6,4,0.9)';ctx.fillStyle=RIM[row.kind]||'#f3d6a4';
        const name=actExplorationState.objects.name(row);drawCrispCanvasText(ctx,name,x,y,'strokeText');drawCrispCanvasText(ctx,name,x,y);
        ctx.restore();
    }
    /** Where a floor decal is drawn, or null: the object lies on the floor, the player knows its cell and it is near the screen. */
    function decalPoint(run,row,p,area) {
        if(look(row).standing||!actExplorationState.objects.visible(run,row))return null;
        const point=p.cellToScreen(row.gx,row.gy);
        return nearScreen(point,area,p)?point:null;
    }
    /** Floor decals (terrain pass): broken pots and crates, a spent nest, ambush tracks. The fog drawn after covers unseen ones.
     * area = { width, height } of the view: decals off the screen are skipped. */
    function drawGround(ctx,run,p,area) {
        if(!run?.objects||!stageObjects.ready())return;
        for(const row of run.objects.entries) {
            const point=decalPoint(run,row,p,area);
            if(!point)continue;
            ctx.globalAlpha=row.kind==='ambush'&&row.phase==='ready'?.75:1;
            nameLabel(ctx,row,point.x,point.y+p.actorGroundOffsetY-p.tileW*.5);
            stageObjects.draw(ctx,look(row),{x:point.x,y:point.y+p.actorGroundOffsetY,dot:stageActors.scaleFor(p.tileW)});
        }
        ctx.globalAlpha=1;
    }
    addEventListener('project-idle:exploration-object',event=>{
        const {kind,name,objectKind}=event.detail;
        if(objectKind==='pot'||objectKind==='crate')return;
        addLog(kind==='spawn'?_t('{name}에서 몬스터가 나타났습니다.', { name }):_t('{name}의 전리품을 획득했습니다.', { name }),kind==='spawn'?'attack-monster':'loot-magic',{noToast:true});
    });
    return {append,flushButtons,draw,drawGround};
})();
