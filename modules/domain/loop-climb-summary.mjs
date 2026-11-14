/** Older saves lack these; the panel always wrote the defaults before drawing. */
export function ensureClimbState(runtime) {
    runtime.deps.game.abyssUnlockedDepths = Array.isArray(runtime.deps.game.abyssUnlockedDepths) ? runtime.deps.game.abyssUnlockedDepths : [20];
    runtime.deps.game.loopProgressBase = runtime.deps.game.loopProgressBase || { abyssEndlessDepth: 20, labyrinthUnlockedMaxFloor: 1, specialBosses: [] };
    runtime.deps.game.loopProgressCurrent = runtime.deps.game.loopProgressCurrent || { specialBosses: [], chaos20Cleared: false };
}

/** Deep chaos floors cleared beyond this loop's start (the highest unlocked floor is the one after the last clear). */
export function depthGain(runtime) {
    const unlocked = runtime.deps.game.abyssUnlockedDepths.map(value => Math.floor(value || 0)).filter(value => value >= 21);
    const highest = unlocked.length ? Math.max(...unlocked) : Math.floor(runtime.deps.game.abyssEndlessDepth || 20);
    const cleared = Math.max(20, highest >= 21 ? highest - 1 : highest);
    return Math.max(0, Math.floor(cleared - (runtime.deps.game.loopProgressBase.abyssEndlessDepth || 20)));
}

/** What the next loop banks: deep chaos floors, labyrinth floors, special bosses and woodsman points beyond this loop's start. */
export function gains(runtime) {
    const base = runtime.deps.game.loopProgressBase, current = runtime.deps.game.loopProgressCurrent;
    const woodsman = Math.max(0, Math.floor(runtime.deps.game.woodsmanPendingScore || 0)) - Math.max(0, Math.floor(runtime.deps.game.woodsmanSettledScore || 0));
    return [['혼돈 심화', depthGain(runtime), '층'],
        ['고대 미궁', Math.max(0, Math.floor((runtime.deps.game.labyrinthUnlockedMaxFloor || runtime.deps.game.labyrinthFloor || 1) - (base.labyrinthUnlockedMaxFloor || 1))), '층'],
        ['특수 보스', (current.specialBosses || []).filter(id => !(base.specialBosses || []).includes(id)).length, '종'],
        ['나무꾼', Math.floor(Math.sqrt(Math.max(0, woodsman)) / 25), '']];
}
