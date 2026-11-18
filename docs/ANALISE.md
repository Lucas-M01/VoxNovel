# Fase 1 — Análise do protótipo

Data: 2026-11-18. Estado: **análise aprovada pelo dono**. Propostas padrão Q2–Q4 aceitas; aparelhos de Q5 ainda não informados. Aprovação e limites registrados em DECISIONS.md (ADR-002).

## 1. Escopo e método

O dono confirmou nesta sessão: **manter a paridade do AGENTS.md**, em vez de implementar todo o WBS-S do anexo. A WBS orienta estrutura e nomes; não autoriza funcionalidades. Nenhum código de produto, importador, commit ou tag foi criado nesta fase.

Análise estática dos arquivos fornecidos. Não executamos o app, acessamos o backend publicado, consultamos Supabase remoto ou abrimos os conteúdos pessoais de `progresso.json` e `filtros.json`. O inventário completo de caminhos está no apêndice. Evidência de código indica intenção e conexão entre componentes, não comprova execução em dispositivos. Todos os itens de paridade continuam pendentes de validação dinâmica na Fase 4.

**A fotografia fornecida difere da descrição da missão:** TTS já é local via `expo-speech`; o backend não possui `services/tts.py` nem rota `/audio/gerar`; Supabase já é usado para dados e texto no Storage. Há múltiplas fontes, downloads em lote e uso offline. Esses recursos entram por evidência do código, mesmo quando aparecem como exemplos de exclusão no AGENTS.md, cuja ressalva é “a menos que o protótipo já tenha”. Não há login de usuário final, glossário ou estatísticas.

## 2. Inventário e fluxos

### 2.1 Backend

| Arquivo/grupo em `_legacy/backend/` | Responsabilidade e evidência |
|---|---|
| `main.py` | FastAPI; sete routers; CORS aberto; endpoint raiz de disponibilidade |
| `models.py` e `models/__init__.py` | Definições Pydantic duplicadas: Obra, Fonte, filtros, config e requests; coexistem módulo e pacote `models` |
| `routers/obras.py`, `services/progresso.py` | CRUD de obras/fontes, slug normalizado, fonte ativa, progresso por fonte; consultas Supabase |
| `routers/novel.py`, `services/novel_meta.py` | Metadados por URL, busca por nome, montagem/detecção de capítulo; quatro rotas de debug |
| `routers/audio.py`, `services/scraper.py` | Somente texto: URL → HTML → limpeza → filtros → tradução PT |
| `routers/filtros.py`, `services/filtros.py` | Listar/substituir/adicionar/remover/limpar palavras, frases e regex globais |
| `services/texto.py`, `homoglifos.py`, `marca_dagua.py` | Limpeza compartilhada, normalização Unicode e remoção de marcas d'água |
| `routers/config.py`, `services/config_service.py` | Velocidade padrão, uma linha na tabela config |
| `routers/downloads.py`, `storage_service.py`, `processing_lock.py` | Cache de texto JSON no Storage; lock de processo apenas nesse pipeline |
| `routers/logs.py`, `logger_buffer.py` | Últimas 500 mensagens em memória, horário e console |
| `services/supabase_client.py` | Cliente compartilhado; URL/key/bucket por ambiente; key de servidor |
| `requirements.txt`, Dockerfile, compose | Dependências e execução do protótipo; não autorizam replicar infraestrutura automaticamente |
| `progresso.json`, `filtros.json` | Artefatos pessoais locais antigos; serviços atuais não os usam como persistência ativa |

O README do backend cita `supabase/schema.sql` e `.env.example`, mas esses arquivos não estão na fotografia fornecida. O README raiz ainda descreve Piper/WAV e não representa o fluxo atual.

### 2.2 Endpoints realmente declarados

Prefixos confirmados em `main.py`; métodos extraídos dos decorators, sem importar módulos do legado.

| Métodos | Caminho completo | Finalidade |
|---|---|---|
| GET | `/` | Status da API |
| GET, POST | `/obras/` | Listar/criar |
| GET | `/obras/detectar-capitulo` | Número por regex |
| GET, DELETE | `/obras/{obra_id}` | Obter/remover |
| PATCH | `/obras/{obra_id}/pagina` | Progresso |
| POST | `/obras/{obra_id}/fontes` | Adicionar/atualizar fonte |
| PATCH | `/obras/{obra_id}/fonte-ativa` | Ativar fonte |
| DELETE | `/obras/{obra_id}/fontes/{fonte_id}` | Remover fonte, preservando pelo menos uma |
| GET | `/audio/texto` | Texto filtrado e traduzido; parâmetros url e pagina |
| GET, PUT | `/config/` | Velocidade |
| GET, PUT | `/filtros/` | Ler/substituir listas |
| POST, DELETE | `/filtros/termo` | Tipo explícito palavra/frase/regex |
| POST, DELETE | `/filtros/palavra`, `/filtros/regex` | Compatibilidade antiga |
| DELETE | `/filtros/limpar` | Esvaziar, sem restaurar padrões |
| GET | `/logs/` | Buffer de logs |
| GET | `/novel/meta`, `/novel/buscar-por-nome` | Identificação e busca |
| GET | `/novel/chapter-url`, `/novel/chapter-num` | Utilitários de URL |
| GET | `/novel/debug-novelfire`, `/novel/debug-novelfire-html`, `/novel/debug-novelfire-caps`, `/novel/debug-cap` | Diagnóstico de rede/HTML, sem uso no fluxo normal do app |
| POST, DELETE | `/downloads/{obra_id}/{cap}` | Gerar cache remoto de texto/remover |
| GET, DELETE | `/downloads/{obra_id}` | Listar/remover cache remoto da obra |
| GET | `/downloads/{obra_id}/{cap}/texto` | Ler cache remoto |

