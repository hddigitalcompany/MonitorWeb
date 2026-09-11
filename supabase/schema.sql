-- Painel Pessoal — schema do banco de dados (v2)
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase.
-- Se você já tinha o schema antigo, rode "drop table if exists ... cascade"
-- nas tabelas antigas (fotos, localizacoes, ligacoes, pesquisas) antes.

-- ============================================================
-- ADMINISTRADORES
-- ============================================================
-- Lista de quem pode publicar conteúdo e responder chamados.
-- Depois de criar sua conta pelo login normal, adicione seu próprio
-- user_id aqui manualmente pelo SQL Editor:
--   insert into public.admins (user_id) values ('SEU-USER-ID-AQUI');
-- (o user_id aparece em Authentication → Users no painel do Supabase)
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.admins enable row level security;

create policy "Usuário vê se ele mesmo é admin"
  on public.admins for select
  using (auth.uid() = user_id);

-- ============================================================
-- CONTEÚDO PUBLICADO POR VOCÊ (visível a todo mundo que usa o app)
-- ============================================================

create table if not exists public.conteudo_fotos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  caminho text not null,
  criado_em timestamptz not null default now()
);

create table if not exists public.conteudo_video_dia (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  caminho text,
  tipo text not null default 'upload',
  legenda text not null default '',
  criado_em timestamptz not null default now()
);

create table if not exists public.conteudo_locais (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  criado_em timestamptz not null default now()
);

create table if not exists public.conteudo_lembretes (
  id uuid primary key default gen_random_uuid(),
  texto text,
  hora text,
  atividade text,
  criado_em timestamptz not null default now()
);

create table if not exists public.conteudo_links (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  url text,
  criado_em timestamptz not null default now()
);

create table if not exists public.conteudo_wifi_dicas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  texto text not null,
  criado_em timestamptz not null default now()
);

create table if not exists public.conteudo_contatos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null,
  numero text not null,
  criado_em timestamptz not null default now()
);

-- Textos/títulos editáveis do app (chave ex: "inicio_titulo", "inicio_subtitulo").
-- Se uma chave não existir aqui, o app usa o texto padrão definido em src/lib/textos.js.
create table if not exists public.conteudo_textos (
  chave text primary key,
  valor text not null,
  criado_em timestamptz not null default now()
);

-- Perguntas frequentes/respostas prontas mostradas antes de abrir um chamado
-- de suporte de verdade (triagem no app, pra reduzir chamados desnecessários).
create table if not exists public.conteudo_ajuda_rapida (
  id uuid primary key default gen_random_uuid(),
  pergunta text not null,
  resposta text not null,
  criado_em timestamptz not null default now()
);

-- Ativa RLS em todas as tabelas de conteúdo
alter table public.conteudo_fotos enable row level security;
alter table public.conteudo_video_dia enable row level security;
alter table public.conteudo_locais enable row level security;
alter table public.conteudo_lembretes enable row level security;
alter table public.conteudo_links enable row level security;
alter table public.conteudo_wifi_dicas enable row level security;
alter table public.conteudo_contatos enable row level security;
alter table public.conteudo_textos enable row level security;
alter table public.conteudo_ajuda_rapida enable row level security;

-- Qualquer pessoa logada pode ler; só admin pode escrever.
-- (repete o mesmo par de políticas pra cada tabela de conteúdo)
do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'conteudo_fotos', 'conteudo_video_dia', 'conteudo_locais',
    'conteudo_lembretes', 'conteudo_links', 'conteudo_wifi_dicas',
    'conteudo_contatos', 'conteudo_textos', 'conteudo_ajuda_rapida'
  ]
  loop
    execute format(
      'create policy "Leitura livre para logados" on public.%I for select using (auth.role() = ''authenticated'')',
      tabela
    );
    execute format(
      'create policy "Só admin escreve" on public.%I for all using (exists (select 1 from public.admins where user_id = auth.uid())) with check (exists (select 1 from public.admins where user_id = auth.uid()))',
      tabela
    );
  end loop;
end $$;

-- ============================================================
-- DADOS PESSOAIS (cada usuário só vê e edita os próprios)
-- ============================================================

create table if not exists public.conversas_importadas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contato text not null,
  nome_arquivo text not null,
  total_mensagens integer not null default 0,
  criado_em timestamptz not null default now()
);

alter table public.conversas_importadas enable row level security;

create policy "Usuário gerencia suas próprias conversas importadas"
  on public.conversas_importadas for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- SUPORTE (chamados abertos pelos usuários, respondidos por você)
-- ============================================================

create table if not exists public.chamados_suporte (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assunto text not null,
  status text not null default 'aberto' check (status in ('aberto', 'respondido')),
  criado_em timestamptz not null default now()
);

