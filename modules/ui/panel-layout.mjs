/** Responsive battle docking and panel controls; owns the pointer listener used by tutorial placement. */
export class PanelLayout {
    constructor(deps, controls) {
        this.deps = deps;
        this.controls = controls;
        this.docked = false;
        this.onPointer = e => { controls.mouseX = e.clientX; controls.mouseY = e.clientY; };
        deps.document.addEventListener('mousemove', this.onPointer);
    }

    dispose() { this.deps.document.removeEventListener('mousemove', this.onPointer); }

    syncBattleTabLayout(forceTabSwitch) {
        let tabBattle = this.deps.document.getElementById('tab-battle');
        let leftPane = this.deps.document.getElementById('left-pane');
        let battleColumn = this.deps.document.getElementById('battle-column');
        let battleBtn = this.deps.document.getElementById('btn-tab-battle');
        if ([tabBattle, leftPane, battleColumn, battleBtn].some(element => !element)) return;
        let isMobileBattle = this.deps.uiDisplay.matches(`(max-width: ${this.deps.MOBILE_BATTLE_BREAKPOINT}px)`);
        this.deps.document.body.classList.toggle('mobile-battle-tab', isMobileBattle);
        battleBtn.style.display = isMobileBattle ? 'flex' : 'none';
        if (isMobileBattle) {
            if (!this.docked || battleColumn.parentElement !== tabBattle) tabBattle.appendChild(battleColumn);
            this.docked = true;
            if (forceTabSwitch && !this.deps.document.getElementById('tab-battle').classList.contains('active')) this.deps.switchTab('tab-battle');
        } else {
            if (this.docked || battleColumn.parentElement !== leftPane) leftPane.appendChild(battleColumn);
            this.docked = false;
        }
    }

    isTutorialOpen() {
        let overlay = this.deps.document.getElementById('tutorial-overlay');
        return !!this.controls.activeTutorial && !!overlay && overlay.classList.contains('active');
    }

    isLoadingOverlayOpen() {
        let overlay = this.deps.document.getElementById('loading-overlay');
        return !!overlay && overlay.classList.contains('active');
    }

    applyPanelLayoutSettings() {
        let leftPane = this.deps.document.getElementById('left-pane');
        let leftToggleButtons = ['left-pane-collapse-toggle', 'left-pane-floating-toggle']
            .map(id => this.deps.document.getElementById(id))
            .filter(Boolean);
        let leftExpandFab = this.deps.document.getElementById('left-pane-expand-fab');
        let combatFeed = this.deps.document.querySelector('.combat-feed');
        let combatLogToggleBtn = this.deps.document.getElementById('btn-combat-log-toggle');
        let isLeftCollapsed = !!(this.deps.game && this.deps.game.settings && this.deps.game.settings.leftPaneCollapsed);
        let isLogCollapsed = this.deps.uiDisplay.matches('(max-width: 1080px)')
            ? !this.deps.game.settings.mobileCombatLogExpanded : !!this.deps.game.settings.combatLogCollapsed;
        if (leftPane) leftPane.classList.toggle('collapsed', isLeftCollapsed);
        this.deps.document.body.classList.toggle('left-pane-collapsed', isLeftCollapsed);
        // 정적 UI를 새로 그릴 때마다 불린다. 같은 글자와 속성을 다시 쓰고 innerText를 읽으면 문서 스타일과 배치를 강제로 다시
        // 계산했다(2026-10-07 프레임 드랍: 몇 초마다 한 번씩 튀던 프레임). 바뀐 것만 쓴다.
        const leftLabel = this.deps._t(isLeftCollapsed ? '전투 패널 펼치기' : '전투 패널 접기');
        leftToggleButtons.forEach(button => this.syncPanelToggle(button, isLeftCollapsed ? '▶' : '◀', { 'data-tip': leftLabel, 'aria-label': leftLabel }));
        if (leftExpandFab) this.syncPanelToggle(leftExpandFab, '▶', {});
        if (combatFeed) combatFeed.classList.toggle('collapsed', isLogCollapsed);
        this.deps.document.body.classList.toggle('combat-log-collapsed', isLogCollapsed);
        const [logText, logLabel] = isLogCollapsed ? ['펼치기', '전투 기록 펼치기'] : ['접기', '전투 기록 접기'];
        if (combatLogToggleBtn) this.syncPanelToggle(combatLogToggleBtn, this.deps._t(logText), { 'aria-expanded': String(!isLogCollapsed), 'aria-label': this.deps._t(logLabel) });
    }

    syncPanelToggle(el, text, attributes) {
        if (el.textContent !== text) el.textContent = text;
        Object.entries(attributes).forEach(([name, value]) => { if (el.getAttribute(name) !== value) el.setAttribute(name, value); });
    }

    toggleLeftPaneCollapse() {
        this.deps.game.settings.leftPaneCollapsed = !this.deps.game.settings.leftPaneCollapsed;
        this.applyPanelLayoutSettings();
    }

    toggleCombatLogCollapse() {
        if (this.deps.uiDisplay.matches('(max-width: 1080px)')) this.deps.game.settings.mobileCombatLogExpanded = !this.deps.game.settings.mobileCombatLogExpanded;
        else this.deps.game.settings.combatLogCollapsed = !this.deps.game.settings.combatLogCollapsed;
        this.applyPanelLayoutSettings();
        // 숨긴 기록은 스크롤 자리를 잃는다. 사용자가 펼칠 때만 최신 줄로 간다.
        const log = this.deps.document.getElementById('log');
        if (log && !this.deps.document.body.classList.contains('combat-log-collapsed')) log.scrollTop = log.scrollHeight;
    }
}
