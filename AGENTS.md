# AGENTS.md

Regras permanentes para qualquer agente (Codex ou outro) neste repositório.
Leia este arquivo e `docs/PROGRESS.md` ANTES de qualquer ação, em toda sessão nova.

---

## 1. O que é este projeto

Reconstrução do protótipo **Leitor Web em Voz Alta** (backend FastAPI + app React Native/Expo)
com histórico git limpo, melhor organização e qualidade. O protótipo original está em `_legacy/`
(somente leitura, fora do git).

## 2. REGRA DE OURO: ESCOPO = O QUE O PROTÓTIPO JÁ FAZ

**Este projeto só implementa o que o protótipo original já implementa. Nada além disso.**

- O contrato de escopo é o **checklist de paridade funcional** em `docs/ANALISE.md`.
  Se uma funcionalidade não está nesse checklist, ela NÃO será implementada.
- É permitido melhorar **como** as coisas são feitas, sem mudar **o que** o usuário vê e faz:
  organização de código, testes, tratamento de erros, segurança, configuração, tipagem, lint,
  CI, documentação, desempenho interno.
- É PROIBIDO adicionar funcionalidade nova, mesmo que esteja descrita nos documentos de spec,
  na WBS ou no "Fazer futuramente" do README original. Exemplos do que é proibido a menos que
  o protótipo já tenha: login/contas, estatísticas e histórico, downloads em lote ou offline,
  glossário, múltiplas fontes e score de saúde, TTS premium/remoto, sincronização em nuvem,
  observabilidade comercial, deploy.
- Ideia boa fora do escopo? Anote em `docs/BACKLOG.md` (uma linha, com motivo) e siga em frente.
  Nunca implemente "porque já que estou aqui".
- Mudança de comportamento visível só com aprovação explícita minha, registrada em
  `docs/DECISIONS.md` (ex.: trocar o motor de voz do Piper por outro).

## 3. Fontes e precedência

Em conflito, vale a ordem:

1. Respostas explícitas do dono do projeto (eu)
2. Este AGENTS.md
3. `docs/spec/WBS_TTS_FRONTEND.md` (v2.2)
4. `docs/spec/WBS_SUPABASE.md` (v2.1)
5. `docs/spec/ARCHITECTURE_BACKEND.md` e `ARCHITECTURE_FRONTEND.md` (v4.0)
6. `docs/spec/WBS.md` (v2.0)
7. `_legacy/` (comportamento observado)

Como usar os documentos de spec: são referência de **estrutura, convenções e nomes**, não lista
de tarefas. Use-os para decidir ONDE e COMO implementar algo que está no escopo (seção 2).
Um pacote da WBS só é implementado se cobrir uma funcionalidade do checklist de paridade.
Os demais são registrados em `docs/WBS_STATUS.md` como "fora de escopo".

Infraestrutura que o protótipo não usa (Redis/ARQ, Supabase, WatermelonDB, MMKV, Docker,
react-native-track-player etc.) NÃO entra por padrão. Só entra se for indispensável para a
paridade ou se eu aprovar, com o motivo registrado em `docs/DECISIONS.md`.

Exemplos de código dentro dos docs são ilustrativos. Se contradisserem as regras de convenção
do mesmo documento, siga as regras, não o exemplo.

## 4. Regras de segurança do repositório

- NUNCA modifique, apague ou mova nada em `_legacy/`. Ele está fora do git por
  `.git/info/exclude`. Nunca use `git add -f`.
- Nenhum segredo, chave, token, IP pessoal ou caminho absoluto de máquina no git.
  Use `.env` (ignorado) e mantenha `.env.example` documentado.
- Nada hardcoded: caminhos (ex.: do Piper), URLs, IPs e portas vêm de configuração.
- Nunca use `--no-verify`, `git push --force`, nem reescreva histórico já aprovado.
- Não copie o código do protótipo em bloco. Use-o como referência e reescreva já na estrutura
  nova, com testes.
- O scraper busca URLs informadas pelo usuário: proteja contra SSRF (bloquear loopback, IPs
  privados, link-local e endpoints de metadata; limitar redirects, timeout e tamanho da resposta).
- Dados pessoais do protótipo (progresso, filtros, configurações) nunca entram no repositório.

## 5. Commits

