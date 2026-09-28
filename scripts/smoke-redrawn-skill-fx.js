// Redrawn skill effects (js/canvas-redrawn-skill-fx.js): which native events each redrawn gem takes over,
// how one attack's events are grouped into a single cast, and the character cues read from those casts.
// Rendering only — these checks never touch combat state.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();
runtime.atob = text => Buffer.from(text, 'base64').toString('binary');
const run = code => vm.runInContext(code, runtime);
const plain = value => JSON.parse(JSON.stringify(value));

run(`game.settings = game.settings || {}; game.settings.skillFxStyle = 'remake';`);
assert.strictEqual(run('fxRemake.isEnabled()'), true, 'the remake pass is on once the palette decodes');

// ---------------------------------------------------------------- which events a redrawn gem owns
const claims = plain(run(`(function () {
    const nameOf = id => Object.keys(SKILL_FX_ATLAS).find(name => SKILL_FX_ATLAS[name].id === id);
    const out = {};
    for (const id of redrawnSkillFx.ids) {
        const skillName = nameOf(id), spec = SKILL_FX_ATLAS[skillName];
        out[id] = {};
        for (const kind of ['windup', 'travel', 'stage', 'hit']) {
            redrawnSkillFx.reset();
            out[id][kind] = redrawnSkillFx.claim({ kind, skillName, at: 1000, duration: 200, groupId: 'g' + id }, spec);
        }
        redrawnSkillFx.reset();
        out[id].mist = redrawnSkillFx.claim({ kind: 'stage', skillName, at: 1000, duration: 200, holyMistPhase: 'mist' }, spec);
    }
    return out;
})()`));
assert.strictEqual(Object.keys(claims).length, 17, 'seventeen gems are redrawn');
for (const [id, got] of Object.entries(claims)) {
    const n = Number(id);
    if (n === 50) {
        assert.deepStrictEqual([got.stage, got.hit, got.mist], [false, false, true], '50 신성한 안개 replaces only the mist stage');
        continue;
    }
    if (n === 21) assert.deepStrictEqual([got.travel, got.stage, got.hit], [true, false, true], '21 서리 파동 replaces its travel and hits');
    else if (n === 51) assert.deepStrictEqual([got.stage, got.hit], [true, false], '51 파문심판 replaces the censer stage only');
    else assert.strictEqual(got.stage && got.hit, true, `${id}: stage and hit sprites belong to the redrawn art`);
    if ([3, 33].includes(n)) assert.strictEqual(got.windup, true, `${id}: the redrawn art owns the windup`);
}

const nonRedrawn = run(`redrawnSkillFx.claim({ kind: 'stage', skillName: '연속 베기', at: 0, duration: 100 }, SKILL_FX_ATLAS['연속 베기'])`);
assert.strictEqual(nonRedrawn, false, 'gems that were not redrawn keep their native sprites');

run(`game.settings.skillFxStyle = 'original'; redrawnSkillFx.reset();`);
assert.strictEqual(run(`redrawnSkillFx.claim({ kind: 'stage', skillName: '서리 폭발', at: 0, duration: 100 }, SKILL_FX_ATLAS['서리 폭발'])`), false,
    'the "original" effect style turns every redrawn gem back into its native sprites');
run(`game.settings.skillFxStyle = 'remake';`);

// ---------------------------------------------------------------- one attack = one cast
const casts = plain(run(`(function () {
    const spec = SKILL_FX_ATLAS['서리 폭발'], skillName = '서리 폭발';
    redrawnSkillFx.reset();
    redrawnSkillFx.claim({ kind: 'stage', skillName, at: 1000, duration: 300, groupId: '12:0' }, spec);
    redrawnSkillFx.claim({ kind: 'hit', skillName, at: 1040, duration: 320, groupId: '12:1' }, spec);
    redrawnSkillFx.claim({ kind: 'hit', skillName, at: 1060, duration: 320, groupId: '12:1' }, spec);
    redrawnSkillFx.claim({ kind: 'stage', skillName, at: 2000, duration: 300, groupId: '13:0' }, spec);
    redrawnSkillFx.claim({ kind: 'hit', skillName, at: 2100, duration: 320, groupId: '99:0', channelId: 'ch-1' }, spec);
    redrawnSkillFx.claim({ kind: 'hit', skillName, at: 2400, duration: 320, groupId: '98:0', channelId: 'ch-1' }, spec);
    return redrawnSkillFx.snapshot();
})()`));
assert.strictEqual(casts.length, 3, 'stages and hits of one damage group — or one channel — form a single cast');
assert.deepStrictEqual(casts[0].kinds, ['stage', 'hit', 'hit']);
assert.strictEqual(casts[0].end, 1380, 'a cast lasts until its last event ends');
assert.deepStrictEqual(casts[2].kinds, ['hit', 'hit'], 'a channel keeps all its ticks in one cast');

const capped = run(`(function () {
    const spec = SKILL_FX_ATLAS['서리 폭발'];
    redrawnSkillFx.reset();
    for (let i = 0; i < 80; i++) redrawnSkillFx.claim({ kind: 'stage', skillName: '서리 폭발', at: i * 10, duration: 100, groupId: 'c' + i }, spec);
    return redrawnSkillFx.snapshot().length;
})()`);
assert(capped <= 48, `live casts stay bounded (got ${capped})`);

// ---------------------------------------------------------------- what the character does meanwhile
const spin = plain(run(`(function () {
    const spec = SKILL_FX_ATLAS['회오리바람'], skillName = '회오리바람';
    redrawnSkillFx.reset();
    for (const at of [1000, 1100, 1200]) redrawnSkillFx.claim({ kind: 'hit', skillName, at, duration: 200, groupId: '40:0', targetCells: [{ gx: 1, gy: 1 }] }, spec);
    return [999, 1000, 1095, 1185, 1275, 1339, 1340].map(now => redrawnSkillFx.playerSpin(now));
})()`));
assert.strictEqual(spin[0], null, 'no turn before the first blade');
assert.deepStrictEqual(spin.slice(1, 5).map(s => s.facing), ['east', 'south', 'west', 'north'], 'the body turns clockwise, one facing per 90ms');
assert.strictEqual(spin[5].holdUntil, 1340, 'the strike pose holds 140ms past the last blade');
assert.strictEqual(spin[6], null, 'and then lets go');

const tint = plain(run(`(function () {
    const spec = SKILL_FX_ATLAS['흡혈 타격'], skillName = '흡혈 타격';
    redrawnSkillFx.reset();
    redrawnSkillFx.claim({ kind: 'hit', skillName, at: 1000, duration: 320, groupId: '5:0', targetCells: [{ gx: 1, gy: 0 }], sourceCell: { gx: 0, gy: 0 } }, spec);
    return [1000, 1700, 3000].map(now => redrawnSkillFx.playerTint(now));
})()`));
assert.strictEqual(tint[0], 0, 'the drained blood has not reached the caster at the moment of the hit');
assert(tint[1] > 0 && tint[1] <= 0.35, `the caster flushes crimson once the blood sinks in (got ${tint[1]})`);
assert.strictEqual(tint[2], 0, 'and the flush fades');

// ---------------------------------------------------------------- outside a frame
assert.doesNotThrow(() => run(`redrawnSkillFx.drawLayer('fore', 1000); redrawnSkillFx.drawLayer('ground', 1000);`),
    'drawing with no remake pass open is a no-op');
assert.strictEqual(run('hanaActors.drawnBody(1000)'), null, 'no body is known before the player sprite is drawn');

console.log('redrawn skill fx: claims, cast grouping, spin and drain cues ok');
