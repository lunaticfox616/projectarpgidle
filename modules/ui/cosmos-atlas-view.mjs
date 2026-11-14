import { getCosmosTierFloorTooltipHtml, buildCosmosStoneOverlayHtml, buildCosmosStoneTooltipHtml, renderCosmosStonePanel, renderSummary, renderMasteryPanel } from './cosmos-atlas-records.mjs';
import { getStatusLabel, renderCosmosDifficultySection, renderGalaxyGateLine, formatCosmosDirectivePressure, renderCosmosDirectiveCard, renderCosmosDirectiveSection, getCosmosChallengeButtonLabel, renderDetail } from './cosmos-atlas-detail.mjs';
import { consumeDomainCommands } from '../common/consume-commands.mjs';
import { listenView, releaseViewEvents } from './view-events.mjs';

/** One screen owns its DOM, delegated actions and subscriptions. Progress/rewards remain native domain work. */
export class CosmosAtlasView {
    constructor(deps, services) {
        this.deps = deps; this.active = true; this.listeners = [];
        this.ui = { detail: null, summary: null, installed: false, stoneOverlayOpen: false };
        this.state = services.state;
        this.graph = services.graph;
        this.progress = services.progress;
        this.rules = services.rules;
        this.encounters = services.encounters;
        this.directives = services.directives;
        this.stones = services.stones;
        this.rewards = services.rewards;
        this.getCosmosTierFloorTooltipHtml = getCosmosTierFloorTooltipHtml.bind(undefined, this);
        this.buildCosmosStoneOverlayHtml = buildCosmosStoneOverlayHtml.bind(undefined, this);
        this.buildCosmosStoneTooltipHtml = buildCosmosStoneTooltipHtml.bind(undefined, this);
        this.renderCosmosStonePanel = renderCosmosStonePanel.bind(undefined, this);
        this.renderSummary = renderSummary.bind(undefined, this);
        this.renderMasteryPanel = renderMasteryPanel.bind(undefined, this);
        this.getStatusLabel = getStatusLabel.bind(undefined, this);
        this.renderCosmosDifficultySection = renderCosmosDifficultySection.bind(undefined, this);
        this.renderGalaxyGateLine = renderGalaxyGateLine.bind(undefined, this);
        this.formatCosmosDirectivePressure = formatCosmosDirectivePressure.bind(undefined, this);
        this.renderCosmosDirectiveCard = renderCosmosDirectiveCard.bind(undefined, this);
        this.renderCosmosDirectiveSection = renderCosmosDirectiveSection.bind(undefined, this);
        this.getCosmosChallengeButtonLabel = getCosmosChallengeButtonLabel.bind(undefined, this);
        this.renderDetail = renderDetail.bind(undefined, this);
    }

    refreshCosmosStoneOverlay() {
        const el = this.deps.document.getElementById('cosmos-stone-overlay');
        if (!el || !this.ui.stoneOverlayOpen) return;
        el.innerHTML = this.buildCosmosStoneOverlayHtml(this.state.getState());
    }

    openCosmosStoneOverlay() {
        const el = this.deps.document.getElementById('cosmos-stone-overlay');
        if (!el) return;
        this.switchCosmosInnerTab('route');
        this.ui.stoneOverlayOpen = true;
        el.style.display = 'block';
        this.refreshCosmosStoneOverlay();
        el.scrollIntoView({block: 'nearest'});
    }

    closeCosmosStoneOverlay() {
        const el = this.deps.document.getElementById('cosmos-stone-overlay');
        this.ui.stoneOverlayOpen = false;
        if (el) el.style.display = 'none';
    }

    toggleCosmosStoneOverlay() {
        if (this.ui.stoneOverlayOpen) this.closeCosmosStoneOverlay();
        else this.openCosmosStoneOverlay();
    }

    showCosmosStoneTooltip(event, galaxy) {
        if (!event || typeof this.deps.showInfoTooltipHtml !== 'function') return;
        this.deps.showInfoTooltipHtml(event.clientX, event.clientY, this.buildCosmosStoneTooltipHtml(galaxy), '#b9e6ff');
    }

