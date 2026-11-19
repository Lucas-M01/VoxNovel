create table if not exists public.filters (
 id integer primary key check(id=1),
 words jsonb not null check(jsonb_typeof(words)='array'),
 phrases jsonb not null check(jsonb_typeof(phrases)='array'),
 regex jsonb not null check(jsonb_typeof(regex)='array'),
 updated_at timestamptz not null default now()
);
create table if not exists public.preferences (
 id integer primary key check(id=1),
 speed double precision not null check(speed>0 and speed<'Infinity'::double precision),
 updated_at timestamptz not null default now()
);
alter table public.filters enable row level security;
alter table public.preferences enable row level security;
revoke all on public.filters,public.preferences from anon,authenticated,service_role;
grant select,insert,update,delete on public.filters,public.preferences to service_role;
notify pgrst,'reload schema';
