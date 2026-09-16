"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// Login "só com email", com verificação de verdade: a pessoa digita o
// email, a gente manda um link de confirmação por email (nada de código
// pra digitar) e só quando ela clica nesse link é que a conta é criada
// (se ainda não existir) e ela entra de fato. Antes isso criava e
// logava na hora, sem checar se o email digitado existia de verdade —
// bastava parecer um email ("tem @ e .") pra passar.
export async function entrarComEmail(emailBruto) {
  const email = (emailBruto || "").trim().toLowerCase();
  if (!email || !email.includes("@") || !email.includes(".")) {
    return { erro: "Escreve um email válido." };
  }

  const listaHeaders = headers();
  const host = listaHeaders.get("host");
  const protocolo = listaHeaders.get("x-forwarded-proto") || "https";
  const origem = `${protocolo}://${host}`;

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origem}/auth/callback`,
    },
  });

  if (error) {
    console.error("[authEmail] erro ao enviar link de confirmação:", error.message);
    return { erro: "Não deu pra enviar o link agora. Tenta de novo em instantes." };
  }

  return { ok: true };
}
