# Importação privada opcional

C45 fornece uma ferramenta manual. Nenhum dado pessoal foi importado e o app
não executa migração ao iniciar. Começar uma biblioteca nova não exige esta etapa.

## Entrada e simulação

Preparar uma exportação privada consistente, sem alterar a origem. O arquivo
combina biblioteca/fontes, filtros e configuração; downloads remotos são opcionais.
A ferramenta não acessa o banco original nem descobre arquivos no celular.

Na raiz, com o ambiente Poetry do backend instalado:

```sh
python3 scripts/import_legacy.py .private/legacy-export.json
python3 scripts/import_legacy.py .private/legacy-export.json --output .private/import-preview
```

O modo padrão valida somente o arquivo local, sem conectar ao destino. Exibe
apenas contagens. A saída opcional deve ser um diretório novo, ignorado pelo git
ou fora do repositório. A ferramenta restringe saídas dentro do repositório a
.private, impede escrita em _legacy/.git e usa permissões 700/600. Backups,
manifestos, mapa de IDs, SQL e diagnósticos privados não devem ser publicados.

Formato `voxnovel-legacy-api-v1`, com os campos observados na API original:

```json
{
  "format": "voxnovel-legacy-api-v1",
  "exported_at": "2026-11-20T00:00:00Z",
  "obras": [{
    "id": "11111111-1111-4111-8111-111111111111",
    "slug": "synthetic",
    "obra": "Obra de exemplo",
    "pagina_atual": 1,
    "fonte_ativa": "22222222-2222-4222-8222-222222222222",
    "fontes": [{
      "id": "22222222-2222-4222-8222-222222222222",
      "provider": "Synthetic",
      "title": "Obra de exemplo",
      "url_base": "https://source.example/book",
      "pagina_atual": 1
    }]
  }],
  "filtros": {"palavras": [], "frases": [], "regex": []},
  "config": {"velocidade": 1.5},
  "downloads": []
}
```

Metadados opcionais de fonte: slug, chapter_url_pattern, chapter_ids, total_caps,
image_url e created_at. Obra aceita image_url e total_caps. Filtros/config ausentes
não são importados; listas explicitamente vazias são preservadas. Exported_at
precisa ter fuso. Não há escolha automática entre versões conflitantes.

Também é aceito `voxnovel-legacy-tables-v1`: obras sem fontes aninhadas, fontes
em uma lista externa com obra_id e listas singleton filtros/config com id=1.
Campos created_at/updated_at conhecidos são aceitos nas linhas de tabela. Campos
ou formatos desconhecidos abortam. Um arquivo antigo sem esse contrato não é
convertido por tentativa; preservar a cópia original e revisar o formato.

UUIDs compatíveis são preservados; IDs antigos diferentes recebem UUIDs
determinísticos no mapa privado. Fonte ativa precisa pertencer à obra e manter
progresso coerente com ela. IDs/progresso inválidos, fontes órfãs, duplicatas e
regex inválida interrompem a validação. A ordem das fontes exportadas é mantida
na criação quando não há created_at original, sem escolher progresso por data.

## Conferir e aplicar ao destino escolhido

Exige clientes PostgreSQL psql/pg_dump disponíveis e conexão definida somente
no ambiente privado do backend: VOXNOVEL_LEGACY_IMPORT_DATABASE_URL. Os comandos
podem ser configurados como arrays JSON por VOXNOVEL_LEGACY_PSQL_COMMAND e
VOXNOVEL_LEGACY_PG_DUMP_COMMAND. Não usam shell; conexão passa por ambiente e
não é impressa. Credenciais nunca entram em EXPO_PUBLIC_*.

O destino precisa ter as migrations de PERSISTENCIA.md aplicadas. Usar um banco
separado da stack descartável dos testes. Parar as escritas da API durante a
migração. A checagem do destino usa uma transação encerrada com rollback:

```sh
python3 scripts/import_legacy.py .private/legacy-export.json --check-destination --output .private/import-check
```

O relatório conta criar/ignorar; valores diferentes no destino causam conflito.
Não existe sobrescrita ou preferência presumida pela data. Após revisar a entrada,
o SQL, os conflitos e os backups, a operação explícita é:

```sh
python3 scripts/import_legacy.py .private/legacy-export.json --apply --output .private/import-run
```

Apply exige diretório novo, verifica conflitos e faz backup dos dados public do
destino antes de escrever. Os registros são inseridos em uma única transação;
repetir uma entrada idêntica ignora registros existentes. source-backup.json
preserva os bytes recebidos, normalized.json os valores validados, id-map.json
os identificadores e report.json o estado/contagens. diagnostics.txt, quando
existe, pode conter detalhes privados do cliente PostgreSQL.

Downloads remotos opcionais têm forma `{ "obra_id": "ID antigo", "cap": 1,
"texto": "texto exportado" }`. São validados e comparados antes de qualquer
escrita. Arquivos idênticos são ignorados; diferentes/corrompidos abortam.
O bucket privado configurado precisa existir e pertencer ao mesmo destino da conexão PostgreSQL. Arquivos novos usam criação sem
sobrescrita, com journal privado, antes da transação dos registros. Se a transação
falhar, a ferramenta tenta remover somente os objetos novos que criou.
[Referência do upload Python](https://supabase.com/docs/reference/python/storage-from-upload).

Os arquivos offline do Android antigo não são lidos ou atribuídos a fontes
automaticamente. Sem exportação/proveniência confiável, permanecem preservados;
a ferramenta não recria capítulos buscando novamente na rede.

## Recuperação e evidências

Se houver falha/interrupção, conferir report.json e os objetos registrados em
created_texts. cleanup_required indica remoção compensatória pendente. Se o
processo terminou depois do commit e antes do relatório final, o destino pode
já conter a importação: conferir novamente a mesma entrada em modo de checagem,
sem presumir rollback. Uma nova execução idêntica em diretório novo pode concluir
objetos/registros faltantes; conflitos exigem decisão do dono.

O backup SQL é data-only. Recuperação completa exige banco vazio com as migrations
correspondentes e restauração manual revisada; não aplicar o dump por cima de
registros em uso. Não há exclusão ou restauração automática de todo o destino.
[Referência do pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html).

A verificação usa somente dados sintéticos: validação/privacidade e orquestração
com I/O injetado; SQL real em schema local isolado para idempotência, rollback,
progresso por fonte, filtros vazios e velocidade; bucket local privado para
comprovar criação sem sobrescrita. O launcher foi exercitado em dry-run privado.
Isso não certifica uma exportação pessoal ainda não fornecida ou uma execução
pessoal de pg_dump/aplicação. O agente não executou --apply com dados pessoais.
