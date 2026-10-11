'use strict';
// 속성 위습 여섯(불씨, 서리, 전광, 독안개, 성광, 공허)의 옆모습, 오른쪽을 본다. 땅에서 떠 있다(발 자리는 그림자가 지는 곳).
// 게임의 위습 외형 18종은 이 여섯 장을 나눠 쓴다(data/wisp-sprites.js WISP_SPRITE_BY_VISUAL → data/monster-sprites.js).
// pose = { state: 'idle' | 'attack', f }. 칸 96, 발 자리 FEET. 위습은 원거리라 공격 그림은 움츠렸다가 앞으로 내뻗으며 빛난다.
const S = require('./render.cjs');
const { ramp } = S;

const IDLE_FRAMES = 6, ATTACK_FRAMES = 6, SIZE = 96, FEET = [48, 84], FLOAT = 31;
/** The models below are drawn at a body of about 24 dots and then grown by GROW about the point under the wisp. */
const GROW = 1.3;
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
    return { x: -5 * wind + 11 * strike, y: FLOAT + 1.5 * wind - 1.5 * strike, sway: 2 * wind - 4 * strike, size: 1 - 0.1 * wind + 0.12 * strike, flare: strike, turn: pose.f * 0.9 };
}
const near = (p, c, r) => S.len(S.sub(p, c)) < r;
/** A tapering tail trailing down and back from the body. */
function tail(m, at, mat, group, reach = 1) {
    m.add(S.chain([[at.x - 2, at.y - 8 * at.size, 0], [at.x - 7 - at.sway, at.y - 17 * reach, 1], [at.x - 10 - at.sway * 1.8, at.y - 25 * reach, 0]],
        [7 * at.size, 3.8, 1.3]), mat, { group, k: 5 });
}
/** Two eyes on the side the wisp faces, on a body of radius about 12. */
function eyes(m, at, mat, glint) {
    const first = [at.x + 6.5 * at.size, at.y + 2, 9.5 * at.size], second = [at.x + 10.6 * at.size, at.y + 1.6, 4.4 * at.size];
    m.add(S.ellipsoid(first, [1.7, 2.8, 1.5]), mat);
    m.add(S.ellipsoid(second, [1.5, 2.6, 1.4]), mat);
    m.mark([first[0] - 0.4, first[1] + 1.7, first[2] + 1.7], glint);
    m.mark([second[0] - 0.2, second[1] + 1.6, second[2] + 1.6], glint);
}
/** Small lights circling behind the body. */
function motes(m, at, mat, count, radius = 1.5) {
    for (let i = 0; i < count; i++) {
        const angle = at.turn + i * (Math.PI * 2 / count);
        m.add(S.sphere([at.x - 15 + 6 * Math.cos(angle), at.y + 2 + 15 * Math.sin(angle), 5 - i * 3], radius), mat);
    }
}

// ---------------------------------------------------------------- 불씨
const fire = {
    id: 'wisp-fire', size: SIZE, feet: FEET,
    mats: { flame: { ramp: ramp('#e56a22', { cool: 30, warm: 26 }), glow: true }, core: { ramp: ramp('#ffd45a', { cool: 24, warm: 10 }), glow: true },
        ember: { ramp: ramp('#b23a1a', { cool: 26, warm: 20 }) }, eye: { ramp: ramp('#3a140c', { cool: 6, warm: 4 }) } },
    build(pose) {
        const m = S.scene(), at = motion(pose), r = 12 * at.size;
        const hot = p => (near(p, [at.x + 3, at.y - 2, r * 0.8], 7.5 + 3 * at.flare) ? 'core' : null);
        m.add(S.sphere([at.x, at.y, 0], r), 'flame', { group: 'body', k: 6, paint: hot });
        m.add(S.chain([[at.x - 1, at.y + 8, 0], [at.x - 4 + at.sway, at.y + 18, 0], [at.x - 2 + at.sway * 1.7, at.y + 27 + 4 * at.flare, 0]], [9 * at.size, 5.4, 1.5]),
            'flame', { group: 'body', k: 6 });
        m.add(S.chain([[at.x - 8, at.y + 4, 2], [at.x - 13 - at.sway, at.y + 14, 2]], [5, 1.3]), 'flame', { group: 'body', k: 5 });
        m.add(S.chain([[at.x + 7, at.y + 6, -2], [at.x + 10 + at.sway * 0.6, at.y + 14, -2]], [4, 1.2]), 'flame', { group: 'body', k: 5 });
        tail(m, at, 'ember', 'tail');
        eyes(m, at, 'eye', '#ffe9a8');
        motes(m, at, 'core', 3);
        return m;
    }
};

