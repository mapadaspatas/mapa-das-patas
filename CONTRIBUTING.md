# Contribuindo com o Mapa das Patas

Obrigado por ajudar! Este guia tem as mesmas regras publicadas em [/como-contribuir](https://mapadaspatas.com.br/como-contribuir), com os detalhes técnicos para quem contribui pelo GitHub.

## Cadastrar ou corrigir uma Iniciativa

Há dois caminhos. Nos dois, o Cadastro vira um pull request, revisado por um moderador antes de entrar no site.

- **Sem conta no GitHub**: use o formulário do site em `/cadastrar`. Ele abre o pull request por você.
- **Por pull request**: crie ou edite um arquivo em `content/iniciativas/<slug>.yml`. O slug é o nome do arquivo e vira o endereço da página. As regras que o arquivo precisa cumprir estão em `shared/schema/initiative.ts`. A validação automática aponta qualquer problema, campo a campo.

Dois campos merecem atenção:

- **Cidade**: use o nome do município como o IBGE escreve, e do estado informado. Bairro e distrito não valem. Uma Iniciativa de Vila Prudente, por exemplo, fica com `cidade: São Paulo`, e o bairro pode ir no nome e na descrição. O motivo: a mesma cidade escrita de dois jeitos vira dois lugares diferentes no filtro do site. A lista de municípios está em `shared/municipios.ts` e é gerada por `pnpm build:municipios`.
- **Imagem** (opcional): pelo formulário, a imagem é reduzida e enviada junto com o cadastro. Por pull request, adicione o arquivo em `public/imagens/iniciativas/<slug>.webp` (quadrado, 400px) e aponte `imagem: /imagens/iniciativas/<slug>.webp` no YAML. A validação recusa referência a arquivo que não existe.

## Regras de aprovação

Valem para todo pull request e são conferidas na revisão.

### 1. Toda doação precisa de Fonte

É a regra nº 1 do projeto. Toda entrada em `doacoes` precisa do campo `fonte`: o link público oficial (post ou bio da própria Iniciativa) onde aquela chave aparece. O moderador abre a Fonte e confere antes de aprovar. Sem Fonte, não há merge.

### 2. Só CNPJ é publicado como chave PIX

CNPJ é dado público da pessoa jurídica. Por isso `pix-cnpj` é o único tipo de doação que tem o campo `chave`.

Vale tanto o CNPJ numérico quanto o alfanumérico, criado pela Instrução Normativa RFB nº 2.229/2024. O formato alfanumérico é `12.ABC.345/01DE-35`: letras sempre maiúsculas e os dois últimos dígitos sempre numéricos. Não recuse um CNPJ só por parecer estranho. A validação automática confere o formato.

### 3. Chave de pessoa física nunca é publicada

CPF, e-mail e telefone não entram, mesmo que a própria Iniciativa já os divulgue e mesmo com Fonte. No lugar, a doação recebe `tipo: pix-na-fonte`, e o site aponta para o canal oficial da Iniciativa, sem expor a chave. A validação automática rejeita qualquer chave com formato de CPF, e-mail ou telefone.

A regra vale também para texto livre. `nome` e `descricao` com trecho no formato de CPF, e-mail, telefone ou chave aleatória são recusados pela mesma validação, tanto no formulário quanto no pull request. CNPJ na descrição continua passando, com pontuação ou nos 14 dígitos: é dado público da pessoa jurídica.

**Por que a regra existe.** Uma chave publicada num diretório de doação não é um canal de contato. É o endereço para onde estranhos são orientados a mandar dinheiro. Quem tem a chave publicada fica exposto justamente ao golpe que o site existe para evitar. E a escala piora tudo: dezenas de chaves de pessoa física reunidas num arquivo aberto, legível por máquina e sob licença livre, são algo muito diferente do post que cada pessoa fez. É esse afastamento da divulgação original que enfraquece a base legal do projeto inteiro. CNPJ é a exceção porque é dado público da empresa, e porque o app do banco mostra o nome da pessoa jurídica na hora de confirmar. É exatamente a conferência que quem doa precisa fazer antes de transferir.

### 4. Imagem com origem legítima

Só entra Imagem que a própria Iniciativa publica ou autorizou. O moderador confere isso no diff do pull request. A foto de perfil do canal oficial vale, e é de onde a Imagem costuma vir.

Confira também o que a Imagem mostra. Print de post ou de story é recusado, porque é por ali que a chave PIX de uma pessoa acaba entrando escrita na tela. O que vale é foto de perfil, logo ou foto dos animais.

### 5. Selo Verificado só por confirmação da própria Iniciativa

O campo `verificado: { em, canal }` só é preenchido por moderador, depois que a própria Iniciativa confirma os dados pelo canal oficial dela.

A confirmação é um clique. O moderador gera um link assinado com `pnpm token <slug> <canal>`, apontando para o canal que a página da Iniciativa publica, e manda por esse canal. Quando a Iniciativa clica, o link abre um pull request pronto, que altera só o campo `verificado`. O moderador revisa e faz o merge. Um pull request que mexa em qualquer outro campo não veio desse link. O fluxo, do lado de quem recebe o link, está em [/como-contribuir](https://mapadaspatas.com.br/como-contribuir).

### 6. Pedido de saída é atendido sem discussão

A Iniciativa que pedir para sair sai do site, e o slug dela vai para `content/removidos.yml`, para não voltar num cadastro futuro. Nunca reverta a remoção de uma Iniciativa que pediu para sair, e nunca recadastre um slug listado ali.

Pedido de **eliminação** é diferente de remoção. Apagar o arquivo tira a Iniciativa do site, mas o dado continua legível nos commits antigos. A eliminação reescreve os commits que carregam o dado, para que ele suma também do histórico. Prazo e alcance estão em `/privacidade`.

## Fluxo de moderação

- Um pull request de Cadastro só entra com a validação automática verde e a aprovação de um moderador.
- A revisão humana confere: as Fontes abrem? A chave aparece mesmo lá? Os dados batem com o canal oficial?
- Quem contribui com consistência pode ser convidado a virar moderador.

### Pull request com chave de pessoa

Vale para chave de pessoa em qualquer campo, inclusive nome e descrição, e para print de post ou de story enviado como Imagem:

1. **Feche o pull request sem fazer merge.** Deixe um comentário curto, que não repita o dado. Por exemplo: "Fechado porque traz chave de pessoa. Cadastre de novo respondendo que a chave é de uma pessoa, com o link do post onde ela aparece."
2. **Apague a branch.**
3. **Recrie o Cadastro limpo**, com `tipo: pix-na-fonte` e a Fonte apontando para o post ou a bio onde a chave está.

**Nunca corrija na própria branch.** O repositório faz merge com merge commit. Se a chave fosse corrigida na mesma branch, o commit que a trouxe entraria no histórico do `main` junto com a correção, e o dado ficaria lá para sempre. Fechar e recriar é o que mantém a chave fora do histórico.

O pull request fechado continua legível no GitHub. Esse é o limite que o projeto declara nos textos públicos, e é por isso que o passo 1 é fechar na hora, sem pedir ajustes na branch.

## Contribuir com código

```bash
pnpm install   # instala as dependências
pnpm dev       # roda o site localmente
pnpm test      # roda os testes (Vitest)
pnpm validate  # valida os arquivos YAML das Iniciativas
pnpm generate  # gera o site estático
```

- As listas fechadas do site (tipos, espécies, necessidades, estados) ficam em `shared/schema/vocabulary.ts`. O schema e a interface usam a mesma lista.
- Os testes ficam nas costuras: schema, Cadastro (nível HTTP), importação e filtros.
- Os textos da interface ficam centralizados em `app/utils/strings.ts`, em pt-BR.

## Licenças

Contribuições de código entram sob a licença MIT. Os dados do diretório ficam sob CC BY 4.0. A licença aberta dos dados não libera o reuso de dado pessoal fora da finalidade de doação: veja `LICENSE-DATA` e a política em `/privacidade`.
