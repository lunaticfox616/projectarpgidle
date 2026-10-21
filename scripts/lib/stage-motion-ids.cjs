/* 리그닌 모션 공방과 스킬룬 전달본의 한글 이름 → 게임의 id (scripts/import-stage-characters.cjs, scripts/build-stage-skill-vfx.cjs).
 * 무기는 2026-10-20 새 그림의 일곱(맨손, 대검, 한손검, 활, 오브, 플라스크, 향로). 모션 이름은 시트 파일 이름(JSON file)이다. */
'use strict';

const CLASS_IDS = Object.freeze({ 방랑자: 'wanderer', 전사: 'warrior', 궁수: 'archer', 비술사: 'occultist', 연금술사: 'alchemist', 성직자: 'cleric' });
const STANCE_IDS = Object.freeze({ 맨손: 'unarmed', 대검: 'greatsword', 한손검: 'sword', 활: 'bow', 오브: 'orb', 플라스크: 'flask', 향로: 'censer' });
/** 광창은 무기를 하늘로 치켜드는 동작, 이동은 무기마다의 이동 동작(한손검 박차고 나가기, 활 줄 당기기, 오브 차원 걸음, 향로 뒤로 뛰기). */
const MOTION_IDS = Object.freeze({
    대기: 'idle', 걷기: 'walk', 사망: 'death', 공격: 'attack', 강타: 'slam', 연타: 'flurry', 찌르기: 'thrust', 큰베기: 'cleave', 회전: 'spin',
    광창: 'raise', 함성: 'shout', 올려베기: 'upper', 돌진: 'charge', 도약: 'leap', 공중제비: 'flip', 시전: 'cast', 시전2: 'cast2', 투척: 'throw',
    이동: 'move', 연타사격: 'volley', 전용공격: 'special', 전용공격2: 'special2'
});

/** 이름표에 없는 이름은 멈춘다: 새 직업, 무기, 모션은 여기에 id를 먼저 넣는다. */
function idOf(table, name, what) {
    if (!Object.prototype.hasOwnProperty.call(table, name)) throw new Error(`모르는 ${what}: ${name}`);
    return table[name];
}

module.exports = { CLASS_IDS, STANCE_IDS, MOTION_IDS, idOf };
