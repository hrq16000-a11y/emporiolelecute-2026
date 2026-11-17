---
name: lelecute-design-review
description: Revisão editorial e visual específica da LeleCute, adaptada de Hallmark, Impeccable e Taste Skill.
---

# Revisão visual autoral — Empório LeleCute

Ative para home, /natal, vitrine, cards, PDP e pop-ups. Este arquivo é uma habilidade consultiva no Git; não instala nem executa os agentes externos.

Referências de método: https://github.com/Nutlope/hallmark (piso de qualidade, realidade dos CTAs); https://github.com/pbakaus/impeccable (critique, audit, polish por componente); https://github.com/Leonxlnx/taste-skill (direção de arte e inspeção em navegador).

## Processo de uma única seção por rodada
1. Identifique a tarefa do cliente: achar presente, entender produto, personalizar, orçar, comprar. Priorize essa ação; não crie CTA de demonstração.
2. Compare telas **antes/depois** com o mesmo conteúdo real nos tamanhos 360, 390, 768 e 1440 px. Registre a evidência e nunca marque auditado sem screenshot/execução.
3. Respeite tokens atuais de src/index.css: coral, creme, tipografia Quicksand/DM Sans, superfícies artesanais; as cores sazonais do Natal ficam no componente da campanha, sem novo tema global.
4. Faça crítica priorizada: P0 = checkout/CTA inacessível, P1 = imagens ou formulário errados, P2 = hierarquia, legibilidade e layout, P3 = microinteração. Corrija primeiro o maior problema comprovado.
5. Verifique contraste, texto alternativo específico, foco visível, ordem do teclado, área de toque >= 44 x 44 px, prefers-reduced-motion, altura/overflow, leitura por leitor de tela e fechamento do convite por Esc e botão.
6. Foto de produto é prova, não decoração: preserve foto real, enquadramento fiel, preço e disponibilidade do catálogo. Sem stock genérico, reviews inventados, prazos ou brindes inexistentes.
7. Evite padrões repetitivos de IA (cartões vazios, gradientes sem função, textos genéricos, hierarquia desconexa). Não aplique proibições absolutas de outras marcas: preserve o design aprovado da LeleCute.
8. Entregue mudanças mínimas por PR, sem alterar busca, CEP/frete, carrinho, checkout, autenticação, SEO ou componentes de outras lojas.

Resultado: registrar arquivos, telas verificadas, problemas comprovados, ajustes e regressões não verificadas. Consulte também lelecute-storefront-qa.
