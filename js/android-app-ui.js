/** Android platform boundary. Browser gameplay and save formats remain shared. */
(() => {
    const { active, app, browser, redirectUrl } = appPlatform;
    let handlingCallback = false;

    async function receiveOAuth(event) {
        if (typeof event.url !== 'string' || !event.url.startsWith(redirectUrl + '?')) return;
        if (handlingCallback) return;
        handlingCallback = true;
        try {
            const target = new URL(event.url);
            const code = target.searchParams.get('code');
            if (!code) throw new Error(target.searchParams.get('error_description') || '인증 코드가 없습니다.');
            const { data, error } = await getSupabaseClient().auth.exchangeCodeForSession(code);
            if (error) throw error;
            applyCloudSession(data.session);
            await refreshCloudLinkedIdentities();
            setCloudMessage('로그인되었습니다. 클라우드 세이브로 계속할 수 있습니다.');
        } catch (error) {
            // Never log callback URLs or tokens; errors remain visible at the auth boundary.
            setCloudMessage('앱 로그인 실패: ' + error.message);
        } finally {
            handlingCallback = false;
            cloudState.busy = false;
            updateCloudSaveUI();
        }
    }

    function onAppState({ isActive }) {
        backgroundCombatRuntime.appInactive = !isActive;
        if (!gameplayStarted || window.__skipUnloadSaveOnce) return;
        if (isActive) {
            startBackgroundCombatReturn(Date.now()).catch(error => console.error('[android] 복귀 정산 실패', error));
            return;
        }
        if (!backgroundCombatRuntime.hiddenAtMs) recordBackgroundCombatEntry(Date.now());
        saveGame({ skipCloudSync: true });
        pushCloudSaveOnPageExit('android-pause');
    }

    function closeVisibleOverlay() {
        const dialog = [...document.querySelectorAll('dialog[open]')].at(-1);
        if (dialog) { dialog.close(); return true; }
        const overlays = [...document.querySelectorAll('[id$="-overlay"]:not(#startup-overlay), [role="dialog"], .social-modal-overlay')]
            .filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
        const overlay = overlays.at(-1);
        if (!overlay) return false;
        const close = [...overlay.querySelectorAll('button')].find(button => button.getClientRects().length
            && !button.disabled && /^(닫기|알겠어요!?|취소|나중에|확인)$/.test(button.textContent.trim()));
        if (close) close.click();
        // Mandatory hero/loop choices must remain visible when no dismiss action exists.
        return true;
    }

    async function onBack() {
        const focused = document.activeElement;
        if (focused?.matches('input,textarea,select,[contenteditable="true"]')) { focused.blur(); return; }
        if (closeVisibleOverlay()) return;
        if (isStartupOverlayOpen()) { await app.minimizeApp(); return; }
        const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
        document.body.dispatchEvent(escape);
        if (escape.defaultPrevented) return;
        if (!document.getElementById('tab-battle').classList.contains('active')) { switchTab('tab-battle'); return; }
        if (gameplayStarted) saveGame({ skipCloudSync: true });
        await app.minimizeApp();
    }

    async function init() {
        if (!active) return;
        document.addEventListener('click', event => {
            const link = event.target.closest('a[target="_blank"]');
            if (link && new URL(link.href).origin === location.origin) link.target = '_self';
        });
        try {
            await app.addListener('appStateChange', onAppState);
            await app.addListener('appUrlOpen', receiveOAuth);
            await app.addListener('backButton', () => onBack().catch(error => console.error('[android] 뒤로가기 실패', error)));
            await browser.addListener('browserFinished', recoverBusyStateAfterOAuthBack);
            const launch = await app.getLaunchUrl();
            if (launch?.url) await receiveOAuth(launch);
        } catch (error) {
            console.error('[android] 앱 연결 초기화 실패', error);
            setCloudMessage('앱 기능 초기화에 실패했습니다. 앱을 다시 실행해 주세요.');
        }
    }

    document.addEventListener('DOMContentLoaded', init, { once: true });
})();
