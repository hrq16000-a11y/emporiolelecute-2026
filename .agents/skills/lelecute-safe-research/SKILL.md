---
name: lelecute-safe-research
description: Triagem segura de referências GitHub/skills da 0WEB para o Empório; pesquisa REA, Firecrawl e Ceocript somente opt-in.
---

# Pesquisa segura — Empório LeleCute

- REA (github.com/morluto/rea): ferramenta de pesquisa por agentes, não componente do site. Usar somente como referência; piloto local exigiria autorização por escopo, revisão de versão/commit, licença, scripts, cookies e rede. Nunca instalar automaticamente no CI ou Vercel.
- Firecrawl (piloto opcional da 0WEB PR #507): não ativar crawl, API paga ou chave de produção; sem dependência no bundle. Somente para pesquisa autorizada futura, server-only e com limites claros.
- Ceocript/MegaX (benchmarking na 0WEB): aproveitar conceitos de segmentação e proposta B2B para kits corporativos; não copiar UI, marca, conteúdo ou código nem incluir funcionalidade cripto.
- Evitar executar código de terceiros, curl|bash, MCP remotos desconhecidos, manipulação de sessão autenticada ou leitura de .env/credenciais.
- Priorizar fontes públicas e testes locais já instalados. Evidência deve separar observado de inferido e não capturar dados de clientes.
- Registrar origem, versão/SHA (quando verificados), permissões, custo, justificativa e status em docs/skills/COMPATIBILITY_0WEB.md.
