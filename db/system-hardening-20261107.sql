-- 2026-11-07 시스템 감사 수정. 기존 프로젝트에 한 번 실행하는 원자적/재실행 가능한 묶음.
-- 선행 설치: cloud-and-playtest, operations-and-ghost, social, equipment-hall, anti-cheat,
-- hall-watch-20261030, hall-affix/base 표, item-save-slim-20261030까지 설치된 현재 서버.
-- 기존 저장/전시/구매/채팅은 삭제하지 않는다. 운영 DB에는 자동 적용하지 않는다.
-- 바뀌는 계약:
-- * 전당 거래 전의 저장 복구는 CLOUD_SAVE_HALL_HISTORY_CONFLICT로 거절(현재 저장 유지).
-- * 복제품 재등록은 원장 source_listing_id로 차단. 같은 tradeKey 원본 회수는 한 개로 수렴.
-- * 모든 소켓의 주얼·수확물이 든 장비는 전시를 거절해 중첩물 복제를 막는다(빈 소켓은 허용).
-- * 기존 전시 구매에도 소켓 검사를 적용하고, 계정별 구매/신고 한도 검사는 잠금 뒤에 수행한다.
-- * 수치 필드는 실제 JSON number만, 비수치 고유 효과 값은 알려진 타입/enum만 허용.
-- * 전송 제한은 메시지 삭제와 독립인 비공개 계정 행에 기록하고 동시 요청을 직렬화.
-- * 공유 첨부의 코어/부적/주얼/구형/일반 장비 배열은 송신 snapshot 상한과 타입을 검사.
--   소켓 총개수는 제한하지 않아 이전 수확물 보존 소켓을 유지하며, 소켓 안 주얼의 옵션만 8줄로 검사.
-- 신규 rate state는 배포 후 첫 전송부터 누적하며, 기존 채팅은 보존한다.
begin;

create table if not exists public.chat_send_state (
    user_id uuid primary key references auth.users(id) on delete cascade,
    last_sent_at timestamptz,
    sent_at timestamptz[] not null default '{}',
    recent_plain jsonb not null default '[]'::jsonb,
    last_plain_hash text,
    last_plain_at timestamptz
);
alter table public.chat_send_state enable row level security;
revoke all on public.chat_send_state from public, anon, authenticated;

create or replace function public.validate_hall_sockets(item_data jsonb)
returns void language plpgsql immutable set search_path = public as $$
begin
    -- Every stored socket type must be empty: nested jewels/harvests would otherwise be copied with every replica.
    if exists (select 1 from jsonb_each(item_data) field
                where (field.key in ('abyssSockets','harvestSockets') and jsonb_typeof(field.value) not in ('array','null'))
                   or (field.key in ('voidSocket','corruptionSocket') and jsonb_typeof(field.value) not in ('object','null')))
       or exists (select 1 from jsonb_array_elements(public.hall_array(item_data -> 'abyssSockets')
                         || public.hall_array(item_data -> 'harvestSockets')) socket
                   where jsonb_typeof(socket) not in ('object','null')) then
        raise exception 'HALL_ITEM_REJECTED';
    end if;
    if exists (select 1 from jsonb_array_elements(public.hall_array(item_data -> 'abyssSockets')
                         || public.hall_array(item_data -> 'harvestSockets')
                         || jsonb_build_array(item_data -> 'voidSocket', item_data -> 'corruptionSocket')) socket
                where coalesce(socket -> 'jewel', 'null'::jsonb) <> 'null'::jsonb
                   or coalesce(socket -> 'harvest', 'null'::jsonb) <> 'null'::jsonb) then
        raise exception 'HALL_SOCKET_NOT_EMPTY';
    end if;
end;
$$;

revoke all on function public.validate_hall_sockets(jsonb) from public, anon, authenticated;

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
    perform public.validate_hall_sockets(item_data);
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

