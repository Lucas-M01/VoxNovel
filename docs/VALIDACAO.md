# Validação de paridade — Fase 4

Data: 2026-11-20. **Validação final aberta.** Implementação F1–F6 concluída;
o primeiro teste Android integrado relatou crash ao abrir a biblioteca. Correção
entregue, reteste pendente. Evidência do harness S1 continua
válida somente para os cenários relatados. Não foi criado um aceite de release
com base apenas em mocks ou bundles.

## Ambientes e método

- Testes backend determinísticos e integração HTTP com Postgres/Storage locais
  descartáveis. Integrações criam/removem dados, schema e bucket sintéticos.
- Testes mobile com rotas reais Expo Router e transporte/arquivos/fala injetados;
  libcurl real também recebe suas opções sem fazer rede no teste de regressão.
- Comparação somente leitura com helpers puros do legado: 1.296 caracteres entre
  ASCII/Latin/Greek/Cyrillic e quatro casos sintéticos de limpeza. Nenhum dado
  pessoal do protótipo foi carregado, modificado ou colocado nas fixtures.
- Verificações externas pontuais somente da URL fornecida pelo dono e de uma
  frase curta sintética para tradução. URL, relatórios e conteúdo pessoal ficam
  privados/ignorados. Não reproduzir texto do capítulo no repositório.
- Sem execução física do app principal pelo agente, sem APK/IPA validado e sem
  execução remota dos workflows como evidência.

**A** = comportamento coberto automaticamente no ambiente acima. **P** = há
cobertura automática, mas uma parte externa/física do critério permanece aberta.
A não significa que a jornada no aparelho foi executada. O contrato continua em
[ANALISE.md](ANALISE.md); os critérios não foram reduzidos para caber nos testes.

Gate atual: **192 testes backend** (180 unitários + 12 integrações locais),
**221 testes mobile**, 20 casos das regras de lint, Ruff/format/mypy/arquitetura,
ESLint/tsc, bundles Hermes Android/iOS e varredura de segredos aprovados.

## Checklist com evidências

