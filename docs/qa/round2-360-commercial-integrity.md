# Empório Lele Cute 360° — Rodada 2

24/11/2026. Correções incrementais de carrinho e consentimento; sem Rodada 3, alterações de dados reais, implantação ou publicação.

## Checkpoint e conflitos

| Item | Resultado |
| --- | --- |
| HEAD inicial local e GitHub main | `53b3158901990d4958b571f31a66031f94c90b49` — conferido via Henrique's GitHub API |
| PR #9 | Arquivos continuam no head `33378f2bd9d5b428a283cbddc210a7190241ae37`; nenhum arquivo da PR foi alterado |
| Escopo protegido | `.github/workflows/ci.yml`, `.github/workflows/local-security-qa.yml`, `docs/local-security-qa-round-2a3.md`, `scripts/local-security-qa.mjs`, `src/test/client-privacy.test.ts`, `src/test/rls-search.test.ts`, `supabase/functions/_tests/orders_rls_test.ts`, `supabase/seed.sql` |
| Ambiente isolado | Docker não disponível; endpoint loopback 54321 sem resposta. Não instalado ambiente adicional, não acessado backend compartilhado |
| Commit final | Commit que contém este relatório; hash informado na entrega/checkpoint Git |
| Créditos | Consumo exato não consultado/disponível nesta validação |

## Correções comprovadas

| Item | Antes | Implementado |
| --- | --- | --- |
| Preço desatualizado no carrinho | Carrinho persistido enviava valores sem releitura do catálogo | Consulta mínima de catálogo ativo antes do envio; atualiza preço, slug, nome, preço original e mínimo, preservando personalização/kit |
| Revisão de alterações | Valores corrigidos somente no retorno de pedido podiam divergir do que o cliente viu | Alteração interrompe envio, atualiza carrinho e exige novo clique após aviso; cupom é limpo para reaplicação sobre o novo subtotal |
| Itens inválidos/indisponíveis | Sem bloqueio antecipado no caminho de envio | Preflight rejeita itens inexistentes/inativos, quantidades não inteiras/negativas/zero e preços negativos/não finitos; falha conserva carrinho |
| Envio concorrente | Estado React sozinho não cobre duas chamadas síncronas | Lock em ref impede chamadas concorrentes; detecta mudança do carrinho durante consulta |
| Precisão visual | Soma de floats em múltiplos seletores | Totais compartilhados somam centavos inteiros; store e resumo usam o mesmo cálculo |
| Consentimento ausente/recusado | Hook de visitantes enviava init, pageview e heartbeat sempre; scripts publicitários sem gate | Fonte única de consentimento fail-closed; visitantes, leads, wrappers GA/Meta e fila PDP não enviam sem aceite |
| Consentimento corrompido | Cast aceitava qualquer string como status | Somente `accepted` e `rejected` válidos; demais valores e falha de storage ficam pending |
| Revogação | Sem ação acessível de reabrir preferências | Botão no rodapé; recusa remove identificadores opcionais e descarta fila; se scripts já executaram, sinaliza recusa e recarrega para encerrar listeners/timers |
| Banner | Texto truncado e controles pequenos em celular; timer sem limpeza efetiva | Texto completo, botões de 44px, organização mobile e limpeza de timer/listener |

### Integridade comercial: limites importantes

- Preflight de leitura **não é autorização de preço**: navegador continua não sendo fonte de verdade. Reaproveitado o RPC existente de criação e retorno de totais para WhatsApp, sem implementação paralela no banco.
- **Janela entre leitura e criação permanece não homologada**: se catálogo muda depois da consulta, somente um contrato atômico do servidor pode devolver uma divergência antes de persistir e exigir nova confirmação. Não criada migration nem alterado RPC de produção.
- A regra arquitetural existente declara cálculo no servidor a partir do catálogo. A última definição SQL histórica encontrada no repositório ainda contém leitura de `unit_price` do payload. Sem acesso ao ambiente isolado, isso impede provar paridade do servidor atual a partir da fonte histórica; encaminhar comparação de `pg_get_functiondef` no runner isolado antes de integrar/publicar o checkout.
- Nenhum preço real, desconto PIX, parcelamento, frete ou cadastro alterado. Frete continua a calcular via WhatsApp, conforme fluxo existente.
- Descontos/cupom, persistência atômica, preços históricos, idempotência em rede real e resposta a manipulação direta do RPC não foram homologados nesta rodada. O teste de navegador simula servidor; não prova cálculo/persistência real.
- Pedidos concluídos não foram consultados nem modificados. Sem cobranças ou notificações reais.

