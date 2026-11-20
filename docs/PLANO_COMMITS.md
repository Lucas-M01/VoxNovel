# Fase 2 — Plano de commits

Data: 2026-11-18. Estado: **aprovado pelo dono** em 2026-11-18 (“Aprovo o plano para iniciar”). Execução autorizada de C01–C09; parar no portão F1. Fase 1 também aprovada nesta data.

## 1. Contrato e escolhas propostas

- Escopo: P01–P35 de ANALISE.md. Correções RoyalRoad, capítulo inicial no player e cache por fonte foram aceitas com a aprovação das propostas padrão; ficam em commits de melhoria separados. Limpeza visual e fala continuam distintas. Capacidades de config/logs/downloads/filtros são preservadas em rotas EN sob `/api/v1`, sem aliases PT nem endpoints de debug.
- Estrutura: `apps/backend/src/{core,api/v1,services,repositories,adapters}` e `apps/mobile/src/{core,ui,pattern,layouts,features,screens}` somente conforme surgirem módulos reais. Arquivos de navegação Expo Router compõem telas finas. Sem gerar pastas vazias ou barrel exports.
- Backend: FastAPI, configuração Pydantic Settings e dependências mínimas com Poetry/lockfile. Manter GoogleTranslator via engine própria e Supabase existente via adaptador de transporte e repositories; não adicionar SQLModel/Alembic apenas para duplicar a persistência já fornecida pelo SDK. SQL eventualmente necessário para integridade fica junto dos repositories em migrations versionadas. Chamadas de SDK com I/O também devem respeitar a fronteira de adaptadores; repositories contêm consultas/regras de persistência, sem chamar SDK de rede diretamente fora dessa fronteira.
- Mobile: Expo/React Native/React resolvidos como conjunto compatível no spike S3; TanStack Query e Zod para HTTP/estado de servidor/validação, estado local para preferências temporárias e player. Usar Zustand apenas onde o compartilhamento real exigir. FileSystem para texto e cache da biblioteca, speech para voz, NetInfo para disponibilidade. Sem WatermelonDB, MMKV, track-player, sessão Auth ou EventBus sem consumidores.
- Concorrência: scraping/tradução executados fora do event loop quando a biblioteca for síncrona, com limite e cancelamento/orçamento por requisição; sem Redis/ARQ, jobs remotos ou polling de jobs. Downloads continuam coordenados no mobile, grupos de cinco e máximo de 50. Não substituir grupos de cinco por processamento sequencial visível sem decisão.
- Persistência: manter obras/fontes/progresso, filtros/config de uso único e cache remoto de texto. Não criar histórico, profiles ou progresso offline durável. Provisionamento remoto não faz parte deste plano: migrations serão revisáveis e testadas antes de qualquer aplicação em dados reais.
- Licença: o commit inicial inclui os arquivos de organização e registra a situação de licença; **não conceder licença pública sem escolha expressa do dono**. Se não houver licença escolhida até a execução, documentar que não há licença pública concedida, sem atribuir uma licença de terceiros. Isso não impede a organização do repositório.
- Versões da análise são candidatos consultados, não pins definitivos. Antes de instalar, confirmar documentação oficial/Context7 e compatibilidade, inclusive suporte de speech/FileSystem no SDK escolhido. Se o spike exigir infraestrutura/motor fora do escopo, registrar e parar para decisão.

## 2. Histórico, rodapés e verificações por commit

Mensagens abaixo são títulos previstos. Cada commit contém uma única mudança lógica, implementação e testes pertinentes. IDs WBS de pacote composto cobrem **apenas** a fração de paridade indicada; até cinco IDs por commit. O mesmo ID pode ser reconstruído em mais de um commit coeso.

