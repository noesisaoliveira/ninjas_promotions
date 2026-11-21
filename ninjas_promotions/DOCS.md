# Documentacao

## Instalacao

Home Assistant OS com Supervisor, arquitetura amd64 ou aarch64 e acesso HTTPS e aos registos de pacotes para construir a imagem.

Na loja de apps/complementos, adicionar `https://github.com/noesisaoliveira/ninjas_promotions` aos repositorios. Instalar **Ninjas Promotions**, iniciar e ativar **Mostrar na barra lateral**. Repositorio personalizado, nao HACS nem catalogo oficial. A branch publicada deve conter repository.yaml na raiz e esta pasta com config.yaml e Dockerfile.

## Configuracao

Sem opcoes obrigatorias, contas, tokens ou portas a configurar. Ingress na porta interna 8099; apenas o proxy 172.30.32.2 tem acesso. O servidor nao pede login porque o Home Assistant autentica a sessao. Sem acesso as APIs do Supervisor/Core, a dispositivos ou a pastas do Home Assistant.

## Resultados e ordenacao

Todas as categorias inicia pelos resultados recentes, incluindo atualizacoes. As 13 categorias correspondem aos enderecos verificados na fonte: Tecnologia, Casa, Moda e Acessorios, Beleza e Saude, Bebes e Criancas, Mercearia, Desporto e Lazer, Cultura e Jogos, Papelaria, Animais de Estimacao, Auto e Moto, Bricolage e Presentes.

Cada pedido carrega ate 24 produtos. **Carregar mais** inclui a pagina seguinte e elimina duplicados. Pesquisa, preco maximo, desconto minimo, etiqueta e ordenacao aplicam-se apenas aos resultados carregados. Os contadores distinguem resultados visiveis, carregados e o total da fonte. Ofertas marcadas como expiradas sao ocultadas por defeito.

**Mais recentes** preserva a ordem da fonte. Os restantes criterios sao locais: menor/maior preco, maior desconto percentual, maior poupanca absoluta e nome A-Z. Nao foi encontrado um seletor de ordenacao no site consultado. A app nao descarrega todos os milhares de produtos para ordenar globalmente.

Atualizacao automatica a cada cinco minutos apenas com a pagina visivel e fora dos guardados; volta a primeira pagina. Atualizar manualmente tambem volta a primeira pagina e respeita a cache. Cache em memoria com duracao de cinco minutos; em caso de falha, um aviso identifica dados anteriores com ate uma hora. Reiniciar elimina a cache.

## Guardados e privacidade

Favoritos limitados a 500 produtos, guardados no localStorage do navegador, associados a origem do Home Assistant. Nao sao sincronizados nem separados por utilizador numa sessao partilhada do mesmo navegador. Nao estao nos backups da app; limpar os dados do navegador remove-os. Os precos guardados sao snapshots da altura da selecao.

Sem analytics, cookies, scripts ou branding da fonte dentro da app. O backend consulta o site para resultados e imagens; o navegador recebe-os pela app. Os links curtos e parametros de afiliado originais sao preservados. Precos finais, portes, variantes, cupoes e outras condicoes devem ser confirmados na loja.

## Comprar na loja

1. Tocar na imagem, no titulo ou no botao de compra do produto. Os detalhes abrem dentro da app e o link e preparado na sessao atual do Home Assistant.
2. Quando Comprar na loja estiver disponivel, tocar nesse botao para abrir o endereco HTTPS externo original da oferta (por exemplo, o link Comprar na Amazon).

O navegador externo recebe apenas o endereco da loja, nunca a rota protegida Ingress do Home Assistant. Estes dois toques evitam a perda da sessao nas apps iPhone/Android e permitem abrir o endereco a partir de um gesto direto, sem pop-ups assincronos. O link fica em cache no servidor durante cinco minutos. Se a preparacao falhar, aparece Tentar novamente; nao e aberta a fonte como alternativa.

## Problemas frequentes

- **Nao aparece na loja:** confirmar URL, branch publica e atualizar os repositorios. Home Assistant Container/Core sem Supervisor nao suporta esta instalacao.
- **Instalacao demorada:** esta versao constroi a imagem no dispositivo; precisa de Internet e espaco disponivel. Ver os logs do Supervisor.
- **Sem promocoes:** atualizar, verificar acesso a fonte e logs da app. Alteracoes no HTML podem exigir uma atualizacao do extrator.
- **Imagem indisponivel:** a fonte pode ter removido a imagem; a app nao substitui imagens por produtos ficticios.
- **Erro 403 fora do Home Assistant:** esperado no contentor; usar Ingress, nao acesso direto a porta.
- **Erro 401 ao comprar na app movel:** nao abrir uma URL Ingress num navegador externo. Usar Comprar na loja depois de o link estar preparado na app; o destino deve ser um endereco externo, nao o servidor Home Assistant.
- **Favoritos diferentes:** sao locais ao navegador/origem, nao a conta Home Assistant.

## Estado e publicacao

Versao experimental sem validacao numa instancia real de Home Assistant. O GitHub Actions testa o pacote e constroi ambas as arquiteturas. Docker nao estava disponivel no ambiente de desenvolvimento inicial; as arquiteturas devem ser confirmadas pelo CI e por instalacao real antes de promover a stable.

Reportar problemas em [GitHub Issues](https://github.com/noesisaoliveira/ninjas_promotions/issues), indicando versao, arquitetura, categoria e logs sem dados pessoais.
