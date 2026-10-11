'use strict';
// 옆에서 보는 무대의 탐험 물체(나무 상자, 항아리, 보급 상자 세 등급, 봉인된 보물함, 알집, 매복 흔적)와 그 부서진 모습.
// 몬스터와 같은 도구(입체는 render.cjs, 칠은 paint.cjs)로 캐릭터와 같은 밀도로 그린다. 한 장씩 서 있는 그림이고 칸은 96, 발 자리는 FEET.
// 색은 어두운 뿌리 동굴에 놓일 것을 보고 손으로 고른 단계다(2026-10-11 사용자: "상자랑 항아리도 같은 방식으로 다시 칠해줘").
// 게임 쪽 규격은 data/stage-view.js STAGE_OBJECTS(이름 순서가 그림 순서다), 그리는 쪽은 js/canvas-stage-objects.js.
const S = require('./render.cjs');
const { through } = require('./paint.cjs');

const SIZE = 96, FEET = [48, 84];
/** A line every `step` along a coordinate, `width` wide: plank joints. */
const joint = (value, step, width = 1.1) => Math.abs((((value % step) + step) % step) - step / 2) > step / 2 - width;

/** Wood: a ramp, a grain that runs along one direction, a little mottling. Metal: a ramp with a hard shine. */
const wood = (colours, grain, more) => ({ ramp: through(colours), grain, mottle: [0.17, 0.1], ...more });
const metal = (colours, more) => ({ ramp: through(colours), gloss: true, glossAt: 0.93, sheen: 0.3, contrast: 1.15, ...more });
const flat = colours => ({ ramp: through(colours), noEdge: true });
const WOOD = { wood: wood(['#1c120e', '#33221a', '#4a3324', '#60442e', '#7a5a3c', '#96744e', '#b39264'], [1, 0, 0]),
    slat: wood(['#1c120e', '#33221a', '#4a3324', '#60442e', '#7a5a3c', '#96744e', '#b39264'], [0, 1, 0]),
    woodDark: flat(['#120b09', '#21150f', '#33221a', '#4a3324']),
    beam: wood(['#190f0b', '#2c1c14', '#42291c', '#573824', '#6f4a2e', '#8a6340'], [0.7, 0.7, 0]),
    iron: metal(['#15141a', '#26252c', '#3a3940', '#514f57', '#6c6a72', '#8d8a90', '#b5b1b3']),
    nail: { ramp: through(['#0e0d10', '#1c1b20', '#2e2c32', '#45424a']) }, inside: flat(['#0a0706', '#140e0c', '#1f1512']) };

// ---------------------------------------------------------------- 나무 상자
function crate() {
    const m = S.scene();
    m.add(S.box([0, 17, 0], [19, 17, 13], 0.8), 'slat', { paint: p => (joint(p[0] + 4.7, 9.5) ? 'woodDark' : null) });
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
const CLAY = { clay: { ramp: through(['#2a1610', '#4a281c', '#6e3d2a', '#8f5438', '#ad6e4a', '#c98e66', '#e6b890']), gloss: true, glossAt: 0.955, sheen: 0.18, mottle: [0.11, 0.12] },
    band: flat(['#1c0f0c', '#34201a', '#4f3024', '#6b4130']), bandLight: flat(['#7a5a40', '#a88360', '#cfab82', '#ecd2ae']), mouth: flat(['#0c0706', '#170f0c', '#221612']) };
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
    lidWood: wood(['#1f140f', '#38251b', '#503726', '#684a32', '#836241', '#a07e56', '#bd9c6e'], [1, 0, 0]),
    brass: metal(['#3a2710', '#5e4218', '#8a6524', '#b38a34', '#d4ad4c', '#eed27a', '#fff0b0']),
    steel: metal(['#2a2c36', '#454852', '#666a75', '#8a8e9a', '#aeb2bd', '#d2d6de', '#f2f4f8']),
    silverWood: wood(['#17161c', '#2a2830', '#3e3b46', '#55515e', '#6e6978', '#8a8494'], [1, 0, 0]),
    silverLid: wood(['#1c1b22', '#312f38', '#474450', '#5f5b69', '#797484', '#9690a0'], [1, 0, 0]),
    silverSeam: flat(['#0e0d12', '#1b1a20', '#2a2830', '#3b3840']), silverLock: metal(['#4a4e5a', '#747986', '#a0a5b2', '#c8ccd6', '#e6e9ef', '#ffffff']),
    gilt: metal(['#3d2a0c', '#644612', '#8f671c', '#b88a2a', '#d9ad3e', '#f0cf66', '#fff0a8'], { contrast: 1.05 }),
    giltLid: metal(['#473210', '#725116', '#a07522', '#c99a32', '#e6bc4a', '#f6da78', '#fff4b8'], { contrast: 1.05 }),
    giltSeam: flat(['#2e1f08', '#4a330e', '#6b4c14', '#8a651c']), giltStrap: metal(['#6b4c14', '#a47a22', '#d9ad3e', '#f6dc84', '#fff6c8']),
    ruby: { ramp: through(['#3d0c10', '#6e141a', '#a82024', '#d83a34', '#f4705c', '#ffd0c0']), gloss: true, glow: 0.1 },
    rune: wood(['#12101c', '#221e34', '#342e4c', '#484066', '#5f5684', '#7a70a2'], [1, 0, 0]),
    runeLid: wood(['#171426', '#2a2540', '#3e3759', '#544a74', '#6c6192', '#877cb0'], [1, 0, 0]),
    runeSeam: flat(['#0b0a12', '#161422', '#221f34', '#302c46']), runeStrap: metal(['#3a3550', '#5a5478', '#7f78a0', '#a6a0c4', '#d0cbe6']),
    seal: { ramp: through(['#3a1860', '#5e2a96', '#8a48c8', '#b47ae0', '#dab4f4', '#f6eaff']), gloss: true, glow: 0.15 }
};
const LOOKS = {
    wood: { body: 'wood', lid: 'lidWood', seam: 'woodDark', strap: 'iron', lock: 'brass' },
    silver: { body: 'silverWood', lid: 'silverLid', seam: 'silverSeam', strap: 'steel', lock: 'silverLock' },
    gold: { body: 'gilt', lid: 'giltLid', seam: 'giltSeam', strap: 'giltStrap', lock: 'ruby' },
    sealed: { body: 'rune', lid: 'runeLid', seam: 'runeSeam', strap: 'runeStrap', lock: 'seal' }
};
const LID_OPEN = 1.5;

