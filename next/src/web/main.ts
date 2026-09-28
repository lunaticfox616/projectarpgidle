// Browser entry: load or start a game, settle time away, then run the fixed-tick loop and draw.
import { TICK_MS } from '../data/balance.ts';
import { CLASS_SPRITES } from '../data/characters.ts';
import { createGame, step } from '../core/game.ts';
import { actMap } from '../core/map.ts';
import { stats } from '../core/stats.ts';
import { actArt, loadCharacter, type Art } from './art.ts';
import { bakeTerrain } from './terrain.ts';
import { createView, drawWorld, fitZoom, type View } from './draw.ts';
import { createScene, syncScene, takeEvents, timingFrom, updateScene, type Scene } from './scene.ts';
import { announce, createHud, drawIdle, toast, updateHud, type Hud } from './hud.ts';
import { hasUnseenItems, initPanels, refreshPanel } from './panels.ts';
import { chooseClass, settleAway } from './screens.ts';
import { clearSave, readPrefs, readSave, writePrefs, writeSave, type Prefs } from './storage.ts';
import type { GameState } from '../core/types.ts';

const SAVE_EVERY_MS = 10_000;
/** Away longer than this gets the settlement summary; shorter gaps are replayed silently. */
const SUMMARY_AFTER_MS = 20_000;

interface Game {
  state: GameState;
  art: Art;
  view: View;
  scene: Scene;
  hud: Hud;
  prefs: Prefs;
  /** Game milliseconds not yet stepped. */
  acc: number;
  last: number;
  savedAt: number;
  /** Pending act loads and settlements; while above zero the loop neither steps nor draws. */
  busy: number;
  hiddenAt: number | null;
}

const canvas = document.getElementById('world') as HTMLCanvasElement;
let game: Game;
/** Set once the player chose to start over: no later save (pagehide, timer) may bring the old game back. */
let resetting = false;

function save(): void {
  if (resetting) return;
  game.savedAt = Date.now();
  if (!writeSave(game.state, game.savedAt)) toast('저장하지 못했다 — 브라우저 저장 공간을 확인해 주세요');
}

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  if (game) fitZoom(game.view, window.innerWidth, window.innerHeight, dpr);
}

/** Load (or reuse) the current act's art, bake its terrain and start a fresh scene. */
async function enterAct(g: Pick<Game, 'state' | 'art'> & Partial<Game>, announceAct: boolean): Promise<{ art: Art; view: View; scene: Scene }> {
  const run = g.state.run!, map = actMap(run.act);
  const sameAct = g.view && g.scene && g.scene.act === run.act;
  const art = sameAct ? g.art : actArt(run.act, g.art);
  const view = sameAct ? g.view! : createView(canvas, await bakeTerrain(map), map);
  const ranged = stats(g.state).range > 1;
  const scene = createScene(g.state, timingFrom(art.character?.sheet ?? null, ranged));
  if (announceAct) scene.announcements.push({ kind: 'act', act: run.act });
  return { art, view, scene };
}

function applyAct(next: { art: Art; view: View; scene: Scene }): void {
  // The combat log reads across acts: its entries carry game time, which keeps running.
  if (game.scene) next.scene.log = game.scene.log;
  game.art = next.art;
  game.view = next.view;
  game.scene = next.scene;
  resize();
}

function tick(): void {
  const state = game.state, events = step(state);
  if (events.some(e => e.type === 'runStarted')) {
    game.busy++;
    // A retry after death keeps the death banner up instead of re-announcing the same act.
    enterAct(game, state.run!.act !== game.scene.act).then(applyAct, (error: unknown) => {
      console.error('main: entering the next act failed', error);
      toast('다음 막을 불러오지 못했다 — 새로고침해 주세요');
    }).finally(() => { game.busy--; });
    return;
  }
  const s = stats(state);
  takeEvents(game.scene, events, state.timeMs, 1000 / s.attacksPerSec);
  syncScene(game.scene, state, s.moveMsPerTile);
}

