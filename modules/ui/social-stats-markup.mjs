// stats-markup: explicit account state and dependency ports; no ambient game/global state.
export class SocialStatsMarkup {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["profileStatIconHtml","profileStatName","profileStatValue","profileStatRowHtml","profileStatsHtml","profilePowerHtml"].forEach(name => { this[name] = this[name].bind(this); });
    }

    profileStatIconHtml(key) {
        let [sheet, name] = String(this.data.PROFILE_STAT_ICONS.get(key) || '').split(':');
        if (sheet === 'log') return `<span class="combat-log-icon combat-log-icon--${name}" aria-hidden="true"></span>`;
        let cell = sheet === 'tree' && typeof this.deps.window.GameModules.passiveScene.nodes.iconAtlasCell === 'object' ? this.deps.window.GameModules.passiveScene.nodes.iconAtlasCell[name] : null;
        if (!cell) return '<span class="social-stat-icon is-none" aria-hidden="true"></span>';
        // 그림판 한 칸을 22px로 그리고 가운데 16px만 보인다(칸 가장자리의 빈 여백을 잘라 작은 크기에서도 그림이 보이게).
        return `<span class="social-stat-icon" style="background-position:${-(cell[0] * 22 + 3)}px ${-(cell[1] * 22 + 3)}px;" aria-hidden="true"></span>`;
    }

    profileStatName(label) {
        return String(label || '').replace(/^[^\p{L}\p{N}]+/u, '');
    }

    profileStatValue(value) {
        let text = String(value == null ? '' : value);
        return /^-?\d{4,}$/.test(text) ? Number(text).toLocaleString('en-US') : text;
    }

    profileStatRowHtml(s) {
        let tone = this.data.PROFILE_STAT_TONES[s.key];
        return `<div class="social-stat-item"><span class="social-stat-label">${this.profileStatIconHtml(s.key)}${this.services.format.socialEscape(this.profileStatName(s.label))}</span>`
            + `<span class="social-stat-value"${tone ? ` style="color:${tone};"` : ''}>${this.services.format.socialEscape(this.profileStatValue(s.value))}</span></div>`;
    }

    profileStatsHtml(stats) {
        let rows = stats.filter(s => s && s.label != null);
        if (!rows.length) return '<div class="social-profile-empty">스탯 정보 없음</div>';
        let grouped = new Set(this.data.PROFILE_STAT_GROUPS.flatMap(([, keys]) => keys));
        let groups = this.data.PROFILE_STAT_GROUPS.map(([title, keys]) => [title, keys.map(key => rows.find(s => s.key === key)).filter(Boolean)])
            .concat([['기타', rows.filter(s => !grouped.has(s.key))]]).filter(([, list]) => list.length);
        if (groups.length === 1) return `<div class="social-stat-grid">${rows.map(this.profileStatRowHtml).join('')}</div>`;
        return groups.map(([title, list]) => `<div class="social-stat-group"><h4>${title}</h4>`
            + `<div class="social-stat-grid${title === '저항' ? ' is-pair' : ''}">${list.map(this.profileStatRowHtml).join('')}</div></div>`).join('');
    }

    profilePowerHtml(p) {
        if (!p.power) return '';
        return `<div class="social-profile-power"><span>${p.version >= 8 ? this.deps._t('총 DPS') : this.deps._t('전투력')}</span><b>${this.services.format.socialComma(p.power)}</b></div>`;
    }
}
