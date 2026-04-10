import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "pilactive-helper",
  env: process.env.INNGEST_ENV ?? "development",
});
