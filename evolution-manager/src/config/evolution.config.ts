export type EvolutionConfig = {
  apiUrl: string;
  apiKey: string;
  webhookSecret: string;
};

export const evolutionConfig = () => ({
  evolution: {
    apiUrl: process.env.EVOLUTION_API_URL ?? "",
    apiKey: process.env.EVOLUTION_API_KEY ?? "",
    webhookSecret: process.env.WEBHOOK_SECRET ?? "",
  } satisfies EvolutionConfig,
});

