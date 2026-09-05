# Contribuindo com o Mapa das Patas

Obrigado por ajudar! Este guia espelha as regras publicadas em [/como-contribuir](https://mapadaspatas.pages.dev/como-contribuir).

## Cadastrar ou corrigir uma Iniciativa

- **Sem conta no GitHub**: use o formulário do site (`/cadastrar`). Ele abre o PR por você.
- **Por PR direto**: crie/edite um arquivo em `content/iniciativas/<slug>.yml`. O slug é o nome do arquivo e vira a URL. O schema que valida tudo está em `shared/schema/initiative.ts`. A CI aponta qualquer problema campo a campo.
- **Cidade**: é município do IBGE, escrito como o IBGE escreve, e do estado informado — bairro e distrito não valem (`cidade: São Paulo` numa Iniciativa de Vila Prudente, com o bairro no nome e na descrição). A CI recusa o resto: a mesma cidade em duas grafias vira dois lugares no filtro da listagem. A lista fica em `shared/municipios.ts`, gerada por `pnpm build:municipios`.
- **Imagem** (opcional): o formulário reduz e envia junto com o cadastro. Por PR direto, adicione `public/imagens/iniciativas/<slug>.webp` (quadrado, 400px) e aponte `imagem: /imagens/iniciativas/<slug>.webp` no YAML. A CI reprova referência para arquivo inexistente.

## Regras de aprovação (aplicadas na revisão de todo PR)

1. **Regra nº 1, Fonte obrigatória**: toda entrada em `doacoes` precisa de `fonte`, o link público oficial (post ou bio da própria Iniciativa) onde aquela chave aparece. O moderador confere a Fonte antes do merge. Sem Fonte, sem merge.
2. **Só CNPJ é publicado como chave PIX**: é dado empresarial público. `pix-cnpj` é o único tipo de doação com `chave`. Vale o CNPJ numérico e o alfanumérico da IN RFB nº 2.229/2024 (`12.ABC.345/01DE-35`, letra sempre maiúscula, dois últimos dígitos numéricos): não recuse um por parecer estranho, a CI confere o formato.
3. **Chave de pessoa física nunca é publicada**: CPF, e-mail e telefone viram `tipo: pix-na-fonte` (o site aponta para o canal oficial, sem expor a chave), mesmo que a própria Iniciativa já os divulgue e mesmo com Fonte. A CI rejeita qualquer chave com formato de CPF, e-mail ou telefone. O porquê está em `docs/adr/0006`.
4. **Imagem com origem legítima**: só entra imagem que a própria Iniciativa publica ou autorizou, conferida no diff do PR. Nada de foto raspada de rede social (ver `docs/adr/0003`).
5. **Selo Verificado** (`verificado: { em, canal }`) só é concedido por moderador, após confirmação da própria Iniciativa por canal oficial. A confirmação é um clique: o moderador manda um link assinado pelo canal que a página publica (`pnpm token <slug> <canal>`) e o clique abre o PR pronto, alterando só o campo `verificado`. Revisar o PR substituiu interpretar a resposta — mas o merge continua sendo do moderador, e PR que mexa em outro campo não veio dali. O processo inteiro está em `docs/confirmacao-por-link.md`.
6. **Pedido de saída é atendido sem discussão**: a Iniciativa que pedir sai do diretório, e o slug vai para `content/removidos.yml` para não voltar num cadastro futuro. Nunca reverta a remoção de uma Iniciativa que pediu para sair, nem recadastre um slug listado ali. Pedido de eliminação (não só remoção) reescreve o histórico: ver `docs/adr/0005` e `/privacidade`.

## Fluxo de moderação

- PRs de Cadastro exigem CI verde + 1 aprovação de moderador.
- A revisão humana confere: as Fontes abrem? A chave aparece mesmo lá? Os dados batem com o canal oficial?
- Contribuidores consistentes podem ser convidados a virar moderadores.

## Código

```bash
pnpm install   # dependências
pnpm dev       # desenvolvimento
pnpm test      # testes (Vitest)
pnpm validate  # valida os YAML das Iniciativas
pnpm generate  # build estático
```

- Vocabulário do domínio: `CONTEXT.md`. Decisões de arquitetura: `docs/adr/`.
- Testes ficam nas costuras: schema, cadastro (nível HTTP), importação e filtros.
- Strings de interface ficam centralizadas em `app/utils/strings.ts` (pt-BR).

## Licenças

Contribuições de código entram sob MIT; dados do diretório sob CC BY 4.0. A licença aberta dos dados não libera reuso de dado pessoal fora da finalidade de doação: ver `LICENSE-DATA` e a política em `/privacidade`.
