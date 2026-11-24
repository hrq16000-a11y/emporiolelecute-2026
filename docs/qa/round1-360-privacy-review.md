# Empório Lele Cute 360° — Rodada 1

24/11/2026. Escopo: privacidade de registros, preferências autorizadas e atualização pública de pedidos. Não iniciadas as Rodadas 2/3.

## Git e continuidade

- Repositório oficial conferido pela conexão GitHub do proprietário: `hrq16000-a11y/emporiolelecute-2026`.
- HEAD oficial e local antes das alterações: `5038af3bf0ea0c1bedafda3c0a7b3aa000bcdb83`; nova consulta durante a rodada confirmou o mesmo HEAD.
- PR #9 aberta/draft: `33378f2bd9d5b428a283cbddc210a7190241ae37`, isolamento de homologação local. Oito arquivos alterados: CI, workflow local, relatório, script local, testes de RLS/privacidade e seed. Nenhum foi editado nesta rodada. Nenhum conflito detectado por interseção dos arquivos.
- Não houve merge, branch concorrente, force push, restauração ou execução do workflow remoto. O novo commit é informado na entrega; este relatório integra esse commit.

## Problemas comprovados e correções

| Item | Situação anterior | Resultado implementado |
| --- | --- | --- |
| reportError | Console recebia Error e contexto crus, inclusive código do checkout | Sanitização recursiva, normalização de Error e proteção contra ciclos; correlação e status preservados |
| Web Vitals | pathname persistido com código | Rota passa pela redação existente |
| Analytics | Wrappers e contexto do funil sem redação, links poderiam incluir código | Redação compartilhada antes dos eventos e fila; wrappers/funil não emitem na rota de rastreio |
| Telemetria | Redação por JSON não cobria chaves privadas nem objetos circulares | Sanitização por objeto; campos sensíveis omitidos e informação técnica preservada |
| Preferências | Pedido era consultado antes de autenticação | Conta confirmada e e-mail autorizado antes de qualquer consulta; query restrita ao e-mail confirmado; recusa uniforme 403 para dados não autorizados |
| Atualização SSE | Capability na query da URL | Cliente fetch/ReadableStream e endpoint POST; capability somente no corpo. GET com query é recusado |
| Logs das funções | Mensagens de banco/provedor ou objetos Error poderiam carregar dados privados | Mensagens técnicas fixas nos cinco caminhos tocados; push conserva somente status numérico |
| Mensagens da tela | Erro de login não era traduzido pela página | Códigos de autenticação/autorização traduzidos sem revelar existência de pedidos |

Reaproveitados: allowlist pública, autorização de detalhes privados, gerador criptográfico LC+18, limiter limitado por worker, redação de visitantes e breadcrumbs. Não alterados catálogo, preços, descontos, pagamentos, criação comercial de pedidos, RLS, DNS, configuração de produção ou arquitetura da aplicação. Transporte SSE evoluído no mecanismo existente, sem serviço/dependência novos.

## Homologação direcionada

- **22 testes aprovados**, três arquivos: 6 existentes de rastreio, 13 novos de privacidade/autorização/SSE e 3 de sinks de diagnóstico.
- Handler real de preferências executado após transpilar TypeScript com clientes simulados: ausência de sessão e conta não confirmada não consultam pedidos; conta de terceiro não consulta nem escreve para get/save/subscribe/unsubscribe; próprio pedido permite save e readback sintéticos.
- Handler real SSE com cliente simulado: GET retorna 405, POST retorna stream com ready e seleção pública explícita. Timers cancelados no teste.
- Navegador em **390/1440**: POST sem query abre stream simulado, evento status causa nova leitura e UI muda para Enviado; preferências sintéticas são salvas e lidas novamente; sem overflow global ou erros de execução.
- O navegador bloqueou/interceptou **todas** as chamadas ao backend compartilhado. Capturas inspecionadas: `/tmp/browser/round1/tracking-390.png`, `tracking-1440.png`, `preferences-390.png`, `preferences-1440.png`.
- Lint direcionado dos utilitários novos, hook e testes: PASS. `git diff --check`: PASS.
- Compilação automática após alterações: **build OK, 05:13:41 UTC**. Não executado build manual nem suíte geral/scans repetidos.
- Nenhum registro real ou sintético foi inserido no backend compartilhado; nenhuma conta, role, envio de e-mail ou pagamento foi acionado.

## Limites, pendências e decisão

**GO para revisão das alterações; NO-GO para publicação desta rodada.** Implementação e homologação isolada não equivalem a validação operacional com auth/RLS/rede real.

| Prioridade | Pendência | Encaminhamento |
| --- | --- | --- |
| Alta | Validar as funções novas num backend realmente isolado com sessão confirmada e persistência real | Usar runner GitHub/Codex da PR #9 após autorização; não alterar seus arquivos ou disparar execução automaticamente |
| Alta | Implantação coordenada do POST SSE e cliente; backend compartilhado ainda mantém contrato anterior | Aprovação explícita de deployment é necessária; até lá o polling existente preserva rastreio no preview |
| Alta | Limite de tentativas ainda por worker, não distribuído | Permanece limitação documentada da Rodada 8; solução persistente exige autorização, não foi criada migration |
| Média | Scripts externos já carregados podem observar URL no histórico da SPA; não há prova de ausência universal de coleta externa | Wrappers próprios são protegidos; auditoria externa permanece não realizada. URL visível ao cliente preservada |
| Média | Logs históricos e capturas de corpo por plataformas externas não foram auditados ou apagados | Novos sinks foram minimizados; não acessados registros reais ou configurações de infraestrutura |
| Baixa | Inventário completo do scanner e custo de créditos não consultados | Nenhum scan repetido ou finding artificialmente encerrado; consumo exato indisponível |

Privacidade pública anteriormente validada foi preservada pelos testes existentes. Não é declaração de loja integralmente segura. **Nenhuma função foi implantada e nenhuma publicação frontend foi acionada.** O salvamento Git pode sincronizar com o repositório pelo fluxo existente; isso não é uma publicação acionada por ferramenta, nem prova sobre automações externas. Não investigadas configurações de infraestrutura.

## Arquivos alterados

- `src/lib/tracking-privacy.ts`, `errorReporting.ts`, `webVitals.ts`, `telemetry.ts`, `analytics.ts`, `webPush.ts`, `order-stream-events.ts`.
- `src/components/TrackingScripts.tsx`, `src/hooks/useOrderStream.ts`, `src/pages/PreferenciasNotificacao.tsx`.
- `supabase/functions/notification-prefs/index.ts`, `order-stream/index.ts`, `track-order/index.ts`, `send-order-email/index.ts`, `notify-order-status/index.ts`.
- `src/test/round1-order-privacy.test.ts`, `src/test/round1-diagnostic-sinks.test.ts`.
- `AGENTS.md`, `roadmap.md`, este relatório.