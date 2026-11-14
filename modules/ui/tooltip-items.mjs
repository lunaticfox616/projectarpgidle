import { getItemSlotDisplayLabel, getItemDropRegionLineHtml, getUniqueEffectApplicationHint, getItemStatRollRangeHtml, getHoneyLockBadgeHtml } from './tooltip-item-details.mjs';
import { getItemBaseBadgesHtml, itemExplicitAffixHeaderHtml, getItemAffixTierHtml } from './tooltip-item-shell.mjs';
import { dismissItemTooltipNow, hideItemTooltip } from './tooltip-core.mjs';

export function createShowItemTooltip(runtime) {
    return function showItemTooltip(event, idx, isEquip, itemOverride, options = {}) {
        let item = itemOverride || (isEquip ? runtime.deps.game.equipment[idx] : runtime.deps.game.inventory[idx]);
        let resolveItemStatTone = (statId) => (0, runtime.deps.getItemStatToneColor)(statId);
        if (!item) return;
        let context = runtime.handlers.prepareItemTooltip(event, item, idx, isEquip, options);
        if (!context) return;
        const inactiveAffixes = runtime.deps.equipmentInspectionUi.getInactiveAffixIds(runtime.deps.cachedTooltipStats, runtime.deps.game.equippedSummonSkills);
        const affixClass = statId => inactiveAffixes.has(statId) ? ' class="equipment-affix-inactive"' : '';
        let html = '';
        html = appendItemIdentity(runtime, html, { item, isEquip, idx });
        html = appendItemBaseStats(runtime, html, { item, affixClass, resolveItemStatTone });
        html = appendItemExplicitStats(runtime, html, { item, affixClass, resolveItemStatTone });
        html = appendItemEncroachment(runtime, html, { item });

        runtime.handlers.presentItemTooltip(context, event, item, html + runtime.deps.sapCatalystsUi.qualityHtml(item) + runtime.deps.gardenOilsUi.tooltipHtml(item) + runtime.deps.emberCorruptionUi.tooltipHtml(item) + runtime.deps.weaponMasteryUi.tooltipHtml(item), isEquip);
    };
}

export function showCombatLogItemTooltip(runtime, event, token) {
    let item = runtime.deps.window.GameModules.combatLogView.itemSnapshot(token);
    if (!item) return;
    runtime.handlers.showItemTooltip(event, null, false, item, { token: `log:${token}:snapshot` });
}

export function openCombatLogItemEquipment(runtime, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    dismissItemTooltipNow(runtime);
    (0, runtime.deps.switchTab)('tab-items');
    if (runtime.deps.document.body.classList.contains('desktop-windowed-ui') && typeof runtime.deps.openWindow === 'function') (0, runtime.deps.openWindow)('tab-items');
    (0, runtime.deps.switchItemSubtab)('item-tab-equip');
}

export function hideCombatLogItemTooltip(runtime, event) {
    hideItemTooltip(runtime, event);
}

export function validateItemTooltipAnchor(runtime) {
    if (!runtime.state.activeItemTooltipToken) return;
    let [scope, key, idText] = String(runtime.state.activeItemTooltipToken).split(':');
    if (scope === 'log') {
        if (!runtime.deps.window.GameModules.combatLogView.itemSnapshot(key)) hideItemTooltip(runtime);
        return;
    }
    let expectedId = Number(idText);
    if (!Number.isFinite(expectedId)) return hideItemTooltip(runtime);
    const current = itemTooltipRecord(runtime, scope, key);
    if (!current || current.id !== expectedId) hideItemTooltip(runtime);
}

function itemTooltipRecord(runtime, scope, key) {
    if (scope === 'equip') {
        return runtime.deps.game.equipment && runtime.deps.game.equipment[key];
    }
    if (scope === 'inv' && Array.isArray(runtime.deps.game.inventory)) return runtime.deps.game.inventory[Number(key)];
    return null;
}

