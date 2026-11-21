-- ============================================================================
-- 경매장 서버 시세(2026-11-21): 시세 보정과 운영 모드를 담는 표 한 줄(auction_market_pulse)과 읽기 전용 RPC 하나(get_auction_snapshot).
-- ----------------------------------------------------------------------------
-- 적용: Supabase 대시보드 > SQL Editor > New query에 이 파일 전체를 붙여 넣고 Run. 한 묶음이라 중간에 오류가 나면 아무것도 바뀌지 않는다.
--   여러 번 실행해도 안전하다(표와 한 줄은 없을 때만 만들고, 함수는 바꿔 쓴다). 기존 데이터는 지우지 않는다.
--   db/cloud-and-playtest.sql(cloud_saves)과 db/anti-cheat.sql(cheat_holds, cheat_flags)을 실행한 프로젝트에 쓴다.
-- 하는 일: 로그인한 플레이어가 경매장을 열면 게임이 이 RPC를 부른다(modules/application/auction-pulse-service.mjs). 함수는 cloud_saves를
--   읽기만 한다(쓰지 않는다). 최근 24시간 안에 저장했고, 루프(season) 20 이상이고, 가입한 지 7일이 지났고, 운영 보류(cheat_holds)가 없고,
--   14일 안에 치트 기록(cheat_flags)이 없는 계정의 거래 흐름(save_data의 auction.trend: 산 계열과 재료는 +, 출품한 계열과 판 재료는 -,
--   시세 구간마다 반으로 준다)을 열쇠 26개마다 한 계정 한 표로 센다: 0보다 크면 +1, 작으면 -1, 숫자가 아니면 세지 않는다.
--   한 표라도 낸 계정(voters)이 20명보다 적으면 보정이 없다. 20명 이상이면 열쇠마다 round(0.06 x (오름 - 내림) / voters, 2)이고 0이면 뺀다.
--   게임은 이 보정을 그 시세 구간(15분)에만 더하고, 그래도 시세는 0.85~1.15 밖으로 나가지 않는다.
-- 비용: 마지막 계산이 10분보다 오래됐거나 15분 시세 구간이 바뀐 뒤 처음 부른 요청 하나만 다시 센다(다른 요청은 저장된 값을 그대로 읽는다).
--   다시 셀 때 최근 하루 사이 갱신된 cloud_saves 행을 읽는다(updated_at에 인덱스가 없어 표를 한 번 훑는다). 많아야 10분에 한 번이다.
-- 운영 모드: 'hybrid'(기본, 경매장이 장비 전당의 다른 플레이어 장비도 보여 준다) 또는 'pulse_only'(상인 매물과 시세만). 바꿀 때는
--   update public.auction_market_pulse set mode = 'pulse_only' where id = 1;
--   (되돌릴 때는 'hybrid'). 함수는 모드를 바꾸지 않는다. 게임은 경매장을 열 때 다음 요청부터 새 모드를 쓴다.
-- 이 파일을 실행하지 않아도 게임은 그대로 돈다: RPC가 없으면(404) 그 판 동안 묻지 않고, 보정 없이 'hybrid'로 보인다.
-- ============================================================================

begin;

create table if not exists public.auction_market_pulse (
    id          smallint primary key default 1 check (id = 1),
    mode        text not null default 'hybrid' check (mode in ('hybrid', 'pulse_only')),
    bucket      bigint not null default 0,
    voters      integer not null default 0,
    deltas      jsonb not null default '{}'::jsonb,
    computed_at timestamptz not null default to_timestamp(0)
);
insert into public.auction_market_pulse (id) values (1) on conflict (id) do nothing;
alter table public.auction_market_pulse enable row level security;
-- 정책을 두지 않는다. 아래 보안 정의자 함수만 읽고 쓴다(전당 표와 같다).
revoke all on public.auction_market_pulse from anon, authenticated;

