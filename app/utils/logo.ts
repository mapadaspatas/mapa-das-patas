/**
 * Marca do site: pata com a almofada na silhueta do Brasil, num viewBox de
 * 24x24. Gerado por `scripts/build-logo.ts` a partir da malha do IBGE.
 * Não editar à mão; quem desenha é `SiteLogo.vue`.
 */
export const logoViewBox = '0 0 24 24'

/** Silhueta do Brasil (14 vértices, Catmull-Rom), a ser preenchida E traçada. */
export const logoPad = 'M15.7 13.32C15.34 12.27 12.53 12 11.71 11.42C10.88 10.83 11.27 9.93 10.76 9.82C10.25 9.72 9.05 10.83 8.63 10.79C8.21 10.75 8.56 9.57 8.24 9.6C7.92 9.63 7.18 10.77 6.71 10.95C6.24 11.12 5.83 10.24 5.41 10.65C5 11.05 3.64 12.49 4.2 13.38C4.76 14.27 7.8 15.03 8.8 15.99C9.79 16.95 10.14 18.4 10.17 19.14C10.21 19.88 9 20.02 9.01 20.45C9.02 20.87 9.76 21.96 10.24 21.68C10.71 21.4 11.24 19.41 11.85 18.75C12.46 18.09 13.25 18.65 13.89 17.74C14.53 16.84 16.06 14.38 15.7 13.32Z'

/** Traço da mesma cor sobre a almofada: engorda-a em 1 e arredonda as pontas. */
export const logoPadStroke = 2

/** Dedos preenchidos, em arco sobre a costa norte e nordeste. */
export const logoToes = [{"cx":7.2,"cy":5.2,"r":2.7},{"cx":13.2,"cy":3.6,"r":2.7},{"cx":18.8,"cy":7.6,"r":2.7}] as const
