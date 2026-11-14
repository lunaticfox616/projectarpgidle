export function lessonHtml(runtime, lesson) {
    return `<li><div><strong>${esc(runtime, lesson.title)}</strong><p>${esc(runtime, lesson.body)}</p></div>
            <button type="button" data-guide-lesson="${lesson.key}">${(0, runtime.deps._t)('가이드 다시보기')}</button></li>`;
}

export function render(runtime) {
    const host = runtime.deps.document.getElementById('ui-player-guide');
    if (!host) return;
    const available = runtime.state.lessons.filter(runtime.handlers.lessonAvailable).map(runtime.handlers.lessonHtml).join('');
    const definitions = runtime.state.terms.filter(term => term.unlock ? runtime.deps.contentProgression.isUnlocked(term.unlock) : runtime.deps.contentProgression.canOpen(term.tab));
    const glossary = definitions.map(term => `<div><dt>${esc(runtime, term.name)}</dt><dd>${esc(runtime, term.body)}</dd></div>`).join('');
    (0, runtime.deps.writeHtmlIfChanged)(host, `<section class="player-guide"><h3>${(0, runtime.deps._t)('가이드 다시보기')}</h3><ul>${available}</ul>
            ${glossary ? `<h3>${(0, runtime.deps._t)('용어')}</h3><dl>${glossary}</dl>` : ''}</section>`);
}

export function lessonAvailable(runtime, lesson) {
    return runtime.deps.contentProgression.canOpen(lesson.tabId) && (!lesson.unlock || runtime.deps.contentProgression.isUnlocked(lesson.unlock))
        && (!lesson.gate || lesson.gate());
}

export function prepareExample(runtime, key) {
    runtime.deps.game.level = 12;
    runtime.deps.game.season = 2;
    runtime.deps.game.loopCount = 1;
    runtime.deps.game.selectedClassId = 'warrior';
    runtime.deps.game.heroSelectionInitialized = true;
    runtime.deps.game.combatHalted = true;
    runtime.deps.game.settings.autoEquipEmptySlots = false;
    runtime.deps.game.settings.showMobileBattlePip = false;
    runtime.deps.game.seenTutorials.push('opening_done');
    runtime.deps.game.equipment['무기'] = (0, runtime.deps.createClassStarterWeapon)('warrior');
    const system = runtime.deps.systemTutorialUi.guides[key];
    if (system) {
        runtime.state.replay.restoreSystem = system.prepare();
        return;
    }
    const examples = {
        unlock_items: () => {
            const makeHelmet = rarity => (0, runtime.deps.generateEquipmentDrop)({}, { zone: (0, runtime.deps.getZone)(0), slot: '투구', minimumRarity: rarity });
            runtime.deps.game.equipment['투구'] = makeHelmet('normal');
            runtime.deps.game.inventory.push(makeHelmet('rare'));
        },
        unlock_skills: () => runtime.deps.game.skills.push('화염 참격', '관통 사격'),
        unlock_char: () => {
            runtime.deps.game.contentProgression.inherited.push('passiveTree');
            runtime.deps.game.passivePoints = 1;
        },
        unlock_stump_box: () => {
            runtime.deps.game.contentProgression.inherited.push('stump');
            runtime.deps.game.stumpBox.acquired = true;
            runtime.deps.stumpBox.createItem(runtime.deps.game, { family: 'seed', color: 'fire', roll: 1 });
        }
    };
    examples[key]();
}

export function esc(runtime, text) { return (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(text)); }
