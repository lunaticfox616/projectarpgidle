'use strict';
// 뿌리 동굴의 몬스터 견본(시험, 아직 게임에 물리지 않았다): 던파의 몬스터처럼 손으로 잡은 윤곽과 딱딱한 셀 음영으로 그린 2D 도트.
// 그리는 법은 cel.cjs. 오른쪽을 본다. pose = { state: 'idle' | 'attack', f }. 칸 96, 발 자리 feet(그림의 원점).
// 뿌리 고블린(곤봉을 든 작은 뿌리 도깨비), 포자 버섯(갓 아래 눈을 뜬 버섯), 이끼 돌지기(성소의 돌로 된 작은 골렘).
const C = require('./cel.cjs');
const { smooth, oval, limb, placed } = C;

const IDLE_FRAMES = 6, ATTACK_FRAMES = 6, SIZE = 96;
/** wind 0..1 (drawing back) and strike 0..1 (thrown forward) for the six attack frames; frame 3 is the hit. */
const ATTACK = [[0.35, 0], [0.8, 0], [1, 0], [0.1, 1], [0, 0.55], [0, 0.15]];
function phase(pose) {
    if (pose.state === 'attack') return { turn: 0, breath: 0, wind: ATTACK[pose.f][0], strike: ATTACK[pose.f][1] };
    const turn = pose.f / IDLE_FRAMES * Math.PI * 2;
    return { turn, breath: Math.sin(turn), wind: 0, strike: 0 };
}
const DEG = Math.PI / 180;
const reach = (from, length, degrees) => [from[0] + Math.cos(degrees * DEG) * length, from[1] + Math.sin(degrees * DEG) * length];
/** a value that sits at `rest`, goes to `back` while the blow is drawn and to `out` as it lands. */
const swing = (at, rest, back, out) => rest + at.wind * (back - rest) + at.strike * (out - rest);
/** The far side of a figure wears the same colours a step darker. */
const far = ramp => [ramp[0], ramp[0], ramp[1], ramp[2], ramp[3]];
const AMBER = '#ffb536', GLINT = '#fff3b8';

