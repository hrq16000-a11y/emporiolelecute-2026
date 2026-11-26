# Registro canônico de continuidade — Empório Lele Cute → PapeLemi

**Atualizado:** 26/11/2026  
**Origem:** `hrq16000-a11y/emporiolelecute-2026`  
**Destino:** `hrq16000-a11y/papelemi-2026`

## 1. Fonte e sequência obrigatória

O Empório Lele Cute é a fonte canônica do motor, da aplicação e das funcionalidades estruturais. A PapeLemi é o destino da replicação/adaptação.

1. Estabilizar e homologar o Empório na origem.
2. Registrar checkpoint versionado.
3. Comparar a PapeLemi com esse checkpoint.
4. Transferir em lotes código, módulos e migrations compatíveis.
5. Adaptar identidade, configuração e conexão ao Supabase próprio da PapeLemi.
6. Provar isolamento entre lojas com dados sintéticos.
7. Integrar/publicar a PapeLemi somente após gates próprios e autorização.

Não transferir dados comerciais, pedidos, clientes, credenciais, secrets ou configurações privadas do Empório. Código e estrutura podem ser replicados; dados operacionais permanecem independentes.

## 2. Checkpoint remoto confirmado

- `main`: `96fdfe0a15b3394a75969434c181e7e700a8497f`.
- PR #10: integrada em 26/11/2026; merge commit `96fdfe0a15b3394a75969434c181e7e700a8497f`.
- Branch histórica `chore/force-dependency-refresh-20261126`: HEAD `533b763b5b5a71daa7a151ec036406d7b1ef2216`; preservar.
- PR #9: aberta, Draft, base `main`, HEAD `33378f2bd9d5b428a283cbddc210a7190241ae37`; não homologada.
- PR complementar de estabilização: branch `fix/qa-stabilize-storefront-post-upgrade-20261126`, iniciada na main confirmada.

## 3. Stack canônico instalado

- Bun 1.4.5; lockfile `bun.lock`.
- React/React DOM 19.3.1.
- Vite 8.3.8 + Rolldown 1.2.19.
- React Router DOM 7.18.7.
- TypeScript 6.0.3; ESLint 10.15.0; typescript-eslint 8.74.0.
- Vitest 5.1.2; Playwright 1.65.1.
- Supabase JS 2.119.2.
- Plugin React oficial/Oxc.
- Tailwind 3.4.19; react-day-picker 8.10.2, Recharts 2.15.4 e react-resizable-panels 2.1.9 mantidos em linhas compatíveis.

## 4. Evidência CI da main pós-merge

Workflow CI #45855389664, commit `96fdfe0a`:
- Vitest: SUCCESS.
- Playwright Desktop Chromium: FAILURE, 9 testes.
- Playwright Tablet/WebKit: FAILURE, 9 testes.
- Playwright Mobile/WebKit: FAILURE, 11 testes.
- Os logs identificam ausência do carrossel de categorias na home no ambiente E2E, falhas de canonical e, em mobile, regressões/fixtures da PDP.
- Os relatórios Playwright foram enviados como artefatos do workflow.
- Não considerar o upgrade integralmente homologado até fechar ou justificar os gates E2E.

O ESLint completo reportou 810 erros e 82 avisos também observados na main anterior; não desativar regras nem misturar correção ampla fora de escopo.

## 5. Correção complementar em andamento

Primeira correção de código: `CanonicalNormalizer` passa a observar inserções tardias no `head`, deduplicando canonical quando Helmet monta metadados após a consulta de SEO. Essa alteração requer CI direcionado e regressão E2E antes de ser considerada aprovada.

Carrosséis e PDP ainda exigem investigação específica. Os componentes contêm os seletores `categories-carousel`, `occasions-carousel` e `pdp-gallery-main`; a ausência no teste pode decorrer da configuração dinâmica da home, do estado do catálogo ou do fixture. Não inserir seletores artificiais nem mudar a configuração comercial para satisfazer testes.

## 6. Segurança — PR #9

A PR #9 introduz um workflow de Supabase descartável e testes sintéticos, mas continua Draft. A documentação da própria PR registra bloqueio de bootstrap SQLSTATE XX000 em migration histórica durante `cron.unschedule`; os testes reais de RLS não foram executados naquela tentativa. Portanto, não há evidência suficiente de isolamento efetivo ainda.

Antes de homologar:
- executar migrations somente em stack local descartável;
- remover tokens/secrets remotos do ambiente do job;
- bloquear egress dos containers;
- validar RLS com anônimo, dois clientes sintéticos e administrador;
- verificar pedidos, itens, preços, RPCs e funções privilegiadas;
- garantir CI convencional sem exceção permanente para a branch;
- nunca usar dados reais ou aplicar migrations em Production.

## 7. Limites desta rodada

Não fazer merge da PR complementar nem da PR #9 sem gates aprovados. Não publicar Production, alterar DNS, secrets ou banco hospedado. Não criar pedidos/pagamentos reais. A PapeLemi não recebe alterações nesta etapa.

## 8. Próximo checkpoint

Registrar SHA final, arquivos alterados, resultados CI por projeto, testes unitários/build/TypeScript, evidências de RLS local e pendências. Só depois iniciar a comparação e transferência integral do motor para a PapeLemi.
