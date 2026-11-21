# Fundação — F1

Registro histórico de F1. Estado e instalação atuais no README; evidências em VALIDACAO.md.

Estado: fechamento de C01–C09; resultados finais registrados em PROGRESS.md e pela tag fase-3-f1. Este bloco fornece infraestrutura de desenvolvimento; os itens P01–P35 continuam sem declaração de paridade completa.

## Ambiente reproduzível

- Node 24.15.0 (`.nvmrc`) e Yarn 1.22.22 (`packageManager`), Python 3.12 e Poetry 2.4.1. Não usar o Node do sistema caso seja anterior ao exigido pelo SDK.
- Backend fixado por poetry.lock: FastAPI 0.164.0, Pydantic 2.14.3, Settings 2.16.3, uvicorn 0.54.0; ferramentas Ruff 0.17.5, mypy 1.20.2 e pytest 9.2.0.
- Mobile fixado por yarn.lock: Expo 58.0.26, React 19.3.0, RN 0.88.1, Router 58.0.32, TypeScript 6.0.3, ESLint 10.15.0 e Jest 30.5.2. TypeScript 7 não foi adotado porque o parser de lint consultado declara suporte abaixo de 6.1.
- Fonte da combinação Expo/React/RN: `bundledNativeModules.json` do pacote oficial Expo instalado. Bibliotecas de conteúdo/voz/arquivos serão adicionadas com seus consumidores nos blocos correspondentes, sem instalar toda a WBS.

## Instalação e checagem

Na raiz do repositório:

```sh
nvm use
yarn install --frozen-lockfile --non-interactive
poetry -C apps/backend install --no-interaction
python3 scripts/check.py
```

Gitleaks deve estar disponível no PATH, ou ser indicado por GITLEAKS_BIN. O script verifica arquivos candidatos e histórico com valores redigidos. O CI baixa Gitleaks 8.30.1 e confere o arquivo contra o checksum oficial antes de executar. Para conferir o conteúdo staged antes de um commit:

```sh
python3 scripts/check.py --staged
```

O escopo pode ser limitado com `--scope backend` ou `--scope mobile`; antes de commits os dois escopos existentes são obrigatórios. O CI mínimo executa ambos em jobs separados. Sem deploy, push automático, Supabase remoto ou dados pessoais.

Para iniciar somente a base da API, copiar o exemplo de ambiente e executar dentro de apps/backend:

```sh
cp .env.example .env
poetry run python -m src.main
```

As configurações vêm de core/config.py. A aplicação atual contém apenas a base FastAPI, documentação automática e tratamento de erros; rotas de conteúdo e persistência não foram reconstruídas. Para a base mobile, executar da raiz:

```sh
yarn workspace @voxnovel/mobile start
```

## Organização e controles

Expo Router usa app/ com entradas que compõem src/screens. Isso evita configurar uma raiz customizada não recomendada pelo Router; features/UI/core só surgem com consumidores reais. Metro bloqueia `_legacy/` e ambientes Python da indexação. src/screens ainda contém somente a entrada mínima compilável, não a biblioteca reconstruída.

Backend: checks AST para ambiente centralizado, HTTP em adapters/engines, SQL em repositories e updated_at em tabelas explícitas. O checker é fiscalização de convenções sintáticas, não um sandbox contra Python malicioso/dinâmico. Casos positivos e negativos têm testes.

Mobile: ESLint boundaries define dependências unidirecionais; aliases ao atravessar camadas; type em vez de interface; casts e reexports proibidos. Regras de hooks e regra local rejeitam trabalho de dados/estado derivado em efeitos, inclusive aliases de useEffect e helpers locais reconhecidos. Nenhuma análise sintática garante identificar todo I/O indireto arbitrário: revisar novos adaptadores na implementação. Testes negativos verificam o linter real em projeto temporário.

## Spikes e limites de validação

- S3: versões resolvidas, dependências instaladas e lockfiles criados; smoke de import/config/backend, tipos, lint e render mobile executados. Bundles Hermes Android e iOS foram exportados com sucesso. Isso não é compilação nativa nem execução em dispositivo.
- S2: projeto Android gerado por prebuild em diretório ignorado; Java 21 disponível e Gradle 9.4.1 obtido pelo wrapper do template. assembleDebug executou 63 tarefas e falhou ao obter artefatos de repo.maven.apache.org por erro de resolução de rede; não há APK validado. O plano permite encerrar F1 com a limitação de S2 explicitada, sem marcar compilação nativa como aprovada. Diretórios nativos e cache são artefatos locais, não fontes versionadas.
- iOS nativo requer ambiente Apple/Xcode não disponível nesta execução Linux. Não foi compilado nem instalado em iOS.
- Não há aparelho Android conectado. S1 de voz/background continua pendente para o bloco F4, sem dispensa presumida. Nenhum motor foi trocado.
- CI remoto ainda não executado: workflows foram preparados e as mesmas ferramentas são verificadas localmente. Auditoria de vulnerabilidades de dependências deve distinguir dependência depreciada de vulnerabilidade confirmada; avisos transitivos serão registrados sem afirmar que houve auditoria completa.

Supabase e migração pessoal pertencem aos blocos seguintes. Não usar o projeto do protótipo como banco de testes. A licença pública não foi escolhida: LICENSE registra ausência de concessão, sem atribuir licença automaticamente.

Referências técnicas consultadas: [Expo Router](https://docs.expo.dev/router/installation/), [TypeScript no Expo](https://docs.expo.dev/guides/typescript/), [Jest no Expo](https://docs.expo.dev/develop/unit-testing/), [JS Boundaries](https://www.jsboundaries.dev/docs/quick-start/). As versões efetivamente usadas são as dos lockfiles, não exemplos antigos das specs.

## Evidência do gate final

Backend: 23 testes, Ruff, mypy (12 arquivos incluindo scripts), checker de arquitetura e compileall. Mobile: 20 casos positivos/negativos do lint, TypeScript e um teste Jest da composição inicial. Bundles Android/iOS e Gitleaks são condições obrigatórias para criar a tag de fechamento, não dispensadas pela limitação nativa do S2. Sintaxe YAML e bash dos dois workflows validada localmente; nenhum run remoto foi iniciado.
