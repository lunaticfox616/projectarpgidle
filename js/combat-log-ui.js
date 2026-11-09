// 전투 기록과 알림: 휴대폰 알림 줄, 기록 꾸미기, 스크롤, 묶어 적기 (2026-11-10에 js/ui.js에서 그대로 옮겼다. js/ui.js 뒤에 읽는다.)
// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).
(() => {
function shouldShowMobileToast(msg, cls, opts = {}) {
    if (opts && opts.noToast) return false;
    let isMobile = (window.matchMedia && uiDisplay.matches('(max-width: 900px)')) || ('ontouchstart' in window);
    let logHidden = game && game.settings && game.settings.showCombatLog === false;
    if (!isMobile && !logHidden) return false;
    let text = stripHtmlMessage(msg);
    let importantFailure = /(부족|실패|불가|필요|없습니다|찾을 수 없습니다|잠겨|환불|반환)/.test(text || '');
    if (importantFailure) return true;
    let level = cls || '';
    if (level === 'attack-monster') {
        return false;
    }
    if (level === 'season-up' || level === 'loot-unique') return true;
    return false;
}

function getMobileToastRoot() {
    let root = document.getElementById('mobile-toast-root');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'mobile-toast-root';
    root.style.position = 'fixed';
    root.style.left = '50%';
    root.style.bottom = 'var(--mobile-toast-bottom, 84px)'; // 전투 화면은 CSS가 HUD 판 위로 올린다(pixel-mobile.css)
    root.style.transform = 'translateX(-50%)';
    root.style.zIndex = '22000';
    root.style.pointerEvents = 'none';
    root.style.display = 'flex';
    root.style.flexDirection = 'column';
    root.style.gap = '8px';
    root.style.width = 'min(calc(92vw / var(--scale-display-factor, 1)), 420px)';
    document.body.appendChild(root);
    return root;
}

function stripHtmlMessage(raw) {
    let div = document.createElement('div');
    div.innerHTML = String(raw || '');
    return (div.textContent || div.innerText || '').trim();
}

function enqueueMobileToast(msg, cls) {
    mobileToastQueue.push({ msg: stripHtmlMessage(msg), cls: cls || '' });
    pumpMobileToastQueue();
}

// 알림이 많이 밀려 있을수록: (1) 동시에 최대 1개까지만 보여 화면을 가리지 않고, (2) 쌓인 개수가 많을수록
// 표시 시간을 점점 줄여 더 빨리 다음 알림이 나오게 한다(밀린 알림이 한 줄씩 느긋하게
// 빠지는 대신, 밀린 만큼 더 빠르게 소화됨).
/** The offline result card covers the phone screen: notices wait and are looked at again shortly after. */
function resumeMobileToastsAfterResult() {
    mobileToastResultHoldTimer = null;
    pumpMobileToastQueue();
}

function pumpMobileToastQueue() {
    // A guide card sits where these notices appear on phones: hold them until it closes (dismissTutorial pumps again).
    if (typeof isTutorialOpen === 'function' && isTutorialOpen()) return;
    if (document.getElementById('background-combat-result-overlay')) {
        mobileToastResultHoldTimer = mobileToastResultHoldTimer || setTimeout(resumeMobileToastsAfterResult, 600);
        return;
    }
    while (mobileToastActiveCount < MOBILE_TOAST_MAX_CONCURRENT && mobileToastQueue.length > 0) {
        showNextMobileToast();
    }
}

function getMobileToastDisplayDurationMs() {
    let backlog = mobileToastQueue.length;
    return Math.max(650, 1700 - (backlog * 180));
}

function showNextMobileToast() {
    if (mobileToastQueue.length <= 0) return;
    let entry = mobileToastQueue.shift();
    mobileToastActiveCount++;
    let root = getMobileToastRoot();
    let toast = document.createElement('div');
    toast.textContent = entry.msg;
    toast.className = entry.cls === 'attack-monster' ? 'mobile-log-toast mobile-log-toast--error' : 'mobile-log-toast';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .2s ease';
    root.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    // A tap clears it at once and the next one follows; otherwise it fades out on its own.
    toast.addEventListener('click', () => releaseMobileToast(toast, 90));
    setTimeout(() => releaseMobileToast(toast, 220), getMobileToastDisplayDurationMs());
}

/** Frees a phone toast's slot once: fade out, remove, then let the next queued toast in. */
function releaseMobileToast(toast, fadeMs) {
    if (toast.dataset.released) return;
    toast.dataset.released = '1';
    toast.style.transition = `opacity ${fadeMs}ms ease`;
    toast.style.opacity = '0';
    setTimeout(() => {
        toast.remove();
        mobileToastActiveCount = Math.max(0, mobileToastActiveCount - 1);
        setTimeout(pumpMobileToastQueue, 0);
    }, fadeMs);
}

function registerCombatLogItemSnapshot(item) {
    let token = ++combatLogItemSequence;
    let snapshot = JSON.parse(JSON.stringify(item));
    combatLogItemSnapshots.set(token, snapshot);
    while (combatLogItemSnapshots.size > 80) {
        const expired=[...combatLogItemSnapshots.keys()].find(key=>
            !document.querySelector(`#background-combat-result-overlay [data-log-item-token="${key}"]`));
        combatLogItemSnapshots.delete(expired);
    }
    return token;
}

function decorateCombatLogItemMessage(msg, item) {
    if (!item || typeof item !== 'object' || !item.name) return msg;
    let token = registerCombatLogItemSnapshot(item);
    let label = `[${item.name}]`;
    let link = `<span class="combat-log-item-link" role="button" tabindex="0" data-item-tooltip-anchor="1" data-log-item-token="${token}" onmouseenter="showCombatLogItemTooltip(event,${token})" onmousemove="showCombatLogItemTooltip(event,${token})" onmouseleave="hideCombatLogItemTooltip(event)" onclick="openCombatLogItemEquipment(event)" onkeydown="if(event.key==='Enter'||event.key===' '){openCombatLogItemEquipment(event)}">${escapeHTML(label)}</span>`;
    return String(msg).replace(label, link);
}

function stripCombatLogEmoji(raw) {
    return stripDecorativeEmoji(raw);
}

function getCombatLogElementFromText(message) {
    let text = String(message || '');
    if (/(화염|점화)/.test(text)) return 'fire';
    if (/(냉기|한기|동결)/.test(text)) return 'cold';
    if (/(번개|감전)/.test(text)) return 'light';
    if (/(카오스|중독|독)/.test(text)) return 'chaos';
    if (/(물리|출혈)/.test(text)) return 'phys';
    return '';
}

function getCombatLogIconKind(message, cls, options) {
    let opts = options || {};
    if (opts.item) return 'item';
    if (['attack', 'phys', 'fire', 'cold', 'light', 'chaos'].includes(opts.logIcon)) return opts.logIcon;
    if (['phys', 'fire', 'cold', 'light', 'chaos'].includes(opts.element)) return opts.element;
    let text = String(message || '');
    let element = getCombatLogElementFromText(message);
    if (element && /(피격|피해|상태이상|점화|냉각|동결|감전|중독|출혈)/.test(text)) return element;
    if (cls === 'attack-player' && /(피해|타격|공격)/.test(text)) return 'attack';
    if (cls === 'attack-monster' && /피해/.test(text)) return element || 'phys';
    return '';
}

function renderCombatLogIcon(kind, options) {
    let opts = options || {};
    if (kind === 'item') {
        let asset = typeof getInventoryItemVisualAsset === 'function'
            ? getInventoryItemVisualAsset(opts.item, opts.itemKind) : '';
        return asset ? `<img class="combat-log-icon combat-log-item-icon" src="${escapeHTML(asset)}" alt="" aria-hidden="true">` : '';
    }
    return kind ? `<span class="combat-log-icon combat-log-icon--${kind}" aria-hidden="true"></span>` : '';
}

/** A critical hit colours only its damage number and keeps the player-hit line colour: whole grey and orange lines in turn made the log
 * busier (2026-10-06 user: "치명타는 그냥 숫자 색만 바꿔도 충분할거같은데?"). critValue is the formatted number before "피해". */
function markCombatLogCritNumber(message, critValue) {
    let at = critValue ? message.lastIndexOf(_t('{critValue} 피해', { critValue })) : -1;
    if (at < 0) return message;
    return `${message.slice(0, at)}<span class="combat-log-crit">${critValue}</span>${message.slice(at + critValue.length)}`;
}

function decorateCombatLogMessage(message, cls, options) {
    let cleanMessage = stripCombatLogEmoji(message);
    let icon = renderCombatLogIcon(getCombatLogIconKind(cleanMessage, cls, options), options);
    return `${icon}${markCombatLogCritNumber(cleanMessage, options && options.critValue)}`;
}

/** 이전 줄을 읽는 동안의 자리: 창 맨 위에 걸친 줄과 창 윗변에서의 거리(화면 px, 위로 넘어가면 음수).
 * 숨지 않았고 최신 줄을 따라가지 않을 때만 잰다. 줄이 없으면 null. */
function captureCombatLogScroll(log) {
    const top = log.getBoundingClientRect().top;
    for (const row of log.children) {
        const box = row.getBoundingClientRect();
        if (box.bottom > top) return { row, offset: box.top - top };
    }
    return null;
}

/** 코드가 옮긴 자리의 scroll 사건만 건너뛴다. 80ms 시간창은 그 사이의 실제 입력도 놓쳤다.
 * 기대 자리는 다음 사건 하나에만 쓰고 지운다. 옮겨도 자리가 같아 사건이 없으면 첫 사용자 이동에서 지워진다. */
function watchCombatLogScroll(log) {
    if (log.combatLogScrollWatched) return;
    log.combatLogScrollWatched = true;
    log.addEventListener('scroll', () => {
        const top = log.scrollTop, own = top === log.combatLogSetTop;
        log.combatLogSetTop = NaN;
        if (own) return;
        log.combatLogAtBottom = log.scrollHeight - top - log.clientHeight <= 24;
    }, { passive: true });
}

function scrollCombatLogToLatest(log) {
    log.scrollTop = log.scrollHeight;
    log.combatLogSetTop = log.scrollTop;
    log.combatLogAtBottom = true;
}

/** Hidden tab (phone, another menu open), a folded combat feed, or the PC message frames' stash (the other tab is showing, or the
 * frame is folded; js/message-frames-ui.js): #log is display:none there and measuring forces a style recalculation. */
function isCombatLogHidden(log) {
    if (typeof log.closest !== 'function') return false;
    const pane = log.closest('.tab-content');
    // 접힌 판은 PC와 예전 휴대폰 배치에서 #log를 숨기지만, 좁은 전투 화면(css/themes/rift-stage.css 세로 배치)은 접힘 표시가 남아도 판을 보인다:
    // 접힘만 보고 숨겼다고 여겨 맨 아래로 내리지 않았다(2026-11-09 사용자: 전투로그가 자동으로 맨 밑으로 안 가).
    return (!!pane && !pane.classList.contains('active')) || !!log.closest('.message-frame-stash')
        || (!!log.closest('.combat-feed.collapsed') && log.offsetHeight === 0);
}

/** 읽던 줄을 같은 화면 위치에 둔다. 앞에서 지워져 사라졌으면 가장 가까운 남은 줄(첫 줄)을 쓴다.
 * 현재 위치에서 차이만 보정하므로 브라우저의 스크롤 고정이 먼저 움직였어도 중복 보정하지 않는다. */
function restoreCombatLogScroll(log, scrollState) {
    const row = scrollState.row.parentNode === log ? scrollState.row : log.firstElementChild;
    if (!row) return;
    // 화면 px 차이를 scrollTop의 CSS px로 바꾼다(루트 zoom, js/ui-display.js).
    log.scrollTop += (row.getBoundingClientRect().top - log.getBoundingClientRect().top - scrollState.offset) / uiDisplay.factor;
    log.combatLogSetTop = log.scrollTop;
}

/** 지난번에 붙인 뒤 COMBAT_LOG_FLUSH_MS가 안 지났으면 다음 프레임에 다시 본다. @returns {boolean} 미뤘는지 */
function deferCombatLogFlush(frameNow) {
    if (frameNow - lastLogFlushAt >= COMBAT_LOG_FLUSH_MS || frameNow < lastLogFlushAt) { lastLogFlushAt = frameNow; return false; }
    logFlushRaf = requestAnimationFrame(flushLogQueue);
    return true;
}

/** 붙인 뒤의 스크롤: 숨은 로그는 다시 보일 때 최신 줄을 따라가게 적어 두고, 이전 줄을 읽는 중이면 그 줄로 되돌리고, 아니면 맨 아래로. */
function settleCombatLogScroll(log, view) {
    if (view.hidden) log.combatLogAtBottom = true;
    else if (view.scrollState) restoreCombatLogScroll(log, view.scrollState);
    else scrollCombatLogToLatest(log);
}

function flushLogQueue(frameNow = performance.now()) {
    logFlushRaf = 0;
    const log = document.getElementById('log');
    if (!log || logQueue.length === 0 || deferCombatLogFlush(frameNow)) return;
    watchCombatLogScroll(log);
    // 숨은 로그는 재지 않고, 다시 보이면 최신 줄을 따라간다. 이전 줄을 읽는 중이면 그 줄을 계속 보게 둔다.
    const hidden = isCombatLogHidden(log), reading = !hidden && log.combatLogAtBottom === false;
    let scrollState = reading ? captureCombatLogScroll(log) : null;
    // 백그라운드 재계산처럼 로그가 폭주하면 어차피 60줄만 남으므로,
    // DOM에 만들 필요가 없는 초과분은 만들기 전에 버린다.
    if (logQueue.length > 60) logQueue = logQueue.slice(-60);
    let frag = document.createDocumentFragment();
    logQueue.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'log-msg ' + (entry.cls || '');
        div.innerHTML = entry.msg;
        frag.appendChild(div);
    });
    noteCombatLogLatest(logQueue[logQueue.length - 1]);
    logQueue = [];
    log.appendChild(frag);
    while (log.childElementCount > 60) log.removeChild(log.firstChild);
    settleCombatLogScroll(log, { hidden, scrollState });
}

