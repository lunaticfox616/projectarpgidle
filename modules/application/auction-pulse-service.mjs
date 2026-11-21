// 경매장 서버 시세(db/auction-hybrid-20261121.sql get_auction_snapshot). 서버는 최근에 저장한 계정들의 거래 흐름(game.auction.trend, 클라우드
// 저장에 실려 간다)을 열쇠마다 오름과 내림으로 세어 시세 보정(±voteSwing)과 운영 모드를 돌려준다. 보정은 받은 구간의 다음 구간 것으로 저장에
// 남는다(auctionHouse.setPulseDelta): 구간 도중에는 값이 바뀌지 않고, 다음 구간이 열릴 때 바뀐다.
// 경매장 칸이 그릴 때마다 sync()를 부르지만 요청은 클라우드 계정으로 로그인했고(장비 전당과 같은 확인) 경매장이 열렸을 때, 10분에 한 번,
// 한 번에 하나, 이번 시세 구간의 값을 아직 받지 못했을 때만 나간다. 타이머는 없고 무엇도 응답을 기다리지 않는다: 서버가 없거나 느리거나
// 틀려도 경매장은 보정 없이 그대로다. 서버에 RPC가 없으면(SQL을 돌리기 전) 이번 실행 동안 조용히 묻지 않는다. dispose() 뒤에는 묻지도 적용하지도 않는다.
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
        this.state = { lastAt: -Infinity, inFlight: false, disabled: false, disposed: false, warnedClock: false, gotBucket: -1 };
        /** Bumped whenever a reply changed the mode: the screen's redraw print includes it. */
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
        if (state.disposed || state.disabled || state.inFlight || now - state.lastAt < GAP_MS) return false;
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

    /** Stops asking and drops replies still on their way (the screen is gone). */
    dispose() { this.state.disposed = true; }

    fail(error) {
        if (missingRpc(error)) { this.state.disabled = true; return; }
        if (!this.state.disposed) this.deps.console.warn('auction pulse: request failed, next try after 10 minutes:', error);
    }

    /** Applies a reply { serverNow, bucket, mode, voters, deltas }: the mode always (known values only, one redraw when it changed), the
     * correction only when the reply is for the client's own bucket (saved for the next bucket: no redraw, today's prices stay), nothing at
     * all when the server clock is more than one bucket off the device clock. */
    apply(data) {
        if (this.state.disposed) return;
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('auction pulse: reply is not an object');
        const { auctionHouse } = this.deps, now = this.deps.now();
        if (Math.abs(auctionHouse.bucketOf(Number(data.serverNow)) - auctionHouse.bucketOf(now)) > 1 || !Number.isFinite(Number(data.serverNow))) {
            if (!this.state.warnedClock) this.deps.console.warn('auction pulse: server and device clocks disagree; nothing applied', data.serverNow, now);
            this.state.warnedClock = true;
            return;
        }
        this.applyDelta(data, now);
        const modeBefore = auctionHouse.mode;
        auctionHouse.setMode(data.mode);
        if (auctionHouse.mode === modeBefore) return;
        this.version += 1;
        this.deps.rerender();
    }

    /** Saves the correction for the next bucket when the reply is for the client's bucket. */
    applyDelta(data, now) {
        const bucket = data.bucket, deltas = data.deltas && typeof data.deltas === 'object' ? data.deltas : null;
        if (!deltas || bucket !== this.clientBucket(now)) return;
        if (this.deps.auctionHouse.setPulseDelta(this.deps.game, bucket, deltas)) this.state.gotBucket = bucket;
    }
}
