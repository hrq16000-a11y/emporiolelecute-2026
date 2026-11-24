# Rodada 7 — WhatsApp, movimento privado, segurança e SEO

Data: 24/11/2026. **Decisão: NO-GO para divulgação/publicação geral.** As correções descritas foram verificadas na prévia, mas a loja não recebeu um certificado de segurança integral.

## Entregas verificadas
- WhatsApp mantém posição na tela por portal no corpo do documento, fora do ancestral transformado: topo/meio/fim em 390, 768 e 1440px; delegação do botão do carrinho preservada. Checkout completo não repetido.
- Movimento público ligado por padrão, com preferência de redução do sistema respeitada. Controles públicos removidos; valores antigos do navegador ignorados.
- Controle **Animações ativas/reduzidas** no topo do painel autenticado de administrador, acima do conteúdo. Preferência por conta salva no banco, confirmada após navegação e recarga, e restaurada após teste. Ao sair do painel a preferência privada deixa de afetar a vitrine. Visitante e cliente não acessam o controle por URL direta.
- Banners e prévias mantêm geometria em 390/768/1440px. Redução do sistema interrompe reprodução na prévia; dois testes de estabilidade inicial/troca de slides passaram.
- Quinze serviços administrativos de SEO/mídia exigem administrador ou credencial privada de trabalhador. Foram testadas 30 recusas: visitante 401, cliente 403; chamada real de analytics por administrador retornou 200.
- Oito agendamentos existentes preservam horários e corpos, agora com cabeçalhos privados. A execução completa de cada rotina agendada não foi disparada para evitar exclusões/envios/custos.
- Exportações de usuários/clientes, diagnóstico e telemetria neutralizam fórmulas; corpos de requisições deixam de registrar dados de contato.
- Notificações de status escapam nomes e campos de rastreio; links precisam ser HTTPS. Testes de conteúdo passaram, mas nenhum email real foi enviado nesta rodada.
- Chat antigo sem histórico e com consumo de IA encerrado com 410; suporte atual por conta preservado.
- Geração pública de sitemap continua acessível; pedidos de email exigem permissão (visitante 401).

## Segurança: antes e depois
Contagem dos resultados persistidos consultados, não promessa sobre um scan futuro:

| Grupo | Antes | Após marcações verificadas |
|---|---:|---:|
| Análise de código | 57 avisos | 22 avisos |
| Análise de banco | 6 avisos + 9 informações | 6 avisos + 9 informações |
| Total | 63 avisos + 9 informações | **28 avisos + 9 informações** |
| Erros/críticos no conjunto consultado | 0 | 0 |

**35 avisos marcados corrigidos**, sem ignorar em massa. Outros grupos consultados não trouxeram achados naquele resultado; isso não equivale a certificar todas as integrações, inclusive Wiz. Nova análise profunda ainda pendente no fechamento; pode reabrir ou acrescentar alertas. O nível aqui é o do scanner, sem inferir audiência ou severidade por configurações de publicação.

### Riscos ainda ativos — não corrigidos nesta rodada
- Preços/subtotais enviados pelo cliente na criação pública de pedidos: exige endurecimento específico do fluxo comercial, que não foi alterado aqui.
- Escritas/leitura de rastreamento de visitantes e status de leads: autenticação de origem e integridade ainda exigem revisão.
- Preferências de notificações demonstram risco de alteração por conhecimento de código/email.
- Atualização/extração Instagram e alertas de acesso/roles têm alertas de autorização/abuso.
- Importação de backup permite campos arbitrários para administradores: requer allowlists e testes de restauração próprios.
- Uso da conta de transporte por requisições de frete precisa revisão de limites contra abuso.
- Informações de banco e permissões de teste administrativo permanecem registradas, sem serem declaradas falsas positivas.

Esses riscos impedem recomendar divulgação irrestrita como “100% segura”. Não se alteraram checkout, preço visível, DNS, pagamentos ou políticas de acesso às tabelas nesta rodada. Correções de funções do backend já foram implantadas para permitir testes; isso **não** publica o frontend.

