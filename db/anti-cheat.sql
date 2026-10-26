-- ============================================================================
-- 기초 치트 방지(2026-10-21). 게스트 저장을 계정으로 옮기기 전 검사(js/guest-save-check.js)와 짝이다.
-- 오류 문구는 js/player-exchange.js(전당), js/ghost-pvp.js(고스트), 관리자 화면은 js/cloud-tools-ui.js 운영 통계 창(?admin=1)이다.
-- ----------------------------------------------------------------------------
-- 적용: Supabase 대시보드 > SQL Editor > New query에 이 파일 내용을 전부 붙여 넣고 Run.
--   db/cloud-and-playtest.sql, db/operations-and-ghost.sql, db/social.sql, db/equipment-hall.sql을 실행한 프로젝트에 쓴다.
--   여러 번 실행해도 안전하고, 기존 데이터는 지우거나 고치지 않는다. 한 묶음이라 중간에 오류가 나면 아무것도 바뀌지 않는다.
-- 원칙:
--   1. 틀릴 수 없는 검사만 막는다: 전당에 올리는 장비의 수치(게스트 세이브 검사 js/guest-save-check.js와 같은 기준).
--   2. 어림 검사는 막지 않고 기록만 한다: 클라우드 저장의 기기 시계, 나올 수 없는 값, 성장 속도, 고스트 DPS 이상치.
--   3. 관리자가 기록을 보고 직접 보류한 계정만 남과 나누는 곳(전당 등록과 구매, 고스트 순위와 대전)에서 뺀다. 저장은 언제나 받는다.
-- 성능: 검사는 저장(몇 분에 한 번), 전당 등록과 구매, 고스트 등록 때만 돈다. 저장 감시는 세이브에서 네 칸만 꺼내 보고,
--   지난 세이브는 한 번만 읽는다. 감시가 실패해도 저장은 그대로 들어간다.
-- ============================================================================

begin;

-- 날짜는 모두 UTC로 센다((now() at time zone 'utc')::date). current_date는 요청마다 바꿀 수 있는 세션 시간대를 따른다.
-- 기록: 계정, 종류, 날짜마다 한 줄. 같은 날 같은 일은 횟수만 늘고 내용은 마지막 것으로 바뀐다.
create table if not exists public.cheat_flags (
    user_id  uuid not null references auth.users(id) on delete cascade,
    kind     text not null,
    seen_on  date not null default ((now() at time zone 'utc')::date),
    hits     integer not null default 1,
    detail   jsonb not null default '{}'::jsonb,
    first_at timestamptz not null default now(),
    last_at  timestamptz not null default now(),
    primary key (user_id, kind, seen_on)
);
create index if not exists cheat_flags_last_at_idx on public.cheat_flags (last_at desc);
-- 종류 목록은 다시 실행할 때마다 새로 건다(create table if not exists는 예전 제약을 그대로 둔다).
alter table public.cheat_flags drop constraint if exists cheat_flags_kind_check;
alter table public.cheat_flags add constraint cheat_flags_kind_check check (kind in ('clock', 'currency', 'level', 'ghost_dps', 'ghost_ehp'));

-- 관리자가 건 보류: 이 계정은 전당에 올리거나 살 수 없고, 고스트는 순위와 대전에서 빠지며 다시 등록할 수 없다.
create table if not exists public.cheat_holds (
    user_id    uuid primary key references auth.users(id) on delete cascade,
    note       text not null default '',
    created_at timestamptz not null default now()
);

-- 성장 관찰: 계정과 날짜(UTC)마다 저장 사이의 증가량을 더한다. 상한을 정하기 전에 실제 플레이의 수치를 모은다.
-- hours는 저장 사이 시간(서버 시각)의 합, *_gain은 그동안 늘어난 양의 합(화폐는 모든 종류를 더한 개수)이다.
-- max_currency_per_hour는 저장 한 번 사이에 한 종류가 가장 빨리 늘어난 속도다(간격이 5분보다 짧으면 5분으로 친다).
create table if not exists public.cloud_save_rates (
    user_id               uuid not null references auth.users(id) on delete cascade,
    seen_on               date not null default ((now() at time zone 'utc')::date),
    samples               integer not null default 0,
    hours                 numeric not null default 0,
    level_gain            numeric not null default 0,
    season_gain           numeric not null default 0,
    currency_gain         numeric not null default 0,
    max_currency_per_hour numeric not null default 0,
    max_currency_key      text,
    primary key (user_id, seen_on)
);

