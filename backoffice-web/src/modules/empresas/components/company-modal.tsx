"use client";

import * as React from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CompanyForm } from "@/modules/empresas/components/company-form";
import type { Company } from "@/modules/empresas/services/companies.service";

export function CompanyModal({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Company | null;
  onSubmit: (values: { name: string; document?: string }) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar empresa" : "Nova empresa"}</DialogTitle>
          <DialogDescription>{initial ? "Atualize os dados básicos." : "Crie uma empresa e provisione o schema."}</DialogDescription>
        </DialogHeader>

        <CompanyForm
          initial={initial}
          onCancel={() => onOpenChange(false)}
          onSubmit={async (values) => {
            await onSubmit(values);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

