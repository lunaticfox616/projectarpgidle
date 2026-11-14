import { battlefieldClientPoint } from '../browser/battle-canvas-box.mjs';

export function mark(runtime, key) {
    if (seen(runtime, key)) return;
    runtime.deps.game.seenTutorials.push(key);
    if (runtime.deps.contentProgression.opening.applies(runtime.deps.game)) (0, runtime.deps.queueImportantSave)(220);
}

/** While the hero is not yet in the room where Haken is struck (js/combat-encounters.js starterRescueRoom): the side of the next door toward it. */
export function doorToRescue(runtime, run) {
    const map = run && runtime.deps.actExplorationDoors.stageMap(run), pack = run && run.packs.find(row => row.rescue);
    const here = map && runtime.deps.actExplorationDoors.room(run), there = pack && map.rooms.find(room => room.id === pack.roomId);
    if (!here || !there || here === there) return null;
    const door = map.hops[here.index] && map.hops[here.index][there.index];
    return door ? door.side : null;
}

/** A brand-new game: first loop, level 1 with no experience, standing in act 1 before any other map, the opening not yet played. */
export function fresh(runtime) {
    return newGame(runtime) && !seen(runtime, runtime.state.KEY.intro) && !seen(runtime, runtime.state.KEY.done) && started(runtime);
}

export function rescueStruck(runtime, run) {
    const pack = run && run.packs.find(row => row.rescue);
    if (!pack || !pack.aliveIds.length) return true;
    return runtime.deps.game.enemies.some(enemy => enemy && pack.aliveIds.includes(enemy.id) && enemy.hp < enemy.maxHp);
}

/** The lesson in hand: rise, move, attack, pickup (the weapon on the floor) or equip (its guide), null outside the opening. */
export function lesson(runtime) {
    if (!active(runtime)) return null;
    if (!seen(runtime, runtime.state.KEY.rise)) return 'rise';
    if (!seen(runtime, runtime.state.KEY.move)) return 'move';
    if (!seen(runtime, runtime.state.KEY.attack)) return 'attack';
    return weaponOnFloor(runtime, actRun(runtime)) ? 'pickup' : 'equip';
}

/** The hero lies in act 1's entry room (or is getting up): the game waits, the story lines wait (js/canvas-act-title-card.js). */
export function lying(runtime) {
    const run = actRun(runtime);
    return lesson(runtime) === 'rise' && !!run && inEntry(runtime, run);
}

export function holds(runtime) { return !!runtime.state.intro || lying(runtime); }

/** The entry room's lines wait: also between the class pick and the intro's first tick (the wake line would play under it). */
export function hushes(runtime) { return holds(runtime) || fresh(runtime); }

/** Pressing the lying hero (or Space, Enter or a walking key) plays the rise; other presses on the battlefield do nothing meanwhile. */
export function onBattlefieldPress(runtime, event) {
    if (!lying(runtime)) return;
    event.stopImmediatePropagation();
    event.preventDefault();
    if (event.type !== 'click' || runtime.state.rising) return;
    const point = battlefieldClientPoint(event.currentTarget, event.clientX, event.clientY), hero = runtime.deps.battleVisualState.playerPos;
    if (hero && Math.abs(point.x - hero.x) < 90 && point.y > hero.y - 90 && point.y < hero.y + 30) startRise(runtime);
}

