/** Story presentation uses the existing notice queue, pause and dismissal controls. */
const storyJournalUi = (() => {
    let category = '전체', includeConditions = false;
    function setAutoShow(enabled) {
        game.settings.showActJournal = enabled === true;
        document.getElementById('chk-act-journal').checked = game.settings.showActJournal;
        document.getElementById('chk-hide-act-journal').checked = !game.settings.showActJournal;
        queueImportantSave(0);
    }
    function filter(nextCategory = category, showConditions = includeConditions) {
        category = nextCategory;
        includeConditions = showConditions;
        refreshArchiveFilter();
    }
    function refreshArchiveFilter() {
        const host = document.getElementById('ui-journal-list');
        if (!host) return;
        for (const card of host.querySelectorAll('.journal-card')) {
            card.hidden = !card.classList.contains('is-unlocked') && !(includeConditions && card.classList.contains('is-available'));
        }
        const sections = [...host.querySelectorAll('[data-journal-category]')];
        const visible = sections.filter(section => section.querySelector('.journal-card:not([hidden])'));
        if (!visible.some(section => section.dataset.journalCategory === category)) category = '전체';
        for (const section of sections) section.hidden = !visible.includes(section) || (category !== '전체' && section.dataset.journalCategory !== category);
        refreshArchiveControls(host,visible);
    }
    function refreshArchiveControls(host,visible) {
        for (const button of host.querySelectorAll('[data-journal-filter]')) {
            button.hidden = button.dataset.journalFilter !== '전체' && !visible.some(section => section.dataset.journalCategory === button.dataset.journalFilter);
            button.setAttribute('aria-pressed', String(button.dataset.journalFilter === category));
        }
        host.querySelector('[data-journal-conditions]').checked = includeConditions;
        const target = host.querySelector('.journal-next-target');
        if (target) target.hidden = !includeConditions;
        host.querySelector('.journal-empty').hidden = visible.length > 0;
    }
    function available(scene) {
        if (scene.id === 'prologue') return true;
        if (game.journalEntries.includes(scene.journal)) return true;
        if (scene.phase === 'end') return false;
        return Number.isInteger(game.currentZoneId) && game.currentZoneId < STORY_ACTS.length && game.currentZoneId >= scene.act-1;
    }
    function allowsNotice(key) {
        return !key.startsWith('story_act_') || game.settings.showActJournal !== false;
    }
    function queueScene(scene) {
        const key = 'story_'+scene.id;
        if (allowsNotice(key)) return queueTutorialNotice(key,scene.title,scene.lines.join('\n\n'));
        if (!game.seenTutorials.includes(key)) game.seenTutorials.push(key);
    }
    function markIllustratedScenes() {
        const marker = 'story_illustrations_v1';
        if (game.seenTutorials.includes(marker)) return;
        const fresh = game.season === 1 && game.level === 1 && !game.seenTutorials.includes('tutorial_battle_basics');
        game.seenTutorials.push(marker);
        if (!fresh) {
            for (const scene of STORY_JOURNAL_SCENES.filter(available)) game.seenTutorials.push('story_'+scene.id);
        }
    }
    /** Scenes added later (STORY_BRIDGE_SCENES) play once for a save that has not yet moved past their act;
     * a save already beyond it, or on a later loop, gets them marked as seen instead of a replay out of order. */
    function markPassedBridges() {
        const marker = 'story_bridges_v1';
        if (typeof STORY_BRIDGE_SCENES !== 'object' || game.seenTutorials.includes(marker)) return;
        game.seenTutorials.push(marker);
        const reached = Math.max(Number(game.maxZoneId) || 0, Number.isInteger(game.currentZoneId) ? game.currentZoneId : 0);
        for (const scene of STORY_BRIDGE_SCENES) {
            if (reached > scene.act - 1 || (game.season || 1) > 1) game.seenTutorials.push('story_'+scene.id);
        }
    }
    function sync() {
        if (game.isBackgroundCalculation) return;
        markIllustratedScenes();
        markPassedBridges();
        for (const scene of STORY_JOURNAL_SCENES.filter(available)) queueScene(scene);
    }
    /** Narration plus the words spoken in that scene (STORY_SCENE_QUOTES), before or after it as the moment reads. */
    function sceneCopy(scene) {
        const quote = typeof STORY_SCENE_QUOTES === 'object' && scene.id ? STORY_SCENE_QUOTES[scene.id] : null;
        const narration = scene.lines.map(line => `<p>${escapeHTML(line)}</p>`).join('');
        if (!quote) return narration;
        const spoken = `<blockquote class="story-scene-quote">${quote.lines.map(line => `<p>${escapeHTML(line)}</p>`).join('')}</blockquote>`;
        return quote.before ? spoken + narration : narration + spoken;
    }
    // 머리글이 이미 "액트 N"(프롤로그)이라 제목의 같은 머리말은 뺀다: "액트 2 · 다시 추락하다" → "다시 추락하다".
    function sceneHeading(scene) {
        const kicker = scene.act ? `액트 ${scene.act}` : '프롤로그';
        const prefix = kicker + ' · ';
        return { kicker, title: scene.title.startsWith(prefix) ? scene.title.slice(prefix.length) : scene.title };
    }
    function renderTutorial(notice) {
        const scene = STORY_JOURNAL_SCENES.find(row => 'story_'+row.id === notice.key);
        const overlay = document.getElementById('tutorial-overlay');
        overlay.classList.toggle('is-story-scene',!!scene);
        overlay.classList.toggle('is-story-text',!!scene && !scene.image);
        document.getElementById('tutorial-journal-preference').hidden = !scene || !scene.act;
        document.getElementById('chk-hide-act-journal').checked = game.settings.showActJournal === false;
        if (!scene) return false;
        const heading = sceneHeading(scene);
        document.getElementById('tutorial-kicker').textContent = heading.kicker;
        document.getElementById('tutorial-title').textContent = heading.title;
        const art = scene.image ? `<img class="story-scene-art" src="${scene.image}" alt="${escapeHTML(scene.title)}" decoding="async">` : '';
        document.getElementById('tutorial-body').innerHTML = `${art}
            <div class="story-scene-copy">${sceneCopy(scene)}</div>`;
        document.getElementById('tutorial-open-btn').style.display = 'none';
        document.getElementById('tutorial-dismiss-btn').textContent = '계속';
        return true;
    }
    /** Reading an unlocked entry never queues notices or changes progression/rewards. */
    function openEntry(id) {
        const entry = JOURNAL_DB[id];
        if (!entry || !game.journalEntries.includes(id) || document.getElementById('journal-reader')) return;
        const scenes = STORY_JOURNAL_SCENES.filter(scene => scene.journal === id);
        const pages = scenes.length ? scenes : [{title:entry.title, lines:entry.lines || []}];
        const reader = document.createElement('dialog');
        reader.id = 'journal-reader';
        reader.classList.toggle('is-text-only', pages.every(page => !page.image));
        reader.setAttribute('aria-labelledby', 'journal-reader-title');
        reader.innerHTML = `<header class="journal-reader-head"><h2 id="journal-reader-title">${escapeHTML(entry.title)}</h2>
            <button type="button" autofocus data-journal-close>닫기</button></header>
            <div class="journal-reader-pages">${pages.map(scene => `<section class="journal-reader-page ${scene.image ? '' : 'is-text-only'}">
                ${scene.image ? `<img class="story-scene-art" src="${scene.image}" alt="${escapeHTML(scene.title)}" decoding="async" loading="lazy" width="1254" height="1254">` : ''}
                <div class="story-scene-copy">${pages.length > 1 ? `<h3>${escapeHTML(scene.title)}</h3>` : ''}${sceneCopy(scene)}</div>
            </section>`).join('')}</div>`;
        reader.addEventListener('close', () => reader.remove(), {once:true});
        reader.querySelector('[data-journal-close]').addEventListener('click', () => reader.close());
        reader.addEventListener('keydown', event => {
            if (event.key === 'Escape') event.stopPropagation();
        });
        document.body.appendChild(reader);
        reader.showModal();
    }
    /** 방치 복귀: 자리를 비운 동안 지나온 액트의 장면은 한 장씩 띄우지 않는다 — 가장 최근 장면만 남기고 나머지는 본 것으로
     * 표시한다(지나온 액트는 깼으니 기록에서 읽을 수 있다). Returns the folded scenes' headings for the result card. */
    function foldPassedScenes() {
        const queued = new Set(tutorialQueue.map(notice => notice.key));
        const pending = STORY_JOURNAL_SCENES.filter(scene => scene.id !== 'prologue'
            && (queued.has('story_'+scene.id) || (available(scene) && !game.seenTutorials.includes('story_'+scene.id))));
        const passed = pending.slice(0, -1), keys = new Set(passed.map(scene => 'story_'+scene.id));
        keys.forEach(key => { if (!game.seenTutorials.includes(key)) game.seenTutorials.push(key); });
        for (let i = tutorialQueue.length - 1; i >= 0; i--) if (keys.has(tutorialQueue[i].key)) tutorialQueue.splice(i, 1);
        return passed.map(sceneHeading);
    }
    return {sync,renderTutorial,openEntry,filter,refreshArchiveFilter,setAutoShow,allowsNotice,foldPassedScenes};
})();
safeExposeGlobals({ storyJournalUi });
