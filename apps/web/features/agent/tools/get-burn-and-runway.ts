import { tool } from "ai"
import { z } from "zod"
import { getBurnRateAndRunway } from "@/features/analytics/queries/get-analytics"

export const getBurnAndRunway = tool({
  description: "Get the current monthly burn rate (average expenses) and runway (how many months of cash remain at current burn rate).",
  parameters: z.object({}),
  execute: async () => {
    return getBurnRateAndRunway()
  },
})
