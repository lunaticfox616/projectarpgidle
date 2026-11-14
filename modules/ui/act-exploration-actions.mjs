import { draw, mapView } from './act-exploration-minimap.mjs';
import { battlefieldClientPoint } from '../browser/battle-canvas-box.mjs';

/** 무리마다 살아 있는 수를 한 수로 접는다: 처치, 물건에서 나온 덧무리, 불러온 탐험이 모두 이 수를 바꾼다. */
export function packDigest(runtime, run) {
    let digest=run.packs.length;
    for(const pack of run.packs)digest=(Math.imul(digest,31)+pack.aliveIds.length)|0;
    return digest;
}

export function summaryOf(runtime, run, map) {
    const hero=runtime.deps.game.gridPlayer,goal=runtime.deps.actExplorationState.markedDestination(run);
    return {run,map,packs:packDigest(runtime, run),visited:run.visitedRooms.length,discovered:run.discovered,status:run.status,sealed:!!run.sealed,
        mode:run.mode,hotkey:autoKey(runtime),locked:autoLocked(runtime),gx:hero.gx,gy:hero.gy,goalX:goal?goal.gx:-1,goalY:goal?goal.gy:-1,
        large:runtime.deps.document.getElementById('act-exploration-dialog').open};
}

export function render(runtime) {
    const panel=runtime.deps.document.getElementById('act-exploration-panel');if(!panel)return;
    // toggleAttribute leaves an unchanged flag alone, so per-frame calls do not restyle the page.
    const run=runtime.deps.actExplorationState.current(runtime.deps.game);panel.toggleAttribute('hidden',!run);
    runtime.deps.document.getElementById('btn-act-exploration-map').toggleAttribute('hidden',!run);
    runtime.deps.document.getElementById('btn-act-exploration-auto').toggleAttribute('hidden',!run);
    if(!run){runtime.state.shown={};if(runtime.state.gateHintRun)syncGateHint(runtime, null,0);return;}
    refreshMaps(runtime, run,runtime.deps.actExplorationMap.forRun(run));
}

/** 요약이 앞의 것과 같으면 아무것도 하지 않는다. 다르면 바뀐 부분(바탕, 단추, 표식)만 다시 그린다. */
export function refreshMaps(runtime, run, map) {
    const now=summaryOf(runtime, run,map),base=summaryDiffers(runtime, runtime.state.BASE,now),modes=summaryDiffers(runtime, runtime.state.MODES,now);
    if(!base&&!modes&&!summaryDiffers(runtime, runtime.state.MARK,now))return;
    const wasLarge=runtime.state.shown.large;
    runtime.state.shown=now;
    if(base){runtime.state.baseRev++;renderSeal(runtime, run);renderProgress(runtime, run);}
    if(modes)renderModes(runtime, run);
    paintMiniMap(runtime, runtime.deps.document.getElementById('act-exploration-map'),run,map);
    refreshLargeMap(runtime, run,map,wasLarge);
}

/** 닫혀 있는 큰 지도는 그리지 않는다. 여는 순간(요약의 large가 바뀐다) 그때의 상태로 그리고, 닫으면 캔버스를 놓는다. */
export function refreshLargeMap(runtime, run, map, wasLarge) {
    if(runtime.state.shown.large)paintMiniMap(runtime, runtime.deps.document.getElementById('act-exploration-map-large'),run,map);
    else if(wasLarge)releaseLarge(runtime);
}

export function renderSeal(runtime, run) {
    const remaining=runtime.deps.actExplorationState.remainingElites(run),seal=runtime.deps.document.getElementById('act-exploration-seal');
    // '봉인 n'은 무엇을 세는지 보이지 않았다(검토 4차): 남은 정예 수와, 다 잡으면 무엇이 열리는지.
    seal.textContent=remaining?'정예 '+remaining:(0, runtime.deps._t)('관문 개방');
    // 설명은 hint가 창 안에 띄운다(data-tip은 몸에 붙은 툴팁이라 크게 보기 창 뒤에 깔렸다).
    seal.setAttribute('aria-label',sealText(runtime, run,remaining));
    syncGateHint(runtime, run,remaining);
}

