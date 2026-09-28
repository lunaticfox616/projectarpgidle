// js/canvas-redrawn-skill-art.js must draw exactly what the art handoff's void_fx.js draws.
// The reference (docs/skill-assets-hana/reference/void_fx.js.txt) is the delivered source, kept as text.
// Every exported drawing call is run with the same arguments on both, and the final dot maps
// (last colour written to each dot) and the number of dot writes must match.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const reference = vm.createContext({ Math, Object, Array, Map, Set, Number, String });
vm.runInContext(fs.readFileSync(path.join(root, 'docs/skill-assets-hana/reference/void_fx.js.txt'), 'utf8'), reference);
const portContext = vm.createContext({ Math, Object, Array, Map, Set, Number, String, safeExposeGlobals(map) { Object.assign(portContext, map); } });
vm.runInContext(fs.readFileSync(path.join(root, 'js/canvas-redrawn-skill-art.js'), 'utf8'), portContext);
const art = portContext.redrawnSkillArt;
assert(art, 'redrawnSkillArt must be exposed');

function record(call) {
    const dots = new Map();
    let writes = 0;
    call((x, y, c) => { dots.set(`${x},${y}`, c); writes++; });
    return { dots, writes };
}
let calls = 0, drawn = 0;
function same(label, refCall, portCall) {
    const a = record(refCall), b = record(portCall);
    calls++; drawn += a.writes;
    if (a.writes !== b.writes || a.dots.size !== b.dots.size) {
        assert.fail(`${label}: ${a.writes}/${a.dots.size} reference writes/dots, port ${b.writes}/${b.dots.size}`);
    }
    for (const [key, colour] of a.dots) if (b.dots.get(key) !== colour) assert.fail(`${label}: dot ${key} ${colour} ≠ ${b.dots.get(key)}`);
}
const R = name => reference[name.split('.')[0]][name.split('.')[1]];
const P = name => art[name.split('.')[0]][name.split('.')[1]];
const range = (from, to, step) => { const out = []; for (let t = from; t <= to; t += step) out.push(t); return out; };
const DIRS = range(0, 7, 1).map(k => ({ x: Math.cos(k * Math.PI / 4 + 0.13), y: Math.sin(k * Math.PI / 4 + 0.13) }));
const AXES = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }, { x: Math.SQRT1_2, y: -Math.SQRT1_2 }];
const TARGETS = [{ x: 88, y: 40 }, { x: 24, y: 72 }, { x: 40, y: 8 }, { x: 72.5, y: 71 }, { x: 8, y: 24 }];
const ELEMENTS = ['fire', 'cold', 'light', 'chaos'];

