import { Suspense } from "react";

import LeadsPageClient from "./page.client";

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando...</div>}>
      <LeadsPageClient />
    </Suspense>
  );
}

