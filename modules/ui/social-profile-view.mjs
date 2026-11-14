// profile-view: explicit account state and dependency ports; no ambient game/global state.
export class SocialProfileView {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["ensureProfileModal","openMyProfilePreview","renderProfileIdentityChips","renderProfileGemRow","renderProfileSkills","showProfileItemDetail","renderProfileEquipPaperdoll","profileEmptySlotHtml","profileCoreArt","profileItemArt","profileSlotHtml","profileJewelRows","renderProfileJewels","renderProfileTalismans","profileStumpFilled","renderProfileStump","profileStumpCellHtml","profileStumpIconSuffix","profileStumpIconHtml","profileStumpBarHtml","profileMiniCardHtml","profileTabList","profileTabsHtml","renderProfileItemsArea","switchProfileTab","renderProfileData","canDuelFromProfile","renderProfileActionsRow","toggleProfileBlock","showFetchedProfile","openPlayerProfile"].forEach(name => { this[name] = this[name].bind(this); });
    }

    ensureProfileModal() {
        let modal = this.deps.document.getElementById('social-profile-modal');
        if (modal) return modal;
        modal = this.deps.document.createElement('div');
        modal.id = 'social-profile-modal'; modal.className = 'social-modal-overlay'; modal.style.display = 'none';
        modal.onclick = e => { if (e.target === modal) this.services.reset.closePlayerProfile(); };
        modal.innerHTML = `<div class="social-modal-box"><button class="social-modal-close" onclick="closePlayerProfile()" aria-label="${this.deps._t('닫기')}">✕</button><div class="social-modal-content"><div id="social-profile-body"></div></div></div>`;
        this.deps.document.body.appendChild(modal);
        return modal;
    }

    async openMyProfilePreview() {
        this.deps.selectionDialog.close(this.data.CHAT_SETTINGS_ID);
        if (!this.services.session.socialCloudReady()) { this.deps.showGameToast(this.deps._t('프로필을 보려면 먼저 클라우드 로그인이 필요합니다.'), 'warning'); return; }
        let context = this.services.session.socialSessionContext();
        // 닉네임 줄을 쓰기 전에 서버의 닉네임을 다시 읽는다(syncPlayerProfile과 같다).
        await this.services.nickname.restoreNicknameFromServer(true);
        if (!this.services.session.isSocialSessionCurrent(context)) return;
        if (!this.services.identity.getMyNickname()) await this.services.screenActions.promptAndSetNickname();
        if (!this.services.session.isSocialSessionCurrent(context) || !this.services.identity.getMyNickname()) return;
        try {
            await this.services.upload.uploadPlayerProfile({ required: true });
        } catch (error) {
            if (!this.services.session.isSocialSessionCurrent(context)) return;
            this.services.upload.reportProfileSyncFailure(error);
            return;
        }
        if (this.services.session.isSocialSessionCurrent(context)) this.openPlayerProfile(context.userId);
    }

    renderProfileIdentityChips(p) {
        let chips = [`Lv.${p.level || 1}`, p.heroClassName, p.className || '미전직', this.deps._t('루프 {loop}', { loop: this.services.format.socialComma(p.loop || 0) })];
        return chips.filter(Boolean).map(chip => `<span class="social-profile-chip">${this.services.format.socialEscape(chip)}</span>`).join('');
    }

    renderProfileGemRow(label, gem, extra) {
        if (!gem || !gem.name) return '';
        // 남의 프로필 값이라 품질도 다른 칸처럼 이스케이프한다(2026-10-27 검토: 이 한 칸만 날것으로 들어가 저장형 XSS가 됐다).
        let quality = gem.quality ? this.deps._t(' 품질 {quality}', { quality: this.services.format.socialEscape(gem.quality) }) : '';
        return `<div class="social-skill-row"><span class="social-skill-label">${this.services.format.socialEscape(label)}</span>`
            + `<strong>${this.services.format.socialEscape(gem.name)}</strong><span class="social-skill-level">Lv.${this.services.format.socialEscape(gem.level || 1)}${quality}${extra || ''}</span></div>`;
    }

    renderProfileSkills(skills) {
        if (!skills || !skills.active) return '';
        let rows = [this.renderProfileGemRow('주 스킬', skills.active)]
            .concat((skills.supports || []).map(gem => this.renderProfileGemRow('보조', gem)))
            .concat([this.renderProfileGemRow('이동', skills.mobility)])
            .concat((skills.summons || []).map(gem => this.renderProfileGemRow('소환', gem, Math.floor(Number(gem.count)) > 1 ? this.deps._t(' {floor}마리', { floor: Math.floor(Number(gem.count)) }) : '')));
        return `<div class="social-skill-list">${rows.join('')}</div>`;
    }

    showProfileItemDetail(html) {
        let box = this.deps.document.querySelector('#social-profile-modal .social-modal-box');
        if (!box) return false;
        let layer = box.querySelector(':scope > .social-item-detail');
        if (!layer) {
            layer = this.deps.document.createElement('div');
            layer.className = 'social-item-detail';
            layer.onclick = event => { if (event.target === layer || event.target.closest('[data-item-detail-close]')) layer.hidden = true; };
            box.appendChild(layer);
        }
        layer.innerHTML = `<div class="social-item-detail-card">${html}<button type="button" data-item-detail-close>${this.deps._t('닫기')}</button></div>`;
        layer.hidden = false;
        return true;
    }

    renderProfileEquipPaperdoll(p) {
        let bySlot = new Map((p.equipment || []).filter(it => it && it.slot).map(it => [it.slot, it]));
        let core = p.core && typeof p.core === 'object' && p.core.name ? { ...p.core, kind: 'core' } : null;
        if (!bySlot.size && !core) return '<div class="social-profile-empty">장착한 장비 없음</div>';
        let filled = slot => this.profileSlotHtml(slot, bySlot.get(slot), this.services.profileValues.profileItemTag(bySlot.get(slot)));
        let cards = this.data.SOCIAL_EQUIP_SLOTS.map(slot => (bySlot.has(slot) ? filled(slot) : this.profileEmptySlotHtml(slot)));
        if (bySlot.has('반지3')) cards.push(filled('반지3'));
        if (core) cards.push(this.profileSlotHtml('코어', core, '코어'));
        return `<div class="social-doll">${cards.join('')}</div>`;
    }

    profileEmptySlotHtml(slot) {
        return `<div class="social-slot is-empty slot-${slot}"><span class="social-slot-tag">${this.services.format.socialEscape(this.deps.weaponCategorySlotLabel(null, slot.replace(/[123]$/, '')))}</span></div>`;
    }

    profileCoreArt(core) {
        const names = this.deps.CORE_ITEM_RULES.groupNames;
        const prefix = `${this.deps.CORE_ITEM_RULES.perfect.prefix} `;
        const name = String(core && core.name || '');
        const plainName = name.startsWith(prefix) ? name.slice(prefix.length) : name;
        const group = Object.keys(names).find(key => plainName.startsWith(names[key]));
        return this.deps.ITEM_VISUAL_ASSET_DB.coreAssets[group || 'empty'];
    }

    profileItemArt(it) {
        if (it.kind === 'core') return this.profileCoreArt(it);
        if (typeof this.deps.getEquipmentGridVisualAsset !== 'function') return '';
        let base = !it.baseId && typeof this.deps.BASE_ITEM_DB !== 'undefined' ? this.deps.BASE_ITEM_DB.find(row => row.name === it.baseName) : null;
        return this.deps.getEquipmentGridVisualAsset({ slot: it.slot, rarity: it.rarity, name: it.name, baseName: it.baseName, baseId: it.baseId || (base && base.id) });
    }

    profileSlotHtml(slot, it, tag) {
        let key = `eq:${slot}`;
        this.state.current.profileTips[key] = this.services.itemCards.renderProfileItemCard(it);
        let color = it.kind === 'core' ? this.data.PROFILE_CORE_TONE : this.services.format.socialRarityColor(it.rarity);
        let art = this.profileItemArt(it);
        return `<div class="social-slot slot-${slot}" style="--r:${color};" role="button" tabindex="0" aria-label="${this.services.format.socialEscape(`[${tag}] ${it.name}`)}" onmouseenter="showSocialTip(event,'profile','${key}')" onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()" onclick="openTipModal('profile','${key}')">`
            + `${art ? `<img src="${this.services.format.socialEscape(art)}" alt="" draggable="false">` : ''}<span class="social-slot-tag">${this.services.format.socialEscape(tag)}</span></div>`;
    }

    profileJewelRows(p) {
        let rows = [];
        (p.equipment || []).forEach(item => (item && Array.isArray(item.sockets) ? item.sockets : []).forEach(row => {
            if (row && row.jewel) rows.push({ jewel: row.jewel, where: `[${this.services.profileValues.profileItemTag(item)}] ${row.label}` });
        }));
        return rows.length ? rows : (p.jewels || []).filter(Boolean).map(jewel => ({ jewel, where: '' }));
    }

    renderProfileJewels(p) {
        return `<div class="social-mini-grid">${this.profileJewelRows(p).map((row, i) => this.profileMiniCardHtml(`jw:${i}`, row.jewel, row.jewel.name || '주얼', row.where)).join('')}</div>`;
    }

    renderProfileTalismans(p) {
        return `<div class="social-mini-grid">${(p.talismans || []).filter(Boolean).map((t, i) => this.profileMiniCardHtml(`tl:${i}`, t, t.name || '부적', '')).join('')}</div>`;
    }

    profileStumpFilled(stump) {
        return !!stump && Array.isArray(stump.cells) && stump.cells.some(row => row && row.item);
    }

    renderProfileStump(stump) {
        return `<div class="social-stump-board">${stump.cells.slice(0, this.data.PROFILE_STUMP_CELLS).map(this.profileStumpCellHtml).join('')}</div>`;
    }

    profileStumpCellHtml(row, cell) {
        if (!row || typeof row !== 'object') return '<span class="social-stump-cell is-locked"></span>';
        let rank = Math.floor(Number(row.graft) || 0);
        let mark = rank > 0 ? `<span class="social-stump-graft">${rank}</span>` : '';
        let item = row.item;
        if (!item || typeof item !== 'object') return `<span class="social-stump-cell">${mark}</span>`;
        let key = `st:${cell}`;
        this.state.current.profileTips[key] = this.services.itemCards.renderProfileItemCard({ ...item, graft: row.graft, graftPct: row.graftPct });
        let state = (item.suppressed || item.state === 'suppressed' ? ' is-suppressed' : '') + (item.resonant ? ' is-resonant' : '');
        return `<span class="social-stump-cell is-filled${state}" style="--stump-tone:${this.services.specialCards.profileStumpTone(item)};" onmouseenter="showSocialTip(event,'profile','${key}')" onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()" onclick="openTipModal('profile','${key}')">`
            + `${this.profileStumpIconHtml(item)}${this.profileStumpBarHtml(item)}${mark}</span>`;
    }

    profileStumpIconSuffix(item) {
        if (item.stage === 'scar' || item.stage === 'scarAsleep') return '';
        let tint = item.kind === 'talisman' ? this.data.profileOwn(this.data.PROFILE_TALISMAN_RARITY, item.rarity) && item.rarity
            : typeof this.deps.STUMP_BOX_COLORS === 'object' && this.data.profileOwn(this.deps.STUMP_BOX_COLORS, item.color) && item.color;
        return tint ? `-${tint}` : null;
    }

    profileStumpIconHtml(item) {
        let stage = typeof this.deps.STUMP_BOX_STAGES === 'object' ? this.data.profileOwn(this.deps.STUMP_BOX_STAGES, item.stage) : '', suffix = this.profileStumpIconSuffix(item);
        return stage && suffix !== null ? `<img src="assets/items/stump-pixel-v1/${stage.icon}${suffix}.png" alt="" draggable="false">` : '';
    }

    profileStumpBarHtml(item) {
        let need = Number(item.need) || 0;
        if (item.ripe || need <= 0) return '';
        return `<span class="social-stump-bar"><i style="width:${Math.max(0, Math.min(100, Math.round((Number(item.xp) || 0) / need * 100)))}%"></i></span>`;
    }

    profileMiniCardHtml(key, snap, name, sub) {
        this.state.current.profileTips[key] = this.services.itemCards.renderProfileItemCard(snap);
        let color = this.services.format.socialRarityColor(snap && snap.rarity);
        return `<div class="social-mini-card" style="border-color:${color};color:${color};" onmouseenter="showSocialTip(event,'profile','${key}')" onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()" onclick="openTipModal('profile','${key}')">`
            + `${this.services.format.socialEscape(name)}${sub ? `<small>${this.services.format.socialEscape(sub)}</small>` : ''}</div>`;
    }

    profileTabList(p) {
        let tabs = [['equipment', '장비']];
        if (p.skills && p.skills.active) tabs.push(['skills', '스킬']);
        if (this.profileJewelRows(p).length) tabs.push(['jewels', '주얼']);
        if (this.profileStumpFilled(p.stump)) tabs.push(['stump', '그루터기 함']);
        else if ((p.talismans || []).length) tabs.push(['stump', '부적']);
        return tabs;
    }

    profileTabsHtml(p) {
        return this.profileTabList(p).map(([cat, label], i) => `<button data-cat="${cat}"${i ? '' : ' class="active"'} onclick="switchProfileTab('${cat}')">${label}</button>`).join('');
    }

    renderProfileItemsArea() {
        let p = this.state.current.currentProfile;
        if (!p) return '';
        this.state.current.profileTips = {};
        let cat = this.state.current.profileTab;
        if (cat === 'skills') return this.renderProfileSkills(p.skills);
        if (cat === 'jewels') return this.renderProfileJewels(p);
        if (cat === 'stump') return this.profileStumpFilled(p.stump) ? this.renderProfileStump(p.stump) : this.renderProfileTalismans(p);
        return this.renderProfileEquipPaperdoll(p);
    }

    switchProfileTab(cat) {
        this.state.current.profileTab = cat;
        this.services.reset.hideSocialTip();
        let tabsEl = this.deps.document.getElementById('social-profile-tabs');
        if (tabsEl) Array.from(tabsEl.children).forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-cat') === cat));
        let areaEl = this.deps.document.getElementById('social-profile-items');
        if (areaEl) areaEl.innerHTML = this.renderProfileItemsArea();
    }

    renderProfileData(profile) {
        let body = this.deps.document.getElementById('social-profile-body');
        if (!body) return;
        if (!profile) { body.innerHTML = `<div class="social-profile-empty">${this.deps._t('공개 프로필을 찾을 수 없습니다.')}<br>${this.deps._t('프로필 생성 또는 동기화가 완료되지 않았을 수 있어요.')}</div>`; return; }
        this.state.current.currentProfile = profile;
        this.state.current.profileTab = 'equipment';
        let p = profile;
        let stats = Array.isArray(p.stats) ? p.stats : [];
        let updatedAt = p.updatedAt ? new Date(p.updatedAt) : null;
        let updated = (updatedAt && Number.isFinite(updatedAt.getTime())) ? updatedAt.toLocaleString(this.deps.i18n.locale) : '';
        let actions = this.renderProfileActionsRow();
        // 고급 테마(2026-10-11, css/social-profile.css): 머리 띠에 이름과 큰 총 DPS, 제목 띠가 있는 두 판(능력치 묶음, 장착 구성).
        body.innerHTML = `
            <div class="social-profile-header">
                <div class="social-profile-id">
                    <div class="social-profile-name">${this.services.format.socialEscape(p.nickname || '익명')}</div>
                    <div class="social-profile-sub">${this.renderProfileIdentityChips(p)}</div>
                    ${updated ? `<div class="social-profile-updated">${this.deps._t('갱신: {updated}', { updated: this.services.format.socialEscape(updated) })}</div>` : ''}
                </div>
                ${this.services.statsMarkup.profilePowerHtml(p)}
            </div>
            ${actions}
            <div class="social-profile-cols">
                <section class="social-profile-col social-profile-card">
                    <h3>${this.deps._t('능력치')}</h3>
                    ${this.services.statsMarkup.profileStatsHtml(stats)}
                </section>
                <section class="social-profile-col social-profile-card">
                    <h3>${this.deps._t('장착 구성')}</h3>
                    <div id="social-profile-tabs" class="social-profile-tabs">${this.profileTabsHtml(p)}</div>
                    <div id="social-profile-items">${this.renderProfileItemsArea()}</div>
                </section>
            </div>`;
    }

    canDuelFromProfile() {
        let target = this.state.current.currentProfileUserId;
        if (!target || target === this.services.session.socialLoggedInUserId()) return false;
        return this.deps.contentProgression.canOpen('map-tab-pvp') && this.deps.isMapPrimaryContentUnlocked(this.deps.game, 'map-tab-pvp');
    }

    renderProfileActionsRow() {
        let target = this.state.current.currentProfileUserId;
        if (!target || target === this.services.session.socialLoggedInUserId()) return '';
        let duel = this.canDuelFromProfile() ? '<button type="button" onclick="fightCurrentProfileGhost()">친선전</button>' : '';
        return `<div class="social-profile-actions">${duel}`
            + `<button type="button" onclick="toggleProfileBlock()">${this.services.blocking.isUserBlocked(target) ? this.deps._t('차단 해제') : this.deps._t('차단')}</button>`
            + `<select id="social-report-reason" aria-label="${this.deps._t('신고 사유')}"><option value="욕설">${this.deps._t('욕설')}</option><option value="도배">${this.deps._t('도배')}</option><option value="사칭">${this.deps._t('사칭')}</option><option value="기타">${this.deps._t('기타')}</option></select>`
            + '<button type="button" onclick="reportCurrentProfile()">신고</button></div>';
    }

    toggleProfileBlock() {
        let target = this.state.current.currentProfileUserId;
        if (!target || target === this.services.session.socialLoggedInUserId()) return;
        let blocked = !this.services.blocking.isUserBlocked(target);
        this.services.blocking.setUserBlocked(target, blocked, this.state.current.currentProfile && this.state.current.currentProfile.nickname);
        this.state.current.lastChatRenderKey = '';
        this.services.chatMarkup.renderChatMessages(this.state.current.chatMessages || [], false);
        let tab = this.state.current.profileTab;   // 다시 그리면 장비 탭으로 돌아가므로 보던 탭을 되살린다
        if (this.state.current.currentProfile) { this.renderProfileData(this.state.current.currentProfile); if (tab) this.switchProfileTab(tab); }
        this.deps.showGameToast(blocked ? '이 사람의 채팅을 이 기기에서 숨깁니다.' : '차단을 풀었습니다.', 'info');
    }

    showFetchedProfile(rows) {
        let row = Array.isArray(rows) ? rows[0] : null;
        if (!row) return this.renderProfileData(null);
        // 스냅샷의 이름은 사용자가 고칠 수 있다. 표시와 신고 확인은 서버가 검증한 행의 닉네임을 쓴다.
        let profile = { ...(row.profile_data || {}), nickname: row.nickname || '' };
        this.renderProfileData(profile);
    }

    async openPlayerProfile(userId) {
        if (!userId) return;
        this.deps.selectionDialog.close(this.data.CHAT_SETTINGS_ID);
        if (!this.services.session.socialCloudReady()) { this.deps.showGameToast(this.deps._t('프로필을 보려면 먼저 클라우드 로그인이 필요합니다.'), 'warning'); return; }
        this.state.current.currentProfileUserId = String(userId);
        let context = this.services.session.socialSessionContext();
        this.state.current.profileRequest = context;
        let modal = this.ensureProfileModal();
        modal.style.display = 'flex';
        let body = this.deps.document.getElementById('social-profile-body');
        if (body) body.innerHTML = `<div class="social-profile-empty">${this.deps._t('불러오는 중…')}</div>`;
        try {
            let rows = await this.deps.cloudJsonRequest(`/rest/v1/player_profiles?user_id=eq.${encodeURIComponent(userId)}&select=nickname,profile_data,updated_at`, {});
            // 그새 다른 프로필을 열었으면 늦게 온 답이 그 창을 덮지 않게 버린다
            if (this.isProfileRequestCurrent(context)) this.showFetchedProfile(rows);
        } catch (e) {
            if (body && this.isProfileRequestCurrent(context)) body.innerHTML = `<div class="social-profile-empty">${this.deps._t('불러오기 실패: {e}', { e: this.services.format.socialEscape(String(e && e.message || e)) })}</div>`;
        }
    }

    isProfileRequestCurrent(context) {
        return this.state.current.profileRequest === context && this.services.session.isSocialSessionCurrent(context);
    }
}