Rodapé obrigatório para reconstrução: `Parity: Pxx, Pyy`. Para organização/qualidade/correção: `Improvement: dx`, `Improvement: quality`, `Improvement: security` ou `Improvement: performance`, conforme a linha. Acrescentar `WBS: ...` quando houver correspondência real. Correção aprovada usa Improvement e pode acrescentar referência aos itens P afetados no corpo. Não misturar reconstrução e melhoria no mesmo commit.

Antes de **cada** commit, executar todos os checks já aplicáveis ao checkout:

| Controle | Comando previsto após fundação | Critério |
|---|---|---|
| Backend | Poetry: `ruff check .`, `ruff format --check .`, `mypy src tests`, `pytest` em apps/backend | Sem erros; testes independentes da rede por padrão |
| Mobile | Scripts workspace `lint`, `typecheck`, `test --runInBand` | ESLint boundaries e regras locais, `tsc --noEmit`, Jest sem watch |
| Build | Export/bundle Expo e compilação/import smoke backend; build nativo nos marcos que alteram módulos/config nativa | Artefatos temporários fora do git e nenhuma dependência futura inexistente |
| Segredos | Gitleaks ou equivalente sobre todos os arquivos candidatos ao commit, inclusive não rastreados; depois histórico quando existir | Não imprimir valores sensíveis; bloquear segredo/caminho pessoal |
| Diff | `git diff --check` e revisão do conteúdo staged | Sem dados pessoais, _legacy ou artefatos de máquina |

C01–C04 são exclusivamente organização/documentação, antes de existir produto: suites backend/mobile/build são **não aplicáveis**, nunca reportadas como passando. Scan e revisão continuam obrigatórios. C05 cria backend e sua suíte mínima real; a partir dele controles backend obrigatórios. C07 cria mobile e seus controles básicos executáveis; C08 endurece convenções. Nenhuma suíte será burlada com `--no-verify`, teste vazio, cast de conveniência ou mocks que se façam passar por integração real.

Testes de integração Supabase não podem ser considerados aprovados apenas com mock. Repositórios têm testes unitários sem rede e testes de contrato/integração em banco/projeto descartável configurado por ambiente. Se esse ambiente não estiver disponível, registrar pendência e não fechar o bloco F2 nem validar migrations como aprovadas. Nenhum teste toca o projeto pessoal ou dados reais do protótipo. A escolha de uma estratégia diferente exige registrar evidência e revisar o plano, sem introduzir Docker automaticamente.

Testes novos de funcionalidade ficam no mesmo commit da funcionalidade. Melhorias alteram código e seus testes no próprio commit. Docs de continuidade acompanham o último commit lógico de cada bloco, sem criar commits vazios de checkpoint.

## 3. Sequência — preparação e F1: fundação

“F1–F6” nesta seção são blocos técnicos da **Fase 3 — execução**, não substituem as Fases 1/2/4 do AGENTS.md.

