// Garante que exista um registro de "perfil" pra esse usuário (quando
// ele logou pela primeira vez, e quando foi o último acesso). É esse
// registro que alimenta a liberação gradual de conteúdo (src/lib/liberacao.js).
//
// Importante: se a tabela perfis_usuario não existir no banco (a
// migração do supabase/schema.sql não foi rodada), a busca e a
// inserção abaixo falham silenciosamente e cai no fallback que usa
// "agora" como primeiro_login — o que faz a liberação de conteúdo
// parecer que "zera" a cada novo acesso. Por isso logamos o erro, pra
// dar pra achar isso nos logs do Vercel se acontecer de novo.

export async function garantirPerfilUsuario(supabase, userId) {
  const { data, error } = await supabase
    .from("perfis_usuario")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[perfil] erro ao buscar perfil do usuário:", error.message);
  }
  if (data) return data;

  const { data: novo, error: erroInsercao } = await supabase
    .from("perfis_usuario")
    .insert({ user_id: userId })
    .select()
    .single();

  if (erroInsercao) {
    console.error(
      "[perfil] erro ao criar perfil do usuário (a tabela perfis_usuario existe no banco?):",
      erroInsercao.message
    );
  }

  return (
    novo || {
      user_id: userId,
      primeiro_login: new Date().toISOString(),
      ultimo_acesso: new Date().toISOString(),
    }
  );
}

// Chamado só na tela Início: lê o último acesso ANTERIOR (só pra mostrar
// "há quanto tempo você não abria o app") e já atualiza pra agora. Isso NÃO
// mexe na contagem de "itens novos" — essa contagem usa o último acesso de
// cada categoria (veja registrarVisitaCategoria), não esse aqui, senão só
// de abrir a Início a contagem já zerava sem a pessoa ter visto o
// conteúdo novo de verdade.
export async function registrarAcesso(supabase, userId) {
  const perfil = await garantirPerfilUsuario(supabase, userId);
  const ultimoAcessoAnterior = perfil.ultimo_acesso;
  const ultimoVisto = perfil.ultimo_visto || {};

  const { error } = await supabase
    .from("perfis_usuario")
    .update({ ultimo_acesso: new Date().toISOString() })
    .eq("user_id", userId);

  if (error) {
    console.error("[perfil] erro ao atualizar último acesso:", error.message);
  }

  return { primeiroLogin: perfil.primeiro_login, ultimoAcessoAnterior, ultimoVisto };
}

// Chamado na abertura de cada aba de conteúdo (fotos, locais, lembretes,
// links, wifi, contatos): marca que a pessoa viu aquela categoria agora.
// É esse registro — por categoria, não um "último acesso" geral — que
// zera a contagem de "itens novos" dela na tela Início.
export async function registrarVisitaCategoria(supabase, userId, categoria) {
  const perfil = await garantirPerfilUsuario(supabase, userId);
  const vistoAtual = perfil.ultimo_visto || {};
  const novoVisto = { ...vistoAtual, [categoria]: new Date().toISOString() };

  const { error } = await supabase
    .from("perfis_usuario")
    .update({ ultimo_visto: novoVisto })
    .eq("user_id", userId);

  if (error) {
    console.error("[perfil] erro ao registrar visita da categoria", categoria, ":", error.message);
  }
}
