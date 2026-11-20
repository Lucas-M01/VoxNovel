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

## Isolamento por fonte (C28)

As consultas de capítulo incluem obra e fonte na chave, além de URL e número.
Arquivos novos ficam em
`downloads/{novelId}/sources/{sourceId}/cap_{chapter}.json`; o JSON continua
`{ cap, texto }`. Ler, listar, contar e remover capítulo usa o escopo escolhido.
Contagem por obra recebe os escopos das fontes ativas. Remover os downloads de
uma obra apaga somente o namespace novo de fontes dessa obra.

Arquivos antigos sem fonte permanecem intocados no caminho anterior. Uma fonte
ativa hoje não comprova a origem de um download antigo; por isso não existe
atribuição automática, renomeação ou importação. Na falta do texto da fonte
escolhida, a consulta usa a rede ou mantém erro de indisponibilidade. A reversão
da transição de namespace foi verificada com arquivos sintéticos: criar e
remover o namespace novo preserva exatamente os bytes antigos e a biblioteca.
Importação pessoal continua sujeita ao dry-run e à autorização previstos no plano.

O cache remoto da API P35 mantém seu contrato por obra/capítulo, sem declarar
proveniência por fonte. O fluxo de downloads mobile observado busca texto pela
URL da fonte e grava no aparelho; não usa esse cache remoto como origem de texto
local. Alterar o contrato remoto exige mudança própria e não está no C28 mobile.

## Fala por frases (C29)

`tts-service.ts` mantém posição, status e opções somente na instância do player.
O adaptador `native-speech.ts` usa `expo-speech` 58.0.4, compatível com SDK 58.
A segmentação preserva a regra observada: separar espaços após ponto, exclamação,
interrogação ou reticências. Cada conclusão encadeia a próxima frase e informa
índice/total; o término do texto é um callback para a composição futura da tela.

Pause usa stop nativo, guarda a frase corrente e a retoma desde o começo.
Alterar velocidade ou voz durante a reprodução também reinicia a frase corrente.
O serviço permite parar, avançar/voltar e posicionar a frase, além de descartar
os callbacks após a destruição. Não usa pause/resume nativos incompatíveis com
Android, nem grava opções de voz ou áudio no disco.

As vozes instaladas são validadas e agrupadas pelo idioma informado pelo motor,
com PT-BR antes de PT-PT e demais variantes PT, seguido dos nomes dos idiomas.
A escolha sugerida prioriza PT-BR, qualquer PT e a primeira voz disponível;
sem enumeração válida, mantém a voz padrão do sistema. Isso não comprova que
uma voz funcione sem rede: tal condição depende do motor/pacote instalado e S1.
Erros de fala recebem mensagem fixa sem refletir diagnóstico nativo sensível.

Os testes usam driver injetado para verificar sequência, progresso, callbacks,
pausa/retomada, parada, limites de posição, configuração e agrupamento/fallback.
A serialização completa de cancelamentos e substituição do player é C30;
nenhum resultado de teste simulado certifica background ou tela bloqueada.

## Cancelamento e harness (C30)

Comandos de parada são serializados. A geração da fala é invalidada antes de
aguardar o motor, de modo que callbacks atrasados não avancem a frase. Eventos
de conclusão/erro são consumidos uma vez. Configurações e trocas rápidas mantêm
somente a solicitação mais recente; descarte é idempotente e impede novos eventos.
Falha ao parar impede nova reprodução até uma parada subsequente bem sucedida.

A sessão compartilhada do adaptador encerra o player anterior antes de criar
outro. Uma troca superada devolve null e não fala. As telas futuras devem usar
essa sessão e destruir a instância que receberam ao sair, em vez de parar
indiscriminadamente um player mais novo. Testes cobrem cancelamento pendente,
comandos simultâneos, fim duplicado, recuperação de erro e desmontagem.

O harness de desenvolvimento fica fora das rotas do produto. O launcher gera
um projeto privado ignorado pelo git, com identificador próprio e texto sintético.
O bundle dele importa o mesmo adaptador nativo e os mesmos serviços de arquivos
e fala. Seu teste de UI prepara capítulos, alterna controles, avança ao segundo
capítulo e verifica descarte. As exportações Hermes do harness Android/iOS
foram executadas, mas a execução física continua pendente. Instruções e matriz
de resultados ficam em S1.md. O dono foi avisado de que já pode testar no Android.

## Controles e conectividade (C31)

Primitivos usados no harness: ação acessível com estado ocupado/desabilitado,
modal com fechamento pelo botão voltar, erro com tentativa explícita e barra de
progresso limitada a 0–100. Controles de leitura expõem as opções observadas de
tamanho/família/tema/espaçamento/largura e velocidade de rolagem, além de estado
de controles visíveis e rolagem automática. Preferências usam Zod e estado da
montagem, sem MMKV, Zustand ou gravação nova em disco. A composição da rolagem,
imersão e do texto do leitor permanece em F5; o harness apresenta uma prévia.