/** 휴대폰에서 접힌 전투 기록 막대에 보일 최근 한 줄(접기 단추의 data-latest, ui-responsive-refine.css가 '전투 로그' 대신 쓴다). */
function noteCombatLogLatest(entry) {
    if (!document.body.classList.contains('mobile-battle-tab')) return; // PC에는 이 줄을 읽는 규칙이 없다: 기록마다 단추 스타일만 다시 계산했다
    const toggle = document.getElementById('btn-combat-log-toggle'), text = entry ? stripHtmlMessage(entry.msg) : '';
    if (toggle && text && toggle.dataset.latest !== text) toggle.dataset.latest = text;
}

function isCombatLogRateLimited(opts, settings, now) {
    if (!opts.rateKey || settings.combatLogRateLimit === false) return false;
    if (now < (combatLogRateState[opts.rateKey] || 0)) return true;
    combatLogRateState[opts.rateKey] = now + Math.max(60, Number(opts.minIntervalMs || 180));
    return false;
}

/** One line into the log queue. The queue is trimmed while drawing is paused (a hidden tab): only 60 lines are ever shown. */
function pushCombatLogLine(msg, cls) {
    logQueue.push({ msg, cls });
    if (logQueue.length > 240) logQueue = logQueue.slice(-60);
    if (!logFlushRaf) logFlushRaf = requestAnimationFrame(flushLogQueue);
}

