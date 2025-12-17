import { Module } from "@nestjs/common";

import { FacebookClient } from "./facebook.client";

@Module({
  providers: [FacebookClient],
  exports: [FacebookClient],
})
export class FacebookModule {}