- **Atômico:** uma única mudança lógica por commit.
- **Funcional:** build, lint, tipos e testes passam em TODO commit.
- **Conventional Commits em inglês:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`,
  `ci`, `build`, `perf`. Formato `tipo(escopo): resumo no imperativo`, escopo = `backend`,
  `mobile`, `docs` ou `infra`. Corpo explicativo quando a mudança não for óbvia.
- **Rodapé de rastreio:** `Parity: <item do checklist>` para reconstrução de funcionalidade, ou
  `Improvement: security|quality|performance|dx` para melhoria.
- Reconstrução e melhoria ficam em commits SEPARADOS.
- Testes entram no mesmo commit do módulo (ou logo em seguida).
- Uma tag ao fim de cada fase aprovada: `fase-1`, `fase-2`, ...
- Datas dos commits são as reais. Não manipule `GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE`.

## 6. Qualidade (Definition of Done de cada commit)

Antes de commitar, rode e passe tudo:

- Backend: `ruff`, `mypy`, `pytest`
- Mobile: `eslint` (com `eslint-plugin-boundaries`), `tsc`, `jest`
- Varredura de segredos (`gitleaks` ou equivalente)

Convenções dos documentos de arquitetura, aplicadas por ferramenta e não por disciplina:

- **Backend:** configuração só via `core/config.py`; SQL só em `repositories/`; HTTP externo
  só em adaptadores/engines; erros de negócio como exceções tipadas; modelos com `updated_at`.
- **Mobile:** TypeScript strict; dependências entre camadas em sentido único
  (`screens → features → pattern/layouts → ui → core`); path aliases entre camadas (nunca imports
  relativos); sem barrel exports; `type` em vez de `interface`; sem casts `as`; schemas em Zod;
  sem `useEffect` para fetch, mutation ou estado derivado; telas finas (guard + composição).

Só adote estrutura/convenção que o escopo realmente exija. Não crie pastas, camadas ou
abstrações vazias "para o futuro".

## 7. Fluxo de trabalho por fases (com portões de aprovação)

1. **Fase 1 — Análise** → `docs/ANALISE.md` (inventário, checklist de paridade, conflitos entre
   docs, problemas do protótipo, plano de migração de dados). PARE e aguarde aprovação.
2. **Fase 2 — Plano** → `docs/PLANO_COMMITS.md`, com cada commit ligado a um item do checklist.
   PARE e aguarde aprovação.
3. **Fase 3 — Execução** por blocos. Ao fim de cada bloco: suíte completa, atualizar
   `docs/PROGRESS.md`, criar a tag, mostrar `git log --oneline` do bloco e PARAR.
4. **Fase 4 — Validação** → percorrer o checklist com evidência, comparar protótipo × novo,
   gerar `docs/MELHORIAS.md`, atualizar o README, mostrar o `git log --oneline` final.

Nunca avance de fase sem minha aprovação.

## 8. Continuidade entre sessões

O contexto é limitado. Ao encerrar qualquer sessão, atualize `docs/PROGRESS.md` com: último
commit, próximo item do plano, decisões abertas e perguntas pendentes. Ao iniciar uma sessão
nova, leia este arquivo e `docs/PROGRESS.md` antes de qualquer outra coisa.

Documentos vivos mantidos pelo agente:

| Arquivo | Conteúdo |
|---|---|
| `docs/ANALISE.md` | Inventário do protótipo + checklist de paridade (contrato de escopo) |
| `docs/PLANO_COMMITS.md` | Lista ordenada de commits aprovada |
| `docs/PROGRESS.md` | Estado atual e próximos passos |
| `docs/DECISIONS.md` | Decisões e desvios, com motivo (formato ADR curto) |
| `docs/WBS_STATUS.md` | Cada pacote da WBS: feito / fora de escopo / eliminado |
| `docs/BACKLOG.md` | Ideias fora do escopo, uma linha cada |
| `docs/MELHORIAS.md` | O que mudou em relação ao protótipo e por quê (Fase 4) |

## 9. Quando perguntar

Pergunte em vez de assumir quando:

- o comportamento do protótipo for ambíguo;
- dois documentos de spec se contradisserem e a precedência da seção 3 não resolver;
- uma funcionalidade estiver na spec mas não no protótipo (a resposta padrão é NÃO fazer);
- uma mudança alterar comportamento visível ao usuário;
- um spike ou teste invalidar uma decisão anterior.

Faça perguntas em lote (máximo 5), sempre com uma proposta padrão. Seja objetivo e não repita
código já commitado.
