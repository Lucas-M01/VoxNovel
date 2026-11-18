# Status individual dos pacotes WBS

Data: 2026-11-18. Fundação implementada; produto ainda sem paridade validada. Análise aprovada; refinamento técnico vinculado ao plano da Fase 2, ainda aguardando aprovação. Estados da fundação atualizados; pacotes compostos não contam como integralmente entregues.

“Não iniciado — adaptar” cobre apenas a parte de paridade descrita em ANALISE.md; não autoriza executar o pacote inteiro. “Fora de escopo” não significa funcionalidade implementada nem infra aprovada. Misturas de áudio/texto devem seguir a seção 6 da análise.

## WBS-S

| ID | Pacote original | Estado | Motivo/limite |
|---|---|---|---|
| 1.1.1 | Inicializar monorepo raiz com Yarn Workspaces | Feito — fundação adaptada | C01–C08; evidências em FUNDACAO.md. Somente base e camadas usadas, sem funções extras da WBS. |
| 1.1.2 | Criar `apps/mobile/` e `apps/backend/` como workspaces | Feito — fundação adaptada | C01–C08; evidências em FUNDACAO.md. Somente base e camadas usadas, sem funções extras da WBS. |
| 1.1.3 | Configurar `.gitignore` global | Feito — fundação adaptada | C01–C08; evidências em FUNDACAO.md. Somente base e camadas usadas, sem funções extras da WBS. |
| 1.2.1 | Inicializar Poetry no backend (`pyproject.toml`) | Feito — fundação adaptada | C01–C08; evidências em FUNDACAO.md. Somente base e camadas usadas, sem funções extras da WBS. |
| 1.2.2 | Instalar dependências core: FastAPI, SQLModel, HTTPX, ARQ, python-jose, Pydantic Settings | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 1.2.3 | Criar estrutura de pastas `src/` | Feito — fundação adaptada | C01–C08; evidências em FUNDACAO.md. Somente base e camadas usadas, sem funções extras da WBS. |
| 1.2.4 | Configurar `src/main.py` com FastAPI + CORS | Feito — fundação adaptada | C01–C08; evidências em FUNDACAO.md. Somente base e camadas usadas, sem funções extras da WBS. |
| 1.2.5 | Criar `src/core/config.py` com variáveis de ambiente (Pydantic BaseSettings) | Feito — fundação adaptada | C01–C08; evidências em FUNDACAO.md. Somente base e camadas usadas, sem funções extras da WBS. |
| 1.2.6 | Criar `.env.example` documentado | Feito — fundação adaptada | C01–C08; evidências em FUNDACAO.md. Somente base e camadas usadas, sem funções extras da WBS. |
| 1.2.7 | Criar `src/core/exceptions.py` com handlers RFC 7807 | Feito — fundação adaptada | C01–C08; evidências em FUNDACAO.md. Somente base e camadas usadas, sem funções extras da WBS. |
| 1.3.1 | Criar `Dockerfile` (Python 3.12, Poetry, multi-stage) | Fora de escopo por padrão | Infra ausente/dispensável; exigir necessidade de paridade e decisão antes de adotar. Em 2.4.3, AudioCache eliminado (v2.2). |
| 1.3.2 | Criar `compose.yml` com `api`, `worker`, `redis` | Fora de escopo por padrão | Infra ausente/dispensável; exigir necessidade de paridade e decisão antes de adotar. Em 2.4.3, AudioCache eliminado (v2.2). |
| 1.3.3 | Configurar volumes `sessions/`, `models/`, `media/` | Fora de escopo por padrão | Infra ausente/dispensável; exigir necessidade de paridade e decisão antes de adotar. Em 2.4.3, AudioCache eliminado (v2.2). |
| 1.4.1 | Criar projeto Expo (TypeScript) | Feito — fundação adaptada | C01–C08; evidências em FUNDACAO.md. Somente base e camadas usadas, sem funções extras da WBS. |
| 1.4.2 | Configurar `tsconfig.json` strict + path aliases | Feito — fundação adaptada | C01–C08; evidências em FUNDACAO.md. Somente base e camadas usadas, sem funções extras da WBS. |
| 1.4.3 | Configurar `babel.config.js` com module-resolver | Feito — fundação adaptada | C01–C08; evidências em FUNDACAO.md. Somente base e camadas usadas, sem funções extras da WBS. |
| 1.4.4 | Instalar ESLint + `eslint-plugin-boundaries` | Feito — fundação adaptada | C01–C08; evidências em FUNDACAO.md. Somente base e camadas usadas, sem funções extras da WBS. |
| 1.4.5 | Instalar TanStack Query, Zustand, Zod, react-hook-form, axios | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 1.4.6 | Instalar WatermelonDB + native bindings | Fora de escopo por padrão | Infra ausente/dispensável; exigir necessidade de paridade e decisão antes de adotar. Em 2.4.3, AudioCache eliminado (v2.2). |
| 1.4.7 | Instalar MMKV + native bindings | Fora de escopo por padrão | Infra ausente/dispensável; exigir necessidade de paridade e decisão antes de adotar. Em 2.4.3, AudioCache eliminado (v2.2). |
| 1.4.8 | Instalar react-native-track-player + configurar serviço nativo | Eliminado (v2.2) | Somente áudio remoto; sem objeto no fluxo de texto + fala local. |
| 1.4.9 | Instalar expo-background-fetch, expo-task-manager, expo-file-system | Não iniciado — adaptar | FileSystem já necessário; não adicionar background-fetch/task-manager sem função existente. |
| 1.4.10 | Criar estrutura de pastas `src/core/`, `ui/`, `pattern/`, `features/`, `screens/` | Feito — fundação adaptada | C01–C08; evidências em FUNDACAO.md. Somente base e camadas usadas, sem funções extras da WBS. |
| 1.4.11 | Configurar Expo Router + layouts base | Parcial — base feita | C07: Router e entrada mínima; jornada P01 completa permanece em C44. |
| 2.1.1 | Criar `src/database/connection.py` (engine + session, SQLite/PostgreSQL compatível) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 2.1.2 | Modelo `User` | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 2.1.3 | Modelo `Obra` (incl. `idioma_original`, `canonical_base_index`) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 2.1.4 | Modelo `Fonte` (incl. `extractor_template`) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 2.1.5 | Modelo `FonteHealth` (success_count, failure_count, avg_response_ms) | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 2.1.6 | Modelo `Capitulo` (incl. `content_hash`, `translated_hash`, `chapter_status`) | Não iniciado — adaptar | Apenas contrato de texto/cache existente em C14; sem entidade de capítulos com estado/hash novos. |
| 2.1.7 | Modelo `Progresso` | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 2.1.8 | Modelo `DownloadJob` + `DownloadChapter` | Fora de escopo | Modelos duráveis DownloadJob/DownloadChapter ausentes; faixa existente será coordenada em memória em C39. |
| 2.1.9 | Modelo `Filtro` | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 2.1.10 | Modelo `AudioCache` (incl. `lang`) | Eliminado (v2.2) | Somente áudio remoto; sem objeto no fluxo de texto + fala local. |
| 2.1.11 | Modelo `GlossaryEntry` (incl. `priority`, `enabled`) | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 2.2.1 | Inicializar Alembic | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 2.2.2 | Criar migration inicial com todas as tabelas Solo | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 2.2.3 | Validar apply + rollback em SQLite | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 2.3.1 | `obra_repo.py` | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 2.3.2 | `fonte_repo.py` | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 2.3.3 | `fonte_health_repo.py` (record_success, record_failure, list_ordered_by_score) | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 2.3.4 | `capitulo_repo.py` (find_by_number, save com content_hash e chapter_status) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 2.3.5 | `audio_cache_repo.py` | Eliminado (v2.2) | Somente áudio remoto; sem objeto no fluxo de texto + fala local. |
| 2.3.6 | `glossary_repo.py` (ORDER BY priority DESC, enabled_only) | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 2.3.7 | `download_repo.py` (DownloadJob + DownloadChapter) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 2.4.1 | `db.ts` singleton WatermelonDB | Fora de escopo por padrão | Infra ausente/dispensável; exigir necessidade de paridade e decisão antes de adotar. Em 2.4.3, AudioCache eliminado (v2.2). |
| 2.4.2 | Modelos WatermelonDB: Obra, Fonte, Capitulo (com content_hash, chapter_status), Progresso | Fora de escopo por padrão | Infra ausente/dispensável; exigir necessidade de paridade e decisão antes de adotar. Em 2.4.3, AudioCache eliminado (v2.2). |
| 2.4.3 | Modelos WatermelonDB: DownloadJob, DownloadChapter, Filtro, AudioCache, GlossaryEntry | Fora de escopo por padrão | Infra ausente/dispensável; exigir necessidade de paridade e decisão antes de adotar. Em 2.4.3, AudioCache eliminado (v2.2). |
| 2.4.4 | Modelos WatermelonDB: ReadingStats, ReadingHistory (local-only na fase Solo) | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 2.4.5 | Migration inicial WatermelonDB (versão 1) | Fora de escopo por padrão | Infra ausente/dispensável; exigir necessidade de paridade e decisão antes de adotar. Em 2.4.3, AudioCache eliminado (v2.2). |
| 2.5.1 | SOLO_MODE bootstrap (criar usuário padrão automaticamente) | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 3.1.1 | `src/core/security.py` (SOLO_MODE bypass em `get_current_user`) | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 3.1.2 | `src/api/v1/auth.py` (POST /login, POST /refresh) | Eliminado (v2.1) | Auth próprio substituído no adendo; login também fora da paridade. |
| 3.1.3 | `src/api/deps.py` (get_session, get_current_user com SOLO_MODE, get_engines) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 3.2.1 | `text_pipeline/pipeline.py` com `TextPipeline` e `PipelineStage` | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 3.2.2 | `stages/html_cleaner.py` | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 3.2.3 | `stages/global_filters.py` (Discord, Patreon, links, TL Notes) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 3.2.4 | `stages/novel_filters.py` | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 3.2.5 | `stages/glossary_replacer.py` (priority DESC, `\b` word boundary) | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 3.3.1 | `scraper/base.py` com `ScraperAdapter` ABC | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 3.3.2 | `user_agents.py` + `session_store.py` | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 3.3.3 | `extractor_templates.py` (madara, novelbin, royalroad_clone, wordpress_generic) | Fora de escopo | Templates e seletor manual não existem no fluxo fornecido. |
| 3.3.4 | `providers/freewebnovel.py` | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 3.3.5 | `providers/novelfire.py` | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 3.3.6 | `providers/royalroad.py` | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 3.3.7 | `providers/generic.py` (heurísticas + templates + seletor manual) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 3.3.8 | `orchestrator.py` (seleção por URL, template, fallback por SourceHealthScore, anti-403) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 3.3.9 | Anti-403: HTTPX → User-Agent rotativo → Playwright + stealth → cookies | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 3.3.10 | Cache Redis TTL 24h como primeira camada | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 3.3.11 | Fixtures HTML reais por provider em `tests/unit/scrapers/fixtures/` | Não iniciado — melhoria quality | Antecipar controles/testes necessários aos módulos existentes; não criar workers ou libs só para testar a spec. |
| 3.4.1 | `translation/base.py` Protocol `TranslationEngine` | Não iniciado — adaptar | Interface/factory para GoogleTranslator existente (P15); não trocar por MarianMT/OpenAI. |
| 3.4.2 | `marian_engine.py` (pool de modelos, divisão por parágrafo) | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 3.4.3 | `openai_engine.py` (system prompt literário) | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 3.4.4 | `translation/factory.py` | Não iniciado — adaptar | Interface/factory para GoogleTranslator existente (P15); não trocar por MarianMT/OpenAI. |
| 3.4.5 | Download + validação modelos MarianMT (EN→PT, ZH→EN, JP→EN, KR→EN) | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 3.5.1 | `tts/base.py` Protocol `TTSEngine` | Eliminado (v2.2) | Somente áudio remoto; sem objeto no fluxo de texto + fala local. |
| 3.5.2 | `kokoro_engine.py` | Eliminado (v2.2) | Somente áudio remoto; sem objeto no fluxo de texto + fala local. |
| 3.5.3 | `tts/factory.py` + módulo storage (local/b2/r2) | Eliminado (v2.2) | Somente áudio remoto; sem objeto no fluxo de texto + fala local. |
| 3.5.4 | Cache TTS: MD5 de `"{lang}:{texto}"` → verifica AudioCache → StreamingResponse | Eliminado (v2.2) | Somente áudio remoto; sem objeto no fluxo de texto + fala local. |
| 3.6.1 | `tasks/worker.py` com WorkerSettings ARQ | Fora de escopo por padrão | Infra ausente/dispensável; exigir necessidade de paridade e decisão antes de adotar. Em 2.4.3, AudioCache eliminado (v2.2). |
| 3.6.2 | `scrape_task.py` (scrape → pipeline → salva com content_hash e chapter_status) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 3.6.3 | `translate_task.py` (traduz N + prefetch N+1..N+K + atualiza translated_hash) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 3.6.4 | `tts_task.py` | Eliminado (v2.2) | Somente áudio remoto; sem objeto no fluxo de texto + fala local. |
| 3.6.5 | `download_batch_task.py` (itera DownloadChapters; pause/resume) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 3.6.6 | `health_update_task.py` (cron diário — recalcula SourceHealthScore) | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 3.7.1 | Endpoints novels: GET/POST/DELETE obras, GET capítulos, GET capítulo?lang= | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 3.7.2 | Endpoints sources: POST, PUT activate, POST identify (com templates) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 3.7.3 | GET /sources/{id}/health | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 3.7.4 | GET /tts/{chapterId}?lang= com StreamingResponse | Eliminado (v2.2) | Somente áudio remoto; sem objeto no fluxo de texto + fala local. |
| 3.7.5 | Endpoints downloads: POST /jobs, GET status, PUT pause/resume, DELETE, POST retry-failed | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 3.7.6 | Endpoints filters: CRUD | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 3.7.7 | Endpoints glossary: GET/POST/DELETE por novelId | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 3.7.8 | GET /health, /health/db, /health/redis | Não iniciado — adaptar | Somente disponibilidade/configuração existente; /health/redis não exige introduzir Redis. |
| 3.7.9 | Montar `router.py` com prefixo `/api/v1` | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 4.1.1 | `http-resource.ts` (defineApiRoute, httpResource, FriendlyError, refresh token) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 4.1.2 | `constants.ts` + `keys.ts` (com lang em chapters e tts) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 4.1.3 | `queries.ts` com staleTime/gcTime por domínio | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 4.1.4 | Módulos de API: novels, chapters, sources, tts, downloads, filters, glossary | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 4.2.1 | `session-store.ts` (MMKV encrypted) | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 4.2.2 | `app-store.ts` (tema, locale, fontSize, target_language_global, storage_limit_bytes) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 4.2.3 | `player-store.ts` (MMKV) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 4.2.4 | `download-store.ts` (memória) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 4.3.1 | `audio-service.ts`: setupPlayer, addToQueue, resolveTrackUrl, scheduleNextChapters | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 4.3.2 | Emitir PLAYER_PROGRESS via `event-bus.ts` | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 4.4.1 | `task-queue.ts` com TaskType, enqueue, dequeue, priority, retryFailed | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 4.4.2 | Registrar SYNC_SOURCE + UPDATE_NOVEL no expo-task-manager | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 4.5.1 | `storage-manager.ts`: enforceAudioLimit (LRU), calculateUsage | Eliminado (v2.2) | Somente áudio remoto; sem objeto no fluxo de texto + fala local. |
| 4.5.2 | Task CLEANUP_STORAGE enfileirada após download | Eliminado (v2.2) | Somente áudio remoto; sem objeto no fluxo de texto + fala local. |
| 4.6.1 | `event-bus.ts` tipado (CHAPTER_TRANSLATED, AUDIO_READY, DOWNLOAD_FINISHED, SOURCE_UPDATED, PLAYER_PROGRESS) | Fora de escopo por padrão | EventBus não é exigido: serviços/hooks compartilham apenas estado necessário; não criar barramento vazio. |
| 4.6.2 | `auth-provider.tsx` + bootstrap em `screens/_layout.tsx` | Não iniciado — adaptar | Somente bootstrap necessário; Supabase Auth/onAuthStateChange não entram. |
| 4.6.3 | `i18n.ts` com pt-BR.json e en.json | Fora de escopo | i18n e opção de UI EN não existem. Referências offline da análise foram corrigidas para FileSystem/queries. |
| 4.6.4 | MSW: `mocks/browser.ts` + handlers todos os domínios | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 4.7.1 | Design system: button, text, input, badge, card, loading, skeleton, toast, progress-bar | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 4.7.2 | Componentes extras: sheet, slider, icon, storage-indicator, chapter-status-badge | Não iniciado — adaptar | Somente controles realmente usados; storage-indicator/status-badge novos fora de escopo. |
| 5.1.1 | `features/reader/hooks.ts` (useChapter, useReaderSettings, useFilterPipeline) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 5.1.2 | `filter-pipeline.tsx` + `glossary-pipeline.tsx` (priority DESC) | Não iniciado — adaptar | Reutilizar limpeza existente; glossário eliminado do escopo, sem aplicar filtro novo. |
| 5.1.3 | `text-renderer.tsx` (fonte, espaçamento, tema) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 5.1.4 | `autoscroll-controller.tsx` (escuta PLAYER_PROGRESS via EventBus) | Não iniciado — adaptar | P20 tem autoscroll independente; não sincronizar por milissegundos da voz. |
| 5.1.5 | `reader-controls.tsx` + `settings-panel.tsx` | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 5.1.6 | `screens/novel/[id]/read.tsx` com prefetchQuery próximos 3 capítulos | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 5.1.7 | Leitura contínua: scroll ≥ 95% → salva progresso → navega para próximo automaticamente | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 5.1.8 | Salvar posição de scroll no WatermelonDB ao sair | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 5.2.1 | `features/player/hooks.ts` (useTrackPlayer, usePlayerState, useContinuousQueue) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 5.2.2 | `continuous-queue.ts` com scheduleNextChapters(lookahead=2) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 5.2.3 | `player-bar.tsx` (mini player global no MainLayout) | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 5.2.4 | `player-screen.tsx` (play/pause, skip±15s, velocidade, capítulo ant/prox) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 5.2.5 | `voice-settings.tsx` + prefetch adaptativo (áudio se isPlaying, texto se não) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 5.3.1 | `download-section.tsx` (capítulo atual, próximos N, intervalo, incluir áudio) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 5.3.2 | `pattern/download-queue.tsx` (progresso granular, pause, resume, cancel, retry) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 5.3.3 | Criar DownloadJob no WatermelonDB + POST /downloads/jobs | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 5.3.4 | Polling 5s via TaskQueue + `FileSystem.createDownloadResumable` para áudio | Fora de escopo | Polling de jobs novos não entra; transferência de áudio eliminada (v2.2). Texto baixa por HTTP/FileSystem em C38/C39. |
| 5.3.5 | EventBus DOWNLOAD_FINISHED → invalidar queries do capítulo | Não iniciado — adaptar | Atualização de queries ao concluir C38/C39; sem EventBus obrigatório. |
| 5.4.1 | `filter-manager.tsx` (CRUD, globais + por obra) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 5.4.2 | `glossary-manager.tsx` (CRUD com priority e enabled) | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 6.1.1 | `features/search/hooks.ts` + `search-bar.tsx` | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 6.1.2 | `source-results.tsx` + `extractor-template-picker.tsx` | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 6.1.3 | `generic-source-form.tsx` com schema Zod completo | Fora de escopo | Capacidade nova ou motor diferente; não consta da paridade. |
| 6.1.4 | Fluxo identificação: URL → /sources/identify → formulário pré-preenchido com template | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 6.2.1 | `library/novel-card.tsx` + `library-list.tsx` (paginação infinita) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 6.2.2 | `novel-detail/source-list.tsx` (exibe SourceHealthScore por fonte) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 6.2.3 | `progress-controls.tsx` + `reading-prefs.tsx` (target_language por obra) | Não iniciado — adaptar | Somente responsabilidades com evidência em P01–P35; retirar novidades do pacote composto. |
| 6.2.4 | Sincronização de progresso por percentual ao trocar de fonte (com banner) | Não iniciado — adaptar | P09 restaura progresso próprio da fonte; não implementar percentual/banner novo. |
## WBS-M

