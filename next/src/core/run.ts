// One act run: spawn packs on the authored map, walk the player through the fog, fight, open the
// boss gate once every elite pack falls, and settle the temporary loot exactly once on the boss kill.
import {
  ARMOR_K, BOSS_ITEM_COUNT, BOSS_STACK, CURRENCY_DROPS, DAMAGE_SPREAD, ENEMY, ITEM_DROPS, PACKS, PLAYER, REST_MS, TICK_MS, expToNext
} from '../data/balance.ts';
import { rollItem } from './items.ts';
import { actMap, distances, isFloor, lineOfSight, reach, route, tileIndex, visibleTiles } from './map.ts';
import { chance, random, rollInt } from './rng.ts';
import { stats } from './stats.ts';
import type { ActMap, Cell, CurrencyKey, Enemy, GameEvent, GameState, Room, Run, Stats, TempLoot } from './types.ts';

const emptyLoot = (): TempLoot => ({ currencies: {}, items: [] });

/** Floor cells of a room, nearest to its centre first (ties by tile index). */
function roomCells(map: ActMap, room: Room): Cell[] {
  const cells: Cell[] = [];
  for (let y = room.y - room.radiusY; y <= room.y + room.radiusY; y++) {
    for (let x = room.x - room.radiusX; x <= room.x + room.radiusX; x++) if (isFloor(map, { x, y })) cells.push({ x, y });
  }
  return cells.sort((a, b) => reach(a, room) - reach(b, room) || tileIndex(map, a) - tileIndex(map, b));
}

function spawnPacks(state: GameState, map: ActMap, run: Run): void {
  for (const room of map.rooms) {
    if (room.role === 'entry') continue;
    const kinds = PACKS[room.role], cells = roomCells(map, room);
    if (cells.length < kinds.length) throw new Error(`act ${map.act} room ${room.id} cannot hold its pack`);
    const packId = state.nextId++;
    run.packs.push({ id: packId, roomId: room.id, role: room.role, alive: kinds.length });
    kinds.forEach((kind, i) => {
      const k = ENEMY.kind[kind], hp = Math.round(ENEMY.hp(map.act) * k.hp);
      run.enemies.push({
        id: state.nextId++, kind, packId, hp, maxHp: hp, damage: ENEMY.damage(map.act) * k.damage,
        attackMs: k.attackMs, moveMs: ENEMY.moveMsPerTile, active: false, ...cells[i]!
      });
    });
  }
}

function reveal(map: ActMap, run: Run): void {
  for (const id of visibleTiles(map, run.player, PLAYER.sightRadius)) run.fog[id] = 1;
}

/** The sealed boss gate, as a blocked-tile set for routing and sight. */
const sealed = (map: ActMap, run: Run): Set<number> => new Set(run.gateOpen ? [] : [tileIndex(map, map.gate)]);

export function startRun(state: GameState, act: number): GameEvent[] {
  const map = actMap(act);
  const run: Run = {
    act, status: 'active', player: { x: map.entry.x, y: map.entry.y, moveMs: 0, attackMs: 0 },
    fog: new Array<number>(map.tiles.length).fill(0), enemies: [], packs: [], gateOpen: false, loot: emptyLoot(), restMs: 0
  };
  spawnPacks(state, map, run);
  reveal(map, run);
  state.run = run;
  state.hp = stats(state).maxHp;
  return [{ type: 'runStarted', act }];
}

function gainExp(state: GameState, amount: number, events: GameEvent[]): void {
  state.exp += Math.round(amount);
  while (state.exp >= expToNext(state.level)) {
    state.exp -= expToNext(state.level);
    state.level++;
    state.buildRevision++;
    state.hp = stats(state).maxHp;
    events.push({ type: 'levelUp', level: state.level });
  }
}

function rollDrops(state: GameState, run: Run, enemy: Enemy, events: GameEvent[]): void {
  const currencies: Partial<Record<CurrencyKey, number>> = {};
  for (const [key, p] of Object.entries(CURRENCY_DROPS[enemy.kind]) as [CurrencyKey, number][]) {
    if (!chance(state, p)) continue;
    const amount = enemy.kind === 'boss' ? rollInt(state, BOSS_STACK[0], BOSS_STACK[1]) : 1;
    currencies[key] = amount;
    run.loot.currencies[key] = (run.loot.currencies[key] ?? 0) + amount;
  }
  const count = enemy.kind === 'boss' ? BOSS_ITEM_COUNT : chance(state, ITEM_DROPS[enemy.kind]) ? 1 : 0;
  const items = Array.from({ length: count }, () => rollItem(state, run.act));
  run.loot.items.push(...items);
  if (items.length > 0 || Object.keys(currencies).length > 0) {
    events.push({ type: 'lootDropped', enemyId: enemy.id, x: enemy.x, y: enemy.y, currencies, items });
  }
}

/** Move the run's loot into the save. Emptying run.loot makes a second settlement impossible. */
function settle(state: GameState, run: Run, events: GameEvent[]): void {
  const loot = run.loot;
  run.loot = emptyLoot();
  for (const [key, amount] of Object.entries(loot.currencies) as [CurrencyKey, number][]) state.currencies[key] += amount;
  state.inventory.push(...loot.items);
  state.actsCleared = Math.max(state.actsCleared, run.act);
  run.status = 'cleared';
  run.restMs = REST_MS.cleared;
  events.push({ type: 'actCleared', act: run.act, loot });
}

