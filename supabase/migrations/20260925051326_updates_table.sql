-- The footer's "new regular updates" list, kept apart from the waitlist.
--
-- The waitlist is launch signups (email + X handle); this is people who want
-- to hear when new components land (email only). Separate tables, so neither
-- list's rules or contents leak into the other.
--
-- It follows the waitlist's security model exactly: row level security on
-- with no policies, nothing granted on the table itself, and a single
-- security-definer function as the only way in — so the publishable key can
-- add an address but can never read, change or delete the list.

create table if not exists public.updates (
  id             bigint generated always as identity primary key,
  email          text        not null,
  subscribed_at  timestamptz not null default now(),
  ip             text,
  user_agent     text,
  constraint updates_email_shape check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')
);

-- one subscription per address, case-insensitively
create unique index if not exists updates_email_key
  on public.updates (lower(email));

create index if not exists updates_ip_recent_idx
  on public.updates (ip, subscribed_at desc);

alter table public.updates enable row level security;

revoke all on public.updates from anon, authenticated;

create or replace function public.subscribe_updates(
  p_email      text,
  p_ip         text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email  text := lower(btrim(p_email));
  v_recent integer;
  v_id     bigint;
begin
  if v_email is null or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    return jsonb_build_object('status', 'invalid');
  end if;

  -- the same bouncer as the waitlist: five from one address in ten minutes
  if p_ip is not null then
    select count(*) into v_recent
      from public.updates
     where ip = p_ip
       and subscribed_at > now() - interval '10 minutes';

    if v_recent >= 5 then
      return jsonb_build_object('status', 'rate_limited');
    end if;
  end if;

  insert into public.updates (email, ip, user_agent)
  values (v_email, p_ip, left(coalesce(p_user_agent, ''), 400))
  on conflict (lower(email)) do nothing
  returning id into v_id;

  return jsonb_build_object(
    'status', case when v_id is null then 'duplicate' else 'ok' end
  );
end;
$$;

revoke all on function public.subscribe_updates(text, text, text) from public;
grant execute on function public.subscribe_updates(text, text, text)
  to anon, authenticated;

-- The waitlist's own door goes back to exactly what it was before the footer
-- borrowed it: four arguments, a handle always required.
drop function if exists public.join_waitlist(text, text, text, text, text);

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
