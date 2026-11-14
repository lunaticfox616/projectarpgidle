import { isGolden, bulkConfirmation, compostOutcome, discardKeptLine, bulkLines, bulkDiscardLines, autoMergeConfirmation, mergeLines } from './stump-ripening-markup.mjs';

/** Throws a stored scar away after a confirmation (what it absorbed goes with it). */
export async function discardScar(runtime, id) {
    const owner = runtime.deps.game;
    const item = runtime.deps.stumpBox.itemById(runtime.deps.game, id);
    if (!item || item.family !== 'scar') return false;
    const options = { title: (0, runtime.deps._t)('{name} 버리기', { name: runtime.deps.STUMP_BOX_SCAR.name }), tone: 'danger', confirmLabel: (0, runtime.deps._t)('버리기'), cancelLabel: (0, runtime.deps._t)('취소') };
    const message = (0, runtime.deps._t)('{name} 버립니다. 흡수한 능력치도 사라지고 되돌릴 수 없습니다.', { name: (0, runtime.deps.withObjectParticle)(runtime.deps.STUMP_BOX_SCAR.name) });
    const approved = await (0, runtime.deps.requestGameConfirmation)(message, options);
    if (!approved || !runtime.active || owner !== runtime.deps.game || runtime.deps.stumpBox.itemById(owner, id) !== item) return false;
    return runtime.deps.stumpBox.discard(owner, id);
}

/** A stored seed thrown away: golden and ancient ones ask first, the rest go at once. */
export async function confirmDiscard(runtime, item) {
    if (!isGolden(runtime, item) && !item.ancient && !item.albino) return true;
    const options = { title: (0, runtime.deps._t)('버리기'), tone: 'danger', confirmLabel: (0, runtime.deps._t)('버리기'), cancelLabel: (0, runtime.deps._t)('취소') };
    return (0, runtime.deps.requestGameConfirmation)((0, runtime.deps._t)('{shortName} 버립니다. 되돌릴 수 없습니다.', { shortName: (0, runtime.deps.withObjectParticle)(runtime.deps.stumpBox.shortName(item)) }), options);
}

/** A stored grown item into currency: golden, ancient and albino ones ask first, the rest go at once. */
export async function confirmMonetize(runtime, item) {
    if (!isGolden(runtime, item) && !item.ancient && !item.albino) return true;
    const options = { title: (0, runtime.deps._t)('화폐화'), tone: 'danger', confirmLabel: (0, runtime.deps._t)('화폐화'), cancelLabel: (0, runtime.deps._t)('취소') };
    return (0, runtime.deps.requestGameConfirmation)((0, runtime.deps._t)('{shortName} 화폐화합니다. 실물로 되돌릴 수 없습니다.', { shortName: (0, runtime.deps.withObjectParticle)(runtime.deps.stumpBox.shortName(item)) }), options);
}

/** Asks before a bulk action. The caller must recheck the returned snapshot immediately before execution.
* @returns {Promise<string|null>} Approved snapshot key, or null for cancellation/refusal. */
export async function confirmBulk(runtime, kind, filter) {
    const compost = kind === 'compost', confirmation = bulkConfirmation(runtime, kind, filter), { reason, items } = confirmation;
    if (reason) {
        (0, runtime.deps.showGameToast)(reason, { tone: 'warning' });
        return null;
    }
    const tail = compost ? compostOutcome(runtime, items) : [discardKeptLine(runtime, filter, items), '되돌릴 수 없습니다.'].filter(Boolean).join('\n');
    const options = { title: compost ? '일괄 거름 사용' : '일괄 버리기', tone: compost ? 'info' : 'danger',
        confirmLabel: (0, runtime.deps._t)('{length}개 {value}', { length: items.length, value: compost ? (0, runtime.deps._t)('사용') : (0, runtime.deps._t)('버리기') }), cancelLabel: (0, runtime.deps._t)('취소') };
    return await (0, runtime.deps.requestGameConfirmation)(`${(compost ? bulkLines(runtime, items) : bulkDiscardLines(runtime, items)).join('\n')}\n\n${tail}`, options) ? confirmation.key : null;
}

/** Asks before 자동합성. @returns {Promise<string|null>} the approved key (autoMergeCurrent checks it right before the merge), or null. */
export async function confirmAutoMerge(runtime, filter) {
    const { sets, key } = autoMergeConfirmation(runtime, filter);
    if (!sets.length) {
        (0, runtime.deps.showGameToast)(runtime.state.NO_MERGE, { tone: 'warning' });
        return null;
    }
    const [low, high] = runtime.deps.STUMP_CUBE_MERGE.step;
    const options = { title: (0, runtime.deps._t)('자동합성'), tone: 'info', confirmLabel: (0, runtime.deps._t)('{length}번 합성', { length: sets.length }), cancelLabel: (0, runtime.deps._t)('취소') };
    return await (0, runtime.deps.requestGameConfirmation)(`${mergeLines(runtime, sets).join('\n')}\n\n씨앗 3개를 1개로 합치고 품질은 평균 +${low}~${high}%입니다.`, options) ? key : null;
}
