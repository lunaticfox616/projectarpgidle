// 시작 화면과 불러오는 화면(2026-11-10에 js/ui.js에서 그대로 옮겼다): 시작 화면을 열고 닫기, 불러오는 막대, 저장 요약 카드와 상태 줄
// (updateStartupScreenUI). 계정과 서버 저장은 js/cloud-save-ui.js.

function isStartupOverlayOpen() {
    return !!startupOverlayActive;
}

function setStartupOverlayActive(active) {
    startupOverlayActive = !!active;
    document.body.classList.toggle('startup-active', startupOverlayActive);
    let overlay = document.getElementById('startup-overlay');
    if (!overlay) return;
    overlay.classList.toggle('active', startupOverlayActive);
    if (startupOverlayActive) {
        overlay.scrollTop = 0;
        if (gameLoopFrameHandle !== null) cancelAnimationFrame(gameLoopFrameHandle);
        gameLoopFrameHandle = null;
    } else {
        scheduleGameLoop();
        if (typeof showNextTutorial === 'function') setTimeout(showNextTutorial, 0);
    }
    startMobilePipRefreshLoop();
    dispatchRuntimeEvent('startup-visibility', {active:startupOverlayActive});
}

function setLoadingOverlayState(active, options = {}) {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    let titleEl = document.getElementById('loading-title');
    let detailEl = document.getElementById('loading-detail');
    let captionEl = document.getElementById('loading-caption');
    let barEl = document.getElementById('loading-bar-fill');
    if (!active) {
        overlay.classList.remove('active');
        document.body.classList.remove('loading-active');
        loadingOverlayProgress = 0;
        if (barEl) { barEl.style.width = '0%'; barEl.parentElement.setAttribute('aria-valuenow', '0'); }
        if (typeof showNextTutorial === 'function') setTimeout(showNextTutorial, 0);
        return;
    }
    loadingOverlayProgress = Math.max(0, Math.min(92, options.progress || 12));
    if (titleEl) titleEl.innerText = _t(options.title) || '차원을 정렬하는 중...';
    if (detailEl) detailEl.innerText = options.detail || '세이브 상태를 점검하고 전장을 준비하고 있습니다.';
    if (captionEl) captionEl.innerText = options.caption || 'Syncing Timeline';
    if (barEl) { barEl.style.width = `${loadingOverlayProgress}%`; barEl.parentElement.setAttribute('aria-valuenow', String(Math.round(loadingOverlayProgress))); }
    overlay.classList.add('active');
    document.body.classList.add('loading-active');
}

function advanceLoadingOverlay(options = {}) {
    let titleEl = document.getElementById('loading-title');
    let detailEl = document.getElementById('loading-detail');
    let captionEl = document.getElementById('loading-caption');
    let barEl = document.getElementById('loading-bar-fill');
    if (titleEl && options.title) titleEl.innerText = _t(options.title);
    if (detailEl && options.detail) detailEl.innerText = options.detail;
    if (captionEl && options.caption) captionEl.innerText = options.caption;
    if (barEl && Number.isFinite(options.progress)) {
        loadingOverlayProgress = Math.max(loadingOverlayProgress, options.progress);
        barEl.style.width = `${loadingOverlayProgress}%`;
        barEl.parentElement.setAttribute('aria-valuenow', String(Math.round(loadingOverlayProgress)));
    }
}

async function finishLoadingOverlay() {
    advanceLoadingOverlay({
        progress: 100,
        title: _t('전장을 여는 중...'),
        detail: _t('진입 준비를 마무리하고 있습니다.'),
        caption: _t('전장 입장')
    });
    await new Promise(resolve => setTimeout(resolve, 320));
    setLoadingOverlayState(false);
}

function openStartupGate(options = {}) {
    setStartupRegistrationMode(false);
    if (options.accountOnly && cloudState.user) setCloudMessage(_t('계정 화면을 열었습니다. 다른 계정을 쓰려면 "다른 계정 사용"을 눌러주세요.'));
    else if (options.accountOnly && !cloudState.user) setCloudMessage(_t('계정 화면을 열었습니다. 로그인하거나 회원가입할 수 있습니다.'));
    else setCloudMessage(_t('시작 화면을 다시 열었습니다.'));
    setStartupOverlayActive(true);
    updateCloudSaveUI();
}

/** The card's one line for a save: level, loop and the zone it was in. */
function renderStartupSaveSummary(el, save) {
    if (!el) return;
    const current = save || {};
    const zone = getZone(current.currentZoneId) || { name: '액트 1: 버려진 해안' };
    const loopLabel = Math.max(1, Math.floor(current.season || 1));
    const act = getStoryActByZoneId(zone.id);
    const floors = { underworld: '지하계 {floor}층', skyTower: '창공의 탑 {floor}층', chaosRealm: '혼돈계 {floor}층' };
    const zoneLabel = act ? `${formatStoryActLabel(act)}: ${_t(act.title)}` : _t(floors[zone.type] || zone.name, { floor: zone.floor });
    el.innerText = _t('Lv.{level}, 루프 {loopLabel}, {zoneLabel}', { level: current.level || 1, loopLabel, zoneLabel });
}

