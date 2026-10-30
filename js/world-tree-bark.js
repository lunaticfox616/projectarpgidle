// 세계수 껍질의 껍질 포인트(2026-10-31 사용자와 문답으로 정함: docs/late-game-review-20261008.md "세계수 껍질 내실화"). 루프와 조건으로 받은 점수를 피해,
// 받는 피해, 이동 속도, 구간 넓이에 직접 나눈다. 효과는 껍질 구간에서 이번 루프에 아직 깨지 않은 지역에서만 켜진다(js/combat-build-stats.js getWorldTreeBarkEffect).
// 점수 계산과 저장 모양은 js/state.js(getWorldTreeBarkEarned, normalizeWorldTreeBark).
const worldTreeBark = (() => {
    const statDef = key => WORLD_TREE_BARK.stats.find(def => def.key === key);
    const barkSpent = owner => WORLD_TREE_BARK.stats.reduce((sum, def) => sum + Math.max(0, Math.floor(Number((owner.worldTreeBark || {})[def.key]) || 0)), 0);
    /** @returns {{earned:number,spent:number,free:number}} 껍질 포인트. */
    function barkPoints(owner) {
        const earned = getWorldTreeBarkEarned(owner), spent = barkSpent(owner);
        return { earned, spent, free: Math.max(0, earned - spent) };
    }
    const barkHasFreePoints = owner => barkPoints(owner).free > 0;
    /** Why the points cannot be moved now, '' when they can. */
    const barkAllocationRefusal = owner => (owner.woodsmanBuildLock ? '☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.' : '');
    /** Moves up to delta points into (or, below 0, out of) one stat within its cap and the free points. Returns the points moved. */
    function allocateBarkPoints(owner, key, delta) {
        const def = statDef(key);
        if (!def || barkAllocationRefusal(owner)) return 0;
        const now = Math.max(0, Math.floor(Number(owner.worldTreeBark[key]) || 0));
        const room = def.max === null ? Infinity : def.max - now;
        const moved = delta > 0 ? Math.min(delta, room, barkPoints(owner).free) : Math.max(delta, -now);
        owner.worldTreeBark[key] = now + moved;
        return moved;
    }
    /** All points back, at no cost. */
    function resetBarkPoints(owner) {
        if (barkAllocationRefusal(owner)) return false;
        WORLD_TREE_BARK.stats.forEach(def => { owner.worldTreeBark[def.key] = 0; });
        return true;
    }
    /** Called as act 10 is cleared, before the record of this clear: the loop's first clear in play (not in an away settlement, whose time is
     * not the time played: js/records.js tickRecordActiveTime) reaches the time goals it beat. */
    function noteActTenClear(zone) {
        if (zone.id !== WORLD_TREE_BARK.points.actTenZoneId || game.isBackgroundCalculation) return;
        const loop = ensureRecordsState(game).currentLoop, bark = game.worldTreeBark;
        if (loop.actClears[zone.id] !== undefined) return;
        const minutes = (Number(loop.activeMs) || 0) / 60000, have = Array.isArray(bark.timeGoals) ? bark.timeGoals : [];
        const fresh = WORLD_TREE_BARK.points.actTenMinutes.filter(goal => minutes <= goal && !have.includes(goal));
        if (!fresh.length) return;
        bark.timeGoals = [...have, ...fresh];
        dispatchRuntimeEvent('bark-points', { gain: fresh.length * WORLD_TREE_BARK.points.actTenGoal, why: `액트 10을 ${Math.min(...fresh)}분 안에 돌파` });
    }
    /** A pinnacle's first kill: 우로보로스 and 껍질 포인트 (the points count from the journal: js/state.js getWorldTreeBarkEarned). */
    function rewardPinnacleFirstKill(entryId) {
        if (!PINNACLE_FIRST_KILL_JOURNALS.includes(entryId)) return;
        commitCurrencyGain('ouroboros', 1);
        dispatchRuntimeEvent('bark-points', { gain: WORLD_TREE_BARK.points.pinnacle, why: '정점 보스 첫 처치' });
    }
    /** The loop screen's line for the loop the hero goes to, '' before the points start. */
    function nextLoopBarkLine(nextLoop) {
        const rule = WORLD_TREE_BARK.points;
        if (nextLoop < rule.startLoop) return '';
        return `껍질 포인트 +${nextLoop === rule.startLoop ? rule.start : rule.perLoop}`;
    }
    /** After the loop's reset: the first bark's notice. */
    function noticeFirstBark() {
        if (game.season === WORLD_TREE_BARK.points.startLoop) queueTutorialNotice('world_tree_bark', '세계수 껍질', '첫 껍질이 자랐습니다.\n껍질 포인트를 나누면 지나온 앞 구간을 빠르게 지나갑니다.\n루프 패시브 창에서 나누세요.', 'tab-season');
    }
    return Object.freeze({ barkPoints, barkHasFreePoints, barkAllocationRefusal, allocateBarkPoints, resetBarkPoints, noteActTenClear, rewardPinnacleFirstKill, nextLoopBarkLine, noticeFirstBark });
})();

safeExposeGlobals({ worldTreeBark });
