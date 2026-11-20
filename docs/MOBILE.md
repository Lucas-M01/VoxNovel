# Serviços mobile

## Cliente da API (C26)

O app usa `src/core/http-resource.ts` e recursos por domínio em `src/core/api/`.
Respostas passam por Zod antes de chegar ao cache ou à interface, inclusive listas,
metadados, preferências, texto, downloads remotos, logs e status. Exclusão de obra
aceita resposta vazia (204). Não existe cliente Supabase, chave de serviço, auth
ou áudio remoto no mobile.

Copiar `apps/mobile/.env.example` para `apps/mobile/.env` e definir
`EXPO_PUBLIC_API_URL` com o endereço do backend, sem `/api/v1`. Variáveis
`EXPO_PUBLIC_*` entram no bundle: esse endereço é público e nunca deve conter
credenciais. O valor é validado na primeira solicitação; a fundação ainda pode
iniciar sem backend configurado.

Em Android físico, `localhost` identifica o próprio aparelho. Usar o endereço
LAN da máquina do backend e a mesma rede. O backend pode escutar nessa interface
com `VOXNOVEL_HOST` no ambiente, seguindo a inicialização de API.md; configurar
firewall e endereço local de acordo com a rede de teste. Nenhum endereço pessoal
é registrado no repositório.

`apiQueries()` fornece opções compartilhadas para `useQuery` e `fetchQuery`.
O provider da raiz mantém um QueryClient por montagem. Sinais de cancelamento
chegam ao fetch e cada solicitação tem timeout de 180 segundos para acomodar
extração/tradução. Erros mostram mensagens fixas em português, sem refletir
conteúdo ou detalhes internos do servidor. Resposta não JSON de sobrecarga
também recebe tratamento amigável. Não há repetição automática de leitura ou
escrita. `apiMutations(client)` invalida os dados afetados após sucesso; filtros
invalidam também texto traduzido em memória.

Testes usam somente dados sintéticos e transporte injetado. Verificam contrato,
erros e payload incompatível em cada operação, além de URL encoding, validação
de entrada, cancelamento, timeout e comportamento do cache/mutations. Não
certificam conectividade de um aparelho com o backend.

A interface ainda mostra somente o título inicial. A composição do leitor e da
biblioteca está prevista nos blocos F5/F6, após os serviços F4 e seu portão.
Não há um fluxo de leitura disponível nesta etapa do cliente da API.

## Arquivos locais (C27)

O adaptador usa a API assíncrona suportada de `expo-file-system/legacy` da
versão compatível com SDK 58, dentro de documentos persistentes do próprio app.
O diretório é obtido do módulo nativo, sem caminho de máquina configurado.
O formato inicialmente reconstruído preserva `cache_obras.json` com
`{ obras, salvoEm }` e `downloads/{novelId}/cap_{chapter}.json` com `{ cap, texto }`.
O envelope tem os nomes observados; as obras internas usam o contrato novo EN.
Dados do protótipo não são importados automaticamente.

As consultas salvam a última biblioteca obtida e usam essa cópia se a API
falhar; sem cópia válida, mantêm o erro em vez de inventar biblioteca vazia.
O capítulo consulta texto já baixado antes da rede e devolve o contrato EN.
Ler texto online não o salva automaticamente: gravação de downloads é explícita.
Consultas com acesso local executam mesmo quando a conectividade global indica
offline. Cancelamento não é convertido em recuperação bem sucedida do cache.

JSON ausente, corrompido ou incompatível é tratado como indisponível e permanece
intocado. Falha ao salvar a biblioteca não esconde resposta online válida;
falha ao gravar capítulo não é apresentada como download concluído. Operações
incluem listar/contar, verificar existência, medir bytes e remover capítulo/obra,
sem áudio e sem acesso ao armazenamento externo de outros apps.

O isolamento de cache por fonte e a preservação do formato antigo serão tratados
separadamente em C28, antes de compor qualquer interface de leitura/download.

## Validação física S1

O dono informou disponibilidade de Android físico. iOS continua pendente.
Testes simulados de callbacks ou exportação Hermes não comprovam fala em segundo
plano; essa evidência será registrada com aparelho, versão do sistema, motor,
vozes instaladas e resultados do harness privado. A ausência de iOS não equivale
a dispensa expressa do portão.