São 35 operações nos routers e uma na raiz, além da documentação automática do FastAPI. `gerarAudio` e `getAudioOfflineUrl` em `api.js` apontam para rotas inexistentes e não são usadas pelas telas atuais. Contrato de produto não inclui reconstruir esses resíduos. A manutenção dos endpoints remotos de download e logs é proposta na seção 10.

### 2.3 Mobile e telas

`App.js` raiz reexporta `src/App.js`; `index.js` registra o app. Stack React Navigation, splash temporizado em 1,5 s e sete rotas.

| Tela em `_legacy/leitor-app/src/screens/` | Comportamento |
|---|---|
| SplashScreen | Marca inicial temporizada |
| HomeScreen | Biblioteca por capítulo atual decrescente, capas, progresso, badges offline, atualização ao focar/pull-to-refresh, cache local e confirmação de exclusão |
| NovaObraScreen | Busca por nome ou URL, metadados, seleção de fontes, capítulo inicial, duplicata por slug normalizado e inclusão de fonte na obra existente |
| ObraScreen | Detalhe, fonte ativa, trocar/remover fonte, editar capítulo, abrir texto/player/downloads, excluir obra |
| LeituraScreen | Texto, título, parágrafos, diálogo destacado, capítulo anterior/próximo/seleção, controles ocultáveis, temas, tipografia, largura/espaçamento e rolagem automática |
| LeitorScreen | Fala nativa por frase, progresso, play/pause, capítulo anterior/próximo/seleção, velocidade e lista de vozes agrupadas por idioma, painel de status/log |
| DownloadsScreen | Listar textos locais, baixar capítulo/faixa, erros individuais, remover com confirmação, abrir leitura ou escuta |

Componentes: `ui/Modal.js`, `ui/ErrorText.js`, `nova-obra/DuplicataModal.js`, `obra/FonteCard.js`. Serviços: `api.js` (HTTP), `providers.js` (metadados), `localStorage.js` (arquivos locais), `ttsLocal.js` (fala).

### 2.4 Persistência

| Dado | Onde e como |
|---|---|
| Obras/fontes/progresso | Supabase tabelas `obras`/`fontes`; atualização de página altera obra e fonte ativa, sem transação única no código |
| Troca de fonte | Restaura `pagina_atual` daquela fonte; **não** calcula equivalência percentual. Total da obra é recalculado pelo máximo entre fontes |
| Filtros | Supabase `filtros`, linha id=1, arrays palavras/frases/regex; fallback para padrões se falhar |
| Config | Supabase `config`, linha id=1, velocidade padrão 1,5 |
| Texto remoto | Bucket configurável, `{obra_id}/cap_{cap}.json`; cache usado pelo router downloads |
| Texto local | `documentDirectory/downloads/{obraId}/cap_{cap}.json`, `{cap,texto}`; leitura/escuta priorizam disco e depois HTTP |
| Biblioteca offline | `documentDirectory/cache_obras.json`, última lista recebida e instante de gravação |
| Prefetch | Mapas em memória por capítulo; não equivalem a download persistente |
| Voz/velocidade escolhida na tela | Estado do player; velocidade inicial vem da config, mas tela não chama salvarConfig; voz não persiste |
| Tema/fonte/espaçamento/largura/autoscroll | Estado da tela; sem gravação durável encontrada |
| Scroll/frase atual offline | Memória; não há fila durável para enviar progresso depois nem retomada fina após reiniciar |
| Logs | deque de 500 entradas no processo; perdem-se ao reiniciar |

Não há evidência de sincronização de contas/dispositivos: persistência central no backend não deve ser confundida com essa funcionalidade.

### 2.5 Scraping, filtros, tradução, capítulos e voz

1. Metadados: parsers para FreeWebNovel, CentralNovel, NovelFire e RoyalRoad; fallback genérico. Busca por nome tenta slugs em FreeWebNovel/CentralNovel; não é busca global. Não há templates ou seletor manual na UI.
2. Transporte: requests com retry; cloudscraper para NovelFire; curl_cffi com impersonação para RoyalRoad. Comentários alegam resolver desafios, mas sucesso não foi validado. Remoção de elementos HTML, procura article/main/content e coleta de parágrafos; título composto quando possível.
3. Filtros do backend: normaliza homóglifos; palavras/frases removem **linhas inteiras por substring**, sem distinguir maiúsculas; regex faz substituição por vazio. Limpeza remove marcas d'água, rodapés, títulos repetidos e duplicatas consecutivas. Aplicação antes da tradução; cache de download guarda resultado processado.
4. Tradução: `deep_translator.GoogleTranslator(source="auto", target="pt")`; blocos de 4.500 caracteres, pausa de 0,3 s entre chamadas; falha de um bloco conserva o original, podendo gerar texto misto. Nem MarianMT nem OpenAI estão implementados.
5. Leitor visual ainda executa `formatarTexto`: remove todas as linhas duplicadas, separadores e linhas contendo certos rodapés. A fala não usa esse segundo estágio. Unificar sem decidir a semântica muda conteúdo visível/audível.
6. Detecção: `extrair_capitulo` reconhece chapter/capitulo com hífen e retorna 1 no fallback; `get_chapter_num` também cobre chapter com barra. `montar_url_pagina` reescreve hífen/barra, query page ou acrescenta page. Parsers retornam `chapter_url_pattern`; RoyalRoad retorna IDs reais ordenados. Telas tentam usar `chapter_ids[cap-1]`.
7. Player: divide por pontuação em frases; onDone encadeia a próxima e onFim solicita capítulo N+1 até o total conhecido (fallback 9999). Pause é stop + retomada no começo da frase. Geração identifica callbacks antigos, mas interrupções assíncronas ainda precisam teste.
8. Leitura visual: prefetch N+1..N+3 ao carregar e nos limiares de scroll 80%/95%; **95% não navega automaticamente**. Rolagem automática é temporizador independente da voz. Navegação é pelos controles.

