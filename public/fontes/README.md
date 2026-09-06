# Fontes do Cartão

As três instâncias estáticas que desenham todo Cartão gerado pelo projeto, aqui
versionadas em vez de baixadas na hora.

| Arquivo | Onde é usado |
| --- | --- |
| `bricolage-grotesque-700.ttf` | Títulos (`--font-display`) |
| `instrument-sans-400.ttf` | Texto corrido (`--font-sans`) |
| `instrument-sans-600.ttf` | Rótulos e destaques |

## Por que versionadas

Antes elas eram baixadas da API `css2` do Google para uma pasta fora do git. Isso
punha o build na dependência da rede e de a API continuar devolvendo TTF para quem
não manda `User-Agent` de navegador — no dia em que ela passar a devolver só woff2,
o build para de gerar imagem sem ninguém ter mexido em nada. 179 KB versionados
custam menos que essa dependência.

## Por que estáticas, e não os arquivos variáveis

O site carrega as duas famílias em arquivo variável, mas o resvg não aplica eixos
de variação: um arquivo variável chegaria nele sempre na instância padrão e o
título sairia em regular, sem aviso. São instâncias estáticas — nenhuma tem tabela
`fvar`.

## Por que em `public/`

Uma cópia, dois consumidores. O `scripts/build-social.ts` lê os arquivos do disco
para rasterizar com o resvg; o navegador busca os mesmos arquivos para embutir no
Cartão de divulgação, que precisa desenhar o texto sozinho, sem as fontes da
página. Fossem duas cópias, uma envelheceria em relação à outra e o mesmo Cartão
sairia com métrica diferente conforme quem o gerou.

## Licença

Ambas as famílias são SIL Open Font License 1.1, cujo texto está no `LICENSE` ao
lado, com o aviso de copyright de cada uma.
