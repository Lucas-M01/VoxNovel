# WBS — Novel Reader App
## Estrutura Analítica do Projeto v2.0

> Baseado na arquitetura v4.0.
> Reorganizado em **três níveis de execução** para desenvolvimento solo sustentável.
> Cada pacote é um entregável concreto e verificável — "feito" ou "não feito".

---

## Por que três níveis?

A WBS completa tem 239 pacotes — estimativa realista de 700–1200 horas para um desenvolvedor solo. Dividir em três níveis permite **validar o produto antes de construir a infraestrutura**, seguindo a ordem de valor percebido pelo usuário:

> **90% do valor percebido está nos itens 1–6:**
> Reader → Scrapers → Tradução → Glossário → TTS → Downloads offline

| Nível | Objetivo | Pacotes | Estimativa |
|---|---|---|---|
| **S — Solo MVP** | App funcional para uso próprio | ~70 | 2–3 meses |
| **M — Beta** | Polimento, múltiplas fontes, glossário avançado | ~85 | +2 meses |
| **L — Launch** | Observabilidade, stats, CI/CD completo, deploy | ~84 | +2 meses |

---

## Legenda

| Símbolo | Fase |
|---|---|
| 🔧 | F1 — Fundação |
| 🗄️ | F2 — Banco de Dados |
| ⚙️ | F3 — Core Backend |
| 📱 | F4 — Core Mobile |
| 📖 | F5 — Leitura |
| 🔍 | F6 — Busca e Fontes |
| 📊 | F7 — Stats e Histórico |
| 🚀 | F8 — Qualidade e Deploy |

---

# WBS-S — Solo MVP

> **Meta:** Ler novels traduzidas com TTS e downloads offline.
> Nada além disso. Sem stats, sem observabilidade completa, sem CI/CD automatizado.

### 🔧 F1 — Fundação (Solo)

- 1.1.1 Inicializar monorepo raiz com Yarn Workspaces
- 1.1.2 Criar `apps/mobile/` e `apps/backend/` como workspaces
- 1.1.3 Configurar `.gitignore` global
- 1.2.1 Inicializar Poetry no backend (`pyproject.toml`)
- 1.2.2 Instalar dependências core: FastAPI, SQLModel, HTTPX, ARQ, python-jose, Pydantic Settings
- 1.2.3 Criar estrutura de pastas `src/`
- 1.2.4 Configurar `src/main.py` com FastAPI + CORS
- 1.2.5 Criar `src/core/config.py` com variáveis de ambiente (Pydantic BaseSettings)
- 1.2.6 Criar `.env.example` documentado
- 1.2.7 Criar `src/core/exceptions.py` com handlers RFC 7807
- 1.3.1 Criar `Dockerfile` (Python 3.12, Poetry, multi-stage)
- 1.3.2 Criar `compose.yml` com `api`, `worker`, `redis`
- 1.3.3 Configurar volumes `sessions/`, `models/`, `media/`
- 1.4.1 Criar projeto Expo (TypeScript)
- 1.4.2 Configurar `tsconfig.json` strict + path aliases
- 1.4.3 Configurar `babel.config.js` com module-resolver
- 1.4.4 Instalar ESLint + `eslint-plugin-boundaries`
- 1.4.5 Instalar TanStack Query, Zustand, Zod, react-hook-form, axios
- 1.4.6 Instalar WatermelonDB + native bindings
- 1.4.7 Instalar MMKV + native bindings
- 1.4.8 Instalar react-native-track-player + configurar serviço nativo
- 1.4.9 Instalar expo-background-fetch, expo-task-manager, expo-file-system
- 1.4.10 Criar estrutura de pastas `src/core/`, `ui/`, `pattern/`, `features/`, `screens/`
- 1.4.11 Configurar Expo Router + layouts base

**Total F1-S: 22 pacotes**

---

### 🗄️ F2 — Banco de Dados (Solo)

