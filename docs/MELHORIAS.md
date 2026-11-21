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
| Interface | Biblioteca, busca, detalhes e navegação integrados com apresentação simples compartilhada, sem novas dependências visuais. | C40–C44; rotas reais nos testes. Android integrado ainda não testado pelo dono. |
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

## Limites mantidos

A tradução conserva blocos de 4.500 caracteres e fallback independente. Falha
externa não virou troca de tradutor. Limpeza visual e de fala continuam com as
diferenças observadas no protótipo. Preferências temporárias não ganharam
persistência nova. Não foram introduzidos auth, Redis/ARQ, filas duráveis,
TrackPlayer, voz paga, glossário, estatísticas ou deploy.

Pelo ADR-011, a versão inicial pode focar FreeWebNovel e os provedores que se
mostrarem operacionais. Isso não transforma outros adaptadores em certificados,
nem garante disponibilidade futura. A extração/metadados FreeWebNovel passaram
no caso autorizado após a correção do cliente; a tradução permanece pendente. A validação
final permanece aberta para o app Android integrado e para fonte/tradução.
