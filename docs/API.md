# API local em construção — F3

C21 disponibiliza biblioteca, fontes, progresso, identificação/busca e utilitários de URL em `/api/v1`. Não há ainda interface funcional de leitura no Expo. As rotas seguintes entram nos commits restantes de F3. Use somente dados sintéticos na stack descartável; projetos pessoais não são bancos de teste.

## Rodar com a stack descartável já iniciada

Na raiz do repositório, defina STACK_DIR como o diretório privado da stack local saudável. As migrations de biblioteca e preferências devem estar aplicadas. O comando consulta apenas status local, valida loopback e passa credenciais por ambiente sem imprimi-las:

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
