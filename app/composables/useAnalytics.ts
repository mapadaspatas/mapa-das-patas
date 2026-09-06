export interface AnalyticsFilterPayload {
  search?: string
  state?: string
  city?: string
  type?: string
  species?: string
  need?: string
}

interface UmamiTracker {
  track: (eventName: string, data?: Record<string, string | number | boolean>) => void
}

/**
 * Composable para disparo de eventos de métricas via Umami.
 *
 * Em SSR ou quando o script não estiver carregado (ex.: desenvolvimento local sem ID),
 * as chamadas são silenciosamente ignoradas sem lançar erros.
 */
export function useAnalytics() {
  function getTracker(): UmamiTracker | undefined {
    if (typeof window === 'undefined') return undefined
    const maybeUmami = (window as unknown as { umami?: UmamiTracker }).umami
    if (maybeUmami && typeof maybeUmami.track === 'function') {
      return maybeUmami
    }
    return undefined
  }

  function track(eventName: string, data?: Record<string, string | number | boolean>) {
    const tracker = getTracker()
    if (!tracker) return

    if (data) {
      tracker.track(eventName, data)
    } else {
      tracker.track(eventName)
    }
  }

  function trackCopyPix(slug: string, target: 'key' | 'code') {
    track('copiar_pix', {
      iniciativa: slug,
      tipo: target === 'key' ? 'chave' : 'brcode',
    })
  }

  function trackShowQr(slug: string) {
    track('ver_qrcode', {
      iniciativa: slug,
    })
  }

  function trackOpenSource(slug: string, contexto: 'link_fonte' | 'pix_na_fonte') {
    track('abrir_fonte', {
      iniciativa: slug,
      contexto,
    })
  }

  /*
   * A plataforma vai junto da URL para o painel conseguir somar "quanto o
   * Vakinha recebe" sem agrupar URL a URL — cada campanha tem a sua. Link de
   * plataforma que não reconhecemos não gera o campo: melhor a lacuna do que um
   * balde "outros" que soma o que não tem nada a ver.
   */
  function trackOpenCampaign(slug: string, url?: string, platform?: string) {
    track('abrir_campanha', {
      iniciativa: slug,
      ...(url ? { url } : {}),
      ...(platform ? { plataforma: platform } : {}),
    })
  }

  function trackOpenSocial(slug: string, rede: string) {
    track('abrir_rede_social', {
      iniciativa: slug,
      rede,
    })
  }

  function trackShare(slug: string) {
    track('compartilhar_iniciativa', {
      iniciativa: slug,
    })
  }

  /*
   * O QR vai junto porque é a única escolha que o Cartão oferece, e a resposta
   * decide se vale o trabalho de mantê-la: se quase ninguém liga, o controle
   * some; se quase todo mundo liga, ele nasce ligado.
   */
  function trackPromote(slug: string, comQrCode: boolean) {
    track('divulgar_iniciativa', {
      iniciativa: slug,
      qrcode: comQrCode,
    })
  }

  /**
   * O termo digitado vai inteiro, e não só contado. Um contador diria quantas
   * buscas houve; o que precisamos saber é qual cidade ficou sem cobertura e
   * qual Iniciativa ninguém cadastrou, e isso só o termo em si revela. Por ser
   * campo livre, ele está declarado em /privacidade em vez de prometido como
   * anônimo: quem digita escolhe o que escreve ali. Vai com as pontas cortadas
   * para "gatos" e "gatos " serem o mesmo termo no painel, e filtro vazio não
   * gera evento nenhum.
   */
  function trackSearch(filters: AnalyticsFilterPayload) {
    const activeEntries = Object.entries(filters)
      .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : ''] as const)
      .filter(([, value]) => value !== '')
    if (activeEntries.length === 0) return

    track('filtrar_iniciativas', Object.fromEntries(activeEntries))
  }

  function trackCadastroSuccess(tipo: 'novo' | 'edicao') {
    track('cadastro_enviado', {
      tipo,
    })
  }

  return {
    track,
    trackCopyPix,
    trackShowQr,
    trackOpenSource,
    trackOpenCampaign,
    trackOpenSocial,
    trackShare,
    trackPromote,
    trackSearch,
    trackCadastroSuccess,
  }
}
