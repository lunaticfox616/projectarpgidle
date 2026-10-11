'use strict';
// 옆에서 보는 무대의 탐험 물체(나무 상자, 항아리, 보급 상자 세 등급, 봉인된 보물함, 알집, 매복 흔적)와 그 부서진 모습.
// 몬스터와 같은 도구(render.cjs)로 캐릭터와 같은 밀도로 그린다. 한 장씩 서 있는 그림이고 칸은 96, 발 자리는 FEET.
// 게임 쪽 규격은 data/stage-view.js STAGE_OBJECTS(이름 순서가 그림 순서다), 그리는 쪽은 js/canvas-stage-objects.js.
const S = require('./render.cjs');
const { ramp } = S;

const SIZE = 96, FEET = [48, 84];
/** A line every `step` along a coordinate, `width` wide: plank joints. */
const joint = (value, step, width = 1.1) => Math.abs((((value % step) + step) % step) - step / 2) > step / 2 - width;

const WOOD = { wood: { ramp: ramp('#8a6038', { cool: 18, warm: 12 }) }, woodDark: { ramp: ramp('#553a22', { cool: 14, warm: 8 }) },
    beam: { ramp: ramp('#6f4a2a', { cool: 16, warm: 12 }) }, iron: { ramp: ramp('#5a5c66', { cool: 10, warm: 4 }), gloss: true },
    nail: { ramp: ramp('#2c2a2e', { cool: 4, warm: 2 }) }, inside: { ramp: ramp('#1c1410', { cool: 4, warm: 2 }) } };

// ---------------------------------------------------------------- 나무 상자
function crate() {
    const m = S.scene();
    m.add(S.box([0, 17, 0], [19, 17, 13], 0.8), 'wood', { paint: p => (joint(p[0] + 4.7, 9.5) ? 'woodDark' : null) });
    for (const x of [-18.6, 18.6]) for (const z of [-12.6, 12.6]) m.add(S.box([x, 17.2, z], [2.7, 17.8, 2.7], 0.6), 'beam');
    for (const y of [2.6, 32]) {
        m.add(S.box([0, y, 13.2], [19, 2.6, 1.7], 0.5), 'beam');
        m.add(S.box([0, y, -13.2], [19, 2.6, 1.7], 0.5), 'beam');
        for (const x of [-19.2, 19.2]) m.add(S.box([x, y, 0], [1.7, 2.6, 13], 0.5), 'beam');
    }
    m.add(S.limb([-15, 6.5, 14], [15, 28, 14], 2), 'beam');
    for (const [x, y] of [[-18.6, 3], [18.6, 3], [-18.6, 31.5], [18.6, 31.5]]) m.add(S.sphere([x, y, 15.4], 1.2), 'nail');
    return m;
}
function crateBroken() {
    const m = S.scene(), plank = (c, half, turn, mat = 'wood') => m.add(S.moved(S.box(c, half, 0.5), p => S.roty(p, turn, c)), mat,
        { paint: p => (joint(p[0], 7) ? 'woodDark' : null) });
    plank([-12, 1.6, 4], [15, 1.6, 3.2], 0.25);
    plank([10, 1.6, -5], [13, 1.6, 3.2], -0.5, 'beam');
    plank([14, 1.8, 9], [9, 1.8, 2.8], 1.1);
    plank([-4, 4.6, -2], [11, 1.5, 2.8], -0.2, 'beam');
    m.add(S.moved(S.box([-17, 6, -6], [2.6, 6, 2.6], 0.5), p => S.rotz(p, 0.5, [-17, 0, -6])), 'beam');
    for (const [x, z] of [[-24, 10], [3, 13], [24, -2], [-8, -10]]) m.add(S.box([x, 0.9, z], [2.6, 0.9, 1], 0.3), 'woodDark');
    return m;
}

