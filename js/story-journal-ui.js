/** Story presentation uses the existing notice queue, pause and dismissal controls. */
const storyJournalUi = (() => {
    function available(scene) {
        if (scene.id === 'prologue') return true;
        if (game.journalEntries.includes(scene.journal)) return true;
        if (scene.phase === 'end') return false;
        return Number.isInteger(game.currentZoneId) && game.currentZoneId < STORY_ACTS.length && game.currentZoneId >= scene.act-1;
    }
    function sync() {
        if (game.isBackgroundCalculation) return;
        const marker = 'story_illustrations_v1';
        if (!game.seenTutorials.includes(marker)) {
            const fresh = game.season === 1 && game.level === 1 && !game.seenTutorials.includes('tutorial_battle_basics');
            game.seenTutorials.push(marker);
            if (!fresh) {
                for (const scene of STORY_JOURNAL_SCENES.filter(available)) game.seenTutorials.push('story_'+scene.id);
            }
        }
        for (const scene of STORY_JOURNAL_SCENES) {
            if (available(scene)) queueTutorialNotice('story_'+scene.id,scene.title,scene.lines.join('\n\n'));
        }
    }
    function renderTutorial(notice) {
        const scene = STORY_JOURNAL_SCENES.find(row => 'story_'+row.id === notice.key);
        document.getElementById('tutorial-overlay').classList.toggle('is-story-scene',!!scene);
        if (!scene) return false;
        document.getElementById('tutorial-kicker').textContent = scene.act ? `액트 ${scene.act}` : '프롤로그';
        document.getElementById('tutorial-title').textContent = scene.title;
        document.getElementById('tutorial-body').innerHTML = `<img class="story-scene-art" src="${scene.image}" alt="${escapeHTML(scene.title)}" decoding="async">
            <div class="story-scene-copy">${scene.lines.map(line => `<p>${escapeHTML(line)}</p>`).join('')}</div>`;
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
        reader.setAttribute('aria-labelledby', 'journal-reader-title');
        reader.innerHTML = `<header class="journal-reader-head"><h2 id="journal-reader-title">${escapeHTML(entry.title)}</h2>
            <form method="dialog"><button type="submit" autofocus>닫기</button></form></header>
            <div class="journal-reader-pages">${pages.map(scene => `<section class="journal-reader-page ${scene.image ? '' : 'is-text-only'}">
                ${scene.image ? `<img class="story-scene-art" src="${scene.image}" alt="${escapeHTML(scene.title)}" decoding="async" loading="lazy" width="1254" height="1254">` : ''}
                <div class="story-scene-copy">${pages.length > 1 ? `<h3>${escapeHTML(scene.title)}</h3>` : ''}${scene.lines.map(line => `<p>${escapeHTML(line)}</p>`).join('')}</div>
            </section>`).join('')}</div>`;
        reader.addEventListener('close', () => reader.remove(), {once:true});
        reader.addEventListener('keydown', event => {
            if (event.key === 'Escape') event.stopPropagation();
        });
        document.body.appendChild(reader);
        reader.showModal();
    }
    return {sync,renderTutorial,openEntry};
})();
safeExposeGlobals({ storyJournalUi });
