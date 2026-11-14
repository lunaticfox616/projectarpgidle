import { motionStart, motionAdvance, motionCancel, motionRebase, motionPosition, motionValidate } from './exploration-motion-cells.mjs';
import { motionSetFreeInput, motionStartFree, motionAdvanceFree, motionAimFree, motionPreciseTarget, motionTakeDirectAim } from './exploration-motion-free.mjs';
/** One session instance owns transient poses. Saved run.motion is the authoritative grid step, in combat milliseconds. */
export function createExplorationMotion({depth,walkable}) {
    const memo={free:new WeakMap(),preciseGoals:new WeakMap(),depth};
    return {
        start:motionStart,
        advance:(run,player,now,canEnter)=>motionAdvance(memo,run,player,now,canEnter),
        cancel:run=>motionCancel(memo,run),
        rebase:motionRebase,
        position:(run,player)=>motionPosition(memo,run,player),
        validate:(run,player,map)=>motionValidate(walkable,run,player,map),
        setFreeInput:(run,player,dx,dy)=>motionSetFreeInput(memo,run,player,dx,dy),
        startFree:(run,player,target,interval)=>motionStartFree(memo,run,player,target,interval),
        advanceFree:(run,player,interval,canEnter)=>motionAdvanceFree(memo,run,player,interval,canEnter),
        freeMoving:run=>!!memo.free.get(run)?.moved,
        freeBusy:run=>!!(memo.free.get(run)?.input || memo.free.get(run)?.target),
        stopFree:run=>memo.free.delete(run),
        aimFree:(run,point)=>motionAimFree(memo,run,point),
        preciseTarget:(run,cell)=>motionPreciseTarget(memo,run,cell),
        takeDirectAim:run=>motionTakeDirectAim(memo,run)
    };
}