- 2.1.1 Criar `src/database/connection.py` (engine + session, SQLite/PostgreSQL compatível)
- 2.1.2 Modelo `User`
- 2.1.3 Modelo `Obra` (incl. `idioma_original`, `canonical_base_index`)
- 2.1.4 Modelo `Fonte` (incl. `extractor_template`)
- 2.1.5 Modelo `FonteHealth` (success_count, failure_count, avg_response_ms)
- 2.1.6 Modelo `Capitulo` (incl. `content_hash`, `translated_hash`, `chapter_status`)
- 2.1.7 Modelo `Progresso`
- 2.1.8 Modelo `DownloadJob` + `DownloadChapter`
- 2.1.9 Modelo `Filtro`
- 2.1.10 Modelo `AudioCache` (incl. `lang`)
- 2.1.11 Modelo `GlossaryEntry` (incl. `priority`, `enabled`)
- 2.2.1 Inicializar Alembic
- 2.2.2 Criar migration inicial com todas as tabelas Solo
- 2.2.3 Validar apply + rollback em SQLite
- 2.3.1 `obra_repo.py`
- 2.3.2 `fonte_repo.py`
- 2.3.3 `fonte_health_repo.py` (record_success, record_failure, list_ordered_by_score)
- 2.3.4 `capitulo_repo.py` (find_by_number, save com content_hash e chapter_status)
- 2.3.5 `audio_cache_repo.py`
- 2.3.6 `glossary_repo.py` (ORDER BY priority DESC, enabled_only)
- 2.3.7 `download_repo.py` (DownloadJob + DownloadChapter)
- 2.4.1 `db.ts` singleton WatermelonDB
- 2.4.2 Modelos WatermelonDB: Obra, Fonte, Capitulo (com content_hash, chapter_status), Progresso
- 2.4.3 Modelos WatermelonDB: DownloadJob, DownloadChapter, Filtro, AudioCache, GlossaryEntry
- 2.4.4 Modelos WatermelonDB: ReadingStats, ReadingHistory (local-only na fase Solo)
- 2.4.5 Migration inicial WatermelonDB (versão 1)
- 2.5.1 SOLO_MODE bootstrap (criar usuário padrão automaticamente)

**Total F2-S: 27 pacotes**

---

### ⚙️ F3 — Core Backend (Solo)

- 3.1.1 `src/core/security.py` (SOLO_MODE bypass em `get_current_user`)
- 3.1.2 `src/api/v1/auth.py` (POST /login, POST /refresh)
- 3.1.3 `src/api/deps.py` (get_session, get_current_user com SOLO_MODE, get_engines)
- 3.2.1 `text_pipeline/pipeline.py` com `TextPipeline` e `PipelineStage`
- 3.2.2 `stages/html_cleaner.py`
- 3.2.3 `stages/global_filters.py` (Discord, Patreon, links, TL Notes)
- 3.2.4 `stages/novel_filters.py`
- 3.2.5 `stages/glossary_replacer.py` (priority DESC, `\b` word boundary)
- 3.3.1 `scraper/base.py` com `ScraperAdapter` ABC
- 3.3.2 `user_agents.py` + `session_store.py`
- 3.3.3 `extractor_templates.py` (madara, novelbin, royalroad_clone, wordpress_generic)
- 3.3.4 `providers/freewebnovel.py`
- 3.3.5 `providers/novelfire.py`
- 3.3.6 `providers/royalroad.py`
- 3.3.7 `providers/generic.py` (heurísticas + templates + seletor manual)
- 3.3.8 `orchestrator.py` (seleção por URL, template, fallback por SourceHealthScore, anti-403)
- 3.3.9 Anti-403: HTTPX → User-Agent rotativo → Playwright + stealth → cookies
- 3.3.10 Cache Redis TTL 24h como primeira camada
- 3.3.11 Fixtures HTML reais por provider em `tests/unit/scrapers/fixtures/`
- 3.4.1 `translation/base.py` Protocol `TranslationEngine`
- 3.4.2 `marian_engine.py` (pool de modelos, divisão por parágrafo)
- 3.4.3 `openai_engine.py` (system prompt literário)
- 3.4.4 `translation/factory.py`
- 3.4.5 Download + validação modelos MarianMT (EN→PT, ZH→EN, JP→EN, KR→EN)
- 3.5.1 `tts/base.py` Protocol `TTSEngine`
- 3.5.2 `kokoro_engine.py`
- 3.5.3 `tts/factory.py` + módulo storage (local/b2/r2)
- 3.5.4 Cache TTS: MD5 de `"{lang}:{texto}"` → verifica AudioCache → StreamingResponse
- 3.6.1 `tasks/worker.py` com WorkerSettings ARQ
- 3.6.2 `scrape_task.py` (scrape → pipeline → salva com content_hash e chapter_status)
- 3.6.3 `translate_task.py` (traduz N + prefetch N+1..N+K + atualiza translated_hash)
- 3.6.4 `tts_task.py`
- 3.6.5 `download_batch_task.py` (itera DownloadChapters; pause/resume)
- 3.6.6 `health_update_task.py` (cron diário — recalcula SourceHealthScore)
- 3.7.1 Endpoints novels: GET/POST/DELETE obras, GET capítulos, GET capítulo?lang=
- 3.7.2 Endpoints sources: POST, PUT activate, POST identify (com templates)
- 3.7.3 GET /sources/{id}/health
- 3.7.4 GET /tts/{chapterId}?lang= com StreamingResponse
- 3.7.5 Endpoints downloads: POST /jobs, GET status, PUT pause/resume, DELETE, POST retry-failed
- 3.7.6 Endpoints filters: CRUD
- 3.7.7 Endpoints glossary: GET/POST/DELETE por novelId
- 3.7.8 GET /health, /health/db, /health/redis
- 3.7.9 Montar `router.py` com prefixo `/api/v1`

