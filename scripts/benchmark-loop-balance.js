// Repeatable loop survey and real combat probes. No saved player data is read or changed.
const fs = require('node:fs');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const probe = require('./lib/loop-balance-probe');
const args = process.argv.slice(2);
const value = (flag, fallback) => args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;
const overrides = args.includes('--sources') ? JSON.parse(fs.readFileSync(value('--sources'), 'utf8')) : {};
const loops = value('--loops', '1,3,5,10,20,30,50').split(',').map(Number);
const seeds = value('--seeds', '5,17,29').split(',').map(Number);
const powers = value('--powers', '10000,160000,640000').split(',').map(Number);
const zones = value('--zones', '9,29,39').split(',').map(Number);
const durationMs = Number(value('--duration-ms', '60000'));
const skills = ['연속 베기', '서리 폭발'];
const rows = [], curves = [];
for (const loop of loops) for (const zone of zones) {
    const runtime = buildGameRuntime(overrides);
    runtime.caseInput = { loop, zone };
    curves.push(vm.runInContext(`(() => {
        game.season=caseInput.loop;game.loopCount=caseInput.loop-1;game.currentZoneId=caseInput.zone;
        Math.random=()=>0.5;
        const zone=getZone(caseInput.zone), enemy=createEnemy(zone,{boss:true,at:50},0);
        return {loop:caseInput.loop,zone:caseInput.zone,name:zone.name,hp:enemy.maxHp,
            armor:enemy.armor,evasion:enemy.evasion,dr:enemy.dr,resF:enemy.resF,
            drop:getEquipmentDropChances(zone,enemy).equipment,estimate:estimateMapZonePowerRequirements(zone)};
    })()`, runtime));
    for (const power of powers) for (const skill of skills) for (const seed of seeds) {
        const context = buildGameRuntime(overrides);
        let state = seed;
        context.Math = Object.create(Math);
        context.Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
        context.caseInput = { loop, zone, power, skill, seed, rank: 'boss', durationMs };
        rows.push(vm.runInContext(`(${probe.toString()})(caseInput)`, context));
    }
    console.log(`loop ${loop}, zone ${zone}: ${rows.length} probes`);
}
const output = value('--output', 'artifacts/loop-balance/latest.json');
fs.mkdirSync(require('node:path').dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify({ method: 'Synthetic stat-input combat probes, not legal builds, clear-speed targets or a human fun assessment. Same inputs across loops. Real coreLoop; flat life=20k*sqrt(power/10k), 10k accuracy, 60 resists, +60% attack speed, level 10 skills. 100 ms ticks; timeouts are censored, not victories. Skill samples have different native coefficients; do not rank class balance from them.',
    loops, seeds, powers, zones, durationMs, curves, rows }, null, 2) + '\n');
console.log(`${output}: ${rows.length} probes; ${rows.filter(row => row.cleared).length} cleared; ${rows.filter(row => row.deaths).length} died`);
