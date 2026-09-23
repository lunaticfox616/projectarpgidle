// Combat progression adapter: authored exploration -> existing grid movement and enemies.
// It never rolls enemies, rewards, attacks or runs a second combat loop.
const actExplorationProgress = (() => {
    function advance(stats) {
        const run=actExplorationState.current(game);
        if(!run)return false;
        tick(getCombatTime(),stats);
        return true;
    }
    /** Foreground frames and offline combat ticks advance the same 20 ms movement clock. */
    function tick(now,stats) {
        const run=actExplorationState.current(game);
        if(!run || run.status!=='active')return;
        if(game.combatHalted || game.moveTimer>0) {
            actExplorationMotion.rebase(run,now);
            return;
        }
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
        if(run.motion)return;
        const visible=actExplorationState.discover(run,game.gridPlayer);
        actExplorationState.engage(game,visible);
        const cleared=run.packs.filter(pack=>pack.aliveIds.length===0).length;
        game.runProgress=Math.min(99,100*cleared/run.packs.length);
        if(run.mode!=='manual' && game.enemies.some(enemy=>enemy.hp>0))return;
        const target=actExplorationState.destination(run,game.gridPlayer);
        if(!target)return;
        if(target.gx===game.gridPlayer.gx && target.gy===game.gridPlayer.gy){run.destination=null;return;}
        const interval=COMBAT_GRID_CONFIG.playerMoveIntervalSec*100/stats.moveSpeed;
        advanceGridUnitMovement(game.gridPlayer,target,0.1,interval);
    }
    /** Occupancy matters only when the authoritative hit cell crosses the tile boundary. */
    function canEnterMotionTile(run) {
        const motion=run.motion;
        if(!motion || motion.elapsed>=motion.duration/2 || run.motionTimeMs-motion.startedAt<motion.duration/2)return true;
        return canPlaceGridFootprint(getGridBlockedCells(game.gridPlayer),motion.to.gx,motion.to.gy,{columns:1,rows:1});
    }
    function moving() {return !!actExplorationState.current(game)?.motion;}
    function canFinish() {
        const run=actExplorationState.current(game);
        if(run)return run.status==='cleared' && !run.completionApplied;
        return game.runProgress>=100 && game.encounterIndex>=game.encounterPlan.length && game.enemies.length===0;
    }
    /** Claim first: invalid rewards leave completion retryable, before story/unlock changes. */
    function beginCompletion(zone) {
        const run=actExplorationState.current(game);
        if(!run)return {loot:null};
        if(!canFinish())return false;
        const loot=actExplorationLoot.claim(game,run);
        actExplorationMotion.cancel(run);
        actExplorationState.retireCombat(game);
        run.completionApplied=true;
        game.runProgress=100;
        // Act 4's two actual boss kills happen within this one map, not two new maps.
        game.killsInZone=Math.max(game.killsInZone,zone.maxKills-1);
        return {loot};
    }
    function shouldTrackStall() {
        return !actExplorationState.current(game) && game.moveTimer<=0 && game.enemies.length===0;
    }
    function holdPosition(requested) {
        const run=actExplorationState.current(game);
        return requested || !!(run && run.mode==='manual');
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
    return {advance,tick,moving,canFinish,beginCompletion,shouldTrackStall,holdPosition,waiting,deferDeparture,stopAfterCompletion,depart,reconcileDeparture,defeat};
})();
safeExposeGlobals({actExplorationProgress});