-- 경매장 시세 한 장: { serverNow: 서버 시각(UTC ms), bucket: 보정을 센 시세 구간(floor(초 / 900)), mode, voters, deltas: { 열쇠: 보정 } }.
-- 다른 요청이 지금 다시 세고 있으면(줄이 잠겨 있으면) 기다리지 않고 저장된 값을 그대로 돌려준다. 그때 bucket은 저장된 구간이라 지난 구간일 수 있고,
-- 게임은 제 구간과 다른 bucket의 보정을 쓰지 않는다.
create or replace function public.get_auction_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    -- 열쇠 목록은 게임의 auctionHouse.pulseKeys()와 같다(modules/domain/auction-pulse.mjs auctionPulseKeys: modules/data/auction-house.mjs의
    -- families 12개 다음 materials.keys 14개). 게임의 목록이 바뀌면 여기도 고친다.
    pulse_keys constant text[] := array[
        'fire', 'cold', 'light', 'chaos', 'physical', 'critical', 'spell', 'summon', 'projectile', 'attack', 'armor', 'resistance',
        'fossilPrimal', 'fossilAbyssal', 'fossilRift', 'fossilJagged', 'fossilPrismatic', 'oilFire', 'oilCold', 'oilLight',
        'oilChaos', 'catalystCrit', 'catalystSummon', 'emberBranch', 'voidChisel', 'magicBud'];
    now_at constant timestamptz := now();
    bucket_now constant bigint := floor(extract(epoch from now()) / 900)::bigint;
    pulse public.auction_market_pulse%rowtype;
    counted_voters integer;
    counted_deltas jsonb;
begin
    if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

    select * into pulse from public.auction_market_pulse where id = 1;
    if not found then
        -- 손으로 줄을 지운 경우: 기본값으로 다시 놓는다.
        insert into public.auction_market_pulse (id) values (1) on conflict (id) do nothing;
        select * into pulse from public.auction_market_pulse where id = 1;
    end if;

    if pulse.bucket <> bucket_now or pulse.computed_at < now_at - interval '10 minutes' then
        select * into pulse from public.auction_market_pulse where id = 1 for update skip locked;
        if not found then
            -- 다른 요청이 세는 중: 저장된 값을 그대로 돌려준다.
            select * into pulse from public.auction_market_pulse where id = 1;
        else
            with eligible as (
                -- 하루 안의 저장을 먼저 거른다. 숫자가 아닌 값은 case로 막아 형 변환이 실패하지 않는다.
                select cs.user_id, cs.save_data #> '{auction,trend}' as trend
                  from public.cloud_saves cs
                  join auth.users au on au.id = cs.user_id
                 where cs.updated_at >= now_at - interval '24 hours'
                   and (case when jsonb_typeof(cs.save_data -> 'season') = 'number'
                             then (cs.save_data ->> 'season')::numeric end) >= 20
                   and au.created_at < now_at - interval '7 days'
                   and not exists (select 1 from public.cheat_holds ch where ch.user_id = cs.user_id)
                   and not exists (select 1 from public.cheat_flags cf
                                    where cf.user_id = cs.user_id and cf.last_at >= now_at - interval '14 days')
            ), votes as (
                -- 계정 하나, 열쇠 하나에 한 표: JSON 숫자만 세고 그 부호가 표다(0이면 표가 없다).
                select eligible.user_id, pk.key_name,
                       case when jsonb_typeof(eligible.trend) = 'object' and jsonb_typeof(eligible.trend -> pk.key_name) = 'number'
                            then sign((eligible.trend ->> pk.key_name)::numeric)::integer else 0 end as vote
                  from eligible
                 cross join unnest(pulse_keys) as pk(key_name)
            ), counted as (
                select (count(distinct votes.user_id) filter (where votes.vote <> 0))::integer as voters from votes
            ), tallies as (
                select votes.key_name, count(*) filter (where votes.vote > 0) - count(*) filter (where votes.vote < 0) as net
                  from votes
                 group by votes.key_name
            )
            select counted.voters,
                   case when counted.voters < 20 then '{}'::jsonb
                        else coalesce((select jsonb_object_agg(tally.key_name, round(0.06 * tally.net / counted.voters, 2))
                                         from tallies tally
                                        where round(0.06 * tally.net / counted.voters, 2) <> 0), '{}'::jsonb) end
              into counted_voters, counted_deltas
              from counted;

            update public.auction_market_pulse
               set bucket = bucket_now, voters = coalesce(counted_voters, 0), deltas = coalesce(counted_deltas, '{}'::jsonb), computed_at = now_at
             where id = 1
            returning * into pulse;
        end if;
    end if;

    return jsonb_build_object(
        'serverNow', floor(extract(epoch from now_at) * 1000)::bigint,
        'bucket', pulse.bucket,
        'mode', pulse.mode,
        'voters', pulse.voters,
        'deltas', pulse.deltas);
end;
$$;

revoke all on function public.get_auction_snapshot() from public, anon;
grant execute on function public.get_auction_snapshot() to authenticated;

commit;
