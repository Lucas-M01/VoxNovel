# Progresso

- Atualizado: 2026-11-20.
- Fase atual: Fase 3 — F6 (C40–C45) concluído. Parar no portão para aprovação da Fase 4; não iniciar C46 sem aprovação explícita.
- Último commit: C45, commit que contém este registro; predecessor eb8ecf8 (C44). Fechamento marcado por `fase-3-f6` e `fase-3`. F5 preservado em c0b81aa (`fase-3-f5`), F4 em 44313b1 (`fase-3-f4`). Sem push ou reescrita de histórico.
- Próximo item: Fase 4 — validação final P01–P35, correções próprias se necessárias e C46 (MELHORIAS/README/documentação final). Depende da aprovação do dono.
- Autorização: plano ADR-003; F3 ADR-006; F4 ADR-007; fechamento F4/avanço F5 ADR-008; F6 e visual simples/coerente ADR-009. Docker local descartável apenas para testes ADR-005. Sem aprovação para publicar, deploy ou importação pessoal. Licença pública ainda aberta.

## Entregas F6

| Item | Commit | Entrega |
|---|---|---|
| C40 | ac55251 | Busca por nome/URL, metadados, seleção de fontes, capítulo inicial, duplicatas e erro parcial. |
| C41 | e97d91f | Preservar chapter_ids RoyalRoad e resolver ID da URL para índice; correção separada. |
| C42 | 0246a4d | Biblioteca com capas/progresso, ordenação, refresh, cache offline identificado e exclusão confirmada online. |
| C43 | 587f4eb | Detalhes, edição de capítulo, adicionar/trocar/remover fontes e progresso próprio de cada fonte. |
| C44 | eb8ecf8 | Splash e sete destinos reais; jornada completa e guardas de IDs/capítulos, com apresentação simples compartilhada. |
| C45 | HEAD deste registro | Importador privado opcional, dry-run padrão, formatos conhecidos, conflitos, backups, idempotência e recuperação; nenhuma importação pessoal. |

- F5 entregou leitor, preferências, navegação/autoscroll, prefetch em memória, player nativo, prioridade do capítulo escolhido, filtros e downloads individuais/intervalo. Serviços F4 e namespace de cache por obra/fonte permanecem preservados.
- O dono reforçou o objetivo de uso e portfólio com o necessário, deixando melhorias extras para depois. Não ampliar funcionalidades além da paridade.

## Verificação de fechamento

- Gate final F6 aprovado: Ruff/format/mypy/arquitetura/compileall; 187 testes backend (175 unitários + 12 integrações reais locais), ESLint/20 casos das regras/TypeScript strict e 220 testes mobile. Bundles Hermes Android/iOS do aplicativo principal integrado e Gitleaks de candidatos/histórico aprovados. Conteúdo staged conferido antes do commit.
- Jornada automatizada monta rotas reais: biblioteca→detalhe→leitura→voz→downloads→capítulo escolhido; duplicata→player; filtros e links inválidos. Transporte, fala e arquivos são sintéticos nos testes; não certificar backend/fontes reais no Android por essa evidência.
- Importador: testes de validação, privacidade, backup/compensação com I/O injetado; SQL real em schema local isolado confirma idempotência, conflitos/rollback, filtros vazios, velocidade e progresso por fonte. Bucket privado local comprova criação sem sobrescrita. Schema/bucket sintéticos removidos. Launcher exercitado com dry-run privado e caminhos relativos. Nenhuma aplicação pessoal ou em projeto remoto.
- Nenhuma dependência foi adicionada em F6. Regras React revisadas: queries/mutations e eventos, lifecycle para recursos, imports diretos, rotas guardadas e controles acessíveis. Ajustes em fixtures/tipagem foram verificados, sem remover cenários ou desativar regras.

## Teste disponível ao dono

O aplicativo principal está integrado. Iniciar API conforme API.md; para Android na mesma rede, definir VOXNOVEL_HOST=0.0.0.0 antes do comando do backend. Copiar/configurar apps/mobile/.env a partir do exemplo com EXPO_PUBLIC_API_URL apontando ao endereço LAN da API, sem /api/v1. Nenhuma chave Supabase entra no mobile.

Na raiz: `yarn workspace @voxnovel/mobile start`; abrir QR no Expo Go compatível com SDK 58, na mesma rede. Testar adicionar obra, biblioteca/detalhes, leitura/voz, capítulo selecionado em downloads e filtros. Guia em MOBILE.md. A stack descartável é compartilhada pela suíte: somente dados de teste; uso pessoal duradouro exige destino separado. Nenhum servidor Expo/API foi iniciado ou deixado aberto pelo agente neste bloco.

O dono foi avisado de que o app principal já é testável. Ainda não relatou teste desta integração; o relato anterior foi do harness S1. Harnesses opcionais preservados: speech:harness e reader:harness, com dados sintéticos e identidade privada própria.

## Limites e decisões pendentes

- Tradução: no diagnóstico autorizado, o adaptador protegido recebeu HTTP 403 com desafio e o GoogleTranslator HTTP 429 para frase sintética curta. Nenhum capítulo completo foi traduzido com sucesso nesse teste; P13/P15 reais continuam pendentes. Não afirmar que o problema original foi resolvido ou atribuir causa definitiva. URL/relatórios apenas privados em .private/translation-repro e arquivo associado, ignorados pelo git. Sem bypass, troca de motor ou repetição de chamadas sem evidência nova.
- Providers têm testes determinísticos, sem certificação de layouts/desafios externos atuais. Verificar fontes/tradução e corrigir impedimentos antes de declarar a versão validada para uso/apresentação.
- S1: POCO X5, voz pt-br-x-ptd-local (Enhanced), com sucesso relatado em capítulo 2, pausa/retomada, voz/velocidade, troca de app e bloqueio. Android/motor/Expo versus build/duração não informados. Interrupções, voz sem rede/sem PT, saída e iOS não certificados. ADR-008 dispensou esses cenários como impedimento F4→F5, sem aprová-los como testes. Não repetir a mesma solicitação de dispensa.
- S2: prebuild Android concluído em F1; assembleDebug executou 63 tarefas e falhou no acesso a Maven por resolução de rede (ADR-004). Sem APK novo validado; iOS nativo requer ambiente Apple. Hermes e Jest não substituem execução física/build nativo.
- Importação pessoal não executada. Formatos conhecidos/dry-run/aplicação explícita e recuperação em IMPORTACAO.md. Arquivos antigos sem fonte comprovada ficam preservados, sem atribuição automática; nenhum acesso ao sandbox antigo do Android.
- Licença pública ainda aberta. Fase 4/README de apresentação aguardam aprovação. Sem publicação, push, deploy, conta/auth, áudio remoto, jobs duráveis, Redis/ARQ, MMKV, WatermelonDB ou novos recursos fora da paridade.

## Continuidade

Ler AGENTS.md e este registro antes de qualquer ação em nova sessão. Consultar PLANO_COMMITS.md, ANALISE.md (contrato P01–P35), DECISIONS.md, WBS_STATUS.md, MOBILE.md, S1.md, API.md, PERSISTENCIA.md e IMPORTACAO.md.

Stack local descartável de integração em .private/voxnovel-f3-supabase; somente banco/Storage locais, sem projeto remoto alterado e sem chave no mobile. RLS/ACL/advisors auditados em F3 sem achados. Testes de importação usam schema/bucket isolados nessa stack. _legacy permanece somente leitura e ignorado. Checklist P01–P35 ainda não certificado na Fase 4.
