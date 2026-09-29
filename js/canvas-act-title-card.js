/** Act title card over the upper battlefield, like an area name in an ARPG: entering (or loading into) a story act
 * shows "액트 N", the act name and its subtitle. It waits while a story or tutorial popup is open, so it is not spent
 * behind it. Bosses keep the battlefield's own banner (drawBossAnnouncement).
 * Read-only: it watches game.currentZoneId; nothing here touches combat state.
 */
const actTitleCard = (() => {
    const ACT = Object.freeze({ showMs: 3600, kickerColour: '#e0c27e', titleColour: '#e9e2cf' });
    const FADE_IN_MS = 500;
    const FADE_OUT_MS = 800;
    let zone, pending = null, card = null;

    function actOf(zoneId) {
        return Number.isInteger(zoneId) && zoneId >= 0 && zoneId < STORY_ACTS.length ? STORY_ACTS[zoneId] : null;
    }
    function popupOpen() {
        const overlay = typeof document === 'object' ? document.getElementById('tutorial-overlay') : null;
        return !!overlay && overlay.classList.contains('active');
    }
    function watchZone() {
        if (game.currentZoneId === zone) return;
        zone = game.currentZoneId;
        const act = actOf(zone);
        card = null;
        pending = act ? { style: ACT, kicker: `액트 ${act.displayAct}`, title: act.title, subtitle: act.subtitle || '' } : null;
    }
    function track(now) {
        watchZone();
        if (card && now - card.startAt >= card.style.showMs) card = null;
        if (!card && pending && !popupOpen()) { card = { ...pending, startAt: now }; pending = null; }
    }
    function opacity(age, showMs) {
        return Math.max(0, Math.min(1, age / FADE_IN_MS, (showMs - age) / FADE_OUT_MS));
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
        const half = view.size * 2.4;
        ctx.font = `${Math.round(view.size * 0.5)}px 'MulmaruMono', 'Malgun Gothic', sans-serif`;
        ctx.fillStyle = card.style.kickerColour;
        ctx.fillText(card.kicker, view.x, view.top - view.size * 0.55);
        const gap = ctx.measureText(card.kicker).width / 2 + view.size * 0.5;
        ctx.fillRect(Math.round(view.x - gap - half), Math.round(view.top - view.size * 0.72), Math.round(half), 1);
        ctx.fillRect(Math.round(view.x + gap), Math.round(view.top - view.size * 0.72), Math.round(half), 1);
    }
    function title(ctx, view) {
        ctx.font = `${view.size}px 'Galmuri14', 'MulmaruMono', 'Malgun Gothic', sans-serif`;
        ctx.lineWidth = Math.max(3, view.size * 0.16);
        ctx.strokeStyle = 'rgba(8,6,4,0.9)';
        ctx.strokeText(card.title, view.x, view.top + view.size * 0.5);
        ctx.fillStyle = card.style.titleColour;
        ctx.fillText(card.title, view.x, view.top + view.size * 0.5);
        ctx.font = `${Math.round(view.size * 0.46)}px 'MulmaruMono', 'Malgun Gothic', sans-serif`;
        ctx.fillStyle = 'rgba(233,226,207,0.82)';
        ctx.fillText(card.subtitle, view.x, view.top + view.size * 1.45);
    }
    /** Called once per battlefield frame, after the lighting pass. */
    function draw(ctx, width, height, now) {
        track(now);
        if (!card) return;
        const size = Math.round(Math.max(20, Math.min(34, Math.min(width, height) * 0.04)));
        const view = { x: Math.round(width / 2), top: Math.round(height * 0.2), size, width };
        ctx.save();
        ctx.globalAlpha = opacity(now - card.startAt, card.style.showMs);
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
