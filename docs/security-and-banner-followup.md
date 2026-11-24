# Segurança selecionada e estabilidade dos banners — 24/11/2026

## Correções de segurança

- Relatório de busca: termos e sugestões são inseridos com `textContent`, nunca como HTML; janela sem `opener` e sem script de impressão embutido.
- Atualizações por e-mail: identidade verificada e papel administrativo obrigatório antes de consultar o pedido. Destinatário, status, nome e rastreio vêm exclusivamente do pedido salvo. URLs executáveis de rastreio são descartadas e falhas do provedor deixam de retornar sucesso.
- Monitor de indexação: administrador ou credencial privada do worker; lote validado integralmente, limites inteiros entre 1 e 200, somente origens HTTPS exatas da loja. URLs extraídas do sitemap recebem a mesma validação; redirecionamentos não são seguidos, inclusive no sitemap, e requisições têm timeout.
- Agendamento diário existente recebeu `public.operational_worker_headers()`, preservando cadência, corpo e endereço. Receita idempotente de restauração em `scripts/secure-indexation-schedule.sql`; não é uma alteração de schema.
- Funções corrigidas implantadas no backend compartilhado. Nenhum e-mail enviado nos testes.

## Evidência

- Teste de relatório com `<img onerror>` e fechamento de célula seguido de `<script>`: ambos permanecem texto, nenhum elemento executável criado; impressão chamada.
- Backend implantado: anônimo recebe 401 nos dois endpoints; cliente autenticado recebe 403; administrador com código inválido ou URL privada recebe 400, antes de envio/consulta externa.
- Conta administrativa abriu `/admin/busca`; conta temporária abriu `/suporte`. Nenhuma alteração de pedido ou dados de cliente.
- Cinco testes específicos de segurança passam; suíte final com 161 testes passa; cinco testes do guard da loja passam; lint dos arquivos de frontend alterados passa.
- Scan rápido completo: seis warnings e nove informações, nenhum crítico. Três findings profundos selecionados marcados corrigidos após testes. Outros 72 findings permaneciam ativos; cobertura profunda anterior incompleta. Não equivale a auditoria completa aprovada.

## Estabilidade

- Home usa `HeroLoading` antes das seções, durante importação lazy e durante consulta dos slides; a prévia de Seções da Home usa o mesmo fallback.
- Com consultas atrasadas artificialmente, alturas antes/depois: 390px = 500,8125px; 768px = 574,375px; 1440px = 750,203125px. Topo em 0 nos três casos.
- Dois testes E2E de estabilidade desktop passam, incluindo carregamento inicial e alternância/opt-out.
- Ambas as prévias em `/admin/hero-slides` compartilham palco fixo, dimensões intrínsecas das imagens e contenção sem cortes. Troca mobile/desktop mantém altura externa: 360px em celular, 380px tablet/desktop.
- Browser autenticado verificou 390/768/1440, autoplay, seleção manual no diálogo, preferência reduzida do sistema e escolha persistida do site. Timers parados e botão de reprodução desabilitado sob redução; sem overflow horizontal nem erros de execução.
- Diálogo não salvo; nenhum slide, imagem ou ordem alterados. Prévia de Seções da Home recebeu fallback compartilhado, mas não teve interação própria verificada.

## Limites

- Sem publicação do frontend; mudanças de backend já estão implantadas por sua natureza.
- DNS, preços, carrinho, checkout e pagamentos preservados.
- Entrega real de e-mail e monitor completo com Google não executados para evitar mensagens/efeitos externos; testes verificaram autorização e validação, não entrega.
- Publicação e domínio seguem pendentes conforme roadmap; alertas de segurança não selecionados continuam ativos.
- Skills aplicados: `lelecute-commerce-experience` para preservação da loja e `lelecute-storefront-qa` para regressões e evidência.