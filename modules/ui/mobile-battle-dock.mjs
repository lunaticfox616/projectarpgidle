const MAP_CONTEXTS = [
    ['atlas', 'map-explore-worldtree'], ['labyrinth', 'map-explore-labyrinth'], ['chaosRealm', 'map-tab-chaos-realm'],
    ['sky', 'map-tab-sky'], ['colony', 'map-explore-colony'], ['beehive', 'map-explore-beehive'],
    ['timerift', 'map-explore-timerift'], ['underworld', 'map-tab-underworld']
];

export function setBattlePreviewCollapsed(deps, host, collapsed) {
    host.classList.toggle('is-collapsed', collapsed);
    const toggle = host.querySelector('[data-pip-toggle]');
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', deps._t(collapsed ? '작은 전투 화면 펼치기' : '작은 전투 화면 접기'));
    toggle.textContent = collapsed ? deps._t('전투 보기') : deps._t('접기');
}

function syncContext(deps, host, context) {
    if ((host.dataset.compactContext || '') !== context) {
        if (host.hasAttribute('data-context-collapsed')) {
            setBattlePreviewCollapsed(deps, host, host.dataset.contextCollapsed === 'true');
            delete host.dataset.contextCollapsed;
        }
        if (context) {
            host.dataset.contextCollapsed = String(host.classList.contains('is-collapsed'));
            setBattlePreviewCollapsed(deps, host, true);
        }
        host.dataset.compactContext = context;
    }
    for (const [name, id] of MAP_CONTEXTS) {
        const panel = deps.document.getElementById(id);
        if (!panel) continue;
        const hasPip = context === name && deps.game.settings.showMobileBattlePip !== false;
        panel.classList.toggle('has-battle-pip', hasPip);
        panel.classList.toggle('is-pip-expanded', hasPip && !host.classList.contains('is-collapsed'));
    }
}

function itemTarget(document) {
    if (!document.querySelector('#tab-items.active')) return { context: '', anchor: null };
    const toggle = document.querySelector('#tab-items.active #item-tab-equip.active .eqw-mini-toggle');
    return { context: 'items', anchor: toggle && toggle.offsetParent ? toggle.closest('.eqw-summary-card') : null };
}

function dockTarget(deps) {
    const document = deps.document;
    if (!deps.display.matches('(max-width: 1080px)')) return { context: '', anchor: null };
    if (document.querySelector('#tab-guide.active')) return { context: 'guide', anchor: null };
    const workshop = document.querySelector('#tab-map.active #map-tab-fishing.active #fishing-workshop[data-mobile-selected="true"] #fishing-battle-preview');
    if (workshop) return { context: 'fishing', anchor: workshop };
    const title = deps.display.matches('(orientation: landscape) and (max-height: 600px)')
        ? document.querySelector('#tab-char.active .merged-tab-shell:not(:has(> .window-tab-strip:not([hidden]))) .h2-right') : null;
    if (title) return { context: 'tree', anchor: title };
    const map = MAP_CONTEXTS.find(([, id]) => document.querySelector(`#tab-map.active #${id}.active`));
    return map ? { context: map[0], anchor: null } : itemTarget(document);
}

/** Dense views borrow the folded state; leaving restores the player's previous choice. */
export function dockBattlePreview(deps, host) {
    const dock = dockTarget(deps);
    syncContext(deps, host, dock.context);
    const docked = !!dock.anchor && (dock.context === 'fishing' || host.classList.contains('is-collapsed'));
    host.classList.toggle('is-tree-docked', docked && dock.context === 'tree');
    host.classList.toggle('is-summary-docked', docked && dock.context === 'items');
    host.classList.toggle('is-workshop-docked', docked && dock.context === 'fishing');
    const parent = docked ? dock.anchor : deps.document.body;
    if (host.parentElement !== parent) parent.appendChild(host);
}