### 2.6 Dependências declaradas

Backend: FastAPI 0.115.0, uvicorn 0.30.6, Pydantic 2.9.2, supabase 2.9.1, python-dotenv 1.0.1, python-slugify 8.0.4, requests 2.32.3, bs4 4.12.3, lxml 5.3.0, deep-translator 1.11.4; cloudscraper/curl_cffi sem pin. Docker usa Python 3.11. Não há configuração pytest/ruff/mypy fornecida.

Mobile: Expo ~54.0.34, React 19.1.0, RN 0.81.5, navegação 7, NetInfo 11.4.1, expo-speech ~14.0.8, file-system ~19.0.23 (API legacy), expo-av ~16.0.8 e expo-audio ~1.1.1, assets/font/gradient/status-bar, screens/safe-area e dependências web. `package-lock.json` presente; não há scripts de lint/tipos/testes. Não há WatermelonDB, MMKV ou track-player. Presença de uma dependência não prova uso funcional.

## 3. Checklist de paridade funcional (contrato proposto)

Cada item deve receber evidência automatizada e/ou roteiro em dispositivo na validação. Caixas vazias significam **não reconstruído nem validado**. IDs WBS indicam destino parcial; não autorizam o restante do pacote. P32–P35 são capacidades de API existentes cuja preservação foi aceita na aprovação de Q4 (ADR-002), com rotas EN no produto reconstruído.

| Estado/ID | Critério verificável | Evidência no legado | Destino WBS / módulo |
|---|---|---|---|
| [ ] P01 | Splash e navegação entre biblioteca, detalhe, busca, leitura, player, filtros e downloads | src/App.js | 1.4.11, screens; 4.6.4 apenas para mocks de teste |
| [ ] P02 | Biblioteca lista capas, fonte/capítulo/progresso, ordena capítulo decrescente, atualiza e mostra vazio/erro | HomeScreen | 6.2.1, library |
| [ ] P03 | Reabrir biblioteca sem rede usa última lista e indica capítulos locais; exclusão exige rede | HomeScreen, localStorage | 6.2.1, 1.4.9 parcial (FileSystem); extensão cache offline |
| [ ] P04 | Buscar nome retorna fontes disponíveis em FreeWebNovel/CentralNovel, com seleção de uma ou mais | NovaObraScreen, novel_meta | 6.1.1–6.1.2; CentralNovel 3.3.12 antecipado por paridade |
| [ ] P05 | URL identifica metadados nos quatro sites conhecidos ou fallback genérico | novel_meta, providers | 3.3.4–3.3.7, 3.3.12, 6.1.4 |
| [ ] P06 | Criar obra com capítulo inicial válido e fontes; duplicata de slug permite abrir/adicionar fonte | NovaObraScreen, progresso | 2.1.3–2.1.4, 2.3.1–2.3.2, 3.7.1–3.7.2 |
| [ ] P07 | Detalhe mostra metadados e permite editar capítulo respeitando limites | ObraScreen | 6.2.3, novel-detail |
| [ ] P08 | Adicionar/atualizar/remover fonte; primeira é ativa, última não pode ser removida | progresso | 3.7.2, 6.2.2 parcial |
| [ ] P09 | Trocar fonte restaura o capítulo próprio dela, sem conversão percentual | progresso.trocar_fonte_ativa | 6.2.4 adaptado |
| [ ] P10 | Excluir obra com confirmação remove registro e suas fontes | Home/Obra, progresso | 3.7.1, 6.2.1 |
| [ ] P11 | Detecção e montagem de URL cobrem hífen/barra/query e fallback documentados | scraper, novel_meta | 3.3.1, 3.3.7, 3.7.2 |
| [ ] P12 | Identificação RoyalRoad disponibiliza lista ordenada de IDs; navegação preserva ID real conforme correção aprovada Q2 | novel_meta; montagem nas telas | 3.3.6, 6.1.4; ADR-002 |
| [ ] P13 | Scraping extrai título/corpo e remove elementos sem conteúdo; retries e erro de acesso claros | scraper | 3.3.1, 3.3.4–3.3.9 parciais |
| [ ] P14 | Limpeza remove marcas d'água/homóglifos/rodapés/títulos e duplicatas conforme estágios descritos | texto, marca_dagua, homoglifos | 3.2.1–3.2.3 |
| [ ] P15 | Texto é traduzido automaticamente para PT em blocos, fallback por bloco documentado | scraper.traduzir_texto | 3.4.1, 3.4.4 adaptados para GoogleTranslator |
| [ ] P16 | Gerenciar filtros globais por palavra/frase/regex, validar regex ao adicionar e remover tipo correto | FiltrosScreen, filtros | 2.1.9, 3.7.6, 5.4.1 parcial |
| [ ] P17 | Limpar todos deixa listas vazias; palavras/frases removem linha e regex remove trecho | filtros | 3.2.3, 3.7.6 |
| [ ] P18 | Ler texto/título/parágrafos e navegar capítulo anterior/próximo/escolhido com limites e mensagens | LeituraScreen | 5.1.1, 5.1.3, 5.1.5 |
| [ ] P19 | Leitura oferece tamanhos, famílias, temas escuro/preto/sépia/claro, espaçamento e largura | LeituraScreen | 5.1.3, 5.1.5 |
| [ ] P20 | Ocultar/exibir controles e ligar/desligar autoscroll com velocidades da tela | LeituraScreen | 5.1.4–5.1.5 adaptados |
| [ ] P21 | Prefetch silencioso de três capítulos em memória; chegar a 95% não troca capítulo | LeituraScreen | 5.1.6; 5.1.7 fora de escopo |
| [ ] P22 | Leitura e fala abrem texto baixado sem rede e indicam capítulo indisponível | Leitura/Leitor, localStorage | 1.4.9 parcial (FileSystem), 5.1.1, 5.2.1 |
| [ ] P23 | Fala nativa encadeia frases com progresso, play/pause/retomar; termina ao sair da tela | ttsLocal, LeitorScreen | 4.3.1–4.3.2, 5.2.1, 5.2.4 adaptados |
| [ ] P24 | Alterar velocidade/voz reinicia frase corrente; vozes agrupadas com prioridade PT-BR e fallback | ttsLocal, LeitorScreen | 5.2.5 e tts-service v2.2 |
| [ ] P25 | Fim da fala abre próximo capítulo; anterior/seleção respeitam disponibilidade e fim conhecido | LeitorScreen | 5.2.2, 5.2.4 |
| [ ] P26 | Carregar capítulo atualiza progresso da obra e fonte ativa; falha de gravação não esconde conteúdo | telas e progresso | 2.1.7, 3.7.1, 6.2.3 |
| [ ] P27 | Listar/baixar texto individual local, indicar erros e permitir nova tentativa | DownloadsScreen | 5.3.1–5.3.2 parciais |
| [ ] P28 | Baixar faixa de até 50, grupos de cinco, pula existentes e mostra progresso por tentativas | DownloadsScreen | 3.6.5/5.3.1–5.3.3 adaptados; sem novo serviço ARQ |
| [ ] P29 | Remover capítulo local com confirmação e tentar limpar cache remoto sem bloquear remoção local | DownloadsScreen | 5.3.1–5.3.2, 3.7.5 parciais |
| [ ] P30 | Abrir leitura/escuta a partir dos downloads no capítulo escolhido (correção aprovada Q2) | DownloadsScreen | 5.3.1, 5.2.4; ADR-002 |
| [ ] P31 | Exibir painel de status/log do player | LeitorScreen | 5.2.4; extensão de paridade, WBS sem pacote específico |
| [ ] P32 | API lista/substitui filtros e mantém operações antigas de termo/palavra/regex | routers/filtros | 3.7.6 |
| [ ] P33 | API lê/grava velocidade padrão; player usa configuração inicial | config_service, routers/config | 4.2.2 adaptado; extensão API config |
| [ ] P34 | API expõe últimas 500 mensagens sem persistência durável | routers/logs, logger_buffer | extensão API logs; sem item WBS específico |
| [ ] P35 | API gera/lista/lê/remove cache remoto de texto por capítulo e por obra | routers/downloads | 3.7.5 adaptado, sem jobs remotos novos |

