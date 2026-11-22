# VoxNovel

Leitor de webnovels para celular com leitura em texto, voz do próprio aparelho,
progresso por fonte e capítulos salvos para uso offline. Reconstrução organizada
do protótipo pessoal **Leitor Web em Voz Alta**.

**Estado:** versão funcional aprovada pelo dono no Android em 2026-11-21.
Tradução local, escolha original/português, leitura/voz, biblioteca, busca/cadastro
e downloads/offline receberam aceite. A revisão visual foi aprovada e consolidada.
A Fase 4 está concluída para essa entrega Android; evidências e limites em
[VALIDACAO.md](docs/VALIDACAO.md). Isso não certifica todos os sites ou dispositivos.

## Funcionalidades implementadas

- Biblioteca com capas, capítulo atual e recuperação da última lista sem rede.
- Busca por nome/URL, cadastro e tratamento de duplicatas; prioridade de uso
  inicial para FreeWebNovel. Outros adaptadores mantêm compatibilidade em testes,
  sem garantia de disponibilidade dos sites atuais.
- Fontes com progresso independente, capítulo inicial e navegação por capítulo.
- Leitor com temas, fontes, espaçamento, largura e rolagem automática.
- Escolha entre original e português na leitura e na voz; downloads mantidos em PT.
- Voz nativa por frases, pausa/retomada, voz/velocidade e avanço de capítulo.
- Texto offline, downloads individuais e intervalos de até 50 em grupos de cinco.
- Filtros globais de palavra, frase e expressão regular.
- Preferências de leitura/voz salvas no aparelho e telas adaptadas à horizontal.

O escopo acompanha o protótipo, com original/PT e preferências locais aprovados
como extensões P36/P37. Contrato e limites em
[ANALISE.md](docs/ANALISE.md); mudanças em [MELHORIAS.md](docs/MELHORIAS.md).

## Stack

| Parte | Tecnologias |
|---|---|
| Mobile | React Native 0.88, Expo SDK 58, React 19, TypeScript strict e Expo Router |
| Dados no mobile | TanStack Query, Zod e arquivos JSON no sandbox do app |
| Voz | expo-speech, com motor/vozes instalados no aparelho |
| Backend | Python 3.12, FastAPI, Pydantic, BeautifulSoup/lxml e tradução local CTranslate2/SentencePiece |
| Persistência | Supabase Postgres e Storage privado, acessados pelo backend |
| Qualidade | Ruff, mypy, pytest, ESLint boundaries, Jest/Testing Library e Gitleaks |

As versões exatas estão em `.nvmrc`, `package.json`, `yarn.lock` e
`apps/backend/poetry.lock`.

## Instalar

Pré-requisitos: Node da `.nvmrc`, Yarn 1.22.22, Python 3.12 e Poetry 2.4.1.
Para usar no celular, Expo Go compatível com SDK 58 e a mesma rede do computador.

