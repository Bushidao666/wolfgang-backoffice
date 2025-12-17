"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FollowupRuleForm } from "@/modules/centurions/followups/followup-rule-form";
import { useFollowupRules } from "@/modules/centurions/followups/hooks/use-followup-rules";
import { deleteFollowupRule, type FollowupRuleRow } from "@/modules/centurions/followups/services/followups.service";

export function FollowupsConfig({ companyId, centurionId }: { companyId: string; centurionId: string }) {
  const rulesQuery = useFollowupRules(companyId, centurionId);
  const rules = rulesQuery.data ?? [];

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<FollowupRuleRow | undefined>(undefined);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const onSaved = React.useCallback(() => {
    void rulesQuery.refetch();
  }, [rulesQuery]);

  const onDelete = React.useCallback(
    async (ruleId: string) => {
      setDeletingId(ruleId);
      try {
        await deleteFollowupRule(companyId, centurionId, ruleId);
        await rulesQuery.refetch();
      } finally {
        setDeletingId(null);
      }
    },
    [centurionId, companyId, rulesQuery],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Follow-ups</CardTitle>
        <CardDescription>Regras de reengajamento automático por inatividade.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">{rulesQuery.isLoading ? "Carregando..." : `${rules.length} regra(s)`}</div>
          <Button
            onClick={() => {
              setEditing(undefined);
              setModalOpen(true);
            }}
          >
            Nova regra
          </Button>
        </div>

        <Separator />

        {rulesQuery.isError ? (
          <p className="text-sm text-destructive">
            {rulesQuery.error instanceof Error ? rulesQuery.error.message : "Erro ao carregar regras"}
          </p>
        ) : null}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Inatividade</TableHead>
                <TableHead>Tentativas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.inactivity_hours}h</TableCell>
                  <TableCell>{r.max_attempts}</TableCell>
                  <TableCell>{r.is_active ? "Ativa" : "Inativa"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(r);
                          setModalOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button size="sm" variant="destructive" disabled={deletingId === r.id} onClick={() => onDelete(r.id)}>
                        {deletingId === r.id ? "Removendo..." : "Remover"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!rules.length && !rulesQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma regra configurada.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <FollowupRuleForm
          open={modalOpen}
          onOpenChange={setModalOpen}
          companyId={companyId}
          centurionId={centurionId}
          rule={editing}
          onSaved={onSaved}
        />
      </CardContent>
    </Card>
  );
}

