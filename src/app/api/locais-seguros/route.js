import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buscarLocaisSegurosCidade } from "@/lib/locaisSeguros";
import { createAdminClient } from "@/lib/supabase/admin";
import { localizacaoDoIp } from "@/lib/localizacao";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { data: perfil } = await supabase.from("perfis_usuario").select("*").eq("user_id", user.id).maybeSingle();
  // Atualiza a cidade da conexão atual; se o provedor falhar, aproveita
  // a localização já capturada. Não depende da gravação das novas colunas.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  let localizacao = await localizacaoDoIp(ip);
  if (!localizacao?.texto) {
    localizacao = { texto: perfil?.localizacao_cidade, lat: perfil?.localizacao_lat, lon: perfil?.localizacao_lon };
    if (!localizacao.texto) {
      // O histórico só tem leitura administrativa no schema existente.
      // A consulta permanece limitada ao ID autenticado acima.
      const leitor = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;
      const { data: visita } = await leitor.from("eventos_visita").select("localizacao")
        .eq("user_id", user.id).not("localizacao", "is", null).order("criado_em", { ascending: false }).limit(1).maybeSingle();
      localizacao.texto = visita?.localizacao;
    }
  }
  try {
    const dados = await buscarLocaisSegurosCidade(localizacao);
    return NextResponse.json(dados, { headers: { "Cache-Control": "private, no-store" } });
  } catch (erro) {
    return NextResponse.json({ erro: erro.message }, { status: 503 });
  }
}
