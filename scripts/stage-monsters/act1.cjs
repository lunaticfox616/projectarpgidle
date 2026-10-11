'use strict';
// 액트 1 몬스터(수액 슬라임, 뿌리 일개미, 뿌리 웜)의 옆모습, 오른쪽을 본다. pose = { state: 'idle' | 'attack', f }.
// 생김새와 색은 게임의 기존 그림(assets/enemies/bugs/act1-*.png, 위에서 보는 전장용 48칸 시트의 옆줄)을 따른다:
// 씨앗이 비치는 호박색 수액 더미, 배가 큰 붉은 개미, 바닥을 기는 살구색 애벌레. 그 그림을 캐릭터 밀도(4배)로 다시 그린 것이다.
// 칸 96, 발 자리 feet. 게임 쪽 규격은 data/monster-sprites.js MONSTER_STAGE_SHEETS(높이, 발 자리)와 MONSTER_STAGE_KIND(프레임 시간).
const S = require('./render.cjs');
const { through } = require('./paint.cjs');
const { rotz } = S;

const IDLE_FRAMES = 6, ATTACK_FRAMES = 6;
/** wind 0..1 (drawing back) and strike 0..1 (thrown forward) for the six attack frames; frame 3 is the hit. */
const ATTACK = [[0.35, 0], [0.8, 0], [1, 0], [0.1, 1], [0, 0.55], [0, 0.15]];
function phase(pose) {
    if (pose.state === 'attack') return { turn: 0, breath: 0, wind: ATTACK[pose.f][0], strike: ATTACK[pose.f][1] };
    const turn = pose.f / IDLE_FRAMES * Math.PI * 2;
    return { turn, breath: Math.sin(turn), wind: 0, strike: 0 };
}
/** The outline the older bug pictures wear: a near-black violet. */
const INK = '#0d0616';

// ---------------------------------------------------------------- 수액 슬라임: 씨앗 하나가 비치는 호박색 수액 더미
const slime = {
    id: 'act1-slime', size: 96, feet: [44, 84],
    mats: {
        sap: { ramp: through(['#4a2710', '#74431f', '#8f562c', '#ac6a30', '#c88132', '#df9137', '#f6b65b', '#fcead3']), gloss: true, glossAt: 0.975, rimLight: 0.26, rim: INK },
        deep: { ramp: through(['#3a1e0e', '#5a3218', '#74431f', '#8f562c', '#a3642f']), rim: INK, noEdge: true },
        vein: { ramp: through(['#c88132', '#df9137', '#f0a84a', '#f6b65b']), rim: INK, noEdge: true, unshadowed: true },
        seed: { ramp: through(['#1c0f10', '#33201c', '#422a24', '#5a3b32', '#7a5444', '#b08a70']), gloss: true, glossAt: 0.9, rim: INK }
    },
    build(pose) {
        const m = S.scene(), { breath, wind, strike } = phase(pose);
        // q: how tall the mound stands (it sinks as it gathers and stretches low as it is thrown), lean: how far it is thrown
        const q = 1 + 0.06 * breath - 0.3 * wind - 0.22 * strike, wide = 1 / Math.sqrt(q), lean = -4 * wind + 17 * strike;
        const seed = [14 + lean * 1.25 + 1.2 * breath, 13.5 * q + 1, 12.5];
        const body = { group: 'body', k: 9, paint: p => {
            if (S.len(S.sub(p, seed)) < 11.5) return 'deep';
            // pale threads of sap that run from the seed up into the mound
            const dx = p[0] - (seed[0] - 13), dy = p[1] - seed[1];
            if (p[2] > 6 && dx < 0 && dx > -17 && Math.abs(dy - 3 - dx * dx * 0.045 * q) < 1) return 'vein';
            return p[2] > 6 && dx > -9 && dx < 0 && Math.abs(dy + 2 + dx * 0.55) < 0.9 ? 'vein' : null;
        } };
        m.add(S.ellipsoid([lean * 0.3, 13 * q, 0], [28 * wide, 16 * q, 18 * wide]), 'sap', body);
        m.add(S.ellipsoid([-7 + lean * 0.5, 31 * q, -1], [15 * wide, 23 * q, 13]), 'sap', body);
        m.add(S.ellipsoid([15 + lean, 13 * q, 3], [14 + 8 * strike, 12.5 * q, 13]), 'sap', body);
        m.add(S.ellipsoid([2 + lean * 0.2, 2.6, 2], [31 * wide, 4, 20 * wide]), 'sap', { group: 'body', k: 5 });
        for (const [x, z, r] of [[-29, 7, 4], [-13, 20, 3.4], [20, 18, 3.8], [32, 6, 3.2]]) m.add(S.ellipsoid([x * wide + lean * 0.15, r * 0.5, z], [r * 1.4, r * 0.7, r]), 'sap', { group: 'body', k: 4 });
        m.add(S.sphere(seed, 8), 'seed');
        m.mark([seed[0] - 2.5, seed[1] + 3.5, seed[2] + 7], '#fcead3');
        m.mark([seed[0] - 1.5, seed[1] + 3.5, seed[2] + 7], '#fcead3');
        return m;
    }
};

