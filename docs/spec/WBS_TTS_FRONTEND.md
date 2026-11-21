# WBS — Novel Reader App

> **Referência de planejamento:** este documento inclui propostas que não foram implementadas. Consulte [o guia desta pasta](README.md), [o escopo aprovado](../ANALISE.md) e [o estado da WBS](../WBS_STATUS.md) antes de usá-lo como descrição do app.

## Adendo v2.2 — TTS no Front-end (expo-speech) em vez de Kokoro-82M no servidor

> Este documento complementa o `WBS.md` (v2.0) e o `WBS_SUPABASE.md` (v2.1). Mesmo formato:
> só marca o que muda dentro de cada pacote afetado. Decisão tomada ainda na fase Solo/MVP,
> visando **custo de infraestrutura zero** — sem worker de TTS, sem GPU, sem storage de áudio.

---

## Resumo da decisão

| Camada | Antes (v2.0/v2.1) | Depois (v2.2) |
|---|---|---|
| Motor de TTS | Kokoro-82M (worker Python local) | **expo-speech** (motor nativo do Android/iOS) |
| Onde roda a síntese de voz | Servidor (worker ARQ) | **No celular do usuário** |
| Storage de áudio gerado | Supabase Storage / B2 / R2 | **Eliminado** — não há áudio para persistir, a fala é gerada e descartada em tempo real |
| Fila de tarefas para TTS | Task ARQ dedicada (`tts_task`) | **Eliminada** — não existe mais essa tarefa |
| Streaming de áudio do servidor pro app | Endpoint `/audio/gerar` retornando WAV | **Eliminado** — app já recebe o texto traduzido e fala localmente |
| Controle de velocidade/voz | Parâmetro enviado ao worker (`length_scale` do Piper/Kokoro) | **`Speech.speak()` com `rate` e `voice` nativos do dispositivo** |
| Custo de infra para essa funcionalidade | CPU/GPU para inferência + storage de arquivos | **Zero** — processamento e memória são do próprio aparelho |

**Princípio orientador:** o pipeline de **texto** (scraping → limpeza → tradução) continua
exatamente igual e continua no backend, porque depende de Playwright, MarianMT/OpenAI, e regras de
parsing por site — nada disso roda bem num celular. Só a **etapa final de voz** migra para o
dispositivo. O backend deixa de ser responsável por "fazer o app falar" e passa a ser responsável
apenas por "entregar o texto certo, já traduzido e limpo".

---

## F3 — Core Backend (mudanças)

| Item original (v2.0) | Mudança v2.2 |
|---|---|
| 3.5.1–3.5.4 (TTS — Kokoro-82M, factory de storage, endpoint de geração de áudio) | **Remover todo o pacote 3.5.** Não há mais worker de TTS, não há mais `tts/factory.py`, não há mais decisão de storage (local/B2/R2/Supabase) para áudio — fica sem objeto. |
| 3.5.3 (v2.1) `tts/factory.py` com opção de storage `supabase` | **Remover.** Item criado no adendo anterior, mas se torna obsoleto com a saída do TTS do servidor. |
| 3.6.x (tasks ARQ) — task de TTS dentro da pipeline (`scrape → translate → tts → notify`) | A pipeline ARQ encurta para `scrape → clean → translate → notify`. Remove o passo de TTS e o enqueue correspondente. |
| 3.7.x (endpoints) — endpoint `POST /audio/gerar` ou equivalente que retornava o WAV | **Remover endpoint.** Endpoint de capítulo passa a retornar só o **texto traduzido e limpo** (JSON), não áudio. |

**Itens sem mudança:** 3.1.1–3.1.3 (auth/Supabase, ver v2.1), 3.2.1–3.2.5 (pipeline de texto),
3.3.1–3.3.11 (scraping), 3.4.1–3.4.5 (tradução), demais itens de 3.6 e 3.7 não relacionados a áudio

**Impacto direto:** o backend Solo fica **stateless em relação a áudio** — nunca gera, nunca
armazena, nunca serve um arquivo de voz. Isso também simplifica o dimensionamento do worker:
ele só precisa lidar com scraping + tradução, que são tarefas de CPU/rede, não de inferência de
modelo de voz.

---

## F4 — Core Mobile (mudanças)

| Item original (v2.0) | Mudança v2.2 |
|---|---|
| (novo) Player de áudio remoto — componente que baixava/tocava o WAV vindo do backend | **Substituir** por um "Player de TTS local" baseado em `expo-speech`. Não há mais buffer de áudio remoto, não há mais cache de arquivo `.wav` em disco. |
| 4.1.x (`http-resource.ts` e afins) — chamada ao endpoint de áudio, tratamento de blob/stream | Chamada passa a ser só por **texto** (`GET /capitulos/:id` → `{ texto_traduzido: string }`). Tratamento de blob de áudio é removido dessa camada. |
| (novo) Service `tts-service.ts` | **Criar.** Encapsula `expo-speech`: `falar(texto, { rate, pitch, voice })`, `pausar()`, `parar()`, `proximoTrecho()`. Centraliza a lógica de troca de capítulo ao terminar a fala (callback `onDone`). |
| (novo) Tela/seção de configuração de leitura | **Criar ou ajustar.** Em vez de "escolher modelo de voz do servidor", o usuário escolhe entre as **vozes instaladas no próprio aparelho** (`Speech.getAvailableVoicesAsync()`), além de velocidade (`rate`) e tom (`pitch`). |

