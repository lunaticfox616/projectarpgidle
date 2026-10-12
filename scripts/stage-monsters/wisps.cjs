'use strict';
// 속성 위습 여섯(불씨, 서리날개, 전광, 독안개, 성광, 공허)의 옆모습, 오른쪽을 본다. 땅에서 떠 있다(발 자리는 그림자가 지는 곳).
// 생김새와 색은 게임의 기존 그림(assets/enemies/wisps/elemental/*.png)을 따른다: 외눈 불꽃, 지느러미 달린 얼음 결정, 번개를 두른 먹구름 구슬,
// 큰 눈의 독 주머니, 고리를 인 빛 구슬, 눈을 감싼 보랏빛 초승달. 그 그림을 캐릭터 밀도(4배)로 다시 그린 것이다.
// 게임의 위습 외형 18종은 이 여섯 장을 나눠 쓴다(data/wisp-sprites.js WISP_SPRITE_BY_VISUAL → data/monster-sprites.js).
// pose = { state: 'idle' | 'attack', f }. 칸 96, 발 자리 FEET. 위습은 원거리라 공격 그림은 움츠렸다가 앞으로 내뻗으며 빛난다.
const S = require('./render.cjs');
const { through } = require('./paint.cjs');

const IDLE_FRAMES = 6, ATTACK_FRAMES = 6, SIZE = 96, FEET = [48, 84], FLOAT = 28;
/** The models below are drawn at a body of about 25 dots and then grown by GROW about the point under the wisp. */
const GROW = 1.36;
function grown(model) {
    const shrink = p => [p[0] / GROW, p[1] / GROW, p[2] / GROW];
    for (const part of model.parts) {
        const { sdf, paint } = part;
        part.sdf = p => sdf(shrink(p)) * GROW;
        if (paint) part.paint = p => paint(shrink(p));
    }
    for (const mark of model.marks) mark.point = mark.point.map(value => value * GROW);
    return model;
}
/** wind 0..1 (drawing in) and strike 0..1 (thrown forward) for the six attack frames; frame 3 lets the shot go. */
const ATTACK = [[0.35, 0], [0.8, 0], [1, 0], [0.1, 1], [0, 0.55], [0, 0.15]];
/** Where the body floats this frame: x, y, how far the trailing parts sway, a size factor, the flare of the strike, a turning angle. */
function motion(pose) {
    const turn = pose.f / IDLE_FRAMES * Math.PI * 2;
    if (pose.state !== 'attack') return { x: 0, y: FLOAT + 2.2 * Math.sin(turn), sway: 2.4 * Math.sin(turn + 1), size: 1, flare: 0, turn };
    const [wind, strike] = ATTACK[pose.f];
    return { x: -5 * wind + 10 * strike, y: FLOAT + 1.5 * wind - 1.5 * strike, sway: 2 * wind - 4 * strike, size: 1 - 0.1 * wind + 0.1 * strike, flare: strike, turn: pose.f * 0.9 };
}
const near = (p, c, r) => S.len(S.sub(p, c)) < r;
/** A round eye on the side the wisp faces: a pale ball with a dark pupil and a glint. at = the eye's centre. */
function eye(m, at, size, mats = ['white', 'pupil']) {
    m.add(S.sphere(at, size), mats[0]);
    m.add(S.sphere([at[0] + size * 0.52, at[1] - size * 0.05, at[2] + size * 0.62], size * 0.56), mats[1]);
    m.mark([at[0] + size * 0.2, at[1] + size * 0.5, at[2] + size * 1.2], '#ffffff');
}
/** The light it lets go in front of itself on the strike. */
function flash(m, at, mat, reach = 17) {
    if (at.flare > 0.3) m.add(S.sphere([at.x + reach, at.y + 1, 5], 1.4 + 2.4 * at.flare), mat);
}
const EYE = { white: { ramp: through(['#b9a8a0', '#e8dccd', '#fcf6e9', '#ffffff']), unshadowed: true, noEdge: true }, pupil: { ramp: through(['#0e0a12', '#1c141e', '#36262d']), unshadowed: true, noEdge: true } };
const rimmed = (mats, rim) => Object.fromEntries(Object.entries(mats).map(([name, mat]) => [name, { rim, ...mat }]));

