# Mudanças em relação ao protótipo

A reconstrução preserva as capacidades do checklist P01–P35. O dono pediu uma
versão suficiente para usar e apresentar, com melhorias extras adiadas. Estado
da comprovação em VALIDACAO.md; este documento não certifica testes ausentes.

| Área | Mudança e motivo | Evidência |
|---|---|---|
| Organização | API, serviços, adaptadores e repositories separados; mobile com telas finas e dependências entre camadas fiscalizadas. | Checks AST, ESLint boundaries e casos negativos do linter. |
| Contratos | API EN em /api/v1, modelos Pydantic e validação Zod no cliente. Preserva capacidades, sem exigir payload PT literal antigo. | ADR-002; testes de API/cliente. |
| Configuração | Ambiente centralizado; exemplos sem chaves; endpoints/caminhos externos configuráveis. | core/config.py, core/config.ts e checks de arquitetura. |
| Rede | Endereços públicos validados em cada salto, DNS fixado, proxy/rebinding e redes privadas bloqueados; limites de tempo/tamanho e descompressão. | test_http.py e test_provider_http.py; HTTP.md. |
| Erros | Erros tipados e respostas amigáveis, sem expor conteúdo de capítulo, URLs ou credenciais. Progresso pode falhar sem esconder texto. | Testes de erro, leitura e player. |
| Fontes | IDs RoyalRoad preservados no cadastro e na resolução do índice. | ADR-002, C24/C41 e regressões de URL/payload. |
| Capítulo escolhido | Leitura/voz pelos downloads e player respeitam o capítulo explícito antes do progresso salvo. | C36/C44 e testes de jornada. |
| Cache | Arquivos e memória identificam obra e fonte; dados antigos sem origem comprovada ficam preservados. | C28 e source-cache.test.ts. |
| Fala | Mesmo recurso nativo expo-speech do original, com stop serializado e descarte de callbacks de sessões antigas. | Testes de corridas e relato S1 parcial; sem troca de motor. |
| Interface | Biblioteca, busca, detalhes e navegação integrados com apresentação simples compartilhada, sem novas dependências visuais. | C40–C44; rotas reais nos testes. Reteste do dono em 2026-11-21 confirmou biblioteca, busca/cadastro, leitura, voz e downloads/offline; tradução falhou. |
| Concorrência | Respostas antigas descartadas; cache escrito em sequência; prefetch e lotes limitados, sem jobs duráveis novos. | Biblioteca/prefetch/faixas e isolamento por fonte. |
| Persistência | Escritas relacionadas atômicas, propriedade da fonte ativa, RLS e backend como cliente privilegiado. | Integrações reais locais de banco/Storage; sem auth de usuário novo. |
| Migração | Importador explícito, dry-run, conflitos sem sobrescrita e backups privados. | C45, 12 integrações locais totais e testes de orquestração; nenhuma migração pessoal. |
| Reprodutibilidade | Lockfiles, lint, tipos, testes, scripts de check, bundles e scanner de segredos. | Gates locais de cada commit; CI remoto não executado. |

## Correções encontradas na Fase 4

- P14: a tabela nova trocava o mapeamento de и (U+0438) pelo de і (U+0456).
  A referência transforma a primeira em i e preserva a segunda. Corrigido com
  regressão; comparação de 1.296 caracteres passou de duas diferenças a zero.
- P13: a configuração de Curl usava CONNECT_TO como lista, forma não aceita pelo
  SDK instalado. O erro foi observado com o cliente real, embora mocks anteriores
  passassem. A fixação usa RESOLVE, sem relaxar destino público, TLS, proxy ou
  redirects. O teste novo aplica opções ao libcurl real sem realizar rede.

- P01/P02: abertura da biblioteca corrigida após TypeError relatado no Android.
  Cópia + sort substitui toSorted indisponível; regressão executa sem esse método
  e confere ordem e cache intacto. Abertura confirmada pelo dono no reteste de 2026-11-21.