create table if not exists public.mensagens_suporte (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references public.chamados_suporte(id) on delete cascade,
  remetente text not null check (remetente in ('usuario', 'suporte')),
  texto text not null,
  criado_em timestamptz not null default now()
);

alter table public.chamados_suporte enable row level security;
alter table public.mensagens_suporte enable row level security;

create policy "Usuário vê e cria seus próprios chamados"
  on public.chamados_suporte for select
  using (auth.uid() = user_id or exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Usuário cria chamado pra si mesmo"
  on public.chamados_suporte for insert
  with check (auth.uid() = user_id);

create policy "Admin cria chamado para qualquer usuário"
  on public.chamados_suporte for insert
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admin atualiza status do chamado"
  on public.chamados_suporte for update
  using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Usuário vê mensagens dos próprios chamados, admin vê todas"
  on public.mensagens_suporte for select
  using (
    exists (select 1 from public.chamados_suporte c where c.id = chamado_id and c.user_id = auth.uid())
    or exists (select 1 from public.admins where user_id = auth.uid())
  );

create policy "Usuário envia mensagem no próprio chamado, admin em qualquer um"
  on public.mensagens_suporte for insert
  with check (
    (remetente = 'usuario' and exists (select 1 from public.chamados_suporte c where c.id = chamado_id and c.user_id = auth.uid()))
    or (remetente = 'suporte' and exists (select 1 from public.admins where user_id = auth.uid()))
  );

-- ============================================================
-- REEMBOLSOS (pedido de cancelamento/reembolso feito pela pessoa)
-- Fluxo 100% automático: todo pedido que chega aqui já é reembolsado,
-- sem aprovação manual. O prazo de 4 dias é só o tempo que o time leva
-- pra fazer o reembolso na plataforma de pagamento — não é uma fila de
-- aprovação nem exige nenhuma ação de admin.
-- ============================================================

create table if not exists public.pedidos_reembolso (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  motivo text not null,
  criado_em timestamptz not null default now()
);

alter table public.pedidos_reembolso enable row level security;

create policy "Usuário vê seus próprios pedidos, admin vê todos"
  on public.pedidos_reembolso for select
  using (auth.uid() = user_id or exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Usuário cria pedido pra si mesmo"
  on public.pedidos_reembolso for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- STORAGE (fotos e vídeos publicados por você)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('conteudo', 'conteudo', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatares', 'avatares', true)
on conflict (id) do nothing;

create policy "Qualquer um vê arquivos de conteúdo (bucket público)"
  on storage.objects for select
  using (bucket_id = 'conteudo');

create policy "Só admin sobe conteúdo"
  on storage.objects for insert
  with check (bucket_id = 'conteudo' and exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Só admin remove conteúdo"
  on storage.objects for delete
  using (bucket_id = 'conteudo' and exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Qualquer um vê avatares (bucket público)"
  on storage.objects for select
  using (bucket_id = 'avatares');

create policy "Usuário sobe seu próprio avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Usuário substitui seu próprio avatar"
  on storage.objects for update
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- PERFIS DE USUÁRIO (primeiro login e último acesso, usados pra
-- liberar o conteúdo aos poucos pra cada pessoa)
-- ============================================================

create table if not exists public.perfis_usuario (
  user_id uuid primary key references auth.users(id) on delete cascade,
  primeiro_login timestamptz not null default now(),
  ultimo_acesso timestamptz not null default now()
);

alter table public.perfis_usuario enable row level security;

create policy "Usuário vê e gerencia seu próprio perfil"
  on public.perfis_usuario for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admin vê todos os perfis"
  on public.perfis_usuario for select
  using (exists (select 1 from public.admins where user_id = auth.uid()));

-- ============================================================
-- TELEFONE NO PERFIL (preenchido uma única vez, no cadastro,
-- antes da pessoa acessar o app pela primeira vez)
-- ============================================================

alter table public.perfis_usuario add column if not exists telefone text;

-- ============================================================
-- TEXTOS PÚBLICOS NA TELA DE LOGIN
-- A tela de login/criação de conta é vista por quem ainda não tem
-- sessão, então os textos dela precisam poder ser lidos sem estar
-- logado (a política "Leitura livre para logados" não cobre isso).
-- ============================================================

create policy "Leitura pública dos textos"
  on public.conteudo_textos for select
  using (true);

-- Reembolso: guarda a conversa do chat de cancelamento (pra reaparecer como
-- histórico depois) e o status do pedido (pra pessoa poder cancelar o
-- pedido de reembolso que ela mesma abriu).
alter table public.pedidos_reembolso add column if not exists conversa jsonb;
alter table public.pedidos_reembolso add column if not exists status text not null default 'em_analise';

create policy "Usuário atualiza seu próprio pedido de reembolso"
  on public.pedidos_reembolso for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
