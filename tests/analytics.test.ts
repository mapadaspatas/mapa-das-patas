import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAnalytics } from '../app/composables/useAnalytics'

describe('useAnalytics', () => {
  const originalWindow = globalThis.window

  afterEach(() => {
    globalThis.window = originalWindow
  })

  it('não lança erro quando window.umami não está definido', () => {
    // @ts-expect-error testando ausência de window.umami
    globalThis.window = {}
    const analytics = useAnalytics()

    expect(() => {
      analytics.trackCopyPix('ong-exemplo', 'key')
      analytics.trackShowQr('ong-exemplo')
      analytics.trackOpenSource('ong-exemplo', 'link_fonte')
      analytics.trackOpenCampaign('ong-exemplo', 'https://apoia.se/ong')
      analytics.trackOpenSocial('ong-exemplo', 'Instagram')
      analytics.trackShare('ong-exemplo')
      analytics.trackSearch({ search: 'gatos', state: 'SP' })
      analytics.trackCadastroSuccess('novo')
    }).not.toThrow()
  })

  it('dispara eventos com payload correto quando window.umami está presente', () => {
    const trackMock = vi.fn()
    // @ts-expect-error mock do window.umami
    globalThis.window = {
      umami: {
        track: trackMock,
      },
    }

    const analytics = useAnalytics()

    analytics.trackCopyPix('ong-exemplo', 'key')
    expect(trackMock).toHaveBeenCalledWith('copiar_pix', {
      iniciativa: 'ong-exemplo',
      tipo: 'chave',
    })

    analytics.trackCopyPix('ong-exemplo', 'code')
    expect(trackMock).toHaveBeenCalledWith('copiar_pix', {
      iniciativa: 'ong-exemplo',
      tipo: 'brcode',
    })

    analytics.trackShowQr('ong-exemplo')
    expect(trackMock).toHaveBeenCalledWith('ver_qrcode', {
      iniciativa: 'ong-exemplo',
    })

    analytics.trackOpenSource('ong-exemplo', 'link_fonte')
    expect(trackMock).toHaveBeenCalledWith('abrir_fonte', {
      iniciativa: 'ong-exemplo',
      contexto: 'link_fonte',
    })

    analytics.trackOpenCampaign('ong-exemplo', 'https://apoia.se/ong')
    expect(trackMock).toHaveBeenCalledWith('abrir_campanha', {
      iniciativa: 'ong-exemplo',
      url: 'https://apoia.se/ong',
    })

    analytics.trackOpenSocial('ong-exemplo', 'Instagram')
    expect(trackMock).toHaveBeenCalledWith('abrir_rede_social', {
      iniciativa: 'ong-exemplo',
      rede: 'Instagram',
    })

    analytics.trackShare('ong-exemplo')
    expect(trackMock).toHaveBeenCalledWith('compartilhar_iniciativa', {
      iniciativa: 'ong-exemplo',
    })

    analytics.trackSearch({ search: 'gatos', state: 'SP', city: '' })
    expect(trackMock).toHaveBeenCalledWith('filtrar_iniciativas', {
      search: 'gatos',
      state: 'SP',
    })

    // Senão "gatos" e "gatos " seriam dois termos diferentes no painel
    analytics.trackSearch({ search: '  gatos de rua  ' })
    expect(trackMock).toHaveBeenCalledWith('filtrar_iniciativas', {
      search: 'gatos de rua',
    })

    analytics.trackCadastroSuccess('edicao')
    expect(trackMock).toHaveBeenCalledWith('cadastro_enviado', {
      tipo: 'edicao',
    })
  })

  it('não dispara evento de busca quando todos os filtros estão vazios', () => {
    const trackMock = vi.fn()
    // @ts-expect-error mock do window.umami
    globalThis.window = {
      umami: {
        track: trackMock,
      },
    }

    const analytics = useAnalytics()
    analytics.trackSearch({ search: '', state: '', city: '   ' })
    expect(trackMock).not.toHaveBeenCalled()
  })
})
