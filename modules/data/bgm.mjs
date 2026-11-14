// 배경음(2026-11-04 사용자의 리그닌 BGM 13곡, 11-05 액트 보스와 어비스 보스 곡, 11-08 고대 미궁 보스 곡, 11-10 엔드게임 보스 4곡을 더해 20곡,
// js/bgm-ui.js가 튼다). 곡은 assets/audio/bgm/의 Ogg Vorbis(약 90kbps, 85~112초)다. 고대 미궁 보스 곡(181초)과 고대의 달(169초), 규율자(189초),
// 고대의 태양(131초)은 더 길다: 100초 근처에서 자르면 되감길 때 박자나 화음이 어긋나, 이음매가 가장 닮은 자리까지 남겼다.
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
    atlas: Object.freeze({ file: 'atlas.ogg', loopStart: 16.7467, loopEnd: 101.963 }),             // 최종 아틀라스(2026-11-05 사용자의 새 곡)
    'ancient-sun': Object.freeze({ file: 'ancient-sun.ogg', loopStart: 39.7227, loopEnd: 131.0063 }),   // 고대의 태양: 태양의 존재, 벨라-루(2026-11-10)
    'ancient-moon': Object.freeze({ file: 'ancient-moon.ogg', loopStart: 49.7493, loopEnd: 168.6697 }), // 고대의 달: 달의 존재, 아리안로드(2026-11-10)
    observer: Object.freeze({ file: 'observer.ogg', loopStart: 5.1627, loopEnd: 112.0792 }),            // 관측자: 경계의 관측자 베일라(2026-11-10)
    woodsman: Object.freeze({ file: 'woodsman.ogg', loopStart: 22.528, loopEnd: 188.9683 })             // 규율자: 나무꾼과 그 잔상(2026-11-10)
});
/** 지역 종류(zone.type) → 곡. 여기 없는 지역(군락지, 운석 낙하지, 경계 너머 같은)은 액트 곡이다. 혼돈계와 지하 핵은 어비스와 같은 깊은 곳. */
const BGM_ZONE_TRACKS = Object.freeze({
    act: 'act', labyrinth: 'labyrinth', beehive: 'beehive', timeRift: 'time-rift', oceanDepth: 'ocean',
    abyss: 'abyss', chaosRealm: 'abyss', underworld: 'abyss', trial: 'ascend-trial', skyTower: 'sky-tower',
    atlasMap: 'atlas', cosmos: 'atlas', seasonBoss: 'great-boss'
});
/** 보스가 서 있는 동안의 곡. 여기 없는 지역의 보스는 일반 보스 곡. 전직시련은 시련 곡을 그대로 둔다. 액트의 보스는 액트 보스 곡, 어비스와 같은 곡이 나오는 깊은 곳(어비스, 혼돈계, 지하 핵)의 보스는 어비스 보스 곡(2026-11-05), 고대 미궁의 보스는 고대 미궁 보스 곡(2026-11-08). */
const BGM_BOSS_TRACKS = Object.freeze({ act: 'act-boss', abyss: 'abyss-boss', labyrinth: 'labyrinth-boss', chaosRealm: 'abyss-boss', underworld: 'abyss-boss', beehive: 'queen-bee', trial: 'ascend-trial', seasonBoss: 'great-boss' });
/** 엔드게임 보스의 제 곡(2026-11-10 사용자), 보스 그림(monsterVisualId)으로 고른다: 어느 지역이든 그 보스가 서 있으면 이 곡이 위의 두 표보다 먼저다.
 * 그 보스만의 자리(시즌 보스 지역, 혼돈 밖, 나무꾼의 잔상, 아틀라스 투기장의 atlasStages)에서는 들어설 때부터 튼다. */
const BGM_BOSS_VISUAL_TRACKS = Object.freeze({
    pinnacle_underking: 'ancient-sun', cosmos_astra: 'ancient-moon', pinnacle_observer: 'observer', woodsman: 'woodsman', woodsman_echo: 'woodsman'
});
export { BGM_TRACKS, BGM_ZONE_TRACKS, BGM_BOSS_TRACKS, BGM_BOSS_VISUAL_TRACKS };
