# Soletra! Hero Arcade

Jogo educativo de soletração com atividades em português e inglês, desafios arcade, aventura, heróis e progresso salvo no navegador.

## Publicação

Projeto estático preparado para Vercel. Não é necessário comando de build; a raiz do projeto contém o `index.html`.

## Uso local

Abra por um servidor HTTP local para habilitar o service worker e os recursos de instalação.
# Perfis familiares, progresso e ranking

Execute `supabase-learning-migration.sql` uma vez no SQL Editor do projeto
Supabase compartilhado por Fala Real e Soletra. A migração cria até dois perfis
infantis por responsável, tentativas de aprendizagem e o ranking agregado. Não
armazene data de nascimento ou outros dados desnecessários da criança; use
primeiro nome ou apelido.

O ranking mostra pontuação, melhor disciplina e conteúdo com menor precisão. O
responsável vê somente seus perfis; administradores e Master podem consultar os
registros conforme as políticas do banco.

## Assinatura (Mercado Pago)

O app cobra R$20/mês por e-mail cadastrado (contas com papel `admin`/`master`
são isentas). Além do site estático, este projeto usa funções serverless da
Vercel em `/api/payments/*` (sem framework - Node "clássico", ver `api/_lib.js`).

1. Execute `supabase-billing-migration.sql` uma vez no SQL Editor do projeto
   Supabase do Soletra (`fala-real-soletra`, mesmo projeto do login).
2. Configure estas variáveis de ambiente no projeto Vercel `soletra-hero-arcade`:
   - `SUPABASE_URL` - URL do projeto Supabase do Soletra (`https://jptxomplvexsfyynmxju.supabase.co`).
   - `SUPABASE_SERVICE_ROLE_KEY` - chave de serviço (service_role) desse mesmo projeto Supabase (Project Settings → API). Nunca é exposta ao navegador.
   - `MERCADOPAGO_ACCESS_TOKEN` - pode reaproveitar o mesmo token já configurado no projeto Vercel do Fluxo Insight (mesma conta Mercado Pago).
   - `MERCADOPAGO_WEBHOOK_SECRET` (opcional) - habilita a verificação de assinatura das notificações; sem ela o webhook aceita sem verificar (funciona, mas não valida).
   - `APP_URL` (opcional) - por padrão usa `https://soletra-hero-arcade.vercel.app`.
3. No painel do Mercado Pago, aponte a URL de notificação (webhook) para
   `https://soletra-hero-arcade.vercel.app/api/payments/webhook`.
