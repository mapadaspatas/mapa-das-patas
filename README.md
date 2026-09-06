# Mapa das Patas 🐾

Site comunitário e de código aberto que reúne **quem protege animais no Brasil**: ONGs, associações, protetores independentes, projetos informais e abrigos. Chamamos cada um deles de **Iniciativa**. O objetivo é que quem doa encontre essas Iniciativas e ajude **com confiança**.

## Por que dá para confiar

- **Toda chave de doação tem Fonte.** Nenhuma chave PIX entra no site sem o link público oficial onde a própria Iniciativa a divulga.
- **Histórico público.** Os dados vivem neste repositório. Toda alteração fica registrada no Git, com autor e data, e qualquer pessoa pode conferir.
- **Moderação comunitária.** Todo Cadastro passa por um moderador antes de aparecer no site.
- **Chave de pessoa física nunca é republicada.** Quando a Iniciativa é uma pessoa, e não uma empresa, o site aponta para o canal oficial dela em vez de mostrar a chave.

## Como o site é feito

[Nuxt 4](https://nuxt.com) + [@nuxt/ui](https://ui.nuxt.com) + [@nuxt/content](https://content.nuxt.com), gerado como páginas estáticas e hospedado no Cloudflare Pages. O gerenciador de pacotes é o **pnpm**.

```bash
pnpm install    # instala as dependências
pnpm dev        # roda o site localmente
pnpm test       # roda os testes (Vitest)
pnpm generate   # gera o site estático
```

## Onde cada coisa fica

- `content/iniciativas/*.yml`: uma Iniciativa por arquivo. O nome do arquivo é o endereço da página dela no site.
- `shared/schema/`: as regras que todo arquivo de Iniciativa precisa cumprir. A regra nº 1 está aqui: doação sem Fonte não entra.
- `shared/schema/vocabulary.ts`: as listas fechadas que o site usa (tipos de Iniciativa, espécies, necessidades, estados).
- `content/removidos.yml`: as Iniciativas que pediram para sair. Elas não voltam num cadastro futuro.

## Como contribuir

As regras de cadastro, aprovação e moderação estão em [CONTRIBUTING.md](./CONTRIBUTING.md).

Quem prefere contribuir pelo site, sem conta no GitHub, encontra as mesmas regras na página [Como contribuir](https://mapadaspatas.com.br/como-contribuir), que também explica o Selo Verificado. Pedidos de saída e dados pessoais estão na página [Privacidade](https://mapadaspatas.com.br/privacidade).

## Licenças

- **Código**: [MIT](./LICENSE)
- **Dados do diretório** (pasta `content/`): [CC BY 4.0](./LICENSE-DATA). Reuse à vontade, dando o crédito.
