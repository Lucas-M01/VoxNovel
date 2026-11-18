# Persistência — F2

C10: contratos de domínio com testes. C11: repositories e adaptador Supabase, com round-trip real validado em uma stack local descartável. O app ainda não tem rotas de biblioteca nem interface funcional de leitura; o primeiro fluxo disponível será avisado ao dono, com instruções.

Não usar projetos pessoais como ambiente de integração. O dono aprovou Docker apenas para testes locais descartáveis (ADR-005). A configuração e credenciais temporárias ficam fora do git. A stack não é vinculada a um projeto remoto.

O arquivo `apps/backend/src/repositories/fixtures/integration_schema.sql` é o baseline sintético de C11, aplicado somente no banco local descartável. Tabelas têm RLS habilitado e acesso de dados restrito ao service_role do backend. Não há login de usuário final. Migrações e testes de atomicidade pertencem a C12.

Com a stack local descartável já iniciada e o baseline aplicado, executar na raiz:

```sh
python3 scripts/check_integration.py --workdir DIRETORIO_DA_STACK
```

Para executar o gate completo com integração habilitada:

```sh
python3 scripts/check_integration.py --workdir DIRETORIO_DA_STACK --all-checks
```

O script consulta status local da CLI, verifica que a API é loopback e entrega as chaves apenas por ambiente ao processo filho. Não imprime chaves, não provisiona schema e não modifica projetos remotos. Configure Gitleaks no PATH ou por GITLEAKS_BIN para o gate completo.

A suíte comum sem configuração de persistência marca integração como não executada. Esse skip não fecha F2: o bloco exige execução real. Em C11 foram verificados criação/leitura, duplicatas normalizadas, atualização de fonte sem trocar ID, preservação de IDs RoyalRoad, troca/progresso por fonte, bloqueio da última remoção e exclusão com limpeza das fontes.

As consultas permanecem nos repositories e o SDK de rede no adaptador. O checker distingue o método HTTP `execute` do SDK de SQL: imports de clientes SQL e instruções SQL continuam proibidos fora dos repositories. Há testes para a distinção entre a ação textual `select` do protocolo e uma query SQL real.
