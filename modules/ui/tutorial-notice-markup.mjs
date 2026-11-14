import { listenView, releaseViewTarget } from './view-events.mjs';
import { renderStoryTutorial } from './story-journal-markup.mjs';


export function tutorialNoticeKind(runtime, notice) {
    if (runtime.state.TUTORIAL_START_KEYS.has(notice.key)) return 'start';
    if (String(notice.key).startsWith('notice_')) return 'notice';
    return String(notice.key).startsWith('unlock_content_loop_') ? 'loop' : 'content';
}

/** Colour in card text: ‘menu or button’ in the card's kind colour (where to go), [item name] in blue (what it is). */
export function tutorialMarkup(runtime, line) {
    return (0, runtime.deps.escapeHTML)(line)
        .replace(/‘([^’]+)’/g, '<span class="tutorial-ui">$1</span>')
        .replace(/\[([^\]]+)\]/g, '<span class="tutorial-name">[$1]</span>');
}

/** A story line over a notice, styled like the loop close (js/loop-ui.js storyHtml). lore: { speaker, quote } as in
 * data/story-journal.js STORY_LOOP_MILESTONES (the stump box card: who hands the box over says it as it is given). */
export function tutorialQuoteHtml(runtime, lore) {
    if (!lore || !lore.quote) return '';
    return `<blockquote class="story-scene-quote"><p>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(lore.quote))} - ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)((0, runtime.deps.speakerShortName)(lore.speaker)))}</p></blockquote>`;
}

