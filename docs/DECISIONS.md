# Decisões

## ADR-001 — Paridade prevalece sobre WBS completo

- Data: 2026-11-18.
- Estado: aprovado explicitamente pelo dono nesta sessão.
- Contexto: anexo propõe WBS-S F1–F6 completo; AGENTS.md restringe a funcionalidades presentes no protótipo.
- Resposta: “Manter paridade do AGENTS.md (recomendado)”.
- Decisão: checklist de ANALISE.md será contrato após aprovação; specs orientam estrutura e convenções. Login, glossário, stats e demais acréscimos não estão autorizados.
- Consequência: Supabase, speech, múltiplas fontes e downloads já encontrados devem ser analisados como capacidades existentes; não restaurar Piper com base em README desatualizado.

## ADR-002 — Aprovar análise e propostas padrão

- Data: 2026-11-18.
- Estado: aprovado pelo dono ao responder à entrega da Fase 1: “Aprovado pode prosseguir, pode usar o plugin do context7 se necessário”.
- Decisão: ANALISE.md é o contrato de paridade aprovado. Aceitar propostas padrão Q2–Q4 apresentadas junto da entrega: corrigir IDs RoyalRoad, capítulo escolhido no player e cache por fonte em commits de melhoria; preservar diferenças atuais de limpeza visual/fala; preservar capacidades de config/logs/downloads/filtros, com API EN em `/api/v1`, sem compatibilidade literal PT e sem debug.
- Limites: não foi aprovada uma unificação semântica de filtros, troca de motor, login ou ampliação para WBS-S completo. Correções devem ter testes de regressão e permanecer separadas da reconstrução.
- Q5: nenhum aparelho foi informado. Validação física Android/iOS e background continua pendente; aprovação da análise não é evidência de teste nem dispensa.
- Próxima etapa autorizada: elaborar o plano da Fase 2. A Fase 3 depende de aprovação do plano concreto, conforme AGENTS.md §7.
- Context7: uso autorizado para documentação quando necessário; não autoriza acrescentar dependências fora da paridade.

## Propostas técnicas em revisão

As escolhas de implementação, divisão de commits e tags constam de PLANO_COMMITS.md e aguardam aprovação desse plano. C1–C18 da análise orientam essas propostas; nenhuma infraestrutura nova foi provisionada. A licença pública ainda não foi escolhida; não atribuir uma automaticamente. Não houve troca de motor, implantação, acesso remoto ou migração de dados.

## ADR-003 — Aprovar execução do bloco de fundação

- Data: 2026-11-18.
- Estado: aprovado explicitamente pelo dono: “Aprovo o plano para iniciar”.
- Decisão: PLANO_COMMITS.md aprovado; executar C01–C09 e parar no portão F1.
- Limites: nenhuma autorização automática para C10 em diante, deploy, push ou importação pessoal. Licença pública continua não escolhida; manter aviso sem concessão. Validação física de voz continua pendente.

## ADR-004 — Registrar limite ambiental do spike nativo S2

- Data: 2026-11-18.
- Estado: registro de evidência, sem alteração de arquitetura/produto.
- Resultado: prebuild Android e exportação Hermes Android/iOS concluídos. assembleDebug com Java 21/Gradle 9.4.1 executou 63 tarefas, mas falhou ao baixar artefatos do Maven Central por erro de resolução de rede. Nenhum APK ou execução física está aprovado.
- Tratamento: usar a exceção explícita do portão F1 no plano aprovado (“S2 executado ou limitação explicitada”). Não trocar SDK/motor por causa dessa indisponibilidade. Repetir build nativo quando a rede permitir, antes de afirmar validação nativa; iOS depende de ambiente Apple.
- Não há dispensa de S1 físico em F4 nem autorização para avançar ao bloco F2 automaticamente.

## ADR-005 — Autorizar bloco F2 e ambiente local de integração

- Data: 2026-11-18.
- Estado: aprovado pelo dono: “Pode continuar, mas quando já for testável avisa que eu vou querer rodar”.
- Decisão: executar C10–C14 e avisar assim que existir fluxo funcional testável, com instruções de execução. A base atual inicia FastAPI/Expo, mas ainda não oferece o fluxo do leitor.
- Ambiente: o dono aprovou explicitamente “Aprovar stack local descartável (recomendado)” para integração via Docker. Uso restrito a testes; sem provisionar/alterar projetos Supabase existentes.
- Limites: o bloco F2 mantém seu portão; mocks não substituem integração real.
