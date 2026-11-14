export function unlockRewardText(runtime) {
    const points = runtime.deps.contentProgression.points();
    // 넘치는 해금 포인트는 그루터기 함 접붙이기 점수가 된다(contentProgression.overflow, js/stump-box.js graftEarned).
    const overflow = (0, runtime.deps._t)('넘치는 해금 포인트는 루프마다 그루터기 함 접붙이기 점수 +{n}가 됩니다.', { n: runtime.deps.CONTENT_UNLOCK_POINT_AWARDS.perLoop });
    if (points.complete) return `${(0, runtime.deps._t)('전체 해금 완료.')} ${overflow}`;
    if (!points.nextAward) return `${(0, runtime.deps._t)('남은 해금에 필요한 포인트를 모두 모았습니다.')} ${overflow}`;
    return (0, runtime.deps._t)('해금 포인트 +{n}', { n: points.nextAward });
}

export function summaryHtml(runtime, preservation = firstPreservationHtml(runtime)) {
    const loop = runtime.deps.game.season || 1;
    const record = runtime.deps.game.records && runtime.deps.game.records.currentLoop;
    const time = record ? (0, runtime.deps.formatRecordDuration)(record.activeMs) : (0, runtime.deps._t)('기록 없음');
    return `<section class="loop-settlement-story" data-loop-section="1">${storyHtml(runtime)}</section>
            <section class="loop-settlement-result" data-loop-section="2"><h2 aria-label="${(0, runtime.deps._t)('루프 {n} 달성', { n: loop + 1 })}">${(0, runtime.deps._t)('루프')} <span class="loop-settlement-count${runtime.state.rolledLoop === loop ? ' is-rolled' : ''}" data-loop-count aria-hidden="true"><span><b>${loop}</b><b>${loop + 1}</b></span></span> ${(0, runtime.deps._t)('달성')}</h2>
            <dl class="loop-settlement-stats"><div><dt>${(0, runtime.deps._t)('도달 레벨')}</dt><dd>${runtime.deps.game.level}</dd></div><div><dt>${(0, runtime.deps._t)('처치')}</dt><dd>${Number(runtime.deps.game.loopKills || 0).toLocaleString()}</dd></div><div><dt>${(0, runtime.deps._t)('활동 시간')}</dt><dd>${time}</dd></div></dl>${runtime.deps.worldTreeBarkUi.barkSettlementHtml()}
            <div class="loop-settlement-next"><ul>${nextLoopLines(runtime, loop).map(row => `<li class="is-${row.kind}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.text)).replace(/\+\d+/g, gain => `<b>${gain}</b>`)}</li>`).join('')}</ul></div>
            <p class="loop-settlement-reset">${(0, runtime.deps._t)('루프 시 레벨, 장비 및 재화를 포함한 대부분의 진행도가 초기화됩니다.')}</p>${preservation}</section>
            <section class="loop-settlement-controls" data-loop-section="3">${stallWarningHtml(runtime)}${runtime.deps.loopAutomationUi.controlsHtml()}</section>
            <button type="button" class="loop-settlement-continue" data-loop-continue>${(0, runtime.deps._t)('눌러서 계속')}</button>`;
}

export function firstPreservationHtml(runtime) {
    if (runtime.deps.game.season !== 1) return '';
    const gear = [...Object.values(runtime.deps.game.equipment), ...runtime.deps.game.inventory, ...(runtime.deps.game.equipmentTemporaryStorage || [])]
        .filter(item => item && !runtime.deps.bagItems.isSpecial(item));
    const gearKept = gear.filter(item => item.loopSealed).length;
    const box = runtime.deps.game.stumpBox;
    const stumpKept = box?.sealed.filter(cell => box.board[cell] != null).length || 0;
    const lines = [(0, runtime.deps._t)('장비 {kept}개 유지 · 미봉인 장비 {lost}개 초기화', { kept: gearKept, lost: gear.length - gearKept })];
    if (runtime.deps.game.currencies.ouroboros > 0) lines.push((0, runtime.deps._t)('장비를 가져가려면 장비 정리에서 나무꾼의 손길로 봉인하세요.'));
    if (box?.acquired) {
        lines.push((0, runtime.deps._t)('그루터기 함 {kept}개 유지 · 봉인 칸 밖 {lost}개 초기화', { kept: stumpKept, lost: box.items.length - stumpKept }));
        lines.push((0, runtime.deps._t)(runtime.deps.stumpBox.sealLimit(runtime.deps.game) ? '가져갈 그루터기 아이템을 봉인 칸에 놓으세요.' : '그루터기 함의 봉인 칸은 아직 열리지 않았습니다.'));
    }
    return `<aside class="loop-settlement-preservation"><strong>${(0, runtime.deps._t)('다음 루프에 가져갈 것')}</strong>
            <ul>${lines.map(line => `<li>${(0, runtime.deps.escapeHTML)(line)}</li>`).join('')}</ul></aside>`;
}

export function nextLoopLines(runtime, loop) {
    const roadmap = runtime.deps.game.contentProgression ? milestoneLines(runtime, loop + 1)
        : (runtime.deps.SEASON_CONTENT_ROADMAP[loop + 1] || { features: ['심화 도전을 이어갑니다.'] }).features.filter(text => !runtime.state.LOOP_STUMP_ROADMAP_LINE.test(text)).map(text => (0, runtime.deps._t)(text));
    return [
        { kind: 'unlock', text: runtime.deps.game.contentProgression ? unlockRewardText(runtime) : '' },
        { kind: 'stump', text: stumpCellLine(runtime) },
        { kind: 'loop', text: `${(0, runtime.deps._t)('루프 포인트 +1')}${loopPointLockText(runtime)}` },
        { kind: 'loop', text: runtime.deps.worldTreeBark.nextLoopBarkLine(loop + 1) },
        ...roadmap.map(text => ({ kind: 'road', text })),
        ...runtime.deps.loopMutationUi.nextLoopLines(loop + 1).map(text => ({ kind: 'mutation', text }))
    ].filter(row => row.text);
}

export function stumpCellLine(runtime) {
    const now = runtime.deps.stumpBox.openCount(runtime.deps.game), next = runtime.deps.stumpBox.openCount({ ...runtime.deps.game, season: (runtime.deps.game.season || 1) + 1 });
    return next > now ? (0, runtime.deps._t)('그루터기 함 슬롯 +{gain} (현재 {now}칸)', { gain: next - now, now }) : '';
}

export function loopPointLockText(runtime) {
    return runtime.deps.game.contentProgression && !runtime.deps.contentProgression.isUnlocked('loopTree') ? ` ${(0, runtime.deps._t)('(해금 후 사용 가능)')}` : '';
}

export function storyHtml(runtime) {
    return `<p>${runtime.deps.STORY_LOOP_MILESTONES.default.narration.map(line => (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(line))).join('<br>')}</p>`;
}

export function milestoneLines(runtime, next) {
    return runtime.deps.contentUnlockUi.roadmapAdditions(next).filter(text => !runtime.state.LOOP_STUMP_ROADMAP_LINE.test(text));
}

export function resetButtonAttr(runtime, ready) {
    return ready && !(0, runtime.deps.getHeldGearLoopBlockReason)() ? '' : 'disabled';
}

export function stallWarningHtml(runtime) {
    const reason = (0, runtime.deps.getHeldGearLoopBlockReason)();
    return reason ? `<p class="loop-settlement-warning" role="alert">${(0, runtime.deps.escapeHTML)(reason)}</p>` : '';
}
