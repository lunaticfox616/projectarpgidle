/** Transient result history; snapshot is the item rule service, never a copied game or save. */
export function createCraftResultLedger(snapshotCraftResultItem) {
    let latest = null, sequence = 0;

    function begin(item, meta) {
        if (!item) return null;
        return { itemRef: item, before: snapshotCraftResultItem(item), meta: { ...(meta || {}) }, seq: ++sequence };
    }

    /** A craft wrapped in another (the crafting workspace around useCurrency) keeps the inner one's outcome line. */
    function commit(token, item) {
        if (!token || !item || token.itemRef !== item) return null;
        let after = snapshotCraftResultItem(item);
        const inner = latest && latest.itemRef === item && latest.seq > token.seq ? latest.meta.outcome : undefined;
        const meta = inner && !token.meta.outcome ? { ...token.meta, outcome: inner } : token.meta;
        latest = { itemRef: item, before: token.before, after, meta, seq: token.seq, afterKey: JSON.stringify(after) };
        return latest;
    }

    function getForItem(item) {
        if (!latest || latest.itemRef !== item) return null;
        return JSON.stringify(snapshotCraftResultItem(item)) === latest.afterKey ? latest : null;
    }

    /** The latest result's item changed again within the same craft (성화의 뿌리 pick): its after becomes the item now. */
    function amend(item) {
        if (!latest || latest.itemRef !== item) return null;
        const after = snapshotCraftResultItem(item);
        latest = { ...latest, after, afterKey: JSON.stringify(after) };
        return latest;
    }

    function clear() { latest = null; }

    return { begin, commit, amend, getForItem, clear };
}
