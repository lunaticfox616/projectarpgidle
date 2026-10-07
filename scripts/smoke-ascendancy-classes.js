// 전직 18종(2026-10-02): 직업 6개마다 전직 3종. 직업별 전직 셋, 키스톤 구조와 id 고유, 기존 12종의 노드 값이 개편 전과 같음(지문),
// 새 여섯의 키스톤이 능력치 줄과 고유 효과 줄로 실제 힘을 바꿈(고른 것, 우주계 쌍둥이), 고유 효과 키는 전투 엔진에 있고
// 장비보다 앞에 들어감, 쌍둥이 키스톤 풀, 저장 경계, 재능 개화 카드 180종(새 60장의 고유 효과).
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const run = source => vm.runInContext(source, runtime);
const json = source => JSON.parse(run(`JSON.stringify(${source})`));
run(`game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero2',selectedClassId:'warrior'});window.game=game;Math.random=()=>0.37;`);

// 직업마다 셋, 모두 합쳐 18종, 겹치지 않는다.
const byClass = json('ASCENDANCIES_BY_PLAYER_CLASS');
assert.deepEqual(Object.keys(byClass).sort(), json('Object.keys(PLAYER_CLASS_DEFS)').sort(), 'every player class has its ascendancies');
const all = Object.values(byClass).flat();
assert.equal(all.length, 18);
assert.equal(new Set(all).size, 18, 'no ascendancy belongs to two classes');
assert.deepEqual(all.slice().sort(), json('Object.keys(CLASS_TEMPLATES)').sort(), 'every template belongs to a class');
assert.deepEqual(json(`getAscendanciesForClass('warrior')`), ['warrior', 'berserker', 'juggernaut']);
assert.equal(run(`isAscendancyOfClass('assassin', 'warrior')`), false, 'another class cannot take it');
assert.equal(run(`isAscendancyOfClass('crusader', 'cleric')`), true);

// 키스톤: 전직마다 9개, id는 전직을 통틀어 하나, 선행은 같은 전직 안, 9번째는 재능 개화 전용, 새 여섯은 능력치 줄.
const keystones = json('CLASS_KEYSTONE_DEFS');
const ids = Object.values(keystones).flat().map(node => node.id);
assert.equal(ids.length, 18 * 9);
assert.equal(new Set(ids).size, ids.length, 'keystone ids are unique across ascendancies');
const statIds = new Set(json('Object.keys(P_STATS)'));
for (const [asc, list] of Object.entries(keystones)) {
    const own = new Set(list.map(node => node.id));
    list.forEach(node => [node.req, ...(node.reqAny || [])].filter(Boolean).forEach(req => assert.ok(own.has(req), `${node.id} requires ${req} of ${asc}`)));
    assert.ok(list[8].fifthJobOnly, `${asc}: the ninth keystone needs the talent bloom`);
}
// 고유 효과 키는 getPlayerStats의 고유 효과 엔진이 아는 키여야 하고, 수치는 0이 아닌 양수(엔진은 0을 기본값으로 바꾼다).
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const engineKnows = key => combatSource.includes(`effect.key === '${key}'`);
const checkUniqueLine = (owner, unique) => {
    assert.ok(engineKnows(unique.key), `${owner}: ${unique.key} is handled by the unique-effect engine`);
    Object.entries(unique.params || {}).forEach(([name, value]) => assert.ok(Number.isFinite(value) && value > 0, `${owner}: ${unique.key}.${name} = ${value}`));
};
const NEW_SIX = ['berserker', 'juggernaut', 'bladedancer', 'stormarcher', 'grovewarden', 'bombardier'];
for (const asc of NEW_SIX) {
    keystones[asc].forEach(node => {
        assert.ok(node.desc && (node.stats || []).length + (node.uniques || []).length > 0, `${node.id} has a description and stat or unique lines`);
        (node.stats || []).forEach(line => assert.ok(statIds.has(line.stat) && Number.isFinite(line.val) && line.val !== 0, `${node.id}: ${line.stat}`));
        (node.uniques || []).forEach(unique => checkUniqueLine(node.id, unique));
    });
    assert.ok(keystones[asc].filter(node => (node.uniques || []).length || node.bloomMechanic).length >= 4, `${asc}: keystones 4-9 carry most of the unique effects`);
}

