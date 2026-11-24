# Correções autorizadas — três achados selecionados

## Escopo

Autorização: restringir reenvios a contas verificadas, exigir login para cotação com transportadora e iniciar histórico novo nos navegadores sem credencial. Checkout convidado e frete por WhatsApp preservados. Somente os três achados abaixo foram tratados; nenhum scan completo novo, migração, pedido real, cobrança ou publicação manual executado.

## Causa e correção

- `lov_finding_0c91c63b1e3dbad1`: consulta privilegiada por código sem autorização permitia descoberta de pedidos recentes e disparo de e-mails. O handler agora exige identidade confirmada, não anônima, validada no servidor; consulta restrita ao e-mail da conta antes de recuperar detalhes. Administrador precisa de papel consultado no banco. Falta de sessão, código inexistente, pedido alheio e pedido fora da janela têm a mesma negativa. Nenhum envio ou consulta de pedido para convidados. Administrador divergente pode notificar a loja, mas não confirma a caixa postal de outro cliente. Formulários de orçamento continuam enviando exclusivamente à caixa fixa da loja. A chamada opcional por código no checkout convidado agora é negada; a criação do pedido e WhatsApp continuam independentes, conforme autorizado.
- `lov_finding_96f54a0807f4fb32`: chamadas anônimas carregavam credenciais de transportadora, utilizavam cache/provedor e escreviam auditorias. Login não anônimo validado no servidor agora precede esses efeitos. O calculador orienta convidados a entrar na conta ou combinar frete pelo WhatsApp, sem consultar a transportadora. Catálogo ativo, bloqueio de carrinhos mistos indisponíveis e omissão de CEP em diagnósticos permanecem.
- `lov_finding_d763c38cd05f0709`: UUID e user-agent não comprovavam titularidade para alterar perfis, consentimento ou histórico. Todos os eventos agora exigem segredo aleatório de 256 bits cujo SHA-256 com domínio próprio deriva o identificador público. O segredo não é armazenado no banco; UUID histórico sem segredo não é reassociado. Navegadores legados recebem identidade nova. A mesma rotina pura é compartilhada entre cliente e função, inclusive leads e beacons. IDs de pageview enviados pelo cliente são ignorados; heartbeat resolve a última página do próprio visitante. Revogação apaga o segredo e cancela trabalho pendente. Redação recursiva omite a credencial de diagnósticos.

## Arquivos

- `supabase/functions/send-order-email/index.ts`
- `supabase/functions/calculate-shipping/index.ts`
- `supabase/functions/track-visit/index.ts`
- `supabase/functions/_shared/visitor-capability.ts`
- `src/components/ShippingCalculator.tsx`
- `src/hooks/useVisitorTracking.ts`
- `src/lib/visitor.ts`, `src/lib/cookie-consent.ts`, `src/lib/tracking-privacy.ts`
- `src/test/authorized-selected-access.test.ts`
- `src/test/round21-order-confirmation.test.ts`
- `src/test/selected-security-findings.test.ts`
- `src/test/round2-cookie-consent.test.tsx`
- `AGENTS.md`, `roadmap.md`, este relatório.

## Evidências

- 89 testes em sete arquivos: todos aprovados. Handlers reais executados com autenticação, banco e envio simulados em memória, sem acesso ao backend compartilhado.
- Regressões: 15 testes de totais, 12 de preflight do catálogo, 12 de consentimento; casos de pedidos confirmados próprios, administrador, negativos uniformes, transportadora sem efeitos antes de login, legado/titular/terceiro para todos os eventos, heartbeat e redação da credencial.
- Cinco testes do guard da vitrine e guard estático: aprovados.
- Lint direcionado de arquivos frontend, testes e helper novo: aprovado. Lint ampliado das funções existentes ainda acusa tipos `any` preexistentes e escape de regex preexistente; não foram mascarados nem refatorados fora do escopo. O hook mantém um aviso de comentário eslint agora desnecessário.
- Última observação de compilação automática: `build OK` em 2026-11-24T05:57:36Z; nenhuma compilação manual executada.
- Playwright 390/768/1440: checkout convidado concluído com pedido sintético único e total do servidor `37,50` no WhatsApp; handler de reenvio real nega o convidado sem e-mails; calculador apresenta opção WhatsApp sem chamadas à transportadora. Consentimento aceito inicia histórico novo e handler real valida a credencial. Sem erro de execução ou rolagem horizontal. Todo tráfego externo interceptado, sem persistência ou efeitos reais. Capturas em `/tmp/browser/selected-access/` são temporárias.
- `Carrinho.tsx`, `cart-catalog.ts` e `cartTotals.ts` permanecem sem alterações neste trabalho; contrato atômico do banco não foi modificado.

## Limites e decisão

GO para revisão das três correções. Validação operacional de sessão real, envio/cotação e persistência ainda requer ambiente isolado. Nenhum teste com conta simulada foi apresentado como homologação de conta real. Não foi consultada nem modificada infraestrutura ou a PR #9 nesta rodada; nenhum arquivo do runner isolado foi alterado.

Nenhuma ação manual de publicação ou implantação foi solicitada. Funções gerenciadas podem ser implantadas automaticamente pela plataforma; o relatório de encerramento anterior também documenta promoção automática por pushes em main. Este trabalho não reconfigura nem comprova o estado dessa promoção. Os gates de liberação comercial anteriores não foram removidos. Não iniciar outra rodada automaticamente.