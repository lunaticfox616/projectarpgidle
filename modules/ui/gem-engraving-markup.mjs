import { PIXEL_ICONS, SKY_ENHANCEMENT_ICON_BY_STAT, SKY_PROJECTILE_ICONS } from '../data/gem-presentation.mjs';
import { bindGemEngraveSlotControls, getGemCardMeta, renderSkillGemArt } from './gem-card-markup.mjs';
function engravingOptionState({ current, usedElsewhere, compatible, locked }) {
    return current ? '현재 각인, 누르면 해제' : usedElsewhere ? '다른 슬롯에 적용 중' : !compatible ? '투사체 룬 전용' : locked ? '룬 각성 해금 필요' : '이 슬롯에 각인';
}

function engraveSlotGlyph(runtime, enhancement, unlocked, nextUnlock) {
    return enhancement ? renderSkyEnhancementIcon(runtime, enhancement) : unlocked ? '' : nextUnlock ? '+' : '×';
}

export function renderGemEngraveSlots(runtime, activeSlots, engraveCap) {
    let root = runtime.deps.document.getElementById('ui-gem-engrave-slots');
    if (!root) return;
    bindGemEngraveSlotControls(runtime, root);
    let active = (0, runtime.deps.getGemEnhanceTargetSkill)();
    if (typeof runtime.deps.isEnhanceableAttackGem === 'function' && !(0, runtime.deps.isEnhanceableAttackGem)(active)) {
        let emptySignature = `empty:${active || ''}`;
        if (root.dataset.renderSig !== emptySignature) {
            root.innerHTML = '<div class="gem-process-empty">장착 중인 공격 룬을 선택하면 중앙 각인 장치가 활성화됩니다.</div>';
            root.dataset.renderSig = emptySignature;
        }
        return;
    }
    let { normalizedCap, normalizedSlots, canAffordNextSlot } = engravingSlotsState(runtime, activeSlots, engraveCap);
    let renderSignature = JSON.stringify([active, normalizedCap, normalizedSlots, canAffordNextSlot]);
    if (root.dataset.renderSig === renderSignature) return;
    let slots = [];
    let spokes = [];
    for (let index = 0; index < 5; index++) {
        const rendered = engraveOrbitSlot(runtime, index, { normalizedSlots, normalizedCap, canAffordNextSlot });
        spokes.push(rendered.spoke);
        slots.push(rendered.slot);
    }
    root.innerHTML = `<div class="gem-orbit-stage"><div class="gem-orbit-rings" aria-hidden="true"></div>${spokes.join('')}<div class="gem-orbit-center element-${getGemCardMeta(runtime, runtime.deps.SKILL_DB[active] || {}).className}">${renderSkillGemArt(runtime, active, 'gem-orbit-art', { eager: true })}<span>${(0, runtime.deps._t)('각인 대상')}</span><strong>${(0, runtime.deps.escapeHTML)(active)}</strong></div>${slots.join('')}</div><div class="gem-orbit-copy"><strong>${(0, runtime.deps._t)('중앙 룬과 연결된 슬롯을 선택하세요')}</strong><span class="gem-orbit-legend"><b class="is-empty"><i></i>${(0, runtime.deps._t)('빈 슬롯')}</b><b class="is-filled"><i></i>${(0, runtime.deps._t)('각인됨')}</b><b class="is-unlockable"><i>+</i>${(0, runtime.deps._t)('해금 가능')}</b></span></div>`;
    root.dataset.renderSig = renderSignature;
}

/** @returns {string} SVG markup for the engraving's icon (class sky-engrave-icon is-<group>). */
export function renderSkyEnhancementIcon(runtime, enhancement) {
    let name = enhancement.projectilePatternMode ? SKY_PROJECTILE_ICONS[enhancement.projectilePatternMode] : SKY_ENHANCEMENT_ICON_BY_STAT[enhancement.stat];
    return renderPixelIcon(runtime, name, `sky-engrave-icon is-${getSkyEnhancementGroup(runtime, enhancement).className}`);
}

