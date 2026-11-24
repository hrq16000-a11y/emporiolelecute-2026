# Rodada 8 — privacidade do rastreamento

Data: 24/11/2026. Escopo exclusivo: privacidade de pedidos e rastreamento. Infraestrutura encerrada conforme confirmação do proprietário; nenhuma investigação de DNS, domínio, IP, hospedagem ou e-mail.

## Vulnerabilidade e causa

O histórico apontava exposição de dados pessoais por código curto em `track-order`. A implementação encontrada já separava acesso público de acesso privado mediante identidade verificada; a resposta pública ainda incluía IDs internos e itens comprados. O código curto tinha aproximadamente 31 bits de entropia, mesmo depois da substituição de Math.random por aleatoriedade criptográfica. URLs de rastreamento podiam entrar na telemetria de visitas e erros.

## Correções desta rodada

- Lista explícita pública: código comercial, status, datas, entrega e resumo de valores já salvos. Nome, e-mail, telefone, endereço, notas, IDs internos, produtos comprados e personalização não são enviados ao visitante.
- Itens são consultados e enviados somente quando o servidor verifica administrador ou conta confirmada com e-mail correspondente ao pedido.
- Novos códigos: prefixo LC + 18 caracteres criptograficamente amostrados com rejeição de bytes enviesados (~93 bits). ID interno UUID permanece separado. Pedidos históricos não foram convertidos nem removidos.
- Limite por instância de serviço: 20 tentativas/minuto, armazenamento limitado e retorno 429 com Retry-After; aplicado a track-order e order-stream.
- Telemetria própria remove códigos de rotas, referências, mensagens e breadcrumbs. Carregamento/eventos explícitos de anúncios não são disparados na rota de rastreio.
- Página preserva status, entrega e resumo; itens e dados pessoais aparecem somente para acesso autorizado. Código longo quebra linha quando necessário.
- Nenhuma mudança em regras de preços, descontos, pagamentos, carrinho ou função comercial de criação de pedidos; somente o gerador de código usado pelo checkout foi atualizado.

## Testes e evidências

| Verificação | Resultado |
| --- | --- |
| 6 testes unitários de privacidade, autorização, entropia, limite e redação | PASS |
| 5 testes do gate de preservação + gate estático | PASS |
| Montagem automática do projeto | build OK, 04:42:21 UTC |
| Lint direcionado da página, gerador, utilitário, hook e testes | PASS |
| Pedido sintético público | HTTP 200; sem campos privados, IDs internos ou itens; status e total salvo preservados |
| Código inválido/inexistente | HTTP 400/404; sem dados privados |
| Consulta direta anônima a pedidos e itens | Nenhum registro retornado |
| Conta sintética confirmada, próprio pedido | Dados privados e personalização lidos de volta pela API e interface |
| Mesma conta, pedido sintético de terceiro | Dados privados ausentes |
| Administrador temporário | Pedido sintético de terceiro acessível pela API, consulta autorizada e interface |
| Rastreio público em 390px e 1440px | Status funcional; sem rolagem horizontal nem erros de execução; capturas inspecionadas |
| Telemetria própria capturada durante navegação | Sem código sintético nas requisições de visitas/erros |
| SSE com código inválido | HTTP 400 |
| 25 tentativas consecutivas no serviço implantado | Todas HTTP 400; HTTP 429 não comprovado entre instâncias |

Dois pedidos e um item exclusivamente sintéticos foram criados e removidos. A permissão administrativa temporária foi revogada. Nenhum registro real foi alterado. Não foram executados scans profundos ou homologação geral repetida.

## Scanner e achado crítico

Consulta de resultados existente: nenhum achado retornado nos cinco grupos. Horários disponíveis: análise de código 02:59 UTC (desatualizada); análise de banco 04:22 UTC (atualizada); dependências 04:19 UTC (desatualizada); grupos MCP 04:33 e 01:36 UTC. Isso não confirma nova cobertura completa nem segurança integral após estas alterações. Nenhum alerta foi ignorado ou marcado artificialmente como corrigido.

O caminho de exposição direta de dados pessoais foi verificado como protegido nos testes atuais. A condição histórica de 87 achados descrita no documento não corresponde aos resultados retornados agora; não é possível concluir que todos tenham sido tecnicamente resolvidos nesta rodada.

## Publicação e Git

As funções track-order e order-stream foram implantadas e verificadas no backend compartilhado; isso não é publicação do frontend. Não foi solicitada publicação do frontend. Alterações registradas no Git existente; o hash é informado junto à entrega.

O arquivo de CI local executa testes em main e não contém etapa explícita de deploy. Um deploy automático externo da Vercel conectado ao GitHub não pode ser confirmado apenas por esses arquivos. Não houve consulta de infraestrutura, criação de branch ou push manual. Portanto, não se afirma que um commit esteja isolado de eventual automação externa.

## Pendências reais e decisão

**NO-GO para divulgação geral conforme os gates exigidos nesta rodada.** A privacidade do caminho testado passou, mas:

1. O limite em memória é por instância e não bloqueou 25 tentativas no teste remoto; falta limitação persistente/distribuída para declarar proteção operacional contra enumeração, especialmente para códigos históricos curtos. Uma mudança mínima de banco deve ser proposta e autorizada antes de implantação estrutural.
2. SSE ainda recebe o código na URL; não foi comprovada remoção em logs de infraestrutura. Scripts de terceiros carregados em outras páginas podem continuar ativos após navegação interna; a ausência de captura desses serviços não é prova de ausência universal de exposição.
3. Não foi repetido o checkout comercial completo nem SSE positivo com mudança de status, para evitar pedidos comerciais e notificações. Testes verificaram valores sintéticos preservados e ausência de alterações na lógica comercial, não uma compra real.
4. Isolamento de eventual deploy automático externo não foi comprovado. Nenhuma publicação frontend foi acionada por ferramenta nesta rodada.

Encerrada a rodada; sem iniciar integridade comercial, campanhas ou investigações gerais.

## Arquivos alterados

- `supabase/functions/track-order/index.ts`
- `supabase/functions/track-order/privacy.ts`
- `supabase/functions/order-stream/index.ts`
- `supabase/functions/_shared/tracking-rate-limit.ts`
- `src/lib/order-code.ts`
- `src/lib/tracking-privacy.ts`
- `src/lib/telemetry.ts`
- `src/hooks/useVisitorTracking.ts`
- `src/components/TrackingScripts.tsx`
- `src/pages/RastrearPedido.tsx`
- `src/test/order-tracking-privacy.test.ts`
- `AGENTS.md`, `roadmap.md` e este relatório.