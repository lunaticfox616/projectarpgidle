// 위습 정령 소환 6종 (스킬 변경분 2, data/wisp-summons.js · js/wisp-summons.js · js/canvas-wisp-summon-fx.js): the gems and
// their sheets, the flight time the combat and the art share, thrown attacks that hit when they land, the spectral wisp's
// element per attack, in-flight attacks across a combat snapshot, the save migration from the animal summons, and the art.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { runtime: r, run } = require('./lib/replay-fixture')(54);
r.atob = text => Buffer.from(text, 'base64').toString('binary'); // the remake pass decodes its palette with it
const json = code => JSON.parse(run('JSON.stringify(' + code + ')'));
const WISPS = ['화염 위습 소환', '냉기 위습 소환', '번개 위습 소환', '물리 위습 소환', '카오스 위습 소환', '분광 위습 소환'];
const ANIMALS = ['서리늑대 소환', '불곰 소환', '벼락멧돼지 소환', '칼날까마귀 소환', '공허 유충 소환', '벌떼 소환', '폭풍 정령 소환', '철갑 거북 소환'];
const pngSize = file => { const b = fs.readFileSync(file); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

// ---------------------------------------------------------------- the gems
assert.deepEqual(json("Object.keys(SKILL_DB).filter(n => (SKILL_DB[n].tags || []).includes('summon_attack'))").sort(), [...WISPS].sort(),
    'the six wisps are the attack summon gems');
r.animals = ANIMALS;
assert.deepEqual(json('animals.filter(n => SKILL_DB[n] || SKILL_GEM_VFX_PROFILES[n] || SKILL_GEM_ART_PATHS[n] || SKILL_GRID_DB[n])'), [],
    'no animal summon gem is left');
assert.deepEqual(json('Object.keys(LEGACY_SUMMON_GEM_TO_WISP)').sort(), [...ANIMALS].sort(), 'every animal has a wisp to become');
for (const name of WISPS) {
    r.gem = name;
    const row = json('({ spec: WISP_SUMMONS[gem], profile: getSummonProfile(gem), grid: SKILL_GRID_DB[gem], art: SKILL_GEM_ART_PATHS[gem], vfx: SKILL_GEM_VFX_PROFILES[gem] })');
    assert.equal(row.profile.role, 'attack', `${name}: an attack summon`);
    assert.equal(row.profile.gridRange, row.grid.range, `${name}: the grid range the card shows is the one it attacks from`);
    assert.deepEqual(pngSize(row.art), [32, 32], `${name}: a 32-dot gem portrait`);
    assert.equal(row.vfx.impactVfx, false, `${name}: the wisp art owns the impact (no generic summon strike on top)`);
    for (const motion of ['idle', 'attack']) {
        assert.deepEqual(pngSize(`assets/summon/wisp/${row.spec.slug}_${motion}.png`), [64, 16], `${name}: four 16×16 ${motion} frames`);
    }
}
assert.deepEqual(json("[getSummonProfile('화염 위습 소환').gridRange, getSummonProfile('번개 위습 소환').gridRange]"), [4, 3], 'ranges from the handoff (4/4/3/3/4/4)');
assert.equal(json('LOOP_STARTER_GEM_BY_HERO.hero7'), '물리 위습 소환', 'the summoner starts with the physical wisp');

// ---------------------------------------------------------------- one flight time for the combat and the art
const timing = json(`(() => {
    const out = [];
    for (const name of Object.keys(WISP_SUMMONS)) for (const [dx, dy] of [[1, 0], [3, 0], [2, 2], [0, -4], [-3, 1]]) {
        const from = { gx: 5, gy: 5 }, to = { gx: 5 + dx, gy: 5 + dy };
        const art = redrawnSkillArtMoves.WispAttack.timing(WISP_SUMMONS[name].art, { x: from.gx * 16 + 8, y: from.gy * 16 + 8 }, { x: to.gx * 16 + 8, y: to.gy * 16 + 7 });
        const fly = wispSummons.flightMs(name, from, to);
        out.push({ name, fly, artFly: art.fly, ms: wispSummons.artMs(name, fly), artEnd: art.end });
    }
    return out;
})()`);
for (const row of timing) {
    assert.ok(Math.abs(row.fly - row.artFly) < 1e-9, `${row.name}: the hit lands when the art's projectile does (${row.fly} vs ${row.artFly})`);
    assert.ok(Math.abs(row.ms - row.artEnd) < 1e-9, `${row.name}: the strike effect lives as long as its art`);
}
assert.ok(timing.filter(row => /번개|분광/.test(row.name)).every(row => row.fly === 0), 'beams (lightning, spectral) hit at once');
assert.equal(json("wispSummons.flightMs('화염 위습 소환', { gx: 1 }, { gx: 3, gy: 2 })"), 0, 'without both cells the attack cannot fly: it hits at once');

// ---------------------------------------------------------------- thrown attacks hit when they land
run(`Math.random = () => .5;
  globalThis.struck = [];
  const resolveOwn = resolveSummonHit;
  resolveSummonHit = (summon, pStats, target, first) => { struck.push({ at: getCombatTime(), ele: summon.ele, target: target.id, first }); return resolveOwn(summon, pStats, target, first); };`);
function arena(gem, enemyAt, wispAt = { gx: 2, gy: 4 }) {
    Object.assign(r, { arenaGem: gem, arenaEnemy: enemyAt, arenaWisp: wispAt });
    run(`game.skills = ['기본 공격', arenaGem]; game.gemData[arenaGem] = { level: 5, exp: 0, quality: 0 };
      game.equippedSummonSkills = [arenaGem]; game.summonSkillCounts = { [arenaGem]: 1 }; game.summons = [];
      game.combatTimeMs = 200000; game.combatHalted = false; resetCombatTacticsRuntime();
      game.gridPlayer = { gx: 1, gy: 1, gridMoveTimer: 0 };
      game.enemies = [Object.assign(createEnemy(getZone(1), { at: 0 }, 0), { id: 9300, hp: 1e7, maxHp: 1e7, energyShield: 0, evasion: 0, evasionChance: 0, ...arenaEnemy })];
      globalThis.arenaStats = getPlayerStats(false); ensureSummonRuntime(arenaStats);
      Object.assign(game.summons[0], { ...arenaWisp, nextAttackAt: getCombatTime() });
      struck.length = 0;`);
}
/** Ticks the summon attack every 100ms (like the combat loop) and reports when the target first lost life. */
function tick(ms) {
    const hits = [];
    for (let t = 0; t <= ms; t += 100) {
        r.at = t;
        run('game.combatTimeMs = 200000 + at; runSummonAttackTick(arenaStats);');
        if (json('game.enemies[0].hp < game.enemies[0].maxHp') && !hits.length) hits.push(t);
    }
    return { firstHurtAt: hits[0] ?? null, struck: json('struck') };
}
arena('화염 위습 소환', { gx: 5, gy: 4 });
const fire = json("wispSummons.flightMs('화염 위습 소환', { gx: 2, gy: 4 }, { gx: 5, gy: 4 })");
let played = tick(900);
assert.equal(played.struck[0].at, 200000 + Math.ceil(fire / 100) * 100, `화염 위습: the fireball (${Math.round(fire)}ms) hits on the first tick after it lands`);
assert.equal(played.firstHurtAt, Math.ceil(fire / 100) * 100, 'and only then does the target lose life');
assert.equal(played.struck[0].ele, 'fire');

arena('번개 위습 소환', { gx: 5, gy: 4 });
played = tick(0);
assert.deepEqual([played.firstHurtAt, played.struck.length], [0, 1], '번개 위습: the bolt hits the moment the strike frame fires');

arena('분광 위습 소환', { gx: 5, gy: 4 });
const rolled = json('[0.1, 0.5, 0.9].map(v => { Math.random = () => v; return wispSummons.launch(game.summons[0], game.enemies, 0).now[0].element; })');
run('Math.random = () => .5;');
assert.deepEqual(rolled, ['fire', 'cold', 'light'], '분광 위습: each attack rolls fire, cold or lightning');
played = tick(3000);
assert.ok(played.struck.length >= 3 && played.struck.every(hit => hit.ele === 'cold'), 'the hit resolves with the rolled element (0.5 → cold), not the wisp\'s own');
assert.equal(json('game.summons[0].ele'), 'light', 'and the wisp keeps its own element between attacks');

// ---------------------------------------------------------------- in flight: dropped with the target or the wisp, kept in a snapshot
arena('냉기 위습 소환', { gx: 6, gy: 4 });
run('game.combatTimeMs = 200000; runSummonAttackTick(arenaStats);');
const snapshot = json('captureCombatRuntime().wispSummons');
assert.equal(snapshot.length, 1, 'the ice shard is in flight');
run('game.enemies[0].hp = 0; game.combatTimeMs = 201000; runSummonAttackTick(arenaStats);');
assert.equal(json('struck.length'), 0, 'a target that died meanwhile is not struck');
arena('냉기 위습 소환', { gx: 6, gy: 4 });
run('game.combatTimeMs = 200000; runSummonAttackTick(arenaStats); game.summons[0].alive = false; game.combatTimeMs = 201000; runSummonAttackTick(arenaStats);');
assert.equal(json('struck.length'), 0, 'nor by a wisp that fell before its shard landed');
arena('냉기 위습 소환', { gx: 6, gy: 4 });
r.saved = snapshot;
run(`const snap = captureCombatRuntime(); snap.wispSummons = saved; restoreCombatRuntime(snap);
  game.summons[0].id = saved[0].summonId; game.enemies[0].id = saved[0].enemyId; game.combatTimeMs = 201000; landSummonAttacks(arenaStats, getCombatTime());`);
assert.equal(json('struck.length'), 1, 'a restored combat snapshot still lands the shard it had in flight');
run('game.combatTimeMs = 200000; runSummonAttackTick(arenaStats); resetCombatTacticsRuntime();');
assert.deepEqual(json('wispSummons.capture()'), [], 'a combat reset clears what was in flight');
run('resolveSummonHit = resolveOwn;');

// ---------------------------------------------------------------- saves from before the wisps
r.engraving = json('Object.keys(GEM_SKY_ENHANCEMENTS)[0]');
r.saveIn = {
    level: 30, skills: ['연속 베기', '불곰 소환', '벌떼 소환', '공허 유충 소환'], sealedSkills: ['서리늑대 소환'], activeSkill: '연속 베기',
    equippedSummonSkills: ['벌떼 소환', '공허 유충 소환'], summonSkillCounts: { '벌떼 소환': 2, '공허 유충 소환': 1 }, summonLoadoutInitialized: true,
    gemData: { '벌떼 소환': { level: 7, exp: 10, awakened: true }, '공허 유충 소환': { level: 9, exp: 0 }, '불곰 소환': { level: 3, exp: 0 } },
    skyGemEnhancements: { '벌떼 소환': [r.engraving, null, null, null, null] }, skyTower: { gemBoosts: { '벌떼 소환': 2, '공허 유충 소환': 3 } },
    gemEnhanceTargetSkill: '벌떼 소환', blackMarket: { offers: [{ type: 'skillGem', name: '칼날까마귀 소환', price: 5 }] },
    settings: { summonArtStyle: 'dark' }
};
const migrated = json(`(() => {
    const view = m => ({ skills: m.skills, sealed: m.sealedSkills, equipped: m.equippedSummonSkills, counts: m.summonSkillCounts,
        gem: m.gemData['카오스 위습 소환'], fire: m.gemData['화염 위습 소환'].level, engraved: m.skyGemEnhancements['카오스 위습 소환'],
        boosts: m.skyTower.gemBoosts, target: m.gemEnhanceTargetSkill, offer: m.blackMarket.offers[0].name, style: m.settings.summonArtStyle ?? null,
        leftovers: Object.keys(m.gemData).filter(n => LEGACY_SUMMON_GEM_TO_WISP[n]) });
    const m = mergeDefaults(saveIn), again = mergeDefaults(JSON.parse(serializeSaveState(m)));
    return { first: view(m), again: view(again) };
})()`);
const first = migrated.first;
assert.deepEqual(first.skills, ['기본 공격', '연속 베기', '화염 위습 소환', '카오스 위습 소환'].filter(n => first.skills.includes(n)), 'owned animals become their wisps');
assert.ok(first.skills.includes('화염 위습 소환') && first.skills.includes('카오스 위습 소환') && !first.skills.includes('벌떼 소환'));
assert.deepEqual(first.sealed, ['냉기 위습 소환'], 'sealed gems too');
assert.deepEqual([first.equipped, first.counts], [['카오스 위습 소환'], { '카오스 위습 소환': 3 }], 'two equipped animals of one element become one wisp summoned three times');
assert.deepEqual([first.gem.level, first.gem.awakened], [9, true], 'the wisp keeps the more grown record, awakened if either was');
assert.equal(first.fire, 3);
assert.equal(first.engraved[0], r.engraving, 'engravings survive the merge');
assert.deepEqual(first.boosts, { '카오스 위습 소환': 3 }, 'sky tower boosts keep the larger level');
assert.deepEqual([first.target, first.offer, first.style], ['카오스 위습 소환', '물리 위습 소환', null], 'the enhance target and black market offer follow; the animal look setting goes');
assert.deepEqual(first.leftovers, [], 'no animal record is left behind');
assert.deepEqual(migrated.again, first, 'loading the migrated save again changes nothing');

r.support = json("Object.keys(SUPPORT_GEM_DB)[0]");
const loot = json(`(() => {
    const save = { actExploration: { loot: { gems: [{ kind: 'attack', name: '벌떼 소환', awakened: false }, { kind: 'support', name: support, tier: 1 },
        { kind: 'attack', name: '공허 유충 소환', awakened: true }] } } };
    migrateLegacySummonGemSave(save);
    gemDropRewards.validate(save.actExploration.loot.gems);
    return save.actExploration.loot.gems;
})()`);
assert.deepEqual(loot, [{ kind: 'attack', name: '카오스 위습 소환', awakened: true }, { kind: 'support', name: r.support, tier: 1 }],
    'pending exploration loot folds into one valid row per wisp (two rows of one gem would reject the save)');
assert.doesNotThrow(() => run('migrateLegacySummonGemSave({}); migrateLegacySummonGemSave({ gemData: null, skyTower: {}, blackMarket: { offers: [null] } });'),
    'missing or odd fields are left alone');

// ---------------------------------------------------------------- the art, in the remake pass
const paint = json(`(() => {
    game.settings = game.settings || {}; game.settings.skillFxStyle = 'remake';
    const pts = [];
    const ctx = { setTransform() {}, fillRect(x, y) { pts.push([x, y]); }, clearRect() {}, drawImage() {}, save() {}, restore() {} };
    document.createElement = () => ({ width: 0, height: 0, getContext: () => ctx });
    const target = { canvas: { dataset: {}, clientWidth: 432, clientHeight: 384, width: 432, height: 384 }, getTransform() { return {}; } };
    const projection = { tileW: 48, tileH: 48, actorGroundOffsetY: 0, cellToScreen: (gx, gy) => ({ x: 24 + gx * 48, y: 24 + gy * 48 }) };
    const dots = (layer, now) => { pts.length = 0; fxRemake.begin(target, projection); wispSummonFx.drawLayer(layer, now); fxRemake.discard(); return pts.length; };
    const strike = gemName => { battleFx.length = 0; battleFx.push({ type: 'summonAttack', gemName, start: 1000, duration: 2000, summonId: 1, sourceGx: 1, sourceGy: 3, targetGx: 5, targetGy: 3 }); };
    const fly = wispSummons.flightMs('카오스 위습 소환', { gx: 1, gy: 3 }, { gx: 5, gy: 3 });
    strike('카오스 위습 소환');
    const chaos = { before: dots('fore', 990), orb: dots('fore', 1100), mistEarly: dots('ground', 1000 + fly - 20), mist: dots('ground', 1000 + fly + 200) };
    strike('번개 위습 소환');
    const light = { bolt: dots('fore', 1100), ground: dots('ground', 1100), gone: dots('fore', 1700) };
    battleFx.length = 0; battleFx.push({ type: 'summonAttack', gemName: '화염 위습 소환', start: 1000, duration: 2000, summonId: 1, targetGx: 5, targetGy: 3 });
    const noCell = dots('fore', 1100);
    game.settings.skillFxStyle = 'original';
    strike('번개 위습 소환');
    const original = dots('fore', 1100);
    game.settings.skillFxStyle = 'remake'; battleFx.length = 0;
    return { chaos, light, noCell, original };
})()`);
assert.equal(paint.chaos.before, 0, 'nothing before the strike frame');
assert.ok(paint.chaos.orb > 0, 'the void orb flies on the front layer');
assert.equal(paint.chaos.mistEarly, 0, 'the chaos mist waits for the orb to land');
assert.ok(paint.chaos.mist > 0, 'then settles on the ground layer');
assert.ok(paint.light.bolt > 0 && paint.light.ground === 0, 'the lightning wisp draws only on the front layer');
assert.equal(paint.light.gone, 0, 'and its bolts are gone once the attack ends');
assert.equal(paint.noCell, 0, 'a strike from a wisp that had no cell yet draws nothing');
assert.equal(paint.original, 0, 'the "original" effect style has no wisp art (the gems are new)');

console.log('wisp summons smoke passed');