## SEO — fatos reais e limites
- Organization única por renderização da Home, com logo real em /logo.webp, contatos e perfis configurados; sem horários, coordenadas ou endereço inventados. Corrigida duplicação intermitente por atualização assíncrona das configurações.
- Nenhum LocalBusiness duplicado é emitido. Busca estruturada aponta a /buscar?q=.
- Produto real inspecionado: **Lembrancinha Sabonete Coração Amore, R$ 5,25**, imagem presente na página. Oferta BRL válida, sem alegações não verificadas de estoque, frete grátis, devolução, validade artificial ou fabricante.
- HTML público do crawler também omite estoque e contagem inventada de uma avaliação; preço inválido omite oferta. Rascunho /como-e-feito não divulga conteúdo e retorna página indisponível/noindex.
- Sitemap público preservado. Logo novo precisa publicação do frontend para existir no domínio de produção; não se afirma que produção já possui o arquivo.
- Não foi realizada validação exaustiva de todos os produtos, listagens ou rich results externos; em especial outros ItemList dinâmicos ficam fora da garantia de unicidade desta validação.

## Evidências de testes
- 25 testes direcionados passaram (movimento, preço/schema, privacidade, emails e exportação); mais 4 testes existentes de limites de indexação/email passaram.
- Dois E2E de estabilidade passaram; guard estático da vitrine passou; lint direcionado e diferenças sem erros de whitespace.
- Último registro de compilação da prévia: build OK. Não foi executada compilação manual, reiniciado o servidor nem feito deployment do frontend.
- Playwright: movimento público e privado, controles, acesso direto, preferências salvas, prévias e SEO verificados conforme descrito. Telefone físico/tablet físico e produção não testados.

## Arquivos alterados
- `AGENTS.md`
- `e2e/hero-stability.spec.ts`
- `public/logo.webp`
- `roadmap.md`
- `scripts/secure-indexation-schedule.sql`
- `src/components/Header.tsx`
- `src/components/LocalBusinessStructuredData.tsx`
- `src/components/OrganizationStructuredData.tsx`
- `src/components/ProductStructuredData.test.ts`
- `src/components/ProductStructuredData.tsx`
- `src/components/ReducedMotionToggle.tsx`
- `src/components/WebSiteStructuredData.tsx`
- `src/components/WhatsAppButton.tsx`
- `src/components/admin/AdminMotionPreference.tsx`
- `src/hooks/useReducedMotion.test.tsx`
- `src/hooks/useReducedMotion.ts`
- `src/lib/business-schema.test.ts`
- `src/lib/business-schema.ts`
- `src/lib/jsonldPrice.test.ts`
- `src/lib/seoExport.ts`
- `src/lib/telemetry.ts`
- `src/pages/ProductPage.tsx`
- `src/pages/admin/AdminDiagnostics.tsx`
- `src/pages/admin/AdminLayout.tsx`
- `src/pages/admin/AdminTelemetry.tsx`
- `src/pages/admin/AdminUsers.tsx`
- `src/test/round7-security.test.ts`
- `supabase/functions/_shared/crawler-product-schema.ts`
- `supabase/functions/_shared/email-output.ts`
- `supabase/functions/_shared/operational-auth.ts`
- `supabase/functions/chat/index.ts`
- `supabase/functions/cleanup-orphan-product-images/index.ts`
- `supabase/functions/generate-sitemap/index.ts`
- `supabase/functions/media-backup-cron/index.ts`
- `supabase/functions/merchant-feed-audit/index.ts`
- `supabase/functions/notify-order-status/index.ts`
- `supabase/functions/prerender/index.ts`
- `supabase/functions/seo-bing-verify/index.ts`
- `supabase/functions/seo-checks/index.ts`
- `supabase/functions/seo-crawler-probe/index.ts`
- `supabase/functions/seo-daily-guard/index.ts`
- `supabase/functions/seo-gsc-analytics/index.ts`
- `supabase/functions/seo-gsc-coverage/index.ts`
- `supabase/functions/seo-gsc-snapshot/index.ts`
- `supabase/functions/seo-index-audit/index.ts`
- `supabase/functions/seo-jsonld-audit/index.ts`
- `supabase/functions/seo-semrush-snapshot/index.ts`
- `supabase/functions/seo-sitemap-auto-resubmit/index.ts`
- `supabase/functions/submit-sitemap/index.ts`
- `docs/qa/round7-release-review.md` (este relatório)

## Próximo passo
Aprovar uma rodada específica para riscos comerciais/privacidade remanescentes e aguardar o novo resultado de segurança antes de liberar publicação; domínio continua separado e requer preservar email.
