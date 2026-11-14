export function refuse(runtime, reason) {
    (0, runtime.deps.showGameToast)(reason, { tone: 'warning' });
    return false;
}

/** @returns {?object} the new talisman item. */
export function unseal(runtime, source) {
    const result = runtime.deps.talismans.unseal(source);
    if (!result.ok) return refuse(runtime, result.reason) || null;
    const item = result.item, text = item.lines.map(runtime.deps.talismans.describeLine).join(', ') || item.uniqueEffect || '';
    (0, runtime.deps.addLog)((0, runtime.deps._t)('🧿 부적 풀기: [{name}] {text}', { name: (0, runtime.deps._t)(item.name), text }), item.rarity === 'unique' ? 'loot-unique' : 'loot-rare');
    return item;
}

export function exchange(runtime, index) {
    const result = runtime.deps.talismans.exchange(index);
    return result.ok || refuse(runtime, result.reason);
}

export function wax(runtime, id) {
    const result = runtime.deps.talismans.wax(id);
    if (!result.ok) return refuse(runtime, result.reason);
    (0, runtime.deps.addLog)((0, runtime.deps._t)('🐝 부적 밀랍: {describeLine}', { describeLine: runtime.deps.talismans.describeLine(result.line) }), 'loot-rare');
    return true;
}

export function turn(runtime, id) {
    return runtime.deps.talismans.turn(id) || refuse(runtime, '지금은 표식을 돌릴 수 없습니다.');
}

export async function discard(runtime, id) {
    const owner = runtime.deps.game;
    const item = runtime.deps.stumpBox.itemById(runtime.deps.game, id);
    if (!item || item.family !== 'talisman') return false;
    const message = `[${item.name}]${(0, runtime.deps.pickParticle)(item.name, '을', '를')} 버립니다. 되돌릴 수 없습니다.`;
    const options = { title: (0, runtime.deps._t)('부적 버리기'), tone: 'danger', confirmLabel: (0, runtime.deps._t)('버리기'), cancelLabel: (0, runtime.deps._t)('취소') };
    if (item.rarity === 'unique' && !await (0, runtime.deps.requestGameConfirmation)(message, options)) return false;
    if (!runtime.active || owner !== runtime.deps.game || runtime.deps.stumpBox.itemById(owner, id) !== item) return false;
    return runtime.deps.stumpBox.discard(owner, id);
}
