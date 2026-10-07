/** Menu projection and purchase event boundary; the ledger is owned by contentProgression. */
// 해금 카드의 "…에 있습니다" 줄: 콘텐츠가 있는 곳을 메뉴 이름 그대로.
const CONTENT_ROUTE_PATHS = Object.freeze({
    'item-tab-equip': '장비 → 장비 창', 'item-tab-craft': '장비 → 제작실', 'item-tab-fossil': '장비 → 제작실', 'item-tab-market': '장비 → 거래소',
    'item-tab-hall': '장비 → 장비 전당',
    'skill-tab-equip': '스킬 젬 → 장착 · 보조', 'skill-tab-enhance': '스킬 젬 → 성장 · 각인', 'skill-tab-research': '스킬 젬 → 젬 연구',
    'skill-tab-condition': '스킬 젬 → 전술 규칙',
    'tab-codex': '기록 → 도감', 'tab-traits': '스킬트리 → 전직', 'tab-char': '스킬트리',
    'tab-season': '루프 패시브', 'tab-stump': '그루터기 함', 'tab-talent': '재능',
    'map-tab-pvp': '지도 → 대전', 'map-explore-labyrinth': '지도 → 탐험 → 고대 미궁', 'map-explore-beehive': '지도 → 탐험 → 벌집',
    'map-explore-voidrift': '지도 → 탐험 → 공허 균열 · 대균열', 'map-explore-colony': '지도 → 탐험 → 군락지',
    'map-explore-trials': '지도 → 탐험 → 전직 시련', 'map-explore-deep-chaos': '지도 → 탐험 → 혼돈 심화층', 'map-explore-meteor': '지도 → 탐험 → 운석 낙하'
});
// 자기 안내 카드가 따로 있는 콘텐츠(카드 키). 해금 카드는 띄우지 않는다.
const CONTENT_CARD_DEDICATED = Object.freeze({
    stump: 'unlock_stump_box', timerift: 'unlock_time_rift',
    chaosRealm: 'unlock_chaos_realm', sky: 'unlock_sky_tower', underworld: 'unlock_underworld', cosmos: 'unlock_cosmos',
    ocean: 'unlock_ocean_fishing', fishing: 'unlock_ocean_fishing', beyond: 'unlock_beyond_boundary', meteorSite: 'meteor_unlocked'
});
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
            `[${name}] 젬을 얻었습니다.\n‘스킬 젬’에서 빛나는 젬을 누르고 ‘장착’을 누르세요.\n장착한 젬으로 자동 전투의 공격이 바뀝니다.`, 'tab-skills');
    },
    announceLoop() {
        if (game.contentProgression && contentProgression.points().complete) return;
        const body = game.contentProgression
            ? `루프 ${game.season}에 도달해 해금 포인트 ${contentProgression.balance()}P가 생겼습니다.\n‘해금’에서 원하는 콘텐츠를 골라 여세요.\n한 번 연 콘텐츠는 루프가 바뀌어도 열려 있습니다.`
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
            // 경로는 canOpen을 따른다: 세계수 아틀라스 창은 혼돈계 항목에 걸려 있지만 아틀라스가 열리면 연다. 항목 잠금을 그대로 쓰면
            // 루프 10에 아틀라스가 열려도 창이 숨어 빈 화면이 됐다(2026-10-07 리뷰).
            for (const route of def.routes || []) this.syncRoute(route, !contentProgression.canOpen(route));
        }
        // 해금 목록 항목 없이 진행 조건으로만 열리는 경로(전술 규칙: 루프 2 · 액트 3 전술).
        for (const route of ['tab-map', 'tab-season', 'tab-unlocks', 'skill-tab-condition']) this.syncRoute(route, !contentProgression.canOpen(route));
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
        return pixelIconPath('assets/' + (def.art || root.art || 'ui/currency/sap-bud.png'));
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
    milestone(loop, end = loop) {
        const rows = CONTENT_UNLOCK_CATALOG.filter(row => row.minLoop === loop);
        const choices = rows.filter(row => row.cost > 0);
        const automatic = rows.filter(row => row.cost === 0);
        const additions = (SEASON_CONTENT_ROADMAP[loop]?.features || []).filter(text => /심화:|그루터기 함|야생 부적|전환점:|전술 조건|버려진 날붙이|최종 관문/.test(text));
        return `<details id="unlock-milestone-${loop}" class="unlock-milestone" ${loop === game.season ? 'open' : ''}>
            <summary><strong>루프 ${end > loop ? `${loop}–${end}` : loop}</strong><span>${loop < game.season ? '도달 완료' : loop === game.season ? '현재 여정' : '예정'}${this.milestoneTeaser(loop)}</span></summary>
            <p class="unlock-loop-requirement">${escapeHTML(getLoopAbyssRequirementText(loop))}</p>
            ${this.milestoneRows(automatic, '자동 개방')}${this.milestoneRows(choices, '성장 선택')}
            ${additions.length ? `<p class="unlock-expansion">${additions.map(escapeHTML).join('<br>')}</p>` : ''}</details>`;
    },
    /** 같은 예고만 이어지는 앞날의 루프는 한 줄로 묶는다(루프 21 ~ 24가 "심화: 혼돈 단계 상승" 네 줄이었다 — 검토 5차). */
    milestoneRuns(loops) {
        return loops.reduce((runs, loop) => {
            const plain = loop > game.season && !CONTENT_UNLOCK_CATALOG.some(row => row.minLoop === loop);
            const key = plain ? this.milestoneTeaser(loop) : null, last = runs[runs.length - 1];
            if (key && last && last.key === key && last.end === loop - 1) last.end = loop;
            else runs.push({ start: loop, end: loop, key });
            return runs;
        }, []);
    },
    /** 접힌 이정표 줄에도 그 루프에 열리는 것을 한두 개 보인다(빈 "예정" 줄만 늘어서 있었다 — 검토 4차). */
    milestoneTeaser(loop) {
        if (loop === game.season) return '';
        const names = CONTENT_UNLOCK_CATALOG.filter(row => row.minLoop === loop).map(row => row.name);
        const first = names.length ? names.slice(0, 2).join(' · ') + (names.length > 2 ? ` 외 ${names.length - 2}` : '')
            : (SEASON_CONTENT_ROADMAP[loop]?.features || [])[0];
        return first ? ` · ${escapeHTML(first)}` : '';
    },
    /** 진행 · 이정표에서 아직 고른 항목이 없을 때의 오른쪽 설명(앞 화면에서 고른 항목이 남아 있었다 — 검토 4차). */
    loopSummary() {
        const next = game.season + 1;
        return `<div class="unlock-detail-top"><span class="unlock-eyebrow">진행 · 이정표</span><h3>루프 ${game.season}</h3>
            <p>루프마다 자동으로 열리는 전투 콘텐츠와 고를 수 있는 성장 수단입니다. 목록의 항목을 누르면 설명이 여기에 나옵니다.</p></div>
            <div class="unlock-requirements"><h4>다음 루프 ${next}</h4><div><span>${escapeHTML(getLoopAbyssRequirementText(next))}</span></div></div>`;
    },
    setView(view) {
        this.view = view;
        this.selectedId = view === 'choice' ? this.selectedId || 'craft' : null;
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
            <div class="unlock-milestones">${this.milestoneRuns(shown).map(run => this.milestone(run.start, run.end)).join('') || this.milestone(game.season)}</div>`;
    },
    entryReward(def, status) {
        const reward = !status.unlocked && def.rewardText ? `<p class="unlock-reward">${escapeHTML(def.rewardText)}</p>` : '';
        const picker = !status.unlocked && def.rewardChoices?.length > 1 ? `<label class="content-unlock-choice">첫 보상<select data-unlock-reward="${def.id}" aria-label="${escapeHTML(def.name)} 첫 보상">${def.rewardChoices.map(row => `<option value="${row.key}">${escapeHTML(row.label)}</option>`).join('')}</select></label>` : '';
        const guide = def.id === 'craft' ? '<p class="unlock-craft-guide">일반 장비가 없다면 사냥에서 획득하세요. 제련하지 않아도 다음 루프는 진행할 수 있습니다.</p>' : '';
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
        return `<details class="unlock-related" id="unlock-related-${def.id}"><summary>포함된 성장 요소</summary>${def.features.map(row =>
            `<p><strong>${escapeHTML(row.name)}</strong>${escapeHTML(row.description)}</p>`).join('')}</details>`;
    },
    detail(def) {
        const status = contentProgression.status(def.id);
        const conditions = contentProgression.requirements(def.id);
        const action = status.unlocked ? this.openButton(def) : def.cost === 0
            ? '<button type="button" disabled>조건 달성 시 자동 개방</button>'
            : `<button type="button" data-unlock-content="${def.id}" ${status.available ? '' : 'disabled'}>${escapeHTML(status.reason)}</button>`;
        // 첫 보상은 설명 바로 아래, 해금 단추는 맨 아래에서 창 본문 아래쪽에 붙어(sticky) 늘 보인다 — 작은 창(1366×768 ·
        // HUD 위 작업 영역)에서 단추가 스크롤 밖으로 밀려났다.
        return `<div class="unlock-detail-top"><span class="unlock-eyebrow">${escapeHTML(def.group)} · ${def.cost ? '선택 해금' : '자동 개방'}</span>
            <div class="unlock-detail-art"><img src="${this.art(def)}" alt=""></div><h3>${escapeHTML(def.name)}</h3><p>${escapeHTML(def.description)}</p></div>
            <div class="unlock-detail-reward">${this.entryReward(def, status)}</div>
            ${this.lifecycle(def)}${this.relatedFeatures(def)}
            <div class="unlock-requirements"><h4>${status.unlocked ? '해금 완료' : `해금 조건${def.cost ? ' · ' + def.cost + 'P' : ''}`}</h4>${conditions.map(row => `<div class="${row.met ? 'is-met' : ''}"><span>${escapeHTML(row.label)}</span><small>${row.met ? '달성' : '미달성'}</small></div>`).join('')}</div>
            <div class="unlock-detail-action">${action}</div>`;
    },
    openButton(def) {
        const reachable = def.action || (def.routes || []).some(route => route.startsWith('tab-') || route.startsWith('item-tab-') || route.startsWith('skill-tab-') || route.startsWith('map-'));
        return reachable ? `<button type="button" data-open-content="${def.id}">바로 사용하기</button>` : '<span class="content-unlock-owned">해금 완료</span>';
    },
    pointBalanceHtml() {
        const points = contentProgression.points();
        if (points.complete) return '<div class="content-unlock-balance">전체 해금 완료</div>';
        const title = points.balance === points.remaining ? '남은 해금에 필요한 포인트를 모두 모았습니다.'
            : `루프 2부터 매 루프 최대 ${CONTENT_UNLOCK_POINTS_PER_LOOP}P · 남은 해금 비용까지만 지급`;
        return `<div class="content-unlock-balance" title="${title}"><span>해금</span><strong>${points.balance}</strong><span>P</span></div>`;
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
        root.innerHTML = `<header class="content-unlock-heading"><span>루프 ${game.season}</span>${this.pointBalanceHtml()}</header>
            <div class="unlock-toolbar"><nav aria-label="해금 방식"><button type="button" data-unlock-view="choice" aria-pressed="${this.view === 'choice'}">선택 해금</button><button type="button" data-unlock-view="progress" aria-pressed="${this.view === 'progress'}">진행 · 이정표</button></nav></div>
            <div class="unlock-workspace"><div class="unlock-content">${this.view === 'choice' ? this.choiceMap() : this.progressionMap()}</div>
            <aside class="unlock-detail" aria-label="선택한 콘텐츠">${selected ? this.detail(selected) : this.loopSummary()}</aside></div>`;
        restoreUiDisclosureState(root);
        scroll.forEach(([name, left, top]) => root.getElementsByClassName(name)[0]?.scrollTo({ left, top }));
        this.revealBranches(root, starter);
    },
    handleControl(control) {
        if (!control) return;
        const data = control.dataset;
        if (data.unlockSelect) { this.select(data.unlockSelect); return; }
        if (data.unlockView) this.setView(data.unlockView);
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
        if (root.clientWidth < 840) root.querySelector('.unlock-detail').scrollIntoView({ block:'nearest' });
    },
    purchase(id) {
        const key = document.querySelector(`[data-unlock-reward="${id}"]`)?.value, opened = this.openedContents();
        const result = contentProgression.purchase(id, game, key);
        if (!result.ok) { addLog(result.message, 'attack-monster', { toast: true }); return; }
        // The unlock card says the same and more: no toast (PC) or bottom notice (phone) on top of it.
        const carded = this.announceContent(id);
        addLog(result.message, 'season-up', { toast: !carded, noToast: carded });
        this.announceOpenedSince(opened); // free content that comes with it (거래소 · 장비 전당 with 장비 제련)
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
    /** The route an unlock card or button opens: explore / sub-tab / tab, whichever is most exact. */
    routeKey(action) {
        const map = action.mapSubtab && action.mapSubtab !== 'map-tab-zones' ? action.mapSubtab : null;
        return action.explore || action.subtab || action.skillSubtab || map || action.tab;
    },
    /** New content card: what it is (the catalog line) and where it lives. Once per content; returns true if queued. */
    announceContent(id) {
        const def = CONTENT_UNLOCK_CATALOG.find(row => row.id === id);
        if (!def || def.minLoop <= 1 || CONTENT_CARD_DEDICATED[id]) return false;
        const action = this.routeAction(def), route = action ? this.routeKey(action) : null;
        const path = CONTENT_ROUTE_PATHS[route];
        const before = tutorialQueue.length;
        queueTutorialNotice(`unlock_content_${id}`, def.name, path ? `${def.description}\n‘${path}’에 있습니다.` : def.description,
            action ? action.tab : null, { subtabId: route, contentId: id, openLabel: `${def.name} 열기` });
        return tutorialQueue.length > before;
    },
    /** Free contents open right now (contentProgression keeps them in automatic once reached). */
    openedContents() {
        return new Set(game.contentProgression ? game.contentProgression.automatic : []);
    },
    announceOpenedSince(before) {
        this.openedContents().forEach(id => { if (!before.has(id)) this.announceContent(id); });
    },
    /** contentProgression.sync, plus a card for each free content that has just opened (loop reached, condition met).
     * Contents open at load are not news: the save migration syncs before any of this runs. */
    syncOpened() {
        const before = this.openedContents();
        contentProgression.sync();
        this.announceOpenedSince(before);
    },
    open(id) {
        if (!contentProgression.isUnlocked(id)) return false;
        const def = CONTENT_UNLOCK_CATALOG.find(row => row.id === id);
        const action = this.routeAction(def);
        if (!action) return false;
        switchTab(action.tab, { keepWindowOpen: true });
        if (action.subtab) switchItemSubtab(action.subtab);
        if (action.skillSubtab) switchSkillSubtab(action.skillSubtab);
        if (action.mapSubtab) switchMapSubtab(action.mapSubtab);
        if (action.explore) switchMapExploreSubtab(action.explore);
        if (action.section) this.openSection(action.section);
        return true;
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
