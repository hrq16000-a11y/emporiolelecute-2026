# Registro de continuidade — Empório Lele Cute → PapeLemi
**Data:** 26/11/2026  
**Repositório de origem:** `hrq16000-a11y/emporiolelecute-2026`  
**Repositório de destino:** `hrq16000-a11y/papelemi-2026`

## 1. Decisão de arquitetura e sequência

O Empório Lele Cute é a **fonte canônica** do motor, da aplicação e das funcionalidades estruturais. A PapeLemi é o destino da replicação/adaptação.

Sequência obrigatória:
1. Atualizar e homologar o Empório na origem.
2. Registrar um checkpoint versionado e documentado da origem.
3. Comparar a PapeLemi com esse checkpoint.
4. Transferir em lotes os módulos e migrations compatíveis, adaptando identidade, configuração e integração ao Supabase próprio da PapeLemi.
5. Provar isolamento entre lojas com testes sintéticos.
6. Só então integrar e publicar a PapeLemi, mediante gates e autorização próprios.

Não desenvolver a cópia como se fosse a fonte. Não transferir dados comerciais, pedidos, clientes, credenciais, secrets ou configurações privadas do Empório para a PapeLemi. Código e estrutura podem ser replicados; dados operacionais permanecem independentes.

## 2. Estado confirmado do Empório

- `main`: `d01d843c266b5a32d03af22eeaac6eda4a7fcf0f`.
- PR #10 — [atualização de dependências e compatibilidade](https://github.com/hrq16000-a11y/emporiolelecute-2026/pull/10).
- Branch: `chore/force-dependency-refresh-20261126`.
- HEAD observado: `7ff5a07eb5a59ca15b0035ce9d4c89846db1635f`.
- PR #10 aberta, não Draft, base `main`, mergeável segundo o GitHub no momento da consulta. **Não integrar nesta etapa.**
- PR #9 — homologação de segurança/RLS em ambiente descartável — continua aberta e Draft, HEAD observado `33378f2bd9d5b428a283cbddc210a7190241ae37`. Não considerar homologada.
- PRs #1, #6 e #7 também permanecem abertas; reconciliar antes de qualquer fechamento ou merge.

## 3. Upgrade já realizado na PR #10

A PR #10 contém atualização do stack, com:
- Bun 1.4.5 e lockfile canônico `bun.lock`.
- Vite 8.3.8 + Rolldown 1.2.19.
- React/React DOM 19.3.1.
- React Router DOM 7.18.7.
- TypeScript 6.0.3 (TypeScript 7 foi descartado por incompatibilidade com a faixa suportada pelo typescript-eslint).
- ESLint 10.15.0; typescript-eslint 8.74.0.
- Vitest 5.1.2; Playwright 1.65.1.
- Supabase JS 2.119.2.
- Plugin React oficial/Oxc no lugar do plugin SWC.
- Tailwind permanece 3.4.19; componentes com dependências de versões anteriores foram mantidos em versões compatíveis.
- Correções de tipos Supabase/React 19, configuração TypeScript, Vite e setup Vitest.

Evidências declaradas na PR (ainda precisam ser consideradas junto ao CI remoto):
- instalação congelada, TypeScript e build de produção: PASS local;
- 261 testes unitários em 40 arquivos: PASS local;
- audit local: zero vulnerabilidades nos 913 pacotes examinados;
- 5 testes Playwright direcionados e 15 combinações de rota/largura: PASS local;
- não houve pedido, pagamento ou gravação comercial real.

## 4. CI remoto da PR #10 — bloqueio atual

Workflow observado: `45769029866`.
- Vitest unit: SUCCESS.
- Playwright mobile: FAILURE (13 falhas).
- Playwright desktop Chromium: FAILURE (10 falhas).
- Playwright tablet: FAILURE (10 falhas).

Os logs apontam sobretudo seletores ausentes para `[data-testid="categories-carousel"]` e `[data-testid="pdp-gallery-main"]`, além de timeouts em filtros de catálogo e falhas de navegação/reload. Não assumir que são todos preexistentes sem comparação reproduzível no HEAD da main. O CI está vermelho; não fazer merge nem publicar.

Outras pendências explicitadas na PR:
- ESLint completo: 810 erros e 82 avisos, reportados também no HEAD original da main (precisa preservar a comparação como evidência).
- Suíte Playwright completa com falhas de canonical/noindex, carrosséis e filtros.
- O projeto atual é Vite SPA com `createRoot`, não SSR; não inventar gate de hidratação SSR.
- Integração real Supabase/RLS não foi executada por falta de Supabase CLI/Docker no ambiente original. Nenhum dado Production foi alterado.

## 5. O que foi feito na PapeLemi — somente auditoria, não publicação

Repositório: `hrq16000-a11y/papelemi-2026`. Durante a auditoria foram observadas PR #13 (transferência do motor) e PR #15 (três commits adicionais de administração de pedidos). Os SHAs mudaram várias vezes durante a inspeção; o último HEAD da PR #13 observado naquela sessão foi `4013d259b5367d2aa2b1d955e078b5e838c404bd`, com 77 commits. Reconfirmar antes de qualquer ação.

Achados da auditoria naquele snapshot:
- O schema do engine importado tinha 150 tabelas estruturais e uma tabela operacional adicional; as tabelas comerciais não possuíam `store_key`.
- As políticas RLS do engine não demonstravam isolamento por loja; as funções privilegiadas, RPCs, Edge Functions, Storage e clientes administrativos precisavam de revisão de contexto de tenant.
- Catálogo e checkout estavam divididos entre `papelemi_engine` e `public`, com risco de seed inicial sem sincronização contínua.
- A migration de seed identificava registros próprios da PapeLemi por `store_key='papelemi'`; não foi observada instrução para importar pedidos/clientes comerciais do Empório.
- O schema `papelemi_engine` não estava aplicado no Supabase hospedado no momento da consulta.
- PR #15 estava aberta/Draft, com três commits preservados, ainda não reconciliados com a linha atual da PR #13.

**Limite da evidência:** esses achados são fotografias do snapshot consultado, não uma afirmação do estado atual. Revalidar o HEAD atual da PapeLemi quando começar a transferência. Nenhuma alteração foi enviada por esta auditoria à PapeLemi; nenhum merge, migration hospedada ou deploy foi executado.

## 6. Restrições de segurança e publicação

- Não alterar `main` diretamente.
- Não integrar PR #10 até corrigir/explicar os gates Playwright e concluir os gates pertinentes.
- Não misturar a homologação da PR #9 com o upgrade de dependências sem ambiente descartável isolado.
- Não executar migrations no Supabase Production nesta etapa.
- Não publicar Production nem mexer em DNS.
- Não importar dados, usuários, pedidos, clientes, tokens, secrets ou credenciais entre as lojas.
- Manter micro-rodadas: uma frente de implementação e validação por vez; evitar repetir suítes inteiras sem mudança de código ou justificativa.
- Registrar SHA, workflow, evidência e decisão a cada checkpoint.

## 7. Próxima ação

Retomar a atualização **na origem Empório**, usando PR #10 como frente de upgrade já existente. Primeiro corrigir os três jobs Playwright remotos com base nos logs, separando falhas reais de regressões e problemas de fixture/seletores. Em seguida reexecutar apenas os testes afetados, depois os gates completos necessários. Reconciliar as PRs #9, #1, #6 e #7 sem descartar trabalho.

Após o upgrade do Empório estar aprovado e integrado em um checkpoint controlado, produzir um manifesto de transferência por módulo/migration para a PapeLemi. Até lá, a PapeLemi não é a fonte de atualização.