**Itens sem mudança:** 4.2.x (sessão/Supabase, ver v2.1), 4.3.x, 4.5.x, 4.6.x, 4.7.x

**Ponto de atenção de UX:** `expo-speech` não tem progresso granular por palavra de forma
consistente entre Android e iOS. Para a função de "avançar capítulo automaticamente ao terminar a
leitura" (que já existia no protótipo anterior em React Native puro), usar o callback `onDone` do
`Speech.speak()` — ele dispara de forma confiável quando o texto inteiro terminou de ser falado,
independente de plataforma.

---

## F5 — Features de Leitura (mudanças)

| Item original (v2.0) | Mudança v2.2 |
|---|---|
| Itens relacionados a "baixar capítulo para ouvir offline" (áudio pré-gerado) | **Replanejar.** Sem áudio gerado pelo servidor, "ouvir offline" significa apenas **ter o texto traduzido salvo localmente** (ex: WatermelonDB já local-first) e usar TTS nativo, que funciona sem internet. Isso na prática **simplifica** o offline-first, pois não depende de baixar arquivos de áudio pesados. |
| Itens de "fila de capítulos para tocar em sequência" | Sem mudança de conceito — só troca a fonte do áudio (local vs. remoto). A lógica de "qual é o próximo capítulo" continua igual; o que muda é só quem sintetiza a voz. |

**Itens sem mudança:** os demais itens de F5 não relacionados a áudio (bookmarks, filtros de
conteúdo, busca, etc.) seguem como no `WBS.md` original.

---

## WBS-M (Beta) e WBS-L (Launch) — mudanças

| Item original | Mudança v2.2 |
|---|---|
| RF.x (Recuperação de Falhas) relacionadas a falha na geração de TTS / storage de áudio | **Remover.** Essas falhas não existem mais — não há geração nem storage de áudio no servidor para falhar. |
| Observabilidade (Sentry/Logfire) — métricas de tempo de inferência do worker de TTS | **Remover** essas métricas específicas. O worker de Beta/Launch monitora só scraping + tradução. |

**Sem mudança:** todo o restante de CI/CD, deploy e observabilidade não relacionado a TTS.

---

## Checklist de migração (ordem recomendada)

- [ ] 1. Remover pacote 3.5 (Kokoro-82M, factory de storage de áudio) do backend
- [ ] 2. Simplificar pipeline ARQ: `scrape → clean → translate → notify` (remover etapa de TTS)
- [ ] 3. Trocar endpoint `POST /audio/gerar` por endpoint de texto (`GET /capitulos/:id`)
- [ ] 4. Instalar `expo-speech` no projeto mobile
- [ ] 5. Criar `tts-service.ts` encapsulando `Speech.speak/pause/stop` e listagem de vozes
- [ ] 6. Adaptar tela de configurações: trocar "modelo de voz do servidor" por "voz do dispositivo"
- [ ] 7. Adaptar player: trocar componente de áudio remoto por chamadas ao `tts-service.ts`
- [ ] 8. Revisar lógica de "avançar capítulo automaticamente" usando `onDone` do `expo-speech`
- [ ] 9. Replanejar "modo offline" como texto local + TTS nativo (não áudio pré-gerado)
- [ ] 10. Remover do roadmap de Beta/Launch qualquer item de observabilidade ligado a TTS no servidor

---

## Riscos e pontos de atenção

- **Qualidade e disponibilidade de vozes variam por aparelho.** Em Android, depende do motor de
  TTS instalado (geralmente Google TTS); em iOS, das vozes do sistema. Pode haver aparelhos sem
  voz em português instalada — vale checar `Speech.getAvailableVoicesAsync()` e orientar o usuário
  a instalar/baixar a voz no idioma desejado se não encontrar nenhuma.
- **Sem controle fino de qualidade de voz** comparado a um modelo neural como Kokoro-82M — é a
  troca consciente de "qualidade de voz" por "custo zero de servidor". Vale documentar isso como
  decisão de produto, não como limitação acidental.
- **App em background:** TTS nativo pode ser pausado pelo sistema operacional se o app for para
  segundo plano, dependendo de como `expo-speech` se comporta nesse cenário em cada plataforma —
  testar esse caso especificamente antes do Beta, já que "ouvir com a tela apagada" é um caso de
  uso comum para esse tipo de app.
- **Caminho de volta aberto:** como o backend nunca te deu profundidade total em áudio gerado, se
  no futuro quiser oferecer TTS de alta qualidade como feature paga (ex: plano Pro com Kokoro/
  ElevenLabs), o pipeline de texto (scraping + tradução) já está pronto e desacoplado — bastaria
  reativar o pacote 3.5 como funcionalidade opcional, sem reescrever scraping/tradução.
