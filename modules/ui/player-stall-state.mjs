export function initializeStallViewState(runtime) {
    runtime.state.STALL_RECORDS_DIALOG = 'stall-records-dialog';
    runtime.state.STALL_RECORD_TITLES = Object.freeze({ sales: '판매 기록', visits: '최근 방문', terms: '판매 규칙' });
    runtime.state.view_selectedId = null;
    runtime.state.view_selectedListingId = null;
    runtime.state.view_pendingSlot = null;
    runtime.state.view_message = '';
    runtime.state.view_draftAsk = '';
    runtime.state.view_draftCurrency = '';
    runtime.state.view_draftNegotiate = true;
    runtime.state.view_visitorCursor = 0;
    runtime.state.view_visitors = [];
    runtime.state.view_visitorsVisible = false;
    runtime.state.view_visitorTickAt = 0;
    runtime.state.view_ledgerPage = 0;
    runtime.state.view_recordsKind = undefined;
}

/** A loaded save starts a fresh selection/draft and visitor display, never a transaction. */
export function syncStallOwner(runtime) {
    const owner = runtime.deps.game;
    if (runtime.owner === owner) return false;
    const changed = runtime.owner !== undefined;
    if (changed) {
        if (runtime.recordsPanel?.isConnected) runtime.deps.selectionDialog.close(runtime.state.STALL_RECORDS_DIALOG);
        runtime.recordsPanel = null;
        initializeStallViewState(runtime);
    }
    runtime.owner = owner;
    return changed;
}
