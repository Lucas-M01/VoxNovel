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

## ADR-006 — Autorizar bloco F3

- Data: 2026-11-18.
- Estado: aprovado explicitamente pelo dono: “Pode prosseguir”, em resposta ao portão F2.
- Decisão: executar C15–C25, com rede protegida antes de expor scraping; encerrar no portão F3 com evidências, log e tag.
- Limites: manter paridade e avisar quando houver fluxo funcional executável, com comandos. F4, deploy, push e importação pessoal continuam sujeitos aos respectivos portões.

## ADR-007 — Autorizar bloco F4 e registrar hardware disponível

- Data: 2026-11-20.
- Estado: aprovado explicitamente pelo dono: “pode prosseguir”, após o portão F3.
- Decisão: executar C26–C31 e preparar S1 em harness privado. O dono informou “Somente Android” como aparelho físico disponível.
- Limites: iOS físico permanece pendente, sem dispensa automática. Concluir trabalho independente e registrar evidências antes do portão F4; não afirmar background validado sem teste. Avisar quando houver fluxo mobile executável. Sem autorização para F5, push, deploy ou importação pessoal.

## ADR-008 — Fechar F4 com limites físicos e autorizar F5

- Data: 2026-11-20.
- Estado: aprovado explicitamente pelo dono: “Aprovar avanço com limites registrados (recomendado)”.
- Evidência: relato de sucesso no POCO X5, voz pt-br-x-ptd-local (Enhanced), para os controles, avanço ao capítulo 2, troca de app e bloqueio de tela perguntados; detalhes em S1.md.
- Decisão: aceitar essa evidência parcial para fechar F4 e executar C32–C39 (F5). Dispensar os testes físicos restantes como impedimento deste portão, mantendo-os pendentes de validação: iOS, interrupções, voz sem rede/sem PT, saída da tela e duração de dois capítulos por condição de background/bloqueio.
- Limites: não declarar esses cenários aprovados nem paridade completa. Versão Android/motor/ambiente de execução ainda não informados. Bloqueios reais de fonte/tradução continuam abertos; nenhuma troca de motor foi autorizada. Ao fim de F5, repetir o portão do plano. Sem autorização automática para F6, push, deploy ou importação pessoal.

## ADR-009 — Autorizar F6 com foco em uso e apresentação

- Data: 2026-11-20.
- Estado: aprovado pelo dono: “Tá bom pode prosseguir”, após explicar o fechamento F5 e a integração/acabamento básico pendentes.
- Decisão: executar C40–C45 e integrar as jornadas de paridade com visual simples e consistente, adequado para uso e demonstração. Priorizar o necessário; melhorias adicionais ficam para depois.
- Limites: não amplia funcionalidades, não autoriza publicação/push/deploy nem importação pessoal. Tradução externa e limites físicos continuam pendentes. Ao fim de F6, suíte, documentos, tag/log e parada para aprovação da Fase 4.

## ADR-010 — Iniciar a validação final

- Data: 2026-11-20.
- Estado: aprovado pelo dono: “Comece a Fase 4”.
- Decisão: executar a validação P01–P35, comparar comportamento observado com evidências, corrigir impedimentos em commits próprios e preparar MELHORIAS/README/C46. Manter foco no necessário para uso e portfólio.
- Evidência física: o dono respondeu “Ainda não testei” para o aplicativo principal integrado. O teste S1 anterior não substitui esta jornada. Registrar os cenários ausentes, sem certificá-los ou repetir a dispensa de ADR-008.
- Limites: sem publicação, deploy, importação pessoal, troca de motor ou funcionalidades novas. Fonte/tradução externas continuam sem comprovação de sucesso completo.

## ADR-011 — Priorizar provedores operacionais na versão inicial

