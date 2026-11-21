select jsonb_build_object(
 'novels',(select count(*) from :"import_schema".novels),
 'sources',(select count(*) from :"import_schema".sources),
 'progress',(select jsonb_agg(current_chapter order by provider) from :"import_schema".sources),
 'speed',(select speed from :"import_schema".preferences where id=1),
 'empty_filters',(select words='[]'::jsonb and phrases='[]'::jsonb and regex='[]'::jsonb from :"import_schema".filters where id=1)
);
