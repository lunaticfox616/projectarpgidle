// 방치 정산 창의 작은 사냥 장면(modules/ui/away-hunt-scene.mjs, 2026-11-26 사용자: "방치 계산 창도 내 캐릭터가 약간 스킬 쓰면서
// 사냥하는 간략한 느낌 귀엽게"). 그림 도트 하나가 캔버스 화소 하나다(정수 배율 1, 캔버스 화소는 uiDisplay.battleRenderScale).
// 시간은 ms, 거리는 도트, 빠르기는 도트/초다.
//   height        캔버스 높이. 주인공 칸(110~128도트)이 발 줄 위에 선다. 장면은 창의 구분선 위에 서고 하늘은 비워 둔다.
//   feetFromBottom 캔버스 아래 끝에서 발 줄까지(그 밑 세 줄은 발 그림자).
//   heroAt, heroMinX 주인공 발의 가로 자리(캔버스 너비의 비율, 가장 왼쪽).
//   reachGap      주인공 발에서 몬스터 앞끝까지: 근접 무기와, 활과 오브와 플라스크(ranged의 자세).
//   counterMs     몬스터가 친 뒤 주인공이 휘두르기 시작할 때까지(공격 그림이 없는 몬스터면 leadMs 뒤에 휘두른다).
//   flashMs, fadeMs 맞은 몬스터가 희게 번쩍이는 시간, 마지막 타격 뒤 사라지는 시간(일반 몬스터는 쓰러짐 그림이 없다).
//   floatSpots    피해 숫자가 뜨는 자리 [가로, 위로](도트): 한 휘두름의 타격마다 번갈아 써서 숫자끼리 겹치지 않는다.
//   effects       낀 룬의 속성 → 세계수 스킬 그림(data/skill-fx-atlas.js의 id)과 쓰는 장들: 맞은 몬스터 몸 위에 장마다 effectMs씩 터진다.
//   fallbackMonsters 이 지역 무리에서 장면에 맞는 크기(maxMonsterHeight, maxMonsterReach)가 없을 때 나오는 몬스터.
//   props         지역 재질의 낮은 소품(data/stage-regions.js families): propEvery 도트만큼 바닥이 흐를 때마다 하나가 뒤로 지나간다.
//   fallback      지역 그림 표에 없는 곳의 하늘과 땅 색(액트 1은 재질 소품이 없고 색은 data/stage-view.js STAGE_SCENES.biomes.root에서).
const AWAY_HUNT = Object.freeze({
    height: 120,
    feetFromBottom: 4,
    heroAt: 0.3,
    heroMinX: 34,
    edgeFade: 16,
    scrollSpeed: 70,
    monsterSpeed: 30,
    reachGap: Object.freeze({ melee: 30, ranged: 72 }),
    ranged: Object.freeze(['bow', 'orb', 'flask']),
    maxStrikeWidth: 220,
    spawnDelayMs: 250,
    firstSpawnMs: 300,
    counterMs: 140,
    leadMs: 120,
    flashMs: 70,
    fadeMs: 420,
    restMs: 220,
    cheerRestMs: 260,
    effectMs: 60,
    effectSize: 64,
    floatMs: 720,
    floatLift: 14,
    floatSpots: Object.freeze([Object.freeze([-18, 0]), Object.freeze([18, 6]), Object.freeze([0, 18])]),
    fontPx: 12,
    frameMs: 33,
    loadWaitMs: 6000,
    flash: '#fff4df',
    numberInk: '#140d0f',
    hitSpread: Object.freeze([1, 1.12, 0.9, 1.05]),
    effects: Object.freeze({
        phys: Object.freeze({ id: 4, frames: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8]) }),
        fire: Object.freeze({ id: 26, frames: Object.freeze([2, 3, 4, 5, 6, 7, 8]) }),
        cold: Object.freeze({ id: 10, frames: Object.freeze([0, 1, 2, 3, 4, 5]) }),
        light: Object.freeze({ id: 6, frames: Object.freeze([8, 2, 3, 4, 5]) }),
        chaos: Object.freeze({ id: 27, frames: Object.freeze([0, 1, 2, 3, 4, 5]) })
    }),
    maxMonsterHeight: 100,
    maxMonsterReach: 150,
    monstersKept: 3,
    fallbackMonsters: Object.freeze(['act1-slime', 'act1-ant', 'act1-worm']),
    props: Object.freeze(['prop-0', 'prop-1']),
    propEvery: Object.freeze([150, 260]),
    fallback: Object.freeze({ sky: '#4a3f3a', earth: '#3a302b' }),
    floorRows: 12,
    floorTile: 96
});
export { AWAY_HUNT };
