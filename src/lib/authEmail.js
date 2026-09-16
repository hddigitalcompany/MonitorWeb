"use server";

import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Gera uma "senha" fixa a partir do email — a pessoa nunca vê nem digita
// essa senha, é só um jeito de usar o login padrão do Supabase (email +
// senha) por trás dos panos pra oferecer um "entrar só com o email".
function senhaDeterministica(email) {
  return crypto
    .createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY)
    .update(email)
    .digest("hex");
}

// Login "só com email": sem senha visível, entra na hora — sem link nem
// código de confirmação, pra não complicar pra quem tem menos prática
// com celular. Em troca, quem escreve o email valida o formato (ver
// validarFormatoEmail) e a tela já sugere corrigir domínios comuns
// digitados errado (gmial.com, hotmail.con etc — ver emailDominios.js),
// já que não dá pra confirmar de verdade sem sair do app.
export async function entrarComEmail(emailBruto) {
  const email = (emailBruto || "").trim().toLowerCase();
  if (!validarFormatoEmail(email)) {
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

// Checagem básica de formato (não confirma que o email existe de
// verdade): um texto, um "@", outro texto, um "." e mais texto — sem
// espaços nem "@" repetido.
function validarFormatoEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
