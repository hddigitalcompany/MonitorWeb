import { createClient } from "@/lib/supabase/server";
import { buscarTextos, texto } from "@/lib/textos";
import LoginButton from "@/components/LoginButton";
import EntrarComEmail from "@/components/EntrarComEmail";

export default async function LoginPage({ searchParams }) {
  const supabase = createClient();
  const textos = await buscarTextos(supabase);
  const erro = searchParams?.erro;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm tracking-wide text-muted">{texto(textos, "login_selo")}</p>
          <h1 className="font-extrabold tracking-tight text-4xl leading-tight text-ink">
            {texto(textos, "login_titulo")}
          </h1>
          <p className="mt-3 text-sm text-muted">{texto(textos, "login_subtitulo")}</p>
        </div>

        <div className="card">
          {erro && (
            <p className="mb-4 rounded-sm border border-rust/40 bg-rust/10 px-3 py-2 text-sm text-rust">
              {texto(textos, "login_erro")}
            </p>
          )}
          <LoginButton />
          <EntrarComEmail />
          <p className="mt-4 text-center text-xs text-muted">{texto(textos, "login_rodape")}</p>
        </div>
      </div>
    </main>
  );
}
