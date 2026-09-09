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
    function illustrations(entryId) {
        return STORY_JOURNAL_SCENES.filter(scene => scene.journal === entryId).map(scene =>
            `<button type="button" class="journal-illustration" onclick="storyJournalUi.replay('${scene.id}')" aria-label="${escapeHTML(scene.title)} 다시 보기">
            <img src="${scene.image}" alt="${escapeHTML(scene.title)}" loading="lazy" decoding="async" width="1254" height="1254"></button>`).join('');
    }
    function replay(id) {
        const scene = STORY_JOURNAL_SCENES.find(row => row.id === id);
        if (!scene || !available(scene) || activeTutorial) return;
        tutorialQueue.unshift({key:'story_'+id,title:scene.title,body:scene.lines.join('\n\n'),tabId:null,subtabId:null});
        showNextTutorial();
    }
    return {sync,renderTutorial,illustrations,replay};
})();
safeExposeGlobals({ storyJournalUi });
