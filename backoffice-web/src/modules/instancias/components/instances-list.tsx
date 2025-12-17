"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Trash2, QrCode, Link2, Unlink2, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInstances } from "@/modules/instancias/hooks/use-instances";
import { CreateInstanceModal } from "@/modules/instancias/components/create-instance-modal";
import { InstanceQrCodeModal } from "@/modules/instancias/components/instance-qrcode";
import { InstanceTestMessageModal } from "@/modules/instancias/components/instance-test-message";
import {
  connectInstance,
  deleteInstance,
  disconnectInstance,
  refreshInstanceStatus,
  type ChannelInstance,
} from "@/modules/instancias/services/instances.service";

export function InstancesList({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch, isFetching } = useInstances(companyId);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [qrOpen, setQrOpen] = React.useState(false);
  const [qrTarget, setQrTarget] = React.useState<ChannelInstance | null>(null);
  const [testOpen, setTestOpen] = React.useState(false);
  const [testTarget, setTestTarget] = React.useState<ChannelInstance | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Instâncias</CardTitle>
          <CardDescription>Conecte e monitore instâncias multi-canal (WhatsApp/Instagram/Telegram).</CardDescription>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => void refetch()} aria-label="Atualizar">
            <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            disabled={!companyId}
          >
            <Plus className="h-4 w-4" />
            Nova instância
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
        {isError ? (
          <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Erro ao carregar"}</p>
        ) : null}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Nenhuma instância cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                data.map((inst) => (
                  <TableRow key={inst.id}>
                    <TableCell className="font-medium">{inst.instance_name}</TableCell>
                    <TableCell className="text-muted-foreground">{inst.channel_type}</TableCell>
                    <TableCell>{inst.state}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {inst.channel_type === "whatsapp" || inst.channel_type === "instagram" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setQrTarget(inst);
                              setQrOpen(true);
                            }}
                          >
                            <QrCode className="h-4 w-4" />
                            QR
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await connectInstance(inst.id);
                              await queryClient.invalidateQueries({ queryKey: ["instances", companyId] });
                            }}
                          >
                            <Link2 className="h-4 w-4" />
                            Conectar
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await refreshInstanceStatus(inst.id);
                            await queryClient.invalidateQueries({ queryKey: ["instances", companyId] });
                          }}
                        >
                          <Link2 className="h-4 w-4" />
                          Status
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTestTarget(inst);
                            setTestOpen(true);
                          }}
                        >
                          <MessageSquare className="h-4 w-4" />
                          Testar
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await disconnectInstance(inst.id);
                            await queryClient.invalidateQueries({ queryKey: ["instances", companyId] });
                          }}
                        >
                          <Unlink2 className="h-4 w-4" />
                          Desconectar
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            if (!confirm(`Remover instância ${inst.instance_name}?`)) return;
                            await deleteInstance(inst.id);
                            await queryClient.invalidateQueries({ queryKey: ["instances", companyId] });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Remover
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CreateInstanceModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        companyId={companyId}
        onCreated={() => void queryClient.invalidateQueries({ queryKey: ["instances", companyId] })}
      />

      {qrTarget ? (
        <InstanceQrCodeModal
          open={qrOpen}
          onOpenChange={(open) => {
            setQrOpen(open);
            if (!open) setQrTarget(null);
          }}
          instanceId={qrTarget.id}
          instanceName={qrTarget.instance_name}
          channelType={qrTarget.channel_type as "whatsapp" | "instagram"}
        />
      ) : null}

      {testTarget ? (
        <InstanceTestMessageModal
          open={testOpen}
          onOpenChange={(open) => {
            setTestOpen(open);
            if (!open) setTestTarget(null);
          }}
          instanceId={testTarget.id}
          instanceName={testTarget.instance_name}
          channelType={testTarget.channel_type}
        />
      ) : null}
    </Card>
  );
}
