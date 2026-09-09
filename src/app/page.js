import LoginButton from "@/components/LoginButton";

export default function LoginPage({ searchParams }) {
  const erro = searchParams?.erro;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm tracking-wide text-muted">Diário digital</p>
          <h1 className="font-serif text-4xl leading-tight text-ink">
            Painel Pessoal
          </h1>
          <p className="mt-3 text-sm text-muted">
            Fotos, localização, ligações e pesquisas — tudo num só lugar, só seu.
          </p>
        </div>

        <div className="card">
          {erro && (
            <p className="mb-4 rounded-sm border border-rust/40 bg-rust/10 px-3 py-2 text-sm text-rust">
              Não deu pra entrar. Tenta de novo.
            </p>
          )}
          <LoginButton />
          <p className="mt-4 text-center text-xs text-muted">
            Sem senha. Só a sua conta Google.
          </p>
        </div>
      </div>
    </main>
  );
}
