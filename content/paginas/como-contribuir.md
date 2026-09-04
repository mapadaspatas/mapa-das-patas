# Como contribuir

O Mapa das Patas é mantido por pessoas como você. Há três formas de ajudar: cadastrando iniciativas, corrigindo dados e revisando contribuições.

## Cadastrar uma iniciativa

Dois caminhos, o mesmo destino: uma proposta pública revisada antes de publicar:

1. **Pelo site (não precisa de conta):** preencha o [formulário de cadastro](/cadastrar). Ele vira automaticamente uma proposta no nosso repositório.
2. **Por pull request (para quem usa GitHub):** crie um arquivo YAML em `content/iniciativas/` seguindo o schema do repositório e abra um PR. A validação automática aponta qualquer problema.

Para **corrigir** uma iniciativa existente, use o botão **"Sugerir correção"** na página dela. O formulário abre preenchido.

## A regra nº 1: toda Chave de Doação precisa de Fonte

**Nenhuma chave PIX, vaquinha ou link de doação entra no site sem Fonte**: o link público do post ou bio oficial onde a própria iniciativa divulga aquela chave. É o que permite a qualquer pessoa (moderador ou doador) conferir que a chave é legítima. Cadastros sem Fonte não são aprovados, sem exceção.

## Política de dados pessoais

- **Só publicamos chave PIX de CNPJ**, que é dado público empresarial.
- **Chave de pessoa física não é republicada aqui**: CPF, e-mail e telefone ficam de fora, mesmo que a própria pessoa já os divulgue. No lugar, usamos o tipo **"PIX no canal oficial"**: o site mostra o link oficial onde a chave está, e o doador copia a chave direto da fonte.
- **A iniciativa continua no site do mesmo jeito**: nome, descrição, animais atendidos, necessidades, redes e foto. O que não aparece é a chave.
- **Sair é fácil e sem discussão.** Se você é a iniciativa e não quer estar aqui, é só pedir: veja [privacidade](/privacidade).

## Selo Verificado

O selo marca iniciativas que **confirmaram seus dados por canal oficial** (DM do perfil oficial ou e-mail institucional). A verificação registra data e canal, e aparece na página da iniciativa. Iniciativas sem selo são exibidas normalmente: o selo é uma camada extra de confiança, concedida por um moderador após a confirmação.

Na prática funciona assim: nós procuramos a iniciativa pelo canal oficial que já está na página dela e mandamos um link de confirmação. Ela abre o link, confere os dados item a item e responde com um clique — "confirmo", "quero corrigir" ou "quero sair". O link chega só pelo canal oficial, e é isso que nos permite ter certeza de que é a própria iniciativa respondendo. Um moderador ainda revisa e aprova antes de o selo aparecer.

## Como as contribuições são aprovadas

Toda proposta passa por duas camadas:

1. **Validação automática:** o schema confere formato, enums e a regra da Fonte.
2. **Revisão humana:** um moderador confere as Fontes (a chave aparece mesmo no canal oficial?) e aprova ou pede ajustes.

## Quero ser moderador

Moderadores revisam e aprovam cadastros. O caminho: contribua com cadastros e correções de qualidade, participe das revisões e peça para entrar no time: convidamos contribuidores consistentes. Ferramentas: conta no GitHub e atenção às regras acima.

## Contribuir com código

O site é [Nuxt](https://nuxt.com) + [@nuxt/ui](https://ui.nuxt.com) + [@nuxt/content](https://content.nuxt.com), estático. Issues e PRs são bem-vindos, leia o `CONTRIBUTING.md` do repositório.