/** 쓰러진 주인공을 깨우는 키: Space, Enter, 방향키, 걷기 키(기본 W, A, S, D, 바꾼 배정 그대로, 2026-11-07 사용자). */
export function wakesHero(runtime, code) {
    if (['Space', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) return true;
    return runtime.deps.hotkeyBindings.actionForCode(runtime.deps.game.settings.hotkeyOverrides, code)?.kind === 'move';
}

export function startRise(runtime) {
    runtime.state.rising = { start: runtime.deps.battleVisualState.visualNow };
    runtime.deps.stageActors.setRise({ start: runtime.state.rising.start });
}

/** The rise has played: the hero stands where it lay; the move lesson counts from there. */
export function riseEnded(runtime) {
    return !!runtime.state.rising && runtime.deps.battleVisualState.visualNow - runtime.state.rising.start >= runtime.deps.STAGE_HERO_RISE.ms.reduce((sum, ms) => sum + ms, 0);
}

export function trackRise(runtime) {
    // The top-down field: no lessons (see REPLACED).
    // The hero is not in act 1's entry room (a save from elsewhere): there is no one lying to wake.
    if (!lying(runtime)) { mark(runtime, runtime.state.KEY.rise); runtime.deps.stageActors.setRise(null); return; }
    if (!runtime.state.rising) runtime.deps.stageActors.setRise({ start: null });
    else if (riseEnded(runtime)) { mark(runtime, runtime.state.KEY.rise); runtime.state.rising = null; runtime.deps.stageActors.setRise(null); }
}

/** A move counts once the hero leaves the cell it got up on, or a destination is set (a click on the floor). */
export function trackMove(runtime, run) {
    const hero = runtime.deps.game.gridPlayer;
    if (!runtime.state.movedFrom) runtime.state.movedFrom = { gx: hero.gx, gy: hero.gy };
    if ((run && run.destination) || hero.gx !== runtime.state.movedFrom.gx || hero.gy !== runtime.state.movedFrom.gy) mark(runtime, runtime.state.KEY.move);
}

/** Reading in the archive has no equip side effect. The lesson needs a worn weapon; the new opening advances as soon as it is worn,
 * the old one also waits for the weapon guide to close. */
export function weaponLearnt(runtime) {
    const guide = runtime.deps.basicSkills.weaponGuide;
    if ((0, runtime.deps.getEquippedWeaponStance)() === 'unarmed') return false;
    return runtime.deps.contentProgression.opening.applies(runtime.deps.game) || (seen(runtime, guide) && !guideWaits(runtime, guide) && !tutorialOpen(runtime) && !runtime.deps.tutorialActionUi.active);
}

export function trackLesson(runtime, run) {
    const step = lesson(runtime);
    if (runtime.state.intro) return;
    if (step === 'rise') trackRise(runtime);
    else if (step === 'move') trackMove(runtime, run);
    else if (step === 'attack' && rescueStruck(runtime, run)) mark(runtime, runtime.state.KEY.attack);
    else if (step === 'equip' && weaponLearnt(runtime)) finish(runtime, run);
}

/** The opening ends: the auto hunt opens, its guide card comes, and the auto button glows until it is switched on. The battle comes
 * back to the front first: the window the equip guide opened covered the glowing button and half of the line naming it (2026-10-21). */
export function finish(runtime, run) {
    mark(runtime, runtime.state.KEY.done);
    runtime.state.autoHint = run && runtime.deps.game.gridPlayer ? { owner: runtime.deps.game, run, gx: runtime.deps.game.gridPlayer.gx, gy: runtime.deps.game.gridPlayer.gy } : null;
    (0, runtime.deps.switchTab)('tab-battle');
    const key = coarse(runtime) ? '' : runtime.deps.hotkeyBindings.label(runtime.deps.hotkeyBindings.codeFor(runtime.deps.game.settings.hotkeyOverrides, 'combat:autoMove'));
    (0, runtime.deps.queueTutorialNotice)('opening_auto', (0, runtime.deps._t)('자동 사냥'), `이제 자동 사냥을 쓸 수 있습니다.\n오른쪽 위 자동 단추${key ? (0, runtime.deps._t)('나 {key} 키', { key }) : ''}로 켜면 캐릭터가 알아서 걷고 싸웁니다.\n지금 할 일은 ‘목표’에 나옵니다.`);
    if (runtime.deps.contentProgression.opening.applies(runtime.deps.game)) {
        runtime.deps.window.GameModules.state.tutorials.archivePending(runtime.deps.game, 'opening_auto');
        (0, runtime.deps.updateStaticUI)();
        (0, runtime.deps.queueImportantSave)(0);
    }
    runtime.deps.actExplorationUi.render();
}

/** While the opening runs on the stage the auto hunt stays off. */
export function holdManual(runtime, run) {
    if (runtime.deps.game.settings.autoMove !== false) runtime.deps.game.settings.autoMove = false;
    if (run && run.mode !== 'manual') { run.mode = 'manual'; runtime.deps.actExplorationUi.render(); }
}

export function seen(runtime, key) { return Array.isArray(runtime.deps.game.seenTutorials) && runtime.deps.game.seenTutorials.includes(key); }

export function actRun(runtime) { const run = runtime.deps.actExplorationState.current(runtime.deps.game); return run && run.zoneId === 0 && run.status === 'active' ? run : null; }

export function inEntry(runtime, run) { const room = run && runtime.deps.actExplorationDoors.room(run); return !!room && room.role === 'entry'; }

export function coarse(runtime) { return typeof runtime.deps.window.matchMedia === 'function' && runtime.deps.window.matchMedia('(pointer: coarse)').matches; }

export function tutorialOpen(runtime) { return !!runtime.deps.document.querySelector('#tutorial-overlay.active'); }

export function guideWaits(runtime, key) { return (!!runtime.deps.activeTutorial && runtime.deps.activeTutorial.key === key) || runtime.deps.tutorialQueue.some(row => row.key === key); }

export function newGame(runtime) { return (runtime.deps.game.season || 1) === 1 && (runtime.deps.game.level || 1) === 1 && !(Number(runtime.deps.game.exp) > 0) && !(Number(runtime.deps.game.maxZoneId) > 0)
        && runtime.deps.game.currentZoneId === 0; }

export function started(runtime) { return !!runtime.deps.game.heroSelectionInitialized && !(0, runtime.deps.isLoopHeroSelectOpen)() && !(0, runtime.deps.isStartupOverlayOpen)() && !(0, runtime.deps.isLoadingOverlayOpen)(); }

export function active(runtime) { return (runtime.deps.game.season || 1) === 1 && (!!runtime.state.intro || seen(runtime, runtime.state.KEY.intro)) && !seen(runtime, runtime.state.KEY.done); }

export function weaponOnFloor(runtime, run) { return !!run && runtime.deps.game.starterWeaponTutorialPending != null
        && (run.groundLoot || []).some(row => row.item && row.item.id === runtime.deps.game.starterWeaponTutorialPending); }
