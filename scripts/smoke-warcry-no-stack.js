const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// 같은 함성(warcry)/가드/유틸 조건 젬을 지속시간 중에 다시 시전하면 중복으로 쌓이지 않고
// 지속시간만 갱신되어야 한다(저주가 이미 하던 방식과 동일하게 맞춤). 서로 다른 종류는
// 그대로 함께 유지되어야 우로보로스 함성 공명 등 "서로 다른 함성 개수" 보너스가 의미 있다.
function readFunctionSource(source, name) {
    const start = source.indexOf(`function ${name}`);
    assert.ok(start >= 0, `${name} must exist`);
    let depth = 0;
    for (let index = source.indexOf('{', start); index < source.length; index++) {
        if (source[index] === '{') depth++;
        if (source[index] !== '}') continue;
        depth--;
        if (depth === 0) return source.slice(start, index + 1);
    }
    throw new Error(`${name} must have a closing brace`);
}

const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const skillsSource = fs.readFileSync('data/skills.js', 'utf8');

const context = {
    console,
    getAliveEnemyByRuntimeKey() { return null; },
    addLog() {},
    handleEnemyDeath() {},
    getPlayerStats() { return {}; },
    formatNumberKR(n) { return String(n); },
    getConditionGemStatDelta() { return {}; },
    safeExposeData(map) { Object.assign(context, map); }
};
context.window = context;
vm.createContext(context);
vm.runInContext(skillsSource, context, { filename: 'data/skills.js' });
context.window.CONDITION_GEM_DB = context.CONDITION_GEM_DB;
['cleanupConditionGemStates', 'getAllConditionGemEntriesForCombat', 'runConditionGemAutoRules'].forEach(name => {
    vm.runInContext(`${readFunctionSource(combatSource, name)}; this.${name} = ${name};`, context, { filename: name });
});

assert.ok(context.CONDITION_GEM_DB && Array.isArray(context.CONDITION_GEM_DB.warcry) && context.CONDITION_GEM_DB.warcry.length > 0, 'CONDITION_GEM_DB.warcry must be loaded');
const warcryName = context.CONDITION_GEM_DB.warcry[0].name;

function freshGame(now) {
    return {
        playerHp: 100,
        conditionGemUnlocked: true,
        conditionGemPool: [warcryName],
        skillAutoRules: [{ enabled: true, priority: 0, triggerType: 'hp_above', hpThreshold: 0, skillName: warcryName }],
        conditionGemCooldowns: {},
        enemyConditionDebuffs: {},
        playerConditionBuffs: [],
        enemies: [],
        playerCastDelayUntil: 0
    };
}

// 첫 시전: 버프 1개가 걸려야 한다.
let now = Date.now();
context.game = freshGame(now);
context.runConditionGemAutoRules({ maxHp: 100 });
assert.strictEqual(context.game.playerConditionBuffs.length, 1, '첫 시전 후에는 버프가 1개 걸려야 한다');
const firstExpire = context.game.playerConditionBuffs[0].expiresAt;

// 쿨다운을 무시하고 즉시 재시전 가능하게 만든 뒤(다른 시각), 같은 함성을 다시 시전하면
// 새 항목이 추가되는 게 아니라 기존 항목의 만료 시각만 갱신되어야 한다.
// vm.createContext는 별도의 realm이라 호스트의 Date를 오버라이드해도 영향이 없으므로,
// 컨텍스트 안에서 직접 Date.now를 패치한다.
context.game.conditionGemCooldowns[warcryName] = 0;
let later = now + 2000;
context.__fakeNow = later;
vm.runInContext('Date.now = function() { return globalThis.__fakeNow; };', context);
context.runConditionGemAutoRules({ maxHp: 100 });
assert.strictEqual(context.game.playerConditionBuffs.length, 1, '이미 걸려 있는 같은 함성을 다시 시전해도 중복으로 쌓이면 안 된다');
assert.ok(context.game.playerConditionBuffs[0].expiresAt > firstExpire, '재시전 시 지속시간(만료 시각)이 갱신되어야 한다');

// 서로 다른 종류의 함성/가드/유틸은 함께 유지되어야 한다(공명 보너스 등에 필요).
if (Array.isArray(context.CONDITION_GEM_DB.warcry) && context.CONDITION_GEM_DB.warcry.length > 1) {
    let secondWarcry = context.CONDITION_GEM_DB.warcry[1].name;
    context.game.conditionGemPool.push(secondWarcry);
    // 자동 시전은 한 틱에 하나만 발동하므로(break), 이번 틱에는 새로 추가한 함성만 발동하도록
    // 우선순위를 가장 앞에 둔다. 이미 걸려 있는 첫 함성의 항목은 그대로 유지되어야 한다.
    context.game.skillAutoRules.unshift({ enabled: true, priority: -1, triggerType: 'hp_above', hpThreshold: 0, skillName: secondWarcry });
    context.game.conditionGemCooldowns[secondWarcry] = 0;
    // 직전 시전의 캐스트 딜레이(playerCastDelayUntil)는 넘기되, 첫 함성의 만료 시각 전에 호출한다.
    context.__fakeNow = later + 2000;
    context.runConditionGemAutoRules({ maxHp: 100 });
    assert.strictEqual(context.game.playerConditionBuffs.length, 2, '서로 다른 함성은 함께 걸려 있어야 한다');
}

console.log('smoke-warcry-no-stack passed');