alter table public.cheat_flags enable row level security;
alter table public.cheat_holds enable row level security;
alter table public.cloud_save_rates enable row level security;
-- 정책을 두지 않는다. 아래 보안 정의자 함수만 쓰고 읽는다.
revoke all on public.cheat_flags, public.cheat_holds, public.cloud_save_rates from anon, authenticated;

-- JSON 값이 숫자면 그 값, 아니면 0(글자나 빈 값이 들어 있어도 검사가 멈추지 않는다).
create or replace function public.cheat_number(value_data jsonb)
returns numeric language sql immutable set search_path = public as $$
    select case when jsonb_typeof(value_data) = 'number' then (value_data #>> '{}')::numeric else 0 end;
$$;

-- 세이브에서 감시가 보는 네 칸만 꺼낸다. 큰 세이브는 칸을 읽을 때마다 다시 풀리므로 한 번에 꺼내 작은 묶음으로 쓴다.
create or replace function public.cheat_save_digest(save_data jsonb)
returns jsonb language sql immutable set search_path = public as $$
    select jsonb_build_object('saveMeta', picked."saveMeta", 'currencies', picked.currencies, 'level', picked.level, 'season', picked.season)
      from jsonb_to_record(save_data) as picked("saveMeta" jsonb, currencies jsonb, level jsonb, season jsonb);
$$;

create or replace function public.note_cheat_flag(p_user_id uuid, p_kind text, p_detail jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
    insert into public.cheat_flags as flag (user_id, kind, detail) values (p_user_id, p_kind, coalesce(p_detail, '{}'::jsonb))
    on conflict (user_id, kind, seen_on) do update
       set hits = flag.hits + 1, detail = excluded.detail, last_at = now();
end;
$$;

create or replace function public.cheat_account_held(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (select 1 from public.cheat_holds hold where hold.user_id = p_user_id);
$$;

-- ---------------------------------------------------------------------------
-- 1) 전당: 나올 수 없는 수치의 장비와 보류한 계정을 막는다
-- ---------------------------------------------------------------------------
-- 장비 한 줄이 게임에서 나올 수 없는 수치인가(js/guest-save-check.js statProblem, data/constants.js GUEST_SAVE_CHECK와 같다):
-- 값이 천만을 넘거나, 티어가 20을 넘거나, 그 줄의 굴림 범위 최댓값보다 범위 크기 + 1만큼 넘게 크다(최댓값의 2배쯤).
-- 뛰어난 기반(1.2배), 오염(1.15배), 잉걸불(0.8~1.2배)을 겹쳐도 이 여유 안에 든다. 굴림 범위가 없는 줄은 앞의 두 기준만 본다.
-- 보는 줄은 게임이 능력치에 더하는 줄 모두다(js/equipment-stat-resolution.js): 추가 옵션과 그 둘째 수치(extraStats), 베이스 옵션,
-- 잿불 줄(emberLines), 하급 부여(underEnchant), 혼돈 주입(chaosInfusion), 고른 잠식 줄(encroached.chosen). 없는 칸은 null이라 빠진다.
create or replace function public.hall_item_out_of_range(item_data jsonb)
returns boolean language sql immutable set search_path = public as $$
    select exists (
        select 1
          from jsonb_array_elements(public.hall_array(item_data -> 'stats') || public.hall_array(item_data -> 'baseStats')
                   || public.hall_array(item_data -> 'emberLines') || jsonb_path_query_array(item_data, '$.stats[*].extraStats[*]')
                   || jsonb_build_array(item_data -> 'underEnchant', item_data -> 'chaosInfusion', item_data #> '{encroached,chosen}')) line
         cross join lateral (
               select public.cheat_number(line -> 'val') as val,
                      coalesce(nullif(line -> 'valMin', 'null'::jsonb), line -> 'baseRollMin') as low_data,
                      coalesce(nullif(line -> 'valMax', 'null'::jsonb), line -> 'baseRollMax') as high_data) roll
         where jsonb_typeof(line -> 'val') = 'number'
           and (abs(roll.val) > 10000000
                or public.cheat_number(line -> 'tier') > 20
                or (jsonb_typeof(roll.low_data) = 'number' and jsonb_typeof(roll.high_data) = 'number'
                    and roll.val > greatest(public.cheat_number(roll.low_data), public.cheat_number(roll.high_data))
                                 + greatest(abs(public.cheat_number(roll.low_data)), abs(public.cheat_number(roll.high_data)), 1) + 1))
    );
$$;

-- 고유 효과의 값(uniqueEffectParams)과 품질: 클라이언트가 상한 없이 곱하는 칸이라 서버가 크기를 본다(2026-10-27).
-- 배율(mul, explicitStatMultiplier)과 젬 레벨 보너스(level)는 10까지, 그 밖의 숫자 값은 100000까지(데이터의 가장 큰 값은 sleepMs 10000),
-- 품질은 30까지(한계 돌파와 타락의 상한).
create or replace function public.hall_item_params_out_of_range(item_data jsonb)
returns boolean language sql immutable set search_path = public as $$
    select public.cheat_number(item_data -> 'quality') > 30
        or (jsonb_typeof(item_data -> 'uniqueEffectParams') = 'object' and exists (
            select 1 from jsonb_each(item_data -> 'uniqueEffectParams') param
             where jsonb_typeof(param.value) = 'number'
               and (abs(public.cheat_number(param.value)) > 100000
                    or (param.key in ('mul', 'explicitStatMultiplier', 'level') and public.cheat_number(param.value) > 10))));
$$;

-- create_hall_listing이 전시를 넣을 때 돈다. 오류가 나면 등록 전체가 되돌아가 장비는 가방에 그대로 남는다.
create or replace function public.guard_hall_listing()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if public.cheat_account_held(new.curator_id) then raise exception 'HALL_ACCOUNT_HELD'; end if;
    if public.hall_item_out_of_range(new.item_snapshot) then raise exception 'HALL_ITEM_OUT_OF_RANGE'; end if;
    if public.hall_item_params_out_of_range(new.item_snapshot) then raise exception 'HALL_ITEM_OUT_OF_RANGE'; end if;
    return new;
end;
$$;

drop trigger if exists trg_guard_hall_listing on public.hall_listings;
create trigger trg_guard_hall_listing before insert on public.hall_listings
    for each row execute function public.guard_hall_listing();

-- buy_hall_replica가 구매를 적을 때 돈다. 보류한 계정이 만든 재화로 남의 명예를 올리지 못하게 한다.
create or replace function public.guard_hall_purchase()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if public.cheat_account_held(new.buyer_id) then raise exception 'HALL_ACCOUNT_HELD'; end if;
    return new;
end;
$$;

drop trigger if exists trg_guard_hall_purchase on public.hall_purchases;
create trigger trg_guard_hall_purchase before insert on public.hall_purchases
    for each row execute function public.guard_hall_purchase();

-- ---------------------------------------------------------------------------
-- 2) 고스트: 보류한 계정은 순위와 대전에서 빼고, DPS 이상치는 기록만 한다
-- ---------------------------------------------------------------------------
-- register_my_ghost는 등록할 때마다 active를 켠다. 보류한 계정이면 등록을 거절한다(대전 결과로 점수만 바뀔 때는 돌지 않는다).
-- 보류를 걸 때 active를 끄는 갱신은 그대로 들어간다.
-- 수치 상한(2026-10-27): 게임에서 나올 수 없는 크기는 막는다. 문서와 측정에 남은 가장 큰 DPS가 천만 자리라 DPS와 EHP는 100억,
-- 생명력과 보호막은 10억까지 받는다(틀릴 수 없는 검사만 막는다는 원칙). 그 아래의 이상치는 watch_ghost_dps가 기록만 한다.
create or replace function public.guard_ghost_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if new.active and public.cheat_account_held(new.user_id) then raise exception 'GHOST_ACCOUNT_HELD'; end if;
    -- 등록(active를 켜는 쓰기)에만 건다. 보류가 active를 끄는 갱신은 값이 커도 들어가야 한다(검토 지적 2026-10-27).
    if new.active and (new.dps > 10000000000
       or public.cheat_number(new.combat_snapshot -> 'maxHp') > 1000000000
       or public.cheat_number(new.combat_snapshot -> 'energyShield') > 1000000000
       or exists (select 1 from jsonb_each(new.ehp_by_element) element where public.cheat_number(element.value) > 10000000000)) then
        raise exception 'GHOST_SNAPSHOT_IMPLAUSIBLE';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_guard_ghost_profile on public.ghost_profiles;
create trigger trg_guard_ghost_profile before insert or update of active on public.ghost_profiles
    for each row execute function public.guard_ghost_profile();

-- 원소별 EHP 가운데 가장 작은 값(감시와 기록이 보는 한 수).
create or replace function public.ghost_min_ehp(ehp_data jsonb)
returns numeric language sql immutable set search_path = public as $$
    select coalesce(min(public.cheat_number(element.value)), 0) from jsonb_each(coalesce(ehp_data, '{}'::jsonb)) element;
$$;

-- 같은 전투 판에서 DPS 상위 20명(자기 빼고)의 가운데 값보다 10배 넘게 크면 기록한다. 20명이 안 되면 보지 않는다.
-- EHP(원소별 가장 작은 값)도 같은 규칙으로 기록한다(2026-10-27). 7일 안의 기록은 순위전 점수를 멈춘다(ghost_under_review).
-- 실제로 들어간 등록에만 한 번 돈다(AFTER). 기록이 실패해도 등록은 막지 않는다. 잠금을 2초 넘게 기다리면 그 오류도 잡히도록
-- lock_timeout을 둔다(요청 시간 제한으로 끊기면 예외 블록이 잡지 못해 등록까지 실패한다).
create or replace function public.watch_ghost_dps()
returns trigger language plpgsql security definer set search_path = public set lock_timeout = '2s' as $$
declare
    peers integer;
    top_median numeric;
    ehp_peers integer;
    ehp_median numeric;
    new_ehp numeric := public.ghost_min_ehp(new.ehp_by_element);
begin
    if tg_op = 'UPDATE' and new.dps is not distinct from old.dps and new.ehp_by_element is not distinct from old.ehp_by_element then
        return null;
    end if;
    begin
        select count(*), percentile_cont(0.5) within group (order by top.dps)
          into peers, top_median
          from (select profile.dps from public.ghost_profiles profile
                 where profile.combat_version = new.combat_version and profile.user_id <> new.user_id and profile.active
                 order by profile.dps desc limit 20) top;
        if peers >= 20 and top_median > 0 and new.dps > top_median * 10 then
            perform public.note_cheat_flag(new.user_id, 'ghost_dps',
                jsonb_build_object('dps', new.dps, 'topMedian', round(top_median), 'combatVersion', new.combat_version));
        end if;
        select count(*), percentile_cont(0.5) within group (order by top.ehp)
          into ehp_peers, ehp_median
          from (select public.ghost_min_ehp(profile.ehp_by_element) as ehp from public.ghost_profiles profile
                 where profile.combat_version = new.combat_version and profile.user_id <> new.user_id and profile.active
                 order by public.ghost_min_ehp(profile.ehp_by_element) desc limit 20) top;
        if ehp_peers >= 20 and ehp_median > 0 and new_ehp > ehp_median * 10 then
            perform public.note_cheat_flag(new.user_id, 'ghost_ehp',
                jsonb_build_object('ehp', round(new_ehp), 'topMedian', round(ehp_median), 'combatVersion', new.combat_version));
        end if;
    exception when others then
        raise warning 'watch_ghost_dps: %', sqlerrm;
    end;
    return null;
end;
$$;

drop trigger if exists trg_watch_ghost_dps on public.ghost_profiles;
create trigger trg_watch_ghost_dps after insert or update of dps, ehp_by_element on public.ghost_profiles
    for each row execute function public.watch_ghost_dps();

-- ---------------------------------------------------------------------------
-- 3) 클라우드 저장 감시: 막지 않고 기록만 한다
-- ---------------------------------------------------------------------------
-- 기기 시계: 세이브가 본 가장 늦은 시각(saveMeta.maxSeenAt, lastModifiedAt)이 서버 시각보다 10분 넘게 앞선다.
-- 나올 수 없는 값: 화폐가 천만을 넘거나 음수다(GUEST_SAVE_CHECK.currencyMax). 레벨이 200을 넘는다(MAX_PLAYER_LEVEL).
create or replace function public.watch_cloud_save_values(p_user_id uuid, p_digest jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
    seen_ms numeric := greatest(public.cheat_number(p_digest #> '{saveMeta,maxSeenAt}'), public.cheat_number(p_digest #> '{saveMeta,lastModifiedAt}'));
    now_ms numeric := extract(epoch from now()) * 1000;
    wallet jsonb := case when jsonb_typeof(p_digest -> 'currencies') = 'object' then p_digest -> 'currencies' else '{}'::jsonb end;
    level_value numeric := public.cheat_number(p_digest -> 'level');
    top_key text;
    top_value numeric;
    low_value numeric;
begin
    if seen_ms > now_ms + 600000 then
        perform public.note_cheat_flag(p_user_id, 'clock', jsonb_build_object('aheadMinutes', round((seen_ms - now_ms) / 60000)));
    end if;
    select entry.key, public.cheat_number(entry.value) into top_key, top_value
      from jsonb_each(wallet) entry order by public.cheat_number(entry.value) desc limit 1;
    select min(public.cheat_number(entry.value)) into low_value from jsonb_each(wallet) entry;
    if coalesce(top_value, 0) > 10000000 or coalesce(low_value, 0) < 0 then
        perform public.note_cheat_flag(p_user_id, 'currency', jsonb_build_object('key', top_key, 'value', top_value, 'lowest', low_value));
    end if;
    if level_value > 200 then
        perform public.note_cheat_flag(p_user_id, 'level', jsonb_build_object('level', level_value));
    end if;
end;
$$;

-- 성장: 지난 저장과 비교해 늘어난 레벨, 루프, 화폐를 cloud_save_rates에 더한다. 시간은 서버가 적은 지난 저장 시각부터 잰다.
-- 레벨은 같은 루프 안에서만 센다(루프가 바뀌면 레벨이 처음으로 돌아간다). 줄어든 값은 0으로 친다.
create or replace function public.watch_cloud_save_rates(p_user_id uuid, p_old jsonb, p_new jsonb, p_elapsed interval)
returns void language plpgsql security definer set search_path = public as $$
declare
    span_hours numeric := greatest(extract(epoch from p_elapsed), 0) / 3600.0;
    old_season numeric := public.cheat_number(p_old -> 'season');
    new_season numeric := public.cheat_number(p_new -> 'season');
    level_step numeric := 0;
    wallet_step numeric;
    burst_key text;
    burst_step numeric;
begin
    if new_season = old_season then
        level_step := greatest(public.cheat_number(p_new -> 'level') - public.cheat_number(p_old -> 'level'), 0);
    end if;
    with steps as (
        select fresh.key, public.cheat_number(fresh.value) - public.cheat_number(p_old #> array['currencies', fresh.key]) as step
          from jsonb_each(case when jsonb_typeof(p_new -> 'currencies') = 'object' then p_new -> 'currencies' else '{}'::jsonb end) fresh
    )
    select coalesce(sum(greatest(steps.step, 0)), 0),
           (select top.key from steps top where top.step > 0 order by top.step desc limit 1),
           greatest(coalesce(max(steps.step), 0), 0)
      into wallet_step, burst_key, burst_step
      from steps;
    insert into public.cloud_save_rates as rate
        (user_id, samples, hours, level_gain, season_gain, currency_gain, max_currency_per_hour, max_currency_key)
    values (p_user_id, 1, span_hours, level_step, greatest(new_season - old_season, 0), wallet_step,
            burst_step / greatest(span_hours, 300 / 3600.0), burst_key)
    on conflict (user_id, seen_on) do update set
        samples = rate.samples + 1,
        hours = rate.hours + excluded.hours,
        level_gain = rate.level_gain + excluded.level_gain,
        season_gain = rate.season_gain + excluded.season_gain,
        currency_gain = rate.currency_gain + excluded.currency_gain,
        max_currency_key = case when excluded.max_currency_per_hour > rate.max_currency_per_hour
                                then excluded.max_currency_key else rate.max_currency_key end,
        max_currency_per_hour = greatest(rate.max_currency_per_hour, excluded.max_currency_per_hour);
end;
$$;

-- 계정의 그날 첫 저장에서 그 계정의 오래된 줄(성장 30일, 기록 90일)을 지운다. 관리자가 감시 창을 열지 않아도
-- 표가 계정마다 30줄 안팎에 머물러 무료 DB(500MB)를 갉아먹지 않는다. 그 밖의 저장은 기본 키 한 번만 본다.
create or replace function public.prune_cheat_watch(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
    if exists (select 1 from public.cloud_save_rates where user_id = p_user_id and seen_on = (now() at time zone 'utc')::date) then return; end if;
    delete from public.cloud_save_rates where user_id = p_user_id and seen_on < (now() at time zone 'utc')::date - 30;
    delete from public.cheat_flags where user_id = p_user_id and seen_on < (now() at time zone 'utc')::date - 90;
end;
$$;

-- 저장이 들어가기 직전(BEFORE)에 돈다. 새 세이브는 아직 메모리에 있어 값싸게 읽고, 지난 세이브는 한 번만 읽는다.
-- commit_cloud_save와 전당 함수가 save_data를 바꿀 때만 돌고, 무엇이 실패해도 저장은 그대로 들어간다. 값 검사와 성장 기록은 따로
-- 감싼다(지난 세이브가 객체가 아니라 성장 쪽이 실패해도 시계, 화폐, 레벨 기록은 남는다). lock_timeout은 watch_ghost_dps와 같은 까닭이다.
create or replace function public.watch_cloud_save()
returns trigger language plpgsql security definer set search_path = public set lock_timeout = '2s' as $$
declare
    fresh jsonb;
begin
    begin
        fresh := public.cheat_save_digest(new.save_data);
        perform public.watch_cloud_save_values(new.user_id, fresh);
    exception when others then
        raise warning 'watch_cloud_save values: %', sqlerrm;
    end;
    if tg_op = 'UPDATE' and fresh is not null then
        begin
            perform public.prune_cheat_watch(new.user_id);
            perform public.watch_cloud_save_rates(new.user_id, public.cheat_save_digest(old.save_data), fresh, now() - old.updated_at);
        exception when others then
            raise warning 'watch_cloud_save rates: %', sqlerrm;
        end;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_watch_cloud_save on public.cloud_saves;
create trigger trg_watch_cloud_save before insert or update of save_data on public.cloud_saves
    for each row execute function public.watch_cloud_save();

-- ---------------------------------------------------------------------------
-- 4) 관리자: 기록 보기와 보류(js/cloud-tools-ui.js 운영 통계 창의 치트 감시)
-- ---------------------------------------------------------------------------
create or replace function public.admin_get_cheat_watch()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
    if not public.is_project_admin() then raise exception 'ADMIN_REQUIRED'; end if;
    -- 그만둔 계정의 오래된 줄은 저장이 없어 prune_cheat_watch가 지우지 못하므로 관리자가 열 때 한꺼번에 지운다.
    delete from public.cloud_save_rates where seen_on < (now() at time zone 'utc')::date - 30;
    delete from public.cheat_flags where seen_on < (now() at time zone 'utc')::date - 90;
    return jsonb_build_object(
        'flags', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.last_at desc) from (
            select flag.user_id, profile.nickname, flag.kind, flag.seen_on, flag.hits, flag.detail, flag.last_at,
                   public.cheat_account_held(flag.user_id) as held
              from public.cheat_flags flag
              left join public.player_profiles profile on profile.user_id = flag.user_id
             order by flag.last_at desc limit 100) row_data), '[]'::jsonb),
        'rates', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.currency_per_hour desc) from (
            select rate.user_id, profile.nickname, rate.seen_on, rate.samples, round(rate.hours, 1) as hours,
                   round(rate.currency_gain / greatest(rate.hours, 1)) as currency_per_hour,
                   round(rate.max_currency_per_hour) as max_currency_per_hour, rate.max_currency_key,
                   round(rate.level_gain / greatest(rate.hours, 1), 1) as level_per_hour,
                   round(rate.season_gain / greatest(rate.hours, 1), 2) as season_per_hour,
                   public.cheat_account_held(rate.user_id) as held
              from public.cloud_save_rates rate
              left join public.player_profiles profile on profile.user_id = rate.user_id
             where rate.seen_on >= (now() at time zone 'utc')::date - 7
             order by rate.currency_gain / greatest(rate.hours, 1) desc limit 30) row_data), '[]'::jsonb),
        'holds', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.created_at desc) from (
            select hold.user_id, profile.nickname, hold.note, hold.created_at
              from public.cheat_holds hold
              left join public.player_profiles profile on profile.user_id = hold.user_id
             order by hold.created_at desc) row_data), '[]'::jsonb)
    );
