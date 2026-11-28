# Design engineering premium — análise e adoção Emil Kowalski

**Estado:** R0 + R1.1 — diagnóstico estático e baseline visual da Home; implementação NÃO iniciada.
**Data:** 27/11/2026 • **Repositório:** hrq16000-a11y/emporiolelecute-2026 • **Checkpoint analisado da main:** `96fdfe0a15b3394a75969434c181e7e700a8497f`.

Este documento é incremental. As regras locais de AGENTS.md, DESIGN.md, segurança, SEO, arquitetura, publicação, dados e funis prevalecem. Não autoriza alterações de runtime, instalações, custos, merge ou deploy. Não substitui a homologação visual da versão efetivamente publicada. R0 teve timeout do navegador; R1.1 registra abaixo a captura pública da Home. Nenhuma medição de performance, QA integral ou aprovação de produção é reivindicada.

## 1. Diagnóstico por projeto (evidência de leitura)

- **Contexto:** Loja artesanal premium / versão 2026.
- **Observação concreta:** AGENTS.md especifica store de redução de motion, palco estável do Hero e previews sem timers reduzidos. MotionEnhancer e ScrollReveal existem; ScrollReveal.tsx:50 usa transition-all duration-700. motion ^14.14.0 está presente.
- **Stack presente (package.json):** motion ^14.14.0, react ^19.3.1, sonner ^2.0.8, @playwright/test 1.65.1, tailwindcss ^3.4.19, vite ^8.3.8, vitest ^5.1.2.
- **Home/entrada observada:** src/pages/Index.tsx.
- **CSS amostrado:** src/index.css (16 @keyframes; 7 referências a prefers-reduced-motion; 2 ocorrências de transição ampla). Contagem textual de declarações, não prova de uso/renderização ou defeito.
- **Documentação local a preservar:** docs/assinatura-visual.md
- **Oportunidade prioritária (hipótese a validar):** Usar assinatura visual coral/creme, foto real e composição autoral; revisar Reveal antes de adicionar efeitos; PDP pode ter gesto de galeria ou depth 3D discreta com fallback estático; vitrines mantêm stage estável.
- **Limite local:** Preservar contratos do Hero, SSR/prévia, catálogo, CEP, checkout e autorização. Não alterar PRs #9/#11, preferências nem sistemas de pagamentos.

## 2. Fonte primária e repertório

