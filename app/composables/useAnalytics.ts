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

  function trackOpenCampaign(slug: string, url?: string) {
    track('abrir_campanha', {
      iniciativa: slug,
      ...(url ? { url } : {}),
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

  /**
   * O termo digitado vai inteiro, e não só contado: é o que revela a cidade sem
   * cobertura e a Iniciativa que ninguém cadastrou (ver docs/adr/0007). Por ser
   * campo livre, está declarado em /privacidade em vez de prometido como
   * anônimo. Vai com as pontas cortadas para "gatos" e "gatos " serem o mesmo
   * termo no painel, e filtro vazio não gera evento nenhum.
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
    trackSearch,
    trackCadastroSuccess,
  }
}