function frame(now: number): void {
  const dt = Math.min(250, now - game.last);
  game.last = now;
  if (game.busy === 0) {
    game.acc += dt * game.prefs.speed;
    for (let n = 0; game.acc >= TICK_MS && n < 40 && game.busy === 0; n++) {
      tick();
      game.acc -= TICK_MS;
    }
    game.acc = Math.min(game.acc, TICK_MS * 2);
  }
  const { state, scene } = game;
  if (game.busy === 0) {
    updateScene(scene, state.timeMs + game.acc, state);
    for (const a of scene.announcements.splice(0)) announce(a);
    drawWorld(game.view, scene, state, game.art, actMap(scene.act));
    updateHud(game.hud, state, scene, hasUnseenItems(state));
    refreshPanel();
    drawIdle(document.getElementById('portrait') as HTMLCanvasElement, game.art, scene.time, [29, 13, 21]);
    const dead = state.run!.status === 'failed';
    document.body.classList.toggle('dead', dead);
    document.getElementById('vignette')!.classList.toggle('dead', dead);
  }
  if (Date.now() - game.savedAt > SAVE_EVERY_MS && game.busy === 0) save();
  requestAnimationFrame(frame);
}

async function settle(awayMs: number): Promise<void> {
  // Let a pending act load finish first, so its scene cannot land on top of the settled one.
  while (game.busy > 0) await new Promise(resolve => setTimeout(resolve, 50));
  game.busy++;
  try {
    await settleAway(game.state, awayMs, awayMs < SUMMARY_AFTER_MS);
    applyAct(await enterAct({ state: game.state, art: game.art }, false));
    save();
  } finally {
    game.busy--;
    game.last = performance.now();
  }
}

function bindControls(): void {
  const speedButtons = document.querySelectorAll<HTMLButtonElement>('[data-speed]');
  const showSpeed = () => speedButtons.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === game.prefs.speed)));
  speedButtons.forEach(b => b.addEventListener('click', () => {
    game.prefs.speed = Number(b.dataset.speed) as Prefs['speed'];
    writePrefs(game.prefs);
    showSpeed();
  }));
  showSpeed();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      save();
      game.hiddenAt = Date.now();
    } else if (game.hiddenAt !== null) {
      const away = Date.now() - game.hiddenAt;
      game.hiddenAt = null;
      if (away > 1000) void settle(away);
    }
  });
  window.addEventListener('pagehide', save);
}

async function boot(): Promise<void> {
  const loaded = readSave();
  const state = loaded.kind === 'ok' ? loaded.state
    : createGame(crypto.getRandomValues(new Uint32Array(1))[0]!, await chooseClass(loaded.kind === 'broken' ? `저장을 읽지 못해 새로 시작합니다 (${loaded.reason}). 손상된 저장은 브라우저에 따로 보관했습니다.` : null));
  const character = await loadCharacter(CLASS_SPRITES[state.classId]);
  const first = await enterAct({ state, art: actArt(state.run!.act, { character: character.art, characterProblem: character.problem }) }, true);
  game = { state, ...first, hud: createHud(), prefs: readPrefs(), acc: 0, last: performance.now(), savedAt: Date.now(), busy: 0, hiddenAt: null };
  initPanels({ state: () => game.state, saved: save, reset: () => {
    resetting = true;
    clearSave();
    window.location.reload();
  } });
  bindControls();
  resize();
  game.hud.root.hidden = false;
  const note = document.getElementById('asset-note')!;
  note.hidden = !character.problem;
  note.textContent = character.problem ?? '';
  if (loaded.kind === 'ok') await settle(Date.now() - loaded.savedAt);
  else save();
  requestAnimationFrame(frame);
}

boot().catch((error: unknown) => {
  console.error('main: boot failed', error);
  document.body.insertAdjacentHTML('beforeend', `<p class="asset-note" style="position:fixed;left:16px;top:16px;color:#ffb3a6">게임을 시작하지 못했다: ${String(error)}</p>`);
});
