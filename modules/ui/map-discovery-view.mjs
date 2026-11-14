import { MAP_EXPLORE_ALARM_SUBTABS } from '../domain/map-discovery.mjs';

/** Map navigation and presentation. Discovery receipts remain domain-owned. */
export class MapDiscoveryView {
    constructor(deps, discovery, reveals) {
        this.deps = deps;
        this.discovery = discovery;
        this.reveals = reveals;
        this.active = true;
    }

    owner() {
        const owner = this.deps.game;
        this.reveals.observe(owner);
        return owner;
    }

    entryCondition(id, owner) {
        const condition = this.deps.getMapPrimaryContentEntryCondition(id, owner);
        if (id !== 'map-tab-pvp') return condition;
        if (typeof this.deps.socialCloudReady !== 'function' || !this.deps.socialCloudReady()) return '로그인 필요';
        if (typeof this.deps.getMyNickname === 'function' && !this.deps.getMyNickname()) return '닉네임 설정 필요';
        return '';
    }

    syncMapPrimaryContentTabs() {
        if (!this.active) return;
        const owner = this.owner();
        let activeUnlocked = false;
        for (const def of this.deps.MAP_PRIMARY_CONTENTS) {
            const unlocked = this.deps.isMapPrimaryContentUnlocked(owner, def.id);
            if (def.id === owner.mapSubtab) activeUnlocked = unlocked;
            this.renderPrimaryTab(owner, def, unlocked);
        }
        if (!activeUnlocked && owner.mapSubtab !== 'map-tab-zones') this.deps.switchMapSubtab('map-tab-zones');
    }

    renderPrimaryTab(owner, def, unlocked) {
        const button = this.deps.document.getElementById('btn-' + def.id);
        if (!button) return;
        button.style.display = unlocked ? '' : 'none';
        const condition = unlocked ? this.entryCondition(def.id, owner) : '';
        button.classList.toggle('map-primary-tab--entry-locked', !!condition);
        button.dataset.entryCondition = condition;
        button.setAttribute('aria-label', condition ? `${def.label}, ${condition}` : def.label);
        button.dataset.tip = condition;
        if (unlocked) this.reveals.start(owner, button, def.id);
    }

    announceMapPrimaryContentUnlocks() {
        if (!this.active) return [];
        const owner = this.owner(), unlocked = this.deps.reconcileMapPrimaryContentUnlocks(owner);
        if (!unlocked.length) return unlocked;
        owner.noti.map = true;
        for (const id of unlocked) {
            this.reveals.add(owner, id);
            const content = this.deps.CONTENT_UNLOCK_CATALOG.find(row => row.routes?.[0] === id);
            if (content) this.deps.contentUnlockUi.announceContent(content.id);
        }
        this.syncMapPrimaryContentTabs();
        return unlocked;
    }

    switchMapExploreSubtab(subtabId) {
        if (!this.active || !this.deps.contentProgression.canOpen(subtabId)) return;
        const owner = this.owner(), document = this.deps.document, fallback = 'map-explore-atlas';
        const panel = document.getElementById(subtabId) || document.getElementById(fallback);
        const activeId = panel ? panel.id : fallback;
        if (activeId === owner.mapExploreSubtab && this.deps.isSelectedSubtab(activeId)) return;
        owner.mapExploreSubtab = activeId;
        document.querySelectorAll('#map-tab-zones .vertical-tab-panel').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('#map-tab-zones .vertical-tab-btn').forEach(el => el.classList.remove('active'));
        if (panel) panel.classList.add('active');
        const button = document.getElementById('btn-' + activeId);
        if (button) button.classList.add('active');
        this.discovery.clear(owner, activeId);
        this.renderMapExploreNotiDots();
        this.renderDestination(activeId);
        this.deps.renderMobileMapNavigation();
        this.deps.explorationAtlasUi.render();
    }

    renderDestination(id) {
        if (id === 'map-explore-beehive') this.deps.renderLoop8BeehivePanel(true);
        if (id === 'map-explore-colony') this.deps.renderLoop15ColonyPanel();
        if (id === 'map-explore-beyond') this.deps.renderBeyondBoundaryPanel();
        if (id === 'map-explore-worldtree') this.deps.atlasUi.render();
    }

    detectNewMapUnlockAlarms() {
        if (this.active) this.discovery.detect(this.owner());
    }

    acknowledgeMapMainAlarm() {
        if (this.active) this.discovery.acknowledge(this.owner());
    }

    renderMapExploreNotiDots() {
        if (!this.active) return;
        const owner = this.owner();
        if (!owner.mapAlarmSeen || typeof owner.mapAlarmSeen !== 'object') return;
        const signatures = this.discovery.signatures(owner);
        for (const key of MAP_EXPLORE_ALARM_SUBTABS) {
            const dot = this.deps.document.getElementById('noti-' + key);
            if (!dot) continue;
            const seen = owner.mapAlarmSeen[key];
            dot.style.display = seen !== undefined && signatures[key] > seen ? 'block' : 'none';
        }
    }

    isMapExploreSubtabOpenable(id) {
        const button = this.deps.document.getElementById('btn-' + id);
        return !!button && button.style.display !== 'none';
    }

    alarmSource(owner) {
        if (this.deps.getAvailableActRewardZoneIds().length > 0) return 'map-explore-atlas';
        const source = this.discovery.unseen(owner).find(id => this.isMapExploreSubtabOpenable(id)) || null;
        return source === 'map-explore-hunting' ? 'map-explore-atlas' : source;
    }

    focusMapAlarmSourceSubtab() {
        if (!this.active) return;
        const owner = this.owner();
        if (!(owner.noti && owner.noti.map && this.deps.isNotiEnabled('map'))) return;
        const source = this.alarmSource(owner);
        if (!source) return;
        owner.mapSubtab = 'map-tab-zones';
        owner.mapExploreSubtab = source;
        if (source === 'map-explore-atlas') this.deps.worldMapUi.pickAct(this.deps.getAvailableActRewardZoneIds()[0] ?? Math.floor(Number(owner.maxZoneId) || 0));
    }

    setExploreSubtabAvailable(id, available) {
        if (!this.active) return;
        const button = this.deps.document.getElementById('btn-' + id);
        if (button) button.style.display = available ? '' : 'none';
        if (!available && this.owner().mapExploreSubtab === id) this.switchMapExploreSubtab('map-explore-atlas');
    }

    dispose() {
        this.active = false;
        this.reveals.reset();
    }
}
