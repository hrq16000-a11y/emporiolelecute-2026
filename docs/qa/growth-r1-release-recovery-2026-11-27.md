# Growth R1 — recuperação dos gates da PR #14

- Canonical: removida a criação imperativa concorrente de link e o timer de 400 ms. Fallback e canonical específico usam o mesmo Helmet. Teste de regressão verifica exatamente uma tag e precedência da taxonomia.
- Carrosséis: foco explícito por teclado continua selecionado durante a rolagem suave; roda, toque/arraste ou botão de rolagem devolvem a seleção à geometria. Respeita preferência por movimento reduzido. Teste cobre scroll intermediário e retorno da seleção ao gesto.
- O WebKit não suporta o construtor sintético de Touch usado pelo teste anterior. O teste agora verifica overflow, deslocamento nativo horizontal e mudança de seleção; não alega simular um gesto físico.
- PDP: fixture de teste local com produto fictício, imagem versionada e badge explícito; não altera catálogo nem estoque reais. APIs/telemetria da fixture são interceptadas. Asserções de geometria e limite visual de 1,5% preservados; baseline inédita deve ser inspecionada na captura real do navegador do CI antes de ser versionada.
- Gate da loja e 5 testes do guard aprovados localmente. Testes focados de canonical, carrossel e resolver: 14/14. A suíte ampla local tinha 6 timeouts de testes existentes de RPC/RLS por acesso ao Supabase; confirmação no CI é obrigatória. WebKit local sem bibliotecas do sistema; não se declara browser QA completo.
- Sem alterações no banco, mídia comercial, preço, funil ou publicação. Merge somente com gates verdes e publicação real verificada.

- Chromium Android emulado (393×851): layout da PDP, overflow, alvo de toque do favorito e badge aprovados (1/1); captura WebKit do CI ainda pendente. Build local aprovado.

- CI 46053663674: unidade, desktop e tablet aprovados; iPhone 20 passaram, 1 falhou somente por ausência de snapshot. Artefato 15225786282, ZIP SHA-256 `259a8f213088b34f7903cf352a51448365cae6f9580f8d338aa2240386cb0c80`.
- Revisão da captura iPhone **rejeitou** a imagem como baseline: breadcrumb oculto pelo header fixo, apesar de galeria e badge corretos. Chromium reproduziu com scrollY=0: header terminava em y=81 e breadcrumb começava em y=54. Causa: CSS global de densidade redefine pt-20.
- Corrigida reserva de 81/97/137px nas quatro variantes de conteúdo da PDP (carregamento, erro, ausência, produto), conforme alturas expandidas do header existente. Novo teste exige breadcrumb abaixo do header no primeiro viewport; estendida checagem geométrica ao tablet. Snapshot só após nova captura real aprovada, mantendo limite de 1,5%.