// ---------------------------------------------------------------- 뿌리 고블린
// 던파의 고블린처럼 팔다리가 길고 가늘며 손발이 크고, 앞으로 숙인 채 한 발을 내디딘 자세다. 귀는 잎처럼 뒤로 뻗고 머리에는 새순이 돋았다.
const GOBLIN = {
    skin: ['#12301f', '#2a5a27', '#5a9431', '#96c444', '#d6ea72'], cloth: ['#21140e', '#402718', '#6b4226', '#96633a', '#c48f58'],
    wood: ['#1e140d', '#3a2618', '#5c4029', '#84603f', '#b38d5f'], leaf: ['#10301c', '#22551f', '#3f862b', '#6cb53c', '#aee25a'],
    wrap: ['#3a3024', '#6b5c46', '#a39072', '#d2c3a0', '#f2e8cc'], ink: '#0a1a10', woodInk: '#120b07'
};
const goblin = {
    id: 'cave-goblin', drawn: true, size: SIZE, feet: [36, 84],
    build(pose) {
        const cv = C.sheet(SIZE, this.feet), at = phase(pose), P = GOBLIN;
        const lean = swing(at, 0, -4, 8), bob = at.breath * 0.9 - at.wind * 1 - at.strike * 2.5;
        const skin = { ramp: P.skin, ink: P.ink }, dim = { ramp: far(P.skin), ink: P.ink }, wood = { ramp: P.wood, ink: P.woodInk };
        const hip = [-1 + lean * 0.3, 20 + bob * 0.3], shoulder = [8 + lean, 36 + bob], head = [lean * 1.25, bob * 1.3 - at.strike * 2];
        // far arm, held out in front for balance, and the far leg stepping back
        const farShoulder = [shoulder[0] + 1, shoulder[1] - 1], farElbow = reach(farShoulder, 10, swing(at, -40, -80, -5)), farHand = reach(farElbow, 10, swing(at, 10, -30, 20));
        C.chain(cv, [farShoulder, farElbow, farHand], [2.6, 2.2, 2.4], dim);
        C.part(cv, oval(farHand, [3.4, 3]), dim);
        const farKnee = [hip[0] - 7 - at.strike * 2, 11], farFoot = [-15 - at.strike * 5, 1.4];
        C.chain(cv, [[hip[0] - 1, hip[1]], farKnee, [farFoot[0] + 1, 2.6]], [3.4, 2.5, 2], { ...dim, group: 'farLeg' });
        C.part(cv, oval([farFoot[0] + 3, 1.5], [6, 2.1]), { ...dim, group: 'farLeg' });
        // the lean trunk, a strap across it, the rag round the hips
        const trunk = smooth([[-7 + lean * 0.3, 19], [-8 + lean * 0.5, 28 + bob * 0.5], [-3 + lean, 37 + bob], [5 + lean, 41 + bob], [12 + lean, 38 + bob], [12 + lean, 30 + bob * 0.6], [8 + lean * 0.6, 22], [2 + lean * 0.3, 17], [-3 + lean * 0.3, 17]]);
        const body = C.part(cv, trunk, skin);
        C.patch(cv, body, oval([6 + lean * 0.8, 28 + bob * 0.4], [3.4, 5.4], 0.3), { by: 1 });                                  // the paler belly
        C.stroke(cv, body, [[-6 + lean * 0.6, 31 + bob * 0.6], [-2 + lean * 0.8, 34 + bob * 0.8], [2 + lean, 34 + bob]], { by: -1 });        // shoulder blade
        for (const [x, y] of [[-3, 36.6], [1, 39], [-5.6, 30], [-4.6, 24.6]]) C.dot(cv, [x + lean * 0.8, y + bob * 0.8], P.leaf[3]);     // moss on the back
        for (const dy of [0, 1]) C.stroke(cv, body, [[-4 + lean * 0.9, 37 + bob + dy], [4 + lean * 0.7, 29 + bob * 0.6 + dy], [10 + lean * 0.5, 23 + dy]], { hex: dy ? P.cloth[2] : P.cloth[3] });   // strap
        const rag = C.part(cv, [[-9 + lean * 0.3, 22], [9 + lean * 0.4, 23], [11, 15], [7, 11], [4, 15], [1, 10], [-3, 14], [-7, 10], [-10, 15]], { ramp: P.cloth, ink: P.woodInk });
        C.stroke(cv, rag, [[-9 + lean * 0.3, 21], [9 + lean * 0.4, 22]], { to: 4 });
        C.stroke(cv, rag, [[-4, 19], [-5, 13]], { by: -1 });
        C.stroke(cv, rag, [[3, 20], [3, 14]], { by: -1 });
        // near leg, stepping forward on a big foot
        const knee = [hip[0] + 9 + at.strike * 3, 12], foot = [9 + at.strike * 7, 1.4];
        C.chain(cv, [[hip[0] + 2, hip[1] - 1], knee, [foot[0], 2.8]], [3.8, 2.8, 2.2], { ...skin, group: 'leg' });
        const sole = C.part(cv, oval([foot[0] + 3.4, 1.6], [7, 2.3]), { ...skin, group: 'leg' });
        for (const toe of [4.5, 7, 9.4]) C.stroke(cv, sole, [[foot[0] + toe, 0.4], [foot[0] + toe, 1.7]], { to: 0 });
        // the head: a heavy brow, a long nose, a jutting jaw; the ears sweep back like leaves
        const nod = swing(at, 0, 0.14, -0.22), onHead = points => placed(points, nod, [15, 44], head);
        const flick = Math.sin(at.turn * 2) * 0.08 - at.wind * 0.25 + at.strike * 0.2, onEar = points => onHead(placed(points, flick, [11, 49]));
        C.part(cv, smooth(onEar([[13, 52], [6, 58], [-6, 63], [1, 53], [10, 48]])), dim);                                      // far ear
        const face = C.part(cv, smooth(onHead([[9, 47], [10, 53], [16, 56], [22, 54], [25, 49], [35, 45], [26, 43.4], [25, 39], [19, 37], [12, 39]])), skin);
        C.patch(cv, face, smooth(onHead([[17.6, 40], [24, 40.4], [25.4, 42.6], [19.6, 43]])), { hex: '#160c0a' });             // mouth
        for (const x of [19.4, 21.8, 24]) C.dot(cv, onHead([[x, 42.4]])[0], '#f2e9c6');                                      // teeth
        C.dot(cv, onHead([[20.6, 40.4]])[0], '#f2e9c6');
        C.stroke(cv, face, onHead([[15, 52], [20, 51.4], [25.6, 48.6]]), { to: 0 });                                         // brow
        C.patch(cv, face, onHead(oval([20.8, 48.8], [2.6, 1.7], -0.25)), { hex: AMBER });                                     // eye
        C.dot(cv, onHead([[21.6, 49]])[0], GLINT);
        C.dot(cv, onHead([[32, 44.6]])[0], P.skin[0]);                                                                       // nostril
        C.stroke(cv, face, onHead([[12.4, 45], [14.4, 41.6], [17.6, 39.6]]), { by: -1 });                                    // cheek
        C.patch(cv, face, onHead(oval([14.6, 53], [3, 1.5], 0.4)), { to: 4 });                                               // light on the skull
        const ear = C.part(cv, smooth(onEar([[11, 51], [3, 57], [-10, 60], [-1, 51], [9, 46]])), skin);
        C.patch(cv, ear, smooth(onEar([[9, 49.6], [2, 53.6], [-5, 56], [1, 51], [8, 47.6]])), { to: 1 });
        for (const [x, y, tx, ty] of [[14, 55, 10, 63], [17.6, 56, 18, 65], [21, 55, 26, 62]]) {
            C.part(cv, onHead(limb([x, y], [tx + Math.sin(at.turn + x) * 0.7, ty], 1.6, 0.5)), { ramp: P.leaf, ink: P.ink, cast: 0 });
        }
        // the club in the near hand, held high: a knotted root with a heavy head and two stubs
        const fore = swing(at, 35, 75, -40), elbow = reach(shoulder, 10, swing(at, -35, 110, -15)), hand = reach(elbow, 10, fore);
        const aim = swing(at, 78, 125, -30), grip = reach(hand, 4, aim + 180), top = reach(hand, 21, aim);
        const club = C.part(cv, limb(grip, top, 1.8, 3.2), { ...wood, group: 'club' });
        C.stroke(cv, club, [reach(hand, 4, aim), reach(hand, 16, aim)], { by: 1 });
        const knot = reach(hand, 22.5, aim), knob = C.part(cv, oval(knot, [5.6, 4.8], aim * DEG), { ...wood, group: 'club' });
        C.patch(cv, knob, oval(reach(knot, 1.6, aim + 120), [2.2, 1.7]), { by: 1 });
        C.stroke(cv, knob, [reach(knot, 3.4, aim - 60), reach(knot, 3.4, aim - 150)], { by: -1 });
        for (const side of [75, -75]) C.part(cv, limb(reach(knot, 4.4, aim + side), reach(knot, 7.2, aim + side), 1.6, 0.9), { ...wood, group: 'club', cast: 0 });
        C.chain(cv, [shoulder, elbow, hand], [3, 2.4, 2.4], { ...skin, group: 'arm' });
        const cuff = C.part(cv, limb(reach(hand, 4.6, fore + 180), reach(hand, 1.6, fore + 180), 2.8, 2.8), { ramp: P.wrap, ink: P.woodInk, group: 'arm' });
        C.stroke(cv, cuff, [reach(reach(hand, 3, fore + 180), 2.6, fore + 90), reach(reach(hand, 3, fore + 180), 2.6, fore - 90)], { by: -2 });
        const fist = C.part(cv, oval(hand, [3.8, 3.5]), { ...skin, group: 'arm' });
        C.stroke(cv, fist, [reach(hand, 2.6, aim + 90), reach(hand, 2.6, aim - 90)], { to: 0 });
        return C.finish(cv);
    }
};