// ---------------------------------------------------------------- 낡은 항아리
const CLAY = { clay: { ramp: ramp('#a8694a', { cool: 22, warm: 14 }), gloss: true }, band: { ramp: ramp('#6b3d2c', { cool: 16, warm: 8 }) },
    bandLight: { ramp: ramp('#d3a273', { cool: 16, warm: 10 }) }, mouth: { ramp: ramp('#1f1310', { cool: 4, warm: 2 }) } };
/** The painted belt round the jar: a dark band with a pale zigzag. */
function belt(p) {
    if (p[1] < 16.5 || p[1] > 22.5) return null;
    const turn = Math.atan2(p[2], p[0]) * 7, wave = Math.abs(((turn / Math.PI) % 1 + 1) % 1 - 0.5) * 6;
    return Math.abs(p[1] - 18 - wave) < 0.9 ? 'bandLight' : 'band';
}
function pot() {
    const m = S.scene();
    m.add(S.ellipsoid([0, 15, 0], [15, 15.5, 14]), 'clay', { group: 'jar', k: 4, paint: belt });
    m.add(S.cylinder([0, 30, 0], 6.6, 3.6, 1), 'clay', { group: 'jar', k: 4 });
    m.add(S.cylinder([0, 2.2, 0], 8.5, 2.2, 0.8), 'clay', { group: 'jar', k: 3 });
    m.add(S.torus([0, 34, 0], 7.8, 2.2), 'clay');
    m.add(S.ellipsoid([0, 35.3, 0], [5.8, 1.3, 5.2]), 'mouth');
    return m;
}
function potBroken() {
    const m = S.scene(), shell = S.without(S.ellipsoid([-5, 15, 0], [15, 15.5, 14]), S.ellipsoid([-5, 15, 0], [12.8, 13.3, 11.8]));
    m.add(S.below(shell, 9), 'clay', { paint: p => (p[1] < 8 ? null : 'band') });
    m.add(S.ellipsoid([-5, 2.6, 0], [10, 1.2, 9]), 'mouth');
    const shard = (c, r, turn) => m.add(S.moved(S.ellipsoid(c, r), p => S.rotz(S.roty(p, turn, c), turn * 0.6, c)), 'clay');
    shard([14, 2.2, 7], [7, 1.6, 4.4], 0.6);
    shard([20, 1.8, -5], [5.4, 1.4, 3.6], -0.8);
    shard([6, 1.6, 13], [4.4, 1.2, 2.8], 1.4);
    shard([-22, 1.6, 9], [4, 1.2, 2.6], -0.3);
    m.add(S.ellipsoid([12, 1.2, -9], [3, 1, 2.2]), 'band');
    return m;
}

