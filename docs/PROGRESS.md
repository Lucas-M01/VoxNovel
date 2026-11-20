# Progresso

- Atualizado: 2026-11-20.
- Fase atual: Fase 3 — bloco F5 (C32–C39) concluído. Parar no portão para aprovação de F6; não iniciar C40 sem aprovação explícita.
- Último commit: C39, commit que contém este registro; predecessor 0332263 (C38). Fechamento marcado por `fase-3-f5`. Base F4: 44313b1, tag `fase-3-f4`. Histórico aprovado preservado, sem push.
- Próximo item: C40, busca por nome/URL, somente após aprovação de F6. F6 tem seis commits C40–C45, seguidos pelo portão da Fase 4 — validação final C46.
- Autorização: análise/plano em ADR-003, F3 em ADR-006, F4 em ADR-007 e fechamento F4/avanço F5 em ADR-008. Docker local descartável somente para testes aprovado em ADR-005. Sem aprovação para F6, push, deploy ou importação pessoal. Licença pública ainda não escolhida.

## Entregas F5

| Item | Commit | Entrega |
|---|---|---|
| C32 | 05a4714 | Texto formatado, preferências e leitura local-first; falha no progresso não esconde conteúdo. |
| C33 | aacd7e8 | Navegação de capítulos, limites/offline, ocultação de controles e autoscroll independente da voz. |
| C34 | 2a14a39 | Prefetch sequencial N+1..N+3 em memória, sem progresso/download ou avanço automático. |
| C35 | 4a7db96 | Player nativo composto com vozes, velocidades, navegação, fim e status local. |
| C36 | 832bf15 | Capítulo inicial explícito prevalece sobre progresso da fonte e da obra; melhoria separada. |
| C37 | d643857 | Filtros globais por tipo e limpar com confirmação. |
| C38 | 0332263 | Downloads individuais por fonte, abertura do capítulo escolhido e remoção confirmada; limpeza remota não bloqueante. |
| C39 | HEAD deste registro | Intervalo até 50 em grupos de cinco, pular existentes, progresso por tentativas e falhas individuais; somente fila em memória. |

## Verificação de fechamento

- Gate C39 aprovado: Ruff/format/mypy/arquitetura/compileall, 170 testes backend (dez integrações reais na stack descartável), ESLint/20 casos das regras/TypeScript strict e 203 testes mobile. Bundles Hermes Android/iOS do produto e do harness privado aprovados. Gitleaks de candidatos/histórico aprovado; conteúdo staged conferido antes do commit. Sem nova certificação física ou de fontes/tradução externas.
- Regras React revisadas: dados por queries/mutations e eventos, sem efeitos para fetch/estado derivado; imports diretos e mensagens/controles acessíveis. Nenhuma dependência adicionada em F5.
- F5 tem cobertura automatizada de leitura/voz/filtros/downloads e isolamento por fonte. Isso não certifica toda a jornada do produto ou paridade física final. A tela principal ainda mostra a fundação; busca/biblioteca/detalhes/navegação serão compostos em F6.

## Teste disponível ao dono

Na raiz, executar `yarn workspace @voxnovel/mobile reader:harness` e abrir o QR no Android/Expo Go compatível com SDK 58, na mesma rede. Tocar em **Preparar e abrir leitor**. Testar texto/preferências/navegação/rolagem e abrir o player no capítulo escolhido; filtros e downloads sintéticos estão nos botões do harness. Em downloads, remover os dois capítulos com confirmação e baixar intervalo 1–2, depois abrir capítulo 2 em texto/voz. Roteiro completo em MOBILE.md.

- Projeto privado em .private/voxnovel-reader-harness, distinto do harness de fala. Texto/transporte/progresso/filtros sintéticos; motor de fala e arquivos do aparelho reais. Sem API, tradução externa ou dados pessoais. Não representa a navegação final do app.
- Harness original de fala: `yarn workspace @voxnovel/mobile speech:harness`; matriz e detalhes em S1.md. Nenhum servidor Expo foi deixado aberto pelo agente.

## Limites e decisões pendentes

- S1: dono testou POCO X5 com voz pt-br-x-ptd-local (Enhanced), relatando sucesso em capítulo 2, pausa/retomada, voz/velocidade, troca de app e bloqueio. Android/motor/Expo versus build/duração não informados; interrupções, voz sem rede/sem PT, saída e iOS não certificados. ADR-008 dispensa esses cenários como impedimento ao avanço F4→F5, sem marcá-los como aprovados. Não repetir a mesma solicitação de dispensa.
- Tradução: no diagnóstico autorizado, o adaptador protegido recebeu HTTP 403 com desafio e o GoogleTranslator recebeu HTTP 429 para frase sintética curta. Nenhum capítulo completo foi traduzido com sucesso nesse teste; P13/P15 reais continuam pendentes. Não afirmar que o problema do original foi resolvido, nem atribuir causa definitiva. URL/relatórios somente privados em .private/translation-repro e arquivo associado, ignorados pelo git; sem conteúdo pessoal nas fixtures. Não fazer bypass ou repetir chamadas ao Google sem motivo novo.
- Providers externos têm testes determinísticos, sem certificação dos layouts/desafios atuais. Avaliar esses limites antes da validação final.
- S2: prebuild Android concluído em F1; assembleDebug executou 63 tarefas antes de falhar no acesso a Maven por resolução de rede (ADR-004). Sem APK novo validado; iOS nativo requer ambiente Apple. Hermes/testes simulados não substituem compilação nativa e execução física.
- Importação pessoal não executada. Arquivos antigos sem fonte comprovada ficam preservados, sem atribuição automática; C45 oferecerá dry-run com dados sintéticos antes de qualquer operação pessoal autorizada.
- Licença pública ainda aberta. Próxima decisão obrigatória: aprovação de F6 após revisar o fechamento F5.

## Continuidade e ambiente

- Ler AGENTS.md e este registro antes de qualquer ação em sessão nova. Consultar PLANO_COMMITS.md, ANALISE.md (P01–P35), DECISIONS.md, WBS_STATUS.md, MOBILE.md, S1.md, API.md e PERSISTENCIA.md.
- F4 entregou cliente API EN por env/Zod, TanStack Query sem retry, arquivos persistentes por obra/fonte, cache local/em memória, fala serializada e NetInfo. Sem auth, áudio remoto, MMKV, WatermelonDB, EventBus ou funcionalidades fora da paridade.
- Arquivos de capítulos novos: downloads/{novelId}/sources/{sourceId}/cap_{n}.json com envelope `{ cap, texto }`; biblioteca `{ obras, salvoEm }`. Arquivos antigos preservados; nenhuma alteração em _legacy, que permanece somente leitura e ignorado.
- Stack Supabase local descartável de testes em .private/voxnovel-f3-supabase; somente banco/Storage locais, nenhum projeto remoto alterado e nenhuma chave exposta no mobile. RLS/ACL/advisors auditados em F3 sem achados. Backend executável conforme API.md; nenhum dado pessoal importado.
- Checklist P01–P35 ainda não certificado na Fase 4. Ao receber aprovação de F6, executar C40–C45, suíte completa, documentos/tag/log e parar para aprovação da validação final.
