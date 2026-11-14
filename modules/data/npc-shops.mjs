export const NPC_SHOPS = Object.freeze({
    haken: Object.freeze({ kind: 'gem', label: '스킬룬', count: 10, firstMeetingClosed: true }),
    orga: Object.freeze({ kind: 'gear', label: '무기', slots: Object.freeze(['무기']), count: 8 }),
    bern: Object.freeze({ kind: 'gear', label: '방어구', slots: Object.freeze(['투구', '갑옷', '장갑', '신발', '방패']), count: 8 }),
    ivel: Object.freeze({ kind: 'gear', label: '장신구', slots: Object.freeze(['반지', '목걸이', '허리띠']), count: 10 }),
    veila: Object.freeze({ kind: 'unique', label: '고유 장비', count: 4 })
});
