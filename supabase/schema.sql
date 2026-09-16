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

-- Contagem de "itens novos" por categoria (Início): guarda quando a pessoa
-- viu cada categoria pela última vez, pra contagem só sumir quando ela
-- realmente abrir aquela aba — não só por abrir a Início.
alter table public.perfis_usuario add column if not exists ultimo_visto jsonb not null default '{}'::jsonb;

-- Cancelamento de compra: uma tentativa abandonada (a pessoa saiu antes de
-- terminar) ainda vira um registro (status "abandonado"), por isso o
-- motivo pode ficar em branco nesse caso.
alter table public.pedidos_reembolso alter column motivo drop not null;

-- Painel ao vivo (admin): cada aba que uma pessoa abre vira um registro
-- aqui, o que alimenta o painel de estatísticas em tempo real (quem está
-- navegando agora, abas mais visitadas, horário de pico, etc).
create table if not exists public.eventos_visita (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  rota text not null,
  criado_em timestamptz not null default now()
);

create index if not exists eventos_visita_criado_em_idx on public.eventos_visita (criado_em desc);
create index if not exists eventos_visita_user_id_idx on public.eventos_visita (user_id);

alter table public.eventos_visita enable row level security;

create policy "Usuário registra suas próprias visitas"
  on public.eventos_visita for insert
  with check (auth.uid() = user_id);

create policy "Admin vê todas as visitas"
  on public.eventos_visita for select
  using (exists (select 1 from public.admins where user_id = auth.uid()));

-- Liga o "ao vivo de verdade" do painel: sem isso as visitas e as contas
-- novas só apareceriam depois de atualizar a página.
alter publication supabase_realtime add table public.eventos_visita;
alter publication supabase_realtime add table public.perfis_usuario;

-- Vídeo demonstrativo da aba Conversas: as pessoas não estavam usando essa
-- aba, então agora dá pra subir um vídeo explicando como importar as
-- conversas (mesmo esquema do vídeo do dia, tabela separada).
create table if not exists public.conteudo_video_conversas (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  caminho text,
  tipo text not null default 'upload',
  legenda text not null default '',
  criado_em timestamptz not null default now()
);

alter table public.conteudo_video_conversas enable row level security;

create policy "Leitura livre para logados"
  on public.conteudo_video_conversas for select
  using (auth.role() = 'authenticated');

create policy "Só admin escreve"
  on public.conteudo_video_conversas for all
  using (exists (select 1 from public.admins where user_id = auth.uid()))
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

-- Conversas de exemplo (criadas pelo admin, aparecem pros clientes verem
-- como fica um chat — grupo ou conversa normal). O admin sobe um .txt
-- exportado do WhatsApp e o sistema separa as mensagens sozinho.
create table if not exists public.conversas_demo (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'normal' check (tipo in ('normal', 'grupo')),
  titulo text not null,
  participante_voce text,
  participantes jsonb not null default '[]'::jsonb,
  total_mensagens integer not null default 0,
  criado_em timestamptz not null default now()
);

create table if not exists public.mensagens_demo (
  id bigint generated always as identity primary key,
  conversa_id uuid not null references public.conversas_demo(id) on delete cascade,
  ordem integer not null,
  remetente text not null,
  texto text not null,
  enviado_em timestamptz,
  criado_em timestamptz not null default now()
);

create index if not exists mensagens_demo_conversa_id_idx on public.mensagens_demo (conversa_id, ordem);

alter table public.conversas_demo enable row level security;
alter table public.mensagens_demo enable row level security;

create policy "Leitura livre para logados"
  on public.conversas_demo for select
  using (auth.role() = 'authenticated');

create policy "Só admin escreve"
  on public.conversas_demo for all
  using (exists (select 1 from public.admins where user_id = auth.uid()))
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Leitura livre para logados"
  on public.mensagens_demo for select
  using (auth.role() = 'authenticated');

create policy "Só admin escreve"
  on public.mensagens_demo for all
  using (exists (select 1 from public.admins where user_id = auth.uid()))
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

