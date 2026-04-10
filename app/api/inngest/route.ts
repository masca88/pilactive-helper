import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { executeBooking } from "@/lib/inngest/functions/execute-booking";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    executeBooking,
  ],
});

export const runtime = "nodejs"; // Inngest requires Node runtime
export const maxDuration = 300; // 5 minutes (Vercel timeout)