| ID | Pacote original | Estado | Motivo/limite |
|---|---|---|---|
| 3.3.12 | Adicionar `providers/centralnovel.py` | Não iniciado — adaptar | CentralNovel já existe: antecipar por P04/P05, apesar do rótulo Beta. |
| 3.3.13 | Implementar API externa de scraping (ScraperAPI/ZenRows) como 5ª camada anti-403 | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 3.7.10 | GET /novels/{id}/chapters/{num}/status (retorna ChapterStatus para o mobile mostrar badge) | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 3.7.11 | PUT /novels/{id}/sources/migrate (migra progresso + downloads entre fontes com canonical_index) | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 4.4.3 | Integrar expo-background-fetch para sync periódico com app fechado | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 4.5.3 | `enforceTextLimit()` para capítulos de texto | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 4.6.5 | `storage-settings.tsx` + `storage-section.tsx` em novel-detail | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 5.1.9 | `chapter-status-badge.tsx` na lista de capítulos (RAW_ONLY, TRANSLATING, READY, etc.) | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 5.2.6 | Sincronização de highlight de parágrafo com TTS (além do scroll) | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 5.3.6 | Reprocessar capítulo corrompido (detectar por `content_hash` diferente do esperado) | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 5.3.7 | Retomar download de áudio interrompido pelo encerramento do app | Eliminado (v2.2) | Somente áudio remoto; sem objeto no fluxo de texto + fala local. |
| 6.1.5 | Migração de fonte: tela dedicada que preserva progresso, downloads e áudios | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 6.1.6 | Invalidação automática de tradução quando `content_hash` muda (UI notifica usuário) | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 6.2.5 | `novel-detail/storage-section.tsx` (uso de armazenamento por obra) | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 6.2.6 | Filtro de biblioteca: status (lendo/completo/pausado), ordenação por progresso/acesso | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| RF.1 | Detector de capítulo corrompido: `conteudo_raw` vazio ou < 100 chars → marca `chapter_status=FAILED` | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| RF.2 | Re-tentativa automática de scraping em capítulos FAILED (máx. 3 tentativas, backoff exponencial) | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| RF.3 | UI de capítulos com problema: lista na tela da obra com botão "tentar novamente" | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| RF.4 | Download interrompido: retomar pelo `DownloadChapter` com `status=running` ao abrir o app | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| RF.5 | Fonte indisponível: score < 20 → notificação passiva sugerindo troca de fonte | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
## WBS-L

