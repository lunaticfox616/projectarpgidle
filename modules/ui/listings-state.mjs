/** The 출품 screen's transient state (never saved). pick: the chosen thing, 'bag:ID' (a bag item for a new listing), 'listing:ID' (a saved
 * listing) or 'hall:ID' (a hall show); kind: the chosen way for the new listing ('stall', 'auction', 'hall'); pendingSlot: the shelf place
 * a tap or a drop chose for it. */
export function initializeListingsState(runtime) {
    Object.assign(runtime.state, {
        RECORDS_DIALOG: 'stall-records-dialog',
        RECORD_TITLES: Object.freeze({ sales: '판매 기록', visits: '최근 방문', terms: '판매 규칙' }),
        pick: null, kind: '', pendingSlot: null, message: '',
        draftAsk: '', draftCurrency: '', draftNegotiate: true,
        visitorCursor: 0, visitors: [], visitorsVisible: false, visitorTickAt: 0, ledgerPage: 0, recordsKind: undefined
    });
}

/** A loaded save starts a fresh selection/draft and visitor display, never a transaction. Returns whether the game changed. */
export function syncListingsOwner(runtime) {
    const owner = runtime.deps.game;
    if (runtime.owner === owner) return false;
    const changed = runtime.owner !== undefined;
    if (changed) {
        if (runtime.recordsPanel?.isConnected) runtime.deps.selectionDialog.close(runtime.state.RECORDS_DIALOG);
        runtime.recordsPanel = null;
        initializeListingsState(runtime);
    }
    runtime.owner = owner;
    return changed;
}

/** The pick's kind and number: ['bag' | 'listing' | 'hall', id] or ['', NaN].
 * @param {string | null} pick
 * @returns {[string, number]} */
export function pickParts(pick) {
    const [kind, id] = String(pick || '').split(':');
    return [kind || '', Number(id)];
}

export function resetDraft(runtime) {
    Object.assign(runtime.state, { draftAsk: '', draftCurrency: '', pendingSlot: null });
}