// ---------------------------------------------------------------- 불씨: 외눈 불꽃
const fire = {
    id: 'wisp-fire', size: SIZE, feet: FEET,
    mats: rimmed({
        flame: { ramp: through(['#8c1a10', '#a82115', '#d34c38', '#f2643a', '#f86d38', '#fb8437']), glow: 0.22, unshadowed: true },
        core: { ramp: through(['#f86d38', '#fb8a3a', '#fc9b34', '#fcbc69']), glow: 0.3, unshadowed: true, noEdge: true },
        heart: { ramp: through(['#fc9b34', '#fcbc69', '#fddea7', '#fff2bb']), glow: 0.4, unshadowed: true, noEdge: true }, ...EYE
    }, '#931711'),
    build(pose) {
        const m = S.scene(), at = motion(pose), r = 12.5 * at.size, lick = Math.sin(at.turn * 2), body = { group: 'flame', k: 6 };
        const centre = [at.x, at.y, 0];
        const hot = p => (near(p, [at.x + 5, at.y, 9], 7.5 + 2.5 * at.flare) ? 'heart' : near(p, [at.x + 2, at.y - 1, 6], 12.5 + 3 * at.flare) ? 'core' : null);
        m.add(S.sphere(centre, r), 'flame', { ...body, paint: hot });
        // the tongues: a tall one that leans back from the crown, a short one behind it, and the tail the flame hangs by
        m.add(S.chain([[at.x - 1, at.y + 7, 0], [at.x - 5 - at.sway * 0.5, at.y + 18, 0], [at.x - 9 - at.sway + lick, at.y + 27 + lick, 0]], [9 * at.size, 5, 1.3]), 'flame', { ...body, paint: hot });
        m.add(S.chain([[at.x - 8, at.y + 3, -1], [at.x - 14 - at.sway * 0.6, at.y + 11, -1], [at.x - 17 - at.sway - lick, at.y + 17 - lick, -1]], [6.5, 3.4, 1.1]), 'flame', body);
        m.add(S.chain([[at.x, at.y - 8, 0], [at.x - 2 - at.sway * 0.4, at.y - 15, 0], [at.x - 3 - at.sway, at.y - 21, 0]], [6.5 * at.size, 3, 0.9]), 'flame', { ...body, paint: hot });
        eye(m, [at.x + 7.5 * at.size, at.y + 1.5, 8.6 * at.size], 4.1);
        for (let i = 0; i < 2; i++) { const a = at.turn + i * 3.1; m.add(S.sphere([at.x - 13 + 4 * Math.cos(a), at.y + 22 + 6 * Math.sin(a), 3], 1.4), 'core'); }
        flash(m, at, 'heart');
        return grown(m);
    }
};

// ---------------------------------------------------------------- 서리날개: 지느러미 달린 얼음 결정
const ice = {
    id: 'wisp-ice', size: SIZE, feet: FEET,
    mats: rimmed({
        ice: { ramp: through(['#0d5670', '#3f7896', '#6f93b8', '#8da2c9', '#aac0de', '#cadff3', '#eff5fa', '#ffffff']), gloss: true, glossAt: 0.9, sheen: 0.3 },
        slit: { ramp: through(['#053c4f', '#0d5670', '#1d6f88']), noEdge: true }, glint: { ramp: through(['#cadff3', '#eff5fa', '#ffffff']), glow: 0.4, unshadowed: true, noEdge: true }
    }, '#084257'),
    build(pose) {
        const m = S.scene(), at = motion(pose), k = at.size, tip = 0.12 * Math.sin(at.turn);
        const turned = (solid, angle, pivot) => S.moved(solid, p => S.rotz(p, -angle, pivot));
        // a long shard that points down, a blunt crown set a little back, two fins that beat slowly
        m.add(turned(S.octa([at.x, at.y - 2, 0], [13 * k, 23 * k, 10 * k]), 0.1, [at.x, at.y, 0]), 'ice');
        m.add(turned(S.octa([at.x - 1.5, at.y + 9, -1], [11 * k, 13 * k, 8.5 * k]), -0.16, [at.x, at.y + 9, 0]), 'ice');
        const beat = 0.3 * Math.sin(at.turn) - 0.5 * at.flare;
        m.add(turned(S.octa([at.x - 16, at.y + 3, -1], [9.5, 4.6, 3]), 0.35 + beat, [at.x - 9, at.y + 2, 0]), 'ice');
        m.add(turned(S.octa([at.x + 13, at.y + 1, 5], [7, 3.6, 2.6]), -0.3 - beat, [at.x + 8, at.y + 1, 5]), 'ice');
        m.add(S.ellipsoid([at.x + 4.6, at.y + 2, 6.6 * k], [1.3, 5.2, 1.4], tip), 'slit');
        for (let i = 0; i < 2; i++) { const a = at.turn + i * 3.1; m.add(S.octa([at.x - 15 + 5 * Math.cos(a), at.y - 14 + 5 * Math.sin(a), 2], [1.8, 2.8, 1.6]), 'ice'); }
        flash(m, at, 'glint');
        return grown(m);
    }
};

