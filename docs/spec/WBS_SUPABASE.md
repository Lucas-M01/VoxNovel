# WBS — Novel Reader App

> **Referência de planejamento:** este documento inclui propostas que não foram implementadas. Consulte [o guia desta pasta](README.md), [o escopo aprovado](../ANALISE.md) e [o estado da WBS](../WBS_STATUS.md) antes de usá-lo como descrição do app.

## Adendo v2.1 — Migração para Supabase (Auth + Banco + Storage)

> Este documento complementa o `WBS.md` original (v2.0). Não substitui a estrutura de fases —
> apenas marca o que muda dentro de cada pacote afetado pela decisão de usar Supabase.
> Decisão tomada na **fase de planejamento (F1)**, antes de qualquer código escrito — custo de
> adoção mínimo.

---

## Resumo da decisão

| Camada | Antes (v2.0) | Depois (v2.1) |
|---|---|---|
| Banco de dados | PostgreSQL próprio (Railway/Fly.io) | **Postgres gerenciado pelo Supabase** |
| Autenticação | JWT próprio (`python-jose` + `auth.py`) | **Supabase Auth** |
| Storage de áudio (TTS) | Backblaze B2 / Cloudflare R2 | **Supabase Storage** |
| Fila de tarefas | ARQ + Redis | **Sem mudança** — continua ARQ + Redis |
| Scraping | Playwright + stealth + HTTPX | **Sem mudança** |
| Tradução (MarianMT/OpenAI) | Workers Python locais | **Sem mudança** |
| TTS (Kokoro-82M) | Worker Python local | **Sem mudança** |
| ORM | SQLModel | **Sem mudança** — SQLModel aponta para o Postgres do Supabase |

**Princípio orientador:** a cirurgia é isolada em auth + banco + storage. ARQ, Redis, Playwright,
MarianMT e Kokoro continuam exatamente como na arquitetura v4.0, porque exigem um worker Python
persistente que o Supabase não substitui (Edge Functions não suportam Playwright nem modelos
locais de tradução/TTS).

---

## Pré-requisito — novo passo antes do F1

Antes de iniciar o código, criar o projeto no Supabase:

