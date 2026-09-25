-- Email-only signups, from the "new regular updates" field in the footer.
--
-- The waitlist page asks for an X handle as well, so it could tag people on
-- launch; the footer asks only for an email. Both land in the same table so
-- there is one list and one duplicate check, and `source` says which door a
-- row came in through.
--
-- Additive only: no existing row is changed, and every existing signup keeps
-- its handle and reads as source 'waitlist'.

alter table public.waitlist alter column handle drop not null;

alter table public.waitlist
  add column if not exists source text not null default 'waitlist';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'waitlist_source_known'
  ) then
    alter table public.waitlist
      add constraint waitlist_source_known check (source in ('waitlist', 'footer'));
  end if;
end;
$$;

drop function if exists public.join_waitlist(text, text, text, text);

-- The same door as before, with a fifth, optional argument. A caller that
-- passes the original four still resolves here and behaves exactly as it did.
create or replace function public.join_waitlist(
  p_email      text,
  p_handle     text,
  p_ip         text default null,
  p_user_agent text default null,
  p_source     text default 'waitlist'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email    text := lower(btrim(p_email));
  v_handle   text := nullif(btrim(coalesce(p_handle, '')), '');
  v_source   text := coalesce(p_source, 'waitlist');
  v_recent   integer;
  v_id       bigint;
  v_dupe     boolean := false;
  v_position integer;
begin
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    return jsonb_build_object('status', 'invalid');
  end if;

  if v_source not in ('waitlist', 'footer') then
    return jsonb_build_object('status', 'invalid');
  end if;

  -- the waitlist page still requires a handle; only the footer may omit it
  if v_handle is null and v_source <> 'footer' then
    return jsonb_build_object('status', 'invalid');
  end if;

  if v_handle is not null then
    if left(v_handle, 1) <> '@' then
      v_handle := '@' || v_handle;
    end if;

    if char_length(v_handle) < 2 or char_length(v_handle) > 40 then
      return jsonb_build_object('status', 'invalid');
    end if;
  end if;

  if p_ip is not null then
    select count(*) into v_recent
      from public.waitlist
     where ip = p_ip
       and joined_at > now() - interval '10 minutes';

    if v_recent >= 5 then
      return jsonb_build_object('status', 'rate_limited');
    end if;
  end if;

  insert into public.waitlist (email, handle, ip, user_agent, source)
  values (v_email, v_handle, p_ip, left(coalesce(p_user_agent, ''), 400), v_source)
  on conflict (lower(email)) do nothing
  returning id into v_id;

  if v_id is null then
    v_dupe := true;
    select id into v_id from public.waitlist where lower(email) = v_email;

    -- someone who first left only an email and later joins properly gets
    -- their handle recorded; an existing handle is never overwritten
    if v_handle is not null then
      update public.waitlist set handle = v_handle
       where id = v_id and handle is null;
    end if;
  end if;

  select count(*) into v_position from public.waitlist where id <= v_id;

  return jsonb_build_object(
    'status', case when v_dupe then 'duplicate' else 'ok' end,
    'position', v_position
  );
end;
$$;

revoke all on function public.join_waitlist(text, text, text, text, text) from public;
grant execute on function public.join_waitlist(text, text, text, text, text)
  to anon, authenticated;
