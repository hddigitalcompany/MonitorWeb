// Garante que exista um registro de "perfil" pra esse usuário (quando
// ele logou pela primeira vez, e quando foi o último acesso). É esse
// registro que alimenta a liberação gradual de conteúdo (src/lib/liberacao.js).

export async function garantirPerfilUsuario(supabase, userId) {
  const { data } = await supabase
    .from("perfis_usuario")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (data) return data;

  const { data: novo } = await supabase
    .from("perfis_usuario")
    .insert({ user_id: userId })
    .select()
    .single();

  return (
    novo || {
      user_id: userId,
      primeiro_login: new Date().toISOString(),
      ultimo_acesso: new Date().toISOString(),
    }
  );
}

// Chamado só na tela Início: lê o último acesso ANTERIOR (pra comparar
// quanto conteúdo foi liberado desde então) e já atualiza pra agora.
export async function registrarAcesso(supabase, userId) {
  const perfil = await garantirPerfilUsuario(supabase, userId);
  const ultimoAcessoAnterior = perfil.ultimo_acesso;

  await supabase
    .from("perfis_usuario")
    .update({ ultimo_acesso: new Date().toISOString() })
    .eq("user_id", userId);

  return { primeiroLogin: perfil.primeiro_login, ultimoAcessoAnterior };
}