// ---------------------------------------------------------------- the original fourteen (09-28)
for (const B of TARGETS) for (const variant of [0, 1, 2, 3]) for (const age of range(-10, 1040, 41)) {
    const t = { age, dur: 1000, variant, surge: age % 3 === 0 ? 1 : 0, grow: age / 90 };
    same(`beam ${B.x},${B.y} v${variant} ${age}`, d => R('VoidBolt.beam')(d, { x: 40, y: 38 }, B, t), d => P('VoidBolt.beam')(d, { x: 40, y: 38 }, B, t));
}
for (const seed of [1, 2, 5]) for (const age of range(-5, 170, 5)) same(`impact ${seed} ${age}`, d => R('VoidBolt.impact')(d, 50.4, 31.6, age, seed), d => P('VoidBolt.impact')(d, 50.4, 31.6, age, seed));
for (const d0 of DIRS) for (const age of range(-5, 300, 9)) {
    const o = { R: 13, travel: 30 };
    same(`crescent ${age}`, d => R('VoidCrescent.crescent')(d, { x: 44, y: 36 }, d0, age, 290, o), d => P('VoidCrescent.crescent')(d, { x: 44, y: 36 }, d0, age, { ...o, dur: 290 }));
}
for (const d0 of DIRS) for (const age of range(-5, 150, 11)) same(`slashMark ${age}`, d => R('VoidCrescent.slashMark')(d, 60.3, 30.7, age, d0), d => P('VoidCrescent.slashMark')(d, 60.3, 30.7, age, d0));
for (const o of [{ msPerCell: 90, maxR: 40 }, { msPerCell: 60, maxR: 70, spikes: 10 }]) for (const age of range(-5, 520, 7)) {
    same(`ring ${age}`, d => R('FrostRing.ring')(d, 72.3, 56.8, age, o), d => P('FrostRing.ring')(d, 72.3, 56.8, age, o));
}
for (const age of range(-5, 210, 6)) same(`flake ${age}`, d => R('FrostRing.flake')(d, 40.2, 22.9, age), d => P('FrostRing.flake')(d, 40.2, 22.9, age));
for (const B of TARGETS) for (const age of range(-5, 1100, 29)) {
    const t = { age, dur: 1000, surge: age % 2 };
    same(`wave ${age}`, d => R('EnergyWave.wave')(d, { x: 30, y: 30 }, B, t), d => P('EnergyWave.wave')(d, { x: 30, y: 30 }, B, t));
}
for (const age of range(-5, 160, 7)) same(`waveHit ${age}`, d => R('EnergyWave.hit')(d, 33.4, 18.6, age), d => P('EnergyWave.hit')(d, 33.4, 18.6, age));
for (const el of ['fire', 'cold', 'light']) for (const d0 of DIRS.slice(0, 5)) for (const age of range(-5, 520, 13)) {
    const o = { T: 500, Rmax: 42, half: 0.7, el, R0: 4 };
    same(`arcWave ${el} ${age}`, d => R('TriWave.wave')(d, { x: 30, y: 42 }, d0, age, o), d => P('TriWave.wave')(d, { x: 30, y: 42 }, d0, age, o));
}
for (const el of ['fire', 'cold', 'light']) for (const seed of [1, 3]) for (const age of range(-5, 160, 6)) {
    same(`elemSpark ${el} ${age}`, d => R('TriWave.spark')(d, 50.5, 44.5, age, el, seed), d => P('TriWave.spark')(d, 50.5, 44.5, age, { el, seed }));
}
for (const d0 of DIRS) for (const dir of [1, -1]) for (const age of range(-5, 400, 11)) {
    const o = { T: 200, life: 170, sweep: 1.4, dir, R: 28 };
    same(`swing ${dir} ${age}`, d => R('DragonSweep.swing')(d, { x: 60, y: 60 }, d0, age, o), d => P('DragonSweep.swing')(d, { x: 60, y: 60 }, d0, age, o));
}
for (const o of [{ life: 560, big: 1, seed: 3 }, { life: 440, big: 0, seed: 6 }, {}]) for (const age of range(-5, 580, 9)) {
    same(`flame ${age}`, d => R('DragonSweep.flame')(d, 20.4, 30.6, age, o), d => P('DragonSweep.flame')(d, 20.4, 30.6, age, o));
}
for (const o of [{ R: 17, N: 12 }, { R: 17, N: 12, dir: -1, start: 0.4 }]) for (const age of range(-5, 720, 19)) {
    same(`mist ${age}`, d => R('HolyMist.mist')(d, 72.2, 57.3, age, 700, o), d => P('HolyMist.mist')(d, 72.2, 57.3, age, { ...o, dur: 700 }));
}
for (const o of [{ T: 400, F: 160, period: 360, R: 19, start: 0 }, { T: 200, start: 1 }]) for (const age of range(-5, 600, 9)) {
    same(`whirl ${age}`, d => R('Whirlwind.whirl')(d, 40.1, 40.2, age, o), d => P('Whirlwind.whirl')(d, 40.1, 40.2, age, o));
}
for (const ang of [0, 0.7, 2.2, -1.9]) for (const age of range(-5, 160, 8)) same(`cut ${age}`, d => R('Whirlwind.cut')(d, 30.5, 20.5, age, ang), d => P('Whirlwind.cut')(d, 30.5, 20.5, age, ang));
for (const d0 of DIRS) for (const fade of [0, 0.3, 0.45, 0.6, 0.9]) for (const age of [0, 40, 70, 95, 200]) {
    same(`frostFront ${fade} ${age}`, d => R('FrostWave.front')(d, 60.4, 31.2, d0, age, fade), d => P('FrostWave.front')(d, 60.4, 31.2, age, { d: d0, fade }));
}
for (const big of [true, false]) for (const age of range(-5, 310, 7)) same(`frostPulse ${big} ${age}`, d => R('FrostWave.pulse')(d, 40.7, 38.2, age, big), d => P('FrostWave.pulse')(d, 40.7, 38.2, age, big));
for (const o of [{ t1: 320, R1: 27 }, { t1: 150 }]) for (const t of range(-5, 820, 9)) same(`collapse ${t}`, d => R('GravityCollapse.collapse')(d, 72, 56, t, o), d => P('GravityCollapse.collapse')(d, 72, 56, t, o));
for (const kind of [0, 1, 2]) for (const age of range(-5, 200, 6)) same(`strike ${kind} ${age}`, d => R('TripleBolt.strike')(d, 40.3, 38.6, age, kind), d => P('TripleBolt.strike')(d, 40.3, 38.6, age, kind));
for (const age of range(-5, 230, 7)) same(`charge ${age}`, d => R('TripleBolt.charge')(d, 22.5, 30.5, age), d => P('TripleBolt.charge')(d, 22.5, 30.5, age));
for (const o of [{ fall: 260, H0: 44 }, {}]) for (const age of range(-5, 470, 7)) same(`lance ${age}`, d => R('RadiantLance.lance')(d, 40.2, 43.4, age, o), d => P('RadiantLance.lance')(d, 40.2, 43.4, age, o));
for (const at of TARGETS) for (const charged of [true, false]) {
    same('censer', d => R('RippleSwing.censer')(d, 30.2, 25.7, at.x, at.y, charged), d => P('RippleSwing.censer')(d, { x: 30.2, y: 25.7 }, at, charged));
}
same('trail', d => R('RippleSwing.trail')(d, TARGETS.concat([{ x: 3, y: 90 }])), d => P('RippleSwing.trail')(d, TARGETS.concat([{ x: 3, y: 90 }])));
for (const B of TARGETS) for (const age of range(-5, 95, 5)) same(`arcBolt ${age}`, d => R('RippleSwing.bolt')(d, { x: 30, y: 26 }, B, age, 3), d => P('RippleSwing.bolt')(d, { x: 30, y: 26 }, B, age, 3));
for (const seed of [0, 1, 2]) for (const age of range(-5, 210, 6)) same(`groundSpark ${age}`, d => R('RippleSwing.spark')(d, 56.5, 40.5, age, seed), d => P('RippleSwing.spark')(d, 56.5, 40.5, age, seed));