| Commit | Título em inglês | WBS | Paridade / classe | Entrega e aceite específico |
|---|---|---|---|---|
| C01 | `chore(infra): establish repository hygiene` | 1.1.3 | P01–P35 como suporte; Improvement: dx | .gitignore, .editorconfig e situação de licença; ignorar segredos, instalações, builds e dados. Confirmar _legacy excluído sem add -f. |
| C02 | `docs(docs): preserve architecture references` | — | P01–P35 como suporte; Improvement: dx | Versionar apenas docs/spec fornecidos, após scan; conteúdo continua referência subordinada à paridade. |
| C03 | `docs(docs): record approved parity analysis and decisions` | — | P01–P35 como suporte; Improvement: dx | AGENTS, ANALISE, PROGRESS, DECISIONS, WBS_STATUS e BACKLOG; somente decisões realmente aprovadas, sem incluir plano ainda não aprovado. |
| C04 | `docs(docs): record the approved reconstruction plan` | — | P01–P35 como suporte; Improvement: dx | Versionar este plano após aprovação; registrar portões, evidências exigidas e licença pendente, se houver. |
| C05 | `build(backend): establish the configured API workspace` | 1.1.2, 1.2.1, 1.2.3, 1.2.4, 1.2.5 | P33/P34 como suporte; Improvement: dx | Runtime mínimo, Settings, app factory e suíte real de config/startup com Ruff/mypy/pytest. Ambiente documentado com placeholders; nenhuma credencial ou chamada remota no import. |
| C06 | `chore(backend): enforce backend architecture boundaries` | 1.2.6, 1.2.7 | P13/P26/P33/P34 como suporte; Improvement: quality | Env.example backend, exceções tipadas/RFC 7807, fiscalização de config/SQL/I/O e testes de violação da arquitetura com exemplos sintéticos. |
| C07 | `build(mobile): establish the typed Expo workspace` | 1.1.1, 1.4.1, 1.4.2, 1.4.3, 1.4.11 | P01 como suporte; Improvement: dx | Workspace, strict, aliases, Router com entrada mínima compilável e testes de render/config; lint/tsc/Jest básicos ativos já neste commit. Resolver versões mínimas e lock, sem desenhar telas futuras. |
| C08 | `chore(mobile): enforce layer and TypeScript conventions` | 1.4.4, 1.4.10 | P01–P35 como suporte; Improvement: quality | Boundaries; proibir interface/casts/barrels/imports relativos entre camadas e efeitos para fetch/mutation/estado derivado. Regras verificáveis e sem pasta vazia. |
| C09 | `ci(infra): run repository quality and secret checks` | 8.3.1, 8.3.2 | P01–P35 como suporte; Improvement: quality | Scripts comuns e CI mínimo para ambas as suites/scan; sem deploy. Smoke bundle mobile e backend; S3 documentado. S2 testa conjunto nativo necessário sem exigir libs ausentes. |

As bibliotecas de conteúdo/rede/voz serão instaladas apenas quando o primeiro consumidor real surgir. Configurações adicionais de env.example acompanham o commit consumidor, não antecipam infra fora do contrato.

Portão F1: checks existentes completos, S3 resolvido, caminho de build escolhido e S2 executado ou limitação explicitada. Não declarar build nativo validado sem execução. Mostrar log C01–C09 e parar.

## 4. F2: persistência do domínio existente

| Commit | Título em inglês | WBS | Paridade / classe | Entrega e aceite específico |
|---|---|---|---|---|
| C10 | `feat(backend): define library and source data contracts` | 2.1.3, 2.1.4, 2.1.7 | P06/P08/P09/P26 | Modelos de domínio/DTOs para obra/fonte/progresso, IDs de capítulo quando fornecidos, updated_at e validações; sem campos que criem funções novas. Testar invariantes e payloads sintéticos. |
| C11 | `feat(backend): persist novels sources and reading progress` | 2.1.1, 2.3.1, 2.3.2 | P06/P08/P09/P10/P26 | Adaptador Supabase e repositories: criar/listar/obter/deletar, duplicata normalizada, fonte ativa e capítulo próprio; testes unitários + integração isolada. |
| C12 | `fix(backend): make library updates atomic` | 2.2.1, 2.2.2, 2.2.3 | P06/P08/P09/P26; Improvement: quality | Migrações mínimas da estrutura existente/updated_at e operações atômicas necessárias; validar pertença de fonte e rollback de falhas parciais em ambiente descartável. Sem Auth/profiles. SQL só no módulo de persistência, não nos routers. |
| C13 | `feat(backend): persist global filters and speed settings` | 2.1.9 | P16/P17/P32/P33 | Repository de filtros/config singleton, manter ausência distinta de listas vazias e velocidade inicial; testar round-trip e erro de gravação. Config tem extensão de paridade sem pacote específico. |
| C14 | `feat(backend): persist remote chapter text downloads` | 2.3.4, 2.3.7 | P35 | Adaptador Storage e repository de texto: cache hit, listar/ler/remover capítulo/obra; formato JSON e falhas claras. Sem AudioCache, DownloadJob ou banco de capítulos novo. |

