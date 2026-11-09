---
name: lelecute-storefront-qa
description: Gates sem regressão para rotas, vitrine, catálogo, busca, SEO, orçamento e publicação da LeleCute.
---

# Storefront QA — Empório LeleCute

Adapta a disciplina 0WEB ui-quality-gates e portfolio-evolution-no-regression para e-commerce real.

## Sequência
1. Verifique branch principal, arquivos atuais e último deployment real; preview READY não significa produção publicada.
2. Defina escopo pequeno. Não modificar DNS, preços, integrações de pagamento, banco ou Supabase de maneira indireta.
3. Preserve busca sem acentos, URLs /buscar?q=, filtros, favoritos, carrinho, cálculo de frete/CEP, checkout, orçamento e controles de acesso.
4. Execute, com evidência: node --test scripts/check-storefront-guard.test.mjs; node scripts/check-storefront-guard.mjs; bun run test --run; bun run build. Rodar Playwright apenas nas superfícies afetadas, sem desabilitar gates.
5. Revise em mobile 360/390px, tablet 768px e desktop 1440px; CTA, teclado, foco, pop-ups, motion reduzido e sobreposição de widgets.
6. Verifique URL canônica, robots, sitemap, Open Graph e JSON-LD. Fonte React com metadados não prova que um crawler os viu; valide no site real. Previews protegidos podem ter header noindex.
7. Exija evidência de persistência dos leads/pedidos. Não inventar conversões nem marcar PASS em algo NÃO TESTADO.
8. Merge apenas após revisão. Diferencie CI parcial, preview e produção; não contorne limites da Vercel com deploys repetitivos.

## Limite
O gate estático é read-only, não executa chamadas HTTP e NÃO substitui teste de checkout/SEO ao vivo.
