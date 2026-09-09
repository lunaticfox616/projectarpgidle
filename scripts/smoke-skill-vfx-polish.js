const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const read = code => vm.runInContext(code, runtime);
const calls = [];
const stack = [];
const state = { globalAlpha: 1 };
const ctx = new Proxy(state, {
    get(object, key) {
        if (key in object) return object[key];
        return (...args) => {
            for (const value of args) {
                if (typeof value === 'number') assert(Number.isFinite(value), `${key}: finite geometry required`);
            }
            calls.push({ key, args, alpha: object.globalAlpha });
            if (key === 'save') stack.push({ ...object });
            if (key === 'restore') Object.assign(object, stack.pop());
        };
    }
});
read(`Object.values(SKILL_GEM_VFX_IMAGE_KEYS).forEach(key => {
    battleAssets.images[key] = { complete: true, naturalWidth: 512, naturalHeight: 512 };
});`);
const before = read('JSON.stringify(game)');
read('battleAssets.images.skillFxWorldTree={complete:true,naturalWidth:1024,naturalHeight:1728};');
const source = { x: 100, y: 180 };
const target = { x: 180, y: 180 };
const profiles = read('SKILL_GEM_VFX_PROFILES');
for (const [name, profile] of Object.entries(profiles)) {
    runtime.worldTreeSkillFx.beginFrame();
    read('battleVisualState.skillEffects = []');
    calls.length = 0;
    runtime.queueSkillGemVfx({ id: 1, skillName: name, element: 'cold',
        stageKind: profile.family === 'chain' ? 'chainPrimary' : 'primary' }, target, source, {}, 1000, 1);
    runtime.drawSkillGemVfxLayer(ctx, 999);
    assert.strictEqual(calls.length, 0, `${name}: no pre-hit impact`);
    runtime.drawSkillGemVfxLayer(ctx, 1070);
    if (profile.impactVfx !== false) {
        assert(calls.some(call => ['drawImage', 'stroke', 'fill'].includes(call.key)), `${name}: visible impact`);
    }
    if (['iai', 'stormStrike', 'charge'].includes(profile.family)) {
        assert(calls.some(call => call.key === 'drawImage' && call.args[0] === read('battleAssets.images.skillFxWorldTree')),
            `${name}: the supplied skill art must replace procedural geometry`);
    }
    calls.length = 0;
    runtime.drawSkillGemVfxLayer(ctx, 3000);
    assert.strictEqual(calls.length, 0, `${name}: expired effects stop drawing`);
    assert.strictEqual(stack.length, 0, `${name}: canvas state restored`);
}

for (const name of ['방패 투척', '원소 포션 투척']) {
    calls.length = 0;
    runtime.drawCombatMovingFx(ctx, { owner: 'player', skillName: name, delivery: 'projectileTarget' },
        1100, 1000, 1200, source, [target], 'skillFxProjectile', 'fire');
    assert(!calls.some(call => call.key === 'drawImage'), `${name}: equipment silhouette must replace generic projectile`);
    assert(calls.some(call => call.key === 'stroke'), `${name}: silhouette remains visible with assets loaded`);
}

calls.length = 0;
runtime.queueSkillGemVfx({ id: 5, skillName: '기본 공격', element: 'phys' }, target, source, {}, 4000, 1);
runtime.drawSkillGemVfxLayer(ctx, 4020);
const contact = calls.find(call => call.key === 'drawImage');
assert(contact && contact.alpha > 0.6, 'ordinary melee must reach readable opacity within 20ms');
assert(contact.args[7] >= 80 && contact.args[7] <= 110, 'basic melee keeps a readable, compact trail instead of an oversized skill sweep');
calls.length = 0;
runtime.drawCombatCellFx(ctx, { owner: 'player', skillName: '화염 폭풍핵', patternKind: 'field', start: 1000, duration: 1000 },
    2000, 1200, [target], 'skillFxDotField', 'fire');
assert(calls.filter(call => call.key === 'drawImage').every(call => call.alpha === 0), 'fields must fade fully at expiry');
assert.strictEqual(read('JSON.stringify(game)'), before, 'VFX must not mutate combat, saves or progression');
assert.strictEqual(stack.length, 0, 'no leaked canvas state');
// Real multi-hit resolution must not multiply three confirmed hits into nine arcs.
const fixture = require('./lib/replay-fixture')();
fixture.run(`game.activeSkill = '뇌격 삼연타';
    game.enemies = [createEnemy(getZone(1), { at: 20, count: 1 }, 0)];
    game.enemies[0].hp = 100000; game.enemies[0].maxHp = 100000; battleFx = [];`);
const stats = fixture.runtime.getPlayerStats();
stats.sSkill = { ...stats.sSkill, ...fixture.run('SKILL_DB["뇌격 삼연타"]') };
fixture.runtime.performPlayerAttack(stats, { stageReplay: true, skillName: '뇌격 삼연타', forcedCrit: false,
    damageTextGroupId:'polish-triple:0',targetEntries: [{ enemyId: fixture.run('game.enemies[0].id'), mult: 1 }] });
const hits = fixture.run('battleFx.filter(fx => fx.type === "hit")');
assert.strictEqual(hits.length, 3, 'the skill must retain its three real damage resolutions');
hits.forEach(hit => fixture.runtime.queueSkillGemVfx(hit, target, source, {}, 1000, 1));
assert.strictEqual(fixture.run('battleVisualState.skillEffects.filter(fx=>fx.family!=="hitSpark").length'), 1, 'native same-stage repeats share their main effect');
assert.strictEqual(fixture.run('battleVisualState.skillEffects.filter(fx=>fx.family==="hitSpark").length'), 0, 'confirmed hits keep damage feedback without replaying three extra skill images');
console.log(`smoke-skill-vfx-polish passed: ${Object.keys(profiles).length} profiles and loaded-asset routing`);