// ---------------------------------------------------------------- 서리
const ice = {
    id: 'wisp-ice', size: SIZE, feet: FEET,
    mats: { ice: { ramp: ramp('#7cc4ec', { cool: 22, warm: 30 }), gloss: true }, frost: { ramp: ramp('#d5f0ff', { cool: 18, warm: 10 }), gloss: true },
        deep: { ramp: ramp('#3f7fc0', { cool: 20, warm: 20 }), gloss: true }, eye: { ramp: ramp('#10283e', { cool: 4, warm: 4 }) } },
    build(pose) {
        const m = S.scene(), at = motion(pose), s = at.size, c = [at.x, at.y, 0];
        m.add(S.octa(c, [11 * s, 17 * s, 10 * s]), 'ice', { paint: p => (p[1] > at.y + 3 && p[0] < at.x + 1 ? 'frost' : null) });
        for (const z of [-1, 1]) {
            const root = [at.x - 5, at.y + 3, z * 4], flap = 0.45 + 0.1 * at.sway * z + 0.5 * at.flare;
            m.add(S.moved(S.octa([root[0] - 10, root[1], root[2]], [11, 4.2, 3.6]), p => S.rotz(p, flap * (z > 0 ? 1 : 0.7), root)), z > 0 ? 'frost' : 'deep');
        }
        m.add(S.octa([at.x - 3 - at.sway * 0.6, at.y - 19, 0], [4.4, 8, 4.4]), 'deep');
        m.add(S.octa([at.x - 9 - at.sway, at.y - 27, 1], [2.6, 4.6, 2.6]), 'ice');
        m.add(S.ellipsoid([at.x + 4.6 * s, at.y + 1, 5.8 * s], [1.5, 2.6, 1.3]), 'eye');
        m.add(S.ellipsoid([at.x + 7.6 * s, at.y + 0.6, 2.6 * s], [1.3, 2.3, 1.2]), 'eye');
        for (let i = 0; i < 3; i++) {
            const angle = at.turn + i * 2.1;
            m.add(S.octa([at.x + 15 * Math.cos(angle) - 4, at.y + 16 * Math.sin(angle), 7 - i * 4], [1.8, 2.8, 1.8]), 'frost');
        }
        return m;
    }
};

// ---------------------------------------------------------------- 전광
const lightning = {
    id: 'wisp-lightning', size: SIZE, feet: FEET,
    mats: { spark: { ramp: ramp('#ffe45e', { cool: 26, warm: 8 }), glow: true }, white: { ramp: ramp('#fffbe0', { cool: 20, warm: 4 }), glow: true },
        bolt: { ramp: ramp('#7f7df2', { cool: 20, warm: 40 }), glow: true }, eye: { ramp: ramp('#2a2350', { cool: 4, warm: 4 }) } },
    build(pose) {
        const m = S.scene(), at = motion(pose), r = 9.5 * at.size, c = [at.x, at.y, 0];
        m.add(S.sphere(c, r), 'spark', { paint: p => (near(p, [at.x + 2, at.y + 1, r * 0.8], 5.5 + 3 * at.flare) ? 'white' : null) });
        for (let i = 0; i < 5; i++) {
            const angle = i * 1.2566 + 0.5 + (pose.f % 2 ? 0.22 : -0.1) + at.turn * 0.15, dir = [Math.cos(angle), Math.sin(angle)], side = i % 2 ? 1 : -1;
            const reach = (17 + (i * 3 + pose.f * 2) % 5 + 5 * at.flare) * at.size;
            const from = [at.x + dir[0] * r * 0.7, at.y + dir[1] * r * 0.7, 0], bend = [at.x + dir[0] * reach * 0.6 - dir[1] * 4 * side, at.y + dir[1] * reach * 0.6 + dir[0] * 4 * side, 1];
            m.add(S.chain([from, bend, [at.x + dir[0] * reach, at.y + dir[1] * reach, 0]], [3, 2, 0.7]), 'bolt');
        }
        eyes(m, { ...at, size: at.size * 0.78 }, 'eye', '#ffffff');
        motes(m, at, 'white', 2, 1.3);
        return m;
    }
};

