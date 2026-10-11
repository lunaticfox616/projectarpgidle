'use strict';
// 액트 1 몬스터(수액 슬라임, 뿌리 일개미, 뿌리 웜)의 옆모습, 오른쪽을 본다. pose = { state: 'idle' | 'attack', f }.
// 칸 96, 발 자리 feet. 게임 쪽 규격은 data/monster-sprites.js MONSTER_STAGE_SHEETS(높이, 발 자리)와 MONSTER_STAGE_KIND(프레임 시간).
const S = require('./render.cjs');
const { ramp, lerp, rotz } = S;

const IDLE_FRAMES = 6, ATTACK_FRAMES = 6;
/** wind 0..1 (drawing back) and strike 0..1 (thrown forward) for the six attack frames; frame 3 is the hit. */
const ATTACK = [[0.35, 0], [0.8, 0], [1, 0], [0.1, 1], [0, 0.55], [0, 0.15]];
function phase(pose) {
    if (pose.state === 'attack') return { breath: 0, wind: ATTACK[pose.f][0], strike: ATTACK[pose.f][1] };
    return { breath: Math.sin(pose.f / IDLE_FRAMES * Math.PI * 2), wind: 0, strike: 0 };
}

// ---------------------------------------------------------------- 수액 슬라임
const slime = {
    id: 'act1-slime', size: 96, feet: [44, 84],
    mats: {
        sap: { ramp: ramp('#d98a1c', { cool: 28, warm: 14 }), gloss: true },
        core: { ramp: ramp('#b5601a'), gloss: true },
        eye: { ramp: ramp('#2a1a12', { cool: 6, warm: 0 }), gloss: true },
        drip: { ramp: ramp('#c2761a', { cool: 26, warm: 12 }), gloss: true }
    },
    build(pose) {
        const m = S.scene(), { breath, wind, strike } = phase(pose);
        const squash = 1 - 0.07 * breath - 0.28 * wind + 0.2 * strike * (1 - strike) * 4 - 0.3 * strike;
        const lean = -3 * wind + 13 * strike, height = 20 * squash, wide = 25 / Math.sqrt(squash);
        const rise = wind * 5;
        m.add(S.ellipsoid([lean * 0.4, height * 0.82, 0], [wide, height, 19 / Math.sqrt(squash)]), 'sap', { group: 'body', k: 5 });
        m.add(S.ellipsoid([lean + 7, height * 1.2 + rise, 1], [13, 11 * squash + rise, 12]), 'sap', { group: 'body', k: 7 });
        m.add(S.ellipsoid([lean * 0.3 - 13, height * 0.5, 2], [11, 9 * squash, 12]), 'sap', { group: 'body', k: 6 });
        // drips round the foot
        for (const [x, z, r] of [[-22, 6, 4.2], [-9, 15, 3.6], [15, 13, 4.4], [25, 3, 3.4], [3, 17, 3]]) {
            m.add(S.ellipsoid([x + lean * 0.2, r * 0.6, z], [r * 1.25, r * 0.8, r]), 'drip', { group: 'body', k: 4 });
        }
        // the darker seed seen through the sap
        const face = [lean + 15, height * 1.18 + rise * 0.8, 9];
        m.add(S.ellipsoid([face[0] - 1, face[1] + 3.2, face[2] + 2.5], [2.4, 3.3, 2.2]), 'eye');
        m.add(S.ellipsoid([face[0] + 4.5, face[1] + 2.6, face[2] - 3], [2, 2.9, 2]), 'eye');
        m.mark([face[0] - 1.4, face[1] + 5.6, face[2] + 4.6], '#fff3c8');
        m.mark([face[0] + 4.2, face[1] + 4.8, face[2] - 1.2], '#fff3c8');
        if (strike > 0.5) m.add(S.ellipsoid([face[0] + 2.5, face[1] - 3.2, face[2] + 1], [3.4, 2.2 + strike, 2.4]), 'eye');
        return m;
    }
};