// ---------------------------------------------------------------- 포자 버섯
const SHROOM = {
    cap: ['#260e12', '#55201c', '#8c3a26', '#bd5e38', '#e89a62'], stem: ['#2e241f', '#62503f', '#978068', '#c8b190', '#eedfbe'],
    moss: ['#16230f', '#2b4118', '#476524', '#6c8e32', '#9cba4c'], ink: '#170b0c', stemInk: '#1c1410', spot: '#ecd9ae', spore: '#d6e69a'
};
const shroom = {
    id: 'cave-shroom', drawn: true, size: SIZE, feet: [44, 84],
    build(pose) {
        const cv = C.sheet(SIZE, this.feet), at = phase(pose), P = SHROOM;
        // it squats as it gathers and springs up as it lets the spores go
        const squat = 1 + at.breath * 0.03 - at.wind * 0.2 + at.strike * 0.12, lift = (squat - 1) * 30, lean = swing(at, 0, -2, 4);
        const stem = { ramp: P.stem, ink: P.stemInk }, cap = { ramp: P.cap, ink: P.ink };
        for (const [x, mat] of [[-6, { ramp: far(P.stem), ink: P.stemInk }], [5, stem]]) C.part(cv, oval([x + lean * 0.2, 1.8], [4.6, 2.4]), mat);
        C.part(cv, limb([-7 + lean * 0.5, 17 * squat], [-13 + lean * 0.5 - at.wind * 2, 12 * squat + at.strike * 8], 2.6, 2.2), { ramp: far(P.stem), ink: P.stemInk });
        const body = C.part(cv, smooth([[-8 + lean, 27 * squat], [-11 + lean * 0.5, 14 * squat], [-9, 4], [-3, 1], [5, 1], [10, 5], [11 + lean * 0.5, 15 * squat], [8 + lean, 27 * squat]]), stem);
        C.stroke(cv, body, [[-8, 6], [-2, 3.4], [5, 3.6], [9, 7]], { by: -1 });                                           // the skirt at its foot
        C.stroke(cv, body, [[-4 + lean * 0.4, 12 * squat], [-4.6 + lean * 0.3, 7]], { by: -1 });
        // the brim's shadow on the stem, and the face under it: two slanted eyes with an amber glint, a sour mouth
        C.patch(cv, body, [[-12 + lean, 28 * squat], [12 + lean, 28 * squat], [12 + lean, 23.4 * squat], [-12 + lean, 22.4 * squat]], { by: -1 });
        const eyeY = 18.6 * squat, face = lean * 0.8;
        for (const x of [0, 6.4]) {
            C.patch(cv, body, [[x + face - 2, eyeY + 2.6], [x + face + 2.6, eyeY + 1], [x + face + 2.4, eyeY - 2], [x + face - 1.8, eyeY - 1.4]], { hex: '#1a0f0e' });
            C.dot(cv, [x + face + 1, eyeY + 0.2], AMBER); C.dot(cv, [x + face + 1, eyeY - 0.8], AMBER);
        }
        for (const dy of [0, 1]) C.stroke(cv, body, [[0.4 + face, 12.4 * squat + dy], [3.6 + face, 13.6 * squat + dy], [7 + face, 12.2 * squat + dy]], { hex: '#1a0f0e' });
        // the near arm, a stub that it throws forward with the spores
        C.part(cv, limb([8 + lean * 0.6, 16 * squat], [14 + lean - at.wind * 3 + at.strike * 4, 12 * squat + at.wind * 4 + at.strike * 3], 2.8, 2.5), stem);
        // the cap: a broad dome with pale spots, a dark underside, moss where it faces up
        const onCap = points => points.map(([x, y]) => [x + lean * 1.1, y * (2 - squat) * 0.25 + y * 0.75 + lift]);
        const dome = C.part(cv, smooth(onCap([[-19, 30], [-17, 39], [-9, 47], [3, 50], [14, 46], [20, 37], [21, 30], [12, 27], [0, 26], [-11, 27]])), cap);
        C.patch(cv, dome, smooth(onCap([[-18, 30], [-10, 29.4], [0, 28.6], [12, 29.4], [20, 31], [12, 27], [0, 26], [-11, 27]])), { to: 0 });   // gills
        for (const x of [-12, -6, 0, 6, 12, 17]) C.stroke(cv, dome, onCap([[x, 27], [x * 1.04, 29.6]]), { to: 1 });
        for (const [x, y, rx, ry] of [[-9, 39, 3.2, 2.4], [3, 43.5, 3.8, 2.6], [12, 37, 2.6, 2.2], [-2, 34.5, 2, 1.6], [-14, 33.5, 1.8, 1.5]]) C.patch(cv, dome, onCap(oval([x, y], [rx, ry])), { hex: P.spot });
        const mossy = C.part(cv, smooth(onCap([[-13, 43.6], [-8, 47.6], [0, 50.4], [7, 50], [3, 47.6], [-4, 46.6], [-9, 43]])), { ramp: P.moss, ink: P.ink, edge: false, cast: 0 });
        C.dot(cv, onCap([[-5, 48.6]])[0], P.moss[4]);
        C.stroke(cv, mossy, onCap([[-10, 45], [-6, 47.4]]), { by: 1 });
        // spores: a few drift up while it waits; a cloud is thrown forward on the hit
        for (let i = 0; i < 4; i++) {
            const drift = (at.turn / (Math.PI * 2) + i / 4) % 1;
            C.dot(cv, [-12 + i * 8 + lean + Math.sin(i * 2.3 + at.turn) * 1.5, 52 + lift + drift * 12], P.spore);
        }
        if (at.strike > 0.1) for (let i = 0; i < 9; i++) {
            const far = at.strike * (8 + i * 2.6), up = Math.sin(i * 1.9) * 6 + i * 0.5;
            const centre = [18 + lean + far, 28 + lift * 0.5 + up];
            C.part(cv, oval(centre, [1.8 - (i % 3) * 0.4, 1.6 - (i % 3) * 0.4]), { ramp: ['#5c6a2a', '#8fa046', P.spore, '#eef6c4', '#ffffff'], ink: '#3c4a1c', flat: true, cast: 0, edge: false });
        }
        return C.finish(cv);
    }
};

