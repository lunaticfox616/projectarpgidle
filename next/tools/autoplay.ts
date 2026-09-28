// Headless first-loop measurement: play one character from act 1 until the act-10 boss falls and
// report simulated time per act. Usage: node tools/autoplay.ts [--class warrior|arcanist] [--seed N] [--mode boss|full] [--seeds K]
import { parseArgs } from 'node:util';
import { createGame, LAST_ACT, step } from '../src/core/game.ts';
import type { ClassId, ExploreMode } from '../src/core/types.ts';

const HOUR = 3_600_000;
const { values } = parseArgs({ options: {
  class: { type: 'string', default: 'warrior' }, seed: { type: 'string', default: '1' },
  seeds: { type: 'string', default: '1' }, mode: { type: 'string', default: 'boss' }, cap: { type: 'string', default: '6' }
} });

interface ActLine { act: number; clearedAtMs: number; deaths: number; level: number }

function play(seed: number): { lines: ActLine[]; totalMs: number | null } {
  const state = createGame(seed, values.class as ClassId, { exploreMode: values.mode as ExploreMode });
  const lines: ActLine[] = [];
  let deathsBefore = 0;
  while (state.actsCleared < LAST_ACT && state.timeMs < Number(values.cap) * HOUR) {
    for (const event of step(state)) {
      if (event.type !== 'actCleared' || lines.some(l => l.act === event.act)) continue;
      lines.push({ act: event.act, clearedAtMs: state.timeMs, deaths: state.deaths - deathsBefore, level: state.level });
      deathsBefore = state.deaths;
    }
  }
  return { lines, totalMs: state.actsCleared >= LAST_ACT ? state.timeMs : null };
}

const minutes = (ms: number) => (ms / 60_000).toFixed(1);
const first = Number(values.seed), count = Number(values.seeds);
const totals: number[] = [];
for (let seed = first; seed < first + count; seed++) {
  const { lines, totalMs } = play(seed);
  if (count === 1) {
    console.log(`class ${values.class}, mode ${values.mode}, seed ${seed}`);
    console.log('act  cleared at  act time  deaths  level');
    let previous = 0;
    for (const l of lines) {
      console.log(`${String(l.act).padStart(3)}  ${minutes(l.clearedAtMs).padStart(8)}m  ${minutes(l.clearedAtMs - previous).padStart(7)}m  ${String(l.deaths).padStart(6)}  ${String(l.level).padStart(5)}`);
      previous = l.clearedAtMs;
    }
  }
  if (totalMs === null) console.log(`seed ${seed}: stalled after act ${lines.length} (cap ${values.cap}h)`);
  else totals.push(totalMs);
}
if (totals.length > 0) {
  totals.sort((a, b) => a - b);
  console.log(`first loop: ${totals.length}/${count} finished, median ${minutes(totals[Math.floor(totals.length / 2)]!)}m, range ${minutes(totals[0]!)}-${minutes(totals.at(-1)!)}m (target 15-30m)`);
}
