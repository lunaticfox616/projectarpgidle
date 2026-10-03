// Shared steps for browser checks. Not a spec file: Playwright only collects *.spec.js.

/**
 * Picks a class in the start / next-loop class select (#loop-hero-select-overlay).
 * PC commits on the card press. The phone layout (1080px or narrower) only selects on the first press and shows the
 * class details above "이 직업으로 시작" (js/passives.js pressLoopHeroChoice), so that button is pressed when it shows.
 * @param {import('@playwright/test').Page} page
 * @param {string} [classId] class to pick; the first card when omitted
 * @param {{ tap?: boolean }} [options] tap instead of click (touch projects)
 */
async function pickClass(page, classId, { tap = false } = {}) {
    const overlay = page.locator('#loop-hero-select-overlay');
    const card = classId ? overlay.locator(`[data-class-id="${classId}"]`) : overlay.locator('[data-class-id]').first();
    const press = locator => tap ? locator.tap() : locator.click();
    await press(card);
    const start = overlay.locator('#loop-hero-select-start');
    if (await start.isVisible()) await press(start);
}

module.exports = { pickClass };
