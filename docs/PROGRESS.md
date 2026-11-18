# Progresso

- Atualizado: 2026-11-18.
- Fase atual: Fase 3 — bloco F2 (C10–C14), autorizado e em execução.
- Último marco: C10 (contratos de obra/fonte/progresso), HEAD após este registro. Fundação em 331c7c9/tag fase-3-f1. C11–C14 ainda pendentes.
- Autorização: dono aprovou o plano (“Aprovo o plano para iniciar”) e reiterou “Pode continuar”; depois autorizou C10–C14 e solicitou aviso quando houver fluxo funcional testável. Docker local descartável para integração aprovado explicitamente (ADR-005).
- Entregue: higiene/licença sem concessão pública, specs/decisões/plano versionados, base FastAPI com config por ambiente e erros tipados, base Expo Router/TS strict, aliases, boundaries/regras de hooks e lint testadas, lockfiles, scripts comuns e CI mínimo. Nenhuma função extra da WBS, acesso Supabase ou migração pessoal.
- Gate C10: 33 testes backend; Ruff/mypy/checker AST/compileall; 20 casos das regras de lint mobile; tsc/Jest; exportação Hermes Android e iOS; Gitleaks de candidatos e histórico, com valores redigidos. A tag só é criada depois de todos esses checks passarem. Workflows tiveram YAML e shell verificados localmente; CI remoto não foi executado.
- S2: prebuild Android concluído. assembleDebug executou 63 tarefas e falhou ao obter dependências do Maven Central por erro de resolução de rede (ADR-004). Sem APK validado; limitação explicitada conforme autorização do portão F1 no plano. Não trocar SDK/motor por esse erro ambiental.
- Pendências: repetir compilação Android quando Maven estiver acessível; iOS nativo requer ambiente Apple; aparelhos Android/iOS ainda não informados para S1 de voz/background em F4. Licença pública continua não escolhida; integração Supabase exige ambiente descartável em F2, nunca o projeto pessoal como banco de teste.
- Próximo item: C11 (repositories e integração), depois C12–C14; não fechar F2 sem integração real. Stack Supabase sendo iniciada em diretório privado temporário, sem vínculo remoto. Avisar o dono assim que houver um fluxo funcional testável, com comandos.
- Continuidade: consultar AGENTS.md e este arquivo. FUNDACAO.md contém instalação, matriz de versões e limites. WBS_STATUS diferencia fundação adaptada de pacotes completos; P01–P35 continuam sem validação final de paridade. `_legacy/` permanece ignorado e somente leitura; hashes conferidos sem copiar conteúdo pessoal ao git.
