"use client";

import * as React from "react";

import type { LeadTimelineMessage } from "@/modules/leads/services/leads.service";
import { MessageBubble } from "@/modules/leads/components/message-bubble";

export function LeadTimeline({ messages }: { messages: LeadTimelineMessage[] }) {
  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
    </div>
  );
}

