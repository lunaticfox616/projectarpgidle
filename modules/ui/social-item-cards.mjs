// item-cards: explicit account state and dependency ports; no ambient game/global state.
export class SocialItemCards {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["renderProfileItemCard","profileEquipmentView","profileSharedAffix","renderProfileKindCard","profileItemTitleHtml","profileItemHallHtml","profileBaseLineHtml","profileLevelLineHtml","profileRequirementText","profileItemUniqueHtml","profileItemSocketsHtml","profileJewelSummary","profileItemFusionHtml","profileItemOptionsHtml","profileAffixHeaderText","profileExplicitStats","profileBaseOptionsHtml","profileWardSlotsHtml","profileBaseStatHtml","profileDefenseLinesHtml","profileExplicitLineHtml","profileAffixParts","profileAffixSuffixHtml","profileTierHtml","profileRollBound","profileRollRangeHtml","profileExceptionalMark","profileEmberScaleHtml","profileItemAnointHtml","profileItemEmberHtml","profileItemEncroachHtml"].forEach(name => { this[name] = this[name].bind(this); });
    }

    renderProfileItemCard(item) {
        if (!item) return '';
        if (item.kind) return this.renderProfileKindCard(item);
        item = this.profileEquipmentView(item);
        let color = this.services.format.socialRarityColor(item.rarity);
        return `<div class="social-item-card" style="border-color:${color};">${this.profileItemTitleHtml(item, color)}${this.profileItemHallHtml(item)}`
            + `${this.profileBaseLineHtml(item)}${this.profileLevelLineHtml(item)}${this.profileItemUniqueHtml(item)}${this.profileItemSocketsHtml(item)}`
            + `${this.profileItemFusionHtml(item)}${this.profileItemOptionsHtml(item)}</div>`;
    }

    profileEquipmentView(item) {
        return { ...item,
            baseStats: this.services.profileValues.profileSnapshotRows(item.baseStats, this.data.SOCIAL_ITEM_ARRAY_LIMITS.baseStats),
            stats: this.services.profileValues.profileSnapshotRows(item.stats, this.data.SOCIAL_ITEM_ARRAY_LIMITS.stats).map(this.profileSharedAffix),
            chaosInfusion: item.chaosInfusion ? this.profileSharedAffix(item.chaosInfusion) : item.chaosInfusion,
            emberLines: this.services.profileValues.profileSnapshotRows(item.emberLines, this.data.SOCIAL_ITEM_ARRAY_LIMITS.ember).map(this.profileSharedAffix),
            encroached: item.encroached ? { ...item.encroached, chosen: this.profileSharedAffix(item.encroached.chosen) } : item.encroached };
    }

    profileSharedAffix(stat) {
        if (!stat || typeof stat !== 'object') return stat;
        return { ...stat, extraStats: this.services.profileValues.profileSnapshotRows(stat.extraStats, this.data.SOCIAL_ITEM_ARRAY_LIMITS.extraStats) };
    }

    renderProfileKindCard(item) {
        if (item.kind === 'jewel') return this.services.specialCards.renderProfileJewelCard(item);
        if (item.kind === 'talisman') return this.services.specialCards.renderProfileTalismanCard(item);
        if (item.kind === 'core') return this.services.specialCards.renderProfileCoreCard(item);
        return item.kind === 'stump' ? this.services.specialCards.renderProfileStumpCard(item) : this.services.specialCards.renderSimpleCard(item);
    }

    profileItemTitleHtml(item, color) {
        let stars = typeof this.deps.getExceptionalBaseStars === 'function' && Array.isArray(item.baseStats) ? this.deps.getExceptionalBaseStars(item) : '';
        let badges = (item.encroached ? ' <span style="color:#b084ff;">(잠식)</span>' : '') + (item.corrupted ? ' <span style="color:#e74c3c;">(타락)</span>' : '')
            + (item.loopSealed ? ' <span style="color:#7fd99a;">🌿봉인</span>' : '');
        return `<div class="social-item-title" style="color:${color};">${item.slot ? `[${this.services.format.socialEscape(this.services.profileValues.profileItemTag(item))}] ` : ''}${this.services.format.socialEscape(item.name)}`
            + `${stars ? ` <span style="color:#ffb454;">${stars}</span>` : ''}${badges}</div>`;
    }

    profileItemHallHtml(item) {
        if (item.hallReplica) {
            return `<div class="social-item-stat" style="color:#d2b878;">🏛️ 전당 소장품, 전시자 ${this.services.format.socialEscape(item.hallCuratorName || '익명')}, `
                + `${this.deps._t('감정 {max}, 제작과 재등록 불가', { max: Math.max(0, Math.floor(Number(item.hallAppraisalScore) || 0)).toLocaleString() })}</div>`;
        }
        return item.hallRelistBlocked ? '<div class="social-item-stat" style="color:#bda979;">🏛️ 전당 복제 이력, 재등록 불가</div>' : '';
    }

    profileBaseLineHtml(item) {
        if (!item.baseName) return '';
        let info = Array.isArray(item.baseStep) ? { step: Math.floor(Number(item.baseStep[0]) || 0), total: Math.floor(Number(item.baseStep[1]) || 0) } : null;
        let step = info ? ` <span class="${this.deps.getBaseStepClassName(info)}">[${info.step}/${info.total}]</span>` : '';
        return `<div class="social-item-base">${this.deps._t('베이스: {baseName}{step}', { baseName: this.services.format.socialEscape(item.baseName), step })}</div>`;
    }

    profileLevelLineHtml(item) {
        let level = Math.floor(Number(item.itemLevel) || 0), grade = Math.floor(Number(item.grade) || 0);
        let gradeHtml = grade && typeof this.deps.getTierBadgeHtml === 'function' ? this.deps._t(' 등급 {grade}', { grade: this.deps.getTierBadgeHtml(grade, 'T') }) : '';
        let requirement = this.profileRequirementText(item.requirements);
        return (level ? `<div class="social-item-base">${this.deps._t('아이템 Lv.{level}{grade}', { level, grade: gradeHtml })}</div>` : '')
            + (requirement ? `<div class="social-item-base">${this.services.format.socialEscape(requirement)}</div>` : '');
    }

    profileRequirementText(req) {
        if (!req || typeof req !== 'object') return '';
        let attributes = ['strength', 'dexterity', 'intelligence'].map(key => [key, req.attributes && req.attributes[key]]).filter(([, value]) => Number(value) > 0)
            .map(([key, value]) => `${this.services.profileValues.profileStatLabel({ id: key })} ${Math.floor(Number(value))}`);
        return [this.deps._t('요구 Lv.{max}', { max: Math.max(1, Math.floor(Number(req.level) || 1)) }), ...attributes].join(', ');
    }

    profileItemUniqueHtml(item) {
        return item.uniqueEffect ? `<div class="social-item-unique">${this.deps._t('✨ 고유 효과: {uniqueEffect}', { uniqueEffect: this.services.format.socialEscape(item.uniqueEffect) })}</div>` : '';
    }

    profileItemSocketsHtml(item) {
        return this.services.profileValues.profileSnapshotRows(item.sockets, this.data.SOCIAL_ITEM_ARRAY_LIMITS.sockets).filter(row => row && row.jewel).map(row => `<div class="social-item-socket">◆ ${this.services.format.socialEscape(row.label)}: `
            + `<span style="color:${this.services.format.socialRarityColor(row.jewel.rarity)};">${this.services.format.socialEscape(row.jewel.name)}</span>${this.services.format.socialEscape(this.profileJewelSummary(row.jewel))}</div>`).join('');
    }

    profileJewelSummary(jewel) {
        let lines = this.services.profileValues.profileSnapshotRows(jewel.stats, this.data.SOCIAL_ITEM_ARRAY_LIMITS.jewelStats).filter(st => st && st.id != null)
            .map(st => `${st.petite ? this.deps._t('쁘띠 ') : ''}${this.services.profileValues.profileStatLabel({ id: st.id })} +${this.services.profileValues.profileJewelValue(st.id, st.val)}`);
        return lines.length ? `, ${lines.join(', ')}` : '';
    }

    profileItemFusionHtml(item) {
        if (!item.fusedRelic) return '';
        let gradeLabel = item.fusionGrade === 'perfect' ? '완벽한 융합' : (item.fusionGrade === 'unstable' ? '불안정한 융합' : '보통 융합');
        return `<div class="social-item-stat" style="color:#8fd8ff;">⌛ ${gradeLabel}${item.fusedRareName ? this.deps._t(', [{fusedRareName}]의 기억', { fusedRareName: this.services.format.socialEscape(item.fusedRareName) }) : ''}</div>`;
    }

    profileItemOptionsHtml(item) {
        let explicit = this.profileExplicitStats(item);
        // 줄이 없는 아이템의 한 줄은 게임 툴팁과 같다(itemTooltipRules.emptyExplicitHtml): 액막이는 끼울 곳, 그 밖에는 일반 아이템.
        let empty = typeof this.deps.colonyWards === 'object' && this.deps.colonyWards.isWard(item) ? '장비창의 액막이 칸에 끼웁니다' : '일반 아이템: 추가 옵션 없음';
        let html = explicit.length
            ? `<div class="social-item-section">${this.profileAffixHeaderText(item, explicit)}</div>${explicit.map(this.profileExplicitLineHtml).join('')}`
            : `<div class="social-item-stat" style="color:var(--copy-muted);">${empty}</div>`;
        return this.profileBaseOptionsHtml(item) + html + this.profileItemEncroachHtml(item) + this.profileItemAnointHtml(item) + this.profileItemEmberHtml(item);
    }

    profileAffixHeaderText(item, explicit) {
        const kinds = explicit.map(st => st.kind).filter(Boolean);
        const used = kinds.length ? { prefix: kinds.filter(kind => kind === 'prefix').length, suffix: kinds.filter(kind => kind === 'suffix').length } : null;
        return typeof this.deps.equipmentCrafting === 'object' ? this.deps.equipmentCrafting.affixHeader(item.rarity, explicit.length, used).text : this.deps._t('추가 옵션 ({length}/6)', { length: explicit.length });
    }

    profileExplicitStats(item) {
        let rows = (Array.isArray(item.stats) ? item.stats : []).filter(st => st && st.id != null);
        if (item.chaosInfusion && item.chaosInfusion.id != null) rows.push({ ...item.chaosInfusion, statName: this.deps._t('[주입] {chaosInfusion}', { chaosInfusion: this.services.profileValues.profileStatLabel(item.chaosInfusion) }) });
        return typeof this.deps.itemTooltipRules === 'object' ? rows.sort(this.deps.itemTooltipRules.compareStats) : rows;
    }

    profileBaseOptionsHtml(item) {
        let base = (Array.isArray(item.baseStats) ? item.baseStats : []).filter(st => st && st.id != null);
        if (!base.length) return '';
        let defenseIds = typeof this.deps.itemTooltipRules === 'object' ? this.deps.itemTooltipRules.DEFENSE_IDS : [];
        let lines = base.filter(st => !defenseIds.includes(st.id)).map(this.profileBaseStatHtml).join('');
        return `<div class="social-item-section">${this.deps._t('베이스 옵션')}</div>${this.profileWardSlotsHtml(item)}${lines}${this.profileDefenseLinesHtml(item, base)}`;
    }

    profileWardSlotsHtml(item) {
        const range = this.deps.COLONY_WARD_RULES.beltSlots, slots = Math.floor(Number(item.wardSlots));
        if (!(slots >= range.min && slots <= range.max)) return '';
        return `<div class="social-item-stat"><span style="color:#c8b6ff;">${this.deps._t('액막이 칸')} </span><span style="color:#e6dcc6;">+${slots}</span>`
            + ` <span class="social-roll">(${range.min}~${range.max})</span></div>`;
    }

    profileBaseStatHtml(st) {
        let tone = this.services.profileValues.profileStatTone(st.id);
        return `<div class="social-item-stat"><span style="color:${tone};">${this.services.format.socialEscape(this.services.profileValues.profileStatLabel(st))} </span>`
            + `<span style="color:${st.exceptional ? '#ffb454' : tone};">+${this.services.format.socialEscape(this.services.profileValues.profileValue(st.id, st.val))}</span>${this.profileRollRangeHtml(st, true)}${this.profileExceptionalMark(st)}</div>`;
    }

    profileDefenseLinesHtml(item, base) {
        if (typeof this.deps.itemTooltipRules !== 'object') return '';
        let view = this.deps.itemTooltipRules.defenseView(item);
        return this.deps.itemTooltipRules.DEFENSE_IDS.map(id => {
            let total = Math.floor(view[id]), baseValue = Math.floor(view.base[id]);
            if (!(total > 0) && !(baseValue > 0)) return '';
            let src = base.find(st => st.id === id) || { id };
            let value = total === baseValue ? `${baseValue}</span>` : `${total}</span> <span style="color:var(--copy-bright);">(${baseValue})</span>`;
            return `<div class="social-item-stat">${this.services.format.socialEscape(this.services.profileValues.profileStatLabel({ id }))}: <span style="color:${src.exceptional ? '#ffb454' : this.services.profileValues.profileStatTone(id)};">${value}`
                + `${src.val != null ? this.profileRollRangeHtml(src, true) : ''}${this.profileExceptionalMark(src)}</div>`;
        }).join('');
    }

    profileExplicitLineHtml(st) {
        let parts = this.profileAffixParts(st), suffix = this.profileAffixSuffixHtml(st), html = '';
        for (let i = 0; i < parts.length; i += 2) {
            html += `<div class="social-item-stat${i ? ' is-continued' : ''}">${parts.slice(i, i + 2).join(', ')}${i ? '' : suffix}</div>`;
        }
        return html;
    }

    profileAffixParts(st) {
        let extras = this.services.profileValues.profileSnapshotRows(st.extraStats, this.data.SOCIAL_ITEM_ARRAY_LIMITS.extraStats).filter(ex => ex && ex.id != null);
        let label = part => (extras.length ? this.services.profileValues.profileStatLabel({ id: part.id }) : this.services.profileValues.profileStatLabel(part));
        return [st].concat(extras).map(part => `<span style="color:${this.services.profileValues.profileStatTone(part.id)};">${this.services.format.socialEscape(label(part))} +${this.services.format.socialEscape(this.services.profileValues.profileValue(part.id, part.val))}</span>`);
    }

    profileAffixSuffixHtml(st) {
        let source = st.source ? ` <span class="equipment-craft-source">${this.services.format.socialEscape(st.source)}</span>` : '';
        let honey = st.honey ? ' <span class="item-affix-lock item-affix-lock--honey">🍯 벌꿀 고정</span>' : '';
        return `${this.profileRollRangeHtml(st, false)}${this.profileTierHtml(st)}${source}${honey}${this.profileEmberScaleHtml(st)}`;
    }

    profileTierHtml(st) {
        if (st.fixed) return ' <span class="tier-badge tier-badge-fixed">[T0]</span>';
        return st.tier !== undefined && typeof this.deps.getTierBadgeHtml === 'function' ? ` ${this.deps.getTierBadgeHtml(Math.floor(Number(st.tier)), 'T')}` : '';
    }

    profileRollBound(value, fallback) {
        return Number.isFinite(Number(value)) ? Number(value) : Number(fallback);
    }

    profileRollRangeHtml(st, estimate) {
        let min = this.profileRollBound(st.valMin, st.baseRollMin), max = this.profileRollBound(st.valMax, st.baseRollMax);
        if (estimate && (!Number.isFinite(min) || !Number.isFinite(max))) {
            min = Number((Number(st.val || 0) * 0.8).toFixed(2));
            max = Number((Number(st.val || 0) * 1.2).toFixed(2));
        }
        if (!Number.isFinite(min) || !Number.isFinite(max)) return '';
        return ` <span class="social-roll">(${this.services.format.socialEscape(this.services.profileValues.profileValue(st.id, Math.min(min, max)))}~${this.services.format.socialEscape(this.services.profileValues.profileValue(st.id, Math.max(min, max)))})</span>`;
    }

    profileExceptionalMark(st) {
        return st.exceptional ? ' <span style="color:#ffb454;font-weight:700;">✦+20%</span>' : '';
    }

    profileEmberScaleHtml(st) {
        const pct = Math.round(((Number(st.ember) || 1) - 1) * 100);
        return pct ? ` <span style="color:${pct > 0 ? this.deps.EMBER_CORRUPTION_TONE : '#9aa3ad'};font-weight:700;">🔥${pct > 0 ? '+' : ''}${pct}%</span>` : '';
    }

    profileItemAnointHtml(item) {
        return this.services.profileValues.profileSnapshotRows(item.anoint, this.data.SOCIAL_ITEM_ARRAY_LIMITS.anoint).filter(row => row && row.title)
            .map(row => `<div class="social-item-stat" style="color:#cfe0a0;">${this.deps._t('🌿 기름: {title} ({text})', { title: this.services.format.socialEscape(row.title), text: this.services.format.socialEscape(row.text || '') })}</div>`).join('');
    }

    profileItemEmberHtml(item) {
        if (!Array.isArray(item.ember)) return '';
        const lines = this.services.profileValues.profileSnapshotRows(item.ember, this.data.SOCIAL_ITEM_ARRAY_LIMITS.ember).filter(line => line && line.id != null)
            .map(line => `<div class="social-item-stat" style="color:${this.deps.EMBER_CORRUPTION_TONE};">${this.deps._t('[잿불] {line} +{id}', { line: this.services.format.socialEscape(this.services.profileValues.profileStatLabel(line)), id: this.services.format.socialEscape(this.services.profileValues.profileValue(line.id, line.val)) })}</div>`).join('');
        return `<div class="social-item-section" style="color:${this.deps.EMBER_CORRUPTION_TONE};">${this.deps._t('🔥 타오른 장비 (다시 태울 수 없음)')}</div>${lines}`;
    }

    profileItemEncroachHtml(item) {
        let encroached = item.encroached;
        if (!encroached) return '';
        let chosen = encroached.liberated && encroached.chosen;
        let line = chosen && chosen.id != null
            ? `<div class="social-item-stat" style="color:#d7b8ff;">[잠식] ${this.services.format.socialEscape(this.services.profileValues.profileStatLabel(chosen))} +${this.services.format.socialEscape(this.services.profileValues.profileValue(chosen.id, chosen.val))}${this.profileTierHtml({ tier: Number(chosen.tier) || 10 })}</div>`
            : '<div class="social-item-stat" style="color:#8d7bb3;">해방 전에는 효과 없음, 모든 제작으로도 변하지 않음</div>';
        return `<div class="social-item-section" style="color:#b084ff;">${this.deps._t('잠식 특수 옵션')}</div>${line}`;
    }
}
