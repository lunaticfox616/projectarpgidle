import { renderGemUpgradeButton } from './skill-library-actions.mjs';
function syncEnhanceTabButton(runtime, button, open) {
    if (!button) return;
    button.disabled = !open;
    button.style.opacity = open ? '1' : '0.45';
    button.dataset.tip = open ? '' : runtime.deps._t('해금 탭에서 룬 강화를 해금하세요.');
}
export function renderSkillEnhancement(runtime, pStats) {
    let gemEnhanceOpen = !!runtime.deps.game.gemEnhanceUnlocked;
    let gemEnhanceHeader = runtime.deps.document.getElementById('ui-gem-enhance-header');
    let gemEnhancePanel = runtime.deps.document.getElementById('ui-gem-enhance-panel');
    let skillEnhanceBtn = runtime.deps.document.getElementById('btn-skill-tab-enhance');
    if (gemEnhanceHeader && gemEnhancePanel) {
        gemEnhanceHeader.style.display = gemEnhanceOpen ? '' : 'none';
        gemEnhancePanel.style.display = gemEnhanceOpen ? '' : 'none';
        syncEnhanceTabButton(runtime, skillEnhanceBtn, gemEnhanceOpen);
        if (!gemEnhanceOpen && runtime.deps.game.skillSubtab === 'skill-tab-enhance') runtime.deps.game.skillSubtab = 'skill-tab-equip';
        if (gemEnhanceOpen) { renderEnhancementDetails(runtime, pStats); }
    }
}
function renderEnhancementDetails(runtime, pStats) {
    const view = { pStats };
    readEnhanceTarget(runtime, view);
    readEnhanceRecord(runtime, view);
    readEnhanceAwakening(runtime, view);
    readEnhanceSlot(runtime, view);
    readEnhanceSkyPower(runtime, view);
    readEnhanceCompletion(runtime, view);
    readEnhancePresentation(runtime, view);
    renderEnhanceTarget(runtime, view);
    renderEnhanceCore(runtime, view);
    renderEnhanceUpgrades(runtime, view);
    renderEnhanceOptions(runtime, view);
}
function readEnhanceTarget(runtime, view) {
    const { pStats } = view;
    let active = (typeof runtime.deps.getGemEnhanceTargetSkill === 'function') ? (0, runtime.deps.getGemEnhanceTargetSkill)() : runtime.deps.game.activeSkill;
    let equippedEnhanceTargets = typeof runtime.deps.getEquippedEnhanceableGemNames === 'function' ? (0, runtime.deps.getEquippedEnhanceableGemNames)() : [];
    if ((!active || !equippedEnhanceTargets.includes(active)) && equippedEnhanceTargets.length > 0) active = equippedEnhanceTargets[0];
    let targetButtons = equippedEnhanceTargets.map(name => (0, runtime.deps.renderGemEnhanceTargetCard)(name, name === active, pStats)).join('');
    let isGem = typeof runtime.deps.isEnhanceableAttackGem === 'function'
        ? (0, runtime.deps.isEnhanceableAttackGem)(active)
        : !!(runtime.deps.SKILL_DB[active] && runtime.deps.SKILL_DB[active].isGem);
    Object.assign(view, { active, equippedEnhanceTargets, targetButtons, isGem });
}

function readEnhanceRecord(runtime, view) {
    const { isGem, active } = view;
    let activeSlots = isGem && typeof runtime.deps.getSkyEnhancementSlotsForSkill === 'function' ? (0, runtime.deps.getSkyEnhancementSlotsForSkill)(active) : [null, null, null, null, null];
    let activeEnh = (0, runtime.deps.getSkyEnhancementForSkill)(active);
    let activeGem = isGem ? (0, runtime.deps.normalizeGemRecord)((runtime.deps.game.gemData || {})[active]) : null;
    Object.assign(view, { activeSlots, activeEnh, activeGem });
}

function readEnhanceAwakening(runtime, view) {
    const { activeGem } = view;
    let gemAwakening = runtime.deps.contentProgression.isUnlocked('gemAwakening');
    let qualityNeed = activeGem ? 1 + Math.floor((activeGem.quality || 0) / 5) : 1;
    let awakenReady = !!(activeGem && !activeGem.awakened && (activeGem.level || 1) >= 20 && gemAwakening);
    Object.assign(view, { gemAwakening, qualityNeed, awakenReady });
}

function readEnhanceSlot(runtime, view) {
    const { activeGem } = view;
    let engraveCap = activeGem ? (activeGem.skyEnhanceCap || 1) : 1;
    let selectedSlot = typeof runtime.deps.getSelectedGemEngraveSlot === 'function' ? (0, runtime.deps.getSelectedGemEngraveSlot)() : 0;
    if (selectedSlot >= engraveCap) selectedSlot = Math.max(0, engraveCap - 1);
    runtime.deps.game.gemEngraveSelectedSlot = selectedSlot;
    Object.assign(view, { engraveCap, selectedSlot });
}