Os IDs 2.2.x são adaptados para migrations da persistência Supabase já existente, sem instalar Alembic só por constar da WBS. FKs de auth.users, tabela User, stats e schema WatermelonDB permanecem fora.

Portão F2: round-trip e falhas/atomicidade verificados no ambiente descartável; migrations aplicam e revertem/restauram conforme estratégia documentada; suites completas. Mostrar log C10–C14 e parar. A aplicação em dados pessoais não ocorre neste bloco.

## 5. F3: conteúdo e API backend

| Commit | Título em inglês | WBS | Paridade / classe | Entrega e aceite específico |
|---|---|---|---|---|
| C15 | `fix(backend): constrain scraper network access` | 3.3.1, 3.3.9 | P05/P13; Improvement: security | Adaptador de rede com política SSRF para todos os transportes: resolver/verificar destino no connect e redirects, IPv4/IPv6, metadata, limites de bytes/tempo/redirects e retries. Testes com DNS/transportes simulados, sem acessar IP privado real. Nenhuma rota de scraping antes desta proteção. |
| C16 | `feat(backend): extract and clean chapter content` | 3.2.1, 3.2.2, 3.2.3, 3.3.7 | P13/P14/P17 | Heurística HTML, títulos, limpeza compartilhada, marcas d'água/homóglifos e filtros globais antes da tradução; fixtures sintéticas com resultados observados e testes de listas vazias. Sem glossário/seletor CSS/templates novos. |
| C17 | `feat(backend): identify FreeWebNovel and CentralNovel sources` | 3.3.4, 3.3.12 | P04/P05 | Parsers específicos e busca por nome por slug nos dois sites; fixtures sanitizadas e testes de ausência/erro. CentralNovel antecipado por paridade. |
| C18 | `feat(backend): identify NovelFire and RoyalRoad sources` | 3.3.5, 3.3.6 | P05/P12 | Metadados e lista ordenada de IDs RoyalRoad; transportes necessários atrás da mesma proteção de C15, testes determinísticos. Não alegar bypass infalível de Cloudflare. |
| C19 | `feat(backend): resolve chapter URLs and generic metadata` | 3.3.1, 3.3.7, 3.3.8 | P05/P11 | Router de providers por hostname validado, genérico, detecção/montagem dos formatos existentes; sem score/fallback entre fontes. Casos de hífen/barra/query/fallback. |
| C20 | `feat(backend): translate chapter text with GoogleTranslator` | 3.4.1, 3.4.4 | P15 | Engine para tradução auto→PT em blocos de 4500, fallback por bloco e espaçamento; testes com tradutor injetado e erro parcial. Sem MarianMT/OpenAI. |
| C21 | `feat(backend): expose library source and progress routes` | 3.1.3, 3.7.1, 3.7.2, 3.7.9 | P04/P05/P06/P07/P08/P09/P10/P11/P26 | API EN `/api/v1/novels`, fontes e identificação/busca/utilitários; contratos extraídos em schemas e testes HTTP sucesso/validação/not-found/conflito. Depends injeta serviços/repositories, sem login. |
| C22 | `feat(backend): expose chapter filter and settings routes` | 3.7.1, 3.7.6 | P13/P14/P15/P16/P17/P32/P33 | Texto JSON, CRUD de listas e operações explícitas por tipo, config de velocidade; mesmo conjunto de capacidades de P32, nomes EN. Sem endpoint WAV nem rota PT. |
| C23 | `feat(backend): expose text download and log routes` | 3.7.5, 3.7.8 | P34/P35 | Cache remoto por capítulo/obra, buffer de 500 logs e disponibilidade da API. Testar cache hit/miss/remoções, limite do buffer; sem polling/SSE novo e sem /health/redis. |
| C24 | `fix(backend): retain RoyalRoad chapter identifiers` | 3.3.6, 3.7.1, 3.7.2 | P12/P35; Improvement: quality | Não substituir ID real pelo índice sequencial em URLs já resolvidas; download remoto usa chapter_ids quando presentes. Regressão capítulo N≠ID real e fonte sem IDs. |
| C25 | `fix(backend): bound content processing and redact failures` | 3.3.9 | P13/P16/P17/P34; Improvement: security | I/O pesado fora do event loop, concorrência/retries limitados, regex validadas e com estratégia de limite efetivo de execução, CORS/bind por config, sem tracebacks/prévias sensíveis. Testes de falha/gravação, carga limitada e regex problemática. |