    installCosmosAtlas() {
        if (!this.active || this.ui.installed) return;
        this.graph.buildCosmosAtlasData();
        const mapTab = this.deps.document.getElementById('tab-map');
        if (!mapTab) return;
        const subtabRow = mapTab.querySelector('.subtab-row');
        if (!subtabRow) return;
        if (!this.deps.document.getElementById('btn-map-tab-cosmos')) {
            const btn = this.deps.document.createElement('button');
            btn.className = 'subtab-btn cosmos-tab-btn'; btn.id = 'btn-map-tab-cosmos';
            btn.type = 'button'; btn.textContent = this.deps._t('우주계'); btn.style.display = 'none';
            btn.dataset.cosmosAction = 'open';
            subtabRow.appendChild(btn);
        }
        if (!this.deps.document.getElementById('map-tab-cosmos')) {
            const panel = this.deps.document.createElement('div');
            panel.id = 'map-tab-cosmos'; panel.className = 'subtab-content cosmos-atlas-tab';
            panel.innerHTML = `
                <div id="ui-cosmos-panel" class="cosmos-panel">
                    <div id="cosmos-unified-map" class="cosmos-unified-map">
                        <div id="cosmos-inner-route"></div>
                        <details id="cosmos-node-detail"><summary>${this.deps._t('선택한 별')}</summary><div class="cosmos-detail" id="ui-cosmos-detail"></div></details>
                        <div id="cosmos-stone-overlay" class="cosmos-stone-overlay" style="display:none;"></div>
                    </div>
                    <div id="cosmos-inner-mastery" class="cosmos-mastery-shell" style="display:none;"></div>
                    <details class="cosmos-records-disclosure"><summary>${this.deps._t('탐사 기록, 보유 재화')}</summary><div class="cosmos-summary" id="ui-cosmos-summary"></div></details>
                </div>`;
            (mapTab.querySelector('.ui-window-body') || mapTab).appendChild(panel);
        }
        this.bindCosmosAtlasElements();
        this.state.getState();
        this.ui.installed = true;
        this.renderCosmosAtlas();
    }

    activateCosmosSubtab() {
        this.deps.document.querySelectorAll('#tab-map .subtab-content').forEach(el => el.classList.remove('active'));
        this.deps.document.querySelectorAll('#tab-map .subtab-btn').forEach(el => el.classList.remove('active'));
        const tab = this.deps.document.getElementById('map-tab-cosmos');
        const btn = this.deps.document.getElementById('btn-map-tab-cosmos');
        if (tab) tab.classList.add('active');
        if (btn) btn.classList.add('active');
        if (this.deps.game) this.deps.game.mapSubtab = 'map-tab-cosmos';
        this.renderCosmosAtlas();
    }

    bindCosmosAtlasElements() {
        this.ui.detail = this.deps.document.getElementById('ui-cosmos-detail');
        this.ui.summary = this.deps.document.getElementById('ui-cosmos-summary');
    }

    selectCosmosNode(id) {
        if (!this.graph.byId.has(id)) return;
        const state = this.state.getState();
        state.selectedId = id;
        this.renderCosmosAtlas();
    }

    syncCosmosTabVisibility() {
        this.deps.syncMapPrimaryContentTabs();
    }

    renderCosmosAtlas() {
        if (!this.active || (this.deps.game && this.deps.game.isBackgroundCalculation)) return;
        if (!this.ui.installed) { this.installCosmosAtlas(); return; }
        this.syncCosmosTabVisibility();
        this.deps.cosmosRouteUi.render({ nodes: this.graph.nodes.map(this.cosmosStarView.bind(this)), edges: this.graph.edges,
            unlocked: this.progress.isCosmosUnlocked(), onAction: this.handleCosmosRouteAction.bind(this), zoneOf: this.rules.getCosmosNodeEstimateZone.bind(this.rules) });
        this.deps.captureUiDisclosureState(this.ui.detail);
        this.deps.captureUiDisclosureState(this.ui.summary);
        if (this.deps.document.getElementById('cosmos-node-detail').open) this.renderDetail();
        this.renderSummary();
        this.deps.restoreUiDisclosureState(this.ui.detail);
        this.deps.restoreUiDisclosureState(this.ui.summary);
        this.renderMasteryPanel();
        this.refreshCosmosStoneOverlay();
    }

    cosmosStarView(node) {
        const status = this.progress.getNodeStatus(node);
        return { ...node, status, statusLabel: this.getStatusLabel(status) };
    }

    focusRecommendedCosmosNode() {
        this.graph.buildCosmosAtlasData();
        const guide = this.rules.getCosmosProgressGuide();
        if (!guide.targetId) return;
        this.selectCosmosNode(guide.targetId);
        this.focusCosmosAtlasOnSelected();
    }

