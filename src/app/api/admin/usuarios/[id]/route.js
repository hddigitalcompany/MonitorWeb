import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(_request, { params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { data: souAdmin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!souAdmin) {
    return NextResponse.json({ erro: "Acesso restrito." }, { status: 403 });
  }

  const alvoId = params.id;

  // Nunca deixa remover uma conta de administrador por aqui (segurança).
  const { data: alvoAdmin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", alvoId)
    .maybeSingle();

  if (alvoAdmin) {
    return NextResponse.json(
      { erro: "Não é possível remover uma conta de administrador por aqui." },
      { status: 400 }
    );
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminClient();
  } catch {
    return NextResponse.json({ erro: "Configuração pendente no servidor." }, { status: 500 });
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(alvoId);

  if (error) {
    return NextResponse.json({ erro: "Não foi possível remover essa conta." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
