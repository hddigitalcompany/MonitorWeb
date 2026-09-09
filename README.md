# Painel Pessoal

App mobile-first com login sem senha (Google) e duas partes:

- **Conteúdo publicado por você**: Início (vídeo do dia), Fotos, Locais seguros,
  Lembretes, Links de ajuda, Wifi (dicas) e Contatos úteis — a mesma coisa pra
  todo mundo que usa o app, gerenciada pela tela `/admin`.
- **Área pessoal de cada usuário**: Conversas (importação manual e opcional de
  `.txt` exportado do WhatsApp, agrupada por contato) e Suporte (chamados que
  viram uma conversa contínua com você).

## Stack

- **Next.js 14** (App Router) + Tailwind CSS
- **Supabase**: autenticação (Google OAuth), banco Postgres com Row Level
  Security, e Storage para fotos, vídeos e avatares

## 1. Criar o projeto no Supabase

1. Vá em [supabase.com](https://supabase.com) → **New project**.
2. Anote a **Project URL** e a **anon public key** (em *Project Settings → API*).

## 2. Rodar o schema do banco

No **SQL Editor** do Supabase, cole e rode o conteúdo de `supabase/schema.sql`.
Isso cria todas as tabelas, ativa Row Level Security e cria os buckets de
Storage (`conteudo` e `avatares`).

## 3. Se tornar administrador

Depois de criar sua própria conta pelo login do app (passo 6), copie seu
`user_id` em **Authentication → Users** no Supabase e rode no SQL Editor:

```sql
insert into public.admins (user_id) values ('SEU-USER-ID-AQUI');
```

Só quem estiver nessa tabela consegue acessar `/admin` e publicar conteúdo ou
responder chamados. Todo mundo mais só enxerga o que for publicado.

## 4. Ativar login com Google

1. No Supabase: **Authentication → Providers → Google** → ative.
2. Crie credenciais OAuth no [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   (tipo **Web application**), usando a **Authorized redirect URI** que o
   próprio Supabase mostra na tela do provider.
3. Cole o **Client ID** e **Client Secret** de volta no Supabase.

## 5. Configurar variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com os
dados do passo 1.

## 6. Rodar localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) pra criar sua conta, e
depois [http://localhost:3000/admin](http://localhost:3000/admin) pra
gerenciar o conteúdo (depois de virar admin no passo 3).

## 7. Publicar (Vercel, grátis)

1. Suba o projeto num repositório Git.
2. Importe em [vercel.com](https://vercel.com) e adicione as mesmas variáveis
   de `.env.local` em **Environment Variables**.
3. No Supabase, em **Authentication → URL Configuration**, adicione a URL da
   Vercel em **Site URL** e em **Redirect URLs**
   (`https://seu-app.vercel.app/auth/callback`).

## Sobre a aba Conversas

Não existe conexão automática com o WhatsApp (isso violaria os Termos de
Serviço dele). A pessoa que usa o app decide, se quiser, exportar uma conversa
pelo próprio WhatsApp (**Conversa → Mais → Exportar conversa → Sem mídia**) e
subir o `.txt` aqui — o app só organiza (nome, contato, contagem de
mensagens), nunca lê o conteúdo automaticamente.

## Estrutura

```
src/
  app/
    page.js                    → login
    auth/callback/route.js     → callback do OAuth
    dashboard/
      layout.js                → menu + navegação (DashboardChrome)
      inicio/                  → vídeo do dia + atalhos
      fotos/                   → galeria (conteúdo do admin)
      locais-seguros/          → sugestões (conteúdo do admin)
      lembretes/                → sugestões (conteúdo do admin)
      links-ajuda/              → links (conteúdo do admin)
      wifi/                     → dicas de segurança (conteúdo do admin)
      contatos/                 → contatos úteis (conteúdo do admin)
      conversas/                → importação pessoal, por contato
      suporte/                  → chamados (pessoal)
      assinatura/                → em branco, a configurar depois
    admin/page.js               → painel de administração (gated por admins)
  components/                    → componentes de cada tela
  lib/supabase/                  → clientes Supabase (browser e servidor)
  middleware.js                  → protege /dashboard e /admin
supabase/schema.sql              → schema completo + RLS
```
