import { listenView, releaseViewTarget } from './view-events.mjs';

/** 이전 줄을 읽는 동안의 자리: 창 맨 위에 걸친 줄과 창 윗변에서의 거리(화면 px, 위로 넘어가면 음수).
 * 숨지 않았고 최신 줄을 따라가지 않을 때만 잰다. 줄이 없으면 null. */
export function captureCombatLogScroll(log) {
    const top = log.getBoundingClientRect().top;
    for (const row of log.children) {
        const box = row.getBoundingClientRect();
        if (box.bottom > top) return { row, offset: box.top - top };
    }
    return null;
}

/** 코드가 옮긴 자리의 scroll 사건만 건너뛴다. 80ms 시간창은 그 사이의 실제 입력도 놓쳤다.
 * 기대 자리는 다음 사건 하나에만 쓰고 지운다. 옮겨도 자리가 같아 사건이 없으면 첫 사용자 이동에서 지워진다. */
export function watchCombatLogScroll(runtime, log) {
    if (runtime.log === log) return;
    if (runtime.log) {
        releaseViewTarget(runtime, runtime.log);
        delete runtime.log.combatLogScrollWatched;
    }
    runtime.log = log;
    log.combatLogScrollWatched = true;
    listenView(runtime, log, 'scroll', () => {
        const top = log.scrollTop, own = top === log.combatLogSetTop;
        log.combatLogSetTop = NaN;
        if (own) return;
        log.combatLogAtBottom = log.scrollHeight - top - log.clientHeight <= 24;
    }, { passive: true });
}

export function scrollCombatLogToLatest(log) {
    log.scrollTop = log.scrollHeight;
    log.combatLogSetTop = log.scrollTop;
    log.combatLogAtBottom = true;
}

/** Hidden tab (phone, another menu open), a folded combat feed, or the PC message frames' stash (the other tab is showing, or the
 * frame is folded; js/message-frames-ui.js): #log is display:none there and measuring forces a style recalculation. */
export function isCombatLogHidden(log) {
    if (typeof log.closest !== 'function') return false;
    const pane = log.closest('.tab-content');
    // 접힌 판은 PC와 예전 휴대폰 배치에서 #log를 숨기지만, 좁은 전투 화면(css/themes/rift-stage.css 세로 배치)은 접힘 표시가 남아도 판을 보인다:
    // 접힘만 보고 숨겼다고 여겨 맨 아래로 내리지 않았다(2026-11-09 사용자: 전투로그가 자동으로 맨 밑으로 안 가).
    return (!!pane && !pane.classList.contains('active')) || !!log.closest('.message-frame-stash')
        || (!!log.closest('.combat-feed.collapsed') && log.offsetHeight === 0);
}

/** 읽던 줄을 같은 화면 위치에 둔다. 앞에서 지워져 사라졌으면 가장 가까운 남은 줄(첫 줄)을 쓴다.
 * 현재 위치에서 차이만 보정하므로 브라우저의 스크롤 고정이 먼저 움직였어도 중복 보정하지 않는다. */
export function restoreCombatLogScroll(runtime, log, scrollState) {
    const row = scrollState.row.parentNode === log ? scrollState.row : log.firstElementChild;
    if (!row) return;
    // 화면 px 차이를 scrollTop의 CSS px로 바꾼다(루트 zoom, js/ui-display.js).
    log.scrollTop += (row.getBoundingClientRect().top - log.getBoundingClientRect().top - scrollState.offset) / runtime.deps.uiDisplay.factor;
    log.combatLogSetTop = log.scrollTop;
}

/** 붙인 뒤의 스크롤: 숨은 로그는 다시 보일 때 최신 줄을 따라가게 적어 두고, 이전 줄을 읽는 중이면 그 줄로 되돌리고, 아니면 맨 아래로. */
export function settleCombatLogScroll(runtime, log, view) {
    if (view.hidden) log.combatLogAtBottom = true;
    else if (view.scrollState) restoreCombatLogScroll(runtime, log, view.scrollState);
    else scrollCombatLogToLatest(log);
}