// ---------------------------------------------------------------- 전광: 번개를 두른 먹구름 구슬
const lightning = {
    id: 'wisp-lightning', size: SIZE, feet: FEET,
    mats: rimmed({
        storm: { ramp: through(['#1c2233', '#2f3f4d', '#425a65', '#53737f', '#6d909b', '#89b3bb', '#b6dbdf']), gloss: true, glossAt: 0.92, mottle: [0.14, 0.12] },
        bolt: { ramp: through(['#d8af40', '#f6cb5e', '#fad46e', '#fde8aa', '#fdf9f3']), glow: 0.4, unshadowed: true }, ...EYE
    }, '#2f3395'),
    build(pose) {
        const m = S.scene(), at = motion(pose), r = 12.5 * at.size, jag = pose.f % 2 ? 1 : -1, long = 1 + 0.5 * at.flare;
        m.add(S.sphere([at.x, at.y + 2, 0], r), 'storm');
        m.add(S.ellipsoid([at.x - 5, at.y + 8, -3], [9, 7.5, 8]), 'storm');
        // the bolts jump from frame to frame: one hangs below, one trails behind, a short one crackles in front
        const bolt = (points, radii) => m.add(S.chain(points, radii), 'bolt');
        bolt([[at.x - 1, at.y - 8, 2], [at.x + 4 * jag, at.y - 14, 2], [at.x - 3 * jag, at.y - 19, 2], [at.x + 2 * jag, at.y - 27 * long, 2]], [3, 2.5, 2.1, 0.7]);
        bolt([[at.x - 10, at.y + 3, 1], [at.x - 16, at.y + 7 * jag * 0.6 + 3, 1], [at.x - 19, at.y + 1, 1], [at.x - 24 * long, at.y + 5 * jag * 0.5 + 2, 1]], [2.8, 2.3, 2, 0.7]);
        bolt([[at.x + 8, at.y - 7, 6], [at.x + 13, at.y - 9 - jag, 6], [at.x + 12, at.y - 13, 6], [at.x + 15 * long, at.y - 16 + jag, 6]], [2.2, 1.9, 1.6, 0.6]);
        eye(m, [at.x + 7.6 * at.size, at.y + 4, 8.6 * at.size], 3.9);
        flash(m, at, 'bolt');
        return grown(m);
    }
};

// ---------------------------------------------------------------- 독안개: 큰 눈의 독 주머니
const poison = {
    id: 'wisp-poison', size: SIZE, feet: FEET,
    mats: rimmed({
        bulb: { ramp: through(['#2c4a2c', '#4f6240', '#6e794d', '#8a8f56', '#a4a55f', '#c0bf6a', '#e0de88', '#f5f19f']), gloss: true, glossAt: 0.93, mottle: [0.16, 0.1] },
        sprout: { ramp: through(['#034d28', '#186c30', '#4f8a3a', '#8fb04a']) },
        orb: { ramp: through(['#1c1018', '#2a1a24', '#553a46', '#7a5a66', '#c9b0b8']), gloss: true, glossAt: 0.9 },
        mist: { ramp: through(['#a1bc2d', '#bdc24f', '#efed97']), glow: 0.3, unshadowed: true, noEdge: true }
    }, '#04512b'),
    build(pose) {
        const m = S.scene(), at = motion(pose), k = at.size, body = { group: 'bulb', k: 5 }, drip = (pose.f % 3) * 1.6;
        m.add(S.ellipsoid([at.x, at.y + 3, 0], [13 * k, 14 * k, 12 * k]), 'bulb', body);
        m.add(S.chain([[at.x - 1, at.y - 8, 0], [at.x - 2 - at.sway * 0.4, at.y - 15, 0], [at.x - 1 - at.sway * 0.8, at.y - 20, 0]], [6.5, 3.3, 2.6]), 'bulb', body);
        m.add(S.sphere([at.x - 1 - at.sway * 0.8, at.y - 23 - drip, 0], 2.4 - drip * 0.25), 'bulb');
        m.add(S.chain([[at.x - 2, at.y + 15, 0], [at.x, at.y + 19, 0], [at.x + 3 + at.sway * 0.4, at.y + 21, 0]], [2.6, 1.8, 0.9]), 'sprout');
        const socket = [at.x + 8.4 * k, at.y + 3.5, 7 * k];
        m.add(S.ellipsoid(socket, [4.9, 5.7, 3.6]), 'orb');
        m.mark([socket[0] - 0.5, socket[1] + 2.6, socket[2] + 3.4], '#f5f19f');
        m.mark([socket[0] + 0.5, socket[1] + 2.6, socket[2] + 3.4], '#f5f19f');
        for (let i = 0; i < 2; i++) { const a = at.turn + i * 3.1; m.add(S.sphere([at.x - 16 + 4 * Math.cos(a), at.y + 6 + 9 * Math.sin(a), 2], 1.6), 'mist'); }
        flash(m, at, 'mist');
        return grown(m);
    }
};

