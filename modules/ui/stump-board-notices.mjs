import { stumpNumber, stumpItemName } from './stump-board-summary.mjs';

/** From checkUnlocks (foreground): grants the box on the first act-10 clear, gives the starter gift and shows the one-time
* notice. Its 따라 해보기 (tutorial-ui.js guide 'unlock_stump_box') puts the gift on the board; closing it plants them. */
export function checkStumpBoxUnlock(runtime) {
    if (runtime.deps.stumpBox.sync(runtime.deps.game, 'act10')) runtime.deps.game.noti.stump = true;
    if (!runtime.deps.game.stumpBox.acquired) return;
    const sawIntro = (runtime.deps.game.seenTutorials || []).includes('unlock_stump_box'), given = grantStumpStarter(runtime);
    grantStumpScar(runtime);
    announceStumpGraft(runtime);
    runtime.deps.stumpHarvestUi.announceUnlocks();
    runtime.deps.stumpHarvestUi.announceRecipes();
    runtime.deps.stumpHarvestUi.announceGraftJournal();
    if (sawIntro) return given.length && announceStumpStarter(runtime);
    (0, runtime.deps.queueTutorialNotice)('unlock_stump_box', (0, runtime.deps._t)('그루터기 함'),
        '액트 10 돌파 보상으로 그루터기 함과 시작 보상(씨앗 2개)을 받았습니다.\n그루터기 함에 있는 그루터기 아이템만 처치 시 경험치를 얻습니다.\n'
            + '성장 완료된 같은 색 3개가 가로나 세로로 한 줄이면 공명(+10%), 이기는 색이 맞닿으면 지는 쪽이 비활성화됩니다.', 'tab-stump',
        { quote: runtime.deps.STORY_LOOP_MILESTONES.stump });
}

/** 시작 선물은 함을 얻으면 바로 준다(2026-10-07 사용자 결정): 씨앗 둘, 지금 룬의 원소와 가장 약한 저항의 색(2026-11-04 전: 씨앗과 수액). */
export function grantStumpStarter(runtime) {
    // The stats (the weakest resistance picks the second seed) only when a starter is still owed: this runs on every map completion.
    const given = runtime.deps.stumpBox.starterOwed(runtime.deps.game) ? runtime.deps.stumpBox.grantStarter(runtime.deps.game, (0, runtime.deps.getUiPlayerStats)()) : [];
    if (!given.length) return given;
    runtime.deps.game.noti.stump = true;
    runtime.state.lastSignature = '';
    (0, runtime.deps.addLog)((0, runtime.deps._t)('🌱 그루터기 함 시작 보상: {map}', { map: given.map(runtime.deps.stumpBox.label).join(', ') }), 'loot-magic');
    return given;
}

/** The first 불씨의 흉터 comes with 포식 (loop 23, once): into storage, with a log line (the unlock notice explains it). */
export function grantStumpScar(runtime) {
    const scar = runtime.deps.stumpBox.grantScar(runtime.deps.game);
    if (!scar) return;
    runtime.deps.game.noti.stump = true;
    runtime.state.lastSignature = '';
    (0, runtime.deps.addLog)((0, runtime.deps._t)('🔥 그루터기 함: {name} 받았습니다. 그루터기 함에 배치해 깨우세요.', { name: (0, runtime.deps.withObjectParticle)((0, runtime.deps._t)(runtime.deps.STUMP_BOX_SCAR.name)) }), 'loot-unique');
}

/** 함 안내를 예전에 보고 선물은 이번에 받은 저장: 놓는 법만 따로 한 번 안내한다. */
export function announceStumpStarter(runtime) {
    (0, runtime.deps.queueTutorialNotice)('tutorial_stump_starter', (0, runtime.deps._t)('그루터기 함 시작 보상'), (0, runtime.deps._t)('씨앗 2개를 보관함에 넣었습니다.\n그루터기 함에 배치해야 처치 시 경험치를 얻습니다.'), 'tab-stump');
}

/** Once, when the reached loop opens grafting (loop 18; saves already past it see it after this update). */
export function announceStumpGraft(runtime) {
    if (!runtime.deps.stumpBox.graftOpen(runtime.deps.game) || (runtime.deps.game.seenTutorials || []).includes('unlock_stump_graft')) return;
    runtime.deps.game.noti.stump = true;
    (0, runtime.deps.queueTutorialNotice)('unlock_stump_graft', '접붙이기',
        '루프 {loop}부터 루프마다 접붙이기 점수 {points}점을 받습니다.\n그루터기 함에서 칸을 고르고 [접붙이기]로 강화합니다. n단계에 n점(최대 {maxRank}단계), 단계마다 그 칸의 효과 +{pct}%.\n마름병 포자로 한 단계씩 되돌리면 점수가 돌아옵니다.',
        'tab-stump', { bodyParams: { loop: runtime.deps.STUMP_BOX_GRAFT.startLoop, points: runtime.deps.STUMP_BOX_GRAFT.pointsPerLoop, maxRank: runtime.deps.STUMP_BOX_GRAFT.maxRank, pct: runtime.deps.STUMP_BOX_GRAFT.pctPerRank } });
}

