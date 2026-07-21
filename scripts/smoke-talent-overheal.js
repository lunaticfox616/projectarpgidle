const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function readFunctionSource(source, name) {
    const start = source.indexOf(`function ${name}(`);
    assert(start >= 0, `${name} must exist`);
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
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const context = {
    console,
    window: null,
    globalThis: null,
    document: { getElementById() { return null; } },
    game: {
        talentCards: { hero5__crusader: { level: 1, score: 0, count: 1 } },
        talentCardLoadout: ['hero5__crusader', null, null, null, null, null],
        playerHp: 100,
        playerEnergyShield: 50,
        ascendClass: null
    },
    hasKeystone(id) { return id === 'w8' && context.game.ascendClass === 'warrior'; },
    getChallengeContractRecoveryMultiplier() { return 1; },
    getLeechCaps() { return { instanceCap: 1000 }; }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
['data/talent-cards.js', 'js/utils.js', 'js/talent-cards.js'].forEach(file => {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
});
vm.runInContext('game = window.game;', context);

const effects = context.getActiveTalentKeystoneUniqueEffects();
assert.strictEqual(effects.length, 1, '기사단장 표면 효과가 장착 고유 효과 경로에 들어가야 한다');
assert.strictEqual(effects[0].key, 'overhealCapPct');
assert.strictEqual(effects[0].params.pct, 12);

vm.runInContext([
    readFunctionSource(combatSource, 'getPlayerHpCap'),
    readFunctionSource(combatSource, 'getPlayerRecoveryHpCap'),
    readFunctionSource(combatSource, 'getPlayerEnergyShieldRecoveryCap'),
    readFunctionSource(combatSource, 'applyInstantPlayerLeech')
].join('\n'), context, { filename: 'talent-overheal-combat.js' });

const stats = { maxHp: 100, energyShield: 50, uniqueOverhealCapPct: 12 };
assert.strictEqual(context.getPlayerRecoveryHpCap(stats), 112, '생명력 회복 상한이 최대 생명력의 112%여야 한다');
assert.strictEqual(context.getPlayerEnergyShieldRecoveryCap(stats), 56, '보호막 회복 상한이 최대 보호막의 112%여야 한다');

assert.strictEqual(context.applyInstantPlayerLeech(30, stats, 'life'), 12, '생명력 회복이 초과 회복 상한까지 적용되어야 한다');
assert.strictEqual(context.game.playerHp, 112);
assert.strictEqual(context.applyInstantPlayerLeech(30, stats, 'energyShield'), 6, '보호막 회복이 초과 회복 상한까지 적용되어야 한다');
assert.strictEqual(context.game.playerEnergyShield, 56);
assert(uiSource.includes('pStats.lifeRecoveryCap'), 'UI 갱신이 전투 도메인의 초과 회복 상한을 사용해야 한다');
assert(!uiSource.includes('game.playerHp = Math.min(game.playerHp, pStats.maxHp);'), '기존 생명력 강제 제한이 남아 있으면 안 된다');

context.game.ascendClass = 'warrior';
assert.strictEqual(context.getPlayerRecoveryHpCap(stats), 50, '생명력 회복 불가 키스톤의 50% 상한은 초과 회복보다 우선해야 한다');

console.log('smoke-talent-overheal passed');
