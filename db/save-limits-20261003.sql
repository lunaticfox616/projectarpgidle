-- 클라우드 저장 정리(2026-10-03). Supabase 대시보드 > SQL Editor > New query에 이 파일 내용을 전부 붙여 넣고 Run.
-- db/cloud-and-playtest.sql, db/operations-and-ghost.sql, db/equipment-hall.sql을 이미 실행한 프로젝트에 쓴다.
-- 같은 내용이 그 세 파일에도 들어 있어, 나중에 처음부터 다시 설치해도 같은 상태가 된다.
-- 반복 실행해도 안전하고, 이 파일은 데이터를 지우거나 고치지 않는다(바꾸는 것은 권한과 함수뿐이다).
--   1. 세이브 직접 쓰기 막기: 세이브는 commit_cloud_save(보안 정의자 함수)로만 쓴다.
--   2. 세이브 크기 상한 8MiB(SAVE_TOO_LARGE). 가장 큰 정상 세이브가 이 기준으로 약 2.3MB다.
--   3. 저장 기록: 이전 세이브를 약 30분에 한 번만 남기고 2개까지(예전에는 저장마다 남기고 5개).
--      이미 쌓인 기록은 각 계정이 다음에 저장할 때 2개로 줄어든다.
--   4. 전당 가방 한도: 없어진 inventoryExpandLevel 대신 클라이언트와 같은 칸 수(늘 30이던 문제).

begin;

drop policy if exists "cloud_saves_insert_own" on public.cloud_saves;
drop policy if exists "cloud_saves_update_own" on public.cloud_saves;
revoke all on public.cloud_saves from anon, authenticated;
grant select on public.cloud_saves to authenticated;

create or replace function public.commit_cloud_save(expected_revision bigint, next_save_data jsonb)
returns table(committed boolean, current_revision bigint, saved_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
    account_id uuid := auth.uid();
    stored_revision bigint;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    if next_save_data is null or jsonb_typeof(next_save_data) <> 'object' then
        raise exception 'INVALID_SAVE_DATA';
    end if;
    -- 세이브 하나는 8MiB까지(2026-10-03). 가장 큰 정상 세이브(모든 칸을 채운 엔드게임)도 이 기준으로 약 2.3MB라
    -- 정상 플레이는 막지 않고, 비정상으로 커지거나 일부러 키운 세이브가 무료 DB(500MB)를 채우지 못하게 한다.
    if pg_column_size(next_save_data) > 8388608 then raise exception 'SAVE_TOO_LARGE'; end if;

    -- 리비전만 잠가 읽는다. 예전에는 쓰지도 않는 지난 세이브 전체를 함께 읽었다.
    select revision into stored_revision
      from public.cloud_saves where user_id = account_id for update;

    if not found then
        if greatest(expected_revision, 0) <> 0 then
            return query select false, 0::bigint, null::timestamptz;
            return;
        end if;
        insert into public.cloud_saves(user_id, save_data, revision, updated_at)
        values (account_id, next_save_data, 1, now());
        return query select true, 1::bigint, now();
        return;
    end if;

    if stored_revision <> greatest(expected_revision, 0) then
        return query select false, stored_revision,
            (select updated_at from public.cloud_saves where user_id = account_id);
        return;
    end if;

    -- 저장 기록: 이전 세이브는 약 30분에 한 번만 남기고 2개까지 둔다(2026-10-03). 예전에는 자동 저장마다 남기고 5개를 두어,
    -- 저장 한 번이 세이브 두 벌을 쓰고 계정마다 세이브가 여섯 벌까지 쌓였다.
    if not exists (select 1 from public.cloud_save_versions recent
                    where recent.user_id = account_id and recent.created_at > now() - interval '30 minutes') then
        insert into public.cloud_save_versions(user_id, revision, save_data, created_at)
        select account_id, stored_revision, save_data, updated_at
          from public.cloud_saves where user_id = account_id
        on conflict (user_id, revision) do nothing;
    end if;

    update public.cloud_saves
       set save_data = next_save_data, revision = stored_revision + 1, updated_at = now()
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

create or replace function public.list_cloud_save_versions()
returns table(revision bigint, saved_at timestamptz, is_current boolean, loop_number integer)
language sql
security definer
set search_path = public
as $$
    select row_data.revision, row_data.saved_at, row_data.is_current,
           case when jsonb_typeof(row_data.save_data -> 'season') = 'number'
                then greatest(1, (row_data.save_data ->> 'season')::integer) else 1 end
      from (
          select current_save.revision, current_save.updated_at as saved_at, true as is_current,
                 current_save.save_data
            from public.cloud_saves current_save where current_save.user_id = auth.uid()
          union all
          select history.revision, history.created_at, false, history.save_data
            from public.cloud_save_versions history where history.user_id = auth.uid()
      ) row_data
     order by row_data.revision desc
     limit 3;
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
    select save_data into target_data from public.cloud_save_versions
     where user_id = account_id and revision = target_revision;
    if target_data is null then raise exception 'SAVE_VERSION_NOT_FOUND'; end if;

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

revoke all on function public.commit_cloud_save(bigint, jsonb) from public, anon;
revoke all on function public.list_cloud_save_versions() from public, anon;
revoke all on function public.restore_cloud_save_version(bigint, bigint) from public, anon;
grant execute on function public.commit_cloud_save(bigint, jsonb) to authenticated;
grant execute on function public.list_cloud_save_versions() to authenticated;
grant execute on function public.restore_cloud_save_version(bigint, bigint) to authenticated;

-- 가방 한도는 클라이언트 getInventoryLimit(js/utils.js)과 같다: 루프에 따라 1~12쪽, 쪽마다 120칸.
-- 장비 하나가 한 칸 이상을 쓰므로 개수로 재면 넉넉하고, 칸이 모자라면 클라이언트가 남는 장비를 임시 보관함으로 옮긴다.
-- 예전에는 세이브 이전(js/save-migrations.js)이 지우는 inventoryExpandLevel을 읽어 늘 30이라,
-- 장비가 30개를 넘으면 전당에서 사거나 꺼낼 수 없었다(2026-10-03 수정).
create or replace function public.hall_inventory_limit(save_data jsonb)
returns integer language sql immutable set search_path = public as $$
    select (least(12, 1 + case when loop_row.loop_number < 30 then floor(loop_row.loop_number / 5)
                               else 6 + floor((loop_row.loop_number - 30) / 10) end) * 120)::integer
      from (select greatest(1,
                case when jsonb_typeof(save_data -> 'season') = 'number'
                     then floor((save_data ->> 'season')::numeric) else 1 end,
                case when jsonb_typeof(save_data -> 'loopCount') = 'number'
                     then floor((save_data ->> 'loopCount')::numeric) + 1 else 1 end) as loop_number) loop_row;
$$;

revoke all on function public.hall_inventory_limit(jsonb) from public, anon, authenticated;

commit;