// ---------------------------------------------------------------- 뿌리 일개미: 배가 크고 턱이 밝은 붉은 개미
const SHELL = ['#2a1218', '#4b2527', '#6a302c', '#8f4132', '#a84a35', '#bf5b3c', '#d67549', '#f89b62'];
const ant = {
    id: 'act1-ant', size: 96, feet: [42, 84],
    mats: {
        shell: { ramp: through(SHELL), gloss: true, glossAt: 0.93, sheen: 0.3, rimDark: 0.1, rim: INK },
        band: { ramp: through(['#1f0e14', '#3a1c20', '#552826', '#6a302c']), rim: INK, noEdge: true },
        leg: { ramp: through(['#1f1016', '#3a1c20', '#5a2a28', '#7a392f', '#974532']), rim: INK },
        legFar: { ramp: through(['#170c14', '#2a151b', '#40201f', '#552826']), rim: INK, noEdge: true },
        jaw: { ramp: through(['#6a4526', '#a76645', '#da8145', '#f4bd78', '#fcdaa3']), rim: INK },
        eye: { ramp: through(['#0a0614', '#150d1c', '#2c1a29']), rim: INK, noEdge: true }
    },
    build(pose) {
        const m = S.scene(), { turn, breath, wind, strike } = phase(pose);
        const shift = -5 * wind + 10 * strike, bob = 0.8 * breath - 1.4 * wind + 1 * strike, tilt = 0.1 * wind - 0.16 * strike, hip = [shift, 19 + bob, 0];
        const at = p => rotz([p[0] + shift, p[1] + bob, p[2]], tilt, hip);
        // three legs a side from under the thorax: up to a knee, down to the ground, a short foot. The feet keep their ground.
        const walk = pose.state === 'idle' ? 0 : 0.4;
        for (const [mat, z] of [['legFar', -1], ['leg', 1]]) {
            for (const [x, reach, high] of [[8, 13, 26], [3, -1, 28], [-3, -16, 27]]) {
                const foot = [x + reach + shift * walk, 0.9, z * 14], knee = at([x + reach * 0.45, high, z * 10.5]);
                m.add(S.chain([at([x, 16, z * 4]), knee, [foot[0] - 1.5, 3.5, foot[2]], [foot[0] + 3.5, 0.9, foot[2] + z * 0.5]], [1.9, 1.6, 1.2, 1]), mat);
            }
        }
        const swell = 1 + 0.03 * breath, belly = at([-25, 23.5, 0]);
        m.add(S.ellipsoid(belly, [17 * swell, 12.6 * swell, 11.6 * swell], tilt + 0.24), 'shell', { paint: p => {
            const q = rotz(p, -(tilt + 0.24), belly), along = q[0] - belly[0];
            return along < 9 && along > -13 && Math.abs(((along + 40) % 7.5) - 3.75) > 3.1 ? 'band' : null;
        } });
        m.add(S.sphere(at([-8.5, 18.5, 0]), 3.6), 'shell');
        m.add(S.ellipsoid(at([3, 20.5, 0]), [11.5, 7.6, 7], tilt - 0.08), 'shell');
        const head = at([22, 22.5 + 1.5 * wind, 0]), nod = tilt - 0.28 - 0.25 * strike;
        m.add(S.ellipsoid(head, [9.6, 8.6, 8], nod), 'shell');
        m.add(S.ellipsoid([head[0] + 2.6, head[1] + 2.2, head[2] + 6.4], [2.3, 2.9, 1.7]), 'eye');
        m.mark([head[0] + 2.2, head[1] + 3.6, head[2] + 7.6], '#f8c9a0');
        // mandibles: open while it draws back, shut on the strike
        const gape = 0.2 + 0.7 * wind - 0.25 * strike;
        for (const z of [-1, 1]) {
            const root = rotz([head[0] + 7, head[1] - 4.6, z * 3], nod, head);
            m.add(S.chain([root, rotz([root[0] + 6.5, root[1] - 2.4, root[2] + z * 1.6], -gape * 0.5 * z, root), rotz([root[0] + 10.5, root[1] + 0.6, root[2] - z * 0.6], -gape * z, root)], [2.1, 1.7, 0.9]), 'jaw');
            // antennae: a long first joint up from the brow, then a bent whip that sways
            const brow = rotz([head[0] + 3, head[1] + 6.6, z * 3], nod, head), sway = 0.9 * Math.sin(turn + z) - 3 * wind + 2 * strike;
            const elbow = [brow[0] + 6, brow[1] + 9.5 + sway * 0.5, brow[2] + z * 2];
            m.add(S.chain([brow, elbow, [elbow[0] + 6, elbow[1] + 0.5 + sway * 0.6, elbow[2] + z], [elbow[0] + 11, elbow[1] - 2 + sway, elbow[2] + z * 1.5]], [1.3, 1.1, 1, 0.8]), z < 0 ? 'legFar' : 'leg');
        }
        return m;
    }
};

