/** Records sets up a practice state in the already-open game. */
const playerGuideUi = (() => {
    const lessons = [
        { key: 'unlock_items', tabId: 'tab-items', title: '장비 비교와 교체',
            body: '장비 창에서 가방의 장비를 눌러 착용 중인 장비와 비교하세요. 바꾸려면 장착을 누르세요.' },
        { key: 'unlock_skills', tabId: 'tab-skills', title: '스킬룬 장착',
            body: '스킬룬에서 현재 무기로 쓸 수 있는 룬을 고르고 장착하세요.' },
        { key: 'unlock_char', tabId: 'tab-char', title: '스킬트리 투자',
            body: '스킬트리에서 연결된 노드를 고르고 포인트를 쓰세요.' },
        { key: 'unlock_stump_box', tabId: 'tab-stump', title: '그루터기 함에 심기',
            body: '보관함의 씨앗을 고른 뒤 빈 칸에 놓으세요. 심은 씨앗은 적을 처치할 때 자랍니다.' },
        ...systemTutorialUi.lessons
    ];
    const terms = [
        { name: '루프', tab: 'tab-season', body: '현재 루프 목표를 달성한 뒤 액트 1부터 다시 시작하는 진행 단위입니다. 영구 해금과 영구 강화는 이어집니다.' },
        { name: '해금 포인트', tab: 'tab-unlocks', body: '루프를 넘어갈 때 얻습니다. 루프 메뉴의 해금에서 새 기능을 여는 데 씁니다.' },
        { name: '지하석', unlock: 'underworld', body: '지하계에서 얻는 장착용 돌입니다. 지하계의 지하석 탭에서 끼우거나 강화할 수 있습니다.' },
        { name: '창공의 정수', unlock: 'cosmos', body: '창공의 정수는 우주계 탐사, 은하 보스에서 얻고 룬 강화와 룬 각인에 씁니다.' },
        { name: '응축된 창공의 정수', unlock: 'sky', body: '창공의 탑에서 얻는 재화입니다. 창공석과 공격 룬을 영구 강화하는 데 씁니다.' },
        { name: '지도석', tab: 'map-explore-worldtree', body: '세계수 아틀라스에서 한 지도를 여는 데 쓰는 입장 재료입니다.' }
    ];
    const esc = text => escapeHTML(_t(text));
    let replay = null;

    function lessonHtml(lesson) {
        return `<li><div><strong>${esc(lesson.title)}</strong><p>${esc(lesson.body)}</p></div>
            <button type="button" data-guide-lesson="${lesson.key}">${_t('가이드 다시보기')}</button></li>`;
    }
    function render() {
        const host = document.getElementById('ui-player-guide');
        if (!host) return;
        const available = lessons.filter(lessonAvailable).map(lessonHtml).join('');
        const definitions = terms.filter(term => term.unlock ? contentProgression.isUnlocked(term.unlock) : contentProgression.canOpen(term.tab));
        const glossary = definitions.map(term => `<div><dt>${esc(term.name)}</dt><dd>${esc(term.body)}</dd></div>`).join('');
        writeHtmlIfChanged(host, `<section class="player-guide"><h3>${_t('가이드 다시보기')}</h3><ul>${available}</ul>
            ${glossary ? `<h3>${_t('용어')}</h3><dl>${glossary}</dl>` : ''}</section>`);
    }
    function lessonAvailable(lesson) {
        return contentProgression.canOpen(lesson.tabId) && (!lesson.unlock || contentProgression.isUnlocked(lesson.unlock))
            && (!lesson.gate || lesson.gate());
    }
    function prepareExample(key) {
        game.level = 12;
        game.season = 2;
        game.loopCount = 1;
        game.selectedClassId = 'warrior';
        game.heroSelectionInitialized = true;
        game.combatHalted = true;
        game.settings.autoEquipEmptySlots = false;
        game.settings.showMobileBattlePip = false;
        game.seenTutorials.push('opening_done');
        game.equipment['무기'] = createClassStarterWeapon('warrior');
        const system = systemTutorialUi.guides[key];
        if (system) {
            replay.restoreSystem = system.prepare();
            return;
        }
        const examples = {
            unlock_items: () => {
                const makeHelmet = rarity => generateEquipmentDrop({}, { zone: getZone(0), slot: '투구', minimumRarity: rarity });
                game.equipment['투구'] = makeHelmet('normal');
                game.inventory.push(makeHelmet('rare'));
            },
            unlock_skills: () => game.skills.push('화염 참격', '관통 사격'),
            unlock_char: () => {
                game.contentProgression.inherited.push('passiveTree');
                game.passivePoints = 1;
            },
            unlock_stump_box: () => {
                game.contentProgression.inherited.push('stump');
                game.stumpBox.acquired = true;
                stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1 });
            }
        };
        examples[key]();
    }
    function showReturnButton(lesson) {
        const bar = document.createElement('aside');
        bar.className = 'guide-replay-bar';
        bar.setAttribute('aria-label', _t('가이드 다시보기'));
        bar.innerHTML = `<span>${esc(lesson.title)}</span><button type="button">${_t('가이드로 돌아가기')}</button>`;
        bar.querySelector('button').addEventListener('click', () => dismissReplay());
        document.body.append(bar);
        return bar;
    }

    function openReplay(lesson) {
        if (replay) return;
        yieldTutorialCardToResult();
        tutorialActionUi.finish(false, true);
        const example = cloneDefaultGame();
        example.settings = { ...structuredClone(game.settings), inventoryViewRarities: example.settings.inventoryViewRarities };
        Object.defineProperty(example, 'isGuideReplay', { value: true });
        const inert = [...document.querySelectorAll('#left-pane, #left-pane-floating-toggle, #left-pane-expand-fab, #tab-header-main, #tab-header-bottom, #tab-category-bar')]
            .filter(element => !element.inert);
        replay = { live: game, counter: itemIdCounter, lesson, inert, bar: null };
        game = example;
        try {
            startExample(lesson);
        } catch (error) {
            dismissReplay();
            console.error('Guide replay could not start:', error);
            showGameToast(_t('가이드를 불러오지 못했습니다.'), { tone: 'warning' });
        }
    }

    function startExample(lesson) {
        prepareExample(lesson.key);
        replay.restoreWindows = beginGuideWindowLayout();
        if (lesson.tabId === 'tab-stump') replay.restoreStumpView = stumpBoxUi.beginStumpGuideView();
        contentProgression.sync();
        playerStatCache.invalidate();
        if (lesson.tabId === 'tab-char') calculateReachableNodes();
        if (!tutorialActionUi.guideFor(lesson.key)) throw new Error('Guide example cannot start');
        replay.bar = showReturnButton(lesson);
        document.body.classList.add('guide-replay-active');
        replay.inert.forEach(element => { element.inert = true; });
        document.addEventListener('scroll', repositionReplayCoach, true);
        const session = replay;
        tutorialActionUi.start({ ...lesson, replay: true, onComplete: () => completeReplay(session) });
        updateStaticUI();
    }

    function completeReplay(session) {
        // The real equip/plant handler may still be rendering the example.
        queueMicrotask(() => {
            if (replay !== session) return;
            dismissReplay();
            showGameToast(_t('가이드 완료'), { tone: 'success' });
        });
    }

    function clearExampleControls(tabId) {
        document.querySelector('#game-dialog-overlay[open] #game-dialog-cancel')?.click();
        if (tabId === 'tab-items') {
            equipmentInventoryInteraction.cancelCarry();
            equipmentInventoryInteraction.focus(null);
        }
        if (tabId === 'tab-skills') gemSelectionUi.close();
        if (tabId === 'tab-char') passiveSelectionUi.hide();
    }

    function repositionReplayCoach() {
        tutorialActionUi.reposition();
    }

    function dismissReplay(restoreView = true) {
        if (!replay) return;
        const { live, counter, lesson, inert, bar, restoreWindows, restoreStumpView, restoreSystem } = replay;
        try {
            tutorialActionUi.finish(false, true);
            clearExampleControls(lesson.tabId);
            restoreStumpView?.();
        } finally {
            game = live;
            itemIdCounter = counter;
            replay = null;
            document.removeEventListener('scroll', repositionReplayCoach, true);
            bar?.remove();
            document.body.classList.remove('guide-replay-active');
            inert.forEach(element => { element.inert = false; });
            restoreWindows?.();
            restoreSystem?.();
            playerStatCache.invalidate();
            if (lesson.tabId === 'tab-char') calculateReachableNodes();
        }
        if (restoreView) {
            openTabPane('tab-guide');
            updateStaticUI();
        }
    }

    function allowsTab(tabId, includeLauncher = false) {
        const target = replay?.lesson.tabId;
        return !target || tabId === target || (includeLauncher && tabId === getMergedTabGroup(target)?.[1].launcher);
    }

    document.addEventListener('click', event => {
        const key = event.target.closest('#ui-player-guide [data-guide-lesson]')?.dataset.guideLesson;
        const lesson = lessons.find(row => row.key === key);
        if (lesson && lessonAvailable(lesson)) openReplay(lesson);
    });
    return Object.freeze({ render, dismissReplay, allowsTab, liveGame: () => replay?.live ?? game });
})();
safeExposeGlobals({ playerGuideUi });
