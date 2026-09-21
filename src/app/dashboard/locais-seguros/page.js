import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import MapaLocalizacao from "@/components/MapaLocalizacao";
import { buscarTextos, texto } from "@/lib/textos";
import { garantirPerfilUsuario, registrarVisitaCategoria } from "@/lib/perfil";
import { quantidadeLiberada } from "@/lib/liberacao";
import { buscarLocaisSegurosProximos } from "@/lib/locaisSeguros";

export default async function LocaisSegurosPage() {
  const supabase = createClient();
  const textos = await buscarTextos(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const perfil = await garantirPerfilUsuario(supabase, user.id);
  await registrarVisitaCategoria(supabase, user.id, "locais");

  const { data } = await supabase
    .from("conteudo_locais")
    .select("*")
    .order("criado_em", { ascending: true })
    .order("id", { ascending: true });

  const todos = data || [];
  const liberados = quantidadeLiberada("locais", perfil.primeiro_login, new Date(), todos.length);
  const itens = todos.slice(0, liberados).reverse();

  const lat = perfil.localizacao_lat ?? null;
  const lon = perfil.localizacao_lon ?? null;
  const locaisProximos =
    typeof lat === "number" && typeof lon === "number" ? await buscarLocaisSegurosProximos(lat, lon) : [];

  return (
    <div>
      <PageHeader title={texto(textos, "locais_titulo")} subtitle={texto(textos, "locais_subtitulo")} />

      <p className="mb-2 text-xs text-muted">Perto de você agora</p>
      <MapaLocalizacao lat={lat} lon={lon} cidade={perfil.localizacao_cidade} locais={locaisProximos} />

      {locaisProximos.length > 0 && (
        <div className="mb-6 flex flex-col gap-2">
          {locaisProximos.slice(0, 8).map((local) => (
            <div
              key={local.id}
              className="flex items-center justify-between gap-2 rounded-sm border border-border bg-surface p-3"
            >
              <div>
                <p className="text-sm font-semibold text-ink">{local.nome}</p>
                <p className="text-xs text-muted">{local.tipo}</p>
              </div>
              <span className="shrink-0 text-xs text-muted">{local.distanciaKm.toFixed(1)} km</span>
            </div>
          ))}
        </div>
      )}

      <p className="mb-2 text-xs text-muted">Sugestões da nossa equipe</p>
      {itens.length === 0 ? (
        <p className="text-sm text-muted">{texto(textos, "locais_vazio")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {itens.map((item) => (
            <div key={item.id} className="rounded-sm border border-border bg-surface p-3">
              <p className="text-sm leading-relaxed text-ink">{item.texto}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
