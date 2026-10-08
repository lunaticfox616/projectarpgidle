// Combat progression adapter: authored exploration -> existing grid movement and enemies.
// It never rolls enemies, rewards, attacks or runs a second combat loop.
const actExplorationProgress = (() => {
    // A move command that makes no progress for this many 20 ms steps (its cell taken, or out of reach) is dropped:
    // the hero stays as close as it got and, with auto-move on, goes back to exploring.
    const COMMAND_GIVE_UP_STEPS=15;
    const commandStalls=new WeakMap(); // run → steps the command has not advanced (transient, like the discovery memos)
    // After the last boss falls, auto-move walks to what it dropped before the map completes, for at most this long: a pile the
    // hero cannot reach is collected from where it stands, and leaving the map settles anything left (js/exploration-ground-loot.js).
    const LOOT_WALK_MAX_MS=12000;
    const lootWalks=new WeakMap(); // run → {stalls, clearedAt} (transient, like the discovery memos)
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
    const stepsLeft=run=>run.status==='active' || (run.status==='cleared' && (!!run.motion || collectingLoot(run)));
    function tick(now,stats) {
        const run=actExplorationState.current(game);
        if(!run || !stepsLeft(run))return;
        if(game.combatHalted || game.moveTimer>0) {
            actExplorationMotion.rebase(run,now);
            return;
        }
        if(run.arrival)delete run.arrival; // laid out during the move; from here it is the act's live run
        if(!run.motionTimeMs)run.motionTimeMs=now;
        // Combat replay supplies fixed ticks. A restored/stalled foreground clock must not
        // turn one frame into an unbounded movement-only catch-up loop.
        if(now-run.motionTimeMs>1000)actExplorationMotion.rebase(run,now-100);
        while(run.motionTimeMs+20<=now) {
            run.motionTimeMs+=20;
            const walking=run.motion;
            step(run,stats);
            continueApproachAfterStep(run,walking,stats);
        }
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
        if(run.motion || !explore(run,stats))return;
        actExplorationState.discover(run,game.gridPlayer,actExplorationState.sightRadius(stats));
        const opened=actExplorationState.entrance(run);
        wakeBosses(actExplorationState.engage(game,actExplorationState.notice(run,game.gridPlayer),run.motionTimeMs));
        const entrance=watchEntrance(run,opened);
        const cleared=run.packs.filter(pack=>pack.aliveIds.length===0).length;
        game.runProgress=Math.min(99,100*cleared/run.packs.length);
        if(holdsOrDetours(run,entrance,stats))return;
        const target=actExplorationState.destination(run,game.gridPlayer,runMode(run));
        if(!target)return;
        if(target.gx===game.gridPlayer.gx && target.gy===game.gridPlayer.gy){run.destination=null;return;}
        walk(run,target,stats);
    }
    function walk(run,target,stats) {
        const stepped=walkStep(target,stats);
        if(stepped || target!==run.destination){commandStalls.delete(run);return;}
        const stalls=(commandStalls.get(run)||0)+1;
        commandStalls.set(run,stalls);
        if(stalls>=COMMAND_GIVE_UP_STEPS){run.destination=null;actExplorationProgress.objects.cancel(run);commandStalls.delete(run);}
    }
    /** The player stands still at the threshold while the boss rises. A fight pauses the automatic walk, never a command; once
     * nothing fights, auto-move first walks to floor items. Returns whether this step's exploration walk is skipped. */
    function holdsOrDetours(run,entrance,stats) {
        if(entrance)return true;
        if(run.destination)return false;
        if(game.enemies.some(enemy=>enemy.hp>0)||actExplorationState.objects.active(run))return true;
        return runMode(run)!=='manual' && walkToLoot(run,stats);
    }
    /** Floor pickups on every settled step; a cleared map only walks to its floor items. Returns whether exploration goes on. */
    function explore(run,stats) {
        pickUp(run);
        if(run.status==='cleared' && collectingLoot(run))walkToLoot(run,stats);
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
        const rows=game.isBackgroundCalculation?ground.takeAll(run):ground.takeNear(run,game.gridPlayer);
        if(rows.length)collectExplorationFloorLoot(rows);
    }
    /** Auto-move heads for the nearest floor pile once nothing fights. A pile it cannot get closer to for COMMAND_GIVE_UP_STEPS
     * steps is collected from where the hero stands, so a walled-off drop never holds the map. Returns whether it walked. */
    function walkToLoot(run,stats) {
        const pile=ground.nearest(run,game.gridPlayer);
        if(!pile)return false;
        const memo=lootWalks.get(run)||{stalls:0,clearedAt:null};lootWalks.set(run,memo);
        memo.stalls=walkStep(pile,stats)?0:memo.stalls+1;
        if(memo.stalls>=COMMAND_GIVE_UP_STEPS){memo.stalls=0;collectExplorationFloorLoot(ground.takeAt(run,pile));}
        return true;
    }
    /** A cleared map waits for auto-move to pick up its floor items, at most LOOT_WALK_MAX_MS of combat time. */
    function collectingLoot(run) {
        if(run.status!=='cleared' || run.completionApplied || game.isBackgroundCalculation || runMode(run)==='manual'
            || !ground.nearest(run,game.gridPlayer))return false;
        const memo=lootWalks.get(run)||{stalls:0,clearedAt:null};lootWalks.set(run,memo);
        const now=getCombatTime();
        if(memo.clearedAt===null)memo.clearedAt=now;
        return now-memo.clearedAt<LOOT_WALK_MAX_MS;
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
    /** Bosses wait in their room from the map's creation: their hidden-journal count (no hit) starts as they wake. */
    function wakeBosses(woken) {
        const zone=getZone(game.currentZoneId);
        for(const enemy of woken)if(enemy.isBoss)restartHiddenJournalBossRun(enemy,zone);
    }
    /** Occupancy matters only when the authoritative hit cell crosses the tile boundary. */
    function canEnterMotionTile(run) {
        const motion=run.motion;
        if(!motion || motion.elapsed>=motion.duration/2 || run.motionTimeMs-motion.startedAt<motion.duration/2)return true;
        return canPlaceGridFootprint(getHeroStepBlockedCells(),motion.to.gx,motion.to.gy,{columns:1,rows:1});
    }
    function moving() {return !!actExplorationState.current(game)?.motion;}
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
    function holdPosition(requested) {
        const run=actExplorationState.current(game);
        return requested || !!(run && (runMode(run)==='manual' || run.destination));
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
    /** Leaving the map (next map, town, death, portal) picks up whatever is still on its floor: nothing is left behind. */
    function depart(state) {
        const run=state.actExploration;
        if(run && state===game){const rows=ground.takeAll(run);if(rows.length)collectExplorationFloorLoot(rows);}
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
    return {advance,tick,moving,collectPile,canFinish,beginCompletion,shouldTrackStall,holdPosition,runMode,startMode,waiting,deferDeparture,stopAfterCompletion,depart,reconcileDeparture,defeat};
})();
safeExposeGlobals({actExplorationProgress});
