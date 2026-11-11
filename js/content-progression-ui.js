/** Menu projection and purchase event boundary; the ledger is owned by contentProgression. */
// 해금 카드의 "…에 있습니다" 줄: 콘텐츠가 있는 곳을 메뉴 이름 그대로.
const CONTENT_ROUTE_PATHS = Object.freeze({
    'item-tab-equip': '장비 → 장비 창', 'item-tab-craft': '장비 → 제작실', 'item-tab-fossil': '장비 → 제작실', 'tab-trade': '거래',
    'skill-tab-equip': '스킬룬 → 룬', 'skill-tab-enhance': '스킬룬 → 각인',
    'skill-tab-condition': '스킬룬 → 전술',
    'tab-codex': '기록 → 도감', 'tab-traits': '스킬트리 → 전직', 'tab-char': '스킬트리',
    'tab-season': '루프 패시브', 'tab-stump': '그루터기 함', 'tab-talent': '재능',
    'tab-unlocks': '해금'
});
const contentUnlockUi = {
    /** 첫 루프의 시작 무기가 가방에 들어오면 장착 안내(2026-11-09 사용자: 첫 처치의 룬 드랍을 직업 무기와 장비 장착 안내로). */
    announceStarterWeapon(item) {
        if (!item || (game.seenTutorials || []).includes(basicSkills.weaponGuide)) return;
        game.unlocks.items = true;
        game.noti.items = true;
        queueTutorialNotice(basicSkills.weaponGuide, _t('첫 무기 장착'),
            _t('[{name}] 무기를 주웠습니다.\n‘장비’에서 가방의 무기를 누르고 ‘장착’을 누르세요.\n무기를 들면 기초 스킬로 싸웁니다.', { name: _t(item.name) }), 'tab-items');
    },
    /** The loop card: the points, then the unlocks this loop adds to the tab, by name only (2026-10-27 사용자: 짧게, 필요한 것만).
     * Free contents are left out: each gets its own card when it opens (announceContent). A loop that adds none names the next one. */
    announceLoop() {
        if (game.season === 2 && !contentProgression.isUnlocked('passiveTree')) return;
        if (!game.contentProgression) {
            queueTutorialNotice('unlock_content_loop_' + game.season, _t('다음 콘텐츠 선택'),
                _t('루프 {loop}에 도달했습니다!\n루프 이정표와 루프 패시브 트리를 루프 탭에서 확인할 수 있습니다.', { loop: game.season }), 'tab-unlocks');
            return;
        }
        const added = this.listed(game.season).filter(def => contentProgression.kind(def) === 'paid' && !contentProgression.isUnlocked(def.id)
            && contentProgression.parents(def).every(id => contentProgression.isUnlocked(id)));
        const paid = added.map(def => `[${_t(def.name)}]`);
        if (contentProgression.points().complete && !added.length) return;
        const lines = [_t('해금 포인트 {balance}P', { balance: contentProgression.balance() })];
        if (paid.length) lines.push(_t('새 해금: {names}', { names: paid.join(', ') }));
        // 고를 것이 새로 없는 루프(7, 9)는 다음에 열리는 루프를 한 줄 미리 보인다.
        if (!added.length) {
            const ahead = CONTENT_UNLOCK_CATALOG.filter(def => !def.series && def.minLoop > game.season).reduce((min, def) => Math.min(min, def.minLoop), Infinity);
            if (Number.isFinite(ahead)) lines.push(_t('루프 {loop}: {names}', { loop: ahead, names: this.listed(ahead).map(def => `[${_t(def.name)}]`).join(', ') }));
        }
        queueTutorialNotice('unlock_content_loop_' + game.season, _t('루프 {season}', { season: game.season }), lines.join('\n'), 'tab-unlocks');
    },
    sync() {
        if (!game.contentProgression) return;
        const enabled = !!game.contentProgression;
        document.body.classList.toggle('content-choice-progression', enabled);
        this.syncOpeningHud();
        document.body.classList.toggle('content-support-locked', enabled && !contentProgression.isUnlocked('support'));
        document.body.classList.toggle('content-craft-locked', !contentProgression.isUnlocked('craft'));
        document.getElementById('loop-passive-locked')?.toggleAttribute('hidden', contentProgression.isUnlocked('loopTree'));
        for (const def of CONTENT_UNLOCK_CATALOG) {
            const locked = !contentProgression.isUnlocked(def.id);
            for (const selector of def.sections || []) {
                document.querySelectorAll(selector).forEach(el => el.toggleAttribute('data-content-locked', locked));
            }
            // 경로는 canOpen을 따른다: 세계수 아틀라스 창은 혼돈계 항목에 걸려 있지만 아틀라스가 열리면 연다. 항목 잠금을 그대로 쓰면
            // 루프 10에 아틀라스가 열려도 창이 숨어 빈 화면이 됐다(2026-10-07 리뷰).
            for (const route of def.routes || []) this.syncRoute(route, !contentProgression.canOpen(route));
        }
        // 해금 목록 항목 없이 진행 조건으로만 열리는 경로.
        for (const route of ['tab-map', 'tab-season', 'tab-unlocks', 'tab-skills', 'tab-items', 'tab-character', 'tab-char', 'tab-social', 'tab-trade', 'map-explore-worldtree']) {
            this.syncRoute(route, !contentProgression.canOpen(route));
        }
        this.resetClosedSelection('itemSubtab', 'item-tab-equip', '#tab-items');
        this.resetClosedSelection('skillSubtab', 'skill-tab-equip', '#tab-skills');
        this.resetClosedSelection('mapSubtab', 'map-tab-zones', '#tab-map');
        this.resetClosedSelection('mapExploreSubtab', 'map-explore-hunting', '#map-tab-zones');
        this.render();
    },
    syncOpeningHud() {
        const locked = contentProgression.opening.combatOnly(game);
        for (const id of ['btn-act-exploration-auto', 'btn-combat-return', 'btn-combat-goal-toggle']) {
            document.getElementById(id)?.toggleAttribute('data-content-locked', locked);
        }
        const chatLocked = !contentProgression.canOpen('tab-social');
        document.body.classList.toggle('opening-chat-locked', chatLocked);
        for (const id of ['btn-combat-chat-tab', 'btn-combat-chat-settings']) {
            document.getElementById(id)?.toggleAttribute('data-content-locked', chatLocked);
        }
        this.syncRuneLauncher();
    },
    syncRuneLauncher() {
        const button = document.getElementById('btn-tab-items');
        if (!button) return;
        const runeOnly = !contentProgression.canOpen('tab-items') && contentProgression.canOpen('tab-skills');
        if (runeOnly) button.dataset.openingRunes = '1';
        else {
            if (!button.dataset.openingRunes) return;
            delete button.dataset.openingRunes;
        }
        const name = runeOnly ? '스킬룬' : '장비';
        const caption = name + '|하단 메뉴';
        const label = button.querySelector('.ui-rail-label');
        if (label && label.textContent !== _t(name)) label.textContent = _t(name);
        button.dataset.i18nSourceDataCaption = caption;
        button.dataset.caption = _t(caption);
    },
    syncRoute(route, locked) {
        // A merged launcher may remain available through another purchased child.
        const group = getMergedTabGroup(route);
        const launcher = group && group[1].launcher === route;
        const closed = launcher ? !getSelectedMergedTabId(group[0]) : locked;
        document.getElementById('btn-' + route)?.toggleAttribute('data-content-locked', closed);
        if (!launcher) document.getElementById(route)?.toggleAttribute('data-content-locked', locked);
    },
    resetClosedSelection(key, fallback, rootId) {
        if (contentProgression.canOpen(game[key])) return;
        game[key] = fallback;
        const panels = key === 'mapExploreSubtab' ? ' .vertical-tab-panel' : ' > .subtab-content';
        const buttons = key === 'mapExploreSubtab' ? ' .vertical-tab-btn' : ' > .subtab-row > button';
        document.querySelectorAll(rootId + panels).forEach(el => el.classList.toggle('active', el.id === fallback));
        document.querySelectorAll(rootId + buttons).forEach(el => el.classList.toggle('active', el.id === 'btn-' + fallback));
    },
    art: def => 'assets/' + (def.art || 'ui/currency/sap-bud.png'),
    /** What a loop's milestone lists: its unlocks without the 강화 steps (their cards say when the next step opens). */
    listed: loop => CONTENT_UNLOCK_CATALOG.filter(row => row.minLoop === loop && !row.series),
    /** Roadmap lines a loop adds beside the unlock catalog (deepening, the stump box, the atlas, 세계수 껍질 ...). Loop settlement shows them too. */
    roadmapAdditions(loop) {
        return (SEASON_CONTENT_ROADMAP[loop]?.features || []).filter(text => /심화:|그루터기 함|아틀라스:|야생 부적|전환점:|전술 조건|버려진 날붙이|최종 관문|세계수 껍질/.test(text));
    },
    entryReward(def, status) {
        const text = def.rewardText;
        const reward = !status.unlocked && text ? `<p class="unlock-reward">${escapeHTML(_t(text))}</p>` : '';
        const picker = !status.unlocked && def.rewardChoices?.length > 1 ? `<label class="content-unlock-choice">${_t('첫 보상')}<select data-unlock-reward="${def.id}" aria-label="${_t('{name} 첫 보상', { name: escapeHTML(_t(def.name)) })}">${def.rewardChoices.map(row => `<option value="${row.key}">${escapeHTML(_t(row.label))}</option>`).join('')}</select></label>` : '';
        return reward + picker;
    },
    lockAttribute(id) {
        return contentProgression.isUnlocked(id) ? '' : 'data-content-locked';
    },
    render() {
        if (typeof unlockTabUi === 'object') unlockTabUi.render();
    },
    select(id) {
        unlockTabUi.select(id);
    },
    /** scope: the detail the button was pressed in (its first reward choice). */
    purchase(id, scope = document) {
        this.takeContent(id, scope);
    },
    takeContent(id, scope) {
        const key = scope.querySelector(`[data-unlock-reward="${id}"]`)?.value, opened = this.openedContents();
        const result = contentProgression.purchase(id, game, key);
        if (!result.ok) { addLog(result.message, 'attack-monster', { toast: true }); return; }
        // The unlock card says the same and more: no toast (PC) or bottom notice (phone) on top of it.
        const carded = id === 'passiveTree' || this.announceContent(id);
        addLog(result.message, 'season-up', { toast: !carded, noToast: carded });
        this.announceOpenedSince(opened); // free content that comes with it (장비 전당 with 고유 도감)
        // 공허 소켓은 스킬트리에 숨어 있던 공허 칸을 드러낸다(js/passives.js isVoidSocketHidden): 길과 화면을 다시 잇고 스킬트리에 알림 점을 켠다.
        if (id === 'voidSocket') { refreshPassiveConnectivity(); game.noti.char = true; }
        // 지금 살 수 있는 해금이 남았을 때만 알림: 뒤 루프의 강화 단계를 기다리는 포인트는 소식이 아니다(2026-10-25).
        game.noti.season = CONTENT_UNLOCK_CATALOG.some(def => contentProgression.kind(def) === 'paid' && contentProgression.status(def.id).available);
        checkUnlocks();
        updateStaticUI();
        saveGame({ skipCloudSync: false });
    },
    routeAction(def) {
        if (def.action) return def.action;
        const route = def.routes?.[0];
        if (!route) return null;
        if (route.startsWith('item-tab-')) return { tab:'tab-items', subtab:route };
        if (route.startsWith('skill-tab-')) return { tab:'tab-skills', skillSubtab:route };
        if (route.startsWith('map-explore-')) return { tab:'tab-map', mapSubtab:'map-tab-zones', explore:route };
        if (route.startsWith('map-tab-')) return { tab:'tab-map', mapSubtab:route };
        if (route.startsWith('tab-')) return { tab:route };
        return null;
    },
    openSection(id) {
        uiDisclosureState[`id:${id}`] = true;
        const section = document.getElementById(id);
        if (section) section.open = true;
        requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block:'nearest' }));
    },
    /** The route an unlock card or button opens: explore / sub-tab / tab, whichever is most exact. */
    routeKey(action) {
        const map = action.mapSubtab && action.mapSubtab !== 'map-tab-zones' ? action.mapSubtab : null;
        return action.explore || action.subtab || action.skillSubtab || map || action.tab;
    },
    journeyPath(route) {
        const guide = EXPLORATION_REGIONS.guides[route];
        return guide ? guide.path.split(' → ').map(step => _t(step)).join(' → ') : '';
    },
    journeyNotice(route) {
        const guide = EXPLORATION_REGIONS.guides[route];
        const line = guide.notice || guide.reward;
        return [_t(line), _t('입장 경로 · {path}', { path: this.journeyPath(route) })].join('\n');
    },
    noticeContentId(notice) {
        return notice.contentId || (notice.key?.startsWith('unlock_content_') ? notice.key.slice('unlock_content_'.length) : '');
    },
    journeyForNotice(notice) {
        const id = this.noticeContentId(notice);
        const def = id && CONTENT_UNLOCK_CATALOG.find(row => row.id === id);
        if (!def) return Object.keys(EXPLORATION_REGIONS.guides).find(key => EXPLORATION_REGIONS.guides[key].noticeKey === notice.key);
        const action = this.routeAction(def);
        return action && (def.action?.guide || this.routeKey(action));
    },
    noticeBody(def, route) {
        const guideKey = def.action?.guide || route;
        if (EXPLORATION_REGIONS.guides[guideKey]) return this.journeyNotice(guideKey);
        const path = CONTENT_ROUTE_PATHS[route];
        return path ? _t('{description}\n‘{path}’에 있습니다.', { description: _t(def.description), path: _t(path) }) : def.description;
    },
    /** Destinations whose first discovery is a world event rather than a ledger purchase. */
    announceJourney(guideKey) {
        const guide = EXPLORATION_REGIONS.guides[guideKey];
        const outside = guideKey === 'outside-chaos';
        queueTutorialNotice(guide.noticeKey, guide.title, this.journeyNotice(guideKey), outside ? 'tab-season' : 'tab-map',
            outside ? null : { subtabId: guide.mapRoute || guideKey, atlasView: guide.atlasView });
    },
    announceOutsideChaos() {
        const key = EXPLORATION_REGIONS.guides['outside-chaos'].noticeKey;
        if (game.season < 10 || game.chaosRealm.unlocked || game.isBackgroundCalculation) return;
        if (game.seenTutorials.includes(key) || game.tutorialHistory.some(row => row.key === key)) return;
        if (hasCurrentLoopAbyssRequirementClear(game.season)) this.announceJourney('outside-chaos');
    },
    canOpenProgressTarget(route) {
        if (route === 'outside-chaos') return game.season >= 10 && contentProgression.canOpen('tab-season');
        if (route === 'map-explore-chaos') return contentProgression.canOpen('tab-map');
        return explorationAtlasUi.available(route);
    },
    openProgressTarget(route) {
        if (!this.canOpenProgressTarget(route)) return false;
        if (route === 'outside-chaos') {
            switchTab('tab-season', { keepWindowOpen: true });
            this.openSection('ui-loop10-section');
        } else if (route === 'map-explore-chaos' && !explorationAtlasUi.available(route)) {
            explorationAtlasUi.openAct(Math.min(STORY_ACTS.length - 1, game.maxZoneId));
        } else {
            switchTab('tab-map', { keepWindowOpen: true });
            explorationAtlasUi.enter(route);
            explorationAtlasUi.openEntryPage(route);
        }
        return true;
    },
    progressButton(route, label) {
        if (!route || !this.canOpenProgressTarget(route)) return '';
        return `<button type="button" data-progress-target="${escapeHTML(route)}">${escapeHTML(_t(label))}</button>`;
    },
    /** New content card: what it is (the catalog line) and where it lives. Once per content; returns true if queued. */
    announceContent(id, inline = false) {
        const def = CONTENT_UNLOCK_CATALOG.find(row => row.id === id);
        // 강화 단계(def.series)는 카드 없이 기록만 남긴다: 가방 쪽, 그루터기 보관함은 새 콘텐츠가 아니다.
        if (!def || !contentProgression.isUnlocked(id) || def.series || (def.minLoop <= 1 && id !== 'tactics')) return false;
        const action = this.routeAction(def), route = action ? this.routeKey(action) : null;
        const before = tutorialQueue.length;
        queueTutorialNotice(`unlock_content_${id}`, def.name, this.noticeBody(def, route),
            action ? action.tab : null, { subtabId: route, contentId: id, inline, openLabel: _t('{name} 열기', { name: _t(def.name) }) });
        return tutorialQueue.length > before;
    },
    /** Free contents open right now (contentProgression keeps them in automatic once reached). */
    openedContents(owner = game) {
        return new Set(owner.contentProgression?.automatic || []);
    },
    announceOpenedSince(before) {
        this.openedContents().forEach(id => {
            if (before.has(id)) return;
            if (id === 'tactics' && contentProgression.opening.applies(game)) {
                game.noti.skills = true;
                return this.announceContent(id, true);
            }
            this.announceContent(id);
        });
    },
    /** contentProgression.sync, plus a card for each free content that has just opened (loop reached, condition met).
     * Contents open at load are not news: the save migration syncs before any of this runs. */
    syncOpened() {
        const before = this.openedContents();
        contentProgression.sync();
        this.announceOpenedSince(before);
        this.announceOutsideChaos();
    },
    /** Replay suppresses foreground notices. Recover only discoveries made by the settlement being committed. */
    announceSettledUnlocks(before) {
        this.announceOpenedSince(this.openedContents(before));
        if (!before.atlas?.unlocked && game.atlas.unlocked) this.announceJourney('map-explore-worldtree');
        this.announceOutsideChaos();
    },
    personal: text => String(text || '').split(/[\s,]+/).pop(),
    /** What the NPC has for the hero, for the mark over it on the stage (js/canvas-act-title-card.js) and in the NPC tab: 'talk' while
     * a keyword it can speak of has not been heard, else ''. npc: { id, name }. */
    npcNews(npc) {
        if (!game.contentProgression) return '';
        return this.npcTopics(npc).open.some(row => !this.npcHeard(npc, row.topic)) ? 'talk' : '';
    },
    /** The NPC's window, an ARPG's NPC talk (2026-10-15 사용자: "POE처럼 키워드 누르면 관련 스크립트만", "NPC 대화창도 정성들여서"):
     * the NPC's portrait on the left; on the right its name, a speech box with what it says (its line on the stage when the window
     * opens, then the chosen keyword's), the keywords it can speak of (STORY_NPCS dialogues, new ones marked until heard, heard ones
     * grey) and, under them, the door to its shop (js/npc-shop-ui.js), which takes the body.
     * npc: { id, name, title, tone, line } (js/canvas-act-title-card.js npcAt, js/npc-roster-ui.js). */
    openNpc(npc, mode = 'talk') {
        const old = document.getElementById('npc-dialog');
        if (!npc || (old && old.open)) return false;
        if (!contentProgression.opening.canOpen(game, 'tab-trade') || (mode === 'exchange' && npc.id !== NPC_CURRENCY_EXCHANGE.npc)) mode = 'talk';
        if (old) old.remove(); // closed a moment ago, its close event (which removes it) not yet run
        const view = { npc, mode, topic: null };
        const dialog = document.createElement('dialog');
        dialog.id = 'npc-dialog';
        dialog.className = 'npc-dialog';
        dialog.dataset.npcId = npc.id;
        dialog.dataset.tone = npc.tone || 'gold';
        dialog.setAttribute('aria-labelledby', 'npc-dialog-name');
        dialog.addEventListener('click', event => this.npcClick(dialog, view, event));
        dialog.addEventListener('close', () => dialog.remove(), { once: true });
        document.body.appendChild(dialog);
        this.renderNpc(dialog, view);
        dialog.showModal();
        systemTutorialUi.visit('npc-shop');
        return true;
    },
    renderNpc(dialog, view) {
        const npc = view.npc;
        dialog.classList.toggle('is-shop', view.mode !== 'talk');
        dialog.innerHTML = `<figure class="npc-dialog-figure"><img class="npc-dialog-portrait" src="${STAGE_NPC_ART.path}${npc.id}-portrait.webp" alt=""></figure>
            <div class="npc-dialog-main"><header class="npc-dialog-head"><div class="npc-dialog-who">
            <h2 id="npc-dialog-name">${escapeHTML(_t(npc.name))}</h2><p class="npc-dialog-title">${escapeHTML(_t(npc.title || ''))}</p></div>
            <button type="button" class="npc-dialog-close" data-npc-close>${_t('닫기')}</button></header>
            ${this.npcModeBody(view)}</div>`;
    },
    /** The body under the head: the talk, the shop or the currency exchange. */
    npcModeBody(view) {
        if (view.mode === 'shop') return npcShopUi.body(view.npc);
        return view.mode === 'exchange' ? orgaExchangeUi.body() : this.npcTalkBody(view);
    },
    /** The speech box, the keywords and the foot (npcFoot). */
    npcTalkBody(view) {
        const npc = view.npc, { open } = this.npcTopics(npc), topic = open.find(row => row.topic === view.topic) || null;
        const keys = open.map(row => {
            const heard = this.npcHeard(npc, row.topic);
            return `<li><button type="button" class="${heard ? 'is-heard' : 'is-new'}" data-npc-topic="${escapeHTML(row.topic)}" aria-pressed="${row === topic}">
                <span>${escapeHTML(_t(row.topic))}</span>${heard ? '' : _t('<em>새 이야기</em>')}</button></li>`;
        }).join('');
        return `<section class="npc-dialog-speech" aria-live="polite">${topic ? `<h3>${escapeHTML(_t(topic.topic))}</h3>` : ''}
            <p>${escapeHTML(_t(topic ? topic.line : this.npcGreeting(npc)))}</p></section>
            <nav class="npc-dialog-talk" aria-label="${_t('이야깃거리')}"><h4>${_t('이야기')}</h4><ul class="npc-dialog-topics">${keys}</ul></nav>
            ${this.npcFoot(view)}`;
    },
    /** The doors to the shop and, at Veila's, to the currency exchange. */
    npcFoot(view) {
        if (!contentProgression.opening.canOpen(game, 'tab-trade')) return '';
        const doors = npcShopUi.door(view.npc) + orgaExchangeUi.door(view.npc);
        return doors ? `<footer class="npc-dialog-foot">${doors}</footer>` : '';
    },
    /** The keywords the NPC can speak of now (STORY_NPCS dialogues, docs/story-bible.md section 4): a keyword waits for the act it
     * speaks of (reqAct, any act after a first loop) and for its loop (reqLoop). */
    npcTopics(npc) {
        const rows = (STORY_NPCS[npc.id] || {}).dialogues || [], act = this.npcReachedAct(), loop = game.season || 1;
        return { open: rows.filter(row => (!row.reqAct || act >= row.reqAct) && (!row.reqLoop || loop >= row.reqLoop)) };
    },
    /** The furthest story act the hero has reached in this loop (STORY_ACTS order), or every act after a first loop. */
    npcReachedAct() {
        if ((game.season || 1) > 1) return STORY_ACTS.length;
        const zone = Math.max(Number(game.maxZoneId) || 0, Number.isInteger(game.currentZoneId) ? game.currentZoneId : 0);
        return STORY_ACTS.filter((act, index) => index <= zone).reduce((top, act) => Math.max(top, act.order), 1);
    },
    /** What the NPC says when the window opens: its line on the stage, else its first words in the latest act it met the hero. */
    npcGreeting(npc) {
        if (npc.line) return npc.line;
        const me = this.personal(npc.name), act = this.npcReachedAct();
        const met = STORY_ACTS.filter(row => row.order <= act).map(row => (STORY_ACT_ENCOUNTERS[row.order] || {}).npc)
            .filter(said => said && this.personal(said.name) === me).pop();
        return met ? met.bark : npc.title;
    },
    /** Heard keywords are kept in the save (game.npcHeard, "npcId:keyword"): the window and the stage mark tell new ones apart. */
    npcHeardKey: (npc, topic) => `${npc.id}:${topic}`,
    npcHeard(npc, topic) {
        return game.npcHeard.includes(this.npcHeardKey(npc, topic));
    },
    hearNpcTopic(npc, topic) {
        if (!this.npcHeard(npc, topic)) game.npcHeard.push(this.npcHeardKey(npc, topic));
    },
    /** A keyword shows its line (and counts as heard; 상점 opens the shop, its 대화 the talk again). The shop's own presses are
     * js/npc-shop-ui.js's. */
    npcClick(dialog, view, event) {
        const control = event.target.closest('button');
        if (!control) return;
        if (control.dataset.npcClose !== undefined) { dialog.close(); return; }
        if (control.dataset.npcTopic) { this.npcPickTopic(view, control.dataset.npcTopic); this.renderNpc(dialog, view); }
    },
    npcPickTopic(view, topic) {
        if (topic === 'shop' || topic === 'exchange') {
            if (topic === 'exchange' && view.npc.id !== NPC_CURRENCY_EXCHANGE.npc) return;
            if (contentProgression.opening.canOpen(game, 'tab-trade')) view.mode = topic;
            return;
        }
        const known = this.npcTopics(view.npc).open.some(row => row.topic === topic);
        Object.assign(view, { mode: 'talk', topic: known ? topic : null });
        if (known) this.hearNpcTopic(view.npc, topic);
    },
    open(id) {
        if (!contentProgression.isUnlocked(id)) return false;
        const def = CONTENT_UNLOCK_CATALOG.find(row => row.id === id);
        const action = this.routeAction(def);
        if (!action || !contentProgression.canOpen(this.routeKey(action))) return false;
        switchTab(action.tab, { keepWindowOpen: true });
        if (action.subtab) switchItemSubtab(action.subtab);
        if (action.skillSubtab) switchSkillSubtab(action.skillSubtab);
        if (action.mapSubtab) switchMapSubtab(action.mapSubtab);
        if (action.explore) switchMapExploreSubtab(action.explore);
        explorationAtlasUi.openEntryPage(this.routeKey(action));
        if (action.atlasView) atlasUi.setView(action.atlasView);
        if (action.section) this.openSection(action.section);
        return true;
    }
};
document.addEventListener('click', event => {
    const progress = event.target.closest('[data-progress-target]');
    if (progress) contentUnlockUi.openProgressTarget(progress.dataset.progressTarget);
    const button = event.target.closest('[data-unlock-content]');
    if (button && !button.disabled) contentUnlockUi.purchase(button.dataset.unlockContent, button.closest('.unlock-detail') || document);
    const open = event.target.closest('[data-open-content]');
    if (open) contentUnlockUi.open(open.dataset.openContent);
});
// NPC pictures are local stage art (assets/stage-npcs): where one is missing, drop it rather than show a broken image.
document.addEventListener('error', event => {
    if (!(event.target instanceof HTMLImageElement)) return;
    if (event.target.matches('.npc-dialog-portrait, .npc-roster-portrait')) event.target.remove();
}, true);
safeExposeGlobals({ contentUnlockUi });