Fonte verificada: [emilkowalski/skills — revisão 64eb3deb](https://github.com/emilkowalski/skills/tree/64eb3deb9a5fbfa041faf783e0bc3fd635872e9c). Consultar `SKILL.md` do módulo e, quando necessário, RECIPES/STANDARDS antes da implementação. Esta é uma síntese autoral de princípios adaptados à aplicação; não instala nem executa scripts externos.

| Módulo | Uso no próximo trabalho visual |
| --- | --- |
| emil-design-eng | Refinar origem, feedback, legibilidade e detalhes; calibrar critérios de gosto |
| find-animation-opportunities | Ler UI e código, inventariar oportunidades e rejeições sem editar |
| remove-animations | Subtrair loops/reveals e atrasos que não se justificam |
| improve-animations / review-animations | Auditar componentes existentes e propor ajustes isolados |
| animate / animation-vocabulary | Escolher propósito, curva, duração, propriedade, entrada/saída e vocabulário |
| choreograph | Definir lead, apoio, simultaneidade, interrupção e o que permanece imóvel |
| animation-performance | Medir paint, layout, custo JS, frames, camadas e regressões |
| mobile-native / gestures | Touch, safe areas, hover, teclado, swipe e controle interrompível |
| apple-design | Continuidade espacial e adaptação da interação, sem copiar interfaces |
| prototype | Comparar duas ou três composições em branch local, inclusive versão sem motion |
| break-ui | Testar dados extremos, vazio, erro, loading, nomes longos, zoom e viewport |
| learn-taste | Registrar decisões confirmadas e seus motivos em DESIGN.md ou documento equivalente |
| pick-ui-library / ask-emil / ask-sonner | Escolher mecanismo mínimo e reaproveitar componentes existentes; módulos específicos só quando necessários |

Módulos mobile nativos (animate-expo/write-swift) não são aplicáveis por padrão a uma aplicação web. Não atualizar dependências só para cumprir esta diretriz; validar licença, SSR, bundle e compatibilidade se houver necessidade real. Referências anteriores (TasteSkill, Transitions.dev, React Bits, GSAP/Lottie/3D) são complementares quando compatíveis, não justificativa de efeitos obrigatórios.

## 3. Experiência premium: direção de arte primeiro

- Escolher uma personalidade (tipografia, paleta, contraste, espaço, forma, fotos/mídia reais, ritmo e assinatura) derivada da marca e da intenção de cada página.
- Estruturar o primeiro viewport para explicar o benefício e ação primária; evitar padrões repetitivos de cards/gradientes, sombras pesadas, excesso de badges e composição indistinguível entre projetos.
- Usar hierarquia editorial, alinhamento, espaço negativo e elementos visuais específicos ao negócio. Fazer teste sem marcas: a composição ainda comunica a proposta? Não copiar layout, ativos, textos ou marcas de sites premiados.
- Uma experiência de campanha rara pode ter um momento assinado (ex.: revelação localizada, galeria ou transformação explicativa). Não impor uma quantidade de animações; a ausência de motion pode ser a decisão correta.
- Nas rotas transacionais, busca, listas e administração, privilegiar velocidade, foco e estabilidade. Conteúdo, CTA, preços, resultados, navegação e formulários devem funcionar sem movimento, e conteúdo público/SEO deve ficar disponível antes da hidratação quando aplicável.

## 4. Critério de decisão de motion

Toda proposta precisa declarar **superfície, propósito, frequência, propriedade, easing, duração, fallback e interrupção**. Rejeitar quando não houver utilidade ou quando a frequência tornar o movimento incômodo.

| Superfície | Escolha inicial (adaptar tokens existentes) |
| --- | --- |
| Atalho de teclado ou ação repetida centenas de vezes | Imediato, sem animação ornamental |
| Press feedback ocasional | `scale(0.97)`, 100–160ms; manter hit target estável |
| Tooltip / popover pequeno | 125–200ms, origem no gatilho; tooltip seguinte sem atraso |
| Dropdown / seleção ocasional | 150–250ms, entrada/saída com resposta rápida |
| Modal / drawer | 200–500ms quando necessário, foco/escape, sem espera para interagir |
| Marketing / explicação rara | Só sequência com propósito, conteúdo legível e alternativa estática |

Se não existirem tokens equivalentes, avaliar curva de entrada/saída `cubic-bezier(0.23, 1, 0.32, 1)`, movimento entre estados `cubic-bezier(0.77, 0, 0.175, 1)` e drawer `cubic-bezier(0.32, 0.72, 0, 1)` da referência. Não adicionar sistema paralelo. Evitar ease-in em UI, transition: all, scale(0), layout properties animadas, loops decorativos e atraso no CTA. Usar transform/opacity, origem do gatilho, CSS para movimento previsível, springs para gesto realmente interrompível; `will-change` só com evidência. Não duplicar animação de pai e filhos; sem stagger em listas frequentes. Hover apenas em hover/pointer fine; respeitar reduced-motion e preferência local mais estrita, sem esconder conteúdo. Para 3D, orçamento específico, degradação estática e nenhuma dependência imposta.

## 5. Micro-rodadas futuras — sem autorização implícita de código

1. R1 — Auditoria visual real em Home e rotas críticas, 390/768/1440, registrar screenshots, fonte commit/deployment, interação, frequência, oportunidade e rejeição; comparar baseline de performance. Avaliar se os indícios acima se confirmam.
2. R2 — Direção de arte e protótipo de uma superfície, criar brief com paleta, tipografia, layout, mídia e assinatura; comparar com versão sem motion; evitar alterar contratos.
3. R3 — Implementar apenas o ajuste aprovado, em micro-PR; reusar tokens e componentes existentes. Validar teclado, foco, toque, reduced-motion, interrupção, loading/vazio/erro, textos longos e sem overflow.
4. R4 — Revisão por `review-animations`, `animation-performance`, `break-ui`; registrar antes/depois, LCP/CLS/INP ou gates locais e teste de uso real. Verificar que SEO, SSR, canonical, sitemap, dados, rotas e conversões não regrediram.
5. R5 — Aprender com feedback explícito; acrescentar decisões justificadas ao documento de design local. Merge/publicação só no fluxo aprovado do projeto; uma publicação quando necessária, sem Lovable Max sem autorização.

## 6. GO/NO-GO

GO para implementação somente com baseline visual, brief próprio da marca, propósito de cada movimento, seleção dos módulos pertinentes e uma micro-superfície definida. GO para release somente com gates locais, comparação real nos viewports, interação funcional, reduced-motion, zero regressão crítica de performance/conversão, sem novos riscos de acessibilidade, SSR/SEO e privacidade. NO-GO se movimento interferir na ação, se houver conteúdo invisível, template copiado, alteração comercial incidental, bloqueio de dados, dependência sem justificativa ou validação inconclusiva.

**Registro desta rodada:** leitura de referências e arquivos; documentação proposta/registrada em branch isolada. Nenhum código de aplicação, dependência, banco, DNS ou configuração de hospedagem foi alterado por esta diretriz.

## 7. R1.1 — baseline visual real: Home Empório Lele Cute (27/11/2026)

**Escopo:** https://emporiolelecute.com.br/; visita pública sem clicar em campanha, consentimento, carrinho ou realizar compra. Capturas após renderização de imagens, desktop 1440 CSS px (documento 1421 px) e mobile 390 CSS px (documento 371 px); nenhuma largura excedeu viewport nesta Home. Não equivale a QA de produtos/personalização/checkout, acessibilidade integral, Core Web Vitals ou vínculo comprovado com SHA de Production.

| Passo e evidência | Observação | Prioridade |
|---|---|---|
| 01 — Home desktop | Fotografia de produto real, coral/creme, tom artesanal e benefícios visíveis; campanha natalina tem composição distinta. No estado capturado o convite natalino, notificação de avaliação, aviso de cookies e botão WhatsApp disputam atenção, embora cada um possa ter função. | P0 |
| 02 — Home mobile | Convite natalino ocupa a maior parte do banner, encobrindo narrativa central; aviso de cookies cobre a próxima seção. Benefícios refluem em duas colunas. | P0 — hierarquia e gestão de camadas |
| 03 — Estado inicial | Primeiro snapshot apresentou palco do carrossel quase vazio com controles, depois a foto apareceu. Investigar preload/placeholder/estabilidade, sem alegar medida de LCP. No snapshot DOM inicial não apareceu h1, e a leitura posterior retornou sem h1; verificar semântica efetiva da Home para não depender só de texto rasterizado em banners. | P1 |

**Próxima intervenção cirúrgica proposta:** organizar exibição de campanha, notificações, WhatsApp e cookie consent (preservar escolhas e mensagens reais; sem bloqueio de interação). Garantir palco estável e mídia essencial visível, heading/CTA semanticamente legíveis. Em etapa separada, aprofundar estética editorial com fotografia, materialidade, detalhes e gesto discreto de galeria/personalização. Não usar 3D como ornamento global; adotar uma assinatura rara e fallback estático, respeitar reduced motion local e do sistema, proteger CEP, catálogo, checkout, documentação e outras PRs de segurança/compatibilidade.

**Evidência capturada nesta sessão** (arquivos locais exatos, não integram o Git): `05-emporio-1440.png` SHA256 `a94f43f913f325135c41ba3f26d0336262575905195894ea2c68da577762b125`; `06-emporio-390.png` SHA256 `fdaab9a62a9127ecfb967c9b3833c7f95ea29ae8095888468673e30eff879dfd`.


## 8. Continuidade do e-commerce — R12/12 do ciclo do ecossistema (27/11/2026)

Esta seção é o checkpoint mais recente deste playbook; a descrição de estado inicial no topo é histórica. Seguir sempre `AGENTS.md`, `docs/assinatura-visual.md`, `lelecute-commerce-experience` e `lelecute-storefront-qa`. O Empório tem identidade artesanal própria: **tátil, acolhedora, cuidadosa**. Fotografia verdadeira, coral/creme, composição editorial e no máximo dois gestos de assinatura por tela. Não replicar a estética de um portal de serviços ou da 0WEB.

### Evidência já homologada/publicada

- R8/10 da direção de arte: home e campanha com movimento seletivo; ver registro histórico em `ANTI_GENERIC_EXPERIENCE.md`. PR #16 integrada em `bc28ac906d5d2169a59ef9fef8d49e041d8f65c9`.
- R10–11: [PR #17](https://github.com/hrq16000-a11y/emporiolelecute-2026/pull/17) integrada com CI verde (Vitest, Chromium desktop/tablet/mobile). Main/Production `b2f4a35eaea0672b92b5d4bbd3c74d60688453e9`, Vercel `dpl_WESw2vEvDtGRtr4MAahuZM2g5p43` READY, aliases `emporiolelecute.com.br` e `www.emporiolelecute.com.br`. PDP pública da lembrancinha Anjinho Cute: troca de fotos observada, 150 ms computados no navegador, alvo de ampliação 44 × 44 px; viewport 1363, documento 1348. Não equivale a homologação de checkout, métricas reais de conversão ou todos os viewports.
- R12: na mesma PDP pública, foco em TEXTAREA de personalização (sem digitar nem enviar), ArrowRight mudou slide ativo de 1 para 0 (índices DOM zero-based). Antes: listener global de teclado e autoplay a cada 5 s em `ProductGallery.tsx`, conflito potencial também com a navegação das miniaturas. Candidato desta rodada: remover autoplay da galeria de produto (a campanha/hero não muda), limitar teclado à galeria/lightbox, respeitar o handler de miniaturas, remover timer de pausa e limpar gesto cancelado. Manter swipe, botões, ampliação, fotografia, transição, preços e demais contratos existentes. Validação real do candidato e deploy ainda pendentes no momento deste registro.

### Backlog incremental após este ciclo (prioridade, não aprovação automática)

| Ordem | Superfície e decisão | Evidência de aceitação |
|---|---|---|
| E1 — P0 | Galeria e lightbox: inspeção manual do produto, sem autoplay; restringir setas ao contexto correto. Revisar posteriormente nome acessível, único botão fechar, foco/escape, retorno ao gatilho, teclado e toque, inclusive muitas fotos; manter crop e tamanho. | Teste de 3+ fotos, setas em campo externo não trocam imagens; uma ação troca uma foto; swipe horizontal sem prender scroll; controle acessível >=44px; preferência local/sistema; não alterar catálogo. |
| E2 — P1 | PDP de personalização: hierarquia próxima da foto e do CTA; quantidade mínima, variantes e prazos claros; quando pertinente, seleção pesquisável com digitação e escolha, sem criar variantes nem expor dados privados. | Quantidades nos limites reais, campos obrigatórios, valores/prazos atuais, validação de erro e foco; preço servidor e payload intactos; sem pedido real em QA. |
| E3 — P1 | Busca e coleção: autocomplete acessível (teclado, toque, vazio, sem acento) e filtros úteis; conservar URL /buscar?q=, navegação/retorno e ranking canônico. Vitrine com fotografia como protagonista, não grade cega de cards iguais; medir primeiro as falhas antes de implementar. | Consulta com e sem acento, back/forward, links válidos, carregamento/erro/vazio, nomes longos; sem alterar semântica de ranking nem instalar bibliotecas sem necessidade. |
| E4 — P1 | Camadas e campanhas: rever evidência histórica de convite, prova social, cookies, exit intent e WhatsApp competindo. Na PDP desta rodada apareceu modal Antes de sair; qualquer ajuste deve respeitar o estado e consentimento, fechamento, foco e evitar sobreposição/insistência. 3D só em mídia/autoria, ponteiro fino, reduzido estático. | Screenshots 390/768/1440 da jornada, teclado, consentimento preservado, CTA e produto sempre visíveis; não afirmar que a coexistência histórica persiste sem nova auditoria. |
| E5 — P1 | Carrinho/orçamento/checkout: feedback breve e compreensível, retomada de estado e revisão de quantidade/personalização; fluxo real da loja, sem importar funis de serviço. Não alterar regra comercial, frete, preços, capacidade de rastreio, privacidade ou pagamentos. | QA isolada com fixtures; preservar preço calculado pelo servidor, CEP e WhatsApp, não efetuar compra real nem modificar dados de clientes. |
| E6 — P2 | Performance/SEO contínuos: imagens responsivas e mídia acima da dobra sem loading ornamental, medir LCP/CLS/INP no ambiente certo; canônico, robots, sitemap, JSON-LD/OG efetivos e URLs válidas; nenhuma mudança em indexação sem evidência. | Comparação antes/depois, mesmo cenário/viewports, gates reais (sem alterar thresholds); confirmação do SHA e domínio em Production; resultados e limitações explicitados. |

Uma micro-PR por problema comprovado, sem PR substituta desnecessária. Antes de cada item, registrar base, motivo, evidência e risco; após a correção, evidenciar 390/768/1440 (ou dimensões reais configuradas), guard, Vitest, build e Playwright afetado. Não forçar merge com falha, não executar fila Lovable nem Max, não confundir documento com release visual. Preserve PRs de segurança/compatibilidade #9/#11 e qualquer trabalho concorrente. As rodadas do backlog têm numeração própria e não reabrem artificialmente as 12 rodadas deste ciclo.
