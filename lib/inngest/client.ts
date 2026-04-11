import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "pilactive-helper",
  env: process.env.INNGEST_ENV ?? "development",
  ...(process.env.INNGEST_ENV === "production" && {
    eventKey: process.env.INNGEST_EVENT_KEY,
  }),
});