### Cookies e privacidade: limites importantes

- Consentimento é preferência no armazenamento da própria origem; não é cookie de autenticação nem credencial. Não há endpoint de alteração por cookies nesta mudança, portanto CSRF/HttpOnly não se aplicam a essa preferência local. Mensagens de outras origens não são aceitas como consentimento.
- Cookies de sessão gerenciados pela autenticação não foram alterados; Secure/SameSite/HttpOnly de cookies externos/autenticação não foram auditados em produção.
- Revogação remove cookies opcionais conhecidos acessíveis a JavaScript no host/domínios pais; não apaga cookies HttpOnly nem dados já enviados a terceiros. Reload interrompe scripts já carregados, mas não desfaz transmissão passada ou solicitações já em andamento.
- Cart/address/auth essenciais preservados. Não instalada plataforma externa ou dependência nova.

## Evidências de testes

- **221 testes aprovados**, 38 arquivos da suíte existente; inclui 12 de preflight, 12 de consentimento e teste novo de precisão monetária.
- Cinco testes do guard de vitrine e guard estático PASS: catálogo, Natal, rotas e SEO preservados por fonte; isso não equivale a crawler real.
- Lint direcionado dos novos helpers/testes/banner e `git diff --check`: PASS.
- Compilação automática: **build OK, 05:31:11 UTC**. Não executado build manual.
- Playwright em **390/1440** com todas as requisições externas interceptadas, incluindo backend compartilhado, scripts e WhatsApp: aceite/recusa/revogação; nenhuma chamada opcional antes do aceite/depois da revogação; preço sintético 9,99 → 12,50 exige revisão antes de criar; subtotal 37,50; indisponibilidade/falha preserva carrinho; uma criação após tentativa concorrente; totais retornados pelo servidor simulado na mensagem WhatsApp; sem overflow/erros de execução.
- Capturas inspecionadas em `/tmp/browser/round2`: `cookies-390.png`, `price-review-390.png`, `order-1440.png`; também produzidas equivalentes para os dois tamanhos. Arquivos temporários não são links persistentes.
- Rodada 1: testes existentes de privacidade/autorização/SSE reaproveitados; nenhum novo teste com RLS/auth/persistência real sem ambiente isolado. PDP não modificado, sua suíte passou; jornada PDP → carrinho com catálogo real não repetida.
- Avisos preexistentes do runner Vite/Vitest não impediram testes; não corrigidos fora deste escopo.

## Encaminhamento GitHub/Codex e decisão

**GO para revisão do código; NO-GO para integração operacional/publicação do checkout até os gates abaixo.** Não realizado merge, implantação, publicação, execução remota de workflow ou campanha.

1. Usar runner isolado existente da [PR #9](https://github.com/hrq16000-a11y/emporiolelecute-2026/pull/9), sem tocar produção ou criar nova infraestrutura; este relatório entrega o escopo ao revisor GitHub/Codex, sem disparar execução automaticamente.
2. No runner: confirmar versão efetiva do RPC e cálculo autorizado; testar quantidades/preços/discount/shipping forjados, cupom válido/inválido, arredondamento, produtos inativos, mudança de catálogo durante criação e proteção de históricos.
3. Fechar contrato atômico de divergência pré-persistência antes de considerar o requisito de mudança de preço totalmente atendido.
4. Homologar também Rodada 1: respostas públicas allowlisted, conta terceira negada antes de consulta, logs sem capability, SSE POST positivo e RLS reais; limite distribuído continua gate não resolvido.
5. Revisar consentimento com scripts/configuração reais em ambiente isolado e autorizar implantação/publicação explicitamente depois das verificações.

## Arquivos desta rodada

- `src/lib/cookie-consent.ts`, `cart-catalog.ts`, `cart-catalog.test.ts`, `cartTotals.ts`, `cartTotals.test.ts`, `analytics.ts`, `visitor.ts`.
- `src/hooks/useVisitorTracking.ts`.
- `src/components/CookieConsentBanner.tsx`, `TrackingScripts.tsx`, `Footer.tsx`.
- `src/pages/Carrinho.tsx`, `src/stores/cartStore.ts`.
- `src/test/round2-cookie-consent.test.tsx`, `round1-diagnostic-sinks.test.ts` (fixture de aceite para manter teste de redação).
- `AGENTS.md`, `roadmap.md`, este relatório.

Skills aplicados: `lelecute-commerce-experience` e `lelecute-storefront-qa`.