import { filtrarContatosPorDDD, extrairDDD } from "./telefone";

// Percorre as páginas para não perder contatos de um DDD que só apareça
// depois do limite de registros retornado pelo Supabase.
export async function buscarContatosPorDDD(supabase, telefone) {
  if (!extrairDDD(telefone)) return [];
  const contatos = [];
  const tamanhoPagina = 500;
  for (let inicio = 0; ; inicio += tamanhoPagina) {
    const { data, error } = await supabase
      .from("conteudo_contatos")
      .select("*")
      .order("criado_em", { ascending: true })
      .order("id", { ascending: true })
      .range(inicio, inicio + tamanhoPagina - 1);
    if (error) throw error;
    contatos.push(...filtrarContatosPorDDD(data || [], telefone));
    if (!data || data.length < tamanhoPagina) return contatos;
  }
}