// ---------------------------------------------------------------- 성광: 고리를 인 빛 구슬
const holy = {
    id: 'wisp-holy', size: SIZE, feet: FEET,
    mats: rimmed({
        light: { ramp: through(['#b59049', '#d9c08a', '#f1debd', '#fbe9c8', '#fdf1d3', '#fdfdfd']), glow: 0.14 },
        gold: { ramp: through(['#8e5c02', '#b68d39', '#f5b236', '#fdc03c', '#ffd767', '#fdebb9']), glow: 0.22, unshadowed: true },
        slit: { ramp: through(['#492005', '#532605', '#7b4500']), noEdge: true, unshadowed: true }
    }, '#7b4500'),
    build(pose) {
        const m = S.scene(), at = motion(pose), k = at.size, body = { group: 'light', k: 5 };
        m.add(S.ellipsoid([at.x, at.y, 0], [12.5 * k, 13.5 * k, 11.5 * k]), 'light', body);
        m.add(S.limb([at.x, at.y - 9, 0], [at.x - at.sway * 0.4, at.y - 20, 0], 6.5, 0.8), 'light', body);
        m.add(S.ellipsoid([at.x - 12.5, at.y + 3 + 1.5 * Math.sin(at.turn), 2], [5, 2.6, 2.4], 0.6 + 0.3 * Math.sin(at.turn)), 'light', { group: 'light', k: 2 });
        // the halo floats above and tips a little with the body's bob
        m.add(S.moved(S.torus([at.x - 1, at.y + 22, 0], 8.6 + 1.5 * at.flare, 2), p => S.rotz(p, 0.12 * Math.sin(at.turn), [at.x - 1, at.y + 22, 0])), 'gold');
        m.add(S.ellipsoid([at.x + 6.6 * k, at.y + 1.5, 8.6 * k], [4.2, 5.2, 3]), 'gold');
        m.add(S.ellipsoid([at.x + 7.6 * k, at.y + 1.5, 11 * k], [1, 3.6, 1.2]), 'slit');
        flash(m, at, 'gold');
        return grown(m);
    }
};

// ---------------------------------------------------------------- 공허: 눈을 감싼 보랏빛 초승달
const voidWisp = {
    id: 'wisp-void', size: SIZE, feet: FEET,
    mats: rimmed({
        veil: { ramp: through(['#2b1c30', '#56516d', '#6e6184', '#8b7399', '#a58bb2', '#bfa1c5', '#e0cfe6']), rimLight: 0.2, mottle: [0.15, 0.1] },
        pit: { ramp: through(['#120a18', '#1e1224', '#352137', '#5a1989']), gloss: true, glossAt: 0.9, noEdge: true },
        spark: { ramp: through(['#774097', '#b99abf', '#f7f1fa']), glow: 0.35, unshadowed: true, noEdge: true }
    }, '#4a0786'),
    build(pose) {
        const m = S.scene(), at = motion(pose), k = at.size, open = 1 + 0.25 * at.flare;
        // a ball with its face scooped out: the horns curl forward round the dark eye that floats in the hollow
        const scoop = [at.x + 7.5, at.y + 3, 4], hollow = 11.4 * k * open;
        const moon = S.without(S.sphere([at.x - 2, at.y + 2, 0], 14 * k), S.sphere(scoop, hollow));
        m.add(moon, 'veil', { group: 'veil', k: 4, paint: p => (S.len(S.sub(p, scoop)) < hollow + 0.7 ? 'pit' : null) });
        m.add(S.chain([[at.x - 6, at.y - 9, 0], [at.x - 8 - at.sway * 0.5, at.y - 17, 0], [at.x - 4 - at.sway, at.y - 24, 0]], [5.6, 3, 0.9]), 'veil', { group: 'veil', k: 4 });
        const pit = [at.x + 5, at.y + 3, 2];
        m.add(S.sphere(pit, 2.3 * k + 1.2 * at.flare), 'spark');
        for (let i = 0; i < 3; i++) { const a = at.turn + i * 2.1; m.add(S.sphere([at.x - 17 + 3 * Math.cos(a), at.y + 4 + 13 * Math.sin(a), 2], 1.3), 'spark'); }
        flash(m, at, 'spark');
        return grown(m);
    }
};

module.exports = { monsters: [fire, ice, lightning, poison, holy, voidWisp], IDLE_FRAMES, ATTACK_FRAMES };