| ID | Pacote original | Estado | Motivo/limite |
|---|---|---|---|
| 7.1.1 | `features/stats/reading-stats.tsx` (tempo lido, ouvido, capítulos, streak) | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 7.1.2 | `features/stats/reading-history.tsx` (lista cronológica) | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 7.1.3 | `screens/(tabs)/stats.tsx` | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 7.1.4 | Task UPDATE_STATS: gravação de sessão ao sair do reader/player | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 7.1.5 | Cálculo de streak (dias consecutivos com ≥ 1 capítulo) | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 7.1.6 | Sincronização backend: POST /stats/record + GET /history | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 7.1.7 | Modelos backend: `ReadingStats` + `ReadingHistory` + migrations | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 7.1.8 | Repositórios: `stats_repo.py` + `history_repo.py` | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 7.1.9 | Endpoints: GET /stats, GET /stats/{novelId}, POST /stats/record, GET /history | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 8.1.1 | Instalar + configurar Sentry SDK no backend | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 8.1.2 | Instalar + configurar Logfire (FastAPI, SQLAlchemy, HTTPX) | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 8.1.3 | Fingerprinting Sentry: SourceUnavailableError, TranslationFailedError, CloudflareBlockedError | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 8.1.4 | Instalar + configurar Sentry React Native | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 8.1.5 | Breadcrumbs: transições de tela, mudanças de capítulo, TaskQueue failures | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 8.2.1 | Testes unitários backend: repositórios, pipeline, scrapers (fixtures), templates, MarianEngine | Não iniciado — melhoria quality | Antecipar controles/testes necessários aos módulos existentes; não criar workers ou libs só para testar a spec. |
| 8.2.2 | Testes workers: scrape_task, translate_task, download_batch, health_update (fakeredis) | Fora de escopo como pacote de workers | Nenhum ARQ/fakeredis a adicionar. Concorrência dos serviços existentes terá testes em C25/C39. |
| 8.2.3 | Testes integração backend: endpoints com httpx.AsyncClient + banco memória | Não iniciado — melhoria quality | Antecipar controles/testes necessários aos módulos existentes; não criar workers ou libs só para testar a spec. |
| 8.2.4 | Cobertura 80% em `src/services/` e `src/api/` | Não iniciado — melhoria quality | Antecipar controles/testes necessários aos módulos existentes; não criar workers ou libs só para testar a spec. |
| 8.2.5 | Testes unitários mobile: core/ (task-queue, storage-manager, event-bus, stores) | Não iniciado — melhoria quality | Antecipar controles/testes necessários aos módulos existentes; não criar workers ou libs só para testar a spec. |
| 8.2.6 | Testes componentes: ui/ com Testing Library RN | Não iniciado — melhoria quality | Antecipar controles/testes necessários aos módulos existentes; não criar workers ou libs só para testar a spec. |
| 8.2.7 | Testes integração mobile: busca, leitura, player, downloads (MSW) | Não iniciado — melhoria quality | Antecipar controles/testes necessários aos módulos existentes; não criar workers ou libs só para testar a spec. |
| 8.3.1 | `.github/workflows/backend.yml`: ruff + mypy + pytest em cada push | Feito — CI mínimo definido | C09: workflow e comandos validados localmente; execução remota ainda não realizada. Sem deploy. |
| 8.3.2 | `.github/workflows/mobile.yml`: ESLint + tsc + Jest em cada push | Feito — CI mínimo definido | C09: workflow e comandos validados localmente; execução remota ainda não realizada. Sem deploy. |
| 8.3.3 | Workflow build Docker + push registry em merge main | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 8.3.4 | Workflow deploy Railway/Fly.io em merge main | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 8.3.5 | EAS Build profile `preview` (build automático em PRs) | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 8.3.6 | EAS Build profile `production` (build em merge main) | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 8.3.7 | EAS Submit: deploy Play Store via tag de release | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 8.4.1 | Configurar Railway (API + Worker + Redis) | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 8.4.2 | Configurar Backblaze B2 para MP3 | Eliminado (v2.2) | Somente áudio remoto; sem objeto no fluxo de texto + fala local. |
| 8.4.3 | Configurar variáveis de ambiente em produção | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 8.4.4 | Validar health checks em produção | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |
| 8.4.5 | Publicar build closed testing na Play Store | Fora de escopo | Beta/Launch novo; tratamento interno de falhas já existentes pode entrar como melhoria separada. |