create or replace function public.hall_item_out_of_range(item_data jsonb)
returns boolean language sql stable set search_path = public as $$
    select exists (
        select 1
          from (select value as line, 'stat' as line_kind from jsonb_array_elements(public.hall_array(item_data -> 'stats'))
                union all
                select value, 'base' from jsonb_array_elements(public.hall_array(item_data -> 'baseStats'))
                union all
                select value, 'other' from jsonb_array_elements(public.hall_array(item_data -> 'emberLines')
                    || jsonb_path_query_array(item_data, '$.stats[*].extraStats[*]')
                    || jsonb_build_array(item_data -> 'underEnchant', item_data -> 'chaosInfusion', item_data #> '{encroached,chosen}'))) lines
         cross join lateral (
               select public.cheat_number(lines.line -> 'val') as val,
                      public.hall_line_bounds(item_data, lines.line, lines.line_kind) as bounds) roll
         -- 없는 부가 줄(null)은 허용한다. 존재하는 줄의 숫자 문자열은 구매자 쪽에서
         -- Number로 바뀌므로 검사에서 건너뛰지 않고 거절한다.
         where lines.line is not null and lines.line <> 'null'::jsonb
           and (jsonb_typeof(lines.line) <> 'object'
                or jsonb_typeof(lines.line -> 'val') is distinct from 'number'
                or (lines.line ? 'tier' and jsonb_typeof(lines.line -> 'tier') is distinct from 'number')
                or abs(roll.val) > 10000000
                or public.cheat_number(lines.line -> 'tier') > 20
                or (roll.bounds is not null
                    and roll.val > roll.bounds[2] + greatest(abs(roll.bounds[1]), abs(roll.bounds[2]), 1) + 1))
    );
$$;

create or replace function public.hall_item_params_out_of_range(item_data jsonb)
returns boolean language sql immutable set search_path = public as $$
    select public.cheat_number(item_data -> 'quality') > 30
        or case
            when item_data -> 'uniqueEffectParams' is null or item_data -> 'uniqueEffectParams' = 'null'::jsonb then false
            when jsonb_typeof(item_data -> 'uniqueEffectParams') <> 'object' then true
            else exists (
                select 1 from jsonb_each(item_data -> 'uniqueEffectParams') param
                 where case
                     when param.key = 'mode' then item_data ->> 'uniqueEffectKey' is distinct from 'projectilePatternMode'
                         or jsonb_typeof(param.value) <> 'string' or param.value #>> '{}' not in ('split', 'focus', 'return')
                     when param.key = 'allowAllSlotMods' then item_data ->> 'uniqueEffectKey' is distinct from 'kaleidoscopeShield'
                         or jsonb_typeof(param.value) <> 'boolean'
                     else jsonb_typeof(param.value) <> 'number'
                         or abs(public.cheat_number(param.value)) > 100000
                         or (param.key in ('mul', 'explicitStatMultiplier', 'level') and abs(public.cheat_number(param.value)) > 10)
                 end)
        end;
$$;

create or replace function public.create_hall_listing(p_item_key uuid, p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    account_id uuid := auth.uid();
    save_row public.cloud_saves%rowtype;
    item_data jsonb;
    remaining_inventory jsonb;
    listing_row public.hall_listings%rowtype;
    registry_row public.hall_item_registry%rowtype;
    profile_name text;
    score_value bigint;
    price_value integer;
    honor_value integer;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    select * into save_row from public.cloud_saves where user_id = account_id for update;
    if not found then raise exception 'CLOUD_SAVE_NOT_FOUND'; end if;
    if save_row.revision <> greatest(0, p_expected_revision) then raise exception 'CLOUD_REVISION_CONFLICT'; end if;
    if (select count(*) from public.hall_listings where curator_id = account_id and status in ('open','sold_out')) >= 3 then raise exception 'HALL_LISTING_LIMIT'; end if;
    if exists (select 1 from public.hall_listings where curator_id = account_id and created_at > now() - interval '5 seconds') then raise exception 'HALL_RATE_LIMIT'; end if;
    if (select count(*) from public.hall_listings where curator_id = account_id and created_at > now() - interval '1 day') >= 20 then raise exception 'HALL_LISTING_DAILY_LIMIT'; end if;
    item_data := public.get_hall_item_from_save(save_row.save_data, p_item_key);
    if item_data is null then raise exception 'HALL_ITEM_NOT_FOUND'; end if;
    perform public.validate_hall_item(item_data);
    select * into registry_row from public.hall_item_registry where item_key = p_item_key for update;
    if found and registry_row.owner_id = account_id and registry_row.state = 'retired' then raise exception 'HALL_RELIST_BLOCKED'; end if;
    if found and (registry_row.owner_id <> account_id or registry_row.state <> 'inventory') then raise exception 'HALL_ITEM_OWNERSHIP'; end if;
    -- 복제품 여부는 업로드한 hallReplica 표식 대신 서버의 출처로 판단한다.
    if found and registry_row.source_listing_id is not null then raise exception 'HALL_RELIST_BLOCKED'; end if;

    score_value := public.hall_item_score(item_data);
    price_value := public.hall_item_price(item_data);
    honor_value := greatest(1, least(50, ceil(price_value::numeric / 200)::integer));
    select nickname into profile_name from public.player_profiles where user_id = account_id;
    profile_name := left(coalesce(nullif(trim(profile_name), ''), '익명'), 24);
    insert into public.hall_listings(curator_id, curator_name, item_key, item_snapshot, item_score, price, honor_per_copy)
    values (account_id, profile_name, p_item_key, item_data, score_value, price_value, honor_value)
    returning * into listing_row;
    item_data := jsonb_set(item_data, '{id}', to_jsonb(9100000000000::bigint + listing_row.id), true);
    update public.hall_listings set item_snapshot = item_data where id = listing_row.id;

    remaining_inventory := coalesce((
        select jsonb_agg(entry order by ordinal)
          from jsonb_array_elements(public.hall_array(save_row.save_data -> 'inventory')) with ordinality rows(entry, ordinal)
         where coalesce(entry ->> 'tradeKey', '') <> p_item_key::text
    ), '[]'::jsonb);
    update public.cloud_saves set save_data = jsonb_set(save_data, '{inventory}', remaining_inventory, true),
        revision = revision + 1, updated_at = now() where user_id = account_id;
    insert into public.hall_item_registry(item_key, owner_id, state, listing_id)
    values (p_item_key, account_id, 'hall', listing_row.id)
    on conflict (item_key) do update set state = 'hall', listing_id = excluded.listing_id, updated_at = now();
    return jsonb_build_object('listingId', listing_row.id, 'item', item_data, 'score', score_value,
        'price', price_value, 'honorPerCopy', honor_value, 'currentRevision', save_row.revision + 1, 'status', 'open');
end;
$$;

create or replace function public.withdraw_hall_listing(p_listing_id bigint, p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    account_id uuid := auth.uid();
    listing_row public.hall_listings%rowtype;
    save_row public.cloud_saves%rowtype;
    inventory jsonb;
    returned_item jsonb;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    select * into listing_row from public.hall_listings where id = p_listing_id for update;
    if not found or listing_row.curator_id <> account_id or listing_row.status not in ('open','sold_out') then raise exception 'HALL_LISTING_NOT_ACTIVE'; end if;
    select * into save_row from public.cloud_saves where user_id = account_id for update;
    if not found then raise exception 'CLOUD_SAVE_NOT_FOUND'; end if;
    if save_row.revision <> greatest(0, p_expected_revision) then raise exception 'CLOUD_REVISION_CONFLICT'; end if;
    -- 예전 저장 복구로 이미 같은 원본이 가방에 있어도 서버 원본 한 개로 회수한다.
    inventory := coalesce((select jsonb_agg(entry order by ordinal)
      from jsonb_array_elements(public.hall_array(save_row.save_data -> 'inventory')) with ordinality rows(entry, ordinal)
     where coalesce(entry ->> 'tradeKey', '') <> listing_row.item_key::text), '[]'::jsonb);
    if jsonb_array_length(inventory) >= public.hall_inventory_limit(save_row.save_data) then raise exception 'HALL_INVENTORY_FULL'; end if;
    returned_item := listing_row.item_snapshot;
    if listing_row.copies_sold > 0 then returned_item := jsonb_set(returned_item, '{hallRelistBlocked}', 'true'::jsonb, true); end if;
    update public.cloud_saves set save_data = jsonb_set(save_data, '{inventory}', inventory || jsonb_build_array(returned_item), true),
        revision = revision + 1, updated_at = now() where user_id = account_id;
    update public.hall_listings set status = 'withdrawn', retired_at = now() where id = listing_row.id;
    update public.hall_item_registry set state = case when listing_row.copies_sold > 0 then 'retired' else 'inventory' end,
        source_listing_id = case when listing_row.copies_sold > 0 then listing_row.id else source_listing_id end, updated_at = now()
     where item_key = listing_row.item_key and owner_id = account_id and state = 'hall';
    if not found then raise exception 'HALL_ITEM_OWNERSHIP'; end if;
    return jsonb_build_object('listingId', listing_row.id, 'item', returned_item,
        'currentRevision', save_row.revision + 1, 'status', 'withdrawn');
end;
$$;

create or replace function public.restore_cloud_save_version(target_revision bigint, expected_revision bigint)
returns table(restored boolean, current_revision bigint, saved_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
    account_id uuid := auth.uid();
    stored_revision bigint;
    stored_data jsonb;
    target_data jsonb;
    target_saved_at timestamptz;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    select revision, save_data into stored_revision, stored_data
      from public.cloud_saves where user_id = account_id for update;
    if not found then raise exception 'CLOUD_SAVE_NOT_FOUND'; end if;
    if stored_revision <> greatest(expected_revision, 0) then
        return query select false, stored_revision,
            (select updated_at from public.cloud_saves where user_id = account_id);
        return;
    end if;
    select save_data, created_at into target_data, target_saved_at from public.cloud_save_versions
     where user_id = account_id and revision = target_revision;
    if target_data is null then raise exception 'SAVE_VERSION_NOT_FOUND'; end if;

    -- 전당의 등록·회수·구매는 저장 JSON 밖에도 남는다. 그 거래 전의 JSON만 복원하면
    -- 원본이 복제되거나 구매품을 잃으므로 안전하게 복원을 거절한다. 거래와 같은 저장 행을
    -- 이미 잠갔고, 전시가 정리된 뒤에도 남는 원장 시각을 사용한다. 전당 설치 전에는 적용하지 않는다.
    if to_regclass('public.hall_item_registry') is not null then
        if exists (select 1 from public.hall_item_registry
                    where owner_id = account_id and updated_at >= target_saved_at) then
            raise exception 'CLOUD_SAVE_HALL_HISTORY_CONFLICT';
        end if;
    end if;

    insert into public.cloud_save_versions(user_id, revision, save_data, created_at)
    select account_id, stored_revision, stored_data, updated_at
      from public.cloud_saves where user_id = account_id
    on conflict (user_id, revision) do nothing;
    update public.cloud_saves
       set save_data = target_data, revision = stored_revision + 1, updated_at = now()
     where user_id = account_id;
    delete from public.cloud_save_versions history
     where history.user_id = account_id
       and history.id not in (
           select keep.id from public.cloud_save_versions keep
            where keep.user_id = account_id order by keep.revision desc limit 2
       );
    return query select true, stored_revision + 1, now();
end;
$$;

create or replace function public.chat_messages_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    send_state public.chat_send_state%rowtype;
    send_time timestamptz;
    plain_hash text;
begin
    if auth.uid() is not null and auth.uid() <> new.user_id then raise exception 'AUTH_REQUIRED'; end if;
    insert into public.chat_send_state (user_id) values (new.user_id) on conflict (user_id) do nothing;
    select * into send_state from public.chat_send_state where user_id = new.user_id for update;
    -- 잠금을 기다린 시간도 서버 시각에 포함한다(now()는 트랜잭션 시작 시각에 고정되어 있다).
    send_time := clock_timestamp();
    new.created_at := send_time;
    if public.chat_muted_until(new.user_id) is not null then
        raise exception 'CHAT_MUTED: 채팅이 금지된 상태입니다. %분 뒤 풀립니다.',
            greatest(1, ceil(extract(epoch from (public.chat_muted_until(new.user_id) - now())) / 60));
    end if;
    if new.payload is not null then
        if jsonb_typeof(new.payload) <> 'object' or pg_column_size(new.payload) > 65536
           or coalesce(jsonb_typeof(new.payload -> 'items'), '') <> 'array' or jsonb_array_length(new.payload -> 'items') not between 1 and 3
           or exists (select 1 from jsonb_array_elements(new.payload -> 'items') linked where jsonb_typeof(linked) <> 'object')
           or exists (select 1 from jsonb_array_elements(new.payload -> 'items') linked
                       where linked ->> 'kind' = 'core' and case
                           when jsonb_typeof(linked -> 'lines') is distinct from 'array' then true
                           when jsonb_array_length(linked -> 'lines') > 4 then true
                           else exists (select 1 from jsonb_array_elements(linked -> 'lines') line
                                         where jsonb_typeof(line) <> 'string') end)
           or exists (select 1 from jsonb_array_elements(new.payload -> 'items') linked
                       where linked ->> 'kind' = 'talisman' and linked ? 'lines' and case
                           when jsonb_typeof(linked -> 'lines') is distinct from 'array' then true
                           when jsonb_array_length(linked -> 'lines') > 5 then true
                           else exists (select 1 from jsonb_array_elements(linked -> 'lines') line
                                         where jsonb_typeof(line) is distinct from 'object'
                                            or jsonb_typeof(line -> 'text') is distinct from 'string'
                                            or (line ? 'condition' and jsonb_typeof(line -> 'condition') is distinct from 'boolean')) end)
           or exists (select 1 from jsonb_array_elements(new.payload -> 'items') linked
                       where linked ->> 'kind' = 'jewel' and linked ? 'stats' and case
                           when jsonb_typeof(linked -> 'stats') is distinct from 'array' then true
                           when jsonb_array_length(linked -> 'stats') > 8 then true
                           else exists (select 1 from jsonb_array_elements(linked -> 'stats') stat
                                         where jsonb_typeof(stat) <> 'object') end)
           or exists (select 1 from jsonb_array_elements(new.payload -> 'items') linked
                       where coalesce(linked -> 'kind', 'null'::jsonb) in ('null'::jsonb, 'false'::jsonb, '0'::jsonb, '""'::jsonb)
                         and exists (select 1 from jsonb_each(linked) field
                                      where field.key in ('baseStats','stats','ember','anoint','sockets') and case
                                          when jsonb_typeof(field.value) is distinct from 'array' then true
                                          when field.key <> 'sockets' and jsonb_array_length(field.value) >
                                              case field.key when 'baseStats' then 8 when 'stats' then 12 else 2 end then true
                                          else exists (select 1 from jsonb_array_elements(field.value) row_data
                                                        where jsonb_typeof(row_data) <> 'object') end))
           or exists (select 1 from jsonb_array_elements(new.payload -> 'items') linked
                       where coalesce(linked -> 'kind', 'null'::jsonb) in ('null'::jsonb, 'false'::jsonb, '0'::jsonb, '""'::jsonb)
                         and exists (select 1 from jsonb_array_elements(jsonb_path_query_array(linked, '$.baseStats[*]')
                                              || jsonb_path_query_array(linked, '$.stats[*]')
                                              || jsonb_build_array(linked -> 'chaosInfusion')) line
                                      where line ? 'extraStats' and case
                                          when jsonb_typeof(line -> 'extraStats') is distinct from 'array' then true
                                          when jsonb_array_length(line -> 'extraStats') > 4 then true
                                          else exists (select 1 from jsonb_array_elements(line -> 'extraStats') extra
                                                        where jsonb_typeof(extra) <> 'object') end))
           or exists (select 1 from jsonb_array_elements(new.payload -> 'items') linked
                       where coalesce(linked -> 'kind', 'null'::jsonb) in ('null'::jsonb, 'false'::jsonb, '0'::jsonb, '""'::jsonb)
                         -- Preserved harvest sockets can exceed eight; only each displayed jewel's stats has that wire limit.
                         and exists (select 1 from jsonb_array_elements(jsonb_path_query_array(linked, '$.sockets[*].jewel')) jewel
                                      where jewel ? 'stats' and case
                                          when jsonb_typeof(jewel -> 'stats') is distinct from 'array' then true
                                          when jsonb_array_length(jewel -> 'stats') > 8 then true
                                          else exists (select 1 from jsonb_array_elements(jewel -> 'stats') stat
                                                        where jsonb_typeof(stat) <> 'object') end))
           or exists (select 1 from jsonb_array_elements(new.payload -> 'items') linked
                       -- Match renderSimpleCard only; gear with no kind may legitimately have more than eight stats.
                       where linked -> 'kind' not in ('null'::jsonb, 'false'::jsonb, '0'::jsonb, '""'::jsonb)
                         and linked ->> 'kind' not in ('jewel','core','stump')
                         and (linked ->> 'kind' <> 'talisman' or not (linked ? 'lines'))
                         and ((linked ? 'effects' and case
                             when jsonb_typeof(linked -> 'effects') is distinct from 'array' then true
                             when jsonb_array_length(linked -> 'effects') > 8 then true
                             else exists (select 1 from jsonb_array_elements(linked -> 'effects') effect
                                           where jsonb_typeof(effect) <> 'string') end)
                           or (linked ? 'stats' and case
                             when jsonb_typeof(linked -> 'stats') is distinct from 'array' then true
                             when jsonb_array_length(linked -> 'stats') > 8 then true
                             else exists (select 1 from jsonb_array_elements(linked -> 'stats') stat
                                           where jsonb_typeof(stat) <> 'object') end))) then
            raise exception 'CHAT_PAYLOAD_INVALID: 아이템 링크는 메시지마다 3개까지입니다.';
        end if;
    end if;
    -- 본문과, 붙인 아이템 링크의 이름(남의 화면에 그대로 보인다)을 본다.
    if public.chat_text_is_offensive(new.body)
       or (new.payload is not null and exists (select 1 from jsonb_array_elements(new.payload -> 'items') linked
                                                where public.chat_text_is_offensive(linked ->> 'name'))) then
        raise exception 'CHAT_PROFANITY: 비속어가 들어 있어 보낼 수 없습니다.';
    end if;
    if lower(new.body) ~ '(https?://|www\.|discord\.gg|t\.me/|bit\.ly)' then
        raise exception 'CHAT_LINK: 링크는 보낼 수 없습니다.';
    end if;
    if new.body ~ '(.)\1{24,}' then
        raise exception 'SPAM_FLOOD: 같은 글자를 너무 많이 반복했습니다.';
    end if;

    select coalesce(array_agg(stamp), '{}'::timestamptz[]) into send_state.sent_at
      from unnest(send_state.sent_at) stamp where stamp > send_time - interval '60 seconds';
    select coalesce(jsonb_agg(entry), '[]'::jsonb) into send_state.recent_plain
      from jsonb_array_elements(send_state.recent_plain) entry
     where (entry ->> 'at')::timestamptz > send_time - interval '5 minutes';

    if send_state.last_sent_at > send_time - interval '1.5 seconds' then
        raise exception 'SPAM_TOO_FAST: 메시지를 너무 빠르게 보냈습니다.';
    end if;

    if cardinality(send_state.sent_at) >= 15 then
        raise exception 'SPAM_RATE_LIMIT: 잠시 후 다시 시도해주세요.';
    end if;

    -- 5분 안에 같은 본문을 세 번째 보내면 막는다(연속이 아니어도). "ㅇㅇ", "ㅋㅋ" 같은 짧은 반응(6자 미만)은 둔다.
    plain_hash := case when new.payload is null then md5(new.body) else null end;
    if plain_hash is not null and char_length(new.body) >= 6 and (select count(*) from jsonb_array_elements(send_state.recent_plain) entry
         where entry ->> 'hash' = plain_hash) >= 2 then
        raise exception 'SPAM_REPEAT: 같은 메시지를 5분 안에 세 번 보낼 수 없습니다.';
    end if;

    -- 아이템 링크가 포함된 메시지(payload 존재)는 본문 토큰이 같을 수 있으므로
    -- 중복 검사에서 제외한다. 순수 텍스트 메시지만 연속 중복을 차단한다.
    if plain_hash is not null then
        if send_state.last_plain_hash = plain_hash and send_state.last_plain_at > send_time - interval '3 days' then
            raise exception 'SPAM_DUPLICATE: 동일한 메시지를 연속으로 보낼 수 없습니다.';
        end if;
        send_state.recent_plain := send_state.recent_plain || jsonb_build_array(jsonb_build_object('at', send_time, 'hash', plain_hash));
        send_state.last_plain_hash := plain_hash;
        send_state.last_plain_at := send_time;
    end if;

    update public.chat_send_state set last_sent_at = send_time, sent_at = array_append(send_state.sent_at, send_time),
        recent_plain = send_state.recent_plain, last_plain_hash = send_state.last_plain_hash, last_plain_at = send_state.last_plain_at
      where user_id = new.user_id;
    return new;
end;
$$;

create or replace function public.chat_messages_auto_mute()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if (select cardinality(sent_at) from public.chat_send_state where user_id = new.user_id) >= 15 then
        insert into public.chat_mutes (user_id, until_at, note) values (new.user_id, now() + interval '10 minutes', '자동: 60초 안 15개')
        on conflict (user_id) do update
            set until_at = greatest(chat_mutes.until_at, excluded.until_at),
                note = case when chat_mutes.until_at > excluded.until_at then chat_mutes.note else excluded.note end;
    end if;
    return null;
end;
$$;

create or replace function public.buy_hall_replica(p_listing_id bigint, p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    account_id uuid := auth.uid();
    listing_row public.hall_listings%rowtype;
    buyer_save public.cloud_saves%rowtype;
    buyer_currency bigint;
    buyer_inventory jsonb;
    purchase_row public.hall_purchases%rowtype;
    purchase_time timestamptz;
    replica_key uuid := gen_random_uuid();
    replica_data jsonb;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    select * into listing_row from public.hall_listings where id = p_listing_id for update;
    if not found or listing_row.status <> 'open' or listing_row.copies_sold >= listing_row.copy_cap then raise exception 'HALL_LISTING_NOT_ACTIVE'; end if;
    if listing_row.curator_id = account_id then raise exception 'HALL_SELF_PURCHASE'; end if;
    -- Recheck old shows too; do not copy a nested jewel/harvest from a pre-hardening snapshot.
    perform public.validate_hall_sockets(listing_row.item_snapshot);
    if exists (select 1 from public.hall_purchases where listing_id = p_listing_id and buyer_id = account_id) then raise exception 'HALL_ALREADY_COLLECTED'; end if;
    select * into buyer_save from public.cloud_saves where user_id = account_id for update;
    if not found then raise exception 'CLOUD_SAVE_NOT_FOUND'; end if;
    if buyer_save.revision <> greatest(0, p_expected_revision) then raise exception 'CLOUD_REVISION_CONFLICT'; end if;
    -- The buyer row serializes purchases across different listings. Check limits only after that lock.
    purchase_time := clock_timestamp();
    if exists (select 1 from public.hall_purchases where buyer_id = account_id and purchased_at > purchase_time - interval '10 seconds') then raise exception 'HALL_RATE_LIMIT'; end if;
    if (select count(*) from public.hall_purchases where buyer_id = account_id and purchased_at > purchase_time - interval '1 day') >= 10 then raise exception 'HALL_DAILY_LIMIT'; end if;
    buyer_currency := greatest(0, coalesce((buyer_save.save_data #>> '{currencies,goldenRule}')::bigint, 0));
    if buyer_currency < listing_row.price then raise exception 'HALL_CURRENCY_SHORTAGE'; end if;
    buyer_inventory := public.hall_array(buyer_save.save_data -> 'inventory');
    if jsonb_array_length(buyer_inventory) >= public.hall_inventory_limit(buyer_save.save_data) then raise exception 'HALL_INVENTORY_FULL'; end if;

    insert into public.hall_purchases(listing_id, buyer_id, replica_key, price, purchased_at)
    values (listing_row.id, account_id, replica_key, listing_row.price, purchase_time) returning * into purchase_row;
    replica_data := listing_row.item_snapshot || jsonb_build_object(
        'id', 9200000000000::bigint + purchase_row.id, 'tradeKey', replica_key::text,
        'locked', true, 'tradeLocked', true, 'hallReplica', true, 'hallSourceId', listing_row.id,
        'hallCuratorName', listing_row.curator_name, 'hallAppraisalScore', listing_row.item_score);
    update public.cloud_saves set save_data = jsonb_set(
            jsonb_set(save_data, '{currencies,goldenRule}', to_jsonb(buyer_currency - listing_row.price), true),
            '{inventory}', buyer_inventory || jsonb_build_array(replica_data), true),
        revision = revision + 1, updated_at = now() where user_id = account_id;
    update public.hall_listings set copies_sold = copies_sold + 1,
        status = case when copies_sold + 1 >= copy_cap then 'sold_out' else status end,
        retired_at = case when copies_sold + 1 >= copy_cap then now() else retired_at end
     where id = listing_row.id;
    insert into public.hall_curator_profiles(user_id, honor, copies_shared)
    values (listing_row.curator_id, listing_row.honor_per_copy, 1)
    on conflict (user_id) do update set honor = hall_curator_profiles.honor + excluded.honor,
        copies_shared = hall_curator_profiles.copies_shared + 1, updated_at = now();
    insert into public.hall_item_registry(item_key, owner_id, state, source_listing_id)
    values (replica_key, account_id, 'inventory', listing_row.id);
    return jsonb_build_object('listingId', listing_row.id, 'item', replica_data, 'price', listing_row.price,
        'goldenRule', buyer_currency - listing_row.price, 'currentRevision', buyer_save.revision + 1,
        'copiesSold', listing_row.copies_sold + 1,
        'status', case when listing_row.copies_sold + 1 >= listing_row.copy_cap then 'sold_out' else 'open' end);
end;
$$;

revoke all on function public.buy_hall_replica(bigint, bigint) from public, anon;
grant execute on function public.buy_hall_replica(bigint, bigint) to authenticated;

create or replace function public.report_player_chat(p_target_user_id uuid, p_reason text, p_message_id bigint default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    account_id uuid := auth.uid();
    message_row public.chat_messages%rowtype;
    target_name text;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    if p_target_user_id is null or p_target_user_id = account_id then raise exception 'REPORT_INVALID_TARGET'; end if;
    if not exists (select 1 from public.player_profiles target where target.user_id = p_target_user_id) then raise exception 'REPORT_INVALID_TARGET'; end if;
    if p_reason is null or char_length(trim(p_reason)) not between 1 and 200 then raise exception 'REPORT_INVALID_REASON'; end if;
    -- Serialize one reporter before reading either limit; parallel requests must see the earlier accepted report.
    perform pg_advisory_xact_lock(hashtext('chat_report:' || account_id::text));
    if exists (select 1 from public.chat_reports where reporter_id = account_id and target_user_id = p_target_user_id
                  and created_at >= now() - interval '1 day') then raise exception 'REPORT_ALREADY_SENT'; end if;
    if (select count(*) from public.chat_reports where reporter_id = account_id and created_at >= now() - interval '1 day') >= 20 then
        raise exception 'REPORT_DAILY_LIMIT';
    end if;
    if p_message_id is not null then
        select * into message_row from public.chat_messages where id = p_message_id and user_id = p_target_user_id;
    end if;
    select nickname into target_name from public.player_profiles where user_id = p_target_user_id;
    insert into public.chat_reports (reporter_id, target_user_id, message_id, nickname, body, reason)
    values (account_id, p_target_user_id, message_row.id, coalesce(target_name, message_row.nickname, ''),
            left(message_row.body, 500), left(trim(p_reason), 200));
    delete from public.chat_reports where created_at < now() - interval '90 days';
    return jsonb_build_object('reported', true);
end;
$$;

revoke all on function public.report_player_chat(uuid, text, bigint) from public, anon;
grant execute on function public.report_player_chat(uuid, text, bigint) to authenticated;

commit;
