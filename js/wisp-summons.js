/** 위습 정령 소환 공격 규칙 (스킬 변경분 2, 2026-09-30 · 표 data/wisp-summons.js). 그림은 js/canvas-wisp-summon-fx.js.
 * - 던지는 공격(화염·냉기·물리·카오스)은 날아가는 시간이 지난 뒤에 피해가 들어간다. 비행 시간은 그림과 같은 식
 *   (WispAttack.timing): base + perDot × 거리(도트) — 위습 칸 가운데에서 대상 칸 가운데 1도트 위까지.
 * - 번개·분광은 광선이라 바로 맞는다. 분광은 공격마다 화염·냉기·번개 중 하나로 친다(한 번의 공격 안에서는 같은 원소).
 * - 날아가는 공격은 전투 캡처(captureCombatRuntime)에 같이 담긴다. 도착할 때 위습이 쓰러졌거나 대상이 없으면 사라진다.
 */
const wispSummons = (() => {
    const DOTS_PER_CELL = 16;
    let inFlight = [];

    const specOf = name => WISP_SUMMONS[name] || null;
    /** Ms from the strike frame until the attack lands (0 = at once, also without both cells). from / to: { gx, gy }. */
    function flightMs(name, from, to) {
        const flight = specOf(name)?.flight, dx = to && from ? to.gx - from.gx : NaN, dy = to && from ? to.gy - from.gy : NaN;
        if (!flight || !Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
        return flight.base + flight.perDot * Math.hypot(dx * DOTS_PER_CELL, dy * DOTS_PER_CELL - 1);
    }
    /** How long the attack stays on screen from the strike frame (flight + the element's tail). */
    function artMs(name, flight) {
        return flight + (specOf(name)?.tailMs || 0);
    }
    /** Elements this wisp picks from per attack, or null when it always hits with its own. */
    function elements(name) {
        return specOf(name)?.elements || null;
    }
    function rollElement(name) {
        const pool = elements(name);
        return pool ? pool[Math.floor(Math.random() * pool.length)] : null;
    }
    /**
     * One attack on targets (first = the aimed one): beams come back to hit now; thrown attacks wait in flight.
     * @returns {{ flight:number, now:Array<{ target:object, first:boolean, element:?string }> }}
     */
    function launch(summon, targets, at) {
        const flight = flightMs(summon.gemName, summon, targets[0]), element = rollElement(summon.gemName);
        if (flight <= 0) return { flight, now: targets.map((target, index) => ({ target, first: index === 0, element })) };
        inFlight.push(...targets.map((target, index) => ({ summonId: summon.id, enemyId: target.id, first: index === 0, element, landAt: at + flight })));
        return { flight, now: [] };
    }
    /** Hits whose flight has ended by `at` (removed from the flight list). */
    function due(at) {
        if (!inFlight.length) return [];
        const landed = inFlight.filter(hit => hit.landAt <= at);
        if (landed.length) inFlight = inFlight.filter(hit => hit.landAt > at);
        return landed;
    }
    function reset() { inFlight = []; }
    function isHit(hit) {
        return hit && Number.isFinite(hit.summonId) && Number.isFinite(hit.enemyId) && Number.isFinite(hit.landAt);
    }
    function capture() { return inFlight.map(hit => ({ ...hit })); }
    function restore(saved) {
        inFlight = Array.isArray(saved) ? saved.filter(isHit).map(hit => ({ ...hit, first: hit.first === true, element: hit.element || null })) : [];
    }
    return Object.freeze({ flightMs, artMs, elements, launch, due, reset, capture, restore });
})();
safeExposeGlobals({ wispSummons });
