// 중복 접속 차단(2026-10-30). 같은 계정이 다른 기기나 탭에서 새로 로그인하면 먼저 붙어 있던 화면이 멈춘다: 새 접속이 이긴다(다른 웹 MMO에서 본
// 값싼 장치). 화면마다 접속 표(무작위 문자열)를 하나 만들어 로그인하면 서버에 적고(db/hall-watch-20261030.sql claim_cloud_session), 그 뒤의
// 서버 요청마다 x-rignin-session 머리말로 싣는다(js/ui.js cloudRequestHeaders, buildPageExitCloudRequest). 서버는 클라우드 저장을 쓰는 요청
// (저장 업로드, 전당의 등록과 구매)의 머리말이 적힌 표와 다르면 CLOUD_SESSION_SUPERSEDED로 거절한다. 이 화면은 POLL_MS마다 적힌 표를 읽어
// (cloud_sessions의 자기 줄) 다른 표가 적혀 있으면, 또는 서버가 그렇게 거절하면 지금까지를 이 기기에 저장하고 더는 쓰지 않으며
// (js/game-tab-guard-ui.js와 같은 방식) 다시 불러와 대기 화면이 된다. 대기 화면의 단추는 이 화면이 다시 접속하게 한다(새 표를 적어 다른 기기가 멈춘다).
// 서버에 아직 표가 없거나(SQL을 돌리기 전, 404) 적기에 실패하면 이 장치는 꺼진 채 예전처럼 돈다: 머리말을 싣지 않고 읽지도 않는다.
const cloudSessionGuard = (() => {
    'use strict';
    const STANDBY_KEY = 'rignin-cloud-superseded';   // sessionStorage: 이 화면은 다른 기기의 접속에 밀려났다
    const HEADER = 'x-rignin-session';
    const REFUSAL = 'CLOUD_SESSION_SUPERSEDED';
    const POLL_MS = 60000;
    const STANDBY_TEXT = Object.freeze({
        title: '다른 기기에서 접속 중',
        copy: '다른 기기에서 이 계정으로 접속했습니다. 이 화면은 멈췄고 저장과 전당, 결투를 서버에 보내지 않습니다.',
        button: '여기서 다시 접속',
        note: '다시 접속하면 다른 기기의 게임이 멈춥니다.',
        blocked: '다른 기기에서 이 계정으로 접속해 이 화면은 저장하지 않습니다.',
        refused: '다른 기기에서 이 계정으로 접속해 이 화면에서는 서버 요청을 보내지 않습니다.'
    });
    const guard = { token: null, armed: false, userId: null, superseded: false, disabled: false, timer: null, pending: null };

    function freshToken() {
        const random = typeof crypto === 'object' && crypto && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        return Date.now().toString(36) + '-' + random;
    }

    function readStandbyMark() {
        try {
            return sessionStorage.getItem(STANDBY_KEY) === '1';
        } catch (error) {
            console.warn('cloud session guard cannot read sessionStorage:', error);
            return false;
        }
    }
    function writeStandbyMark(on) {
        try {
            if (on) sessionStorage.setItem(STANDBY_KEY, '1'); else sessionStorage.removeItem(STANDBY_KEY);
        } catch (error) {
            console.warn('cloud session guard cannot write sessionStorage:', error);
        }
    }

    /** 서버가 이 장치를 모른다(404: 표나 RPC가 없다): 이번 실행은 장치를 끈다. 다른 오류(망, 5xx)는 다음 차례에 다시 해 본다. */
    function noteGuardFailure(step, error) {
        if (Number(error && error.status) === 404) {
            guard.disabled = true;
            console.warn('cloud session guard off: the server has no cloud_sessions yet (db/hall-watch-20261030.sql)', error);
            return;
        }
        console.warn('cloud session guard ' + step + ' failed:', error);
    }

    /** 이 화면의 표를 적는다. 성공해야 머리말을 싣고(armed) 읽기를 시작한다. */
    async function claimCloudSession() {
        const userId = getActiveCloudUserId();
        if (!userId || guard.disabled || guard.superseded) return;
        if (!guard.token) guard.token = freshToken();
        try {
            await cloudJsonRequest('/rest/v1/rpc/claim_cloud_session', { method: 'POST', expectedUserId: userId, body: { p_token: guard.token } });
            guard.armed = true;
            guard.userId = userId;
        } catch (error) {
            noteGuardFailure('claim', error);
        }
    }

    /** 적힌 표를 읽는다: 다른 표면 다른 기기가 그 뒤에 접속했다. */
    async function readClaimedSession() {
        const userId = guard.userId;
        try {
            const rows = await cloudJsonRequest('/rest/v1/cloud_sessions?select=token&user_id=eq.' + encodeURIComponent(userId), { expectedUserId: userId });
            const row = Array.isArray(rows) ? rows[0] : null;
            if (row && typeof row.token === 'string' && row.token !== guard.token) supersedeCloudSession();
        } catch (error) {
            noteGuardFailure('check', error);
        }
    }

    /** 한 차례: 아직 못 적었으면 적고, 적었으면 읽는다. 숨은 화면은 게임이 멈춰 있어 건너뛴다(다시 보일 때 바로 한 차례 돈다). */
    function pollCloudSession() {
        if (guard.pending || guard.disabled || guard.superseded || document.hidden || !getActiveCloudUserId()) return;
        guard.pending = (guard.armed ? readClaimedSession() : claimCloudSession()).finally(() => { guard.pending = null; });
    }

    function stopPolling() {
        if (guard.timer) clearInterval(guard.timer);
        guard.timer = null;
    }

    /** 로그인 상태가 바뀔 때(js/ui.js applyCloudSession): 계정이 바뀌면 새 표를 적고, 로그아웃이면 머리말과 읽기를 멈춘다. */
    function syncCloudSessionGuard() {
        const userId = getActiveCloudUserId();
        if (!userId) {
            stopPolling();
            guard.armed = false;
            guard.userId = null;
            return;
        }
        if (guard.armed && guard.userId === userId) return;
        guard.armed = false;
        guard.token = freshToken();
        if (!guard.timer) guard.timer = setInterval(pollCloudSession, POLL_MS);
        pollCloudSession();
    }

    /** 다른 기기가 이겼다: 지금까지를 이 기기에 저장하고, 더는 쓰지 않으며, 대기 화면으로 다시 불러온다. */
    function supersedeCloudSession() {
        if (guard.superseded) return;
        guard.superseded = true;
        stopPolling();
        try {
            if (gameplayStarted && canPersistLocalSave()) saveGame({ skipCloudSync: true });
        } catch (error) {
            console.warn('cloud session guard could not save before standby:', error);
        }
        setLocalSaveRuntimeState('superseded', { writable: false, message: STANDBY_TEXT.blocked });   // 종료 전 업로드도 함께 멈춘다
        writeStandbyMark(true);
        location.reload();
    }

    function showStandby() {
        setLocalSaveRuntimeState('superseded', { writable: false, message: STANDBY_TEXT.blocked });
        const overlay = document.getElementById('startup-overlay');
        const panel = document.getElementById('startup-standby');
        if (!overlay || !panel) return;
        const fill = (selector, text) => { const el = panel.querySelector(selector); if (el) el.textContent = text; };
        fill('.startup-auth-title', STANDBY_TEXT.title);
        fill('.startup-standby-copy', STANDBY_TEXT.copy);
        fill('.startup-standby-note', STANDBY_TEXT.note);
        overlay.classList.add('standby');
        panel.hidden = false;
        const resume = document.getElementById('btn-startup-standby');
        if (!resume) return;
        resume.textContent = STANDBY_TEXT.button;
        resume.addEventListener('click', () => { writeStandbyMark(false); location.reload(); });
        resume.focus();
    }

    /** Resolves when this page may boot; a page another device pushed out shows the standby panel and never resolves
     * (js/main.js awaits this before the tab guard, so a standby page says no hello to other tabs). */
    function untilSessionMayBoot() {
        if (!readStandbyMark()) return Promise.resolve();
        showStandby();
        return new Promise(() => {});
    }

    /** 서버 요청에 실을 머리말: 표를 적은 뒤의 인증 요청에만. */
    function requestHeaders(options) {
        if (!guard.armed || guard.superseded || (options && options.useAuth === false)) return {};
        return { [HEADER]: guard.token };
    }
    /** 밀려난 화면은 서버 요청을 보내지 않는다(다시 불러오기 전의 짧은 사이). */
    function assertActive() {
        if (guard.superseded) throw new Error(STANDBY_TEXT.refused);
    }
    /** 서버가 거절한 본문: 접속 표가 다르다는 거절이면 바로 멈춘다(읽기 차례를 기다리지 않는다). */
    function noteServerRefusal(data) {
        if (guard.armed && data && typeof data === 'object' && data.message === REFUSAL) supersedeCloudSession();
    }

    document.addEventListener('visibilitychange', () => { if (!document.hidden && guard.armed) pollCloudSession(); });

    return Object.freeze({ ready: untilSessionMayBoot, syncSession: syncCloudSessionGuard, requestHeaders, assertActive, noteServerRefusal, refusalCode: REFUSAL });
})();
