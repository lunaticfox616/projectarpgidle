// Exploration controls render the domain snapshot; destination selection stays in the domain.
const actExplorationUi=(()=>{
    let departurePending=false,approvedDeparture=null;
    // 약도가 보여 주는 것의 요약(2026-10-13 성능 작업, docs/stage-render-performance-20261013.md). 프레임마다 읽어 앞의 것과 견주고 바뀐
    // 부분만 다시 그린다. 수와 참조만 담는다: 예전에는 프레임마다 모든 무리의 상태를 문자열로 이어 붙여 견줬다. 저장하지 않는다.
    //   BASE  지도 바탕이 바뀌는 것: 탐험, 지도, 무리(packDigest), 가 본 방의 수, 발견한 칸의 목록, 진행 상태, 닫힌 관문
    //   MODES 단추가 바뀌는 것: 탐험 방식과 자동 이동의 단축키
    //   MARK  표식만 바뀌는 것: 주인공의 칸, 이동 명령의 자리, 큰 지도가 열렸는가
    const BASE=['run','map','packs','visited','discovered','status','sealed'],MODES=['run','status','mode','hotkey','locked'],MARK=['gx','gy','goalX','goalY','large'];
    let shown={},baseRev=0;
    /** 무리마다 살아 있는 수를 한 수로 접는다: 처치, 물건에서 나온 덧무리, 불러온 탐험이 모두 이 수를 바꾼다. */
    function packDigest(run) {
        let digest=run.packs.length;
        for(const pack of run.packs)digest=(Math.imul(digest,31)+pack.aliveIds.length)|0;
        return digest;
    }
    function summaryOf(run,map) {
        const hero=game.gridPlayer,goal=actExplorationState.markedDestination(run);
        return {run,map,packs:packDigest(run),visited:run.visitedRooms.length,discovered:run.discovered,status:run.status,sealed:!!run.sealed,
            mode:run.mode,hotkey:autoKey(),locked:autoLocked(),gx:hero.gx,gy:hero.gy,goalX:goal?goal.gx:-1,goalY:goal?goal.gy:-1,
            large:document.getElementById('act-exploration-dialog').open};
    }
    const summaryDiffers=(fields,now)=>fields.some(field=>now[field]!==shown[field]);
    function render() {
        const panel=document.getElementById('act-exploration-panel');if(!panel)return;
        // toggleAttribute leaves an unchanged flag alone, so per-frame calls do not restyle the page.
        const run=actExplorationState.current(game);panel.toggleAttribute('hidden',!run);
        document.getElementById('btn-act-exploration-map').toggleAttribute('hidden',!run);
        document.getElementById('btn-act-exploration-auto').toggleAttribute('hidden',!run);
        if(!run){shown={};return;}
        refreshMaps(run,actExplorationMap.forRun(run));
    }
    /** 요약이 앞의 것과 같으면 아무것도 하지 않는다. 다르면 바뀐 부분(바탕, 단추, 표식)만 다시 그린다. */
    function refreshMaps(run,map) {
        const now=summaryOf(run,map),base=summaryDiffers(BASE,now),modes=summaryDiffers(MODES,now);
        if(!base&&!modes&&!summaryDiffers(MARK,now))return;
        const wasLarge=shown.large;
        shown=now;
        if(base){baseRev++;renderSeal(run);renderProgress(run);}
        if(modes)renderModes(run);
        paintMiniMap(document.getElementById('act-exploration-map'),run,map);
        refreshLargeMap(run,map,wasLarge);
    }
    /** 닫혀 있는 큰 지도는 그리지 않는다. 여는 순간(요약의 large가 바뀐다) 그때의 상태로 그리고, 닫으면 캔버스를 놓는다. */
    function refreshLargeMap(run,map,wasLarge) {
        if(shown.large)paintMiniMap(document.getElementById('act-exploration-map-large'),run,map);
        else if(wasLarge)releaseLarge();
    }
    function renderSeal(run) {
        const remaining=actExplorationState.remainingElites(run),seal=document.getElementById('act-exploration-seal');
        // '봉인 n'은 무엇을 세는지 보이지 않았다(검토 4차): 남은 정예 수와, 다 잡으면 무엇이 열리는지.
        seal.textContent=remaining?'정예 '+remaining:'관문 개방';
        seal.title=remaining?`남은 정예 ${remaining}, 모두 처치하면 보스 관문이 열립니다`:'보스 관문이 열렸습니다';
        seal.setAttribute('aria-label',seal.title);
    }
    /** 약도 한 장: 방 단위 무대는 방과 길의 약도(바탕과 표식을 따로 그린다), 이어진 지도는 주인공 둘레의 지형. */
    function paintMiniMap(canvas,run,map) {
        if(map.stage)actExplorationRoomsUi.draw(canvas,run,map,baseRev);
        else draw(canvas,run,map);
    }
    /** 닫힌 큰 지도의 캔버스를 줄여 메모리를 돌려준다(1120×800이면 3.4MB, 바탕까지 두 장). 다시 열면 그때 제 크기로 그린다. */
    function releaseLarge() {
        const canvas=document.getElementById('act-exploration-map-large');
        canvas.width=canvas.height=1;
        actExplorationRoomsUi.forgetMapBase(canvas);
    }
    /** 크게 보기 창의 탐험 방식 단추와 미니맵의 자동 이동 단추(같은 상태: 직접 이동 = 자동 이동 꺼짐). */
    function renderModes(run) {
        for(const button of document.querySelectorAll('[data-exploration-mode]')) {
            button.setAttribute('aria-pressed',String(button.dataset.explorationMode===run.mode));
            button.disabled=run.status!=='active';
        }
        const auto=document.getElementById('btn-act-exploration-auto'),on=run.mode!=='manual',key=autoKey(),locked=autoLocked();
        auto.setAttribute('aria-pressed',String(on));
        auto.disabled=run.status!=='active';
        auto.classList.toggle('is-locked',locked);
        // 글자가 지금 상태를 말한다(예전 '자동 / 수동'은 누르면 바뀔 상태인지 헷갈렸다 — 가시성 정리 2026-10-04).
        auto.querySelector('b').textContent=locked?'자동 잠김':on?'자동 켬':'자동 끔';
        auto.setAttribute('aria-label',(on?'자동 이동 켜짐':'자동 이동 꺼짐(클릭한 곳으로만 이동)')+', 눌러서 바꾸기'+(key?' ('+key+')':''));
        const cap=auto.querySelector('.combat-hud-key');
        cap.textContent=key;cap.hidden=!key;
        if(key)auto.setAttribute('aria-keyshortcuts',key);else auto.removeAttribute('aria-keyshortcuts');
    }
    function autoKey() {return hotkeyBindings.label(hotkeyBindings.codeFor(game.settings.hotkeyOverrides,'combat:autoMove'));}
    // 미니맵 둘레 고리: 밝혀낸 바닥 비율. 글자 없이 고리로만 보인다(남은 정예 수는 크게 보기 창의 봉인 표시).
    // 표시 전용이며 탐험 규칙과 무관하다.
    function renderProgress(run) {
        const panel=document.getElementById('act-exploration-panel');if(!panel)return;
        panel.style.setProperty('--explore-pct',Math.round(actExplorationSight.exploredShare(run)*100)+'%');
    }
    // 지도 그리기: 안개 격자 → 밝혀낸 지형(바닥·벽·경계선) → 표식. 표시 전용이며 좌표·선택 규칙은 그대로다.
    // 캔버스는 2배로 그려 CSS 축소 시 표식 윤곽이 뭉개지지 않게 한다.
    // 전장 위 미니맵은 플레이어 주변 MINI_VIEW칸만, 크게 보기 창은 지도 전체를 그린다(클릭 좌표는 같은 창(view)으로 환산).
    // 가시성 정리(2026-10-04 사용자 요청): 바닥은 한 색(체크무늬 없음), 경계선은 확인한 벽과 지도 끝에만, 보이는 범위는 13 → 19칸.
    // 칸이 작아진 만큼 표식(markerScale)은 키워서 화면에서 예전 크기를 유지한다.
    const MAP_INK={fog:'#050807',grid:'rgba(201,164,92,.06)',floor:'#7d7152',wall:'#26342c',edge:'rgba(240,214,150,.85)'};
    const MINI_VIEW=19,MINI_MARKER_BASE=13;
    function mapView(canvas,map) {
        if(canvas.id!=='act-exploration-map')return {x0:0,y0:0,cols:map.columns,rows:map.rows,scale:10,markerScale:1};
        const cols=Math.min(MINI_VIEW,map.columns),rows=Math.min(MINI_VIEW,map.rows);
        const x0=Math.max(0,Math.min(map.columns-cols,game.gridPlayer.gx-Math.floor(cols/2)));
        const y0=Math.max(0,Math.min(map.rows-rows,game.gridPlayer.gy-Math.floor(rows/2)));
        return {x0,y0,cols,rows,scale:8,markerScale:Math.max(1,Math.max(cols,rows)/MINI_MARKER_BASE)};
    }
    /** 이어진 지도의 약도. 작은 약도는 주인공이 한 칸 걸을 때마다 보이는 창이 통째로 움직이므로 바탕을 따로 두지 않고 다시 그린다.
     * 캔버스 크기는 달라질 때만 넣는다(넣을 때마다 캔버스가 새로 잡힌다). */
    function draw(canvas,run,map) {
        const view=mapView(canvas,map),scale=view.scale,ss=2,width=view.cols*scale*ss,height=view.rows*scale*ss;
        if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
        canvas.dataset.view=[view.x0,view.y0,view.cols,view.rows].join(',');
        const ctx=canvas.getContext('2d'),seen=actExplorationSight.seenCells(run);
        ctx.setTransform(ss,0,0,ss,-view.x0*scale*ss,-view.y0*scale*ss);
        drawFog(ctx,map,scale);
        drawTerrain(ctx,map,seen,scale);
        drawMarkers(ctx,run,map,seen,view);
    }
    function drawFog(ctx,map,scale) {
        ctx.fillStyle=MAP_INK.fog;ctx.fillRect(0,0,map.columns*scale,map.rows*scale);
        ctx.fillStyle=MAP_INK.grid;
        for(let gx=0;gx<map.columns;gx+=4)ctx.fillRect(gx*scale,0,.5,map.rows*scale);
        for(let gy=0;gy<map.rows;gy+=4)ctx.fillRect(0,gy*scale,map.columns*scale,.5);
    }
    function drawTerrain(ctx,map,seen,scale) {
        for(const id of seen) {
            const gx=id%map.columns,gy=Math.floor(id/map.columns);
            ctx.fillStyle=map.tiles[id]?MAP_INK.floor:MAP_INK.wall;
            ctx.fillRect(gx*scale,gy*scale,scale,scale);
        }
        ctx.fillStyle=MAP_INK.edge;
        for(const id of seen)if(map.tiles[id])drawFloorEdges(ctx,map,seen,id,scale);
    }
    // 바닥 칸의 네 변 중 확인한 벽이나 지도 끝과 맞닿은 쪽에만 얇은 금빛 경계를 긋는다.
    // 아직 밝히지 않은 칸 쪽은 긋지 않는다(예전에는 탐험 경계마다 선이 생겨 벽처럼 보였다).
    const EDGE_SIDES=[[0,-1],[1,0],[0,1],[-1,0]];
    function drawFloorEdges(ctx,map,seen,id,scale) {
        const gx=id%map.columns,gy=Math.floor(id/map.columns),w=.7;
        for(const [dx,dy] of EDGE_SIDES) {
            if(!isSeenWallOrEdge(map,seen,gx+dx,gy+dy))continue;
            const x=gx*scale+(dx>0?scale-w:0),y=gy*scale+(dy>0?scale-w:0);
            ctx.fillRect(x,y,dx?w:scale,dy?w:scale);
        }
    }
    function isSeenWallOrEdge(map,seen,gx,gy) {
        if(gx<0||gy<0||gx>=map.columns||gy>=map.rows)return true;
        const id=gy*map.columns+gx;
        return seen.has(id)&&!map.tiles[id];
    }
    function drawDiamond(ctx,{x,y,r,fill}) {
        ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath();
        ctx.fillStyle=fill;ctx.fill();ctx.lineWidth=.8;ctx.strokeStyle='#140d08';ctx.stroke();
    }
    // Atlas content rooms keep their own colour on the minimap (the rest: boss red, elite gold, pack brown).
    const ENCOUNTER_MARKS={breach:'#b58ce0',hive:'#79a8e8',treasure:'#8fd08a',meteor:'#f2efe6',redAltar:'#f07a2a',blueAltar:'#3f6dff'};
    function packMark(pack) {
        if(pack.stage!==null)return '#e78077';
        if(ENCOUNTER_MARKS[pack.encounter])return ENCOUNTER_MARKS[pack.encounter];
        return pack.eliteIds.some(id=>pack.aliveIds.includes(id))?'#e1bd62':'#ae9073';
    }
    function drawMarkers(ctx,run,map,seen,view) {
        const scale=view.scale,at=v=>v*scale+scale/2,r=Math.max(3,scale*.8)*view.markerScale;
        for(const pack of run.packs) {
            const room=actExplorationState.packPosition(map,pack);
            if(!pack.aliveIds.length||!seen.has(actExplorationMap.index(map,room)))continue;
            drawDiamond(ctx,{x:at(room.gx),y:at(room.gy),r,fill:packMark(pack)});
        }
        const command=actExplorationState.markedDestination(run);
        if(command) {
            ctx.beginPath();ctx.arc(at(command.gx),at(command.gy),r+1,0,Math.PI*2);
            ctx.setLineDash([2,1.5]);ctx.lineWidth=1;ctx.strokeStyle='#f3e5b4';ctx.stroke();ctx.setLineDash([]);
        }
        drawPlayerMarker(ctx,at(game.gridPlayer.gx),at(game.gridPlayer.gy),r);
    }
    function drawPlayerMarker(ctx,x,y,r) {
        const glow=ctx.createRadialGradient(x,y,0,x,y,r*2.4);
        glow.addColorStop(0,'rgba(145,236,223,.55)');glow.addColorStop(1,'rgba(145,236,223,0)');
        ctx.fillStyle=glow;ctx.fillRect(x-r*2.4,y-r*2.4,r*4.8,r*4.8);
        ctx.beginPath();ctx.arc(x,y,r*.7,0,Math.PI*2);
        ctx.fillStyle='#91ecdf';ctx.fill();ctx.lineWidth=.8;ctx.strokeStyle='#0b1a17';ctx.stroke();
    }
    function mode(value) {
        const run=actExplorationState.current(game);if(!run||run.status!=='active')return;
        if(!['direct','full','manual'].includes(value))throw Error('알 수 없는 탐험 방식');
        if(value!=='manual' && autoLocked()){showGameToast('자동 사냥은 첫 스킬룬을 장착하면 열립니다',{tone:'warning',duration:2000});return;}
        run.mode=value;run.destination=null;
        game.settings.autoMove=value!=='manual';
        if(value!=='manual')game.settings.actExplorationMode=value;
        render();
    }
    /** 처음 시작하는 플레이어의 첫 장면 동안(js/opening-journey-ui.js) 자동 사냥은 꺼진 채 잠긴다: 시작 룬 안내까지 마치면 열린다. */
    const autoLocked=()=>typeof openingJourney==='object' && openingJourney.autoLocked();
    /** 미니맵의 자동 이동 단추·단축키: 켜면 고른 탐험 방식(보스 직행 · 전체 탐색), 끄면 직접 이동. 걷던 이동 명령은 그대로 간다. */
    function toggleAuto() {
        if(autoLocked()){showGameToast('자동 사냥은 첫 스킬룬을 장착하면 열립니다',{tone:'warning',duration:2000});return false;}
        const on=game.settings.autoMove===false,run=actExplorationState.current(game);
        game.settings.autoMove=on;
        if(run&&run.status==='active')run.mode=actExplorationProgress.startMode(game.settings);
        showGameToast(on?'자동 이동을 켰습니다':'자동 이동을 껐습니다. 클릭한 곳으로만 움직입니다',{duration:1800});
        render();
        return on;
    }
    /** 전장을 누른 자리에 그려진 몬스터가 있으면 그 몬스터를 락온한다(js/act-exploration-state.js lockOn, 2026-10-17 사용자 "몬스터(락온기능)").
     * @param {?{x:number,y:number}} point 전장의 CSS px @returns {boolean} 몬스터를 눌렀는지(눌렀으면 바닥 이동 명령은 없다) */
    function lockOnAt(point) {
        const run=actExplorationState.current(game);if(!run||run.status!=='active')return false;
        const enemy=battleDrawList.enemyAt(point);if(!enemy)return false;
        if(!actExplorationState.lockOn(run,enemy))showGameToast('그곳으로는 갈 수 없습니다',{tone:'warning',duration:1400});
        render();
        return true;
    }
    // 전장 위의 마우스(2026-10-17 사용자 "NPC위에 마우스올리면 테두리강조"): 말을 걸 수 있는 NPC 위면 그 NPC에 밝은 테를 두르고
    // (js/canvas-act-title-card.js hover), NPC나 락온할 몬스터 위면 손가락 커서. 마우스가 움직이는 동안 프레임마다 한 번만 잰다.
    let hovering=null;
    /** @param {HTMLCanvasElement} canvas 전장 @param {?PointerEvent} event null이면 마우스가 전장을 떠났다 */
    function hover(canvas,event) {
        const queued=hovering;hovering={canvas,event};
        if(!queued)requestAnimationFrame(hoverFrame);
    }
    function hoverFrame() {
        const {canvas,event}=hovering;hovering=null;
        const point=event?getBattlefieldClientPoint(canvas,event.clientX,event.clientY):null,npc=point?actTitleCard.npcAt(point):null;
        actTitleCard.hover(npc);
        const run=actExplorationState.current(game),enemy=point&&run&&run.status==='active'?battleDrawList.enemyAt(point):null;
        const cursor=npc||enemy||stageDoorMarks.targetAt(point)?'pointer':'';
        if(canvas.style.cursor!==cursor)canvas.style.cursor=cursor;
    }
    /** An explicit move order (minimap, large map, battlefield click): walk there; auto-move stays as it was. */
    function commandMove(cell) {
        const run=actExplorationState.current(game);if(!actExplorationProgress.canMove(run)||!cell)return false;
        const accepted=actExplorationState.selectDestination(run,cell);
        if(!accepted)showGameToast('그곳으로는 갈 수 없습니다',{tone:'warning',duration:1400});
        render();
        return accepted;
    }
    // 모바일의 작은 미니맵은 손가락으로 칸을 고르기 어려워, 누르면 크게 보기 창을 연다(칸 선택은 큰 지도에서).
    function choose(event) {
        if(event.currentTarget.id==='act-exploration-map'&&window.matchMedia('(max-width: 1080px)').matches)return expand();
        const run=actExplorationState.current(game);if(!actExplorationProgress.canMove(run))return;
        const map=actExplorationMap.forRun(run),rect=event.currentTarget.getBoundingClientRect();
        if(map.stage){commandMove(actExplorationRoomsUi.pick(event,run,map));return;}
        const view=mapView(event.currentTarget,map);
        const cell={gx:view.x0+Math.floor((event.clientX-rect.left)/rect.width*view.cols),
            gy:view.y0+Math.floor((event.clientY-rect.top)/rect.height*view.rows)};
        commandMove(cell);
    }
    // ── 키보드로 걷기(WASD와 방향키, js/hotkeys-ui.js가 누름과 뗌을 넘긴다, 2026-10-09) ──
    // 누르는 동안 그쪽으로 곧게 WALK_REACH칸 앞까지 이동 명령을 다시 걸어 끊김 없이 걷고, 떼면 들어가던 칸에서 멈춘다(걸음은 반을 지나면
    // 칸이 바뀌므로 지금 칸으로 돌리면 되돌아 걷는다). 여러 방향을 누르면 마지막에 누른 쪽이다. 벽이나 안개, 물건 앞에서는 선다.
    const STEPS=Object.freeze({up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}),WALK_REACH=4,WALK_TICK_MS=90;
    const held=[];let walkTimer=null;
    const KEYED=Object.freeze({unmarked:true});
    function press(direction,down) {
        const index=held.indexOf(direction);
        if(index>=0)held.splice(index,1);
        if(down&&STEPS[direction])held.push(direction);
        if(!direction)held.length=0;
    }
    /** @param {?string} direction up/down/left/right; null with down false lets go of every key (window blur).
     * @returns {boolean} whether an exploring or loot-waiting map took the key. */
    function holdMove(direction,down) {
        press(direction,down);
        const run=actExplorationState.current(game);
        if(!actExplorationProgress.canMove(run)){held.length=0;stopWalking(null);return false;}
        if(isForegroundGameplayPausedForBackground())return nudge(run,down&&direction);
        if(!held.length){stopWalking(run);return true;}
        steer();
        walkTimer=walkTimer||setInterval(steer,WALK_TICK_MS);
        return true;
    }
    /** Paused (the large map with "pause while a window is open"): nothing walks, so each press moves the destination one cell like a
     * click on the map, and the hero walks there once the game runs again. */
    function nudge(run,direction) {
        held.length=0;
        if(walkTimer){clearInterval(walkTimer);walkTimer=null;}
        if(!STEPS[direction])return true;
        const [dx,dy]=STEPS[direction],from=run.destination||footing(run);
        actExplorationState.selectDestination(run,{gx:from.gx+dx,gy:from.gy+dy});
        render();
        return true;
    }
    /** The cell the hero stands on, or the one it is stepping into. */
    const footing=run=>(run.motion?run.motion.to:game.gridPlayer);
    function steer() {
        const run=actExplorationState.current(game),direction=held[held.length-1];
        if(!actExplorationProgress.canMove(run)||!direction){held.length=0;return stopWalking(run);}
        const [dx,dy]=STEPS[direction],from=footing(run);
        let reached=0;
        // 키보드로 거는 명령은 화면에 표시하지 않는다(KEYED: 클릭한 자리가 아니라 누른 방향의 몇 칸 앞이다)
        while(reached<WALK_REACH&&actExplorationState.selectDestination(run,{gx:from.gx+dx*(reached+1),gy:from.gy+dy*(reached+1)},KEYED))reached++;
        if(!reached)actExplorationState.selectDestination(run,from,KEYED);
        render();
    }
    function stopWalking(run) {
        if(walkTimer){clearInterval(walkTimer);walkTimer=null;}
        if(actExplorationProgress.canMove(run)&&run.destination)actExplorationState.selectDestination(run,footing(run),KEYED);
    }
    function expand(){document.getElementById('act-exploration-dialog').showModal();render();}
    function hint(event) {
        const run=actExplorationState.current(game);if(!run)return;
        const rect=event.currentTarget.getBoundingClientRect(),count=actExplorationState.remainingElites(run);
        showInfoTooltipHtml(rect.left,rect.bottom,count?'남은 정예 몬스터 수: '+count:run.sealed?'관문이 아직 닫혀 있습니다.':'보스 관문이 열렸습니다.','#b79c58','act-gate-'+count);
    }
    // Only explicit travel controls participate. Automatic travel and combat never depend on this UI.
    function departureClick(event) {
        const button=event.target.closest('[onclick], [data-exploration-departure]');
        if(!button?.hasAttribute('data-exploration-departure') || button.disabled)return;
        if(button===approvedDeparture){approvedDeparture=null;return;}
        const run=actExplorationState.current(game);
        if(!run || run.completionApplied || run.status!=='active')return;
        event.preventDefault();event.stopImmediatePropagation();
        if(!departurePending)confirmDeparture(button,run);
    }
    async function confirmDeparture(button,run) {
        departurePending=true;
        const origin={state:game,run,zoneId:game.currentZoneId,season:game.season};
        try {
            const copy=departureCopy(button);
            const accepted=await requestGameConfirmation(copy.message,{title:copy.title,tone:'danger',confirmLabel:copy.confirm,cancelLabel:copy.cancel});
            if(!accepted || !departureStillCurrent(origin))return;
            if(!button.isConnected || button.disabled) {
                showGameToast('이동할 화면이 변경되었습니다. 목적지를 다시 선택하세요.',{tone:'warning'});return;
            }
            approvedDeparture=button;button.click();
        } catch(error) {
            console.error('탐험 이동 확인 실패:',error);
            showGameToast('이동 확인에 실패했습니다. 탐험은 유지됩니다.',{tone:'danger'});
        } finally {approvedDeparture=null;departurePending=false;}
    }
    function departureStillCurrent(origin) {
        return game===origin.state && game.actExploration===origin.run &&
            game.currentZoneId===origin.zoneId && game.season===origin.season;
    }
    function departureMessage() {
        return '탐험 진행이 초기화됩니다. 이미 획득한 아이템과 재화는 유지됩니다.';
    }
    /** The dialog's words; a button may name its own (data-departure-title, -message, -confirm, -cancel), as the ocean's surfacing does. */
    function departureCopy(button) {
        const own=button.dataset;
        return {title:own.departureTitle||'탐험을 포기하고 이동할까요?',message:own.departureMessage||departureMessage(),confirm:own.departureConfirm||'포기하고 이동',cancel:own.departureCancel||'계속 탐험'};
    }
    document.addEventListener('click',departureClick,true);
    return {render,mode,toggleAuto,commandMove,lockOnAt,hover,choose,holdMove,expand,hint,departurePending:()=>departurePending};
})();
safeExposeGlobals({actExplorationUi});
