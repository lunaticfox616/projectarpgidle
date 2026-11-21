// 경매장 서버 시세(db/auction-hybrid-20261121.sql get_auction_snapshot, 읽기만 하는 RPC 하나). 서버는 최근 하루 사이 저장한 계정들의
// 거래 흐름(game.auction.trend, 클라우드 저장에 실려 간다)을 열쇠마다 오름과 내림으로 세어 시세 보정(±voteSwing)과 운영 모드를 돌려준다.
// 경매장 칸이 그릴 때마다 sync()를 부르지만 요청은 클라우드 계정으로 로그인했고(장비 전당과 같은 확인) 경매장이 열렸을 때, 10분에 한 번,
// 한 번에 하나, 이번 시세 구간의 값을 아직 받지 못했을 때만 나간다. 타이머는 없고 무엇도 응답을 기다리지 않는다: 서버가 없거나 느리거나
// 틀려도 경매장은 보정 없이 그대로다. 서버에 RPC가 없으면(SQL을 돌리기 전) 이번 실행 동안 조용히 묻지 않는다.
const GAP_MS = 600000;
const RPC_PATH = '/rest/v1/rpc/get_auction_snapshot';

/** Whether a request failed because the server has no such RPC yet (PostgREST PGRST202 is a 404). */
function missingRpc(error) {
    const text = String((error && error.message) || error || '');
    return Number(error && error.status) === 404 || /PGRST202|does not exist|could not find the function/i.test(text);
}

/**
 * deps: auctionHouse (isUnlocked, bucketOf, setMode, mode, setPulseDelta), game (the current save), isServerReady() (the hall's cloud
 * readiness), cloudState (user.id), cloudJsonRequest, rerender() (asks the open auction section to draw once), console, now() (UTC ms).
 */
export class AuctionPulseService {
    constructor(deps) {
        this.deps = deps;
        this.state = { lastAt: -Infinity, inFlight: false, disabled: false, warnedClock: false, gotBucket: -1, applied: '' };
        /** Bumped whenever a reply changed the mode or the correction: the screen's redraw print includes it. */
        this.version = 0;
    }

    /** The client's bucket: the game's auction clock (UTC ms, never behind its watermark). */
    clientBucket(now) {
        const { auctionHouse, game } = this.deps;
        return auctionHouse.bucketOf(Math.max(now, Number(game.auction.lastAt) || 0));
    }

    /** Whether a request may go out now (no writes). */
    canAsk(now) {
        const { state, deps } = this;
        if (state.disabled || state.inFlight || now - state.lastAt < GAP_MS) return false;
        if (!deps.game || !deps.isServerReady() || !deps.auctionHouse.isUnlocked(deps.game)) return false;
        return state.gotBucket !== this.clientBucket(now);
    }

    /** Asks the server once when allowed. Returns the request's promise (never rejects) or null when nothing was sent; nobody needs to wait. */
    sync() {
        const now = this.deps.now();
        if (!this.canAsk(now)) return null;
        const state = this.state, userId = this.deps.cloudState.user.id;
        Object.assign(state, { lastAt: now, inFlight: true });
        return Promise.resolve()
            .then(() => this.deps.cloudJsonRequest(RPC_PATH, { method: 'POST', expectedUserId: userId, body: {} }))
            .then(data => this.apply(data), error => this.fail(error))
            .catch(error => this.deps.console.warn('auction pulse: reply not applied:', error))
            .finally(() => { state.inFlight = false; });
    }

    fail(error) {
        if (missingRpc(error)) { this.state.disabled = true; return; }
        this.deps.console.warn('auction pulse: request failed, next try after 10 minutes:', error);
    }

    /** Applies a reply { serverNow, bucket, mode, voters, deltas }: the mode always (known values only), the correction only for the
     * client's own bucket, nothing at all when the server clock is more than one bucket off the device clock. */
    apply(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('auction pulse: reply is not an object');
        const { auctionHouse } = this.deps, now = this.deps.now();
        if (Math.abs(auctionHouse.bucketOf(Number(data.serverNow)) - auctionHouse.bucketOf(now)) > 1 || !Number.isFinite(Number(data.serverNow))) {
            if (!this.state.warnedClock) this.deps.console.warn('auction pulse: server and device clocks disagree; nothing applied', data.serverNow, now);
            this.state.warnedClock = true;
            return;
        }
        const modeBefore = auctionHouse.mode;
        auctionHouse.setMode(data.mode);
        const changed = this.applyDelta(data, now) || auctionHouse.mode !== modeBefore;
        if (!changed) return;
        this.version += 1;
        this.deps.rerender();
    }

    /** Stores the correction when the reply is for the client's bucket; returns whether it differs from the last one stored. */
    applyDelta(data, now) {
        const bucket = data.bucket, deltas = data.deltas && typeof data.deltas === 'object' ? data.deltas : null;
        if (!deltas || bucket !== this.clientBucket(now) || !this.deps.auctionHouse.setPulseDelta(bucket, deltas)) return false;
        this.state.gotBucket = bucket;
        const print = `${bucket}:${JSON.stringify(deltas)}`, changed = print !== this.state.applied;
        this.state.applied = print;
        return changed;
    }
}
