/** 옆에서 보는 무대에서 몬스터가 칸에서 칸으로 걸어가는 모습 (docs/stage-view-20261011.md, 2026-10-12 사용자: 실제 게임에서 걷는
 * 모습을 보고 싶다). 위에서 보는 전장은 한 걸음을 뗀 그림이 새 칸으로 휙 다가가 멈춘다(0.15초에 거의 다 간다). 걷는 그림을 붙이면
 * 미끄러졌다 서기를 되풀이하는 꼴이라, 무대에서는 한 걸음에 걸리는 시간(js/combat-grid.js getGridUnitStepSec: 보스는 더 짧다) 동안
 * 같은 빠르기로 간다: 쫓아오는 몬스터는 쉬지 않고 걷는다. 걸어온 거리(도트)도 세어 두어, 걷는 그림과 걷는 척하는 움직임이 그 거리에 맞춰 돈다
 * (발이 미끄러지지 않는다). 전투 상태는 읽기만 한다(unit.gridStepFrom, gridStepAt, gx, gy).
 */
const stageStride = (() => {
    const states = new WeakMap();
    const stepMs = unit => getGridUnitStepSec(unit) * 1000;
    /** 한 칸의 크기(도트): 가로 heroTile, 깊이는 그 depth배. */
    const cellDots = () => [STAGE_VIEW.heroTile, STAGE_VIEW.heroTile * STAGE_VIEW.depth];
    const share = (state, now) => Math.min(1, Math.max(0, (now - state.seen) / state.stepMs));

    /** A new step starts where the drawn unit is now (still short of the cell it left if the last step had not finished).
     * It began when the combat clock says it did, so a unit first seen long after its last step is already standing. */
    function begin(unit, state, now) {
        const left = state ? 1 - share(state, now) : 0, from = unit.gridStepFrom, [wide, deep] = cellDots();
        const dx = (state ? state.dx * left : 0) + from.gx - unit.gx, dy = (state ? state.dy * left : 0) + from.gy - unit.gy;
        const walked = state ? state.walked + state.dots * (1 - left) : 0;
        const step = stepMs(unit), since = Math.min(step, Math.max(0, getCombatTime() - unit.gridStepAt));
        return { at: unit.gridStepAt, seen: now - since, stepMs: step, dx, dy, walked, dots: Math.hypot(dx * wide, dy * deep) };
    }
    /** How far the drawn unit still is from its cell (cells), whether it is walking, and the dots it has walked so far.
     * null → not on the stage, or the unit has not stepped yet. now = the frame's time (ms). */
    function read(unit, now) {
        if (!stageView.enabled() || !unit || !unit.gridStepFrom || !Number.isFinite(Number(unit.gridStepAt))) return null;
        let state = states.get(unit);
        if (!state || state.at !== unit.gridStepAt) {
            state = begin(unit, state, now);
            states.set(unit, state);
        }
        const done = share(state, now), left = 1 - done;
        return { dx: state.dx * left, dy: state.dy * left, moving: done < 1, walked: state.walked + state.dots * done };
    }
    /** The dots a unit has walked, as last read this frame (0 for a unit that never stepped). */
    function walked(unit, now) {
        const state = states.get(unit);
        return state ? state.walked + state.dots * share(state, now) : 0;
    }
    /** How much of a step is still to go after `elapsedMs` (1 → 0), for the rules that ask where a unit is drawn
     * (js/combat-grid.js getGridUnitDrawnDelta). */
    const lag = (elapsedMs, unit) => Math.max(0, 1 - Math.max(0, elapsedMs) / stepMs(unit));

    return Object.freeze({ read, walked, lag });
})();
safeExposeGlobals({ stageStride });