## 4. Matriz protótipo × WBS

| Categoria | Cobertura/destino |
|---|---|
| Já existe e a WBS cobre | Biblioteca/detalhe, fontes manuais, identificação por URL/nome, texto traduzido, limpeza/filtros globais, player nativo (adendo), capítulos, prefetch de texto, downloads/faixas e progresso. Usar somente partes correspondentes de F1–F6 |
| Já existe, mas WBS coloca no Beta | CentralNovel (3.3.12) deve entrar com os demais providers por paridade. Não importar automaticamente outras funções Beta |
| Novo na WBS, fora do contrato | Login/contas/profiles, glossário, filtros por obra, stats/history inclusive locais, escolha de idioma de tradução, mini-player global, controles na tela bloqueada, skip ±15s, avanço por scroll, posição durável de scroll/frase, health score/fallback entre fontes, mapeamento percentual, templates/seletor manual, paginação infinita, limites LRU, backup/sync em nuvem |
| Infra não comprovadamente necessária | Redis/ARQ, Playwright, WatermelonDB, MMKV, track-player, provisionamento Docker/deploy. Avaliar só se indispensável e registrar decisão; Supabase **já existe**, sua manutenção não adiciona auth |
| Existe sem pacote exato | API config, logs de memória/painel, busca por nome nos dois sites, normalização de slug/duplicata, progresso independente por fonte, badges offline e cache da biblioteca. Preservar como extensões identificadas P03/P04/P06/P09/P31–P35 |
| Mudança de motor não autorizada | GoogleTranslator → MarianMT/OpenAI alteraria resultado; manter GoogleTranslator atrás de TranslationEngine. Piper → expo-speech não é mudança nesta fotografia, já ocorreu |

`WBS_STATUS.md` enumera individualmente todos os IDs escritos na WBS e os dois IDs adicionais v2.1. “Adaptar” significa proposta aguardando plano; nenhum pacote está feito.

## 5. Backlog do README

| Item | Situação observada e destino |
|---|---|
| Pré-carregar próxima página | Já implementado no leitor (P21, 5.1.6); preservar comportamento existente |
| Cache local WAV | Obsoleto (v2.2 e código atual); texto local já existe |
| Logs em tempo real | API pull de buffer e status local existem; painel não chama getLogs. Streaming/polling novo fora do escopo; preservar P31/P34 conforme Q4 |
| Streaming de áudio durante geração | Obsoleto com síntese local; não implementar |
| Scraper especializado | Parsers de metadados especializados já existem; preservar quatro providers. Novos sites/extração avançada não comprovada ficam no backlog |
| README backend: MarianMT, Kokoro e inferência dedicada | Ideias futuras, não implementadas; não importar como tarefas |

