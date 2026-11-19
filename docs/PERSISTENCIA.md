# Persistência — F2

C10: contratos de domínio com testes. C11: repositories e adaptador Supabase, com round-trip real validado em uma stack local descartável. O app ainda não tem rotas de biblioteca nem interface funcional de leitura; o primeiro fluxo disponível será avisado ao dono, com instruções.

Não usar projetos pessoais como ambiente de integração. O dono aprovou Docker apenas para testes locais descartáveis (ADR-005). A configuração e credenciais temporárias ficam fora do git. A stack não é vinculada a um projeto remoto.

O baseline de C11 foi incorporado em `apps/backend/src/repositories/migrations/20261118234557_atomic_library.sql`. A migration foi validada somente no banco local descartável. Tabelas têm RLS habilitado e acesso de dados restrito ao service_role do backend. Não há login de usuário final. C12 adiciona uma função SQL de gravação atômica, índice de slug normalizado e FK de pertença da fonte ativa. O rollback em `rollback_atomic_library.sql` remove essas adições e preserva tabelas, fontes e progresso de C11.

Com a stack local descartável já iniciada e o baseline aplicado, executar na raiz:

```sh
python3 scripts/check_integration.py --workdir DIRETORIO_DA_STACK
```

Para executar o gate completo com integração habilitada:

```sh
python3 scripts/check_integration.py --workdir DIRETORIO_DA_STACK --all-checks
```

O script consulta status local da CLI, verifica que a API é loopback e entrega as chaves apenas por ambiente ao processo filho. Não imprime chaves, não provisiona schema e não modifica projetos remotos. Configure Gitleaks no PATH ou por GITLEAKS_BIN para o gate completo.

A suíte comum sem configuração de persistência marca integração como não executada. Esse skip não fecha F2: o bloco exige execução real. Em C11 foram verificados criação/leitura, duplicatas normalizadas, atualização de fonte sem trocar ID, preservação de IDs RoyalRoad, troca/progresso por fonte, bloqueio da última remoção e exclusão com limpeza das fontes.

As consultas permanecem nos repositories e o SDK de rede no adaptador. O checker distingue o método HTTP `execute` do SDK de SQL: imports de clientes SQL e instruções SQL continuam proibidos fora dos repositories. Há testes para a distinção entre a ação textual `select` do protocolo e uma query SQL real.

## Evidências de C12

- Cinco testes reais: round-trip do domínio, criação parcialmente inválida sem resíduos, duas remoções concorrentes preservando a última fonte e rejeição de fonte ativa de outra obra e unicidade de slug normalizado no banco.
- Uma obra sintética com duas fontes e capítulos diferentes permaneceu idêntica antes/depois de rollback e reaplicação; o sentinela foi removido ao final.
- Advisors locais sem achados. Funções SECURITY INVOKER, search_path explícito, RLS ativo, sem EXECUTE de escrita para anon/authenticated; service_role recebe somente CRUD nas tabelas da aplicação.
- A extração `db pull` da CLI ficou indisponível por falha no banco-sombra. O arquivo final combina o baseline versionado de C11 com as funções extraídas por pg_dump do banco testado. ACLs globais da plataforma foram excluídas. Não houve reparo/alteração em histórico remoto nem alteração de banco pessoal.

O bootstrap/upgrade deve aplicar a migration com transação e ON_ERROR_STOP. Nunca executar rollback em dados pessoais como forma de teste. O teste de integração requer a migration de C12, e não apenas o baseline histórico de C11.

## Filtros e velocidade (C13)

A migration `20261119002243_preferences.sql` acrescenta dois singletons privados, com RLS e CRUD exclusivo do backend. Listas e velocidade padrão vêm de `core/config.py` e podem ser configuradas por ambiente. O bootstrap ignora conflitos para não substituir preferências já gravadas; listas vazias permanecem vazias. Remoção usa tipo e valor exato, e regex inválida é rejeitada antes da gravação. Erros de persistência são propagados, sem confirmar salvamento inexistente.

A migration é aditiva e reaplicável. Para voltar o código a C12, mantenha as duas tabelas: C12 não as usa e as preferências permanecem disponíveis ao reaplicar C13. Não há down destrutivo de preferências pessoais. Testes limpam somente as linhas sintéticas da stack descartável.

Evidência C13: 54 testes backend passaram, incluindo seis integrações reais; reaplicação da migration preservou sentinelas de filtros/velocidade, removidos ao final, e advisors locais não apontaram achados.

## Texto remoto (C14)

`ChapterTextRepository` preserva o caminho `{novel_id}/cap_{chapter}.json` e o formato de valor `{"cap": 1, "texto": "..."}`. `ChapterText` é um valor de cache, não uma entidade de banco com data artificial. O adaptador Storage pagina listagens e agrupa remoções; somente nomes de capítulos JSON válidos são considerados. Não grava áudio nem cria jobs ou tabela de capítulos. O isolamento adicional por fonte continua pendente no plano, sem migração de cache pessoal neste bloco.

O bucket vem de `VOXNOVEL_SUPABASE_TEXT_BUCKET` e deve ser provisionado previamente como **privado**, aceitando `application/json`. O backend não cria buckets na inicialização e não publica URLs do conteúdo. Somente o backend usa service_role. Testes criam e removem seu próprio bucket com nome aleatório na stack local, sem usar o bucket pessoal configurado.

O SDK retorna `not_found` tanto em alguns erros de objeto quanto de bucket. Somente a ausência identificada de objeto retorna cache miss; bucket ausente, erro de rede, JSON inválido ou capítulo divergente geram erro tipado. Como o endpoint de listagem pode retornar vazio para bucket inexistente, o adaptador verifica o bucket antes de paginar. A integração verifica conteúdo UTF-8, substituição, listagem multipágina, remoção de capítulo/obra, isolamento entre obras e bloqueio da URL pública. O bucket sintético é esvaziado e excluído no finally.

Referências de API conferidas: [upsert](https://supabase.com/docs/reference/python/upsert), [upload](https://supabase.com/docs/reference/python/storage-from-upload), [listagem](https://supabase.com/docs/reference/python/storage-from-list) e [download](https://supabase.com/docs/reference/python/storage-from-download). O contrato também foi verificado no SDK instalado e na stack real.

## Portão F2

Gate final: 62 testes backend, sendo 55 unitários e sete integrações reais, além de lint/tipos/Jest mobile, exportações Hermes Android/iOS, arquitetura e varredura de segredos. WBS_STATUS registra somente as partes adaptadas. Nenhum dado pessoal foi importado e nenhum projeto remoto foi alterado.

A stack temporária é encerrada após o gate, preservando seus volumes locais. Para repetir, iniciar a mesma stack privada com a CLI e aplicar as duas migrations (primeiro biblioteca, depois preferências) com transação/ON_ERROR_STOP. A integração cria seu próprio bucket privado; não é preciso provisionar o bucket de produto para rodá-la. O diretório da stack e suas credenciais não são versionados. O app ainda não oferece um fluxo funcional de leitura; a API de produto será composta em F3 e a interface nos blocos mobile.
