const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const stateSource = fs.readFileSync('js/state.js', 'utf8');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const passivesSource = fs.readFileSync('js/passives.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');

// 1) 상태 필드가 기본 게임 객체에 존재해야 한다 (저장/로드 자동 영속).
assert(stateSource.includes('unlockedMonsterSkins: {}'), 'default game state must include unlockedMonsterSkins map');
assert(stateSource.includes('selectedMonsterSkin: null'), 'default game state must include selectedMonsterSkin field');

// 2) 처치 시 0.002% 해금 판정이 전투 사망 처리에 연결되어야 한다.
assert(combatSource.includes('Math.random() < 0.00002'), 'monster skin unlock must roll a 0.002% chance on kill');
assert(combatSource.includes('tryUnlockMonsterSkinFromEnemy(enemy)'), 'kill handler must attempt monster skin unlock');

// 3) 좌우반전 렌더 옵션과 플레이어 외형 주입이 존재해야 한다.
assert(passivesSource.includes('if (options.flipX)'), 'drawBattleSprite must support horizontal flip option');
assert(uiSource.includes('flipX: true'), 'player monster skin must be drawn flipped to face right');
assert(uiSource.includes('resolveMonsterSkinSprite(monsterSkinId)'), 'drawPlayerSprite must resolve the selected monster skin sprite');

// 4) 설정 UI 드롭다운과 렌더 호출이 연결되어야 한다.
assert(indexHtml.includes('id="sel-monster-skin"'), 'settings must expose the monster skin selector');
assert(indexHtml.includes('onMonsterSkinChanged()'), 'monster skin selector must be wired to its change handler');
assert(uiSource.includes('renderMonsterSkinControls();'), 'updateStaticUI must refresh the monster skin selector');

// 5) getEnemySkinId 동작 검증 (렌더러 선택 로직과 동일해야 한다).
const fnMatch = uiSource.match(/function getEnemySkinId\(enemy\) \{[\s\S]*?\n\}/);
assert(fnMatch, 'getEnemySkinId function must be present in js/ui.js');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(fnMatch[0] + '\nthis.getEnemySkinId = getEnemySkinId;', sandbox, { filename: 'getEnemySkinId.js' });
const getEnemySkinId = sandbox.getEnemySkinId;

// 보스는 자신의 boss asset key 를 외형 id 로 사용한다.
assert.strictEqual(getEnemySkinId({ isBoss: true, bossAssetKey: 'bossAct4_2', variantSeed: 3 }), 'bossAct4_2', 'boss skin id must use the boss asset key');

// 일반 적은 결정적 변형 선택 결과(프레임 키)를 반환한다.
// 주의: 선택 시드는 Math.abs(variantSeed || id || 1) 라서 0/누락 시드는 1로 보정된다.
// normalPool = ['slime','bandit','shadow','wraith'], 물리(offset 0)
assert.strictEqual(getEnemySkinId({ ele: 'phys', variantSeed: 4 }), 'slime', 'normal phys seed4 -> slime');
assert.strictEqual(getEnemySkinId({ ele: 'phys', variantSeed: 2 }), 'shadow', 'normal phys seed2 -> shadow');
// fire offset(+1), seed 4 -> index1 -> 'bandit'
assert.strictEqual(getEnemySkinId({ ele: 'fire', variantSeed: 4 }), 'bandit', 'normal fire seed4 -> bandit');
// elitePool = ['knight','skeleton','shadow','wraith','bandit'], phys seed5 -> index0 -> 'knight'
assert.strictEqual(getEnemySkinId({ isElite: true, ele: 'phys', variantSeed: 5 }), 'knight', 'elite phys seed5 -> knight');

console.log('monster skin collection smoke checks passed.');
