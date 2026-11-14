import { view_listed, journeyNotice, routeAction, routeKey, noticeBody, openedContents } from './content-unlock-markup.mjs';

export function announceStarterWeapon(runtime, item) {
    if (!item || (runtime.deps.game.seenTutorials || []).includes(runtime.deps.basicSkills.weaponGuide)) return;
    runtime.deps.game.unlocks.items = true;
    runtime.deps.game.noti.items = true;
    (0, runtime.deps.queueTutorialNotice)(runtime.deps.basicSkills.weaponGuide, (0, runtime.deps._t)('첫 무기 장착'),
        (0, runtime.deps._t)('[{name}] 무기를 주웠습니다.\n‘장비’에서 가방의 무기를 누르고 ‘장착’을 누르세요.\n무기를 들면 기초 스킬로 싸웁니다.', { name: (0, runtime.deps._t)(item.name) }), 'tab-items');
}

export function announceLoop(runtime) {
    if (runtime.deps.game.season === 2 && !runtime.deps.contentProgression.isUnlocked('passiveTree')) return;
    if (!runtime.deps.game.contentProgression) {
        (0, runtime.deps.queueTutorialNotice)('unlock_content_loop_' + runtime.deps.game.season, (0, runtime.deps._t)('다음 콘텐츠 선택'),
            (0, runtime.deps._t)('루프 {loop}에 도달했습니다!\n루프 이정표와 루프 패시브 트리를 루프 탭에서 확인할 수 있습니다.', { loop: runtime.deps.game.season }), 'tab-unlocks');
        return;
    }
    const added = view_listed(runtime, runtime.deps.game.season).filter(def => runtime.deps.contentProgression.kind(def) === 'paid' && !runtime.deps.contentProgression.isUnlocked(def.id)
            && runtime.deps.contentProgression.parents(def).every(id => runtime.deps.contentProgression.isUnlocked(id)));
    const paid = added.map(def => `[${(0, runtime.deps._t)(def.name)}]`);
    if (runtime.deps.contentProgression.points().complete && !added.length) return;
    const lines = [(0, runtime.deps._t)('해금 포인트 {balance}P', { balance: runtime.deps.contentProgression.balance() })];
    if (paid.length) lines.push((0, runtime.deps._t)('새 해금: {names}', { names: paid.join(', ') }));
    // 고를 것이 새로 없는 루프(7, 9)는 다음에 열리는 루프를 한 줄 미리 보인다.
    if (!added.length) {
        const ahead = runtime.deps.CONTENT_UNLOCK_CATALOG.filter(def => !def.series && def.minLoop > runtime.deps.game.season).reduce((min, def) => Math.min(min, def.minLoop), Infinity);
        if (Number.isFinite(ahead)) lines.push((0, runtime.deps._t)('루프 {loop}: {names}', { loop: ahead, names: view_listed(runtime, ahead).map(def => `[${(0, runtime.deps._t)(def.name)}]`).join(', ') }));
    }
    (0, runtime.deps.queueTutorialNotice)('unlock_content_loop_' + runtime.deps.game.season, (0, runtime.deps._t)('루프 {season}', { season: runtime.deps.game.season }), lines.join('\n'), 'tab-unlocks');
}

export function announceJourney(runtime, guideKey) {
    const guide = runtime.deps.EXPLORATION_REGIONS.guides[guideKey];
    const outside = guideKey === 'outside-chaos';
    (0, runtime.deps.queueTutorialNotice)(guide.noticeKey, guide.title, journeyNotice(runtime, guideKey), outside ? 'tab-season' : 'tab-map',
        outside ? null : { subtabId: guide.mapRoute || guideKey, atlasView: guide.atlasView });
}

export function announceOutsideChaos(runtime) {
    const key = runtime.deps.EXPLORATION_REGIONS.guides['outside-chaos'].noticeKey;
    if (runtime.deps.game.season < 10 || runtime.deps.game.chaosRealm.unlocked || runtime.deps.game.isBackgroundCalculation) return;
    if (runtime.deps.game.seenTutorials.includes(key) || runtime.deps.game.tutorialHistory.some(row => row.key === key)) return;
    if ((0, runtime.deps.hasCurrentLoopAbyssRequirementClear)(runtime.deps.game.season)) announceJourney(runtime, 'outside-chaos');
}

export function announceContent(runtime, id, inline = false) {
    const def = runtime.deps.CONTENT_UNLOCK_CATALOG.find(row => row.id === id);
    // 강화 단계(def.series)는 카드 없이 기록만 남긴다: 가방 쪽, 그루터기 보관함은 새 콘텐츠가 아니다.
    if (!def || !runtime.deps.contentProgression.isUnlocked(id) || def.series || (def.minLoop <= 1 && id !== 'tactics')) return false;
    const action = routeAction(runtime, def), route = action ? routeKey(runtime, action) : null;
    const before = runtime.deps.tutorialQueue.length;
    (0, runtime.deps.queueTutorialNotice)(`unlock_content_${id}`, def.name, noticeBody(runtime, def, route),
        action ? action.tab : null, { subtabId: route, contentId: id, inline, openLabel: (0, runtime.deps._t)('{name} 열기', { name: (0, runtime.deps._t)(def.name) }) });
    return runtime.deps.tutorialQueue.length > before;
}

export function announceOpenedSince(runtime, before) {
    openedContents(runtime).forEach(id => {
        if (before.has(id)) return;
        if (id === 'tactics' && runtime.deps.contentProgression.opening.applies(runtime.deps.game)) {
            runtime.deps.game.noti.skills = true;
            return announceContent(runtime, id, true);
        }
        announceContent(runtime, id);
    });
}

export function syncOpened(runtime) {
    const before = openedContents(runtime);
    runtime.deps.contentProgression.sync();
    announceOpenedSince(runtime, before);
    announceOutsideChaos(runtime);
}

export function announceSettledUnlocks(runtime, before) {
    announceOpenedSince(runtime, openedContents(runtime, before));
    if (!before.atlas?.unlocked && runtime.deps.game.atlas.unlocked) announceJourney(runtime, 'map-explore-worldtree');
    announceOutsideChaos(runtime);
}