## 6. Impacto completo do v2.2 sobre itens de áudio

Além das menções diretas do adendo, rastreamento cruzado com as duas arquiteturas:

| Pacote/artefato | Destino proposto |
|---|---|
| 3.5.1–3.5.4; tts/factory e storage de áudio v2.1 | Eliminado (v2.2). Não remover Storage de **texto** existente |
| 3.6.4; generate_tts/tts_task e enqueue TTS | Eliminado (v2.2); 3.6.2/3.6.3 só mantêm trabalho de texto se necessário, sem impor ARQ |
| 3.7.4; POST geração, GET /tts?lang, StreamingResponse WAV/blob | Eliminado (v2.2); servir JSON de texto; `/audio/texto` atual é texto apesar do nome |
| 2.1.10/2.3.5; AudioCache backend e WatermelonDB em 2.4.3 | Eliminado (v2.2); tabelas/repos/modelos/migrations/fixtures específicos de áudio não entram |
| 1.4.8; track-player/serviço nativo | Eliminado na proposta local; spike de background antes de prometer continuidade |
| 1.3.3 e config/backend | Retirar volume media de voz, modelos Kokoro/Piper e credenciais B2/R2 de áudio; paths de texto/sessões apenas se exigidos |
| 2.1.8/2.3.7; 3.6.5/3.7.5; 5.3.1–5.3.5 | DownloadJob.type só text se houver modelo de job; retirar audio/both, incluir áudio, duração WAV, retomada de arquivo sonoro; preservar faixas de texto existentes |
| 4.1.1/4.1.2/4.1.4; api/tts, mocks/tts, keys.tts | Eliminar transporte blob/stream e chaves de áudio remoto; chaves de texto incluem origem relevante, sem criar seleção de idiomas nova |
| 4.2.3; player-store | Estado de frase/capítulo/voz/rate; posição em segundos não corresponde à fala local. Persistência nova depende de aprovação |
| 4.3.1; audio-service; 5.2.1/5.2.2/5.2.4 | Adaptar para tts-service local e fila de frases/capítulos, sem resolverTrackUrl nem arquivos remotos |
| 4.3.2/4.6.1; PLAYER_PROGRESS/AUDIO_READY | Progresso por frase/total; eliminar AUDIO_READY remoto; EventBus só se houver consumidores que o justifiquem |
| 4.4.1; GENERATE_AUDIO; 5.2.5 prefetch adaptativo | Eliminar tarefa de gerar áudio; prefetch somente texto. Não sintetizar voz de capítulos futuros enquanto outra fala |
| 4.5.1/4.5.2; enforceAudioLimit, LRU áudio, CLEANUP_STORAGE | Eliminar limpeza por limite sonoro; não substituir por LRU de texto novo sem aprovação |
| 4.6.2 bootstrap; setupPlayer | Inicialização local necessária e cleanup; sem auth/login acrescentados |
| 4.7.2/5.1.9; ChapterStatus e badges | Remover AUDIO_GENERATING; READY não exige arquivo sonoro. Badge novo continua fora do contrato |
| 5.1.4; autoscroll sincronizado | Não inferir milissegundos exatos de frases; manter autoscroll independente existente |
| 5.2.3 mini-player | Não nasce da migração v2.2; fora do escopo |
| 5.2.5; voice-settings | Manter vozes instaladas/velocidade; pitch/volume novos não entram só por constarem do adendo |
| 5.3.7 Beta; 6.1.5/6.2.5/4.5.3 | Eliminar retomada de áudio; migração de fonte/uso de espaço/LRU texto continuam fora do contrato |
| RF.1–RF.5 | Retirar referências a falhas de síntese/storage sonoro, preservar apenas tratamento de falha de texto correspondente ao legado; não declarar todo RF eliminado |
| 8.1.x métricas; 8.4.2 e docs de deploy | Eliminar métricas de inferência e bucket de voz; observabilidade/deploy restantes fora do escopo |

## 7. Conflitos e propostas de resolução

Todas as propostas abaixo são análise; decisões aceitas estão separadas em DECISIONS.md.

