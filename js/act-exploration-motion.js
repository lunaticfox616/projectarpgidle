// Authoritative exploration walking. The scheduler advances this state; renderers only read it.
// Time is combat milliseconds, never performance.now() or an independent render tween.
const actExplorationMotion = (() => {
    function same(a,b) {return a.gx===b.gx && a.gy===b.gy;}
    // Only Veila's divided arena uses a continuous pose. Save and grid users still see the nearest cell.
    const free=new WeakMap();
    const preciseGoals=new WeakMap();
    const cellOf=p=>({gx:Math.round(p.gx),gy:Math.round(p.gy)});
    const durationFor=interval=>Math.max(120,Math.min(10000,Math.round(interval*1000/20)*20));
    const freeDepth=()=>game.settings?.battleView==='top'?1:STAGE_VIEW.depth;
    function start(run,player,next,interval,now) {
        if(run.motion)return false;
        const duration=durationFor(interval);
        run.motion={from:{gx:player.gx,gy:player.gy},to:{gx:next.gx,gy:next.gy},startedAt:now,elapsed:0,duration};
        if(next.gx!==player.gx)run.motionDirection=next.gx<player.gx?'west':'east';
        else run.motionDirection=next.gy<player.gy?'north':'south';
        return true;
    }
    function cancel(run) {if(run){run.motion=null;free.delete(run);}}
    /** Discard paused time while preserving the current fractional position. */
    function rebase(run,now) {
        if(now<=run.motionTimeMs)return;
        if(run.motion)run.motion.startedAt+=now-run.motionTimeMs;
        run.motionTimeMs=now;
    }
    /** canEnter is computed by the grid owner, including terrain, gate and reservations. */
    function advance(run,player,now,canEnter) {
        const motion=run.motion;if(!motion)return;
        const expected=motion.elapsed<motion.duration/2?motion.from:motion.to;
        if(!same(player,expected)){cancel(run);return;}
        const next=Math.min(motion.duration,Math.max(motion.elapsed,now-motion.startedAt));
        if(motion.elapsed<motion.duration/2 && next>=motion.duration/2) {
            if(!canEnter){cancel(run);return;}
            Object.assign(player,motion.to,{gridMoveTimer:0});
        }
        motion.elapsed=next;
        if(next===motion.duration)cancel(run);
    }
    /** One fractional world position is shared by camera and actor. */
    function position(run,player) {
        const pose=free.get(run)?.pose;
        if(pose && same(player,cellOf(pose)))return pose;
        const motion=run.motion;
        if(!motion)return {gx:player.gx,gy:player.gy};
        const progress=motion.elapsed/motion.duration;
        return {gx:motion.from.gx+(motion.to.gx-motion.from.gx)*progress,
            gy:motion.from.gy+(motion.to.gy-motion.from.gy)*progress};
    }
    function freeState(run,player) {
        if(!free.has(run))free.set(run,{pose:position(run,player),input:null,target:null,moved:false});
        run.motion=null;
        return free.get(run);
    }
    function setFreeInput(run,player,dx,dy) {
        if(!dx && !dy){const row=free.get(run);if(row)row.input=null;return;}
        const row=freeState(run,player);
        row.target=null;
        row.input={dx,dy};
    }
    function startFree(run,player,target,interval) {
        const row=freeState(run,player);
        if(row.input || row.target || same(row.pose,target))return false;
        row.target=target;
        row.duration=durationFor(interval);
        return true;
    }
    function freeDelta(row,interval) {
        if(row.input)return { dx:row.input.dx,dy:row.input.dy/freeDepth(),step:20/durationFor(interval) };
        if(!row.target)return null;
        return {dx:row.target.gx-row.pose.gx,dy:row.target.gy-row.pose.gy,step:20/row.duration};
    }
    function advanceFree(run,player,interval,canEnter) {
        const row=freeState(run,player);
        if(!same(player,cellOf(row.pose))){row.pose=cellOf(player);row.target=null;}
        const delta=freeDelta(row,interval), before=row.pose;
        row.moved=false;
        if(!delta)return;
        applyFreeDelta(row,delta,canEnter);
        row.moved=!same(before,row.pose);
        if(row.moved)updateFreePlayer(run,player,before,row.pose);
        if(row.target && (!row.moved || same(row.pose,row.target)))row.target=null;
    }
    function applyFreeDelta(row,delta,canEnter) {
        const length=Math.hypot(delta.dx,delta.dy*freeDepth()), scale=length ? Math.min(1,delta.step/length) : 0;
        const end=scale===1 && row.target ? row.target : {gx:row.pose.gx+delta.dx*scale,gy:row.pose.gy+delta.dy*scale};
        moveFreeAxis(row,'gx',end.gx,canEnter);
        moveFreeAxis(row,'gy',end.gy,canEnter);
    }
    function updateFreePlayer(run,player,before,pose) {
        const dx=pose.gx-before.gx,dy=pose.gy-before.gy;
        run.motionDirection=Math.abs(dx)+1e-6>=Math.abs(dy)*freeDepth()?(dx<0?'west':'east'):(dy<0?'north':'south');
        Object.assign(player,cellOf(pose),{gridMoveTimer:0});
    }
    function moveFreeAxis(row,axis,value,canEnter) {
        if(row.pose[axis]===value)return;
        const next={...row.pose,[axis]:value};
        const cell=cellOf(next), from=cellOf(row.pose);
        if(same(cell,from) || canEnter(cell)){row.pose=next;return;}
        // Go up to the edge and let the other axis slide alongside it.
        const edge=from[axis]+Math.sign(value-row.pose[axis])*.499;
        if(Math.abs(edge-from[axis])>Math.abs(row.pose[axis]-from[axis]))row.pose={...row.pose,[axis]:edge};
    }
    const freeMoving=run=>!!free.get(run)?.moved;
    const freeBusy=run=>!!(free.get(run)?.input || free.get(run)?.target);
    const stopFree=run=>free.delete(run);
    function aimFree(run,point) {
        preciseGoals.set(run,{point,command:run.destination});
        const row=free.get(run);
        if(row)row.target=null;
    }
    function preciseTarget(run,cell) {
        const goal=preciseGoals.get(run);
        return goal && goal.command===run.destination && same(goal.command,cell) ? goal.point : null;
    }
    function takeDirectAim(run) {
        const goal=preciseGoals.get(run);
        if(!goal || goal.command!==run.destination || goal.tried)return null;
        goal.tried=true;
        return goal.point;
    }
    function validate(run,player,map) {
        // Staged saves made before continuous walking restore stationary.
        if(run.motion===undefined){run.motion=null;run.motionTimeMs=0;run.motionDirection='south';}
        if(!Number.isFinite(run.motionTimeMs) || run.motionTimeMs<0)throw Error('탐험 이동 시각이 잘못되었습니다.');
        if(!['north','south','east','west'].includes(run.motionDirection))throw Error('탐험 이동 방향이 잘못되었습니다.');
        const motion=run.motion;if(motion===null)return;
        validateTiming(motion,run.motionTimeMs);
        validateCells(motion,player,map);
    }
    function validateTiming(motion,now) {
        if(!motion || ![motion.startedAt,motion.duration,motion.elapsed].every(Number.isFinite))throw Error('탐험 이동 수치가 잘못되었습니다.');
        if(motion.startedAt<0)throw Error('탐험 이동 시작 시각이 잘못되었습니다.');
        if(motion.duration<120 || motion.duration>10000)throw Error('탐험 이동 시간이 잘못되었습니다.');
        if(motion.elapsed<0 || motion.elapsed>=motion.duration)throw Error('탐험 이동 진행이 잘못되었습니다.');
        if(Math.abs(now-motion.startedAt-motion.elapsed)>0.001)throw Error('탐험 이동 시각과 진행이 일치하지 않습니다.');
    }
    function validateCells(motion,player,map) {
        for(const cell of [motion.from,motion.to]) {
            if(!cell || !actExplorationMap.walkable(map,cell))throw Error('탐험 이동 경로가 지형 밖입니다.');
        }
        // 전투 밖의 빠른 주인공은 대각선으로도 한 걸음에 간다(js/act-exploration-progress.js walkStep).
        if(Math.max(Math.abs(motion.from.gx-motion.to.gx),Math.abs(motion.from.gy-motion.to.gy))!==1)throw Error('탐험 보행은 인접 칸으로만 가능합니다.');
        const expected=motion.elapsed<motion.duration/2?motion.from:motion.to;
        if(!same(player,expected))throw Error('탐험 보행 위치와 판정 칸이 일치하지 않습니다.');
    }
    return {start,advance,cancel,rebase,position,validate,setFreeInput,startFree,advanceFree,freeMoving,freeBusy,stopFree,aimFree,preciseTarget,takeDirectAim};
})();
safeExposeGlobals({actExplorationMotion});
