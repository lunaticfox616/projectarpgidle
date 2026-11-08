// 배경음(2026-11-04 사용자의 리그닌 BGM 13곡, 11-05 액트 보스와 어비스 보스 곡, 11-08 고대 미궁 보스 곡을 더해 16곡, js/bgm-ui.js가 튼다). 곡은
// assets/audio/bgm/의 Ogg Vorbis(약 90kbps, 85~112초)다. 고대 미궁 보스 곡만 181초다: 처음 주제가 104마디 뒤에야 다시 나와, 100초 근처에서
// 자르면 되감길 때 박자가 반 박 어긋났다.
// 처음부터 한 번 울린 뒤 loopStart~loopEnd(초)를 되풀이한다. 원곡에서 loopStart 뒤와 loopEnd 뒤가 가장 닮은 자리(화음과 박)를
// 골랐고, 파일 끝 2초는 loopStart 앞 2초와 미리 섞어 두어 되감길 때 이음매가 들리지 않는다. loopEnd가 파일 끝이다.
const BGM_TRACKS = Object.freeze({
    title: Object.freeze({ file: 'title.ogg', loopStart: 6.976, loopEnd: 89.7794 }),               // 로그인 화면
    act: Object.freeze({ file: 'act.ogg', loopStart: 3.008, loopEnd: 85.1368 }),                   // 액트
    boss: Object.freeze({ file: 'boss.ogg', loopStart: 13.9733, loopEnd: 97.9293 }),               // 일반 보스(2026-11-05 사용자의 새 곡)
    'act-boss': Object.freeze({ file: 'act-boss.ogg', loopStart: 19.9893, loopEnd: 93.3306 }),     // 액트 보스(2026-11-05 사용자의 새 곡)
    'great-boss': Object.freeze({ file: 'great-boss.ogg', loopStart: 13.0347, loopEnd: 104.9104 }), // 보스(뿌리 보스)
    labyrinth: Object.freeze({ file: 'labyrinth.ogg', loopStart: 17.3653, loopEnd: 85.0109 }),     // 미궁
    'labyrinth-boss': Object.freeze({ file: 'labyrinth-boss.ogg', loopStart: 3.7547, loopEnd: 181.2972 }), // 고대 미궁 보스(2026-11-08 사용자의 새 곡)
    beehive: Object.freeze({ file: 'beehive.ogg', loopStart: 18.1547, loopEnd: 102.1664 }),        // 벌집
    'queen-bee': Object.freeze({ file: 'queen-bee.ogg', loopStart: 19.008, loopEnd: 84.9959 }),    // 여왕벌
    'time-rift': Object.freeze({ file: 'time-rift.ogg', loopStart: 8, loopEnd: 102.4955 }),        // 시간의 균열
    ocean: Object.freeze({ file: 'ocean.ogg', loopStart: 3.8187, loopEnd: 111.7977 }),             // 심해
    abyss: Object.freeze({ file: 'abyss.ogg', loopStart: 4.288, loopEnd: 85.7881 }),               // 어비스
    'abyss-boss': Object.freeze({ file: 'abyss-boss.ogg', loopStart: 3.84, loopEnd: 93.9846 }),    // 어비스 보스(2026-11-05 사용자의 새 곡)
    'ascend-trial': Object.freeze({ file: 'ascend-trial.ogg', loopStart: 8.0427, loopEnd: 95.158 }), // 전직시련
    'sky-tower': Object.freeze({ file: 'sky-tower.ogg', loopStart: 18.0053, loopEnd: 87.1198 }),   // 창공
    atlas: Object.freeze({ file: 'atlas.ogg', loopStart: 16.7467, loopEnd: 101.963 })              // 최종 아틀라스(2026-11-05 사용자의 새 곡)
});
/** 지역 종류(zone.type) → 곡. 여기 없는 지역(군락지, 운석 낙하지, 경계 너머 같은)은 액트 곡이다. 혼돈계와 지하 핵은 어비스와 같은 깊은 곳. */
const BGM_ZONE_TRACKS = Object.freeze({
    act: 'act', labyrinth: 'labyrinth', beehive: 'beehive', timeRift: 'time-rift', oceanDepth: 'ocean',
    abyss: 'abyss', chaosRealm: 'abyss', underworld: 'abyss', trial: 'ascend-trial', skyTower: 'sky-tower',
    atlasMap: 'atlas', cosmos: 'atlas', seasonBoss: 'great-boss'
});
/** 보스가 서 있는 동안의 곡. 여기 없는 지역의 보스는 일반 보스 곡. 전직시련은 시련 곡을 그대로 둔다. 액트의 보스는 액트 보스 곡, 어비스와 같은 곡이 나오는 깊은 곳(어비스, 혼돈계, 지하 핵)의 보스는 어비스 보스 곡(2026-11-05), 고대 미궁의 보스는 고대 미궁 보스 곡(2026-11-08). */
const BGM_BOSS_TRACKS = Object.freeze({ act: 'act-boss', abyss: 'abyss-boss', labyrinth: 'labyrinth-boss', chaosRealm: 'abyss-boss', underworld: 'abyss-boss', beehive: 'queen-bee', trial: 'ascend-trial', seasonBoss: 'great-boss' });
safeExposeData({ BGM_TRACKS, BGM_ZONE_TRACKS, BGM_BOSS_TRACKS });
