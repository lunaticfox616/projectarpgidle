// special-cards: explicit account state and dependency ports; no ambient game/global state.
export class SocialSpecialCards {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["renderProfileJewelCard","profileJewelHeadHtml","profileJewelTierHtml","profileJewelLineHtml","renderProfileTalismanCard","profileTalismanLineHtml","profileTalismanTone","profileGrowthText","profileGraftText","renderProfileCoreCard","renderProfileStumpCard","profileStumpExtraHtml","profileStumpTone","renderSimpleCard"].forEach(name => { this[name] = this[name].bind(this); });
    }

    renderProfileJewelCard(jewel) {
        let color = this.services.format.socialRarityColor(jewel.rarity);
        let lines = this.services.profileValues.profileSnapshotRows(jewel.stats, this.data.SOCIAL_ITEM_ARRAY_LIMITS.jewelStats).map(this.profileJewelLineHtml).join('');
        return `<div class="social-item-card" style="border-color:${color};"><div class="social-item-title" style="color:${color};">${this.services.format.socialEscape(jewel.name || '주얼')}</div>`
            + `${this.profileJewelHeadHtml(jewel)}${lines || this.deps._t('<div class="social-item-stat" style="color:var(--copy-muted);">옵션 정보 없음</div>')}</div>`;
    }

    profileJewelHeadHtml(jewel) {
        let unique = jewel.uniqueEffect ? `<div class="social-item-unique">${this.deps._t('✨ 고유 효과: {uniqueEffect}', { uniqueEffect: this.services.format.socialEscape(jewel.uniqueEffect) })}</div>` : '';
        let key = jewel.keystone;
        let keystone = key && key.name
            ? `<div class="social-item-stat" style="color:${key.active ? '#8fe7b0' : '#ffd68a'};">🔯 배정 키스톤: ${this.services.format.socialEscape(key.name)}${key.ascend ? `(${this.services.format.socialEscape(key.ascend)})` : ''}`
                + `${key.active ? this.deps._t(', 할당 중') : this.deps._t(', 짝 주얼의 키스톤과 같으면 할당')}</div>`
            : '';
        return unique + keystone + this.profileJewelTierHtml(jewel);
    }

    profileJewelTierHtml(jewel) {
        if (jewel.rarity === 'unique') return '<div class="social-item-base">고유 고정 옵션, 티어 평가 제외</div>';
        let core = this.services.profileValues.profileSnapshotRows(jewel.stats, this.data.SOCIAL_ITEM_ARRAY_LIMITS.jewelStats).filter(st => st && !st.petite);
        if (!core.length) return '';
        let average = core.reduce((sum, st) => sum + Math.max(1, Math.floor(Number(st.tier) || 1)), 0) / core.length;
        return `<div class="social-item-base">${this.deps._t('옵션 평균 티어: T{average}', { average: average.toFixed(1) })}</div>`;
    }

    profileJewelLineHtml(st) {
        if (!st || st.id == null) return '';
        let tone = this.services.format.socialSafeColor(typeof this.deps.window.getJewelStatToneColor === 'function' ? this.deps.window.getJewelStatToneColor(st.id) : null, '#cfe0f5');
        let marks = (st.wax ? '<span style="color:#ffd98a;">밀랍 </span>' : '') + (st.petite ? '<span style="color:var(--copy-bright);">쁘띠 </span>' : '');
        let tier = Number.isFinite(Number(st.tier)) && !st.petite ? ` <span style="color:#ffd68a;">T${Math.floor(Number(st.tier))}</span>` : '';
        let min = this.services.profileValues.profileJewelValue(st.id, st.valMin ?? st.val), max = this.services.profileValues.profileJewelValue(st.id, st.valMax ?? st.val);
        return `<div class="social-item-stat"><span style="color:${tone};">${marks}${this.services.format.socialEscape(this.services.profileValues.profileStatLabel({ id: st.id }))}: +${this.services.format.socialEscape(this.services.profileValues.profileJewelValue(st.id, st.val))}${tier}</span>`
            + ` <span class="social-roll">${this.deps._t('(고정 범위 {min}~{max})', { min: this.services.format.socialEscape(min), max: this.services.format.socialEscape(max) })}</span></div>`;
    }

    renderProfileTalismanCard(t) {
        if (!Array.isArray(t.lines)) return this.renderSimpleCard(t);
        let tone = this.profileTalismanTone(t), off = t.state !== 'awake' && t.state !== 'amplified';
        let effect = t.uniqueEffect ? `<div class="social-item-unique"${off ? this.data.PROFILE_OFF_STYLE : ''}>${this.services.format.socialEscape(t.uniqueEffect)}${off ? this.deps._t(' (비활성)') : ''}</div>` : '';
        let lines = t.lines.slice(0, this.data.SOCIAL_TALISMAN_LINE_LIMIT).filter(line => line && typeof line.text === 'string')
            .map(line => this.profileTalismanLineHtml(line, off)).join('');
        let growth = this.profileGrowthText(t);
        let notes = [this.data.profileOwn(this.data.PROFILE_TALISMAN_STATES, t.state), this.profileGraftText(t)].filter(Boolean).map(text => `<div class="social-item-base">${this.services.format.socialEscape(text)}</div>`).join('');
        return `<div class="social-item-card" style="border-color:${tone};"><div class="social-item-title" style="color:${tone};">${this.services.format.socialEscape(t.name || '부적')}</div>`
            + `${growth ? `<div class="social-item-base">${this.services.format.socialEscape(growth)}</div>` : ''}`
            + `<div class="social-item-base" style="color:${tone};">${this.deps._t('{PROFILE_TALISMAN_RARITY} 부적', { PROFILE_TALISMAN_RARITY: this.data.profileOwn(this.data.PROFILE_TALISMAN_RARITY, t.rarity) || this.deps._t('마법') })}</div>${effect}${lines}${notes}</div>`;
    }

    profileTalismanLineHtml(line, off) {
        let style = off ? this.data.PROFILE_OFF_STYLE : (line && line.condition ? ' style="color:#d7b8ff;"' : '');
        return `<div class="social-item-stat"${style}>${this.services.format.socialEscape(line && line.text)}${off ? this.deps._t(' (비활성)') : ''}</div>`;
    }

    profileTalismanTone(t) {
        return this.services.format.socialSafeColor(typeof this.deps.TALISMAN_RARITY_TONES === 'object' ? this.data.profileOwn(this.deps.TALISMAN_RARITY_TONES, t.rarity) : null, this.services.format.socialRarityColor(t.rarity));
    }

    profileGrowthText(item) {
        let need = Math.floor(Number(item.need) || 0);
        return item.ripe || need <= 0 ? '' : this.deps._t('경험치 {floor} / {need}', { floor: Math.floor(Number(item.xp) || 0), need });
    }

    profileGraftText(item) {
        let rank = Math.floor(Number(item.graft) || 0);
        return rank > 0 ? this.deps._t('접붙이기 {rank}단계, +{floor}%', { rank, floor: Math.floor(Number(item.graftPct) || 0) }) : '';
    }

    renderProfileCoreCard(core) {
        // Old server rows also cross this boundary: a core has four lines, never an arbitrary tooltip-sized array.
        let lines = (Array.isArray(core.lines) ? core.lines : []).slice(0, this.deps.CORE_ITEM_RULES.lines)
            .filter(line => typeof line === 'string').map(line => `<div class="social-item-stat">${this.services.format.socialEscape(line)}</div>`).join('');
        return `<div class="social-item-card" style="border-color:${this.data.PROFILE_CORE_TONE};"><div class="social-item-title">${this.services.format.socialEscape(core.name || '코어')}</div>${lines}</div>`;
    }

    renderProfileStumpCard(item) {
        let tone = this.profileStumpTone(item), scar = item.family === 'scar';
        let gain = item.yieldText ? `${item.yieldText}${item.ripe && !item.suppressed ? '' : this.deps._t(' (비활성)')}` : '';
        let head = [scar ? '' : this.deps._t('품질 {floor}%{value}', { floor: Math.floor(Number(item.quality) || 0), value: item.golden === true ? this.deps._t(', 황금') : '' }), this.profileGrowthText(item), gain];
        let rows = list => list.filter(Boolean).map(text => `<div class="social-item-base">${this.services.format.socialEscape(text)}</div>`).join('');
        return `<div class="social-item-card" style="border-color:${tone};"><div class="social-item-title" style="color:${tone};">${this.services.format.socialEscape(item.name || '그루터기 아이템')}</div>`
            + rows(head) + this.profileStumpExtraHtml(item) + rows([item.note, this.profileGraftText(item)]) + '</div>';
    }

    profileStumpExtraHtml(item) {
        let rows = Array.isArray(item.extra) ? item.extra.slice(0, 40) : [];
        return rows.filter(row => row && typeof row.text === 'string')
            .map(row => `<div class="social-item-stat" style="color:${this.services.profileValues.profileStatTone(row.id)};">${this.services.format.socialEscape(row.text)}</div>`).join('');
    }

    profileStumpTone(item) {
        if (item.kind === 'talisman') return this.profileTalismanTone(item);
        if (item.family === 'scar' && typeof this.deps.STUMP_BOX_SCAR === 'object') return this.deps.STUMP_BOX_SCAR.tone;
        let color = typeof this.deps.STUMP_BOX_COLORS === 'object' ? this.data.profileOwn(this.deps.STUMP_BOX_COLORS, item.color) : '';
        return this.services.format.socialSafeColor(color && color.tone, '#9d927d');
    }

    renderSimpleCard(snap) {
        let color = this.services.format.socialRarityColor(snap.rarity);
        let lines = (Array.isArray(snap.stats) ? snap.stats : []).slice(0, this.data.SOCIAL_LEGACY_ITEM_LINE_LIMIT).filter(st => st && st.id != null)
            .map(st => `<div class="social-item-stat" style="color:${this.services.profileValues.profileStatTone(st.id)};">${this.services.format.socialEscape(this.services.profileValues.profileStatLabel(st))} +${this.services.format.socialEscape(this.services.profileValues.profileValue(st.id, st.val))}</div>`)
            .concat((Array.isArray(snap.effects) ? snap.effects : []).slice(0, this.data.SOCIAL_LEGACY_ITEM_LINE_LIMIT).filter(effect => typeof effect === 'string')
                .map(effect => `<div class="social-item-stat" style="color:#d7b8ff;">${this.services.format.socialEscape(effect)}</div>`)).join('');
        return `<div class="social-item-card" style="border-color:${color};"><div class="social-item-title" style="color:${color};">${this.services.format.socialEscape(snap.name)}</div>`
            + (lines || '<div class="social-item-stat" style="color:var(--copy-muted);">옵션 없음</div>') + '</div>';
    }
}
