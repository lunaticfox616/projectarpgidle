// GENERATED from modules/data/woodsman-battle.mjs. Edit the ESM source; run npm run build:modules.
(() => {
  // modules/data/woodsman-battle.mjs
  var WOODSMAN_BATTLE = Object.freeze({
    path: "assets/enemies/woodsman-giant/",
    intro: { revealMs: 1200, speechMs: 6500 },
    stumpPattern: { id: "stump", name: "묘목의 함", motion: "command" },
    stumps: {
      count: 1,
      footprint: { columns: 3, rows: 2 },
      maxAdds: 6,
      firstSpawnMs: 6e3,
      spawnMs: 12e3,
      riseMs: 900,
      absorbMs: 1400,
      moveMs: 1400,
      travelShare: 0.65,
      healFraction: 0.02,
      landingDamageMul: 1.4,
      summons: [
        { look: "root-scimitar", name: "한손검 뿌리촉수" },
        { look: "underworld-hound", name: "균사 사냥개" },
        { look: "underworld-beetle", name: "흑요석 갑충" },
        { look: "wisp-b05", name: "혼돈균열 위습" }
      ]
    },
    elements: ["phys", "fire", "cold", "light", "chaos"],
    colours: { phys: "#dac69e", fire: "#ff8b4e", cold: "#8bdff0", light: "#e6d778", chaos: "#cd86d7" },
    // Authored key poses: hold anticipation, skip transition poses, hold release, then recover.
    // The release pose starts exactly when combat releases the attack (not at a video timestamp).
    motions: {
      cast: {
        release: 1750,
        releaseFrame: 6,
        sourceFrames: [0, 4, 8, 11, 14, 16, 18, 21, 24, 28, 30, 33, 36],
        durations: [350, 250, 250, 300, 500, 100, 200, 180, 160, 140, 160, 220, 260]
      },
      command: {
        release: 1584,
        releaseFrame: 7,
        sourceFrames: [0, 3, 5, 7, 10, 13, 16, 18, 20, 23, 27, 31, 36],
        durations: [300, 220, 150, 220, 300, 294, 100, 180, 200, 160, 180, 240, 280]
      },
      weapon: {
        release: 1500,
        releaseFrame: 7,
        sourceFrames: [0, 4, 8, 12, 15, 17, 19, 21, 24, 27, 30, 33, 36],
        durations: [300, 180, 230, 260, 330, 100, 100, 220, 200, 120, 180, 240, 280]
      }
    },
    patterns: [
      { id: "spire", name: "지맥창", motion: "cast" },
      { id: "wheel", name: "회귀의 차륜", motion: "cast" },
      { id: "lance", name: "세 갈래 심판", motion: "cast" },
      { id: "nova", name: "붕괴의 낙인", motion: "command" },
      { id: "wave", name: "밀려오는 규율", motion: "command" },
      { id: "cleave", name: "수확의 일격", motion: "weapon" }
    ],
    coverPatterns: [
      { id: "cover-tide", name: "규율의 해일", motion: "cast" },
      { id: "cover-sweep", name: "경계 절단", motion: "weapon" },
      { id: "cover-verdict", name: "집행자의 파동", motion: "command" }
    ],
    cell: { width: 480, height: 270, columns: 8, frames: 13 },
    anchors: {
      spire: [[0.5, 0.87]],
      lance: [[0.5, 0.9]],
      cleave: [[0.5, 0.5]],
      nova: [[0.5, 0.81], [0.5, 0.81], [0.5, 0.81], [0.5, 0.8], [0.5, 0.8], [0.5, 0.8]],
      wheel: [[0.5, 0.605], [0.5, 0.59], [0.5, 0.6], [0.5, 0.545], [0.5, 0.545], [0.5, 0.54]],
      wave: [[0.51, 0.735], [0.5, 0.735], [0.5, 0.735], [0.5, 0.65], [0.5, 0.65], [0.5, 0.65]]
    }
  });

  // modules/data/woodsman-battle.mjs:classic
  Object.assign(globalThis, { WOODSMAN_BATTLE });
  if (typeof safeExposeData === "function") safeExposeData({ WOODSMAN_BATTLE });
})();
