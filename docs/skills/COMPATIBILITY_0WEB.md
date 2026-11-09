# Seleção compatível da 0WEB para o Empório LeleCute

Data: 2026-11-09. Fontes: hrq16000/zeroweb-2026 e avaliações anteriores de REA, Firecrawl e Ceocript. Repositório de destino: hrq16000-a11y/emporiolelecute-2026.

| Origem na 0WEB | Escolha para LeleCute | Estado |
|---|---|---|
| 0web-experience-design-max, 0web-landing-page-premium | Direção de produto/UX e conversão autoral para loja | ADAPTADO — skill commerce |
| 0web-ui-quality-gates, evolução sem regressão | Quality gate offline no GitHub para Natal, SEO e dependências; CI preservado | IMPLEMENTADO — skill QA + script/testes |
| morluto/rea (upstream SHA 99db80a13e369885e7de99417475c25380446081 citado na 0WEB) | Método de investigação de referências web, fora da produção | REFERENCE_ONLY |
| Firecrawl (adaptação server-only opcional da 0WEB PR #507) | Possível pesquisa autorizada com controle de custo; não há necessidade operacional atual | REFERENCE_ONLY |
| ceocript / MegaX | Apenas lições de segmentação B2B, sem copiar produtos/visual/código | REFERENCE_ONLY |
| 0web-autonomous-portfolio-factory, funis por empresa, política da rede de técnicos e infraestrutura 0WEB | Outro produto/negócio, incompatível com o catálogo e checkout do Empório | NÃO APLICÁVEL |
| pacotes REA/Firecrawl, Chrome CDP, hooks remotos e scraping em CI | Sem autorização para execução, custos/privacidade/riscos não avaliados | NÃO INSTALADO |

Skills são arquivos locais consultivos (no Git), não plugins remotos executáveis. A implementação é deliberadamente leve: sem dependências npm, sem chaves, sem novas chamadas pagas, sem mudança de DNS, banco, busca ou checkout. Este gate lê o código-fonte e não comprova navegação, indexação real, entrega de e-mails ou conversões. A aplicação dos métodos deve ser evidenciada em PRs e verificações reais, sem alegar automação não instalada.
