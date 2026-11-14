// GENERATED from modules/data/bgm.mjs. Edit the ESM source; run npm run build:modules.
(() => {
  // modules/data/bgm.mjs
  var BGM_TRACKS = Object.freeze({
    title: Object.freeze({ file: "title.ogg", loopStart: 6.976, loopEnd: 89.7794 }),
    // 로그인 화면
    act: Object.freeze({ file: "act.ogg", loopStart: 3.008, loopEnd: 85.1368 }),
    // 액트
    boss: Object.freeze({ file: "boss.ogg", loopStart: 13.9733, loopEnd: 97.9293 }),
    // 일반 보스(2026-11-05 사용자의 새 곡)
    "act-boss": Object.freeze({ file: "act-boss.ogg", loopStart: 19.9893, loopEnd: 93.3306 }),
    // 액트 보스(2026-11-05 사용자의 새 곡)
    "great-boss": Object.freeze({ file: "great-boss.ogg", loopStart: 13.0347, loopEnd: 104.9104 }),
    // 보스(뿌리 보스)
    labyrinth: Object.freeze({ file: "labyrinth.ogg", loopStart: 17.3653, loopEnd: 85.0109 }),
    // 미궁
    "labyrinth-boss": Object.freeze({ file: "labyrinth-boss.ogg", loopStart: 3.7547, loopEnd: 181.2972 }),
    // 고대 미궁 보스(2026-11-08 사용자의 새 곡)
    beehive: Object.freeze({ file: "beehive.ogg", loopStart: 18.1547, loopEnd: 102.1664 }),
    // 벌집
    "queen-bee": Object.freeze({ file: "queen-bee.ogg", loopStart: 19.008, loopEnd: 84.9959 }),
    // 여왕벌
    "time-rift": Object.freeze({ file: "time-rift.ogg", loopStart: 8, loopEnd: 102.4955 }),
    // 시간의 균열
    ocean: Object.freeze({ file: "ocean.ogg", loopStart: 3.8187, loopEnd: 111.7977 }),
    // 심해
    abyss: Object.freeze({ file: "abyss.ogg", loopStart: 4.288, loopEnd: 85.7881 }),
    // 어비스
    "abyss-boss": Object.freeze({ file: "abyss-boss.ogg", loopStart: 3.84, loopEnd: 93.9846 }),
    // 어비스 보스(2026-11-05 사용자의 새 곡)
    "ascend-trial": Object.freeze({ file: "ascend-trial.ogg", loopStart: 8.0427, loopEnd: 95.158 }),
    // 전직시련
    "sky-tower": Object.freeze({ file: "sky-tower.ogg", loopStart: 18.0053, loopEnd: 87.1198 }),
    // 창공
    atlas: Object.freeze({ file: "atlas.ogg", loopStart: 16.7467, loopEnd: 101.963 }),
    // 최종 아틀라스(2026-11-05 사용자의 새 곡)
    "ancient-sun": Object.freeze({ file: "ancient-sun.ogg", loopStart: 39.7227, loopEnd: 131.0063 }),
    // 고대의 태양: 태양의 존재, 벨라-루(2026-11-10)
    "ancient-moon": Object.freeze({ file: "ancient-moon.ogg", loopStart: 49.7493, loopEnd: 168.6697 }),
    // 고대의 달: 달의 존재, 아리안로드(2026-11-10)
    observer: Object.freeze({ file: "observer.ogg", loopStart: 5.1627, loopEnd: 112.0792 }),
    // 관측자: 경계의 관측자 베일라(2026-11-10)
    woodsman: Object.freeze({ file: "woodsman.ogg", loopStart: 22.528, loopEnd: 188.9683 })
    // 규율자: 나무꾼과 그 잔상(2026-11-10)
  });
  var BGM_ZONE_TRACKS = Object.freeze({
    act: "act",
    labyrinth: "labyrinth",
    beehive: "beehive",
    timeRift: "time-rift",
    oceanDepth: "ocean",
    abyss: "abyss",
    chaosRealm: "abyss",
    underworld: "abyss",
    trial: "ascend-trial",
    skyTower: "sky-tower",
    atlasMap: "atlas",
    cosmos: "atlas",
    seasonBoss: "great-boss"
  });
  var BGM_BOSS_TRACKS = Object.freeze({ act: "act-boss", abyss: "abyss-boss", labyrinth: "labyrinth-boss", chaosRealm: "abyss-boss", underworld: "abyss-boss", beehive: "queen-bee", trial: "ascend-trial", seasonBoss: "great-boss" });
  var BGM_BOSS_VISUAL_TRACKS = Object.freeze({
    pinnacle_underking: "ancient-sun",
    cosmos_astra: "ancient-moon",
    pinnacle_observer: "observer",
    woodsman: "woodsman",
    woodsman_echo: "woodsman"
  });

  // modules/data/bgm.mjs:classic
  Object.assign(globalThis, { BGM_TRACKS, BGM_ZONE_TRACKS, BGM_BOSS_TRACKS, BGM_BOSS_VISUAL_TRACKS });
  if (typeof safeExposeData === "function") safeExposeData({ BGM_TRACKS, BGM_ZONE_TRACKS, BGM_BOSS_TRACKS, BGM_BOSS_VISUAL_TRACKS });
})();
