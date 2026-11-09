# Ferramentas externas analisadas — Empório LeleCute
Data: 2026-11-09. Repositório: hrq16000-a11y/emporiolelecute-2026.
Método: consulta a metadados GitHub (19 repositórios existentes) e README dos projetos diretamente pertinentes; leitura dos três catálogos do André Lug. Isto NÃO é auditoria de código-fonte completo dos projetos externos.

## Os 3 materiais
- https://andrelug.com/materiais/mapa-107 — lista de 20 projetos de conteúdo. Uso provável: pesquisa editorial e conteúdo de vídeos, com aprovação antes de gravar/postar; considerar Whishper, AutoSubs e AutoClip fora do site.
- https://andrelug.com/materiais/mapa-103 — lista de 24 projetos para programação. Aplicar princípios de PR-Agent, Spec Kit, Superpowers e Context7 apenas na disciplina de PR e documentação, sem novos agentes privilegiados.
- https://andrelug.com/materiais/mapa-104 — lista de 24 projetos de automação. Stagehand, Activepieces e Automatisch são candidatos a fluxos externos futuros; não conectar contas, publicar, comprar ou executar jobs nesta implantação.
Os catálogos somam 68 entradas, mas a avaliação técnica individual deste documento cobre os 19 repositórios indicados diretamente, não todos os 68 itens.

## Verificação dos 19 repositórios indicados
| Projeto | Fonte | Situação no Empório | Motivo |
|---|---|---|---|
| REA | https://github.com/morluto/rea | MÉTODO / NÃO INSTALADO | Engenharia reversa apenas para investigação autorizada; sem coletar sessões nem executar MCP. |
| Craft Anything | https://github.com/storytold/craft-anything | MÉTODO / NÃO INSTALADO | Comparar UX com referências sem clonar código ou identidade; alpha e execução externa. |
| VoiceStudio | https://github.com/debpalash/VoiceStudio | ADIADO | STT/TTS para produção de mídia fora da loja; AGPL-3.0 exige revisão de uso/distribuição. |
| Voicebox | https://github.com/jamiepine/voicebox | ADIADO | Clonagem de voz exige consentimento explícito e mídia autorizada; nada a ganhar no checkout. |
| CleanYourTV | https://github.com/Gathin23/cleanyourtv | NÃO APLICÁVEL | Otimização de Android TV, não e-commerce. Licença exige revisão específica. |
| TV Detox | https://github.com/Ansub/tv-detox | NÃO APLICÁVEL | Launcher Android TV, não Vite/React de e-commerce. |
| FreeLLMAPI | https://github.com/tashfeenahmed/freellmapi | NÃO INSTALAR EM PRODUÇÃO | Router de provedores/chaves, descrito para uso pessoal; quotas/ToS e riscos de dados, sem necessidade. |
| Hallmark | https://github.com/Nutlope/hallmark | PRINCÍPIOS ADAPTADOS | Piso de qualidade: foco, contraste, movimento reduzido, conteúdo real e CTA verificável. |
| Impeccable | https://github.com/pbakaus/impeccable | PRINCÍPIOS ADAPTADOS | Revisão localizada de hierarquia, consistência e UX com classificação P0-P3. |
| Taste Skill | https://github.com/Leonxlnx/taste-skill | PRINCÍPIOS ADAPTADOS | Direção de arte e revisão em navegador, sem substituir a identidade coral/creme. |
| HyperFrames | https://github.com/heygen-com/hyperframes | PRODUÇÃO EXTERNA OPCIONAL | Motion/vídeos de produtos em job separado, nunca como dependência do checkout. |
| Remotion | https://github.com/remotion-dev/remotion | PRODUÇÃO EXTERNA OPCIONAL | Vídeo em React; revisão de licenciamento e custo antes de execução. |
| OpenShorts | https://github.com/mutonby/openshorts | PRODUÇÃO EXTERNA OPCIONAL | Cortes verticais de vídeo autorizado; máquina, modelos e chaves externas necessários. |
| Rescript | https://github.com/wassgha/rescript | PRODUÇÃO EXTERNA OPCIONAL | Edição baseada em transcrição, fora do runtime; licença ainda precisa ser validada. |
| Claude-Mem | https://github.com/thedotmack/claude-mem | NÃO INSTALADO | Hooks capturam sessão e podem reter segredos/contexto: não ativar em conta/loja. |
| AI Memory | https://github.com/akitaonrails/ai-memory | MÉTODO ADAPTADO | Handoff por arquivos de documentação existentes no Git, sem servidor ou captura automática. |
| FluidVoice | https://github.com/altic-dev/FluidVoice | NÃO APLICÁVEL | Ditado local do operador, não função da loja; GPL-3.0. |
| Hex | https://github.com/anomalyco/hex | NÃO APLICÁVEL AO SITE | Ditado local opcional para equipe, não bundle React. |
| Cloudflare Security Audit | https://github.com/cloudflare/security-audit-skill | MÉTODO ADAPTADO | Hipóteses + evidências + confirmação independente; não equivale a pentest. |

## Resultado desta micro-rodada
- Implantação sem copiar código externo: três skills consultivos originais em .agents/skills, documentação de governança e ampliação do gate offline.
- Mudança real de interface: área de toque do botão fechar no convite de Natal de 36 x 36 para 44 x 44 px, com teste de regressão.
- Não foi instalado nenhum pacote npm de terceiros desta lista, renderizador de vídeo, motor de STT, plugin de sessão, crawler pago ou MCP externo.
- Não alterar DNS, checkout, pagamentos, produtos ou painel. Preservar a PR de busca separada. Uma PR de documentação/UX não comprova publicação.

## Critérios para futuro piloto de ferramenta externa
Escopo único; finalidade comercial comprovada; licença e commit/release revisados; sem PII/segredos; sem custo sem autorização; execução sandbox/offline sempre que possível; rollback; evidências e checklist de direitos de imagem/voz; proteção dos gates e do bundle de produção.
