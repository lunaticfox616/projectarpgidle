// 룬 카드: 룬 타일과 카드, 각인 칸, 소환 룬 장착, 보조 룬 단계 (2026-11-10에 js/ui.js에서 그대로 옮겼다. js/ui.js 뒤에 읽는다.)
// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).
(() => {
/** The gem picker's "worn only" fold, one per library ('attack' | 'support'). */
function toggleGemFoldMode(mode) {
    if (mode === 'attack') {
        game.gemFoldInactiveAttack = !game.gemFoldInactiveAttack;
    } else if (mode === 'support') {
        game.gemFoldInactiveSupport = !game.gemFoldInactiveSupport;
    }
    updateStaticUI();
}

function getGemCardMeta(def) {
    let tags = Array.isArray(def && def.tags) ? def.tags : [];
    let element = String((def && def.ele) || (tags.includes('fire') ? 'fire' : tags.includes('cold') ? 'cold' : tags.includes('lightning') ? 'light' : tags.includes('chaos') ? 'chaos' : 'phys'));
    let elementMap = {
        fire: { icon: '◆', label: _t('화염'), className: 'fire' },
        cold: { icon: '✦', label: _t('냉기'), className: 'cold' },
        light: { icon: 'ϟ', label: _t('번개'), className: 'lightning' },
        lightning: { icon: 'ϟ', label: _t('번개'), className: 'lightning' },
        chaos: { icon: '◈', label: _t('카오스'), className: 'chaos' },
        phys: { icon: '◇', label: _t('물리'), className: 'physical' },
        physical: { icon: '◇', label: _t('물리'), className: 'physical' }
    };
    let typeLabel = GEM_TYPE_LABELS.find(([tag]) => tags.includes(tag))?.[1] || '공격';
    let presentation = elementMap[element] || elementMap.phys;
    // elementLabel: a gem that hits with more than one element (분광 위습 소환) names them itself.
    return { typeLabel: typeLabel, icon: presentation.icon, elementLabel: def?.elementLabel || presentation.label, className: presentation.className };
}

/** 강화된 룬 그림의 표시(단계 글자와 빛, css/gem-core-forge.css). 상점과 강화 창은 options.plain으로 뺀다. */
function getRuneForgeAttrs(name, options) {
    const level = options?.plain ? 0 : Math.floor(Number(game.gemData?.[name]?.enhanceLevel) || 0);
    return level > 0 ? ` data-forge-plus="+${level}" data-forge-tier="${gemCoreForge.tierOf(level)}"` : '';
}

function renderSkillGemArt(name, className, options) {
    const forgeAttrs = getRuneForgeAttrs(name, options);
    const summonArt = supportGemSigil.summonHtml(name, className);
    if (summonArt) return summonArt.replace('<span ', `<span${forgeAttrs} `);
    let def = SKILL_DB[name] || {};
    let meta = getGemCardMeta(def);
    let artPath = getSkillGemArtPath(name);
    let opts = options || {};
    let loading = opts.eager ? 'eager' : 'lazy';
    let fallbackHidden = artPath ? ' hidden' : '';
    let image = artPath
        ? `<img src="${escapeHTML(artPath)}" alt="" loading="${loading}" decoding="async" onerror="this.hidden=true; this.nextElementSibling.hidden=false">`
        : '';
    return `<span${forgeAttrs} class="${className || 'gem-art'}" aria-label="${_t('{name} 룬 이미지', { name: escapeHTML(name) })}">${image}<span class="gem-art-fallback" aria-hidden="true"${fallbackHidden}>${meta.icon}</span></span>`;
}

function renderGemTagChips(def, maxTags) {
    let rawTags = Array.isArray(def && def.tags) ? def.tags : [];
    // 룬 상세(getUiGemPresentation)는 이미 한글로 바꾼 꼬리표를 넘긴다: 색을 고르려면 원래 키로 되돌린다(근접 → melee).
    let tagKey = tag => SKILL_TAG_LABELS[tag] ? tag : (Object.keys(SKILL_TAG_LABELS).find(key => SKILL_TAG_LABELS[key] === tag) || tag);
    let getTone = rawTag => {
        let tag = tagKey(rawTag);
        if (['fire', 'cold', 'light', 'lightning', 'chaos', 'phys', 'physical'].includes(tag)) return tag === 'light' ? 'lightning' : tag === 'phys' ? 'physical' : tag;
        if (['summon_attack', 'minion', 'summon'].includes(tag)) return 'summon';
        if (['spell', 'projectile', 'melee', 'slam', 'chain', 'pierce', 'dot', 'aoe', 'utility', 'curse', 'warcry', 'guard'].includes(tag)) return tag;
        return 'neutral';
    };
    return rawTags.slice(0, maxTags || 4).map(tag => {
        let label = typeof translateSkillTag === 'function' ? translateSkillTag(tag) : tag;
        return `<span class="gem-tag gem-tag--${getTone(tag)}">${escapeHTML(label)}</span>`;
    }).join('');
}

/** One line under a tile: how the gem attacks (range kind and reach), or the summon's element and kind. */
function getGemTileSummary(name, def) {
    let meta = getGemCardMeta(def);
    if ((def.tags || []).includes('summon')) return `${meta.elementLabel} ${meta.typeLabel}`;
    let profile = getSkillGridProfile(name, def);
    return _t('{value}, {max}칸', { value: _t(getSkillGridProfileKindLabel(profile.band ? 'band' : profile.kind)), max: Math.max(1, profile.range || 1) });
}

/** Tiles open the detail on click / Enter / Space (js/gem-selection-ui.js); a mouse hover shows the short hint. */
function getGemTileHandlers(type, name) {
    let action = `gemSelectionUi.open(this,'${type}','${name}')`;
    return `role="button" tabindex="0" onclick="${action}" onkeydown="if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();${action};}" onpointerenter="showGemCardHint(event,'${type}','${name}')" onpointerleave="hideInfoTooltip()"`;
}

function renderGemTileLevel(gemInfo) {
    return `<span class="gem-tile-level ${gemInfo.totalLevel > gemInfo.baseLevel ? 'effective' : ''}">Lv.${formatValue('', gemInfo.totalLevel)}</span>`;
}

/** 2026-10-04 룬 보드: the library lists compact tiles (art · name · Lv · one line). Range numbers, tags, seal and summon
 * count live in the detail the tile opens. */
/** 같은 룬을 여럿 가지면 칸에 적는 개수. */
function renderGemTileCopies(name) {
    const spares = gemDropRewards.spareCount(game, name);
    return spares ? `<span class="gem-tile-copies">×${spares + 1}</span>` : '';
}

function renderAttackGemCard(name, highlightedName, stats) {
    let def = SKILL_DB[name] || {};
    let gemInfo = getUiGemPresentation(name, false, stats);
    let meta = getGemCardMeta(def);
    let summonEquipped = (def.tags || []).includes('summon') && (game.equippedSummonSkills || []).includes(name);
    let active = summonEquipped || [game.activeSkill, game.mobilitySkill].includes(name);
    let equipmentReady = typeof canUseSkillWithCurrentEquipment !== 'function' || canUseSkillWithCurrentEquipment(name);
    let state = equipmentReady ? getGemTileSummary(name, def) : getSkillRuneWeaponNote(name);
    let classes = ['skill-gem', 'gem-library-card', 'gem-tile', `element-${meta.className}`, active ? 'active' : '', equipmentReady ? '' : 'equipment-blocked'].filter(Boolean).join(' ');
    let worn = active ? `<span class="gem-tile-worn">${summonEquipped ? _t('소환 ×{name}', { name: getSummonSkillCount(name) }) : _t('장착')}</span>` : '';
    return `<article class="${classes}" ${getGemTileHandlers('active', name)} aria-label="${escapeHTML(name)} Lv.${formatValue('', gemInfo.totalLevel)}${active ? _t(', 장착 중') : ''}${equipmentReady ? '' : ', ' + escapeHTML(getSkillRuneWeaponNote(name))}">
        ${renderGemTileLevel(gemInfo)}${worn}${renderGemTileCopies(name)}${renderSkillGemArt(name, 'gem-card-sigil gem-card-art gem-tile-art')}
        <strong class="gem-tile-name">${highlightedName}</strong><small class="gem-usage-state">${escapeHTML(state)}</small>
    </article>`;
}

/** Why a support gem cannot go on right now ('' when it can, or when it is already worn). */
function getSupportEquipFailure(name, stats) {
    if ((game.equippedSupports || []).includes(name)) return '';
    let equippedSupports = game.equippedSupports || [];
    let supportCap = Math.max(0, Math.floor((stats && stats.suppCap) || 0));
    if (equippedSupports.length >= supportCap) return '';
    const conflict = window.GameModules.skills.supports.conflictReason(name, game);
    if (conflict) return conflict;
    if (gemDropRewards.allowsResonanceOverflow(stats)) return '';
    let used = equippedSupports.reduce((sum, supportName) => sum + getSupportTierResonanceCost(supportName), 0);
    let available = Math.max(0, getEffectiveResonanceCap(stats) - used);
    let cost = getSupportTierResonanceCost(name);
    return available < cost ? _t('공명력 {value} 모자람', { value: cost - available }) : '';
}

function renderSupportGemCard(name, highlightedName, stats) {
    let gemInfo = getUiGemPresentation(name, true, stats);
    let active = (game.equippedSupports || []).includes(name);
    let failure = getSupportEquipFailure(name, stats);
    let tier = getSupportActiveTier(name);
    let state = failure || gemSelectionUi.application(name, stats);
    let classes = ['skill-gem', 'support-gem', 'gem-library-card', 'gem-tile', `is-tone-${supportGemSigil.tone(name)}`, active ? 'active' : '', failure ? 'equipment-blocked' : ''].filter(Boolean).join(' ');
    return `<article class="${classes}" ${getGemTileHandlers('support', name)} aria-label="${escapeHTML(name)}${active ? _t(', 장착 중') : (failure ? `, ${escapeHTML(failure)}` : '')}">
        ${renderGemTileLevel(gemInfo)}${active ? _t('<span class="gem-tile-worn">장착</span>') : ''}${supportGemSigil.html(name, 'gem-card-sigil gem-tile-art gem-tile-support-art', tier)}
        <strong class="gem-tile-name">${highlightedName}</strong>${gemSelectionUi.indicators(name)}<small class="gem-usage-state">${escapeHTML(state)}</small>
        <span class="support-library-effect">${escapeHTML(gemSelectionUi.effectText(name, tier, stats))}</span><small>${_t('공명 {name}, {value}', { name: getSupportTierResonanceCost(name), value: active ? _t('등급과 교체 보기') : _t('후보 상세 보기') })}</small>
    </article>`;
}

/** Gem card hover, mouse only (a tap opens the detail instead): the full gem tooltip with its numbers (2026-10-11 사용자: 룬을
 * 고르는 곳의 툴팁에 수치가 없었다, 이름과 설명만 보였다). showGemTooltip stays quiet while the detail popover is open. */
function showGemCardHint(event, type, name) {
    if (event.pointerType === 'mouse') showGemTooltip(event, type, name);
}

/** 룬 레벨 구성(2026-10-09): 최종 레벨을 크게, 기본/재료와 각성/장비와 패시브를 한 막대에 나눠 칠하고, 그 아래 전투 수치 칩. 작은 4칸 표였다. */
function getGemGrowthSummaryHtml(name, presentation) {
    if (!presentation || !presentation.skill) return '';
    const base = Number(presentation.baseLevel) || 1, material = Number(presentation.materialBonus) || 0;
    const total = Number(presentation.totalLevel || presentation.finalLevel) || 1;
    const parts = [['base', '기본', base], ['material', '재료/각성', material], ['source', '장비/패시브', Math.max(0, total - base - material)]];
    const bar = parts.map(([key, , value]) => `<i class="is-${key}" style="flex-grow:${value}"></i>`).join('');
    const legend = parts.map(([key, label, value]) => `<span class="is-${key}">${label} <b>${key === 'base' ? '' : '+'}${formatValue('', value)}</b></span>`).join('');
    return `<div class="gem-level"><div class="gem-level-final"><small>${_t('최종')}</small><b>Lv.${formatValue('', total)}</b></div><div class="gem-level-bar" aria-hidden="true">${bar}</div>`
        + `<div class="gem-level-legend">${legend}</div></div>${getGemCombatChipsHtml(presentation.skill)}`;
}

function getGemCombatChipsHtml(skill) {
    const chips = [Number.isFinite(skill.dmg) ? ['피해 계수', skill.dmg.toFixed(2)] : null, Number.isFinite(skill.spd) ? ['속도', skill.spd.toFixed(2)] : null,
        Number.isFinite(skill.crit) ? ['치명타', `${skill.crit.toFixed(1)}%`] : null].filter(Boolean);
    return chips.length ? `<div class="gem-level-stats">${chips.map(([label, value]) => `<span><small>${label}</small><b>${value}</b></span>`).join('')}</div>` : '';
}

function renderGemEnhanceTargetCard(name, selected, stats) {
    let def = SKILL_DB[name] || {};
    let rec = normalizeGemRecord((game.gemData || {})[name]);
    let info = getUiGemPresentation(name, false, stats);
    let meta = getGemCardMeta(def);
    let enhanceCount = getSkyEnhancementForSkill(name).length;
    return `<button class="gem-target-card element-${meta.className} ${selected ? 'selected' : ''}" onclick="selectGemEnhanceTargetSkill('${name}')">${renderSkillGemArt(name, 'gem-target-icon')}<span><strong>${escapeHTML(_t(name))}</strong><small>Lv.${formatValue('', info.totalLevel)}, 퀄리티 ${rec.quality || 0}%, 각인 ${enhanceCount}/${rec.skyEnhanceCap || 1}${gemDropRewards.spareCount(game, name) ? _t(', 여분 {spareCount}개', { spareCount: gemDropRewards.spareCount(game, name) }) : ''}</small></span>${selected ? _t('<b>선택</b>') : ''}</button>`;
}

function renderGemResourceStrip(activeGem, condensedPower) {
    let root = document.getElementById('ui-gem-resource-strip');
    if (!root) return;
    root.innerHTML = `<div><span>${_t('군주의 핵')}</span><strong>${game.currencies.bossCore || 0}</strong></div><div><span>${_t('창공의 정수')}</span><strong>${game.currencies.skyEssence || 0}</strong></div><div><span>${_t('응축 창공')}</span><strong>${Math.floor(condensedPower || 0)}</strong></div><div><span>${_t('각성 잔향')}</span><strong>${game.currencies.awakenedEcho || 0}</strong></div><div><span>${_t('고른 룬')}</span><strong>${!activeGem ? _t('없음') : activeGem.awakened ? _t('각성') : _t('각성 전')}</strong></div>`;
}

function bindGemEngraveSlotControls(root) {
    if (!root || root.dataset.engraveSlotControlsBound === 'true') return;
    root.dataset.engraveSlotControlsBound = 'true';
    root.addEventListener('pointerdown', event => {
        let button = event.target && event.target.closest ? event.target.closest('button[data-slot-index]') : null;
        if (button && root.contains(button)) event.stopPropagation();
    });
    root.addEventListener('click', event => {
        let button = event.target && event.target.closest ? event.target.closest('button[data-slot-index]') : null;
        if (!button || !root.contains(button) || button.disabled || button.dataset.slotState === 'locked') return;
        event.stopPropagation();
        openGemEngraveSlotOverlay(button.dataset.slotIndex);
    });
}

function renderGemEngraveSlots(activeSlots, engraveCap) {
    let root = document.getElementById('ui-gem-engrave-slots');
    if (!root) return;
    bindGemEngraveSlotControls(root);
    let active = getGemEnhanceTargetSkill();
    if (typeof isEnhanceableAttackGem === 'function' && !isEnhanceableAttackGem(active)) {
        let emptySignature = `empty:${active || ''}`;
        if (root.dataset.renderSig !== emptySignature) {
            root.innerHTML = '<div class="gem-process-empty">장착 중인 공격 룬을 선택하면 중앙 각인 장치가 활성화됩니다.</div>';
            root.dataset.renderSig = emptySignature;
        }
        return;
    }
    let normalizedCap = Math.max(1, Math.min(5, Math.floor(Number(engraveCap) || 1)));
    let sourceSlots = Array.isArray(activeSlots) ? activeSlots : [];
    let normalizedSlots = Array.from({ length: 5 }, (_, index) => sourceSlots[index] || null);
    let nextUnlockCost = normalizedCap < 5 ? normalizedCap + 1 : 0;
    let canAffordNextSlot = nextUnlockCost > 0 && (game.currencies.skyEssence || 0) >= nextUnlockCost;
    let renderSignature = JSON.stringify([active, normalizedCap, normalizedSlots, canAffordNextSlot]);
    if (root.dataset.renderSig === renderSignature) return;
    let slots = [];
    let spokes = [];
    for (let index = 0; index < 5; index++) {
        let enhancement = normalizedSlots[index] ? GEM_SKY_ENHANCEMENTS[normalizedSlots[index]] : null;
        let unlocked = index < normalizedCap;
        let nextUnlock = index === normalizedCap && normalizedCap < 5;
        let unlockReady = nextUnlock && canAffordNextSlot;
        let stateClass = enhancement ? 'filled' : unlocked ? 'open' : unlockReady ? 'unlockable' : nextUnlock ? 'unaffordable' : 'locked';
        let title = enhancement
            ? _t('{value}번 슬롯, {name}, 눌러서 교체 또는 해제', { value: index + 1, name: enhancement.name })
            : unlocked
                ? _t('{value}번 빈 각인 슬롯, 눌러서 각인 선택', { value: index + 1 })
                : nextUnlock
                    ? _t('{value}번 슬롯 해금, 창공의 정수 {value2}{value3}', { value: index + 1, value2: index + 1, value3: unlockReady ? '' : _t(', 재화 부족') })
                    : _t('{value}번 잠긴 슬롯, 앞 슬롯부터 해금 필요', { value: index + 1 });
        let group = enhancement ? getSkyEnhancementGroup(enhancement) : null;
        let glyph = enhancement ? renderSkyEnhancementIcon(enhancement) : unlocked ? '' : nextUnlock ? '+' : '×';
        let orbitAngle = -90 + index * 72;
        let orbitRadius = 38.5;
        let orbitX = 50 + Math.cos(orbitAngle * Math.PI / 180) * orbitRadius;
        let orbitY = 50 + Math.sin(orbitAngle * Math.PI / 180) * orbitRadius;
        spokes.push(`<span class="gem-orbit-spoke" aria-hidden="true" style="--orbit-angle:${orbitAngle}deg"></span>`);
        slots.push(`<button type="button" class="gem-orbit-slot slot-${index + 1} ${stateClass} ${group ? `group-${group.className}` : ''}" style="--slot-x:${orbitX.toFixed(3)}%;--slot-y:${orbitY.toFixed(3)}%" data-tip="${escapeHTML(title)}" aria-label="${escapeHTML(title)}" aria-pressed="${enhancement ? 'true' : 'false'}" aria-disabled="${!unlocked && !nextUnlock ? 'true' : 'false'}" data-slot-index="${index}" data-slot-state="${stateClass}" ${!unlocked && !nextUnlock ? 'tabindex="-1"' : ''}><span class="gem-orbit-slot-glyph" aria-hidden="true"><b>${glyph}</b></span>${enhancement ? `<em>${escapeHTML(_t(enhancement.name))}</em>` : nextUnlock ? `<em>${unlockReady ? _t('슬롯 해금') : _t('재화 부족')}</em>` : ''}</button>`);
    }
    root.innerHTML = `<div class="gem-orbit-stage"><div class="gem-orbit-rings" aria-hidden="true"></div>${spokes.join('')}<div class="gem-orbit-center element-${getGemCardMeta(SKILL_DB[active] || {}).className}">${renderSkillGemArt(active, 'gem-orbit-art', { eager: true })}<span>${_t('각인 대상')}</span><strong>${escapeHTML(active)}</strong></div>${slots.join('')}</div><div class="gem-orbit-copy"><strong>${_t('중앙 룬과 연결된 슬롯을 선택하세요')}</strong><span class="gem-orbit-legend"><b class="is-empty"><i></i>${_t('빈 슬롯')}</b><b class="is-filled"><i></i>${_t('각인됨')}</b><b class="is-unlockable"><i>+</i>${_t('해금 가능')}</b></span></div>`;
    root.dataset.renderSig = renderSignature;
}

/** @returns {string} SVG markup for the engraving's icon (class sky-engrave-icon is-<group>). */
function renderSkyEnhancementIcon(enhancement) {
    let name = enhancement.projectilePatternMode ? SKY_PROJECTILE_ICONS[enhancement.projectilePatternMode] : SKY_ENHANCEMENT_ICON_BY_STAT[enhancement.stat];
    return renderPixelIcon(name, `sky-engrave-icon is-${getSkyEnhancementGroup(enhancement).className}`);
}

/** @param {string} name a PIXEL_ICONS key (unknown → star) @param {string} className svg class @returns {string} crisp 11×11 SVG */
function renderPixelIcon(name, className) {
    let rects = [];
    (PIXEL_ICONS[name] || PIXEL_ICONS.star).forEach((row, y) => {
        for (let match of row.matchAll(/#+|o+/g)) rects.push(`<rect class="${match[0][0] === '#' ? 'm' : 'f'}" x="${match.index}" y="${y}" width="${match[0].length}" height="1"/>`);
    });
    return `<svg class="${className}" viewBox="0 0 11 11" shape-rendering="crispEdges" aria-hidden="true">${rects.join('')}</svg>`;
}

function getSkyEnhancementGroup(enhancement) {
    if (enhancement.projectilePatternMode) return { label: _t('탄도'), className: 'crafted' };
    if (String(enhancement.id || '').startsWith('sky_awakened')) return { label: _t('각성'), className: 'awakened' };
    if (String(enhancement.id || '').startsWith('sky_gemcraft')) return { label: _t('조율'), className: 'crafted' };
    return { label: _t('기본'), className: 'basic' };
}

function renderSkyEnhancementOption(enhancement, activeSlots, isGem) {
    let applied = activeSlots.includes(enhancement.id);
    let locked = !canUseSkyEnhancement(enhancement.id);
    let removeCost = typeof getSkyGemEnhancementRemoveCost === 'function' ? getSkyGemEnhancementRemoveCost() : 0;
    let group = getSkyEnhancementGroup(enhancement);
    let compatible = typeof isSkyEnhancementCompatibleWithSkill !== 'function' || isSkyEnhancementCompatibleWithSkill(enhancement.id, getGemEnhanceTargetSkill());
    let actionLabel = applied ? _t('적용 중, 해제 창공 {removeCost}', { removeCost }) : !compatible ? '투사체 룬 전용' : locked ? '룬 각성 해금 필요' : '창공 1';
    return `<button class="gem-engrave-option group-${group.className} ${applied ? 'applied' : ''}" onclick="toggleSkyGemEnhancement('${enhancement.id}')" ${!isGem || !compatible || (locked && !applied) ? 'disabled' : ''}>${renderEngraveOptionFace(enhancement, group, actionLabel)}</button>`;
}

/** The face of an engraving card (전체 각인 list and the slot overlay): icon in the group colour, name, then the effect in the stat
 * colours at reading size. 2026-10-11 사용자: 색이 없고 글씨가 작아 어떤 효과인지 읽기 어려웠다(효과가 8px 흰 글씨였다). */
function renderEngraveOptionFace(enhancement, group, stateLabel) {
    return `<span class="gem-engrave-icon">${renderSkyEnhancementIcon(enhancement)}</span><span class="gem-engrave-copy"><span class="gem-engrave-top"><strong>${escapeHTML(_t(enhancement.name))}</strong><em>${_t(group.label)}</em></span>`
        + `<small>${statToneText.html(_t(enhancement.desc))}</small><b class="gem-engrave-state">${stateLabel}</b></span>`;
}

function renderGemEngraveOverlayOption(enhancement, slots, slotIndex) {
    let current = slots[slotIndex] === enhancement.id;
    let usedElsewhere = slots.some((id, index) => index !== slotIndex && id === enhancement.id);
    let locked = !canUseSkyEnhancement(enhancement.id);
    let group = getSkyEnhancementGroup(enhancement);
    let compatible = typeof isSkyEnhancementCompatibleWithSkill !== 'function' || isSkyEnhancementCompatibleWithSkill(enhancement.id, getGemEnhanceTargetSkill());
    let state = current ? '현재 각인, 누르면 해제' : usedElsewhere ? '다른 슬롯에 적용 중' : !compatible ? '투사체 룬 전용' : locked ? '룬 각성 해금 필요' : '이 슬롯에 각인';
    return `<button type="button" class="gem-engrave-option group-${group.className} ${current ? 'applied' : ''}" data-engrave-id="${enhancement.id}" data-action="${current ? 'remove' : 'apply'}" ${usedElsewhere || !compatible || (locked && !current) ? 'disabled' : ''}>${renderEngraveOptionFace(enhancement, group, state)}</button>`;
}

function isSummonAttackSkillGem(name) {
    let gemDef = SKILL_DB[name] || {};
    return !!(gemDef && Array.isArray(gemDef.tags) && gemDef.tags.includes('summon'));
}

function normalizeEquippedSummonAttackSkills() {
    game.equippedSummonSkills = Array.isArray(game.equippedSummonSkills) ? game.equippedSummonSkills : [];
    game.summonSkillCounts = (game.summonSkillCounts && typeof game.summonSkillCounts === 'object') ? game.summonSkillCounts : {};
    let owned = Array.isArray(game.skills) ? game.skills : [];
    game.equippedSummonSkills = Array.from(new Set(game.equippedSummonSkills.filter(gemName => isSummonAttackSkillGem(gemName) && owned.includes(gemName))));
    // 가호(사역룬)는 하나만 걸린다: 전령 둘이 가호 둘로 이관된 저장은 첫 가호만 끼운 채로 둔다(나머지는 보유로 남는다)
    let blessing = game.equippedSummonSkills.find(gemName => SKILL_DB[gemName].aura);
    game.equippedSummonSkills = game.equippedSummonSkills.filter(gemName => !SKILL_DB[gemName].aura || gemName === blessing);
    Object.keys(game.summonSkillCounts).forEach(gemName => {
        if (!game.equippedSummonSkills.includes(gemName)) delete game.summonSkillCounts[gemName];
    });
    game.equippedSummonSkills.forEach(gemName => {
        let count = Math.max(1, Math.floor(Number(game.summonSkillCounts[gemName]) || 1));
        game.summonSkillCounts[gemName] = SKILL_DB[gemName].tags.includes('summon_attack') ? count : 1;
    });
    return game.equippedSummonSkills;
}

function getSummonSkillCount(name) {
    normalizeEquippedSummonAttackSkills();
    return Math.max(0, Math.floor(Number((game.summonSkillCounts || {})[name]) || 0));
}

function getEquippedSummonAttackCount() {
    return normalizeEquippedSummonAttackSkills().reduce((sum, name) => sum + getSummonSkillCount(name), 0);
}

function getEquippedSummonCount() {
    return getEquippedSummonAttackCount();
}

function getSummonEquipCapFromStats(stats) {
    let maximum = typeof getSummonCapMaximum === 'function'
        ? getSummonCapMaximum()
        : (typeof hasKeystone === 'function' && hasKeystone('sb9') ? 12 : 8);
    return Math.max(1, Math.min(maximum, Math.floor((stats && stats.summonCap) || 1)));
}

/** 가호(사역룬)는 하나만 걸린다(2026-10-24 스킬룬 추가본 v54 "가호는 하나만(새로 쓰면 바뀜)"): name이 가호면 끼워져 있는 다른 가호, 아니면 null. */
function getOtherWornBlessing(name) {
    if (!SKILL_DB[name].aura) return null;
    return game.equippedSummonSkills.find(gemName => gemName !== name && SKILL_DB[gemName]?.aura) || null;
}

/** 끼워져 있던 가호(replaced, 없으면 그대로)를 빼고 그 자리에 name이 들어간다고 알린다. */
function takeOffWornBlessing(replaced, name) {
    if (!replaced) return;
    game.equippedSummonSkills = game.equippedSummonSkills.filter(gemName => gemName !== replaced);
    delete game.summonSkillCounts[replaced];
    addLog(_t('가호는 하나만 걸립니다. [{replaced}] 대신 [{name}]{particle} 끼웠습니다.', { replaced: _t(replaced), name: _t(name), particle: pickParticle(name, '을', '를') }), 'season-up');
}

function changeSummonSkillCount(name, delta) { if (!assertBuildEditable()) return;
    if (!isSummonAttackSkillGem(name) || !Array.isArray(game.skills) || !game.skills.includes(name)) return;
    normalizeEquippedSummonAttackSkills();
    game.summonLoadoutInitialized = true;
    let current = getSummonSkillCount(name);
    if (delta > 0) {
        let cap = getSummonEquipCapFromStats(getUiPlayerStats(null));
        // 가호는 하나만: 다른 가호가 끼워져 있으면 그 자리에 새 가호가 들어간다
        let replaced = getOtherWornBlessing(name);
        if (getEquippedSummonCount() - Number(!!replaced) >= cap) return addLog(_t('소환수 한도({cap})로 인해 [{name}]{particle} 추가 소환할 수 없습니다.', { cap, name: _t(name), particle: pickParticle(name, '을', '를') }), 'attack-monster');
        takeOffWornBlessing(replaced, name);
        if (!game.equippedSummonSkills.includes(name)) game.equippedSummonSkills.push(name);
        game.summonSkillCounts[name] = Number(SKILL_DB[name].tags.includes('summon_attack')) * current + 1;
        playUiFeedbackSound('gemSocket');
        if (SKILL_DB[name] && SKILL_DB[name].isGem) game.gemEnhanceTargetSkill = name;
        if (game.activeSkill === name) game.activeSkill = '기본 공격';
        updateStaticUI();
        return;
    }
    if (current <= 1) {
        game.equippedSummonSkills = game.equippedSummonSkills.filter(gemName => gemName !== name);
        delete game.summonSkillCounts[name];
    } else {
        game.summonSkillCounts[name] = current - 1;
    }
    if (game.activeSkill === name) game.activeSkill = '기본 공격';
    updateStaticUI();
}

/** A worn summon gem comes off its slots; another one goes on (as far as the summon cap allows). */
function toggleSummonAttackGem(name) {
    normalizeEquippedSummonAttackSkills();
    if (!game.equippedSummonSkills.includes(name)) return changeSummonSkillCount(name, 1);
    game.summonLoadoutInitialized = true;
    game.equippedSummonSkills = game.equippedSummonSkills.filter(gemName => gemName !== name);
    delete game.summonSkillCounts[name];
    if (game.activeSkill === name) game.activeSkill = '기본 공격';
    updateStaticUI();
}

/** 이동 스킬 칸 (js/mobility-skill.js): a mobility gem is worn in its own slot next to the main gem ('' takes it off). */
function wearMobilityGem(name) {
    if (name && name !== game.mobilitySkill) playUiFeedbackSound('gemSocket');
    game.mobilitySkill = name;
    mobilitySkill.reset();
    if (name) game.gemEnhanceTargetSkill = name;
    updateStaticUI();
}

/** 이동 룬은 보통 이동 칸에 간다. 칼이 된 발걸음(data/items.js)을 신으면 공격 칸으로 간다: 룬 창이 공격 칸을 골랐거나 공격 칸에 이동
 * 룬이 아직 없을 때. 공격 칸의 이동 룬을 이동 칸으로 고르면 공격 칸은 기본 공격이 된다. 이동 칸에 있던 룬을 공격 칸으로 옮기는 일은
 * 룬 창이 이동 칸을 먼저 비우고 부른다(js/gem-slot-dialog-ui.js chooseSlotGem). */
function wearMobilityRune(name, slotKind) {
    const boots = isMobilityRuneAttackWorn(game);
    if (boots && name === game.activeSkill && slotKind !== 'mobility') return updateStaticUI();
    const toAttack = boots && slotKind !== 'mobility' && (slotKind === 'active' || !mobilitySkill.isMobilityGem(game.activeSkill));
    if (!toAttack) {
        if (name === game.activeSkill) game.activeSkill = '기본 공격';
        return wearMobilityGem(name);
    }
    game.activeSkill = name;
    game.gemEnhanceTargetSkill = name;
    playUiFeedbackSound('gemSocket');
    updateStaticUI();
}

function openEquippedGemManagement(name) {
    if (!game.gemEnhanceUnlocked) return addLog(_t('룬 강화는 군주의 핵 또는 창공의 정수를 획득하면 개방됩니다.'), 'attack-monster');
    let equipped = typeof getEquippedEnhanceableGemNames === 'function' ? getEquippedEnhanceableGemNames() : [];
    if (!equipped.includes(name)) return addLog(_t('장착 중인 공격 룬만 강화할 수 있습니다.'), 'attack-monster');
    game.gemEnhanceTargetSkill = name;
    game.gemEngraveSelectedSlot = 0;
    switchSkillSubtab('skill-tab-enhance');
    updateStaticUI();
}

function getEffectiveResonanceCap(statsOverride) {
    return gemDropRewards.resonanceCap(game, statsOverride || getUiPlayerStats(null));
}

function getSupportTierResonanceCost(name) {
    return getSupportResonanceCostAtTier(name,getSupportActiveTier(name));
}

function getSupportActiveTier(name) {
    let rec = normalizeGemRecord(((game.supportGemData || {})[name]) || { level: 1, exp: 0 });
    let cap = typeof getSupportTierCap === 'function' ? getSupportTierCap(name) : 3;
    let unlocked = Math.max(1, Math.min(cap, Math.floor(rec.unlockedTier || 1)));
    let active = Math.max(1, Math.min(unlocked, Math.floor(rec.activeTier || 1)));
    rec.unlockedTier = unlocked;
    rec.activeTier = active;
    game.supportGemData = game.supportGemData || {};
    game.supportGemData[name] = rec;
    return active;
}

function setSupportActiveTier(name, tier) { if (!assertBuildEditable()) return;
    if (!SUPPORT_GEM_DB[name]) return;
    let rec = normalizeGemRecord(((game.supportGemData || {})[name]) || { level: 1, exp: 0 });
    let cap = typeof getSupportTierCap === 'function' ? getSupportTierCap(name) : 3;
    rec.unlockedTier = Math.max(1, Math.min(cap, Math.floor(rec.unlockedTier || 1)));
    let nextTier = Math.max(1, Math.min(rec.unlockedTier, Math.floor(tier || 1)));
    let prevTier = Math.max(1, Math.min(rec.unlockedTier, Math.floor(rec.activeTier || 1)));
    let equipped = (game.equippedSupports || []).includes(name);
    if (equipped && nextTier !== prevTier) {
        let used = (game.equippedSupports || []).reduce((sum, n) => sum + getSupportTierResonanceCost(n), 0);
        rec.activeTier = nextTier;
        game.supportGemData[name] = rec;
        let nextUsed = (game.equippedSupports || []).reduce((sum, n) => sum + getSupportTierResonanceCost(n), 0);
        const stats = getUiPlayerStats();
        let resonancePower = getEffectiveResonanceCap(stats);
        if (gemDropRewards.exceedsResonanceBudget(stats, nextUsed, resonancePower)) {
            rec.activeTier = prevTier;
            game.supportGemData[name] = rec;
            let need = Math.max(0, nextUsed - used);
            let remain = Math.max(0, resonancePower - used);
            return addLog(_t('공명력 부족 ({remain}/{need})', { remain, need }), 'attack-monster', { toast: true });
        }
    } else {
        rec.activeTier = nextTier;
        game.supportGemData[name] = rec;
    }
    normalizeSupportLoadout(false);
    updateStaticUI();
}

function toggleSupport(name) { if (!assertBuildEditable()) return;
    if (![contentProgression.isUnlocked('support'), game.supports.includes(name), SUPPORT_GEM_DB[name]].every(Boolean)) return;
    normalizeSupportLoadout(false);
    game.equippedSupports = Array.isArray(game.equippedSupports) ? game.equippedSupports : [];
    let idx = game.equippedSupports.indexOf(name);
    if (idx > -1) game.equippedSupports.splice(idx, 1);
    else {
        let stats = getUiPlayerStats();
        if (game.equippedSupports.length >= stats.suppCap) {
            addLog(_t('보조스킬룬 장착 한도 부족 ({length}/{max}), 다른 보조스킬룬을 먼저 해제하세요.', { length: game.equippedSupports.length, max: Math.max(0, Math.floor(stats.suppCap || 0)) }), 'attack-monster', { toast: true });
            updateStaticUI();
            return;
        }
        const conflict = window.GameModules.skills.supports.conflictReason(name, game);
        if (conflict) return addLog(conflict, 'attack-monster', { toast: true });
        let used = game.equippedSupports.reduce((sum, n) => sum + getSupportTierResonanceCost(n), 0);
        let remain = Math.max(0, getEffectiveResonanceCap(stats) - used);
        let cost = getSupportTierResonanceCost(name);
        if (remain < cost && !gemDropRewards.allowsResonanceOverflow(stats)) return addLog(_t('공명력 부족 ({remain}/{cost})', { remain, cost }), 'attack-monster', { toast: true });
        game.equippedSupports.push(name);
        playUiFeedbackSound('gemSocket');
    }
    updateStaticUI();
}

exposeFileGlobals({ toggleGemFoldMode, getGemCardMeta, renderSkillGemArt, renderGemTagChips, getGemTileSummary, renderGemTileLevel, renderAttackGemCard, renderSupportGemCard, showGemCardHint, getGemGrowthSummaryHtml, renderGemEnhanceTargetCard, renderGemResourceStrip, renderGemEngraveSlots, renderSkyEnhancementIcon, renderPixelIcon, getSkyEnhancementGroup, renderSkyEnhancementOption, renderGemEngraveOverlayOption, normalizeEquippedSummonAttackSkills, getSummonSkillCount, getEquippedSummonCount, getSummonEquipCapFromStats, changeSummonSkillCount, toggleSummonAttackGem, wearMobilityGem, wearMobilityRune, openEquippedGemManagement, getEffectiveResonanceCap, getSupportTierResonanceCost, getSupportActiveTier, setSupportActiveTier, toggleSupport });
})();

safeExposeGlobals({ openEquippedGemManagement });