function appendItemIdentity(runtime, html, context) {
    const { item, isEquip, idx } = context;
    html = appendItemTitleAndHall(runtime, html, { item });
    html += `<div class="tooltip-line tooltip-meta tooltip-meta-base">${(0, runtime.deps._t)('베이스')}: ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(item.baseName))}${getItemBaseBadgesHtml(runtime, item)}</div>`;
    html += `<div class="tooltip-line tooltip-meta">${(0, runtime.deps._t)('아이템 Lv.')}${item.itemLevel || runtime.deps.levelProgression.tierLevel(item.hiddenTier || item.itemTier)} &ensp; ${(0, runtime.deps._t)('등급|티어')} ${(0, runtime.deps.getTierBadgeHtml)((0, runtime.deps.getItemCraftTier)(item), 'T')}</div>${runtime.deps.levelProgressionUi.item(item, isEquip, idx)}`;
    html = appendItemUniqueEffect(runtime, html, { item, isEquip, idx });
    html += runtime.deps.equipmentSocketsUi.tooltipHtml(item) + getItemDropRegionLineHtml(runtime, item);
    if (item.fusedRelic) {
        let fusionGradeLabel = (0, runtime.deps._t)(item.fusionGrade === 'perfect' ? '완벽한 융합' : (item.fusionGrade === 'unstable' ? '불안정한 융합' : '보통 융합'));
        html += `<div class="tooltip-line" style="color:#8fd8ff;">⌛ ${fusionGradeLabel}${item.fusedRareName ? (0, runtime.deps._t)(', [{fusedRareName}]의 기억', { fusedRareName: (0, runtime.deps.escapeHTML)(item.fusedRareName) }) : ''}, 황금률/잿불가지/축복의 꽃잎만 사용 가능</div>`;
    }
    return html;
}

function appendItemEncroachment(runtime, html, context) {
    const { item } = context;
    if (item.encroached) {
        html += `<div class="tooltip-line" style="margin-top:6px; color:#b084ff;">${(0, runtime.deps._t)('잠식 특수 옵션')}</div>`;
        if (item.encroached.liberated && item.encroached.chosen) {
            let st = item.encroached.chosen;
            html += `<div class="tooltip-line" style="color:#d7b8ff;">${(0, runtime.deps._t)('[잠식] {statName} +{id} {tier}', { statName: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(st.statName || (0, runtime.deps.getStatName)(st.id))), id: (0, runtime.deps.formatValue)(st.id, st.val), tier: (0, runtime.deps.getTierBadgeHtml)(st.tier || 10, 'T') })}</div>`;
        } else {
            html += `<div class="tooltip-line" style="color:#8d7bb3;">${(0, runtime.deps._t)('해방 전에는 효과 없음, 모든 제작으로도 변하지 않음')}</div>`;
        }
    }
    return html;
}

