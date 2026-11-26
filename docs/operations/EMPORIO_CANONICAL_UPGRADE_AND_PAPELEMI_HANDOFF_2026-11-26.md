# Empório Lele Cute — Upgrade canônico e handoff PapeLemi
**Checkpoint:** 26/11/2026  
**Repositório:** `hrq16000-a11y/emporiolelecute-2026`  
**Produção:** https://emporiolelecute.com.br  
**Equipe Vercel:** `msolus`

## 1. Estado canônico do Git

| Item | Estado confirmado |
|---|---|
| `main` | `96fdfe0a15b3394a75969434c181e7e700a8497f` |
| PR #10 | Integrada; cinco commits preservados |
| PR #11 | Aberta, não integrada |
| Branch PR #11 | `fix/qa-stabilize-storefront-post-upgrade-20261126` |
| Primeiro commit PR #11 | `602f33d47c8008885f6fff8b744cd824421a6f29` |
| Último commit de implementação validado | `52444ed295963d338e0e66392c4f70057da925f3` |
| CI da PR #11 | Workflow `45877598798` — PASS |
| PR #9 | Aberta, Draft, frente separada de segurança |

O histórico da `main`, a PR #10, a branch original do upgrade e os commits existentes da PR #11 foram preservados. Não houve force push nem alteração direta na `main`.

## 2. Stack do upgrade

- React 19.3.1 / React DOM 19.3.1
- Vite 8.3.8 com pipeline Rolldown
- TypeScript 6.0.3
- Vitest 5.1.2
- Playwright 1.65.1
- Bun 1.4.5

## 3. PR #11 — escopo e homologação

A PR #11 contém correções de canonical/noindex, navegação de categorias e ocasiões, cálculo visual do item ativo em carrosséis transformados, alinhamento dinâmico quando há overflow, estabilidade da Home, galeria/PDP mobile, filtros, carrinho, fixtures reproduzíveis e testes de navegação/reload.

Arquivos alterados: 15. Não há migrations SQL, alteração de catálogo, preços, imagens comerciais, registros de clientes, pedidos ou pagamentos nesta PR.

**Resultado do workflow `45877598798`, no commit `52444ed`:**

| Gate obrigatório | Resultado |
|---|---|
| Vitest | PASS |
| Desktop Chromium | PASS |
| Tablet WebKit | PASS |
| Mobile WebKit | PASS |

A PR está tecnicamente homologada para revisão de integração. Ainda não foi feito merge nem publicação a partir dela.

## 4. PR #9 — segurança, em trilha separada

- PR: https://github.com/hrq16000-a11y/emporiolelecute-2026/pull/9
- Branch: `fix/round-2a-local-rls-test-isolation`
- HEAD: `7f4777767abba86abab5e7a45e62d157ecd2eb99`
- Base registrada: `16ac9da9aa1c92c541ce31bb86e1d0f4d20912e4`
- Estado: aberta, Draft
- Workflow local descartável: `45877362585` — SUCCESS

A inicialização do Supabase descartável foi concluída; o erro de bootstrap `cron.unschedule` deixou de bloquear a execução. Os testes locais de RLS, isolamento entre clientes, proteção administrativa e integridade do checkout passaram.

Foi adicionada à branch #9 a migration:

`supabase/migrations/20261126180600_server_authoritative_order_totals.sql`

Ela espelha a regra de preço autoritativo da migration Drizzle `0014_order_return_server_totals.sql`: subtotal, total e preço unitário são calculados no servidor a partir do catálogo, e não aceitos dos valores enviados pelo cliente.

O teste de adulteração enviava subtotal de R$ 0,01 para um produto cujo preço esperado era R$ 39,90. Após a migration na base local descartável, a homologação passou.

**Limite importante:** a migration foi aplicada somente no ambiente descartável do workflow. Não foi integrada na `main` nem executada no banco Production. A PR #9 continua independente e Draft.

## 5. Production — Vercel

| Verificação | Estado confirmado |
|---|---|
| Deployment Production atual | `dpl_9ACnH9Y8kgL3GGKUoq924C4fHcoV` |
| Estado | READY |
| Commit publicado | `96fdfe0a15b3394a75969434c181e7e700a8497f` |
| `emporiolelecute.com.br` | Domínio verificado |
| `www.emporiolelecute.com.br` | Domínio verificado; redirecionamento 308 para o principal |

O deployment acima é a Production atual, anterior à PR #11. Nenhum Preview foi promovido e nenhuma nova publicação Production foi feita neste checkpoint.

## 6. Gate de segurança que impede o release

O frontend de checkout utiliza a RPC `create_order_with_items`. A cadeia histórica de migrations Supabase contém uma implementação que aceita valores de subtotal/preço enviados pelo cliente. A migration Drizzle 0014 e a nova migration da PR #9 corrigem esse comportamento, mas não há evidência verificável de que a correção esteja aplicada ao banco Production.

O estado do banco gerenciado do Empório não pôde ser consultado por uma conexão Supabase disponível nesta execução. Os checkpoints anteriores também não registravam aplicação dessas migrations em Production.

Como o merge da PR #11 aciona a integração automática da Vercel com a `main`, publicar sem comprovar a autoridade de preços poderia colocar em Production um checkout com risco de adulteração financeira.

**Decisão deste checkpoint: HOLD de merge e publicação.** A PR #11 permanece aberta e homologada. Não executar migration em Production sem autorização explícita e janela controlada. Antes de integrar/publicar, é necessário comprovar por consulta somente leitura que a função Production já usa preços do catálogo, ou obter autorização separada para aplicar a migration de segurança.

## 7. Handoff para PapeLemi

Até a conclusão do gate de segurança e do release:

1. A referência canônica do Empório continua sendo `main` em `96fdfe0a15b3394a75969434c181e7e700a8497f`.
2. Não tratar a branch da PR #11 como motor integrado.
3. Não importar a branch Draft da PR #9 como estado de produção.
4. Manter dados comerciais, pedidos, usuários, credenciais e banco da PapeLemi independentes.
5. Após a liberação, atualizar este checkpoint com o SHA definitivo da `main`, o evento de merge da PR #11 e o deployment Production correspondente.

O SHA do merge ainda não existe porque a PR #11 não foi integrada.

## 8. Restrições preservadas nesta execução

- Nenhum force push.
- Nenhuma alteração direta na `main`.
- Nenhuma migration executada em Production.
- Nenhum pedido ou pagamento real criado.
- Nenhum dado comercial alterado.
- Nenhuma alteração de DNS ou secrets.
- Nenhuma PR substituta criada.
- Nenhum Preview promovido para Production.

**Próximo marco:** comprovação da autoridade de preços no banco Production; depois, merge Squash da PR #11 e uma única publicação Production pela integração já configurada.