| ID | Confirmação | Resolução proposta |
|---|---|---|
| C1 | Frontend exige track-player; v2.2 e código usam speech | Manter speech por paridade; spike Android/iOS de background antes de garantir execução com tela apagada |
| C2 | Cache/storage/jobs/status remotos de áudio continuam nas arquiteturas | Aplicar tabela da seção 6; texto não é áudio |
| C3 | v2.1 referencia auth.users; testes SQLite não têm esse schema | Auth/profiles fora do escopo atual. Se aprovados depois, separar migration Supabase de testes SQLite; hoje não criar UUID solo/auth artificial |
| C4 | Backend persiste texto filtrado, frontend spec exige original; legado visual faz limpeza extra | Manter estágios comprovados e snapshot de saída; unificação semântica depende de Q3; glossário não entra |
| C5 | WBS coloca testes em F8, backend pede testes Solo | Testes junto ao módulo, CI mínimo cedo como melhoria quality, separado da reconstrução |
| C6 | Spec cita Expo 51/RN 0.75 e bibliotecas antigas | Verificar estáveis atuais; resolver matriz compatível antes de pin, não instalar tudo da spec |
| C7 | README diz Expo Go; WatermelonDB/MMKV precisam integração nativa | Não adotar essas libs por padrão. Development build só se exigido pelos módulos escolhidos; spike comparativo |
| C8 | EventBus descrito como EventEmitter Node em RN | Não usar Node; emitter tipado pequeno se necessário; não criar barramento sem consumidores |
| C9 | Rotas PT no legado, EN na arquitetura | Proposta: `/api/v1` + nomes EN para novo app; compatibilidade de API externa depende de Q4; conservar capacidades, não wrappers mortos |
| C10 | WBS tem contagens divergentes (70/139, totais por fase e geral) | IDs individuais são a referência; contagem calculada no WBS_STATUS, sem estimativas tratadas como entregáveis |
| C11 | Missão diz Piper/protótipo completo, fotografia já migrou para speech/Supabase | Reconstruir fotografia fornecida e registrar lacunas; não restaurar Piper sem aprovação |
| C12 | Adendos incluem login/MarianMT/glossário; AGENTS limita paridade | Resolvido pelo dono: paridade, não WBS-S completo |
| C13 | WBS 6.2.4 converte progresso percentual; legado restaura capítulo por fonte | Preservar progresso por fonte (P09), sem conversão |
| C14 | WBS 5.1.7 avança em scroll 95%; código só prefetch | Não implementar avanço visual automático |
| C15 | WBS 5.1.8 persiste scroll, 2.4.4 cria stats locais | Fora do escopo: nenhum dos dois existe na fotografia |
| C16 | Regra backend pede ARQ sempre; AGENTS proíbe infraestrutura dispensável | Usar serviços/adaptadores assíncronos e concorrência limitada; adotar fila externa só se indispensável demonstrado e aprovado |
| C17 | Frontend tabela de imports permite exceções ao desenho de camadas; exemplos usam interface/as/useEffect fetch | AGENTS vence: aliases, type, sem casts/barrels/useEffect fetch; automatizar somente camadas necessárias |
| C18 | Anexo pede tags solo-fN/rodapé WBS, AGENTS pede fase-N/Parity | Usar fase-N e Parity/Improvement; WBS adicional pode rastrear IDs sem substituir contrato |

## 8. Problemas e melhorias propostas

| Prioridade/categoria | Evidência e impacto | Tratamento futuro |
|---|---|---|
| Alta, SSRF | scraper aceita URL arbitrária sem checagem de destino; metadados/debug também fazem HTTP. Timeouts existem, mas faltam política IP/DNS, validação por redirect, limite de bytes e orçamento total | Bloquear loopback/privados/link-local/metadata/IPv6 equivalentes, esquemas indevidos e credenciais na URL; validar todos os IPs e cada redirect, limitar quantidade/tempo/tamanho; testes com transporte simulado, sem explorar rede real |
| Alta, acesso | CORS `*`, sem auth; Docker/README expõem em 0.0.0.0; key privilegiada no servidor executa operações de qualquer chamador da API | Origens/bind por config e execução local restrita por padrão; sem adicionar contas. CORS não autentica nem protege clientes fora do browser |
| Alta, vazamento | obras devolve traceback no 500; debug devolve HTML/token parcial; logs contêm URLs/prévias de texto | Erros tipados sem detalhes internos, sanitização de logs e desativação/remoção de debug propostos; Q4 para APIs públicas |
| Alta, configuração | api.js contém endpoint de hospedagem e IPs pessoais em comentários; README contém paths absolutos | Não copiar valores; config central, env.example com placeholders e scan antes de commits |
| Alta, RoyalRoad | NovaObra não inclui chapter_ids no payload da fonte; router remoto downloads só substitui número; montar_url_pagina pode reescrever ID real como índice | Caracterizar e pedir aprovação Q2 antes de corrigir resultado percebido |
| Média, navegação | LeitorScreen ignora capInicial enviado por Downloads/Leitura e usa progresso da fonte | Q2; teste capítulo escolhido vs tocado |
| Média, integridade | Cache local/remoto identificado por obra+cap, sem fonte; trocar fonte pode reaproveitar texto de outra | Não migrar silenciosamente caches entre fontes; decisão de correção Q2 |
| Média, erros HTTP | getTexto/listarObras/atualizarPagina/deletarObra não verificam sempre res.ok; criarObra/adicionarFonte capturam o próprio erro lançado e tentam reler body | Cliente central com validação Zod e erros uniformes; distinguir erro de cache/servidor |
| Média, dados | Criar obra/fontes e salvar progresso envolve várias operações sem transação; falhas podem deixar estado parcial; remover_fonte não confirma pertença antes do DELETE por id | Operações atômicas/invariantes em repositories, erro tipado; não mudar UX de sucesso |
| Média, filtros | Regex arbitrárias podem custar tempo excessivo; PUT não valida compilação como POST; salvar_filtros captura erro e responde sucesso aparente | Validar tamanho/regex e orçamento; propagação correta de falhas; testar listas vazias |
| Média, conteúdo | Tradução mantém blocos originais em falha; filtros frontend removem repetições legítimas, fala diverge de texto | Testes com corpus sintético; Q3 antes de alterar semântica |
| Média, concorrência | Lock apenas nos downloads remotos; app atual baixa por /audio/texto em grupos de cinco; retries empilhados e prefetch podem duplicar trabalho | Deduplicar requisições e limitar concorrência/retentativas como melhoria interna; sem fila nova por conveniência |
| Média, offline | Progresso falho é ignorado e não persiste para sincronizar; texto local pode ser inválido e cache da biblioteca ficar antigo | Preservar limite atual; sincronização offline durável seria comportamento novo |
| Média, voz | Destruir player antigo não é aguardado antes do novo; callbacks/closures de capítulo e mudanças de voz precisam teste | Máquina de estados/cancelamento com testes; não prometer pausas exatas por palavra |
| Baixa, duplicação | models módulo/pacote duplicados; normalização de slug e montagem de URL repetidas; limpeza visual extra; funções HTTP de áudio mortas | Tipos/schemas únicos e responsabilidades claras, sem copiar legado em bloco |
| Qualidade | Sem suíte/config lint/tipos/CI encontrada; JS sem validação de respostas | Pytest, Ruff, mypy, TS strict, ESLint boundaries, Jest, scan de segredos desde fundação |
| Dependências | Versões antigas frente aos releases consultados; duas libs Python sem pin; expo-av/expo-audio coexistem sem fluxo WAV ativo | Matriz mínima com lockfiles, auditoria de dependências na execução. Não houve auditoria CVE nesta fase |