// ---------------------------------------------------------------- 이끼 돌지기
const GOLEM = {
    stone: ['#1c1613', '#3a2f29', '#625347', '#8b7a69', '#b9a991'], moss: ['#141d0c', '#283815', '#435a1f', '#66802d', '#93ad45'],
    ink: '#120d0b'
};
/** A stone block: a four-cornered outline with slightly cut corners, turned about its own centre. */
function block(centre, half, turn = 0, cut = 1.6) {
    const [w, h] = half;
    return placed([[-w + cut, -h], [w - cut, -h], [w, -h + cut], [w, h - cut], [w - cut, h], [-w + cut, h], [-w, h - cut], [-w, -h + cut]].map(([x, y]) => [centre[0] + x, centre[1] + y]), turn, centre);
}
const golem = {
    id: 'cave-golem', drawn: true, size: SIZE, feet: [44, 84],
    build(pose) {
        const cv = C.sheet(SIZE, this.feet), at = phase(pose), P = GOLEM;
        const stone = { ramp: P.stone, ink: P.ink, lit: 0.26, shade: 0.4 }, dim = { ramp: far(P.stone), ink: P.ink }, moss = { ramp: P.moss, ink: P.ink, edge: false, cast: 0 };
        const heave = at.breath * 0.8 - at.wind * 1.5 - at.strike * 1, lean = swing(at, 0, -4, 7), tilt = swing(at, 0, 0.08, -0.14);
        const chest = [1 + lean, 44 + heave];
        /** An arm: shoulder block, forearm block, fist. angle = the way the arm hangs (degrees), bend = at the elbow. */
        const arm = (shoulder, angle, bend, look, group) => {
            const elbow = reach(shoulder, 15, angle), wrist = reach(elbow, 15, angle + bend), fist = reach(wrist, 6, angle + bend);
            C.part(cv, block([(shoulder[0] + elbow[0]) / 2, (shoulder[1] + elbow[1]) / 2], [6.4, 9], (angle + 90) * DEG), { ...look, group });
            const fore = C.part(cv, block([(elbow[0] + wrist[0]) / 2, (elbow[1] + wrist[1]) / 2], [7.4, 9.4], (angle + bend + 90) * DEG), { ...look, group });
            const hand = C.part(cv, block(fist, [8.6, 7.6], (angle + bend + 90) * DEG, 2.4), { ...look, group });
            C.stroke(cv, hand, [reach(fist, 5, angle + bend + 60), reach(fist, 5, angle + bend - 60)], { by: -1 });
            return { fore, elbow, wrist, fist };
        };
        // far arm, legs, trunk, head, near arm
        arm([chest[0] + 9, chest[1] + 9], swing(at, -84, -60, -100), swing(at, 4, 20, 4), dim, 'farArm');
        for (const [x, look] of [[-12, dim], [8, stone]]) {
            const leg = C.part(cv, block([x + lean * 0.2, 11], [7.6, 11], 0), look);
            C.stroke(cv, leg, [[x - 5 + lean * 0.2, 13], [x + 4 + lean * 0.2, 12]], { by: -1 });
            C.part(cv, block([x + 2 + lean * 0.2, 3], [9.4, 3.4], 0), look);
        }
        const trunk = C.part(cv, placed([[-17, 26], [15, 25], [20, 44], [16, 62], [-14, 63], [-21, 46]].map(([x, y]) => [x + lean, y + heave]), tilt, [lean, 30]), stone);
        const onTrunk = points => placed(points.map(([x, y]) => [x + lean, y + heave]), tilt, [lean, 30]);
        C.stroke(cv, trunk, onTrunk([[-19, 45], [-6, 43], [4, 46], [19, 44]]), { to: 0 });                                 // the seam between its two blocks
        C.stroke(cv, trunk, onTrunk([[-9, 62], [-7, 54], [-10, 49]]), { by: -1 });
        C.stroke(cv, trunk, onTrunk([[9, 27], [7, 33], [10, 38]]), { by: -1 });
        // the sanctuary's ring carved on its chest still holds a light
        const ring = onTrunk(oval([3, 53], [5.6, 5.6], 0, 20));
        C.stroke(cv, trunk, ring.concat([ring[0]]), { hex: at.strike > 0.3 ? GLINT : AMBER });
        C.patch(cv, trunk, onTrunk(oval([3, 53], [2, 2])), { hex: at.strike > 0.3 ? '#ffffff' : AMBER });
        C.part(cv, smooth(onTrunk([[-15, 62.4], [-10, 66], [-2, 65], [4, 63], [-2, 61], [-9, 60]])), moss);
        C.part(cv, smooth(onTrunk([[-21, 46], [-18, 52], [-14, 49], [-16, 43]])), moss);
        const skull = C.part(cv, block(onTrunk([[7, 68]])[0], [8, 6.6], tilt + swing(at, 0, 0.1, -0.2), 2), stone);
        const eye = onTrunk([[10.5, 68]])[0];
        C.patch(cv, skull, block(eye, [3.4, 1.3], tilt, 0.4), { hex: '#150d0b' });
        C.dot(cv, [eye[0] + 1, eye[1]], AMBER); C.dot(cv, [eye[0] + 2, eye[1]], GLINT);
        C.part(cv, smooth(onTrunk([[0, 73.6], [5, 76.4], [11, 75], [8, 73], [3, 72.6]])), moss);
        const near = arm([chest[0] - 12, chest[1] + 11], swing(at, -92, -150, -12), swing(at, 6, 70, -4), stone, 'arm');
        C.stroke(cv, near.fore, [reach(near.elbow, 3, 0), reach(near.wrist, 2, 160)], { by: -1 });
        C.part(cv, smooth([[chest[0] - 21, chest[1] + 15], [chest[0] - 17, chest[1] + 21], [chest[0] - 10, chest[1] + 20], [chest[0] - 9, chest[1] + 16], [chest[0] - 15, chest[1] + 14]]), moss);
        // dust where the fists land
        if (at.strike > 0.5) for (let i = 0; i < 6; i++) C.dot(cv, [near.fist[0] + 9 + (i % 3) * 2, near.fist[1] - 7 + i * 3], P.stone[4]);
        return C.finish(cv);
    }
};

module.exports = { monsters: [goblin, shroom, golem], IDLE_FRAMES, ATTACK_FRAMES };