C25 completa endurecimento interno; proteção SSRF já é pré-condição C15 para toda chamada de rede de C16 em diante. Nunca adiar bloqueio de rede privada até depois de expor endpoint. Não transportar logs pessoais para fixtures. Se alguma lib de anti-403 não permitir validar o destino efetivo no connect, não habilitar esse transporte até demonstrar alternativa segura de paridade.

Portão F3: endpoints de P04–P17/P26/P32–P35 com testes; nenhum HTTP direto em router; contratos prontos para mobile. Suite completa, log C15–C25 e parada.

## 6. F4: serviços mobile

| Commit | Título em inglês | WBS | Paridade / classe | Entrega e aceite específico |
|---|---|---|---|---|
| C26 | `feat(mobile): add validated API resources and queries` | 1.4.5, 4.1.1, 4.1.2, 4.1.3, 4.1.4 | P02/P04/P05/P06/P26/P32/P33/P35 | Cliente central com URL por env, Zod, módulos necessários e query keys; todas as respostas HTTP verificadas, erros amigáveis. Mocks de sucesso/erro; sem módulo tts remoto/glossary/auth. |
| C27 | `feat(mobile): store offline library and chapter text` | 1.4.9 | P03/P22/P27/P29 | FileSystem, cache da biblioteca e arquivos de texto com formatos atuais; testar ausência/corrupção/escrita/remoção. Primeiro reconstruir formato observado, sem migrar dados reais. |
| C28 | `fix(mobile): isolate chapter caches by source` | 4.1.2 | P09/P22/P27/P29; Improvement: quality | Chaves em memória/disco incluem fonte; cache antigo sem fonte só é atribuído com origem comprovada ou fica sem uso e preservado para decisão, nunca renomeado para outra fonte. Testar mesmo capítulo em fontes distintas e reversibilidade da migração privada. |
| C29 | `feat(mobile): implement sentence based native speech` | 4.2.3, 4.3.1, 4.3.2 | P23/P24 | Serviço speech por frases, pause simulado, progresso, agrupamento de vozes e fallback PT; testes de callbacks/stop/retomada e troca de velocidade/voz. Estado de tela/sessão, sem persistência nova. |
| C30 | `fix(mobile): serialize speech cancellation and callbacks` | 4.3.1 | P23/P24/P25; Improvement: quality | Aguardar encerramento antes de criar player novo e invalidar callbacks antigos; testes de corridas, fim duplicado e desmontagem. Executar S1 em harness de teste/dev privado antes de fechar arquitetura do player. |
| C31 | `feat(mobile): provide shared reading controls and connectivity` | 4.2.2, 4.7.1, 4.7.2 | P01/P19/P20/P22 | Controles UI usados, modal/erro, disponibilidade online/offline e preferências temporárias; testes dos estados/ações existentes. Sem idioma EN, storage indicator ou badge novo. |

S1 exige Android/iOS físicos para afirmar background nos dois sistemas; em 2026-11-20 o dono informou disponibilidade somente de Android. iOS e execução física seguem pendentes, sem dispensa expressa. Trabalho independente continua, mas resultado ausente não fecha F4 como validado. Se houver falha que invalide decisão, registrar ADR e parar antes de trocar motor ou alterar UX. Hardware indisponível não justifica adicionar track-player ou pular o portão.