- [ ] Criar projeto em [supabase.com](https://supabase.com) (free tier cobre Solo + Beta)
- [ ] Anotar credenciais em local seguro (gerenciador de senhas, nunca no git):
  - `Project URL`
  - `anon key` (pública, vai no mobile)
  - `service_role key` (secreta, **só no backend**, nunca no mobile)
  - `JWT Secret` (Settings → API, usado para validar tokens no backend)
- [ ] Decidir provedores de login: e-mail/senha simples é suficiente para o Solo/Beta? Login
  social (Google) fica para depois? Isso afeta o `auth-provider.tsx` no mobile.

---

## F1 — Fundação (mudanças)

| Item original (v2.0) | Mudança v2.1 |
|---|---|
| 1.2.2 Instalar dependências core: FastAPI, SQLModel, HTTPX, ARQ, **python-jose**, Pydantic Settings | Substituir `python-jose` por **`supabase-py`** (cliente oficial). Manter `python-jose` apenas se preferir decodificar o JWT do Supabase localmente sem round-trip à API. |
| 1.2.5 Criar `src/core/config.py` com variáveis de ambiente | Adicionar: `SUPABASE_URL`, `SUPABASE_KEY` (anon), `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET` |
| 1.2.6 Criar `.env.example` documentado | Incluir as quatro variáveis do Supabase com comentário indicando qual é pública (`anon key`) e qual é secreta (`service_role key`) |
| 1.4.5 Instalar TanStack Query, Zustand, Zod, react-hook-form, axios | Adicionar **`@supabase/supabase-js`** |
| 1.1.3 Configurar `.gitignore` global | Confirmar que `.env` está no `.gitignore` — agora carrega segredo de maior impacto (`service_role key` tem acesso total ao banco, ignorando RLS) |

**Itens sem mudança:** 1.1.1, 1.1.2, 1.2.1, 1.2.3, 1.2.4, 1.2.7, 1.3.1–1.3.3, 1.4.1–1.4.4, 1.4.6–1.4.11

---

## F2 — Banco de Dados (mudanças)

| Item original (v2.0) | Mudança v2.1 |
|---|---|
| 2.1.1 Criar `connection.py` (SQLite/PostgreSQL compatível) | Apontar para a connection string do Postgres do Supabase. **Manter SQLite apenas para testes unitários** (`tests/conftest.py`), evitando dependência de rede para rodar a suíte de testes. |
| 2.1.2 Modelo `User` | **Remover.** Não se cria mais uma tabela de auth própria — o Supabase já mantém `auth.users`. Criar em seu lugar uma tabela de domínio (ex: `profiles`) com `id uuid references auth.users(id)` e campos extras (ex: `tier`). |
| 2.2.1 Inicializar Alembic | Sem mudança na ferramenta — migrations agora rodam contra o Postgres do Supabase desde o início, não contra SQLite. |
| 2.2.2 Criar migration inicial com todas as tabelas Solo | A migration **não inclui** a tabela `User` — referencia `auth.users` do Supabase em FKs. |
| 2.2.3 Validar apply + rollback em SQLite | Validar apply + rollback contra o Postgres do Supabase (ambiente de dev/staging), mantendo SQLite só como suíte de teste isolada. |
| 2.5.1 SOLO_MODE bootstrap (criar usuário padrão automaticamente) | Em vez de criar um registro na tabela `User` local, o bootstrap cria/recupera um usuário no Supabase Auth (ou usa um UUID fixo de "usuário solo" sem necessidade de login real). |

**Itens sem mudança:** 2.1.3–2.1.11 (demais modelos), 2.3.1–2.3.7 (repositories), 2.4.1–2.4.5 (WatermelonDB no mobile, que é local-first e não depende de onde o Postgres mora)

**Novo item sugerido:**
- 2.1.12 (novo) — Avaliar e configurar **Row Level Security (RLS)** nas tabelas que ficarão expostas a múltiplos usuários na fase Beta/Launch (ex: `profiles`, `obra`, `progresso`). Na fase Solo com `SOLO_MODE=true`, RLS pode ficar desabilitado; é pré-requisito antes de abrir para Beta com múltiplos usuários reais.

---

## F3 — Core Backend (mudanças)

| Item original (v2.0) | Mudança v2.1 |
|---|---|
| 3.1.1 `core/security.py` (SOLO_MODE bypass em `get_current_user`) | A lógica de bypass do `SOLO_MODE` **permanece idêntica**. O branch "não-solo" passa a decodificar o JWT emitido pelo Supabase usando `SUPABASE_JWT_SECRET`, em vez de validar um token assinado pelo próprio backend. |
| 3.1.2 `src/api/v1/auth.py` (POST /login, POST /refresh) | **Remover este arquivo.** Login e refresh deixam de existir como endpoints do backend — o mobile chama diretamente o SDK do Supabase (`supabase.auth.signInWithPassword`, etc.). |
| 3.1.3 `src/api/deps.py` (get_current_user, get_session, get_engines) | `get_current_user()` muda a implementação interna (decodifica token Supabase), mas **mantém a mesma assinatura** — nenhum outro endpoint que depende dela precisa mudar. |

**Itens sem mudança:** 3.2.1–3.2.5 (pipeline de texto), 3.3.1–3.3.11 (scraping), 3.4.1–3.4.5 (tradução),
3.5.1–3.5.4 (TTS — exceto storage, ver abaixo), 3.6.1–3.6.6 (tasks ARQ), 3.7.1–3.7.9 (endpoints, exceto auth)

**Mudança pontual em TTS (não listada na tabela acima por estar em seção própria):**

| Item original (v2.0) | Mudança v2.1 |
|---|---|
| 3.5.3 `tts/factory.py` + módulo storage (local/b2/r2) | Adicionar opção de storage `supabase` no factory, usando o bucket do Supabase Storage como alternativa a B2/R2. |

---

## F4 — Core Mobile (mudanças)

| Item original (v2.0) | Mudança v2.1 |
|---|---|
| 4.2.1 `session-store.ts` (MMKV encrypted) | Em vez de guardar tokens JWT próprios manualmente, guarda a sessão do Supabase. O SDK (`@supabase/supabase-js`) já gerencia refresh automático — reduz a lógica customizada que antes vivia aqui. |
| 4.6.2 `auth-provider.tsx` + bootstrap em `screens/_layout.tsx` | Troca a lógica de login/refresh manual pelo client `supabase.auth`. O bootstrap escuta `supabase.auth.onAuthStateChange` em vez de validar token próprio manualmente. |
| 4.1.1 `http-resource.ts` (refresh token) | A lógica de "renovar automaticamente quando token < 2min para expirar" pode ser **simplificada ou removida** — o SDK do Supabase já lida com isso nativamente. |

**Itens sem mudança:** 4.1.2–4.1.4, 4.2.2–4.2.4, 4.3.1–4.3.2, 4.4.1–4.4.2, 4.5.1–4.5.2, 4.6.1, 4.6.3–4.6.4, 4.7.1–4.7.2

---

## F5 e F6 — Sem mudanças

Nenhum item de Features de Leitura (F5) ou Busca e Fontes (F6) depende diretamente de auth, banco
ou storage de forma que exija alteração. Esses pacotes seguem exatamente como no `WBS.md` original.

---

## WBS-M (Beta) — mudanças

| Item original | Mudança v2.1 |
|---|---|
| Recuperação de Falhas (RF.1–RF.5) | Sem mudança de lógica. Apenas garantir que RLS (ver item novo 2.1.12) esteja ativo antes de abrir o Beta para usuários externos — é o que impede um usuário de acessar dados de outro via API do Supabase. |

**Novo item sugerido para WBS-M:**
- RF.6 (novo) — Testar RLS com pelo menos dois usuários reais simulando acesso cruzado (usuário A não deve conseguir ler/escrever dados do usuário B através do client Supabase nem da API própria).

---

## WBS-L (Launch) — sem mudanças relevantes

Observabilidade (Sentry/Logfire), CI/CD e deploy continuam como descritos no `WBS.md` original.
O Supabase não substitui nem simplifica essa fase — é ortogonal a ela.

---

## Checklist de migração (ordem recomendada)

- [ ] 1. Criar projeto no Supabase e guardar credenciais
- [ ] 2. Ajustar `config.py` e `.env.example` (F1)
- [ ] 3. Decidir estratégia de login (e-mail/senha vs. social) antes de implementar `auth-provider.tsx`
- [ ] 4. Criar tabela `profiles` referenciando `auth.users` (F2)
- [ ] 5. Implementar `get_current_user()` com validação de JWT do Supabase, mantendo bypass de `SOLO_MODE` (F3)
- [ ] 6. Remover `auth.py` do backend (F3)
- [ ] 7. Implementar `auth-provider.tsx` com `supabase.auth` no mobile (F4)
- [ ] 8. Configurar bucket no Supabase Storage para áudio TTS (F3 — `tts/factory.py`)
- [ ] 9. Antes do Beta: habilitar e testar RLS nas tabelas multi-usuário (F2 + WBS-M)

---

## Riscos e pontos de atenção

- **`service_role key` nunca deve ir para o mobile.** Ela ignora RLS e tem acesso total ao banco.
  Fica exclusivamente em variável de ambiente do backend.
- **RLS desabilitado por padrão** em tabelas novas do Supabase — é preciso habilitar explicitamente
  por tabela antes do Beta, ou qualquer usuário autenticado pode ler/escrever dados de outros.
- **ARQ/Redis continuam sendo infraestrutura própria** — o Supabase não resolve fila de tarefas
  pesadas (scraping com Playwright, tradução, TTS). Continue provisionando Redis (Upstash) e o
  worker Python (Railway/Fly.io) como já estava previsto na arquitetura v4.0.
- **Timing da decisão:** esta migração foi decidida na fase de planejamento (F1), antes de qualquer
  código de auth/banco escrito — é o ponto de menor custo possível. Caso a decisão tivesse vindo
  depois de F4 implementado em torno de JWT próprio, o custo de retrabalho seria significativamente
  maior.