/** @param {string} name a PIXEL_ICONS key (unknown → star) @param {string} className svg class @returns {string} crisp 11×11 SVG */
export function renderPixelIcon(runtime, name, className) {
    let rects = [];
    (PIXEL_ICONS[name] || PIXEL_ICONS.star).forEach((row, y) => {
        for (let match of row.matchAll(/#+|o+/g)) rects.push(`<rect class="${match[0][0] === '#' ? 'm' : 'f'}" x="${match.index}" y="${y}" width="${match[0].length}" height="1"/>`);
    });
    return `<svg class="${className}" viewBox="0 0 11 11" shape-rendering="crispEdges" aria-hidden="true">${rects.join('')}</svg>`;
}

export function getSkyEnhancementGroup(runtime, enhancement) {
    if (enhancement.projectilePatternMode) return { label: (0, runtime.deps._t)('탄도'), className: 'crafted' };
    if (String(enhancement.id || '').startsWith('sky_awakened')) return { label: (0, runtime.deps._t)('각성'), className: 'awakened' };
    if (String(enhancement.id || '').startsWith('sky_gemcraft')) return { label: (0, runtime.deps._t)('조율'), className: 'crafted' };
    return { label: (0, runtime.deps._t)('기본'), className: 'basic' };
}

export function renderSkyEnhancementOption(runtime, enhancement, activeSlots, isGem) {
    let applied = activeSlots.includes(enhancement.id);
    let locked = !(0, runtime.deps.canUseSkyEnhancement)(enhancement.id);
    let removeCost = typeof runtime.deps.getSkyGemEnhancementRemoveCost === 'function' ? (0, runtime.deps.getSkyGemEnhancementRemoveCost)() : 0;
    let group = getSkyEnhancementGroup(runtime, enhancement);
    let compatible = enhancementFitsTarget(runtime, enhancement);
    let actionLabel = applied ? (0, runtime.deps._t)('적용 중, 해제 창공 {removeCost}', { removeCost }) : !compatible ? '투사체 룬 전용' : locked ? '룬 각성 해금 필요' : '창공 1';
    return `<button class="gem-engrave-option group-${group.className} ${applied ? 'applied' : ''}" onclick="toggleSkyGemEnhancement('${enhancement.id}')" ${!isGem || !compatible || (locked && !applied) ? 'disabled' : ''}>${renderEngraveOptionFace(runtime, enhancement, group, actionLabel)}</button>`;
}

/** The face of an engraving card (전체 각인 list and the slot overlay): icon in the group colour, name, then the effect in the stat
* colours at reading size. 2026-10-11 사용자: 색이 없고 글씨가 작아 어떤 효과인지 읽기 어려웠다(효과가 8px 흰 글씨였다). */
export function renderEngraveOptionFace(runtime, enhancement, group, stateLabel) {
    return `<span class="gem-engrave-icon">${renderSkyEnhancementIcon(runtime, enhancement)}</span><span class="gem-engrave-copy"><span class="gem-engrave-top"><strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(enhancement.name))}</strong><em>${(0, runtime.deps._t)(group.label)}</em></span>`
        + `<small>${runtime.deps.statToneText.html((0, runtime.deps._t)(enhancement.desc))}</small><b class="gem-engrave-state">${stateLabel}</b></span>`;
}

export function renderGemEngraveOverlayOption(runtime, enhancement, slots, slotIndex) {
    let current = slots[slotIndex] === enhancement.id;
    let usedElsewhere = slots.some((id, index) => index !== slotIndex && id === enhancement.id);
    let locked = !(0, runtime.deps.canUseSkyEnhancement)(enhancement.id);
    let group = getSkyEnhancementGroup(runtime, enhancement);
    let compatible = enhancementFitsTarget(runtime, enhancement);
    let state = engravingOptionState({ current, usedElsewhere, compatible, locked });
    return `<button type="button" class="gem-engrave-option group-${group.className} ${current ? 'applied' : ''}" data-engrave-id="${enhancement.id}" data-action="${current ? 'remove' : 'apply'}" ${usedElsewhere || !compatible || (locked && !current) ? 'disabled' : ''}>${renderEngraveOptionFace(runtime, enhancement, group, state)}</button>`;
}

function enhancementFitsTarget(runtime, enhancement) {
    return typeof runtime.deps.isSkyEnhancementCompatibleWithSkill !== 'function' || (0, runtime.deps.isSkyEnhancementCompatibleWithSkill)(enhancement.id, (0, runtime.deps.getGemEnhanceTargetSkill)());
}

function engravingSlotsState(runtime, activeSlots, engraveCap) {
    let normalizedCap = Math.max(1, Math.min(5, Math.floor(Number(engraveCap) || 1)));
    let sourceSlots = Array.isArray(activeSlots) ? activeSlots : [];
    let normalizedSlots = Array.from({ length: 5 }, (_, index) => sourceSlots[index] || null);
    let nextUnlockCost = normalizedCap < 5 ? normalizedCap + 1 : 0;
    let canAffordNextSlot = nextUnlockCost > 0 && (runtime.deps.game.currencies.skyEssence || 0) >= nextUnlockCost;
    return { normalizedCap, normalizedSlots, canAffordNextSlot };
}

function engraveOrbitSlot(runtime, index, { normalizedSlots, normalizedCap, canAffordNextSlot }) {
    let enhancement = normalizedSlots[index] ? runtime.deps.GEM_SKY_ENHANCEMENTS[normalizedSlots[index]] : null;
    let unlocked = index < normalizedCap;
    let nextUnlock = index === normalizedCap && normalizedCap < 5;
    let unlockReady = nextUnlock && canAffordNextSlot;
    let stateClass = enhancement ? 'filled' : unlocked ? 'open' : unlockReady ? 'unlockable' : nextUnlock ? 'unaffordable' : 'locked';
    let title = engraveSlotTitle(runtime, index, { enhancement, unlocked, nextUnlock, unlockReady });
    let group = enhancement ? getSkyEnhancementGroup(runtime, enhancement) : null;
    let glyph = engraveSlotGlyph(runtime, enhancement, unlocked, nextUnlock);
    let orbitAngle = -90 + index * 72;
    let orbitRadius = 38.5;
    let orbitX = 50 + Math.cos(orbitAngle * Math.PI / 180) * orbitRadius;
    let orbitY = 50 + Math.sin(orbitAngle * Math.PI / 180) * orbitRadius;
    const label = engraveSlotLabel(runtime, { enhancement, nextUnlock, unlockReady });
    return { spoke: `<span class="gem-orbit-spoke" aria-hidden="true" style="--orbit-angle:${orbitAngle}deg"></span>`, slot: engraveSlotButton(runtime, index, { enhancement, unlocked, nextUnlock, unlockReady, stateClass, title, group, glyph, orbitX, orbitY, label }) };
}

function engraveSlotTitle(runtime, index, { enhancement, unlocked, nextUnlock, unlockReady }) { return enhancement
        ? (0, runtime.deps._t)('{value}번 슬롯, {name}, 눌러서 교체 또는 해제', { value: index + 1, name: enhancement.name })
        : unlocked
        ? (0, runtime.deps._t)('{value}번 빈 각인 슬롯, 눌러서 각인 선택', { value: index + 1 })
        : nextUnlock
        ? (0, runtime.deps._t)('{value}번 슬롯 해금, 창공의 정수 {value2}{value3}', { value: index + 1, value2: index + 1, value3: unlockReady ? '' : (0, runtime.deps._t)(', 재화 부족') })
        : (0, runtime.deps._t)('{value}번 잠긴 슬롯, 앞 슬롯부터 해금 필요', { value: index + 1 }); }

function engraveSlotLabel(runtime, { enhancement, nextUnlock, unlockReady }) { return enhancement ? `<em>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(enhancement.name))}</em>` : nextUnlock ? `<em>${unlockReady ? (0, runtime.deps._t)('슬롯 해금') : (0, runtime.deps._t)('재화 부족')}</em>` : ''; }

function engraveSlotButton(runtime, index, { enhancement, unlocked, nextUnlock, stateClass, title, group, glyph, orbitX, orbitY, label }) { return `<button type="button" class="gem-orbit-slot slot-${index + 1} ${stateClass} ${group ? `group-${group.className}` : ''}" style="--slot-x:${orbitX.toFixed(3)}%;--slot-y:${orbitY.toFixed(3)}%" data-tip="${(0, runtime.deps.escapeHTML)(title)}" aria-label="${(0, runtime.deps.escapeHTML)(title)}" aria-pressed="${enhancement ? 'true' : 'false'}" aria-disabled="${!unlocked && !nextUnlock ? 'true' : 'false'}" data-slot-index="${index}" data-slot-state="${stateClass}" ${!unlocked && !nextUnlock ? 'tabindex="-1"' : ''}><span class="gem-orbit-slot-glyph" aria-hidden="true"><b>${glyph}</b></span>${label}</button>`; }
