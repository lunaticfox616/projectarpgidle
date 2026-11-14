import { GEM_TYPE_LABELS } from '../data/gem-presentation.mjs';
import { listenView, releaseViewTarget } from './view-events.mjs';
import { getSummonSkillCount, getSupportTierResonanceCost, getSupportActiveTier } from './../domain/gem-loadout-state.mjs';
import { getEffectiveResonanceCap } from './gem-loadout-actions.mjs';

export function getSkillGemArtPath(runtime, name) {
    const paths = runtime.deps.SKILL_GEM_ART_PATHS;
    return paths && paths[name] ? paths[name] : '';
}

/** The gem picker's "worn only" fold, one per library ('attack' | 'support'). */
export function toggleGemFoldMode(runtime, mode) {
    if (mode === 'attack') {
        runtime.deps.game.gemFoldInactiveAttack = !runtime.deps.game.gemFoldInactiveAttack;
    } else if (mode === 'support') {
        runtime.deps.game.gemFoldInactiveSupport = !runtime.deps.game.gemFoldInactiveSupport;
    }
    (0, runtime.deps.updateStaticUI)();
}

export function getGemCardMeta(runtime, def) {
    let tags = Array.isArray(def && def.tags) ? def.tags : [];
    let element = gemElement(def, tags);
    let elementMap = {
        fire: { icon: '◆', label: (0, runtime.deps._t)('화염'), className: 'fire' },
        cold: { icon: '✦', label: (0, runtime.deps._t)('냉기'), className: 'cold' },
        light: { icon: 'ϟ', label: (0, runtime.deps._t)('번개'), className: 'lightning' },
        lightning: { icon: 'ϟ', label: (0, runtime.deps._t)('번개'), className: 'lightning' },
        chaos: { icon: '◈', label: (0, runtime.deps._t)('카오스'), className: 'chaos' },
        phys: { icon: '◇', label: (0, runtime.deps._t)('물리'), className: 'physical' },
        physical: { icon: '◇', label: (0, runtime.deps._t)('물리'), className: 'physical' }
    };
    let typeLabel = GEM_TYPE_LABELS.find(([tag]) => tags.includes(tag))?.[1] || '공격';
    let presentation = elementMap[element] || elementMap.phys;
    // elementLabel: a gem that hits with more than one element (분광 위습 소환) names them itself.
    return { typeLabel: typeLabel, icon: presentation.icon, elementLabel: def?.elementLabel || presentation.label, className: presentation.className };
}

function gemElement(def, tags) {
    return String((def && def.ele) || (tags.includes('fire') ? 'fire' : tags.includes('cold') ? 'cold' : tags.includes('lightning') ? 'light' : tags.includes('chaos') ? 'chaos' : 'phys'));
}

/** 강화된 룬 그림의 표시(단계 글자와 빛, css/gem-core-forge.css). 상점과 강화 창은 options.plain으로 뺀다. */
export function getRuneForgeAttrs(runtime, name, options) {
    const level = options?.plain ? 0 : Math.floor(Number(runtime.deps.game.gemData?.[name]?.enhanceLevel) || 0);
    return level > 0 ? ` data-forge-plus="+${level}" data-forge-tier="${runtime.deps.gemCoreForge.tierOf(level)}"` : '';
}

export function renderSkillGemArt(runtime, name, className, options) {
    const forgeAttrs = getRuneForgeAttrs(runtime, name, options);
    const summonArt = runtime.deps.supportGemSigil.summonHtml(name, className);
    if (summonArt) return summonArt.replace('<span ', `<span${forgeAttrs} `);
    let def = runtime.deps.SKILL_DB[name] || {};
    let meta = getGemCardMeta(runtime, def);
    let artPath = (0, runtime.deps.getSkillGemArtPath)(name);
    let opts = options || {};
    let loading = opts.eager ? 'eager' : 'lazy';
    let fallbackHidden = artPath ? ' hidden' : '';
    let image = artPath
        ? `<img src="${(0, runtime.deps.escapeHTML)(artPath)}" alt="" loading="${loading}" decoding="async" onerror="this.hidden=true; this.nextElementSibling.hidden=false">`
        : '';
    return `<span${forgeAttrs} class="${className || 'gem-art'}" aria-label="${(0, runtime.deps._t)('{name} 룬 이미지', { name: (0, runtime.deps.escapeHTML)(name) })}">${image}<span class="gem-art-fallback" aria-hidden="true"${fallbackHidden}>${meta.icon}</span></span>`;
}