/** A drop's log line and tone: talismans by rarity; scars and golden seeds stand out. */
export function stumpDropLog(runtime, drop) {
    const name = drop.family === 'talisman' ? `[${drop.name}]` : runtime.deps.stumpBox.label(drop);
    const rare = drop.rarity === 'unique' || drop.family === 'scar' || runtime.deps.stumpRipeningUi.isGolden(drop);
    return [(0, runtime.deps._t)('{STUMP_LOG_ICONS} 그루터기 함: {name} 획득', { STUMP_LOG_ICONS: runtime.state.STUMP_LOG_ICONS[drop.family] || (drop.golden ? '✨' : '🌱'), name }), rare ? 'loot-unique' : 'loot-magic'];
}

export function announceStumpChange(runtime, detail) {
    if (detail.drop) (0, runtime.deps.addLog)(...stumpDropLog(runtime, detail.drop));
    if (detail.overflow) (0, runtime.deps.addLog)((0, runtime.deps._t)('🧿 그루터기 함 보관함이 가득 차 부적 대신 {name} 1개를 받았습니다.', { name: (0, runtime.deps._t)(runtime.deps.ORB_DB[detail.overflow].name) }), 'loot-magic');
    if (detail.compost) (0, runtime.deps.addLog)(stumpCompostDropText(runtime, detail.compost), 'loot-magic');
    (detail.ripened || []).forEach(item => (0, runtime.deps.addLog)((0, runtime.deps._t)('{value} 그루터기 함: {item}', { value: runtime.state.STUMP_LOG_ICONS[item.family] || '🌸', item: stumpRipeName(runtime, item) }), 'loot-rare'));
    announceStumpRipened(runtime, detail.ripened || []);
    runtime.state.lastSignature = '';
}

export function stumpCompostDropText(runtime, compost) {
    const name = `${runtime.deps.STUMP_BOX_COLORS[compost.color].label} ${runtime.deps.STUMP_BOX_STAGES[compost.family].label}`;
    return compost.fed ? (0, runtime.deps._t)('🌱 그루터기 함 보관함이 가득 차 {name} 거름이 됐습니다(성장 중인 {fed}개 경험치 +{growth}).', { name: (0, runtime.deps.withSubjectParticle)(name), fed: compost.fed, growth: compost.growth })
        : (0, runtime.deps._t)('🌱 그루터기 함 보관함이 가득 찼습니다.');   // 2026-11-05 사용자: 놓친 씨앗 이름과 까닭을 길게 적지 않는다
}

/** What a ripened item now gives (resonance and graft included), for the toast. */
export function stumpRipeGain(runtime, item) {
    const gain = runtime.deps.stumpBox.yieldOf(item), value = runtime.deps.stumpBox.evaluate(runtime.deps.game).values[item.id];
    return gain && value ? gain.text.replace('{v}', stumpNumber(runtime, value)) : '';
}

export function stumpRipeName(runtime, item) {
    if (item.family === 'talisman') return (0, runtime.deps._t)('[{name}] 깨어남', { name: item.name });
    return `${stumpItemName(runtime, item)} ${item.family === 'scar' ? (0, runtime.deps._t)('깨어남') : (0, runtime.deps._t)('성장 완료')}`;
}

/** Ripening is the box's payoff: a toast (what it gives now) and a chime instead of one scrolling log line. */
export function announceStumpRipened(runtime, ripened) {
    if (!ripened.length) return;
    ripened.filter(item => item.albino).forEach(item => (0, runtime.deps.dispatchRuntimeEvent)('incident', {
        text: (0, runtime.deps._t)('{shortName} 개화{value}', { shortName: runtime.deps.stumpBox.shortName(item), value: runtime.deps.stumpBox.cellOf(runtime.deps.game, item.id) < 0 ? (0, runtime.deps._t)(', 보관함으로 이동') : '' }), tone: 'chase', chase: true
    }));
    const gain = ripened.length === 1 ? stumpRipeGain(runtime, ripened[0]) : '';
    const names = ripened.length <= 3 ? ripened.map(runtime.handlers.stumpRipeName).join(', ') : (0, runtime.deps._t)('{length}개 성장 완료', { length: ripened.length });
    const gift = runtime.deps.stumpBox.pendingGifts(runtime.deps.game).length ? ', 수확 일지 보상을 받으세요' : '', note = runtime.deps.stumpRipeningUi.ripenNote(ripened);
    if (gift) runtime.deps.game.noti.stump = true;
    (0, runtime.deps.showGameToast)(`${(0, runtime.deps._t)('그루터기 함')}: ${names}${gain ? `, ${gain}` : ''}${note ? ` (${note})` : ''}${gift}`, { tone: 'success' });
    (0, runtime.deps.playUiFeedbackSound)('success');
    runtime.deps.stumpHarvestUi.announceRecipes();
    runtime.deps.stumpHarvestUi.announceUnlocks();
}
