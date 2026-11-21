create schema :"import_schema";
create table :"import_schema".novels (like public.novels including all);
create table :"import_schema".sources (like public.sources including all);
create table :"import_schema".filters (like public.filters including all);
create table :"import_schema".preferences (like public.preferences including all);
alter table :"import_schema".sources add foreign key(novel_id) references :"import_schema".novels(id) on delete cascade;
alter table :"import_schema".novels add foreign key(id,active_source_id) references :"import_schema".sources(novel_id,id) deferrable initially deferred;
