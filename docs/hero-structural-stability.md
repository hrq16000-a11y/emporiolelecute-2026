# Hero — validação estrutural, 24/11/2026

## Diagnóstico comprovado

O zoom transforma somente a imagem. Nos testes iniciais não mudou `scrollY`.
O deslocamento visual veio da altura do documento: durante a consulta dos slides,
o componente mostrava slides de texto maiores, depois substituídos pelos banners
reais. Imagens sem dimensões intrínsecas e um ResizeObserver que animava a altura
do palco a partir do slide ativo amplificavam o colapso. A compensação de header
usava uma variável inexistente (fallback 80px), com espaçamentos extras diferentes
em cada banner. Se o administrador reordenasse a Hero, ela também poderia receber
o scroll reveal aplicado por posição na Home.

## Correção

- `src/components/HeroSlider.tsx`: não renderiza conteúdo fictício enquanto consulta
  os slides; reserva as proporções dos banners já existentes, 963×565 e 1900×565.
  Todos os slides ocupam a mesma célula de um grid e contribuem para sua altura.
  A troca altera apenas visibilidade/opacidade; removida a animação da altura.
- `src/index.css`: proporções responsivas, estado ativo/inativo e espaço estável
  de cabeçalho. Zoom interno continua contido; sem transformação do palco.
- `src/pages/Index.tsx`: Hero excluída do scroll reveal mesmo quando reordenada.
- `e2e/hero-stability.spec.ts`: regressão de geometria em trocas e opt-out.
- `AGENTS.md` e `roadmap.md`: decisão estrutural e estado da rodada.

Imagens, textos, links, painel, catálogo, checkout, pedidos, banco e DNS preservados.
Não houve instalação de bibliotecas nem adição de efeitos.

## Medidas em CSS px

Altura é da seção `#inicio`, incluindo espaço do header, indicadores e selos.
São medidas comparáveis dentro de cada viewport, não valores fixos para qualquer
conteúdo futuro do painel.

| Largura | Antes: faixa no carregamento/trocas | Depois: faixa contínua | Topo no documento | scrollY sem interação |
|---|---:|---:|---:|---:|
| 390 | 502,67–1076 | 500,8125–500,8125 | 0 | 0 |
| 768 | 526,17–1312 | 574,375–574,375 | 0 | 0 |
| 1440 | 731,06–1057 | 750,203125–750,203125 | 0 | 0 |

## Homologação no navegador

Chromium real, 390×844, 768×1024 e 1440×1000; amostras a cada 50ms desde
a montagem. Capturas no início, meio e fim; verificações durante 7,2 segundos,
troca automática e trocas manuais. Dimensões, topo da seção seguinte e posição
da Hero não variaram nas animações. O elemento estrutural permaneceu sem transform;
a imagem apresentou transform durante o zoom. Nenhum erro de execução observado.

- Movimento reduzido pelo sistema: imagem sem transform, palco com mesma altura.
- Botão interno desligado: mesma geometria, troca manual disponível sem animação.
- Rolagem lenta/rápida e retorno ao topo: nenhuma alteração espontânea após parar.
- Menu móvel: abertura não altera a altura da Hero.
- Redimensionamento: dimensões se adaptam às proporções e voltam aos valores
  originais. Houve ancoragem normal do navegador de 18/48px ao mudar a largura
  depois de interações; não ocorreu durante zoom ou troca de slides.
- Navegação do catálogo para Home pelo logo: banner e medidas preservados
  nos três tamanhos (tolerância de 1px durante a transição de rota).
- Sem overflow horizontal nos tamanhos testados.

## Publicação e decisão

A publicação anterior foi verificada: HTTP 200 em
https://emporiolelecute.lovable.app/ e controle de animação disponível.
Isso não significa que a correção estrutural desta rodada esteja publicada.

**GO para a correção estrutural local; NO-GO para publicação nesta rodada.**
O proprietário escolheu corrigir segurança primeiro numa rodada separada.
A análise profunda anterior terminou com cobertura parcial e três alertas críticos
(relatório de busca, notificações de pedido e acesso a serviços privados), ainda
pendentes de verificação/correção. Nenhuma nova publicação foi solicitada.
Validação visual da versão estrutural em produção permanece pendente.

Skill local aplicado: `lelecute-storefront-qa`.

Testes finais: regressão E2E do banner aprovada, dois testes de preferência
de movimento aprovados, cinco testes do guard da loja aprovados e guard estático
PASS. Compilação automática da prévia: build OK.