**Total F3-S: 42 pacotes**

---

### 📱 F4 — Core Mobile (Solo)

- 4.1.1 `http-resource.ts` (defineApiRoute, httpResource, FriendlyError, refresh token)
- 4.1.2 `constants.ts` + `keys.ts` (com lang em chapters e tts)
- 4.1.3 `queries.ts` com staleTime/gcTime por domínio
- 4.1.4 Módulos de API: novels, chapters, sources, tts, downloads, filters, glossary
- 4.2.1 `session-store.ts` (MMKV encrypted)
- 4.2.2 `app-store.ts` (tema, locale, fontSize, target_language_global, storage_limit_bytes)
- 4.2.3 `player-store.ts` (MMKV)
- 4.2.4 `download-store.ts` (memória)
- 4.3.1 `audio-service.ts`: setupPlayer, addToQueue, resolveTrackUrl, scheduleNextChapters
- 4.3.2 Emitir PLAYER_PROGRESS via `event-bus.ts`
- 4.4.1 `task-queue.ts` com TaskType, enqueue, dequeue, priority, retryFailed
- 4.4.2 Registrar SYNC_SOURCE + UPDATE_NOVEL no expo-task-manager
- 4.5.1 `storage-manager.ts`: enforceAudioLimit (LRU), calculateUsage
- 4.5.2 Task CLEANUP_STORAGE enfileirada após download
- 4.6.1 `event-bus.ts` tipado (CHAPTER_TRANSLATED, AUDIO_READY, DOWNLOAD_FINISHED, SOURCE_UPDATED, PLAYER_PROGRESS)
- 4.6.2 `auth-provider.tsx` + bootstrap em `screens/_layout.tsx`
- 4.6.3 `i18n.ts` com pt-BR.json e en.json
- 4.6.4 MSW: `mocks/browser.ts` + handlers todos os domínios
- 4.7.1 Design system: button, text, input, badge, card, loading, skeleton, toast, progress-bar
- 4.7.2 Componentes extras: sheet, slider, icon, storage-indicator, chapter-status-badge

**Total F4-S: 20 pacotes**

---

### 📖 F5 — Features de Leitura (Solo)

- 5.1.1 `features/reader/hooks.ts` (useChapter, useReaderSettings, useFilterPipeline)
- 5.1.2 `filter-pipeline.tsx` + `glossary-pipeline.tsx` (priority DESC)
- 5.1.3 `text-renderer.tsx` (fonte, espaçamento, tema)
- 5.1.4 `autoscroll-controller.tsx` (escuta PLAYER_PROGRESS via EventBus)
- 5.1.5 `reader-controls.tsx` + `settings-panel.tsx`
- 5.1.6 `screens/novel/[id]/read.tsx` com prefetchQuery próximos 3 capítulos
- 5.1.7 Leitura contínua: scroll ≥ 95% → salva progresso → navega para próximo automaticamente
- 5.1.8 Salvar posição de scroll no WatermelonDB ao sair
- 5.2.1 `features/player/hooks.ts` (useTrackPlayer, usePlayerState, useContinuousQueue)
- 5.2.2 `continuous-queue.ts` com scheduleNextChapters(lookahead=2)
- 5.2.3 `player-bar.tsx` (mini player global no MainLayout)
- 5.2.4 `player-screen.tsx` (play/pause, skip±15s, velocidade, capítulo ant/prox)
- 5.2.5 `voice-settings.tsx` + prefetch adaptativo (áudio se isPlaying, texto se não)
- 5.3.1 `download-section.tsx` (capítulo atual, próximos N, intervalo, incluir áudio)
- 5.3.2 `pattern/download-queue.tsx` (progresso granular, pause, resume, cancel, retry)
- 5.3.3 Criar DownloadJob no WatermelonDB + POST /downloads/jobs
- 5.3.4 Polling 5s via TaskQueue + `FileSystem.createDownloadResumable` para áudio
- 5.3.5 EventBus DOWNLOAD_FINISHED → invalidar queries do capítulo
- 5.4.1 `filter-manager.tsx` (CRUD, globais + por obra)
- 5.4.2 `glossary-manager.tsx` (CRUD com priority e enabled)

