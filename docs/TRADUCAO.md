# Tradução e texto original

A leitura e a voz oferecem **Texto original** e **Traduzir para português**
(P36, ADR-014). O padrão continua traduzido. Ao abrir a voz pelo leitor, o modo
escolhido acompanha o capítulo. Trocar de modo interrompe a sessão anterior;
toque Reproduzir para ouvir a nova versão. Para original em inglês, selecione
uma voz desse idioma no seletor de vozes do aparelho.

O original passa pela mesma extração, limpeza e filtros, sem chamar tradutor.
Seu cache de memória é separado da tradução. Os downloads continuam no fluxo
traduzido existente; não há gravação de original offline nem migração dos arquivos.
Um original já carregado pode continuar disponível no cache da sessão, mas um
arquivo PT salvo não passa a ser uma cópia do original.

## Instalar o modelo no backend

A opção padrão usa CTranslate2/SentencePiece em CPU, com o modelo Argos/OPUS
**inglês → português brasileiro, versão 1.9**. Não exige chave, conta, cartão,
GPU ou serviço HTTP adicional. Textos identificados como português passam
inalterados. Outros idiomas, detecção incerta, modelo ausente e falhas preservam
o original e registram uma razão fixa, sem conteúdo, URL ou credenciais.
Isso reduz o suporte de idiomas em relação ao auto→PT anterior; ADR-013 registra
esse limite. A tradução automática pode errar nomes, termos e frases.

Após instalar as dependências, configure no `.env` do backend:

```dotenv
VOXNOVEL_TRANSLATION_ENGINE=local
VOXNOVEL_LOCAL_MODEL_PATH=../../.private/models/en_pb-1_9
VOXNOVEL_LOCAL_TRANSLATION_THREADS=1
VOXNOVEL_PROCESSING_CONCURRENCY=5
VOXNOVEL_PROCESSING_WAIT_TIMEOUT=60
VOXNOVEL_TRANSLATION_TIMEOUT=90
```

Os caminhos relativos são resolvidos a partir da pasta em que o backend é iniciado.
Da pasta `apps/backend`, instale o modelo explicitamente, uma vez:

```sh
poetry run python -m tools.install_translation_model
```

O instalador baixa o arquivo oficial de cerca de 66 MB, verifica SHA-256, limita
tamanho e extrai somente os seis arquivos necessários, incluindo a atribuição.
Recusa um destino existente e não sobrescreve arquivos. Nenhum download ocorre
em uma requisição de capítulo. Reinicie o backend após mudar a configuração;
um único modelo é carregado sob demanda e compartilhado pelas requisições.

O Google anterior continua selecionável com `VOXNOVEL_TRANSLATION_ENGINE=google`
para diagnóstico/retorno explícito; o controle atual recebeu HTTP 429. Não existe
fallback automático que envie texto do modelo local ao Google ou a outro serviço.

## Uso, recursos e deploy

A API e o modelo precisam estar disponíveis para carregar ou traduzir texto novo.
Os downloads PT já salvos continuam funcionando sem rede. Arquivos antigos podem
conter inglês preservado pelo fallback anterior: para atualizar um capítulo, use
a exclusão existente e baixe-o novamente. O app não apaga arquivos automaticamente.

No teste isolado do capítulo autorizado, 11.327 caracteres foram processados em
aproximadamente 19 s de inferência, com pico de cerca de 323 MiB no processo com
backend e modelo, uma thread e sem GPU. É uma medida desse ambiente, não uma
reserva suficiente para produção ou garantia de tempo em qualquer host. O modelo
extraído ocupa aproximadamente 83 MB; as bibliotecas aumentam o ambiente Python.

O deploy continua sendo do backend Python, com dependências nativas compatíveis
e o diretório do modelo instalado durante a preparação, fora do git. Deve oferecer
CPU, RAM e armazenamento adequados; mantenha um worker para compartilhar o modelo
em vez de duplicá-lo em cada processo. Não há garantia de hospedagem gratuita
permanente. Não foi feito deploy nem introduzido Docker no produto.

Inferência usa lotes limitados e admissão com prazo. O perfil do exemplo admite
um grupo existente de cinco capítulos, com um único modelo serializado e até
90 s por bloco, dentro do prazo total de capítulo. O primeiro ensaio com duas
vagas e 60 s de espera devolveu ocupado sob cinco pedidos; não é um perfil
aprovado para downloads em grupo com o modelo local. O perfil ajustado concluiu
cinco traduções concorrentes do texto autorizado em 50,59 s totais, todas PT e
sem fallback; isso não certifica rede/Storage sob qualquer carga. Sob carga pode ocorrer indisponibilidade ou fallback;
baixar um intervalo de capítulos exige mais CPU e tempo que abrir um só. Ajuste
os limites por configuração após medir o host, sem remover os limites de proteção.

## Modelo, licença e fontes

O arquivo oficial é `translate-en_pb-1_9.argosmodel`, SHA-256
`1d1cd5e9540c6b38c258bed002a42d3b311b8a189acb74feaa311ef30d175c5b`.
O modelo OPUS de origem é **CC-BY 4.0**, conforme o README do pacote; preserve
sua atribuição ao redistribuir o modelo em um deploy. Isso não define a licença
do código deste repositório.

Autores: Jörg Tiedemann e Santhosh Thottingal. *OPUS-MT — Building open translation
services for the World*, EAMT 2020, Lisboa.

Referências: [índice oficial Argos](https://github.com/argosopentech/argospm-index),
[modelo oficial](https://argos-net.com/v1/translate-en_pb-1_9.argosmodel),
[CTranslate2](https://opennmt.net/CTranslate2/python/ctranslate2.Translator.html),
[tokenizador Argos](https://github.com/argosopentech/argos-translate/blob/master/argostranslate/tokenizer.py),
[CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).