export function renderGemTagChips(runtime, def, maxTags) {
    let rawTags = Array.isArray(def && def.tags) ? def.tags : [];
    // 룬 상세(getUiGemPresentation)는 이미 한글로 바꾼 꼬리표를 넘긴다: 색을 고르려면 원래 키로 되돌린다(근접 → melee).
    let tagKey = tag => runtime.deps.SKILL_TAG_LABELS[tag] ? tag : (Object.keys(runtime.deps.SKILL_TAG_LABELS).find(key => runtime.deps.SKILL_TAG_LABELS[key] === tag) || tag);
    let getTone = rawTag => {
        let tag = tagKey(rawTag);
        if (['fire', 'cold', 'light', 'lightning', 'chaos', 'phys', 'physical'].includes(tag)) return tag === 'light' ? 'lightning' : tag === 'phys' ? 'physical' : tag;
        if (['summon_attack', 'minion', 'summon'].includes(tag)) return 'summon';
        if (['spell', 'projectile', 'melee', 'slam', 'chain', 'pierce', 'dot', 'aoe', 'utility', 'curse', 'warcry', 'guard'].includes(tag)) return tag;
        return 'neutral';
    };
    return rawTags.slice(0, maxTags || 4).map(tag => {
        let label = typeof runtime.deps.translateSkillTag === 'function' ? (0, runtime.deps.translateSkillTag)(tag) : tag;
        return `<span class="gem-tag gem-tag--${getTone(tag)}">${(0, runtime.deps.escapeHTML)(label)}</span>`;
    }).join('');
}

/** One line under a tile: how the gem attacks (range kind and reach), or the summon's element and kind. */
export function getGemTileSummary(runtime, name, def) {
    let meta = getGemCardMeta(runtime, def);
    if ((def.tags || []).includes('summon')) return `${meta.elementLabel} ${meta.typeLabel}`;
    let profile = (0, runtime.deps.getSkillGridProfile)(name, def);
    return (0, runtime.deps._t)('{value}, {max}칸', { value: (0, runtime.deps._t)((0, runtime.deps.getSkillGridProfileKindLabel)(profile.band ? 'band' : profile.kind)), max: Math.max(1, profile.range || 1) });
}

/** Tiles open the detail on click / Enter / Space (js/gem-selection-ui.js); a mouse hover shows the short hint. */
export function getGemTileHandlers(runtime, type, name) {
    let action = `gemSelectionUi.open(this,'${type}','${name}')`;
    return `role="button" tabindex="0" onclick="${action}" onkeydown="if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();${action};}" onpointerenter="showGemCardHint(event,'${type}','${name}')" onpointerleave="hideInfoTooltip()"`;
}

export function renderGemTileLevel(runtime, gemInfo) {
    return `<span class="gem-tile-level ${gemInfo.totalLevel > gemInfo.baseLevel ? 'effective' : ''}">Lv.${(0, runtime.deps.formatValue)('', gemInfo.totalLevel)}</span>`;
}

/** 같은 룬을 여럿 가지면 칸에 적는 개수. */
export function renderGemTileCopies(runtime, name) {
    const spares = runtime.deps.gemDropRewards.spareCount(runtime.deps.game, name);
    return spares ? `<span class="gem-tile-copies">×${spares + 1}</span>` : '';
}

export function renderAttackGemCard(runtime, name, highlightedName, stats) {
    let def = runtime.deps.SKILL_DB[name] || {};
    let gemInfo = (0, runtime.deps.getUiGemPresentation)(name, false, stats);
    let meta = getGemCardMeta(runtime, def);
    let { summonEquipped, active, equipmentReady, state } = attackGemCardState(runtime, name, def);
    let classes = ['skill-gem', 'gem-library-card', 'gem-tile', `element-${meta.className}`, active ? 'active' : '', equipmentReady ? '' : 'equipment-blocked'].filter(Boolean).join(' ');
    let worn = active ? `<span class="gem-tile-worn">${summonEquipped ? (0, runtime.deps._t)('소환 ×{name}', { name: getSummonSkillCount(runtime, name) }) : (0, runtime.deps._t)('장착')}</span>` : '';
    return `<article class="${classes}" data-attack-rune="${(0, runtime.deps.escapeHTML)(name)}" ${getGemTileHandlers(runtime, 'active', name)} aria-label="${(0, runtime.deps.escapeHTML)(name)} Lv.${(0, runtime.deps.formatValue)('', gemInfo.totalLevel)}${active ? (0, runtime.deps._t)(', 장착 중') : ''}${equipmentReady ? '' : ', ' + (0, runtime.deps.escapeHTML)((0, runtime.deps.getSkillRuneWeaponNote)(name))}">
        ${renderGemTileLevel(runtime, gemInfo)}${worn}${renderGemTileCopies(runtime, name)}${renderSkillGemArt(runtime, name, 'gem-card-sigil gem-card-art gem-tile-art')}
        <strong class="gem-tile-name">${highlightedName}</strong><small class="gem-usage-state">${(0, runtime.deps.escapeHTML)(state)}</small>
    </article>`;
}