Nenhum segredo ou dado pessoal foi copiado para estes documentos; achados de configuração foram descritos sem seus valores.

## 9. Plano de migração de dados (sem implementar importador)

Proposta para `scripts/import_legacy`: one-shot explícito, modo dry-run padrão, execução manual somente após plano aprovado.

1. Entrada por paths/config em ambiente, nunca dados versionados. Preferir exportação privada consistente de obras/fontes/filtros/config do Supabase atual; JSON antigo é fonte alternativa, não autoridade automática. Esquema dos JSON pessoais ainda não foi inspecionado e deve ser detectado/validado no dry-run.
2. Inventariar contagens e versão da entrada sem imprimir títulos, URLs, regras ou credenciais. Backup externo privado da origem e do destino; nunca escrever em `_legacy/`.
3. Validar IDs/slug, fonte ativa pertencente à obra, página por fonte, padrões e listas de IDs. Preservar UUIDs quando compatíveis; mapa privado de IDs caso contrário. Conflitos entre JSON e exportação remota param para escolha explícita, sem sobrescrever progresso por data presumida.
4. Filtros: importar três listas e manter vazio distinto de ausência. Config: importar velocidade com validação; não inventar persistência de voz/tema não existente.
5. Capítulos locais e biblioteca offline ficam no sandbox do app antigo: dependem de exportação ou acesso autorizado ao dispositivo. Importação é opcional se esses arquivos estiverem disponíveis; não presumir acesso pelo computador. Separar cache por fonte no destino somente se correção aprovada, preservando dados brutos em backup privado.
6. Validar payloads de texto do Storage (`cap,texto`) se houver exportação privada; não regenerar usando rede como parte do import. Logs de processo não precisam migração. Texto baixado é dado de usuário e não vai para fixtures.
7. Idempotência por identificador de origem/fingerprint em relatório privado; dry-run mostra criar/ignorar/conflito. Uma transação ou recuperação documentada impede importação parcial silenciosa. Reexecutar não duplica obras/fontes/filtros.
8. Critérios de aceite: totais batem; progresso por fonte, fonte ativa, listas vazias e velocidade preservados; segunda execução não altera contagens; registros inválidos abortam com relatório sem conteúdo pessoal. Testar apenas com dados sintéticos.

## 10. Spikes, versões e perguntas para aprovação

### 10.1 Spikes cedo (ainda não executados)

| Spike | Procedimento/aceite | Momento |
|---|---|---|
| S1 TTS Android/iOS | Dispositivo físico, foreground/background/tela bloqueada por pelo menos dois capítulos; pause/retomar por frase, chamada/interrupção, alternar velocidade/voz, vozes sem rede e sem voz PT; registrar SO/motor/build e evidência. Comparar legado e novo | Primeiro bloco que possa executar player, antes de concluir arquitetura de voz |
| S2 Build de desenvolvimento | Build mínimo com conjunto realmente necessário de speech/file-system/NetInfo, validar instalação, leitura de arquivo e fala. WatermelonDB/MMKV só se necessidade aprovada | Fundação mobile, antes de pin definitivo |
| S3 Matriz de versões | Resolver Expo/RN/React e pacotes Expo em conjunto; Python/FastAPI/Pydantic/Supabase com lock; smoke build, lint/tipos/testes, auditoria e compatibilidade | Fundação, antes de produto |
| S4 URLs e filtros | Fixtures sintéticas para cada formato/ID real RoyalRoad, redirecionamento SSRF e saída visual/falada | Primeiro bloco backend de conteúdo |

Se S1 invalidar uma decisão, parar e registrar ADR antes de mudar motor ou prometer background. Sem hardware/evidência, marcar “não validado”, nunca “passou”. Não executar spike de código nesta fase de análise.

### 10.2 Consulta de versões em 2026-11-18

