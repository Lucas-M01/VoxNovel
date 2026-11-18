-- Baseline for the disposable integration database only; never apply to user data.
create table if not exists public.novels (
 id uuid primary key,
 title text not null,
 slug text not null unique,
 current_chapter integer not null default 1 check (current_chapter > 0),
 image_url text,
 total_chapters integer,
 active_source_id uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.sources (
 id uuid primary key,
 novel_id uuid not null references public.novels(id) on delete cascade,
 provider text not null,
 title text not null,
 slug text,
 url_base text not null,
 chapter_url_pattern text,
 chapter_ids integer[],
 total_chapters integer,
 image_url text,
 current_chapter integer not null default 1 check (current_chapter > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(novel_id, provider)
);
alter table public.novels enable row level security;
alter table public.sources enable row level security;
revoke all on public.novels, public.sources from anon, authenticated;
grant select, insert, update, delete on public.novels, public.sources to service_role;
notify pgrst, 'reload schema';