// ---------------------------------------------------------------- 뿌리 일개미
const ant = {
    id: 'act1-ant', size: 96, feet: [42, 84],
    mats: {
        shell: { ramp: ramp('#a3411f', { cool: 28, warm: 12 }), gloss: true },
        belly: { ramp: ramp('#7c2f1c', { cool: 24, warm: 10 }), gloss: true },
        leg: { ramp: ramp('#5d2417', { cool: 18, warm: 8 }) },
        legFar: { ramp: ramp('#3a1712', { cool: 12, warm: 4 }) },
        jaw: { ramp: ramp('#2b1510', { cool: 8, warm: 6 }), gloss: true },
        eye: { ramp: ramp('#160d0d', { cool: 4, warm: 0 }), gloss: true }
    },
    build(pose) {
        const m = S.scene(), { breath, wind, strike } = phase(pose);
        const shift = -5 * wind + 11 * strike, bob = 0.9 * breath - 1.5 * wind + 1.2 * strike, tilt = 0.14 * wind - 0.2 * strike;
        const hip = [shift, 16 + bob, 0];
        const at = p => rotz([p[0] + shift, p[1] + bob, p[2]], tilt, hip);
        // legs first (three a side): hip on the thorax, a raised knee, a foot on the ground that stays where it is
        const stride = pose.state === 'idle' ? 0 : 1;
        for (const [mat, z] of [['legFar', -1], ['leg', 1]]) {
            for (const [i, x] of [[0, 6], [1, 0], [2, -6]]) {
                const reach = [11, 1, -11][i], foot = [x + reach + shift * 0.35 * stride, 0, z * 14 + (i === 1 ? z * 2 : 0)];
                const knee = [x + reach * 0.6 + shift * 0.7, 21 + bob + (i === 1 ? 2 : 0), z * 11];
                m.add(S.chain([at([x, 15, z * 4]), knee, foot], [2, 1.7, 1.2]), mat);
            }
        }
        m.add(S.ellipsoid(at([-19, 18, 0]), [14, 10.5, 10], tilt - 0.18), 'belly', { paint: p => (Math.sin((p[0] - shift) * 0.55 + p[1] * 0.25) > 0.72 ? 'jaw' : null) });
        m.add(S.limb(at([-7, 16.5, 0]), at([-3, 16.5, 0]), 3.2), 'jaw');
        m.add(S.ellipsoid(at([1, 17, 0]), [8.5, 6.8, 6.5]), 'shell');
        const head = at([15, 19 + 1.2 * wind, 0]);
        m.add(S.ellipsoid(head, [8, 7.4, 7], tilt), 'shell');
        m.add(S.ellipsoid([head[0] + 3, head[1] + 2.2, head[2] + 5.2], [2.3, 2.7, 1.8]), 'eye');
        m.mark([head[0] + 2.6, head[1] + 4, head[2] + 6.6], '#f3c9a0');
        // mandibles open while it draws back and snap shut on the strike
        const gape = 0.25 + 0.6 * wind - 0.3 * strike;
        for (const z of [-1, 1]) {
            const root = [head[0] + 6, head[1] - 3, z * 2.6];
            m.add(S.chain([root, rotz([root[0] + 6, root[1] - 1, root[2] + z * 1.5], -gape * 0.6, root), rotz([root[0] + 10, root[1] + 1.5, root[2] - z * 1], -gape, root)], [1.9, 1.5, 0.8]), 'jaw');
            const base = [head[0] + 2, head[1] + 6, z * 2.4], sway = 0.12 * breath * z;
            m.add(S.chain([base, [base[0] + 6, base[1] + 8 + sway * 6, base[2] + z * 1.5], [base[0] + 14 + 3 * strike, base[1] + 7 - 3 * wind + sway * 10, base[2] + z * 2]], [1.1, 0.9, 0.7]), z < 0 ? 'legFar' : 'leg');
        }
        return m;
    }
};

// ---------------------------------------------------------------- 뿌리 웜
const worm = {
    id: 'act1-worm', size: 96, feet: [40, 84],
    mats: {
        skin: { ramp: ramp('#c9a06e', { cool: 34, warm: 10 }) },
        ring: { ramp: ramp('#9a6f4a', { cool: 30, warm: 8 }) },
        mouth: { ramp: ramp('#5a1f24', { cool: 10, warm: 6 }) },
        tooth: { ramp: ramp('#f0e6cf', { cool: 10, warm: 4 }), gloss: true },
        soil: { ramp: ramp('#5b4636', { cool: 16, warm: 8 }) }
    },
    build(pose) {
        const m = S.scene(), { breath, wind, strike } = phase(pose);
        const sway = 2.2 * breath, back = 9 * wind, out = 20 * strike, dip = 10 * strike;
        const spine = [[-4, 0, 0], [-9 - back * 0.5, 15, 0], [-5 - back + sway * 0.5 + out * 0.25, 30 - dip * 0.3, 0],
            [5 - back * 0.8 + sway + out * 0.7, 40 + 3 * wind - dip * 0.8, 0], [15 - back * 0.5 + sway + out, 41 + 5 * wind - dip * 1.4, 0]];
        const radii = [10.5, 10, 9.2, 8.6, 8];
        const along = p => { let best = 0, bestD = Infinity; spine.forEach((q, i) => { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < bestD) { bestD = d; best = i; } }); return best; };
        m.add(S.chain(spine, radii), 'skin', { paint: p => {
            const i = along(p), q = spine[i], next = spine[Math.min(spine.length - 1, i + 1)], prev = spine[Math.max(0, i - 1)];
            const dir = S.norm([next[0] - prev[0], next[1] - prev[1], 0]), t = (p[0] - q[0]) * dir[0] + (p[1] - q[1]) * dir[1] + i * 13;
            return Math.sin(t * 0.72) > 0.55 ? 'ring' : null;
        } });
        const head = spine[4], aim = S.norm([spine[4][0] - spine[3][0], spine[4][1] - spine[3][1], 0]);
        const lip = [head[0] + aim[0] * 6.2, head[1] + aim[1] * 6.2, 0], open = 3.4 + 2.2 * wind + 1.5 * strike;
        m.add(S.ellipsoid(lip, [3, open, open * 0.95], Math.atan2(aim[1], aim[0])), 'mouth');
        for (let k = 0; k < 6; k++) {
            const a = k / 6 * Math.PI * 2, r = open * 0.92;
            const side = [-aim[1], aim[0], 0], root = [lip[0] + side[0] * Math.cos(a) * r, lip[1] + side[1] * Math.cos(a) * r, Math.sin(a) * r];
            m.add(S.limb(root, [root[0] + aim[0] * 2.6 - side[0] * Math.cos(a) * 1.2, root[1] + aim[1] * 2.6 - side[1] * Math.cos(a) * 1.2, root[2] * 0.75], 1.25, 0.4), 'tooth');
        }
        m.add(S.ellipsoid([-3, 1.5, 1], [19, 5, 12]), 'soil');
        for (const [x, z, r] of [[-18, 7, 3.4], [12, 9, 3], [-2, 13, 2.6], [17, -2, 2.8]]) m.add(S.ellipsoid([x, r * 0.5, z], [r * 1.3, r * 0.8, r]), 'soil');
        return m;
    }
};

module.exports = { monsters: [slime, ant, worm], IDLE_FRAMES, ATTACK_FRAMES };