/** The save the card shows: the slot in use, or, while the page is still on the guest slot with an account signed in (a reload with a
 * social login, 2026-11-05 사용자: "이 기기 저장이 아니라 로그인 기준으로"), that account's copy on this device. The copy is read once
 * per account: nothing saves while the login screen shows, and entering the account switches the slot. */
let startupAccountPreview = null;
function startupSaveStamp(save) {
    return (save && save.saveMeta && save.saveMeta.lastModifiedAt) || 0;
}
function startupShownSave() {
    const account = getSaveSlot().kind === 'account', userId = cloudState.user && cloudState.user.id;
    if (account || !userId) {
        startupAccountPreview = null;   // 계정에 들어가 놀았다면 다음 미리보기는 그 뒤의 사본을 다시 읽는다
        return { account, preview: false, save: game };
    }
    if (!startupAccountPreview || startupAccountPreview.userId !== userId) startupAccountPreview = { userId, save: readAccountSaveCopy(userId) };
    return { account: true, preview: true, save: startupAccountPreview.save };
}

// 시작 화면에는 오류·진행 결과만 적는다. 가만히 있을 때의 안내("로그인하면 …")는 버튼만으로 충분하다.
const STARTUP_IDLE_MESSAGES = new Set(['설정 전', '로그인하면 클라우드 저장을 사용할 수 있습니다.', '시작 화면을 다시 열었습니다.']);
function getStartupStatusText() {
    const message = cloudState.lastMessage || '';
    return STARTUP_IDLE_MESSAGES.has(message) ? '' : message;
}

/** The summary card and the guest button. In the guest slot (boot, or after leaving an account) the card is this device's guest save:
 * with a save the guest button says "이어하기" (else "게스트로 시작"), without one the card says "새 모험" and shows no grid (a first visitor
 * is not shown Lv.1, 루프 1, 마지막 저장 없음). The gate reopened from an account shows the account save instead, and the guest button
 * follows the guest save noted at the account entry (cloudState.guestSaveSummary). */
function renderStartupLocalSave(timeEl, guestBtn, shown) {
    const stamp = startupSaveStamp(shown.save);
    const card = startupSaveCardState(shown, stamp);
    if (timeEl) timeEl.innerText = formatCloudTime(stamp);
    if (guestBtn) guestBtn.textContent = _t(card.hasGuestSave ? '이 기기 저장으로 이어하기' : '게스트로 시작');
    const cardEl = document.querySelector('.startup-summary-card');
    if (!cardEl) return;
    cardEl.querySelector('.startup-summary-grid').hidden = !card.hasSave;
    const blocked = shown.preview ? null : getStartupBlockedSaveNotice(getLocalSaveStatus());   // 그 알림은 지금 불러온 칸의 것이다
    renderStartupSaveHint(cardEl.querySelector('.startup-summary-hint'), card.hasSave, blocked && blocked.hint, card.emptyText && _t(card.emptyText));
    cardEl.querySelector('.startup-summary-title').textContent = blocked ? blocked.title : _t(card.title);
}

/** What the summary card and the guest button show (renderStartupLocalSave). In the preview the page still holds the guest slot, so
 * the guest button follows the loaded game; with no copy of the account on this device the card says the entry fetches it. */
function startupSaveCardState(shown, stamp) {
    const guestStamp = startupSaveStamp(game);
    const hasSave = shown.preview ? !!shown.save : (shown.account || stamp > 0);
    return {
        hasSave,
        hasGuestSave: shown.preview ? guestStamp > 0 : (shown.account ? !!cloudState.guestSaveSummary : hasSave),
        title: shown.account ? '계정 저장' : (hasSave ? '이 기기 저장' : '새 모험'),
        emptyText: startupEmptyText(shown, hasSave)
    };
}

/** The line under an empty card, or null for the card's own line (index.html): in the preview the entry fetches the server save; signed
 * out on an empty guest slot with an account's copy on this device (js/save.js hasAccountSaveCopy), that logging in continues it. */
function startupEmptyText(shown, hasSave) {
    if (shown.preview) return '계정 저장으로 이어하기를 누르면 서버의 저장을 받습니다.';
    if (!hasSave && !shown.account && hasAccountSaveCopy()) return '이 기기에 로그인한 계정의 저장이 있습니다. 그 계정으로 로그인하면 이어서 할 수 있습니다.';
    return null;
}

