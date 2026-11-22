# Changelog

## 0.1.6

- Pesquisar o catalogo completo da fonte em Todas as categorias, em vez de apenas os produtos recentes carregados.
- Manter o termo na paginacao, separar a cache por pesquisa e cancelar consultas antigas durante a escrita.
- Preservar as variantes Only & Sons, only sons, onlysons e sons only na pesquisa global.

## 0.1.5

- Pesquisa tolerante a simbolos, acentos, maiusculas, espacos e palavras noutra ordem.
- Encontrar Only & Sons com only sons, onlysons ou sons only.
- Easter egg de Natal com gorro, neve, mensagem festiva e grinalda de pequenas luzes multicoloridas nas quatro margens.
- Ativacao por tres cliques no icone, desligamento automatico e respeito pelo movimento reduzido, sem bloquear os controlos.

## 0.1.4

- Resolver encurtadores Amazon no servidor e apresentar o URL HTTPS completo do produto antes de abrir a compra.
- Preservar os parametros de afiliado e limitar a resolucao a dominios conhecidos e quatro redirecionamentos.
- Acrescentar testes de encurtadores, cache, preservacao de parametros e bloqueio de destinos inseguros.

## 0.1.3

- Preparar o link de compra dentro da sessao Ingress e abrir apenas o endereco externo da loja.
- Evitar o erro 401 e a abertura de rotas protegidas em navegadores externos nas apps moveis.
- Mostrar o estado de preparacao da compra e permitir tentar novamente sem pop-ups assincronos.

## 0.1.2

- Clicar na imagem, no titulo ou na compra abre diretamente o destino do botao Comprar da loja.
- Preservar links curtos e parametros de afiliado originais, sem mostrar a pagina da fonte.
- Obter o link apenas no clique, com cache de cinco minutos e validacao dos destinos.
- Mostrar um erro da Ninjas Promotions se o link da loja estiver indisponivel.
- Manter os detalhes dentro da app e acrescentar testes da compra direta.

## 0.1.1

- Incluir as alteracoes locais em README.md e DOCS.md.
- Substituir a prerelease 0.1.0 pela 0.1.1, sem alteracoes funcionais.

## 0.1.0

- Primeira versao experimental da Ninjas Promotions para Home Assistant Ingress.
- Resultados reais recentes, 13 categorias e paginacao.
- Ordenacao local por preco, desconto, poupanca e nome.
- Pesquisa, filtros, estado expirado, detalhes, grelha/lista e favoritos locais.
- Marca original com icon e logo PNG.
- Cache, proxy de imagens restrito e protecao Ingress.
- Testes automatizados e workflows de validacao e prerelease.
- Instalacao real no Home Assistant ainda por validar.
