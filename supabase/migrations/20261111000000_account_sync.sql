-- Mêmes colonnes que le schéma local (src/db/schema.ts), dates en ms (bigint).
create table public.collections (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  server_updated_at timestamptz not null default clock_timestamp(),
  name text not null
);

create table public.posts (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  server_updated_at timestamptz not null default clock_timestamp(),
  url text,
  note text,
  caption text,
  thumbnail_url text,
  opened_at bigint
);

create table public.post_collections (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  server_updated_at timestamptz not null default clock_timestamp(),
  post_id text not null references public.posts (id) on delete cascade,
  collection_id text not null references public.collections (id) on delete cascade
);

create index on public.collections (user_id, server_updated_at, id);
create index on public.posts (user_id, server_updated_at, id);
create index on public.post_collections (user_id, server_updated_at, id);

-- Dernière écriture gagnante : une mise à jour qui n'est pas plus récente est ignorée
-- (pas d'erreur, la ligne en place reste). Évite aussi le rebond entre appareils : un
-- appareil qui renvoie une ligne qu'il vient de recevoir ne la « rajeunit » pas.
create function public.sync_last_write_wins() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.updated_at <= old.updated_at then
    return null;
  end if;
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

create trigger collections_lww before insert or update on public.collections
  for each row execute function public.sync_last_write_wins();
create trigger posts_lww before insert or update on public.posts
  for each row execute function public.sync_last_write_wins();
create trigger post_collections_lww before insert or update on public.post_collections
  for each row execute function public.sync_last_write_wins();

alter table public.collections enable row level security;
alter table public.posts enable row level security;
alter table public.post_collections enable row level security;

create policy "own rows" on public.collections for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.posts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.post_collections for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Pas de DELETE accordé : suppression logique uniquement (ARCHITECTURE.md §4).
-- Supabase accorde par défaut tous les droits (DELETE compris) à anon et authenticated
-- sur les nouvelles tables de public : on les retire avant d'accorder le strict utile.
revoke all on public.collections, public.posts, public.post_collections
  from anon, authenticated;
grant select, insert, update on public.collections, public.posts, public.post_collections
  to authenticated;
-- Lecture anonyme pour le ping de réveil (tâche 7) ; RLS ne lui renvoie aucune ligne.
grant select on public.collections to anon;

-- Droit à l'effacement : supprime l'utilisateur, ses lignes partent en cascade.
create function public.delete_my_account() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = (select auth.uid());
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