end;
$$;

-- 보류를 걸면 고스트는 순위와 대전에서 빠지고, 전당에 열려 있던 전시는 더 팔리지 않게 닫는다(주인은 내리기로 장비를 돌려받는다).
-- 보류를 풀면 다음 고스트 등록부터 다시 순위에 들고, 닫은 전시는 닫힌 채로 둔다.
create or replace function public.admin_set_cheat_hold(p_user_id uuid, p_hold boolean, p_note text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
begin
    if not public.is_project_admin() then raise exception 'ADMIN_REQUIRED'; end if;
    if p_user_id is null or p_hold is null then raise exception 'INVALID_REQUEST'; end if;
    if p_hold then
        insert into public.cheat_holds (user_id, note) values (p_user_id, left(coalesce(p_note, ''), 200))
        on conflict (user_id) do update set note = excluded.note;
        update public.ghost_profiles set active = false where user_id = p_user_id and active;
        update public.hall_listings set status = 'sold_out', retired_at = now() where curator_id = p_user_id and status = 'open';
    else
        delete from public.cheat_holds where user_id = p_user_id;
    end if;
    return jsonb_build_object('userId', p_user_id, 'held', p_hold);
end;
$$;

-- 안쪽 함수는 RPC로 부르지 못하게 한다(남의 기록을 쓰거나 검사를 미리 떠보지 못하게).
revoke all on function public.cheat_number(jsonb) from public, anon, authenticated;
revoke all on function public.cheat_save_digest(jsonb) from public, anon, authenticated;
revoke all on function public.note_cheat_flag(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.cheat_account_held(uuid) from public, anon, authenticated;
revoke all on function public.hall_item_out_of_range(jsonb) from public, anon, authenticated;
revoke all on function public.hall_item_params_out_of_range(jsonb) from public, anon, authenticated;
revoke all on function public.guard_hall_listing() from public, anon, authenticated;
revoke all on function public.guard_hall_purchase() from public, anon, authenticated;
revoke all on function public.guard_ghost_profile() from public, anon, authenticated;
revoke all on function public.watch_ghost_dps() from public, anon, authenticated;
revoke all on function public.watch_cloud_save_values(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.watch_cloud_save_rates(uuid, jsonb, jsonb, interval) from public, anon, authenticated;
revoke all on function public.prune_cheat_watch(uuid) from public, anon, authenticated;
revoke all on function public.watch_cloud_save() from public, anon, authenticated;
revoke all on function public.admin_get_cheat_watch() from public, anon;
revoke all on function public.admin_set_cheat_hold(uuid, boolean, text) from public, anon;
grant execute on function public.admin_get_cheat_watch() to authenticated;
grant execute on function public.admin_set_cheat_hold(uuid, boolean, text) to authenticated;

-- 관리자: 한 계정의 감시 기록을 지운다(종류를 주면 그 종류만). 순위전의 검토 중 상태(ghost_under_review)도 함께 풀린다.
create or replace function public.admin_clear_cheat_flags(p_user_id uuid, p_kind text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare removed integer;
begin
    if not public.is_project_admin() then raise exception 'ADMIN_REQUIRED'; end if;
    if p_user_id is null then raise exception 'INVALID_REQUEST'; end if;
    delete from public.cheat_flags where user_id = p_user_id and (p_kind is null or kind = p_kind);
    get diagnostics removed = row_count;
    return jsonb_build_object('userId', p_user_id, 'removed', removed);
end;
$$;

revoke all on function public.ghost_min_ehp(jsonb) from public, anon, authenticated;
revoke all on function public.admin_clear_cheat_flags(uuid, text) from public, anon;
grant execute on function public.admin_clear_cheat_flags(uuid, text) to authenticated;

commit;
