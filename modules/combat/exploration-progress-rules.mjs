
const AUTO_RESUME_GRACE_MS=1500;
const AUTO_START_GRACE_MS=1000;
export const COMMAND_GIVE_UP_STEPS=15;

// A locked target must not keep renewing the WASD release grace.
function progressClockOf(env, run) {return run.motionTimeMs||env.deps.getCombatTime();}

function progressHoldAuto(env, run,ms) {env.memo.autoHolds.set(run,Math.max(env.memo.autoHolds.get(run)||0,progressClockOf(env, run)+ms));}

function progressAutoHeld(env, run) {return !env.owner.isBackgroundCalculation && (env.memo.autoHolds.get(run)||0)>progressClockOf(env, run);}

/** While a manual order (click, WASD, lock-on) is under way the grace keeps moving on, so AUTO_RESUME_GRACE_MS counts from the
 * moment it ends; with no order, auto-move waits out the grace. @returns {boolean} true while auto-move waits. */
export function progressWaitsForAutoGrace(env, run) {
    if(run.destination || env.deps.actExplorationState.lockedEnemy(run)){progressHoldAuto(env, run,AUTO_RESUME_GRACE_MS);return false;}
    return progressRunMode(env, run)!=='manual' && progressAutoHeld(env, run);
}

/** Auto-move was just turned on (js/act-exploration-ui.js toggleAuto, mode): it starts walking after the grace. */
export function progressHoldAutoStart(env, run) {if(run)progressHoldAuto(env, run,AUTO_START_GRACE_MS);}

export function progressHoldAutoManual(env, run) {
    progressHoldAuto(env, run,AUTO_RESUME_GRACE_MS);
    env.memo.manualSteerHolds.set(run,progressClockOf(env, run)+AUTO_RESUME_GRACE_MS);
}

export function progressClearManualSteerHold(env, run) {return env.memo.manualSteerHolds.delete(run);}

/** The mode a new run starts in: the chosen route (보스 직행 · 전체 탐색) while auto-move is on, else 직접 이동. */
export function progressStartMode(settings) {
    return settings.autoMove===false?'manual':settings.actExplorationMode;
}

/** Auto-move off (mode manual) is a choice made in front of the screen: offline replay always walks, with the saved
 * route preference (직행 · 전체). The run keeps 'manual', so the hero stands again once the player is back. */
export function progressRunMode(env, run,state=env.owner) {
    if(run.mode!=='manual' || !state.isBackgroundCalculation)return run.mode;
    return state.settings.actExplorationMode==='full' ? 'full' : 'direct';
}

/** The hero neither chases nor sidesteps: a hazard asked for it, auto-move is off, or a move command is under way
 * (the command walks in step; the combat engagement only fights what is in reach). */
/** 영웅이 제자리에서 사거리 안만 치는가: 위험을 피하라는 요청, 걷는 명령, 직접 이동. 직접 이동이라도 락온한 몬스터
 * (js/act-exploration-state.js lockOn)가 살아 있으면 그 명령으로 보고 다가가 싸운다. */
export function progressHoldPosition(env, requested) {
    const run=env.deps.actExplorationState.current(env.owner);
    if(!run)return !!requested;
    const locked=!!env.deps.actExplorationState.lockedEnemy(run);
    // 자동 이동의 유예 동안도 제자리(락온한 몬스터는 명령이라 다가간다)
    return requested || (progressRunMode(env, run)==='manual' && !locked) || !!run.destination || progressHoldsManualSteer(env, run,locked);
}

function progressHoldsManualSteer(env, run,locked) {return locked ? (env.memo.manualSteerHolds.get(run)||0)>progressClockOf(env, run) : progressAutoHeld(env, run);}
