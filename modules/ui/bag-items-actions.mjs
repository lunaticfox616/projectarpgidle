export function coreHtml(runtime, core, bagHints) {
    const lines = (core.lines || []).map(line => `<div class="tooltip-line">${(0, runtime.deps.escapeHTML)(runtime.deps.coreItems.describe(line))}</div>`).join('')
        + (core.perfect ? hint(runtime, '한 계열의 네 줄이 모두 최대치입니다') : '');
    const worn = (runtime.deps.game.equipment || {})[runtime.deps.bagItems.CORE] === core;
    return `<div class="tooltip-title" style="color:${(0, runtime.deps.getRarityColor)(core.rarity || 'rare')}">${(0, runtime.deps._t)('[코어] {name}', { name: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(core.name)) })}</div>${lines}${worn || !bagHints ? '' : hint(runtime, '장비창의 코어 칸에 끼웁니다(두 번 누르거나 코어 칸에 끌어 놓기).')}`;
}

/** js/ui.js prepareItemTooltip: a jewel or a core draws its own card and the equipment tooltip stops. true when drawn. */
export function presentTooltip(runtime, context, event, item) {
    if (!runtime.deps.bagItems.ownShape(item)) return false;
    const bagHints = !context.inline;
    (0, runtime.deps.presentItemTooltip)(context, event, item, runtime.deps.bagItems.isJewel(item) ? jewelHtml(runtime, item, bagHints) : coreHtml(runtime, item, bagHints), true);
    return true;
}

/** js/items.js equipItem for a bag jewel: into the empty socket of the worn item in `slot` (or the first one). */
export function socket(runtime, item, slot) {
    const reason = runtime.deps.bagItems.socketFromBag(item, slot);
    if (reason) return (0, runtime.deps.addLog)(reason, 'attack-monster', { toast: true });
    (0, runtime.deps.playUiFeedbackSound)('gemSocket');
    (0, runtime.deps.addLog)((0, runtime.deps._t)('💠 [{name}]{particle} 소켓에 끼웠습니다.', { name: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(item.name || '주얼')), particle: (0, runtime.deps.pickParticle)(item.name || '주얼', '을', '를') }), 'loot-magic');
    (0, runtime.deps.hideItemTooltip)();
    (0, runtime.deps.updateStaticUI)();
}

/** js/items.js equipItem for the kinds that do not simply go into a slot: a jewel goes into a socket, a ward with no open ward
* slot is told why. true when handled here. */
export function equipSpecial(runtime, item, slot) {
    if (!runtime.deps.bagItems.isJewel(item)) return runtime.deps.colonyWardsUi.refuseWithoutSlot(item);
    socket(runtime, item, slot);
    return true;
}

export function hint(runtime, text) { return `<div class="tooltip-line" style="margin-top:6px; color:var(--copy-muted);">${text}</div>`; }

export function jewelHtml(runtime, jewel, bagHints) { return runtime.deps.window.createJewelRangeTooltipHtml(jewel)
        + (bagHints ? hint(runtime, '장비의 빈 소켓에 끼웁니다(두 번 누르거나 장비의 소켓에 끌어 놓기).') : ''); }