    focusCosmosCapstoneBoss(nodeId) {
        this.graph.buildCosmosAtlasData();
        const node = this.graph.byId.get(nodeId);
        if (!node || node.tag !== 'boss') return;
        this.selectCosmosNode(node.id);
        this.focusCosmosAtlasOnSelected();
    }

    openCosmosCapstoneBossPanel() {
        if (typeof this.deps.switchMapSubtab === 'function') this.deps.switchMapSubtab('map-tab-zones');
        if (typeof this.deps.switchMapExploreSubtab === 'function') this.deps.switchMapExploreSubtab('map-explore-root-boss');
    }

    challengeSelectedCosmosNode() {
        if (!this.active) return;
        this.graph.buildCosmosAtlasData();
        const state = this.state.getState();
        const node = this.graph.byId.get(state.selectedId || 'planet-0');
        if (!node) return;
        if (!this.rules.canChallengeNode(node)) {
            if (typeof this.deps.addLog === 'function') this.deps.addLog('해당 우주계 노드는 아직 도전할 수 없습니다.', 'attack-monster');
            return;
        }
        if (typeof this.deps.addLog === 'function') {
            const directive = this.directives.getSelectedCosmosDirective(node);
            this.deps.addLog(this.deps._t('⚔️ {name} 도전 시작: {value}, 중력 {gravity}g, 크기 등급 {max}, 특징 {theme}', { name: node.name, value: directive ? directive.name : this.deps._t('기본 탐사'), gravity: Number(node.gravity || 1).toFixed(1), max: Math.max(1, Math.floor(node.sizeClass || 1)), theme: node.theme }), 'attack-monster');
        }
        this.deps.cosmosRouteRuntime.stop(this.deps.game);
        this.encounters.startCosmosBattle(node);
        this.renderCosmosAtlas();
    }

    handleCosmosRouteAction(action, value) {
        if (!this.active) return;
        const currentGame = this.deps.game;
        if (!this.progress.isCosmosUnlocked() || currentGame.isBackgroundCalculation) return;
        if (action === 'battle') { this.deps.closeAllWindows(); this.deps.switchTab('tab-battle'); return; }
        if (this.handleCosmosStarAction(action, value)) return;
        if (action === 'retreat') {
            this.deps.cosmosRouteRuntime.leave(currentGame);
            currentGame.combatHalted = true;
            currentGame.enemies = []; currentGame.encounterPlan = []; currentGame.moveTimer = 0;
        } else {
            const changed = action === 'start' && this.deps.cosmosRouteRuntime.start(currentGame, Number(value));
            if (!changed) return;
            const node = this.graph.byId.get(this.deps.cosmosRouteRuntime.current(currentGame));
            if (!this.rules.canChallengeNode(node)) {
                this.deps.cosmosRouteRuntime.stop(currentGame);
                this.deps.addLog('항로 진입 조건을 충족하지 못했습니다. 별 지도에서 진행도를 확인하세요.', 'season-up');
                return;
            }
                this.state.getState().selectedId = node.id;
            this.encounters.startCosmosBattle(node);
        }
        this.deps.updateStaticUI();
        this.deps.queueImportantSave(160);
        this.renderCosmosAtlas();
    }

    handleCosmosStarAction(action, value) {
        if (action === 'stones') { this.openCosmosStoneOverlay(); return true; }
        if (action !== 'node') return false;
        const node = this.graph.byId.get(value);
        if (!node) return true;
        this.deps.cosmosRouteUi.focus(node);
        this.selectCosmosNode(node.id);
        this.ui.detail.scrollIntoView({ block: 'nearest' });
        return true;
    }

    focusCosmosAtlasOnSelected() {
        const node = this.graph.byId.get(this.state.getState().selectedId);
        if (!node) return;
        this.switchCosmosInnerTab('route');
        this.deps.cosmosRouteUi.focus(node);
        this.renderCosmosAtlas();
    }

    boot() {
        this.installCosmosAtlas();
        if (this.deps.game && this.deps.game.mapSubtab === 'map-tab-cosmos') this.activateCosmosSubtab();
    }

    switchCosmosInnerTab(tab) {
        const mastery = tab === 'mastery';
        this.deps.document.getElementById('cosmos-unified-map').style.display = mastery ? 'none' : '';
        this.deps.document.getElementById('cosmos-inner-route').style.display = mastery ? 'none' : '';
        this.deps.document.getElementById('cosmos-inner-mastery').style.display = mastery ? '' : 'none';
        this.renderCosmosAtlas();
    }

