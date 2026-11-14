

export function objectDistance(a,b) {return Math.max(Math.abs(a.gx-b.gx),Math.abs(a.gy-b.gy));}

export function objectEntries(run) {return run.objects?.entries||[];}

export function objectCancel(run) {if(run?.objects)run.objects.pendingId=null;}

export function objectInteractive(env, run) {
    return run && !run.arrival && run.status==='active' && !run.completionApplied
        && !env.owner.isBackgroundCalculation && !env.owner.combatHalted && env.owner.playerHp>0 && env.owner.moveTimer<=0;
}
