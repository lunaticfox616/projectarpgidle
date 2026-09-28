// View model between the rules core and the canvas. The core resolves a swing the moment it starts;
// the scene replays it: the attack animation plays, the hit lands on the sheet's hit frame, and the
// kill, drops and banners that followed wait for that moment. Nothing here changes GameState.
import { ENEMY } from '../data/balance.ts';
import { actMap } from '../core/map.ts';
import type { CharacterSheet, Facing, Motion } from '../data/characters.ts';
import type { CurrencyKey, EnemyKind, GameEvent, GameState, Item, TempLoot } from '../core/types.ts';

export interface Actor {
  id: number;
  kind: 'player' | EnemyKind;
  /** Displayed position in tiles (fractional while walking). */
  x: number;
  y: number;
  from: [number, number];
  to: [number, number];
  moveAt: number;
  moveMs: number;
  facing: Facing;
  motion: Motion;
  motionAt: number;
  /** Playback speed of the current one-shot motion (attack faster than its sheet when needed). */
  motionRate: number;
  flashAt: number;
  lungeAt: number;
  hp: number;
  maxHp: number;
  active: boolean;
  /** When the killing blow visibly lands; the actor fades out afterwards. */
  diedAt: number | null;
}

export type Fx =
  | { kind: 'number'; at: number; x: number; y: number; text: string; tone: 'deal' | 'take' | 'heal' | 'big' }
  | { kind: 'slash'; at: number; x: number; y: number; facing: Facing }
  | { kind: 'bolt'; at: number; from: [number, number]; to: [number, number]; ms: number }
  | { kind: 'burst'; at: number; x: number; y: number; color: string; radius: number }
  | { kind: 'drop'; at: number; x: number; y: number; dx: number; currency: CurrencyKey | null; rarity: Item['rarity'] | null }
  | { kind: 'levelUp'; at: number };

export type Announcement =
  | { kind: 'act'; act: number }
  | { kind: 'boss'; act: number }
  | { kind: 'gate' }
  | { kind: 'levelUp'; level: number }
  | { kind: 'cleared'; act: number; loot: TempLoot }
  | { kind: 'died'; lost: TempLoot }
  | { kind: 'equipped'; count: number }
  | { kind: 'rareDrop'; item: Item };

/** Sheet timings the scene needs; defaults stand in when the character kit is missing. */
export interface Timing { attackMs: number; hitDelayMs: number; hitMs: number; ranged: boolean; muzzle: Record<Facing, [number, number]> | null }

export interface Scene {
  act: number;
  /** View clock in game milliseconds; equals state.timeMs plus the not-yet-stepped remainder. */
  time: number;
  actors: Map<number, Actor>;
  playerId: number;
  fx: Fx[];
  queue: { at: number; event: GameEvent }[];
  announcements: Announcement[];
  shakeAt: number;
  shakePower: number;
  bossAnnounced: boolean;
  diedAt: number | null;
  timing: Timing;
}

const PLAYER_ID = 0;
const LUNGE_MS = 140;
/** Tiles per ms of an orb in flight. */
const BOLT_SPEED = 0.028;

export function timingFrom(sheet: CharacterSheet | null, ranged: boolean): Timing {
  if (!sheet) return { attackMs: 600, hitDelayMs: 300, hitMs: 400, ranged, muzzle: null };
  const attack = sheet.motions.attack, sum = (list: number[]) => list.reduce((a, b) => a + b, 0);
  return {
    attackMs: sum(attack.frameMs),
    hitDelayMs: sum(attack.frameMs.slice(0, attack.hitFrame ?? 0)),
    hitMs: sum(sheet.motions.hit.frameMs),
    ranged,
    muzzle: attack.muzzle
  };
}

function newActor(id: number, kind: Actor['kind'], x: number, y: number, hp: number, time: number): Actor {
  return {
    id, kind, x, y, from: [x, y], to: [x, y], moveAt: time, moveMs: 1, facing: 'down', motion: 'idle', motionAt: time,
    motionRate: 1, flashAt: -Infinity, lungeAt: -Infinity, hp, maxHp: hp, active: false, diedAt: null
  };
}

/** A fresh scene for the state's current run. */
export function createScene(state: GameState, timing: Timing): Scene {
  const run = state.run!;
  const scene: Scene = {
    act: run.act, time: state.timeMs, actors: new Map(), playerId: PLAYER_ID, fx: [], queue: [], announcements: [],
    shakeAt: -Infinity, shakePower: 0, bossAnnounced: false, diedAt: null, timing
  };
  scene.actors.set(PLAYER_ID, newActor(PLAYER_ID, 'player', run.player.x, run.player.y, state.hp, state.timeMs));
  for (const e of run.enemies) scene.actors.set(e.id, { ...newActor(e.id, e.kind, e.x, e.y, e.maxHp, state.timeMs), hp: e.hp, active: e.active });
  return scene;
}

