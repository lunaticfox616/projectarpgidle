// 아틀라스 들어가기(PR #1030 리뷰, 2026-10-03): 아틀라스가 열렸으면 혼돈계 관문 전이라도 세계수 탐험 창이 열리고,
// 나무꾼 전투의 세팅 잠금 중에는 지도로 떠나지 않는다(떠나면 잠금이 매 틱 전리품을 지웠다).
'use strict';
const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');
const { run } = fixture(91);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));

run(`game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',level:90,
        combatTimeMs:1800000000000,settings:{pauseGameOnOverlay:false}});
    game.season=10; game.maxZoneId=29; game.chaosRealm.unlocked=false; contentProgression.sync();
    tutorialQueue.length=0; game.loopProgressCurrent.chaos20Cleared=true; atlasRun.onChaos20();`);
assert.strictEqual(copy('game.atlas.unlocked'), true, 'the loop-10 chaos 20 clear opens the atlas');
assert.strictEqual(copy("contentProgression.isUnlocked('chaosRealm')"), false, 'the chaos realm gate is still closed');
assert.strictEqual(copy("contentProgression.canOpen('map-explore-worldtree')"), true, 'the atlas window opens anyway');

run(`game.woodsmanBuildSnapshot = snapshotWoodsmanBuildState(); game.woodsmanBuildLock = true; game.currentZoneId = OUTSIDE_CHAOS_ZONE_ID;
    globalThis.lockedMap = Object.assign(atlasMaps.create('roots_0', 1, 'normal'), { uid: game.atlas.nextUid++ }); game.atlas.stash.push(lockedMap);`);
const refused = copy('atlasRun.open(lockedMap.uid)');
assert.ok(refused, 'a map does not open during the woodsman fight');
assert.strictEqual(copy('game.currentZoneId'), copy('OUTSIDE_CHAOS_ZONE_ID'), 'the hero stays in the fight');
assert.ok(copy('game.atlas.stash.some(map => map.uid === lockedMap.uid)'), 'the map stays in the stash');

console.log('atlas access: the atlas window follows the atlas, no map departures during the woodsman lock: OK');