Portão F4: cliente/arquivos/voz/controles testados, S1 registrado com evidência disponível e pendências explícitas. Para fechar o bloco, pendência física precisa ser resolvida ou dispensada expressamente pelo dono com limites registrados. Log C26–C31 e parada.

Registro de execução em 2026-11-20: F4 fechado com sucesso Android relatado e dispensa expressa dos limites físicos restantes conforme ADR-008; C32–C39 autorizados. Os cenários dispensados permanecem pendentes de validação.

## 7. F5: leitura, player, filtros e downloads

| Commit | Título em inglês | WBS | Paridade / classe | Entrega e aceite específico |
|---|---|---|---|---|
| C32 | `feat(mobile): render chapter text and reading preferences` | 5.1.1, 5.1.2, 5.1.3 | P14/P18/P19/P22/P26 | Leitor visual preserva limpeza adicional própria, título/parágrafos/diálogos, tipografia/temas e local-first; falha de salvar progresso não esconde texto. Corpus sintético distingue conteúdo da fala. |
| C33 | `feat(mobile): add chapter controls and independent autoscroll` | 5.1.4, 5.1.5 | P18/P20 | Capítulo anterior/próximo/escolha, limites, controles ocultáveis e autoscroll independente; testes de timer/cleanup/offline. Sem navegação automática aos 95%. |
| C34 | `feat(mobile): prefetch upcoming chapter text` | 5.1.6 | P21 | Prefetch N+1..N+3 em memória, inclusive limiares 80%/95%; testes sem download persistente, duplicação ou avanço visual. |
| C35 | `feat(mobile): compose the local speech player` | 5.2.1, 5.2.2, 5.2.4, 5.2.5 | P23/P24/P25/P26/P31/P33 | Play/pause, progresso por frase, vozes/velocidade, navegação/fim, config inicial e painel de status local; sem mini-player/skip segundos/pitch/volume novos. Testar avanço e indisponibilidade. |
| C36 | `fix(mobile): honor the selected starting chapter` | 5.2.4 | P25/P30; Improvement: quality | Player prioriza capítulo explícito de navegação, depois progresso da fonte/obra; testar entradas vindas do leitor e de downloads sem alterar progresso por fonte. |
| C37 | `feat(mobile): manage global word phrase and regex filters` | 5.4.1 | P16/P17/P32 | Tela filtros por tipo e limpar todos com confirmação; testes de remoção exata, listas vazias, regex inválida e erro HTTP; sem filtros por obra/glossário. |
| C38 | `feat(mobile): manage individual offline text downloads` | 5.3.1, 5.3.2 | P22/P27/P29/P30 | Listar/baixar/remover com confirmação, abrir texto/voz no capítulo escolhido, remoção remota best-effort; testar offline, falhas locais e cache por fonte. |
| C39 | `feat(mobile): download chapter ranges in bounded groups` | 4.2.4, 4.4.1, 5.3.1, 5.3.2, 5.3.3 | P28 | Faixa até 50, grupos de cinco, pular existentes, progresso por tentativas e erros individuais; testar ordem/concorrência/limites. Só fila em memória, sem pause/resume/cancel novos, polling ou jobs remotos. |

As telas podem ser testadas com parâmetros sintéticos e mocks enquanto a entrada pela biblioteca ainda não existe; não criar botões de produto temporários. Testes de integração acompanham cada composição, usando MSW quando necessário.

Portão F5: todos os cenários de leitura/voz/filtros/downloads cobertos, offline sem chamada para conteúdo já local. Suite completa, log C32–C39 e parada.

Registro de execução em 2026-11-20: C32–C39 concluídos; gate com 170 testes backend (dez integrações locais reais), 203 mobile, lint/tipos, bundles Hermes Android/iOS do produto e harness e Gitleaks aprovado. Limites físicos de ADR-008 e tradução externa continuam registrados. F6 aguarda aprovação explícita; nenhuma importação pessoal executada.

