-- The door is open to the public by design, so it needs a bouncer.
alter table public.waitlist add column if not exists ip text;

create index if not exists waitlist_ip_recent_idx
  on public.waitlist (ip, joined_at desc);

drop function if exists public.join_waitlist(text, text);

-- Returns a status rather than raising, so the route can tell "already on the
-- list" apart from "slow down" without parsing Postgres error strings.
create or replace function public.join_waitlist(
  p_email      text,
  p_handle     text,
  p_ip         text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email    text := lower(btrim(p_email));
  v_handle   text := btrim(p_handle);
  v_recent   integer;
  v_id       bigint;
  v_dupe     boolean := false;
  v_position integer;
begin
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    return jsonb_build_object('status', 'invalid');
  end if;

  if left(v_handle, 1) <> '@' then
    v_handle := '@' || v_handle;
  end if;

  if char_length(v_handle) < 2 or char_length(v_handle) > 40 then
    return jsonb_build_object('status', 'invalid');
  end if;

  -- Five signups from one address in ten minutes is already generous for a
  -- waitlist; past that it is a script, not a person.
  if p_ip is not null then
    select count(*) into v_recent
      from public.waitlist
     where ip = p_ip
       and joined_at > now() - interval '10 minutes';

    if v_recent >= 5 then
      return jsonb_build_object('status', 'rate_limited');
    end if;
  end if;

  insert into public.waitlist (email, handle, ip, user_agent)
  values (v_email, v_handle, p_ip, left(coalesce(p_user_agent, ''), 400))
  on conflict (lower(email)) do nothing
  returning id into v_id;

  -- no row came back, so the unique index caught an existing signup
  if v_id is null then
    v_dupe := true;
    select id into v_id from public.waitlist where lower(email) = v_email;
  end if;

  select count(*) into v_position from public.waitlist where id <= v_id;

  return jsonb_build_object(
    'status', case when v_dupe then 'duplicate' else 'ok' end,
    'position', v_position
  );
end;
$$;

revoke all on function public.join_waitlist(text, text, text, text) from public;
grant execute on function public.join_waitlist(text, text, text, text)
  to anon, authenticated;