function kill(state: GameState, run: Run, enemy: Enemy, events: GameEvent[]): void {
  run.enemies.splice(run.enemies.indexOf(enemy), 1);
  const pack = run.packs.find(p => p.id === enemy.packId);
  if (pack) pack.alive--;
  events.push({ type: 'enemyKilled', kind: enemy.kind, enemyId: enemy.id });
  gainExp(state, ENEMY.exp(run.act) * ENEMY.kind[enemy.kind].exp, events);
  rollDrops(state, run, enemy, events);
  if (!run.gateOpen && !run.packs.some(p => p.role === 'elite' && p.alive > 0)) {
    run.gateOpen = true;
    events.push({ type: 'gateOpened', act: run.act });
  }
  if (enemy.kind === 'boss') settle(state, run, events);
}

function wakePacks(map: ActMap, run: Run): void {
  const gate = sealed(map, run);
  for (const enemy of run.enemies) {
    if (enemy.active || reach(enemy, run.player) > ENEMY.wakeReach || !lineOfSight(map, run.player, enemy, gate)) continue;
    for (const mate of run.enemies) if (mate.packId === enemy.packId) mate.active = true;
  }
}

/** Nearest enemy worth walking to: awake ones first, then the packs this explore mode must clear. */
function chooseGoal(state: GameState, map: ActMap, run: Run): Enemy | null {
  const dist = distances(map, run.player, sealed(map, run));
  const nearest = (list: Enemy[]) => list
    .filter(e => dist.has(tileIndex(map, e)))
    .sort((a, b) => dist.get(tileIndex(map, a))! - dist.get(tileIndex(map, b))! || a.id - b.id)[0] ?? null;
  const awake = nearest(run.enemies.filter(e => e.active));
  if (awake) return awake;
  const required = new Set(run.packs
    .filter(p => p.alive > 0 && (state.settings.exploreMode === 'full' || p.role === 'elite' || p.role === 'boss'))
    .map(p => p.id));
  return nearest(run.enemies.filter(e => required.has(e.packId)));
}

function stepPlayer(state: GameState, map: ActMap, run: Run, s: Stats): void {
  const goal = chooseGoal(state, map, run);
  if (!goal) return;
  const gate = sealed(map, run), occupied = new Set(run.enemies.map(e => tileIndex(map, e)));
  occupied.delete(tileIndex(map, goal));
  const around = route(map, run.player, goal, new Set([...gate, ...occupied]));
  const next = (around.length > 0 ? around : route(map, run.player, goal, gate))[0];
  if (!next || occupied.has(tileIndex(map, next)) || tileIndex(map, next) === tileIndex(map, goal)) return;
  run.player.x = next.x;
  run.player.y = next.y;
  run.player.moveMs = s.moveMsPerTile;
  reveal(map, run);
}

function playerAct(state: GameState, map: ActMap, run: Run, s: Stats, events: GameEvent[]): void {
  const p = run.player;
  p.attackMs = Math.max(0, p.attackMs - TICK_MS);
  p.moveMs = Math.max(0, p.moveMs - TICK_MS);
  const gate = sealed(map, run);
  const target = run.enemies
    .filter(e => reach(e, p) <= s.range && lineOfSight(map, p, e, gate))
    .sort((a, b) => reach(a, p) - reach(b, p) || a.id - b.id)[0];
  if (!target) {
    if (p.moveMs === 0) stepPlayer(state, map, run, s);
    return;
  }
  if (p.attackMs > 0) return;
  p.attackMs = 1000 / s.attacksPerSec;
  for (const mate of run.enemies) if (mate.packId === target.packId) mate.active = true;
  const damage = Math.min(target.hp, s.damage * (1 + (random(state) * 2 - 1) * DAMAGE_SPREAD));
  target.hp -= damage;
  events.push({ type: 'playerAttacked', targetId: target.id, damage, killed: target.hp <= 0 });
  if (target.hp <= 0) kill(state, run, target, events);
}

function die(state: GameState, run: Run, events: GameEvent[]): void {
  state.hp = 0;
  state.deaths++;
  run.status = 'failed';
  run.restMs = REST_MS.failed;
  const lostLoot = run.loot;
  run.loot = emptyLoot();
  events.push({ type: 'playerDied', act: run.act, lostLoot });
}

function stepEnemy(map: ActMap, run: Run, enemy: Enemy): void {
  const blocked = sealed(map, run);
  for (const other of run.enemies) if (other !== enemy) blocked.add(tileIndex(map, other));
  const next = route(map, enemy, run.player, blocked)[0];
  if (!next || (next.x === run.player.x && next.y === run.player.y)) return;
  enemy.x = next.x;
  enemy.y = next.y;
  enemy.moveMs = ENEMY.moveMsPerTile;
}

function enemiesAct(state: GameState, map: ActMap, run: Run, s: Stats, events: GameEvent[]): void {
  for (const enemy of run.enemies) {
    if (!enemy.active) continue;
    enemy.attackMs = Math.max(0, enemy.attackMs - TICK_MS);
    enemy.moveMs = Math.max(0, enemy.moveMs - TICK_MS);
    if (reach(enemy, run.player) > 1) {
      if (enemy.moveMs === 0) stepEnemy(map, run, enemy);
      continue;
    }
    if (enemy.attackMs > 0) continue;
    enemy.attackMs = ENEMY.kind[enemy.kind].attackMs;
    const damage = enemy.damage * ARMOR_K / (ARMOR_K + s.armor);
    state.hp -= damage;
    events.push({ type: 'enemyAttacked', enemyId: enemy.id, damage });
    if (state.hp <= 0) return die(state, run, events);
  }
}

/** Advance the active run by one tick. */
export function tickRun(state: GameState, run: Run, events: GameEvent[]): void {
  const map = actMap(run.act), s = stats(state);
  state.hp = Math.min(s.maxHp, state.hp + s.maxHp * s.regenPerSec * TICK_MS / 1000);
  wakePacks(map, run);
  playerAct(state, map, run, s, events);
  if (run.status === 'active') enemiesAct(state, map, run, s, events);
}
