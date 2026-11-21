# Ninjas Promotions

![Ninjas Promotions](ninjas_promotions/logo.png)

App independente para consultar produtos em promocao no Home Assistant, com identidade visual propria. Versao **0.1.1 experimental**.

- Promocoes recentes por defeito, seguindo a ordem da fonte (publicacoes e atualizacoes).
- As 13 categorias do site, pesquisa, preco maximo, desconto minimo e etiquetas.
- Ordenacao por recentes, preco ascendente/descendente, desconto, poupanca e nome.
- Imagens dos produtos, detalhes, favoritos locais e vistas de grelha/lista.
- Home Assistant Ingress, sem portas publicas ou acesso administrativo ao Home Assistant.

## Instalar no Home Assistant

Requer **Home Assistant OS** com Supervisor e acesso a Internet. Home Assistant Container/Core sem Supervisor nao instala apps desta loja. Nao e uma integracao HACS.

Depois de publicar estes ficheiros no GitHub:

1. Abrir **Definicoes > Apps > Loja de apps** (em versoes anteriores, **Complementos > Loja de complementos**).
2. No menu da loja, abrir **Repositorios** e adicionar:
   `https://github.com/noesisaoliveira/ninjas_promotions`
3. Atualizar a loja, instalar **Ninjas Promotions** e iniciar.
4. Ativar **Mostrar na barra lateral** e abrir a interface.

[Adicionar repositorio ao Home Assistant](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fnoesisaoliveira%2Fninjas_promotions)

Arquiteturas declaradas: amd64 e aarch64. Nesta versao, o Supervisor constroi a imagem no dispositivo; a instalacao inicial pode demorar. Nao foi validada numa instancia real de Home Assistant. Os workflows verificam a construcao das duas arquiteturas quando forem executados no GitHub.

## Desenvolvimento local

Requer Node.js 24 e npm. Na raiz do repositorio:

```powershell
npm --prefix ninjas_promotions ci
npm --prefix ninjas_promotions test
npm --prefix ninjas_promotions start
```

Abrir `http://127.0.0.1:8099`. O servidor local aceita apenas ligacoes loopback por defeito. No contentor, apenas o proxy Ingress pode aceder a interface. `HOST`, `PORT` e `INGRESS_ONLY` sao variaveis de desenvolvimento; nao e preciso configurar a app no Home Assistant.

```powershell
npm --prefix ninjas_promotions run test:live
npm --prefix ninjas_promotions run assets
```

Os testes normais nao dependem de Internet. `test:live` verifica o HTML real; executar quando se suspeita de alteracoes na fonte. As imagens da marca sao geradas a partir dos originais SVG com Sharp.

## Publicar e criar uma release

1. Rever as alteracoes e publicar na branch principal do repositorio. Nao incluir node_modules.
2. Confirmar que o workflow **Validate app** passou, incluindo os contentores, e testar a instalacao num Home Assistant real.
3. Criar e publicar uma tag `v0.1.1`. O workflow **Release** verifica os testes, as dependencias e ambas as arquiteturas, e cria uma prerelease com o arquivo do projeto.
4. Para novas versoes, manter config.yaml, package.json, a versao da API, Dockerfile e CHANGELOG.md coerentes antes de criar a tag correspondente.

O workflow publica uma prerelease quando recebe uma tag compativel com a versao da app. Adicionar um repositorio personalizado torna a app visivel nessa loja; nao implica aprovacao nem inclusao no repositorio oficial do Home Assistant. Depois da validacao inicial, recomenda-se publicar imagens multi-arquitetura em GHCR e configurar `image` para instalacoes mais rapidas.

## Dados, privacidade e limitacoes

Nao existe uma API publica documentada utilizada aqui: a app extrai os cartoes do HTML publico. O robots.txt consultado permite crawling, mas isso **nao concede licenca de reutilizacao**. Antes de uma distribuicao publica, verificar os termos e obter autorizacao para a recolha e exibicao dos dados e imagens. A licenca MIT do projeto nao se aplica aos conteudos de terceiros. A app nao e afiliada ao site nem ao Home Assistant.

Cada pagina carrega ate 24 produtos. A pesquisa, os filtros e as ordenacoes adicionais aplicam-se **apenas aos produtos carregados**; carregar mais para ampliar o conjunto. O site consultado nao apresentou um seletor de ordenacao, pelo que os criterios adicionais sao proprios da app, nao uma ordenacao global dos milhares de resultados da fonte.

Cache em memoria durante cinco minutos, com pedidos simultaneos agrupados. Se a fonte falhar, podem ser mostrados resultados da ultima consulta com ate uma hora, sempre com aviso. A atualizacao periodica, quando a pagina esta visivel, volta a primeira pagina. Mudancas no HTML, indisponibilidade ou bloqueios na fonte podem interromper a recolha.

Favoritos guardados apenas no localStorage deste navegador/origem, nao sincronizados entre utilizadores ou dispositivos e nao incluidos no backup da app. Os seus precos sao snapshots, nao monitorizacao de precos. Sem analytics, cookies da app, tokens ou chaves externas. Confirmar sempre preco, portes, cupoes e disponibilidade na loja.

Mais detalhes em [ninjas_promotions/DOCS.md](ninjas_promotions/DOCS.md). Licenca do codigo: [MIT](LICENSE).