NetInfo 12.0.1 compartilha uma única inscrição nativa entre consumidores.
Conforme o protótipo, somente `isInternetReachable === false` indica offline;
valor desconhecido permite tentar acessar a rede. O estado alimenta o
onlineManager do TanStack Query. Consultas de texto/biblioteca local continuam
executando offline. Escritas têm networkMode always e retry false: uma falha
não vira fila de sincronização de progresso para quando a conexão voltar.

O aviso de falta de internet é composto nas superfícies de leitura/fala que o
usam, com as mensagens existentes. O título inicial do produto não ganhou aviso
ou badge novo. Testes verificam inscrição/remoção, mudanças de conectividade,
disponibilidade local, ausência de fila de escrita offline, opções de leitura,
preferências descartadas na desmontagem e ações acessíveis.

## Validação física S1

O dono informou disponibilidade de Android físico. iOS continua pendente.
Testes simulados de callbacks ou exportação Hermes não comprovam fala em segundo
plano; essa evidência será registrada com aparelho, versão do sistema, motor,
vozes instaladas e resultados do harness privado. A ausência de iOS não equivale
a dispensa expressa do portão.

## Limite observado no diagnóstico de tradução

Em 2026-11-20, uma URL fornecida pelo dono foi verificada separadamente dos
testes determinísticos. O adaptador protegido recebeu HTTP 403 com indicação
de desafio; o GoogleTranslator recebeu HTTP 429 para uma frase sintética curta.
Não foi possível certificar extração/tradução completa desse capítulo no ambiente.
O fallback por bloco continua o contratado em P15: falha externa mantém o texto
original. Não inferir que o problema relatado no protótipo foi corrigido, nem
que essa é sua causa definitiva. URL e relatórios estão somente no espaço privado;
nenhum conteúdo do capítulo foi incorporado aos testes versionados. A validação
integrada de fontes/tradução continua pendente antes de afirmar paridade final.

## Leitor visual (C32)

`ReadingScreen` valida o capítulo e compõe `ReadingView`; metadados Novel vêm
validados do chamador. A ligação com os destinos da biblioteca permanece em F6.
O corpo renderiza Text nativo, com título combinado obra/capítulo quando esse
formato existe, parágrafos, recuo de diálogo e preferências temporárias.
A limpeza visual mantém a deduplicação global e os rodapés observados; o texto
de fala não passa por essa transformação adicional. Não há glossário novo.

A consulta da leitura ativa é distinta do cache de texto puro. Ela recupera
texto local primeiro e registra o progresso em uma mutation independente,
sem aguardar a gravação para exibir conteúdo. Falha de progresso é informada
sem esconder texto; leitura abandonada antes de concluir não dispara gravação.
Consulta de texto puro usada pelo prefetch não grava progresso nem download.
As chaves incluem obra/fonte/capítulo e invalidar o texto obriga nova consulta.

O harness privado do leitor usa `yarn workspace @voxnovel/mobile reader:harness`,
com projeto próprio em .private/voxnovel-reader-harness, preservando o harness de
voz. Ele prepara texto sintético local, simula apenas a gravação de progresso
e importa o leitor real. Não testa acesso externo ou tradução. C33 comporá os
controles de capítulo e a rolagem; o produto ainda não tem entrada pela biblioteca.

## Navegação e rolagem (C33)

Leitura oferece anterior/próximo e seleção numérica, respeitando limites conhecidos
e arquivos disponíveis quando offline. O diálogo mantém erro de validação sem
mudar de capítulo. A lista local usa chave por obra/fonte. Tocar no corpo
oculta/exibe controles; um drag impede o toque acidental até o período de liberação
observado de 150 ms. O timer é limpo ao sair.

Autoscroll usa passos de 0,5/1/1,8/3 a cada 16 ms, independentemente da fala.
Mudar velocidade reinicia somente esse timer; pausar ou desmontar limpa o recurso.
Durante carregamento sem conteúdo o timer não rola um corpo inexistente. Trocar
capítulo reinicia posição/progresso. Scroll acima de 95% atualiza a indicação,
sem navegação automática. Os testes verificam limites, navegação offline sem GET
de texto já local, toggle/drag e limpeza dos intervalos pertencentes ao módulo.

O leitor sintético agora pode ser exercitado com `reader:harness`: preparar e
abrir leitor, mudar preferências, navegar pelos dois capítulos locais e testar
rolagem. O teste continua sem fonte externa/tradução e não substitui a jornada
pela biblioteca, que será ligada em F6.