// ---------------------------------------------------------------- 독안개
const poison = {
    id: 'wisp-poison', size: SIZE, feet: FEET,
    mats: { toxin: { ramp: ramp('#6aa838', { cool: 34, warm: 22 }), gloss: true }, toxinDark: { ramp: ramp('#3f7a2c', { cool: 26, warm: 12 }), gloss: true },
        bubble: { ramp: ramp('#c8ea7c', { cool: 26, warm: 10 }), gloss: true }, eye: { ramp: ramp('#16260e', { cool: 4, warm: 4 }) } },
    build(pose) {
        const m = S.scene(), at = motion(pose), s = at.size;
        const spots = p => (Math.sin(p[0] * 0.8 + 1) * Math.sin(p[1] * 0.75) > 0.78 ? 'toxinDark' : null);
        m.add(S.sphere([at.x, at.y, 0], 11.5 * s), 'toxin', { group: 'body', k: 7, paint: spots });
        m.add(S.sphere([at.x - 7, at.y - 5, 2], 9 * s), 'toxin', { group: 'body', k: 7, paint: spots });
        m.add(S.sphere([at.x + 4, at.y + 7, -1], 7.5 * s), 'toxin', { group: 'body', k: 7 });
        m.add(S.chain([[at.x + 2, at.y - 9, 2], [at.x + 2 + at.sway * 0.4, at.y - 19 - 2 * Math.sin(at.turn), 2]], [4.2, 2]), 'toxin', { group: 'body', k: 5 });
        m.add(S.chain([[at.x - 9, at.y - 11, 1], [at.x - 10 - at.sway, at.y - 20, 1]], [3.6, 1.5]), 'toxinDark', { group: 'body', k: 5 });
        m.add(S.sphere([at.x + 2 + at.sway * 0.4, at.y - 26 - 3 * Math.sin(at.turn), 2], 2), 'toxin');
        eyes(m, at, 'eye', '#e6ffb0');
        for (let i = 0; i < 3; i++) {
            const lift = ((pose.f + i * 2) % 6) / 6;
            m.add(S.sphere([at.x - 12 + i * 7, at.y + 13 + lift * 14, 4 - i * 2], 2.6 - lift * 1.4), 'bubble');
        }
        return m;
    }
};

// ---------------------------------------------------------------- 성광
const holy = {
    id: 'wisp-holy', size: SIZE, feet: FEET,
    mats: { light: { ramp: ramp('#f0d98a', { cool: 30, warm: 8 }), glow: true }, white: { ramp: ramp('#fffdf0', { cool: 22, warm: 4 }), glow: true },
        gold: { ramp: ramp('#d9a23a', { cool: 26, warm: 14 }), gloss: true }, feather: { ramp: ramp('#f4efe0', { cool: 26, warm: 6 }) },
        eye: { ramp: ramp('#5a3d18', { cool: 6, warm: 4 }) } },
    build(pose) {
        const m = S.scene(), at = motion(pose), r = 11 * at.size, crown = [at.x - 1, at.y + 16 + at.flare * 2, 0];
        m.add(S.sphere([at.x, at.y, 0], r), 'light', { group: 'body', k: 5, paint: p => (near(p, [at.x + 3, at.y + 1, r * 0.8], 6 + 3 * at.flare) ? 'white' : null) });
        m.add(S.moved(S.torus(crown, 8.5, 1.5), p => S.rotz(p, 0.22, crown)), 'gold');
        for (const z of [-1, 1]) {
            const root = [at.x - 7, at.y + 2, z * 6], flap = 0.5 + 0.12 * at.sway * z + 0.5 * at.flare;
            m.add(S.moved(S.ellipsoid([root[0] - 9, root[1], root[2]], [10, 4.6, 2.6]), p => S.rotz(p, flap * (z > 0 ? 1 : 0.75), root)), 'feather');
            m.add(S.moved(S.ellipsoid([root[0] - 7, root[1] - 5, root[2]], [7, 3, 2.2]), p => S.rotz(p, flap * 0.5, root)), 'feather');
        }
        tail(m, at, 'light', 'body', 0.85);
        eyes(m, at, 'eye', '#ffffff');
        motes(m, at, 'white', 2, 1.3);
        return m;
    }
};

// ---------------------------------------------------------------- 공허
const voidWisp = {
    id: 'wisp-void', size: SIZE, feet: FEET,
    mats: { void: { ramp: ramp('#33204f', { cool: 14, warm: 30 }), gloss: true }, rim: { ramp: ramp('#b07af0', { cool: 24, warm: 24 }), glow: true },
        pupil: { ramp: ramp('#f3e6ff', { cool: 20, warm: 6 }), glow: true } },
    build(pose) {
        const m = S.scene(), at = motion(pose), s = at.size, c = [at.x, at.y, 0];
        m.add(S.sphere(c, 11.5 * s), 'void', { group: 'body', k: 5 });
        m.add(S.without(S.sphere(c, 15.5 * s), S.sphere([at.x + 6, at.y + 2, 4], 15 * s)), 'rim');
        tail(m, at, 'void', 'body');
        m.add(S.sphere([at.x - 10 - at.sway * 1.8, at.y - 25, 0], 2.2), 'rim');
        const eye = [at.x + 7.6 * s, at.y + 1, 8.2 * s];
        m.add(S.ellipsoid(eye, [2.6 + at.flare, 3.9 + at.flare, 2.2]), 'pupil');
        m.mark([eye[0], eye[1], eye[2] + 2.4], '#2a1440');
        motes(m, at, 'rim', 3, 1.6);
        return m;
    }
};

const monsters = [fire, ice, lightning, poison, holy, voidWisp].map(wisp => ({ ...wisp, build: pose => grown(wisp.build(pose)) }));
module.exports = { monsters, IDLE_FRAMES, ATTACK_FRAMES };