function appendItemExplicitStats(runtime, html, context) {
    const { item, affixClass, resolveItemStatTone } = context;
    let explicitStats = (item.stats || []).slice();
    if (item.chaosInfusion) explicitStats.push({ ...item.chaosInfusion, statName: (0, runtime.deps._t)('[주입] {statName}', { statName: (0, runtime.deps._t)(item.chaosInfusion.statName || (0, runtime.deps.getStatName)(item.chaosInfusion.id)) }) });
    if (explicitStats.length > 0) {
        explicitStats.sort(runtime.deps.itemTooltipRules.compareStats);
        html += itemExplicitAffixHeaderHtml(runtime, item, explicitStats.length);
        explicitStats.forEach(stat => {
            let statKey = stat && (stat.id || stat.stat);
            let tierText = getItemAffixTierHtml(runtime, stat);
            let rangeText = `${getItemStatRollRangeHtml(runtime, stat)}${tierText}`;
            let honeyLockText = getHoneyLockBadgeHtml(runtime, stat) + runtime.deps.emberCorruptionUi.scaleBadgeHtml(stat) + runtime.deps.itemInfluencesUi.lineBadgeHtml(item, stat);
            let label = itemTooltipAffixLabel(runtime, stat, statKey);   // the stat name goes through the language pack (2026-11-03)
            // 복합 옵션은 한 줄에 두 스탯까지 표기하고, 듀얼+복합처럼 길어지는 경우 다음 줄로 넘긴다.
            if (Array.isArray(stat.extraStats) && stat.extraStats.length > 0) {
                let parts = [`<span${affixClass(statKey)} style="color:${resolveItemStatTone(statKey)};">${(0, runtime.deps.escapeHTML)((0, runtime.deps.getStatName)(statKey))} +${(0, runtime.deps.formatValue)(statKey, stat.val)}</span>`];
                stat.extraStats.forEach(extra => {
                    let exKey = extra && (extra.id || extra.stat);
                    parts.push(`<span${affixClass(exKey)} style="color:${resolveItemStatTone(exKey)};">${(0, runtime.deps.escapeHTML)((0, runtime.deps.getStatName)(exKey))} +${(0, runtime.deps.formatValue)(exKey, extra.val)}</span>`);
                });
                for (let i = 0; i < parts.length; i += 2) {
                    let chunk = parts.slice(i, i + 2).join(' <span style="color:var(--copy-muted);">/</span> ');
                    let continuation = i > 0 ? ' compound-option-continuation' : '';
                    let indent = i > 0 ? 'padding-left:14px;' : '';
                    let suffix = i === 0 ? `${rangeText}${honeyLockText}` : '';
                    html += `<div class="tooltip-line${continuation}" style="${indent}">${chunk}${suffix}</div>`;
                }
                return;
            }
            html += `<div class="tooltip-line"><span${affixClass(statKey)} style="color:${resolveItemStatTone(statKey)};">${label} +${(0, runtime.deps.formatValue)(statKey, stat.val)}</span>${rangeText}${honeyLockText}</div>`;
        });
    } else {
        html += runtime.deps.itemTooltipRules.emptyExplicitHtml(item);
    }
    return html;
}

function appendItemBaseStats(runtime, html, context) {
    const { item, affixClass, resolveItemStatTone } = context;
    let defenseView = runtime.deps.itemTooltipRules.defenseView(item);
    if ((item.baseStats || []).length > 0) {
        html += `<div class="tooltip-line tooltip-section tooltip-section-base"><span class="px-center">${(0, runtime.deps._t)('베이스 옵션')}</span></div>${runtime.deps.colonyWardsUi.beltLineHtml(item)}`;
        item.baseStats.forEach(stat => {
            let statKey = stat && (stat.id || stat.stat);
            if (statKey === 'armor' || statKey === 'evasion' || statKey === 'energyShield') return;
            let cur = Number(stat.val || 0);
            let rangeText = getItemStatRollRangeHtml(runtime, stat, { estimateFromValue: true });
            let label = itemTooltipAffixLabel(runtime, stat, statKey);   // the stat name goes through the language pack (2026-11-03)
            let valueColor = stat.exceptional ? '#ffb454' : resolveItemStatTone(statKey);
            let exMark = (stat.exceptional ? ' <span style="color:#ffb454; font-weight:700;">✦+20%</span>' : '') + runtime.deps.itemInfluencesUi.lineBadgeHtml(item, stat);
            html += `<div class="tooltip-line"><span${affixClass(statKey)}><span style="color:${resolveItemStatTone(statKey)};">${label} </span><span style="color:${valueColor};">${(0, runtime.deps.formatSignedValue)(statKey, cur)}</span></span>${rangeText}${exMark}</div>`;
        });
        ['armor','evasion','energyShield'].forEach(id => {
            let label = (0, runtime.deps.escapeHTML)((0, runtime.deps.getStatName)(id));
            let finalVal = defenseView[id];
            let baseVal = defenseView.base[id];
            if (finalVal <= 0 && baseVal <= 0) return;
            let src = (item.baseStats || []).find(stat => stat && stat.id === id);
            let rangeText = '';
            if (src) {
                rangeText = getItemStatRollRangeHtml(runtime, src, { estimateFromValue: true });
            }
            let valueColor = (src && src.exceptional) ? '#ffb454' : resolveItemStatTone(id);
            let exMark = (src && src.exceptional) ? ' <span style="color:#ffb454; font-weight:700;">✦+20%</span>' : '';
            if (Math.floor(finalVal) === Math.floor(baseVal)) {
                html += `<div class="tooltip-line">${label}: <span style="color:${valueColor};">${Math.floor(baseVal)}</span>${rangeText}${exMark}</div>`;
            } else {
                html += `<div class="tooltip-line">${label}: <span style="color:${valueColor};">${Math.floor(finalVal)}</span> <span style="color:var(--copy-bright);">(${Math.floor(baseVal)})</span>${rangeText}${exMark}</div>`;
            }
        });
    }
    return html;
}

