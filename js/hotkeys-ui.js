// PC 단축키: 키 입력 처리, 메뉴·HUD 키 표시, 설정 > 전투 · 소리 > 단축키 화면.
// 배정 해석은 js/hotkeys.js(hotkeyBindings), 창 열기/닫기는 ui-window-manager(toggleWindowFromHotkey),
// 이동 스킬은 js/mobility-skill.js(request), 자동 이동은
// js/act-exploration-ui.js(toggleAuto)가 소유한다. Esc(창 닫기)는 ui-window-manager 고정.
const hotkeysUi = (() => {
    'use strict';
    const DENIED_TOAST_GAP_MS = 1200;
    let capturing = null;
    let notice = '';
    let lastDenied = { reason: '', at: 0 };
    let shownSignature = null;

    function overrides() { return game.settings.hotkeyOverrides; }

    function isBlocked(event) {
        if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || event.repeat) return true;
        if (document.body.classList.contains('startup-active')) return true;
        const typing = event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable="true"]');
        return !!typing || !!document.querySelector('dialog:modal, .tutorial-overlay.active');
    }

    function flashHudButton(button, ok) {
        if (!button) return;
        button.classList.remove('hud-key-used', 'hud-key-denied');
        void button.offsetWidth;
        button.classList.add(ok ? 'hud-key-used' : 'hud-key-denied');
    }

    /** A held key or quick taps repeat the same refusal; one toast per reason in DENIED_TOAST_GAP_MS. */
    function announceDenied(message) {
        const now = performance.now();
        if (lastDenied.reason === message && now - lastDenied.at < DENIED_TOAST_GAP_MS) return;
        lastDenied = { reason: message, at: now };
        showGameToast(message, { tone: 'warning', duration: 1600 });
    }

    /** HUD 이동 스킬 칸 클릭과 단축키가 함께 쓰는 입구: 다음 전투 틱에 시전된다. '' = 받아들임, 아니면 못 쓰는 까닭. */
    function useMobility(button) {
        const reason = mobilitySkill.request();
        if (reason) announceDenied(reason);
        flashHudButton(button || document.querySelector('#ui-combat-skill-gems .player-hud-skill-slot.mobility'), !reason);
        return reason;
    }

    function useCombatAction(target) {
        if (target === 'mobility') useMobility();
        else actExplorationUi.toggleAuto();
    }

    function onKeydown(event) {
        if (capturing) { captureKey(event); return; }
        if (isBlocked(event)) return;
        const action = hotkeyBindings.actionForCode(overrides(), event.code);
        if (!action) return;
        if (action.kind === 'window') {
            if (toggleWindowFromHotkey(action.target)) event.preventDefault();
            return;
        }
        event.preventDefault();
        useCombatAction(action.target);
    }

    function captureKey(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.repeat || ['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'].includes(event.code)) return;
        if (event.code === 'Escape') { capturing = null; notice = ''; render(); return; }
        if (event.code === 'Backspace' || event.code === 'Delete') { commit(capturing, ''); return; }
        if (event.ctrlKey || event.altKey || event.metaKey || !hotkeyBindings.isAssignable(event.code)) {
            notice = '글자·숫자·기호 키만 쓸 수 있습니다. Esc로 취소, Backspace로 키 없음.';
            render();
            return;
        }
        commit(capturing, event.code);
    }

    function commit(actionId, code) {
        const result = hotkeyBindings.assign(overrides(), actionId, code);
        game.settings.hotkeyOverrides = result.overrides;
        capturing = null;
        const moved = result.displaced.map(id => hotkeyBindings.actions.find(action => action.id === id).label);
        notice = moved.length ? `${hotkeyBindings.label(code)} 키를 쓰던 "${moved.join(', ')}"의 단축키를 비웠습니다.` : '';
        refresh();
        queueImportantSave(300);
    }

    function startCapture(actionId) {
        capturing = actionId;
        notice = '새 키를 누르세요. Esc 취소 · Backspace 키 없음';
        render();
        document.querySelector(`#ui-hotkey-settings [data-hotkey-action="${actionId}"]`)?.focus();
    }

    function resetDefaults() {
        game.settings.hotkeyOverrides = {};
        capturing = null;
        notice = '기본 단축키로 되돌렸습니다.';
        refresh();
        queueImportantSave(300);
    }

    function rowHtml(action, bindings) {
        const code = bindings.get(action.id);
        const waiting = capturing === action.id;
        const text = waiting ? '키 입력…' : (code ? hotkeyBindings.label(code) : '없음');
        const changed = code !== action.code;
        return `<div class="hotkey-row"><span class="cfg-label">${escapeHTML(action.label)}</span>`
            + `<button type="button" class="hotkey-key${waiting ? ' capturing' : ''}${code ? '' : ' unbound'}${changed ? ' changed' : ''}" data-hotkey-action="${action.id}" aria-label="${escapeHTML(action.label)} 단축키: ${escapeHTML(text)}. 눌러서 바꾸기">${escapeHTML(text)}</button></div>`;
    }

    function render() {
        const host = document.getElementById('ui-hotkey-settings');
        if (!host) return;
        const bindings = hotkeyBindings.effective(overrides());
        const group = kind => hotkeyBindings.actions.filter(action => action.kind === kind).map(action => rowHtml(action, bindings)).join('');
        host.innerHTML = `<div class="hotkey-section"><div class="hotkey-section-title">창 열기·닫기</div>${group('window')}</div>`
            + `<div class="hotkey-section"><div class="hotkey-section-title">전투 · 이동</div>${group('combat')}</div>`
            + `<div class="hotkey-footer"><span class="hotkey-notice" role="status" aria-live="polite">${escapeHTML(notice)}</span>`
            + `<button type="button" class="cfg-btn hotkey-reset" data-hotkey-reset>기본값으로</button></div>`;
    }

    /** 레일 메뉴의 키 표시(ui-window-manager의 버튼 id 규칙: btn-<tabId>). 하단 HUD 메뉴는 이름표(.ui-rail-label)에 적는다. */
    function labelRail() {
        const bindings = hotkeyBindings.effective(overrides());
        hotkeyBindings.actions.filter(action => action.kind === 'window').forEach(action => {
            const button = document.getElementById('btn-' + action.target);
            if (!button) return;
            const label = hotkeyBindings.label(bindings.get(action.id));
            const tip = button.querySelector('.ui-rail-label');
            if (label) { button.dataset.hotkey = label; button.setAttribute('aria-keyshortcuts', label); }
            else { delete button.dataset.hotkey; button.removeAttribute('aria-keyshortcuts'); }
            if (tip && label) tip.dataset.hotkey = label;
            else if (tip) delete tip.dataset.hotkey;
        });
    }

    function refresh() {
        shownSignature = JSON.stringify(overrides());
        labelRail();
        render();
        renderCombatSkillHud();
    }

    /** 저장 불러오기 등으로 game이 바뀌면 표시를 맞춘다(바뀐 게 없으면 아무것도 하지 않음). */
    function sync() {
        if (JSON.stringify(overrides()) !== shownSignature) refresh();
    }

    function cancelCaptureOutside(event) {
        if (!capturing || event.target.closest('#ui-hotkey-settings')) return;
        capturing = null;
        notice = '';
        render();
    }

    function onSettingsClick(event) {
        const key = event.target.closest('[data-hotkey-action]');
        if (key) { startCapture(key.dataset.hotkeyAction); return; }
        if (event.target.closest('[data-hotkey-reset]')) resetDefaults();
    }

    function init() {
        document.addEventListener('keydown', onKeydown, true);
        document.addEventListener('pointerdown', cancelCaptureOutside, true);
        document.getElementById('ui-hotkey-settings')?.addEventListener('click', onSettingsClick);
        refresh();
    }

    return Object.freeze({ init, sync, useMobility });
})();
safeExposeGlobals({ hotkeysUi });