export function syncGateHint(runtime, run, remaining) {
    if(runtime.state.gateHintRun!==run || !remaining)runtime.state.gateHintRun=null;
    const pending=!!runtime.state.gateHintRun, dialog=runtime.deps.document.getElementById('act-exploration-dialog');
    runtime.deps.document.getElementById('btn-act-exploration-map').classList.toggle('tutorial-callout',pending&&!dialog.open);
    runtime.deps.document.getElementById('act-exploration-elite-guide').hidden=!pending;
}

export function guideBlockedGate(runtime, run, cell) {
    const key='tutorial_elite_gate';
    if(runtime.deps.game.isGuideReplay || runtime.deps.game.seenTutorials.includes(key))return false;
    const map=runtime.deps.actExplorationMap.forRun(run);
    const atGate=runtime.deps.actExplorationMap.walkable(map,cell) && !runtime.deps.actExplorationMap.walkable(map,cell,true);
    if(!atGate && (!map.stage || runtime.deps.actExplorationRooms.roomAt(map,cell)?.role!=='boss'))return false;
    const remaining=runtime.deps.actExplorationState.remainingElites(run);
    if(!remaining)return false;
    runtime.deps.game.seenTutorials.push(key);
    runtime.state.gateHintRun=run;
    syncGateHint(runtime, run,remaining);
    (0, runtime.deps.showGameToast)((0, runtime.deps._t)('보스 관문을 열려면 남은 정예를 처치하세요. 탐험 지도에서 금빛 표식을 찾을 수 있습니다.'),{tone:'warning',duration:6500});
    (0, runtime.deps.queueImportantSave)(180);
    return true;
}

/** 약도 한 장: 방 단위 무대는 방과 길의 약도(바탕과 표식을 따로 그린다), 이어진 지도는 주인공 둘레의 지형. */
export function paintMiniMap(runtime, canvas, run, map) {
    if(map.stage)runtime.deps.actExplorationRoomsUi.draw(canvas,run,map,runtime.state.baseRev);
    else draw(runtime, canvas,run,map);
}

/** 닫힌 큰 지도의 캔버스를 줄여 메모리를 돌려준다(1120×800이면 3.4MB, 바탕까지 두 장). 다시 열면 그때 제 크기로 그린다. */
export function releaseLarge(runtime) {
    const canvas=runtime.deps.document.getElementById('act-exploration-map-large');
    canvas.width=canvas.height=1;
    runtime.deps.actExplorationRoomsUi.forgetMapBase(canvas);
}

/** 크게 보기 창의 탐험 방식 단추와 미니맵의 자동 이동 단추(같은 상태: 직접 이동 = 자동 이동 꺼짐). */
export function renderModes(runtime, run) {
    for(const button of runtime.deps.document.querySelectorAll('[data-exploration-mode]')) {
        button.setAttribute('aria-pressed',String(button.dataset.explorationMode===run.mode));
        button.disabled=run.status!=='active';
    }
    const auto=runtime.deps.document.getElementById('btn-act-exploration-auto'),on=run.mode!=='manual',key=autoKey(runtime),locked=autoLocked(runtime);
    auto.setAttribute('aria-pressed',String(on));
    auto.disabled=run.status!=='active';
    auto.classList.toggle('is-locked',locked);
    // 켜짐과 꺼짐은 단추 앞의 초록 점이 말한다(css/act-exploration.css, 2026-11-03 사용자: 켬/끔 글자는 빼기). 잠김만 글자로 남긴다.
    auto.querySelector('b').textContent=locked?(0, runtime.deps._t)('자동 잠김'):(0, runtime.deps._t)('자동');
    auto.setAttribute('aria-label',(on?'자동 이동 켜짐':'자동 이동 꺼짐(클릭한 곳으로만 이동)')+', 눌러서 바꾸기'+(key?' ('+key+')':''));
    const cap=auto.querySelector('.combat-hud-key');
    cap.textContent=key;cap.hidden=!key;
    if(key)auto.setAttribute('aria-keyshortcuts',key);else auto.removeAttribute('aria-keyshortcuts');
}

