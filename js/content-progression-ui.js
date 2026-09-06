/** Menu projection and purchase event boundary; the ledger is owned by contentProgression. */
const contentUnlockUi = {
    renderedKey: '',
    selectedId: 'craft',
    view: 'choice',
    group: 'all',
    showAllMilestones: false,
    announceStarterGem(name) {
        if (!name || (game.seenTutorials || []).includes('tutorial_starter_gem_equip')) return;
        game.unlocks.skills = true;
        game.noti.skills = true;
        queueTutorialNotice('tutorial_starter_gem_equip', '첫 스킬 젬 장착',
            `[${name}] 젬을 획득했습니다.\n스킬 젬 탭을 열고 빛나는 젬 카드를 클릭해 장착하세요.`, 'tab-skills');
    },
    announceLoop() {
        const body = game.contentProgression
            ? `루프 ${game.season} 도달 · 해금 포인트 ${CONTENT_UNLOCK_POINTS_PER_LOOP}점을 얻었습니다.\n해금 탭에서 원하는 콘텐츠를 선택하세요.`
            : `루프 ${game.season}에 도달했습니다!\n루프 이정표와 루프 패시브 트리를 루프 탭에서 확인할 수 있습니다.`;
        queueTutorialNotice('unlock_content_loop_' + game.season, '다음 콘텐츠 선택', body, 'tab-unlocks');
    },
    sync() {
        if (!game.contentProgression) return;
        const enabled = !!game.contentProgression;
        document.body.classList.toggle('content-choice-progression', enabled);
        document.body.classList.toggle('content-support-locked', enabled && !contentProgression.isUnlocked('support'));
        document.body.classList.toggle('content-craft-locked', !contentProgression.isUnlocked('craft'));
        document.getElementById('loop-passive-locked')?.toggleAttribute('hidden', contentProgression.isUnlocked('loopTree'));
        for (const def of CONTENT_UNLOCK_CATALOG) {
            const locked = !contentProgression.isUnlocked(def.id);
            for (const selector of def.sections || []) {
                document.querySelectorAll(selector).forEach(el => el.toggleAttribute('data-content-locked', locked));
            }
            for (const route of def.routes || []) this.syncRoute(route, locked);
        }
        for (const route of ['tab-map', 'tab-season', 'tab-unlocks']) this.syncRoute(route, !contentProgression.canOpen(route));
        this.resetClosedSelection('itemSubtab', 'item-tab-equip', '#tab-items');
        this.resetClosedSelection('skillSubtab', 'skill-tab-equip', '#tab-skills');
        this.resetClosedSelection('mapSubtab', 'map-tab-zones', '#tab-map');
        this.resetClosedSelection('mapExploreSubtab', 'map-explore-hunting', '#map-tab-zones');
        this.syncSkillCopy();
        this.render();
    },
    syncSkillCopy() {
        const label = document.querySelector('#btn-skill-tab-equip strong');
        if (label) label.textContent = contentProgression.isUnlocked('support') ? '장착 · 보조' : '스킬 젬';
        const intro = document.querySelector('.skill-loadout-overview p');
        if (intro) intro.textContent = contentProgression.isUnlocked('support')
            ? '공격 젬과 보조 젬을 선택해 전투 세팅을 구성합니다.' : '공격 스킬 젬을 선택해 장착합니다.';
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
    art(def) {
        const root = CONTENT_UNLOCK_CATALOG.find(row => row.id === this.branchRoot(def));
        return 'assets/' + (def.art || root.art || 'ui/currency/sap-bud.png');
    },
    node(def) {
        const status = contentProgression.status(def.id);
        const state = status.unlocked ? 'owned' : status.available ? 'ready' : 'locked';
        const label = status.unlocked ? '해금 완료' : status.available ? `선택 가능 · ${def.cost}P` : status.reason;
        return `<button type="button" class="unlock-node is-${state}" data-unlock-select="${def.id}" aria-pressed="${this.selectedId === def.id}">
            <span class="unlock-node-art"><img src="${this.art(def)}" alt="" loading="lazy"></span>
            <strong>${escapeHTML(def.name)}</strong><small>${escapeHTML(label)}</small><span class="unlock-lifetime-tag">${escapeHTML(def.lifecycle?.label || '해금 영구 유지')}</span></button>`;
    },
    branchRoot(def) {
        if (def.displayBranch) return def.displayBranch;
        let node = def;
        while (node.after && !node.branchStart && !node.displayBranch) node = CONTENT_UNLOCK_CATALOG.find(row => row.id === node.after);
        return node.displayBranch || node.id;
    },
    depth(def) {
        if (def.displayBranch) return 0;
        let depth = 0, node = def;
        while (node.after && !node.branchStart && !node.displayBranch) { depth++; node = CONTENT_UNLOCK_CATALOG.find(row => row.id === node.after); }
        return depth;
    },
    connections(nodes, depths) {
        // Coordinates match the fixed node columns; SVG scales with the compact mobile grid.
        const columns = depths.map(depth => nodes.filter(row => this.depth(row) === depth));
        const position = def => ({ x:depths.indexOf(this.depth(def)) * 160 + 68,
            y:columns[depths.indexOf(this.depth(def))].findIndex(row => row.id === def.id) * 156 + 69 });
        const entries = nodes.filter(row => row.after === 'craft').map(def =>
            `<path pathLength="1" d="M-15,${position(def).y} H${position(def).x - 34}"/>`).join('');
        const paths = nodes.filter(row => nodes.some(parent => parent.id === row.after)).map(def => {
            const from = position(nodes.find(row => row.id === def.after)), to = position(def);
            const start = from.x + 34, end = to.x - 34, middle = (start + end) / 2;
            return `<path pathLength="1" d="M${start},${from.y} C${middle},${from.y} ${middle},${to.y} ${end},${to.y}"/>`;
        }).join('');
        return `<svg class="unlock-connections" viewBox="0 0 ${columns.length * 160 - 24} ${Math.max(...columns.map(rows => rows.length)) * 156 + 16}" preserveAspectRatio="none" aria-hidden="true">${entries}${paths}</svg>`;
    },
    choiceMap() {
        const starter = CONTENT_UNLOCK_CATALOG.find(row => row.id === 'craft');
        if (!contentProgression.isUnlocked('craft')) return `<div class="unlock-start"><span class="unlock-eyebrow">첫 성장</span>${this.node(starter)}<p>장비에 첫 옵션을 더하고<br>다음 성장 갈래를 열어보세요.</p></div>`;
        const roots = CONTENT_UNLOCK_CATALOG.filter(row => row.cost > 0 && (!row.after || row.branchStart));
        const filters = roots.map(row => `<button type="button" data-unlock-group="${row.id}" aria-pressed="${this.group === row.id}">${escapeHTML(row.group)}</button>`).join('');
        const branches = roots.filter(row => this.group === 'all' || row.id === this.group).map(root => {
            const nodes = CONTENT_UNLOCK_CATALOG.filter(row => row.cost > 0 && row.id !== 'craft' && this.branchRoot(row) === root.id);
            const depths = [...new Set(nodes.map(row => this.depth(row)))].sort((a,b) => a-b);
            const columns = depths.map(depth => `<div class="unlock-depth"><span class="unlock-depth-label">${depths.indexOf(depth) + 2}단계</span>${nodes.filter(row => this.depth(row) === depth).map(row => this.node(row)).join('')}</div>`).join('');
            return `<section class="unlock-branch" aria-label="${escapeHTML(root.group)}"><span class="unlock-trunk" aria-hidden="true"></span><h3>${escapeHTML(root.group)}</h3><div class="unlock-path">${this.connections(nodes, depths)}${columns}</div></section>`;
        }).join('');
        return `<nav class="unlock-filters" aria-label="성장 분야"><button type="button" data-unlock-group="all" aria-pressed="${this.group === 'all'}">전체</button>${filters}</nav>
            <div class="unlock-map" tabindex="0" aria-label="성장 해금 연결도"><button type="button" class="unlock-origin" data-unlock-select="craft" aria-pressed="${this.selectedId === 'craft'}"><span class="unlock-node-art"><img src="${this.art(starter)}" alt=""></span><span class="unlock-origin-label">장비 제련 <small>해금 완료 · 이어지는 성장 선택</small></span></button>${branches}</div>`;
    },
    /** A one-time visual transition from the existing starter; never stored in the progression ledger. */
    revealBranches(root, previous) {
        const origin = root.querySelector('.unlock-origin .unlock-node-art');
        if (!previous || !origin) return;
        const visible = previous.bottom > 0 && previous.top < window.innerHeight;
        if (!visible) root.querySelector('.unlock-filters').scrollIntoView({ block:'start', behavior:'instant' });
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const current = origin.getBoundingClientRect();
        const start = visible ? `translate(${previous.left - current.left}px, ${previous.top - current.top}px)` : 'translateY(8px)';
        origin.animate([{ transform:start }, { transform:'none' }], { duration:420, easing:'cubic-bezier(.22,1,.36,1)' });
        root.querySelector('.unlock-origin-label').animate([{ opacity:0 }, { opacity:1 }], { duration:350, delay:200, fill:'backwards' });
        root.querySelectorAll('.unlock-branch').forEach((branch, index) => {
            const delay = 280 + index * 100;
            branch.querySelector('.unlock-trunk').animate([{ transform:'scaleY(0)' }, { transform:'scaleY(1)' }], { duration:420, delay, fill:'backwards' });
            branch.querySelectorAll('path').forEach(path => path.animate(
                [{ strokeDasharray:'1', strokeDashoffset:1 }, { strokeDasharray:'1', strokeDashoffset:0 }],
                { duration:480, delay:delay + 100, fill:'backwards' }));
            branch.querySelectorAll('.unlock-depth, h3').forEach((column, depth) => column.animate(
                [{ opacity:0, transform:'translateX(-12px)' }, { opacity:1, transform:'none' }],
                { duration:420, delay:delay + 140 + depth * 70, fill:'backwards', easing:'ease-out' }));
        });
    },
    milestone(loop) {
        const rows = CONTENT_UNLOCK_CATALOG.filter(row => row.minLoop === loop);
        const choices = rows.filter(row => row.cost > 0);
        const automatic = rows.filter(row => row.cost === 0);
        const additions = (SEASON_CONTENT_ROADMAP[loop]?.features || []).filter(text => /심화:|생장판 확장|생장판 시너지|전환점:|전술 조건|버려진 날붙이|최종 관문/.test(text));
        return `<details id="unlock-milestone-${loop}" class="unlock-milestone" ${loop === game.season ? 'open' : ''}>
            <summary><strong>루프 ${loop}</strong><span>${loop < game.season ? '도달 완료' : loop === game.season ? '현재 여정' : '예정'}</span></summary>
            <p class="unlock-loop-requirement">${escapeHTML(getLoopAbyssRequirementText(loop))}</p>
            ${this.milestoneRows(automatic, '자동 개방')}${this.milestoneRows(choices, '성장 선택')}
            ${additions.length ? `<p class="unlock-expansion">${additions.map(escapeHTML).join('<br>')}</p>` : ''}</details>`;
    },
    milestoneRows(rows, label) {
        if (!rows.length) return '';
        return `<div class="unlock-milestone-group"><h4>${label}</h4>${rows.map(def => {
            const status = contentProgression.status(def.id);
            const caption = status.unlocked ? '해금 완료' : status.available ? `선택 가능 · ${def.cost}P` : status.reason;
            return `<button type="button" data-unlock-select="${def.id}" class="unlock-milestone-item"><span>${escapeHTML(def.name)}<span class="unlock-lifetime-tag">${escapeHTML(def.lifecycle?.label || '해금 영구 유지')}</span></span><small>${escapeHTML(caption)}</small></button>`;
        }).join('')}</div>`;
    },
    progressionMap() {
        const loops = Object.keys(SEASON_CONTENT_ROADMAP).map(Number);
        const shown = this.showAllMilestones ? loops : loops.filter(loop => loop >= game.season && loop <= game.season + 4);
        const toggle = this.showAllMilestones ? '현재·다음 이정표만' : '전체 이정표 보기';
        return `<div class="unlock-milestone-intro"><p>전투는 진행에 따라 열리고, 성장 수단은 직접 선택합니다.</p>
            <button type="button" data-unlock-horizon="toggle">${toggle}</button></div>
            <div class="unlock-milestones">${shown.map(loop => this.milestone(loop)).join('') || this.milestone(game.season)}</div>`;
    },
    entryReward(def, status) {
        const reward = !status.unlocked && def.rewardText ? `<p class="unlock-reward">${escapeHTML(def.rewardText)}</p>` : '';
        const picker = !status.unlocked && def.rewardChoices?.length > 1 ? `<label class="content-unlock-choice">첫 보상<select data-unlock-reward="${def.id}" aria-label="${escapeHTML(def.name)} 첫 보상">${def.rewardChoices.map(row => `<option value="${row.key}">${escapeHTML(row.label)}</option>`).join('')}</select></label>` : '';
        const guide = def.id === 'craft' ? '<p class="unlock-craft-guide">노멀 장비가 없다면 사냥에서 획득하세요. 제련하지 않아도 다음 루프는 진행할 수 있습니다.</p>' : '';
        return reward + picker + guide;
    },
    lockAttribute(id) {
        return contentProgression.isUnlocked(id) ? '' : 'data-content-locked';
    },
    lifecycle(def) {
        const life = def.lifecycle;
        if (!life) return '<p class="unlock-lifetime-note">기능 해금은 다음 루프에도 유지됩니다.</p>';
        return `<details class="unlock-lifetime" id="unlock-lifetime-${def.id}"><summary>루프 전환 시 · ${escapeHTML(life.label)}</summary><p class="unlock-lifetime-note">기능 해금은 영구 유지</p>
            ${life.kept ? `<p><b>유지</b>${escapeHTML(life.kept)}</p>` : ''}${life.reset ? `<p><b>초기화</b>${escapeHTML(life.reset)}</p>` : ''}</details>`;
    },
    relatedFeatures(def) {
        if (!def.features) return '';
        const stages = def.id === 'growth' ? GROWTH_SYNERGY_STAGES.map(stage =>
            `<li>루프 ${stage.req.season} · ${escapeHTML(stage.label)}</li>`).join('') : '';
        return `<details class="unlock-related" id="unlock-related-${def.id}"><summary>포함된 성장 요소</summary>${def.features.map(row =>
            `<p><strong>${escapeHTML(row.name)}</strong>${escapeHTML(row.description)}</p>`).join('')}${stages ? `<ul>${stages}</ul>` : ''}</details>`;
    },
    detail(def) {
        const status = contentProgression.status(def.id);
        const conditions = contentProgression.requirements(def.id);
        const action = status.unlocked ? this.openButton(def) : def.cost === 0
            ? '<button type="button" disabled>조건 달성 시 자동 개방</button>'
            : `<button type="button" data-unlock-content="${def.id}" ${status.available ? '' : 'disabled'}>${escapeHTML(status.reason)}</button>`;
        return `<div class="unlock-detail-top"><span class="unlock-eyebrow">${escapeHTML(def.group)} · ${def.cost ? '선택 해금' : '자동 개방'}</span>
            <div class="unlock-detail-art"><img src="${this.art(def)}" alt=""></div><h3>${escapeHTML(def.name)}</h3><p>${escapeHTML(def.description)}</p></div>
            ${this.lifecycle(def)}${this.relatedFeatures(def)}
            <div class="unlock-requirements"><h4>${status.unlocked ? '해금 완료' : `해금 조건${def.cost ? ' · ' + def.cost + 'P' : ''}`}</h4>${conditions.map(row => `<div class="${row.met ? 'is-met' : ''}"><span>${escapeHTML(row.label)}</span><small>${row.met ? '달성' : '미달성'}</small></div>`).join('')}</div>
            <div class="unlock-detail-action">${this.entryReward(def, status)}${action}</div>`;
    },
    openButton(def) {
        const reachable = def.action || (def.routes || []).some(route => route.startsWith('tab-') || route.startsWith('item-tab-') || route.startsWith('skill-tab-') || route.startsWith('map-'));
        return reachable ? `<button type="button" data-open-content="${def.id}">바로 사용하기</button>` : '<span class="content-unlock-owned">해금 완료</span>';
    },
    render() {
        const root = document.getElementById('content-unlock-panel');
        if (!root || !game.contentProgression) return;
        const states = CONTENT_UNLOCK_CATALOG.map(def => [def.id, contentProgression.status(def.id), contentProgression.requirements(def.id)]);
        const key = JSON.stringify([game.season, contentProgression.balance(), states, this.view, this.group, this.selectedId, this.showAllMilestones]);
        if (this.renderedKey === key && root.childNodes.length) return;
        this.renderedKey = key;
        const starter = root.querySelector('.unlock-start .unlock-node-art')?.getBoundingClientRect();
        const scroll = [...root.querySelectorAll('.unlock-map, .unlock-milestones')].map(el => [el.className, el.scrollLeft, el.scrollTop]);
        captureUiDisclosureState(root);
        const selected = CONTENT_UNLOCK_CATALOG.find(row => row.id === this.selectedId);
        root.innerHTML = `<header class="content-unlock-heading"><span>루프 ${game.season}</span><div class="content-unlock-balance" title="루프 2부터 매 루프 ${CONTENT_UNLOCK_POINTS_PER_LOOP}P"><span>해금</span><strong>${contentProgression.balance()}</strong><span>P</span></div></header>
            <div class="unlock-toolbar"><nav aria-label="해금 방식"><button type="button" data-unlock-view="choice" aria-pressed="${this.view === 'choice'}">선택 해금</button><button type="button" data-unlock-view="progress" aria-pressed="${this.view === 'progress'}">진행 · 이정표</button></nav></div>
            <div class="unlock-workspace"><div class="unlock-content">${this.view === 'choice' ? this.choiceMap() : this.progressionMap()}</div>
            <aside class="unlock-detail" aria-label="선택한 콘텐츠">${this.detail(selected)}</aside></div>`;
        restoreUiDisclosureState(root);
        scroll.forEach(([name, left, top]) => root.getElementsByClassName(name)[0]?.scrollTo({ left, top }));
        this.revealBranches(root, starter);
    },
    handleControl(control) {
        if (!control) return;
        const data = control.dataset;
        if (data.unlockSelect) { this.select(data.unlockSelect); return; }
        if (data.unlockView) this.view = data.unlockView;
        if (data.unlockGroup) this.group = data.unlockGroup;
        if (data.unlockHorizon) this.showAllMilestones = !this.showAllMilestones;
        this.render();
    },
    select(id) {
        if (!CONTENT_UNLOCK_CATALOG.some(row => row.id === id)) return;
        this.selectedId = id;
        this.render();
        const root = document.getElementById('content-unlock-panel');
        root.querySelector(`[data-unlock-select="${id}"]`)?.focus({ preventScroll:true });
        if (root.clientWidth < 600) root.querySelector('.unlock-detail').scrollIntoView({ block:'nearest' });
    },
    purchase(id) {
        const key = document.querySelector(`[data-unlock-reward="${id}"]`)?.value;
        const result = contentProgression.purchase(id, game, key);
        if (!result.ok) { addLog(result.message, 'attack-monster', { toast: true }); return; }
        addLog(result.message, 'season-up', { toast: true });
        game.noti.season = contentProgression.balance() > 0;
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
    openBounty() {
        switchTab('tab-battle');
        const state = bountyRuntime.ensureState();
        if (state.remaining===0) { bountyUi.openTreasure(); return; }
        addLog(`다음 보물사냥까지 보스 ${state.remaining}회 처치`, 'season-up', { toast:true });
    },
    open(id) {
        if (!contentProgression.isUnlocked(id)) return;
        const def = CONTENT_UNLOCK_CATALOG.find(row => row.id === id);
        const action = this.routeAction(def);
        if (!action) return;
        if (action.bounty) { this.openBounty(); return; }
        if (!getRenderingUiTabIds().has(action.tab)) switchTab(action.tab);
        if (action.subtab) switchItemSubtab(action.subtab);
        if (action.skillSubtab) switchSkillSubtab(action.skillSubtab);
        if (action.mapSubtab) switchMapSubtab(action.mapSubtab);
        if (action.explore) switchMapExploreSubtab(action.explore);
        if (action.section) this.openSection(action.section);
    }
};
document.addEventListener('click', event => {
    contentUnlockUi.handleControl(event.target.closest('button'));
    const button = event.target.closest('[data-unlock-content]');
    if (button && !button.disabled) contentUnlockUi.purchase(button.dataset.unlockContent);
    const open = event.target.closest('[data-open-content]');
    if (open) contentUnlockUi.open(open.dataset.openContent);
});
safeExposeGlobals({ contentUnlockUi });
