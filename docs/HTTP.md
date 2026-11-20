# Rede do scraper

C15 estabelece a pré-condição para os providers e rotas de F3. `PublicHttp` aceita somente HTTP(S), sem credenciais, escapes de host ou caracteres de controle. Cada redirect é novamente validado. Respostas DNS mistas público/privado são rejeitadas; IPs locais, privados, link-local, multicast, reservados, mapeados/encapsulados e endpoints de metadata são bloqueados.

A resolução A/AAAA tem prazo explícito (dnspython). O socket conecta ao endereço numérico já aprovado, sem resolver o hostname novamente. TLS continua verificando certificado e hostname originais. Nenhum proxy de ambiente ou redirect automático participa do transporte. O timeout global inclui DNS, tentativas e redirects; cada troca também tem timeout de socket e watchdog que encerra o socket. Corpo comprimido e descomprimido têm limites independentes; resposta incompleta é erro, nunca texto de capítulo parcial.

Configuração e defaults ficam em `core/config.py`, documentados no `.env.example`. IPs de testes são sintéticos/públicos e nenhuma prova exige conectar a um destino privado. Erros públicos não incluem URL, credenciais, resposta do site ou traceback. Headers HTTP permanecem sujeitos aos limites internos do parser da biblioteca padrão.

Testes cobrem IPv4/IPv6, metadata, respostas DNS mistas, rebinding em retry, TLS com hostname original, redirects relativos/privados, orçamentos de retries/DNS e limites de streaming/descompressão. Outros transportes só podem entrar se preservarem a validação no connect e os mesmos limites; não habilitar bypass de anti-403 que contorne esta política.

Referências conferidas: [http.client do Python](https://docs.python.org/3.12/library/http.client.html), [ipaddress](https://docs.python.org/3.12/library/ipaddress.html) e [Resolver do dnspython](https://dnspython.readthedocs.io/en/stable/resolver-class.html).

A conexão mantém seu prazo original também se a biblioteca tentar reabri-la após expiração. A negociação TLS é explícita, com o socket TLS atribuído antes do handshake, para que o watchdog possa interrompê-lo; o handshake usa somente o orçamento restante.

## Transportes específicos (C18)

NovelFire usa cloudscraper 1.2.71 com intérprete nativo, profundidade de solução limitada e delay configurado. Todos os adaptadores padrão são removidos; GET/POST de desafios e redirects passam por `ChallengeAdapter` e `PublicHttp.single`, com o mesmo deadline para a operação inteira, limite de submissões, corpo de request limitado, DNS validado e cookies com política de domínio/path/secure. Não há transporte requests residual nem proxy de ambiente.

RoyalRoad usa curl-cffi com impersonação Chrome, sem proxy, sem redirects automáticos e sem reutilização da conexão. CONNECT_TO e RESOLVE fixam o destino numérico validado, preservando Host/SNI/certificado originais. A descompressão automática é desabilitada: callback limita bytes recebidos e a aplicação limita separadamente a descompressão. Referências: [CONNECT_TO](https://curl.se/libcurl/c/CURLOPT_CONNECT_TO.html), [HTTP_CONTENT_DECODING](https://curl.se/libcurl/c/CURLOPT_HTTP_CONTENT_DECODING.html).

As provas determinísticas incluem redirects privados nos dois transportes, cookies de desafio, POST limitado, impossibilidade de cair no HTTPAdapter padrão e opções cURL de pinning/TLS/descompressão. Não representam promessa de superar qualquer desafio Cloudflare real; mudanças externas no site continuam podendo resultar em erro claro de acesso.

## Identificação e montagem (C19)

A seleção de provider compara o hostname normalizado inteiro, sem aceitar o nome de um site como substring de outro domínio. O fallback genérico preserva metadados mínimos quando uma fonte pública falha, mas nunca absorve uma rejeição da política de rede. Detecção mantém os dois contratos observados: o utilitário de obra reconhece hífen e retorna 1 no fallback; a detecção de fonte também reconhece `chapter/numero`. Montagem cobre hífen/barra, query `?page=` e acréscimo de `page`, além do placeholder retornado pelo parser.

## Tradução GoogleTranslator (C20)

A engine mantém a biblioteca deep-translator (source auto, target pt), com endpoint configurado em core/config.py. A biblioteca não oferece injeção de cliente HTTP: a engine substitui somente o binding requests do módulo google durante a chamada, sob lock, e o restaura no finally. O módulo requests global não é alterado. O cliente substituto usa exclusivamente o adaptador protegido, com o mesmo deadline durante redirects/recursões; espera pelo lock também tem prazo. Testes usam o parser GoogleTranslator real com HTTP simulado, verificam sl/tl/q e restauração do binding em sucesso/falha.

O serviço divide o texto em blocos de 4500 caracteres, traduz cada bloco e preserva o bloco original em erro/retorno vazio, com espaçamento entre blocos. Nenhum conteúdo de tradução ou exceção externa é registrado. Rede real Google não foi usada como prova determinística.

## Limites de processamento e falhas (C25)

Os handlers com I/O são síncronos e executados pelo pool do framework. Uma admissão compartilhada limita conteúdo/metadados a dois processamentos, com espera limitada; sobrecarga retorna indisponibilidade. A rota de status é assíncrona e não depende do pool ocupado. O bootstrap também limita a concorrência total do servidor e mantém bind/CORS por configuração.

Corpos de mutation têm limite de bytes com ou sem Content-Length. Extração e limpeza limitam texto antes/depois de normalização Unicode. Termos e quantidade de filtros são limitados; novas gravações validam regex. O motor regex VERSION0 usa um orçamento compartilhado de execução com timeout efetivo, mantendo o subconjunto aceito por re; padrões inválidos antigos continuam ignorados. A referência de timeout foi conferida na [documentação do projeto regex](https://pypi.org/project/regex/).

Tradução tem orçamento total, prazo restante por bloco e limite de saída; blocos não traduzidos/expirados conservam o original. Persistência usa timeouts configurados. Falhas inesperadas são interceptadas antes do logger do servidor, retornando problema genérico e evento fixo. O buffer só aceita eventos enumerados; não recebe URLs, texto, exceções ou payloads. Access log com query strings fica desativado no bootstrap padrão.

As provas incluem regex problemática real, normalização que expande o texto, limites de corpos em chunks, rejeição de carga e liberação de slots, status durante fetch bloqueado, falhas redigidas e configuração segura do bootstrap. Integrações verificam novamente escrita e falha de cache no Storage real. Os limites de rede dos transportes cobrem DNS/conexão/transferência; o solver JS mantém delay e profundidade limitados conforme C18. Testes determinísticos não afirmam sucesso contra desafios externos atuais.