// ---------------------------------------------------------------- 09-29 additions
for (const d0 of DIRS) for (const o of [{}, { len: 8 }]) for (const age of range(-5, 200, 7)) {
    same(`bloodSlash ${age}`, d => R('BloodDrain.slash')(d, 60.3, 30.6, age, d0, o), d => P('BloodDrain.slash')(d, 60.3, 30.6, age, { ...o, d: d0 }));
}
for (const d0 of DIRS) for (const age of range(-5, 170, 9)) same(`bloodSplash ${age}`, d => R('BloodDrain.splash')(d, { x: 60, y: 30 }, d0, age), d => P('BloodDrain.splash')(d, { x: 60, y: 30 }, d0, age));
for (const W of TARGETS) for (const o of [{}, { amp: 5 }]) for (const age of range(-5, 1010, 31)) {
    same(`drain ${age}`, d => R('BloodDrain.drain')(d, W, { x: 40, y: 45 }, age, o), d => P('BloodDrain.drain')(d, W, { x: 40, y: 45 }, age, o));
}
for (const age of range(-20, 1100, 5)) assert.strictEqual(art.BloodDrain.tint(age), reference.BloodDrain.tint(age), `drainTint ${age}`);
assert.deepStrictEqual({ ...art.BloodDrain.timing }, { ...reference.BloodDrain.timing });
for (const o of [{ msPerCell: 110, maxR: 40 }, { msPerCell: 80, maxR: 56 }]) for (const age of range(-5, 540, 7)) {
    same(`quakeGround ${age}`, d => R('GoldQuake.ground')(d, 40.4, 40.6, age, o), d => P('GoldQuake.ground')(d, 40.4, 40.6, age, o));
}
for (const age of range(-100, 70, 4)) same(`quakeFore ${age}`, d => R('GoldQuake.fore')(d, 40.2, 47.6, age), d => P('GoldQuake.fore')(d, 40.2, 47.6, age));
for (const age of range(-5, 200, 6)) same(`quakeHit ${age}`, d => R('GoldQuake.hit')(d, 30.5, 22.5, age), d => P('GoldQuake.hit')(d, 30.5, 22.5, age));
for (const el of ELEMENTS) for (const B of TARGETS) for (const age of range(-5, 410, 11)) {
    same(`flight ${el} ${age}`, d => R('PotionThrow.flight')(d, { x: 30, y: 30 }, B, age, 400, el), d => P('PotionThrow.flight')(d, { x: 30, y: 30 }, B, age, { dur: 400, el }));
}
for (const el of ELEMENTS) for (const age of range(-5, 310, 7)) same(`shatter ${el} ${age}`, d => R('PotionThrow.shatter')(d, 50.5, 40.5, age, el), d => P('PotionThrow.shatter')(d, 50.5, 40.5, age, el));
for (const el of ELEMENTS) for (const o of [{ el }, { el, R: 25, end: 900, pulses: [0, 300, 600] }]) for (const age of range(-5, 1150, 29)) {
    same(`pool ${el} ${age}`, d => R('PotionThrow.pool')(d, 40.6, 40.3, age, o), d => P('PotionThrow.pool')(d, 40.6, 40.3, age, o));
}
for (const el of ELEMENTS) for (const turn of [-5, -1, 0, 1, 2, 3, 6]) same(`flask ${el} ${turn}`, d => R('PotionThrow.flask')(d, 20.5, 20.5, turn, el), d => P('PotionThrow.flask')(d, 20.5, 20.5, turn, el));
for (const o of [{}, { T: 3000, F: 300, R: 30, amp: 2, n: 10, ticks: [500, 1500] }]) for (const age of range(-5, 5250, 211)) {
    same(`celticClock ${age}`, d => R('CelticClock.clock')(d, 72.4, 60.2, age, o), d => P('CelticClock.clock')(d, 72.4, 60.2, age, o));
}
for (const age of range(-5, 210, 6)) same(`clockMark ${age}`, d => R('CelticClock.mark')(d, 44.5, 20.5, age), d => P('CelticClock.mark')(d, 44.5, 20.5, age));
for (const age of range(0, 6000, 250)) assert.strictEqual(art.CelticClock.angle(age), reference.CelticClock.angle(age));

// Colour tables other modules and the pass rely on are the delivered ones.
for (const module of ['VoidBolt', 'FrostRing', 'EnergyWave', 'DragonSweep', 'HolyMist', 'Whirlwind', 'GravityCollapse', 'TripleBolt', 'RippleSwing', 'BloodDrain', 'GoldQuake', 'CelticClock']) {
    assert.deepStrictEqual(JSON.parse(JSON.stringify(art[module].colors)), JSON.parse(JSON.stringify(reference[module].colors)), `${module} colours`);
}
console.log(`redrawn skill art: ${calls} calls, ${drawn} dots identical to the handoff source`);
