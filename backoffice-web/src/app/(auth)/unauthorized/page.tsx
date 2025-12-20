import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="space-y-4 rounded-lg border bg-background p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Acesso não permitido</h1>
        <p className="text-sm text-muted-foreground">
          Sua conta não tem permissão para acessar o Backoffice da holding.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Voltar ao login
        </Link>
      </div>
    </div>
  );
}

