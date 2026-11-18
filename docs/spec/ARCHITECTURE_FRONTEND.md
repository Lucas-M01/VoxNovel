# Novel Reader App — Arquitetura Frontend (Mobile)

> **React Native / Expo** | Documento de Referência Técnica v4.0
>
> Consolidado com revisões internas + ChatGPT (rodadas 1–3) + Gemini (rodadas 1–3).
> Atualize este documento a cada decisão técnica significativa.

---

## Sumário

1. [Visão Geral e Filosofia](#1-visão-geral-e-filosofia)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Estrutura de Pastas](#3-estrutura-de-pastas)
4. [Regras de Dependência entre Camadas](#4-regras-de-dependência-entre-camadas)
5. [Path Aliases](#5-path-aliases)
6. [Camada Core](#6-camada-core)
7. [TaskQueue — Fila Local de Tarefas](#7-taskqueue--fila-local-de-tarefas)
8. [EventBus — Comunicação entre Módulos](#8-eventbus--comunicação-entre-módulos)
9. [Feature: Search — Fonte Genérica e Templates](#9-feature-search--fonte-genérica-e-templates)
10. [Feature: Player (TTS)](#10-feature-player-tts)
11. [Feature: Reader](#11-feature-reader)
12. [Preferências de Idioma por Obra](#12-preferências-de-idioma-por-obra)
13. [Gerenciamento de Múltiplas Fontes](#13-gerenciamento-de-múltiplas-fontes)
14. [Sistema de Downloads](#14-sistema-de-downloads)
15. [Gerenciamento de Armazenamento (StoragePolicy)](#15-gerenciamento-de-armazenamento-storagepolicy)
16. [Estatísticas e Histórico de Leitura](#16-estatísticas-e-histórico-de-leitura)
17. [Estratégia de Estado](#17-estratégia-de-estado)
18. [Bootstrap da Aplicação](#18-bootstrap-da-aplicação)
19. [Estratégia de Testes](#19-estratégia-de-testes)
20. [Convenções de Código](#20-convenções-de-código)
21. [CI/CD e Deploy](#21-cicd-e-deploy)

---

## 1. Visão Geral e Filosofia

### 1.1 Princípios fundamentais

- Separação estrita de camadas com dependências em sentido único
- Server state via TanStack Query com níveis de cache explícitos
- Client state global mínimo via Zustand; estado local via `useState`/`useReducer`
- Nenhum `useEffect` para data fetching, mutations ou derived state
- Sem barrel exports — imports diretos por path alias
- Todo schema de validação nasce de Zod; tipos inferidos do schema
- Cada feature é autocontida e portável
- `react-native-track-player` obrigatório para áudio em background
- `target_language` como string extensível — nunca enum fechado
- TaskQueue local para todo processamento assíncrono pesado
- EventBus tipado para comunicação reativa entre módulos desacoplados
- StoragePolicy com LRU automático para áudio e texto
- Stats e histórico apenas no WatermelonDB na fase solo (sem backend)

### 1.2 Níveis de cache

```
Backend (FastAPI)
      ↓
React Query memory cache (staleTime 10min, gcTime 1h)
      ↓
WatermelonDB (SQLite off-thread — persistência offline)
```

Capítulos acessados repetidamente servidos da memória sem tocar o banco. Configuração no `queries.ts`:

```typescript
export const chapterQueryOptions = (novelId: string, num: number, lang: TargetLanguage) =>
  queryOptions({
    queryKey: keys.chapters.content(novelId, num, lang),
    queryFn:  () => api.fetchChapter(novelId, num, lang),
    staleTime: 1000 * 60 * 10,
    gcTime:    1000 * 60 * 60,
  })
```

---

## 2. Stack Tecnológica

### 2.1 Core

| Pacote | Versão | Fase | Responsabilidade |
|---|---|---|---|
| React Native | 0.75+ | Solo | Framework mobile |
| Expo SDK | 51+ | Solo | Toolchain, EAS Build |
| TypeScript | 5.x strict | Solo | Tipagem estática |
| Expo Router | 3.x | Solo | File-based routing |
| TanStack Query | 5.x | Solo | Server state + memory cache |
| Zustand | 4.x | Solo | Client state global |
| Zod | 3.x | Solo | Schemas e validação |
| react-hook-form | 7.x | Solo | Formulários |
| **react-native-track-player** | 4.x | Solo | **Áudio em background — OBRIGATÓRIO** |
| WatermelonDB | 0.27+ | Solo | SQLite off-thread |
| MMKV | 2.x | Solo | Preferências e stores |
| axios | 1.x | Solo | HTTP via http-resource.ts |
| expo-background-fetch | 3.x | Solo | Sync com app fechado |
| expo-task-manager | 1.x | Solo | Tarefas nativas background |
| expo-file-system | 17.x | Solo | Downloads + armazenamento |

### 2.2 Dev tooling

| Ferramenta | Fase |
|---|---|
| ESLint + `eslint-plugin-boundaries` | Solo |
| Prettier | Solo |
| Jest + Testing Library RN | Solo |
| MSW (`msw/native`) | Solo |
| Sentry RN | **Comercial** |

> **Por que `react-native-track-player` é obrigatório?** `expo-speech` para quando o app vai para background. O `react-native-track-player` implementa serviço nativo (AVFoundation no iOS, ExoPlayer no Android) com lock screen controls. Requisito funcional 5.1 não é atendível de outra forma.

---

## 3. Estrutura de Pastas

```
apps/mobile/src/
  core/
    api/                        # Módulos por domínio
      novels.ts
      chapters.ts
      sources.ts
      tts.ts
      downloads.ts
      filters.ts
      glossary.ts
      stats.ts                  # Fase comercial
    locales/
      pt-BR.json
      en.json
    __specs__/
    audio-service.ts            # Wrapper TrackPlayer + fila contínua
    auth-context.ts
    auth-provider.tsx
    constants.ts
    db.ts                       # WatermelonDB singleton + modelos
    event-bus.ts                # EventBus tipado — NOVO v4.0
    hooks.ts
    http-resource.ts
    i18n.ts
    keys.ts                     # Query key factory (com lang)
    queries.ts                  # queryOptions centralizados
    session-store.ts
    app-store.ts                # tema, locale, fontSize, target_language_global
    player-store.ts             # currentChapter, speed, lang
    download-store.ts
    task-queue.ts
    storage-manager.ts

  ui/                           # Design system — zero regra de negócio
    variants.ts
    button.tsx
    text.tsx
    input.tsx
    badge.tsx
    card.tsx
    sheet.tsx
    loading.tsx
    skeleton.tsx
    progress-bar.tsx
    icon.tsx
    slider.tsx
    toast.tsx
    storage-indicator.tsx
    chapter-status-badge.tsx    # NOVO v4.0 — exibe ChapterStatus

  pattern/
    form.tsx
    form.hooks.ts
    source-picker.tsx
    chapter-range.tsx
    download-queue.tsx
    error-boundary.tsx
    offline-banner.tsx
    language-toggle.tsx

  layouts/
    main-layout.tsx             # Tab bar + mini-player persistente
    reader-layout.tsx
    modal-layout.tsx

  features/
    library/
      hooks.ts
      schemas.ts
      novel-card.tsx
      library-list.tsx          # Paginação infinita (blocos de 100)
      empty-state.tsx
      __specs__/

    novel-detail/
      hooks.ts
      schemas.ts
      source-list.tsx           # Exibe SourceHealthScore por fonte
      progress-controls.tsx
      download-section.tsx
      reading-prefs.tsx
      glossary-manager.tsx      # priority + enabled
      storage-section.tsx
      __specs__/

    reader/
      hooks.ts
      schemas.ts
      text-renderer.tsx
      filter-pipeline.tsx
      glossary-pipeline.tsx
      reader-controls.tsx
      autoscroll-controller.tsx
      settings-panel.tsx
      __specs__/

    player/
      hooks.ts
      player-bar.tsx
      player-screen.tsx
      voice-settings.tsx
      continuous-queue.ts       # Fila contínua de capítulos
      __specs__/

    search/
      hooks.ts
      schemas.ts
      search-bar.tsx
      source-results.tsx
      generic-source-form.tsx
      extractor-template-picker.tsx
      __specs__/

    settings/
      hooks.ts
      schemas.ts
      filter-manager.tsx
      backup-section.tsx
      storage-settings.tsx
      __specs__/

    stats/                      # Fase comercial (WBS-L)
      hooks.ts
      schemas.ts
      reading-stats.tsx
      reading-history.tsx
      __specs__/

  screens/
    (tabs)/
      _layout.tsx
      index.tsx
      search.tsx
      stats.tsx                 # Fase comercial
      settings.tsx
    novel/
      [id]/
        index.tsx
        read.tsx
        listen.tsx
    _layout.tsx
    +not-found.tsx

  mocks/
    browser.ts
    handlers/
      novels.ts
      sources.ts
      tts.ts
      downloads.ts
    setup-specs.ts
```

---

## 4. Regras de Dependência entre Camadas

```
screens
   ↓
features
   ↓
pattern  ←  layouts
   ↓
  ui
   ↓
 core
```

| Camada | Pode importar de | Nunca importa de |
|---|---|---|
| `core` | `core`, `mocks` | `ui`, `pattern`, `features`, `screens` |
| `ui` | `ui` | tudo acima |
| `pattern` | `core`, `ui`, `pattern` | `features`, `screens`, `layouts` |
| `layouts` | `core`, `ui`, `layouts` | `pattern`, `features`, `screens` |
| `features` | `core`, `ui`, `pattern`, outras features (com parcimônia) | `screens`, `layouts` |
| `screens` | tudo exceto `mocks` em produção | — |

---

## 5. Path Aliases

| Alias | Resolve para |
|---|---|
| `@core/*` | `src/core/*` |
| `@ui/*` | `src/ui/*` |
| `@pattern/*` | `src/pattern/*` |
| `@features/*` | `src/features/*` |
| `@layouts/*` | `src/layouts/*` |
| `@screens/*` | `src/screens/*` |
| `@mocks/*` | `src/mocks/*` |

---

## 6. Camada Core

### 6.1 `http-resource.ts`

- `defineApiRoute`, `httpResource<T>()`, `httpUpload<T>()`, `FriendlyError`
- Headers automáticos + refresh de token transparente
- Normalização de erros `application/problem+json`

### 6.2 `keys.ts`

```typescript
export const keys = createQueryKeyStore({
  novels:   { all: null, detail: (id: string) => [id] },
  sources:  { byNovel: (novelId: string) => [novelId] },
  chapters: {
    bySource: (sourceId: string) => [sourceId],
    content:  (chapterId: string, lang: TargetLanguage) => [chapterId, lang],
  },
  tts:      { audio: (chapterId: string, hash: string, lang: TargetLanguage) => [chapterId, hash, lang] },
  glossary: { byNovel: (novelId: string) => [novelId] },
})
```

### 6.3 `audio-service.ts`

- `setupPlayer()` — inicialização única no bootstrap
- `addToQueue(tracks, lang)` — enfileira com idioma
- `resolveTrackUrl(chapterId, lang)` — Kokoro ou expo-speech conforme `isPremium`
- `scheduleNextChapters(currentNum, lookahead)` — pré-carrega próximos na fila contínua
- Progresso exposto via EventEmitter → `event-bus.ts`

### 6.4 `db.ts` — WatermelonDB

Modelos off-thread: `Obra`, `Fonte`, `Capitulo` (com `content_hash`, `translated_hash`, `chapter_status`), `Progresso`, `DownloadJob`, `DownloadChapter`, `Filtro`, `AudioCache`, `GlossaryEntry`, `ReadingStats`, `ReadingHistory`.

### 6.5 Stores Zustand

| Store | Conteúdo | Persistência |
|---|---|---|
| `session-store.ts` | userId, tokens | MMKV encrypted |
| `app-store.ts` | tema, locale, fontSize, `target_language_global`, `storage_limit_bytes` | MMKV |
| `player-store.ts` | currentNovelId, chapterId, isPlaying, speed, pitch, lang | MMKV |
| `download-store.ts` | DownloadJobs ativos | Memória |

---

## 7. TaskQueue — Fila Local de Tarefas

```typescript
type TaskType =
  | 'DOWNLOAD_CHAPTER'
  | 'TRANSLATE_CHAPTER'
  | 'GENERATE_AUDIO'
  | 'SYNC_SOURCE'
  | 'UPDATE_NOVEL'
  | 'CLEANUP_STORAGE'
  | 'PREFETCH_CHAPTERS'
  | 'UPDATE_STATS'       // Fase comercial

interface Task {
  id:       string
  type:     TaskType
  payload:  Record<string, unknown>
  priority: number
  status:   'pending' | 'running' | 'done' | 'failed'
  retries:  number
}
```

- Tasks `SYNC_SOURCE` e `UPDATE_NOVEL` registradas com `expo-task-manager` para background fetch
- Downloads via `FileSystem.createDownloadResumable` — resumíveis mesmo com app fechado
- `CLEANUP_STORAGE` enfileirado automaticamente após cada download concluído

---

## 8. EventBus — Comunicação entre Módulos

> **Novo v4.0.** Resolve o problema de comunicação entre módulos desacoplados sem prop drilling ou consultas repetitivas.

```typescript
// core/event-bus.ts
type AppEvent =
  | { type: 'CHAPTER_TRANSLATED'; chapterId: string; lang: TargetLanguage }
  | { type: 'AUDIO_READY';        chapterId: string; lang: TargetLanguage; url: string }
  | { type: 'DOWNLOAD_FINISHED';  jobId: string }
  | { type: 'SOURCE_UPDATED';     novelId: string; newSourceId: string }
  | { type: 'PLAYER_PROGRESS';    positionMs: number; chapterId: string }

class TypedEventBus extends EventEmitter {
  emit<T extends AppEvent>(event: T): boolean {
    return super.emit(event.type, event)
  }
  on<T extends AppEvent['type']>(
    event: T,
    listener: (e: Extract<AppEvent, { type: T }>) => void
  ): this {
    return super.on(event, listener)
  }
}

export const eventBus = new TypedEventBus()
```

**Uso nos módulos:**

```typescript
// audio-service.ts — emite progresso
TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, ({ position }) => {
  eventBus.emit({ type: 'PLAYER_PROGRESS', positionMs: position * 1000, chapterId: currentId })
})

// autoscroll-controller.tsx — escuta progresso sem consultar o player diretamente
useEffect(() => {
  const sub = eventBus.on('PLAYER_PROGRESS', ({ positionMs }) => {
    scrollTo(calculateOffset(positionMs, wordsPerMinute))
  })
  return () => sub.off('PLAYER_PROGRESS', sub)
}, [])

// features/reader/hooks.ts — escuta tradução pronta
useEffect(() => {
  eventBus.on('CHAPTER_TRANSLATED', ({ chapterId }) => {
    queryClient.invalidateQueries(keys.chapters.content(chapterId, lang))
  })
}, [])
```

> O EventBus é um wrapper tipado sobre o `EventEmitter` nativo do Node — não é uma nova biblioteca. Toda comunicação entre módulos que antes exigiria polling ou `useEffect` de consulta agora passa por eventos tipados.

---

## 9. Feature: Search — Fonte Genérica e Templates

### 9.1 Fontes pré-configuradas vs. genérica

| Tipo | Componente |
|---|---|
| Fonte pré-configurada | `source-results.tsx` |
| Fonte genérica | `generic-source-form.tsx` + `extractor-template-picker.tsx` |

### 9.2 Fluxo de identificação

1. Usuário cola URL → `POST /sources/identify`
2. Se reconhecida → `source-results.tsx` com dados pré-preenchidos
3. Se genérica → `generic-source-form.tsx` com template detectado automaticamente

### 9.3 Schema Zod

```typescript
const GenericSourceSchema = z.object({
  url_base:             z.string().url(),
  nome_obra:            z.string().min(2),
  capa_url:             z.string().url().optional(),
  total_capitulos:      z.number().int().positive().optional(),
  seletor_conteudo:     z.string().optional(),
  padrao_url_capitulo:  z.string().optional(),
  idioma_original:      z.enum(['en', 'zh', 'jp', 'kr', 'other']).default('en'),
  extractor_template:   z.enum(['madara_theme', 'novelbin_clone', 'royalroad_clone', 'wordpress_generic', 'custom']).default('custom'),
})
```

---

## 10. Feature: Player (TTS)

### 10.1 Arquitetura

| Arquivo | Responsabilidade |
|---|---|
| `core/audio-service.ts` | Setup, fila, URL por lang, scheduleNextChapters, emite PLAYER_PROGRESS |
| `features/player/hooks.ts` | useTrackPlayer, usePlayerState, useContinuousQueue |
| `features/player/continuous-queue.ts` | scheduleNextChapters com lookahead=2 |
| `features/player/player-bar.tsx` | Mini player global no MainLayout |
| `features/player/player-screen.tsx` | Tela expandida |
| `features/player/voice-settings.tsx` | Voz, pitch, volume |

### 10.2 Fila contínua

```typescript
export async function scheduleNextChapters(
  currentNum: number,
  novelId: string,
  lang: TargetLanguage,
  lookahead = 2
): Promise<void> {
  for (let i = 1; i <= lookahead; i++) {
    const url = await resolveAudioUrl(novelId, currentNum + i, lang)
    await TrackPlayer.add({ id: `${novelId}-${currentNum + i}-${lang}`, url })
  }
}
```

### 10.3 Prefetch adaptativo (novo v4.0)

O tipo de prefetch é determinado pelo estado atual do player — não por histórico dos últimos N capítulos:

```typescript
// features/player/hooks.ts
const isPlaying = usePlayerStore(s => s.isPlaying)

useEffect(() => {
  if (isPlaying) {
    // Player ativo → pré-carrega áudio dos próximos capítulos
    taskQueue.enqueue({ type: 'GENERATE_AUDIO', payload: { chapterNum: current + 1 }, priority: 8 })
  } else {
    // Player inativo → pré-carrega texto
    queryClient.prefetchQuery(chapterQueryOptions(novelId, current + 1, lang))
  }
}, [isPlaying, current])
```

### 10.4 Tipos de TTS

| Tipo | Implementação | Quando usar |
|---|---|---|
| Local — original | expo-speech, voz nativa do idioma | Offline, tier gratuito |
| Local — traduzido | expo-speech, voz PT-BR nativa | Offline, tier gratuito |
| Kokoro — original | Streaming `/tts/{id}?lang=original` | Premium, conectado |
| Kokoro — traduzido | Streaming `/tts/{id}?lang=pt-BR` | Premium, conectado |

### 10.5 Auto-scroll sincronizado

```
eventBus.on('PLAYER_PROGRESS')
      ↓
autoscroll-controller.tsx
      ↓
words_per_minute × elapsed_seconds → offset
      ↓
ScrollView.scrollTo(offset, animated: true)
```

---

## 11. Feature: Reader

### 11.1 Pipeline de texto

```
texto (raw ou traduzido)
      ↓ filter-pipeline.tsx (filtros globais + obra)
      ↓ glossary-pipeline.tsx (priority DESC, word boundary)
      → exibição
```

O texto filtrado nunca é persistido — o cache guarda o original.

### 11.2 Pré-carregamento silencioso

```typescript
// screens/novel/[id]/read.tsx
useEffect(() => {
  for (let i = 1; i <= 3; i++) {
    queryClient.prefetchQuery(chapterQueryOptions(novelId, capituloAtual + i, targetLanguage))
  }
}, [capituloAtual])
```

### 11.3 Leitura contínua (novo v4.0)

Quando o usuário chega ao final do capítulo (scroll position ≥ 95%):

```typescript
// features/reader/hooks.ts
const handleScrollEnd = useCallback(() => {
  // 1. Salva posição no Progresso
  db.write(() => progresso.update(p => { p.capitulo_atual = capituloAtual + 1 }))

  // 2. Navega automaticamente para o próximo (sem loading — já pré-carregado)
  router.replace(`/novel/${novelId}/read?chapter=${capituloAtual + 1}`)

  // 3. Pré-carrega os próximos após a navegação
  taskQueue.enqueue({ type: 'PREFETCH_CHAPTERS', payload: { from: capituloAtual + 2 }, priority: 5 })
}, [capituloAtual])
```

### 11.4 Configurações de leitura

- `fontSize`, `fontFamily`, `lineHeight`, `paragraphSpacing`
- `textWidth`, `tema` (light/dark/oled)
- `autoScroll`: velocidade fixa ou `sync_with_tts`

---

## 12. Preferências de Idioma por Obra

```typescript
type TargetLanguage = 'original' | 'pt-BR' | 'en' | 'es' | 'fr' | 'de' | string

const PreferenciaLeituraSchema = z.object({
  idioma_original:          z.string(),
  target_language:          z.string(),
  traduzir_automaticamente: z.boolean().default(true),
})
```

**Fluxo:**
```
app-store.target_language_global (padrão)
      ↓ override por obra em reading-prefs.tsx
player-store.lang → audio-service.ts → URL com ?lang=
queryKeys incluem lang → caches separados
http-resource.ts → GET ?lang= → raw ou traduzido
```

---

## 13. Gerenciamento de Múltiplas Fontes

### 13.1 Sincronização de progresso

Troca de fonte: progresso sincronizado por percentual com banner de aviso.
`canonical_chapter_index` guardado desde o início para futuro `ChapterMapping` preciso.

### 13.2 SourceHealthScore no mobile

`features/novel-detail/source-list.tsx` exibe o score de cada fonte (obtido via `GET /sources/{id}/health`). Fontes com score baixo são sinalizadas visualmente, sugerindo ao usuário trocar para uma fonte mais saudável.

### 13.3 Fallback automático

Implementado no backend. O mobile recebe o conteúdo ou `SourceUnavailableError` → aciona seleção manual.

---

## 14. Sistema de Downloads

### 14.1 Modelo expandido

```
DownloadJob
  ├─ DownloadChapter (done)
  ├─ DownloadChapter (running)
  └─ DownloadChapter (pending)
```

```typescript
interface DownloadJob {
  id:             string
  novelId:        string
  chapterStart:   number
  chapterEnd:     number
  type:           'text' | 'audio' | 'both'
  lang:           TargetLanguage
  status:         'pending' | 'running' | 'paused' | 'done' | 'failed'
  completedCount: number
  totalCount:     number
}
```

### 14.2 Funcionalidades

- Pausar / retomar / cancelar / reprocessar falhas individualmente
- Download de áudio via `FileSystem.createDownloadResumable`
- EventBus emite `DOWNLOAD_FINISHED` ao concluir → reader/player já tem o conteúdo disponível

---

## 15. Gerenciamento de Armazenamento (StoragePolicy)

```typescript
interface StoragePolicy {
  audio_limit_bytes:     number   // padrão: 2 GB
  text_limit_bytes:      number   // padrão: 500 MB
  mode: 'keep_all' | 'keep_last_n' | 'delete_after_read'
  keep_last_n_chapters?: number
}
```

**LRU para áudio:**
- `enforceAudioLimit()` ordena arquivos por `lastModified` e deleta os mais antigos até ficar abaixo do limite
- Remove entrada correspondente do WatermelonDB (`AudioCache`)
- Executado via task `CLEANUP_STORAGE` após cada download concluído

**Opções no settings:** keep_all, keep_last_n (50/100/200), delete_after_read. Slider de limite (500 MB a 10 GB).

---

## 16. Estatísticas e Histórico de Leitura

> **Fase solo:** apenas no WatermelonDB local. Sem sincronização com backend.
> **Fase comercial:** sincronização via `POST /stats/record` + `GET /history`.

```typescript
// WatermelonDB local (todas as fases)
interface ReadingStats {
  novelId:           string | null  // null = global
  minutesRead:       number
  minutesListened:   number
  chaptersCompleted: number
  wordsRead:         number
  currentStreak:     number
  longestStreak:     number
  lastReadAt:        number
}

interface ReadingHistory {
  novelId:      string
  chapterNum:   number
  accessedAt:   number
  durationMs:   number
}
```

Stats atualizadas via task `UPDATE_STATS` na TaskQueue — não bloqueia a thread de leitura.

---

## 17. Estratégia de Estado

| Tipo | Ferramenta | Exemplos |
|---|---|---|
| Server state | TanStack Query | Capítulos, busca, fontes |
| Memory cache | React Query (`staleTime`/`gcTime`) | Capítulos recentemente lidos |
| Local UI | useState/useReducer | Modal, tab ativa |
| Global persistido | Zustand + MMKV | Tema, token, `target_language` |
| Global volátil | Zustand | DownloadJobs ativos |
| Formulário | react-hook-form + Zod | Fonte genérica, settings |
| URL/rota | Expo Router params | Capítulo atual |
| Banco offline | WatermelonDB | Biblioteca, capítulos, stats |
| Eventos reativos | EventBus | PLAYER_PROGRESS, CHAPTER_TRANSLATED |

---

## 18. Bootstrap da Aplicação

1. `setupPlayer()` — TrackPlayer nativo
2. `MMKV.initialize()`
3. `app-store.rehydrate()` — tema/locale antes da UI
4. `initI18n(locale)`
5. `storageManager.initialize()`
6. `taskQueue.initialize()` — retoma tarefas pendentes
7. `authProvider.initialize()`
8. Se `DEV + MOCK_API=true` → `msw.start()`
9. Render: `<I18nProvider><QueryClientProvider><NavigationContainer>`

> TrackPlayer **primeiro**. TaskQueue antes do authProvider para retomar downloads pendentes sem esperar autenticação.

---

## 19. Estratégia de Testes

| Nível | Ferramenta | O que testar | Fase |
|---|---|---|---|
| Unitário | Jest | core/ (task-queue, storage-manager, event-bus, stores), pipelines de filtro e glossário, schemas Zod | Solo |
| Componente | Testing Library RN | ui/ em isolamento | Solo |
| Integração | Testing Library RN + MSW | Busca, leitura, player, downloads | Solo |
| E2E | Maestro ou Detox | Fluxos críticos em device | Comercial |

---

## 20. Convenções de Código

- Sem barrel exports
- `type` em vez de `interface` (salvo herança intencional)
- Funções puras em vez de classes
- Path aliases entre camadas diferentes — nunca imports relativos
- Sem casts `as X` — ajuste o tipo na origem
- Schemas sempre em Zod; tipos por `z.infer<>`
- Nenhum `useEffect` para fetch/mutation/derived state
- TrackPlayer apenas em `core/audio-service.ts` e `features/player/hooks.ts`
- WatermelonDB apenas em `core/db.ts` e hooks de feature
- EventBus apenas em `core/event-bus.ts` — nunca instanciar diretamente em features
- Screens finas: guard + prefetch + composição, zero lógica de negócio
- `target_language` explícito em queryKeys — nunca implícito
- Tarefas pesadas sempre via TaskQueue — nunca em `useEffect` ou event handler direto
