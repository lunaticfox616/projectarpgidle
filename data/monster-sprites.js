// 액트 몬스터 도트 시트(받은 묶음, 2026-10-02): 외형마다 대기 · 공격 시트 한 장씩, 열 = 시간순, 도트 = 바닥 칸/16.
// 묶음마다 칸 크기 · 행 순서 · 동작 시간이 다르다(이름과 공격 방식은 data/bosses.js ACT_MONSTER_VISUALS).
//   뿌리층 슬라임 · 웜 · 개미(rignin-monsters-idle-attack-v1): 칸 48, 행 위 · 아래 · 왼쪽 · 오른쪽, 몸 가운데가 칸 가운데.
//   철퇴 부제사 · 성수 부제녀(rignin-deacons-idle-attack-v2): 칸 79, 행 아래 · 왼쪽 · 오른쪽 · 위, 발밑 (39, 39).
// feet = 칸 안에서 발 자리(도트 가장자리 좌표) — 전장의 발 자리(칸 가운데보다 0.22칸 아래)에 맞춘다. 벌레는 위에서 본
// 그림이라 몸 가운데(24, 24)를 칸 가운데에 두도록 4도트 아래를 발로 잡는다. height = 발에서 그림 맨 위까지(대기 0번,
// 네 방향 중 가장 높은 곳) — 체력바를 그 위에 둔다. scripts/smoke-monster-sprites.js가 PNG와 맞춰 본다.
const MONSTER_SPRITE_KINDS = Object.freeze({
    bug: Object.freeze({
        frame: 48, rows: Object.freeze(['up', 'down', 'left', 'right']), feet: Object.freeze([24, 28]), shadow: 0.3,
        idleMs: Object.freeze([220, 180, 220, 180]), attackMs: Object.freeze([100, 90, 80, 70, 110, 150]), impactFrame: 3
    }),
    deaconMelee: Object.freeze({
        frame: 79, rows: Object.freeze(['down', 'left', 'right', 'up']), feet: Object.freeze([39.5, 40]), shadow: 0.24,
        idleMs: Object.freeze([100, 100, 100, 100]), attackMs: Object.freeze([150, 70, 150, 80, 90, 120]), impactFrame: 2
    }),
    deaconRanged: Object.freeze({
        frame: 79, rows: Object.freeze(['down', 'left', 'right', 'up']), feet: Object.freeze([39.5, 40]), shadow: 0.24,
        idleMs: Object.freeze([100, 100, 100, 100]), attackMs: Object.freeze([110, 100, 200, 60, 90, 130]), impactFrame: 3
    })
});

const MONSTER_SPRITE_SHEETS = Object.freeze(Object.fromEntries([
    ['act1-slime', 'bug', 'bugs/act1-slime', 12], ['act1-worm', 'bug', 'bugs/act1-worm', 13], ['act1-ant', 'bug', 'bugs/act1-ant', 17],
    ['act3-slime', 'bug', 'bugs/act3-slime', 15], ['act3-worm', 'bug', 'bugs/act3-worm', 14], ['act3-ant', 'bug', 'bugs/act3-ant', 18],
    ['act4-slime', 'bug', 'bugs/act4-slime', 15], ['act4-worm', 'bug', 'bugs/act4-worm', 14], ['act4-ant', 'bug', 'bugs/act4-ant', 21],
    ['act5-slime', 'bug', 'bugs/act5-slime', 19], ['act5-worm', 'bug', 'bugs/act5-worm', 16], ['act5-ant', 'bug', 'bugs/act5-ant', 22],
    ...[2, 6, 7, 8].flatMap(act => [
        [`deacon-act${act}-melee`, 'deaconMelee', `deacons/act${act}-melee`, 24],
        [`deacon-act${act}-ranged`, 'deaconRanged', `deacons/act${act}-ranged`, 24]
    ])
].map(([id, kind, stem, height]) => [id, Object.freeze({
    id, kind, height, idle: `assets/enemies/${stem}-idle.png`, attack: `assets/enemies/${stem}-attack.png`
})])));

safeExposeData({ MONSTER_SPRITE_KINDS, MONSTER_SPRITE_SHEETS });
