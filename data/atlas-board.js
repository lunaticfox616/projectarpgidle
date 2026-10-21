/** 심재의 나이테: Argon 서사, Opus 화면 용어, DeepSeek 경제 검토를 반영한 단일 콘텐츠 정의. */
const ATLAS_BOARD = Object.freeze({
    minLoop: 34, diceCap: 99, maxRisk: 6, maxBoost: 100, lossPct: 15, diceReturnChance: .02,
    promise: Object.freeze({ risk: 2, rewardPct: 25, lossPct: 25 }),
    text: Object.freeze({
        title: '심재의 나이테', dice: '심재 주사위', risk: '심재 위험', boost: '보상 증폭', tier: '다음 지도',
        lapText: n => n ? `나이테 일주 ${n}회` : '첫 원정',
        locked: loop => `루프 ${loop}에 열립니다.`, lockedSub: '스물네 겹의 결을 따라 세계수의 심재를 가르는 원정',
        intro: ["세계수 밑동에 새겨진 스물네 겹의 나이테는 잘려 나간 가지들의 기억과 수액이 응축된 고리입니다.","혼돈 심연과 고등급 아틀라스에서 깎아낸 심재 주사위로 결을 따라 전진하며 보상을 쌓으십시오.","마지막 매듭을 지키는 심재의 문지기를 베어 넘기면 나이테에 모인 모든 재화를 온전히 거둡니다."], discoveries: ["회백색 나이테 틈마다 정원사가 잘라낸 옛 가지들의 수액이 호박처럼 굳어 있다. (심재 관측록)","스물네 번째 고리 안쪽에는 바깥의 도끼날이 남긴 깊고 서늘한 파동이 새겨져 있다. (모루터 비문)","썩은 뿌리에서 길어 올린 진액도 심재의 압력을 견디면 황금빛 결정으로 여문다. (접목사 수기)","나이테의 마지막 옹이는 나무가 제 심장을 지키려 겹겹이 둘러친 가장 단단한 껍질이다. (금서 단편)"],
        boss: Object.freeze({"name":"심재의 문지기","intro":"「스물네 겹 나이테가 맞물리는 끝자락에서 심재의 문지기가 깨어난다.」","half":"「문지기의 거체가 갈라지며 나이테에 응축된 황금 수액이 휘몰아친다.」","defeat":"「마지막 옹이가 갈라지고, 나이테가 품고 있던 보상이 한꺼번에 쏟아진다.」"}),
        tierValue: n => `${n}등급`,
        here: '현재', ahead: n => `${n}칸 앞`, behind: n => `${n}칸 뒤`, reach: n => `+${n}`, backToCurrent: '현재 칸',
        kinds: Object.freeze({ start: '기점', map: '지도', boss: '문지기', boost: '보상 증폭', claim: '수액 갈무리', risk: '거친 결', rest: '정비', choice: '갈림길' }),
        effects: B => ({
            start: '심재 주사위로 길을 열고 문지기까지 보상을 쌓습니다.',
            map: '지도를 정복하면 보관 재화와 보관 장비가 쌓입니다.',
            boss: '마지막 관문입니다. 처치하면 보관 보상을 모두 얻습니다.',
            boost: `다음 지도부터 보상 +20% (최대 +${B.maxBoost}%).`,
            claim: '보관 재화의 30%를 즉시 거둡니다.',
            risk: '위험 +1, 다음 지도부터 보상 +15%. 위험 한계에서는 효과가 없습니다.',
            rest: '위험 -1 (최저 0).',
            choice: '강행 돌파, 정비, 심재 서약 중 하나를 고릅니다.'
        }),
        roll: '주사위 굴리기', rollMeta: '1개 소모, 1~6칸 이동', rollBoss: '문지기 재도전', rollCostOnly: '주사위 1개',
        enter: '지도 진입', reenter: '지도 복귀', bossReward: '처치 시 보관 보상 모두 지급',
        lossWarn: pct => `패배 또는 포기 시 보관 재화 ${pct}% 손실`,
        otherRun: '다른 지도를 먼저 마치세요.', choicePrompt: '결을 따라 길을 고르세요',
        choices: Object.freeze({
            risk: { name: '강행 돌파', effect: '위험 +1, 보상 +15%' },
            rest: { name: '정비', effect: '위험 -1' },
            promise: { name: '심재 서약', effect: '위험 +2, 문지기 처치 시 기본 재화 +25%' }
        }),
        riskFull: '위험 한계', boostFull: '보상 증폭 한계', promiseHeld: '이번 일주 서약 중', promiseShort: '심재 서약',
        bankOath: n => `문지기 처치 시 기본 재화 +${n}%`,
        bankTitle: '보관 보상', bankHint: '문지기 처치 시 모두 지급', bankEmpty: '아직 보관한 보상이 없습니다.', gear: '보관 장비 (희귀 이상)',
        rulesTitle: '원정 규칙과 이야기',
        rules: B => [
            `루프 ${B.minLoop}부터 혼돈 20층 이상 또는 아틀라스 8등급 이상 지도의 길잡이가 심재 주사위를 줍니다.`,
            `원정 내부의 몬스터와 칸에서는 주사위가 나오지 않습니다. 완주한 문지기에게서만 ${B.diceReturnChance * 100}% 확률로 1개를 되찾습니다.`,
            '일반 전리품은 즉시 얻고, 지도 완료 보너스 재화와 장비는 문지기 처치까지 보관합니다. 실패해도 보관 장비는 잃지 않습니다.',
            '보상 증폭은 이후 적립분에만 적용됩니다. 위험 1마다 적 생명력 +12%, 피해 +5%, 지도 등급 +1.',
            `패배 또는 포기하면 지도가 닫히고 보관 재화 ${B.lossPct}%를 잃습니다. 다음 진입에는 다시 주사위가 필요합니다.`,
            `심재 서약은 위험 +${B.promise.risk}. 문지기 처치 시 보관한 기본 재화 +${B.promise.rewardPct}%. 황금률과 장비는 증폭하지 않습니다.`,
            `서약 중 문지기에게 패배하거나 포기하면 손실은 ${B.lossPct + B.promise.lossPct}%. 일반 지도 실패는 ${B.lossPct}%이며 서약은 유지됩니다.`,
            '주사위, 위치, 보관 보상과 서약은 저장과 루프 진행 후에도 남습니다.'
        ],
        messages: Object.freeze({
            clear: '지도를 정복해 보관 보상을 쌓았습니다.',
            complete: n => `나이테 ${n}회 일주 완료. 문지기를 넘어 보관 보상을 모두 거뒀습니다.`,
            fail: pct => `지도가 닫혔습니다. 보관 재화 ${pct}%를 잃었습니다. 다시 굴려 길을 여세요.`,
            promiseTaken: '심재 서약을 새겼습니다. 위험 +2, 문지기 처치 시 기본 재화 +25%.',
            riskCap: '심재 위험이 한계입니다. 위험과 보상 증폭은 더 오르지 않습니다.',
            legacyFailure: '이전에 실패한 지도는 닫혔습니다. 보관 보상은 유지됩니다.',
            diceFound: '심재 주사위 1개를 되찾았습니다.'
        }),
        aria: Object.freeze({
            trail: n => `원정 길 ${n}칸`, panel: '현재 칸과 행동',
            tile: (n, name, kind, here) => `${n}번 칸, ${name}, ${kind}${here ? ', 현재 위치' : ''}`,
            dice: n => `심재 주사위 ${n}개`, lastRoll: n => `마지막 굴림 ${n}`, noRoll: '아직 굴리지 않음'
        })
    }),
    tiles: Object.freeze([
    {
        "name": "나이테 기점",
        "kind": "start",
        "detail": "심재 주사위를 굴려 스물네 겹 나이테를 따라 전진합니다."
    },
    {
        "name": "뿌리굴",
        "kind": "map",
        "node": "roots_4",
        "detail": "회백색 잔뿌리가 얽힌 굴입니다. 정복 시 보관 재화가 쌓입니다."
    },
    {
        "name": "유리 정원",
        "kind": "map",
        "node": "garden_4",
        "detail": "굳은 수액이 유리처럼 빛나는 정원입니다. 정복 시 보상이 쌓입니다."
    },
    {
        "name": "수액 응집터",
        "kind": "boost",
        "detail": "황금 수액이 고인 자리입니다. 다음 지도부터 보상 증폭 +20%."
    },
    {
        "name": "바람길",
        "kind": "map",
        "node": "canopy_4",
        "detail": "마른 황동빛 잎이 스치는 가지입니다. 정복 시 보관 재화가 쌓입니다."
    },
    {
        "name": "수액 저장고",
        "kind": "map",
        "node": "trunk_4",
        "detail": "오래된 수액 독이 묻힌 줄기입니다. 정복 시 보관 재화가 쌓입니다."
    },
    {
        "name": "수액 갈무리",
        "kind": "claim",
        "detail": "현재 쌓인 보관 재화의 30%를 안전한 소지품으로 즉시 거둡니다."
    },
    {
        "name": "잠든 묘소",
        "kind": "map",
        "node": "sanctum_4",
        "detail": "버려진 가지들이 묻힌 성소입니다. 정복 시 보관 재화가 쌓입니다."
    },
    {
        "name": "결의 갈림길",
        "kind": "choice",
        "detail": "나이테가 갈라집니다. 돌파, 정비, 심재 서약 중 하나를 선택합니다."
    },
    {
        "name": "낙엽 회랑",
        "kind": "map",
        "node": "garden_5",
        "detail": "금빛 낙엽이 쌓인 회랑입니다. 정복 시 보관 재화가 쌓입니다."
    },
    {
        "name": "잿빛 가지",
        "kind": "map",
        "node": "canopy_5",
        "detail": "수액이 말라 회백색으로 굳은 가지입니다. 정복 시 보상이 쌓입니다."
    },
    {
        "name": "거친 나이테",
        "kind": "risk",
        "detail": "뒤틀린 결을 쪼갭니다. 위험 +1, 다음 지도부터 보상 증폭 +15%."
    },
    {
        "name": "숨 고르기",
        "kind": "rest",
        "detail": "고른 결 위에서 칼날을 식힙니다. 심재 위험이 1 감소합니다."
    },
    {
        "name": "깊은 뿌리",
        "kind": "map",
        "node": "roots_5",
        "detail": "썩은 밑동 너머의 깊은 뿌리입니다. 정복 시 보관 재화가 쌓입니다."
    },
    {
        "name": "심재의 기로",
        "kind": "choice",
        "detail": "깊은 옹이 앞의 갈림길입니다. 돌파, 정비, 심재 서약 중 택합니다."
    },
    {
        "name": "옹이 요새",
        "kind": "map",
        "node": "trunk_5",
        "detail": "단단히 뭉친 옹이 내부입니다. 정복 시 보관 재화가 쌓입니다."
    },
    {
        "name": "서리 성소",
        "kind": "map",
        "node": "sanctum_5",
        "detail": "차가운 수액이 얼어붙은 성소입니다. 정복 시 보관 재화가 쌓입니다."
    },
    {
        "name": "수액 응집터",
        "kind": "boost",
        "detail": "황금 수액이 고인 자리입니다. 다음 지도부터 보상 증폭 +20%."
    },
    {
        "name": "수액 갈무리",
        "kind": "claim",
        "detail": "현재 쌓인 보관 재화의 30%를 안전한 소지품으로 즉시 거둡니다."
    },
    {
        "name": "검은 수맥",
        "kind": "map",
        "node": "roots_6",
        "detail": "심연과 맞닿은 어두운 수맥입니다. 정복 시 보관 재화가 쌓입니다."
    },
    {
        "name": "금빛 수관",
        "kind": "map",
        "node": "canopy_6",
        "detail": "황동과 금빛 잎이 우거진 수관입니다. 정복 시 보상이 쌓입니다."
    },
    {
        "name": "결의 갈림길",
        "kind": "choice",
        "detail": "관문 직전의 갈림길입니다. 돌파, 정비, 심재 서약 중 선택합니다."
    },
    {
        "name": "마지막 정원",
        "kind": "map",
        "node": "garden_6",
        "detail": "관문 앞에 남겨진 최후의 정원입니다. 정복 시 보상이 쌓입니다."
    },
    {
        "name": "심재의 문지기",
        "kind": "boss",
        "node": "trunk_g",
        "detail": "반드시 멈추는 마지막 관문입니다. 처치 시 보관 재화를 모두 얻습니다."
    }
].map(tile => Object.freeze(tile))),
    baseRewards: Object.freeze({ formlessDew: 4, magicBud: 3, sapBud: 1 })
});
safeExposeData({ ATLAS_BOARD });