```sh
nvm use
yarn install --frozen-lockfile --non-interactive
poetry -C apps/backend install --no-interaction
cp apps/backend/.env.example apps/backend/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Se já houver `.env`, preserve-o. Configure um destino Supabase dedicado conforme
[PERSISTENCIA.md](docs/PERSISTENCIA.md): aplicar as duas migrations de biblioteca
+ preferências e criar o bucket privado de texto. Preencha no `.env` do backend
`VOXNOVEL_SUPABASE_URL`, `VOXNOVEL_SUPABASE_SERVICE_KEY` e, se necessário,
`VOXNOVEL_SUPABASE_TEXT_BUCKET`.

No `.env` mobile, configure apenas `EXPO_PUBLIC_API_URL` com o endereço da API,
sem `/api/v1`. Em Android físico, localhost aponta para o próprio celular: use
o endereço LAN do computador. Credenciais de serviço ficam somente no backend.

Instale uma vez o modelo de tradução seguindo [TRADUCAO.md](docs/TRADUCAO.md).
Com o caminho do modelo configurado no `.env`, execute de `apps/backend`:

```sh
poetry run python -m tools.install_translation_model
```

Não exige conta/cartão; o instalador verifica o arquivo oficial e preserva sua
atribuição. Modelos e configurações privadas ficam fora do git.

## Rodar

Terminal 1, na pasta do backend:

```sh
cd apps/backend
poetry run python -m src.main
```

O padrão é loopback e porta 8000. Para acesso pelo Android, definir
`VOXNOVEL_HOST=0.0.0.0` no ambiente privado do backend; porta é configurável por
`VOXNOVEL_PORT`. A documentação interativa da API fica em `/docs`.

Terminal 2, na raiz do projeto:

```sh
yarn workspace @voxnovel/mobile start
```

Abra o QR no Expo Go. A abertura normal mostra splash e biblioteca; os harnesses
privados são opcionais. Guia de rede/execução e roteiro completo em
[MOBILE.md](docs/MOBILE.md). Para testar com a stack descartável já preparada
neste ambiente, siga [API.md](docs/API.md); ela é compartilhada com a suíte e deve
receber somente dados de teste.

## Experimentar a jornada

1. Adicione uma obra por nome/URL, selecione a fonte e escolha o capítulo.
2. Volte à biblioteca, abra os detalhes e confira o progresso.
3. Abra leitura, alterne original/português e abra a voz; teste capítulo, pausa e preferências.
4. Baixe um capítulo, abra-o em texto/voz e confira o número escolhido.
5. Com o conteúdo já salvo, teste a abertura sem rede sem reiniciar o Metro.
6. Adicione/remova um filtro e confira a confirmação ao limpar.

A tradução local suporta inglês→português brasileiro e mantém textos em português.
Outros idiomas, falhas e limites de tempo preservam o original, com razão fixa no
terminal/buffer, sem conteúdo do capítulo. Arquivos antigos não são regravados:
para atualizar um download que ficou em inglês, exclua esse capítulo e baixe-o
novamente. Recursos, licença do modelo e consequências para deploy em
[TRADUCAO.md](docs/TRADUCAO.md). Proteções do site ainda podem impedir a extração.

## Verificar e gerar bundles

Com Gitleaks instalado ou `GITLEAKS_BIN` configurado:

```sh
python3 scripts/check.py
```

Esse comando roda lint, tipos, testes, arquitetura, bundles Hermes Android/iOS e
varredura de segredos. Integrações precisam de uma stack **local descartável**
com as migrations aplicadas:

```sh
python3 scripts/check_integration.py --workdir .private/voxnovel-f3-supabase --all-checks
```

O caminho é uma configuração local ignorada; em outro checkout, prepare sua
stack de testes primeiro. O runner configura somente os endpoints locais e o
container daquele projeto. Sem stack, testes de integração são pulados: esse
resultado não equivale ao gate com banco/Storage reais.

```sh
yarn workspace @voxnovel/mobile build
```

Gera bundles em `apps/mobile/dist`, sem produzir APK/IPA. Build nativo Android
teve limitação de acesso ao Maven no spike; iOS nativo requer Apple/Xcode.
Workflows de qualidade estão em `.github/workflows`. Resultados da publicação
estão no [GitHub Actions](https://github.com/Lucas-M01/VoxNovel/actions).

## Estrutura

```text
apps/backend/src/   API, serviços, adaptadores e repositories
apps/mobile/app/    Rotas Expo Router
apps/mobile/src/    Telas, features, componentes e serviços do app
docs/              Contrato, decisões, execução e evidências
scripts/           Checks e importador privado opcional
```

A referência `_legacy` é somente leitura e não faz parte do repositório público.
Dados, credenciais, exportações e artefatos privados não são versionados.
Importação é opcional, manual e tem dry-run por padrão:
[IMPORTACAO.md](docs/IMPORTACAO.md). Nenhum dado pessoal foi importado pelo agente.

## Validação e licença

[VALIDACAO.md](docs/VALIDACAO.md) distingue testes automáticos, comparação com o
legado, evidência do harness e cenários ainda não executados no aplicativo real.
[PROGRESS.md](docs/PROGRESS.md) registra o fechamento e os próximos passos opcionais.
Foram aprovados 215 testes backend, incluindo 12 integrações reais locais, e
233 testes mobile; bundles Hermes Android/iOS passaram. Build nativo e cenários
físicos não executados continuam identificados em VALIDACAO.md.

Código distribuído sob a [licença MIT](LICENSE), por escolha expressa do dono.
Dependências, ícones e modelo de tradução mantêm suas próprias licenças e
atribuições; detalhes do modelo em [TRADUCAO.md](docs/TRADUCAO.md).


## Documentação de referência

[docs/spec](docs/spec/README.md) preserva o planejamento histórico, incluindo
propostas maiores que a versão entregue. Para entender o que foi implementado,
use este README, [o escopo](docs/ANALISE.md), [as decisões](docs/DECISIONS.md) e
[o estado da WBS](docs/WBS_STATUS.md).


## Histórico desta publicação

O histórico completo da reconstrução foi incorporado à `main`: 63 commits de
desenvolvimento, com autores, datas e mensagens preservados, além dos dois commits
da publicação inicial. A integração preserva o código atual validado e não usa
force push. O histórico original continua preservado no computador do dono.

A conferência distinguiu os commits de desenvolvimento dos checkpoints internos
da ferramenta: o caminho pessoal encontrado estava somente em um checkpoint,
que não foi importado. Os 63 commits e seus identificadores originais foram
preservados. As tags das fases foram incluídas; `reconstrucao-fase-4` identifica
a conclusão histórica, enquanto `fase-4` conserva o checkpoint já publicado.
