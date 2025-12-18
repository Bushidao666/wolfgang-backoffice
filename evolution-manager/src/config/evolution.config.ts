export type EvolutionConfig = {
  webhookSecret: string;
};

export const evolutionConfig = () => ({
  evolution: {
    webhookSecret: process.env.WEBHOOK_SECRET ?? "",
  } satisfies EvolutionConfig,
});
