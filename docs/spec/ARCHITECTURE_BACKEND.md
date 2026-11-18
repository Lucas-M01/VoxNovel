# Novel Reader App — Arquitetura Backend (API)

> **FastAPI / Python** | Documento de Referência Técnica v4.0
>
> Consolidado com revisões internas + ChatGPT (rodadas 1–3) + Gemini (rodadas 1–3).
> Atualize este documento a cada decisão técnica significativa.

---

## Sumário

1. [Visão Geral e Filosofia](#1-visão-geral-e-filosofia)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Estrutura de Pastas](#3-estrutura-de-pastas)
4. [Camada de API](#4-camada-de-api)
5. [Autenticação (JWT + SOLO_MODE)](#5-autenticação-jwt--solo_mode)
6. [Serviço de Scraping](#6-serviço-de-scraping)
7. [Fila de Tarefas (ARQ + Redis)](#7-fila-de-tarefas-arq--redis)
8. [Serviço de Tradução](#8-serviço-de-tradução)
9. [Serviço de TTS (Kokoro-82M)](#9-serviço-de-tts-kokoro-82m)
10. [Pipeline de Processamento de Texto](#10-pipeline-de-processamento-de-texto)
11. [Glossário de Nomes](#11-glossário-de-nomes)
12. [Templates de Extração](#12-templates-de-extração)
13. [Banco de Dados](#13-banco-de-dados)
14. [Configuração](#14-configuração-coreconfpy)
15. [Observabilidade](#15-observabilidade)
16. [Estratégia de Testes](#16-estratégia-de-testes)
17. [Deploy e Infraestrutura](#17-deploy-e-infraestrutura)
18. [Convenções de Código](#18-convenções-de-código)

---

## 1. Visão Geral e Filosofia

Este documento define a arquitetura técnica e organizacional do backend do Novel Reader App — uma API FastAPI (Python) responsável por scraping, tradução, geração de áudio TTS e catalogação de novels.

### 1.1 Responsabilidades do backend

- Orquestração de scraping assíncrono com fallback por score de saúde de fonte
- Catalogação: mapeamento de obras e capítulos por URL
- Tradução inteligente: MarianMT local (gratuito) e GPT-4o-mini (premium)
- Geração de áudio: Kokoro-82M em CPU, cache por hash MD5 com suporte a `lang`
- Pipeline de processamento de texto antes de qualquer tradução ou TTS
- Glossário de nomes por obra com `priority` e `enabled`
- Templates de extração para sites com temas conhecidos (Madara, NovelBin, etc.)
- Fila ARQ para toda tarefa pesada
- Autenticação JWT com `SOLO_MODE` para uso próprio sem atrito

### 1.2 Princípios fundamentais

- Todo scraping em fila ARQ — nunca bloqueia a requisição HTTP
- Motores de tradução e TTS atrás de interfaces Strategy pattern
- Cache de áudio obrigatório — hash MD5 inclui `lang` para caches separados por idioma
- SQLModel como ORM — troca de DB sem reescrever queries
- Pipeline de texto explícito antes de salvar qualquer `conteudo_raw`
- `target_language` como string extensível — sem enum fechado
- `ChapterStatus` explícito — estado do capítulo nunca implícito
- `content_hash` para invalidação de tradução quando fonte atualiza o capítulo
- `SourceHealthScore` para fallback inteligente por qualidade real, não por ordem fixa
- Configuração 100% via `.env` — sem valores hardcoded

---

## 2. Stack Tecnológica

| Pacote | Versão alvo | Responsabilidade |
|---|---|---|
| Python | 3.12+ | Runtime principal |
| FastAPI | 0.115+ | Framework web async |
| Poetry | 1.8+ | Gerenciamento de dependências |
| SQLModel | 0.0.21+ | ORM (SQLAlchemy + Pydantic) |
| SQLite | — | Banco fase solo |
| PostgreSQL | 16+ | Banco fase comercial |
| HTTPX | 0.27+ | Requisições HTTP assíncronas |
| BeautifulSoup4 | 4.x | Parsing de HTML |
| Playwright | 1.x | Bypass de Cloudflare |
| playwright-stealth | latest | Remove assinaturas de automação |
| ARQ | 0.26+ | Fila de tarefas async sobre Redis |
| Redis | 7.x | Broker ARQ + cache de sessões |
| **MarianMT** (Hugging Face) | latest | **Tradução local gratuita — motor padrão** |
| openai | 1.x | GPT-4o-mini — motor premium |
| Kokoro-82M | latest | TTS neural em CPU |
| python-jose | 3.x | JWT |
| Sentry SDK | 2.x | Rastreamento de erros (fase comercial) |
| Logfire | 0.x | Logs estruturados (fase comercial) |
| Pydantic Settings | 2.x | Configuração via `.env` tipada |

---

## 3. Estrutura de Pastas

```
apps/backend/
  src/
    api/
      v1/
        auth.py
        novels.py
        sources.py
        tts.py
        downloads.py
        filters.py
        glossary.py
        stats.py          # Fase comercial (WBS-L)
        history.py        # Fase comercial (WBS-L)
      deps.py
      router.py

    core/
      config.py
      security.py
      exceptions.py
      logging.py          # Fase comercial (WBS-L)

    database/
      connection.py
      migrations/
      models/
        obra.py
        fonte.py
        fonte_health.py   # SourceHealthScore — NOVO v4.0
        capitulo.py       # + content_hash, translated_hash, chapter_status
        progresso.py
        download_job.py
        download_chapter.py
        filtro.py
        audio_cache.py
        glossary.py
        reading_stats.py  # Fase comercial (WBS-L)
        reading_history.py # Fase comercial (WBS-L)
        user.py
      repositories/
        obra_repo.py
        fonte_repo.py
        fonte_health_repo.py  # NOVO v4.0
        capitulo_repo.py
        audio_cache_repo.py
        glossary_repo.py
        download_repo.py
        stats_repo.py     # Fase comercial (WBS-L)
        history_repo.py   # Fase comercial (WBS-L)

    services/
      scraper/
        base.py
        orchestrator.py       # Fallback por SourceHealthScore — atualizado v4.0
        session_store.py
        user_agents.py
        extractor_templates.py
        providers/
          freewebnovel.py
          centralnovel.py
          novelfire.py
          royalroad.py
          generic.py

      translation/
        base.py
        marian_engine.py
        openai_engine.py
        factory.py

      tts/
        base.py
        kokoro_engine.py
        factory.py

      text_pipeline/
        pipeline.py
        stages/
          html_cleaner.py
          global_filters.py
          novel_filters.py
          glossary_replacer.py

      tasks/
        scrape_task.py
        translate_task.py
        tts_task.py
        download_batch_task.py
        health_update_task.py  # NOVO v4.0 — atualiza SourceHealthScore
        stats_task.py          # Fase comercial (WBS-L)
        worker.py

    main.py

  tests/
    unit/
      scrapers/fixtures/
        freewebnovel/
        novelfire/
        royalroad/
        generic/
        madara_theme/
        novelbin_clone/
      translation/
      tts/
      text_pipeline/
      downloads/
    integration/
    conftest.py

  pyproject.toml
  .env.example
  alembic.ini
  database.db
```

---

## 4. Camada de API

### 4.1 Endpoints

| Endpoint | Método | Fase | Descrição |
|---|---|---|---|
| `POST /auth/login` | POST | Solo | Autentica, retorna tokens (ou bypass em SOLO_MODE) |
| `POST /auth/refresh` | POST | Solo | Renova access token |
| `GET /novels` | GET | Solo | Lista obras (paginada) |
| `POST /novels` | POST | Solo | Adiciona obra |
| `GET /novels/{id}` | GET | Solo | Detalhes |
| `DELETE /novels/{id}` | DELETE | Solo | Remove obra |
| `GET /novels/{id}/chapters` | GET | Solo | Lista capítulos |
| `GET /novels/{id}/chapters/{num}?lang=` | GET | Solo | Conteúdo (raw ou traduzido) |
| `POST /sources` | POST | Solo | Adiciona fonte |
| `PUT /sources/{id}/activate` | PUT | Solo | Define fonte ativa |
| `POST /sources/identify` | POST | Solo | Identifica provider + template |
| `GET /sources/{id}/health` | GET | Solo | Score de saúde da fonte |
| `GET /tts/{chapterId}?lang=` | GET | Solo | Streaming MP3 com cache |
| `POST /downloads/jobs` | POST | Solo | Cria DownloadJob em lote |
| `GET /downloads/jobs/{jobId}` | GET | Solo | Status com progresso granular |
| `PUT /downloads/jobs/{jobId}/pause` | PUT | Solo | Pausa job |
| `PUT /downloads/jobs/{jobId}/resume` | PUT | Solo | Retoma job |
| `DELETE /downloads/jobs/{jobId}` | DELETE | Solo | Cancela e limpa |
| `POST /downloads/jobs/{jobId}/retry-failed` | POST | Solo | Re-enfileira com falha |
| `GET /filters` | GET | Solo | Lista filtros |
| `POST /filters` | POST | Solo | Cria filtro |
| `PUT /filters/{id}` | PUT | Solo | Atualiza filtro |
| `DELETE /filters/{id}` | DELETE | Solo | Remove filtro |
| `GET /glossary/{novelId}` | GET | Solo | Retorna glossário |
| `POST /glossary/{novelId}` | POST | Solo | Adiciona/atualiza entrada |
| `DELETE /glossary/{novelId}/{term}` | DELETE | Solo | Remove entrada |
| `GET /stats` | GET | **Comercial** | Stats globais |
| `GET /stats/{novelId}` | GET | **Comercial** | Stats por obra |
| `POST /stats/record` | POST | **Comercial** | Registra sessão |
| `GET /history` | GET | **Comercial** | Histórico recente |
| `GET /history/{novelId}` | GET | **Comercial** | Histórico por obra |

> Endpoints marcados como **Comercial** não existem na fase solo. Stats e histórico ficam apenas no WatermelonDB local até a fase de sincronização em nuvem.

### 4.2 `deps.py`

- `get_session()` — sessão SQLModel por request
- `get_current_user()` — decodifica JWT **ou** retorna usuário padrão se `SOLO_MODE=true`
- `get_current_premium_user()` — verifica tier
- `get_translation_engine()` — factory
- `get_tts_engine()` — factory
- `get_text_pipeline(novel_id)` — instancia pipeline com filtros e glossário

---

## 5. Autenticação (JWT + SOLO_MODE)

### 5.1 SOLO_MODE — sem atrito para uso próprio

```python
# core/security.py
async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> User:
    if settings.SOLO_MODE:
        # Retorna usuário padrão sem validar token
        return await get_or_create_default_user(session)
    # Fluxo normal JWT
    return await decode_and_validate(token, session)
```

Não existe `FakeAuthMiddleware` separado — apenas uma condição em `get_current_user`. Isso mantém um único caminho de código entre solo e produção, eliminando divergência de comportamento.

### 5.2 Fluxo JWT (fase comercial)

- **Access token:** expiração 15 minutos, claims: `sub`, `tier`, `jti`
- **Refresh token:** expiração 30 dias, tabela `refresh_tokens` (revogável)
- `http-resource.ts` renova automaticamente quando token < 2min para expirar

---

## 6. Serviço de Scraping

### 6.1 Arquitetura de adaptadores

```python
class ScraperAdapter(ABC):
    @abstractmethod
    async def get_index(self, url: str) -> NovelIndex: ...

    @abstractmethod
    async def get_chapter(self, url: str) -> ChapterContent: ...

    @abstractmethod
    def can_handle(self, url: str) -> bool: ...
```

### 6.2 SourceHealthScore — fallback inteligente (novo v4.0)

Em vez de fallback por ordem fixa, o orquestrador seleciona a próxima fonte pelo **score de saúde**, calculado dinamicamente a cada resultado.

```python
# database/models/fonte_health.py
class FonteHealth(SQLModel, table=True):
    id:               uuid.UUID
    fonte_id:         uuid.UUID    # FK → Fonte
    success_count:    int = 0
    failure_count:    int = 0
    avg_response_ms:  float = 0.0
    last_success_at:  datetime | None = None
    last_failure_at:  datetime | None = None
    updated_at:       datetime

    @property
    def score(self) -> float:
        """0.0 (morta) a 100.0 (perfeita). Média ponderada."""
        total = self.success_count + self.failure_count
        if total == 0:
            return 50.0  # Score neutro para fontes sem histórico
        success_rate = (self.success_count / total) * 100
        # Penaliza fontes lentas (>3s = -20 pontos)
        speed_penalty = max(0, (self.avg_response_ms - 3000) / 100)
        return max(0.0, success_rate - speed_penalty)
```

**Fallback ordenado por score:**

```python
# orchestrator.py
async def get_chapter_with_fallback(novel_id, chapter_num, lang):
    fontes = await fonte_repo.list_by_novel_ordered_by_health(novel_id)
    for fonte in fontes:  # já ordenadas por score DESC
        try:
            result = await scrape_with_timeout(fonte, chapter_num)
            await health_repo.record_success(fonte.id, elapsed_ms)
            return result
        except (TimeoutError, ScrapingError) as e:
            await health_repo.record_failure(fonte.id)
            continue
    raise SourceUnavailableError(novel_id, chapter_num)
```

> A task `health_update_task.py` recalcula scores periodicamente (cron diário) e marca fontes com score < 20 como `status=erro`.

### 6.3 Estratégia anti-403 (Cloudflare) — 5 camadas

```
HTTPX + headers realistas
      ↓ 200? → Sucesso
      ↓ 403 / "Just a moment..."
User-Agent rotativo
      ↓ 200? → Sucesso
      ↓
Playwright + playwright-stealth
      ↓ Resolve desafio
Persistir cookies (storage_state.json por domínio)
      ↓ Reutilizar nas próximas requisições
      ↓ (ainda falhou — fase comercial)
API externa (ScraperAPI / ZenRows)
```

### 6.4 Cache Redis (TTL 24h)

```
Capítulo solicitado
      ↓ Redis? → Retorna
      ↓ Banco (conteudo_raw)? → Retorna + popula Redis
      ↓ Scraping → salva banco + Redis
```

### 6.5 Scraper genérico + templates

Ordem de tentativa: template explícito → seletor CSS manual → heurísticas semânticas → maior bloco de texto → `PartialContentWarning`.

---

## 7. Fila de Tarefas (ARQ + Redis)

### 7.1 Tarefas registradas

| Tarefa | Trigger | Resultado |
|---|---|---|
| `scrape_chapter` | GET capítulo não cacheado | Texto limpo + pipeline + banco |
| `translate_chapter` | Após `scrape_chapter` quando `lang != original` | Texto traduzido; prefetch N+1 a N+K |
| `generate_tts` | POST `/tts/generate` ou batch | MP3 em storage; AudioCache atualizado |
| `download_batch` | POST `/downloads/jobs` | Itera DownloadChapters pendentes |
| `health_update` | Cron diário | Recalcula SourceHealthScore; marca fontes degradadas |
| `stats_task` | Fase comercial | ReadingStats + ReadingHistory |

### 7.2 Modelo DownloadJob

```python
class DownloadJob(SQLModel, table=True):
    id:              uuid.UUID
    user_id:         uuid.UUID
    novel_id:        uuid.UUID
    chapter_start:   int
    chapter_end:     int
    type:            str       # "text" | "audio" | "both"
    lang:            str
    status:          str       # "pending"|"running"|"paused"|"done"|"failed"
    completed_count: int = 0
    total_count:     int
    job_id_arq:      str | None
    created_at:      datetime
    updated_at:      datetime

class DownloadChapter(SQLModel, table=True):
    id:          uuid.UUID
    job_id:      uuid.UUID
    chapter_num: int
    status:      str       # ChapterStatus enum
    retry_count: int = 0
    error_msg:   str | None
```

### 7.3 Polling (5s no mobile)

```
POST /downloads/jobs → { job_id, total_count, status: "pending" }
GET  /downloads/jobs/{id} → { status, completed_count, total_count, failed_chapters[] }
```

> Em fase comercial: substituir por SSE.

---

## 8. Serviço de Tradução

### 8.1 Strategy Pattern

```python
class TranslationEngine(Protocol):
    async def translate(self, text: str, source_lang: str, target_lang: str) -> str: ...
```

| Engine | Ativa quando | Custo |
|---|---|---|
| `MarianEngine` | `TRANSLATION_ENGINE=marian` (padrão) | R$ 0 |
| `OpenAIEngine` | `TRANSLATION_ENGINE=openai` ou `tier=premium` | Pay-per-token |

### 8.2 MarianEngine

```python
class MarianEngine:
    _models: dict[str, tuple] = {}  # Pool de modelos — carregados uma vez

    async def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        tokenizer, model = self._load_model(source_lang, target_lang)
        paragraphs = text.split("\n")
        results = []
        for para in paragraphs:
            if not para.strip():
                results.append("")
                continue
            inputs = tokenizer(para, return_tensors="pt", padding=True, truncation=True)
            tokens = model.generate(**inputs)
            results.append(tokenizer.decode(tokens[0], skip_special_tokens=True))
        return "\n".join(results)
```

**Pares suportados:** EN→PT, ZH→EN, JP→EN, KR→EN, EN→ES, EN→FR, EN→DE.
Para ZH→PT: encadeia ZH→EN + EN→PT (dois modelos, custo zero).

---

## 9. Serviço de TTS (Kokoro-82M)

### 9.1 Cache obrigatório por idioma

```python
text = chapter.conteudo_traduzido if lang != "original" else chapter.conteudo_raw
text_hash = md5(f"{lang}:{text}".encode()).hexdigest()

cached = await audio_cache_repo.find_by_hash(text_hash)
if cached:
    return StreamingResponse(storage.open(cached.storage_url))

audio = await kokoro_engine.synthesize(text, voice=resolve_voice(lang), speed=speed)
url   = await storage.upload(audio, filename=f"{text_hash}.mp3")
await audio_cache_repo.save(chapter_id, text_hash, url, duration, lang)
return StreamingResponse(audio)
```

### 9.2 Vozes por idioma

| lang | Voz Kokoro |
|---|---|
| `pt-BR` | `pt_BR_*` |
| `original` / `en` | `en_US_*` |
| outros | fallback `en_US_*` |

### 9.3 Armazenamento

| Fase | Storage | Custo |
|---|---|---|
| Solo dev | Disco local | R$ 0 |
| Solo deploy | Backblaze B2 / R2 — tier gratuito | R$ 0 até 10 GB |
| Comercial | B2 / R2 — pago | Centavos/GB |

---

## 10. Pipeline de Processamento de Texto

```
HTML bruto
    ↓ html_cleaner.py
    ↓ global_filters.py     (Discord, Patreon, links, TL Notes)
    ↓ novel_filters.py      (filtros da obra)
    → conteudo_raw (salvo)
    ↓ MarianEngine / OpenAIEngine
    ↓ glossary_replacer.py  (priority DESC, word boundary)
    → conteudo_traduzido (salvo)
    ↓ TTS / Resposta
```

```python
def build_pipeline(novel_id: str, apply_glossary: bool = True) -> TextPipeline:
    stages = [HtmlCleanerStage(), GlobalFiltersStage(), NovelFiltersStage(novel_id)]
    if apply_glossary:
        stages.append(GlossaryReplacerStage(novel_id))
    return TextPipeline(stages)
```

**Filtros globais pré-configurados:** "Join our Discord", "Support us on Patreon/Ko-fi", links HTTP soltos, `[TL Note: ...]`, "Please vote/rate/review", "Read latest chapter at [url]".

---

## 11. Glossário de Nomes

```python
class GlossaryEntry(SQLModel, table=True):
    id:             uuid.UUID
    novel_id:       uuid.UUID
    term_src:       str
    term_dst:       str
    priority:       int = 0      # maior = aplicado primeiro
    enabled:        bool = True
    case_sensitive: bool = False
    created_at:     datetime
    updated_at:     datetime
```

> `\b` (word boundary) no regex: "Amon" não substitui "Amazon".
> Termos mais longos com priority maior previnem substituições parciais (ex: "Amon" priority=10 antes de "Mon" priority=0).

---

## 12. Templates de Extração

```python
EXTRACTOR_TEMPLATES = {
    "madara_theme":      ExtractorConfig(content_selector="div.reading-content", ...),
    "novelbin_clone":    ExtractorConfig(content_selector="div#chapter-container", ...),
    "royalroad_clone":   ExtractorConfig(content_selector="div.chapter-content", ...),
    "wordpress_generic": ExtractorConfig(content_selector="div.entry-content, article.post-content", ...),
}
```

**Detecção automática:** o orchestrator testa seletores conhecidos antes de usar heurísticas genéricas.

---

## 13. Banco de Dados

### 13.1 Modelo de entidades v4.0

| Entidade | Campos principais | Novidade v4.0 |
|---|---|---|
| `User` | id, email, hashed_password, tier, created_at | — |
| `Obra` | id, user_id, nome, slug, capa_url, sinopse, fonte_ativa_id, status, idioma_original, canonical_base_index, updated_at | `canonical_base_index` — base para mapeamento de fontes |
| `Fonte` | id, obra_id, provider, url_base, slug, ativo, status, total_capitulos, extractor_template, updated_at | — |
| **`FonteHealth`** | id, fonte_id, success_count, failure_count, avg_response_ms, last_success_at, last_failure_at, updated_at | **Novo v4.0** |
| `Capitulo` | id, fonte_id, numero, titulo, conteudo_raw, conteudo_traduzido, **content_hash**, **translated_hash**, **chapter_status**, baixado, updated_at | **`content_hash`, `translated_hash`, `chapter_status`** |
| `Progresso` | id, obra_id, user_id, capitulo_atual, posicao_leitura, posicao_audio, atualizado_em | — |
| `DownloadJob` | id, user_id, novel_id, chapter_start, chapter_end, type, lang, status, completed_count, total_count, updated_at | — |
| `DownloadChapter` | id, job_id, chapter_num, status (ChapterStatus), retry_count, error_msg | — |
| `Filtro` | id, user_id, obra_id (nullable), nome, tipo, padrao, escopo, ativo | — |
| `AudioCache` | id, capitulo_id, hash_md5, storage_url, lang, duracao_seg, gerado_em | — |
| `GlossaryEntry` | id, novel_id, term_src, term_dst, priority, enabled, case_sensitive, updated_at | — |
| `ReadingStats` | id, user_id, novel_id (nullable), ... | **Fase comercial** |
| `ReadingHistory` | id, user_id, novel_id, chapter_num, accessed_at, duration_ms | **Fase comercial** |

### 13.2 ChapterStatus (novo v4.0)

```python
class ChapterStatus(str, Enum):
    RAW_ONLY         = "raw_only"         # Scraped, não traduzido
    TRANSLATING      = "translating"      # Tradução em andamento (ARQ)
    TRANSLATED       = "translated"       # Traduzido, sem áudio
    AUDIO_GENERATING = "audio_generating" # TTS em andamento
    READY            = "ready"            # Texto + áudio prontos
    FAILED           = "failed"           # Falhou em algum estágio
```

> `ChapterStatus` substitui lógica implícita espalhada por múltiplas queries. Facilita debug: basta verificar o status do capítulo para saber exatamente em que estágio ele está.

### 13.3 content_hash e translated_hash (novo v4.0)

```python
# Ao salvar conteudo_raw:
capitulo.content_hash = md5(conteudo_raw.encode()).hexdigest()

# Ao salvar conteudo_traduzido:
capitulo.translated_hash = md5(conteudo_traduzido.encode()).hexdigest()

# Ao detectar atualização na fonte:
if novo_content_hash != capitulo.content_hash:
    capitulo.chapter_status = ChapterStatus.RAW_ONLY  # tradução obsoleta
    # Re-enfileira tradução automaticamente
```

> Quando a NovelFire edita um capítulo (correção de erro, capítulo dividido), o `content_hash` muda → `translated_hash` fica desatualizado → backend detecta e re-traduz automaticamente.

### 13.4 canonical_chapter_index (novo v4.0)

```python
# Obra
canonical_base_index: int = 0  # Ajustado manualmente quando necessário

# Capitulo (no futuro)
canonical_index: int | None = None  # NovelFire 500 e RoyalRoad 498 → ambos = 500
```

> Guardar desde o início evita migração dolorosa quando o `ChapterMapping` for implementado na fase comercial.

### 13.5 Migração SQLite → PostgreSQL

```python
DATABASE_URL = "sqlite:///./database.db"           # Solo
DATABASE_URL = "postgresql+asyncpg://user:pass@host/db"  # Comercial
```

---

## 14. Configuração (`core/config.py`)

| Variável | Padrão | Fase | Descrição |
|---|---|---|---|
| `DATABASE_URL` | `sqlite:///./database.db` | Solo | String de conexão |
| `REDIS_URL` | `redis://localhost:6379` | Solo | Broker ARQ |
| `SECRET_KEY` | (obrigatório) | Solo | Assinatura JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | Solo | Expiração access token |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `30` | Solo | Expiração refresh token |
| `TRANSLATION_ENGINE` | `marian` | Solo | `"marian"` ou `"openai"` |
| `MARIAN_MODELS_PATH` | `./models/marian` | Solo | Path modelos MarianMT |
| `OPENAI_API_KEY` | (opcional) | Premium | Só se engine=openai |
| `KOKORO_MODEL_PATH` | `./models/kokoro-82M` | Solo | Path Kokoro |
| `STORAGE_BACKEND` | `local` | Solo | `"local"`, `"b2"`, `"r2"` |
| `STORAGE_BUCKET` | (opcional) | Deploy | Bucket B2/R2 |
| `STORAGE_KEY_ID` | (opcional) | Deploy | Credencial |
| `STORAGE_APP_KEY` | (opcional) | Deploy | Credencial |
| `SENTRY_DSN` | (opcional) | **Comercial** | Sentry |
| `SOLO_MODE` | `false` | Solo | `"true"` para uso próprio |
| `CORS_ORIGINS` | `["*"]` | Solo | Restrinja em produção |
| `LOG_LEVEL` | `INFO` | Solo | Nível de log |
| `CLOUDFLARE_SESSIONS_PATH` | `./sessions` | Solo | storage_state.json |
| `PREFETCH_CHAPTERS_AHEAD` | `5` | Solo | Prefetch de tradução |

---

## 15. Observabilidade

> **Fase solo:** apenas `LOG_LEVEL=DEBUG` e logs estruturados básicos do FastAPI.
> **Fase comercial:** Sentry + Logfire completos.

### 15.1 Fase solo (mínimo viável)
- Logs de request/response via middleware FastAPI
- Log de fallback de fonte (origem → destino)
- Log de cache hit/miss no TTS

### 15.2 Fase comercial
- Sentry: fingerprinting por provider + tipo de erro; alertas para `SourceUnavailableError`, `TranslationFailedError`, `CloudflareBlockedError`
- Logfire: instrumentação SQLAlchemy (slow queries), HTTPX (scraping), traces ARQ

### 15.3 Health checks (todas as fases)
- `GET /health` — API viva
- `GET /health/db` — conectividade banco
- `GET /health/redis` — conectividade Redis

---

## 16. Estratégia de Testes

| Nível | Ferramenta | O que testar | Fase |
|---|---|---|---|
| Unitário | pytest | Repositórios, pipeline de texto, glossário com priority, ScraperAdapters contra fixtures HTML, templates, MarianEngine, ChapterStatus transitions, SourceHealthScore calculation | Solo |
| Integração | pytest + httpx.AsyncClient | Endpoints com banco em memória + mocks | Solo |
| Worker | pytest + fakeredis | scrape_task, translate_task, download_batch, health_update | Solo |

**Meta de cobertura:** 80% em `src/services/` e `src/api/`.

> Fixtures HTML reais em `tests/unit/scrapers/fixtures/` por provider e template — testes de scraping nunca batem na internet.

---

## 17. Deploy e Infraestrutura

### 17.1 Desenvolvimento local

```yaml
services:
  api:
    build: .
    ports: ["8000:8000"]
    volumes: ["./sessions:/app/sessions", "./models:/app/models", "./media:/app/media"]
    depends_on: [redis]
    env_file: .env

  worker:
    build: .
    command: "arq src.services.tasks.worker.WorkerSettings"
    volumes: ["./sessions:/app/sessions", "./models:/app/models"]
    depends_on: [redis]
    env_file: .env

  redis:
    image: "redis:7-alpine"
```

### 17.2 Deploy fase solo

| Serviço | Plataforma | Custo |
|---|---|---|
| API + Worker | Railway ou Fly.io | R$ 0 |
| Redis | Upstash | R$ 0 até 10k req/dia |
| Áudio | Backblaze B2 — 10 GB | R$ 0 |
| Banco | SQLite no container | R$ 0 |
| Modelos MarianMT | Hugging Face (primeiro boot) | R$ 0 |

### 17.3 CI/CD

| Etapa | Trigger | Fase |
|---|---|---|
| lint + mypy + pytest | Push qualquer branch | Solo |
| Build Docker + deploy Railway | Merge em `main` | Solo |
| Sentry release tracking | Merge em `main` | Comercial |

---

## 18. Convenções de Código

- Nenhum valor hardcoded — sempre `config.py`
- Nenhuma query SQL direta — sempre `repositories/`
- Nenhuma chamada HTTP fora dos adaptadores de scraper e engines
- Nenhum scraping síncrono em endpoint — sempre ARQ
- Todo endpoint protegido tem `Depends(get_current_user)`
- Erros de negócio como exceções tipadas em `exceptions.py`
- Modelos com `updated_at` em todas as tabelas
- `ChapterStatus` sempre atualizado atomicamente com o conteúdo
- `content_hash` recalculado sempre que `conteudo_raw` for atualizado
- `SourceHealthScore` atualizado a cada resultado de scraping (success/failure)
- `target_language` como string — nunca enum fechado