    run(commands) {
        return consumeDomainCommands(commands, {
            addLog: (...args) => this.deps.addLog(...args),
            showGameToast: (...args) => this.deps.showGameToast(...args),
            updateStaticUI: () => { if (this.active) this.deps.updateStaticUI(); },
            renderCosmosAtlas: () => this.renderCosmosAtlas()
        });
    }

    mount() {
        const doc = this.deps.document;
        const click = event => this.onClick(event);
        listenView(this, doc, 'click', click);
        for (const type of ['mouseover', 'mousemove', 'focusin', 'touchstart']) {
            listenView(this, doc, type, event => this.onTooltip(event));
        }
        for (const type of ['mouseout', 'focusout']) listenView(this, doc, type, event => this.leaveTooltip(event));
        if (doc.readyState === 'loading') listenView(this, doc, 'DOMContentLoaded', () => this.boot(), { once: true });
        else this.boot();
        listenView(this, this.deps.window, 'load', () => this.boot());
    }

    onClick(event) {
        const target = event.target?.closest?.('#map-tab-cosmos, #btn-map-tab-cosmos');
        if (!this.active || !target) return;
        if (event.target.id === 'cosmos-stone-overlay') { this.closeCosmosStoneOverlay(); return; }
        if (this.handleDirectiveClick(event)) return;
        const power = event.target.closest('[data-cosmos-power-tip]');
        if (power) { event.stopPropagation(); power.focus(); this.showPowerTooltip(event, power); return; }
        const button = event.target.closest('[data-cosmos-action]');
        if (!button || button.disabled) return;
        this.performAction(button.dataset.cosmosAction, button.dataset.cosmosValue, button);
    }

    handleDirectiveClick(event) {
        const directive = event.target.closest('[data-cosmos-directive-id]');
        if (!directive || directive.disabled) return false;
        this.run(this.directives.selectCosmosExpeditionDirective(directive.dataset.cosmosDirectiveNode, directive.dataset.cosmosDirectiveId));
        return true;
    }

    performAction(action, value, button) {
        const actions = {
            open: () => this.deps.switchMapSubtab('map-tab-cosmos'),
            'close-stones': () => this.closeCosmosStoneOverlay(),
            stones: () => this.openCosmosStoneOverlay(),
            equip: () => this.run(this.stones.equipBossStoneByGalaxy(Number(value))),
            unequip: () => this.run(this.stones.unequipBossStoneByGalaxy(Number(value))),
            inscribe: () => this.run(this.stones.applyCosmosBossRelicToStone(Number(value))),
            mastery: () => this.run(this.progress.allocateCosmosMastery(value)),
            capstone: () => this.focusCosmosCapstoneBoss(value),
            'capstone-panel': () => this.openCosmosCapstoneBossPanel(),
            challenge: () => this.challengeSelectedCosmosNode(),
            'close-detail': () => { button.closest('details').open = false; }
        };
        if (Object.hasOwn(actions, action)) actions[action]();
    }

    onTooltip(event) {
        if (!this.active || !event.target?.closest?.('#map-tab-cosmos')) return;
        const stone = event.target.closest('[data-cosmos-stone-tip]');
        if (stone && ['mouseover', 'mousemove'].includes(event.type)) {
            this.showCosmosStoneTooltip(event, Number(stone.dataset.cosmosStoneTip)); return;
        }
        const power = event.target.closest('[data-cosmos-power-tip]');
        if (!power) return;
        if (event.type === 'touchstart') event.stopPropagation();
        this.showPowerTooltip(event, power);
    }

    showPowerTooltip(event, target) {
        // The shared tooltip reads the card's data attributes, not the delegation host's.
        this.deps.showMapPowerEstimateTooltip({ currentTarget: target, clientX: event.clientX, clientY: event.clientY });
    }

    leaveTooltip(event) {
        const tip = event.target?.closest?.('[data-cosmos-stone-tip], [data-cosmos-power-tip]');
        if (!tip || !tip.closest('#map-tab-cosmos') || tip.contains(event.relatedTarget)) return;
        if (event.type === 'mouseout' && this.deps.document.activeElement === tip) return;
        this.deps.hideInfoTooltip();
    }

    dispose() {
        releaseViewEvents(this);
        this.ui.detail = null; this.ui.summary = null; this.ui.installed = false;
        this.ui.stoneOverlayOpen = false;
    }

}