/** 이 기기 저장을 쓸 수 없어 멈춘 경우의 제목과 안내(js/save.js loadGame): 읽지 못한 저장(corrupt, 원래 저장은 따로 보관한다)과
 * 더 새 판의 게임이 남긴 저장(newer-build, 2026-10-28: 그 판에서 열도록 그대로 둔다). 그 밖에는 null. */
function getStartupBlockedSaveNotice(status) {
    if (status.status === 'corrupt') return { title: _t('저장을 읽지 못했습니다'), hint: _t('저장을 읽지 못해 원래 저장을 따로 보관했습니다. 이대로 시작하면 진행이 저장되지 않습니다.') };
    if (status.status === 'newer-build') return { title: _t('새 버전의 저장입니다'), hint: _t('{message} 이대로 시작하면 진행이 저장되지 않습니다.', { message: status.message }) };
    return null;
}

/** 요약 칸 아래 한 줄. 이 기기 저장을 쓸 수 없으면(warning) "저장된 모험이 없습니다" 대신 그 까닭을 알린다(2026-10-27: 새 모험으로 보여
 * 시작한 진행이 말없이 저장되지 않았다). */
function renderStartupSaveHint(hint, hasSave, warning, emptyText) {
    if (!hint) return;
    hint.dataset.emptyText ??= hint.textContent;
    hint.textContent = warning || emptyText || hint.dataset.emptyText;
    hint.classList.toggle('is-warning', !!warning);
    hint.hidden = hasSave && !warning;
}

function updateStartupScreenUI() {
    let overlay = document.getElementById('startup-overlay');
    if (!overlay) return;
    let config = getCloudConfig();
    let localSummaryEl = document.getElementById('startup-local-summary');
    let localTimeEl = document.getElementById('startup-local-time');
    let statusEl = document.getElementById('startup-status');
    let authFormEl = document.getElementById('startup-auth-form');
    let authActionsEl = document.getElementById('startup-auth-actions');
    let socialActionsEl = document.getElementById('startup-social-login');
    let continueBtn = document.getElementById('btn-startup-continue');
    let switchBtn = document.getElementById('btn-startup-switch-account');
    let guestBtn = document.getElementById('btn-startup-guest');
    let backBtn = document.getElementById('btn-startup-back');
    let loginBtn = document.getElementById('btn-startup-login');
    let signupBtn = document.getElementById('btn-startup-signup');
    let resendBtn = document.getElementById('btn-startup-resend-confirmation');
    let googleBtn = document.getElementById('btn-startup-google');
    let kakaoBtn = document.getElementById('btn-startup-kakao');
    const shown = startupShownSave();
    renderStartupSaveSummary(localSummaryEl, shown.save);
    renderStartupLocalSave(localTimeEl, guestBtn, shown);
    if (statusEl) statusEl.textContent = getStartupStatusText();
    if (backBtn) {
        backBtn.style.display = gameplayStarted ? 'block' : 'none';
        backBtn.disabled = cloudState.busy;
    }

    if (!config.enabled) {
        if (authFormEl) authFormEl.classList.remove('hidden');
        if (authActionsEl) authActionsEl.style.display = 'grid';
        if (socialActionsEl) socialActionsEl.style.display = '';
        if (continueBtn) continueBtn.style.display = 'none';
        if (switchBtn) switchBtn.style.display = 'none';
        if (loginBtn) loginBtn.disabled = true;
        if (signupBtn) signupBtn.disabled = true;
        if (resendBtn) resendBtn.disabled = true;
        if (googleBtn) googleBtn.disabled = true;
        if (kakaoBtn) kakaoBtn.disabled = true;
        if (guestBtn) guestBtn.disabled = false;
        return;
    }

    if (cloudState.user) {
        if (authFormEl) authFormEl.classList.add('hidden');
        if (authActionsEl) authActionsEl.style.display = 'none';
        if (socialActionsEl) socialActionsEl.style.display = 'none';
        if (continueBtn) {
            continueBtn.style.display = 'block';
            continueBtn.disabled = cloudState.busy;
        }
        if (switchBtn) {
            switchBtn.style.display = 'block';
            switchBtn.disabled = cloudState.busy;
        }
        if (guestBtn) guestBtn.disabled = cloudState.busy;
        return;
    }

    if (authFormEl) authFormEl.classList.remove('hidden');
    if (authActionsEl) authActionsEl.style.display = 'grid';
    if (socialActionsEl) socialActionsEl.style.display = '';
    if (continueBtn) continueBtn.style.display = 'none';
    if (switchBtn) switchBtn.style.display = 'none';
    if (loginBtn) loginBtn.disabled = cloudState.busy;
    if (signupBtn) signupBtn.disabled = cloudState.busy;
    if (resendBtn) resendBtn.disabled = cloudState.busy;
    if (googleBtn) googleBtn.disabled = cloudState.busy;
    if (kakaoBtn) kakaoBtn.disabled = cloudState.busy;
    if (guestBtn) guestBtn.disabled = cloudState.busy;
}