// ---------------------------------------------------------------- 뿌리 웜: 머리가 짙은 살구색 애벌레, 바닥을 긴다
const worm = {
    id: 'act1-worm', size: 96, feet: [46, 84],
    mats: {
        skin: { ramp: through(['#3e2a2c', '#6f433b', '#94685f', '#a9786a', '#c08e7a', '#d2a691', '#f0c5ac']), sheen: 0.18, mottle: [0.16, 0.1], rim: INK },
        fold: { ramp: through(['#33222a', '#523534', '#6f433b', '#8c645b']), rim: INK, noEdge: true },
        head: { ramp: through(['#1d1321', '#33222a', '#402a2c', '#523534', '#673f38', '#8c645b']), gloss: true, glossAt: 0.95, rim: INK, glow: -0.06 },
        foot: { ramp: through(['#6f433b', '#a9786a', '#d2a691']), rim: INK, noEdge: true },
        jaw: { ramp: through(['#150d1c', '#2c1a24', '#402a2c']), rim: INK, noEdge: true }
    },
    build(pose) {
        const m = S.scene(), { turn, wind, strike } = phase(pose), idle = pose.state === 'idle';
        // seven rings from the tail to the neck; a wave of swelling runs forward along them, and the attack bunches then throws them
        const radii = [7.4, 10.2, 12.2, 13.2, 13, 12, 10.6], gap = 8.6 * (1 - 0.24 * wind + 0.14 * strike), tail = -28 + 5 * wind + 4 * strike;
        const rings = radii.map((radius, i) => {
            const wave = idle ? Math.sin(turn - i * 0.95) : 0, r = radius * (1 + 0.07 * wave + 0.1 * wind * Math.sin(i * 0.9) - 0.05 * strike);
            const lift = (2.2 * wind * Math.sin(i / 6 * Math.PI) + strike * 5 * Math.pow(i / 6, 2.4)) * 1.6;
            return { at: [tail + i * gap + 0.7 * wave, r + lift, 0], r };
        });
        rings.forEach(({ at, r }, i) => m.add(S.ellipsoid(at, [6.1, r, r * 0.96]), 'skin', { group: 'body', k: 1.6, local: p => [p[0] - at[0] + i * 9, p[1] - at[1], p[2]],
            paint: p => (Math.abs(p[0] - at[0]) > 4.8 ? 'fold' : null) }));
        const neck = rings[6].at, head = [neck[0] + 9 + 2 * strike, neck[1] - 1.4 + 1.2 * strike, 0];
        m.add(S.ellipsoid(head, [8.4, 8.4, 8]), 'head');
        m.mark([head[0] + 1, head[1] + 3.6, 7.6], '#f0c5ac');
        const gape = 0.5 * wind + 0.9 * strike;
        for (const z of [-1, 1]) m.add(S.limb([head[0] + 5.6, head[1] - 2.6 - z * gape * 1.2, z * 2.4], [head[0] + 9.4, head[1] - 3.4 - z * gape * 2, z * 1.2], 1.5, 0.7), 'jaw');
        // three pairs of stub feet under the front rings
        for (const i of [4, 5, 6]) for (const z of [-1, 1]) {
            const ring = rings[i], under = ring.at[1] - ring.r;
            m.add(S.limb([ring.at[0], under + 2.6, z * 5.5], [ring.at[0] + 1.4, under - 0.2, z * 7], 1.4, 0.9), 'foot');
        }
        return m;
    }
};

module.exports = { monsters: [slime, ant, worm], IDLE_FRAMES, ATTACK_FRAMES };
