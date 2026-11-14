export function sceneCopy({ deps }, scene) {
    const quote = typeof deps.STORY_SCENE_QUOTES === 'object' && scene.id ? deps.STORY_SCENE_QUOTES[scene.id] : null;
    const narration = scene.lines.map(line => `<p>${deps.escapeHTML(deps._t(line))}</p>`).join('');
    if (!quote) return narration;
    const spoken = `<blockquote class="story-scene-quote">${quote.lines.map(line => `<p>${deps.escapeHTML(deps._t(line))}</p>`).join('')}</blockquote>`;
    return quote.before ? spoken + narration : narration + spoken;
}

export function entryCopy({ deps }, entry) {
    const intro = entry.intro ? `<p>${deps.escapeHTML(deps._t(entry.intro))}</p>` : '';
    const source = entry.source ? `<p class="story-scene-source">${deps.escapeHTML(deps._t(entry.source))}</p>` : '';
    return `${intro}<blockquote class="story-scene-quote">${(entry.lines || []).map(line => `<p>${deps.escapeHTML(deps._t(line))}</p>`).join('')}${source}</blockquote>`;
}

export function sceneHeading({ deps }, scene) {
    const kicker = scene.act ? deps._t('액트 {act}', { act: scene.act }) : deps._t('프롤로그');
    const prefix = kicker + ', ', title = deps._t(scene.title);
    return { kicker, title: title.startsWith(prefix) ? title.slice(prefix.length) : title };
}

export function renderStoryTutorial(runtime, notice) {
    const { deps } = runtime, doc = deps.document;
    const scene = deps.STORY_JOURNAL_SCENES.find(row => 'story_' + row.id === notice.key);
    const overlay = doc.getElementById('tutorial-overlay');
    overlay.classList.toggle('is-story-scene', !!scene);
    overlay.classList.toggle('is-story-text', !!scene && !scene.image);
    doc.getElementById('tutorial-journal-preference').hidden = !scene || !scene.act;
    doc.getElementById('chk-hide-act-journal').checked = deps.game.settings.showActJournal === false;
    if (!scene) return false;
    const heading = sceneHeading(runtime, scene);
    doc.getElementById('tutorial-kicker').textContent = heading.kicker;
    doc.getElementById('tutorial-title').textContent = deps._t(heading.title);
    const art = scene.image ? `<img class="story-scene-art" src="${scene.image}" alt="${deps.escapeHTML(deps._t(scene.title))}" decoding="async">` : '';
    doc.getElementById('tutorial-body').innerHTML = `${art}
            <div class="story-scene-copy">${sceneCopy(runtime, scene)}</div>`;
    doc.getElementById('tutorial-open-btn').style.display = 'none';
    doc.getElementById('tutorial-dismiss-btn').textContent = deps._t('계속');
    return true;
}

export function journalReaderHtml(runtime, entry, pages) {
    const { deps } = runtime;
    return `<header class="journal-reader-head"><h2 id="journal-reader-title">${deps.escapeHTML(deps._t(entry.title))}</h2>
            <button type="button" autofocus data-journal-close>${deps._t('닫기')}</button></header>
            <div class="journal-reader-pages">${pages.map(scene => `<section class="journal-reader-page ${scene.image ? '' : 'is-text-only'}">
                ${scene.image ? `<img class="story-scene-art" src="${scene.image}" alt="${deps.escapeHTML(deps._t(scene.title))}" decoding="async" loading="lazy" width="1254" height="1254">` : ''}
                <div class="story-scene-copy">${pages.length > 1 ? `<h3>${deps.escapeHTML(deps._t(scene.title))}</h3>` : ''}${scene.entry ? entryCopy(runtime, scene.entry) : sceneCopy(runtime, scene)}</div>
            </section>`).join('')}</div>`;
}
