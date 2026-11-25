/**
 * 장비 전당 출품: 원본은 서버가 들고 있어(저장에 없다) 이 화면은 전당 다리(window.GameModules.equipmentHall, js/player-exchange.js)의 내 전시를
 * 출품 목록에 섞고, 전시와 회수는 전당의 흐름(감정, 확인 창, 서버 RPC)을 그대로 부른다. 서버 SQL은 바꾸지 않았다.
 */

/** The hall bridge when it exists. */
function bridge(runtime) { return runtime.deps.hall || null; }

/** Why no hall listing can start now, or '': the unlock, the login and the server, the rows not read yet, a trade under way, three shows up. */
export function hallBlock(runtime) {
    const hall = bridge(runtime), { _t } = runtime.deps;
    if (!runtime.deps.contentProgression.isUnlocked('hall', runtime.deps.game)) return _t('장비 전당이 아직 열리지 않았습니다.');
    if (!hall || !hall.isServerReady()) return runtime.deps.cloudState && runtime.deps.cloudState.user ? _t('장비 전당 서버를 준비 중입니다.') : _t('클라우드 로그인 후 전시할 수 있습니다.');
    if (!hall.loaded()) return _t('전당 목록을 불러오는 중입니다.');
    if (hall.busy()) return _t('앞선 전당 작업을 마무리하는 중입니다.');
    return hall.mine().length >= 3 ? _t('전시 3칸이 모두 찼습니다.') : '';
}

/** Why item cannot go to the hall now, or ''. */
export function hallIssue(runtime, item) {
    return hallBlock(runtime) || bridge(runtime).itemIssue(item);
}

/** Whether a login would open the hall (the hall is unlocked and nobody is signed in). */
export function hallNeedsLogin(runtime) {
    return runtime.deps.contentProgression.isUnlocked('hall', runtime.deps.game) && !(runtime.deps.cloudState && runtime.deps.cloudState.user);
}

/** My shows on the hall's server (open or every copy gone), as the last read rows say; [] without them. */
export function hallShows(runtime) {
    const hall = bridge(runtime);
    return hall && hall.isServerReady() ? hall.mine() : [];
}

/** Whether the hall's count (n/3) can be shown: signed in with rows read. */
export function hallCounted(runtime) {
    const hall = bridge(runtime);
    return !!hall && hall.isServerReady() && hall.loaded();
}

/** Reads the hall rows when signed in and they are missing, at most once in 10 minutes (a failed read is not retried on every draw); the
 * screen draws again when they come. */
export function watchHallRows(runtime) {
    const hall = bridge(runtime), now = runtime.deps.Date.now();
    if (!hall || !hall.isServerReady() || hall.loaded() || runtime.hallLoading || now - runtime.hallTriedAt < 600000) return;
    runtime.hallLoading = true;
    runtime.hallTriedAt = now;
    Promise.resolve(hall.load()).catch(error => runtime.deps.console.warn('listings: hall rows not loaded:', error))
        .finally(() => { runtime.hallLoading = false; runtime.api.render(true); });
}

/** A show's state word and tone: on show, every copy gone, or closed early (an operator's hold). */
export function hallShowStatus(row) {
    if (row.status !== 'sold_out') return ['전시 중', 'is-open'];
    return Number(row.copiesSold || 0) >= Number(row.copyCap || 5) ? ['복제 한도 완료', 'is-done'] : ['전시 닫힘', 'is-closed'];
}

/** Runs a hall trade (list or withdraw through the bridge), then after() (the pick it leaves), says the hall's message and draws this screen again. */
export async function runHallTrade(runtime, trade, after) {
    const hall = bridge(runtime);
    if (!hall) return;
    runtime.api.render(true);
    try {
        await trade(hall);
    } catch (error) {
        runtime.deps.console.error('listings: hall trade failed:', error);
    }
    after();
    runtime.state.message = hall.state.message || '';
    runtime.api.render(true);
}
