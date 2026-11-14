export function getPlayerExchangeError(error) {
    let raw = String(error && error.message || error || '알 수 없는 오류');
    if (/PGRST202|function[^\n]*get_player_hall[^\n]*does not exist|relation[^\n]*hall_listings[^\n]*does not exist/i.test(raw)) {
        return '장비 전당 서버를 준비 중입니다. 잠시 후 다시 열어주세요.';
    }
    let messages = {
        AUTH_REQUIRED: '클라우드 로그인이 필요합니다.', CLOUD_SAVE_NOT_FOUND: '먼저 클라우드 저장을 완료해주세요.',
        CLOUD_REVISION_CONFLICT: '다른 기기에서 저장이 변경되었습니다. 클라우드 저장을 다시 불러와주세요.',
        HALL_LISTING_LIMIT: '전당에는 동시에 장비를 3개까지만 전시할 수 있습니다.',
        HALL_RATE_LIMIT: '요청이 너무 빠릅니다. 잠시 후 다시 시도해주세요.', HALL_LISTING_DAILY_LIMIT: '오늘의 전당 등록 한도에 도달했습니다.',
        HALL_DAILY_LIMIT: '오늘의 전당 구매 한도에 도달했습니다.',
        HALL_ITEM_NOT_FOUND: '서버 저장에서 장비를 찾지 못했습니다.', HALL_ITEM_REJECTED: '전당 등록 규칙에 맞지 않는 장비입니다.',
        HALL_ITEM_NAME_REJECTED: '장비 이름에 비속어가 있어 전당에 올릴 수 없습니다.',
        HALL_ITEM_KEY_CONFLICT: '같은 서버 식별자를 가진 장비가 둘 이상 발견되어 등록을 중단했습니다.',
        HALL_RELIST_BLOCKED: '한 번이라도 복제된 원본은 전당에 다시 등록할 수 없습니다.',
        HALL_SOCKET_NOT_EMPTY: '소켓에 주얼을 끼운 장비는 전당에 등록할 수 없습니다.', HALL_ITEM_OWNERSHIP: '장비의 서버 소유권을 확인할 수 없습니다.',
        HALL_LISTING_NOT_ACTIVE: '전시가 종료되었거나 회수된 장비입니다.', HALL_SELF_PURCHASE: '자신이 전시한 장비는 구매할 수 없습니다.',
        HALL_ALREADY_COLLECTED: '같은 전시품은 계정당 한 번만 구매할 수 있습니다.', HALL_CURRENCY_SHORTAGE: '황금률이 부족합니다.',
        HALL_INVENTORY_FULL: '가방에 빈칸이 부족합니다. 가방을 정리한 뒤 다시 시도해 주세요.',
        HALL_ITEM_OUT_OF_RANGE: '게임에서 나올 수 없는 수치가 있는 장비는 전당에 등록할 수 없습니다.',
        HALL_ACCOUNT_HELD: '운영 검토 중인 계정이라 전당에 등록하거나 살 수 없습니다.',
        HALL_ACCOUNT_CHANGED: '작업 중에 로그인 계정이 바뀌어 이 기기에는 반영하지 않았습니다. 클라우드 저장을 다시 불러와 주세요.',
        HALL_SESSION_CHANGED: '작업 중에 로그인 계정이나 게임 상태가 바뀌어 전당에 보내지 않았습니다. 다시 시도해 주세요.',
        HALL_RESULT_UNKNOWN: '전당 서버의 응답을 받지 못해 거래 결과를 확인할 수 없습니다. 같은 거래를 다시 하지 말고 클라우드 저장을 다시 불러와 확인해 주세요.'
    };
    let code = Object.keys(messages).find(key => raw.includes(key));
    return code ? messages[code] : raw;
}