- API local: validador corrigido para aceitar IP/localhost via HTTP/HTTPS,
  como exige a execução em aparelho físico. Credenciais, query e fragmento
  continuam rejeitados. Testes LAN/loopback/IPv6 e loader real Expo validados.

- Tradução: motivo do fallback agora aparece no terminal e no buffer existente
  com mensagem fixa. HTTP 429 é distinguido sem registrar exceção bruta, URLs ou
  conteúdo. O diagnóstico C47 manteve o motor; depois, ADR-013 autorizou a alternativa local para dispensar cartão.

## Limites mantidos

A tradução conserva blocos de 4.500 caracteres e fallback independente. Falha
preserva o original. A troca posterior de motor foi autorizada em ADR-013: CTranslate2/SentencePiece com Argos en_pb, somente inglês→PT-BR; português passa intacto. Limpeza visual e de fala continuam com as
diferenças observadas no protótipo. Preferências da sessão continuam ajustáveis; ADR-015 autorizou salvar padrões
de leitura/voz no aparelho (P37), como exceção expressa. Não foram introduzidos auth, Redis/ARQ, filas duráveis,
TrackPlayer, voz paga, glossário, estatísticas ou deploy.

Pelo ADR-011, a versão inicial pode focar FreeWebNovel e os provedores que se
mostrarem operacionais. Isso não transforma outros adaptadores em certificados,
nem garante disponibilidade futura. A extração/metadados FreeWebNovel passaram
no caso autorizado após a correção do cliente. A tradução local passou no teste real da API, sem fallback; o dono aprovou o reteste Android em 2026-11-21; a revisão visual foi consolidada em d63c677 e aprovada pelo dono; busca também encontrou algumas obras CentralNovel, sem certificar seus capítulos.


## Extensões aprovadas durante a validação

- P36/ADR-014: seletor original/português na leitura e na voz, cache de memória separado e descarte da fala antiga ao trocar. Arquivos de downloads existentes permanecem intactos e no fluxo PT. Testes de cache, prefetch, voz e tela em text-mode*.test.*; API c8fcd3f, mobile 3d0e10f.
- ADR-013: modelo local de tradução, sem chave/cartão, PyTorch, GPU ou serviço adicional. Instalação explícita com SHA-256 e atribuição preservada, carregamento sob demanda e um modelo compartilhado. API real traduziu o capítulo autorizado sem fallback. Limites de idiomas, qualidade, CPU/RAM e deploy documentados em TRADUCAO.md; hospedagem gratuita não foi garantida.


## Aceite da versão funcional

Em 2026-11-21, o dono concluiu o reteste solicitado e informou que está tudo
certo. Registrado aceite geral no Android para a versão com tradução local e
original/PT; não se presume execução individual de cenários não enumerados.
Revisões visuais autorizadas em ADR-015–020 continuam no working tree e precisam
ser consolidadas antes da tag final. Nenhuma alteração visual foi revertida ou
incluída indevidamente nos commits do tradutor. Evidências em VALIDACAO.md.


## Revisão visual aprovada e consolidada

Commit d63c677 reúne as decisões ADR-015–020: biblioteca por capas, fonte ativa e
contagem offline coerente, detalhes/fontes, leitor com Personalização, player
com vozes agrupadas e limite de 2×, confirmações e estados de carregamento,
preferências locais P37 e adaptação à horizontal. A retirada de Detalhes do
player foi pedida pelo dono; estado/progresso permanecem visíveis. Ícones têm
atribuição e licença em src/ui/icons. Nenhuma dependência visual foi adicionada.

O dono aprovou o visual e o reteste funcional Android. Fechamento com 215 testes
backend, 233 mobile, lint/tipos/arquitetura, exportações Hermes Android/iOS e
scanner staged aprovados. Detalhamento e limites permanecem em VALIDACAO.md.
