"use client";

import * as React from "react";
import clsx from "clsx";

import type { LeadTimelineMessage } from "@/modules/leads/services/leads.service";

export function MessageBubble({ message }: { message: LeadTimelineMessage }) {
  const isInbound = message.direction === "inbound";
  const label = isInbound ? "Lead" : "Bot";

  const enriched =
    (message.content_type === "audio" && message.audio_transcription) ||
    (message.content_type === "image" && message.image_description);

  return (
    <div className={clsx("flex", isInbound ? "justify-start" : "justify-end")}>
      <div
        className={clsx(
          "max-w-[85%] rounded-lg border px-3 py-2 text-sm shadow-sm",
          isInbound ? "bg-muted" : "bg-primary text-primary-foreground",
        )}
      >
        <div className={clsx("mb-1 text-xs", isInbound ? "text-muted-foreground" : "text-primary-foreground/80")}>
          {label} • {new Date(message.created_at).toLocaleString()} • {message.content_type}
        </div>

        {message.content ? <p className="whitespace-pre-wrap">{message.content}</p> : null}

        {enriched ? (
          <div className={clsx("mt-2 rounded-md px-2 py-1 text-xs", isInbound ? "bg-background" : "bg-primary-foreground/15")}>
            <p className="font-medium">Enriquecimento</p>
            <p className="whitespace-pre-wrap">
              {message.content_type === "audio" ? message.audio_transcription : message.image_description}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

