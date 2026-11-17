# Architecture rules

- Resolve checkout postal addresses through `src/lib/postal-address.ts`; centralizing provider fallback keeps automatic and manual CEP input consistent.
- Editorial packaging uses a shared story rendered through the PDP registry; the admin synchronizes its institutional page to keep the two surfaces aligned.
- After-sales rules live outside product-save payloads, keyed by product ID or global scope; follow-ups remain blocked until sending prerequisites exist, preventing accidental customer emails.
- Search boost previews use an admin-only, read-only ranking RPC derived from the public search function; keep both rankers aligned when search semantics change, and require a fresh draft preview before UI publication.
- Global SEO uses existing seo_config and robots_config records; sitemap counts parse page URL nodes from actual XML and distinguish generated XML from published static artifacts.
- Operational policy is admin-only; unresolved high regressions remain blocked across repeated scans until approval or verified resolution, and scheduled workers authenticate with private database credentials.
- Image retries use a role-checked RPC; service-only leased claims fence completion and reclaim interrupted work, while clients cannot directly update job state.
- Support threads are route-derived and account-scoped; server-owned messages, authenticated order email checks, mandatory help retrieval and a human inbox prevent cross-customer exposure and unsupported answers; resolved threads reject further messages.

## Skills locais — Empório LeleCute (separado da 0WEB)

Leia .agents/skills/lelecute-commerce-experience/SKILL.md para vitrine, campanhas e conversão.
Leia .agents/skills/lelecute-storefront-qa/SKILL.md antes de concluir mudanças.
Leia .agents/skills/lelecute-safe-research/SKILL.md para benchmarking externo.
Critérios de adoção: docs/skills/COMPATIBILITY_0WEB.md.
Não importar identidade, preços, credenciais, funis ou ferramentas pagas da 0WEB; não executar scripts de terceiros sem revisão e autorização específicas.

## Adoção curada de ferramentas externas (09/11/2026)

Para revisão visual consultiva do catálogo e campanhas, leia .agents/skills/lelecute-design-review/SKILL.md.
Para identificar riscos de aplicações web, agentes e integrações, leia .agents/skills/lelecute-security-review/SKILL.md.
Para planejar vídeos e conteúdo social, leia .agents/skills/lelecute-content-production/SKILL.md.
Inventário e decisão por repositório: docs/skills/EXTERNAL_TOOLS_2026-11-09.md.
Apenas métodos locais e mudanças verificáveis são adotados; nenhuma execução de terceiros, hooks de sessão, gravação de clientes, clonagem de voz, consumo pago ou instalação automática em runtime/CI sem revisão específica.
