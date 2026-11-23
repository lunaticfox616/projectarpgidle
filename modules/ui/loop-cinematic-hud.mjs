// The loop cinematic's text over the pictures: the voice's subtitles, the rewinding counters and kept things, the loop title,
// and the unlock step's one line. Each whole line is laid out first and only its letters are revealed, so typing never shifts it.
import { SHOTS, clamp01, easeIn, smooth, lineAt, rewindHolds } from './loop-cinematic-timeline.mjs';
import { clockText } from './loop-cinematic-snapshot.mjs';

const esc = (deps, text) => deps.escapeHTML(String(text));

export function overlayHtml(deps, play) {
    const voice = deps.STORY_LOOP_CINEMATIC.voice, title = deps._t('루프 {season}', { season: play.snap.nextSeason });
    const nums = [['level', deps._t('레벨')], ['kills', deps._t('처치')], ['time', deps._t('시간')]]
        .map(([key, label]) => `<div class="loop-cine-num"><span>${esc(deps, label)}</span><b data-cine-num="${key}"></b><i class="loop-cine-bar"><i data-cine-bar="${key}"></i></i></div>`).join('');
    const chips = play.snap.chips.map(chip => `<span class="loop-cine-chip"><img src="${esc(deps, chip.icon)}" alt="">${esc(deps, chip.label)}</span>`).join('');
    return `<canvas class="loop-cine-canvas" aria-hidden="true"></canvas>
        <div class="loop-cine-subs" aria-live="polite"><div class="loop-cine-tag">${esc(deps, deps._t(voice.speaker))}</div><p class="loop-cine-line"></p></div>
        <div class="loop-cine-rw" aria-hidden="true"><div class="loop-cine-chips">${chips}</div><div class="loop-cine-nums">${nums}</div></div>
        <div class="loop-cine-title">${esc(deps, title)}</div>
        <div class="loop-cine-unlock" hidden></div>
        <button type="button" class="loop-cine-skip" data-cine-skip>${esc(deps, deps._t('건너뛰기'))}</button>`;
}

export function unlockHtml(deps) {
    const row = deps.STORY_LOOP_CINEMATIC.unlock, npc = deps.STORY_NPCS[row.speaker];
    const portrait = `${deps.STAGE_NPC_ART.path}${row.speaker}-portrait.webp`;
    return `<section class="loop-cine-window" aria-label="${esc(deps, deps._t('콘텐츠 해금'))}">
        <div class="loop-cine-strip"><span class="loop-cine-face"><img src="${esc(deps, portrait)}" alt=""></span>
        <b class="loop-cine-speaker">${esc(deps, deps._t(npc ? npc.name : row.speaker))}</b><p class="loop-cine-say" data-cine-say></p>
        <button type="button" class="loop-cine-go" data-cine-go>${esc(deps, deps._t('직업 선택'))}</button></div>
        <div class="loop-cine-unlock-body" data-cine-host></div></section>`;
}

/** Writes a line with only its first n letters visible. */
function typeInto(deps, el, text, n) {
    const key = text.length + ':' + n;
    if (el.dataset.typed === key) return;
    el.dataset.typed = key;
    el.innerHTML = `${esc(deps, text.slice(0, n))}<span class="loop-cine-rest">${esc(deps, text.slice(n))}</span>`;
}

export class LoopCinematicHud {
    constructor(deps, root, play) {
        this.deps = deps;
        this.root = root;
        this.play = play;
        this.subs = root.querySelector('.loop-cine-subs');
        this.line = root.querySelector('.loop-cine-line');
        this.rw = root.querySelector('.loop-cine-rw');
        this.loopTitle = root.querySelector('.loop-cine-title');
        this.chips = [...root.querySelectorAll('.loop-cine-chip')];
        this.nums = Object.fromEntries(['level', 'kills', 'time'].map(key => [key, root.querySelector(`[data-cine-num="${key}"]`)]));
        this.bars = Object.fromEntries(['level', 'kills', 'time'].map(key => [key, root.querySelector(`[data-cine-bar="${key}"]`)]));
        this.lineTexts = deps.STORY_LOOP_CINEMATIC.voice.lines.map(text => deps._t(text));
    }

