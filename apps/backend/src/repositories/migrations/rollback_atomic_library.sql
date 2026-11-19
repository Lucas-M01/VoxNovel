-- Revert atomic-write additions while retaining the C11 tables and their data.
DROP FUNCTION IF EXISTS public.voxnovel_write_library(text,uuid,jsonb);
ALTER TABLE public.novels DROP CONSTRAINT IF EXISTS novels_active_source_owner_fk;
ALTER TABLE public.sources DROP CONSTRAINT IF EXISTS sources_novel_id_id_unique;
DROP INDEX IF EXISTS public.novels_normalized_slug_unique;
DROP FUNCTION IF EXISTS public.voxnovel_normalized_slug(text);
NOTIFY pgrst, 'reload schema';
