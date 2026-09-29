/** 콘텐츠별 맵 디자인 (docs/atlas-endgame-20260930.md 4절): 구역 팩토리(getZone)가 붙이는 탐험 맵 명세 — 스타일 · 바이옴 ·
 * 크기 · 시드 · 보스 단계만 정한다. 맵 모양은 js/exploration-layouts.js가, 런은 넓은 맵 탐험 엔진(js/act-exploration-*.js)이 맡는다.
 * 런은 시작할 때 명세를 저장하므로 뒤에 시드 재료가 바뀌어도 걷던 맵은 그대로다(새 런마다 새 맵).
 */
const contentMaps = (() => {
    /** Seed material: the loop, the content step (floor, tier …) and the enemy id counter — it moves every encounter, so
     * walking the same floor again opens a different path ("no corridor was ever the same"). */
    function runSeed(state, tag, step) { return `${tag}:${state.season || 1}:${step}:${state.nextEnemyId || 0}`; }
    const sizeBy = (value, bands) => 1 + bands.filter(limit => value >= limit).length;

    /** 고대 미궁: 층마다 새로 짜이는 미로. 10층부터 넓어지고 40층부터 가장 크다. */
    function labyrinth(floor, state = game) {
        return { style: 'maze', biome: 'maze', size: sizeBy(floor, [10, 40]), seed: runSeed(state, 'lab', floor), bossStages: 1 };
    }
    return Object.freeze({ labyrinth });
})();
safeExposeGlobals({ contentMaps });
