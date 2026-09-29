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

// Summons are the wisps (data/wisp-summons.js, one look): every wisp gem finds its sheet pair, other summons draw elsewhere.
assert.strictEqual(sprites.summons, undefined, 'the four animal summon looks are gone from the Hana data');
const wispSlugs = plain(run('Object.keys(WISP_SUMMONS).map(name => [hanaActors.summonSlug(name), WISP_SUMMONS[name].slug])'));
assert(wispSlugs.length === 6 && wispSlugs.every(([drawn, table]) => drawn === table), 'each wisp gem draws from its own sheet');
assert.strictEqual(run("hanaActors.summonSlug('수액 골렘 소환')"), null, 'the guard golem keeps the legacy frame');
for (const [slug] of wispSlugs) {
    for (const motion of ['idle', 'attack']) {
        const file = path.join(root, 'assets/summon/wisp', `${slug}_${motion}.png`);
        assert.deepStrictEqual(pngSize(file), { w: 64, h: 16 }, `${slug} ${motion}: four 16×16 frames`);
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

// The weapon in hand follows the equipped weapon's base: every weapon base in the game maps to a drawn weapon.
const weapons = plain(run(`(function () {
    const item = id => ({ slot: '무기', baseId: id, baseName: BASE_ITEM_DB.find(b => b.id === id).name });
    return [
        hanaActors.weaponFor('warrior', item('rusted_blade')), hanaActors.weaponFor('archer', item('doomcleaver_blade')),
        hanaActors.weaponFor('cleric', item('hunter_axe')), hanaActors.weaponFor('wanderer', item('tempest_pike')),
        hanaActors.weaponFor('warrior', item('windlash_bow')), hanaActors.weaponFor('occultist', item('seeker_railgun')),
        hanaActors.weaponFor('warrior', item('nova_rod')), hanaActors.weaponFor('cleric', item('void_archon_staff')),
        hanaActors.weaponFor('alchemist', item('ember_wand')), hanaActors.weaponFor('archer', null),
        hanaActors.weaponFor('warrior', { slot: '무기', name: '세계파쇄자', rarity: 'unique' }),
        hanaActors.weaponFor('archer', item('rusted_blade'), 'class'), hanaActors.weaponFor('archer', null, 'censer')
    ];
})()`));
assert.deepStrictEqual(weapons, ['scimitar', 'greatsword', 'scimitar', 'greatsword', 'shortbow', 'shortbow', 'orb', 'censer', 'flask',
    'shortbow', 'greatsword', 'shortbow', 'censer'],
    'equipped weapon → drawn weapon: blades/axes, greatswords/polearms, bows/launchers, casting weapons by class; unarmed keeps the class weapon');
const unmapped = plain(run(`BASE_ITEM_DB.filter(b => b.slot === '무기').filter(b => hanaActors.weaponFor('warrior', { slot: '무기', baseId: b.id, baseName: b.name }) === 'greatsword' && !/great|doom|executioner|spear|pike|lance|glaive|대검|창|글레이브/.test(b.id + b.name)).map(b => b.id)`));
assert.deepStrictEqual(unmapped, [], 'no weapon base falls through to the warrior default by accident');

console.log('hana actors ok');