// ---------------------------------------------------------------- 알집, 매복 흔적
const NEST = { nest: { ramp: through(['#1c1a0e', '#33301a', '#4c4826', '#676236', '#827c48', '#9e975c']), mottle: [0.2, 0.12] },
    straw: { ramp: through(['#33301a', '#565030', '#7a7344', '#9e975c', '#c2ba7a']) }, nestDark: flat(['#12110a', '#23210f', '#363318']),
    egg: { ramp: through(['#6a6654', '#96917a', '#bdb89e', '#dcd8c0', '#f2efdc', '#fffdf2']), gloss: true, sheen: 0.2 },
    eggSpot: flat(['#5a5644', '#807b64', '#a39e84', '#c2bda2']), yolk: flat(['#14120a', '#262210', '#3a3520']),
    mud: { ramp: through(['#0f0a08', '#1c130f', '#2a1d16']), noRim: true, noEdge: true } };
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

// ---------------------------------------------------------------- 뿌리끝 성소의 물체
// 같은 물체가 오래 묵어 뿌리에 감기고 이끼가 앉았다: 나무는 어둡게 삭았고, 항아리에는 수액이 차 넘치고, 상자 위에는 빛나는 버섯이 돋았다.
// 공용 그림과 이름, 순서가 같다(assets/objects/stage/objects-root.png).
const AGED = { wood: wood(['#150e0b', '#281a13', '#3d2a1c', '#523a26', '#6a4d32', '#846442'], [1, 0, 0]),
    slat: wood(['#150e0b', '#281a13', '#3d2a1c', '#523a26', '#6a4d32', '#846442'], [0, 1, 0]), woodDark: flat(['#0d0807', '#1a100c', '#281a13', '#3a281c']),
    beam: wood(['#120b08', '#22160f', '#342216', '#48301f', '#5e4029', '#775536'], [0.7, 0.7, 0]),
    lidWood: wood(['#1a110d', '#2f1f16', '#463020', '#5e422b', '#775738', '#92704a'], [1, 0, 0]),
    iron: metal(['#101014', '#1e1e24', '#2f2f36', '#44434b', '#5c5a62', '#7a777e', '#9e9a9c']) };
const GROWTH = { vine: { ramp: through(['#1a120e', '#2f2018', '#463224', '#5e4632', '#785c42', '#94765a']), mottle: [0.2, 0.1] },
    moss: { ramp: through(['#161a08', '#2a3010', '#40471a', '#586026', '#727a34', '#8e9648']), mottle: [0.35, 0.2] },
    sap: { ramp: through(['#5c3113', '#8f562c', '#c88132', '#df9137', '#f6b65b', '#fcead3']), gloss: true, glow: 0.1 },
    cap: { ramp: through(['#0f3a34', '#1a6258', '#2c8f7e', '#4fc0a6', '#8fe3c8', '#d6fff0']), glow: 0.2, unshadowed: true },
    stem: { ramp: through(['#4a5248', '#727c6e', '#9aa694', '#c0ccb8']) }, thorn: { ramp: through(['#160a10', '#2a141c', '#40202a', '#5a2e3a', '#7a4250']) } };
