"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Company } from "@/modules/empresas/services/companies.service";
import {
  addCompanyUser,
  listCompanyUsers,
  removeCompanyUser,
  type CompanyUserRole,
} from "@/modules/empresas/services/company-users.service";

const roles: { value: CompanyUserRole; label: string }[] = [
  { value: "viewer", label: "viewer" },
  { value: "sales_rep", label: "sales_rep" },
  { value: "operator", label: "operator" },
  { value: "admin", label: "admin" },
  { value: "owner", label: "owner" },
];

export function CompanyUsersModal({
  open,
  onOpenChange,
  company,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
}) {
  const companyId = company?.id ?? "";
  const usersQuery = useQuery({
    queryKey: ["company-users", companyId],
    queryFn: () => listCompanyUsers(companyId),
    enabled: open && !!companyId,
  });

  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<CompanyUserRole>("viewer");
  const [scopes, setScopes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setEmail("");
    setRole("viewer");
    setScopes("");
    setError(null);
  }, [open]);

  const onAdd = React.useCallback(async () => {
    if (!companyId) return;
    if (!email.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const scopesList = scopes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await addCompanyUser(companyId, { email: email.trim().toLowerCase(), role, scopes: scopesList.length ? scopesList : undefined });
      await usersQuery.refetch();
      setEmail("");
      setScopes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao adicionar usuário");
    } finally {
      setSaving(false);
    }
  }, [companyId, email, role, scopes, usersQuery]);

  const onRemove = React.useCallback(
    async (userId: string) => {
      if (!companyId) return;
      if (!confirm("Remover usuário da empresa?")) return;
      setRemovingId(userId);
      setError(null);
      try {
        await removeCompanyUser(companyId, userId);
        await usersQuery.refetch();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao remover usuário");
      } finally {
        setRemovingId(null);
      }
    },
    [companyId, usersQuery],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Usuários da empresa</DialogTitle>
          <DialogDescription>{company ? `${company.name} (${company.slug})` : "—"}</DialogDescription>
        </DialogHeader>

        {usersQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
        {usersQuery.isError ? (
          <p className="text-sm text-destructive">
            {usersQuery.error instanceof Error ? usersQuery.error.message : "Erro ao carregar usuários"}
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(usersQuery.data?.users ?? []).map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.email ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.user_id}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.scopes?.length ? u.scopes.join(", ") : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="destructive" disabled={removingId === u.user_id} onClick={() => onRemove(u.user_id)}>
                      {removingId === u.user_id ? "Removendo..." : "Remover"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!usersQuery.data?.users?.length && !usersQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum usuário vinculado.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <div className="grid gap-4 rounded-md border p-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@empresa.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as CompanyUserRole)}
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="scopes">Scopes (opcional, separado por vírgula)</Label>
            <Input id="scopes" value={scopes} onChange={(e) => setScopes(e.target.value)} placeholder="crm:read, crm:write" />
          </div>
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button onClick={onAdd} disabled={saving || !email.trim()}>
              {saving ? "Adicionando..." : "Adicionar usuário"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

