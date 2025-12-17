export const RedisChannels = {
  MESSAGE_RECEIVED: "message.received",
  MESSAGE_SENT: "message.sent",
  DEBOUNCE_TIMER: "debounce.timer",
  LEAD_CREATED: "lead.created",
  LEAD_QUALIFIED: "lead.qualified",
  CONTRACT_CREATED: "contract.created",
  CONTRACT_SIGNED: "contract.signed",
  INSTANCE_STATUS: "instance.status",
} as const;

export type RedisChannel = (typeof RedisChannels)[keyof typeof RedisChannels];