Consulta oficial encontrou Expo SDK 58 como release mais recente listado, com RN 0.88; o protótipo está no SDK 54. Isso é **candidato**, não pin aprovado nem compatibilidade testada. Fonte: [índice de SDKs](https://expo.dev/sdk) e [release SDK 58](https://expo.dev/changelog/sdk-58).

FastAPI lista 0.164.0 em 18/11/2026; a fotografia usa 0.115.0. Não houve instalação nem matriz de regressão: [release notes](https://fastapi.tiangolo.com/release-notes/).

A documentação atual do Speech limita pause/resume nativos a iOS/web; Android exige estratégia de retomada. A documentação também alerta sobre modo silencioso do iOS: [Expo Speech](https://docs.expo.dev/versions/latest/sdk/speech/). Isso não comprova background entre aparelhos.

`expo-background-fetch` está depreciado em favor de background-task, mas nenhum deles será adicionado sem função de paridade que o exija: [referência oficial](https://docs.expo.dev/versions/latest/sdk/background-fetch/).

WatermelonDB tem passos de instalação nativa e MMKV documenta integração nativa/Expo prebuild. Não afirmamos compatibilidade de ambos com SDK 58 sem build: [WatermelonDB](https://watermelondb.dev/docs/Installation), [MMKV](https://github.com/margelo/react-native-mmkv). Ambos ausentes do protótipo e dispensados por padrão. Changelog Supabase consultado sem acesso ao projeto: [changelog](https://supabase.com/changelog.md). SDK/CLI e políticas específicas devem ser verificados quando houver implementação; não há decisão de adicionar Auth.

### 10.3 Perguntas apresentadas e estado após aprovação

Q1 já respondida: paridade do AGENTS.md prevalece sobre WBS-S completo.

1. **Q2 — Correções perceptíveis:** aprova corrigir RoyalRoad (IDs reais), capítulo escolhido ao abrir player e cache confundido entre fontes? Padrão proposto: sim, em commits de melhoria separados, preservando formato/fluxos de uso. A capacidade existe; as correções alteram resultados hoje defeituosos e precisam aprovação.
2. **Q3 — Limpeza visual e fala:** qual saída deve prevalecer? Padrão proposto: preservar inicialmente os dois resultados atuais com fixtures; unificar só a implementação comum. Aplicar a deduplicação visual global à fala ou preservar repetições na tela muda conteúdo e exige decisão separada.
3. **Q4 — APIs sem fluxo ativo na UI:** preservar config, logs, downloads remotos e aliases antigos de filtros? Padrão proposto: manter capacidades P32–P35; organizar rotas novas em EN sob `/api/v1`, sem compatibilidade literal das rotas PT; remover apenas debug e referências de áudio inexistentes. Se houver clientes externos, manter compatibilidade deve entrar no contrato antes do plano.
4. **Q5 — Validação de voz:** quais aparelhos Android/iOS estarão disponíveis para S1? Padrão proposto: exigir evidência nos dois para declarar paridade móvel completa; continuar trabalho independente enquanto os testes físicos aguardam, sem dar background como validado.

Estado atualizado: o dono aprovou a análise e autorizou prosseguir em 2026-11-18. As propostas padrão Q2–Q4 estão aceitas (ADR-002); Q5 depende de informação sobre aparelhos. PLANO_COMMITS.md foi preparado para revisão da Fase 2. Não iniciar execução sem aprovação desse plano.

## Apêndice A — Inventário completo de caminhos

Gerado somente a partir dos nomes dos arquivos, excluindo dependências/builds e sem copiar conteúdos pessoais.

```text
_legacy/README.md
_legacy/backend/.gitignore
_legacy/backend/Dockerfile
_legacy/backend/README.md
_legacy/backend/docker-compose.yml
_legacy/backend/filtros.json
_legacy/backend/main.py
_legacy/backend/models.py
_legacy/backend/models/__init__.py
_legacy/backend/package-lock.json
_legacy/backend/progresso.json
_legacy/backend/requirements.txt
_legacy/backend/routers/__init__.py
_legacy/backend/routers/audio.py
_legacy/backend/routers/config.py
_legacy/backend/routers/downloads.py
_legacy/backend/routers/filtros.py
_legacy/backend/routers/logs.py
_legacy/backend/routers/novel.py
_legacy/backend/routers/obras.py
_legacy/backend/services/__init__.py
_legacy/backend/services/config_service.py
_legacy/backend/services/filtros.py
_legacy/backend/services/homoglifos.py
_legacy/backend/services/logger_buffer.py
_legacy/backend/services/marca_dagua.py
_legacy/backend/services/novel_meta.py
_legacy/backend/services/processing_lock.py
_legacy/backend/services/progresso.py
_legacy/backend/services/scraper.py
_legacy/backend/services/storage_service.py
_legacy/backend/services/supabase_client.py
_legacy/backend/services/texto.py
_legacy/leitor-app/.claude/settings.json
_legacy/leitor-app/.gitignore
_legacy/leitor-app/AGENTS.md
_legacy/leitor-app/App.js
_legacy/leitor-app/CLAUDE.md
_legacy/leitor-app/app.json
_legacy/leitor-app/assets/adaptive-icon.png
_legacy/leitor-app/assets/favicon.png
_legacy/leitor-app/assets/icon.png
_legacy/leitor-app/assets/icons/minimalista/adaptive-icon.png
_legacy/leitor-app/assets/icons/minimalista/favicon.png
_legacy/leitor-app/assets/icons/minimalista/icon.png
_legacy/leitor-app/assets/icons/minimalista/splash-icon.png
_legacy/leitor-app/eas.json
_legacy/leitor-app/index.js
_legacy/leitor-app/package-lock.json
_legacy/leitor-app/package.json
_legacy/leitor-app/src/App.js
_legacy/leitor-app/src/components/nova-obra/DuplicataModal.js
_legacy/leitor-app/src/components/obra/FonteCard.js
_legacy/leitor-app/src/components/ui/ErrorText.js
_legacy/leitor-app/src/components/ui/Modal.js
_legacy/leitor-app/src/screens/DownloadsScreen.js
_legacy/leitor-app/src/screens/FiltrosScreen.js
_legacy/leitor-app/src/screens/HomeScreen.js
_legacy/leitor-app/src/screens/LeitorScreen.js
_legacy/leitor-app/src/screens/LeituraScreen.js
_legacy/leitor-app/src/screens/NovaObraScreen.js
_legacy/leitor-app/src/screens/ObraScreen.js
_legacy/leitor-app/src/screens/SplashScreen.js
_legacy/leitor-app/src/services/api.js
_legacy/leitor-app/src/services/localStorage.js
_legacy/leitor-app/src/services/providers.js
_legacy/leitor-app/src/services/ttsLocal.js
```