    update(t, sceneCentre) {
        const T = this.play.T, cine = this.play.phase === 'cine';
        this.updateSubs(cine && T.mode === 'full' ? t : -1);
        this.updateRewind(cine && T.mode === 'full' ? t - T.starts[5] : -1, sceneCentre);
        this.updateTitle(cine ? t : -1);
    }

    updateSubs(t) {
        const line = t >= 0 ? lineAt(this.play.T, t) : null;
        let shown = 0;
        if (line && t < line.end) while (shown < line.times.length && line.times[shown] <= t - line.start) shown++;
        this.subs.classList.toggle('is-on', shown > 0);
        if (shown > 0) typeInto(this.deps, this.line, this.lineTexts[line.i], Math.round(shown / line.text.length * this.lineTexts[line.i].length));
    }

    updateRewind(e, centre) {
        const cfg = this.play.T.rewind, iStart = cfg.coreFlyMs + cfg.flashMs, on = e >= iStart && e < cfg.ms;
        this.rw.classList.toggle('is-on', on);
        if (!on) return;
        const span = rewindHolds(cfg, this.play.snap.rewind.length).reduce((a, b) => a + b, 0), left = 1 - easeIn((e - iStart) / span);
        const r = this.play.snap.record;
        this.nums.level.textContent = String(Math.max(1, Math.round(1 + (Math.max(1, r.level) - 1) * left)));
        this.nums.kills.textContent = Math.round(r.kills * left).toLocaleString(this.deps.i18n.locale);
        this.nums.time.textContent = clockText(r.activeMs * left);
        const pct = (left * 100).toFixed(1) + '%';
        Object.values(this.bars).forEach(bar => { bar.style.width = pct; });
        this.driftChips(e - (iStart + span * cfg.driftAt), centre);
    }

    /** Kept things leave in single file: one starts as the one before it reaches the core and fades, so two never overlap. */
    driftChips(e, centre) {
        const gap = SHOTS.rewind.chipGapMs, flight = gap - 10, box = this.root.getBoundingClientRect(), zoom = box.width / (this.root.clientWidth || box.width || 1);
        this.chips.forEach((chip, i) => {
            const u = clamp01((e - i * gap) / flight);
            chip.style.transform = '';
            chip.style.opacity = u >= 1 ? '0' : '1';
            if (u <= 0 || u >= 1) return;
            const r = chip.getBoundingClientRect(), dx = centre.x - ((r.left - box.left) / zoom + r.width / zoom / 2), dy = centre.y - ((r.top - box.top) / zoom + r.height / zoom / 2), d = smooth(u);
            chip.style.transform = `translate(${Math.round(dx * d)}px, ${Math.round(dy * d)}px)`;
            chip.style.opacity = String(1 - smooth((u - 0.7) / 0.3));
        });
    }

    updateTitle(t) {
        const T = this.play.T;
        let o = 0;
        if (T.mode === 'plain') o = 1;
        else if (t >= 0) {
            const ws = T.mode === 'full' ? T.starts[6] : T.starts[2];
            if (t >= ws) o = clamp01((t - ws - T.well.titleAtMs) / T.well.titleFadeMs);
        }
        this.loopTitle.style.opacity = String(Math.round(o * 4) / 4);
    }

    /** The unlock step's line, typed once at the voice's pace. */
    typeSay(el, ms) {
        const text = this.deps._t(this.deps.STORY_LOOP_CINEMATIC.unlock.line);
        typeInto(this.deps, el, text, Math.min(text.length, Math.floor(Math.max(0, ms) / SHOTS.voice.charMs)));
    }
}
