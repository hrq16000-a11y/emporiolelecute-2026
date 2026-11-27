# R10 — estabilização do candidato premium da vitrine

O PR #14 tem como base a produção 96fdfe0. A revisão R8 conserva a experiência 3D somente sobre mídia, pointer fino e preferência de movimento reduzido, com fotos reais, geometria e ações existentes. CI original: Vitest + guard aprovados; carrosséis e canonical falharam nas três matrizes Playwright.

## Correções R10

- Robots: o index.html continha um `index, follow` estático concorrente ao Helmet da rota. Omitir o default (index/follow é implícito), manter a restrição única quando filtros compostos, busca, tag ou página >1. Considerar filtros solicitados mesmo antes de resolver taxonomias. A rota canônica segue o contrato existente. Não alterar sitemap, dados ou navegação.
- Carrosséis: alinhamento seguro preserva centralização quando cabe, mas não torna o começo inacessível por overflow. Fixtures sintéticas e locais de categorias/ocasiões/home explicitam as precondições dos testes, independentes da visibilidade e do estoque configurados pelo administrador; nenhuma escrita no catálogo. Recusar consentimento no teste em vez de clicar sob modal. Teste de botão de ocasiões usa viewport de desktop realmente rolável (1024 px). Swipe não começa com um clique que navega para outra rota. Não remover verificações de teclado, foco, aria-selected e jitter.
- Build Vite e guard offline aprovados. No Chromium local (execução individual devido ao fechamento do processo ao reutilizar contextos), canonical múltiplos filtros com somente um robots, teclado de ambas as listas, botões de ambas, micro-scroll e ARIA categorias tiveram evidências positivas. Parte dos fluxos locais dependentes de rede não pôde completar: suíte Vitest 258/262, 4 timeouts de RPC/RLS/privacidade. A execução remota anterior teve unit/guard green; nova matriz obrigatória deve passar. Não afirmar checkout, RLS ou deploy validados por fixtures.
- Repositório/documentação mantém instruções TasteSkill, Transitions, React Bits, Emil Kowalski. Não instalar dependências nem publicar com falhas, não mexer em DB, DNS, checkout, preço, integração ou dados.

- Android Chromium 393px: swipe de categorias, swipe de ocasiões e canonical/noindex unitário: 3/3 (sem WebKit local; matriz remota necessária).