function attackGemCardState(runtime, name, def) {
    let summonEquipped = (def.tags || []).includes('summon') && (runtime.deps.game.equippedSummonSkills || []).includes(name);
    let active = summonEquipped || [runtime.deps.game.activeSkill, runtime.deps.game.mobilitySkill].includes(name);
    let equipmentReady = typeof runtime.deps.canUseSkillWithCurrentEquipment !== 'function' || (0, runtime.deps.canUseSkillWithCurrentEquipment)(name);
    let state = equipmentReady ? getGemTileSummary(runtime, name, def) : (0, runtime.deps.getSkillRuneWeaponNote)(name);
    return { summonEquipped, active, equipmentReady, state };
}

/** Why a support gem cannot go on right now ('' when it can, or when it is already worn). */
export function getSupportEquipFailure(runtime, name, stats) {
    if ((runtime.deps.game.equippedSupports || []).includes(name)) return '';
    let equippedSupports = runtime.deps.game.equippedSupports || [];
    let supportCap = Math.max(0, Math.floor((stats && stats.suppCap) || 0));
    if (equippedSupports.length >= supportCap) return '';
    const conflict = runtime.deps.window.GameModules.skills.supports.conflictReason(name, runtime.deps.game);
    if (conflict) return conflict;
    if (runtime.deps.gemDropRewards.allowsResonanceOverflow(stats)) return '';
    let used = equippedSupports.reduce((sum, supportName) => sum + getSupportTierResonanceCost(runtime, supportName), 0);
    let available = Math.max(0, getEffectiveResonanceCap(runtime, stats) - used);
    let cost = getSupportTierResonanceCost(runtime, name);
    return available < cost ? (0, runtime.deps._t)('공명력 {value} 모자람', { value: cost - available }) : '';
}

export function renderSupportGemCard(runtime, name, highlightedName, stats) {
    let gemInfo = (0, runtime.deps.getUiGemPresentation)(name, true, stats);
    let active = (runtime.deps.game.equippedSupports || []).includes(name);
    let failure = getSupportEquipFailure(runtime, name, stats);
    let tier = getSupportActiveTier(runtime, name);
    let state = failure || runtime.deps.gemSelectionUi.application(name, stats);
    let classes = ['skill-gem', 'support-gem', 'gem-library-card', 'gem-tile', `is-tone-${runtime.deps.supportGemSigil.tone(name)}`, active ? 'active' : '', failure ? 'equipment-blocked' : ''].filter(Boolean).join(' ');
    return `<article class="${classes}" ${getGemTileHandlers(runtime, 'support', name)} aria-label="${(0, runtime.deps.escapeHTML)(name)}${active ? (0, runtime.deps._t)(', 장착 중') : (failure ? `, ${(0, runtime.deps.escapeHTML)(failure)}` : '')}">
        ${renderGemTileLevel(runtime, gemInfo)}${active ? (0, runtime.deps._t)('<span class="gem-tile-worn">장착</span>') : ''}${runtime.deps.supportGemSigil.html(name, 'gem-card-sigil gem-tile-art gem-tile-support-art', tier)}
        <strong class="gem-tile-name">${highlightedName}</strong>${runtime.deps.gemSelectionUi.indicators(name)}<small class="gem-usage-state">${(0, runtime.deps.escapeHTML)(state)}</small>
        <span class="support-library-effect">${(0, runtime.deps.escapeHTML)(runtime.deps.gemSelectionUi.effectText(name, tier, stats))}</span><small>${(0, runtime.deps._t)('공명 {name}, {value}', { name: getSupportTierResonanceCost(runtime, name), value: active ? (0, runtime.deps._t)('등급과 교체 보기') : (0, runtime.deps._t)('후보 상세 보기') })}</small>
    </article>`;
}

/** Gem card hover, mouse only (a tap opens the detail instead): the full gem tooltip with its numbers (2026-10-11 사용자: 룬을
* 고르는 곳의 툴팁에 수치가 없었다, 이름과 설명만 보였다). showGemTooltip stays quiet while the detail popover is open. */
export function showGemCardHint(runtime, event, type, name) {
    if (event.pointerType === 'mouse') (0, runtime.deps.showGemTooltip)(event, type, name);
}

