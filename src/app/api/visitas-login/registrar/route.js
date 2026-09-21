import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Quem visita a tela de entrar ainda não fez login, então esse endpoint não
// exige autenticação (a política de insert em visitas_login é aberta) — só
// aceita um id de visitante gerado no navegador dele e grava o IP visto pelo
// servidor, que o navegador não teria como saber sozinho.
export async function POST(request) {
  const supabase = createClient();

  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  const visitanteId = corpo?.visitanteId;
  if (!visitanteId || typeof visitanteId !== "string") {
    return NextResponse.json({ erro: "Visitante inválido." }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;

  const { error } = await supabase
    .from("visitas_login")
    .insert({ visitante_id: visitanteId, ip });

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
