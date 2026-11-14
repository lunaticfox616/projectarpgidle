/** 기본 스킬트리 초기화를 지금 못 하는 까닭('' 이면 된다): 방치 전투 정산(끝나면 game이 바뀌어 초기화가 사라진다), 나무꾼 전투,
* 황금률, 찍은 노드. */
export function getPassiveTreeResetBlockReason(ctx) {
    const replay = ctx.deps.shopView.busyReason();
    if (replay) return replay;
    if (ctx.deps.game.woodsmanBuildLock) return '☠️ 나무꾼 전투 중에는 스킬트리를 초기화할 수 없습니다.';
    if ((ctx.deps.game.currencies.goldenRule || 0) < 1) return '황금률이 부족합니다.';
    return (0, ctx.deps.getPaidPassiveNodeIds)(ctx.deps.game.passives).length > 0 ? '' : '초기화할 스킬트리 노드가 없습니다.';
}

/** 기본 스킬트리 초기화(스킬트리 머리의 단추, 2026-10-22 거래소 특수 서비스에서 옮김): 황금률 1개로 기본 트리에 찍은 점수를 모두
* 돌려받는다. 루프 패시브, 심화 패시브와 전직은 그대로다. 직업 시작점은 소유 목록에 넣지 않아도 늘 무료 연결점이다. */
export async function resetPassiveTreeByGoldenRule(ctx) {
    const button = ctx.deps.document.getElementById('btn-passive-tree-reset');
    if (button && button.disabled) return;
    const blocked = getPassiveTreeResetBlockReason(ctx);
    if (blocked) return (0, ctx.deps.addLog)(blocked, 'attack-monster');
    const owner = ctx.deps.game, spentNodes = (0, ctx.deps.getPaidPassiveNodeIds)(ctx.deps.game.passives).length, before = ctx.deps.game.passives.join('|');
    // 확인 창이 열린 동안 단추를 잠가 두 번째 확인 창이 줄 서지 않게 한다. 기다리는 사이 방치 정산이나 저장 불러오기가 game을
    // 바꿀 수 있어, 확인 뒤에는 같은 game인지부터 다시 본다.
    if (button) button.disabled = true;
    let accepted = false;
    try {
        accepted = await (0, ctx.deps.requestGameConfirmation)(`황금률 1개로 기본 스킬트리를 초기화하고 ${spentNodes}점을 돌려받습니다.\n루프 패시브, 심화 패시브와 전직은 그대로입니다.`, {
            title: (0, ctx.deps._t)('스킬트리 초기화'),
            tone: 'danger',
            confirmLabel: (0, ctx.deps._t)('초기화')
        });
    } finally {
        if (button) button.disabled = false;
    }
    if (!accepted) return;
    if (ctx.deps.game !== owner || getPassiveTreeResetBlockReason(ctx) || ctx.deps.game.passives.join('|') !== before) {
        return (0, ctx.deps.addLog)((0, ctx.deps._t)('확인하는 사이 게임 상태, 스킬트리나 재화가 바뀌어 초기화를 취소했습니다.'), 'attack-monster');
    }
    ctx.deps.game.currencies.goldenRule -= 1;
    const grantedPoints = ctx.deps.passiveRouting.paleBonus(ctx.deps.game);
    const hadOverflowKeystone = (0, ctx.deps.hasAuthoredPassiveKeystone)('의지의 공명');
    ctx.deps.game.passives = [];
    ctx.deps.game.passiveAttributeChoices = {};
    ctx.deps.game.passivePoints = Math.max(0, ctx.deps.game.passivePoints + spentNodes - grantedPoints);
    (0, ctx.deps.calculateReachableNodes)();
    (0, ctx.deps.refreshPassiveVisibility)();
    (0, ctx.deps.normalizeSupportLoadout)(true, null, hadOverflowKeystone);
    (0, ctx.deps.addLog)((0, ctx.deps._t)('🧠 스킬트리 초기화: {spentNodes}점을 돌려받았습니다.', { spentNodes }), 'season-up');
    (0, ctx.deps.updateStaticUI)();
}

