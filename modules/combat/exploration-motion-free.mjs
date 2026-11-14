import { motionSameCell, motionCellOf, motionDuration, motionPosition } from './exploration-motion-cells.mjs';
function motionFreeState(env,run,player) {
    if(!env.free.has(run))env.free.set(run,{pose:motionPosition(env,run,player),input:null,target:null,moved:false});
    run.motion=null;
    return env.free.get(run);
}
export function motionSetFreeInput(env,run,player,dx,dy) {
    if(!dx && !dy){const row=env.free.get(run);if(row)row.input=null;return;}
    const row=motionFreeState(env,run,player);
    row.target=null;
    row.input={dx,dy};
}
export function motionStartFree(env,run,player,target,interval) {
    const row=motionFreeState(env,run,player);
    if(row.input || row.target || motionSameCell(row.pose,target))return false;
    row.target=target;
    row.duration=motionDuration(interval);
    return true;
}
function motionFreeDelta(env,row,interval) {
    if(row.input)return {dx:row.input.dx,dy:row.input.dy/env.depth(),step:20/motionDuration(interval)};
    if(!row.target)return null;
    return {dx:row.target.gx-row.pose.gx,dy:row.target.gy-row.pose.gy,step:20/row.duration};
}
export function motionAdvanceFree(env,run,player,interval,canEnter) {
    const row=motionFreeState(env,run,player);
    if(!motionSameCell(player,motionCellOf(row.pose))){row.pose=motionCellOf(player);row.target=null;}
    const delta=motionFreeDelta(env,row,interval),before=row.pose;
    row.moved=false;
    if(!delta)return;
    motionApplyFreeDelta(env,row,delta,canEnter);
    row.moved=!motionSameCell(before,row.pose);
    if(row.moved)motionUpdateFreePlayer(env,run,player,before,row.pose);
    if(row.target && (!row.moved || motionSameCell(row.pose,row.target)))row.target=null;
}
function motionApplyFreeDelta(env,row,delta,canEnter) {
    const length=Math.hypot(delta.dx,delta.dy*env.depth()),scale=length?Math.min(1,delta.step/length):0;
    const end=scale===1 && row.target?row.target:{gx:row.pose.gx+delta.dx*scale,gy:row.pose.gy+delta.dy*scale};
    motionMoveFreeAxis(row,'gx',end.gx,canEnter);
    motionMoveFreeAxis(row,'gy',end.gy,canEnter);
}
function motionUpdateFreePlayer(env,run,player,before,pose) {
    const dx=pose.gx-before.gx,dy=pose.gy-before.gy;
    run.motionDirection=Math.abs(dx)+1e-6>=Math.abs(dy)*env.depth()?(dx<0?'west':'east'):(dy<0?'north':'south');
    Object.assign(player,motionCellOf(pose),{gridMoveTimer:0});
}
function motionMoveFreeAxis(row,axis,value,canEnter) {
    if(row.pose[axis]===value)return;
    const next={...row.pose,[axis]:value};
    const cell=motionCellOf(next),from=motionCellOf(row.pose);
    if(motionSameCell(cell,from) || canEnter(cell)){row.pose=next;return;}
    const edge=from[axis]+Math.sign(value-row.pose[axis])*.499;
    if(Math.abs(edge-from[axis])>Math.abs(row.pose[axis]-from[axis]))row.pose={...row.pose,[axis]:edge};
}
export function motionAimFree(env,run,point) {
    env.preciseGoals.set(run,{point,command:run.destination});
    const row=env.free.get(run);
    if(row)row.target=null;
}
export function motionPreciseTarget(env,run,cell) {
    const goal=env.preciseGoals.get(run);
    return goal && goal.command===run.destination && motionSameCell(goal.command,cell)?goal.point:null;
}
export function motionTakeDirectAim(env,run) {
    const goal=env.preciseGoals.get(run);
    if(!goal || goal.command!==run.destination || goal.tried)return null;
    goal.tried=true;
    return goal.point;
}
