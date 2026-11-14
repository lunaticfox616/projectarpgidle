// GENERATED from modules/data/wisp-sprites.mjs. Edit the ESM source; run npm run build:modules.
(() => {
  // modules/data/wisp-sprites.mjs
  var WISP_SPRITE_FRAME = 48;
  var WISP_SPRITE_DIRECTIONS = Object.freeze(["up", "down", "left", "right"]);
  var WISP_SPRITE_CLIPS = Object.freeze({
    idle: Object.freeze({ frames: 4, durationsMs: Object.freeze([220, 180, 220, 180]), loop: true }),
    attack: Object.freeze({ frames: 6, durationsMs: Object.freeze([100, 90, 80, 70, 110, 150]), loop: false, impactFrame: 3 })
  });
  var WISP_SPRITE_SHEETS = Object.freeze({
    fire: Object.freeze({ name: "불씨 위습", idle: "assets/enemies/wisps/elemental/fire-idle.png", attack: "assets/enemies/wisps/elemental/fire-attack.png" }),
    ice: Object.freeze({ name: "서리날개 위습", idle: "assets/enemies/wisps/elemental/ice-idle.png", attack: "assets/enemies/wisps/elemental/ice-attack.png" }),
    lightning: Object.freeze({ name: "전광 위습", idle: "assets/enemies/wisps/elemental/lightning-idle.png", attack: "assets/enemies/wisps/elemental/lightning-attack.png" }),
    poison: Object.freeze({ name: "독안개 위습", idle: "assets/enemies/wisps/elemental/poison-idle.png", attack: "assets/enemies/wisps/elemental/poison-attack.png" }),
    holy: Object.freeze({ name: "성광 위습", idle: "assets/enemies/wisps/elemental/holy-idle.png", attack: "assets/enemies/wisps/elemental/holy-attack.png" }),
    void: Object.freeze({ name: "공허 위습", idle: "assets/enemies/wisps/elemental/void-idle.png", attack: "assets/enemies/wisps/elemental/void-attack.png" })
  });
  var WISP_SPRITE_BY_VISUAL = Object.freeze({
    "wisp-b01": "holy",
    "wisp-b02": "fire",
    "wisp-b03": "ice",
    "wisp-b04": "lightning",
    "wisp-b05": "void",
    "wisp-b06": "poison",
    "wisp-h01": "fire",
    "wisp-h02": "lightning",
    "wisp-h03": "ice",
    "wisp-h04": "fire",
    "wisp-h05": "ice",
    "wisp-h06": "lightning",
    "wisp-h07": "poison",
    "wisp-s01": "holy",
    "wisp-s02": "poison",
    "wisp-s03": "void",
    "wisp-s04": "void",
    "wisp-s05": "holy"
  });
  var WISP_SPRITE_BY_ELEMENT = Object.freeze({ phys: "holy", fire: "fire", cold: "ice", light: "lightning", chaos: "void" });

  // modules/data/wisp-sprites.mjs:classic
  Object.assign(globalThis, { WISP_SPRITE_FRAME, WISP_SPRITE_DIRECTIONS, WISP_SPRITE_CLIPS, WISP_SPRITE_SHEETS, WISP_SPRITE_BY_VISUAL, WISP_SPRITE_BY_ELEMENT });
  if (typeof safeExposeData === "function") safeExposeData({ WISP_SPRITE_FRAME, WISP_SPRITE_DIRECTIONS, WISP_SPRITE_CLIPS, WISP_SPRITE_SHEETS, WISP_SPRITE_BY_VISUAL, WISP_SPRITE_BY_ELEMENT });
})();
