import { Module } from "@nestjs/common";

import { AutentiqueClient } from "./autentique.client";

@Module({
  providers: [AutentiqueClient],
  exports: [AutentiqueClient],
})
export class AutentiqueModule {}

