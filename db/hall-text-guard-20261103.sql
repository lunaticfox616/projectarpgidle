-- 전당 등록 장비의 글자 검사 (2026-11-03). 이 파일만 Supabase SQL Editor에서 실행하면 된다(다시 실행해도 된다).
--
-- 왜: buy_hall_replica는 전시자의 장비 데이터(item_snapshot)를 그대로 구매자 가방에 복사한다. 검사는 이름 길이, 슬롯, 등급,
-- 추가 옵션의 id, 티어, 값만 봤고, 옵션 줄의 statName이나 baseName 같은 글자 칸은 보지 않았다. 고친 클라이언트가 그 칸에
-- 스크립트 태그를 넣어 전시하면 복제품을 산 사람의 장비 툴팁에서 실행될 수 있었다(클라이언트도 2026-11-03부터 그 칸을
-- 이스케이프한다). 정상 장비의 어떤 글자에도 < 와 > 는 없으므로 장비 데이터 전체에서 그 둘을 거절한다.
--
-- db/hall-watch-20261030.sql의 validate_hall_item을 그 한 줄만 더해 다시 정의한다. 줄 끝의 맨 case ... end는 SQL Editor가
-- 문장을 거기서 끊으므로 같은 줄에 then을 둔다.

create or replace function public.validate_hall_item(item_data jsonb)
returns void language plpgsql stable set search_path = public as $$
declare
    stat_cap integer := case when item_data ->> 'rarity' = 'rare' then 7 else 8 end;   -- 줄 끝의 맨 case ... end는 Supabase SQL Editor가 문장을 거기서 끊는다(2026-10-30)
begin
    if jsonb_typeof(item_data) is distinct from 'object'
       or item_data::text ~ '[<>]'
       or length(coalesce(item_data ->> 'name', '')) not between 1 and 80
       or length(coalesce(nullif(item_data ->> 'baseId', ''), item_data ->> 'baseName', '')) not between 1 and 80
       or coalesce(item_data ->> 'slot', '') not in ('무기','투구','갑옷','장갑','신발','목걸이','반지','허리띠','방패')
       or coalesce(item_data ->> 'rarity', '') not in ('rare','unique')
       or octet_length(item_data::text) > 24000
       or lower(coalesce(item_data ->> 'locked', 'false')) = 'true'
       or lower(coalesce(item_data ->> 'tradeLocked', 'false')) = 'true'
       or lower(coalesce(item_data ->> 'hallReplica', 'false')) = 'true'
       or lower(coalesce(item_data ->> 'hallRelistBlocked', 'false')) = 'true' then
        raise exception 'HALL_ITEM_REJECTED';
    end if;
    if jsonb_typeof(item_data -> 'stats') is distinct from 'array'
       or jsonb_array_length(public.hall_array(item_data -> 'stats')) > stat_cap
       or jsonb_typeof(item_data -> 'baseStats') is distinct from 'array'
       or jsonb_array_length(public.hall_array(item_data -> 'baseStats')) > 8
       or exists (select 1 from (
               select value stat from jsonb_array_elements(public.hall_array(item_data -> 'stats'))
               union all
               select value stat from jsonb_array_elements(public.hall_array(item_data -> 'baseStats'))
           ) item_stats where jsonb_typeof(stat) is distinct from 'object'
              or length(coalesce(stat ->> 'id', '')) not between 1 and 80
              or case when jsonb_typeof(stat -> 'val') = 'number'
                      then abs((stat ->> 'val')::numeric) > 9000000000000 else true end) then
        raise exception 'HALL_ITEM_REJECTED';
    end if;
    if item_data ? 'abyssSockets' and jsonb_typeof(item_data -> 'abyssSockets') not in ('array','null') then
        raise exception 'HALL_ITEM_REJECTED';
    end if;
    if exists (select 1 from jsonb_array_elements(public.hall_array(item_data -> 'abyssSockets')) socket
                where jsonb_typeof(socket -> 'jewel') = 'object') then
        raise exception 'HALL_SOCKET_NOT_EMPTY';
    end if;
    if item_data ->> 'rarity' = 'rare' and (
        exists (select 1 from jsonb_array_elements(public.hall_array(item_data -> 'stats')) stat
                 where case when jsonb_typeof(stat -> 'tier') = 'number'
                     then (stat ->> 'tier')::numeric not between 1 and least(20,
                         public.hall_number(coalesce(item_data -> 'affixTierCap', item_data -> 'hiddenTier'), 1, 1, 20))
                     else true end)
        or exists (select 1 from jsonb_array_elements(public.hall_array(item_data -> 'stats')) stat
                    group by stat ->> 'id' having count(*) > 1)
    ) then raise exception 'HALL_ITEM_REJECTED'; end if;
    if public.hall_affix_table_rejects(item_data) then raise exception 'HALL_ITEM_REJECTED'; end if;
end;
$$;

revoke all on function public.validate_hall_item(jsonb) from public, anon, authenticated;