## Itens adicionados no v2.1

| ID | Estado | Motivo |
|---|---|---|
| 2.1.12 | Fora de escopo como novo recurso multiusuário | Avaliar proteção das tabelas existentes no escopo de segurança; não criar auth/profiles. |
| RF.6 | Fora de escopo | Teste de isolamento entre contas depende de multiusuário, ausente. |

## Contagem verificada

IDs enumerados em WBS.md: WBS-S = 142, WBS-M = 20, WBS-L = 33; total = 195. Mais 2 IDs propostos pelo adendo v2.1. Totais aproximados impressos na WBS não substituem essa lista.

Itens novos do v2.2 sem ID: tts-service e configuração de vozes mapeados para P23/P24 e 4.3.1/5.2.5, sem pitch/volume novos.

## Vínculo ao plano da Fase 2

Plano proposto em PLANO_COMMITS.md. IDs abaixo cobrem apenas a parte adaptada descrita nos respectivos commits. Demais IDs preservam a classificação individual acima; testes acompanham os módulos, sem pacote extra só para cada ferramenta. Aprovação da análise não equivale à aprovação deste plano.

| WBS | Commits previstos |
|---|---|
| 1.1.1 | C07 |
| 1.1.2 | C05 |
| 1.1.3 | C01 |
| 1.2.1 | C05 |
| 1.2.3 | C05 |
| 1.2.4 | C05 |
| 1.2.5 | C05 |
| 1.2.6 | C06 |
| 1.2.7 | C06 |
| 1.4.1 | C07 |
| 1.4.2 | C07 |
| 1.4.3 | C07 |
| 1.4.4 | C08 |
| 1.4.5 | C26 |
| 1.4.9 | C27 |
| 1.4.10 | C08 |
| 1.4.11 | C07, C44 |
| 2.1.1 | C11 |
| 2.1.3 | C10 |
| 2.1.4 | C10 |
| 2.1.7 | C10 |
| 2.1.9 | C13 |
| 2.2.1 | C12 |
| 2.2.2 | C12 |
| 2.2.3 | C12 |
| 2.3.1 | C11 |
| 2.3.2 | C11 |
| 2.3.4 | C14 |
| 2.3.7 | C14 |
| 3.1.3 | C21 |
| 3.2.1 | C16 |
| 3.2.2 | C16 |
| 3.2.3 | C16 |
| 3.3.1 | C15, C19 |
| 3.3.4 | C17 |
| 3.3.5 | C18 |
| 3.3.6 | C18, C24 |
| 3.3.7 | C16, C19 |
| 3.3.8 | C19 |
| 3.3.9 | C15, C25 |
| 3.3.12 | C17 |
| 3.4.1 | C20 |
| 3.4.4 | C20 |
| 3.7.1 | C21, C22, C24 |
| 3.7.2 | C21, C24 |
| 3.7.5 | C23 |
| 3.7.6 | C22 |
| 3.7.8 | C23 |
| 3.7.9 | C21 |
| 4.1.1 | C26 |
| 4.1.2 | C26, C28 |
| 4.1.3 | C26 |
| 4.1.4 | C26 |
| 4.2.2 | C31 |
| 4.2.3 | C29 |
| 4.2.4 | C39 |
| 4.3.1 | C29, C30 |
| 4.3.2 | C29 |
| 4.4.1 | C39 |
| 4.7.1 | C31 |
| 4.7.2 | C31 |
| 5.1.1 | C32 |
| 5.1.2 | C32 |
| 5.1.3 | C32 |
| 5.1.4 | C33 |
| 5.1.5 | C33 |
| 5.1.6 | C34 |
| 5.2.1 | C35 |
| 5.2.2 | C35 |
| 5.2.4 | C35, C36 |
| 5.2.5 | C35 |
| 5.3.1 | C38, C39 |
| 5.3.2 | C38, C39 |
| 5.3.3 | C39 |
| 5.4.1 | C37 |
| 6.1.1 | C40 |
| 6.1.2 | C40 |
| 6.1.4 | C40, C41 |
| 6.2.1 | C42 |
| 6.2.2 | C43 |
| 6.2.3 | C43 |
| 6.2.4 | C43 |
| 8.3.1 | C09 |
| 8.3.2 | C09 |
