import { createClient as criarClienteSupabase } from "@supabase/supabase-js";

// Cliente com a chave de serviço (service role) do Supabase — ignora as
// regras de RLS e consegue gerenciar contas de usuário (listar, remover).
// USE SÓ EM CÓDIGO QUE RODA NO SERVIDOR (Server Components ou rotas em
// src/app/api). Nunca importe este arquivo dentro de um componente "use client".
export function createAdminClient() {
  return criarClienteSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
