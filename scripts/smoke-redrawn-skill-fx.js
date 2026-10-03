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
    const nameOf = id => Object.keys(SKILL_DB).find(name => redrawnSkillFx.specOf(name)?.id === id);
    const out = {};
    for (const id of redrawnSkillFx.ids) {
        const skillName = nameOf(id), spec = redrawnSkillFx.specOf(skillName);
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
assert.strictEqual(Object.keys(claims).length, 26, 'twenty-six gems are redrawn');
for (const [id, got] of Object.entries(claims)) {
    const n = Number(id);
    if (n === 50) {
        assert.deepStrictEqual([got.stage, got.hit, got.mist], [false, false, true], '50 신성한 안개 replaces only the mist stage');
        continue;
    }
    if (n === 21) assert.deepStrictEqual([got.travel, got.stage, got.hit], [true, false, true], '21 서리 파동 replaces its travel and hits');
    else if (n === 51) assert.deepStrictEqual([got.stage, got.hit], [true, false], '51 파문심판 replaces the censer stage only');
    else if (n === 30) assert.deepStrictEqual([got.travel, got.stage, got.hit], [false, false, true], '30 빙결 파열창 keeps its spear; its hits become frost mist');
    else if (n === 48) assert.deepStrictEqual([got.travel, got.stage, got.hit], [false, true, false], '48 과냉각 혼합물 keeps the flask and hit sparks; the cloud ring goes');
    else assert.strictEqual(got.stage && got.hit, true, `${id}: stage and hit sprites belong to the redrawn art`);
    if ([3, 16, 33, 37].includes(n)) assert.strictEqual(got.windup, true, `${id}: the redrawn art owns the windup`);
    if (n >= 54) assert.deepStrictEqual([got.windup, got.travel, got.stage, got.hit], [true, true, true, true], `${id}: a movement gem has no original art — the redrawn art owns every event`);
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

// ---------------------------------------------------------------- the gem's own prop takes the weapon out of the hand
const hidden = plain(run(`(function () {
    redrawnSkillFx.reset();
    const censer = { kind: 'stage', skillName: '파문심판', at: 2000, duration: 700, judgmentPhase: 'censer' };
    redrawnSkillFx.claim(censer, SKILL_FX_ATLAS['파문심판'], 'visual');
    const other = { kind: 'stage', skillName: '서리 폭발', at: 5000, duration: 400 };
    redrawnSkillFx.claim(other, SKILL_FX_ATLAS['서리 폭발'], 'visual');
    return [1999, 2000, 2699, 2700, 5100].map(now => redrawnSkillFx.weaponHidden(now));
})()`));
assert.deepStrictEqual(hidden, [false, true, true, false, false], 'the censer phase of 파문심판 hides the carried weapon; other gems do not');

// ---------------------------------------------------------------- the 09-30 drawers paint their casts
// A recording buffer stands in for the remake pass: each dot is one fillRect at (board dot × 3) in buffer px.
const paint = plain(run(`(function () {
    const pts = [];
    const ctx = { setTransform() {}, fillRect(x, y) { pts.push([x, y]); }, clearRect() {}, drawImage() {}, save() {}, restore() {} };
    document.createElement = () => ({ width: 0, height: 0, getContext: () => ctx });
    const target = { canvas: { dataset: {}, clientWidth: 432, clientHeight: 384, width: 432, height: 384 }, getTransform() { return {}; } };
    const projection = { tileW: 48, tileH: 48, actorGroundOffsetY: 0, cellToScreen: (gx, gy) => ({ x: 24 + gx * 48, y: 24 + gy * 48 }) };
    const src = { gx: 1, gy: 3 }, aim = { gx: 4, gy: 3 }, side = { gx: 4, gy: 2 };
    const area = r => ({ center: aim, radius: r, cells: [aim, side, { gx: 5, gy: 3 }, { gx: 3, gy: 3 }, { gx: 4, gy: 4 }] });
    const hit = (at, cell, extra) => ({ kind: 'hit', at, duration: 320, targetCells: [cell || aim], ...extra });
    function cast(skillName, events) {
        redrawnSkillFx.reset();
        for (const e of events) redrawnSkillFx.claim({ skillName, sourceCell: src, targetCells: [aim], groupId: 'p', ...e }, redrawnSkillFx.specOf(skillName), 'visual');
    }
    function dots(layer, now) {
        pts.length = 0;
        fxRemake.begin(target, projection);
        redrawnSkillFx.drawLayer(layer, now);
        fxRemake.discard();
        return pts.length;
    }
    function meanX(layer, now) { dots(layer, now); return pts.reduce((sum, p) => sum + p[0], 0) / Math.max(1, pts.length); }
    const out = {};
    cast('혈기 폭쇄', [{ kind: 'stage', at: 1000, duration: 160, stageIndex: 0, footprint: area(0) }, { kind: 'stage', at: 1160, duration: 240, stageIndex: 1, footprint: area(1) }, hit(1000), hit(1160, side)]);
    out.burst = { condense: dots('fore', 1060), burst: dots('fore', 1200), stainsEarly: dots('ground', 1100), stains: dots('ground', 1400) };
    cast('화염 폭풍핵', [{ kind: 'stage', at: 1000, duration: 840, footprint: area(1) }, hit(1040), hit(1040, side), hit(1300), hit(1300, side)]);
    out.vortex = { turning: dots('ground', 1400), gone: dots('ground', 2400), flames: dots('fore', 1100) };
    cast('빙결 파열창', [hit(1000, aim, { sourceCell: src })]);
    out.mist = { burst: dots('fore', 1050), burstGone: dots('fore', 1300), mist: dots('ground', 1500), mistGone: dots('ground', 2400) };
    cast('룬 지뢰', [{ kind: 'windup', at: 1000, duration: 820, footprint: area(2) }, { kind: 'stage', at: 1820, duration: 260, footprint: area(2) }]);
    out.mine = { beforeLanding: dots('ground', 1300), sigil: dots('ground', 1500), toss: dots('fore', 1300), blast: dots('fore', 1900) };
    cast('과냉각 혼합물', [{ kind: 'stage', at: 1000, duration: 860, supercooledPhase: 'wave', ringInterval: 260, landingCell: aim }]);
    out.cool = { ring1: dots('ground', 1060), ring3: dots('ground', 1580), gone: dots('ground', 1800), flash: dots('fore', 1040) };
    const slash = { kind: 'stage', at: 1000, duration: 240, targetCells: [{ gx: 4, gy: 3 }] };
    cast('공허 베기', [slash]);
    const crescentOnly = [dots('fore', 1060), dots('fore', 1160)];
    cast('공허 베기', [slash, hit(1000, { gx: 2, gy: 3 }), hit(1030, { gx: 3, gy: 3 })]);
    out.crescent = { crescentOnly, withHits: [dots('fore', 1060), dots('fore', 1160)] };
    cast('회오리바람', [hit(1000, { gx: 2, gy: 3 }, { sourceCell: src }), hit(1080, { gx: 1, gy: 2 }, { sourceCell: src })]);
    battleVisualState.playerPos = { x: 24 + 1 * 48, y: 24 + 3 * 48 };
    const atStart = meanX('fore', 1300);
    battleVisualState.playerPos = { x: 24 + 5 * 48, y: 24 + 3 * 48 };
    out.whirl = { shift: meanX('fore', 1300) - atStart };
    battleVisualState.playerPos = null;
    const moveCast = (skillName, move) => cast(skillName, [{ kind: 'stage', at: 1000, duration: 1800, move, riftPhase: 'move' }]);
    moveCast('차원찢기', { from: src, to: aim, tear: 1300, openB: 1420, vanish: [1380, 1640], close: 1680, burst: 1720 });
    out.rift = { tears: dots('ground', 1450), burst: dots('fore', 1760), none: dots('ground', 1200) };
    moveCast('향로구름', { from: src, to: aim, foe: side, puff: 1400, puffB: 1520, vanish: [1430, 1710], lifeA: 720, lifeB: 1000 });
    out.smoke = { both: dots('fore', 1600), gone: dots('fore', 2600) };
    const harpoon = { from: src, to: { gx: 3, gy: 3 }, foe: aim, release: 1360, hitAt: 1500, pull0: 1590, pull1: 1800, moved: true };
    moveCast('작살화살', harpoon);
    out.harpoon = { flight: dots('fore', 1420), rope: dots('fore', 1700), reeled: dots('fore', 2000) };
    const leapMove = { from: src, to: { gx: 3, gy: 3 }, jump: 1160, slam: 1580, peak: 14 };
    moveCast('공중강타', leapMove);
    out.slam = { dust: dots('fore', 1200), ground: dots('ground', 1620) };
    out.caster = { leap: redrawnSkillFxExtra.moveCaster(57, leapMove, 1370), pulled: redrawnSkillFxExtra.moveCaster(56, harpoon, 1700),
        hidden: redrawnSkillFxExtra.moveCaster(55, { vanish: [1430, 1710] }, 1570), after: redrawnSkillFxExtra.moveCaster(57, leapMove, 1600),
        landing: redrawnSkillFxExtra.moveCaster(57, leapMove, 1600, true), stillInside: redrawnSkillFxExtra.moveCaster(55, { vanish: [1430, 1710] }, 1690, true) };
    const mist = holyRadius => { cast('신성한 안개', [{ kind: 'stage', at: 1000, duration: 700, holyMistPhase: 'mist', holySource: src, holyRadius }]); return dots('ground', 1300); };
    out.holy = { base: mist(1), grown: mist(2) };
    redrawnSkillFx.reset();
    return out;
})()`));
assert(paint.burst.condense > 0 && paint.burst.burst > 0, '17 혈기 폭쇄: the blood gathers, then bursts');
assert.strictEqual(paint.burst.stainsEarly, 0, 'no stains before the burst');
assert(paint.burst.stains > 0, 'the burst leaves stains on the ground layer');
assert(paint.vortex.turning > 0 && paint.vortex.flames > 0, '29 화염 폭풍핵: the vortex turns on the ground, flames on the struck cells');
assert.strictEqual(paint.vortex.gone, 0, 'the vortex winds down after the field ends');
assert(paint.mist.burst > 0 && paint.mist.mist > 0, '30 빙결 파열창: a frost flash, then mist on the floor');
assert.deepStrictEqual([paint.mist.burstGone, paint.mist.mistGone], [0, 0], 'the flash and the mist both clear');
assert.strictEqual(paint.mine.beforeLanding, 0, '37 룬 지뢰: no sigil before the spark lands');
assert(paint.mine.sigil > 0 && paint.mine.toss > 0 && paint.mine.blast > 0, 'the spark is tossed, the sigil arms, the cross blasts');
assert(paint.cool.ring1 > 0 && paint.cool.ring3 > 0 && paint.cool.flash > 0, '48 과냉각 혼합물: a frost flash and one thin ring per ring hit');
assert.strictEqual(paint.cool.gone, 0, 'the rings and the frost star clear after the last ring');
assert.deepStrictEqual(paint.crescent.withHits, paint.crescent.crescentOnly, '16 공허 베기 draws the crescent only — no marks on the struck cells');
assert(paint.rift.tears > 0 && paint.rift.burst > 0 && paint.rift.none === 0, '54 차원찢기: two tears, then the burst — nothing before the tear');
assert(paint.smoke.both > 0 && paint.smoke.gone === 0, '55 향로구름: the smoke clouds come and clear');
assert(paint.harpoon.flight > 0 && paint.harpoon.rope > 0 && paint.harpoon.reeled === 0, '56 작살화살: flight, the taut rope and pull, then reeled in');
assert(paint.slam.dust > 0 && paint.slam.ground > 0, '57 공중강타: dust at the jump, cracks at the landing');
assert(paint.caster.leap.lift > 10 && Math.abs(paint.caster.leap.dx - 16) < 1, 'the leaper is up in the air half way along');
assert(paint.caster.pulled.dx > 16 && paint.caster.pulled.dx < 32 && paint.caster.pulled.alpha === 1, 'the archer glides along the rope');
assert.strictEqual(paint.caster.hidden.alpha, 0, 'inside the smoke the caster is out of sight');
assert.strictEqual(paint.caster.after, null, 'once landed the caster stands in its cell');
assert.deepStrictEqual([paint.caster.landing.dx, paint.caster.landing.lift], [32, 0], 'landed before combat moved it: drawn at the landing, not back at the take-off');
assert.strictEqual(paint.caster.stillInside.alpha, 0, 'past the middle of the smoke but not yet moved: still out of sight');
assert(paint.holy.grown > paint.holy.base * 1.5, `50 신성한 안개: effect expansion spreads the mist wider (${paint.holy.base} → ${paint.holy.grown} dots)`);
assert(Math.abs(paint.whirl.shift - 4 * 16 * 3) < 1, `5 회오리바람: the blade wind follows the caster (moved ${paint.whirl.shift}px for 4 cells)`);

// ---------------------------------------------------------------- outside a frame
assert.doesNotThrow(() => run(`redrawnSkillFx.drawLayer('fore', 1000); redrawnSkillFx.drawLayer('ground', 1000);`),
    'drawing with no remake pass open is a no-op');
assert.strictEqual(run('hanaActors.drawnBody(1000)'), null, 'no body is known before the player sprite is drawn');

console.log('redrawn skill fx: claims, cast grouping, spin and drain cues ok');