**Total F5-S: 20 pacotes**

---

### 🔍 F6 — Busca e Fontes (Solo)

- 6.1.1 `features/search/hooks.ts` + `search-bar.tsx`
- 6.1.2 `source-results.tsx` + `extractor-template-picker.tsx`
- 6.1.3 `generic-source-form.tsx` com schema Zod completo
- 6.1.4 Fluxo identificação: URL → /sources/identify → formulário pré-preenchido com template
- 6.2.1 `library/novel-card.tsx` + `library-list.tsx` (paginação infinita)
- 6.2.2 `novel-detail/source-list.tsx` (exibe SourceHealthScore por fonte)
- 6.2.3 `progress-controls.tsx` + `reading-prefs.tsx` (target_language por obra)
- 6.2.4 Sincronização de progresso por percentual ao trocar de fonte (com banner)

**Total F6-S: 8 pacotes**

---

**Total WBS-S: ~139 pacotes**

---

---

# WBS-M — Beta

> **Meta:** Polimento de UX, múltiplas fontes robustas, glossário maduro, migração de fonte, recuperação de falhas.
> Só começar após o Solo MVP estar **funcionando de ponta a ponta**.

### ⚙️ F3 — Backend (Beta)

- 3.3.12 Adicionar `providers/centralnovel.py`
- 3.3.13 Implementar API externa de scraping (ScraperAPI/ZenRows) como 5ª camada anti-403
- 3.7.10 GET /novels/{id}/chapters/{num}/status (retorna ChapterStatus para o mobile mostrar badge)
- 3.7.11 PUT /novels/{id}/sources/migrate (migra progresso + downloads entre fontes com canonical_index)

### 📱 F4 — Mobile (Beta)

- 4.4.3 Integrar expo-background-fetch para sync periódico com app fechado
- 4.5.3 `enforceTextLimit()` para capítulos de texto
- 4.6.5 `storage-settings.tsx` + `storage-section.tsx` em novel-detail

### 📖 F5 — Leitura (Beta)

- 5.1.9 `chapter-status-badge.tsx` na lista de capítulos (RAW_ONLY, TRANSLATING, READY, etc.)
- 5.2.6 Sincronização de highlight de parágrafo com TTS (além do scroll)
- 5.3.6 Reprocessar capítulo corrompido (detectar por `content_hash` diferente do esperado)
- 5.3.7 Retomar download de áudio interrompido pelo encerramento do app

### 🔍 F6 — Busca e Fontes (Beta)

- 6.1.5 Migração de fonte: tela dedicada que preserva progresso, downloads e áudios
- 6.1.6 Invalidação automática de tradução quando `content_hash` muda (UI notifica usuário)
- 6.2.5 `novel-detail/storage-section.tsx` (uso de armazenamento por obra)
- 6.2.6 Filtro de biblioteca: status (lendo/completo/pausado), ordenação por progresso/acesso

### ⚙️ Recuperação de Falhas (Beta)

- RF.1 Detector de capítulo corrompido: `conteudo_raw` vazio ou < 100 chars → marca `chapter_status=FAILED`
- RF.2 Re-tentativa automática de scraping em capítulos FAILED (máx. 3 tentativas, backoff exponencial)
- RF.3 UI de capítulos com problema: lista na tela da obra com botão "tentar novamente"
- RF.4 Download interrompido: retomar pelo `DownloadChapter` com `status=running` ao abrir o app
- RF.5 Fonte indisponível: score < 20 → notificação passiva sugerindo troca de fonte

**Total WBS-M: ~20 pacotes**

---

---

# WBS-L — Launch

> **Meta:** Observabilidade, stats sincronizadas, CI/CD completo, deploy automatizado, produto pronto para outros usuários.
> Só iniciar quando o Beta estiver estável.