export const player = (scene: Scene): Actor => scene.actors.get(scene.playerId)!;

function faceToward(actor: Actor, x: number, y: number): void {
  const dx = x - actor.to[0], dy = y - actor.to[1];
  if (dx === 0 && dy === 0) return;
  actor.facing = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
}

function moveTo(actor: Actor, x: number, y: number, at: number, ms: number): void {
  if (actor.to[0] === x && actor.to[1] === y) return;
  faceToward(actor, x, y);
  actor.from = [actor.x, actor.y];
  actor.to = [x, y];
  actor.moveAt = at;
  actor.moveMs = ms;
}

/** Follow the state after steps: new positions start tweens, gone enemies without a death fade are dropped. */
export function syncScene(scene: Scene, state: GameState, moveMsPerTile: number): void {
  const run = state.run!, hero = player(scene);
  moveTo(hero, run.player.x, run.player.y, state.timeMs, moveMsPerTile);
  const alive = new Set<number>([scene.playerId]);
  for (const e of run.enemies) {
    alive.add(e.id);
    const actor = scene.actors.get(e.id) ?? newActor(e.id, e.kind, e.x, e.y, e.maxHp, state.timeMs);
    scene.actors.set(e.id, actor);
    moveTo(actor, e.x, e.y, state.timeMs, ENEMY.moveMsPerTile);
    actor.active = e.active;
    if (e.kind === 'boss' && e.active && !scene.bossAnnounced) {
      scene.bossAnnounced = true;
      scene.announcements.push({ kind: 'boss', act: run.act });
    }
  }
  for (const [id, actor] of scene.actors) if (!alive.has(id) && actor.diedAt === null) scene.actors.delete(id);
}

function shake(scene: Scene, at: number, power: number): void {
  if (power >= scene.shakePower || scene.time - scene.shakeAt > 300) {
    scene.shakeAt = at;
    scene.shakePower = power;
  }
}

/** Play the swing now; returns when the blow visibly lands, for the events that follow from it. */
function playerSwing(scene: Scene, e: Extract<GameEvent, { type: 'playerAttacked' }>, at: number, intervalMs: number): number {
  const hero = player(scene), target = scene.actors.get(e.targetId);
  if (!target) return at;
  faceToward(hero, target.to[0], target.to[1]);
  const t = scene.timing, rate = Math.max(1, t.attackMs / (intervalMs * 0.95));
  Object.assign(hero, { motion: 'attack', motionAt: at, motionRate: rate });
  let impact = at + t.hitDelayMs / rate;
  if (t.ranged) {
    const m = t.muzzle?.[hero.facing] ?? [39, 30];
    const from: [number, number] = [hero.to[0] + (m[0] - 39) / 16, hero.to[1] + (m[1] - 39) / 16];
    const ms = Math.hypot(target.to[0] - from[0], target.to[1] - from[1]) / BOLT_SPEED;
    scene.fx.push({ kind: 'bolt', at: impact, from, to: [target.to[0], target.to[1]], ms });
    impact += ms;
  } else {
    scene.fx.push({ kind: 'slash', at: impact, x: hero.to[0], y: hero.to[1], facing: hero.facing });
  }
  const big = target.kind !== 'normal';
  scene.fx.push({ kind: 'number', at: impact, x: target.to[0], y: target.to[1], text: String(Math.round(e.damage)), tone: e.killed && big ? 'big' : 'deal' });
  scene.fx.push({ kind: 'burst', at: impact, x: target.to[0], y: target.to[1], color: t.ranged ? '#c9a4ff' : '#fff3c4', radius: e.killed ? 0.9 : 0.5 });
  target.flashAt = impact;
  target.hp = Math.max(0, target.hp - e.damage);
  if (e.killed) {
    target.diedAt = impact;
    if (target.kind === 'boss') shake(scene, impact, 7);
  }
  return impact;
}

function enemyStrike(scene: Scene, e: Extract<GameEvent, { type: 'enemyAttacked' }>, at: number, state: GameState): void {
  const enemy = scene.actors.get(e.enemyId), hero = player(scene);
  if (enemy) {
    enemy.lungeAt = at;
    faceToward(enemy, hero.to[0], hero.to[1]);
  }
  const hitAt = at + LUNGE_MS * 0.6;
  hero.flashAt = hitAt;
  if (hero.motion !== 'attack' || scene.time - hero.motionAt > scene.timing.attackMs) Object.assign(hero, { motion: 'hit', motionAt: hitAt, motionRate: 1 });
  hero.hp = state.hp;
  scene.fx.push({ kind: 'number', at: hitAt, x: hero.to[0], y: hero.to[1], text: String(Math.max(1, Math.round(e.damage))), tone: 'take' });
  shake(scene, hitAt, enemy?.kind === 'boss' ? 5 : 2);
}

