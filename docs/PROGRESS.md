# Progresso

- Atualizado: 2026-11-21.
- Estado: **Fase 4 concluída para a entrega Android aprovada pelo dono**. Após o
  reteste, informou “Terminei e tá tudo certo agora”; depois aprovou o visual e
  autorizou prosseguir. Nenhum novo teste geral do dono é exigido.
- Fechamento versionado: 571f398, tag fase-4. O registro documental de entrega
  das capturas acompanha este arquivo, sem alterar a versão funcional.
- Último commit de produto: **d63c677**, revisão visual/preferências ADR-015–020.
  Anteriores: d369bae (tradução local), 3d0e10f (P36 mobile), c8fcd3f (API original).
  O commit documental de fechamento contém este registro e recebe a tag fase-4.
- Capturas solicitadas: seis screenshots reais foram feitas pelo dono e copiadas
  do telefone por USB/MTP. Entregues com nomes e ZIP em diretório privado, fora do Git.
  Publicação GitHub autorizada com histórico inicial limpo; licença MIT escolhida
  expressamente. Deploy do app não foi solicitado.

## Entrega e evidência

| Área | Estado |
|---|---|
| Fases 1/2 | Análise e plano aprovados; contrato em ANALISE.md e decisões em DECISIONS.md. |
| Fase 3 | Blocos F1–F6 concluídos e aprovados; app integrado, sem importação pessoal. |
| Fase 4 | Auditoria/correções, documentação, reteste funcional e visual Android aprovados. |
| Backend | Ruff/format/mypy/arquitetura/compileall e 215 testes, incluindo 12 integrações reais locais. |
| Mobile | ESLint boundaries/20 casos, TypeScript, 29 suítes/233 testes e Hermes Android/iOS. |
| Segredos | Scanner staged e diff check aprovados antes dos commits; histórico conferido no fechamento. |

Logs privados do gate final: .private/quality/phase4-backend-final.log e
phase4-mobile-final.log. Integrações usam somente a stack local descartável,
com endpoints validados antes de qualquer escrita. Nenhum projeto remoto alterado.

## Decisões que definem a versão

- Priorizar FreeWebNovel e fontes operacionais (ADR-011). O dono também confirmou
  CentralNovel conforme ADR-018; não certificar todos os sites/capítulos.
- Tradução gratuita, sem cartão: Azure descartado; Google anterior recebeu HTTP
  429. Runtime local CTranslate2/SentencePiece/langdetect com Argos en_pb 1.9,
  instalador explícito pinado por SHA-256 e atribuição preservada (ADR-012/013).
  Inglês→PT-BR; português passa intacto; idiomas não suportados/falhas preservam
  original com evento fixo. Sem GPU/PyTorch/serviço adicional.
- P36: original/PT em leitura e voz, navegação e cache de memória separados;
  downloads existentes ficam no fluxo PT, sem regravação/migração (ADR-014).
- P37: preferências locais de leitura/voz e idiomas extras aprovados; player até
  2×, Personalização e horizontal conforme ADR-015–020. A retirada de Detalhes do
  player foi expressa; estado/frases/progresso continuam visíveis.
- API real do capítulo autorizado: original 200/11.327 caracteres em 1,44 s sem
  carregar modelo; PT 200/11.695 em 11,06 s, zero fallback; pico 322,72 MiB.
  Cinco traduções concorrentes passaram em 50,59 s totais no perfil documentado.
  Métricas são desse ambiente, sem garantir qualidade literária ou host gratuito.
- docs/spec preservada como planejamento histórico, identificada por avisos e
  índice. Não é lista de funcionalidades entregues nem de tarefas novas.

## Limites mantidos

- POCO X5 informado anteriormente. Aceite atual é geral: não inventar versão do
  Android, voz, duração, URL ou resultado individual não relatado. S1 anterior
  informou pt-br-x-ptd-local (Enhanced) com controles, avanço e troca/bloqueio;
  iOS, interrupções, duração e vozes ausentes permanecem sem certificação específica.
- Sem APK/IPA novo validado; spike Android encontrou limitação Maven. Bundles
  Hermes/Jest não substituem esse build. Nenhum CI remoto usado como evidência.
- Sem auth novo, jobs duráveis, voz paga, publicação/deploy ou importação pessoal.
  Documentação final: README, VALIDACAO.md, MELHORIAS.md e TRADUCAO.md.
- package.json/yarn.lock modificados e package-lock.json externo foram preservados
  fora dos commits da entrega. Não declarar o working tree inteiro limpo ou o
  wrapper global de candidatos aprovado: o lockfile local tinha caminho de máquina.
  A entrega versionada usa o manifesto/lockfile já existente, sem novas bibliotecas
  visuais. .env, modelos, logs, screenshots privados e _legacy seguem ignorados.

## Continuidade

Ler AGENTS.md e este registro em nova sessão. Não reabrir aprovações recebidas
nem marcar cenários ausentes como executados. As capturas solicitadas foram entregues em .private/screenshots/2026-11-21,
com seis imagens nomeadas, originais preservados e capturas-voxnovel.zip.
Conferência visual e SHA-256 confirmaram a cópia sem edição. Conjunto: biblioteca,
detalhe, player, leitura com controles, leitura imersiva e Personalização;
busca/downloads não estão neste conjunto. Nada foi publicado ou incluído no Git.

O ADB não expôs dispositivo, apesar da autorização relatada; o dono escolheu
capturar manualmente e copiar por USB. O MTP inicialmente veio vazio, depois o
armazenamento ficou disponível. Copiados somente screenshots de hoje do Expo;
fotos/capturas de outros aplicativos não foram copiadas. Diagnósticos com dados
do dispositivo ficam privados. Não publicar capturas pessoais automaticamente.


## Publicação GitHub autorizada — 2026-11-21

- O dono escolheu publicar a versão atual com commit inicial limpo e preservar
  o histórico local. Depois escolheu MIT expressamente; LICENSE e metadados
  passam a refletir essa decisão, sem mudar licenças de terceiros.
- Destino público: Lucas-M01/VoxNovel. A versão atual passou na conferência dos
  arquivos versionados e Gitleaks; o histórico antigo contém caminho pessoal
  no yarn.lock e não será enviado.
- A publicação usa cópia isolada em .private/github-publication/source. Não
  copiar .env, modelos, screenshots pessoais, _legacy ou alterações locais de
  package.json/yarn.lock/package-lock.json. Referências a commits antigos nos
  documentos são do histórico de reconstrução preservado localmente.
- Repositório de destino: https://github.com/Lucas-M01/VoxNovel.
  Esta linha pública inicia com o snapshot aprovado, sob MIT, na branch main;
  a verificação do primeiro envio/CI faz parte da publicação.
  Nunca ligar a branch original diretamente à nova main pública: seus históricos
  são diferentes e o push do original exporia o caminho histórico.


## Continuidade da linha pública

Trabalhar em clones desta linha para os próximos commits públicos. Não enviar
as refs de reconstrução local: elas foram preservadas separadamente por escolha
do dono. Números de commits e tags históricos nos documentos são referências de
análise/execução, não commits incluídos nesta linha pública inicial.
