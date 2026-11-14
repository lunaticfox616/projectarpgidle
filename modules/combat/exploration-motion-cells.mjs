export function motionSameCell(a,b) {return a.gx===b.gx && a.gy===b.gy;}
export function motionCellOf(p) {return {gx:Math.round(p.gx),gy:Math.round(p.gy)};}
export function motionDuration(interval) {return Math.max(120,Math.min(10000,Math.round(interval*1000/20)*20));}

export function motionStart(run,player,next,interval,now) {
    if(run.motion)return false;
    const duration=motionDuration(interval);
    run.motion={from:{gx:player.gx,gy:player.gy},to:{gx:next.gx,gy:next.gy},startedAt:now,elapsed:0,duration};
    if(next.gx!==player.gx)run.motionDirection=next.gx<player.gx?'west':'east';
    else run.motionDirection=next.gy<player.gy?'north':'south';
    return true;
}
export function motionCancel(memo,run) {if(run){run.motion=null;memo.free.delete(run);}}
/** Discard paused combat milliseconds without moving the fractional pose. */
export function motionRebase(run,now) {
    if(now<=run.motionTimeMs)return;
    if(run.motion)run.motion.startedAt+=now-run.motionTimeMs;
    run.motionTimeMs=now;
}
/** The grid owns collision, gates and reservations. Authority crosses cells at the midpoint. */
export function motionAdvance(memo,run,player,now,canEnter) {
    const motion=run.motion;if(!motion)return;
    const expected=motion.elapsed<motion.duration/2?motion.from:motion.to;
    if(!motionSameCell(player,expected)){motionCancel(memo,run);return;}
    const next=Math.min(motion.duration,Math.max(motion.elapsed,now-motion.startedAt));
    if(motion.elapsed<motion.duration/2 && next>=motion.duration/2) {
        if(!canEnter){motionCancel(memo,run);return;}
        Object.assign(player,motion.to,{gridMoveTimer:0});
    }
    motion.elapsed=next;
    if(next===motion.duration)motionCancel(memo,run);
}
/** Camera and actor consume the same position; rendering never advances motion. */
export function motionPosition(memo,run,player) {
    const pose=memo.free.get(run)?.pose;
    if(pose && motionSameCell(player,motionCellOf(pose)))return pose;
    const motion=run.motion;
    if(!motion)return {gx:player.gx,gy:player.gy};
    const progress=motion.elapsed/motion.duration;
    return {gx:motion.from.gx+(motion.to.gx-motion.from.gx)*progress,
        gy:motion.from.gy+(motion.to.gy-motion.from.gy)*progress};
}
export function motionValidate(walkable,run,player,map) {
    // Old staged saves restore stationary; malformed current saves remain explicit errors.
    if(run.motion===undefined){run.motion=null;run.motionTimeMs=0;run.motionDirection='south';}
    if(!Number.isFinite(run.motionTimeMs) || run.motionTimeMs<0)throw Error('탐험 이동 시각이 잘못되었습니다.');
    if(!['north','south','east','west'].includes(run.motionDirection))throw Error('탐험 이동 방향이 잘못되었습니다.');
    const motion=run.motion;if(motion===null)return;
    motionValidateTiming(motion,run.motionTimeMs);
    motionValidateCells(walkable,motion,player,map);
}
function motionValidateTiming(motion,now) {
    if(!motion || ![motion.startedAt,motion.duration,motion.elapsed].every(Number.isFinite))throw Error('탐험 이동 수치가 잘못되었습니다.');
    if(motion.startedAt<0)throw Error('탐험 이동 시작 시각이 잘못되었습니다.');
    if(motion.duration<120 || motion.duration>10000)throw Error('탐험 이동 시간이 잘못되었습니다.');
    if(motion.elapsed<0 || motion.elapsed>=motion.duration)throw Error('탐험 이동 진행이 잘못되었습니다.');
    if(Math.abs(now-motion.startedAt-motion.elapsed)>0.001)throw Error('탐험 이동 시각과 진행이 일치하지 않습니다.');
}
function motionValidateCells(walkable,motion,player,map) {
    for(const cell of [motion.from,motion.to]) {
        if(!cell || !walkable(map,cell))throw Error('탐험 이동 경로가 지형 밖입니다.');
    }
    // Fast out-of-combat travel may take a diagonal step, but never skip a cell.
    if(Math.max(Math.abs(motion.from.gx-motion.to.gx),Math.abs(motion.from.gy-motion.to.gy))!==1)throw Error('탐험 보행은 인접 칸으로만 가능합니다.');
    const expected=motion.elapsed<motion.duration/2?motion.from:motion.to;
    if(!motionSameCell(player,expected))throw Error('탐험 보행 위치와 판정 칸이 일치하지 않습니다.');
}
