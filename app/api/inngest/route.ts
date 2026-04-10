import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Functions will be added in Plan 03-03
  ],
});

export const runtime = "nodejs"; // Inngest requires Node runtime
export const maxDuration = 300; // 5 minutes (Vercel timeout)