// ---------------------------------------------------------------- 보급 상자, 봉인된 보물함
const HINGE = [0, 20.6, -13];
/** A chest: body, arched lid, straps and lock. turn = how far the lid has swung back (radians). look: material names. */
function chest(turn, look) {
    const m = S.scene(), lidFrame = p => (turn ? S.rotx(p, turn, HINGE) : p), open = turn !== 0;
    /** The underside of a lid swung open faces the viewer: it is the dark inside of the chest. */
    const under = p => { const q = lidFrame(p); return open && q[1] < 21.5 && Math.abs(q[0]) < 19 && Math.abs(q[2]) < 10; };
    const body = S.box([0, 10.3, 0], [22, 10.3, 13], 1);
    m.add(open ? S.without(body, S.box([0, 13, 0], [19.5, 10, 10.5], 0.5)) : body, look.body, { paint: p => (joint(p[1] - 1.5, 6.6, 0.8) ? look.seam : null) });
    if (open) m.add(S.box([0, 4.5, 0], [19.4, 1.5, 10.4]), 'inside');
    m.add(S.moved(S.above(S.barrel([0, 20.6, 0], 13, 22), 20.6), lidFrame), look.lid,
        { paint: p => (under(p) ? 'inside' : joint(lidFrame(p)[2] + 3, 6.5, 0.8) ? look.seam : null) });
    for (const x of [-13.5, 13.5]) {
        m.add(S.box([x, 10.3, 0], [2.3, 10.9, 13.7], 0.5), look.strap);
        m.add(S.moved(S.above(S.barrel([x, 20.6, 0], 13.8, 2.3), 20.6), lidFrame), look.strap);
    }
    m.add(S.box([0, 20.2, 0], [22.7, 1.2, 13.7], 0.4), look.strap);
    if (open) return m;
    m.add(S.box([0, 17.2, 14], [4.4, 5, 1.5], 0.8), look.lock);
    m.add(S.box([0, 16, 15.2], [1.1, 1.9, 0.8], 0.3), 'nail');
    for (const x of [-21, 21]) for (const y of [2.4, 17.4]) m.add(S.sphere([x * 0.985, y, 13.4], 1.5), look.strap);
    return m;
}
const CHEST_MATS = {
    ...WOOD,
    lidWood: { ramp: ramp('#9a6c40', { cool: 18, warm: 12 }) },
    brass: { ramp: ramp('#c9973a', { cool: 24, warm: 14 }), gloss: true },
    steel: { ramp: ramp('#aab0be', { cool: 14, warm: 6 }), gloss: true }, silverWood: { ramp: ramp('#5d5560', { cool: 14, warm: 8 }) },
    silverLid: { ramp: ramp('#6c6470', { cool: 14, warm: 8 }) }, silverSeam: { ramp: ramp('#3b3640', { cool: 10, warm: 4 }) },
    silverLock: { ramp: ramp('#dfe4ee', { cool: 14, warm: 4 }), gloss: true },
    gilt: { ramp: ramp('#c9972f', { cool: 26, warm: 14 }), gloss: true }, giltLid: { ramp: ramp('#dcae40', { cool: 26, warm: 14 }), gloss: true },
    giltSeam: { ramp: ramp('#8a5f18', { cool: 20, warm: 8 }) }, giltStrap: { ramp: ramp('#f1d57a', { cool: 24, warm: 10 }), gloss: true },
    ruby: { ramp: ramp('#c8372e', { cool: 20, warm: 16 }), gloss: true, glow: true },
    rune: { ramp: ramp('#4a4466', { cool: 16, warm: 8 }) }, runeLid: { ramp: ramp('#5a5378', { cool: 16, warm: 8 }) },
    runeSeam: { ramp: ramp('#2a2638', { cool: 8, warm: 4 }) }, runeStrap: { ramp: ramp('#8a84a6', { cool: 14, warm: 6 }), gloss: true },
    seal: { ramp: ramp('#b47ae0', { cool: 20, warm: 20 }), gloss: true, glow: true }
};
const LOOKS = {
    wood: { body: 'wood', lid: 'lidWood', seam: 'woodDark', strap: 'iron', lock: 'brass' },
    silver: { body: 'silverWood', lid: 'silverLid', seam: 'silverSeam', strap: 'steel', lock: 'silverLock' },
    gold: { body: 'gilt', lid: 'giltLid', seam: 'giltSeam', strap: 'giltStrap', lock: 'ruby' },
    sealed: { body: 'rune', lid: 'runeLid', seam: 'runeSeam', strap: 'runeStrap', lock: 'seal' }
};
const LID_OPEN = 1.5;

// ---------------------------------------------------------------- 알집, 매복 흔적
const NEST = { nest: { ramp: ramp('#6f6a3a', { cool: 18, warm: 12 }) }, straw: { ramp: ramp('#8f8a52', { cool: 16, warm: 12 }) },
    nestDark: { ramp: ramp('#45431f', { cool: 12, warm: 6 }) }, egg: { ramp: ramp('#e4e2c0', { cool: 26, warm: 8 }), gloss: true },
    eggSpot: { ramp: ramp('#b9b68c', { cool: 20, warm: 8 }) }, yolk: { ramp: ramp('#3a3520', { cool: 8, warm: 4 }) },
    mud: { ramp: ramp('#2a1d16', { cool: 6, warm: 4 }), noRim: true } };