- Data: 2026-11-20.
- Estado: aprovado explicitamente pelo dono: o original funcionava apenas com FreeWebNovel; os outros apresentavam erros possivelmente associados a Cloudflare. Autorizou manter apenas FreeWebNovel ou os provedores que funcionarem, se os demais não puderem ser recuperados.
- Decisão: priorizar o caso FreeWebNovel na validação real; outros provedores indisponíveis não impedem uma versão inicial limitada e não serão anunciados como validados. Manter evidência separada por provedor; não remover adaptadores funcionais apenas por ausência de teste atual.
- Limites: a hipótese Cloudflare não é causa comprovada para todos os sites. A autorização não elimina a pendência de acesso ao próprio FreeWebNovel, não autoriza troca de tradutor nem contorno de desafios. Redução visível de suporte será registrada caso efetivamente necessária.

## ADR-012 — Manter tradução gratuita e avaliar substituição

- Data: 2026-11-21.
- Estado: custo zero obrigatório; Azure F0 aprovado anteriormente e depois descartado por exigir cartão no cadastro. Alternativa local ainda não adotada.
- Resposta explícita do dono: “Manter gratuito; investigar outra alternativa”. Não autoriza Google Cloud pago, habilitar billing ou contratar serviços.
- Evidência: controle sintético com o GoogleTranslator/configuração atual retornou redirect para página de limitação e HTTP 429. O fallback por bloco mantém o original. Diagnóstico corrigido com razões fixas no terminal/buffer, sem texto, URL, chave ou traceback. Isso não restaura tradução externa.
- Pesquisa: [MyMemory](https://mymemory.translated.net/doc/usagelimits.php) limita uso anônimo a 5.000 caracteres/dia, insuficiente para o capítulo de referência. O antigo [DeepL API Free](https://support.deepl.com/hc/en-us/articles/360021200939-DeepL-API-plans) não está mais disponível para novas adesões; o plano Developer descrito é uma franquia total, sem renovação mensal.
- Proposta simples: trocar somente o adaptador de tradução por Azure Translator no plano F0, mantendo auto→PT, blocos de 4.500, budgets e fallback. Chave privada exclusivamente no backend; sem UI, banco ou biblioteca nova planejada. Requer conta/subscrição Azure e recurso F0 do dono, ainda não criado nem acessado. Segundo [preços oficiais](https://azure.microsoft.com/en-us/pricing/details/translator/), F0 inclui 2 milhões de caracteres/mês; a [FAQ oficial](https://www.microsoft.com/en-us/translator/business/faq/) informa que o serviço para ao atingir a franquia. Não migrar para S1/planos pagos.
- Alternativa local: [LibreTranslate/Argos](https://docs.libretranslate.com/) evita serviço de tradução cobrado, mas exige modelos e processamento locais; dependências, consumo e qualidade EN→PT ainda não medidos. Não instalado e sem Docker de produto autorizado. Não presumir paridade de qualidade/detecção sem teste.
- Aprovação concreta: dono respondeu “Aprovar Azure Translator F0 (recomendado)”. Implementar somente o adaptador Azure F0 em commit separado do diagnóstico; manter blocos/budgets/fallback. Não implementar alternativa local, fallback entre provedores ou provisionamento automaticamente. Configuração prevista: VOXNOVEL_AZURE_TRANSLATION_KEY e região opcional no .env backend; chave solicitada apenas no arquivo privado, nunca no chat. Sem chave de teste, nenhum resultado Azure real foi comprovado; a Fase 4 permanece aberta para P15.

## ADR-013 — Usar a interface do protótipo como referência do mobile

- Data: 2026-11-21.
- Decisão do dono: o front-end deve ficar fiel ao original. Melhorias são bem-vindas, com visibilidade para o dono.
- Aplicação nesta rodada: recuperar a composição das telas e a arte original de abertura, mantendo os fluxos do checklist. O atalho para Filtros continua acessível na biblioteca, como na reconstrução. Alguns ícones foram representados por símbolos nativos com rótulos de acessibilidade.
- Para propostas futuras que mudem a aparência fora da referência ou alterem a jornada, apresentar a diferença e o motivo ao dono antes de aplicar, conforme AGENTS.md.

- Atualização do dono: Azure exige cartão e ele não possui; solicitou alternativa e perguntou o impacto no deploy. A integração Azure em preparação foi retirada antes de qualquer commit/chamada remota. Somente os arquivos deste trabalho foram restaurados a partir do index; .env e mudanças do dono preservados. Protótipo descartado ficou temporário fora do produto, sem dependências novas.
- Proposta local revisada: Argos como biblioteca Python no backend pode dispensar serviço HTTP/Docker adicional e cartão, mas requer modelo, CPU/RAM e avaliação de qualidade/idiomas. Deploy precisa acomodar esses recursos; não prometer hospedagem gratuita nem instalar modelos antes de medir/decidir. A implementação de produto continua GoogleTranslator; diagnóstico seguro permanece preparado.

## ADR-013 — Prosseguir com avaliação local sem cartão

- Data: 2026-11-21.
- Estado: autorizado pelo dono ao discutir deploy: “Qual dessas poderia me garantir um deploy, caso não tenha como pode prosseguir”. Mantidas as restrições explícitas de custo zero e ausência de cartão; não prometer hospedagem gratuita permanente.
- Decisão: medir tradução local inglês→português brasileiro em CPU com modelo oficial Argos en→pb, em ambiente isolado. Priorizar runtime CTranslate2/SentencePiece sem GPU ou servidor extra, evitando a cadeia PyTorch/Stanza do pacote Argos estável. Medir qualidade, tempo e RAM antes de integrar; registrar limites de idiomas e recursos. Não criar conta, publicar ou contratar hospedagem.
- Evidência de pesquisa: pacote Argos 1.11.0 requer Stanza 1.10.1; modelo en_pb 1.9 oficial tem 66.179.201 bytes compactados. HEAD retornou 403, GET Range padrão retornou 206/ZIP. Controle de API web Google sem chave também retornou 429; não repetir tentativas em lote.
- Deploy: backend persistente com modelo é tecnicamente publicável, sujeito aos recursos medidos e às regras do host. A documentação atual de Spaces informa que criar Gradio/Docker exige plano pago, apesar da CPU Basic sem preço por hora; não anunciar essa opção como gratuita para nova conta. Nenhum Docker de produto foi introduzido.

## ADR-014 — Escolher idioma original ou português em leitura e voz

- Data: 2026-11-21.
- Estado: ampliação de escopo solicitada explicitamente pelo dono: “Vou querer também a opção de ver pela a linguagem original ou traduzir”. Ao delimitar o alcance, escolheu “Leitura e voz (recomendado)”.
- Decisão: implementar seletor original/português na leitura e na fala, com modo levado de uma tela à outra, cache de memória isolado e cancelamento/descarte da sessão antiga ao mudar. Original mantém limpeza/filtros, mas não chama tradutor. O padrão continua traduzido para compatibilidade.
- Limites: downloads permanecem como hoje em português, sem apagar/regravar arquivos existentes ou introduzir downloads em dois idiomas. Original não deve consumir um arquivo traduzido; disponibilidade offline respeita a versão que existe. Sem novas contas, sincronização, estatísticas, interface de configuração ou redesign.
- Contrato: adicionar P36 como exceção explícita autorizada fora da paridade histórica P01–P35, e ampliar o plano com commits próprios. Não marcar legado como se já oferecesse o seletor.

- Resultado inicial do spike ADR-013: modelo oficial OPUS/Argos en_pb 1.9, CC-BY 4.0; 9.678 caracteres sintéticos em 27,70 s (beam 1/lote 8/uma thread), pico 322,72 MiB. Isso torna o deploy tecnicamente plausível com recursos adequados, sem garantir host gratuito ou velocidade em outro hardware. Ainda não houve tradução de capítulo real nem integração de produto.

- Resultado ADR-013 em 2026-11-21: runtime mínimo integrado com CTranslate2 4.9.0, SentencePiece 0.2.3 e langdetect 1.0.9. Modelo en_pb 1.9 pinado por SHA-256, instalação explícita/limitada, atribuição CC-BY 4.0 preservada. Sem PyTorch, GPU, serviço HTTP adicional ou download em requisição.
- Limite aceito para a alternativa local: somente inglês→PT-BR; português detectado passa intacto, outros idiomas/detecção incerta preservam o original com evento fixo. Google anterior fica somente como seleção explícita de configuração, sem fallback de rede automático. Nenhuma API paga foi introduzida.
- Evidência real API: original HTTP 200/11.327 caracteres em 1,44 s, modelo ainda não carregado; traduzido HTTP 200/11.695 caracteres em 11,06 s, detectado PT, zero fallbacks; pico do processo 322,72 MiB. Medição anterior de inferência isolada foi 19,03 s. Tempos dependem do host; não garantem hospedagem gratuita, qualidade literária nem execução Android.
- C48/C49: API c8fcd3f e mobile 3d0e10f implementam P36. Downloads preservados, cache de memória por modo e troca de voz interrompendo sessão antiga. Aceite físico do seletor/modelo pendente; Fase 4 continua aberta.

- Perfil local ajustado após teste de carga: duas vagas/espera 60 s retornaram ocupado sob cinco pedidos. Perfil de exemplo e .env privado agora usam cinco vagas, espera 60 s e bloco 90 s, mantendo um modelo serializado, limites de servidor e total de capítulo. Reteste com cinco traduções concluiu em 50,59 s totais, todas PT e zero fallbacks. Sem alterar grupos de cinco no app nem remover budgets.

## ADR-015 — Preferências locais e leitura após revisão no Android

- Data: 2026-11-21.
- Decisão do dono: retirar 2,25×, aproximar Personalização do original, melhorar a distribuição dos controles de leitura, mover o seletor de idioma, adicionar preferências de leitura e voz na biblioteca, revisar cartões de fontes e trocar o ícone de Continuar leitura.
- Implementação: Personalização no leitor reúne idioma, tipografia, espaçamento, largura, tema e rolagem. A biblioteca salva padrões de tipografia, rolagem, velocidade de voz e voz no aparelho mediante Salvar preferências. Ajustes da sessão do leitor/player permanecem possíveis. Valores anteriores acima de 2× ficam limitados a 2× ao usar o player.
- Downloads: biblioteca e tela de downloads consultam a mesma lista da fonte ativa. O detalhe mostra o total offline por fonte. Arquivos continuam vinculados às fontes conhecidas e a revisão não migra arquivos do formato sem identificação de fonte.

## ADR-016 — Estabilizar carregamento e revisar cartões e confirmações

- Data: 2026-11-21.
- Decisão do dono: evitar deslocamento dos controles enquanto o capítulo carrega, usar o mesmo estado de carregamento na biblioteca, dar destaque às confirmações de remoção e recuperar a aparência original dos cartões de fontes.
- Aplicação: carregamento inicial centralizado na biblioteca e no leitor; pré-carregamento ou atualização com dados em cache mantém o conteúdo disponível. Os modais de remoção usam rótulo e contorno vermelhos e apresentam Cancelar ao lado. Os cartões usam borda arredondada, faixa na cor da fonte e indicação visual separada da fonte ativa, preservando a contagem offline por fonte.

## ADR-017 — Ajustar leitura offline e indicar sites confirmados no cadastro

- Data: 2026-11-21.
- Decisão do dono: centralizar títulos da leitura e aviso offline, ocultar o aviso com os controles, retirar a mensagem sobre falha ao salvar progresso e indicar na tela Por URL os sites que permitem extração de capítulos.
- Aplicação: o leitor usa os títulos do texto quando identificados, com fallback para o nome cadastrado da obra e o número do capítulo. A gravação de progresso continua em segundo plano. A tela Por URL lista FreeWebNovel, a fonte com extração de capítulo real comprovada no projeto. As evidências dos demais provedores continuam em VALIDACAO.md e não foram elevadas a confirmação de extração.

## ADR-018 — CentralNovel, idiomas de voz e orientação horizontal

- Data: 2026-11-21.
- Decisão do dono: incluir CentralNovel após confirmar que a extração funcionou no aparelho, organizar a seleção de vozes em grupos expansíveis e adaptar o app ao modo horizontal.
- Aplicação: o player oferece Português e Inglês (Estados Unidos) primeiro, quando instalados. Outros idiomas instalados podem ser habilitados individualmente em Preferências → Ouvir. A seleção de voz padrão continua no mesmo menu. A ordem não altera a voz salva nem a troca de idioma do texto.
- Orientação: app sem trava de rotação e margens laterais de segurança. No modo horizontal, o leitor reserva mais altura para o texto, o player usa duas colunas quando há largura e os diálogos mantêm as ações fora da área rolável.

## ADR-019 — Simplificar o player e a biblioteca na horizontal

- Data: 2026-11-21.
- Decisão do dono: tirar a seção Detalhes da tela Ouvir e mostrar as obras em uma coluna quando o celular estiver deitado.
- Aplicação: na horizontal, a capa fica à esquerda e título, fonte e capítulo atual/total ficam ao lado. A orientação vertical continua com a grade de duas colunas. As mensagens de erro e o estado de reprodução continuam visíveis no player.

## ADR-020 — Usar português do Brasil no seletor padrão

- Data: 2026-11-21.
- Decisão do dono: o grupo de português do seletor do player deve mostrar apenas vozes brasileiras.
- Aplicação: Português (Brasil) e Inglês (Estados Unidos) são os grupos padrão. Outras variantes de português seguem o fluxo de idiomas extras em Preferências → Ouvir.


## Registro de aceite Android — 2026-11-21

- Após o roteiro final de tradução local, original/PT na leitura/voz, download novo/offline e visual, o dono respondeu: “Terminei e tá tudo certo agora”. Aceite funcional geral recebido; não inventar subresultados, versão do sistema ou voz atual.
- A pendência física de ADR-013/014 deixa de impedir o aceite funcional. Os limites de cenários não enumerados, idiomas e provedores permanecem documentados. Não solicitar novamente o teste geral aprovado.
- Revisões visuais ADR-015–020 permanecem sem commit; o fechamento formal/tag fase-4 aguarda consolidar a versão visual testada, preservando os arquivos externos de configuração/dependências. Este registro não publica, não faz deploy e não concede licença pública.


## Consolidação visual aprovada — 2026-11-21

- O dono informou: “Acredito que tá bom já a parte visual, pode prosseguir”. Autoriza consolidar as revisões ADR-015–020 no Git e concluir a Fase 4, mantendo o aceite funcional Android já recebido.
- Preferências locais de leitura/voz e idiomas extras entram como extensão P37 do contrato, rastreando as aprovações expressas já registradas em ADR-015/018/020. Limite de velocidade de 2× e retirada de Detalhes do player seguem as decisões do dono; não tratar esses desvios como comportamento do legado.
- O dono pediu capturas das telas funcionais para uso posterior. Capturas reais ficam inicialmente em diretório privado; não publicar biblioteca/progresso pessoal ou conteúdo de capítulos no Git. A disponibilidade do aparelho para ADB é uma condição da captura, sem alterar a aprovação funcional.
- docs/spec será preservada como referência histórica, com aviso e índice apontando para o escopo/estado reais. A pasta contém propostas além da entrega, sem transformá-las em tarefas novas. Nenhum push/deploy foi solicitado ou executado.


## Publicação com histórico inicial limpo e licença MIT — 2026-11-21

- O dono autorizou publicar a versão atual com um commit inicial limpo, preservando o histórico local. O histórico antigo do yarn.lock contém um caminho de máquina e não será enviado ao GitHub.
- Pedido expresso posterior: “Lembra de colocar a licença do MIT”. LICENSE passa a conter MIT, copyright 2026 Lucas Montenegro; metadados do código usam MIT. As licenças/atribuições dos ícones e do modelo permanecem próprias.
- Destino público: Lucas-M01/VoxNovel. Publicação feita por uma cópia isolada da árvore versionada, sem .env, modelos, capturas pessoais, _legacy ou alterações locais de dependências. O repositório original e suas tags permanecem preservados.
- Referências a commits antigos nos documentos descrevem o histórico local de reconstrução e não fazem parte da linha pública que começa nesta publicação. Não reescrever nem enviar o histórico original por engano.


## Integração do histórico completo — 2026-11-21

- Após ver apenas dois commits no GitHub, o dono solicitou todos os commits. Essa decisão substitui a opção anterior de publicar apenas o snapshot.
- Conferir uma cópia isolada do histórico, excluir checkpoints internos e preservar os 63 commits com seus hashes/mensagens/autores/datas. Incorporar na main por merge, preservando o repositório original e os dois commits públicos, sem force push.
- A árvore atual do código é igual à já validada; a integração altera somente a genealogia e a documentação. Referências documentais aos commits de desenvolvimento permanecem válidas com os hashes originais. Tags das fases foram importadas, com fase-4 histórica sob reconstrucao-fase-4 para não sobrescrever a tag pública existente.


### Correção da análise de caminho pessoal

A verificação final distinguiu refs internas de checkpoints da história de desenvolvimento. O caminho pessoal do yarn.lock existia somente em checkpoint refs/codex, não em commit alcançável pela main ou pelas tags das fases. Os 63 commits foram preservados inclusive com seus hashes originais; nenhuma substituição ocorreu nos commits. Checkpoints internos foram excluídos da cópia de publicação. Os registros anteriores que atribuíram o caminho ao histórico da branch refletem o diagnóstico inicial e ficam corrigidos por este registro.

## ADR-021 — Retornar do player à leitura e corrigir capítulos genéricos

- Data: 2026-11-22.
- Solicitação do dono: ao testar sua história publicada no GitHub Pages, relatou falta de acesso à leitura a partir do player e capítulos que repetiam a sinopse da página inicial.
- Aplicação: botão Ler capítulo encerra a sessão de fala antes de substituir a rota por leitura, preservando capítulo atual e modo original/traduzido. A identificação genérica infere o padrão de capítulos numerados em links do mesmo protocolo/domínio/porta, incluindo arquivos chapter-N.html. Links inválidos ou externos são ignorados; famílias ambíguas não geram um padrão por adivinhação. Não há domínio novo hardcoded nem dependência adicional.
- Capa: a página inicial publicada não contém imagem/og:image. O app conserva o placeholder. O autor pode publicar uma capa e indicá-la por og:image, já suportado, sem gerar/copiar imagens de terceiros.
- Cadastros existentes conservam os metadados antigos; é preciso atualizar a fonte pela busca por URL. Downloads antigos com a sinopse também precisam ser removidos e baixados novamente. Nenhum dado do dono é alterado automaticamente.

### Complemento de diagnóstico — 2026-11-22

- O dono reproduziu sinopse no cadastro pela página inicial e apenas dois capítulos no cadastro pelo primeiro capítulo. Consulta somente de leitura à API configurada confirmou que o processo em execução ainda devolvia chapter_url_pattern vazio para ambas as URLs, apesar do código local já corrigido. A fonte salva também conservava padrão vazio e total dois. É necessário reiniciar o backend e atualizar a fonte; não confundir o teste do código novo com o processo antigo em execução.
- A identificação a partir de chapter-N.html agora pode consultar um único link explícito para o índice da mesma pasta (Home/index.html). Só aproveita o índice se o padrão encontrado corresponder à família do capítulo informado. Isso permite recuperar total/título/capa da obra sem contar apenas os links Anterior/Próximo da página do capítulo. Sem crawling livre, domínio especial ou alteração das proteções HTTP/SSRF.
