'use strict';
/**
 * PSD 테 스킨(css/themes/psd-skin.css)의 스크립트 몫: 위쪽 단추의 강조(.psd-attn)를 새 알림에 붙이고 누르면 뗀다
 * (2026-11-07 사용자: 깜빡이 말고 강조만, 한 번 확인하면 강조를 없애고 다른 알림이 없을 때는 그냥 둔다).
 * 알림마다 열쇠가 있다: 루프 진행은 그 루프, 꼭 할 목표는 그 목표의 제목, 처음 자동은 한 번. 누른 열쇠는 이 기기(localStorage)에
 * 남아 같은 알림이면 다시 붙지 않고, 다음 루프나 다른 목표처럼 열쇠가 바뀌면 다시 붙는다. 메뉴 단추 안내 테(.tutorial-callout)도
 * 누르면 바로 뗀다(게임은 안내 카드가 닫힐 때 뗀다). 단추와 목표 판이 바뀔 때만 다시 본다(MutationObserver).
 */
(function psdSkinUi() {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
    const SEEN_KEY = 'rignin-psd-seen';
    // 루프 진행 단추는 게임이 style.display로 보이고 숨긴다(js/ui.js). 크기를 재지 않아 그릴 때마다 배치를 다시 계산시키지 않는다.
    const shown = el => el.style.display !== 'none';
    const goalTitle = () => (document.getElementById('ui-goal-title')?.textContent || '').trim();
    /** id: 본 열쇠를 적는 칸, button: 강조할 단추, key: 지금 알림의 열쇠(알림이 없으면 빈 값) */
    const ALERTS = [
        { id: 'loop', button: 'btn-combat-loop-advance', key: el => (shown(el) ? `loop-${typeof game === 'object' && game ? game.loopCount : 0}` : '') },
        { id: 'goal', button: 'btn-combat-goal-toggle', key: el => (el.classList.contains('mandatory') ? `goal-${goalTitle()}` : '') },
        { id: 'auto', button: 'btn-act-exploration-auto', key: el => (el.classList.contains('is-opening-glow') ? 'opening' : '') }
    ];

    function readSeen() {
        try {
            const parsed = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (error) {
            console.warn('[psd-skin] 본 알림을 읽지 못해 처음부터 셉니다.', error);
            return {};
        }
    }
    const seen = readSeen();

    function remember(id, key) {
        seen[id] = key;
        try {
            localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
        } catch (error) {
            console.warn('[psd-skin] 본 알림을 남기지 못했습니다(이번 접속 동안만 기억합니다).', error);
        }
    }

    function refresh() {
        for (const alert of ALERTS) {
            const el = document.getElementById(alert.button);
            if (!el) continue;
            const key = alert.key(el);
            el.classList.toggle('psd-attn', !!key && seen[alert.id] !== key);
        }
    }

    function onPress(event) {
        const target = event.target instanceof Element ? event.target : null;
        if (!target) return;
        target.closest('.tutorial-callout')?.classList.remove('tutorial-callout');
        const alert = ALERTS.find(item => target.closest(`#${item.button}`));
        if (!alert) return;
        const key = alert.key(document.getElementById(alert.button));
        if (key) remember(alert.id, key);
        refresh();
    }

    function start() {
        const actions = document.querySelector('.combat-zone-actions');
        if (!actions) return;
        const observer = new MutationObserver(() => {
            const drawer = document.getElementById('ui-goal-drawer');
            if (drawer && !drawer.dataset.psdWatched) {
                drawer.dataset.psdWatched = '1';
                observer.observe(drawer, { childList: true, characterData: true, subtree: true });
            }
            refresh();
        });
        observer.observe(actions, { attributes: true, attributeFilter: ['class', 'style', 'hidden'], subtree: true });
        document.addEventListener('click', onPress, true);
        refresh();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
