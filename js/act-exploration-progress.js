// Combat progression adapter: authored exploration -> existing grid movement and enemies.
// It never rolls enemies, rewards, attacks or runs a second combat loop.
const actExplorationProgress = (() => {
    // A move command that makes no progress for this many 20 ms steps (its cell taken, or out of reach) is dropped:
    // the hero stays as close as it got and, with auto-move on, goes back to exploring.
    const COMMAND_GIVE_UP_STEPS=15;
    const commandStalls=new WeakMap(); // run → steps the command has not advanced (transient, like the discovery memos)
    // After the last boss falls, auto-move walks to what it dropped before the map completes. A pile the hero cannot reach is
    // collected from where it stands; manual movement waits for a click or an explicit step onto the pile, at most
    // MANUAL_LOOT_WAIT_MS of combat time (leaving collects what is left: a hero left alone in 직접 이동 kept the map forever).
    const MANUAL_LOOT_WAIT_MS=20000;
    const lootWalks=new WeakMap(); // run → {stalls, clearedAt} (transient, like the discovery memos)
    const walkedMs=new WeakMap(); // run → ms the hero walked since the last combat tick took it (takeWalkedMs, transient)
    const inscriptionVisits=new WeakMap(); // run → last settled cell/room checked, never part of a save
    // 자동 이동의 유예(2026-10-24 사용자: "자동사냥 켰을때 이동하기까지 약간의 유예, 자동 상태에서 마우스나 wasd로 조작했을 때 다시
    // 이동하기까지도 약간의 유예"): 자동을 켠 뒤 AUTO_START_GRACE_MS, 직접 내린 명령(클릭, WASD, 락온)이 끝난 뒤 AUTO_RESUME_GRACE_MS
    // 동안은 자동으로 걷거나 다가가지 않고 제자리에서 사거리 안만 친다. 화면 앞의 조작에 맞춘 것이라 방치 정산에는 없다.
    const AUTO_START_GRACE_MS=1000,AUTO_RESUME_GRACE_MS=1500;
    const autoHolds=new WeakMap(); // run → movement-clock ms until which auto-move waits (transient, never saved)
    const clockOf=run=>run.motionTimeMs||getCombatTime();
    function holdAuto(run,ms) {autoHolds.set(run,Math.max(autoHolds.get(run)||0,clockOf(run)+ms));}
    function autoHeld(run) {return !game.isBackgroundCalculation && (autoHolds.get(run)||0)>clockOf(run);}
    /** While a manual order (click, WASD, lock-on) is under way the grace keeps moving on, so AUTO_RESUME_GRACE_MS counts from the
     * moment it ends; with no order, auto-move waits out the grace. @returns {boolean} true while auto-move waits. */
    function waitsForAutoGrace(run) {
        if(run.destination || actExplorationState.lockedEnemy(run)){holdAuto(run,AUTO_RESUME_GRACE_MS);return false;}
        return runMode(run)!=='manual' && autoHeld(run);
    }
    /** Auto-move was just turned on (js/act-exploration-ui.js toggleAuto, mode): it starts walking after the grace. */
    function holdAutoStart(run) {if(run)holdAuto(run,AUTO_START_GRACE_MS);}
    const ground=actExplorationState.groundLoot;
    function advance(stats) {
        const run=actExplorationState.current(game);
        if(!run)return false;
        tick(getCombatTime(),stats);
        return true;
    }
    /** Foreground frames and offline combat ticks advance the same 20 ms movement clock. */
    /** A live run walks; a cleared one (its boss down) finishes the step it was taking, so the hero can still fight, and with
     * auto-move picks up the floor items before the map completes. */
    const stepsLeft=run=>canMove(run) || (run.status==='cleared' && !!run.motion);
    function tick(now,stats) {
        const run=actExplorationState.current(game);
        if(!run || !stepsLeft(run))return;
        if(game.combatHalted || game.moveTimer>0) {
            actExplorationMotion.rebase(run,now);
            return;
        }
        if(run.arrival)delete run.arrival; // laid out during the move; from here it is the act's live run
        actExplorationDoors.sendStraysBack(run); // 방 단위 무대: 다른 방에서 싸움에 든 몬스터는 제 무리로 돌아간다
        if(!run.motionTimeMs)run.motionTimeMs=now;
        // Combat replay supplies fixed ticks. A restored/stalled foreground clock must not
        // turn one frame into an unbounded movement-only catch-up loop.
        if(now-run.motionTimeMs>1000)actExplorationMotion.rebase(run,now-100);
        while(run.motionTimeMs+20<=now) {
            run.motionTimeMs+=20;
            stepFrame(run,stats);
        }
    }
    /** One 20 ms movement frame: the step, the approach after a finished step, and the walked time (takeWalkedMs). */
    function stepFrame(run,stats) {
        const walking=run.motion;
        step(run,stats);
        continueApproachAfterStep(run,walking,stats);
        if(walking)walkedMs.set(run,(walkedMs.get(run)||0)+20);
    }
    /** A step that ends goes on toward the fight at once, on a foreground frame and inside a combat tick alike. Waiting for
     * the next 100 ms tick (offline replay) locked the hero and an enemy across a blocked cell into mirrored steps: no kill
     * for minutes (2026-10-07). */
    function continueApproachAfterStep(run,walking,stats) {
        if(walking && walking.elapsed===walking.duration && !run.motion)continuePlayerExplorationApproach(stats);
    }
    function step(run,stats) {
        actExplorationProgress.objects.step(run,20);
        const from=run.motion&&run.motion.from;
        actExplorationMotion.advance(run,game.gridPlayer,run.motionTimeMs,canEnterMotionTile(run));
        swapSummonOutOfHeroTile(from);
        if(run.motion)return;
        if(!explore(run,stats)){walkClearedCommand(run,stats);return;}
        actExplorationDoors.cross(run); // 방 단위 무대: 열린 문 칸에 서 있으면 이어진 방으로 옮겨진 뒤 그 방을 본다
        actExplorationState.discover(run,game.gridPlayer,stats);
        recordVisitedInscription(run);
        const opened=actExplorationState.entrance(run);
        wakeBosses(actExplorationState.engage(game,run.motionTimeMs));
        announceAlerted(actExplorationState.wake(game,actExplorationState.alerted(game)));
        const entrance=watchEntrance(run,opened);
        const cleared=run.packs.filter(pack=>pack.aliveIds.length===0).length;
        // 벌집 원정(한 줄 지도)의 진행도는 갈림길 수다(js/ui.js): 방은 처음부터 비어 있어 방 수로 세면 맞지 않는다
        if(!(run.source && run.source.chain===true))game.runProgress=Math.min(99,100*cleared/run.packs.length);
        if(holdsOrDetours(run,entrance,stats))return;
        const target=actExplorationState.destination(run,game.gridPlayer,runMode(run));
        if(!target)return;
        if(target.gx===game.gridPlayer.gx && target.gy===game.gridPlayer.gy){run.destination=null;return;}
        walk(run,target,stats);
    }
    /** 복원 첫 걸음과 방을 바꿀 때 확인한다. 옛 방문 목록에 있는 방도 다시 들어서면 기록할 수 있다. */
    function recordVisitedInscription(run) {
        if(!JOURNAL_DB['inscription_'+run.zoneId])return;
        const hero=game.gridPlayer,prior=inscriptionVisits.get(run);
        if(prior && prior.gx===hero.gx && prior.gy===hero.gy)return;
        const room=actExplorationDoors.room(run);
        inscriptionVisits.set(run,{gx:hero.gx,gy:hero.gy,roomId:room?.id});
        if(room && room.id!==prior?.roomId)recordInscription(run,false);
    }
    /** 기존 비문을 실제 방문/클리어 때 한 번 기록한다. 그림 그리기나 반복 프레임에는 저장을 쓰지 않는다. */
    function recordInscription(run,completed) {
        const id='inscription_'+run.zoneId,entry=JOURNAL_DB[id];
        if(!entry || entry.afterClear!==completed || game.journalEntries.includes(id))return;
        if(!actExplorationDoors.stageMap(run))return;
        if(!completed && actExplorationDoors.room(run)?.role!=='optional')return;
        unlockJournalEntry(id);
        if(!game.isBackgroundCalculation)queueImportantSave(220);
    }
    /** A loot-waiting map may cross internal room doors, but never engages new packs or advances to another map. */
    function walkClearedCommand(run,stats) {
        if(run.status!=='cleared'||run.motion)return;
        if(collectingLoot(run))actExplorationDoors.cross(run);
        recordVisitedInscription(run);
        const target=run.destination;
        if(!target)return;
        if(target.gx===game.gridPlayer.gx && target.gy===game.gridPlayer.gy){run.destination=null;return;}
        walk(run,target,stats);
    }
    function walk(run,target,stats) {
        // 공격 후딜(js/combat.js isPlayerAttackRecovering): 명령은 그대로 두고 멈춘 걸음으로도 세지 않는다. 후딜이 끝나는 프레임에 걷는다.
        if(isPlayerAttackRecovering(run.motionTimeMs))return;
        const stepped=walkStep(actExplorationDoors.toward(run,target),stats);
        if(stepped || target!==run.destination){commandStalls.delete(run);return;}
        const stalls=(commandStalls.get(run)||0)+1;
        commandStalls.set(run,stalls);
        if(stalls>=COMMAND_GIVE_UP_STEPS){run.destination=null;actExplorationProgress.objects.cancel(run);commandStalls.delete(run);}
    }
    /** The player stands still at the threshold while the boss rises. A fight pauses the automatic walk, never a command; once
     * nothing fights, auto-move first walks to floor items. Returns whether this step's exploration walk is skipped. */
    function holdsOrDetours(run,entrance,stats) {
        if(entrance)return true;
        if(waitsForAutoGrace(run))return true;
        if(run.destination)return false;
        if(actExplorationDoors.fightingHere(run))return true;
        return runMode(run)!=='manual' && walkToLoot(run,stats);
    }
    /** Floor pickups on every settled step; a cleared map only walks to its floor items. Returns whether exploration goes on. */
    function explore(run,stats) {
        pickUp(run);
        if(run.status==='cleared' && collectingLoot(run) && runMode(run)!=='manual')walkToLoot(run,stats);
        return run.status==='active';
    }
    function walkStep(target,stats) {
        // Safe travel is quicker; engagement/approach retains the normal movement stat.
        const travelScale=game.enemies.some(enemy=>enemy.hp>0)?1:0.75;
        const interval=COMBAT_GRID_CONFIG.playerMoveIntervalSec*100/stats.moveSpeed*travelScale;
        return advanceGridUnitMovement(game.gridPlayer,target,0.1,interval);
    }
    /** Floor items on the hero's cell are picked up; an offline replay walks no detours and picks everything up at once. */
    function pickUp(run) {
        const rows=game.isBackgroundCalculation?ground.takeAll(run):ground.takeNear(run,game.gridPlayer,getCombatTime());
        if(rows.length)collectExplorationFloorLoot(rows);
    }
    /** Auto-move heads for the nearest floor pile once nothing fights. A pile it cannot get closer to for COMMAND_GIVE_UP_STEPS
     * steps is collected from where the hero stands, so a walled-off drop never holds the map. Only a drop that has landed is
     * walked to: while something is still falling the hero waits where it stands. Returns whether it walked or waited. */
    function walkToLoot(run,stats) {
        const now=getCombatTime(),pile=ground.nearest(run,game.gridPlayer,now);
        if(!pile)return ground.falling(run,now);
        const memo=lootWalks.get(run)||{stalls:0};lootWalks.set(run,memo);
        if(isPlayerAttackRecovering(run.motionTimeMs))return true;
        memo.stalls=walkStep(actExplorationDoors.toward(run,pile),stats)?0:memo.stalls+1;
        if(memo.stalls>=COMMAND_GIVE_UP_STEPS){memo.stalls=0;collectExplorationFloorLoot(ground.takeAt(run,pile));}
        return true;
    }
    /** A cleared map stays put until every floor item is collected; in manual mode for MANUAL_LOOT_WAIT_MS at most. */
    function collectingLoot(run) {
        if(run.status!=='cleared' || run.completionApplied || game.isBackgroundCalculation || !ground.nearest(run,game.gridPlayer))return false;
        if(runMode(run)!=='manual')return true;
        const memo=lootWalks.get(run)||{stalls:0};lootWalks.set(run,memo);
        const now=getCombatTime();
        if(memo.clearedAt===undefined)memo.clearedAt=now;
        return now-memo.clearedAt<MANUAL_LOOT_WAIT_MS;
    }
    /** Movement controls stay available while a cleared map waits for floor pickups. Completion/failed maps accept no new walk. */
    function canMove(run) {
        return !!run && (run.status==='active' || collectingLoot(run));
    }
    /** The mode a new run starts in: the chosen route (보스 직행 · 전체 탐색) while auto-move is on, else 직접 이동. */
    function startMode(settings) {
        return settings.autoMove===false?'manual':settings.actExplorationMode;
    }
    /** A newly opened boss entrance cues its presentation (js/canvas-boss-entrance.js) with the rising enemies. */
    function watchEntrance(run,opened) {
        const entrance=actExplorationState.entrance(run);
        if(!entrance || entrance===opened)return entrance;
        const pack=run.packs.find(row=>row.key===entrance.key);
        addBattleFx('bossEntrance',{enemies:pack.waiting,enemyIds:pack.waiting.map(enemy=>enemy.id),holdMs:entrance.holdMs,duration:entrance.holdMs+600});
        return entrance;
    }
    /** A listening pack (data ACT_EXPLORATION_ALERT) heard the fight and runs at the hero; the view marks it (js/canvas-combat-feedback.js). */
    function announceAlerted(woken) {
        if(woken.length)dispatchRuntimeEvent('exploration-alert',{enemyIds:woken.map(enemy=>enemy.id)});
    }
    /** Bosses wait in their room from the map's creation: their hidden-journal count (no hit) starts as they wake. */
    function wakeBosses(woken) {
        const zone=getZone(game.currentZoneId);
        for(const enemy of woken)if(enemy.isBoss){restartHiddenJournalBossRun(enemy,zone);beginRoomBossRules(zone);}
    }
    /** Occupancy matters only when the authoritative hit cell crosses the tile boundary. */
    function canEnterMotionTile(run) {
        const motion=run.motion;
        if(!motion || motion.elapsed>=motion.duration/2 || run.motionTimeMs-motion.startedAt<motion.duration/2)return true;
        return canPlaceGridFootprint(getHeroStepBlockedCells(),motion.to.gx,motion.to.gy,{columns:1,rows:1});
    }
    function moving() {return !!actExplorationState.current(game)?.motion;}
    /** The ms the hero walked (20 ms movement frames) since the last call, then 0: each combat tick takes it (js/combat.js
     * getWalkingChargeScale). */
    function takeWalkedMs() {
        const run=actExplorationState.current(game),ms=run?walkedMs.get(run)||0:0;
        if(run)walkedMs.delete(run);
        return ms;
    }
    /** A click on a floor pile (js/battle-ground-loot-ui.js) picks it up at once, wherever the hero stands. */
    function collectPile(cell) {
        const run=actExplorationState.current(game);
        const rows=run?ground.takeAt(run,cell):[];
        if(rows.length){collectExplorationFloorLoot(rows);queueImportantSave(220);}
        return rows.length;
    }
    /** The current run once it has begun. A map laid out during the move toward the act (arrival) is only the
     * scenery of the wait: completion and stall checks still belong to whatever encounter is actually running. */
    function live(state=game) {
        const run=actExplorationState.current(state);
        return run && !run.arrival ? run : null;
    }
    function canFinish() {
        const run=live();
        if(run)return run.status==='cleared' && !run.completionApplied && !collectingLoot(run);
        return game.runProgress>=100 && game.encounterIndex>=game.encounterPlan.length && game.enemies.length===0;
    }
    /** Drops are already owned. Completion only commits the encounter's progression. */
    function beginCompletion(zone) {
        const run=live();
        if(!run)return true;
        if(!canFinish())return false;
        actExplorationMotion.cancel(run);
        actExplorationState.retireCombat(game);
        run.completionApplied=true;
        recordInscription(run,true);
        game.runProgress=100;
        // Act 4's two actual boss kills happen within this one map, not two new maps (zones without kill counts skip it).
        if(Number.isFinite(zone.maxKills))game.killsInZone=Math.max(game.killsInZone,zone.maxKills-1);
        return true;
    }
    function shouldTrackStall() {
        return !live() && game.moveTimer<=0 && game.enemies.length===0;
    }
    /** Auto-move off (mode manual) is a choice made in front of the screen: offline replay always walks, with the saved
     * route preference (직행 · 전체). The run keeps 'manual', so the hero stands again once the player is back. */
    function runMode(run,state=game) {
        if(run.mode!=='manual' || !state.isBackgroundCalculation)return run.mode;
        return state.settings.actExplorationMode==='full' ? 'full' : 'direct';
    }
    /** The hero neither chases nor sidesteps: a hazard asked for it, auto-move is off, or a move command is under way
     * (the command walks in step; the combat engagement only fights what is in reach). */
    /** 영웅이 제자리에서 사거리 안만 치는가: 위험을 피하라는 요청, 걷는 명령, 직접 이동. 직접 이동이라도 락온한 몬스터
     * (js/act-exploration-state.js lockOn)가 살아 있으면 그 명령으로 보고 다가가 싸운다. */
    function holdPosition(requested) {
        const run=actExplorationState.current(game);
        if(!run)return !!requested;
        const locked=!!actExplorationState.lockedEnemy(run);
        // 자동 이동의 유예 동안도 제자리(락온한 몬스터는 명령이라 다가간다)
        return requested || (runMode(run)==='manual' && !locked) || !!run.destination || (autoHeld(run) && !locked);
    }
    function waiting(state) {
        const run=actExplorationState.current(state);
        return !!(run && (run.status==='failed' || (run.completionApplied && !run.departure)));
    }
    /** Rewards/story have committed. Keep the old map visible before the already-selected exit. */
    function deferDeparture(state) {
        const run=state.actExploration;
        if(!run?.completionApplied || state.isBackgroundCalculation)return false;
        run.departure={zoneId:state.currentZoneId,remainingMs:actExplorationState.settlementMs};
        state.currentZoneId=run.zoneId;
        state.combatHalted=false;
        return true;
    }
    /** Ordinary maps settle their floor on departure. A colony or breach departure abandons that encounter's uncollected loot. */
    function depart(state) {
        const run=state.actExploration;
        if(run && ['colony_run','grand_breach_run'].includes(run.zoneId))ground.discardEncounter(state,run.zoneId);
        else if(run && state===game){const rows=ground.takeAll(run);if(rows.length)collectExplorationFloorLoot(rows);}
        else if(run)ground.settleOnLoad(state,run);
        state.actExploration=null;
    }
    function stopAfterCompletion(state) {
        state.combatHalted=true;
        state.enemies=[];state.encounterPlan=[];state.encounterIndex=0;
        state.runProgress=actExplorationState.current(state)?.completionApplied?100:0;
    }
    function reconcileDeparture(state) {
        if(state.actExploration && !actExplorationState.current(state))depart(state);
    }
    function defeat(state) {
        const run=actExplorationState.current(state);
        if(run && !run.completionApplied){actExplorationMotion.cancel(run);run.status='failed';}
    }
    return {advance,tick,moving,takeWalkedMs,collectPile,canMove,canFinish,beginCompletion,shouldTrackStall,holdPosition,holdAutoStart,runMode,startMode,waiting,deferDeparture,stopAfterCompletion,depart,reconcileDeparture,defeat};
})();
safeExposeGlobals({actExplorationProgress});