function appendItemTitleAndHall(runtime, html, context) {
    const { item } = context;
    let exceptionalStars = typeof runtime.deps.getExceptionalBaseStarsHtml === 'function' ? (0, runtime.deps.getExceptionalBaseStarsHtml)(item) : '';
    html = `<div class="tooltip-title" style="color:${(0, runtime.deps.getRarityColor)(item.rarity)}"><span class="px-center">[${getItemSlotDisplayLabel(runtime, item)}] ${(0, runtime.deps.escapeHTML)((0, runtime.deps.getItemDisplayName)(item))}${exceptionalStars}${item.encroached ? ` <span style="color:#b084ff;">${(0, runtime.deps._t)('(잠식)')}</span>` : ''}${item.corrupted ? ` <span style="color:#e74c3c;">${(0, runtime.deps._t)('(타락)')}</span>` : ''}${runtime.deps.craftingWorkspaceUi.imprintMark(item)}${item.loopSealed ? ` <span style="color:#7fd99a;" data-tip="${(0, runtime.deps._t)('나무꾼의 손길로 봉인됨: 루프가 지나도 유지')}">${(0, runtime.deps._t)('🌿봉인')}</span>` : ''}</span></div>${runtime.deps.itemInfluencesUi.tooltipHtml(item)}`;
    if (item.hallReplica) html += `<div class="tooltip-line" style="color:#d2b878;">🏛️ 전당 소장품, 전시자 ${(0, runtime.deps.escapeHTML)(item.hallCuratorName || '익명')}, 감정 ${Math.max(0, Math.floor(Number(item.hallAppraisalScore) || 0)).toLocaleString()}, 제작/재등록 불가</div>`;
    else if (item.hallRelistBlocked) html += '<div class="tooltip-line" style="color:#bda979;">🏛️ 전당 복제 이력, 재등록 불가</div>';
    return html;
}

function itemTooltipAffixLabel(runtime, stat, statKey) {
    return (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(stat.statName || (0, runtime.deps.getStatName)(statKey)) || statKey);
}

function appendItemUniqueEffect(runtime, html, context) {
    const { item, isEquip, idx } = context;
    if (item.rarity === 'unique' && item.uniqueEffect) {
        let uniqueGlow = 'display:inline-block;padding:1px 6px;border-radius:6px;border:1px solid rgba(198,162,255,0.55);background:linear-gradient(135deg, rgba(73,52,108,0.45) 0%, rgba(31,23,56,0.5) 100%);color:#f0dcff;font-weight:700;text-shadow:0 0 6px rgba(196,154,255,0.8),0 0 12px rgba(142,109,214,0.55);box-shadow:0 0 10px rgba(140,94,220,0.4),inset 0 0 10px rgba(229,205,255,0.2);';
        html += `<div class="tooltip-line" style="margin-top:6px;"><span style="${uniqueGlow}">✨ ${(0, runtime.deps._t)('고유 효과')}: ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(item.uniqueEffect))}</span></div>`;
        let applicationHint = getUniqueEffectApplicationHint(runtime, item, !!isEquip, isEquip ? idx : null);
        if (applicationHint) html += `<div class="tooltip-line" style="color:#bda9d8; margin-top:3px;">◆ ${(0, runtime.deps.escapeHTML)(applicationHint)}</div>`;
    }
    return html;
}
