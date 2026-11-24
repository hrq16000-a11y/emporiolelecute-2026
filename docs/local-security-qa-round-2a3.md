# Rodada 2A.3 — QA local descartável

O workflow dedicado é opt-in: acionamento manual quando disponível na branch padrão ou label `qa-local-approved` em PR da branch exata, no mesmo repositório. Não abrir PR nem aplicar label sem conferir a franquia do GitHub Actions. Job único, runner padrão, timeout 15 minutos. Nenhum deploy, link remoto ou secret de produção.

Reutiliza `supabase/config.toml`, migrations e `supabase/seed.sql` em runner descartável; remove configuração de ambiente remota e troca o project_id somente no workspace. Antes de iniciar, bloqueia saída externa dos containers Docker e restringe o usuário de testes ao loopback. Edge runtime não é iniciado. A instalação da CLI e o download de imagens ainda requerem rede do runner. Se o isolamento, o seed ou as migrations falharem, a execução deve falhar, não recorrer à nuvem.

Cobertura inicial: projeção de privacidade pura; sessões GoTrue de admin e dois clientes sintéticos; tentativa de promoção administrativa; checkout válido como controle positivo; leitura de pedidos e itens por anônimo e outro cliente; alteração de preço/subtotal/total no checkout; persistência conferida pelo admin local. Sem homologação ainda de pagamentos, cupons, frete, todos os RPCs ou Edge Functions em execução. Os 72 achados históricos continuam sem inventário individual recuperado.

Os testes não foram executados ao gravar esta rodada. Falhas no ambiente ou nos gates são NO-GO para homologação. Não considerar a mera presença do workflow como aprovação.
