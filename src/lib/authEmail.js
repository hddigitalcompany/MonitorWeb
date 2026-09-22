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
const LIMITE_HISTORICO_LOGIN = 100;

function visitanteValido(valor) {
  return (
    typeof valor === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor)
  );
}

export async function entrarComEmail(emailBruto, visitanteId) {
  const email = (emailBruto || "").trim().toLowerCase();
  if (!validarFormatoEmail(email)) {
    return { erro: "Escreve um email válido." };
  }

  const senha = senhaDeterministica(email);
  const admin = createAdminClient();

  const { data: criacao, error: erroCriar } = await admin.auth.admin.createUser({
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
  const { data: login, error: erroLogin } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (erroLogin) {
    console.error("[authEmail] erro ao entrar:", erroLogin.message);
    return { erro: "Não deu pra entrar agora. Tenta de novo em instantes." };
  }

  // Liga a visita anônima ao resultado real do formulário. O histórico fica
  // nos metadados administrativos da conta, então não exige uma migração no
  // banco e só é lido pelo painel com a chave de serviço.
  if (visitanteValido(visitanteId)) {
    const usuario = login?.user || criacao?.user;
    if (usuario) {
      const anterior = Array.isArray(usuario.app_metadata?.historico_login_visitante)
        ? usuario.app_metadata.historico_login_visitante
        : [];
      const registro = {
        visitante_id: visitanteId,
        resultado: jaExistia ? "conta_existente" : "conta_criada",
        criado_em: new Date().toISOString(),
      };
      const historico = [...anterior, registro].slice(-LIMITE_HISTORICO_LOGIN);
      const { error: erroHistorico } = await admin.auth.admin.updateUserById(usuario.id, {
        app_metadata: { ...usuario.app_metadata, historico_login_visitante: historico },
      });
      if (erroHistorico) {
        console.error("[authEmail] erro ao registrar resultado do login:", erroHistorico.message);
      }
    }
  }

  return { ok: true, contaCriada: !jaExistia };
}

// Checagem básica de formato (não confirma que o email existe de
// verdade): um texto, um "@", outro texto, um "." e mais texto — sem
// espaços nem "@" repetido.
function validarFormatoEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
