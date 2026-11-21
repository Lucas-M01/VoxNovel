# VoxNovel

Leitor de webnovels para celular com leitura em texto, voz do próprio aparelho,
progresso por fonte e capítulos salvos para uso offline. Reconstrução organizada
do protótipo pessoal **Leitor Web em Voz Alta**.

**Estado:** implementação integrada; validação final em andamento. Em 2026-11-21,
o dono confirmou no Android biblioteca, busca/cadastro, leitura, voz e downloads
inclusive sem internet. A busca também encontrou algumas obras no CentralNovel,
além do FreeWebNovel. A tradução ainda não funcionou no teste e permanece aberta
em [VALIDACAO.md](docs/VALIDACAO.md). O relato não certifica todos os sites,
capítulos ou cenários de dispositivo.

## Funcionalidades implementadas

- Biblioteca com capas, capítulo atual e recuperação da última lista sem rede.
- Busca por nome/URL, cadastro e tratamento de duplicatas; prioridade de uso
  inicial para FreeWebNovel. Outros adaptadores mantêm compatibilidade em testes,
  sem garantia de disponibilidade dos sites atuais.
- Fontes com progresso independente, capítulo inicial e navegação por capítulo.
- Leitor com temas, fontes, espaçamento, largura e rolagem automática.
- Voz nativa por frases, pausa/retomada, voz/velocidade e avanço de capítulo.
- Texto offline, downloads individuais e intervalos de até 50 em grupos de cinco.
- Filtros globais de palavra, frase e expressão regular.

O escopo acompanha o que o protótipo já fazia. Contrato e limites em
[ANALISE.md](docs/ANALISE.md); mudanças em [MELHORIAS.md](docs/MELHORIAS.md).

## Stack

| Parte | Tecnologias |
|---|---|
| Mobile | React Native 0.88, Expo SDK 58, React 19, TypeScript strict e Expo Router |
| Dados no mobile | TanStack Query, Zod e arquivos JSON no sandbox do app |
| Voz | expo-speech, com motor/vozes instalados no aparelho |
| Backend | Python 3.12, FastAPI, Pydantic, BeautifulSoup/lxml e deep-translator |
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
3. Abra leitura e voz; teste capítulo, pausa/retomada e preferências.
4. Baixe um capítulo, abra-o em texto/voz e confira o número escolhido.
5. Com o conteúdo já salvo, teste a abertura sem rede sem reiniciar o Metro.
6. Adicione/remova um filtro e confira a confirmação ao limpar.

A tradução depende do serviço externo. Uma falha de tradução preserva o bloco
original; isso pode resultar em texto parcialmente traduzido. O terminal do
backend e os logs existentes registram uma razão fixa para esse fallback,
inclusive limite do Google (HTTP 429), sem conteúdo do capítulo. Respostas de
proteção do site podem impedir a extração. O caso relatado pelo dono continua
aberto; não se presume sucesso com qualquer URL.

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
Workflows de qualidade estão em `.github/workflows`; nenhum run remoto foi
executado como evidência desta reconstrução.

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
[PROGRESS.md](docs/PROGRESS.md) registra o próximo passo. A validação final ainda
não está encerrada.

A licença pública ainda não foi escolhida pelo dono. [LICENSE](LICENSE) registra
a ausência de concessão; dependências mantêm suas próprias licenças.
