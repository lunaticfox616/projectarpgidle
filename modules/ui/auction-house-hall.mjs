/**
 * 경매장의 다른 플레이어 장비: 장비 전당의 전시품을 매물로 보인다(새 서버 호출은 없다). 운영 모드가 'hybrid'이고, 전당이 열렸고,
 * 전당 서버를 쓸 수 있을 때만. 이번 시세 구간 번호로 목록을 돌아가며 내 것이 아니고, 아직 소장하지 않았고, 다 팔리지 않은 전시품 5개를 고른다.
 * 전당 목록은 이미 있는 불러오기(loadPlayerExchange)로만 읽고, 없거나 10분이 지났을 때만 부른다. 기다리지 않는다: 화면은 먼저 그려지고
 * 목록이 오면 다시 그린다. 실패하면 상인 매물만 보인다(console.warn). 구매는 전당의 구매(확인 창, 서버)를 그대로 쓴다.
 */

const HALL_FRESH_MS = 600000;
const HALL_PICKS = 5;

/** The hall bridge (window.GameModules.equipmentHall) when the auction may show hall shows now, else null. */
function openHall(runtime) {
    const { auctionHouse, contentProgression, game } = runtime.deps, hall = runtime.deps.hall;
    if (auctionHouse.mode !== 'hybrid' || !hall || !contentProgression.isUnlocked('hall', game)) return null;
    return hall.isServerReady() ? hall : null;
}

/** Whether the hall's shows take part in this screen (the source filter offers 다른 플레이어 then). */
export function hallActive(runtime) { return !!openHall(runtime); }

/** Notes when the hall rows object changed (a load, a trade's reload) and asks for rows when they are missing or old. */
export function watchHall(runtime) {
    const hall = openHall(runtime), watch = runtime.state.hall;
    if (!hall) return;
    const data = hall.state.data, now = runtime.deps.now();
    if (data !== watch.seen) Object.assign(watch, { seen: data, seenAt: now, version: watch.version + 1 });
    const fresh = data && now - watch.seenAt < HALL_FRESH_MS;
    if (fresh || watch.loading || now - watch.triedAt < HALL_FRESH_MS) return;
    Object.assign(watch, { loading: true, triedAt: now });
    Promise.resolve(runtime.deps.loadPlayerExchange()).then(() => {
        if (hall.state.message) runtime.deps.console.warn('auction: hall rows not loaded:', hall.state.message);
    }, error => runtime.deps.console.warn('auction: hall rows not loaded:', error)).finally(() => {
        watch.loading = false;
        runtime.api.render();
    });
}

function openShow(row) {
    return row && row.item && !row.isMine && !row.alreadyCollected && Number(row.copiesSold || 0) < Number(row.copyCap || 5);
}

/** Up to HALL_PICKS hall shows as lots (source 'user'), taken in turn from the bucket number. */
export function userLots(runtime) {
    const hall = openHall(runtime);
    if (!hall) return [];
    const shows = hall.listings().filter(openShow), count = shows.length;
    if (!count) return [];
    const start = runtime.deps.game.auction.bucket % count;
    return Array.from({ length: Math.min(HALL_PICKS, count) }, (_, step) => shows[(start + step) % count]).map(row => ({
        id: `user:${row.id}`, hallId: Number(row.id), item: row.item, family: runtime.deps.auctionHouse.itemFamily(row.item), source: 'user',
        merchant: row.curatorName || runtime.deps._t('익명'), currency: 'goldenRule', price: Math.max(0, Math.floor(Number(row.price) || 0)),
        fairPrice: Math.max(0, Math.floor(Number(row.price) || 0)), ratioPct: 100, soldOut: false, boughtByMe: false, row
    }));
}

/** Why a hall show cannot be bought now, or '' (the hall's own check; the server stays the judge). */
export function userLotIssue(runtime, lot) {
    const hall = openHall(runtime);
    return hall ? hall.buyBlockReason(lot.row) : runtime.deps._t('지금은 경매장을 이용할 수 없습니다.');
}

/** Buys a hall show through the hall's purchase (its confirmation, server request and messages). */
export async function buyUserLot(runtime, lot) {
    const hall = openHall(runtime);
    if (!hall) return;
    const before = hall.state.message;
    await hall.buyReplica(lot.hallId);
    if (hall.state.message && hall.state.message !== before) runtime.deps.showGameToast(hall.state.message, { tone: 'info' });
    runtime.api.render(true);
}
