import { Suspense } from "react";

import CenturionsPageClient from "./page.client";

export default function CenturionsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando...</div>}>
      <CenturionsPageClient />
    </Suspense>
  );
}