export function autoKey(runtime) {return runtime.deps.hotkeyBindings.label(runtime.deps.hotkeyBindings.codeFor(runtime.deps.game.settings.hotkeyOverrides,'combat:autoMove'));}

export function renderProgress(runtime, run) {
    const panel=runtime.deps.document.getElementById('act-exploration-panel');if(!panel)return;
    panel.style.setProperty('--explore-pct',Math.round(runtime.deps.actExplorationSight.exploredShare(run)*100)+'%');
}

export function mode(runtime, value) {
    const run=runtime.deps.actExplorationState.current(runtime.deps.game);if(!run||run.status!=='active')return;
    if(!['direct','full','manual'].includes(value))throw Error('알 수 없는 탐험 방식');
    if(value!=='manual' && autoLocked(runtime)){(0, runtime.deps.showGameToast)((0, runtime.deps._t)('자동 사냥은 첫 무기를 장착하면 열립니다.'),{tone:'warning',duration:2000});return;}
    run.mode=value;run.destination=null;
    runtime.deps.game.settings.autoMove=value!=='manual';
    if(value!=='manual')runtime.deps.actExplorationProgress.holdAutoStart(run);
    if(value!=='manual')runtime.deps.game.settings.actExplorationMode=value;
    render(runtime);
}

/** 미니맵의 자동 이동 단추·단축키: 켜면 고른 탐험 방식(보스 직행 · 전체 탐색), 끄면 직접 이동. 걷던 이동 명령은 그대로 간다. */
export function toggleAuto(runtime) {
    if(autoLocked(runtime)){(0, runtime.deps.showGameToast)((0, runtime.deps._t)('자동 사냥은 첫 무기를 장착하면 열립니다.'),{tone:'warning',duration:2000});return false;}
    const on=runtime.deps.game.settings.autoMove===false,run=runtime.deps.actExplorationState.current(runtime.deps.game);
    runtime.deps.game.settings.autoMove=on;
    if(run&&run.status==='active'){run.mode=runtime.deps.actExplorationProgress.startMode(runtime.deps.game.settings);if(on)runtime.deps.actExplorationProgress.holdAutoStart(run);}
    (0, runtime.deps.showGameToast)(on?'자동 이동을 켰습니다':'자동 이동을 껐습니다. 클릭한 곳으로만 움직입니다',{duration:1800});
    render(runtime);
    return on;
}

/** 전장을 누른 자리에 그려진 몬스터가 있으면 그 몬스터를 락온한다(js/act-exploration-state.js lockOn, 2026-10-17 사용자 "몬스터(락온기능)").
* @param {?{x:number,y:number}} point 전장의 CSS px @returns {boolean} 몬스터를 눌렀는지(눌렀으면 바닥 이동 명령은 없다) */
export function lockOnAt(runtime, point) {
    const run=runtime.deps.actExplorationState.current(runtime.deps.game);if(!run||run.status!=='active')return false;
    const enemy=runtime.deps.battleDrawList.enemyAt(point);if(!enemy)return false;
    if(!runtime.deps.actExplorationState.lockOn(run,enemy))(0, runtime.deps.showGameToast)((0, runtime.deps._t)('그곳으로는 갈 수 없습니다'),{tone:'warning',duration:1400});
    else runtime.deps.actExplorationProgress.clearManualSteerHold(run);
    render(runtime);
    return true;
}

/** @param {HTMLCanvasElement} canvas 전장 @param {?PointerEvent} event null이면 마우스가 전장을 떠났다 */
export function hover(runtime, canvas, event) {
    if (!runtime.active) return;
    const queued=runtime.state.hovering;runtime.state.hovering={canvas,event};
    if(!queued)runtime.hoverFrameId=(0, runtime.deps.requestAnimationFrame)(runtime.handlers.hoverFrame);
}

export function hoverFrame(runtime) {
    runtime.hoverFrameId = null;
    const {canvas,event}=runtime.state.hovering;runtime.state.hovering=null;
    const point=event?battlefieldClientPoint(canvas,event.clientX,event.clientY):null,npc=point?runtime.deps.actTitleCard.npcAt(point):null;
    runtime.deps.actTitleCard.hover(npc);
    const run=runtime.deps.actExplorationState.current(runtime.deps.game),enemy=point&&run&&run.status==='active'?runtime.deps.battleDrawList.enemyAt(point):null;
    const cursor=npc||enemy||runtime.deps.stageDoorMarks.targetAt(point)?'pointer':'';
    if(canvas.style.cursor!==cursor)canvas.style.cursor=cursor;
}