export function tutorialBodyHtml(runtime, body, params) {
    const [lead = '', ...rest] = (0, runtime.deps._t)(String(body || ''), params).split('\n').map(line => line.trim()).filter(Boolean);
    const head = `<p class="tutorial-summary">${tutorialMarkup(runtime, lead)}</p>`;
    if (!rest.length) return head;
    if (rest.some(line => /^[\u201c"]/.test(line))) return head + rest.map(line => `<p class="tutorial-line">${tutorialMarkup(runtime, line)}</p>`).join('');
    return head + `<ul class="tutorial-steps">${rest.map(line => `<li>${tutorialMarkup(runtime, line)}</li>`).join('')}</ul>`;
}

export function tutorialOpenLabel(runtime, notice) {
    if (coachGuideFor(runtime, notice.key)) return (0, runtime.deps._t)('따라 해보기');
    if (notice.openLabel) return (0, runtime.deps._t)(notice.openLabel);
    const name = runtime.state.TUTORIAL_TAB_NAMES[notice.tabId];
    return name ? (0, runtime.deps._t)('{name} 열기', { name: (0, runtime.deps._t)(name) }) : (0, runtime.deps._t)('화면 열기');
}

/** "다음 안내 N": how many more cards will follow this one. The counter sits in the card's top-right corner. */
export function syncTutorialQueueCount(runtime) {
    let count = runtime.deps.document.getElementById('tutorial-queue-count');
    const card = count ? null : runtime.deps.document.querySelector?.('#tutorial-overlay .tutorial-card');
    if (card) {
        count = runtime.deps.document.createElement('span');
        count.id = 'tutorial-queue-count';
        count.className = 'tutorial-queue-count';
        card.prepend(count);
    }
    if (!count) return;
    const waiting = runtime.deps.tutorialQueue.filter(runtime.handlers.tutorialNoticeAllowed).length;
    count.hidden = waiting === 0;
    count.textContent = waiting ? (0, runtime.deps._t)('다음 안내 {waiting}', { waiting }) : '';
}

export function renderTutorialStep(runtime) {
    releaseViewTarget(runtime, runtime.state.pauseToggle);
    runtime.state.pauseToggle = null;
    if (!runtime.deps.activeTutorial) return;
    const owner = runtime.deps.game, notice = runtime.deps.activeTutorial;
    runtime.state.notice = notice;
    if (renderStoryTutorial(runtime, runtime.deps.activeTutorial)) return;
    const kind = tutorialNoticeKind(runtime, runtime.deps.activeTutorial), overlay = runtime.deps.document.getElementById('tutorial-overlay');
    if (overlay.dataset) overlay.dataset.noticeKind = kind;
    runtime.deps.document.getElementById('tutorial-kicker').innerText = (0, runtime.deps._t)(runtime.state.TUTORIAL_KIND_LABELS[kind]);
    runtime.deps.document.getElementById('tutorial-title').innerText = (0, runtime.deps._t)(runtime.deps.activeTutorial.title);
    syncTutorialQueueCount(runtime);
    let pauseEnabled = runtime.deps.game.settings.pauseGameOnOverlay !== false;
    let pauseControl = runtime.deps.activeTutorial.key === 'tutorial_battle_basics' ? `
        <label class="cfg-toggle tutorial-pause-toggle">
            <input type="checkbox" id="tutorial-pause-overlay-toggle" ${pauseEnabled ? 'checked' : ''}>
            <span class="cfg-label"><b>${(0, runtime.deps._t)('안내 중 전투 일시 정지')}</b><small>${(0, runtime.deps._t)('이후 {settingsMenuPath}에서 언제든 변경할 수 있습니다.', { settingsMenuPath: settingsMenuPath(runtime) })}</small></span>
            <strong id="tutorial-pause-overlay-status">${pauseEnabled ? (0, runtime.deps._t)('켜짐') : (0, runtime.deps._t)('꺼짐')}</strong>
        </label>` : '';
    // 본문은 줄바꿈을 살려 보이므로(pre-line) 템플릿 앞의 줄바꿈이 빈 줄이 되지 않게 다듬는다.
    runtime.deps.document.getElementById('tutorial-body').innerHTML = coachNoticeBody(runtime, runtime.deps.activeTutorial, pauseControl);
    let pauseToggle = runtime.deps.document.getElementById('tutorial-pause-overlay-toggle');
    if (pauseToggle) {
        runtime.state.pauseToggle = pauseToggle;
        pauseToggle.checked = pauseEnabled;
        listenView(runtime, pauseToggle, 'change', () => {
            if (!runtime.active || runtime.deps.game !== owner || runtime.deps.activeTutorial !== notice || !pauseToggle.isConnected) return;
            let enabled = !!pauseToggle.checked;
            runtime.deps.game.settings.pauseGameOnOverlay = enabled;
            let settingsToggle = runtime.deps.document.getElementById('chk-pause-overlay');
            let status = runtime.deps.document.getElementById('tutorial-pause-overlay-status');
            if (settingsToggle) settingsToggle.checked = enabled;
            if (status) status.innerText = enabled ? (0, runtime.deps._t)('켜짐') : (0, runtime.deps._t)('꺼짐');
            if (typeof runtime.deps.queueImportantSave === 'function') (0, runtime.deps.queueImportantSave)(0);
        });
    }
    const hasShortcut = !!runtime.deps.activeTutorial.tabId || !!runtime.deps.activeTutorial.subtabId;
    const openButton = runtime.deps.document.getElementById('tutorial-open-btn');
    const dismissButton = runtime.deps.document.getElementById('tutorial-dismiss-btn');
    openButton.style.display = hasShortcut ? 'inline-block' : 'none';
    openButton.innerHTML = `<span class="px-center">${(0, runtime.deps.escapeHTML)(tutorialOpenLabel(runtime, runtime.deps.activeTutorial))}</span>`;
    dismissButton.innerText = (0, runtime.deps._t)('확인');
}

/** 설정으로 가는 길: 휴대폰은 하단 "전체" 서랍, PC는 HUD의 "기타" 목록. */
export function settingsMenuPath(runtime) {
    return (0, runtime.deps._t)((0, runtime.deps.isMobilePrimaryNavigationEnabled)() ? '전체 → 설정' : '기타 → 설정');
}

export function coachNoticeBody(runtime, notice, controls) {
    const journey = runtime.deps.contentUnlockUi.journeyForNotice(notice);
    const body = runtime.deps.EXPLORATION_REGIONS.guides[journey] ? runtime.deps.contentUnlockUi.journeyNotice(journey)
        : notice.key === 'tutorial_first_passive' ? runtime.state.coachGuides.unlock_char.body : notice.body;
    return tutorialQuoteHtml(runtime, notice.quote) + tutorialBodyHtml(runtime, body, notice.bodyParams) + controls.trim();
}

export function coachGuideFor(runtime, key) {
    const guideKey = runtime.state.coachAliases[key] || key;
    const guide = Object.hasOwn(runtime.state.coachGuides, guideKey) ? runtime.state.coachGuides[guideKey] : null;
    return guide && (!guide.available || guide.available()) ? guide : null;
}