// 옛 재능 카드 효과를 켜는 키스톤(bloomMechanic, 2026-10-02 재능 정리): 효과 정의가 있고 얻을 수 있는 카드가 아니며, 찍으면(그
// 전직일 때, 또는 쌍둥이 키스톤으로) 그 효과가 최대 레벨로 켜진다. 예: 저거너트 방패 벽 → 스톤쉴드(막기 후 최대 생명력 10% 돌 보호막).
const mechanicKeystones = Object.values(keystones).flat().filter(node => node.bloomMechanic);
assert.equal(mechanicKeystones.length, 6, 'one signature effect per new ascendancy');
const bloomCardKeys = new Set(json('getTalentBloomCardKeys()'));
mechanicKeystones.forEach(node => {
    assert.ok(run(`!!TALENT_BLOOM_CARD_DEFS['${node.bloomMechanic}']`), `${node.id}: ${node.bloomMechanic} has an effect definition`);
    assert.ok(!bloomCardKeys.has(node.bloomMechanic), `${node.id}: ${node.bloomMechanic} is not an obtainable card`);
});
const stone = json(`(() => {
    const level = () => { getPlayerStats(false); return isTalentCardActive('hero2__guardian'); };
    game.ascendClass = 'juggernaut'; game.ascendKeystones = ['jg2']; game.cosmosTwinKeystones = [];
    const without = level();
    game.ascendKeystones = ['jg2', 'jg5'];
    const picked = level();
    const shield = grantTalentStoneShield(1000, 0);
    game.ascendClass = 'warrior'; game.ascendKeystones = ['jg2', 'jg5'];
    const otherAscendancy = level();
    game.ascendClass = ''; game.ascendKeystones = []; getPlayerStats(false);
    return { without, picked, shield: shield && shield.amount, otherAscendancy };
})()`);
assert.deepEqual(stone, { without: 0, picked: 10, shield: 100, otherAscendancy: 0 }, 'the keystone switches the stone shield on at full strength, only in its ascendancy');
assert.equal(run(`[...getGrantedBloomMechanics({ ascendClass: 'warrior', ascendKeystones: [], cosmosTwinKeystones: ['jg5'], equipment: {} })].join()`), 'hero2__guardian',
    'a twin keystone grants its effect in any ascendancy');

// 옛 재능 카드 효과를 켜는 고유 주얼(일반 고유 풀): 효과 정의, 알려진 능력치, 키스톤과 겹치지 않음. 소켓에 끼우면 켜지고 빼면 꺼진다.
const mechanicJewels = json('UNIQUE_JEWEL_DB.filter(row => row.bloomMechanic)');
assert.equal(mechanicJewels.length, 14);
const movedMechanics = [...mechanicKeystones.map(node => node.bloomMechanic), ...mechanicJewels.map(row => row.bloomMechanic)];
assert.equal(new Set(movedMechanics).size, 20, 'twenty different effects moved (six keystones, fourteen jewels)');
mechanicJewels.forEach(row => {
    assert.ok(run(`!!TALENT_BLOOM_CARD_DEFS['${row.bloomMechanic}']`) && !bloomCardKeys.has(row.bloomMechanic), `${row.id}: ${row.bloomMechanic}`);
    assert.ok(!row.ultra && row.uniqueEffect && !/[·]/.test(row.uniqueEffect), `${row.id}: ordinary pool, effect text`);
    row.stats.forEach(stat => assert.ok(statIds.has(stat.id) && stat.val > 0, `${row.id}: ${stat.id}`));
});
const socketed = json(`(() => {
    const saved = { ...game.equipment };
    const ring = uniqueId => ({ slot: '반지1', name: '시험 반지', rarity: 'normal', stats: [], voidSocket: { open: true, jewel: { uniqueId, name: uniqueId, rarity: 'unique', stats: [] } } });
    game.ascendClass = ''; game.ascendKeystones = []; game.cosmosTwinKeystones = [];
    getPlayerStats(false);
    const before = isTalentCardActive('hero6__ranger');
    game.equipment['반지1'] = ring('uj_marksman_eye');
    getPlayerStats(false);
    const withJewel = isTalentCardActive('hero6__ranger');
    game.equipment['반지1'] = ring('uj_three_way');
    getPlayerStats(false);
    const deadeye = getActiveTalentKeystoneUniqueEffects().map(effect => effect.key);
    game.equipment = saved; getPlayerStats(false);
    const after = isTalentCardActive('hero6__ranger');
    return { before, withJewel, deadeye, after };
})()`);
assert.deepEqual([socketed.before, socketed.withJewel, socketed.after], [0, 10, 0], 'a socketed mechanic jewel switches its effect on at full strength, and off when removed');
assert.deepEqual(socketed.deadeye, ['projectilePatternMode', 'projectileDoubleStrikePct', 'projectileExtraShotBonus'], 'a jewel brings the effect\'s unique lines too');