/** An explicit move order (minimap, large map, battlefield click): walk there; auto-move stays as it was. */
export function commandMove(runtime, cell, point) {
    if(runtime.deps.bossMoves.observer.sceneActive())return false;
    const run=runtime.deps.actExplorationState.current(runtime.deps.game);if(!runtime.deps.actExplorationProgress.canMove(run)||!cell)return false;
    const accepted=runtime.deps.actExplorationState.selectDestination(run,cell);
    if(accepted && point && runtime.deps.bossMoves.observer.playerBoundary(run))runtime.deps.actExplorationMotion.aimFree(run,point);
    if(!accepted && !guideBlockedGate(runtime, run,cell))(0, runtime.deps.showGameToast)((0, runtime.deps._t)('그곳으로는 갈 수 없습니다'),{tone:'warning',duration:1400});
    render(runtime);
    return accepted;
}

export function choose(runtime, event) {
    if(event.currentTarget.id==='act-exploration-map'&&runtime.deps.window.matchMedia('(max-width: 1080px)').matches)return expand(runtime);
    const run=runtime.deps.actExplorationState.current(runtime.deps.game);if(!runtime.deps.actExplorationProgress.canMove(run))return;
    const map=runtime.deps.actExplorationMap.forRun(run),rect=event.currentTarget.getBoundingClientRect();
    if(map.stage){commandMove(runtime, runtime.deps.actExplorationRoomsUi.pick(event,run,map));return;}
    const view=mapView(runtime, event.currentTarget,map);
    const cell={gx:view.x0+Math.floor((event.clientX-rect.left)/rect.width*view.cols),
        gy:view.y0+Math.floor((event.clientY-rect.top)/rect.height*view.rows)};
    commandMove(runtime, cell);
}

export function press(runtime, direction, down) {
    const index=runtime.state.held.indexOf(direction);
    if(index>=0)runtime.state.held.splice(index,1);
    if(down&&runtime.state.STEPS[direction])runtime.state.held.push(direction);
    if(!direction)runtime.state.held.length=0;
}

/** @param {?string} direction up/down/left/right; null with down false lets go of every key (window blur).
* @returns {boolean} whether an exploring or loot-waiting map took the key. */
export function holdMove(runtime, direction, down) {
    if (!runtime.active) return false;
    press(runtime, direction,down);
    const run=runtime.deps.actExplorationState.current(runtime.deps.game);
    if(!runtime.deps.actExplorationProgress.canMove(run)){runtime.state.held.length=0;stopWalking(runtime, null);return false;}
    if((0, runtime.deps.isForegroundGameplayPausedForBackground)())return nudge(runtime, run,down&&direction);
    if(!runtime.state.held.length){stopWalking(runtime, run);return true;}
    steer(runtime);
    runtime.state.walkTimer=runtime.state.walkTimer||(0, runtime.deps.setInterval)(runtime.handlers.steer,runtime.state.WALK_TICK_MS);
    return true;
}

/** Paused (the large map with "pause while a window is open"): nothing walks, so each press moves the destination one cell like a
* click on the map, and the hero walks there once the game runs again. */
export function nudge(runtime, run, direction) {
    runtime.state.held.length=0;
    runtime.deps.actExplorationMotion.setFreeInput(run,runtime.deps.game.gridPlayer,0,0);
    if(runtime.state.walkTimer){(0, runtime.deps.clearInterval)(runtime.state.walkTimer);runtime.state.walkTimer=null;}
    if(!runtime.state.STEPS[direction])return true;
    const [dx,dy]=runtime.state.STEPS[direction],from=run.destination||footing(runtime, run);
    runtime.deps.actExplorationState.selectDestination(run,{gx:from.gx+dx,gy:from.gy+dy});
    render(runtime);
    return true;
}