function drops(scene: Scene, e: Extract<GameEvent, { type: 'lootDropped' }>, at: number): void {
  const spread = (i: number) => (i % 2 === 0 ? 1 : -1) * (0.25 + 0.2 * Math.floor(i / 2));
  let i = 0;
  for (const key of Object.keys(e.currencies) as CurrencyKey[]) scene.fx.push({ kind: 'drop', at, x: e.x, y: e.y, dx: spread(i++), currency: key, rarity: null });
  for (const item of e.items) {
    scene.fx.push({ kind: 'drop', at, x: e.x, y: e.y, dx: spread(i++), currency: null, rarity: item.rarity });
    if (item.rarity === 'rare') scene.announcements.push({ kind: 'rareDrop', item });
  }
}

/** Apply one event at its visible time. */
function apply(scene: Scene, event: GameEvent, at: number, state: GameState): void {
  switch (event.type) {
    case 'lootDropped': return drops(scene, event, at);
    case 'gateOpened': {
      const gate = actMap(scene.act).gate;
      scene.fx.push({ kind: 'burst', at, x: gate.x, y: gate.y, color: '#ffd98a', radius: 2.2 });
      shake(scene, at, 3);
      scene.announcements.push({ kind: 'gate' });
      return;
    }
    case 'levelUp':
      scene.fx.push({ kind: 'levelUp', at });
      scene.announcements.push({ kind: 'levelUp', level: event.level });
      return;
    case 'actCleared':
      shake(scene, at, 4);
      scene.announcements.push({ kind: 'cleared', act: event.act, loot: event.loot });
      return;
    case 'playerDied':
      scene.diedAt = at;
      player(scene).diedAt = at;
      scene.announcements.push({ kind: 'died', lost: event.lostLoot });
      return;
    case 'itemsEquipped':
      scene.announcements.push({ kind: 'equipped', count: event.itemIds.length });
      return;
    case 'enemyAttacked':
      return enemyStrike(scene, event, at, state);
    default:
      return;
  }
}

/**
 * Take the events of one step taken at `stepAt`. Swings play at once; whatever the swing caused
 * (kills, drops, gate, level, clear) is queued until the blow lands.
 */
export function takeEvents(scene: Scene, events: GameEvent[], stepAt: number, attackIntervalMs: number): void {
  let landsAt = stepAt;
  for (const event of events) {
    if (event.type === 'playerAttacked') landsAt = Math.max(landsAt, playerSwing(scene, event, stepAt, attackIntervalMs));
    else if (event.type === 'enemyAttacked' || event.type === 'playerDied') scene.queue.push({ at: stepAt + (event.type === 'playerDied' ? LUNGE_MS : 0), event });
    else if (event.type !== 'runStarted' && event.type !== 'enemyKilled') scene.queue.push({ at: landsAt, event });
  }
  scene.queue.sort((a, b) => a.at - b.at);
}

/** Advance the view clock: deliver due events, move actors along their tweens, expire effects. */
export function updateScene(scene: Scene, time: number, state: GameState): void {
  scene.time = time;
  while (scene.queue.length > 0 && scene.queue[0]!.at <= time) {
    const { at, event } = scene.queue.shift()!;
    apply(scene, event, at, state);
  }
  for (const [id, actor] of scene.actors) {
    const t = Math.min(1, Math.max(0, (time - actor.moveAt) / actor.moveMs));
    actor.x = actor.from[0] + (actor.to[0] - actor.from[0]) * t;
    actor.y = actor.from[1] + (actor.to[1] - actor.from[1]) * t;
    if (actor.diedAt !== null && actor.kind !== 'player' && time - actor.diedAt > 900) scene.actors.delete(id);
  }
  scene.fx = scene.fx.filter(f => time - f.at < 2600);
}

/** Which motion an actor shows now and how far into it, in sheet milliseconds. */
export function motionNow(scene: Scene, actor: Actor, oneShotMs: Record<'attack' | 'hit', number>): { motion: Motion; ms: number } {
  const since = scene.time - actor.motionAt;
  if ((actor.motion === 'attack' || actor.motion === 'hit') && since >= 0 && since * actor.motionRate < oneShotMs[actor.motion]) {
    return { motion: actor.motion, ms: since * actor.motionRate };
  }
  const walking = scene.time - actor.moveAt < actor.moveMs + 60;
  return { motion: walking ? 'walk' : 'idle', ms: scene.time };
}
