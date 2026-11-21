# Progresso

- Atualizado: 2026-11-20.
- Fase atual: **Fase 4 em andamento**, autorizada em ADR-010. Auditoria P01–P35 e documentação C46 entregues, com três correções. Fechamento ainda pendente de teste Android integrado e comprovação da tradução/decisão sobre sua indisponibilidade. Não criar tag fase-4 nem declarar release validada antes desse aceite.
- Último commit: correção de compatibilidade da biblioteca, commit que contém este registro; predecessor 9bb936d (C46/documentação). Restauração FreeWebNovel em e068531. Correção anterior 70a4caa (P14). Base fase-3/fase-3-f6 em 86c60b8; F5 c0b81aa, F4 44313b1. Sem push, deploy ou reescrita de histórico.
- Próximo passo: dono executar o roteiro do README/MOBILE no POCO com backend real e informar resultados/erros; tradução continua recebendo HTTP 429. Não repetir chamadas em lote ou trocar motor sem decisão explícita. Continuar correções dentro do escopo quando houver evidência nova.
- Autorizações: plano ADR-003; Docker local descartável de testes ADR-005; F3 ADR-006; F4 ADR-007; F5 e limites físicos ADR-008; F6/visual simples ADR-009; Fase 4 ADR-010. ADR-011 permite priorizar FreeWebNovel e somente provedores operacionais na versão inicial. Sem autorização para importar dados pessoais/publicar/deploy. Licença pública ainda não escolhida.

## Entregue nesta fase

| Item | Evidência |
|---|---|
| P14 — normalização de и/і | 70a4caa; regressão e comparação somente leitura com o legado: 1.296 caracteres sintéticos passaram de duas diferenças a zero; quatro casos de limpeza iguais. |
| P05/P13 — acesso FreeWebNovel | e068531; CONNECT_TO incompatível removido, DNS fixado por RESOLVE e Accept-Encoding explícito gzip/deflate. O caso autorizado retornou HTTP 200/gzip e 11.327 caracteres extraídos; metadados reais também passaram. Sem desativar TLS, SSRF, limites ou redirects controlados. |
| P01/P02 — abertura da biblioteca | Após relato Android, substituído toSorted por cópia + sort; teste simula método indisponível e verifica cache intacto. Reteste físico pendente. |
| Documentação C46 | README de instalação/config/dev/build/estrutura, VALIDACAO com 35 itens/evidências/pendências e MELHORIAS com mudanças e motivos. Documentos históricos distinguem estado anterior do aplicativo integrado. |

- Gate atual: Ruff/format/mypy/arquitetura/compileall; **192 testes backend** (180 unitários + 12 integrações reais locais), ESLint/20 casos das regras/TypeScript strict e **221 testes mobile**. Bundles Hermes Android/iOS do app integrado e Gitleaks de candidatos/histórico aprovados; staged conferido antes de cada commit.
- O teste Curl novo aplica opções ao libcurl real sem I/O, cobrindo incompatibilidade que os mocks não detectavam. Testes de redes privadas/redirects/limites continuam passando.
- Comparações executadas usam somente helpers puros do legado, sem importar seus serviços de banco, carregar dados pessoais ou modificar _legacy. Relatórios/URL de reprodução ficam somente em .private/phase4 e .private/translation-repro, ignorados. Nenhum texto do capítulo entrou no git.
- Fonte real positiva não comprova tradução. Controle isolado com o mesmo GoogleTranslator e cliente Curl guardado retornou 302→429; o produto mantém o mesmo tradutor e fallback por bloco. Não foi feita tradução completa bem sucedida nem sequência de tentativas contra o limite.

## Uso e teste disponíveis

O app principal já abre biblioteca, busca, detalhe, leitura, voz, filtros e downloads. Fluxos foram testados com Expo Router real e transporte/arquivos/fala sintéticos; os bundles não certificam execução física. F6 e seu importador opcional foram concluídos em 86c60b8; nenhuma importação pessoal foi executada.

Iniciar backend conforme README/API.md. Em Android físico, configurar VOXNOVEL_HOST=0.0.0.0 e EXPO_PUBLIC_API_URL com o endereço LAN da API, sem /api/v1, somente no .env ignorado do mobile; chaves ficam no backend. Na raiz: `yarn workspace @voxnovel/mobile start`; abrir QR no Expo Go compatível com SDK 58, mesma rede. A stack descartável é compartilhada pela suíte: usar somente dados de teste; destino pessoal deve ser separado.

O dono iniciou o teste do app principal e relatou TypeError na abertura da biblioteca: toSorted ausente no runtime. Corrigido para ordenar uma cópia via sort, com regressão que remove toSorted e verifica a ordem e a imutabilidade do cache. Aguardar nova execução no aparelho; a jornada completa ainda não está comprovada. Não repetir o pedido de dispensa S1 anterior; aguardar resultado do app principal. Harnesses speech:harness/reader:harness permanecem opcionais. Nenhum servidor Expo/API foi iniciado ou deixado aberto pelo agente nesta fase.

## Pendências e limites

- **Android integrado:** testar biblioteca/busca FreeWebNovel, leitura/voz, capítulo escolhido em downloads, offline e filtros, conforme README/MOBILE. Primeira execução revelou o crash de toSorted; corrigido, aguardando reteste e restante da jornada.
- **Tradução:** Google recusou a frase sintética por HTTP 429 nos controles. Original já tinha falha relatada; a causa no original não está comprovada. Não anunciar correção de tradução nem trocar tradutor automaticamente. Precisa de sucesso real posterior ou decisão explícita do dono sobre o limite.
- **Provedores:** dono relatou que somente FreeWebNovel funcionava no original e liberou foco nele. Acesso/metadados FreeWebNovel passaram no caso autorizado; outros sites não foram certificados nem anunciados como operacionais. Adaptadores preservados para compatibilidade, sem ampliar esforço/funcionalidades por padrão.
- **S1 parcial anterior:** POCO X5, voz pt-br-x-ptd-local (Enhanced), sucesso relatado em avanço ao capítulo 2, pausa/retomada, voz/velocidade, troca de app e bloqueio. Android/motor/Expo versus build/duração não informados; interrupções, voz sem rede/sem PT, saída e iOS pendentes. ADR-008 dispensou esses limites como impedimento F4→F5, sem transformá-los em testes aprovados.
- **S2/build nativo:** prebuild Android feito em F1; assembleDebug parou após 63 tarefas por resolução de Maven (ADR-004). Sem APK novo validado; iOS requer Apple/Xcode. Hermes/Jest não substituem build e aparelho.
- **Dados/licença/publicação:** sem importação pessoal, push/deploy ou concessão automática de licença. Arquivos antigos sem fonte comprovada ficam preservados; IMPORTACAO.md cobre apenas formatos conhecidos e aplicação explícita. Nenhum projeto remoto alterado.

## Continuidade

Ler AGENTS.md e este registro antes de qualquer ação em nova sessão. README, VALIDACAO.md e MELHORIAS.md são as entradas atuais; consultar ANALISE.md (contrato), PLANO_COMMITS.md, DECISIONS.md, WBS_STATUS.md, MOBILE.md, S1.md, API.md, PERSISTENCIA.md e IMPORTACAO.md para detalhes.

Stack descartável local em .private/voxnovel-f3-supabase, sem chaves no mobile. Integrações criam e removem somente dados/schema/bucket sintéticos. RLS/ACL/advisors locais auditados em F3; sem alteração remota. _legacy somente leitura e ignorado. Manter o foco no necessário para uso/portfólio; extras ficam para depois.