export function steer(runtime) {
    const run=runtime.deps.actExplorationState.current(runtime.deps.game),direction=runtime.state.held[runtime.state.held.length-1];
    if(!runtime.deps.actExplorationProgress.canMove(run)||!direction){runtime.state.held.length=0;return stopWalking(runtime, run);}
    if(runtime.deps.bossMoves.observer.sceneActive())return;
    if(runtime.deps.bossMoves.observer.playerBoundary(run)){steerFree(runtime, run);return;}
    const [dx,dy]=runtime.state.STEPS[direction],from=footing(runtime, run);
    let reached=0;
    // 키보드로 거는 명령은 화면에 표시하지 않는다(KEYED: 클릭한 자리가 아니라 누른 방향의 몇 칸 앞이다)
    while(reached<runtime.state.WALK_REACH&&runtime.deps.actExplorationState.selectDestination(run,{gx:from.gx+dx*(reached+1),gy:from.gy+dy*(reached+1)},runtime.state.KEYED))reached++;
    if(!reached)runtime.deps.actExplorationState.selectDestination(run,from,runtime.state.KEYED);
    render(runtime);
}

export function steerFree(runtime, run) {
    if((0, runtime.deps.isForegroundGameplayPausedForBackground)()){runtime.deps.actExplorationMotion.setFreeInput(run,runtime.deps.game.gridPlayer,0,0);return;}
    const dx=Number(runtime.state.held.includes('right'))-Number(runtime.state.held.includes('left'));
    const dy=Number(runtime.state.held.includes('down'))-Number(runtime.state.held.includes('up'));
    run.destination=null;
    runtime.deps.actExplorationProgress.objects.cancel(run);
    runtime.deps.actExplorationProgress.holdAutoManual(run);
    runtime.deps.actExplorationMotion.setFreeInput(run,runtime.deps.game.gridPlayer,dx,dy);
}

export function stopWalking(runtime, run) {
    if(runtime.state.walkTimer){(0, runtime.deps.clearInterval)(runtime.state.walkTimer);runtime.state.walkTimer=null;}
    runtime.deps.actExplorationMotion.setFreeInput(run,runtime.deps.game.gridPlayer,0,0);
    if(runtime.deps.bossMoves.observer.sceneActive())return;
    if(runtime.deps.bossMoves.observer.playerBoundary(run))return;
    if(runtime.deps.actExplorationProgress.canMove(run)&&run.destination)runtime.deps.actExplorationState.selectDestination(run,footing(runtime, run),runtime.state.KEYED);
}

export function expand(runtime) {
    const dialog=runtime.deps.document.getElementById('act-exploration-dialog');
    dialog.showModal();
    if(runtime.state.gateHintRun){
        syncGateHint(runtime, runtime.state.gateHintRun,runtime.deps.actExplorationState.remainingElites(runtime.state.gateHintRun));
        runtime.gateDialog = dialog;
        dialog.addEventListener('close',runtime.handlers.closeExplorationGateHint,{once:true});
    }
    render(runtime);
}

export function sealText(runtime, run, remaining) {
    if(remaining)return (0, runtime.deps._t)('남은 정예 {remaining}, 모두 처치하면 보스 관문이 열립니다', { remaining });
    return run.sealed?(0, runtime.deps._t)('관문이 아직 닫혀 있습니다.'):(0, runtime.deps._t)('보스 관문이 열렸습니다.');
}

/** 정예, 관문 칸의 설명. 크게 보기 창은 맨 위 층(showModal)이라 몸에 붙은 #info-tooltip이 창 뒤에 깔려 읽을 수 없었다(2026-11-08
* 사용자): 창이 열린 동안 툴팁을 창 안으로 옮기고, 창이 닫히면 몸으로 돌려놓는다. */
export function hint(runtime, event) {
    const run=runtime.deps.actExplorationState.current(runtime.deps.game);if(!run)return;
    const rect=event.currentTarget.getBoundingClientRect(),count=runtime.deps.actExplorationState.remainingElites(run);
    hostTooltipIn(runtime, event.currentTarget.closest('dialog'));
    (0, runtime.deps.showInfoTooltipHtml)(rect.left,rect.bottom,(0, runtime.deps.escapeHTML)(sealText(runtime, run,count)),'#b79c58','act-gate-'+count+(run.sealed?'s':''));
}