function mergedCombatLogLine(state) {
    return state.count > 1 ? `${state.msg} <span style="color:var(--copy-bright);">x${state.count}</span>` : state.msg;
}

/** Flushes a merged log line once its window has passed quietly. A line hit again inside the window waits for the rest of the
 * window (the timer re-arms), so the last line of a burst always shows and the entry is freed (2026-10-26: it used to stay, one per
 * enemy ever hit, until that enemy was hit again). */
function flushCombatLogAggregate(key, winMs) {
    let state = combatLogAggregateState[key];
    if (!state) return;
    let quiet = performance.now() - state.lastAt;
    if (quiet < winMs) { setTimeout(flushCombatLogAggregate, winMs - quiet + 10, key, winMs); return; }
    pushCombatLogLine(mergedCombatLogLine(state), state.cls);
    delete combatLogAggregateState[key];
}

/** Lines with an aggregateKey merge inside their window into one line with a count. */
function queueAggregatedCombatLog(msg, cls, opts, now) {
    let key = `${opts.aggregateKey}:${cls || ''}`;
    let state = combatLogAggregateState[key];
    let winMs = Math.max(120, Number(opts.aggregateWindowMs || 500));
    if (state && (now - state.lastAt) <= winMs) {
        state.count++;
        state.lastAt = now;
        state.msg = msg;
        return;
    }
    if (state) pushCombatLogLine(mergedCombatLogLine(state), state.cls);
    combatLogAggregateState[key] = { msg: msg, cls: cls, count: 1, lastAt: now };
    setTimeout(flushCombatLogAggregate, winMs + 10, key, winMs);
}

exposeFileGlobals({ shouldShowMobileToast, stripHtmlMessage, enqueueMobileToast, pumpMobileToastQueue, registerCombatLogItemSnapshot, decorateCombatLogItemMessage, renderCombatLogIcon, decorateCombatLogMessage, scrollCombatLogToLatest, isCombatLogRateLimited, pushCombatLogLine, queueAggregatedCombatLog });
})();
