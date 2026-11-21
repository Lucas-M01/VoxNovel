# API local — F3

F3 disponibiliza biblioteca, fontes, progresso, identificação/busca, texto, filtros, velocidade, cache remoto e logs em `/api/v1`. A interface Expo integrada em F6 usa esses contratos; instruções de execução em MOBILE.md. Use somente dados sintéticos na stack descartável; projetos pessoais não são bancos de teste.

## Rodar com a stack descartável já iniciada

Nesta sessão, a configuração de teste foi preservada em um diretório ignorado pelo git. Na raiz do repositório:

```sh
export STACK_DIR="$PWD/.private/voxnovel-f3-supabase"
```

A stack local deve estar saudável. As migrations de biblioteca e preferências devem estar aplicadas. O comando consulta apenas status local, valida loopback e passa credenciais por ambiente sem imprimi-las:

```sh
python3 - "$STACK_DIR" <<'PY'
import json
import os
import subprocess
import sys
from urllib.parse import urlparse

result = subprocess.run(
    ["npx", "--yes", "supabase@3", "status", "--workdir", sys.argv[1], "-o", "json"],
    capture_output=True, text=True, check=True,
)
data = json.loads(result.stdout)
assert urlparse(data["API_URL"]).hostname in {"localhost", "127.0.0.1", "::1"}
env = os.environ.copy()
env["VOXNOVEL_SUPABASE_URL"] = data["API_URL"]
env["VOXNOVEL_SUPABASE_SERVICE_KEY"] = data["SERVICE_ROLE_KEY"]
subprocess.run(
    ["poetry", "run", "python", "-m", "src.main"],
    cwd="apps/backend", env=env, check=True,
)
PY
```

A configuração padrão atende somente em loopback, porta 8000. Abra `http://127.0.0.1:8000/docs` para testar pelo Swagger; host/porta vêm de core/config.py e podem ser alterados por ambiente. Ctrl+C encerra a API. Não coloque a chave de serviço no app ou em comandos versionados.

## Primeiro fluxo manual

1. POST `/api/v1/novels` com `{"title":"Synthetic local","sources":[{"provider":"Synthetic","title":"Synthetic local","url_base":"https://source.example/chapter-1","current_chapter":1}]}`.
2. Use o id retornado em GET `/api/v1/novels/{id}` e PATCH `/api/v1/novels/{id}/progress`, com `{"chapter":3}`.
3. Adicione uma segunda fonte via POST `/api/v1/novels/{id}/sources`. Troque a fonte ativa via PATCH `/api/v1/novels/{id}/active-source`, com `{"source_id":"UUID retornado"}`. O capítulo próprio de cada fonte é preservado.
4. DELETE `/api/v1/novels/{id}` limpa a obra sintética e suas fontes. Não use dados pessoais para esse roteiro.

O domínio source.example é sintético; serve para exercitar a biblioteca sem acessar sites externos. Identificação/busca requerem acesso público real e podem falhar por proteção do provedor. Não existem rotas de debug, áudio remoto ou login.

Erros usam application/problem+json, sem refletir payloads/credenciais. IDs e capítulos inválidos resultam em validação; duplicata é conflito, registro ausente é not-found e persistência não configurada é indisponibilidade.

## Verificação automatizada

```sh
python3 scripts/check_integration.py --workdir "$STACK_DIR"
python3 scripts/check_integration.py --workdir "$STACK_DIR" --all-checks
```

A integração HTTP percorre criação, leitura/listagem, conflito, progresso, fontes, troca, bloqueio da última remoção e exclusão no banco local real. Textos e metadados externos usam fixtures nas provas determinísticas.

## Texto, filtros e velocidade (C22)

- GET `/api/v1/chapters/text?url=...&chapter=...`: extrai, limpa, aplica filtros globais e traduz para português por padrão; `translate=false` retorna o original após a mesma limpeza/filtros, sem chamar o tradutor. Retorna url/chapter/text. Requer acesso público e configuração de filtros no banco. Não gera áudio.
- GET/PUT/DELETE `/api/v1/filters`: lê/substitui/esvazia words/phrases/regex. DELETE mantém listas vazias.
- POST/DELETE `/api/v1/filters/term`: JSON `{"kind":"words","value":"Synthetic"}`; kinds words, phrases e regex são explícitos.
- POST/DELETE `/api/v1/filters/word` e `/api/v1/filters/regex`: capacidades antigas com nomes EN. Word decide palavra/frase pela presença de espaço; remoção procura palavras antes de frases. Não cria filtros por obra.
- GET/PUT `/api/v1/settings`: velocidade padrão, com JSON `{"speed":1.5}` no PUT.

Se a API já estava aberta antes de novos commits, reinicie o processo para carregar as rotas novas. Use somente preferências sintéticas nesta stack: testes de integração limpam suas linhas singleton.

## Cache remoto de texto e logs (C23)

- POST `/api/v1/downloads/{novel_id}/{chapter}`: gera texto da fonte ativa se ainda não estiver em cache; retorna status ok/cache. Requer chapter_url_pattern na fonte e bucket privado previamente configurado.
- GET `/api/v1/downloads/{novel_id}` e GET `/api/v1/downloads/{novel_id}/{chapter}/text`: listam capítulos e leem texto já salvo.
- DELETE nesses mesmos recursos remove capítulo/obra do cache remoto, sem jobs ou áudio.
- GET `/api/v1/logs`: últimas 500 mensagens de processo em memória; GET `/api/v1/status`: disponibilidade da API, sem probe Redis ou observabilidade comercial.

A integração cria seu próprio bucket privado aleatório e o remove ao final. O bucket de uso manual deve ser criado privadamente, aceitando application/json, e indicado por VOXNOVEL_SUPABASE_TEXT_BUCKET. Os arquivos conservam cap/texto no Storage; a API de leitura retorna chapter/text. Não há migração de dados pessoais. C24 preserva IDs reais em URLs RoyalRoad já resolvidas. Na geração remota, chapter é o índice sequencial (base 1) e chapter_ids fornece o ID real; o arquivo de cache continua identificado pelo índice lógico. Fontes sem IDs usam seu padrão sequencial.

## Limites de C25 e evidência do bloco

A API padrão usa bind local, CORS explícito, processamento concorrente limitado e prazo de espera. Sobrecarga retorna indisponibilidade; o status permanece independente do processamento de conteúdo. Corpos grandes retornam 413. Texto/normalização, quantidade/tamanho de filtros, regex, persistência e tradução têm limites em core/config.py e .env.example. Access log de query strings fica desativado por padrão; falhas inesperadas retornam erro genérico e somente eventos fixos entram no buffer.

F3 foi verificado com banco/Storage locais reais e corpus sintético para fontes/tradução. Isso não certifica layouts atuais de sites nem sucesso em qualquer desafio Cloudflare. A validação final de paridade e testes físicos de voz permanecem nas fases posteriores. Não há APK novo validado neste bloco.

A stack local pode permanecer ativa para teste manual. Para encerrá-la, consulte `npx --yes supabase@3 stop --help` e use `--workdir "$STACK_DIR"` com o project-id daquela stack. Preserve os volumes e evite --all/--no-backup para não afetar outras instâncias ou apagar dados.
