import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acesso | Wolfgang Backoffice",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}