-- Dá pra pessoa responder dentro de uma conversa de exemplo (continuando
-- como se fosse ela escrevendo) — essas mensagens são só dela, não
-- aparecem pros outros clientes que abrirem a mesma conversa.
alter table public.mensagens_demo add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.mensagens_demo alter column ordem drop not null;

drop policy if exists "Leitura livre para logados" on public.mensagens_demo;

create policy "Lê mensagens da conversa base ou as próprias"
  on public.mensagens_demo for select
  using (user_id is null or auth.uid() = user_id);

create policy "Usuário escreve sua própria resposta"
  on public.mensagens_demo for insert
  with check (auth.uid() = user_id);

-- Foto de perfil pra conversa de exemplo (grupo ou normal) — aparece no
-- lugar do ícone padrão, tanto na lista do admin quanto na do cliente.
alter table public.conversas_demo add column if not exists foto_url text;
alter table public.conversas_demo add column if not exists foto_caminho text;

-- ============================================================
-- LIBERAÇÃO GRADUAL DO HISTÓRICO DE MENSAGENS (conversas de exemplo)
-- Em vez de mostrar a conversa inteira de uma vez, as mensagens do
-- "roteiro" (as que vieram do .txt ou foram escritas manualmente pelo
-- admin — não as que o próprio cliente escreveu continuando a
-- conversa) vão aparecendo aos poucos, no ritmo que o admin escolher
-- pra cada conversa. Vazio/0 = mostra tudo de uma vez, como já era.
-- ============================================================

alter table public.conversas_demo add column if not exists liberacao_intervalo_minutos integer;

-- Guarda quando cada pessoa abriu uma conversa de exemplo pela primeira
-- vez, pra contar o tempo da liberação gradual a partir daí (cada
-- pessoa começa a contar da própria primeira abertura, não de quando a
-- conversa foi criada pelo admin).
create table if not exists public.conversas_demo_progresso (
  conversa_id uuid not null references public.conversas_demo(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primeira_abertura timestamptz not null default now(),
  primary key (conversa_id, user_id)
);

alter table public.conversas_demo_progresso enable row level security;

create policy "Usuário vê e cria seu próprio progresso"
  on public.conversas_demo_progresso for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- CONVERSAS DE VERDADE ENTRE CLIENTES (a pessoa abre uma conversa
-- nova, escolhe outras pessoas do app na lista, e troca mensagens de
-- verdade com elas — diferente das "conversas de exemplo", que são
-- roteiros prontos criados pelo admin.)
-- ============================================================

-- Diretório com só o nome de cada pessoa (nada sensível como telefone),
-- pra qualquer pessoa logada poder ver a lista de gente do app na hora
-- de abrir uma conversa nova.
create table if not exists public.diretorio_usuarios (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  atualizado_em timestamptz not null default now()
);

alter table public.diretorio_usuarios enable row level security;

create policy "Leitura livre para logados"
  on public.diretorio_usuarios for select
  using (auth.role() = 'authenticated');

create policy "Usuário escreve o próprio nome"
  on public.diretorio_usuarios for insert
  with check (auth.uid() = user_id);

create policy "Usuário atualiza o próprio nome"
  on public.diretorio_usuarios for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Preenche o diretório com quem já tem cadastro, já que o campo nome
-- só vai começar a ser salvo aqui a partir de agora.
insert into public.diretorio_usuarios (user_id, nome)
select id, coalesce(nullif(trim(raw_user_meta_data->>'full_name'), ''), nullif(trim(raw_user_meta_data->>'name'), ''), email)
from auth.users
on conflict (user_id) do nothing;

create table if not exists public.conversas_reais (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  ultima_mensagem_em timestamptz not null default now()
);

create table if not exists public.conversas_reais_participantes (
  conversa_id uuid not null references public.conversas_reais(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (conversa_id, user_id)
);

create table if not exists public.mensagens_reais (
  id bigint generated always as identity primary key,
  conversa_id uuid not null references public.conversas_reais(id) on delete cascade,
  remetente_id uuid not null references auth.users(id) on delete cascade,
  texto text not null,
  criado_em timestamptz not null default now()
);

create index if not exists mensagens_reais_conversa_id_idx on public.mensagens_reais (conversa_id, criado_em);

alter table public.conversas_reais enable row level security;
alter table public.conversas_reais_participantes enable row level security;
alter table public.mensagens_reais enable row level security;

create policy "Participante vê a conversa"
  on public.conversas_reais for select
  using (exists (
    select 1 from public.conversas_reais_participantes p
    where p.conversa_id = id and p.user_id = auth.uid()
  ));

create policy "Logado cria conversa"
  on public.conversas_reais for insert
  with check (auth.role() = 'authenticated');

create policy "Participante atualiza a conversa"
  on public.conversas_reais for update
  using (exists (
    select 1 from public.conversas_reais_participantes p
    where p.conversa_id = id and p.user_id = auth.uid()
  ));

create policy "Vê participantes das suas conversas"
  on public.conversas_reais_participantes for select
  using (exists (
    select 1 from public.conversas_reais_participantes p2
    where p2.conversa_id = conversas_reais_participantes.conversa_id and p2.user_id = auth.uid()
  ));

-- Só dá pra se adicionar (user_id = você mesmo) ou adicionar outra
-- pessoa numa conversa em que você já participa — assim ninguém entra
-- numa conversa alheia sem ter sido convidado por quem já tá nela.
create policy "Entra na conversa que cria ou já participa"
  on public.conversas_reais_participantes for insert
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversas_reais_participantes p2
      where p2.conversa_id = conversas_reais_participantes.conversa_id and p2.user_id = auth.uid()
    )
  );

