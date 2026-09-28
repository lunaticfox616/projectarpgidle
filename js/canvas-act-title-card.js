/** Act title card: when the battlefield shows a story act (entering it, or on load), its number, name and subtitle fade
 * in over the upper field for a few seconds, like an area name in an ARPG. It waits while a story or tutorial popup is
 * open so the card is not spent behind it. Read-only: it watches game.currentZoneId and never touches combat state.
 */
const actTitleCard = (() => {
    const SHOW_MS = 3600;
    const FADE_IN_MS = 500;
    const FADE_OUT_MS = 800;
    const GOLD = '#e0c27e';
    const PARCHMENT = '#e9e2cf';
    let zone, act = null, startAt = 0;

    function actOf(zoneId) {
        return Number.isInteger(zoneId) && zoneId >= 0 && zoneId < STORY_ACTS.length ? STORY_ACTS[zoneId] : null;
    }
    function popupOpen() {
        const overlay = typeof document === 'object' ? document.getElementById('tutorial-overlay') : null;
        return !!overlay && overlay.classList.contains('active');
    }
    function track(now) {
        if (game.currentZoneId !== zone) {
            zone = game.currentZoneId;
            act = actOf(zone);
            startAt = 0;
        }
        if (act && !startAt && !popupOpen()) startAt = now;
    }
    function opacity(age) {
        return Math.max(0, Math.min(1, age / FADE_IN_MS, (SHOW_MS - age) / FADE_OUT_MS));
    }
    function band(ctx, view) {
        const shade = ctx.createLinearGradient(0, view.top - view.size * 1.4, 0, view.top + view.size * 2.6);
        shade.addColorStop(0, 'rgba(6,8,10,0)');
        shade.addColorStop(0.5, 'rgba(6,8,10,0.62)');
        shade.addColorStop(1, 'rgba(6,8,10,0)');
        ctx.fillStyle = shade;
        ctx.fillRect(0, view.top - view.size * 1.4, view.width, view.size * 4);
    }
    function kicker(ctx, view) {
        const label = `액트 ${act.displayAct}`, half = view.size * 2.4;
        ctx.font = `${Math.round(view.size * 0.5)}px 'MulmaruMono', 'Malgun Gothic', sans-serif`;
        ctx.fillStyle = GOLD;
        ctx.fillText(label, view.x, view.top - view.size * 0.55);
        const gap = ctx.measureText(label).width / 2 + view.size * 0.5;
        ctx.fillRect(Math.round(view.x - gap - half), Math.round(view.top - view.size * 0.72), Math.round(half), 1);
        ctx.fillRect(Math.round(view.x + gap), Math.round(view.top - view.size * 0.72), Math.round(half), 1);
    }
    function title(ctx, view) {
        ctx.font = `${view.size}px 'Galmuri14', 'MulmaruMono', 'Malgun Gothic', sans-serif`;
        ctx.lineWidth = Math.max(3, view.size * 0.16);
        ctx.strokeStyle = 'rgba(8,6,4,0.9)';
        ctx.strokeText(act.title, view.x, view.top + view.size * 0.5);
        ctx.fillStyle = PARCHMENT;
        ctx.fillText(act.title, view.x, view.top + view.size * 0.5);
        ctx.font = `${Math.round(view.size * 0.46)}px 'MulmaruMono', 'Malgun Gothic', sans-serif`;
        ctx.fillStyle = 'rgba(233,226,207,0.82)';
        ctx.fillText(act.subtitle || '', view.x, view.top + view.size * 1.45);
    }
    /** Called once per battlefield frame, after the lighting pass. */
    function draw(ctx, width, height, now) {
        track(now);
        if (!act || !startAt) return;
        const age = now - startAt;
        if (age >= SHOW_MS) { act = null; return; }
        const size = Math.round(Math.max(20, Math.min(40, Math.min(width, height) * 0.045)));
        const view = { x: Math.round(width / 2), top: Math.round(height * 0.2), size, width };
        ctx.save();
        ctx.globalAlpha = opacity(age);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        band(ctx, view);
        kicker(ctx, view);
        title(ctx, view);
        ctx.restore();
    }
    if (typeof document === 'object' && document.fonts?.load) document.fonts.load("20px 'Galmuri14'").catch(() => {});
    return Object.freeze({ draw });
})();
safeExposeGlobals({ actTitleCard });
