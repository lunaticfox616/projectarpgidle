/** Session-only hall rows and UI selection. Nothing in this object is serialized into game saves. */
export const HALL_LIST_LIMIT = 80;
export const HALL_SORTS = Object.freeze({ score: '감정 높은 순', priceAsc: '가격 낮은 순', priceDesc: '가격 높은 순' });
export const HALL_BROWSE_DEFAULT = Object.freeze({ slot: 'all', sort: 'score', query: '' });

export function createEquipmentHallState() {
    return {
        data: null, dataUserId: null, loading: false, message: '', selectedItemId: null,
        itemTips: new Map(), tipCards: new Map(), selectedListingId: null, asking: false,
        browse: { ...HALL_BROWSE_DEFAULT }, compare: null,
        // { userId, revision, at } holds further trades until a server revision resolves an uncertain result.
        uncertain: null
    };
}
