export function ensurePassiveTreeSearchSettings(ctx) {
    if (typeof ctx.deps.game !== 'undefined' && ctx.deps.game) {
        if (!ctx.deps.game.settings || typeof ctx.deps.game.settings !== 'object') ctx.deps.game.settings = {};
        if (typeof ctx.deps.game.settings.passiveTreeSearch !== 'string') ctx.deps.game.settings.passiveTreeSearch = ctx.state.passiveTreeSearch || '';
        if (typeof ctx.deps.game.settings.passiveTreeFilter !== 'string') ctx.deps.game.settings.passiveTreeFilter = ctx.state.passiveTreeFilter || 'all';
        ctx.state.passiveTreeSearch = ctx.deps.game.settings.passiveTreeSearch;
        ctx.state.passiveTreeFilter = ctx.deps.game.settings.passiveTreeFilter;
    }
    return currentSearchState(ctx);
}

export function getPassiveTreeSearchState(ctx) {
    return ensurePassiveTreeSearchSettings(ctx);
}

export function getPassiveTreeNodeSearchText(ctx, node) {
    if (!node) return '';
    let parts = [
        node.id,
        (0, ctx.deps._t)(node.title),
        (0, ctx.deps.passiveNodePresentation.getPassiveNodeDisplayName)(node),
        (0, ctx.deps.passiveNodePresentation.getPassiveEffectLabel)(node),
        (0, ctx.deps.getStatName)(node.stat)
    ];
    return parts.filter(Boolean).join(' ').toLowerCase();
}

export function getPassiveTreeNodeCategory(ctx, node) {
    let stat = node && node.stat;
    if (node && node.kind === 'void') return 'utility';
    if (['flatDmg', 'pctDmg', 'meleePctDmg', 'physPctDmg', 'aoePctDmg', 'projectilePctDmg', 'crit', 'critDmg', 'ds', 'physIgnore', 'igniteChance', 'chillChance', 'freezeChance', 'shockChance', 'poisonChance', 'bleedChance'].includes(stat)) return 'offense';
    if (['flatHp', 'pctHp', 'regen', 'leech', 'armor', 'armorPct', 'evasion', 'evasionPct', 'energyShield', 'energyShieldPct', 'energyShieldRegen', 'deflectChance', 'dr', 'blockChance', 'blockChancePct', 'resF', 'resC', 'resL', 'resAll', 'resChaos', 'ailResIgnite', 'ailResShock', 'ailResFreeze', 'ailResPoison', 'ailResBleed'].includes(stat)) return 'defense';
    if (['firePctDmg', 'coldPctDmg', 'lightPctDmg', 'chaosPctDmg', 'elementalPctDmg', 'dotPctDmg', 'resPen'].includes(stat)) return 'element';
    if (['aspd', 'move', 'suppCap', 'gemLevel', 'expGain'].includes(stat)) return 'utility';
    return 'other';
}

export function doesPassiveNodeMatchSearch(ctx, node, query) {
    let q = String(query || '').trim().toLowerCase();
    if (!q) return true;
    return q.split(/\s+/).filter(Boolean).every(token => getPassiveTreeNodeSearchText(ctx, node).includes(token));
}

export function doesPassiveNodeMatchFilter(ctx, node, filter) {
    let f = filter || 'all';
    if (f === 'all') return true;
    if (f === 'offense') return getPassiveTreeNodeCategory(ctx, node) === 'offense' || getPassiveTreeNodeCategory(ctx, node) === 'element';
    return getPassiveTreeNodeCategory(ctx, node) === f;
}

export function getPassiveNodeSearchMatch(ctx, node) {
    let state = getPassiveTreeSearchState(ctx);
    let query = String(state.search || '').trim();
    let filter = state.filter || 'all';
    let active = !!query || filter !== 'all';
    if (!active) return { active: false, matches: true, query, filter };
    if (node && typeof ctx.deps.getPassiveVisibility === 'function' && (0, ctx.deps.getPassiveVisibility)(node.id) === 'hidden') {
        return { active: true, matches: false, query, filter };
    }
    return {
        active: true,
        matches: doesPassiveNodeMatchSearch(ctx, node, query) && doesPassiveNodeMatchFilter(ctx, node, filter),
        query,
        filter
    };
}

export function setPassiveTreeSearchState(ctx, next) {
    let cur = ensurePassiveTreeSearchSettings(ctx);
    let search = nextSearchText(next, cur);
    let filter = nextSearchFilter(next, cur);
    if (!['all', 'offense', 'defense', 'element', 'utility'].includes(filter)) filter = 'all';
    ctx.state.passiveTreeSearch = search;
    ctx.state.passiveTreeFilter = filter;
    if (typeof ctx.deps.game !== 'undefined' && ctx.deps.game) {
        if (!ctx.deps.game.settings || typeof ctx.deps.game.settings !== 'object') ctx.deps.game.settings = {};
        ctx.deps.game.settings.passiveTreeSearch = ctx.state.passiveTreeSearch;
        ctx.deps.game.settings.passiveTreeFilter = ctx.state.passiveTreeFilter;
    }
    syncPassiveTreeSearchControls(ctx);
    if (typeof ctx.deps.markPassiveRenderCacheDirty === 'function') (0, ctx.deps.markPassiveRenderCacheDirty)('state');
    if (ctx.deps.document.getElementById('tab-char') && ctx.deps.document.getElementById('tab-char').classList.contains('active')) {
        (0, ctx.deps.resizePassiveTreeCanvas)(false);
        (0, ctx.deps.drawPassiveTree)();
    }
}

export function syncPassiveTreeSearchControls(ctx) {
    let state = ensurePassiveTreeSearchSettings(ctx);
    let input = ctx.deps.document.getElementById('passive-search-input');
    if (input && input.value !== state.search) input.value = state.search;
    ctx.deps.document.querySelectorAll('[data-passive-filter]').forEach(btn => {
        let active = btn.dataset.passiveFilter === state.filter;
        // 고른 필터 모양은 스킨 CSS가 그린다(예전에는 남색 판 · 파란 광택을 여기서 직접 칠했다).
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
    });
}

export function setupPassiveTreeSearchControls(ctx) {
    if (typeof ctx.deps.syncPassiveAttributePreferenceControls === 'function') (0, ctx.deps.syncPassiveAttributePreferenceControls)();
    if (ctx.state.controlsBound) {
        syncPassiveTreeSearchControls(ctx);
        return;
    }
    ctx.state.controlsBound = true;
    let input = ctx.deps.document.getElementById('passive-search-input');
    if (input) {
        input.addEventListener('input', () => setPassiveTreeSearchState(ctx, { search: input.value }));
    }
    ctx.deps.document.querySelectorAll('[data-passive-filter]').forEach(btn => {
        btn.addEventListener('click', () => setPassiveTreeSearchState(ctx, { filter: btn.dataset.passiveFilter || 'all' }));
    });
    let clear = ctx.deps.document.getElementById('passive-search-clear');
    if (clear) {
        clear.addEventListener('click', () => setPassiveTreeSearchState(ctx, { search: '', filter: 'all' }));
    }
    syncPassiveTreeSearchControls(ctx);
}

function currentSearchState(ctx) {
    return { search: ctx.state.passiveTreeSearch || '', filter: ctx.state.passiveTreeFilter || 'all' };
}

function nextSearchText(next, cur) {
    return next && next.search !== undefined ? String(next.search || '') : cur.search;
}

function nextSearchFilter(next, cur) {
    return next && next.filter !== undefined ? String(next.filter || 'all') : cur.filter;
}
