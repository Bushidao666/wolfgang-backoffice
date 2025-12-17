"use client";

import * as React from "react";
import { type InfiniteData, useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LeadTimeline } from "@/modules/leads/components/lead-timeline";
import { getLead, getLeadTimeline } from "@/modules/leads/services/leads.service";

type TimelinePageParam = { offset: number; limit: number };
type TimelinePage = Awaited<ReturnType<typeof getLeadTimeline>>;

export function LeadDetails({ companyId, leadId }: { companyId: string; leadId: string }) {
  const leadQuery = useQuery({
    queryKey: ["lead", companyId, leadId],
    queryFn: () => getLead(companyId, leadId),
    enabled: !!companyId && !!leadId,
  });

  const metaQuery = useQuery({
    queryKey: ["leadTimelineMeta", companyId, leadId],
    queryFn: () => getLeadTimeline(companyId, leadId, { limit: 1, offset: 0 }),
    enabled: !!companyId && !!leadId,
  });

  const lead = leadQuery.data ?? null;
  const pageSize = 200;
  const totalMessages = metaQuery.data?.total ?? 0;
  const initialOffset = Math.max(0, totalMessages - pageSize);

  const timelineQuery = useInfiniteQuery<
    TimelinePage,
    Error,
    InfiniteData<TimelinePage, TimelinePageParam>,
    (string | number)[],
    TimelinePageParam
  >({
    queryKey: ["leadTimeline", companyId, leadId, totalMessages],
    enabled: !!companyId && !!leadId && metaQuery.isSuccess,
    initialPageParam: { offset: initialOffset, limit: Math.min(pageSize, Math.max(totalMessages, 1)) },
    queryFn: ({ pageParam }) => getLeadTimeline(companyId, leadId, pageParam),
    getPreviousPageParam: (firstPage) => {
      const currentOffset = firstPage.offset ?? 0;
      if (currentOffset <= 0) return undefined;
      const nextOffset = Math.max(0, currentOffset - pageSize);
      const nextLimit = currentOffset - nextOffset;
      return { offset: nextOffset, limit: nextLimit };
    },
    getNextPageParam: () => undefined,
  });

  const messages = React.useMemo(() => {
    const pages = timelineQuery.data?.pages ?? [];
    const combined = pages.flatMap((p) => p.messages ?? []);
    return combined;
  }, [timelineQuery.data?.pages]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lead</CardTitle>
          <CardDescription>Detalhes e timeline de conversa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {leadQuery.isLoading ? <p className="text-muted-foreground">Carregando...</p> : null}
          {leadQuery.isError ? (
            <p className="text-destructive">{leadQuery.error instanceof Error ? leadQuery.error.message : "Erro ao carregar lead"}</p>
          ) : null}

          {lead ? (
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="font-medium">{String((lead as any).name ?? "—")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contato</p>
                <p className="font-medium">{String((lead as any).phone ?? "—")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium">{String((lead as any).lifecycle_stage ?? "—")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Qualificado</p>
                <p className="font-medium">{(lead as any).is_qualified ? "Sim" : "Não"}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>Mensagens em ordem cronológica.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {metaQuery.isLoading || timelineQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando mensagens...</p> : null}
          {metaQuery.isError || timelineQuery.isError ? (
            <p className="text-sm text-destructive">
              {(metaQuery.error instanceof Error ? metaQuery.error.message : null) ??
                (timelineQuery.error instanceof Error ? timelineQuery.error.message : "Erro ao carregar timeline")}
            </p>
          ) : null}

          <Separator />

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {totalMessages ? (
                  <>
                    Total: <span className="font-medium text-foreground">{totalMessages}</span>
                  </>
                ) : (
                  "—"
                )}
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={!timelineQuery.hasPreviousPage || timelineQuery.isFetchingPreviousPage}
                  onClick={() => timelineQuery.fetchPreviousPage()}
                >
                  {timelineQuery.isFetchingPreviousPage ? "Carregando..." : "Carregar anteriores"}
                </Button>
                <Button variant="outline" onClick={() => timelineQuery.refetch()} disabled={timelineQuery.isFetching}>
                  {timelineQuery.isFetching ? "Atualizando..." : "Atualizar"}
                </Button>
              </div>
            </div>

            {!messages.length && !metaQuery.isLoading && !timelineQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Nenhuma mensagem.</p>
            ) : (
              <LeadTimeline messages={messages} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