| Item | Estado | Evidência e comparação | Limite/roteiro restante |
|---|---|---|---|
| P01 | A | [navigation.test.tsx](../apps/mobile/tests/navigation.test.tsx), splash e sete destinos reais; mesmos destinos do App original. | Repetir jornada no POCO. |
| P02 | A | [library.test.tsx](../apps/mobile/tests/library.test.tsx): ordenação por capítulo, lista, estado vazio e erro; capas/metadados na composição. | Conferir disposição e imagens no aparelho. |
| P03 | A | Biblioteca/cache offline e bloqueio de exclusão; respostas canceladas não substituem lista/disco. | Reabrir biblioteca já carregada em modo avião. |
| P04 | P | [test_providers.py](../apps/backend/tests/test_providers.py) e [search-view.test.tsx](../apps/mobile/tests/search-view.test.tsx): seleção de uma/várias fontes e erro parcial. | Busca por nome real não certificada; prioridade FreeWebNovel, demais sem garantia (ADR-011). |
| P05 | P | Metadados dos quatro adaptadores/fallback em corpus sintético; FreeWebNovel real retornou título, total, padrão e imagem para a URL autorizada. | Outros provedores/layouts atuais não certificados; não impedir versão inicial por eles, conforme ADR-011. |
| P06 | A | [test_api_library_integration.py](../apps/backend/tests/test_api_library_integration.py), busca/duplicata/cadastro e guards mobile. | Criar/abrir obra pelo app com backend real. |
| P07 | A | [detail.test.tsx](../apps/mobile/tests/detail.test.tsx): metadados e edição limitada. | Conferir detalhe no POCO. |
| P08 | A | Integrações de biblioteca e detalhe: adicionar/atualizar/remover, primeira ativa e última protegida. | Repetir adição/troca com fontes disponíveis. |
| P09 | A | [test_library_integration.py](../apps/backend/tests/test_library_integration.py) e detalhe: restaura capítulo próprio; sem conversão percentual. | Conferir dois progressos no app se houver duas fontes operacionais. |
| P10 | A | Exclusão com confirmação e remoção relacional real; arquivos offline preservados como no original. | Confirmar e cancelar com obra de teste. |
| P11 | A | [test_chapter_urls.py](../apps/backend/tests/test_chapter_urls.py): hífen/barra/query e fallback; comportamento comparado com helpers de URL originais. | Sem dependência de disponibilidade externa para a transformação pura. |
| P12 | P | [royalroad-selection.test.ts](../apps/mobile/tests/royalroad-selection.test.ts), [test_royalroad_regression.py](../apps/backend/tests/test_royalroad_regression.py): IDs preservados e índice correto. | RoyalRoad real não certificado; secundário na versão inicial conforme ADR-011. |
| P13 | P | [test_content.py](../apps/backend/tests/test_content.py), [test_provider_http.py](../apps/backend/tests/test_provider_http.py); extração real FreeWebNovel: HTTP 200, gzip, 11.327 caracteres. | Um caso real não certifica todos os capítulos/sites; testar pelo app. |
| P14 | A | Limpeza/água/homóglifos/rodapés e título em testes; comparação direta encontrou и/і invertidos e corrigiu. Corpus passou de duas diferenças a zero; quatro casos de limpeza iguais. | Corpora são sintéticos; não declarar comparação integral de todos os textos. |
| P15 | P | [test_translation.py](../apps/backend/tests/test_translation.py): blocos de 4.500, PT, espera e fallback independente como no original. | Frase sintética em chamada real recusada com TooManyRequests; capítulo completo traduzido ainda não comprovado. |
| P16 | A | [filter-view.test.tsx](../apps/mobile/tests/filter-view.test.tsx), [test_preferences_integration.py](../apps/backend/tests/test_preferences_integration.py): tipos, regex e remoção exata. | Testar formulário real e teclado no POCO. |
| P17 | A | Limpar mantém listas vazias no banco; palavras/frases removem linha e regex remove trecho. | Conferir efeito em capítulo de teste. |
| P18 | A | [reading-view.test.tsx](../apps/mobile/tests/reading-view.test.tsx), [reading-navigation.test.tsx](../apps/mobile/tests/reading-navigation.test.tsx): título/texto/limites/escolha e erros. | Conferir leitura e navegação no aparelho. |
| P19 | A | [reading-controls.test.tsx](../apps/mobile/tests/reading-controls.test.tsx): mesmas opções e valores; ajustes não refazem fetch. | Conferir fontes e conforto visual no Android. |
| P20 | A | [auto-scroll.test.tsx](../apps/mobile/tests/auto-scroll.test.tsx): timer, pausa/cleanup e velocidade; toque/drag nos controles. | Conferir gestos/rolagem física. |
| P21 | A | [chapter-prefetch.test.ts](../apps/mobile/tests/chapter-prefetch.test.ts): N+1..N+3, sequencial/memória e 80/95 sem avanço automático. | Cache em memória, sem download implícito. |
| P22 | P | Arquivos locais antes da rede, isolamento por fonte e indisponibilidade; [source-cache.test.ts](../apps/mobile/tests/source-cache.test.ts). | Modo avião com texto e voz já instalados no app principal ainda não testado. |
| P23 | P | [speech-races.test.ts](../apps/mobile/tests/speech-races.test.ts), [playback-controller.test.ts](../apps/mobile/tests/playback-controller.test.ts): frases/pausa/retomada/descarte sem callbacks antigos. | S1 parcial no POCO; saída/interrupções no app integrado pendentes. |
| P24 | P | [speech.test.ts](../apps/mobile/tests/speech.test.ts), [playback-view.test.tsx](../apps/mobile/tests/playback-view.test.tsx): frase reiniciada, PT-BR/vozes/fallback. | Voz/velocidade relatadas no S1; ausência PT e condições reais ainda pendentes. |
| P25 | P | Controller encadeia uma vez, respeita fim/limites/offline. Avanço ao capítulo 2 relatado no harness S1. | Repetir com capítulos reais no app integrado. |
| P26 | A | Progresso por obra/fonte em integrações; erro de gravação não esconde leitura nem interrompe voz. | Reabrir detalhe após ler/ouvir no app. |
| P27 | A | [download-service.test.ts](../apps/mobile/tests/download-service.test.ts), [downloads-view.test.tsx](../apps/mobile/tests/downloads-view.test.tsx): escrita local, falha/retry/lista. | Conferir persistência ao fechar/reabrir app. |
| P28 | A | [download-range.test.ts](../apps/mobile/tests/download-range.test.ts): até 50, grupos de cinco, ordem, existentes e tentativas inclusive falhas. | Testar pequeno intervalo real disponível. |
| P29 | A | Confirmação/cancelamento e limpeza remota não bloqueante; erro local não é sucesso falso. | Testar remoção no aparelho. |
| P30 | A | Jornada real de rotas abre capítulo 2 escolhido em texto; prioridade explícito→fonte→obra coberta em voz. | Repetir texto/voz pelo download no aparelho. |
| P31 | A | Estado e último log por sessão no player; teste de painel/estado. Mesmo papel observado no original. | Conferir leitura do painel no Android. |
| P32 | A | [test_api_preferences_integration.py](../apps/backend/tests/test_api_preferences_integration.py): listar/substituir/limpar/termo/palavra/regex, rotas EN aprovadas. | Compatibilidade de capacidade, sem promessa de payload PT literal. |
| P33 | A | Velocidade salva no banco e query inicial do player; tests API e controller. | Confirmar preferência no primeiro play real. |
| P34 | A | [test_downloads.py](../apps/backend/tests/test_downloads.py): buffer fixo de 500, logs sem payload/credenciais; não persistente. | Sem telemetria nova. |
| P35 | A | [test_api_downloads_integration.py](../apps/backend/tests/test_api_downloads_integration.py), [test_storage_integration.py](../apps/backend/tests/test_storage_integration.py): round-trip, lista, remoção e privacidade reais. | Usa texto sintético; não certifica tradução externa. |

