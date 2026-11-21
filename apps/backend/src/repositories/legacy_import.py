"""Generate a private transactional import; all SQL stays in repositories."""

import hashlib
import json
import re
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from src.repositories.chapter_text import TextStorage
    from src.services.legacy_import import ImportPlan


def import_sql(
    plan: "ImportPlan", *, apply: bool = False, schema: str = "public"
) -> str:
    if not re.fullmatch(r"[a-z][a-z0-9_]*", schema):
        raise ValueError("Invalid target schema.")
    payload = {
        "novels": [
            novel.model_dump(mode="json", exclude={"sources"}) for novel in plan.novels
        ],
        "sources": [
            {
                **source.model_dump(mode="json"),
                "created_at": plan.source_created_at[str(source.id)].isoformat(),
            }
            for novel in plan.novels
            for source in novel.sources
        ],
        "filters": [{"id": 1, **plan.filters.model_dump()}] if plan.filters else [],
        "preferences": [{"id": 1, **plan.speed.model_dump()}] if plan.speed else [],
    }
    raw = json.dumps(payload, ensure_ascii=True, sort_keys=True)
    tag = "$_vox_" + hashlib.sha256(raw.encode()).hexdigest() + "_$"
    while tag in raw:
        tag = tag[:-1] + "_$"
    literal = "'" + raw.replace("'", "''") + "'::jsonb"
    checks: list[str] = []
    inserts: list[str] = []
    counts: list[str] = []
    columns = {
        "novels": (
            "id,title,slug,current_chapter,image_url,total_chapters,"
            "active_source_id,updated_at"
        ),
        "sources": (
            "id,novel_id,provider,title,slug,url_base,chapter_url_pattern,"
            "chapter_ids,total_chapters,image_url,current_chapter,"
            "created_at,updated_at"
        ),
        "filters": "id,words,phrases,regex",
        "preferences": "id,speed",
    }
    for table, names in columns.items():
        checks.append(f"""
if exists(select 1 from {schema}.{table} t
 join jsonb_array_elements(data->'{table}') n on t.id::text=n->>'id'
 where (to_jsonb(t)-'created_at'-'updated_at')
 is distinct from (n-'updated_at'-'created_at'))
then raise exception 'Import conflict in {table}'; end if;
""")
        for action, condition in (("create", "not exists"), ("ignore", "exists")):
            counts.append(f"""'{table}_{action}', (
 select count(*) from jsonb_array_elements(data->'{table}') n
 where {condition}(select 1 from {schema}.{table} t where t.id::text=n->>'id'))
""")
        inserts.append(f"""
insert into {schema}.{table} ({names})
select {",".join("r." + name for name in names.split(","))}
from jsonb_populate_recordset(null::{schema}.{table},data->'{table}') r
on conflict(id) do nothing;
""")
    duplicate_check = f"""
if exists(select 1 from {schema}.novels t join jsonb_array_elements(data->'novels') n
 on public.voxnovel_normalized_slug(t.slug)=public.voxnovel_normalized_slug(n->>'slug')
 where t.id::text<>n->>'id') then raise exception 'Import slug conflict'; end if;
"""
    # Only counts reach psql stdout; the generated SQL file stays private.
    writes = "\n".join(inserts) if apply else ""
    report_sql = f"""select jsonb_build_object({",".join(counts)})
from (select {literal} data) input;"""
    finish = (
        f"""do {tag}
declare data jsonb := {literal};
begin
{writes}
end;
{tag};
commit;
"""
        if apply
        else "rollback;\n"
    )
    return (
        f"""begin;
set local standard_conforming_strings=on;
lock table {schema}.novels,{schema}.sources,
 {schema}.filters,{schema}.preferences in share row exclusive mode;
do {tag}
declare data jsonb := {literal};
begin
{duplicate_check}
{"".join(checks)}
end;
{tag};
{report_sql}
"""
        + finish
    )


def inspect_import_texts(
    storage: "TextStorage", plan: "ImportPlan"
) -> list[tuple[str, bytes]]:
    from src.core.import_errors import LegacyImportError
    from src.repositories.chapter_text import ChapterText

    missing: list[tuple[str, bytes]] = []
    for item in plan.texts:
        path = f"{item.novel_id}/cap_{item.chapter}.json"
        expected = ChapterText(chapter=item.chapter, text=item.text)
        existing = storage.download(path)
        if existing is not None:
            if ChapterText.model_validate_json(existing) != expected:
                raise LegacyImportError("Exported text conflicts with the destination.")
        else:
            missing.append((path, expected.model_dump_json(by_alias=True).encode()))
    return missing
