// GENERATED from modules/wisp-summons*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/wisp-summons.mjs
  function createWispSummons(definitions) {
    const DOTS_PER_CELL = 16;
    let inFlight = [];
    const specOf = (name) => definitions[name] || null;
    function flightMs(name, from, to) {
      const flight = specOf(name)?.flight, dx = to && from ? to.gx - from.gx : NaN, dy = to && from ? to.gy - from.gy : NaN;
      if (!flight || !Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
      return flight.base + flight.perDot * Math.hypot(dx * DOTS_PER_CELL, dy * DOTS_PER_CELL - 1);
    }
    function artMs(name, flight) {
      return flight + (specOf(name)?.tailMs || 0);
    }
    function elements(name) {
      return specOf(name)?.elements || null;
    }
    const ELEMENT_TAG = Object.freeze({ fire: "fire", cold: "cold", light: "lightning" });
    function elementTag(summon) {
      const pool = summon && elements(summon.gemName);
      return pool && pool.includes(summon.ele) ? ELEMENT_TAG[summon.ele] : null;
    }
    function rollElement(name) {
      const pool = elements(name);
      return pool ? pool[Math.floor(Math.random() * pool.length)] : null;
    }
    function launch(summon, targets, at, options = {}) {
      const flight = flightMs(summon.gemName, summon, targets[0]) + Math.max(0, options.delayMs || 0), element = rollElement(summon.gemName);
      const first = (index) => index === 0 && options.first !== false;
      const multiplier = Math.max(0, Math.min(1, Number(options.multiplier ?? 1)));
      if (flight <= 0) return { flight, now: targets.map((target, index) => ({ target, first: first(index), element, multiplier })) };
      inFlight.push(...targets.map((target, index) => ({ summonId: summon.id, enemyId: target.id, first: first(index), element, multiplier, landAt: at + flight })));
      return { flight, now: [] };
    }
    function due(at) {
      if (!inFlight.length) return [];
      const landed = inFlight.filter((hit) => hit.landAt <= at);
      if (landed.length) inFlight = inFlight.filter((hit) => hit.landAt > at);
      return landed;
    }
    function reset() {
      inFlight = [];
    }
    function isHit(hit) {
      return hit && Number.isFinite(hit.summonId) && Number.isFinite(hit.enemyId) && Number.isFinite(hit.landAt);
    }
    function capture() {
      return inFlight.map((hit) => ({ ...hit }));
    }
    function restore(saved) {
      inFlight = Array.isArray(saved) ? saved.filter(isHit).map((hit) => ({ ...hit, first: hit.first === true, element: hit.element || null })) : [];
    }
    return Object.freeze({ flightMs, artMs, elements, elementTag, launch, due, reset, capture, restore });
  }

  // modules/wisp-summons-classic.mjs
  var wispSummons = createWispSummons(WISP_SUMMONS);
  safeExposeGlobals({ wispSummons });
})();
