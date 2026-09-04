# Mapa das Patas 🐾

Diretório comunitário e open source de **Iniciativas de proteção animal no Brasil** (ONGs, associações, protetores independentes, projetos informais e abrigos), para que doadores encontrem e ajudem **com confiança**.

## Por que confiar

- **Toda chave de doação tem Fonte**: nenhuma chave PIX entra no site sem o link público oficial onde a própria Iniciativa a divulga.
- **Histórico público**: os dados vivem neste repositório; toda alteração fica auditável no Git.
- **Moderação comunitária**: todo cadastro passa por revisão antes de publicar.
- **CPF nunca é republicado**: iniciativas de pessoa física têm sua chave apontada para o canal oficial delas, nunca exposta aqui.

## Stack

[Nuxt 4](https://nuxt.com) + [@nuxt/ui](https://ui.nuxt.com) + [@nuxt/content](https://content.nuxt.com), gerado estático e hospedado no Cloudflare Pages. Gerenciador de pacotes: **pnpm**.

```bash
pnpm install    # instalar dependências
pnpm dev        # desenvolvimento
pnpm test       # testes (Vitest)
pnpm generate   # build estático
```

## Estrutura

- `content/iniciativas/*.yml`: uma Iniciativa por arquivo (o slug é o nome do arquivo)
- `shared/schema/`: o schema que valida toda Iniciativa (a regra nº 1: doação sem Fonte não entra)
- `CONTEXT.md`: glossário do domínio; `docs/adr/`: decisões de arquitetura
- `docs/confirmacao-por-link.md`: como uma Iniciativa confirma os dados (Selo Verificado) ou pede para sair

## Como contribuir

As regras de contribuição e moderação serão publicadas em CONTRIBUTING.md e na página "Como contribuir" do site (em construção, ver `.scratch/mapa-das-patas/`).

## Licenças

- **Código**: [MIT](./LICENSE)
- **Dados do diretório** (`content/`): [CC BY 4.0](./LICENSE-DATA), reuse à vontade, com crédito
