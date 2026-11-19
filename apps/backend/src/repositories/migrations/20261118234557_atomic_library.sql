-- Data-preserving upgrade from the C11 baseline; functions extracted from the verified local schema.
-- C11 library baseline. Apply only to an explicitly selected VoxNovel database.
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

do $constraints$
begin
 if not exists(select 1 from pg_constraint where conname='sources_novel_id_id_unique' and conrelid='public.sources'::regclass) then
  alter table public.sources add constraint sources_novel_id_id_unique unique(novel_id,id);
 end if;
 if not exists(select 1 from pg_constraint where conname='novels_active_source_owner_fk' and conrelid='public.novels'::regclass) then
  alter table public.novels add constraint novels_active_source_owner_fk foreign key(id,active_source_id) references public.sources(novel_id,id) deferrable initially deferred;
 end if;
end;
$constraints$;
CREATE OR REPLACE FUNCTION public.voxnovel_normalized_slug(input text) RETURNS text
    LANGUAGE plpgsql SECURITY INVOKER IMMUTABLE STRICT
    SET search_path TO 'pg_catalog', 'public'
    AS $_$
declare result text := lower(trim(input)); previous text;
begin
 loop
  previous := result;
  result := regexp_replace(result, '-(light-novel|web-novel|web-manga|light-manga|novel|manga|manhwa|manhua|webtoon|comic|online|web|light|[0-9]+)$', '');
  exit when previous = result;
 end loop;
 return result;
end;
$_$;

CREATE OR REPLACE FUNCTION public.voxnovel_write_library(p_operation text, p_novel_id uuid, p_values jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
declare
 book public.novels%rowtype;
 source_data jsonb;
 source_id uuid;
 chapter integer;
 source_count integer;
begin
 if p_operation = 'create' then
  insert into public.novels(id,title,slug,current_chapter)
   values(p_novel_id,p_values->>'title',p_values->>'slug',coalesce((p_values->>'current_chapter')::integer,1));
  for source_data in select value from jsonb_array_elements(coalesce(p_values->'sources','[]'::jsonb)) loop
   perform public.voxnovel_write_library('add_source',p_novel_id,source_data);
  end loop;
  return p_novel_id;
 end if;
 select * into book from public.novels where id=p_novel_id for update;
 if not found then raise exception 'Novel not found' using errcode='P0002'; end if;
 if p_operation = 'add_source' then
  insert into public.sources(id,novel_id,provider,title,slug,url_base,chapter_url_pattern,chapter_ids,total_chapters,image_url,current_chapter,created_at)
  values(gen_random_uuid(),p_novel_id,p_values->>'provider',p_values->>'title',coalesce(p_values->>'slug',book.slug),p_values->>'url_base',p_values->>'chapter_url_pattern',
   case when jsonb_typeof(p_values->'chapter_ids')='array' then array(select value::integer from jsonb_array_elements_text(p_values->'chapter_ids')) else null end,
   (p_values->>'total_chapters')::integer,p_values->>'image_url',coalesce((p_values->>'current_chapter')::integer,book.current_chapter),clock_timestamp())
  on conflict(novel_id,provider) do update set
   title=excluded.title,slug=excluded.slug,url_base=excluded.url_base,chapter_url_pattern=excluded.chapter_url_pattern,
   chapter_ids=excluded.chapter_ids,total_chapters=excluded.total_chapters,image_url=excluded.image_url,
   current_chapter=coalesce((p_values->>'current_chapter')::integer,public.sources.current_chapter),updated_at=now()
  returning id into source_id;
  update public.novels set active_source_id=coalesce(active_source_id,source_id),updated_at=now() where id=p_novel_id;
 elsif p_operation = 'progress' then
  chapter := (p_values->>'chapter')::integer;
  if chapter is null or chapter < 1 then raise exception 'Invalid chapter' using errcode='22023'; end if;
  update public.sources set current_chapter=chapter,updated_at=now() where id=book.active_source_id and novel_id=p_novel_id;
  update public.novels set current_chapter=chapter,updated_at=now() where id=p_novel_id;
 elsif p_operation in ('activate_source','remove_source') then
  source_id := (p_values->>'source_id')::uuid;
  perform 1 from public.sources where id=source_id and novel_id=p_novel_id;
  if not found then raise exception 'Source not found' using errcode='P0002'; end if;
  if p_operation='activate_source' then
   update public.novels set active_source_id=source_id,updated_at=now() where id=p_novel_id;
  else
   select count(*) into source_count from public.sources where novel_id=p_novel_id;
   if source_count<=1 then raise exception 'Last source cannot be removed' using errcode='22023'; end if;
   if book.active_source_id=source_id then
    update public.novels set active_source_id=(select id from public.sources where novel_id=p_novel_id and id<>source_id order by created_at,id limit 1),updated_at=now() where id=p_novel_id;
   end if;
   delete from public.sources where id=source_id and novel_id=p_novel_id;
  end if;
 elsif p_operation='delete' then
  delete from public.novels where id=p_novel_id;
 else
  raise exception 'Invalid operation' using errcode='22023';
 end if;
 return p_novel_id;
end;
$$;
CREATE UNIQUE INDEX IF NOT EXISTS novels_normalized_slug_unique ON public.novels(public.voxnovel_normalized_slug(slug));
REVOKE ALL ON public.novels, public.sources FROM anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.novels, public.sources TO service_role;
REVOKE ALL ON FUNCTION public.voxnovel_normalized_slug(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.voxnovel_write_library(text,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.voxnovel_normalized_slug(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.voxnovel_write_library(text,uuid,jsonb) TO service_role;
NOTIFY pgrst, 'reload schema';
