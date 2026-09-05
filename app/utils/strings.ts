/**
 * Strings de interface centralizadas (pt-BR).
 * Nenhuma página deve hardcodar texto de UI: tudo vem daqui.
 */
export const strings = {
  siteName: 'Mapa das Patas',
  mission: 'Encontre e ajude com confiança quem protege animais no Brasil.',
  initiatives: {
    title: 'Iniciativas',
    viewAll: 'Ver todas as iniciativas',
  },
  map: {
    title: 'Onde estão as patas',
    hint: 'Escolha um estado',
    coverage: (initiatives: number, cities: number) =>
      `${initiatives} iniciativas · ${cities} cidades`,
    gaps: (n: number) =>
      n === 1
        ? '1 estado ainda não tem nenhuma iniciativa cadastrada.'
        : `${n} estados ainda não têm nenhuma iniciativa cadastrada.`,
    gapsHint: (examples: string) => `Se você conhece alguma ${examples}, o cadastro leva dois minutos.`,
    clearState: 'Ver o Brasil inteiro',
    stateGroup: (name: string, n: number) =>
      `${name} · ${n === 1 ? '1 iniciativa' : `${n} iniciativas`}`,
  },
  home: {
    title: 'Quem protege animais no Brasil, com fonte.',
    titleAccent: 'com fonte.',
    subtitle:
      'Nenhuma chave de doação entra aqui sem o link oficial onde a própria iniciativa a divulga. Confira antes de doar.',
    searchButton: 'Buscar',
    featuredTitle: 'Iniciativas para conhecer',
    featuredNoneVerified:
      'O Selo Verificado marca iniciativas que confirmaram seus dados conosco. As primeiras verificações estão em andamento.',
    trust: {
      title: 'Por que confiar',
      source: {
        title: 'Toda chave tem Fonte',
        text: 'Nenhuma chave PIX entra no site sem o link do canal oficial onde a própria iniciativa a divulga.',
      },
      history: {
        title: 'Histórico público',
        text: 'Os dados vivem em um repositório aberto: toda alteração fica registrada e auditável.',
      },
      moderation: {
        title: 'Moderação comunitária',
        text: 'Todo cadastro passa por revisão humana antes de ser publicado.',
      },
    },
    ctaTitle: 'Conhece uma iniciativa que merece apoio?',
    ctaText: 'Cadastre gratuitamente: não precisa de conta, só das informações públicas dela.',
    ctaButton: 'Cadastrar iniciativa',
  },
  card: {
    source: 'fonte',
  },
  register: {
    title: 'Cadastrar iniciativa',
    subtitle:
      'Compartilhe uma iniciativa que você conhece. O cadastro passa por revisão de um moderador antes de ser publicado.',
    correctionTitle: 'Sugerir correção',
    correctionSubtitle: (name: string) =>
      `Atualize os dados de ${name}. A correção passa por revisão de um moderador antes de ser publicada.`,
    dataSection: 'Sobre a iniciativa',
    name: 'Nome',
    type: 'Tipo',
    state: 'Estado',
    city: 'Cidade',
    cityPlaceholder: 'Selecione a cidade',
    cityNeedsState: 'Escolha o estado primeiro',
    citySearch: 'Buscar cidade…',
    cityEmpty: 'Nenhuma cidade com esse nome neste estado',
    description: 'Descrição',
    descriptionHelp: 'O que a iniciativa faz, em uma ou duas frases.',
    species: 'Animais atendidos',
    needs: 'Necessidades atuais',
    imageSection: 'Foto da iniciativa',
    imageHelp:
      'Opcional. Vale a foto de perfil do Instagram, o logo ou uma foto dos animais. Ela é recortada em quadrado e reduzida aqui no seu navegador antes do envio.',
    imageConsent:
      'Envie só imagem que a própria iniciativa publica ou autorizou. Ela fica pública no site e no repositório.',
    imageChoose: 'Escolher imagem',
    imageReplace: 'Trocar imagem',
    imageRemove: 'Remover imagem',
    imageInvalid: 'Não foi possível ler esse arquivo. Tente uma imagem JPG, PNG ou WebP.',
    imageReady: (kb: number) => `Imagem pronta para envio (${kb} KB).`,
    imageDropHint: 'Ou arraste a imagem para esta área.',
    imageDropActive: 'Solte a imagem aqui',
    socialSection: 'Redes e canais',
    socialHelp: 'Preencha as que a iniciativa tiver. Pelo menos uma ajuda na verificação.',
    socialFields: [
      { key: 'instagram', label: 'Instagram', help: 'Link do perfil ou nome de usuário.', placeholder: 'nomedousuario' },
      { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/…' },
      { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@…' },
      { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@…' },
      { key: 'x', label: 'X', placeholder: 'https://x.com/…' },
      { key: 'whatsapp', label: 'WhatsApp', placeholder: '+5511999999999 ou https://wa.me/…' },
      { key: 'site', label: 'Site', placeholder: 'https://…' },
      { key: 'linktree', label: 'Linktree / link na bio', placeholder: 'https://linktr.ee/…' },
    ],
    pixAtOfficialChannel: 'PIX (no canal oficial)',
    sourceClearedWarning: 'Você alterou a chave. Informe a Fonte onde a nova chave aparece.',
    connectionFailure: 'Falha de conexão. Tente novamente.',
    unexpectedFailure:
      'O envio falhou por um motivo que não conseguimos identificar. Tente novamente em '
      + 'instantes; se continuar, fale com a gente pela página de contato.',
    donationsSection: 'Como doar',
    sourceRule:
      'Regra nº 1: toda chave de doação precisa de uma Fonte, o link do post ou bio oficial onde a própria iniciativa divulga essa chave. Sem Fonte, o cadastro não é aprovado.',
    donationType: 'Tipo',
    donationKey: 'Chave',
    donationUrl: 'Link da campanha',
    donationKeyPlaceholder: '00.000.000/0000-00',
    donationKeyHelp:
      'CNPJ da iniciativa, formatado enquanto você digita. Aceita também o CNPJ '
      + 'alfanumérico (ex.: 12.ABC.345/01DE-35).',
    donationUrlPlaceholder: 'https://vakinha.com.br/…',
    donationUrlHelp: (platforms: string) =>
      `Link direto da campanha. Reconhecemos ${platforms} — outras plataformas de `
      + 'financiamento coletivo também valem, o link aparece por extenso na página.',
    platformMismatchTitle: (platform: string) => `Reconhecemos esse link: ${platform}`,
    platformMismatchText: (platform: string, expected: string) =>
      `${platform} costuma receber doação como "${expected}". Confira o tipo escolhido para o `
      + 'doador encontrar o que a página prometeu.',
    useDonationType: (expected: string) => `Usar "${expected}"`,
    donationSource: 'Fonte (link oficial onde a chave aparece)',
    addDonation: 'Adicionar forma de doação',
    removeDonation: 'Remover',
    personalKeyWarningTitle: 'Isso parece uma chave pessoal',
    personalKeyWarningText:
      'Só publicamos CNPJ como chave PIX. CPF, e-mail e telefone identificam uma pessoa, e não são republicados aqui. Use a opção "PIX (no canal oficial)": mostramos ao doador o link oficial onde a chave está.',
    usePixAtSource: 'Usar PIX no canal oficial',
    publicNoticeTitle: 'O que você enviar fica público',
    publicNoticeText:
      'O cadastro vira uma proposta pública no repositório do projeto, com tudo o que você digitou e enviou, inclusive a imagem, e o registro é permanente mesmo se a proposta for recusada. Não pedimos o seu nome nem o seu contato: envie só dados que a própria iniciativa já divulga publicamente.',
    publicNoticeLink: 'Como tratamos dados pessoais',
    submit: 'Enviar cadastro',
    submitting: 'Enviando…',
    turnstilePending: 'Espere a verificação anti-spam carregar para poder enviar.',
    fixErrors: 'Corrija os campos indicados e tente novamente.',
    successTitle: 'Cadastro enviado!',
    successText:
      'Ele virou uma proposta pública e será revisado por um moderador antes de aparecer no site. Obrigado por contribuir!',
    viewProposal: 'Acompanhar a proposta',
    newRegistration: 'Cadastrar outra iniciativa',
  },
  list: {
    description: 'Encontre iniciativas por região, tipo de trabalho e como você pode ajudar.',
    searchPlaceholder: 'Buscar por nome ou cidade…',
    stateFilter: 'Estado',
    cityFilter: 'Cidade',
    typeFilter: 'Tipo',
    speciesFilter: 'Espécie',
    needFilter: 'Necessidade',
    allMasculine: 'Todos',
    allFeminine: 'Todas',
    results: (n: number) => (n === 1 ? '1 iniciativa encontrada' : `${n} iniciativas encontradas`),
    emptyTitle: 'Nenhuma iniciativa encontrada',
    emptyHint: 'Tente ajustar a busca ou limpar os filtros.',
    clearFilters: 'Limpar filtros',
  },
  detail: {
    location: (city: string, state: string) => `${city} · ${state}`,
    howToDonate: 'Como doar',
    copyKey: 'Copiar chave',
    keyCopied: 'Chave copiada!',
    showQrCode: 'Ver QR Code',
    qrTitle: 'Doar por PIX',
    qrDescription: (name: string) =>
      `Leia o código no app do banco e confira se o recebedor é ${name} antes de confirmar.`,
    qrGenerated: 'QR Code gerado aqui no seu navegador a partir da chave publicada acima.',
    pixCode: 'PIX copia e cola',
    copyCode: 'Copiar código',
    codeCopied: 'Código copiado!',
    viewSource: 'Ver na fonte',
    sourceExplanation: 'Toda chave publicada aqui aparece também no canal oficial da iniciativa. Confira antes de doar.',
    pixAtSource: 'Pegue a chave com a própria iniciativa',
    openOfficialChannel: 'Abrir o canal oficial',
    keyPolicy: 'Só publicamos chave PIX de CNPJ. As demais ficam com a iniciativa, no canal dela.',
    openCampaign: 'Abrir campanha',
    openCampaignOn: (preposition: string, platform: string) =>
      `Abrir ${preposition} ${platform}`,
    needs: 'Como ajudar além do PIX',
    social: 'Redes e canais',
    noDonations: 'Esta iniciativa ainda não tem canais de doação cadastrados.',
    inKindTitle: 'Doação de itens',
    inKind:
      'A maioria das iniciativas também aceita doação de ração, remédios, sachês, produtos de limpeza e outros itens, direto com elas ou por parceiros. Fale pelos canais oficiais dela para combinar a entrega.',
    suggestCorrection: 'Sugerir correção',
    share: 'Compartilhar',
    shareText: (name: string) => `${name} precisa de ajuda. Veja como doar com segurança:`,
    shareLinkCopied: 'Link copiado!',
  },
  badge: {
    verified: 'Verificada',
    verifiedOn: (date: string) => `Dados confirmados pela iniciativa em ${date}`,
  },
  confirm: {
    title: 'Conferir os dados desta iniciativa',
    subtitle: (name: string) =>
      `Estes são os dados que o Mapa das Patas publica hoje sobre ${name}, montados a partir do que o canal oficial dela divulga em público. Confira item a item e escolha o que fazer.`,
    noTokenTitle: 'Falta o código do link',
    noTokenText:
      'Esta página só responde com o código que vai na mensagem que mandamos pelo canal oficial da iniciativa: é ele que nos permite ter certeza de que é você, e não outra pessoa falando por você. Abra o link inteiro, como ele veio na mensagem. Se o link tiver vencido, peça outro respondendo por lá.',
    dataTitle: 'O que está publicado hoje',
    kind: 'Tipo',
    location: 'Cidade',
    description: 'Descrição',
    needs: 'Precisando agora',
    social: 'Redes e canais',
    donations: 'Formas de doação',
    donationSource: 'Fonte',
    noDonations: 'Nenhuma forma de doação publicada.',
    noSocial: 'Nenhuma rede publicada.',
    actionsTitle: 'O que você quer fazer?',
    confirmTitle: 'Está tudo certo',
    confirmText:
      'A página passa a mostrar que os dados foram confirmados pela própria iniciativa, com a data. É só isso que o selo diz: que vocês conferiram. Não é auditoria das contas nem do uso das doações, e não é um aval nosso ao trabalho de vocês.',
    confirmAction: 'Confirmo, os dados estão certos',
    editTitle: 'Tem algo errado',
    editText:
      'Corrija antes de confirmar: o formulário abre preenchido com o que está publicado hoje. Selo em dado errado é pior que selo nenhum.',
    editAction: 'Sugerir correção',
    leaveTitle: 'Não quero estar no site',
    leaveText:
      'A página sai do ar na próxima publicação, sem perguntar o motivo e sem precisar de justificativa. Fica só o registro do endereço da página e da data, sem nenhum dado de contato de vocês, para que outra pessoa não cadastre vocês de novo depois.',
    leaveAction: 'Quero sair do site',
    leaveConfirmText: 'Tem certeza? Depois de sair, ninguém pode recadastrar esta página.',
    leaveConfirmAction: 'Sim, podem tirar',
    leaveCancel: 'Cancelar',
    sending: 'Enviando…',
    turnstilePending: 'Espere a verificação anti-spam carregar para poder responder.',
    successConfirmTitle: 'Confirmação registrada!',
    successConfirmText:
      'Um moderador confere e o selo aparece na página em seguida. Você não precisa fazer mais nada. Obrigado!',
    successLeaveTitle: 'Pedido registrado!',
    successLeaveText:
      'A página sai do ar na próxima publicação. Você não precisa fazer mais nada, e não vamos pedir explicação.',
    viewProposal: 'Acompanhar o pedido',
    reviewTitle: 'Já recebemos este pedido',
    failureTitle: 'Não deu para registrar',
    privacyLink: 'Como tratamos dados pessoais',
  },
  contact: {
    title: 'Contato',
    subtitle:
      'O Mapa das Patas é tocado por voluntários. Encontre o seu caso abaixo: alguns se resolvem na hora, sem precisar escrever para ninguém.',
    correction: {
      title: 'Um dado de uma iniciativa está errado',
      text: 'Chave desatualizada, cidade trocada, perfil que mudou de nome: abra a página da iniciativa e use "Sugerir correção". O formulário abre preenchido e a correção vai direto para revisão.',
      action: 'Ver as iniciativas',
    },
    owner: {
      title: 'Os dados são seus e você quer sair',
      text: 'Se a iniciativa é sua e você não quer estar aqui, escreva para o e-mail do projeto. Não precisa explicar o motivo: tiramos do site e do conjunto de dados na próxima publicação. Para corrigir sem sair, "Sugerir correção" na sua própria página é mais rápido.',
      deadline: 'Pedidos de titular são respondidos em até 15 dias.',
      privacyLink: 'Como tratamos dados pessoais',
    },
    verified: {
      title: 'Você é a iniciativa e quer o Selo Verificado',
      text: 'O selo registra que a iniciativa confirmou os próprios dados conosco, na data indicada: não é auditoria das contas dela nem do uso das doações. Em geral somos nós que procuramos, pelo canal oficial que já está na página: mandamos um link de confirmação, e um clique nele registra o selo. Se quiser adiantar, escreva do e-mail institucional ou mande DM do perfil que aparece na sua página, que enviamos o link por lá: é o que nos permite confirmar que é você.',
    },
    code: {
      title: 'Bug, sugestão ou vontade de contribuir com o site',
      text: 'O código do site é aberto. Prefira abrir uma issue no GitHub a mandar e-mail: ela fica visível para todo mundo que ajuda a manter o projeto, em vez de depender de uma pessoa só ler a caixa de entrada.',
      action: 'Abrir uma issue no GitHub',
    },
    channelsTitle: 'Canais do projeto',
    emailLabel: 'E-mail',
    email: 'contato@mapadaspatas.com.br',
    instagramLabel: 'Instagram',
    instagramHandle: '@mapadaspatas',
    instagramUrl: 'https://instagram.com/mapadaspatas',
    githubLabel: 'GitHub',
    githubRepo: 'mapadaspatas/mapa-das-patas',
    githubUrl: 'https://github.com/mapadaspatas/mapa-das-patas',
    githubIssuesUrl: 'https://github.com/mapadaspatas/mapa-das-patas/issues',
    dataNote:
      'Escreva só o que o pedido precisa. Não pedimos nem guardamos dado pessoal de quem entra em contato além do que você mesmo mandar na mensagem.',
  },
  errors: {
    pageNotFound: 'Página não encontrada',
    initiativeNotFound: 'Iniciativa não encontrada',
    notFoundText:
      'O endereço que você abriu não existe, ou a iniciativa que estava aqui saiu do ar. O diretório continua logo abaixo.',
    unexpectedTitle: 'Algo deu errado aqui',
    unexpectedText:
      'Tivemos um problema para montar esta página. Não é nada com os seus dados: tente de novo em instantes.',
    backHome: 'Voltar para o início',
  },
  nav: {
    about: 'Sobre',
    howToContribute: 'Como contribuir',
    privacy: 'Privacidade',
    contact: 'Contato',
    analytics: 'Estatísticas',
    register: 'Cadastrar',
  },
  footer: {
    licenses: 'Código sob licença MIT · Dados sob CC BY 4.0',
    madeByCommunity: 'Feito pela comunidade, para quem protege animais.',
    instagramLabel: 'Instagram do Mapa das Patas',
  },
} as const
