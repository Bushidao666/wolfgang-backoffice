import { registerAs } from "@nestjs/config";

export type AutentiqueConfig = {
  baseUrl: string;
};

export const autentiqueConfig = registerAs("autentique", (): AutentiqueConfig => {
  return { baseUrl: "https://api.autentique.com.br" };
});
