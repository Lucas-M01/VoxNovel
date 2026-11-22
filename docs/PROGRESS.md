# Progresso

- Atualizado: 2026-11-22.
- Estado: Fase 4 concluída para a entrega Android aprovada. Código sob MIT.
- GitHub: https://github.com/Lucas-M01/VoxNovel, público, branch main.
- Último trabalho: correções de capítulos genéricos e navegação do player,
  com publicação autorizada pelo dono; detalhes ao final deste registro.
- O dono mudou a preferência inicial de snapshot e pediu todos os commits.
  A nova decisão substitui a opção anterior de manter o histórico só local.

## Histórico incorporado

- Cópia isolada conferida com git-filter-repo 2.47.0. A inspeção final mostrou
  que o caminho pessoal do yarn.lock pertencia apenas a um checkpoint interno
  refs/codex, fora da branch/tags de desenvolvimento. Essas refs não foram
  importadas. A hipótese anterior de caminho em commit foi corrigida.
- Os 63 commits mantêm os identificadores originais, autores, datas e mensagens;
  não houve alteração dos commits. A árvore atual do código permaneceu igual
  à validada. Scanner de todos os commits aprovado, sem caminhos pessoais.
- Os dois commits públicos anteriores e a tag fase-4 foram preservados.
  Tags fase-1, fase-2, fase-3 e fase-3-f1..f6 foram incorporadas;
  reconstrucao-fase-4 identifica a tag histórica sem sobrescrever a pública.
- O repositório original, suas refs e as alterações locais foram preservados.
  Não enviar branches ou tags da cópia original sem limpeza. Trabalhos públicos
  futuros devem continuar nesta linha ou em clones da main pública.

## Evidências e limites

- App Android com aceite funcional e visual do dono. POCO X5 informado; não
  inferir versão do sistema, voz atual ou subcenários que não foram enumerados.
- Último gate local: 215 backend, incluindo 12 integrações reais locais;
  233 mobile, lint/tipos/arquitetura e Hermes Android/iOS aprovados.
- CI anterior d4a6c47: backend e mobile SUCCESS. O merge mantém o código que
  passou nesses checks; conferir a execução do merge no GitHub Actions.
- Histórico completo com scanner de segredos aprovado; sem .env, modelos,
  capturas pessoais, _legacy ou configurações locais no envio.
- Tradução local inglês→PT-BR; português passa intacto, demais idiomas/falhas
  preservam original. Recurso de original/PT P36 e preferências locais P37
  autorizados. Demais decisões em DECISIONS.md e evidências em VALIDACAO.md.
- Sem APK/IPA novo validado, deploy/hospedagem ou importação pessoal. iOS e
  condições de voz não enumeradas continuam como limites registrados.

## Continuidade

Ler AGENTS.md e este registro antes de trabalhar. Histórico completo e snapshots
iniciais estão na mesma main por merge, sem reescrever a linha já publicada.
Dados pessoais e capturas seguem privados. Não reabrir o aceite Android recebido
nem tratar propostas de docs/spec como tarefas ou recursos implementados.

## Correções após teste da história autoral — 2026-11-22

- Base das correções: 75fe00f (histórico completo). Os registros abaixo descrevem
  o desenvolvimento local antes da publicação autorizada ao final deste arquivo.
- Solicitação/decisão: ADR-021. Player oferece Ler capítulo, encerra a fala e abre
  o capítulo/idioma atuais. Identificador genérico monta URLs de capítulos HTML
  numerados da mesma origem, sem domínio específico nem alteração de segurança HTTP.
- Teste público real: três capítulos distintos, HTTP 200, 18.373/31.311/31.895
  caracteres extraídos pelo PublicHttp protegido; página inicial sem capa/og:image.
  Nenhum texto da história incorporado ao repositório ou banco durante o teste.
- Mobile: 235 testes aprovados (29 suítes), lint e TypeScript aprovados;
  exportação Hermes Android/iOS concluída, sem certificar teste físico iOS.
- Backend: Ruff/formatação e mypy aprovados; 205 testes de unidade/API aprovados.
  A execução integral recusou 11 integrações pela configuração não descartável
  e pulou uma sem configuração; as barreiras locais impediram uso do banco do dono.
  Rodada isolada: 205 aprovados, 12 integrações desmarcadas. Não declarar integração
  real com banco validada novamente nesta sessão.
- Varredura dos arquivos desta correção sem segredos/caminhos pessoais; alterações
  locais do dono em package.json/yarn.lock/package-lock.json fora desta entrega.
- Próximo passo: atualizar a fonte já cadastrada no app
  por Detalhes → + Fonte → Por URL. Downloads antigos da sinopse devem ser removidos
  e baixados novamente. Capa depende de imagem autoral publicada e og:image no site.
- Pendente: reteste no aparelho apenas destas correções; não reabre o aceite geral.

### Reteste com índice e capítulo inicial

- Consulta somente de leitura à API configurada mostrou processo antigo: padrão
  vazio tanto no índice (total 3) quanto no primeiro capítulo (total 2). A fonte
  salva também estava sem padrão e com total 2. Nenhum registro foi alterado.
- Correção adicional local: ao identificar chapter-N.html, seguir no máximo um
  link explícito Home/index.html da mesma pasta e aceitar somente a mesma família
  de capítulos. O índice fornece o total completo e os metadados da obra.
- Validação da API nova em TestClient isolado, sem banco: ambos os endereços
  retornaram total 3 e o mesmo padrão; três textos distintos com HTTP 200.
- Gate backend adicional: 209 testes aprovados, 12 integrações desmarcadas;
  Ruff/formatação, mypy, arquitetura e varredura de segredos aprovados. Mobile
  sem novas alterações neste reteste; gate anterior de 235 testes permanece.
- Para aplicar no aparelho: reiniciar o processo do backend (código Python não
  recarregou automaticamente) e atualizar a fonte em Detalhes → + Fonte → Por URL.
  Downloads locais da sinopse precisam ser removidos e baixados novamente.
- O desenvolvimento acima foi validado antes dos commits de publicação abaixo.

## Publicação das correções — 2026-11-22

- Autorização explícita do dono: “pode dar o push”. Destino: origin/main, sem
  reescrever histórico e sem enviar tags/checkpoints internos.
- 85b1349 — fix(backend): resolve chapters from generic story indexes.
- 613cc31 — fix(mobile): return from speech to the current chapter.
- Este registro e ADR-021 acompanham o commit de documentação da publicação.
- Gate final: 209 testes de unidade/API + 12 integrações reais na stack local
  descartável (221 backend), 235 mobile, lint/tipos/arquitetura, exportação Hermes
  Android/iOS e varredura do conteúdo exato de cada commit aprovados.
- A primeira tentativa de integração encontrou timeout no Storage descartável;
  após reiniciar Storage/gateway e aguardar o healthcheck saudável, os 12 testes
  passaram. Nenhum projeto Supabase remoto do dono foi usado ou alterado.
- package.json, yarn.lock e package-lock.json modificados pelo dono permanecem
  locais, fora dos commits. Capturas, capítulos, .env e modelos não são publicados.
- Próximo passo do dono: reiniciar o backend e atualizar a fonte pela URL; remover
  downloads antigos da sinopse antes de baixar novamente. Reteste físico destas
  correções continua pendente; o aceite geral Android anterior permanece válido.