export function renderPassiveTreePlannerPanel(ctx) {
    let host = ctx.deps.document.getElementById('passive-tree-planner');
    if (!host || typeof ctx.deps.ensurePassiveTreePlannerState !== 'function') return;
    let planner = (0, ctx.deps.ensurePassiveTreePlannerState)();
    let active = planner.presets[planner.activeSlot];
    let owned = new Set(ctx.deps.game.passives || []);
    let completed = countPresetCompleted(active, owned);
    let signature = JSON.stringify([planner.activeSlot, planner.autoInvest, ctx.deps.game.settings.passiveTreeShowLabels !== false,
        completed, planner.presets.map(preset => preset ? [preset.name, preset.nodeIds.length] : null)]);
    if (host.dataset.plannerSignature === signature) return;
    let options = planner.presets.map((preset, index) => {
        let label = preset ? `${index + 1}. ${preset.name} (${preset.nodeIds.length})` : (0, ctx.deps._t)('{value}. 빈 프리셋', { value: index + 1 });
        return `<option value="${index}" ${index === planner.activeSlot ? 'selected' : ''}>${(0, ctx.deps.escapeHTML)(label)}</option>`;
    }).join('');
    host.innerHTML = `
        <div class="passive-planner-row passive-planner-primary">
            <strong>${(0, ctx.deps._t)('트리 프리셋')}</strong>
            <select id="passive-preset-slot" onchange="selectPassiveTreePresetSlot(this.value)">${options}</select>
            <input id="passive-preset-name" class="passive-preset-name" type="text" maxlength="24" value="${(0, ctx.deps.escapeHTML)(active ? active.name : (0, ctx.deps._t)('프리셋 {value}', { value: planner.activeSlot + 1 }))}" aria-label="${(0, ctx.deps._t)('프리셋 이름')}">
            <button type="button" onclick="savePassiveTreePresetFromUi()">${(0, ctx.deps._t)('현재 트리 저장')}</button>
            <label class="passive-planner-toggle"><input type="checkbox" ${planner.autoInvest ? 'checked' : ''} onchange="togglePassiveTreeAutoInvest(this.checked)"> ${(0, ctx.deps._t)('환생 후 자동 투자')}</label>
            <label class="passive-planner-toggle"><input type="checkbox" ${ctx.deps.game.settings.passiveTreeShowLabels === true ? 'checked' : ''} onchange="togglePassiveTreeLabels(this.checked)"> ${(0, ctx.deps._t)('상시 문구')}</label>
            <span class="passive-planner-progress">${active ? (0, ctx.deps._t)('{completed}/{length} 투자', { completed, length: active.nodeIds.length }) : (0, ctx.deps._t)('저장된 경로 없음')}</span>
        </div>
        <div class="passive-planner-row passive-planner-share">
            <input id="passive-preset-code" type="text" placeholder="${(0, ctx.deps._t)('공유 코드를 붙여넣으세요')}" autocomplete="off">
            <button type="button" onclick="copyPassiveTreePresetCode()" ${active ? '' : 'disabled'}>${(0, ctx.deps._t)('공유 코드 복사')}</button>
            <button type="button" onclick="importPassiveTreePresetFromUi()">${(0, ctx.deps._t)('코드 불러오기')}</button>
        </div>`;
    host.dataset.plannerSignature = signature;
}

export function selectPassiveTreePresetSlot(ctx, slotIndex) {
    if ((0, ctx.deps.setActivePassiveTreePreset)(slotIndex)) renderPassiveTreePlannerPanel(ctx);
}

