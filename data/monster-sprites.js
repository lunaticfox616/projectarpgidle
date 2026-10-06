// 액트 몬스터 도트 시트(받은 묶음, 2026-10-02): 외형마다 대기 · 공격 시트 한 장씩, 열 = 시간순, 도트 = 바닥 칸/16.
// 묶음마다 칸 크기 · 행 순서 · 동작 시간이 다르다(이름과 공격 방식은 data/bosses.js ACT_MONSTER_VISUALS).
//   뿌리층 슬라임 · 웜 · 개미(rignin-monsters-idle-attack-v1): 칸 48, 행 위 · 아래 · 왼쪽 · 오른쪽, 몸 가운데가 칸 가운데.
//   철퇴 부제사 · 성수 부제녀(rignin-deacons-idle-attack-v2): 칸 79, 행 아래 · 왼쪽 · 오른쪽 · 위, 발밑 (39, 39).
//   무기 뿌리촉수(rignin-weapon-root-tentacles-idle-attack-v1): 칸 64, 행 위 · 아래 · 왼쪽 · 오른쪽. 뿌리 밑동 자리가 그림마다,
//   방향마다 달라 시트가 방향별 발 자리(feet, 받은 묶음의 rootAnchor)를 가진다. 없으면 종류의 feet를 쓴다.
//   영역 몬스터(2026-10-02, 그리기 도구로 다시 그림): 칸 48(보스 64), 행 위 · 아래 · 왼쪽 · 오른쪽, 발 자리는 그림마다 하나.
//   벌집(2026-10-06, 같은 도구): 전투벌 · 수벌 · 정찰벌 · 꿀주머니 벌 · 수호벌 · 근위벌 · 여왕. 떠서 나는 벌이라 발 자리는 그림자 자리다.
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
    }),
    root: Object.freeze({
        frame: 64, rows: Object.freeze(['up', 'down', 'left', 'right']), feet: Object.freeze([32, 49]), shadow: 0.3,
        idleMs: Object.freeze([220, 180, 220, 180]), attackMs: Object.freeze([100, 90, 80, 70, 110, 150]), impactFrame: 3
    }),
    realm: Object.freeze({
        frame: 48, rows: Object.freeze(['up', 'down', 'left', 'right']), feet: Object.freeze([24, 32]), shadow: 0.3,
        idleMs: Object.freeze([220, 180, 220, 180]), attackMs: Object.freeze([100, 90, 80, 70, 110, 150]), impactFrame: 3
    }),
    realmBoss: Object.freeze({
        frame: 64, rows: Object.freeze(['up', 'down', 'left', 'right']), feet: Object.freeze([32, 46]), shadow: 0.42,
        idleMs: Object.freeze([240, 200, 240, 200]), attackMs: Object.freeze([120, 110, 90, 80, 130, 170]), impactFrame: 3
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
    ]),
    ...Object.entries({
        greatsword: { up: [35, 49], down: [36, 48], left: [39, 48], right: [23, 48] },
        scimitar: { up: [36.5, 49], down: [36, 48], left: [34.5, 48], right: [26.5, 48] },
        shortbow: { up: [35, 49], down: [33, 48], left: [30, 49], right: [32, 49] },
        orb: { up: [34.5, 49], down: [32, 49], left: [33, 48], right: [30, 48] },
        flask: { up: [30, 49], down: [31, 49], left: [35, 49], right: [29, 49] },
        censer: { up: [34, 49], down: [35, 49], left: [37.5, 48], right: [24.5, 49] }
    }).map(([weapon, feet]) => [`root-${weapon}`, 'root', `roots/${WEAPON_CATEGORIES[weapon].root}`, 31, feet]),
        ['underworld-crawler', 'realm', 'realms/underworld/crawler', 21, [24, 32]], ['underworld-beetle', 'realm', 'realms/underworld/beetle', 17, [24, 32]], ['underworld-miner', 'realm', 'realms/underworld/miner', 26, [24, 33]], ['underworld-hound', 'realm', 'realms/underworld/hound', 22, [24, 31]], ['underworld-executioner', 'realm', 'realms/underworld/executioner', 32, [24, 35]], ['underworld-wraith', 'realm', 'realms/underworld/wraith', 29, [24, 36]], ['underworld-king', 'realmBoss', 'realms/underworld/king', 42, [32, 46]],
        ['cosmos-star', 'realm', 'realms/cosmos/star', 22, [24, 33]], ['cosmos-ooze', 'realm', 'realms/cosmos/ooze', 24, [24, 32]], ['cosmos-wisp', 'realm', 'realms/cosmos/wisp', 28, [24, 34]], ['cosmos-wanderer', 'realm', 'realms/cosmos/wanderer', 28, [24, 34]], ['cosmos-sentinel', 'realm', 'realms/cosmos/sentinel', 30, [24, 36]], ['cosmos-seer', 'realm', 'realms/cosmos/seer', 23, [24, 38]], ['cosmos-colossus', 'realmBoss', 'realms/cosmos/colossus', 43, [32, 46]],
        ['ocean-angler', 'realm', 'realms/ocean/angler', 28, [24, 32]], ['ocean-crab', 'realm', 'realms/ocean/crab', 19, [24, 33]], ['ocean-cultist', 'realm', 'realms/ocean/cultist', 28, [24, 34]], ['ocean-shell', 'realm', 'realms/ocean/shell', 14, [24, 31]], ['ocean-knight', 'realm', 'realms/ocean/knight', 31, [24, 37]], ['ocean-oracle', 'realm', 'realms/ocean/oracle', 26, [24, 37]], ['ocean-leviathan', 'realmBoss', 'realms/ocean/leviathan', 42, [32, 47]],
        ['hive-worker', 'realm', 'realms/hive/worker', 24, [24, 34]], ['hive-drone', 'realm', 'realms/hive/drone', 25, [24, 34]],
        ['hive-scout', 'realm', 'realms/hive/scout', 23, [24, 34]], ['hive-nurse', 'realm', 'realms/hive/nurse', 24, [24, 34]],
        ['hive-guard', 'realm', 'realms/hive/guard', 27, [24, 34]], ['hive-royal', 'realm', 'realms/hive/royal', 27, [24, 34]],
        ['hive-queen', 'realmBoss', 'realms/hive/queen', 40, [32, 46]],
        ['sky-imp', 'realm', 'realms/sky/imp', 25, [24, 36]], ['sky-roc', 'realm', 'realms/sky/roc', 24, [24, 33]], ['sky-sentinel', 'realm', 'realms/sky/sentinel', 31, [24, 34]], ['sky-harpy', 'realm', 'realms/sky/harpy', 28, [24, 34]], ['sky-lancer', 'realm', 'realms/sky/lancer', 33, [24, 36]], ['sky-griffin', 'realm', 'realms/sky/griffin', 29, [24, 33]], ['sky-titan', 'realmBoss', 'realms/sky/titan', 44, [32, 46]]
].map(([id, kind, stem, height, feet]) => [id, Object.freeze({
    id, kind, height, feet: feet ? Object.freeze(feet) : null, idle: `assets/enemies/${stem}-idle.png`, attack: `assets/enemies/${stem}-attack.png`
})])));

safeExposeData({ MONSTER_SPRITE_KINDS, MONSTER_SPRITE_SHEETS });