/** 룬 레벨 구성(2026-10-09): 최종 레벨을 크게, 기본/재료와 각성/장비와 패시브를 한 막대에 나눠 칠하고, 그 아래 전투 수치 칩. 작은 4칸 표였다. */
export function getGemGrowthSummaryHtml(runtime, name, presentation) {
    if (!presentation || !presentation.skill) return '';
    const base = Number(presentation.baseLevel) || 1, material = Number(presentation.materialBonus) || 0;
    const total = Number(presentation.totalLevel || presentation.finalLevel) || 1;
    const parts = [['base', '기본', base], ['material', '재료/각성', material], ['source', '장비/패시브', Math.max(0, total - base - material)]];
    const bar = parts.map(([key, , value]) => `<i class="is-${key}" style="flex-grow:${value}"></i>`).join('');
    const legend = parts.map(([key, label, value]) => `<span class="is-${key}">${label} <b>${key === 'base' ? '' : '+'}${(0, runtime.deps.formatValue)('', value)}</b></span>`).join('');
    return `<div class="gem-level"><div class="gem-level-final"><small>${(0, runtime.deps._t)('최종')}</small><b>Lv.${(0, runtime.deps.formatValue)('', total)}</b></div><div class="gem-level-bar" aria-hidden="true">${bar}</div>`
        + `<div class="gem-level-legend">${legend}</div></div>${getGemCombatChipsHtml(runtime, presentation.skill)}`;
}

export function getGemCombatChipsHtml(runtime, skill) {
    const chips = [Number.isFinite(skill.dmg) ? ['피해 계수', skill.dmg.toFixed(2)] : null, Number.isFinite(skill.spd) ? ['속도', skill.spd.toFixed(2)] : null,
        Number.isFinite(skill.crit) ? ['치명타', `${skill.crit.toFixed(1)}%`] : null].filter(Boolean);
    return chips.length ? `<div class="gem-level-stats">${chips.map(([label, value]) => `<span><small>${label}</small><b>${value}</b></span>`).join('')}</div>` : '';
}

export function renderGemEnhanceTargetCard(runtime, name, selected, stats) {
    let def = runtime.deps.SKILL_DB[name] || {};
    let rec = (0, runtime.deps.normalizeGemRecord)((runtime.deps.game.gemData || {})[name]);
    let info = (0, runtime.deps.getUiGemPresentation)(name, false, stats);
    let meta = getGemCardMeta(runtime, def);
    let enhanceCount = (0, runtime.deps.getSkyEnhancementForSkill)(name).length;
    return `<button class="gem-target-card element-${meta.className} ${selected ? 'selected' : ''}" onclick="selectGemEnhanceTargetSkill('${name}')">${renderSkillGemArt(runtime, name, 'gem-target-icon')}<span><strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(name))}</strong><small>Lv.${(0, runtime.deps.formatValue)('', info.totalLevel)}, 퀄리티 ${rec.quality || 0}%, 각인 ${enhanceCount}/${rec.skyEnhanceCap || 1}${runtime.deps.gemDropRewards.spareCount(runtime.deps.game, name) ? (0, runtime.deps._t)(', 여분 {spareCount}개', { spareCount: runtime.deps.gemDropRewards.spareCount(runtime.deps.game, name) }) : ''}</small></span>${selected ? (0, runtime.deps._t)('<b>선택</b>') : ''}</button>`;
}

export function renderGemResourceStrip(runtime, activeGem, condensedPower) {
    let root = runtime.deps.document.getElementById('ui-gem-resource-strip');
    if (!root) return;
    root.innerHTML = `<div><span>${(0, runtime.deps._t)('군주의 핵')}</span><strong>${runtime.deps.game.currencies.bossCore || 0}</strong></div><div><span>${(0, runtime.deps._t)('창공의 정수')}</span><strong>${runtime.deps.game.currencies.skyEssence || 0}</strong></div><div><span>${(0, runtime.deps._t)('응축 창공')}</span><strong>${Math.floor(condensedPower || 0)}</strong></div><div><span>${(0, runtime.deps._t)('각성 잔향')}</span><strong>${runtime.deps.game.currencies.awakenedEcho || 0}</strong></div><div><span>${(0, runtime.deps._t)('고른 룬')}</span><strong>${!activeGem ? (0, runtime.deps._t)('없음') : activeGem.awakened ? (0, runtime.deps._t)('각성') : (0, runtime.deps._t)('각성 전')}</strong></div>`;
}

export function bindGemEngraveSlotControls(runtime, root) {
    if (!runtime.active || !root || runtime.state.engraveRoot === root) return;
    if (runtime.state.engraveRoot) {
        releaseViewTarget(runtime, runtime.state.engraveRoot);
        delete runtime.state.engraveRoot.dataset.engraveSlotControlsBound;
    }
    runtime.state.engraveRoot = root;
    root.dataset.engraveSlotControlsBound = 'true';
    listenView(runtime, root, 'pointerdown', event => {
        let button = event.target && event.target.closest ? event.target.closest('button[data-slot-index]') : null;
        if (button && root.contains(button)) event.stopPropagation();
    });
    listenView(runtime, root, 'click', event => {
        let button = event.target && event.target.closest ? event.target.closest('button[data-slot-index]') : null;
        if (!button || !root.contains(button) || button.disabled || button.dataset.slotState === 'locked') return;
        event.stopPropagation();
        runtime.handlers.openGemEngraveSlotOverlay(button.dataset.slotIndex);
    });
}
