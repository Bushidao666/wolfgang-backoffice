"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { connectInstance, getInstanceQrCode } from "@/modules/instancias/services/instances.service";

function asQrSrc(qrcode: string) {
  if (qrcode.startsWith("data:")) return qrcode;
  return `data:image/png;base64,${qrcode}`;
}

export function InstanceQrCodeModal({
  open,
  onOpenChange,
  instanceId,
  instanceName,
  channelType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceId: string;
  instanceName: string;
  channelType: "whatsapp" | "instagram";
}) {
  const query = useQuery({
    queryKey: ["instance-qrcode", instanceId],
    queryFn: async () => {
      await connectInstance(instanceId);
      return getInstanceQrCode(instanceId);
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conectar instância</DialogTitle>
          <DialogDescription>
            {channelType === "whatsapp"
              ? `Escaneie o QR code no WhatsApp (${instanceName}).`
              : `Finalize a conexão do Instagram (${instanceName}).`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {query.isLoading ? <p className="text-sm text-muted-foreground">Gerando QR code...</p> : null}
          {query.isError ? (
            <p className="text-sm text-destructive">
              {query.error instanceof Error ? query.error.message : "Erro ao gerar QR code"}
            </p>
          ) : null}

          {query.data?.qrcode ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asQrSrc(query.data.qrcode)}
              alt="QR Code"
              className="mx-auto h-64 w-64 rounded-md border bg-white p-2"
            />
          ) : query.isSuccess ? (
            <p className="text-sm text-muted-foreground">QR code não disponível no momento.</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw className={query.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Atualizar
            </Button>
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