function readEnhanceSkyPower(runtime, view) {
    const { isGem, active } = view;
    let permanentSkyBoost = isGem && typeof runtime.deps.getSkyTowerGemBoostLevel === 'function' ? (0, runtime.deps.getSkyTowerGemBoostLevel)(active) : 0;
    let permanentSkyCost = isGem && typeof runtime.deps.getSkyTowerGemBoostCost === 'function' ? (0, runtime.deps.getSkyTowerGemBoostCost)(active) : 0;
    let permanentSkyMax = typeof runtime.deps.getSkyTowerGemBoostMaxLevel === 'function' ? (0, runtime.deps.getSkyTowerGemBoostMaxLevel)() : 3;
    let condensedPower = (typeof runtime.deps.ensureSkyTowerState === 'function' ? (0, runtime.deps.ensureSkyTowerState)().condensedPower : 0) || 0;
    Object.assign(view, { permanentSkyBoost, permanentSkyCost, permanentSkyMax, condensedPower });
}

function readEnhanceCompletion(runtime, view) {
    const { activeGem, engraveCap, activeEnh } = view;
    let coreDone = !!(activeGem && activeGem.enhanceLevel >= runtime.deps.GEM_CORE_FORGE.maxLevel);
    let slotDone = !!(activeGem && engraveCap >= 5);
    let engraveFilled = !!(activeGem && activeEnh.length >= engraveCap);
    Object.assign(view, { coreDone, slotDone, engraveFilled });
}

function readEnhancePresentation(runtime, view) {
    const { active, isGem, pStats, activeEnh } = view;
    let activeDef = runtime.deps.SKILL_DB[active] || {};
    let activeMeta = (0, runtime.deps.getGemCardMeta)(activeDef);
    let activePresentation = isGem ? (0, runtime.deps.getUiGemPresentation)(active, false, pStats) : null;
    let growthSummary = isGem ? (0, runtime.deps.getGemGrowthSummaryHtml)(active, activePresentation) : '';
    let activeOptions = activeEnh.map(id => runtime.deps.GEM_SKY_ENHANCEMENTS[id] ? runtime.deps.GEM_SKY_ENHANCEMENTS[id].name : id).join(', ') || '적용된 각인 없음';
    Object.assign(view, { activeDef, activeMeta, activePresentation, growthSummary, activeOptions });
}

function renderEnhanceTarget(runtime, view) {
    const { targetButtons, isGem, activeMeta, active, activeDef, growthSummary, coreDone, activeGem, slotDone, engraveCap, engraveFilled, activeEnh, activeOptions } = view;
    (0, runtime.deps.writeHtmlIfChanged)(runtime.deps.document.getElementById('ui-gem-enhance-target'), `<div class="gem-target-list">${targetButtons || (0, runtime.deps._t)('<span class="gem-process-empty">기본 공격은 강화할 수 없습니다. 공격 룬을 장착하면 여기서 키웁니다.</span>')}</div>` + (isGem
                ? `<div class="gem-target-profile element-${activeMeta.className}">${(0, runtime.deps.renderSkillGemArt)(active, 'gem-target-profile-icon', { eager: true })}<div><small class="gem-target-kicker">${(0, runtime.deps._t)('현재 선택')}<i>${activeMeta.elementLabel}</i><i>${activeMeta.typeLabel}</i></small><strong>${(0, runtime.deps.escapeHTML)(active)}</strong><p>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(activeDef.desc) || '')}</p></div></div>${growthSummary}<div class="gem-enhance-status"><span class="gem-status-chip ${coreDone ? 'done' : ''}">${coreDone ? (0, runtime.deps._t)('룬 강화 완료') : (0, runtime.deps._t)('룬 강화 +{enhanceLevel}', { enhanceLevel: activeGem.enhanceLevel })}</span><span ${runtime.deps.contentUnlockUi.lockAttribute('engraving')} class="gem-status-chip gem-engrave-status ${slotDone ? 'done' : ''}">${slotDone ? (0, runtime.deps._t)('슬롯 최대') : (0, runtime.deps._t)('각인 슬롯 {engraveCap}/5', { engraveCap })}</span><span ${runtime.deps.contentUnlockUi.lockAttribute('engraving')} class="gem-status-chip gem-engrave-status ${engraveFilled ? 'done' : ''}">${engraveFilled ? (0, runtime.deps._t)('슬롯 사용 완료') : (0, runtime.deps._t)('빈 슬롯 {max}', { max: Math.max(0, engraveCap - activeEnh.length) })}</span></div><div ${runtime.deps.contentUnlockUi.lockAttribute('engraving')} class="gem-current-inscriptions"><span>${(0, runtime.deps._t)('현재 각인')}</span><strong>${(0, runtime.deps.escapeHTML)(activeOptions)}</strong></div>`
                : '<div class="gem-process-empty">공격 룬을 선택하면 성장 정보가 표시됩니다.</div>'));
}

