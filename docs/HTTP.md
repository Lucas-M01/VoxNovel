# Rede do scraper

C15 estabelece a pré-condição para os providers e rotas de F3. `PublicHttp` aceita somente HTTP(S), sem credenciais, escapes de host ou caracteres de controle. Cada redirect é novamente validado. Respostas DNS mistas público/privado são rejeitadas; IPs locais, privados, link-local, multicast, reservados, mapeados/encapsulados e endpoints de metadata são bloqueados.

A resolução A/AAAA tem prazo explícito (dnspython). O socket conecta ao endereço numérico já aprovado, sem resolver o hostname novamente. TLS continua verificando certificado e hostname originais. Nenhum proxy de ambiente ou redirect automático participa do transporte. O timeout global inclui DNS, tentativas e redirects; cada troca também tem timeout de socket e watchdog que encerra o socket. Corpo comprimido e descomprimido têm limites independentes; resposta incompleta é erro, nunca texto de capítulo parcial.

Configuração e defaults ficam em `core/config.py`, documentados no `.env.example`. IPs de testes são sintéticos/públicos e nenhuma prova exige conectar a um destino privado. Erros públicos não incluem URL, credenciais, resposta do site ou traceback. Headers HTTP permanecem sujeitos aos limites internos do parser da biblioteca padrão.

Testes cobrem IPv4/IPv6, metadata, respostas DNS mistas, rebinding em retry, TLS com hostname original, redirects relativos/privados, orçamentos de retries/DNS e limites de streaming/descompressão. Outros transportes só podem entrar se preservarem a validação no connect e os mesmos limites; não habilitar bypass de anti-403 que contorne esta política.

Referências conferidas: [http.client do Python](https://docs.python.org/3.12/library/http.client.html), [ipaddress](https://docs.python.org/3.12/library/ipaddress.html) e [Resolver do dnspython](https://dnspython.readthedocs.io/en/stable/resolver-class.html).

A conexão mantém seu prazo original também se a biblioteca tentar reabri-la após expiração. A negociação TLS é explícita, com o socket TLS atribuído antes do handshake, para que o watchdog possa interrompê-lo; o handshake usa somente o orçamento restante.
