"use server";

import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Gera uma "senha" fixa a partir do email — a pessoa nunca vê nem digita
// essa senha, é só um jeito de usar o login padrão do Supabase (email +
// senha) por trás dos panos pra oferecer um "entrar só com o email", sem
// confirmação nenhuma.
function senhaDeterministica(email) {
  return crypto
    .createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY)
    .update(email)
    .digest("hex");
}

// Login "só com email": sem senha visível, sem confirmação por email — a
// pessoa digita o email e já entra. Se a conta ainda não existir, cria na
// hora (com confirmação de email já marcada como feita, pra não precisar
// clicar em nenhum link). Depois disso ela passa pela etapa normal de
// nome/telefone, igual quem entra pelo Google.
export async function entrarComEmail(emailBruto) {
  const email = (emailBruto || "").trim().toLowerCase();
  if (!email || !email.includes("@") || !email.includes(".")) {
    return { erro: "Escreve um email válido." };
  }

  const senha = senhaDeterministica(email);
  const admin = createAdminClient();

  const { error: erroCriar } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });

  const jaExistia = erroCriar && /already|existe/i.test(erroCriar.message || "");
  if (erroCriar && !jaExistia) {
    console.error("[authEmail] erro ao criar usuário:", erroCriar.message);
    return { erro: "Não deu pra entrar agora. Tenta de novo em instantes." };
  }

  const supabase = createClient();
  const { error: erroLogin } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (erroLogin) {
    console.error("[authEmail] erro ao entrar:", erroLogin.message);
    return { erro: "Não deu pra entrar agora. Tenta de novo em instantes." };
  }

  return { ok: true };
}
