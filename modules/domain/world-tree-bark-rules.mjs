

export function barkProgressStatDef(env, key) { return env.deps.WORLD_TREE_BARK.stats.find(def => def.key === key); }

export function barkProgressBarkSpent(env, owner) { return env.deps.WORLD_TREE_BARK.stats.reduce((sum, def) => sum + Math.max(0, Math.floor(Number((owner.worldTreeBark || {})[def.key]) || 0)), 0); }

/** @returns {{earned:number,spent:number,free:number}} 껍질 포인트. */
export function barkProgressBarkPoints(env, owner) {
    const earned = env.deps.getWorldTreeBarkEarned(owner), spent = barkProgressBarkSpent(env, owner);
    return { earned, spent, free: Math.max(0, earned - spent) };
}

export function barkProgressBarkHasFreePoints(env, owner) { return barkProgressBarkPoints(env, owner).free > 0; }

/** Why the points cannot be moved now, '' when they can. */
export function barkProgressBarkAllocationRefusal(owner) { return owner.woodsmanBuildLock ? '☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.' : ''; }

/** Moves up to delta points into (or, below 0, out of) one stat within its cap and the free points. Returns the points moved. */
export function barkProgressAllocateBarkPoints(env, owner, key, delta) {
    const def = barkProgressStatDef(env, key);
    if (!def || barkProgressBarkAllocationRefusal(owner)) return 0;
    const now = Math.max(0, Math.floor(Number(owner.worldTreeBark[key]) || 0));
    const room = def.max === null ? Infinity : def.max - now;
    const moved = delta > 0 ? Math.min(delta, room, barkProgressBarkPoints(env, owner).free) : Math.max(delta, -now);
    owner.worldTreeBark[key] = now + moved;
    return moved;
}

/** All points back, at no cost. */
export function barkProgressResetBarkPoints(env, owner) {
    if (barkProgressBarkAllocationRefusal(owner)) return false;
    env.deps.WORLD_TREE_BARK.stats.forEach(def => { owner.worldTreeBark[def.key] = 0; });
    return true;
}

/** Called as act 10 is cleared, before the record of this clear: the loop's first clear in play (not in an away settlement, whose time is
 * not the time played: js/records.js tickRecordActiveTime) reaches the time goals it beat. */
export function* barkProgressNoteActTenClear(env, owner, zone) {
    if (zone.id !== env.deps.WORLD_TREE_BARK.points.actTenZoneId || owner.isBackgroundCalculation) return;
    const loop = env.deps.ensureRecordsState(owner).currentLoop, bark = owner.worldTreeBark;
    if (loop.actClears[zone.id] !== undefined) return;
    const minutes = (Number(loop.activeMs) || 0) / 60000, have = Array.isArray(bark.timeGoals) ? bark.timeGoals : [];
    const fresh = env.deps.WORLD_TREE_BARK.points.actTenMinutes.filter(goal => minutes <= goal && !have.includes(goal));
    if (!fresh.length) return;
    bark.timeGoals = [...have, ...fresh];
    yield { kind: 'barkNotify', args: ['bark-points', { gain: fresh.length * env.deps.WORLD_TREE_BARK.points.actTenGoal, why: env.deps._t('액트 10을 {min}분 안에 돌파', { min: Math.min(...fresh) }) }] };
}

/** A pinnacle's first kill: 우로보로스 and 껍질 포인트 (the points count from the journal: js/state.js getWorldTreeBarkEarned). */
export function* barkProgressRewardPinnacleFirstKill(env, entryId) {
    if (!env.deps.PINNACLE_FIRST_KILL_JOURNALS.includes(entryId)) return;
    yield { kind: 'barkGrantCurrency', args: ['ouroboros', 1] };
    yield { kind: 'barkNotify', args: ['bark-points', { gain: env.deps.WORLD_TREE_BARK.points.pinnacle, why: '정점 보스 첫 처치' }] };
}

/** The loop screen's line for the loop the hero goes to, '' before the points start. */
export function barkProgressNextLoopBarkLine(env, nextLoop) {
    const rule = env.deps.WORLD_TREE_BARK.points;
    if (nextLoop < rule.startLoop) return '';
    return env.deps._t('껍질 포인트 +{value}', { value: nextLoop === rule.startLoop ? rule.start : rule.perLoop });
}

/** After the loop's reset: the first bark's notice. */
export function* barkProgressNoticeFirstBark(env, owner) {
    if (owner.season === env.deps.WORLD_TREE_BARK.points.startLoop) yield { kind: 'barkTutorial', args: ['world_tree_bark', env.deps._t('세계수 껍질'), env.deps._t('첫 껍질이 자랐습니다.\n껍질 포인트를 나누면 지나온 앞 구간을 빠르게 지나갑니다.\n루프 패시브 창에서 나누세요.'), 'tab-season'] };
}