function glowcap(m, at, size) {
    m.add(S.limb(at, [at[0], at[1] + size * 1.3, at[2]], size * 0.3), 'stem');
    m.add(S.ellipsoid([at[0], at[1] + size * 1.5, at[2]], [size, size * 0.62, size]), 'cap');
}
/** What grows on each object. open: the chest's lid is up (nothing lies over it). */
const DRESS = {
    crate(m) {
        m.add(S.ellipsoid([-5, 34.4, 1], [14, 1.7, 10]), 'moss');
        m.add(S.ellipsoid([-17, 31, 12.5], [5, 4, 3]), 'moss');
        m.add(S.chain([[-22, 0, 15], [-12, 12, 16], [2, 22, 16], [14, 31, 15.4], [16, 36, 6], [8, 36.6, -6]], [3, 2.8, 2.5, 2.2, 1.8, 1.2]), 'vine');
        m.add(S.chain([[2, 22, 16.4], [10, 14, 16.6], [16, 9, 16]], [1.5, 1.1, 0.7]), 'vine');
        glowcap(m, [10, 35.2, 4], 3);
        glowcap(m, [15, 35.2, -2], 2.2);
    },
    crateBroken(m) {
        m.add(S.ellipsoid([-10, 3.4, 5], [7, 2, 4]), 'moss');
        m.add(S.chain([[-26, 0.8, -2], [-12, 2.4, 2], [4, 1.4, 6], [20, 1, 12]], [1.8, 1.6, 1.3, 0.8]), 'vine');
        glowcap(m, [6, 1, 12], 2.4);
    },
    pot(m) {
        m.add(S.ellipsoid([0, 35.7, 0], [5.6, 1.7, 5]), 'sap');
        m.add(S.chain([[4, 35, 5.5], [6.5, 30, 8], [7.6, 23, 12.7], [7, 16, 14.3]], [2.2, 1.9, 1.7, 1.3]), 'sap');
        m.add(S.sphere([7, 11.4, 14.7], 1.9), 'sap');
        m.add(S.torus([0, 27.2, 0], 7.7, 1.2), 'vine');
        m.add(S.chain([[-17, 0, 8], [-13.6, 6, 10.4], [-9.6, 12, 12.8]], [2.4, 2, 1.2]), 'vine');
    },
    potBroken(m) {
        m.add(S.ellipsoid([5, 0.7, 6], [14, 0.9, 8]), 'sap');
        m.add(S.ellipsoid([-5, 3.2, 0], [9, 1.2, 8]), 'sap');
    },
    chest(m, open) {
        if (open) { m.add(S.chain([[-25, 0, 12], [-21, 10, 14.6], [-14, 19, 14.4]], [3, 2.4, 1.4]), 'vine'); return; }
        m.add(S.chain([[-25, 0, 12], [-21, 12, 14.6], [-11, 24, 12.4], [0, 33.4, 4], [9, 34, -5]], [3, 2.6, 2.3, 2, 1.3]), 'vine');
        m.add(S.chain([[-11, 24, 12.6], [-4, 18, 14.6], [3, 14, 15]], [1.4, 1, 0.6]), 'vine');
        m.add(S.ellipsoid([11, 33, 2], [8, 1.6, 6.4]), 'moss');
        glowcap(m, [15, 33.4, 3], 2.4);
    },
    sealed(m, open) {
        if (open) return;
        m.add(S.chain([[-25, 0, 13], [-18, 14, 14.8], [-4, 27, 12], [8, 33.6, 3], [20, 30, -6]], [2.8, 2.5, 2.2, 1.9, 1.3]), 'thorn');
        m.add(S.chain([[25, 0, 13], [19, 12, 14.8], [8, 22, 14.4], [-6, 33.6, 2], [-16, 31, -6]], [2.6, 2.3, 2, 1.7, 1.2]), 'thorn');
        for (const [x, y, z] of [[-12, 20.5, 14.6], [14, 17, 15.4], [1, 31.4, 8.6]]) m.add(S.limb([x, y, z], [x + 1.4, y + 4.6, z + 1.2], 1, 0.2), 'thorn');
    },
    nest(m) { m.add(S.chain([[-27, 0.6, 9], [-16, 6, 14], [-2, 9.5, 15.4], [12, 7, 14.6]], [2, 1.8, 1.5, 0.9]), 'vine'); }
};
const ROOT_LOOKS = { ...LOOKS, wood: { ...LOOKS.wood, lock: 'sap' } };
/** The root-sanctuary picture of each object: the same model, aged, with what grows on it. */
function rooted(row) {
    const kind = ['chest', 'sealed', 'nest', 'pot', 'crate'].find(name => row.name.startsWith(name)), open = row.name.endsWith('Open');
    const dress = row.name === 'crateBroken' ? DRESS.crateBroken : row.name === 'potBroken' ? DRESS.potBroken : row.name === 'nestSpent' ? null : DRESS[kind];
    const grade = row.name.includes('Silver') ? 'silver' : row.name.includes('Gold') ? 'gold' : row.name.startsWith('sealed') ? 'sealed' : 'wood';
    const base = kind === 'chest' || kind === 'sealed' ? () => chest(open ? LID_OPEN : 0, ROOT_LOOKS[grade]) : row.build;
    return { name: row.name, mats: { ...row.mats, ...AGED, ...GROWTH }, build() { const m = base(); if (dress) dress(m, open); return m; } };
}
/** 테마 이름 → 물체 목록. 테마마다 그림 한 장(assets/objects/stage/objects-<테마>.png)이고, 공용은 objects.png다. */
const themes = { root: objects.map(rooted) };

module.exports = { objects, themes, SIZE, FEET };
