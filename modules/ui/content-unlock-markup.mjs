export function view_art(runtime, def) { return 'assets/' + (def.art || 'ui/currency/sap-bud.png'); }

export function view_listed(runtime, loop) { return runtime.deps.CONTENT_UNLOCK_CATALOG.filter(row => row.minLoop === loop && !row.series); }

export function roadmapAdditions(runtime, loop) {
    return (runtime.deps.SEASON_CONTENT_ROADMAP[loop]?.features || []).filter(text => /심화:|그루터기 함|아틀라스:|야생 부적|전환점:|전술 조건|버려진 날붙이|최종 관문|세계수 껍질/.test(text));
}

export function entryReward(runtime, def, status) {
    const text = def.rewardText;
    const reward = !status.unlocked && text ? `<p class="unlock-reward">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(text))}</p>` : '';
    const picker = !status.unlocked && def.rewardChoices?.length > 1 ? `<label class="content-unlock-choice">${(0, runtime.deps._t)('첫 보상')}<select data-unlock-reward="${def.id}" aria-label="${(0, runtime.deps._t)('{name} 첫 보상', { name: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(def.name)) })}">${def.rewardChoices.map(row => `<option value="${row.key}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.label))}</option>`).join('')}</select></label>` : '';
    return reward + picker;
}

export function lockAttribute(runtime, id) {
    return runtime.deps.contentProgression.isUnlocked(id) ? '' : 'data-content-locked';
}

export function routeAction(runtime, def) {
    if (def.action) return def.action;
    const route = def.routes?.[0];
    if (!route) return null;
    if (route.startsWith('item-tab-')) return { tab:'tab-items', subtab:route };
    if (route.startsWith('skill-tab-')) return { tab:'tab-skills', skillSubtab:route };
    if (route.startsWith('map-explore-')) return { tab:'tab-map', mapSubtab:'map-tab-zones', explore:route };
    if (route.startsWith('map-tab-')) return { tab:'tab-map', mapSubtab:route };
    if (route.startsWith('tab-')) return { tab:route };
    return null;
}

export function routeKey(runtime, action) {
    const map = action.mapSubtab && action.mapSubtab !== 'map-tab-zones' ? action.mapSubtab : null;
    return action.explore || action.subtab || action.skillSubtab || map || action.tab;
}

export function journeyPath(runtime, route) {
    const guide = runtime.deps.EXPLORATION_REGIONS.guides[route];
    return guide ? guide.path.split(' → ').map(step => (0, runtime.deps._t)(step)).join(' → ') : '';
}

export function journeyNotice(runtime, route) {
    const guide = runtime.deps.EXPLORATION_REGIONS.guides[route];
    const line = guide.notice || guide.reward;
    return [(0, runtime.deps._t)(line), (0, runtime.deps._t)('입장 경로 · {path}', { path: journeyPath(runtime, route) })].join('\n');
}

export function noticeContentId(runtime, notice) {
    return notice.contentId || (notice.key?.startsWith('unlock_content_') ? notice.key.slice('unlock_content_'.length) : '');
}

export function journeyForNotice(runtime, notice) {
    const id = noticeContentId(runtime, notice);
    const def = id && runtime.deps.CONTENT_UNLOCK_CATALOG.find(row => row.id === id);
    if (!def) return Object.keys(runtime.deps.EXPLORATION_REGIONS.guides).find(key => runtime.deps.EXPLORATION_REGIONS.guides[key].noticeKey === notice.key);
    const action = routeAction(runtime, def);
    return action && (def.action?.guide || routeKey(runtime, action));
}

export function noticeBody(runtime, def, route) {
    const guideKey = def.action?.guide || route;
    if (runtime.deps.EXPLORATION_REGIONS.guides[guideKey]) return journeyNotice(runtime, guideKey);
    const path = runtime.state.CONTENT_ROUTE_PATHS[route];
    return path ? (0, runtime.deps._t)('{description}\n‘{path}’에 있습니다.', { description: (0, runtime.deps._t)(def.description), path: (0, runtime.deps._t)(path) }) : def.description;
}

export function canOpenProgressTarget(runtime, route) {
    if (route === 'outside-chaos') return runtime.deps.game.season >= 10 && runtime.deps.contentProgression.canOpen('tab-season');
    if (route === 'map-explore-chaos') return runtime.deps.contentProgression.canOpen('tab-map');
    return runtime.deps.explorationAtlasUi.available(route);
}

export function progressButton(runtime, route, label) {
    if (!route || !canOpenProgressTarget(runtime, route)) return '';
    return `<button type="button" data-progress-target="${(0, runtime.deps.escapeHTML)(route)}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(label))}</button>`;
}

export function openedContents(runtime, owner = runtime.deps.game) {
    return new Set(owner.contentProgression?.automatic || []);
}
