-- ============================================================================
--  NutriPiki · Amigos (Supabase)
--  Pega TODO este archivo en: Supabase → SQL Editor → New query → Run.
--
--  Qué se sube a la nube: SOLO el resumen de cada día (calorías comidas,
--  objetivo, ejercicio, pasos, peso y si registraste ese día).
--  Los alimentos concretos, recetas, fotos y medidas NUNCA salen del móvil.
--
--  Además de este SQL, en Authentication → Sign In / Providers hay que:
--    · activar "Allow anonymous sign-ins"  (para entrar sin formularios)
--    · desactivar "Confirm email"          (para el correo opcional)
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- perfiles --
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Amigo',
  friend_code  text not null unique,
  emoji        text not null default '🥑',
  last_seen    timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Código de amigo tipo "K7P2QX" (sin caracteres confusos: I, O, 0, 1)
create or replace function public.gen_friend_code() returns text
language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles p where p.friend_code = code);
  end loop;
  return code;
end;
$$;

-- Al registrarse se crea su perfil con código
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, friend_code)
  values (new.id,
          coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), 'Amigo'),
          public.gen_friend_code())
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------- amistades --
create table if not exists public.friendships (
  id         uuid primary key default gen_random_uuid(),
  requester  uuid not null references auth.users(id) on delete cascade,
  addressee  uuid not null references auth.users(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (requester, addressee)
);
create index if not exists friendships_addressee_idx on public.friendships (addressee, status);
create index if not exists friendships_requester_idx on public.friendships (requester, status);

-- ¿Son amigos (aceptado) a y b? SECURITY DEFINER para no recursar con RLS.
create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester = a and f.addressee = b) or (f.requester = b and f.addressee = a))
  );
$$;

-- ------------------------------------------------------- resúmenes diarios --
create table if not exists public.daily_stats (
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date not null,
  kcal_eaten    int  not null default 0,
  kcal_goal     int  not null default 0,
  exercise_kcal int  not null default 0,
  exercise_min  int  not null default 0,
  steps         int  not null default 0,
  weight_kg     numeric(5,2),
  logged        boolean not null default false,
  updated_at    timestamptz not null default now(),
  primary key (user_id, date)
);
create index if not exists daily_stats_user_date_idx on public.daily_stats (user_id, date desc);

-- ------------------------------------------------------------------- RLS ---
alter table public.profiles    enable row level security;
alter table public.friendships enable row level security;
alter table public.daily_stats enable row level security;

drop policy if exists "perfil propio y de amigos" on public.profiles;
create policy "perfil propio y de amigos" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.are_friends(auth.uid(), id));

drop policy if exists "editar mi perfil" on public.profiles;
create policy "editar mi perfil" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "ver mis amistades" on public.friendships;
create policy "ver mis amistades" on public.friendships
  for select to authenticated using (requester = auth.uid() or addressee = auth.uid());

drop policy if exists "aceptar solicitudes que me llegan" on public.friendships;
create policy "aceptar solicitudes que me llegan" on public.friendships
  for update to authenticated using (addressee = auth.uid()) with check (addressee = auth.uid());

drop policy if exists "borrar mis amistades" on public.friendships;
create policy "borrar mis amistades" on public.friendships
  for delete to authenticated using (requester = auth.uid() or addressee = auth.uid());

drop policy if exists "leer mis stats y las de mis amigos" on public.daily_stats;
create policy "leer mis stats y las de mis amigos" on public.daily_stats
  for select to authenticated
  using (user_id = auth.uid() or public.are_friends(auth.uid(), user_id));

drop policy if exists "escribir solo mis stats" on public.daily_stats;
create policy "escribir solo mis stats" on public.daily_stats
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------------------------ RPCs ---

-- Añadir amigo con su código (o con el enlace de invitación): queda aceptado
-- en el momento. El código ES la llave que tú compartes; si se te va de las
-- manos, regenéralo y los enlaces antiguos dejan de valer.
create or replace function public.add_friend(code text)
returns table (friend_id uuid, display_name text)
language plpgsql security definer set search_path = public as $$
declare target public.profiles;
begin
  select * into target from public.profiles p where p.friend_code = upper(trim(code));
  if not found then raise exception 'CODIGO_NO_EXISTE'; end if;
  if target.id = auth.uid() then raise exception 'ES_TU_CODIGO'; end if;

  insert into public.friendships (requester, addressee, status)
  values (auth.uid(), target.id, 'accepted')
  on conflict (requester, addressee) do update set status = 'accepted';

  -- si el otro ya te había añadido, esa fila también queda aceptada
  update public.friendships f set status = 'accepted'
   where f.requester = target.id and f.addressee = auth.uid();

  return query select target.id, target.display_name;
end;
$$;

-- Cambiar mi código (invalida los enlaces de invitación que hubiera repartido).
create or replace function public.regenerate_friend_code() returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  c := public.gen_friend_code();
  update public.profiles set friend_code = c, updated_at = now() where id = auth.uid();
  return c;
end;
$$;

-- Mis amigos aceptados.
create or replace function public.friends_overview()
returns table (friend_id uuid, display_name text, emoji text, friend_code text, last_seen timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.emoji, p.friend_code, p.last_seen
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester = auth.uid() then f.addressee else f.requester end
  where f.status = 'accepted' and (f.requester = auth.uid() or f.addressee = auth.uid())
  order by p.display_name;
$$;

-- Dejar de compartir: borra todos mis resúmenes de la nube.
create or replace function public.wipe_my_stats() returns void
language sql security definer set search_path = public as $$
  delete from public.daily_stats where user_id = auth.uid();
$$;

-- Privilegios: 'anon' (sin sesión) no toca nada; el perfil solo deja cambiar
-- el nombre y el emoji (el código de amigo no se puede falsear).
revoke all on public.profiles    from anon;
revoke all on public.friendships from anon;
revoke all on public.daily_stats from anon;

grant select, insert, update, delete on public.friendships to authenticated;
grant select, insert, update, delete on public.daily_stats to authenticated;

revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, emoji, last_seen, updated_at) on public.profiles to authenticated;

grant execute on function public.add_friend(text)             to authenticated;
grant execute on function public.regenerate_friend_code()     to authenticated;
grant execute on function public.friends_overview()           to authenticated;
grant execute on function public.wipe_my_stats()              to authenticated;