// 노드: 기존 12종은 2026-10-07 직업 밸런스 뒤의 값(지문; 그 전에는 개편 전 getClassTreeDef와 같은 값), 새 여섯은 모든 노드가
// 아는 능력치의 양수 값.
const trees = json(`(() => {
    const out = {};
    for (const id of ['warrior','gladiator','assassin','ranger','elementalist','warlock','guardian','inquisitor','soulbinder','catalyst','hunter','crusader','berserker','juggernaut','bladedancer','stormarcher','grovewarden','bombardier']) {
        game.completedTrials = []; game.bloomedClassThisLoop = ''; game.bloomedTalentThisLoop = '';
        const base = getClassTreeDef(id);
        game.completedTrials = ['trial_1','trial_2','trial_3','trial_4'];
        const core = getClassTreeDef(id);
        game.bloomedClassThisLoop = id; game.bloomedTalentThisLoop = 'hero3';
        out[id] = { base, core, bloom: getClassTreeDef(id) };
    }
    game.completedTrials = []; game.bloomedClassThisLoop = ''; game.bloomedTalentThisLoop = '';
    return out;
})()`);
const oldTwelve = Object.fromEntries(Object.entries(trees).slice(0, 12));
assert.equal(crypto.createHash('sha1').update(JSON.stringify(oldTwelve)).digest('hex'), '3a9c9d10fa75ec7f19600e8fd83655c001c95e54',
    'the twelve existing ascendancies keep their node values (data/ascendancies.js after the 2026-10-07 class balance)');
for (const asc of ['berserker', 'juggernaut', 'bladedancer', 'stormarcher', 'grovewarden', 'bombardier']) {
    const nodes = Object.entries(trees[asc].bloom);
    assert.equal(nodes.length, 16, `${asc}: n1-n10, n11-n12 and n13a-d`);
    nodes.forEach(([id, node]) => (node.stats || [node]).forEach(line => assert.ok(statIds.has(line.stat) && line.val > 0, `${asc} ${id}: ${line.stat} ${line.val}`)));
}

// 새 키스톤은 고르면(그 전직일 때) 힘이 바뀌고, 우주계 쌍둥이 키스톤으로 받아도 바뀐다.
const power = json(`(() => {
    const dps = () => getPlayerStats(false).dps;
    game.ascendClass = 'berserker'; game.ascendKeystones = []; game.cosmosTwinKeystones = [];
    const plain = dps();
    game.ascendKeystones = ['bz2'];
    const picked = dps();
    game.ascendClass = ''; game.ascendKeystones = [];
    // 쌍둥이 키스톤 목록은 getPlayerStats가 장착한 우주계 주얼에서 다시 만든다 — 합산 함수에 상태를 직접 넘긴다.
    const bucket = () => ({ ...Object.fromEntries([...DIRECT_STAT_BUCKET_KEYS].map(key => [key, 0])) });
    const twinBucket = bucket(); accumulateCombatKeystoneStats(twinBucket, { ascendClass: 'warrior', ascendKeystones: [], cosmosTwinKeystones: ['bz2'] });
    const otherBucket = bucket(); accumulateCombatKeystoneStats(otherBucket, { ascendClass: 'warrior', ascendKeystones: ['bz2'], cosmosTwinKeystones: [] });
    return { plain, picked, twinAspd: twinBucket.aspd, otherAspd: otherBucket.aspd };
})()`);
assert.ok(power.picked > power.plain * 1.05, `a picked stat keystone raises DPS: ${power.plain} -> ${power.picked}`);
assert.equal(power.twinAspd, 14, 'a twin stat keystone works for any ascendancy');
assert.equal(power.otherAspd, 0, 'a picked keystone of another ascendancy does nothing');

// 고유 효과 줄: 고른 키스톤(그 전직일 때)과 쌍둥이 키스톤이 실제 능력치에 닿고, 다른 전직의 고른 키스톤은 닿지 않는다.
const immune = json(`(() => {
    const read = () => { const s = getPlayerStats(false); return [!!s.immuneFreeze, !!s.immuneBleed]; };
    game.ascendClass = 'juggernaut'; game.ascendKeystones = []; game.cosmosTwinKeystones = [];
    const plain = read();
    game.ascendKeystones = ['jg3', 'jg6'];
    const picked = read();
    const twin = getActiveAscendKeystoneUniqueEffects({ ascendClass: 'warrior', ascendKeystones: [], cosmosTwinKeystones: ['jg6'] }).map(e => e.key);
    const other = getActiveAscendKeystoneUniqueEffects({ ascendClass: 'warrior', ascendKeystones: ['jg6'], cosmosTwinKeystones: [] }).length;
    game.ascendClass = ''; game.ascendKeystones = [];
    return { plain, picked, twin, other };
})()`);
assert.deepEqual(immune.plain, [false, false]);
assert.deepEqual(immune.picked, [true, true], 'the picked keystone 불굴 makes the hero immune to freeze and bleed');
assert.deepEqual(immune.twin, ['immuneFreeze', 'immuneBleed'], 'a twin keystone brings its unique lines');
assert.equal(immune.other, 0, 'a picked keystone of another ascendancy brings nothing');

