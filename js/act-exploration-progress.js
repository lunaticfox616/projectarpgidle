// Combat progression adapter: authored exploration -> existing grid movement and enemies.
// It never rolls enemies, rewards, attacks or runs a second combat loop.
const actExplorationProgress = (() => {
    // A move command that makes no progress for this many 20 ms steps (its cell taken, or out of reach) is dropped:
    // the hero stays as close as it got and, with auto-move on, goes back to exploring.
    const COMMAND_GIVE_UP_STEPS=15;
    const commandStalls=new WeakMap(); // run → steps the command has not advanced (transient, like the discovery memos)
    function advance(stats) {
        const run=actExplorationState.current(game);
        if(!run)return false;
        tick(getCombatTime(),stats);
        return true;
    }
    /** Foreground frames and offline combat ticks advance the same 20 ms movement clock. */
    /** A live run walks; a cleared one (its boss down) only finishes the step it was taking, so the hero can still fight. */
    const stepsLeft=run=>run.status==='active' || (run.status==='cleared' && !!run.motion);
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
            step(run,stats);
        }
    }
    function step(run,stats) {
        actExplorationMotion.advance(run,game.gridPlayer,run.motionTimeMs,canEnterMotionTile(run));
        if(run.motion || run.status!=='active')return;
        const visible=actExplorationState.discover(run,game.gridPlayer),opened=actExplorationState.entrance(run);
        wakeBosses(actExplorationState.engage(game,visible,run.motionTimeMs));
        const entrance=watchEntrance(run,opened);
        const cleared=run.packs.filter(pack=>pack.aliveIds.length===0).length;
        game.runProgress=Math.min(99,100*cleared/run.packs.length);
        // The player stands still at the threshold while the boss rises. A fight pauses the automatic walk, never a command.
        if(entrance || (!run.destination && game.enemies.some(enemy=>enemy.hp>0)))return;
        const target=actExplorationState.destination(run,game.gridPlayer,runMode(run));
        if(!target)return;
        if(target.gx===game.gridPlayer.gx && target.gy===game.gridPlayer.gy){run.destination=null;return;}
        walk(run,target,stats);
    }
    function walk(run,target,stats) {
        const interval=COMBAT_GRID_CONFIG.playerMoveIntervalSec*100/stats.moveSpeed;
        const stepped=advanceGridUnitMovement(game.gridPlayer,target,0.1,interval);
        if(stepped || target!==run.destination){commandStalls.delete(run);return;}
        const stalls=(commandStalls.get(run)||0)+1;
        commandStalls.set(run,stalls);
        if(stalls>=COMMAND_GIVE_UP_STEPS){run.destination=null;commandStalls.delete(run);}
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
    /** Bosses wait in their room from the map's creation: their hidden-journal count (no hit, no flask) starts as they wake. */
    function wakeBosses(woken) {
        const zone=getZone(game.currentZoneId);
        for(const enemy of woken)if(enemy.isBoss)restartHiddenJournalBossRun(enemy,zone);
    }
    /** Occupancy matters only when the authoritative hit cell crosses the tile boundary. */
    function canEnterMotionTile(run) {
        const motion=run.motion;
        if(!motion || motion.elapsed>=motion.duration/2 || run.motionTimeMs-motion.startedAt<motion.duration/2)return true;
        return canPlaceGridFootprint(getGridBlockedCells(game.gridPlayer),motion.to.gx,motion.to.gy,{columns:1,rows:1});
    }
    function moving() {return !!actExplorationState.current(game)?.motion;}
    /** The current run once it has begun. A map laid out during the move toward the act (arrival) is only the
     * scenery of the wait: completion and stall checks still belong to whatever encounter is actually running. */
    function live(state=game) {
        const run=actExplorationState.current(state);
        return run && !run.arrival ? run : null;
    }
    function canFinish() {
        const run=live();
        if(run)return run.status==='cleared' && !run.completionApplied;
        return game.runProgress>=100 && game.encounterIndex>=game.encounterPlan.length && game.enemies.length===0;
    }
    /** Claim first: invalid rewards leave completion retryable, before story/unlock changes. */
    function beginCompletion(zone) {
        const run=live();
        if(!run)return {loot:null};
        if(!canFinish())return false;
        const loot=actExplorationLoot.claim(game,run);
        actExplorationMotion.cancel(run);
        actExplorationState.retireCombat(game);
        run.completionApplied=true;
        game.runProgress=100;
        // Act 4's two actual boss kills happen within this one map, not two new maps (zones without kill counts skip it).
        if(Number.isFinite(zone.maxKills))game.killsInZone=Math.max(game.killsInZone,zone.maxKills-1);
        return {loot};
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
    function depart(state) {actExplorationLoot.discard(state.actExploration);state.actExploration=null;}
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
        if(run && !run.completionApplied){actExplorationMotion.cancel(run);actExplorationLoot.discard(run);run.status='failed';}
    }
    return {advance,tick,moving,canFinish,beginCompletion,shouldTrackStall,holdPosition,runMode,startMode,waiting,deferDeparture,stopAfterCompletion,depart,reconcileDeparture,defeat};
})();
safeExposeGlobals({actExplorationProgress});