export function hostTooltipIn(runtime, dialog) {
    const tip=runtime.deps.document.getElementById('info-tooltip');
    if(!dialog?.open || tip.parentElement===dialog)return;
    dialog.append(tip);
    runtime.tooltipDialog = dialog;
    runtime.tooltip = tip;
    dialog.addEventListener('close',runtime.handlers.restoreExplorationTooltip,{once:true});
}

export function departureClick(runtime, event) {
    const button=event.target.closest('[onclick], [data-exploration-departure]');
    if(!button?.hasAttribute('data-exploration-departure') || button.disabled)return;
    if(button===runtime.state.approvedDeparture){runtime.state.approvedDeparture=null;return;}
    const run=runtime.deps.actExplorationState.current(runtime.deps.game);
    if(!run || run.completionApplied || run.status!=='active')return;
    event.preventDefault();event.stopImmediatePropagation();
    if(!runtime.state.departurePending)confirmDeparture(runtime, button,run);
}

export async function confirmDeparture(runtime, button, run) {
    runtime.state.departurePending=true;
    const origin={state:runtime.deps.game,run,zoneId:runtime.deps.game.currentZoneId,season:runtime.deps.game.season};
    try {
        const copy=departureCopy(runtime, button);
        const accepted=await (0, runtime.deps.requestGameConfirmation)(copy.message,{title:copy.title,tone:'danger',confirmLabel:copy.confirm,cancelLabel:copy.cancel});
        if(!accepted || !departureStillCurrent(runtime, origin))return;
        if(!button.isConnected || button.disabled) {
            (0, runtime.deps.showGameToast)((0, runtime.deps._t)('이동할 화면이 변경되었습니다. 목적지를 다시 선택하세요.'),{tone:'warning'});return;
        }
        runtime.state.approvedDeparture=button;button.click();
    } catch(error) {
        runtime.deps.console.error('탐험 이동 확인 실패:',error);
        (0, runtime.deps.showGameToast)((0, runtime.deps._t)('이동 확인에 실패했습니다. 탐험은 유지됩니다.'),{tone:'danger'});
    } finally {runtime.state.approvedDeparture=null;runtime.state.departurePending=false;}
}

export function departureStillCurrent(runtime, origin) {
    return runtime.active && runtime.deps.game===origin.state && runtime.deps.game.actExploration===origin.run &&
    runtime.deps.game.currentZoneId===origin.zoneId && runtime.deps.game.season===origin.season;
}

export function departureMessage() {
    return '탐험 진행이 초기화됩니다. 이미 획득한 아이템과 재화는 유지됩니다.';
}

/** The dialog's words; a button may name its own (data-departure-title, -message, -confirm, -cancel), as the ocean's surfacing does. */
export function departureCopy(runtime, button) {
    const own=button.dataset;
    return {title:own.departureTitle||'탐험을 포기하고 이동할까요?',message:own.departureMessage||departureMessage(),confirm:own.departureConfirm||'포기하고 이동',cancel:own.departureCancel||'계속 탐험'};
}

export function summaryDiffers(runtime, fields, now) { return fields.some(field=>now[field]!==runtime.state.shown[field]); }

export function autoLocked(runtime) { return typeof runtime.deps.openingJourney==='object' && runtime.deps.openingJourney.autoLocked(); }

export function footing(runtime, run) { return run.motion?run.motion.to:runtime.deps.game.gridPlayer; }

export function closeExplorationGateHint(runtime) {
    runtime.gateDialog = null;
    runtime.state.gateHintRun = null;
    syncGateHint(runtime, null, 0);
}

export function restoreExplorationTooltip(runtime) {
    runtime.tooltipDialog?.removeEventListener('close', runtime.handlers.restoreExplorationTooltip);
    if (runtime.tooltip) {
        (0, runtime.deps.hideInfoTooltip)();
        runtime.deps.document.body.append(runtime.tooltip);
    }
    runtime.tooltipDialog = runtime.tooltip = null;
}