// 회귀(2026-10-02 검토): 같은 고유 효과를 고유 장비와 키스톤이 함께 주면 값마다 더 좋은 쪽이다. 예전에는 나중 줄이 통째로
// 이겨서 폭군의 왕관(시체 폭발 8%, 12%)이 폭약술사 대폭발(15%, 20%)을 깎았다. 재사용 대기처럼 작을수록 좋은 값은 작은 쪽.
const merged = json(`(() => {
    const saved = { ...game.equipment };
    game.equipment['투구'] = { slot: '투구', name: '시험 왕관', rarity: 'unique', stats: [], uniqueEffectKey: 'corpseExplodeOnKill', uniqueEffectParams: { chance: 8, lifePct: 12 } };
    game.ascendClass = 'bombardier'; game.ascendKeystones = [];
    const itemOnly = getPlayerStats(false).uniqueCorpseExplode;
    game.ascendKeystones = ['bm1', 'bm4', 'bm7'];
    const both = getPlayerStats(false).uniqueCorpseExplode;
    game.equipment = saved; game.ascendClass = ''; game.ascendKeystones = []; getPlayerStats(false);
    const ward = mergeBetterUniqueParams({ hpPct: 12, cooldown: 20 }, { hpPct: 10, cooldown: 30 });
    const ward2 = mergeBetterUniqueParams({ hpPct: 12, cooldown: 20 }, { hpPct: 10, cooldown: 15 });
    return { itemOnly, both, ward, ward2 };
})()`);
assert.deepEqual(merged.itemOnly, { chance: 8, lifePct: 12 });
assert.deepEqual(merged.both, { chance: 15, lifePct: 20 }, 'a weaker unique item no longer lowers the keystone');
assert.deepEqual([merged.ward, merged.ward2], [{ hpPct: 12, cooldown: 20 }, { hpPct: 12, cooldown: 15 }], 'cooldowns keep the shorter one');
const engineSource = fs.readFileSync('js/combat.js', 'utf8');
for (const key of ['leechEfficiencyOnKill', 'lifeRecoupTakenDamage', 'realmDeathWard', 'guardianArmor', 'realmMeleeArmorAmp', 'evasionDanceOnEvade',
    'deflectGrantShadowStealth', 'loneEvasionCounter', 'fewEnemyEvasionMore', 'projectileExtraShotChance', 'realmKillMoveStacks', 'shockTracerGreaves',
    'realmRegenRateAndRegen', 'dragonVeinGuard', 'stackingElementalResDownOnHit', 'corpseExplodeOnKill', 'realmRiftWaveOnHit']) {
    const line = engineSource.split('\n').find(row => row.includes(`effect.key === '${key}')`));
    assert.ok(/= mergeBetterUniqueParams\(unique\w+, \{/.test(line), `${key}: keystone keys merge value by value in the engine`);
}
const keystoneKeys = new Set(Object.values(keystones).flat().flatMap(node => (node.uniques || []).map(unique => unique.key)));
const mergedKeys = new Set(['leechEfficiencyOnKill', 'lifeRecoupTakenDamage', 'realmDeathWard', 'guardianArmor', 'realmMeleeArmorAmp', 'evasionDanceOnEvade',
    'deflectGrantShadowStealth', 'loneEvasionCounter', 'fewEnemyEvasionMore', 'projectileExtraShotChance', 'realmKillMoveStacks', 'shockTracerGreaves',
    'realmRegenRateAndRegen', 'dragonVeinGuard', 'stackingElementalResDownOnHit', 'corpseExplodeOnKill', 'realmRiftWaveOnHit']);
for (const key of keystoneKeys) {
    const line = engineSource.split('\n').find(row => row.includes(`effect.key === '${key}')`));
    const objectAssign = /\) unique\w+ = (mergeBetterUniqueParams\()?\{/.test(line);
    assert.ok(!objectAssign || mergedKeys.has(key), `${key}: a keystone key the engine overwrites must merge instead`);
}

// 회귀(2026-10-02 검토): 전직을 고르기 전에도 쌍둥이 키스톤의 능력치 줄이 들어간다(예전에는 노드 합산이 먼저 돌아가 빠졌다).
const twinNoAsc = json(`(() => {
    const ring = (slot, uniqueId) => ({ slot, name: '시험 반지', rarity: 'normal', stats: [], voidSocket: { open: true, jewel: { uniqueId, name: uniqueId, rarity: 'unique', cosmosKeystoneJewel: true, cosmosKeystone: 'bz2', stats: [] } } });
    const saved = { ...game.equipment };
    game.ascendClass = ''; game.ascendKeystones = []; game.cosmosTwinKeystones = [];
    const plain = getPlayerStats(false).aspd;
    game.equipment['반지1'] = ring('반지1', 'cbj_zubenubia_balance');
    game.equipment['반지2'] = ring('반지2', 'cbj_zubenshamali_judgment');
    getPlayerStats(false);
    const twin = getPlayerStats(false).aspd;
    game.equipment = saved; getPlayerStats(false);
    return { plain, twin };
})()`);
assert.ok(twinNoAsc.twin > twinNoAsc.plain * 1.05, `a twin stat keystone works before an ascendancy is picked: ${twinNoAsc.plain} -> ${twinNoAsc.twin}`);

// 회귀(2026-10-02 검토): 방패 칸의 무기는 쌍수 훈련(w3)이 켜져 있을 때만 적용된다. 쌍둥이 주얼로 받은 w3를 잃으면 꺼진다.
const offhand = json(`(() => {
    const saved = { ...game.equipment };
    const weapon = () => createItemFromBase(BASE_ITEM_DB.find(base => base.slot === '무기' && base.reqTier === 1), 'normal', 1);
    const socket = (slot, uniqueId) => { const item = createItemFromBase(BASE_ITEM_DB.find(base => base.slot === slot), 'normal', 1); item.baseStats = []; item.stats = [];
        item.voidSocket = { open: true, jewel: { uniqueId, cosmosKeystoneJewel: true, cosmosKeystone: 'w3', stats: [] } }; return item; };
    game.level = 100; game.ascendClass = 'berserker'; game.ascendKeystones = [];
    game.equipment['무기'] = weapon(); game.equipment['방패'] = weapon();
    getPlayerStats(false);
    const without = { active: !!combatEquipmentStats.activeEquipment(game)['방패'], reason: (combatEquipmentStats.evaluate(game).disabled['방패'] || []).join(',') };
    game.equipment['목걸이'] = socket('목걸이', 'cbj_zubenubia_balance');
    game.equipment['허리띠'] = socket('허리띠', 'cbj_zubenshamali_judgment');
    getPlayerStats(false); getPlayerStats(false);
    const twin = !!combatEquipmentStats.activeEquipment(game)['방패'];
    game.equipment['목걸이'].voidSocket.jewel = null;
    getPlayerStats(false); getPlayerStats(false);
    const lost = !!combatEquipmentStats.activeEquipment(game)['방패'];
    game.ascendClass = 'warrior'; game.ascendKeystones = ['w3'];
    getPlayerStats(false);
    const picked = !!combatEquipmentStats.activeEquipment(game)['방패'];
    game.equipment = saved; game.ascendClass = ''; game.ascendKeystones = []; getPlayerStats(false);
    return { without, twin, lost, picked };
})()`);
assert.deepEqual(offhand.without, { active: false, reason: '쌍수 훈련 키스톤' }, 'an off-hand weapon without dual training does not count');
assert.equal(offhand.twin, true, 'twin w3 lets the off-hand weapon count');
assert.equal(offhand.lost, false, 'losing the twin jewel turns the off-hand weapon off again');
assert.equal(offhand.picked, true, 'a picked w3 (warrior) keeps working');

// 회귀(2026-10-02 검토): 전직 고르기 카드의 노드 줄은 실제 노드에서 뽑는다(크루세이더는 자리 규칙을 통째로 바꾼다).
const focus = json(`Object.fromEntries(getAscendancyOrder().map(key => [key, getAscendancyNodeFocus(key)]))`);
assert.ok(focus.crusader.includes('번개 피해') && !focus.crusader.includes('근접 피해'), `crusader: ${focus.crusader}`);
for (const [key, labels] of Object.entries(focus)) assert.ok(labels.length >= 3 && new Set(labels).size === labels.length, `${key}: ${labels}`);

// 회귀(2026-10-02): 쌍둥이 키스톤은 전직과 상관없이 켜진다. 기존 12종의 전투 코드가 전직까지 확인해서, 주얼 두 개가
// 어쌔신 키스톤 a1(치명타 피해 +66, 치명타 확률 -6)을 줘도 글래디에이터에게는 효과가 없었다. 고른 키스톤은 여전히 그 전직일 때만.
const twinOld = json(`(() => {
    const ring = (slot, uniqueId) => ({ slot, name: '시험 반지', rarity: 'normal', stats: [], voidSocket: { open: true, jewel: { uniqueId, name: uniqueId, rarity: 'unique', cosmosKeystoneJewel: true, cosmosKeystone: 'a1', stats: [] } } });
    const read = () => getPlayerStats(false).critDmg;
    const saved = { ...game.equipment };
    game.ascendClass = 'gladiator'; game.ascendKeystones = []; game.cosmosTwinKeystones = [];
    const plain = read();
    game.ascendKeystones = ['a1'];
    const pickedOther = read();
    game.ascendKeystones = [];
    game.equipment['반지1'] = ring('반지1', 'cbj_zubenubia_balance');
    game.equipment['반지2'] = ring('반지2', 'cbj_zubenshamali_judgment');
    const twin = read();
    const granted = game.cosmosTwinKeystones.slice();
    game.equipment = saved; game.ascendClass = ''; read();
    return { plain, pickedOther, twin, granted };
})()`);
assert.deepEqual(twinOld.granted, ['a1'], 'two matching twin jewels grant their keystone');
assert.equal(twinOld.twin - twinOld.plain, 66, `a twin assassin keystone works for a gladiator: ${twinOld.plain} -> ${twinOld.twin}`);
assert.equal(twinOld.pickedOther, twinOld.plain, 'a picked keystone of another ascendancy stays off');

// 우주계 쌍둥이 주얼은 지금 직업이 고를 수 있는 전직 셋의 키스톤만 준다.
const twinPool = json(`(() => { const seen = new Set(); let s = 1; Math.random = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 400; i++) seen.add(getAscendKeystoneOwnerClass(pickRandomAscendKeystoneId('archer'))); Math.random = () => 0.37; return [...seen].sort(); })()`);
assert.deepEqual(twinPool, ['hunter', 'ranger', 'stormarcher']);

// 저장 경계: 모르는 전직은 비우고 노드 · 키스톤 포인트를 돌려준다. 재능 개화 단계 5는 남고, 없는 카드 조합은 버린다.
const loaded = json(`(() => {
    const save = mergeDefaults({ heroSelectionInitialized: true, selectedClassId: 'archer', ascendClass: 'templar', ascendNodes: ['n1', 'n2'], ascendKeystones: ['t1'],
        ascendPoints: 1, ascendKeystonePoints: 0, ascendRank: 5, completedTrials: ['trial_1'],
        talentCards: { hero1__ranger: { score: 3, level: 2, count: 1 }, hero1__templar: { score: 1, level: 1, count: 1 } },
        talentCardLoadout: ['hero1__ranger', 'hero1__templar', null, null, null, null] });
    return { ascendClass: save.ascendClass, nodes: save.ascendNodes, keystones: save.ascendKeystones, points: save.ascendPoints, kp: save.ascendKeystonePoints,
        rank: save.ascendRank, cards: Object.keys(save.talentCards), loadout: save.talentCardLoadout.slice(0, 2),
        first: JSON.stringify([save.ascendClass, save.ascendPoints, save.ascendKeystonePoints, save.talentCards, save.talentCardLoadout]),
        again: (again => JSON.stringify([again.ascendClass, again.ascendPoints, again.ascendKeystonePoints, again.talentCards, again.talentCardLoadout]))(mergeDefaults(JSON.parse(JSON.stringify(save)))) };
})()`);
assert.equal(loaded.ascendClass, '');
assert.deepEqual([loaded.nodes, loaded.keystones], [[], []]);
assert.equal(loaded.points, 3, 'two node points come back');
assert.ok(loaded.kp >= 1, 'the keystone point comes back');
assert.equal(loaded.rank, 5, 'a bloomed rank survives loading');
assert.deepEqual(loaded.cards, ['hero1__ranger']);
assert.deepEqual(loaded.loadout, ['hero1__ranger', null]);
assert.equal(loaded.again, loaded.first, 'loading twice gives the same ascendancy and cards (no second refund)');

// 재능 개화 카드(2026-10-02 재능 정리): 전직마다 한 장, 그 전직이 속한 직업의 대표 재능 × 전직. 18장, 이름이 저마다 다르다.
const bloomKeys = json('getTalentBloomCardKeys()');
assert.equal(bloomKeys.length, 18);
assert.equal(run('TALENT_BLOOM_TOTAL_CARDS'), 18);
for (const [cls, ascs] of Object.entries(byClass)) {
    const hero = run(`PLAYER_CLASS_DEFS['${cls}'].recommendedTalentHeroId`);
    for (const asc of ascs) assert.equal(run(`getTalentBloomCardKeyForAscendancy('${asc}')`), `${hero}__${asc}`, `${asc}: the class talent's card`);
}
const cardDefs = json('TALENT_BLOOM_CARD_DEFS');
const cardRules = json('TALENT_PRECISE_CARD_RULES');
assert.equal(new Set(bloomKeys.map(id => cardDefs[id].name)).size, 18, 'every card has its own name');
assert.deepEqual(cardRules.hero10__grovewarden, { mechanic: 'statCard', stats: { dotPctDmg: 25, coldPctDmg: 30 }, uniques: [{ key: 'poisonDamageMorePct', params: { pct: 15 } }] });
const strayNew = Object.keys(cardDefs).filter(id => NEW_SIX.includes(id.split('__')[1]) && !bloomKeys.includes(id));
assert.deepEqual(strayNew, [], 'a new ascendancy has only its class talent card');

// 저장(2026-10-02 재능 정리): 한 전직의 카드는 그 전직의 카드 하나로 합친다(레벨, 점수는 큰 쪽, 개화 횟수는 더함). 장착 칸과
// 개화 기록도 옮기고 겹치면 하나만, 이번 루프의 개화 재능은 직업 재능으로. 두 번 불러와도 같다.
const folded = json(`(() => {
    const save = mergeDefaults({ heroSelectionInitialized: true, selectedClassId: 'warrior', ascendClass: 'warrior', bloomedClassThisLoop: 'warrior', bloomedTalentThisLoop: 'hero3',
        talentCards: { hero3__warrior: { score: 80, level: 4, count: 2 }, hero2__warrior: { score: 20, level: 2, count: 1 }, hero7__berserker: { score: 125, level: 5, count: 1 } },
        talentCardLoadout: ['hero3__warrior', 'hero2__warrior', 'hero7__berserker', null, null, null], talentBloomCombos: ['hero3__warrior', 'hero2__warrior'] });
    const again = mergeDefaults(JSON.parse(JSON.stringify(save)));
    const pick = state => JSON.stringify([state.talentCards, state.talentCardLoadout, state.talentBloomCombos, state.bloomedTalentThisLoop]);
    return { cards: save.talentCards, loadout: save.talentCardLoadout, combos: save.talentBloomCombos, talent: save.bloomedTalentThisLoop, same: pick(again) === pick(save) };
})()`);
assert.deepEqual(folded.cards, { hero2__warrior: { score: 80, level: 4, count: 3 }, hero2__berserker: { score: 125, level: 5, count: 1 } });
assert.deepEqual(folded.loadout, ['hero2__warrior', null, 'hero2__berserker', null, null, null]);
assert.deepEqual(folded.combos, ['hero2__warrior']);
assert.equal(folded.talent, 'hero2', 'the loop bloom talent becomes the class talent (n13a, n13b)');
assert.equal(folded.same, true, 'loading twice folds nothing more');

// 새 전직 여섯의 카드: 고유 효과 하나는 엔진이 알고 화면 라벨이 있는 키다. 카드는 고유 효과 목록 맨 뒤에 들어가므로 합산,
// 큰 값, 켜고 끄는 키만 쓴다.
const COMPOSABLE = new Set(['projectileDoubleStrikePct', 'projectileTargetBonus', 'hitShockedEnemyDamageMorePct', 'warcryResonanceBelt',
    'dsAndTargetAnyBonus', 'cosmosSpeedBurst', 'genericTakenDamageReducePct', 'underdogNonMaxRollMorePct', 'cosmosSustain', 'realmAllMaxRes',
    'cosmosPenetration', 'igniteDamageMorePct', 'overkillSplash', 'uniqueMinDmgRoll', 'uniqueDeflectDamageReduce', 'uniqueBlockChance',
    'uniqueTakenReduceWhen2Enemies', 'chaosTakenDamageReducePct', 'overhealCapPct', 'uniqueTakenReduceWhen1Enemy', 'instakillNormalOnHitPct',
    'summonEfficiencyBonus', 'summonCapBonus', 'lifePctAsEnergyShield', 'immuneIgnite', 'cosmosFinalDmg', 'instantLeechAndDoubleDamage',
    'poisonDamageMorePct', 'realmPoisonDuration']);
const labelled = new Set(json('Object.keys(TALENT_UNIQ_LABELS)'));
const newCards = bloomKeys.filter(id => NEW_SIX.includes(id.split('__')[1]));
assert.equal(newCards.length, 6);
for (const id of newCards) {
    const uniques = cardRules[id].uniques || [];
    assert.equal(uniques.length, 1, `${id}: one unique effect`);
    checkUniqueLine(id, uniques[0]);
    assert.ok(labelled.has(uniques[0].key), `${id}: ${uniques[0].key} has a card label`);
    assert.ok(COMPOSABLE.has(uniques[0].key), `${id}: ${uniques[0].key} sums, takes the larger value or is on/off`);
    assert.ok(!/[·]/.test(cardDefs[id].surface.desc), `${id}: no middle dot in the card text`);
}

// 실제 루프 초기화도 전직 노드를 비우기 전에 기억한다(PR #1030 리뷰: 노드를 먼저 비워서 키스톤만 기억했다).
const resetPlan = json(`(() => {
    showGameToast = () => {};
    game = mergeDefaults({ heroSelectionInitialized: true, selectedHeroId: 'hero2', selectedClassId: 'warrior', season: 5, level: 60 }); window.game = game;
    game.ascendClass = 'berserker'; game.ascendNodes = ['n1', 'n2', 'n3']; game.ascendKeystones = ['bz1'];
    triggerSeasonReset('chaos');
    return game.lastLoopAscendPlan;
})()`);
assert.deepEqual(resetPlan, { ascendClass: 'berserker', nodes: ['n1', 'n2', 'n3'], keystones: ['bz1'] }, 'the loop reset remembers nodes and keystones');
// 지난 루프처럼: 루프 초기화가 전직 배치를 기억하고, 같은 직업이면 고르기 화면이 그 전직을 내놓고 포인트만큼 같은 순서로 다시 산다.
const plan = json(`(() => {
    game = mergeDefaults({ heroSelectionInitialized: true, selectedHeroId: 'hero2', selectedClassId: 'warrior' }); window.game = game;
    game.ascendClass = 'berserker'; game.ascendNodes = ['n1', 'n2', 'n3', 'n4']; game.ascendKeystones = ['bz2', 'bz1'];
    const cleared = rememberLoopAscendancyPlan(game);
    const remembered = JSON.parse(JSON.stringify(game.lastLoopAscendPlan));
    game.ascendClass = ''; game.ascendNodes = []; game.ascendKeystones = [];
    rememberLoopAscendancyPlan(game);
    const kept = game.lastLoopAscendPlan.ascendClass;
    const offered = renderLastLoopPlanCard().includes('지난 루프처럼: 버서커');
    game.ascendClass = 'berserker'; game.ascendPoints = 3; game.ascendKeystonePoints = 1;
    const placed = allocateLastLoopAscendPlan(game.lastLoopAscendPlan);
    const first = { nodes: game.ascendNodes.slice(), keystones: game.ascendKeystones.slice(), button: getAscendancyPlanContinueHtml() };
    game.ascendPoints = 2; game.ascendKeystonePoints = 1;
    const offerMore = getAscendancyPlanContinueHtml().includes('이어 하기');
    allocateLastLoopAscendPlan(game.lastLoopAscendPlan);
    const second = { nodes: game.ascendNodes.slice(), keystones: game.ascendKeystones.slice(), points: game.ascendPoints, button: getAscendancyPlanContinueHtml() };
    game.selectedClassId = 'archer'; game.ascendClass = '';
    const otherClass = renderLastLoopPlanCard().includes('지난 루프처럼');
    const saved = mergeDefaults({ heroSelectionInitialized: true, selectedClassId: 'warrior', lastLoopAscendPlan: { ascendClass: 'berserker', nodes: ['n1', 'x9', 'n13d', 'n1'], keystones: ['bz1', 'w8', 'bz9'] } }).lastLoopAscendPlan;
    const unknown = mergeDefaults({ heroSelectionInitialized: true, lastLoopAscendPlan: { ascendClass: 'templar', nodes: ['n1'], keystones: [] } }).lastLoopAscendPlan;
    return { cleared, remembered, kept, offered, placed, first, offerMore, second, otherClass, saved, unknown };
})()`);
assert.deepEqual(plan.cleared, ['bz2', 'bz1'], 'the loop reset still gets the keystones to clear');
assert.deepEqual(plan.remembered, { ascendClass: 'berserker', nodes: ['n1', 'n2', 'n3', 'n4'], keystones: ['bz2', 'bz1'] });
assert.equal(plan.kept, 'berserker', 'a loop without an ascendancy keeps the older plan');
assert.ok(plan.offered, 'the pick screen offers the remembered ascendancy of the same class');
assert.deepEqual([plan.first.nodes, plan.first.keystones, plan.placed], [['n1', 'n2', 'n3'], ['bz2'], 4], 'the remembered order, as far as points last');
assert.equal(plan.first.button, '', 'no continue button without points');
assert.ok(plan.offerMore, 'more points from a later trial bring the continue button');
assert.deepEqual([plan.second.nodes, plan.second.keystones, plan.second.points], [['n1', 'n2', 'n3', 'n4'], ['bz2', 'bz1'], 1]);
assert.equal(plan.second.button, '', 'nothing left in the plan, no button');
assert.equal(plan.otherClass, false, 'another class does not see the plan');
assert.deepEqual(plan.saved, { ascendClass: 'berserker', nodes: ['n1', 'n13d'], keystones: ['bz1', 'bz9'] }, 'loading keeps only node ids and this ascendancy\'s keystones');
assert.equal(plan.unknown, null, 'an unknown ascendancy plan is dropped');
assert.ok(fs.readFileSync('js/combat.js', 'utf8').includes('let clearedAscendKeystones = rememberLoopAscendancyPlan(game);'), 'the loop reset remembers the plan');

console.log('ascendancies: 6 classes x 3, keystones, old node values, stat and unique keystones (picked and twin), merged unique values, twin stats before a pick, off-hand needs w3, pick card nodes, twin pool, save boundary, 18 bloom cards (class talent x ascendancy) and the save fold, last-loop plan: OK');
