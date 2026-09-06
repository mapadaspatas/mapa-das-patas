# Como contribuir

O Mapa das Patas é mantido por pessoas como você. Há três formas de ajudar: cadastrar iniciativas, corrigir dados e revisar o que outras pessoas enviaram.

## Cadastrar uma iniciativa

Existem dois caminhos. Nos dois, o cadastro vira uma proposta pública, revisada por um moderador antes de aparecer no site.

1. **Pelo site, sem precisar de conta.** Preencha o [formulário de cadastro](/cadastrar). Ele envia a proposta por você.
2. **Pelo GitHub, para quem já usa a ferramenta.** Crie um arquivo em `content/iniciativas/` seguindo o modelo dos que já existem e abra um pull request. A validação automática aponta qualquer problema, campo a campo.

Para **corrigir** uma iniciativa que já está no site, abra a página dela e use o botão **"Sugerir correção"**. O formulário abre preenchido com os dados atuais.

## A regra nº 1: toda chave de doação precisa de Fonte

**Nenhuma chave PIX, vaquinha ou link de doação entra no site sem Fonte.** A Fonte é o link público do post ou da bio oficial onde a própria iniciativa divulga aquela chave.

É a Fonte que permite a qualquer pessoa, moderador ou doador, conferir que a chave é legítima. Cadastro sem Fonte não é aprovado, sem exceção.

## O que fazemos com dados pessoais

- **Só publicamos chave PIX de CNPJ.** CNPJ é um dado público de pessoa jurídica, e não de uma pessoa.
- **Chave de pessoa física fica de fora.** CPF, e-mail e telefone não são publicados, mesmo que a própria pessoa já os divulgue. No lugar, o site mostra o link do canal oficial onde a chave está, e quem doa copia a chave de lá.
- **A iniciativa continua no site do mesmo jeito.** Nome, descrição, animais atendidos, necessidades, redes e foto aparecem normalmente. O que não aparece é a chave.
- **Sair é fácil e sem discussão.** Se a iniciativa é sua e você não quer estar aqui, basta pedir. Veja a página de [privacidade](/privacidade).

## Selo Verificado

O selo marca as iniciativas que **confirmaram os próprios dados pelo canal oficial delas**, seja por mensagem direta do perfil oficial ou por e-mail institucional. A confirmação registra a data e o canal, e aparece na página da iniciativa.

Iniciativas sem selo aparecem normalmente. O selo é uma camada extra de confiança, concedida por um moderador depois da confirmação.

Na prática, funciona assim:

1. Procuramos a iniciativa pelo canal oficial que já está na página dela e mandamos um link de confirmação.
2. Ela abre o link, confere os dados item a item e escolhe com um clique: confirmar, sugerir uma correção ou pedir para sair.
3. Um moderador revisa e aprova. Só então o selo aparece.

Como o link chega apenas pelo canal oficial, temos certeza de que é a própria iniciativa respondendo.

## Como as contribuições são aprovadas

Toda proposta passa por duas etapas:

1. **Validação automática.** Um programa confere o formato de cada campo e exige a Fonte em toda chave de doação.
2. **Revisão humana.** Um moderador abre cada Fonte, confere se a chave aparece mesmo no canal oficial e aprova ou pede ajustes.

## Quero ser moderador

Moderadores revisam e aprovam cadastros. O caminho é contribuir com cadastros e correções de qualidade, participar das revisões e pedir para entrar no time. Convidamos quem contribui com consistência. Você vai precisar de uma conta no GitHub e de atenção às regras desta página.

## Contribuir com código

O site é feito com [Nuxt](https://nuxt.com), [@nuxt/ui](https://ui.nuxt.com) e [@nuxt/content](https://content.nuxt.com), e é publicado como páginas estáticas. Sugestões, relatos de problema e pull requests são bem-vindos. Antes de começar, leia o arquivo `CONTRIBUTING.md` no projeto do GitHub.
