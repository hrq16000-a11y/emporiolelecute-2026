---
name: lelecute-security-review
description: Auditoria de risco limitada, read-only e com evidências para loja, admin, busca e agentes; adaptação do método Cloudflare.
---

# Revisão de segurança baseada em evidências — Empório LeleCute

Referência de método: https://github.com/cloudflare/security-audit-skill. **Não** equivale a instalar/rodar o auditor multiagente; nenhuma auditoria profunda ou pentest foi realizada pela presença deste skill.

## Escopo de confiança
- Navegador público: vitrine, pesquisa, carrinho, fotos, SEO, formularios e estado do cliente.
- Fronteira admin: login, autorização por conta, parâmetros operacionais e publicação de produtos.
- Backend: RLS e RPCs Supabase, upload de mídia, frete, suporte, transações e integrações externas.
- Cadeia de fornecimento: dependências, workflows GitHub, scripts e tokens Vercel/CI.
- Agentes: somente pesquisa read-only por padrão; não executar MCP/hook/shell de terceiros nem importar históricos, cookies ou dados de clientes.

## Método leve
1. Liste os arquivos e a fronteira de confiança realmente alterados na PR.
2. Identifique 1-3 hipóteses verificáveis (autorização, exposição de segredo, injeção em HTML/SQL, upload, abuso de custo, falsos estados de sucesso).
3. Para cada hipótese registre caminho/linha, reprodução limitada e impacto observado; nunca classifique ausência de prova como seguro.
4. Separe status em CONFIRMADO, PENDENTE DE VALIDAÇÃO e DESCARTADO. Severidade somente em CONFIRMADO e com escopo claro.
5. Priorize correção mínima com testes de regressão. Não desabilite RLS, autorização, logs, limites ou gates para conseguir PASS.
6. Só execute testes ativos e conexão a contas com autorização específica. Nunca criar/mostrar tokens ou copiar pedidos/PII em logs ou PR.
7. No relatório diferencie auditoria estática, teste de navegador, integração real, preview e produção. Em caso de dúvida, permaneça pendente.

Gates locais existentes: scripts/check-storefront-guard.mjs + teste, Vitest e Playwright. Eles não provam RLS de produção, segurança do checkout ou inexistência de vulnerabilidades.