## 8. F6: busca, biblioteca, fontes e migração

| Commit | Título em inglês | WBS | Paridade / classe | Entrega e aceite específico |
|---|---|---|---|---|
| C40 | `feat(mobile): search source metadata by name and URL` | 6.1.1, 6.1.2, 6.1.4 | P04/P05/P06 | Busca nome/URL, metadados e seleção de fontes, validação de capítulo inicial e modal de duplicata; sem seletor de template. Testar uma/várias fontes e erro parcial. |
| C41 | `fix(mobile): preserve RoyalRoad source chapter identifiers` | 6.1.4 | P06/P12; Improvement: quality | Gravação da fonte envia chapter_ids e resolve índice por ID antes de falar/ler/baixar; testar round-trip de payload e capítulo inicial distinto de 1. |
| C42 | `feat(mobile): compose the offline aware library` | 6.2.1 | P02/P03/P10 | Biblioteca/capas/badges/progresso, ordenação atual, pull-to-refresh/foco e fallback de cache; confirmar exclusão online. Testar respostas fora de ordem e erro de rede. |
| C43 | `feat(mobile): manage source details and reading progress` | 6.2.2, 6.2.3, 6.2.4 | P07/P08/P09/P26 | Detalhe, editar capítulo, fontes/adicionar/trocar/remover e atalhos; preservar progresso próprio da fonte e impedir última remoção. Sem health score, percentual novo ou idioma por obra. |
| C44 | `feat(mobile): connect the parity navigation flows` | 1.4.11 | P01/P18/P23/P27/P30 | Splash e sete destinos reais, parâmetros e guards; testar biblioteca→detalhe→leitura/player/downloads e duplicata→obra. Sem telas vazias/código de debug. |
| C45 | `feat(infra): add a private one shot legacy importer` | — | P06/P08/P09/P16/P17/P26/P33/P35 | scripts/import_legacy conforme seção 9 da análise: dry-run padrão, exportação privada, validação de formato, conflito aborta, idempotência/backup/relatório sem dados sensíveis. Testes com dados sintéticos; executar importação pessoal é etapa manual explícita, não consequência de rodar a suíte. |

Importador suporta apenas formatos verificados. Inspeção de dados pessoais deve ficar local, sem copiar conteúdo para docs/testes/git; formato não reconhecido aborta. Escolha de qual fonte vence conflitos não é inferida pelo agente.

Portão F6: jornada completa disponível e importador validado com dados sintéticos, sem declarar dados pessoais importados. Suite completa, log C40–C45 e parada para aprovação da Fase 4.

## 9. Fase 4 — validação final (depois dos blocos aprovados)

| Commit | Título em inglês | WBS | Paridade / classe | Entrega e aceite específico |
|---|---|---|---|---|
| C46 | `docs(docs): publish parity evidence and reconstruction guidance` | — | P01–P35 como evidência; Improvement: dx | Percorrer todos os itens com links para testes/roteiros/resultados reais; comparar legado×novo com entrada sintética ou URL pública autorizada quando possível. MELHORIAS, README de instalação/config/build/dev/estrutura, WBS_STATUS e PROGRESS finais. Sem marcar teste manual ausente como concluído. |

Se a validação revelar falha, corrigir em commit próprio com teste, rodapé Improvement e referência P correspondente antes de C46. Não absorver correções em commit de documentação nem ampliar escopo. Repetir apenas checks afetados durante investigação e suíte completa antes de qualquer commit.

## 10. Cobertura e limites

