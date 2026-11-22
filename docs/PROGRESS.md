# Progresso

- Atualizado: 2026-11-21.
- Estado: Fase 4 concluída para a entrega Android aprovada. Código sob MIT.
- GitHub: https://github.com/Lucas-M01/VoxNovel, público, branch main.
- Último trabalho: integração do histórico completo, no merge que contém este
  registro. São 63 commits da reconstrução, dois da publicação inicial e o merge.
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
