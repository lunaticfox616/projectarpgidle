// Hana +6 player sprites: imported sheets match their spec, and the attack clip's
// authored hit frame lands on the combat swing's impactAt at any attack speed.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const root = path.resolve(__dirname, '..');
const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);
const plain = value => JSON.parse(JSON.stringify(value));

function pngSize(file) {
    const bytes = fs.readFileSync(file);
    return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
}

const sprites = plain(run('HANA_SPRITES'));
const classIds = plain(run('PLAYER_CLASS_ORDER'));
assert.deepStrictEqual(Object.keys(sprites.classes).sort(), classIds.slice().sort(),
    'every selectable class must have a Hana sheet set (and no stray classes)');
assert.deepStrictEqual(sprites.rows, ['down', 'left', 'right', 'up']);

for (const [classId, def] of Object.entries(sprites.classes)) {
    for (const motion of ['idle', 'walk', 'run', 'hurt', 'attack']) {
        const clip = def.motions[motion];
        assert(clip, `${classId} is missing ${motion}`);
        assert.strictEqual(clip.ms.length, clip.frames, `${classId} ${motion}: one duration per frame`);
        const file = path.join(root, 'assets/playable/hana', classId, `${motion}.png`);
        assert(fs.existsSync(file), `${file} must exist`);
        const size = pngSize(file);
        assert.deepStrictEqual(size, { w: sprites.cell.w * clip.frames, h: sprites.cell.h * 4 },
            `${classId} ${motion}: sheet must be frames × 4 rows of ${sprites.cell.w}px cells`);
    }
    const hit = def.motions.attack.hitFrame;
    assert(Number.isInteger(hit) && hit > 0 && hit < def.motions.attack.frames, `${classId}: attack hit frame inside the clip`);
}

// The frame shown at impactAt is the authored hit frame, from very slow to very fast swings.
const timing = plain(run(`(function () {
    let out = [];
    for (let [classId, def] of Object.entries(HANA_SPRITES.classes)) {
        let clip = def.motions.attack;
        for (let windup of [80, 180, 360, 460, 900]) {
            let swing = { start: 1000, impactAt: 1000 + windup, channelUntil: 0 };
            let atImpact = hanaActors.attackPose(clip, swing, swing.impactAt + 0.5);
            let before = hanaActors.attackPose(clip, swing, swing.impactAt - 1);
            let first = hanaActors.attackPose(clip, swing, swing.start);
            out.push({ classId, windup, hit: clip.hitFrame, atImpact: atImpact && atImpact.frame,
                before: before && before.frame, first: first && first.frame, ends: atImpact && atImpact.end > swing.impactAt });
        }
    }
    return out;
})()`));
for (const row of timing) {
    assert.strictEqual(row.atImpact, row.hit, `${row.classId} windup ${row.windup}: the hit frame must be on screen at impact`);
    assert(row.before < row.hit, `${row.classId} windup ${row.windup}: frames before impact stay before the hit frame`);
    assert.strictEqual(row.first, 0, `${row.classId}: the clip starts on frame 0`);
    assert(row.ends, `${row.classId}: the recoil plays after impact`);
}

// Channels hold the hit frame until the channel ends, then recover.
const channel = plain(run(`(function () {
    let clip = HANA_SPRITES.classes.occultist.motions.attack;
    let swing = { start: 0, impactAt: 300, channelUntil: 1500 };
    return [600, 1200, 1499].map(t => hanaActors.attackPose(clip, swing, t).frame).concat([clip.hitFrame]);
})()`));
assert.deepStrictEqual(channel.slice(0, 3), [channel[3], channel[3], channel[3]], 'a channel holds the hit frame');

// Finished swings release the body back to idle.
assert.strictEqual(run(`hanaActors.attackPose(HANA_SPRITES.classes.warrior.motions.attack, { start: 0, impactAt: 200, channelUntil: 0 }, 5000)`), null);

// Summon sheets exist for every style the renderer can pick.
for (const [style, bank] of Object.entries(sprites.summons)) {
    for (const [slug, motions] of Object.entries(bank)) {
        for (const motion of ['idle', 'attack']) {
            const file = path.join(root, 'assets/summon/hana', style, `${slug}_${motion}.png`);
            assert(fs.existsSync(file), `${file} must exist`);
            assert.strictEqual(pngSize(file).w, motions[motion].w * 4, `${style}/${slug} ${motion}: four frames`);
        }
    }
}

// Class × weapon sheets (data/hana-weapon-combos.js): every class can hold every weapon, laid out as
// columns = layer × maxFrames cells and rows = motion × direction of the cropped cell.
const combos = plain(run('HANA_WEAPON_COMBOS'));
const [, , cropW, cropH] = combos.crop;
assert.deepStrictEqual(Object.keys(combos.classWeapons).sort(), classIds.slice().sort(), 'every class names its own weapon');
for (const classId of classIds) {
    for (const [weapon, info] of Object.entries(combos.weapons)) {
        const file = path.join(root, 'assets/playable/hana/combos', classId, `${weapon}.png`);
        assert(fs.existsSync(file), `${file} must exist`);
        assert.deepStrictEqual(pngSize(file), { w: combos.layers.length * combos.maxFrames * cropW, h: combos.motions.length * combos.dirs.length * cropH },
            `${classId} × ${weapon}: layer columns × motion/direction rows`);
        const spec = combos.combos[`${classId}|${weapon}`];
        for (const motion of combos.motions) assert(spec[motion].ms.length <= combos.maxFrames, `${classId} × ${weapon} ${motion}: fits the sheet`);
        assert(info.hitFrame > 0 && info.hitFrame < spec.attack.ms.length, `${weapon}: hit frame inside the attack clip`);
        const at = plain(run(`(function () {
            const clip = hanaActors.comboDef(${JSON.stringify(classId)}, ${JSON.stringify(weapon)}).motions.attack;
            const swing = { start: 1000, impactAt: 1300, channelUntil: 0 };
            return hanaActors.attackPose(clip, swing, swing.impactAt + 0.5).frame;
        })()`));
        assert.strictEqual(at, info.hitFrame, `${classId} × ${weapon}: the weapon's hit frame is on screen at impact`);
    }
}

// The weapon in hand follows the gem: the class keeps its own weapon when it fits the gem's motion.
const weapons = plain(run(`[
    hanaActors.weaponFor('warrior', '연속 베기'), hanaActors.weaponFor('wanderer', '연속 베기'),
    hanaActors.weaponFor('warrior', '서리 폭발'), hanaActors.weaponFor('cleric', '서리 폭발'),
    hanaActors.weaponFor('alchemist', '관통 사격'), hanaActors.weaponFor('occultist', '원소 포션 투척'),
    hanaActors.weaponFor('archer', '파문심판'), hanaActors.weaponFor('archer', '기본 공격'),
    hanaActors.weaponFor('archer', '서리 폭발', 'class'), hanaActors.weaponFor('archer', '서리 폭발', 'flask')
]`));
assert.deepStrictEqual(weapons, ['greatsword', 'scimitar', 'orb', 'censer', 'shortbow', 'flask', 'censer', 'shortbow', 'shortbow', 'flask'],
    'gem → weapon: blades, casts, bows, flasks and censers; the class weapon when it fits or for gems without a motion');

console.log('hana actors ok');