| Itens do checklist | Commits funcionais principais / correções |
|---|---|
| P01 | C07, C31, C44 |
| P02–P03 | C26–C28, C42 |
| P04–P05 | C17–C19, C21, C40 |
| P06 | C10–C12, C21, C40–C41, C45 |
| P07–P10 | C10–C12, C21, C42–C43, C45 |
| P11–P12 | C18–C19, C21, C24, C41 |
| P13–P15 | C15–C16, C19–C20, C22, C25, C32 |
| P16–P17 | C13, C16, C22, C25, C37, C45 |
| P18–P21 | C32–C34, C44 |
| P22 | C27–C28, C31–C32, C38 |
| P23–P25 | C29–C30, C35–C36, C44 |
| P26 | C10–C12, C21, C26, C32, C35, C43, C45 |
| P27–P30 | C27–C28, C36, C38–C39, C44 |
| P31 | C35 |
| P32 | C13, C22, C37 |
| P33 | C13, C22, C26, C35, C45 |
| P34 | C23, C25 |
| P35 | C14, C23–C24, C26, C45 |

Correções de rastreio da análise: WBS **4.6.3 é i18n**, não offline; **4.6.4 é MSW**, não navegação. Offline tem extensão de paridade via FileSystem/queries (C27/C28/C42) e navegação usa 1.4.11 (C44). Não adicionar tradução da UI para satisfazer referências erradas.

Pacotes antes genéricos “adaptar” que não precisam implementação própria: 1.2.2 (só deps usadas), 3.3.2 (somente headers/sessões exigidos pelos transportes), 3.3.3 (templates novos fora), 3.6.2/3.6.3 (serviços de texto existentes em C16/C20; sem tasks ARQ), 3.6.5 (coordenação mobile C39), 4.6.2 (bootstrap da navegação sem auth), 4.6.4 (mocks dos testes, não feature), 4.6.1 (não criar EventBus sem consumidores), 5.3.4 (polling/áudio fora), 5.3.5 (atualizar queries ao concluir sem barramento obrigatório). Não contar uma fração adaptada como pacote original integralmente entregue.

## 11. Tags e portões

Tags são criadas somente depois de existir commit correspondente; nenhuma tag será criada nesta Fase 2 sem commits. Proposta para resolver os nomes do AGENTS.md sem confundir fases do trabalho e blocos WBS:

| Marco | Commit previsto | Tag | Condição |
|---|---|---|---|
| Fase 1 — análise aprovada | C03 | `fase-1` | Aprovação da análise já recebida; documentos registrados no início da execução |
| Fase 2 — plano aprovado | C04 | `fase-2` | Aprovação explícita deste plano |
| Bloco F1 da execução | C09 | `fase-3-f1` | Gates de fundação e log do bloco |
| Bloco F2 da execução | C14 | `fase-3-f2` | Persistência e integração isolada |
| Bloco F3 da execução | C25 | `fase-3-f3` | API/conteúdo seguros |
| Bloco F4 da execução | C31 | `fase-3-f4` | Serviços e evidência física ou dispensa expressa |
| Bloco F5 da execução | C39 | `fase-3-f5` | Leitura/voz/downloads |
| Fase 3 completa, bloco F6 | C45 | `fase-3-f6` e `fase-3` | Jornada e importador sintético |
| Fase 4 — validação | C46 | `fase-4` | Checklist validado com limites registrados |

Em todo portão de execução: rodar suite completa, atualizar PROGRESS/WBS_STATUS, conferir segredos, commitar a mudança lógica final, criar tag sem mover tags anteriores, mostrar `git log --oneline <inicio>..<fim>` (no primeiro bloco incluir desde o root), e **parar para aprovação**. Não fazer push, deploy, publicação ou execução de importação pessoal automaticamente.

Próximo passo após aprovação: C01–C09 apenas. Aparelhos de Q5 e escolha de licença seguem pendentes; não impedem redigir/aprovar o plano, mas seus limites devem aparecer nos respectivos marcos. Context7 está autorizado para consultar documentação quando ajudar; não implica instalar bibliotecas adicionais.