function renderEnhanceCore(runtime, view) {
    const { activeGem, condensedPower, activeSlots, engraveCap, activePresentation, isGem, active } = view;
    (0, runtime.deps.renderGemResourceStrip)(activeGem, condensedPower);
    (0, runtime.deps.renderGemEngraveSlots)(activeSlots, engraveCap);
    let currentTotalGemLevel = Math.max(1, Math.floor((activePresentation && activePresentation.totalLevel) || 1));
    runtime.deps.gemCoreForgeUi.renderSection(isGem ? active : null);
    Object.assign(view, { currentTotalGemLevel });
}

function skyUpgradeOption(runtime, view) {
    const { permanentSkyBoost, permanentSkyMax, condensedPower, permanentSkyCost } = view;
    return { title: (0, runtime.deps._t)('응축 창공 영구 강화'), action: 'upgradeActiveGemWithCondensedSkyPower()', done: permanentSkyBoost >= permanentSkyMax, ready: runtime.deps.game.skyTower.unlocked && condensedPower >= permanentSkyCost, details: (0, runtime.deps._t)('{value}, 보유 {floor} / 필요 {permanentSkyCost}', { value: runtime.deps.game.skyTower.unlocked ? (0, runtime.deps._t)('루프 초기화 없음') : (0, runtime.deps._t)('창공의 탑 해금 필요'), floor: Math.floor(condensedPower), permanentSkyCost }), gain: 1 };
}

function qualityUpgradeOption(runtime, view) {
    const { activeGem, qualityNeed } = view;
    return { title: (0, runtime.deps._t)('룬 퀄리티 강화'), action: 'upgradeActiveGemQuality()', done: activeGem?.quality >= 20, ready: (runtime.deps.game.currencies.bossCore || 0) >= qualityNeed, details: (0, runtime.deps._t)('군주의 핵 {bossCore}/{qualityNeed}, 피해/속도 배율 +0.5%', { bossCore: runtime.deps.game.currencies.bossCore || 0, qualityNeed }) };
}

function awakenUpgradeOption(runtime, view) {
    const { activeGem, awakenReady, gemAwakening, active } = view;
    return { title: (0, runtime.deps._t)('각성 룬 변환'), action: 'awakenActiveGemCandidate()', done: !!activeGem?.awakened, ready: awakenReady && (runtime.deps.game.currencies.awakenedEcho || 0) >= 3, details: (0, runtime.deps._t)('{value}기본 Lv.20, 각성 잔향 {awakenedEcho}/3{replace}', { value: gemAwakening ? '' : (0, runtime.deps._t)('‘룬 각성’ 해금 필요, '), awakenedEcho: runtime.deps.game.currencies.awakenedEcho || 0, replace: (0, runtime.deps.getGemAwakenedPerkNote)(active).replace(/^ (.*)\.$/, ', $1') }), gain: 2 };
}

function renderEnhanceUpgrades(runtime, view) {
    const { isGem, currentTotalGemLevel } = view;
    const upgrades = [skyUpgradeOption(runtime, view), qualityUpgradeOption(runtime, view), awakenUpgradeOption(runtime, view)];
    (0, runtime.deps.writeHtmlIfChanged)(runtime.deps.document.getElementById('ui-gem-upgrade-actions'), isGem ? upgrades.map(upgrade => renderGemUpgradeButton(runtime, upgrade, currentTotalGemLevel)).join('') : '<div class="gem-process-empty">강화할 공격 룬을 먼저 장착하세요.<br><button type="button" onclick="switchSkillSubtab(\'skill-tab-equip\')">공격 룬 장착하기</button></div>');
}

function renderEnhanceOptions(runtime, view) {
    const { activeSlots, isGem } = view;
    (0, runtime.deps.writeHtmlIfChanged)(runtime.deps.document.getElementById('ui-gem-enhance-options'), `<div class="gem-engrave-slot-guide"><strong>${(0, runtime.deps._t)('전체 각인')}</strong><span>${(0, runtime.deps._t)('누르면 빈 슬롯에 적용되고 다시 누르면 해제됩니다.')}</span></div>` + Object.values(runtime.deps.GEM_SKY_ENHANCEMENTS).map(enh => (0, runtime.deps.renderSkyEnhancementOption)(enh, activeSlots, isGem)).join(''));
}