export function savePassiveTreePresetFromUi(ctx) {
    let planner = (0, ctx.deps.ensurePassiveTreePlannerState)();
    let allocated = (ctx.deps.game.passives || []).filter(id => ctx.deps.PASSIVE_TREE.nodes[id] && ctx.deps.PASSIVE_TREE.nodes[id].kind !== 'start');
    if (allocated.length === 0) return (0, ctx.deps.addLog)((0, ctx.deps._t)('저장할 패시브 경로가 없습니다.'), 'attack-monster');
    let nameInput = ctx.deps.document.getElementById('passive-preset-name');
    let name = nameInput && nameInput.value.trim() ? nameInput.value.trim() : (0, ctx.deps._t)('프리셋 {value}', { value: planner.activeSlot + 1 });
    let preset = (0, ctx.deps.saveCurrentPassiveTreePreset)(planner.activeSlot, name);
    (0, ctx.deps.addLog)((0, ctx.deps._t)('🧭 {name}에 현재 패시브 {length}개를 저장했습니다.', { name: (0, ctx.deps._t)(preset.name), length: preset.nodeIds.length }), 'season-up');
    renderPassiveTreePlannerPanel(ctx);
}

export function togglePassiveTreeAutoInvest(ctx, enabled) {
    (0, ctx.deps.setPassiveTreeAutoInvest)(enabled);
    let result = enabled ? (0, ctx.deps.runPassiveTreeAutoInvest)() : { nodes: 0 };
    if (result.nodes > 0) (0, ctx.deps.addLog)((0, ctx.deps._t)('🧭 프리셋 자동 투자: {nodes}개 노드 활성화', { nodes: result.nodes }), 'season-up');
    (0, ctx.deps.updateStaticUI)();
}

export function togglePassiveTreeLabels(ctx, enabled) {
    ctx.deps.game.settings.passiveTreeShowLabels = !!enabled;
    if (typeof ctx.deps.markPassiveRenderCacheDirty === 'function') (0, ctx.deps.markPassiveRenderCacheDirty)('labels');
    (0, ctx.deps.drawPassiveTree)();
}

export async function copyPassiveTreePresetCode(ctx) {
    let planner = (0, ctx.deps.ensurePassiveTreePlannerState)();
    let code = (0, ctx.deps.encodePassiveTreePreset)(planner.activeSlot);
    let input = ctx.deps.document.getElementById('passive-preset-code');
    if (!code || !input) return;
    input.value = code;
    input.select();
    try {
        if (ctx.deps.navigator.clipboard && ctx.deps.navigator.clipboard.writeText) await ctx.deps.navigator.clipboard.writeText(code);
        else if (ctx.deps.document.execCommand) ctx.deps.document.execCommand('copy');
        (0, ctx.deps.addLog)((0, ctx.deps._t)('📋 패시브 트리 공유 코드를 복사했습니다.'), 'loot-magic');
    } catch {
        (0, ctx.deps.addLog)((0, ctx.deps._t)('공유 코드를 입력칸에 만들었습니다. 직접 복사해 주세요.'), 'attack-monster');
    }
}

export function importPassiveTreePresetFromUi(ctx) {
    let planner = (0, ctx.deps.ensurePassiveTreePlannerState)();
    let input = ctx.deps.document.getElementById('passive-preset-code');
    try {
        let preset = (0, ctx.deps.importPassiveTreePreset)(planner.activeSlot, input ? input.value : '');
        (0, ctx.deps.addLog)((0, ctx.deps._t)('🧭 공유 프리셋 [{name}]{particle} 불러왔습니다.', { name: (0, ctx.deps._t)(preset.name), particle: (0, ctx.deps.pickParticle)(preset.name, '을', '를') }), 'season-up');
        renderPassiveTreePlannerPanel(ctx);
    } catch (error) {
        (0, ctx.deps.addLog)((0, ctx.deps._t)('프리셋을 불러오지 못했습니다: {message}', { message: error.message }), 'attack-monster');
    }
}

function countPresetCompleted(active, owned) {
    return active ? active.nodeIds.filter(id => owned.has(id)).length : 0;
}