const fibre = p => (joint(p[0] * 0.8 + p[1] * 1.7 + p[2] * 0.5, 4.2, 0.7) ? 'nestDark' : null);
function mound(m) {
    m.add(S.ellipsoid([0, 5.5, 0], [25, 8, 15]), 'nest', { group: 'mound', k: 4, paint: fibre });
    m.add(S.torus([0, 9.5, 0], 15, 4.6), 'straw', { group: 'mound', k: 3, paint: fibre });
    for (const [x, z, turn] of [[-24, 5, 0.5], [22, 8, -0.4], [-10, 14, 0.2], [12, -13, -0.3]]) m.add(S.limb([x, 3, z], [x + 9 * Math.sin(turn), 10, z + 2], 1.1, 0.5), 'straw');
}
function nest() {
    const m = S.scene();
    mound(m);
    const spots = p => (Math.sin(p[0] * 1.9) * Math.sin(p[1] * 1.7 + p[2]) > 0.72 ? 'eggSpot' : null);
    m.add(S.ellipsoid([-9, 19, 1], [6.4, 8.6, 6.2], 0.18), 'egg', { paint: spots });
    m.add(S.ellipsoid([4.5, 21.5, -2], [6.8, 9.6, 6.6], -0.1), 'egg', { paint: spots });
    m.add(S.ellipsoid([13, 16.5, 4], [5.2, 7.2, 5.2], -0.3), 'egg', { paint: spots });
    return m;
}
function nestSpent() {
    const m = S.scene(), cup = (c, r, cut) => m.add(S.below(S.without(S.ellipsoid(c, r), S.ellipsoid(c, [r[0] - 1.3, r[1] - 1.3, r[2] - 1.3])), cut), 'egg');
    mound(m);
    m.add(S.ellipsoid([0, 10.5, 0], [12, 1.6, 8]), 'yolk');
    cup([-9, 17, 1], [6.4, 8.6, 6.2], 15.5);
    cup([5, 18, -2], [6.8, 9.6, 6.6], 14.5);
    for (const [x, z] of [[17, 8], [-20, 9], [9, 13]]) m.add(S.ellipsoid([x, 2, z], [3.4, 1.2, 2.4]), 'egg');
    return m;
}
function tracks() {
    const m = S.scene(), paw = (x, z, turn) => {
        const at = (dx, dz) => S.roty([x + dx, 0.6, z + dz], turn, [x, 0.6, z]);
        m.add(S.ellipsoid(at(0, 0), [4.4, 0.8, 3.4]), 'mud');
        for (const dz of [-3.6, 0, 3.6]) m.add(S.ellipsoid(at(6.4, dz), [2.2, 0.7, 1.4]), 'mud');
    };
    paw(-18, 7, 0.2); paw(-2, -6, -0.1); paw(14, 9, 0.15); paw(27, -5, -0.2);
    return m;
}

/** name → { build, mats }. The order is the order of the cells in assets/objects/stage/objects.png. */
const objects = [
    ['crate', crate, WOOD], ['crateBroken', crateBroken, WOOD], ['pot', pot, CLAY], ['potBroken', potBroken, CLAY],
    ['chest', () => chest(0, LOOKS.wood), CHEST_MATS], ['chestOpen', () => chest(LID_OPEN, LOOKS.wood), CHEST_MATS],
    ['chestSilver', () => chest(0, LOOKS.silver), CHEST_MATS], ['chestSilverOpen', () => chest(LID_OPEN, LOOKS.silver), CHEST_MATS],
    ['chestGold', () => chest(0, LOOKS.gold), CHEST_MATS], ['chestGoldOpen', () => chest(LID_OPEN, LOOKS.gold), CHEST_MATS],
    ['sealed', () => chest(0, LOOKS.sealed), CHEST_MATS], ['sealedOpen', () => chest(LID_OPEN, LOOKS.sealed), CHEST_MATS],
    ['nest', nest, NEST], ['nestSpent', nestSpent, NEST], ['tracks', tracks, NEST]
].map(([name, build, mats]) => ({ name, build, mats }));

module.exports = { objects, SIZE, FEET };