create policy "Participante lê mensagens da conversa"
  on public.mensagens_reais for select
  using (exists (
    select 1 from public.conversas_reais_participantes p
    where p.conversa_id = mensagens_reais.conversa_id and p.user_id = auth.uid()
  ));

create policy "Participante envia mensagem"
  on public.mensagens_reais for insert
  with check (
    remetente_id = auth.uid()
    and exists (
      select 1 from public.conversas_reais_participantes p
      where p.conversa_id = mensagens_reais.conversa_id and p.user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.mensagens_reais;

-- Quantas mensagens do roteiro já aparecem liberadas assim que a pessoa
-- abre a conversa pela primeira vez (antes de começar a contar o
-- intervalo de liberação das próximas). Vazio = considera 1.
alter table public.conversas_demo add column if not exists liberacao_quantidade_inicial integer;

-- Quantas mensagens (do roteiro, já visíveis pra essa pessoa) ela já
-- viu da última vez que abriu a conversa — usado pra calcular o
-- balãozinho de mensagens não vistas na lista, sem precisar abrir cada
-- conversa antes.
alter table public.conversas_demo_progresso add column if not exists mensagens_lidas integer not null default 0;

-- ============================================================
-- ORDEM DE EXIBIÇÃO DAS CONVERSAS DE EXEMPLO (o admin reordena na mão,
-- com as setinhas, em vez de ficar sempre na ordem de criação)
-- ============================================================

alter table public.conversas_demo add column if not exists ordem_exibicao integer;

-- Preenche a ordem das conversas que já existem, mantendo a ordem
-- atual (mais recente primeiro) até o admin reordenar na mão.
with numeradas as (
  select id, row_number() over (order by criado_em desc) as rn
  from public.conversas_demo
  where ordem_exibicao is null
)
update public.conversas_demo c
set ordem_exibicao = n.rn
from numeradas n
where c.id = n.id;

-- ============================================================
-- LIBERAÇÃO EM DUAS VELOCIDADES PRA CONVERSA NORMAL (2 pessoas):
-- mensagens seguidas da mesma pessoa (rajada) liberam juntas, e o
-- intervalo até a próxima rajada aparecer varia se ela foi enviada por
-- "você" ou recebida da outra pessoa. Só faz sentido em conversa
-- normal — em grupo continua usando liberacao_intervalo_minutos.
-- ============================================================

alter table public.conversas_demo add column if not exists liberacao_intervalo_enviadas_minutos integer;
alter table public.conversas_demo add column if not exists liberacao_intervalo_recebidas_minutos integer;