## Achados corrigidos

1. Normalização de и/і divergente do legado: corrigida e coberta por regressão.
2. Lista em CONNECT_TO incompatível com curl-cffi: substituída pela fixação
   permanente RESOLVE; certificado/SNI, ausência de proxy e redirects controlados
   permanecem. Novo teste aplica opções ao libcurl real sem transferir dados.
3. Perfil Curl anunciava Brotli, embora o adaptador só decodificasse gzip/deflate:
   Accept-Encoding passou a ser explícito. O caso real retornou 200/gzip e
   conteúdo extraído. FreeWebNovel usa esse transporte guardado no backend.

## Resultado externo e escopo inicial

O caminho HTTP anterior e os cabeçalhos do protótipo receberam 403 com desafio.
Após a correção do cliente Curl e da codificação, o caso FreeWebNovel autorizado
retornou conteúdo e metadados. Não foi removida proteção de rede, importado cookie
externo ou resolvido desafio. Não há garantia de disponibilidade futura.

O dono relatou que, no original, só FreeWebNovel funcionava e autorizou focar nele
ou nos provedores operacionais (ADR-011). Os outros adaptadores não são anunciados
como aprovados e não bloqueiam a versão inicial; não foram apagados só por falta
de teste atual. A correção de IDs RoyalRoad continua coberta independentemente de
sua disponibilidade externa.

A tradução mantém uma pendência distinta: GoogleTranslator recusou a frase
sintética curta por limite de requisições. Um controle isolado com o cliente Curl
guardado terminou em redirecionamento seguido de HTTP 429; não houve sucesso em
PT nem mudança no tradutor do produto. Não foram repetidas chamadas em lote
nem trocado o tradutor. Extração bem sucedida não comprova tradução para PT.

## Evidência física e fechamento

Após o registro inicial “Ainda não testei”, o dono iniciou o app integrado e
relatou TypeError em toSorted na biblioteca. A lista agora ordena uma cópia via
sort; regressão simula a ausência de toSorted e verifica que o cache não é
alterado. Reteste no aparelho e restante da jornada pendentes. O relato
anterior S1 foi POCO X5, voz pt-br-x-ptd-local (Enhanced), com sucesso em controles,
avanço, troca de app/bloqueio, sem todos os metadados/durações. Limites detalhados
em [S1.md](S1.md); dispensa de ADR-008 não aprova cenários ausentes.

Para fechar a validação, executar o roteiro do README/MOBILE no Android com o
backend real, registrar resultados e corrigir impedimentos; comprovar a tradução
ou obter uma decisão explícita sobre sua indisponibilidade. iOS, interrupções,
voz sem rede/sem PT e build nativo permanecem com os limites registrados. Nenhum
teste manual ausente foi marcado como executado. A tag fase-4 não deve sinalizar
um fechamento enquanto esse aceite continuar pendente.
