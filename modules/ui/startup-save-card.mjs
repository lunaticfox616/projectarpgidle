const saveStamp = save => save?.saveMeta?.lastModifiedAt || 0;

/** Read-only account preview. Opening the gate must never switch or save the active slot. */
export class StartupSaveCard {
    constructor(deps) { this.deps = deps; this.preview = null; }

    shown() {
        const account = this.deps.getSaveSlot().kind === 'account', userId = this.deps.cloudState.user?.id;
        if (account || !userId) {
            this.preview = null;
            return { account, preview: false, save: this.deps.game };
        }
        if (!this.preview || this.preview.userId !== userId) this.preview = { userId, save: this.deps.readAccountSaveCopy(userId) };
        return { account: true, preview: true, save: this.preview.save };
    }

    emptyText(shown, hasSave) {
        if (shown.preview) return '계정 저장으로 이어하기를 누르면 서버의 저장을 받습니다.';
        if (!hasSave && !shown.account && this.deps.hasAccountSaveCopy()) return '이 기기에 로그인한 계정의 저장이 있습니다. 그 계정으로 로그인하면 이어서 할 수 있습니다.';
        return null;
    }

    state(shown, stamp) {
        const guestStamp = saveStamp(this.deps.game);
        const hasSave = shown.preview ? !!shown.save : (shown.account || stamp > 0);
        return { hasSave,
            hasGuestSave: shown.preview ? guestStamp > 0 : (shown.account ? !!this.deps.cloudState.guestSaveSummary : hasSave),
            title: shown.account ? '계정 저장' : (hasSave ? '이 기기 저장' : '새 모험'),
            emptyText: this.emptyText(shown, hasSave) };
    }

    blocked(status) {
        const t = this.deps._t;
        if (status.status === 'corrupt') return { title: t('저장을 읽지 못했습니다'), hint: t('저장을 읽지 못해 원래 저장을 따로 보관했습니다. 이대로 시작하면 진행이 저장되지 않습니다.') };
        if (status.status === 'newer-build') return { title: t('새 버전의 저장입니다'), hint: t('{message} 이대로 시작하면 진행이 저장되지 않습니다.', { message: status.message }) };
        return null;
    }

    summary(el, save) {
        if (!el) return;
        const current = save || {}, t = this.deps._t;
        const zone = this.deps.getZone(current.currentZoneId) || { name: '액트 1: 버려진 해안' };
        const loopLabel = Math.max(1, Math.floor(current.season || 1)), act = this.deps.getStoryActByZoneId(zone.id);
        const floors = { underworld: '지하계 {floor}층', skyTower: '창공의 탑 {floor}층', chaosRealm: '혼돈계 {floor}층' };
        const zoneLabel = act ? `${this.deps.formatStoryActLabel(act)}: ${t(act.title)}` : t(floors[zone.type] || zone.name, { floor: zone.floor });
        el.innerText = t('Lv.{level}, 루프 {loopLabel}, {zoneLabel}', { level: current.level || 1, loopLabel, zoneLabel });
    }

    hint(el, hasSave, warning, emptyText) {
        if (!el) return;
        el.dataset.emptyText ??= el.textContent;
        el.textContent = warning || emptyText || el.dataset.emptyText;
        el.classList.toggle('is-warning', !!warning);
        el.hidden = hasSave && !warning;
    }

    render(shown) {
        const document = this.deps.document, t = this.deps._t;
        this.summary(document.getElementById('startup-local-summary'), shown.save);
        const stamp = saveStamp(shown.save), state = this.state(shown, stamp);
        const time = document.getElementById('startup-local-time'), guest = document.getElementById('btn-startup-guest');
        if (time) time.innerText = this.deps.formatCloudTime(stamp);
        if (guest) guest.textContent = t(state.hasGuestSave ? '이 기기 저장으로 이어하기' : '게스트로 시작');
        const card = document.querySelector('.startup-summary-card');
        if (!card) return;
        card.querySelector('.startup-summary-grid').hidden = !state.hasSave;
        // A preview belongs to another slot; only the currently loaded slot has a local read failure.
        const blocked = shown.preview ? null : this.blocked(this.deps.getLocalSaveStatus());
        this.hint(card.querySelector('.startup-summary-hint'), state.hasSave, blocked?.hint, state.emptyText && t(state.emptyText));
        card.querySelector('.startup-summary-title').textContent = blocked ? blocked.title : t(state.title);
    }

    dispose() { this.preview = null; }
}