### 📊 F7 — Stats e Histórico (Launch)

- 7.1.1 `features/stats/reading-stats.tsx` (tempo lido, ouvido, capítulos, streak)
- 7.1.2 `features/stats/reading-history.tsx` (lista cronológica)
- 7.1.3 `screens/(tabs)/stats.tsx`
- 7.1.4 Task UPDATE_STATS: gravação de sessão ao sair do reader/player
- 7.1.5 Cálculo de streak (dias consecutivos com ≥ 1 capítulo)
- 7.1.6 Sincronização backend: POST /stats/record + GET /history
- 7.1.7 Modelos backend: `ReadingStats` + `ReadingHistory` + migrations
- 7.1.8 Repositórios: `stats_repo.py` + `history_repo.py`
- 7.1.9 Endpoints: GET /stats, GET /stats/{novelId}, POST /stats/record, GET /history

### 🚀 F8 — Qualidade e Deploy (Launch)

- 8.1.1 Instalar + configurar Sentry SDK no backend
- 8.1.2 Instalar + configurar Logfire (FastAPI, SQLAlchemy, HTTPX)
- 8.1.3 Fingerprinting Sentry: SourceUnavailableError, TranslationFailedError, CloudflareBlockedError
- 8.1.4 Instalar + configurar Sentry React Native
- 8.1.5 Breadcrumbs: transições de tela, mudanças de capítulo, TaskQueue failures
- 8.2.1 Testes unitários backend: repositórios, pipeline, scrapers (fixtures), templates, MarianEngine
- 8.2.2 Testes workers: scrape_task, translate_task, download_batch, health_update (fakeredis)
- 8.2.3 Testes integração backend: endpoints com httpx.AsyncClient + banco memória
- 8.2.4 Cobertura 80% em `src/services/` e `src/api/`
- 8.2.5 Testes unitários mobile: core/ (task-queue, storage-manager, event-bus, stores)
- 8.2.6 Testes componentes: ui/ com Testing Library RN
- 8.2.7 Testes integração mobile: busca, leitura, player, downloads (MSW)
- 8.3.1 `.github/workflows/backend.yml`: ruff + mypy + pytest em cada push
- 8.3.2 `.github/workflows/mobile.yml`: ESLint + tsc + Jest em cada push
- 8.3.3 Workflow build Docker + push registry em merge main
- 8.3.4 Workflow deploy Railway/Fly.io em merge main
- 8.3.5 EAS Build profile `preview` (build automático em PRs)
- 8.3.6 EAS Build profile `production` (build em merge main)
- 8.3.7 EAS Submit: deploy Play Store via tag de release
- 8.4.1 Configurar Railway (API + Worker + Redis)
- 8.4.2 Configurar Backblaze B2 para MP3
- 8.4.3 Configurar variáveis de ambiente em produção
- 8.4.4 Validar health checks em produção
- 8.4.5 Publicar build closed testing na Play Store

**Total WBS-L: ~34 pacotes**

---

---

## Mapa de Dependências

```
F1-S (Fundação)
      ↓
F2-S (Banco)
      ↓
  ┌───┴───┐
  ▼       ▼
F3-S    F4-S
(Back)  (Mobile)
  └───┬───┘
      ↓
  ┌───┴───┐
  ▼       ▼
F5-S    F6-S
(Leit.) (Busca)
  └───┬───┘
      ↓
  ══ MVP funcionando ══
      ↓
  WBS-M (Beta)
      ↓
  WBS-L (Launch)
```

> **F3-S e F4-S** podem correr em paralelo após F2-S.
> **F5-S e F6-S** correm em paralelo após F3-S e F4-S.
> Testes unitários do F8-L podem começar a partir de F2-S.

---

## Resumo consolidado

| Nível | Fases | Pacotes | Objetivo |
|---|---|---|---|
| **S — Solo MVP** | F1–F6 (core) | ~139 | App funcional para uso próprio |
| **M — Beta** | F3–F6 (polimento) + Recuperação de Falhas | ~20 | Robusto, múltiplas fontes, falhas tratadas |
| **L — Launch** | F7 + F8 | ~34 | Stats, observabilidade, CI/CD, Play Store |
| **Backlog** | ChapterMapping preciso, SSE, multi-device, recomendações, TTS por parágrafo | — | Pós-launch |
| **Total** | | ~193 | |
